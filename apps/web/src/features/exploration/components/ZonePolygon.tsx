import { Polygon, Tooltip } from 'react-leaflet';
import type { CampusZone } from '../types.js';

interface ZonePolygonProps {
  zone: CampusZone;
  active: boolean;
  selected: boolean;
  onSelect: (zoneId: string) => void;
}

export function ZonePolygon({ zone, active, selected, onSelect }: ZonePolygonProps) {
  return (
    <Polygon
      positions={zone.boundary.map((point) => [point.latitude, point.longitude] as [number, number])}
      pathOptions={{
        color: '#1d1b3a',
        weight: selected || active ? 3.5 : 2.5,
        fillColor: zone.color,
        fillOpacity: active ? 0.5 : 0.35,
        dashArray: zone.isDemo ? '8 6' : undefined,
      }}
      eventHandlers={{ click: () => onSelect(zone.id) }}
    >
      <Tooltip sticky>{zone.name}{zone.isDemo ? ' (área de demonstração)' : ''}</Tooltip>
    </Polygon>
  );
}
