import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { CampusMap } from '../components/CampusMap.js';
import { DevLocationPanel } from '../components/DevLocationPanel.js';
import { LocationNotice } from '../components/LocationNotice.js';
import { NearbyRadar } from '../components/NearbyRadar.js';
import { SpawnDetails } from '../components/SpawnDetails.js';
import { createMockSpawns } from '../data/mockSpawns.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useSpawns, useZones } from '../hooks/useExplorationData.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { useNow } from '../hooks/useNow.js';
import type { LocationProvider } from '../services/location.js';
import { SIMULATED_LOCATION_AVAILABLE } from '../services/location.js';
import { createIndexedDbSpawnCache } from '../services/spawnCache.js';
import { createLocalFirstSpawnRepository, createMockSpawnRepository, type SpawnRepository } from '../services/spawnRepository.js';
import type { ZoneRepository } from '../services/zoneRepository.js';
import { localZoneRepository } from '../services/zoneStore.js';
import type { EncounterStartHandler, EncounterStartRequest, ExplorationSpawn, GeoPoint } from '../types.js';
import { ENCOUNTER_RADIUS_METERS, evaluateEncounter, isSpawnActive, nearbySpawns } from '../utils/encounter.js';
import { findZoneAt } from '../utils/geofence.js';

const spawnCache = createIndexedDbSpawnCache();

interface ExplorationPageProps {
  /** Contrato de início de encontro; implementado pelo módulo de batalha/captura. */
  onStartEncounter?: EncounterStartHandler;
  /** Padrão: spawns simulados gerados dentro das zonas atuais. */
  spawnRepository?: SpawnRepository;
  zoneRepository?: ZoneRepository;
  locationProvider?: LocationProvider;
  /** Conteúdo extra no cabeçalho (ex.: indicador de conexão). */
  headerAction?: ReactNode;
}

export function ExplorationPage({
  onStartEncounter,
  spawnRepository,
  zoneRepository = localZoneRepository,
  locationProvider,
  headerAction,
}: ExplorationPageProps) {
  const now = useNow();
  const geo = useGeolocation(locationProvider);
  const zones = useZones(zoneRepository);
  const settledZones = useDebouncedValue(zones, 400);
  const effectiveSpawnRepository = useMemo(
    () => spawnRepository ?? createLocalFirstSpawnRepository(createMockSpawnRepository((at) => createMockSpawns(at, settledZones)), spawnCache),
    [spawnRepository, settledZones],
  );
  const { spawns, error: spawnsError } = useSpawns(effectiveSpawnRepository);

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedSpawnId, setSelectedSpawnId] = useState<string | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [encounterPending, setEncounterPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const player: GeoPoint | null = geo.position;
  const activeZone = useMemo(() => (player ? findZoneAt(player, zones) : null), [player, zones]);
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;
  const activeSpawns = useMemo(() => spawns.filter((spawn) => isSpawnActive(spawn, now)), [spawns, now]);
  const nearby = useMemo(() => (player ? nearbySpawns(spawns, player, now) : []), [spawns, player, now]);
  const inRangeIds = useMemo(
    () => new Set(nearby.filter((item) => item.distanceMeters <= ENCOUNTER_RADIUS_METERS).map((item) => item.spawn.spawnId)),
    [nearby],
  );
  const selectedSpawn = spawns.find((spawn) => spawn.spawnId === selectedSpawnId) ?? null;
  const selectedEligibility = selectedSpawn ? evaluateEncounter(selectedSpawn, player, now) : null;

  const handleMapClick = useCallback((point: GeoPoint) => {
    geo.simulateAt(point);
    setPickingLocation(false);
  }, [geo]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 4_000);
  }, []);

  const startEncounter = useCallback(async (spawn: ExplorationSpawn) => {
    const position = geo.position;
    // Revalida no momento do clique (o spawn pode ter expirado ou o jogador se movido).
    const eligibility = evaluateEncounter(spawn, position, new Date());
    if (!eligibility.allowed || !position) return;
    if (position.source === 'simulated' && !SIMULATED_LOCATION_AVAILABLE) return;

    const request: EncounterStartRequest = {
      spawnId: spawn.spawnId,
      speciesId: spawn.speciesId,
      level: spawn.level,
      spawnToken: spawn.spawnToken,
      requestedAt: new Date().toISOString(),
      playerPosition: { latitude: position.latitude, longitude: position.longitude },
      locationSource: position.source,
      distanceMeters: eligibility.distanceMeters,
    };

    if (!onStartEncounter) {
      showToast('Encontro solicitado. O módulo de batalha ainda não está conectado.');
      return;
    }

    setEncounterPending(true);
    try {
      await onStartEncounter(request);
    } catch {
      showToast('Não foi possível iniciar o encontro. Tente novamente.');
    } finally {
      setEncounterPending(false);
    }
  }, [geo.position, onStartEncounter, showToast]);

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="z-[1000] flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-4 py-2">
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight">Pokémon Campus</h1>
          <p className="truncate text-xs text-slate-400">
            {player ? (activeZone ? <>Você está em <strong style={{ color: activeZone.color }}>{activeZone.name}</strong></> : 'Fora das zonas dos cursos') : 'Localização indisponível'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {geo.isSimulated && <span className="rounded-full bg-orange-400/20 px-2 py-1 text-xs font-semibold text-orange-200">GPS simulado</span>}
          {headerAction}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {tilesUnavailable ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 overflow-y-auto p-4">
            <p role="status" className="max-w-sm text-center text-sm text-amber-200">
              O mapa não pôde ser carregado (sem conexão ou servidor de mapas indisponível). Use o radar abaixo para encontrar Pokémon.
            </p>
            {player ? (
              <NearbyRadar player={player} nearby={nearby} selectedSpawnId={selectedSpawnId} onSelect={setSelectedSpawnId} expanded />
            ) : (
              <p className="text-sm text-slate-400">O radar precisa da sua localização.</p>
            )}
            <button type="button" onClick={() => setTilesUnavailable(false)} className="rounded-full bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700">
              Tentar carregar o mapa
            </button>
          </div>
        ) : (
          <div className={`h-full w-full ${pickingLocation ? 'cursor-crosshair' : ''}`}>
            <CampusMap
              zones={zones}
              spawns={activeSpawns}
              player={geo.position}
              activeZoneId={activeZone?.id ?? null}
              selectedZoneId={selectedZoneId}
              selectedSpawnId={selectedSpawnId}
              inRangeSpawnIds={inRangeIds}
              recenterSignal={recenterSignal}
              onSelectZone={setSelectedZoneId}
              onSelectSpawn={setSelectedSpawnId}
              onMapClick={SIMULATED_LOCATION_AVAILABLE && pickingLocation ? handleMapClick : undefined}
              onTilesUnavailable={setTilesUnavailable}
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex flex-col gap-2 [&>*]:pointer-events-auto">
          <LocationNotice status={geo.status} error={geo.error} simulationAvailable={geo.simulationAvailable} />
          {spawnsError && <p role="alert" className="rounded-2xl bg-rose-950/90 px-4 py-2 text-sm text-rose-100">{spawnsError}</p>}
          {selectedZone && (
            <div className="flex items-center gap-2 self-start rounded-full bg-slate-900/90 px-3 py-1.5 text-sm shadow-lg">
              <span className="h-3 w-3 rounded-full" style={{ background: selectedZone.color }} aria-hidden="true" />
              <span>
                {selectedZone.name}
                {selectedZone.isDemo && <span className="text-slate-400"> · área de demonstração</span>}
              </span>
              <button type="button" onClick={() => setSelectedZoneId(null)} aria-label="Fechar zona selecionada" className="text-slate-400">✕</button>
            </div>
          )}
          {SIMULATED_LOCATION_AVAILABLE && (
            <div className="self-start">
              <DevLocationPanel
                pickingEnabled={pickingLocation}
                isSimulated={geo.isSimulated}
                onTogglePicking={() => setPickingLocation((value) => !value)}
                onUseRealGps={geo.stopSimulation}
              />
            </div>
          )}
        </div>

        {player && !tilesUnavailable && (
          <button
            type="button"
            onClick={() => setRecenterSignal((value) => value + 1)}
            className="absolute bottom-4 right-3 z-[1000] grid h-12 w-12 place-items-center rounded-full bg-slate-900/95 text-xl shadow-lg hover:bg-slate-800"
            aria-label="Centralizar no jogador"
          >
            ◎
          </button>
        )}

        {toast && (
          <p role="status" className="absolute inset-x-3 bottom-20 z-[1000] mx-auto max-w-md rounded-2xl bg-emerald-900/95 px-4 py-3 text-center text-sm text-emerald-50 shadow-lg">
            {toast}
          </p>
        )}
      </div>

      <footer className="z-[1000] max-h-[45dvh] overflow-y-auto border-t border-slate-800 bg-slate-950 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {selectedSpawn && selectedEligibility ? (
          <SpawnDetails
            spawn={selectedSpawn}
            eligibility={selectedEligibility}
            now={now}
            pending={encounterPending}
            onStartEncounter={startEncounter}
            onClose={() => setSelectedSpawnId(null)}
          />
        ) : player && !tilesUnavailable ? (
          <NearbyRadar player={player} nearby={nearby} selectedSpawnId={selectedSpawnId} onSelect={setSelectedSpawnId} />
        ) : (
          <p className="text-sm text-slate-400">{activeSpawns.length} Pokémon ativos no campus. Toque em um para ver detalhes.</p>
        )}
      </footer>
    </div>
  );
}
