import { useEffect, useMemo, useState } from 'react';
import { CLUB_SEEDS as SEEDS_AB, CLUB_SEEDS_C } from '../engine/names';
const CLUB_SEEDS = [...SEEDS_AB, ...CLUB_SEEDS_C];
import { createGame, DIV_NAME } from '../engine/game';
import { firstOffers } from '../engine/career';
import type { GameState } from '../engine/types';
import { deleteGame, listSaves, loadGame, newSaveId, parseBackup, saveGame, storageOk, type SaveMeta } from '../store/saves';
import { CloudBadge, Jersey } from './common';

export function StartScreen({ onOpen }: { onOpen: (g: GameState, id: string) => void }) {
  const [saves, setSaves] = useState<SaveMeta[] | null>(null);
  const [mode, setMode] = useState<'list' | 'new' | 'import'>('list');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const reload = () => listSaves().then(setSaves);
  useEffect(() => {
    void reload();
  }, []);

  return (
    <div>
      <section className="hero">
        <svg className="posts" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
          <g stroke="#fff" strokeWidth="6" fill="none">
            <path d="M150 200 V20 M250 200 V20 M150 110 H250" />
          </g>
        </svg>
        <div className="hero-inner">
          <p className="label" style={{ color: 'inherit', opacity: 0.8 }}>Temporada 2027</p>
          <h1>
            Rugby <em>Manager</em>
          </h1>
          <p>Armá el plantel, elegí el XV y llevá a tu club a lo más alto del rugby.</p>
        </div>
      </section>
      <div className="start">
        {!storageOk && <div className="notice">Este navegador no deja guardar partidas. Podés jugar igual, pero hacé copias de respaldo seguido desde el Menú.</div>}

        {mode === 'list' && (
          <>
            <button className="btn primary block" onClick={() => setMode('new')}>
              Nueva partida
            </button>
            <section className="card">
              <h3>Partidas guardadas</h3>
              <CloudBadge />
              {saves === null && <p className="muted">Buscando partidas…</p>}
              {saves?.length === 0 && <p className="muted">Todavía no tenés partidas. Empezá una nueva o cargá una copia de respaldo.</p>}
              <div className="list">
                {saves?.map((s) => {
                  const seed = CLUB_SEEDS[Number(s.clubId.slice(1))];
                  return (
                    <div key={s.id} className="li" style={{ cursor: 'default' }}>
                      {seed && <Jersey colors={seed.colores} patron={seed.patron} size={36} />}
                      <div className="grow">
                        <div className="name">{s.clubNombre}</div>
                        <div className="small muted">
                          {s.nombre} · Temporada {s.temporada} · Fecha {Math.min(s.round, 20)} · {new Date(s.updatedAt).toLocaleDateString('es-AR')}
                        </div>
                      </div>
                      {confirmDel === s.id ? (
                        <div className="row">
                          <button
                            className="btn small danger"
                            onClick={async () => {
                              await deleteGame(s.id);
                              setConfirmDel(null);
                              void reload();
                            }}
                          >
                            Borrar
                          </button>
                          <button className="btn small" onClick={() => setConfirmDel(null)}>
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="row">
                          <button
                            className="btn small"
                            style={{ background: 'var(--turf)', color: 'var(--chalk)', borderColor: 'transparent' }}
                            onClick={async () => {
                              const g = await loadGame(s.id);
                              if (g) onOpen(g, s.id);
                            }}
                          >
                            Jugar
                          </button>
                          <button className="btn small" aria-label={`Borrar partida de ${s.clubNombre}`} onClick={() => setConfirmDel(s.id)}>
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
            <button className="btn block" onClick={() => setMode('import')}>
              Cargar copia de respaldo
            </button>
          </>
        )}

        {mode === 'new' && <NewGame onCancel={() => setMode('list')} onOpen={onOpen} />}
        {mode === 'import' && <ImportBackup onCancel={() => setMode('list')} onOpen={onOpen} />}
      </div>
    </div>
  );
}

function NewGame({ onCancel, onOpen }: { onCancel: () => void; onOpen: (g: GameState, id: string) => void }) {
  const [name, setName] = useState('');
  const [modo, setModo] = useState<'carrera' | 'libre'>('carrera');
  const [club, setClub] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const preview = useMemo(() => createGame({ seed, modo: 'carrera' }), [seed]);
  const offers = useMemo(() => firstOffers(preview).map((id) => Number(id.slice(1))), [preview]);
  const choices = modo === 'carrera' ? offers : CLUB_SEEDS.map((_, i) => i);

  return (
    <section className="stack">
      <div className="card stack">
        <h3>Tu nombre</h3>
        <input id="manager-name" className="text" placeholder="Ej.: Luca" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="modes">
        <button aria-pressed={modo === 'carrera'} onClick={() => { setModo('carrera'); setClub(null); }}>
          <b>Modo carrera</b>
          <span>Empezás como un entrenador desconocido. Solo te llaman clubes chicos de Primera C. Ganá prestigio, recibí ofertas de clubes grandes… y cuidado: si no cumplís, te echan.</span>
        </button>
        <button aria-pressed={modo === 'libre'} onClick={() => { setModo('libre'); setClub(null); }}>
          <b>Elegí tu club</b>
          <span>Dirigís al club que quieras, de Primera A, B o C. No te echan nunca.</span>
        </button>
      </div>
      {modo === 'carrera' ? (
        <div className="card stack">
          <h3>Te ofrecen trabajo</h3>
          <p className="small muted">Nadie te conoce todavía. Estos tres clubes de Primera C te quieren como entrenador.</p>
          <div className="clubpick">
            {choices.map((i) => {
              const c = CLUB_SEEDS[i];
              return (
                <button key={c.corto} aria-pressed={club === i} onClick={() => setClub(i)}>
                  <Jersey colors={c.colores} patron={c.patron} size={44} />
                  <b>{c.nombre}</b>
                  <span className="small muted">{c.ciudad}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        (['A', 'B', 'C'] as const).map((d) => (
          <div className="card stack" key={d}>
            <h3>{DIV_NAME[d]}</h3>
            <p className="small muted">{d === 'A' ? 'Los clubes más fuertes. Pelean el título.' : d === 'B' ? 'Clubes medianos. El objetivo es ascender a la A.' : 'Los más chicos, de pueblo. Para arrancar de abajo.'}</p>
            <div className="clubpick">
              {CLUB_SEEDS.map((c, i) =>
                c.division !== d ? null : (
                  <button key={c.corto} aria-pressed={club === i} onClick={() => setClub(i)}>
                    <Jersey colors={c.colores} patron={c.patron} size={44} />
                    <b>{c.nombre}</b>
                    <span className="small muted">{c.ciudad}</span>
                  </button>
                ),
              )}
            </div>
          </div>
        ))
      )}
      <button
        className="btn primary block"
        disabled={club === null || busy}
        onClick={async () => {
          setBusy(true);
          const g = createGame({ seed, userClubIndex: club!, manager: name, modo, amistosos: true });
          const id = newSaveId();
          await saveGame(id, g);
          onOpen(g, id);
        }}
      >
        {club === null ? 'Elegí un club' : `Firmar con ${CLUB_SEEDS[club].nombre}`}
      </button>
      <button className="btn block" onClick={onCancel}>
        Volver
      </button>
    </section>
  );
}

function ImportBackup({ onCancel, onOpen }: { onCancel: () => void; onOpen: (g: GameState, id: string) => void }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const load = async (raw: string) => {
    try {
      const g = parseBackup(raw);
      const id = newSaveId();
      await saveGame(id, g);
      onOpen(g, id);
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <section className="card stack">
      <h3>Cargar copia de respaldo</h3>
      <p className="small muted">Elegí el archivo .json que guardaste desde el Menú, o pegá su contenido abajo.</p>
      <input
        id="backup-file"
        type="file"
        accept=".json,application/json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await load(await f.text());
        }}
      />
      <textarea id="backup-text" className="text" placeholder="Pegá acá el texto de la copia" value={text} onChange={(e) => setText(e.target.value)} />
      {err && <div className="notice">{err}</div>}
      <div className="grid2">
        <button className="btn" onClick={onCancel}>
          Volver
        </button>
        <button className="btn" style={{ background: 'var(--turf)', color: 'var(--chalk)' }} disabled={!text.trim()} onClick={() => load(text)}>
          Cargar texto
        </button>
      </div>
    </section>
  );
}
