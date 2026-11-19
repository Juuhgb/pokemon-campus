import { describe, expect, it } from 'vitest';
import { getSpecies, habitatOf, HABITATS, REGULAR_SPECIES, SPECIES } from '../../catalog/species.js';
import { polygonAreaSquareMeters } from '../utils/zoneGeometry.js';
import { CAMPUS_ZONES } from './campusZones.js';
import { createMockSpawns, MOCK_SLOT_MS } from './mockSpawns.js';

it('gera dois encontros extras por zona e troca a rodada aos 20 minutos', () => {
  const at = (time: string) => createMockSpawns(new Date('2026-11-18T14:' + time + 'Z'), CAMPUS_ZONES)
    .filter(spawn => spawn.zoneId);
  const first = at('00:00');
  expect(at('19:59')).toEqual(first);
  const next = at('20:00');
  expect(next[0]!.spawnId).not.toBe(first[0]!.spawnId);
  expect(first[0]!.expiresAt).toBe(next[0]!.startsAt);
  for (const zone of CAMPUS_ZONES) {
    const previousCount = Math.min(4, 1 + Math.round(polygonAreaSquareMeters(zone.boundary) / 4000));
    expect(first.filter(spawn => spawn.zoneId === zone.id)).toHaveLength(previousCount + 2);
  }
});

/** Espécies que apareceram em cada zona ao longo de muitas rodadas. */
function spawnedByZone(rounds = 800) {
  const byZone = new Map<string, Set<string>>();
  const start = Date.UTC(2026, 10, 12);
  for (let round = 0; round < rounds; round += 1) {
    for (const spawn of createMockSpawns(new Date(start + round * MOCK_SLOT_MS), CAMPUS_ZONES)) {
      if (!spawn.zoneId) continue;
      const slug = CAMPUS_ZONES.find((zone) => zone.id === spawn.zoneId)!.slug;
      if (!byZone.has(slug)) byZone.set(slug, new Set());
      byZone.get(slug)!.add(spawn.speciesId);
    }
  }
  return byZone;
}

describe('cada Pokémon na zona do curso que combina com ele', () => {
  it('toda espécie mora em exatamente uma zona de curso', () => {
    const sectorNames = CAMPUS_ZONES.map(zone => zone.name);
    for (const species of SPECIES) expect(sectorNames).toContain(habitatOf(species.id));
    const all = Object.values(HABITATS).flat();
    expect([...all].sort()).toEqual(REGULAR_SPECIES.map((species) => species.id).sort());
    expect(new Set(all).size).toBe(all.length);
    expect(Object.keys(HABITATS).sort()).toEqual(CAMPUS_ZONES.map((zone) => zone.slug).sort());
  });

  it('exemplos pedidos: Pikachu na Computação, Clefable na Enfermagem, Caterpie e Cubone na Agronomia', () => {
    expect(habitatOf('faiscao')).toBe('Ciência da Computação');
    expect(habitatOf('clefable')).toBe('Enfermagem');
    expect(habitatOf('caterpie')).toBe('Agronomia');
    expect(habitatOf('cubone')).toBe('Agronomia');
  });

  it('cada zona só gera os Pokémon dela, e todos eles aparecem', () => {
    const byZone = spawnedByZone();
    for (const [slug, ids] of Object.entries(HABITATS)) {
      expect([...(byZone.get(slug) ?? [])].sort()).toEqual([...ids].sort());
    }
  });

  it.each([
    ['ciencia-da-computacao', 'magnemite', 'porygon', 'rotom'],
    ['enfermagem', 'cutiefly', 'audino', 'chansey'],
    ['biologia', 'poliwag', 'burmy', 'ditto'],
    ['medicina-veterinaria', 'lillipup', 'mareep', 'ponyta'],
    ['agronomia', 'combee', 'drilbur', 'tropius'],
  ])('associa os novos Pokémon de %s às raridades previstas', (slug, common, uncommon, rare) => {
    expect(HABITATS[slug]).toEqual(expect.arrayContaining([common, uncommon, rare]));
    expect([common, uncommon, rare].map((id) => getSpecies(id).rarity)).toEqual(['common', 'uncommon', 'rare']);
  });

  it('o nível acompanha a raridade da espécie sorteada', () => {
    const start = Date.UTC(2026, 10, 12);
    for (let round = 0; round < 200; round += 1) {
      for (const spawn of createMockSpawns(new Date(start + round * MOCK_SLOT_MS), CAMPUS_ZONES)) {
        expect(spawn.rarity).toBe(getSpecies(spawn.speciesId).rarity);
      }
    }
  });

  it('zona que não é de curso (ex.: área pessoal ou zona nova do admin) recebe qualquer espécie', () => {
    const other = { ...CAMPUS_ZONES[0]!, id: 'outra', slug: 'minha-casa' };
    const seen = new Set<string>();
    const start = Date.UTC(2026, 10, 12);
    for (let round = 0; round < 800; round += 1) {
      for (const spawn of createMockSpawns(new Date(start + round * MOCK_SLOT_MS), [other])) seen.add(spawn.speciesId);
    }
    expect(seen.size).toBeGreaterThan(20);
  });
});
