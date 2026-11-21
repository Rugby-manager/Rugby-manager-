import { CLIMA_ICON, CLIMA_LABEL, type Clima } from '../engine/extras';
import { ClubJersey } from './common';
import type { Club, MatchEvent } from '../engine/types';

const SHORT: Partial<Record<MatchEvent['kind'], string>> = {
  try: '¡TRY!',
  conversion: 'Conversión adentro',
  conversionErrada: 'Conversión errada',
  penal: 'Penal a los palos: ¡adentro!',
  penalErrado: 'Penal errado',
  drop: '¡Drop!',
  amarilla: 'Tarjeta amarilla',
  lesion: 'Jugador lesionado',
  cambio: 'Cambio',
  entretiempo: 'Entretiempo',
  final: 'Final del partido',
  inicio: 'Saque inicial',
  roja: '¡Tarjeta roja!',
  tmo: 'Revisa el TMO',
  line: 'Al line',
};

/** Dónde está la pelota según la jugada (el local ataca hacia la derecha). */
function ballX(e: MatchEvent | undefined, i: number): number {
  if (!e || e.kind === 'inicio' || e.kind === 'entretiempo') return 50;
  if (e.kind === 'final') return 50;
  const dir = e.side === 'H' ? 1 : e.side === 'A' ? -1 : 0;
  if (e.kind === 'try') return 50 + dir * 46;
  if (e.kind === 'line' || e.kind === 'tmo') return 50 + dir * 42;
  if (e.kind === 'conversion' || e.kind === 'conversionErrada') return 50 + dir * 40;
  if (e.kind === 'penal' || e.kind === 'penalErrado' || e.kind === 'drop') return 50 + dir * 25;
  if (e.kind === 'amarilla' || e.kind === 'roja' || e.kind === 'lesion' || e.kind === 'cambio') return 50 - dir * 10;
  // Jugadas sueltas: un poco de movimiento para que se vea vivo.
  return 50 + dir * (8 + ((i * 37) % 30));
}

export function LivePitch({ home, away, cur, index, done, label, clock, clima, clasico }: { home: Club; away: Club; cur?: MatchEvent; index: number; done: boolean; label: string; clock?: number; clima?: Clima; clasico?: boolean }) {
  const m = clock ?? cur?.min ?? 0;
  const half = done ? 'FINAL' : cur?.kind === 'entretiempo' ? 'ENTRETIEMPO' : m < 40 ? 'PRIMER TIEMPO' : 'SEGUNDO TIEMPO';
  const x = ballX(cur, index);
  const y = 30 + ((index * 53) % 40);
  const toastTxt = cur && cur.kind !== 'jugada' ? `${SHORT[cur.kind] ?? ''}${cur.side ? ` · ${(cur.side === 'H' ? home : away).corto}` : ''}` : cur ? cur.text : '';
  const status = done ? 'FINAL' : cur?.kind === 'entretiempo' ? 'ENTRETIEMPO' : 'EN JUEGO';
  return (
    <div className="live">
      <div className="live-half">
        {half}
        {clima && ` · ${CLIMA_ICON[clima]} ${CLIMA_LABEL[clima].toUpperCase()}`}
        {clasico && ' · 🔥 CLÁSICO'}
      </div>
      <div className="live-cards">
        <TeamCard club={home} side="Local" />
        <div className="live-score">
          <span className="live-clock num">{done ? '80:00' : `${String(clock ?? cur?.min ?? 0).padStart(2, '0')}:00`}</span>
          <div className="live-digits">
            <b className="num">{cur?.scoreH ?? 0}</b>
            <i>–</i>
            <b className="num">{cur?.scoreA ?? 0}</b>
          </div>
          <span className={`live-status ${done ? 'end' : ''}`}>● {status}</span>
        </div>
        <TeamCard club={away} side="Visitante" right />
      </div>
      <div className={`live-field ${clima === 'lluvia' ? 'rain' : ''}`}>
        <svg viewBox="0 0 200 110" preserveAspectRatio="none" aria-label={`Cancha. ${label}`} role="img">
          {/* tribunas */}
          <rect x="0" y="0" width="200" height="110" fill="#0d1030" />
          {Array.from({ length: 9 }, (_, k) => (
            <rect key={`t${k}`} x={20 + k * 18} y="1" width="15" height="7" rx="1" fill="#252a63" />
          ))}
          {Array.from({ length: 9 }, (_, k) => (
            <rect key={`b${k}`} x={20 + k * 18} y="102" width="15" height="7" rx="1" fill="#252a63" />
          ))}
          {/* césped con franjas */}
          {Array.from({ length: 10 }, (_, k) => (
            <rect key={`g${k}`} x={10 + k * 18} y="11" width="18" height="88" fill={k % 2 ? '#2a8f45' : '#2f9c4c'} />
          ))}
          {/* ingoals */}
          <rect x="10" y="11" width="12" height="88" fill="#26803e" />
          <rect x="178" y="11" width="12" height="88" fill="#26803e" />
          <g stroke="#fff" strokeWidth="0.8" fill="none">
            <rect x="10" y="11" width="180" height="88" />
            <line x1="22" y1="11" x2="22" y2="99" strokeWidth="1.2" />
            <line x1="178" y1="11" x2="178" y2="99" strokeWidth="1.2" />
            <line x1="100" y1="11" x2="100" y2="99" strokeWidth="1.1" />
            <line x1="57" y1="11" x2="57" y2="99" />
            <line x1="143" y1="11" x2="143" y2="99" />
            <line x1="86" y1="11" x2="86" y2="99" strokeDasharray="3 3" />
            <line x1="114" y1="11" x2="114" y2="99" strokeDasharray="3 3" />
            <line x1="27" y1="11" x2="27" y2="99" strokeDasharray="2 4" />
            <line x1="173" y1="11" x2="173" y2="99" strokeDasharray="2 4" />
          </g>
          {/* palos (H) vistos de arriba */}
          <g stroke="#fff" strokeWidth="1.6">
            <line x1="22" y1="50" x2="22" y2="60" />
            <line x1="178" y1="50" x2="178" y2="60" />
          </g>
          <g fill="#fff">
            <circle cx="22" cy="50" r="1.4" />
            <circle cx="22" cy="60" r="1.4" />
            <circle cx="178" cy="50" r="1.4" />
            <circle cx="178" cy="60" r="1.4" />
          </g>
          <text x="61" y="96" fill="#fff" fontSize="5" fontFamily="Teko, sans-serif" opacity="0.8">22</text>
          <text x="134" y="96" fill="#fff" fontSize="5" fontFamily="Teko, sans-serif" opacity="0.8">22</text>
        </svg>
        <div className="live-ball" style={{ left: `${5 + x * 0.9}%`, top: `${y}%` }} aria-hidden="true" />
        {toastTxt && <div className="live-toast">{toastTxt}</div>}
        <span className="live-side l">{home.corto}</span>
        <span className="live-side r">{away.corto}</span>
      </div>
    </div>
  );
}

function TeamCard({ club, side, right }: { club: Club; side: string; right?: boolean }) {
  return (
    <div className={`live-team ${right ? 'r' : ''}`} style={{ ['--tc' as string]: club.colores[0] }}>
      <ClubJersey club={club} size={38} />
      <div className="live-team-txt">
        <small>{side}</small>
        <b>{club.nombre}</b>
      </div>
    </div>
  );
}
