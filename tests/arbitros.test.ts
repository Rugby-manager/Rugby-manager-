import { describe, it, expect } from 'vitest';
import { createGame } from '../src/engine/game';
import { simulateMatch } from '../src/engine/match';
import { readyXV } from '../src/engine/players';
import { Rng } from '../src/engine/rng';
import { ARBITROS, ESTILO, arbitroDe } from '../src/engine/arbitros';

describe('árbitros con estilo', () => {
  it('el estricto saca más tarjetas que el que deja jugar', () => {
    const g = createGame({ seed: 91, userClubIndex: 0 });
    const [h, a] = [g.clubs.c0, g.clubs.c1];
    const run = (k: 'estricto' | 'dejaJugar') => {
      let am = 0;
      for (let s = 1; s <= 150; s++) {
        const e = ESTILO[k];
        const r = simulateMatch({ home: h, away: a, homeXV: readyXV(h, g.players).xv, awayXV: readyXV(a, g.players).xv, players: g.players, arbitro: { nombre: 'x', estilo: k, pen: e.pen, amarilla: e.amarilla } }, new Rng(s));
        am += r.amarillasH + r.amarillasA;
      }
      return am;
    };
    expect(run('estricto')).toBeGreaterThan(run('dejaJugar') * 1.5);
    const f = g.fixtures[0];
    expect(arbitroDe(f, 2027)).toEqual(arbitroDe(f, 2027));
    expect(new Set(ARBITROS.map((x) => x.estilo)).size).toBe(3);
  });
});
