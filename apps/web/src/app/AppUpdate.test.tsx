// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const updateServiceWorker = vi.fn(async () => {});
let needRefresh = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefresh, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  }),
}));

const { AppUpdateProvider, UpdateBanner } = await import('./AppUpdate.js');

afterEach(() => {
  cleanup();
  updateServiceWorker.mockClear();
  needRefresh = false;
});

describe('UpdateBanner', () => {
  it('não aparece quando não há versão nova', () => {
    render(<AppUpdateProvider><UpdateBanner /></AppUpdateProvider>);
    expect(screen.queryByText(/Nova versão/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Atualizar' })).toBeNull();
  });

  it('aparece quando há versão nova e o botão Atualizar aplica a atualização', () => {
    needRefresh = true;
    render(<AppUpdateProvider><UpdateBanner /></AppUpdateProvider>);
    expect(screen.getByText('Nova versão do jogo disponível!')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Atualizando…' })).toBeTruthy();
  });

  it('pode ser fechado para lembrar depois', () => {
    needRefresh = true;
    render(<AppUpdateProvider><UpdateBanner /></AppUpdateProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Lembrar depois' }));
    expect(screen.queryByText(/Nova versão/)).toBeNull();
  });
});
