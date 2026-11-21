import { describe, it, expect } from 'vitest';
import { createGame, playRound } from '../src/engine/game';
import { acceptOffer, counterOffer, generateOffers, ofertasVigentes, rejectOffer } from '../src/engine/offers';
import { Rng } from '../src/engine/rng';

describe('ofertas por tus jugadores', () => {
  it('llegan ofertas durante la temporada y vencen', () => {
    const g = createGame({ seed: 31, userClubIndex: 0, modo: 'libre' });
    let vistas = 0;
    while (g.round <= 12) {
      playRound(g);
      vistas += ofertasVigentes(g).length;
      for (const o of ofertasVigentes(g)) expect(g.round - o.fecha).toBeLessThan(3);
    }
    expect(vistas).toBeGreaterThan(0);
  });

  it('aceptar vende al club que ofertó y cobra la plata', () => {
    const g = createGame({ seed: 32, userClubIndex: 0, modo: 'libre' });
    const rng = new Rng(3);
    while (!ofertasVigentes(g).some((x) => !x.exterior)) generateOffers(g, rng);
    const o = ofertasVigentes(g).find((x) => !x.exterior)!;
    const antes = g.clubs[g.userClubId].presupuesto;
    acceptOffer(g, o.id);
    expect(g.players[o.playerId].clubId).toBe(o.clubId);
    expect(g.clubs[g.userClubId].presupuesto).toBe(antes + o.monto);
    expect(g.clubs[g.userClubId].plantel).not.toContain(o.playerId);
  });

  it('contraofertar: dentro del máximo aceptan, muy arriba se van, y solo una vez', () => {
    const g = createGame({ seed: 33, userClubIndex: 0, modo: 'libre' });
    const rng = new Rng(4);
    while (ofertasVigentes(g).length < 2) generateOffers(g, rng);
    const [a, b] = ofertasVigentes(g);
    expect(counterOffer(g, a.id, a.max).ok).toBe(true);
    expect(a.monto).toBe(a.max);
    expect(() => counterOffer(g, a.id, a.max * 2)).toThrow();
    expect(counterOffer(g, b.id, b.max * 3).ok).toBe(false);
    expect(ofertasVigentes(g).find((x) => x.id === b.id)).toBeUndefined();
    rejectOffer(g, a.id);
    expect(ofertasVigentes(g).length).toBe(0);
  });

  it('de Europa se llevan a tus figuras; si no los dejás ir, se bajonean', () => {
    const g = createGame({ seed: 35, userClubIndex: 0, modo: 'libre' });
    const rng = new Rng(9);
    let guard = 0;
    while (ofertasVigentes(g).filter((o) => o.exterior).length < 2 && guard++ < 500) generateOffers(g, rng);
    const [a, b] = ofertasVigentes(g).filter((o) => o.exterior);
    expect(a).toBeDefined();
    const moral = g.players[b.playerId].moral;
    rejectOffer(g, b.id);
    expect(g.players[b.playerId].moral).toBeLessThan(moral);
    const antes = g.clubs[g.userClubId].presupuesto;
    acceptOffer(g, a.id);
    expect(g.players[a.playerId]).toBeUndefined();
    expect(g.clubs[g.userClubId].plantel).not.toContain(a.playerId);
    expect(g.clubs[g.userClubId].presupuesto).toBe(antes + a.monto);
  });
});
