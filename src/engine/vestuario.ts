// Vestuario vivo: los jugadores piden cosas, se enojan o se pelean, y vos decidís.
import { Rng, clamp } from './rng';
import { overall } from './players';
import type { GameState, Player, VestuarioEvento } from './types';

export interface OpcionVestuario {
  texto: string;
  efecto: string;
}

const nom = (p: Player) => `${p.nombre} ${p.apellido}`;

/** Qué dice el evento y qué podés contestar. */
export function describirEvento(g: GameState, e: VestuarioEvento): { titulo: string; texto: string; opciones: OpcionVestuario[] } {
  const [a, b] = e.players.map((id) => g.players[id]);
  if (e.tipo === 'minutos')
    return {
      titulo: `${a.apellido} quiere jugar más`,
      texto: `${nom(a)} golpeó la puerta de tu oficina: "Entreno como el que más y no me ponés nunca. Quiero minutos."`,
      opciones: [
        { texto: 'Prometerle minutos', efecto: 'Se pone contento (+15 de moral). Tiene que jugar en las próximas 3 fechas, si no se enoja feo.' },
        { texto: 'Que se gane el lugar', efecto: 'Se va callado (−6 de moral), pero entrena con más ganas.' },
        { texto: 'Ponerlo transferible', efecto: 'Le buscás club (−8 de moral). Le van a llegar ofertas.' },
      ],
    };
  if (e.tipo === 'irse')
    return {
      titulo: `${a.apellido} quiere irse`,
      texto: `${nom(a)} dice que está para un club más grande y que se quiere ir. El vestuario está atento a qué hacés.`,
      opciones: [
        { texto: 'Subirle el sueldo', efecto: `Cobra un 25% más (${Math.round(a.sueldo * 0.25).toLocaleString('es-AR')} más por fecha) y se queda contento (+20 de moral).` },
        { texto: 'Convencerlo de quedarse', efecto: 'Depende de cómo lo tomes: puede quedarse tranquilo o enojarse más.' },
        { texto: 'Dejarlo ir', efecto: 'Lo ponés transferible y se va contento cuando aparezca una oferta.' },
      ],
    };
  return {
    titulo: `Pelea en el vestuario`,
    texto: `${nom(a)} y ${nom(b)} se agarraron a las piñas después del entrenamiento. Todo el plantel vio la escena.`,
    opciones: [
      { texto: 'Multa a los dos', efecto: 'Los dos se enojan (−8 de moral) pero el resto ve que hay orden (+2).' },
      { texto: 'Charla y abrazo', efecto: 'Se amigan (+5 de moral), aunque puede volver a pasar.' },
      { texto: 'Mirar para otro lado', efecto: 'No hacés nada. El plantel lo nota (−3 de moral para todos).' },
    ],
  };
}

/** Después de cada fecha puede pasar algo en el vestuario (uno a la vez). */
export function eventosVestuario(g: GameState, rng: Rng): string[] {
  const avisos: string[] = [];
  const club = g.clubs[g.userClubId];
  // Promesas de minutos que vencieron.
  for (const pr of [...(g.promesas ?? [])]) {
    const p = g.players[pr.playerId];
    if (!p || p.clubId !== club.id) {
      g.promesas = g.promesas!.filter((x) => x !== pr);
      continue;
    }
    if (p.temporada.partidos > pr.partidos) {
      g.promesas = g.promesas!.filter((x) => x !== pr);
      continue;
    }
    if (g.round >= pr.hasta) {
      g.promesas = g.promesas!.filter((x) => x !== pr);
      p.moral = clamp(p.moral - 20, 20, 100);
      p.transferible = true;
      avisos.push(`${p.apellido} está furioso: le prometiste minutos y no jugó. Pidió irse (quedó transferible).`);
    }
  }
  // Si quedó uno sin contestar dos fechas, se resuelve solo (mal).
  const pend = g.vestuario;
  if (pend && g.round - pend.round >= 2) {
    avisos.push(`No contestaste: ${resolverEvento(g, pend.tipo === 'pelea' ? 2 : 1, rng)}`);
  }
  if (g.vestuario || !rng.chance(0.22)) return avisos;
  const ps = club.plantel.map((id) => g.players[id]).filter((p) => p && p.lesion === 0 && !p.prestamo);
  const xv = new Set(club.xv);
  const tipo = rng.weighted(['minutos', 'irse', 'pelea'] as const, [3, 1.5, 2]);
  let players: string[] = [];
  if (tipo === 'minutos') {
    const c = ps.filter((p) => !xv.has(p.id) && overall(p) >= 62 && p.edad >= 19);
    if (c.length) players = [rng.weighted(c, c.map((p) => 1 + (70 - Math.min(70, p.moral)) / 10)).id];
  } else if (tipo === 'irse') {
    const top = [...ps].sort((a, b) => overall(b) - overall(a)).slice(0, 5).filter((p) => p.edad <= 31);
    if (top.length) players = [rng.weighted(top, top.map((p) => 1 + (100 - p.moral) / 15)).id];
  } else {
    const c = ps.filter((p) => p.attrs.actitud < 70 || p.moral < 55);
    if (c.length >= 2) {
      const a = rng.pick(c);
      const b = rng.pick(c.filter((x) => x !== a));
      players = [a.id, b.id];
    }
  }
  if (!players.length) return avisos;
  g.vestuario = { id: `v${g.nextId++}`, tipo, players, round: g.round };
  return avisos;
}

/** Elegís qué hacer. Devuelve lo que pasó. */
export function resolverEvento(g: GameState, opcion: number, rng = new Rng(g.rng ^ 0x5a5a)): string {
  const e = g.vestuario;
  if (!e) throw new Error('No hay nada pendiente en el vestuario.');
  g.vestuario = null;
  const club = g.clubs[g.userClubId];
  const [a, b] = e.players.map((id) => g.players[id]).filter(Boolean);
  if (!a || a.clubId !== club.id) return 'El asunto se resolvió solo.';
  const mov = (p: Player, d: number) => (p.moral = clamp(p.moral + d, 20, 100));
  if (e.tipo === 'minutos') {
    if (opcion === 0) {
      mov(a, 15);
      g.promesas = [...(g.promesas ?? []), { playerId: a.id, hasta: g.round + 3, partidos: a.temporada.partidos }];
      return `Le prometiste minutos a ${a.apellido}. Ponelo en alguna de las próximas 3 fechas.`;
    }
    if (opcion === 1) {
      mov(a, -6);
      a.attrs.actitud = Math.min(99, a.attrs.actitud + 1);
      return `${a.apellido} se fue callado, pero con ganas de demostrar.`;
    }
    mov(a, -8);
    a.transferible = true;
    return `${a.apellido} está en la lista de transferibles.`;
  }
  if (e.tipo === 'irse') {
    if (opcion === 0) {
      a.sueldo = Math.round((a.sueldo * 1.25) / 1000) * 1000;
      mov(a, 20);
      return `${a.apellido} firmó una mejora y se queda contento.`;
    }
    if (opcion === 1) {
      const lid = club.plantel.reduce((m, id) => Math.max(m, g.players[id]?.attrs.liderazgo ?? 0), 0);
      if (rng.chance(0.45 + (lid - 70) / 100)) {
        mov(a, 10);
        return `Lo convenciste: ${a.apellido} se queda y está más tranquilo.`;
      }
      mov(a, -12);
      return `${a.apellido} no quedó convencido y sigue con la cabeza en otro lado.`;
    }
    a.transferible = true;
    mov(a, 5);
    return `${a.apellido} queda transferible. Te agradece la sinceridad.`;
  }
  // Pelea
  if (opcion === 0) {
    for (const p of [a, b]) if (p) mov(p, -8);
    for (const id of club.plantel) if (id !== a.id && id !== b?.id) mov(g.players[id], 2);
    return 'Multa para los dos. El resto del plantel tomó nota.';
  }
  if (opcion === 1) {
    for (const p of [a, b]) if (p) mov(p, 5);
    return `${a.apellido}${b ? ` y ${b.apellido}` : ''} se dieron la mano. Por ahora, paz.`;
  }
  for (const id of club.plantel) mov(g.players[id], -3);
  return 'Miraste para otro lado y el plantel lo notó.';
}
