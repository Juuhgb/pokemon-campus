import { COURSES, type CampusId, type CourseSlug, type PlayerState } from '../player/playerState.js';

/** Jogadores de exemplo, só enquanto o ranking do servidor nunca foi baixado neste aparelho. */
const SAMPLE_PLAYERS: { name: string; course: CourseSlug; score: number }[] = [
  { name: 'Bruno Rocha', course: 'agronomia', score: 2310 },
  { name: 'Carla Melo', course: 'ciencia-da-computacao', score: 1985 },
  { name: 'Diego Silva', course: 'medicina-veterinaria', score: 1710 },
  { name: 'Elisa Faria', course: 'biologia', score: 1105 },
  { name: 'Gabriel Pires', course: 'ciencia-da-computacao', score: 980 },
  { name: 'Helena Nunes', course: 'enfermagem', score: 870 },
  { name: 'Igor Teixeira', course: 'ciencia-da-computacao', score: 640 },
  { name: 'Júlia Costa', course: 'agronomia', score: 420 },
];

export interface RankingRow {
  rank: number;
  name: string;
  course: CourseSlug;
  score: number;
  me: boolean;
}

export interface RankingOthers {
  /** Linhas do servidor (ranking/{uid}); o próprio jogador é tirado e entra com a pontuação ao vivo. */
  entries: readonly { uid: string; displayName: string; course: string; score: number }[];
  myUid: string | null;
}

export function rankingFor(player: Pick<PlayerState, 'displayName' | 'course' | 'score'>, scope: 'all' | 'course', others?: RankingOthers | null): RankingRow[] {
  const rest = others
    ? others.entries.filter((entry) => entry.uid !== others.myUid).map((entry) => ({ name: entry.displayName, course: entry.course as CourseSlug, score: entry.score }))
    : SAMPLE_PLAYERS;
  const everyone = [
    ...rest.map((row) => ({ ...row, me: false })),
    { name: player.displayName, course: player.course, score: player.score, me: true },
  ];
  return everyone
    .filter((row) => scope === 'all' || row.course === player.course)
    .sort((a, b) => b.score - a.score || Number(b.me) - Number(a.me))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export interface CourseTotal {
  rank: number;
  course: CourseSlug;
  /** Soma dos pontos de todos os jogadores do curso. */
  total: number;
  players: number;
  /** É o curso do jogador. */
  mine: boolean;
}

/**
 * Pontuação total de cada curso (soma dos jogadores), da maior para a menor.
 * Só entram cursos com pelo menos um jogador; `campus` filtra por câmpus.
 */
export function courseTotals(rows: readonly Pick<RankingRow, 'course' | 'score' | 'me'>[], campus?: CampusId): CourseTotal[] {
  const byCourse = new Map<CourseSlug, { total: number; players: number; mine: boolean }>();
  for (const row of rows) {
    const current = byCourse.get(row.course) ?? { total: 0, players: 0, mine: false };
    byCourse.set(row.course, { total: current.total + row.score, players: current.players + 1, mine: current.mine || row.me });
  }
  return [...byCourse.entries()]
    .filter(([course]) => !campus || COURSES.find((item) => item.slug === course)?.campus === campus)
    .sort((a, b) => b[1].total - a[1].total || Number(b[1].mine) - Number(a[1].mine))
    .map(([course, data], index) => ({ rank: index + 1, course, ...data }));
}
