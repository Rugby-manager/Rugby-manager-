import { isDerby } from '../src/engine/extras';
import { describe, it, expect } from 'vitest';
import { createGame, playRound, startNextSeason, migrate } from '../src/engine/game';
import { buyPlayer, canBuy, canSell, freeAgents, sellPlayer, askingPrice, salePrice, MAX_SQUAD } from '../src/engine/market';
import { marketValue, overall } from '../src/engine/players';
import { trainClub } from '../src/engine/training';
import { Rng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';

describe('mercado de pases', () => {
  it('hay jugadores libres y los precios tienen sentido', () => {
    const g = createGame({ seed: 11 });
    expect(freeAgents(g).length).toBe(30);
    const p = Object.values(g.players).find((x) => x.clubId && overall(x) >= 68 && overall(x) <= 72)!;
    expect(marketValue(p)).toBeGreaterThan(20_000_000);
    expect(marketValue(p)).toBeLessThan(90_000_000);
    expect(salePrice(p)).toBeLessThan(askingPrice(p));
  });

  it('comprar descuenta la plata y pasa el jugador a tu club', () => {
    const g = createGame({ seed: 12, userClubIndex: 0 });
    const user = g.clubs[g.userClubId];
    const target = Object.values(g.players).find((p) => p.clubId && p.clubId !== user.id && canBuy(g, p.id).ok)!;
    const before = user.presupuesto;
    const price = askingPrice(target);
    const seller = g.clubs[target.clubId!];
    buyPlayer(g, target.id);
    expect(user.presupuesto).toBe(before - price);
    expect(user.plantel).toContain(target.id);
    expect(seller.plantel).not.toContain(target.id);
    expect(target.clubId).toBe(user.id);
  });

  it('no deja comprar sin plata ni con el plantel lleno', () => {
    const g = createGame({ seed: 13 });
    const user = g.clubs[g.userClubId];
    const target = freeAgents(g)[0];
    user.presupuesto = 0;
    expect(canBuy(g, target.id).ok).toBe(false);
    user.presupuesto = 1e9;
    while (user.plantel.length < MAX_SQUAD) user.plantel.push(user.plantel[0]);
    expect(canBuy(g, target.id).ok).toBe(false);
  });

  it('vender suma el 80% y otro club se lo lleva', () => {
    const g = createGame({ seed: 14 });
    const user = g.clubs[g.userClubId];
    const p = user.plantel.map((id) => g.players[id]).find((x) => canSell(g, x.id).ok)!;
    const before = user.presupuesto;
    const price = salePrice(p);
    sellPlayer(g, p.id, new Rng(1));
    expect(user.presupuesto).toBe(before + price);
    expect(user.plantel).not.toContain(p.id);
    expect(p.clubId).not.toBe(user.id);
  });

  it('no deja quedarse sin jugadores en un puesto', () => {
    const g = createGame({ seed: 15 });
    const user = g.clubs[g.userClubId];
    const hookers = user.plantel.filter((id) => g.players[id].pos === 'HOO');
    sellPlayer(g, hookers[0], new Rng(1));
    expect(canSell(g, hookers[1]).ok).toBe(false);
  });

  it('entran entradas y cuotas, y salen los sueldos', () => {
    const g = createGame({ seed: 16 });
    for (let i = 0; i < 4; i++) playRound(g);
    expect(g.caja.some((m) => m.concepto.startsWith('Entradas') && m.monto > 0)).toBe(true);
    expect(g.caja.some((m) => m.concepto.startsWith('Cuotas') && m.monto > 0)).toBe(true);
    expect(g.caja.some((m) => m.concepto.startsWith('Sueldos') && m.monto < 0)).toBe(true);
  });
});

describe('entrenamiento', () => {
  const season = (g: GameState) => {
    const s0 = g.clubs[g.userClubId].plantel.reduce((a, id) => a + overall(g.players[id]), 0);
    while (g.round <= 18) playRound(g);
    return g.clubs[g.userClubId].plantel.reduce((a, id) => a + overall(g.players[id]), 0) - s0;
  };

  it('entrenar mejora a los jugadores durante la temporada', () => {
    const g = createGame({ seed: 21 });
    expect(season(g)).toBeGreaterThan(5);
    expect(g.ultimasMejoras.length).toBeGreaterThan(0);
  });

  it('intenso mejora más que suave, y descanso no mejora', () => {
    const run = (int: 'suave' | 'intenso' | 'descanso') => {
      const g = createGame({ seed: 22 });
      g.clubs[g.userClubId].entrenamiento = { foco: 'auto', intensidad: int };
      const c = g.clubs[g.userClubId];
      let mejoras = 0;
      const rng = new Rng(5);
      for (let i = 0; i < 18; i++) mejoras += trainClub(c, g.players, rng).mejoras.length;
      return mejoras;
    };
    const suave = run('suave');
    const intenso = run('intenso');
    expect(intenso).toBeGreaterThan(suave * 1.5);
    expect(run('descanso')).toBe(0);
  });

  it('el foco elige qué atributos suben', () => {
    const g = createGame({ seed: 23 });
    const c = g.clubs[g.userClubId];
    c.entrenamiento = { foco: 'pateo', intensidad: 'intenso' };
    c.inst.gimnasio = 0; // el gimnasio suma físico aparte
    const rng = new Rng(9);
    const attrs = new Set<string>();
    for (let i = 0; i < 10; i++) trainClub(c, g.players, rng).mejoras.forEach((m) => attrs.add(m.attr));
    expect([...attrs].every((a) => a === 'precision' || a === 'potencia' || a === 'coordinacion')).toBe(true);
  });

  it('el plan individual de un jugador manda sobre el del equipo', () => {
    const g = createGame({ seed: 25 });
    const c = g.clubs[g.userClubId];
    c.entrenamiento = { foco: 'auto', intensidad: 'intenso' };
    c.inst.gimnasio = 0;
    const p = g.players[c.plantel.find((id) => g.players[id].edad <= 23 && g.players[id].potencial > 70) ?? c.plantel[0]];
    p.entreno = 'penetracion';
    p.potencial = 99;
    const antes = p.attrs.penetracion;
    const rng = new Rng(4);
    const mias = new Set<string>();
    for (let i = 0; i < 15; i++) trainClub(c, g.players, rng).mejoras.filter((m) => m.playerId === p.id).forEach((m) => mias.add(m.attr));
    expect([...mias]).toEqual(['penetracion']);
    expect(p.attrs.penetracion).toBeGreaterThan(antes);
  });

  it('los jóvenes mejoran más que los veteranos', () => {
    const g = createGame({ seed: 24 });
    const c = g.clubs[g.userClubId];
    const rng = new Rng(3);
    const count: Record<string, number> = {};
    for (let i = 0; i < 18; i++) trainClub(c, g.players, rng).mejoras.forEach((m) => (count[m.playerId] = (count[m.playerId] ?? 0) + 1));
    const avg = (f: (e: number) => boolean) => {
      const ps = c.plantel.map((id) => g.players[id]).filter((p) => f(p.edad));
      return ps.reduce((a, p) => a + (count[p.id] ?? 0), 0) / Math.max(1, ps.length);
    };
    expect(avg((e) => e <= 23)).toBeGreaterThan(avg((e) => e >= 30));
  });
});

describe('partidas viejas', () => {
  it('una partida de la versión 1 se actualiza sola', () => {
    const g = createGame({ seed: 30 });
    playRound(g);
    const old = JSON.parse(JSON.stringify(g));
    old.version = 1;
    delete old.libres;
    delete old.caja;
    delete old.ultimasMejoras;
    for (const c of Object.values(old.clubs) as any[]) {
      delete c.presupuesto;
      delete c.entrenamiento;
    }
    for (const p of Object.values(old.players) as any[]) delete p.ovrInicio;
    const m = migrate(old);
    expect(m.version).toBe(29);
    expect(m.libres.length).toBeGreaterThan(0);
    expect(m.clubs[m.userClubId].presupuesto).toBeGreaterThan(0);
    while (m.phase !== 'fin') playRound(m);
    startNextSeason(m);
    expect(m.temporada).toBe(2028);
  });

  it('una partida con dos categorías suma la Primera C la temporada siguiente', () => {
    const g = createGame({ seed: 34 });
    playRound(g);
    const old = JSON.parse(JSON.stringify(g));
    old.version = 10;
    // Antes de Galera RC, Uvita jugaba en la A: se arma la partida vieja como era.
    const uvi = (Object.values(old.clubs) as any[]).find((c) => c.codigo === 'CRN');
    const gal = (Object.values(old.clubs) as any[]).find((c) => c.codigo === 'MIS');
    uvi.division = 'A';
    gal.division = 'C';
    old.fixtures = old.fixtures.map((f: any) => (f.comp === 'C' ? f : { ...f, home: f.home === gal.id ? uvi.id : f.home, away: f.away === gal.id ? uvi.id : f.away }));
    for (const [id, c] of Object.entries(old.clubs) as [string, any][]) {
      if (c.division === 'C') {
        for (const pid of c.plantel) delete old.players[pid];
        delete old.clubs[id];
      }
    }
    old.fixtures = old.fixtures.filter((f: any) => f.comp !== 'C');
    const m = migrate(old);
    expect(m.version).toBe(29);
    expect(Object.values(m.clubs).filter((c) => c.division === 'C').length).toBe(10);
    expect(m.fixtures.some((f) => f.comp === 'C')).toBe(false);
    // Galera RC quedó en la A y Uvita bajó a la C.
    expect(Object.values(m.clubs).find((c) => c.codigo === 'MIS')!.division).toBe('A');
    expect(Object.values(m.clubs).find((c) => c.codigo === 'CRN')!.division).toBe('C');
    while (m.phase !== 'fin') playRound(m);
    expect(m.history[0].ascC).toBeUndefined();
    startNextSeason(m);
    expect(m.fixtures.filter((f) => f.comp === 'C').length).toBe(90);
  });

  it('los clubes de Primera A toman los nombres nuevos y siguen siendo clásicos', () => {
    const g = createGame({ seed: 36 });
    const old = JSON.parse(JSON.stringify(g));
    old.version = 11;
    Object.assign(old.clubs.c0, { nombre: 'Los Ñandúes RC', corto: 'ÑAN' });
    Object.assign(old.clubs.c4, { nombre: 'Sauce Bravo RC', corto: 'SAU' });
    delete old.clubs.c0.codigo;
    delete old.clubs.c4.codigo;
    const m = migrate(old);
    expect(m.version).toBe(29);
    expect(m.clubs.c0.nombre).toBe('Club Lobos de Mar');
    expect(m.clubs.c0.corto).toBe('LOB');
    expect(m.clubs.c4.nombre).toBe('Lagartos RC');
    expect(isDerby(m.clubs.c0, m.clubs.c4)).toBe(true);
  });
});

describe('reforzarse es más fácil', () => {
  it('un club nunca dice que no porque se queda corto: suma a otro jugador', () => {
    const g = createGame({ seed: 21, userClubIndex: 0 });
    const user = g.clubs[g.userClubId];
    user.presupuesto = 2_000_000_000;
    const seller = Object.values(g.clubs).find((c) => c.id !== user.id && c.division !== 'X')!;
    const pos = g.players[seller.plantel[0]].pos;
    const dePuesto = () => seller.plantel.filter((id) => g.players[id].pos === pos);
    const antes = dePuesto().length;
    for (let i = 0; i < antes; i++) {
      const id = dePuesto()[0];
      expect(canBuy(g, id).ok).toBe(true);
      buyPlayer(g, id);
      if (user.plantel.length >= MAX_SQUAD - 1) user.plantel.splice(0, 5);
    }
    expect(dePuesto().length).toBeGreaterThanOrEqual(2);
    expect(seller.plantel.length).toBeGreaterThanOrEqual(26);
  });

  it('no se puede comprar barato y revender caro en la misma temporada', () => {
    const g = createGame({ seed: 22, userClubIndex: 0 });
    const user = g.clubs[g.userClubId];
    user.presupuesto = 2_000_000_000;
    const t = Object.values(g.players).find((p) => p.clubId && p.clubId !== user.id && canBuy(g, p.id).ok)!;
    t.transferible = true;
    const pagado = askingPrice(t, g);
    buyPlayer(g, t.id);
    expect(salePrice(t, g)).toBeLessThanOrEqual(pagado);
  });

  it('siempre hay libres buenos', () => {
    const g = createGame({ seed: 23 });
    expect(freeAgents(g).filter((p) => overall(p) >= 72).length).toBeGreaterThanOrEqual(5);
  });
});
