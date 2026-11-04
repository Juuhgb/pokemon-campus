import { describe, expect, it } from 'vitest';
import { CAMPUS_CENTER, CAMPUS_ZONES } from '../data/campusZones.js';
import type { CampusZone } from '../types.js';
import { findZoneAt, isPointInPolygon, polygonCentroid } from './geofence.js';

const square = [
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 1 },
  { latitude: 1, longitude: 1 },
  { latitude: 1, longitude: 0 },
];

describe('isPointInPolygon', () => {
  it('detecta ponto dentro', () => {
    expect(isPointInPolygon({ latitude: 0.5, longitude: 0.5 }, square)).toBe(true);
  });

  it('detecta ponto fora', () => {
    expect(isPointInPolygon({ latitude: 1.5, longitude: 0.5 }, square)).toBe(false);
    expect(isPointInPolygon({ latitude: 0.5, longitude: -0.1 }, square)).toBe(false);
  });

  it('funciona com polígono côncavo (formato de L)', () => {
    const lShape = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 2 },
      { latitude: 1, longitude: 2 },
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 1 },
      { latitude: 2, longitude: 0 },
    ];
    expect(isPointInPolygon({ latitude: 0.5, longitude: 1.5 }, lShape)).toBe(true);
    expect(isPointInPolygon({ latitude: 1.5, longitude: 1.5 }, lShape)).toBe(false);
  });

  it('funciona com coordenadas negativas (hemisfério sul/oeste)', () => {
    const zone = CAMPUS_ZONES[0]!;
    expect(isPointInPolygon(polygonCentroid(zone.boundary), zone.boundary)).toBe(true);
  });

  it('rejeita polígonos com menos de 3 vértices', () => {
    expect(isPointInPolygon({ latitude: 0, longitude: 0 }, square.slice(0, 2))).toBe(false);
  });
});

describe('findZoneAt', () => {
  it('identifica cada uma das cinco zonas pelo seu centro', () => {
    expect(CAMPUS_ZONES).toHaveLength(5);
    for (const zone of CAMPUS_ZONES) {
      expect(findZoneAt(polygonCentroid(zone.boundary), CAMPUS_ZONES)?.id).toBe(zone.id);
    }
  });

  it('retorna null quando o jogador está fora de todas as zonas', () => {
    expect(findZoneAt(CAMPUS_CENTER, CAMPUS_ZONES)).toBeNull();
  });

  it('as zonas atuais são marcadas como demonstração', () => {
    expect(CAMPUS_ZONES.every((zone: CampusZone) => zone.isDemo)).toBe(true);
  });
});
