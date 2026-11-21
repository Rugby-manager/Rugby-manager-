// Diario del club: titulares de cada fecha, conferencia de prensa antes de los partidos grandes
// y premios al final de la temporada.
import { clamp } from './rng';
import { isDerby } from './extras';
import { matchWinner, standings, userFixture, isLeague } from './game';
import { overall } from './players';
import type { Edicion, Fixture, GameState, Player } from './types';

export const DIARIO_NOMBRE = 'El Ovalado';

const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];

/** Arma la edición del diario con lo que pasó en la fecha. */
export function editarDiario(g: GameState, fixtures: Fixture[]) {
  const user = g.clubs[g.userClubId];
  const jugados = fixtures.filter((f) => f.result);
  if (!jugados.length) return;
  const titulares: Edicion['titulares'] = [];
  const seed = g.temporada * 31 + Math.floor(g.round * 7);
  const nombre = (id: string) => g.clubs[id].nombre;

  // 1) Tu partido.
  const uf = jugados.find((f) => f.home === user.id || f.away === user.id);
  if (uf) {
    const r = uf.result!;
    const local = uf.home === user.id;
    const mios = local ? r.ptsH : r.ptsA;
    const suyos = local ? r.ptsA : r.ptsH;
    const rival = nombre(local ? uf.away : uf.home);
    const w = matchWinner(uf);
    const clasico = isDerby(g.clubs[uf.home], g.clubs[uf.away]);
    const dif = Math.abs(mios - suyos);
    let titulo: string;
    if (w === user.id) titulo = clasico ? pick(['¡El clásico es nuestro!', 'Fiesta en el barrio: ganamos el clásico', 'Clásico ganado y a festejar'], seed) : dif >= 20 ? pick(['¡Paliza!', 'Baile en la cancha', 'Show de tries'], seed) : dif <= 3 ? pick(['Triunfo sufrido', 'Ganamos con lo justo', 'Agónico'], seed) : pick(['Buen triunfo', 'Otra victoria', 'Sumamos de a cuatro'], seed);
    else if (w === null) titulo = pick(['Empate con sabor a poco', 'Reparto de puntos', 'Igualdad'], seed);
    else titulo = clasico ? pick(['Dolor: perdimos el clásico', 'Clásico perdido, bronca en el club'], seed) : dif >= 20 ? pick(['Golpe duro', 'Noche para el olvido'], seed) : pick(['Derrota', 'Se escapó', 'Traspié'], seed);
    const tries = r.scorers.filter((s) => s.tries > 0 && g.players[s.playerId]?.clubId === user.id).sort((a, b) => b.tries - a.tries);
    const figura = tries[0] ? g.players[tries[0].playerId] : null;
    titulares.push({
      titulo,
      bajada: `${user.nombre} ${mios}-${suyos} ${rival}${figura ? `. ${figura.apellido} apoyó ${tries[0].tries === 1 ? 'un try' : `${tries[0].tries} tries`}` : ''}.`,
    });
  }

  // 2) La goleada de la fecha en tu categoría.
  const div = jugados.filter((f) => f !== uf && g.clubs[f.home].division === user.division && isLeague(f.comp));
  const goleada = [...div].sort((a, b) => Math.abs(b.result!.ptsH - b.result!.ptsA) - Math.abs(a.result!.ptsH - a.result!.ptsA))[0];
  if (goleada && Math.abs(goleada.result!.ptsH - goleada.result!.ptsA) >= 15) {
    const r = goleada.result!;
    const [gan, per, a, b] = r.ptsH > r.ptsA ? [goleada.home, goleada.away, r.ptsH, r.ptsA] : [goleada.away, goleada.home, r.ptsA, r.ptsH];
    titulares.push({ titulo: `${g.clubs[gan as string].corto} no tuvo piedad`, bajada: `${nombre(gan as string)} le ganó ${a}-${b} a ${nombre(per as string)}.` });
  }

  // 3) Alguien que hizo 3 tries o más.
  for (const f of jugados) {
    const hat = f.result!.scorers.find((s) => s.tries >= 3);
    if (hat) {
      const p = g.players[hat.playerId];
      if (p?.clubId) {
        titulares.push({ titulo: `Hat-trick de ${p.apellido}`, bajada: `${p.nombre} ${p.apellido} (${g.clubs[p.clubId].corto}) apoyó ${hat.tries} tries.` });
        break;
      }
    }
  }

  // 4) Cómo está la punta.
  if (uf && isLeague(uf.comp) && g.round >= 3) {
    const t = standings(g, user.division);
    const lider = t[0];
    titulares.push({
      titulo: lider.clubId === user.id ? '¡Somos punteros!' : `${g.clubs[lider.clubId].corto} manda en la ${user.division}`,
      bajada: lider.clubId === user.id ? `${user.nombre} lidera con ${lider.pts} puntos.` : `${nombre(lider.clubId)} es líder con ${lider.pts} puntos. ${user.nombre} está ${t.findIndex((r) => r.clubId === user.id) + 1}.º.`,
    });
  }

  if (!titulares.length) return;
  // Si no jugaste (fecha de copa sin tu club), las novedades se suman a la última edición.
  const ult = g.diario?.[0];
  if (!uf && ult && ult.temporada === g.temporada) {
    ult.titulares = [...ult.titulares, ...titulares].slice(0, 5);
    return;
  }
  g.diario = [{ temporada: g.temporada, round: g.round, titulares: titulares.slice(0, 4) }, ...(g.diario ?? [])].slice(0, 30);
}

// ---------- Conferencia de prensa ----------

export const RESPUESTAS_PRENSA = [
  { texto: 'Respetamos mucho al rival', efecto: 'El plantel se tranquiliza (+2 de moral). Sin riesgos.' },
  { texto: 'Lo vamos a ganar, no hay dudas', efecto: 'El plantel se agranda (+6 de moral). Si ganás, la directiva te aplaude; si perdés, te lo van a reprochar.' },
  { texto: 'Que hable la cancha', efecto: 'No pasa nada: ni presión ni motivación.' },
];

/** Antes de un clásico o un partido de playoff hay conferencia de prensa. */
export function conferenciaPendiente(g: GameState): Fixture | null {
  const f = userFixture(g);
  if (!f || f.result || f.comp === 'AMISTOSO') return null;
  const grande = isDerby(g.clubs[f.home], g.clubs[f.away]) || f.comp === 'SEMI' || f.comp === 'FINAL' || (f.comp === 'INTL' && f.etapa === 3);
  if (!grande) return null;
  if (g.prensa?.fixtureId === f.id) return null;
  return f;
}

export function responderPrensa(g: GameState, i: number): string {
  const f = conferenciaPendiente(g);
  if (!f) throw new Error('No hay conferencia pendiente.');
  g.prensa = { fixtureId: f.id, eleccion: i };
  const club = g.clubs[g.userClubId];
  const delta = i === 0 ? 2 : i === 1 ? 6 : 0;
  for (const id of club.plantel) {
    const p = g.players[id];
    p.moral = clamp(p.moral + delta, 20, 100);
  }
  return i === 0 ? 'Mensaje de calma. El plantel lo valoró.' : i === 1 ? '¡Lo dijiste fuerte! El plantel está agrandado... ahora hay que ganar.' : 'Pocas palabras. La prensa se quedó con ganas.';
}

/** Después del partido: si prometiste ganar, la directiva te pasa la cuenta. */
export function cerrarPrensa(g: GameState, f: Fixture) {
  if (!g.prensa || g.prensa.fixtureId !== f.id || g.prensa.resuelta) return;
  g.prensa.resuelta = true;
  if (g.prensa.eleccion !== 1 || !g.career) return;
  const w = matchWinner(f);
  if (w === g.userClubId) g.career.confianza = clamp(g.career.confianza + 3, 0, 100);
  else if (w !== null) {
    g.career.confianza = clamp(g.career.confianza - 4, 0, 100);
    g.diario?.[0]?.titulares.unshift({ titulo: 'Palabras que pesan', bajada: 'El técnico había prometido ganar. La directiva no está contenta.' });
  }
}

// ---------- Premios de la temporada ----------

const puntaje = (p: Player) => overall(p) + p.temporada.tries * 2 + p.temporada.partidos * 0.6;

/** Mejor jugador y revelación de cada categoría donde jugás (y de la A). */
export function premiosTemporada(g: GameState) {
  const divs = [...new Set(['A', g.clubs[g.userClubId].division])] as ('A' | 'B' | 'C')[];
  const out: NonNullable<GameState['premios']>[number]['premios'] = [];
  for (const d of divs) {
    const ps = Object.values(g.players).filter((p) => p.clubId && g.clubs[p.clubId]?.division === d && p.temporada.partidos >= 6);
    const mejor = [...ps].sort((a, b) => puntaje(b) - puntaje(a))[0];
    const rev = ps.filter((p) => p.edad <= 21).sort((a, b) => puntaje(b) - puntaje(a))[0];
    if (mejor) out.push({ premio: `Mejor jugador de la ${d}`, playerId: mejor.id, nombre: `${mejor.nombre} ${mejor.apellido}`, clubId: mejor.clubId! });
    if (rev) out.push({ premio: `Revelación de la ${d}`, playerId: rev.id, nombre: `${rev.nombre} ${rev.apellido}`, clubId: rev.clubId! });
  }
  // El mejor de tu club.
  const mios = g.clubs[g.userClubId].plantel.map((id) => g.players[id]).filter((p) => p && p.temporada.partidos >= 4);
  const tuyo = mios.sort((a, b) => puntaje(b) - puntaje(a))[0];
  if (tuyo) out.push({ premio: `Mejor jugador de ${g.clubs[g.userClubId].corto}`, playerId: tuyo.id, nombre: `${tuyo.nombre} ${tuyo.apellido}`, clubId: tuyo.clubId! });
  g.premios = [{ temporada: g.temporada, premios: out }, ...(g.premios ?? [])].slice(0, 20);
  // Los premiados se ponen contentos.
  for (const x of out) {
    const p = g.players[x.playerId];
    if (p) p.moral = clamp(p.moral + 10, 20, 100);
  }
  g.diario = [
    { temporada: g.temporada, round: 99, titulares: out.slice(0, 4).map((x) => ({ titulo: `🏆 ${x.premio}`, bajada: `${x.nombre} (${g.clubs[x.clubId]?.nombre ?? ''}).` })) },
    ...(g.diario ?? []),
  ].slice(0, 30);
  return out;
}
