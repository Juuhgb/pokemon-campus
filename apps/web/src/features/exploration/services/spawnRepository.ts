import type { Spawn } from '@pokemon-campus/shared';
import { createMockSpawns } from '../data/mockSpawns.js';
import type { ExplorationSpawn, Rarity } from '../types.js';

export interface SpawnQuery {
  /** Instante de referência; spawns expirados nesse instante não são retornados. */
  at: Date;
}

/**
 * Porta de leitura de spawns. Hoje: dados simulados.
 * Integração futura: implementar com GET /api/v1/spawns e mapear com `fromSharedSpawn`.
 * Spawns são globais (não pertencem a um jogador), então todos veem os mesmos.
 */
export interface SpawnRepository {
  listSpawns(query: SpawnQuery): Promise<ExplorationSpawn[]>;
}

/** Cache local dos últimos spawns recebidos, usado quando a fonte falha (offline). */
export interface SpawnCache {
  read(): Promise<ExplorationSpawn[] | null>;
  write(spawns: ExplorationSpawn[]): Promise<void>;
}

const notExpired = (at: Date) => (spawn: ExplorationSpawn) => Date.parse(spawn.expiresAt) > at.getTime();

export function createMockSpawnRepository(
  factory: (now: Date) => ExplorationSpawn[] = (now) => createMockSpawns(now),
): SpawnRepository {
  return {
    async listSpawns({ at }) {
      return factory(at).filter(notExpired(at));
    },
  };
}

export function createInMemorySpawnCache(initial: ExplorationSpawn[] | null = null): SpawnCache {
  let stored = initial;
  return {
    async read() {
      return stored;
    },
    async write(spawns) {
      stored = spawns;
    },
  };
}

/**
 * Local-first: tenta a fonte; se falhar (ex.: sem rede), devolve o cache local.
 * Não sincroniza eventos — apenas lê dados de spawn.
 */
export function createLocalFirstSpawnRepository(source: SpawnRepository, cache: SpawnCache): SpawnRepository {
  return {
    async listSpawns(query) {
      try {
        const spawns = await source.listSpawns(query);
        await cache.write(spawns).catch(() => undefined);
        return spawns;
      } catch (error) {
        const cached = await cache.read().catch(() => null);
        if (cached) return cached.filter(notExpired(query.at));
        throw error;
      }
    },
  };
}

/** Adapta o contrato do servidor (`Spawn` de @pokemon-campus/shared) para o modelo da tela. */
export function fromSharedSpawn(spawn: Spawn, rarity: Rarity = 'common'): ExplorationSpawn {
  return {
    spawnId: spawn.id,
    speciesId: spawn.speciesId,
    latitude: spawn.position.latitude,
    longitude: spawn.position.longitude,
    level: spawn.level,
    rarity,
    startsAt: spawn.activeFrom,
    expiresAt: spawn.activeUntil,
    zoneId: spawn.zoneId,
    spawnToken: spawn.spawnToken,
      battleSeed: spawn.battleSeed,
      rulesVersion: spawn.rulesVersion,
  };
}
