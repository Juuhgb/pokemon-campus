import { describe, expect, it } from 'vitest';
import { INITIAL_PLAYER, parseStoredPlayer, playerReducer } from '../player/playerState.js';
import { authDomainFor, firebaseConfig, prefersRedirectLogin } from './firebaseConfig.js';
import { googleAuthErrorMessage } from './googleAuth.js';

describe('firebaseConfig', () => {
  it('no site publicado, o login roda no próprio endereço do jogo; fora dele, no domínio do Firebase', () => {
    expect(authDomainFor('pokecampus-uenp.web.app')).toBe('pokecampus-uenp.web.app');
    expect(authDomainFor('pokecampus-uenp.firebaseapp.com')).toBe('pokecampus-uenp.firebaseapp.com');
    expect(authDomainFor('localhost')).toBe(firebaseConfig.authDomain);
  });

  it('celular e app instalado usam redirecionamento; computador usa popup', () => {
    expect(prefersRedirectLogin('Mozilla/5.0 (Linux; Android 14) Mobile Safari', 5, false)).toBe(true);
    expect(prefersRedirectLogin('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', 5, false)).toBe(true);
    expect(prefersRedirectLogin('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5, false)).toBe(true); // iPad
    expect(prefersRedirectLogin('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0, true)).toBe(true);
    expect(prefersRedirectLogin('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0, false)).toBe(false);
  });
});

describe('googleAuthErrorMessage', () => {
  it('não mostra erro quando o jogador fecha a janela', () => {
    expect(googleAuthErrorMessage({ code: 'auth/popup-closed-by-user' })).toBeNull();
  });

  it('explica domínio não autorizado, provedor desativado e falta de rede', () => {
    expect(googleAuthErrorMessage({ code: 'auth/unauthorized-domain' })).toMatch(/não está autorizado/);
    expect(googleAuthErrorMessage({ code: 'auth/operation-not-allowed' })).toMatch(/ativado/);
    expect(googleAuthErrorMessage({ code: 'auth/configuration-not-found' })).toMatch(/Firebase Authentication.*login Google/);
    expect(googleAuthErrorMessage({ code: 'auth/network-request-failed' })).toMatch(/internet/);
  });
});

describe('vínculo com o Google no perfil', () => {
  it('guarda e-mail e UID e usa o nome da conta se o jogador ainda não escolheu um', () => {
    const state = playerReducer(INITIAL_PLAYER, { type: 'linkGoogle', email: 'ana@gmail.com', uid: 'u1', displayName: 'Ana Lima' });
    expect(state).toMatchObject({ googleEmail: 'ana@gmail.com', googleUid: 'u1', displayName: 'Ana Lima' });
  });

  it('não troca um nome que o jogador já escolheu', () => {
    const named = { ...INITIAL_PLAYER, displayName: 'Aninha' };
    expect(playerReducer(named, { type: 'linkGoogle', email: 'a@b.com', uid: 'u1', displayName: 'Ana Lima' }).displayName).toBe('Aninha');
  });

  it('desvincular apaga e-mail e UID', () => {
    const linked = playerReducer(INITIAL_PLAYER, { type: 'linkGoogle', email: 'a@b.com', uid: 'u1' });
    expect(playerReducer(linked, { type: 'unlinkGoogle' })).toMatchObject({ googleEmail: null, googleUid: null });
  });

  it('vínculo simulado antigo (sem UID) passa a contar como não vinculado', () => {
    const old = JSON.stringify({ ...INITIAL_PLAYER, onboarded: true, googleEmail: 'Conta Google (simulada)' });
    expect(parseStoredPlayer(old).googleEmail).toBeNull();
  });
});
