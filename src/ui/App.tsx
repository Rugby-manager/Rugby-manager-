import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { GameState } from '../engine/types';
import { saveGame } from '../store/saves';
import { completarXV } from '../engine/players';
import { saldarGastos } from '../engine/club';
import { DIV_NAME, COMP_NAME, userFixture, LAST_ROUND } from '../engine/game';
import { ClubJersey } from './common';
import { IcoCalendario, IcoCamisetas, IcoContrato, IcoFormacion, IcoPelota, IcoTabla } from './icons';
import { StartScreen } from './Start';
import { HomeScreen } from './Home';
import { SquadScreen } from './Squad';
import { TeamScreen } from './Team';
import { FixtureScreen } from './Fixtures';
import { TableScreen } from './Table';
import { ClubScreen } from './Club';
import { EncycloScreen } from './Encyclopedia';
import { roundName } from '../engine/cup';
import { MenuSheet } from './Menu';
import { MarketScreen } from './Market';

type Tab = 'inicio' | 'plantel' | 'equipo' | 'mercado' | 'fixture' | 'tabla' | 'club' | 'enciclo';

interface Ctx {
  g: GameState;
  saveId: string;
  refresh: () => void;
  saveNow: (esperarNube?: boolean) => Promise<void>;
  toast: (m: string) => void;
  go: (t: Tab, sub?: string) => void;
  sub: string | null;
  openMenu: () => void;
}

const GameCtx = createContext<Ctx | null>(null);
export const useGame = () => useContext(GameCtx)!;

export function App() {
  const [session, setSession] = useState<{ g: GameState; id: string } | null>(null);
  if (!session) return <StartScreen onOpen={(g, id) => setSession({ g, id })} />;
  return <GameShell key={session.id} g={session.g} saveId={session.id} onExit={() => setSession(null)} />;
}

function GameShell({ g, saveId, onExit }: { g: GameState; saveId: string; onExit: () => void }) {
  const [, setTick] = useState(0);
  const [tab, setTab] = useState<Tab>('inicio');
  const [sub, setSub] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const timer = useRef<number>();
  const saveTimer = useRef<number>();

  const toast = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  const saveNow = useCallback(async (esperarNube = false) => {
    window.clearTimeout(saveTimer.current);
    await saveGame(saveId, g, { esperarNube });
  }, [g, saveId]);
  const refresh = useCallback(() => {
    const club = g.clubs[g.userClubId];
    if (club) completarXV(club, g.players);
    if (club) saldarGastos(g);
    setTick((t) => t + 1);
    // Guardado automático un instante después de cada cambio.
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void saveGame(saveId, g), 700);
  }, [g, saveId]);
  useEffect(() => {
    // Si cerrás la app o cambiás de pantalla, se guarda en el momento.
    const now = () => {
      window.clearTimeout(saveTimer.current);
      void saveGame(saveId, g);
    };
    const flush = () => {
      if (document.visibilityState === 'hidden') now();
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', now);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', now);
      window.clearTimeout(saveTimer.current);
      void saveGame(saveId, g);
    };
  }, [g, saveId]);
  useEffect(() => {
    if (!sub) window.scrollTo(0, 0);
  }, [tab, sub]);

  const club = g.clubs[g.userClubId];
  const fx = userFixture(g);
  const pre = g.pretemporada && !g.pretemporada.terminada;
  const status = pre
    ? `Temporada ${g.temporada} · Pretemporada`
    : g.phase === 'fin'
      ? `Temporada ${g.temporada} terminada`
      : g.round <= 18
        ? `Temporada ${g.temporada} · ${Number.isInteger(g.round) ? `Fecha ${g.round} de 18` : roundName(g.round)}`
        : `Temporada ${g.temporada} · ${fx ? COMP_NAME[fx.comp] : g.round === LAST_ROUND ? 'Finales' : 'Playoffs'}`;

  const go = (t: Tab, s?: string) => {
    setSub(s ?? null);
    setTab(t);
  };
  const ctx: Ctx = { g, saveId, refresh, saveNow, toast, go, sub, openMenu: () => setMenu(true) };
  const tabs: { id: Tab; l: string; i: JSX.Element }[] = [
    { id: 'inicio', l: 'Inicio', i: <IcoPelota size={26} /> },
    { id: 'plantel', l: 'Plantel', i: <IcoCamisetas size={26} /> },
    { id: 'equipo', l: 'XV', i: <IcoFormacion size={26} /> },
    { id: 'mercado', l: 'Mercado', i: <IcoContrato size={26} /> },
    { id: 'fixture', l: 'Fixture', i: <IcoCalendario size={26} /> },
    { id: 'tabla', l: 'Tabla', i: <IcoTabla size={26} /> },
  ];

  return (
    <GameCtx.Provider value={ctx}>
      <div className="app">
        <header className="topbar">
          <ClubJersey club={club} size={38} />
          <div className="club">
            <strong>{club.nombre}</strong>
            <span>
              {DIV_NAME[club.division]} · {status}
            </span>
          </div>
          <button className="iconbtn" onClick={() => setMenu(true)}>
            Menú
          </button>
        </header>
        <main className="content">
          {tab === 'inicio' && <HomeScreen />}
          {tab === 'plantel' && <SquadScreen />}
          {tab === 'equipo' && <TeamScreen />}
          {tab === 'mercado' && <MarketScreen />}
          {tab === 'fixture' && <FixtureScreen />}
          {tab === 'tabla' && <TableScreen />}
          {tab === 'club' && <ClubScreen />}
          {tab === 'enciclo' && <EncycloScreen />}
        </main>
        <nav className="tabs" aria-label="Secciones">
          <div className="tabs-inner">
            {tabs.map((t) => (
              <button key={t.id} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
                {t.i}
                {t.l}
              </button>
            ))}
          </div>
        </nav>
        {msg && (
          <div className="toast" role="status">
            {msg}
          </div>
        )}
        {menu && (
          <MenuSheet
            onClose={() => setMenu(false)}
            onExit={async () => {
              await saveNow();
              onExit();
            }}
          />
        )}
      </div>
    </GameCtx.Provider>
  );
}
