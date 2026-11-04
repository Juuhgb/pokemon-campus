import { describe, expect, it } from 'vitest';
import { applyExperience, battleRewardsV1 } from './progression.js';

describe('progression v1', () => {
  it('carries excess experience across multiple levels', () => {
    expect(applyExperience(1, 10, 120)).toEqual({ level: 4, xp: 10 });
  });
  it('caps level and experience at 100', () => {
    expect(applyExperience(99, 1979, 10)).toEqual({ level: 100, xp: 0 });
  });
  it('rejects invalid rewards', () => {
    expect(() => applyExperience(5, 0, NaN)).toThrow();
    expect(() => applyExperience(5, 0, -1)).toThrow();
  });
  it('gives no rewards for an unfinished battle or fleeing', () => {
    expect(battleRewardsV1('active', 5)).toEqual({ experience: 0, points: 0 });
    expect(battleRewardsV1('fled', 5)).toEqual({ experience: 0, points: 0 });
  });
});
