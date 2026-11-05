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

const ICON_SIZE = 34;

/** Duração do deslize entre duas leituras do GPS. */
const GLIDE_MS = 900;

/** Saltos maiores que isso (ex.: GPS simulado em outro lugar) não são animados. */
const MAX_GLIDE_METERS = 300;

/** Seta com ponta para cima (viewBox 24×24); gira para a direção em que o jogador anda. */
const POINTER_SVG = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 2.5 L20 20.5 L12 16.2 L4 20.5 Z"/></svg>';

function playerIcon(simulated: boolean) {
  return L.divIcon({
    className: '',
    iconSize: [ICON_SIZE, ICON_SIZE],
    iconAnchor: [ICON_SIZE / 2, ICON_SIZE / 2],
    html: `<span class="player-marker player-marker--no-heading${simulated ? ' player-marker--simulated' : ''}"><span class="player-marker__pointer">${POINTER_SVG}</span></span>`,
  });
}

/** Gira para o caminho mais curto (ex.: de 350° para 10° passa por 360°, não volta 340°). */
export function unwrapAngle(previous: number, next: number): number {
  const delta = ((((next - previous) % 360) + 540) % 360) - 180;
  return previous + delta;
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
  // A seta aponta para onde o jogador está andando (calculado pelas últimas posições do GPS).
  const heading = useHeading(position);
  const markerRef = useRef<L.Marker | null>(null);
  const shownAngle = useRef(0);

  // Gira a seta direto no DOM: trocar o ícone recriaria o elemento e cortaria a animação.
  useEffect(() => {
    const root = markerRef.current?.getElement()?.querySelector<HTMLElement>('.player-marker');
    const pointer = root?.querySelector<HTMLElement>('.player-marker__pointer');
    if (!root || !pointer) return;
    root.classList.toggle('player-marker--no-heading', heading === null);
    shownAngle.current = unwrapAngle(shownAngle.current, heading ?? 0);
    pointer.style.transform = `rotate(${shownAngle.current}deg)`;
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
