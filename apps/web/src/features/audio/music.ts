import { levelFor, resumeOutput, type Level } from './output.js';

/**
 * Músicas do jogo (public/musicas/). Uma faixa por vez:
 * - abertura: toca ao entrar no jogo e de novo ao voltar de cada batalha;
 * - batalha: em loop enquanto a batalha dura;
 * - vitória: uma vez ao capturar ou derrotar o Pokémon, até sair da tela de resultado.
 *
 * Os navegadores de celular só deixam tocar som depois de um toque do jogador. Por isso todas as
 * faixas usam o mesmo elemento de áudio: ele é liberado no primeiro toque (abertura) ou no toque
 * de "Batalhar", e depois pode trocar de faixa sozinho (ex.: a vitória, que vem sem toque).
 * O jogador pode desligar as músicas nas Configurações (salvo neste aparelho).
 */

export type Track = 'opening' | 'battle' | 'victory';

export const TRACKS: Record<Track, { src: string; loop: boolean; volume: number }> = {
  opening: { src: '/musicas/abertura.mp3', loop: false, volume: 0.035 },
  battle: { src: '/musicas/batalha.mp3', loop: true, volume: 0.1 },
  victory: { src: '/musicas/vitoria.mp3', loop: false, volume: 0.11 },
};

const FADE_MS = 600;
const SETTING_KEY = 'pokemon-campus:music';

let audio: HTMLAudioElement | null = null;
let level: Level | null = null;
let current: Track | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
let visibilityBound = false;
let prefetched = false;

export function isMusicEnabled(): boolean {
  try {
    return window.localStorage.getItem(SETTING_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setMusicEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SETTING_KEY, enabled ? 'on' : 'off');
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
  // Religou (é um toque, então o celular deixa tocar): volta a abertura. Batalhas não têm
  // acesso às Configurações, então fora delas a faixa certa é sempre a abertura.
  if (enabled) {
    if (current === null) void playTrack('opening');
  } else stopMusic(false);
}

/** Faixa tocando agora (null = silêncio). */
export function currentTrack(): Track | null {
  return current;
}

function element(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    level = levelFor(audio);
    audio.addEventListener('ended', () => {
      if (audio && !audio.loop) current = null;
    });
  }
  if (!visibilityBound && typeof document !== 'undefined') {
    visibilityBound = true;
    // App em segundo plano (bloqueou a tela, trocou de app): pausa e retoma ao voltar.
    document.addEventListener('visibilitychange', () => {
      if (!audio || !current) return;
      if (document.visibilityState === 'hidden') audio.pause();
      else void safePlay(audio).catch(() => {});
    });
  }
  return audio;
}

/** play() devolve uma Promise nos navegadores atuais; em alguns ambientes, nada (ou lança). */
export function safePlay(element: HTMLAudioElement): Promise<void> {
  try {
    return Promise.resolve(element.play());
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

function clearFade(): void {
  if (fadeTimer) clearInterval(fadeTimer);
  fadeTimer = null;
}

/**
 * Troca para a faixa pedida, do começo. Sem permissão para tocar, o jogo segue em silêncio.
 * Resolve `true` quando a faixa começou de fato.
 */
export function playTrack(track: Track): Promise<boolean> {
  if (!isMusicEnabled()) return Promise.resolve(false);
  const player = element();
  if (!player) return Promise.resolve(false);
  const { src, loop, volume } = TRACKS[track];
  resumeOutput();
  clearFade();
  current = track;
  if (!player.src.endsWith(src)) player.src = src;
  player.loop = loop;
  level?.set(volume);
  player.currentTime = 0;
  return safePlay(player).then(
    () => true,
    () => {
      if (current === track) current = null;
      return false;
    },
  );
}

/** Para a música (só se for `only`, quando informado); com `fade`, abaixa o volume aos poucos. */
export function stopMusic(fade = true, only?: Track): void {
  const player = audio;
  if (!player || !current || (only && current !== only)) return;
  const stopping = current;
  current = null;
  clearFade();
  if (!fade || player.paused) {
    player.pause();
    return;
  }
  const fader = level;
  if (!fader) return player.pause();
  const step = fader.get() / (FADE_MS / 50);
  fadeTimer = setInterval(() => {
    if (current !== null) return clearFade(); // outra faixa começou durante o fade
    fader.set(fader.get() - step);
    if (fader.get() <= 0.0005) {
      clearFade();
      player.pause();
      fader.set(TRACKS[stopping].volume);
    }
  }, 50);
}

/**
 * Abaixa a música atual (ex.: durante a Pokébola chacoalhando, para o efeito aparecer) e,
 * com `false`, devolve o volume normal da faixa.
 */
export function duckMusic(on: boolean): void {
  if (!level || !current) return;
  clearFade();
  level.set(TRACKS[current].volume * (on ? 0.35 : 1));
}

/**
 * Baixa os arquivos inteiros uma vez (com internet) para o service worker guardar: o player de
 * áudio pede só pedaços do arquivo, que não ficam no cache sozinhos. Assim as músicas tocam offline.
 */
export function prefetchMusic(): void {
  if (prefetched || typeof fetch === 'undefined' || !isMusicEnabled()) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  prefetched = true;
  for (const src of [...Object.values(TRACKS).map((track) => track.src), '/musicas/chacoalhando.mp3', '/musicas/captura.mp3']) {
    void fetch(src).catch(() => {
      prefetched = false;
    });
  }
}

/** Para os testes. */
export function resetMusicForTests(): void {
  clearFade();
  audio = null;
  level = null;
  current = null;
  visibilityBound = false;
  prefetched = false;
}
