# Camiones y Caravanas

Juego web (Vite + TypeScript + Canvas 2D) para móvil en horizontal.

- Antes de cualquier trabajo visual, lee `docs/ESTILO.md`; para controles o minijuegos, `docs/JUGABILIDAD.md`.
- Las fotos de los amigos son solo referencia: no las subas al repositorio.
- Todo el texto está en `src/textos/*.md` (formato al principio de `capitulo1.md`). Nunca pongas frases en el código: añade una clave al archivo de textos. El texto del capítulo 1 es provisional hasta que llegue el guion real.
- Para escribir a los personajes, lee `docs/PERSONAJES.md`.
- Antes de hacer commit: `npm run typecheck` y una partida completa con `node scripts/playthrough.mjs` contra `npm run dev`, sin errores de consola. Si cambias el puzle, actualiza también ese script.
- Rendimiento desde la implementación (`docs/ESTILO.md`, T5 y T6): si tocas el dibujo, una escena o un minijuego, pasa `node scripts/rendimiento.mjs` sin fallos y añade ahí cada escena o minijuego nuevo. Nada de SVG dibujado en canvas por fotograma, personajes siempre como imágenes y bucles con tope de 60 fps.
