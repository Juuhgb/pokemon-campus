import type { GeoPoint, LocationError, LocationFix } from '../types.js';

/** Fonte de localização desacoplada do navegador (permite GPS real, simulado ou fakes em teste). */
export interface LocationProvider {
  /** Começa a observar a posição. Retorna a função que cancela a observação. */
  watch(onFix: (fix: LocationFix) => void, onError: (error: LocationError) => void): () => void;
}

export const DEFAULT_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 20_000,
};

const MESSAGES: Record<LocationError['code'], string> = {
  unsupported: 'Este dispositivo ou navegador não oferece localização.',
  'permission-denied': 'Permissão de localização negada. Ative-a nas configurações do navegador para explorar o campus.',
  'position-unavailable': 'Não foi possível obter sua posição. Verifique se o GPS está ligado e tente ao ar livre.',
  timeout: 'O GPS demorou para responder. Tentando novamente…',
};

export function locationError(code: LocationError['code']): LocationError {
  return { code, message: MESSAGES[code] };
}

/** Converte GeolocationPositionError (1, 2, 3) para o erro tipado do módulo. */
export function mapGeolocationError(error: Pick<GeolocationPositionError, 'code'>): LocationError {
  switch (error.code) {
    case 1:
      return locationError('permission-denied');
    case 3:
      return locationError('timeout');
    default:
      return locationError('position-unavailable');
  }
}

export function fixFromPosition(position: GeolocationPosition): LocationFix {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: position.coords.accuracy,
    timestamp: position.timestamp,
    source: 'gps',
  };
}

/** GPS real via Geolocation API (`watchPosition`). */
export function createBrowserLocationProvider(
  geolocation: Geolocation | undefined = typeof navigator === 'undefined' ? undefined : navigator.geolocation,
  options: PositionOptions = DEFAULT_WATCH_OPTIONS,
): LocationProvider {
  return {
    watch(onFix, onError) {
      if (!geolocation) {
        onError(locationError('unsupported'));
        return () => {};
      }

      const watchId = geolocation.watchPosition(
        (position) => onFix(fixFromPosition(position)),
        (error) => onError(mapGeolocationError(error)),
        options,
      );
      return () => geolocation.clearWatch(watchId);
    },
  };
}

/**
 * GPS simulado — existe somente em builds de desenvolvimento.
 * Em produção `import.meta.env.DEV` é substituído por `false` e o Vite remove o código.
 * Mesmo assim, a posição do cliente nunca é usada como autorização: o backend valida o encontro.
 */
export const SIMULATED_LOCATION_AVAILABLE: boolean = import.meta.env.DEV;

export function createSimulatedFix(point: GeoPoint, now: number = Date.now()): LocationFix {
  if (!SIMULATED_LOCATION_AVAILABLE) throw new Error('GPS simulado indisponível fora do ambiente de desenvolvimento.');
  return { latitude: point.latitude, longitude: point.longitude, accuracyMeters: 0, timestamp: now, source: 'simulated' };
}
