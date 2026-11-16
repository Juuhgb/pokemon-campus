import { useState } from 'react';
import { InstallGuide } from './InstallGuide.js';
import { shouldShowInstallGuide } from './installPrompt.js';

/** Mostra o guia de instalação só na primeira vez que o jogo é aberto neste aparelho. */
export function FirstVisitInstallGuide() {
  const [open, setOpen] = useState(shouldShowInstallGuide);
  return open ? <InstallGuide onClose={() => setOpen(false)} /> : null;
}
