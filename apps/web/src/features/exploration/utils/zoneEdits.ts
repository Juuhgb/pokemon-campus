import { z } from 'zod';
import type { CampusZone, GeoPoint } from '../types.js';
import { midpoint, translatePolygon } from './zoneGeometry.js';

/**
 * Operações puras de edição de zonas. Toda edição marca a zona como `isDemo: false`,
 * pois passa a refletir o desenho de quem administra o mapa.
 */

const MIN_VERTICES = 3;

function updateZone(zones: readonly CampusZone[], zoneId: string, change: (zone: CampusZone) => CampusZone): CampusZone[] {
  return zones.map((zone) => (zone.id === zoneId ? { ...change(zone), isDemo: false } : zone));
}

export function moveVertex(zones: readonly CampusZone[], zoneId: string, index: number, point: GeoPoint): CampusZone[] {
  return updateZone(zones, zoneId, (zone) => ({
    ...zone,
    boundary: zone.boundary.map((vertex, i) => (i === index ? point : vertex)),
  }));
}

/** Insere um vértice entre `afterIndex` e o próximo (no ponto médio, se `point` não for dado). */
export function insertVertex(zones: readonly CampusZone[], zoneId: string, afterIndex: number, point?: GeoPoint): CampusZone[] {
  return updateZone(zones, zoneId, (zone) => {
    const a = zone.boundary[afterIndex];
    const b = zone.boundary[(afterIndex + 1) % zone.boundary.length];
    if (!a || !b) return zone;
    const boundary = [...zone.boundary];
    boundary.splice(afterIndex + 1, 0, point ?? midpoint(a, b));
    return { ...zone, boundary };
  });
}

/** Remove um vértice; ignorado se o polígono ficaria com menos de 3. */
export function removeVertex(zones: readonly CampusZone[], zoneId: string, index: number): CampusZone[] {
  const target = zones.find((zone) => zone.id === zoneId);
  if (!target || target.boundary.length <= MIN_VERTICES) return [...zones];
  return updateZone(zones, zoneId, (zone) => ({ ...zone, boundary: zone.boundary.filter((_, i) => i !== index) }));
}

export function translateZone(zones: readonly CampusZone[], zoneId: string, deltaLatitude: number, deltaLongitude: number): CampusZone[] {
  return updateZone(zones, zoneId, (zone) => ({ ...zone, boundary: translatePolygon(zone.boundary, deltaLatitude, deltaLongitude) }));
}

export function renameZone(zones: readonly CampusZone[], zoneId: string, name: string): CampusZone[] {
  return updateZone(zones, zoneId, (zone) => ({ ...zone, name, slug: slugify(name) || zone.slug }));
}

export function recolorZone(zones: readonly CampusZone[], zoneId: string, color: string): CampusZone[] {
  return updateZone(zones, zoneId, (zone) => ({ ...zone, color }));
}

export function deleteZone(zones: readonly CampusZone[], zoneId: string): CampusZone[] {
  return zones.filter((zone) => zone.id !== zoneId);
}

const PALETTE = ['#38bdf8', '#4ade80', '#f472b6', '#fbbf24', '#a78bfa', '#fb7185', '#2dd4bf', '#f97316'];

export function createZone(
  zones: readonly CampusZone[],
  boundary: GeoPoint[],
  name: string,
  id: string = crypto.randomUUID(),
): CampusZone[] {
  if (boundary.length < MIN_VERTICES) throw new RangeError('Uma zona precisa de pelo menos 3 pontos.');
  const zone: CampusZone = {
    id,
    slug: slugify(name) || `zona-${zones.length + 1}`,
    name,
    color: PALETTE[zones.length % PALETTE.length]!,
    boundary,
    isDemo: false,
  };
  return [...zones, zone];
}

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

const GeoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const CampusZoneSchema = z.object({
  id: z.string().min(1),
  slug: z.string(),
  name: z.string().max(80).transform((name) => name.trim() || 'Zona sem nome'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  isDemo: z.boolean().default(false),
  boundary: z.array(GeoPointSchema).min(MIN_VERTICES),
});

const ZonesFileSchema = z.union([
  z.array(CampusZoneSchema),
  z.object({ version: z.literal(1), zones: z.array(CampusZoneSchema) }),
]);

/** Valida zonas importadas/salvas. Aceita um array ou `{ version: 1, zones }`. */
export function parseZones(value: unknown): CampusZone[] | null {
  const result = ZonesFileSchema.safeParse(value);
  if (!result.success) return null;
  const zones = Array.isArray(result.data) ? result.data : result.data.zones;
  const ids = new Set(zones.map((zone) => zone.id));
  return ids.size === zones.length ? zones : null;
}

export function serializeZones(zones: readonly CampusZone[]): string {
  return JSON.stringify({ version: 1, zones }, null, 2);
}
