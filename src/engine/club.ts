import { isDerby } from './extras';
import { Rng, clamp } from './rng';
import { wageFor } from './players';
import { logMoney } from './market';
import type { Club, Fixture, GameState, InstKey, Instalaciones, Player, SponsorDeal, Staff, StaffKey } from './types';

// ---------- Instalaciones ----------

export interface InstInfo {
  nombre: string;
  max: number;
  /** Cuánto sale subir al nivel n. */
  costo: (n: number) => number;
  /** Fechas que tarda la obra. */
  fechas: number;
  /** Mantenimiento por fecha y por nivel. */
  mant: number;
  efecto: string;
}

export const INST: Record<InstKey, InstInfo> = {
  tribunas: {
    nombre: 'Tribunas',
    max: 8,
    costo: (n) => 9_000_000 * n,
    fechas: 6,
    mant: 50_000,
    efecto: 'Cada nivel suma 1.500 lugares. Más gente en la cancha, más plata de entradas y del quincho.',
  },
  gimnasio: {
    nombre: 'Gimnasio',
    max: 5,
    costo: (n) => 7_000_000 * n,
    fechas: 4,
    mant: 60_000,
    efecto: 'Los jugadores ganan físico y velocidad más rápido, se recuperan mejor entre partidos y se lesionan menos entrenando.',
  },
  campo: {
    nombre: 'Cancha de entrenamiento',
    max: 5,
    costo: (n) => 8_000_000 * n,
    fechas: 5,
    mant: 50_000,
    efecto: 'Con mejores canchas y elementos, todos los entrenamientos rinden más.',
  },
  quincho: {
    nombre: 'Quincho del tercer tiempo',
    max: 3,
    costo: (n) => 4_000_000 * n,
    fechas: 3,
    mant: 30_000,
    efecto: 'Asado y bebida después de cada partido de local: deja plata por cada persona que va a la cancha y suma socios.',
  },
};

export const INST_ORDER: InstKey[] = ['tribunas', 'gimnasio', 'campo', 'quincho'];

export const capacidad = (c: Club) => 2_000 + 1_500 * (c.inst?.tribunas ?? 0);

/** Instalaciones con las que arranca un club según su tamaño. */
export function instInicial(rep: number): Instalaciones {
  const t = clamp(Math.round((rep - 50) / 4), 0, 6);
  return { tribunas: t, gimnasio: clamp(Math.round((rep - 52) / 7), 0, 3), campo: clamp(Math.round((rep - 52) / 7), 0, 3), quincho: rep >= 62 ? 1 : 0 };
}

export function canBuild(g: GameState, k: InstKey): { ok: boolean; reason?: string; costo: number } {
  const c = g.clubs[g.userClubId];
  const n = c.inst[k] + 1;
  const info = INST[k];
  const costo = info.costo(n);
  if (c.inst[k] >= info.max) return { ok: false, reason: 'Ya está al máximo.', costo };
  if (c.obras.some((o) => o.tipo === k)) return { ok: false, reason: 'Ya hay una obra en marcha.', costo };
  if (c.obras.length >= 2) return { ok: false, reason: 'Hay dos obras en marcha: esperá que termine una.', costo };
  if (c.presupuesto < costo) return { ok: false, reason: 'No alcanza la plata.', costo };
  return { ok: true, costo };
}

export function build(g: GameState, k: InstKey): string {
  const chk = canBuild(g, k);
  if (!chk.ok) throw new Error(chk.reason);
  const c = g.clubs[g.userClubId];
  c.presupuesto -= chk.costo;
  c.obras.push({ tipo: k, fechas: INST[k].fechas, total: INST[k].fechas });
  logMoney(g, `Obra: ${INST[k].nombre} nivel ${c.inst[k] + 1}`, -chk.costo);
  return `Arrancó la obra: ${INST[k].nombre.toLowerCase()} nivel ${c.inst[k] + 1}. Tarda ${INST[k].fechas} fechas.`;
}

// ---------- Empleados ----------

export interface StaffInfo {
  nombre: string;
  efecto: string;
}
export const STAFF: Record<StaffKey, StaffInfo> = {
  nutricionista: { nombre: 'Nutricionista', efecto: 'Los jugadores se cansan menos durante el partido y recuperan más energía en la semana.' },
  kinesiologo: { nombre: 'Kinesiólogo', efecto: 'Los lesionados se recuperan más rápido.' },
  medico: { nombre: 'Médico', efecto: 'Menos lesiones en los partidos y en los entrenamientos, y las lesiones son más cortas.' },
  ayudante: { nombre: 'Ayudante de campo', efecto: 'Estudia al rival: el equipo juega un poco mejor y en el entretiempo te da consejos.' },
  ojeador: { nombre: 'Ojeador de juveniles', efecto: 'Recorre los clubes del interior buscando pibes. Cuanto mejor, más juveniles encuentra cada temporada y con más futuro.' },
};
export const STAFF_ORDER: StaffKey[] = ['nutricionista', 'kinesiologo', 'medico', 'ayudante', 'ojeador'];
export const STAFF_NIVEL = ['Sin contratar', 'Bueno', 'Muy bueno', 'Excelente'];
/** Sueldo por fecha según el nivel. */
export const staffSueldo = (n: number) => [0, 90_000, 200_000, 380_000][n] ?? 0;

export function staffInicial(rep: number): Staff {
  const n = rep >= 72 ? 2 : rep >= 62 ? 1 : 0;
  return { nutricionista: n, kinesiologo: n, medico: rep >= 58 ? Math.max(1, n) : 0, ayudante: n, ojeador: rep >= 66 ? 1 : 0 };
}

export function setStaff(g: GameState, k: StaffKey, nivel: number): string {
  const c = g.clubs[g.userClubId];
  const prev = c.staff[k];
  if (nivel === prev) return '';
  // Contratar a alguien nuevo cuesta dos fechas de sueldo de entrada.
  if (nivel > 0) {
    const prima = staffSueldo(nivel) * 2;
    if (c.presupuesto < prima) throw new Error('No alcanza la plata para contratarlo.');
    c.presupuesto -= prima;
    logMoney(g, `Contratación: ${STAFF[k].nombre.toLowerCase()} (${STAFF_NIVEL[nivel].toLowerCase()})`, -prima);
  }
  c.staff[k] = nivel;
  return nivel === 0 ? `Se fue el ${STAFF[k].nombre.toLowerCase()}.` : `Contrataste un ${STAFF[k].nombre.toLowerCase()} ${STAFF_NIVEL[nivel].toLowerCase()}.`;
}

// ---------- Socios, entradas y plata por fecha ----------

export const cuotaSocio = (rep: number) => Math.round((700 + (rep - 40) * 25) / 50) * 50;
export const precioReferencia = (rep: number) => Math.round((1500 + (rep - 40) * 50) / 100) * 100;
export const sociosIniciales = (rep: number) => Math.round(((rep - 35) * 70) / 10) * 10;
export const tv = (c: Club) => (c.division === 'A' ? 1_200_000 : 400_000);

/** Cómo viene el equipo en los últimos partidos (-1 a 1). */
function racha(g: GameState, clubId: string) {
  const last = g.fixtures.filter((f) => f.result && (f.home === clubId || f.away === clubId)).slice(-4);
  if (!last.length) return 0;
  let s = 0;
  for (const f of last) {
    const r = f.result!;
    const mine = f.home === clubId ? r.ptsH - r.ptsA : r.ptsA - r.ptsH;
    s += mine > 0 ? 1 : mine < 0 ? -1 : 0;
  }
  return s / last.length;
}

export interface Asistencia {
  socios: number;
  publico: number;
  total: number;
  capacidad: number;
  recaudacion: number;
  quincho: number;
  lleno: boolean;
}

/** Cuánta gente va a la cancha y cuánto se recauda. */
export function asistencia(g: GameState, home: Club, away: Club, playoff: boolean, precio = home.precioEntrada): Asistencia {
  const cap = capacidad(home);
  const socios = Math.min(cap, Math.round(home.socios * 0.55));
  const ref = precioReferencia(home.reputacion);
  const form = 1 + racha(g, home.id) * 0.18;
  const rival = 1 + (away.reputacion - 60) / 50;
  const precioF = Math.pow(ref / Math.max(200, precio), 1.5);
  let demanda = (home.reputacion - 30) * 50 * form * rival * precioF * (playoff ? 1.7 : 1);
  if (home.division === 'A') demanda *= 1.15;
  if (isDerby(home, away)) demanda *= 1.5;
  const publico = Math.max(0, Math.min(cap - socios, Math.round(demanda)));
  const total = socios + publico;
  return {
    socios,
    publico,
    total,
    capacidad: cap,
    recaudacion: Math.round((publico * precio) / 1000) * 1000,
    quincho: Math.round((total * 220 * (home.inst?.quincho ?? 0)) / 1000) * 1000,
    lleno: total >= cap,
  };
}

/** Gastos fijos del club por fecha. */
export function gastosFecha(g: GameState, c: Club) {
  const sueldos = c.plantel.reduce((s, id) => s + (g.players[id]?.sueldo ?? 0), 0);
  const empleados = STAFF_ORDER.reduce((s, k) => s + staffSueldo(c.staff[k]), 0);
  const mant = INST_ORDER.reduce((s, k) => s + INST[k].mant * c.inst[k], 0);
  return { sueldos, empleados, mant, total: sueldos + empleados + mant };
}

/** Ingresos fijos por fecha (sin las entradas). */
export function ingresosFecha(c: Club) {
  const socios = c.socios * cuotaSocio(c.reputacion);
  return { socios, tv: tv(c), total: socios + tv(c) };
}


/** Después de cada fecha: sueldos, socios, tele, obras y premios del sponsor (solo el club del usuario). */
export function weeklyFinances(g: GameState, userFixture: Fixture | undefined, rng: Rng) {
  const c = g.clubs[g.userClubId];
  const ing = ingresosFecha(c);
  const gas = gastosFecha(g, c);
  c.presupuesto += ing.total - gas.total;
  logMoney(g, `Cuotas de ${c.socios.toLocaleString('es-AR')} socios`, ing.socios);
  logMoney(g, 'Derechos de TV', ing.tv);
  logMoney(g, 'Sueldos del plantel', -gas.sueldos);
  if (gas.empleados) logMoney(g, 'Sueldos de empleados', -gas.empleados);
  if (gas.mant) logMoney(g, 'Mantenimiento de instalaciones', -gas.mant);

  // Socios: suben si se gana, bajan si se pierde o si la entrada está muy cara.
  let d = 0;
  if (userFixture?.result) {
    const r = userFixture.result;
    const mine = userFixture.home === c.id ? r.ptsH - r.ptsA : r.ptsA - r.ptsH;
    d += mine > 0 ? 0.006 : mine < 0 ? -0.005 : 0.001;
    if (mine > 0 && c.sponsor?.porVictoria) {
      c.presupuesto += c.sponsor.porVictoria;
      logMoney(g, `Premio de ${c.sponsor.nombre} por ganar`, c.sponsor.porVictoria);
    }
  }
  if (c.precioEntrada > precioReferencia(c.reputacion) * 1.6) d -= 0.004;
  d += 0.0015 * (c.inst.quincho ?? 0);
  c.socios = Math.max(200, Math.round(c.socios * (1 + d + rng.normal(0, 0.002))));

  // Obras.
  for (const o of c.obras) o.fechas--;
  for (const o of c.obras.filter((x) => x.fechas <= 0)) {
    c.inst[o.tipo]++;
    addNewsLocal(g, `¡Obra terminada!`, `Se terminó la obra: ${INST[o.tipo].nombre.toLowerCase()} nivel ${c.inst[o.tipo]}.`);
  }
  c.obras = c.obras.filter((x) => x.fechas > 0);
}

function addNewsLocal(g: GameState, titulo: string, texto: string) {
  g.news.unshift({ id: `n${g.nextId++}`, temporada: g.temporada, round: g.round, titulo, texto });
  g.news = g.news.slice(0, 80);
}

// ---------- Sponsors ----------

const SPONSOR_NOMBRES = [
  'Yerbas Don Tito', 'Frigorífico La Pampita', 'Seguros El Ombú', 'Transportes Ruta Cinco', 'Lácteos Las Tres Vacas',
  'Ferretería El Tornillo', 'Panificadora La Espiga', 'Agro San Cayetano', 'Bodega Cerro Chato', 'Corralón El Ladrillo',
  'Cooperativa Eléctrica del Sur', 'Pinturerías Arcoíris',
];

export function sponsorOffers(rep: number, rng: Rng): SponsorDeal[] {
  const base = Math.max(15_000_000, (rep - 45) * 2_000_000);
  const names = rng.shuffle([...SPONSOR_NOMBRES]).slice(0, 3);
  const r = (x: number) => Math.round(x / 100_000) * 100_000;
  return [
    { nombre: names[0], tipo: 'fijo', fijo: r(base * (1 + rng.next() * 0.1)), porVictoria: 0 },
    { nombre: names[1], tipo: 'victoria', fijo: r(base * 0.55), porVictoria: r(base * 0.075) },
    { nombre: names[2], tipo: 'victoria', fijo: r(base * 0.8), porVictoria: r(base * 0.03) },
  ];
}

export function signSponsor(g: GameState, i: number): string {
  const c = g.clubs[g.userClubId];
  const d = g.sponsorOfertas[i];
  if (!d) throw new Error('Esa oferta ya no está.');
  c.sponsor = d;
  c.presupuesto += d.fijo;
  g.sponsorOfertas = [];
  logMoney(g, `Sponsor: ${d.nombre}`, d.fijo);
  return `Firmaste con ${d.nombre}.`;
}

// ---------- Contratos ----------

/** Lo que pide para renovar (por fecha). */
export function renewalDemand(p: Player): number {
  const base = wageFor(p);
  const moralF = p.moral < 45 ? 1.25 : p.moral < 60 ? 1.12 : 1.05;
  return Math.round((Math.max(base, p.sueldo) * moralF) / 1000) * 1000;
}

export function renew(g: GameState, id: string, anios: number): string {
  const p = g.players[id];
  if (p.clubId !== g.userClubId) throw new Error('No es de tu club.');
  if (p.edad >= 32 && anios > 1) throw new Error('A esta edad solo firma por una temporada.');
  p.sueldo = renewalDemand(p);
  p.contrato = Math.max(p.contrato, 0) + anios;
  p.moral = clamp(p.moral + 5, 0, 100);
  return `${p.apellido} renovó por ${anios} ${anios === 1 ? 'temporada' : 'temporadas'} más.`;
}

/** Valores iniciales de las cosas nuevas del club. */
export function initClubBusiness(c: Club) {
  c.socios ??= sociosIniciales(c.reputacion);
  c.precioEntrada ??= precioReferencia(c.reputacion);
  c.inst ??= instInicial(c.reputacion);
  c.staff ??= staffInicial(c.reputacion);
  c.staff.ayudante ??= 0;
  c.staff.ojeador ??= 0;
  c.obras ??= [];
  c.sponsor ??= null;
}
