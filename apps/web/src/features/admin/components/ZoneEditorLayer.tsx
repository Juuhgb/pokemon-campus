import L, { type LeafletEvent } from 'leaflet';
import { Fragment, useRef } from 'react';
import { Marker, Polyline } from 'react-leaflet';
import type { CampusZone, GeoPoint } from '../../exploration/types.js';
import { polygonCentroid } from '../../exploration/utils/geofence.js';
import { midpoint } from '../../exploration/utils/zoneGeometry.js';

export type ZoneEditorState =
  | { mode: 'browse' }
  | { mode: 'edit'; zoneId: string }
  | { mode: 'draw'; points: GeoPoint[] };

interface ZoneEditorLayerProps {
  state: ZoneEditorState;
  zones: CampusZone[];
  onMoveVertex: (zoneId: string, index: number, point: GeoPoint) => void;
  onInsertVertex: (zoneId: string, afterIndex: number) => void;
  onRemoveVertex: (zoneId: string, index: number) => void;
  onTranslate: (zoneId: string, deltaLatitude: number, deltaLongitude: number) => void;
}

const vertexIcon = L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11], html: '<span class="zone-handle zone-handle--vertex"></span>' });
const midpointIcon = L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9], html: '<span class="zone-handle zone-handle--midpoint">+</span>' });
const moveIcon = L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: '<span class="zone-handle zone-handle--move">✥</span>' });
const draftIcon = L.divIcon({ className: '', iconSize: [14, 14], iconAnchor: [7, 7], html: '<span class="zone-handle zone-handle--draft"></span>' });

const toLatLng = (point: GeoPoint): [number, number] => [point.latitude, point.longitude];
const fromEvent = (event: LeafletEvent): GeoPoint => {
  const latLng = (event.target as L.Marker).getLatLng();
  return { latitude: latLng.lat, longitude: latLng.lng };
};

/** Alças de edição desenhadas sobre o mapa (dentro do MapContainer). */
export function ZoneEditorLayer({ state, zones, onMoveVertex, onInsertVertex, onRemoveVertex, onTranslate }: ZoneEditorLayerProps) {
  // Última posição conhecida da alça de mover: evita somar o mesmo deslocamento duas vezes
  // quando vários eventos de arraste chegam antes da próxima renderização.
  const lastMovePoint = useRef<GeoPoint | null>(null);

  if (state.mode === 'draw') {
    const positions = state.points.map(toLatLng);
    return (
      <>
        {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: '#f97316', weight: 3 }} />}
        {positions.length > 2 && (
          <Polyline positions={[positions[positions.length - 1]!, positions[0]!]} pathOptions={{ color: '#f97316', weight: 2, dashArray: '4 6' }} />
        )}
        {positions.map((position, index) => (
          <Marker key={index} position={position} icon={draftIcon} interactive={false} keyboard={false} />
        ))}
      </>
    );
  }

  if (state.mode !== 'edit') return null;
  const zone = zones.find((item) => item.id === state.zoneId);
  if (!zone) return null;
  const center = polygonCentroid(zone.boundary);

  return (
    <>
      {zone.boundary.map((vertex, index) => {
        const next = zone.boundary[(index + 1) % zone.boundary.length]!;
        return (
          <Fragment key={index}>
            <Marker
              position={toLatLng(vertex)}
              icon={vertexIcon}
              draggable
              keyboard={false}
              title="Arraste para mover; toque duas vezes ou segure para remover"
              eventHandlers={{
                drag: (event) => onMoveVertex(zone.id, index, fromEvent(event)),
                dblclick: () => onRemoveVertex(zone.id, index),
                contextmenu: () => onRemoveVertex(zone.id, index),
              }}
            />
            <Marker
              position={toLatLng(midpoint(vertex, next))}
              icon={midpointIcon}
              keyboard={false}
              title="Adicionar vértice"
              eventHandlers={{ click: () => onInsertVertex(zone.id, index) }}
            />
          </Fragment>
        );
      })}
      <Marker
        position={toLatLng(center)}
        icon={moveIcon}
        draggable
        keyboard={false}
        title="Arraste para mover a zona inteira"
        zIndexOffset={500}
        eventHandlers={{
          dragstart: () => {
            lastMovePoint.current = center;
          },
          drag: (event) => {
            const previous = lastMovePoint.current ?? center;
            const point = fromEvent(event);
            lastMovePoint.current = point;
            onTranslate(zone.id, point.latitude - previous.latitude, point.longitude - previous.longitude);
          },
          dragend: () => {
            lastMovePoint.current = null;
          },
        }}
      />
    </>
  );
}
