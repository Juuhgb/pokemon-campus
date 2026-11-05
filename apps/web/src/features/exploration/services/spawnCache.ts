import { database } from '../../../sync/database.js';
import type { ExplorationSpawn } from '../types.js';
import type { SpawnCache } from './spawnRepository.js';

const CACHE_KEY = 'exploration:spawns';

const looksLikeSpawn = (value: unknown): value is ExplorationSpawn =>
  typeof value === 'object'
  && value !== null
  && typeof (value as ExplorationSpawn).spawnId === 'string'
  && typeof (value as ExplorationSpawn).latitude === 'number'
  && typeof (value as ExplorationSpawn).longitude === 'number'
  && typeof (value as ExplorationSpawn).expiresAt === 'string';

/** Cache de spawns no IndexedDB (tabela `snapshots` já existente), para uso offline. */
export function createIndexedDbSpawnCache(): SpawnCache {
  return {
    async read() {
      const saved = await database.snapshots.get(CACHE_KEY);
      if (!Array.isArray(saved?.value)) return null;
      return saved.value.filter(looksLikeSpawn);
    },
    async write(spawns) {
      await database.snapshots.put({ key: CACHE_KEY, value: spawns, updatedAt: Date.now() });
    },
  };
}
