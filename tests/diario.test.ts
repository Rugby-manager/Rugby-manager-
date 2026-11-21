import { describe, it, expect } from 'vitest';
import { createGame, playRound, userFixture } from '../src/engine/game';
import { conferenciaPendiente, responderPrensa } from '../src/engine/diario';
import { isDerby } from '../src/engine/extras';

describe('diario del club', () => {
  it('cada fecha sale una edición con titulares y al final hay premios', () => {
    const g = createGame({ seed: 41, userClubIndex: 0, modo: 'libre' });
    playRound(g);
    expect(g.diario?.[0]?.titulares.length).toBeGreaterThan(0);
    let guard = 0;
    while (g.phase !== 'fin' && guard++ < 60) {
      if (conferenciaPendiente(g)) responderPrensa(g, 1);
      playRound(g);
    }
    expect(g.phase).toBe('fin');
    const p = g.premios?.[0];
    expect(p?.temporada).toBe(g.temporada);
    expect(p?.premios.some((x) => x.premio.startsWith('Mejor jugador de la A'))).toBe(true);
    expect(g.prensa).toBeDefined();
  });

  it('antes del clásico hay conferencia de prensa y la respuesta mueve la moral', () => {
    const g = createGame({ seed: 42, userClubIndex: 0, modo: 'libre' });
    let guard = 0;
    while (guard++ < 20) {
      const f = userFixture(g);
      if (f && isDerby(g.clubs[f.home], g.clubs[f.away])) break;
      playRound(g);
    }
    expect(conferenciaPendiente(g)).not.toBeNull();
    const club = g.clubs[g.userClubId];
    const antes = club.plantel.reduce((s, id) => s + g.players[id].moral, 0);
    responderPrensa(g, 1);
    const despues = club.plantel.reduce((s, id) => s + g.players[id].moral, 0);
    expect(despues).toBeGreaterThan(antes);
    expect(conferenciaPendiente(g)).toBeNull();
  });
});
