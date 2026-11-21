import { describe, it, expect } from 'vitest';
import { createGame, playRound, startNextSeason, standings, matchWinner, divisionClubs, LAST_ROUND } from '../src/engine/game';
import { teamAverage } from '../src/engine/players';
import type { GameState } from '../src/engine/types';

function playSeason(g: GameState) {
  while (g.phase !== 'fin') playRound(g);
}

// Simula muchas temporadas una sola vez y reutiliza los datos en todas las pruebas.
const SEASONS = 40;
const matches: { pts: number; tries: number; diffStrength: number; strongerWon: boolean | null; homeWon: boolean | null; yellows: number }[] = [];
const games: GameState[] = [];
{
  for (let run = 0; run < 4; run++) {
    const g = createGame({ seed: 1000 + run, userClubIndex: run });
    for (let s = 0; s < SEASONS / 4; s++) {
      // Fuerza de cada club al empezar la temporada.
      const strength: Record<string, number> = {};
      for (const c of Object.values(g.clubs)) strength[c.id] = teamAverage(c, g.players);
      playSeason(g);
      for (const f of g.fixtures) {
        const r = f.result!;
        const d = strength[f.home] - strength[f.away];
        const w = matchWinner(f);
        matches.push({
          pts: r.ptsH + r.ptsA,
          tries: r.triesH + r.triesA,
          diffStrength: Math.abs(d),
          strongerWon: w === null ? null : (w === f.home) === d > 0,
          homeWon: f.comp === 'A' || f.comp === 'B' ? (w === null ? null : w === f.home) : null,
          yellows: r.amarillasH + r.amarillasA,
        });
      }
      startNextSeason(g);
    }
    games.push(g);
  }
}

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

describe('motor de simulación: muchas temporadas', () => {
  it('juega todas las temporadas sin errores', () => {
    expect(matches.length).toBeGreaterThan(SEASONS * 180);
  });

  it('promedia entre 35 y 50 puntos por partido', () => {
    const m = avg(matches.map((x) => x.pts));
    console.log('Puntos por partido:', m.toFixed(1));
    expect(m).toBeGreaterThanOrEqual(35);
    expect(m).toBeLessThanOrEqual(50);
  });

  it('promedia entre 4 y 6 tries por partido', () => {
    const t = avg(matches.map((x) => x.tries));
    console.log('Tries por partido:', t.toFixed(2));
    expect(t).toBeGreaterThanOrEqual(4);
    expect(t).toBeLessThanOrEqual(6);
  });

  it('el más fuerte gana más seguido, pero no siempre', () => {
    const decided = matches.filter((x) => x.strongerWon !== null && x.diffStrength >= 1);
    const rate = avg(decided.map((x) => (x.strongerWon ? 1 : 0)));
    const big = matches.filter((x) => x.strongerWon !== null && x.diffStrength >= 5);
    const bigRate = avg(big.map((x) => (x.strongerWon ? 1 : 0)));
    console.log(`Gana el más fuerte: ${(rate * 100).toFixed(1)}% (con diferencia grande: ${(bigRate * 100).toFixed(1)}%)`);
    expect(rate).toBeGreaterThan(0.58);
    expect(rate).toBeLessThan(0.85);
    expect(bigRate).toBeGreaterThan(rate);
    expect(bigRate).toBeLessThan(0.97);
  });

  it('la localía pesa un poco', () => {
    const h = matches.filter((x) => x.homeWon !== null);
    const rate = avg(h.map((x) => (x.homeWon ? 1 : 0)));
    console.log('Gana el local:', (rate * 100).toFixed(1) + '%');
    expect(rate).toBeGreaterThan(0.52);
    expect(rate).toBeLessThan(0.68);
  });

  it('hay variedad de resultados: empates poco frecuentes y algunas goleadas', () => {
    const draws = matches.filter((x) => x.strongerWon === null).length / matches.length;
    console.log('Empates:', (draws * 100).toFixed(1) + '%');
    expect(draws).toBeLessThan(0.08);
    expect(matches.some((x) => x.pts >= 70)).toBe(true);
    expect(matches.some((x) => x.pts <= 20)).toBe(true);
  });

  it('las amarillas existen pero no son constantes', () => {
    const y = avg(matches.map((x) => x.yellows));
    console.log('Amarillas por partido:', y.toFixed(2));
    expect(y).toBeGreaterThan(0.3);
    expect(y).toBeLessThan(2);
  });

  it('los planteles se mantienen sanos con los años', () => {
    for (const g of games) {
      for (const c of Object.values(g.clubs)) {
        expect(c.plantel.length).toBeGreaterThanOrEqual(26);
        expect(c.plantel.length).toBeLessThanOrEqual(34);
        const a = teamAverage(c, g.players);
        expect(a).toBeGreaterThan(52);
        expect(a).toBeLessThan(88);
      }
      expect(divisionClubs(g, 'A').length).toBe(10);
      expect(divisionClubs(g, 'B').length).toBe(10);
      expect(divisionClubs(g, 'C').length).toBe(10);
    }
  });
});

describe('temporada', () => {
  it('cada club juega 18 fechas y la tabla suma bien', () => {
    const g = createGame({ seed: 7 });
    while (g.round <= 18) playRound(g);
    for (const d of ['A', 'B'] as const) {
      const t = standings(g, d);
      expect(t).toHaveLength(10);
      for (const r of t) {
        expect(r.pj).toBe(18);
        expect(r.pg + r.pe + r.pp).toBe(18);
        expect(r.pts).toBe(r.pg * 4 + r.pe * 2 + r.bo + r.bd);
      }
    }
  });

  it('playoffs: semis 1 vs 4 y 2 vs 3, final en la cancha del mejor ubicado', () => {
    const g = createGame({ seed: 99 });
    while (g.round <= 18) playRound(g);
    const t = standings(g, 'A').map((r) => r.clubId);
    const semis = g.fixtures.filter((f) => f.comp === 'SEMI');
    expect(semis.map((f) => [f.home, f.away])).toEqual([[t[0], t[3]], [t[1], t[2]]]);
    const tb = standings(g, 'B').map((r) => r.clubId);
    const promos = g.fixtures.filter((f) => f.comp === 'PROMO1');
    expect(promos.map((f) => [f.home, f.away])).toEqual([[tb[2], t[7]], [tb[3], t[6]]]);
    playRound(g);
    const fin = g.fixtures.find((f) => f.comp === 'FINAL')!;
    expect(t.indexOf(fin.home)).toBeLessThan(t.indexOf(fin.away));
    const p2 = g.fixtures.filter((f) => f.comp === 'PROMO2');
    expect(p2.map((f) => f.home)).toEqual([t[7], t[6]]);
    playRound(g);
    expect(g.round).toBe(LAST_ROUND + 1);
    expect(g.phase).toBe('fin');
  });

  it('ascensos y descensos: suben 2 y bajan 2 directo, y dos repechajes definen el resto', () => {
    const g = createGame({ seed: 5 });
    const tA = () => standings(g, 'A').map((r) => r.clubId);
    while (g.round <= 18) playRound(g);
    const a = tA();
    const b = standings(g, 'B').map((r) => r.clubId);
    playSeason(g);
    const rec = g.history[0];
    expect(rec.asciende.length).toBe(rec.desciende.length);
    expect(rec.asciende.slice(0, 2)).toEqual([b[0], b[1]]);
    expect(rec.desciende.slice(0, 2)).toEqual([a[9], a[8]]);
    expect(rec.asciende.length).toBeGreaterThanOrEqual(2);
    expect(rec.asciende.length).toBeLessThanOrEqual(4);
    expect(rec.repechajes!.filter((r) => r.cual === 'A')).toHaveLength(2);
    expect(rec.repechajes!.filter((r) => r.cual === 'C')).toHaveLength(2);
    startNextSeason(g);
    for (const id of rec.asciende) expect(g.clubs[id].division).toBe('A');
    for (const id of rec.desciende) expect(g.clubs[id].division).toBe('B');
    // Entre la B y la C pasa lo mismo.
    expect(rec.campeonC).toBeDefined();
    expect(rec.ascC!.length).toBe(rec.descB!.length);
    for (const id of rec.ascC!) expect(g.clubs[id].division).toBe('B');
    for (const id of rec.descB!) expect(g.clubs[id].division).toBe('C');
    expect(g.fixtures.filter((f) => f.comp === 'C').length).toBe(90);
    expect(g.temporada).toBe(2028);
    expect(g.fixtures.filter((f) => f.comp === 'A' || f.comp === 'B').length).toBe(180);
    expect(g.fixtures.filter((f) => f.comp === 'COPA').length).toBe(8);
  });

  it('es reproducible con la misma semilla', () => {
    const a = createGame({ seed: 42 });
    const b = createGame({ seed: 42 });
    playRound(a);
    playRound(b);
    expect(JSON.stringify(a.fixtures)).toBe(JSON.stringify(b.fixtures));
  });

  it('el relato del partido del usuario tiene inicio, entretiempo y final', () => {
    const g = createGame({ seed: 3 });
    const rep = playRound(g);
    const ev = rep.userFixture!.result!.events!;
    expect(ev[0].kind).toBe('inicio');
    expect(ev.some((e) => e.kind === 'entretiempo')).toBe(true);
    expect(ev[ev.length - 1].kind).toBe('final');
    const last = ev[ev.length - 1];
    expect(last.scoreH).toBe(rep.userFixture!.result!.ptsH);
    expect(last.scoreA).toBe(rep.userFixture!.result!.ptsA);
  });
});
