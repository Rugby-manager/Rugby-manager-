import { describe, it, expect } from 'vitest';
import { createGame } from '../src/engine/game';
import { charlar, describirEvento, puedeCharlar, resolverEvento } from '../src/engine/vestuario';

describe('charlas individuales', () => {
  it('una charla por jugador cada 3 fechas y prometer minutos crea la promesa', () => {
    const g = createGame({ seed: 51, userClubIndex: 2 });
    const c = g.clubs[g.userClubId];
    const sup = c.plantel.find((id) => !c.xv.includes(id))!;
    expect(puedeCharlar(g, g.players[sup])).toBe(true);
    charlar(g, sup, 'minutos');
    expect(g.promesas?.some((x) => x.playerId === sup)).toBe(true);
    expect(puedeCharlar(g, g.players[sup])).toBe(false);
    expect(() => charlar(g, sup, 'felicitar')).toThrow();
  });
  it('el pedido de aumento sube el sueldo si aceptás', () => {
    const g = createGame({ seed: 52, userClubIndex: 2 });
    const c = g.clubs[g.userClubId];
    const id = c.xv[0]!;
    const antes = g.players[id].sueldo;
    g.vestuario = { id: 'v1', tipo: 'aumento', players: [id], round: g.round };
    expect(describirEvento(g, g.vestuario).opciones.length).toBe(3);
    resolverEvento(g, 0);
    expect(g.players[id].sueldo).toBeGreaterThan(antes);
  });
});
