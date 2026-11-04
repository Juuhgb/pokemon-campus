import { useState } from 'react';
import { navigate, ROUTES } from '../../../app/router.js';
import { buttonStyles, StepDots } from '../../../components/ui/ui.js';

const POINTS = [
  'Só enquanto o jogo está aberto.',
  'Distâncias calculadas no celular, mesmo sem internet.',
  'Ninguém vê onde você está.',
];

export function LocationPage() {
  const [asking, setAsking] = useState(false);

  const allow = () => {
    if (!('geolocation' in navigator)) {
      navigate(ROUTES.map);
      return;
    }
    setAsking(true);
    // Dispara o pedido de permissão do navegador; o mapa continua observando a posição depois.
    navigator.geolocation.getCurrentPosition(
      () => navigate(ROUTES.map),
      () => navigate(ROUTES.map),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 bg-creme px-6 pt-6 pb-8 text-tinta">
      <div aria-hidden="true" className="relative -mx-1 h-[260px]">
        <div className="absolute inset-x-5 top-2.5 bottom-5 overflow-hidden rounded-[32px] sticker-lg bg-[#dff0c8]">
          <svg width="100%" height="100%" viewBox="0 0 310 230" preserveAspectRatio="none">
            <path d="M-10 70 L120 120 L330 80" stroke="#1d1b3a" strokeWidth="20" fill="none" strokeLinecap="round" />
            <path d="M-10 70 L120 120 L330 80" stroke="#ffffff" strokeWidth="14" fill="none" strokeLinecap="round" />
            <path d="M200 -10 L170 240" stroke="#1d1b3a" strokeWidth="18" fill="none" strokeLinecap="round" />
            <path d="M200 -10 L170 240" stroke="#ffffff" strokeWidth="12" fill="none" strokeLinecap="round" />
            <rect x="30" y="140" width="80" height="60" rx="14" fill="rgba(106,168,255,0.5)" stroke="#1d1b3a" strokeWidth="2.5" />
            <rect x="220" y="130" width="70" height="70" rx="14" fill="rgba(255,194,61,0.55)" stroke="#1d1b3a" strokeWidth="2.5" />
          </svg>
        </div>
        <span className="absolute top-[58px] left-1/2 grid h-[84px] w-[84px] -translate-x-1/2 -rotate-45 place-items-center rounded-[999px_999px_999px_8px] sticker-lg bg-coral" style={{ borderWidth: 3 }}>
          <span className="h-7 w-7 rounded-full bg-white" style={{ border: '3px solid #1d1b3a' }} />
        </span>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="m-0 font-display text-[34px] leading-none font-bold">Ative sua localização</h1>
        <p className="m-0 max-w-[310px] text-[15px] leading-snug font-bold text-tinta-suave">O GPS mostra onde você está no campus e quais Pokémon estão a até 30 m.</p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-3 rounded-[22px] ink-border bg-white px-4 py-3.5">
        {POINTS.map((point) => (
          <li key={point} className="flex items-center gap-3 text-sm leading-snug font-bold">
            <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-[10px] border-2 border-tinta bg-verde">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d1b3a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
            </span>
            {point}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2">
        <button type="button" onClick={allow} disabled={asking} className={buttonStyles.primary}>
          {asking ? 'Aguardando o navegador…' : 'Permitir localização'}
        </button>
        <button type="button" onClick={() => navigate(ROUTES.map)} className={buttonStyles.link}>Agora não</button>
        <StepDots step={3} />
      </div>
    </main>
  );
}
