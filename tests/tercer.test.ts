import { describe, it, expect } from 'vitest';
import { createGame, playRound } from '../src/engine/game';
import { hacerTercer, tercerPendiente } from '../src/engine/tercer';

describe('tercer tiempo', () => {
  it('aparece después de un partido oficial y se resuelve una vez', () => {
    const g = createGame({ seed: 81, userClubIndex: 2 });
    expect(tercerPendiente(g)).toBeNull();
    let f = null;
    for (let i = 0; i < 4 && !f; i++) {
      playRound(g);
      f = tercerPendiente(g);
    }
    expect(f).not.toBeNull();
    const c = g.clubs[g.userClubId];
    const plata = c.presupuesto;
    hacerTercer(g, f!.home === c.id ? 'asado' : 'compartir');
    expect(c.presupuesto).toBeLessThan(plata);
    expect(tercerPendiente(g)).toBeNull();
  });
});
