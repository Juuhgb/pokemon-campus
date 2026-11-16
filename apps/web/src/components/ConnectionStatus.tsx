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

/** Por quanto tempo o aviso fica na tela antes de sumir sozinho. */
export const OFFLINE_NOTICE_MS = 6_000;

/**
 * Aviso em todas as telas quando o jogo passa a operar offline. Aparece a cada mudança de
 * estado, some sozinho depois de alguns segundos e pode ser fechado. O selo do mapa e o painel
 * de Sincronização continuam mostrando o estado o tempo todo.
 */
export function OfflineBanner() {
  const { connection, enabled } = useSync();
  if (!enabled || connection === 'online') return null;
  // `key`: um aviso novo (aberto de novo) a cada mudança de estado.
  return <OfflineNotice key={connection} connection={connection} />;
}

function OfflineNotice({ connection }: { connection: Exclude<ConnectionState, 'online'> }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setOpen(false), OFFLINE_NOTICE_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (!open) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-[calc(max(0.875rem,env(safe-area-inset-bottom))+88px)] z-[1100] flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-md items-start gap-2 rounded-[14px] ink-border bg-white/95 py-1.5 pr-1.5 pl-3 text-tinta shadow">
        <p className="m-0 flex-1 py-0.5 text-xs leading-snug font-extrabold">{CONNECTION_COPY[connection].banner}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar aviso"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-base leading-none font-extrabold hover:bg-creme"
        >
          ×
        </button>
      </div>
    </div>
  );
}
