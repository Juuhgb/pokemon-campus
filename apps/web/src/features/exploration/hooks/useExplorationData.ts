import { useEffect, useState } from 'react';
import type { SpawnRepository } from '../services/spawnRepository.js';
import type { ZoneRepository } from '../services/zoneRepository.js';
import type { CampusZone, ExplorationSpawn } from '../types.js';

export const SPAWN_REFRESH_MS = 60_000;

/** `refreshKey`: quando muda, recarrega (ex.: o admin publicou zonas novas). */
export function useZones(repository: ZoneRepository, refreshKey = 0): CampusZone[] {
  const [zones, setZones] = useState<CampusZone[]>([]);
  useEffect(() => {
    let cancelled = false;
    repository.listZones().then((items) => {
      if (!cancelled) setZones(items);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [repository, refreshKey]);
  return zones;
}

export interface SpawnsState {
  spawns: ExplorationSpawn[];
  error: string | null;
  loading: boolean;
}

export function useSpawns(repository: SpawnRepository, refreshMs = SPAWN_REFRESH_MS, refreshKey = 0): SpawnsState {
  const [state, setState] = useState<SpawnsState>({ spawns: [], error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      repository.listSpawns({ at: new Date() })
        .then((spawns) => {
          if (!cancelled) setState({ spawns, error: null, loading: false });
        })
        .catch(() => {
          if (!cancelled) setState((previous) => ({ ...previous, error: 'Não foi possível carregar os Pokémon próximos.', loading: false }));
        });
    };
    load();
    const id = window.setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [repository, refreshMs, refreshKey]);

  return state;
}
