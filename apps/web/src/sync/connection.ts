import { withTimeout } from './playerRemote.js';

/**
 * - online: há rede e o servidor respondeu;
 * - offline: o aparelho está sem rede (navigator.onLine);
 * - server-unavailable: há rede, mas o servidor não responde (heartbeat ou envio falhou).
 */
export type ConnectionState = 'online' | 'offline' | 'server-unavailable';

export const HEARTBEAT_INTERVAL_MS = 60_000;
/** Com o servidor fora, testa mais vezes para perceber logo a volta. */
export const HEARTBEAT_RECOVERY_MS = 10_000;
export const HEARTBEAT_TIMEOUT_MS = 5_000;

export interface ConnectionEnvironment {
  online(): boolean;
  visible(): boolean;
  onNetworkChange(callback: () => void): () => void;
  onVisibilityChange(callback: () => void): () => void;
}

export const browserEnvironment: ConnectionEnvironment = {
  online: () => navigator.onLine,
  visible: () => document.visibilityState === 'visible',
  onNetworkChange(callback) {
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);
    return () => {
      window.removeEventListener('online', callback);
      window.removeEventListener('offline', callback);
    };
  },
  onVisibilityChange(callback) {
    document.addEventListener('visibilitychange', callback);
    return () => document.removeEventListener('visibilitychange', callback);
  },
};

/** O que o sincronizador precisa saber/avisar sobre a conexão. */
export interface ConnectionPort {
  state(): ConnectionState;
  markServerUnavailable(): void;
  markServerResponding(): void;
}

/**
 * navigator.onLine só diz se há rede. O heartbeat diz se o servidor responde.
 * Também roda ao voltar a rede e ao voltar o app para o primeiro plano.
 */
export class ConnectionMonitor implements ConnectionPort {
  private current: ConnectionState;
  private listeners = new Set<(state: ConnectionState) => void>();
  private reconnectListeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private cleanups: (() => void)[] = [];
  private inFlight: Promise<ConnectionState> | null = null;

  constructor(
    private readonly remoteHeartbeat: () => Promise<void>,
    private readonly env: ConnectionEnvironment = browserEnvironment,
    private readonly intervalMs = HEARTBEAT_INTERVAL_MS,
    private readonly timeoutMs = HEARTBEAT_TIMEOUT_MS,
    private readonly recoveryMs = HEARTBEAT_RECOVERY_MS,
  ) {
    // Começa otimista se há rede; o primeiro heartbeat confirma.
    this.current = env.online() ? 'online' : 'offline';
  }

  start(): void {
    this.cleanups.push(
      this.env.onNetworkChange(() => {
        if (!this.env.online()) this.set('offline');
        else void this.heartbeat();
      }),
      this.env.onVisibilityChange(() => {
        if (this.env.visible()) {
          void this.heartbeat();
          this.startTimer();
        } else this.stopTimer(); // sem heartbeat com o app em segundo plano
      }),
    );
    if (this.env.visible()) this.startTimer();
    void this.heartbeat();
  }

  stop(): void {
    this.stopTimer();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }

  state(): ConnectionState {
    return this.current;
  }

  subscribe(callback: (state: ConnectionState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /** Chamado a cada transição para online: gatilho da sincronização. */
  onReconnect(callback: () => void): () => void {
    this.reconnectListeners.add(callback);
    return () => this.reconnectListeners.delete(callback);
  }

  markServerUnavailable(): void {
    this.set(this.env.online() ? 'server-unavailable' : 'offline');
  }

  markServerResponding(): void {
    if (this.env.online()) this.set('online');
  }

  heartbeat(): Promise<ConnectionState> {
    if (!this.env.online()) {
      this.set('offline');
      return Promise.resolve(this.current);
    }
    // Quem chama durante um heartbeat em curso espera o mesmo resultado.
    this.inFlight ??= withTimeout(this.timeoutMs, this.remoteHeartbeat())
      .then(
        () => this.markServerResponding(),
        () => this.markServerUnavailable(),
      )
      .then(() => {
        this.inFlight = null;
        return this.current;
      });
    return this.inFlight;
  }

  private set(next: ConnectionState): void {
    if (next === this.current) return;
    this.current = next;
    // O ritmo do heartbeat depende do estado: religa o timer se ele estava ligado.
    if (this.timer) {
      this.stopTimer();
      this.startTimer();
    }
    this.listeners.forEach((callback) => callback(next));
    if (next === 'online') this.reconnectListeners.forEach((callback) => callback());
  }

  private startTimer(): void {
    if (this.timer) return;
    const ms = this.current === 'server-unavailable' ? this.recoveryMs : this.intervalMs;
    this.timer = setInterval(() => void this.heartbeat(), ms);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
