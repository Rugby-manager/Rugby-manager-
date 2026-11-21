import { describe, it, expect } from 'vitest';
import { createGame, playRound } from '../src/engine/game';
import { asistencia, precioReferencia } from '../src/engine/club';
import { hinchadaTrasPartido } from '../src/engine/hinchada';
import type { Fixture, MatchResult } from '../src/engine/types';

const res = (ptsH: number, ptsA: number) => ({ ptsH, ptsA, triesH: 2, triesA: 2 }) as unknown as MatchResult;

describe('hinchada y tercer tiempo', () => {
  it('ganar la alegra, perder y la entrada cara la enojan, y eso cambia la gente y la confianza', () => {
    const g = createGame({ seed: 91, userClubIndex: 2, modo: 'carrera' });
    const c = g.clubs[g.userClubId];
    expect(c.hinchada).toBe(60);
    const rivalId = Object.values(g.clubs).find((x) => x.id !== c.id && x.division === c.division)!.id;
    const f = (r: MatchResult): Fixture => ({ id: 'fx', round: 1, comp: c.division as 'A', home: c.id, away: rivalId, result: r });

    hinchadaTrasPartido(g, f(res(30, 10)), c.id);
    const tras = c.hinchada!;
    expect(tras).toBeGreaterThan(60);

    // Entrada carísima y derrotas seguidas: se enoja y la directiva pierde confianza.
    c.precioEntrada = precioReferencia(c.reputacion) * 2;
    const conf0 = g.career!.confianza;
    const avisos: string[] = [];
    for (let i = 0; i < 8; i++) avisos.push(...hinchadaTrasPartido(g, f(res(5, 40)), rivalId));
    expect(c.hinchada!).toBeLessThan(20);
    expect(avisos.some((t) => t.includes('furiosa'))).toBe(true);
    expect(g.career!.confianza).toBeLessThan(conf0);

    // Con la hinchada enojada va menos gente que con la hinchada contenta.
    c.precioEntrada = precioReferencia(c.reputacion);
    const rival = g.clubs[rivalId];
    const enojada = asistencia(g, c, rival, false).publico;
    c.hinchada = 90;
    const contenta = asistencia(g, c, rival, false).publico;
    expect(contenta).toBeGreaterThan(enojada);
  });

  it('se actualiza sola al jugar las fechas', () => {
    const g = createGame({ seed: 92, userClubIndex: 4, modo: 'libre' });
    const vistos = new Set<number>();
    for (let i = 0; i < 10; i++) {
      playRound(g);
      vistos.add(g.clubs[g.userClubId].hinchada!);
    }
    expect(vistos.size).toBeGreaterThan(2);
  });
});
