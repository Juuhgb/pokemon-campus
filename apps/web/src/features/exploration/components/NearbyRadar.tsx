import { RARITY_COLOR, RARITY_LABEL, speciesDisplay } from '../data/species.js';
import type { GeoPoint } from '../types.js';
import { bearingDegrees, formatDistance } from '../utils/distance.js';
import { ENCOUNTER_RADIUS_METERS, type NearbySpawn } from '../utils/encounter.js';

interface NearbyRadarProps {
  player: GeoPoint;
  nearby: NearbySpawn[];
  /** Alcance exibido pelo radar, em metros. */
  rangeMeters?: number;
  selectedSpawnId: string | null;
  onSelect: (spawnId: string) => void;
  /** Layout ampliado, usado quando os tiles do mapa não estão disponíveis. */
  expanded?: boolean;
}

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 8;

/**
 * Radar independente dos tiles: funciona offline, apenas com a posição do jogador
 * e as coordenadas dos spawns (norte para cima).
 */
export function NearbyRadar({ player, nearby, rangeMeters = 250, selectedSpawnId, onSelect, expanded = false }: NearbyRadarProps) {
  const visible = nearby.filter((item) => item.distanceMeters <= rangeMeters);
  const encounterRing = (ENCOUNTER_RADIUS_METERS / rangeMeters) * RADIUS;

  return (
    <section aria-label="Radar de Pokémon próximos" className={`flex ${expanded ? 'flex-col items-center gap-4' : 'items-center gap-3'}`}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={expanded ? 'w-full max-w-xs' : 'h-28 w-28 shrink-0'}
        role="img"
        aria-label={`${visible.length} Pokémon em até ${rangeMeters} metros`}
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS} className="fill-emerald-950/70 stroke-emerald-500/50" />
        <circle cx={CENTER} cy={CENTER} r={RADIUS / 2} className="fill-none stroke-emerald-500/30" />
        <circle cx={CENTER} cy={CENTER} r={encounterRing} className="fill-cyan-400/10 stroke-cyan-300/70" strokeDasharray="3 3" />
        <line x1={CENTER} y1={8} x2={CENTER} y2={SIZE - 8} className="stroke-emerald-500/20" />
        <line x1={8} y1={CENTER} x2={SIZE - 8} y2={CENTER} className="stroke-emerald-500/20" />
        <text x={CENTER} y={20} textAnchor="middle" className="fill-emerald-300 text-[11px] font-semibold">N</text>
        {visible.map(({ spawn, distanceMeters }) => {
          const angle = (bearingDegrees(player, spawn) * Math.PI) / 180;
          const r = (distanceMeters / rangeMeters) * RADIUS;
          const x = CENTER + r * Math.sin(angle);
          const y = CENTER - r * Math.cos(angle);
          const selected = spawn.spawnId === selectedSpawnId;
          return (
            <circle
              key={spawn.spawnId}
              cx={x}
              cy={y}
              r={selected ? 7 : 5}
              fill={RARITY_COLOR[spawn.rarity]}
              stroke={selected ? '#fff' : '#020617'}
              strokeWidth={2}
            />
          );
        })}
        <circle cx={CENTER} cy={CENTER} r={5} className="fill-sky-400 stroke-white" strokeWidth={2} />
      </svg>

      <ul className={`flex min-w-0 flex-1 flex-col gap-1 ${expanded ? 'w-full' : 'max-h-28 overflow-y-auto'}`}>
        {visible.length === 0 && <li className="text-sm text-slate-400">Nenhum Pokémon em até {rangeMeters} m.</li>}
        {visible.map(({ spawn, distanceMeters }) => {
          const species = speciesDisplay(spawn.speciesId);
          return (
            <li key={spawn.spawnId}>
              <button
                type="button"
                onClick={() => onSelect(spawn.spawnId)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-slate-800 ${spawn.spawnId === selectedSpawnId ? 'bg-slate-800' : ''}`}
              >
                <span aria-hidden="true">{species.emoji}</span>
                <span className="min-w-0 flex-1 truncate">
                  {species.displayName} <span className="text-slate-400">Nv. {spawn.level}</span>
                </span>
                <span className="sr-only">{RARITY_LABEL[spawn.rarity]},</span>
                <span className={distanceMeters <= ENCOUNTER_RADIUS_METERS ? 'font-semibold text-cyan-300' : 'text-slate-300'}>
                  {formatDistance(distanceMeters)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
