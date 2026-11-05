import type { FirebaseApp } from 'firebase/app';
import type { Auth, AuthError } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig.js';

/** Conta Google vinculada ao jogador. */
export interface GoogleAccount {
  uid: string;
  email: string;
  displayName: string | null;
}

let appPromise: Promise<FirebaseApp> | null = null;
let authPromise: Promise<Auth> | null = null;

/** Carrega o Firebase só quando precisa (o jogo abre e funciona offline sem ele). */
export function getFirebaseApp(): Promise<FirebaseApp> {
  appPromise ??= import('firebase/app').then(({ initializeApp, getApps }) => getApps()[0] ?? initializeApp(firebaseConfig));
  return appPromise;
}

export async function getFirebaseAuth(): Promise<Auth> {
  authPromise ??= (async () => {
    const [app, { getAuth, browserLocalPersistence, setPersistence }] = await Promise.all([getFirebaseApp(), import('firebase/auth')]);
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
    case 'auth/configuration-not-found':
      return 'O Firebase ainda não foi configurado para autenticação. Ative o Firebase Authentication e o login Google no Console do Firebase (Authentication → Método de login).';
    default:
      return 'Não foi possível entrar com o Google. Tente de novo.';
  }
}

const NEEDS_REDIRECT = new Set(['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment']);

function markGoogleRedirectPending(): void {
  try {
    window.sessionStorage.setItem(REDIRECT_FLAG, '1');
  } catch {
    // sem sessionStorage: o resultado ainda pode ser lido na próxima abertura
  }
}

/**
 * Abre a janela do Google (popup) usando o domínio fixo de login do Firebase
 * (pokecampus-uenp.firebaseapp.com), que não é controlado pelo service worker do jogo.
 * Só usa redirecionamento se o navegador bloquear o popup; o retorno é concluído por
 * `completeGoogleRedirect`.
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
      markGoogleRedirectPending();
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
