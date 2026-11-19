import { applyExperience } from '@pokemon-campus/game-engine';
export { xpToNextLevel } from '@pokemon-campus/game-engine';
import { evolutionFor, getSpecies, statsAtLevel } from '../catalog/species.js';

/**
 * Estado do jogador e as regras de cada jogada (reducer puro).
 * O estado não é salvo direto: cada jogada vira um evento (playerEvents.ts), guardado no
 * aparelho e sincronizado com o servidor; o estado é recalculado a partir dos eventos.
 */
/** Câmpus da UENP. "Outros" guarda a opção de quem não é aluno. */
export const CAMPUSES = [
  { id: 'bandeirantes', label: 'Bandeirantes' },
  { id: 'jacarezinho', label: 'Jacarezinho' },
  { id: 'cornelio-procopio', label: 'Cornélio Procópio' },
  { id: 'outros', label: 'Outros' },
] as const;

export type CampusId = (typeof CAMPUSES)[number]['id'];

/**
 * Cursos de graduação da UENP por câmpus (fonte: tabelas do Sisu/vestibular da UENP).
 * Cursos que existem em mais de um câmpus têm um slug por câmpus. Os slugs antigos não mudam,
 * para não perder o curso já salvo no progresso dos jogadores.
 */
export const COURSES = [
  // Bandeirantes (Câmpus Luiz Meneghel)
  { slug: 'ciencia-da-computacao', label: 'Ciência da Computação', color: '#6aa8ff', campus: 'bandeirantes' },
  { slug: 'sistemas-de-informacao', label: 'Sistemas de Informação', color: '#6aa8ff', campus: 'bandeirantes' },
  { slug: 'licenciatura-em-computacao', label: 'Licenciatura em Computação', color: '#6aa8ff', campus: 'bandeirantes' },
  { slug: 'agronomia', label: 'Agronomia', color: '#c9b8ff', campus: 'bandeirantes' },
  { slug: 'biologia', label: 'Ciências Biológicas', color: '#7ad88f', campus: 'bandeirantes' },
  { slug: 'enfermagem', label: 'Enfermagem', color: '#ff8ab3', campus: 'bandeirantes' },
  { slug: 'medicina-veterinaria', label: 'Medicina Veterinária', color: '#ffc23d', campus: 'bandeirantes' },
  { slug: 'fruticultura', label: 'Fruticultura', color: '#b6e388', campus: 'bandeirantes' },
  // Jacarezinho
  { slug: 'direito', label: 'Direito', color: '#c9b8ff', campus: 'jacarezinho' },
  { slug: 'odontologia', label: 'Odontologia', color: '#ff8ab3', campus: 'jacarezinho' },
  { slug: 'fisioterapia', label: 'Fisioterapia', color: '#ff8ab3', campus: 'jacarezinho' },
  { slug: 'educacao-fisica', label: 'Educação Física', color: '#ff8a5c', campus: 'jacarezinho' },
  { slug: 'ciencias-biologicas-jacarezinho', label: 'Ciências Biológicas', color: '#7ad88f', campus: 'jacarezinho' },
  { slug: 'filosofia', label: 'Filosofia', color: '#c9b8ff', campus: 'jacarezinho' },
  { slug: 'historia', label: 'História', color: '#c9b8ff', campus: 'jacarezinho' },
  { slug: 'letras-portugues-espanhol', label: 'Letras Português/Espanhol', color: '#ffc23d', campus: 'jacarezinho' },
  { slug: 'letras-portugues-ingles', label: 'Letras Português/Inglês', color: '#ffc23d', campus: 'jacarezinho' },
  { slug: 'matematica', label: 'Matemática', color: '#6aa8ff', campus: 'jacarezinho' },
  { slug: 'pedagogia', label: 'Pedagogia', color: '#7ad88f', campus: 'jacarezinho' },
  // Cornélio Procópio
  { slug: 'administracao', label: 'Administração', color: '#ffc23d', campus: 'cornelio-procopio' },
  { slug: 'ciencias-contabeis', label: 'Ciências Contábeis', color: '#ffc23d', campus: 'cornelio-procopio' },
  { slug: 'ciencias-economicas', label: 'Ciências Econômicas', color: '#ffc23d', campus: 'cornelio-procopio' },
  { slug: 'geografia', label: 'Geografia', color: '#7ad88f', campus: 'cornelio-procopio' },
  { slug: 'letras-portugues-ingles-cornelio', label: 'Letras Português/Inglês', color: '#ffc23d', campus: 'cornelio-procopio' },
  { slug: 'matematica-cornelio', label: 'Matemática', color: '#6aa8ff', campus: 'cornelio-procopio' },
  { slug: 'pedagogia-cornelio', label: 'Pedagogia', color: '#7ad88f', campus: 'cornelio-procopio' },
  { slug: 'ciencias-biologicas-cornelio', label: 'Ciências Biológicas', color: '#7ad88f', campus: 'cornelio-procopio' },
  { slug: 'medicina', label: 'Medicina', color: '#ff8ab3', campus: 'cornelio-procopio' },
  // Outros
  { slug: 'nenhum-curso', label: 'Nenhum curso', color: '#cccccc', campus: 'outros' },
] as const;

export type CourseSlug = (typeof COURSES)[number]['slug'];
export type CourseInfo = (typeof COURSES)[number];

/** Cursos agrupados por câmpus, na ordem de CAMPUSES (para as telas de escolha). */
export function coursesByCampus(): { campus: (typeof CAMPUSES)[number]; courses: CourseInfo[] }[] {
  return CAMPUSES.map((campus) => ({ campus, courses: COURSES.filter((course) => course.campus === campus.id) }))
    .filter((group) => group.courses.length > 0);
}

/** Nome do curso; com `withCampus`, inclui a cidade (cursos repetidos em mais de um câmpus). */
export function courseLabel(slug: string, withCampus = false): string {
  const course = COURSES.find((item) => item.slug === slug);
  if (!course) return slug;
  if (!withCampus || course.campus === 'outros') return course.label;
  const campus = CAMPUSES.find((item) => item.id === course.campus)!;
  return `${course.label} · ${campus.label}`;
}
export type BallItem = 'POKE_BALL' | 'GREAT_BALL';

export const MAX_TEAM_SIZE = 3;
/**
 * A Poké Ball clássica é infinita. A Great Ball só se ganha capturando: cada captura tem
 * GREAT_BALL_CHANCE de dar 1 (sorteio da batalha, gravado na jogada). Capturas antigas, de
 * antes dessa regra, continuam valendo as 3 que davam.
 */
export const UNLIMITED_BALL: BallItem = 'POKE_BALL';
export const GREAT_BALL_CHANCE = 0.5;
export const LEGACY_GREAT_BALLS_PER_CAPTURE = 3;
export const MAX_NAME_LENGTH = 40;

export interface OwnedCreature {
  sector?: { id: string; name: string };
  previousForms?: string[];
  id: string;
  speciesId: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  caughtAt: string;
}

/** Resultado de uma batalha, para o histórico do jogador. */
export type BattleOutcome = 'captured' | 'won' | 'lost' | 'fled';

export interface BattleRecord {
  battleId: string;
  /** ISO 8601. */
  at: string | null;
  /** null em batalhas registradas antes do histórico existir. */
  outcome: BattleOutcome | null;
  speciesId: string | null;
  level: number | null;
  points: number;
  captured: boolean;
}

export interface PlayerState {
  version: 1;
  onboarded: boolean;
  googleEmail: string | null;
  /** UID do Firebase Authentication quando a conta Google está vinculada de verdade. */
  googleUid?: string | null;
  displayName: string;
  course: CourseSlug;
  score: number;
  battles: number;
  settledBattles?: string[];
  /** Já escolheu o curso (passo do primeiro acesso, depois do login). */
  courseChosen?: boolean;
  /** Histórico das batalhas, da mais antiga para a mais recente. */
  history: BattleRecord[];
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
  inventory: { POKE_BALL: 10, GREAT_BALL: 0 },
  history: [],
};

export type PlayerAction =
  | { type: 'onboard'; starterSpeciesId: string; creatureId: string; at: string }
  | { type: 'linkGoogle'; email: string; uid?: string; displayName?: string | null }
  | { type: 'unlinkGoogle' }
  | { type: 'updateProfile'; displayName: string; course: CourseSlug }
  | { type: 'addToTeam'; creatureId: string }
  | { type: 'removeFromTeam'; creatureId: string }
  | { type: 'evolveCreature'; creatureId: string; from: string; to: string }
  | { type: 'useBall'; item: BallItem }
  | { type: 'capture'; creatureId: string; speciesId: string; level: number; at: string; sector?: { id: string; name: string }; }
  | { type: 'battleFinished'; xpByCreature: Record<string, number>; points: number }
  | { type: 'settleBattle'; battleId: string; spawnId?: string; outcome?: BattleOutcome; foe?: { speciesId: string; level: number }; endedAt?: string; greatBalls?: number; xpByCreature: Record<string, number>; points: number; captured?: { creatureId: string; speciesId: string; level: number; at: string; sector?: { id: string; name: string }; } }
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
      return { ...state, onboarded: true, creatures: [{ ...starter, sector: { id: 'starter', name: 'Pokémon inicial' } }], team: [starter.id] };
    }
    case 'linkGoogle': {
      // Usa o nome da conta Google se o jogador ainda está com o nome padrão.
      const googleName = action.displayName?.trim().slice(0, MAX_NAME_LENGTH);
      const displayName = state.displayName === INITIAL_PLAYER.displayName && googleName ? googleName : state.displayName;
      return { ...state, googleEmail: action.email, googleUid: action.uid ?? null, displayName };
    }
    case 'unlinkGoogle':
      return { ...state, googleEmail: null, googleUid: null };
    case 'updateProfile': {
      const displayName = action.displayName.trim().slice(0, MAX_NAME_LENGTH);
      if (!displayName) return state;
      return { ...state, displayName, course: action.course, courseChosen: true };
    }
    case 'addToTeam':
      if (state.team.length >= MAX_TEAM_SIZE || state.team.includes(action.creatureId)) return state;
      if (!state.creatures.some((creature) => creature.id === action.creatureId)) return state;
      return { ...state, team: [...state.team, action.creatureId] };
    case 'removeFromTeam':
      // A equipe nunca fica vazia: é preciso ter alguém para batalhar.
      if (state.team.length <= 1) return state;
      return { ...state, team: state.team.filter((id) => id !== action.creatureId) };
    case 'evolveCreature': {
      const creature = state.creatures.find(item => item.id === action.creatureId);
      const rule = evolutionFor(action.from);
      if (!creature || creature.speciesId !== action.from || !rule || rule.target !== action.to || creature.level < rule.level) return state;
      const { maxHp } = statsAtLevel(getSpecies(action.to), creature.level);
      const hp = creature.hp === 0 ? 0 : Math.max(1, Math.round(creature.hp * maxHp / creature.maxHp));
      const previousForms = [...(creature.previousForms ?? []), creature.speciesId];
      const evolved = { ...creature, previousForms, speciesId: action.to, maxHp, hp };
      return { ...state, creatures: state.creatures.map(item => item.id === creature.id ? evolved : item) };
    }
    case 'useBall':
      // Poké Ball clássica: infinita, não gasta.
      if (action.item === UNLIMITED_BALL || state.inventory[action.item] <= 0) return state;
      return { ...state, inventory: { ...state.inventory, [action.item]: state.inventory[action.item] - 1 } };
    case 'capture': {
      const creature = { ...newCreature(action.creatureId, action.speciesId, action.level, action.at), sector: action.sector };
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
      const withCreature = action.captured
        ? playerReducer(state, { type: 'capture', ...action.captured }) : state;
      // Great Balls da captura: o sorteio vem na jogada (0 ou 1); jogadas antigas não traziam e davam 3.
      const greatBalls = action.captured ? Math.max(0, Math.min(3, action.greatBalls ?? LEGACY_GREAT_BALLS_PER_CAPTURE)) : 0;
      const captured = greatBalls > 0
        ? { ...withCreature, inventory: { ...withCreature.inventory, GREAT_BALL: withCreature.inventory.GREAT_BALL + greatBalls } }
        : withCreature;
      const rewarded = playerReducer(captured, { type: 'battleFinished', xpByCreature: action.xpByCreature, points: action.points });
      const record: BattleRecord = {
        battleId: action.battleId,
        at: action.endedAt ?? action.captured?.at ?? null,
        outcome: action.outcome ?? (action.captured ? 'captured' : null),
        speciesId: action.foe?.speciesId ?? action.captured?.speciesId ?? null,
        level: action.foe?.level ?? action.captured?.level ?? null,
        points: Math.max(0, action.points),
        captured: Boolean(action.captured),
      };
      return {
        ...rewarded,
        settledBattles: [...(state.settledBattles ?? []), action.battleId],
        history: [...(state.history ?? []), record],
      };
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
    const player = { ...INITIAL_PLAYER, ...value, inventory: { ...INITIAL_PLAYER.inventory, ...value.inventory } } as PlayerState;
    if (!Array.isArray(player.history)) player.history = [];
    // Vínculo da versão antiga (login simulado, sem UID): passa a contar como não vinculado.
    if (player.googleEmail && !player.googleUid) player.googleEmail = null;
    return player;
  } catch {
    return INITIAL_PLAYER;
  }
}

/** Quantas bolas desse tipo o jogador pode usar (Infinity para a Poké Ball clássica). */
export function ballCount(player: Pick<PlayerState, 'inventory'>, item: BallItem): number {
  return item === UNLIMITED_BALL ? Infinity : player.inventory[item];
}

/** Texto da quantidade: "∞" para a Poké Ball clássica. */
export function ballCountLabel(player: Pick<PlayerState, 'inventory'>, item: BallItem): string {
  const count = ballCount(player, item);
  return count === Infinity ? '∞' : `×${count}`;
}

/** Quantas criaturas o jogador tem de cada espécie. */
export function countBySpecies(creatures: readonly OwnedCreature[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const creature of creatures) {
    for (const species of creature.previousForms ?? []) {
      if (!counts.has(species)) counts.set(species, 0);
    }
    counts.set(creature.speciesId, (counts.get(creature.speciesId) ?? 0) + 1);
  }
  return counts;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0]![0]! + parts[parts.length - 1]![0]! : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}
