// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { integrationAppearance } from '../data/integrationEvent.js';
import { IntegrationAnnouncement } from './IntegrationAnnouncement.js';

const windowStart = Date.parse('2026-11-18T17:00:00-03:00');
const event = integrationAppearance(new Date(windowStart + 29.5 * 60_000))
  ?? integrationAppearance(new Date(windowStart + 30 * 60_000))!;

afterEach(() => vi.useRealTimers());

it('anuncia o setor no início e fecha o aviso após 15 segundos', () => {
  vi.useFakeTimers();
  vi.setSystemTime(event.begins - 1000);
  const view = render(<IntegrationAnnouncement />);
  expect(screen.queryByRole('status')).toBeNull();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole('status').textContent).toContain(event.sector);
  act(() => vi.advanceTimersByTime(15_000));
  expect(screen.queryByRole('status')).toBeNull();
  view.unmount();
});

it('não repete o anúncio para quem abre o jogo após o início', () => {
  vi.useFakeTimers();
  vi.setSystemTime(event.begins + 1000);
  const view = render(<IntegrationAnnouncement />);
  expect(screen.queryByRole('status')).toBeNull();
  view.unmount();
});
