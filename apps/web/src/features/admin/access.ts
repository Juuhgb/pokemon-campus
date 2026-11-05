/**
 * O painel de admin abre em desenvolvimento ou quando o build define VITE_ENABLE_ADMIN=true.
 * Isto NÃO é controle de acesso: não há login ainda (módulo de autenticação de outro integrante)
 * e as edições ficam só neste navegador. A permissão real deve ser validada pela API.
 */
export const ADMIN_AVAILABLE: boolean = import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN === 'true';

export const ADMIN_PATH = '/admin';

export function isAdminPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === ADMIN_PATH;
}
