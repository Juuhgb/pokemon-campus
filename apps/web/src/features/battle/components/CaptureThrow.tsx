import { useEffect, useState } from 'react';
import { BallIcon, BALL_NAME } from '../../../components/ui/BallIcon.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { buttonStyles } from '../../../components/ui/ui.js';
import { getSpecies } from '../../catalog/species.js';
import type { BallItem } from '../../player/playerState.js';
import type { Combatant } from '../battleState.js';

export const SHAKE_INTERVAL_MS = 1100;
const APPEAR_MS = 900;

type Phase = 'appear' | 'shaking' | 'caught' | 'escaped';

interface CaptureThrowProps {
  ball: BallItem;
  foe: Combatant;
  /** Chacoalhadas que vão acontecer: 3 = capturado; 0–2 = a bola abre e o Pokémon escapa. */
  shakes: 0 | 1 | 2 | 3;
  /** Quando o Pokémon escapa e a equipe ainda pode lutar. */
  canRetry: boolean;
  onContinue: () => void;
  onRetry: () => void;
  onBack: () => void;
}

/** Animação de captura: o Pokémon entra na bola, que chacoalha; só captura com 3 chacoalhadas. */
export function CaptureThrow({ ball, foe, shakes: target, canRetry, onContinue, onRetry, onBack }: CaptureThrowProps) {
  const [phase, setPhase] = useState<Phase>('appear');
  const [shakes, setShakes] = useState(0);
  const species = getSpecies(foe.speciesId);
  const caughtOutcome = target === 3;

  useEffect(() => {
    let count = 0;
    let interval: number | undefined;
    const delay = window.setTimeout(() => {
      setPhase('shaking');
      interval = window.setInterval(() => {
        if (count < target) {
          count += 1;
          setShakes(count);
        } else {
          window.clearInterval(interval);
          setPhase(caughtOutcome ? 'caught' : 'escaped');
        }
      }, SHAKE_INTERVAL_MS);
    }, APPEAR_MS);
    return () => {
      window.clearTimeout(delay);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [target, caughtOutcome]);

  const caught = phase === 'caught';
  const escaped = phase === 'escaped';
  const vezes = shakes === 1 ? '1 vez' : `${shakes} vezes`;
  const [title, subtitle] = {
    appear: ['Lá vai!', `${species.displayName} foi puxado para dentro da ${BALL_NAME[ball]}.`],
    shaking: [shakes === 0 ? 'Segura…' : `${shakes}…`, `A ${BALL_NAME[ball]} está chacoalhando.`],
    caught: ['Pegou!', `Chacoalhou 3 vezes. ${species.displayName} foi para o seu álbum.`],
    escaped: ['Escapou!', shakes === 0 ? `A bola abriu na hora. ${species.displayName} saiu.` : `Chacoalhou só ${vezes}. Precisava de 3.`],
  }[phase];

  let ballClass = '';
  if (phase === 'shaking' && shakes > 0) ballClass = shakes % 2 === 1 ? 'pc-shake-a' : 'pc-shake-b';
  if (caught) ballClass = 'pc-click';
  if (escaped) ballClass = 'pc-burst';

  return (
    <div className="fixed inset-0 z-[1200] overflow-hidden text-tinta" style={{ background: caught ? '#ffe7a3' : escaped ? '#ffd9cf' : '#bfe3ff' }}>
      <div className="relative mx-auto h-full w-full max-w-md">
        <svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" aria-hidden="true" className="absolute inset-0">
          <path d="M-10 540 Q 120 500 220 528 T 400 520 V 860 H -10 Z" fill="#9fd477" stroke="#1d1b3a" strokeWidth="2.5" />
          <ellipse cx="195" cy="586" rx="110" ry="24" fill="#7cc35c" stroke="#1d1b3a" strokeWidth="2.5" />
          <path d="M40 120 q20-22 44-6 q14-16 34 0 q16 4 10 18 h-92 q-10-6 4-12z" fill="#ffffff" stroke="#1d1b3a" strokeWidth="2.5" />
        </svg>

        <div className="absolute inset-x-0 top-7 flex justify-center">
          <span className="rounded-full ink-border bg-white px-3.5 py-1.5 text-[13px] font-extrabold">
            {species.displayName} · Nv. {foe.level} · PV {foe.hp}/{foe.maxHp}
          </span>
        </div>

        <div role="status" aria-live="polite" className="absolute inset-x-6 top-[110px] flex flex-col items-center gap-3.5 text-center">
          <div aria-label={`Chacoalhadas: ${shakes} de 3`} className="flex gap-3.5">
            {[1, 2, 3].map((n) => {
              const done = caught || n <= shakes;
              const failed = escaped && n === shakes + 1;
              return (
                <span
                  key={n}
                  className={`grid h-[26px] w-[26px] place-items-center rounded-full ${done || failed ? 'pc-dot' : ''}`}
                  style={{
                    border: '3px solid #1d1b3a',
                    background: failed ? '#ff5a4e' : done ? '#ffc23d' : '#ffffff',
                    boxShadow: done || failed ? '2px 2px 0 #1d1b3a' : 'none',
                  }}
                >
                  {failed && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d1b3a" strokeWidth="4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>}
                </span>
              );
            })}
          </div>
          <h1 className="m-0 rounded-2xl sticker bg-white px-4.5 py-1.5 font-display text-[34px] leading-tight font-bold">{title}</h1>
          <p className="m-0 max-w-[300px] rounded-xl bg-white/90 px-3 py-1.5 text-[15px] leading-snug font-extrabold">{subtitle}</p>
        </div>

        {caught && (
          <svg className="pc-spin absolute top-[390px] left-1/2 -ml-[120px]" width="240" height="240" viewBox="0 0 260 260" aria-hidden="true">
            <path d="M130 10 L142 98 L130 86 L118 98 Z M250 130 L162 142 L174 130 L162 118 Z M130 250 L118 162 L130 174 L142 162 Z M10 130 L98 118 L86 130 L98 142 Z" fill="#ffc23d" stroke="#1d1b3a" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        )}
        {phase === 'appear' && (
          <div className="pc-absorb absolute top-[420px] left-1/2 -ml-[70px]">
            <CreatureBadge kind={species.kind} color={species.color} size={140} />
          </div>
        )}
        <div className={`absolute top-[455px] left-1/2 -ml-[60px] h-[120px] w-[120px] ${phase === 'appear' ? 'pc-appear' : ''}`}>
          <div className={ballClass}><BallIcon item={ball} size={120} /></div>
        </div>
        {escaped && (
          <div className="pc-out absolute top-[360px] left-1/2 ml-[2px]">
            <CreatureBadge kind={species.kind} color={species.color} size={110} label={species.displayName} />
          </div>
        )}

        <div className="absolute inset-x-6 bottom-[max(1.875rem,env(safe-area-inset-bottom))] flex flex-col gap-2.5">
          {(phase === 'appear' || phase === 'shaking') && (
            <p className="m-0 rounded-2xl ink-border bg-white px-3.5 py-2.5 text-center text-[13px] font-extrabold">Precisa chacoalhar 3 vezes para capturar.</p>
          )}
          {caught && <button type="button" onClick={onContinue} className={buttonStyles.primary}>Continuar</button>}
          {escaped && canRetry && (
            <>
              <button type="button" onClick={onRetry} className={buttonStyles.primary.replace('bg-coral', 'bg-amarelo')}>Tentar de novo</button>
              <button type="button" onClick={onBack} className={buttonStyles.link}>Voltar à batalha</button>
            </>
          )}
          {escaped && !canRetry && <button type="button" onClick={onContinue} className={buttonStyles.primary}>Continuar</button>}
        </div>
      </div>
    </div>
  );
}
