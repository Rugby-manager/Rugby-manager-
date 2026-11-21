import { DIVS, isLeague } from '../engine/game';
import type { DivId } from '../engine/types';
import { useState } from 'react';
import { useGame } from './App';
import { COMP_NAME, DIV_NAME, LAST_ROUND } from '../engine/game';
import { CUP_ROUNDS, roundName } from '../engine/cup';
import { ResultList, Summary } from './MatchLive';
import { Sheet } from './common';
import type { Fixture } from '../engine/types';

export function FixtureScreen() {
  const { g } = useGame();
  const club = g.clubs[g.userClubId];
  const rounds = [...new Set(g.fixtures.map((f) => f.round))].sort((a, b) => a - b);
  const maxRound = Math.max(...rounds);
  const [round, setRound] = useState(rounds.includes(g.round) ? g.round : Math.min(Math.floor(g.round), maxRound));
  const [open, setOpen] = useState<Fixture | null>(null);
  const fs = g.fixtures.filter((f) => f.round === round);
  const groups: { k: string; list: Fixture[] }[] = [];
  const myDiv = fs.filter((f) => f.comp === club.division);
  const otherDivs = DIVS.filter((d) => d !== club.division).map((d) => fs.filter((f) => f.comp === d)).filter((l) => l.length);
  const ko = fs.filter((f) => !isLeague(f.comp) && f.comp !== 'COPA');
  const copa = fs.filter((f) => f.comp === 'COPA');
  if (copa.length) groups.push({ k: roundName(round), list: copa });
  if (myDiv.length) groups.push({ k: DIV_NAME[club.division], list: myDiv });
  if (ko.length) groups.push({ k: round === LAST_ROUND ? 'Final y promoción (vuelta)' : 'Semifinales y promoción (ida)', list: ko });
  for (const l of otherDivs) groups.push({ k: DIV_NAME[l[0].comp as DivId], list: l });

  const myMatches = g.fixtures.filter((f) => f.home === club.id || f.away === club.id);

  return (
    <>
      <h2>Fixture</h2>
      <div className="chips" role="group" aria-label="Elegir fecha">
        {rounds.map((r) => (
          <button key={r} className={`chip num ${Number.isInteger(r) ? '' : 'cup'}`} aria-pressed={round === r} onClick={() => setRound(r)}>
            {!Number.isInteger(r) ? `Copa ${['8vos', '4tos', 'Semi', 'Final'][CUP_ROUNDS.indexOf(r)]}` : r <= 18 ? `F${r}` : r === 19 ? 'Semis' : 'Final'}
          </button>
        ))}
      </div>
      {maxRound < LAST_ROUND && <p className="small muted" style={{ margin: 0 }}>Después de la fecha 18 se juegan los playoffs (1.º vs 4.º y 2.º vs 3.º) y la promoción de ida y vuelta. La Copa del Ñandubay se juega los miércoles, después de las fechas 4, 8, 12 y 16.</p>}
      {groups.map((gr) => (
        <section key={gr.k} className="card">
          <h3>{gr.k}</h3>
          <ResultList g={g} fixtures={gr.list} onOpen={setOpen} />
        </section>
      ))}
      <section className="card">
        <h3>Partidos de {club.nombre}</h3>
        <div className="list">
          {myMatches.map((f) => {
            const home = f.home === club.id;
            const rival = g.clubs[home ? f.away : f.home];
            const r = f.result;
            const my = r ? (home ? r.ptsH : r.ptsA) : 0;
            const op = r ? (home ? r.ptsA : r.ptsH) : 0;
            const cls = !r ? '' : my > op ? 'win' : my < op ? 'loss' : 'draw';
            return (
              <button key={f.id} className="li" onClick={() => (r ? setOpen(f) : setRound(f.round))}>
                <span className="label" style={{ width: 54 }}>{isLeague(f.comp) ? `F${f.round}` : f.comp === 'COPA' ? `Copa ${['8vos', '4tos', 'Semi', 'Final'][f.etapa ?? 0]}` : COMP_NAME[f.comp]}</span>
                <span className="grow name">
                  {home ? 'vs' : 'en cancha de'} {rival.nombre}
                </span>
                {r ? <span className={`pill ${cls} num`}>{my} - {op}</span> : <span className="small muted">{home ? 'Local' : 'Visitante'}</span>}
              </button>
            );
          })}
        </div>
      </section>
      {open && <MatchDetail f={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function MatchDetail({ f, onClose }: { f: Fixture; onClose: () => void }) {
  const { g } = useGame();
  const r = f.result!;
  return (
    <Sheet title={`${g.clubs[f.home].corto} ${r.ptsH} - ${r.ptsA} ${g.clubs[f.away].corto}`} onClose={onClose}>
      <div className="small muted">
        {COMP_NAME[f.comp]} · {g.clubs[f.home].nombre} contra {g.clubs[f.away].nombre}
      </div>
      <Summary g={g} f={f} />
      {r.events && (
        <div className="card stack">
          <h3>Relato</h3>
          <div className="feed">
            {r.events
              .filter((e) => e.kind !== 'jugada')
              .map((e, i) => (
                <div key={i} className="ev">
                  <span className="min">{e.kind === 'inicio' ? '' : `${e.min}'`}</span>
                  <div className="txt small">{e.text}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
