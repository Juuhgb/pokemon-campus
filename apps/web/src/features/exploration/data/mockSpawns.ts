import type { ExplorationSpawn, GeoPoint, Rarity } from '../types.js';
import { offsetByMeters } from '../utils/distance.js';
import { CAMPUS_CENTER, CAMPUS_ZONES } from './campusZones.js';
import { polygonCentroid } from '../utils/geofence.js';

/** Duração de cada "rodada" de spawns simulados. */
export const MOCK_SLOT_MS = 30 * 60 * 1000;

interface MockSpawnSeed {
  key: string;
  speciesId: string;
  level: number;
  rarity: Rarity;
  anchor: GeoPoint;
  northMeters: number;
  eastMeters: number;
  zoneId?: string;
  /** Deslocamento da janela em relação à rodada atual. */
  window?: 'current' | 'expired' | 'upcoming';
}

const zoneCenter = (slug: string): { anchor: GeoPoint; zoneId: string } => {
  const zone = CAMPUS_ZONES.find((item) => item.slug === slug);
  if (!zone) throw new Error(`Zona simulada não encontrada: ${slug}`);
  return { anchor: polygonCentroid(zone.boundary), zoneId: zone.id };
};

const SEEDS: MockSpawnSeed[] = [
  { key: 'center-a', speciesId: 'brotinho', level: 4, rarity: 'common', anchor: CAMPUS_CENTER, northMeters: 18, eastMeters: 8 },
  { key: 'center-b', speciesId: 'gotinha', level: 6, rarity: 'common', anchor: CAMPUS_CENTER, northMeters: -60, eastMeters: 45 },
  { key: 'cc', speciesId: 'faiscao', level: 12, rarity: 'uncommon', ...zoneCenter('ciencia-da-computacao'), northMeters: 10, eastMeters: -15 },
  { key: 'bio', speciesId: 'coruja', level: 9, rarity: 'uncommon', ...zoneCenter('biologia'), northMeters: -20, eastMeters: 5 },
  { key: 'enf', speciesId: 'gotinha', level: 7, rarity: 'common', ...zoneCenter('enfermagem'), northMeters: 0, eastMeters: 0 },
  { key: 'vet', speciesId: 'brasinha', level: 15, rarity: 'rare', ...zoneCenter('medicina-veterinaria'), northMeters: 15, eastMeters: 20 },
  { key: 'agro', speciesId: 'pedregulho', level: 11, rarity: 'uncommon', ...zoneCenter('agronomia'), northMeters: -30, eastMeters: -20 },
  { key: 'agro-legend', speciesId: 'aurora', level: 30, rarity: 'legendary', ...zoneCenter('agronomia'), northMeters: 40, eastMeters: 50 },
  { key: 'expired', speciesId: 'brotinho', level: 3, rarity: 'common', anchor: CAMPUS_CENTER, northMeters: 5, eastMeters: -12, window: 'expired' },
  { key: 'upcoming', speciesId: 'faiscao', level: 8, rarity: 'uncommon', anchor: CAMPUS_CENTER, northMeters: -10, eastMeters: -25, window: 'upcoming' },
];

/**
 * Gera spawns simulados para o instante `now`.
 * As janelas são alinhadas a rodadas fixas de 30 min e os IDs derivam da rodada,
 * então dois jogadores (ou dispositivos) no mesmo horário veem exatamente os mesmos spawns.
 */
export function createMockSpawns(now: Date = new Date()): ExplorationSpawn[] {
  const slot = Math.floor(now.getTime() / MOCK_SLOT_MS);
  const slotStart = slot * MOCK_SLOT_MS;

  return SEEDS.map((seed) => {
    const position = offsetByMeters(seed.anchor, seed.northMeters, seed.eastMeters);
    const window = seed.window ?? 'current';
    const startsAt = window === 'upcoming' ? slotStart + 2 * MOCK_SLOT_MS : window === 'expired' ? slotStart - 2 * MOCK_SLOT_MS : slotStart;
    const expiresAt = window === 'expired' ? slotStart - 1 : startsAt + 2 * MOCK_SLOT_MS;

    const spawn: ExplorationSpawn = {
      spawnId: `mock-${slot}-${seed.key}`,
      speciesId: seed.speciesId,
      latitude: Number(position.latitude.toFixed(7)),
      longitude: Number(position.longitude.toFixed(7)),
      level: seed.level,
      rarity: seed.rarity,
      startsAt: new Date(startsAt).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
    };
    if (seed.zoneId) spawn.zoneId = seed.zoneId;
    return spawn;
  });
}
