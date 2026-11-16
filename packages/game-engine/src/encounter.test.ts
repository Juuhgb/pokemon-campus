import { describe, expect, it } from 'vitest';
import { calculateDamage, CRITICAL_CHANCE, isCriticalRoll } from './battle.js';
import { createBattleRulesV1 } from './encounter.js';
import { deterministicRollV1 } from './random.js';

const rules = createBattleRulesV1(() => ({
  displayName: 'Teste', baseStats: { hp: 24, attack: 10, defense: 10 },
  moves: [{ id: 'tackle', name: 'Investida', type: 'Normal', power: 40 }],
}));
const spawn = { spawnId: 'spawn', encounterId: 'encounter', speciesId: 'test', level: 5, battleSeed: 'canonical-seed-123456', rulesVersion: 1 };
const team = [{ id: 'a', speciesId: 'test', level: 5, hp: 33 }, { id: 'b', speciesId: 'test', level: 5, hp: 33 }];

describe('pure battle rules v1', () => {
  it('replays the same inputs without mutating the previous state', () => {
    const state = rules.createBattle(spawn, team);
    const before = structuredClone(state);
    expect(rules.attack(state, 'tackle')).toEqual(rules.attack(state, 'tackle'));
    expect(state).toEqual(before);
    expect(rules.createBattle(spawn, team)).toEqual(state);
  });
  it('rejects invalid parties and unsupported versions', () => {
    expect(() => rules.createBattle(spawn, [team[0]!, team[0]!])).toThrow();
    expect(() => rules.createBattle({ ...spawn, rulesVersion: 2 }, team)).toThrow();
  });
  it('does not allow an invalid move or a move after fleeing', () => {
    const state = rules.createBattle(spawn, team);
    expect(rules.attack(state, 'unknown')).toBe(state);
    const fled = rules.flee(state);
    expect(fled.turn).toBe(state.turn + 1);
    expect(rules.attack(fled, 'tackle')).toBe(fled);
    expect(rules.attemptCapture(fled, 'POKE_BALL')).toBe(fled);
    expect(rules.switchTo(fled, 1)).toBe(fled);
  });
  it('starts with a conscious member and loses if none are conscious', () => {
    expect(rules.createBattle(spawn, [{ ...team[0]!, hp: 0 }, team[1]!]).activeIndex).toBe(1);
    expect(rules.createBattle(spawn, team.map((member) => ({ ...member, hp: 0 }))).status).toBe('lost');
  });
});

describe('acerto crítico', () => {
  it('multiplica o dano por 1,5', () => {
    const input = { attacker: { level: 20, attack: 30 }, defender: { defense: 10, hp: 999 }, power: 50 };
    const normal = calculateDamage(input);
    expect(calculateDamage({ ...input, critical: true })).toBe(Math.floor(((((2 * 20) / 5 + 2) * 50 * 3) / 50 + 2) * 1.5));
    expect(calculateDamage({ ...input, critical: true })).toBeGreaterThan(normal);
  });

  it('acontece em cerca de 1 a cada 16 golpes, sempre igual para a mesma batalha e turno', () => {
    let hits = 0;
    for (let index = 0; index < 4000; index += 1) {
      if (isCriticalRoll(deterministicRollV1(`seed-${index}-xxxxxxxxxxxx`, 1, 'player-critical'))) hits += 1;
    }
    expect(hits / 4000).toBeGreaterThan(CRITICAL_CHANCE * 0.7);
    expect(hits / 4000).toBeLessThan(CRITICAL_CHANCE * 1.3);
  });

  it('o golpe crítico aparece no texto da batalha e no estado do turno', () => {
    let state = null;
    for (let index = 0; index < 500 && !state; index += 1) {
      const battle = rules.createBattle({ ...spawn, battleSeed: `critical-seed-${index}-xxxxxx` }, team);
      const after = rules.attack(battle, 'tackle');
      if (after.lastTurn?.playerCritical) state = { battle, after };
    }
    expect(state).not.toBeNull();
    const { battle, after } = state!;
    expect(after.log).toMatch(/Investida! Acerto crítico!/);
    const normalDamage = calculateDamage({ attacker: battle.team[0]!, defender: battle.foe, power: 40 });
    expect(battle.foe.hp - after.foe.hp).toBeGreaterThanOrEqual(normalDamage);
  });
});
