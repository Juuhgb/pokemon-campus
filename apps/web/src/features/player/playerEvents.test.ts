import { describe, expect, it } from 'vitest';
import { foldPlayerEvents, lastProfileEventId, legacyImportEvent, type EventAction, type PlayerEvent } from './playerEvents.js';
import { INITIAL_PLAYER, newCreature } from './playerState.js';

const AT = '2026-11-04T15:00:00.000Z';
let counter = 0;
const ev = (deviceId: string, at: number, action: EventAction, extra: Partial<PlayerEvent> = {}): PlayerEvent => ({
  id: extra.id ?? `${deviceId}-${at}-${counter++}`,
  deviceId,
  at,
  action,
  ...extra,
});

const starter = (deviceId: string, at: number, speciesId = 'brasinha') =>
  ev(deviceId, at, { type: 'onboard', starterSpeciesId: speciesId, creatureId: `${deviceId}-starter`, at: AT });

const battle = (deviceId: string, at: number, spawnId: string, points = 100) =>
  ev(deviceId, at, {
    type: 'settleBattle', battleId: `${deviceId}-${spawnId}`, spawnId, points, xpByCreature: {},
    captured: { creatureId: `${deviceId}-${spawnId}-caught`, speciesId: 'gotinha', level: 5, at: AT },
  });

describe('foldPlayerEvents', () => {
  it('qualquer ordem de chegada dá o mesmo estado (ordem por horário e id)', () => {
    const events = [starter('a', 1), battle('a', 2, 's1'), ev('a', 3, { type: 'useBall', item: 'POKE_BALL' })];
    const forward = foldPlayerEvents(INITIAL_PLAYER, events).player;
    const backward = foldPlayerEvents(INITIAL_PLAYER, [...events].reverse()).player;
    expect(backward).toEqual(forward);
    expect(forward).toMatchObject({ onboarded: true, captures: 1, score: 100 });
    expect(forward.inventory.POKE_BALL).toBe(INITIAL_PLAYER.inventory.POKE_BALL - 1);
  });

  it('evento repetido (mesmo id) conta uma vez só', () => {
    const capture = battle('a', 2, 's1');
    const { player } = foldPlayerEvents(INITIAL_PLAYER, [starter('a', 1), capture, { ...capture }, capture]);
    expect(player.captures).toBe(1);
    expect(player.score).toBe(100);
  });

  it('inicial escolhido em dois aparelhos offline: vale o primeiro', () => {
    const { player, conflicts } = foldPlayerEvents(INITIAL_PLAYER, [starter('b', 20, 'gotinha'), starter('a', 10, 'brotinho')]);
    expect(player.creatures.map((creature) => creature.speciesId)).toEqual(['brotinho']);
    expect(conflicts).toMatchObject([{ kind: 'duplicate-starter' }]);
  });

  it('mesmo Pokémon selvagem nos dois aparelhos: só a primeira batalha conta', () => {
    const { player, conflicts } = foldPlayerEvents(INITIAL_PLAYER, [starter('a', 1), battle('b', 30, 's9'), battle('a', 20, 's9')]);
    expect(player.captures).toBe(1);
    expect(player.score).toBe(100);
    expect(player.creatures.some((creature) => creature.id === 'a-s9-caught')).toBe(true);
    expect(conflicts).toMatchObject([{ kind: 'duplicate-capture' }]);
  });

  it('bolas gastas além do estoque em dois aparelhos: o excedente é descartado', () => {
    const base = { ...INITIAL_PLAYER, onboarded: true, inventory: { POKE_BALL: 1, GREAT_BALL: 0 } };
    const { player, conflicts } = foldPlayerEvents(base, [
      ev('a', 1, { type: 'useBall', item: 'POKE_BALL' }),
      ev('b', 2, { type: 'useBall', item: 'POKE_BALL' }),
    ]);
    expect(player.inventory.POKE_BALL).toBe(0);
    expect(conflicts).toMatchObject([{ kind: 'no-balls' }]);
  });

  it('perfil alterado em dois aparelhos sem um saber do outro: vale o mais recente e o conflito é registrado', () => {
    const base = ev('a', 1, { type: 'updateProfile', displayName: 'Ana', course: 'biologia' }, { id: 'p0', basis: null });
    const fromA = ev('a', 10, { type: 'updateProfile', displayName: 'Ana A', course: 'biologia' }, { id: 'pa', basis: 'p0' });
    const fromB = ev('b', 12, { type: 'updateProfile', displayName: 'Ana B', course: 'agronomia' }, { id: 'pb', basis: 'p0' });
    const { player, conflicts } = foldPlayerEvents(INITIAL_PLAYER, [fromB, base, fromA]);
    expect(player).toMatchObject({ displayName: 'Ana B', course: 'agronomia' });
    expect(conflicts).toMatchObject([{ kind: 'concurrent-profile', eventId: 'pa', winnerId: 'pb' }]);
  });

  it('alteração de perfil que já conhecia a anterior não é conflito', () => {
    const first = ev('a', 1, { type: 'updateProfile', displayName: 'Ana', course: 'biologia' }, { id: 'p1', basis: null });
    const second = ev('b', 5, { type: 'updateProfile', displayName: 'Aninha', course: 'biologia' }, { id: 'p2', basis: 'p1' });
    const { player, conflicts } = foldPlayerEvents(INITIAL_PLAYER, [first, second]);
    expect(player.displayName).toBe('Aninha');
    expect(conflicts).toEqual([]);
    expect(lastProfileEventId([first, second])).toBe('p2');
  });

  it('progresso da versão antiga entra uma vez, como evento', () => {
    const stored = { ...INITIAL_PLAYER, onboarded: true, score: 50, creatures: [newCreature('c', 'brasinha', 7, AT)], team: ['c'] };
    const legacy = legacyImportEvent(stored, 'a', 1, 'legacy')!;
    const { player } = foldPlayerEvents(INITIAL_PLAYER, [legacy, battle('a', 2, 's1')]);
    expect(player).toMatchObject({ onboarded: true, score: 150, team: ['c', 'a-s1-caught'] });
    expect(legacyImportEvent(INITIAL_PLAYER, 'a', 1, 'x')).toBeNull();
  });
});
