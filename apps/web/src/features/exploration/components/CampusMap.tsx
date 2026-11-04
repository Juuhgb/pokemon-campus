import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, type ReactNode } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { CAMPUS_BOUNDS, CAMPUS_CENTER, CAMPUS_DEFAULT_ZOOM } from '../data/campusZones.js';
import { PERSONAL_AREA } from '../data/personalArea.js';
import type { CampusZone, ExplorationSpawn, GeoPoint, LocationFix } from '../types.js';
import { PlayerMarker } from './PlayerMarker.js';
import { PokemonMarker } from './PokemonMarker.js';
import { ZonePolygon } from './ZonePolygon.js';

/** Tiles padrão do OpenStreetMap. Respeite a política de uso: https://operations.osmfoundation.org/policies/tiles/ */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">Colaboradores do OpenStreetMap</a>';

/** Limites de navegação: o campus e, se configurada, a área pessoal, com folga de ~3 km. */
const MAP_BOUNDS: [[number, number], [number, number]] = (() => {
  const points = [...CAMPUS_BOUNDS, ...(PERSONAL_AREA ? [PERSONAL_AREA.center] : [])];
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const padding = 0.03;
  return [
    [Math.min(...latitudes) - padding, Math.min(...longitudes) - padding],
    [Math.max(...latitudes) + padding, Math.max(...longitudes) + padding],
  ];
})();

/** Após este número de falhas sem nenhum tile carregado, consideramos o mapa indisponível. */
const TILE_FAILURE_THRESHOLD = 4;

interface CampusMapProps {
  zones: CampusZone[];
  spawns: ExplorationSpawn[];
  player: LocationFix | null;
  activeZoneId: string | null;
  selectedZoneId: string | null;
  selectedSpawnId: string | null;
  inRangeSpawnIds: ReadonlySet<string>;
  /** Incrementar para centralizar no jogador. */
  recenterSignal: number;
  onSelectZone: (zoneId: string) => void;
  onSelectSpawn: (spawnId: string) => void;
  /** Quando definido, clicar no mapa chama esta função (GPS simulado). */
  onMapClick?: (point: GeoPoint) => void;
  onTilesUnavailable: (unavailable: boolean) => void;
  /** Camadas extras dentro do mapa (ex.: alças do editor de zonas). */
  children?: ReactNode;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (point: GeoPoint) => void }) {
  useMapEvents({
    click(event) {
      onMapClick?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

/** O Leaflet não percebe mudanças de tamanho do contêiner (ex.: painel inferior crescendo). */
function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function Recenter({ player, signal }: { player: GeoPoint | null; signal: number }) {
  const map = useMap();
  const centeredOnce = useRef(false);

  // Centraliza automaticamente na primeira posição conhecida.
  useEffect(() => {
    if (!player || centeredOnce.current) return;
    centeredOnce.current = true;
    map.setView([player.latitude, player.longitude], Math.max(map.getZoom(), CAMPUS_DEFAULT_ZOOM));
  }, [map, player]);

  useEffect(() => {
    if (signal === 0 || !player) return;
    map.flyTo([player.latitude, player.longitude], Math.max(map.getZoom(), CAMPUS_DEFAULT_ZOOM), { duration: 0.6 });
    // Só reage ao sinal, não a cada atualização de GPS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal, map]);

  return null;
}

export function CampusMap(props: CampusMapProps) {
  const { onTilesUnavailable } = props;
  const tileStats = useRef({ loaded: 0, failed: 0 });

  return (
    <MapContainer
      center={[CAMPUS_CENTER.latitude, CAMPUS_CENTER.longitude]}
      zoom={CAMPUS_DEFAULT_ZOOM}
      minZoom={14}
      maxZoom={19}
      maxBounds={MAP_BOUNDS}
      className="h-full w-full"
      zoomControl={false}
      attributionControl
    >
      <TileLayer
        url={OSM_TILE_URL}
        attribution={OSM_ATTRIBUTION}
        maxZoom={19}
        eventHandlers={{
          tileload: () => {
            tileStats.current.loaded += 1;
            onTilesUnavailable(false);
          },
          tileerror: () => {
            tileStats.current.failed += 1;
            if (tileStats.current.loaded === 0 && tileStats.current.failed >= TILE_FAILURE_THRESHOLD) onTilesUnavailable(true);
          },
        }}
      />

      {props.zones.map((zone) => (
        <ZonePolygon
          key={zone.id}
          zone={zone}
          active={zone.id === props.activeZoneId}
          selected={zone.id === props.selectedZoneId}
          onSelect={props.onSelectZone}
        />
      ))}

      {props.spawns.map((spawn) => (
        <PokemonMarker
          key={spawn.spawnId}
          spawn={spawn}
          inRange={props.inRangeSpawnIds.has(spawn.spawnId)}
          selected={spawn.spawnId === props.selectedSpawnId}
          onSelect={props.onSelectSpawn}
        />
      ))}

      {props.player && <PlayerMarker position={props.player} />}

      {props.children}

      <ResizeWatcher />
      <MapClickHandler onMapClick={props.onMapClick} />
      <Recenter player={props.player} signal={props.recenterSignal} />
    </MapContainer>
  );
}
