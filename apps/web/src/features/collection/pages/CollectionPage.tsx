import { useState } from 'react';
import { TabScreen } from '../../../components/ui/BottomNav.js';
import { ScreenTitle } from '../../../components/ui/ui.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { habitatOf, RARITY_CHIP, RARITY_LABEL, SPECIES, type SpeciesInfo } from '../../catalog/species.js';
import { usePlayer } from '../../player/PlayerProvider.js';
import { countBySpecies } from '../../player/playerState.js';

import type { Rarity } from '../../exploration/types.js';

const FILTERS: { id: 'all' | Rarity; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'common', label: 'Comum' },
  { id: 'uncommon', label: 'Incomum' },
  { id: 'rare', label: 'Raro' },
  { id: 'legendary', label: 'Lendário' },
];

export function CollectionPage() {
  const { player } = usePlayer();
  const [selected, select] = useState<SpeciesInfo | null>(null);
  const [query, setQuery] = useState('');
  const known = countBySpecies(player.creatures);
  const [filter, setFilter] = useState<'all' | Rarity>('all');
  const discovered = known.size;
  const percent = Math.round(100 * discovered / SPECIES.length);
  const term = query.trim().toLowerCase();
  const number = term.replace(/^#/, '');
  const visible = SPECIES.filter(species =>
    (filter === 'all' || species.rarity === filter) &&
    (!term || (known.has(species.id) && species.displayName.toLowerCase().includes(term)) || (number.length > 0 && species.number.includes(number)))
  );
  return <TabScreen active="collection" label="Pokédex">
      <header className="flex flex-col gap-3">
        <ScreenTitle aside={<span className="rounded-xl sticker-sm bg-coral px-3 py-1 font-display text-lg font-bold">{discovered}/{SPECIES.length}</span>}>
          Pokédex
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
          <span className="sr-only">Buscar na Pokédex</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar na Pokédex"
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
    <section className="grid grid-cols-3 gap-3">
      {visible.map(s => {
        if (!known.has(s.id)) {
          return (
            <article key={s.id} className="flex flex-col items-center gap-1.5 rounded-[18px] border-[2.5px] border-dashed border-tinta bg-papel px-1.5 pt-3 pb-2.5 text-center">
              <span className="self-start text-[11px] font-extrabold text-tinta-suave">#{s.number}</span>
              <span className="brightness-0" aria-hidden="true">
                <CreatureBadge kind={s.kind} image={s.image} color={s.color} size={54}/>
              </span>
              <strong className="font-display">???</strong>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-tinta-suave">Falta achar</span>
            </article>
          );
        }
        return (
          <button key={s.id} aria-label={s.displayName} className="flex flex-col items-center gap-1.5 rounded-[18px] sticker bg-white px-1.5 pt-3 pb-2.5 text-center" onClick={() => select(s)}>
        <span className="self-start text-[11px] font-extrabold text-tinta-suave">#{s.number}</span>
        <CreatureBadge kind={s.kind} image={s.image} color={s.color} size={54}/><strong className="font-display">{s.displayName}</strong>
        <span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold"
          style={{ background: RARITY_CHIP[s.rarity].bg, color: RARITY_CHIP[s.rarity].fg }}>{RARITY_LABEL[s.rarity]}</span>
          </button>
        );
      })}
    </section>
    {!visible.length && <p>Nenhuma espécie encontrada.</p>}
    {selected && <dialog ref={node => { if (node && !node.open) node.showModal(); }} aria-labelledby="dex-name" onCancel={() => select(null)}
      className="fixed inset-0 m-auto w-80 max-w-full rounded-3xl ink-border bg-creme p-5 text-center backdrop:bg-black/50">
      <CreatureBadge kind={selected.kind} image={selected.image} color={selected.color} size={144}/>
      <h2 id="dex-name" className="font-display text-2xl">{selected.displayName}</h2>
      <p className="my-3">{selected.description}</p><p><strong>Setor base</strong></p>
      <p>{habitatOf(selected.id)}</p>
      <button className="mt-4 rounded-xl ink-border bg-amarelo px-5 py-2 font-bold" onClick={() => select(null)}>Fechar</button>
    </dialog>}
  </TabScreen>;
}
