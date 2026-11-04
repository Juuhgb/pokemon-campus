import { applyExperience } from '@pokemon-campus/game-engine';
export { xpToNextLevel } from '@pokemon-campus/game-engine';
import { getSpecies, statsAtLevel } from '../catalog/species.js';

/**
 * Estado local do jogador para o protótipo jogável.
 * Fica só neste navegador até existirem as rotas da API (perfil, coleção, equipe, inventário).
 * O servidor continua sendo a autoridade; nada aqui é enviado para a sincronização.
 */

export const COURSES = [
  { slug: 'ciencia-da-computacao', label: 'Ciência da Computação', color: '#6aa8ff' },
  { slug: 'biologia', label: 'Biologia', color: '#7ad88f' },
  { slug: 'enfermagem', label: 'Enfermagem', color: '#ff8ab3' },
  { slug: 'medicina-veterinaria', label: 'Medicina Veterinária', color: '#ffc23d' },
  { slug: 'agronomia', label: 'Agronomia', color: '#c9b8ff' },
] as const;

export type CourseSlug = (typeof COURSES)[number]['slug'];
export type BallItem = 'POKE_BALL' | 'GREAT_BALL';

export const MAX_TEAM_SIZE = 3;
export const MAX_NAME_LENGTH = 40;

export interface OwnedCreature {
  id: string;
  speciesId: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  caughtAt: string;
}

export interface PlayerState {
  version: 1;
  onboarded: boolean;
  googleEmail: string | null;
  displayName: string;
  course: CourseSlug;
  score: number;
  battles: number;
  settledBattles?: string[];
  captures: number;
  creatures: OwnedCreature[];
  team: string[];
  inventory: Record<BallItem, number>;
}

export const INITIAL_PLAYER: PlayerState = {
  version: 1,
  onboarded: false,
  googleEmail: null,
  displayName: 'Jogador',
  course: 'ciencia-da-computacao',
  score: 0,
  battles: 0,
  captures: 0,
  creatures: [],
  team: [],
  inventory: { POKE_BALL: 10, GREAT_BALL: 3 },
};

export type PlayerAction =
  | { type: 'onboard'; starterSpeciesId: string; creatureId: string; at: string }
  | { type: 'linkGoogle'; email: string }
  | { type: 'unlinkGoogle' }
  | { type: 'updateProfile'; displayName: string; course: CourseSlug }
  | { type: 'addToTeam'; creatureId: string }
  | { type: 'removeFromTeam'; creatureId: string }
  | { type: 'useBall'; item: BallItem }
  | { type: 'capture'; creatureId: string; speciesId: string; level: number; at: string }
  | { type: 'battleFinished'; xpByCreature: Record<string, number>; points: number }
  | { type: 'settleBattle'; battleId: string; xpByCreature: Record<string, number>; points: number; captured?: { creatureId: string; speciesId: string; level: number; at: string } }
  | { type: 'reset' };



export function newCreature(id: string, speciesId: string, level: number, at: string): OwnedCreature {
  const { maxHp } = statsAtLevel(getSpecies(speciesId), level);
  return { id, speciesId, level, xp: 0, hp: maxHp, maxHp, caughtAt: at };
}

function gainXp(creature: OwnedCreature, amount: number): OwnedCreature {
  const { level, xp } = applyExperience(creature.level, creature.xp, amount);
  const { maxHp } = statsAtLevel(getSpecies(creature.speciesId), level);
  return { ...creature, level, xp, maxHp, hp: maxHp };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'onboard': {
      if (state.onboarded) return state;
      const starter = newCreature(action.creatureId, action.starterSpeciesId, 5, action.at);
      return { ...state, onboarded: true, creatures: [starter], team: [starter.id] };
    }
    case 'linkGoogle':
      return { ...state, googleEmail: action.email };
    case 'unlinkGoogle':
      return { ...state, googleEmail: null };
    case 'updateProfile': {
      const displayName = action.displayName.trim().slice(0, MAX_NAME_LENGTH);
      if (!displayName) return state;
      return { ...state, displayName, course: action.course };
    }
    case 'addToTeam':
      if (state.team.length >= MAX_TEAM_SIZE || state.team.includes(action.creatureId)) return state;
      if (!state.creatures.some((creature) => creature.id === action.creatureId)) return state;
      return { ...state, team: [...state.team, action.creatureId] };
    case 'removeFromTeam':
      // A equipe nunca fica vazia: é preciso ter alguém para batalhar.
      if (state.team.length <= 1) return state;
      return { ...state, team: state.team.filter((id) => id !== action.creatureId) };
    case 'useBall':
      if (state.inventory[action.item] <= 0) return state;
      return { ...state, inventory: { ...state.inventory, [action.item]: state.inventory[action.item] - 1 } };
    case 'capture': {
      const creature = newCreature(action.creatureId, action.speciesId, action.level, action.at);
      const team = state.team.length < MAX_TEAM_SIZE ? [...state.team, creature.id] : state.team;
      return { ...state, creatures: [...state.creatures, creature], team, captures: state.captures + 1 };
    }
    case 'battleFinished':
      // No protótipo a equipe descansa ao fim de cada batalha (PV voltam ao máximo).
      return {
        ...state,
        battles: state.battles + 1,
        score: state.score + Math.max(0, action.points),
        creatures: state.creatures.map((creature) => gainXp(creature, action.xpByCreature[creature.id] ?? 0)),
      };
    case 'settleBattle': {
      if (state.settledBattles?.includes(action.battleId)) return state;
      const captured = action.captured
        ? playerReducer(state, { type: 'capture', ...action.captured }) : state;
      const rewarded = playerReducer(captured, { type: 'battleFinished', xpByCreature: action.xpByCreature, points: action.points });
      return { ...rewarded, settledBattles: [...(state.settledBattles ?? []), action.battleId] };
    }
    case 'reset':
      return INITIAL_PLAYER;
  }
}

/** Lê o estado salvo; dados inválidos voltam ao estado inicial. */
export function parseStoredPlayer(raw: string | null): PlayerState {
  if (!raw) return INITIAL_PLAYER;
  try {
    const value = JSON.parse(raw) as Partial<PlayerState>;
    if (value.version !== 1 || !Array.isArray(value.creatures) || !Array.isArray(value.team)) return INITIAL_PLAYER;
    return { ...INITIAL_PLAYER, ...value, inventory: { ...INITIAL_PLAYER.inventory, ...value.inventory } } as PlayerState;
  } catch {
    return INITIAL_PLAYER;
  }
}

/** Quantas criaturas o jogador tem de cada espécie. */
export function countBySpecies(creatures: readonly OwnedCreature[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const creature of creatures) counts.set(creature.speciesId, (counts.get(creature.speciesId) ?? 0) + 1);
  return counts;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0]![0]! + parts[parts.length - 1]![0]! : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}
