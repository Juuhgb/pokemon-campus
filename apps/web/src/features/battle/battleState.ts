import { calculateDamage, captureChance, deterministicRollV1 } from '@pokemon-campus/game-engine';
import { getSpecies, statsAtLevel, type Move } from '../catalog/species.js';
import type { BallItem, OwnedCreature } from '../player/playerState.js';

/**
 * Batalha jogável no cliente, para o protótipo.
 * Usa as funções puras do game-engine (dano, chance de captura e rolagem determinística),
 * mas o resultado oficial continua sendo decidido pelo servidor ao sincronizar.
 */

export interface Combatant {
  speciesId: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

export interface TeamMember extends Combatant {
  creatureId: string;
}

export type BattleStatus = 'active' | 'won' | 'lost' | 'fled' | 'captured';

export interface CaptureAttempt {
  ball: BallItem;
  caught: boolean;
  /** Quantas vezes a bola chacoalhou (3 = capturado). */
  shakes: 0 | 1 | 2 | 3;
}

export interface BattleState {
  spawnId: string;
  seed: string;
  foe: Combatant;
  team: TeamMember[];
  activeIndex: number;
  turn: number;
  log: string;
  status: BattleStatus;
  /** O Pokémon em campo desmaiou e é preciso trocar. */
  mustSwitch: boolean;
  lastCapture: CaptureAttempt | null;
}

export const BALL_BONUS: Record<BallItem, number> = { POKE_BALL: 0, GREAT_BALL: 0.2 };

/** Chance de captura em %, pela regra do game-engine: cresce quando o PV do Pokémon cai. */
export function captureChancePercent(foe: { hp: number; maxHp: number }, ball: BallItem): number {
  return Math.round(captureChance(foe, BALL_BONUS[ball]) * 100);
}

export function battleSeed(spawnId: string, spawnToken?: string): string {
  return (spawnToken ?? `${spawnId}:battle-seed`).padEnd(16, '0');
}

export function toCombatant(speciesId: string, level: number, hp?: number): Combatant {
  const stats = statsAtLevel(getSpecies(speciesId), level);
  return { speciesId, level, hp: Math.min(hp ?? stats.maxHp, stats.maxHp), ...stats, maxHp: stats.maxHp };
}

export function createBattle(
  spawn: { spawnId: string; speciesId: string; level: number; spawnToken?: string },
  team: readonly OwnedCreature[],
): BattleState {
  if (team.length === 0) throw new Error('A equipe precisa de pelo menos um Pokémon.');
  const members = team.map((creature) => ({ creatureId: creature.id, ...toCombatant(creature.speciesId, creature.level, creature.hp) }));
  return {
    spawnId: spawn.spawnId,
    seed: battleSeed(spawn.spawnId, spawn.spawnToken),
    foe: toCombatant(spawn.speciesId, spawn.level),
    team: members,
    activeIndex: 0,
    turn: 1,
    log: `Um ${getSpecies(spawn.speciesId).displayName} selvagem apareceu!`,
    status: 'active',
    mustSwitch: false,
    lastCapture: null,
  };
}

const name = (combatant: Combatant) => getSpecies(combatant.speciesId).displayName;
export const activeMember = (state: BattleState) => state.team[state.activeIndex]!;
export const movesOf = (combatant: Combatant): Move[] => getSpecies(combatant.speciesId).moves;

/** Contra-ataque do Pokémon selvagem. */
function foeTurn(state: BattleState, prefix: string): BattleState {
  const moves = movesOf(state.foe);
  const move = moves[Math.floor(deterministicRollV1(state.seed, state.turn, 'foe-move') * moves.length)]!;
  const target = activeMember(state);
  const damage = calculateDamage({ attacker: state.foe, defender: target, power: move.power });
  const hp = target.hp - damage;
  const team = state.team.map((member, index) => (index === state.activeIndex ? { ...member, hp } : member));
  let log = `${prefix} ${name(state.foe)} usou ${move.name}! ${name(target)} perdeu ${damage} PV.`;
  const next = { ...state, team, turn: state.turn + 1 };
  if (hp > 0) return { ...next, log };

  log += ` ${name(target)} desmaiou!`;
  const anyoneLeft = team.some((member) => member.hp > 0);
  return anyoneLeft ? { ...next, log, mustSwitch: true } : { ...next, log, status: 'lost' };
}

export function attack(state: BattleState, moveId: string): BattleState {
  if (state.status !== 'active' || state.mustSwitch) return state;
  const attacker = activeMember(state);
  const move = movesOf(attacker).find((item) => item.id === moveId);
  if (!move) return state;
  const damage = calculateDamage({ attacker, defender: state.foe, power: move.power });
  const foe = { ...state.foe, hp: state.foe.hp - damage };
  const text = `${name(attacker)} usou ${move.name}! ${name(foe)} perdeu ${damage} PV.`;
  if (foe.hp <= 0) return { ...state, foe, turn: state.turn + 1, status: 'won', log: `${text} ${name(foe)} desmaiou!` };
  return foeTurn({ ...state, foe }, text);
}

export function switchTo(state: BattleState, index: number): BattleState {
  const member = state.team[index];
  if (state.status !== 'active' || !member || member.hp <= 0 || index === state.activeIndex) return state;
  const text = `Vai, ${name(member)}!`;
  const switched = { ...state, activeIndex: index, mustSwitch: false };
  // Trocar depois de um desmaio não dá turno extra ao adversário.
  return state.mustSwitch ? { ...switched, log: text } : foeTurn(switched, text);
}

/** Chacoalhadas mostradas quando a captura falha: quanto mais perto da chance, mais chacoalha. */
export function shakesForMiss(roll: number, chance: number): 0 | 1 | 2 {
  if (roll < chance * 1.6) return 2;
  if (roll < chance * 2.6) return 1;
  return 0;
}

export function attemptCapture(state: BattleState, ball: BallItem): BattleState {
  if (state.status !== 'active' || state.mustSwitch) return state;
  const chance = captureChance(state.foe, BALL_BONUS[ball]);
  const roll = deterministicRollV1(state.seed, state.turn, 'capture');
  if (roll < chance) {
    return { ...state, status: 'captured', turn: state.turn + 1, lastCapture: { ball, caught: true, shakes: 3 }, log: `Pegou! ${name(state.foe)} foi capturado.` };
  }
  const shakes = shakesForMiss(roll, chance);
  const escaped = { ...state, lastCapture: { ball, caught: false, shakes } };
  return foeTurn(escaped, `${name(state.foe)} escapou da bola!`);
}

export function flee(state: BattleState): BattleState {
  if (state.status !== 'active') return state;
  return { ...state, status: 'fled', log: 'Você fugiu.' };
}

export interface BattleRewards {
  points: number;
  xpByCreature: Record<string, number>;
}

export function rewardsFor(state: BattleState): BattleRewards {
  const level = state.foe.level;
  const base = state.status === 'captured' ? level * 5 : state.status === 'won' ? level * 6 : state.status === 'lost' ? level : 0;
  const points = state.status === 'captured' ? 100 + level * 2 : state.status === 'won' ? 50 + level : 0;
  const xpByCreature: Record<string, number> = {};
  state.team.forEach((member, index) => {
    xpByCreature[member.creatureId] = index === state.activeIndex ? base : Math.floor(base / 3);
  });
  return { points, xpByCreature };
}
