// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CaptureThrow, SHAKE_INTERVAL_MS } from '../battle/components/CaptureThrow.js';
import { toCombatant } from '../battle/battleState.js';
import { TeamPage } from '../collection/pages/TeamPage.js';
import { SettingsPage } from '../profile/pages/SettingsPage.js';
import { PlayerProvider } from './PlayerProvider.js';
import { INITIAL_PLAYER, newCreature, type PlayerState } from './playerState.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const AT = '2026-11-04T15:00:00.000Z';
const player: PlayerState = {
  ...INITIAL_PLAYER,
  onboarded: true,
  displayName: 'Ana Lima',
  creatures: [newCreature('a', 'brasinha', 15, AT), newCreature('b', 'brotinho', 6, AT)],
  team: ['a'],
};

describe('SettingsPage', () => {
  it('só salva com mudança válida e mostra a confirmação', () => {
    render(<PlayerProvider initial={player}><SettingsPage /></PlayerProvider>);
    const save = screen.getByRole('button', { name: 'Salvar alterações' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    const input = screen.getByLabelText('Nome no jogo');
    fireEvent.change(input, { target: { value: '   ' } });
    expect(save.disabled).toBe(true);
    expect(screen.getByText(/pelo menos 1 caractere/)).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Aninha' } });
    fireEvent.click(screen.getByRole('radio', { name: /Biologia/ }));
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    expect(screen.getByRole('status').textContent).toMatch(/Salvo/);
  });
});

describe('TeamPage', () => {
  it('adiciona da coleção e não deixa a equipe vazia', () => {
    render(<PlayerProvider initial={player}><TeamPage /></PlayerProvider>);
    const removeBrasinha = screen.getByRole('button', { name: 'Tirar Brasinha da equipe' }) as HTMLButtonElement;
    expect(removeBrasinha.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(screen.getByRole('button', { name: 'Tirar Brotinho da equipe' })).toBeTruthy();
    expect(removeBrasinha.disabled).toBe(false);
  });
});

describe('CaptureThrow', () => {
  const foe = toCombatant('faiscao', 12, 9);

  it('captura só depois de 3 chacoalhadas', () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    render(<CaptureThrow ball="GREAT_BALL" foe={foe} shakes={3} canRetry onContinue={onContinue} onRetry={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Grande bola' })).toBeTruthy();
    act(() => { vi.advanceTimersByTime(900 + SHAKE_INTERVAL_MS * 3); });
    expect(screen.queryByText('Pegou!')).toBeNull();
    act(() => { vi.advanceTimersByTime(SHAKE_INTERVAL_MS); });
    expect(screen.getByText('Pegou!')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(onContinue).toHaveBeenCalled();
  });

  it('com menos de 3 chacoalhadas o Pokémon escapa', () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    render(<CaptureThrow ball="POKE_BALL" foe={foe} shakes={2} canRetry onContinue={vi.fn()} onRetry={onRetry} onBack={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(900 + SHAKE_INTERVAL_MS * 3); });
    expect(screen.getByText('Escapou!')).toBeTruthy();
    expect(screen.getByText(/Chacoalhou só 2 vezes/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
