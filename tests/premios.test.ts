import { describe, it, expect } from 'vitest';
import { AYUDA_TEMPORADA, PREMIOS_LIGA, createGame, playRound, startNextSeason } from '../src/engine/game';
import { gastosFecha, signSponsor, sponsorOffers } from '../src/engine/club';
import { Rng } from '../src/engine/rng';

describe('premios, ayuda de la federación y sponsors con regalos', () => {
  it('el campeón cobra más que el que asciende, y todos cobran la ayuda al empezar', () => {
    expect(PREMIOS_LIGA.campeonA).toBeGreaterThan(PREMIOS_LIGA.campeonB);
    expect(PREMIOS_LIGA.campeonB).toBeGreaterThan(PREMIOS_LIGA.ascensoDirecto);
    expect(PREMIOS_LIGA.ascensoDirecto).toBeGreaterThan(PREMIOS_LIGA.ascensoRepechaje);
    const g = createGame({ seed: 21, userClubIndex: 0 });
    while (g.phase !== 'fin') playRound(g);
    const rec = g.history[0];
    const campeon = g.clubs[rec.campeonA];
    const user = g.clubs[g.userClubId];
    const fede = g.caja.filter((m) => m.concepto.startsWith('Federación'));
    if (rec.campeonA === user.id || rec.subcampeonA === user.id) expect(fede.length).toBe(1);
    const antes = campeon.presupuesto;
    startNextSeason(g);
    // El campeón sigue en la A y cobra la ayuda de la A (más lo que gane o gaste en el cambio de temporada).
    expect(g.caja.some((m) => m.concepto.startsWith('Ayuda de la federación'))).toBe(true);
    expect(campeon.presupuesto).toBeGreaterThan(antes - 50_000_000);
    expect(AYUDA_TEMPORADA.A).toBeGreaterThan(AYUDA_TEMPORADA.C);
  });

  it('hay sponsors que regalan una obra, pagan los empleados o dan premio por título', () => {
    const g = createGame({ seed: 22, userClubIndex: 3 });
    const c = g.clubs[g.userClubId];
    const vistos = new Set<string>();
    for (let s = 1; s < 40; s++) for (const o of sponsorOffers(c.reputacion, new Rng(s), c)) if (o.extra) vistos.add(o.extra.tipo);
    expect([...vistos].sort()).toEqual(['obra', 'socios', 'sueldos', 'titulo']);
    // Sponsor que paga los sueldos de los empleados.
    let seed = 1;
    let ofs = sponsorOffers(c.reputacion, new Rng(seed), c);
    while (!ofs.some((o) => o.extra?.tipo === 'sueldos')) ofs = sponsorOffers(c.reputacion, new Rng(++seed), c);
    g.sponsorOfertas = ofs;
    signSponsor(g, ofs.findIndex((o) => o.extra?.tipo === 'sueldos'));
    expect(gastosFecha(g, c).empleados).toBe(0);
    // Sponsor que regala una obra.
    c.sponsor = null;
    ofs = sponsorOffers(c.reputacion, new Rng(seed), c);
    while (!ofs.some((o) => o.extra?.tipo === 'obra')) ofs = sponsorOffers(c.reputacion, new Rng(++seed), c);
    g.sponsorOfertas = ofs;
    const obras = c.obras.length;
    const plata = c.presupuesto;
    const i = ofs.findIndex((o) => o.extra?.tipo === 'obra');
    signSponsor(g, i);
    expect(c.obras.length).toBe(obras + 1);
    expect(c.presupuesto).toBe(plata + ofs[i].fijo);
  });
});
