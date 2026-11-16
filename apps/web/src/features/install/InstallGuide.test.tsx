// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FirstVisitInstallGuide } from './FirstVisitInstallGuide.js';
import { InstallGuide } from './InstallGuide.js';
import { detectPlatform, hasSeenInstallGuide, shouldShowInstallGuide } from './installPrompt.js';

function setStandalone(standalone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: standalone && query.includes('standalone'), media: query, addEventListener() {}, removeEventListener() {} }));
}

beforeEach(() => {
  window.localStorage.clear();
  setStandalone(false);
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
    const first = render(<FirstVisitInstallGuide />);
    expect(screen.getByRole('dialog', { name: 'Coloque o jogo na tela inicial' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(hasSeenInstallGuide()).toBe(true);
    first.unmount();

    render(<FirstVisitInstallGuide />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('não aparece quando o jogo já está aberto como app instalado', () => {
    setStandalone(true);
    expect(shouldShowInstallGuide()).toBe(false);
    render(<FirstVisitInstallGuide />);
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
