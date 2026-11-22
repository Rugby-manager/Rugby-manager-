import { describe, it, expect } from 'vitest';
import { createGame, playRound, startNextSeason } from '../src/engine/game';
import { elegirPostemporada } from '../src/engine/postemporada';

describe('postemporada', () => {
  it('el bloque físico sube lo físico del plantel', () => {
    const run = (plan: 'fisico' | null) => {
      const g = createGame({ seed: 101, userClubIndex: 3 });
      while (g.phase !== 'fin') playRound(g);
      if (plan) elegirPostemporada(g, plan);
      startNextSeason(g);
      const c = g.clubs[g.userClubId];
      const ps = c.plantel.map((id) => g.players[id]);
      return ps.reduce((s, p) => s + p.attrs.resistencia + p.attrs.velocidad + p.attrs.dureza, 0) / ps.length;
    };
    expect(run('fisico')).toBeGreaterThan(run(null) + 1.5);
  });
});
