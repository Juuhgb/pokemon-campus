const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 60_000;
const JITTER = 0.2;

/** Espera exponencial com jitter; random é injetável para facilitar a validação. */
export function retryDelayMs(attempt: number, random = Math.random()): number {
  if (!Number.isInteger(attempt) || attempt < 0) throw new RangeError('Attempt must be a non-negative integer');
  if (!Number.isFinite(random) || random < 0 || random >= 1) {
    throw new RangeError('Random value must be in the range [0, 1)');
  }

  const base = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return Math.round(base * (1 + JITTER * (2 * random - 1)));
}
