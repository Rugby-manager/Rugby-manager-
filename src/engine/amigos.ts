import { Rng, clamp } from './rng';
import { ATTR_KEYS, W, assignDorsal, makeAttrs, overall, ratingAs, wageFor } from './players';
import type { Attrs, GameState, Player, Pos } from './types';

/** Luca: jugadores con nombres fijos que están en todas las partidas. */
export interface Amigo {
  nombre: string;
  apellido: string;
  pos: Pos;
  pos2: Pos[];
  /** Media aproximada. */
  nivel: number;
  edad: number;
  /** Código del club donde juega (el código no cambia aunque el club cambie de nombre). */
  club: string;
  /** El mejor jugador del juego. */
  crack?: boolean;
}

/** Luca: todos juntos en Deportivo Camet. */
export const CLUB_AMIGOS = 'LAG';

export const AMIGOS: Amigo[] = [
  { nombre: 'Luca', apellido: 'Satti', pos: 'MSC', pos2: [], nivel: 97, edad: 24, club: CLUB_AMIGOS, crack: true },
  { nombre: 'Samu', apellido: 'Delo', pos: 'WIN', pos2: [], nivel: 75, edad: 23, club: CLUB_AMIGOS },
  { nombre: 'Lucca', apellido: 'Grav', pos: 'WIN', pos2: [], nivel: 74, edad: 24, club: CLUB_AMIGOS },
  { nombre: 'Ivo', apellido: 'Corba', pos: 'TER', pos2: [], nivel: 75, edad: 25, club: CLUB_AMIGOS },
  { nombre: 'Nahuel', apellido: 'Berta', pos: 'APE', pos2: ['CEN'], nivel: 76, edad: 25, club: CLUB_AMIGOS },
  { nombre: 'Yoel', apellido: 'Berta', pos: 'APE', pos2: ['CEN', 'FUL'], nivel: 74, edad: 22, club: CLUB_AMIGOS },
  { nombre: 'Gastón', apellido: 'Rodri', pos: 'CEN', pos2: ['WIN'], nivel: 75, edad: 26, club: CLUB_AMIGOS },
  { nombre: 'Javier', apellido: 'Cervi', pos: 'TER', pos2: ['CEN'], nivel: 74, edad: 27, club: CLUB_AMIGOS },
  { nombre: 'Fak', apellido: 'Juárez', pos: 'WIN', pos2: [], nivel: 73, edad: 22, club: CLUB_AMIGOS },
  { nombre: 'Santino', apellido: 'Juárez', pos: 'WIN', pos2: ['FUL'], nivel: 74, edad: 21, club: CLUB_AMIGOS },
  { nombre: 'Tiki', apellido: 'Alonso', pos: 'CEN', pos2: ['APE', 'WIN'], nivel: 81, edad: 24, club: CLUB_AMIGOS },
  // Galera RC (toda negra).
  { nombre: 'Fran', apellido: 'Powri', pos: 'SEG', pos2: [], nivel: 75, edad: 25, club: 'MIS' },
  { nombre: 'Gastón', apellido: 'Runedera', pos: 'CEN', pos2: [], nivel: 75, edad: 24, club: 'MIS' },
  { nombre: 'Justin', apellido: 'García', pos: 'FUL', pos2: [], nivel: 75, edad: 23, club: 'MIS' },
  { nombre: 'Felipao', apellido: 'García', pos: 'WIN', pos2: [], nivel: 75, edad: 22, club: 'MIS' },
  { nombre: 'Ena', apellido: 'Nosati', pos: 'TER', pos2: [], nivel: 93, edad: 25, club: 'MIS' },
];

const claveDe = (a: Pick<Amigo, 'nombre' | 'apellido'>) => `${a.nombre} ${a.apellido}`;

function semilla(s: string) {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h || 7;
}

/** Atributos del crack: lo máximo en todo lo que importa para su puesto. */
function attrsCrack(pos: Pos): Attrs {
  const a = {} as Attrs;
  for (const k of ATTR_KEYS) a[k] = (W[pos][k] ?? 0) >= 0.06 ? 98 : 86;
  a.liderazgo = 96;
  a.actitud = 95;
  return a;
}

function convertir(p: Player, a: Amigo) {
  const rng = new Rng(semilla(claveDe(a)));
  const attrs = a.crack ? attrsCrack(a.pos) : makeAttrs(rng, a.pos, a.nivel);
  if (!a.crack) attrs.actitud = Math.max(attrs.actitud, 70);
  const o = Math.round(ratingAs(attrs, a.pos));
  Object.assign(p, {
    nombre: a.nombre,
    apellido: a.apellido,
    pos: a.pos,
    pos2: [...a.pos2],
    edad: a.edad,
    attrs,
    attrsInicio: { ...attrs },
    ovrInicio: o,
    potencial: a.crack ? 99 : clamp(o + Math.max(0, 26 - a.edad) * 2, o, 90),
    moral: 75,
    lesion: 0,
    contrato: 4,
    amigo: claveDe(a),
    personalidad: a.crack ? 'lider' : '',
    carrera: { partidos: 0, tries: 0, puntos: 0 },
  } as Partial<Player>);
  delete p.transferible;
  delete p.listaPrestamo;
  delete p.lesionTipo;
  delete p.recaida;
  delete p.historia;
  p.entreno = null;
  p.sueldo = wageFor(p);
}

/**
 * Pone a los amigos de Luca en su club. Cada uno ocupa el lugar de un jugador inventado del mismo
 * puesto (así el plantel queda igual de largo); si ya no quedan de ese puesto, se suma uno más.
 * No hace nada con los que ya están.
 */
export function sumarAmigos(g: GameState) {
  const ya = new Set(Object.values(g.players).map((p) => p.amigo).filter(Boolean));
  for (const a of AMIGOS) {
    if (ya.has(claveDe(a))) continue;
    const club = Object.values(g.clubs).find((c) => (c.codigo ?? c.corto) === a.club);
    if (!club) continue;
    const candidatos = club.plantel
      .map((id) => g.players[id])
      .filter((p) => p && p.pos === a.pos && !p.amigo && !p.estrella && !p.prestamo && p.clubId === club.id)
      .sort((x, y) => overall(x) - overall(y));
    let p = candidatos[0];
    if (!p) {
      const id = `p${(g.nextId++).toString(36)}`;
      p = {
        id, nombre: '', apellido: '', pos: a.pos, pos2: [], edad: a.edad, attrs: {} as Attrs, potencial: 0, moral: 75, energia: 100,
        lesion: 0, clubId: club.id, temporada: { partidos: 0, tries: 0, puntos: 0 }, carrera: { partidos: 0, tries: 0, puntos: 0 },
        ovrInicio: 0, attrsInicio: {} as Attrs, dorsal: 0, entreno: null, sueldo: 0, contrato: 4,
      };
      g.players[id] = p;
      club.plantel.push(id);
      convertir(p, a);
      assignDorsal(club, g.players, p);
    } else {
      convertir(p, a);
      p.dorsal = 0;
      assignDorsal(club, g.players, p);
    }
    // El crack usa la 9: si la tiene otro, se la cambian.
    if (a.crack && p.dorsal !== 9) {
      const otro = club.plantel.map((id) => g.players[id]).find((x) => x && x.id !== p.id && x.dorsal === 9 && x.clubId === club.id);
      if (otro) otro.dorsal = p.dorsal;
      p.dorsal = 9;
    }
  }
}

/** Vuelve a armar a un amigo que ya estaba (cuando Luca le cambia el puesto o el nivel). */
export function rehacerAmigo(g: GameState, clave: string) {
  const a = AMIGOS.find((x) => claveDe(x) === clave);
  const p = Object.values(g.players).find((x) => x.amigo === clave);
  if (!a || !p) return;
  const dorsal = p.dorsal;
  convertir(p, a);
  p.dorsal = dorsal;
}
