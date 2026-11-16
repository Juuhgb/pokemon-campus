import { describe, expect, it } from 'vitest';
import { getSpecies, habitatOf, HABITATS, SPECIES } from '../../catalog/species.js';
import { CAMPUS_ZONES } from './campusZones.js';
import { createMockSpawns, MOCK_SLOT_MS } from './mockSpawns.js';

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
    const all = Object.values(HABITATS).flat();
    expect([...all].sort()).toEqual(SPECIES.map((species) => species.id).sort());
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
