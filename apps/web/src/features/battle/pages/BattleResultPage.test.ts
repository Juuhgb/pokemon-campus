import { describe, expect, it } from 'vitest';
import { newCreature } from '../../player/playerState.js';
import { alreadyOwnedBefore } from './BattleResultPage.js';

const AT = '2026-11-04T15:00:00.000Z';

describe('"Novo!" na captura', () => {
  it('é novo quando a espécie não estava no álbum, antes e depois de gravar o resultado', () => {
    expect(alreadyOwnedBefore({ creatures: [newCreature('a', 'brasinha', 5, AT)], settledBattles: [] }, 'faiscao', 'b1')).toBe(false);
    // Depois de gravar: o Pikachu desta batalha já está no álbum, mas não conta.
    const after = { creatures: [newCreature('a', 'brasinha', 5, AT), newCreature('p', 'faiscao', 9, AT)], settledBattles: ['b1'] };
    expect(alreadyOwnedBefore(after, 'faiscao', 'b1')).toBe(false);
  });

  it('é repetido quando já tinha a espécie', () => {
    const before = { creatures: [newCreature('p1', 'faiscao', 9, AT)], settledBattles: ['b0'] };
    expect(alreadyOwnedBefore(before, 'faiscao', 'b2')).toBe(true);
    const after = { creatures: [newCreature('p1', 'faiscao', 9, AT), newCreature('p2', 'faiscao', 7, AT)], settledBattles: ['b0', 'b2'] };
    expect(alreadyOwnedBefore(after, 'faiscao', 'b2')).toBe(true);
  });
});
