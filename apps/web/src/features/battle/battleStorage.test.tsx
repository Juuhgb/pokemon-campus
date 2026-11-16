// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { EncounterStartRequest } from '../exploration/types.js';
import { newCreature } from '../player/playerState.js';
import { BattleProvider, useBattle } from './BattleProvider.js';
import { loadBattle } from './battleStorage.js';

const REQUEST = { spawnId: 'mock-1-z-0', speciesId: 'gotinha', level: 5 } as EncounterStartRequest;
const TEAM = [newCreature('a', 'brasinha', 10, '2026-11-04T15:00:00.000Z')];

let controls: ReturnType<typeof useBattle> | null = null;
function Probe() {
  controls = useBattle();
  return null;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

describe('batalha em andamento salva no aparelho', () => {
  it('fechar e abrir o app no meio da batalha continua de onde parou', () => {
    const first = render(<BattleProvider persistAs="conta-a"><Probe /></BattleProvider>);
    act(() => controls!.start(REQUEST, TEAM));
    act(() => controls!.update((state) => ({ ...state, turn: 4, foe: { ...state.foe, hp: 3 } })));
    first.unmount(); // "fechou o app"

    render(<BattleProvider persistAs="conta-a"><Probe /></BattleProvider>);
    expect(controls!.battle).toMatchObject({ spawnId: 'mock-1-z-0', turn: 4, status: 'active', foe: { hp: 3 } });
  });

  it('ao terminar, a batalha sai do aparelho e o spawn vencido continua escondido no mapa', () => {
    render(<BattleProvider persistAs="conta-a"><Probe /></BattleProvider>);
    act(() => controls!.start(REQUEST, TEAM));
    act(() => controls!.update((state) => ({ ...state, status: 'captured' })));
    act(() => controls!.end());
    const saved = loadBattle('conta-a');
    expect(saved.battle).toBeNull();
    expect([...saved.finishedSpawnIds]).toEqual(['mock-1-z-0']);
  });

  it('outra conta não herda a batalha de ninguém', () => {
    render(<BattleProvider persistAs="conta-a"><Probe /></BattleProvider>);
    act(() => controls!.start(REQUEST, TEAM));
    expect(loadBattle('conta-b').battle).toBeNull();
    expect(loadBattle('conta-a').battle).not.toBeNull();
  });

  it('spawns resolvidos há mais de 3 horas deixam de ser lembrados', () => {
    render(<BattleProvider persistAs="conta-a"><Probe /></BattleProvider>);
    act(() => controls!.start(REQUEST, TEAM));
    act(() => controls!.update((state) => ({ ...state, status: 'won' })));
    act(() => controls!.end());
    expect(loadBattle('conta-a', Date.now() + 4 * 60 * 60 * 1000).finishedSpawnIds.size).toBe(0);
  });
});
