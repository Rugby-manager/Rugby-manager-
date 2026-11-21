import { describe, it, expect } from 'vitest';
import { choosePreseason, createGame, playRound, standings, startNextSeason, startUserMatch, userFixture } from '../src/engine/game';
import { preseasonPending } from '../src/engine/preseason';

describe('pretemporada', () => {
  it('ofrece 3 torneos amistosos y no arranca la liga hasta jugarlos', () => {
    const g = createGame({ seed: 41, userClubIndex: 2, modo: 'libre', amistosos: true });
    expect(g.pretemporada!.propuestas).toHaveLength(3);
    for (const p of g.pretemporada!.propuestas) {
      expect(p.rivales).toHaveLength(3);
      expect(new Set(p.rivales).size).toBe(3);
      expect(p.rivales).not.toContain(g.userClubId);
    }
    expect(() => playRound(g)).toThrow();
    const caja = g.clubs[g.userClubId].presupuesto;
    choosePreseason(g, 1);
    expect(userFixture(g)!.comp).toBe('AMISTOSO');
    // El primero se juega en vivo, como cualquier partido.
    const m = startUserMatch(g)!;
    m.live.runToEnd();
    playRound(g, m.live.result());
    playRound(g);
    playRound(g);
    expect(preseasonPending(g)).toBe(false);
    expect(g.round).toBe(1);
    expect(g.clubs[g.userClubId].presupuesto).toBeGreaterThan(caja);
    // Los amistosos no suman en la tabla ni en las estadísticas.
    expect(standings(g, g.clubs[g.userClubId].division).every((r) => r.pj === 0)).toBe(true);
    expect(Object.values(g.players).every((p) => p.temporada.partidos === 0)).toBe(true);
    expect(userFixture(g)!.comp).not.toBe('AMISTOSO');
    playRound(g);
    expect(g.round).toBe(2);
  });

  it('vuelve a haber pretemporada cada temporada', () => {
    const g = createGame({ seed: 42, modo: 'libre', amistosos: true });
    g.pretemporada!.terminada = true;
    while (g.phase !== 'fin') playRound(g);
    startNextSeason(g);
    expect(preseasonPending(g)).toBe(true);
    expect(g.pretemporada!.temporada).toBe(2028);
  });
});
