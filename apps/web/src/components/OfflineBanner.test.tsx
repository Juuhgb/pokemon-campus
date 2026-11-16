// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let connection: 'online' | 'offline' | 'server-unavailable' = 'offline';
vi.mock('../features/player/PlayerProvider.js', () => ({
  useSync: () => ({ connection, enabled: true, pending: 0, signedIn: true }),
}));

const { OfflineBanner, OFFLINE_NOTICE_MS } = await import('./ConnectionStatus.js');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('aviso de offline', () => {
  it('some sozinho depois de alguns segundos', () => {
    vi.useFakeTimers();
    connection = 'offline';
    render(<OfflineBanner />);
    expect(screen.getByText(/jogando offline/)).toBeTruthy();
    act(() => { vi.advanceTimersByTime(OFFLINE_NOTICE_MS); });
    expect(screen.queryByText(/jogando offline/)).toBeNull();
  });

  it('pode ser fechado e volta a aparecer quando o estado muda', () => {
    connection = 'offline';
    const view = render(<OfflineBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByText(/jogando offline/)).toBeNull();
    connection = 'server-unavailable';
    view.rerender(<OfflineBanner />);
    expect(screen.getByText(/servidor não está respondendo/)).toBeTruthy();
  });
});
