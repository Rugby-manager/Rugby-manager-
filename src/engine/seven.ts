import { Rng, clamp } from './rng';
import { logMoney } from './market';
import { logrosSueltos } from './logros';
import { isAvailable } from './players';
import type { Club, GameState, Player } from './types';

/** Seven de verano: torneo de rugby 7 opcional antes de la liga. */
export const SEVEN_NOMBRE = 'Seven de Verano';
export const SEVEN_PREMIO = { victoria: 1_500_000, campeon: 6_000_000 };
const ETAPAS = ['Cuartos de final', 'Semifinal', 'Final'];

export interface SevenPartido {
  etapa: string;
  rival: string;
  pf: number;
  pc: number;
  gano: boolean;
}
export interface SevenEstado {
  temporada: number;
  jugado: boolean;
  partidos: SevenPartido[];
  campeon: boolean;
  premio: number;
  jugadores: string[];
}

/** Cuánto rinde un jugador en el seven: velocidad, ruptura, manos y aire. */
export const ratingSeven = (p: Player) =>
  p.attrs.velocidad * 0.3 + p.attrs.penetracion * 0.2 + p.attrs.pase * 0.15 + p.attrs.recepcion * 0.1 + p.attrs.tackle * 0.15 + p.attrs.resistencia * 0.1;

/** Los 10 que van al seven (los 7 titulares y 3 cambios). */
export function plantelSeven(g: GameState, c: Club): Player[] {
  return c.plantel
    .map((id) => g.players[id])
    .filter(isAvailable)
    .sort((a, b) => ratingSeven(b) - ratingSeven(a))
    .slice(0, 10);
}

const fuerza = (g: GameState, c: Club) => {
  const ps = plantelSeven(g, c).slice(0, 7);
  return ps.length ? ps.reduce((s, p) => s + ratingSeven(p), 0) / ps.length : 40;
};

/** Se ofrece mientras no arrancó la liga y todavía no lo jugaste (o no dijiste que no) esta temporada. */
export function sevenPendiente(g: GameState) {
  if (g.phase !== 'regular' || g.career?.despedido) return false;
  if (g.seven?.temporada === g.temporada) return false;
  const u = g.userClubId;
  return !g.fixtures.some((f) => f.result && f.comp !== 'AMISTOSO' && (f.home === u || f.away === u));
}

export function rechazarSeven(g: GameState) {
  g.seven = { temporada: g.temporada, jugado: false, partidos: [], campeon: false, premio: 0, jugadores: [] };
}

function tanteador(rng: Rng, a: number, b: number) {
  const tries = (x: number, y: number) => Math.max(0, Math.round(rng.normal(3 + (x - y) / 9, 1.6)));
  const pts = (t: number) => {
    let s = 0;
    for (let i = 0; i < t; i++) s += 5 + (rng.chance(0.6) ? 2 : 0);
    return s;
  };
  let pf = pts(tries(a, b));
  let pc = pts(tries(b, a));
  if (pf === pc) {
    // Muerte súbita: el primero que apoya gana.
    if (rng.chance(clamp(0.5 + (a - b) / 30, 0.2, 0.8))) pf += 5;
    else pc += 5;
  }
  return { pf, pc };
}

/** Jugás el seven: cuartos, semi y final contra 7 clubes de todas las categorías. */
export function jugarSeven(g: GameState): SevenEstado {
  const rng = new Rng(g.rng);
  const user = g.clubs[g.userClubId];
  // Invitan a clubes de tu categoría y de la de al lado.
  const cerca: Record<string, string[]> = { A: ['A', 'B'], B: ['A', 'B', 'C'], C: ['B', 'C'] };
  const ok = cerca[user.division] ?? ['A', 'B', 'C'];
  const otros = rng.shuffle(Object.values(g.clubs).filter((c) => c.id !== user.id && ok.includes(c.division))).slice(0, 7);
  const yo = fuerza(g, user);
  const jugadores = plantelSeven(g, user);
  const partidos: SevenPartido[] = [];
  let premio = 0;
  const rivales = otros.slice(0, 3);
  for (let i = 0; i < 3; i++) {
    const r = rivales[i];
    const { pf, pc } = tanteador(rng, yo, fuerza(g, r));
    const gano = pf > pc;
    partidos.push({ etapa: ETAPAS[i], rival: r.nombre, pf, pc, gano });
    if (!gano) break;
    premio += SEVEN_PREMIO.victoria;
  }
  const campeon = partidos.length === 3 && partidos[2].gano;
  if (campeon) premio += SEVEN_PREMIO.campeon;
  // Correr tanto en el verano levanta lo físico de los que fueron.
  for (const p of jugadores) {
    p.attrs.velocidad = Math.min(99, p.attrs.velocidad + 1);
    p.attrs.resistencia = Math.min(99, p.attrs.resistencia + 1);
    p.energia = Math.max(60, p.energia - 10);
    p.moral = clamp(p.moral + (campeon ? 8 : partidos.length > 1 ? 3 : -2), 0, 100);
  }
  if (premio) {
    user.presupuesto += premio;
    logMoney(g, `${SEVEN_NOMBRE}: ${campeon ? 'campeón' : 'premio por partidos ganados'}`, premio);
  }
  if (campeon && user.hinchada !== undefined) user.hinchada = Math.min(100, user.hinchada + 4);
  g.rng = rng.s;
  g.seven = { temporada: g.temporada, jugado: true, partidos, campeon, premio, jugadores: jugadores.map((p) => p.id) };
  logrosSueltos(g);
  return g.seven;
}
