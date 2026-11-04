interface DevLocationPanelProps {
  pickingEnabled: boolean;
  isSimulated: boolean;
  onTogglePicking: () => void;
  onUseRealGps: () => void;
}

/** Controles do GPS simulado. Renderizar somente quando `SIMULATED_LOCATION_AVAILABLE` for true. */
export function DevLocationPanel({ pickingEnabled, isSimulated, onTogglePicking, onUseRealGps }: DevLocationPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-orange-400/40 bg-slate-900/90 px-3 py-2 text-xs text-orange-100 shadow-lg backdrop-blur">
      <span className="font-semibold uppercase tracking-wide text-orange-300">Dev</span>
      <button
        type="button"
        aria-pressed={pickingEnabled}
        onClick={onTogglePicking}
        className={`rounded-full px-3 py-1 font-medium ${pickingEnabled ? 'bg-orange-400 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'}`}
      >
        {pickingEnabled ? 'Toque no mapa…' : 'GPS simulado'}
      </button>
      {isSimulated && (
        <button type="button" onClick={onUseRealGps} className="rounded-full bg-slate-800 px-3 py-1 font-medium hover:bg-slate-700">
          Voltar ao GPS real
        </button>
      )}
    </div>
  );
}
