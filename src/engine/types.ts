import type { Career } from './career';

export type Pos = 'PIL' | 'HOO' | 'SEG' | 'TER' | 'MSC' | 'APE' | 'CEN' | 'WIN' | 'FUL';
export type AttrKey = 'scrum' | 'line' | 'tackle' | 'velocidad' | 'manejo' | 'pie' | 'liderazgo' | 'fisico' | 'actitud';
export type Attrs = Record<AttrKey, number>;
export type DivId = 'A' | 'B' | 'C';

export interface PlayerStats {
  partidos: number;
  tries: number;
  puntos: number;
}

export interface Player {
  id: string;
  nombre: string;
  apellido: string;
  pos: Pos;
  /** Puestos donde también puede jugar casi sin perder rendimiento. */
  pos2: Pos[];
  edad: number;
  attrs: Attrs;
  potencial: number;
  moral: number; // 0-100
  energia: number; // 0-100
  lesion: number; // semanas que le faltan (0 = sano)
  clubId: string | null;
  temporada: PlayerStats;
  carrera: PlayerStats;
  /** Media al empezar la temporada (para mostrar cuánto mejoró). */
  ovrInicio: number;
  /** Atributos al empezar la temporada (el "previo"). */
  attrsInicio: Attrs;
  /** Número de camiseta en el plantel. */
  dorsal: number;
  /** Entrenamiento individual. null = el mismo que el equipo. */
  entreno: FocoEntreno | null;
  /** Sueldo por fecha. */
  sueldo: number;
  /** Partidos con la Selección. */
  caps?: number;
  /** Está en la lista de transferibles de su club. */
  transferible?: boolean;
  /** Está a préstamo: de qué club es y hasta qué temporada. */
  prestamo?: { clubId: string; temporada: number };
  /** Qué lesión tiene (si está lesionado). */
  lesionTipo?: string;
  /** Cómo terminó cada temporada (para ver cuánto mejoró). */
  historia?: { temporada: number; ovr: number; partidos: number; tries: number; clubId: string }[];
  /** Temporadas de contrato que le quedan (contando la actual). */
  contrato: number;
}

export type InstKey = 'tribunas' | 'gimnasio' | 'campo' | 'quincho';
export type Instalaciones = Record<InstKey, number>;
export type StaffKey = 'nutricionista' | 'kinesiologo' | 'medico' | 'ayudante' | 'ojeador';
export type Staff = Record<StaffKey, number>;

export interface Obra {
  tipo: InstKey;
  /** Fechas que faltan para terminarla. */
  fechas: number;
  total: number;
}

export interface SponsorDeal {
  nombre: string;
  tipo: 'fijo' | 'victoria';
  /** Lo que paga al firmar. */
  fijo: number;
  /** Premio por cada partido ganado. */
  porVictoria: number;
}

export type Ataque = 'forwards' | 'equilibrado' | 'abrir';
export type JuegoPie = 'poco' | 'medio' | 'mucho';
export type Defensa = 'conservadora' | 'equilibrada' | 'agresiva';

export interface Tactics {
  ataque: Ataque;
  pie: JuegoPie;
  defensa: Defensa;
}

export type Patron = 'lisa' | 'rayas' | 'aros' | 'banda' | 'mitades' | 'cuartos' | 'cuadros';

export interface Club {
  id: string;
  nombre: string;
  corto: string;
  ciudad: string;
  apodo: string;
  colores: [string, string];
  patron: Patron;
  reputacion: number;
  division: DivId;
  plantel: string[];
  /** 15 lugares: índice 0 = camiseta 1. */
  xv: (string | null)[];
  tactica: Tactics;
  presupuesto: number;
  entrenamiento: Training;
  socios: number;
  precioEntrada: number;
  inst: Instalaciones;
  staff: Staff;
  /** Quién ocupa cada puesto de empleado (nombre y estrellas de 1 a 5). */
  staffPersonas?: Partial<Record<StaffKey, { nombre: string; estrellas: number }>>;
  obras: Obra[];
  sponsor: SponsorDeal | null;
  /** Gente en la cancha en el último partido de local. */
  ultimaAsistencia?: number;
  /** Código original del club (no cambia aunque lo renombres). */
  codigo?: string;
  /** Capitán elegido por el usuario (null = el de más liderazgo). */
  capitan?: string | null;
}

export interface RecordEntry {
  valor: number;
  texto: string;
  temporada: number;
}

export interface Convocatoria {
  temporada: number;
  ids: string[];
  rival: string;
  resultado: string;
}

export type FocoEntreno = 'fisico' | 'forwards' | 'backs' | 'pateo' | 'general';
export type Intensidad = 'descanso' | 'suave' | 'normal' | 'intenso';

export interface Training {
  foco: FocoEntreno;
  intensidad: Intensidad;
}

export interface Movimiento {
  temporada: number;
  round: number;
  concepto: string;
  monto: number; // positivo entra, negativo sale
}

export type Comp = 'AMISTOSO' | 'A' | 'B' | 'C' | 'SEMI' | 'FINAL' | 'PROMO1' | 'PROMO2' | 'PROMOC1' | 'PROMOC2' | 'COPA';

export type EventKind =
  | 'inicio'
  | 'try'
  | 'conversion'
  | 'conversionErrada'
  | 'penal'
  | 'penalErrado'
  | 'drop'
  | 'amarilla'
  | 'lesion'
  | 'cambio'
  | 'entretiempo'
  | 'final'
  | 'roja'
  | 'tmo'
  | 'line'
  | 'jugada';

export interface MatchEvent {
  min: number;
  kind: EventKind;
  side: 'H' | 'A' | null;
  text: string;
  scoreH: number;
  scoreA: number;
  /** Jugador de la jugada (lesionado, amonestado o el que entra) y su camiseta. */
  pid?: string;
  slot?: number;
  /** En un cambio, el que sale. */
  out?: string;
}

export interface SideStats {
  penales: number; // penales cometidos
  scrumsG: number;
  scrumsP: number;
  linesG: number;
  linesP: number;
  quiebres: number;
  tackles: number;
  tacklesErrados: number;
  rojas: number;
}

export interface ScoringEntry {
  playerId: string;
  side: 'H' | 'A';
  tries: number;
  puntos: number;
}

export interface MatchResult {
  ptsH: number;
  ptsA: number;
  triesH: number;
  triesA: number;
  posesionH: number; // %
  amarillasH: number;
  amarillasA: number;
  scorers: ScoringEntry[];
  lesionados: { playerId: string; semanas: number }[];
  jugaron: string[];
  events?: MatchEvent[];
  /** En eliminación, quién pasó si hubo empate. */
  definicion?: string;
  /** Formaciones al empezar (solo en el partido del usuario). */
  formaciones?: Record<'H' | 'A', Formacion>;
  /** Estadísticas del partido (solo en el del usuario). */
  stats?: Record<'H' | 'A', SideStats>;
  /** Figura del partido. */
  mvp?: string;
  /** Minutos jugados de cada uno (se borra después de aplicar el desgaste, salvo en el del usuario). */
  minutos?: Record<string, number>;
}

export interface Formacion {
  xv: (string | null)[];
  banco: string[];
  /** Energía de cada uno al arrancar. */
  energia: Record<string, number>;
}

export interface Fixture {
  id: string;
  round: number;
  comp: Comp;
  home: string;
  away: string;
  result?: MatchResult;
  /** En la copa: 0 octavos, 1 cuartos, 2 semis, 3 final. */
  etapa?: number;
}

export interface StandingRow {
  clubId: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  pf: number;
  pc: number;
  tf: number;
  bo: number; // bonus ofensivo
  bd: number; // bonus defensivo
  pts: number;
}

export interface SeasonRecord {
  temporada: number;
  campeonA: string;
  subcampeonA: string;
  campeonB: string;
  /** Movimientos entre Primera A y B. */
  asciende: string[];
  desciende: string[];
  campeonC?: string;
  /** Movimientos entre Primera B y C. */
  ascC?: string[];
  descB?: string[];
  promocionC?: { primera: string; ascenso: string; ganador: string; global: string };
  promocion?: { primera: string; ascenso: string; ganador: string; global: string };
  campeonCopa?: string;
  maxTrymanA?: { playerId: string; nombre: string; clubId: string; tries: number };
  posicionUsuario: { division: DivId; puesto: number };
}

export interface VestuarioEvento {
  id: string;
  tipo: 'minutos' | 'irse' | 'pelea';
  players: string[];
  round: number;
}

export interface Edicion {
  temporada: number;
  round: number;
  titulares: { titulo: string; bajada: string }[];
}

export interface NewsItem {
  id: string;
  temporada: number;
  round: number;
  titulo: string;
  texto: string;
}

export type Phase = 'regular' | 'playoffs' | 'fin';

export interface GameState {
  version: number;
  rng: number;
  temporada: number;
  round: number; // próxima fecha a jugar (1..20)
  phase: Phase;
  userClubId: string;
  manager: string;
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  fixtures: Fixture[];
  history: SeasonRecord[];
  news: NewsItem[];
  /** Ediciones del diario (la más nueva primero). */
  diario?: Edicion[];
  /** Algo que pasó en el vestuario y espera tu respuesta. */
  vestuario?: VestuarioEvento | null;
  /** Minutos que le prometiste a alguien (tiene que jugar antes de la fecha "hasta"). */
  promesas?: { playerId: string; hasta: number; partidos: number }[];
  /** Conferencia de prensa antes de un partido grande. */
  prensa?: { fixtureId: string; eleccion: number; resuelta?: boolean };
  /** Premios de cada temporada (la más nueva primero). */
  premios?: { temporada: number; premios: { premio: string; playerId: string; nombre: string; clubId: string }[] }[];
  nextId: number;
  /** Jugadores sin club que se pueden fichar. */
  libres: string[];
  /** Movimientos de plata del club del usuario. */
  caja: Movimiento[];
  /** Mejoras de la última semana de entrenamiento (club del usuario). */
  ultimasMejoras: { playerId: string; attr: AttrKey }[];
  /** carrera: empezás desconocido y te pueden echar. libre: elegís cualquier club. */
  modo: 'carrera' | 'libre';
  career: Career;
  /** Sponsors que le ofrecen al club del usuario (para elegir). */
  sponsorOfertas: SponsorDeal[];
  /** Pibes que encontró el ojeador y todavía no subiste al plantel. */
  juveniles: string[];
  /** Récords de la liga desde que dirigís. */
  records?: Partial<Record<string, RecordEntry>>;
  /** Última lista de la Selección. */
  seleccion?: Convocatoria;
  /** Ofertas de otros clubes por tus jugadores. */
  ofertas?: Oferta[];
  /** Si hay pretemporada con amistosos al empezar cada temporada. */
  amistosos?: boolean;
  pretemporada?: Pretemporada;
}

export interface PropuestaAmistosa {
  tipo: 'fuerte' | 'gira' | 'clasico';
  nombre: string;
  texto: string;
  rivales: string[];
  premio: number;
}

export interface Pretemporada {
  temporada: number;
  propuestas: PropuestaAmistosa[];
  elegida: number | null;
  partidos: Fixture[];
  terminada: boolean;
}

export interface Oferta {
  id: string;
  playerId: string;
  clubId: string;
  monto: number;
  /** Lo máximo que están dispuestos a pagar (no se muestra). */
  max: number;
  /** Fecha en que llegó. */
  fecha: number;
  /** Ya le pediste más una vez. */
  contra: boolean;
  /** Club de afuera (Europa): no está en la liga. */
  exterior?: string;
}
