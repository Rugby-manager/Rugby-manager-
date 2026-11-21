import { describe, it, expect } from 'vitest';
import { createGame, playRound } from '../src/engine/game';
import { describirEvento, resolverEvento } from '../src/engine/vestuario';

describe('vestuario vivo', () => {
  it('en una temporada pasan cosas en el vestuario y se pueden resolver', () => {
    const g = createGame({ seed: 51, userClubIndex: 3, modo: 'libre' });
    const tipos = new Set<string>();
    let guard = 0;
    while (g.phase !== 'fin' && guard++ < 60) {
      if (g.vestuario) {
        tipos.add(g.vestuario.tipo);
        const d = describirEvento(g, g.vestuario);
        expect(d.opciones).toHaveLength(3);
        resolverEvento(g, guard % 3);
        expect(g.vestuario).toBeNull();
      }
      playRound(g);
    }
    expect(tipos.size).toBeGreaterThan(0);
  });

  it('si prometés minutos y no lo ponés, se enoja y pide irse', () => {
    const g = createGame({ seed: 52, userClubIndex: 0, modo: 'libre' });
    const club = g.clubs[g.userClubId];
    const p = g.players[club.plantel.find((id) => !club.xv.includes(id))!];
    g.vestuario = { id: 'v1', tipo: 'minutos', players: [p.id], round: g.round };
    resolverEvento(g, 0);
    expect(g.promesas).toHaveLength(1);
    // Que no juegue: lo sacamos del plantel disponible con una lesión larga.
    p.lesion = 10;
    for (let i = 0; i < 4; i++) playRound(g);
    expect(p.transferible).toBe(true);
    expect(g.news.some((n) => n.texto.includes('le prometiste minutos'))).toBe(true);
  });
});
