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
  const isError = status === 'error';

  return (
    <div role={isError ? 'alert' : 'status'} className={`rounded-2xl sticker-sm px-4 py-3 text-sm font-bold ${isError ? 'bg-[#ffd9cf]' : 'bg-white'}`}>
      <p className="m-0">{message}</p>
      {isError && simulationAvailable && (
        <p className="mt-1 mb-0 text-xs text-tinta-suave">Em desenvolvimento, use “GPS simulado” e toque no mapa para escolher uma posição.</p>
      )}
    </div>
  );
}
