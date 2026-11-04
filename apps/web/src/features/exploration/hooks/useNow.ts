import { useEffect, useState } from 'react';

/** Relógio que atualiza a cada `intervalMs` (contagem regressiva e expiração de spawns). */
export function useNow(intervalMs = 1_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
