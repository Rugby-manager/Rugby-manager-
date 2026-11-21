import { useState } from 'react';
import { BENCH_SHIRT, SHIRT_POS, overall } from '../engine/players';
import type { LiveMatch, SideKey } from '../engine/match';
import type { Player } from '../engine/types';
import { ovrColor, Seg } from './common';
import { useGame } from './App';

const CORTO = { PIL: 'PIL', HOO: 'HOO', SEG: '2ªL', TER: '3ªL', MSC: 'MED', APE: 'APE', CEN: 'CEN', WIN: 'WIN', FUL: 'FUL' } as const;

/** Titulares (1-15) y suplentes (16-23) en vivo. Tocás al que sale y después al que entra. */
export function LiveLineup({ live, userSide, onChange }: { live: LiveMatch; userSide: SideKey; onChange: () => void }) {
  const { toast } = useGame();
  const [view, setView] = useState<SideKey>(userSide);
  const [sel, setSel] = useState<number | null>(null);
  const s = live.side(view);
  const mine = view === userSide && !live.finished;

  const tapField = (i: number) => {
    if (!mine) return;
    if (live.isOff(s, i)) return toast(s.rojas.includes(i) ? 'Está expulsado: no se puede reemplazar' : 'Está cumpliendo la amarilla: esperá que vuelva');
    setSel(sel === i ? null : i);
  };
  const tapBench = (p: Player) => {
    if (!mine) return;
    if (sel === null) return toast('Primero tocá al jugador que sale');
    const out = s.xv[sel];
    const err = live.substitute(view, sel, p.id);
    if (err) return toast(err);
    toast(`Entra ${p.apellido}${out ? ` por ${out.apellido}` : ''}`);
    setSel(null);
    onChange();
  };

  const energyBar = (id: string) => {
    const e = Math.round(live.energia.get(id) ?? 100);
    return (
      <span className="lu-en" title={`Energía ${e}`}>
        <span style={{ width: `${e}%`, background: e >= 75 ? 'var(--lcd-fg)' : e >= 55 ? '#ffcc1a' : '#ff5a3a' }} />
      </span>
    );
  };
  const cmpTo = sel !== null ? live.liveRating(s.xv[sel] ?? ({} as Player), sel) : null;

  return (
    <div className="card lu">
      <div className="lu-head">
        <h3>Formaciones</h3>
        <Seg
          label="Equipo"
          value={view}
          onChange={(v) => {
            setView(v);
            setSel(null);
          }}
          options={[
            { v: 'H', l: live.H.club.corto },
            { v: 'A', l: live.A.club.corto },
          ]}
        />
      </div>
      {mine && (
        <p className="lu-help small" style={{ marginTop: 0 }}>
          {sel === null ? 'Cambios: tocá al titular que sale y después al suplente que entra.' : `Sale ${s.xv[sel]?.apellido ?? 'la ' + (sel + 1)}. Ahora tocá al suplente que entra.`}
        </p>
      )}
      <div className="lu-cols">
        <div>
          <div className="lu-title">En cancha</div>
          {s.xv.map((p, i) => {
            const off = live.isOff(s, i);
            const red = s.rojas.includes(i);
            return (
              <button key={i} className={`lu-row ${sel === i ? 'picked' : ''} ${off ? 'amarilla' : ''} ${red ? 'salio' : ''}`} onClick={() => tapField(i)} disabled={!mine}>
                <span className="lu-n num">{i + 1}</span>
                <span className="lu-nm">
                  <b>
                    {p ? p.apellido : '—'}
                    {red ? <i className="lu-tag out"> ▮</i> : off ? <i className="lu-tag yel"> ▮</i> : null}
                  </b>
                  <small>
                    {CORTO[SHIRT_POS[i]]}
                    {p && energyBar(p.id)}
                  </small>
                </span>
                {p && (
                  <span className="lu-o num" style={{ color: ovrColor(live.liveRating(p, i)) }}>
                    {Math.round(live.liveRating(p, i))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div>
          <div className="lu-title">Suplentes</div>
          {s.bench.map((p) => {
            const bi = Math.max(0, live.benchIndex(view, p.id));
            const slotRef = sel ?? BENCH_SHIRT[Math.min(7, bi)];
            const r = Math.round(live.liveRating(p, slotRef));
            const ref = sel !== null ? cmpTo : s.xv[slotRef] ? live.liveRating(s.xv[slotRef]!, slotRef) : null;
            return (
              <button key={p.id} className={`lu-row ${sel !== null ? 'target' : ''}`} onClick={() => tapBench(p)} disabled={!mine}>
                <span className="lu-n num">{16 + bi}</span>
                <span className="lu-nm">
                  <b>{p.apellido}</b>
                  <small>
                    {CORTO[p.pos]}
                    {energyBar(p.id)}
                  </small>
                </span>
                <span className="lu-o num" style={{ color: ovrColor(r) }}>
                  {r}
                  {ref !== null && (r > ref + 0.5 ? <em className="up">▲</em> : r < ref - 0.5 ? <em className="dn">▼</em> : <em>=</em>)}
                </span>
              </button>
            );
          })}
          {!s.bench.length && <p className="lu-help small">No quedan suplentes.</p>}
          {s.salieron.length > 0 && (
            <>
              <div className="lu-title" style={{ marginTop: 6 }}>Salieron</div>
              {s.salieron.map((id) => {
                const p = live.playerById(id);
                const bi = live.benchIndex(view, id);
                return p ? (
                  <div key={id} className="lu-row salio">
                    <span className="lu-n num">{bi >= 0 ? 16 + bi : formacionNum(live, view, id)}</span>
                    <span className="lu-nm">
                      <b>{p.apellido}</b>
                      <small>{CORTO[p.pos]}</small>
                    </span>
                    <span className="lu-o num">{overall(p)}</span>
                  </div>
                ) : null;
              })}
            </>
          )}
          <p className="lu-help small">
            El número de la derecha es cuánto rinde ahora (con el cansancio). {sel !== null ? '▲ rinde más / ▼ rinde menos que el que sale.' : '▲ / ▼ comparado con el titular de su puesto.'}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Número con el que empezó (1-15) o el del banco. */
function formacionNum(live: LiveMatch, k: SideKey, id: string) {
  const n = live.startNumber(k, id);
  return n > 0 ? n : '–';
}
