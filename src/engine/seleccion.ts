// Selecciones nacionales: los 24 países del Mundial 2027 (Australia). Los países son reales,
// los jugadores son todos inventados. Con más trayectoria como DT te llaman selecciones mejores.
// En una selección no se compra ni se vende: se convoca.
import { Rng, clamp } from './rng';
import { ATTR_KEYS, POS_ORDER, bestXV, generatePlayer, overall } from './players';
import { simulateMatch } from './match';
import { addNews } from './game';
import { logMoney } from './market';
import { esAnioMundial, fechaAmistoso, fechaRonda, fechasJulio, fechasMundial, fechasNoviembre, fechasRC, fechasSeis, iso } from './calendario';
import { preseasonPending } from './preseason';
import type { Club, GameState, Player, Pos, Tactics } from './types';

type Region = 'hisp' | 'angl' | 'fran' | 'ital' | 'paci' | 'japo' | 'geor' | 'ruma' | 'port' | 'asia' | 'afri';

export interface Pais {
  id: string;
  nombre: string;
  bandera: string;
  /** Nivel del XV (en la misma escala que los jugadores). */
  fuerza: number;
  region: Region;
  hemi: 'N' | 'S';
  /** Juega el Nations Championship (los 6 del Seis Naciones, los 4 del Rugby Championship, Fiji y Japón). */
  nc: boolean;
  /** Grupo en el sorteo real del Mundial 2027. */
  grupo27: string;
  colores: [string, string];
}

export const PAISES: Pais[] = [
  { id: 'NZL', nombre: 'Nueva Zelanda', bandera: '🇳🇿', fuerza: 88, region: 'angl', hemi: 'S', nc: true, grupo27: 'A', colores: ['#111111', '#ffffff'] },
  { id: 'AUS', nombre: 'Australia', bandera: '🇦🇺', fuerza: 82, region: 'angl', hemi: 'S', nc: true, grupo27: 'A', colores: ['#f2c230', '#1d6b3a'] },
  { id: 'CHI', nombre: 'Chile', bandera: '🇨🇱', fuerza: 68, region: 'hisp', hemi: 'S', nc: false, grupo27: 'A', colores: ['#c62828', '#1b2a8c'] },
  { id: 'HKG', nombre: 'Hong Kong China', bandera: '🇭🇰', fuerza: 62, region: 'asia', hemi: 'N', nc: false, grupo27: 'A', colores: ['#c62828', '#ffffff'] },
  { id: 'RSA', nombre: 'Sudáfrica', bandera: '🇿🇦', fuerza: 89, region: 'afri', hemi: 'S', nc: true, grupo27: 'B', colores: ['#1d6b3a', '#f2c230'] },
  { id: 'ITA', nombre: 'Italia', bandera: '🇮🇹', fuerza: 79, region: 'ital', hemi: 'N', nc: true, grupo27: 'B', colores: ['#1f5fb5', '#ffffff'] },
  { id: 'GEO', nombre: 'Georgia', bandera: '🇬🇪', fuerza: 76, region: 'geor', hemi: 'N', nc: false, grupo27: 'B', colores: ['#b0182a', '#ffffff'] },
  { id: 'ROU', nombre: 'Rumania', bandera: '🇷🇴', fuerza: 67, region: 'ruma', hemi: 'N', nc: false, grupo27: 'B', colores: ['#f2c230', '#1b2a8c'] },
  { id: 'ARG', nombre: 'Argentina', bandera: '🇦🇷', fuerza: 84, region: 'hisp', hemi: 'S', nc: true, grupo27: 'C', colores: ['#7ec4ef', '#ffffff'] },
  { id: 'FIJ', nombre: 'Fiji', bandera: '🇫🇯', fuerza: 80, region: 'paci', hemi: 'S', nc: true, grupo27: 'C', colores: ['#ffffff', '#111111'] },
  { id: 'ESP', nombre: 'España', bandera: '🇪🇸', fuerza: 71, region: 'hisp', hemi: 'N', nc: false, grupo27: 'C', colores: ['#c62828', '#f2c230'] },
  { id: 'CAN', nombre: 'Canadá', bandera: '🇨🇦', fuerza: 66, region: 'angl', hemi: 'N', nc: false, grupo27: 'C', colores: ['#c62828', '#111111'] },
  { id: 'IRL', nombre: 'Irlanda', bandera: '🇮🇪', fuerza: 87, region: 'angl', hemi: 'N', nc: true, grupo27: 'D', colores: ['#1d7a3a', '#ffffff'] },
  { id: 'SCO', nombre: 'Escocia', bandera: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', fuerza: 82, region: 'angl', hemi: 'N', nc: true, grupo27: 'D', colores: ['#1b2a5c', '#ffffff'] },
  { id: 'URU', nombre: 'Uruguay', bandera: '🇺🇾', fuerza: 71, region: 'hisp', hemi: 'S', nc: false, grupo27: 'D', colores: ['#7ec4ef', '#111111'] },
  { id: 'POR', nombre: 'Portugal', bandera: '🇵🇹', fuerza: 71, region: 'port', hemi: 'N', nc: false, grupo27: 'D', colores: ['#b0182a', '#1d7a3a'] },
  { id: 'FRA', nombre: 'Francia', bandera: '🇫🇷', fuerza: 87, region: 'fran', hemi: 'N', nc: true, grupo27: 'E', colores: ['#1b2a8c', '#ffffff'] },
  { id: 'JPN', nombre: 'Japón', bandera: '🇯🇵', fuerza: 77, region: 'japo', hemi: 'S', nc: true, grupo27: 'E', colores: ['#c62828', '#ffffff'] },
  { id: 'USA', nombre: 'Estados Unidos', bandera: '🇺🇸', fuerza: 68, region: 'angl', hemi: 'N', nc: false, grupo27: 'E', colores: ['#1b2a5c', '#c62828'] },
  { id: 'SAM', nombre: 'Samoa', bandera: '🇼🇸', fuerza: 72, region: 'paci', hemi: 'S', nc: false, grupo27: 'E', colores: ['#1f4fa3', '#ffffff'] },
  { id: 'ENG', nombre: 'Inglaterra', bandera: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', fuerza: 86, region: 'angl', hemi: 'N', nc: true, grupo27: 'F', colores: ['#ffffff', '#c62828'] },
  { id: 'WAL', nombre: 'Gales', bandera: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', fuerza: 76, region: 'angl', hemi: 'N', nc: true, grupo27: 'F', colores: ['#c62828', '#ffffff'] },
  { id: 'TGA', nombre: 'Tonga', bandera: '🇹🇴', fuerza: 72, region: 'paci', hemi: 'S', nc: false, grupo27: 'F', colores: ['#c62828', '#ffffff'] },
  { id: 'ZIM', nombre: 'Zimbabue', bandera: '🇿🇼', fuerza: 63, region: 'afri', hemi: 'S', nc: false, grupo27: 'F', colores: ['#1d7a3a', '#f2c230'] },
];
export const paisDe = (id: string) => PAISES.find((p) => p.id === id)!;
export const nombrePais = (id: string) => {
  const p = PAISES.find((x) => x.id === id);
  return p ? `${p.bandera} ${p.nombre}` : id;
};

/** Prestigio de DT que hace falta para que te llame cada país. */
export const prestigioPedido = (p: Pais) => Math.round(clamp((p.fuerza - 58) * 2.2, 8, 72));

// ---------- Nombres inventados por región ----------

const NOMBRES: Record<Region, [string[], string[]]> = {
  hisp: [['Tomás', 'Joaquín', 'Facundo', 'Matías', 'Santino', 'Bautista', 'Ignacio', 'Nicolás', 'Felipe', 'Agustín', 'Lautaro', 'Benjamín'], ['Ocampo', 'Barrionuevo', 'Ledesma', 'Quiroga', 'Arregui', 'Villalba', 'Echeverri', 'Irazusta', 'Saravia', 'Montiel', 'Larraín', 'Bustelo', 'Aranguren', 'Peñaloza', 'Urrutia', 'Zabala']],
  angl: [['Liam', 'Callum', 'Jack', 'Ethan', 'Rhys', 'Owen', 'Finn', 'Harry', 'Connor', 'Lachlan', 'Declan', 'Brody'], ['Ashworth', 'Brennan', 'Caldwell', 'Dunmore', 'Fairley', 'Gallagher', 'Hartigan', 'Kilbride', 'Lockwood', 'McAllister', 'Penrose', 'Rutherford', 'Selwyn', 'Thornbury', 'Whitcombe', 'Yardley']],
  fran: [['Théo', 'Baptiste', 'Hugo', 'Maxime', 'Romain', 'Clément', 'Louis', 'Mathis', 'Julien', 'Anthony'], ['Lacoste', 'Darrieux', 'Bergerac', 'Fontanel', 'Garrigue', 'Larrouy', 'Marchetti', 'Peyrade', 'Rouanet', 'Sabatier', 'Tournier', 'Vidalou']],
  ital: [['Lorenzo', 'Matteo', 'Alessandro', 'Tommaso', 'Gianluca', 'Federico', 'Edoardo', 'Michele', 'Riccardo', 'Paolo'], ['Bortolin', 'Cavazzi', 'Dellapiana', 'Ferretto', 'Galvani', 'Lanzoni', 'Mazzocchi', 'Pellizzari', 'Rinaldin', 'Sartorelli', 'Tessarin', 'Zanchetta']],
  paci: [['Sione', 'Tevita', 'Josefa', 'Semi', 'Viliami', 'Taniela', 'Iosefo', 'Manu', 'Penitoa', 'Sefo', 'Kalolo', 'Ratu'], ['Tuilagaloa', 'Vakameilalo', 'Nakarawai', 'Fifitavea', 'Leiataua', 'Mataele', 'Tamanivalu', 'Faleafa', 'Seruvatu', 'Kioa', 'Lotomau', 'Masirewa', 'Ulufonua', 'Vunisa']],
  japo: [['Kenta', 'Ryota', 'Shota', 'Daiki', 'Yuto', 'Haruki', 'Takumi', 'Sota', 'Kaito', 'Ren'], ['Hayashida', 'Kuroiwa', 'Matsunaga', 'Nishimoto', 'Okabe', 'Sakuraba', 'Takeuchi', 'Umezawa', 'Yamashiro', 'Fujikawa', 'Ishiguro', 'Morioka']],
  geor: [['Giorgi', 'Levan', 'Luka', 'Nika', 'Davit', 'Beka', 'Lasha', 'Tornike', 'Shalva', 'Vano'], ['Abashidze', 'Beridze', 'Chkonia', 'Gelashvili', 'Jorbenadze', 'Kapanadze', 'Lomidze', 'Margvelashvili', 'Nikoladze', 'Sharashidze', 'Tsertsvadze', 'Zhvania']],
  ruma: [['Andrei', 'Mihai', 'Ionuț', 'Florin', 'Cristian', 'Vlad', 'Adrian', 'Sorin', 'Bogdan', 'Răzvan'], ['Dumitrescu', 'Ionescu', 'Bălănescu', 'Cojocaru', 'Florescu', 'Moldoveanu', 'Pătrașcu', 'Stoica', 'Vasilache', 'Zamfirescu']],
  port: [['João', 'Duarte', 'Rodrigo', 'Tiago', 'Martim', 'Gonçalo', 'Afonso', 'Rafael', 'Nuno', 'Vasco'], ['Albuquerque', 'Brandão', 'Carvalhal', 'Figueiró', 'Gouveia', 'Loureiro', 'Magalhães', 'Pestana', 'Quaresma', 'Sequeira', 'Valadares', 'Teixeira']],
  asia: [['Jason', 'Kelvin', 'Marcus', 'Ryan', 'Tak', 'Wing', 'Alex', 'Ho', 'Kai', 'Lok'], ['Chan', 'Cheung', 'Ho', 'Lam', 'Leung', 'Ng', 'Tsang', 'Wong', 'Yip', 'Lau', 'Fairweather', 'McKinnon']],
  afri: [['Sipho', 'Thabo', 'Johan', 'Pieter', 'Tendai', 'Kudzai', 'Ruan', 'Lwazi', 'Tinashe', 'Wian', 'Bongani', 'Farai'], ['Botha', 'Coetzer', 'Dlamini', 'Ferreira', 'Grobbelaar', 'Mabaso', 'Ndlovu', 'Pretorius', 'Steyn', 'Mutasa', 'Chikowore', 'Van Wyk', 'Nkosi', 'Moyo']],
};

/** Cuántos de cada puesto van en una lista de 23. */
const CUPO: Record<Pos, number> = { PIL: 4, HOO: 2, SEG: 3, TER: 4, MSC: 2, APE: 2, CEN: 3, WIN: 2, FUL: 1 };
/** Base de jugadores de una selección (36). */
const BASE: Record<Pos, number> = { PIL: 6, HOO: 3, SEG: 5, TER: 6, MSC: 3, APE: 3, CEN: 4, WIN: 4, FUL: 2 };

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h || 1;
}

function jugadorPais(rng: Rng, id: string, pais: Pais, pos: Pos, nivel: number, edad?: number): Player {
  const p = generatePlayer(rng, id, pos, nivel + rng.normal(0, 3), edad);
  const [ns, as] = NOMBRES[pais.region];
  p.nombre = rng.pick(ns);
  p.apellido = rng.pick(as);
  p.contrato = 0;
  p.sueldo = 0;
  return p;
}

// ---------- Estado ----------

export type CompSel = 'TEST' | 'NC' | 'NCF' | 'RWC' | 'SN' | 'RC';
export const COMP_SEL: Record<CompSel, string> = { TEST: 'Test match', NC: 'Nations Championship', NCF: 'Nations Championship · Finales', RWC: 'Mundial', SN: 'Seis Naciones', RC: 'Rugby Championship' };

export interface PartidoSel {
  id: string;
  fecha: string;
  comp: CompSel;
  fase: string;
  jornada: number;
  home: string;
  away: string;
  neutral?: boolean;
  /** Grupo del Mundial. */
  grupo?: string;
  ph?: number;
  pa?: number;
  th?: number;
  ta?: number;
  /** En eliminación: quién pasó. */
  ganador?: string;
  /** Tries de tu selección (solo en tus partidos). */
  tries?: { id: string; nombre: string; n: number }[];
  mvp?: string;
}

export type TipoVentana = 'julio' | 'noviembre' | 'mundial' | 'seis' | 'rc';
export interface Ventana {
  temporada: number;
  tipo: TipoVentana;
  nombre: string;
  partidos: PartidoSel[];
  /** Próxima jornada a jugar (0..). */
  jornada: number;
  jornadas: number;
  terminada: boolean;
  /** Grupos del Mundial. */
  grupos?: Record<string, string[]>;
  /** Para quién se armaron los tests (tu selección, o Argentina si no dirigís ninguna). */
  foco: string;
}

export interface Nacional {
  paisId: string | null;
  confianza: number;
  desde?: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  convocados: string[];
  tactica: Tactics;
  ofertas: { paisId: string; texto: string }[];
  /** Jugadores de la selección que dirigís que no juegan en la liga. */
  pool: Record<string, Player>;
  poolPais?: string;
  ventanas: Ventana[];
  historial: { temporada: number; texto: string }[];
  mundiales: { temporada: number; campeon: string; sub: string; tercero?: string; tuyo?: string }[];
  nc: { temporada: number; campeon: string }[];
  /** Campeones del Seis Naciones y del Rugby Championship. */
  torneos?: { temporada: number; nombre: string; campeon: string }[];
  nextId: number;
}

export function nacional(g: GameState): Nacional {
  g.nacional ??= {
    paisId: null, confianza: 60, pj: 0, pg: 0, pe: 0, pp: 0, convocados: [], tactica: { ataque: 'equilibrado', pie: 'medio', defensa: 'equilibrada' },
    ofertas: [], pool: {}, ventanas: [], historial: [], mundiales: [], nc: [], nextId: 1,
  };
  return g.nacional;
}

const NC_N = ['ENG', 'FRA', 'IRL', 'ITA', 'SCO', 'WAL'];
const NC_S = ['NZL', 'AUS', 'RSA', 'ARG', 'FIJ', 'JPN'];
/** Seis Naciones y Rugby Championship (el viejo Tres Naciones, con Argentina desde 2012). */
export const SEIS = NC_N;
export const RC = ['NZL', 'RSA', 'AUS', 'ARG'];

/** El país cuyos partidos se siguen: el tuyo, o Argentina. */
export const focoDe = (g: GameState) => g.nacional?.paisId ?? 'ARG';

// ---------- Plantel de la selección ----------

/** Todos los que se pueden convocar. Argentina: los de la liga más los que juegan afuera. */
export function poolSeleccion(g: GameState): Player[] {
  const n = nacional(g);
  if (!n.paisId) return [];
  const afuera = Object.values(n.pool);
  if (n.paisId !== 'ARG') return afuera;
  const liga = Object.values(g.players)
    .filter((p) => p.clubId && g.clubs[p.clubId] && g.clubs[p.clubId].division !== 'X' && p.edad >= 19)
    .sort((a, b) => overall(b) - overall(a))
    .slice(0, 70);
  return [...afuera, ...liga];
}
export const jugadorSel = (g: GameState, id: string): Player | undefined => g.players[id] ?? g.nacional?.pool[id];

function armarPool(g: GameState, pais: Pais, rng: Rng) {
  const n = nacional(g);
  n.pool = {};
  // Argentina: 20 que juegan en Europa (más los de la liga); el resto: 36 propios.
  const base: Record<Pos, number> = pais.id === 'ARG' ? { PIL: 3, HOO: 2, SEG: 3, TER: 3, MSC: 2, APE: 2, CEN: 2, WIN: 2, FUL: 1 } : BASE;
  for (const pos of POS_ORDER) {
    for (let i = 0; i < base[pos]; i++) {
      const id = `n${(n.nextId++).toString(36)}`;
      n.pool[id] = jugadorPais(rng, id, pais, pos, pais.fuerza - (i >= CUPO[pos] ? 3 : 0));
    }
  }
  n.poolPais = pais.id;
}

/** Los 23 mejores disponibles, respetando los cupos por puesto. */
export function convocarAuto(g: GameState): string[] {
  const pool = poolSeleccion(g).filter((p) => p.lesion === 0);
  const out: string[] = [];
  for (const pos of POS_ORDER) {
    pool.filter((p) => p.pos === pos).sort((a, b) => overall(b) - overall(a)).slice(0, CUPO[pos]).forEach((p) => out.push(p.id));
  }
  return out;
}

/** Saca lesionados y completa hasta 23 con los mejores que falten en cada puesto. */
export function completarLista(g: GameState) {
  const n = nacional(g);
  const pool = poolSeleccion(g);
  const ok = new Set(pool.map((p) => p.id));
  n.convocados = n.convocados.filter((id) => ok.has(id) && (jugadorSel(g, id)?.lesion ?? 1) === 0);
  for (const pos of POS_ORDER) {
    const faltan = CUPO[pos] - n.convocados.filter((id) => jugadorSel(g, id)?.pos === pos).length;
    if (faltan <= 0) continue;
    pool.filter((p) => p.pos === pos && p.lesion === 0 && !n.convocados.includes(p.id)).sort((a, b) => overall(b) - overall(a)).slice(0, faltan).forEach((p) => n.convocados.push(p.id));
  }
  while (n.convocados.length < 23) {
    const p = pool.filter((x) => x.lesion === 0 && !n.convocados.includes(x.id)).sort((a, b) => overall(b) - overall(a))[0];
    if (!p) break;
    n.convocados.push(p.id);
  }
}

export const MAX_LISTA = 23;
export function toggleConvocado(g: GameState, id: string): string | null {
  const n = nacional(g);
  if (n.convocados.includes(id)) {
    n.convocados = n.convocados.filter((x) => x !== id);
    return null;
  }
  if (n.convocados.length >= MAX_LISTA) return 'Ya tenés 23 en la lista: sacá a alguien primero.';
  if ((jugadorSel(g, id)?.lesion ?? 0) > 0) return 'Está lesionado.';
  n.convocados.push(id);
  return null;
}

function clubFalso(pais: Pais, ids: string[], tactica: Tactics): Club {
  return {
    id: pais.id, nombre: pais.nombre, corto: pais.id, codigo: pais.id, colores: pais.colores, patron: 'lisa', division: 'X', ciudad: '', apodo: '',
    reputacion: pais.fuerza, plantel: ids, xv: [], tactica, presupuesto: 0, entrenamiento: { foco: 'auto', intensidad: 'normal' },
    staff: { ayudante: 2, ojeador: 0, nutricionista: 2, kinesiologo: 2, medico: 2, juveniles: 0 },
  } as unknown as Club;
}

/** Plantel del rival armado en el momento (siempre el mismo en la temporada). */
function rivalSquad(pais: Pais, temporada: number): Record<string, Player> {
  const rng = new Rng(hash(pais.id + temporada));
  const out: Record<string, Player> = {};
  let i = 0;
  for (const pos of POS_ORDER) for (let k = 0; k < CUPO[pos]; k++) {
    const id = `r${pais.id}${i++}`;
    out[id] = jugadorPais(rng, id, pais, pos, pais.fuerza + (k >= CUPO[pos] / 2 ? -2 : 1));
  }
  return out;
}

// ---------- Ofertas ----------

/** Al terminar la temporada del club, según tu prestigio, te puede llamar alguna selección. */
export function ofertasSeleccion(g: GameState, rng: Rng) {
  const n = nacional(g);
  const pr = g.career?.prestigio ?? 0;
  const actual = n.paisId ? paisDe(n.paisId).fuerza : 0;
  const posibles = PAISES.filter((p) => p.id !== n.paisId && prestigioPedido(p) <= pr && p.fuerza > actual + 2).sort((a, b) => b.fuerza - a.fuerza);
  const elegidas: Pais[] = [];
  for (const p of posibles) {
    if (elegidas.length >= 3) break;
    if (rng.chance(elegidas.length ? 0.35 : 0.75)) elegidas.push(p);
  }
  n.ofertas = elegidas.map((p) => ({
    paisId: p.id,
    texto: `La federación de ${p.nombre} te quiere como entrenador${n.paisId ? ' (tendrías que dejar ' + paisDe(n.paisId).nombre + ')' : ''}. Lo podés hacer a la par del club.`,
  }));
  if (n.ofertas.length) addNews(g, '🌎 Te llaman de una selección', `${n.ofertas.map((o) => paisDe(o.paisId).nombre).join(', ')} ${n.ofertas.length === 1 ? 'te ofrece' : 'te ofrecen'} dirigir a su seleccionado. Mirá en Selección.`);
}

/** No se puede cambiar de selección en medio de una ventana. */
export const ventanaEnCurso = (g: GameState) => {
  const id = g.nacional?.paisId;
  return (g.nacional?.ventanas ?? []).some(
    (v) => v.temporada === g.temporada && v.jornada > 0 && !v.terminada && (!id || v.partidos.some((p) => p.ph == null && (p.home === id || p.away === id))),
  );
};

export function aceptarSeleccion(g: GameState, paisId: string): string | null {
  const n = nacional(g);
  if (ventanaEnCurso(g)) return 'Esperá a que termine la ventana que se está jugando.';
  const pais = paisDe(paisId);
  const antes = n.paisId;
  n.paisId = paisId;
  n.confianza = 60;
  n.desde = g.temporada;
  n.ofertas = [];
  const rng = new Rng(hash(`${paisId}${g.temporada}${g.nextId}`));
  if (n.poolPais !== paisId) armarPool(g, pais, rng);
  n.convocados = convocarAuto(g);
  n.historial.unshift({ temporada: g.temporada, texto: `Asumiste en ${pais.nombre}${antes ? ` (dejaste ${paisDe(antes).nombre})` : ''}.` });
  // Si la ventana que viene todavía no arrancó, se arma de nuevo con tu selección.
  for (const v of n.ventanas.filter((x) => x.temporada === g.temporada && x.jornada === 0 && !x.terminada && (x.tipo === 'julio' || x.tipo === 'noviembre') && x.foco !== paisId)) {
    n.ventanas = n.ventanas.filter((x) => x !== v);
    abrirVentana(g, v.tipo, rng);
  }
  addNews(g, `🌎 Nuevo DT de ${pais.nombre}`, `${g.manager} es el nuevo entrenador de ${pais.nombre}. Vas a dirigir en las ventanas de julio y noviembre, en el Mundial${pais.nc && SEIS.includes(pais.id) ? ' y en el Seis Naciones' : RC.includes(pais.id) ? ' y en el Rugby Championship' : ''}.`);
  return null;
}

export function rechazarOfertasSel(g: GameState) {
  nacional(g).ofertas = [];
}

export function renunciarSeleccion(g: GameState): string | null {
  const n = nacional(g);
  if (!n.paisId) return null;
  if (ventanaEnCurso(g)) return 'No podés irte en medio de una ventana.';
  n.historial.unshift({ temporada: g.temporada, texto: `Renunciaste a ${paisDe(n.paisId).nombre}.` });
  addNews(g, '🌎 Renuncia', `${g.manager} dejó de ser el entrenador de ${paisDe(n.paisId).nombre}.`);
  n.paisId = null;
  n.convocados = [];
  return null;
}

// ---------- Ventanas ----------

const juega = (p: PartidoSel, id: string | null | undefined) => !!id && (p.home === id || p.away === id);
/** Fecha de la próxima jornada sin jugar de un torneo. */
const fechaProx = (v: Ventana) => v.partidos.find((p) => p.jornada === v.jornada && p.ph == null)?.fecha ?? '9999';

function abiertas(g: GameState): Ventana[] {
  return (g.nacional?.ventanas ?? []).filter((v) => v.temporada === g.temporada && !v.terminada).sort((a, b) => fechaProx(a).localeCompare(fechaProx(b)));
}

/** El torneo que sigue: el de tu selección si tenés partidos pendientes, si no el que viene primero. */
export function ventanaActual(g: GameState): Ventana | undefined {
  const vs = abiertas(g);
  const id = g.nacional?.paisId;
  return (id && vs.find((v) => v.partidos.some((p) => p.ph == null && juega(p, id)))) || vs[0];
}

/** Próximo partido de tu selección (por fecha). */
function proximoMio(g: GameState): PartidoSel | undefined {
  const id = g.nacional?.paisId;
  if (!id) return undefined;
  return abiertas(g).flatMap((v) => v.partidos.filter((p) => p.ph == null && juega(p, id))).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
}

/** Día del próximo partido del club (amistoso o fecha oficial). */
export function fechaClub(g: GameState): string {
  if (preseasonPending(g)) {
    const pre = g.pretemporada!;
    const i = pre.elegida == null ? 0 : Math.max(0, pre.partidos.findIndex((f) => !f.result));
    return iso(fechaAmistoso(g.temporada, i));
  }
  return iso(fechaRonda(g.temporada, g.round));
}

/** Tu selección juega antes que el próximo partido del club (o ya terminó la temporada del club). */
export function ventanaPendiente(g: GameState): boolean {
  const p = proximoMio(g);
  return !!p && (g.phase === 'fin' || p.fecha <= fechaClub(g));
}

/** Juega todas las jornadas hasta ese día. Si conMios es false, frena antes de un partido de tu selección. */
export function avanzarHasta(g: GameState, hasta: string, rng: Rng, conMios: boolean) {
  for (let guard = 0; guard < 200; guard++) {
    const v = abiertas(g)[0];
    if (!v || fechaProx(v) > hasta) return;
    if (!conMios && v.partidos.some((p) => p.jornada === v.jornada && p.ph == null && juega(p, g.nacional?.paisId))) return;
    jugarJornadaDe(g, v, rng);
  }
}

function nuevoId(n: Nacional) {
  return `s${(n.nextId++).toString(36)}`;
}

/** Rivales de nivel parecido para los tests. */
function rivalesTest(foco: Pais, rng: Rng, cuantos: number, evitar: string[] = []): Pais[] {
  const cand = PAISES.filter((p) => p.id !== foco.id && !evitar.includes(p.id)).sort((a, b) => Math.abs(a.fuerza - foco.fuerza) - Math.abs(b.fuerza - foco.fuerza));
  return rng.shuffle(cand.slice(0, 8)).slice(0, cuantos);
}

export function abrirVentana(g: GameState, tipo: TipoVentana, rng: Rng): Ventana {
  const n = nacional(g);
  const y = g.temporada;
  const foco = paisDe(focoDe(g));
  const mundial = esAnioMundial(y);
  const partidos: PartidoSel[] = [];
  const add = (fecha: Date, comp: CompSel, fase: string, jornada: number, home: string, away: string, extra: Partial<PartidoSel> = {}) =>
    partidos.push({ id: nuevoId(n), fecha: iso(fecha), comp, fase, jornada, home, away, ...extra });
  let nombre = '';
  let jornadas = 3;
  let grupos: Record<string, string[]> | undefined;
  if (tipo === 'seis' || tipo === 'rc') {
    const ids = tipo === 'seis' ? SEIS : RC;
    const comp: CompSel = tipo === 'seis' ? 'SN' : 'RC';
    nombre = tipo === 'seis' ? `Seis Naciones ${y}` : `Rugby Championship ${y}`;
    const f = tipo === 'seis' ? fechasSeis(y) : fechasRC(y);
    const rondas = todosContraTodos(ids, rng);
    jornadas = f.length;
    for (let j = 0; j < f.length; j++) {
      const vuelta = j >= rondas.length;
      for (const [a, b] of rondas[j % rondas.length]) add(f[j], comp, `Fecha ${j + 1}`, j, vuelta ? b : a, vuelta ? a : b);
    }
  } else if (tipo === 'mundial') {
    nombre = `Mundial ${y}`;
    jornadas = 7;
    grupos = gruposMundial(y, rng);
    const f = fechasMundial(y);
    // Cada fecha de grupos: 1 vs 4 y 2 vs 3, después 1-3 / 4-2 y 1-2 / 3-4.
    const cruces = [[[0, 3], [1, 2]], [[0, 2], [3, 1]], [[0, 1], [2, 3]]];
    for (let j = 0; j < 3; j++) {
      for (const [gr, ids] of Object.entries(grupos)) {
        for (const [a, b] of cruces[j]) add(f[j], 'RWC', `Grupo ${gr} · fecha ${j + 1}`, j, ids[a], ids[b], { neutral: ids[a] !== 'AUS' || y !== 2027, grupo: gr });
      }
    }
  } else if (!mundial && foco.nc) {
    nombre = tipo === 'julio' ? `Nations Championship ${y} · julio` : `Nations Championship ${y} · noviembre`;
    const f = tipo === 'julio' ? fechasJulio(y) : fechasNoviembre(y);
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 6; i++) {
        // En julio juegan de local los del sur, en noviembre los del norte.
        if (tipo === 'julio') add(f[j], 'NC', `Fecha ${j + 1}`, j, NC_S[(i + j) % 6], NC_N[i]);
        else add(f[j], 'NC', `Fecha ${j + 4}`, j, NC_N[i], NC_S[(i + j + 3) % 6]);
      }
    }
    if (tipo === 'noviembre') jornadas = 4;
  } else {
    nombre = tipo === 'julio' ? (mundial ? `Tests de preparación ${y}` : `Tests de julio ${y}`) : `Tests de noviembre ${y}`;
    const f = tipo === 'julio' ? fechasJulio(y) : fechasNoviembre(y);
    const rivales = rivalesTest(foco, rng, 3);
    rivales.forEach((r, j) => {
      const local = tipo === 'julio' ? (foco.hemi === 'S' ? j !== 1 : j === 1) : foco.hemi === 'N' ? j !== 1 : j === 1;
      add(f[j], 'TEST', `Test ${j + 1}`, j, local ? foco.id : r.id, local ? r.id : foco.id);
    });
  }
  const v: Ventana = { temporada: y, tipo, nombre, partidos, jornada: 0, jornadas, terminada: false, grupos, foco: foco.id };
  n.ventanas.push(v);
  return v;
}

/** Todos contra todos a una rueda (método del círculo). */
function todosContraTodos(ids: string[], rng: Rng): [string, string][][] {
  const t = rng.shuffle([...ids]);
  const out: [string, string][][] = [];
  for (let r = 0; r < t.length - 1; r++) {
    const ronda: [string, string][] = [];
    for (let i = 0; i < t.length / 2; i++) {
      const a = t[i];
      const b = t[t.length - 1 - i];
      ronda.push(r % 2 ? [b, a] : [a, b]);
    }
    out.push(ronda);
    t.splice(1, 0, t.pop()!);
  }
  return out;
}

/** Tabla de un torneo de todos contra todos (Seis Naciones o Rugby Championship). */
export function tablaTorneo(v: Ventana) {
  return tabla(v.tipo === 'seis' ? SEIS : RC, v.partidos);
}

function gruposMundial(y: number, rng: Rng): Record<string, string[]> {
  const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
  const out: Record<string, string[]> = {};
  if (y === 2027) {
    // El sorteo real (diciembre de 2025).
    for (const l of letras) out[l] = PAISES.filter((p) => p.grupo27 === l).map((p) => p.id);
    return out;
  }
  // Después: 4 bombos por ranking.
  const orden = [...PAISES].sort((a, b) => b.fuerza - a.fuerza);
  for (const l of letras) out[l] = [];
  for (let b = 0; b < 4; b++) {
    const bombo = rng.shuffle(orden.slice(b * 6, b * 6 + 6));
    bombo.forEach((p, i) => out[letras[i]].push(p.id));
  }
  return out;
}

// ---------- Tablas ----------

export interface FilaSel {
  id: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  pf: number;
  pc: number;
  pts: number;
}

function tabla(ids: string[], partidos: PartidoSel[]): FilaSel[] {
  const rows = new Map(ids.map((id) => [id, { id, pj: 0, pg: 0, pe: 0, pp: 0, pf: 0, pc: 0, pts: 0 }]));
  for (const p of partidos) {
    if (p.ph == null) continue;
    for (const [me, pf, pc, tf] of [[p.home, p.ph, p.pa!, p.th!], [p.away, p.pa!, p.ph, p.ta!]] as [string, number, number, number][]) {
      const r = rows.get(me);
      if (!r) continue;
      r.pj++;
      r.pf += pf;
      r.pc += pc;
      if (pf > pc) { r.pg++; r.pts += 4; } else if (pf === pc) { r.pe++; r.pts += 2; } else { r.pp++; if (pc - pf <= 7) r.pts += 1; }
      if (tf >= 4) r.pts += 1;
    }
  }
  return [...rows.values()].sort((a, b) => b.pts - a.pts || b.pf - b.pc - (a.pf - a.pc) || b.pf - a.pf || paisDe(b.id).fuerza - paisDe(a.id).fuerza);
}

export function tablaGrupo(v: Ventana, grupo: string) {
  return tabla(v.grupos![grupo], v.partidos.filter((p) => p.grupo === grupo));
}

/** Tabla del Nations Championship (julio + noviembre) de una conferencia. */
export function tablaNC(g: GameState, temporada: number, conf: 'N' | 'S') {
  const ps = (g.nacional?.ventanas ?? []).filter((v) => v.temporada === temporada).flatMap((v) => v.partidos.filter((p) => p.comp === 'NC'));
  return tabla(conf === 'N' ? NC_N : NC_S, ps);
}

// ---------- Jugar ----------

function rapido(rng: Rng, home: Pais, away: Pais, neutral: boolean) {
  const d = home.fuerza - away.fuerza + (neutral ? 0 : 2.5);
  const tries = (x: number) => Math.max(0, Math.round(rng.normal(2.7 + x / 6.5, 1.4)));
  const th = tries(d);
  const ta = tries(-d);
  const pts = (t: number) => {
    let s = t * 5;
    for (let i = 0; i < t; i++) if (rng.chance(0.72)) s += 2;
    return s + 3 * Math.max(0, Math.round(rng.normal(2, 1.1)));
  };
  return { ph: pts(th), pa: pts(ta), th, ta };
}

function decidir(p: PartidoSel) {
  if (p.ph! !== p.pa!) return p.ph! > p.pa! ? p.home : p.away;
  if (p.th! !== p.ta!) return p.th! > p.ta! ? p.home : p.away;
  return paisDe(p.home).fuerza >= paisDe(p.away).fuerza ? p.home : p.away;
}
const eliminacion = (p: PartidoSel) => p.comp === 'NCF' || (p.comp === 'RWC' && !p.grupo);

function jugarMio(g: GameState, p: PartidoSel, rng: Rng, julio: boolean) {
  const n = nacional(g);
  const mio = n.paisId!;
  completarLista(g);
  const rivalId = p.home === mio ? p.away : p.home;
  const rival = paisDe(rivalId);
  const squad = rivalSquad(rival, g.temporada);
  const players: Record<string, Player> = { ...squad };
  // Con la selección llegan descansados (copias: no se toca la energía del club).
  for (const id of n.convocados) {
    const pl = jugadorSel(g, id);
    if (pl) players[id] = { ...pl, energia: 100 };
  }
  const yo = clubFalso(paisDe(mio), n.convocados, n.tactica);
  const otro = clubFalso(rival, Object.keys(squad), { ataque: 'equilibrado', pie: 'medio', defensa: 'equilibrada' });
  const home = p.home === mio ? yo : otro;
  const away = p.home === mio ? otro : yo;
  const res = simulateMatch({ home, away, homeXV: bestXV(home, players), awayXV: bestXV(away, players), players, neutral: !!p.neutral, detailed: false }, rng);
  p.ph = res.ptsH;
  p.pa = res.ptsA;
  p.th = res.triesH;
  p.ta = res.triesA;
  p.tries = res.scorers.filter((s) => s.tries > 0 && n.convocados.includes(s.playerId)).map((s) => {
    const pl = jugadorSel(g, s.playerId)!;
    return { id: pl.id, nombre: `${pl.nombre} ${pl.apellido}`, n: s.tries };
  });
  if (res.mvp && n.convocados.includes(res.mvp)) p.mvp = res.mvp;
  // Los que jugaron suman un partido internacional; los lesionados vuelven al club lesionados.
  for (const id of res.jugaron) {
    const pl = jugadorSel(g, id);
    if (!pl || !n.convocados.includes(id)) continue;
    pl.caps = (pl.caps ?? 0) + 1;
    if (g.players[id] && julio) pl.energia = Math.max(35, pl.energia - 8);
  }
  for (const l of res.lesionados) {
    const pl = jugadorSel(g, l.playerId);
    if (pl && n.convocados.includes(l.playerId)) pl.lesion = Math.max(pl.lesion, l.semanas + 1);
  }
  // Confianza de la federación según lo que se esperaba.
  const yoF = paisDe(mio).fuerza;
  const gano = p.ph === p.pa ? null : (p.ph > p.pa) === (p.home === mio);
  const dif = rival.fuerza - yoF;
  n.pj++;
  if (gano === true) {
    n.pg++;
    n.confianza = Math.round(clamp(n.confianza + clamp(5 + dif / 3, 2, 12), 0, 100));
    if (dif > 3 && g.career) g.career.prestigio = clamp(g.career.prestigio + 2, 0, 100);
  } else if (gano === false) {
    n.pp++;
    n.confianza = Math.round(clamp(n.confianza - clamp(4 - dif / 3, 1, 10), 0, 100));
  } else n.pe++;
}

/** Juega una jornada de un torneo: tu partido con tus convocados y el resto rápido. */
function jugarJornadaDe(g: GameState, v: Ventana, rng: Rng): PartidoSel[] {
  const n = nacional(g);
  const ronda = v.partidos.filter((p) => p.jornada === v.jornada && p.ph == null);
  for (const p of ronda) {
    if (juega(p, n.paisId)) jugarMio(g, p, rng, v.tipo === 'julio');
    else Object.assign(p, rapido(rng, paisDe(p.home), paisDe(p.away), !!p.neutral));
    if (eliminacion(p)) p.ganador = decidir(p);
  }
  v.jornada++;
  siguienteFase(g, v, rng);
  if (v.jornada >= v.jornadas) cerrarVentana(g, v);
  return ronda;
}

/** Juega lo que haya antes y después la jornada del próximo partido de tu selección. */
export function jugarJornada(g: GameState, rng: Rng): PartidoSel[] {
  const id = g.nacional?.paisId;
  for (let guard = 0; guard < 200; guard++) {
    const v = abiertas(g)[0];
    if (!v) return [];
    const mia = v.partidos.some((p) => p.jornada === v.jornada && p.ph == null && juega(p, id));
    const ronda = jugarJornadaDe(g, v, rng);
    if (mia || !id) return ronda;
  }
  return [];
}

/** Termina el torneo que sigue (y lo que se juegue antes). */
export function simularVentana(g: GameState, rng: Rng) {
  const v = ventanaActual(g);
  for (let guard = 0; v && !v.terminada && guard < 200; guard++) {
    const w = abiertas(g)[0];
    if (!w) break;
    jugarJornadaDe(g, w, rng);
  }
}

/** Arma los cruces de eliminación cuando termina la fase anterior. */
function siguienteFase(g: GameState, v: Ventana, rng: Rng) {
  const n = nacional(g);
  if (v.tipo === 'noviembre' && v.partidos.some((p) => p.comp === 'NC') && v.jornada === 3) {
    // Finales: cada uno del norte contra el que terminó en el mismo puesto en el sur.
    const tn = tablaNC(g, v.temporada, 'N');
    const ts = tablaNC(g, v.temporada, 'S');
    const f = fechasNoviembre(v.temporada)[3];
    for (let k = 5; k >= 0; k--) {
      v.partidos.push({ id: nuevoId(n), fecha: iso(f), comp: 'NCF', fase: k === 0 ? 'Final' : `Por el ${k * 2 + 1}.º puesto`, jornada: 3, home: tn[k].id, away: ts[k].id, neutral: true });
    }
  }
  if (v.tipo !== 'mundial') return;
  const f = fechasMundial(v.temporada);
  const add = (j: number, fase: string, a: string, b: string) => v.partidos.push({ id: nuevoId(n), fecha: iso(f[j]), comp: 'RWC', fase, jornada: j, home: a, away: b, neutral: true });
  if (v.jornada === 3) {
    // Pasan los 2 primeros de cada grupo y los 4 mejores terceros.
    const tablas = Object.keys(v.grupos!).map((gr) => tablaGrupo(v, gr));
    const primeros = tablas.map((t) => t[0]);
    const segundos = tablas.map((t) => t[1]);
    const terceros = tablas.map((t) => t[2]).sort((a, b) => b.pts - a.pts || b.pf - b.pc - (a.pf - a.pc)).slice(0, 4);
    const orden = (xs: FilaSel[]) => [...xs].sort((a, b) => b.pts - a.pts || b.pf - b.pc - (a.pf - a.pc));
    const sembrados = [...orden(primeros), ...orden(segundos), ...orden(terceros)].map((r) => r.id);
    const cruces: [number, number][] = [[0, 15], [7, 8], [3, 12], [4, 11], [1, 14], [6, 9], [2, 13], [5, 10]];
    for (const [a, b] of cruces) add(3, 'Octavos de final', sembrados[a], sembrados[b]);
    void rng;
  } else if (v.jornada >= 4 && v.jornada <= 5) {
    const prev = v.partidos.filter((p) => p.jornada === v.jornada - 1);
    const fase = v.jornada === 4 ? 'Cuartos de final' : 'Semifinal';
    for (let i = 0; i < prev.length; i += 2) add(v.jornada, fase, prev[i].ganador!, prev[i + 1].ganador!);
  } else if (v.jornada === 6) {
    const semis = v.partidos.filter((p) => p.jornada === 5);
    const perd = semis.map((p) => (p.ganador === p.home ? p.away : p.home));
    add(6, 'Por el 3.er puesto', perd[0], perd[1]);
    add(6, 'Final', semis[0].ganador!, semis[1].ganador!);
  }
}

/** Hasta dónde llegó un país en el Mundial. */
export function faseAlcanzada(v: Ventana, id: string): string {
  const ps = v.partidos.filter((p) => p.home === id || p.away === id);
  const final = ps.find((p) => p.fase === 'Final' && p.comp === 'RWC');
  if (final?.ganador) return final.ganador === id ? 'Campeón' : 'Subcampeón';
  const tercero = ps.find((p) => p.fase === 'Por el 3.er puesto');
  if (tercero?.ganador) return tercero.ganador === id ? 'Tercero' : 'Cuarto';
  if (ps.some((p) => p.fase === 'Semifinal')) return 'Semifinal';
  if (ps.some((p) => p.fase === 'Cuartos de final')) return 'Cuartos de final';
  if (ps.some((p) => p.fase === 'Octavos de final')) return 'Octavos de final';
  return 'Fase de grupos';
}
const NIVEL_FASE = ['Fase de grupos', 'Octavos de final', 'Cuartos de final', 'Semifinal', 'Cuarto', 'Tercero', 'Subcampeón', 'Campeón'];

/** Lo que te pide la federación en el Mundial, según el ranking de tu selección. */
export function objetivoMundial(paisId: string): { fase: string; texto: string } {
  const rank = [...PAISES].sort((a, b) => b.fuerza - a.fuerza).findIndex((p) => p.id === paisId) + 1;
  if (rank <= 4) return { fase: 'Semifinal', texto: 'Llegar a semifinales' };
  if (rank <= 9) return { fase: 'Cuartos de final', texto: 'Llegar a cuartos de final' };
  if (rank <= 16) return { fase: 'Octavos de final', texto: 'Pasar la fase de grupos' };
  return { fase: 'Fase de grupos', texto: 'Ganar al menos un partido y dejar una buena imagen' };
}

function cerrarVentana(g: GameState, v: Ventana) {
  v.terminada = true;
  const n = nacional(g);
  const mio = n.paisId;
  const foco = v.foco;
  const res = (p: PartidoSel, id: string) => {
    const mia = p.home === id;
    const a = mia ? p.ph! : p.pa!;
    const b = mia ? p.pa! : p.ph!;
    return `${a > b ? 'le ganó' : a < b ? 'perdió' : 'empató'} ${a}-${b} con ${paisDe(mia ? p.away : p.home).nombre}`;
  };
  if (v.tipo === 'mundial') {
    const final = v.partidos.find((p) => p.fase === 'Final' && p.comp === 'RWC')!;
    const tercero = v.partidos.find((p) => p.fase === 'Por el 3.er puesto');
    const campeon = final.ganador!;
    const sub = campeon === final.home ? final.away : final.home;
    const fase = mio ? faseAlcanzada(v, mio) : undefined;
    n.mundiales.unshift({ temporada: v.temporada, campeon, sub, tercero: tercero?.ganador, tuyo: mio && fase ? `${paisDe(mio).nombre}: ${fase.toLowerCase()}` : undefined });
    addNews(g, `🏆 ¡${paisDe(campeon).nombre} campeón del mundo!`, `${paisDe(campeon).nombre} le ganó la final del ${v.nombre} a ${paisDe(sub).nombre} ${Math.max(final.ph!, final.pa!)}-${Math.min(final.ph!, final.pa!)}. ${mio ? '' : `Argentina: ${faseAlcanzada(v, 'ARG').toLowerCase()}.`}`);
    if (mio) {
      const obj = objetivoMundial(mio);
      const ok = NIVEL_FASE.indexOf(fase!) >= NIVEL_FASE.indexOf(obj.fase);
      const premio = { Campeón: 25, Subcampeón: 15, Tercero: 11, Cuarto: 9, Semifinal: 9, 'Cuartos de final': 5, 'Octavos de final': 2, 'Fase de grupos': 0 }[fase!] ?? 0;
      if (g.career) g.career.prestigio = clamp(g.career.prestigio + premio + (ok ? 3 : -4), 0, 100);
      n.confianza = clamp(n.confianza + (ok ? 15 : -22), 0, 100);
      n.historial.unshift({ temporada: v.temporada, texto: `${v.nombre} con ${paisDe(mio).nombre}: ${fase!.toLowerCase()}${fase === 'Campeón' ? ' 🏆' : ''}.` });
      addNews(g, ok ? '🌎 Cumpliste en el Mundial' : '🌎 El Mundial no salió', `${paisDe(mio).nombre} llegó hasta: ${fase!.toLowerCase()}. La federación pedía: ${obj.texto.toLowerCase()}.`);
      if (fase === 'Campeón') {
        const club = g.clubs[g.userClubId];
        club.presupuesto += 20_000_000;
        logMoney(g, `Premio por salir campeón del mundo con ${paisDe(mio).nombre}`, 20_000_000);
      }
    }
  } else if (v.tipo === 'seis' || v.tipo === 'rc') {
    const t = tablaTorneo(v);
    const campeon = t[0].id;
    (n.torneos ??= []).unshift({ temporada: v.temporada, nombre: v.nombre, campeon });
    const mioAca = mio && t.some((r) => r.id === mio);
    if (mioAca) {
      const pos = t.findIndex((r) => r.id === mio) + 1;
      const esperado = [...t].sort((a, b) => paisDe(b.id).fuerza - paisDe(a.id).fuerza).findIndex((r) => r.id === mio) + 1;
      n.confianza = clamp(n.confianza + (esperado - pos) * 5 + (pos === 1 ? 6 : 0), 0, 100);
      if (pos === 1) {
        if (g.career) g.career.prestigio = clamp(g.career.prestigio + 7, 0, 100);
        n.historial.unshift({ temporada: v.temporada, texto: `Campeón del ${v.nombre} con ${paisDe(mio!).nombre} 🏆` });
      } else n.historial.unshift({ temporada: v.temporada, texto: `${v.nombre}: ${paisDe(mio!).nombre} terminó ${pos}.º.` });
    }
    const arg = t.findIndex((r) => r.id === 'ARG') + 1;
    addNews(g, `🏆 ${paisDe(campeon).nombre} gana el ${v.nombre}`, `${t.map((r, i) => `${i + 1}.º ${paisDe(r.id).nombre} (${r.pts})`).join(', ')}.${mioAca ? '' : arg ? ` Argentina terminó ${arg}.ª.` : ''}`);
  } else {
    const mios = v.partidos.filter((p) => p.ph != null && (p.home === foco || p.away === foco));
    const texto = mios.map((p) => res(p, foco)).join(', ');
    const fin = v.partidos.find((p) => p.comp === 'NCF' && p.fase === 'Final');
    if (fin?.ganador) {
      n.nc.unshift({ temporada: v.temporada, campeon: fin.ganador });
      if (fin.ganador === mio) {
        n.confianza = clamp(n.confianza + 10, 0, 100);
        if (g.career) g.career.prestigio = clamp(g.career.prestigio + 8, 0, 100);
        n.historial.unshift({ temporada: v.temporada, texto: `Campeón del Nations Championship con ${paisDe(mio).nombre} 🏆` });
      }
    }
    addNews(g, `🌎 ${v.nombre}`, `${paisDe(foco).nombre} ${texto || 'no jugó'}.${fin?.ganador ? ` Campeón del Nations Championship: ${paisDe(fin.ganador).nombre}.` : ''}`);
  }
  // Si la federación perdió la paciencia, te echan.
  if (mio && n.confianza < 22) {
    n.historial.unshift({ temporada: v.temporada, texto: `Te echaron de ${paisDe(mio).nombre}.` });
    addNews(g, '🌎 Te echaron de la selección', `La federación de ${paisDe(mio).nombre} decidió cambiar de entrenador. Seguís con tu club.`);
    if (g.career) g.career.prestigio = clamp(g.career.prestigio - 5, 0, 100);
    n.paisId = null;
    n.convocados = [];
  }
}

// ---------- Ventana de julio en la liga ----------

export const PREMIO_CONVOCADO = 1_000_000;

/** Ventana de julio: si dirigís una selección queda pendiente; si no, se juega sola. */
export function ventanaJulio(g: GameState, rng: Rng, convocatoriaLiga: () => string[]) {
  const n = nacional(g);
  if (n.ventanas.some((v) => v.temporada === g.temporada && v.tipo === 'julio')) return;
  if (n.paisId) completarLista(g);
  abrirVentana(g, 'julio', rng);
  // Argentina convoca a los mejores de la liga (o los elegís vos si sos el DT).
  const ids = n.paisId === 'ARG' ? n.convocados.filter((id) => g.players[id]) : convocatoriaLiga();
  const user = g.clubs[g.userClubId];
  if (n.paisId !== 'ARG') {
    for (const id of ids) {
      const p = g.players[id];
      p.caps = (p.caps ?? 0) + 3;
      p.energia = Math.max(30, p.energia - 15);
      p.moral = Math.min(100, p.moral + 8);
    }
  }
  const mios = ids.filter((id) => g.players[id]?.clubId === user.id);
  if (mios.length) {
    user.presupuesto += PREMIO_CONVOCADO * mios.length;
    logMoney(g, 'Compensación por convocados a Argentina', PREMIO_CONVOCADO * mios.length);
  }
  const v = n.ventanas[n.ventanas.length - 1];
  if (!n.paisId) {
    avanzarHasta(g, iso(fechasJulio(g.temporada)[2]), rng, true);
    const resumen = v.partidos.filter((p) => p.home === 'ARG' || p.away === 'ARG').map((p) => `${p.home === 'ARG' ? p.ph : p.pa}-${p.home === 'ARG' ? p.pa : p.ph} vs ${paisDe(p.home === 'ARG' ? p.away : p.home).nombre}`).join(', ');
    g.seleccion = { temporada: g.temporada, ids, rival: v.nombre, resultado: resumen };
  } else {
    g.seleccion = { temporada: g.temporada, ids, rival: 'la ventana de julio', resultado: n.paisId === 'ARG' ? 'los convocaste vos' : 'convocados por la Unión' };
    addNews(g, `🌎 Ventana de julio`, `Se para la liga: ${paisDe(n.paisId).nombre} juega ${v.nombre}. Armá la lista de 23 y jugá los partidos en Selección.`);
  }
  if (mios.length && n.paisId !== 'ARG') addNews(g, '🇦🇷 Convocados de tu club', `Argentina se llevó a ${mios.map((id) => g.players[id].apellido).join(', ')} para la ventana de julio. Vuelven cansados pero contentos; la Unión te paga una compensación.`);
}

/** Cuando termina la temporada del club: llamados de selecciones y la ventana de noviembre o el Mundial. */
export function finDeTemporadaSel(g: GameState, rng: Rng) {
  ofertasSeleccion(g, rng);
  const n = nacional(g);
  const hay = (t: TipoVentana) => n.ventanas.some((v) => v.temporada === g.temporada && v.tipo === t);
  if (!hay('rc')) abrirVentana(g, 'rc', rng);
  const t = esAnioMundial(g.temporada) ? 'mundial' : 'noviembre';
  if (!hay(t)) abrirVentana(g, t, rng);
}

/** Al empezar cada temporada: el Seis Naciones de febrero y marzo. */
export function inicioTemporadaSel(g: GameState, rng: Rng) {
  const n = nacional(g);
  if (!n.ventanas.some((v) => v.temporada === g.temporada && v.tipo === 'seis')) abrirVentana(g, 'seis', rng);
}

/** Al arrancar la temporada nueva: se termina lo que quedó sin jugar y la base envejece. */
export function nuevaTemporadaSel(g: GameState, rng: Rng) {
  const n = g.nacional;
  if (!n) return;
  avanzarHasta(g, '9999', rng, true);
  n.ventanas = n.ventanas.filter((v) => v.temporada >= g.temporada);
  n.ofertas = [];
  if (n.poolPais) {
    const pais = paisDe(n.poolPais);
    for (const p of Object.values(n.pool)) {
      p.edad++;
      const cambio = p.edad <= 25 ? 2 : p.edad >= 31 ? -2 : 0;
      if (cambio) for (const k of rng.shuffle([...ATTR_KEYS]).slice(0, 4)) p.attrs[k] = clamp(p.attrs[k] + cambio + rng.int(-1, 1), 20, 99);
      if (p.edad >= 35 || (p.edad >= 33 && rng.chance(0.35))) {
        delete n.pool[p.id];
        n.convocados = n.convocados.filter((x) => x !== p.id);
        const id = `n${(n.nextId++).toString(36)}`;
        n.pool[id] = jugadorPais(rng, id, pais, p.pos, pais.fuerza - 2, rng.int(20, 23));
      }
    }
  }
  if (n.paisId) completarLista(g);
}

// ---------- Para la pantalla ----------

export function jugarSiguiente(g: GameState): PartidoSel[] {
  const rng = new Rng(g.rng || 1);
  const r = jugarJornada(g, rng);
  g.rng = rng.s;
  return r;
}
export function simularResto(g: GameState) {
  const rng = new Rng(g.rng || 1);
  simularVentana(g, rng);
  g.rng = rng.s;
}
/** Próximo partido de tu selección (o de Argentina) en la ventana abierta. */
export function proximoSel(g: GameState): PartidoSel | undefined {
  const v = ventanaActual(g);
  const id = focoDe(g);
  return v?.partidos.find((p) => p.ph == null && (p.home === id || p.away === id));
}
