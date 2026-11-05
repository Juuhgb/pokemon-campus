// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CampusZone } from '../exploration/types.js';
import { isAdminPath } from './access.js';
import { ZoneEditorPanel, type ZoneEditorActions } from './components/ZoneEditorPanel.js';

afterEach(cleanup);

const zones: CampusZone[] = [{
  id: 'z1', slug: 'z1', name: 'Biologia', color: '#4ade80', isDemo: true,
  boundary: [{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.001 }, { latitude: 0.001, longitude: 0 }],
}];

function actions(): ZoneEditorActions {
  return {
    select: vi.fn(), backToList: vi.fn(), startDrawing: vi.fn(), undoPoint: vi.fn(), cancelDrawing: vi.fn(),
    finishDrawing: vi.fn(), rename: vi.fn(), recolor: vi.fn(), remove: vi.fn(),
    importZones: vi.fn(() => true), exportZones: vi.fn(() => '{}'), reset: vi.fn(),
  };
}

describe('rota do admin', () => {
  it('reconhece /admin com ou sem barra final', () => {
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/')).toBe(true);
    expect(isAdminPath('/')).toBe(false);
    expect(isAdminPath('/administrador')).toBe(false);
  });
});

describe('ZoneEditorPanel', () => {
  it('lista as zonas e permite selecionar ou criar', () => {
    const handlers = actions();
    render(<ZoneEditorPanel state={{ mode: 'browse' }} zones={zones} actions={handlers} />);
    fireEvent.click(screen.getByRole('button', { name: /Biologia/ }));
    expect(handlers.select).toHaveBeenCalledWith('z1');
    fireEvent.click(screen.getByRole('button', { name: '+ Nova zona' }));
    expect(handlers.startDrawing).toHaveBeenCalled();
  });

  it('só permite salvar o desenho com pelo menos 3 pontos', () => {
    const handlers = actions();
    const { rerender } = render(<ZoneEditorPanel state={{ mode: 'draw', points: [zones[0]!.boundary[0]!] }} zones={zones} actions={handlers} />);
    expect((screen.getByRole('button', { name: 'Salvar zona' }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<ZoneEditorPanel state={{ mode: 'draw', points: zones[0]!.boundary }} zones={zones} actions={handlers} />);
    fireEvent.change(screen.getByLabelText('Nome da zona'), { target: { value: 'Setor Enfermagem' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar zona' }));
    expect(handlers.finishDrawing).toHaveBeenCalledWith('Setor Enfermagem');
  });

  it('edita nome da zona selecionada', () => {
    const handlers = actions();
    render(<ZoneEditorPanel state={{ mode: 'edit', zoneId: 'z1' }} zones={zones} actions={handlers} />);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Bio' } });
    expect(handlers.rename).toHaveBeenCalledWith('z1', 'Bio');
  });
});
