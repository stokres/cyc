# Camiones y Caravanas

Aventura gráfica con minijuegos sobre las quedadas de los jueves en Usera. Pensada para jugarse en el móvil, en horizontal, desde el navegador.

## Probarlo

```sh
npm install
npm run dev        # abre la URL que muestra (también desde el móvil en la misma wifi)
npm run build      # typecheck + build en dist/
npm run artifact   # build en un solo HTML: artifact/camiones-y-caravanas.html
```

La luz con relieve (WebGL2) está aplazada: para verla, añade `?relieve` a la dirección.

## Publicarlo en GitHub Pages

`.github/workflows/pages.yml` construye el juego y lo publica cada vez que se sube algo a la rama principal del repositorio (o a mano, desde la pestaña **Actions** → *Publicar en GitHub Pages* → *Run workflow*).

1. Una sola vez: en el repositorio, **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Sube un cambio a la rama principal (o lanza el workflow a mano). Al terminar, la dirección sale en **Settings → Pages** y en el resumen del workflow: `https://<usuario>.github.io/<repositorio>/`.
3. En el móvil, ábrela y usa **Añadir a pantalla de inicio**: así se abre a pantalla completa y en horizontal, con el icono de Fran.

GitHub Pages en un repositorio privado necesita una cuenta de pago (GitHub Pro), y la página queda pública igualmente: cualquiera con la dirección puede jugar. Sin cuenta de pago hay que hacer público el repositorio.

## Cambiar los textos

Todo lo que se dice en el juego está en `src/textos/`:

- `capitulo1.md`: diálogos, objetivos, pistas y nombres de las cosas.
- `interfaz.md`: menús y botones.

El formato se explica al principio de `capitulo1.md`. Basta con editar el texto y recargar; no hace falta tocar código. Si una clave falta o una línea no se entiende, sale un error en la consola y la partida automática falla.

## Comprobaciones

```sh
npm run typecheck
node scripts/playthrough.mjs http://localhost:5173/ revisiones/partida   # partida completa del piloto en viewport de móvil
node scripts/shots.mjs http://localhost:5173/ revisiones/captura.png 844x390 3
node tools/personajes/lamina-crew.mjs                                     # lámina de la crew (artifact/crew-lamina.html)
node tools/personajes/frentes.mjs                                         # caras de frente de los retratos, por ánimo y boca (revisiones/frentes.png)
node tools/escenas/exportar.mjs                                           # capas de las escenas en art/escenas/
node tools/icono.mjs                                                      # iconos de la pantalla de inicio (public/icono-*.png)
```

`revisiones/` no se sube al repositorio.

## Estructura

| Ruta | Qué hay |
|---|---|
| `docs/ESTILO.md` | Guía de estilo para móvil, adaptada del kit de estilo |
| `docs/JUGABILIDAD.md` | Controles táctiles, selector de personaje y minijuegos |
| `docs/PERSONAJES.md` | Cómo son y cómo hablan los cuatro y Aceituna |
| `docs/ESCENA-1.md` | Encargo del capítulo 1: piso, calle, cámara y puzle inicial |
| `src/textos/` | Todos los textos del juego, editables |
| `src/capitulos/` | Lógica de cada capítulo: zonas, puzles, objetivos y pistas |
| `src/juego/` | Aventura (guion, entrada táctil, cambio de personaje), reparto, textos y partida guardada |
| `src/motor/` | Escenas en capas con parallax, luz horneada, actores y la luz con relieve en WebGL2 (aplazada) |
| `src/arte/` | Personajes (con vestuario), escenas y objetos, generados como SVG |
| `src/ui/` | Interfaz: selector, bolsa, diálogos, móvil y minijuego del tarro |
| `src/core/` | Gestos, sonido y utilidades |
| `tools/` | Láminas de personajes, exportación de capas e iconos |
| `public/` | Manifiesto e iconos para instalarlo en el móvil |
| `.github/workflows/pages.yml` | Publicación en GitHub Pages |
