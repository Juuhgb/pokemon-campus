import type { GeolocationStatus } from '../hooks/useGeolocation.js';
import type { LocationError } from '../types.js';

interface LocationNoticeProps {
  status: GeolocationStatus;
  error: LocationError | null;
  simulationAvailable: boolean;
}

/** Mensagens claras quando a localização ainda não chegou ou falhou. */
export function LocationNotice({ status, error, simulationAvailable }: LocationNoticeProps) {
  if (status === 'ready' && !error) return null;

  const message = error?.message ?? 'Procurando sua localização… Permita o acesso quando o navegador pedir.';
  const tone = status === 'error' ? 'border-rose-500/40 bg-rose-950/90 text-rose-100' : 'border-sky-500/40 bg-slate-900/90 text-sky-100';

  return (
    <div role={status === 'error' ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${tone}`}>
      <p>{message}</p>
      {status === 'error' && simulationAvailable && (
        <p className="mt-1 text-xs opacity-80">Em desenvolvimento, use “GPS simulado” e toque no mapa para escolher uma posição.</p>
      )}
    </div>
  );
}
