import { aplicarAyuda, ponerEnXV, type AyudaInicial } from './ayuda';
import { eventosVestuario } from './vestuario';
import { HINCHADA_INICIAL, hinchadaTrasPartido } from './hinchada';
import { cerrarPrensa, editarDiario, premiosTemporada } from './diario';
import { refreshTransferibles, returnLoans } from './loans';
import { makePreseason, nextFriendly, preseasonPending, choosePreseason as choosePre } from './preseason';
import { generateOffers, nombreOfertante, OFERTA_FECHAS } from './offers';
const formatPesos = (v: number) => `$${Math.round(v).toLocaleString('es-AR')}`;
import { callUp, checkRecords, climaDe, isDerby, PREMIO_SELECCION, SELECCION, seasonRecords } from './extras';
import { Rng, clamp } from './rng';
import { CLUB_SEEDS, CLUB_SEEDS_C, type ClubSeed } from './names';
import { LiveMatch, simulateMatch } from './match';
import {
  ATTR_KEYS, convertirAttrs, MIN_BY_POS, POS_ORDER, SQUAD_TEMPLATE, assignDorsal, bestXV, generatePlayer, overall, ratingAs, readyXV, rollSecondary, wageFor,
  rollActitud, teamAverage, lesionNombre, completarXV,
} from './players';
import { presupuestoInicial, refreshFreeAgents, sponsor, taquilla, logMoney } from './market';
import { ENERGIA_ENTRENO, planNuevo, trainAll } from './training';
import { COPA_NOMBRE, CUP_ETAPA, advanceCup, drawCup, scoutYouth } from './cup';
import { INTL_NOMBRE, INTL_PREMIO, avanzarIntl, elegirRivales, fixturesGrupo } from './internacional';
import { asistencia, initClubBusiness, signSponsor, sponsorOffers, weeklyFinances } from './club';
import { afterUserMatch, closeCareerSeason, newCareer, startCareerSeason } from './career';
import type {
  Club, Comp, DivId, Fixture, GameState, MatchResult, Player, Pos, SeasonRecord, StandingRow, Tactics,
} from './types';

export const SAVE_VERSION = 19;
export const REGULAR_ROUNDS = 18;
export const LAST_ROUND = 20;
export const FIRST_SEASON = 2027;

export const DEFAULT_TACTICS: Tactics = { ataque: 'equilibrado', pie: 'medio', defensa: 'equilibrada' };

const AI_TACTICS: Tactics[] = [
  DEFAULT_TACTICS,
  { ataque: 'forwards', pie: 'mucho', defensa: 'equilibrada' },
  { ataque: 'abrir', pie: 'poco', defensa: 'agresiva' },
  { ataque: 'forwards', pie: 'medio', defensa: 'agresiva' },
  { ataque: 'abrir', pie: 'medio', defensa: 'conservadora' },
  { ataque: 'equilibrado', pie: 'mucho', defensa: 'conservadora' },
];

function newId(g: GameState, prefix: string) {
  return `${prefix}${(g.nextId++).toString(36)}`;
}

export function createGame(opts: { seed?: number; userClubIndex?: number; manager?: string; modo?: 'carrera' | 'libre'; amistosos?: boolean; ayuda?: AyudaInicial } = {}): GameState {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = new Rng(seed);
  const g: GameState = {
    version: SAVE_VERSION,
    rng: 0,
    temporada: FIRST_SEASON,
    round: 1,
    phase: 'regular',
    userClubId: '',
    manager: opts.manager?.trim() || 'Manager',
    clubs: {},
    players: {},
    fixtures: [],
    history: [],
    news: [],
    nextId: 1,
    libres: [],
    caja: [],
    ultimasMejoras: [],
    modo: opts.modo ?? 'libre',
    career: null as unknown as GameState['career'],
    sponsorOfertas: [],
    juveniles: [],
  };
  const reps: Record<DivId, number[]> = {
    A: rng.shuffle([77, 75, 74, 73, 72, 71, 70, 69, 68, 66]),
    B: rng.shuffle([67, 66, 65, 64, 63, 62, 61, 60, 59, 57]),
    C: rng.shuffle([57, 56, 55, 54, 53, 52, 51, 50, 49, 47]),
    X: [],
  };
  [...CLUB_SEEDS, ...CLUB_SEEDS_C].forEach((seedClub, i) => addClub(g, rng, `c${i}`, seedClub, reps[seedClub.division].pop()!));
  const userIdx = clamp(opts.userClubIndex ?? 0, 0, Object.keys(g.clubs).length - 1);
  g.userClubId = `c${userIdx}`;
  g.clubs[g.userClubId].tactica = { ...DEFAULT_TACTICS };
  g.clubs[g.userClubId].hinchada = HINCHADA_INICIAL;
  g.fixtures = makeLeagueFixtures(g, rng);
  refreshFreeAgents(g, rng);
  refreshTransferibles(g, rng);
  g.career = newCareer(g);
  const textoAyuda = aplicarAyuda(g, opts.ayuda ?? 'nada', rng);
  g.sponsorOfertas = sponsorOffers(g.clubs[g.userClubId].reputacion, rng, g.clubs[g.userClubId]);
  drawCup(g, rng);
  scoutYouth(g, rng);
  g.amistosos = !!opts.amistosos;
  if (g.amistosos) makePreseason(g, rng);
  g.rng = rng.s;
  if (textoAyuda) {
    addNews(g, 'Ayuda para arrancar', textoAyuda);
    g.ayudaAviso ??= { texto: textoAyuda };
  }
  addNews(g, 'Bienvenido al club', `${g.manager} asume como entrenador de ${g.clubs[g.userClubId].nombre}.${g.modo === 'carrera' ? ' Nadie te conoce todavía: es tu oportunidad de hacerte un nombre.' : ''} La comisión directiva pide: ${g.career.objetivo.texto.toLowerCase()}.`);
  return g;
}

function addClub(g: GameState, rng: Rng, id: string, seedClub: ClubSeed, rep: number): Club {
  const club: Club = {
    id,
    ...seedClub,
    codigo: seedClub.codigo ?? seedClub.corto,
    reputacion: rep,
    plantel: [],
    xv: Array(15).fill(null),
    tactica: { ...rng.pick(AI_TACTICS) },
    presupuesto: presupuestoInicial(rep),
    entrenamiento: { foco: 'auto', intensidad: 'normal' },
  } as unknown as Club;
  initClubBusiness(club);
  g.clubs[id] = club;
  for (const pos of POS_ORDER) {
    for (let k = 0; k < SQUAD_TEMPLATE[pos]; k++) {
      // Los primeros de cada puesto son titulares (más buenos).
      const starterBoost = k < Math.ceil(SQUAD_TEMPLATE[pos] / 2) ? 3 : -3;
      addPlayer(g, rng, club, pos, rep + starterBoost + rng.normal(0, 4.5));
    }
  }
  club.xv = bestXV(club, g.players);
  return club;
}

function addPlayer(g: GameState, rng: Rng, club: Club, pos: Pos, target: number, edad?: number): Player {
  const p = generatePlayer(rng, newId(g, 'p'), pos, target, edad);
  p.clubId = club.id;
  g.players[p.id] = p;
  club.plantel.push(p.id);
  assignDorsal(club, g.players, p);
  return p;
}

export function addNews(g: GameState, titulo: string, texto: string) {
  g.news.unshift({ id: newId(g, 'n'), temporada: g.temporada, round: g.round, titulo, texto });
  g.news = g.news.slice(0, 40);
}

export const DIV_NAME: Record<DivId, string> = { A: 'Primera A', B: 'Primera B', C: 'Primera C', X: 'Internacional' };
export const DIVS: DivId[] = ['A', 'B', 'C'];
export const isLeague = (c: Comp) => c === 'A' || c === 'B' || c === 'C';
/** La Primera C se juega esta temporada (en partidas viejas arranca la temporada siguiente). */
export const hasC = (g: GameState) => g.fixtures.some((f) => f.comp === 'C');
export const COMP_NAME: Record<Comp, string> = {
  A: 'Primera A', B: 'Primera B', C: 'Primera C', SEMI: 'Semifinal', FINAL: 'Final', PROMO1: 'Repechaje A-B (ida)', PROMO2: 'Repechaje A-B (vuelta)',
  AMISTOSO: 'Amistoso', PROMOC1: 'Repechaje B-C (ida)', PROMOC2: 'Repechaje B-C (vuelta)', COPA: 'Copa del Ñandubay', INTL: 'Copa Cruz del Sur',
};

export function divisionClubs(g: GameState, d: DivId): Club[] {
  return Object.values(g.clubs).filter((c) => c.division === d);
}

/** Todos contra todos, ida y vuelta (método del círculo). */
function roundRobin(ids: string[], rng: Rng): [string, string][][] {
  const t = rng.shuffle([...ids]);
  const n = t.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i];
      const b = t[n - 1 - i];
      pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    t.splice(1, 0, t.pop()!);
  }
  return [...rounds, ...rounds.map((rs) => rs.map(([a, b]) => [b, a] as [string, string]))];
}

function makeLeagueFixtures(g: GameState, rng: Rng): Fixture[] {
  const out: Fixture[] = [];
  for (const d of DIVS) {
    const ids = divisionClubs(g, d).map((c) => c.id);
    if (ids.length < 2) continue;
    roundRobin(ids, rng).forEach((pairs, r) => {
      for (const [home, away] of pairs) out.push({ id: newId(g, 'f'), round: r + 1, comp: d as Comp, home, away });
    });
  }
  return out;
}

export function leaguePoints(r: MatchResult, side: 'H' | 'A') {
  const my = side === 'H' ? r.ptsH : r.ptsA;
  const op = side === 'H' ? r.ptsA : r.ptsH;
  const tries = side === 'H' ? r.triesH : r.triesA;
  const base = my > op ? 4 : my === op ? 2 : 0;
  const bo = tries >= 4 ? 1 : 0;
  const bd = my < op && op - my <= 7 ? 1 : 0;
  return { base, bo, bd, total: base + bo + bd };
}

export function standings(g: GameState, d: DivId): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const c of divisionClubs(g, d)) rows.set(c.id, { clubId: c.id, pj: 0, pg: 0, pe: 0, pp: 0, pf: 0, pc: 0, tf: 0, bo: 0, bd: 0, pts: 0 });
  for (const f of g.fixtures) {
    if (f.comp !== d || !f.result) continue;
    const r = f.result;
    for (const side of ['H', 'A'] as const) {
      const row = rows.get(side === 'H' ? f.home : f.away)!;
      const my = side === 'H' ? r.ptsH : r.ptsA;
      const op = side === 'H' ? r.ptsA : r.ptsH;
      const lp = leaguePoints(r, side);
      row.pj++;
      row.pf += my;
      row.pc += op;
      row.tf += side === 'H' ? r.triesH : r.triesA;
      if (my > op) row.pg++;
      else if (my === op) row.pe++;
      else row.pp++;
      row.bo += lp.bo;
      row.bd += lp.bd;
      row.pts += lp.total;
    }
  }
  return [...rows.values()].sort(
    (a, b) => b.pts - a.pts || b.pg - a.pg || b.pf - b.pc - (a.pf - a.pc) || b.tf - a.tf || b.pf - a.pf || a.clubId.localeCompare(b.clubId),
  );
}

export function roundFixtures(g: GameState, round = g.round) {
  return g.fixtures.filter((f) => f.round === round);
}

export function userFixture(g: GameState, round = g.round) {
  if (preseasonPending(g) && round === g.round) return nextFriendly(g);
  return roundFixtures(g, round).find((f) => f.home === g.userClubId || f.away === g.userClubId);
}

/** Prepara el plantel de cada club antes de la fecha (la IA elige su XV). */
function prepareLineups(g: GameState) {
  for (const c of Object.values(g.clubs)) {
    if (c.id !== g.userClubId) c.xv = bestXV(c, g.players);
  }
}

export interface RoundReport {
  round: number;
  fixtures: Fixture[];
  userFixture?: Fixture;
  autoCambios: number;
}

/** Arma el partido del usuario para jugarlo en vivo (no cambia la partida hasta que termina). */
export function startUserMatch(g: GameState): { fixture: Fixture; live: LiveMatch } | null {
  if (g.phase === 'fin' || g.career?.despedido) return null;
  const f = userFixture(g);
  if (!f || f.result) return null;
  prepareLineups(g);
  const home = g.clubs[f.home];
  const away = g.clubs[f.away];
  const side = home.id === g.userClubId ? 'H' : 'A';
  const live = new LiveMatch(
    { home, away, homeXV: readyXV(home, g.players).xv, awayXV: readyXV(away, g.players).xv, players: g.players, neutral: false, detailed: true, interactive: side, clima: climaDe(f, g.temporada), clasico: isDerby(home, away) },
    new Rng((g.rng ^ 0x5bd1e995) >>> 0 || 1),
  );
  return { fixture: f, live };
}

/** Juega toda la fecha. Si el usuario jugó su partido en vivo, se usa ese resultado. */
export function playRound(g: GameState, userResult?: MatchResult): RoundReport {
  if (g.phase === 'fin') throw new Error('La temporada terminó');
  if (g.career?.despedido) throw new Error('Primero elegí un club nuevo');
  if (preseasonPending(g)) return playFriendly(g, userResult);
  const rng = new Rng(g.rng);
  // Si no elegiste sponsor, la directiva firma con el que paga más seguro.
  if (g.sponsorOfertas?.length && g.round >= 2) {
    const nombre = g.sponsorOfertas[0].nombre;
    signSponsor(g, 0);
    addNews(g, 'La directiva eligió sponsor', `Como no elegiste, la comisión directiva firmó con ${nombre}.`);
  }
  prepareLineups(g);
  const fixtures = roundFixtures(g);
  let autoCambios = 0;
  const user = g.clubs[g.userClubId];
  for (const f of fixtures) {
    if (f.result) continue;
    const home = g.clubs[f.home];
    const away = g.clubs[f.away];
    const hx = readyXV(home, g.players);
    const ax = readyXV(away, g.players);
    if (home === user) autoCambios = hx.cambios;
    if (away === user) autoCambios = ax.cambios;
    const isUser = home === user || away === user;
    const res =
      isUser && userResult
        ? userResult
        : simulateMatch({ home, away, homeXV: hx.xv, awayXV: ax.xv, players: g.players, neutral: false, detailed: isUser, clima: climaDe(f, g.temporada), clasico: isDerby(home, away) }, rng);
    if ((f.comp === 'SEMI' || f.comp === 'FINAL' || (f.comp === 'INTL' && f.etapa === 3)) && res.ptsH === res.ptsA) {
      res.definicion = res.triesH !== res.triesA
        ? `Empate: pasa ${res.triesH > res.triesA ? home.nombre : away.nombre} por más tries.`
        : `Empate en tries: pasa ${home.nombre} por mejor ubicación en la tabla.`;
    }
    f.result = res;
    applyMatchEffects(g, f, rng);
    for (const n of checkRecords(g, f)) addNews(g, '¡Récord!', n);
    if (isUser) afterUserMatch(g, f, rng);
    if (isUser) for (const t of hinchadaTrasPartido(g, f, matchWinner(f))) addNews(g, '📣 Hinchada', t);
    // La recaudación es para el local (en la promoción y los playoffs, un poco más).
    const playoff = !isLeague(f.comp);
    if (home === user) {
      const a = asistencia(g, home, away, playoff);
      home.ultimaAsistencia = a.total;
      home.presupuesto += a.recaudacion + a.quincho;
      logMoney(g, `Entradas vs ${away.nombre} (${a.total.toLocaleString('es-AR')} personas${a.lleno ? ', lleno' : ''})`, a.recaudacion);
      if (a.quincho) logMoney(g, 'Quincho del tercer tiempo', a.quincho);
    } else {
      home.presupuesto += taquilla(home.reputacion, playoff);
    }
  }
  trainAll(g, rng);
  if (Number.isInteger(g.round) && g.round % 3 === 0) refreshTransferibles(g, rng);
  // Ventana de la Selección a mitad de temporada.
  if (g.round === 9 && g.seleccion?.temporada !== g.temporada) {
    const sel = callUp(g, rng);
    if (sel.mios.length) {
      const pago = PREMIO_SELECCION * sel.mios.length;
      user.presupuesto += pago;
      logMoney(g, `Compensación por convocados a ${SELECCION}`, pago);
    }
    addNews(g, `Test de ${SELECCION}`, sel.texto);
  }
  for (const o of generateOffers(g, rng)) {
    const p = g.players[o.playerId];
    addNews(g, o.exterior ? '🌍 ¡Lo quieren de Europa!' : '💰 Oferta por un jugador', `${nombreOfertante(g, o)} ofrece ${formatPesos(o.monto)} por ${p.nombre} ${p.apellido}. Tenés ${OFERTA_FECHAS} fechas para responder (en Mercado > Ofertas).`);
  }
  const uf = fixtures.find((f) => f.home === user.id || f.away === user.id);
  weeklyFinances(g, uf, rng);
  if (g.career && user.presupuesto < 0) {
    g.career.confianza = clamp(g.career.confianza - 3, 0, 100);
    addNews(g, 'Números en rojo', `La caja de ${user.nombre} está en rojo. La comisión directiva está preocupada: vendé jugadores o bajá gastos.`);
  }
  editarDiario(g, fixtures);
  if (uf?.result) cerrarPrensa(g, uf);
  if (uf) for (const t of eventosVestuario(g, rng)) addNews(g, '🗣 Vestuario', t);
  const report: RoundReport = { round: g.round, fixtures, userFixture: fixtures.find((f) => f.home === user.id || f.away === user.id), autoCambios };
  weeklyRecovery(g, fixtures, rng);
  advanceCalendar(g, rng);
  g.rng = rng.s;
  return report;
}

function applyMatchEffects(g: GameState, f: Fixture, rng: Rng) {
  const r = f.result!;
  for (const id of r.jugaron) {
    const p = g.players[id];
    p.temporada.partidos++;
    p.carrera.partidos++;
    // El desgaste depende de los minutos que jugó.
    const share = r.minutos ? clamp((r.minutos[id] ?? 0) / 80, 0.15, 1) : 1;
    p.energia = Math.round(clamp(p.energia - ((30 - p.attrs.resistencia / 10) + rng.int(0, 6)) * share, 5, 100));
  }
  if (!r.events) delete r.minutos;
  for (const s of r.scorers) {
    const p = g.players[s.playerId];
    p.temporada.tries += s.tries;
    p.temporada.puntos += s.puntos;
    p.carrera.tries += s.tries;
    p.carrera.puntos += s.puntos;
  }
  for (const l of r.lesionados) {
    const pl = g.players[l.playerId];
    if (pl.lesion <= l.semanas) pl.lesionTipo = lesionNombre(l.semanas + 1, pl.id + f.id);
    pl.lesion = Math.max(pl.lesion, l.semanas + 1);
  }
  const winner = matchWinner(f);
  for (const side of ['H', 'A'] as const) {
    const club = g.clubs[side === 'H' ? f.home : f.away];
    const clasico = isDerby(g.clubs[f.home], g.clubs[f.away]) ? 1.6 : 1;
    const delta = Math.round((winner === null ? 1 : winner === club.id ? 6 : -5) * clasico);
    for (const id of club.plantel) {
      const p = g.players[id];
      p.moral = clamp(p.moral + delta + (p.moral > 60 ? -1 : 1), 20, 100);
    }
  }
}

/** Ganador del partido (en eliminación, el empate se define por tries y después por localía). */
export function matchWinner(f: Fixture): string | null {
  const r = f.result;
  if (!r) return null;
  if (r.ptsH !== r.ptsA) return r.ptsH > r.ptsA ? f.home : f.away;
  if (isLeague(f.comp) || f.comp === 'PROMO1' || f.comp === 'PROMOC1' || (f.comp === 'INTL' && (f.etapa ?? 0) < 3)) return null;
  if (r.triesH !== r.triesA) return r.triesH > r.triesA ? f.home : f.away;
  return f.home;
}

function weeklyRecovery(g: GameState, played: Fixture[], rng: Rng) {
  const playedIds = new Set(played.flatMap((f) => f.result?.jugaron ?? []));
  for (const p of Object.values(g.players)) {
    const club = p.clubId ? g.clubs[p.clubId] : null;
    if (p.lesion > 0) p.lesion--;
    // El kinesiólogo acelera la recuperación.
    if (p.lesion > 1 && club && rng.chance(0.18 * (club.staff?.kinesiologo ?? 0))) p.lesion--;
    const extra = club ? ENERGIA_ENTRENO[club.entrenamiento.intensidad] + 2.5 * (club.staff?.nutricionista ?? 0) + 1.5 * (club.inst?.gimnasio ?? 0) : 10;
    p.energia = Math.round(clamp(p.energia + (playedIds.has(p.id) ? 20 : 26) + extra, 0, 100));
  }
}

function advanceCalendar(g: GameState, rng: Rng) {
  const finished = g.round;
  const user = g.clubs[g.userClubId];
  if (!Number.isInteger(finished)) {
    // Terminó una ronda de copa (a mitad de semana).
    const campeon = advanceCup(g, finished, rng, matchWinner);
    const ronda = g.fixtures.filter((f) => f.comp === 'COPA' && f.round === finished);
    const uf = ronda.find((f) => f.home === user.id || f.away === user.id);
    if (campeon) {
      addNews(g, `¡${g.clubs[campeon].nombre} gana la ${COPA_NOMBRE}!`, campeon === user.id ? `¡Tu equipo es campeón de la ${COPA_NOMBRE}! La gente está de fiesta.` : `${g.clubs[campeon].nombre} se quedó con la copa.`);
    } else if (uf) {
      const etapa = uf.etapa ?? 0;
      addNews(g, COPA_NOMBRE, matchWinner(uf) === user.id ? `¡Pasaste ${CUP_ETAPA[etapa].toLowerCase()}! Próxima ronda: ${CUP_ETAPA[etapa + 1].toLowerCase()}.` : `Quedaste afuera en ${CUP_ETAPA[etapa].toLowerCase()}.`);
    }
    cerrarFechaIntl(g, finished);
    g.round = Math.ceil(finished);
    return;
  }
  g.round = g.fixtures.some((f) => f.round === finished + 0.5) ? finished + 0.5 : finished + 1;
  if (finished === REGULAR_ROUNDS) {
    g.phase = 'playoffs';
    const tA = standings(g, 'A');
    const tB = standings(g, 'B');
    const [a1, a2, a3, a4] = tA.map((r) => r.clubId);
    g.fixtures.push(
      { id: newId(g, 'f'), round: 19, comp: 'SEMI', home: a1, away: a4 },
      { id: newId(g, 'f'), round: 19, comp: 'SEMI', home: a2, away: a3 },
      // Repechajes: ida en la cancha del de Primera B, vuelta en la del de Primera A.
      { id: newId(g, 'f'), round: 19, comp: 'PROMO1', serie: 0, home: tB[2].clubId, away: tA[7].clubId },
      { id: newId(g, 'f'), round: 19, comp: 'PROMO1', serie: 1, home: tB[3].clubId, away: tA[6].clubId },
    );
    let extraC = '';
    if (hasC(g)) {
      const tC = standings(g, 'C');
      g.fixtures.push(
        { id: newId(g, 'f'), round: 19, comp: 'PROMOC1', serie: 0, home: tC[2].clubId, away: tB[7].clubId },
        { id: newId(g, 'f'), round: 19, comp: 'PROMOC1', serie: 1, home: tC[3].clubId, away: tB[6].clubId },
      );
      extraC = ` En Primera C suben directo ${g.clubs[tC[0].clubId].nombre} y ${g.clubs[tC[1].clubId].nombre}.`;
    }
    const pos = standings(g, user.division).findIndex((r) => r.clubId === user.id) + 1;
    addNews(g, 'Terminó la fase regular', `${g.clubs[a1].nombre} terminó primero en Primera A. De la B suben directo ${g.clubs[tB[0].clubId].nombre} (campeón) y ${g.clubs[tB[1].clubId].nombre}; los dos últimos de cada categoría bajan y del 7.º al 4.º juegan repechaje.${extraC} Tu equipo terminó ${pos}.º en ${DIV_NAME[user.division]}.`);
  } else if (finished === 19) {
    const semis = g.fixtures.filter((f) => f.comp === 'SEMI');
    const tA = standings(g, 'A');
    const seed = (id: string) => tA.findIndex((r) => r.clubId === id);
    const [w1, w2] = semis.map(matchWinner) as string[];
    const [home, away] = seed(w1) < seed(w2) ? [w1, w2] : [w2, w1];
    g.fixtures.push({ id: newId(g, 'f'), round: 20, comp: 'FINAL', home, away });
    for (const p1 of g.fixtures.filter((f) => f.comp === 'PROMO1' || f.comp === 'PROMOC1')) {
      g.fixtures.push({ id: newId(g, 'f'), round: 20, comp: p1.comp === 'PROMO1' ? 'PROMO2' : 'PROMOC2', serie: p1.serie, home: p1.away, away: p1.home });
    }
  } else if (finished === LAST_ROUND) {
    g.phase = 'fin';
    closeSeason(g, rng);
  }
}

/** Copa Cruz del Sur: premios, la final y el campeón. */
function cerrarFechaIntl(g: GameState, finished: number) {
  const ronda = g.fixtures.filter((f) => f.comp === 'INTL' && f.round === finished);
  if (!ronda.length) return;
  const user = g.clubs[g.userClubId];
  const uf = ronda.find((f) => f.home === user.id || f.away === user.id);
  if (uf && matchWinner(uf) === user.id) {
    user.presupuesto += INTL_PREMIO.victoria;
    logMoney(g, `${INTL_NOMBRE}: premio por ganarle a ${g.clubs[uf.home === user.id ? uf.away : uf.home].nombre}`, INTL_PREMIO.victoria);
  }
  const { campeon, final } = avanzarIntl(g, finished, matchWinner, () => newId(g, 'f'));
  const nom = (id: string) => `${g.clubs[id].nombre}${g.clubs[id].pais ? ` (${g.clubs[id].pais})` : ''}`;
  if (final) {
    const mia = final.home === user.id || final.away === user.id;
    addNews(g, `${INTL_NOMBRE}: la final`, mia ? `¡Tu equipo está en la final! Juega contra ${nom(final.home === user.id ? final.away : final.home)}${final.home === user.id ? ' en casa' : ' de visitante'}.` : `La final la juegan ${nom(final.home)} y ${nom(final.away)}.${uf ? ' Tu equipo quedó afuera en el grupo.' : ''}`);
  }
  if (campeon) {
    const c = g.clubs[campeon];
    if (campeon === user.id) {
      user.presupuesto += INTL_PREMIO.campeon;
      logMoney(g, `${INTL_NOMBRE}: premio por salir campeón`, INTL_PREMIO.campeon);
      user.reputacion = clamp(user.reputacion + 2, 45, 82);
      if (g.career) g.career.confianza = clamp(g.career.confianza + 6, 0, 100);
      addNews(g, `¡Campeones de la ${INTL_NOMBRE}!`, `${user.nombre} es el mejor de Sudamérica. La directiva y la gente están de fiesta.`);
    } else addNews(g, `${INTL_NOMBRE}: campeón ${c.nombre}`, c.pais ? `La copa se fue a ${c.pais}: ganó ${c.nombre}.` : `${c.nombre} dejó la copa en casa.`);
  }
}

/** El campeón de la Primera A juega la Copa Cruz del Sur con 3 clubes de afuera. */
function drawIntl(g: GameState, rng: Rng) {
  const campeon = g.history[g.history.length - 1]?.campeonA;
  if (!campeon || !g.clubs[campeon]) return;
  const ids = [campeon];
  for (const s of elegirRivales(rng)) {
    const c = addClub(g, rng, newId(g, 'x'), s, rng.int(69, 76));
    c.pais = s.pais;
    ids.push(c.id);
  }
  g.fixtures.push(...fixturesGrupo(ids, () => newId(g, 'f')));
  const user = g.clubs[g.userClubId];
  const rivales = ids.slice(1).map((id) => `${g.clubs[id].nombre} (${g.clubs[id].pais})`).join(', ');
  if (campeon === user.id) {
    user.presupuesto += INTL_PREMIO.jugar;
    logMoney(g, `${INTL_NOMBRE}: premio por jugarla`, INTL_PREMIO.jugar);
    addNews(g, `🌎 ¡A jugar la ${INTL_NOMBRE}!`, `Por ser campeón, ${user.nombre} juega contra ${rivales}. Grupo de 4 a una rueda (miércoles después de las fechas 2, 6 y 10) y final entre los dos primeros.`);
  } else addNews(g, `🌎 ${INTL_NOMBRE}`, `${g.clubs[campeon].nombre}, el campeón, representa al país contra ${rivales}.`);
}

/** Los clubes de afuera se van cuando termina la temporada. */
function quitarExtranjeros(g: GameState) {
  for (const c of Object.values(g.clubs)) {
    if (c.division !== 'X') continue;
    for (const id of c.plantel) if (g.players[id]?.clubId === c.id) delete g.players[id];
    delete g.clubs[c.id];
  }
}

/** Todos los repechajes de una categoría ('A' entre A y B, 'C' entre B y C). */
export function promoSeries(g: GameState, cual: 'A' | 'C' = 'A') {
  const series = [...new Set(g.fixtures.filter((f) => f.comp === (cual === 'A' ? 'PROMO1' : 'PROMOC1')).map((f) => f.serie ?? 0))].sort();
  return series.map((s) => promoAggregate(g, cual, s)!);
}

/** Premios en plata por el campeonato y los ascensos (para todos los clubes). */
export const PREMIOS_LIGA = {
  campeonA: 80_000_000,
  subcampeonA: 30_000_000,
  campeonB: 40_000_000,
  campeonC: 25_000_000,
  ascensoDirecto: 20_000_000,
  ascensoRepechaje: 12_000_000,
};
/** Ayuda de la federación a cada club al empezar la temporada, según la categoría. */
export const AYUDA_TEMPORADA: Record<'A' | 'B' | 'C', number> = { A: 20_000_000, B: 12_000_000, C: 7_000_000 };

const millones = (n: number) => `$${(n / 1_000_000).toLocaleString('es-AR')} millones`;

function pagarPremiosTemporada(g: GameState, rec: SeasonRecord) {
  // Cada club cobra el premio más grande que le toque.
  const pagos = new Map<string, { monto: number; motivo: string }>();
  const dar = (id: string | undefined, monto: number, motivo: string) => {
    if (!id || !g.clubs[id] || (pagos.get(id)?.monto ?? 0) >= monto) return;
    pagos.set(id, { monto, motivo });
  };
  const directos = new Set([...rec.asciende.slice(0, 2), ...(rec.ascC ?? []).slice(0, 2)]);
  for (const id of [...rec.asciende, ...(rec.ascC ?? [])]) {
    const porRepechaje = !!rec.repechajes && !directos.has(id);
    dar(id, porRepechaje ? PREMIOS_LIGA.ascensoRepechaje : PREMIOS_LIGA.ascensoDirecto, porRepechaje ? 'premio por ascender en el repechaje' : 'premio por el ascenso');
  }
  dar(rec.subcampeonA, PREMIOS_LIGA.subcampeonA, 'premio por el subcampeonato de Primera A');
  dar(rec.campeonC, PREMIOS_LIGA.campeonC, 'premio por salir campeón de Primera C');
  dar(rec.campeonB, PREMIOS_LIGA.campeonB, 'premio por salir campeón de Primera B');
  dar(rec.campeonA, PREMIOS_LIGA.campeonA, 'premio por salir campeón de Primera A');
  const user = g.clubs[g.userClubId];
  const sx = user.sponsor?.extra;
  const titulo = [rec.campeonA, rec.campeonB, rec.campeonC].includes(user.id) || rec.asciende.includes(user.id) || !!rec.ascC?.includes(user.id);
  if (sx?.tipo === 'titulo' && sx.monto && titulo) {
    user.presupuesto += sx.monto;
    logMoney(g, `Premio de ${user.sponsor!.nombre} por el título`, sx.monto);
    (rec.cobros ??= []).push({ texto: `Premio del sponsor ${user.sponsor!.nombre}`, monto: sx.monto });
    addNews(g, 'Premio del sponsor', `${user.sponsor!.nombre} cumplió: pagó ${millones(sx.monto)} extra por la gran temporada.`);
  }
  for (const [id, p] of pagos) {
    g.clubs[id].presupuesto += p.monto;
    if (id === g.userClubId) {
      logMoney(g, `Federación: ${p.motivo}`, p.monto);
      (rec.cobros ??= []).unshift({ texto: `Federación: ${p.motivo}`, monto: p.monto });
      addNews(g, '\u{1F4B0} ¡Premio cobrado!', `La federación pagó ${millones(p.monto)} de ${p.motivo}. La plata ya está en la caja.`);
    }
  }
}

function pagarAyudaTemporada(g: GameState) {
  for (const c of Object.values(g.clubs)) {
    if (c.division === 'X') continue;
    const monto = AYUDA_TEMPORADA[c.division];
    c.presupuesto += monto;
    if (c.id === g.userClubId) logMoney(g, `Ayuda de la federación (${DIV_NAME[c.division]})`, monto);
  }
}

/** Serie de repechaje: 'A' entre Primera A y B, 'C' entre Primera B y C. */
export function promoAggregate(g: GameState, cual: 'A' | 'C' = 'A', serie = 0) {
  const p1 = g.fixtures.find((f) => f.comp === (cual === 'A' ? 'PROMO1' : 'PROMOC1') && (f.serie ?? 0) === serie);
  const p2 = g.fixtures.find((f) => f.comp === (cual === 'A' ? 'PROMO2' : 'PROMOC2') && (f.serie ?? 0) === serie);
  if (!p1) return null;
  const bTeam = p1.home;
  const aTeam = p1.away;
  let ptsA = 0, ptsB = 0, triesA = 0, triesB = 0;
  for (const f of [p1, p2]) {
    if (!f?.result) continue;
    const r = f.result;
    const aIsHome = f.home === aTeam;
    ptsA += aIsHome ? r.ptsH : r.ptsA;
    ptsB += aIsHome ? r.ptsA : r.ptsH;
    triesA += aIsHome ? r.triesH : r.triesA;
    triesB += aIsHome ? r.triesA : r.triesH;
  }
  let winner: string | null = null;
  let motivo = '';
  if (p2?.result) {
    if (ptsA !== ptsB) winner = ptsA > ptsB ? aTeam : bTeam;
    else if (triesA !== triesB) {
      winner = triesA > triesB ? aTeam : bTeam;
      motivo = ' (por más tries en la serie)';
    } else {
      winner = aTeam;
      motivo = ` (empate total: se queda el de ${cual === 'A' ? 'Primera A' : 'Primera B'})`;
    }
  }
  return { aTeam, bTeam, ptsA, ptsB, triesA, triesB, winner, motivo };
}

function closeSeason(g: GameState, rng: Rng) {
  const tA = standings(g, 'A');
  const tB = standings(g, 'B');
  const final = g.fixtures.find((f) => f.comp === 'FINAL')!;
  const campeon = matchWinner(final)!;
  const sub = campeon === final.home ? final.away : final.home;
  // Desde que hay dos repechajes, suben y bajan dos directo (partidas viejas en playoffs: uno).
  const dos = g.fixtures.some((f) => f.comp === 'PROMO1' && f.serie != null);
  const promos = promoSeries(g, 'A');
  const promo = promos[0];
  const asciende = dos ? [tB[0].clubId, tB[1].clubId] : [tB[0].clubId];
  const desciende = dos ? [tA[9].clubId, tA[8].clubId] : [tA[9].clubId];
  const glob = (p: NonNullable<ReturnType<typeof promoAggregate>>) => `${g.clubs[p.aTeam].corto} ${p.ptsA} - ${p.ptsB} ${g.clubs[p.bTeam].corto}`;
  const repechajes: NonNullable<SeasonRecord['repechajes']> = [];
  for (const p of promos) {
    if (p.winner === p.bTeam) {
      asciende.push(p.bTeam);
      desciende.push(p.aTeam);
    }
    repechajes.push({ cual: 'A', primera: p.aTeam, ascenso: p.bTeam, ganador: p.winner!, global: glob(p) });
  }
  let ascC: string[] | undefined;
  let descB: string[] | undefined;
  let campeonC: string | undefined;
  let promocionC: SeasonRecord['promocionC'];
  const pcs = hasC(g) ? promoSeries(g, 'C') : [];
  if (pcs.length) {
    const tC = standings(g, 'C');
    const dosC = g.fixtures.some((f) => f.comp === 'PROMOC1' && f.serie != null);
    campeonC = tC[0].clubId;
    ascC = dosC ? [tC[0].clubId, tC[1].clubId] : [tC[0].clubId];
    descB = dosC ? [tB[9].clubId, tB[8].clubId] : [tB[9].clubId];
    for (const pc of pcs) {
      if (pc.winner === pc.bTeam) {
        ascC.push(pc.bTeam);
        descB.push(pc.aTeam);
      }
      repechajes.push({ cual: 'C', primera: pc.aTeam, ascenso: pc.bTeam, ganador: pc.winner!, global: glob(pc) });
    }
    const pc = pcs[0];
    promocionC = { primera: pc.aTeam, ascenso: pc.bTeam, ganador: pc.winner!, global: glob(pc) };
  }
  const user = g.clubs[g.userClubId];
  const table = standings(g, user.division);
  const scorersA = Object.values(g.players)
    .filter((p) => p.clubId && g.clubs[p.clubId].division === 'A')
    .sort((a, b) => b.temporada.tries - a.temporada.tries);
  const top = scorersA[0];
  const copaFinal = g.fixtures.find((f) => f.comp === 'COPA' && f.etapa === 3 && f.result);
  const intlFinal = g.fixtures.find((f) => f.comp === 'INTL' && f.etapa === 3 && f.result);
  const intlCampeon = intlFinal ? g.clubs[matchWinner(intlFinal) ?? intlFinal.home] : null;
  const rec: SeasonRecord = {
    campeonCopa: copaFinal ? matchWinner(copaFinal) ?? undefined : undefined,
    campeonIntl: intlCampeon ? `${intlCampeon.nombre}${intlCampeon.pais ? ` (${intlCampeon.pais})` : ''}` : undefined,
    temporada: g.temporada,
    campeonA: campeon,
    subcampeonA: sub,
    campeonB: tB[0].clubId,
    asciende,
    desciende,
    campeonC,
    ascC,
    descB,
    promocionC,
    repechajes,
    promocion: {
      primera: promo.aTeam,
      ascenso: promo.bTeam,
      ganador: promo.winner!,
      global: `${g.clubs[promo.aTeam].corto} ${promo.ptsA} - ${promo.ptsB} ${g.clubs[promo.bTeam].corto}`,
    },
    maxTrymanA: top ? { playerId: top.id, nombre: `${top.nombre} ${top.apellido}`, clubId: top.clubId!, tries: top.temporada.tries } : undefined,
    posicionUsuario: { division: user.division, puesto: table.findIndex((r) => r.clubId === user.id) + 1 },
  };
  g.history.push(rec);
  pagarPremiosTemporada(g, rec);
  seasonRecords(g);
  const premios = premiosTemporada(g);
  if (premios.length) addNews(g, '🏆 Premios de la temporada', premios.map((x) => `${x.premio}: ${x.nombre} (${g.clubs[x.clubId]?.corto ?? ''})`).join('. ') + '.');
  closeCareerSeason(g, rec, rng);
  addNews(
    g,
    `¡${g.clubs[campeon].nombre} campeón!`,
    `${g.clubs[campeon].nombre} le ganó la final a ${g.clubs[sub].nombre} y es campeón de Primera A ${g.temporada}. ` +
      `Ascienden a Primera A: ${asciende.map((id) => g.clubs[id].nombre).join(' y ')}. Descienden: ${desciende.map((id) => g.clubs[id].nombre).join(' y ')}.` +
      (ascC ? ` De la C a la B suben ${ascC.map((id) => g.clubs[id].nombre).join(' y ')}; bajan ${descB!.map((id) => g.clubs[id].nombre).join(' y ')}.` : ''),
  );
}

/** Empieza la temporada siguiente: ascensos, edad, progresión, retiros y juveniles. */
export function startNextSeason(g: GameState): string[] {
  if (g.phase !== 'fin') throw new Error('La temporada no terminó');
  if (g.career?.despedido) throw new Error('Primero elegí un club nuevo');
  const rng = new Rng(g.rng);
  quitarExtranjeros(g);
  const rec = g.history[g.history.length - 1];
  for (const id of rec.desciende) g.clubs[id].division = 'B';
  for (const id of rec.descB ?? []) g.clubs[id].division = 'C';
  for (const id of rec.ascC ?? []) g.clubs[id].division = 'B';
  for (const id of rec.asciende) g.clubs[id].division = 'A';
  const informes: string[] = [];
  const europa: string[] = [];
  const user = g.clubs[g.userClubId];
  // Así terminó cada uno la temporada (para su ficha).
  for (const p of Object.values(g.players)) {
    if (!p.clubId) continue;
    p.historia = [...(p.historia ?? []), { temporada: g.temporada, ovr: overall(p), partidos: p.temporada.partidos, tries: p.temporada.tries, clubId: p.prestamo ? p.prestamo.clubId : p.clubId }].slice(-12);
  }
  const vuelven = returnLoans(g);
  if (vuelven.length) informes.push(`Préstamos: ${vuelven.join(', ')}.`);

  for (const c of Object.values(g.clubs)) {
    // Reputación según el resultado.
    if (rec.asciende.includes(c.id) || rec.ascC?.includes(c.id)) c.reputacion += 2;
    if (rec.desciende.includes(c.id) || rec.descB?.includes(c.id)) c.reputacion -= 2;
    if (c.id === rec.campeonA) c.reputacion += 1;
    c.reputacion = clamp(c.reputacion, 45, 82);

    const retirados: Player[] = [];
    for (const id of [...c.plantel]) {
      const p = g.players[id];
      p.edad++;
      developPlayer(p, rng);
      p.temporada = { partidos: 0, tries: 0, puntos: 0 };
      p.energia = 100;
      p.lesion = 0;
      p.ovrInicio = overall(p);
      p.attrsInicio = { ...p.attrs };
      p.moral = clamp(Math.round((p.moral + 62) / 2), 30, 90);
      const retireP = p.estrella && p.edad < 37 ? 0 : p.edad >= 36 ? 0.85 : p.edad >= 34 ? 0.45 : p.edad >= 32 ? 0.15 : 0;
      if (rng.chance(retireP)) retirados.push(p);
    }
    for (const p of retirados) {
      c.plantel = c.plantel.filter((x) => x !== p.id);
      p.clubId = null;
      delete g.players[p.id];
    }
    // Las figuras de los clubes de la computadora a veces se van a jugar a Europa (así ningún club acapara todo).
    if (c.id !== user.id) {
      const prom = teamAverage(c, g.players);
      for (const id of [...c.plantel]) {
        const p = g.players[id];
        if (overall(p) >= 84 && p.edad >= 23 && p.edad <= 31 && rng.chance(prom > 82 ? 0.4 : 0.15)) {
          c.plantel = c.plantel.filter((x) => x !== id);
          c.xv = c.xv.map((x) => (x === id ? null : x));
          europa.push(`${p.nombre} ${p.apellido} (${c.corto})`);
          delete g.players[id];
        }
      }
    }
    const count = (pos: Pos) => c.plantel.filter((id) => g.players[id].pos === pos).length;
    // Contratos: se descuenta un año. Los de la computadora renuevan; los tuyos se van si no renovaste.
    const libres: Player[] = [];
    for (const id of [...c.plantel]) {
      const p = g.players[id];
      p.contrato = (p.contrato ?? 1) - 1;
      if (p.contrato > 0) continue;
      // La estrella de la ayuda inicial renueva sola: se va solo si la vendés vos.
      if (p.estrella) {
        p.contrato = 4;
        continue;
      }
      if (c.id === user.id && count(p.pos) > MIN_BY_POS[p.pos]) {
        libres.push(p);
        c.plantel = c.plantel.filter((x) => x !== id);
        c.xv = c.xv.map((x) => (x === id ? null : x));
        p.clubId = null;
        g.libres.push(id);
      } else {
        p.contrato = rng.int(1, 3);
        p.sueldo = wageFor(p);
      }
    }
    // Juveniles: al menos 2 por temporada, y los que hagan falta por puesto.
    const juveniles: Player[] = [];
    for (const pos of POS_ORDER) {
      while (count(pos) < MIN_BY_POS[pos]) juveniles.push(addYouth(g, rng, c, pos));
    }
    while (juveniles.length < 2 || c.plantel.length < 28) juveniles.push(addYouth(g, rng, c, rng.pick(POS_ORDER)));
    // Si el plantel queda muy grande, se van los más flojos y veteranos.
    while (c.plantel.length > 33) {
      const sorted = c.plantel.map((id) => g.players[id]).sort((a, b) => overall(a) - a.edad * 0.3 - (overall(b) - b.edad * 0.3));
      const out = sorted.find((p) => count(p.pos) > MIN_BY_POS[p.pos]) ?? sorted[0];
      c.plantel = c.plantel.filter((x) => x !== out.id);
      // Queda libre: otro club (o vos) lo puede fichar.
      out.clubId = null;
      g.libres.push(out.id);
    }
    for (const id of c.plantel) g.players[id].ovrInicio = overall(g.players[id]);
    if (c.id !== user.id) c.presupuesto += sponsor(c.reputacion);
    c.xv = bestXV(c, g.players, c.id === user.id ? c.xv : []);
    if (c.id === user.id) {
      if (libres.length) informes.push(`Se fueron libres (no les renovaste): ${libres.map((p) => `${p.nombre} ${p.apellido}`).join(', ')}.`);
      if (retirados.length) informes.push(`Se retiraron: ${retirados.map((p) => `${p.nombre} ${p.apellido} (${p.edad})`).join(', ')}.`);
      informes.push(`Suben de la cantera: ${juveniles.map((p) => `${p.nombre} ${p.apellido} (${p.edad} años, ${p.pos})`).join(', ')}.`);
    }
  }

  for (const id of g.libres) {
    const p = g.players[id];
    if (!p) continue;
    p.edad++;
    developPlayer(p, rng);
    p.ovrInicio = overall(p);
    p.attrsInicio = { ...p.attrs };
    p.temporada = { partidos: 0, tries: 0, puntos: 0 };
  }
  // Socios según cómo terminó la temporada, y sponsors nuevos para elegir.
  const subio = rec.asciende.includes(user.id) || !!rec.ascC?.includes(user.id);
  const bajo = rec.desciende.includes(user.id) || !!rec.descB?.includes(user.id);
  const sociosF = rec.campeonA === user.id || subio ? 1.12 : bajo ? 0.88 : 1.02;
  user.socios = Math.round(user.socios * sociosF);
  user.sponsor = null;
  g.sponsorOfertas = sponsorOffers(user.reputacion, rng, user);
  refreshFreeAgents(g, rng);
  refreshTransferibles(g, rng);
  g.temporada++;
  pagarAyudaTemporada(g);
  g.round = 1;
  g.phase = 'regular';
  g.ultimasMejoras = [];
  g.fixtures = makeLeagueFixtures(g, rng);
  drawCup(g, rng);
  drawIntl(g, rng);
  scoutYouth(g, rng);
  startCareerSeason(g);
  if (g.amistosos) makePreseason(g, rng);
  g.rng = rng.s;
  addNews(g, `Arranca la temporada ${g.temporada}`, `${user.nombre} juega en ${DIV_NAME[user.division]}. ${informes.join(' ')}`);
  if (europa.length) addNews(g, 'Se van a Europa', `Clubes de afuera se llevaron a ${europa.join(', ')}.`);
  return informes;
}

function addYouth(g: GameState, rng: Rng, c: Club, pos: Pos): Player {
  const target = c.reputacion - 14 + rng.normal(0, 5);
  const p = addPlayer(g, rng, c, pos, target, rng.int(18, 19));
  p.potencial = Math.round(clamp(overall(p) + 8 + rng.normal(8, 6), overall(p) + 2, 92));
  return p;
}

/** Progresión anual: los jóvenes crecen hacia su potencial y los veteranos bajan. */
export function developPlayer(p: Player, rng: Rng) {
  const o = ratingAs(p.attrs, p.pos);
  let delta: number;
  if (p.edad <= 23) delta = Math.max(0, (p.potencial - o) * (0.15 + rng.next() * 0.15));
  else if (p.edad <= 27) delta = Math.max(-1, (p.potencial - o) * 0.2 + rng.normal(0, 1));
  else if (p.edad <= 30) delta = rng.normal(-0.3, 1.2);
  else if (p.edad <= 32) delta = rng.normal(-1.8, 1.2);
  else delta = rng.normal(-3.2, 1.5);
  for (const k of ATTR_KEYS) {
    let d = delta + rng.normal(0, 1);
    // Los veteranos pierden velocidad y físico primero, pero ganan liderazgo.
    if (delta < 0 && (k === 'velocidad' || k === 'resistencia')) d *= 1.4;
    if (k === 'liderazgo' && p.edad >= 27) d = Math.abs(d) * 0.4 + 0.3;
    // La actitud casi no cambia con la edad.
    if (k === 'actitud') d = rng.normal(0, 1.5);
    p.attrs[k] = Math.round(clamp(p.attrs[k] + d, 20, 99));
  }
  const now = Math.round(ratingAs(p.attrs, p.pos));
  if (now > p.potencial) p.potencial = now;
}

/** Actualiza partidas guardadas con versiones anteriores del juego. */
export function migrate(g: GameState): GameState {
  const orig = g.version ?? 1;
  if (orig < 19) {
    // Atributos nuevos (velocidad, penetración, pase... resistencia) y entrenamiento individual.
    // Va primero porque las migraciones de abajo ya calculan medias con los atributos nuevos.
    for (const p of Object.values(g.players)) {
      if (p.attrs) p.attrs = convertirAttrs(p.attrs as unknown as Record<string, number>, p.id);
      if (p.attrsInicio) p.attrsInicio = convertirAttrs(p.attrsInicio as unknown as Record<string, number>, p.id);
      p.entreno = planNuevo(p.entreno);
    }
    for (const c of Object.values(g.clubs)) if (c.entrenamiento) c.entrenamiento.foco = (planNuevo(c.entrenamiento.foco) ?? 'auto') as Club['entrenamiento']['foco'];
  }
  if ((g.version ?? 1) < 2) {
    const rng = new Rng(g.rng || 12345);
    for (const c of Object.values(g.clubs)) {
      c.presupuesto ??= presupuestoInicial(c.reputacion);
      c.entrenamiento ??= { foco: 'auto', intensidad: 'normal' };
    }
    for (const p of Object.values(g.players)) p.ovrInicio ??= overall(p);
    g.libres ??= [];
    g.caja ??= [];
    g.ultimasMejoras ??= [];
    refreshFreeAgents(g, rng);
    g.rng = rng.s;
    g.version = 2;
  }
  if (g.version < 3) {
    const rng = new Rng(g.rng || 777);
    for (const p of Object.values(g.players)) p.pos2 ??= rollSecondary(rng, p.pos);
    g.rng = rng.s;
    g.version = 3;
  }
  if (g.version < 4) {
    for (const p of Object.values(g.players)) {
      p.attrsInicio ??= { ...p.attrs };
      p.entreno ??= null;
      p.dorsal ??= 0;
    }
    for (const c of Object.values(g.clubs)) for (const id of c.plantel) assignDorsal(c, g.players, g.players[id]);
    g.version = 4;
  }
  if (g.version < 5) {
    g.modo = 'libre';
    g.career = newCareer(g);
    g.version = 5;
  }
  if (g.version < 6) {
    const rng = new Rng(g.rng || 4242);
    for (const p of Object.values(g.players)) {
      if (p.attrs.actitud === undefined) p.attrs.actitud = rollActitud(rng);
      if (p.attrsInicio && p.attrsInicio.actitud === undefined) p.attrsInicio.actitud = p.attrs.actitud;
    }
    g.rng = rng.s;
    g.version = 6;
  }
  if (g.version < 7) {
    // La plata pasa a pesos de verdad (x100), y llegan sueldos, socios, estadio y empleados.
    const rng = new Rng(g.rng || 9191);
    if (orig >= 2) {
      for (const c of Object.values(g.clubs)) c.presupuesto = Math.round(c.presupuesto * 100);
      for (const m of g.caja ?? []) m.monto = Math.round(m.monto * 100);
    }
    for (const p of Object.values(g.players)) {
      p.contrato ??= rng.int(1, 4);
      p.sueldo ??= 0;
    }
    for (const c of Object.values(g.clubs)) initClubBusiness(c);
    for (const p of Object.values(g.players)) if (!p.sueldo) p.sueldo = wageFor(p);
    g.sponsorOfertas = g.clubs[g.userClubId].sponsor ? [] : sponsorOffers(g.clubs[g.userClubId].reputacion, rng);
    g.rng = rng.s;
    g.version = 7;
  }
  if (g.version < 8) {
    const rng = new Rng(g.rng || 5151);
    for (const c of Object.values(g.clubs)) initClubBusiness(c);
    g.juveniles ??= [];
    if (g.phase === 'regular' && g.round <= 4 && !g.fixtures.some((f) => f.comp === 'COPA')) drawCup(g, rng);
    if (!g.juveniles.length) scoutYouth(g, rng);
    g.rng = rng.s;
    g.version = 8;
  }
  if (g.version < 10) g.ofertas ??= [];
  if (g.version < 18) {
    // Más nombres que eligió Luca (Club Atlético El Puerto, La Perla RC pasa a otro club).
    for (const c of Object.values(g.clubs)) {
      c.codigo ??= c.corto;
      const s = [...CLUB_SEEDS, ...CLUB_SEEDS_C].find((x) => x.codigo && x.codigo === c.codigo);
      if (s) Object.assign(c, { nombre: s.nombre, corto: s.corto, ciudad: s.ciudad });
    }
    if (g.version >= 17) g.version = 18;
  }
  if (g.version < 17) {
    // Camisetas nuevas (más cuadros y cuartos, Mataderos azul con banda blanca).
    for (const c of Object.values(g.clubs)) {
      c.codigo ??= c.corto;
      const s = [...CLUB_SEEDS, ...CLUB_SEEDS_C].find((x) => (x.codigo ?? x.corto) === c.codigo);
      if (s) Object.assign(c, { colores: s.colores, patron: s.patron });
    }
    if (g.version >= 15) g.version = 18;
  }
  if (g.version < 15) {
    // Nombres nuevos que eligió Luca (los clásicos siguen por el código interno).
    for (const c of Object.values(g.clubs)) {
      c.codigo ??= c.corto;
      const s = [...CLUB_SEEDS, ...CLUB_SEEDS_C].find((x) => x.codigo && x.codigo === c.codigo);
      if (s) Object.assign(c, { nombre: s.nombre, corto: s.corto, ciudad: s.ciudad });
    }
    if (g.version >= 13) g.version = 18;
  }
  if (g.version < 13) {
    // Pretemporada con amistosos: arranca en la próxima temporada.
    g.amistosos ??= true;
    if (g.version >= 12) g.version = 18;
  }
  if (g.version < 12) {
    // Luca les puso nombre nuevo a los clubes de Primera A (de la temporada 2027).
    for (const c of Object.values(g.clubs)) {
      c.codigo ??= c.corto;
      const s = CLUB_SEEDS.find((x) => x.codigo && x.codigo === c.codigo);
      if (s) Object.assign(c, { nombre: s.nombre, corto: s.corto, ciudad: s.ciudad, apodo: s.apodo });
    }
    if (g.version >= 11) g.version = 18;
  }
  if (g.version < 11) {
    // Llega la Primera C: diez clubes nuevos. Si la temporada ya arrancó, juegan desde la próxima.
    const rng = new Rng(g.rng || 777);
    for (const c of Object.values(g.clubs)) {
      c.codigo ??= c.corto;
    }
    if (!Object.values(g.clubs).some((c) => c.division === 'C')) {
      const base = Object.keys(g.clubs).length;
      const reps = rng.shuffle([57, 56, 55, 54, 53, 52, 51, 50, 49, 47]);
      CLUB_SEEDS_C.forEach((s, i) => addClub(g, rng, `c${base + i}`, s, reps[i]));
      const empezo = g.fixtures.some((f) => f.result) || g.phase !== 'regular' || g.round > 1;
      if (!empezo) {
        const nuevos = makeLeagueFixtures(g, rng).filter((f) => f.comp === 'C');
        g.fixtures.push(...nuevos);
      }
      addNews(g, 'Nace la Primera C', `Se suman diez clubes en una tercera categoría.${empezo ? ' Empiezan a jugar la temporada que viene.' : ''} Los dos primeros de la C suben a la B, y el 3.º y el 4.º juegan repechaje con el 8.º y el 7.º de la B.`);
    }
    g.rng = rng.s;
    if (g.version >= 9) g.version = 18;
  }
  if (g.version < 9) {
    g.records ??= {};
    for (const c of Object.values(g.clubs)) c.capitan ??= null;
    g.version = 18;
  }
  if (g.version < 19) {
    for (const p of Object.values(g.players)) {
      const o = overall(p);
      if (p.potencial < o) p.potencial = o;
    }
    g.ultimasMejoras = [];
    g.version = 19;
  }
  for (const p of Object.values(g.players)) p.energia = Math.round(p.energia);
  g.clubs[g.userClubId].hinchada ??= HINCHADA_INICIAL;
  // La estrella de la ayuda inicial tiene que estar en el XV mientras el cartel siga sin cerrar.
  completarXV(g.clubs[g.userClubId], g.players);
  const est = g.ayudaAviso?.playerId ? g.players[g.ayudaAviso.playerId] : undefined;
  if (est) {
    est.estrella = true;
    ponerEnXV(g, est.id);
  }
  return g;
}

/** Elegís el torneo amistoso de pretemporada. */
export function choosePreseason(g: GameState, i: number) {
  choosePre(g, i, () => newId(g, 'f'));
  const p = g.pretemporada!;
  addNews(g, 'Pretemporada', `Vas a jugar el ${p.propuestas[i].nombre}: tres amistosos para conocer al plantel antes de la liga.`);
}

/** Juega el próximo amistoso. No suma en la tabla ni en las estadísticas de la temporada. */
function playFriendly(g: GameState, userResult?: MatchResult): RoundReport {
  const p = g.pretemporada!;
  if (p.elegida === null) throw new Error('Primero elegí un torneo amistoso');
  const f = nextFriendly(g)!;
  const rng = new Rng(g.rng);
  prepareLineups(g);
  const home = g.clubs[f.home];
  const away = g.clubs[f.away];
  const hx = readyXV(home, g.players);
  const ax = readyXV(away, g.players);
  const res =
    userResult ??
    simulateMatch({ home, away, homeXV: hx.xv, awayXV: ax.xv, players: g.players, neutral: false, detailed: true, clima: climaDe(f, g.temporada) }, rng);
  f.result = res;
  const me = g.userClubId;
  for (const id of res.jugaron) {
    const pl = g.players[id];
    if (!pl) continue;
    const share = res.minutos ? clamp((res.minutos[id] ?? 0) / 80, 0.15, 1) : 1;
    pl.energia = Math.round(clamp(pl.energia - (22 - pl.attrs.resistencia / 10) * share, 5, 100));
  }
  // En los amistosos se cuida a los jugadores: las lesiones duran la mitad.
  for (const l of res.lesionados) {
    const pl = g.players[l.playerId];
    if (pl) {
      pl.lesion = Math.max(pl.lesion, Math.ceil(l.semanas / 2));
      pl.lesionTipo = lesionNombre(pl.lesion, pl.id + f.id);
    }
  }
  const w = matchWinner({ ...f, comp: 'A' });
  const prop = p.propuestas[p.elegida];
  const delta = w === null ? 0 : w === me ? (prop.tipo === 'gira' ? 4 : 3) : prop.tipo === 'fuerte' ? -3 : -2;
  for (const id of g.clubs[me].plantel) g.players[id].moral = clamp(g.players[id].moral + delta, 20, 100);
  trainAll(g, rng);
  weeklyRecovery(g, [f], rng);
  if (p.partidos.every((x) => x.result)) {
    p.terminada = true;
    const user = g.clubs[me];
    user.presupuesto += prop.premio;
    logMoney(g, `Premio del ${prop.nombre}`, prop.premio);
    const ganados = p.partidos.filter((x) => matchWinner({ ...x, comp: 'A' }) === me).length;
    const perdidos = p.partidos.filter((x) => {
      const ww = matchWinner({ ...x, comp: 'A' });
      return ww !== null && ww !== me;
    }).length;
    addNews(
      g,
      ganados === 3 ? `¡Ganaste el ${prop.nombre}!` : 'Terminó la pretemporada',
      `Ganaste ${ganados}, empataste ${3 - ganados - perdidos} y perdiste ${perdidos} en el ${prop.nombre}. Cobraste el premio. Ahora sí: ¡arranca la liga!`,
    );
  }
  g.rng = rng.s;
  return { round: g.round, fixtures: [f], userFixture: f, autoCambios: f.home === me ? hx.cambios : ax.cambios };
}
