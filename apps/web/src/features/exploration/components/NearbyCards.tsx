import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { getSpecies, RARITY_LABEL } from '../../catalog/species.js';
import type { GeoPoint } from '../types.js';
import { bearingDegrees, formatDistance } from '../utils/distance.js';
import { ENCOUNTER_RADIUS_METERS, type NearbySpawn } from '../utils/encounter.js';

const DIRECTIONS = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'];
export const directionName = (degrees: number) => DIRECTIONS[Math.round(degrees / 45) % 8]!;

interface NearbyCardsProps {
  player: GeoPoint;
  nearby: NearbySpawn[];
  onSelect: (spawnId: string) => void;
  /** Até onde mostrar, em metros. */
  rangeMeters?: number;
  /** "carousel" desliza na horizontal; "list" empilha (usado sem mapa). */
  layout?: 'carousel' | 'list';
}

/**
 * Pokémon por perto com distância e seta de direção.
 * Funciona sem tiles do mapa, só com coordenadas, e serve de alternativa offline.
 */
export function NearbyCards({ player, nearby, onSelect, rangeMeters = 300, layout = 'carousel' }: NearbyCardsProps) {
  const visible = nearby.filter((item) => item.distanceMeters <= rangeMeters);
  const list = layout === 'list';

  return (
    <section aria-labelledby="nearby-title" className="flex flex-col gap-2">
      <h2 id="nearby-title" className="m-0 self-start rounded-xl ink-border bg-white px-3 py-1 font-display text-[17px] font-semibold">
        Por perto · {visible.length}
      </h2>
      {visible.length === 0 ? (
        <p className="m-0 rounded-2xl ink-border bg-white px-4 py-3 text-sm font-bold">Nenhum Pokémon em até {rangeMeters} m. Continue andando!</p>
      ) : (
        <ul className={`m-0 flex list-none gap-3 p-0 ${list ? 'flex-col' : 'overflow-x-auto pr-4 pb-2.5'}`}>
          {visible.map(({ spawn, distanceMeters }) => {
            const species = getSpecies(spawn.speciesId);
            const inRange = distanceMeters <= ENCOUNTER_RADIUS_METERS;
            const bearing = bearingDegrees(player, spawn);
            return (
              <li key={spawn.spawnId} className={list ? '' : 'shrink-0 basis-[150px]'}>
                <button
                  type="button"
                  onClick={() => onSelect(spawn.spawnId)}
                  className={`flex w-full flex-col gap-2 rounded-[20px] sticker p-3 text-left text-tinta ${inRange ? 'bg-amarelo' : 'bg-white'}`}
                >
                  <span className="flex items-center justify-between">
                    <CreatureBadge kind={species.kind} color={species.color} size={44} />
                    <span
                      aria-label={`Direção ${directionName(bearing)}`}
                      className="grid h-8 w-8 place-items-center rounded-full border-2 border-tinta bg-white"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d1b3a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: `rotate(${bearing}deg)` }}>
                        <path d="M12 19V5M6 11l6-6 6 6" />
                      </svg>
                    </span>
                  </span>
                  <span>
                    <span className="block font-display text-[17px] leading-tight font-semibold">{species.displayName}</span>
                    <span className="block text-xs font-bold text-tinta-suave">Nv. {spawn.level} · {RARITY_LABEL[spawn.rarity]}</span>
                  </span>
                  <span className="flex items-center justify-between gap-1.5">
                    <span className="font-display text-xl font-bold whitespace-nowrap">{formatDistance(distanceMeters)}</span>
                    {inRange && <span className="rounded-full bg-tinta px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-amarelo">No alcance</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
