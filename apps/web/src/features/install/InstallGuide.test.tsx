// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { navigate, ROUTES } from '../../app/router.js';
import { PlayerProvider } from '../player/PlayerProvider.js';
import { INITIAL_PLAYER, type PlayerState } from '../player/playerState.js';
import { FirstVisitInstallGuide } from './FirstVisitInstallGuide.js';
import { InstallGuide } from './InstallGuide.js';
import { detectPlatform, hasSeenInstallGuide, shouldShowInstallGuide } from './installPrompt.js';

function setStandalone(standalone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: standalone && query.includes('standalone'), media: query, addEventListener() {}, removeEventListener() {} }));
}

const ONBOARDED: PlayerState = { ...INITIAL_PLAYER, onboarded: true, googleEmail: 'ana@gmail.com' };
const Guide = ({ player = ONBOARDED }: { player?: PlayerState }) => (
  <PlayerProvider initial={player}><FirstVisitInstallGuide /></PlayerProvider>
);

beforeEach(() => {
  window.localStorage.clear();
  setStandalone(false);
  navigate(ROUTES.map, { replace: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('guia de instalação na tela inicial', () => {
  it('reconhece iPhone, iPad, Android e computador', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 5)).toBe('ios'); // iPad
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile')).toBe('android');
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
  });

  it('aparece só na primeira vez: depois de "Entendi" não volta', () => {
    const first = render(<Guide />);
    expect(screen.getByRole('dialog', { name: 'Coloque o jogo na tela inicial' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(hasSeenInstallGuide()).toBe(true);
    first.unmount();

    render(<Guide />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('só aparece depois do começo do jogo (login, curso, Pokémon inicial)', () => {
    navigate(ROUTES.course, { replace: true });
    const onboarding = render(<Guide player={{ ...INITIAL_PLAYER, googleEmail: 'ana@gmail.com' }} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    onboarding.unmount();

    navigate(ROUTES.location, { replace: true });
    const location = render(<Guide />);
    expect(screen.queryByRole('dialog')).toBeNull(); // ainda no último passo do começo
    location.unmount();

    navigate(ROUTES.map, { replace: true });
    render(<Guide />);
    expect(screen.getByRole('dialog', { name: 'Coloque o jogo na tela inicial' })).toBeTruthy();
  });

  it('não aparece quando o jogo já está aberto como app instalado', () => {
    setStandalone(true);
    expect(shouldShowInstallGuide()).toBe(false);
    render(<Guide />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('mostra os passos certos para cada celular', () => {
    const ios = render(<InstallGuide platform="ios" onClose={() => {}} />);
    expect(screen.getByText('Adicionar à Tela de Início')).toBeTruthy();
    expect(screen.getByText(/abra o link no Safari/)).toBeTruthy();
    ios.unmount();
    render(<InstallGuide platform="android" onClose={() => {}} />);
    expect(screen.getByText('Instalar app')).toBeTruthy();
  });
});
