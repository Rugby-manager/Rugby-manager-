import { describe, it, expect } from 'vitest';
import { createGame, startUserMatch } from '../src/engine/game';
import { bancoEfectivo, benchOf } from '../src/engine/players';

describe('banco elegido por el DT', () => {
  it('sin elegir, lo arma el ayudante', () => {
    const g = createGame({ seed: 7, userClubIndex: 3 });
    const c = g.clubs[g.userClubId];
    const b = bancoEfectivo(c, g.players, c.xv);
    expect(b).toHaveLength(8);
    expect(b.every((l) => l.auto && l.id)).toBe(true);
  });

  it('respeta a los que elige y completa los que no pueden jugar', () => {
    const g = createGame({ seed: 7, userClubIndex: 3 });
    const c = g.clubs[g.userClubId];
    const resto = c.plantel.filter((id) => !c.xv.includes(id) && g.players[id].lesion === 0);
    // El peor del plantel en la 16, y en la 17 uno lesionado.
    const peor = [...resto].sort((a, b) => g.players[a].attrs.velocidad - g.players[b].attrs.velocidad)[0];
    const lesi = resto.find((id) => id !== peor)!;
    g.players[lesi].lesion = 3;
    c.banco = [peor, lesi, null, null, null, null, null, null];
    const b = bancoEfectivo(c, g.players, c.xv);
    expect(b[0]).toEqual({ id: peor, auto: false });
    expect(b[1].auto).toBe(true);
    expect(b[1].id).not.toBe(lesi);
    expect(new Set(b.map((l) => l.id)).size).toBe(8);
    expect(benchOf(c, g.players, c.xv)[0]).toBe(peor);
  });

  it('en el partido salen los suplentes que eligió', () => {
    const g = createGame({ seed: 7, userClubIndex: 3 });
    const c = g.clubs[g.userClubId];
    const resto = c.plantel.filter((id) => !c.xv.includes(id) && g.players[id].lesion === 0);
    const elegidos = resto.slice(-8);
    c.banco = elegidos;
    const m = startUserMatch(g);
    expect(m).not.toBeNull();
    const k = m!.fixture.home === g.userClubId ? 'H' : 'A';
    const banco = (m!.live as any).formaciones[k].banco;
    expect(banco).toEqual(elegidos);
  });
});
