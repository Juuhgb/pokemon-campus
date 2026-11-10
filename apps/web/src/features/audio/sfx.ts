import { isMusicEnabled, safePlay } from './music.js';
import { levelFor, resumeOutput, type Level } from './output.js';

/**
 * Efeitos da captura (public/musicas/), tocados por cima da música de batalha:
 * - shake: a Pokébola chacoalhando (toca durante as chacoalhadas);
 * - catch: o Pokémon foi pego.
 *
 * Como a música, precisam ser liberados num toque do jogador: `unlockSfx` é chamado no toque
 * de "Lançar". Seguem a mesma chave "Músicas" das Configurações.
 */

export type Sfx = 'shake' | 'catch';

export const SFX: Record<Sfx, { src: string; volume: number }> = {
  shake: { src: '/musicas/chacoalhando.mp3', volume: 0.15 },
  catch: { src: '/musicas/captura.mp3', volume: 0.18 },
};

let element: HTMLAudioElement | null = null;
let level: Level | null = null;

function player(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!element) {
    element = new Audio();
    level = levelFor(element);
  }
  return element;
}

/** No toque do jogador: toca em silêncio e pausa, para o celular liberar os próximos sons. */
export function unlockSfx(): void {
  if (!isMusicEnabled()) return;
  const audio = player();
  if (!audio) return;
  resumeOutput();
  audio.src = SFX.shake.src;
  audio.muted = true;
  void safePlay(audio).then(
    () => {
      audio.pause();
      audio.muted = false;
    },
    () => {
      audio.muted = false;
    },
  );
}

export function playSfx(sfx: Sfx): void {
  if (!isMusicEnabled()) return;
  const audio = player();
  if (!audio) return;
  const { src, volume } = SFX[sfx];
  if (!audio.src.endsWith(src)) audio.src = src;
  audio.muted = false;
  level?.set(volume);
  audio.currentTime = 0;
  void safePlay(audio).catch(() => {});
}

export function stopSfx(): void {
  element?.pause();
}

/** Para os testes. */
export function resetSfxForTests(): void {
  element = null;
  level = null;
}
