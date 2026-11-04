import type { Zone } from '@pokemon-campus/shared';
import { DEFAULT_ZONES } from '../data/defaultZones.js';
import type { CampusZone } from '../types.js';
import { parseZones } from '../utils/zoneEdits.js';

/** Porta de leitura das zonas. Hoje: dados locais; futuro: GET /api/v1/zones. */
export interface ZoneRepository {
  listZones(): Promise<CampusZone[]>;
}

/** Repositório que também aceita gravação (usado pelo editor de zonas). */
export interface EditableZoneRepository extends ZoneRepository {
  saveZones(zones: CampusZone[]): Promise<void>;
  /** Descarta as edições locais e volta às zonas padrão. */
  reset(): Promise<CampusZone[]>;
}

/** Armazenamento bruto das zonas editadas (IndexedDB no app, memória nos testes). */
export interface ZoneStore {
  read(): Promise<unknown>;
  write(value: unknown): Promise<void>;
  clear(): Promise<void>;
}

export function createStaticZoneRepository(zones: CampusZone[] = DEFAULT_ZONES): ZoneRepository {
  return {
    async listZones() {
      return zones;
    },
  };
}

export function createInMemoryZoneStore(initial: unknown = null): ZoneStore {
  let stored = initial;
  return {
    async read() {
      return stored;
    },
    async write(value) {
      stored = value;
    },
    async clear() {
      stored = null;
    },
  };
}

/** Zonas editadas localmente têm prioridade; dados salvos inválidos são ignorados. */
export function createEditableZoneRepository(store: ZoneStore, defaults: CampusZone[] = DEFAULT_ZONES): EditableZoneRepository {
  return {
    async listZones() {
      const saved = await store.read().catch(() => null);
      const parsed = saved === null || saved === undefined ? null : parseZones(saved);
      return parsed ?? defaults;
    },
    async saveZones(zones) {
      await store.write({ version: 1, zones });
    },
    async reset() {
      await store.clear();
      return defaults;
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
