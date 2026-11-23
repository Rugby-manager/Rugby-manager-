// Calendario de la temporada: en qué día cae cada fecha del club, la copa, la pretemporada,
// el Seven y las ventanas internacionales (julio, noviembre y el Mundial), como el de World Rugby.

/** Después de esta fecha de la liga se para todo por la ventana de julio. */
export const RONDA_VENTANA = 16;
/** El Mundial se juega cada 4 años (Australia 2027, después 2031, 2035...). */
export const esAnioMundial = (y: number) => (y - 2027) % 4 === 0 && y >= 2027;

const DIA = 86_400_000;

function primerSabado(y: number, mes: number) {
  const d = new Date(y, mes, 1, 12);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return d;
}
const mas = (d: Date, dias: number) => new Date(d.getTime() + dias * DIA);

/** Fecha de cada jornada del club. Arranca el primer sábado de marzo; las de copa son el miércoles. */
export function fechaRonda(y: number, round: number): Date {
  const base = Math.max(1, Math.floor(Math.min(round, 20)));
  // Entre la fecha 16 y la 17 hay una semana libre y las 3 semanas de los tests de julio.
  const semanas = base - 1 + (base > RONDA_VENTANA ? 4 : 0);
  return mas(primerSabado(y, 2), semanas * 7 + (Number.isInteger(round) ? 0 : 4));
}

/** Los 3 amistosos de pretemporada (febrero) y el Seven de Verano (el finde antes de la fecha 1). */
export const fechaAmistoso = (y: number, i: number) => mas(primerSabado(y, 2), -28 + i * 7);
export const fechaSeven = (y: number) => mas(primerSabado(y, 2), -7);

/** Ventana de julio: los 3 sábados después de la semana libre. */
export const fechasJulio = (y: number) => [14, 21, 28].map((d) => mas(fechaRonda(y, RONDA_VENTANA), d));
/** Ventana de noviembre: 3 sábados y el fin de semana de las finales (Nations Championship). */
export const fechasNoviembre = (y: number) => [0, 7, 14, 21].map((d) => mas(primerSabado(y, 10), d));
/** Seis Naciones: 5 fechas entre febrero y marzo, con dos fines de semana libres. */
export const fechasSeis = (y: number) => [0, 7, 21, 28, 42].map((d) => mas(primerSabado(y, 1), d));
/** Rugby Championship: después de la final del club. En año de Mundial es más corto (3 fechas). */
export const fechasRC = (y: number) =>
  (esAnioMundial(y) ? [7, 14, 21] : [7, 14, 28, 35, 42, 49]).map((d) => mas(fechaRonda(y, 20), d));
/** Mundial: 3 fechas de grupos, octavos, cuartos, semis y final (2027: 2 de octubre al 13 de noviembre). */
export const fechasMundial = (y: number) => [0, 7, 14, 21, 28, 35, 42].map((d) => mas(primerSabado(y, 9), d));

export function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function deIso(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function fechaLarga(d: Date) {
  const s = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function fechaCorta(d: Date) {
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
}
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
