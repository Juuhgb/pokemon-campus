import { useState } from 'react';
import { useSync } from '../features/player/PlayerProvider.js';
import { CONNECTION_COPY } from './ConnectionStatus.js';

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Estado da sincronização e os controles usados na demonstração dos testes. */
export function SyncPanel() {
  const sync = useSync();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (work: () => Promise<string | void>) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await work();
      if (result) setMessage(result);
    } finally {
      setBusy(false);
    }
  };

  const pendingText = sync.pending === 0
    ? 'Tudo enviado ao servidor.'
    : `${sync.pending} ${sync.pending === 1 ? 'jogada esperando' : 'jogadas esperando'} para enviar.`;

  return (
    <section aria-labelledby="sync-title" className="mt-3.5 flex flex-col gap-2.5 rounded-[22px] ink-border bg-amarelo px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="sync-title" className="m-0 font-display text-[21px] font-semibold">Sincronização</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full ink-border bg-white px-2.5 py-1 text-xs font-extrabold">
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full border-2 border-tinta ${CONNECTION_COPY[sync.connection].dot}`} />
          {CONNECTION_COPY[sync.connection].label}
        </span>
      </div>

      {!sync.signedIn ? (
        <p className="m-0 text-sm leading-snug font-bold">Entre com o Google para salvar o progresso no servidor. Até lá, ele fica só neste aparelho.</p>
      ) : (
        <p role="status" className="m-0 text-sm leading-snug font-bold">
          {pendingText}
          {sync.connection !== 'online' && sync.pending > 0 && ' Elas estão salvas neste aparelho e vão sozinhas quando o servidor voltar.'}
          {sync.lastSyncAt && <span className="block text-xs text-tinta-suave">Último envio confirmado às {formatTime(sync.lastSyncAt)}.</span>}
        </p>
      )}

      {sync.rejected > 0 && (
        <p className="m-0 rounded-xl ink-border bg-[#ffd9cf] px-3 py-2 text-xs font-extrabold">
          {sync.rejected} {sync.rejected === 1 ? 'jogada foi recusada' : 'jogadas foram recusadas'} pelo servidor e não contam.
        </p>
      )}

      {sync.conflicts.length > 0 && (
        <details className="rounded-xl ink-border bg-white px-3 py-2 text-xs font-bold">
          <summary className="cursor-pointer font-extrabold">
            {sync.conflicts.length} {sync.conflicts.length === 1 ? 'conflito resolvido' : 'conflitos resolvidos'}
          </summary>
          <ul className="m-0 mt-1.5 flex list-disc flex-col gap-1 pl-4">
            {sync.conflicts.map((conflict) => <li key={`${conflict.kind}-${conflict.eventId}`}>{conflict.message}</li>)}
          </ul>
        </details>
      )}

      {sync.enabled && sync.signedIn && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(async () => {
              await sync.syncNow();
            })}
            className="h-11 rounded-[14px] sticker-sm bg-white text-sm font-extrabold disabled:opacity-60"
          >
            {busy ? 'Sincronizando…' : 'Sincronizar agora'}
          </button>

          <details className="rounded-xl ink-border bg-white px-3 py-2 text-xs font-bold">
            <summary className="cursor-pointer font-extrabold">Testes de falha (apresentação)</summary>
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-extrabold">
                <input
                  type="checkbox"
                  checked={sync.simulatedOutage}
                  onChange={(event) => sync.setSimulatedOutage(event.target.checked)}
                  className="h-5 w-5 accent-[#ff8a5c]"
                />
                Simular servidor fora do ar
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => sync.resendLast())}
                className="h-10 rounded-[12px] ink-border bg-creme text-sm font-extrabold disabled:opacity-60"
              >
                Reenviar a última jogada
              </button>
            </div>
          </details>
        </>
      )}

      {message && <p role="status" className="m-0 rounded-xl ink-border bg-white px-3 py-2 text-xs font-extrabold">{message}</p>}
    </section>
  );
}
