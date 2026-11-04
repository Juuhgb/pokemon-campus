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
        color: zone.color,
        weight: selected || active ? 3 : 1.5,
        fillOpacity: active ? 0.3 : 0.15,
        dashArray: zone.isDemo ? '6 6' : undefined,
      }}
      eventHandlers={{ click: () => onSelect(zone.id) }}
    >
      <Tooltip sticky>{zone.name}{zone.isDemo ? ' (área de demonstração)' : ''}</Tooltip>
    </Polygon>
  );
}
