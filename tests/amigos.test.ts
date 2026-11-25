import { describe, expect, it } from 'vitest';
import { createGame, migrate } from '../src/engine/game';
import { overall } from '../src/engine/players';
import { AMIGOS } from '../src/engine/amigos';

describe('amigos de Luca', () => {
  it('están todos en Deportivo Camet y Luca Satti es el mejor del juego', () => {
    for (const seed of [1, 2, 3]) {
      const g = createGame({ seed });
      const camet = Object.values(g.clubs).find((c) => c.codigo === 'LAG')!;
      const amigos = Object.values(g.players).filter((p) => p.amigo);
      expect(amigos.length).toBe(AMIGOS.length);
      for (const p of amigos) expect(g.clubs[p.clubId!].codigo).toBe(AMIGOS.find((a) => `${a.nombre} ${a.apellido}` === p.amigo)!.club);
      expect(camet.plantel.filter((id) => g.players[id].amigo).length).toBe(11);
      const luca = amigos.find((p) => p.amigo === 'Luca Satti')!;
      expect(luca.pos).toBe('MSC');
      const otros = Object.values(g.players).filter((p) => p !== luca).map(overall);
      expect(overall(luca)).toBeGreaterThan(Math.max(...otros));
      expect(camet.xv).toContain(luca.id);
    }
  });
  it('una partida vieja los recibe una sola vez', () => {
    const g = createGame({ seed: 5 });
    for (const p of Object.values(g.players)) delete p.amigo;
    g.version = 22;
    migrate(g);
    migrate(g);
    expect(Object.values(g.players).filter((p) => p.amigo).length).toBe(AMIGOS.length);
  });
});
