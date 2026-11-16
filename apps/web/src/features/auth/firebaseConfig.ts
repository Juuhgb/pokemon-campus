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
 * No site publicado (web.app / firebaseapp.com), o login roda no próprio endereço do jogo
 * (/__/auth/handler, servido pelo Firebase Hosting). Assim o redirecionamento do celular
 * funciona mesmo com navegadores que bloqueiam cookies de outros sites. O service worker
 * deixa /__/ passar direto para o servidor (navigateFallbackDenylist no vite.config.ts).
 * Fora dele (localhost), usa o domínio padrão do Firebase.
 */
export function authDomainFor(hostname: string, fallback: string = firebaseConfig.authDomain): string {
  return hostname.endsWith('.web.app') || hostname.endsWith('.firebaseapp.com') ? hostname : fallback;
}

/** Celular ou app instalado: o popup do Google costuma não devolver o resultado ao jogo. */
export function prefersRedirectLogin(userAgent: string, maxTouchPoints: number, standalone: boolean): boolean {
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  return mobile || standalone;
}
