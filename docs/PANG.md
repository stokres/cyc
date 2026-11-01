# Camiones y Caravanas · PANG

Juego aparte (12 de octubre de 2026, a petición de Jesús): un *Pang* de recreativa con los cuatro amigos y doce fases de Usera a Las Vegas. **Por ahora es solo el juego, sin historia** (ni intro ni conversaciones; decidido por Jesús el mismo día): título, elegir personaje y las doce fases seguidas. Nació en la rama `claude/pang-cyc-56o0iv` como página aparte (`pang.html`, con un modo online). **Ahora vive dentro del juego** (24 de octubre de 2026, a petición de Jesús): se abre desde el menú de minijuegos, en la fila «Pang», cuando se supera el Pang corto del capítulo 2, y suelto con `?pangcompleto`. **Online de 1 a 4** (1 de noviembre de 2026): el menú tiene «Jugar online», sobre las **salas comunes de la web** (`docs/SALAS.md`; la sala vieja con contraseña de la rama original ya no existe). El navegador del anfitrión lleva la partida y los invitados pintan lo que les manda; con más de un jugador entran **burbujas de refuerzo** y las partidas van a una tabla de récords aparte. Todo en `docs/PANG-ONLINE.md`. Sin sala, el juego es el de siempre con un jugador.

El Pang corto del capítulo 2 (`src/pang/capitulo.ts`, `docs/CAPITULO2.md`) usa el mismo motor y las mismas fases (Usera, el piso, Zaragoza, la granja y Las Vegas, suavizadas). **No cambia con las armas del completo**: Fran juega siempre con el arpón doble (`armaFija: 'doble'` en las opciones de la fase; también tras perder una vida), no sueltan armas las burbujas (y conserva el 12 % y el reparto de objetos de antes) y el marcador no enseña el icono del arma.

## Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `src/pang/completo.ts` | El juego entero: `jugarPangCompleto(root, { sonido, volumenes })` (título con demo, menú, elegir personaje, fases, continuar, final, récords y ajustes) y cierra con «Volver a los minijuegos». `?pangcompleto` lo abre suelto; con `&fase=N&pj=fran&bot` juega esa fase y las siguientes sin menús (para probar) |
| `src/pang/capitulo.ts`, `espuma.ts` | El Pang corto del capítulo 2 (cinco fases, solo Fran, la espuma de la caña como entrada) |
| `src/pang/tipos.ts` | Contrato común: pantalla lógica, área de juego, tallas de burbuja, datos de fase, armas, objetos y estilo (paso, cualidad y especial) de cada personaje |
| `src/pang/fases.ts` | Las doce fases (burbujas, bloques, escaleras, jefe, especial, música, tiempo) |
| `src/pang/juego.ts` | Una fase jugada (`Partida`: un `Mandos` y un `JugadorVivo` por jugador): bucle, física, armas, objetos, jefes, marcador y botones táctiles. Con `pausa` abre el menú de pausa (el Pang corto no la tiene) y con `demo` la juegan solos los bots (el título) |
| `src/pang/mundo.ts`, `hud.ts`, `bot.ts` | El estado de la fase (`Mundo.jugadores`), el marcador (un panel por jugador si son varios, con su arma) y el bot (uno por jugador) |
| `src/pang/red/` | El online (`docs/PANG-ONLINE.md`): `sala.ts` (lista de salas y sala), `online.ts` (una partida entera de anfitrión o de invitado) y `foto.ts` (la «foto» que el anfitrión manda unas 30 veces por segundo y su interpolación) |
| `src/pang/sonido.ts` | Efectos de sonido sintetizados |
| `src/pang/arte/sprites.ts` | Pixel art de muñecos, burbujas, jefes, objetos, bloques y escaleras |
| `src/pang/arte/fondos.ts` | Los doce fondos de pixel art |
| `src/pang/pantallas.ts`, `ui/`, `guardado.ts`, `pang.css` | Título, menú, elegir personaje, continuar, final, récords, ajustes, pausa y guardado |
| `src/textos/pang.md` | Todos los textos (mismo formato que el capítulo 1) |
| `scripts/pang-sim.mjs` | Un bot juega las cinco fases del Pang corto para comprobar la dificultad (`PUERTO=5173 node scripts/pang-sim.mjs 0.25 20 [fase]`) |

## Pantalla y aspecto

- **Pixel art de recreativa**, como el *Pang* del tráiler del capítulo 2: lógica de 384 × 216 (16:9), ampliada sin suavizar al mayor múltiplo entero que quepa. El menú y la elección de personaje van en HTML con los retratos de siempre (`retrato` de `src/juego/reparto.ts`) y el estilo de la guía (cristal ahumado, filete dorado, Graduate y Alegreya Sans).
- Área de juego: paredes en x = 8 y x = 376, techo en y = 8, suelo en y = 184. De 192 a 216, el marcador, con la letra *Press Start 2P* (Google Fonts, OFL).
- **Rendimiento** (`docs/ESTILO.md`, T5): todo se pinta una vez en lienzos pequeños y cada fotograma solo copia imágenes; nada de SVG en el lienzo; bucle con tope de 60 fps; la física va a pasos fijos.

## Reglas

- **Burbujas.** Cuatro tallas (radio 20, 12, 7 y 4). Un impacto parte una en dos de la talla siguiente, que saltan un poco hacia arriba y salen en direcciones opuestas; la más pequeña revienta. Botan siempre a la misma altura según su talla y flotan como en el original (12 de octubre de 2026, Jesús: iban demasiado rápidas): caen con menos gravedad que el jugador, las grandes van más despacio que las pequeñas y todas aceleran fase a fase (de ×0,8 en la 1 a ×1,2 en la 12). Los **posavasos** (fase 7) no caen: van en diagonal y rebotan en todo. Puntos: 50, 100, 150 y 200 de mayor a menor.
- **Jugador.** Anda a izquierda y derecha y nunca salta. En la fase 8 sube y baja por escaleras a las murallas. Si le toca una burbuja o un jefe, pierde una vida y la fase empieza otra vez (como en el original); igual si se acaba el tiempo. (Con varios jugadores, solo cae el que recibe el golpe y la fase sigue: `docs/PANG-ONLINE.md`.) Tres vidas; sin vidas, «¿Continuar?», que repite la fase con tres vidas y los puntos a cero (continuaciones sin límite, para que todos vean el final).
- **Al superar una fase**, bonus por el tiempo que sobra.

### Los cuatro

Todos empiezan con el mismo arma (el arpón normal) y encuentran las demás como objetos; lo que los distingue es el paso, una **cualidad** pasiva («Lo suyo» al elegir personaje) y el especial.

| | Paso (px/s) | Cualidad | Especial |
|---|---|---|---|
| Fran | 62 | **Poder de convocatoria**: los objetos que esperan en su mismo suelo (a menos de 64 px en horizontal y 24 en vertical) se deslizan hacia sus pies a 40 px/s; si pasan del borde de una plataforma, caen | **¡Una más!**: las burbujas (y el jefe) se quedan quietas 5 s |
| Pablo | 72 | **Nunca dice que no**: si pierde una vida, conserva el arma que llevaba | **¡Sí, y…!**: cada burbuja se parte a la vez; al jefe le quita 3 |
| Chuchi | 84 | **Atajo de teclado**: sus arpones y balas (también las del kinki) van un 25 % más rápido | **Modo kinki**: 6 s de ráfaga triple que atraviesa (manda sobre el arma que lleve y, al acabar, vuelve) |
| Guille | 72 | **Maño**: el escudo del objeto aguanta dos golpes en vez de uno, y el cierzo de Zaragoza no le empuja | **Abrazo de oso**: al usarlo revienta lo que tiene a menos de 48 px y le deja un escudo (un golpe) que, al romperse, vuelve a reventar lo cercano |

La barra del especial se llena con 16 burbujas reventadas (o golpes al jefe) y se conserva entre vidas. Tras un golpe con escudo hay 1,5 s de invulnerabilidad.

### Las armas

| Arma | Cómo dispara |
|---|---|
| Arpón normal | Un arpón en el aire a la vez (el de salida de todos) |
| Arpón doble | Dos a la vez |
| Arpón triple | Tres a la vez |
| Arpón fijo | Se clava en el techo o bajo un bloque y se queda 2,5 s; uno en el aire, hasta tres en total |
| Ráfaga | Se mantiene pulsado y salen balas cortas y rápidas (hasta 5 a la vez; 0,34 de daño al jefe) |

Los cables miden siempre 3 px de ancho. El **modo kinki** manda sobre cualquier arma mientras dura y luego vuelve la que había.

### Objetos (15 % de las burbujas sueltan uno; caen, esperan 6 s y parpadean antes de irse)

Reparto por cada 100 objetos: armas 32 (doble 12, fijo 8, ráfaga 8, triple 4), reloj 10, chupito 8, escudo 10, caña 5 y comida 35. Lo que no tiene sentido pasa a ser comida (el chupito con jefe, la caña si ya salió en la fase).

- **Armas** (cápsula de colores con flechas o balas; ver «Las armas»): al cogerla, el jugador cambia de arma al momento (los cables que ya van por el aire terminan su vuelo), suena el efecto de objeto y sale el aviso («¡ARPÓN DOBLE!», etc.). Nunca sale el arma que el jugador ya lleva. **Dura hasta que pierde una vida** (vuelve al arpón normal; Pablo la conserva) **o coge otra**. Se conserva de una fase a la siguiente; «¿Continuar?» tras quedarse sin vidas empieza con el arpón normal. El marcador enseña un icono del arma junto a las vidas.
- **Reloj** de la cocina de Fran: congela las burbujas 5 s.
- **Chupito**: dinamita, todas las burbujas a la talla más pequeña (no sale con jefe).
- **Escudo**: aguanta un golpe (dos, Guille).
- **Caña**: vida extra (una por fase como mucho).
- **Comida** para puntos: taquitos de jamón, aceitunas, croqueta, turrón y yema de Ávila.

### Lo especial de cada fase

- **3 · Piso de Fran:** Aceituna cruza corriendo de vez en cuando y suelta taquitos. No hace daño.
- **5 · Teatro:** la sombra apaga las luces: 8 s a oscuras y 3 s con luz. A oscuras solo se ve alrededor del jugador y bajo un foco que se pasea.
- **9 · Zaragoza:** el cierzo sopla a rachas, cambia de lado y empuja burbujas y jugador; un aviso dice hacia dónde.
- **4 · Robi** (jefe): bota como una burbuja grande. Cada pocos segundos se pone el gorrito de fiesta y los disparos rebotan. Suelta bolas pequeñas al recibir golpes.
- **6 · El Peor** (jefe): el cerdo de 152 kilos bota más bajo y más rápido; cada golpe suelta un cerdito (una burbuja pequeña). Al final, más rápido.
- **12 · La Penúltima** (jefe final): una jarra gigante que flota por arriba y escupe burbujas de champán; a media vida se enfada y escupe más.

## Música

Cuatro temas propios. Los tres primeros, sintetizados con `tools/musica/pang.py` (12 de octubre de 2026, Jesús pidió música cañera con melodías buenas, en la línea de *VVVVVV* y *Streets of Rage 2*): «A tope por Usera» (chiptune, 150 ppm, la menor; también en el título y los menús), «La calle de la penúltima» (house con FM de Mega Drive, 126 ppm, re dórico) y «Última ronda» (168 ppm, mi menor; la de los jefes). Se generan con `python3 pang.py <usera|calle|ronda> bucle ../../src/sonido/pang-<nombre>.mp3`. El cuarto, «Hora de cerrar» (1 de noviembre de 2026, Jesús lo eligió entre dos muestras), es deep house melancólico de los 2010 (123 ppm, do menor, 64 compases con un parón en medio: bajo de órgano, acordes cortos a contratiempo y un gancho de cortes de voz), hecho con `tools/musica/deephouse.py` (necesita numpy, scipy y numba): `python3 pang_deep.py bucle ../../src/sonido/pang-deep.mp3`. Suena en las fases 3, 7 y 11. Los cuatro se turnan fase a fase (`musica` en `src/pang/fases.ts`).

## Controles

- **Móvil (horizontal):** ◀ ▶ grandes abajo a la izquierda (cada flecha mide 1,15 × la altura del botón, que va de 64 a 96 px según la pantalla; se puede deslizar el dedo de una a otra) y, alrededor, un margen invisible de 32 px que también cuenta como zona táctil (toda la esquina inferior izquierda): izquierda o derecha se decide por el punto medio entre las dos flechas visibles. Disparo y Especial abajo a la derecha, y Pausa arriba a la derecha. En la fase 8 salen ▲ ▼ para las escaleras, centradas justo encima de las flechas y sin pisar su zona táctil (el Pang corto no tiene la pausa). Botones de al menos 44 px CSS, semitransparentes y en las zonas seguras. Los controles son los mismos en el Pang corto del capítulo.
- **Teclado:** flechas o A/D para andar, ↑/↓ o W/S en las escaleras, espacio, Z o J para disparar, ↑ (o W, fuera de las escaleras), Ctrl o Cmd, X, K o Mayúsculas para el especial, Esc o P para la pausa.

## Guardado

En el navegador (`cyc.pang.v1`), aparte de la partida del capítulo: la fase más alta alcanzada (para «Seguir» y «Elegir fase»), las cinco mejores partidas (puntos, personaje, fase y fecha) y los volúmenes. En la tabla de este móvil, una marca fija de CYC siempre va primero.

**Récords de todos** (31 de octubre de 2026). Al acabar una partida (sin vidas, fin del juego o salir al menú) la marca (la misma que `anotarRecord`, que ahora devuelve `{ marca, entra }`) se envía con `enviarRecord('pang', puntos, { pj, fase }, fecha)` (`src/cuenta/records.ts`); sin cuenta no se envía nada, y sin red queda pendiente en `cyc.records.pend` y sale al volver la red o al arrancar. La pantalla de récords (`pantallaRecords`, `src/pang/ui/menus.ts`) tiene tres pestañas: **«De todos»** primero (las 10 mejores del servidor, con el nombre de la cuenta, la cara del personaje y la fase; las tuyas en dorado y la partida recién jugada con «¡Récord!»; sin red, la última tabla vista; sin cuenta, «Ponte un nombre en la portada para salir aquí»), **«En grupo»** (la tabla `pangGrupo` del servidor: las partidas online de 2 a 4 jugadores, con el mismo estilo de fila y un pequeño «con N»; ver `docs/PANG-ONLINE.md`) y **«En este móvil»** (las cinco de siempre, solo de partidas de uno, con la fila CYC de broma, que solo está aquí). Si la partida entra en las cinco de este móvil, la pantalla se abre sola tras esperar hasta 2,5 s a que el servidor tenga la marca; sin cuenta se abre en «En este móvil», donde está. Las 10 filas son bajas y, si la pantalla es más baja aún, la tabla se desplaza dentro del panel. Dentro del juego, el Pang arranca con los volúmenes del menú del juego y los vuelve a dejar al salir.
