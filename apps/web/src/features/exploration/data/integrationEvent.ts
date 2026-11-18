import type { ExplorationSpawn } from '../types.js';
import { randomPointInPolygon, seededRandom } from '../utils/zoneGeometry.js';
import { CAMPUS_ZONES } from './campusZones.js';

// Uma edição única, com os mesmos setores e coordenadas em todos os aparelhos.
const sectors = [...CAMPUS_ZONES];
const draw = seededRandom('uenp-xii-integracao-2026');
export const appearances = [
  '2026-11-18T17:00:00-03:00',
  '2026-11-19T09:00:00-03:00',
  '2026-11-19T13:00:00-03:00',
].map((start) => {
  const [sector] = sectors.splice(Math.floor(draw() * sectors.length), 1);
  if (!sector) throw new Error('Faltou setor para o Evento de Integração');
  const minuteOffset = Math.floor(seededRandom(`integracao-xii-horario:${start}`)() * 31);
  const begins = Date.parse(start) + minuteOffset * 60_000;
  const ends = begins + 30 * 60_000;
  const spawn: ExplorationSpawn = {
    spawnId: `integracao-xii-jirachi-${begins}`,
    speciesId: 'jirachi', rarity: 'legendary', level: 30, zoneId: sector.id,
    ...randomPointInPolygon(sector.boundary, draw),
    startsAt: new Date(begins).toISOString(), expiresAt: new Date(ends).toISOString(),
  };
  return { begins, ends, sector: sector.name, spawn };
});

export function integrationAppearance(now: Date) {
  const time = now.getTime();
  return appearances.find(({ begins, ends }) => begins <= time && time < ends);
}
