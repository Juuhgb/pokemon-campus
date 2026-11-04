import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export const UtcDateTimeSchema = z.string().datetime();
export const VersionSchema = z.number().int().nonnegative();
export const ServerSequenceSchema = z.string().regex(/^[0-9]+$/);
export const SpeciesIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/);
export const BattleSeedSchema = z.string().min(16).max(256);
export const RulesVersionSchema = z.number().int().positive();

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
  battleSeed: BattleSeedSchema,
  rulesVersion: RulesVersionSchema,
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

export const InventoryItemIdSchema = z.enum(['POKE_BALL', 'GREAT_BALL']);
export type InventoryItemId = z.infer<typeof InventoryItemIdSchema>;

export const InventoryItemSchema = z.object({
  itemId: InventoryItemIdSchema,
  quantity: z.number().int().nonnegative(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const PlayerInventorySchema = z.object({
  playerId: UuidSchema,
  version: VersionSchema,
  items: z.array(InventoryItemSchema).refine(
    (items) => new Set(items.map((item) => item.itemId)).size === items.length,
    'An inventory item can appear only once',
  ),
  updatedAt: UtcDateTimeSchema,
});
export type PlayerInventory = z.infer<typeof PlayerInventorySchema>;

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
  battleSeed: BattleSeedSchema,
  rulesVersion: RulesVersionSchema,
  status: EncounterStatusSchema,
  turnNumber: z.number().int().positive(),
  version: VersionSchema,
  startedAt: UtcDateTimeSchema,
  expiresAt: UtcDateTimeSchema,
});
export type EncounterSnapshot = z.infer<typeof EncounterSnapshotSchema>;

export const PlayerStateSnapshotSchema = z.object({
  player: PlayerProfileSchema,
  creatures: z.array(PlayerCreatureSchema),
  party: PartySchema,
  inventory: PlayerInventorySchema,
  activeEncounters: z.array(EncounterSnapshotSchema),
  cursor: ServerSequenceSchema,
  generatedAt: UtcDateTimeSchema,
});
export type PlayerStateSnapshot = z.infer<typeof PlayerStateSnapshotSchema>;

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
  expectedInventoryVersion: VersionSchema.optional(),
  action: GameActionSchema,
}).superRefine((payload, context) => {
  if (payload.action.type === 'CAPTURE' && payload.expectedInventoryVersion === undefined) {
    context.addIssue({
      code: 'custom',
      path: ['expectedInventoryVersion'],
      message: 'Capture actions must include the expected inventory version',
    });
  }
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
}).superRefine((request, context) => {
  const idempotencyKeys = new Set<string>();
  const lastSequenceByDevice = new Map<string, number>();

  request.events.forEach((event, index) => {
    if (idempotencyKeys.has(event.idempotencyKey)) {
      context.addIssue({
        code: 'custom',
        path: ['events', index, 'idempotencyKey'],
        message: 'An idempotency key can appear only once in a batch',
      });
    }
    idempotencyKeys.add(event.idempotencyKey);

    const deviceKey = `${event.playerId}:${event.deviceId}`;
    const previousSequence = lastSequenceByDevice.get(deviceKey);
    if (previousSequence !== undefined && event.clientSequence <= previousSequence) {
      context.addIssue({
        code: 'custom',
        path: ['events', index, 'clientSequence'],
        message: 'Events from one device must be sent in increasing sequence order',
      });
    }
    lastSequenceByDevice.set(deviceKey, event.clientSequence);
  });
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
  'INVENTORY_CONFLICT',
  'INSUFFICIENT_ITEM',
  'INVALID_ACTION',
  'SEQUENCE_REPLAY',
]);

export const SyncAggregateSnapshotSchema = z.discriminatedUnion('aggregateType', [
  z.object({ aggregateType: z.literal('party'), party: PartySchema }),
  z.object({
    aggregateType: z.literal('battle'),
    encounter: EncounterSnapshotSchema,
    inventory: PlayerInventorySchema,
    player: PlayerProfileSchema.optional(),
    creature: PlayerCreatureSchema.optional(),
  }),
]);
export type SyncAggregateSnapshot = z.infer<typeof SyncAggregateSnapshotSchema>;

export const AcceptedSyncEventResultSchema = z.object({
  idempotencyKey: UuidSchema,
  status: z.literal('accepted'),
  serverSequence: ServerSequenceSchema,
  acceptedAt: UtcDateTimeSchema,
  aggregateVersion: VersionSchema.optional(),
  snapshot: SyncAggregateSnapshotSchema.optional(),
});
export type AcceptedSyncEventResult = z.infer<typeof AcceptedSyncEventResultSchema>;

export const SyncEventResultSchema = z.discriminatedUnion('status', [
  AcceptedSyncEventResultSchema,
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
    snapshot: SyncAggregateSnapshotSchema.optional(),
  }),
]);
export type SyncEventResult = z.infer<typeof SyncEventResultSchema>;

export const SyncResponseSchema = z.object({
  results: z.array(SyncEventResultSchema),
  nextCursor: ServerSequenceSchema,
});
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

export const ServerChangeSchema = z.object({
  event: PendingSyncEventSchema,
  result: AcceptedSyncEventResultSchema,
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
