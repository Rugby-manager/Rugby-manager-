import { useState } from 'react';
import { useGame } from './App';
import { POS_LABEL, POS_ORDER, overall, posText } from '../engine/players';
import { askingPrice, buyPlayer, canBuy, canSell, freeAgents, marketOpen, salePrice, sellPlayer, signingWage, MAX_SQUAD } from '../engine/market';
import { Rng } from '../engine/rng';
import { canLoanIn, canLoanOut, costoPrestamo, loanIn, loanOut, pagoCesion, prestables, toggleTransferible, transferibles } from '../engine/loans';
import { OFERTA_FECHAS, acceptOffer, counterOffer, nombreOfertante, ofertasVigentes, rejectOffer } from '../engine/offers';
import { marketValue } from '../engine/players';
import { ClubJersey, Ovr, formatMoney } from './common';
import { PlayerSheet } from './Squad';
import type { Player, Pos } from '../engine/types';

type Mode = 'comprar' | 'transferibles' | 'prestamos' | 'libres' | 'vender' | 'ofertas';
const MODES: { v: Mode; l: string }[] = [
  { v: 'comprar', l: 'Comprar' },
  { v: 'transferibles', l: 'Transferibles' },
  { v: 'prestamos', l: 'Préstamos' },
  { v: 'libres', l: 'Libres' },
  { v: 'vender', l: 'Vender' },
  { v: 'ofertas', l: 'Ofertas' },
];

export function MarketScreen() {
  const { g, refresh, toast, sub } = useGame();
  const user = g.clubs[g.userClubId];
  const [mode, setMode] = useState<Mode>(MODES.some((m) => m.v === sub) ? (sub as Mode) : 'comprar');
  const nOfertas = ofertasVigentes(g).length;
  const [pos, setPos] = useState<Pos | 'ALL'>('ALL');
  const [maxPrice, setMaxPrice] = useState<'all' | 'mine'>('mine');
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(40);
  const [edad, setEdad] = useState<'all' | 'sub21' | 'medio' | 'vet'>('all');
  const edadOk = (p: Player) => edad === 'all' || (edad === 'sub21' ? p.edad <= 21 : edad === 'medio' ? p.edad >= 22 && p.edad <= 28 : p.edad >= 29);

  let list: Player[] = [];
  if (mode === 'comprar') {
    list = Object.values(g.players)
      .filter((p) => p.clubId && p.clubId !== user.id && !p.prestamo && g.clubs[p.clubId]?.division !== 'X')
      .filter((p) => pos === 'ALL' || p.pos === pos)
      .filter((p) => maxPrice === 'all' || askingPrice(p) <= user.presupuesto)
      .sort((a, b) => overall(b) - overall(a));
  } else if (mode === 'transferibles') {
    list = transferibles(g)
      .filter((p) => pos === 'ALL' || p.pos === pos)
      .sort((a, b) => overall(b) - overall(a));
  } else if (mode === 'prestamos') {
    list = prestables(g)
      .filter((p) => pos === 'ALL' || p.pos === pos)
      .sort((a, b) => overall(b) - overall(a));
  } else if (mode === 'libres') {
    list = freeAgents(g).filter((p) => pos === 'ALL' || p.pos === pos);
  } else if (mode === 'vender') {
    list = user.plantel
      .map((id) => g.players[id])
      .filter((p) => pos === 'ALL' || p.pos === pos)
      .sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || overall(b) - overall(a));
  }

  list = list.filter(edadOk);

  const act = (id: string) => {
    try {
      const msg = mode === 'vender' ? sellPlayer(g, id, new Rng(Date.now() & 0xffffffff)) : mode === 'prestamos' ? loanIn(g, id) : buyPlayer(g, id);
      setOpen(null);
      refresh();
      toast(msg);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <>
      <div className="row">
        <h2 style={{ flex: 1 }}>Mercado</h2>
        <div style={{ textAlign: 'right' }}>
          <div className="label">Presupuesto</div>
          <b className="num" style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>
            {formatMoney(user.presupuesto)}
          </b>
        </div>
      </div>
      {!marketOpen(g) && <div className="notice">El mercado está cerrado durante los playoffs. Vuelve a abrir cuando termine la temporada.</div>}
      <div className="seg seg3" role="group" aria-label="Sección del mercado">
        {MODES.map(({ v: m, l }) => (
          <button key={m} aria-pressed={mode === m} onClick={() => { setMode(m); setLimit(40); }}>
            {m === 'ofertas' && nOfertas ? `${l} (${nOfertas})` : l}
          </button>
        ))}
      </div>
      {mode === 'prestamos' && <MisPrestamos />}
      {mode === 'ofertas' && <Ofertas />}
      {mode !== 'ofertas' && (<>
      <p className="small muted" style={{ margin: 0 }}>
        {mode === 'comprar' && 'Jugadores de otros clubes. Piden un 15% más de lo que valen, y no venden si se quedan cortos en ese puesto.'}
        {mode === 'libres' && 'Jugadores sin club. Solo pagás una prima por firmar, pero suelen ser de nivel medio. La lista se renueva cada temporada.'}
        {mode === 'transferibles' && 'Jugadores que sus clubes ponen en venta porque les sobran. Salen más baratos que en Comprar (menos de lo que valen). La lista cambia cada 3 fechas.'}
        {mode === 'prestamos' && 'Jugadores que sus clubes prestan hasta fin de temporada. Pagás el 10% de lo que valen más su sueldo, y después vuelven a su club.'}
        {mode === 'vender' && `Tocá a un jugador para venderlo al instante (te pagan el 80% de lo que vale), ponerlo transferible (te llegan más ofertas) o cederlo a préstamo. Tenés ${user.plantel.length} jugadores (mínimo 23, máximo ${MAX_SQUAD}).`}
        {mode !== 'vender' && ` Además del precio, cada jugador cobra un sueldo por fecha. Caja: ${formatMoney(user.presupuesto)}.`}
      </p>
      {(
        <>
          <div className="chips" role="group" aria-label="Filtrar por edad">
            {([['all', 'Todas las edades'], ['sub21', 'Hasta 21'], ['medio', '22 a 28'], ['vet', '29 o más']] as const).map(([v, l]) => (
              <button key={v} className="chip" aria-pressed={edad === v} onClick={() => { setEdad(v); setLimit(40); }}>
                {l}
              </button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Filtrar por puesto">
            <button className="chip" aria-pressed={pos === 'ALL'} onClick={() => setPos('ALL')}>
              Todos
            </button>
            {POS_ORDER.map((p) => (
              <button key={p} className="chip" aria-pressed={pos === p} onClick={() => setPos(p)}>
                {POS_LABEL[p]}
              </button>
            ))}
          </div>
          {mode === 'comprar' && (
            <div className="row small">
              <span className="muted">Mostrar:</span>
              <button className="chip" aria-pressed={maxPrice === 'mine'} onClick={() => setMaxPrice('mine')}>
                Los que puedo pagar
              </button>
              <button className="chip" aria-pressed={maxPrice === 'all'} onClick={() => setMaxPrice('all')}>
                Todos
              </button>
            </div>
          )}
          <section className="card" style={{ padding: '4px 12px' }}>
            {list.length === 0 && <p className="muted small">No hay jugadores con este filtro.</p>}
            <div className="list">
              {list.slice(0, limit).map((p) => {
                const price = mode === 'vender' ? salePrice(p) : mode === 'prestamos' ? costoPrestamo(p) : askingPrice(p);
                const club = p.clubId ? g.clubs[p.clubId] : null;
                return (
                  <button key={p.id} className="li" onClick={() => setOpen(p.id)}>
                    <Ovr v={overall(p)} />
                    <div className="grow">
                      <div className="name">
                        {p.nombre} {p.apellido}
                      </div>
                      <div className="small muted">
                        {posText(p)} · {p.edad} años{club && mode !== 'vender' ? ` · ${club.corto}` : ''}
                        {p.transferible && mode === 'vender' ? ' · 🏷️ transferible' : ''}
                        {p.prestamo && mode === 'vender' ? ' · a préstamo' : ''}
                      </div>
                    </div>
                    {club && mode !== 'vender' && <ClubJersey club={club} size={24} />}
                    <b className="num" style={{ minWidth: 78, textAlign: 'right' }}>
                      {formatMoney(price)}
                    </b>
                  </button>
                );
              })}
            </div>
            {list.length > limit && (
              <button className="btn block small" style={{ margin: '8px 0' }} onClick={() => setLimit(limit + 40)}>
                Ver más
              </button>
            )}
          </section>
        </>
      )}
      </>)}
      {open && (
        <PlayerSheet
          g={g}
          p={g.players[open]}
          onClose={() => setOpen(null)}
          action={mode === 'prestamos' ? <LoanBox id={open} onDo={() => act(open)} /> : <DealBox id={open} mode={mode} onDo={() => act(open)} />}
        />
      )}
    </>
  );
}

function DealBox({ id, mode, onDo }: { id: string; mode: Mode; onDo: () => void }) {
  const { g } = useGame();
  const [confirm, setConfirm] = useState(false);
  const sell = mode === 'vender';
  const chk = sell ? canSell(g, id) : canBuy(g, id);
  const p = g.players[id];
  const club = g.clubs[g.userClubId];
  return (
    <div className="card stack">
      <div className="row">
        <div className="grow">
          <div className="label">{sell ? 'Te pagan' : p.clubId ? 'Precio' : 'Prima por firmar'}</div>
          <b className="num" style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>{formatMoney(chk.price)}</b>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label">Presupuesto después</div>
          <b className="num">{formatMoney(club.presupuesto + (sell ? chk.price : -chk.price))}</b>
        </div>
      </div>
      {!sell && (
        <div className="small">
          Sueldo que pide: <b>{formatMoney(signingWage(p))} por fecha</b> · Contrato por {p.edad >= 32 ? 1 : p.edad <= 26 ? 3 : 2} temporadas
        </div>
      )}
      {sell && <div className="small muted">Te ahorrás su sueldo de {formatMoney(p.sueldo)} por fecha.</div>}
      {sell && <SellExtras id={id} />}
      {!chk.ok && <div className="notice">{chk.reason}</div>}
      {chk.ok &&
        (confirm ? (
          <div className="grid2">
            <button className="btn" onClick={() => setConfirm(false)}>
              Cancelar
            </button>
            <button className="btn primary" onClick={onDo}>
              Confirmar
            </button>
          </div>
        ) : (
          <button className="btn primary block" onClick={() => setConfirm(true)}>
            {sell ? `Vender a ${p.apellido}` : `${p.clubId ? 'Comprar' : 'Fichar'} a ${p.apellido}`}
          </button>
        ))}
    </div>
  );
}

/** Ofertas de otros clubes por tus jugadores: aceptar, rechazar o pedir más. */
function Ofertas() {
  const { g, refresh, toast } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const [resp, setResp] = useState<Record<string, string>>({});
  const list = ofertasVigentes(g).sort((a, b) => b.monto - a.monto);
  const run = (f: () => string) => {
    try {
      toast(f());
    } catch (e) {
      toast((e as Error).message);
    }
    refresh();
  };
  return (
    <>
      <p className="small muted" style={{ margin: 0 }}>
        Otros clubes te ofrecen plata por tus jugadores. Cada oferta dura {OFERTA_FECHAS} fechas. Podés pedirles más una sola vez: si te pasás mucho, se levantan de la mesa.
      </p>
      {list.length === 0 && (
        <section className="card">
          <p className="muted small" style={{ margin: 0 }}>Por ahora nadie ofertó. Las ofertas llegan después de las fechas, sobre todo por los que juegan bien.</p>
        </section>
      )}
      {list.map((o) => {
        const p = g.players[o.playerId];
        const club = g.clubs[o.clubId];
        const valor = marketValue(p);
        const pct = Math.round((o.monto / valor) * 100);
        const quedan = Math.max(1, OFERTA_FECHAS + 1 - Math.ceil(g.round - o.fecha));
        return (
          <section key={o.id} className="card stack">
            <h3>{o.exterior ? '🌍 ' : ''}Oferta de {nombreOfertante(g, o)}</h3>
            {o.exterior && <div className="small">Lo quieren de afuera. Pagan muy bien, pero si no lo dejás ir se va a poner mal (baja su moral).</div>}
            <div className="row">
              {club ? <ClubJersey club={club} size={30} /> : <span style={{ fontSize: 28 }}>🌍</span>}
              <div className="grow">
                <div className="label">Ofrecen</div>
                <b className="num" style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>{formatMoney(o.monto)}</b>
              </div>
              <span className={`pill ${pct >= 100 ? 'good' : ''}`}>{pct}% de lo que vale</span>
            </div>
            <button className="li" onClick={() => setOpen(p.id)}>
              <Ovr v={overall(p)} />
              <div className="grow">
                <div className="name">
                  {p.nombre} {p.apellido}
                </div>
                <div className="small muted">
                  {posText(p)} · {p.edad} años · vale {formatMoney(valor)}
                </div>
              </div>
            </button>
            {resp[o.id] && <div className="small"><b>{resp[o.id]}</b></div>}
            <div className="small muted">{quedan === 1 ? 'Es la última fecha para responder.' : `Quedan ${quedan} fechas para responder.`}</div>
            {!o.contra && (
              <div className="grid2">
                {[1.15, 1.3].map((k) => (
                  <button
                    key={k}
                    className="btn"
                    onClick={() => {
                      try {
                        const r = counterOffer(g, o.id, Math.round((o.monto * k) / 100_000) * 100_000);
                        if (r.ok) setResp({ ...resp, [o.id]: r.texto });
                        else toast(r.texto);
                      } catch (e) {
                        toast((e as Error).message);
                      }
                      refresh();
                    }}
                  >
                    Pedir {formatMoney(Math.round((o.monto * k) / 100_000) * 100_000)}
                  </button>
                ))}
              </div>
            )}
            <div className="grid2">
              <button className="btn" onClick={() => run(() => rejectOffer(g, o.id))}>
                Rechazar
              </button>
              <button className="btn primary" onClick={() => run(() => acceptOffer(g, o.id))}>
                Aceptar y vender
              </button>
            </div>
          </section>
        );
      })}
      {open && <PlayerSheet g={g} p={g.players[open]} onClose={() => setOpen(null)} />}
    </>
  );
}

/** En la ficha de un jugador tuyo: ponerlo transferible o cederlo a préstamo. */
function SellExtras({ id }: { id: string }) {
  const { g, refresh, toast } = useGame();
  const p = g.players[id];
  const ced = canLoanOut(g, id);
  if (p.prestamo) return null;
  return (
    <div className="grid2">
      <button
        className="btn"
        onClick={() => {
          toast(toggleTransferible(g, id));
          refresh();
        }}
      >
        {p.transferible ? 'Sacar de transferibles' : 'Poner transferible'}
      </button>
      <button
        className="btn"
        disabled={!ced.ok}
        title={ced.reason}
        onClick={() => {
          try {
            toast(loanOut(g, id, new Rng(Date.now() & 0xffffffff)));
          } catch (e) {
            toast((e as Error).message);
          }
          refresh();
        }}
      >
        Ceder a préstamo
        <small className="sub">Te pagan {formatMoney(ced.price)}</small>
      </button>
    </div>
  );
}

function LoanBox({ id, onDo }: { id: string; onDo: () => void }) {
  const { g } = useGame();
  const chk = canLoanIn(g, id);
  const p = g.players[id];
  return (
    <div className="card stack">
      <div className="row">
        <div className="grow">
          <div className="label">Préstamo hasta fin de temporada</div>
          <b className="num" style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>{formatMoney(chk.price)}</b>
        </div>
      </div>
      <div className="small">Además pagás su sueldo: {formatMoney(p.sueldo)} por fecha. Al terminar la temporada vuelve a {p.clubId ? g.clubs[p.clubId].nombre : 'su club'}.</div>
      {!chk.ok && <div className="notice">{chk.reason}</div>}
      {chk.ok && (
        <button className="btn primary block" onClick={onDo}>
          Pedirlo a préstamo
        </button>
      )}
    </div>
  );
}

/** Los que llegaron a préstamo y los que cediste. */
function MisPrestamos() {
  const { g } = useGame();
  const me = g.userClubId;
  const llegaron = Object.values(g.players).filter((p) => p.prestamo && p.clubId === me);
  const cedidos = Object.values(g.players).filter((p) => p.prestamo?.clubId === me);
  if (!llegaron.length && !cedidos.length) return null;
  return (
    <section className="card">
      <h3>Tus préstamos</h3>
      <div className="list">
        {llegaron.map((p) => (
          <div key={p.id} className="li" style={{ cursor: 'default' }}>
            <Ovr v={overall(p)} />
            <div className="grow">
              <div className="name">
                {p.nombre} {p.apellido}
              </div>
              <div className="small muted">Llegó de {g.clubs[p.prestamo!.clubId]?.nombre} · vuelve a fin de temporada</div>
            </div>
          </div>
        ))}
        {cedidos.map((p) => (
          <div key={p.id} className="li" style={{ cursor: 'default' }}>
            <Ovr v={overall(p)} />
            <div className="grow">
              <div className="name">
                {p.nombre} {p.apellido}
              </div>
              <div className="small muted">
                Cedido a {p.clubId ? g.clubs[p.clubId].nombre : '—'} · jugó {p.temporada.partidos} partidos · cobraste {formatMoney(pagoCesion(p))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
