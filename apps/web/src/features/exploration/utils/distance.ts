import { distanceInMeters } from '../../../map/distance.js';
import type { GeoPoint } from '../types.js';

/** Haversine (reaproveita a implementação existente em src/map/distance.ts). */
export const haversineMeters: (from: GeoPoint, to: GeoPoint) => number = distanceInMeters;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** Rumo inicial de `from` para `to`, em graus (0 = norte, 90 = leste). */
export function bearingDegrees(from: GeoPoint, to: GeoPoint): number {
  const phi1 = toRadians(from.latitude);
  const phi2 = toRadians(to.latitude);
  const deltaLambda = toRadians(to.longitude - from.longitude);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

/** Desloca um ponto em metros para norte/leste (aproximação local, adequada a distâncias de campus). */
export function offsetByMeters(origin: GeoPoint, northMeters: number, eastMeters: number): GeoPoint {
  const metersPerDegreeLatitude = 111_320;
  const metersPerDegreeLongitude = metersPerDegreeLatitude * Math.cos(toRadians(origin.latitude));
  return {
    latitude: origin.latitude + northMeters / metersPerDegreeLatitude,
    longitude: origin.longitude + eastMeters / metersPerDegreeLongitude,
  };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
