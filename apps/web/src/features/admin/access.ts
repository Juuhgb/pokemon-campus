/**
 * O painel abre para qualquer um, mas só publica para todos quem tem o documento admins/{uid}
 * no Firestore: a permissão é verificada pelas regras do servidor (firestore.rules).
 * VITE_ENABLE_ADMIN=false esconde o painel num build.
 */
export const ADMIN_AVAILABLE: boolean = import.meta.env.VITE_ENABLE_ADMIN !== 'false';

export const ADMIN_PATH = '/admin';

export function isAdminPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === ADMIN_PATH;
}
