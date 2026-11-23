// Íconos ilustrados propios, estilo programa de los 90: colores fuertes y contorno grueso.
const O = '#10142e'; // contorno
const SW = 2.2;

type P = { size?: number };

function Svg({ size = 40, children }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flex: 'none' }}>
      <g stroke={O} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
    </svg>
  );
}

export const IcoMarcador = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="8" width="38" height="26" rx="3" fill="#5b6280" />
    <rect x="9" y="12" width="30" height="18" rx="1.5" fill="#0b0f24" />
    <rect x="12" y="15" width="10" height="12" fill="#ff9d1a" stroke="none" />
    <rect x="26" y="15" width="10" height="12" fill="#ff9d1a" stroke="none" />
    <path d="M14 17h6v4h-6v4h6M28 17h6v8h-6z" stroke="#0b0f24" strokeWidth="1.6" fill="none" />
    <path d="M17 34l-4 8M31 34l4 8M10 42h28" fill="none" />
  </Svg>
);

export const IcoTabla = (p: P) => (
  <Svg {...p}>
    <path d="M9 5h24l6 6v32H9z" fill="#ffffff" />
    <path d="M33 5v6h6" fill="#d7dcf0" />
    <rect x="13" y="13" width="22" height="5" fill="#2a5bd7" />
    <path d="M13 23h22M13 28h22M13 33h22M13 38h14" stroke="#7d84aa" strokeWidth="2" />
    <rect x="13" y="21.5" width="4" height="3" fill="#2e9a3e" stroke="none" />
    <rect x="13" y="36.5" width="4" height="3" fill="#d22d2d" stroke="none" />
  </Svg>
);

export const IcoDiario = (p: P) => (
  <Svg {...p}>
    <path d="M6 10h32v30H10a4 4 0 0 1-4-4z" fill="#f2f2ea" />
    <path d="M38 16h4v20a4 4 0 0 1-4 4" fill="#d7d7cc" />
    <rect x="10" y="14" width="24" height="6" fill="#10142e" stroke="none" />
    <rect x="10" y="24" width="10" height="10" fill="#ffcc1a" />
    <path d="M24 25h10M24 29h10M24 33h10M10 37h24" stroke="#7d84aa" strokeWidth="2" />
  </Svg>
);

export const IcoFormacion = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="6" width="38" height="36" rx="2" fill="#26904a" />
    <path d="M5 24h38M5 14h38M5 34h38" stroke="#ffffff" strokeWidth="1.6" />
    <circle cx="14" cy="11" r="2.6" fill="#ffcc1a" strokeWidth="1.5" />
    <circle cx="24" cy="11" r="2.6" fill="#ffcc1a" strokeWidth="1.5" />
    <circle cx="34" cy="11" r="2.6" fill="#ffcc1a" strokeWidth="1.5" />
    <circle cx="19" cy="19" r="2.6" fill="#ffcc1a" strokeWidth="1.5" />
    <circle cx="29" cy="19" r="2.6" fill="#ffcc1a" strokeWidth="1.5" />
    <circle cx="11" cy="30" r="2.6" fill="#d22d2d" strokeWidth="1.5" />
    <circle cx="24" cy="29" r="2.6" fill="#d22d2d" strokeWidth="1.5" />
    <circle cx="37" cy="30" r="2.6" fill="#d22d2d" strokeWidth="1.5" />
    <circle cx="24" cy="38" r="2.6" fill="#d22d2d" strokeWidth="1.5" />
  </Svg>
);

export const IcoTactica = (p: P) => (
  <Svg {...p}>
    <rect x="8" y="6" width="32" height="38" rx="3" fill="#a5682a" />
    <rect x="12" y="11" width="24" height="29" fill="#ffffff" />
    <rect x="18" y="3" width="12" height="7" rx="2" fill="#c9ccd8" />
    <path d="M15 16l4 4M19 16l-4 4" stroke="#d22d2d" strokeWidth="2.2" />
    <circle cx="30" cy="20" r="3" fill="none" stroke="#2a5bd7" strokeWidth="2.2" />
    <path d="M17 34c4-8 9-9 15-12" fill="none" stroke="#2a5bd7" strokeWidth="2" />
    <path d="M28 21l4 1-2 4" fill="none" stroke="#2a5bd7" strokeWidth="2" />
  </Svg>
);

export const IcoRival = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="16" width="34" height="26" rx="2" fill="#26904a" />
    <path d="M4 29h34M21 16v26" stroke="#ffffff" strokeWidth="1.6" />
    <circle cx="29" cy="17" r="10" fill="#bfe7ff" fillOpacity="0.85" />
    <path d="M36 24l8 8" strokeWidth="5" />
    <path d="M36 24l8 8" stroke="#a5682a" strokeWidth="2.6" />
  </Svg>
);

export const IcoCopa = (p: P) => (
  <Svg {...p}>
    <path d="M14 6h20v10a10 10 0 0 1-20 0z" fill="#ffcc1a" />
    <path d="M14 9H8a6 6 0 0 0 6 8M34 9h6a6 6 0 0 1-6 8" fill="none" />
    <path d="M24 26v8" />
    <path d="M17 34h14l2 8H15z" fill="#a5682a" />
    <path d="M19 10v6" stroke="#fff3b0" strokeWidth="2.4" />
  </Svg>
);

export const IcoContrato = (p: P) => (
  <Svg {...p}>
    <path d="M8 6h22l6 6v30H8z" fill="#ffffff" />
    <path d="M12 14h14M12 19h18M12 24h18M12 29h12" stroke="#7d84aa" strokeWidth="2" />
    <path d="M12 37c3-4 5 2 8-1s4 1 6-1" fill="none" stroke="#2a5bd7" strokeWidth="2" />
    <path d="M30 40l12-16 4 3-12 16-5 2z" fill="#d22d2d" />
    <path d="M42 24l4 3" />
  </Svg>
);

export const IcoCamisetas = (p: P) => (
  <Svg {...p}>
    <path d="M6 14l7-4h4a4 4 0 0 0 6 0h4l7 4-4 7-3-2v19H13V19l-3 2z" fill="#2a5bd7" />
    <path d="M17 24h8" stroke="#ffffff" strokeWidth="3" />
    <path d="M20 20l7-4h4a4 4 0 0 0 6 0h4l7 4-4 7-3-2v19H27V25l-3 2z" fill="#d22d2d" transform="translate(-6 2)" />
    <path d="M27 31h8" stroke="#ffffff" strokeWidth="3" transform="translate(-6 2)" />
  </Svg>
);

export const IcoSilbato = (p: P) => (
  <Svg {...p}>
    <path d="M8 20h18v-6h8l6 6v4a12 12 0 1 1-24 0z" fill="#c9ccd8" transform="translate(-2 2)" />
    <circle cx="18" cy="30" r="4" fill="#10142e" />
    <path d="M38 22c3-2 4-6 3-10" fill="none" stroke="#d22d2d" strokeWidth="2.4" />
    <path d="M28 16h8" stroke="#ffffff" strokeWidth="2" />
  </Svg>
);

export const IcoCaja = (p: P) => (
  <Svg {...p}>
    <rect x="6" y="8" width="36" height="32" rx="3" fill="#7d84aa" />
    <rect x="10" y="12" width="28" height="24" rx="2" fill="#5b6280" />
    <circle cx="24" cy="24" r="7" fill="#c9ccd8" />
    <path d="M24 17v3M24 28v3M17 24h3M28 24h3" strokeWidth="1.6" />
    <circle cx="24" cy="24" r="2" fill="#10142e" />
    <path d="M10 40v4M38 40v4" strokeWidth="3" />
    <rect x="34" y="20" width="3" height="8" fill="#ffcc1a" strokeWidth="1.4" />
  </Svg>
);

export const IcoEntrada = (p: P) => (
  <Svg {...p}>
    <path d="M4 14h40v7a3 3 0 0 0 0 6v7H4v-7a3 3 0 0 0 0-6z" fill="#ff9d1a" />
    <path d="M32 14v20" stroke="#10142e" strokeDasharray="2.5 2.5" strokeWidth="1.8" />
    <path d="M9 20h18M9 25h14M9 30h18" stroke="#7a3d00" strokeWidth="2" />
  </Svg>
);

export const IcoEstadio = (p: P) => (
  <Svg {...p}>
    <ellipse cx="24" cy="28" rx="21" ry="13" fill="#c9ccd8" />
    <ellipse cx="24" cy="28" rx="14" ry="8" fill="#26904a" />
    <path d="M24 20v16M10 28h28" stroke="#ffffff" strokeWidth="1.4" />
    <path d="M6 22V12M42 22V12" strokeWidth="2.4" />
    <path d="M3 12h6M39 12h6" strokeWidth="2" stroke="#ffcc1a" />
  </Svg>
);

export const IcoCalendario = (p: P) => (
  <Svg {...p}>
    <rect x="6" y="9" width="36" height="33" rx="3" fill="#ffffff" />
    <path d="M6 12a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v6H6z" fill="#d22d2d" />
    <path d="M14 5v8M34 5v8" strokeWidth="3" />
    <text x="24" y="37" textAnchor="middle" fontFamily="Teko, sans-serif" fontWeight="700" fontSize="18" fill="#10142e" stroke="none">
      18
    </text>
  </Svg>
);

export const IcoPesas = (p: P) => (
  <Svg {...p}>
    <rect x="15" y="21" width="18" height="6" rx="1" fill="#c9ccd8" />
    <rect x="8" y="12" width="7" height="24" rx="2" fill="#d22d2d" />
    <rect x="33" y="12" width="7" height="24" rx="2" fill="#d22d2d" />
    <rect x="3" y="17" width="5" height="14" rx="1.5" fill="#5b6280" />
    <rect x="40" y="17" width="5" height="14" rx="1.5" fill="#5b6280" />
    <path d="M10 15v8" stroke="#ff9c9c" strokeWidth="2" />
  </Svg>
);

export const IcoLibro = (p: P) => (
  <Svg {...p}>
    <path d="M8 8h14a4 4 0 0 1 4 4v28a3 3 0 0 0-3-3H8z" fill="#2a5bd7" />
    <path d="M40 8H30a4 4 0 0 0-4 4v28a3 3 0 0 1 3-3h11z" fill="#d22d2d" />
    <path d="M12 15h9M12 20h9M30 15h7M30 20h7" stroke="#ffffff" strokeWidth="2" />
    <rect x="13" y="26" width="6" height="6" fill="#ffcc1a" strokeWidth="1.5" />
  </Svg>
);

export const IcoPelota = (p: P) => (
  <Svg {...p}>
    <ellipse cx="24" cy="24" rx="19" ry="12" transform="rotate(-30 24 24)" fill="#a5682a" />
    <path d="M16 30l16-12" stroke="#ffffff" strokeWidth="2" />
    <path d="M19 25l3 3M22 22l3 3M25 20l3 3" stroke="#ffffff" strokeWidth="1.8" />
  </Svg>
);

export const IcoBandera = (p: P) => (
  <Svg {...p}>
    <path d="M10 6v38" strokeWidth="3" />
    <path d="M10 8h28l-5 8 5 8H10z" fill="#7ec4ef" />
    <path d="M10 13.5h26.5M10 18.5h26.5" stroke="#ffffff" strokeWidth="3.2" />
    <circle cx="20" cy="16" r="2.6" fill="#ffcc1a" strokeWidth="1.4" />
  </Svg>
);
