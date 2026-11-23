import { describe, it, expect } from 'vitest';
import { createGame, playRound, startNextSeason } from '../src/engine/game';
import { AYUDAS } from '../src/engine/ayuda';
import { overall } from '../src/engine/players';
import { switchClub } from '../src/engine/career';

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
    expect(nuevo.estrella).toBe(true);
  });

  it('la estrella siempre juega en su puesto', async () => {
    const { SHIRT_POS } = await import('../src/engine/players');
    for (const i of [0, 3, 12, 20, 25, 28]) for (let seed = 1; seed < 8; seed++) {
      const g = createGame({ seed, userClubIndex: i, ayuda: 'estrella' });
      const c = club(g);
      const id = c.plantel[c.plantel.length - 1];
      const idx = c.xv.indexOf(id);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(SHIRT_POS[idx]).toBe(g.players[id].pos);
      expect(new Set(c.xv.filter(Boolean)).size).toBe(c.xv.filter(Boolean).length);
    }
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
  it('la estrella se queda toda la carrera salvo que la vendas', () => {
    const g = createGame({ seed: 91, modo: 'carrera', userClubIndex: 25, ayuda: 'estrella' });
    const id = club(g).plantel[club(g).plantel.length - 1];
    g.players[id].contrato = 1;
    // Que no lo echen (esto prueba a la estrella, no a la comisión directiva).
    g.career.objetivo = { tipo: 'tranquila', puesto: 10, texto: 'Una temporada tranquila' };
    g.directiva!.estilo = 'paciente';
    for (let i = 0; i < 80 && g.phase !== 'fin'; i++) {
      if (g.career?.despedido) break;
      playRound(g);
      expect((g.ofertas ?? []).some((o) => o.playerId === id)).toBe(false);
    }
    if (g.phase === 'fin') startNextSeason(g);
    expect(g.players[id]?.clubId).toBe(g.userClubId);
    expect(g.players[id].contrato).toBeGreaterThan(0);
    const otro = Object.values(g.clubs).find((c) => c.id !== g.userClubId && c.division === 'B')!;
    switchClub(g, otro.id);
    expect(otro.plantel).toContain(id);
    expect(otro.xv).toContain(id);
  });
});
