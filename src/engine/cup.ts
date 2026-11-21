import { Rng } from './rng';
import { POS_ORDER, assignDorsal, generatePlayer } from './players';
import type { Fixture, GameState, Player } from './types';
import { INTL_CHIP, INTL_ETAPA, INTL_NOMBRE, INTL_ROUNDS } from './internacional';

/** Copa por eliminación a mitad de semana, con los 10 de Primera A y los 6 más grandes de Primera B. */
export const COPA_NOMBRE = 'Copa del Ñandubay';
export const CUP_ROUNDS = [4.5, 8.5, 12.5, 16.5];
export const CUP_ETAPA = ['Octavos de final', 'Cuartos de final', 'Semifinal', 'Final'];
/** Premio para el usuario por pasar cada ronda (la última = campeón). */
export const CUP_PREMIO = [3_000_000, 5_000_000, 8_000_000, 20_000_000];

const fid = (g: GameState) => `f${(g.nextId++).toString(36)}`;

/** El de Primera B (o el más chico) juega de local. */
function pair(g: GameState, a: string, b: string, rng: Rng): [string, string] {
  const ca = g.clubs[a];
  const cb = g.clubs[b];
  if (ca.division !== cb.division) return ca.division === 'B' ? [a, b] : [b, a];
  return rng.chance(0.5) ? [a, b] : [b, a];
}

export function drawCup(g: GameState, rng: Rng) {
  const clubs = Object.values(g.clubs);
  const a = clubs.filter((c) => c.division === 'A').map((c) => c.id);
  const b = clubs.filter((c) => c.division === 'B').sort((x, y) => y.reputacion - x.reputacion).slice(0, 6).map((c) => c.id);
  const all = rng.shuffle([...a, ...b]);
  for (let i = 0; i < all.length; i += 2) {
    const [home, away] = pair(g, all[i], all[i + 1], rng);
    g.fixtures.push({ id: fid(g), round: CUP_ROUNDS[0], comp: 'COPA', etapa: 0, home, away });
  }
}

/** Después de una ronda de copa: arma la siguiente o corona al campeón. Devuelve el campeón si terminó. */
export function advanceCup(g: GameState, finished: number, rng: Rng, winner: (f: Fixture) => string | null): string | null {
  const ronda = g.fixtures.filter((f) => f.comp === 'COPA' && f.round === finished);
  if (!ronda.length) return null;
  const etapa = ronda[0].etapa ?? 0;
  const ganadores = ronda.map((f) => winner(f)!);
  const user = g.userClubId;
  const userFx = ronda.find((f) => f.home === user || f.away === user);
  if (userFx && winner(userFx) === user) {
    const premio = CUP_PREMIO[etapa];
    g.clubs[user].presupuesto += premio;
    g.caja.unshift({ temporada: g.temporada, round: g.round, concepto: `${COPA_NOMBRE}: premio por ${etapa === 3 ? 'salir campeón' : `ganar ${CUP_ETAPA[etapa].toLowerCase()}`}`, monto: premio });
  }
  if (etapa === 3) return ganadores[0];
  for (let i = 0; i < ganadores.length; i += 2) {
    const [home, away] = pair(g, ganadores[i], ganadores[i + 1], rng);
    g.fixtures.push({ id: fid(g), round: CUP_ROUNDS[etapa + 1], comp: 'COPA', etapa: etapa + 1, home, away });
  }
  return null;
}

export const isCupRound = (r: number) => !Number.isInteger(r);

/** Nombre de una fecha para mostrar. */
export function roundName(r: number) {
  if (INTL_ROUNDS.includes(r)) return `${INTL_NOMBRE} · ${INTL_ETAPA[INTL_ROUNDS.indexOf(r)]}`;
  if (isCupRound(r)) return `${COPA_NOMBRE} · ${CUP_ETAPA[CUP_ROUNDS.indexOf(r)] ?? ''}`;
  if (r <= 18) return `Fecha ${r} de 18`;
  return r === 19 ? 'Semifinales y promoción (ida)' : 'Final y promoción (vuelta)';
}

/** Nombre corto de una fecha para los botones del fixture. */
export function roundChip(r: number) {
  if (INTL_ROUNDS.includes(r)) return INTL_CHIP[INTL_ROUNDS.indexOf(r)];
  if (isCupRound(r)) return `Copa ${['8vos', '4tos', 'Semi', 'Final'][CUP_ROUNDS.indexOf(r)]}`;
  return r <= 18 ? `F${r}` : r === 19 ? 'Semis' : 'Final';
}

// ---------- Juveniles con ojeador ----------

/** El ojeador encuentra pibes de 16 a 18 años. Cuanto mejor el ojeador, más y mejores. */
export function scoutYouth(g: GameState, rng: Rng) {
  for (const id of g.juveniles ?? []) delete g.players[id];
  g.juveniles = [];
  const nivel = g.clubs[g.userClubId].staff.ojeador ?? 0;
  const n = 2 + nivel;
  for (let i = 0; i < n; i++) {
    const pos = rng.pick(POS_ORDER);
    const id = `p${(g.nextId++).toString(36)}`;
    const p: Player = generatePlayer(rng, id, pos, rng.normal(46 + nivel * 2, 4), rng.int(16, 18));
    // Un buen ojeador encuentra pibes con más techo.
    p.potencial = Math.min(94, Math.round(p.potencial + rng.int(0, 4) + nivel * 3));
    p.clubId = null;
    p.sueldo = 25_000;
    p.contrato = 3;
    g.players[id] = p;
    g.juveniles.push(id);
  }
}

/** Subís un juvenil al plantel. */
export function promoteYouth(g: GameState, id: string): string {
  const c = g.clubs[g.userClubId];
  if (!g.juveniles.includes(id)) throw new Error('Ese juvenil ya no está.');
  if (c.plantel.length >= 36) throw new Error('El plantel está lleno (máximo 36).');
  const p = g.players[id];
  g.juveniles = g.juveniles.filter((x) => x !== id);
  p.clubId = c.id;
  c.plantel.push(id);
  assignDorsal(c, g.players, p);
  return `${p.nombre} ${p.apellido} sube al plantel. ¡A romperla, pibe!`;
}

export function releaseYouth(g: GameState, id: string) {
  g.juveniles = g.juveniles.filter((x) => x !== id);
  delete g.players[id];
}
