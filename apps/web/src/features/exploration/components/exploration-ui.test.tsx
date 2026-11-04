// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGeolocation } from '../hooks/useGeolocation.js';
import type { LocationProvider } from '../services/location.js';
import { locationError } from '../services/location.js';
import type { ExplorationSpawn, LocationError, LocationFix } from '../types.js';
import { LocationNotice } from './LocationNotice.js';
import { EncounterSheet } from './EncounterSheet.js';
import { NearbyCards } from './NearbyCards.js';

afterEach(cleanup);

const NOW = new Date('2026-11-04T15:00:00.000Z');
const SPAWN: ExplorationSpawn = {
  spawnId: 'spawn-1',
  speciesId: 'faiscao',
  latitude: -23.113,
  longitude: -50.357,
  level: 12,
  rarity: 'rare',
  startsAt: '2026-11-04T14:30:00.000Z',
  expiresAt: '2026-11-04T15:30:00.000Z',
};

describe('EncounterSheet', () => {
  it('mostra espécie, nível, raridade e distância e habilita o botão dentro do alcance', () => {
    const onStart = vi.fn();
    render(
      <EncounterSheet spawn={SPAWN} eligibility={{ allowed: true, distanceMeters: 12 }} now={NOW} onStartEncounter={onStart} onClose={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'Faiscão' })).toBeTruthy();
    expect(screen.getByText('Nv. 12')).toBeTruthy();
    expect(screen.getByText('Raro')).toBeTruthy();
    expect(screen.getByText('12 m')).toBeTruthy();

    const button = screen.getByRole('button', { name: 'Batalhar / Capturar' }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(onStart).toHaveBeenCalledWith(SPAWN);
  });

  it('desabilita o botão e mostra quanto falta fora do alcance', () => {
    const onStart = vi.fn();
    render(
      <EncounterSheet
        spawn={SPAWN}
        eligibility={{ allowed: false, reason: 'out-of-range', distanceMeters: 80 }}
        now={NOW}
        onStartEncounter={onStart}
        onClose={vi.fn()}
      />,
    );
    const button = screen.getByRole('button', { name: 'Batalhar / Capturar' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText('80 m')).toBeTruthy();
    expect(screen.getByText(/Faltam 50 m/)).toBeTruthy();
    fireEvent.click(button);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('informa quando o spawn expirou', () => {
    render(
      <EncounterSheet
        spawn={SPAWN}
        eligibility={{ allowed: false, reason: 'expired', distanceMeters: 5 }}
        now={NOW}
        onStartEncounter={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/já foi embora/)).toBeTruthy();
  });
});

describe('LocationNotice', () => {
  it('mostra alerta claro quando a permissão é negada', () => {
    render(<LocationNotice status="error" error={locationError('permission-denied')} simulationAvailable={false} />);
    expect(screen.getByRole('alert').textContent).toMatch(/Permissão de localização negada/);
  });

  it('não renderiza nada quando a localização está pronta', () => {
    const { container } = render(<LocationNotice status="ready" error={null} simulationAvailable={false} />);
    expect(container.textContent).toBe('');
  });
});

describe('NearbyCards', () => {
  it('lista só os Pokémon dentro do alcance, com distância e direção', () => {
    const far = { ...SPAWN, spawnId: 'far', speciesId: 'gotinha' };
    const onSelect = vi.fn();
    render(
      <NearbyCards
        player={{ latitude: -23.1135, longitude: -50.357 }}
        nearby={[{ spawn: SPAWN, distanceMeters: 20 }, { spawn: far, distanceMeters: 900 }]}
        rangeMeters={250}
        onSelect={onSelect}
      />,
    );
    const card = screen.getByRole('button', { name: /Faiscão/ });
    expect(card.textContent).toMatch(/No alcance/);
    expect(screen.getByLabelText('Direção norte')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Gotinha/ })).toBeNull();
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith('spawn-1');
  });
});

describe('useGeolocation', () => {
  function controllableProvider() {
    let emitFix: (fix: LocationFix) => void = () => {};
    let emitError: (error: LocationError) => void = () => {};
    const provider: LocationProvider = {
      watch(onFix, onError) {
        emitFix = onFix;
        emitError = onError;
        return () => {};
      },
    };
    return { provider, emitFix: (fix: LocationFix) => emitFix(fix), emitError: (error: LocationError) => emitError(error) };
  }

  it('fica em erro quando a localização está indisponível', () => {
    const control = controllableProvider();
    const { result } = renderHook(() => useGeolocation(control.provider));
    expect(result.current.status).toBe('locating');
    act(() => control.emitError(locationError('position-unavailable')));
    expect(result.current.status).toBe('error');
    expect(result.current.position).toBeNull();
  });

  it('a simulação substitui o GPS real e pode ser desligada', () => {
    const control = controllableProvider();
    const { result } = renderHook(() => useGeolocation(control.provider));
    act(() => control.emitFix({ latitude: 1, longitude: 1, accuracyMeters: 5, timestamp: 1, source: 'gps' }));

    act(() => result.current.simulateAt({ latitude: 2, longitude: 2 }));
    expect(result.current.isSimulated).toBe(true);
    expect(result.current.position).toMatchObject({ latitude: 2, source: 'simulated' });

    act(() => result.current.stopSimulation());
    expect(result.current.isSimulated).toBe(false);
    expect(result.current.position).toMatchObject({ latitude: 1, source: 'gps' });
  });
});
