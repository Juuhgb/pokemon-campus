import { useState } from 'react';
import { getSpecies, RARITY_LABEL, SPECIES } from '../../catalog/species.js';
import type { GeolocationState } from '../../exploration/hooks/useGeolocation.js';
import { ADMIN_SPAWN_DURATIONS } from '../../exploration/services/adminSpawns.js';
import type { ExplorationSpawn } from '../../exploration/types.js';
import { formatDistance, haversineMeters } from '../../exploration/utils/distance.js';
import { isSpawnActive } from '../../exploration/utils/encounter.js';
import type { AdminSpawns } from '../hooks/useAdminSpawns.js';

interface AdminSpawnPanelProps {
  admin: AdminSpawns;
  geo: Pick<GeolocationState, 'position' | 'status' | 'error'>;
  now: Date;
  /** "Escolher no mapa" ligado: o próximo toque no mapa coloca o Pokémon. */
  picking: boolean;
  onTogglePicking: () => void;
  /** Formulário atual, usado também quando o toque no mapa coloca o Pokémon. */
  form: SpawnForm;
  onFormChange: (form: SpawnForm) => void;
  onPlaced?: (spawn: ExplorationSpawn) => void;
}

export interface SpawnForm {
  speciesId: string;
  level: number;
  durationMinutes: number;
}

export const DEFAULT_SPAWN_FORM: SpawnForm = { speciesId: SPECIES[0]?.id ?? 'brotinho', level: 5, durationMinutes: 120 };

const button = 'min-h-11 rounded-full px-4 text-sm font-semibold disabled:opacity-40';

function remaining(spawn: ExplorationSpawn, now: Date): string {
  const minutes = Math.max(0, Math.round((Date.parse(spawn.expiresAt) - now.getTime()) / 60_000));
  if (minutes >= 24 * 60) return `${Math.round(minutes / (24 * 60))} dia(s)`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} h`;
  return `${minutes} min`;
}

/** Painel do admin para colocar Pokémon onde você está (GPS) ou num ponto do mapa. */
export function AdminSpawnPanel({ admin, geo, now, picking, onTogglePicking, form, onFormChange, onPlaced }: AdminSpawnPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const position = geo.position;
  const active = admin.spawns.filter((spawn) => isSpawnActive(spawn, now));
  const expired = admin.spawns.length - active.length;

  const placeHere = async () => {
    if (!position) return;
    const spawn = await admin.add({ ...form, point: position });
    setMessage(`${getSpecies(spawn.speciesId).displayName} colocado onde você está.`);
    onPlaced?.(spawn);
  };

  return (
    <section aria-label="Colocar Pokémon" className="flex flex-col gap-3">
      <h2 className="m-0 text-base font-semibold text-orange-200">Colocar Pokémon</h2>

      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 flex flex-col gap-1 text-sm">
          Pokémon
          <select
            value={form.speciesId}
            onChange={(event) => onFormChange({ ...form, speciesId: event.target.value })}
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-slate-100"
          >
            {SPECIES.map((species) => (
              <option key={species.id} value={species.id}>
                #{species.number} {species.displayName} · {RARITY_LABEL[species.rarity]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Nível
          <input
            type="number"
            min={1}
            max={100}
            value={form.level}
            onChange={(event) => onFormChange({ ...form, level: Math.min(100, Math.max(1, Number(event.target.value) || 1)) })}
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Fica por
          <select
            value={form.durationMinutes}
            onChange={(event) => onFormChange({ ...form, durationMinutes: Number(event.target.value) })}
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-slate-100"
          >
            {ADMIN_SPAWN_DURATIONS.map((duration) => (
              <option key={duration.minutes} value={duration.minutes}>{duration.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p role="status" className="m-0 text-xs text-slate-400">
        {position
          ? `Sua posição: ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}${position.accuracyMeters > 0 ? ` (±${Math.round(position.accuracyMeters)} m)` : ''}`
          : geo.error?.message ?? 'Procurando sua posição pelo GPS…'}
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!position} onClick={() => void placeHere()} className={`${button} bg-orange-400 text-slate-950 hover:bg-orange-300`}>
          Colocar onde estou
        </button>
        <button type="button" aria-pressed={picking} onClick={onTogglePicking} className={`${button} ${picking ? 'bg-orange-200 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'}`}>
          {picking ? 'Toque no mapa…' : 'Escolher no mapa'}
        </button>
      </div>
      {message && <p role="status" className="m-0 text-xs text-emerald-300">{message}</p>}

      <div className="flex items-center justify-between border-t border-slate-800 pt-3">
        <h3 className="m-0 text-sm font-semibold">Colocados ({active.length})</h3>
        {admin.spawns.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Remover todos os Pokémon colocados?')) void admin.clear();
            }}
            className="text-xs text-rose-300 underline"
          >
            Remover todos
          </button>
        )}
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {active.length === 0 && <li className="text-sm text-slate-500">Nenhum Pokémon colocado ainda.</li>}
        {active.map((spawn) => {
          const species = getSpecies(spawn.speciesId);
          const distance = position ? formatDistance(haversineMeters(position, spawn)) : null;
          return (
            <li key={spawn.spawnId} className="flex items-center gap-2 rounded-lg bg-slate-900 px-2 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {species.displayName} <span className="text-slate-400">Nv. {spawn.level} · some em {remaining(spawn, now)}{distance ? ` · a ${distance}` : ''}</span>
              </span>
              <button type="button" onClick={() => void admin.remove(spawn.spawnId)} aria-label={`Remover ${species.displayName}`} className="grid h-9 w-9 place-items-center rounded-lg text-rose-300 hover:bg-slate-800">
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      {expired > 0 && <p className="m-0 text-xs text-slate-500">{expired} já expirado(s) — “Remover todos” limpa a lista.</p>}
      <p className="m-0 text-xs leading-5 text-slate-500">
        Os Pokémon colocados são publicados e aparecem no jogo de todos os jogadores (na hora, para quem está online).
      </p>
    </section>
  );
}
