import { Rng, clamp } from './rng';
import { INST, efectoEstrellas, STAFF } from './club';
import { logMoney } from './market';
import { POS_LABEL, SHIRT_POS, assignDorsal, bestXV, generatePlayer, overall, randomName, ratingAs, wageFor } from './players';
import type { GameState, InstKey, Pos, StaffKey } from './types';

/** La ayuda que elegís al empezar una partida nueva. */
export type AyudaInicial = 'nada' | 'plata' | 'estrella' | 'estadio' | 'staff' | 'cantera' | 'paciencia';

export const AYUDAS: { id: AyudaInicial; icono: string; titulo: string; texto: string; soloCarrera?: boolean }[] = [
  { id: 'nada', icono: '🏉', titulo: 'Nada, partida normal', texto: 'Arrancás con lo que tiene el club. Para los que quieren el desafío de verdad.' },
  { id: 'plata', icono: '💰', titulo: 'Ayuda financiera', texto: 'Un mecenas pone plata en la caja: de 40 a 90 millones según la categoría del club.' },
  { id: 'estrella', icono: '⭐', titulo: 'Un jugador estrella', texto: 'Llega una súper estrella (más de 85 de media, 26 años o menos) al puesto donde más flojo está tu XV, con contrato por 4 años.' },
  { id: 'estadio', icono: '🏟️', titulo: 'Súper estadio', texto: 'Tribunas más grandes, gimnasio y cancha de entrenamiento mejorados y quincho nuevo.' },
  { id: 'staff', icono: '🧑‍🏫', titulo: 'Cuerpo técnico de lujo', texto: 'Todos los empleados de 4 estrellas: ayudante, kinesiólogo, médico, nutricionista y ojeador.' },
  { id: 'cantera', icono: '🌱', titulo: 'Camada de juveniles', texto: 'Suben 3 pibes de 17 años con muchísimo futuro. Hoy juegan poco, en dos o tres temporadas son figuras.' },
  { id: 'paciencia', icono: '🤝', titulo: 'Respaldo de la comisión', texto: 'La comisión directiva te banca a muerte: arrancás con la confianza al 100% y más prestigio.', soloCarrera: true },
];

export const PLATA_AYUDA: Record<string, number> = { A: 90_000_000, B: 60_000_000, C: 40_000_000 };

/** Aplica la ayuda elegida al club del usuario. Devuelve el texto para la noticia (o null si no eligió nada). */
export function aplicarAyuda(g: GameState, ayuda: AyudaInicial, rng: Rng): string | null {
  const c = g.clubs[g.userClubId];
  switch (ayuda) {
    case 'plata': {
      const m = PLATA_AYUDA[c.division] ?? 40_000_000;
      c.presupuesto += m;
      logMoney(g, 'Ayuda inicial: aporte de un mecenas', m);
      return `Un mecenas del club puso $${Math.round(m / 1_000_000)} millones para arrancar.`;
    }
    case 'estrella': {
      // El puesto del XV donde está el jugador más flojo.
      const xv = bestXV(c, g.players);
      let peor = 0;
      let peorR = Infinity;
      xv.forEach((id, i) => {
        const r = id ? ratingAs(g.players[id].attrs, SHIRT_POS[i]) : 0;
        if (r < peorR) {
          peorR = r;
          peor = i;
        }
      });
      const pos = SHIRT_POS[peor];
      // Una estrella de verdad: bastante mejor que el mejor del plantel.
      const mejor = Math.max(...c.plantel.map((x) => overall(g.players[x])));
      // Luca: una súper estrella llega con más de 85 de media y como mucho 26 años.
      const target = clamp(Math.max(87, mejor + 5), 87, 90);
      const id = `p${(g.nextId++).toString(36)}`;
      let p = generatePlayer(rng, id, pos, target, rng.int(22, 26));
      for (let i = 0; i < 40 && overall(p) < 86; i++) p = generatePlayer(rng, id, pos, Math.min(90, target + i), rng.int(22, 26));
      p.potencial = Math.max(p.potencial, overall(p) + 2);
      p.moral = 80;
      p.contrato = 4;
      p.clubId = c.id;
      // Viene por el proyecto: cobra la mitad de lo que valdría en el mercado.
      p.sueldo = Math.round(wageFor(p) / 2 / 1000) * 1000;
      g.players[id] = p;
      c.plantel.push(id);
      assignDorsal(c, g.players, p);
      c.xv = bestXV(c, g.players);
      g.ayudaAviso = { texto: `Llegó ${p.nombre} ${p.apellido} (${POS_LABEL[p.pos]}, ${overall(p)} de media), la nueva figura del equipo. Ya está en tu XV de titular. Firmó por 4 años.`, playerId: p.id };
      return g.ayudaAviso.texto;
    }
    case 'estadio': {
      const sube: Record<InstKey, number> = { tribunas: 3, gimnasio: 2, campo: 2, quincho: 1 };
      for (const k of Object.keys(sube) as InstKey[]) c.inst[k] = Math.min(INST[k].max, (c.inst[k] ?? 0) + sube[k]);
      return 'El club estrena estadio: tribunas nuevas, gimnasio y cancha de entrenamiento mejorados y quincho.';
    }
    case 'staff': {
      const ks: StaffKey[] = ['ayudante', 'kinesiologo', 'medico', 'nutricionista', 'ojeador'];
      for (const k of ks) {
        const n = randomName(rng);
        c.staffPersonas = { ...(c.staffPersonas ?? {}), [k]: { nombre: `${n.nombre} ${n.apellido}`, estrellas: 4 } };
        c.staff[k] = efectoEstrellas(4);
      }
      return `Llegó un cuerpo técnico de lujo: ${ks.map((k) => STAFF[k].nombre.toLowerCase()).join(', ')}, todos de 4 estrellas.`;
    }
    case 'cantera': {
      const posiciones = rng.shuffle<Pos>(['APE', 'CEN', 'TER', 'SEG', 'WIN', 'FUL', 'PIL', 'MSC']).slice(0, 3);
      const nombres: string[] = [];
      for (const pos of posiciones) {
        const id = `p${(g.nextId++).toString(36)}`;
        const p = generatePlayer(rng, id, pos, rng.normal(54, 3), 17);
        p.potencial = rng.int(86, 92);
        p.clubId = c.id;
        p.contrato = 4;
        p.sueldo = 30_000;
        p.moral = 80;
        g.players[id] = p;
        c.plantel.push(id);
        assignDorsal(c, g.players, p);
        nombres.push(`${p.nombre} ${p.apellido}`);
      }
      return `Subieron 3 juveniles con mucho futuro: ${nombres.join(', ')}.`;
    }
    case 'paciencia': {
      g.career.confianza = 100;
      g.career.prestigio += 8;
      return 'La comisión directiva te da todo su respaldo: tenés crédito de sobra.';
    }
    default:
      return null;
  }
}
