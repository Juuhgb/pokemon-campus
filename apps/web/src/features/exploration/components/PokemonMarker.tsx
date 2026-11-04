import L from 'leaflet';
import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import { creatureBadgeHtml } from '../../../components/ui/CreatureBadge.js';
import { getSpecies, RARITY_LABEL } from '../../catalog/species.js';
import type { ExplorationSpawn } from '../types.js';

interface PokemonMarkerProps {
  spawn: ExplorationSpawn;
  inRange: boolean;
  selected: boolean;
  onSelect: (spawnId: string) => void;
}

export function PokemonMarker({ spawn, inRange, selected, onSelect }: PokemonMarkerProps) {
  const species = getSpecies(spawn.speciesId);
  const icon = useMemo(() => L.divIcon({
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `<span class="creature-marker${inRange ? ' creature-marker--in-range' : ''}${selected ? ' creature-marker--selected' : ''}">${creatureBadgeHtml(species.kind, species.color, 44)}</span>`,
  }), [species.kind, species.color, inRange, selected]);

  return (
    <Marker
      position={[spawn.latitude, spawn.longitude]}
      icon={icon}
      title={`${species.displayName}, nível ${spawn.level}`}
      eventHandlers={{ click: () => onSelect(spawn.spawnId) }}
    >
      <Tooltip direction="top" offset={[0, -22]}>
        {species.displayName} · Nv. {spawn.level} · {RARITY_LABEL[spawn.rarity]}
      </Tooltip>
    </Marker>
  );
}
