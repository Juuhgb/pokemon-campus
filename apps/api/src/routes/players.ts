import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { PlayerIdParamsSchema } from '@pokemon-campus/shared';
import { getPlayerProfile } from '../services/player-service.js';

interface PlayerRoutesOptions {
  pool?: Pool;
}

export async function registerPlayerRoutes(app: FastifyInstance, options: PlayerRoutesOptions): Promise<void> {
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
