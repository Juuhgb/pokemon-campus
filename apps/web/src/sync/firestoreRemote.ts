import type { Firestore, QuerySnapshot } from 'firebase/firestore';
import type { EventAction, PlayerEvent } from '../features/player/playerEvents.js';
import { getFirebaseApp, getFirebaseAuth } from '../features/auth/googleAuth.js';
import { RemoteError, type PlayerRemote, type RankingEntry } from './playerRemote.js';

/**
 * Servidor remoto: Cloud Firestore (projeto pokecampus-uenp).
 *
 *   config/jogo                   documento lido pelo heartbeat
 *   jogadores/{uid}/eventos/{id}  eventos do jogador (só criação; imutáveis)
 *   ranking/{uid}                 pontuação atual (derivada dos eventos)
 *
 * O SDK roda com cache só em memória: o armazenamento persistente e a fila de envio são
 * nossos (IndexedDB), para que armazenamento e sincronização sejam visíveis e demonstráveis.
 * As regras de validação ficam em firestore.rules.
 */

type FirestoreModule = typeof import('firebase/firestore');

let firestorePromise: Promise<{ fs: Firestore; sdk: FirestoreModule }> | null = null;

/** Firestore compartilhado (eventos do jogador, mundo publicado pelo admin). */
export function getFirestore(): Promise<{ fs: Firestore; sdk: FirestoreModule }> {
  firestorePromise ??= Promise.all([getFirebaseApp(), import('firebase/firestore')]).then(([app, sdk]) => ({
    fs: sdk.initializeFirestore(app, { localCache: sdk.memoryLocalCache() }),
    sdk,
  }));
  return firestorePromise;
}

export function translate(error: unknown): RemoteError {
  if (error instanceof RemoteError) return error;
  const code = (error as { code?: string } | null)?.code ?? '';
  const message = error instanceof Error ? error.message : String(error);
  switch (code) {
    case 'permission-denied':
      return new RemoteError('permission-denied', message);
    case 'unauthenticated':
      return new RemoteError('unauthenticated', message);
    case 'unavailable':
      return new RemoteError('unavailable', message);
    case 'deadline-exceeded':
      return new RemoteError('timeout', message);
    default:
      return new RemoteError('other', message);
  }
}

async function call<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw translate(error);
  }
}

/** O Firestore exige o usuário logado com o mesmo UID do caminho. */
async function requireUser(uid: string): Promise<void> {
  const auth = await getFirebaseAuth();
  await auth.authStateReady();
  if (auth.currentUser?.uid !== uid) throw new RemoteError('unauthenticated', 'Login do Google ainda não está ativo neste aparelho.');
}

/** Firestore não aceita `undefined`: o JSON tira esses campos. */
function plain(event: PlayerEvent): Record<string, unknown> {
  return JSON.parse(JSON.stringify(event)) as Record<string, unknown>;
}

function toEvent(id: string, data: Record<string, unknown>): PlayerEvent | null {
  if (typeof data.deviceId !== 'string' || typeof data.at !== 'number' || typeof data.action !== 'object' || data.action === null) return null;
  const event: PlayerEvent = { id, deviceId: data.deviceId, at: data.at, action: data.action as EventAction };
  if (typeof data.basis === 'string' || data.basis === null) event.basis = data.basis;
  return event;
}

function eventsFrom(snapshot: QuerySnapshot): PlayerEvent[] {
  return snapshot.docs.map((doc) => toEvent(doc.id, doc.data())).filter((event) => event !== null);
}

export const firestoreRemote: PlayerRemote = {
  async heartbeat() {
    const { fs, sdk } = await getFirestore();
    try {
      await sdk.getDocFromServer(sdk.doc(fs, 'config', 'jogo'));
    } catch (error) {
      // Uma recusa das regras (ex.: antes do login) também prova que o servidor respondeu.
      if (translate(error).code === 'permission-denied') return;
      throw translate(error);
    }
  },

  async sendEvent(uid, event) {
    await requireUser(uid);
    const { fs, sdk } = await getFirestore();
    await call(() => sdk.setDoc(sdk.doc(fs, 'jogadores', uid, 'eventos', event.id), { ...plain(event), recebidoEm: sdk.serverTimestamp() }));
  },

  async eventExists(uid, eventId) {
    await requireUser(uid);
    const { fs, sdk } = await getFirestore();
    const snapshot = await call(() => sdk.getDocFromServer(sdk.doc(fs, 'jogadores', uid, 'eventos', eventId)));
    return snapshot.exists();
  },

  async downloadEvents(uid) {
    await requireUser(uid);
    const { fs, sdk } = await getFirestore();
    const snapshot = await call(() => sdk.getDocsFromServer(sdk.collection(fs, 'jogadores', uid, 'eventos')));
    return eventsFrom(snapshot);
  },

  watchEvents(uid, onEvents, onError) {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      try {
        await requireUser(uid);
        const { fs, sdk } = await getFirestore();
        if (cancelled) return;
        unsubscribe = sdk.onSnapshot(
          sdk.collection(fs, 'jogadores', uid, 'eventos'),
          (snapshot) => {
            // O cache em memória vazio (app aberto offline) não é o estado do servidor.
            if (snapshot.metadata.fromCache && snapshot.empty) return;
            onEvents(eventsFrom(snapshot));
          },
          (error) => onError(translate(error)),
        );
      } catch (error) {
        onError(translate(error));
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  },

  async publishRanking(uid, entry) {
    await requireUser(uid);
    const { fs, sdk } = await getFirestore();
    await call(() => sdk.setDoc(sdk.doc(fs, 'ranking', uid), { ...entry, atualizadoEm: sdk.serverTimestamp() }));
  },

  async downloadRanking() {
    const { fs, sdk } = await getFirestore();
    const snapshot = await call(() =>
      sdk.getDocsFromServer(sdk.query(sdk.collection(fs, 'ranking'), sdk.orderBy('score', 'desc'), sdk.limit(50))),
    );
    return snapshot.docs.map((doc): RankingEntry => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: typeof data.displayName === 'string' ? data.displayName : 'Jogador',
        course: typeof data.course === 'string' ? data.course : '',
        score: typeof data.score === 'number' ? data.score : 0,
        captures: typeof data.captures === 'number' ? data.captures : 0,
      };
    });
  },
};
