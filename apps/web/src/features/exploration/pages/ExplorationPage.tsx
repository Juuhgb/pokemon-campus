import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CampusMap } from '../components/CampusMap.js';
import { DevLocationPanel } from '../components/DevLocationPanel.js';
import { EncounterSheet } from '../components/EncounterSheet.js';
import { LocationNotice } from '../components/LocationNotice.js';
import { NearbyCards } from '../components/NearbyCards.js';
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
import { ENCOUNTER_RADIUS_METERS, evaluateEncounter, nearbySpawns, VISIBILITY_RADIUS_METERS } from '../utils/encounter.js';
import { findZoneAt } from '../utils/geofence.js';

/** Por quanto tempo o aviso de localização fica visível depois do toque. */
const LOCATION_HELP_MS = 5000;

const spawnCache = createIndexedDbSpawnCache();

interface ExplorationPageProps {
  /** Contrato de início de encontro; implementado pelo módulo de batalha/captura. */
  onStartEncounter?: EncounterStartHandler;
  /** Padrão: spawns simulados gerados dentro das zonas atuais. */
  spawnRepository?: SpawnRepository;
  zoneRepository?: ZoneRepository;
  locationProvider?: LocationProvider;
  /** Conteúdo extra no topo (ex.: indicador de conexão). */
  headerAction?: ReactNode;
  /** Conteúdo fixo embaixo do mapa (ex.: barra de navegação). */
  footer?: ReactNode;
  /** Spawns que não devem aparecer (ex.: já capturados nesta sessão). */
  hiddenSpawnIds?: ReadonlySet<string>;
}

const NO_HIDDEN: ReadonlySet<string> = new Set();

export function ExplorationPage({
  onStartEncounter,
  spawnRepository,
  zoneRepository = localZoneRepository,
  locationProvider,
  headerAction,
  footer,
  hiddenSpawnIds = NO_HIDDEN,
}: ExplorationPageProps) {
  const now = useNow();
  const geo = useGeolocation(locationProvider);
  const zones = useZones(zoneRepository);
  const settledZones = useDebouncedValue(zones, 400);
  const effectiveSpawnRepository = useMemo(
    () => spawnRepository ?? createLocalFirstSpawnRepository(createMockSpawnRepository((at) => createMockSpawns(at, settledZones)), spawnCache),
    [spawnRepository, settledZones],
  );
  const { spawns: allSpawns, error: spawnsError } = useSpawns(effectiveSpawnRepository);
  const spawns = useMemo(() => allSpawns.filter((spawn) => !hiddenSpawnIds.has(spawn.spawnId)), [allSpawns, hiddenSpawnIds]);

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedSpawnId, setSelectedSpawnId] = useState<string | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [encounterPending, setEncounterPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** O aviso de localização com erro só aparece depois de um toque no cabeçalho, e some sozinho. */
  const [locationHelpOpen, setLocationHelpOpen] = useState(false);
  useEffect(() => {
    if (!locationHelpOpen) return undefined;
    const timer = window.setTimeout(() => setLocationHelpOpen(false), LOCATION_HELP_MS);
    return () => window.clearTimeout(timer);
  }, [locationHelpOpen]);

  const player: GeoPoint | null = geo.position;
  const activeZone = useMemo(() => (player ? findZoneAt(player, zones) : null), [player, zones]);
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;
  // Só os Pokémon perto do jogador aparecem (mapa e lista); sem localização, nenhum.
  const nearby = useMemo(
    () => (player ? nearbySpawns(spawns, player, now, VISIBILITY_RADIUS_METERS) : []),
    [spawns, player, now],
  );
  const visibleSpawns = useMemo(() => nearby.map((item) => item.spawn), [nearby]);
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
      battleSeed: spawn.battleSeed,
      rulesVersion: spawn.rulesVersion,
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

  const zoneLabel = player ? (activeZone ? activeZone.name : 'Fora das zonas dos cursos') : 'Localização indisponível';
  const selectedZoneName = selectedSpawn ? zones.find((zone) => zone.id === selectedSpawn.zoneId)?.name : undefined;

  return (
    <div className="flex h-full flex-col bg-creme text-tinta">
      <div className="relative min-h-0 flex-1">
        {tilesUnavailable ? (
          <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 pt-28 pb-6">
            <p role="status" className="m-0 rounded-2xl ink-border bg-white px-4 py-3 text-sm font-bold">
              O mapa não pôde ser carregado (sem conexão ou servidor de mapas indisponível). A lista abaixo usa só o GPS e funciona offline.
            </p>
            {player ? (
              <NearbyCards player={player} nearby={nearby} rangeMeters={VISIBILITY_RADIUS_METERS} onSelect={setSelectedSpawnId} layout="list" />
            ) : (
              <p className="m-0 text-sm font-bold text-tinta-suave">A lista precisa da sua localização.</p>
            )}
            <button type="button" onClick={() => setTilesUnavailable(false)} className="self-start rounded-[14px] ink-border bg-white px-4 py-2 text-sm font-extrabold">
              Tentar carregar o mapa
            </button>
          </div>
        ) : (
          <div className={`h-full w-full ${pickingLocation ? 'cursor-crosshair' : ''}`}>
            <CampusMap
              zones={zones}
              spawns={visibleSpawns}
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

        <div className="pointer-events-none absolute inset-x-4 top-4 z-[1000] flex flex-col gap-2 [&>*]:pointer-events-auto">
          <div className="flex items-start justify-between gap-2.5">
            {geo.error ? (
              <button
                type="button"
                onClick={() => setLocationHelpOpen(true)}
                aria-expanded={locationHelpOpen}
                className="flex min-w-0 items-center gap-2.5 rounded-[18px] sticker bg-white py-2 pr-3.5 pl-2 text-left"
              >
              <span aria-hidden="true" className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-xl ink-border" style={{ background: activeZone?.color ?? '#ece9f5' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1b3a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l8-6 8 6v10H4z" /><path d="M10 20v-5h4v5" /></svg>
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-xs font-extrabold text-tinta-suave">{player && activeZone ? 'Você está em' : 'Exploração'}</span>
                <span className="truncate font-display text-[17px] leading-tight font-semibold">{zoneLabel}</span>
              </span>
              </button>
            ) : (
              <div className="flex min-w-0 items-center gap-2.5 rounded-[18px] sticker bg-white py-2 pr-3.5 pl-2">
              <span aria-hidden="true" className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-xl ink-border" style={{ background: activeZone?.color ?? '#ece9f5' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1b3a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l8-6 8 6v10H4z" /><path d="M10 20v-5h4v5" /></svg>
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-xs font-extrabold text-tinta-suave">{player && activeZone ? 'Você está em' : 'Exploração'}</span>
                <span className="truncate font-display text-[17px] leading-tight font-semibold">{zoneLabel}</span>
              </span>
              </div>
            )}
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {headerAction}
              {geo.isSimulated && <span className="rounded-full border-2 border-tinta bg-amarelo px-2.5 py-0.5 text-xs font-extrabold">GPS simulado</span>}
            </div>
          </div>
          {(!geo.error || locationHelpOpen) && (
            <LocationNotice status={geo.status} error={geo.error} simulationAvailable={geo.simulationAvailable} />
          )}
          {spawnsError && <p role="alert" className="m-0 rounded-2xl ink-border bg-[#ffd9cf] px-4 py-2 text-sm font-bold">{spawnsError}</p>}
          {selectedZone && (
            <div className="flex items-center gap-2 self-start rounded-full ink-border bg-white px-3 py-1.5 text-sm font-bold">
              <span className="h-3 w-3 rounded-full border-2 border-tinta" style={{ background: selectedZone.color }} aria-hidden="true" />
              <span>
                {selectedZone.name}
                {selectedZone.isDemo && <span className="text-tinta-suave"> · área de demonstração</span>}
              </span>
              <button type="button" onClick={() => setSelectedZoneId(null)} aria-label="Fechar zona selecionada" className="grid h-7 w-7 place-items-center">✕</button>
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

        {!tilesUnavailable && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[1000] flex flex-col gap-3 [&>*]:pointer-events-auto">
            {player && (
              <button
                type="button"
                onClick={() => setRecenterSignal((value) => value + 1)}
                className="mr-4 grid h-[52px] w-[52px] place-items-center self-end rounded-2xl sticker bg-white"
                aria-label="Centralizar no jogador"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
              </button>
            )}
            <div className="pl-4">
              {player ? (
                <NearbyCards player={player} nearby={nearby} rangeMeters={VISIBILITY_RADIUS_METERS} onSelect={setSelectedSpawnId} />
              ) : (
                <p className="m-0 mr-4 rounded-2xl ink-border bg-white px-4 py-3 text-sm font-bold">Ative a localização para ver os Pokémon perto de você.</p>
              )}
            </div>
          </div>
        )}

        {toast && (
          <p role="status" className="absolute inset-x-4 bottom-56 z-[1000] mx-auto max-w-md rounded-2xl sticker bg-verde px-4 py-3 text-center text-sm font-extrabold">
            {toast}
          </p>
        )}
      </div>

      {footer}

      {selectedSpawn && selectedEligibility && (
        <EncounterSheet
          spawn={selectedSpawn}
          eligibility={selectedEligibility}
          now={now}
          zoneName={selectedZoneName}
          pending={encounterPending}
          onStartEncounter={startEncounter}
          onClose={() => setSelectedSpawnId(null)}
        />
      )}
    </div>
  );
}
