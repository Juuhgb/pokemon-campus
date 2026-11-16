import type { CampusZone, ExplorationSpawn, GeoPoint, Rarity } from '../types.js';
import { SPECIES, speciesForZone, type SpeciesInfo } from '../../catalog/species.js';
import { offsetByMeters } from '../utils/distance.js';
import { interiorPoint, polygonAreaSquareMeters, randomPointInPolygon, seededRandom } from '../utils/zoneGeometry.js';
import { DEFAULT_ZONES } from './defaultZones.js';

/** Duração de cada "rodada" de spawns simulados. */
export const MOCK_SLOT_MS = 30 * 60 * 1000;

/** Uma zona recebe 1 spawn a cada ~4.000 m², entre 1 e 4. */
export function spawnCountForZone(zone: CampusZone): number {
  return Math.min(4, Math.max(1, Math.round(polygonAreaSquareMeters(zone.boundary) / 4_000) + 1));
}

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];

/**
 * Sorteia a espécie entre as que moram na zona (species.ts → HABITATS). Se a zona não tem
 * nenhuma da raridade sorteada (ex.: lendário fora da Computação), usa a raridade mais
 * próxima abaixo dela (e, se não houver, acima).
 */
function pickSpecies(pool: readonly SpeciesInfo[], wanted: Rarity, roll: number): SpeciesInfo {
  const index = RARITY_ORDER.indexOf(wanted);
  const order = [...RARITY_ORDER.slice(0, index + 1).reverse(), ...RARITY_ORDER.slice(index + 1)];
  for (const rarity of order) {
    const candidates = pool.filter((species) => species.rarity === rarity);
    if (candidates.length > 0) return candidates[Math.floor(roll * candidates.length)]!;
  }
  return SPECIES[Math.floor(roll * SPECIES.length)]!;
}

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
  pool: readonly SpeciesInfo[],
  zoneId?: string,
): ExplorationSpawn {
  const species = pickSpecies(pool, pickRarity(random()), random());
  const rarity = species.rarity;
  const [minLevel, maxLevel] = LEVEL_RANGE[rarity];
  const spawn: ExplorationSpawn = {
    spawnId,
    speciesId: species.id,
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
    const pool = speciesForZone(zone.slug);
    for (let index = 0; index < count; index += 1) {
      const position = index === 0 ? interiorPoint(zone.boundary) : randomPointInPolygon(zone.boundary, random);
      spawns.push(buildSpawn(`mock-${slot}-${zone.id}-${index}`, position, random, current, pool, zone.id));
    }
  }

  const first = zones.find((zone) => zone.boundary.length >= 3);
  if (first) {
    const anchor = interiorPoint(first.boundary);
    const random = seededRandom(`${first.id}:${slot}:rules`);
    const pool = speciesForZone(first.slug);
    spawns.push(buildSpawn(`mock-${slot}-expired`, offsetByMeters(anchor, 12, -8), random, {
      startsAt: slotStart - 2 * MOCK_SLOT_MS,
      expiresAt: slotStart - 1,
    }, pool));
    spawns.push(buildSpawn(`mock-${slot}-upcoming`, offsetByMeters(anchor, -12, 8), random, {
      startsAt: slotStart + 2 * MOCK_SLOT_MS,
      expiresAt: slotStart + 4 * MOCK_SLOT_MS,
    }, pool));
  }

  return spawns;
}
