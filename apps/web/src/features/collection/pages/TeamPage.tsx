import { EvolutionScene } from '../components/EvolutionScene.js';
import { useEffect, useState } from 'react';
import { playTrack, stopMusic } from '../../audio/music.js';
import { TabScreen } from '../../../components/ui/BottomNav.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { buttonStyles, hpColor, ProgressBar, ScreenTitle } from '../../../components/ui/ui.js';
import { evolutionFor, getSpecies, habitatOf, HABITAT_LABEL, SPECIES } from '../../catalog/species.js';
import { usePlayer } from '../../player/PlayerProvider.js';
import { MAX_TEAM_SIZE } from '../../player/playerState.js';

export function TeamPage() {
  const { player, dispatch } = usePlayer();
  const byId = new Map(player.creatures.map((creature) => [creature.id, creature]));
  const slots = Array.from({ length: MAX_TEAM_SIZE }, (_, index) => byId.get(player.team[index] ?? ''));
  const [dismissed, setDismissed] = useState(false);
  const [attempt, setAttempt] = useState<{ creatureId: string; from: string; to: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const exemplar = player.creatures.find(creature => creature.id === attempt?.creatureId);
  const applied = attempt && (exemplar?.speciesId === attempt.to || exemplar?.previousForms?.includes(attempt.to));
  const reveal = applied && !dismissed ? attempt : null;

  useEffect(() => {
    if (!reveal) return;
    void playTrack('evolution');
    return () => stopMusic(false, 'evolution');
  }, [reveal]);

  async function evolve(creatureId: string, from: string, to: string) {
    setAttempt(null);
    setDismissed(false);
    setSaving(true);
    setError('');
    try {
      if (await dispatch({ type: 'evolveCreature', creatureId, from, to })) setAttempt({ creatureId, from, to });
      else setError('Este exemplar ainda não pode evoluir.');
    } catch {
      setError('Não foi possível salvar a evolução neste aparelho. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const [sector, setSector] = useState('');
  const [order, setOrder] = useState('name');
  const groups = SPECIES.filter(species => !sector || habitatOf(species.id) === sector).map(species => ({
    species,
    members: player.creatures.filter(c => c.speciesId === species.id).sort((a,b) => b.level - a.level),
  })).filter(group => group.members.length).sort((a,b) =>
    (order === 'level' ? b.members[0]!.level - a.members[0]!.level : 0) || a.species.displayName.localeCompare(b.species.displayName, 'pt-BR'));

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

      <h2 className="mt-5 font-display text-xl">Meus Pokémon</h2>
      <div className="my-3 flex flex-wrap gap-2">
        <label>Ordenar <select className="rounded-lg ink-border bg-white p-1" value={order} onChange={e => setOrder(e.target.value)}>
          <option value="name">Alfabeto</option><option value="level">Maior nível</option></select></label>
        <label>Setor <select className="max-w-48 rounded-lg ink-border bg-white p-1" value={sector} onChange={e => setSector(e.target.value)}>
          <option value="">Todos os setores</option>{Object.entries(HABITAT_LABEL).map(([id,name]) => <option key={id} value={name}>{name}</option>)}</select></label>
      </div>
      <section className="grid grid-cols-3 items-start gap-2">
        {groups.map(({ species, members }) => {
          const rule = evolutionFor(species.id);
          return <details key={species.id} className="min-w-0 rounded-xl sticker bg-white p-2 text-center text-xs">
            <summary className="cursor-pointer">
              <CreatureBadge kind={species.kind} image={species.image} color={species.color} size={52}/>
              <strong className="block">{species.displayName} ×{members.length}</strong>
              Nv. {members.slice(0,3).map(c => c.level).join(', ')}{members.length > 3 && '…'}
            </summary>
            {members.map(c => <div key={c.id} className="mt-2 border-t pt-2">
              <p>Nv. {c.level} · {habitatOf(c.speciesId)}</p>
              {player.team.includes(c.id) ? <p>Na equipe</p> :
                <button className={buttonStyles.accent} disabled={full} onClick={() => dispatch({ type: 'addToTeam', creatureId: c.id })}>Adicionar</button>}
              {rule && (c.level >= rule.level ? <button className="my-1 rounded-lg ink-border bg-amarelo p-1" disabled={saving || !!reveal} onClick={() => void evolve(c.id, species.id, rule.target)}>Evoluir para {getSpecies(rule.target).displayName}</button> : <p>Evolui no Nv. {rule.level}</p>)}
            </div>)}
          </details>;
        })}
      </section>
      {attempt && !applied && <p role="alert">A evolução não foi aplicada ao progresso atual. Confira a sincronização no perfil.</p>}
      {error && <p role="alert">{error}</p>}
      {reveal && <EvolutionScene from={reveal.from} to={reveal.to} onClose={() => setDismissed(true)} />}
    </TabScreen>
  );
}
