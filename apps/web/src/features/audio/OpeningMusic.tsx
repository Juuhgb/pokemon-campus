import { useEffect } from 'react';
import { currentTrack, playTrack } from './music.js';

/**
 * Toca a abertura uma vez ao entrar no jogo. O navegador só libera som depois de um toque,
 * então ela começa no primeiro toque do jogador nesta abertura do app.
 * Ela volta a tocar ao sair de cada batalha (BattleProvider.end).
 */
export function OpeningMusic() {
  useEffect(() => {
    // Só para de esperar quando a abertura tocou de fato (o navegador pode recusar o 1º toque).
    const start = () => {
      if (currentTrack() !== null) return remove();
      void playTrack('opening').then((started) => {
        if (started) remove();
      });
    };
    const remove = () => {
      document.removeEventListener('pointerdown', start, true);
      document.removeEventListener('keydown', start, true);
    };
    document.addEventListener('pointerdown', start, true);
    document.addEventListener('keydown', start, true);
    return remove;
  }, []);
  return null;
}
