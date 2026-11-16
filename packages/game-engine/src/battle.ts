import type { CreatureStats } from '@pokemon-campus/shared';

/** Chance de acerto crítico por golpe (1 em 16, como nos jogos Pokémon) e quanto ele multiplica o dano. */
export const CRITICAL_CHANCE = 1 / 16;
export const CRITICAL_MULTIPLIER = 1.5;

export interface AttackInput {
  attacker: Pick<CreatureStats, 'level' | 'attack'>;
  defender: Pick<CreatureStats, 'defense' | 'hp'>;
  power: number;
  /** Acerto crítico: dano × CRITICAL_MULTIPLIER. */
  critical?: boolean;
}

export function calculateDamage({ attacker, defender, power, critical = false }: AttackInput): number {
  if (power <= 0) throw new RangeError('Move power must be greater than zero');
  const rawDamage = (((2 * attacker.level) / 5 + 2) * power * (attacker.attack / defender.defense)) / 50 + 2;
  const multiplied = critical ? rawDamage * CRITICAL_MULTIPLIER : rawDamage;
  return Math.min(defender.hp, Math.max(1, Math.floor(multiplied)));
}

/** O sorteio (0–1) deu acerto crítico? */
export function isCriticalRoll(roll: number): boolean {
  return roll < CRITICAL_CHANCE;
}

