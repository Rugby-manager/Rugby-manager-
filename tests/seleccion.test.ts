import { describe, it, expect } from 'vitest';
import { createGame, playRound, startNextSeason } from '../src/engine/game';
import { PAISES, aceptarSeleccion, jugarJornada, nacional, prestigioPedido, tablaGrupo, toggleConvocado, ventanaActual, ventanaPendiente } from '../src/engine/seleccion';
import { fechaRonda, fechasJulio, fechasMundial, iso } from '../src/engine/calendario';
import { Rng } from '../src/engine/rng';

const jugarHasta = (g: ReturnType<typeof createGame>, cond: () => boolean) => {
  let n = 0;
  while (!cond() && n++ < 60) playRound(g);
};

describe('selecciones', () => {
  it('están los 24 del Mundial 2027 en 6 grupos de 4', () => {
    expect(PAISES.length).toBe(24);
    for (const l of 'ABCDEF') expect(PAISES.filter((p) => p.grupo27 === l).length).toBe(4);
    expect(prestigioPedido(PAISES.find((p) => p.id === 'NZL')!)).toBeGreaterThan(prestigioPedido(PAISES.find((p) => p.id === 'HKG')!));
  });

  it('el calendario: julio sin liga y Mundial del 2 de octubre al 13 de noviembre', () => {
    expect(iso(fechaRonda(2027, 1))).toBe('2027-03-06');
    expect(iso(fechaRonda(2027, 16))).toBe('2027-06-19');
    expect(fechasJulio(2027).map(iso)).toEqual(['2027-07-03', '2027-07-10', '2027-07-17']);
    expect(iso(fechaRonda(2027, 17))).toBe('2027-07-24');
    expect(iso(fechasMundial(2027)[0])).toBe('2027-10-02');
    expect(iso(fechasMundial(2027)[6])).toBe('2027-11-13');
  });

  it('sin selección, Argentina juega sola en julio y el Mundial se completa', () => {
    const g = createGame({ seed: 21, userClubIndex: 3, modo: 'libre' });
    jugarHasta(g, () => g.round >= 17);
    const n = nacional(g);
    const jul = n.ventanas.find((v) => v.tipo === 'julio')!;
    expect(jul.terminada).toBe(true);
    expect(jul.partidos.filter((p) => p.home === 'ARG' || p.away === 'ARG').length).toBe(3);
    jugarHasta(g, () => g.phase === 'fin');
    const mundial = ventanaActual(g)!;
    expect(mundial.tipo).toBe('mundial');
    startNextSeason(g);
    expect(n.mundiales.length).toBe(1);
    const m = n.ventanas.find((v) => v.tipo === 'mundial')!;
    expect(m.partidos.length).toBe(36 + 8 + 4 + 2 + 2);
    for (const gr of 'ABCDEF') expect(tablaGrupo(m, gr)[0].pj).toBe(3);
  });

  it('dirigiendo una selección: convocás, jugás y queda pendiente hasta que juegues', () => {
    const g = createGame({ seed: 22, userClubIndex: 1, modo: 'libre' });
    expect(aceptarSeleccion(g, 'ARG')).toBeNull();
    const n = nacional(g);
    expect(n.convocados.length).toBe(23);
    expect(toggleConvocado(g, Object.keys(g.players).find((id) => !n.convocados.includes(id))!)).toMatch(/23/);
    jugarHasta(g, () => g.round >= 17);
    expect(ventanaPendiente(g)).toBe(true);
    const rng = new Rng(3);
    jugarJornada(g, rng);
    const v = ventanaActual(g)!;
    const mio = v.partidos.find((p) => p.jornada === 0 && (p.home === 'ARG' || p.away === 'ARG'))!;
    expect(mio.ph! + mio.pa!).toBeGreaterThan(5);
    expect(n.pj).toBe(1);
    playRound(g); // juega solo lo que falta
    expect(ventanaPendiente(g)).toBe(false);
    expect(n.pj).toBe(3);
  });

  it('Fiji en el Mundial: estadísticas razonables', () => {
    let campeonFuerte = 0;
    let ganadosFiji = 0;
    let jugados = 0;
    for (let s = 0; s < 6; s++) {
      const g = createGame({ seed: 100 + s, userClubIndex: 0, modo: 'libre' });
      aceptarSeleccion(g, 'FIJ');
      jugarHasta(g, () => g.phase === 'fin');
      const rng = new Rng(s + 1);
      while (ventanaActual(g)) jugarJornada(g, rng);
      const n = nacional(g);
      const m = n.ventanas.find((v) => v.tipo === 'mundial')!;
      const c = PAISES.find((p) => p.id === m.partidos.find((p) => p.fase === 'Final')!.ganador)!;
      if (c.fuerza >= 82) campeonFuerte++;
      for (const p of m.partidos.filter((p) => p.home === 'FIJ' || p.away === 'FIJ')) {
        jugados++;
        if ((p.home === 'FIJ' ? p.ph! - p.pa! : p.pa! - p.ph!) > 0) ganadosFiji++;
      }
    }
    expect(campeonFuerte).toBeGreaterThanOrEqual(3);
    expect(ganadosFiji).toBeGreaterThan(0);
    expect(ganadosFiji).toBeLessThan(jugados);
  });
});
