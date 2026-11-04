// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { unwrapAngle } from './PlayerMarker.js';

describe('unwrapAngle', () => {
  it('gira a seta pelo caminho mais curto', () => {
    expect(unwrapAngle(350, 10)).toBe(370);
    expect(unwrapAngle(10, 350)).toBe(-10);
    expect(unwrapAngle(720, 90)).toBe(810);
  });
});
