import L from 'leaflet';
import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import { RARITY_COLOR, RARITY_LABEL, speciesDisplay } from '../data/species.js';
import type { ExplorationSpawn } from '../types.js';

interface PokemonMarkerProps {
  spawn: ExplorationSpawn;
  inRange: boolean;
  selected: boolean;
  onSelect: (spawnId: string) => void;
}

export function PokemonMarker({ spawn, inRange, selected, onSelect }: PokemonMarkerProps) {
  const species = speciesDisplay(spawn.speciesId);
  const icon = useMemo(() => L.divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `<span class="pokemon-marker${inRange ? ' pokemon-marker--in-range' : ''}${selected ? ' pokemon-marker--selected' : ''}"
      style="--rarity:${RARITY_COLOR[spawn.rarity]}" aria-hidden="true">${species.emoji}</span>`,
  }), [species.emoji, spawn.rarity, inRange, selected]);

  return (
    <Marker
      position={[spawn.latitude, spawn.longitude]}
      icon={icon}
      title={`${species.displayName}, nível ${spawn.level}`}
      eventHandlers={{ click: () => onSelect(spawn.spawnId) }}
    >
      <Tooltip direction="top" offset={[0, -18]}>
        {species.displayName} · Nv. {spawn.level} · {RARITY_LABEL[spawn.rarity]}
      </Tooltip>
    </Marker>
  );
}
