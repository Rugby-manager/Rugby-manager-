import { useEffect, useRef, useState } from 'react';
import { useGame } from './App';
import { Seg } from './common';
import { agenda, hoy, type Evento, type TipoEv } from '../engine/agenda';
import { MESES, fechaCorta, fechaLarga } from '../engine/calendario';

type Filtro = 'todo' | 'club' | 'sel';
const ICONO: Record<TipoEv, string> = { pre: '🤝', seven: '7️⃣', liga: '🏉', copa: '🏆', intl: '🌎', playoff: '🔥', sel: '🌍', mundial: '🏆', fin: '🏖️' };
const ETIQUETA: Record<TipoEv, string> = { pre: 'Pretemporada', seven: 'Seven', liga: 'Liga', copa: 'Copa', intl: 'Cruz del Sur', playoff: 'Playoffs', sel: 'Selecciones', mundial: 'Mundial', fin: 'Descanso' };
const DE_SEL = (t: TipoEv) => t === 'sel' || t === 'mundial';

export function CalendarioScreen() {
  const { g } = useGame();
  const [filtro, setFiltro] = useState<Filtro>('todo');
  const hoyRef = useRef<HTMLDivElement>(null);
  const h = hoy(g);
  const todos = agenda(g);
  const lista = todos.filter((e) => filtro === 'todo' || (filtro === 'sel' ? DE_SEL(e.tipo) : !DE_SEL(e.tipo)));
  useEffect(() => {
    hoyRef.current?.scrollIntoView({ block: 'center' });
  }, [filtro]);

  const meses: { k: string; evs: Evento[] }[] = [];
  for (const e of lista) {
    const k = `${MESES[e.fecha.getMonth()]} ${e.fecha.getFullYear()}`;
    if (meses[meses.length - 1]?.k !== k) meses.push({ k, evs: [] });
    meses[meses.length - 1].evs.push(e);
  }
  const dia = (d: Date) => Math.floor(d.getTime() / 86_400_000);
  const hd = dia(h);
  let puesto = false;
  const marca = (
    <div ref={hoyRef} className="cal-hoy" key="hoy">
      <span>HOY</span>
      <b>{fechaLarga(h)}</b>
    </div>
  );

  return (
    <>
      <h2>Calendario {g.temporada}</h2>
      <section className="cal-top">
        <div className="small" style={{ opacity: 0.75 }}>Estamos en</div>
        <b>{fechaLarga(h)}</b>
        <MiniMes fecha={h} eventos={todos} />
      </section>
      <Seg<Filtro> label="Mostrar" value={filtro} onChange={setFiltro} options={[{ v: 'todo', l: 'Todo' }, { v: 'club', l: 'Mi club' }, { v: 'sel', l: 'Selecciones' }]} />
      {meses.map((m) => (
        <section key={m.k} className="card cal-mes">
          <h3>{m.k}</h3>
          {m.evs.map((e, i) => {
            const pasado = dia(e.fecha) < hd;
            const antes = !puesto && dia(e.fecha) >= hd;
            if (antes) puesto = true;
            return (
              <div key={i}>
                {antes && marca}
                <div className={`cal-ev t-${e.tipo} ${pasado ? 'pasado' : ''} ${e.mio ? 'mio' : ''} ${e.grande ? 'grande' : ''}`}>
                  <div className="cal-dia num">{fechaCorta(e.fecha)}</div>
                  <div className="cal-ico" aria-hidden="true">{ICONO[e.tipo]}</div>
                  <div className="grow">
                    <div className="cal-tit">{e.titulo}</div>
                    <div className="small muted">{ETIQUETA[e.tipo]}{e.detalle ? ` · ${e.detalle}` : ''}</div>
                  </div>
                  {e.res && <span className={`pill ${e.res.tono}`}>{e.res.texto}</span>}
                </div>
              </div>
            );
          })}
        </section>
      ))}
      {!puesto && marca}
    </>
  );
}

/** El mes de hoy en grilla, con un punto en los días que hay algo. */
function MiniMes({ fecha, eventos }: { fecha: Date; eventos: Evento[] }) {
  const y = fecha.getFullYear();
  const m = fecha.getMonth();
  const primero = new Date(y, m, 1);
  const dias = new Date(y, m + 1, 0).getDate();
  const offset = (primero.getDay() + 6) % 7; // lunes primero
  const delMes = eventos.filter((e) => e.fecha.getFullYear() === y && e.fecha.getMonth() === m);
  const celdas: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
  return (
    <div className="cal-grid" aria-label={`${MESES[m]} ${y}`}>
      <div className="cal-mesname">{MESES[m]}</div>
      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} className="cal-wd">{d}</span>)}
      {celdas.map((d, i) => {
        if (d === null) return <span key={i} />;
        const evs = delMes.filter((e) => e.fecha.getDate() === d);
        const cls = evs.some((e) => DE_SEL(e.tipo)) ? 'sel' : evs.some((e) => e.mio) ? 'mio' : evs.length ? 'otro' : '';
        return (
          <span key={i} className={`cal-d ${cls} ${d === fecha.getDate() ? 'hoy' : ''}`}>
            {d}
          </span>
        );
      })}
    </div>
  );
}
