import type { CampusZone } from '../types.js';
import { CAMPUS_ZONES } from './campusZones.js';
import { PERSONAL_AREA, personalAreaZone } from './personalArea.js';

/** Zonas usadas quando o editor ainda não salvou nenhuma versão local. */
export const DEFAULT_ZONES: CampusZone[] = PERSONAL_AREA ? [...CAMPUS_ZONES, personalAreaZone(PERSONAL_AREA)] : CAMPUS_ZONES;
