import { useEffect, useState } from 'react';
import { useSync } from '../features/player/PlayerProvider.js';
import type { ConnectionState } from '../sync/connection.js';

export const CONNECTION_COPY: Record<ConnectionState, { label: string; dot: string; banner: string }> = {
  online: { label: 'Online', dot: 'bg-verde-forte', banner: '' },
  offline: {
    label: 'Offline',
    dot: 'bg-coral',
    banner: 'Sem internet: jogando offline. Seu progresso fica salvo neste aparelho e é enviado quando a conexão voltar.',
  },
  'server-unavailable': {
    label: 'Servidor fora',
    dot: 'bg-amarelo',
    banner: 'O servidor não está respondendo: jogando offline. Vamos tentar enviar de novo sozinhos.',
  },
};

/** Selo do mapa: estado da conexão com o servidor e jogadas esperando envio. */
export function ConnectionStatus() {
  const { connection: synced, pending, signedIn, enabled } = useSync();
  const network = useNetworkOnline();
  // Fora do jogo (tela do admin) não há módulo de sincronização: mostra só a rede.
  const connection: ConnectionState = enabled ? synced : network ? 'online' : 'offline';
  const copy = CONNECTION_COPY[connection];
  return (
    <span role="status" className="inline-flex items-center gap-1.5 rounded-full ink-border bg-white px-3 py-1.5 text-[13px] font-extrabold text-tinta">
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full border-2 border-tinta ${copy.dot}`} />
      {copy.label}
      {signedIn && pending > 0 && (
        <span className="rounded-full bg-tinta px-1.5 text-[11px] text-white" aria-label={`${pending} jogadas esperando envio`}>{pending}</span>
      )}
    </span>
  );
}

function useNetworkOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

/** Aviso em todas as telas (acima da barra inferior) quando o jogo está operando offline. */
export function OfflineBanner() {
  const { connection, enabled } = useSync();
  if (!enabled || connection === 'online') return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-[calc(max(0.875rem,env(safe-area-inset-bottom))+88px)] z-[1100] flex justify-center px-3">
      <p className="m-0 max-w-md rounded-[14px] ink-border bg-white/95 px-3 py-1.5 text-center text-xs leading-snug font-extrabold text-tinta shadow">
        {CONNECTION_COPY[connection].banner}
      </p>
    </div>
  );
}
