import { describe, expect, it } from 'vitest';
import { createMockSpawnRepository } from './spawnRepository.js';
import {
  ADMIN_SPAWN_PREFIX,
  combineSpawnRepositories,
  createAdminSpawn,
  createAdminSpawnRepository,
  createInMemoryAdminSpawnStore,
} from './adminSpawns.js';

const NOW = new Date('2026-11-05T15:00:00.000Z');
const HERE = { latitude: -23.1131197, longitude: -50.3570162 };

describe('createAdminSpawn', () => {
  it('coloca o Pokémon exatamente no ponto, com a raridade da espécie e validade escolhida', () => {
    const spawn = createAdminSpawn({ speciesId: 'faiscao', level: 12, point: HERE, durationMinutes: 120, now: NOW, id: 'x' });
    expect(spawn).toMatchObject({
      spawnId: `${ADMIN_SPAWN_PREFIX}x`,
      speciesId: 'faiscao',
      latitude: HERE.latitude,
      longitude: HERE.longitude,
      level: 12,
      rarity: 'uncommon',
      startsAt: '2026-11-05T15:00:00.000Z',
      expiresAt: '2026-11-05T17:00:00.000Z',
    });
  });

  it('limita o nível entre 1 e 100', () => {
    expect(createAdminSpawn({ speciesId: 'gotinha', level: 0, point: HERE, durationMinutes: 30, now: NOW }).level).toBe(1);
    expect(createAdminSpawn({ speciesId: 'gotinha', level: 500, point: HERE, durationMinutes: 30, now: NOW }).level).toBe(100);
  });
});

describe('repositório de Pokémon colocados', () => {
  it('o jogo só recebe os que ainda não expiraram', async () => {
    const live = createAdminSpawn({ speciesId: 'gotinha', level: 5, point: HERE, durationMinutes: 60, now: NOW, id: 'a' });
    const old = createAdminSpawn({ speciesId: 'gotinha', level: 5, point: HERE, durationMinutes: 30, now: new Date('2026-11-05T13:00:00.000Z'), id: 'b' });
    const repository = createAdminSpawnRepository(createInMemoryAdminSpawnStore([live, old]));
    expect((await repository.listSpawns({ at: NOW })).map((spawn) => spawn.spawnId)).toEqual([`${ADMIN_SPAWN_PREFIX}a`]);
  });

  it('soma os colocados aos gerados nas zonas', async () => {
    const placed = createAdminSpawn({ speciesId: 'aurora', level: 30, point: HERE, durationMinutes: 60, now: NOW, id: 'p' });
    const combined = combineSpawnRepositories(
      createMockSpawnRepository(() => []),
      createAdminSpawnRepository(createInMemoryAdminSpawnStore([placed])),
    );
    expect(await combined.listSpawns({ at: NOW })).toEqual([placed]);
  });

  it('se uma fonte falhar, as outras continuam', async () => {
    const placed = createAdminSpawn({ speciesId: 'gotinha', level: 5, point: HERE, durationMinutes: 60, now: NOW, id: 'p' });
    const failing = { listSpawns: async () => { throw new Error('offline'); } };
    const combined = combineSpawnRepositories(failing, createAdminSpawnRepository(createInMemoryAdminSpawnStore([placed])));
    expect(await combined.listSpawns({ at: NOW })).toEqual([placed]);
    await expect(combineSpawnRepositories(failing).listSpawns({ at: NOW })).rejects.toThrow('offline');
  });
});
