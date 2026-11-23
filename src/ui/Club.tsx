import { useState } from 'react';
import { useGame } from './App';
import {
  INST, INST_ORDER, STAFF, STAFF_ORDER, asistencia, build, canBuild, candidatosStaff, capacidad, contratarStaff, cuotaSocio,
  costoDiv, despedirStaff, fechasRestantes, staffSueldo, gastosFecha, nombreStaff, precioReferencia, signSponsor, staffEstrellas,
} from '../engine/club';
import { userFixture } from '../engine/game';
import { ANIO, formatMoney, porAnio } from './common';
import { IcoCaja, IcoContrato, IcoEntrada, IcoEstadio, IcoPelota, IcoSilbato } from './icons';
import { Juveniles } from './Cantera';
import { Sheet, Stars } from './common';
import type { Club, StaffKey } from '../engine/types';
import { estadoHinchada, humor } from '../engine/hinchada';

type Sec = 'caja' | 'entradas' | 'estadio' | 'empleados' | 'sponsor' | 'juveniles';
const SECS: { v: Sec; l: string; i: JSX.Element }[] = [
  { v: 'caja', l: 'Caja', i: <IcoCaja size={28} /> },
  { v: 'entradas', l: 'Entradas', i: <IcoEntrada size={28} /> },
  { v: 'estadio', l: 'Estadio', i: <IcoEstadio size={28} /> },
  { v: 'empleados', l: 'Empleados', i: <IcoSilbato size={28} /> },
  { v: 'sponsor', l: 'Sponsor', i: <IcoContrato size={28} /> },
  { v: 'juveniles', l: 'Juveniles', i: <IcoPelota size={28} /> },
];

export function ClubScreen() {
  const { sub } = useGame();
  const [sec, setSec] = useState<Sec>(SECS.some((s) => s.v === sub) ? (sub as Sec) : 'caja');
  return (
    <>
      <div className="row">
        <h2 style={{ flex: 1 }}>El club</h2>
      </div>
      <div className="clubnav" role="tablist">
        {SECS.map((s) => (
          <button key={s.v} role="tab" aria-selected={sec === s.v} onClick={() => setSec(s.v)}>
            {s.i}
            <span>{s.l}</span>
          </button>
        ))}
      </div>
      {sec === 'caja' && <Caja />}
      {sec === 'entradas' && <Entradas />}
      {sec === 'estadio' && <Estadio />}
      {sec === 'empleados' && <Empleados />}
      {sec === 'sponsor' && <Sponsor />}
      {sec === 'juveniles' && <Juveniles />}
    </>
  );
}

function Money({ v, sign }: { v: number; sign?: boolean }) {
  if (v === 0) return <b className="num muted">—</b>;
  return (
    <b className="num" style={{ color: sign ? (v >= 0 ? 'var(--win)' : 'var(--loss)') : undefined }}>
      {sign ? (v >= 0 ? '+' : '−') : ''}
      {formatMoney(Math.abs(v))}
    </b>
  );
}

function Caja() {
  const { g } = useGame();
  const c = g.clubs[g.userClubId];
  const gas = gastosFecha(g, c);
  const ca = c.cuentaAnual?.temporada === g.temporada ? c.cuentaAnual : null;
  const quedan = fechasRestantes(g);
  const [all, setAll] = useState(false);
  return (
    <>
      <section className="card stack">
        <div className="bigmoney">
          <span className="label">Plata para gastar</span>
          <span className={`lcdbig num ${c.presupuesto < 0 ? 'neg' : ''}`}>{formatMoney(c.presupuesto)}</span>
        </div>
        {c.presupuesto >= 0 ? (
          <div className="small" style={{ margin: 0 }}>
            ✅ Los sueldos y gastos de toda la temporada <b>ya están pagados</b>. Esta plata es tuya: para fichajes, obras o empleados. No te van a descontar nada por fecha.
          </div>
        ) : (
          <div className="notice">La caja está en rojo. No podés fichar, y la comisión directiva pierde confianza cada fecha. Vendé jugadores o bajá empleados.</div>
        )}
        {ca && (
          <>
            <h3>Presupuesto de la temporada {ca.temporada}</h3>
            <p className="small muted" style={{ margin: 0 }}>Se cobró y se pagó todo junto al arrancar ({ca.fechas} fechas).</p>
            <table className="money">
              <tbody>
                <tr><td>Cuotas de los socios</td><td><Money v={ca.socios} sign /></td></tr>
                <tr><td>Derechos de TV</td><td><Money v={ca.tv} sign /></td></tr>
                <tr><td>Sueldos del plantel</td><td><Money v={-ca.sueldos} sign /></td></tr>
                <tr><td>Sueldos de empleados</td><td><Money v={-ca.empleados} sign /></td></tr>
                <tr><td>Mantenimiento{gas.cantera ? " y cantera M19" : ""}</td><td><Money v={-ca.mant} sign /></td></tr>
                <tr className="tot"><td>Saldo del año</td><td><Money v={ca.socios + ca.tv - ca.sueldos - ca.empleados - ca.mant} sign /></td></tr>
              </tbody>
            </table>
          </>
        )}
        <h3>Lo que todavía puede entrar</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Las entradas de cada partido de local{c.inst.quincho ? ' y el quincho' : ''}.</li>
          {c.sponsor?.porVictoria ? <li>{formatMoney(c.sponsor.porVictoria)} del sponsor por cada partido ganado.</li> : null}
          <li>Los premios de la Federación si salís campeón o ascendés, y la ayuda de cada temporada.</li>
          <li>Lo que cobres por vender o ceder jugadores.</li>
        </ul>
        {quedan > 0 && (
          <p className="small muted" style={{ margin: 0 }}>
            Si fichás ahora, pagás el pase más su sueldo de las {quedan} fechas que quedan, todo de una. Si vendés, te devuelven el sueldo de esas fechas. Hoy gastás {porAnio(gas.total)} en total.
          </p>
        )}
      </section>
      <section className="card" style={{ padding: '4px 12px' }}>
        <h3>Movimientos</h3>
        {g.caja.length === 0 && <p className="muted small">Todavía no hubo movimientos.</p>}
        <div className="list">
          {g.caja.slice(0, all ? 150 : 25).map((m, i) => (
            <div key={i} className="li" style={{ cursor: 'default' }}>
              <div className="grow">
                <div className="name">{m.concepto}</div>
                <div className="small muted">
                  Temporada {m.temporada} · {m.round > 20 ? 'Pretemporada' : `Fecha ${m.round}`}
                </div>
              </div>
              <Money v={m.monto} sign />
            </div>
          ))}
        </div>
        {!all && g.caja.length > 25 && (
          <button className="btn small block" style={{ margin: '8px 0' }} onClick={() => setAll(true)}>
            Ver más
          </button>
        )}
      </section>
    </>
  );
}

function Entradas() {
  const { g, refresh } = useGame();
  const c = g.clubs[g.userClubId];
  const ref = precioReferencia(c.reputacion);
  const fx = userFixture(g);
  const local = fx && fx.home === c.id;
  const rival = fx ? g.clubs[fx.home === c.id ? fx.away : fx.home] : null;
  const est = asistencia(g, c, local && rival ? rival : c, !!fx && fx.comp !== 'A' && fx.comp !== 'B' && fx.comp !== 'C');
  const set = (v: number) => {
    c.precioEntrada = Math.max(500, Math.min(ref * 4, Math.round(v / 100) * 100));
    refresh();
  };
  const presets = [0.6, 0.8, 1, 1.25, 1.5].map((f) => Math.round((ref * f) / 100) * 100);
  return (
    <>
      <section className="card stack">
        <h3>Precio de la entrada</h3>
        <div className="pricebox">
          <button className="btn" aria-label="Bajar precio" onClick={() => set(c.precioEntrada - 100)}>−</button>
          <span className="lcdbig num">{formatMoney(c.precioEntrada, true)}</span>
          <button className="btn" aria-label="Subir precio" onClick={() => set(c.precioEntrada + 100)}>+</button>
        </div>
        <div className="seg" role="group" aria-label="Precios rápidos">
          {presets.map((p) => (
            <button key={p} aria-pressed={c.precioEntrada === p} onClick={() => set(p)}>
              {formatMoney(p, true)}
            </button>
          ))}
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Un precio normal para tu club es {formatMoney(ref, true)}. Más barato va más gente; más caro, menos. Si la entrada está muy cara, también se enojan los socios. Los socios entran gratis.
        </p>
      </section>
      <HinchadaCard c={c} />
      <section className="card stack">
        <h3>{local && rival ? `Próximo partido de local: vs ${rival.nombre}` : 'Estimación para un partido de local'}</h3>
        <div className="grid2">
          <Stat l="Van a ir" v={`${est.total.toLocaleString('es-AR')} personas`} />
          <Stat l="Capacidad" v={`${est.capacidad.toLocaleString('es-AR')} lugares`} />
          <Stat l="Socios (gratis)" v={est.socios.toLocaleString('es-AR')} />
          <Stat l="Pagan entrada" v={est.publico.toLocaleString('es-AR')} />
          <Stat l="Recaudación" v={formatMoney(est.recaudacion)} />
          <Stat l="Quincho" v={c.inst.quincho ? formatMoney(est.quincho) : 'No tenés'} />
        </div>
        <div className="fillbar" aria-label={`Estadio al ${Math.round((est.total / est.capacidad) * 100)}%`}>
          <span style={{ width: `${Math.min(100, (est.total / est.capacidad) * 100)}%` }} />
        </div>
        {est.lleno && <div className="notice">¡Lleno! Podés subir el precio o ampliar las tribunas en Estadio.</div>}
        {c.ultimaAsistencia ? <p className="small muted" style={{ margin: 0 }}>En el último partido de local fueron {c.ultimaAsistencia.toLocaleString('es-AR')} personas.</p> : null}
      </section>
      <section className="card stack">
        <h3>Socios</h3>
        <div className="grid2">
          <Stat l="Socios" v={c.socios.toLocaleString('es-AR')} />
          <Stat l="Cuota por año" v={formatMoney(cuotaSocio(c.reputacion) * ANIO, true)} />
        </div>
        <p className="small muted" style={{ margin: 0 }}>Se hacen socios cuando el equipo gana, cuando ascendés o salís campeón, y si tenés quincho. Se van si perdés seguido o descendés.</p>
      </section>
    </>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="statbox">
      <div className="label">{l}</div>
      <b>{v}</b>
    </div>
  );
}

function Estadio() {
  const { g, refresh, toast } = useGame();
  const c = g.clubs[g.userClubId];
  return (
    <>
      <section className="card stack">
        <div className="bigmoney">
          <span className="label">Capacidad del estadio</span>
          <span className="lcdbig num">{capacidad(c).toLocaleString('es-AR')}</span>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Caja: {formatMoney(c.presupuesto)}. Podés tener hasta dos obras a la vez.</p>
      </section>
      <StadiumView c={c} />
      {INST_ORDER.map((k) => {
        const info = INST[k];
        const lvl = c.inst[k];
        const obra = c.obras.find((o) => o.tipo === k);
        const chk = canBuild(g, k);
        return (
          <section key={k} className="card stack">
            <div className="row">
              <h3 style={{ flex: 1 }}>{info.nombre}</h3>
              <span className="lvl" aria-label={`Nivel ${lvl} de ${info.max}`}>
                {Array.from({ length: info.max }, (_, i) => (
                  <i key={i} className={i < lvl ? 'on' : ''} />
                ))}
              </span>
            </div>
            <p className="small" style={{ margin: 0 }}>{info.efecto}</p>
            <div className="small muted">Nivel {lvl} de {info.max}{lvl ? ` · Mantenimiento ${porAnio(Math.round(info.mant * lvl * costoDiv(c)))}` : ''}</div>
            {obra ? (
              <div>
                <div className="small">En obra: nivel {lvl + 1}. Faltan {obra.fechas} {obra.fechas === 1 ? 'fecha' : 'fechas'}.</div>
                <div className="fillbar"><span style={{ width: `${((obra.total - obra.fechas) / obra.total) * 100}%` }} /></div>
              </div>
            ) : lvl < info.max ? (
              <button
                className="btn primary block"
                disabled={!chk.ok}
                onClick={() => {
                  try {
                    toast(build(g, k));
                    refresh();
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                Mejorar a nivel {lvl + 1} · {formatMoney(chk.costo)} · {info.fechas} fechas
              </button>
            ) : (
              <div className="small muted">Está al máximo.</div>
            )}
            {!obra && lvl < info.max && !chk.ok && <div className="small" style={{ color: 'var(--loss)' }}>{chk.reason}</div>}
          </section>
        );
      })}
    </>
  );
}

function Empleados() {
  const { g, refresh, toast } = useGame();
  const c = g.clubs[g.userClubId];
  const [elegir, setElegir] = useState<StaffKey | null>(null);
  const run = (f: () => string) => {
    try {
      const msg = f();
      if (msg) toast(msg);
      refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <>
      <p className="small" style={{ margin: 0, color: 'var(--on-bg)' }}>
        Cada empleado tiene de 1 a 5 estrellas: cuantas más, mejor trabaja y más cobra. Contratar cuesta una prima de entrada, más su sueldo de lo que queda de la temporada (se paga de una). Los candidatos cambian cada fecha.
      </p>
      {STAFF_ORDER.map((k) => {
        const e = staffEstrellas(c, k);
        return (
          <section key={k} className="card stack">
            <h3>{STAFF[k].nombre}</h3>
            <p className="small" style={{ margin: 0 }}>{STAFF[k].efecto}</p>
            {e > 0 ? (
              <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div className="name">{nombreStaff(c, k)}{c.staffPersonas?.[k]?.idolo && <span className="pers pers-declub"> ⭐ Ídolo del club</span>}</div>
                  <Stars n={e} />
                </div>
                <div className="small muted" style={{ textAlign: 'right' }}>Cobra {formatMoney(staffSueldo(e, c) * ANIO)}<br />por año</div>
              </div>
            ) : (
              <div className="small muted">No tenés {STAFF[k].nombre.toLowerCase()}.</div>
            )}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn small grow" onClick={() => setElegir(k)}>
                {e > 0 ? 'Buscar otro' : 'Ver candidatos'}
              </button>
              {e > 0 && (
                <button className="btn small" onClick={() => run(() => despedirStaff(g, k))}>
                  Despedir
                </button>
              )}
            </div>
          </section>
        );
      })}
      {elegir && (
        <Sheet title={`Candidatos: ${STAFF[elegir].nombre.toLowerCase()}`} onClose={() => setElegir(null)}>
          <div className="stack">
            <p className="small muted" style={{ margin: 0 }}>Caja: {formatMoney(c.presupuesto)}. 5 estrellas es lo mejor.</p>
            {candidatosStaff(g, elegir).map((cand) => (
              <div key={cand.nombre} className="stack cand" style={{ gap: 6 }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div className="name">{cand.nombre}</div>
                    <Stars n={cand.estrellas} />
                  </div>
                  <div className="small" style={{ textAlign: 'right' }}>
                    {porAnio(cand.sueldo)}
                    <br />
                    <span className="muted">
                      Pagás ahora: {formatMoney(cand.prima + cand.sueldo * fechasRestantes(g))}
                      {fechasRestantes(g) > 0 ? ` (prima ${formatMoney(cand.prima)} + sueldo de ${fechasRestantes(g)} fechas)` : ''}
                    </span>
                  </div>
                </div>
                <button
                  className="btn small primary"
                  disabled={c.presupuesto < cand.prima + cand.sueldo * fechasRestantes(g)}
                  onClick={() => {
                    const k = elegir;
                    setElegir(null);
                    run(() => contratarStaff(g, k, cand));
                  }}
                >
                  {c.presupuesto < cand.prima ? 'No te alcanza' : 'Contratar'}
                </button>
              </div>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

function Sponsor() {
  const { g, refresh, toast } = useGame();
  const c = g.clubs[g.userClubId];
  return (
    <>
      {c.sponsor && (
        <section className="card stack">
          <h3>Tu sponsor: {c.sponsor.nombre}</h3>
          <p style={{ margin: 0 }}>
            Pagó {formatMoney(c.sponsor.fijo)} al firmar{c.sponsor.porVictoria ? ` y paga ${formatMoney(c.sponsor.porVictoria)} por cada partido ganado` : ''}. El contrato dura toda la temporada.
          </p>
          {c.sponsor.extra && <p className="small" style={{ margin: 0 }}>🎁 {c.sponsor.extra.texto}</p>}
        </section>
      )}
      {g.sponsorOfertas.length > 0 && (
        <section className="card stack">
          <h3>Ofertas de sponsors</h3>
          <p className="small muted" style={{ margin: 0 }}>Elegí uno para esta temporada. Uno paga todo junto; otros pagan menos al firmar pero dan premios por ganar, o te regalan algo para el club (🎁).</p>
          {g.sponsorOfertas.map((s, i) => (
            <div key={s.nombre} className="offer">
              <div className="grow">
                <b>{s.nombre}</b>
                <div className="small">
                  {formatMoney(s.fijo)} al firmar{s.porVictoria ? ` + ${formatMoney(s.porVictoria)} por victoria` : ''}
                </div>
                {s.extra && <div className="small" style={{ fontWeight: 700 }}>🎁 {s.extra.texto}</div>}
                <div className="small muted">{s.porVictoria ? `Si ganás 10 partidos: ${formatMoney(s.fijo + s.porVictoria * 10)} en plata.` : s.extra ? 'Menos plata, pero con el regalo.' : 'Plata segura, ganes o pierdas.'}</div>
              </div>
              <button
                className="btn primary small"
                onClick={() => {
                  toast(signSponsor(g, i));
                  refresh();
                }}
              >
                Firmar
              </button>
            </div>
          ))}
        </section>
      )}
      {!c.sponsor && !g.sponsorOfertas.length && <p className="small">No hay ofertas por ahora. Llegan al empezar cada temporada.</p>}
    </>
  );
}

/** Dibujo del club: crece con cada mejora (tribunas, gimnasio, campo y quincho). */
function StadiumView({ c }: { c: Club }) {
  const t = c.inst.tribunas;
  const gym = c.inst.gimnasio;
  const campo = c.inst.campo;
  const q = c.inst.quincho;
  const obra = new Set(c.obras.map((o) => o.tipo));
  const [c1, c2] = c.colores;
  // Tribuna de enfrente: una fila de gradas por nivel (hasta 8).
  const filas = Math.max(1, t + 1);
  const grada = (y0: number, n: number, x: number, w: number, flip = false) =>
    Array.from({ length: n }, (_, i) => {
      const y = flip ? y0 + i * 6 : y0 - i * 6;
      return <rect key={i} x={x + i * 2} y={y} width={w - i * 4} height={5} fill={i % 2 ? c1 : c2} stroke="#000" strokeWidth={0.6} />;
    });
  return (
    <section className="card stack">
      <h3>Tu club</h3>
      <svg viewBox="0 0 320 210" className="stadium" role="img" aria-label={`Estadio con ${t} ampliaciones de tribuna, gimnasio nivel ${gym}, campo nivel ${campo} y quincho nivel ${q}`}>
        <rect x="0" y="0" width="320" height="210" fill="#8ec5ff" />
        <rect x="0" y="120" width="320" height="90" fill="#5c9e3a" />
        {/* tribuna de enfrente */}
        {grada(112, filas, 40, 240)}
        <rect x={40} y={112 - filas * 6 - 6} width={240} height={6} fill="#333" />
        {t >= 4 && <rect x={36} y={112 - filas * 6 - 12} width={248} height={6} fill={c1} stroke="#000" strokeWidth={0.6} />}
        {/* público */}
        {Array.from({ length: Math.min(60, 8 + t * 7) }, (_, i) => (
          <circle key={i} cx={46 + ((i * 37) % 228)} cy={110 - ((i * 13) % Math.max(6, filas * 6 - 2))} r={1.6} fill={i % 3 ? '#222' : c1} />
        ))}
        {/* cancha */}
        <rect x="50" y="122" width="220" height="62" fill={campo >= 2 ? '#3f8f2e' : '#4f9a37'} stroke="#fff" strokeWidth={1.2} />
        {campo >= 1 && Array.from({ length: 6 }, (_, i) => <rect key={i} x={50 + i * 36.6} y={122} width={18} height={62} fill="#fff" opacity={0.06} />)}
        <line x1="160" y1="122" x2="160" y2="184" stroke="#fff" strokeWidth={1} />
        <line x1="72" y1="122" x2="72" y2="184" stroke="#fff" strokeWidth={0.8} />
        <line x1="248" y1="122" x2="248" y2="184" stroke="#fff" strokeWidth={0.8} />
        {/* palos */}
        {[56, 264].map((x) => (
          <g key={x} stroke="#fff" strokeWidth={1.4}>
            <line x1={x - 4} y1={150} x2={x - 4} y2={124} />
            <line x1={x + 4} y1={150} x2={x + 4} y2={124} />
            <line x1={x - 4} y1={142} x2={x + 4} y2={142} />
          </g>
        ))}
        {/* luces del campo */}
        {campo >= 3 &&
          [20, 300].map((x) => (
            <g key={x}>
              <line x1={x} y1={120} x2={x} y2={40} stroke="#555" strokeWidth={2} />
              <rect x={x - 7} y={34} width={14} height={7} fill="#fff7b0" stroke="#000" strokeWidth={0.6} />
            </g>
          ))}
        {/* tribuna de este lado (desde nivel 2) */}
        {t >= 2 && grada(190, Math.min(3, t - 1), 70, 180, true)}
        {/* gimnasio */}
        {gym > 0 && (
          <g>
            <rect x={6} y={190 - 10 - gym * 4} width={46} height={10 + gym * 4} fill="#d9d9e8" stroke="#000" strokeWidth={0.8} />
            <rect x={6} y={186 - 10 - gym * 4} width={46} height={5} fill={c1} stroke="#000" strokeWidth={0.6} />
            <text x={29} y={200} textAnchor="middle" fontSize="8" fill="#000">GIMNASIO</text>
          </g>
        )}
        {/* quincho con parrilla */}
        {q > 0 && (
          <g>
            <polygon points={`268,${178 - q * 3} 316,${178 - q * 3} 310,${168 - q * 3} 274,${168 - q * 3}`} fill="#8b4a2b" stroke="#000" strokeWidth={0.6} />
            <rect x={272} y={178 - q * 3} width={40} height={12 + q * 3} fill="#e9c58c" stroke="#000" strokeWidth={0.8} />
            <path d={`M300 ${166 - q * 3} q 3 -6 0 -12 q -3 -6 0 -12`} stroke="#bbb" strokeWidth={2} fill="none" opacity={0.8} />
            <text x={292} y={200} textAnchor="middle" fontSize="8" fill="#000">QUINCHO</text>
          </g>
        )}
        {/* obras en marcha */}
        {[...obra].map((k, i) => (
          <g key={k} transform={`translate(${130 + i * 40}, 8)`}>
            <rect width="34" height="12" fill="#ffcc1a" stroke="#000" strokeWidth={0.8} />
            <text x="17" y="9" textAnchor="middle" fontSize="7" fill="#000">EN OBRA</text>
          </g>
        ))}
      </svg>
      <p className="small muted" style={{ margin: 0 }}>Cada mejora se ve acá: más gradas y gente, gimnasio, luces y césped en la cancha, y el quincho.</p>
    </section>
  );
}

function HinchadaCard({ c }: { c: Club }) {
  const h = humor(c);
  const e = estadoHinchada(h);
  return (
    <section className="card stack">
      <h3>Hinchada y tercer tiempo</h3>
      <div className="row" style={{ gap: 10 }}>
        <span style={{ fontSize: 30 }}>{e.icono}</span>
        <div style={{ flex: 1 }}>
          <b>{e.label}</b>
          <div className="fillbar" style={{ width: "100%" }} aria-label={`Humor de la hinchada ${h} de 100`}>
            <span style={{ width: `${Math.max(3, h)}%`, background: h < 30 ? 'var(--loss)' : h < 55 ? 'var(--draw)' : 'var(--win)' }} />
          </div>
        </div>
      </div>
      <p className="small" style={{ margin: 0 }}>{e.texto}</p>
      <p className="small muted" style={{ margin: 0 }}>
        Sube cuando ganás (más en clásicos y finales) y baja cuando perdés. De local, la entrada cara la enoja y la barata la pone contenta. Contenta viene más gente y deja más plata en el quincho; muy enojada, la directiva te pierde confianza.
      </p>
    </section>
  );
}
