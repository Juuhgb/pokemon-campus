import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Marker, Tooltip } from 'react-leaflet';
import type { GeoPoint, LocationFix } from '../types.js';
import { bearingDegrees, haversineMeters } from '../utils/distance.js';
import { ENCOUNTER_RADIUS_METERS } from '../utils/encounter.js';

interface PlayerMarkerProps {
  position: LocationFix;
  /** Mostra o círculo do raio de encontro em volta do jogador. */
  showEncounterRadius?: boolean;
}

/** Deslocamento mínimo para atualizar a direção (evita a seta "tremer" com o ruído do GPS). */
const MIN_HEADING_STEP_METERS = 3;

const ICON_SIZE = 26;

/** Duração do deslize entre duas leituras do GPS. */
const GLIDE_MS = 900;

/** Saltos maiores que isso (ex.: GPS simulado em outro lugar) não são animados. */
const MAX_GLIDE_METERS = 300;

/** Silhueta de treinador (boné + corpo), viewBox 24×24. */
const TRAINER_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6.5 9.2a5.5 5.5 0 0 1 11 0z" fill="#ff5a4e"/><path d="M5 9.2h14" stroke="#1d1b3a" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12.6" r="2.6" fill="#1d1b3a"/><path d="M7 21c0-3 2.2-5 5-5s5 2 5 5z" fill="#1d1b3a"/></svg>';

function playerIcon(simulated: boolean) {
  return L.divIcon({
    className: '',
    iconSize: [ICON_SIZE, ICON_SIZE],
    iconAnchor: [ICON_SIZE / 2, ICON_SIZE / 2],
    html: `<span class="player-marker${simulated ? ' player-marker--simulated' : ''}"><span class="player-marker__arrow" hidden></span><span class="player-marker__body">${TRAINER_SVG}</span></span>`,
  });
}

/** Posição exibida: desliza da anterior até a nova, para o ícone e os círculos andarem juntos. */
function useGlidingPosition(target: GeoPoint): GeoPoint {
  const [shown, setShown] = useState<GeoPoint>(target);
  const shownRef = useRef<GeoPoint>(target);

  useEffect(() => {
    const from = shownRef.current;
    const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const set = (point: GeoPoint) => {
      shownRef.current = point;
      setShown(point);
    };
    if (reducedMotion || typeof requestAnimationFrame !== 'function' || haversineMeters(from, target) > MAX_GLIDE_METERS) {
      set(target);
      return undefined;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / GLIDE_MS);
      set({
        latitude: from.latitude + (target.latitude - from.latitude) * t,
        longitude: from.longitude + (target.longitude - from.longitude) * t,
      });
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target.latitude, target.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  return shown;
}

/** Direção do movimento, calculada a partir das últimas posições. `null` enquanto parado. */
function useHeading(position: GeoPoint): number | null {
  const anchor = useRef<GeoPoint>(position);
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (haversineMeters(anchor.current, position) < MIN_HEADING_STEP_METERS) return;
    setHeading(bearingDegrees(anchor.current, position));
    anchor.current = position;
  }, [position]);

  return heading;
}

export function PlayerMarker({ position, showEncounterRadius = true }: PlayerMarkerProps) {
  const simulated = position.source === 'simulated';
  const icon = useMemo(() => playerIcon(simulated), [simulated]);
  const shown = useGlidingPosition(position);
  const center: [number, number] = [shown.latitude, shown.longitude];
  const heading = useHeading(position);
  const markerRef = useRef<L.Marker | null>(null);

  // Gira a seta direto no DOM: trocar o ícone recriaria o elemento e cortaria a animação.
  useEffect(() => {
    const arrow = markerRef.current?.getElement()?.querySelector<HTMLElement>('.player-marker__arrow');
    if (!arrow) return;
    arrow.hidden = heading === null;
    if (heading !== null) arrow.style.transform = `rotate(${heading}deg)`;
  }, [heading, icon]);

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
      <Marker ref={markerRef} position={center} icon={icon} zIndexOffset={1000} keyboard={false}>
        <Tooltip direction="top" offset={[0, -14]}>{simulated ? 'Você (posição simulada)' : 'Você'}</Tooltip>
      </Marker>
    </>
  );
}
