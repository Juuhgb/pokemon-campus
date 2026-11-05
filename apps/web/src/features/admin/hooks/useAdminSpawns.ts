import { useCallback, useEffect, useState } from 'react';
import { createAdminSpawn, type AdminSpawnStore, type NewAdminSpawn } from '../../exploration/services/adminSpawns.js';
import type { ExplorationSpawn } from '../../exploration/types.js';

export interface AdminSpawns {
  spawns: ExplorationSpawn[];
  add: (spawn: NewAdminSpawn) => Promise<ExplorationSpawn>;
  remove: (spawnId: string) => Promise<void>;
  /** Apaga todos, inclusive os expirados. */
  clear: () => Promise<void>;
}

/** Lista e edita os Pokémon colocados à mão (salvos neste navegador). */
export function useAdminSpawns(store: AdminSpawnStore): AdminSpawns {
  const [spawns, setSpawns] = useState<ExplorationSpawn[]>([]);

  useEffect(() => {
    let cancelled = false;
    store.list().then((items) => {
      if (!cancelled) setSpawns(items);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [store]);

  const persist = useCallback(async (next: ExplorationSpawn[]) => {
    setSpawns(next);
    await store.save(next);
  }, [store]);

  const add = useCallback(async (input: NewAdminSpawn) => {
    const spawn = createAdminSpawn(input);
    await persist([...(await store.list()), spawn]);
    return spawn;
  }, [persist, store]);

  const remove = useCallback(async (spawnId: string) => {
    await persist((await store.list()).filter((spawn) => spawn.spawnId !== spawnId));
  }, [persist, store]);

  const clear = useCallback(() => persist([]), [persist]);

  return { spawns, add, remove, clear };
}
