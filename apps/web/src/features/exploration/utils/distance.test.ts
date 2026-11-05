import { describe, expect, it } from 'vitest';
import { bearingDegrees, formatDistance, haversineMeters, offsetByMeters } from './distance.js';

const CAMPUS = { latitude: -23.1131197, longitude: -50.3570162 };

describe('haversineMeters', () => {
  it('retorna zero para o mesmo ponto', () => {
    expect(haversineMeters(CAMPUS, CAMPUS)).toBe(0);
  });

  it('calcula ~111,2 km para 1 grau de latitude', () => {
    const distance = haversineMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(distance).toBeCloseTo(111_195, -1);
  });

  it('calcula a distância entre duas cidades conhecidas (Bandeirantes → Londrina ≈ 85 km)', () => {
    const londrina = { latitude: -23.3045, longitude: -51.1696 };
    const distance = haversineMeters(CAMPUS, londrina);
    expect(distance).toBeGreaterThan(80_000);
    expect(distance).toBeLessThan(90_000);
  });

  it('é simétrica', () => {
    const other = { latitude: -23.112, longitude: -50.355 };
    expect(haversineMeters(CAMPUS, other)).toBeCloseTo(haversineMeters(other, CAMPUS), 6);
  });

  it('concorda com o deslocamento local em metros em distâncias de campus', () => {
    const moved = offsetByMeters(CAMPUS, 30, 0);
    expect(haversineMeters(CAMPUS, moved)).toBeCloseTo(30, 0);
    const diagonal = offsetByMeters(CAMPUS, 40, 30);
    expect(haversineMeters(CAMPUS, diagonal)).toBeCloseTo(50, 0);
  });
});

describe('bearingDegrees', () => {
  it('aponta para norte e leste', () => {
    expect(bearingDegrees(CAMPUS, offsetByMeters(CAMPUS, 100, 0))).toBeCloseTo(0, 0);
    expect(bearingDegrees(CAMPUS, offsetByMeters(CAMPUS, 0, 100))).toBeCloseTo(90, 0);
    expect(bearingDegrees(CAMPUS, offsetByMeters(CAMPUS, -100, 0))).toBeCloseTo(180, 0);
  });
});

describe('formatDistance', () => {
  it('formata metros e quilômetros', () => {
    expect(formatDistance(12.4)).toBe('12 m');
    expect(formatDistance(1530)).toBe('1,5 km');
  });
});
