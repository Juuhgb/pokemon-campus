import type { EncounterEligibility, ExplorationSpawn, GeoPoint } from '../types.js';
import { haversineMeters } from './distance.js';

/** Raio máximo para iniciar um encontro. O backend repete a validação. */
export const ENCOUNTER_RADIUS_METERS = 30;

/** Até essa distância o jogador enxerga o Pokémon no mapa; mais longe ele fica escondido. */
export const VISIBILITY_RADIUS_METERS = 80;

export type SpawnTimeStatus = 'not-started' | 'active' | 'expired';

export function spawnTimeStatus(spawn: Pick<ExplorationSpawn, 'startsAt' | 'expiresAt'>, now: Date): SpawnTimeStatus {
  const time = now.getTime();
  if (time < Date.parse(spawn.startsAt)) return 'not-started';
  if (time >= Date.parse(spawn.expiresAt)) return 'expired';
  return 'active';
}

export function isSpawnActive(spawn: Pick<ExplorationSpawn, 'startsAt' | 'expiresAt'>, now: Date): boolean {
  return spawnTimeStatus(spawn, now) === 'active';
}

export function spawnPosition(spawn: Pick<ExplorationSpawn, 'latitude' | 'longitude'>): GeoPoint {
  return { latitude: spawn.latitude, longitude: spawn.longitude };
}

/**
 * Decide, no cliente, se o botão "Batalhar / Capturar" pode ser habilitado.
 * Ordem: sem localização → janela de tempo → distância.
 */
export function evaluateEncounter(
  spawn: ExplorationSpawn,
  player: GeoPoint | null,
  now: Date,
  radiusMeters: number = ENCOUNTER_RADIUS_METERS,
): EncounterEligibility {
  const distanceMeters = player ? haversineMeters(player, spawnPosition(spawn)) : null;

  if (player === null || distanceMeters === null) return { allowed: false, reason: 'no-location', distanceMeters: null };

  const timeStatus = spawnTimeStatus(spawn, now);
  if (timeStatus !== 'active') return { allowed: false, reason: timeStatus, distanceMeters };

  if (distanceMeters > radiusMeters) return { allowed: false, reason: 'out-of-range', distanceMeters };

  return { allowed: true, distanceMeters };
}

export interface NearbySpawn {
  spawn: ExplorationSpawn;
  distanceMeters: number;
}

/** Spawns ativos ordenados por distância, opcionalmente limitados a um raio. */
export function nearbySpawns(
  spawns: readonly ExplorationSpawn[],
  player: GeoPoint,
  now: Date,
  maxDistanceMeters = Number.POSITIVE_INFINITY,
): NearbySpawn[] {
  return spawns
    .filter((spawn) => isSpawnActive(spawn, now))
    .map((spawn) => ({ spawn, distanceMeters: haversineMeters(player, spawnPosition(spawn)) }))
    .filter((item) => item.distanceMeters <= maxDistanceMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
