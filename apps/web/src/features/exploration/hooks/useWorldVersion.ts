import { useEffect, useState } from 'react';
import { watchWorld } from '../services/worldRemote.js';

/**
 * Escuta as zonas e os Pokémon publicados pelo admin. Devolve um número que muda a cada
 * versão nova recebida, para a tela recarregar sem o jogador fazer nada.
 */
export function useWorldVersion(enabled = true): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    return watchWorld(() => setVersion((current) => current + 1));
  }, [enabled]);
  return version;
}
