import { describe, it, expect } from 'vitest';
import { createGame, playRound, userFixture } from '../src/engine/game';
import { conferenciaPendiente, responderPrensa } from '../src/engine/diario';
import { isDerby } from '../src/engine/extras';

describe('conferencia de prensa', () => {
  it('aparece antes del clásico y la respuesta picante mueve a la hinchada', () => {
    const g = createGame({ seed: 61, userClubIndex: 2 });
    for (let i = 0; i < 20 && !conferenciaPendiente(g); i++) playRound(g);
    const f = conferenciaPendiente(g);
    expect(f).not.toBeNull();
    const c = g.clubs[g.userClubId];
    const h = c.hinchada!;
    responderPrensa(g, 3);
    expect(c.hinchada).toBeGreaterThan(h);
    expect(conferenciaPendiente(g)).toBeNull();
    expect(userFixture(g)?.id).toBe(f!.id);
    expect(typeof isDerby).toBe('function');
  });
});
