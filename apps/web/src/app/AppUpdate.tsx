import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Procura versão nova de tempos em tempos e sempre que o jogador volta ao app. */
const CHECK_EVERY_MS = 30 * 60 * 1000;

interface AppUpdateValue {
  /** Há uma versão nova baixada, esperando para ser aplicada. */
  updateAvailable: boolean;
  /** Aplica a versão nova e recarrega o jogo. */
  applyUpdate: () => Promise<void>;
  /** Esconde o aviso até a próxima versão. */
  dismiss: () => void;
  dismissed: boolean;
}

const AppUpdateContext = createContext<AppUpdateValue | null>(null);

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (reg) registration.current = reg;
    },
  });

  // Verificação periódica e ao voltar para o app (ex.: depois de abrir pelo ícone).
  useEffect(() => {
    const check = () => {
      if (navigator.onLine) void registration.current?.update().catch(() => undefined);
    };
    const id = window.setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (needRefresh) setDismissed(false);
  }, [needRefresh]);

  const applyUpdate = useCallback(async () => {
    await updateServiceWorker(true);
    // Se o navegador não recarregar sozinho, recarrega aqui.
    window.setTimeout(() => window.location.reload(), 1500);
  }, [updateServiceWorker]);

  const value = useMemo<AppUpdateValue>(() => ({
    updateAvailable: needRefresh,
    applyUpdate,
    dismiss: () => setDismissed(true),
    dismissed,
  }), [needRefresh, applyUpdate, dismissed]);

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
}

/** Fora do provider (ex.: testes de uma tela isolada) não há service worker. */
const NO_UPDATES: AppUpdateValue = {
  updateAvailable: false,
  applyUpdate: async () => {},
  dismiss: () => {},
  dismissed: false,
};

export function useAppUpdate(): AppUpdateValue {
  return useContext(AppUpdateContext) ?? NO_UPDATES;
}

/** Aviso fixo no topo quando há versão nova, com o botão para atualizar. */
export function UpdateBanner() {
  const { updateAvailable, dismissed, applyUpdate, dismiss } = useAppUpdate();
  const [applying, setApplying] = useState(false);
  if (!updateAvailable || dismissed) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[2000] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div role="status" className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl sticker bg-amarelo px-3.5 py-2.5 text-tinta">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
          <path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v5h-5" />
        </svg>
        <span className="min-w-0 flex-1 text-sm leading-snug font-extrabold">Nova versão do jogo disponível!</span>
        <button
          type="button"
          disabled={applying}
          onClick={() => {
            setApplying(true);
            void applyUpdate();
          }}
          className="min-h-10 shrink-0 rounded-xl ink-border bg-coral px-3 text-sm font-extrabold disabled:opacity-60"
        >
          {applying ? 'Atualizando…' : 'Atualizar'}
        </button>
        <button type="button" onClick={dismiss} aria-label="Lembrar depois" className="grid h-10 w-8 shrink-0 place-items-center text-lg font-extrabold">
          ✕
        </button>
      </div>
    </div>
  );
}
