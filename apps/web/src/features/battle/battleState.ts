import { createBattleRulesV1, deterministicRollV1 } from '@pokemon-campus/game-engine';
import type { BattleState } from '@pokemon-campus/game-engine';
import { GREAT_BALL_CHANCE } from '../player/playerState.js';
import { getSpecies } from '../catalog/species.js';

export type { Combatant, TeamMember, BattleState, BattleStatus, CaptureAttempt, BattleRewards } from '@pokemon-campus/game-engine';
const rules = createBattleRulesV1(getSpecies);
export const { BALL_BONUS, captureChancePercent, battleSeed, toCombatant, activeMember, movesOf, attack, switchTo, shakesForMiss, attemptCapture, flee, rewardsFor } = rules;

/** IDs são gerados na borda; a resolução dos turnos no game-engine é pura. */
export function createBattle(...[spawn, team]: Parameters<typeof rules.createBattle>) {
  return rules.createBattle({ ...spawn, encounterId: crypto.randomUUID() }, team);
}

/**
 * Great Balls ganhas na captura: GREAT_BALL_CHANCE de ganhar 1. O sorteio usa a semente da
 * batalha (como o acerto crítico e a captura), então dá sempre o mesmo resultado para a mesma batalha.
 */
export function greatBallReward(battle: Pick<BattleState, 'seed' | 'turn' | 'status'>): 0 | 1 {
  if (battle.status !== 'captured') return 0;
  return deterministicRollV1(battle.seed, Math.max(1, battle.turn), 'great-ball-reward') < GREAT_BALL_CHANCE ? 1 : 0;
}
