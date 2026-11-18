// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { integrationAppearance } from '../data/integrationEvent.js';
import { ANNOUNCEMENT_MS, IntegrationAnnouncement } from './IntegrationAnnouncement.js';

const windowStart = Date.parse('2026-11-18T17:00:00-03:00');
const event = integrationAppearance(new Date(windowStart + 29.5 * 60_000))
  ?? integrationAppearance(new Date(windowStart + 30 * 60_000))!;

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('anuncia o setor no início e fecha o aviso após 15 segundos', () => {
  vi.useFakeTimers();
  vi.setSystemTime(event.begins - 1000);
  render(<IntegrationAnnouncement />);
  expect(screen.queryByRole('status')).toBeNull();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole('status').textContent).toContain(event.sector);
  act(() => vi.advanceTimersByTime(ANNOUNCEMENT_MS));
  expect(screen.queryByRole('status')).toBeNull();
});

it('quem abre o jogo no meio da aparição também recebe o aviso', () => {
  vi.useFakeTimers();
  vi.setSystemTime(event.begins + 10 * 60_000);
  render(<IntegrationAnnouncement />);
  expect(screen.getByRole('status').textContent).toContain(event.sector);
});

it('o aviso aparece uma vez por aparição: depois de visto ou fechado, não volta', () => {
  vi.useFakeTimers();
  vi.setSystemTime(event.begins + 60_000);
  const first = render(<IntegrationAnnouncement />);
  fireEvent.click(screen.getByRole('button', { name: 'Fechar anúncio do evento' }));
  expect(screen.queryByRole('status')).toBeNull();
  first.unmount();

  render(<IntegrationAnnouncement />);
  expect(screen.queryByRole('status')).toBeNull();
});

it('não mostra nada fora da aparição', () => {
  vi.useFakeTimers();
  vi.setSystemTime(event.ends + 1000);
  render(<IntegrationAnnouncement />);
  expect(screen.queryByRole('status')).toBeNull();
});
