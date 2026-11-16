import { useState } from 'react';
import { navigate, ROUTES } from '../../../app/router.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { buttonStyles, StepDots } from '../../../components/ui/ui.js';
import { getSpecies, HABITATS } from '../../catalog/species.js';
import { usePlayer } from '../../player/PlayerProvider.js';
import { COURSES, type CourseSlug } from '../../player/playerState.js';

/** Três Pokémon que moram na zona do curso, para dar cara a cada opção. */
const previewOf = (slug: CourseSlug) => (HABITATS[slug] ?? []).slice(0, 3).map(getSpecies);

/**
 * Passo do primeiro acesso, logo depois do login: o jogador escolhe o curso dele.
 * Aparece uma vez só; depois o curso pode ser trocado em Perfil → Configurações.
 */
export function CoursePage() {
  const { player, dispatch } = usePlayer();
  const [picked, setPicked] = useState<CourseSlug | null>(null);

  const next = () => {
    if (!picked) return;
    dispatch({ type: 'updateProfile', displayName: player.displayName, course: picked });
    navigate(ROUTES.starter);
  };

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col bg-creme px-5 pt-6 pb-8 text-tinta">
      <h1 className="m-0 font-display text-[34px] leading-tight font-bold">Qual é o seu curso?</h1>
      <p className="mt-1.5 mb-0 text-[15px] leading-snug font-bold text-tinta-suave">
        Você entra no ranking “Meu curso” e joga junto com a sua turma. Dá para trocar depois nas Configurações.
      </p>

      <div role="radiogroup" aria-label="Escolha o seu curso" className="mt-5 flex flex-col gap-2.5">
        {COURSES.map((course) => {
          const on = course.slug === picked;
          return (
            <button
              key={course.slug}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPicked(course.slug)}
              className={`flex min-h-[68px] items-center gap-3 rounded-[20px] px-3.5 py-2 text-left transition-transform active:translate-y-px ${on ? 'sticker bg-amarelo' : 'ink-border bg-white'}`}
            >
              <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded-full border-[2.5px] border-tinta" style={{ background: course.color }} />
              <span className="flex-1 font-display text-lg leading-tight font-semibold">{course.label}</span>
              <span aria-hidden="true" className="flex -space-x-3">
                {previewOf(course.slug).map((species) => (
                  <CreatureBadge key={species.id} kind={species.kind} image={species.image} color={course.color} size={34} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <button type="button" onClick={next} disabled={!picked} className={buttonStyles.primary}>
          {picked ? 'Continuar' : 'Escolha um curso'}
        </button>
        <StepDots step={2} total={4} />
      </div>
    </main>
  );
}
