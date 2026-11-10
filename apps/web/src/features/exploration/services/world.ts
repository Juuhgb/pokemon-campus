import { database } from '../../../sync/database.js';
import { DEFAULT_ZONES } from '../data/defaultZones.js';
import type { CampusZone, ExplorationSpawn } from '../types.js';
import { parseZones } from '../utils/zoneEdits.js';
import type { AdminSpawnStore } from './adminSpawns.js';
import type { EditableZoneRepository, ZoneRepository, ZoneStore } from './zoneRepository.js';

/**
 * "Mundo publicado": zonas e Pokémon colocados que o admin publica no servidor
 * (Firestore `mundo/zonas` e `mundo/pokemon`) e que todos os aparelhos aplicam sozinhos.
 *
 * Cada aparelho guarda a última versão recebida no IndexedDB, então o jogo continua usando as
 * zonas do admin mesmo offline. Como os spawns das zonas são gerados de forma determinística
 * (zona + janela de 30 min), todos os aparelhos com as mesmas zonas veem os mesmos Pokémon.
 */

export interface WorldCache {
  readZones(): Promise<CampusZone[] | null>;
  writeZones(zones: CampusZone[]): Promise<void>;
  readSpawns(): Promise<ExplorationSpawn[] | null>;
  writeSpawns(spawns: ExplorationSpawn[]): Promise<void>;
}

const ZONES_KEY = 'world:zones';
const SPAWNS_KEY = 'world:spawns';

export const looksLikeSpawn = (value: unknown): value is ExplorationSpawn =>
  typeof value === 'object' && value !== null
  && typeof (value as ExplorationSpawn).spawnId === 'string'
  && typeof (value as ExplorationSpawn).speciesId === 'string'
  && typeof (value as ExplorationSpawn).latitude === 'number'
  && typeof (value as ExplorationSpawn).longitude === 'number'
  && typeof (value as ExplorationSpawn).startsAt === 'string'
  && typeof (value as ExplorationSpawn).expiresAt === 'string';

export function parseSpawns(value: unknown): ExplorationSpawn[] | null {
  return Array.isArray(value) ? value.filter(looksLikeSpawn) : null;
}

export const indexedDbWorldCache: WorldCache = {
  async readZones() {
    return parseZones((await database.snapshots.get(ZONES_KEY))?.value ?? null);
  },
  async writeZones(zones) {
    await database.snapshots.put({ key: ZONES_KEY, value: { version: 1, zones }, updatedAt: Date.now() });
  },
  async readSpawns() {
    return parseSpawns((await database.snapshots.get(SPAWNS_KEY))?.value ?? null);
  },
  async writeSpawns(spawns) {
    await database.snapshots.put({ key: SPAWNS_KEY, value: spawns, updatedAt: Date.now() });
  },
};

export function createMemoryWorldCache(zones: CampusZone[] | null = null, spawns: ExplorationSpawn[] | null = null): WorldCache {
  let storedZones = zones;
  let storedSpawns = spawns;
  return {
    readZones: async () => storedZones,
    writeZones: async (value) => { storedZones = value; },
    readSpawns: async () => storedSpawns,
    writeSpawns: async (value) => { storedSpawns = value; },
  };
}

/**
 * Zonas do jogo: as publicadas pelo admin; sem publicação, as editadas neste aparelho
 * (versões antigas do painel); sem nada, as zonas padrão.
 */
export function createWorldZoneRepository(cache: WorldCache, local: ZoneStore | null, defaults: CampusZone[] = DEFAULT_ZONES): ZoneRepository {
  return {
    async listZones() {
      const published = await cache.readZones().catch(() => null);
      if (published) return published;
      const draft = local ? parseZones(await local.read().catch(() => null)) : null;
      return draft ?? defaults;
    },
  };
}

/** Pokémon colocados: os publicados somados aos deste aparelho (sem repetir). */
export function createWorldSpawnStore(cache: WorldCache, local: AdminSpawnStore | null): AdminSpawnStore {
  return {
    async list() {
      const [published, mine] = await Promise.all([cache.readSpawns().catch(() => null), local?.list().catch(() => []) ?? []]);
      const byId = new Map<string, ExplorationSpawn>();
      for (const spawn of [...(published ?? []), ...mine]) byId.set(spawn.spawnId, spawn);
      return [...byId.values()];
    },
    async save() {
      throw new Error('O jogo só lê os Pokémon publicados.');
    },
  };
}

/** O que o admin publica e como ele sabe se deu certo. */
export interface WorldPublisher {
  /** Versão atual no servidor (null se nunca foi publicado). Lança se o servidor não responder. */
  fetch(): Promise<{ zones: CampusZone[] | null; spawns: ExplorationSpawn[] | null }>;
  publishZones(zones: CampusZone[]): Promise<void>;
  publishSpawns(spawns: ExplorationSpawn[]): Promise<void>;
}

export type PublishState =
  | { status: 'idle' }
  | { status: 'publishing' }
  | { status: 'published'; at: number }
  | { status: 'error'; message: string };

export interface PublishTracker {
  get(): PublishState;
  set(state: PublishState): void;
  subscribe(callback: (state: PublishState) => void): () => void;
}

export function createPublishTracker(): PublishTracker {
  let state: PublishState = { status: 'idle' };
  const listeners = new Set<(state: PublishState) => void>();
  return {
    get: () => state,
    set(next) {
      state = next;
      listeners.forEach((callback) => callback(next));
    },
    subscribe(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}

export function publishErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  if (code === 'permission-denied') return 'Sua conta não é admin: as mudanças ficaram só neste aparelho.';
  if (code === 'unauthenticated') return 'Entre com o Google (conta de admin) para publicar.';
  if (code === 'timeout' || code === 'unavailable') return 'Sem conexão com o servidor: publique de novo quando a internet voltar.';
  return 'Não foi possível publicar. Tente de novo.';
}

/**
 * Zonas no painel do admin: carrega o que está publicado (para editar a versão atual de
 * todos), salva no aparelho e publica no servidor a cada mudança.
 */
export function createAdminZoneRepository(
  local: EditableZoneRepository,
  cache: WorldCache,
  publisher: WorldPublisher,
  tracker: PublishTracker,
  defaults: CampusZone[] = DEFAULT_ZONES,
): EditableZoneRepository {
  const publish = async (zones: CampusZone[]) => {
    tracker.set({ status: 'publishing' });
    try {
      await publisher.publishZones(zones);
      await cache.writeZones(zones);
      tracker.set({ status: 'published', at: Date.now() });
    } catch (error) {
      tracker.set({ status: 'error', message: publishErrorMessage(error) });
    }
  };
  return {
    async listZones() {
      try {
        const remote = await publisher.fetch();
        if (remote.zones) {
          await cache.writeZones(remote.zones);
          return remote.zones;
        }
      } catch {
        // Offline: usa a última versão publicada que este aparelho recebeu.
        const cached = await cache.readZones().catch(() => null);
        if (cached) return cached;
      }
      return local.listZones();
    },
    async saveZones(zones) {
      await local.saveZones(zones);
      await publish(zones);
    },
    async reset() {
      await local.reset();
      await publish(defaults);
      return defaults;
    },
  };
}

/** Pokémon colocados no painel do admin: mesma ideia das zonas. */
export function createAdminWorldSpawnStore(
  local: AdminSpawnStore,
  cache: WorldCache,
  publisher: WorldPublisher,
  tracker: PublishTracker,
): AdminSpawnStore {
  let loadedFromServer = false;
  return {
    async list() {
      if (!loadedFromServer) {
        loadedFromServer = true;
        try {
          const remote = await publisher.fetch();
          if (remote.spawns) {
            await cache.writeSpawns(remote.spawns);
            await local.save(remote.spawns);
          }
        } catch {
          // Offline: segue com a cópia deste aparelho.
        }
      }
      return local.list();
    },
    async save(spawns) {
      await local.save(spawns);
      tracker.set({ status: 'publishing' });
      try {
        await publisher.publishSpawns(spawns);
        await cache.writeSpawns(spawns);
        tracker.set({ status: 'published', at: Date.now() });
      } catch (error) {
        tracker.set({ status: 'error', message: publishErrorMessage(error) });
      }
    },
  };
}
