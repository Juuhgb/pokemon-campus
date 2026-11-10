import type { FirebaseApp } from 'firebase/app';
import type { Auth, AuthError } from 'firebase/auth';
import { authDomainFor, firebaseConfig, prefersRedirectLogin } from './firebaseConfig.js';

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
  appPromise ??= import('firebase/app').then(({ initializeApp, getApps }) => getApps()[0] ?? initializeApp({ ...firebaseConfig, authDomain: authDomainFor(window.location.hostname) }));
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

/** Guardado nos dois armazenamentos: alguns celulares perdem o sessionStorage no redirecionamento. */
function markGoogleRedirectPending(): void {
  const stamp = String(Date.now());
  try {
    window.sessionStorage.setItem(REDIRECT_FLAG, stamp);
  } catch {
    // segue com o localStorage
  }
  try {
    window.localStorage.setItem(REDIRECT_FLAG, stamp);
  } catch {
    // sem armazenamento: o login ainda conclui, só não é detectado ao voltar
  }
}

function shouldRedirect(): boolean {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return prefersRedirectLogin(navigator.userAgent, navigator.maxTouchPoints ?? 0, standalone);
}

/**
 * No computador, abre a janela do Google (popup). No celular e no app instalado, vai para a
 * página do Google na mesma aba e volta para o jogo (o popup costuma travar ali); o retorno é
 * concluído por `completeGoogleRedirect`. Se o navegador bloquear o popup, também redireciona.
 */
export async function signInWithGoogle(): Promise<GoogleAccount | null> {
  const auth = await getFirebaseAuth();
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  if (shouldRedirect()) {
    markGoogleRedirectPending();
    await signInWithRedirect(auth, provider);
    return null;
  }
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

const REDIRECT_MAX_AGE_MS = 15 * 60_000;

/** Há um login por redirecionamento esperando resultado? (evita carregar o Firebase sem necessidade) */
export function hasPendingGoogleRedirect(now = Date.now()): boolean {
  const fresh = (value: string | null) => value !== null && (value === '1' || now - Number(value) < REDIRECT_MAX_AGE_MS);
  try {
    if (fresh(window.sessionStorage.getItem(REDIRECT_FLAG))) return true;
  } catch {
    // tenta o localStorage
  }
  try {
    return fresh(window.localStorage.getItem(REDIRECT_FLAG));
  } catch {
    return false;
  }
}

/** Termina um login que caiu no fluxo de redirecionamento. */
export async function completeGoogleRedirect(): Promise<GoogleAccount | null> {
  try {
    window.sessionStorage.removeItem(REDIRECT_FLAG);
    window.localStorage.removeItem(REDIRECT_FLAG);
  } catch {
    // ignorado
  }
  const auth = await getFirebaseAuth();
  const { getRedirectResult } = await import('firebase/auth');
  const result = await getRedirectResult(auth);
  if (result) return toAccount(result.user);
  // Alguns navegadores já restauram a sessão sem entregar o resultado: vale o usuário logado.
  await auth.authStateReady();
  return auth.currentUser ? toAccount(auth.currentUser) : null;
}

export async function signOutGoogle(): Promise<void> {
  const auth = await getFirebaseAuth();
  const { signOut } = await import('firebase/auth');
  await signOut(auth);
}
