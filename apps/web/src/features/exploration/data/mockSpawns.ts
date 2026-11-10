import type { CampusZone, ExplorationSpawn, GeoPoint, Rarity } from '../types.js';
import { SPECIES } from '../../catalog/species.js';
import { offsetByMeters } from '../utils/distance.js';
import { interiorPoint, polygonAreaSquareMeters, randomPointInPolygon, seededRandom } from '../utils/zoneGeometry.js';
import { DEFAULT_ZONES } from './defaultZones.js';

/** Duração de cada "rodada" de spawns simulados. */
export const MOCK_SLOT_MS = 30 * 60 * 1000;

/** Uma zona recebe 1 spawn a cada ~4.000 m², entre 1 e 4. */
export function spawnCountForZone(zone: CampusZone): number {
  return Math.min(4, Math.max(1, Math.round(polygonAreaSquareMeters(zone.boundary) / 4_000) + 1));
}

/** Espécies que podem aparecer em cada raridade (todas as do catálogo, na ordem dele). */
const SPECIES_BY_RARITY: Record<Rarity, string[]> = {
  common: SPECIES.filter((species) => species.rarity === 'common').map((species) => species.id),
  uncommon: SPECIES.filter((species) => species.rarity === 'uncommon').map((species) => species.id),
  rare: SPECIES.filter((species) => species.rarity === 'rare').map((species) => species.id),
  legendary: SPECIES.filter((species) => species.rarity === 'legendary').map((species) => species.id),
};

const LEVEL_RANGE: Record<Rarity, [number, number]> = {
  common: [2, 8],
  uncommon: [6, 14],
  rare: [12, 22],
  legendary: [25, 35],
};

function pickRarity(roll: number): Rarity {
  if (roll < 0.6) return 'common';
  if (roll < 0.86) return 'uncommon';
  if (roll < 0.97) return 'rare';
  return 'legendary';
}

function buildSpawn(
  spawnId: string,
  position: GeoPoint,
  random: () => number,
  window: { startsAt: number; expiresAt: number },
  zoneId?: string,
): ExplorationSpawn {
  const rarity = pickRarity(random());
  const species = SPECIES_BY_RARITY[rarity];
  const [minLevel, maxLevel] = LEVEL_RANGE[rarity];
  const spawn: ExplorationSpawn = {
    spawnId,
    speciesId: species[Math.floor(random() * species.length)]!,
    latitude: Number(position.latitude.toFixed(7)),
    longitude: Number(position.longitude.toFixed(7)),
    level: minLevel + Math.floor(random() * (maxLevel - minLevel + 1)),
    rarity,
    startsAt: new Date(window.startsAt).toISOString(),
    expiresAt: new Date(window.expiresAt).toISOString(),
  };
  if (zoneId) spawn.zoneId = zoneId;
  return spawn;
}

/**
 * Gera spawns simulados dentro de cada zona para o instante `now`.
 * - Posições, espécies e níveis derivam de (zona, rodada), então todos os jogadores
 *   com as mesmas zonas veem os mesmos spawns.
 * - O primeiro spawn de cada zona fica no seu ponto central (fácil de testar).
 * - Dois spawns extras perto da primeira zona demonstram "expirado" e "ainda não começou".
 * Se a zona mudar de formato no editor, os spawns acompanham.
 */
export function createMockSpawns(now: Date = new Date(), zones: readonly CampusZone[] = DEFAULT_ZONES): ExplorationSpawn[] {
  const slot = Math.floor(now.getTime() / MOCK_SLOT_MS);
  const slotStart = slot * MOCK_SLOT_MS;
  const current = { startsAt: slotStart, expiresAt: slotStart + 2 * MOCK_SLOT_MS };
  const spawns: ExplorationSpawn[] = [];

  for (const zone of zones) {
    if (zone.boundary.length < 3) continue;
    const random = seededRandom(`${zone.id}:${slot}`);
    const count = spawnCountForZone(zone);
    for (let index = 0; index < count; index += 1) {
      const position = index === 0 ? interiorPoint(zone.boundary) : randomPointInPolygon(zone.boundary, random);
      spawns.push(buildSpawn(`mock-${slot}-${zone.id}-${index}`, position, random, current, zone.id));
    }
  }

  const first = zones.find((zone) => zone.boundary.length >= 3);
  if (first) {
    const anchor = interiorPoint(first.boundary);
    const random = seededRandom(`${first.id}:${slot}:rules`);
    spawns.push(buildSpawn(`mock-${slot}-expired`, offsetByMeters(anchor, 12, -8), random, {
      startsAt: slotStart - 2 * MOCK_SLOT_MS,
      expiresAt: slotStart - 1,
    }));
    spawns.push(buildSpawn(`mock-${slot}-upcoming`, offsetByMeters(anchor, -12, 8), random, {
      startsAt: slotStart + 2 * MOCK_SLOT_MS,
      expiresAt: slotStart + 4 * MOCK_SLOT_MS,
    }));
  }

  return spawns;
}
