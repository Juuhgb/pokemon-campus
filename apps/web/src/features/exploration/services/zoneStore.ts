import { database } from '../../../sync/database.js';
import { createEditableZoneRepository, type ZoneStore } from './zoneRepository.js';

const STORE_KEY = 'exploration:zones';

/** Zonas editadas ficam no IndexedDB deste navegador (tabela `snapshots`), disponíveis offline. */
export function createIndexedDbZoneStore(): ZoneStore {
  return {
    async read() {
      return (await database.snapshots.get(STORE_KEY))?.value ?? null;
    },
    async write(value) {
      await database.snapshots.put({ key: STORE_KEY, value, updatedAt: Date.now() });
    },
    async clear() {
      await database.snapshots.delete(STORE_KEY);
    },
  };
}

/**
 * Repositório de zonas compartilhado entre o jogo (leitura) e o painel de admin (edição).
 * Sem edições salvas, devolve as zonas padrão.
 */
export const localZoneRepository = createEditableZoneRepository(createIndexedDbZoneStore());
