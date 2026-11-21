import { describe, it, expect } from 'vitest';
import { createGame, playRound } from '../src/engine/game';
import { AYUDAS } from '../src/engine/ayuda';
import { overall } from '../src/engine/players';

describe('ayuda inicial', () => {
  const base = createGame({ seed: 71, userClubIndex: 4 });
  const club = (g: ReturnType<typeof createGame>) => g.clubs[g.userClubId];

  it('plata suma presupuesto', () => {
    const g = createGame({ seed: 71, userClubIndex: 4, ayuda: 'plata' });
    expect(club(g).presupuesto).toBeGreaterThan(club(base).presupuesto + 30_000_000);
  });

  it('el jugador estrella es el mejor del plantel o casi', () => {
    const g = createGame({ seed: 71, userClubIndex: 4, ayuda: 'estrella' });
    expect(club(g).plantel.length).toBe(club(base).plantel.length + 1);
    const nuevo = g.players[club(g).plantel[club(g).plantel.length - 1]];
    const mejor = Math.max(...club(base).plantel.map((id) => overall(base.players[id])));
    expect(overall(nuevo)).toBeGreaterThan(85);
    expect(nuevo.edad).toBeLessThanOrEqual(26);
    expect(overall(nuevo)).toBeGreaterThan(mejor);
    expect(g.ayudaAviso?.playerId).toBe(nuevo.id);
    expect(club(g).xv).toContain(nuevo.id);
  });

  it('estadio, staff, cantera y paciencia', () => {
    const e = createGame({ seed: 71, userClubIndex: 4, ayuda: 'estadio' });
    expect(club(e).inst.tribunas).toBeGreaterThan(club(base).inst.tribunas);
    const s = createGame({ seed: 71, userClubIndex: 4, ayuda: 'staff' });
    expect(club(s).staffPersonas?.ayudante?.estrellas).toBe(4);
    const c = createGame({ seed: 71, userClubIndex: 4, ayuda: 'cantera' });
    const pibes = club(c).plantel.map((id) => c.players[id]).filter((p) => p.edad === 17 && p.potencial >= 86);
    expect(pibes.length).toBe(3);
    const p = createGame({ seed: 71, modo: 'carrera', userClubIndex: 25, ayuda: 'paciencia' });
    expect(p.career.confianza).toBe(100);
  });

  it('todas las ayudas dejan jugar la temporada', () => {
    for (const a of AYUDAS) {
      const g = createGame({ seed: 72, userClubIndex: 2, ayuda: a.id });
      for (let i = 0; i < 3; i++) playRound(g);
      expect(g.round).toBeGreaterThan(3);
    }
  });
});
