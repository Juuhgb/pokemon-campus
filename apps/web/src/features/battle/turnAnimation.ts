import type { BattleState } from './battleState.js';

/** Tempos (segundos) da animação de um turno. */
export const TURN_TIMING = {
  lunge: 0.45,
  hitDelay: 0.25,
  /** Pausa entre o ataque do jogador e o contra-ataque. */
  counterDelay: 0.85,
  faintDelay: 0.7,
  faint: 0.7,
};

export interface TurnAnimation {
  key: number;
  /** O jogador atacou neste turno (não vale para troca ou captura). */
  playerAttacked: boolean;
  foeAttacked: boolean;
  foeDamage: number;
  playerDamage: number;
  foeFainted: boolean;
  playerFainted: boolean;
  /** Índice do Pokémon do jogador que recebeu o golpe. */
  hitIndex: number;
  /** Segundo em que o contra-ataque começa. */
  counterAt: number;
  /** Duração total, para bloquear os botões e atrasar a navegação. */
  durationMs: number;
}

/** Compara o estado antes e depois de uma ação e descreve o que animar. */
export function describeTurn(before: BattleState, after: BattleState, playerAttacked: boolean, key: number): TurnAnimation {
  const hitIndex = before.activeIndex === after.activeIndex ? before.activeIndex : after.activeIndex;
  const beforeHp = before.team[hitIndex]?.hp ?? 0;
  const afterHp = after.team[hitIndex]?.hp ?? 0;
  const foeDamage = Math.max(0, before.foe.hp - after.foe.hp);
  const playerDamage = Math.max(0, beforeHp - afterHp);
  const foeFainted = before.foe.hp > 0 && after.foe.hp <= 0;
  const playerFainted = beforeHp > 0 && afterHp <= 0;
  const foeAttacked = playerDamage > 0;
  const counterAt = playerAttacked ? TURN_TIMING.counterDelay : 0;

  let duration = 0;
  if (playerAttacked) duration = TURN_TIMING.counterDelay;
  if (foeAttacked) duration = counterAt + TURN_TIMING.counterDelay;
  if (foeFainted) duration = Math.max(duration, TURN_TIMING.faintDelay + TURN_TIMING.faint);
  if (playerFainted) duration = Math.max(duration, counterAt + TURN_TIMING.faintDelay + TURN_TIMING.faint);

  return {
    key,
    playerAttacked,
    foeAttacked,
    foeDamage,
    playerDamage,
    foeFainted,
    playerFainted,
    hitIndex,
    counterAt,
    durationMs: Math.round(duration * 1000),
  };
}
