import type { PlayerEvent } from '../features/player/playerEvents.js';
import { retryDelayMs } from './backoff.js';
import type { ConnectionPort } from './connection.js';
import type { EventStore, StoredEvent } from './eventStore.js';
import { RemoteError, withTimeout, type PlayerRemote } from './playerRemote.js';

export const SEND_TIMEOUT_MS = 8_000;

/**
 * Envia a fila de saída evento por evento.
 *
 * - Cada evento só sai da fila depois que o servidor confirma (nada se perde no caminho).
 * - Falha de rede/timeout: volta a "pending" com espera exponencial (2 s → 60 s, com jitter).
 * - Reenvio do que já chegou: o servidor recusa a regravação; conferimos que o evento está lá
 *   e só então o marcamos como confirmado (idempotência pela chave do evento).
 * - Recusa definitiva (o evento não está lá e o servidor não aceita): "rejected", sem novas tentativas.
 */
export class Synchronizer {
  private running = false;
  private requestedWhileRunning = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private listeners = new Set<() => void>();
  lastSyncAt: number | null = null;

  constructor(
    private readonly store: EventStore,
    private readonly remote: PlayerRemote,
    private readonly connection: ConnectionPort,
    private readonly currentUid: () => string | null,
    private readonly now: () => number = Date.now,
    private readonly random: () => number = Math.random,
    private readonly timeoutMs = SEND_TIMEOUT_MS,
  ) {}

  /** Avisado a cada mudança de status na fila (para a tela atualizar). */
  onChange(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /** Ao abrir o app: o que ficou "sending" (app fechou no meio do envio) volta a pendente. */
  recoverOnOpen(): Promise<number> {
    return this.store.resetSending();
  }

  /** Gatilhos: rede voltou, app voltou ao primeiro plano, heartbeat ok, backoff, nova jogada. */
  async synchronize(): Promise<void> {
    if (this.stopped || !this.currentUid()) return;
    // Com o servidor fora ainda tentamos no ritmo do backoff: um envio que dá certo
    // é a forma mais rápida de perceber que ele voltou.
    if (this.connection.state() === 'offline') return;
    if (this.running) {
      this.requestedWhileRunning = true;
      return;
    }
    this.running = true;
    try {
      do {
        this.requestedWhileRunning = false;
        await this.round();
      } while (this.requestedWhileRunning && this.connection.state() !== 'offline');
    } finally {
      this.running = false;
      await this.schedule();
    }
  }

  private async round(): Promise<void> {
    const now = this.now();
    const due = (await this.store.outbox()).filter((event) => event.nextAttemptAt <= now);
    for (const event of due) {
      if (this.connection.state() === 'offline') return;
      const keepGoing = await this.send(event);
      if (!keepGoing) return;
    }
  }

  /** Devolve false quando a falha é de comunicação: não adianta tentar os próximos agora. */
  private async send(event: StoredEvent): Promise<boolean> {
    const uid = this.currentUid();
    if (!uid) return false;
    await this.store.update(event.id, { status: 'sending' });
    this.notify();
    try {
      await withTimeout(this.timeoutMs, this.remote.sendEvent(uid, toRemoteEvent(event)));
      await this.confirm(event.id);
      this.connection.markServerResponding();
      return true;
    } catch (error) {
      const code = error instanceof RemoteError ? error.code : 'other';
      if (code === 'permission-denied') {
        // A regra do servidor recusa regravar um evento que já existe (reenvio):
        // conferimos antes de declarar a recusa definitiva.
        const arrived = await this.remote.eventExists(uid, event.id).catch(() => null);
        if (arrived === true) {
          await this.confirm(event.id);
          this.connection.markServerResponding();
          return true;
        }
        if (arrived === false) {
          await this.store.update(event.id, { status: 'rejected', error: 'Recusado pelo servidor' });
          this.notify();
          return true;
        }
      }
      const attempts = event.attempts + 1;
      await this.store.update(event.id, {
        status: 'pending',
        attempts,
        nextAttemptAt: this.now() + retryDelayMs(Math.min(attempts, 10), this.random()),
        error: error instanceof Error ? error.message : String(error),
      });
      this.notify();
      if (code === 'unauthenticated') return false; // login ainda carregando: tenta depois
      if (code === 'timeout' || code === 'unavailable' || code === 'permission-denied') {
        this.connection.markServerUnavailable();
        return false;
      }
      return true; // falha só deste evento: segue com os outros
    }
  }

  private async confirm(id: string): Promise<void> {
    await this.store.update(id, { status: 'confirmed', error: null });
    this.lastSyncAt = this.now();
    this.notify();
  }

  private async schedule(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.stopped) return;
    const pending = (await this.store.outbox()).filter((event) => event.status === 'pending');
    if (pending.length === 0) return;
    const next = Math.min(...pending.map((event) => event.nextAttemptAt));
    this.timer = setTimeout(() => void this.synchronize(), Math.max(next - this.now(), 250));
  }

  /** O servidor voltou: o backoff já cumpriu o papel, envia tudo agora. */
  async onReconnect(): Promise<void> {
    for (const event of await this.store.outbox()) {
      if (event.status === 'pending') await this.store.update(event.id, { nextAttemptAt: 0 });
    }
    await this.synchronize();
  }

  /**
   * Para a demonstração "operação transmitida mais de uma vez": reenvia um evento que o
   * servidor já confirmou. Devolve 'duplicate-ignored' quando o servidor manteve o original.
   */
  async resend(event: PlayerEvent): Promise<'duplicate-ignored' | 'accepted'> {
    const uid = this.currentUid();
    if (!uid) throw new RemoteError('unauthenticated', 'Entre com o Google para sincronizar.');
    try {
      await withTimeout(this.timeoutMs, this.remote.sendEvent(uid, toRemoteEvent(event)));
      return 'accepted';
    } catch (error) {
      if (error instanceof RemoteError && error.code === 'permission-denied' && (await this.remote.eventExists(uid, event.id))) {
        return 'duplicate-ignored';
      }
      throw error;
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  private notify(): void {
    this.listeners.forEach((callback) => callback());
  }
}

/** Só os campos do evento (sem os metadados locais da fila). */
export function toRemoteEvent(event: PlayerEvent): PlayerEvent {
  const { id, deviceId, at, action, basis } = event;
  return basis === undefined ? { id, deviceId, at, action } : { id, deviceId, at, action, basis };
}
