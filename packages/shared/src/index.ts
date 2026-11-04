import { z } from 'zod';

export const CreatureStatsSchema = z.object({
  level: z.number().int().min(1),
  hp: z.number().int().min(0),
  maxHp: z.number().int().positive(),
  attack: z.number().positive(),
  defense: z.number().positive(),
});

export type CreatureStats = z.infer<typeof CreatureStatsSchema>;

export const PlayerProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(40),
  createdAt: z.string().datetime(),
});

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

export const PlayerIdParamsSchema = z.object({ playerId: z.string().uuid() });

export const GameActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ATTACK'), encounterId: z.string().uuid(), moveId: z.string().min(1) }),
  z.object({ type: z.literal('CAPTURE'), encounterId: z.string().uuid(), ball: z.enum(['POKE_BALL', 'GREAT_BALL']) }),
  z.object({ type: z.literal('SWITCH'), encounterId: z.string().uuid(), creatureId: z.string().uuid() }),
  z.object({ type: z.literal('FLEE'), encounterId: z.string().uuid() }),
]);

export type GameAction = z.infer<typeof GameActionSchema>;

export const PendingSyncEventSchema = z.object({
  idempotencyKey: z.string().uuid(),
  playerId: z.string().uuid(),
  deviceId: z.string().min(1),
  occurredAt: z.string().datetime(),
  action: GameActionSchema,
});

export type PendingSyncEvent = z.infer<typeof PendingSyncEventSchema>;

