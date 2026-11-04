import { statsAtLevelV1 } from '@pokemon-campus/game-engine';
import type { Rarity } from '../exploration/types.js';

/**
 * Catálogo de espécies usado pelas telas enquanto GET /api/v1/species não existe.
 * Criaturas e golpes são originais do projeto.
 */
export type CreatureKind = 'leaf' | 'bolt' | 'drop' | 'flame' | 'rock' | 'wing' | 'star' | 'unknown';

export interface Move {
  id: string;
  name: string;
  type: string;
  power: number;
}

export interface SpeciesInfo {
  id: string;
  number: string;
  displayName: string;
  kind: CreatureKind;
  type: string;
  color: string;
  rarity: Rarity;
  baseStats: { hp: number; attack: number; defense: number };
  description: string;
  moves: Move[];
}

const TACKLE: Move = { id: 'investida', name: 'Investida', type: 'Normal', power: 50 };
const SCRATCH: Move = { id: 'arranhao', name: 'Arranhão', type: 'Normal', power: 35 };

export const SPECIES: SpeciesInfo[] = [
  {
    id: 'brotinho', number: '001', displayName: 'Brotinho', kind: 'leaf', type: 'Planta', color: '#7ad88f', rarity: 'common',
    baseStats: { hp: 24, attack: 9, defense: 11 },
    description: 'Calmo e resistente. Recupera energia aos poucos e aguenta batalhas longas.',
    moves: [{ id: 'folha-navalha', name: 'Folha navalha', type: 'Planta', power: 45 }, { id: 'chicote', name: 'Chicote de cipó', type: 'Planta', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'gotinha', number: '002', displayName: 'Gotinha', kind: 'drop', type: 'Água', color: '#6aa8ff', rarity: 'common',
    baseStats: { hp: 22, attack: 10, defense: 10 },
    description: 'Equilibrado e curioso. Bom para quem quer aprender com calma.',
    moves: [{ id: 'jato', name: 'Jato d’água', type: 'Água', power: 40 }, { id: 'bolha', name: 'Bolhas', type: 'Água', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'pedregulho', number: '003', displayName: 'Pedregulho', kind: 'rock', type: 'Pedra', color: '#d9c3a0', rarity: 'common',
    baseStats: { hp: 28, attack: 9, defense: 14 },
    description: 'Lento, mas quase impossível de derrubar.',
    moves: [{ id: 'pedrada', name: 'Pedrada', type: 'Pedra', power: 50 }, TACKLE, SCRATCH, { id: 'rolagem', name: 'Rolagem', type: 'Pedra', power: 30 }],
  },
  {
    id: 'faiscao', number: '004', displayName: 'Faiscão', kind: 'bolt', type: 'Elétrico', color: '#ffc23d', rarity: 'uncommon',
    baseStats: { hp: 22, attack: 13, defense: 9 },
    description: 'Agitado e veloz. Solta faíscas quando fica animado.',
    moves: [{ id: 'faisca', name: 'Faísca', type: 'Elétrico', power: 45 }, { id: 'choque', name: 'Choque', type: 'Elétrico', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'coruja', number: '005', displayName: 'Corujito', kind: 'wing', type: 'Voador', color: '#c9b8ff', rarity: 'uncommon',
    baseStats: { hp: 24, attack: 11, defense: 10 },
    description: 'Observador. Prefere as árvores perto da biblioteca.',
    moves: [{ id: 'bicada', name: 'Bicada', type: 'Voador', power: 40 }, { id: 'rasante', name: 'Rasante', type: 'Voador', power: 50 }, TACKLE, SCRATCH],
  },
  {
    id: 'brasinha', number: '006', displayName: 'Brasinha', kind: 'flame', type: 'Fogo', color: '#ff8a5c', rarity: 'rare',
    baseStats: { hp: 21, attack: 14, defense: 8 },
    description: 'Rápido e impulsivo. Ataca forte, mas precisa de cuidado com a defesa.',
    moves: [{ id: 'brasa', name: 'Brasa', type: 'Fogo', power: 40 }, { id: 'labareda', name: 'Labareda', type: 'Fogo', power: 55 }, TACKLE, SCRATCH],
  },
  {
    id: 'aurora', number: '007', displayName: 'Aurorix', kind: 'star', type: 'Luz', color: '#ffd76a', rarity: 'legendary',
    baseStats: { hp: 30, attack: 15, defense: 13 },
    description: 'Aparece raramente ao entardecer. Poucos já viram de perto.',
    moves: [{ id: 'raio-de-luz', name: 'Raio de luz', type: 'Luz', power: 60 }, { id: 'brilho', name: 'Brilho', type: 'Luz', power: 45 }, TACKLE, SCRATCH],
  },
];

const BY_ID = new Map(SPECIES.map((species) => [species.id, species]));

export function getSpecies(speciesId: string): SpeciesInfo {
  return BY_ID.get(speciesId) ?? {
    id: speciesId, number: '???', displayName: speciesId, kind: 'unknown', type: '?', color: '#e6e3f0', rarity: 'common',
    baseStats: { hp: 20, attack: 10, defense: 10 }, description: '', moves: [TACKLE, SCRATCH],
  };
}

/** Os três iniciais do onboarding. */
export const STARTER_IDS = ['brotinho', 'gotinha', 'brasinha'] as const;

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  legendary: 'Lendário',
};

/** Fundo e texto das etiquetas de raridade. */
export const RARITY_CHIP: Record<Rarity, { bg: string; fg: string }> = {
  common: { bg: '#ece9f5', fg: '#1d1b3a' },
  uncommon: { bg: '#7ad88f', fg: '#1d1b3a' },
  rare: { bg: '#6aa8ff', fg: '#1d1b3a' },
  legendary: { bg: '#1d1b3a', fg: '#ffc23d' },
};

/** Atributos de uma criatura no nível dado (fórmula simples de protótipo). */
export function statsAtLevel(species: SpeciesInfo, level: number) {
  return statsAtLevelV1(species.baseStats, level);
}
