// La cantera: M19 (tabla, plantel, inversión y entrenador) y los pibes que encontró el ojeador.
import { useState } from 'react';
import { useGame } from './App';
import { Ovr, Stars, formatMoney } from './common';
import { overall, posText } from '../engine/players';
import { staffEstrellas, nombreStaff } from '../engine/club';
import { promoteYouth, releaseYouth } from '../engine/cup';
import {
  EDAD_MAX_M19, INVERSION, cederPibe, costoCantera, destacadosM19, pibesM19, setInversion, soltarPibe, subirAPrimera, sumarAM19, tablaM19, type Inversion,
} from '../engine/m19';
import { PERSONALIDAD } from '../engine/personalidad';
import type { Player } from '../engine/types';

function useRun() {
  const { refresh, toast } = useGame();
  return (f: () => string) => {
    try {
      const m = f();
      if (m) toast(m);
      refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  };
}

/** Cuánto puede crecer: con buen entrenador de juveniles se sabe mejor. */
function Techo({ p, nivel }: { p: Player; nivel: number }) {
  const s = Math.max(0, Math.min(5, (p.potencial - 50) / 8));
  if (nivel >= 3) return <Stars n={Math.round(s * 2) / 2} />;
  const err = nivel >= 1 ? 1 : 1.5;
  return (
    <span className="small">
      entre <Stars n={Math.max(0, Math.round((s - err) * 2) / 2)} /> y <Stars n={Math.min(5, Math.round((s + err) * 2) / 2)} />
    </span>
  );
}

export function PersBadge({ p }: { p: Player }) {
  if (!p.personalidad) return null;
  const x = PERSONALIDAD[p.personalidad];
  return (
    <span className={`pers pers-${p.personalidad}`} title={x.texto}>
      {x.icono} {x.label}
    </span>
  );
}

export function Juveniles() {
  const { g, go } = useGame();
  const run = useRun();
  const [verTodos, setVerTodos] = useState(false);
  const c = g.clubs[g.userClubId];
  const m = g.m19;
  if (!m) return null;
  const entrenador = staffEstrellas(c, 'juveniles');
  const tabla = tablaM19(g);
  const pibes = pibesM19(g);
  const lista = verTodos ? pibes : pibes.slice(0, 8);
  const ojeador = staffEstrellas(c, 'ojeador');
  const encontrados = g.juveniles.map((id) => g.players[id]).filter(Boolean);
  const miPuesto = tabla.findIndex((r) => r.clubId === c.id) + 1;
  return (
    <>
      <section className="card stack m19-hd">
        <h3>🌱 M19 de {c.nombre}</h3>
        <p className="small" style={{ margin: 0 }}>
          Los pibes de 16 a 19 años. Juegan solos cada fecha. Vos elegís el entrenador, cuánta plata le ponés y a quién subís a Primera.
        </p>
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div className="label">Entrenador de juveniles</div>
            {entrenador ? (
              <>
                <b>{nombreStaff(c, 'juveniles')}</b> <Stars n={entrenador} />
              </>
            ) : (
              <span className="small muted">No tenés: los pibes mejoran más lento.</span>
            )}
          </div>
          <button className="btn small" onClick={() => go('club', 'empleados')}>
            {entrenador ? 'Cambiar' : 'Contratar'}
          </button>
        </div>
        <div className="label">Plata para la cantera</div>
        <div className="seg" role="group" aria-label="Inversión en la cantera">
          {(Object.keys(INVERSION) as Inversion[]).map((k) => (
            <button key={k} aria-pressed={m.inversion === k} onClick={() => run(() => setInversion(g, k))}>
              {INVERSION[k].label}
            </button>
          ))}
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          {INVERSION[m.inversion].texto} {costoCantera(g) ? `Cuesta ${formatMoney(costoCantera(g))} por fecha.` : ''}
        </p>
      </section>

      <section className="card">
        <h3>Torneo M19 · {miPuesto}.º</h3>
        <div className="tablewrap">
          <table className="std">
            <thead>
              <tr>
                <th>#</th>
                <th style={{ textAlign: 'left' }}>Club</th>
                <th>PJ</th>
                <th>PG</th>
                <th>Dif</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {tabla.map((r, i) => (
                <tr key={r.clubId} className={r.clubId === c.id ? 'me' : ''}>
                  <td className={`pos ${i === 0 ? 'z-up' : ''}`}>{i + 1}</td>
                  <td className="club">{g.clubs[r.clubId]?.nombre}</td>
                  <td>{r.pj}</td>
                  <td>{r.pg}</td>
                  <td>{r.pf - r.pc}</td>
                  <td>
                    <b>{r.pts}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {m.partidos.length > 0 && (
          <div className="row" style={{ gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
            {m.partidos.map((x) => (
              <span key={x.round} className={`pill ${x.pf > x.pc ? 'win' : x.pf < x.pc ? 'loss' : 'draw'}`} title={`vs ${g.clubs[x.rival]?.nombre}`}>
                {x.pf}-{x.pc} {g.clubs[x.rival]?.corto}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="card stack">
        <h3>Los pibes ({pibes.length})</h3>
        <p className="small muted" style={{ margin: 0 }}>
          Los de {EDAD_MAX_M19} años están en su último año: si no los subís o los cedés, al terminar la temporada se van. Los que subís a Primera cobran {formatMoney(25_000)} por fecha.
        </p>
        {lista.map((p) => (
          <div key={p.id} className="m19-pibe">
            <Ovr v={overall(p)} />
            <div className="grow" style={{ minWidth: 0 }}>
              <b>
                {p.nombre} {p.apellido}
              </b>
              <div className="small muted">
                {posText(p)} · {p.edad} años{p.edad >= EDAD_MAX_M19 && <b style={{ color: 'var(--loss)' }}> · último año</b>} <PersBadge p={p} />
              </div>
              <div className="small">
                Puede llegar a: <Techo p={p} nivel={entrenador} />
              </div>
            </div>
            <button className="btn small primary" onClick={() => run(() => subirAPrimera(g, p.id))}>
              Subir
            </button>
          </div>
        ))}
        {pibes.length > 8 && (
          <button className="btn small" onClick={() => setVerTodos(!verTodos)}>
            {verTodos ? 'Ver menos' : `Ver los ${pibes.length}`}
          </button>
        )}
      </section>

      <section className="card stack">
        <h3>Pibes que encontró el ojeador</h3>
        <p className="small muted" style={{ margin: 0 }}>
          {ojeador === 0
            ? 'No tenés ojeador: estos pibes llegaron solos al club. Contratá uno en Empleados para encontrar más y mejores.'
            : `Tu ojeador tiene ${ojeador} ${ojeador === 1 ? 'estrella' : 'estrellas'}.`}{' '}
          Podés sumarlos a la M19 o subirlos directo a Primera. Los que no elijas se van al terminar la temporada.
        </p>
      </section>
      {encontrados.length === 0 && <p className="small" style={{ color: 'var(--on-bg)' }}>No quedan pibes del ojeador por ahora. Llegan nuevos al empezar la temporada.</p>}
      {encontrados.map((p) => (
        <section key={p.id} className="card stack">
          <div className="m19-pibe">
            <Ovr v={overall(p)} />
            <div className="grow">
              <b>
                {p.nombre} {p.apellido}
              </b>
              <div className="small muted">
                {posText(p)} · {p.edad} años · Actitud {p.attrs.actitud} <PersBadge p={p} />
              </div>
            </div>
          </div>
          <div className="small">
            Puede llegar a: <Techo p={p} nivel={Math.round(ojeador * 0.6)} />
          </div>
          <div className="grid3">
            <button className="btn small" onClick={() => run(() => (releaseYouth(g, p.id), `${p.apellido} vuelve a su club de origen.`))}>
              Dejarlo ir
            </button>
            <button className="btn small" disabled={p.edad > EDAD_MAX_M19} onClick={() => run(() => sumarAM19(g, p.id))}>
              A la M19
            </button>
            <button className="btn small primary" onClick={() => run(() => promoteYouth(g, p.id))}>
              A Primera
            </button>
          </div>
        </section>
      ))}
    </>
  );
}

/** En el fin de temporada: los mejores pibes de la M19 y qué hacés con cada uno. */
export function DecisionM19() {
  const { g, go } = useGame();
  const run = useRun();
  const m = g.m19;
  if (!m) return null;
  const ds = destacadosM19(g);
  const tabla = tablaM19(g);
  const puesto = tabla.findIndex((r) => r.clubId === g.userClubId) + 1;
  return (
    <section className="card stack">
      <h3>🌱 La M19: ¿qué hacés con los pibes?</h3>
      <p className="small muted" style={{ margin: 0 }}>
        Tu M19 terminó {puesto}.º. Estos son los mejores. Subilos a Primera, cedelos un año a otro club para que sumen minutos, o dejalos un año más en la M19 (los de {EDAD_MAX_M19} ya no pueden seguir: si no decidís, se van).
      </p>
      {ds.length === 0 && <p className="small">No quedan pibes para decidir.</p>}
      {ds.map((p) => {
        const ultimo = p.edad >= EDAD_MAX_M19;
        return (
          <div key={p.id} className="stack cand" style={{ gap: 6 }}>
            <div className="row" style={{ gap: 8 }}>
              <Ovr v={overall(p)} />
              <div className="grow" style={{ minWidth: 0 }}>
                <b>
                  {p.nombre} {p.apellido}
                </b>
                <div className="small muted">
                  {posText(p)} · {p.edad} años <PersBadge p={p} />
                </div>
              </div>
            </div>
            <div className="grid3">
              <button className="btn small primary" onClick={() => run(() => subirAPrimera(g, p.id))}>
                A Primera
              </button>
              <button className="btn small" onClick={() => run(() => cederPibe(g, p.id))}>
                Cederlo
              </button>
              {ultimo ? (
                <button className="btn small" onClick={() => run(() => soltarPibe(g, p.id))}>
                  Dejarlo ir
                </button>
              ) : (
                <button className="btn small" disabled>
                  Sigue en M19
                </button>
              )}
            </div>
          </div>
        );
      })}
      <button className="btn small" onClick={() => go('club', 'juveniles')}>
        Ver toda la M19
      </button>
    </section>
  );
}
