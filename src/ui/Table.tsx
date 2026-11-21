import { useState } from 'react';
import { useGame } from './App';
import { DIV_NAME, DIVS, hasC, standings } from '../engine/game';
import { ClubJersey } from './common';
import type { DivId } from '../engine/types';

export function TableScreen() {
  const { g } = useGame();
  const club = g.clubs[g.userClubId];
  const [div, setDiv] = useState<DivId>(club.division);
  const rows = standings(g, div);
  const zone = (i: number) => {
    if (div === 'A') return i < 4 ? 'z-po' : i === 6 || i === 7 ? 'z-promo' : i >= 8 ? 'z-down' : '';
    if (div === 'B') return i < 2 ? 'z-up' : i < 4 ? 'z-promo' : hasC(g) && (i === 6 || i === 7) ? 'z-promo' : hasC(g) && i >= 8 ? 'z-down' : '';
    return i < 2 ? 'z-up' : i < 4 ? 'z-promo' : '';
  };
  const scorers = Object.values(g.players)
    .filter((p) => p.clubId && g.clubs[p.clubId].division === div && p.temporada.tries > 0)
    .sort((a, b) => b.temporada.tries - a.temporada.tries || b.temporada.puntos - a.temporada.puntos)
    .slice(0, 5);

  return (
    <>
      <div className="row">
        <h2 style={{ flex: 1 }}>Posiciones</h2>
      </div>
      <div className="chips" role="group" aria-label="División">
        {DIVS.map((d) => (
          <button key={d} className="chip" aria-pressed={div === d} onClick={() => setDiv(d)}>
            {DIV_NAME[d]}
          </button>
        ))}
      </div>
      <section className="card nightcard">
        <div className="tablewrap night">
          <table className="std noche">
            <thead>
              <tr>
                <th>#</th>
                <th style={{ textAlign: 'left' }}>Club</th>
                <th title="Partidos jugados">PJ</th>
                <th title="Ganados">G</th>
                <th title="Empatados">E</th>
                <th title="Perdidos">P</th>
                <th title="Diferencia de tantos">Dif</th>
                <th title="Tries a favor">TR</th>
                <th title="Puntos bonus">BO</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const c = g.clubs[r.clubId];
                return (
                  <tr key={r.clubId} className={r.clubId === club.id ? 'me' : ''}>
                    <td className="pos">
                      <span className={`badge ${zone(i)}`}>{i + 1}</span>
                    </td>
                    <td className="club">
                      <span className="row" style={{ gap: 6 }}>
                        <ClubJersey club={c} size={22} />
                        {c.nombre}
                      </span>
                    </td>
                    <td>{r.pj}</td>
                    <td>{r.pg}</td>
                    <td>{r.pe}</td>
                    <td>{r.pp}</td>
                    <td>{r.pf - r.pc > 0 ? `+${r.pf - r.pc}` : r.pf - r.pc}</td>
                    <td>{r.tf}</td>
                    <td>{r.bo + r.bd}</td>
                    <td className="pts">{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="legend" style={{ marginTop: 10 }}>
          {div === 'A' ? (
            <>
              <span><i style={{ background: 'var(--zone-po)' }} />Playoffs por el título</span>
              <span><i style={{ background: 'var(--zone-promo)' }} />Repechaje (7.º y 8.º)</span>
              <span><i style={{ background: 'var(--zone-down)' }} />Descienden (9.º y 10.º)</span>
            </>
          ) : (
            <>
              <span><i style={{ background: 'var(--zone-up)' }} />Ascienden (1.º y 2.º)</span>
              <span><i style={{ background: 'var(--zone-promo)' }} />Repechaje</span>
              {div === 'B' && hasC(g) && <span><i style={{ background: 'var(--zone-down)' }} />Descienden (9.º y 10.º)</span>}
            </>
          )}
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Puntos: 4 por ganar, 2 por empatar, +1 bonus por hacer 4 tries o más y +1 bonus por perder por 7 o menos.
        </p>
      </section>
      <section className="card">
        <h3>Máximos tryman</h3>
        {scorers.length === 0 ? (
          <p className="muted small">Todavía no hay tries.</p>
        ) : (
          <div className="list">
            {scorers.map((p, i) => (
              <div key={p.id} className="li" style={{ cursor: 'default' }}>
                <span className="num" style={{ width: 20, fontWeight: 700 }}>{i + 1}</span>
                <ClubJersey club={g.clubs[p.clubId!]} size={24} />
                <span className="grow name">
                  {p.nombre} {p.apellido}
                </span>
                <b className="num">{p.temporada.tries}</b>
              </div>
            ))}
          </div>
        )}
      </section>
      {g.history.length > 0 && (
        <section className="card">
          <h3>Historial de campeones</h3>
          <div className="list">
            {[...g.history].reverse().map((h) => (
              <div key={h.temporada} className="li" style={{ cursor: 'default' }}>
                <span className="num" style={{ fontWeight: 700, width: 44 }}>{h.temporada}</span>
                <ClubJersey club={g.clubs[h.campeonA]} size={24} />
                <span className="grow name">{g.clubs[h.campeonA].nombre}</span>
                <span className="small muted">B: {g.clubs[h.campeonB].corto}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
