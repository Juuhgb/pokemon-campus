import { useCallback, useState } from 'react';
import { IntegrationAnnouncement } from '../components/IntegrationAnnouncement.js';
import { appearances } from '../data/integrationEvent.js';
import { CAMPUS_ZONES } from '../data/campusZones.js';
import { useNow } from '../hooks/useNow.js';
import { createSimulatedFix, type LocationProvider } from '../services/location.js';
import { createStaticZoneRepository } from '../services/zoneRepository.js';
import { ExplorationPage } from './ExplorationPage.js';

const event = appearances[0]!;
const zones = createStaticZoneRepository(CAMPUS_ZONES);
const emptySpawns = { listSpawns: async () => [] };
const location: LocationProvider = {
  watch(onFix) {
    onFix(createSimulatedFix(event.spawn));
    return () => {};
  },
};
const button = 'rounded-xl ink-border bg-amarelo px-3 py-2 font-bold';

export function IntegrationSimulation() {
  const [offset, setOffset] = useState<number | null>(null);
  const [encounter, setEncounter] = useState(false);
  const clock = useCallback(() => Date.now() + (offset ?? 0), [offset]);
  const now = useNow(1000, clock).getTime();
  function jump(time: number) {
    setEncounter(false);
    setOffset(time - Date.now());
  }
  if (offset === null) return (
    <main className="m-auto max-w-md space-y-4 p-5">
      <h1 className="font-display text-2xl">Simulação de Jirachi</h1>
      <p>Comece cinco segundos antes da aparição, com o GPS de teste no ponto de encontro.</p>
      <button className={button} onClick={() => jump(event.begins - 5000)}>Iniciar simulação</button>
    </main>
  );
  return (
    <main className="flex h-dvh flex-col">
      <div className="min-h-0 flex-1">
        <ExplorationPage key={offset} clock={clock} locationProvider={location} zoneRepository={zones}
          spawnRepository={emptySpawns} onStartEncounter={() => setEncounter(true)} />
      </div>
      <IntegrationAnnouncement key={offset} clock={clock} />
      <footer className="space-y-2 bg-creme p-3 text-sm">
        <p role="status">{encounter ? 'Encontro de teste iniciado.' : 'Simulação local'} · {now < event.begins ? 'Aguardando Jirachi' : now < event.ends ? 'Jirachi no mapa' : 'Aparição encerrada'}</p>
        <div className="flex flex-wrap gap-2">
          <button className={button} onClick={() => jump(event.begins - 5000)}>Reiniciar</button>
          <button className={button} onClick={() => jump(event.ends - 5000)}>Ir aos últimos 5 segundos</button>
        </div>
      </footer>
    </main>
  );
}
