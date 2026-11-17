import { describe, expect, it } from 'vitest';
import { COURSES, coursesByCampus, courseLabel } from '../player/playerState.js';
import { courseTotals } from './ranking.js';

describe('cursos por câmpus', () => {
  it('agrupa em Bandeirantes, Jacarezinho, Cornélio Procópio e Outros, sem repetir slug', () => {
    expect(coursesByCampus().map((group) => group.campus.label)).toEqual(['Bandeirantes', 'Jacarezinho', 'Cornélio Procópio', 'Outros']);
    expect(new Set(COURSES.map((course) => course.slug)).size).toBe(COURSES.length);
    const bandeirantes = coursesByCampus()[0]!.courses.map((course) => course.label);
    expect(bandeirantes).toEqual(expect.arrayContaining(['Ciência da Computação', 'Medicina Veterinária', 'Agronomia']));
    expect(coursesByCampus()[1]!.courses.map((course) => course.label)).toContain('Direito');
  });

  it('o nome mostra a cidade quando pedido (cursos que existem em mais de um câmpus)', () => {
    expect(courseLabel('pedagogia-cornelio', true)).toBe('Pedagogia · Cornélio Procópio');
    expect(courseLabel('pedagogia', true)).toBe('Pedagogia · Jacarezinho');
    expect(courseLabel('nenhum-curso', true)).toBe('Nenhum curso');
  });
});

describe('pontuação total por curso', () => {
  const rows = [
    { course: 'ciencia-da-computacao' as const, score: 2000, me: false },
    { course: 'ciencia-da-computacao' as const, score: 1000, me: true },
    { course: 'biologia' as const, score: 2000, me: false },
    { course: 'direito' as const, score: 500, me: false },
  ];

  it('soma os jogadores de cada curso e ordena do maior para o menor', () => {
    expect(courseTotals(rows)).toEqual([
      { rank: 1, course: 'ciencia-da-computacao', total: 3000, players: 2, mine: true },
      { rank: 2, course: 'biologia', total: 2000, players: 1, mine: false },
      { rank: 3, course: 'direito', total: 500, players: 1, mine: false },
    ]);
  });

  it('filtra por câmpus', () => {
    expect(courseTotals(rows, 'jacarezinho').map((row) => row.course)).toEqual(['direito']);
  });
});
