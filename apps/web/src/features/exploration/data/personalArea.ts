import type { CampusZone, GeoPoint } from '../types.js';
import { offsetByMeters } from '../utils/distance.js';

/**
 * Área de spawn pessoal (ex.: sua casa), para jogar/testar fora do campus.
 * Configurada só por variáveis de ambiente locais (apps/web/.env.local, ignorado pelo git),
 * para que as coordenadas não vão parar no repositório.
 */
export interface PersonalArea {
  name: string;
  center: GeoPoint;
  radiusMeters: number;
}

export interface PersonalAreaEnv {
  VITE_PERSONAL_AREA_LAT?: string;
  VITE_PERSONAL_AREA_LNG?: string;
  VITE_PERSONAL_AREA_RADIUS_METERS?: string;
  VITE_PERSONAL_AREA_NAME?: string;
}

const DEFAULT_RADIUS_METERS = 60;
export const PERSONAL_ZONE_ID = 'personal-area';

/** Retorna null quando não configurada ou inválida. */
export function parsePersonalArea(env: PersonalAreaEnv): PersonalArea | null {
  const latitude = Number(env.VITE_PERSONAL_AREA_LAT?.trim().replace(',', '.'));
  const longitude = Number(env.VITE_PERSONAL_AREA_LNG?.trim().replace(',', '.'));
  if (!env.VITE_PERSONAL_AREA_LAT || !env.VITE_PERSONAL_AREA_LNG) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  const radius = Number(env.VITE_PERSONAL_AREA_RADIUS_METERS);
  const radiusMeters = Number.isFinite(radius) && radius >= 20 && radius <= 1000 ? radius : DEFAULT_RADIUS_METERS;
  const name = env.VITE_PERSONAL_AREA_NAME?.trim() || 'Minha casa';

  return { name, center: { latitude, longitude }, radiusMeters };
}

/** Polígono de 16 lados aproximando o círculo da área. */
export function personalAreaZone(area: PersonalArea): CampusZone {
  const sides = 16;
  const boundary = Array.from({ length: sides }, (_, index) => {
    const angle = (2 * Math.PI * index) / sides;
    return offsetByMeters(area.center, area.radiusMeters * Math.cos(angle), area.radiusMeters * Math.sin(angle));
  });
  return {
    id: PERSONAL_ZONE_ID,
    slug: 'area-pessoal',
    name: area.name,
    color: '#fb7185',
    boundary,
    isDemo: true,
  };
}

export const PERSONAL_AREA: PersonalArea | null = parsePersonalArea(import.meta.env);
