import type { CampusZone, GeoPoint } from '../types.js';

/**
 * Ray casting em coordenadas latitude/longitude.
 * Adequado para polígonos pequenos (campus); não trata o antimeridiano.
 * Pontos exatamente na borda podem cair de qualquer lado.
 */
export function isPointInPolygon(point: GeoPoint, polygon: readonly GeoPoint[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const crosses = (a.latitude > y) !== (b.latitude > y)
      && x < ((b.longitude - a.longitude) * (y - a.latitude)) / (b.latitude - a.latitude) + a.longitude;
    if (crosses) inside = !inside;
  }

  return inside;
}

/** Primeira zona que contém o ponto, ou null quando o jogador está fora de todas. */
export function findZoneAt(point: GeoPoint, zones: readonly CampusZone[]): CampusZone | null {
  return zones.find((zone) => isPointInPolygon(point, zone.boundary)) ?? null;
}

export function polygonCentroid(polygon: readonly GeoPoint[]): GeoPoint {
  const sum = polygon.reduce(
    (acc, vertex) => ({ latitude: acc.latitude + vertex.latitude, longitude: acc.longitude + vertex.longitude }),
    { latitude: 0, longitude: 0 },
  );
  return { latitude: sum.latitude / polygon.length, longitude: sum.longitude / polygon.length };
}
