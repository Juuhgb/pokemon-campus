import { getFirebaseAuth } from '../../auth/googleAuth.js';
import { getFirestore, translate } from '../../../sync/firestoreRemote.js';
import { RemoteError, withTimeout } from '../../../sync/playerRemote.js';
import type { CampusZone, ExplorationSpawn } from '../types.js';
import { parseZones } from '../utils/zoneEdits.js';
import { indexedDbWorldCache, parseSpawns, type WorldCache, type WorldPublisher } from './world.js';

/**
 * Firestore:
 *   mundo/zonas    { version: 1, zones: [...], atualizadoEm, atualizadoPor }
 *   mundo/pokemon  { spawns: [...], atualizadoEm, atualizadoPor }
 *   admins/{uid}   existe = é admin (criado à mão no Console do Firebase)
 * Leitura pública; escrita só para admins (firestore.rules).
 */

const TIMEOUT_MS = 8_000;

/** Firestore não aceita `undefined`: o JSON tira esses campos. */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

async function adminUid(): Promise<string> {
  const auth = await getFirebaseAuth();
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new RemoteError('unauthenticated');
  return uid;
}

async function write(docId: 'zonas' | 'pokemon', data: Record<string, unknown>): Promise<void> {
  const uid = await adminUid();
  const { fs, sdk } = await getFirestore();
  try {
    await withTimeout(TIMEOUT_MS, sdk.setDoc(sdk.doc(fs, 'mundo', docId), { ...data, atualizadoEm: sdk.serverTimestamp(), atualizadoPor: uid }));
  } catch (error) {
    throw translate(error);
  }
}

export const firestoreWorldPublisher: WorldPublisher = {
  async fetch() {
    const { fs, sdk } = await getFirestore();
    try {
      const [zones, pokemon] = await withTimeout(TIMEOUT_MS, Promise.all([
        sdk.getDocFromServer(sdk.doc(fs, 'mundo', 'zonas')),
        sdk.getDocFromServer(sdk.doc(fs, 'mundo', 'pokemon')),
      ]));
      return {
        zones: zones.exists() ? parseZones(zones.data()) : null,
        spawns: pokemon.exists() ? parseSpawns(pokemon.get('spawns')) : null,
      };
    } catch (error) {
      throw translate(error);
    }
  },
  publishZones: (zones: CampusZone[]) => write('zonas', { version: 1, zones: plain(zones) }),
  publishSpawns: (spawns: ExplorationSpawn[]) => write('pokemon', { spawns: plain(spawns) }),
};

/** A conta logada é admin? (documento admins/{uid}). */
export async function checkAdmin(): Promise<{ uid: string; email: string | null; isAdmin: boolean } | null> {
  const auth = await getFirebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  const { fs, sdk } = await getFirestore();
  try {
    const snapshot = await withTimeout(TIMEOUT_MS, sdk.getDocFromServer(sdk.doc(fs, 'admins', user.uid)));
    return { uid: user.uid, email: user.email, isAdmin: snapshot.exists() };
  } catch {
    return { uid: user.uid, email: user.email, isAdmin: false };
  }
}

/**
 * Escuta o mundo publicado e guarda cada versão no aparelho. `onChange` avisa a tela para
 * recarregar zonas e Pokémon. Funciona sem login (leitura pública).
 */
export function watchWorld(onChange: () => void, cache: WorldCache = indexedDbWorldCache): () => void {
  const unsubscribes: (() => void)[] = [];
  let cancelled = false;
  void (async () => {
    try {
      const { fs, sdk } = await getFirestore();
      if (cancelled) return;
      unsubscribes.push(
        sdk.onSnapshot(sdk.doc(fs, 'mundo', 'zonas'), (snapshot) => {
          if (snapshot.metadata.fromCache || !snapshot.exists()) return;
          const zones = parseZones(snapshot.data());
          if (zones) void cache.writeZones(zones).then(onChange);
        }, () => {}),
        sdk.onSnapshot(sdk.doc(fs, 'mundo', 'pokemon'), (snapshot) => {
          if (snapshot.metadata.fromCache || !snapshot.exists()) return;
          const spawns = parseSpawns(snapshot.get('spawns'));
          if (spawns) void cache.writeSpawns(spawns).then(onChange);
        }, () => {}),
      );
    } catch {
      // Sem Firestore agora: o jogo segue com a última versão guardada.
    }
  })();
  return () => {
    cancelled = true;
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}
