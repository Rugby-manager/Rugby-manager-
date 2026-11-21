import { captainOf } from '../engine/extras';
import { useEffect, useState } from 'react';
import { useGame } from './App';
import { POS_LABEL, POS_ORDER, SHIRT_LABEL, SHIRT_POS, bestXV, fitKind, overall, posText, slotRating } from '../engine/players';
import { Ovr, Seg, Sheet, Stars, ovrColor, toStars } from './common';
import type { Ataque, Defensa, JuegoPie, Player } from '../engine/types';

// Dónde se para cada camiseta en la cancha (centro de la tarjeta, en % del ancho y alto).
const SPOTS: [number, number][] = [
  [17, 5], [50, 5], [83, 5],
  [33, 15], [67, 15],
  [17, 26], [83, 26], [50, 29],
  [38, 41],
  [56, 52],
  [17, 68], [64, 63], [74, 75], [83, 88],
  [38, 93],
];

export function TeamScreen() {
  const { g, refresh, toast, sub } = useGame();
  useEffect(() => {
    if (sub === 'tactica') document.getElementById('tactica')?.scrollIntoView({ block: 'start' });
  }, [sub]);
  const club = g.clubs[g.userClubId];
  const [slot, setSlot] = useState<number | null>(null);
  // Cambio rápido: tocás uno (camiseta o suplente) y después el otro.
  const [sel, setSel] = useState<{ slot?: number; bench?: string } | null>(null);
  const players = club.xv.map((id) => (id ? g.players[id] : null));
  const inXV = new Set(club.xv.filter(Boolean) as string[]);
  const bench = club.plantel.map((id) => g.players[id]).filter((p) => !inXV.has(p.id));
  bench.sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || overall(b) - overall(a));

  const putInSlot = (i: number, id: string) => {
    const xv = [...club.xv];
    const prev = xv.indexOf(id);
    if (prev >= 0) xv[prev] = xv[i];
    xv[i] = id;
    club.xv = xv;
  };
  const tapSlot = (i: number) => {
    if (!sel) return setSel({ slot: i });
    if (sel.slot === i) return setSel(null);
    // Dos titulares: intercambian los puestos.
    if (sel.slot !== undefined) {
      const xv = [...club.xv];
      const a = xv[sel.slot];
      const b = xv[i];
      xv[sel.slot] = b;
      xv[i] = a;
      club.xv = xv;
      const na = a ? g.players[a].apellido : null;
      const nb = b ? g.players[b].apellido : null;
      toast(na && nb ? `${na} pasa a la ${i + 1} y ${nb} a la ${sel.slot + 1}` : `${na ?? nb} pasa a la ${na ? i + 1 : sel.slot + 1}`);
      setSel(null);
      refresh();
      return;
    }
    if (sel.bench) {
      const p = g.players[sel.bench];
      if (p.lesion > 0) return toast(`${p.apellido} está lesionado`);
      const out = club.xv[i] ? g.players[club.xv[i]!].apellido : 'nadie';
      putInSlot(i, sel.bench);
      toast(`Entra ${p.apellido} por ${out}`);
    }
    setSel(null);
    refresh();
  };
  const tapBench = (id: string) => {
    if (sel?.slot !== undefined) {
      const p = g.players[id];
      if (p.lesion > 0) return toast(`${p.apellido} está lesionado`);
      const out = club.xv[sel.slot] ? g.players[club.xv[sel.slot]!].apellido : 'nadie';
      putInSlot(sel.slot, id);
      toast(`Entra ${p.apellido} por ${out}`);
      setSel(null);
      refresh();
      return;
    }
    setSel(sel?.bench === id ? null : { bench: id });
  };

  const fwd = avg(players.slice(0, 8).map((p, i) => (p ? slotRating(p, i) : 0)));
  const bks = avg(players.slice(8).map((p, i) => (p ? slotRating(p, i + 8) : 0)));
  const kicker = players.reduce<Player | null>((b, p) => (p && (!b || p.attrs.pie > b.attrs.pie) ? p : b), null);
  const problems = players.filter((p, i) => !p || p.lesion > 0 || fitKind(p, SHIRT_POS[i]) === 'fuera').length;

  const t = club.tactica;
  const setT = (patch: Partial<typeof t>) => {
    club.tactica = { ...t, ...patch };
    refresh();
  };

  return (
    <>
      <div className="row">
        <h2 style={{ flex: 1 }}>El XV</h2>
        <button
          className="btn small"
          onClick={() => {
            club.xv = bestXV(club, g.players);
            refresh();
            toast('El ayudante armó el mejor XV disponible');
          }}
        >
          Mejor XV automático
        </button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        Tocá un jugador y después otro titular para que cambien de puesto, o un suplente de la lista de abajo para que entre. Las estrellas (de 1 a 5) muestran cuánto rinde cada uno en ese puesto, y la barrita es su energía.
      </p>
      {sel && (
        <div className="swapbar" role="status">
          <span>
            {sel.slot !== undefined
              ? `Elegiste a ${players[sel.slot]?.apellido ?? 'la camiseta ' + (sel.slot + 1)}. Tocá otro titular para cambiarlos de puesto, o un suplente para que entre.`
              : `Elegiste a ${g.players[sel.bench!].apellido}. Ahora tocá la camiseta donde entra.`}
          </span>
          {sel.slot !== undefined && (
            <button className="btn small" onClick={() => { setSlot(sel.slot!); setSel(null); }}>
              Ver lista
            </button>
          )}
          <button className="btn small" onClick={() => setSel(null)}>
            Cancelar
          </button>
        </div>
      )}
      <div className="pitch pitch-cards">
        <svg className="lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g stroke="#fff" strokeWidth="0.5" vectorEffect="non-scaling-stroke" fill="none">
            <line x1="0" y1="35" x2="100" y2="35" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1="72" x2="100" y2="72" vectorEffect="non-scaling-stroke" opacity="0.8" />
            <line x1="8" y1="0" x2="8" y2="100" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.7" />
            <line x1="92" y1="0" x2="92" y2="100" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.7" />
            <line x1="25" y1="0" x2="25" y2="100" strokeDasharray="1.5 4" vectorEffect="non-scaling-stroke" opacity="0.5" />
            <line x1="75" y1="0" x2="75" y2="100" strokeDasharray="1.5 4" vectorEffect="non-scaling-stroke" opacity="0.5" />
            <line x1="0" y1="54" x2="100" y2="54" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" opacity="0.6" />
          </g>
        </svg>
        <span className="mark" style={{ top: '35%', left: '1%' }}>22</span>
        <span className="mark" style={{ top: '35%', right: '1%' }}>22</span>
        {SPOTS.map(([x, y], i) => {
          const p = players[i];
          const r = p ? slotRating(p, i) : 0;
          const warn = !p || p.lesion > 0 || fitKind(p, SHIRT_POS[i]) === 'fuera';
          return (
            <button key={i} className={`slot ${warn ? 'warn' : ''} ${sel?.slot === i ? 'picked' : ''} ${sel?.bench ? 'target' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} onClick={() => tapSlot(i)} aria-label={`Camiseta ${i + 1}, ${SHIRT_LABEL[i]}: ${p ? p.apellido : 'vacía'}`}>
              <span className="pc-top">
                <span className="pc-n num">{i + 1}</span>
                <span className="pc-name">
                  <span className="sn">{p ? p.apellido : 'Vacío'}</span>
                </span>
              </span>
              <span className="pc-bot">
              <span className="pc-stars">{p ? <Stars n={toStars(r)} /> : null}</span>
              <span className="pc-bars" title={p ? `Energía ${p.energia}%` : undefined}>
                {[0, 1, 2, 3, 4].map((k) => {
                  const on = p ? p.energia > k * 20 + 5 : false;
                  const col = !p ? '' : p.energia >= 70 ? 'g' : p.energia >= 45 ? 'y' : 'r';
                  return <span key={k} className={`seg5 ${on ? col : ''}`} />;
                })}
              </span>
              </span>
            </button>
          );
        })}
      </div>
      <section className="card" style={{ padding: '0 10px 8px' }}>
        <h3>Banco y resto del plantel</h3>
        <table className="sq">
          <thead>
            <tr>
              <th>Nº</th>
              <th className="l">Jugador</th>
              <th>Nivel</th>
              <th>EF</th>
              <th>ME</th>
            </tr>
          </thead>
          <tbody>
            {bench.map((p) => {
              const o = overall(p);
              const fit = sel?.slot !== undefined ? fitKind(p, SHIRT_POS[sel.slot]) : null;
              const r = sel?.slot !== undefined ? Math.round(slotRating(p, sel.slot)) : null;
              return (
                <tr key={p.id} className={`pl ${sel?.bench === p.id ? 'picked' : ''}`} onClick={() => tapBench(p.id)} style={{ opacity: p.lesion > 0 ? 0.5 : 1 }}>
                  <td>
                    <span className="dor num">{p.dorsal || '–'}</span>
                  </td>
                  <td className="nm">
                    <b>
                      {p.apellido}
                      {p.lesion > 0 && <span style={{ color: 'var(--loss)' }}> ✚{p.lesion}</span>}
                    </b>
                    <small>
                      {fit ? (fit === 'natural' ? '✓ Su puesto' : fit === 'secundario' ? '✓ Puesto secundario' : 'Fuera de puesto') + ` · rinde ${r}` : `${POS_LABEL[p.pos]}${p.pos2.length ? ' / ' + p.pos2.map((x) => POS_LABEL[x]).join(' / ') : ''}`}
                    </small>
                  </td>
                  <td>
                    <Stars n={toStars(o)} />
                  </td>
                  <td>
                    <span className="cell-num lcd num">{p.energia}</span>
                  </td>
                  <td>
                    <span className="cell-num lcd num" style={{ color: ovrColor(o) }}>{o}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      {problems > 0 && <div className="notice">Hay {problems} {problems === 1 ? 'jugador' : 'jugadores'} fuera de sus puestos, lesionados o lugares vacíos (en rojo). Jugar en un puesto secundario casi no resta.</div>}
      <section className="card">
        <h3>Fuerza del equipo</h3>
        <div className="row" style={{ justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div className="label">Forwards</div>
            <Ovr v={fwd} />
          </div>
          <div>
            <div className="label">Backs</div>
            <Ovr v={bks} />
          </div>
          <div>
            <div className="label">Pateador</div>
            <Ovr v={kicker?.attrs.pie ?? 0} />
            <div className="small muted">{kicker?.apellido}</div>
          </div>
        </div>
      </section>
      <CaptainCard />
      <section className="card stack" id="tactica">
        <h3>Táctica</h3>
        <div className="stack" style={{ gap: 6 }}>
          <div className="label">Ataque</div>
          <Seg<Ataque>
            label="Ataque"
            value={t.ataque}
            onChange={(v) => setT({ ataque: v })}
            options={[
              { v: 'forwards', l: 'Forwards' },
              { v: 'equilibrado', l: 'Equilibrado' },
              { v: 'abrir', l: 'Abrir la pelota' },
            ]}
          />
          <p className="small muted" style={{ margin: 0 }}>
            {t.ataque === 'forwards' ? 'Juego cerrado con maul y pick and go. Rinde si tus forwards son fuertes y saca más penales.' : t.ataque === 'abrir' ? 'Mover la pelota hacia los backs. Más tries si tus backs son rápidos, pero menos penales.' : 'Mezcla de las dos cosas.'}
          </p>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <div className="label">Juego con el pie</div>
          <Seg<JuegoPie>
            label="Juego con el pie"
            value={t.pie}
            onChange={(v) => setT({ pie: v })}
            options={[
              { v: 'poco', l: 'Poco' },
              { v: 'medio', l: 'Medio' },
              { v: 'mucho', l: 'Mucho' },
            ]}
          />
          <p className="small muted" style={{ margin: 0 }}>
            {t.pie === 'mucho' ? 'Ganar territorio y vivir de los penales y los drops. Ideal con un buen pateador.' : t.pie === 'poco' ? 'Retener la pelota y buscar el try. Menos penales a los palos.' : 'Patear cuando conviene.'}
          </p>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <div className="label">Defensa</div>
          <Seg<Defensa>
            label="Defensa"
            value={t.defensa}
            onChange={(v) => setT({ defensa: v })}
            options={[
              { v: 'conservadora', l: 'Conservadora' },
              { v: 'equilibrada', l: 'Equilibrada' },
              { v: 'agresiva', l: 'Agresiva' },
            ]}
          />
          <p className="small muted" style={{ margin: 0 }}>
            {t.defensa === 'agresiva' ? 'Subir rápido a tacklear: concedés menos tries pero más penales y amarillas.' : t.defensa === 'conservadora' ? 'Línea ordenada y sin riesgos: pocas faltas, pero te pueden quebrar más.' : 'Ni mucho ni poco.'}
          </p>
        </div>
      </section>
      {slot !== null && (
        <PickPlayer
          slot={slot}
          onClose={() => setSlot(null)}
          onPick={(id) => {
            const xv = [...club.xv];
            const out = xv[slot] ? g.players[xv[slot]!].apellido : 'nadie';
            xv[slot] = id;
            club.xv = xv;
            setSlot(null);
            toast(`Entra ${g.players[id].apellido} por ${out}`);
            refresh();
          }}
        />
      )}
    </>
  );
}

function avg(a: number[]) {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
}

function PickPlayer({ slot, onClose, onPick }: { slot: number; onClose: () => void; onPick: (id: string) => void }) {
  const { g } = useGame();
  const club = g.clubs[g.userClubId];
  const list = club.plantel
    .map((id) => g.players[id])
    // Solo los que no están en cancha: suplentes y resto del plantel.
    .filter((p) => !club.xv.includes(p.id))
    .map((p) => ({ p, r: slotRating(p, slot) }))
    .sort((a, b) => (a.p.lesion > 0 ? 1 : 0) - (b.p.lesion > 0 ? 1 : 0) || b.r - a.r);
  return (
    <Sheet title={`Camiseta ${slot + 1} · ${SHIRT_LABEL[slot]}`} onClose={onClose}>
      <p className="small muted" style={{ margin: 0 }}>
        Solo jugadores que no están en cancha, ordenados por cuánto rinden en este puesto.
      </p>
      <div className="card" style={{ padding: '4px 12px' }}>
        <div className="list">
          {list.map(({ p, r }) => (
            <button key={p.id} className="li" disabled={p.lesion > 0} style={{ opacity: p.lesion > 0 ? 0.5 : 1 }} onClick={() => onPick(p.id)}>
              <span className="ovr num" style={{ background: ovrColor(r) }}>
                {Math.round(r)}
              </span>
              <div className="grow">
                <div className="name">
                  {p.nombre} {p.apellido}
                </div>
                <div className="small muted">
                  {fitKind(p, SHIRT_POS[slot]) === 'natural' ? '✓ Su puesto' : fitKind(p, SHIRT_POS[slot]) === 'secundario' ? '✓ Puesto secundario' : posText(p)} · Media {overall(p)} · Energía {p.energia}%
                  {p.lesion > 0 ? ' · Lesionado' : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/** Elegir capitán: suma liderazgo mientras está en cancha. */
function CaptainCard() {
  const { g, refresh } = useGame();
  const club = g.clubs[g.userClubId];
  const actual = captainOf(club, g.players);
  const xv = club.xv.filter((id): id is string => !!id && !!g.players[id]).map((id) => g.players[id]);
  xv.sort((a, b) => b.attrs.liderazgo - a.attrs.liderazgo);
  const pick = (id: string | null) => {
    club.capitan = id;
    refresh();
  };
  return (
    <section className="card stack">
      <h3>Capitán</h3>
      <p className="small muted" style={{ margin: 0 }}>
        Con el capitán en cancha el equipo juega más ordenado (pesa su liderazgo) y las charlas le llegan mejor al plantel.
        {!club.capitan && ' Ahora lo elige el cuerpo técnico: el de más liderazgo del XV.'}
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        <button className="chip" aria-pressed={!club.capitan} onClick={() => pick(null)}>
          Automático
        </button>
        {xv.slice(0, 7).map((p) => (
          <button key={p.id} className="chip" aria-pressed={club.capitan === p.id} onClick={() => pick(p.id)}>
            {actual === p.id ? '©️ ' : ''}
            {p.apellido} <span className="num">{p.attrs.liderazgo}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
