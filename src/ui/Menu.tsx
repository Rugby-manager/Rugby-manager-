import { useState } from 'react';
import { useGame } from './App';
import { makeBackup } from '../store/saves';
import { cloudStatus } from '../store/cloud';
import { CloudBadge, Sheet } from './common';

interface DownloadsApi {
  save: (r: { filename: string; data: string }) => Promise<{ status: string }>;
}
declare global {
  interface Window {
    claude?: { use: (name: string) => Promise<unknown> };
  }
}

async function getDownloads(): Promise<DownloadsApi | null> {
  try {
    if (!window.claude?.use) return null;
    return ((await window.claude.use('downloads')) as DownloadsApi | null) ?? null;
  } catch {
    return null;
  }
}

export function MenuSheet({ onClose, onExit }: { onClose: () => void; onExit: () => void }) {
  const { g, saveNow, toast } = useGame();
  const [backupText, setBackupText] = useState<string | null>(null);
  const club = g.clubs[g.userClubId];
  const filename = `rugby-manager-${club.corto.toLowerCase()}-${g.temporada}-fecha${Math.min(g.round, 20)}.json`;

  const exportBackup = async () => {
    const data = makeBackup(g);
    const dl = await getDownloads();
    if (dl) {
      try {
        await dl.save({ filename, data });
        toast('Copia de respaldo guardada');
        return;
      } catch (e) {
        if ((e as { code?: string }).code === 'declined') return;
      }
    } else {
      // Fuera de Claude (por ejemplo, abierto como archivo) se descarga normal.
      try {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } catch {
        /* mostramos el texto */
      }
    }
    setBackupText(data);
  };

  return (
    <Sheet title="Menú" onClose={onClose}>
      <div className="stack">
        <button
          className="btn block"
          onClick={async () => {
            await saveNow(true);
            toast(cloudStatus.ok ? 'Partida guardada en tu cuenta' : 'Partida guardada en este dispositivo');
            onClose();
          }}
        >
          Guardar ahora
        </button>
        <p className="small muted" style={{ margin: 0 }}>
          El juego se guarda solo después de cada fecha y de cada cambio. Queda guardado en este dispositivo y también en tu cuenta de Claude, así no se pierde aunque se cierre la app.
        </p>
        <CloudBadge />
        <button className="btn block" onClick={exportBackup}>
          Hacer copia de respaldo
        </button>
        <p className="small muted" style={{ margin: 0 }}>
          Guarda un archivo con toda la partida. Sirve por si se borran los datos del navegador o para pasarla a otro dispositivo (se carga desde la pantalla de inicio).
        </p>
        {backupText && (
          <div className="card stack">
            <div className="small">Si el archivo no se descargó, copiá este texto y guardalo en un lugar seguro:</div>
            <textarea id="backup-out" className="text" readOnly value={backupText} onFocus={(e) => e.currentTarget.select()} />
            <button
              className="btn small"
              onClick={async (e) => {
                try {
                  await navigator.clipboard.writeText(backupText);
                  toast('Texto copiado');
                } catch {
                  const ta = (e.currentTarget.parentElement as HTMLElement).querySelector('textarea');
                  ta?.select();
                }
              }}
            >
              Copiar texto
            </button>
          </div>
        )}
        <button className="btn block" onClick={onExit}>
          Salir al menú principal
        </button>
      </div>
    </Sheet>
  );
}
