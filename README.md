# Rugby Manager

Juego de gestión de un club de rugby (web instalable, TypeScript + React).

- `npm install` instala lo necesario.
- `npm run dev` abre el juego en modo desarrollo.
- `npm test` corre las pruebas del motor (simula 40 temporadas y verifica puntos, tries y resultados creíbles).
- `npm run build && node scripts/artifact.mjs` arma un único archivo `dist/rugby-manager.html`.

Carpetas:
- `src/engine`: reglas del juego (jugadores, partido, temporada). No depende de la pantalla.
- `src/store`: partidas guardadas en el dispositivo (IndexedDB) y copias de respaldo.
- `src/ui`: pantallas.
- `tests`: pruebas automáticas.
