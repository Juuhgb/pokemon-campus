import type { CreatureStats } from '@pokemon-campus/shared';

export function captureChance(target: Pick<CreatureStats, 'hp' | 'maxHp'>, bonus = 0): number {
  if (target.maxHp <= 0 || target.hp < 0 || target.hp > target.maxHp) {
    throw new RangeError('Target HP must be between zero and max HP');
  }
  return Math.min(0.95, Math.max(0.05, 0.1 + (1 - target.hp / target.maxHp) * 0.75 + bonus));
}

export function succeedsCapture(roll: number, target: Pick<CreatureStats, 'hp' | 'maxHp'>, bonus = 0): boolean {
  if (roll < 0 || roll >= 1) throw new RangeError('Capture roll must be in the range [0, 1)');
  return roll < captureChance(target, bonus);
}

