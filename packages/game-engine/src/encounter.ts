import { calculateDamage, isCriticalRoll } from './battle.js';
import { captureChance } from './capture.js';
import { deterministicRollV1 } from './random.js';
import { battleRewardsV1, statsAtLevelV1 } from './progression.js';

export type BallItem = 'POKE_BALL' | 'GREAT_BALL';
export interface BattleCreature { id: string; speciesId: string; level: number; hp: number }
export interface BattleMove { id: string; name: string; type: string; power: number }
export interface BattleSpecies {
  rarity?: string;
  displayName: string;
  baseStats: { hp: number; attack: number; defense: number };
  moves: BattleMove[];
}
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
  sector?: { id: string; name: string };
  id: string;
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
  /** Acertos críticos do último turno (para a tela mostrar). Ausente em batalhas antigas. */
  lastTurn?: { playerCritical: boolean; foeCritical: boolean };
}

export interface BattleRewards {
  points: number;
  xpByCreature: Record<string, number>;
}

/** Catálogo injetado: as mesmas regras podem ser executadas na API e no cliente. */
export function createBattleRulesV1(getSpecies: (id: string) => BattleSpecies) {
  const BALL_BONUS: Record<BallItem, number> = { POKE_BALL: 0, GREAT_BALL: 0.2 };

  function chanceForBall(foe: Pick<Combatant, 'hp' | 'maxHp' | 'speciesId'>, ball: BallItem): number {
    const chance = captureChance(foe, BALL_BONUS[ball]);
    return getSpecies(foe.speciesId).rarity === 'legendary' ? chance * 0.5 : chance;
  }

  function captureChancePercent(foe: Pick<Combatant, 'hp' | 'maxHp' | 'speciesId'>, ball: BallItem): number {
    return Math.round(chanceForBall(foe, ball) * 100);
  }

  function battleSeed(spawnId: string, spawnToken?: string): string {
    return (spawnToken ?? `${spawnId}:battle-seed`).padEnd(16, '0');
  }

  function toCombatant(speciesId: string, level: number, hp?: number): Combatant {
    if (hp !== undefined && (!Number.isInteger(hp) || hp < 0)) throw new RangeError("Invalid HP");
    const stats = statsAtLevelV1(getSpecies(speciesId).baseStats, level);
    return { speciesId, level, hp: Math.min(hp ?? stats.maxHp, stats.maxHp), ...stats, maxHp: stats.maxHp };
  }

  function createBattle(
    spawn: { sector?: { id: string; name: string }; spawnId: string; speciesId: string; level: number; spawnToken?: string; battleSeed?: string; rulesVersion?: number; encounterId?: string },
    team: readonly BattleCreature[],
  ): BattleState {
    if (spawn.rulesVersion !== undefined && spawn.rulesVersion !== 1) throw new Error('Unsupported battle rules version');
    if (team.length > 3 || new Set(team.map((member) => member.id)).size !== team.length) throw new Error('Invalid party');
    if (team.length === 0) throw new Error('A equipe precisa de pelo menos um Pokémon.');
    const members = team.map((creature) => ({ creatureId: creature.id, ...toCombatant(creature.speciesId, creature.level, creature.hp) }));
    return {
      id: spawn.encounterId ?? spawn.spawnId,
      spawnId: spawn.spawnId,
      ...(spawn.sector && { sector: spawn.sector }),
      seed: spawn.battleSeed ?? battleSeed(spawn.spawnId),
      foe: toCombatant(spawn.speciesId, spawn.level),
      team: members,
      activeIndex: Math.max(0, members.findIndex((member) => member.hp > 0)),
      turn: 1,
      log: `Um ${getSpecies(spawn.speciesId).displayName} selvagem apareceu!`,
      status: members.some((member) => member.hp > 0) ? 'active' : 'lost',
      mustSwitch: false,
      lastCapture: null,
    };
  }

  const name = (combatant: Combatant) => getSpecies(combatant.speciesId).displayName;
  const activeMember = (state: BattleState) => state.team[state.activeIndex]!;
  const movesOf = (combatant: Combatant): BattleMove[] => getSpecies(combatant.speciesId).moves;

  /** Contra-ataque do Pokémon selvagem. */
  function foeTurn(state: BattleState, prefix: string): BattleState {
    const moves = movesOf(state.foe);
    const move = moves[Math.floor(deterministicRollV1(state.seed, state.turn, 'foe-move') * moves.length)]!;
    const target = activeMember(state);
    const critical = isCriticalRoll(deterministicRollV1(state.seed, state.turn, 'foe-critical'));
    const damage = calculateDamage({ attacker: state.foe, defender: target, power: move.power, critical });
    const hp = target.hp - damage;
    const team = state.team.map((member, index) => (index === state.activeIndex ? { ...member, hp } : member));
    let log = `${prefix} ${name(state.foe)} usou ${move.name}!${critical ? ' Acerto crítico!' : ''} ${name(target)} perdeu ${damage} PV.`;
    const next = { ...state, team, turn: state.turn + 1, lastTurn: { playerCritical: state.lastTurn?.playerCritical ?? false, foeCritical: critical } };
    if (hp > 0) return { ...next, log };

    log += ` ${name(target)} desmaiou!`;
    const anyoneLeft = team.some((member) => member.hp > 0);
    return anyoneLeft ? { ...next, log, mustSwitch: true } : { ...next, log, status: 'lost' };
  }

  function attack(state: BattleState, moveId: string): BattleState {
    if (state.status !== 'active' || state.mustSwitch) return state;
    const attacker = activeMember(state);
    const move = movesOf(attacker).find((item) => item.id === moveId);
    if (!move) return state;
    const critical = isCriticalRoll(deterministicRollV1(state.seed, state.turn, 'player-critical'));
    const damage = calculateDamage({ attacker, defender: state.foe, power: move.power, critical });
    const foe = { ...state.foe, hp: state.foe.hp - damage };
    const text = `${name(attacker)} usou ${move.name}!${critical ? ' Acerto crítico!' : ''} ${name(foe)} perdeu ${damage} PV.`;
    const lastTurn = { playerCritical: critical, foeCritical: false };
    if (foe.hp <= 0) return { ...state, foe, turn: state.turn + 1, status: 'won', lastTurn, log: `${text} ${name(foe)} desmaiou!` };
    return foeTurn({ ...state, foe, lastTurn }, text);
  }

  function switchTo(state: BattleState, index: number): BattleState {
    const member = state.team[index];
    if (state.status !== 'active' || !member || member.hp <= 0 || index === state.activeIndex) return state;
    const text = `Vai, ${name(member)}!`;
    const switched = { ...state, activeIndex: index, mustSwitch: false, lastTurn: { playerCritical: false, foeCritical: false } };
    // Trocar depois de um desmaio não dá turno extra ao adversário.
    return state.mustSwitch ? { ...switched, log: text } : foeTurn(switched, text);
  }

  /** Chacoalhadas mostradas quando a captura falha: quanto mais perto da chance, mais chacoalha. */
  function shakesForMiss(roll: number, chance: number): 0 | 1 | 2 {
    if (roll < chance * 1.6) return 2;
    if (roll < chance * 2.6) return 1;
    return 0;
  }

  function attemptCapture(state: BattleState, ball: BallItem): BattleState {
    if (state.status !== 'active' || state.mustSwitch) return state;
    const chance = chanceForBall(state.foe, ball);
    const roll = deterministicRollV1(state.seed, state.turn, 'capture');
    if (roll < chance) {
      return { ...state, status: 'captured', turn: state.turn + 1, lastCapture: { ball, caught: true, shakes: 3 }, log: `Pegou! ${name(state.foe)} foi capturado.` };
    }
    const shakes = shakesForMiss(roll, chance);
    const escaped = { ...state, lastCapture: { ball, caught: false, shakes }, lastTurn: { playerCritical: false, foeCritical: false } };
    return foeTurn(escaped, `${name(state.foe)} escapou da bola!`);
  }

  function flee(state: BattleState): BattleState {
    if (state.status !== 'active') return state;
    return { ...state, turn: state.turn + 1, status: 'fled', log: 'Você fugiu.' };
  }


  function rewardsFor(state: BattleState): BattleRewards {
    const level = state.foe.level;
    const { experience: base, points } = battleRewardsV1(state.status, level);
    const xpByCreature: Record<string, number> = {};
    state.team.forEach((member, index) => {
      const share = index === state.activeIndex ? base : Math.floor(base / 3);
      xpByCreature[member.creatureId] = share * 2;
    });
    return { points, xpByCreature };
  }

  return { BALL_BONUS, captureChancePercent, battleSeed, toCombatant, createBattle, activeMember, movesOf, attack, switchTo, shakesForMiss, attemptCapture, flee, rewardsFor };
}
