/**
 * Instalar o jogo na tela inicial (PWA).
 *
 * - Android/Chrome e computador: o navegador avisa que dá para instalar (`beforeinstallprompt`);
 *   guardamos esse aviso para o botão "Instalar" abrir a janela do próprio navegador.
 * - iPhone/iPad: o Safari não tem esse aviso; só dá pelo menu Compartilhar (o guia ensina).
 */

export type Platform = 'ios' | 'android' | 'desktop';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const SEEN_KEY = 'pokemon-campus:install-guide-seen';

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/** Chamado uma vez ao abrir o app (main.tsx): o aviso do navegador pode chegar antes da tela. */
export function listenForInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // nós mostramos o botão na hora certa
    deferred = event as BeforeInstallPromptEvent;
    listeners.forEach((callback) => callback());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    markInstallGuideSeen();
    listeners.forEach((callback) => callback());
  });
}

export function canPromptInstall(): boolean {
  return deferred !== null;
}

export function onInstallPromptChange(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Abre a janela de instalação do navegador. Devolve true se o jogador aceitou. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  listeners.forEach((callback) => callback());
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
}

export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'desktop';
}

/** O jogo já está aberto como app instalado (na tela inicial)? */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function hasSeenInstallGuide(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true; // sem armazenamento: não insiste em mostrar
  }
}

export function markInstallGuideSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // segue sem lembrar
  }
}

/** Mostra o guia na primeira vez: ainda não visto e o jogo não está instalado. */
export function shouldShowInstallGuide(): boolean {
  return !isInstalled() && !hasSeenInstallGuide();
}
