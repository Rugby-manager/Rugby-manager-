import { useState } from 'react';
import { useGame } from './App';
import { DIV_NAME } from '../engine/game';
import { COPA_NOMBRE } from '../engine/cup';
import { capacidad } from '../engine/club';
import { overall, posText } from '../engine/players';
import { ClubJersey, Ovr, Seg, Sheet } from './common';
import { PlayerSheet } from './Squad';
import type { Club, GameState } from '../engine/types';
import { RECORD_LABEL, SELECCION, convocatoria, rivalOf, type RecordKey } from '../engine/extras';

type Sec = 'campeones' | 'clubes' | 'jugadores' | 'records' | 'seleccion' | 'premios';

export function EncycloScreen() {
  const [sec, setSec] = useState<Sec>('campeones');
  return (
    <>
      <h2>Enciclopedia</h2>
      <Seg
        label="Sección"
        value={sec}
        onChange={setSec}
        options={[
          { v: 'campeones', l: 'Campeones' },
          { v: 'clubes', l: 'Clubes' },
          { v: 'jugadores', l: 'Jugadores' },
        ]}
      />
      <Seg
        label="Más"
        value={sec}
        onChange={setSec}
        options={[
          { v: 'records', l: 'Récords' },
          { v: 'premios', l: 'Premios' },
          { v: 'seleccion', l: 'Selección' },
        ]}
      />
      {sec === 'campeones' && <Campeones />}
      {sec === 'clubes' && <Clubes />}
      {sec === 'jugadores' && <Jugadores />}
      {sec === 'records' && <Records />}
      {sec === 'seleccion' && <Seleccion />}
      {sec === 'premios' && <Premios />}
    </>
  );
}

function titulos(g: GameState, id: string) {
  const h = g.history;
  return {
    a: h.filter((r) => r.campeonA === id).length,
    b: h.filter((r) => r.campeonB === id).length,
    copa: h.filter((r) => r.campeonCopa === id).length,
    asc: h.filter((r) => r.asciende.includes(id) || r.ascC?.includes(id)).length,
    c: h.filter((r) => r.campeonC === id).length,
  };
}

function Campeones() {
  const { g } = useGame();
  const h = [...g.history].reverse();
  const c = (id?: string) => (id ? g.clubs[id] : null);
  return (
    <>
      {h.length === 0 && (
        <section className="card">
          <p className="muted" style={{ margin: 0 }}>Todavía no terminó ninguna temporada. Cuando termine la primera, acá vas a ver los campeones, los ascensos y los máximos tryman.</p>
        </section>
      )}
      {h.map((r) => (
        <section key={r.temporada} className="card stack">
          <h3>Temporada {r.temporada}</h3>
          <ChampRow label="Campeón de Primera A" club={c(r.campeonA)} />
          <ChampRow label="Subcampeón" club={c(r.subcampeonA)} />
          <ChampRow label="Campeón de Primera B" club={c(r.campeonB)} />
          {r.campeonC && <ChampRow label="Campeón de Primera C" club={c(r.campeonC)} />}
          {r.campeonCopa && <ChampRow label={COPA_NOMBRE} club={c(r.campeonCopa)} />}
          <div className="small">
            A Primera A: suben {r.asciende.map((id) => g.clubs[id].nombre).join(' y ')}; bajan {r.desciende.map((id) => g.clubs[id].nombre).join(' y ')}.
          </div>
          {r.ascC && (
            <div className="small">
              A Primera B: suben {r.ascC.map((id) => g.clubs[id].nombre).join(' y ')}; bajan {r.descB!.map((id) => g.clubs[id].nombre).join(' y ')}.
            </div>
          )}
          {r.maxTrymanA && (
            <div className="small muted">
              Máximo tryman de Primera A: {r.maxTrymanA.nombre} ({g.clubs[r.maxTrymanA.clubId]?.corto}), {r.maxTrymanA.tries} tries
            </div>
          )}
        </section>
      ))}
    </>
  );
}

function ChampRow({ label, club }: { label: string; club: Club | null }) {
  if (!club) return null;
  return (
    <div className="row">
      <ClubJersey club={club} size={28} />
      <div className="grow">
        <div className="label">{label}</div>
        <b>{club.nombre}</b>
      </div>
    </div>
  );
}

function Clubes() {
  const { g } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const clubs = Object.values(g.clubs).sort((a, b) => (a.division === b.division ? b.reputacion - a.reputacion : a.division < b.division ? -1 : 1));
  return (
    <>
      {(['A', 'B', 'C'] as const).map((d) => (
        <section key={d} className="card">
          <h3>{DIV_NAME[d]}</h3>
          <div className="list">
            {clubs
              .filter((c) => c.division === d)
              .map((c) => {
                const t = titulos(g, c.id);
                return (
                  <button key={c.id} className="li" onClick={() => setOpen(c.id)}>
                    <ClubJersey club={c} size={30} />
                    <div className="grow">
                      <div className="name">{c.nombre}</div>
                      <div className="small muted">
                        {c.ciudad}{t.a + t.b + t.c + t.copa ? ` · ${t.a + t.b + t.c + t.copa} títulos` : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </section>
      ))}
      {open && <ClubSheet id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ClubSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { g } = useGame();
  const c = g.clubs[id];
  const t = titulos(g, id);
  const top = c.plantel.map((x) => g.players[x]).sort((a, b) => overall(b) - overall(a)).slice(0, 8);
  const temporadas = g.history.map((r) => ({
    r,
    en: r.asciende.includes(id) || r.ascC?.includes(id) ? 'Ascendió' : r.desciende.includes(id) || r.descB?.includes(id) ? 'Descendió' : '',
  }));
  return (
    <Sheet
      title={
        <span className="row" style={{ gap: 8 }}>
          <ClubJersey club={c} size={30} />
          {c.nombre}
        </span>
      }
      onClose={onClose}
    >
      <div className="card stack">
        <div className="small">
          {c.ciudad} · Juega en {DIV_NAME[c.division]}
        </div>
        {rivalOf(g, c) && <div className="small">🔥 Su clásico: <b>{rivalOf(g, c)!.nombre}</b></div>}
        <div className="grid2 small">
          <div>
            <div className="label">Estadio</div>
            {capacidad(c).toLocaleString('es-AR')} lugares
          </div>
          <div>
            <div className="label">Tamaño del club</div>
            {c.reputacion >= 72 ? 'Grande' : c.reputacion >= 64 ? 'Mediano' : 'Chico'}
          </div>
        </div>
        <div className="label">Palmarés (desde que dirigís)</div>
        <div className="small">
          Primera A: {t.a} · Primera B: {t.b} · Primera C: {t.c} · {COPA_NOMBRE}: {t.copa} · Ascensos: {t.asc}
        </div>
        {temporadas.some((x) => x.en) && <div className="small muted">{temporadas.filter((x) => x.en).map((x) => `${x.en} en ${x.r.temporada}`).join(' · ')}</div>}
      </div>
      <div className="card">
        <h3>Sus mejores jugadores</h3>
        <div className="list">
          {top.map((p) => (
            <div key={p.id} className="li" style={{ cursor: 'default' }}>
              <Ovr v={overall(p)} />
              <div className="grow">
                <div className="name">
                  {p.nombre} {p.apellido}
                </div>
                <div className="small muted">
                  {posText(p)} · {p.edad} años
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function Jugadores() {
  const { g } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const [vista, setVista] = useState<'tries' | 'puntos' | 'carrera'>('tries');
  const all = Object.values(g.players).filter((p) => p.clubId);
  const list =
    vista === 'tries'
      ? all.sort((a, b) => b.temporada.tries - a.temporada.tries).slice(0, 20).map((p) => ({ p, v: p.temporada.tries, l: 'tries' }))
      : vista === 'puntos'
        ? all.sort((a, b) => b.temporada.puntos - a.temporada.puntos).slice(0, 20).map((p) => ({ p, v: p.temporada.puntos, l: 'pts' }))
        : all.sort((a, b) => b.carrera.tries - a.carrera.tries).slice(0, 20).map((p) => ({ p, v: p.carrera.tries, l: 'tries' }));
  return (
    <>
      <Seg
        label="Ranking"
        value={vista}
        onChange={setVista}
        options={[
          { v: 'tries', l: 'Tries' },
          { v: 'puntos', l: 'Puntos' },
          { v: 'carrera', l: 'Historia' },
        ]}
      />
      <section className="card">
        <h3>{vista === 'tries' ? 'Tryman de la temporada' : vista === 'puntos' ? 'Goleadores de la temporada' : 'Más tries en su carrera'}</h3>
        <div className="list">
          {list.map(({ p, v, l }, i) => (
            <button key={p.id} className="li" onClick={() => setOpen(p.id)} style={{ fontWeight: p.clubId === g.userClubId ? 700 : 400 }}>
              <span className="num label" style={{ width: 22 }}>{i + 1}</span>
              <ClubJersey club={g.clubs[p.clubId!]} size={24} />
              <div className="grow">
                <div className="name">
                  {p.nombre} {p.apellido}
                </div>
                <div className="small muted">
                  {g.clubs[p.clubId!].corto} · {posText(p)}
                </div>
              </div>
              <b className="num">
                {v} {l}
              </b>
            </button>
          ))}
        </div>
      </section>
      {open && <PlayerSheet g={g} p={g.players[open]} onClose={() => setOpen(null)} />}
    </>
  );
}

function Premios() {
  const { g } = useGame();
  const ps = g.premios ?? [];
  return (
    <section className="card">
      <h3>Premios</h3>
      {!ps.length && <p className="small muted">Al terminar cada temporada se eligen el mejor jugador y la revelación.</p>}
      {ps.map((t) => (
        <div key={t.temporada} className="stack" style={{ gap: 4, marginBottom: 10 }}>
          <div className="label">Temporada {t.temporada}</div>
          {t.premios.map((x) => (
            <div key={x.premio} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <span className="small muted">{x.premio}</span>
              <b className="small" style={{ textAlign: 'right' }}>{x.nombre} <span className="muted">({g.clubs[x.clubId]?.corto})</span></b>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function Records() {
  const { g } = useGame();
  const keys = Object.keys(RECORD_LABEL) as RecordKey[];
  return (
    <section className="card">
      <h3>Récords</h3>
      <p className="small muted" style={{ marginTop: 0 }}>Desde que dirigís en la liga. Cuando alguien bate uno, sale en las noticias.</p>
      <div className="list">
        {keys.map((k) => {
          const r = g.records?.[k];
          return (
            <div key={k} className="li" style={{ cursor: 'default' }}>
              <div className="grow">
                <div className="label">{RECORD_LABEL[k]}</div>
                <div className="small">{r ? r.texto : <span className="muted">Todavía nadie.</span>}</div>
              </div>
              {r && <span className="small muted">{r.temporada}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Seleccion() {
  const { g } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const s = g.seleccion;
  const ids = s?.temporada === g.temporada ? s.ids : convocatoria(g);
  const lista = ids.map((id) => g.players[id]).filter(Boolean);
  return (
    <>
      <section className="card stack">
        <h3>{SELECCION.charAt(0).toUpperCase() + SELECCION.slice(1)}</h3>
        <p className="small muted" style={{ margin: 0 }}>
          {s?.temporada === g.temporada
            ? `Convocados de esta temporada. En el test de mitad de año ${s.resultado} contra ${s.rival}.`
            : 'Así sería la lista si convocaran hoy. La convocatoria es en la fecha 9: los citados vuelven cansados pero con la moral alta, y tu club cobra una compensación por cada uno.'}
        </p>
      </section>
      <section className="card">
        <div className="list">
          {lista.map((p) => (
            <button key={p.id} className="li" onClick={() => setOpen(p.id)} style={{ fontWeight: p.clubId === g.userClubId ? 700 : 400 }}>
              <Ovr v={overall(p)} />
              <div className="grow">
                <div className="name">
                  {p.nombre} {p.apellido}
                </div>
                <div className="small muted">
                  {posText(p)} · {p.clubId ? g.clubs[p.clubId].corto : 'Libre'}
                  {p.caps ? ` · ${p.caps} ${p.caps === 1 ? 'partido' : 'partidos'} en ${SELECCION}` : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
      {open && <PlayerSheet g={g} p={g.players[open]} onClose={() => setOpen(null)} />}
    </>
  );
}
