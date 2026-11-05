import { useState } from 'react';
import type { CreatureKind } from '../../features/catalog/species.js';

/** Traços de cada ícone (viewBox 24×24, traço na cor da tinta). */
export const GLYPHS: Record<CreatureKind, string> = {
  leaf: '<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19l7-7"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>',
  drop: '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>',
  flame: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z"/>',
  rock: '<path d="M4 16l3-8 5-3 6 4 2 7-6 3H8z"/><path d="M12 5l-1 7 7 4"/>',
  wing: '<path d="M3 12c4-6 14-6 18 0-4 6-14 6-18 0z"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  unknown: '<path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/>',
};

const INK = '#1d1b3a';

function metrics(size: number) {
  return {
    ring: size >= 64 ? 3 : 2.5,
    shadow: size >= 64 ? 4 : size >= 40 ? 3 : 2,
    glyph: Math.round(size * 0.5),
  };
}

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Sombra "adesivo" que segue o contorno do PNG transparente. */
const imageShadow = (size: number) => {
  const offset = metrics(size).shadow;
  return `drop-shadow(0 0 1px ${INK}) drop-shadow(${offset}px ${offset}px 0 rgb(29 27 58 / 0.35))`;
};

/** HTML do ícone, para marcadores do Leaflet (divIcon). Com imagem, mostra o Pokémon. */
export function creatureBadgeHtml(kind: CreatureKind, color: string, size: number, image?: string): string {
  if (image && kind !== 'unknown') {
    return `<img src="${escapeAttr(image)}" alt="" width="${size}" height="${size}" draggable="false" style="display:block;width:${size}px;height:${size}px;object-fit:contain;filter:${imageShadow(size)}" />`;
  }
  const { ring, shadow, glyph } = metrics(size);
  const ink = kind === 'unknown' ? '#5b587a' : INK;
  return `<span style="display:flex;align-items:center;justify-content:center;box-sizing:border-box;border-radius:9999px;width:${size}px;height:${size}px;background:${color};border:${ring}px solid ${INK};box-shadow:${shadow}px ${shadow}px 0 ${INK};color:${ink}"><svg width="${glyph}" height="${glyph}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[kind]}</svg></span>`;
}

interface CreatureBadgeProps {
  kind: CreatureKind;
  color: string;
  /** Imagem do Pokémon; quando falha ao carregar, volta para o ícone redondo. */
  image?: string;
  size?: number;
  className?: string;
  /** Nome para leitores de tela; sem ele o ícone é decorativo. */
  label?: string;
}

export function CreatureBadge({ kind, color, image, size = 56, className, label }: CreatureBadgeProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const { ring, shadow, glyph } = metrics(size);
  if (image && kind !== 'unknown' && failedImage !== image) {
    return (
      <img
        src={image}
        alt={label ?? ''}
        aria-hidden={label ? undefined : true}
        width={size}
        height={size}
        draggable={false}
        onError={() => setFailedImage(image)}
        className={`inline-block shrink-0 object-contain ${className ?? ''}`}
        style={{ width: size, height: size, filter: imageShadow(size) }}
      />
    );
  }
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        background: color,
        border: `${ring}px solid ${INK}`,
        boxShadow: `${shadow}px ${shadow}px 0 ${INK}`,
        color: kind === 'unknown' ? '#5b587a' : INK,
        boxSizing: 'border-box',
      }}
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: GLYPHS[kind] }}
      />
    </span>
  );
}
