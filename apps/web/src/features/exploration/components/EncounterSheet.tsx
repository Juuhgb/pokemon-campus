import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { buttonStyles } from '../../../components/ui/ui.js';
import { getSpecies, RARITY_CHIP, RARITY_LABEL } from '../../catalog/species.js';
import type { EncounterBlockReason, EncounterEligibility, ExplorationSpawn } from '../types.js';
import { formatDistance } from '../utils/distance.js';
import { ENCOUNTER_RADIUS_METERS } from '../utils/encounter.js';

interface EncounterSheetProps {
  spawn: ExplorationSpawn;
  eligibility: EncounterEligibility;
  now: Date;
  zoneName?: string;
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
      return `Chegue a até ${ENCOUNTER_RADIUS_METERS} m para interagir. Faltam ${formatDistance(Math.max(0, (distanceMeters ?? 0) - ENCOUNTER_RADIUS_METERS))}.`;
  }
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
}

/** Tela de encontro: o Pokémon em destaque e o botão Batalhar / Capturar. */
export function EncounterSheet({ spawn, eligibility, now, zoneName, pending = false, onStartEncounter, onClose }: EncounterSheetProps) {
  const species = getSpecies(spawn.speciesId);
  const remainingMs = Date.parse(spawn.expiresAt) - now.getTime();
  const chip = RARITY_CHIP[spawn.rarity];

  return (
    <section aria-labelledby="encounter-title" className="fixed inset-0 z-[1100] flex flex-col overflow-y-auto bg-creme text-tinta">
      <div className="relative h-[330px] shrink-0 overflow-hidden border-b-[2.5px] border-tinta bg-ceu">
        <svg width="100%" height="330" viewBox="0 0 390 330" preserveAspectRatio="xMidYMax slice" aria-hidden="true" className="absolute inset-0">
          <circle cx="320" cy="70" r="30" fill="#ffc23d" stroke="#1d1b3a" strokeWidth="2.5" />
          <path d="M40 90 q20-22 44-6 q14-16 34 0 q16 4 10 18 h-92 q-10-6 4-12z" fill="#ffffff" stroke="#1d1b3a" strokeWidth="2.5" />
          <path d="M-10 250 Q 100 200 200 240 T 400 230 V 340 H -10 Z" fill="#9fd477" stroke="#1d1b3a" strokeWidth="2.5" />
          <ellipse cx="195" cy="262" rx="92" ry="20" fill="#7cc35c" stroke="#1d1b3a" strokeWidth="2.5" />
        </svg>
        <button
          type="button"
          onClick={onClose}
          aria-label="Voltar ao mapa"
          className="absolute top-4 left-4 grid h-12 w-12 place-items-center rounded-2xl sticker-sm bg-white"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        {remainingMs > 0 && (
          <span className="absolute top-5 right-4 rounded-full ink-border bg-white px-3 py-1.5 text-[13px] font-extrabold">Some em {formatRemaining(remainingMs)}</span>
        )}
        <div className="absolute top-[120px] left-1/2 -translate-x-1/2">
          <CreatureBadge kind={species.kind} color={species.color} size={140} label={species.displayName} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 pt-5 pb-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 id="encounter-title" className="m-0 font-display text-4xl leading-none font-bold">{species.displayName}</h1>
            <p className="mt-1.5 mb-0 text-[15px] font-bold text-tinta-suave">Um Pokémon selvagem apareceu!</p>
          </div>
          <span className="rounded-xl bg-tinta px-3 py-1.5 font-display text-lg font-semibold text-amarelo">Nv. {spawn.level}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border-2 border-tinta px-3 py-1 text-[13px] font-extrabold" style={{ background: species.color }}>{species.type}</span>
          <span className="rounded-full border-2 border-tinta px-3 py-1 text-[13px] font-extrabold" style={{ background: chip.bg, color: chip.fg }}>{RARITY_LABEL[spawn.rarity]}</span>
          {zoneName && <span className="rounded-full border-2 border-tinta bg-white px-3 py-1 text-[13px] font-extrabold">{zoneName}</span>}
        </div>

        <div className={`flex items-center gap-3.5 rounded-[20px] sticker px-4 py-3.5 ${eligibility.allowed ? 'bg-verde' : 'bg-white'}`}>
          <span className="font-display text-[34px] leading-none font-bold">
            {eligibility.distanceMeters === null ? '—' : formatDistance(eligibility.distanceMeters)}
          </span>
          <span role="status" className="flex-1 text-sm leading-snug font-extrabold">
            {eligibility.allowed ? 'Você está no alcance! Pode batalhar.' : blockReasonMessage(eligibility.reason, eligibility.distanceMeters)}
          </span>
        </div>

        <div className="mt-auto flex flex-col gap-2.5">
          <button
            type="button"
            disabled={!eligibility.allowed || pending}
            onClick={() => onStartEncounter(spawn)}
            className={`${buttonStyles.primary} h-[62px] text-[22px]`}
          >
            {pending ? 'Iniciando…' : 'Batalhar / Capturar'}
          </button>
          <button type="button" onClick={onClose} className={buttonStyles.link}>Voltar ao mapa</button>
        </div>
      </div>
    </section>
  );
}
