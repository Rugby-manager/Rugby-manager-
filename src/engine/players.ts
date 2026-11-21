import { Rng, clamp } from './rng';
import { APELLIDOS, NOMBRES } from './names';
import type { AttrKey, Attrs, Club, Player, Pos } from './types';

export const ATTR_KEYS: AttrKey[] = ['scrum', 'line', 'tackle', 'velocidad', 'manejo', 'pie', 'liderazgo', 'fisico', 'actitud'];

export const ATTR_LABEL: Record<AttrKey, string> = {
  scrum: 'Scrum',
  line: 'Line',
  tackle: 'Tackle',
  velocidad: 'Velocidad',
  manejo: 'Manejo',
  pie: 'Pie',
  liderazgo: 'Liderazgo',
  fisico: 'Físico',
  actitud: 'Actitud',
};

export const POS_LABEL: Record<Pos, string> = {
  PIL: 'Pilar',
  HOO: 'Hooker',
  SEG: 'Segunda línea',
  TER: 'Tercera línea',
  MSC: 'Medio scrum',
  APE: 'Apertura',
  CEN: 'Centro',
  WIN: 'Wing',
  FUL: 'Fullback',
};

export const POS_ORDER: Pos[] = ['PIL', 'HOO', 'SEG', 'TER', 'MSC', 'APE', 'CEN', 'WIN', 'FUL'];

/** Puesto natural de cada camiseta (índice 0 = camiseta 1). */
export const SHIRT_POS: Pos[] = ['PIL', 'HOO', 'PIL', 'SEG', 'SEG', 'TER', 'TER', 'TER', 'MSC', 'APE', 'WIN', 'CEN', 'CEN', 'WIN', 'FUL'];

export const SHIRT_LABEL = [
  'Pilar izquierdo', 'Hooker', 'Pilar derecho', 'Segunda línea', 'Segunda línea', 'Ala', 'Ala', 'Octavo',
  'Medio scrum', 'Apertura', 'Wing izquierdo', 'Primer centro', 'Segundo centro', 'Wing derecho', 'Fullback',
];

export const isForward = (p: Pos) => p === 'PIL' || p === 'HOO' || p === 'SEG' || p === 'TER';

export const W: Record<Pos, Partial<Attrs>> = {
  PIL: { scrum: 0.38, fisico: 0.26, tackle: 0.16, manejo: 0.06, line: 0.04, velocidad: 0.04, liderazgo: 0.06 },
  HOO: { line: 0.3, scrum: 0.26, tackle: 0.14, fisico: 0.14, manejo: 0.08, velocidad: 0.04, liderazgo: 0.04 },
  SEG: { line: 0.32, fisico: 0.24, tackle: 0.18, scrum: 0.12, manejo: 0.06, velocidad: 0.04, liderazgo: 0.04 },
  TER: { tackle: 0.3, fisico: 0.2, velocidad: 0.16, manejo: 0.14, line: 0.1, scrum: 0.04, liderazgo: 0.06 },
  MSC: { manejo: 0.34, velocidad: 0.18, pie: 0.18, tackle: 0.1, liderazgo: 0.12, fisico: 0.08 },
  APE: { pie: 0.34, manejo: 0.28, liderazgo: 0.14, velocidad: 0.1, tackle: 0.08, fisico: 0.06 },
  CEN: { manejo: 0.24, tackle: 0.22, velocidad: 0.2, fisico: 0.18, pie: 0.08, liderazgo: 0.08 },
  WIN: { velocidad: 0.4, manejo: 0.24, tackle: 0.12, fisico: 0.12, pie: 0.06, liderazgo: 0.06 },
  FUL: { velocidad: 0.26, pie: 0.22, manejo: 0.22, tackle: 0.16, fisico: 0.08, liderazgo: 0.06 },
};

/** Puestos parecidos: jugar ahí cuesta poco. */
const RELATED: Record<Pos, Pos[]> = {
  PIL: ['HOO'],
  HOO: ['PIL'],
  SEG: ['TER'],
  TER: ['SEG'],
  MSC: ['APE'],
  APE: ['MSC', 'CEN', 'FUL'],
  CEN: ['APE', 'WIN'],
  WIN: ['FUL', 'CEN'],
  FUL: ['WIN', 'APE'],
};

export function ratingAs(attrs: Attrs, pos: Pos): number {
  const w = W[pos];
  let s = 0;
  for (const k of ATTR_KEYS) s += (w[k] ?? 0) * attrs[k];
  return s;
}

export function overall(p: Player): number {
  return Math.round(ratingAs(p.attrs, p.pos));
}

/** Multiplicador por jugar en un puesto: el suyo, uno secundario, uno parecido u otro. */
export function familiarity(p: Pick<Player, 'pos' | 'pos2'>, slot: Pos): number {
  if (p.pos === slot) return 1;
  if (p.pos2?.includes(slot)) return 0.97;
  if (RELATED[p.pos].includes(slot)) return 0.9;
  if (isForward(p.pos) === isForward(slot)) return 0.84;
  return 0.72;
}

/** 'natural' | 'secundario' | 'fuera' para mostrar en pantalla. */
export function fitKind(p: Pick<Player, 'pos' | 'pos2'>, slot: Pos): 'natural' | 'secundario' | 'fuera' {
  if (p.pos === slot) return 'natural';
  if (p.pos2?.includes(slot)) return 'secundario';
  return 'fuera';
}

/** Puestos secundarios al azar: la mitad de los jugadores tiene uno y algunos tienen dos. */
export function rollSecondary(rng: Rng, pos: Pos): Pos[] {
  const r = rng.next();
  if (r < 0.4) return [];
  const opts = rng.shuffle([...RELATED[pos]]);
  const out: Pos[] = [opts[0]];
  if (r > 0.82) {
    const more = opts[1] ?? rng.pick(POS_ORDER.filter((x) => x !== pos && x !== opts[0] && isForward(x) === isForward(pos)));
    if (more) out.push(more);
  }
  return out;
}

export function posText(p: Pick<Player, 'pos' | 'pos2'>): string {
  return p.pos2?.length ? `${POS_LABEL[p.pos]} (también ${p.pos2.map((x) => POS_LABEL[x].toLowerCase()).join(' y ')})` : POS_LABEL[p.pos];
}

export function condition(p: Player): number {
  return (0.8 + 0.2 * (p.energia / 100)) * (0.96 + 0.08 * (p.moral / 100));
}

/** Rendimiento real del jugador en una camiseta (ya con energía, moral y puesto). */
export function slotRating(p: Player, shirtIdx: number): number {
  const slot = SHIRT_POS[shirtIdx];
  return ratingAs(p.attrs, slot) * familiarity(p, slot) * condition(p);
}

/** Valor en el mercado. Una media 70 vale unos $400 mil; una 80, cerca de $1 millón. */
export function marketValue(p: Player): number {
  const o = overall(p);
  const ageF = p.edad <= 23 ? 1.25 : p.edad <= 29 ? 1 : p.edad <= 32 ? 0.7 : 0.4;
  const potF = 1 + Math.max(0, p.potencial - o) / 60;
  return Math.max(1_000_000, Math.round((Math.pow(Math.max(o - 40, 1), 2.4) * 11_200 * ageF * potF) / 100_000) * 100_000);
}

/** Sueldo por fecha que pide un jugador (según lo que vale y la edad). */
export function wageFor(p: Player): number {
  const o = ratingAs(p.attrs, p.pos);
  // Los veteranos cobran por lo que fueron; los pibes, menos.
  const ageF = p.edad <= 21 ? 0.6 : p.edad <= 24 ? 0.85 : p.edad >= 31 ? 1.1 : 1;
  return Math.max(25_000, Math.round((Math.pow(Math.max(o - 40, 1), 2.2) * 165 * ageF) / 1000) * 1000);
}

export function randomName(rng: Rng): { nombre: string; apellido: string } {
  return { nombre: rng.pick(NOMBRES), apellido: rng.pick(APELLIDOS) };
}

/** La actitud no depende del nivel: hay cracks vagos y jugadores normales que dejan todo. */
export function rollActitud(rng: Rng): number {
  return Math.round(clamp(rng.normal(66, 12), 30, 97));
}

/** Multiplicador por actitud (1 con actitud 66). */
export const actitudMult = (a: number, k: number) => 1 + ((a ?? 66) - 66) * k;

export function makeAttrs(rng: Rng, pos: Pos, target: number): Attrs {
  const w = W[pos];
  const a = {} as Attrs;
  for (const k of ATTR_KEYS) {
    const weight = w[k] ?? 0;
    const base = weight >= 0.14 ? target + rng.normal(0, 5) : target - 14 + rng.normal(0, 9);
    a[k] = base;
  }
  // Los pateadores naturales son mejores con el pie.
  if (pos === 'APE' || pos === 'FUL') a.pie += 3;
  const diff = target - ratingAs(a, pos);
  for (const k of ATTR_KEYS) a[k] = Math.round(clamp(a[k] + diff, 25, 97));
  a.actitud = rollActitud(rng);
  return a;
}

export function generatePlayer(rng: Rng, id: string, pos: Pos, target: number, edad?: number): Player {
  const age = edad ?? clamp(Math.round(rng.normal(26, 4)), 18, 35);
  const t = clamp(target, 42, 90);
  const attrs = makeAttrs(rng, pos, t);
  const o = Math.round(ratingAs(attrs, pos));
  const room = age <= 25 ? Math.max(0, (26 - age) * 2.2 + rng.normal(2, 4)) : rng.normal(0, 1.5);
  const potencial = Math.round(clamp(o + Math.max(0, room), o, 94));
  const n = randomName(rng);
  const p: Player = {
    id,
    ...n,
    pos,
    pos2: rollSecondary(rng, pos),
    edad: age,
    attrs,
    potencial,
    moral: rng.int(55, 75),
    energia: 100,
    lesion: 0,
    clubId: null,
    temporada: { partidos: 0, tries: 0, puntos: 0 },
    carrera: { partidos: 0, tries: 0, puntos: 0 },
    ovrInicio: o,
    attrsInicio: { ...attrs },
    dorsal: 0,
    entreno: null,
    sueldo: 0,
    contrato: rng.int(1, 4),
  };
  p.sueldo = wageFor(p);
  return p;
}

const DORSAL_PREF: Record<Pos, number[]> = {
  PIL: [1, 3, 17, 18], HOO: [2, 16], SEG: [4, 5, 19], TER: [6, 7, 8, 20], MSC: [9, 21],
  APE: [10, 22], CEN: [12, 13, 23], WIN: [11, 14], FUL: [15],
};

/** Le da al jugador un número libre en su club, si puede el típico de su puesto. */
export function assignDorsal(club: Club, players: Record<string, Player>, p: Player) {
  const used = new Set(club.plantel.filter((id) => id !== p.id).map((id) => players[id]?.dorsal));
  if (p.dorsal && !used.has(p.dorsal)) return;
  p.dorsal = DORSAL_PREF[p.pos].find((n) => !used.has(n)) ?? Array.from({ length: 75 }, (_, i) => i + 24).find((n) => !used.has(n)) ?? 99;
}

/** Composición del plantel: 30 jugadores. */
export const SQUAD_TEMPLATE: Record<Pos, number> = {
  PIL: 5, HOO: 3, SEG: 4, TER: 5, MSC: 3, APE: 2, CEN: 3, WIN: 3, FUL: 2,
};

export const MIN_BY_POS: Record<Pos, number> = {
  PIL: 4, HOO: 2, SEG: 3, TER: 4, MSC: 2, APE: 2, CEN: 3, WIN: 3, FUL: 2,
};

const PICK_ORDER = [8, 9, 1, 14, 0, 2, 3, 4, 7, 5, 6, 11, 12, 10, 13];

export function isAvailable(p: Player | undefined): p is Player {
  return !!p && p.lesion === 0;
}

/** Arma el mejor XV disponible (rápido y "suficientemente bueno"). */
export function bestXV(club: Club, players: Record<string, Player>, fixed: (string | null)[] = []): (string | null)[] {
  const xv: (string | null)[] = Array(15).fill(null);
  const used = new Set<string>();
  fixed.forEach((id, i) => {
    if (id && isAvailable(players[id]) && !used.has(id)) {
      xv[i] = id;
      used.add(id);
    }
  });
  for (const i of PICK_ORDER) {
    if (xv[i]) continue;
    let best: string | null = null;
    let bestR = -1;
    for (const id of club.plantel) {
      if (used.has(id)) continue;
      const p = players[id];
      if (!isAvailable(p)) continue;
      // Preferimos jugadores del puesto aunque otro rinda un poquito más.
      const r = slotRating(p, i) + (p.pos === SHIRT_POS[i] ? 3 : p.pos2?.includes(SHIRT_POS[i]) ? 1.5 : 0);
      if (r > bestR) {
        bestR = r;
        best = id;
      }
    }
    xv[i] = best;
    if (best) used.add(best);
  }
  return xv;
}

/** Devuelve el XV listo para jugar: reemplaza lesionados o huecos. */
export function readyXV(club: Club, players: Record<string, Player>): { xv: (string | null)[]; cambios: number } {
  const keep = club.xv.map((id) => (id && isAvailable(players[id]) ? id : null));
  const cambios = keep.filter((x) => x === null).length;
  const filled = cambios ? bestXV(club, players, keep) : keep;
  return { xv: filled, cambios };
}

export function teamAverage(club: Club, players: Record<string, Player>): number {
  const xv = bestXV(club, players);
  const vals = xv.filter(Boolean).map((id) => overall(players[id!]));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

/** Suplentes 16 a 23: la camiseta de referencia de cada uno (índice del XV). */
export const BENCH_SHIRT = [1, 0, 2, 3, 5, 8, 9, 12];
export const BENCH_POS: Pos[] = BENCH_SHIRT.map((i) => SHIRT_POS[i]);

/** Arma el banco (16 a 23) con los mejores disponibles que no están en el XV. */
export function benchOf(club: Club, players: Record<string, Player>, xv: (string | null)[]): string[] {
  const used = new Set(xv.filter(Boolean) as string[]);
  const out: string[] = [];
  for (const i of BENCH_SHIRT) {
    let best: string | null = null;
    let bestR = -1;
    for (const id of club.plantel) {
      if (used.has(id)) continue;
      const p = players[id];
      if (!isAvailable(p)) continue;
      const r = slotRating(p, i) + (p.pos === SHIRT_POS[i] ? 3 : p.pos2?.includes(SHIRT_POS[i]) ? 1.5 : 0) + (p.energia - 100) * 0.05;
      if (r > bestR) {
        bestR = r;
        best = id;
      }
    }
    if (best) {
      out.push(best);
      used.add(best);
    }
  }
  return out;
}

const LESIONES: [number, string[]][] = [
  [1, ['Contractura', 'Golpe en el muslo', 'Esguince leve de tobillo', 'Corte en la ceja']],
  [3, ['Desgarro en el isquiotibial', 'Esguince de tobillo', 'Golpe en la rodilla', 'Hombro resentido']],
  [6, ['Fractura de mano', 'Luxación de hombro', 'Esguince de rodilla', 'Desgarro de gemelo']],
  [99, ['Fractura de clavícula', 'Rotura de ligamentos', 'Fractura de tobillo']],
];
/** Nombre de la lesión según cuántas semanas tiene afuera. */
export function lesionNombre(semanas: number, seed: string): string {
  const group = LESIONES.find(([max]) => semanas <= max)![1];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return group[h % group.length];
}
