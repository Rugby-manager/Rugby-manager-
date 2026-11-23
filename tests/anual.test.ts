import { describe, it, expect } from 'vitest';
import { createGame, playRound, startNextSeason } from '../src/engine/game';
import { FECHAS_TEMPORADA, fechasRestantes, saldarGastos } from '../src/engine/club';
import { buyPlayer, canBuy, sellPlayer, canSell, signingWage } from '../src/engine/market';
import { Rng } from '../src/engine/rng';

describe('presupuesto anual', () => {
  it('no se descuentan sueldos por fecha: la caja solo sube con entradas y premios', () => {
    const g = createGame({ seed: 61, userClubIndex: 25 });
    const c = g.clubs[g.userClubId];
    expect(c.cuentaAnual?.fechas).toBe(FECHAS_TEMPORADA);
    let antes = c.presupuesto;
    for (let i = 0; i < 6; i++) {
      playRound(g);
      expect(c.presupuesto).toBeGreaterThanOrEqual(antes);
      antes = c.presupuesto;
    }
    expect(g.caja.some((m) => m.concepto === 'Sueldos del plantel')).toBe(false);
  });

  it('fichar paga el sueldo de lo que queda y vender lo devuelve', () => {
    const g = createGame({ seed: 62, userClubIndex: 12 });
    const c = g.clubs[g.userClubId];
    c.presupuesto = 400_000_000;
    for (let i = 0; i < 4; i++) playRound(g);
    const n = fechasRestantes(g);
    expect(n).toBeGreaterThan(0);
    const p = Object.values(g.players).find((x) => x.clubId && x.clubId !== c.id && g.clubs[x.clubId].division !== 'X' && canBuy(g, x.id).ok)!;
    const precio = canBuy(g, p.id).price;
    const sueldo = signingWage(p, g);
    const antes = c.presupuesto;
    buyPlayer(g, p.id);
    saldarGastos(g);
    expect(c.presupuesto).toBe(antes - precio - sueldo * n);
    const chk = canSell(g, p.id);
    if (chk.ok) {
      const a2 = c.presupuesto;
      sellPlayer(g, p.id, new Rng(3));
      saldarGastos(g);
      expect(c.presupuesto).toBe(a2 + chk.price + sueldo * n);
    }
  });

  it('cada temporada nueva cobra y paga el año entero de una', () => {
    const g = createGame({ seed: 63, userClubIndex: 25 });
    while (g.phase !== 'fin') playRound(g);
    startNextSeason(g);
    const c = g.clubs[g.userClubId];
    expect(c.cuentaAnual?.temporada).toBe(g.temporada);
    expect(g.caja.filter((m) => m.concepto.includes('toda la temporada') && m.temporada === g.temporada).length).toBeGreaterThanOrEqual(3);
  });
});
