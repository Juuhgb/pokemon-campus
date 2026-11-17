import { useState } from 'react';
import { ROUTES, usePath } from '../../app/router.js';
import { usePlayer } from '../player/PlayerProvider.js';
import { InstallGuide } from './InstallGuide.js';
import { shouldShowInstallGuide } from './installPrompt.js';

/** Telas em que o guia não interrompe: começo do jogo e batalha. */
const NOT_NOW = new Set<string>([
  ROUTES.welcome,
  ROUTES.course,
  ROUTES.starter,
  ROUTES.location,
  ROUTES.battle,
  ROUTES.capture,
  ROUTES.battleResult,
]);

/**
 * Mostra o guia de instalação uma vez por aparelho, depois que o jogador terminou o começo
 * do jogo (login → curso → Pokémon inicial → localização) e chegou às telas normais.
 */
export function FirstVisitInstallGuide() {
  const { player } = usePlayer();
  const path = usePath();
  const [open, setOpen] = useState(shouldShowInstallGuide);
  const ready = player.onboarded && !NOT_NOW.has(path);
  return open && ready ? <InstallGuide onClose={() => setOpen(false)} /> : null;
}
