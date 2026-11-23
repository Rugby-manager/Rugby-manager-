import { hastaTexto } from '../engine/loans';
import { PersBadge } from './Cantera';
import { PERSONALIDAD } from '../engine/personalidad';
import { useEffect, useState } from 'react';
import { renew, renewalDemand } from '../engine/club';
import { useGame } from './App';
import { ATTR_DESC, ATTR_GROUPS, ATTR_KEYS, ATTR_LABEL, POS_LABEL, POS_ORDER, W, marketValue, overall, posText } from '../engine/players';
import { Ovr, Seg, Sheet, Stars, formatMoney, ovrColor, toStars } from './common';
import { apurarVuelta, parteKine } from '../engine/lesiones';
import { CHARLA_CADA, charlar, puedeCharlar, type TipoCharla } from '../engine/vestuario';
import { FOCOS, FOCO_ATTRS, FOCO_DESC, FOCO_LABEL, INTENSIDAD_DESC, INTENSIDAD_EFECTO, INTENSIDAD_LABEL, planLabel } from '../engine/training';
import type { ReactNode } from 'react';
import type { AttrKey, FocoEntreno, Intensidad, PlanEntreno } from '../engine/types';
import type { Club, GameState, Player, Pos } from '../engine/types';

const UNITS: { name: string; pos: Pos[] }[] = [
  { name: 'Primera línea', pos: ['PIL', 'HOO'] },
  { name: 'Segunda línea', pos: ['SEG'] },
  { name: 'Tercera línea', pos: ['TER'] },
  { name: 'Medios', pos: ['MSC', 'APE'] },
  { name: 'Centros', pos: ['CEN'] },
  { name: 'Wings y fullback', pos: ['WIN', 'FUL'] },
];

const FOCO_TAG: Record<FocoEntreno, string> = { auto: 'AUT', ataque: 'ATQ', defensa: 'DEF', fijas: 'FIJ', pateo: 'PAT', fisico: 'FIS' };
const ATTR_TAG: Record<AttrKey, string> = {
  velocidad: 'VEL', penetracion: 'PEN', pase: 'PAS', recepcion: 'REC', tackle: 'TAC', ruck: 'RCK', dureza: 'DUR', scrum: 'SCR',
  salto: 'SAL', fuerzaLine: 'FLN', precision: 'PRE', potencia: 'POT', coordinacion: 'COO', resistencia: 'RES', liderazgo: 'LID', actitud: 'ACT',
};
export const planTag = (plan: PlanEntreno) => (plan in FOCO_TAG ? FOCO_TAG[plan as FocoEntreno] : ATTR_TAG[plan as AttrKey]);
/** Los atributos que se pueden entrenar (la cabeza no se entrena). */
const ENTRENABLES = ATTR_KEYS.filter((k) => k !== 'liderazgo' && k !== 'actitud');

/** Elegir qué entrena un jugador: un grupo o un atributo puntual. */
function PlanSelect({ value, onChange, label }: { value: PlanEntreno; onChange: (v: PlanEntreno) => void; label: string }) {
  return (
    <select className="plansel" aria-label={label} value={value} onChange={(e) => onChange(e.target.value as PlanEntreno)}>
      <optgroup label="Un grupo">
        {FOCOS.map((f) => (
          <option key={f} value={f}>{FOCO_LABEL[f]}</option>
        ))}
      </optgroup>
      <optgroup label="Un atributo puntual (sube más rápido)">
        {ENTRENABLES.map((k) => (
          <option key={k} value={k}>{ATTR_LABEL[k]}</option>
        ))}
      </optgroup>
    </select>
  );
}

/** Color de cada grupo de entrenamiento. */
const GRUPO_COLOR: Record<FocoEntreno, string> = { auto: '#5d6a80', ataque: '#1f6fd0', defensa: '#c0392b', fijas: '#2e8b57', pateo: '#d07a10', fisico: '#7b3fb5' };
const grupoDe = (plan: PlanEntreno): FocoEntreno =>
  plan in FOCO_LABEL ? (plan as FocoEntreno) : ((['ataque', 'defensa', 'fijas', 'pateo', 'fisico'] as FocoEntreno[]).find((f) => FOCO_ATTRS[f].includes(plan as AttrKey)) ?? 'auto');
const GRUPO_ICON: Record<FocoEntreno, string> = { auto: '⚙', ataque: '⚡', defensa: '🛡', fijas: '⛓', pateo: '🎯', fisico: '💪' };

function PlanChip({ plan }: { plan: PlanEntreno }) {
  const gr = grupoDe(plan);
  return (
    <span className="planchip" style={{ background: GRUPO_COLOR[gr] }}>
      {GRUPO_ICON[gr]} {planLabel(plan)}
    </span>
  );
}

/** Lista de jugadores con lo que entrena cada uno; al tocar uno se elige el plan. */
function PlanBoard({ club, onChange }: { club: Club; onChange: () => void }) {
  const { g } = useGame();
  const [edit, setEdit] = useState<string | null>(null);
  const t = club.entrenamiento;
  const subas = new Map<string, number>();
  for (const m of g.ultimasMejoras ?? []) subas.set(m.playerId, (subas.get(m.playerId) ?? 0) + 1);
  const ps = club.plantel
    .map((id) => g.players[id])
    .filter(Boolean)
    .sort((x, y) => POS_ORDER.indexOf(x.pos) - POS_ORDER.indexOf(y.pos) || overall(y) - overall(x));
  const p = edit && edit !== '*' ? g.players[edit] : null;
  const actual: PlanEntreno = edit === '*' ? t.foco : p ? (p.entreno ?? t.foco) : 'auto';
  const elegir = (v: PlanEntreno) => {
    if (edit === '*') club.entrenamiento = { ...t, foco: (v in FOCO_LABEL ? v : 'auto') as FocoEntreno };
    else if (p) p.entreno = v === t.foco ? null : v;
    setEdit(null);
    onChange();
  };
  return (
    <>
      <button className="plancard todos" onClick={() => setEdit('*')}>
        <span className="pc-dor">★</span>
        <span className="pc-main">
          <b>Plan general</b>
          <small>Para los que no tienen plan propio</small>
        </span>
        <PlanChip plan={t.foco} />
      </button>
      <div className="plangrid">
        {ps.map((x) => {
          const plan = x.entreno ?? t.foco;
          const up = subas.get(x.id) ?? 0;
          return (
            <button key={x.id} className={`plancard ${x.entreno ? 'propio' : ''}`} onClick={() => setEdit(x.id)} style={{ opacity: x.lesion > 0 ? 0.55 : 1 }}>
              <span className="pc-dor num">{x.dorsal || '–'}</span>
              <span className="pc-main">
                <b>{x.estrella ? '⭐ ' : ''}{x.apellido}{x.lesion > 0 ? ' ✚' : ''}</b>
                <small>
                  {POS_LABEL[x.pos]} · {x.edad} años
                </small>
                <Stars n={toStars(overall(x))} />
              </span>
              <span className="pc-side">
                <PlanChip plan={plan} />
                {up > 0 && <span className="pc-up">▲ {up} esta semana</span>}
              </span>
            </button>
          );
        })}
      </div>
      {edit && (
        <Sheet title={edit === '*' ? 'Plan general' : `Entrena: ${p?.nombre} ${p?.apellido}`} onClose={() => setEdit(null)}>
          {p && <p className="small muted" style={{ margin: 0 }}>{posText(p)} · {p.edad} años · en negrita lo que más pesa en su puesto.</p>}
          <div className="label">Un grupo de atributos</div>
          <div className="grupos">
            {FOCOS.map((f) => (
              <button key={f} className="grupo" aria-pressed={actual === f} onClick={() => elegir(f)} style={{ borderColor: GRUPO_COLOR[f] }}>
                <span className="gr-hd" style={{ background: GRUPO_COLOR[f] }}>{GRUPO_ICON[f]} {FOCO_LABEL[f]}</span>
                <span className="small">{FOCO_DESC[f]}</span>
              </button>
            ))}
          </div>
          {edit !== '*' && p && (
            <>
              <div className="label">O un atributo puntual (sube más rápido)</div>
              <div className="attrpick">
                {ENTRENABLES.map((k) => {
                  const key = (W[p.pos][k] ?? 0) >= 0.1;
                  return (
                    <button key={k} className="ap" aria-pressed={actual === k} onClick={() => elegir(k)}>
                      <span className="ap-l" style={{ fontWeight: key ? 800 : 500 }}>{ATTR_LABEL[k]}</span>
                      <span className="ap-bar"><i style={{ width: `${p.attrs[k]}%`, background: GRUPO_COLOR[grupoDe(k)] }} /></span>
                      <span className="ap-v num">{p.attrs[k]}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}

function planDesc(plan: PlanEntreno) {
  if (plan in FOCO_LABEL) return FOCO_DESC[plan as FocoEntreno];
  return `Solo ${ATTR_LABEL[plan as AttrKey].toLowerCase()}: ${ATTR_DESC[plan as AttrKey].charAt(0).toLowerCase()}${ATTR_DESC[plan as AttrKey].slice(1)} Sube más rápido que entrenando un grupo.`;
}

export function SquadScreen() {
  const { g, refresh, sub } = useGame();
  useEffect(() => {
    if (sub === 'entreno' || sub === 'lesionados') document.getElementById(sub)?.scrollIntoView({ block: 'start' });
  }, [sub]);
  const [sort, setSort] = useState<'pos' | 'ovr' | 'edad'>('pos');
  const [open, setOpen] = useState<string | null>(null);
  const club = g.clubs[g.userClubId];
  const xvIdx = new Map(club.xv.map((id, i) => [id, i]));
  const all = club.plantel.map((id) => g.players[id]);
  const injured = all.filter((p) => p.lesion > 0).length;
  const sorter = (a: Player, b: Player) =>
    sort === 'ovr' ? overall(b) - overall(a) : sort === 'edad' ? a.edad - b.edad : POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || (a.dorsal || 99) - (b.dorsal || 99);
  const groups = sort === 'pos'
    ? UNITS.map((u) => ({ name: u.name, list: all.filter((p) => u.pos.includes(p.pos)).sort(sorter) }))
    : [{ name: sort === 'ovr' ? 'Por media' : 'Por edad', list: [...all].sort(sorter) }];

  return (
    <>
      <div className="row">
        <h2 style={{ flex: 1 }}>Plantel</h2>
        <span className="small muted">
          {club.plantel.length} jugadores{injured ? ` · ${injured} lesionado${injured > 1 ? 's' : ''}` : ''}
        </span>
      </div>
      {injured > 0 && <Lesionados onOpen={setOpen} />}
      <div className="row small">
        <span className="muted">Ordenar:</span>
        {(['pos', 'ovr', 'edad'] as const).map((s) => (
          <button key={s} className="chip" aria-pressed={sort === s} onClick={() => setSort(s)}>
            {s === 'pos' ? 'Por línea' : s === 'ovr' ? 'Media' : 'Edad'}
          </button>
        ))}
      </div>
      <section className="card" style={{ padding: '4px 10px 8px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="sq">
            <thead>
              <tr>
                <th title="Número de camiseta">Nº</th>
                <th className="l">Jugador</th>
                <th>Nivel</th>
                <th title="Estado de forma (energía)">EF</th>
                <th title="Actitud">AC</th>
                <th title="Media">ME</th>
                <th title="Entrenamiento">Ent.</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((gr) => [
                <tr key={gr.name} className="grp">
                  <td colSpan={7}>{gr.name}</td>
                </tr>,
                ...gr.list.map((p) => {
                  const o = overall(p);
                  const shirt = xvIdx.get(p.id);
                  const d = o - (p.ovrInicio ?? o);
                  return (
                    <tr key={p.id} className="pl" onClick={() => setOpen(p.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(p.id)}>
                      <td>
                        <span className={`dor num ${shirt !== undefined ? 'tit' : ''}`} title={shirt !== undefined ? `Titular con la ${shirt + 1}` : 'Suplente'}>
                          {p.dorsal || '–'}
                        </span>
                      </td>
                      <td className="nm">
                        <b>
                          {p.apellido}
                          {p.lesion > 0 && <span style={{ color: 'var(--loss)' }}> ✚{p.lesion}</span>}
                          {d !== 0 && <span style={{ color: d > 0 ? 'var(--win)' : 'var(--loss)', fontSize: '0.75rem' }}> {d > 0 ? `▲${d}` : `▼${-d}`}</span>}
                        </b>
                        <small>
                          {POS_LABEL[p.pos]}
                          {p.pos2.length ? ` / ${p.pos2.map((x) => POS_LABEL[x]).join(' / ')}` : ''} · {p.edad}
                          {p.contrato <= 1 && <span style={{ color: 'var(--loss)', fontWeight: 700 }}> · último año</span>}
                          {p.personalidad && <> {PERSONALIDAD[p.personalidad].icono}</>}
                        </small>
                      </td>
                      <td>
                        <Stars n={toStars(o)} />
                      </td>
                      <td>
                        <span className="cell-num num" style={{ color: p.energia < 60 ? 'var(--loss)' : p.energia < 80 ? 'var(--draw)' : 'var(--win)' }}>
                          {p.energia}
                        </span>
                      </td>
                      <td>
                        <span className="cell-num num" style={{ color: p.attrs.actitud >= 75 ? 'var(--win)' : p.attrs.actitud < 55 ? 'var(--loss)' : 'var(--draw)' }}>
                          {p.attrs.actitud}
                        </span>
                      </td>
                      <td>
                        <span className="cell-num num" style={{ background: ovrColor(o), color: '#fff' }}>
                          {o}
                        </span>
                      </td>
                      <td>
                        <span className={`tag ${p.entreno ? 'on' : ''}`}>{planTag(p.entreno ?? club.entrenamiento.foco)}</span>
                      </td>
                    </tr>
                  );
                }),
              ])}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          Nº en verde: titular. EF: estado de forma. ME: media. Ent.: qué entrena (resaltado si tiene entrenamiento propio).
        </p>
      </section>
      <TrainingCard onChange={refresh} />
      {open && <PlayerSheet g={g} p={g.players[open]} onClose={() => setOpen(null)} onTrain={refresh} />}
    </>
  );
}

function TrainingCard({ onChange }: { onChange: () => void }) {
  const { g } = useGame();
  const club = g.clubs[g.userClubId];
  const t = club.entrenamiento;
  const set = (patch: Partial<typeof t>) => {
    club.entrenamiento = { ...t, ...patch };
    onChange();
  };
  const mejoras = g.ultimasMejoras ?? [];
  const byPlayer = new Map<string, string[]>();
  const porAttr = new Map<string, number>();
  for (const m of mejoras) {
    if (!g.players[m.playerId] || g.players[m.playerId].clubId !== club.id) continue;
    byPlayer.set(m.playerId, [...(byPlayer.get(m.playerId) ?? []), ATTR_LABEL[m.attr]]);
    porAttr.set(ATTR_LABEL[m.attr], (porAttr.get(ATTR_LABEL[m.attr]) ?? 0) + 1);
  }
  const ef = INTENSIDAD_EFECTO[t.intensidad];
  return (
    <section className="card stack" id="entreno" style={{ scrollMarginTop: 80 }}>
      <h3>Entrenamiento del equipo</h3>
      <p className="small" style={{ margin: 0 }}>
        Cada jugador entrena lo que vos elijas: un grupo de atributos o uno puntual. Las instalaciones y el ayudante hacen rendir más el entrenamiento de todos.
      </p>
      <div className="grid3 int-ef">
        <div><span className="label">Cancha de entrenamiento</span><b>Nivel {club.inst?.campo ?? 0}</b><span className="small">+{8 * (club.inst?.campo ?? 0)}% a todo</span></div>
        <div><span className="label">Gimnasio</span><b>Nivel {club.inst?.gimnasio ?? 0}</b><span className="small">{club.inst?.gimnasio ? 'Resistencia, dureza y velocidad extra' : 'Sin gimnasio'}</span></div>
        <div><span className="label">Ayudante</span><b>{club.staff?.ayudante ? `+${Math.round(5 * club.staff.ayudante)}%` : 'No tenés'}</b><span className="small">a todos</span></div>
      </div>
      <div className="label">Qué entrena cada uno</div>
      <PlanBoard club={club} onChange={onChange} />
      <div className="label">Intensidad</div>
      <Seg<Intensidad>
        label="Intensidad"
        value={t.intensidad}
        onChange={(v) => set({ intensidad: v })}
        options={(Object.keys(INTENSIDAD_LABEL) as Intensidad[]).map((v) => ({ v, l: INTENSIDAD_LABEL[v] }))}
      />
      <div className="grid3 int-ef">
        <div><span className="label">Mejora</span><b>{ef.mejora}</b></div>
        <div><span className="label">Energía</span><b>{ef.energia}</b></div>
        <div><span className="label">Riesgo de lesión</span><b>{ef.lesion}</b></div>
      </div>
      <p className="small muted">{INTENSIDAD_DESC[t.intensidad]} Los jóvenes mejoran más rápido, los que tienen mucha actitud también, y nadie pasa de su potencial.</p>
      {byPlayer.size > 0 && (
        <div className="small">
          <b>La última semana subió:</b> {[...porAttr.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} +${n}`).join(' · ')}
          <br />
          <b>Quiénes mejoraron:</b>{' '}
          {[...byPlayer.entries()]
            .slice(0, 12)
            .map(([id, attrs]) => `${g.players[id].apellido} (${attrs.join(', ')})`)
            .join(', ')}
          {byPlayer.size > 12 ? ` y ${byPlayer.size - 12} más.` : '.'}
        </div>
      )}
    </section>
  );
}

export function moralText(m: number) {
  return m >= 80 ? 'Excelente' : m >= 65 ? 'Buena' : m >= 50 ? 'Normal' : m >= 35 ? 'Baja' : 'Muy baja';
}

/** El potencial se ve como estrellas, con un poco de incertidumbre. */
export function potentialStars(p: Player) {
  return toStars(p.potencial);
}

export function PlayerSheet({ g, p, onClose, action, onTrain }: { g: GameState; p: Player; onClose: () => void; action?: ReactNode; onTrain?: () => void }) {
  const o = overall(p);
  const d = o - (p.ovrInicio ?? o);
  const club = p.clubId ? g.clubs[p.clubId] : null;
  const mine = p.clubId === g.userClubId;
  const keyAttrs = new Set(ATTR_KEYS.filter((k) => (W[p.pos][k] ?? 0) >= 0.1));
  return (
    <Sheet
      title={
        <span className="row" style={{ gap: 8 }}>
          {p.dorsal ? <span className="dor num tit">{p.dorsal}</span> : null}
          {p.nombre} {p.apellido}
        </span>
      }
      onClose={onClose}
    >
      <div className="row">
        <div className="grow">
          <div>
            <b>{posText(p)}</b>
          </div>
          <div className="small muted">
            {p.edad} años · {club ? club.nombre : 'Sin club'} · Valor {formatMoney(marketValue(p))}
          </div>
          {p.personalidad && (
            <div className="small" style={{ marginTop: 4 }}>
              <PersBadge p={p} /> {PERSONALIDAD[p.personalidad].texto}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="label">Media</div>
          <Ovr v={o} />
        </div>
      </div>
      <div className="grid2">
        <div className="card" style={{ padding: 10 }}>
          <div className="label">Nivel</div>
          <Stars n={toStars(o)} size={18} />
          {d !== 0 && (
            <div className="small" style={{ color: d > 0 ? 'var(--win)' : 'var(--loss)', fontWeight: 700 }}>
              {d > 0 ? `▲ ${d}` : `▼ ${-d}`} en la temporada
            </div>
          )}
        </div>
        <div className="card" style={{ padding: 10 }}>
          <div className="label">Potencial</div>
          <Stars n={potentialStars(p)} size={18} />
          <div className="small muted">{p.potencial > o + 3 ? 'Todavía puede crecer' : 'Llegó a su techo'}</div>
        </div>
      </div>
      {p.lesion > 0 && (
        <div className="notice">
          🩹 Lesionado: <b>{p.lesionTipo ?? 'lesión'}</b>. Le {p.lesion === 1 ? 'falta 1 fecha' : `faltan ${p.lesion} fechas`} para volver.
        </div>
      )}
      {p.prestamo && <div className="small muted">A préstamo: es de {g.clubs[p.prestamo.clubId]?.nombre} y {hastaTexto(g, p)}.</div>}
      <Evolucion g={g} p={p} />
      {p.clubId && <ContractBox g={g} p={p} mine={mine} onChange={onTrain} />}
      {mine && onTrain && <CharlaBox g={g} p={p} onChange={onTrain} />}
      {action}
      <div className="card">
        <div className="attr2 hd">
          <span>Atributo</span>
          <span />
          <span style={{ textAlign: 'right' }}>Previo</span>
          <span style={{ textAlign: 'right' }}>Hoy</span>
        </div>
        <div className={`attr2 ${''}`}>
          <span>Estado de forma</span>
          <Stars n={p.energia / 20} />
          <span className="prev num" />
          <span className="now num">{p.energia}</span>
        </div>
        <div className="attr2">
          <span>Moral</span>
          <Stars n={p.moral / 20} />
          <span className="prev num" />
          <span className="now small">{moralText(p.moral)}</span>
        </div>
        {ATTR_GROUPS.map((gr) => (
          <div key={gr.k}>
            <div className="attrgroup">{gr.l}</div>
            {gr.attrs.map((k) => {
              const prev = p.attrsInicio?.[k] ?? p.attrs[k];
              const up = p.attrs[k] - prev;
              return (
                <div key={k} className={`attr2 ${keyAttrs.has(k) ? 'key' : ''}`} title={ATTR_DESC[k]}>
                  <span>{ATTR_LABEL[k]}</span>
                  <Stars n={toStars(p.attrs[k])} />
                  <span className="prev num">{up !== 0 ? prev : ''}</span>
                  <span className="now num" style={{ color: up > 0 ? 'var(--win)' : up < 0 ? 'var(--loss)' : undefined }}>
                    {p.attrs[k]}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
        <p className="small muted" style={{ marginTop: 6 }}>
          En negrita, los atributos que más pesan en su puesto. "Previo" es cómo empezó la temporada. La actitud es las ganas que le pone: con buena actitud rinde más en el último cuarto, se hace echar menos y aprovecha más el entrenamiento.
          {p.lesion > 0 ? ` Lesionado: ${p.lesion} semana${p.lesion > 1 ? 's' : ''}.` : ''}
        </p>
      </div>
      {mine && onTrain && (
        <div className="card stack">
          <h3>Entrenamiento individual</h3>
          <PlanSelect
            label="Entrenamiento individual"
            value={p.entreno ?? g.clubs[g.userClubId].entrenamiento.foco}
            onChange={(v) => {
              p.entreno = v === g.clubs[g.userClubId].entrenamiento.foco ? null : v;
              onTrain();
            }}
          />
          <p className="small muted">{planDesc(p.entreno ?? g.clubs[g.userClubId].entrenamiento.foco)}</p>
        </div>
      )}
      <div className="card">
        <h3>Estadísticas</h3>
        <div className="grid2 small">
          <div>
            <div className="label">Esta temporada</div>
            {p.temporada.partidos} partidos · {p.temporada.tries} tries · {p.temporada.puntos} pts
          </div>
          <div>
            <div className="label">Carrera</div>
            {p.carrera.partidos} partidos · {p.carrera.tries} tries · {p.carrera.puntos} pts
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function ContractBox({ g, p, mine, onChange }: { g: GameState; p: Player; mine: boolean; onChange?: () => void }) {
  const { toast } = useGame();
  const [open, setOpen] = useState(false);
  const pide = renewalDemand(p, g);
  const maxAnios = p.edad >= 32 ? 1 : 3;
  return (
    <div className="card stack" style={{ padding: 10 }}>
      <div className="row">
        <div className="grow">
          <div className="label">Contrato</div>
          <div>
            <b>{formatMoney(p.sueldo)}</b> por fecha · {p.contrato <= 1 ? <b style={{ color: 'var(--loss)' }}>último año</b> : `${p.contrato} temporadas más`}
          </div>
        </div>
        {mine && !open && (
          <button className="btn small" onClick={() => setOpen(true)}>
            Renovar
          </button>
        )}
      </div>
      {mine && p.contrato <= 1 && !open && <div className="small muted">Si no le renovás, al terminar la temporada se va libre.</div>}
      {mine && open && (
        <>
          <div className="small">
            Para renovar pide <b>{formatMoney(pide)} por fecha</b>
            {pide > p.sueldo ? ` (hoy cobra ${formatMoney(p.sueldo)})` : ''}.{p.moral < 60 ? ' Como no está muy contento, pide más.' : ''}
          </div>
          <div className="grid3">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className="btn small"
                disabled={n > maxAnios}
                onClick={() => {
                  try {
                    toast(renew(g, p.id, n));
                    setOpen(false);
                    onChange?.();
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                +{n} {n === 1 ? 'temporada' : 'temporadas'}
              </button>
            ))}
          </div>
          <button className="btn small" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        </>
      )}
    </div>
  );
}

/** Los lesionados del plantel, con su lesión y cuánto les falta. */
const club0 = (g: GameState) => g.clubs[g.userClubId];

function Lesionados({ onOpen }: { onOpen: (id: string) => void }) {
  const { g, refresh, toast } = useGame();
  const apurados = club0(g).plantel.map((id) => g.players[id]).filter((p) => p.recaida);
  const club = g.clubs[g.userClubId];
  const list = club.plantel.map((id) => g.players[id]).filter((p) => p.lesion > 0).sort((a, b) => b.lesion - a.lesion);
  return (
    <section className="card" id="lesionados" style={{ scrollMarginTop: 80 }}>
      <h3>🩹 Lesionados</h3>
      <div className="list">
        {list.map((p) => (
          <div key={p.id} className="lesion-item">
            <button className="li" onClick={() => onOpen(p.id)}>
              <Ovr v={overall(p)} />
              <div className="grow">
                <div className="name">
                  {p.nombre} {p.apellido}
                </div>
                <div className="small muted">
                  {posText(p)} · {p.lesionTipo ?? 'Lesión'}
                </div>
              </div>
              <b className="num" style={{ color: 'var(--loss)' }}>
                {p.lesion} {p.lesion === 1 ? 'fecha' : 'fechas'}
              </b>
            </button>
            <div className="kine">
              <span>🩺 {parteKine(p, club)}</span>
              <button
                className="btn small danger"
                onClick={() => {
                  toast(apurarVuelta(g, p.id));
                  refresh();
                }}
              >
                Apurar la vuelta
              </button>
            </div>
          </div>
        ))}
      </div>
      {apurados.length > 0 && (
        <p className="small" style={{ margin: '6px 0 0' }}>
          ⚠ Volvieron apurados (pueden recaer): {apurados.map((p) => `${p.apellido} (${Math.round(p.recaida!.riesgo * 100)}%)`).join(', ')}
        </p>
      )}
      {!(club.staff?.medico) && <p className="small muted" style={{ margin: '6px 0 0' }}>Con un médico y un kinesiólogo (en Empleados) se recuperan más rápido.</p>}
    </section>
  );
}

/** Cómo fue mejorando: temporada por temporada y lo que subió en esta. */
function Evolucion({ g, p }: { g: GameState; p: Player }) {
  const hist = [...(p.historia ?? []), { temporada: g.temporada, ovr: overall(p), partidos: p.temporada.partidos, tries: p.temporada.tries, clubId: p.clubId ?? '' }];
  const ini = p.attrsInicio;
  const subas = ini ? ATTR_KEYS.map((k) => ({ k, d: p.attrs[k] - (ini[k] ?? p.attrs[k]) })).filter((x) => x.d !== 0) : [];
  if (hist.length < 2 && !subas.length) return null;
  const max = Math.max(...hist.map((h) => h.ovr), 60);
  const min = Math.min(...hist.map((h) => h.ovr), 40);
  return (
    <div className="card stack">
      <div className="label">Cómo viene mejorando</div>
      {hist.length >= 2 && (
        <div className="evo">
          {hist.map((h) => (
            <div key={h.temporada} className="evo-col">
              <span className="num small">{h.ovr}</span>
              <i style={{ height: `${8 + ((h.ovr - min) / Math.max(1, max - min)) * 52}px`, background: ovrColor(h.ovr) }} />
              <span className="small muted">{String(h.temporada).slice(2)}</span>
            </div>
          ))}
        </div>
      )}
      {subas.length > 0 && (
        <div className="small">
          Esta temporada:{' '}
          {subas.map((x, i) => (
            <span key={x.k} style={{ color: x.d > 0 ? 'var(--win)' : 'var(--loss)', fontWeight: 700 }}>
              {i ? ', ' : ''}
              {ATTR_LABEL[x.k]} {x.d > 0 ? `+${x.d}` : x.d}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Charla individual en la oficina del DT. */
function CharlaBox({ g, p, onChange }: { g: GameState; p: Player; onChange: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const ok = puedeCharlar(g, p);
  const ops: { t: TipoCharla; l: string; d: string }[] = [
    { t: 'felicitar', l: '👏 Felicitarlo', d: 'Sube la moral, más si es titular.' },
    { t: 'exigir', l: '😤 Exigirle más', d: 'Si tiene buena actitud, responde. Si no, se enoja.' },
    { t: 'minutos', l: '🤝 Prometerle minutos', d: 'Se pone contento, pero tiene que jugar en 3 fechas.' },
  ];
  return (
    <div className="card stack charla">
      <div className="label">🗣 Charla en tu oficina</div>
      {msg ? (
        <p style={{ margin: 0, fontWeight: 600 }}>{msg}</p>
      ) : ok ? (
        <div className="charla-ops">
          {ops.map((o) => (
            <button
              key={o.t}
              className="btn small"
              onClick={() => {
                setMsg(charlar(g, p.id, o.t));
                onChange();
              }}
            >
              {o.l}
              <small>{o.d}</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>
          Ya hablaste con él hace poco. Podés volver a llamarlo dentro de {CHARLA_CADA - (g.round - (p.ultimaCharla ?? 0))} {CHARLA_CADA - (g.round - (p.ultimaCharla ?? 0)) === 1 ? 'fecha' : 'fechas'}.
        </p>
      )}
    </div>
  );
}
