// Ventanas emergentes para los momentos importantes, más el escudo de cada club y la carita del DT.
import { useState, type ReactNode } from 'react';
import type { Club, GameState } from '../engine/types';
import { useGame } from './App';
import { formatMoney } from './common';
import { describirEvento, resolverEvento } from '../engine/vestuario';
import { RESPUESTAS_PRENSA, conferenciaPendiente, responderPrensa } from '../engine/diario';
import { hacerTercer, opcionesTercer, tercerPendiente } from '../engine/tercer';
import { SEVEN_NOMBRE, jugarSeven, rechazarSeven, sevenPendiente } from '../engine/seven';
import { acceptOffer, nombreOfertante, rejectOffer } from '../engine/offers';
import { LOGROS } from '../engine/logros';
import { prestigioTexto } from '../engine/career';
import { isDerby } from '../engine/extras';
import { overall, posText } from '../engine/players';
import { contratosPorVencer, dejarIr, renew, renewalDemand, STAFF } from '../engine/club';
import { ESTILO_DIR, apoyar, directivaDe, hayCampana } from '../engine/elecciones';
import { PUESTOS_IDOLO, contratarIdolo, homenajeIdolo, idolosPendientes, sueldoIdolo } from '../engine/idolos';

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

const claro = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 150;
};

/** Escudo del club: sus colores, una banda y sus iniciales. Dibujo propio. */
export function Escudo({ club, size = 48 }: { club: Club; size?: number }) {
  const [a, b] = club.colores;
  const id = `esc${club.id}`;
  const forma = hash(club.codigo ?? club.id) % 3;
  const txt = claro(a) ? '#111' : '#fff';
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 60 69" aria-label={`Escudo de ${club.nombre}`}>
      <defs>
        <clipPath id={id}>
          <path d="M6 6 H54 V34 C54 50 42 60 30 66 C18 60 6 50 6 34 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="60" height="69" fill={a} />
        {forma === 0 && <path d="M0 40 L60 18 L60 30 L0 52 Z" fill={b} />}
        {forma === 1 && <rect x="22" width="16" height="69" fill={b} />}
        {forma === 2 && (
          <>
            <rect x="30" width="30" height="33" fill={b} />
            <rect y="33" width="30" height="36" fill={b} />
          </>
        )}
        <rect y="6" width="60" height="14" fill="#0009" />
      </g>
      <path d="M6 6 H54 V34 C54 50 42 60 30 66 C18 60 6 50 6 34 Z" fill="none" stroke="#000" strokeWidth="3" />
      <path d="M9 9 H51 V34 C51 48 41 57 30 62 C19 57 9 48 9 34 Z" fill="none" stroke="#ffd34d" strokeWidth="1.2" />
      <text x="30" y="17.5" textAnchor="middle" fontFamily="Teko, sans-serif" fontSize="11" fill="#ffd34d" letterSpacing="1">
        {club.corto}
      </text>
      <ellipse cx="30" cy="40" rx="9" ry="5.5" fill="#7a3b14" stroke="#000" strokeWidth="1.2" transform="rotate(-25 30 40)" />
      <path d="M25 41.5 L35 38.5" stroke="#fff" strokeWidth="1" />
      <text
        x="30"
        y="56"
        textAnchor="middle"
        fontFamily="Teko, sans-serif"
        fontSize="7.5"
        fill={txt}
        opacity="0.9"
        {...((club.ciudad?.length ?? 0) > 7 ? { textLength: 30, lengthAdjust: 'spacingAndGlyphs' } : {})}
      >
        {club.ciudad?.toUpperCase()}
      </text>
    </svg>
  );
}

/** La carita del DT: tono de piel, pelo y bigote salen del nombre. Dibujo propio. */
export function Avatar({ nombre, size = 56 }: { nombre: string; size?: number }) {
  const h = hash(nombre || 'DT');
  const piel = ['#f3d2b3', '#e8b98f', '#c98d5e', '#a8693f', '#7a4a2a'][h % 5];
  const pelo = ['#2a1a10', '#5a3a1a', '#8a5a2a', '#c9a15a', '#555', '#ddd'][(h >> 3) % 6];
  const pelado = (h >> 6) % 5 === 0;
  const bigote = (h >> 8) % 3 === 0;
  const barba = (h >> 10) % 4 === 0;
  const lentes = (h >> 12) % 4 === 0;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="8" fill="#1b2366" />
      <path d="M8 64 C10 50 20 46 32 46 C44 46 54 50 56 64 Z" fill="#1f7a3a" stroke="#000" strokeWidth="2" />
      <path d="M26 46 L32 54 L38 46" fill="#fff" stroke="#000" strokeWidth="1.5" />
      <ellipse cx="32" cy="30" rx="14" ry="16" fill={piel} stroke="#000" strokeWidth="2" />
      {!pelado && <path d="M18 27 C18 14 46 12 46 27 C44 20 38 18 32 19 C26 18 20 20 18 27 Z" fill={pelo} stroke="#000" strokeWidth="1.5" />}
      {barba && <path d="M19 34 C21 46 43 46 45 34 C42 42 22 42 19 34 Z" fill={pelo} opacity="0.85" />}
      <circle cx="26" cy="30" r="2" fill="#000" />
      <circle cx="38" cy="30" r="2" fill="#000" />
      {lentes && (
        <g fill="none" stroke="#000" strokeWidth="1.5">
          <circle cx="26" cy="30" r="5" />
          <circle cx="38" cy="30" r="5" />
          <path d="M31 30 H33" />
        </g>
      )}
      {bigote && <path d="M25 38 C28 36 36 36 39 38 C36 39 28 39 25 38 Z" fill={pelo} stroke="#000" strokeWidth="0.8" />}
      <path d="M28 41 C30 42.5 34 42.5 36 41" stroke="#000" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** Tu ficha de DT, arriba de todo en Inicio. */
export function FichaDT() {
  const { g, go } = useGame();
  const c = g.clubs[g.userClubId];
  const titulo = g.career ? `DT ${prestigioTexto(g.career.prestigio).toLowerCase()}` : 'Director técnico';
  return (
    <section className="ficha-dt">
      <Avatar nombre={g.manager} />
      <div className="fd-main">
        <b>{g.manager}</b>
        <small>
          {titulo} · {g.dt?.partidos ?? 0} PJ
        </small>
      </div>
      <button className="fd-caja" onClick={() => go('club', 'caja')}>
        <span className={c.presupuesto >= 0 ? 'pos' : 'neg'}>{formatMoney(c.presupuesto)}</span>
        <small>Caja del club</small>
      </button>
    </section>
  );
}

interface Opcion {
  texto: string;
  sub?: string;
  tono?: 'si' | 'no' | 'neutro';
  hacer: () => string;
}
interface Evento {
  key: string;
  banda: string;
  color: string;
  icono: string;
  titulo: string;
  club?: Club;
  texto: ReactNode;
  opciones: Opcion[];
}

function eventos(g: GameState): Evento[] {
  const out: Evento[] = [];
  const yo = g.clubs[g.userClubId];
  // Logros recién ganados.
  for (const l of (g.logros ?? []).filter((x) => x.nuevo)) {
    const info = LOGROS.find((x) => x.id === l.id);
    if (!info) continue;
    out.push({
      key: `logro-${l.id}`,
      banda: 'Logro desbloqueado',
      color: '#b8860b',
      icono: info.icono,
      titulo: info.titulo,
      texto: info.desc,
      opciones: [{ texto: '¡Vamos!', tono: 'si', hacer: () => ((l.nuevo = false), '') }],
    });
  }
  // Ofertas por tus jugadores.
  for (const o of (g.ofertas ?? []).filter((x) => !x.vista)) {
    const p = g.players[o.playerId];
    if (!p) continue;
    if (o.prestamo) {
      const club = g.clubs[o.clubId];
      out.push({
        key: `oferta-${o.id}`,
        banda: 'Pedido de préstamo',
        color: '#0f7c8c',
        icono: '🔁',
        titulo: `Piden a ${p.apellido} cedido`,
        club,
        texto: (
          <>
            {club?.nombre} quiere llevarse a {p.nombre} {p.apellido} ({overall(p)} de media, {p.edad} años) a préstamo{' '}
            <b>{o.prestamo >= 2 ? 'por dos temporadas' : 'hasta fin de temporada'}</b>. Te pagan <b>{formatMoney(o.monto)}</b>, ellos le pagan el sueldo y allá suma minutos.
          </>
        ),
        opciones: [
          { texto: 'Aceptar el préstamo', tono: 'si', hacer: () => acceptOffer(g, o.id) },
          { texto: 'Rechazar', tono: 'no', hacer: () => rejectOffer(g, o.id) },
          { texto: 'Pensarlo (Mercado > Ofertas)', tono: 'neutro', hacer: () => ((o.vista = true), '') },
        ],
      });
      continue;
    }
    out.push({
      key: `oferta-${o.id}`,
      banda: o.exterior ? 'Oferta del exterior' : 'Oferta por un jugador',
      color: '#1f4fa3',
      icono: '✉️',
      titulo: `Quieren a ${p.apellido}`,
      club: o.exterior ? undefined : g.clubs[o.clubId],
      texto: (
        <>
          {nombreOfertante(g, o)} ofrece <b>{formatMoney(o.monto)}</b> por {p.nombre} {p.apellido} ({overall(p)} de media, {p.edad} años).
        </>
      ),
      opciones: [
        { texto: 'Aceptar', tono: 'si', hacer: () => acceptOffer(g, o.id) },
        { texto: 'Rechazar', tono: 'no', hacer: () => rejectOffer(g, o.id) },
        { texto: 'Pensarlo (Mercado > Ofertas)', tono: 'neutro', hacer: () => ((o.vista = true), '') },
      ],
    });
  }
  // Contratos que se terminan.
  for (const p of contratosPorVencer(g)) {
    const pide = renewalDemand(p, g);
    const anios = p.edad >= 32 ? [1] : [2, 1];
    out.push({
      key: `contrato-${p.id}-${g.temporada}`,
      banda: 'Se termina un contrato',
      color: '#ee8a12',
      icono: '📄',
      titulo: `${p.nombre} ${p.apellido}`,
      club: yo,
      texto: (
        <>
          {posText(p)}, {p.edad} años, {overall(p)} de media. Le queda <b>la última temporada</b>: si no le renovás, se va libre cuando termine el torneo.
          <br />
          Para seguir pide <b>{formatMoney(pide)} por fecha</b>
          {pide > p.sueldo ? ` (hoy cobra ${formatMoney(p.sueldo)})` : ''}.
        </>
      ),
      opciones: [
        ...anios.map((n) => ({
          texto: `Renovar ${n} ${n === 1 ? 'temporada' : 'temporadas'}`,
          tono: (n === anios[0] ? 'si' : 'neutro') as Opcion['tono'],
          hacer: () => renew(g, p.id, n),
        })),
        { texto: 'Dejarlo ir', tono: 'no', hacer: () => dejarIr(g, p.id) },
      ],
    });
  }
  if (g.vestuario) {
    const d = describirEvento(g, g.vestuario);
    out.push({
      key: `vest-${g.vestuario.id}`,
      banda: 'Vestuario',
      color: '#7b3fb5',
      icono: '🗣',
      titulo: d.titulo,
      club: yo,
      texto: d.texto,
      opciones: d.opciones.map((op, i) => ({ texto: op.texto, sub: op.efecto, hacer: () => resolverEvento(g, i) })),
    });
  }
  const fp = conferenciaPendiente(g);
  if (fp) {
    const rival = g.clubs[fp.home === yo.id ? fp.away : fp.home];
    out.push({
      key: `prensa-${fp.id}`,
      banda: isDerby(g.clubs[fp.home], g.clubs[fp.away]) ? 'Clásico · Conferencia' : 'Conferencia de prensa',
      color: '#c0392b',
      icono: '🎤',
      titulo: `Antes de jugar con ${rival.nombre}`,
      club: rival,
      texto: '"¿Qué le dice a la gente?"',
      opciones: RESPUESTAS_PRENSA.map((r, i) => ({ texto: `"${r.texto}"`, sub: r.efecto, hacer: () => responderPrensa(g, i) })),
    });
  }
  const ft = tercerPendiente(g);
  if (ft) {
    const rival = g.clubs[ft.home === yo.id ? ft.away : ft.home];
    const r = ft.result!;
    out.push({
      key: `tercer-${ft.id}`,
      banda: 'Tercer tiempo',
      color: '#8a4a1a',
      icono: '🍖',
      titulo: `${g.clubs[ft.home].corto} ${r.ptsH} - ${r.ptsA} ${g.clubs[ft.away].corto}`,
      club: rival,
      texto: '¿Cómo sigue la noche?',
      opciones: opcionesTercer(g, ft).map((o) => ({ texto: o.texto, sub: o.efecto, hacer: () => hacerTercer(g, o.id) })),
    });
  }
  if (sevenPendiente(g)) {
    out.push({
      key: `seven-${g.temporada}`,
      banda: 'Invitación',
      color: '#0f7c8c',
      icono: '🏖️',
      titulo: SEVEN_NOMBRE,
      club: yo,
      texto: 'Te invitan al seven de la playa antes de la liga. Van tus 10 más rápidos: suben velocidad y resistencia y hay premio en plata.',
      opciones: [
        {
          texto: 'Jugar el Seven',
          tono: 'si',
          hacer: () => {
            const s = jugarSeven(g);
            return s.campeon ? `¡Campeones del Seven! Cobraste ${formatMoney(s.premio)}.` : `Quedaron en ${s.partidos[s.partidos.length - 1].etapa.toLowerCase()}.${s.premio ? ` Cobraste ${formatMoney(s.premio)}.` : ''}`;
          },
        },
        { texto: 'No, gracias', tono: 'no', hacer: () => (rechazarSeven(g), 'Esta vez no van al Seven.') },
      ],
    });
  }
  // Ídolos que se retiraron y pueden volver al club.
  for (const i of idolosPendientes(g)) {
    out.push({
      key: `idolo-${i.id}`,
      banda: 'Colgó los botines',
      color: '#b8860b',
      icono: '👴',
      titulo: i.nombre,
      club: yo,
      texto: (
        <>
          {i.puesto}, {i.temporadas} {i.temporadas === 1 ? 'temporada' : 'temporadas'} en el club, {i.partidos} partidos y {i.tries} tries. Se retiró a los {i.edad} y quiere seguir ligado al club. Como empleado
          sería de <b>{i.estrellas} {i.estrellas === 1 ? 'estrella' : 'estrellas'}</b> y cobraría {formatMoney(sueldoIdolo(g, i))} por fecha (menos que cualquiera, porque vuelve a su casa). La hinchada lo adora.
        </>
      ),
      opciones: [
        ...PUESTOS_IDOLO.map((k, n) => ({
          texto: `Sumarlo como ${STAFF[k].nombre.toLowerCase()}`,
          tono: (n === 0 ? 'si' : 'neutro') as Opcion['tono'],
          hacer: () => contratarIdolo(g, i.id, k),
        })),
        { texto: 'Un homenaje y listo', tono: 'no', hacer: () => homenajeIdolo(g, i.id) },
      ],
    });
  }
  // Campaña electoral: ¿a quién apoyás?
  if (g.phase === 'regular' && hayCampana(g)) {
    const d = directivaDe(g);
    if (d.oposicion && !d.apoyo) {
      const of = ESTILO_DIR[d.estilo];
      const op = ESTILO_DIR[d.oposicion.estilo];
      out.push({
        key: `eleccion-${g.temporada}`,
        banda: 'Elecciones en el club',
        color: '#1f4fa3',
        icono: '🗳',
        titulo: '¿A quién apoyás?',
        club: yo,
        texto: (
          <>
            Al terminar la temporada votan los socios. <b>{d.presidente}</b> va por la reelección ({of.icono} {of.label.toLowerCase()}: {of.pide.toLowerCase().replace(/\.$/, '')}) y enfrente está{' '}
            <b>{d.oposicion.presidente}</b> ({op.icono} {op.label.toLowerCase()}: {op.pide.toLowerCase().replace(/\.$/, '')}). Si apoyás a uno y gana, te banca. Si pierde, la otra comisión no se olvida.
          </>
        ),
        opciones: [
          { texto: `Apoyar a ${d.presidente}`, sub: 'El oficialismo', tono: 'neutro', hacer: () => apoyar(g, 'oficialismo') },
          { texto: `Apoyar a ${d.oposicion.presidente}`, sub: 'La oposición', tono: 'neutro', hacer: () => apoyar(g, 'oposicion') },
          { texto: 'No meterme', sub: 'Que voten los socios', tono: 'si', hacer: () => apoyar(g, 'neutral') },
        ],
      });
    }
  }
  // Volvió la gira de verano.
  if (g.gira && g.gira.temporada === g.temporada && !g.gira.vista) {
    const gi = g.gira;
    const ganados = gi.partidos.filter((x) => x.pf > x.pc).length;
    out.push({
      key: `gira-${gi.temporada}`,
      banda: 'Gira de verano',
      color: '#0f7c8c',
      icono: '✈️',
      titulo: `Volvieron de ${gi.destino}`,
      club: yo,
      texto: (
        <>
          {gi.partidos.map((x) => (
            <span key={x.rival} style={{ display: 'block' }}>
              {x.pf > x.pc ? '✅' : x.pf < x.pc ? '❌' : '➖'} {yo.corto} {x.pf} - {x.pc} {x.rival}
            </span>
          ))}
          Ganaron {ganados} de 3. Cobraste <b>{formatMoney(gi.plata)}</b> y {gi.mejoraron} jugadores de 23 años o menos volvieron con más experiencia.
        </>
      ),
      opciones: [{ texto: '¡Buen viaje!', tono: 'si', hacer: () => ((gi.vista = true), '') }],
    });
  }
  return out;
}

/** Muestra de a una las ventanas pendientes. "Después" las deja para más tarde (siguen en Inicio). */
export function PopupEventos() {
  const { g, refresh, saveNow } = useGame();
  const [luego, setLuego] = useState<Set<string>>(new Set());
  const [resultado, setResultado] = useState<{ ev: Evento; texto: string } | null>(null);
  const ev = eventos(g).find((e) => !luego.has(e.key));
  const actual = resultado?.ev ?? ev;
  if (!actual) return null;
  return (
    <div className="pop-bg">
      <div className="pop" role="dialog" aria-modal="true" style={{ borderColor: actual.color }}>
        <div className="pop-banda" style={{ background: `linear-gradient(90deg, transparent, ${actual.color})` }}>
          {actual.banda}
        </div>
        <div className="pop-tit">
          <span>{actual.icono}</span> {actual.titulo}
        </div>
        {actual.club && (
          <div className="pop-esc">
            <Escudo club={actual.club} size={64} />
          </div>
        )}
        {resultado ? (
          <>
            <p className="pop-txt">{resultado.texto}</p>
            <button
              className="pop-btn si"
              onClick={() => {
                setResultado(null);
                refresh();
                void saveNow();
              }}
            >
              OK
            </button>
          </>
        ) : (
          <>
            <p className="pop-txt">{actual.texto}</p>
            <div className="pop-ops">
              {actual.opciones.map((o) => (
                <button
                  key={o.texto}
                  className={`pop-btn ${o.tono ?? ''}`}
                  onClick={() => {
                    let t = '';
                    try {
                      t = o.hacer();
                    } catch (e) {
                      t = (e as Error).message;
                    }
                    if (t) setResultado({ ev: actual, texto: t });
                    else {
                      refresh();
                      void saveNow();
                    }
                  }}
                >
                  {o.texto}
                  {o.sub && <small>{o.sub}</small>}
                </button>
              ))}
            </div>
            <button className="pop-luego" onClick={() => setLuego(new Set([...luego, actual.key]))}>
              Después
            </button>
          </>
        )}
      </div>
    </div>
  );
}
