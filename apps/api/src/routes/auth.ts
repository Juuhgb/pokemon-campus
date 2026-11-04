import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { LoginPlayerRequestSchema, RegisterPlayerRequestSchema } from '@pokemon-campus/shared';
const scrypt = promisify(scryptCallback);
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
interface Options { pool?: Pool }
const profile = (r: {id:string;display_name:string;score:number;created_at:Date}) => ({id:r.id,displayName:r.display_name,score:r.score,createdAt:r.created_at.toISOString()});
function fail(reply: FastifyReply, request: FastifyRequest, status: number, code: string, message: string) { return reply.code(status).send({error:{code,message,requestId:request.id}}); }
function tokenSecret() { const secret=process.env.AUTH_TOKEN_SECRET; if(!secret||secret.length<32) throw new Error('AUTH_TOKEN_SECRET must contain at least 32 characters'); return secret; }
function hashToken(token:string) { return createHash('sha256').update(token).digest('hex'); }
async function passwordHash(password:string) { const salt=randomBytes(16); const key=await scrypt(password,salt,64) as Buffer; return `${salt.toString('hex')}:${key.toString('hex')}`; }
async function passwordMatches(password:string,stored:string) { const [saltHex,keyHex]=stored.split(':'); if(!saltHex||!keyHex)return false; const expected=Buffer.from(keyHex,'hex'); const actual=await scrypt(password,Buffer.from(saltHex,'hex'),expected.length) as Buffer; return actual.length===expected.length&&timingSafeEqual(actual,expected); }
export function authenticate(pool:Pool) { return async (request:FastifyRequest,reply:FastifyReply) => {
  const header=request.headers.authorization; const token=header?.startsWith('Bearer ')?header.slice(7):'';
  if(!token||token.length>2048)return fail(reply,request,401,'UNAUTHORIZED','A valid bearer token is required');
  const [raw,sig,...extra]=token.split('.');
  if(!raw||!sig||extra.length)return fail(reply,request,401,'UNAUTHORIZED','Session token is malformed');
  let expected:string; try { expected=createHmac('sha256',tokenSecret()).update(raw).digest('base64url'); } catch { return fail(reply,request,503,'AUTH_NOT_CONFIGURED','AUTH_TOKEN_SECRET must contain at least 32 characters'); }
  const sigBuffer=Buffer.from(sig),expectedBuffer=Buffer.from(expected);
  if(sigBuffer.length!==expectedBuffer.length||!timingSafeEqual(sigBuffer,expectedBuffer))return fail(reply,request,401,'UNAUTHORIZED','Session token signature is invalid');
  const row=await pool.query<{player_id:string}>('SELECT player_id FROM auth_sessions WHERE token_hash=$1 AND expires_at>NOW()', [hashToken(token)]);
  if(!row.rows[0])return fail(reply,request,401,'UNAUTHORIZED','Session is invalid or expired');
  request.playerId=row.rows[0].player_id;
}; }
declare module 'fastify' { interface FastifyRequest { playerId?: string } }
export async function registerAuthRoutes(app:FastifyInstance,{pool}:Options) {
  const unavailable=(request:FastifyRequest,reply:FastifyReply)=>fail(reply,request,503,'DATABASE_UNAVAILABLE','DATABASE_URL is not configured');
  app.post('/api/v1/auth/register',async(request,reply)=>{
    if(!pool)return unavailable(request,reply);
    const input=RegisterPlayerRequestSchema.safeParse(request.body); if(!input.success)return fail(reply,request,400,'INVALID_REQUEST','Invalid registration data');
    const secret=tokenSecret(); void secret;
    const client=await pool.connect();
    try { await client.query('BEGIN'); const p=input.data; const result=await client.query('INSERT INTO players(email,display_name,password_hash) VALUES(lower($1),$2,$3) RETURNING id,display_name,score,created_at',[p.email,p.displayName,await passwordHash(p.password)]);
      const player=result.rows[0]; await client.query('INSERT INTO parties(player_id) VALUES($1)',[player.id]); await client.query('INSERT INTO player_inventories(player_id) VALUES($1)',[player.id]); await client.query("INSERT INTO player_inventory_items(player_id,item_id,quantity) VALUES($1,'POKE_BALL',5),($1,'GREAT_BALL',0)",[player.id]);
      const raw=randomBytes(32).toString('base64url'), expiresAt=new Date(Date.now()+TOKEN_TTL_MS); const accessToken=`${raw}.${createHmac('sha256',secret).update(raw).digest('base64url')}`; await client.query('INSERT INTO auth_sessions(token_hash,player_id,expires_at) VALUES($1,$2,$3)',[hashToken(accessToken),player.id,expiresAt]); await client.query('COMMIT'); return reply.code(201).send({accessToken,tokenType:'Bearer',expiresAt:expiresAt.toISOString(),player:profile(player)});
    } catch(error) { await client.query('ROLLBACK'); if((error as {code?:string}).code==='23505')return fail(reply,request,409,'EMAIL_ALREADY_REGISTERED','An account already uses this email'); throw error; } finally {client.release();}
  });
  app.post('/api/v1/auth/login',async(request,reply)=>{
    if(!pool)return unavailable(request,reply); const input=LoginPlayerRequestSchema.safeParse(request.body); if(!input.success)return fail(reply,request,400,'INVALID_REQUEST','Invalid login data'); const secret=tokenSecret();
    const result=await pool.query('SELECT id,display_name,score,created_at,password_hash FROM players WHERE lower(email)=lower($1)',[input.data.email]); const player=result.rows[0];
    if(!player?.password_hash||!await passwordMatches(input.data.password,player.password_hash))return fail(reply,request,401,'INVALID_CREDENTIALS','Email or password is incorrect');
    const raw=randomBytes(32).toString('base64url'),expiresAt=new Date(Date.now()+TOKEN_TTL_MS),accessToken=`${raw}.${createHmac('sha256',secret).update(raw).digest('base64url')}`;
    await pool.query('INSERT INTO auth_sessions(token_hash,player_id,expires_at) VALUES($1,$2,$3)',[hashToken(accessToken),player.id,expiresAt]); return {accessToken,tokenType:'Bearer',expiresAt:expiresAt.toISOString(),player:profile(player)};
  });
}
