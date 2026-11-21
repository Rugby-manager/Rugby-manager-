// Guardado en la nube de claude.ai (capacidad "db"): las partidas quedan en tu cuenta,
// así no se pierden si la app o el navegador borran los datos del dispositivo.
// Cada partida se comprime y se parte en pedazos (cada documento admite hasta 256 KB).

import type { SaveMeta } from './saves';

interface DocSnap {
  exists: boolean;
  id: string;
  data(): Record<string, unknown> | undefined;
}
interface DocRef {
  get(): Promise<DocSnap>;
  set(d: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
interface Coll {
  doc(id: string): DocRef;
  get(): Promise<{ docs: DocSnap[] }>;
}
interface DB {
  collection(path: string): Coll;
}
interface UserApi {
  id(): Promise<string | null>;
}

declare global {
  interface Window {
    claude?: { use: (name: string) => Promise<unknown> };
  }
}

const CHUNK = 150_000;
let ready: Promise<Coll | null> | null = null;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

/** Estado del guardado en la cuenta, para mostrarlo en pantalla. */
export const cloudStatus: { ok: boolean | null; last: number | null; error: string | null; local?: boolean } = { ok: null, last: null, error: null };
const listeners = new Set<() => void>();
export function onCloudStatus(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
function setStatus(p: Partial<typeof cloudStatus>) {
  Object.assign(cloudStatus, p);
  listeners.forEach((f) => f());
}

// En la app instalada (GitHub Pages) no hay cuenta de Claude: no hace falta esperarla.
let noClaude = typeof location !== 'undefined' && (location.hostname.endsWith('github.io') || location.hostname === 'localhost');
async function waitForClaude(ms: number) {
  if (typeof window !== 'undefined' && window.claude?.use) return window.claude;
  if (noClaude) return undefined;
  const t0 = Date.now();
  while (typeof window !== 'undefined' && !window.claude?.use && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 200));
  return typeof window !== 'undefined' ? window.claude : undefined;
}

/** La carpeta privada del usuario en la base del Artifact, o null si no hay nube. Si falla, se vuelve a intentar la próxima vez. */
export function cloud(): Promise<Coll | null> {
  if (ready) return ready;
  const p = (async () => {
    try {
      const cl = await waitForClaude(8_000);
      if (!cl?.use) {
        noClaude = true;
        cloudStatus.local = true;
        return null;
      }
      const [db, user] = (await withTimeout(Promise.all([cl.use('db'), cl.use('user')]), 15_000, [null, null])) as [DB | null, UserApi | null];
      if (!db || !user) return null;
      const uid = await withTimeout(user.id(), 10_000, null);
      if (!uid) return null;
      return db.collection(`data/users/${uid}`);
    } catch {
      return null;
    }
  })();
  ready = p;
  void p.then((c) => {
    if (!c) {
      if (ready === p) ready = null;
      setStatus({ ok: false, error: 'No se pudo conectar con tu cuenta.' });
    } else if (cloudStatus.ok === null) setStatus({ ok: true, error: null });
  });
  return p;
}

async function retry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
    return await fn();
  }
}

async function gzip(text: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') return 'j' + text;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return 'z' + btoa(bin);
}

async function gunzip(s: string): Promise<string> {
  if (s[0] === 'j') return s.slice(1);
  const bin = atob(s.slice(1));
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

// Una escritura a la vez: si llega otra mientras tanto, se guarda la última.
let busy: Promise<void> = Promise.resolve();
const pending = new Map<string, { meta: SaveMeta; json: string }>();

export function cloudSave(meta: SaveMeta, json: string): Promise<void> {
  pending.set(meta.id, { meta, json });
  busy = busy.then(async () => {
    const job = pending.get(meta.id);
    if (!job) return;
    pending.delete(meta.id);
    const c = await cloud();
    if (!c) return;
    const packed = await gzip(job.json);
    const parts = Math.max(1, Math.ceil(packed.length / CHUNK));
    try {
      for (let i = 0; i < parts; i++) await retry(() => c.doc(`${meta.id}_p${i}`).set({ d: packed.slice(i * CHUNK, (i + 1) * CHUNK) }));
      // La ficha va al final: si se corta a mitad de camino, queda la versión anterior completa.
      const prev = await retry(() => c.doc(`${meta.id}_meta`).get());
      const oldParts = (prev.data()?.parts as number) ?? 0;
      await retry(() => c.doc(`${meta.id}_meta`).set({ kind: 'meta', meta: job.meta, parts }));
      for (let i = parts; i < oldParts; i++) await c.doc(`${meta.id}_p${i}`).delete().catch(() => undefined);
      setStatus({ ok: true, last: Date.now(), error: null });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setStatus({ ok: false, error: code === 'not_granted' ? 'Falta darle permiso al juego para guardar en tu cuenta.' : 'No se pudo guardar en tu cuenta. Se vuelve a intentar en la próxima fecha.' });
    }
  }).catch(() => {
    /* sin nube: queda en el dispositivo */
  });
  return busy;
}

export async function cloudList(): Promise<SaveMeta[]> {
  const c = await cloud();
  if (!c) return [];
  try {
    const snap = await withTimeout(c.get(), 12_000, { docs: [] as DocSnap[] });
    return snap.docs.map((d) => d.data()).filter((d) => d?.kind === 'meta').map((d) => d!.meta as SaveMeta);
  } catch {
    return [];
  }
}

export async function cloudLoad(id: string): Promise<{ meta: SaveMeta; json: string } | null> {
  const c = await cloud();
  if (!c) return null;
  try {
    const m = (await c.doc(`${id}_meta`).get()).data();
    if (!m) return null;
    let packed = '';
    for (let i = 0; i < (m.parts as number); i++) packed += ((await c.doc(`${id}_p${i}`).get()).data()?.d as string) ?? '';
    return { meta: m.meta as SaveMeta, json: await gunzip(packed) };
  } catch {
    return null;
  }
}

export async function cloudDelete(id: string): Promise<void> {
  const c = await cloud();
  if (!c) return;
  try {
    const m = (await c.doc(`${id}_meta`).get()).data();
    await c.doc(`${id}_meta`).delete();
    for (let i = 0; i < ((m?.parts as number) ?? 0); i++) await c.doc(`${id}_p${i}`).delete();
  } catch {
    /* nada */
  }
}
