import { describe, it, expect } from 'vitest';
import { createGame, playRound, startNextSeason, standings } from '../src/engine/game';
import { tablaIntl } from '../src/engine/internacional';
import type { GameState } from '../src/engine/types';

const jugarTemporada = (g: GameState) => {
  let guard = 0;
  while (g.phase !== 'fin' && guard++ < 80) playRound(g);
};
const extranjeros = (g: GameState) => Object.values(g.clubs).filter((c) => c.division === 'X');

describe('Copa Cruz del Sur', () => {
  it('el campeón de la A juega con 3 clubes de afuera, hay final y después se van', () => {
    const g = createGame({ seed: 77, userClubIndex: 0, modo: 'libre' });
    expect(extranjeros(g)).toHaveLength(0);
    jugarTemporada(g);
    // Hacemos campeón al usuario para ver los premios.
    g.history[g.history.length - 1].campeonA = g.userClubId;
    const caja0 = g.clubs[g.userClubId].presupuesto;
    startNextSeason(g);
    const xs = extranjeros(g);
    expect(xs).toHaveLength(3);
    expect(new Set(xs.map((c) => c.pais)).size).toBe(3);
    expect(xs.every((c) => c.plantel.length >= 23)).toBe(true);
    expect(g.fixtures.filter((f) => f.comp === 'INTL')).toHaveLength(6);
    expect(g.news.some((n) => n.titulo.includes('Cruz del Sur'))).toBe(true);
    expect(g.caja.some((m) => m.concepto.includes('Cruz del Sur'))).toBe(true);
    expect(g.clubs[g.userClubId].presupuesto).not.toBe(caja0);
    // Los de afuera no aparecen en la tabla de ninguna categoría.
    for (const d of ['A', 'B', 'C'] as const) expect(standings(g, d).some((r) => g.clubs[r.clubId].division === 'X')).toBe(false);

    jugarTemporada(g);
    const t = tablaIntl(g);
    expect(t).toHaveLength(4);
    expect(t.every((r) => r.pj === 3)).toBe(true);
    const final = g.fixtures.find((f) => f.comp === 'INTL' && f.etapa === 3);
    expect(final?.result).toBeTruthy();
    expect([final!.home, final!.away].sort()).toEqual([t[0].clubId, t[1].clubId].sort());
    expect(g.history[g.history.length - 1].campeonIntl).toBeTruthy();

    const viejos = xs.map((c) => c.id);
    const jugadoresViejos = xs.flatMap((c) => c.plantel);
    startNextSeason(g);
    for (const id of viejos) expect(g.clubs[id]).toBeUndefined();
    for (const id of jugadoresViejos) expect(g.players[id]).toBeUndefined();
    // La temporada nueva tiene otra copa con el nuevo campeón.
    expect(extranjeros(g)).toHaveLength(3);
    jugarTemporada(g);
    expect(g.phase).toBe('fin');
  });
});
