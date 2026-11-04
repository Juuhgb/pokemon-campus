import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export const UtcDateTimeSchema = z.string().datetime();
export const VersionSchema = z.number().int().nonnegative();
export const ServerSequenceSchema = z.string().regex(/^[0-9]+$/);
export const SpeciesIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/);

export const CreatureStatsSchema = z.object({
  level: z.number().int().min(1).max(100),
  hp: z.number().int().min(0),
  maxHp: z.number().int().positive(),
  attack: z.number().positive(),
  defense: z.number().positive(),
});
export type CreatureStats = z.infer<typeof CreatureStatsSchema>;

export const PlayerProfileSchema = z.object({
  id: UuidSchema,
  displayName: z.string().trim().min(1).max(40),
  score: z.number().int().nonnegative(),
  createdAt: UtcDateTimeSchema,
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

export const RegisterPlayerRequestSchema = z.object({
  email: z.string().trim().email().max(254),
  displayName: z.string().trim().min(1).max(40),
  password: z.string().min(8).max(128),
});
export type RegisterPlayerRequest = z.infer<typeof RegisterPlayerRequestSchema>;

export const LoginPlayerRequestSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});
export type LoginPlayerRequest = z.infer<typeof LoginPlayerRequestSchema>;

export const AuthSessionSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresAt: UtcDateTimeSchema,
  player: PlayerProfileSchema,
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const CreatureSpeciesSchema = z.object({
  id: SpeciesIdSchema,
  displayName: z.string().trim().min(1).max(80),
  types: z.array(z.string().trim().min(1).max(24)).min(1).max(2),
  baseStats: z.object({
    hp: z.number().int().positive(),
    attack: z.number().int().positive(),
    defense: z.number().int().positive(),
    speed: z.number().int().nonnegative(),
  }),
  baseCaptureRate: z.number().min(0).max(1),
});
export type CreatureSpecies = z.infer<typeof CreatureSpeciesSchema>;

export const GeoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

export const ZoneSchema = z.object({
  id: UuidSchema,
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/),
  name: z.string().trim().min(1).max(80),
  boundary: z.array(GeoPointSchema).min(3),
  active: z.boolean(),
});
export type Zone = z.infer<typeof ZoneSchema>;

export const SpawnSchema = z.object({
  id: UuidSchema,
  zoneId: UuidSchema,
  speciesId: SpeciesIdSchema,
  position: GeoPointSchema,
  level: z.number().int().min(1).max(100),
  activeFrom: UtcDateTimeSchema,
  activeUntil: UtcDateTimeSchema,
  spawnToken: z.string().min(16),
});
export type Spawn = z.infer<typeof SpawnSchema>;

export const PlayerCreatureSchema = z.object({
  id: UuidSchema,
  playerId: UuidSchema,
  speciesId: SpeciesIdSchema,
  nickname: z.string().trim().min(1).max(20).nullable(),
  level: z.number().int().min(1).max(100),
  experience: z.number().int().nonnegative(),
  currentHp: z.number().int().nonnegative(),
  maxHp: z.number().int().positive(),
  caughtAt: UtcDateTimeSchema,
  sourceEncounterId: UuidSchema.nullable(),
  version: VersionSchema,
}).refine((creature) => creature.currentHp <= creature.maxHp, {
  message: 'currentHp must not exceed maxHp',
  path: ['currentHp'],
});
export type PlayerCreature = z.infer<typeof PlayerCreatureSchema>;

export const CreatureIdsSchema = z.array(UuidSchema).max(3)
  .refine((ids) => new Set(ids).size === ids.length, 'A creature can appear only once in a party');

export const PartySchema = z.object({
  playerId: UuidSchema,
  version: VersionSchema,
  creatureIds: CreatureIdsSchema,
  updatedAt: UtcDateTimeSchema,
});
export type Party = z.infer<typeof PartySchema>;

export const PartyUpdateRequestSchema = z.object({
  expectedVersion: VersionSchema,
  creatureIds: CreatureIdsSchema,
});
export type PartyUpdateRequest = z.infer<typeof PartyUpdateRequestSchema>;

export const EncounterStatusSchema = z.enum(['active', 'captured', 'fled', 'expired']);

export const EncounterSnapshotSchema = z.object({
  id: UuidSchema,
  playerId: UuidSchema,
  spawnId: UuidSchema,
  opponent: z.object({
    speciesId: SpeciesIdSchema,
    level: z.number().int().min(1).max(100),
    currentHp: z.number().int().nonnegative(),
    maxHp: z.number().int().positive(),
  }),
  partyCreatureIds: CreatureIdsSchema,
  status: EncounterStatusSchema,
  turnNumber: z.number().int().positive(),
  version: VersionSchema,
  startedAt: UtcDateTimeSchema,
  expiresAt: UtcDateTimeSchema,
});
export type EncounterSnapshot = z.infer<typeof EncounterSnapshotSchema>;

export const GameActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ATTACK'),
    actorCreatureId: UuidSchema,
    moveId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/),
  }),
  z.object({
    type: z.literal('CAPTURE'),
    actorCreatureId: UuidSchema,
    ball: z.enum(['POKE_BALL', 'GREAT_BALL']),
  }),
  z.object({
    type: z.literal('SWITCH'),
    creatureId: UuidSchema,
  }),
  z.object({ type: z.literal('FLEE') }),
]);
export type GameAction = z.infer<typeof GameActionSchema>;

export const StartEncounterPayloadSchema = z.object({
  encounterId: UuidSchema,
  spawnId: UuidSchema,
  spawnToken: z.string().min(16),
  expectedPartyVersion: VersionSchema,
  partyCreatureIds: CreatureIdsSchema,
});

export const BattleActionPayloadSchema = z.object({
  encounterId: UuidSchema,
  expectedVersion: VersionSchema,
  expectedTurnNumber: z.number().int().positive(),
  action: GameActionSchema,
});

export const PartyUpdatedPayloadSchema = z.object({
  expectedVersion: VersionSchema,
  creatureIds: CreatureIdsSchema,
});

const SyncEventMetadataSchema = z.object({
  schemaVersion: z.literal(1),
  idempotencyKey: UuidSchema,
  playerId: UuidSchema,
  deviceId: UuidSchema,
  clientSequence: z.number().int().positive(),
  occurredAt: UtcDateTimeSchema,
});

export const PendingSyncEventSchema = z.discriminatedUnion('type', [
  SyncEventMetadataSchema.extend({
    type: z.literal('encounter.started'),
    payload: StartEncounterPayloadSchema,
  }),
  SyncEventMetadataSchema.extend({
    type: z.literal('battle.action'),
    payload: BattleActionPayloadSchema,
  }),
  SyncEventMetadataSchema.extend({
    type: z.literal('party.updated'),
    payload: PartyUpdatedPayloadSchema,
  }),
]);
export type PendingSyncEvent = z.infer<typeof PendingSyncEventSchema>;

export const SyncRequestSchema = z.object({
  events: z.array(PendingSyncEventSchema).min(1).max(100),
});
export type SyncRequest = z.infer<typeof SyncRequestSchema>;

export const SyncRejectCodeSchema = z.enum([
  'INVALID_SPAWN',
  'SPAWN_EXPIRED',
  'VERSION_CONFLICT',
  'ENCOUNTER_NOT_FOUND',
  'ENCOUNTER_EXPIRED',
  'STALE_TURN',
  'CREATURE_NOT_OWNED',
  'INVALID_ACTION',
  'SEQUENCE_REPLAY',
]);

const SnapshotSchema = z.union([EncounterSnapshotSchema, PartySchema]);

export const SyncEventResultSchema = z.discriminatedUnion('status', [
  z.object({
    idempotencyKey: UuidSchema,
    status: z.literal('accepted'),
    serverSequence: ServerSequenceSchema,
    acceptedAt: UtcDateTimeSchema,
    aggregateVersion: VersionSchema.optional(),
    snapshot: SnapshotSchema.optional(),
  }),
  z.object({
    idempotencyKey: UuidSchema,
    status: z.literal('duplicate'),
    serverSequence: ServerSequenceSchema,
    acceptedAt: UtcDateTimeSchema,
  }),
  z.object({
    idempotencyKey: UuidSchema,
    status: z.literal('rejected'),
    code: SyncRejectCodeSchema,
    message: z.string().min(1),
    currentVersion: VersionSchema.optional(),
    snapshot: SnapshotSchema.optional(),
  }),
]);
export type SyncEventResult = z.infer<typeof SyncEventResultSchema>;

export const SyncResponseSchema = z.object({
  results: z.array(SyncEventResultSchema),
  nextCursor: ServerSequenceSchema,
});
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

export const ServerChangeSchema = z.object({
  serverSequence: ServerSequenceSchema,
  acceptedAt: UtcDateTimeSchema,
  event: PendingSyncEventSchema,
});

export const SyncChangesResponseSchema = z.object({
  items: z.array(ServerChangeSchema),
  nextCursor: ServerSequenceSchema,
  hasMore: z.boolean(),
});
export type SyncChangesResponse = z.infer<typeof SyncChangesResponseSchema>;

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  playerId: UuidSchema,
  displayName: z.string().min(1).max(40),
  score: z.number().int().nonnegative(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const PlayerIdParamsSchema = z.object({ playerId: UuidSchema });
export const EncounterIdParamsSchema = z.object({ encounterId: UuidSchema });

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
