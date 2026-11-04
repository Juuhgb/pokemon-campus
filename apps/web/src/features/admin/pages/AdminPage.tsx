import { useMemo, useState, type ReactNode } from 'react';
import { CampusMap } from '../../exploration/components/CampusMap.js';
import { createMockSpawns } from '../../exploration/data/mockSpawns.js';
import { useDebouncedValue } from '../../exploration/hooks/useDebouncedValue.js';
import { useNow } from '../../exploration/hooks/useNow.js';
import type { ZoneRepository } from '../../exploration/services/zoneRepository.js';
import { localZoneRepository } from '../../exploration/services/zoneStore.js';
import { isSpawnActive } from '../../exploration/utils/encounter.js';
import { ADMIN_AVAILABLE } from '../access.js';
import { ZoneEditorLayer } from '../components/ZoneEditorLayer.js';
import { ZoneEditorPanel } from '../components/ZoneEditorPanel.js';
import { useEditableZones } from '../hooks/useEditableZones.js';
import { useZoneEditor } from '../hooks/useZoneEditor.js';

interface AdminPageProps {
  zoneRepository?: ZoneRepository;
  /** Conteúdo extra no cabeçalho (ex.: indicador de conexão). */
  headerAction?: ReactNode;
}

const NO_SPAWNS_IN_RANGE: ReadonlySet<string> = new Set();
const noop = () => {};

function AdminUnavailable() {
  return (
    <main className="grid min-h-full place-items-center bg-slate-950 p-6 text-center text-slate-100">
      <div className="max-w-sm">
        <h1 className="text-xl font-bold">Painel de admin indisponível</h1>
        <p className="mt-2 text-sm text-slate-400">O painel ainda não está liberado nesta versão do jogo.</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-emerald-500 px-4 py-2 font-semibold text-slate-950">Voltar ao jogo</a>
      </div>
    </main>
  );
}

export function AdminPage({ zoneRepository = localZoneRepository, headerAction }: AdminPageProps) {
  if (!ADMIN_AVAILABLE) return <AdminUnavailable />;
  return <AdminZonesScreen zoneRepository={zoneRepository} headerAction={headerAction} />;
}

function AdminZonesScreen({ zoneRepository, headerAction }: Required<Pick<AdminPageProps, 'zoneRepository'>> & Pick<AdminPageProps, 'headerAction'>) {
  const editableZones = useEditableZones(zoneRepository);
  const { zones } = editableZones;
  const editor = useZoneEditor(editableZones);
  const [showSpawns, setShowSpawns] = useState(true);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);

  // Prévia dos Pokémon simulados que as zonas atuais gerariam agora.
  const now = useNow(30_000);
  const settledZones = useDebouncedValue(zones, 400);
  const spawns = useMemo(
    () => (showSpawns ? createMockSpawns(now, settledZones).filter((spawn) => isSpawnActive(spawn, now)) : []),
    [showSpawns, now, settledZones],
  );

  const drawing = editor.state.mode === 'draw';
  const editingZoneId = editor.state.mode === 'edit' ? editor.state.zoneId : null;

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <header className="z-[1000] flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-4 py-2">
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight">
            Pokémon Campus <span className="rounded-md bg-orange-400/20 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-orange-200">Admin</span>
          </h1>
          <p className="truncate text-xs text-slate-400">Zonas de spawn · {zones.length} {zones.length === 1 ? 'zona' : 'zonas'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerAction}
          <a href="/" className="rounded-full bg-slate-800 px-3 py-1.5 text-sm font-medium hover:bg-slate-700">Ver o jogo</a>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section aria-label="Mapa das zonas" className={`relative min-h-0 flex-1 ${drawing ? 'cursor-crosshair' : ''}`}>
          <CampusMap
            zones={zones}
            spawns={spawns}
            player={null}
            activeZoneId={null}
            selectedZoneId={editingZoneId}
            selectedSpawnId={null}
            inRangeSpawnIds={NO_SPAWNS_IN_RANGE}
            recenterSignal={0}
            onSelectZone={editor.handleZoneClick}
            onSelectSpawn={noop}
            onMapClick={drawing ? editor.handleMapClick : undefined}
            onTilesUnavailable={setTilesUnavailable}
          >
            <ZoneEditorLayer state={editor.state} zones={zones} {...editor.layer} />
          </CampusMap>

          <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex flex-col items-start gap-2 [&>*]:pointer-events-auto">
            {drawing && (
              <p role="status" className="rounded-2xl bg-orange-500/90 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg">
                Desenhando: toque no mapa para marcar os cantos
              </p>
            )}
            {tilesUnavailable && (
              <p role="alert" className="rounded-2xl bg-amber-950/90 px-3 py-1.5 text-xs text-amber-100 shadow-lg">
                Mapa base indisponível (sem conexão?). As zonas continuam editáveis.
              </p>
            )}
            <label className="flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1.5 text-xs shadow-lg">
              <input type="checkbox" checked={showSpawns} onChange={(event) => setShowSpawns(event.target.checked)} />
              Mostrar Pokémon gerados
            </label>
          </div>
        </section>

        <aside className="max-h-[45dvh] overflow-y-auto border-t border-slate-800 bg-slate-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:max-h-none md:w-96 md:border-l md:border-t-0">
          <ZoneEditorPanel state={editor.state} zones={zones} actions={editor.actions} />
          <p className="mt-4 border-t border-slate-800 pt-3 text-xs leading-5 text-slate-500">
            As zonas são salvas neste navegador e aparecem no jogo deste dispositivo. Para todos os jogadores, exporte o JSON e publique as zonas pela API.
          </p>
        </aside>
      </div>
    </div>
  );
}
