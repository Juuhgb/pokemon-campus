/** API pública do módulo de exploração (mapa, GPS, spawns e proximidade). */
export { ExplorationPage } from './pages/ExplorationPage.js';
export type {
  CampusZone,
  EncounterBlockReason,
  EncounterEligibility,
  EncounterStartHandler,
  EncounterStartRequest,
  ExplorationSpawn,
  GeoPoint,
  LocationError,
  LocationFix,
  LocationSource,
  Rarity,
} from './types.js';
export { ENCOUNTER_RADIUS_METERS, evaluateEncounter, isSpawnActive, nearbySpawns, spawnTimeStatus } from './utils/encounter.js';
export { haversineMeters, bearingDegrees, formatDistance } from './utils/distance.js';
export { findZoneAt, isPointInPolygon } from './utils/geofence.js';
export { createBrowserLocationProvider, type LocationProvider } from './services/location.js';
export {
  createLocalFirstSpawnRepository,
  createMockSpawnRepository,
  fromSharedSpawn,
  type SpawnCache,
  type SpawnQuery,
  type SpawnRepository,
} from './services/spawnRepository.js';
export { createStaticZoneRepository, fromSharedZone, type ZoneRepository } from './services/zoneRepository.js';
