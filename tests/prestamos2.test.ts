import { describe, it, expect } from 'vitest';
import { createGame, playRound, startNextSeason } from '../src/engine/game';
import { canLoanOut, loanIn, loanOut, prestables, toggleListaPrestamo } from '../src/engine/loans';
import { generateOffers, acceptOffer } from '../src/engine/offers';
import { Rng } from '../src/engine/rng';
import { overall } from '../src/engine/players';

const terminar = (g: ReturnType<typeof createGame>) => {
  while (g.phase !== 'fin') playRound(g);
  startNextSeason(g);
};

describe('préstamos de dos temporadas', () => {
  it('el que llega por dos temporadas se queda un año más y después vuelve', () => {
    const g = createGame({ seed: 33, userClubIndex: 4 });
    g.clubs[g.userClubId].presupuesto = 500_000_000;
    const p = prestables(g).find((x) => x.edad <= 26 && overall(x) < 75)!;
    const dueño = p.clubId!;
    loanIn(g, p.id, 2);
    terminar(g);
    expect(g.players[p.id].clubId).toBe(g.userClubId);
    terminar(g);
    // Vuelve a su club (si no lo vendieron a Europa en el medio).
    const q = g.players[p.id];
    if (q) expect(q.clubId).toBe(dueño);
    expect(q?.prestamo).toBeUndefined();
  });

  it('el que cedés por una temporada vuelve al final', () => {
    const g = createGame({ seed: 34, userClubIndex: 4 });
    const c = g.clubs[g.userClubId];
    const p = c.plantel.map((id) => g.players[id]).find((x) => !c.xv.includes(x.id) && x.edad <= 26 && overall(x) < 75 && canLoanOut(g, x.id).ok)!;
    loanOut(g, p.id, new Rng(1), 1);
    expect(p.clubId).not.toBe(c.id);
    terminar(g);
    expect(g.players[p.id].clubId).toBe(c.id);
  });

  it('los de la lista de préstamos reciben pedidos de cesión', () => {
    const g = createGame({ seed: 35, userClubIndex: 4 });
    const c = g.clubs[g.userClubId];
    const p = c.plantel.map((id) => g.players[id]).find((x) => !c.xv.includes(x.id) && canLoanOut(g, x.id).ok)!;
    toggleListaPrestamo(g, p.id);
    const rng = new Rng(9);
    let o;
    for (let i = 0; i < 30 && !o; i++) {
      g.ofertas = [];
      o = generateOffers(g, rng).find((x) => x.prestamo && x.playerId === p.id);
    }
    expect(o).toBeTruthy();
    acceptOffer(g, o!.id);
    expect(p.clubId).toBe(o!.clubId);
    expect(p.prestamo?.clubId).toBe(c.id);
  });
});
