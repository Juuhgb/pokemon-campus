// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EncounterStartRequest } from '../../exploration/types.js';
import { newCreature } from '../../player/playerState.js';
import { BattleProvider, useBattle } from '../BattleProvider.js';
import { hitTimesMs } from '../turnAnimation.js';
import { BattlePage } from './BattlePage.js';

const REQUEST = { spawnId: 'mock-1-z-0', speciesId: 'faiscao', level: 12 } as EncounterStartRequest;
const TEAM = [newCreature('a', 'brasinha', 15, '2026-11-04T15:00:00.000Z')];

function Starter() {
  const { battle, start } = useBattle();
  return battle ? <BattlePage /> : <button type="button" onClick={() => start(REQUEST, TEAM)}>começar</button>;
}

/** Texto "PV x/y" de cada cartão: [adversário, jogador]. */
const hpTexts = () => screen.getAllByText(/^PV \d+\/\d+/).map((element) => element.textContent!.match(/PV (\d+)/)![1]);

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('Audio', class { src = ''; play() { return Promise.resolve(); } pause() {} addEventListener() {} });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('dano na hora certa', () => {
  it('a vida de cada Pokémon só cai quando o golpe dele acerta', () => {
    render(<BattleProvider><Starter /></BattleProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'começar' }));
    const [foeStart, meStart] = hpTexts();

    fireEvent.click(screen.getByRole('button', { name: /Atacar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Brasa/ }));
    // Logo depois do toque: ninguém perdeu vida ainda.
    expect(hpTexts()).toEqual([foeStart, meStart]);

    const times = hitTimesMs({ counterAt: 0.85 } as never);
    act(() => { vi.advanceTimersByTime(times.foe); });
    const [foeAfterHit, meBeforeCounter] = hpTexts();
    expect(Number(foeAfterHit)).toBeLessThan(Number(foeStart)); // o adversário apanhou
    expect(meBeforeCounter).toBe(meStart); // o jogador ainda não

    act(() => { vi.advanceTimersByTime(times.player - times.foe); });
    expect(Number(hpTexts()[1])).toBeLessThan(Number(meStart)); // agora o contra-ataque acertou
  });
});
