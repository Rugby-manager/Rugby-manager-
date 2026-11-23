import { ofertasVigentes } from '../engine/offers';
import { describirEvento, resolverEvento } from '../engine/vestuario';
import { DIARIO_NOMBRE, RESPUESTAS_PRENSA, conferenciaPendiente, responderPrensa } from '../engine/diario';
import { preseasonPending, skipPreseason } from '../engine/preseason';
import { hacerTercer, opcionesTercer, tercerPendiente } from '../engine/tercer';
import { PLANES_POST, destinoGira, elegirPostemporada } from '../engine/postemporada';
import { DecisionM19 } from './Cantera';
import { ESTILO_DIR, directivaDe, pedidoExtra } from '../engine/elecciones';
import { analizarRival, aplicarConsejos } from '../engine/analisis';
import { SEVEN_NOMBRE, SEVEN_PREMIO, jugarSeven, plantelSeven, rechazarSeven, sevenPendiente } from '../engine/seven';
import { ESTILO, arbitroDe } from '../engine/arbitros';
import { CLIMA_DESC, CLIMA_ICON, CLIMA_LABEL, climaDe, isDerby } from '../engine/extras';
import { useState, type ReactNode } from 'react';
import { roundName } from '../engine/cup';
import { IcoLibro, IcoPelota, IcoPesas, IcoCaja, IcoCamisetas, IcoContrato, IcoCopa, IcoDiario, IcoEntrada, IcoEstadio, IcoFormacion, IcoMarcador, IcoRival, IcoSilbato, IcoTabla, IcoTactica, IcoCalendario, IcoBandera } from './icons';
import { useGame } from './App';
import { FichaDT, PopupEventos } from './Popups';
import { choosePreseason, COMP_NAME, DIV_NAME, matchWinner, playRound, promoSeries, standings, startNextSeason, startUserMatch, userFixture, type RoundReport } from '../engine/game';
import { bestXV, overall, posText, readyXV, slotRating } from '../engine/players';
import { ClubJersey, Ovr, Sheet, Stars, formatMoney } from './common';
import { staffEstrellas } from '../engine/club';
import { INTENSIDAD_LABEL } from '../engine/training';
import { LiveMatchScreen, MatchLive } from './MatchLive';
import { makeObjective, prestigioTexto, switchClub } from '../engine/career';
import type { Club, Fixture, GameState, Player } from '../engine/types';
import { estadoHinchada, humor, precioCaro } from '../engine/hinchada';
import { nombrePais, paisDe, proximoSel, ventanaActual, ventanaPendiente } from '../engine/seleccion';
import { hoy } from '../engine/agenda';
import { fechaLarga, fechaRonda } from '../engine/calendario';

export function HomeScreen() {
  const { g, refresh, saveNow, go, toast } = useGame();
  const [report, setReport] = useState<RoundReport | null>(null);
  const [rivalOpen, setRivalOpen] = useState(false);
  const [careerOpen, setCareerOpen] = useState(false);
  const [quick, setQuick] = useState(false);
  const [live, setLive] = useState<ReturnType<typeof startUserMatch>>(null);
  const club = g.clubs[g.userClubId];

  const finish = () => {
    setReport(null);
    setLive(null);
    window.scrollTo(0, 0);
  };

  if (live) {
    return (
      <LiveMatchScreen
        live={live.live}
        fixture={live.fixture}
        report={report}
        onFinish={async (res) => {
          const rep = playRound(g, res);
          refresh();
          await saveNow();
          setReport(rep);
        }}
        onDone={finish}
      />
    );
  }

  if (report) {
    return (
      <MatchLive
        report={report}
        quick={quick}
        onDone={finish}
      />
    );
  }

  const fx = userFixture(g);
  const xvState = readyXV(club, g.players);
  const table = standings(g, club.division);
  const pos = table.findIndex((r) => r.clubId === club.id) + 1;
  const myRow = table[pos - 1];
  const last = [...g.fixtures].reverse().find((f) => f.result && (f.home === club.id || f.away === club.id));

  const play = async (rapido = false) => {
    if (ventanaPendiente(g)) {
      toast('Primero jugá los partidos de tu selección');
      go('seleccion');
      return;
    }
    setQuick(rapido);
    if (!rapido) {
      const m = startUserMatch(g);
      if (m) {
        setLive(m);
        window.scrollTo(0, 0);
        return;
      }
    }
    const rep = playRound(g);
    refresh();
    await saveNow();
    setReport(rep);
    window.scrollTo(0, 0);
  };

  if (g.phase === 'fin') return <SeasonEnd />;
  if (g.career?.despedido) return <Fired />;
  const car = g.career;

  const rival = fx ? g.clubs[fx.home === club.id ? fx.away : fx.home] : null;
  const pre = preseasonPending(g) ? g.pretemporada! : null;
  const phase = pre ? `Pretemporada · Amistoso ${pre.partidos.filter((f) => f.result).length + 1} de 3` : roundName(g.round);
  const aviso = g.ayudaAviso && (
    <section className="ayuda-aviso">
      <div className="aa-hd">🎁 Tu ayuda para arrancar</div>
      <p>{g.ayudaAviso.texto}</p>
      <div className="row">
        {g.ayudaAviso.playerId && (
          <button className="btn small" onClick={() => go('equipo')}>
            Ver el XV
          </button>
        )}
        <button
          className="btn small"
          onClick={() => {
            g.ayudaAviso = undefined;
            refresh();
            void saveNow();
          }}
        >
          Entendido
        </button>
      </div>
    </section>
  );
  if (pre && pre.elegida === null)
    return (
      <>
        <FichaDT />
        {aviso}
        <PreseasonPicker />
      </>
    );

  return (
    <>
      <FichaDT />
      <PopupEventos />
      {aviso}
      <SevenCard />
      <TercerTiempo />
      {g.sponsorOfertas.length > 0 && (
        <button className="notice block-notice" onClick={() => go('club', 'sponsor')}>
          📝 Tenés {g.sponsorOfertas.length} ofertas de sponsors para esta temporada. Tocá acá para elegir una.
        </button>
      )}
      {ofertasVigentes(g).length > 0 && (
        <button className="notice block-notice" onClick={() => go('mercado', 'ofertas')}>
          💰 {ofertasVigentes(g).length === 1 ? 'Te llegó una oferta' : `Te llegaron ${ofertasVigentes(g).length} ofertas`} por tus jugadores. Tocá acá para responder.
        </button>
      )}
      {club.plantel.some((id) => g.players[id].lesion > 0) && (
        <button className="notice block-notice" onClick={() => go('plantel', 'lesionados')}>
          🩹 Lesionados: {club.plantel.map((id) => g.players[id]).filter((p) => p.lesion > 0).map((p) => `${p.apellido} (${p.lesion} ${p.lesion === 1 ? 'fecha' : 'fechas'})`).join(', ')}.
        </button>
      )}
      {club.presupuesto < 0 && (
        <button className="notice block-notice" onClick={() => go('club', 'caja')}>
          ⚠ La caja está en rojo. Tocá acá para ver los números.
        </button>
      )}
      <SeleccionAviso />
      {pre && <PreseasonCard />}
      {!pre && conferenciaPendiente(g) && <PressConference />}
      {g.vestuario && <VestuarioCard />}
      {(g.promesas ?? []).map((pr) => (
        <button key={pr.playerId} className="notice block-notice" onClick={() => go('equipo')}>
          🤝 Le prometiste minutos a {g.players[pr.playerId]?.apellido}: tiene que jugar antes de la {roundName(pr.hasta)}.
        </button>
      ))}
      <div className="hub-date">
        <button className="hub-datebtn" onClick={() => go('calendario')} title="Ver el calendario">{fechaLarga(hoy(g))}</button>
        <span className="pill">{ventanaPendiente(g) ? 'Ventana internacional' : phase}</span>
      </div>

      <section className="hub-center">
        <div className="label" style={{ color: 'inherit', opacity: 0.7 }}>Manager</div>
        <div className="hub-manager">{g.manager}</div>
        {fx && rival ? (
          <div className="hub-vs">
            <TeamBlock g={g} id={fx.home} />
            <div style={{ textAlign: 'center' }}>
              <div className="score">vs</div>
              <div className="small" style={{ opacity: 0.75 }}>
                {COMP_NAME[fx.comp]}
                <br />
                {fx.home === club.id ? 'De local' : 'De visitante'}
                <br />
                <span title={CLIMA_DESC[climaDe(fx, g.temporada)]}>
                  {CLIMA_ICON[climaDe(fx, g.temporada)]} {CLIMA_LABEL[climaDe(fx, g.temporada)]}
                </span>
                <br />
                <span className="arbitro" title={ESTILO[arbitroDe(fx, g.temporada).estilo].texto}>
                  🧑‍⚖️ {arbitroDe(fx, g.temporada).nombre.split(' ').slice(-1)[0]} · {ESTILO[arbitroDe(fx, g.temporada).estilo].label}
                </span>
                {isDerby(g.clubs[fx.home], g.clubs[fx.away]) && (
                  <>
                    <br />
                    <b className="derby">🔥 CLÁSICO</b>
                  </>
                )}
              </div>
            </div>
            <TeamBlock g={g} id={fx.away} />
          </div>
        ) : null}
        {fx && rival && (
          <button className="btn small block" style={{ marginTop: 8 }} onClick={() => setRivalOpen(true)}>
            🔎 {staffEstrellas(club, 'ayudante') ? 'Informe del ayudante sobre el rival' : 'Ver al rival'}
          </button>
        )}
        {!(fx && rival) && (
          <p style={{ textAlign: 'center', opacity: 0.85 }}>{Number.isInteger(g.round) ? 'Tu equipo no juega esta fecha. Se juegan los playoffs y los repechajes.' : 'Tu equipo no juega esta ronda de copa (es a mitad de semana).'}</p>
        )}
        {car && (
          <>
            <div className="objective">
              <span className="label" style={{ color: 'inherit', opacity: 0.7 }}>Objetivo de la directiva</span>
              <div style={{ fontWeight: 700 }}>{car.objetivo.texto}</div>
              <DirLine />
            </div>
            <div className="conf">
              <span>Confianza</span>
              <div className="bar">
                <i style={{ width: `${car.confianza}%`, background: car.confianza < 30 ? 'var(--loss)' : car.confianza < 55 ? 'var(--draw)' : 'var(--win)' }} />
              </div>
              <span className="num">{car.confianza}%</span>
            </div>
          </>
        )}
        <HinchadaBar club={club} onOpen={() => go('club', 'entradas')} />
        <div className="hub-actions">
          <button className="btn" onClick={async () => { await saveNow(true); toast('Partida guardada'); }}>
            Guardar
          </button>
          <button className="btn" onClick={() => play(true)} title="Simula la fecha y muestra solo los resultados">
            Rápido ⏩
          </button>
          <button className="btn primary" onClick={() => play(false)}>
            {fx ? 'Jugar ▶' : 'Seguir ▶'}
          </button>
        </div>
      </section>

      {xvState.cambios > 0 && (
        <div className="notice">
          Tenés {xvState.cambios} {xvState.cambios === 1 ? 'lugar' : 'lugares'} del XV sin jugador o con un lesionado. Si jugás así, el ayudante completa el equipo automáticamente.{' '}
          <button className="btn small" onClick={() => go('equipo')}>
            Ver el XV
          </button>
        </div>
      )}
      {fx && ['PROMO1', 'PROMO2', 'PROMOC1', 'PROMOC2'].includes(fx.comp) && <PromoNote g={g} />}

      <div className="hub-grid">
        <Block
          tone="seg"
          title="Seguimiento"
          info={`${pos}.º en ${DIV_NAME[club.division]} · ${myRow?.pts ?? 0} pts`}
          items={[
            { l: 'Resultados', ico: <IcoMarcador size={36} />, on: () => go('fixture') },
            { l: 'Clasificación', ico: <IcoTabla size={36} />, on: () => go('tabla') },
            { l: 'Calendario', ico: <IcoCalendario size={36} />, on: () => go('calendario') },
            { l: 'Noticias', ico: <IcoDiario size={36} />, on: () => document.getElementById('noticias')?.scrollIntoView({ behavior: 'smooth' }) },
            { l: 'Enciclopedia', ico: <IcoLibro size={36} />, on: () => go('enciclo') },
          ]}
        />
        <Block
          tone="ent"
          title="Entrenador"
          info={`Entrenamiento individual · intensidad ${INTENSIDAD_LABEL[club.entrenamiento.intensidad].toLowerCase()}`}
          items={[
            { l: 'Formación', ico: <IcoFormacion size={36} />, on: () => go('equipo') },
            { l: 'Tácticas', ico: <IcoTactica size={36} />, on: () => go('equipo', 'tactica') },
            { l: 'Entrenamiento', ico: <IcoPesas size={36} />, on: () => go('plantel', 'entreno') },
            { l: 'Ver rival', ico: <IcoRival size={36} />, on: () => setRivalOpen(true), off: !rival },
            { l: g.nacional?.paisId ? `Selección (${paisDe(g.nacional.paisId).nombre})` : 'Selección', ico: <IcoBandera size={36} />, on: () => go('seleccion') },
            { l: 'Mi carrera', ico: <IcoCopa size={36} />, on: () => setCareerOpen(true) },
          ]}
        />
        <Block
          tone="mer"
          title="Mercado"
          info={`${club.plantel.length} jugadores`}
          items={[
            { l: 'Fichar', ico: <IcoContrato size={36} />, on: () => go('mercado', 'comprar') },
            { l: 'Plantel', ico: <IcoCamisetas size={36} />, on: () => go('plantel') },
            { l: 'Juveniles', ico: <IcoPelota size={36} />, on: () => go('club', 'juveniles') },
            { l: 'Empleados', ico: <IcoSilbato size={36} />, on: () => go('club', 'empleados') },
          ]}
        />
        <Block
          tone="fin"
          title="Finanzas"
          info={`Caja: ${formatMoney(club.presupuesto)} · ${club.socios.toLocaleString('es-AR')} socios`}
          items={[
            { l: 'Caja', ico: <IcoCaja size={36} />, on: () => go('club', 'caja') },
            { l: 'Entradas', ico: <IcoEntrada size={36} />, on: () => go('club', 'entradas') },
            { l: 'Estadio', ico: <IcoEstadio size={36} />, on: () => go('club', 'estadio') },
            { l: 'Sponsor', ico: <IcoContrato size={36} />, on: () => go('club', 'sponsor') },
          ]}
        />
      </div>

      {last && <LastResult g={g} f={last} />}

      <Diario />
      <section className="card" id="noticias">
        <h3>Noticias</h3>
        <div className="list">
          {g.news.slice(0, 6).map((n) => (
            <div key={n.id} className="li" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <b>{n.titulo}</b>
              <span className="small muted">{n.texto}</span>
            </div>
          ))}
        </div>
      </section>
      {rivalOpen && rival && <RivalSheet g={g} id={rival.id} onClose={() => setRivalOpen(false)} />}
      {careerOpen && <CareerSheet g={g} onClose={() => setCareerOpen(false)} />}
    </>
  );
}

/** Fecha de cada jornada: la temporada arranca el primer sábado de marzo. */
export function seasonDate(year: number, round: number) {
  return fechaLarga(fechaRonda(year, round));
}

/** En el fin de temporada: ofertas de selecciones y la ventana de noviembre o el Mundial. */
function SeleccionFin() {
  const { g, go } = useGame();
  const v = ventanaActual(g);
  const n = g.nacional;
  return (
    <>
      {n?.ofertas.length ? (
        <button className="notice block-notice sel-aviso" onClick={() => go('seleccion')}>
          🌎 Te quieren como DT: {n.ofertas.map((o) => nombrePais(o.paisId)).join(', ')}. Tocá acá para ver.
        </button>
      ) : null}
      {v && !v.terminada && (
        <section className="ayuda-aviso">
          <div className="aa-hd">🌎 {v.nombre}</div>
          <p>
            {n?.paisId
              ? `Ahora te toca con ${paisDe(n.paisId).nombre}. Armá la lista de 23 y jugá los partidos antes de arrancar la temporada que viene.`
              : v.tipo === 'mundial'
                ? 'Terminó la temporada del club y arranca el Mundial en Australia. Mirá cómo le va a Argentina.'
                : 'Terminó la temporada del club: ahora juegan las selecciones.'}
          </p>
          <button className="btn small primary" onClick={() => go('seleccion')}>
            Ir a Selección
          </button>
        </section>
      )}
    </>
  );
}

/** Avisos de la selección: ventana para jugar u ofertas de federaciones. */
function SeleccionAviso() {
  const { g, go } = useGame();
  const n = g.nacional;
  if (!n) return null;
  if (ventanaPendiente(g)) {
    const v = ventanaActual(g)!;
    const p = proximoSel(g);
    const rival = p ? paisDe(p.home === n.paisId ? p.away : p.home) : null;
    return (
      <button className="notice block-notice sel-aviso" onClick={() => go('seleccion')}>
        🌎 <b>{v.nombre}</b>: {v.tipo === 'julio' ? 'se para la liga y ' : ''}{paisDe(n.paisId!).nombre} {rival ? `juega contra ${rival.bandera} ${rival.nombre}` : 'tiene partidos'}. Tocá acá para armar la lista y jugar.
      </button>
    );
  }
  if (n.ofertas.length) {
    return (
      <button className="notice block-notice sel-aviso" onClick={() => go('seleccion')}>
        🌎 Te quieren como DT: {n.ofertas.map((o) => nombrePais(o.paisId)).join(', ')}. Tocá acá para ver.
      </button>
    );
  }
  return null;
}

function Block({ tone, title, info, items }: { tone: string; title: string; info: string; items: { l: string; ico?: ReactNode; on?: () => void; soon?: string; off?: boolean }[] }) {
  return (
    <section className={`hub-block q-${tone}`}>
      <header>
        <h3>{title}</h3>
        <span>{info}</span>
      </header>
      <div className="hub-items">
        {items.map((it) => (
          <button key={it.l} disabled={!!it.soon || it.off} onClick={it.on}>
            {it.ico}
            <span className="grow">{it.l}</span>
            {it.soon ? <small>{it.soon}</small> : <b aria-hidden="true">›</b>}
          </button>
        ))}
      </div>
    </section>
  );
}

function RivalSheet({ g, id, onClose }: { g: GameState; id: string; onClose: () => void }) {
  const c = g.clubs[id];
  const xv = bestXV(c, g.players).map((pid) => (pid ? g.players[pid] : null));
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const fwd = avg(xv.slice(0, 8).map((p, i) => (p ? slotRating(p, i) : 0)));
  const bks = avg(xv.slice(8).map((p, i) => (p ? slotRating(p, i + 8) : 0)));
  const kicker = xv.reduce<Player | null>((b, p) => (p && (!b || p.attrs.precision > b.attrs.precision) ? p : b), null);
  const table = standings(g, c.division);
  const row = table.find((r) => r.clubId === id)!;
  const last5 = g.fixtures.filter((f) => f.result && (f.home === id || f.away === id)).slice(-5);
  const stars = c.plantel.map((pid) => g.players[pid]).sort((a, b) => overall(b) - overall(a)).slice(0, 4);
  const t = c.tactica;
  const ataque = { forwards: 'juego cerrado con los forwards', equilibrado: 'ataque equilibrado', abrir: 'abrir la pelota a los backs' }[t.ataque];
  const pie = { poco: 'patea poco', medio: 'patea cuando conviene', mucho: 'patea mucho' }[t.pie];
  const def = { conservadora: 'defensa conservadora', equilibrada: 'defensa equilibrada', agresiva: 'defensa agresiva' }[t.defensa];
  return (
    <Sheet title={c.nombre} onClose={onClose}>
      <InformeRival id={id} />
      <div className="row">
        <ClubJersey club={c} size={56} />
        <div className="grow">
          <div>
            <b>{table.indexOf(row) + 1}.º</b> en {DIV_NAME[c.division]} · {row.pts} pts
          </div>
          <div className="small muted">
            {c.ciudad}
          </div>
          <div className="row" style={{ gap: 4, marginTop: 4 }}>
            {last5.map((f) => {
              const w = matchWinner(f);
              const cls = w === null ? 'draw' : w === id ? 'win' : 'loss';
              return (
                <span key={f.id} className={`pill ${cls}`}>
                  {cls === 'win' ? 'G' : cls === 'loss' ? 'P' : 'E'}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <div className="card">
        <h3>Cómo juega</h3>
        <p className="small">
          Le gusta {ataque}, {pie} y usa una {def}.
        </p>
        <div className="row" style={{ justifyContent: 'space-around', textAlign: 'center', marginTop: 8 }}>
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
            <Ovr v={kicker?.attrs.precision ?? 0} />
          </div>
        </div>
      </div>
      <div className="card">
        <h3>Figuras</h3>
        <div className="list">
          {stars.map((p) => (
            <div key={p.id} className="li" style={{ cursor: 'default' }}>
              <Ovr v={overall(p)} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="name">
                  {p.nombre} {p.apellido}
                </div>
                <div className="small muted">{posText(p)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function TeamBlock({ g, id }: { g: GameState; id: string }) {
  const c = g.clubs[id];
  const table = standings(g, c.division);
  const p = table.findIndex((r) => r.clubId === id) + 1;
  return (
    <div className="team">
      <ClubJersey club={c} size={56} />
      <b>{c.nombre}</b>
      <span className="small" style={{ opacity: 0.7 }}>
        {p}.º en {DIV_NAME[c.division]}
      </span>
    </div>
  );
}

function PromoNote({ g }: { g: GameState }) {
  const me = g.userClubId;
  const series = (['A', 'C'] as const).flatMap((k) => promoSeries(g, k).map((a) => ({ k, a }))).filter((x) => x.a.aTeam === me || x.a.bTeam === me);
  if (!series.length) return null;
  return (
    <div className="notice">
      {series.map(({ k, a }) => (
        <div key={k + a.aTeam}>
          Repechaje {k === 'A' ? 'A-B' : 'B-C'} a dos partidos: {g.clubs[a!.aTeam].nombre} ({k === 'A' ? 'Primera A' : 'Primera B'}) contra {g.clubs[a!.bTeam].nombre} ({k === 'A' ? 'Primera B' : 'Primera C'}). Global: {g.clubs[a!.aTeam].corto} {a!.ptsA} - {a!.ptsB} {g.clubs[a!.bTeam].corto}.
        </div>
      ))}
    </div>
  );
}

function LastResult({ g, f }: { g: GameState; f: Fixture }) {
  const r = f.result!;
  const me = g.userClubId;
  const my = f.home === me ? r.ptsH : r.ptsA;
  const op = f.home === me ? r.ptsA : r.ptsH;
  const cls = my > op ? 'win' : my < op ? 'loss' : 'draw';
  return (
    <section className="card">
      <h3>Último partido</h3>
      <div className="row">
        <span className={`pill ${cls}`}>{cls === 'win' ? 'Ganado' : cls === 'loss' ? 'Perdido' : 'Empate'}</span>
        <span className="num" style={{ fontWeight: 700 }}>
          {g.clubs[f.home].nombre} {r.ptsH} - {r.ptsA} {g.clubs[f.away].nombre}
        </span>
      </div>
    </section>
  );
}

function SeasonEnd() {
  const { g, refresh, saveNow, go } = useGame();
  const rec = g.history[g.history.length - 1];
  const club = g.clubs[g.userClubId];
  const n = (id: string) => g.clubs[id].nombre;
  const up = rec.asciende.includes(club.id) || !!rec.ascC?.includes(club.id);
  const down = rec.desciende.includes(club.id) || !!rec.descB?.includes(club.id);
  const fueA = rec.posicionUsuario.division;
  const champ = rec.campeonA === club.id;
  return (
    <section className="stack">
      <div className="board" style={{ gridTemplateColumns: '1fr' }}>
        <div className="meta">Temporada {rec.temporada}</div>
        <div className="team">
          <ClubJersey club={g.clubs[rec.campeonA]} size={72} />
          <b style={{ fontSize: '1.5rem', color: 'var(--board-fg)' }}>¡{n(rec.campeonA)} campeón!</b>
          <span className="small" style={{ opacity: 0.8 }}>Le ganó la final a {n(rec.subcampeonA)}</span>
        </div>
      </div>
      <SeleccionFin />
      {rec.cobros && rec.cobros.length > 0 && (
        <section className="ayuda-aviso">
          <div className="aa-hd">💰 ¡Cobraste por la temporada!</div>
          {rec.cobros.map((x) => (
            <div key={x.texto} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <span>{x.texto}</span>
              <b className="num">{formatMoney(x.monto)}</b>
            </div>
          ))}
          <small>La plata ya está en la caja. Aparte, al arrancar la temporada nueva la federación te da la ayuda de siempre.</small>
        </section>
      )}
      {g.premios?.[0]?.temporada === rec.temporada && (
        <div className="card stack">
          <h3>🏆 Premios de la temporada</h3>
          {g.premios[0].premios.map((x) => (
            <div key={x.premio} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <span className="small muted">{x.premio}</span>
              <b className="small" style={{ textAlign: 'right' }}>{x.nombre} <span className="muted">({g.clubs[x.clubId]?.corto})</span></b>
            </div>
          ))}
        </div>
      )}
      <div className="card stack">
        <h3>Tu temporada</h3>
        <p>
          {club.nombre} terminó <b>{rec.posicionUsuario.puesto}.º</b> en {DIV_NAME[rec.posicionUsuario.division]}.{' '}
          {champ && '¡Salieron campeones! '}
          {up && `¡Ascendieron a ${fueA === 'B' ? 'Primera A' : 'Primera B'}! `}
          {down && `Descendieron a ${fueA === 'A' ? 'Primera B' : 'Primera C'}. `}
        </p>
      </div>
      <div className="card stack">
        <h3>Ascensos y descensos</h3>
        <p className="small">
          <b>Campeón de Primera B:</b> {n(rec.campeonB)} (asciende directo).
        </p>
        {rec.repechajes?.map((p) => (
          <p key={p.primera} className="small">
            <b>Repechaje {p.cual === 'A' ? 'A-B' : 'B-C'}:</b> {p.global} en el global. {p.ganador === p.primera ? `${n(p.primera)} se queda en ${p.cual === 'A' ? 'Primera A' : 'Primera B'}.` : `${n(p.ascenso)} asciende y ${n(p.primera)} desciende.`}
          </p>
        ))}
        {!rec.repechajes && rec.promocion && (
          <p className="small">
            <b>Promoción:</b> {rec.promocion.global} en el global. {rec.promocion.ganador === rec.promocion.primera ? `${n(rec.promocion.primera)} se queda en Primera A.` : `${n(rec.promocion.ascenso)} asciende y ${n(rec.promocion.primera)} desciende.`}
          </p>
        )}
        <p className="small">
          <b>Suben a la A:</b> {rec.asciende.map(n).join(' y ')}. <b>Bajan a la B:</b> {rec.desciende.map(n).join(' y ')}.
        </p>
        {rec.ascC && (
          <>
            <p className="small">
              <b>Campeón de Primera C:</b> {n(rec.campeonC!)} (sube directo).
              {!rec.repechajes && rec.promocionC && ` Promoción B-C: ${rec.promocionC.global} en el global.`}
            </p>
            <p className="small">
              <b>Suben a la B:</b> {rec.ascC.map(n).join(' y ')}. <b>Bajan a la C:</b> {rec.descB!.map(n).join(' y ')}.
            </p>
          </>
        )}
        {rec.maxTrymanA && (
          <p className="small">
            <b>Máximo tryman de Primera A:</b> {rec.maxTrymanA.nombre} ({g.clubs[rec.maxTrymanA.clubId]?.corto}), {rec.maxTrymanA.tries} tries.
          </p>
        )}
      </div>
      <EleccionFin />
      {g.career && <BoardVerdict />}
      {!g.career?.despedido && <DecisionM19 />}
      {!g.career?.despedido && <PostemporadaPick />}
      <p className="small muted">Al empezar la temporada nueva, los jugadores cumplen un año: los jóvenes mejoran, los veteranos bajan y algunos se retiran. Los pibes de la M19 cumplen años y de Infantiles suben chicos nuevos.</p>
      <button
        className="btn primary block"
        disabled={g.career?.despedido}
        onClick={async () => {
          startNextSeason(g);
          refresh();
          await saveNow();
          go('inicio');
          window.scrollTo(0, 0);
        }}
      >
        {g.career?.despedido ? 'Elegí una oferta para seguir' : `Empezar la temporada ${g.temporada + 1} con ${club.nombre}`}
      </button>
    </section>
  );
}

function OfferList({ onPick }: { onPick: (id: string) => void }) {
  const { g } = useGame();
  const car = g.career;
  if (!car.ofertas.length) return <p className="small muted">No te llegó ninguna oferta.</p>;
  return (
    <div>
      {car.ofertas.map((o) => {
        const c = g.clubs[o.clubId];
        const obj = makeObjective(g, c);
        return (
          <div key={o.clubId} className="offer">
            <ClubJersey club={c} size={44} />
            <div className="grow" style={{ minWidth: 0 }}>
              <b>{c.nombre}</b>
              <div className="small muted">
                {DIV_NAME[c.division]} · Objetivo: {obj.texto.toLowerCase()}
              </div>
            </div>
            <button className="btn small" style={{ background: 'var(--turf)', color: 'var(--chalk)', borderColor: 'transparent' }} onClick={() => onPick(c.id)}>
              Aceptar
            </button>
          </div>
        );
      })}
    </div>
  );
}

function BoardVerdict() {
  const { g, refresh, saveNow, toast } = useGame();
  const car = g.career;
  const last = car.historial[car.historial.length - 1];
  return (
    <div className="card stack">
      <h3>La comisión directiva</h3>
      {last && (
        <p>
          Objetivo: {last.objetivo.toLowerCase()}. {last.cumplido ? <b style={{ color: 'var(--win)' }}>Cumplido.</b> : <b style={{ color: 'var(--loss)' }}>No cumplido.</b>}
        </p>
      )}
      {car.veredicto && <div className="notice">{car.veredicto}</div>}
      <p className="small">
        Tu prestigio: <b>{prestigioTexto(car.prestigio)}</b> ({car.prestigio} de 100).
      </p>
      {g.modo === 'carrera' && (
        <>
          <h3>Ofertas</h3>
          <OfferList
            onPick={async (id) => {
              switchClub(g, id);
              refresh();
              await saveNow();
              toast(`Ahora dirigís a ${g.clubs[id].nombre}`);
            }}
          />
        </>
      )}
    </div>
  );
}

function Fired() {
  const { g, refresh, saveNow, toast } = useGame();
  const car = g.career;
  return (
    <section className="stack">
      <div className="board" style={{ gridTemplateColumns: '1fr' }}>
        <div className="meta">Comisión directiva</div>
        <div className="team">
          <b style={{ fontSize: '1.6rem', color: 'var(--board-fg)' }}>Te echaron</b>
          <span className="small" style={{ opacity: 0.85 }}>{car.veredicto}</span>
        </div>
      </div>
      <div className="card stack">
        <h3>Te llamaron de otros clubes</h3>
        <p className="small muted">Elegí dónde seguir. Arrancás en la misma fecha del torneo.</p>
        <OfferList
          onPick={async (id) => {
            switchClub(g, id);
            refresh();
            await saveNow();
            toast(`Ahora dirigís a ${g.clubs[id].nombre}`);
          }}
        />
      </div>
    </section>
  );
}

function CareerSheet({ g, onClose }: { g: GameState; onClose: () => void }) {
  const car = g.career;
  const logros = car.historial.filter((h) => h.logro);
  return (
    <Sheet title={`Carrera de ${g.manager}`} onClose={onClose}>
      <div className="grid2">
        <div className="card" style={{ padding: 10 }}>
          <div className="label">Prestigio</div>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{prestigioTexto(car.prestigio)}</b>
          <div className="bar" style={{ marginTop: 4 }}>
            <i style={{ width: `${car.prestigio}%` }} />
          </div>
        </div>
        <div className="card" style={{ padding: 10 }}>
          <div className="label">Títulos</div>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{logros.length}</b>
          <div className="small muted">{g.modo === 'carrera' ? 'Modo carrera' : 'Modo libre'}</div>
        </div>
      </div>
      {logros.length > 0 && (
        <div className="card">
          <h3>Logros</h3>
          {logros.map((h, i) => (
            <div key={i} className="small">🏆 {h.logro} con {g.clubs[h.clubId]?.nombre}</div>
          ))}
        </div>
      )}
      <div className="card">
        <h3>Temporadas</h3>
        {car.historial.length === 0 && <p className="small muted">Todavía no terminaste ninguna temporada.</p>}
        <div className="list">
          {[...car.historial].reverse().map((h, i) => (
            <div key={i} className="li" style={{ cursor: 'default' }}>
              <span className="num" style={{ fontWeight: 700, width: 40 }}>{h.temporada}</span>
              <ClubJersey club={g.clubs[h.clubId]} size={24} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="name">{g.clubs[h.clubId]?.nombre}</div>
                <div className="small muted">
                  {h.puesto}.º en {DIV_NAME[h.division]} · {h.objetivo}
                </div>
              </div>
              <span className={`pill ${h.despedido ? 'loss' : h.cumplido ? 'win' : 'draw'}`}>{h.despedido ? 'Echado' : h.cumplido ? 'Cumplió' : 'No cumplió'}</span>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/** Al empezar la temporada: elegir uno de los tres torneos amistosos. */
function PreseasonPicker() {
  const { g, refresh, saveNow } = useGame();
  const p = g.pretemporada!;
  const user = g.clubs[g.userClubId];
  const elegir = async (i: number | null) => {
    if (i === null) skipPreseason(g);
    else choosePreseason(g, i);
    refresh();
    await saveNow();
    window.scrollTo(0, 0);
  };
  return (
    <section className="stack">
      <div className="card stack">
        <h3>Pretemporada {g.temporada}</h3>
        <p className="small" style={{ margin: 0 }}>
          Antes de que arranque {DIV_NAME[user.division]}, te invitan a tres torneos amistosos. Elegí uno: son tres partidos para conocer al plantel, probar el XV y la
          táctica. No suman puntos en la tabla, y al final cobrás el premio.
        </p>
      </div>
      {p.propuestas.map((prop, i) => (
        <div key={i} className="card stack">
          <h3>{prop.nombre}</h3>
          <p className="small" style={{ margin: 0 }}>{prop.texto}</p>
          <div className="list">
            {prop.rivales.map((id) => {
              const c = g.clubs[id];
              return (
                <div key={id} className="li" style={{ cursor: 'default' }}>
                  <ClubJersey club={c} size={26} />
                  <div className="grow">
                    <div className="name">{c.nombre}</div>
                    <div className="small muted">{DIV_NAME[c.division]}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="row">
            <div className="grow small">
              Premio: <b>{formatMoney(prop.premio)}</b>
            </div>
            <button className="btn primary" onClick={() => elegir(i)}>
              Jugar este
            </button>
          </div>
        </div>
      ))}
      <button className="btn block" onClick={() => elegir(null)}>
        No jugar amistosos: arrancar directo la liga
      </button>
    </section>
  );
}

/** Los tres amistosos elegidos, con sus resultados. */
function PreseasonCard() {
  const { g } = useGame();
  const p = g.pretemporada!;
  const prop = p.propuestas[p.elegida!];
  const me = g.userClubId;
  return (
    <section className="card stack">
      <h3>{prop.nombre}</h3>
      <div className="list">
        {p.partidos.map((f) => {
          const rid = f.home === me ? f.away : f.home;
          const r = f.result;
          const my = r ? (f.home === me ? r.ptsH : r.ptsA) : 0;
          const op = r ? (f.home === me ? r.ptsA : r.ptsH) : 0;
          const cls = !r ? '' : my > op ? 'win' : my < op ? 'loss' : 'draw';
          return (
            <div key={f.id} className="li" style={{ cursor: 'default' }}>
              <ClubJersey club={g.clubs[rid]} size={24} />
              <div className="grow">
                <div className="name">{g.clubs[rid].nombre}</div>
                <div className="small muted">{f.home === me ? 'De local' : 'De visitante'}</div>
              </div>
              {r ? <span className={`pill ${cls}`}>{my} - {op}</span> : <span className="small muted">Por jugar</span>}
            </div>
          );
        })}
      </div>
      <p className="small muted" style={{ margin: 0 }}>Premio al terminar: {formatMoney(prop.premio)}. Después arranca la liga.</p>
    </section>
  );
}

/** Conferencia de prensa antes de un clásico o un partido de playoff. */
function PressConference() {
  const { g, refresh, toast } = useGame();
  const f = conferenciaPendiente(g)!;
  const club = g.clubs[g.userClubId];
  const rival = g.clubs[f.home === club.id ? f.away : f.home];
  const motivo = isDerby(g.clubs[f.home], g.clubs[f.away]) ? `del clásico contra ${rival.nombre}` : `de la ${COMP_NAME[f.comp].toLowerCase()} contra ${rival.nombre}`;
  return (
    <section className="card stack press">
      <h3>🎤 Conferencia de prensa</h3>
      <p className="small" style={{ margin: 0 }}>
        Antes {motivo}, un periodista de {DIARIO_NOMBRE} te pregunta: <i>"¿Qué le dice a la gente?"</i>
      </p>
      {RESPUESTAS_PRENSA.map((r, i) => (
        <button
          key={r.texto}
          className="btn block"
          style={{ textAlign: 'left', height: 'auto', padding: '8px 10px' }}
          onClick={() => {
            toast(responderPrensa(g, i));
            refresh();
          }}
        >
          <span style={{ display: 'block' }}>"{r.texto}"</span>
          <span className="small" style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontWeight: 400, opacity: 0.8 }}>{r.efecto}</span>
        </button>
      ))}
    </section>
  );
}

/** La última edición del diario, con las anteriores a un toque. */
function Diario() {
  const { g } = useGame();
  const [todas, setTodas] = useState(false);
  const ed = g.diario?.[0];
  if (!ed || !ed.titulares.length) return null;
  const titulo = (e: NonNullable<GameState['diario']>[number]) => (e.round === 99 ? `Temporada ${e.temporada} · Premios` : `Temporada ${e.temporada} · ${roundName(e.round)}`);
  const Ed = ({ e }: { e: NonNullable<GameState['diario']>[number] }) => (
    <>
      <div className="paper-date">{titulo(e)}</div>
      <div className="paper-main">{e.titulares[0].titulo}</div>
      <p className="paper-sub">{e.titulares[0].bajada}</p>
      {e.titulares.slice(1).map((t) => (
        <div key={t.titulo} className="paper-item">
          <b>{t.titulo}</b> <span>{t.bajada}</span>
        </div>
      ))}
    </>
  );
  return (
    <section className="paper">
      <div className="paper-head">
        <span>{DIARIO_NOMBRE}</span>
        <button className="btn small" onClick={() => setTodas(true)}>Anteriores</button>
      </div>
      <Ed e={ed} />
      {todas && (
        <Sheet title={DIARIO_NOMBRE} onClose={() => setTodas(false)}>
          <div className="stack">
            {(g.diario ?? []).map((e, i) => (
              <section key={i} className="paper">
                <Ed e={e} />
              </section>
            ))}
          </div>
        </Sheet>
      )}
    </section>
  );
}

/** Algo pasó en el vestuario: elegís qué hacer. */
function VestuarioCard() {
  const { g, refresh, toast } = useGame();
  const e = g.vestuario!;
  const d = describirEvento(g, e);
  return (
    <section className="card stack press">
      <h3>🗣 {d.titulo}</h3>
      <p className="small" style={{ margin: 0 }}>{d.texto}</p>
      {d.opciones.map((o, i) => (
        <button
          key={o.texto}
          className="btn block"
          style={{ textAlign: 'left', height: 'auto', padding: '8px 10px' }}
          onClick={() => {
            toast(resolverEvento(g, i));
            refresh();
          }}
        >
          <span style={{ display: 'block' }}>{o.texto}</span>
          <span className="small" style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontWeight: 400, opacity: 0.8 }}>{o.efecto}</span>
        </button>
      ))}
      <p className="small muted" style={{ margin: 0 }}>Si no contestás en dos fechas, se resuelve solo (y no de la mejor manera).</p>
    </section>
  );
}

function HinchadaBar({ club, onOpen }: { club: Club; onOpen: () => void }) {
  const h = humor(club);
  const e = estadoHinchada(h);
  const caro = precioCaro(club);
  return (
    <button className="conf hinchada" onClick={onOpen} title={e.texto}>
      <span>Hinchada</span>
      <div className="bar">
        <i style={{ width: `${Math.max(3, h)}%`, background: h < 30 ? 'var(--loss)' : h < 55 ? 'var(--draw)' : 'var(--win)' }} />
      </div>
      <span className="num">{e.icono} {e.label}</span>
      {caro > 0 && <span className="hint">🎟 La gente se queja: la entrada está {caro === 2 ? 'muy cara' : 'cara'}.</span>}
    </button>
  );
}

function SevenCard() {
  const { g, refresh, saveNow, toast } = useGame();
  const club = g.clubs[g.userClubId];
  const st = g.seven;
  if (sevenPendiente(g)) {
    const ps = plantelSeven(g, club);
    return (
      <section className="seven-card">
        <div className="sv-hd">🏉 {SEVEN_NOMBRE} · opcional</div>
        <p>
          Torneo de rugby 7 en la playa antes de la liga: cuartos, semi y final contra clubes de tu categoría y la de al lado. Van tus 10 más rápidos. Los que juegan suben velocidad y resistencia, pero llegan un poco cansados.
        </p>
        <p className="small">
          Premio: {formatMoney(SEVEN_PREMIO.victoria)} por partido ganado y {formatMoney(SEVEN_PREMIO.campeon)} más si salís campeón.
        </p>
        <div className="sv-ps">{ps.map((p) => p.apellido).join(' · ')}</div>
        <div className="row">
          <button
            className="btn primary"
            onClick={async () => {
              const r = jugarSeven(g);
              refresh();
              await saveNow();
              toast(r.campeon ? '¡Campeones del Seven!' : 'Terminó el Seven');
            }}
          >
            Jugar el Seven
          </button>
          <button
            className="btn"
            onClick={() => {
              rechazarSeven(g);
              refresh();
            }}
          >
            No, gracias
          </button>
        </div>
      </section>
    );
  }
  if (!st?.jugado || st.temporada !== g.temporada || g.round > 2) return null;
  return (
    <section className="seven-card">
      <div className="sv-hd">🏉 {SEVEN_NOMBRE} {st.campeon ? '· ¡CAMPEONES!' : ''}</div>
      {st.partidos.map((m) => (
        <div key={m.etapa} className="row sv-row">
          <span className="small">{m.etapa}</span>
          <span className="grow">{m.rival}</span>
          <b className={`num ${m.gano ? 'sv-w' : 'sv-l'}`}>
            {m.pf}-{m.pc}
          </b>
        </div>
      ))}
      <p className="small">
        {st.premio > 0 ? `Cobraste ${formatMoney(st.premio)}. ` : ''}Los 10 que fueron subieron velocidad y resistencia.
      </p>
    </section>
  );
}

function TercerTiempo() {
  const { g, refresh, toast } = useGame();
  const f = tercerPendiente(g);
  if (!f) return null;
  const me = g.userClubId;
  const rival = g.clubs[f.home === me ? f.away : f.home];
  const r = f.result!;
  return (
    <section className="tercer">
      <div className="tt-hd">🍖 Tercer tiempo</div>
      <p className="small" style={{ margin: 0 }}>
        Terminó {g.clubs[f.home].corto} {r.ptsH}-{r.ptsA} {g.clubs[f.away].corto}. {f.home === me ? `Vino ${rival.nombre} a tu club.` : `Jugaste en la cancha de ${rival.nombre}.`} ¿Cómo sigue la noche?
      </p>
      {opcionesTercer(g, f).map((o) => (
        <button
          key={o.id}
          className="btn block tt-op"
          onClick={() => {
            toast(hacerTercer(g, o.id));
            refresh();
          }}
        >
          <span>{o.texto}</span>
          <small>{o.efecto}</small>
        </button>
      ))}
    </section>
  );
}

function PostemporadaPick() {
  const { g, refresh } = useGame();
  const actual = g.postemporada?.temporada === g.temporada ? g.postemporada.plan : null;
  return (
    <section className="card stack">
      <h3>💪 Postemporada</h3>
      <p className="small muted" style={{ margin: 0 }}>Terminó el torneo. ¿Qué hace el plantel hasta la temporada que viene?</p>
      <div className="ayudas">
        {PLANES_POST.map((x) => (
          <button
            key={x.id}
            className="ayuda"
            aria-pressed={actual === x.id}
            onClick={() => {
              elegirPostemporada(g, x.id);
              refresh();
            }}
          >
            <span className="ay-ic">{x.icono}</span>
            <span className="ay-tx">
              <b>{x.id === 'gira' ? `${x.titulo}: ${destinoGira(g).destino}` : x.titulo}</b>
              <small>{x.texto}</small>
            </span>
          </button>
        ))}
      </div>
      {!actual && <p className="small" style={{ margin: 0 }}>Si no elegís, se van de vacaciones cortas y no pasa nada.</p>}
    </section>
  );
}

/** Quién manda en el club y qué pide de más. */
function DirLine() {
  const { g } = useGame();
  const d = directivaDe(g);
  const extra = pedidoExtra(g);
  const e = ESTILO_DIR[d.estilo];
  return (
    <div className="dir-line" title={e.texto}>
      {e.icono} Pres. {d.presidente} · comisión {e.label.toLowerCase()}
      {extra && (
        <>
          <br />
          {extra.ok ? '✅' : '⚠'} {extra.texto}
        </>
      )}
      {d.proxima === g.temporada && (
        <>
          <br />
          🗳 Elecciones al terminar la temporada
        </>
      )}
    </div>
  );
}

/** El informe del ayudante de campo sobre el próximo rival. */
function InformeRival({ id }: { id: string }) {
  const { g, refresh, toast, go } = useGame();
  const inf = analizarRival(g, id);
  if (!inf.ayudante)
    return (
      <div className="informe small">
        🔎 No tenés ayudante de campo: nadie estudió a este rival.{' '}
        <button className="btn small" onClick={() => go('club', 'empleados')}>
          Contratar uno
        </button>
      </div>
    );
  const aplicables = inf.consejos.some((c) => c.aplicar);
  return (
    <div className="informe">
      <b>🔎 Informe de {inf.ayudante}</b> <Stars n={inf.estrellas} />
      <ul>
        {inf.consejos.map((c) => (
          <li key={c.texto}>
            {c.texto}
            {c.accion && <span className="small muted"> ({c.accion})</span>}
          </li>
        ))}
        {inf.peligro && <li>⚠ {inf.peligro}</li>}
      </ul>
      {inf.estrellas < 4 && <p className="small muted" style={{ margin: '0 0 6px' }}>Un ayudante con más estrellas ve más cosas del rival.</p>}
      {aplicables && (
        <button
          className="btn small primary"
          onClick={() => {
            toast(aplicarConsejos(g, inf));
            refresh();
          }}
        >
          Aplicar los consejos a la táctica
        </button>
      )}
    </div>
  );
}

/** Resultado de las elecciones del club (si hubo este año). */
function EleccionFin() {
  const { g } = useGame();
  const d = directivaDe(g);
  const u = d.ultima;
  if (!u || u.temporada !== g.temporada) return null;
  return (
    <section className="ayuda-aviso">
      <div className="aa-hd">🗳 Elecciones en el club</div>
      <p>{u.texto}</p>
      <small>
        Comisión: {ESTILO_DIR[d.estilo].icono} {ESTILO_DIR[d.estilo].label}. {ESTILO_DIR[d.estilo].pide} Próximas elecciones al terminar la temporada {d.proxima}.
      </small>
    </section>
  );
}
