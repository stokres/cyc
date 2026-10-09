# Camiones y Caravanas

Aventura gráfica de apuntar y tocar, con minijuegos, sobre las quedadas de los jueves de cuatro amigos (Fran, Pablo, Chuchi y Guille) en Usera. Es un juego entre amigos: se juega en el móvil, en horizontal, desde el navegador, y está publicado en https://stokres.github.io/cyc/. Vite + TypeScript + Canvas 2D, sin servidor.

El capítulo 1, «El jueves que casi no fue», tiene cuatro historias en paralelo (el piso de Fran, el teatro de Pablo, Bolilandia de Chuchi y la granja de Guille) que acaban con los cuatro llegando a la vez al Bar del Río. Las cuatro están hechas; lo que queda es pulirlas.

## Qué leer antes de tocar nada

| Si vas a… | Lee |
|---|---|
| Hacer cualquier cosa visual (arte, escenas, interfaz, rendimiento) | `docs/ESTILO.md` |
| Tocar controles, minijuegos, sonido, partida guardada o el capítulo | `docs/JUGABILIDAD.md` |
| Escribir diálogos o cambiar a un personaje | `docs/PERSONAJES.md` |
| Tocar el piso de Fran, la calle o la estructura del capítulo | `docs/ESCENA-1.md` |
| Saber dónde está cada cosa o qué comprobaciones hay | `README.md` (Estructura y Comprobaciones) |

Esos documentos son la fuente de verdad de las decisiones de diseño, con la fecha en que se tomó cada una. Si se decide algo nuevo, apúntalo en el documento que toque, con la fecha, en vez de dejarlo solo en el código o en el commit.

## Mapa rápido del código

- `src/textos/capitulo1.md` e `interfaz.md`: todo lo que se lee en el juego.
- `src/capitulos/`: la lógica de cada historia (`capitulo1.ts` con Fran, el final y las escenas; `pablo.ts`, `chuchi.ts` y `guille.ts`).
- `src/juego/`: la aventura (`aventura.ts`: escenas, toques, guion y `reparar`), el estado, la partida guardada (`partida.ts`) y la carga de textos.
- `src/motor/`: escenas por capas, actores, sprites y la luz con relieve en WebGL2 (aplazada).
- `src/ui/`: interfaz, prólogo, tutorial y los cuatro minijuegos, cada uno con su versión sin fin.
- `src/arte/`: personajes, escenas y objetos generados como SVG. `tools/`: láminas, exportación de capas, iconos y la música (`tools/musica`, en Python).
- `scripts/`: partida automática, prueba de rendimiento, capturas y los simuladores de dificultad de cada minijuego.

Los nombres del código están en español (escenas, estados, claves) y los comentarios en inglés. Los mensajes de commit van en español: un título que diga qué cambia para quien juega y, debajo, una lista con el detalle.

## Ramas y publicación

- **La rama principal del repositorio es `claude/camiones-caravanas-gameplay-b7ecna`**, no `main`. GitHub Pages solo publica lo que entra en ella (`.github/workflows/pages.yml`, que compila con `npm run build`); un push a cualquier otra rama no se ve en la web.
- Trabaja en tu propia rama y abre un PR. **No hagas push a la rama principal sin preguntar antes a Jesús** (`stokres`, el dueño): publicar es avanzar la principal hasta tu commit o fusionar el PR.
- Tras publicar, el móvil puede seguir enseñando la versión anterior unos minutos por la caché de GitHub Pages: hay que recargar, o cerrar y volver a abrir el juego si está en la pantalla de inicio. `?nueva` al final de la dirección borra la partida guardada; no lo sugieras como forma de recargar.
- `vite.config.ts` usa rutas relativas (`base: './'`) porque Pages sirve el juego desde `/cyc/`. No lo cambies.

## Reglas de trabajo

- Las fotos de los amigos son solo referencia: no las subas al repositorio.
- Todo el texto está en `src/textos/*.md` (formato al principio de `capitulo1.md`). Nunca pongas frases en el código: añade una clave al archivo de textos. El texto del capítulo 1 es provisional hasta que llegue el guion real.
- Antes de hacer commit: `npm run typecheck` y una partida completa con `node scripts/playthrough.mjs` contra `npm run dev`, sin errores de consola. Si cambias el puzle, actualiza también ese script.
- Rendimiento desde la implementación (`docs/ESTILO.md`, T5 y T6): si tocas el dibujo, una escena o un minijuego, pasa `node scripts/rendimiento.mjs` sin fallos y añade ahí cada escena o minijuego nuevo. Nada de SVG dibujado en canvas por fotograma, personajes siempre como imágenes y bucles con tope de 60 fps.
- Si cambias la dificultad de un minijuego, ajústala con su simulador (`scripts/*-sim.mjs`) y anota en `docs/JUGABILIDAD.md` qué consigue cada tipo de jugador.
- Las partidas guardadas de versiones anteriores tienen que seguir cargando. Si quitas una escena o cambias una historia, revisa `reparar` en `src/juego/aventura.ts` y `caducados` en el capítulo para que nadie se quede atascado.
- La música se genera con `tools/musica` y se graba a 24 kHz y 96 kbps, en bucle sin cortes (`docs/JUGABILIDAD.md`, Sonido y música, y `docs/ESTILO.md`, T5.11). Una pista nueva cuenta para el tope de memoria de la prueba de rendimiento.

## Decisiones de diseño que más se olvidan

El detalle y la fecha de cada una están en los documentos de arriba.

- **Cuatro historias independientes:** se cambia de personaje cuando se quiere y ningún puzle depende de otro personaje.
- **Dos gestos:** un toque hace la acción lógica (ir, usar, hablar) y mantener pulsado examina. Tocar el suelo siempre es andar, aunque esté junto a un objeto.
- **Lo que se puede coger se puede coger siempre,** aunque aún no se sepa para qué sirve.
- **El tutorial «Cómo se juega» sale una vez por partida:** al empezar la primera historia, también al empezar de nuevo o al rejugar un capítulo. Jesús lo confirmó así el 8 de octubre de 2026.
- **Minijuegos:** un solo gesto, reintento inmediato y «Saltar» tras dos rondas perdidas, para que nadie se quede sin ver la historia.
- **Calidad «media» de serie;** la luz con relieve (WebGL2) está aplazada y solo se enciende con `?relieve`.
- **Sin servidor:** la partida y el ranking de los minijuegos sin fin se guardan en cada móvil.

## Pendiente conocido

- En el backstage de Pablo, la ropa colgada del perchero se toca sin querer al andar (lo comentó Jesús el 8 de octubre de 2026; quedó para más adelante).
- El tema principal está por rehacer en pop-rock.
- Los textos del capítulo 1 esperan el guion real del grupo.
