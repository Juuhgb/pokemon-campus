import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { INITIAL_PLAYER, parseStoredPlayer, playerReducer, type PlayerAction, type PlayerState } from './playerState.js';

const STORAGE_KEY = 'pokemon-campus:player:v1';

interface PlayerContextValue {
  player: PlayerState;
  dispatch: Dispatch<PlayerAction>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function loadPlayer(): PlayerState {
  try {
    return parseStoredPlayer(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return INITIAL_PLAYER;
  }
}

export function PlayerProvider({ children, initial }: { children: ReactNode; initial?: PlayerState }) {
  const [player, dispatch] = useReducer(playerReducer, initial, (seed) => seed ?? loadPlayer());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
    } catch {
      // Armazenamento indisponível (aba privada): o jogo continua só na memória.
    }
  }, [player]);

  return <PlayerContext.Provider value={{ player, dispatch }}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer precisa estar dentro de <PlayerProvider>.');
  return value;
}
