import { describe, it, expect } from 'vitest';
import { createGame, playRound, startNextSeason } from '../src/engine/game';
import { canLoanIn, loanIn, loanOut, prestables, toggleTransferible, transferibles } from '../src/engine/loans';
import { askingPrice, canSell } from '../src/engine/market';
import { marketValue } from '../src/engine/players';
import { Rng } from '../src/engine/rng';

describe('transferibles, préstamos y lesiones', () => {
  it('los clubes ponen jugadores en la lista de transferibles, más baratos', () => {
    const g = createGame({ seed: 60, modo: 'libre' });
    const t = transferibles(g);
    expect(t.length).toBeGreaterThan(10);
    for (const p of t.slice(0, 5)) expect(askingPrice(p)).toBeLessThan(marketValue(p));
    const mine = g.clubs[g.userClubId].plantel[20];
    toggleTransferible(g, mine);
    expect(g.players[mine].transferible).toBe(true);
  });

  it('pedir y ceder a préstamo; al terminar la temporada vuelven', () => {
    const g = createGame({ seed: 61, modo: 'libre' });
    const user = g.clubs[g.userClubId];
    const pin = prestables(g).find((p) => canLoanIn(g, p.id).ok)!;
    const origen = pin.clubId!;
    loanIn(g, pin.id);
    expect(pin.clubId).toBe(user.id);
    expect(canSell(g, pin.id).ok).toBe(false);
    const out = user.plantel.map((id) => g.players[id]).find((p) => !p.prestamo && !user.xv.includes(p.id) && p.pos === 'PIL')!;
    loanOut(g, out.id, new Rng(1));
    expect(out.clubId).not.toBe(user.id);
    while (g.phase !== 'fin') playRound(g);
    startNextSeason(g);
    expect(pin.clubId).toBe(origen);
    expect(pin.prestamo).toBeUndefined();
    expect(out.clubId).toBe(user.id);
    expect(out.historia!.length).toBe(1);
  });

  it('los lesionados tienen el nombre de su lesión', () => {
    const g = createGame({ seed: 62, modo: 'libre' });
    for (let i = 0; i < 8; i++) playRound(g);
    const les = Object.values(g.players).filter((p) => p.lesion > 0);
    expect(les.length).toBeGreaterThan(0);
    expect(les.every((p) => !!p.lesionTipo)).toBe(true);
  });
});
