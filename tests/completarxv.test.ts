import { describe, it, expect } from 'vitest';
import { createGame } from '../src/engine/game';
import { canSell, sellPlayer } from '../src/engine/market';
import { Rng } from '../src/engine/rng';
import { SHIRT_POS } from '../src/engine/players';

describe('vender un titular', () => {
  it('su lugar no queda vacío: entra el mejor del puesto', () => {
    const g = createGame({ seed: 81, userClubIndex: 5 });
    const c = g.clubs[g.userClubId];
    const slot = c.xv.findIndex((id) => id && canSell(g, id).ok);
    expect(slot).toBeGreaterThanOrEqual(0);
    const sale = c.xv[slot]!;
    sellPlayer(g, sale, new Rng(1));
    expect(c.xv.every(Boolean)).toBe(true);
    expect(c.xv).not.toContain(sale);
    expect(new Set(c.xv).size).toBe(15);
    const nuevo = g.players[c.xv[slot]!];
    expect([nuevo.pos, ...(nuevo.pos2 ?? [])]).toContain(SHIRT_POS[slot]);
  });
});
