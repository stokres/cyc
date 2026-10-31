# Camiones y Caravanas

Juego web (Vite + TypeScript + Canvas 2D) para móvil en horizontal.

- Antes de cualquier trabajo visual, lee `docs/ESTILO.md`; para controles o minijuegos, `docs/JUGABILIDAD.md`.
- Publicación: un único servicio de Railway (`npm run build`, `npm start`; pasos en `README.md`). URLs limpias en `scripts/rutas.mjs`; para elegir juego o modo el cliente lee `parametros()` de `src/core/direccion.ts` (la query más el alias de la ruta, p. ej. `/pang` = `?pangcompleto`), no `location.search`. La web está cerrada con una clave del grupo (`CYC_CLAVE`, `scripts/pase.mjs`; página de entrada `entrar.html`; sin la variable no hay puerta, y en `npm run dev` nunca). La cuenta (nombre + código) es de toda la web y guarda la partida de cada juego (`src/cuenta/`, «Cuentas» en `docs/POKEUSERA.md`). La portada (`portada.html`) es solo DOM y CSS y no importa ningún juego (solo `src/cuenta/`).
- Las fotos de los amigos son solo referencia: no las subas al repositorio.
- Todo el texto está en `src/textos/*.md` (formato al principio de `capitulo1.md`). Nunca pongas frases en el código: añade una clave al archivo de textos. El texto del capítulo 1 es provisional hasta que llegue el guion real.
- Para escribir a los personajes, lee `docs/PERSONAJES.md`.
- Pruebas mínimas y solo de lo que cambias (decidido por Jesús el 11 de octubre de 2026): ahorran tiempo y tokens, y Jesús prueba a mano.
  - Antes de hacer commit: `npm run typecheck`.
  - Si tocas una escena o un minijuego, prueba solo esa escena o ese minijuego, cargándolo directamente (por ejemplo, desde el menú de minijuegos), una vez o muy pocas. Nada de repetirlo decenas de veces ni de lanzar simulaciones (`scripts/*-sim.mjs`) salvo que estés ajustando la dificultad.
  - La partida completa (`node scripts/playthrough.mjs` contra `npm run dev`) solo para cambios que afecten de verdad a todo el juego, y aun así una vez. Si cambias el puzle, actualiza también ese script.
  - Al entregar, di en una línea qué has probado y qué conviene que Jesús pruebe a mano.
- Rendimiento desde la implementación (`docs/ESTILO.md`, T5 y T6): si tocas el dibujo, una escena o un minijuego, pasa `node scripts/rendimiento.mjs <escena>` sin fallos, solo con las escenas que hayas tocado, y añade ahí cada escena o minijuego nuevo. Nada de SVG dibujado en canvas por fotograma, personajes siempre como imágenes y bucles con tope de 60 fps. PokéUsera usa `node scripts/rendimiento-pokeusera.mjs <pantalla>` (ver `docs/POKEUSERA.md`, «Rendimiento»).
