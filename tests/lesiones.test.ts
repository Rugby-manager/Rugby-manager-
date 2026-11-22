import { describe, it, expect } from 'vitest';
import { createGame, playRound } from '../src/engine/game';
import { apurarVuelta, parteKine, riesgoApurar } from '../src/engine/lesiones';

describe('lesiones con parte del kine', () => {
  it('apurar la vuelta lo deja jugar ya pero puede recaer', () => {
    let recayo = 0;
    for (let s = 1; s < 25; s++) {
      const g = createGame({ seed: 200 + s, userClubIndex: 2 });
      const c = g.clubs[g.userClubId];
      const p = g.players[c.xv[5]!];
      p.lesion = 5;
      expect(parteKine(p, c)).toContain('5 fechas');
      const r = riesgoApurar(p, c);
      expect(r).toBeGreaterThan(0.3);
      apurarVuelta(g, p.id);
      expect(p.lesion).toBe(0);
      for (let i = 0; i < 3; i++) playRound(g);
      if (p.lesionTipo?.startsWith('Recaída')) recayo++;
    }
    expect(recayo).toBeGreaterThan(0);
    expect(recayo).toBeLessThan(24);
  });
});
