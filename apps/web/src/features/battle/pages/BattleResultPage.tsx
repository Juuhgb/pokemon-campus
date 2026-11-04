import { useEffect, useMemo, useRef } from 'react';
import { navigate, ROUTES } from '../../../app/router.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { BALL_NAME } from '../../../components/ui/BallIcon.js';
import { buttonStyles, ProgressBar } from '../../../components/ui/ui.js';
import { getSpecies } from '../../catalog/species.js';
import { usePlayer } from '../../player/PlayerProvider.js';
import { xpToNextLevel } from '../../player/playerState.js';
import { useBattle } from '../BattleProvider.js';
import { rewardsFor, type BattleStatus } from '../battleState.js';

const COPY: Record<Exclude<BattleStatus, 'active'>, { badge: string; title: string; heroBg: string; primary: { label: string; to: string } }> = {
  captured: { badge: 'Novo!', title: 'Capturado!', heroBg: '#7ad88f', primary: { label: 'Ver no álbum', to: ROUTES.collection } },
  won: { badge: 'Vitória', title: 'Você venceu!', heroBg: '#ffc23d', primary: { label: 'Continuar explorando', to: ROUTES.map } },
  lost: { badge: 'Fim', title: 'Sua equipe desmaiou', heroBg: '#c9b8ff', primary: { label: 'Ver equipe', to: ROUTES.team } },
  fled: { badge: 'Fuga', title: 'Você fugiu', heroBg: '#bfe3ff', primary: { label: 'Voltar a explorar', to: ROUTES.map } },
};

export function BattleResultPage() {
  const { battle, end } = useBattle();
  const { player, dispatch } = usePlayer();
  const rewarded = useRef(false);
  const rewards = useMemo(() => (battle ? rewardsFor(battle) : null), [battle]);

  useEffect(() => {
    if (!battle) navigate(ROUTES.map, { replace: true });
    else if (battle.status === 'active') navigate(ROUTES.battle, { replace: true });
  }, [battle]);

  // Aplica as recompensas uma única vez (refs sobrevivem ao duplo efeito do StrictMode).
  useEffect(() => {
    if (!battle || battle.status === 'active' || !rewards || rewarded.current) return;
    rewarded.current = true;
    dispatch({
      type: 'settleBattle', battleId: battle.id,
      xpByCreature: rewards.xpByCreature, points: rewards.points,
      captured: battle.status === 'captured' ? {
        creatureId: crypto.randomUUID(), speciesId: battle.foe.speciesId,
        level: battle.foe.level, at: new Date().toISOString(),
      } : undefined,
    });
  }, [battle, rewards, dispatch]);

  if (!battle || battle.status === 'active' || !rewards) return null;

  const copy = COPY[battle.status];
  const foe = getSpecies(battle.foe.speciesId);
  const active = getSpecies(battle.team[battle.activeIndex]!.speciesId);
  const hero = battle.status === 'captured' || battle.status === 'fled' ? foe : active;
  const subtitle = {
    captured: `${foe.displayName} entrou para o seu álbum.`,
    won: `${foe.displayName} desmaiou e voltou para a natureza. Sua equipe ganhou XP, mas Pokémon derrotado não é capturado: da próxima vez, enfraqueça e use uma bola.`,
    lost: 'Sua equipe descansou e já está pronta de novo.',
    fled: `${foe.displayName} continua por perto até o spawn expirar.`,
  }[battle.status];

  const leave = (to: string) => {
    end();
    navigate(to, { replace: true });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-creme px-5 pt-6 pb-7 text-tinta">
      <div className="relative grid h-[250px] place-items-center">
        <div aria-hidden="true" className="absolute inset-x-10 inset-y-2.5 -rotate-3 rounded-[40px] sticker-lg" style={{ background: copy.heroBg }} />
        <div className="relative"><CreatureBadge kind={battle.status === 'lost' ? 'unknown' : hero.kind} image={hero.image} color={battle.status === 'lost' ? '#e6e3f0' : hero.color} size={136} label={hero.displayName} /></div>
        <span className="absolute top-0 right-9 rotate-6 rounded-[14px] bg-tinta px-3.5 py-1.5 font-display text-base font-semibold text-amarelo">{copy.badge}</span>
      </div>

      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="m-0 font-display text-4xl leading-none font-bold">{copy.title}</h1>
        <p className="m-0 text-[15px] leading-snug font-bold text-tinta-suave">{subtitle}</p>
      </div>

      <section aria-label="Recompensas" className="flex flex-col gap-3 rounded-[22px] ink-border bg-white px-4 py-3.5">
        {battle.team.map((member) => {
          const species = getSpecies(member.speciesId);
          const creature = player.creatures.find((item) => item.id === member.creatureId);
          const xp = rewards.xpByCreature[member.creatureId] ?? 0;
          const percent = creature ? (creature.xp / xpToNextLevel(creature.level)) * 100 : 0;
          return (
            <div key={member.creatureId} className="flex items-center gap-3">
              <CreatureBadge kind={species.kind} image={species.image} color={species.color} size={36} />
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex justify-between text-sm font-extrabold">
                  <span>{species.displayName}{creature ? ` · Nv. ${creature.level}` : ''}</span>
                  <span>+{xp} XP</span>
                </div>
                <ProgressBar percent={percent} color="#6aa8ff" height={10} label={`Experiência de ${species.displayName}`} />
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-xl ink-border px-3 py-1 text-sm font-extrabold ${rewards.points > 0 ? 'bg-verde' : 'bg-lilas'}`}>+{rewards.points} pts</span>
          {battle.lastCapture && (
            <span className="rounded-xl ink-border bg-white px-3 py-1 text-sm font-extrabold">Última bola: {BALL_NAME[battle.lastCapture.ball]}</span>
          )}
        </div>
      </section>

      <p role="status" className="m-0 flex items-center gap-2.5 rounded-2xl ink-border bg-amarelo px-3.5 py-2.5 text-[13px] leading-snug font-extrabold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1b3a" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" className="shrink-0"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
        Resultado salvo neste aparelho. O servidor confirma quando a sincronização da batalha estiver pronta.
      </p>

      <div className="mt-auto flex flex-col gap-2">
        <button type="button" onClick={() => leave(copy.primary.to)} className={buttonStyles.primary}>{copy.primary.label}</button>
        <button type="button" onClick={() => leave(ROUTES.map)} className={buttonStyles.link}>Voltar ao mapa</button>
      </div>
    </main>
  );
}
