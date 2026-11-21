// Copa Cruz del Sur: el campeón de la Primera A juega la temporada siguiente contra 3 clubes
// de otros países (todos inventados). Grupo de 4 a una rueda y final entre los dos primeros.
import { Rng } from './rng';
import type { ClubSeed } from './names';
import type { Fixture, GameState, MatchResult } from './types';

export const INTL_NOMBRE = 'Copa Cruz del Sur';
/** Se juega los miércoles, en semanas distintas de la Copa del Ñandubay. */
export const INTL_ROUNDS = [2.5, 6.5, 10.5, 14.5];
export const INTL_ETAPA = ['Grupo, fecha 1', 'Grupo, fecha 2', 'Grupo, fecha 3', 'Final'];
export const INTL_CHIP = ['CS 1', 'CS 2', 'CS 3', 'CS Final'];
/** Premios para tu club: por jugarla, por cada partido ganado y por salir campeón. */
export const INTL_PREMIO = { jugar: 5_000_000, victoria: 2_000_000, campeon: 15_000_000 };

/** Clubes de afuera (inventados). Cada temporada vienen 3. */
export const EXTRANJEROS: (ClubSeed & { pais: string })[] = [
  { nombre: 'Rambla RC', corto: 'RAM', ciudad: 'Montevideo', pais: 'Uruguay', apodo: '', colores: ['#0d6fb8', '#ffffff'], patron: 'aros', division: 'X' },
  { nombre: 'Club Colonia Rugby', corto: 'COL', ciudad: 'Colonia', pais: 'Uruguay', apodo: '', colores: ['#151515', '#e8c547'], patron: 'cuartos', division: 'X' },
  { nombre: 'Albatros de Valparaíso', corto: 'ALB', ciudad: 'Valparaíso', pais: 'Chile', apodo: '', colores: ['#c62828', '#ffffff'], patron: 'banda', division: 'X' },
  { nombre: 'Club Andino', corto: 'AND', ciudad: 'Santiago', pais: 'Chile', apodo: '', colores: ['#1b2a5c', '#c62828'], patron: 'aros', division: 'X' },
  { nombre: 'Yacarés de Asunción', corto: 'YAC', ciudad: 'Asunción', pais: 'Paraguay', apodo: '', colores: ['#2e7d32', '#ffffff'], patron: 'cuartos', division: 'X' },
  { nombre: 'Gaivotas de Floripa', corto: 'GAI', ciudad: 'Florianópolis', pais: 'Brasil', apodo: '', colores: ['#f2c230', '#1d7a3a'], patron: 'aros', division: 'X' },
  { nombre: 'Rímac RC', corto: 'RIM', ciudad: 'Lima', pais: 'Perú', apodo: '', colores: ['#8b1a2b', '#ffffff'], patron: 'banda', division: 'X' },
  { nombre: 'Club Cordillera', corto: 'COR', ciudad: 'La Paz', pais: 'Bolivia', apodo: '', colores: ['#3a6b35', '#f2c230'], patron: 'lisa', division: 'X' },
];

export const esExtranjero = (g: GameState, clubId?: string | null) => !!clubId && g.clubs[clubId]?.division === 'X';

/** Fixture del grupo: el club argentino (índice 0) es local dos veces. */
const GRUPO: [number, number][][] = [
  [[0, 1], [2, 3]],
  [[2, 0], [3, 1]],
  [[0, 3], [1, 2]],
];

export function fixturesGrupo(ids: string[], nuevoId: () => string): Fixture[] {
  return GRUPO.flatMap((pares, etapa) => pares.map(([h, a]) => ({ id: nuevoId(), round: INTL_ROUNDS[etapa], comp: 'INTL' as const, etapa, home: ids[h], away: ids[a] })));
}

export interface FilaIntl { clubId: string; pj: number; pg: number; pe: number; pp: number; pf: number; pc: number; pts: number }

const puntos = (r: MatchResult, local: boolean) => {
  const [m, s, t] = local ? [r.ptsH, r.ptsA, r.triesH] : [r.ptsA, r.ptsH, r.triesA];
  return (m > s ? 4 : m === s ? 2 : 0) + (t >= 4 ? 1 : 0) + (m < s && s - m <= 7 ? 1 : 0);
};

/** Tabla del grupo (4 puntos por ganar, 2 por empatar, bonus ofensivo y defensivo). */
export function tablaIntl(g: GameState): FilaIntl[] {
  const grupo = g.fixtures.filter((f) => f.comp === 'INTL' && (f.etapa ?? 0) < 3);
  const filas = new Map<string, FilaIntl>();
  for (const f of grupo) for (const id of [f.home, f.away]) if (!filas.has(id)) filas.set(id, { clubId: id, pj: 0, pg: 0, pe: 0, pp: 0, pf: 0, pc: 0, pts: 0 });
  for (const f of grupo) {
    const r = f.result;
    if (!r) continue;
    for (const local of [true, false]) {
      const row = filas.get(local ? f.home : f.away)!;
      const [m, s] = local ? [r.ptsH, r.ptsA] : [r.ptsA, r.ptsH];
      row.pj++;
      row.pf += m;
      row.pc += s;
      if (m > s) row.pg++;
      else if (m === s) row.pe++;
      else row.pp++;
      row.pts += puntos(r, local);
    }
  }
  return [...filas.values()].sort((a, b) => b.pts - a.pts || b.pf - b.pc - (a.pf - a.pc) || b.pf - a.pf);
}

/** Después de una fecha de la copa: arma la final o devuelve el campeón. */
export function avanzarIntl(g: GameState, terminada: number, ganador: (f: Fixture) => string | null, nuevoId: () => string): { campeon?: string; final?: Fixture } {
  const ronda = g.fixtures.filter((f) => f.comp === 'INTL' && f.round === terminada);
  if (!ronda.length) return {};
  const etapa = ronda[0].etapa ?? 0;
  if (etapa === 3) return { campeon: ganador(ronda[0]) ?? ronda[0].home };
  if (etapa === 2) {
    const [a, b] = tablaIntl(g);
    const final: Fixture = { id: nuevoId(), round: INTL_ROUNDS[3], comp: 'INTL', etapa: 3, home: a.clubId, away: b.clubId };
    g.fixtures.push(final);
    return { final };
  }
  return {};
}

/** Elige 3 rivales de países distintos cuando se puede. */
export function elegirRivales(rng: Rng): (typeof EXTRANJEROS)[number][] {
  const pool = rng.shuffle([...EXTRANJEROS]);
  const out: typeof pool = [];
  for (const c of pool) if (out.length < 3 && !out.some((x) => x.pais === c.pais)) out.push(c);
  return out;
}
