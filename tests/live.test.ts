import { describe, it, expect } from 'vitest';
import { createGame, playRound, startUserMatch, userFixture } from '../src/engine/game';

describe('partido en vivo', () => {
  it('para en el entretiempo, deja hacer cambios y decidir penales', () => {
    const g = createGame({ seed: 21, userClubIndex: 3, modo: 'libre' });
    const m = startUserMatch(g)!;
    const live = m.live;
    const side = m.fixture.home === g.userClubId ? 'H' : 'A';
    const me = live.side(side);
    // Cambio: sale la 1, entra el primer suplente.
    const benchId = me.bench[0].id;
    const outId = me.xv[0]!.id;
    expect(live.substitute(side, 0, benchId)).toBeNull();
    expect(me.xv[0]!.id).toBe(benchId);
    expect(me.salieron).toContain(outId);
    expect(live.substitute(side, 0, outId)).not.toBeNull(); // el que salió no vuelve
    let sawHalf = false;
    let penales = 0;
    for (let i = 0; i < 500 && !live.finished; i++) {
      live.step();
      if (live.pause?.kind === 'previa') {
        expect(live.talk(side, 'arenga')).not.toBeNull();
        expect(live.talk(side, 'exigir')).toBeNull(); // una charla por vez
        live.resume();
      } else if (live.pause?.kind === 'entretiempo') {
        sawHalf = true;
        live.setTactics(side, { ataque: 'abrir' });
        live.resume();
      } else if (live.pause?.kind === 'penal') {
        penales++;
        live.decidePenalty(penales % 2 ? 'line' : 'palos');
      }
    }
    expect(sawHalf).toBe(true);
    expect(live.finished).toBe(true);
    const res = live.result();
    expect(res.stats).toBeDefined();
    expect(res.mvp).toBeDefined();
    expect(res.jugaron).toContain(benchId);
    // El resultado en vivo es el que queda en la tabla.
    const f = userFixture(g)!;
    playRound(g, res);
    expect(f.result!.ptsH).toBe(res.ptsH);
    expect(f.result!.ptsA).toBe(res.ptsA);
  });

  it('cada jugador pierde energía según los minutos que jugó', () => {
    const g = createGame({ seed: 22, userClubIndex: 1, modo: 'libre' });
    const m = startUserMatch(g)!;
    const side = m.fixture.home === g.userClubId ? 'H' : 'A';
    const live = m.live;
    while (live.t < 70 && !live.finished) {
      live.step();
      if (live.pause?.kind === 'entretiempo' || live.pause?.kind === 'previa') live.resume();
      if (live.pause?.kind === 'penal') live.decidePenalty('palos');
    }
    const me = live.side(side);
    const tired = me.xv.filter((p) => p && (live.energia.get(p.id) ?? 100) < 85).length;
    expect(tired).toBeGreaterThan(8);
    const fresh = me.bench.every((p) => (live.energia.get(p.id) ?? 0) === p.energia);
    expect(fresh).toBe(true);
  });
});
