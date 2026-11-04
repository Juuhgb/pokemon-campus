import type { Zone } from '@pokemon-campus/shared';
import { CAMPUS_ZONES } from '../data/campusZones.js';
import { PERSONAL_AREA, personalAreaZone } from '../data/personalArea.js';
import type { CampusZone } from '../types.js';

/** Porta de leitura das zonas. Hoje: dados locais; futuro: GET /api/v1/zones. */
export interface ZoneRepository {
  listZones(): Promise<CampusZone[]>;
}

const DEFAULT_ZONES: CampusZone[] = PERSONAL_AREA ? [...CAMPUS_ZONES, personalAreaZone(PERSONAL_AREA)] : CAMPUS_ZONES;

export function createStaticZoneRepository(zones: CampusZone[] = DEFAULT_ZONES): ZoneRepository {
  return {
    async listZones() {
      return zones;
    },
  };
}

const FALLBACK_COLORS = ['#38bdf8', '#4ade80', '#f472b6', '#fbbf24', '#a78bfa', '#fb7185'];

/** Adapta `Zone` do contrato compartilhado. Zonas do servidor são consideradas verificadas. */
export function fromSharedZone(zone: Zone, index = 0): CampusZone {
  return {
    id: zone.id,
    slug: zone.slug,
    name: zone.name,
    color: FALLBACK_COLORS[index % FALLBACK_COLORS.length]!,
    boundary: zone.boundary,
    isDemo: false,
  };
}
