import { describe, it, expect } from 'vitest';
import { createGame, migrate, playRound, startNextSeason } from '../src/engine/game';
import { cederPibe, costoCantera, destacadosM19, pibesM19, setInversion, subirAPrimera, tablaM19 } from '../src/engine/m19';
import { apoyar, directivaDe, pedidoExtra } from '../src/engine/elecciones';
import { analizarRival, aplicarConsejos } from '../src/engine/analisis';
import { anotarIdolo, contratarIdolo, idolosPendientes } from '../src/engine/idolos';
import { elegirPostemporada } from '../src/engine/postemporada';
import { gastosFecha } from '../src/engine/club';
import type { GameState } from '../src/engine/types';

function jugarTemporada(g: GameState) {
  let guard = 0;
  while (g.phase !== 'fin' && guard++ < 80) {
    if (g.career?.despedido) break;
    playRound(g);
  }
}

describe('M19 y cantera', () => {
  it('arranca con pibes, juega su tabla y cobra la inversión', () => {
    const g = createGame({ seed: 7, userClubIndex: 3, modo: 'libre' });
    expect(pibesM19(g).length).toBe(18);
    expect(pibesM19(g).every((p) => p.edad >= 16 && p.edad <= 18 && p.clubId === null)).toBe(true);
    setInversion(g, 'alta');
    expect(costoCantera(g)).toBeGreaterThan(0);
    expect(gastosFecha(g, g.clubs[g.userClubId]).cantera).toBe(costoCantera(g));
    for (let i = 0; i < 4; i++) playRound(g);
    const t = tablaM19(g);
    expect(t.length).toBe(10);
    expect(t.find((r) => r.clubId === g.userClubId)!.pj).toBeGreaterThanOrEqual(3);
    expect(g.m19!.partidos.length).toBeGreaterThan(0);
  });

  it('subir, ceder y los de 20 se van; suben chicos de Infantiles', () => {
    const g = createGame({ seed: 8, userClubIndex: 2, modo: 'libre' });
    const [a, b] = pibesM19(g);
    subirAPrimera(g, a.id);
    expect(g.clubs[g.userClubId].plantel).toContain(a.id);
    jugarTemporada(g);
    expect(destacadosM19(g).length).toBeGreaterThan(0);
    cederPibe(g, b.id);
    expect(g.players[b.id].prestamo?.clubId).toBe(g.userClubId);
    const antes = pibesM19(g).length;
    const viejos = pibesM19(g).filter((p) => p.edad >= 19).length;
    startNextSeason(g);
    expect(pibesM19(g).every((p) => p.edad <= 19)).toBe(true);
    expect(pibesM19(g).length).toBe(antes - viejos + 3);
    // El cedido sigue afuera esta temporada.
    expect(g.players[b.id].clubId).not.toBe(g.userClubId);
  });
});

describe('elecciones', () => {
  it('cada 3 temporadas votan y la comisión puede cambiar', () => {
    const g = createGame({ seed: 9, userClubIndex: 4, modo: 'libre' });
    const d = directivaDe(g);
    expect(d.proxima).toBeGreaterThan(g.temporada);
    const temporadaVoto = d.proxima;
    let guard = 0;
    while (g.temporada < temporadaVoto && guard++ < 5) {
      jugarTemporada(g);
      startNextSeason(g);
    }
    // Arranca la campaña desde la fecha 12.
    while (g.round < 13 && g.phase === 'regular') playRound(g);
    expect(directivaDe(g).oposicion).toBeDefined();
    apoyar(g, 'neutral');
    jugarTemporada(g);
    const u = directivaDe(g).ultima;
    expect(u?.temporada).toBe(temporadaVoto);
    expect(directivaDe(g).proxima).toBe(temporadaVoto + 3);
  });

  it('una comisión ahorrativa pide la caja en positivo', () => {
    const g = createGame({ seed: 10, userClubIndex: 1, modo: 'libre' });
    const d = directivaDe(g);
    d.estilo = 'ahorrativa';
    expect(pedidoExtra(g)?.texto).toContain('Caja');
  });
});

describe('ídolos, análisis del rival y gira', () => {
  it('un ídolo retirado vuelve al cuerpo técnico', () => {
    const g = createGame({ seed: 11, userClubIndex: 0, modo: 'libre' });
    const p = g.players[g.clubs[g.userClubId].plantel[0]];
    p.conClub = { clubId: g.userClubId, partidos: 80, tries: 10, temporadas: 6 };
    g.temporada--; // como si se retirara al cerrar la temporada anterior
    anotarIdolo(g, p);
    g.temporada++;
    expect(idolosPendientes(g).length).toBe(1);
    contratarIdolo(g, p.id, 'juveniles');
    expect(g.clubs[g.userClubId].staffPersonas?.juveniles?.idolo).toBe(true);
  });

  it('el ayudante da consejos según sus estrellas y se pueden aplicar', () => {
    const g = createGame({ seed: 12, userClubIndex: 0, modo: 'libre' });
    const c = g.clubs[g.userClubId];
    c.staffPersonas = { ...(c.staffPersonas ?? {}), ayudante: { nombre: 'Tito Gómez', estrellas: 5 } };
    const rival = Object.values(g.clubs).find((x) => x.id !== c.id && x.division === c.division)!;
    const inf = analizarRival(g, rival.id);
    expect(inf.consejos.length).toBe(3);
    aplicarConsejos(g, inf);
    c.staffPersonas.ayudante = { nombre: 'Tito Gómez', estrellas: 1 };
    expect(analizarRival(g, rival.id).consejos.length).toBe(1);
    c.staffPersonas = {};
    c.staff.ayudante = 0;
    expect(analizarRival(g, rival.id).consejos.length).toBe(0);
  });

  it('la gira de verano paga y suma experiencia', () => {
    const g = createGame({ seed: 13, userClubIndex: 5, modo: 'libre' });
    jugarTemporada(g);
    elegirPostemporada(g, 'gira');
    startNextSeason(g);
    expect(g.gira?.partidos.length).toBe(3);
    expect(g.gira!.plata).toBeGreaterThan(0);
    expect(g.caja.some((m) => m.concepto.startsWith('Gira de verano'))).toBe(true);
  });

  it('las partidas viejas reciben M19, comisión y personalidades', () => {
    const g = createGame({ seed: 14, userClubIndex: 0, modo: 'libre' });
    delete g.m19;
    delete g.directiva;
    for (const p of Object.values(g.players)) delete p.personalidad;
    g.version = 21;
    const m = migrate(g);
    expect(m.version).toBe(29);
    expect(pibesM19(m).length).toBe(18);
    expect(m.directiva?.clubId).toBe(m.userClubId);
    const ps = Object.values(m.players);
    const lideres = ps.filter((p) => p.personalidad === 'lider').length;
    expect(lideres).toBeGreaterThan(5);
    expect(lideres).toBeLessThan(ps.length / 3);
  });
});
