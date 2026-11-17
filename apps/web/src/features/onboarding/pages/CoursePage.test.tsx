// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PlayerProvider, usePlayer } from '../../player/PlayerProvider.js';
import { INITIAL_PLAYER, playerReducer } from '../../player/playerState.js';
import { CoursePage } from './CoursePage.js';

afterEach(() => cleanup());

function Probe() {
  const { player } = usePlayer();
  return <output data-testid="state">{`${player.course}|${String(player.courseChosen ?? false)}`}</output>;
}

describe('escolha do curso no primeiro acesso', () => {
  it('só continua depois de escolher; a escolha fica salva e não pede de novo', () => {
    render(<PlayerProvider initial={{ ...INITIAL_PLAYER, googleEmail: 'ana@gmail.com' }}><CoursePage /><Probe /></PlayerProvider>);
    const next = screen.getByRole('button', { name: 'Escolha um curso' }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: /Enfermagem/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
    expect(screen.getByTestId('state').textContent).toBe('enfermagem|true');
  });

  it('jogador novo ainda não escolheu; mudar o perfil conta como escolhido', () => {
    expect(INITIAL_PLAYER.courseChosen).toBeFalsy();
    const chosen = playerReducer(INITIAL_PLAYER, { type: 'updateProfile', displayName: 'Ana', course: 'agronomia' });
    expect(chosen).toMatchObject({ course: 'agronomia', courseChosen: true });
  });
});
