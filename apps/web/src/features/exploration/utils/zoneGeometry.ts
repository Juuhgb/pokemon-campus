import type { GeoPoint } from '../types.js';
import { isPointInPolygon, polygonCentroid } from './geofence.js';

const METERS_PER_DEGREE_LATITUDE = 111_320;

/** Área aproximada (m²) pela fórmula do laço, em projeção local. */
export function polygonAreaSquareMeters(polygon: readonly GeoPoint[]): number {
  if (polygon.length < 3) return 0;
  const origin = polygon[0]!;
  const metersPerDegreeLongitude = METERS_PER_DEGREE_LATITUDE * Math.cos((origin.latitude * Math.PI) / 180);
  const projected = polygon.map((point) => ({
    x: (point.longitude - origin.longitude) * metersPerDegreeLongitude,
    y: (point.latitude - origin.latitude) * METERS_PER_DEGREE_LATITUDE,
  }));
  let doubled = 0;
  for (let i = 0; i < projected.length; i += 1) {
    const a = projected[i]!;
    const b = projected[(i + 1) % projected.length]!;
    doubled += a.x * b.y - b.x * a.y;
  }
  return Math.abs(doubled) / 2;
}

export function boundingBox(polygon: readonly GeoPoint[]) {
  const latitudes = polygon.map((point) => point.latitude);
  const longitudes = polygon.map((point) => point.longitude);
  return {
    minLatitude: Math.min(...latitudes),
    maxLatitude: Math.max(...latitudes),
    minLongitude: Math.min(...longitudes),
    maxLongitude: Math.max(...longitudes),
  };
}

/**
 * Ponto aleatório dentro do polígono por amostragem por rejeição.
 * `random` deve retornar valores em [0, 1). Retorna o centróide se não achar após `attempts`.
 */
export function randomPointInPolygon(polygon: readonly GeoPoint[], random: () => number, attempts = 200): GeoPoint {
  const box = boundingBox(polygon);
  for (let i = 0; i < attempts; i += 1) {
    const candidate = {
      latitude: box.minLatitude + random() * (box.maxLatitude - box.minLatitude),
      longitude: box.minLongitude + random() * (box.maxLongitude - box.minLongitude),
    };
    if (isPointInPolygon(candidate, polygon)) return candidate;
  }
  return polygonCentroid(polygon);
}

/** Ponto representativo: o centróide quando cai dentro; senão, um ponto interno determinístico. */
export function interiorPoint(polygon: readonly GeoPoint[]): GeoPoint {
  const centroid = polygonCentroid(polygon);
  if (isPointInPolygon(centroid, polygon)) return centroid;
  return randomPointInPolygon(polygon, seededRandom(JSON.stringify(polygon)));
}

export function midpoint(a: GeoPoint, b: GeoPoint): GeoPoint {
  return { latitude: (a.latitude + b.latitude) / 2, longitude: (a.longitude + b.longitude) / 2 };
}

export function translatePolygon(polygon: readonly GeoPoint[], deltaLatitude: number, deltaLongitude: number): GeoPoint[] {
  return polygon.map((point) => ({ latitude: point.latitude + deltaLatitude, longitude: point.longitude + deltaLongitude }));
}

/** PRNG determinística (FNV-1a + mulberry32). Mesma semente → mesma sequência em qualquer dispositivo. */
export function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619) >>> 0;
  }
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
