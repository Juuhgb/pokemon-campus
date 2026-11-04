/**
 * Reprodutível em navegador e Node. É uma PRNG de jogo, não criptográfica.
 * A versão faz parte do contrato: não altere o algoritmo para encounters v1.
 */
export function deterministicRollV1(seed: string, turnNumber: number, purpose: string): number {
  if (seed.length < 16) throw new RangeError('Battle seed must contain at least 16 characters');
  if (!Number.isInteger(turnNumber) || turnNumber < 1) throw new RangeError('Turn number must be a positive integer');
  if (purpose.length === 0) throw new RangeError('Purpose must not be empty');

  let state = 2166136261;
  const material = `${seed}:${turnNumber}:${purpose}`;
  for (let index = 0; index < material.length; index += 1) {
    state ^= material.charCodeAt(index);
    state = Math.imul(state, 16777619) >>> 0;
  }

  state = (state + 0x9e3779b9) >>> 0;
  let value = state;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) / 0x1_0000_0000;
}
