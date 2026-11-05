import type { CourseSlug, PlayerState } from '../player/playerState.js';

/** Jogadores de exemplo até existir GET /api/v1/leaderboard. */
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

export function rankingFor(player: Pick<PlayerState, 'displayName' | 'course' | 'score'>, scope: 'all' | 'course'): RankingRow[] {
  const everyone = [
    ...SAMPLE_PLAYERS.map((sample) => ({ ...sample, me: false })),
    { name: player.displayName, course: player.course, score: player.score, me: true },
  ];
  return everyone
    .filter((row) => scope === 'all' || row.course === player.course)
    .sort((a, b) => b.score - a.score || Number(b.me) - Number(a.me))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
