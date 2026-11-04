import { describe, expect, it } from 'vitest';
import { newCreature } from '../player/playerState.js';
import { attack, captureChancePercent, createBattle, rewardsFor, switchTo, type BattleState } from './battleState.js';
import { describeTurn } from './turnAnimation.js';

const AT = '2026-11-04T15:00:00.000Z';
const team = [newCreature('a', 'brasinha', 15, AT), newCreature('b', 'brotinho', 6, AT)];
const battle = () => createBattle({ spawnId: 'mock-1-zone-0', speciesId: 'faiscao', level: 12 }, team);

describe('describeTurn', () => {
  it('ataque normal: o jogador avança, o adversário apanha e contra-ataca', () => {
    const before = battle();
    const turn = describeTurn(before, attack(before, 'brasa'), true, 1);
    expect(turn).toMatchObject({ playerAttacked: true, foeAttacked: true, foeFainted: false, playerFainted: false });
    expect(turn.foeDamage).toBeGreaterThan(0);
    expect(turn.playerDamage).toBeGreaterThan(0);
    expect(turn.counterAt).toBeGreaterThan(0);
    expect(turn.durationMs).toBeGreaterThan(1000);
  });

  it('golpe final: o adversário desmaia e não contra-ataca', () => {
    const base = battle();
    const before: BattleState = { ...base, foe: { ...base.foe, hp: 1 } };
    const turn = describeTurn(before, attack(before, 'brasa'), true, 2);
    expect(turn).toMatchObject({ foeFainted: true, foeAttacked: false, playerDamage: 0 });
  });

  it('troca: só o adversário ataca, sem espera inicial', () => {
    const before = battle();
    const turn = describeTurn(before, switchTo(before, 1), false, 3);
    expect(turn).toMatchObject({ playerAttacked: false, foeAttacked: true, counterAt: 0, hitIndex: 1 });
  });
});

describe('derrotar x capturar', () => {
  it('enfraquecer aumenta a chance de captura', () => {
    const { foe } = battle();
    const full = captureChancePercent(foe, 'POKE_BALL');
    const weak = captureChancePercent({ ...foe, hp: Math.ceil(foe.maxHp / 5) }, 'POKE_BALL');
    expect(weak).toBeGreaterThan(full);
    expect(captureChancePercent(foe, 'GREAT_BALL')).toBeGreaterThan(full);
  });

  it('derrotar dá XP e pontos, mas não captura', () => {
    const base = battle();
    const won = attack({ ...base, foe: { ...base.foe, hp: 1 } }, 'brasa');
    expect(won.status).toBe('won');
    expect(won.lastCapture).toBeNull();
    const rewards = rewardsFor(won);
    expect(rewards.xpByCreature.a).toBeGreaterThan(0);
    expect(rewards.points).toBeGreaterThan(0);
  });
});
