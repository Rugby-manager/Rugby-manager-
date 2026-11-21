import { Rng } from './rng';
import { rivalOf } from './extras';
import type { GameState, PropuestaAmistosa } from './types';

/** Hay pretemporada sin terminar: la liga todavía no arrancó. */
export const preseasonPending = (g: GameState) => !!g.pretemporada && !g.pretemporada.terminada;

/** Próximo amistoso por jugar (si ya elegiste torneo). */
export function nextFriendly(g: GameState) {
  const p = g.pretemporada;
  if (!p || p.terminada || p.elegida === null) return undefined;
  return p.partidos.find((f) => !f.result);
}

const SEDES = ['Villa Serrana', 'Mar Chiquito', 'Los Molles', 'Colonia Esperanza', 'Paso de los Toldos', 'Bahía Mansa'];
const r100k = (v: number) => Math.round(v / 100_000) * 100_000;

/** Tres propuestas de torneo amistoso para conocer al plantel antes de la liga. */
export function makePreseason(g: GameState, rng: Rng) {
  const user = g.clubs[g.userClubId];
  const otros = Object.values(g.clubs).filter((c) => c.id !== user.id);
  const fuertes = [...otros].sort((a, b) => b.reputacion - a.reputacion).filter((c) => c.reputacion >= user.reputacion - 2);
  const pickN = (pool: typeof otros, n: number) => rng.shuffle([...pool]).slice(0, n).map((c) => c.id);

  // 1) Torneo de verano contra equipos más grandes.
  const duros = pickN(fuertes.slice(0, 8).length >= 3 ? fuertes.slice(0, 8) : otros.sort((a, b) => b.reputacion - a.reputacion).slice(0, 8), 3);
  // 2) Gira contra equipos más chicos.
  const chicos = otros.filter((c) => c.reputacion <= user.reputacion - 3);
  const gira = pickN(chicos.length >= 3 ? chicos : [...otros].sort((a, b) => a.reputacion - b.reputacion).slice(0, 8), 3);
  // 3) Cuadrangular con el clásico y dos de tu categoría.
  const rival = rivalOf(g, user);
  const mismos = otros.filter((c) => c.division === user.division).filter((c) => c.id !== user.id && c.id !== rival?.id);
  const cuad = [...(rival ? [rival.id] : []), ...pickN(mismos, rival ? 2 : 3)];

  const base = Math.max(1_000_000, (user.reputacion - 40) * 100_000);
  const sede = rng.pick(SEDES);
  const propuestas: PropuestaAmistosa[] = [
    {
      tipo: 'fuerte',
      nombre: `Torneo de Verano de ${sede}`,
      texto: 'Rivales más grandes que vos. Sirve para medirse de verdad y paga bien, pero si perdés mucho el plantel arranca la liga bajoneado.',
      rivales: duros,
      premio: r100k(base * 1.6),
    },
    {
      tipo: 'gira',
      nombre: 'Gira por el interior',
      texto: 'Partidos contra clubes más chicos. Ideal para probar jugadores y que el equipo agarre confianza. Paga poco.',
      rivales: gira,
      premio: r100k(base * 0.7),
    },
    {
      tipo: 'clasico',
      nombre: rival ? `Cuadrangular con ${rival.nombre}` : 'Cuadrangular regional',
      texto: rival ? 'Tres partidos contra equipos de tu categoría, incluido tu clásico. Te sirve para ver cómo estás contra los que vas a enfrentar.' : 'Tres partidos contra equipos de tu categoría.',
      rivales: cuad,
      premio: r100k(base),
    },
  ];
  g.pretemporada = { temporada: g.temporada, propuestas, elegida: null, partidos: [], terminada: false };
}

/** Elegís uno de los tres torneos: se arman los tres amistosos. */
export function choosePreseason(g: GameState, i: number, newId: () => string) {
  const p = g.pretemporada;
  if (!p || p.terminada || p.elegida !== null) throw new Error('Ya elegiste la pretemporada');
  const prop = p.propuestas[i];
  if (!prop) throw new Error('Esa propuesta no existe');
  p.elegida = i;
  p.partidos = prop.rivales.map((rid, k) => ({
    id: newId(),
    round: 0,
    comp: 'AMISTOSO' as const,
    // Local, visitante, local.
    home: k % 2 === 0 ? g.userClubId : rid,
    away: k % 2 === 0 ? rid : g.userClubId,
  }));
}

/** Sin pretemporada: arranca la liga directamente. */
export function skipPreseason(g: GameState) {
  if (g.pretemporada) g.pretemporada.terminada = true;
}
