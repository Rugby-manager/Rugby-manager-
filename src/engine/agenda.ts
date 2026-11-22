// Agenda de la temporada: todo lo que se juega, con su día, para la pantalla Calendario.
import { COMP_NAME, LAST_ROUND, REGULAR_ROUNDS, isLeague, matchWinner } from './game';
import { CUP_ETAPA, CUP_ROUNDS } from './cup';
import { INTL_ETAPA, INTL_NOMBRE, INTL_ROUNDS } from './internacional';
import { SEVEN_NOMBRE, sevenPendiente } from './seven';
import { preseasonPending } from './preseason';
import { deIso, esAnioMundial, fechaAmistoso, fechaRonda, fechaSeven, fechasJulio, fechasMundial, fechasNoviembre } from './calendario';
import { COMP_SEL, focoDe, paisDe, ventanaActual, ventanaPendiente, type PartidoSel } from './seleccion';
import type { Fixture, GameState } from './types';

export type TipoEv = 'pre' | 'seven' | 'liga' | 'copa' | 'intl' | 'playoff' | 'sel' | 'mundial' | 'fin';
export interface Evento {
  fecha: Date;
  tipo: TipoEv;
  titulo: string;
  detalle?: string;
  /** Resultado si ya se jugó (G/E/P desde tu lado). */
  res?: { texto: string; tono: 'win' | 'loss' | 'draw' | '' };
  /** Es tuyo (tu club o tu selección). */
  mio?: boolean;
  grande?: boolean;
}

const DIA = 86_400_000;

function resClub(g: GameState, f: Fixture): Evento['res'] {
  if (!f.result) return undefined;
  const u = g.userClubId;
  const mio = f.home === u ? f.result.ptsH : f.result.ptsA;
  const otro = f.home === u ? f.result.ptsA : f.result.ptsH;
  const w = matchWinner(f);
  return { texto: `${mio}-${otro}`, tono: w === null ? 'draw' : w === u ? 'win' : 'loss' };
}

function resSel(p: PartidoSel, id: string): Evento['res'] {
  if (p.ph == null) return undefined;
  const a = p.home === id ? p.ph : p.pa!;
  const b = p.home === id ? p.pa! : p.ph;
  const gano = p.ganador ? p.ganador === id : a > b;
  return { texto: `${a}-${b}`, tono: a === b && !p.ganador ? 'draw' : gano ? 'win' : 'loss' };
}

export function agenda(g: GameState): Evento[] {
  const y = g.temporada;
  const u = g.userClubId;
  const ev: Evento[] = [];
  const nombre = (id: string) => g.clubs[id]?.nombre ?? id;

  // Pretemporada y Seven.
  const pre = g.pretemporada?.temporada === y ? g.pretemporada : null;
  if (pre && pre.elegida != null) {
    pre.partidos.forEach((f, i) => {
      const rival = f.home === u ? f.away : f.home;
      ev.push({ fecha: fechaAmistoso(y, i), tipo: 'pre', titulo: `Amistoso vs ${nombre(rival)}`, detalle: pre.propuestas[pre.elegida!]?.nombre, res: resClub(g, f), mio: true });
    });
  } else if (pre && preseasonPending(g)) {
    ev.push({ fecha: fechaAmistoso(y, 0), tipo: 'pre', titulo: 'Pretemporada', detalle: 'Elegí un torneo de 3 amistosos (o salteala).', mio: true });
  }
  if (g.seven?.temporada === y && g.seven.jugado) {
    ev.push({ fecha: fechaSeven(y), tipo: 'seven', titulo: SEVEN_NOMBRE, detalle: g.seven.campeon ? '¡Campeones!' : `Llegaron hasta ${g.seven.partidos[g.seven.partidos.length - 1]?.etapa.toLowerCase() ?? 'cuartos'}`, mio: true });
  } else if (sevenPendiente(g)) {
    ev.push({ fecha: fechaSeven(y), tipo: 'seven', titulo: SEVEN_NOMBRE, detalle: 'Opcional: jugalo o decí que no desde Inicio.', mio: true });
  }

  // Fechas del club.
  const oficiales = g.fixtures.filter((f) => f.comp !== 'AMISTOSO');
  const rondas = new Set<number>([...Array.from({ length: LAST_ROUND }, (_, i) => i + 1), ...oficiales.map((f) => f.round)]);
  for (const r of [...rondas].sort((a, b) => a - b)) {
    const fs = oficiales.filter((f) => f.round === r);
    const mia = fs.find((f) => f.home === u || f.away === u);
    const fecha = fechaRonda(y, r);
    if (mia) {
      const rival = mia.home === u ? mia.away : mia.home;
      const tipo: TipoEv = isLeague(mia.comp) ? 'liga' : mia.comp === 'COPA' ? 'copa' : mia.comp === 'INTL' ? 'intl' : 'playoff';
      const fase = mia.comp === 'COPA' ? `${COMP_NAME.COPA} · ${CUP_ETAPA[mia.etapa ?? 0]}` : mia.comp === 'INTL' ? `${INTL_NOMBRE} · ${INTL_ETAPA[mia.etapa ?? 0]}` : isLeague(mia.comp) ? `${COMP_NAME[mia.comp]} · fecha ${r}` : COMP_NAME[mia.comp];
      ev.push({ fecha, tipo, titulo: `${mia.home === u ? 'vs' : 'en cancha de'} ${nombre(rival)}`, detalle: fase, res: resClub(g, mia), mio: true, grande: mia.comp === 'FINAL' || (mia.comp === 'COPA' && mia.etapa === 3) });
      continue;
    }
    if (CUP_ROUNDS.includes(r)) {
      const i = CUP_ROUNDS.indexOf(r);
      ev.push({ fecha, tipo: 'copa', titulo: `${COMP_NAME.COPA} · ${CUP_ETAPA[i]}`, detalle: fs.length ? 'Tu club no juega esta ronda.' : 'Se juega a mitad de semana.', grande: i === 3 });
    } else if (INTL_ROUNDS.includes(r)) {
      if (fs.length) ev.push({ fecha, tipo: 'intl', titulo: `${INTL_NOMBRE} · ${INTL_ETAPA[INTL_ROUNDS.indexOf(r)]}`, detalle: 'La juega el campeón de Primera A.' });
    } else if (r === REGULAR_ROUNDS + 1) {
      ev.push({ fecha, tipo: 'playoff', titulo: 'Semifinales de Primera A', detalle: 'También los repechajes (ida). Juegan los 4 primeros de la A.', grande: true });
    } else if (r === LAST_ROUND) {
      const final = fs.find((f) => f.comp === 'FINAL');
      ev.push({ fecha, tipo: 'playoff', titulo: 'Final de Primera A', detalle: final ? `${nombre(final.home)} vs ${nombre(final.away)}${final.result ? ` · ganó ${nombre(matchWinner(final)!)}` : ''}` : 'Y los repechajes (vuelta).', grande: true });
    } else if (r <= REGULAR_ROUNDS) {
      ev.push({ fecha, tipo: 'liga', titulo: `Fecha ${r} de la liga`, detalle: 'Tu club tiene fecha libre.' });
    }
  }

  // Selecciones.
  const foco = focoDe(g);
  const fp = paisDe(foco);
  const vs = g.nacional?.ventanas.filter((v) => v.temporada === y) ?? [];
  const julio = vs.find((v) => v.tipo === 'julio');
  const resto = vs.find((v) => v.tipo !== 'julio');
  const mio = !!g.nacional?.paisId;
  const filas = (v: NonNullable<typeof julio>) => {
    const id = v.foco;
    for (const p of v.partidos.filter((x) => x.home === id || x.away === id)) {
      const rival = paisDe(p.home === id ? p.away : p.home);
      ev.push({ fecha: deIso(p.fecha), tipo: v.tipo === 'mundial' ? 'mundial' : 'sel', titulo: `${paisDe(id).bandera} ${paisDe(id).nombre} vs ${rival.bandera} ${rival.nombre}`, detalle: `${COMP_SEL[p.comp]} · ${p.fase}`, res: resSel(p, id), mio, grande: p.fase === 'Final' });
    }
  };
  if (julio) filas(julio);
  else fechasJulio(y).forEach((d, i) => ev.push({ fecha: d, tipo: 'sel', titulo: `Ventana de julio · test ${i + 1}`, detalle: `Se para la liga: juegan las selecciones (${fp.bandera} ${fp.nombre}).`, mio }));
  if (esAnioMundial(y)) {
    const f = fechasMundial(y);
    if (resto) filas(resto);
    const fases = ['Arranca el Mundial', 'Mundial · fecha 2 de grupos', 'Mundial · fecha 3 de grupos', 'Mundial · octavos de final', 'Mundial · cuartos de final', 'Mundial · semifinales', 'Final del Mundial'];
    f.forEach((d, i) => {
      const final = resto?.partidos.find((p) => p.fase === 'Final' && p.jornada === i);
      const ya = ev.some((e) => e.tipo === 'mundial' && e.fecha.getTime() === d.getTime());
      if (i === 0 || i === 6 || !ya) {
        ev.push({
          fecha: d, tipo: 'mundial', titulo: `🏆 ${fases[i]}`, grande: i === 0 || i === 6,
          detalle: i === 6 && final?.ganador ? `${paisDe(final.home).nombre} ${final.ph}-${final.pa} ${paisDe(final.away).nombre} · campeón ${paisDe(final.ganador).nombre}` : i === 0 ? `Australia ${y}: 24 selecciones en 6 grupos.` : undefined,
        });
      }
    });
  } else {
    if (resto) filas(resto);
    else fechasNoviembre(y).slice(0, 3).forEach((d, i) => ev.push({ fecha: d, tipo: 'sel', titulo: `Ventana de noviembre · test ${i + 1}`, detalle: `Juegan las selecciones (${fp.bandera} ${fp.nombre}).`, mio }));
    const fin = resto?.partidos.find((p) => p.comp === 'NCF' && p.fase === 'Final');
    ev.push({ fecha: fechasNoviembre(y)[3], tipo: 'sel', titulo: '🏆 Finales del Nations Championship', detalle: fin?.ganador ? `Campeón: ${paisDe(fin.ganador).nombre}` : 'En Londres: cada uno del norte contra el del sur que terminó en su mismo puesto.', grande: true });
  }
  ev.push({ fecha: new Date(fechaRonda(y, LAST_ROUND).getTime() + 7 * DIA), tipo: 'fin', titulo: 'Postemporada', detalle: 'Vacaciones o bloque físico hasta la pretemporada de febrero.' });
  return ev.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/** El día en que está parado el juego. */
export function hoy(g: GameState): Date {
  const y = g.temporada;
  if (preseasonPending(g)) {
    const pre = g.pretemporada!;
    const i = pre.elegida == null ? 0 : pre.partidos.findIndex((f) => !f.result);
    return fechaAmistoso(y, Math.max(0, i));
  }
  const v = ventanaActual(g);
  if (v && (ventanaPendiente(g) || g.phase === 'fin')) {
    const p = v.partidos.find((x) => x.ph == null);
    if (p) return deIso(p.fecha);
  }
  if (g.phase === 'fin') return new Date(fechaRonda(y, LAST_ROUND).getTime() + 7 * DIA);
  if (sevenPendiente(g) && g.round === 1) return fechaSeven(y);
  return fechaRonda(y, g.round);
}
