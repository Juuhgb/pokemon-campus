import type { Auth, AuthError } from 'firebase/auth';
import { authDomainFor, firebaseConfig } from './firebaseConfig.js';

/** Conta Google vinculada ao jogador. */
export interface GoogleAccount {
  uid: string;
  email: string;
  displayName: string | null;
}

let authPromise: Promise<Auth> | null = null;

/** Carrega o Firebase só quando precisa (o jogo abre e funciona offline sem ele). */
async function getFirebaseAuth(): Promise<Auth> {
  authPromise ??= (async () => {
    const [{ initializeApp, getApps }, { getAuth, browserLocalPersistence, setPersistence }] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ]);
    const app = getApps()[0] ?? initializeApp({ ...firebaseConfig, authDomain: authDomainFor(window.location.hostname) });
    const auth = getAuth(app);
    auth.languageCode = 'pt-BR';
    await setPersistence(auth, browserLocalPersistence);
    return auth;
  })();
  return authPromise;
}

function toAccount(user: { uid: string; email: string | null; displayName: string | null }): GoogleAccount {
  return { uid: user.uid, email: user.email ?? 'Conta Google', displayName: user.displayName };
}

/** Mensagem amigável para os erros mais comuns do login. */
export function googleAuthErrorMessage(error: unknown): string | null {
  const code = (error as AuthError | undefined)?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return null; // o próprio jogador cancelou
    case 'auth/network-request-failed':
      return 'Sem conexão. O login com Google precisa de internet.';
    case 'auth/unauthorized-domain':
      return 'Este endereço não está autorizado para login. Use o site publicado ou peça para adicionar o domínio no Firebase.';
    case 'auth/operation-not-allowed':
      return 'O login com Google ainda não foi ativado no Firebase (Authentication → Método de login → Google).';
    default:
      return 'Não foi possível entrar com o Google. Tente de novo.';
  }
}

const NEEDS_REDIRECT = new Set(['auth/popup-blocked', 'auth/operation-not-supported-in-environment']);

/**
 * Abre o login do Google. Usa janela pop-up e, se o navegador bloquear, troca para redirecionamento
 * (nesse caso a página recarrega e o resultado chega por `completeGoogleRedirect`).
 */
export async function signInWithGoogle(): Promise<GoogleAccount | null> {
  const auth = await getFirebaseAuth();
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    return toAccount(result.user);
  } catch (error) {
    if (NEEDS_REDIRECT.has((error as AuthError).code)) {
      try {
        window.sessionStorage.setItem(REDIRECT_FLAG, '1');
      } catch {
        // sem sessionStorage: o resultado ainda pode ser lido na próxima abertura
      }
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

const REDIRECT_FLAG = 'pokemon-campus:google-redirect';

/** Há um login por redirecionamento esperando resultado? (evita carregar o Firebase sem necessidade) */
export function hasPendingGoogleRedirect(): boolean {
  try {
    return window.sessionStorage.getItem(REDIRECT_FLAG) === '1';
  } catch {
    return false;
  }
}

/** Termina um login que caiu no fluxo de redirecionamento. */
export async function completeGoogleRedirect(): Promise<GoogleAccount | null> {
  try {
    window.sessionStorage.removeItem(REDIRECT_FLAG);
  } catch {
    // ignorado
  }
  const auth = await getFirebaseAuth();
  const { getRedirectResult } = await import('firebase/auth');
  const result = await getRedirectResult(auth);
  return result ? toAccount(result.user) : null;
}

export async function signOutGoogle(): Promise<void> {
  const auth = await getFirebaseAuth();
  const { signOut } = await import('firebase/auth');
  await signOut(auth);
}
