import { useCallback, useMemo, useState } from 'react';
import type { ZoneEditorState } from '../components/ZoneEditorLayer.js';
import type { ZoneEditorActions } from '../components/ZoneEditorPanel.js';
import type { CampusZone, GeoPoint } from '../../exploration/types.js';
import {
  createZone,
  deleteZone,
  insertVertex,
  moveVertex,
  parseZones,
  recolorZone,
  removeVertex,
  renameZone,
  serializeZones,
  translateZone,
} from '../../exploration/utils/zoneEdits.js';
import type { EditableZonesState } from './useEditableZones.js';

/** Estado e ações do editor de zonas do painel de admin. */
export interface ZoneEditor {
  state: ZoneEditorState;
  actions: ZoneEditorActions;
  /** Clique no mapa enquanto desenha. */
  handleMapClick: (point: GeoPoint) => void;
  /** Clique numa zona do mapa com o editor aberto. */
  handleZoneClick: (zoneId: string) => void;
  layer: {
    onMoveVertex: (zoneId: string, index: number, point: GeoPoint) => void;
    onInsertVertex: (zoneId: string, afterIndex: number) => void;
    onRemoveVertex: (zoneId: string, index: number) => void;
    onTranslate: (zoneId: string, deltaLatitude: number, deltaLongitude: number) => void;
  };
}

export function useZoneEditor({ zones, setZones, reset }: Pick<EditableZonesState, 'zones' | 'setZones' | 'reset'>): ZoneEditor {
  const [state, setState] = useState<ZoneEditorState>({ mode: 'browse' });

  const handleMapClick = useCallback((point: GeoPoint) => {
    setState((current) => (current.mode === 'draw' ? { mode: 'draw', points: [...current.points, point] } : current));
  }, []);

  const handleZoneClick = useCallback((zoneId: string) => {
    setState((current) => (current.mode !== 'draw' ? { mode: 'edit', zoneId } : current));
  }, []);

  const actions = useMemo<ZoneEditorActions>(() => ({
    select: (zoneId) => setState({ mode: 'edit', zoneId }),
    backToList: () => setState({ mode: 'browse' }),
    startDrawing: () => setState({ mode: 'draw', points: [] }),
    undoPoint: () => setState((current) => (current.mode === 'draw' ? { mode: 'draw', points: current.points.slice(0, -1) } : current)),
    cancelDrawing: () => setState({ mode: 'browse' }),
    finishDrawing: (name) => {
      if (state.mode !== 'draw' || state.points.length < 3) return;
      const id = crypto.randomUUID();
      setZones((current) => createZone(current, state.points, name, id));
      setState({ mode: 'edit', zoneId: id });
    },
    rename: (zoneId, name) => setZones((current) => renameZone(current, zoneId, name)),
    recolor: (zoneId, color) => setZones((current) => recolorZone(current, zoneId, color)),
    remove: (zoneId) => {
      setZones((current) => deleteZone(current, zoneId));
      setState({ mode: 'browse' });
    },
    importZones: (json) => {
      let parsed: CampusZone[] | null = null;
      try {
        parsed = parseZones(JSON.parse(json));
      } catch {
        parsed = null;
      }
      if (!parsed) return false;
      setZones(parsed);
      setState({ mode: 'browse' });
      return true;
    },
    exportZones: () => serializeZones(zones),
    reset: () => {
      void reset();
      setState({ mode: 'browse' });
    },
  }), [state, zones, setZones, reset]);

  const layer = useMemo<ZoneEditor['layer']>(() => ({
    onMoveVertex: (zoneId, index, point) => setZones((current) => moveVertex(current, zoneId, index, point)),
    onInsertVertex: (zoneId, afterIndex) => setZones((current) => insertVertex(current, zoneId, afterIndex)),
    onRemoveVertex: (zoneId, index) => setZones((current) => removeVertex(current, zoneId, index)),
    onTranslate: (zoneId, deltaLatitude, deltaLongitude) => setZones((current) => translateZone(current, zoneId, deltaLatitude, deltaLongitude)),
  }), [setZones]);

  return { state, actions, handleMapClick, handleZoneClick, layer };
}
