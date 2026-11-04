import { createHmac, randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

interface Options { pool?: Pool }
const Page = z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(50) });
const GeoPoint = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
const Species = z.object({ id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/), displayName: z.string().min(1).max(80), types: z.array(z.string().min(1).max(24)).min(1).max(2), baseStats: z.object({ hp: z.number().int().positive(), attack: z.number().int().positive(), defense: z.number().int().positive(), speed: z.number().int().nonnegative() }), baseCaptureRate: z.number().min(0).max(1) });

function error(reply: FastifyReply, request: FastifyRequest, status: number, code: string, message: string) {
  return reply.code(status).send({ error: { code, message, requestId: request.id } });
}
function signature(payload: string): string {
  const secret = process.env.SPAWN_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error('SPAWN_TOKEN_SECRET must contain at least 32 characters');
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
function spawnToken(id: string, seed: string, until: Date, rulesVersion: number) {
  const body = Buffer.from(JSON.stringify({ id, seed, until: until.toISOString(), rulesVersion })).toString('base64url');
  return `${body}.${signature(body)}`;
}
function pointInPolygon(latitude: number, longitude: number, vertices: Array<{latitude:number;longitude:number}>): boolean {
  let inside=false;
  for(let i=0,j=vertices.length-1;i<vertices.length;j=i++) {
    const a=vertices[i]!, b=vertices[j]!;
    const crosses=(a.longitude>longitude)!==(b.longitude>longitude)
      && latitude < ((b.latitude-a.latitude)*(longitude-a.longitude))/(b.longitude-a.longitude)+a.latitude;
    if(crosses)inside=!inside;
  }
  return inside;
}

export async function registerCampusRoutes(app: FastifyInstance, { pool }: Options): Promise<void> {
  const db = (request: FastifyRequest, reply: FastifyReply) => pool ?? (error(reply, request, 503, 'DATABASE_UNAVAILABLE', 'DATABASE_URL is not configured'), undefined);

  app.get('/api/v1/species', async (request, reply) => {
    const database = db(request, reply); if (!database) return;
    const page = Page.safeParse(request.query); if (!page.success) return error(reply, request, 400, 'INVALID_REQUEST', 'Invalid pagination');
    const result = await database.query('SELECT id, display_name AS "displayName", types, base_stats AS "baseStats", base_capture_rate::float8 AS "baseCaptureRate" FROM creature_species WHERE ($1::text IS NULL OR id > $1) ORDER BY id LIMIT $2', [page.data.cursor ?? null, page.data.limit + 1]);
    const items = result.rows.slice(0, page.data.limit); return { items, nextCursor: result.rows.length > page.data.limit ? items.at(-1)?.id ?? null : null };
  });

  app.get('/api/v1/zones', async (request, reply) => {
    const database = db(request, reply); if (!database) return;
    const result = await database.query('SELECT id, slug, name, boundary, active FROM zones WHERE active = TRUE ORDER BY name, id'); return result.rows;
  });

  app.get('/api/v1/spawns', async (request, reply) => {
    const database = db(request, reply); if (!database) return;
    const query = z.object({ zoneId: z.string().uuid().optional(), at: z.string().datetime().optional() }).safeParse(request.query);
    if (!query.success) return error(reply, request, 400, 'INVALID_REQUEST', 'Invalid spawn query');
    const at = query.data.at ?? new Date().toISOString();
    const result = await database.query('SELECT s.id, s.zone_id AS "zoneId", s.species_id AS "speciesId", s.latitude, s.longitude, s.level, s.active_from AS "activeFrom", s.active_until AS "activeUntil", s.spawn_seed AS seed, s.rules_version AS "rulesVersion" FROM spawns s JOIN zones z ON z.id=s.zone_id AND z.active WHERE ($1::uuid IS NULL OR s.zone_id=$1) AND s.active_from <= $2 AND s.active_until > $2 ORDER BY s.active_until, s.id', [query.data.zoneId ?? null, at]);
    return result.rows.map((r) => ({ id: r.id, zoneId: r.zoneId, speciesId: r.speciesId, position: { latitude: r.latitude, longitude: r.longitude }, level: r.level, activeFrom: new Date(r.activeFrom).toISOString(), activeUntil: new Date(r.activeUntil).toISOString(), battleSeed: r.seed, rulesVersion: r.rulesVersion, spawnToken: spawnToken(r.id, r.seed, new Date(r.activeUntil), r.rulesVersion) }));
  });

  app.get('/api/v1/leaderboard', async (request, reply) => {
    const database = db(request, reply); if (!database) return;
    const page = Page.safeParse(request.query); if (!page.success) return error(reply, request, 400, 'INVALID_REQUEST', 'Invalid pagination');
    let cursor: { score: number; id: string } | null = null;
    if (page.data.cursor) { try { const decoded: unknown = JSON.parse(Buffer.from(page.data.cursor, 'base64url').toString()); if (!decoded || typeof decoded !== 'object' || !('score' in decoded) || !('id' in decoded) || !Number.isInteger(decoded.score) || typeof decoded.id !== 'string') throw new Error(); cursor = { score: decoded.score as number, id: decoded.id }; } catch { return error(reply, request, 400, 'INVALID_REQUEST', 'Invalid leaderboard cursor'); } }
    const result = await database.query('SELECT id AS "playerId", display_name AS "displayName", score FROM players WHERE ($1::integer IS NULL OR (score, id) < ($1, $2::uuid)) ORDER BY score DESC, id ASC LIMIT $3', [cursor?.score ?? null, cursor?.id ?? null, page.data.limit + 1]);
    const rows = result.rows.slice(0, page.data.limit); const items = rows.map((row, i) => ({ ...row, rank: i + 1 }));
    const last = rows.at(-1); return { items, nextCursor: result.rows.length > page.data.limit && last ? Buffer.from(JSON.stringify({ score: last.score, id: last.playerId })).toString('base64url') : null };
  });

  app.post('/api/v1/admin/species', async (request, reply) => {
    const database = db(request, reply); if (!database) return;
    const key = process.env.ADMIN_API_KEY;
    if (!key || request.headers.authorization !== `Bearer ${key}`) return error(reply, request, 401, 'UNAUTHORIZED', 'Admin authorization required');
    const body = Species.safeParse(request.body); if (!body.success) return error(reply, request, 400, 'INVALID_REQUEST', 'Invalid species');
    const s = body.data;
    await database.query('INSERT INTO creature_species(id,display_name,types,base_stats,base_capture_rate) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET display_name=EXCLUDED.display_name,types=EXCLUDED.types,base_stats=EXCLUDED.base_stats,base_capture_rate=EXCLUDED.base_capture_rate', [s.id,s.displayName,s.types,s.baseStats,s.baseCaptureRate]);
    return reply.code(204).send();
  });

  app.post('/api/v1/admin/zones', async (request, reply) => {
    const database = db(request, reply); if (!database) return;
    const key = process.env.ADMIN_API_KEY;
    if (!key || request.headers.authorization !== `Bearer ${key}`) return error(reply, request, 401, 'UNAUTHORIZED', 'Admin authorization required');
    const body = z.object({ id: z.string().uuid().optional(), slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/), name: z.string().min(1).max(80), boundary: z.array(GeoPoint).min(3), active: z.boolean().default(true) }).safeParse(request.body);
    if (!body.success) return error(reply, request, 400, 'INVALID_REQUEST', 'Invalid zone');
    const { id, slug, name, boundary, active } = body.data;
    const saved = await database.query('INSERT INTO zones(id,slug,name,boundary,active) VALUES(COALESCE($1::uuid,gen_random_uuid()),$2,$3,$4,$5) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,boundary=EXCLUDED.boundary,active=EXCLUDED.active RETURNING id,slug,name,boundary,active', [id ?? null,slug,name,JSON.stringify(boundary),active]);
    return reply.code(200).send(saved.rows[0]);
  });

  app.post('/api/v1/admin/spawns/generate', async (request, reply) => {
    const database = db(request, reply); if (!database) return;
    const key = process.env.ADMIN_API_KEY;
    if (!key || request.headers.authorization !== `Bearer ${key}`) return error(reply, request, 401, 'UNAUTHORIZED', 'Admin authorization required');
    const input = z.object({ durationMinutes: z.number().int().min(5).max(1440).default(60), countPerZone: z.number().int().min(1).max(100).default(8) }).safeParse(request.body ?? {});
    if (!input.success) return error(reply, request, 400, 'INVALID_REQUEST', 'Invalid spawn generation options');
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const zones = await client.query('SELECT id,boundary FROM zones WHERE active ORDER BY id');
      const species = await client.query<{id:string}>('SELECT id FROM creature_species ORDER BY id');
      if (!zones.rowCount || !species.rowCount) { await client.query('ROLLBACK'); return error(reply, request, 422, 'CONTENT_NOT_READY', 'At least one active zone and species are required'); }
      const now = new Date(); const until = new Date(now.getTime() + input.data.durationMinutes * 60_000); let generated = 0;
      for (const zone of zones.rows) {
        const points = z.array(GeoPoint).safeParse(zone.boundary); if (!points.success || points.data.length < 3) continue;
        const latitudes=points.data.map(p=>p.latitude), longitudes=points.data.map(p=>p.longitude);
        for(let i=0;i<input.data.countPerZone;i++) {
          let latitude=0,longitude=0,located=false;
          for(let attempt=0;attempt<500;attempt++) {
            latitude=Math.min(...latitudes)+Math.random()*(Math.max(...latitudes)-Math.min(...latitudes));
            longitude=Math.min(...longitudes)+Math.random()*(Math.max(...longitudes)-Math.min(...longitudes));
            if(pointInPolygon(latitude,longitude,points.data)){located=true;break;}
          }
          if(!located)continue;
          const speciesId=species.rows[randomBytes(4).readUInt32BE(0)%species.rows.length]!.id;
          await client.query('INSERT INTO spawns(zone_id,species_id,latitude,longitude,level,active_from,active_until,spawn_seed,rules_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,1)',[zone.id,speciesId,latitude,longitude,1+Math.floor(Math.random()*10),now,until,randomBytes(24).toString('base64url')]); generated++;
        }
      }
      await client.query('COMMIT'); return reply.code(201).send({ generated, activeFrom:now.toISOString(), activeUntil:until.toISOString() });
    } catch (cause) { await client.query('ROLLBACK'); throw cause; } finally { client.release(); }
  });
}
