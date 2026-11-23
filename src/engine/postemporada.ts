// Postemporada: entre una temporada y la otra elegís qué hace el plantel.
import { Rng, clamp } from './rng';
import { logMoney } from './market';
import { ATTR_KEYS, W, overall, ratingAs } from './players';
import type { AttrKey, GameState } from './types';

export type PlanPost = 'vacaciones' | 'fisico' | 'intenso' | 'gira';

export const PLANES_POST: { id: PlanPost; icono: string; titulo: string; texto: string; costo: number }[] = [
  { id: 'vacaciones', icono: '🏖️', titulo: 'Vacaciones largas', texto: 'Descansan y vuelven contentos (+8 de moral). Algunos vuelven con unos kilos de más (pierden un poco de resistencia).', costo: 0 },
  { id: 'fisico', icono: '🏋️', titulo: 'Bloque físico', texto: 'Pretemporada de gimnasio y cerros: suben resistencia, velocidad y dureza. Cuesta $1 M.', costo: 1_000_000 },
  { id: 'intenso', icono: '🔥', titulo: 'Bloque físico intenso', texto: 'Doble turno todos los días: suben bastante más, pero se quejan (−5 de moral) y alguno puede arrancar lesionado. Cuesta $2,5 M.', costo: 2_500_000 },
  { id: 'gira', icono: '✈️', titulo: 'Gira de verano por el exterior', texto: 'Tres amistosos afuera. Te pagan por ir y un premio por cada partido ganado, y los de 23 años o menos suman experiencia. Vuelven un poco cansados.', costo: 0 },
];

export interface GiraResultado {
  temporada: number;
  destino: string;
  partidos: { rival: string; pf: number; pc: number }[];
  plata: number;
  mejoraron: number;
  vista?: boolean;
}

/** Destinos y clubes inventados de cada gira. */
const GIRAS: { destino: string; rivales: string[] }[] = [
  { destino: 'Francia', rivales: ['Stade Montcalm', 'US Bréville', 'Racing Club de Lavaur'] },
  { destino: 'Inglaterra', rivales: ['Ashworth RFC', 'Kingsbury Saints', 'Old Fenwick'] },
  { destino: 'Sudáfrica', rivales: ['Vaalkop Rugby', 'Highveld Leeus', 'Kaapstad Varsity'] },
  { destino: 'Nueva Zelanda', rivales: ['Tawhiri RFC', 'Southbridge Marist', 'Kaiora Old Boys'] },
  { destino: 'Italia', rivales: ['Rugby Valdarno', 'CUS Montebello', 'Amatori Sestri'] },
  { destino: 'Irlanda', rivales: ['Ballycrean RFC', 'Dunmore Wanderers', 'St. Colm College'] },
];
/** Lo que te pagan por ir y por cada victoria, según tu categoría. */
export const PAGO_GIRA: Record<string, { cachet: number; victoria: number }> = {
  A: { cachet: 6_000_000, victoria: 1_500_000 },
  B: { cachet: 4_000_000, victoria: 1_000_000 },
  C: { cachet: 3_000_000, victoria: 800_000 },
};

/** Adónde va la gira de esta temporada. */
export const destinoGira = (g: GameState) => GIRAS[(g.temporada * 7 + g.userClubId.length) % GIRAS.length];

/** Se juega la gira (al arrancar la temporada nueva). */
function jugarGira(g: GameState, rng: Rng): GiraResultado {
  const c = g.clubs[g.userClubId];
  const gira = GIRAS[((g.temporada - 1) * 7 + g.userClubId.length) % GIRAS.length];
  const pago = PAGO_GIRA[c.division] ?? PAGO_GIRA.C;
  const partidos = gira.rivales.map((rival, i) => {
    // El primero es más flojo y el último, el más duro.
    const diff = (i === 0 ? 4 : i === 1 ? 0 : -4) + rng.normal(0, 3);
    const tries = (d: number) => Math.max(0, Math.round(rng.normal(3.5 + d / 5, 1.5)));
    const tf = tries(diff);
    const tc = tries(-diff);
    const pts = (t: number) => t * 5 + Math.round(t * 0.65) * 2 + rng.int(0, 3) * 3;
    return { rival, pf: pts(tf), pc: pts(tc) };
  });
  const ganados = partidos.filter((p) => p.pf > p.pc).length;
  const plata = pago.cachet + ganados * pago.victoria;
  c.presupuesto += plata;
  logMoney(g, `Gira de verano por ${gira.destino} (${ganados} ${ganados === 1 ? 'victoria' : 'victorias'})`, plata);
  let mejoraron = 0;
  for (const id of c.plantel) {
    const p = g.players[id];
    if (!p) continue;
    p.energia = Math.min(p.energia, 88);
    p.moral = clamp(p.moral + (ganados >= 2 ? 5 : ganados === 1 ? 0 : -4), 20, 100);
    if (p.edad <= 23 && ratingAs(p.attrs, p.pos) < p.potencial) {
      const ks = ATTR_KEYS.filter((k) => k !== 'liderazgo' && k !== 'actitud');
      const pesos = W[p.pos];
      const n = rng.chance(0.4) ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const k = rng.weighted(ks, ks.map((x) => 0.3 + (pesos[x] ?? 0) * 3));
        p.attrs[k] = Math.min(99, p.attrs[k] + 1);
      }
      mejoraron++;
    }
  }
  return { temporada: g.temporada, destino: gira.destino, partidos, plata, mejoraron };
}

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
  if (ps.plan === 'gira') {
    const r = jugarGira(g, rng);
    g.gira = r;
    for (const id of c.plantel) {
      const p = g.players[id];
      if (!p) continue;
      p.attrsInicio = { ...p.attrs };
      p.ovrInicio = overall(p);
    }
    const ganados = r.partidos.filter((x) => x.pf > x.pc).length;
    return `Volvieron de la gira por ${r.destino}: ganaron ${ganados} de 3 y cobraste $${r.plata.toLocaleString('es-AR')}. ${r.mejoraron} jugadores jóvenes volvieron con más experiencia.`;
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
