import { useEffect, useReducer, useRef, useState } from 'react';
import { useGame } from './App';
import { COMP_NAME, DIV_NAME, type RoundReport } from '../engine/game';
import { ClubJersey, Seg } from './common';
import { LivePitch } from './LivePitch';
import { LiveLineup } from './LiveLineup';
import type { LiveMatch } from '../engine/match';
import { CHARLA_DESC, CHARLA_LABEL, CLIMA_DESC, CLIMA_ICON, CLIMA_LABEL, climaDe, isDerby, type Charla } from '../engine/extras';
import type { Fixture, GameState, MatchEvent, MatchResult, SideStats } from '../engine/types';

/** Cada posesión (unos 2 minutos de juego) dura esto en la pantalla: el partido entero, unos 2 minutos. */
const MS_PER_STEP = 2600;

/** Partido del usuario jugado en vivo: cambios, entretiempo y penales. */
export function LiveMatchScreen({ live, fixture, report, onFinish, onDone }: { live: LiveMatch; fixture: Fixture; report: RoundReport | null; onFinish: (r: MatchResult) => void; onDone: () => void }) {
  const { g } = useGame();
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [speed, setSpeed] = useState(1);
  const [stopped, setStopped] = useState(false);
  const [siempre, setSiempre] = useState(false);
  const sent = useRef(false);
  const userSide = fixture.home === g.userClubId ? 'H' : 'A';
  const me = live.side(userSide);
  const events = live.events;
  const cur: MatchEvent | undefined = events[events.length - 1];
  const done = live.finished;

  useEffect(() => {
    if (done || live.pause || stopped) return;
    const last = events[events.length - 1];
    const extra = last && (last.kind === 'try' || last.kind === 'roja' || last.kind === 'tmo') ? 1500 : 0;
    const delay = (MS_PER_STEP + extra) / speed;
    const t = window.setTimeout(() => {
      live.step();
      rerender();
    }, delay);
    return () => window.clearTimeout(t);
  });

  useEffect(() => {
    if (done && !sent.current) {
      sent.current = true;
      onFinish(live.result());
    }
  }, [done, live, onFinish]);

  const pause = live.pause;
  const half = pause?.kind === 'entretiempo';
  const clima = climaDe(fixture, g.temporada);
  const clasico = isDerby(g.clubs[fixture.home], g.clubs[fixture.away]);

  return (
    <section className="stack">
      <LivePitch home={g.clubs[fixture.home]} away={g.clubs[fixture.away]} cur={cur} index={events.length} done={done} label={cur?.text ?? ''} clock={live.pause?.kind === 'entretiempo' ? 40 : live.min} clima={clima} clasico={clasico} />

      {pause?.kind === 'previa' && (
        <div className="card stack decide" role="dialog" aria-label="Antes del partido">
          <h3>{clasico ? '🔥 ¡Es el clásico!' : 'Antes de salir a la cancha'}</h3>
          <div className="small">
            {CLIMA_ICON[clima]} <b>{CLIMA_LABEL[clima]}.</b> {CLIMA_DESC[clima]}
          </div>
          {clasico && <div className="small">Partido caliente: la gente llena la cancha, hay más tarjetas y cualquiera puede ganar. Ganarlo (o perderlo) pesa el doble para la directiva y el plantel.</div>}
          <div className="small">
            Capitán: <b>{me.capitan ? live.playerById(me.capitan)?.apellido : '—'}</b>
            {me.capitan && ` (liderazgo ${live.playerById(me.capitan)?.attrs.liderazgo})`}
          </div>
          <TalkPicker live={live} side={userSide} when="previa" onChange={rerender} />
          <TacticsLive live={live} side={userSide} onChange={rerender} />
          <button className="btn primary block" onClick={() => { live.resume(); rerender(); }}>
            ¡A la cancha!
          </button>
        </div>
      )}

      {pause?.kind === 'penal' && (
        <div className="card stack decide" role="dialog" aria-label="Penal a favor">
          <h3>¡Penal a favor! · {pause.min}'</h3>
          <p style={{ margin: 0 }}>
            Por {pause.falta}, a {pause.dist} metros de los palos. Vas {me.pts > live.side(userSide === 'H' ? 'A' : 'H').pts ? 'ganando' : me.pts === live.side(userSide === 'H' ? 'A' : 'H').pts ? 'empatando' : 'perdiendo'} {live.marcador()}.
          </p>
          <div className="grid2">
            <button className="btn primary" onClick={() => { live.decidePenalty('palos', siempre); rerender(); }}>
              A los palos (3)
              <small className="sub">Chance: {Math.round(Math.max(20, Math.min(97, (me.ratings.kickPct + (35 - pause.dist) * 0.008) * 100)))}%</small>
            </button>
            <button className="btn primary" onClick={() => { live.decidePenalty('line', siempre); rerender(); }}>
              Al line (try)
              <small className="sub">Maul en las 5</small>
            </button>
          </div>
          <label className="check">
            <input type="checkbox" checked={siempre} onChange={(e) => setSiempre(e.target.checked)} /> Hacer siempre lo mismo en este partido
          </label>
        </div>
      )}

      {half && (
        <div className="card stack decide">
          <h3>Entretiempo · {live.marcador()}</h3>
          <StatsTable g={g} f={fixture} stats={{ H: live.H.stats, A: live.A.stats }} extra={{ tries: [live.H.tries, live.A.tries], pos: Math.round((live.H.posesiones / Math.max(1, live.H.posesiones + live.A.posesiones)) * 100), am: [live.H.amarillas, live.A.amarillas] }} />
          <AssistantTips live={live} side={userSide} />
          <TalkPicker live={live} side={userSide} when="entretiempo" onChange={rerender} />
          <TacticsLive live={live} side={userSide} onChange={rerender} />
          <p className="small muted" style={{ margin: 0 }}>Podés hacer cambios abajo, en Formaciones: tocá al que sale y después al suplente que entra.</p>
          <button className="btn primary block" onClick={() => { live.resume(); rerender(); }}>
            Arrancar el segundo tiempo
          </button>
        </div>
      )}

      {!done && !pause && (
        <div className="grid3">
          <button className={`btn ${stopped ? 'primary' : ''}`} onClick={() => setStopped(!stopped)}>
            {stopped ? '▶ Seguir' : '❚❚ Pausa'}
          </button>
          <button className="btn" onClick={() => setSpeed(speed === 1 ? 3 : speed === 3 ? 8 : 1)}>
            Velocidad x{speed}
          </button>
          <button className="btn" onClick={() => { live.runToEnd(); rerender(); }}>
            Ver el final
          </button>
        </div>
      )}
      {stopped && !done && !pause && (
        <div className="card stack">
          <h3>Partido en pausa</h3>
          <TacticsLive live={live} side={userSide} onChange={rerender} />
          <p className="small muted" style={{ margin: 0 }}>Para hacer un cambio, tocá abajo al que sale y después al suplente que entra.</p>
        </div>
      )}

      <LiveLineup live={live} userSide={userSide} onChange={rerender} />

      <div className="feed" aria-live="polite">
        {events.map((e, i) => ({ e, i })).reverse().slice(0, 60).map(({ e, i }) => (
          <div key={i} className={`ev ${cls(e)} ${i === events.length - 1 ? 'new' : ''}`}>
            <span className="min">{e.kind === 'inicio' ? '' : `${e.min}'`}</span>
            <div className="txt">{e.text}</div>
          </div>
        ))}
      </div>

      {done && report && (
        <>
          {report.userFixture && <Summary g={g} f={report.userFixture} />}
          <OtherResults g={g} fixtures={report.fixtures.filter((x) => x !== report.userFixture)} round={report.round} />
          <button className="btn primary block" onClick={onDone}>
            Continuar
          </button>
        </>
      )}
    </section>
  );
}

function TacticsLive({ live, side, onChange }: { live: LiveMatch; side: 'H' | 'A'; onChange: () => void }) {
  const t = live.side(side).tactics;
  const set = (p: Partial<typeof t>) => {
    live.setTactics(side, p);
    onChange();
  };
  const pen = live.side(side).penal;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="label">Ataque</div>
      <Seg label="Ataque" value={t.ataque} onChange={(v) => set({ ataque: v })} options={[{ v: 'forwards', l: 'Forwards' }, { v: 'equilibrado', l: 'Mixto' }, { v: 'abrir', l: 'Abrir' }]} />
      <div className="label">Juego con el pie</div>
      <Seg label="Pie" value={t.pie} onChange={(v) => set({ pie: v })} options={[{ v: 'poco', l: 'Poco' }, { v: 'medio', l: 'Medio' }, { v: 'mucho', l: 'Mucho' }]} />
      <div className="label">Defensa</div>
      <Seg label="Defensa" value={t.defensa} onChange={(v) => set({ defensa: v })} options={[{ v: 'conservadora', l: 'Conserv.' }, { v: 'equilibrada', l: 'Normal' }, { v: 'agresiva', l: 'Agresiva' }]} />
      <div className="label">Penales a favor</div>
      <Seg
        label="Penales"
        value={pen}
        onChange={(v) => {
          live.side(side).penal = v;
          onChange();
        }}
        options={[{ v: 'preguntar', l: 'Preguntarme' }, { v: 'palos', l: 'A los palos' }, { v: 'line', l: 'Al line' }]}
      />
    </div>
  );
}

/** Resultado de la fecha sin ver el partido (juego rápido o fecha libre). */
export function MatchLive({ report, onDone }: { report: RoundReport; onDone: () => void; quick?: boolean }) {
  const { g } = useGame();
  const f = report.userFixture;
  const r = f?.result;
  const others = report.fixtures.filter((x) => x !== f);
  return (
    <section className="stack">
      {f && r && (
        <>
          <div className="board">
            <div className="meta">
              {COMP_NAME[f.comp]}
              {f.comp === 'A' || f.comp === 'B' || f.comp === 'C' ? ` · Fecha ${f.round}` : ''}
            </div>
            <div className="team">
              <ClubJersey club={g.clubs[f.home]} size={44} />
              <b>{g.clubs[f.home].corto}</b>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="score">
                {r.ptsH} - {r.ptsA}
              </div>
              <span className="clock num">Final</span>
            </div>
            <div className="team">
              <ClubJersey club={g.clubs[f.away]} size={44} />
              <b>{g.clubs[f.away].corto}</b>
            </div>
          </div>
          <Summary g={g} f={f} />
        </>
      )}
      <OtherResults g={g} fixtures={others} round={report.round} />
      <button className="btn primary block" onClick={onDone}>
        Continuar
      </button>
    </section>
  );
}

function cls(e: MatchEvent) {
  if (e.kind === 'try' || e.kind === 'drop') return 'big';
  if (e.kind === 'amarilla') return 'card-y';
  if (e.kind === 'roja') return 'card-r';
  if (e.kind === 'lesion') return 'inj';
  if (e.kind === 'tmo' || e.kind === 'line') return 'tmo';
  if (e.kind === 'entretiempo' || e.kind === 'final' || e.kind === 'inicio') return 'hdr';
  return '';
}

function StatsTable({ g, f, stats, extra }: { g: GameState; f: Fixture; stats: Record<'H' | 'A', SideStats>; extra: { tries: [number, number]; pos: number; am: [number, number] } }) {
  const { H, A } = stats;
  const rows: [string, number | string, number | string][] = [
    ['Tries', extra.tries[0], extra.tries[1]],
    ['Posesión', `${extra.pos}%`, `${100 - extra.pos}%`],
    ['Scrums ganados', H.scrumsG, A.scrumsG],
    ['Lines ganados', H.linesG, A.linesG],
    ['Quiebres', H.quiebres, A.quiebres],
    ['Tackles', H.tackles, A.tackles],
    ['Penales cometidos', H.penales, A.penales],
    ['Amarillas', extra.am[0], extra.am[1]],
    ['Rojas', H.rojas, A.rojas],
  ];
  return (
    <table className="stats">
      <thead>
        <tr>
          <th>{g.clubs[f.home].corto}</th>
          <th />
          <th>{g.clubs[f.away].corto}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([l, h, a]) => (
          <tr key={l}>
            <td className="num">{h}</td>
            <td className="l">{l}</td>
            <td className="num">{a}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Summary({ g, f }: { g: GameState; f: Fixture }) {
  const r = f.result!;
  const scorers = [...r.scorers].sort((a, b) => b.puntos - a.puntos);
  const line = (side: 'H' | 'A') =>
    scorers
      .filter((s) => s.side === side)
      .map((s) => {
        const p = g.players[s.playerId];
        const n = p ? p.apellido : 'Retirado';
        return s.tries ? `${n} (${s.tries} ${s.tries === 1 ? 'try' : 'tries'}${s.puntos - s.tries * 5 ? `, ${s.puntos - s.tries * 5} con el pie` : ''})` : `${n} (${s.puntos} con el pie)`;
      })
      .join(', ') || 'Sin puntos';
  const mvp = r.mvp ? g.players[r.mvp] : undefined;
  return (
    <div className="card stack">
      <h3>Resumen</h3>
      {r.definicion && <div className="notice">{r.definicion}</div>}
      {mvp && (
        <div className="mvp">
          <span className="mvp-star">★</span>
          <div>
            <div className="label">Figura del partido</div>
            <b>
              {mvp.nombre} {mvp.apellido}
            </b>{' '}
            <span className="small muted">({mvp.clubId ? g.clubs[mvp.clubId].corto : ''})</span>
          </div>
        </div>
      )}
      <div className="grid2 small">
        <div>
          <div className="label">{g.clubs[f.home].nombre}</div>
          <div className="muted">{line('H')}</div>
        </div>
        <div>
          <div className="label">{g.clubs[f.away].nombre}</div>
          <div className="muted">{line('A')}</div>
        </div>
      </div>
      {r.events?.some((e) => e.kind === 'cambio') && (
        <div className="small">
          <div className="label">Cambios</div>
          {(['H', 'A'] as const).map((side) => {
            const cs = r.events!.filter((e) => e.kind === 'cambio' && e.side === side);
            if (!cs.length) return null;
            return (
              <div key={side} className="muted">
                <b>{g.clubs[side === 'H' ? f.home : f.away].corto}:</b>{' '}
                {cs.map((e) => {
                  const inn = e.pid ? g.players[e.pid]?.apellido : '?';
                  const out = e.out ? g.players[e.out]?.apellido : '';
                  const why = e.text.includes('cansado') ? ' (cansado)' : e.text.includes('ayudante') ? ' (ayudante)' : '';
                  return `${e.min}' ${out ? `${out} → ` : ''}${inn}${why}`;
                }).join(' · ')}
              </div>
            );
          })}
        </div>
      )}
      {r.stats ? (
        <StatsTable g={g} f={f} stats={r.stats} extra={{ tries: [r.triesH, r.triesA], pos: r.posesionH, am: [r.amarillasH, r.amarillasA] }} />
      ) : (
        <div className="small muted">
          Tries {r.triesH} - {r.triesA} · Posesión {r.posesionH}% - {100 - r.posesionH}%
        </div>
      )}
    </div>
  );
}

function OtherResults({ g, fixtures, round }: { g: GameState; fixtures: Fixture[]; round: number }) {
  if (!fixtures.length) return null;
  const groups = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    const k = f.comp === 'A' || f.comp === 'B' ? DIV_NAME[f.comp] : COMP_NAME[f.comp];
    groups.set(k, [...(groups.get(k) ?? []), f]);
  }
  return (
    <div className="card stack">
      <h3>Resultados de la fecha {round}</h3>
      {[...groups.entries()].map(([k, fs]) => (
        <div key={k}>
          <div className="label" style={{ marginBottom: 4 }}>{k}</div>
          <ResultList g={g} fixtures={fs} />
        </div>
      ))}
    </div>
  );
}

export function ResultList({ g, fixtures, onOpen }: { g: GameState; fixtures: Fixture[]; onOpen?: (f: Fixture) => void }) {
  return (
    <div className="list">
      {fixtures.map((f) => {
        const r = f.result;
        const mine = f.home === g.userClubId || f.away === g.userClubId;
        const h = g.clubs[f.home];
        const a = g.clubs[f.away];
        return (
          <button key={f.id} className="li" style={{ cursor: onOpen && r ? 'pointer' : 'default', fontWeight: mine ? 700 : 400 }} onClick={() => r && onOpen?.(f)}>
            <ClubJersey club={h} size={26} />
            <span className="grow name" style={{ textAlign: 'right' }}>{h.nombre}</span>
            <span className="num" style={{ minWidth: 64, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700 }}>
              {r ? `${r.ptsH} - ${r.ptsA}` : 'vs'}
            </span>
            <span className="grow name">{a.nombre}</span>
            <ClubJersey club={a} size={26} />
          </button>
        );
      })}
    </div>
  );
}

/** Consejos del ayudante de campo en el entretiempo. */
function AssistantTips({ live, side }: { live: LiveMatch; side: 'H' | 'A' }) {
  const me = live.side(side);
  const op = live.side(side === 'H' ? 'A' : 'H');
  const nivel = me.club.staff?.ayudante ?? 0;
  if (!nivel) return <p className="small muted" style={{ margin: 0 }}>💬 Si contratás un ayudante de campo (en Empleados), en el entretiempo te da consejos.</p>;
  const tips: string[] = [];
  const diff = me.pts - op.pts;
  if (me.stats.scrumsP >= 2 && op.ratings.scrum > me.ratings.scrum) tips.push('Nos están ganando el scrum. Meté pilares frescos o jugá más con los backs (ataque: Abrir).');
  if (me.stats.linesP >= 2) tips.push('Estamos perdiendo lines. Si te dan un penal, mejor patear a los palos que al line.');
  if (me.stats.penales >= 4) tips.push('Hacemos muchos penales. Bajá la defensa a Normal o Conservadora.');
  const fundidos = me.xv.filter((p) => p && (live.energia.get(p.id) ?? 100) < 62).map((p) => p!.apellido);
  if (fundidos.length) tips.push(`Están cansados: ${fundidos.slice(0, 3).join(', ')}. Pensá en cambiarlos.`);
  if (diff <= -10) tips.push('Vamos abajo por mucho: hay que arriesgar, atacá abriendo la pelota y con poco pie.');
  else if (diff >= 10) tips.push('Vamos bien arriba: cuidá la ventaja con defensa conservadora y jugando con el pie.');
  if (op.ratings.B > me.ratings.B + 3) tips.push('Sus backs son más rápidos que los nuestros: juguemos cerrado con los forwards.');
  if (!tips.length) tips.push('El partido está parejo. Si ves alguno cansado, cambialo para el último cuarto, que es donde se define.');
  return (
    <div className="tips">
      <div className="label">💬 Tu ayudante de campo</div>
      {tips.slice(0, nivel + 1).map((t) => (
        <p key={t} className="small" style={{ margin: '2px 0' }}>
          • {t}
        </p>
      ))}
    </div>
  );
}

/** Charla en el vestuario: una antes del partido y otra en el entretiempo. */
function TalkPicker({ live, side, when, onChange }: { live: LiveMatch; side: 'H' | 'A'; when: 'previa' | 'entretiempo'; onChange: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const dada = live.side(side).charlas[when];
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="label">🗣️ Charla en el vestuario</div>
      <div className="grid3">
        {(['tranquila', 'arenga', 'exigir'] as Charla[]).map((c) => (
          <button
            key={c}
            className={`btn ${dada === c ? 'primary' : ''}`}
            disabled={!!dada}
            aria-pressed={dada === c}
            onClick={() => {
              setMsg(live.talk(side, c));
              onChange();
            }}
          >
            {CHARLA_LABEL[c]}
          </button>
        ))}
      </div>
      <p className="small" style={{ margin: 0 }}>{dada ? <b>{msg ?? 'Ya hablaste con el plantel.'}</b> : <span className="muted">Tranquilos: {CHARLA_DESC.tranquila} Arengar: {CHARLA_DESC.arenga} Exigir: {CHARLA_DESC.exigir}</span>}</p>
    </div>
  );
}
