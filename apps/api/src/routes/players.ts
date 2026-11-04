import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { PlayerIdParamsSchema } from '@pokemon-campus/shared';
import { getPlayerProfile } from '../services/player-service.js';

interface PlayerRoutesOptions {
  pool?: Pool;
}

export async function registerPlayerRoutes(app: FastifyInstance, options: PlayerRoutesOptions): Promise<void> {
  app.get('/players/:playerId', async (request, reply) => {
    const params = PlayerIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: 'playerId must be a UUID' });
    if (!options.pool) return reply.code(503).send({ message: 'DATABASE_URL is not configured' });

    const player = await getPlayerProfile(options.pool, params.data.playerId);
    if (!player) return reply.code(404).send({ message: 'Player not found' });
    return player;
  });
}

