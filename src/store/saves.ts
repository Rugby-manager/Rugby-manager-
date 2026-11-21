import type { GameState } from '../engine/types';
import { SAVE_VERSION, migrate } from '../engine/game';
import { cloudDelete, cloudList, cloudLoad, cloudSave } from './cloud';

// Las partidas se guardan en el dispositivo (IndexedDB). Si el navegador no lo permite,
// quedan en memoria mientras la pestaña esté abierta.

export interface SaveMeta {
  id: string;
  nombre: string;
  clubId: string;
  clubNombre: string;
  temporada: number;
  round: number;
  updatedAt: number;
  division?: string;
  modo?: string;
}

const DB_NAME = 'rugby-manager';
const DB_VERSION = 1;
let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, { meta: SaveMeta; state: GameState }>();
export let storageOk = true;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  const p = new Promise<IDBDatabase | null>((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  }).then((db) => {
    storageOk = !!db;
    return db;
  });
  dbPromise = p;
  return p;
}

function tx<T>(db: IDBDatabase, stores: string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => IDBRequest<T> | void): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    const req = fn(t);
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export function metaFor(id: string, g: GameState): SaveMeta {
  const club = g.clubs[g.userClubId];
  return {
    id,
    nombre: g.manager,
    clubId: club.id,
    clubNombre: club.nombre,
    temporada: g.temporada,
    round: g.round,
    updatedAt: Date.now(),
    division: club.division,
    modo: g.modo,
  };
}

export async function listSaves(): Promise<SaveMeta[]> {
  const db = await openDB();
  let list: SaveMeta[];
  if (!db) list = [...memory.values()].map((m) => m.meta);
  else {
    try {
      list = ((await tx<SaveMeta[]>(db, ['meta'], 'readonly', (t) => t.objectStore('meta').getAll())) ?? []) as SaveMeta[];
    } catch {
      list = [...memory.values()].map((m) => m.meta);
    }
  }
  // Las de la nube (de tu cuenta) se suman o reemplazan a las del dispositivo si son más nuevas.
  const byId = new Map(list.map((m) => [m.id, m]));
  for (const m of await cloudList()) {
    const local = byId.get(m.id);
    if (!local || m.updatedAt > local.updatedAt) byId.set(m.id, m);
  }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveGame(id: string, g: GameState, opts: { esperarNube?: boolean } = {}): Promise<SaveMeta> {
  const meta = metaFor(id, g);
  memory.set(id, { meta, state: g });
  const json = JSON.stringify(g);
  const nube = cloudSave(meta, json);
  const db = await openDB();
  if (db) {
    try {
      await tx(db, ['meta', 'state'], 'readwrite', (t) => {
        t.objectStore('meta').put(meta);
        t.objectStore('state').put(JSON.parse(json), id);
      });
    } catch {
      storageOk = false;
    }
  }
  if (opts.esperarNube) await nube;
  return meta;
}

export async function loadGame(id: string): Promise<GameState | null> {
  const db = await openDB();
  // Si la copia de la nube es más nueva que la del dispositivo, usamos esa.
  let localMeta: SaveMeta | undefined;
  if (db) {
    try {
      localMeta = (await tx<SaveMeta>(db, ['meta'], 'readonly', (t) => t.objectStore('meta').get(id))) as SaveMeta | undefined;
    } catch {
      /* nada */
    }
  }
  const remote = await cloudLoad(id);
  if (remote && (!localMeta || remote.meta.updatedAt > localMeta.updatedAt)) {
    try {
      return migrate(JSON.parse(remote.json) as GameState);
    } catch {
      /* copia dañada: seguimos con la local */
    }
  }
  if (db) {
    try {
      const s = await tx<GameState>(db, ['state'], 'readonly', (t) => t.objectStore('state').get(id));
      if (s) return migrate(s as GameState);
    } catch {
      /* usamos la memoria */
    }
  }
  const m = memory.get(id)?.state;
  return m ? migrate(m) : null;
}

export async function deleteGame(id: string): Promise<void> {
  memory.delete(id);
  await cloudDelete(id);
  const db = await openDB();
  if (db) {
    try {
      await tx(db, ['meta', 'state'], 'readwrite', (t) => {
        t.objectStore('meta').delete(id);
        t.objectStore('state').delete(id);
      });
    } catch {
      /* nada */
    }
  }
}

export function newSaveId() {
  return `s${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// ---- Copias de respaldo ----

export interface BackupFile {
  app: 'rugby-manager';
  version: number;
  exportedAt: string;
  state: GameState;
}

export function makeBackup(g: GameState): string {
  const b: BackupFile = { app: 'rugby-manager', version: SAVE_VERSION, exportedAt: new Date().toISOString(), state: g };
  return JSON.stringify(b);
}

export function parseBackup(text: string): GameState {
  let data: unknown;
  try {
    data = JSON.parse(text.trim());
  } catch {
    throw new Error('El archivo no es una copia de respaldo válida.');
  }
  const b = data as Partial<BackupFile>;
  if (!b || b.app !== 'rugby-manager' || !b.state) throw new Error('Este archivo no es de Rugby Manager.');
  if ((b.version ?? 0) > SAVE_VERSION) throw new Error('La copia es de una versión más nueva del juego.');
  const s = b.state;
  if (!s.clubs || !s.players || !s.fixtures || !s.userClubId || !s.clubs[s.userClubId]) throw new Error('La copia está incompleta o dañada.');
  return migrate(s);
}
