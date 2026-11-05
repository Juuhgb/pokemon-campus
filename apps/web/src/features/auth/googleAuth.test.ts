import { describe, expect, it } from 'vitest';
import { INITIAL_PLAYER, parseStoredPlayer, playerReducer } from '../player/playerState.js';
import { firebaseConfig } from './firebaseConfig.js';
import { googleAuthErrorMessage } from './googleAuth.js';

describe('firebaseConfig', () => {
  it('login sempre pelo domínio fixo do Firebase, fora do alcance do service worker do jogo', () => {
    expect(firebaseConfig.authDomain).toMatch(/\.firebaseapp\.com$/);
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
