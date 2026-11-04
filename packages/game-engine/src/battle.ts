import type { CreatureStats } from '@pokemon-campus/shared';

export interface AttackInput {
  attacker: Pick<CreatureStats, 'level' | 'attack'>;
  defender: Pick<CreatureStats, 'defense' | 'hp'>;
  power: number;
}

export function calculateDamage({ attacker, defender, power }: AttackInput): number {
  if (power <= 0) throw new RangeError('Move power must be greater than zero');
  const rawDamage = (((2 * attacker.level) / 5 + 2) * power * (attacker.attack / defender.defense)) / 50 + 2;
  return Math.min(defender.hp, Math.max(1, Math.floor(rawDamage)));
}

