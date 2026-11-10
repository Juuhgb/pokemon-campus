// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BattleProvider, useBattle } from '../battle/BattleProvider.js';
import { toCombatant } from '../battle/battleState.js';
import { CaptureThrow, SHAKE_INTERVAL_MS } from '../battle/components/CaptureThrow.js';
import type { EncounterStartRequest } from '../exploration/types.js';
import { newCreature } from '../player/playerState.js';
import { currentTrack, playTrack, resetMusicForTests, setMusicEnabled, stopMusic, TRACKS } from './music.js';
import { OpeningMusic } from './OpeningMusic.js';
import { resetSfxForTests, SFX } from './sfx.js';

const played: string[] = [];
let pauses = 0;

class FakeAudio {
  src = '';
  loop = false;
  preload = '';
  volume = 1;
  currentTime = 0;
  paused = true;
  addEventListener() {}
  play() {
    this.paused = false;
    played.push(this.src);
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    pauses += 1;
  }
}

const REQUEST = { spawnId: 'mock-1-z-0', speciesId: 'gotinha', level: 5 } as EncounterStartRequest;
const TEAM = [newCreature('a', 'brasinha', 10, '2026-11-04T15:00:00.000Z')];

let controls: ReturnType<typeof useBattle> | null = null;
function Probe() {
  controls = useBattle();
  return null;
}

beforeEach(() => {
  vi.stubGlobal('Audio', FakeAudio);
  resetMusicForTests();
  resetSfxForTests();
  played.length = 0;
  pauses = 0;
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('músicas', () => {
  it('abertura no primeiro toque do jogador, uma vez só', () => {
    render(<OpeningMusic />);
    expect(played).toEqual([]);
    fireEvent.pointerDown(document.body);
    fireEvent.pointerDown(document.body);
    expect(played).toEqual([TRACKS.opening.src]);
    expect(currentTrack()).toBe('opening');
  });

  it('batalha em loop ao começar; ao sair da batalha volta a abertura', () => {
    render(<BattleProvider><Probe /></BattleProvider>);
    act(() => controls!.start(REQUEST, TEAM));
    expect(played).toEqual([TRACKS.battle.src]);
    expect(currentTrack()).toBe('battle');
    act(() => controls!.end());
    expect(played).toEqual([TRACKS.battle.src, TRACKS.opening.src]);
    expect(currentTrack()).toBe('opening');
  });

  it('vitória substitui a batalha e para ao sair da tela de resultado', () => {
    render(<BattleProvider><Probe /></BattleProvider>);
    act(() => controls!.start(REQUEST, TEAM));
    playTrack('victory');
    expect(currentTrack()).toBe('victory');
    act(() => controls!.end());
    expect(played).toEqual([TRACKS.battle.src, TRACKS.victory.src, TRACKS.opening.src]);
    expect(currentTrack()).toBe('opening');
  });

  it('parar com fade abaixa o volume aos poucos', () => {
    vi.useFakeTimers();
    playTrack('battle');
    stopMusic(true);
    expect(pauses).toBe(0);
    vi.advanceTimersByTime(1_000);
    expect(pauses).toBe(1);
    expect(currentTrack()).toBeNull();
  });

  it('não toca nada quando o jogador desligou as músicas', () => {
    setMusicEnabled(false);
    render(<BattleProvider><Probe /></BattleProvider>);
    act(() => controls!.start(REQUEST, TEAM));
    playTrack('victory');
    expect(played).toEqual([]);
  });

  it('Pokébola: som de chacoalhar durante as chacoalhadas e de captura quando pega', () => {
    vi.useFakeTimers();
    render(<CaptureThrow ball="POKE_BALL" foe={toCombatant('faiscao', 12, 9)} shakes={3} canRetry onContinue={vi.fn()} onRetry={vi.fn()} onBack={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(900); });
    expect(played).toEqual([SFX.shake.src]);
    act(() => { vi.advanceTimersByTime(SHAKE_INTERVAL_MS * 4); });
    expect(played).toEqual([SFX.shake.src, SFX.catch.src]);
  });

  it('Pokébola que abre na hora não toca nada; a que escapa não toca o som de captura', () => {
    vi.useFakeTimers();
    render(<CaptureThrow ball="POKE_BALL" foe={toCombatant('faiscao', 12, 9)} shakes={1} canRetry onContinue={vi.fn()} onRetry={vi.fn()} onBack={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(900 + SHAKE_INTERVAL_MS * 3); });
    expect(played).toEqual([SFX.shake.src]);
  });

  it('desligar para a música; religar volta a abertura', () => {
    playTrack('opening');
    setMusicEnabled(false);
    expect(currentTrack()).toBeNull();
    setMusicEnabled(true);
    expect(currentTrack()).toBe('opening');
    expect(played).toEqual([TRACKS.opening.src, TRACKS.opening.src]);
  });
});
