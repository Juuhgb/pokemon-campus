import { describe, expect, it } from 'vitest';
import { createBattleRulesV1 } from './encounter.js';

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
