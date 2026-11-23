// Elecciones en el club: cada 3 temporadas votan los socios. Si gana la oposición, cambia la comisión directiva y lo que te pide.
import { Rng, clamp } from './rng';
import { APELLIDOS, NOMBRES } from './names';
import type { GameState, Player } from './types';

export type Estilo = 'exitista' | 'ahorrativa' | 'cantera' | 'paciente';
export type Apoyo = 'oficialismo' | 'oposicion' | 'neutral';

export const ESTILO_DIR: Record<Estilo, { label: string; icono: string; texto: string; pide: string }> = {
  exitista: { label: 'Exitista', icono: '🏆', texto: 'Quiere ganar ya: pide un objetivo más alto y cada resultado pesa más en la confianza.', pide: 'Te pide un objetivo más alto que lo normal.' },
  ahorrativa: { label: 'Ahorrativa', icono: '🪙', texto: 'Cuida cada peso: además del objetivo, quiere terminar la temporada con la caja en positivo.', pide: 'Además: terminar la temporada con la caja en positivo.' },
  cantera: { label: 'De la cantera', icono: '🌱', texto: 'Quiere ver pibes del club: además del objetivo, pide que jueguen los jóvenes y le gusta que subas chicos de la M19.', pide: 'Además: que 3 jugadores de 21 años o menos jueguen 5 partidos o más.' },
  paciente: { label: 'Paciente', icono: '🧉', texto: 'Banca los procesos: pide un objetivo más tranquilo y no se asusta por una mala racha.', pide: 'Te pide un objetivo más tranquilo y tiene paciencia.' },
};
const ESTILOS: Estilo[] = ['exitista', 'ahorrativa', 'cantera', 'paciente'];
export const CADA_ELECCION = 3;
/** Desde esta fecha se arma la campaña. */
export const FECHA_CAMPANA = 12;

export interface Lista {
  presidente: string;
  estilo: Estilo;
}

export interface Directiva {
  clubId: string;
  presidente: string;
  estilo: Estilo;
  desde: number;
  /** Temporada en la que votan (al terminarla). */
  proxima: number;
  /** La lista de la oposición (aparece en la campaña). */
  oposicion?: Lista;
  apoyo?: Apoyo;
  /** Resultado de la última elección. */
  ultima?: { temporada: number; gano: 'oficialismo' | 'oposicion'; votosOf: number; texto: string; vista?: boolean };
  /** Caja al empezar la temporada (para la comisión ahorrativa). */
  cajaInicio?: number;
}

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

function nombre(rng: Rng) {
  return `${rng.pick(NOMBRES)} ${rng.pick(APELLIDOS)}`;
}

/** La comisión del club donde estás (si cambiaste de club, hay una nueva). */
export function directivaDe(g: GameState): Directiva {
  const id = g.userClubId;
  if (g.directiva?.clubId === id) return g.directiva;
  const rng = new Rng(hash(`${id}|${g.temporada}|dir`));
  g.directiva = {
    clubId: id,
    presidente: nombre(rng),
    estilo: rng.pick(ESTILOS),
    desde: g.temporada - rng.int(0, 2),
    proxima: g.temporada + rng.int(1, 2),
    cajaInicio: g.clubs[id]?.presupuesto ?? 0,
  };
  return g.directiva;
}

/** Cuántos puestos más arriba (negativo) o más abajo pide la comisión según su estilo. */
export function ajusteObjetivo(g: GameState, clubId: string): number {
  const d = g.directiva;
  if (!d || d.clubId !== clubId) return 0;
  return d.estilo === 'exitista' ? -1 : d.estilo === 'paciente' ? 1 : 0;
}

/** Cuánto pesa cada resultado en la confianza. */
export const factorConfianza = (g: GameState) => (g.directiva?.clubId === g.userClubId ? (g.directiva.estilo === 'exitista' ? 1.3 : g.directiva.estilo === 'paciente' ? 0.7 : 1) : 1);

export const hayCampana = (g: GameState) => {
  const d = g.directiva;
  return !!d && d.clubId === g.userClubId && d.proxima === g.temporada && (g.round >= FECHA_CAMPANA || g.phase !== 'regular');
};

/** Arranca la campaña: aparece la lista opositora. */
export function campanaElectoral(g: GameState): string | null {
  const d = directivaDe(g);
  if (d.proxima !== g.temporada || d.oposicion || g.round < FECHA_CAMPANA) return null;
  const rng = new Rng(hash(`${d.clubId}|${g.temporada}|opo`));
  const estilos = ESTILOS.filter((e) => e !== d.estilo);
  d.oposicion = { presidente: nombre(rng), estilo: rng.pick(estilos) };
  return `Hay elecciones en el club al terminar la temporada. ${d.presidente} (${ESTILO_DIR[d.estilo].label.toLowerCase()}) va por la reelección y enfrente está ${d.oposicion.presidente} (${ESTILO_DIR[d.oposicion.estilo].label.toLowerCase()}).`;
}

export function apoyar(g: GameState, a: Apoyo): string {
  const d = directivaDe(g);
  d.apoyo = a;
  if (a === 'neutral') return 'Dijiste que vos te dedicás al rugby y que voten los socios.';
  const quien = a === 'oficialismo' ? d.presidente : d.oposicion?.presidente;
  return `Apoyaste públicamente a ${quien}. Si gana, te va a bancar; si pierde, la nueva comisión no se va a olvidar.`;
}

/** Jóvenes (21 o menos) que jugaron 5 partidos o más esta temporada. */
export const jovenesConMinutos = (g: GameState) =>
  g.clubs[g.userClubId].plantel.map((id) => g.players[id]).filter((p: Player | undefined) => p && p.edad <= 21 && p.temporada.partidos >= 5).length;

/** Lo que pide de más la comisión (ahorrativa y cantera). Devuelve el texto y si se cumplió. */
export function pedidoExtra(g: GameState): { texto: string; ok: boolean } | null {
  const d = g.directiva;
  if (!d || d.clubId !== g.userClubId) return null;
  if (d.estilo === 'ahorrativa') return { texto: 'Caja en positivo', ok: g.clubs[g.userClubId].presupuesto >= 0 };
  if (d.estilo === 'cantera') {
    const n = jovenesConMinutos(g);
    return { texto: `Jóvenes con minutos: ${n} de 3`, ok: n >= 3 };
  }
  return null;
}

/** Al cerrar la temporada: el pedido extra suma o resta confianza, y si toca, votan los socios. */
export function cierreDirectiva(g: GameState, cumplido: boolean, rng: Rng): { texto: string[]; echar?: string } {
  const out: string[] = [];
  const d = directivaDe(g);
  const car = g.career;
  const extra = pedidoExtra(g);
  if (extra && car) {
    car.confianza = clamp(car.confianza + (extra.ok ? 10 : -15), 0, 100);
    out.push(extra.ok ? `La comisión está contenta: cumpliste lo que pedía (${extra.texto.toLowerCase()}).` : `La comisión te reprocha que no cumpliste lo que pedía (${extra.texto.toLowerCase()}).`);
  }
  let echar: string | undefined;
  if (d.proxima === g.temporada) {
    d.oposicion ??= { presidente: nombre(rng), estilo: rng.pick(ESTILOS.filter((e) => e !== d.estilo)) };
    const club = g.clubs[g.userClubId];
    let of = 50 + (cumplido ? 10 : -12) + ((club.hinchada ?? 55) - 55) / 3 + (club.presupuesto >= 0 ? 4 : -6) + rng.normal(0, 8);
    // Tu apoyo mueve votos si la gente te quiere.
    const peso = car ? (car.confianza - 40) / 10 + ((club.hinchada ?? 55) - 50) / 10 : 2;
    if (d.apoyo === 'oficialismo') of += Math.max(0, peso);
    if (d.apoyo === 'oposicion') of -= Math.max(0, peso);
    of = Math.round(clamp(of, 18, 82));
    const gano = of >= 50 ? 'oficialismo' : 'oposicion';
    const op = d.oposicion;
    let texto: string;
    if (gano === 'oficialismo') {
      texto = `${d.presidente} ganó las elecciones con el ${of}% de los votos y sigue al frente del club.`;
      if (car && d.apoyo === 'oficialismo') car.confianza = clamp(car.confianza + 10, 0, 100);
      if (car && d.apoyo === 'oposicion') {
        car.confianza = clamp(car.confianza - 25, 0, 100);
        if (car.confianza < 30) echar = `Apoyaste a la oposición y perdió. ${d.presidente} te pidió la renuncia.`;
      }
    } else {
      texto = `¡Cambio en el club! ${op.presidente} ganó las elecciones con el ${100 - of}% y es el nuevo presidente. La comisión nueva es ${ESTILO_DIR[op.estilo].label.toLowerCase()}: ${ESTILO_DIR[op.estilo].texto.charAt(0).toLowerCase()}${ESTILO_DIR[op.estilo].texto.slice(1)}`;
      if (car) {
        car.confianza = d.apoyo === 'oposicion' ? 75 : d.apoyo === 'oficialismo' ? 30 : 55;
        if (d.apoyo === 'oficialismo' && !cumplido) echar = `Apoyaste a ${d.presidente} y perdió. La comisión nueva de ${op.presidente} no te quiere y no te renueva.`;
      }
      d.presidente = op.presidente;
      d.estilo = op.estilo;
      d.desde = g.temporada + 1;
    }
    d.ultima = { temporada: g.temporada, gano, votosOf: of, texto };
    d.proxima = g.temporada + CADA_ELECCION;
    d.oposicion = undefined;
    d.apoyo = undefined;
    out.push(texto);
  }
  return { texto: out, echar };
}
