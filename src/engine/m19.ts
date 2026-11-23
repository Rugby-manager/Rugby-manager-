// Divisiones juveniles: la M19 del club. Juega sola cada fecha; vos elegís entrenador, cuánta plata ponés y qué pibes suben.
import { Rng, clamp } from './rng';
import { ATTR_KEYS, POS_ORDER, W, assignDorsal, generatePlayer, overall, ratingAs } from './players';
import { costoDiv, staffEstrellas } from './club';
import type { AttrKey, Club, GameState, Player } from './types';

export type Inversion = 'baja' | 'media' | 'alta';

export interface FilaM19 {
  clubId: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  pf: number;
  pc: number;
  pts: number;
}

export interface M19 {
  temporada: number;
  plantel: string[];
  inversion: Inversion;
  tabla: FilaM19[];
  /** Últimos partidos de tu M19. */
  partidos: { round: number; rival: string; pf: number; pc: number }[];
  /** Pibes que cediste desde la M19 esta temporada (para no repetir). */
  cedidos?: string[];
}

export const INVERSION: Record<Inversion, { label: string; texto: string; costo: number; nivel: number }> = {
  baja: { label: 'Lo justo', texto: 'Sin gastos extra. La M19 se arregla con lo que hay.', costo: 0, nivel: 0 },
  media: { label: 'Normal', texto: 'Viajes, viandas y un preparador físico. Los pibes mejoran más y suben mejores de Infantiles.', costo: 200_000, nivel: 1 },
  alta: { label: 'A full', texto: 'Becas, residencia y doble turno. Los pibes crecen mucho más y de Infantiles llegan cracks.', costo: 500_000, nivel: 2 },
};

/** Lo que cuesta la cantera por fecha (más barato en las categorías chicas). */
export function costoCantera(g: GameState): number {
  const m = g.m19;
  if (!m) return 0;
  return Math.round((INVERSION[m.inversion].costo * costoDiv(g.clubs[g.userClubId])) / 1000) * 1000;
}

export const EDAD_MAX_M19 = 19;
export const MAX_M19 = 26;

/** La fuerza del entrenador de juveniles (0 a 5 estrellas) más la inversión. */
const empuje = (g: GameState) => staffEstrellas(g.clubs[g.userClubId], 'juveniles') + INVERSION[g.m19?.inversion ?? 'baja'].nivel * 1.5;

function nuevoPibe(g: GameState, rng: Rng, edad: number): Player {
  const e = empuje(g);
  const pos = rng.pick(POS_ORDER);
  const id = `p${(g.nextId++).toString(36)}`;
  const p = generatePlayer(rng, id, pos, rng.normal(42 + e * 1.2 + (edad - 16) * 3, 4), edad);
  p.potencial = Math.min(94, Math.round(Math.max(p.potencial, overall(p) + 10) + rng.int(0, 5) + e * 1.2));
  p.clubId = null;
  p.sueldo = 0;
  p.contrato = 3;
  g.players[id] = p;
  return p;
}

function tablaNueva(g: GameState): FilaM19[] {
  const user = g.clubs[g.userClubId];
  return Object.values(g.clubs)
    .filter((c) => c.division === user.division)
    .map((c) => ({ clubId: c.id, pj: 0, pg: 0, pe: 0, pp: 0, pf: 0, pc: 0, pts: 0 }));
}

/** Arma la M19 la primera vez (pibes de 16 a 18). */
export function initM19(g: GameState) {
  if (g.m19) {
    // Si cambiaste de club o de categoría, la tabla se rearma.
    const user = g.clubs[g.userClubId];
    if (!g.m19.tabla.some((r) => r.clubId === user.id)) g.m19.tabla = tablaNueva(g);
    return;
  }
  const rng = new Rng(((g.rng ^ 0x19191919) >>> 0) || 19);
  g.m19 = { temporada: g.temporada, plantel: [], inversion: 'baja', tabla: tablaNueva(g), partidos: [] };
  for (let i = 0; i < 18; i++) g.m19.plantel.push(nuevoPibe(g, rng, rng.int(16, 18)).id);
}

export const pibesM19 = (g: GameState): Player[] =>
  (g.m19?.plantel ?? []).map((id) => g.players[id]).filter(Boolean).sort((a, b) => overall(b) - overall(a));

/** Fuerza de una M19: la tuya sale de tus pibes, las otras de la reputación del club. */
function fuerza(g: GameState, c: Club): number {
  if (c.id === g.userClubId) {
    const top = pibesM19(g).slice(0, 15);
    const prom = top.reduce((s, p) => s + overall(p), 0) / Math.max(1, top.length);
    return prom + 3 + staffEstrellas(c, 'juveniles') * 0.8 - (top.length < 15 ? (15 - top.length) * 2 : 0);
  }
  return c.reputacion - 14 + ((c.id.charCodeAt(c.id.length - 1) * 7) % 5);
}

function marcador(rng: Rng, diff: number): number {
  const tries = Math.max(0, Math.round(rng.normal(3 + diff / 5, 1.6)));
  return tries * 5 + Math.round(tries * 0.6) * 2 + rng.int(0, 3) * 3;
}

/** Se juega una fecha de la M19 (solo en las fechas de la liga). Los pibes entrenan y mejoran. */
export function jugarFechaM19(g: GameState, rng: Rng): string | null {
  const m = g.m19;
  if (!m || !Number.isInteger(g.round) || g.round > 18) return null;
  const user = g.clubs[g.userClubId];
  if (!m.tabla.some((r) => r.clubId === user.id)) m.tabla = tablaNueva(g);
  const filas = rng.shuffle([...m.tabla]);
  let aviso: string | null = null;
  for (let i = 0; i + 1 < filas.length; i += 2) {
    const a = filas[i];
    const b = filas[i + 1];
    const fa = fuerza(g, g.clubs[a.clubId]);
    const fb = fuerza(g, g.clubs[b.clubId]);
    const pa = marcador(rng, fa - fb + 1.5);
    const pb = marcador(rng, fb - fa);
    for (const [r, pf, pc] of [[a, pa, pb], [b, pb, pa]] as const) {
      r.pj++;
      r.pf += pf;
      r.pc += pc;
      if (pf > pc) r.pg++;
      else if (pf === pc) r.pe++;
      else r.pp++;
      r.pts += pf > pc ? 4 : pf === pc ? 2 : 0;
    }
    const mio = a.clubId === user.id ? [b, pa, pb] : b.clubId === user.id ? [a, pb, pa] : null;
    if (mio) {
      const [rival, pf, pc] = mio as [FilaM19, number, number];
      m.partidos = [{ round: g.round, rival: rival.clubId, pf, pc }, ...m.partidos].slice(0, 6);
      if (pf - pc >= 30) aviso = `¡Goleada de la M19! ${pf}-${pc} a ${g.clubs[rival.clubId].nombre}.`;
    }
  }
  // Entrenamiento de los pibes: mejoran más con buen entrenador y más inversión.
  const e = empuje(g);
  for (const p of pibesM19(g)) {
    if (ratingAs(p.attrs, p.pos) >= p.potencial) continue;
    if (!rng.chance(0.13 + e * 0.035 + ((p.attrs.actitud ?? 66) - 66) / 300)) continue;
    const pesos = W[p.pos];
    const ks = ATTR_KEYS.filter((k) => k !== 'liderazgo' && k !== 'actitud');
    const k: AttrKey = rng.weighted(ks, ks.map((x) => 0.3 + (pesos[x] ?? 0) * 3));
    p.attrs[k] = Math.min(99, p.attrs[k] + 1);
  }
  return aviso;
}

export function tablaM19(g: GameState): FilaM19[] {
  return [...(g.m19?.tabla ?? [])].sort((a, b) => b.pts - a.pts || b.pf - b.pc - (a.pf - a.pc) || b.pf - a.pf);
}

export function setInversion(g: GameState, v: Inversion): string {
  g.m19!.inversion = v;
  const costo = costoCantera(g);
  return costo ? `La cantera recibe ${INVERSION[v].label.toLowerCase()}: cuesta $${(costo * 18).toLocaleString('es-AR')} por año.` : 'La cantera vuelve a lo justo: no hay gastos extra.';
}

/** Subís un pibe de la M19 al plantel de Primera. */
export function subirAPrimera(g: GameState, id: string): string {
  const m = g.m19!;
  const c = g.clubs[g.userClubId];
  if (!m.plantel.includes(id)) throw new Error('Ese pibe ya no está en la M19.');
  if (c.plantel.length >= 36) throw new Error('El plantel está lleno (máximo 36).');
  const p = g.players[id];
  m.plantel = m.plantel.filter((x) => x !== id);
  p.clubId = c.id;
  p.sueldo = 25_000;
  p.contrato = 3;
  c.plantel.push(id);
  assignDorsal(c, g.players, p);
  // A una comisión que quiere cantera le encanta.
  if (g.career && g.directiva?.estilo === 'cantera') g.career.confianza = clamp(g.career.confianza + 2, 0, 100);
  return `${p.nombre} ${p.apellido} sube de la M19 a Primera. ¡A romperla, pibe!`;
}

/** Lo cedés una temporada a otro club para que sume minutos en Primera. Vuelve a tu plantel después. */
export function cederPibe(g: GameState, id: string, rng = new Rng(g.rng ^ 0x1c1c)): string {
  const m = g.m19!;
  if (!m.plantel.includes(id)) throw new Error('Ese pibe ya no está en la M19.');
  const user = g.clubs[g.userClubId];
  const p = g.players[id];
  const dest = rng.pick(
    Object.values(g.clubs).filter((c) => c.id !== user.id && c.division !== 'X' && c.division >= user.division && c.plantel.length < 36),
  );
  if (!dest) throw new Error('Ningún club lo quiere a préstamo ahora.');
  m.plantel = m.plantel.filter((x) => x !== id);
  // En el fin de temporada, el préstamo es por la que viene.
  const temp = g.phase === 'fin' ? g.temporada + 1 : g.temporada;
  p.clubId = dest.id;
  p.sueldo = 25_000;
  p.contrato = 3;
  p.prestamo = { clubId: user.id, temporada: temp, hasta: temp };
  dest.plantel.push(id);
  assignDorsal(dest, g.players, p);
  m.cedidos = [...(m.cedidos ?? []), id];
  return `${p.nombre} ${p.apellido} se va a préstamo a ${dest.nombre} por una temporada. Después vuelve a tu plantel con más rodaje.`;
}

/** Lo dejás ir. */
export function soltarPibe(g: GameState, id: string): string {
  const m = g.m19!;
  const p = g.players[id];
  m.plantel = m.plantel.filter((x) => x !== id);
  delete g.players[id];
  return p ? `${p.apellido} deja el club.` : '';
}

/** Un pibe que encontró el ojeador se suma a la M19 (si tiene 19 o menos). */
export function sumarAM19(g: GameState, id: string): string {
  const m = g.m19!;
  if (!g.juveniles.includes(id)) throw new Error('Ese juvenil ya no está.');
  if (m.plantel.length >= MAX_M19) throw new Error(`La M19 está llena (máximo ${MAX_M19}).`);
  const p = g.players[id];
  g.juveniles = g.juveniles.filter((x) => x !== id);
  m.plantel.push(id);
  return `${p.nombre} ${p.apellido} se suma a la M19.`;
}

/** Los mejores pibes para decidir en el fin de temporada (los de 19 primero, que es su último año). */
export function destacadosM19(g: GameState): Player[] {
  const ps = pibesM19(g);
  const ultimos = ps.filter((p) => p.edad >= EDAD_MAX_M19);
  const resto = ps.filter((p) => p.edad < EDAD_MAX_M19).slice(0, Math.max(3, 6 - ultimos.length));
  return [...ultimos, ...resto];
}

/** Al arrancar la temporada nueva: cumplen años, los de 20 se van si no los subiste y suben chicos de Infantiles. */
export function nuevaTemporadaM19(g: GameState, rng: Rng): string | null {
  initM19(g);
  const m = g.m19!;
  const sevan: string[] = [];
  for (const p of pibesM19(g)) {
    p.edad++;
    p.temporada = { partidos: 0, tries: 0, puntos: 0 };
    p.ovrInicio = overall(p);
    p.attrsInicio = { ...p.attrs };
    if (p.edad > EDAD_MAX_M19) {
      sevan.push(`${p.nombre} ${p.apellido}`);
      m.plantel = m.plantel.filter((x) => x !== p.id);
      delete g.players[p.id];
    }
  }
  const nivel = INVERSION[m.inversion].nivel;
  const n = Math.min(3 + nivel + (staffEstrellas(g.clubs[g.userClubId], 'juveniles') >= 4 ? 1 : 0), MAX_M19 - m.plantel.length);
  const llegan: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = nuevoPibe(g, rng, 16);
    m.plantel.push(p.id);
    llegan.push(p.apellido);
  }
  m.temporada = g.temporada;
  m.tabla = tablaNueva(g);
  m.partidos = [];
  m.cedidos = [];
  const partes: string[] = [];
  if (llegan.length) partes.push(`De Infantiles suben a la M19: ${llegan.join(', ')}.`);
  if (sevan.length) partes.push(`Cumplieron 20 y dejaron el club (no los subiste): ${sevan.join(', ')}.`);
  return partes.length ? partes.join(' ') : null;
}
