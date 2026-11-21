import { lesionNombre } from './players';
import { Rng, clamp } from './rng';
import { ATTR_LABEL, W, actitudMult, ratingAs } from './players';
import type { AttrKey, Club, FocoEntreno, GameState, Intensidad, PlanEntreno, Player } from './types';

export const FOCO_LABEL: Record<FocoEntreno, string> = {
  auto: 'Según su puesto',
  ataque: 'Ataque y manejo',
  defensa: 'Defensa y contacto',
  fijas: 'Formaciones fijas',
  pateo: 'Patada y coordinación',
  fisico: 'Físico',
};

export const FOCO_DESC: Record<FocoEntreno, string> = {
  auto: 'Trabaja lo que más necesita su puesto.',
  ataque: 'Velocidad, penetración, pase y recepción.',
  defensa: 'Tackle, ruck y dureza.',
  fijas: 'Scrum, salto y fuerza en el line.',
  pateo: 'Precisión y potencia de patada, y coordinación.',
  fisico: 'Resistencia, dureza y velocidad.',
};

export const INTENSIDAD_LABEL: Record<Intensidad, string> = {
  descanso: 'Descanso',
  suave: 'Suave',
  normal: 'Normal',
  intenso: 'Intenso',
};

export const FOCOS: FocoEntreno[] = ['auto', 'ataque', 'defensa', 'fijas', 'pateo', 'fisico'];

/** Qué pasa con cada intensidad, para mostrar en pantalla. */
export const INTENSIDAD_EFECTO: Record<Intensidad, { mejora: string; energia: string; lesion: string }> = {
  descanso: { mejora: 'Nada', energia: 'Recuperan mucho', lesion: 'Ninguno' },
  suave: { mejora: 'Poca', energia: 'Recuperan algo', lesion: 'Ninguno' },
  normal: { mejora: 'Normal', energia: 'Se mantiene', lesion: 'Muy bajo' },
  intenso: { mejora: 'Mucha', energia: 'Se cansan', lesion: 'Alto' },
};

export const INTENSIDAD_DESC: Record<Intensidad, string> = {
  descanso: 'No mejoran, pero recuperan mucha energía.',
  suave: 'Mejoran poco y casi no se cansan.',
  normal: 'Buen equilibrio entre mejora y cansancio.',
  intenso: 'Mejoran más rápido, pero se cansan y hay más riesgo de lesión.',
};

export const FOCO_ATTRS: Record<FocoEntreno, AttrKey[]> = {
  auto: ['velocidad', 'penetracion', 'pase', 'recepcion', 'tackle', 'ruck', 'dureza', 'scrum', 'salto', 'fuerzaLine', 'precision', 'potencia', 'coordinacion', 'resistencia'],
  ataque: ['velocidad', 'penetracion', 'pase', 'recepcion'],
  defensa: ['tackle', 'ruck', 'dureza'],
  fijas: ['scrum', 'salto', 'fuerzaLine'],
  pateo: ['precision', 'potencia', 'coordinacion'],
  fisico: ['resistencia', 'dureza', 'velocidad'],
};

/** Nombre corto de un plan (grupo o atributo). */
export const planLabel = (plan: PlanEntreno) => (plan in FOCO_LABEL ? FOCO_LABEL[plan as FocoEntreno] : ATTR_LABEL[plan as AttrKey]);
/** Pasa planes viejos (general, forwards, backs) a los nuevos. */
export function planNuevo(x: string | null | undefined): PlanEntreno | null {
  if (!x) return null;
  const map: Record<string, PlanEntreno> = { general: 'auto', forwards: 'fijas', backs: 'ataque', pateo: 'pateo', fisico: 'fisico' };
  return (map[x] ?? x) as PlanEntreno;
}

const BASE: Record<Intensidad, number> = { descanso: 0, suave: 0.12, normal: 0.2, intenso: 0.3 };
/** Energía que suma (o resta) cada intensidad por semana. */
export const ENERGIA_ENTRENO: Record<Intensidad, number> = { descanso: 12, suave: 4, normal: 0, intenso: -6 };
const LESION_ENTRENO: Record<Intensidad, number> = { descanso: 0, suave: 0, normal: 0.0015, intenso: 0.007 };

function ageFactor(edad: number) {
  if (edad <= 20) return 1.7;
  if (edad <= 23) return 1.35;
  if (edad <= 26) return 1;
  if (edad <= 29) return 0.6;
  if (edad <= 32) return 0.3;
  return 0.12;
}

export interface TrainingResult {
  mejoras: { playerId: string; attr: AttrKey }[];
  lesionados: { playerId: string; semanas: number }[];
}

/** Una semana de entrenamiento de un club. */
export function trainClub(club: Club, players: Record<string, Player>, rng: Rng): TrainingResult {
  const { intensidad } = club.entrenamiento;
  const out: TrainingResult = { mejoras: [], lesionados: [] };
  const gim = club.inst?.gimnasio ?? 0;
  const campoF = 1 + 0.08 * (club.inst?.campo ?? 0);
  // El ayudante de campo también hace rendir más las prácticas de todos.
  const staffF = 1 + 0.05 * (club.staff?.ayudante ?? 0);
  const lesionF = Math.max(0.2, 1 - 0.12 * gim - 0.15 * (club.staff?.medico ?? 0));
  for (const id of club.plantel) {
    const p = players[id];
    if (p.lesion > 0) continue;
    let plan: PlanEntreno = p.entreno ?? club.entrenamiento.foco ?? 'auto';
    if (!(plan in FOCO_ATTRS) && !(plan in p.attrs)) plan = 'auto';
    const grupo = plan in FOCO_ATTRS;
    // Un solo atributo sube más rápido; un grupo reparte; 'auto' reparte según el puesto.
    const base = BASE[intensidad] * (plan === 'auto' ? 0.9 : grupo ? 1 : 1.1) * staffF;
    if (base > 0 && ratingAs(p.attrs, p.pos) < p.potencial) {
      // 'Según su puesto' trabaja solo lo que pesa en su puesto.
      const attrs: AttrKey[] = plan === 'auto' ? FOCO_ATTRS.auto.filter((k) => (W[p.pos][k] ?? 0) > 0) : grupo ? FOCO_ATTRS[plan as FocoEntreno] : [plan as AttrKey];
      const weights = attrs.map((k) => (W[p.pos][k] ?? 0) + (plan === 'auto' ? 0.005 : 0.05));
      for (let i = 0; i < 2; i++) {
        // Los que tienen buena actitud aprovechan más el entrenamiento.
        if (!rng.chance(base * ageFactor(p.edad) * campoF * clamp(actitudMult(p.attrs.actitud, 0.012), 0.55, 1.4))) continue;
        const k = rng.weighted(attrs, weights);
        if (p.attrs[k] >= 97) continue;
        p.attrs[k] = clamp(p.attrs[k] + 1, 20, 97);
        out.mejoras.push({ playerId: p.id, attr: k });
      }
      // El gimnasio suma resistencia, dureza y velocidad a todo el plantel, aparte del plan.
      if (gim > 0 && rng.chance(0.035 * gim * ageFactor(p.edad))) {
        const k: AttrKey = rng.weighted(['resistencia', 'dureza', 'velocidad'] as AttrKey[], [0.45, 0.3, 0.25]);
        if (p.attrs[k] < 97) {
          p.attrs[k] = clamp(p.attrs[k] + 1, 20, 97);
          out.mejoras.push({ playerId: p.id, attr: k });
        }
      }
    }
    if (rng.chance(LESION_ENTRENO[intensidad] * lesionF)) {
      const semanas = rng.weighted([1, 2, 3], [60, 30, 10]);
      p.lesion = semanas;
      p.lesionTipo = lesionNombre(semanas, p.id + semanas) + ' (en el entrenamiento)';
      out.lesionados.push({ playerId: p.id, semanas });
    }
  }
  return out;
}

export function trainAll(g: GameState, rng: Rng) {
  for (const c of Object.values(g.clubs)) {
    const r = trainClub(c, g.players, rng);
    if (c.id === g.userClubId) {
      g.ultimasMejoras = r.mejoras;
      if (r.lesionados.length) {
        const names = r.lesionados.map((l) => `${g.players[l.playerId].nombre} ${g.players[l.playerId].apellido} (${l.semanas} sem.)`).join(', ');
        g.news.unshift({
          id: `n${(g.nextId++).toString(36)}`,
          temporada: g.temporada,
          round: g.round,
          titulo: 'Lesión en el entrenamiento',
          texto: `Se lesionó en la práctica: ${names}.`,
        });
      }
    }
  }
}
