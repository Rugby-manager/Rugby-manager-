import { describe, it, expect } from 'vitest';
import { createGame, playRound, startNextSeason } from '../src/engine/game';
import { asistencia, build, candidatosStaff, contratarStaff, despedirStaff, renew, signSponsor } from '../src/engine/club';

describe('el club como negocio', () => {
  it('el sponsor paga al firmar', () => {
    const g = createGame({ seed: 31, modo: 'libre' });
    const c = g.clubs[g.userClubId];
    const before = c.presupuesto;
    const fijo = g.sponsorOfertas[0].fijo;
    signSponsor(g, 0);
    expect(c.presupuesto).toBe(before + fijo);
    expect(g.sponsorOfertas).toHaveLength(0);
  });

  it('más caro va menos gente', () => {
    const g = createGame({ seed: 32, modo: 'libre' });
    const c = g.clubs[g.userClubId];
    const r = Object.values(g.clubs).find((x) => x.id !== c.id)!;
    const barato = asistencia(g, c, r, false, 800);
    const caro = asistencia(g, c, r, false, 8000);
    expect(barato.total).toBeGreaterThan(caro.total);
    expect(barato.total).toBeLessThanOrEqual(barato.capacidad);
  });

  it('las obras terminan y suben el nivel', () => {
    const g = createGame({ seed: 33, modo: 'libre' });
    const c = g.clubs[g.userClubId];
    c.presupuesto = 1e9;
    const lvl = c.inst.gimnasio;
    build(g, 'gimnasio');
    for (let i = 0; i < 4; i++) playRound(g);
    expect(c.inst.gimnasio).toBe(lvl + 1);
    expect(c.obras).toHaveLength(0);
  });

  it('los empleados cobran sueldo cada fecha', () => {
    const g = createGame({ seed: 34, modo: 'libre' });
    const [mejor] = candidatosStaff(g, 'medico');
    contratarStaff(g, 'medico', mejor);
    playRound(g);
    expect(g.caja.some((m) => m.concepto === 'Sueldos de empleados' && m.monto < 0)).toBe(true);
  });

  it('los candidatos tienen de 1 a 5 estrellas y más estrellas rinden más', () => {
    const g = createGame({ seed: 36, modo: 'libre' });
    const cs = candidatosStaff(g, 'ayudante');
    expect(cs).toHaveLength(3);
    for (const x of cs) expect(x.estrellas >= 1 && x.estrellas <= 5).toBe(true);
    expect(candidatosStaff(g, 'ayudante')).toEqual(cs);
    const c = g.clubs[g.userClubId];
    contratarStaff(g, 'ayudante', { ...cs[0], estrellas: 5, prima: 0 });
    expect(c.staff.ayudante).toBe(3);
    contratarStaff(g, 'ayudante', { ...cs[0], estrellas: 1, prima: 0 });
    expect(c.staff.ayudante).toBeLessThan(1);
    despedirStaff(g, 'ayudante');
    expect(c.staff.ayudante).toBe(0);
    expect(c.staffPersonas?.ayudante).toBeUndefined();
  });

  it('si no renovás, el jugador se va libre al terminar la temporada', () => {
    const g = createGame({ seed: 35, modo: 'libre' });
    const c = g.clubs[g.userClubId];
    // Uno de un puesto donde sobran (si no, el club no lo puede dejar ir).
    const sobra = (id: string) => c.plantel.filter((x) => g.players[x].pos === g.players[id].pos).length >= 4;
    const [a, b] = c.plantel.filter((id) => g.players[id].edad < 30 && sobra(id)).map((id) => g.players[id]);
    a.contrato = 1;
    b.contrato = 1;
    // Que nadie de su puesto se retire, así sobra uno.
    for (const id of c.plantel) if (g.players[id].pos === a.pos) g.players[id].edad = Math.min(g.players[id].edad, 28);
    renew(g, b.id, 2);
    while (g.phase !== 'fin') playRound(g);
    startNextSeason(g);
    expect(c.plantel).not.toContain(a.id);
    expect(c.plantel).toContain(b.id);
    expect(g.players[b.id].contrato).toBe(2);
  });
});

describe('copa y juveniles', () => {
  it('la copa se juega entre semana y tiene un campeón', () => {
    const g = createGame({ seed: 41, modo: 'libre' });
    while (g.phase !== 'fin') playRound(g);
    const copa = g.fixtures.filter((f) => f.comp === 'COPA');
    expect(copa).toHaveLength(15);
    expect(copa.every((f) => f.result)).toBe(true);
    expect(g.history[g.history.length - 1].campeonCopa).toBeTruthy();
  });

  it('el ojeador trae juveniles que podés subir al plantel', async () => {
    const { promoteYouth } = await import('../src/engine/cup');
    const g = createGame({ seed: 42, modo: 'libre' });
    expect(g.juveniles.length).toBeGreaterThanOrEqual(2);
    const id = g.juveniles[0];
    promoteYouth(g, id);
    expect(g.clubs[g.userClubId].plantel).toContain(id);
    expect(g.players[id].edad).toBeLessThanOrEqual(18);
  });
});
