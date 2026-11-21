import { describe, it, expect } from 'vitest';
import { createGame, playRound } from '../src/engine/game';

describe('repechaje en partidas viejas', () => {
  it('si la partida ya estaba en playoffs con una sola promoción, termina con la regla vieja', () => {
    const g = createGame({ seed: 8 });
    while (g.round <= 18) playRound(g);
    // Como quedaba una partida guardada antes del cambio: una sola serie por categoría, sin número.
    g.fixtures = g.fixtures.filter((f) => !((f.comp === 'PROMO1' || f.comp === 'PROMOC1') && f.serie === 1));
    for (const f of g.fixtures) delete f.serie;
    while (g.phase !== 'fin') playRound(g);
    const rec = g.history[0];
    expect(rec.asciende.length).toBeGreaterThanOrEqual(1);
    expect(rec.asciende.length).toBeLessThanOrEqual(2);
    expect(rec.asciende.length).toBe(rec.desciende.length);
  });
});
