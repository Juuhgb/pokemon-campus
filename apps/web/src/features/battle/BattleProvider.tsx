import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { EncounterStartRequest } from '../exploration/types.js';
import type { OwnedCreature } from '../player/playerState.js';
import { createBattle, type BattleState } from './battleState.js';

interface BattleContextValue {
  battle: BattleState | null;
  /** Spawns já capturados ou derrotados nesta sessão (somem do mapa). */
  finishedSpawnIds: ReadonlySet<string>;
  start: (request: EncounterStartRequest, team: readonly OwnedCreature[]) => void;
  update: (next: (state: BattleState) => BattleState) => void;
  end: () => void;
}

const BattleContext = createContext<BattleContextValue | null>(null);

/** Guarda a batalha em andamento (só em memória; recarregar a página volta ao mapa). */
export function BattleProvider({ children }: { children: ReactNode }) {
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [finishedSpawnIds, setFinishedSpawnIds] = useState<ReadonlySet<string>>(() => new Set());

  const start = useCallback((request: EncounterStartRequest, team: readonly OwnedCreature[]) => {
    setBattle(createBattle(request, team));
  }, []);
  const update = useCallback((next: (state: BattleState) => BattleState) => {
    setBattle((current) => (current ? next(current) : current));
  }, []);
  const end = useCallback(() => {
    if (battle && (battle.status === 'captured' || battle.status === 'won')) {
      const spawnId = battle.spawnId;
      setFinishedSpawnIds((current) => new Set([...current, spawnId]));
    }
    setBattle(null);
  }, [battle]);

  const value = useMemo(() => ({ battle, finishedSpawnIds, start, update, end }), [battle, finishedSpawnIds, start, update, end]);
  return <BattleContext.Provider value={value}>{children}</BattleContext.Provider>;
}

export function useBattle(): BattleContextValue {
  const value = useContext(BattleContext);
  if (!value) throw new Error('useBattle precisa estar dentro de <BattleProvider>.');
  return value;
}
