// Ex jugadores al staff: un ídolo que se retira puede volver como ayudante de campo o entrenador de juveniles.
import { clamp } from './rng';
import { POS_LABEL, overall } from './players';
import { STAFF, efectoEstrellas, staffEstrellas, staffSueldo } from './club';
import { esPers } from './personalidad';
import type { GameState, Player, StaffKey } from './types';

export interface Idolo {
  id: string;
  nombre: string;
  puesto: string;
  edad: number;
  partidos: number;
  tries: number;
  temporadas: number;
  /** Estrellas que tendría como empleado (1 a 5). */
  estrellas: number;
  temporada: number;
}

export const PUESTOS_IDOLO: StaffKey[] = ['ayudante', 'juveniles'];

/** ¿Es un ídolo del club? Muchos partidos, muchos años, muy bueno o líder de verdad. */
export function esIdolo(g: GameState, p: Player): boolean {
  const k = p.conClub?.clubId === g.userClubId ? p.conClub : undefined;
  const partidos = (k?.partidos ?? 0) + p.temporada.partidos;
  const temporadas = (k?.temporadas ?? 0) + 1;
  const fama = (g.salonFama ?? []).some((x) => x.playerId === p.id && x.clubId === g.userClubId);
  const lider = (esPers(p, 'lider') || esPers(p, 'declub')) && temporadas >= 3;
  return fama || partidos >= 30 || temporadas >= 4 || lider || overall(p) >= 78;
}

/** Se retiró un jugador tuyo: si es un ídolo, queda para ofrecerle un lugar en el cuerpo técnico. */
export function anotarIdolo(g: GameState, p: Player) {
  if (!esIdolo(g, p)) return;
  const k = p.conClub?.clubId === g.userClubId ? p.conClub : undefined;
  const base = ((p.attrs.liderazgo ?? 60) - 35) / 10 + (esPers(p, 'lider') ? 1 : 0) + (overall(p) >= 78 ? 0.5 : 0);
  g.idolos = [
    ...(g.idolos ?? []),
    {
      id: p.id,
      nombre: `${p.nombre} ${p.apellido}`,
      puesto: POS_LABEL[p.pos],
      edad: p.edad,
      partidos: (k?.partidos ?? 0) + p.temporada.partidos,
      tries: (k?.tries ?? 0) + p.temporada.tries,
      temporadas: (k?.temporadas ?? 0) + 1,
      estrellas: clamp(Math.round(base), 2, 5),
      temporada: g.temporada + 1,
    },
  ];
}

/** Los que esperan tu respuesta (la oferta dura hasta la fecha 4). */
export function idolosPendientes(g: GameState): Idolo[] {
  // Como mucho dos por temporada: los de más partidos.
  return (g.idolos ?? []).filter((x) => x.temporada === g.temporada && g.phase === 'regular' && g.round <= 4).sort((a, b) => b.partidos - a.partidos).slice(0, 2);
}

/** Sueldo del ídolo: cobra un 30% menos porque vuelve a su casa. */
export const sueldoIdolo = (g: GameState, i: Idolo) => Math.round(staffSueldo(i.estrellas, g.clubs[g.userClubId]) * 0.7);

export function contratarIdolo(g: GameState, id: string, k: StaffKey): string {
  const i = (g.idolos ?? []).find((x) => x.id === id);
  if (!i) throw new Error('Ya no está disponible.');
  const c = g.clubs[g.userClubId];
  const antes = staffEstrellas(c, k);
  c.staffPersonas = { ...(c.staffPersonas ?? {}), [k]: { nombre: i.nombre, estrellas: i.estrellas, idolo: true } };
  c.staff[k] = efectoEstrellas(i.estrellas);
  c.hinchada = clamp((c.hinchada ?? 55) + 4, 0, 100);
  g.idolos = (g.idolos ?? []).filter((x) => x.id !== id);
  return `${i.nombre} vuelve al club como ${STAFF[k].nombre.toLowerCase()} (${i.estrellas}★).${antes ? ' El que estaba antes deja su lugar.' : ''} La hinchada está feliz.`;
}

export function homenajeIdolo(g: GameState, id: string): string {
  const i = (g.idolos ?? []).find((x) => x.id === id);
  g.idolos = (g.idolos ?? []).filter((x) => x.id !== id);
  const c = g.clubs[g.userClubId];
  c.hinchada = clamp((c.hinchada ?? 55) + 1, 0, 100);
  return i ? `Le hicieron un homenaje a ${i.nombre} antes del partido. ¡Gracias, ídolo!` : '';
}

/** Se borran los que nadie contrató (se llama al cerrar la temporada, antes de anotar los nuevos). */
export function limpiarIdolos(g: GameState) {
  g.idolos = (g.idolos ?? []).filter((x) => x.temporada > g.temporada);
}
