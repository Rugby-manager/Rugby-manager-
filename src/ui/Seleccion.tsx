import { useState } from 'react';
import { useGame } from './App';
import { Ovr, Seg, Sheet } from './common';
import { PlayerSheet } from './Squad';
import { POS_LABEL, POS_ORDER, overall } from '../engine/players';
import { prestigioTexto } from '../engine/career';
import { deIso, esAnioMundial, fechaCorta, fechaLarga } from '../engine/calendario';
import {
  COMP_SEL, MAX_LISTA, PAISES, aceptarSeleccion, completarLista, convocarAuto, faseAlcanzada, focoDe, jugadorSel, jugarSiguiente, nacional, nombrePais,
  objetivoMundial, paisDe, tablaTorneo, poolSeleccion, prestigioPedido, proximoSel, rechazarOfertasSel, renunciarSeleccion, simularResto, tablaGrupo, tablaNC, toggleConvocado,
  ventanaActual, ventanaEnCurso, ventanaPendiente, type PartidoSel, type Ventana,
} from '../engine/seleccion';
import type { Ataque, Defensa, JuegoPie, Player, Pos } from '../engine/types';

type Sec = 'partidos' | 'lista' | 'torneo' | 'paises';

export function SeleccionScreen() {
  const { g, refresh, saveNow, toast, sub } = useGame();
  const n = nacional(g);
  const [sec, setSec] = useState<Sec>(sub === 'lista' ? 'lista' : 'partidos');
  const [ultimo, setUltimo] = useState<PartidoSel | null>(null);
  const pais = n.paisId ? paisDe(n.paisId) : null;
  const pr = g.career?.prestigio ?? 0;
  const guardar = () => {
    refresh();
    void saveNow();
  };

  return (
    <>
      <h2>Selección</h2>
      {pais ? (
        <section className="sel-head" style={{ ['--c1' as string]: pais.colores[0], ['--c2' as string]: pais.colores[1] }}>
          <div className="sel-flag" aria-hidden="true">{pais.bandera}</div>
          <div className="grow">
            <div className="small" style={{ opacity: 0.75 }}>Sos el entrenador de</div>
            <b className="sel-name">{pais.nombre}</b>
            <div className="small" style={{ opacity: 0.8 }}>
              Desde {n.desde} · {n.pj} PJ · {n.pg} PG · {n.pe} PE · {n.pp} PP
            </div>
            <div className="conf" style={{ marginTop: 6 }}>
              <span>Federación</span>
              <div className="bar">
                <i style={{ width: `${n.confianza}%`, background: n.confianza < 30 ? 'var(--loss)' : n.confianza < 55 ? 'var(--draw)' : 'var(--win)' }} />
              </div>
              <span className="num">{n.confianza}%</span>
            </div>
            {esAnioMundial(g.temporada) && <div className="small" style={{ marginTop: 4 }}>Para el Mundial te piden: <b>{objetivoMundial(pais.id).texto.toLowerCase()}</b>.</div>}
          </div>
        </section>
      ) : (
        <section className="card stack">
          <h3>🌎 Todavía no dirigís una selección</h3>
          <p className="small">
            Con más trayectoria te llaman selecciones mejores. Tu prestigio de DT es <b>{Math.round(pr)}</b> ({prestigioTexto(pr).toLowerCase()}). Las ofertas llegan al terminar cada temporada del club, y lo podés hacer a la par del club.
          </p>
          <p className="small muted">Mientras tanto seguís a Argentina, que convoca a los mejores de la liga para la ventana de julio.</p>
        </section>
      )}

      {n.ofertas.length > 0 && (
        <section className="ayuda-aviso">
          <div className="aa-hd">🌎 Te quieren como entrenador</div>
          {n.ofertas.map((o) => (
            <div key={o.paisId} className="sel-oferta">
              <div className="grow">
                <b>{nombrePais(o.paisId)}</b>
                <div className="small">{o.texto}</div>
              </div>
              <button
                className="btn small primary"
                onClick={() => {
                  const err = aceptarSeleccion(g, o.paisId);
                  if (err) return toast(err);
                  toast(`¡Sos el DT de ${paisDe(o.paisId).nombre}!`);
                  guardar();
                }}
              >
                Aceptar
              </button>
            </div>
          ))}
          <button className="btn small" onClick={() => { rechazarOfertasSel(g); guardar(); }}>
            No, gracias
          </button>
        </section>
      )}

      <Seg<Sec>
        label="Sección"
        value={sec}
        onChange={setSec}
        options={[
          { v: 'partidos', l: 'Partidos' },
          ...(pais ? [{ v: 'lista' as Sec, l: 'Convocados' }] : []),
          { v: 'torneo', l: 'Torneos' },
          { v: 'paises', l: 'Países' },
        ]}
      />
      {sec === 'partidos' && <Partidos ultimo={ultimo} onJugar={(p) => { setUltimo(p); guardar(); }} />}
      {sec === 'lista' && pais && <Lista />}
      {sec === 'torneo' && <Torneo />}
      {sec === 'paises' && (
        <section className="card">
          <p className="small muted">Las 24 selecciones del Mundial 2027 (Australia). Los países son reales; los jugadores, inventados. Cuanto mejor la selección, más prestigio de DT te piden.</p>
          <div className="list">
            {[...PAISES].sort((a, b) => b.fuerza - a.fuerza).map((p, i) => {
              const ok = prestigioPedido(p) <= pr;
              return (
                <div key={p.id} className="li" style={{ cursor: 'default', fontWeight: p.id === n.paisId ? 700 : 400 }}>
                  <span className="num muted" style={{ width: 22 }}>{i + 1}</span>
                  <span style={{ fontSize: '1.4rem' }}>{p.bandera}</span>
                  <div className="grow">
                    <div className="name">{p.nombre}</div>
                    <div className="small muted">Grupo {p.grupo27} en 2027{p.nc ? ' · Nations Championship' : ''}</div>
                  </div>
                  <Ovr v={p.fuerza} />
                  <span className="small" style={{ width: 64, textAlign: 'right' }}>{p.id === n.paisId ? 'Tuya' : ok ? '✓ Te puede llamar' : `🔒 ${prestigioPedido(p)}`}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(n.historial.length > 0 || n.mundiales.length > 0 || (n.torneos ?? []).length > 0) && (
        <section className="card stack">
          <h3>Historia</h3>
          {n.mundiales.map((m) => (
            <div key={m.temporada} className="small">
              🏆 <b>Mundial {m.temporada}:</b> {nombrePais(m.campeon)} campeón, {paisDe(m.sub).nombre} subcampeón{m.tuyo ? ` · ${m.tuyo}` : ''}.
            </div>
          ))}
          {(n.torneos ?? []).map((x) => (
            <div key={x.nombre} className="small">🏆 <b>{x.nombre}:</b> {nombrePais(x.campeon)}.</div>
          ))}
          {n.nc.map((x) => (
            <div key={x.temporada} className="small">🏆 <b>Nations Championship {x.temporada}:</b> {nombrePais(x.campeon)}.</div>
          ))}
          {n.historial.map((h, i) => (
            <div key={i} className="small muted">{h.temporada} · {h.texto}</div>
          ))}
        </section>
      )}

      {pais && (
        <button
          className="btn small"
          style={{ alignSelf: 'flex-start' }}
          disabled={ventanaEnCurso(g)}
          onClick={() => {
            if (!window.confirm(`¿Seguro que querés dejar ${pais.nombre}?`)) return;
            const err = renunciarSeleccion(g);
            if (err) return toast(err);
            guardar();
          }}
        >
          Renunciar a la selección
        </button>
      )}
    </>
  );
}

function Marcador({ p, id }: { p: PartidoSel; id: string }) {
  const h = paisDe(p.home);
  const a = paisDe(p.away);
  const jugado = p.ph != null;
  const mio = p.home === id ? p.ph! : p.pa!;
  const otro = p.home === id ? p.pa! : p.ph!;
  const gano = p.ganador ? p.ganador === id : mio > otro;
  const tono = !jugado ? '' : mio === otro && !p.ganador ? 'draw' : gano ? 'win' : 'loss';
  return (
    <div className="sel-match">
      <div className="small muted">{fechaCorta(deIso(p.fecha))} · {COMP_SEL[p.comp]} · {p.fase}</div>
      <div className="sel-row">
        <span className="grow">{h.bandera} {h.nombre}</span>
        <b className="num">{jugado ? `${p.ph} - ${p.pa}` : 'vs'}</b>
        <span className="grow" style={{ textAlign: 'right' }}>{a.nombre} {a.bandera}</span>
        {tono && <span className={`pill ${tono}`}>{tono === 'win' ? 'G' : tono === 'loss' ? 'P' : 'E'}</span>}
      </div>
    </div>
  );
}

function Partidos({ ultimo, onJugar }: { ultimo: PartidoSel | null; onJugar: (p: PartidoSel) => void }) {
  const { g, refresh, saveNow, toast } = useGame();
  const n = nacional(g);
  const foco = focoDe(g);
  const vs = n.ventanas.filter((v) => v.temporada === g.temporada);
  const v = ventanaActual(g);
  const prox = proximoSel(g);
  const [verTodos, setVerTodos] = useState<Ventana | null>(null);
  const pendiente = ventanaPendiente(g);
  return (
    <>
      {ultimo && ultimo.ph != null && (
        <section className="card stack">
          <h3>Último partido</h3>
          <Marcador p={ultimo} id={foco} />
          {ultimo.tries && ultimo.tries.length > 0 && <p className="small">🏉 Tries: {ultimo.tries.map((t) => `${t.nombre}${t.n > 1 ? ` (${t.n})` : ''}`).join(', ')}</p>}
          {ultimo.mvp && <p className="small">⭐ Figura: {jugadorSel(g, ultimo.mvp)?.nombre} {jugadorSel(g, ultimo.mvp)?.apellido}</p>}
        </section>
      )}
      {v && prox && pendiente && (
        <section className="sel-next">
          <div className="small" style={{ opacity: 0.8 }}>{v.nombre}</div>
          <Marcador p={prox} id={foco} />
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button
              className="btn primary"
              onClick={() => {
                const ronda = jugarSiguiente(g);
                const mio = ronda.find((p) => p.home === foco || p.away === foco);
                if (mio) onJugar({ ...mio });
                else refresh();
              }}
            >
              Jugar ▶
            </button>
            <button
              className="btn"
              onClick={() => {
                simularResto(g);
                toast('Se simuló lo que faltaba de la ventana');
                refresh();
                void saveNow();
              }}
            >
              Simular todo ⏩
            </button>
          </div>
          <p className="small" style={{ margin: '6px 0 0', opacity: 0.8 }}>Los convocados llegan descansados. El XV lo arma tu ayudante con los mejores de la lista.</p>
        </section>
      )}
      {v && !pendiente && !v.terminada && (
        <section className="card stack">
          <h3>{v.nombre}</h3>
          <p className="small">
            {v.tipo === 'seis' ? 'Se juega en febrero y marzo, a la par del arranque de la liga.' : v.tipo === 'rc' ? 'Se juega en agosto y septiembre, después de la final del club.' : v.tipo === 'mundial' ? 'Se juega del 2 de octubre a mediados de noviembre.' : 'Se juega cuando termina la temporada del club.'} Los partidos se van jugando solos a medida que pasan las fechas.
          </p>
          <button className="btn small" onClick={() => { simularResto(g); refresh(); void saveNow(); }}>
            Ver cómo termina ⏩
          </button>
        </section>
      )}
      {vs.length === 0 && (
        <section className="card">
          <p className="small">Todavía no hay partidos de selecciones esta temporada. La ventana de julio arranca después de la fecha 16 de la liga: se para el torneo 3 semanas.</p>
        </section>
      )}
      {vs.map((w) => {
        const fid = w.tipo === 'seis' || w.tipo === 'rc' ? foco : w.foco;
        const ps = w.partidos.filter((p) => p.home === fid || p.away === fid);
        return (
          <section key={w.nombre} className="card stack">
            <h3>{w.nombre}</h3>
            {ps.length ? ps.map((p) => <Marcador key={p.id} p={p} id={fid} />) : <p className="small muted">{paisDe(fid).nombre} no juega este torneo.</p>}
            <button className="btn small" onClick={() => setVerTodos(w)}>Ver todos los partidos</button>
          </section>
        );
      })}
      {verTodos && (
        <Sheet title={verTodos.nombre} onClose={() => setVerTodos(null)}>
          <div className="stack">
            {[...new Set(verTodos.partidos.map((p) => p.jornada))].map((j) => (
              <div key={j} className="stack">
                <b className="small">{fechaLarga(deIso(verTodos.partidos.find((p) => p.jornada === j)!.fecha))}</b>
                {verTodos.partidos.filter((p) => p.jornada === j).map((p) => <Marcador key={p.id} p={p} id={foco} />)}
              </div>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

function Lista() {
  const { g, refresh, saveNow, toast } = useGame();
  const n = nacional(g);
  const [ver, setVer] = useState<Player | null>(null);
  const [agregar, setAgregar] = useState<Pos | null>(null);
  const pool = poolSeleccion(g);
  const lista = n.convocados.map((id) => jugadorSel(g, id)).filter((p): p is Player => !!p);
  const guardar = () => {
    refresh();
    void saveNow();
  };
  const donde = (p: Player) => (p.clubId ? g.clubs[p.clubId]?.nombre ?? '' : 'Juega afuera');
  const t = n.tactica;
  const setT = (x: Partial<typeof t>) => {
    n.tactica = { ...t, ...x };
    guardar();
  };
  return (
    <>
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Lista de {lista.length}/{MAX_LISTA}</h3>
          <button className="btn small" onClick={() => { n.convocados = convocarAuto(g); guardar(); toast('Lista armada con los mejores'); }}>
            Armar con los mejores
          </button>
        </div>
        <p className="small muted">En una selección no se compra ni se vende: convocás. Tocá ✕ para sacar a alguien y ＋ para sumar en ese puesto. Los de bold juegan en tu club.</p>
        {POS_ORDER.map((pos) => {
          const ps = lista.filter((p) => p.pos === pos).sort((a, b) => overall(b) - overall(a));
          return (
            <div key={pos}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b className="small">{POS_LABEL[pos]} ({ps.length})</b>
                <button className="btn small" onClick={() => setAgregar(pos)} aria-label={`Sumar ${POS_LABEL[pos]}`}>＋</button>
              </div>
              <div className="list">
                {ps.map((p) => (
                  <div key={p.id} className="li" style={{ fontWeight: p.clubId === g.userClubId ? 700 : 400 }}>
                    <Ovr v={overall(p)} />
                    <button className="grow" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0, color: 'inherit', font: 'inherit' }} onClick={() => setVer(p)}>
                      <div className="name">{p.nombre} {p.apellido}</div>
                      <div className="small muted">{p.edad} años · {donde(p)}{p.caps ? ` · ${p.caps} ${p.caps === 1 ? 'partido' : 'partidos'} internacionales` : ''}{p.lesion ? ` · 🩹 ${p.lesion}` : ''}</div>
                    </button>
                    <button className="btn small" aria-label={`Sacar a ${p.apellido}`} onClick={() => { toggleConvocado(g, p.id); guardar(); }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
      <section className="card stack">
        <h3>Cómo juega la selección</h3>
        <Seg<Ataque> label="Ataque" value={t.ataque} onChange={(v) => setT({ ataque: v })} options={[{ v: 'forwards', l: 'Forwards' }, { v: 'equilibrado', l: 'Equilibrado' }, { v: 'abrir', l: 'Abrir' }]} />
        <Seg<JuegoPie> label="Pie" value={t.pie} onChange={(v) => setT({ pie: v })} options={[{ v: 'poco', l: 'Poco pie' }, { v: 'medio', l: 'Pie medio' }, { v: 'mucho', l: 'Mucho pie' }]} />
        <Seg<Defensa> label="Defensa" value={t.defensa} onChange={(v) => setT({ defensa: v })} options={[{ v: 'conservadora', l: 'Conservadora' }, { v: 'equilibrada', l: 'Equilibrada' }, { v: 'agresiva', l: 'Agresiva' }]} />
      </section>
      {agregar && (
        <Sheet title={`Sumar ${POS_LABEL[agregar].toLowerCase()}`} onClose={() => setAgregar(null)}>
          <div className="list">
            {pool
              .filter((p) => (p.pos === agregar || p.pos2?.includes(agregar)) && !n.convocados.includes(p.id))
              .sort((a, b) => overall(b) - overall(a))
              .slice(0, 25)
              .map((p) => (
                <button
                  key={p.id}
                  className="li"
                  style={{ fontWeight: p.clubId === g.userClubId ? 700 : 400 }}
                  onClick={() => {
                    const err = toggleConvocado(g, p.id);
                    if (err) return toast(err);
                    setAgregar(null);
                    guardar();
                  }}
                >
                  <Ovr v={overall(p)} />
                  <div className="grow">
                    <div className="name">{p.nombre} {p.apellido}</div>
                    <div className="small muted">{POS_LABEL[p.pos]} · {p.edad} años · {donde(p)}{p.lesion ? ` · 🩹 lesionado` : ''}</div>
                  </div>
                </button>
              ))}
          </div>
        </Sheet>
      )}
      {ver && (ver.clubId ? <PlayerSheet g={g} p={ver} onClose={() => setVer(null)} /> : (
        <Sheet title={`${ver.nombre} ${ver.apellido}`} onClose={() => setVer(null)}>
          <p className="small">{POS_LABEL[ver.pos]} · {ver.edad} años · juega afuera · media {overall(ver)}{ver.caps ? ` · ${ver.caps} partidos con la selección` : ''}.</p>
        </Sheet>
      ))}
      {lista.length < MAX_LISTA && (
        <button className="btn small" onClick={() => { completarLista(g); guardar(); }}>Completar la lista</button>
      )}
    </>
  );
}

function Tabla({ filas, titulo, pasan, foco }: { filas: ReturnType<typeof tablaNC>; titulo: string; pasan: number; foco: string }) {
  return (
    <div className="stack">
      <b className="small">{titulo}</b>
      <table className="sel-table">
        <thead>
          <tr><th style={{ textAlign: 'left' }}>País</th><th>PJ</th><th>PG</th><th>Dif</th><th>Pts</th></tr>
        </thead>
        <tbody>
          {filas.map((r, i) => (
            <tr key={r.id} className={i < pasan ? 'pasa' : ''} style={{ fontWeight: r.id === foco ? 700 : 400 }}>
              <td style={{ textAlign: 'left' }}>{paisDe(r.id).bandera} {paisDe(r.id).nombre}</td>
              <td>{r.pj}</td><td>{r.pg}</td><td>{r.pf - r.pc}</td><td><b>{r.pts}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Torneo() {
  const { g } = useGame();
  const n = nacional(g);
  const foco = focoDe(g);
  const vs = n.ventanas.filter((v) => v.temporada === g.temporada);
  const torneos = vs.filter((v) => v.tipo === 'seis' || v.tipo === 'rc');
  return (
    <>
      {torneos.map((v) => (
        <section key={v.nombre} className="card stack">
          <h3>🏆 {v.nombre}</h3>
          <p className="small muted">
            {v.tipo === 'seis'
              ? 'Inglaterra, Francia, Irlanda, Italia, Escocia y Gales: todos contra todos en febrero y marzo.'
              : `Argentina, Nueva Zelanda, Sudáfrica y Australia (el viejo Tres Naciones, con Argentina desde 2012). ${esAnioMundial(g.temporada) ? 'En año de Mundial se juega a una sola rueda.' : 'Ida y vuelta en agosto y septiembre.'}`}
          </p>
          <Tabla titulo={v.terminada ? `Campeón: ${nombrePais(tablaTorneo(v)[0].id)}` : 'Posiciones'} filas={tablaTorneo(v)} pasan={1} foco={foco} />
        </section>
      ))}
      <TorneoGrande />
    </>
  );
}

function TorneoGrande() {
  const { g } = useGame();
  const n = nacional(g);
  const foco = focoDe(g);
  const vs = n.ventanas.filter((v) => v.temporada === g.temporada);
  const m = vs.find((v) => v.tipo === 'mundial');
  if (esAnioMundial(g.temporada)) {
    if (!m) {
      return (
        <section className="card stack">
          <h3>🏆 Mundial {g.temporada} · Australia</h3>
          <p className="small">Del 2 de octubre al 13 de noviembre, cuando termina la temporada del club. 24 selecciones en 6 grupos de 4: pasan los 2 primeros y los 4 mejores terceros a octavos.</p>
          {'ABCDEF'.split('').map((l) => (
            <div key={l} className="small"><b>Grupo {l}:</b> {PAISES.filter((p) => p.grupo27 === l).map((p) => `${p.bandera} ${p.nombre}`).join(', ')}</div>
          ))}
        </section>
      );
    }
    const ko = m.partidos.filter((p) => !p.grupo);
    return (
      <>
        <section className="card stack">
          <h3>🏆 {m.nombre}</h3>
          <p className="small muted">{m.terminada ? `Campeón: ${nombrePais(ko.find((p) => p.fase === 'Final')!.ganador!)}.` : `${paisDe(foco).nombre}: ${faseAlcanzada(m, foco).toLowerCase()}.`} Pasan los 2 primeros de cada grupo y los 4 mejores terceros.</p>
          {Object.keys(m.grupos!).map((gr) => <Tabla key={gr} titulo={`Grupo ${gr}`} filas={tablaGrupo(m, gr)} pasan={2} foco={foco} />)}
        </section>
        {ko.length > 0 && (
          <section className="card stack">
            <h3>Eliminación</h3>
            {ko.map((p) => <Marcador key={p.id} p={p} id={foco} />)}
          </section>
        )}
      </>
    );
  }
  return (
    <section className="card stack">
      <h3>Nations Championship {g.temporada}</h3>
      <p className="small muted">Los 6 del Seis Naciones contra los 4 del Rugby Championship más Fiji y Japón: 3 partidos en julio (de local el sur), 3 en noviembre (de local el norte) y las finales en Londres.</p>
      <Tabla titulo="Norte" filas={tablaNC(g, g.temporada, 'N')} pasan={1} foco={foco} />
      <Tabla titulo="Sur" filas={tablaNC(g, g.temporada, 'S')} pasan={1} foco={foco} />
    </section>
  );
}
