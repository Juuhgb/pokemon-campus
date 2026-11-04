import { describe, expect, it } from 'vitest';
import type { ExplorationSpawn } from '../types.js';
import { offsetByMeters } from './distance.js';
import { ENCOUNTER_RADIUS_METERS, evaluateEncounter, nearbySpawns, spawnTimeStatus } from './encounter.js';

const NOW = new Date('2026-11-04T15:00:00.000Z');
const PLAYER = { latitude: -23.1131197, longitude: -50.3570162 };

function spawnAt(northMeters: number, overrides: Partial<ExplorationSpawn> = {}): ExplorationSpawn {
  const position = offsetByMeters(PLAYER, northMeters, 0);
  return {
    spawnId: `spawn-${northMeters}`,
    speciesId: 'brotinho',
    latitude: position.latitude,
    longitude: position.longitude,
    level: 5,
    rarity: 'common',
    startsAt: '2026-11-04T14:30:00.000Z',
    expiresAt: '2026-11-04T15:30:00.000Z',
    ...overrides,
  };
}

describe('evaluateEncounter', () => {
  it('usa raio de 30 metros', () => {
    expect(ENCOUNTER_RADIUS_METERS).toBe(30);
  });

  it('libera o encontro a até 30 metros', () => {
    const result = evaluateEncounter(spawnAt(10), PLAYER, NOW);
    expect(result.allowed).toBe(true);
    expect(result.distanceMeters).toBeCloseTo(10, 0);
  });

  it('libera no limite (29,9 m)', () => {
    expect(evaluateEncounter(spawnAt(29.9), PLAYER, NOW).allowed).toBe(true);
  });

  it('bloqueia fora do alcance e informa a distância', () => {
    const result = evaluateEncounter(spawnAt(31), PLAYER, NOW);
    expect(result).toMatchObject({ allowed: false, reason: 'out-of-range' });
    expect(result.distanceMeters).toBeCloseTo(31, 0);
  });

  it('bloqueia spawn expirado mesmo dentro do alcance', () => {
    const expired = spawnAt(5, { expiresAt: '2026-11-04T14:59:59.000Z' });
    expect(evaluateEncounter(expired, PLAYER, NOW)).toMatchObject({ allowed: false, reason: 'expired' });
  });

  it('bloqueia exatamente no instante de expiração', () => {
    const expiring = spawnAt(5, { expiresAt: NOW.toISOString() });
    expect(evaluateEncounter(expiring, PLAYER, NOW)).toMatchObject({ allowed: false, reason: 'expired' });
  });

  it('bloqueia spawn que ainda não começou', () => {
    const upcoming = spawnAt(5, { startsAt: '2026-11-04T15:10:00.000Z' });
    expect(evaluateEncounter(upcoming, PLAYER, NOW)).toMatchObject({ allowed: false, reason: 'not-started' });
  });

  it('bloqueia quando a localização está indisponível', () => {
    expect(evaluateEncounter(spawnAt(5), null, NOW)).toEqual({ allowed: false, reason: 'no-location', distanceMeters: null });
  });
});

describe('spawnTimeStatus', () => {
  it('classifica a janela de disponibilidade', () => {
    const spawn = spawnAt(0);
    expect(spawnTimeStatus(spawn, new Date('2026-11-04T14:00:00.000Z'))).toBe('not-started');
    expect(spawnTimeStatus(spawn, NOW)).toBe('active');
    expect(spawnTimeStatus(spawn, new Date('2026-11-04T16:00:00.000Z'))).toBe('expired');
  });
});

describe('nearbySpawns', () => {
  it('ordena por distância, ignora expirados e respeita o raio', () => {
    const spawns = [
      spawnAt(100),
      spawnAt(20),
      spawnAt(10, { spawnId: 'expired', expiresAt: '2026-11-04T14:00:00.000Z' }),
      spawnAt(500),
    ];
    const result = nearbySpawns(spawns, PLAYER, NOW, 250);
    expect(result.map((item) => item.spawn.spawnId)).toEqual(['spawn-20', 'spawn-100']);
  });
});
