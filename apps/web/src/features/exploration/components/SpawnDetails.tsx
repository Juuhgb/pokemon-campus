import { RARITY_COLOR, RARITY_LABEL, speciesDisplay } from '../data/species.js';
import type { EncounterBlockReason, EncounterEligibility, ExplorationSpawn } from '../types.js';
import { formatDistance } from '../utils/distance.js';
import { ENCOUNTER_RADIUS_METERS } from '../utils/encounter.js';

interface SpawnDetailsProps {
  spawn: ExplorationSpawn;
  eligibility: EncounterEligibility;
  now: Date;
  pending?: boolean;
  onStartEncounter: (spawn: ExplorationSpawn) => void;
  onClose: () => void;
}

export function blockReasonMessage(reason: EncounterBlockReason, distanceMeters: number | null): string {
  switch (reason) {
    case 'no-location':
      return 'Aguardando sua localização para calcular a distância.';
    case 'not-started':
      return 'Este Pokémon ainda não apareceu.';
    case 'expired':
      return 'Este Pokémon já foi embora.';
    case 'out-of-range':
      return `Chegue a até ${ENCOUNTER_RADIUS_METERS} m para interagir (faltam ${formatDistance(Math.max(0, (distanceMeters ?? 0) - ENCOUNTER_RADIUS_METERS))}).`;
  }
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function SpawnDetails({ spawn, eligibility, now, pending = false, onStartEncounter, onClose }: SpawnDetailsProps) {
  const species = speciesDisplay(spawn.speciesId);
  const remainingMs = Date.parse(spawn.expiresAt) - now.getTime();

  return (
    <section aria-labelledby="spawn-details-title" className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 bg-slate-800 text-3xl"
          style={{ borderColor: RARITY_COLOR[spawn.rarity] }}
          aria-hidden="true"
        >
          {species.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="spawn-details-title" className="truncate text-lg font-semibold">{species.displayName}</h2>
          <p className="text-sm text-slate-300">
            Nível {spawn.level} ·{' '}
            <span style={{ color: RARITY_COLOR[spawn.rarity] }}>{RARITY_LABEL[spawn.rarity]}</span>
          </p>
          <p className="text-sm text-slate-400">
            {eligibility.distanceMeters === null ? 'Distância desconhecida' : `A ${formatDistance(eligibility.distanceMeters)}`}
            {remainingMs > 0 && ` · some em ${formatRemaining(remainingMs)}`}
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-slate-400 hover:bg-slate-800" aria-label="Fechar detalhes">
          ✕
        </button>
      </div>

      {!eligibility.allowed && (
        <p role="status" className="text-sm text-amber-200">{blockReasonMessage(eligibility.reason, eligibility.distanceMeters)}</p>
      )}

      <button
        type="button"
        disabled={!eligibility.allowed || pending}
        onClick={() => onStartEncounter(spawn)}
        className="rounded-2xl bg-emerald-500 px-4 py-3 text-base font-bold text-slate-950 enabled:hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {pending ? 'Iniciando…' : 'Batalhar / Capturar'}
      </button>
    </section>
  );
}
