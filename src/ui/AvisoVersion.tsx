import { useEffect, useState } from 'react';

/** Cartel arriba de todo cuando hay una versión nueva del juego lista para usar. */
export function AvisoVersion() {
  const [hay, setHay] = useState(false);
  useEffect(() => {
    const f = () => setHay(true);
    window.addEventListener('rm-actualizar', f);
    return () => window.removeEventListener('rm-actualizar', f);
  }, []);
  if (!hay) return null;
  return (
    <button className="aviso-version" onClick={() => location.reload()}>
      🔄 Hay una versión nueva del juego. <b>Tocá acá para actualizar</b> (tu partida queda guardada).
    </button>
  );
}
