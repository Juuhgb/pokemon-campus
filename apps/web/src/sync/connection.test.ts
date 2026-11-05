import { describe, expect, it } from 'vitest';
import { ConnectionMonitor, type ConnectionEnvironment } from './connection.js';

function fakeEnvironment(online = true) {
  let network: (() => void) | null = null;
  const env: ConnectionEnvironment & { isOnline: boolean; fireNetwork: () => void } = {
    isOnline: online,
    online: () => env.isOnline,
    visible: () => false, // sem timer nos testes
    onNetworkChange: (callback) => {
      network = callback;
      return () => { network = null; };
    },
    onVisibilityChange: () => () => {},
    fireNetwork: () => network?.(),
  };
  return env;
}

describe('ConnectionMonitor', () => {
  it('distingue "sem rede" de "servidor fora" e avisa quando volta', async () => {
    const env = fakeEnvironment(true);
    let serverUp = false;
    const monitor = new ConnectionMonitor(async () => {
      if (!serverUp) throw new Error('down');
    }, env);
    const states: string[] = [];
    let reconnects = 0;
    monitor.subscribe((state) => states.push(state));
    monitor.onReconnect(() => { reconnects += 1; });

    monitor.start();
    await monitor.heartbeat();
    expect(monitor.state()).toBe('server-unavailable');

    env.isOnline = false;
    env.fireNetwork();
    expect(monitor.state()).toBe('offline');

    env.isOnline = true;
    serverUp = true;
    env.fireNetwork();
    await monitor.heartbeat();
    monitor.stop();
    expect(states).toEqual(['server-unavailable', 'offline', 'online']);
    expect(reconnects).toBe(1);
  });

  it('heartbeat que não responde a tempo conta como servidor fora', async () => {
    const monitor = new ConnectionMonitor(() => new Promise(() => {}), fakeEnvironment(true), 60_000, 10);
    expect(await monitor.heartbeat()).toBe('server-unavailable');
  });
});
