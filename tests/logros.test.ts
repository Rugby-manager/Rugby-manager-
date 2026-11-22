import { describe, it, expect } from 'vitest';
import { createGame, playRound, startNextSeason } from '../src/engine/game';
import { sumarAlClub } from '../src/engine/logros';

describe('logros y salón de la fama', () => {
  it('se ganan logros jugando y las leyendas entran al salón', () => {
    const g = createGame({ seed: 71, userClubIndex: 0 });
    while (g.phase !== 'fin') playRound(g);
    expect(g.dt!.partidos).toBeGreaterThan(10);
    expect(g.logros!.some((l) => l.id === 'debut')).toBe(true);
    startNextSeason(g);
    const p = g.players[g.clubs[g.userClubId].plantel[0]];
    p.temporada.partidos = 45;
    sumarAlClub(g, p);
    expect(g.salonFama!.some((x) => x.playerId === p.id)).toBe(true);
  });
});
