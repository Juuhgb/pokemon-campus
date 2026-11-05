/**
 * Substitui o módulo virtual "virtual:pwa-register/react" nos testes (ele só existe no build do Vite).
 * Sem service worker: nunca há versão nova para aplicar.
 */
export function useRegisterSW(_options?: unknown) {
  return {
    needRefresh: [false, () => {}] as const,
    offlineReady: [false, () => {}] as const,
    updateServiceWorker: async (_reload?: boolean) => {},
  };
}
