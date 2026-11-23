import { isDerby } from './extras';
import { Rng, clamp } from './rng';
import { sponsorOffers } from './club';
import { DIV_NAME, addNews, divisionClubs, matchWinner, standings } from './game';
import type { Club, DivId, Fixture, GameState, SeasonRecord } from './types';
import { ajusteObjetivo, cierreDirectiva, directivaDe, factorConfianza } from './elecciones';

export type ObjetivoTipo = 'campeon' | 'playoffs' | 'mitad' | 'salvarse' | 'ascenso' | 'promocion' | 'tranquila';

export interface Objetivo {
  tipo: ObjetivoTipo;
  /** Puesto máximo en la tabla para cumplirlo (en "campeon" y "ascenso" se mira el título). */
  puesto: number;
  texto: string;
}

export interface Offer {
  clubId: string;
  texto: string;
}

export interface CareerSeason {
  temporada: number;
  clubId: string;
  division: DivId;
  puesto: number;
  objetivo: string;
  cumplido: boolean;
  logro?: string;
  despedido?: boolean;
}

export interface Career {
  prestigio: number; // 0-100
  confianza: number; // 0-100, la de la comisión directiva
  objetivo: Objetivo;
  historial: CareerSeason[];
  ofertas: Offer[];
  despedido: boolean;
  /** Veredicto de la directiva al terminar la temporada. */
  veredicto?: string;
}

export const PRESTIGIO_INICIAL = 5;

export function prestigioTexto(p: number) {
  if (p < 15) return 'Desconocido';
  if (p < 30) return 'Prometedor';
  if (p < 45) return 'Respetado';
  if (p < 60) return 'Reconocido';
  if (p < 75) return 'Prestigioso';
  return 'Leyenda';
}

/** El club más grande que te puede llamar según tu prestigio. */
export const repMax = (prestigio: number) => 58 + prestigio * 0.24;

function repRank(g: GameState, club: Club) {
  const peers = divisionClubs(g, club.division).sort((a, b) => b.reputacion - a.reputacion);
  return peers.indexOf(club) + 1;
}

export function makeObjective(g: GameState, club: Club): Objetivo {
  // La comisión exitista pide más; la paciente, menos.
  const r = clamp(repRank(g, club) + ajusteObjetivo(g, club.id), 1, 10);
  if (club.division === 'A') {
    if (r <= 2) return { tipo: 'campeon', puesto: 1, texto: 'Salir campeón de Primera A' };
    if (r <= 5) return { tipo: 'playoffs', puesto: 4, texto: 'Meterse en los playoffs (los 4 primeros)' };
    if (r <= 7) return { tipo: 'mitad', puesto: 5, texto: 'Terminar en la mitad de arriba (5.º o mejor)' };
    return { tipo: 'salvarse', puesto: 6, texto: 'Salvarse: evitar el descenso y el repechaje (6.º o mejor)' };
  }
  const arriba = club.division === 'B' ? 'Primera A' : 'Primera B';
  if (r <= 2) return { tipo: 'ascenso', puesto: 2, texto: `Ascender a ${arriba}` };
  if (r <= 5) return { tipo: 'promocion', puesto: 4, texto: 'Pelear el ascenso: terminar 4.º o mejor (repechaje)' };
  if (r <= 7) return { tipo: 'mitad', puesto: 5, texto: 'Terminar en la mitad de arriba (5.º o mejor)' };
  return { tipo: 'tranquila', puesto: club.division === 'B' ? 6 : 8, texto: club.division === 'B' ? 'Una temporada tranquila: evitar el descenso y el repechaje (6.º o mejor)' : 'Una temporada tranquila (8.º o mejor)' };
}

export function newCareer(g: GameState): Career {
  return {
    prestigio: PRESTIGIO_INICIAL,
    confianza: 60,
    objetivo: makeObjective(g, g.clubs[g.userClubId]),
    historial: [],
    ofertas: [],
    despedido: false,
  };
}

/** Los 3 clubes más chicos de la última categoría: los únicos que llaman a un desconocido. */
export function firstOffers(g: GameState): string[] {
  const ultima = divisionClubs(g, 'C').length ? 'C' : 'B';
  return divisionClubs(g, ultima)
    .sort((a, b) => a.reputacion - b.reputacion)
    .slice(0, 3)
    .map((c) => c.id);
}

const isCareer = (g: GameState) => g.modo === 'carrera' && !!g.career;

/** Después de cada partido la directiva ajusta su confianza. */
export function afterUserMatch(g: GameState, f: Fixture, rng: Rng) {
  if (!g.career) return;
  const c = g.career;
  const antes = c.confianza;
  const me = g.userClubId;
  const rival = g.clubs[f.home === me ? f.away : f.home];
  const diff = rival.reputacion - g.clubs[me].reputacion; // >0: el rival es más grande
  const w = matchWinner(f);
  // Perder con uno más grande se perdona; perder con uno más chico, no.
  if (w === me) c.confianza += diff > 3 ? 5 : diff < -3 ? 2 : 3;
  else if (w === null) c.confianza += diff > 0 ? 1 : -1;
  else c.confianza -= diff > 3 ? 1 : diff < -3 ? 6 : 3;
  // El clásico vale doble para la comisión directiva.
  if (isDerby(g.clubs[me], rival) && w !== null) c.confianza += w === me ? 3 : -3;
  // Cómo va en la tabla contra lo que se pidió.
  if (f.comp === 'A' || f.comp === 'B' || f.comp === 'C') {
    const t = standings(g, g.clubs[me].division);
    const pos = t.findIndex((r) => r.clubId === me) + 1;
    if (f.round >= 6) {
      if (pos > c.objetivo.puesto + 2) c.confianza -= 2;
      else if (pos <= c.objetivo.puesto) c.confianza += 1;
    }
  }
  // Una comisión exitista se mueve más con cada resultado; una paciente, menos.
  c.confianza = antes + (c.confianza - antes) * factorConfianza(g);
  c.confianza = clamp(Math.round(c.confianza), 0, 100);
  const limite = g.directiva?.clubId === me && g.directiva.estilo === 'paciente' ? 4 : 8;
  if (isCareer(g) && !c.despedido && c.confianza <= limite && g.round <= 16) {
    fire(g, rng, 'La comisión directiva perdió la paciencia con los malos resultados y decidió echarte.');
  }
}

function fire(g: GameState, rng: Rng, motivo: string) {
  const c = g.career!;
  const club = g.clubs[g.userClubId];
  c.despedido = true;
  c.prestigio = clamp(c.prestigio - 6, 0, 100);
  c.veredicto = motivo;
  c.historial.push({
    temporada: g.temporada,
    clubId: club.id,
    division: club.division,
    puesto: standings(g, club.division).findIndex((r) => r.clubId === club.id) + 1,
    objetivo: c.objetivo.texto,
    cumplido: false,
    despedido: true,
  });
  c.ofertas = makeOffers(g, rng, { fired: true });
  addNews(g, 'Te echaron', `${club.nombre} despidió a ${g.manager}. ${motivo}`);
}

/** Clubes que te ofrecen trabajo. */
export function makeOffers(g: GameState, rng: Rng, opts: { fired: boolean; good?: boolean }): Offer[] {
  const c = g.career!;
  const current = g.clubs[g.userClubId];
  const max = repMax(c.prestigio);
  let pool = Object.values(g.clubs).filter((x) => x.id !== current.id && x.division !== 'X' && x.reputacion <= max);
  if (!opts.fired) pool = pool.filter((x) => x.reputacion >= current.reputacion - 1);
  else pool = pool.filter((x) => x.reputacion <= Math.max(current.reputacion + 1, 60));
  if (!pool.length && opts.fired) pool = Object.values(g.clubs).filter((x) => x.id !== current.id && x.division !== 'X').sort((a, b) => a.reputacion - b.reputacion).slice(0, 3);
  rng.shuffle(pool);
  pool.sort((a, b) => b.reputacion - a.reputacion);
  let n = opts.fired ? 2 + (rng.chance(0.4) ? 1 : 0) : opts.good ? rng.int(1, 3) : rng.chance(0.35) ? 1 : 0;
  n = Math.min(n, pool.length);
  // Mezcla un poco para que no siempre sean los mismos.
  const picked = rng.shuffle(pool.slice(0, n + 2)).slice(0, n);
  return picked.map((x) => ({
    clubId: x.id,
    texto:
      x.division !== current.division
        ? x.division < current.division
          ? `${x.nombre} te quiere para dar el salto a ${DIV_NAME[x.division]}.`
          : `${x.nombre}, de ${DIV_NAME[x.division]}, te ofrece un proyecto para volver a empezar.`
        : `${x.nombre} te ofrece dirigir al equipo la próxima temporada.`,
  }));
}

/** Al terminar la temporada: veredicto de la directiva, prestigio y ofertas. */
export function closeCareerSeason(g: GameState, rec: SeasonRecord, rng: Rng) {
  if (!g.career) return;
  const c = g.career;
  if (c.despedido) return;
  const me = g.userClubId;
  const club = g.clubs[me];
  const puesto = rec.posicionUsuario.puesto;
  const o = c.objetivo;
  const campeon = rec.campeonA === me;
  const asciende = rec.asciende.includes(me) || !!rec.ascC?.includes(me);
  const desciende = rec.desciende.includes(me) || !!rec.descB?.includes(me);
  let cumplido: boolean;
  if (o.tipo === 'campeon') cumplido = campeon;
  else if (o.tipo === 'ascenso') cumplido = asciende;
  else cumplido = puesto <= o.puesto && !desciende;

  let logro: string | undefined;
  let dp = cumplido ? 8 : -8;
  if (campeon) {
    dp += 25;
    logro = `Campeón de Primera A ${g.temporada}`;
  } else if (rec.subcampeonA === me) {
    dp += 10;
    logro = `Subcampeón de Primera A ${g.temporada}`;
  } else if (rec.campeonB === me) {
    dp += 15;
    logro = `Campeón de Primera B ${g.temporada}`;
  } else if (rec.campeonC === me) {
    dp += 12;
    logro = `Campeón de Primera C ${g.temporada}`;
  } else if (asciende) {
    dp += 12;
    logro = `Ascenso ${g.temporada}`;
  }
  if (desciende) dp -= 12;
  if (club.division === 'A' && puesto <= 4 && !campeon) dp += 4;
  if (rec.campeonCopa === me) {
    dp += 6;
    logro = logro ? `${logro} y Copa del Ñandubay` : `Campeón de la Copa del Ñandubay ${g.temporada}`;
  }
  c.prestigio = clamp(c.prestigio + dp, 0, 100);
  c.confianza = clamp(c.confianza + (cumplido ? 20 : -25), 0, 100);
  c.historial.push({ temporada: g.temporada, clubId: me, division: rec.posicionUsuario.division, puesto, objetivo: o.texto, cumplido, logro });
  // Lo que pedía de más la comisión, y las elecciones si tocan este año.
  const dir = cierreDirectiva(g, cumplido, rng);
  for (const t of dir.texto) addNews(g, '🗳 Comisión directiva', t);

  if (g.modo === 'carrera' && ((!cumplido && (c.confianza < 35 || desciende)) || dir.echar)) {
    c.despedido = true;
    c.historial[c.historial.length - 1].despedido = true;
    c.veredicto = dir.echar ?? `No cumpliste el objetivo (${o.texto.toLowerCase()}). La comisión directiva decidió no renovarte.`;
    c.ofertas = makeOffers(g, rng, { fired: true });
    addNews(g, 'No te renuevan', `${club.nombre} no sigue con ${g.manager}. ${c.veredicto}`);
  } else {
    c.veredicto = cumplido
      ? campeon || asciende
        ? '¡La comisión directiva está feliz! Cumpliste de sobra.'
        : 'Objetivo cumplido. La comisión directiva confía en vos.'
      : 'No cumpliste el objetivo, pero la comisión directiva te da otra oportunidad. Ojo el año que viene.';
    c.ofertas = g.modo === 'carrera' ? makeOffers(g, rng, { fired: false, good: cumplido }) : [];
    if (c.ofertas.length) addNews(g, 'Te llegaron ofertas', `${c.ofertas.map((x) => g.clubs[x.clubId].nombre).join(', ')} ${c.ofertas.length > 1 ? 'quieren' : 'quiere'} que dirijas a su equipo.`);
  }
}

/** Cambiás de club (por una oferta). */
export function switchClub(g: GameState, clubId: string) {
  const c = g.career!;
  const old = g.clubs[g.userClubId];
  old.entrenamiento = { foco: 'auto', intensidad: 'normal' };
  for (const id of old.plantel) g.players[id].entreno = null;
  delete old.hinchada;
  // Luca: la estrella de la ayuda inicial es del club. Si te vas, se queda ahí como un jugador más.
  for (const id of old.plantel) {
    const p = g.players[id];
    if (!p?.estrella) continue;
    p.estrella = false;
    addNews(g, 'Tu figura se queda', `${p.nombre} ${p.apellido} sigue en ${old.nombre}: la estrella es del club.`);
  }
  g.userClubId = clubId;
  g.clubs[clubId].hinchada ??= 55;
  g.caja = [];
  g.ultimasMejoras = [];
  c.despedido = false;
  c.ofertas = [];
  c.veredicto = undefined;
  c.confianza = 55;
  directivaDe(g);
  c.objetivo = makeObjective(g, g.clubs[clubId]);
  const nuevo = g.clubs[clubId];
  if (!nuevo.sponsor) {
    const rng = new Rng(g.rng);
    g.sponsorOfertas = sponsorOffers(nuevo.reputacion, rng, nuevo);
    g.rng = rng.s;
  } else g.sponsorOfertas = [];
  addNews(g, `Nuevo club: ${g.clubs[clubId].nombre}`, `${g.manager} es el nuevo entrenador de ${g.clubs[clubId].nombre}. Objetivo: ${c.objetivo.texto.toLowerCase()}.`);
}

/** Al empezar la temporada, la directiva pone el objetivo nuevo. */
export function startCareerSeason(g: GameState) {
  if (!g.career) return;
  const c = g.career;
  c.ofertas = [];
  c.veredicto = undefined;
  const d = directivaDe(g);
  d.cajaInicio = g.clubs[g.userClubId].presupuesto;
  c.objetivo = makeObjective(g, g.clubs[g.userClubId]);
  c.confianza = clamp(Math.max(c.confianza, 45), 0, 100);
  addNews(g, 'La directiva te marca el objetivo', `Para esta temporada en ${DIV_NAME[g.clubs[g.userClubId].division]}: ${c.objetivo.texto.toLowerCase()}.`);
}
