import { describe, it, expect } from 'vitest';
import { createGame, playRound, startNextSeason, standings } from '../src/engine/game';
import { firstOffers, makeObjective, repMax, switchClub } from '../src/engine/career';
import type { GameState } from '../src/engine/types';

function careerGame(seed: number) {
  const base = createGame({ seed, modo: 'carrera' });
  const start = firstOffers(base)[0];
  return createGame({ seed, modo: 'carrera', userClubIndex: Number(start.slice(1)) });
}

/** Un "jugador automático" que acepta la primera oferta cuando lo echan. */
function advance(g: GameState) {
  if (g.career.despedido) {
    expect(g.career.ofertas.length).toBeGreaterThan(0);
    switchClub(g, g.career.ofertas[0].clubId);
  }
  if (g.phase === 'fin') startNextSeason(g);
  else playRound(g);
}

describe('modo carrera', () => {
  it('un desconocido solo recibe ofertas de los clubes más chicos de Primera C', () => {
    const g = createGame({ seed: 1, modo: 'carrera' });
    const offers = firstOffers(g);
    expect(offers).toHaveLength(3);
    const reps = Object.values(g.clubs).filter((c) => c.division === 'C').map((c) => c.reputacion).sort((a, b) => a - b);
    for (const id of offers) {
      expect(g.clubs[id].division).toBe('C');
      expect(g.clubs[id].reputacion).toBeLessThanOrEqual(reps[2]);
    }
  });

  it('cada club tiene un objetivo según su tamaño', () => {
    const g = createGame({ seed: 2 });
    const big = Object.values(g.clubs).filter((c) => c.division === 'A').sort((a, b) => b.reputacion - a.reputacion)[0];
    const small = Object.values(g.clubs).filter((c) => c.division === 'B').sort((a, b) => a.reputacion - b.reputacion)[0];
    expect(makeObjective(g, big).tipo).toBe('campeon');
    expect(makeObjective(g, small).tipo).toBe('tranquila');
  });

  it('si la directiva pierde la confianza, te echa y te llegan ofertas', () => {
    const g = careerGame(3);
    g.career.confianza = 9;
    // Equipo destruido: todos sin energía para que pierda.
    for (const id of g.clubs[g.userClubId].plantel) g.players[id].energia = 1;
    let rounds = 0;
    while (!g.career.despedido && rounds < 16) {
      g.career.confianza = Math.min(g.career.confianza, 9);
      playRound(g);
      rounds++;
    }
    expect(g.career.despedido).toBe(true);
    expect(() => playRound(g)).toThrow();
    const old = g.userClubId;
    const offer = g.career.ofertas[0].clubId;
    switchClub(g, offer);
    expect(g.userClubId).toBe(offer);
    expect(g.userClubId).not.toBe(old);
    expect(g.career.despedido).toBe(false);
    playRound(g);
  });

  it('el modo libre nunca te echa', () => {
    const g = createGame({ seed: 4, modo: 'libre' });
    for (let s = 0; s < 3; s++) {
      while (g.phase !== 'fin') {
        g.career.confianza = 0;
        playRound(g);
      }
      expect(g.career.despedido).toBe(false);
      expect(g.career.ofertas).toHaveLength(0);
      startNextSeason(g);
    }
  });

  it('se puede jugar una carrera larga sin trabarse y el prestigio se mueve', () => {
    const g = careerGame(5);
    let steps = 0;
    while (g.temporada < 2037 && steps < 400) {
      advance(g);
      steps++;
    }
    expect(g.temporada).toBe(2037);
    expect(g.career.historial.length).toBeGreaterThanOrEqual(10);
    expect(g.clubs[g.userClubId]).toBeTruthy();
    const t = standings(g, g.clubs[g.userClubId].division);
    expect(t.some((r) => r.clubId === g.userClubId)).toBe(true);
  });

  it('con más prestigio te llaman clubes más grandes', () => {
    expect(repMax(80)).toBeGreaterThan(repMax(5) + 15);
  });
});
