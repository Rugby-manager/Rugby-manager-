// Hinchada y tercer tiempo: el humor de la gente sube y baja con los resultados y el precio de la entrada.
// Una hinchada contenta llena la cancha y el quincho; una enojada aprieta a la directiva.
import { clamp } from './rng';
import { isDerby } from './extras';
import { precioReferencia } from './club';
import type { Club, Fixture, GameState } from './types';

export const HINCHADA_INICIAL = 60;

export const humor = (c: Club) => c.hinchada ?? HINCHADA_INICIAL;

export function estadoHinchada(h: number): { label: string; icono: string; texto: string } {
  if (h < 20) return { label: 'Furiosa', icono: '😡', texto: 'La gente está harta: silbidos, cánticos contra la comisión y la tribuna medio vacía.' };
  if (h < 40) return { label: 'Enojada', icono: '😠', texto: 'La paciencia se acaba. Va menos gente y la directiva escucha las quejas.' };
  if (h < 60) return { label: 'Tranquila', icono: '😐', texto: 'La gente acompaña, pero espera más.' };
  if (h < 80) return { label: 'Contenta', icono: '🙂', texto: 'Buen clima en el club: viene más gente y el quincho se llena.' };
  return { label: 'Eufórica', icono: '🤩', texto: '¡Fiesta en la tribuna! Cancha llena y tercer tiempo hasta tarde.' };
}

/** ¿La entrada está cara para la gente? */
export function precioCaro(c: Club) {
  const r = c.precioEntrada / precioReferencia(c.reputacion);
  return r > 1.4 ? 2 : r > 1.15 ? 1 : 0;
}

/** Después de cada partido oficial del usuario. Devuelve los avisos para las noticias. */
export function hinchadaTrasPartido(g: GameState, f: Fixture, ganador: string | null): string[] {
  if (!f.result || f.comp === 'AMISTOSO') return [];
  const c = g.clubs[g.userClubId];
  const antes = humor(c);
  const local = f.home === c.id;
  const rival = g.clubs[local ? f.away : f.home];
  const r = f.result;
  const dif = Math.abs(r.ptsH - r.ptsA);
  const clasico = isDerby(g.clubs[f.home], g.clubs[f.away]);
  const grande = clasico || f.comp === 'SEMI' || f.comp === 'FINAL' || f.comp === 'INTL';
  let d = 0;
  if (ganador === c.id) d = grande ? 9 : rival.reputacion > c.reputacion + 3 ? 7 : 5;
  else if (ganador === null) d = rival.reputacion > c.reputacion + 3 ? 2 : -1;
  else d = clasico ? -10 : dif >= 25 ? -8 : -5;
  // De local, la entrada cara molesta y la barata se agradece.
  if (local) d += [0, -1, -3][precioCaro(c)] + (c.precioEntrada < precioReferencia(c.reputacion) * 0.85 ? 1 : 0);
  // Con el tiempo, el humor vuelve de a poco a la normalidad.
  let h = antes + d + (55 - antes) * 0.05;
  h = Math.round(clamp(h, 0, 100));
  c.hinchada = h;

  const avisos: string[] = [];
  if (ganador === c.id && local && (c.inst?.quincho ?? 0) > 0 && h >= 70) avisos.push(`Tercer tiempo a puro canto en el quincho después de ganarle a ${rival.nombre}.`);
  if (antes >= 40 && h < 40) avisos.push(`La hinchada está enojada: ${precioCaro(c) ? 'los resultados no acompañan y la entrada está cara' : 'los resultados no acompañan'}. Va a venir menos gente.`);
  if (antes >= 20 && h < 20) avisos.push('¡La hinchada está furiosa! Hubo silbidos y cánticos contra la comisión. La directiva te mira de reojo.');
  if (antes < 80 && h >= 80) avisos.push('¡La hinchada está eufórica! Se agotan las entradas y el club es una fiesta.');
  // La presión de la tribuna llega a la directiva.
  if (g.career) {
    if (h < 20) g.career.confianza = clamp(g.career.confianza - 3, 0, 100);
    else if (h < 35) g.career.confianza = clamp(g.career.confianza - 1, 0, 100);
    else if (h >= 85) g.career.confianza = clamp(g.career.confianza + 1, 0, 100);
  }
  return avisos;
}
