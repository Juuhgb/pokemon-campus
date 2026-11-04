import type { Rarity } from '../types.js';

/** Dados de apresentação das espécies usadas nos spawns simulados. Substituível por GET /api/v1/species. */
export interface SpeciesDisplay {
  id: string;
  displayName: string;
  emoji: string;
}

export const MOCK_SPECIES: Record<string, SpeciesDisplay> = {
  brotinho: { id: 'brotinho', displayName: 'Brotinho', emoji: '🌱' },
  faiscao: { id: 'faiscao', displayName: 'Faiscão', emoji: '⚡' },
  gotinha: { id: 'gotinha', displayName: 'Gotinha', emoji: '💧' },
  brasinha: { id: 'brasinha', displayName: 'Brasinha', emoji: '🔥' },
  pedregulho: { id: 'pedregulho', displayName: 'Pedregulho', emoji: '🪨' },
  coruja: { id: 'coruja', displayName: 'Corujito', emoji: '🦉' },
  aurora: { id: 'aurora', displayName: 'Aurorix', emoji: '✨' },
};

export function speciesDisplay(speciesId: string): SpeciesDisplay {
  return MOCK_SPECIES[speciesId] ?? { id: speciesId, displayName: speciesId, emoji: '❔' };
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  legendary: 'Lendário',
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#94a3b8',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  legendary: '#f59e0b',
};
