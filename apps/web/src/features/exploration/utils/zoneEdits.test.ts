import { describe, expect, it } from 'vitest';
import { createMockSpawns } from '../data/mockSpawns.js';
import { createEditableZoneRepository, createInMemoryZoneStore } from '../services/zoneRepository.js';
import type { CampusZone } from '../types.js';
import { isPointInPolygon, polygonCentroid } from './geofence.js';
import {
  createZone,
  deleteZone,
  insertVertex,
  moveVertex,
  parseZones,
  removeVertex,
  renameZone,
  serializeZones,
  slugify,
  translateZone,
} from './zoneEdits.js';
import { polygonAreaSquareMeters } from './zoneGeometry.js';

const triangle = [
  { latitude: -23.1, longitude: -50.36 },
  { latitude: -23.1, longitude: -50.359 },
  { latitude: -23.101, longitude: -50.3595 },
];

const base: CampusZone[] = [{ id: 'z1', slug: 'z1', name: 'Zona 1', color: '#38bdf8', boundary: triangle, isDemo: true }];

describe('edição de zonas', () => {
  it('cria uma zona com o formato desenhado', () => {
    const zones = createZone([], triangle, 'Laboratório', 'novo');
    expect(zones).toEqual([expect.objectContaining({ id: 'novo', name: 'Laboratório', slug: 'laboratorio', boundary: triangle, isDemo: false })]);
  });

  it('exige pelo menos 3 pontos', () => {
    expect(() => createZone([], triangle.slice(0, 2), 'X')).toThrow();
  });

  it('move um vértice e deixa de ser demonstração', () => {
    const [zone] = moveVertex(base, 'z1', 0, { latitude: -23.2, longitude: -50.4 });
    expect(zone!.boundary[0]).toEqual({ latitude: -23.2, longitude: -50.4 });
    expect(zone!.isDemo).toBe(false);
  });

  it('insere vértice no ponto médio da aresta', () => {
    const [zone] = insertVertex(base, 'z1', 0);
    expect(zone!.boundary).toHaveLength(4);
    expect(zone!.boundary[1]).toEqual({ latitude: -23.1, longitude: -50.3595 });
  });

  it('remove vértice mas nunca deixa menos de 3', () => {
    expect(removeVertex(base, 'z1', 0)[0]!.boundary).toHaveLength(3);
    const square = insertVertex(base, 'z1', 0);
    expect(removeVertex(square, 'z1', 1)[0]!.boundary).toEqual(triangle);
  });

  it('move a zona inteira sem mudar o formato', () => {
    const [zone] = translateZone(base, 'z1', 0.01, -0.02);
    expect(zone!.boundary[2]!.latitude).toBeCloseTo(-23.091, 9);
    expect(zone!.boundary[2]!.longitude).toBeCloseTo(-50.3795, 9);
    expect(polygonAreaSquareMeters(zone!.boundary)).toBeCloseTo(polygonAreaSquareMeters(triangle), -1);
  });

  it('renomeia (atualizando o slug) e exclui', () => {
    expect(renameZone(base, 'z1', 'Medicina Veterinária')[0]).toMatchObject({ name: 'Medicina Veterinária', slug: 'medicina-veterinaria' });
    expect(deleteZone(base, 'z1')).toEqual([]);
  });

  it('gera slugs sem acentos', () => {
    expect(slugify('Ciência da Computação!')).toBe('ciencia-da-computacao');
  });
});

describe('importação/exportação', () => {
  it('exporta e reimporta as mesmas zonas', () => {
    expect(parseZones(JSON.parse(serializeZones(base)))).toEqual(base);
  });

  it('rejeita JSON inválido, poucos vértices e IDs duplicados', () => {
    expect(parseZones({ foo: 1 })).toBeNull();
    expect(parseZones([{ ...base[0], boundary: triangle.slice(0, 2) }])).toBeNull();
    expect(parseZones([base[0], base[0]])).toBeNull();
  });

  it('dá nome padrão a zonas sem nome', () => {
    expect(parseZones([{ ...base[0], name: '  ' }])?.[0]?.name).toBe('Zona sem nome');
  });
});

describe('repositório editável', () => {
  it('usa as zonas padrão até haver edição salva, e volta a elas ao restaurar', async () => {
    const repository = createEditableZoneRepository(createInMemoryZoneStore(), base);
    expect(await repository.listZones()).toEqual(base);

    const edited = renameZone(base, 'z1', 'Editada');
    await repository.saveZones(edited);
    expect((await repository.listZones())[0]!.name).toBe('Editada');

    expect(await repository.reset()).toEqual(base);
    expect(await repository.listZones()).toEqual(base);
  });

  it('ignora dados salvos corrompidos', async () => {
    const repository = createEditableZoneRepository(createInMemoryZoneStore({ zones: 'quebrado' }), base);
    expect(await repository.listZones()).toEqual(base);
  });
});

describe('spawns seguem as zonas', () => {
  it('nascem dentro de uma zona com formato livre (côncava)', () => {
    const lShape: CampusZone = {
      id: 'L', slug: 'l', name: 'L', color: '#f97316', isDemo: false,
      boundary: [
        { latitude: -23.1, longitude: -50.36 },
        { latitude: -23.1, longitude: -50.357 },
        { latitude: -23.101, longitude: -50.357 },
        { latitude: -23.101, longitude: -50.359 },
        { latitude: -23.103, longitude: -50.359 },
        { latitude: -23.103, longitude: -50.36 },
      ],
    };
    const spawns = createMockSpawns(new Date('2026-11-04T15:10:00.000Z'), [lShape]).filter((spawn) => spawn.zoneId === 'L');
    expect(spawns.length).toBeGreaterThan(0);
    expect(spawns.every((spawn) => isPointInPolygon(spawn, lShape.boundary))).toBe(true);
  });

  it('acompanham a zona quando ela é movida', () => {
    const now = new Date('2026-11-04T15:10:00.000Z');
    const moved = translateZone(base, 'z1', 0.05, 0);
    const before = createMockSpawns(now, base).find((spawn) => spawn.zoneId === 'z1')!;
    const after = createMockSpawns(now, moved).find((spawn) => spawn.zoneId === 'z1')!;
    expect(isPointInPolygon(after, moved[0]!.boundary)).toBe(true);
    expect(after.latitude - before.latitude).toBeCloseTo(0.05, 5);
    expect(polygonCentroid(moved[0]!.boundary).latitude).toBeCloseTo(polygonCentroid(triangle).latitude + 0.05, 9);
  });
});
