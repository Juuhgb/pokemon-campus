import { useState } from 'react';
import { navigate, ROUTES } from '../../../app/router.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { buttonStyles, ProgressBar, StepDots } from '../../../components/ui/ui.js';
import { getSpecies, STARTER_IDS } from '../../catalog/species.js';
import { usePlayer } from '../../player/PlayerProvider.js';
import { initials } from '../../player/playerState.js';

export function StarterPage() {
  const { player, dispatch } = usePlayer();
  const [picked, setPicked] = useState<string>(STARTER_IDS[0]);
  const [confirmed, setConfirmed] = useState(false);
  const current = getSpecies(picked);
  const maxStat = 16;

  const finish = () => {
    dispatch({ type: 'onboard', starterSpeciesId: picked, creatureId: crypto.randomUUID(), at: new Date().toISOString() });
    navigate(ROUTES.location);
  };

  if (confirmed) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-md flex-col bg-creme px-5 pt-6 pb-8 text-tinta">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="relative grid h-60 w-60 place-items-center">
            <div aria-hidden="true" className="absolute inset-0 -rotate-4 rounded-[40px] sticker-lg" style={{ background: current.color }} />
            <div className="relative"><CreatureBadge kind={current.kind} image={current.image} color="#ffffff" size={140} label={current.displayName} /></div>
          </div>
          <h1 className="mt-2 mb-0 font-display text-[32px] leading-tight font-bold">{current.displayName} agora é seu parceiro!</h1>
          <p className="m-0 max-w-[300px] text-[15px] leading-snug font-bold text-tinta-suave">Ele já está na vaga 1 da sua equipe. Saia pelo campus para achar os outros.</p>
          <button type="button" onClick={() => setConfirmed(false)} className={buttonStyles.link}>Trocar de escolha</button>
        </div>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={finish} className={buttonStyles.primary}>Continuar</button>
          <StepDots step={2} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 bg-creme px-5 pt-6 pb-8 text-tinta">
      <header className="flex flex-col gap-2">
        <span className="flex items-center gap-2 self-start rounded-full ink-border bg-white py-1 pr-3 pl-1 text-[13px] font-bold">
          <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full border-2 border-tinta bg-azul text-[11px] font-extrabold">{initials(player.displayName)}</span>
          Oi, {player.displayName}!
        </span>
        <h1 className="mt-1 mb-0 font-display text-[34px] leading-none font-bold">Escolha seu parceiro</h1>
        <p className="m-0 text-[15px] leading-snug font-bold text-tinta-suave">Ele entra na sua equipe e acompanha você nas primeiras batalhas.</p>
      </header>

      <div role="radiogroup" aria-label="Pokémon inicial" className="grid grid-cols-3 gap-2.5">
        {STARTER_IDS.map((id) => {
          const species = getSpecies(id);
          const on = id === picked;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPicked(id)}
              className={`flex flex-col items-center gap-2 rounded-[20px] px-1.5 pt-3.5 pb-3 ${on ? '-translate-y-1 sticker-lg bg-amarelo' : 'ink-border bg-white'}`}
            >
              <CreatureBadge kind={species.kind} image={species.image} color={species.color} size={62} />
              <span className="font-display text-base font-semibold">{species.displayName}</span>
              <span className="rounded-full border-2 border-tinta bg-white px-2 py-0.5 text-[11px] font-extrabold">{species.type}</span>
            </button>
          );
        })}
      </div>

      <section aria-live="polite" className="flex flex-col gap-3 rounded-[22px] sticker bg-white p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="m-0 font-display text-2xl font-bold">{current.displayName}</h2>
          <span className="text-[13px] font-extrabold text-tinta-suave">Tipo {current.type} · Nv. 5</span>
        </div>
        <p className="m-0 text-sm leading-normal font-semibold text-tinta-media">{current.description}</p>
        <div className="flex flex-col gap-2">
          {([['Vida', current.baseStats.hp / 2], ['Ataque', current.baseStats.attack], ['Defesa', current.baseStats.defense]] as const).map(([label, value]) => (
            <div key={label} className="flex items-center gap-2.5">
              <span className="w-[58px] text-xs font-extrabold">{label}</span>
              <div className="flex-1"><ProgressBar percent={(value / maxStat) * 100} color={current.color} height={14} label={label} /></div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-auto flex flex-col gap-3">
        <button type="button" onClick={() => setConfirmed(true)} className={buttonStyles.primary}>Escolher {current.displayName}</button>
        <StepDots step={2} />
      </div>
    </main>
  );
}
