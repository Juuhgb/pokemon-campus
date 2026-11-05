import { createBattleRulesV1 } from '@pokemon-campus/game-engine';
import { getSpecies } from '../catalog/species.js';

export type { Combatant, TeamMember, BattleState, BattleStatus, CaptureAttempt, BattleRewards } from '@pokemon-campus/game-engine';
const rules = createBattleRulesV1(getSpecies);
export const { BALL_BONUS, captureChancePercent, battleSeed, toCombatant, activeMember, movesOf, attack, switchTo, shakesForMiss, attemptCapture, flee, rewardsFor } = rules;

/** IDs são gerados na borda; a resolução dos turnos no game-engine é pura. */
export function createBattle(...[spawn, team]: Parameters<typeof rules.createBattle>) {
  return rules.createBattle({ ...spawn, encounterId: crypto.randomUUID() }, team);
}
