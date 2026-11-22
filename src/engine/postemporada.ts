// Postemporada: entre una temporada y la otra elegís qué hace el plantel.
import { Rng, clamp } from './rng';
import { logMoney } from './market';
import { overall } from './players';
import type { AttrKey, GameState } from './types';

export type PlanPost = 'vacaciones' | 'fisico' | 'intenso';

export const PLANES_POST: { id: PlanPost; icono: string; titulo: string; texto: string; costo: number }[] = [
  { id: 'vacaciones', icono: '🏖️', titulo: 'Vacaciones largas', texto: 'Descansan y vuelven contentos (+8 de moral). Algunos vuelven con unos kilos de más (pierden un poco de resistencia).', costo: 0 },
  { id: 'fisico', icono: '🏋️', titulo: 'Bloque físico', texto: 'Pretemporada de gimnasio y cerros: suben resistencia, velocidad y dureza. Cuesta $1 M.', costo: 1_000_000 },
  { id: 'intenso', icono: '🔥', titulo: 'Bloque físico intenso', texto: 'Doble turno todos los días: suben bastante más, pero se quejan (−5 de moral) y alguno puede arrancar lesionado. Cuesta $2,5 M.', costo: 2_500_000 },
];

const FISICOS: AttrKey[] = ['resistencia', 'velocidad', 'dureza'];

/** Elegís el plan antes de empezar la temporada nueva. */
export function elegirPostemporada(g: GameState, plan: PlanPost) {
  g.postemporada = { temporada: g.temporada, plan };
}

/** Se aplica al arrancar la temporada nueva (después de que todos cumplen años). */
export function aplicarPostemporada(g: GameState, rng: Rng): string | null {
  const ps = g.postemporada;
  if (!ps || ps.temporada !== g.temporada - 1) return null;
  const c = g.clubs[g.userClubId];
  const info = PLANES_POST.find((x) => x.id === ps.plan)!;
  if (info.costo) {
    c.presupuesto -= info.costo;
    logMoney(g, `Postemporada: ${info.titulo.toLowerCase()}`, -info.costo);
  }
  const gym = c.inst?.gimnasio ?? 0;
  let lesionados = 0;
  for (const id of c.plantel) {
    const p = g.players[id];
    if (!p) continue;
    if (ps.plan === 'vacaciones') {
      p.moral = clamp(p.moral + 8, 20, 100);
      if (rng.chance(0.3)) p.attrs.resistencia = Math.max(20, p.attrs.resistencia - 1);
    } else {
      const base = ps.plan === 'intenso' ? 2 : 1;
      for (const k of FISICOS) {
        const sube = base + (rng.chance(0.25 + gym * 0.1) ? 1 : 0) - (p.edad >= 32 && rng.chance(0.5) ? 1 : 0);
        p.attrs[k] = Math.min(99, p.attrs[k] + Math.max(0, sube));
      }
      p.moral = clamp(p.moral - (ps.plan === 'intenso' ? 5 : 1), 20, 100);
      if (ps.plan === 'intenso' && rng.chance(0.08 - gym * 0.01)) {
        p.lesion = rng.int(1, 3);
        p.lesionTipo = 'Sobrecarga muscular';
        lesionados++;
      }
    }
    // Lo que sube en la postemporada no cuenta como mejora de la temporada nueva.
    p.attrsInicio = { ...p.attrs };
    p.ovrInicio = overall(p);
  }
  if (ps.plan === 'vacaciones') return 'Volvieron de las vacaciones con las pilas cargadas.';
  return `Terminó el ${info.titulo.toLowerCase()}: el plantel llega más fuerte y con más aire.${lesionados ? ` ${lesionados} ${lesionados === 1 ? 'arranca' : 'arrancan'} con una sobrecarga.` : ''}`;
}
