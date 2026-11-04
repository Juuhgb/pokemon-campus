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
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<span class="player-marker ${simulated ? 'player-marker--simulated' : ''}"><span></span></span>`,
  });
}

export function PlayerMarker({ position, showEncounterRadius = true }: PlayerMarkerProps) {
  const simulated = position.source === 'simulated';
  const icon = useMemo(() => playerIcon(simulated), [simulated]);
  const center: [number, number] = [position.latitude, position.longitude];

  return (
    <>
      {position.accuracyMeters > 0 && (
        <Circle
          center={center}
          radius={position.accuracyMeters}
          interactive={false}
          pathOptions={{ color: '#38bdf8', weight: 1, opacity: 0.4, fillOpacity: 0.08 }}
        />
      )}
      {showEncounterRadius && (
        <Circle
          center={center}
          radius={ENCOUNTER_RADIUS_METERS}
          interactive={false}
          pathOptions={{ color: simulated ? '#fb923c' : '#22d3ee', weight: 1.5, dashArray: '4 4', fillOpacity: 0.05 }}
        />
      )}
      <Marker position={center} icon={icon} zIndexOffset={1000} keyboard={false}>
        <Tooltip direction="top" offset={[0, -14]}>{simulated ? 'Você (posição simulada)' : 'Você'}</Tooltip>
      </Marker>
    </>
  );
}
