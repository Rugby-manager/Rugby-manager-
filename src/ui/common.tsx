import { useEffect, useState, type ReactNode } from 'react';
import { cloud, cloudStatus, onCloudStatus } from '../store/cloud';
import type { Club, Patron } from '../engine/types';

export function Jersey({ colors, color3, patron, number, size = 40, title }: { colors: [string, string]; color3?: string; patron: Patron; number?: number | string; size?: number; title?: string }) {
  const [a, b] = colors;
  const id = `j${a.slice(1)}${b.slice(1)}${color3?.slice(1) ?? ''}${patron}`;
  const body = 'M14 6 L24 3 Q32 9 40 3 L50 6 L62 18 L54 28 L50 24 L50 60 L14 60 L14 24 L10 28 L2 18 Z';
  const dark = isDark(a);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title ?? 'Camiseta'}>
      <defs>
        <clipPath id={id}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill={a} />
      <g clipPath={`url(#${id})`}>
        {patron === 'aros' && [14, 26, 38, 50].map((y, i) => <rect key={y} x="0" y={y} width="64" height="6" fill={color3 && i % 2 ? color3 : b} />)}
        {patron === 'rayas' && [16, 28, 40].map((x) => <rect key={x} x={x} y="0" width="6" height="64" fill={b} />)}
        {patron === 'banda' && <path d="M0 40 L64 8 L64 22 L0 54 Z" fill={b} />}
        {patron === 'mitades' && <rect x="32" y="0" width="32" height="64" fill={b} />}
        {patron === 'cuartos' && (
          <>
            <rect x="32" y="0" width="32" height="31" fill={b} />
            <rect x="0" y="31" width="32" height="33" fill={b} />
          </>
        )}
        {patron === 'cuadros' &&
          [0, 1, 2, 3, 4].flatMap((r) => [0, 1, 2, 3].filter((c) => (r + c) % 2 === 1).map((c) => <rect key={`${r}-${c}`} x={c * 16} y={r * 13} width="16" height="13" fill={b} />))}
      </g>
      <path d="M24 3 Q32 13 40 3" fill="none" stroke={b} strokeWidth="2.5" />
      <path d={body} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />
      {number !== undefined && (
        <text x="32" y="44" textAnchor="middle" fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif" fontWeight="700" fontSize="22" fill={dark ? '#fff' : '#111'} stroke={dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'} strokeWidth="2.5" paintOrder="stroke">
          {number}
        </text>
      )}
    </svg>
  );
}

/** Los sueldos se guardan por fecha, pero se muestran por año (18 fechas). */
export const ANIO = 18;
export const porAnio = (porFecha: number) => `${formatMoney(porFecha * ANIO)} por año`;

export function ClubJersey({ club, size = 40, number }: { club: Club; size?: number; number?: number | string }) {
  return <Jersey colors={club.colores} color3={club.color3} patron={club.patron} size={size} number={number} title={club.nombre} />;
}

function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 < 150;
}

export function ovrColor(v: number) {
  if (v >= 80) return '#1a7f45';
  if (v >= 72) return '#3f8f2f';
  if (v >= 65) return '#8a8a1f';
  if (v >= 58) return '#b5761c';
  return '#b5432b';
}

export function Ovr({ v }: { v: number }) {
  return (
    <span className="ovr num" style={{ background: ovrColor(v) }} aria-label={`Media ${v}`}>
      {Math.round(v)}
    </span>
  );
}

export function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="btn small" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

/** Estrellas de 0 a 5, con medias estrellas. */
export function Stars({ n, size }: { n: number; size?: number }) {
  const v = Math.max(0, Math.min(5, Math.round(n * 2) / 2));
  return (
    <span className="stars" style={size ? { fontSize: size } : undefined} role="img" aria-label={`${String(v).replace('.', ',')} de 5 estrellas`}>
      <span className="stars-bg" aria-hidden="true">★★★★★</span>
      <span className="stars-fg" aria-hidden="true" style={{ width: `${v * 20}%` }}>★★★★★</span>
    </span>
  );
}

/** Pasa una media o un atributo (40-90) a estrellas. */
export const toStars = (v: number) => (v - 40) / 10;

const I = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const Icons = {
  home: I('M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'),
  squad: I('M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 20v-2a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8'),
  team: I('M6 3v18M18 3v18M6 9h12M4 21h4M16 21h4'),
  fixture: I('M4 5h16v15H4zM4 10h16M9 3v4M15 3v4'),
  table: I('M4 5h16M4 10h16M4 15h16M4 20h16M9 5v15'),
  market: I('M3 7h18l-2 13H5zM8 7V5a4 4 0 0 1 8 0v2'),
};

export function formatMoney(v: number, exact = false) {
  const neg = v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (exact) return `${neg}$${Math.round(a).toLocaleString('es-AR')}`;
  if (a >= 100_000_000) return `${neg}$${Math.round(a / 1_000_000).toLocaleString('es-AR')} M`;
  if (a >= 1_000_000) return `${neg}$${(a / 1_000_000).toFixed(1).replace('.', ',')} M`;
  return `${neg}$${Math.round(a / 1000)} mil`;
}

/** Muestra si la partida está guardada en la cuenta de Claude. */
export function CloudBadge() {
  const [, setN] = useState(0);
  useEffect(() => {
    void cloud();
    return onCloudStatus(() => setN((n) => n + 1));
  }, []);
  const s = cloudStatus;
  if (s.local) return <p className="small muted" style={{ margin: 0 }}>💾 Las partidas se guardan en este teléfono. Para pasarlas a otro lado, usá la copia de respaldo del Menú.</p>;
  if (s.ok === null) return <p className="small muted" style={{ margin: 0 }}>☁️ Conectando con tu cuenta…</p>;
  if (!s.ok) return <p className="small" style={{ margin: 0, color: 'var(--bad, #c0392b)' }}>⚠️ {s.error} Mientras tanto queda guardada solo en este dispositivo: hacé una copia de respaldo.</p>;
  return (
    <p className="small" style={{ margin: 0 }}>
      ☁️ Guardado en tu cuenta{s.last ? ` a las ${new Date(s.last).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ' (conectado)'}.
    </p>
  );
}
