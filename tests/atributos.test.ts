import { describe, it, expect } from 'vitest';
import { createGame, migrate, playRound } from '../src/engine/game';
import { ATTR_KEYS, W, overall } from '../src/engine/players';

describe('atributos nuevos', () => {
  it('cada puesto suma 1 en sus pesos y los jugadores tienen los 16 atributos', () => {
    for (const w of Object.values(W)) expect(Object.values(w).reduce((a, b) => a + b!, 0)).toBeCloseTo(1, 5);
    const g = createGame({ seed: 61 });
    const p = Object.values(g.players)[0];
    expect(Object.keys(p.attrs).sort()).toEqual([...ATTR_KEYS].sort());
  });

  it('una partida vieja (8 atributos) pasa a los nuevos y se puede seguir jugando', () => {
    const g = createGame({ seed: 62 });
    playRound(g);
    const old = JSON.parse(JSON.stringify(g));
    old.version = 18;
    for (const p of Object.values(old.players) as any[]) {
      const a = p.attrs;
      const viejo = (x: any) => ({ scrum: x.scrum, line: x.salto, tackle: x.tackle, velocidad: x.velocidad, manejo: x.pase, pie: x.precision, liderazgo: x.liderazgo, fisico: x.dureza, actitud: x.actitud });
      p.attrs = viejo(a);
      p.attrsInicio = viejo(p.attrsInicio);
      p.entreno = 'forwards';
    }
    old.clubs[old.userClubId].entrenamiento.foco = 'general';
    const m = migrate(old);
    expect(m.version).toBe(21);
    const p = Object.values(m.players)[0];
    expect(p.attrs.penetracion).toBeGreaterThan(0);
    expect((p.attrs as any).manejo).toBeUndefined();
    expect(p.entreno).toBe('fijas');
    expect(m.clubs[m.userClubId].entrenamiento.foco).toBe('auto');
    for (const x of Object.values(m.players)) expect(Number.isFinite(overall(x))).toBe(true);
    for (let i = 0; i < 4; i++) playRound(m);
    expect(m.round).toBeGreaterThan(4);
  });
});
