import type { Club, Fixture, GameState, Player, Pos, RecordEntry } from './types';
import type { Rng } from './rng';
import { overall } from './players';

// ---------- Clásicos ----------

/** Cada club tiene su rival de toda la vida (todos inventados). */
const DERBIES: [string, string][] = [
  ['ÑAN', 'SAU'], ['CRN', 'MOL'], ['OMB', 'ALG'], ['CDS', 'MED'], ['CAL', 'PQU'],
  ['ARH', 'LAG'], ['QUE', 'CHA'], ['ESP', 'JUN'], ['CER', 'PMO'], ['PAH', 'BRR'],
  ['TOT', 'TAL'], ['VIZ', 'BAÑ'], ['CRE', 'CUB'], ['CAÑ', 'JAR'], ['MIS', 'PEN'],
];
const cod = (c: Club) => c.codigo ?? c.corto;

export function isDerby(a: Club, b: Club) {
  return DERBIES.some(([x, y]) => (x === cod(a) && y === cod(b)) || (x === cod(b) && y === cod(a)));
}

export function rivalOf(g: GameState, c: Club): Club | undefined {
  const pair = DERBIES.find(([x, y]) => x === cod(c) || y === cod(c));
  if (!pair) return undefined;
  const other = pair[0] === cod(c) ? pair[1] : pair[0];
  return Object.values(g.clubs).find((x) => cod(x) === other);
}

// ---------- Clima ----------

export type Clima = 'sol' | 'nublado' | 'lluvia' | 'viento' | 'frio';
export const CLIMA_LABEL: Record<Clima, string> = { sol: 'Soleado', nublado: 'Nublado', lluvia: 'Lluvia', viento: 'Mucho viento', frio: 'Frío' };
export const CLIMA_ICON: Record<Clima, string> = { sol: '☀️', nublado: '☁️', lluvia: '🌧️', viento: '💨', frio: '❄️' };
export const CLIMA_DESC: Record<Clima, string> = {
  sol: 'Cancha rápida. Los jugadores se cansan un poco más.',
  nublado: 'Día normal para jugar.',
  lluvia: 'Pelota mojada: más knock-ons, a los backs les cuesta y los pateadores erran más. Conviene jugar con los forwards.',
  viento: 'Al pateador le cuesta: más penales y conversiones erradas.',
  frio: 'Hace frío: los jugadores se cansan menos.',
};

/** El pronóstico sale del partido mismo, así se puede ver antes de jugarlo. */
export function climaDe(f: Fixture, temporada: number): Clima {
  let h = temporada * 31;
  for (const ch of f.id) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  // Marzo es más lindo; en invierno llueve y hace frío.
  const invierno = f.round >= 9;
  const w = invierno ? [18, 26, 24, 14, 18] : [36, 26, 18, 14, 6];
  let r = h % w.reduce((a, b) => a + b, 0);
  const opts: Clima[] = ['sol', 'nublado', 'lluvia', 'viento', 'frio'];
  for (let i = 0; i < w.length; i++) {
    if (r < w[i]) return opts[i];
    r -= w[i];
  }
  return 'nublado';
}

// ---------- Capitán ----------

/** El capitán del club: el que eligió el usuario, o el de más liderazgo del XV. */
export function captainOf(c: Club, players: Record<string, Player>, xv: (string | null)[] = c.xv): string | null {
  if (c.capitan && xv.includes(c.capitan) && players[c.capitan]) return c.capitan;
  let best: string | null = null;
  let bestL = -1;
  for (const id of xv) {
    if (!id || !players[id]) continue;
    if (players[id].attrs.liderazgo > bestL) {
      bestL = players[id].attrs.liderazgo;
      best = id;
    }
  }
  return best;
}

// ---------- Charlas ----------

export type Charla = 'tranquila' | 'arenga' | 'exigir';
export const CHARLA_LABEL: Record<Charla, string> = { tranquila: 'Tranquilos', arenga: 'Arengar', exigir: 'Exigir' };
export const CHARLA_DESC: Record<Charla, string> = {
  tranquila: 'Bajar un cambio: juegan concentrados y hacen menos faltas.',
  arenga: 'Prender fuego al vestuario: salen con todo, sirve sobre todo si vas abajo o el rival es mejor. Más tarjetas.',
  exigir: 'Pedir más: a un plantel con la moral alta lo potencia; a uno caído lo achica.',
};

// ---------- Selección ----------

const CUPO: Record<Pos, number> = { PIL: 4, HOO: 2, SEG: 3, TER: 4, MSC: 2, APE: 2, CEN: 3, WIN: 2, FUL: 1 };
export const SELECCION = 'la Selección';

/** Arma la lista de 23 convocados con los mejores de la liga. */
export function convocatoria(g: GameState): string[] {
  const pool = Object.values(g.players).filter((p) => p.clubId && p.lesion === 0 && p.edad >= 19);
  const out: string[] = [];
  for (const pos of Object.keys(CUPO) as Pos[]) {
    pool
      .filter((p) => p.pos === pos)
      .sort((a, b) => overall(b) - overall(a))
      .slice(0, CUPO[pos])
      .forEach((p) => out.push(p.id));
  }
  return out;
}

const RIVALES = ['los Albatros del Sur', 'los Cóndores del Pacífico', 'los Lobos del Norte', 'los Robles de Ultramar', 'los Toros del Altiplano', 'los Halcones Blancos'];
export const PREMIO_SELECCION = 1_000_000;

/** Ventana de la Selección: convoca a los mejores, juegan un test y vuelven cansados (y contentos). */
export function callUp(g: GameState, rng: Rng): { mios: string[]; texto: string } {
  const ids = convocatoria(g);
  const rival = rng.pick(RIVALES);
  const fuerza = ids.reduce((s, id) => s + overall(g.players[id]), 0) / Math.max(1, ids.length);
  const a = Math.round(18 + rng.next() * 22 + (fuerza - 70) * 0.6);
  const b = Math.round(12 + rng.next() * 26);
  const resultado = a === b ? `empató ${a}-${b}` : a > b ? `le ganó ${a}-${b}` : `perdió ${a}-${b}`;
  for (const id of ids) {
    const p = g.players[id];
    p.caps = (p.caps ?? 0) + 1;
    p.energia = Math.max(30, p.energia - 15);
    p.moral = Math.min(100, p.moral + 8);
  }
  const mios = ids.filter((id) => g.players[id].clubId === g.userClubId);
  g.seleccion = { temporada: g.temporada, ids, rival, resultado };
  const texto =
    `${SELECCION.charAt(0).toUpperCase() + SELECCION.slice(1)} ${resultado} contra ${rival} en el test de mitad de año. ` +
    (mios.length
      ? `De tu club fueron ${mios.map((id) => g.players[id].apellido).join(', ')}: vuelven cansados pero con la moral por las nubes. La Unión te paga una compensación.`
      : 'Ningún jugador de tu club fue convocado esta vez.');
  return { mios, texto };
}

// ---------- Récords ----------

export type Record_ = RecordEntry;
export type RecordKey = 'goleada' | 'puntosPartido' | 'triesJugadorPartido' | 'triesTemporada' | 'puntosTemporada' | 'asistencia' | 'goleadaUsuario';
export const RECORD_LABEL: Record<RecordKey, string> = {
  goleada: 'Mayor goleada',
  puntosPartido: 'Partido con más puntos',
  triesJugadorPartido: 'Más tries de un jugador en un partido',
  triesTemporada: 'Más tries en una temporada',
  puntosTemporada: 'Más puntos en una temporada',
  asistencia: 'Más gente en tu cancha',
  goleadaUsuario: 'Tu mayor goleada',
};

function setRec(g: GameState, k: RecordKey, valor: number, texto: string): boolean {
  g.records ??= {};
  const cur = g.records[k];
  if (cur && cur.valor >= valor) return false;
  g.records[k] = { valor, texto, temporada: g.temporada };
  return !!cur;
}

/** Revisa si el partido batió algún récord. Devuelve los récords nuevos (para las noticias). */
export function checkRecords(g: GameState, f: Fixture): string[] {
  const r = f.result;
  if (!r) return [];
  const h = g.clubs[f.home];
  const a = g.clubs[f.away];
  const nuevos: string[] = [];
  const marc = `${h.nombre} ${r.ptsH} - ${r.ptsA} ${a.nombre}`;
  if (setRec(g, 'goleada', Math.abs(r.ptsH - r.ptsA), marc)) nuevos.push(`Nueva mayor goleada: ${marc}.`);
  if (setRec(g, 'puntosPartido', r.ptsH + r.ptsA, marc)) nuevos.push(`Récord de puntos en un partido: ${marc}.`);
  for (const s of r.scorers) {
    const p = g.players[s.playerId];
    if (p && s.tries >= 3 && setRec(g, 'triesJugadorPartido', s.tries, `${p.nombre} ${p.apellido} (${g.clubs[p.clubId ?? '']?.corto ?? ''}), ${s.tries} tries en ${marc}`))
      nuevos.push(`¡${p.nombre} ${p.apellido} hizo ${s.tries} tries en un partido! Nuevo récord.`);
  }
  const me = g.userClubId;
  if (f.home === me || f.away === me) {
    const diff = f.home === me ? r.ptsH - r.ptsA : r.ptsA - r.ptsH;
    if (diff > 0) setRec(g, 'goleadaUsuario', diff, marc);
    const asis = g.clubs[me].ultimaAsistencia;
    if (f.home === me && asis) setRec(g, 'asistencia', asis, `${asis.toLocaleString('es-AR')} personas vs ${a.nombre}`);
  }
  return nuevos;
}

/** Al terminar la temporada: récords de tries y puntos de un jugador. */
export function seasonRecords(g: GameState) {
  const ps = Object.values(g.players).filter((p) => p.clubId);
  const t = ps.sort((a, b) => b.temporada.tries - a.temporada.tries)[0];
  if (t) setRec(g, 'triesTemporada', t.temporada.tries, `${t.nombre} ${t.apellido} (${g.clubs[t.clubId!].corto}), ${t.temporada.tries} tries`);
  const pp = ps.sort((a, b) => b.temporada.puntos - a.temporada.puntos)[0];
  if (pp) setRec(g, 'puntosTemporada', pp.temporada.puntos, `${pp.nombre} ${pp.apellido} (${g.clubs[pp.clubId!].corto}), ${pp.temporada.puntos} puntos`);
}
