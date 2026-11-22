// Logros del DT y Salón de la Fama del club.
import { isDerby } from './extras';
import { POS_LABEL } from './players';
import type { Fixture, GameState, Player, SeasonRecord } from './types';

export interface Logro {
  id: string;
  icono: string;
  titulo: string;
  desc: string;
}

export const LOGROS: Logro[] = [
  { id: 'debut', icono: '🏉', titulo: 'Primera victoria', desc: 'Ganá tu primer partido oficial.' },
  { id: 'racha5', icono: '🔥', titulo: 'Racha de fuego', desc: 'Ganá 5 partidos oficiales seguidos.' },
  { id: 'racha10', icono: '☄️', titulo: 'Imparable', desc: 'Ganá 10 partidos oficiales seguidos.' },
  { id: 'clasico', icono: '⚔️', titulo: 'Dueño del barrio', desc: 'Ganá un clásico.' },
  { id: 'paliza', icono: '💥', titulo: 'Paliza', desc: 'Ganá un partido por 30 puntos o más.' },
  { id: 'cincuenta', icono: '🎯', titulo: 'Medio centenar', desc: 'Hacé 50 puntos o más en un partido.' },
  { id: 'dt50', icono: '📋', titulo: 'Banco de experiencia', desc: 'Dirigí 50 partidos oficiales.' },
  { id: 'dt150', icono: '🧓', titulo: 'Toda una vida', desc: 'Dirigí 150 partidos oficiales.' },
  { id: 'ascenso', icono: '⬆️', titulo: 'Para arriba', desc: 'Conseguí un ascenso.' },
  { id: 'campeonC', icono: '🥉', titulo: 'Campeón de la C', desc: 'Salí campeón de Primera C.' },
  { id: 'campeonB', icono: '🥈', titulo: 'Campeón de la B', desc: 'Salí campeón de Primera B.' },
  { id: 'campeonA', icono: '🏆', titulo: 'Campeón de la A', desc: 'Salí campeón de Primera A.' },
  { id: 'copa', icono: '🏺', titulo: 'Copa del Ñandubay', desc: 'Ganá la Copa del Ñandubay.' },
  { id: 'intl', icono: '🌎', titulo: 'Campeón de América', desc: 'Ganá la Copa Cruz del Sur.' },
  { id: 'seven', icono: '🏖️', titulo: 'Rey del Seven', desc: 'Ganá el Seven de Verano.' },
  { id: 'tryman', icono: '👟', titulo: 'Tenés un tryman', desc: 'Que un jugador tuyo haga 12 tries en una temporada.' },
  { id: 'caja100', icono: '💰', titulo: 'Club rico', desc: 'Tené 100 millones en la caja.' },
  { id: 'hinchada90', icono: '📣', titulo: 'La gente te ama', desc: 'Llevá a la hinchada a 90 o más.' },
  { id: 'temporadas5', icono: '📆', titulo: 'Cinco temporadas', desc: 'Completá 5 temporadas.' },
  { id: 'leyenda', icono: '⭐', titulo: 'Fábrica de leyendas', desc: 'Meté un jugador en el Salón de la Fama.' },
];

const esOficial = (f: Fixture) => f.comp !== 'AMISTOSO';

function dar(g: GameState, id: string, nuevos: Logro[]) {
  if (g.logros?.some((l) => l.id === id)) return;
  const l = LOGROS.find((x) => x.id === id);
  if (!l) return;
  g.logros = [...(g.logros ?? []), { id, temporada: g.temporada, round: g.round }];
  nuevos.push(l);
}

/** Después de cada partido tuyo. */
export function logrosPartido(g: GameState, f: Fixture): Logro[] {
  const nuevos: Logro[] = [];
  const r = f.result;
  const me = g.userClubId;
  if (!r || !esOficial(f) || (f.home !== me && f.away !== me)) return nuevos;
  const mios = f.home === me ? r.ptsH : r.ptsA;
  const suyos = f.home === me ? r.ptsA : r.ptsH;
  const dt = (g.dt ??= { partidos: 0, ganados: 0, racha: 0, mejorRacha: 0 });
  dt.partidos++;
  if (mios > suyos) {
    dt.ganados++;
    dt.racha++;
    dt.mejorRacha = Math.max(dt.mejorRacha, dt.racha);
  } else dt.racha = 0;
  if (mios > suyos) dar(g, 'debut', nuevos);
  if (dt.racha >= 5) dar(g, 'racha5', nuevos);
  if (dt.racha >= 10) dar(g, 'racha10', nuevos);
  if (mios > suyos && isDerby(g.clubs[f.home], g.clubs[f.away])) dar(g, 'clasico', nuevos);
  if (mios - suyos >= 30) dar(g, 'paliza', nuevos);
  if (mios >= 50) dar(g, 'cincuenta', nuevos);
  if (dt.partidos >= 50) dar(g, 'dt50', nuevos);
  if (dt.partidos >= 150) dar(g, 'dt150', nuevos);
  const c = g.clubs[me];
  if (c.presupuesto >= 100_000_000) dar(g, 'caja100', nuevos);
  if ((c.hinchada ?? 0) >= 90) dar(g, 'hinchada90', nuevos);
  return nuevos;
}

/** Logros que se revisan en cualquier momento (seven, caja). */
export function logrosSueltos(g: GameState): Logro[] {
  const nuevos: Logro[] = [];
  if (g.seven?.campeon && g.seven.temporada === g.temporada) dar(g, 'seven', nuevos);
  if (g.clubs[g.userClubId]?.presupuesto >= 100_000_000) dar(g, 'caja100', nuevos);
  return nuevos;
}

/** Al cerrar la temporada: títulos, ascensos y Salón de la Fama. */
export function logrosTemporada(g: GameState, rec: SeasonRecord): Logro[] {
  const nuevos: Logro[] = [];
  const me = g.userClubId;
  if (rec.asciende.includes(me) || rec.ascC?.includes(me)) dar(g, 'ascenso', nuevos);
  if (rec.campeonC === me) dar(g, 'campeonC', nuevos);
  if (rec.campeonB === me) dar(g, 'campeonB', nuevos);
  if (rec.campeonA === me) dar(g, 'campeonA', nuevos);
  if (rec.campeonCopa === me) dar(g, 'copa', nuevos);
  if (rec.campeonIntl && rec.campeonIntl === g.clubs[me]?.nombre) dar(g, 'intl', nuevos);
  const c = g.clubs[me];
  const ps = c.plantel.map((id) => g.players[id]).filter(Boolean);
  if (ps.some((p) => p.temporada.tries >= 12)) dar(g, 'tryman', nuevos);
  if (g.history.length >= 5) dar(g, 'temporadas5', nuevos);
  // Salón de la Fama: se suma lo que hicieron con tu club esta temporada.
  const antes = (g.salonFama ?? []).length;
  for (const p of ps) sumarAlClub(g, p);
  if ((g.salonFama ?? []).length > antes) dar(g, 'leyenda', nuevos);
  return nuevos;
}

export const FAMA_PARTIDOS = 40;
export const FAMA_TRIES = 20;

/** Acumula los partidos y tries del jugador con el club y, si llega, entra al Salón de la Fama. */
export function sumarAlClub(g: GameState, p: Player) {
  const cid = p.clubId!;
  if (!p.conClub || p.conClub.clubId !== cid) p.conClub = { clubId: cid, partidos: 0, tries: 0, temporadas: 0 };
  p.conClub.partidos += p.temporada.partidos;
  p.conClub.tries += p.temporada.tries;
  p.conClub.temporadas++;
  const k = p.conClub;
  if (k.partidos < FAMA_PARTIDOS && k.tries < FAMA_TRIES) return;
  const fama = (g.salonFama ??= []);
  const entrada = {
    playerId: p.id,
    clubId: cid,
    nombre: `${p.nombre} ${p.apellido}`,
    puesto: POS_LABEL[p.pos],
    partidos: k.partidos,
    tries: k.tries,
    temporadas: k.temporadas,
    desde: fama.find((x) => x.playerId === p.id && x.clubId === cid)?.desde ?? g.temporada,
  };
  const i = fama.findIndex((x) => x.playerId === p.id && x.clubId === cid);
  if (i >= 0) fama[i] = entrada;
  else fama.push(entrada);
}
