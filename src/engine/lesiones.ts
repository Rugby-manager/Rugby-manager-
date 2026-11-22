import { Rng, clamp } from './rng';
import { lesionNombre } from './players';
import type { Club, Fixture, GameState, Player } from './types';

/** Qué tan bueno es el kine (0 = no hay, 3 = excelente). */
const nivelKine = (c?: Club | null) => c?.staff?.kinesiologo ?? 0;

/** Riesgo de recaer si lo hacés volver antes (0 a 1). */
export function riesgoApurar(p: Player, c?: Club | null) {
  if (p.lesion <= 0) return 0;
  return clamp(0.12 + 0.11 * p.lesion - 0.05 * nivelKine(c), 0.08, 0.75);
}

/** El parte del kinesiólogo, en criollo. */
export function parteKine(p: Player, c?: Club | null): string {
  const k = nivelKine(c);
  const quien = k >= 2 ? 'El kine' : k > 0 ? 'El kine (que no es de los mejores)' : 'Sin kinesiólogo, el médico de guardia';
  const riesgo = Math.round(riesgoApurar(p, c) * 100);
  const vuelve = p.lesion === 1 ? 'la fecha que viene' : `en ${p.lesion} fechas`;
  return `${quien} dice que vuelve ${vuelve}. Si lo apurás, puede jugar ya, pero tiene ${riesgo}% de chance de recaer en los próximos 3 partidos (y la recaída es más larga).`;
}

/** Lo hacés volver ya, con el riesgo de que recaiga. */
export function apurarVuelta(g: GameState, id: string): string {
  const p = g.players[id];
  const c = g.clubs[g.userClubId];
  if (!p || p.clubId !== c.id || p.lesion <= 0) throw new Error('No está lesionado.');
  const riesgo = riesgoApurar(p, c);
  p.recaida = { riesgo, partidos: 3, semanas: p.lesion };
  p.lesion = 0;
  p.energia = Math.min(p.energia, 80);
  return `${p.apellido} vuelve antes de tiempo. Cruzá los dedos: ${Math.round(riesgo * 100)}% de chance de recaída.`;
}

/** Después de cada partido: los que volvieron apurados pueden recaer. */
export function chequearRecaidas(g: GameState, f: Fixture, rng: Rng): string[] {
  const avisos: string[] = [];
  for (const id of f.result?.jugaron ?? []) {
    const p = g.players[id];
    if (!p?.recaida) continue;
    if (p.lesion === 0 && rng.chance(p.recaida.riesgo)) {
      p.lesion = Math.max(2, p.recaida.semanas * 2);
      p.lesionTipo = `Recaída: ${lesionNombre(p.lesion, p.id + f.id)}`;
      delete p.recaida;
      if (p.clubId === g.userClubId) avisos.push(`${p.nombre} ${p.apellido} recayó por volver antes de tiempo: afuera ${p.lesion} fechas.`);
      continue;
    }
    p.recaida.partidos--;
    if (p.recaida.partidos <= 0) delete p.recaida;
  }
  return avisos;
}
