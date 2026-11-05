import { describe, expect, it, vi } from 'vitest';
import type { LocationError, LocationFix } from '../types.js';
import { createBrowserLocationProvider, createSimulatedFix, mapGeolocationError } from './location.js';

function fakeGeolocation() {
  let success: PositionCallback | undefined;
  let failure: PositionErrorCallback | null | undefined;
  const geolocation = {
    watchPosition: vi.fn((onSuccess: PositionCallback, onError?: PositionErrorCallback | null) => {
      success = onSuccess;
      failure = onError;
      return 42;
    }),
    clearWatch: vi.fn(),
    getCurrentPosition: vi.fn(),
  };
  return {
    geolocation: geolocation as unknown as Geolocation,
    raw: geolocation,
    emitPosition: (latitude: number, longitude: number, accuracy = 8) =>
      success?.({ coords: { latitude, longitude, accuracy }, timestamp: 1_000 } as GeolocationPosition),
    emitError: (code: number) => failure?.({ code, message: 'erro' } as GeolocationPositionError),
  };
}

describe('createBrowserLocationProvider', () => {
  it('informa "unsupported" quando o navegador não tem Geolocation API', () => {
    const onError = vi.fn<(error: LocationError) => void>();
    const stop = createBrowserLocationProvider(undefined).watch(vi.fn(), onError);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'unsupported' }));
    expect(() => stop()).not.toThrow();
  });

  it('usa watchPosition e converte a posição', () => {
    const fake = fakeGeolocation();
    const onFix = vi.fn<(fix: LocationFix) => void>();
    createBrowserLocationProvider(fake.geolocation).watch(onFix, vi.fn());
    fake.emitPosition(-23.11, -50.35);
    expect(fake.raw.watchPosition).toHaveBeenCalledOnce();
    expect(onFix).toHaveBeenCalledWith({ latitude: -23.11, longitude: -50.35, accuracyMeters: 8, timestamp: 1_000, source: 'gps' });
  });

  it('cancela a observação com clearWatch', () => {
    const fake = fakeGeolocation();
    const stop = createBrowserLocationProvider(fake.geolocation).watch(vi.fn(), vi.fn());
    stop();
    expect(fake.raw.clearWatch).toHaveBeenCalledWith(42);
  });

  it('trata permissão negada, posição indisponível e timeout', () => {
    const fake = fakeGeolocation();
    const onError = vi.fn<(error: LocationError) => void>();
    createBrowserLocationProvider(fake.geolocation).watch(vi.fn(), onError);
    fake.emitError(1);
    fake.emitError(2);
    fake.emitError(3);
    expect(onError.mock.calls.map(([error]) => error.code)).toEqual(['permission-denied', 'position-unavailable', 'timeout']);
    expect(onError.mock.calls.every(([error]) => error.message.length > 0)).toBe(true);
  });
});

describe('mapGeolocationError', () => {
  it('trata códigos desconhecidos como posição indisponível', () => {
    expect(mapGeolocationError({ code: 99 }).code).toBe('position-unavailable');
  });
});

describe('createSimulatedFix', () => {
  it('marca a posição como simulada em desenvolvimento', () => {
    const fix = createSimulatedFix({ latitude: 1, longitude: 2 }, 5);
    expect(fix).toEqual({ latitude: 1, longitude: 2, accuracyMeters: 0, timestamp: 5, source: 'simulated' });
  });
});
