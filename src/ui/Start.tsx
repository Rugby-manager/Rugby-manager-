import { useEffect, useMemo, useState } from 'react';
import { CLUB_SEEDS as SEEDS_AB, CLUB_SEEDS_C } from '../engine/names';
const CLUB_SEEDS = [...SEEDS_AB, ...CLUB_SEEDS_C];
import { createGame, DIV_NAME, SAVE_VERSION } from '../engine/game';
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
      <section className="hero noche">
        <StadiumArt />
        <div className="hero-inner">
          <span className="hero-tag">TEMPORADA 2027</span>
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
            <button className="btn primary block start-new" onClick={() => setMode('new')}>
              <span className="sn-ball" aria-hidden="true">
                <Ball size={30} />
              </span>
              Nueva partida
            </button>
            <section className="savebox">
              <div className="savebox-hd">
                <span>Partidas guardadas</span>
                <CloudBadge />
              </div>
              {saves === null && <p className="savebox-empty">Buscando partidas…</p>}
              {saves?.length === 0 && (
                <div className="savebox-empty">
                  <Ball size={44} />
                  <p>Todavía no tenés partidas. Empezá una nueva o cargá una copia de respaldo.</p>
                </div>
              )}
              <div className="savelist">
                {saves?.map((s) => {
                  const seed = CLUB_SEEDS[Number(s.clubId.slice(1))];
                  const div = s.division ?? seed?.division;
                  return (
                    <div key={s.id} className="savecard" style={{ borderLeftColor: seed?.colores[0] ?? '#ffcc1a' }}>
                      <div className="sc-jersey">{seed && <Jersey colors={seed.colores} patron={seed.patron} size={46} />}</div>
                      <div className="sc-main">
                        <b>{s.clubNombre}</b>
                        <div className="sc-chips">
                          {div && div !== 'X' && <span className={`sc-div d${div}`}>Primera {div}</span>}
                          <span className="sc-chip">T{s.temporada} · Fecha {Math.min(s.round, 20)}</span>
                          {s.modo === 'carrera' && <span className="sc-chip">Carrera</span>}
                        </div>
                        <small>
                          {s.nombre ? `DT ${s.nombre} · ` : ''}guardada {cuando(s.updatedAt)}
                        </small>
                      </div>
                      {confirmDel === s.id ? (
                        <div className="sc-act">
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
                        <div className="sc-act">
                          <button
                            className="btn small sc-play"
                            onClick={async () => {
                              const g = await loadGame(s.id);
                              if (g) onOpen(g, s.id);
                            }}
                          >
                            ▶ Jugar
                          </button>
                          <button className="sc-del" aria-label={`Borrar partida de ${s.clubNombre}`} onClick={() => setConfirmDel(s.id)}>
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
            <button className="btn block start-imp" onClick={() => setMode('import')}>
              📂 Cargar copia de respaldo
            </button>
            <section className="howto">
              <div className="howto-hd">Cómo se juega</div>
              <ol>
                <li>
                  <b>1</b>
                  <span>
                    <strong>Elegí tu club</strong> de Primera A, B o C, o arrancá de abajo en modo carrera.
                  </span>
                </li>
                <li>
                  <b>2</b>
                  <span>
                    <strong>Armá el XV</strong>, entrená a cada jugador y comprá en el mercado.
                  </span>
                </li>
                <li>
                  <b>3</b>
                  <span>
                    <strong>Jugá la fecha</strong> en vivo o rápido, y peleá el ascenso o el título.
                  </span>
                </li>
              </ol>
            </section>
            <footer className="start-foot">
              <span>RUGBY MANAGER</span> · temporada 2027 · v{SAVE_VERSION}
            </footer>
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

/** "hoy", "ayer", "hace 3 días" o la fecha. */
function cuando(t: number) {
  const d0 = new Date();
  d0.setHours(0, 0, 0, 0);
  const dias = Math.floor((d0.getTime() - t) / 86400000) + 1;
  const hora = new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (t >= d0.getTime()) return `hoy ${hora}`;
  if (dias <= 1) return `ayer ${hora}`;
  if (dias < 7) return `hace ${dias} días`;
  return `el ${new Date(t).toLocaleDateString('es-AR')}`;
}

function Ball({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.66} viewBox="0 0 60 40" aria-hidden="true">
      <ellipse cx="30" cy="20" rx="28" ry="17" fill="#7a3b14" stroke="#000" strokeWidth="2" transform="rotate(-18 30 20)" />
      <ellipse cx="30" cy="20" rx="28" ry="17" fill="none" stroke="#a85a26" strokeWidth="2" transform="rotate(-18 30 20) scale(0.9) translate(3 2)" />
      <path d="M17 25 Q30 12 43 15" stroke="#fff" strokeWidth="2" fill="none" />
      <g stroke="#fff" strokeWidth="1.6">
        <path d="M23 18 l2 4 M27 16 l2 4 M31 14.6 l1.6 4 M35 14 l1.2 4" />
      </g>
    </svg>
  );
}

/** Estadio de noche: cielo, torres de luz, tribuna, palos y cancha. Dibujo propio. */
function StadiumArt() {
  const estrellas = [
    [22, 18], [64, 40], [110, 12], [150, 52], [196, 22], [248, 10], [292, 44], [336, 16], [372, 50], [88, 70], [318, 76], [40, 92],
  ];
  return (
    <svg className="stadium" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070b26" />
          <stop offset="0.6" stopColor="#1b2366" />
          <stop offset="1" stopColor="#2c3a9a" />
        </linearGradient>
        <linearGradient id="st-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6c8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff6c8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="st-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f8f3a" />
          <stop offset="1" stopColor="#0f4a1c" />
        </linearGradient>
        <radialGradient id="st-lamp">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.4" stopColor="#fff3a0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3a0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill="url(#st-sky)" />
      {estrellas.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="2" height="2" fill="#fff" opacity={0.35 + (i % 3) * 0.2} />
      ))}
      {/* haces de luz */}
      <path d="M40 40 L-40 260 L180 260 Z" fill="url(#st-beam)" />
      <path d="M360 40 L220 260 L440 260 Z" fill="url(#st-beam)" />
      {/* tribunas */}
      <path d="M0 196 L0 168 L70 158 L70 150 L330 150 L330 158 L400 168 L400 196 Z" fill="#0b1033" />
      <g fill="#ffcc1a" opacity="0.5">
        {Array.from({ length: 34 }, (_, i) => (
          <rect key={i} x={8 + i * 11.5} y={162 + (i % 3) * 7} width="3" height="2" />
        ))}
      </g>
      <rect x="0" y="194" width="400" height="4" fill="#ffcc1a" />
      {/* torres */}
      {[40, 360].map((x) => (
        <g key={x}>
          <path d={`M${x - 3} 196 L${x - 1.5} 46 L${x + 1.5} 46 L${x + 3} 196 Z`} fill="#05081c" />
          <rect x={x - 16} y="30" width="32" height="16" fill="#05081c" />
          <g fill="#fffbe0">
            {[0, 1, 2, 3].map((k) => (
              <rect key={k} x={x - 13 + k * 7} y="33" width="5" height="4" />
            ))}
            {[0, 1, 2, 3].map((k) => (
              <rect key={k} x={x - 13 + k * 7} y="39" width="5" height="4" />
            ))}
          </g>
          <circle cx={x} cy="38" r="34" fill="url(#st-lamp)" opacity="0.6" />
        </g>
      ))}
      {/* cancha */}
      <path d="M0 198 H400 V260 H0 Z" fill="url(#st-grass)" />
      <g stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" fill="none">
        <path d="M0 212 H400" />
        <path d="M0 236 H400" strokeDasharray="8 6" />
      </g>
      {/* palos en H */}
      <g stroke="#fff" strokeWidth="5" strokeLinecap="square">
        <path d="M176 214 V138 M224 214 V138 M176 176 H224" />
      </g>
      <g fill="#e2231a">
        <rect x="172.5" y="194" width="7" height="22" />
        <rect x="220.5" y="194" width="7" height="22" />
      </g>
    </svg>
  );
}
