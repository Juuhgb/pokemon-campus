import { TabScreen } from '../../../components/ui/BottomNav.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { buttonStyles, hpColor, ProgressBar, ScreenTitle } from '../../../components/ui/ui.js';
import { getSpecies } from '../../catalog/species.js';
import { usePlayer } from '../../player/PlayerProvider.js';
import { MAX_TEAM_SIZE } from '../../player/playerState.js';

export function TeamPage() {
  const { player, dispatch } = usePlayer();
  const byId = new Map(player.creatures.map((creature) => [creature.id, creature]));
  const slots = Array.from({ length: MAX_TEAM_SIZE }, (_, index) => byId.get(player.team[index] ?? ''));
  const available = player.creatures.filter((creature) => !player.team.includes(creature.id));
  const full = player.team.length >= MAX_TEAM_SIZE;

  return (
    <TabScreen active="team" label="Minha equipe">
      <ScreenTitle>Minha equipe</ScreenTitle>
      <p className="mt-1.5 mb-0 text-sm font-bold text-tinta-suave">Até 3 Pokémon para batalhar. O primeiro entra em campo.</p>

      <section aria-label="Equipe atual" className="mt-4 grid grid-cols-3 gap-2.5">
        {slots.map((creature, index) => {
          if (!creature) {
            return (
              <div key={`empty-${index}`} className="relative flex min-h-[236px] flex-col items-center justify-center gap-2 rounded-[20px] border-[2.5px] border-dashed border-tinta bg-papel px-1.5 py-3 text-center">
                <span className="absolute -top-2 -left-2 grid h-[26px] w-[26px] place-items-center rounded-full ink-border bg-white font-display text-sm font-bold">{index + 1}</span>
                <span aria-hidden="true" className="grid h-[54px] w-[54px] place-items-center rounded-full border-[2.5px] border-dashed border-tinta">+</span>
                <span className="text-[13px] font-extrabold text-tinta-suave">Vaga livre</span>
              </div>
            );
          }
          const species = getSpecies(creature.speciesId);
          const percent = (creature.hp / creature.maxHp) * 100;
          return (
            <article key={creature.id} className="relative flex flex-col items-center gap-1.5 rounded-[20px] sticker bg-white px-1.5 pt-3 pb-2.5 text-center">
              <span className="absolute -top-2 -left-2 grid h-[26px] w-[26px] place-items-center rounded-full ink-border bg-coral font-display text-sm font-bold">{index + 1}</span>
              <CreatureBadge kind={species.kind} image={species.image} color={species.color} size={58} />
              <h2 className="mt-1 mb-0 font-display text-base leading-tight font-semibold">{species.displayName}</h2>
              <span className="text-xs font-extrabold text-tinta-suave">Nv. {creature.level}</span>
              <div className="w-full"><ProgressBar percent={percent} color={hpColor(percent)} height={10} label={`Vida de ${species.displayName}`} /></div>
              <span className="text-[11px] font-extrabold text-tinta-suave">PV {creature.hp}/{creature.maxHp}</span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'removeFromTeam', creatureId: creature.id })}
                disabled={player.team.length <= 1}
                aria-label={`Tirar ${species.displayName} da equipe`}
                className="min-h-11 w-full rounded-xl border-2 border-tinta bg-creme text-xs font-extrabold disabled:opacity-50"
              >
                Tirar
              </button>
            </article>
          );
        })}
      </section>
      {player.team.length <= 1 && <p className="mt-3 mb-0 text-xs font-bold text-tinta-suave">A equipe precisa de pelo menos 1 Pokémon.</p>}

      <section aria-labelledby="available-title" className="mt-6 flex flex-col gap-2.5">
        <h2 id="available-title" className="m-0 font-display text-[21px] font-semibold">Do seu álbum</h2>
        {available.length === 0 && <p className="m-0 text-sm font-bold text-tinta-suave">Capture mais Pokémon para montar a equipe.</p>}
        {available.map((creature) => {
          const species = getSpecies(creature.speciesId);
          return (
            <div key={creature.id} className="flex items-center gap-3 rounded-[18px] ink-border bg-white py-2 pr-2 pl-2.5">
              <CreatureBadge kind={species.kind} image={species.image} color={species.color} size={40} />
              <span className="min-w-0 flex-1 text-[15px] font-extrabold">
                {species.displayName} <span className="font-bold text-tinta-suave">Nv. {creature.level}</span>
              </span>
              <button
                type="button"
                disabled={full}
                onClick={() => dispatch({ type: 'addToTeam', creatureId: creature.id })}
                className={buttonStyles.accent}
              >
                Adicionar
              </button>
            </div>
          );
        })}
      </section>
    </TabScreen>
  );
}
