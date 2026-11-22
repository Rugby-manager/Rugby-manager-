// Árbitros con estilo propio (nombres inventados).
import type { Fixture } from './types';

export type EstiloArbitro = 'estricto' | 'normal' | 'dejaJugar';

export interface Arbitro {
  nombre: string;
  estilo: EstiloArbitro;
}

export const ARBITROS: Arbitro[] = [
  { nombre: 'Horacio Lavalle', estilo: 'estricto' },
  { nombre: 'Marcelo Ibarguren', estilo: 'estricto' },
  { nombre: 'Rubén Etcheverry', estilo: 'estricto' },
  { nombre: 'Damián Quiroga', estilo: 'normal' },
  { nombre: 'Federico Arrieta', estilo: 'normal' },
  { nombre: 'Gustavo Pellegrini', estilo: 'normal' },
  { nombre: 'Pablo Santillán', estilo: 'normal' },
  { nombre: 'Nicolás Garmendia', estilo: 'dejaJugar' },
  { nombre: 'Tomás Barrionuevo', estilo: 'dejaJugar' },
  { nombre: 'Esteban Urquiza', estilo: 'dejaJugar' },
];

export const ESTILO: Record<EstiloArbitro, { label: string; texto: string; pen: number; amarilla: number }> = {
  estricto: { label: 'Estricto', texto: 'Cobra todo: más penales y más tarjetas. Conviene un equipo disciplinado y un buen pateador.', pen: 1.22, amarilla: 1.6 },
  normal: { label: 'Normal', texto: 'Ni muy estricto ni muy permisivo.', pen: 1, amarilla: 1 },
  dejaJugar: { label: 'Deja jugar', texto: 'Aplica ventaja y casi no saca tarjetas: partido más abierto.', pen: 0.82, amarilla: 0.55 },
};

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** Quién dirige el partido (siempre el mismo para ese partido). */
export function arbitroDe(f: Pick<Fixture, 'id'>, temporada: number): Arbitro {
  return ARBITROS[hash(`${f.id}-${temporada}`) % ARBITROS.length];
}
