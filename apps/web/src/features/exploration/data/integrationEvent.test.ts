import { describe, expect, it } from 'vitest';
import { getSpecies, speciesForZone } from '../../catalog/species.js';
import { offsetByMeters } from '../utils/distance.js';
import { evaluateEncounter, nearbySpawns } from '../utils/encounter.js';
import { isPointInPolygon } from '../utils/geofence.js';
import { CAMPUS_ZONES } from './campusZones.js';
import { appearances, integrationAppearance, JIRACHI_MAX_LEVEL, JIRACHI_MIN_LEVEL } from './integrationEvent.js';

describe('Jirachi no XII Evento de Integração', () => {
  it.each(['2026-11-18T20:00Z', '2026-11-19T12:00Z', '2026-11-19T16:00Z'])(
    'mantém um único encontro de meia hora dentro da faixa iniciada em %s', (utc) => {
      const start = Date.parse(utc);
      expect(integrationAppearance(new Date(start - 1))).toBeUndefined();
      const samples = Array.from({ length: 60 }, (_, minute) => integrationAppearance(new Date(start + minute * 60_000)));
      const active = samples.filter((sample) => sample !== undefined);
      expect(active).toHaveLength(30);
      const event = active[0]!;
      expect(active.every((sample) => sample === event)).toBe(true);
      expect(event.ends - event.begins).toBe(30 * 60_000);
      expect(integrationAppearance(new Date(event.begins - 1))).toBeUndefined();
      expect(event.spawn.speciesId).toBe('jirachi');
      const sector = CAMPUS_ZONES.find((zone) => zone.id === event.spawn.zoneId)!;
      expect(event.sector).toBe(sector.name);
      expect(isPointInPolygon(event.spawn, sector.boundary)).toBe(true);
      expect(integrationAppearance(new Date(event.ends - 1))).toEqual(event);
      expect(integrationAppearance(new Date(event.ends))).toBeUndefined();
      expect(integrationAppearance(new Date(start + 3_600_000))).toBeUndefined();
    },
  );

  it('troca a faixa das 17h do dia 19 e só permite encontrar Jirachi no alcance e durante a aparição', () => {
    expect(integrationAppearance(new Date('2026-11-19T17:30:00-03:00'))).toBeUndefined();

    const now = new Date('2026-11-19T13:30:00-03:00');
    const event = integrationAppearance(now)!;
    const { spawn } = event;
    expect(nearbySpawns([spawn], spawn, now)).toEqual([{ spawn, distanceMeters: 0 }]);
    expect(evaluateEncounter(spawn, spawn, now).allowed).toBe(true);
    expect(evaluateEncounter(spawn, offsetByMeters(spawn, 50, 0), now)).toMatchObject({ reason: 'out-of-range' });
    expect(nearbySpawns([spawn], spawn, new Date(event.ends))).toEqual([]);
    expect(evaluateEncounter(spawn, spawn, new Date(event.ends))).toMatchObject({ reason: 'expired' });
  });

  it('registra a espécie no álbum sem incluí-la em nenhum sorteio permanente', () => {
    expect(getSpecies('jirachi').eventOnly).toBe(true);
    for (const slug of [...CAMPUS_ZONES.map((zone) => zone.slug), undefined]) {
      expect(speciesForZone(slug).some((species) => species.id === 'jirachi')).toBe(false);
    }
  });

  it('Jirachi aparece entre os níveis 15 e 20', () => {
    for (const { spawn } of appearances) {
      expect(spawn.level).toBeGreaterThanOrEqual(JIRACHI_MIN_LEVEL);
      expect(spawn.level).toBeLessThanOrEqual(JIRACHI_MAX_LEVEL);
    }
    expect([JIRACHI_MIN_LEVEL, JIRACHI_MAX_LEVEL]).toEqual([15, 20]);
  });
});
