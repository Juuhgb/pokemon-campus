import { useEffect, useMemo, useState } from 'react';
import { playTrack, stopMusic } from '../../audio/music.js';
import { TabScreen } from '../../../components/ui/BottomNav.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { ScreenTitle } from '../../../components/ui/ui.js';
import { evolutionFor, getSpecies, habitatOf, RARITY_CHIP, RARITY_LABEL, SPECIES } from '../../catalog/species.js';
import type { Rarity } from '../../exploration/types.js';
import { usePlayer } from '../../player/PlayerProvider.js';
import { countBySpecies } from '../../player/playerState.js';

const FILTERS: { id: 'all' | Rarity; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'common', label: 'Comum' },
  { id: 'uncommon', label: 'Incomum' },
  { id: 'rare', label: 'Raro' },
  { id: 'legendary', label: 'Lendário' },
];

export function CollectionPage() {
  const { player, dispatch } = usePlayer();
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
  const [filter, setFilter] = useState<'all' | Rarity>('all');
  const [query, setQuery] = useState('');
  const counts = useMemo(() => countBySpecies(player.creatures), [player.creatures]);
  const discovered = SPECIES.filter((species) => counts.has(species.id)).length;
  const percent = Math.round((discovered / SPECIES.length) * 100);

  const normalizedQuery = query.trim().toLowerCase();
  const visible = SPECIES.filter((species) => {
    if (filter !== 'all' && species.rarity !== filter) return false;
    if (!normalizedQuery) return true;
    const known = counts.has(species.id);
    return (known && species.displayName.toLowerCase().includes(normalizedQuery)) || species.number.includes(normalizedQuery);
  });

  return (
    <TabScreen active="collection" label="Meu álbum">
      <header className="flex flex-col gap-3">
        <ScreenTitle aside={<span className="rounded-xl sticker-sm bg-coral px-3 py-1 font-display text-lg font-bold">{discovered}/{SPECIES.length}</span>}>
          Meu álbum
        </ScreenTitle>
        <div
          role="progressbar"
          aria-label="Espécies descobertas"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-4 overflow-hidden rounded-full ink-border bg-white"
        >
          <div className="h-full border-r-[2.5px] border-tinta bg-amarelo" style={{ width: `${percent}%` }} />
        </div>
        <label className="flex h-12 items-center gap-2.5 rounded-2xl ink-border bg-white px-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1b3a" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>
          <span className="sr-only">Buscar no álbum</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar no álbum"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-bold outline-none placeholder:text-tinta-suave"
          />
        </label>
        <div role="group" aria-label="Filtrar por raridade" className="flex gap-2 overflow-x-auto pr-1 pb-1.5">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`h-[38px] shrink-0 rounded-full px-3.5 text-[13px] font-extrabold ${filter === item.id ? 'sticker-sm bg-amarelo' : 'ink-border bg-white'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <section aria-label="Pokémon do álbum" className="mt-2 grid grid-cols-3 gap-3">
        {visible.map((species) => {
          const count = counts.get(species.id) ?? 0;
          const known = counts.has(species.id);
          const rule = evolutionFor(species.id);
          const chip = known ? RARITY_CHIP[species.rarity] : { bg: '#ece9f5', fg: '#5b587a' };
          return (
            <article
              key={species.id}
              className={`flex flex-col items-center gap-1.5 rounded-[18px] px-1.5 pt-3 pb-2.5 text-center ${known ? 'sticker bg-white' : 'border-[2.5px] border-dashed border-tinta bg-papel'}`}
            >
              <span className="flex w-full justify-between text-[11px] font-extrabold text-tinta-suave">
                <span>#{species.number}</span>
                <span>{count > 0 ? `×${count}` : known ? 'Registrado' : ''}</span>
              </span>
              <CreatureBadge kind={known ? species.kind : 'unknown'} image={species.image} color={known ? species.color : '#e6e3f0'} size={54} />
              <h2 className="mt-1 mb-0 font-display text-base leading-tight font-semibold">{known ? species.displayName : '???'}</h2>
              <span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ background: chip.bg, color: chip.fg }}>
                {known ? RARITY_LABEL[species.rarity] : 'Falta achar'}
              </span>
              {known && (
                <details className="w-full text-left text-xs font-bold">
                  <summary className="cursor-pointer rounded-lg p-2">Ver na Pokédex</summary>
                  <div className="flex flex-col gap-2 p-2">
                    <p>{species.description}</p>
                    <p>Tipo: {species.type}</p>
                    {habitatOf(species.id) && <p>Onde encontrar: {habitatOf(species.id)}</p>}
                    <p>Golpes: {species.moves.map((move) => move.name).join(', ')}</p>
                    {player.creatures.filter((creature) => creature.speciesId === species.id).map((creature) => (
                      <div key={creature.id}>
                        <p>Nv. {creature.level} · PV {creature.hp}/{creature.maxHp} · {creature.xp} XP</p>
                        {rule && (creature.level < rule.level
                          ? <p>Evolui no Nv. {rule.level}</p>
                          : <button type="button" disabled={saving || !!reveal} onClick={() => void evolve(creature.id, species.id, rule.target)}
                              className="mt-1 rounded-lg ink-border bg-amarelo p-2 font-bold">
                              Evoluir para {getSpecies(rule.target).displayName}
                            </button>)}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </article>
          );
        })}
        {visible.length === 0 && <p className="col-span-3 m-0 text-sm font-bold text-tinta-suave">Nada encontrado.</p>}
      </section>
      {attempt && !applied && <p role="alert">A evolução não foi aplicada ao progresso atual. Confira a sincronização no perfil.</p>}
      {error && <p role="alert">{error}</p>}
      {reveal && (
        <dialog ref={node => {
          if (node && !node.open) node.showModal();
        }}
          onCancel={() => setDismissed(true)} aria-labelledby="evolution-title"
          className="fixed inset-0 m-auto rounded-3xl ink-border bg-creme p-6 text-center backdrop:bg-black/50">
          <div className="evolution-glow mx-auto grid size-36 place-items-center" aria-hidden="true">
            {[reveal.from, reveal.to].map(id => <img key={id} className="col-start-1 row-start-1 size-32 object-contain" src={getSpecies(id).image} alt="" />)}
          </div>
          <h2 id="evolution-title" className="my-4 font-display text-xl">{getSpecies(reveal.from).displayName} evoluiu para {getSpecies(reveal.to).displayName}!</h2>
          <button type="button" className="rounded-xl ink-border bg-amarelo px-5 py-2 font-bold" onClick={() => setDismissed(true)}>Continuar</button>
        </dialog>
      )}
    </TabScreen>
  );
}
