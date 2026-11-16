import Dexie, { type EntityTable } from 'dexie';
import { PendingSyncEventSchema, type PendingSyncEvent } from '@pokemon-campus/shared';
import type { StoredEvent } from './eventStore.js';

export type OutboxStatus = 'pending' | 'sending' | 'rejected';

export type OutboxItem = PendingSyncEvent & {
  deliveryStatus: OutboxStatus;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
};

export interface LocalSnapshot {
  key: string;
  updatedAt: number;
  value: unknown;
}

class CampusDatabase extends Dexie {
  outbox!: EntityTable<OutboxItem, 'idempotencyKey'>;
  snapshots!: EntityTable<LocalSnapshot, 'key'>;
  /** Eventos do jogador: fila de saída (pending/sending) e o que o servidor já confirmou. */
  playerEvents!: EntityTable<StoredEvent, 'id'>;

  constructor() {
    super('pokemon-campus');
    this.version(1).stores({
      outbox: 'idempotencyKey, playerId, occurredAt',
      snapshots: 'key, updatedAt',
    });
    this.version(2).stores({
      playerEvents: 'id, status, at',
    });
  }
}

export const database = new CampusDatabase();

export async function enqueueEvent(event: PendingSyncEvent): Promise<void> {
  await database.transaction('rw', database.outbox, async () => {
    const existing = await database.outbox.get(event.idempotencyKey);
    if (existing) return;
    await database.outbox.add({
      ...event,
      deliveryStatus: 'pending',
      attempts: 0,
      nextAttemptAt: Date.now(),
    });
  });
}

export async function getDeviceId(): Promise<string> {
  return database.transaction('rw', database.snapshots, async () => {
    const saved = await database.snapshots.get('device-id');
    if (typeof saved?.value === 'string') return saved.value;

    const deviceId = crypto.randomUUID();
    await database.snapshots.put({ key: 'device-id', value: deviceId, updatedAt: Date.now() });
    return deviceId;
  });
}

/** Alocação transacional mantém a sequência crescente mesmo com duas telas abertas. */
export async function allocateClientSequence(): Promise<number> {
  return database.transaction('rw', database.snapshots, async () => {
    const saved = await database.snapshots.get('client-sequence');
    const previous = typeof saved?.value === 'number' ? saved.value : 0;
    if (!Number.isSafeInteger(previous) || previous < 0) throw new RangeError('Stored client sequence is invalid');

    const next = previous + 1;
    await database.snapshots.put({ key: 'client-sequence', value: next, updatedAt: Date.now() });
    return next;
  });
}

/** Remove apenas os metadados locais antes de serializar o evento para a API. */
export function eventForSync(item: OutboxItem): PendingSyncEvent {
  const localFields = new Set(['deliveryStatus', 'attempts', 'nextAttemptAt', 'lastError']);
  const event = Object.fromEntries(Object.entries(item).filter(([key]) => !localFields.has(key)));
  return PendingSyncEventSchema.parse(event);
}

