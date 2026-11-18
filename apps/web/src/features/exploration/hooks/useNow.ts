import { useEffect, useState } from 'react';

/** Relógio que atualiza a cada `intervalMs` (contagem regressiva e expiração de spawns). */
export function useNow(intervalMs = 1_000, clock = Date.now): Date {
  const [now, setNow] = useState(() => new Date(clock()));
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date(clock())), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, clock]);
  return now;
}
