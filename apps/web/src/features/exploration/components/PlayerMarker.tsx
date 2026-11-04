import L from 'leaflet';
import { useMemo } from 'react';
import { Circle, Marker, Tooltip } from 'react-leaflet';
import type { LocationFix } from '../types.js';
import { ENCOUNTER_RADIUS_METERS } from '../utils/encounter.js';

interface PlayerMarkerProps {
  position: LocationFix;
  /** Mostra o círculo do raio de encontro em volta do jogador. */
  showEncounterRadius?: boolean;
}

function playerIcon(simulated: boolean) {
  return L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<span class="player-marker ${simulated ? 'player-marker--simulated' : ''}"><span></span></span>`,
  });
}

export function PlayerMarker({ position, showEncounterRadius = true }: PlayerMarkerProps) {
  const simulated = position.source === 'simulated';
  const icon = useMemo(() => playerIcon(simulated), [simulated]);
  const center: [number, number] = [position.latitude, position.longitude];

  return (
    <>
      {position.accuracyMeters > ENCOUNTER_RADIUS_METERS && (
        <Circle
          center={center}
          radius={position.accuracyMeters}
          interactive={false}
          pathOptions={{ color: '#3b82f6', weight: 1, opacity: 0.5, fillOpacity: 0.06 }}
        />
      )}
      {showEncounterRadius && (
        <Circle
          center={center}
          radius={ENCOUNTER_RADIUS_METERS}
          interactive={false}
          pathOptions={{ color: '#1d1b3a', weight: 2.5, dashArray: '6 6', fillColor: '#ffc23d', fillOpacity: 0.22 }}
        />
      )}
      <Marker position={center} icon={icon} zIndexOffset={1000} keyboard={false}>
        <Tooltip direction="top" offset={[0, -16]}>{simulated ? 'Você (posição simulada)' : 'Você'}</Tooltip>
      </Marker>
    </>
  );
}
