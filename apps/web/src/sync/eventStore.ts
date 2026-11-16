import type { PlayerEvent } from '../features/player/playerEvents.js';
import { database } from './database.js';

/**
 * - pending: só neste aparelho, esperando envio;
 * - sending: envio em curso (se o app fechar no meio, volta a pending ao abrir);
 * - confirmed: o servidor tem uma cópia;
 * - rejected: o servidor recusou de vez (não é reenviado).
 */
export type EventStatus = 'pending' | 'sending' | 'confirmed' | 'rejected';

export interface StoredEvent extends PlayerEvent {
  status: EventStatus;
  attempts: number;
  nextAttemptAt: number;
  error: string | null;
}

/** Armazenamento local persistente dos eventos (fila de saída + eventos confirmados). */
export interface EventStore {
  all(): Promise<StoredEvent[]>;
  get(id: string): Promise<StoredEvent | undefined>;
  /** Grava um evento novo do jogador; um id repetido é ignorado. */
  add(event: PlayerEvent): Promise<StoredEvent>;
  update(id: string, patch: Partial<Omit<StoredEvent, 'id'>>): Promise<void>;
  /** Fila de saída, na ordem em que as jogadas aconteceram. */
  outbox(): Promise<StoredEvent[]>;
  /** Eventos vindos do servidor: entram como confirmados (e confirmam os locais de mesmo id). */
  mergeConfirmed(events: readonly PlayerEvent[]): Promise<number>;
  /** O que ficou "sending" quando o app fechou volta a "pending". */
  resetSending(): Promise<number>;
  clear(): Promise<void>;
}

export function newStoredEvent(event: PlayerEvent, status: EventStatus = 'pending'): StoredEvent {
  return { ...event, status, attempts: 0, nextAttemptAt: 0, error: null };
}

const byTime = (a: StoredEvent, b: StoredEvent) => a.at - b.at || (a.id < b.id ? -1 : 1);

export const dexieEventStore: EventStore = {
  all: () => database.playerEvents.toArray(),
  get: (id) => database.playerEvents.get(id),
  async add(event) {
    return database.transaction('rw', database.playerEvents, async () => {
      const existing = await database.playerEvents.get(event.id);
      if (existing) return existing;
      const stored = newStoredEvent(event);
      await database.playerEvents.add(stored);
      return stored;
    });
  },
  async update(id, patch) {
    await database.playerEvents.update(id, patch);
  },
  async outbox() {
    return (await database.playerEvents.where('status').anyOf('pending', 'sending').toArray()).sort(byTime);
  },
  async mergeConfirmed(events) {
    if (events.length === 0) return 0;
    return database.transaction('rw', database.playerEvents, async () => {
      let changed = 0;
      for (const event of events) {
        const existing = await database.playerEvents.get(event.id);
        if (existing?.status === 'confirmed') continue;
        await database.playerEvents.put(existing ? { ...existing, status: 'confirmed', error: null } : newStoredEvent(event, 'confirmed'));
        changed += 1;
      }
      return changed;
    });
  },
  resetSending: () => database.playerEvents.where('status').equals('sending').modify({ status: 'pending' }),
  async clear() {
    await database.playerEvents.clear();
  },
};

/** Implementação em memória para os testes. */
export function createMemoryEventStore(initial: readonly StoredEvent[] = []): EventStore & { rows: Map<string, StoredEvent> } {
  const rows = new Map(initial.map((event) => [event.id, { ...event }]));
  return {
    rows,
    all: async () => [...rows.values()],
    get: async (id) => rows.get(id),
    async add(event) {
      const existing = rows.get(event.id);
      if (existing) return existing;
      const stored = newStoredEvent(event);
      rows.set(event.id, stored);
      return stored;
    },
    async update(id, patch) {
      const existing = rows.get(id);
      if (existing) rows.set(id, { ...existing, ...patch });
    },
    outbox: async () => [...rows.values()].filter((event) => event.status === 'pending' || event.status === 'sending').sort(byTime),
    async mergeConfirmed(events) {
      let changed = 0;
      for (const event of events) {
        const existing = rows.get(event.id);
        if (existing?.status === 'confirmed') continue;
        rows.set(event.id, existing ? { ...existing, status: 'confirmed', error: null } : newStoredEvent(event, 'confirmed'));
        changed += 1;
      }
      return changed;
    },
    async resetSending() {
      let count = 0;
      for (const [id, event] of rows) {
        if (event.status !== 'sending') continue;
        rows.set(id, { ...event, status: 'pending' });
        count += 1;
      }
      return count;
    },
    async clear() {
      rows.clear();
    },
  };
}
