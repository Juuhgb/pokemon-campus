import type { PlayerEvent } from '../features/player/playerEvents.js';

/**
 * Tudo o que a sincronização precisa do servidor. A implementação real fica em
 * firestoreRemote.ts; os testes usam uma falsa. As telas nunca chamam isto direto.
 */
export type RemoteErrorCode = 'permission-denied' | 'unauthenticated' | 'unavailable' | 'timeout' | 'other';

export class RemoteError extends Error {
  constructor(public readonly code: RemoteErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'RemoteError';
  }
}

export interface RankingEntry {
  uid: string;
  displayName: string;
  course: string;
  score: number;
  captures: number;
}

export type Unsubscribe = () => void;

export interface PlayerRemote {
  /** Confirma que o servidor responde. Lança se não responder. */
  heartbeat(): Promise<void>;
  /** Grava um evento (criação atômica). Reenviar um evento que já está lá é recusado pelo servidor. */
  sendEvent(uid: string, event: PlayerEvent): Promise<void>;
  /** Para distinguir "reenvio do que já chegou" de "recusa definitiva". */
  eventExists(uid: string, eventId: string): Promise<boolean>;
  /** Todos os eventos da conta (recuperar o progresso em outro aparelho). */
  downloadEvents(uid: string): Promise<PlayerEvent[]>;
  /** Escuta eventos novos da conta (vindos de outros aparelhos). */
  watchEvents(uid: string, onEvents: (events: PlayerEvent[]) => void, onError: (error: unknown) => void): Unsubscribe;
  /** Publica a pontuação atual no ranking (valor derivado: pode ser sobrescrito). */
  publishRanking(uid: string, entry: Omit<RankingEntry, 'uid'>): Promise<void>;
  downloadRanking(): Promise<RankingEntry[]>;
}

export function withTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new RemoteError('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * Embrulho para a demonstração "servidor fora do ar": com a chave ligada, toda chamada
 * falha como se o servidor não respondesse (a rede do aparelho continua funcionando).
 */
export function withSimulatedOutage(remote: PlayerRemote, isDown: () => boolean): PlayerRemote {
  const guard = <T>(call: () => Promise<T>): Promise<T> =>
    isDown() ? Promise.reject(new RemoteError('unavailable', 'Servidor fora do ar (simulado)')) : call();
  return {
    heartbeat: () => guard(() => remote.heartbeat()),
    sendEvent: (uid, event) => guard(() => remote.sendEvent(uid, event)),
    eventExists: (uid, id) => guard(() => remote.eventExists(uid, id)),
    downloadEvents: (uid) => guard(() => remote.downloadEvents(uid)),
    watchEvents: (uid, onEvents, onError) => remote.watchEvents(uid, (events) => { if (!isDown()) onEvents(events); }, onError),
    publishRanking: (uid, entry) => guard(() => remote.publishRanking(uid, entry)),
    downloadRanking: () => guard(() => remote.downloadRanking()),
  };
}
