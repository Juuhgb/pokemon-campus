interface DevLocationPanelProps {
  pickingEnabled: boolean;
  isSimulated: boolean;
  onTogglePicking: () => void;
  onUseRealGps: () => void;
}

/** Controles do GPS simulado. Renderizar somente quando `SIMULATED_LOCATION_AVAILABLE` for true. */
export function DevLocationPanel({ pickingEnabled, isSimulated, onTogglePicking, onUseRealGps }: DevLocationPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl ink-border bg-white px-2.5 py-1.5 text-xs font-extrabold">
      <span className="rounded-md bg-tinta px-1.5 py-0.5 text-amarelo">DEV</span>
      <button
        type="button"
        aria-pressed={pickingEnabled}
        onClick={onTogglePicking}
        className={`min-h-9 rounded-full border-2 border-tinta px-3 ${pickingEnabled ? 'bg-amarelo' : 'bg-white'}`}
      >
        {pickingEnabled ? 'Toque no mapa…' : 'GPS simulado'}
      </button>
      {isSimulated && (
        <button type="button" onClick={onUseRealGps} className="min-h-9 rounded-full border-2 border-tinta bg-white px-3">
          Voltar ao GPS real
        </button>
      )}
    </div>
  );
}
