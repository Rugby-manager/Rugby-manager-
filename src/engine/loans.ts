import { Rng, clamp } from './rng';
import { MIN_BY_POS, POS_LABEL, assignDorsal, marketValue, overall } from './players';
import { MAX_SQUAD, MIN_SQUAD, logMoney, marketOpen } from './market';
import type { Club, GameState, Player } from './types';

const r100k = (v: number) => Math.max(100_000, Math.round(v / 100_000) * 100_000);
const countPos = (g: GameState, c: Club, pos: Player['pos']) => c.plantel.filter((id) => g.players[id]?.pos === pos).length;

// ---------- Lista de transferibles ----------

/** Los clubes de la computadora ponen en venta a los que les sobran (más baratos que el resto). */
export function refreshTransferibles(g: GameState, rng: Rng) {
  for (const c of Object.values(g.clubs)) {
    if (c.id === g.userClubId || c.division === 'X') continue;
    const ps = c.plantel.map((id) => g.players[id]).filter((p) => p && !p.prestamo);
    for (const p of ps) p.transferible = false;
    const xv = new Set(c.xv);
    const cands = ps.filter((p) => !xv.has(p.id) && countPos(g, c, p.pos) > MIN_BY_POS[p.pos]);
    // Los veteranos y los que menos juegan primero.
    cands.sort((a, b) => (b.edad >= 31 ? 1 : 0) - (a.edad >= 31 ? 1 : 0) || overall(a) - overall(b));
    const n = Math.min(cands.length, rng.int(1, 3));
    for (const p of cands.slice(0, n)) p.transferible = true;
  }
}

export function transferibles(g: GameState): Player[] {
  return Object.values(g.players).filter((p) => p.transferible && p.clubId && p.clubId !== g.userClubId && !p.prestamo);
}

/** Marcás (o desmarcás) a uno de tus jugadores como transferible: te llegan más ofertas por él. */
export function toggleTransferible(g: GameState, id: string): string {
  const p = g.players[id];
  if (p.clubId !== g.userClubId || p.prestamo) throw new Error('No es tuyo.');
  p.transferible = !p.transferible;
  if (p.transferible) p.moral = clamp(p.moral - 4, 20, 100);
  return p.transferible ? `${p.apellido} está en la lista de transferibles. Le van a llegar más ofertas.` : `${p.apellido} salió de la lista de transferibles.`;
}

// ---------- Préstamos ----------

export const costoPrestamo = (p: Player) => r100k(marketValue(p) * 0.1);
export const pagoCesion = (p: Player) => r100k(marketValue(p) * 0.05);

/** Jugadores que los otros clubes prestan: los que no juegan en su XV. */
export function prestables(g: GameState): Player[] {
  return Object.values(g.players).filter((p) => {
    if (!p.clubId || p.clubId === g.userClubId || p.prestamo) return false;
    const c = g.clubs[p.clubId];
    if (c.division === 'X') return false;
    return !c.xv.includes(p.id) && countPos(g, c, p.pos) > MIN_BY_POS[p.pos];
  });
}

export function canLoanIn(g: GameState, id: string): { ok: boolean; reason?: string; price: number } {
  const p = g.players[id];
  const price = costoPrestamo(p);
  const user = g.clubs[g.userClubId];
  if (!marketOpen(g)) return { ok: false, reason: 'El mercado está cerrado durante los playoffs.', price };
  if (!p.clubId || p.clubId === user.id || p.prestamo) return { ok: false, reason: 'Ese jugador no está disponible a préstamo.', price };
  const c = g.clubs[p.clubId];
  if (c.xv.includes(p.id) || countPos(g, c, p.pos) <= MIN_BY_POS[p.pos]) return { ok: false, reason: `${c.nombre} no lo presta: lo necesita.`, price };
  if (user.plantel.length >= MAX_SQUAD) return { ok: false, reason: `Tu plantel está lleno (máximo ${MAX_SQUAD}).`, price };
  if (user.presupuesto < price + p.sueldo * 4) return { ok: false, reason: 'No te alcanza para el préstamo y su sueldo.', price };
  return { ok: true, price };
}

/** Te lo prestan hasta fin de temporada: pagás el préstamo y su sueldo. */
export function loanIn(g: GameState, id: string): string {
  const chk = canLoanIn(g, id);
  if (!chk.ok) throw new Error(chk.reason);
  const p = g.players[id];
  const user = g.clubs[g.userClubId];
  const from = g.clubs[p.clubId!];
  from.plantel = from.plantel.filter((x) => x !== id);
  from.presupuesto += chk.price;
  user.plantel.push(id);
  user.presupuesto -= chk.price;
  p.prestamo = { clubId: from.id, temporada: g.temporada };
  p.clubId = user.id;
  p.transferible = false;
  p.entreno = null;
  assignDorsal(user, g.players, p);
  logMoney(g, `Préstamo de ${p.nombre} ${p.apellido} (${from.corto})`, -chk.price);
  return `${p.nombre} ${p.apellido} llega a préstamo desde ${from.nombre} hasta fin de temporada.`;
}

export function canLoanOut(g: GameState, id: string): { ok: boolean; reason?: string; price: number } {
  const p = g.players[id];
  const price = pagoCesion(p);
  const user = g.clubs[g.userClubId];
  if (!marketOpen(g)) return { ok: false, reason: 'El mercado está cerrado durante los playoffs.', price };
  if (p.clubId !== user.id) return { ok: false, reason: 'No es de tu club.', price };
  if (p.prestamo) return { ok: false, reason: 'Ya está a préstamo en tu club: no lo podés ceder.', price };
  if (user.plantel.length <= MIN_SQUAD) return { ok: false, reason: `Necesitás al menos ${MIN_SQUAD} jugadores.`, price };
  if (countPos(g, user, p.pos) <= MIN_BY_POS[p.pos]) return { ok: false, reason: `Te quedarías con menos de ${MIN_BY_POS[p.pos]} ${POS_LABEL[p.pos].toLowerCase()}s.`, price };
  return { ok: true, price };
}

/** Lo cedés hasta fin de temporada: el otro club paga su sueldo y él suma minutos. */
export function loanOut(g: GameState, id: string, rng: Rng): string {
  const chk = canLoanOut(g, id);
  if (!chk.ok) throw new Error(chk.reason);
  const p = g.players[id];
  const user = g.clubs[g.userClubId];
  const dest = Object.values(g.clubs)
    .filter((c) => c.id !== user.id && c.division !== 'X' && c.plantel.length < MAX_SQUAD && c.reputacion <= user.reputacion + 2)
    .map((c) => ({ c, need: countPos(g, c, p.pos) + rng.next() }))
    .sort((a, b) => a.need - b.need)[0]?.c;
  if (!dest) throw new Error('Ningún club lo quiere a préstamo ahora.');
  user.plantel = user.plantel.filter((x) => x !== id);
  user.xv = user.xv.map((x) => (x === id ? null : x));
  if (user.capitan === id) user.capitan = null;
  dest.plantel.push(id);
  user.presupuesto += chk.price;
  p.prestamo = { clubId: user.id, temporada: g.temporada };
  p.clubId = dest.id;
  p.transferible = false;
  assignDorsal(dest, g.players, p);
  logMoney(g, `Cesión de ${p.nombre} ${p.apellido} a ${dest.corto}`, chk.price);
  return `Cediste a ${p.nombre} ${p.apellido} a ${dest.nombre} hasta fin de temporada. Allá va a sumar minutos.`;
}

/** Al terminar la temporada vuelven todos los prestados a su club. Los que jugaron seguido, vuelven mejores. */
export function returnLoans(g: GameState): string[] {
  const out: string[] = [];
  for (const p of Object.values(g.players)) {
    if (!p.prestamo) continue;
    const home = g.clubs[p.prestamo.clubId];
    const now = p.clubId ? g.clubs[p.clubId] : null;
    if (now) {
      now.plantel = now.plantel.filter((x) => x !== p.id);
      now.xv = now.xv.map((x) => (x === p.id ? null : x));
      if (now.capitan === p.id) now.capitan = null;
    }
    delete p.prestamo;
    if (!home) {
      p.clubId = null;
      g.libres.push(p.id);
      continue;
    }
    home.plantel.push(p.id);
    p.clubId = home.id;
    assignDorsal(home, g.players, p);
    if (home.id === g.userClubId) {
      // Jugar seguido en otro club lo hace crecer.
      if (p.temporada.partidos >= 6) {
        for (const k of ['velocidad', 'tackle', 'manejo', 'fisico'] as const) p.attrs[k] = Math.min(99, p.attrs[k] + 1);
      }
      out.push(`${p.apellido} vuelve de su préstamo${p.temporada.partidos >= 6 ? ' con más rodaje' : ''}`);
    } else if (now?.id === g.userClubId) {
      out.push(`${p.apellido} vuelve a ${home.nombre}`);
    }
  }
  return out;
}
