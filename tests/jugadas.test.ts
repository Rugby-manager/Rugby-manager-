import { describe, it, expect } from 'vitest';
import { createGame } from '../src/engine/game';
import { simulateMatch } from '../src/engine/match';
import { readyXV } from '../src/engine/players';
import { Rng } from '../src/engine/rng';
import type { Tactics } from '../src/engine/types';

function correr(t: Partial<Tactics>, n = 300) {
  const g = createGame({ seed: 61, userClubIndex: 0, modo: 'libre' });
  const [home, away] = Object.values(g.clubs).filter((c) => c.division === 'A');
  home.tactica = { ...home.tactica, ...t };
  const rng = new Rng(99);
  let maul = 0, tries = 0, pts = 0, lines = 0, linesP = 0;
  for (let i = 0; i < n; i++) {
    const r = simulateMatch({ home, away, homeXV: readyXV(home, g.players).xv, awayXV: readyXV(away, g.players).xv, players: g.players, neutral: false, detailed: true }, rng);
    for (const e of r.events ?? []) if (e.kind === 'try' && e.side === 'H') {
      tries++;
      if (/maul/i.test(e.text)) maul++;
    }
    pts += r.ptsH;
    lines += r.stats?.H.linesG ?? 0;
    linesP += r.stats?.H.linesP ?? 0;
  }
  return { maul: maul / Math.max(1, tries), pts: pts / n, perdidos: linesP / Math.max(1, lines + linesP) };
}

describe('jugadas preparadas', () => {
  it('el line para el maul da más tries de maul y el line corto pierde menos lines', () => {
    const base = correr({ line: 'medio' });
    const maul = correr({ line: 'maul' });
    const corto = correr({ line: 'corto' });
    const fondo = correr({ line: 'fondo' });
    expect(maul.maul).toBeGreaterThan(base.maul * 1.3);
    expect(corto.perdidos).toBeLessThan(base.perdidos);
    expect(fondo.perdidos).toBeGreaterThan(base.perdidos);
    // Ninguna jugada rompe el partido.
    for (const x of [base, maul, corto, fondo]) expect(x.pts).toBeGreaterThan(10), expect(x.pts).toBeLessThan(45);
  });
});
