import { Rng, clamp } from './rng';
import { SHIRT_POS, actitudMult, familiarity, ratingAs, isForward, benchOf } from './players';
import { captainOf, type Charla, type Clima } from './extras';
import type { Club, Formacion, MatchEvent, MatchResult, Player, ScoringEntry, SideStats, Tactics, EventKind } from './types';

/** Parámetros del motor. Calibrados con las pruebas de muchas temporadas. */
export const TUNING = {
  minutos: 80,
  baseTry: 0.15,
  basePen: 0.095,
  baseDrop: 0.003,
  kTry: 0.062,
  kPen: 0.025,
  localia: 3.6,
  forma: 2.6,
  amarilla: 0.016,
  roja: 0.0011,
  lesion: 0.0035,
  /** Cuánta energía pierde por minuto un jugador en cancha (antes del físico). */
  desgaste: 0.42,
  tmo: 0.12,
};

interface Ratings {
  F: number;
  B: number;
  scrum: number;
  line: number;
  def: number;
  kickPct: number;
  kickerSlot: number;
  lid: number;
  /** Actitud promedio de los que están en cancha. */
  act: number;
}

export type SideKey = 'H' | 'A';
export type PenalPolicy = 'preguntar' | 'palos' | 'line';

export interface LiveSide {
  key: SideKey;
  club: Club;
  tactics: Tactics;
  xv: (Player | null)[];
  bench: Player[];
  /** Los que ya salieron (no pueden volver). */
  salieron: string[];
  binned: { slot: number; until: number }[];
  /** Camisetas con roja: quedan vacías hasta el final. */
  rojas: number[];
  ratings: Ratings;
  form: number;
  pts: number;
  tries: number;
  amarillas: number;
  posesiones: number;
  stats: SideStats;
  /** La computadora hace los cambios y decide los penales. */
  auto: boolean;
  penal: PenalPolicy;
  capitan: string | null;
  /** Charlas que ya dio el entrenador (antes del partido y en el entretiempo). */
  charlas: Partial<Record<'previa' | 'entretiempo', Charla>>;
  talkForm: number;
  talkCards: number;
}

export type Pause =
  | { kind: 'previa' }
  | { kind: 'entretiempo' }
  | { kind: 'penal'; side: SideKey; dist: number; min: number; falta: string };

const ATAQUE_MOD = { forwards: { t: 0.97, p: 1.12 }, equilibrado: { t: 1, p: 1 }, abrir: { t: 1.08, p: 0.9 } };
const PIE_MOD = { poco: { t: 1.06, p: 0.85, d: 0.4 }, medio: { t: 1, p: 1, d: 1 }, mucho: { t: 0.88, p: 1.25, d: 3 } };
const DEF_MOD = { conservadora: { t: 1.06, p: 0.82, y: 0.6 }, equilibrada: { t: 1, p: 1, y: 1 }, agresiva: { t: 0.9, p: 1.28, y: 1.7 } };

export interface MatchInput {
  home: Club;
  away: Club;
  homeXV: (string | null)[];
  awayXV: (string | null)[];
  players: Record<string, Player>;
  neutral?: boolean;
  detailed?: boolean;
  /** Lado que maneja el usuario en vivo (cambios, entretiempo y penales). */
  interactive?: SideKey;
  clima?: Clima;
  /** Clásico: más tarjetas y partido más impredecible. */
  clasico?: boolean;
}

const CLIMA_KICK: Record<Clima, number> = { sol: 0, nublado: 0, lluvia: -0.06, viento: -0.1, frio: -0.01 };
const CLIMA_DRAIN: Record<Clima, number> = { sol: 1.08, nublado: 1, lluvia: 1.03, viento: 1, frio: 0.9 };

const nm = (p: Player | null | undefined) => (p ? p.apellido : 'un suplente');
const full = (p: Player | null | undefined) => (p ? `${p.nombre} ${p.apellido}` : 'un suplente');
const emptyStats = (): SideStats => ({ penales: 0, scrumsG: 0, scrumsP: 0, linesG: 0, linesP: 0, quiebres: 0, tackles: 0, tacklesErrados: 0, rojas: 0 });

/** Partido que se juega de a una posesión: lo usa la pantalla en vivo y la simulación rápida. */
export class LiveMatch {
  readonly H: LiveSide;
  readonly A: LiveSide;
  readonly events: MatchEvent[] = [];
  t = 0;
  finished = false;
  pause: Pause | null = null;
  private halftimeDone = false;
  private readonly detailed: boolean;
  private readonly rng: Rng;
  private readonly input: MatchInput;
  /** Energía en vivo de cada jugador del partido. */
  readonly energia = new Map<string, number>();
  private readonly mins = new Map<string, number>();
  private readonly jugaron = new Set<string>();
  private readonly scorers = new Map<string, ScoringEntry>();
  private readonly lesionados: { playerId: string; semanas: number }[] = [];
  private readonly formaciones: Record<SideKey, Formacion>;

  constructor(input: MatchInput, rng: Rng) {
    this.input = input;
    this.rng = rng;
    this.detailed = !!input.detailed || !!input.interactive;
    const used = new Set<string>([...input.homeXV, ...input.awayXV].filter((x): x is string => !!x));
    const mk = (key: SideKey, club: Club, ids: (string | null)[]): LiveSide => {
      const xv = ids.map((id) => (id ? input.players[id] : null));
      const bench = benchOf(club, input.players, ids).map((id) => input.players[id]).filter((p) => !used.has(p.id));
      const s: LiveSide = {
        key, club, tactics: { ...club.tactica }, xv, bench, salieron: [], binned: [], rojas: [], ratings: null as unknown as Ratings,
        form: rng.normal(0, TUNING.forma * (input.clasico ? 1.4 : 1)), pts: 0, tries: 0, amarillas: 0, posesiones: 0, stats: emptyStats(),
        auto: input.interactive !== key, penal: input.interactive === key ? 'preguntar' : 'palos',
        capitan: captainOf(club, input.players, ids), charlas: {}, talkForm: 0, talkCards: 1,
      };
      for (const p of [...xv, ...bench]) if (p) this.energia.set(p.id, p.energia);
      for (const p of xv) if (p) this.jugaron.add(p.id);
      return s;
    };
    this.H = mk('H', input.home, input.homeXV);
    this.A = mk('A', input.away, input.awayXV);
    this.H.ratings = this.computeRatings(this.H);
    this.A.ratings = this.computeRatings(this.A);
    const formacion = (s: LiveSide): Formacion => {
      const energia: Record<string, number> = {};
      for (const p of [...s.xv, ...s.bench]) if (p) energia[p.id] = Math.round(p.energia);
      return { xv: s.xv.map((p) => p?.id ?? null), banco: s.bench.map((p) => p.id), energia };
    };
    this.formaciones = { H: formacion(this.H), A: formacion(this.A) };
    this.push(0, 'inicio', null, `¡Arranca el partido! ${input.home.nombre} recibe a ${input.away.nombre}.`);
    if (input.clasico) this.push(0, 'jugada', null, `🔥 ¡Es el clásico! La cancha explota, nadie quiere perder este partido.`);
    if (input.clima === 'lluvia') this.push(0, 'jugada', null, '🌧️ Llueve fuerte: la pelota está jabonosa y la cancha pesada.');
    else if (input.clima === 'viento') this.push(0, 'jugada', null, '💨 Sopla un viento bárbaro: los pateadores van a sufrir.');
    else if (input.clima === 'frio') this.push(0, 'jugada', null, '❄️ Hace un frío de locos, se ve el vapor en los scrums.');
    if (input.interactive) this.pause = { kind: 'previa' };
  }

  /** Charla del entrenador (antes del partido o en el entretiempo). Devuelve cómo reaccionó el plantel. */
  talk(k: SideKey, c: Charla): string | null {
    const when = this.pause?.kind;
    if (when !== 'previa' && when !== 'entretiempo') return null;
    const s = this.side(k);
    const o = this.other(s);
    if (s.charlas[when]) return null;
    s.charlas[when] = c;
    const on = s.xv.filter((p): p is Player => !!p);
    const moral = on.reduce((x, p) => x + p.moral, 0) / Math.max(1, on.length);
    const capi = s.capitan ? this.playerById(s.capitan) : null;
    const lid = capi ? (capi.attrs.liderazgo - 60) * 0.02 : 0;
    let msg: string;
    if (c === 'tranquila') {
      s.talkForm = 0.5 + lid;
      s.talkCards = 0.7;
      msg = 'El plantel sale tranquilo y concentrado.';
    } else if (c === 'arenga') {
      const abajo = o.pts > s.pts || o.ratings.F + o.ratings.B > s.ratings.F + s.ratings.B + 2;
      s.talkForm = (abajo ? 2.2 : 0.8) + lid;
      s.talkCards = 1.35;
      msg = abajo ? '¡El vestuario se prende fuego! Salen a comerse la cancha.' : 'Salen motivados, aunque algo pasados de revoluciones.';
    } else {
      s.talkForm = (moral >= 68 ? 2 : moral < 52 ? -1.8 : 0.6) + lid;
      s.talkCards = 1;
      msg = moral >= 68 ? 'El plantel recoge el guante: salen con todo.' : moral < 52 ? 'Les cayó mal: se los ve tensos y bajoneados.' : 'Escucharon. Salen con ganas.';
    }
    this.push(this.min, 'jugada', s, `🗣️ Charla en el vestuario de ${s.club.corto}: ${msg}`);
    return msg;
  }

  playerById(id: string): Player | null {
    return this.input.players[id] ?? null;
  }
  /** Camiseta con la que empezó (1-15), o 0. */
  startNumber(k: SideKey, id: string) {
    return this.formaciones[k].xv.indexOf(id) + 1;
  }
  /** Posición original en el banco (0 = la 16). */
  benchIndex(k: SideKey, id: string) {
    return this.formaciones[k].banco.indexOf(id);
  }
  side(k: SideKey) {
    return k === 'H' ? this.H : this.A;
  }
  private other(s: LiveSide) {
    return s === this.H ? this.A : this.H;
  }
  get min() {
    return Math.min(80, Math.max(0, Math.round(this.t)));
  }
  marcador() {
    return `${this.H.club.corto} ${this.H.pts} - ${this.A.pts} ${this.A.club.corto}`;
  }

  // ---------- Jugadores en cancha ----------

  isOff(s: LiveSide, i: number) {
    return s.rojas.includes(i) || s.binned.some((b) => b.slot === i);
  }
  private activeSlots(s: LiveSide) {
    return s.xv.map((_, i) => i).filter((i) => s.xv[i] && !this.isOff(s, i));
  }
  private bySlot(s: LiveSide, i: number) {
    return this.isOff(s, i) ? null : s.xv[i];
  }
  private pickBy(s: LiveSide, weights: Partial<Record<string, number>>) {
    const slots = this.activeSlots(s);
    if (!slots.length) return null;
    return s.xv[this.rng.weighted(slots, slots.map((i) => weights[SHIRT_POS[i]] ?? 0.02))];
  }
  /** Estado físico en vivo (energía y moral). */
  cond(p: Player) {
    const e = this.energia.get(p.id) ?? p.energia;
    return (0.8 + 0.2 * (e / 100)) * (0.96 + 0.08 * (p.moral / 100));
  }
  /** Cuánto rinde ahora un jugador en una camiseta. */
  liveRating(p: Player, i: number) {
    return ratingAs(p.attrs, SHIRT_POS[i]) * familiarity(p, SHIRT_POS[i]) * this.cond(p);
  }

  private computeRatings(s: LiveSide): Ratings {
    const eff = s.xv.map((p, i) => (this.isOff(s, i) ? 0 : p ? this.liveRating(p, i) : 30));
    const attr = (i: number, k: keyof Player['attrs']) => {
      const p = s.xv[i];
      if (!p || this.isOff(s, i)) return 0;
      return p.attrs[k] * familiarity(p, SHIRT_POS[i]) * this.cond(p);
    };
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    const F = sum(eff.slice(0, 8)) / 8;
    const B = sum(eff.slice(8)) / 7;
    const sw = [2, 2, 2, 1.5, 1.5, 1, 1, 1];
    const scrum = sum(sw.map((w, i) => w * attr(i, 'scrum'))) / sum(sw);
    const line = (attr(1, 'line') * 2 + attr(3, 'line') * 1.5 + attr(4, 'line') * 1.5 + attr(5, 'line') * 0.5 + attr(7, 'line') * 0.5) / 6;
    const def = sum(s.xv.map((_, i) => attr(i, 'tackle'))) / 15;
    let kickerSlot = 9;
    let bestPie = -1;
    s.xv.forEach((p, i) => {
      if (!p || this.isOff(s, i)) return;
      const v = p.attrs.pie * this.cond(p);
      if (v > bestPie) {
        bestPie = v;
        kickerSlot = i;
      }
    });
    const kickPct = clamp(0.3 + Math.max(bestPie, 30) * 0.0058 + CLIMA_KICK[this.input.clima ?? 'nublado'], 0.35, 0.92);
    let lid = Math.max(...s.xv.map((p, i) => (p && !this.isOff(s, i) ? p.attrs.liderazgo : 30)));
    // El capitán en cancha suma: se lo escucha más que a cualquiera.
    const ci = s.capitan ? s.xv.findIndex((p) => p?.id === s.capitan) : -1;
    if (ci >= 0 && !this.isOff(s, ci)) lid = Math.max(lid, s.xv[ci]!.attrs.liderazgo + 6);
    const acts = s.xv.filter((p, i) => p && !this.isOff(s, i)).map((p) => p!.attrs.actitud ?? 66);
    const act = acts.length ? sum(acts) / acts.length : 66;
    return { F, B, scrum, line, def, kickPct, kickerSlot, lid, act };
  }
  private refresh() {
    this.H.ratings = this.computeRatings(this.H);
    this.A.ratings = this.computeRatings(this.A);
  }

  private attackScore(s: LiveSide) {
    const r = s.ratings;
    const [wf, wb] = s.tactics.ataque === 'forwards' ? [0.65, 0.35] : s.tactics.ataque === 'abrir' ? [0.35, 0.65] : [0.5, 0.5];
    return wf * r.F + wb * r.B + (r.lid - 60) * 0.05 + 0.5 * (s.club.staff?.ayudante ?? 0);
  }
  private defenseScore(s: LiveSide) {
    const r = s.ratings;
    return 0.55 * r.def + 0.25 * r.F + 0.2 * r.B + (r.lid - 60) * 0.03 + 8 + 0.4 * (s.club.staff?.ayudante ?? 0);
  }

  private push(min: number, kind: EventKind, side: LiveSide | null, text: string, who?: { pid?: string; slot?: number; out?: string }) {
    if (this.detailed || kind === 'try') {
      this.events.push({ min, kind, side: side ? side.key : null, text, scoreH: this.H.pts, scoreA: this.A.pts, ...(who && this.detailed ? who : {}) });
    }
  }
  private credit(s: LiveSide, p: Player | null, tries: number, puntos: number) {
    if (!p) return;
    const e = this.scorers.get(p.id) ?? { playerId: p.id, side: s.key, tries: 0, puntos: 0 };
    e.tries += tries;
    e.puntos += puntos;
    this.scorers.set(p.id, e);
  }

  // ---------- Órdenes del entrenador ----------

  /** Hace un cambio. Devuelve un error en palabras, o null si salió bien. */
  substitute(k: SideKey, slot: number, benchId: string, motivo?: string): string | null {
    const s = this.side(k);
    if (this.finished) return 'El partido terminó';
    const bi = s.bench.findIndex((p) => p.id === benchId);
    if (bi < 0) return 'Ese jugador no está en el banco';
    if (s.rojas.includes(slot)) return 'No se puede reemplazar a un expulsado';
    if (s.binned.some((b) => b.slot === slot)) return 'No se puede reemplazar a un amonestado mientras cumple la amarilla';
    const sub = s.bench.splice(bi, 1)[0];
    const out = s.xv[slot];
    if (out) s.salieron.push(out.id);
    s.xv[slot] = sub;
    this.jugaron.add(sub.id);
    this.push(this.min, 'cambio', s, (out ? `Cambio en ${s.club.corto}: sale ${full(out)}, entra ${full(sub)} con la ${slot + 1}.` : `Entra ${full(sub)} con la camiseta ${slot + 1}.`) + (motivo ? ` ${motivo}` : ''), { pid: sub.id, slot, out: out?.id });
    s.ratings = this.computeRatings(s);
    return null;
  }

  setTactics(k: SideKey, patch: Partial<Tactics>) {
    const s = this.side(k);
    s.tactics = { ...s.tactics, ...patch };
  }

  /** Sigue después del entretiempo. */
  resume() {
    if (this.pause?.kind === 'entretiempo' || this.pause?.kind === 'previa') this.pause = null;
  }

  /** El usuario decide qué hacer con el penal. */
  decidePenalty(choice: 'palos' | 'line', siempre = false) {
    const p = this.pause;
    if (p?.kind !== 'penal') return;
    this.pause = null;
    const att = this.side(p.side);
    if (siempre) att.penal = choice;
    this.resolvePenalty(att, this.other(att), p.min, p.dist, p.falta, choice);
  }

  // ---------- El partido ----------

  /** Juega una posesión. Devuelve los eventos nuevos. */
  step(): MatchEvent[] {
    if (this.finished || this.pause) return [];
    const from = this.events.length;
    const rng = this.rng;
    const prev = this.t;
    this.t += rng.int(1, 3) * (0.8 + rng.next() * 0.4);
    this.wear(Math.min(this.t, 80) - prev);
    if (!this.halftimeDone && this.t >= 40) {
      this.halftimeDone = true;
      for (const s of [this.H, this.A]) {
        s.binned = s.binned.filter((b) => b.until > 40);
        // Al entretiempo recuperan un poco de aire.
        for (const p of s.xv) if (p) this.energia.set(p.id, Math.min(100, (this.energia.get(p.id) ?? 0) + 3));
      }
      this.refresh();
      this.push(40, 'entretiempo', null, `Entretiempo. ${this.marcador()}.`);
      this.t = Math.max(this.t, 40.5);
      if (this.input.interactive) {
        this.pause = { kind: 'entretiempo' };
        return this.events.slice(from);
      }
    }
    if (this.t >= TUNING.minutos) {
      this.finish();
      return this.events.slice(from);
    }
    const min = Math.min(80, Math.max(1, Math.round(this.t)));

    // Vuelven los amonestados.
    for (const s of [this.H, this.A]) {
      const back = s.binned.filter((b) => b.until <= this.t);
      if (back.length) {
        s.binned = s.binned.filter((b) => b.until > this.t);
        for (const b of back) this.push(min, 'jugada', s, `Vuelve a la cancha ${nm(s.xv[b.slot])} tras cumplir la amarilla.`);
      }
    }
    // Cambios de la computadora.
    for (const s of [this.H, this.A]) if (s.auto) this.autoSubs(s);
    this.refresh();
    this.possession(min);
    return this.events.slice(from);
  }

  /** Juega hasta el final; la computadora decide por todos. */
  runToEnd() {
    let guard = 0;
    while (!this.finished && guard++ < 1000) {
      if (this.pause?.kind === 'entretiempo' || this.pause?.kind === 'previa') this.resume();
      else if (this.pause?.kind === 'penal') this.decidePenalty(this.aiPenalty(this.side(this.pause.side), this.pause.dist));
      this.step();
    }
  }

  private wear(dt: number) {
    if (dt <= 0) return;
    for (const s of [this.H, this.A]) {
      s.xv.forEach((p, i) => {
        if (!p || s.rojas.includes(i)) return;
        this.mins.set(p.id, (this.mins.get(p.id) ?? 0) + dt);
        const nutri = 1 - 0.05 * (s.club.staff?.nutricionista ?? 0);
        const drain = (TUNING.desgaste - p.attrs.fisico / 1000) * (1.1 - (p.attrs.actitud ?? 66) / 660) * nutri * CLIMA_DRAIN[this.input.clima ?? 'nublado'];
        this.energia.set(p.id, Math.max(5, (this.energia.get(p.id) ?? 100) - dt * drain));
      });
    }
  }

  private autoSubs(s: LiveSide) {
    // Con ayudante de campo los cambios se hacen antes y mejor pensados.
    const ay = s.club.staff?.ayudante ?? 0;
    if (this.t < 45 - ay * 3 || !s.bench.length) return;
    for (let i = 0; i < 15 && s.bench.length; i++) {
      const p = s.xv[i];
      if (!p || this.isOff(s, i)) continue;
      const e = this.energia.get(p.id) ?? 100;
      // Cuanto más cansado y más avanzado el partido, más chance de cambio.
      const wish = (e < 55 + ay * 3 ? 0.5 : e < 65 + ay * 2 && this.t > 55 ? 0.25 : this.t > 62 && isForward(SHIRT_POS[i]) && i <= 2 ? 0.12 : 0) * (1 + 0.25 * ay);
      if (!wish || !this.rng.chance(Math.min(0.9, wish))) continue;
      const cur = this.liveRating(p, i);
      let best = -1;
      let bestR = cur + 1;
      s.bench.forEach((b, bi) => {
        const r = this.liveRating(b, i);
        if (r > bestR) {
          bestR = r;
          best = bi;
        }
      });
      if (best >= 0) this.substitute(s.key, i, s.bench[best].id, e < 62 ? '(estaba cansado)' : ay ? '(decisión del ayudante)' : '(cambio táctico)');
    }
  }

  private possession(min: number) {
    const rng = this.rng;
    const { H, A } = this;
    const setH = (H.ratings.scrum + H.ratings.line) / 2;
    const setA = (A.ratings.scrum + A.ratings.line) / 2;
    const homeBonus = this.input.neutral ? 0 : 0.01;
    const shareH = clamp(0.5 + (setH - setA) * 0.006 + (H.ratings.F - A.ratings.F) * 0.004 + homeBonus, 0.35, 0.65);
    const att = rng.chance(shareH) ? H : A;
    const def = this.other(att);
    att.posesiones++;

    // De dónde sale la pelota: formación fija o juego abierto (estadísticas).
    const origen = rng.weighted(['scrum', 'line', 'ruck'] as const, [0.24, 0.3, 0.46]);
    if (origen === 'scrum') {
      if (rng.chance(clamp(0.88 + (att.ratings.scrum - def.ratings.scrum) * 0.012, 0.6, 0.98))) att.stats.scrumsG++;
      else def.stats.scrumsG++, att.stats.scrumsP++;
    } else if (origen === 'line') {
      if (rng.chance(clamp(0.85 + (att.ratings.line - def.ratings.line) * 0.012, 0.55, 0.97))) att.stats.linesG++;
      else def.stats.linesG++, att.stats.linesP++;
    }
    def.stats.tackles += rng.int(4, 9);
    if (rng.chance(0.35)) def.stats.tacklesErrados++;
    // Penales chicos que no terminan en patada a los palos (se patean al touch o se juegan rápido).
    if (rng.chance(0.22)) (rng.chance(0.5) ? att : def).stats.penales++;

    const home = att === H && !this.input.neutral ? TUNING.localia : 0;
    // En el último cuarto se nota quién deja todo: la actitud pesa más con el cansancio.
    const garra = (s: LiveSide) => (s.ratings.act - 66) * (this.t >= 60 ? 0.12 : 0.04);
    const diff = this.attackScore(att) - this.defenseScore(def) + home + att.form - def.form + att.talkForm - def.talkForm + garra(att) - garra(def);
    const am = ATAQUE_MOD[att.tactics.ataque];
    const pm = PIE_MOD[att.tactics.pie];
    const dm = DEF_MOD[def.tactics.defensa];
    // Con lluvia, abrir la pelota es una lotería; con los forwards se sufre menos.
    const lluvia = this.input.clima === 'lluvia' ? (att.tactics.ataque === 'abrir' ? 0.84 : att.tactics.ataque === 'forwards' ? 1.02 : 0.93) : 1;
    const pTry = TUNING.baseTry * Math.exp(diff * TUNING.kTry) * am.t * pm.t * dm.t * lluvia;
    const pPen = TUNING.basePen * Math.exp(diff * TUNING.kPen) * am.p * pm.p * dm.p;
    const pDrop = TUNING.baseDrop * pm.d * (this.input.clima === 'viento' ? 0.5 : 1);
    const r = rng.next();

    if (r < pTry) {
      this.scoreTry(att, def, min);
    } else if (r < pTry + pPen) {
      def.stats.penales++;
      const falta = rng.pick(FALTAS);
      const dist = rng.pick([22, 30, 35, 40, 45]);
      if (!att.auto && att.penal === 'preguntar') {
        this.pause = { kind: 'penal', side: att.key, dist, min, falta };
      } else {
        this.resolvePenalty(att, def, min, dist, falta, att.auto ? this.aiPenalty(att, dist) : (att.penal as 'palos' | 'line'));
      }
    } else if (r < pTry + pPen + pDrop) {
      const k = this.bySlot(att, 9) ?? this.bySlot(att, att.ratings.kickerSlot);
      if (rng.chance(att.ratings.kickPct - 0.25)) {
        att.pts += 3;
        this.credit(att, k, 0, 3);
        this.push(min, 'drop', att, `¡DROP de ${nm(k)}! Le pega de sobrepique y pasa entre los palos. ${this.marcador()}.`);
      } else if (this.detailed) {
        this.push(min, 'jugada', att, `${nm(k)} intenta el drop pero se le va abierto.`);
      }
    } else if (this.detailed && rng.chance(0.42)) {
      this.push(min, 'jugada', att, this.flavor(att, def, origen));
    }

    // Tarjetas para el que defiende. Los indisciplinados (poca actitud) se hacen echar más.
    const indis = clamp(actitudMult(def.ratings.act, -0.02), 0.5, 1.6) * (this.input.clasico ? 1.3 : 1) * def.talkCards;
    if (rng.chance(TUNING.amarilla * dm.y * indis)) {
      const slots = this.activeSlots(def);
      if (slots.length > 12) {
        const slot = rng.weighted(slots, slots.map((i) => (i < 8 ? 1.5 : 1) * Math.max(0.3, (110 - (def.xv[i]?.attrs.actitud ?? 66)) / 44)));
        def.binned.push({ slot, until: this.t + 10 });
        def.amarillas++;
        def.ratings = this.computeRatings(def);
        this.push(min, 'amarilla', def, `🟨 Tarjeta amarilla para ${full(def.xv[slot])} (${def.club.corto}) por ${rng.pick(FALTAS)}. Diez minutos afuera.`, { pid: def.xv[slot]?.id, slot });
      }
    } else if (rng.chance(TUNING.roja * dm.y * indis)) {
      const slots = this.activeSlots(def);
      if (slots.length > 12) {
        const slot = rng.pick(slots);
        def.rojas.push(slot);
        def.stats.rojas++;
        def.ratings = this.computeRatings(def);
        this.push(min, 'roja', def, `🟥 ¡ROJA! ${full(def.xv[slot])} (${def.club.corto}) se va expulsado por un tackle peligroso. ${def.club.nombre} juega con uno menos hasta el final.`, { pid: def.xv[slot]?.id, slot });
      }
    }
    // Lesiones.
    for (const s of [att, def]) if (rng.chance(TUNING.lesion * (1 - 0.15 * (s.club.staff?.medico ?? 0)))) this.injure(s, min);
  }

  /** La computadora (o el capitán) decide si patear a los palos o al line. */
  aiPenalty(att: LiveSide, dist: number): 'palos' | 'line' {
    const def = this.other(att);
    const behind = def.pts - att.pts;
    const late = this.t > 65;
    if (late && behind >= 4 && behind <= 7) return 'line';
    if (late && behind > 0 && behind <= 3) return 'palos';
    const pack = (att.ratings.line + att.ratings.F) - (def.ratings.line + def.ratings.F);
    const pLine = clamp(0.18 + (dist >= 40 ? 0.2 : 0) + pack * 0.01 + (att.tactics.ataque === 'forwards' ? 0.1 : 0), 0.05, 0.7);
    return this.rng.chance(pLine) ? 'line' : 'palos';
  }

  private resolvePenalty(att: LiveSide, def: LiveSide, min: number, dist: number, falta: string, choice: 'palos' | 'line') {
    const rng = this.rng;
    const kicker = this.bySlot(att, att.ratings.kickerSlot) ?? this.bySlot(att, 9);
    if (choice === 'palos') {
      const p = clamp(att.ratings.kickPct + (35 - dist) * 0.008 + rng.next() * 0.1 - 0.05, 0.2, 0.97);
      if (rng.chance(p)) {
        att.pts += 3;
        this.credit(att, kicker, 0, 3);
        this.push(min, 'penal', att, `Penal para ${att.club.nombre} por ${falta} de ${def.club.nombre}. ${nm(kicker)} apunta a los palos desde ${dist} metros... ¡adentro! ${this.marcador()}.`);
      } else {
        this.push(min, 'penalErrado', att, `Penal para ${att.club.nombre} por ${falta}. ${nm(kicker)} le pega desde ${dist} metros pero se va afuera.`);
      }
      return;
    }
    // Al line: patada a la punta, line en las 5 y maul.
    const lineWin = clamp(0.85 + (att.ratings.line - def.ratings.line) * 0.012, 0.55, 0.97);
    if (!rng.chance(lineWin)) {
      att.stats.linesP++;
      def.stats.linesG++;
      this.push(min, 'line', att, `Penal para ${att.club.nombre} por ${falta}: patean al line. Pero ${def.club.nombre} roba el line en las 5 y se salva.`);
      return;
    }
    att.stats.linesG++;
    const push = (att.ratings.F - def.ratings.F) + (att.ratings.scrum - def.ratings.scrum) * 0.5;
    const pTry = clamp(0.36 + push * 0.012 + (att.tactics.ataque === 'forwards' ? 0.05 : 0), 0.15, 0.65);
    this.push(min, 'line', att, `Penal para ${att.club.nombre} por ${falta}: ¡patean al line! Line en las 5 yardas, lo gana ${att.club.nombre} y arman el maul...`);
    if (rng.chance(pTry)) this.scoreTry(att, def, min, 'maul');
    else this.push(min, 'jugada', att, `¡Aguanta ${def.club.nombre}! Frenan el maul y la pelota queda retenida.`);
  }

  private scoreTry(att: LiveSide, def: LiveSide, min: number, forced?: 'maul') {
    const rng = this.rng;
    const metodo =
      forced ??
      rng.weighted(
        ['maul', 'pick', 'backs', 'contra', 'intercepcion'] as const,
        (att.tactics.ataque === 'forwards' ? [3, 2.4, 2, 0.8, 0.15] : att.tactics.ataque === 'abrir' ? [1, 1, 4, 1.5, 0.2] : [2, 2, 3, 1, 0.2]).map((w, i) =>
          this.input.clima === 'lluvia' && (i === 2 || i === 3) ? w * 0.6 : w,
        ),
      );
    let scorer: Player | null;
    let text: string;
    switch (metodo) {
      case 'maul':
        scorer = rng.chance(0.6) ? this.bySlot(att, 1) ?? this.pickBy(att, { HOO: 1, TER: 1 }) : this.pickBy(att, { TER: 1, SEG: 0.6 });
        text = rng.pick([
          `Line en las 5 yardas, se arma el maul y empuja todo el pack de ${att.club.nombre}. Apoya ${full(scorer)}.`,
          `Maul imparable desde el line. ${full(scorer)} sale del fondo y apoya en el ingoal.`,
        ]);
        break;
      case 'pick':
        scorer = this.pickBy(att, { PIL: 0.6, HOO: 0.7, SEG: 0.9, TER: 1.6 });
        text = rng.pick([
          `Fase tras fase pegados al ruck, hasta que ${full(scorer)} se tira de cabeza y apoya.`,
          `Pick and go de los forwards de ${att.club.nombre}. ${full(scorer)} se zambulle y es try.`,
        ]);
        break;
      case 'backs':
        att.stats.quiebres++;
        scorer = this.pickBy(att, { WIN: 2.2, CEN: 1.4, FUL: 0.8, APE: 0.35, MSC: 0.3, TER: 0.15 });
        text = rng.pick([
          `Pelota rápida de ${nm(this.bySlot(att, 8))}, ${nm(this.bySlot(att, 9))} abre la línea y ${full(scorer)} entra por el hueco.`,
          `Gran quiebre del centro, descarga en la cara del tackle y ${full(scorer)} apoya debajo de los palos.`,
          `Jugada de backs ensayada. La pelota llega a la punta y ${full(scorer)} la apoya en el rincón.`,
        ]);
        break;
      case 'contra':
        att.stats.quiebres++;
        scorer = this.pickBy(att, { FUL: 2, WIN: 2, CEN: 0.8 });
        text = rng.pick([
          `Contraataque desde su propio campo: ${full(scorer)} esquiva dos tackles y corre 60 metros hasta el ingoal.`,
          `Patada larga mal resuelta por la defensa, ${full(scorer)} la levanta y se va solo.`,
        ]);
        break;
      default:
        scorer = this.pickBy(att, { CEN: 1.5, WIN: 1.2, APE: 0.6, FUL: 0.6 });
        text = `¡Intercepción! ${full(scorer)} le roba un pase a ${def.club.nombre} y corre hasta el ingoal.`;
    }
    // A veces lo revisa el TMO.
    if (this.detailed && rng.chance(TUNING.tmo)) {
      if (rng.chance(0.22)) {
        this.push(min, 'tmo', att, `📺 TMO: ${full(scorer)} apoya en el ingoal de ${def.club.nombre}... el árbitro lo manda a revisar. ¡No es try! Hubo un knock-on antes.`);
        return;
      }
      this.push(min, 'tmo', att, `📺 El árbitro pide el TMO para ver el apoyo de ${nm(scorer)}... ¡Try confirmado!`);
    }
    att.pts += 5;
    att.tries++;
    this.credit(att, scorer, 1, 5);
    this.push(min, 'try', att, `🏉 ¡TRY de ${att.club.nombre}! ${text} ${this.marcador()}.`, scorer ? { pid: scorer.id } : undefined);
    const kicker = this.bySlot(att, att.ratings.kickerSlot) ?? this.bySlot(att, 9);
    const angle = metodo === 'backs' || metodo === 'maul' ? rng.next() * 0.25 - 0.17 : rng.next() * 0.2 - 0.08;
    if (rng.chance(clamp(att.ratings.kickPct - 0.04 + angle, 0.25, 0.97))) {
      att.pts += 2;
      this.credit(att, kicker, 0, 2);
      this.push(min, 'conversion', att, `${nm(kicker)} convierte. ${this.marcador()}.`);
    } else {
      this.push(min, 'conversionErrada', att, rng.pick([
        `${nm(kicker)} erra la conversión, pega en el palo.`,
        `La conversión de ${nm(kicker)} se va desviada.`,
        `Patada difícil desde la punta y ${nm(kicker)} no la puede meter.`,
      ]));
    }
  }

  private injure(s: LiveSide, min: number) {
    const rng = this.rng;
    const slots = this.activeSlots(s);
    if (!slots.length) return;
    const slot = rng.pick(slots);
    const p = s.xv[slot]!;
    let semanas = rng.weighted([1, 2, 3, 4, 6, 10], [40, 25, 15, 10, 7, 3]);
    // Un buen médico acorta las lesiones.
    if ((s.club.staff?.medico ?? 0) >= 2 && semanas > 1) semanas--;
    this.lesionados.push({ playerId: p.id, semanas });
    this.push(min, 'lesion', s, `🚑 Se lesiona ${full(p)} (${s.club.corto}). Estará afuera ${semanas === 1 ? 'una semana' : `${semanas} semanas`}.`, { pid: p.id, slot });
    // Entra el mejor suplente disponible para esa camiseta.
    let best = -1;
    let bestR = -1;
    s.bench.forEach((b, i) => {
      const r = this.liveRating(b, slot);
      if (r > bestR) {
        bestR = r;
        best = i;
      }
    });
    if (best >= 0) {
      this.substitute(s.key, slot, s.bench[best].id);
    } else {
      s.salieron.push(p.id);
      s.xv[slot] = null;
    }
    s.ratings = this.computeRatings(s);
  }

  private finish() {
    this.t = 80;
    this.finished = true;
    this.push(80, 'final', null, `¡Final del partido! ${this.marcador()}.`);
  }

  /** Figura del partido: puntos, rendimiento y un poco de suerte. */
  private mvp(): string | undefined {
    const winner = this.H.pts === this.A.pts ? null : this.H.pts > this.A.pts ? 'H' : 'A';
    let best: string | undefined;
    let bestS = -Infinity;
    for (const s of [this.H, this.A]) {
      for (const p of [...s.xv, ...s.bench, ...s.salieron.map((id) => this.input.players[id])]) {
        if (!p || !this.jugaron.has(p.id)) continue;
        const sc = this.scorers.get(p.id);
        const mins = this.mins.get(p.id) ?? 0;
        const score = (sc?.puntos ?? 0) * 0.6 + (sc?.tries ?? 0) * 3 + (ratingAs(p.attrs, p.pos) - 60) * 0.25 + mins / 20 + (winner === s.key ? 4 : 0) + this.rng.normal(0, 2.5);
        if (score > bestS) {
          bestS = score;
          best = p.id;
        }
      }
    }
    return best;
  }

  result(): MatchResult {
    if (!this.finished) this.runToEnd();
    const totalPos = this.H.posesiones + this.A.posesiones || 1;
    const minutos: Record<string, number> = {};
    for (const [id, m] of this.mins) minutos[id] = Math.round(m);
    return {
      ptsH: this.H.pts,
      ptsA: this.A.pts,
      triesH: this.H.tries,
      triesA: this.A.tries,
      posesionH: Math.round((this.H.posesiones / totalPos) * 100),
      amarillasH: this.H.amarillas,
      amarillasA: this.A.amarillas,
      scorers: [...this.scorers.values()],
      lesionados: this.lesionados,
      jugaron: [...this.jugaron],
      events: this.detailed ? this.events : undefined,
      formaciones: this.detailed ? this.formaciones : undefined,
      stats: this.detailed ? { H: this.H.stats, A: this.A.stats } : undefined,
      mvp: this.detailed ? this.mvp() : undefined,
      minutos,
    };
  }

  private flavor(att: LiveSide, def: LiveSide, origen: 'scrum' | 'line' | 'ruck'): string {
    const rng = this.rng;
    const b = (s: LiveSide, i: number) => nm(this.bySlot(s, i));
    const scrum = [
      () => `Scrum en mitad de cancha. Empuja fuerte el pack de ${att.club.nombre} y sale la pelota limpia para ${b(att, 8)}.`,
      () => `El scrum de ${def.club.nombre} se planta y consigue un penal. Patean al line.`,
      () => `Scrum torcido, lo vuelven a armar. Al final sale para ${att.club.nombre}.`,
    ];
    const line = [
      () => `Line de ${att.club.nombre} en campo rival. Salta ${b(att, rng.pick([3, 4]))} y la gana.`,
      () => `Line torcido de ${att.club.nombre}. Scrum para ${def.club.nombre}.`,
      () => `${b(def, rng.pick([3, 4, 6]))} le roba el line a ${att.club.nombre}. ¡Qué salto!`,
    ];
    const ruck = [
      () => `Gran tackle de ${nm(this.pickBy(def, { TER: 2, CEN: 1.5, SEG: 1 }))} que frena en seco el avance.`,
      () => `${b(att, att.ratings.kickerSlot)} patea largo buscando la espalda de la defensa. Gana 40 metros.`,
      () => `Knock-on de ${nm(this.pickBy(att, { CEN: 1, WIN: 1, TER: 1 }))}. Scrum para ${def.club.nombre}.`,
      () => `Ruck ganado por ${att.club.nombre}, varias fases pero la defensa de ${def.club.nombre} aguanta bien.`,
      () => `Turnover: ${nm(this.pickBy(def, { TER: 3, HOO: 1 }))} se queda con la pelota en el piso.`,
      () => `Pase forward en el ataque de ${att.club.nombre}. Se pierde una buena chance.`,
      () => `Corrida de ${nm(this.pickBy(att, { WIN: 2, FUL: 1.5, CEN: 1 }))} por la punta, lo sacan afuera cerca del ingoal.`,
      () => `${b(att, 8)} sale rápido del ruck pero lo agarran. Pelota retenida.`,
    ];
    return rng.pick(origen === 'scrum' ? scrum : origen === 'line' ? line : ruck)();
  }
}

/** Simula un partido entero sin pausas (la computadora maneja a los dos). */
export function simulateMatch(input: MatchInput, rng: Rng): MatchResult {
  const m = new LiveMatch({ ...input, interactive: undefined }, rng);
  m.runToEnd();
  return m.result();
}

export const FALTAS = [
  'off-side', 'no soltar en el ruck', 'tackle alto', 'entrar por el costado al ruck', 'derrumbar el maul',
  'derrumbar el scrum', 'no rolar después del tackle', 'obstrucción',
];

export const isForwardSlot = (i: number) => isForward(SHIRT_POS[i]);
