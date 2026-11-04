import { captureChance } from '@pokemon-campus/game-engine';
import { describe, expect, it } from 'vitest';
import { newCreature } from '../player/playerState.js';
import { attack, attemptCapture, battleSeed, BALL_BONUS, createBattle, flee, rewardsFor, shakesForMiss, switchTo, type BattleState } from './battleState.js';

const AT = '2026-11-04T15:00:00.000Z';
const SPAWN = { spawnId: 'mock-1-zone-0', speciesId: 'faiscao', level: 12 };
const team = [newCreature('a', 'brasinha', 15, AT), newCreature('b', 'brotinho', 6, AT)];

describe('createBattle', () => {
  it('monta o adversário e a equipe com PV cheios', () => {
    const battle = createBattle(SPAWN, team);
    expect(battle.status).toBe('active');
    expect(battle.foe.speciesId).toBe('faiscao');
    expect(battle.foe.hp).toBe(battle.foe.maxHp);
    expect(battle.team.map((member) => member.creatureId)).toEqual(['a', 'b']);
    expect(battle.seed.length).toBeGreaterThanOrEqual(16);
  });

  it('exige pelo menos um Pokémon na equipe', () => {
    expect(() => createBattle(SPAWN, [])).toThrow();
  });

  it('usa o spawnToken como semente quando existe', () => {
    expect(battleSeed('x', 'token-assinado-pelo-servidor')).toBe('token-assinado-pelo-servidor');
  });
});

describe('attack', () => {
  it('tira PV do adversário, recebe o contra-ataque e avança o turno', () => {
    const battle = createBattle(SPAWN, team);
    const next = attack(battle, 'brasa');
    expect(next.foe.hp).toBeLessThan(battle.foe.hp);
    expect(next.team[0]!.hp).toBeLessThan(battle.team[0]!.hp);
    expect(next.turn).toBe(battle.turn + 1);
  });

  it('vence quando o adversário chega a 0 PV', () => {
    const battle: BattleState = { ...createBattle(SPAWN, team), foe: { ...createBattle(SPAWN, team).foe, hp: 1 } };
    expect(attack(battle, 'brasa').status).toBe('won');
  });

  it('é determinístico para a mesma semente e turno', () => {
    const battle = createBattle(SPAWN, team);
    expect(attack(battle, 'investida')).toEqual(attack(battle, 'investida'));
  });

  it('pede troca quando o Pokémon em campo desmaia e ainda há outro', () => {
    const base = createBattle(SPAWN, team);
    const battle = { ...base, team: base.team.map((member, index) => (index === 0 ? { ...member, hp: 1 } : member)) };
    const next = attack(battle, 'arranhao');
    expect(next.mustSwitch).toBe(true);
    expect(attack(next, 'brasa')).toBe(next);
    const switched = switchTo(next, 1);
    expect(switched.activeIndex).toBe(1);
    expect(switched.mustSwitch).toBe(false);
  });

  it('perde quando todos desmaiam', () => {
    const base = createBattle(SPAWN, [team[0]!]);
    const battle = { ...base, team: base.team.map((member) => ({ ...member, hp: 1 })) };
    expect(attack(battle, 'arranhao').status).toBe('lost');
  });
});

describe('attemptCapture', () => {
  it('captura com 3 chacoalhadas quando a rolagem é menor que a chance', () => {
    const base = createBattle(SPAWN, team);
    // PV mínimo dá a chance máxima (95%); procura um turno em que a rolagem passa.
    const results = Array.from({ length: 20 }, (_, turn) => attemptCapture({ ...base, turn: turn + 1, foe: { ...base.foe, hp: 1 } }, 'GREAT_BALL'));
    const caught = results.find((result) => result.status === 'captured')!;
    expect(caught.lastCapture).toEqual({ ball: 'GREAT_BALL', caught: true, shakes: 3 });
  });

  it('quando falha, chacoalha menos de 3 vezes e o adversário contra-ataca', () => {
    const base = createBattle(SPAWN, team);
    const results = Array.from({ length: 20 }, (_, turn) => attemptCapture({ ...base, turn: turn + 1 }, 'POKE_BALL'));
    const miss = results.find((result) => result.lastCapture && !result.lastCapture.caught)!;
    expect(miss.lastCapture!.shakes).toBeLessThan(3);
    expect(miss.status === 'active' || miss.status === 'lost').toBe(true);
    expect(miss.team[0]!.hp).toBeLessThan(base.team[0]!.hp);
  });

  it('a Grande bola tem chance maior', () => {
    const foe = { hp: 20, maxHp: 40 };
    expect(captureChance(foe, BALL_BONUS.GREAT_BALL)).toBeGreaterThan(captureChance(foe, BALL_BONUS.POKE_BALL));
  });

  it('mostra mais chacoalhadas quanto mais perto da chance', () => {
    expect(shakesForMiss(0.5, 0.4)).toBe(2);
    expect(shakesForMiss(0.9, 0.4)).toBe(1);
    expect(shakesForMiss(0.95, 0.2)).toBe(0);
  });
});

describe('fim de batalha', () => {
  it('fugir encerra sem pontos', () => {
    const fled = flee(createBattle(SPAWN, team));
    expect(fled.status).toBe('fled');
    expect(rewardsFor(fled).points).toBe(0);
  });

  it('capturar dá mais pontos que vencer e XP maior para quem está em campo', () => {
    const base = createBattle(SPAWN, team);
    const captured = rewardsFor({ ...base, status: 'captured' });
    const won = rewardsFor({ ...base, status: 'won' });
    expect(captured.points).toBeGreaterThan(won.points);
    expect(won.xpByCreature.a).toBeGreaterThan(won.xpByCreature.b!);
  });
});
