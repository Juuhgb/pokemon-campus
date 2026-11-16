import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ConnectionMonitor, type ConnectionState } from '../../sync/connection.js';
import { dexieEventStore, newStoredEvent, type StoredEvent } from '../../sync/eventStore.js';
import { firestoreRemote } from '../../sync/firestoreRemote.js';
import { withSimulatedOutage, withTimeout, type PlayerRemote, type RankingEntry } from '../../sync/playerRemote.js';
import { Synchronizer } from '../../sync/synchronizer.js';
import {
  foldPlayerEvents,
  isSyncedAction,
  lastProfileEventId,
  legacyImportEvent,
  type PlayerEvent,
  type ResolvedConflict,
} from './playerEvents.js';
import { INITIAL_PLAYER, parseStoredPlayer, playerReducer, type PlayerAction, type PlayerState } from './playerState.js';

/** Cópia do último estado calculado: abre o jogo na hora, antes de o IndexedDB responder. */
const CACHE_KEY = 'pokemon-campus:player:v1';
const IDENTITY_KEY = 'pokemon-campus:identity:v1';
const DEVICE_KEY = 'pokemon-campus:device-id';
const EVENTS_READY_KEY = 'pokemon-campus:events-ready';
/** Conta Google dona do progresso guardado neste aparelho (vazio = jogado sem conta). */
const OWNER_KEY = 'pokemon-campus:progress-owner';
const RANKING_KEY = 'pokemon-campus:ranking-cache';

interface Identity {
  googleEmail: string | null;
  googleUid: string | null;
  googleName: string | null;
}

interface PlayerContextValue {
  player: PlayerState;
  dispatch: (action: PlayerAction) => void;
}

export interface SyncStatus {
  /** false nos testes e quando o jogo roda sem o módulo de sincronização. */
  enabled: boolean;
  connection: ConnectionState;
  signedIn: boolean;
  pending: number;
  rejected: number;
  conflicts: ResolvedConflict[];
  lastSyncAt: number | null;
  simulatedOutage: boolean;
  setSimulatedOutage: (value: boolean) => void;
  syncNow: () => Promise<void>;
  /** Teste de "operação transmitida mais de uma vez". Devolve a mensagem para a tela. */
  resendLast: () => Promise<string>;
  /** Baixa o progresso da conta (outro aparelho). */
  restore: (uid?: string) => Promise<void>;
  ranking: RankingEntry[] | null;
  refreshRanking: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const noop = async () => {};
const DISABLED_SYNC: SyncStatus = {
  enabled: false,
  connection: 'online',
  signedIn: false,
  pending: 0,
  rejected: 0,
  conflicts: [],
  lastSyncAt: null,
  simulatedOutage: false,
  setSimulatedOutage: () => {},
  syncNow: noop,
  resendLast: async () => 'Sincronização desligada.',
  restore: noop,
  ranking: null,
  refreshRanking: noop,
};
const SyncContext = createContext<SyncStatus>(DISABLED_SYNC);

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Armazenamento indisponível (aba privada): segue só na memória.
  }
}

function loadCachedPlayer(): PlayerState {
  try {
    return parseStoredPlayer(window.localStorage.getItem(CACHE_KEY));
  } catch {
    return INITIAL_PLAYER;
  }
}

function loadIdentity(cached: PlayerState): Identity {
  const saved = readJson<Identity>(IDENTITY_KEY);
  if (saved) return { googleEmail: saved.googleEmail ?? null, googleUid: saved.googleUid ?? null, googleName: saved.googleName ?? null };
  return { googleEmail: cached.googleEmail, googleUid: cached.googleUid ?? null, googleName: null };
}

function loadDeviceId(): string {
  try {
    const saved = window.localStorage.getItem(DEVICE_KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function withIdentity(player: PlayerState, identity: Identity): PlayerState {
  // Nome da conta Google enquanto o jogador não escolheu um (não vira evento: é só exibição).
  const displayName = player.displayName === INITIAL_PLAYER.displayName && identity.googleName ? identity.googleName : player.displayName;
  return { ...player, displayName, googleEmail: identity.googleEmail, googleUid: identity.googleUid };
}

/**
 * O progresso guardado no aparelho continua quando entra a mesma conta que o criou.
 * Qualquer outra conta (ou progresso feito sem conta) começa do zero, com o que a conta
 * dela tem no servidor: ninguém herda os pontos de outro jogador.
 */
export function keepsLocalProgress(ownerUid: string | null, signingInUid: string): boolean {
  return ownerUid === signingInUid;
}

/** Junta os eventos já gravados com os que acabaram de acontecer (ainda a caminho do IndexedDB). */
function mergeEvents(stored: readonly StoredEvent[], fresh: readonly StoredEvent[]): StoredEvent[] {
  const ids = new Set(stored.map((event) => event.id));
  return [...stored, ...fresh.filter((event) => !ids.has(event.id))];
}

/**
 * Estado do jogador = eventos guardados no aparelho, recalculados (playerEvents.ts).
 * Com `initial` (testes), roda só na memória, sem IndexedDB nem servidor.
 */
export function PlayerProvider({ children, initial }: { children: ReactNode; initial?: PlayerState }) {
  if (initial) return <MemoryPlayerProvider initial={initial}>{children}</MemoryPlayerProvider>;
  return <SyncedPlayerProvider>{children}</SyncedPlayerProvider>;
}

function MemoryPlayerProvider({ children, initial }: { children: ReactNode; initial: PlayerState }) {
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const player = useMemo(() => foldPlayerEvents(initial, events).player, [initial, events]);
  const playerRef = useRef(player);
  playerRef.current = player;
  const dispatch = useCallback((action: PlayerAction) => {
    if (!isSyncedAction(action)) return;
    if (playerReducer(playerRef.current, action) === playerRef.current) return;
    const event = newStoredEvent({ id: crypto.randomUUID(), deviceId: 'test', at: Date.now(), action });
    setEvents((current) => [...current, event]);
  }, []);
  return <PlayerContext.Provider value={{ player, dispatch }}>{children}</PlayerContext.Provider>;
}

interface Engine {
  remote: PlayerRemote;
  monitor: ConnectionMonitor;
  synchronizer: Synchronizer;
}

function SyncedPlayerProvider({ children }: { children: ReactNode }) {
  const [cached] = useState(loadCachedPlayer);
  const [identity, setIdentity] = useState(() => loadIdentity(cached));
  const [deviceId] = useState(loadDeviceId);
  const [fresh, setFresh] = useState<StoredEvent[]>([]);
  const [connection, setConnection] = useState<ConnectionState>(() => (navigator.onLine ? 'online' : 'offline'));
  const [simulatedOutage, setSimulatedOutageState] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[] | null>(() => readJson<RankingEntry[]>(RANKING_KEY));
  const storedEvents = useLiveQuery(() => dexieEventStore.all(), []);
  const engineRef = useRef<Engine | null>(null);
  const outageRef = useRef(false);
  const uidRef = useRef(identity.googleUid);
  uidRef.current = identity.googleUid;

  // Progresso salvo pela versão antiga (antes dos eventos): vira um evento de importação, uma vez.
  useEffect(() => {
    if (!storedEvents || readJson<string>(EVENTS_READY_KEY) === '1') return;
    writeJson(EVENTS_READY_KEY, '1');
    if (storedEvents.length > 0) return;
    const oldest = Math.min(...cached.creatures.map((creature) => Date.parse(creature.caughtAt)).filter(Number.isFinite), Date.now());
    const legacy = legacyImportEvent(cached, deviceId, oldest, crypto.randomUUID());
    if (legacy) {
      setFresh((current) => [...current, newStoredEvent(legacy)]);
      void dexieEventStore.add(legacy);
    }
  }, [storedEvents, cached, deviceId]);

  const events = useMemo(() => mergeEvents(storedEvents ?? [], fresh), [storedEvents, fresh]);
  const usable = useMemo(() => events.filter((event) => event.status !== 'rejected'), [events]);
  const folded = useMemo(() => foldPlayerEvents(INITIAL_PLAYER, usable), [usable]);
  const loaded = storedEvents !== undefined;
  const player = useMemo(() => withIdentity(loaded ? folded.player : cached, identity), [loaded, folded.player, cached, identity]);
  const playerRef = useRef(player);
  playerRef.current = player;
  const eventsRef = useRef(events);
  eventsRef.current = events;

  // Limpa da memória o que o IndexedDB já devolveu.
  useEffect(() => {
    if (!storedEvents || fresh.length === 0) return;
    const ids = new Set(storedEvents.map((event) => event.id));
    if (fresh.some((event) => ids.has(event.id))) setFresh((current) => current.filter((event) => !ids.has(event.id)));
  }, [storedEvents, fresh]);

  useEffect(() => {
    if (loaded) writeJson(CACHE_KEY, player);
  }, [loaded, player]);

  useEffect(() => writeJson(IDENTITY_KEY, identity), [identity]);

  // Aparelhos de antes desta regra: o progresso guardado é da conta que já está vinculada.
  useEffect(() => {
    if (identity.googleUid && readJson<string>(OWNER_KEY) === null) writeJson(OWNER_KEY, identity.googleUid);
  }, [identity.googleUid]);

  // Módulo de sincronização: monitor de conexão + fila de saída.
  useEffect(() => {
    const remote = withSimulatedOutage(firestoreRemote, () => outageRef.current);
    const monitor = new ConnectionMonitor(() => remote.heartbeat());
    const synchronizer = new Synchronizer(dexieEventStore, remote, monitor, () => uidRef.current);
    engineRef.current = { remote, monitor, synchronizer };

    const cleanups = [
      monitor.subscribe(setConnection),
      monitor.onReconnect(() => void synchronizer.onReconnect()),
      synchronizer.onChange(() => setLastSyncAt(synchronizer.lastSyncAt)),
    ];
    const onVisible = () => {
      if (document.visibilityState === 'visible') void synchronizer.synchronize();
    };
    document.addEventListener('visibilitychange', onVisible);
    monitor.start();
    void synchronizer.recoverOnOpen().then(() => synchronizer.synchronize());

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      document.removeEventListener('visibilitychange', onVisible);
      monitor.stop();
      synchronizer.stop();
      engineRef.current = null;
    };
  }, []);

  // Recebimento: eventos da conta vindos de outros aparelhos entram como confirmados.
  const uid = identity.googleUid;
  useEffect(() => {
    const engine = engineRef.current;
    if (!uid || !engine) return;
    void engine.synchronizer.synchronize();
    return engine.remote.watchEvents(
      uid,
      (remoteEvents) => {
        engine.monitor.markServerResponding();
        void dexieEventStore.mergeConfirmed(remoteEvents);
      },
      () => {},
    );
  }, [uid]);

  // Ranking: publica a pontuação quando ela muda e há servidor.
  const { score, captures, displayName, course } = player;
  useEffect(() => {
    const engine = engineRef.current;
    if (!uid || !engine || !loaded || connection !== 'online' || !player.onboarded) return;
    const timer = setTimeout(() => {
      void engine.remote.publishRanking(uid, { displayName, course, score, captures }).catch(() => {});
    }, 1_500);
    return () => clearTimeout(timer);
  }, [uid, loaded, connection, player.onboarded, displayName, course, score, captures]);

  const dispatch = useCallback((action: PlayerAction) => {
    switch (action.type) {
      case 'linkGoogle': {
        const uid = action.uid ?? null;
        // Outra conta entrando neste aparelho: começa do zero e baixa só o progresso dela.
        // O progresso da conta anterior continua salvo no servidor, na conta dela.
        if (uid && !keepsLocalProgress(readJson<string>(OWNER_KEY), uid)) {
          setFresh([]);
          writeJson(CACHE_KEY, null);
          void dexieEventStore.clear();
        }
        if (uid) writeJson(OWNER_KEY, uid);
        setIdentity({ googleEmail: action.email, googleUid: uid, googleName: action.displayName?.trim() || null });
        return;
      }
      case 'unlinkGoogle':
        setIdentity({ googleEmail: null, googleUid: null, googleName: null });
        return;
      case 'reset':
        // Apaga só este aparelho: o progresso sincronizado continua no servidor.
        setIdentity({ googleEmail: null, googleUid: null, googleName: null });
        setFresh([]);
        writeJson(CACHE_KEY, null);
        writeJson(OWNER_KEY, null);
        void dexieEventStore.clear();
        return;
      default: {
        if (!isSyncedAction(action)) return;
        if (playerReducer(playerRef.current, action) === playerRef.current) return; // jogada sem efeito
        const event: PlayerEvent = { id: crypto.randomUUID(), deviceId, at: Date.now(), action };
        if (action.type === 'updateProfile') event.basis = lastProfileEventId(eventsRef.current);
        // Grava no aparelho primeiro; o envio acontece em seguida (ou quando a conexão voltar).
        setFresh((current) => [...current, newStoredEvent(event)]);
        void dexieEventStore.add(event).then(() => engineRef.current?.synchronizer.synchronize());
      }
    }
  }, [deviceId]);

  const setSimulatedOutage = useCallback((value: boolean) => {
    outageRef.current = value;
    setSimulatedOutageState(value);
    void engineRef.current?.monitor.heartbeat();
  }, []);

  const syncNow = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    const state = await engine.monitor.heartbeat();
    if (state !== 'offline') await engine.synchronizer.onReconnect();
  }, []);

  const resendLast = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return 'Sincronização indisponível.';
    const last = [...eventsRef.current].filter((event) => event.status === 'confirmed').sort((a, b) => b.at - a.at)[0];
    if (!last) return 'Nenhuma jogada confirmada pelo servidor ainda.';
    try {
      const result = await engine.synchronizer.resend(last);
      return result === 'duplicate-ignored'
        ? 'Reenviado: o servidor já tinha essa jogada e manteve a original. Nada mudou no progresso.'
        : 'Reenviado e aceito (a jogada ainda não estava no servidor).';
    } catch (error) {
      return `Não foi possível reenviar: ${error instanceof Error ? error.message : String(error)}`;
    }
  }, []);

  const restore = useCallback(async (forUid?: string) => {
    const engine = engineRef.current;
    const current = forUid ?? uidRef.current;
    if (!engine || !current) return;
    try {
      const remoteEvents = await withTimeout(8_000, engine.remote.downloadEvents(current));
      setFresh((existing) => mergeEvents(existing, remoteEvents.map((event) => newStoredEvent(event, 'confirmed'))));
      await dexieEventStore.mergeConfirmed(remoteEvents);
      engine.monitor.markServerResponding();
    } catch {
      // Sem servidor agora: o jogo segue com o que há no aparelho e o listener traz o resto depois.
    }
  }, []);

  const refreshRanking = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      const rows = await withTimeout(8_000, engine.remote.downloadRanking());
      setRanking(rows);
      writeJson(RANKING_KEY, rows);
    } catch {
      // Mantém o último ranking baixado.
    }
  }, []);

  const sync = useMemo<SyncStatus>(() => ({
    enabled: true,
    connection,
    signedIn: Boolean(uid),
    pending: events.filter((event) => event.status === 'pending' || event.status === 'sending').length,
    rejected: events.filter((event) => event.status === 'rejected').length,
    conflicts: folded.conflicts,
    lastSyncAt,
    simulatedOutage,
    setSimulatedOutage,
    syncNow,
    resendLast,
    restore,
    ranking,
    refreshRanking,
  }), [connection, uid, events, folded.conflicts, lastSyncAt, simulatedOutage, setSimulatedOutage, syncNow, resendLast, restore, ranking, refreshRanking]);

  return (
    <PlayerContext.Provider value={{ player, dispatch }}>
      <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer precisa estar dentro de <PlayerProvider>.');
  return value;
}

export function useSync(): SyncStatus {
  return useContext(SyncContext);
}
