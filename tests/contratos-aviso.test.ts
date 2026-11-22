import { describe, it, expect } from 'vitest';
import { createGame, playRound } from '../src/engine/game';
import { AVISO_CONTRATO_FECHA, contratosPorVencer, dejarIr, renew } from '../src/engine/club';

describe('aviso de contratos', () => {
  it('avisa desde la fecha 10 y deja de avisar al decidir', () => {
    const g = createGame({ seed: 7, userClubIndex: 2 });
    const c = g.clubs[g.userClubId];
    const [a, b] = c.plantel.map((id) => g.players[id]).filter((p) => !p.estrella);
    a.contrato = 1;
    b.contrato = 1;
    expect(contratosPorVencer(g)).toHaveLength(0);
    while (g.round < AVISO_CONTRATO_FECHA) playRound(g);
    const lista = contratosPorVencer(g).map((p) => p.id);
    expect(lista).toContain(a.id);
    expect(lista).toContain(b.id);
    renew(g, a.id, 2);
    dejarIr(g, b.id);
    const despues = contratosPorVencer(g).map((p) => p.id);
    expect(despues).not.toContain(a.id);
    expect(despues).not.toContain(b.id);
  });
});
