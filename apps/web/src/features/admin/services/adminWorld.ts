import { localAdminSpawnStore } from '../../exploration/services/adminSpawns.js';
import {
  createAdminWorldSpawnStore,
  createAdminZoneRepository,
  createPublishTracker,
  indexedDbWorldCache,
} from '../../exploration/services/world.js';
import { firestoreWorldPublisher } from '../../exploration/services/worldRemote.js';
import { localZoneRepository } from '../../exploration/services/zoneStore.js';

/** Estado da última publicação (mostrado no painel do admin). */
export const adminPublishTracker = createPublishTracker();

/** Zonas do admin: carrega as publicadas e publica para todos a cada mudança. */
export const adminZoneRepository = createAdminZoneRepository(localZoneRepository, indexedDbWorldCache, firestoreWorldPublisher, adminPublishTracker);

/** Pokémon colocados pelo admin: idem. */
export const adminSpawnStore = createAdminWorldSpawnStore(localAdminSpawnStore, indexedDbWorldCache, firestoreWorldPublisher, adminPublishTracker);
