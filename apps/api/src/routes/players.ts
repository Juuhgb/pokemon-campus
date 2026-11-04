import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { PartyUpdateRequestSchema, PlayerIdParamsSchema } from '@pokemon-campus/shared';
import { getPlayerProfile } from '../services/player-service.js';
import { authenticate } from './auth.js';

interface PlayerRoutesOptions {
  pool?: Pool;
}

export async function registerPlayerRoutes(app: FastifyInstance, options: PlayerRoutesOptions): Promise<void> {
  if (options.pool) {
    const auth = authenticate(options.pool);
    app.get('/api/v1/players/me', { preHandler: auth }, async (request, reply) => {
      const player = await getPlayerProfile(options.pool!, request.playerId!);
      return player ?? reply.code(404).send({ error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found', requestId: request.id } });
    });
    app.get('/api/v1/players/me/state', { preHandler: auth }, async (request, reply) => {
      const playerId=request.playerId!;
      const [player,creatures,party,inventory,encounters,cursor]=await Promise.all([
        getPlayerProfile(options.pool!,playerId),
        options.pool!.query('SELECT id,player_id AS "playerId",species_id AS "speciesId",nickname,level,experience,current_hp AS "currentHp",max_hp AS "maxHp",caught_at AS "caughtAt",source_encounter_id AS "sourceEncounterId",version FROM player_creatures WHERE player_id=$1 ORDER BY caught_at DESC',[playerId]),
        options.pool!.query('SELECT p.version,p.updated_at AS "updatedAt",COALESCE(array_agg(s.creature_id ORDER BY s.slot) FILTER(WHERE s.creature_id IS NOT NULL),ARRAY[]::uuid[]) AS ids FROM parties p LEFT JOIN party_slots s ON s.player_id=p.player_id WHERE p.player_id=$1 GROUP BY p.player_id',[playerId]),
        options.pool!.query('SELECT i.version,i.updated_at AS "updatedAt",COALESCE(json_agg(json_build_object(\'itemId\',x.item_id,\'quantity\',x.quantity) ORDER BY x.item_id) FILTER(WHERE x.item_id IS NOT NULL),\'[]\'::json) AS items FROM player_inventories i LEFT JOIN player_inventory_items x ON x.player_id=i.player_id WHERE i.player_id=$1 GROUP BY i.player_id',[playerId]),
        options.pool!.query(`SELECT e.id,e.player_id AS "playerId",e.spawn_id AS "spawnId",e.species_id AS "speciesId",e.wild_level AS level,e.wild_current_hp AS "currentHp",e.wild_max_hp AS "maxHp",e.battle_seed AS "battleSeed",e.rules_version AS "rulesVersion",e.status,e.turn_number AS "turnNumber",e.version,e.started_at AS "startedAt",e.expires_at AS "expiresAt",COALESCE(array_agg(m.creature_id ORDER BY m.slot) FILTER(WHERE m.creature_id IS NOT NULL),ARRAY[]::uuid[]) AS members FROM encounters e LEFT JOIN encounter_party_members m ON m.encounter_id=e.id WHERE e.player_id=$1 AND e.status='active' AND e.expires_at>NOW() GROUP BY e.id`,[playerId]),
        options.pool!.query('SELECT COALESCE(last_server_sequence,0)::text AS cursor FROM player_sync_cursors WHERE player_id=$1',[playerId]),
      ]);
      if(!player)return reply.code(404).send({error:{code:'PLAYER_NOT_FOUND',message:'Player not found',requestId:request.id}});
      const p=party.rows[0], inv=inventory.rows[0];
      return {player,creatures:creatures.rows.map(c=>({...c,caughtAt:new Date(c.caughtAt).toISOString()})),party:{playerId,version:p?.version??0,creatureIds:p?.ids??[],updatedAt:p?new Date(p.updatedAt).toISOString():new Date().toISOString()},inventory:{playerId,version:inv?.version??0,items:inv?.items??[],updatedAt:inv?new Date(inv.updatedAt).toISOString():new Date().toISOString()},activeEncounters:encounters.rows.map(e=>({id:e.id,playerId:e.playerId,spawnId:e.spawnId,opponent:{speciesId:e.speciesId,level:e.level,currentHp:e.currentHp,maxHp:e.maxHp},partyCreatureIds:e.members,battleSeed:e.battleSeed,rulesVersion:e.rulesVersion,status:e.status,turnNumber:e.turnNumber,version:e.version,startedAt:new Date(e.startedAt).toISOString(),expiresAt:new Date(e.expiresAt).toISOString()})),cursor:cursor.rows[0]?.cursor??'0',generatedAt:new Date().toISOString()};
    });
    app.get('/api/v1/players/me/creatures', { preHandler: auth }, async (request) => {
      const result = await options.pool!.query('SELECT id,player_id AS "playerId",species_id AS "speciesId",nickname,level,experience,current_hp AS "currentHp",max_hp AS "maxHp",caught_at AS "caughtAt",source_encounter_id AS "sourceEncounterId",version FROM player_creatures WHERE player_id=$1 ORDER BY caught_at DESC,id',[request.playerId]);
      return result.rows.map((c) => ({ ...c, caughtAt: new Date(c.caughtAt).toISOString() }));
    });
    app.get('/api/v1/players/me/party', { preHandler: auth }, async (request, reply) => {
      const result = await options.pool!.query('SELECT p.version,p.updated_at AS "updatedAt",COALESCE(array_agg(s.creature_id ORDER BY s.slot) FILTER(WHERE s.creature_id IS NOT NULL),ARRAY[]::uuid[]) AS "creatureIds" FROM parties p LEFT JOIN party_slots s ON s.player_id=p.player_id WHERE p.player_id=$1 GROUP BY p.player_id',[request.playerId]);
      const party=result.rows[0]; if(!party)return reply.code(404).send({error:{code:'PARTY_NOT_FOUND',message:'Party not found',requestId:request.id}});
      return {playerId:request.playerId,version:party.version,creatureIds:party.creatureIds,updatedAt:new Date(party.updatedAt).toISOString()};
    });
    app.put('/api/v1/players/me/party', { preHandler: auth }, async (request, reply) => {
      const body=PartyUpdateRequestSchema.safeParse(request.body); if(!body.success)return reply.code(400).send({error:{code:'INVALID_REQUEST',message:'Invalid party update',requestId:request.id}});
      const client=await options.pool!.connect();
      try { await client.query('BEGIN'); const current=await client.query('SELECT version,updated_at FROM parties WHERE player_id=$1 FOR UPDATE',[request.playerId]);
        if(!current.rows[0]){await client.query('ROLLBACK');return reply.code(404).send({error:{code:'PARTY_NOT_FOUND',message:'Party not found',requestId:request.id}});}
        if(current.rows[0].version!==body.data.expectedVersion){await client.query('ROLLBACK');return reply.code(409).send({error:{code:'VERSION_CONFLICT',message:'Party has changed',requestId:request.id,details:{currentVersion:current.rows[0].version}}});}
        const owned=await client.query('SELECT id FROM player_creatures WHERE player_id=$1 AND id=ANY($2::uuid[])',[request.playerId,body.data.creatureIds]);
        if(owned.rowCount!==body.data.creatureIds.length){await client.query('ROLLBACK');return reply.code(422).send({error:{code:'CREATURE_NOT_OWNED',message:'Party contains a creature not owned by this player',requestId:request.id}});}
        await client.query('DELETE FROM party_slots WHERE player_id=$1',[request.playerId]);
        for(let i=0;i<body.data.creatureIds.length;i++)await client.query('INSERT INTO party_slots(player_id,slot,creature_id) VALUES($1,$2,$3)',[request.playerId,i+1,body.data.creatureIds[i]]);
        const updated=await client.query('UPDATE parties SET version=version+1,updated_at=NOW() WHERE player_id=$1 RETURNING version,updated_at AS "updatedAt"',[request.playerId]); await client.query('COMMIT');
        return {playerId:request.playerId,version:updated.rows[0].version,creatureIds:body.data.creatureIds,updatedAt:new Date(updated.rows[0].updatedAt).toISOString()};
      } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
    });
    app.get('/api/v1/players/me/inventory', { preHandler: auth }, async (request, reply) => {
      const result=await options.pool!.query('SELECT i.version,i.updated_at AS "updatedAt",COALESCE(json_agg(json_build_object(\'itemId\',x.item_id,\'quantity\',x.quantity) ORDER BY x.item_id) FILTER(WHERE x.item_id IS NOT NULL),\'[]\'::json) AS items FROM player_inventories i LEFT JOIN player_inventory_items x ON x.player_id=i.player_id WHERE i.player_id=$1 GROUP BY i.player_id',[request.playerId]);
      const inventory=result.rows[0]; if(!inventory)return reply.code(404).send({error:{code:'INVENTORY_NOT_FOUND',message:'Inventory not found',requestId:request.id}});
      return {playerId:request.playerId,version:inventory.version,items:inventory.items,updatedAt:new Date(inventory.updatedAt).toISOString()};
    });
  }
  app.get('/api/v1/players/:playerId', async (request, reply) => {
    const params = PlayerIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'playerId must be a UUID',
          requestId: request.id,
          details: params.error.flatten(),
        },
      });
    }
    if (!options.pool) {
      return reply.code(503).send({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'DATABASE_URL is not configured',
          requestId: request.id,
        },
      });
    }

    const player = await getPlayerProfile(options.pool, params.data.playerId);
    if (!player) {
      return reply.code(404).send({
        error: {
          code: 'PLAYER_NOT_FOUND',
          message: 'Player not found',
          requestId: request.id,
        },
      });
    }
    return player;
  });
}
