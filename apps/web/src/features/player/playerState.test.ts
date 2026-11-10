import { describe, expect, it } from 'vitest';
import { rankingFor } from '../profile/ranking.js';
import { countBySpecies, INITIAL_PLAYER, initials, parseStoredPlayer, playerReducer, type PlayerState, ballCount, ballCountLabel, GREAT_BALLS_PER_CAPTURE } from './playerState.js';

const AT = '2026-11-04T15:00:00.000Z';
const onboarded = (): PlayerState => playerReducer(INITIAL_PLAYER, { type: 'onboard', starterSpeciesId: 'gotinha', creatureId: 's', at: AT });

describe('playerReducer', () => {
  it('onboarding cria o inicial no nível 5 e coloca na equipe', () => {
    const state = onboarded();
    expect(state.onboarded).toBe(true);
    expect(state.creatures).toEqual([expect.objectContaining({ id: 's', speciesId: 'gotinha', level: 5 })]);
    expect(state.team).toEqual(['s']);
  });

  it('não refaz o onboarding', () => {
    const state = onboarded();
    expect(playerReducer(state, { type: 'onboard', starterSpeciesId: 'brasinha', creatureId: 'x', at: AT })).toBe(state);
  });

  it('atualiza nome (com trim e limite) e curso, mas ignora nome vazio', () => {
    const state = playerReducer(onboarded(), { type: 'updateProfile', displayName: '  Ana  ', course: 'biologia' });
    expect(state).toMatchObject({ displayName: 'Ana', course: 'biologia' });
    expect(playerReducer(state, { type: 'updateProfile', displayName: '   ', course: 'agronomia' })).toBe(state);
    expect(playerReducer(state, { type: 'updateProfile', displayName: 'x'.repeat(60), course: 'biologia' }).displayName).toHaveLength(40);
  });

  it('vincula e desvincula a conta Google', () => {
    const linked = playerReducer(INITIAL_PLAYER, { type: 'linkGoogle', email: 'a@exemplo.com' });
    expect(linked.googleEmail).toBe('a@exemplo.com');
    expect(playerReducer(linked, { type: 'unlinkGoogle' }).googleEmail).toBeNull();
  });

  it('equipe tem no máximo 3 e nunca fica vazia', () => {
    let state = onboarded();
    for (const id of ['c1', 'c2', 'c3']) state = playerReducer(state, { type: 'capture', creatureId: id, speciesId: 'brotinho', level: 4, at: AT });
    expect(state.team).toEqual(['s', 'c1', 'c2']);
    expect(playerReducer(state, { type: 'addToTeam', creatureId: 'c3' }).team).toHaveLength(3);
    const solo = playerReducer(playerReducer(state, { type: 'removeFromTeam', creatureId: 'c1' }), { type: 'removeFromTeam', creatureId: 'c2' });
    expect(solo.team).toEqual(['s']);
    expect(playerReducer(solo, { type: 'removeFromTeam', creatureId: 's' }).team).toEqual(['s']);
  });

  it('Pokébola clássica é infinita; Grande bola gasta sem ficar negativa', () => {
    const start = { ...INITIAL_PLAYER, inventory: { POKE_BALL: 0, GREAT_BALL: 1 } };
    expect(playerReducer(start, { type: 'useBall', item: 'POKE_BALL' })).toBe(start);
    expect(ballCount(start, 'POKE_BALL')).toBe(Infinity);
    expect(ballCountLabel(start, 'POKE_BALL')).toBe('∞');
    const used = playerReducer(start, { type: 'useBall', item: 'GREAT_BALL' });
    expect(used.inventory.GREAT_BALL).toBe(0);
    expect(playerReducer(used, { type: 'useBall', item: 'GREAT_BALL' })).toBe(used);
  });

  it('começa sem Grande bola e ganha 3 a cada captura', () => {
    expect(INITIAL_PLAYER.inventory.GREAT_BALL).toBe(0);
    const caught = playerReducer(onboarded(), { type: 'capture', creatureId: 'c', speciesId: 'gotinha', level: 5, at: AT });
    expect(caught.inventory.GREAT_BALL).toBe(GREAT_BALLS_PER_CAPTURE);
    expect(GREAT_BALLS_PER_CAPTURE).toBe(3);
  });

  it('ao fim da batalha soma pontos, XP e sobe de nível', () => {
    const state = playerReducer(onboarded(), { type: 'battleFinished', xpByCreature: { s: 250 }, points: 120 });
    expect(state.score).toBe(120);
    expect(state.battles).toBe(1);
    expect(state.creatures[0]!.level).toBeGreaterThan(5);
    expect(state.creatures[0]!.hp).toBe(state.creatures[0]!.maxHp);
  });
});

describe('utilitários do jogador', () => {
  it('lê o estado salvo e recusa dados inválidos', () => {
    const state = onboarded();
    expect(parseStoredPlayer(JSON.stringify(state))).toEqual(state);
    expect(parseStoredPlayer('{quebrado')).toBe(INITIAL_PLAYER);
    expect(parseStoredPlayer(JSON.stringify({ version: 2 }))).toBe(INITIAL_PLAYER);
  });

  it('conta criaturas por espécie e gera iniciais', () => {
    expect(countBySpecies([{ speciesId: 'a' }, { speciesId: 'a' }, { speciesId: 'b' }] as never).get('a')).toBe(2);
    expect(initials('Ana Lima')).toBe('AL');
    expect(initials('jogador')).toBe('JO');
  });

  it('o ranking inclui o jogador e filtra por curso', () => {
    const player = { displayName: 'Você', course: 'enfermagem' as const, score: 1000 };
    const all = rankingFor(player, 'all');
    expect(all.find((row) => row.me)?.rank).toBe(5);
    expect(rankingFor(player, 'course').every((row) => row.course === 'enfermagem')).toBe(true);
  });
});

it('settles capture, XP and score atomically and ignores replay after restoring saved state', () => {
  const action = { type: 'settleBattle' as const, battleId: 'battle-1', points: 110, xpByCreature: { s: 25 },
    captured: { creatureId: 'caught', speciesId: 'brasinha', level: 5, at: AT } };
  const once = playerReducer(onboarded(), action);
  expect(once.captures).toBe(1);
  expect(once.battles).toBe(1);
  expect(once.score).toBe(110);
  expect(once.creatures[0]!.xp).toBe(25);
  const restored = parseStoredPlayer(JSON.stringify(once));
  expect(playerReducer(restored, action)).toBe(restored);
});
