import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditableZoneRepository, ZoneRepository } from '../services/zoneRepository.js';
import type { CampusZone } from '../types.js';

const SAVE_DELAY_MS = 400;

export interface EditableZonesState {
  zones: CampusZone[];
  /** Atualiza as zonas na tela e salva (com debounce) se o repositório aceitar gravação. */
  setZones: (update: CampusZone[] | ((current: CampusZone[]) => CampusZone[])) => void;
  reset: () => Promise<void>;
  editable: boolean;
}

const isEditable = (repository: ZoneRepository): repository is EditableZoneRepository =>
  'saveZones' in repository && 'reset' in repository;

export function useEditableZones(repository: ZoneRepository): EditableZonesState {
  const [zones, setZonesState] = useState<CampusZone[]>([]);
  const dirty = useRef(false);

  useEffect(() => {
    let cancelled = false;
    repository.listZones().then((items) => {
      if (!cancelled) setZonesState(items);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [repository]);

  // Salva só mudanças feitas pelo editor, agrupando arrastes rápidos.
  useEffect(() => {
    if (!dirty.current || !isEditable(repository)) return;
    const id = window.setTimeout(() => {
      dirty.current = false;
      repository.saveZones(zones).catch(() => undefined);
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [zones, repository]);

  const setZones = useCallback<EditableZonesState['setZones']>((update) => {
    dirty.current = true;
    setZonesState(update);
  }, []);

  const reset = useCallback(async () => {
    if (!isEditable(repository)) return;
    dirty.current = false;
    setZonesState(await repository.reset());
  }, [repository]);

  return { zones, setZones, reset, editable: isEditable(repository) };
}
