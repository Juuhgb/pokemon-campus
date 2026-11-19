// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { CollectionSimulation } from './CollectionSimulation.js';

afterEach(cleanup);

it('adiciona exemplares prontos para evoluir e reinicia a coleção ao reabrir', () => {
  const view = render(<CollectionSimulation />);
  expect(screen.getByText('Evoluir para Ivysaur')).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: 'Espécie de teste' }), { target: { value: 'riolu' } });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar no nível 20' }));
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar no nível 20' }));
  expect(screen.getAllByText('Evoluir para Lucario')).toHaveLength(2);
  view.unmount();
  render(<CollectionSimulation />);
  expect(screen.queryByText('Evoluir para Lucario')).toBeNull();
});
