import { statsAtLevelV1 } from '@pokemon-campus/game-engine';
import type { Rarity } from '../exploration/types.js';

/**
 * Catálogo de espécies usado pelas telas enquanto GET /api/v1/species não existe.
 * As espécies usam Pokémon reais (nome e imagem); os ids internos continuam os antigos
 * para não quebrar o progresso salvo dos jogadores.
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
  /** Imagem em /public/pokemon; sem ela, o ícone redondo é usado. */
  image?: string;
  rarity: Rarity;
  baseStats: { hp: number; attack: number; defense: number };
  description: string;
  moves: Move[];
}

const TACKLE: Move = { id: 'investida', name: 'Investida', type: 'Normal', power: 50 };
const SCRATCH: Move = { id: 'arranhao', name: 'Arranhão', type: 'Normal', power: 35 };

export const SPECIES: SpeciesInfo[] = [
  {
    id: 'brotinho', number: '001', displayName: 'Bulbasaur', kind: 'leaf', type: 'Planta', color: '#7ad88f', image: '/pokemon/bulbasaur.png', rarity: 'common',
    baseStats: { hp: 24, attack: 9, defense: 11 },
    description: 'Calmo e resistente. Recupera energia aos poucos e aguenta batalhas longas.',
    moves: [{ id: 'folha-navalha', name: 'Folha navalha', type: 'Planta', power: 45 }, { id: 'chicote', name: 'Chicote de cipó', type: 'Planta', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'gotinha', number: '002', displayName: 'Squirtle', kind: 'drop', type: 'Água', color: '#6aa8ff', image: '/pokemon/squirtle.png', rarity: 'common',
    baseStats: { hp: 22, attack: 10, defense: 10 },
    description: 'Equilibrado e curioso. Bom para quem quer aprender com calma.',
    moves: [{ id: 'jato', name: 'Jato d’água', type: 'Água', power: 40 }, { id: 'bolha', name: 'Bolhas', type: 'Água', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'pedregulho', number: '003', displayName: 'Geodude', kind: 'rock', type: 'Pedra', color: '#d9c3a0', image: '/pokemon/geodude.png', rarity: 'common',
    baseStats: { hp: 28, attack: 9, defense: 14 },
    description: 'Lento, mas quase impossível de derrubar.',
    moves: [{ id: 'pedrada', name: 'Pedrada', type: 'Pedra', power: 50 }, TACKLE, SCRATCH, { id: 'rolagem', name: 'Rolagem', type: 'Pedra', power: 30 }],
  },
  {
    id: 'faiscao', number: '004', displayName: 'Pikachu', kind: 'bolt', type: 'Elétrico', color: '#ffc23d', image: '/pokemon/pikachu.png', rarity: 'uncommon',
    baseStats: { hp: 22, attack: 13, defense: 9 },
    description: 'Agitado e veloz. Solta faíscas quando fica animado.',
    moves: [{ id: 'faisca', name: 'Faísca', type: 'Elétrico', power: 45 }, { id: 'choque', name: 'Choque', type: 'Elétrico', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'coruja', number: '005', displayName: 'Chikorita', kind: 'leaf', type: 'Planta', color: '#b6e388', image: '/pokemon/chikorita.png', rarity: 'uncommon',
    baseStats: { hp: 24, attack: 11, defense: 10 },
    description: 'Gentil e atento. Prefere os gramados perto da biblioteca.',
    moves: [{ id: 'folha-magica', name: 'Folha mágica', type: 'Planta', power: 45 }, { id: 'raio-solar', name: 'Raio solar', type: 'Planta', power: 50 }, TACKLE, SCRATCH],
  },
  {
    id: 'brasinha', number: '006', displayName: 'Charmander', kind: 'flame', type: 'Fogo', color: '#ff8a5c', image: '/pokemon/charmander.png', rarity: 'rare',
    baseStats: { hp: 21, attack: 14, defense: 8 },
    description: 'Rápido e impulsivo. Ataca forte, mas precisa de cuidado com a defesa.',
    moves: [{ id: 'brasa', name: 'Brasa', type: 'Fogo', power: 40 }, { id: 'labareda', name: 'Labareda', type: 'Fogo', power: 55 }, TACKLE, SCRATCH],
  },
  {
    id: 'aurora', number: '007', displayName: 'Vaporeon', kind: 'drop', type: 'Água', color: '#7fc8e8', image: '/pokemon/vaporeon.png', rarity: 'rare',
    baseStats: { hp: 30, attack: 14, defense: 13 },
    description: 'Evolução aquática do Eevee. Vive perto do lago e se mistura com a água.',
    moves: [{ id: 'hidro-bomba', name: 'Hidro bomba', type: 'Água', power: 60 }, { id: 'aqua-cauda', name: 'Aqua cauda', type: 'Água', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'jigglypuff', number: '008', displayName: 'Jigglypuff', kind: 'star', type: 'Fada', color: '#ffb3d1', image: '/pokemon/jigglypuff.png', rarity: 'common',
    baseStats: { hp: 28, attack: 8, defense: 8 },
    description: 'Fofo e teimoso. Canta até o adversário cochilar no meio da batalha.',
    moves: [{ id: 'canto', name: 'Canto', type: 'Fada', power: 35 }, { id: 'tapa-duplo', name: 'Tapa duplo', type: 'Normal', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'espurr', number: '009', displayName: 'Espurr', kind: 'star', type: 'Psíquico', color: '#c9b8ff', image: '/pokemon/espurr.png', rarity: 'common',
    baseStats: { hp: 20, attack: 10, defense: 9 },
    description: 'Olhar fixo e poder psíquico escondido. Parece distraído, mas não perde nada.',
    moves: [{ id: 'confusao', name: 'Confusão', type: 'Psíquico', power: 45 }, { id: 'onda-mental', name: 'Onda mental', type: 'Psíquico', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'tandemaus', number: '010', displayName: 'Tandemaus', kind: 'star', type: 'Normal', color: '#ece9f5', image: '/pokemon/tandemaus.png', rarity: 'common',
    baseStats: { hp: 18, attack: 10, defense: 8 },
    description: 'Dois ratinhos que andam sempre juntos pelos corredores do campus.',
    moves: [{ id: 'mordida-dupla', name: 'Mordida dupla', type: 'Normal', power: 45 }, { id: 'ataque-rapido', name: 'Ataque rápido', type: 'Normal', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'clefable', number: '011', displayName: 'Clefable', kind: 'star', type: 'Fada', color: '#ffc6dd', image: '/pokemon/clefable.png', rarity: 'uncommon',
    baseStats: { hp: 27, attack: 11, defense: 12 },
    description: 'Aparece em noites de lua cheia. Calma, mas bate forte quando precisa.',
    moves: [{ id: 'brilho-lunar', name: 'Brilho lunar', type: 'Fada', power: 50 }, { id: 'tapa-duplo', name: 'Tapa duplo', type: 'Normal', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'charizard', number: '012', displayName: 'Charizard', kind: 'flame', type: 'Fogo', color: '#ff8a5c', image: '/pokemon/charizard.png', rarity: 'rare',
    baseStats: { hp: 30, attack: 15, defense: 12 },
    description: 'Voa alto e cospe fogo quente o bastante para derreter pedra.',
    moves: [{ id: 'lanca-chamas', name: 'Lança-chamas', type: 'Fogo', power: 60 }, { id: 'asa', name: 'Ataque de asa', type: 'Voador', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'gyarados', number: '013', displayName: 'Gyarados', kind: 'drop', type: 'Água', color: '#5b8de0', image: '/pokemon/gyarados.png', rarity: 'rare',
    baseStats: { hp: 32, attack: 15, defense: 11 },
    description: 'Furioso e enorme. Quando se irrita, agita o lago inteiro.',
    moves: [{ id: 'cachoeira', name: 'Cachoeira', type: 'Água', power: 55 }, { id: 'mordida', name: 'Mordida', type: 'Sombrio', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'lucario', number: '014', displayName: 'Lucario', kind: 'rock', type: 'Lutador', color: '#6f8fd8', image: '/pokemon/lucario.png', rarity: 'rare',
    baseStats: { hp: 26, attack: 15, defense: 11 },
    description: 'Sente a aura de quem está por perto e luta com disciplina.',
    moves: [{ id: 'esfera-de-aura', name: 'Esfera de aura', type: 'Lutador', power: 55 }, { id: 'soco-rapido', name: 'Soco rápido', type: 'Lutador', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'mew', number: '015', displayName: 'Mew', kind: 'star', type: 'Psíquico', color: '#ffc6e0', image: '/pokemon/mew.png', rarity: 'legendary',
    baseStats: { hp: 30, attack: 14, defense: 14 },
    description: 'Raríssimo e brincalhão. Poucos estudantes dizem ter visto um.',
    moves: [{ id: 'psiquico', name: 'Psíquico', type: 'Psíquico', power: 55 }, { id: 'poder-antigo', name: 'Poder antigo', type: 'Pedra', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'mewtwo', number: '016', displayName: 'Mewtwo', kind: 'star', type: 'Psíquico', color: '#b9a4e6', image: '/pokemon/mewtwo.png', rarity: 'legendary',
    baseStats: { hp: 34, attack: 17, defense: 13 },
    description: 'O mais forte do campus. Só aparece para quem explora muito.',
    moves: [{ id: 'golpe-psiquico', name: 'Golpe psíquico', type: 'Psíquico', power: 60 }, { id: 'bola-sombria', name: 'Bola sombria', type: 'Sombrio', power: 50 }, TACKLE, SCRATCH],
  },
  {
    id: 'caterpie', number: '017', displayName: 'Caterpie', kind: 'leaf', type: 'Inseto', color: '#9fd86b', image: '/pokemon/caterpie.png', rarity: 'common',
    baseStats: { hp: 18, attack: 8, defense: 8 },
    description: 'Lagarta comilona que vive nos canteiros do campus.',
    moves: [{ id: 'fio-de-seda', name: 'Fio de seda', type: 'Inseto', power: 30 }, { id: 'picada', name: 'Picada', type: 'Inseto', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'metapod', number: '018', displayName: 'Metapod', kind: 'leaf', type: 'Inseto', color: '#8cc63f', image: '/pokemon/metapod.png', rarity: 'common',
    baseStats: { hp: 22, attack: 6, defense: 14 },
    description: 'Fica imóvel no casulo esperando evoluir. Duro de derrubar.',
    moves: [{ id: 'endurecer', name: 'Endurecer', type: 'Normal', power: 25 }, { id: 'picada', name: 'Picada', type: 'Inseto', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'magikarp', number: '019', displayName: 'Magikarp', kind: 'drop', type: 'Água', color: '#ff9a6b', image: '/pokemon/magikarp.png', rarity: 'common',
    baseStats: { hp: 16, attack: 5, defense: 7 },
    description: 'Só sabe pular. Mas quem treina com paciência é recompensado.',
    moves: [{ id: 'salto', name: 'Salto', type: 'Normal', power: 20 }, { id: 'debater', name: 'Debater', type: 'Água', power: 30 }, TACKLE, SCRATCH],
  },
  {
    id: 'psyduck', number: '020', displayName: 'Psyduck', kind: 'drop', type: 'Água', color: '#ffd65c', image: '/pokemon/psyduck.png', rarity: 'common',
    baseStats: { hp: 22, attack: 9, defense: 9 },
    description: 'Vive com dor de cabeça. Quando piora, solta poderes psíquicos.',
    moves: [{ id: 'confusao', name: 'Confusão', type: 'Psíquico', power: 45 }, { id: 'jato', name: 'Jato d’água', type: 'Água', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'gastly', number: '021', displayName: 'Gastly', kind: 'star', type: 'Fantasma', color: '#8e7cc3', image: '/pokemon/gastly.png', rarity: 'common',
    baseStats: { hp: 18, attack: 11, defense: 7 },
    description: 'Uma nuvem de gás que aparece nos prédios à noite.',
    moves: [{ id: 'lambida', name: 'Lambida', type: 'Fantasma', power: 35 }, { id: 'bola-sombria', name: 'Bola sombria', type: 'Fantasma', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'eevee', number: '022', displayName: 'Eevee', kind: 'star', type: 'Normal', color: '#d9a066', image: '/pokemon/eevee.png', rarity: 'common',
    baseStats: { hp: 22, attack: 9, defense: 9 },
    description: 'Adaptável: dizem que pode evoluir de muitos jeitos diferentes.',
    moves: [{ id: 'ataque-rapido', name: 'Ataque rápido', type: 'Normal', power: 40 }, { id: 'mordida', name: 'Mordida', type: 'Sombrio', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'cubone', number: '023', displayName: 'Cubone', kind: 'rock', type: 'Terra', color: '#e0c08a', image: '/pokemon/cubone.png', rarity: 'common',
    baseStats: { hp: 22, attack: 10, defense: 12 },
    description: 'Usa um capacete de osso e um bastão para se defender.',
    moves: [{ id: 'ossada', name: 'Ossada', type: 'Terra', power: 50 }, { id: 'golpe-de-lama', name: 'Golpe de lama', type: 'Terra', power: 35 }, TACKLE, SCRATCH],
  },
  {
    id: 'riolu', number: '024', displayName: 'Riolu', kind: 'rock', type: 'Lutador', color: '#6fa8dc', image: '/pokemon/riolu.png', rarity: 'common',
    baseStats: { hp: 20, attack: 11, defense: 9 },
    description: 'Pequeno, mas já sente a aura de quem se aproxima.',
    moves: [{ id: 'soco-rapido', name: 'Soco rápido', type: 'Lutador', power: 40 }, { id: 'contra-ataque', name: 'Contra-ataque', type: 'Lutador', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'charmeleon', number: '025', displayName: 'Charmeleon', kind: 'flame', type: 'Fogo', color: '#ff7a4d', image: '/pokemon/charmeleon.png', rarity: 'uncommon',
    baseStats: { hp: 26, attack: 12, defense: 10 },
    description: 'Mais bravo que Charmander. A chama da cauda nunca apaga.',
    moves: [{ id: 'brasa', name: 'Brasa', type: 'Fogo', power: 40 }, { id: 'labareda', name: 'Labareda', type: 'Fogo', power: 55 }, TACKLE, SCRATCH],
  },
  {
    id: 'wartortle', number: '026', displayName: 'Wartortle', kind: 'drop', type: 'Água', color: '#7fb2ff', image: '/pokemon/wartortle.png', rarity: 'uncommon',
    baseStats: { hp: 26, attack: 11, defense: 12 },
    description: 'Orelhas peludas e casco firme. Nada rápido nos lagos.',
    moves: [{ id: 'bolha', name: 'Bolhas', type: 'Água', power: 45 }, { id: 'jato', name: 'Jato d’água', type: 'Água', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'butterfree', number: '027', displayName: 'Butterfree', kind: 'wing', type: 'Inseto', color: '#b9a4e6', image: '/pokemon/butterfree.png', rarity: 'uncommon',
    baseStats: { hp: 24, attack: 11, defense: 10 },
    description: 'Espalha pó das asas pelos jardins do campus.',
    moves: [{ id: 'rajada', name: 'Rajada', type: 'Voador', power: 45 }, { id: 'psico-raio', name: 'Psico-raio', type: 'Psíquico', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'haunter', number: '028', displayName: 'Haunter', kind: 'star', type: 'Fantasma', color: '#7d6bb8', image: '/pokemon/haunter.png', rarity: 'uncommon',
    baseStats: { hp: 24, attack: 13, defense: 8 },
    description: 'Atravessa paredes e adora assustar quem estuda até tarde.',
    moves: [{ id: 'lambida', name: 'Lambida', type: 'Fantasma', power: 35 }, { id: 'bola-sombria', name: 'Bola sombria', type: 'Fantasma', power: 50 }, TACKLE, SCRATCH],
  },
  {
    id: 'blastoise', number: '029', displayName: 'Blastoise', kind: 'drop', type: 'Água', color: '#5b8de0', image: '/pokemon/blastoise.png', rarity: 'rare',
    baseStats: { hp: 32, attack: 14, defense: 15 },
    description: 'Os canhões do casco disparam água com força enorme.',
    moves: [{ id: 'hidro-bomba', name: 'Hidro bomba', type: 'Água', power: 60 }, { id: 'cabecada', name: 'Cabeçada', type: 'Normal', power: 45 }, TACKLE, SCRATCH],
  },
  {
    id: 'gengar', number: '030', displayName: 'Gengar', kind: 'star', type: 'Fantasma', color: '#6a4fa3', image: '/pokemon/gengar.png', rarity: 'rare',
    baseStats: { hp: 28, attack: 16, defense: 11 },
    description: 'Esconde-se na sua sombra e ri das suas reações.',
    moves: [{ id: 'bola-sombria', name: 'Bola sombria', type: 'Fantasma', power: 55 }, { id: 'hipnose', name: 'Hipnose', type: 'Psíquico', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'espeon', number: '031', displayName: 'Espeon', kind: 'star', type: 'Psíquico', color: '#e3a8e8', image: '/pokemon/espeon.png', rarity: 'rare',
    baseStats: { hp: 27, attack: 15, defense: 11 },
    description: 'Prevê os movimentos do adversário pelo ar ao redor.',
    moves: [{ id: 'psiquico', name: 'Psíquico', type: 'Psíquico', power: 55 }, { id: 'ataque-rapido', name: 'Ataque rápido', type: 'Normal', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'umbreon', number: '032', displayName: 'Umbreon', kind: 'star', type: 'Sombrio', color: '#4b4a6b', image: '/pokemon/umbreon.png', rarity: 'rare',
    baseStats: { hp: 31, attack: 12, defense: 15 },
    description: 'Os anéis do corpo brilham no escuro. Muito resistente.',
    moves: [{ id: 'mordida', name: 'Mordida', type: 'Sombrio', power: 50 }, { id: 'pulso-sombrio', name: 'Pulso sombrio', type: 'Sombrio', power: 50 }, TACKLE, SCRATCH],
  },
  {
    id: 'leafeon', number: '033', displayName: 'Leafeon', kind: 'leaf', type: 'Planta', color: '#a8d878', image: '/pokemon/leafeon.png', rarity: 'rare',
    baseStats: { hp: 28, attack: 14, defense: 13 },
    description: 'Faz fotossíntese tomando sol nos gramados.',
    moves: [{ id: 'lamina-de-folha', name: 'Lâmina de folha', type: 'Planta', power: 55 }, { id: 'ataque-rapido', name: 'Ataque rápido', type: 'Normal', power: 40 }, TACKLE, SCRATCH],
  },
  {
    id: 'sylveon', number: '034', displayName: 'Sylveon', kind: 'star', type: 'Fada', color: '#ffb3d1', image: '/pokemon/sylveon.png', rarity: 'rare',
    baseStats: { hp: 29, attack: 14, defense: 12 },
    description: 'Acalma brigas com as fitas que saem do corpo.',
    moves: [{ id: 'brilho-lunar', name: 'Brilho lunar', type: 'Fada', power: 55 }, { id: 'voz-encantada', name: 'Voz encantada', type: 'Fada', power: 45 }, TACKLE, SCRATCH],
  },
];

const BY_ID = new Map(SPECIES.map((species) => [species.id, species]));

export function getSpecies(speciesId: string): SpeciesInfo {
  return BY_ID.get(speciesId) ?? {
    id: speciesId, number: '???', displayName: speciesId, kind: 'unknown', type: '?', color: '#e6e3f0', rarity: 'common',
    baseStats: { hp: 20, attack: 10, defense: 10 }, description: '', moves: [TACKLE, SCRATCH],
  };
}

/**
 * Onde cada Pokémon aparece: a zona do curso que combina com ele (slug da zona → ids).
 * Cada espécie mora em uma zona só. Zonas sem curso (ex.: área pessoal, zonas novas criadas
 * no admin) recebem qualquer espécie.
 */
export const HABITATS: Record<string, readonly string[]> = {
  // Eletricidade, tecnologia, mente e quem vira a noite programando.
  'ciencia-da-computacao': ['faiscao', 'espurr', 'gastly', 'haunter', 'espeon', 'umbreon', 'gengar', 'mew', 'mewtwo'],
  // Cura e cuidado: fadas, canto que acalma, aura e quem vive com dor de cabeça.
  enfermagem: ['jigglypuff', 'psyduck', 'riolu', 'clefable', 'lucario', 'sylveon'],
  // Vida aquática e insetos voadores do laboratório.
  biologia: ['gotinha', 'magikarp', 'wartortle', 'butterfree', 'blastoise', 'gyarados', 'aurora'],
  // Bichos que vão ao veterinário: mamíferos, roedores e lagartos.
  'medicina-veterinaria': ['eevee', 'tandemaus', 'charmeleon', 'brasinha', 'charizard'],
  // Plantas, lagartas da lavoura, terra e pedra.
  agronomia: ['brotinho', 'caterpie', 'metapod', 'cubone', 'pedregulho', 'coruja', 'leafeon'],
};

export const HABITAT_LABEL: Record<string, string> = {
  'ciencia-da-computacao': 'Ciência da Computação',
  enfermagem: 'Enfermagem',
  biologia: 'Biologia',
  'medicina-veterinaria': 'Medicina Veterinária',
  agronomia: 'Agronomia',
};

/** Espécies que podem aparecer numa zona (todas, se a zona não é de um curso). */
export function speciesForZone(zoneSlug: string | undefined): SpeciesInfo[] {
  const ids = zoneSlug ? HABITATS[zoneSlug] : undefined;
  return ids ? ids.map(getSpecies) : SPECIES;
}

/** Nome da zona onde a espécie aparece (null se não tem uma zona fixa). */
export function habitatOf(speciesId: string): string | null {
  const slug = Object.keys(HABITATS).find((key) => HABITATS[key]!.includes(speciesId));
  return slug ? HABITAT_LABEL[slug] ?? slug : null;
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
