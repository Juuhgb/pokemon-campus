import { describe, expect, it } from 'vitest';
import { createMockSpawns } from '../data/mockSpawns.js';
import type { ExplorationSpawn } from '../types.js';
import {
  createInMemorySpawnCache,
  createLocalFirstSpawnRepository,
  createMockSpawnRepository,
  fromSharedSpawn,
  type SpawnRepository,
} from './spawnRepository.js';

const NOW = new Date('2026-11-04T15:10:00.000Z');

describe('dados simulados', () => {
  it('têm os campos obrigatórios', () => {
    for (const spawn of createMockSpawns(NOW)) {
      expect(spawn).toEqual(expect.objectContaining({
        spawnId: expect.any(String),
        speciesId: expect.any(String),
        latitude: expect.any(Number),
        longitude: expect.any(Number),
        level: expect.any(Number),
        rarity: expect.any(String),
        startsAt: expect.any(String),
        expiresAt: expect.any(String),
      }));
    }
  });

  it('são iguais para jogadores diferentes no mesmo horário (spawn compartilhado)', () => {
    const playerA = createMockSpawns(new Date('2026-11-04T15:01:00.000Z'));
    const playerB = createMockSpawns(new Date('2026-11-04T15:29:00.000Z'));
    expect(playerA).toEqual(playerB);
  });
});

describe('createMockSpawnRepository', () => {
  it('não retorna spawns expirados', async () => {
    const spawns = await createMockSpawnRepository().listSpawns({ at: NOW });
    expect(spawns.length).toBeGreaterThan(0);
    expect(spawns.every((spawn) => Date.parse(spawn.expiresAt) > NOW.getTime())).toBe(true);
  });
});

describe('createLocalFirstSpawnRepository', () => {
  const sample: ExplorationSpawn[] = createMockSpawns(NOW).slice(0, 2);

  it('salva no cache quando a fonte responde', async () => {
    const cache = createInMemorySpawnCache();
    const source: SpawnRepository = { listSpawns: async () => sample };
    await createLocalFirstSpawnRepository(source, cache).listSpawns({ at: NOW });
    expect(await cache.read()).toEqual(sample);
  });

  it('usa o cache local quando a fonte falha (offline)', async () => {
    const cache = createInMemorySpawnCache(sample);
    const failing: SpawnRepository = { listSpawns: async () => { throw new Error('offline'); } };
    expect(await createLocalFirstSpawnRepository(failing, cache).listSpawns({ at: NOW })).toEqual(sample);
  });

  it('propaga o erro quando não há cache', async () => {
    const failing: SpawnRepository = { listSpawns: async () => { throw new Error('offline'); } };
    await expect(createLocalFirstSpawnRepository(failing, createInMemorySpawnCache()).listSpawns({ at: NOW })).rejects.toThrow('offline');
  });
});

describe('fromSharedSpawn', () => {
  it('converte o contrato do servidor', () => {
    const spawn = fromSharedSpawn({
      id: '55555555-5555-4555-8555-555555555555',
      zoneId: 'a1f1c2d3-0001-4000-8000-000000000001',
      speciesId: 'brotinho',
      position: { latitude: -23.11, longitude: -50.35 },
      level: 7,
      activeFrom: '2026-11-04T15:00:00.000Z',
      activeUntil: '2026-11-04T16:00:00.000Z',
      battleSeed: 'seed-0123456789abcdef',
      rulesVersion: 1,
      spawnToken: 'token-assinado-pelo-servidor',
    }, 'rare');
    expect(spawn).toEqual({
      spawnId: '55555555-5555-4555-8555-555555555555',
      speciesId: 'brotinho',
      latitude: -23.11,
      longitude: -50.35,
      level: 7,
      rarity: 'rare',
      startsAt: '2026-11-04T15:00:00.000Z',
      expiresAt: '2026-11-04T16:00:00.000Z',
      zoneId: 'a1f1c2d3-0001-4000-8000-000000000001',
      spawnToken: 'token-assinado-pelo-servidor',
    });
  });
});
