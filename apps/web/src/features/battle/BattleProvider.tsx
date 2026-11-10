import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { EncounterStartRequest } from '../exploration/types.js';
import type { OwnedCreature } from '../player/playerState.js';
import { playTrack, prefetchMusic, stopMusic } from '../audio/music.js';
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
    void playTrack('battle'); // chamado no toque de "Batalhar": o celular deixa tocar
  }, []);
  const update = useCallback((next: (state: BattleState) => BattleState) => {
    setBattle((current) => (current ? next(current) : current));
  }, []);
  const end = useCallback(() => {
    if (battle && (battle.status === 'captured' || battle.status === 'won')) {
      const spawnId = battle.spawnId;
      setFinishedSpawnIds((current) => new Set([...current, spawnId]));
    }
    // Saiu da batalha (toque num botão): para a batalha/vitória e volta a abertura.
    void playTrack('opening');
    setBattle(null);
  }, [battle]);

  // Saiu da batalha por outro caminho (ex.: recarregou, voltou ao mapa): para a música.
  useEffect(() => {
    if (!battle) {
      stopMusic(true, 'battle');
      stopMusic(true, 'victory');
    }
  }, [battle]);
  useEffect(() => {
    // Deixa as músicas guardadas no aparelho sem atrasar a abertura do jogo.
    const id = window.setTimeout(prefetchMusic, 5_000);
    return () => {
      window.clearTimeout(id);
      stopMusic(false);
    };
  }, []);

  const value = useMemo(() => ({ battle, finishedSpawnIds, start, update, end }), [battle, finishedSpawnIds, start, update, end]);
  return <BattleContext.Provider value={value}>{children}</BattleContext.Provider>;
}

export function useBattle(): BattleContextValue {
  const value = useContext(BattleContext);
  if (!value) throw new Error('useBattle precisa estar dentro de <BattleProvider>.');
  return value;
}
