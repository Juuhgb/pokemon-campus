import { describe, expect, it } from 'vitest';
import type { PlayerEvent } from '../features/player/playerEvents.js';
import type { ConnectionPort, ConnectionState } from './connection.js';
import { createMemoryEventStore, newStoredEvent } from './eventStore.js';
import { RemoteError, type PlayerRemote } from './playerRemote.js';
import { Synchronizer } from './synchronizer.js';

const event = (id: string, at: number): PlayerEvent => ({ id, deviceId: 'dev-1', at, action: { type: 'useBall', item: 'POKE_BALL' } });

/** Servidor falso: guarda eventos e recusa regravar um que já existe (como as regras do Firestore). */
function fakeServer() {
  const saved = new Map<string, PlayerEvent>();
  let failure: RemoteError | null = null;
  let rejectAll = false;
  const calls: string[] = [];
  const remote: PlayerRemote = {
    heartbeat: async () => {},
    async sendEvent(_uid, e) {
      calls.push(e.id);
      if (failure) throw failure;
      if (rejectAll || saved.has(e.id)) throw new RemoteError('permission-denied');
      saved.set(e.id, e);
    },
    eventExists: async (_uid, id) => saved.has(id),
    downloadEvents: async () => [...saved.values()],
    watchEvents: () => () => {},
    publishRanking: async () => {},
    downloadRanking: async () => [],
  };
  return {
    remote,
    saved,
    calls,
    fail: (code: RemoteError['code'] | null) => { failure = code ? new RemoteError(code) : null; },
    rejectAll: () => { rejectAll = true; },
  };
}

function fakeConnection(initial: ConnectionState = 'online') {
  const port: ConnectionPort & { current: ConnectionState } = {
    current: initial,
    state: () => port.current,
    markServerUnavailable: () => { port.current = 'server-unavailable'; },
    markServerResponding: () => { port.current = 'online'; },
  };
  return port;
}

function setup(events: PlayerEvent[] = [event('e1', 1), event('e2', 2)], uid: string | null = 'u1') {
  const store = createMemoryEventStore(events.map((e) => newStoredEvent(e)));
  const server = fakeServer();
  const connection = fakeConnection();
  let now = 1_000;
  const sync = new Synchronizer(store, server.remote, connection, () => uid, () => now, () => 0.5);
  return { store, server, connection, sync, advance: (ms: number) => { now += ms; } };
}

describe('Synchronizer', () => {
  it('envia a fila em ordem e só tira da fila depois da confirmação', async () => {
    const { store, server, sync } = setup();
    await sync.synchronize();
    sync.stop();
    expect(server.calls).toEqual(['e1', 'e2']);
    expect([...store.rows.values()].map((e) => e.status)).toEqual(['confirmed', 'confirmed']);
  });

  it('sem conta Google não envia nada (o progresso fica no aparelho)', async () => {
    const { server, sync, store } = setup(undefined, null);
    await sync.synchronize();
    sync.stop();
    expect(server.calls).toEqual([]);
    expect((await store.outbox()).length).toBe(2);
  });

  it('sem rede não tenta enviar', async () => {
    const { server, sync, connection } = setup();
    connection.current = 'offline';
    await sync.synchronize();
    sync.stop();
    expect(server.calls).toEqual([]);
  });

  it('servidor fora: o evento volta a pendente com backoff, o estado vira "servidor fora" e depois é enviado', async () => {
    const { store, server, sync, connection, advance } = setup();
    server.fail('unavailable');
    await sync.synchronize();
    expect(connection.current).toBe('server-unavailable');
    expect(server.calls).toEqual(['e1']); // parou no primeiro: não adianta tentar os outros agora
    const e1 = store.rows.get('e1')!;
    expect(e1).toMatchObject({ status: 'pending', attempts: 1 });
    expect(e1.nextAttemptAt).toBeGreaterThan(1_000);

    server.fail(null);
    await sync.synchronize(); // e1 ainda está no backoff; e2 não esperava nada e sai
    expect(server.calls).toEqual(['e1', 'e2']);
    expect(store.rows.get('e1')!.status).toBe('pending');
    advance(10_000);
    await sync.synchronize();
    sync.stop();
    expect(connection.current).toBe('online');
    expect(server.saved.size).toBe(2);
  });

  it('timeout no meio do envio não perde o evento', async () => {
    const { store, server, sync } = setup([event('e1', 1)]);
    server.fail('timeout');
    await sync.synchronize();
    sync.stop();
    expect(store.rows.get('e1')).toMatchObject({ status: 'pending', error: 'timeout' });
  });

  it('reenvio do que já chegou (resposta perdida): confirma sem duplicar', async () => {
    const { store, server, sync } = setup([event('e1', 1)]);
    server.saved.set('e1', event('e1', 1)); // chegou no servidor, mas a confirmação se perdeu
    await sync.synchronize();
    sync.stop();
    expect(store.rows.get('e1')!.status).toBe('confirmed');
    expect(server.saved.size).toBe(1);
  });

  it('reenviar de propósito um evento confirmado é ignorado pelo servidor', async () => {
    const { server, sync } = setup([event('e1', 1)]);
    await sync.synchronize();
    expect(await sync.resend(event('e1', 1))).toBe('duplicate-ignored');
    sync.stop();
    expect(server.saved.size).toBe(1);
  });

  it('recusa definitiva: marca como rejeitado e não tenta de novo', async () => {
    const { store, server, sync } = setup([event('e1', 1)]);
    server.rejectAll();
    await sync.synchronize();
    await sync.synchronize();
    sync.stop();
    expect(store.rows.get('e1')!.status).toBe('rejected');
    expect(server.calls).toEqual(['e1']);
  });

  it('app fechado no meio do envio: "sending" volta a pendente ao abrir', async () => {
    const store = createMemoryEventStore([{ ...newStoredEvent(event('e1', 1)), status: 'sending' }]);
    const sync = new Synchronizer(store, fakeServer().remote, fakeConnection(), () => 'u1');
    expect(await sync.recoverOnOpen()).toBe(1);
    expect(store.rows.get('e1')!.status).toBe('pending');
  });

  it('eventos de outro aparelho entram como confirmados e confirmam os locais de mesmo id', async () => {
    const store = createMemoryEventStore([newStoredEvent(event('e1', 1))]);
    await store.mergeConfirmed([event('e1', 1), event('x9', 5)]);
    expect([...store.rows.values()].map((e) => [e.id, e.status])).toEqual([['e1', 'confirmed'], ['x9', 'confirmed']]);
  });
});
