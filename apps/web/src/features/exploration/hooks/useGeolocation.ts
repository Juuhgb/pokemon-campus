import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createBrowserLocationProvider,
  createSimulatedFix,
  SIMULATED_LOCATION_AVAILABLE,
  type LocationProvider,
} from '../services/location.js';
import type { GeoPoint, LocationError, LocationFix } from '../types.js';

export type GeolocationStatus = 'locating' | 'ready' | 'error';

export interface GeolocationState {
  /** Posição efetiva (simulada, se ativa; senão a real). */
  position: LocationFix | null;
  /** Último erro do GPS real (ignorado enquanto a simulação estiver ativa). */
  error: LocationError | null;
  status: GeolocationStatus;
  isSimulated: boolean;
  simulationAvailable: boolean;
  /** Ativa/move a posição simulada (somente em desenvolvimento). */
  simulateAt: (point: GeoPoint) => void;
  /** Volta ao GPS real. */
  stopSimulation: () => void;
}

export function useGeolocation(provider?: LocationProvider): GeolocationState {
  const locationProvider = useMemo(() => provider ?? createBrowserLocationProvider(), [provider]);
  const [realFix, setRealFix] = useState<LocationFix | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [simulatedFix, setSimulatedFix] = useState<LocationFix | null>(null);

  useEffect(() => {
    const stop = locationProvider.watch(
      (fix) => {
        setRealFix(fix);
        setError(null);
      },
      (nextError) => {
        setError(nextError);
        // Timeout é transitório: mantém a última posição conhecida.
        if (nextError.code !== 'timeout') setRealFix(null);
      },
    );
    return stop;
  }, [locationProvider]);

  const simulateAt = useCallback((point: GeoPoint) => {
    if (!SIMULATED_LOCATION_AVAILABLE) return;
    setSimulatedFix(createSimulatedFix(point));
  }, []);

  const stopSimulation = useCallback(() => setSimulatedFix(null), []);

  const position = simulatedFix ?? realFix;
  const effectiveError = simulatedFix ? null : error;
  const status: GeolocationStatus = position ? 'ready' : effectiveError && effectiveError.code !== 'timeout' ? 'error' : 'locating';

  return {
    position,
    error: effectiveError,
    status,
    isSimulated: simulatedFix !== null,
    simulationAvailable: SIMULATED_LOCATION_AVAILABLE,
    simulateAt,
    stopSimulation,
  };
}
