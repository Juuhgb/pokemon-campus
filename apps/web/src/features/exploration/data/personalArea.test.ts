import { describe, expect, it } from 'vitest';
import { haversineMeters } from '../utils/distance.js';
import { findZoneAt } from '../utils/geofence.js';
import { createMockSpawns } from './mockSpawns.js';
import { parsePersonalArea, PERSONAL_ZONE_ID, personalAreaZone } from './personalArea.js';

const ENV = { VITE_PERSONAL_AREA_LAT: '-23.10', VITE_PERSONAL_AREA_LNG: '-50.36', VITE_PERSONAL_AREA_RADIUS_METERS: '80' };

describe('parsePersonalArea', () => {
  it('fica desativada sem configuração', () => {
    expect(parsePersonalArea({})).toBeNull();
  });

  it('lê coordenadas, raio e nome padrão', () => {
    expect(parsePersonalArea(ENV)).toEqual({ name: 'Minha casa', center: { latitude: -23.1, longitude: -50.36 }, radiusMeters: 80 });
  });

  it('aceita vírgula decimal e usa raio padrão quando inválido', () => {
    const area = parsePersonalArea({ VITE_PERSONAL_AREA_LAT: '-23,1', VITE_PERSONAL_AREA_LNG: '-50,36', VITE_PERSONAL_AREA_RADIUS_METERS: '5' });
    expect(area?.center).toEqual({ latitude: -23.1, longitude: -50.36 });
    expect(area?.radiusMeters).toBe(60);
  });

  it('rejeita coordenadas inválidas', () => {
    expect(parsePersonalArea({ VITE_PERSONAL_AREA_LAT: 'abc', VITE_PERSONAL_AREA_LNG: '-50' })).toBeNull();
    expect(parsePersonalArea({ VITE_PERSONAL_AREA_LAT: '-123', VITE_PERSONAL_AREA_LNG: '-50' })).toBeNull();
  });
});

describe('área pessoal no jogo', () => {
  const area = parsePersonalArea(ENV)!;
  const zone = personalAreaZone(area);

  it('vira uma zona detectável', () => {
    expect(findZoneAt(area.center, [zone])?.id).toBe(PERSONAL_ZONE_ID);
  });

  it('gera três spawns dentro do raio, um capturável perto do centro', () => {
    const now = new Date('2026-11-04T15:10:00.000Z');
    const home = createMockSpawns(now, area).filter((spawn) => spawn.zoneId === PERSONAL_ZONE_ID);
    expect(home).toHaveLength(3);
    const distances = home.map((spawn) => haversineMeters(area.center, spawn));
    expect(distances.every((distance) => distance <= area.radiusMeters)).toBe(true);
    expect(Math.min(...distances)).toBeLessThanOrEqual(30);
  });
});
