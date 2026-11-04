import { useState, type ChangeEvent } from 'react';
import type { CampusZone } from '../types.js';
import { polygonAreaSquareMeters } from '../utils/zoneGeometry.js';
import type { ZoneEditorState } from './ZoneEditorLayer.js';

export interface ZoneEditorActions {
  close: () => void;
  select: (zoneId: string) => void;
  backToList: () => void;
  startDrawing: () => void;
  undoPoint: () => void;
  cancelDrawing: () => void;
  finishDrawing: (name: string) => void;
  rename: (zoneId: string, name: string) => void;
  recolor: (zoneId: string, color: string) => void;
  remove: (zoneId: string) => void;
  importZones: (json: string) => boolean;
  exportZones: () => string;
  reset: () => void;
}

interface ZoneEditorPanelProps {
  state: ZoneEditorState;
  zones: CampusZone[];
  actions: ZoneEditorActions;
}

const buttonClass = 'rounded-full bg-slate-800 px-3 py-1.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-40';
const primaryClass = 'rounded-full bg-orange-400 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-orange-300 disabled:opacity-40';

function formatArea(squareMeters: number): string {
  return squareMeters >= 10_000 ? `${(squareMeters / 10_000).toFixed(2).replace('.', ',')} ha` : `${Math.round(squareMeters)} m²`;
}

function DrawPanel({ points, actions }: { points: number; actions: ZoneEditorActions }) {
  const [name, setName] = useState('');
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-300">
        Toque no mapa para marcar os cantos da zona, na ordem do contorno. <strong>{points}</strong> {points === 1 ? 'ponto' : 'pontos'} (mínimo 3).
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Nome da zona
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Ex.: Ciência da Computação"
          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} onClick={actions.undoPoint} disabled={points === 0}>Desfazer ponto</button>
        <button type="button" className={buttonClass} onClick={actions.cancelDrawing}>Cancelar</button>
        <button type="button" className={primaryClass} onClick={() => actions.finishDrawing(name.trim() || 'Nova zona')} disabled={points < 3}>
          Salvar zona
        </button>
      </div>
    </div>
  );
}

function EditPanel({ zone, actions }: { zone: CampusZone; actions: ZoneEditorActions }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Nome
          <input value={zone.name} onChange={(event) => actions.rename(zone.id, event.target.value)} maxLength={80}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Cor
          <input type="color" value={zone.color} onChange={(event) => actions.recolor(zone.id, event.target.value)}
            className="h-10 w-14 cursor-pointer rounded-xl border border-slate-700 bg-slate-900" />
        </label>
      </div>
      <p className="text-xs leading-5 text-slate-400">
        {zone.boundary.length} vértices · {formatArea(polygonAreaSquareMeters(zone.boundary))}. Arraste os quadrados brancos para mover cantos,
        toque nos <strong>+</strong> para criar um canto novo, toque duas vezes (ou segure) num canto para removê-lo e arraste <strong>✥</strong> para
        mover a zona inteira. As alterações são salvas automaticamente.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} onClick={actions.backToList}>Voltar à lista</button>
        <button
          type="button"
          className="rounded-full bg-rose-900 px-3 py-1.5 text-sm font-medium text-rose-100 hover:bg-rose-800"
          onClick={() => {
            if (window.confirm(`Excluir a zona “${zone.name}”?`)) actions.remove(zone.id);
          }}
        >
          Excluir zona
        </button>
      </div>
    </div>
  );
}

function ListPanel({ zones, actions }: { zones: CampusZone[]; actions: ZoneEditorActions }) {
  const [message, setMessage] = useState<string | null>(null);

  const download = () => {
    const json = actions.exportZones();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zonas-pokemon-campus.json';
    link.click();
    URL.revokeObjectURL(url);
    navigator.clipboard?.writeText(json).catch(() => undefined);
    setMessage('JSON baixado (e copiado, se o navegador permitir).');
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage(actions.importZones(await file.text()) ? 'Zonas importadas.' : 'Arquivo inválido: esperado o JSON exportado pelo editor.');
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-300">Toque numa zona da lista ou no mapa para editar.</p>
      <ul className="flex flex-col gap-1">
        {zones.map((zone) => (
          <li key={zone.id}>
            <button type="button" onClick={() => actions.select(zone.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-800">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: zone.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{zone.name}</span>
              {zone.isDemo && <span className="text-xs text-slate-500">demonstração</span>}
            </button>
          </li>
        ))}
        {zones.length === 0 && <li className="text-sm text-slate-500">Nenhuma zona. Crie a primeira.</li>}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryClass} onClick={actions.startDrawing}>+ Nova zona</button>
        <button type="button" className={buttonClass} onClick={download}>Exportar JSON</button>
        <label className={`${buttonClass} cursor-pointer`}>
          Importar JSON
          <input type="file" accept="application/json,.json" className="sr-only" onChange={importFile} />
        </label>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            if (window.confirm('Descartar todas as edições e voltar às zonas padrão?')) actions.reset();
          }}
        >
          Restaurar padrão
        </button>
      </div>
      {message && <p role="status" className="text-xs text-slate-400">{message}</p>}
    </div>
  );
}

export function ZoneEditorPanel({ state, zones, actions }: ZoneEditorPanelProps) {
  const editing = state.mode === 'edit' ? zones.find((zone) => zone.id === state.zoneId) : undefined;
  const title = state.mode === 'draw' ? 'Nova zona' : editing ? `Editando: ${editing.name || 'sem nome'}` : 'Editor de zonas';

  return (
    <section aria-label="Editor de zonas" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate text-base font-semibold text-orange-200">{title}</h2>
        <button type="button" className={buttonClass} onClick={actions.close}>Sair do editor</button>
      </div>
      {state.mode === 'draw' && <DrawPanel points={state.points.length} actions={actions} />}
      {editing && <EditPanel zone={editing} actions={actions} />}
      {state.mode !== 'draw' && !editing && <ListPanel zones={zones} actions={actions} />}
    </section>
  );
}
