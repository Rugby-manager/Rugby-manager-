import { describe, it, expect } from 'vitest';
import { createGame } from '../src/engine/game';
import { simulateMatch } from '../src/engine/match';
import { bestXV } from '../src/engine/players';
import { Rng } from '../src/engine/rng';
import { trainClub } from '../src/engine/training';

describe('Actitud', () => {
  const g = createGame({ seed: 77, userClubIndex: 0 });
  const [a, b] = Object.values(g.clubs).filter((c) => c.division === 'A');
  const setActitud = (ids: string[], v: number) => ids.forEach((id) => (g.players[id].attrs.actitud = v));

  it('todos los jugadores la tienen', () => {
    for (const p of Object.values(g.players)) expect(p.attrs.actitud).toBeGreaterThanOrEqual(30);
  });

  function run(actA: number) {
    setActitud(a.plantel, actA);
    setActitud(b.plantel, 66);
    const rng = new Rng(5);
    let ptsDiff = 0;
    let cards = 0;
    const N = 600;
    for (let i = 0; i < N; i++) {
      const r = simulateMatch({ home: a, away: b, homeXV: bestXV(a, g.players), awayXV: bestXV(b, g.players), players: g.players, neutral: true }, rng);
      ptsDiff += r.ptsH - r.ptsA;
      cards += r.amarillasH;
    }
    return { ptsDiff: ptsDiff / N, cards: cards / N };
  }

  it('con buena actitud rendís más y te sacan menos amarillas', () => {
    const low = run(40);
    const high = run(92);
    expect(high.ptsDiff).toBeGreaterThan(low.ptsDiff + 2);
    expect(high.cards).toBeLessThan(low.cards);
  });

  it('con buena actitud aprovechás más el entrenamiento', () => {
    const gains = (v: number) => {
      const gg = createGame({ seed: 78, userClubIndex: 0 });
      const c = Object.values(gg.clubs)[0];
      for (const id of c.plantel) {
        gg.players[id].attrs.actitud = v;
        gg.players[id].potencial = 99;
      }
      const rng = new Rng(9);
      let n = 0;
      for (let w = 0; w < 30; w++) n += trainClub(c, gg.players, rng).mejoras.length;
      return n;
    };
    expect(gains(90)).toBeGreaterThan(gains(40) * 1.3);
  });
});
