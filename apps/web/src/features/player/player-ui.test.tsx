// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as music from '../audio/music.js';
import { CaptureThrow, SHAKE_INTERVAL_MS } from '../battle/components/CaptureThrow.js';
import { toCombatant } from '../battle/battleState.js';
import { CollectionPage } from '../collection/pages/CollectionPage.js';
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
    fireEvent.click(screen.getByRole('radio', { name: /Agronomia/ }));
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    expect(screen.getByRole('status').textContent).toMatch(/Salvo/);
  });
});

describe('TeamPage', () => {
  it('adiciona da coleção e não deixa a equipe vazia', () => {
    render(<PlayerProvider initial={player}><TeamPage /></PlayerProvider>);
    const removeBrasinha = screen.getByRole('button', { name: 'Tirar Charmander da equipe' }) as HTMLButtonElement;
    expect(removeBrasinha.disabled).toBe(true);
    const add = screen.getByText('Bulbasaur ×1').closest('details')!;
    add.open = true;
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(screen.getByRole('button', { name: 'Tirar Bulbasaur da equipe' })).toBeTruthy();
    expect(removeBrasinha.disabled).toBe(false);
  });
});

describe('CaptureThrow', () => {
  const foe = toCombatant('faiscao', 12, 9);

  it('captura só depois de 3 chacoalhadas', () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    render(<CaptureThrow ball="GREAT_BALL" foe={foe} shakes={3} canRetry onContinue={onContinue} onRetry={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Great Ball' })).toBeTruthy();
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

it('shows owned species details in the Pokedex and keeps unknown species hidden', () => {
  render(<PlayerProvider initial={player}><CollectionPage /></PlayerProvider>);
  expect(screen.getByRole('button', { name: 'Charmander' })).toBeTruthy();
  expect(screen.getAllByText('???').length).toBeGreaterThan(0);
  const search = screen.getByRole('searchbox');
  fireEvent.change(search, { target: { value: '#002' } });
  const missing = screen.getByText('#002').closest('article')!;
  expect(missing.textContent).toContain('Falta achar');
  expect(missing.querySelector('.brightness-0 img')).toBeTruthy();
  fireEvent.click(missing);
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.change(search, { target: { value: 'Squirtle' } });
  expect(screen.queryByText('#002')).toBeNull();
  fireEvent.change(search, { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Raro' }));
  expect(screen.getByText('#006')).toBeTruthy();
  expect(screen.queryByText('#001')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
  expect(screen.getByText('#001')).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Charmander' } });
  expect(screen.queryByRole('button', { name: 'Bulbasaur' })).toBeNull();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true; } });
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Charmander' }));
    expect(screen.getByRole('dialog', { name: 'Charmander' })).toBeTruthy();
    expect(screen.getByText('Medicina Veterinária')).toBeTruthy();
    expect(screen.queryByText('Evoluir para Charmeleon')).toBeNull();
    fireEvent.click(screen.getByText('Fechar'));
    expect(screen.queryByRole('dialog')).toBeNull();
  } finally {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  }
});

it('evolui o exemplar pelo álbum e revela a nova forma', async () => {
  const play = vi.spyOn(music, 'playTrack').mockResolvedValue(true);
  const stop = vi.spyOn(music, 'stopMusic').mockImplementation(() => {});
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) { this.open = true; },
  });
  try {
    render(<PlayerProvider initial={player}><TeamPage /></PlayerProvider>);
    const evolve = screen.getByText('Evoluir para Charmeleon');
    evolve.closest('details')!.open = true;
    fireEvent.click(evolve);
    const dialog = await screen.findByRole('dialog', { name: 'Charmander evoluiu para Charmeleon!' });
    expect(dialog.querySelectorAll('img')).toHaveLength(2);
    expect(play).toHaveBeenCalledExactlyOnceWith('evolution');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(stop).toHaveBeenCalledWith(false, 'evolution');
    expect(screen.queryByText('Charmander ×1')).toBeNull();
    expect(screen.getByText('Charmeleon ×1')).toBeTruthy();
    expect(screen.queryByText('Evoluir para Charmeleon')).toBeNull();
    expect(screen.getByText('Charmeleon', { selector: 'h2' })).toBeTruthy();
    expect(screen.getByText('Evolui no Nv. 16')).toBeTruthy();
  } finally {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    play.mockRestore();
    stop.mockRestore();
  }
});

it('filtra os exemplares por setor antes de contar e ordenar as espécies', () => {
  const creatures = [
    { ...newCreature('a', 'brasinha', 15, AT), sector: { id: 'vet', name: 'Veterinária' } },
    { ...newCreature('b', 'brasinha', 6, AT), sector: { id: 'bio', name: 'Biologia' } },
    { ...newCreature('c', 'brotinho', 10, AT), sector: { id: 'bio', name: 'Biologia' } },
  ];
  const { container } = render(<PlayerProvider initial={{ ...player, creatures }}><TeamPage /></PlayerProvider>);
  const names = () => Array.from(container.querySelectorAll('summary strong'), el => el.textContent);
  expect(names()).toEqual(['Bulbasaur ×1', 'Charmander ×2']);
  fireEvent.change(screen.getByLabelText('Ordenar'), { target: { value: 'level' } });
  expect(names()).toEqual(['Charmander ×2', 'Bulbasaur ×1']);
  fireEvent.change(screen.getByLabelText('Setor'), { target: { value: 'Medicina Veterinária' } });
  expect(names()).toEqual(['Charmander ×2']);
});
