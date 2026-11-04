import { useEffect, useState } from 'react';
import { navigate, ROUTES } from '../../../app/router.js';
import { BallIcon, BALL_NAME } from '../../../components/ui/BallIcon.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { BackLink, buttonStyles } from '../../../components/ui/ui.js';
import { getSpecies } from '../../catalog/species.js';
import { usePlayer } from '../../player/PlayerProvider.js';
import type { BallItem } from '../../player/playerState.js';
import { useBattle } from '../BattleProvider.js';
import { attemptCapture, captureChancePercent, type BattleState } from '../battleState.js';
import { Arena } from '../components/Arena.js';
import { CaptureThrow } from '../components/CaptureThrow.js';

const BALLS: BallItem[] = ['POKE_BALL', 'GREAT_BALL'];


export function CapturePage() {
  const { battle, update } = useBattle();
  const { player, dispatch } = usePlayer();
  const [ball, setBall] = useState<BallItem>(player.inventory.POKE_BALL > 0 ? 'POKE_BALL' : 'GREAT_BALL');
  const [attempt, setAttempt] = useState<{ next: BattleState; ball: BallItem; key: number } | null>(null);

  useEffect(() => {
    if (!battle) navigate(ROUTES.map, { replace: true });
    else if (battle.status !== 'active' && !attempt) navigate(ROUTES.battleResult, { replace: true });
  }, [battle, attempt]);

  if (!battle) return null;
  const species = getSpecies(battle.foe.speciesId);

  const throwBall = () => {
    if (player.inventory[ball] <= 0) return;
    dispatch({ type: 'useBall', item: ball });
    // O resultado é calculado agora (rolagem determinística) e aplicado ao fim da animação.
    setAttempt({ next: attemptCapture(battle, ball), ball, key: Date.now() });
  };

  const apply = () => {
    if (!attempt) return null;
    const next = attempt.next;
    update(() => next);
    setAttempt(null);
    return next;
  };

  if (attempt) {
    const result = attempt.next.lastCapture;
    return (
      <CaptureThrow
        key={attempt.key}
        ball={attempt.ball}
        foe={battle.foe}
        shakes={result?.shakes ?? 0}
        canRetry={attempt.next.status === 'active' && !attempt.next.mustSwitch}
        onContinue={() => {
          const next = apply();
          // Se o Pokémon em campo desmaiou mas há outros, a batalha continua (troca obrigatória).
          navigate(next?.status === 'active' ? ROUTES.battle : ROUTES.battleResult, { replace: true });
        }}
        onRetry={() => {
          apply();
        }}
        onBack={() => {
          apply();
          navigate(ROUTES.battle, { replace: true });
        }}
      />
    );
  }

  const noBalls = player.inventory[ball] <= 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-creme text-tinta">
      <Arena height={400} variant="center">
        <div className="absolute top-3.5 left-3.5"><BackLink to={ROUTES.battle} label="Voltar à batalha" /></div>
        <span className="absolute top-[18px] right-3.5 rounded-full ink-border bg-white px-3 py-1 text-xs font-extrabold">
          {species.displayName} · PV {battle.foe.hp}/{battle.foe.maxHp}
        </span>
        <div className="absolute top-[150px] left-1/2 -translate-x-1/2"><CreatureBadge kind={species.kind} image={species.image} color={species.color} size={140} label={species.displayName} /></div>
      </Arena>

      <section className="flex flex-1 flex-col gap-3 px-4 pt-4.5 pb-6">
        <h1 className="m-0 font-display text-[28px] leading-tight font-bold">{battle.lastCapture ? 'Tente de novo!' : 'Hora de capturar!'}</h1>
        <p className="m-0 text-[15px] leading-snug font-bold text-tinta-suave">
          Escolha a bola. Ela precisa chacoalhar 3 vezes para capturar. {species.displayName} está com {battle.foe.hp}/{battle.foe.maxHp} PV:
          quanto mais fraco, maior a chance — mas se ele desmaiar, você só ganha XP.
        </p>

        <div role="radiogroup" aria-label="Escolha a bola" className="flex flex-col gap-2.5">
          {BALLS.map((item) => {
            const on = item === ball;
            const qty = player.inventory[item];
            const chance = captureChancePercent(battle.foe, item);
            return (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={qty <= 0}
                onClick={() => setBall(item)}
                className={`flex min-h-16 items-center gap-3 rounded-[18px] px-3.5 py-2 text-left disabled:opacity-50 ${on ? 'sticker bg-amarelo' : 'ink-border bg-white'}`}
              >
                <BallIcon item={item} size={44} />
                <span className="flex flex-1 flex-col gap-1">
                  <span className="font-display text-lg font-semibold">{BALL_NAME[item]}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-tinta bg-white">
                      <span className="block h-full bg-verde-forte" style={{ width: `${chance}%` }} />
                    </span>
                    <span className="text-xs font-extrabold">{chance}% de chance</span>
                  </span>
                </span>
                <span className="font-display text-xl font-bold">×{qty}</span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={throwBall} disabled={noBalls} className={`${buttonStyles.primary} mt-auto text-[21px]`}>
          {noBalls ? 'Sem bolas desse tipo' : `Lançar ${BALL_NAME[ball]}`}
        </button>
      </section>
    </main>
  );
}
