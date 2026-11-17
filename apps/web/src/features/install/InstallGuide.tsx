import { useEffect, useState, type ReactNode } from 'react';
import { buttonStyles } from '../../components/ui/ui.js';
import {
  canPromptInstall,
  detectPlatform,
  markInstallGuideSeen,
  onInstallPromptChange,
  promptInstall,
  type Platform,
} from './installPrompt.js';

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="ícone Compartilhar" role="img" className="inline align-[-3px]">
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
);

const DotsIcon = () => (
  <svg width="20" height="18" viewBox="0 0 24 24" fill="currentColor" aria-label="ícone de três pontinhos •••" role="img" className="inline align-[-3px]">
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
);

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-label="ícone de menu ⋮" role="img" className="inline align-[-3px]">
    <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
  </svg>
);

const STEPS: Record<Platform, { title: string; steps: ReactNode[]; note?: string }> = {
  ios: {
    title: 'No iPhone (Safari)',
    steps: [
      <>Toque nos <strong>três pontinhos</strong> <DotsIcon />, embaixo, ao lado do endereço do site.</>,
      <>Toque em <strong>Compartilhar</strong> <ShareIcon />.</>,
      <>Arraste a lista para baixo e toque em <strong>Adicionar à Tela de Início</strong>.</>,
      <>Toque em <strong>Adicionar</strong> mais uma vez para confirmar.</>,
    ],
    note: 'Se abriu pelo Instagram, WhatsApp ou outro app, abra o link no Safari primeiro.',
  },
  android: {
    title: 'No Android (Chrome)',
    steps: [
      <>Toque no menu <MenuIcon />, no canto de cima.</>,
      <>Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</>,
      <>Confirme em <strong>Instalar</strong>.</>,
    ],
  },
  desktop: {
    title: 'No computador (Chrome ou Edge)',
    steps: [
      <>Clique no ícone de <strong>instalar</strong>, no fim da barra de endereço.</>,
      <>Confirme em <strong>Instalar</strong>.</>,
    ],
  },
};

const BENEFITS = ['Abre direto, em tela cheia', 'Funciona sem internet', 'Fica junto com os seus apps'];

interface InstallGuideProps {
  onClose: () => void;
  /** Para os testes; no app vem do navegador. */
  platform?: Platform;
}

/**
 * Ensina a colocar o jogo na tela inicial. No Android/computador, quando o navegador permite,
 * mostra também o botão "Instalar agora", que abre a janela de instalação.
 */
export function InstallGuide({ onClose, platform }: InstallGuideProps) {
  const [current] = useState<Platform>(() => platform ?? detectPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0));
  const [canInstall, setCanInstall] = useState(canPromptInstall);
  const guide = STEPS[current];

  useEffect(() => onInstallPromptChange(() => setCanInstall(canPromptInstall())), []);

  const close = () => {
    markInstallGuideSeen();
    onClose();
  };

  const install = async () => {
    if (await promptInstall()) close();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-tinta/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        className="flex max-h-full w-full max-w-md flex-col gap-3.5 overflow-y-auto rounded-[26px] sticker-lg bg-creme px-5 pt-5 pb-4 text-tinta"
      >
        <div className="flex items-start gap-3">
          <img src="/pokemon-campus.svg" alt="" className="h-14 w-14 shrink-0 rounded-2xl ink-border bg-white p-1" />
          <div className="min-w-0">
            <h2 id="install-title" className="m-0 font-display text-[26px] leading-tight font-bold">Coloque o jogo na tela inicial</h2>
            <p className="m-0 mt-1 text-sm font-bold text-tinta-suave">Assim ele vira um app no seu celular.</p>
          </div>
        </div>

        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="rounded-full ink-border bg-white px-2.5 py-1 text-xs font-extrabold">{benefit}</li>
          ))}
        </ul>

        {canInstall && (
          <button type="button" onClick={() => void install()} className={`${buttonStyles.primary} h-[54px] bg-verde text-lg`}>
            Instalar agora
          </button>
        )}

        <div className="rounded-2xl ink-border bg-white px-4 py-3">
          <h3 className="m-0 font-display text-lg font-semibold">{canInstall ? 'Ou pelo menu do navegador' : guide.title}</h3>
          <ol className="m-0 mt-2 flex list-none flex-col gap-2.5 p-0">
            {guide.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-2.5 text-[15px] leading-snug font-semibold">
                <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amarelo font-display text-sm font-bold ink-border">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {guide.note && <p className="m-0 mt-2.5 text-xs font-bold text-tinta-suave">{guide.note}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={close} className={`${buttonStyles.primary} h-[52px] text-lg`}>Entendi</button>
          <p className="m-0 text-center text-xs font-bold text-tinta-suave">Dá para ver de novo em Perfil → Configurações.</p>
        </div>
      </section>
    </div>
  );
}
