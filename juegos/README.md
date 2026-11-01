# Juegos

Juegos de Jesús que viven dentro de este repositorio, con su propio código y sin relación con `src/` (no comparten nada con Camiones y Caravanas). Desde ahora **se cambian aquí**: los repositorios de origen ya no son la fuente.

| Carpeta | Ruta en la web | Origen | Notas |
|---|---|---|---|
| `fly/` | `/fly` | repositorio `stokres/fly`, commit `92f057b` | Juego 3D con Three.js. Conserva su `package.json`, su `package-lock.json`, su `CLAUDE.md` y su `docs/`. |
| `trazo/` | `/voycolgao` (y `/trazo`) | repositorio `stokres/trazo`, commit `db3db1d` (fork de [mariomka/trazo](https://github.com/mariomka/trazo)), convertido en «Voy colgao» | Un solo `index.html` sin dependencias, más `og.jpg`. La carpeta conserva el nombre `trazo/`. |

De cada uno se dejaron fuera `.git`, `node_modules` y los workflows de GitHub (`.github/`), que publicaban en GitHub Pages.

## Cambios respecto a los originales

- **Fly:** en la pantalla de título y en el menú de pausa hay un botón «Volver a la web» (`/`), solo cuando se sirve construido con base `/fly/` bajo la ruta `/fly` (`src/ui/menu.ts`, texto en `src/ui/i18n.ts`).
- **Voy colgao (antes Trazo):** ya no es la gota de tinta. Es un coche de choque de feria que cuelga del cable que dibuja el jugador y huye de una marea de coches de choque, en una feria nocturna (física, mundo y dibujo nuevos; la música techno y los efectos son WebAudio sintetizado dentro del mismo `index.html`). Solo en español (se quitó el sistema de 10 idiomas), con el rótulo del feriante que comenta la partida. Los datos guardados en el navegador usan las claves `voycolgao-…`. El botón «Volver a la web» sale en la pantalla de título, en la pausa y en el fin de partida, solo bajo `/voycolgao` o `/trazo`. Las etiquetas `og:` apuntan a camionesycaravanas.es/voycolgao y `og.jpg` sale del boceto aprobado de la pantalla de título.

## Licencia

Voy colgao es un fork de mariomka/trazo (Trazo). La copia que había en `stokres/trazo` (commit `db3db1d`) no incluye ningún archivo de licencia y no se pudo consultar el repositorio original, así que aquí no hay `LICENSE` que conservar. Antes de dejarlo publicado de forma duradera conviene confirmar en el original qué licencia tiene y, si la tiene, copiar su `LICENSE` a `juegos/trazo/` y mantener el aviso de autoría.

## Cómo se construyen

`npm run build` en la raíz hace el build de cyc y, después, `scripts/construir-juegos.mjs`:

- **Fly:** `npm ci` en `juegos/fly` si falta `node_modules` o su `package-lock.json` es más nuevo (Railway solo ejecuta `npm ci` en la raíz), y luego el `build` de Fly (typecheck y Vite) con `--base /fly/` y salida en `dist/fly/`. La base es absoluta porque la página sale de `/fly` y con `./assets/...` el navegador pediría `/assets/...`, la carpeta de cyc.
- **Voy colgao (carpeta `trazo/`):** copia `index.html` y `og.jpg` a `dist/trazo/`; `scripts/rutas.mjs` lo sirve en `/voycolgao` y en `/trazo`.

Para trabajar en uno solo: `npm --prefix juegos/fly run dev` (Fly, con su propio servidor) o abrir `juegos/trazo/index.html` en el navegador (o servir esa carpeta con cualquier servidor estático). `npm run build:juegos` reconstruye solo estos dos sobre un `dist/` ya hecho.
