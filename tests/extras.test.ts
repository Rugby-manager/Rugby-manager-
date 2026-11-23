import { describe, it, expect } from 'vitest';
import { createGame, playRound } from '../src/engine/game';
import { climaDe, isDerby, rivalOf, captainOf, convocatoria } from '../src/engine/extras';
import { LiveMatch } from '../src/engine/match';
import { Rng } from '../src/engine/rng';

describe('etapa 6', () => {
  it('todos los clubes tienen su clásico', () => {
    const g = createGame({ seed: 5, userClubIndex: 0, modo: 'libre' });
    for (const c of Object.values(g.clubs)) {
      const r = rivalOf(g, c);
      expect(r, c.corto).toBeDefined();
      expect(isDerby(c, r!)).toBe(true);
    }
  });

  it('el clima es el mismo cada vez que se mira y hay de todo', () => {
    const g = createGame({ seed: 6, userClubIndex: 0, modo: 'libre' });
    const climas = new Set(g.fixtures.map((f) => climaDe(f, g.temporada)));
    expect(climas.size).toBeGreaterThanOrEqual(4);
    expect(climaDe(g.fixtures[3], 1)).toBe(climaDe(g.fixtures[3], 1));
  });

  it('el capitán elegido manda; si no, el de más liderazgo', () => {
    const g = createGame({ seed: 7, userClubIndex: 0, modo: 'libre' });
    const c = g.clubs[g.userClubId];
    const auto = captainOf(c, g.players);
    expect(auto).not.toBeNull();
    const otro = c.xv.find((id) => id && id !== auto)!;
    c.capitan = otro;
    expect(captainOf(c, g.players)).toBe(otro);
  });

  it('con lluvia y viento se patea peor', () => {
    const g = createGame({ seed: 8, userClubIndex: 0, modo: 'libre' });
    const [h, a] = Object.values(g.clubs);
    const mk = (clima: 'sol' | 'lluvia' | 'viento') => new LiveMatch({ home: h, away: a, homeXV: h.xv, awayXV: a.xv, players: g.players, clima }, new Rng(1));
    expect(mk('lluvia').H.ratings.kickPct).toBeLessThan(mk('sol').H.ratings.kickPct);
    expect(mk('viento').H.ratings.kickPct).toBeLessThan(mk('lluvia').H.ratings.kickPct);
  });

  it('la Selección convoca 23 y hay récords al avanzar la temporada', () => {
    const g = createGame({ seed: 9, userClubIndex: 2, modo: 'libre' });
    expect(convocatoria(g).length).toBe(23);
    while (g.round <= 17) playRound(g);
    expect(g.seleccion?.ids.length).toBe(23);
    expect(g.players[g.seleccion!.ids[0]].caps).toBe(3);
    expect(g.records?.goleada).toBeDefined();
    expect(g.records?.puntosPartido!.valor).toBeGreaterThan(20);
  });
});
