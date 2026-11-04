/** Regras v1 puras, compartilháveis pelo cliente e pela API. */
export const xpToNextLevel = (level: number): number => level * 20;

export function applyExperience(level: number, experience: number, amount: number) {
  if (![level, experience, amount].every(Number.isSafeInteger) || level < 1 || level > 100 || experience < 0 || amount < 0) {
    throw new RangeError('Invalid experience or level');
  }
  let xp = experience + amount;
  while (level < 100 && xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
  }
  return { level, xp: level === 100 ? 0 : xp };
}

export function battleRewardsV1(status: string, level: number) {
  const experience = status === 'captured' ? level * 5 : status === 'won' ? level * 6 : status === 'lost' ? level : 0;
  const points = status === 'captured' ? 100 + level * 2 : status === 'won' ? 50 + level : 0;
  return { experience, points };
}

export function statsAtLevelV1(base: { hp: number; attack: number; defense: number }, level: number) {
  if (!Number.isInteger(level) || level < 1 || level > 100) throw new RangeError('Invalid level');
  return {
    maxHp: Math.round(base.hp + level * 1.8),
    attack: Math.round(base.attack + level * 0.9),
    defense: Math.round(base.defense + level * 0.8),
  };
}
