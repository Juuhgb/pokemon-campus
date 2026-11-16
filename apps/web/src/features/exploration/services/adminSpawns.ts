import { getSpecies } from '../../catalog/species.js';
import { database } from '../../../sync/database.js';
import type { ExplorationSpawn, GeoPoint } from '../types.js';
import type { SpawnQuery, SpawnRepository } from './spawnRepository.js';

/**
 * Pokémon colocados à mão pelo painel de admin (ex.: "colocar onde eu estou").
 * O admin publica a lista no servidor (world.ts) e todos os aparelhos a recebem,
 * somada aos Pokémon gerados nas zonas.
 */
export interface AdminSpawnStore {
  list(): Promise<ExplorationSpawn[]>;
  save(spawns: ExplorationSpawn[]): Promise<void>;
}

export const ADMIN_SPAWN_PREFIX = 'admin-';

export const ADMIN_SPAWN_DURATIONS = [
  { minutes: 30, label: '30 minutos' },
  { minutes: 120, label: '2 horas' },
  { minutes: 24 * 60, label: '1 dia' },
  { minutes: 7 * 24 * 60, label: '1 semana' },
] as const;

export interface NewAdminSpawn {
  speciesId: string;
  level: number;
  point: GeoPoint;
  durationMinutes: number;
  now?: Date;
  id?: string;
}

export function createAdminSpawn({ speciesId, level, point, durationMinutes, now = new Date(), id = crypto.randomUUID() }: NewAdminSpawn): ExplorationSpawn {
  const species = getSpecies(speciesId);
  const clampedLevel = Math.min(100, Math.max(1, Math.round(level)));
  return {
    spawnId: `${ADMIN_SPAWN_PREFIX}${id}`,
    speciesId,
    latitude: Number(point.latitude.toFixed(7)),
    longitude: Number(point.longitude.toFixed(7)),
    level: clampedLevel,
    rarity: species.rarity,
    startsAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + durationMinutes * 60_000).toISOString(),
  };
}

const isActiveAt = (at: Date) => (spawn: ExplorationSpawn) =>
  Date.parse(spawn.startsAt) <= at.getTime() && Date.parse(spawn.expiresAt) > at.getTime();

/** Só os que ainda não expiraram, para o jogo. */
export function createAdminSpawnRepository(store: AdminSpawnStore): SpawnRepository {
  return {
    async listSpawns({ at }: SpawnQuery) {
      return (await store.list()).filter(isActiveAt(at));
    },
  };
}

/** Junta várias fontes de spawn; se uma falhar, as outras continuam valendo. */
export function combineSpawnRepositories(...repositories: SpawnRepository[]): SpawnRepository {
  return {
    async listSpawns(query) {
      const results = await Promise.allSettled(repositories.map((repository) => repository.listSpawns(query)));
      const ok = results.filter((result): result is PromiseFulfilledResult<ExplorationSpawn[]> => result.status === 'fulfilled');
      if (ok.length === 0) throw (results[0] as PromiseRejectedResult).reason;
      return ok.flatMap((result) => result.value);
    },
  };
}

const looksLikeSpawn = (value: unknown): value is ExplorationSpawn =>
  typeof value === 'object' && value !== null
  && typeof (value as ExplorationSpawn).spawnId === 'string'
  && typeof (value as ExplorationSpawn).speciesId === 'string'
  && typeof (value as ExplorationSpawn).latitude === 'number'
  && typeof (value as ExplorationSpawn).longitude === 'number'
  && typeof (value as ExplorationSpawn).expiresAt === 'string';

const STORE_KEY = 'exploration:admin-spawns';

export function createIndexedDbAdminSpawnStore(): AdminSpawnStore {
  return {
    async list() {
      const saved = await database.snapshots.get(STORE_KEY);
      return Array.isArray(saved?.value) ? saved.value.filter(looksLikeSpawn) : [];
    },
    async save(spawns) {
      await database.snapshots.put({ key: STORE_KEY, value: spawns, updatedAt: Date.now() });
    },
  };
}

export function createInMemoryAdminSpawnStore(initial: ExplorationSpawn[] = []): AdminSpawnStore {
  let stored = initial;
  return {
    async list() {
      return stored;
    },
    async save(spawns) {
      stored = spawns;
    },
  };
}

/** Armazenamento compartilhado entre o admin (edição) e o jogo (leitura) neste aparelho. */
export const localAdminSpawnStore = createIndexedDbAdminSpawnStore();
