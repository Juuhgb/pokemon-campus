/**
 * Configuração pública do app web "Pokecampus Web" no projeto Firebase pokecampus-uenp.
 * Estes valores não são segredos: identificam o projeto no navegador. A proteção fica
 * nas regras do Firebase e nos domínios autorizados do Authentication.
 * Podem ser sobrescritos por VITE_FIREBASE_* (ex.: outro projeto de testes).
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyBl-XjZHX2z88XTFIZKlkY3dPWo37FadRU',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'pokecampus-uenp.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'pokecampus-uenp',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:907402177284:web:044d6a8ec917cdbd443e51',
  messagingSenderId: '907402177284',
  storageBucket: 'pokecampus-uenp.firebasestorage.app',
};

/**
 * No site publicado (web.app / firebaseapp.com), o login usa o próprio domínio da página.
 * Isso evita bloqueios de cookies de terceiros no fluxo por redirecionamento.
 */
export function authDomainFor(hostname: string, fallback: string = firebaseConfig.authDomain): string {
  return hostname.endsWith('.web.app') || hostname.endsWith('.firebaseapp.com') ? hostname : fallback;
}
