import { fechasRestantes } from './club';
import { Rng, clamp } from './rng';
import { MIN_BY_POS, MIN_VENTA, POS_LABEL, POS_ORDER, assignDorsal, generatePlayer, marketValue, overall, wageFor, completarXV } from './players';
import type { Club, GameState, Player, Pos } from './types';

export const MAX_SQUAD = 36;
export const MIN_SQUAD = 23;
export const LIBRES = 30;

/** Lo que pide el club (o el jugador libre, como prima por firmar). */
export function askingPrice(p: Player, g?: GameState): number {
  const v = marketValue(p);
  // A un club chico le cobran menos: en la B un 10% menos, en la C un 25% menos.
  const div = g?.clubs[g.userClubId]?.division;
  const divF = div === 'C' ? 0.75 : div === 'B' ? 0.9 : 1;
  // Los clubes piden un 85% de lo que vale (los transferibles, un 65%); los libres, una prima del 20%.
  return p.clubId ? Math.round((v * (p.transferible ? 0.65 : 0.85) * divF) / 100_000) * 100_000 : Math.max(500_000, Math.round((v * 0.2 * divF) / 100_000) * 100_000);
}

/** En las categorías chicas los jugadores aceptan cobrar menos (A 100%, B 85%, C 70%). */
export function factorSueldo(g?: GameState): number {
  const div = g?.clubs[g.userClubId]?.division;
  return div === 'C' ? 0.7 : div === 'B' ? 0.85 : 1;
}

/** Lo que te pagan si vendés. Si lo compraste esta temporada, no te dan más de lo que pagaste (así no se puede comprar barato y revender). */
export function salePrice(p: Player, g?: GameState): number {
  let v = marketValue(p) * 0.8;
  if (p.compra && g && p.compra.temporada === g.temporada) v = Math.min(v, p.compra.precio);
  return Math.max(100_000, Math.round(v / 100_000) * 100_000);
}

export function marketOpen(g: GameState) {
  return g.phase !== 'playoffs';
}

const countPos = (g: GameState, clubId: string, pos: Pos) => g.clubs[clubId].plantel.filter((id) => g.players[id].pos === pos).length;

export function canBuy(g: GameState, id: string): { ok: boolean; reason?: string; price: number } {
  const p = g.players[id];
  const price = askingPrice(p, g);
  const user = g.clubs[g.userClubId];
  if (!marketOpen(g)) return { ok: false, reason: 'El mercado está cerrado durante los playoffs.', price };
  if (p.clubId === user.id) return { ok: false, reason: 'Ya es tuyo.', price };
  if (p.prestamo) return { ok: false, reason: 'Está a préstamo: no se puede comprar hasta fin de temporada.', price };
  if (user.plantel.length >= MAX_SQUAD) return { ok: false, reason: `Tu plantel está lleno (máximo ${MAX_SQUAD}). Vendé a alguien primero.`, price };
  if (user.presupuesto < price) return { ok: false, reason: 'No te alcanza el presupuesto.', price };
  if (user.presupuesto - price < signingWage(p, g) * fechasRestantes(g)) return { ok: false, reason: 'No te alcanza para el pase y su sueldo de lo que queda de la temporada.', price };
  // Si el club se queda corto, sube a un pibe o ficha a otro (ver reponer): nunca te dice que no por eso.
  return { ok: true, price };
}

export function buyPlayer(g: GameState, id: string): string {
  const chk = canBuy(g, id);
  if (!chk.ok) throw new Error(chk.reason);
  const p = g.players[id];
  const user = g.clubs[g.userClubId];
  const from = p.clubId ? g.clubs[p.clubId] : null;
  if (from) {
    from.plantel = from.plantel.filter((x) => x !== id);
    from.xv = from.xv.map((x) => (x === id ? null : x));
    from.presupuesto += chk.price;
    reponer(g, from, p.pos);
    completarXV(from, g.players);
  } else {
    g.libres = g.libres.filter((x) => x !== id);
  }
  p.clubId = user.id;
  p.moral = clamp(p.moral + 10, 0, 100);
  user.plantel.push(id);
  p.entreno = null;
  p.sueldo = signingWage(p, g);
  p.contrato = p.edad >= 32 ? 1 : p.edad <= 26 ? 3 : 2;
  p.compra = { temporada: g.temporada, precio: chk.price };
  assignDorsal(user, g.players, p);
  user.presupuesto -= chk.price;
  const nombre = `${p.nombre} ${p.apellido}`;
  logMoney(g, from ? `Compra de ${nombre} (${from.corto})` : `Fichaje de ${nombre} (libre)`, -chk.price);
  return from ? `Compraste a ${nombre} a ${from.nombre}.` : `Fichaste a ${nombre}, que estaba libre.`;
}

/** Cuando le comprás a un club y se queda corto en ese puesto (o con poca gente), suma un jugador nuevo un poco más flojo. */
export function reponer(g: GameState, c: Club, pos: Pos) {
  const rng = new Rng((g.nextId * 2654435761 + g.temporada * 97 + g.round) >>> 0);
  const add = (ps: Pos) => {
    const id = `p${(g.nextId++).toString(36)}`;
    const p = generatePlayer(rng, id, ps, c.reputacion - 8 + rng.normal(0, 4), rng.int(19, 30));
    p.clubId = c.id;
    g.players[id] = p;
    c.plantel.push(id);
    assignDorsal(c, g.players, p);
  };
  while (countPos(g, c.id, pos) < MIN_BY_POS[pos]) add(pos);
  while (c.plantel.length < 26) add(pos);
}

export function canSell(g: GameState, id: string): { ok: boolean; reason?: string; price: number } {
  const p = g.players[id];
  const price = salePrice(p, g);
  const user = g.clubs[g.userClubId];
  if (!marketOpen(g)) return { ok: false, reason: 'El mercado está cerrado durante los playoffs.', price };
  if (p.clubId !== user.id) return { ok: false, reason: 'No es de tu club.', price };
  if (p.prestamo) return { ok: false, reason: 'Está a préstamo en tu club: no lo podés vender.', price };
  if (user.plantel.length <= MIN_SQUAD) return { ok: false, reason: `Necesitás al menos ${MIN_SQUAD} jugadores.`, price };
  if (countPos(g, user.id, p.pos) <= MIN_VENTA)
    return { ok: false, reason: `Te quedarías con menos de ${MIN_VENTA} ${POS_LABEL[p.pos].toLowerCase()}s.`, price };
  return { ok: true, price };
}

export function sellPlayer(g: GameState, id: string, rng: Rng): string {
  const chk = canSell(g, id);
  if (!chk.ok) throw new Error(chk.reason);
  const p = g.players[id];
  const user = g.clubs[g.userClubId];
  user.plantel = user.plantel.filter((x) => x !== id);
  user.xv = user.xv.map((x) => (x === id ? null : x));
  completarXV(user, g.players);
  user.presupuesto += chk.price;
  // Lo compra el club al que más le falta ese puesto.
  const buyers = Object.values(g.clubs)
    .filter((c) => c.id !== user.id && c.division !== 'X' && c.plantel.length < 34)
    .map((c) => ({ c, need: countPos(g, c.id, p.pos) + rng.next() }))
    .sort((a, b) => a.need - b.need);
  const buyer = buyers[0]?.c;
  const nombre = `${p.nombre} ${p.apellido}`;
  if (buyer) {
    buyer.plantel.push(id);
    p.clubId = buyer.id;
    p.entreno = null;
    assignDorsal(buyer, g.players, p);
  } else {
    p.clubId = null;
    g.libres.push(id);
  }
  logMoney(g, `Venta de ${nombre}${buyer ? ` (${buyer.corto})` : ''}`, chk.price);
  return buyer ? `Vendiste a ${nombre} a ${buyer.nombre}.` : `Vendiste a ${nombre}.`;
}

/** Sueldo que pide para firmar con vos (los libres piden un poco más). */
export function signingWage(p: Player, g?: GameState) {
  return Math.round((wageFor(p) * (p.clubId ? 1 : 1.05) * factorSueldo(g)) / 1000) * 1000;
}

export function logMoney(g: GameState, concepto: string, monto: number) {
  g.caja.unshift({ temporada: g.temporada, round: g.round, concepto, monto });
  g.caja = g.caja.slice(0, 150);
}

/** Arma o renueva la lista de jugadores libres. */
export function refreshFreeAgents(g: GameState, rng: Rng) {
  // Algunos libres consiguen club por su cuenta y se van de la lista.
  g.libres = g.libres.filter((id) => {
    const p = g.players[id];
    if (!p) return false;
    if (p.edad >= 35 || rng.chance(0.45)) {
      delete g.players[id];
      return false;
    }
    return true;
  });
  // Siempre hay unos cuantos libres buenos (para reforzarse sin pagar un pase).
  const buenos = g.libres.filter((id) => overall(g.players[id]) >= 72).length;
  let faltanBuenos = Math.max(0, 6 - buenos);
  while (g.libres.length < LIBRES) {
    const pos = rng.pick(POS_ORDER);
    const id = `p${(g.nextId++).toString(36)}`;
    const nivel = faltanBuenos-- > 0 ? rng.normal(76, 4) : rng.normal(63, 7);
    const p = generatePlayer(rng, id, pos, nivel, rng.int(21, 32));
    p.clubId = null;
    g.players[id] = p;
    g.libres.push(id);
  }
}

export function freeAgents(g: GameState): Player[] {
  return g.libres.map((id) => g.players[id]).filter(Boolean).sort((a, b) => overall(b) - overall(a));
}

/** Plata por partido de local y sponsor por temporada. */
// La plata está en pesos: un jugador bueno vale decenas de millones.
export const taquilla = (rep: number, playoff: boolean) => Math.round(((rep - 40) * 250_000 * (playoff ? 1.6 : 1)) / 100_000) * 100_000;
export const sponsor = (rep: number) => Math.max(15_000_000, (rep - 45) * 2_000_000);
export const presupuestoInicial = (rep: number) => Math.max(30_000_000, (rep - 45) * 5_000_000);
