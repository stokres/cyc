# Camiones y Caravanas

Aventura gráfica con minijuegos sobre las quedadas de los jueves en Usera. Pensada para jugarse en el móvil, en horizontal, desde el navegador.

## Probarlo

```sh
npm install
npm run dev        # abre la URL que muestra (también desde el móvil en la misma wifi)
npm run build      # typecheck + build en dist/
```

La luz con relieve (WebGL2) está aplazada: para verla, añade `?relieve` a la dirección.

## Publicación en Railway (dominio propio)

Todos los juegos salen de **un único servicio de Railway** (Node), con URLs limpias: `/` (portada), `/capitulo1`, `/pokeusera`, `/pang`, `/fly` y `/trazo`. Siguen funcionando, sin anunciarse, `/aventura`, `/capitulo2`, `/sol`, `/kart` y `/unamas`; una ruta con barra final (`/pang/`) redirige a la que no la lleva. La sala online (`/sala`) y las estadísticas (`/api`) van en el mismo servicio. El servidor es `scripts/servir-pokeusera.mjs` y la lista de rutas, `scripts/rutas.mjs`. `/fly` y `/trazo` son dos juegos que viven en `juegos/` (ver `juegos/README.md`). `npm run build` los construye después del de cyc con `scripts/construir-juegos.mjs`: Fly (que conserva su propio `package.json` y su Vite) se instala con `npm ci` si hace falta y se construye con base absoluta `/fly/` en `dist/fly/` (por eso sus `.glb`, `.json` y audio cargan bien bajo la ruta); Trazo se copia tal cual a `dist/trazo/`. Los archivos con hash de `/fly/assets/` llevan la misma caché larga que `/assets/`. Para probarlos en local hace falta `npm run build && npm start` (`npm run dev` no sirve esas dos rutas). GitHub Pages ya no publica nada: la dirección es https://camionesycaravanas.es. En el móvil, abre un juego y usa **Añadir a pantalla de inicio** para que se abra a pantalla completa.

Pasos manuales, una sola vez:

1. **Reutilizar el servicio de Railway que ya publica PokéUsera** (así se conservan el volumen y las estadísticas) y, en **Settings → Source**, cambiar la rama a `main`.
2. **Build Command:** `npm run build`. **Start Command:** `npm start`. Node 20 o superior (`engines` en `package.json`).
3. **Volumen** montado en `/data` y la variable `POKEUSERA_DATOS=/data` (ya están puestos si se reutiliza el servicio; sin ellos cada despliegue borra las estadísticas y las cuentas, que ahora guardan también las partidas de todos los juegos: la cuenta es de toda la web, se crea desde la chapa de la portada; ver `docs/POKEUSERA.md`, «Cuentas»). `POKEUSERA_CLAVE` protege la sala online (con la puerta del paso siguiente puesta ya no hace falta, porque a la sala solo llega quien tiene el pase, pero sigue funcionando).
3b. **Clave del grupo (puerta de la web):** variable `CYC_CLAVE` con la palabra que Jesús pasa a la peña (`scripts/pase.mjs`). Con ella, quien no la ha escrito ve una página de entrada (`/entrar.html`, respuesta 401) en vez de cualquier página, y `/api` y `/sala` responden 401; al escribirla bien se guarda una cookie `cyc_pase` (400 días) y ya no se vuelve a pedir. La clave no distingue mayúsculas ni espacios sobrantes; 10 fallos desde una IP bloquean 10 minutos. **Cambiar `CYC_CLAVE` en Railway echa a todos** (la cookie es un resumen de la clave): hay que pasar la nueva. Sin la variable (o vacía) no hay puerta y el servidor lo avisa en el registro. Quedan libres `/assets`, `/robots.txt`, los iconos y los manifiestos. Todas las respuestas llevan `X-Robots-Tag: noindex, nofollow, noarchive` y hay un `robots.txt` que lo prohíbe todo, para que ningún buscador la indexe. Si se configura un *healthcheck* de Railway, que apunte a `/robots.txt` (`/` responde 401 sin cookie). `npm run dev` no tiene puerta.
4. **Dominio propio:** en **Settings → Networking → Custom Domain**, añadir `www.tudominio.es` (y `tudominio.es` si se usa la vía B). Railway da para cada uno un destino CNAME (`algo.up.railway.app`) y un registro TXT de verificación; hacen falta los dos. Registros en cdmon (Dominios → Gestión DNS):

   | Nombre | Tipo | Valor |
   | --- | --- | --- |
   | `www` | CNAME | el destino que da Railway para `www` (`algo.up.railway.app`) |
   | `_railway-verify.www` | TXT | el valor que da Railway (copiar el nombre exacto que muestre) |

   La raíz (`tudominio.es`) no admite CNAME, y Railway no da una IP fija para un registro A. Hay dos vías:
   - **A, todo en cdmon:** si al crear un registro cdmon ofrece el tipo ALIAS o ANAME, raíz `@` → ALIAS al destino de Railway, más su TXT `_railway-verify`. Si no lo ofrece (lo normal), usar «Crear redirección web» de cdmon para que `tudominio.es` lleve a `https://www.tudominio.es`. Inconveniente: si alguien escribe `https://tudominio.es` puede ver un aviso de certificado, porque la redirección de cdmon no tiene certificado propio.
   - **B, DNS en Cloudflare (gratis):** el dominio sigue comprado en cdmon, pero en cdmon se cambian los servidores de nombres por los dos que da Cloudflare. En Cloudflare: raíz `@` CNAME al destino de Railway (Cloudflare lo «aplana»), los TXT de Railway, `www` CNAME a `@`, SSL/TLS en «Full» y una redirección 301 de `www` a la raíz. Es la vía que Railway recomienda para la raíz, y funciona con https en las dos direcciones.

   El certificado https lo pone Railway solo cuando ve los registros (de minutos a unas horas).
5. Comprobar: `/`, `/capitulo1`, `/pokeusera` y `/pang` abren cada juego, y `/api/estadisticas` responde.

PokéUsera se puede seguir instalando como app: su manifiesto (`start_url` `./pokeusera.html`) y su service worker no cambian de sitio, así que las instalaciones que ya hay siguen funcionando. Como ahora comparten dominio, todos los juegos comparten también el `localStorage`; sus claves llevan prefijo propio (`cyc.*`, `pokeusera.*`, `pokecap.*`).

## Cambiar los textos

Todo lo que se dice en el juego está en `src/textos/`:

- `capitulo1.md`: diálogos, objetivos, pistas y nombres de las cosas.
- `interfaz.md`: menús y botones.
- `portada.md`: la portada del dominio (`portada.html`).

El formato se explica al principio de `capitulo1.md`. Basta con editar el texto y recargar; no hace falta tocar código. Si una clave falta o una línea no se entiende, sale un error en la consola y la partida automática falla.

## Comprobaciones

```sh
npm run typecheck
node scripts/playthrough.mjs http://localhost:5173/ revisiones/partida   # partida completa del piloto en viewport de móvil
node scripts/shots.mjs http://localhost:5173/ revisiones/captura.png 844x390 3
node scripts/rendimiento.mjs [escena...]                                  # (también `portada`, sin arrancar el juego) CPU, fotogramas y memoria, con la música sonando; falla con los errores de la regla T5 (docs/ESTILO.md)
node tools/personajes/lamina-crew.mjs                                     # lámina de la crew (artifact/crew-lamina.html)
node tools/personajes/frentes.mjs                                         # caras de frente de los retratos, por ánimo y boca (revisiones/frentes.png)
node tools/personajes/cerdos.mjs                                          # los cerdos de Guille (revisiones/cerdos.png)
node scripts/cerdos-sim.mjs                                               # dificultad del minijuego de los cerdos
node scripts/robot-sim.mjs                                                # dificultad del cañón contra Robi, en la historia y sin fin
node scripts/rana-sim.mjs                                                 # dificultad de la rana de Aceituna
node scripts/palabras-sim.mjs                                             # dificultad de la batalla de palabras de Pablo
node tools/escenas/exportar.mjs                                           # capas de las escenas en art/escenas/
node tools/icono.mjs                                                      # iconos de la pantalla de inicio (public/icono-*.png)
# Música de prueba (necesita: apt install fluidsynth musescore-general-soundfont-lossless; pip install numpy scipy mido).
# Desde tools/musica: python3 charanga.py && ./render.sh charanga-del-jueves   (también chotis.py y galop.py)
# python3 pistas.py charanga-del-jueves.mid   # volumen de cada instrumento por separado, para la mezcla
# Estilo aventura de LucasArts (orquesta.py: cada instrumento del banco de sonidos por separado, mezclado con reverb y panorama):
# python3 tema_principal.py  # también tema_pop.py (el mismo tema en pop-rock), barrio.py y vueltas.py; con «bucle», la versión en bucle para el juego
# python3 contra_robi.py     # minijuegos: también jaleo.py. El bar: bar_rockero.py (y su versión oída desde la puerta)
# python3 pasodoble.py       # el pasodoble del camionero del «Continuará…» (bocina, motor y frenos de camión con sinte)
# python3 bolilandia_noche.py [luz]   # el vals de caja de música de Bolilandia, a oscuras (y con la luz dada)
# Chiptune estilo VVVVVV con un sintetizador propio (sinte.py: sin MIDI ni banco de sonidos). Desde tools/musica:
# python3 todo_gas.py        # también caravana.py y paseo.py; con «bucle», la versión en bucle sin junta para el juego
# python3 paseo.py acustica  # la misma partitura con instrumentos del banco de sonidos, para comparar
# python3 mira.py todo-gas.mp3 0 40   # espectrograma y volumen en el tiempo (todo-gas.png), para revisar sin oírla; necesita matplotlib
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
| `portada.html`, `src/portada/` | Portada del dominio: cartel psicodélico de los 70 con cuatro fichas (Camiones y Caravanas con Capítulo 1 y 2, PokéUsera, Pang, Próximamente más), solo DOM y CSS |
| `scripts/servir-pokeusera.mjs`, `scripts/rutas.mjs` | Servidor de Railway y sus URLs limpias; `src/core/direccion.ts` es la mitad que lee el juego |
| `src/capitulos/` | Lógica de cada capítulo: zonas, puzles, objetivos y pistas (las historias de Pablo y Guille, en `pablo.ts` y `guille.ts`) |
| `src/juego/` | Aventura (guion, entrada táctil, cambio de personaje), reparto, textos y partida guardada |
| `src/motor/` | Escenas en capas con parallax, luz horneada, actores y la luz con relieve en WebGL2 (aplazada) |
| `src/arte/` | Personajes (con vestuario), escenas y objetos, generados como SVG |
| `src/ui/` | Interfaz: selector, bolsa, diálogos, móvil y minijuegos (la rana, palabras, el robot y los cerdos), con su versión sin fin para el menú de minijuegos |
| `src/core/` | Gestos, sonido y utilidades |
| `juegos/` | Juegos con su propio código, servidos en `/fly` y `/trazo`; `juegos/README.md` dice de dónde vino cada uno y `scripts/construir-juegos.mjs` los construye |
| `tools/` | Láminas de personajes, exportación de capas e iconos |
| `public/` | Manifiesto e iconos para instalarlo en el móvil |
