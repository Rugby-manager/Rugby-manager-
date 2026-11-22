import { Rng } from './rng';
import { assignDorsal, marketValue, overall, completarXV } from './players';
import { MAX_SQUAD, canSell, logMoney, marketOpen } from './market';
import type { GameState, Oferta } from './types';
import { canLoanOut, loanOut, pagoCesion } from './loans';

/** Cuántas fechas dura una oferta antes de que el otro club se canse de esperar. */
export const OFERTA_FECHAS = 2;

const redondo = (v: number) => Math.round(v / 100_000) * 100_000;

/** Ofertas que siguen en pie (del jugador que todavía es tuyo y del club que todavía tiene la plata). */
export function ofertasVigentes(g: GameState): Oferta[] {
  return (g.ofertas ?? []).filter((o) => g.players[o.playerId]?.clubId === g.userClubId && (o.exterior || g.clubs[o.clubId]) && g.round - o.fecha <= OFERTA_FECHAS);
}

/** Clubes de afuera (inventados) que se llevan a las figuras. */
export const EUROPA = ['Racing Montclair (Francia)', 'Stade de Valbonne (Francia)', 'Harrowgate RFC (Inglaterra)', 'Kingsbridge Warriors (Inglaterra)', 'Rovereto Rugby (Italia)', 'Aurora Tokio (Japón)'];

export const nombreOfertante = (g: GameState, o: Oferta) => o.exterior ?? g.clubs[o.clubId]?.nombre ?? 'Un club';

/** Después de cada fecha, otros clubes pueden ofertar por tus jugadores. */
export function generateOffers(g: GameState, rng: Rng): Oferta[] {
  g.ofertas = ofertasVigentes(g);
  if (!marketOpen(g) || g.phase !== 'regular' || g.career?.despedido) return [];
  const user = g.clubs[g.userClubId];
  const nuevas: Oferta[] = [];
  const hayTransf = user.plantel.some((id) => g.players[id]?.transferible);
  const cuantas = rng.chance(hayTransf ? 0.7 : 0.45) ? (rng.chance(0.3) ? 2 : 1) : 0;
  for (let k = 0; k < cuantas; k++) {
    const ya = new Set(g.ofertas.map((o) => o.playerId));
    const cand = user.plantel.map((id) => g.players[id]).filter((p) => p && !ya.has(p.id) && p.lesion === 0 && !p.prestamo && !p.estrella);
    if (!cand.length) break;
    // Los buenos, los que andan en racha y los que pusiste transferibles llaman la atención.
    const p = rng.weighted(cand, cand.map((x) => (Math.max(1, overall(x) - 58) ** 2 + x.temporada.tries * 6 + (x.edad <= 23 ? 20 : 0)) * (x.transferible ? 5 : 1)));
    const valor = marketValue(p);
    const monto = redondo(valor * (0.85 + rng.next() * 0.4));
    const compradores = Object.values(g.clubs).filter((c) => c.id !== user.id && c.division !== 'X' && c.plantel.length < MAX_SQUAD && c.presupuesto >= monto);
    if (!compradores.length) continue;
    const c = rng.weighted(
      compradores,
      compradores.map((x) => Math.max(1, x.reputacion - 50) / (1 + x.plantel.filter((id) => g.players[id].pos === p.pos).length)),
    );
    const o: Oferta = {
      id: `o${g.nextId++}`,
      playerId: p.id,
      clubId: c.id,
      monto,
      max: redondo(monto * (1.08 + rng.next() * 0.25)),
      fecha: g.round,
      contra: false,
    };
    g.ofertas.push(o);
    nuevas.push(o);
  }
  // Pedidos de préstamo: sobre todo por los que pusiste en la lista, a veces por pibes que no juegan.
  {
    const ya = new Set(g.ofertas.map((o) => o.playerId));
    const xv = new Set(user.xv);
    const cand = user.plantel
      .map((id) => g.players[id])
      .filter((p) => p && !ya.has(p.id) && !p.prestamo && !p.estrella && p.lesion === 0 && canLoanOut(g, p.id).ok)
      .filter((p) => p.listaPrestamo || (!xv.has(p.id) && p.edad <= 23));
    const enLista = cand.filter((p) => p.listaPrestamo);
    const pool = enLista.length && rng.chance(0.55) ? enLista : rng.chance(0.08) ? cand.filter((p) => !p.listaPrestamo) : [];
    if (pool.length) {
      const p = rng.pick(pool);
      const clubes = Object.values(g.clubs).filter((c) => c.id !== user.id && c.division !== 'X' && c.plantel.length < MAX_SQUAD && c.reputacion <= user.reputacion + 6);
      if (clubes.length) {
        const c = rng.weighted(clubes, clubes.map((x) => 1 / (1 + x.plantel.filter((id) => g.players[id].pos === p.pos).length)));
        const anios = p.edad <= 24 && rng.chance(0.45) ? 2 : 1;
        const monto = pagoCesion(p, anios);
        const o: Oferta = { id: `o${g.nextId++}`, playerId: p.id, clubId: c.id, monto, max: monto, fecha: g.round, contra: true, prestamo: anios };
        g.ofertas.push(o);
        nuevas.push(o);
      }
    }
  }
  // A las figuras las tientan de Europa: pagan mucho, y si no lo dejás ir se pone mal.
  if (rng.chance(0.12)) {
    const ya = new Set(g.ofertas.map((o) => o.playerId));
    const figuras = user.plantel.map((id) => g.players[id]).filter((p) => p && !ya.has(p.id) && !p.prestamo && !p.estrella && overall(p) >= 80 && p.edad >= 22 && p.edad <= 31);
    if (figuras.length) {
      const p = rng.weighted(figuras, figuras.map((x) => (overall(x) - 78) ** 2));
      const monto = redondo(marketValue(p) * (1.15 + rng.next() * 0.35));
      const o: Oferta = { id: `o${g.nextId++}`, playerId: p.id, clubId: '', exterior: rng.pick(EUROPA), monto, max: redondo(monto * (1.05 + rng.next() * 0.15)), fecha: g.round, contra: false };
      g.ofertas.push(o);
      nuevas.push(o);
    }
  }
  return nuevas;
}

function take(g: GameState, id: string) {
  const o = (g.ofertas ?? []).find((x) => x.id === id);
  if (!o) throw new Error('Esa oferta ya no está.');
  return o;
}

/** Aceptás: el jugador se va y entra la plata. */
export function acceptOffer(g: GameState, id: string): string {
  const o = take(g, id);
  if (o.prestamo) {
    const r = loanOut(g, o.playerId, new Rng(g.nextId), o.prestamo, o.clubId, o.monto);
    g.ofertas = (g.ofertas ?? []).filter((x) => x.playerId !== o.playerId);
    return r;
  }
  const chk = canSell(g, o.playerId);
  if (!chk.ok) throw new Error(chk.reason);
  const p = g.players[o.playerId];
  const user = g.clubs[g.userClubId];
  if (o.exterior) {
    user.plantel = user.plantel.filter((x) => x !== p.id);
    user.xv = user.xv.map((x) => (x === p.id ? null : x));
    completarXV(user, g.players);
    if (user.capitan === p.id) user.capitan = null;
    user.presupuesto += o.monto;
    g.ofertas = g.ofertas!.filter((x) => x.playerId !== p.id);
    logMoney(g, `Venta de ${p.nombre} ${p.apellido} a ${o.exterior}`, o.monto);
    delete g.players[p.id];
    return `${p.nombre} ${p.apellido} se va a jugar a ${o.exterior}. ¡Suerte allá!`;
  }
  const buyer = g.clubs[o.clubId];
  if (buyer.presupuesto < o.monto) {
    g.ofertas = g.ofertas!.filter((x) => x.id !== id);
    throw new Error(`${buyer.nombre} ya no tiene la plata y retiró la oferta.`);
  }
  user.plantel = user.plantel.filter((x) => x !== p.id);
  user.xv = user.xv.map((x) => (x === p.id ? null : x));
  completarXV(user, g.players);
  if (user.capitan === p.id) user.capitan = null;
  buyer.plantel.push(p.id);
  buyer.presupuesto -= o.monto;
  user.presupuesto += o.monto;
  p.clubId = buyer.id;
  p.entreno = null;
  assignDorsal(buyer, g.players, p);
  g.ofertas = g.ofertas!.filter((x) => x.playerId !== p.id);
  logMoney(g, `Venta de ${p.nombre} ${p.apellido} (${buyer.corto})`, o.monto);
  return `Vendiste a ${p.nombre} ${p.apellido} a ${buyer.nombre}.`;
}

export function rejectOffer(g: GameState, id: string): string {
  const o = take(g, id);
  g.ofertas = g.ofertas!.filter((x) => x.id !== id);
  if (o.exterior) {
    const p = g.players[o.playerId];
    p.moral = Math.max(20, p.moral - 15);
    return `Rechazaste la oferta de ${o.exterior}. ${p.apellido} quería irse: está bajoneado.`;
  }
  return `Rechazaste la oferta de ${g.clubs[o.clubId].nombre}.`;
}

/**
 * Pedís más plata. Si está dentro de lo que pueden pagar, aceptan; si te pasás un poco,
 * te hacen una última oferta; si te pasás mucho, se levantan de la mesa. Una sola vez por oferta.
 */
export function counterOffer(g: GameState, id: string, pedido: number): { ok: boolean; texto: string } {
  const o = take(g, id);
  if (o.contra) throw new Error('Ya les pediste más: ahora es aceptar o rechazar.');
  const club = { nombre: nombreOfertante(g, o) };
  o.contra = true;
  if (pedido <= o.max) {
    o.monto = Math.max(o.monto, redondo(pedido));
    return { ok: true, texto: `${club.nombre} acepta pagar lo que pedís. Si confirmás, se cierra la venta.` };
  }
  if (pedido <= o.max * 1.15) {
    o.monto = o.max;
    return { ok: true, texto: `${club.nombre} dice que es mucho, pero sube la oferta. Es su última palabra.` };
  }
  g.ofertas = g.ofertas!.filter((x) => x.id !== id);
  return { ok: false, texto: `${club.nombre} se ofendió con lo que pediste y retiró la oferta.` };
}
