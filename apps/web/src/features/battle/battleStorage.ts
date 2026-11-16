import type { BattleState } from './battleState.js';

/**
 * Batalha em andamento guardada no aparelho (localStorage), para continuar de onde parou se o
 * app fechar no meio — inclusive offline. Fica marcada com a conta dona do progresso: outra
 * conta não herda a batalha de ninguém.
 */

const KEY = 'pokemon-campus:battle:v1';
/** Spawns já resolvidos somem do mapa; depois de 3 h o spawn já expirou de qualquer jeito. */
const FINISHED_TTL_MS = 3 * 60 * 60 * 1000;

export interface SavedBattle {
  battle: BattleState | null;
  finishedSpawnIds: Set<string>;
}

interface Stored {
  version: 1;
  ownerUid: string | null;
  battle: BattleState | null;
  finished: { spawnId: string; at: number }[];
}

const looksLikeBattle = (value: unknown): value is BattleState => {
  const battle = value as BattleState | null;
  return typeof battle === 'object' && battle !== null
    && typeof battle.id === 'string'
    && typeof battle.spawnId === 'string'
    && typeof battle.status === 'string'
    && typeof battle.foe === 'object' && battle.foe !== null
    && Array.isArray(battle.team) && battle.team.length > 0
    && typeof battle.activeIndex === 'number';
};

function read(): Stored | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Stored;
    return value?.version === 1 ? value : null;
  } catch {
    return null;
  }
}

export function loadBattle(ownerUid: string | null, now = Date.now()): SavedBattle {
  const stored = read();
  if (!stored || stored.ownerUid !== ownerUid) return { battle: null, finishedSpawnIds: new Set() };
  const finished = Array.isArray(stored.finished)
    ? stored.finished.filter((item) => typeof item?.spawnId === 'string' && now - item.at < FINISHED_TTL_MS)
    : [];
  return {
    battle: looksLikeBattle(stored.battle) ? stored.battle : null,
    finishedSpawnIds: new Set(finished.map((item) => item.spawnId)),
  };
}

export function saveBattle(ownerUid: string | null, battle: BattleState | null, finishedSpawnIds: ReadonlySet<string>, now = Date.now()): void {
  const previous = read();
  const previousAt = new Map((previous?.ownerUid === ownerUid ? previous.finished : []).map((item) => [item.spawnId, item.at]));
  const stored: Stored = {
    version: 1,
    ownerUid,
    battle,
    finished: [...finishedSpawnIds].map((spawnId) => ({ spawnId, at: previousAt.get(spawnId) ?? now })),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Sem armazenamento (aba privada): a batalha segue só na memória.
  }
}
