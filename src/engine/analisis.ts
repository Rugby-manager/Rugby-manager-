// Análisis del rival: antes del partido el ayudante de campo te dice dónde es débil el otro equipo.
import { readyXV } from './players';
import { staffEstrellas, nombreStaff } from './club';
import type { Club, GameState, Player, Tactics } from './types';

export interface Consejo {
  /** Lo que vio el ayudante. */
  texto: string;
  /** Qué te sugiere cambiar en la táctica (si hay algo para cambiar). */
  aplicar?: Partial<Tactics>;
  accion?: string;
}

export interface Informe {
  ayudante: string | null;
  estrellas: number;
  rival: Club;
  consejos: Consejo[];
  /** Algo para cuidarse. */
  peligro?: string;
}

type Sector = 'scrum' | 'line' | 'tackleBacks' | 'velocidad' | 'altas' | 'pateador' | 'aire' | 'ruck';

function sectores(c: Club, g: GameState): Record<Sector, number> {
  const xv = readyXV(c, g.players).xv.map((id) => (id ? g.players[id] : undefined));
  const at = (idx: number[], k: keyof Player['attrs']) => {
    const v = idx.map((i) => xv[i]?.attrs[k]).filter((x): x is number => x !== undefined);
    return v.reduce((s, x) => s + x, 0) / Math.max(1, v.length);
  };
  const pateador = Math.max(...xv.map((p) => p?.attrs.precision ?? 0));
  return {
    scrum: at([0, 1, 2], 'scrum') * 0.7 + at([3, 4], 'scrum') * 0.3,
    line: at([3, 4], 'salto') * 0.6 + at([1], 'fuerzaLine') * 0.4,
    tackleBacks: at([8, 9, 10, 11, 12, 13, 14], 'tackle'),
    velocidad: at([10, 11, 12, 13, 14], 'velocidad'),
    altas: at([10, 13, 14], 'recepcion'),
    pateador,
    aire: at([...Array(15).keys()], 'resistencia'),
    ruck: at([5, 6, 7], 'ruck'),
  };
}

const DEBIL: Record<Sector, (r: Club) => Consejo> = {
  scrum: (r) => ({ texto: `El scrum de ${r.nombre} es flojo: si empujamos, les ganamos la pelota y sacamos penales.`, aplicar: { scrum: 'empujar' }, accion: 'Scrum: empujar' }),
  line: () => ({ texto: `Sus saltadores no son de los mejores: tirá el line y armá maul, que ahí los lastimamos.`, aplicar: { line: 'maul' }, accion: 'Line: maul' }),
  tackleBacks: (r) => ({ texto: `Los backs de ${r.nombre} tacklean mal: hay que abrir la pelota rápido para nuestros backs.`, aplicar: { ataque: 'abrir' }, accion: 'Ataque: abrir' }),
  velocidad: () => ({ texto: 'Sus wings y su fullback son lentos: si les ganamos la espalda, es try.', aplicar: { ataque: 'abrir' }, accion: 'Ataque: abrir' }),
  altas: () => ({ texto: 'Su fondo no agarra bien las pelotas altas: hay que patearles mucho.', aplicar: { pie: 'mucho', salida: 'alta' }, accion: 'Patear mucho y salida alta' }),
  pateador: () => ({ texto: 'No tienen un buen pateador: con defensa agresiva arriesgamos poco, porque los penales no los meten.', aplicar: { defensa: 'agresiva' }, accion: 'Defensa: agresiva' }),
  aire: () => ({ texto: 'Llegan con poco aire: en el último cuarto se caen. Guardá los cambios para el segundo tiempo y apretá al final.' }),
  ruck: (r) => ({ texto: `Los terceras líneas de ${r.nombre} no ganan el ruck: jugá con los forwards y cerrado.`, aplicar: { ataque: 'forwards' }, accion: 'Ataque: forwards' }),
};

const FUERTE: Record<Sector, string> = {
  scrum: 'Ojo con su scrum, que empuja mucho: no busques scrums cerca de nuestro in-goal.',
  line: 'Ganan mucho en el line: mejor no patear afuera cerca de nuestra zona.',
  tackleBacks: 'Sus backs defienden muy bien: abrir la pelota no va a ser fácil.',
  velocidad: 'Tienen backs muy rápidos: cuidado con las patadas largas sin presión.',
  altas: 'Su fondo es muy seguro con las altas: patearles no sirve de mucho.',
  pateador: 'Tienen un pateador de lujo: cada penal que les demos son 3 puntos. Defensa ordenada.',
  aire: 'Están muy bien físicamente: no los vamos a cansar.',
  ruck: 'Son muy fuertes en el ruck: van a pelear cada pelota en el piso.',
};

/** El informe del ayudante sobre el rival. Con más estrellas, más consejos y más precisos. */
export function analizarRival(g: GameState, rivalId: string): Informe {
  const yo = g.clubs[g.userClubId];
  const rival = g.clubs[rivalId];
  const estrellas = staffEstrellas(yo, 'ayudante');
  const base: Informe = { ayudante: estrellas ? nombreStaff(yo, 'ayudante') : null, estrellas, rival, consejos: [] };
  if (!estrellas) return base;
  const a = sectores(rival, g);
  const b = sectores(yo, g);
  const ks = Object.keys(a) as Sector[];
  // Dónde ellos están peor que nosotros (o peor de lo normal).
  const debil = ks
    .map((k) => ({ k, d: a[k] - b[k] + (a[k] - 65) * 0.5 }))
    .sort((x, y) => x.d - y.d);
  const n = estrellas >= 4 ? 3 : estrellas >= 3 ? 2 : 1;
  // Sin consejos que se contradigan (por ejemplo abrir y jugar con los forwards).
  const usadas = new Set<string>();
  for (const x of debil) {
    if (base.consejos.length >= n) break;
    const c = DEBIL[x.k](rival);
    const keys = Object.keys(c.aplicar ?? {});
    if (keys.some((k) => usadas.has(k))) continue;
    keys.forEach((k) => usadas.add(k));
    base.consejos.push(c);
  }
  if (estrellas >= 2) {
    const fuerte = ks.map((k) => ({ k, d: a[k] - b[k] + (a[k] - 65) * 0.5 })).sort((x, y) => y.d - x.d)[0];
    if (fuerte && fuerte.d > 3 && !base.consejos.some((c) => c.texto === DEBIL[fuerte.k](rival).texto)) base.peligro = FUERTE[fuerte.k];
  }
  return base;
}

/** Aplicás lo que sugiere el ayudante. */
export function aplicarConsejos(g: GameState, inf: Informe): string {
  const yo = g.clubs[g.userClubId];
  const cambios = inf.consejos.filter((c) => c.aplicar);
  if (!cambios.length) return 'No hay nada para cambiar en la táctica.';
  for (const c of cambios) yo.tactica = { ...yo.tactica, ...c.aplicar };
  return `Listo: ${cambios.map((c) => c.accion).join(', ').toLowerCase()}.`;
}
