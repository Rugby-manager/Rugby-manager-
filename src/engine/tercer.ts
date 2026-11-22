// Tercer tiempo: después de cada partido oficial, el club decide cómo se festeja (o no).
import { clamp } from './rng';
import { logMoney } from './market';
import { matchWinner } from './game';
import type { Fixture, GameState } from './types';

export interface OpcionTercer {
  id: 'asado' | 'chori' | 'nada' | 'compartir';
  texto: string;
  efecto: string;
}

const millones = (m: number) => `$${(m / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`;

/** El último partido oficial tuyo, si todavía no hiciste el tercer tiempo. */
export function tercerPendiente(g: GameState): Fixture | null {
  const me = g.userClubId;
  const f = [...g.fixtures].reverse().find((x) => x.result && x.comp !== 'AMISTOSO' && (x.home === me || x.away === me));
  if (!f || f.round < g.round - 1) return null;
  if (g.tercerTiempo?.fixtureId === f.id) return null;
  return f;
}

/** Lo que deja la choripaneada: depende de la gente y del quincho. */
export function plataChori(g: GameState) {
  const c = g.clubs[g.userClubId];
  return Math.round(((c.ultimaAsistencia ?? 0) * (150 + 150 * (c.inst?.quincho ?? 0))) / 10_000) * 10_000;
}

export function opcionesTercer(g: GameState, f: Fixture): OpcionTercer[] {
  if (f.home !== g.userClubId)
    return [
      { id: 'compartir', texto: 'Compartir con el rival', efecto: 'Cuesta $150.000. El plantel se integra (+3 de moral).' },
      { id: 'nada', texto: 'Directo al micro', efecto: 'No pasa nada.' },
    ];
  return [
    { id: 'asado', texto: 'Asado para los dos planteles', efecto: 'Cuesta $400.000. El plantel (+4 de moral) y la hinchada (+3) lo disfrutan.' },
    { id: 'chori', texto: 'Choripaneada para la gente', efecto: `Se venden choris y bebida: entran unos ${millones(plataChori(g))} y la hinchada suma +2.` },
    { id: 'nada', texto: 'Cada uno a su casa', efecto: 'No pasa nada.' },
  ];
}

export function hacerTercer(g: GameState, id: OpcionTercer['id']): string {
  const f = tercerPendiente(g);
  if (!f) throw new Error('No hay tercer tiempo pendiente.');
  g.tercerTiempo = { fixtureId: f.id };
  const c = g.clubs[g.userClubId];
  const gano = matchWinner(f) === c.id;
  const mov = (d: number) => {
    for (const pid of c.plantel) {
      const p = g.players[pid];
      if (p) p.moral = clamp(p.moral + d, 20, 100);
    }
  };
  const hin = (d: number) => {
    if (c.hinchada !== undefined) c.hinchada = clamp(c.hinchada + d, 0, 100);
  };
  if (id === 'asado') {
    c.presupuesto -= 400_000;
    logMoney(g, 'Tercer tiempo: asado', -400_000);
    mov(4);
    hin(3);
    return gano ? '¡Asado de campeones! El vestuario está unido.' : 'El asado ayudó a pasar el mal trago.';
  }
  if (id === 'chori') {
    const monto = plataChori(g);
    c.presupuesto += monto;
    if (monto) logMoney(g, 'Tercer tiempo: choripaneada', monto);
    hin(2);
    return `La choripaneada fue un éxito${monto ? `: entraron ${millones(monto)}` : ''}.`;
  }
  if (id === 'compartir') {
    c.presupuesto -= 150_000;
    logMoney(g, 'Tercer tiempo con el rival', -150_000);
    mov(3);
    return 'Buen tercer tiempo con el rival. Así es el rugby.';
  }
  return 'Cada uno a su casa.';
}
