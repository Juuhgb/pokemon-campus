import { useMemo, useState } from 'react';
import { TabScreen } from '../../../components/ui/BottomNav.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { ScreenTitle } from '../../../components/ui/ui.js';
import { RARITY_CHIP, RARITY_LABEL, SPECIES } from '../../catalog/species.js';
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
  const { player } = usePlayer();
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
          const known = count > 0;
          const chip = known ? RARITY_CHIP[species.rarity] : { bg: '#ece9f5', fg: '#5b587a' };
          return (
            <article
              key={species.id}
              className={`flex flex-col items-center gap-1.5 rounded-[18px] px-1.5 pt-3 pb-2.5 text-center ${known ? 'sticker bg-white' : 'border-[2.5px] border-dashed border-tinta bg-papel'}`}
            >
              <span className="flex w-full justify-between text-[11px] font-extrabold text-tinta-suave">
                <span>#{species.number}</span>
                <span>{known ? `×${count}` : ''}</span>
              </span>
              <CreatureBadge kind={known ? species.kind : 'unknown'} color={known ? species.color : '#e6e3f0'} size={54} />
              <h2 className="mt-1 mb-0 font-display text-base leading-tight font-semibold">{known ? species.displayName : '???'}</h2>
              <span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ background: chip.bg, color: chip.fg }}>
                {known ? RARITY_LABEL[species.rarity] : 'Falta achar'}
              </span>
            </article>
          );
        })}
        {visible.length === 0 && <p className="col-span-3 m-0 text-sm font-bold text-tinta-suave">Nada encontrado.</p>}
      </section>
    </TabScreen>
  );
}
