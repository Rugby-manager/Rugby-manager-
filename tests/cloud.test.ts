import { describe, it, expect } from 'vitest';
import { createGame, playRound } from '../src/engine/game';

// Una "nube" de mentira con la misma forma que la base del Artifact.
const store = new Map<string, Record<string, unknown>>();
const coll = (path: string) => ({
  doc: (id: string) => ({
    get: async () => ({ exists: store.has(`${path}/${id}`), id, data: () => store.get(`${path}/${id}`) }),
    set: async (d: Record<string, unknown>) => {
      expect(JSON.stringify(d).length).toBeLessThan(256 * 1024);
      store.set(`${path}/${id}`, d);
    },
    delete: async () => void store.delete(`${path}/${id}`),
  }),
  get: async () => ({
    docs: [...store.entries()].filter(([k]) => k.startsWith(path + '/')).map(([k, v]) => ({ exists: true, id: k, data: () => v })),
  }),
});
(globalThis as any).window = {
  claude: { use: async (n: string) => (n === 'db' ? { collection: coll } : n === 'user' ? { id: async () => 'u1' } : null) },
};

describe('guardado en la nube', () => {
  it('guarda, lista y vuelve a cargar una partida aunque el dispositivo no tenga nada', async () => {
    const { saveGame, listSaves, loadGame } = await import('../src/store/saves');
    const g = createGame({ seed: 50 });
    for (let i = 0; i < 6; i++) playRound(g);
    await saveGame('s1', g, { esperarNube: true });
    expect([...store.keys()].some((k) => k.endsWith('s1_meta'))).toBe(true);
    const list = await listSaves();
    expect(list.map((m) => m.id)).toContain('s1');
    const back = await loadGame('s1');
    expect(back!.round).toBe(g.round);
    expect(Object.keys(back!.players).length).toBe(Object.keys(g.players).length);
  });
});
