// Personalidades: algunos jugadores son líderes, otros conflictivos y otros "de club". Cambian el vestuario.
import { Rng, clamp } from './rng';
import type { GameState, Player } from './types';

export type Personalidad = 'lider' | 'conflictivo' | 'declub';

export const PERSONALIDAD: Record<Personalidad, { icono: string; label: string; texto: string }> = {
  lider: { icono: '🦁', label: 'Líder', texto: 'Ordena el vestuario: cuando juega, el plantel tiene más moral y hay menos peleas.' },
  conflictivo: { icono: '💣', label: 'Conflictivo', texto: 'Mucho carácter: si no juega o anda mal, contagia mal humor y arma líos en el vestuario.' },
  declub: { icono: '❤️', label: 'De club', texto: 'Ama la camiseta: renueva por menos plata, nunca pide irse y la hinchada lo quiere.' },
};

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** Le da una personalidad según su forma de ser (sale del id, así no cambia el azar del resto del juego). */
export function asignarPersonalidad(p: Player) {
  const x = (hash(`${p.id}|pers`) % 1000) / 1000;
  const lid = p.attrs.liderazgo ?? 60;
  const act = p.attrs.actitud ?? 66;
  const pLider = lid >= 78 ? 0.45 : lid >= 70 ? 0.15 : 0.03;
  const pConf = act < 55 ? 0.22 : act < 65 ? 0.08 : 0.03;
  const pClub = p.edad >= 27 ? 0.12 : 0.06;
  if (x < pLider) p.personalidad = 'lider';
  else if (x < pLider + pConf) p.personalidad = 'conflictivo';
  else if (x < pLider + pConf + pClub) p.personalidad = 'declub';
  else p.personalidad = '';
}

export const esPers = (p: Player | undefined, k: Personalidad) => !!p && p.personalidad === k;

/** Conflictivos con la cabeza caliente: no juegan o están bajoneados. */
export function conflictivosEnojados(g: GameState): Player[] {
  const club = g.clubs[g.userClubId];
  const xv = new Set(club.xv);
  return club.plantel
    .map((id) => g.players[id])
    .filter((p) => esPers(p, 'conflictivo') && !p.prestamo && (p.moral < 55 || (!xv.has(p.id) && p.lesion === 0)));
}

/** Líderes que están en el XV (como mucho cuentan 3). */
export function lideresEnCancha(g: GameState): Player[] {
  const club = g.clubs[g.userClubId];
  return club.xv.map((id) => (id ? g.players[id] : undefined)).filter((p): p is Player => esPers(p, 'lider')).slice(0, 3);
}

/** Después de cada fecha: los líderes levantan al grupo y los conflictivos enojados lo bajan. */
export function efectosPersonalidad(g: GameState, rng: Rng): string[] {
  const avisos: string[] = [];
  const club = g.clubs[g.userClubId];
  const lideres = lideresEnCancha(g);
  const enojados = conflictivosEnojados(g).filter((p) => p.moral < 50);
  const delta = (lideres.length ? 1 : 0) - (enojados.length ? 1 : 0);
  if (delta !== 0) {
    for (const id of club.plantel) {
      const p = g.players[id];
      if (!p || p.prestamo) continue;
      // El líder levanta a los que están bajos, no infla a los que ya están bien.
      if (delta > 0 && p.moral >= 72) continue;
      p.moral = clamp(p.moral + delta, 20, 100);
    }
  }
  // Los "de club" nunca se bajonean del todo.
  for (const id of club.plantel) {
    const p = g.players[id];
    if (esPers(p, 'declub') && p.moral < 45) p.moral = 45;
  }
  if (enojados.length && rng.chance(0.3)) {
    const p = rng.pick(enojados);
    avisos.push(`${p.nombre} ${p.apellido} anda con cara larga y contagia al vestuario. Hablá con él o ponelo a jugar.`);
  } else if (lideres.length && delta > 0 && rng.chance(0.12)) {
    const p = rng.pick(lideres);
    avisos.push(`${p.nombre} ${p.apellido} juntó al plantel después del entrenamiento: "Somos un equipo." El grupo está más unido.`);
  }
  return avisos;
}

/** Cuánto más (o menos) probable es que pase algo en el vestuario. */
export function ajusteVestuario(g: GameState): number {
  return 0.06 * Math.min(3, conflictivosEnojados(g).length) - 0.04 * lideresEnCancha(g).length;
}
