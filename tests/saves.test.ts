import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { createGame, playRound } from '../src/engine/game';
import { deleteGame, listSaves, loadGame, makeBackup, parseBackup, saveGame } from '../src/store/saves';

describe('partidas guardadas', () => {
  it('guarda, lista, carga y borra varias partidas', async () => {
    const a = createGame({ seed: 1, userClubIndex: 0, manager: 'Luca' });
    const b = createGame({ seed: 2, userClubIndex: 12 });
    playRound(a);
    await saveGame('s1', a);
    await saveGame('s2', b);
    const list = await listSaves();
    expect(list.map((s) => s.id).sort()).toEqual(['s1', 's2']);
    const loaded = await loadGame('s1');
    expect(loaded!.round).toBe(2);
    expect(loaded!.manager).toBe('Luca');
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(a));
    await deleteGame('s1');
    expect((await listSaves()).map((s) => s.id)).toEqual(['s2']);
  });

  it('la copia de respaldo se exporta y se vuelve a cargar igual', () => {
    const g = createGame({ seed: 3 });
    playRound(g);
    const back = parseBackup(makeBackup(g));
    expect(JSON.stringify(back)).toBe(JSON.stringify(g));
  });

  it('rechaza archivos que no son copias', () => {
    expect(() => parseBackup('hola')).toThrow();
    expect(() => parseBackup('{"app":"otra"}')).toThrow();
  });
});
