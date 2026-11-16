import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { googleAuthErrorMessage, signInWithGoogle, signOutGoogle } from '../../auth/googleAuth.js';
import type { PublishTracker } from '../../exploration/services/world.js';
import { checkAdmin } from '../../exploration/services/worldRemote.js';

type Account = Awaited<ReturnType<typeof checkAdmin>>;

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Conta do admin e estado da publicação. Quem pode publicar é decidido pelo servidor
 * (documento admins/{uid} no Firestore); aqui só mostramos o resultado.
 */
export function AdminAccount({ tracker, onRepublish }: { tracker: PublishTracker; onRepublish: () => void }) {
  const [account, setAccount] = useState<Account | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publish = useSyncExternalStore(tracker.subscribe, tracker.get);

  const refresh = useCallback(() => {
    checkAdmin().then(setAccount).catch(() => setAccount(null));
  }, []);
  useEffect(refresh, [refresh]);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      refresh();
    } catch (reason) {
      setError(googleAuthErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await signOutGoogle().catch(() => {});
    setAccount(null);
  };

  return (
    <section aria-label="Publicação" className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-sm">
      {account === undefined ? (
        <p className="m-0 text-slate-400">Verificando a conta…</p>
      ) : account === null ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-300">Entre com a conta de admin para publicar para todos.</span>
          <button type="button" disabled={busy} onClick={() => void signIn()} className="min-h-10 rounded-full bg-orange-400 px-4 font-semibold text-slate-950 disabled:opacity-50">
            {busy ? 'Entrando…' : 'Entrar com Google'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate">
              {account.email ?? 'Conta Google'}{' '}
              {account.isAdmin
                ? <span className="rounded-md bg-emerald-400/20 px-1.5 text-xs font-semibold text-emerald-200">admin</span>
                : <span className="rounded-md bg-rose-400/20 px-1.5 text-xs font-semibold text-rose-200">sem permissão</span>}
            </span>
            <button type="button" onClick={() => void signOut()} className="shrink-0 text-xs text-slate-400 underline">Sair</button>
          </div>
          {!account.isAdmin && (
            <p className="m-0 text-xs leading-5 text-slate-400">
              Para virar admin, crie no Console do Firebase o documento <code className="break-all text-orange-200">admins/{account.uid}</code>{' '}
              (Firestore Database → Iniciar coleção “admins” → ID do documento = esse código) e recarregue a página.
            </p>
          )}
        </div>
      )}

      <p role="status" className={`m-0 text-xs ${publish.status === 'error' ? 'text-rose-300' : publish.status === 'published' ? 'text-emerald-300' : 'text-slate-400'}`}>
        {publish.status === 'publishing' && 'Publicando para todos os jogadores…'}
        {publish.status === 'published' && `Publicado para todos às ${formatTime(publish.at)}. Os jogadores recebem sozinhos.`}
        {publish.status === 'error' && publish.message}
        {publish.status === 'idle' && 'Cada mudança nas zonas ou nos Pokémon é publicada para todos automaticamente.'}
      </p>
      {publish.status === 'error' && (
        <button type="button" onClick={onRepublish} className="min-h-9 self-start rounded-full bg-slate-800 px-3 text-xs font-semibold hover:bg-slate-700">
          Publicar de novo
        </button>
      )}
      {error && <p role="alert" className="m-0 text-xs text-rose-300">{error}</p>}
    </section>
  );
}
