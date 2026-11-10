import { describe, expect, it } from 'vitest';
import type { CampusZone, ExplorationSpawn } from '../types.js';
import { createAdminSpawn, createInMemoryAdminSpawnStore } from './adminSpawns.js';
import {
  createAdminWorldSpawnStore,
  createAdminZoneRepository,
  createMemoryWorldCache,
  createPublishTracker,
  createWorldSpawnStore,
  createWorldZoneRepository,
  type WorldPublisher,
} from './world.js';
import { createEditableZoneRepository, createInMemoryZoneStore } from './zoneRepository.js';

const zone = (id: string): CampusZone => ({
  id,
  slug: id,
  name: `Zona ${id}`,
  color: '#38bdf8',
  isDemo: true,
  boundary: [
    { latitude: -23.11, longitude: -50.36 },
    { latitude: -23.11, longitude: -50.35 },
    { latitude: -23.12, longitude: -50.35 },
  ],
});

const DEFAULTS = [zone('padrao')];
const HERE = { latitude: -23.1131, longitude: -50.357 };
const spawn = (id: string): ExplorationSpawn => createAdminSpawn({ speciesId: 'gotinha', level: 5, point: HERE, durationMinutes: 60, id });

/** Servidor falso: guarda o que o admin publicou; pode estar fora ou recusar. */
function fakePublisher(initial: { zones: CampusZone[] | null; spawns: ExplorationSpawn[] | null } = { zones: null, spawns: null }) {
  const server = { ...initial };
  let failure: { code: string } | null = null;
  const publisher: WorldPublisher = {
    fetch: async () => {
      if (failure) throw failure;
      return { ...server };
    },
    publishZones: async (zones) => {
      if (failure) throw failure;
      server.zones = zones;
    },
    publishSpawns: async (spawns) => {
      if (failure) throw failure;
      server.spawns = spawns;
    },
  };
  return { publisher, server, fail: (code: string | null) => { failure = code ? { code } : null; } };
}

describe('zonas do jogo (mundo publicado)', () => {
  it('usa as zonas publicadas pelo admin; sem publicação, as deste aparelho; sem nada, as padrão', async () => {
    expect(await createWorldZoneRepository(createMemoryWorldCache([zone('admin')]), createInMemoryZoneStore({ version: 1, zones: [zone('local')] }), DEFAULTS).listZones())
      .toEqual([zone('admin')]);
    expect(await createWorldZoneRepository(createMemoryWorldCache(), createInMemoryZoneStore({ version: 1, zones: [zone('local')] }), DEFAULTS).listZones())
      .toEqual([zone('local')]);
    expect(await createWorldZoneRepository(createMemoryWorldCache(), null, DEFAULTS).listZones()).toEqual(DEFAULTS);
  });

  it('Pokémon colocados: publicados + deste aparelho, sem repetir', async () => {
    const store = createWorldSpawnStore(createMemoryWorldCache(null, [spawn('a'), spawn('b')]), createInMemoryAdminSpawnStore([spawn('b'), spawn('c')]));
    expect((await store.list()).map((item) => item.spawnId).sort()).toEqual(['admin-a', 'admin-b', 'admin-c']);
  });
});

describe('painel do admin publica para todos', () => {
  it('carrega a versão publicada, publica cada mudança e guarda a cópia no aparelho', async () => {
    const { publisher, server } = fakePublisher({ zones: [zone('publicada')], spawns: null });
    const cache = createMemoryWorldCache();
    const tracker = createPublishTracker();
    const repository = createAdminZoneRepository(createEditableZoneRepository(createInMemoryZoneStore(), DEFAULTS), cache, publisher, tracker, DEFAULTS);

    expect(await repository.listZones()).toEqual([zone('publicada')]);
    await repository.saveZones([zone('nova')]);
    expect(server.zones).toEqual([zone('nova')]);
    expect(await cache.readZones()).toEqual([zone('nova')]);
    expect(tracker.get().status).toBe('published');

    // Outro aparelho (jogador) com a cópia recebida passa a usar a zona nova.
    expect(await createWorldZoneRepository(cache, null, DEFAULTS).listZones()).toEqual([zone('nova')]);
  });

  it('sem permissão de admin: fica salvo no aparelho e avisa', async () => {
    const { publisher, server, fail } = fakePublisher();
    const local = createEditableZoneRepository(createInMemoryZoneStore(), DEFAULTS);
    const tracker = createPublishTracker();
    const repository = createAdminZoneRepository(local, createMemoryWorldCache(), publisher, tracker, DEFAULTS);
    fail('permission-denied');
    await repository.saveZones([zone('x')]);
    expect(server.zones).toBeNull();
    expect(await local.listZones()).toEqual([zone('x')]);
    expect(tracker.get()).toMatchObject({ status: 'error', message: expect.stringMatching(/não é admin/) });
  });

  it('offline: o painel abre com a última versão publicada que o aparelho recebeu', async () => {
    const { publisher, fail } = fakePublisher();
    fail('unavailable');
    const repository = createAdminZoneRepository(
      createEditableZoneRepository(createInMemoryZoneStore(), DEFAULTS), createMemoryWorldCache([zone('cache')]), publisher, createPublishTracker(), DEFAULTS,
    );
    expect(await repository.listZones()).toEqual([zone('cache')]);
  });

  it('restaurar padrão publica as zonas padrão para todos', async () => {
    const { publisher, server } = fakePublisher({ zones: [zone('x')], spawns: null });
    const repository = createAdminZoneRepository(
      createEditableZoneRepository(createInMemoryZoneStore(), DEFAULTS), createMemoryWorldCache(), publisher, createPublishTracker(), DEFAULTS,
    );
    expect(await repository.reset()).toEqual(DEFAULTS);
    expect(server.zones).toEqual(DEFAULTS);
  });

  it('Pokémon colocados: baixa os publicados e publica a lista nova', async () => {
    const { publisher, server } = fakePublisher({ zones: null, spawns: [spawn('servidor')] });
    const local = createInMemoryAdminSpawnStore();
    const store = createAdminWorldSpawnStore(local, createMemoryWorldCache(), publisher, createPublishTracker());
    expect((await store.list()).map((item) => item.spawnId)).toEqual(['admin-servidor']);
    await store.save([...(await store.list()), spawn('novo')]);
    expect(server.spawns!.map((item) => item.spawnId)).toEqual(['admin-servidor', 'admin-novo']);
  });
});
