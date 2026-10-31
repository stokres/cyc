# Juegos

Juegos de Jesús que viven dentro de este repositorio, con su propio código y sin relación con `src/` (no comparten nada con Camiones y Caravanas). Desde ahora **se cambian aquí**: los repositorios de origen ya no son la fuente.

| Carpeta | Ruta en la web | Origen | Notas |
|---|---|---|---|
| `fly/` | `/fly` | repositorio `stokres/fly`, commit `92f057b` | Juego 3D con Three.js. Conserva su `package.json`, su `package-lock.json`, su `CLAUDE.md` y su `docs/`. |
| `trazo/` | `/trazo` | repositorio `stokres/trazo`, commit `db3db1d` (fork de [mariomka/trazo](https://github.com/mariomka/trazo)) | Un solo `index.html` sin dependencias, más `og.jpg`. |

De cada uno se dejaron fuera `.git`, `node_modules` y los workflows de GitHub (`.github/`), que publicaban en GitHub Pages.

## Cambios respecto a los originales

- **Fly:** en la pantalla de título y en el menú de pausa hay un botón «Volver a la web» (`/`), solo cuando se sirve construido con base `/fly/` bajo la ruta `/fly` (`src/ui/menu.ts`, texto en `src/ui/i18n.ts`).
- **Trazo:** el mismo botón en la pantalla de título, en la pausa y en el fin de partida, con la frase en los 10 idiomas; solo aparece bajo la ruta `/trazo`. Las etiquetas `og:` apuntan a camionesycaravanas.es.

## Licencia

Trazo es un fork de mariomka/trazo. La copia que había en `stokres/trazo` (commit `db3db1d`) no incluye ningún archivo de licencia y no se pudo consultar el repositorio original, así que aquí no hay `LICENSE` que conservar. Antes de dejarlo publicado de forma duradera conviene confirmar en el original qué licencia tiene y, si la tiene, copiar su `LICENSE` a `juegos/trazo/` y mantener el aviso de autoría.

## Cómo se construyen

`npm run build` en la raíz hace el build de cyc y, después, `scripts/construir-juegos.mjs`:

- **Fly:** `npm ci` en `juegos/fly` si falta `node_modules` o su `package-lock.json` es más nuevo (Railway solo ejecuta `npm ci` en la raíz), y luego el `build` de Fly (typecheck y Vite) con `--base /fly/` y salida en `dist/fly/`. La base es absoluta porque la página sale de `/fly` y con `./assets/...` el navegador pediría `/assets/...`, la carpeta de cyc.
- **Trazo:** copia `index.html` y `og.jpg` a `dist/trazo/`.

Para trabajar en uno solo: `npm --prefix juegos/fly run dev` (Fly, con su propio servidor) o abrir `juegos/trazo/index.html` en el navegador. `npm run build:juegos` reconstruye solo estos dos sobre un `dist/` ya hecho.
