import Dexie, { type EntityTable } from 'dexie';
import type { PendingSyncEvent } from '@pokemon-campus/shared';

export interface LocalSnapshot {
  key: string;
  updatedAt: number;
  value: unknown;
}

class CampusDatabase extends Dexie {
  outbox!: EntityTable<PendingSyncEvent, 'idempotencyKey'>;
  snapshots!: EntityTable<LocalSnapshot, 'key'>;

  constructor() {
    super('pokemon-campus');
    this.version(1).stores({
      outbox: 'idempotencyKey, playerId, occurredAt',
      snapshots: 'key, updatedAt',
    });
  }
}

export const database = new CampusDatabase();

export async function enqueueEvent(event: PendingSyncEvent): Promise<void> {
  await database.outbox.put(event);
}

