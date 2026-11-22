import { describe, it, expect } from 'vitest';
import { createGame, playRound } from '../src/engine/game';
import { jugarSeven, rechazarSeven, sevenPendiente } from '../src/engine/seven';

describe('seven de verano', () => {
  it('es opcional, se juega una vez y suma físico', () => {
    const g = createGame({ seed: 41, userClubIndex: 3 });
    expect(sevenPendiente(g)).toBe(true);
    const presu = g.clubs[g.userClubId].presupuesto;
    const r = jugarSeven(g);
    expect(r.partidos.length).toBeGreaterThan(0);
    expect(sevenPendiente(g)).toBe(false);
    const p = g.players[r.jugadores[0]];
    expect(p.attrs.velocidad).toBeGreaterThan(0);
    expect(g.clubs[g.userClubId].presupuesto).toBe(presu + r.premio);
    playRound(g);
    expect(sevenPendiente(g)).toBe(false);
    const h = createGame({ seed: 42, userClubIndex: 3 });
    rechazarSeven(h);
    expect(sevenPendiente(h)).toBe(false);
  });
});
