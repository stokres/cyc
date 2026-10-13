# PokéUsera · Edición Jarra

Juego aparte de batallas de useritos a cuatro, al estilo de los juegos de monstruos de Game Boy Advance, pero todo original (criaturas, nombres, sprites, música). Pedido por Jesús el 12 de octubre de 2026; nombre, reglas, tipos y useritos validados por él ese día. Rama `claude/batallas-a-cuatro-4c2aj0`; no toca el capítulo 1 ni el Pang.

## 1. Cómo está hecho

| Pieza | Dónde |
|---|---|
| Entrada | `pokeusera.html` → `src/pokeusera/main.ts` |
| Tipos compartidos (el contrato) | `src/pokeusera/tipos.ts` |
| Datos: tipos, useritos y movimientos | `src/pokeusera/datos.ts` |
| Motor de combate (puro, sin DOM, azar con semilla) | `src/pokeusera/motor/` (`combate.ts`, `draft.ts`, `bot.ts`, `azar.ts`) |
| Arte (aspecto Game Boy Advance): paleta, letra, sprites 64×64, entrenadores, logo, marcos | `src/pokeusera/arte2/` (`paleta2`, `fuente2`, `sprites2`, `entrenadores2`, `logo2`, `escena2`, `ui2`); `arte/pixel.ts` (el pintor de píxeles) y `arte/paleta.ts` (colores y nombres de tipo) |
| Vista previa del arte (solo desarrollo) | `tools/pokeusera-v2.html` (`?vista=detalle`, `fuente`, `entrenadores`) y `tools/pokeusera-v2-export.mjs` |
| Sonido: música y efectos | `src/pokeusera/sonido.ts`, MP3 en `src/sonido/pokeusera-*.mp3`, generados con `tools/musica/pokeusera.py` |
| Pantallas y flujo | `src/pokeusera/pantallas/` |
| Online | `src/pokeusera/red/`, servidor `scripts/servir-pokeusera.mjs` + `scripts/sala-pokeusera.mjs` |
| Textos | `src/textos/pokeusera.md` (interfaz) y `src/textos/pokeusera-combate.md` (mensajes del combate, descripciones de useritos y movimientos) |

### Pantalla

- **Vertical, en el móvil.** Lógica de 240 px de ancho (el de la Game Boy Advance); el alto sale de la proporción de la pantalla: `alto = clamp(round(240 × alto / ancho), 384, 520)`. El lienzo se ajusta al ancho con escala no entera, sin suavizar (`image-rendering: pixelated`).
- **Aspecto Game Boy Advance** (muestra aprobada): letra proporcional de píxeles propia (`arte2/fuente2.ts`, mayúsculas de 7 px, con tildes, ñ, º, ¡ y ¿), paneles crema con borde oscuro y reborde dorado, cursor ▶, barras de PS verde/amarilla/roja con etiqueta «PS», fichas con la inicial y el color del entrenador. Los useritos son de 64×64 con rampas de 3-5 tonos y dos fotogramas de reposo (a ~2 fps, de frente y de espaldas); los entrenadores, de 56×80 con dos fotogramas; retratos de 40×40 e iconos de 16×16; el logo, de 220×90. Las miniaturas del draft son de 32×32 (reducción 2×2 del sprite de 64).
- **Reparto del alto en el combate** (`pantallas/combate.ts`, función `geom`): la separación entre filas va de 50 a 76 px según el alto; los pies del sprite quedan 62 px por debajo del inicio de la fila; debajo va la bandeja con el cuadro de texto y el panel del menú pegado al borde inferior. Por debajo de 430 px de alto, el cuadro de texto es de dos líneas (modo compacto). El mismo criterio (hueco que sobra repartido entre filas, alturas mínimas) sirve en el draft, el podio y las estadísticas.
- **Combate a cuatro en vertical:** los tres rivales en filas arriba (ficha a la izquierda: nombre, sus tipos como fichitas de color con 3 letras —cuadrados con la inicial si el nombre es largo—, barra de PS y color del entrenador; sprite de frente a la derecha; el N50 se quitó porque todos son de nivel 50) y el tuyo abajo (sprite de espaldas a la izquierda, ficha con PS en números a la derecha, sobre su plataforma). Debajo, el cuadro de texto y los menús (el mismo hueco para los dos). En móviles altos, la altura que sobra se reparte entre las filas.
- **Seguir lo que pasa** (pedido por Jesús tras la beta: «demasiado rápidas y caóticas»), todo en `pantallas/combate.ts`:
  - **Cartel y foco en cada acción** (rehecho tras el aviso de Jesús: «los recuadros y las flechas… no son nada claros»; ya no hay rectángulos por fila, ni línea con puntas por el borde, ni «cara ▶ cara» pegada a las fichas): desde el `usa` hasta el siguiente `usa` (o el fin del turno) sale **un cartel** bajo el cuadro de texto (`cartel()`, encima del registro, que se encoge): a la izquierda la ficha del entrenador que ataca y el nombre de su userito, una flecha gruesa de su color, a la derecha las caras de los objetivos (o «TODOS» en los movimientos a todos, o «ÉL MISMO»), y debajo, centrado, el movimiento en una insignia del color de su tipo. Sobre el campo: las filas que no intervienen se atenúan un poco, la plataforma del que actúa se ilumina con el color de su entrenador, el atacante embiste hacia sus objetivos (de lado y hacia su fila) y cada objetivo lleva **esquinas parpadeantes** pegadas a su sprite (`cajaSprite` en `fondos.ts` mide el dibujo) en el color del que ataca. Un cambio o una caña solo atenúan y marcan al que actúa (sin cartel). Los efectos del final del turno (quemaduras, Hora de cerrar) solo marcan con esquinas claras a quien los sufre, sin cartel.
  - **Ficha al tocar** (pedido por Jesús: «entender cómo funcionan las estadísticas… ver de qué tipo es cada uno… el significado de los estados»): tocar el panel o el sprite de un userito (mientras eliges —acción, movimientos, equipo, grada— o esperas a los demás; no mientras salen los textos ni al elegir objetivo, donde el toque elige) abre una caja (`abrirFicha`, sobre `sobre`) con su sprite, nombre, entrenador y jarras, tipos, PS (números en el tuyo, porcentaje en los rivales), estado, cambios de estadística (ATA −1, VEL +2…), las cinco estadísticas base con barras y, si es un rival, «tus movimientos contra él» con ×2 / ×1/2 / ×1 / NO AFECTA / SIN DAÑO (de `eficacia`). Abajo, un recuadro explica lo que toques: un estado (`ayuda.estado.*`), una estadística (`ayuda.stat.*`) o los tipos (`ayuda.tipos`); tocar la etiqueta de estado del panel abre la ficha ya con esa explicación. El «?» de la barra de arriba abre la GUÍA del juego (`guia.ts`) encima del combate, y el cuadro de texto del menú de acción recuerda «Toca a un userito para ver su ficha». Si dos estados no caben junto al nombre, las jarras dejan sitio a las etiquetas (las jarras siguen en la ficha).
  - **Eficacia al elegir:** al elegir objetivo, cada rival que se puede elegir lleva esquinas (la elegida parpadea) y, si el movimiento hace daño, una etiqueta sobre su sprite: «MUY EFICAZ ×2» (verde), «POCO EFICAZ ×1/2» (naranja) o «NO LE AFECTA» (gris); nada si es ×1. En la lista de movimientos, cada uno lleva su tipo en una fichita y, a la derecha, un cuadradito por rival en juego, del color de su entrenador y de arriba abajo como en pantalla: flecha arriba = pega el doble, abajo = la mitad, X = no le afecta, liso = normal; los movimientos sin daño no los llevan.
  - **VOLVER:** los menús de movimientos y de equipo acaban en una fila grande «VOLVER» que vuelve al menú de acción sin enviar nada (además del enlace de la barra de arriba y de Escape/X). No sale en el reemplazo forzoso tras un K.O. Para dar sitio, el panel de un menú puede crecer hacia arriba sobre el cuadro de texto, que se queda al menos con dos líneas.
  - **Números flotantes** sobre el sprite: `-34` en rojo, `+20` en verde, y etiquetas de ~1 s (`MUY EFICAZ!`, `POCO EFICAZ`, `CRITICO!`, `NO AFECTA`, `ESCONDIDO`, `FALLA`, `ESQUIVA`). Un golpe recortado por **Acorralado** lleva una chapita roja «1/2» pegada bajo su número (`golpe.acorralado` del evento; el motor ya no manda la línea «¡Entre todos acorralan a…!»: el HISTORIAL la apunta al reproducir el golpe, y la guía explica la chapita en BAR). Cada rótulo y cada chapita se hornea una sola vez al crearse (nada de texto con contorno por fotograma).
  - **Movimientos a todos los rivales** (pedido por Jesús: «es muy lento ir de uno en uno»): los resultados de un `usa` con dos o más objetivos se reproducen **a la vez** (`grupoArea` en `pantallas/combate.ts`): un solo «¡X usó Y!», luego todos los golpes parpadean y vacían su barra juntos, con sus números y etiquetas (crítico, eficacia, FALLA, ESQUIVA, NO AFECTA, ESCONDIDO) flotando a la vez sobre cada objetivo, sin una línea de texto por rival; los K.O. caen juntos; y los estados y cambios de estadística son una etiqueta por objetivo («ATA -1», «QUEMADO») y **una sola línea** para los que recibieron lo mismo («¡El ataque de A, B y C baja!», `combate.todos.*`). Para eso el motor etiqueta con `j` (el objetivo) las líneas de texto de cada resultado. El HISTORIAL sigue apuntando una línea por objetivo. Los golpes de un movimiento múltiple («¡Le dio 3 veces!») van más seguidos (destello y barra al 40 %, el último a ritmo normal), y tras «¡X usó Y!» el golpe llega a los 0,55 s en lugar de a los 1,25 s.
  - **ORDEN DEL TURNO:** al empezar la reproducción de cada turno, una tira con quién actúa y en qué orden (cara del jugador, sprite y nombre del userito) durante ~1,5 s; después queda como fichas pequeñas en la barra de arriba, con la del que actúa enmarcada y las hechas pálidas. Sale del orden de los `usa` (y de los cambios y cañas) del turno.
  - **Ritmo** (ajuste «VELOCIDAD DEL COMBATE: LENTA / NORMAL / RÁPIDA», en AJUSTES y en la pausa ≡; se guarda en `localStorage` `pokeusera.v1`, por defecto NORMAL): NORMAL escribe a 30 letras por segundo y pasa sola a los 1,6 s; LENTA a 24 y solo con un toque (como el original); RÁPIDA es el ritmo de la primera versión (42 letras por segundo, 0,65 s). Cambian también las pausas entre acciones, la duración de las animaciones, el drenaje de las barras (0,8 s en NORMAL) y lo que duran los números flotantes. Un toque en cualquier parte del campo termina la línea o pasa a la siguiente. Las líneas de texto seguidas de un mismo golpe («¡Golpe crítico!» + «¡Muy eficaz!») comparten cuadro si caben en tres líneas. `?auto` / `?rapido` y el invitado que va con retraso ignoran el ajuste y van rápido.
  - **HISTORIAL:** botón pequeño en la barra de arriba; abre una caja con todo el combate hasta ahora por turnos («TURNO 3»), que se desliza con el dedo o las flechas; un toque fuera la cierra. El invitado la monta con los eventos que reproduce. (Sustituye al registro difuminado que había sobre el cuadro de texto.)
- Todo se toca: zonas táctiles de al menos 44 px CSS. En el ordenador también con flechas, Enter/Z (aceptar) y Escape/X (atrás).
- **Rendimiento** (`docs/ESTILO.md`, T5): todo lo estático (paneles, placas, iconos, fondos por alto, bandeja, plataformas, miniaturas) se hornea una vez en lienzos (`hornear(clave, ancho, alto, fn)` en `arte2/ui2.ts`; `pantallas/fondos.ts`), los sprites van prehorneados, nada de SVG, las lecturas de píxeles pasan por un único lienzo de software (`willReadFrequently`), el bucle tiene tope de 60 fps, se repinta solo cuando algo cambia y, en reposo, cada 250 ms (suficiente para el reposo de los sprites).
- **Efectos de movimientos** (pedido por Jesús: «que salgan lentejas o algo así… el rendimiento debe ser crucial, siempre»): `pantallas/efectosMov.ts`, módulo autónomo (sin texto, sin tocar el motor). **Enganchados al combate** (13-oct-2026, `combate.ts`): la pantalla crea un `EfectosMov` y, en el evento `usa` (que el motor solo emite si el movimiento se usa de verdad: dormido, paralizado o retrocediendo no hay evento, y por tanto no hay efecto), llama a `lanzar(mov, tipo, desde, a)` con el centro del sprite del atacante y el de cada objetivo (`cajaDe`; todos a la vez en los movimientos a todos; `a` vacío en los de uno mismo). No se lanza si el atacante está oculto ni si el movimiento no encontró objetivo (una copia fallida). `paso(dt, k)` va en el `paso` de la pantalla (devuelve false cuando no queda nada: entonces no se repinta solo por esto) y `dibujar` va **sobre los sprites y bajo los paneles de las filas** (la fila se dibuja en dos capas, `filaSprite` y `fila`: así un rayo o una racha de cierzo nunca tapan un nombre ni una barra), los números flotantes, la bandeja, el texto y la barra de arriba. **Tiempo:** el efecto no suma tiempo al movimiento. La pausa que sigue a «¡X usó Y!» (562 ms en NORMAL) se parte en dos (`decirYLanzar`): primero se lee y en lo que queda sale el efecto, justo `llegadaFx(mov)` ms antes de que empiece el golpe (de 80 a 340 ms según el efecto), de modo que el golpe, el parpadeo y la barra empiezan cuando el efecto llega. Con el ritmo LENTA (pasa solo con un toque) el efecto sale tras el toque y suma lo que tarda en llegar. La embestida del atacante sale a la vez que el efecto (sin esperarla). **Ritmo:** los efectos van a 1× en LENTA, 1,15× en NORMAL, 1,4× en RÁPIDA y 4× con `?auto`/`?rapido`. Los sprites de los efectos se hornean en el segundo plano (`precalentar.ts` usa `tareasPrecalentarEfectos()`: un movimiento o un tipo por tarea) y otra vez, ya hechos, al empezar el combate (`calentar`). Varios objetivos juegan a la vez. Tienen diseño propio trece movimientos: lluvia de lentejas (nube y lentejas), almendrazo (almendras que giran), traca (petardeos en cada rival), fogonazo (bola de fuego y brasas), petardazo (petardo, explosión y humo), chispazo (rayo desde arriba), cierzo (rachas y hojas cruzando), chupitazo (vaso que gira y salpica), garrafón (botella que se rompe), «¡Camioneees y caravanaaas!» (notas musicales), esporas (nube verde y esporas), temblor (polvo, piedras y grieta en cada rival) y bocinazo (ondas de sonido). Cualquier otro movimiento hace una bolita con una chispa del color de su tipo (los de estado, unos brillos) y, sobre uno mismo, cuatro brillos. **Rendimiento:** cada sprite se hornea una vez, la primera vez que un efecto lo pide, en lienzos de unos pocos píxeles (`precalentarEfectos()` los hornea todos de golpe, p. ej. en la carga); las partículas viven en un depósito fijo de 64 (si se llena se descartan las nuevas), sin asignaciones ni cierres por fotograma; dibujar es solo `drawImage` con posiciones enteras; sin SVG, filtros, sombras difuminadas, degradados ni lecturas de píxeles. Medido con la CPU a 4× más lenta y el peor caso (traca en 3 objetivos + golpes genéricos en los mismos 3, 64 partículas): ~0,1 ms de media por `paso`+`dibujar` (~0,3 ms rasterizando en software). Vista previa: `tools/pokeusera-v2.html?vista=efectos` (cada efecto en bucle sobre un bar de pruebas; `&hoja=1` hace la hoja de contacto; `&medir=1` da `window.__medir()`). Para añadir un efecto: una función `(e, tipo, desde, a)` que llame a `e.mk(...)` y su entrada en la tabla `FX`.

### Flujo

Título («Toca para empezar») → menú: **Jugar solo** (tú y tres de la máquina) / **Jugar online** (sala con contraseña) / **Guía** / Ajustes (música, efectos, velocidad del combate) → elegir entrenador (Fran, Pablo, Chuchi, Guille; cada uno con su ventaja, ver «Ventajas de entrenador») → **draft en serpiente** → **combate** → **podio** (1.º a 4.º, con la duración de la batalla y el MVP) → **estadísticas** (opcional) → volver a jugar.

### Estadísticas del final

El motor las lleva en `estado.stats` (tipo `Estadisticas` en `tipos.ts`) mientras resuelve los turnos, así que viajan con el estado y los invitados las ven iguales (llegan en el mensaje `fin`). Por userito (`StatsUserito`, claves cortas): daño hecho `dh` / recibido de otros `dr` / propio y de la barra `dp` (quemaduras, retroceso, Hora de cerrar…), curado `cu`, derribos `ko`, caídas `cae`, golpes dados `gol` / recibidos `rg`, fallos `fal`, esquivas `esq`, críticos dados/recibidos `cri`/`crr`, muy eficaces `sup`/`sur`, poco eficaces `pob`/`por`, estados puestos `est`, cambios de nivel a otros / a sí mismo `nvo`/`nvy`, cambios `cam`, caña `cana`, PP gastados `pp`, mejor golpe (`mx` valor, `mm` movimiento, `mo` jugador golpeado), usos de cada movimiento `mv` (4 + «A la desesperada»), turnos en campo `tf`, daño con Venganza `dv`. Además `dm[a][b]` (daño de a a b), `km[a][b]` (derribos de a a b) y `gr[j]` (cañas y abucheos desde la grada). Invariantes (los comprueba `scripts/pokeusera-motor.mjs`): Σ`dh` = Σ`dr` = Σ`dm`; Σ`ko` = Σ`km`; por userito `psMax − ps = dr + dp − cu`.

Pantalla (`pantallas/estadisticas.ts`, desde el botón ESTADÍSTICAS del podio, también para invitados; ◀ ▶, deslizar o flechas del teclado para cambiar de página, VOLVER para salir): **RESUMEN** (diez medidas con barras de los cuatro), **USERITOS** (los tres de cada jugador: daño, derribos, turnos, movimiento favorito, mejor golpe), **DUELOS** (matriz «quién pegó a quién» con color de calor y derribos, némesis y víctima favorita) y **PREMIOS** (hasta ocho: MVP, Saco de boxeo, Matagigantes, Rey de la caña, Gafe, Francotirador, El veleta, Superviviente, Rencoroso; los textos, en `pokeusera.md`).

### Música

Ocho piezas originales de estilo Game Boy (2 pulsos, onda de 16 pasos y ruido), compuestas en `tools/musica/pokeusera.py` (`python3 pokeusera.py <nombre>`), MP3 a 24 kHz, 96 kbps, mono, todas al mismo volumen (RMS −17,5 dB). Título, draft, final y victoria (esta una sola vez, sin bucle) tienen una; **el combate tiene cuatro** (pedido por Jesús: «siempre la misma aturulla la cabeza»), que se turnan:

| Pista | Archivo | Tono y tempo | Idea |
|---|---|---|---|
| `combate` (la de siempre) | `pokeusera-combate.mp3` | Re menor, 156 | Riff con arpegios rápidos y puente martilleante. |
| Rock | `pokeusera-combate-rock.mp3` | Do menor, 144 (53 s) | Rock de furgoneta: riff con acordes sincopados 3+3+4+3+3 sobre un bajo arpegiado en semicorcheas; estribillo en Mi bemol mayor. |
| Verbena | `pokeusera-combate-verbena.mp3` | La menor / La mayor, 132 con swing (58 s) | Pasodoble de verbena para la pelea del Bar del Brío: bajo de «pum-pa», acordes a contratiempo, cadencia andaluza, trompeta en terceras en La mayor y redobles de caja. |
| Electro | `pokeusera-combate-electro.mp3` | Fa sostenido menor, 130 (59 s) | Tensa y sincopada: pulso fino del 12,5 % en un riff 3+3+2 con segunda menor y tritono, bajo corto y bombo a juego, puente de notas repetidas que sube cromáticamente. |

`sonido.musica('combate')` no cambia para quien llama: cada **combate nuevo** (el primer `'combate'` tras cualquier otra pieza, p. ej. título, draft o victoria) elige una de las cuatro al azar, distinta de la del combate anterior (se recuerda en memoria, no en `localStorage`). Volver a pedir `'combate'` durante el mismo combate, también después de `'final'`, deja la misma pieza; `'final'` suena igual en todos. Cada archivo se descarga solo cuando le toca (carga perezosa, como el resto). Todas cierran el bucle sin clic (tres rondas idénticas, se queda la central con 0,5 s de margen: `exportar_bucle`).

### Guía para el jugador

Pedido por Jesús tras la beta («entender cómo funcionan las estadísticas… una tabla de apoyo con qué ataca mejor a qué… el significado de los estados… un juego más fácil de seguir»). `pantallas/guia.ts` exporta `abrirGuia(base, pagina?)`, hecha sobre `sobre` (`modal.ts`), así que se abre encima de cualquier pantalla y la devuelve al cerrarse: **GUÍA** en el menú principal (entre JUGAR ONLINE y AJUSTES, con su icono «?» dibujado en `guia.ts`), **GUÍA** en la caja de pausa del combate (`menuPausa`; en online la batalla sigue por debajo) y el «?» de la ficha del draft. Cinco páginas (◀ ▶, deslizar, flechas, pestañas; arrastrar para bajar si no cabe; VOLVER): **JUEGO** (draft, turno simultáneo, orden, último en pie), **DATOS** (PS/ATA/DEF/ESP/VEL con los textos `ayuda.stat.*` y la escala de niveles −6…+6), **TIPOS** (la tabla 11×11 sacada de `eficacia` de `datos.ts`, atacante en filas y defensor en columnas, casillas verdes ×2, naranjas ×½ y oscuras ×0; tocar un tipo o una casilla enmarca su fila y columna y lista «Pega fuerte a / Pega poco a / No afecta a / Le pegan fuerte»), **ESTADOS** (las cinco etiquetas DOR/PAR/QUE/EMP/ACH con `ayuda.estado.*`) y **BAR** (Acorralado, Venganza, Hora de cerrar, Desde la grada, la caña y, debajo, las ventajas de los cuatro entrenadores). `pagina` acepta `como`, `stats` (o `estadisticas`), `tipos`, `estados` y `reglas`. Los textos están en `pokeusera.md` (`guia.*`).

Cambios del **draft** (ficha de un userito, `tarjeta` en `draft.ts`): la cuenta atrás ya no desaparece al abrir la ficha, que tapaba la barra de arriba; ahora un cuadro grande arriba a la derecha muestra los segundos (rojo y parpadeando en los últimos 5) y debajo de quién es el turno («¡Tu turno!» o «Elige Pablo»). Bajo la descripción salen los tipos del userito como insignias (`Le pega fuerte a`, `Le pegan fuerte` con «×4» si es doble debilidad y, si los hay, `No le afectan`), calculados con `eficacia`; si la pantalla es baja se quita antes la descripción que las insignias. Las filas de estadísticas y el «?» abren la guía en la página DATOS. De paso, `sobre` ya no devuelve la pantalla anterior si el juego ya había cambiado de pantalla mientras estaba abierto (el draft acabó, salió el podio).

### Online

Como el Pang (`docs/PANG-ONLINE.md` en su rama): una sola sala por WebSocket en `/sala`, contraseña en la variable `POKEUSERA_CLAVE` del servidor (nunca en el repositorio). El primero que entra es el anfitrión: su navegador lleva el draft y el combate con el motor (`Partida`); los invitados mandan sus elecciones y pintan lo que llega. Al ser por turnos solo viajan elecciones y resultados. El servidor no sabe nada del juego: reparte mensajes.

**Código** (`src/pokeusera/red/`): `conexion.ts` (el WebSocket), `sala.ts` (pantalla de contraseña y sala, en el mismo lienzo; la contraseña se escribe en un `<input>` real colocado encima del lienzo y se recuerda en `localStorage` `pokeusera.clave`), `online.ts` (el hilo: contraseña → sala → partida → sala…), `anfitrion.ts`, `invitado.ts` y `mensajes.ts` (los tipos de los mensajes).

**La sala.** Lista de quién está (icono, nombre, «ANFITRIÓN», «TÚ»), cada uno elige entrenador (los ya cogidos salen apagados; `elegir`) y el anfitrión ve «RELLENAR CON MÁQUINA: SÍ/NO» (por defecto SÍ) y EMPEZAR. Juegan solo los que han elegido entrenador (los demás miran). El anfitrión necesita entrenador propio; con SÍ se rellena hasta cuatro asientos con la máquina (con los entrenadores libres, por orden) y con NO se juega con los que hay (mínimo 2). Orden de asientos: id de la sala, y la máquina detrás.

**Mensajes de juego**, dentro de `juego` (los viejos nombres de este documento ya no valen):

- Invitado → anfitrión (`a: 'anfitrion'`):
  - `{ k: 'pick', n, especie }`: `n` es el nº de picks ya hechos (`draft.elegidos.length`), para que una respuesta vieja no cuente para una pregunta nueva.
  - `{ k: 'eleccion', turno, eleccion }`: `turno` es el de `pide`; `eleccion` es una `Eleccion` o `null` (grada: nada).
  - `{ k: 'reemplazoIdx', turno, idx }`: `turno` es `estado.turno` del último estado que recibió; `idx` es el índice en `equipo`.
  - `{ k: 'listo', g, n }`: «ya he reproducido» el `n`-ésimo mensaje `inicio` / `turno` / `reemplazo` de la partida `g` (el `id` de `asientos`).
- Anfitrión → todos (`a: 'todos'`), en este orden dentro de cada partida:
  - `{ k: 'asientos', id, asientos: [{ entrenador, nombre, bot }], seats: { [idSala]: asiento } }`: quien no sale en `seats` solo mira; `id` identifica la partida (el invitado lo repite en `listo`).
  - `{ k: 'draft', draft, turnoDe, plazoMs }` (cada vez que cambia el draft; `turnoDe` es quien elige ahora, `null` = fin; eso ya es la petición del pick).
  - `{ k: 'inicio', estado }`.
  - `{ k: 'pide', turno, quienes, plazoMs }`: los de `quienes` eligen (también los eliminados cuando se abre la grada).
  - `{ k: 'turno', turno, eventos, estado }`.
  - `{ k: 'pideRemp', quienes, plazoMs }`: los asientos de `quienes` deben elegir quién sale (tras la caída); como `pide`, se manda cuando el anfitrión abre la pregunta y su plazo empieza entonces.
  - `{ k: 'reemplazo', eventos, estado }`, `{ k: 'fin', estado }` (con las estadísticas dentro de `estado.stats`).
  - `{ k: 'salio', seat, nombre }`: un invitado se fue y la máquina juega por él (todos ven una línea de texto).
  - `{ k: 'otra' }`: el anfitrión eligió OTRA en el podio; sigue un `asientos` nuevo y otro draft.
- Mensajes de la sala (los del servidor): `elegir`, `empezar` (a todos), `volver` (a todos: de vuelta a la sala; lo manda el anfitrión al elegir MENÚ en el podio), `salio` (al anfitrión), `cerrada` (se fue el anfitrión).

**Reglas de la conexión.**

- **Ritmos distintos.** Cada uno reproduce el combate a su ritmo (su ajuste de velocidad). El anfitrión reproduce su propio turno y, al acabar, espera a que todos los invitados digan `listo` (hasta 20 s); solo entonces manda `pide` / `pideRemp`. El plazo de elección (30 s, 15 s para el reemplazo) empieza cuando se manda la pregunta, así que el ritmo del anfitrión no le quita tiempo a nadie. Un invitado que sigue atrasado cuando se abre la pregunta tiene 20 s más de gracia (además de los 1,2 s de siempre) y su cuenta atrás nunca baja de 20 s; después la `Partida` decide por él (movimiento al azar, primer vivo, etc.). Una respuesta que llega antes de la pregunta se guarda para ella; las que llegan tarde se tiran.
- Cada invitado procesa los mensajes en orden con una cola. Si se retrasa y hay más de 2 turnos en cola, los reproduce rápido hasta ponerse al día (el ajuste de velocidad no cuenta entonces). Una pregunta que el anfitrión ya cerró (porque pasó el plazo y siguió con el siguiente mensaje) se descarta y no se manda. El plazo que ve el invitado es el del anfitrión menos 0,6 s de margen (y menos lo que el mensaje esperó en la cola, con el mínimo de 20 s).
- El anfitrión valida lo que llega (forma del mensaje, objetivos dentro del rango); el motor corrige el resto.
- Un invitado que se va (`salio`) pasa a ser máquina el resto de la partida y las preguntas que tenía pendientes las contesta la máquina al momento. Si se va el anfitrión, la sala se cierra para todos: «Se ha cerrado la sala» y al menú; igual si se pierde la conexión.
- En el podio el invitado tiene ESTADÍSTICAS y MENÚ (sale de la sala). El anfitrión elige OTRA (mismo grupo, otro draft; los invitados vuelven al draft solos) o MENÚ (todos a la pantalla de la sala).
- ABANDONAR en la pausa: el invitado sale de la sala; el anfitrión también, y eso la cierra para todos.
- Para probar a mano: `?rapido` (solo animaciones rápidas; `?auto` es solo para la partida en solitario). Con `POKEUSERA_CLAVE=prueba PORT=8080 node scripts/servir-pokeusera.mjs` (tras `npm run build`) y dos pestañas se juega una sala completa; en la consola, `window.__pokeusera` da acceso a la partida del anfitrión o a la cola del invitado.

### Publicación

Railway, desde esta rama: `npm run build` y `npm start` (`scripts/servir-pokeusera.mjs`, `/` abre el juego). Variable `POKEUSERA_CLAVE` para la sala.

### Rendimiento

El rendimiento es crucial (Jesús, 13-oct-2026: el móvil iba «muuuy lento»). Reglas del dibujo, además de `docs/ESTILO.md` T5/T6:

- **Solo se redibuja lo que cambia.** El bucle (`pantalla.ts`) dibuja si `paso` devuelve `true`, si la pantalla está marcada como sucia o cada 250 ms (parpadeos). Una pantalla cuyo único movimiento son valores sacados del reloj (la fase de un parpadeo, el fotograma de respiración, un salto redondeado a píxeles) usa `Firma` (`pantallas/ui.ts`): `paso` calcula esos valores como `dibujar` y devuelve `firma.cambio()`. Una pantalla que no depende del reloj pone `estatica: true` (el menú) y ni siquiera repinta cada 250 ms. La caja de texto solo pide repintado cuando aparece una letra nueva.
- **Todo lo estático se hornea una vez** y se pega con `drawImage`: fondos (`fondos.ts`, `fondoPapel`), paneles (`panelCacheado`), la pista de las barras de PS, fichas, insignias de tipo, etiquetas de estado, pips, plataformas. Los helpers que se hornean solo lo hacen con `globalAlpha` 1 y en píxeles enteros (`pegable`, en `arte2/ui2.ts`); si no, dibujan como siempre y el resultado es el mismo.
- **El texto** (`arte2/fuente2.ts`) se hornea por línea: los glifos de cada color viven en una hoja y las líneas horneadas de todos los colores en diez páginas compartidas, en vez de un canvas por glifo y por línea (cada canvas cuesta unos 18 KB de gestión aparte de sus píxeles: una partida llegaba a más de 1.200 canvases, ahora ronda los 250). Nada de construir cadenas de clave por fotograma (mapas anidados), y `t()` recuerda los textos sin variables.
- **Memoria con tope:** las páginas de texto se reciclan (la menos usada), `hornear` olvida el cuarto más antiguo pasadas 300 placas y los fondos por altura de pantalla guardan solo los tres últimos.
- **Los useritos y entrenadores se hornean en segundo plano** (`pantallas/precalentar.ts`, desde `main.ts`): uno cada vez, cuando el navegador está ocioso, mientras el jugador mira el título y el menú. Hornear un userito de 64×64 son unos 10 ms en un ordenador y decenas en un móvil lento; antes cada pantalla se paraba al estrenarlos (la rejilla del draft, el primer combate). La música del draft se precarga en la elección de entrenador y la del combate durante el draft (`sonido.precargar`).
- **El combate** (pasada del 13-oct-2026, `combate.ts`): los doce useritos del combate se hornean antes de que salgan (`calentar`, repartido en fotogramas, por si el combate empieza antes de que acabe el segundo plano); el foco, los números flotantes y la tira del orden se repintan solo cuando cambia un valor (`firmaFoco`: el pulso cada 140 ms, el fundido del velo en 8 pasos, cada número a píxel entero, el parpadeo de reposo; solo se pide 60 fps mientras se mueve un sprite o vuela un efecto); el anillo de la plataforma del que actúa y las cuatro esquinas de la marca de objetivo van horneados por tamaño y color (un `drawImage` en vez de decenas de `fillRect`); el velo que atenúa las filas es un `rgba` hecho una vez (sin `save`/`globalAlpha`); `geom()` y `rivales()` se guardan (por alto de pantalla y por asiento) y `fila` no crea listas ni cadenas por fotograma (anchos de nombres, estados y chips guardados; `vivos` sin `filter`); los tres pips de cada fila y sus chips de tipo son una sola tira horneada; los rótulos flotantes tienen su caché propia (no pasan por `hornear`, que olvida lo más antiguo pasadas 300 placas); la melodía `final` se precarga cuando quedan tres jugadores y la fanfarria `victoria` cuando quedan dos.
- **Nada de arte nuevo por fotograma.** Hornear es para el arranque o el segundo plano; en una escena que ya se está dibujando, una pieza nueva debe salir de la caché.

**Cómo medirlo:** `node scripts/rendimiento-pokeusera.mjs [pantalla...]` contra `npm run dev` (puerto 5173; otro puerto, como primer número: `node scripts/rendimiento-pokeusera.mjs 5174 menu`). Carga cada pantalla en 390×844 con dpr 2,6 y la CPU frenada ×4 (CDP `Emulation.setCPUThrottlingRate`), y mide durante 4 s (`SEG=`): redibujos por segundo, ms por fotograma dibujado (contadores de `?medir`, en `pantalla.ts`), lo que ocupan los `requestAnimationFrame` del hilo, `drawImage` por fotograma, canvases creados en reposo y en total, tareas largas (>50 ms) y el peor fotograma del arranque. Falla (código 1) si una pantalla se pasa de su presupuesto (`PRESUPUESTOS`, al principio del script: las medidas del 13-oct-2026 con margen). Pantallas: `titulo`, `menu`, `entrenador`, `draft` (con `?draft`), `draft-flujo` (el draft como lo alcanza un jugador: el peor fotograma al entrar, con el horneado de fondo hecho solo durante 3 s), `combate-elige` (`?combate`), `combate-juega` (`?combate&auto`, diez veces más rápido de lo que ve una persona: casi siempre se mueve algo y lanza efectos), `combate-ritmo` (la misma batalla al ritmo NORMAL, el que ve el jugador; cambia `cfg` dentro de la página, solo con el servidor de desarrollo), `podio` y `estadisticas` (juega una partida rápida con `?auto`, unos 40 s), `useritopedia` (menú → USERITOPEDIA, la lista), `useritopedia-ficha` (una ficha abierta) y `guia`. Los lienzos que crea el horneado de fondo (`precalentar.ts`, marcado con `window.__precalentando`) no cuentan como lienzos de la pantalla. `VOLCAR=carpeta` guarda un PNG de cada pantalla (para comparar el aspecto antes y después de un cambio). Hay que ejecutarlo con cualquier cambio en el dibujo, una pantalla o un minijuego de PokéUsera, solo con las pantallas tocadas; una pantalla nueva se añade a `PANTALLAS` y a `PRESUPUESTOS`. Las cifras absolutas solo valen para comparar en la misma máquina.

**El combate, antes y después de la pasada del 13-oct-2026** (CPU ×4, 390×844 @2,6, 4 s; el «después» ya lleva los efectos de los movimientos, que antes no estaban; las cifras fluctúan un 10-30 % de una pasada a otra; los picos de `juega` son el horneado de fondo del segundo plano, que en el juego real acaba durante el título y el menú):

| Pantalla | | Redibujos/s | ms por fotograma | `drawImage` por fotograma | Peor fotograma (ms) | Tareas largas |
|---|---|---|---|---|---|---|
| `combate-elige` | antes | 4,0 | 3,2 | 65 | 6,9 | 0 |
| | después | 4,0 | 2,2-3,1 | 53 | 3-6 | 0 |
| `combate-juega` (`?auto`) | antes | 55,9 | 4,7 | 83 | 135 | 2 (140 ms) |
| | después | 44-47 | 4,1-5,2 | 81 | 18-45 | 0-3 (53-91 ms) |
| `combate-ritmo` (NORMAL) | antes | 59,2 | 2,9 | 70 | 11,6 | 0 |
| | después | 25-27 | 3,1-3,9 | 61 | 13-39 | 0 |

Lo que se nota: en el ritmo que ve el jugador el combate dibuja menos de la mitad de las veces (de 59 a ~26 por segundo; el hilo pasa del 18 % al 10 %), los picos de 75-200 ms del arranque desaparecen y los efectos de los movimientos caben en el mismo presupuesto. Quedó sin hacer el punto «una sola capa horneada para el fondo, la bandeja y las plataformas» (~10 % de los `drawImage`): tras el resto, `combate-juega` baja de 4,7 a ~4,1-5,2 ms (con efectos, y la máquina de pruebas fluctúa) y al ritmo real el combate queda en ~3,1-3,9 ms, y esa capa (fondo y plataformas; la bandeja va sobre los efectos y no se puede unir) quitaría unos 4 `drawImage` de 60.

## Precisiones del motor

- **Nivel 50.** PS = `round(base × 2) + 80`; Ataque, Defensa, Velocidad y Especial = base + 5. (La beta usaba base + 60: las batallas duraban 9-18 turnos y un userito caía a veces de un solo golpe cuando varios iban a por él. Con el nuevo PS, simulando 200 batallas de cuatro máquinas, la mediana es de 18 turnos, el p10 13 y el p90 35, y un userito aguanta de media 5 golpes de ataque antes de caer: `node scripts/pokeusera-motor.mjs --sim=200`. El reparto de 420 entre estadísticas de cada especie no cambia, solo el PS que sale de él; el daño tampoco.)
- **Daño** (como el original): `floor(floor(22 × Pot × A / D) / 50) + 2`, por 1,5 si es del mismo tipo, por la eficacia, por un azar de 0,85 a 1 y por 2 si es crítico (probabilidad Vel base / 512). Mínimo 1 si afecta. «A todos»: × 0,75. **Acorralado:** el segundo golpe y los siguientes que recibe un mismo userito en un turno, de otros jugadores, × 0,5; el golpe sale marcado (`acorralado: true` en su evento `golpe`) y la pantalla le pone la chapita «1/2».
- **Niveles de estadística:** multiplicador (2 + n) / 2 si n ≥ 0, 2 / (2 − n) si n < 0. Precisión igual. Quemado: Ataque a la mitad; Paralizado: Velocidad a la cuarta parte.
- **Orden:** cambios y caña; Esconderse; Susto; el resto de más a menos Velocidad (empates a suertes).
- **Objetivo caído a mitad de turno:** el golpe va a otro rival en pie al azar.
- **Achispado:** al atacar, 1/3 se pega a sí mismo (potencia 40, físico, sin tipo), 1/3 su ataque «uno» va a otro rival al azar, 1/3 normal.
- **Sin PP en ningún movimiento:** usa «A la desesperada» (Normal, 50, sin fallo, recibe 1/4 del daño).
- **Reemplazo:** al final del turno, quien tiene el userito caído elige cuál sale (15 s; si no, el primero vivo). Si ya no le quedan, queda eliminado con el puesto que toque.
- **Hora de cerrar:** desde el turno 30 (antes, el 25), al final de cada turno todos pierden 1/8 de sus PS máximos, y cada 4 turnos más sube otro 1/8 (1/8 en los turnos 30-33, 2/8 en los 34-37, 3/8 en los 38-41…). Sin esa subida, una Siesta cada tres turnos sostenía una pelea para siempre con tantos PS.
- **Fin:** cuando queda uno. Si los últimos caen a la vez, gana quien tenía más PS (en %) al empezar el turno.
- **Tiempos:** 30 s por turno, 20 s por elección en el draft. Al acabar el tiempo: movimiento al azar contra rival al azar (o lo que diga la máquina).

## 2. Reglas (validadas por Jesús el 12-oct-2026)

### Lo básico

- **De 2 a 4 jugadores, todos contra todos**, en la misma sala con contraseña que el Pang. Los sitios vacíos los ocupa la máquina (un rival fácil), así que dos amigos también pueden jugar una batalla a cuatro. También se puede jugar solo contra tres de la máquina.
- **Cada jugador es uno de los cuatro amigos como entrenador** (Fran, Pablo, Chuchi o Guille, en sprite de Game Boy Advance), y cada uno con su color.
- **Equipo de 3 useritos**, todos a nivel 50. Sin experiencia ni objetos que llevar: llegar, elegir y pegarse.
- Una batalla dura unos **10-15 minutos** (de 16 a 24 turnos de media).

### Elegir equipo: el draft en serpiente

Todos ven los 20 useritos a la vez y se eligen por turnos, sin repetir: 1-2-3-4, 4-3-2-1, 1-2-3-4. 20 segundos por elección; si se acaba el tiempo, la máquina elige por ti. Así cada uno tiene useritos distintos, y ya hay pique antes de pelear.

### Cada turno

1. **Todos eligen a la vez y en secreto**, con 30 segundos de tiempo: **atacar** (un movimiento y, si es a un solo rival, **a quién**), **cambiar** de userito o usar la **caña** (una por batalla: cura la mitad de los PS; a Fran, el 60 %).
2. Se resuelve en este orden: cambios y caña, después «Esconderse» y «Susto», y luego los ataques del más rápido al más lento (empate: a suertes).
3. Si se acaba el tiempo, tu userito usa un movimiento al azar contra un rival al azar.

### Elegir objetivo (lo nuevo de luchar a cuatro)

- **Movimientos a un rival:** tocas el userito de uno de los otros tres. Si ese userito cae antes de que te toque, el golpe va a otro rival en pie al azar (el reemplazo sale al final del turno).
- **Movimientos a todos:** golpean a los tres rivales a la vez, con el 75 % de la potencia.
- **Movimientos a ti mismo:** suben tus estadísticas, te curan o te esconden.

### Tres reglas para que funcione a cuatro

- **Acorralado.** Si en un mismo turno a un userito le pegan dos o más rivales, el segundo golpe y los siguientes le hacen la mitad. Se puede ir a por uno entre todos, pero sale menos a cuenta. En pantalla, esos golpes llevan una chapita roja «1/2» junto al número de daño.
- **Venganza.** Algunos movimientos pegan el doble a quien te hizo daño en el turno anterior. Quien abusa, lo paga.
- **Hora de cerrar.** A partir del turno 30 sale Vero y pone las sillas encima de las mesas: al final de cada turno todos los useritos pierden 1/8 de sus PS, y cada cuatro turnos más, otro 1/8. Así ninguna batalla se eterniza.

### Ventajas de entrenador

Pedidas y decididas por Jesús el 13 de octubre de 2026: cada entrenador trae una ventaja suave, que se aplica a todo el que lo elija (también la máquina y los asientos online; si dos jugadores pudieran compartir entrenador, los dos la tienen). Viven solo en el motor (`motor/combate.ts`, constantes `PERK_*` en `tipos.ts`): el anfitrión las aplica y los invitados ven el resultado en los eventos de siempre, así que el formato online no cambia.

| Entrenador | Ventaja | Qué hace |
|---|---|---|
| **Fran** | ¡Otra caña! | Su caña cura el 60 % de los PS máximos en vez del 50 %. |
| **Pablo** | Labia | Sus movimientos de estado (los de potencia «—», `pot === null`) tienen +10 puntos de precisión, con tope de 100; los que nunca fallan no cambian. |
| **Chuchi** | Llega tarde | El primer golpe que recibe cada uno de sus useritos de un ataque de otro jugador hace un 20 % menos (una vez por userito y batalla; se aplica después del resto de multiplicadores, con mínimo 1). Sale «{userito} llegaba tarde: el golpe le pilla a medias.» |
| **Guille** | Mañico | Una vez por userito y batalla, si un golpe de otro jugador lo dejaría a 0 estando con la vida llena, aguanta con 1 PS. Sale «¡{userito} aguanta como un buen mañico!» |

Detalles: lo gastado se apunta en `Userito.perk` (`tarde`, `manico`), fuera de `vol`, así que no se pierde al cambiar de userito: cada userito tiene el suyo. Cuentan los golpes de ataque de otros (cada golpe de un movimiento múltiple va por separado; el primero gasta la ventaja de Chuchi); no cuentan quemaduras, retroceso, golpes a sí mismo ni Hora de cerrar. Los textos de aviso, en `pokeusera-combate.md` (`combate.perk.chuchi` y `combate.perk.guille`); nombre y descripción de cada ventaja, en `pokeusera.md` (`entrenador.<id>.perk` y `.perk_d`). La pantalla de elegir entrenador muestra el nombre bajo cada nombre y la descripción del seleccionado (un toque selecciona, otro toque o ELEGIR confirma), y la guía las explica en la pestaña BAR. Las máquinas no las tienen en cuenta al decidir. `scripts/pokeusera-motor.mjs` comprueba cada una con casos deterministas.

### Quién gana

- Te eliminan cuando caen tus tres useritos. **Gana el último en pie**, y el resto queda en el orden en que cayó (2.º, 3.º, 4.º).
- Si los últimos caen en el mismo turno, gana el que tenía más PS (en porcentaje) al empezar ese turno.
- **Desde la grada** (opcional, lo recomiendo): los eliminados no se quedan mirando. Cada tres turnos pueden **invitar a una caña** a un userito que siga en pie (cura 1/10 de sus PS) o **abuchearle** (baja su precisión). Da juego para piques y venganzas, aunque permite ayudar a un amigo.

### Como en el original

- **Cinco estadísticas:** PS, Ataque, Defensa, Velocidad y Especial (una sola para atacar y defender con movimientos especiales).
- **Físicos y especiales según el tipo:** Normal, Bronca, Aire, Juerga y Fantasma son físicos (usan Ataque y Defensa); Fuego, Droga, Chispa, Alcohol, Chanza y Grasa son especiales (usan Especial).
- **Mismo tipo que el userito:** el movimiento pega un 50 % más.
- **Críticos:** cuanto más rápido es el userito, más críticos (doble de daño).
- **PP** por movimiento, como en el original pero más justos para que cuenten en un solo combate (13-oct): los gordos 3, los fuertes 5, los normales 8 y los flojos 10.
- **Subidas y bajadas de estadísticas** por niveles, de −6 a +6; se pierden al cambiar de userito.
- **Estados** (uno a la vez, salvo Achispado, que se suma):
  - **Dormido:** no actúa durante 1-3 turnos.
  - **Paralizado:** un 25 % de las veces no actúa, y su Velocidad baja a la cuarta parte.
  - **Quemado:** pierde 1/16 de sus PS cada turno y su Ataque baja a la mitad.
  - **Empachado** (nuevo, nuestro veneno): pierde 1/8 de sus PS cada turno hasta que se cura o cae.
  - **Achispado** (nuestra confusión): durante 2-4 turnos, cada vez que ataca puede pegarse a sí mismo (1 de cada 3 veces) o pegar a otro rival al azar (1 de cada 3).

### Tabla de tipos

Once tipos. Doble de daño (×2), la mitad (×½) o nada (×0). Si un userito tiene dos tipos, se multiplican. Nombres decididos por Jesús (13-oct-2026): Droga (antes Planta), Chispa (antes Rayo) y Bronca (antes Tierra); en el código los ids son `droga`, `chispa` y `bronca`, y las etiquetas de tres letras son DRO, CHI y BRO (CHI se distingue de CHA por el color: amarillo frente a turquesa).

| Ataque de tipo | ×2 contra | ×½ contra | ×0 contra | La lógica |
|---|---|---|---|---|
| **Normal** | — | Bronca | Fantasma | A un fantasma no le toca nadie normal |
| **Fuego** | Droga, Alcohol | Fuego, Bronca, Grasa | — | El alcohol arde; lo frito ya está frito |
| **Droga** | Bronca, Grasa | Fuego, Droga, Alcohol | — | La verdura compensa la grasa |
| **Bronca** | Fuego, Chispa | Droga | Aire | — |
| **Aire** | Fuego, Juerga | Chispa, Bronca | — | El viento apaga la vela y el cierzo vacía las terrazas |
| **Chispa** | Aire, Alcohol | Chispa, Droga | Bronca | Electricidad y líquidos, mala idea |
| **Alcohol** | Grasa, Droga | Alcohol, Fuego | — | El alcohol disuelve la grasa |
| **Juerga** | Normal, Bronca | Grasa | — | La gente normal no aguanta una juerga |
| **Chanza** | Juerga, Fantasma | Chanza | — | Una buena chanza corta el rollo y desinfla al flipado |
| **Grasa** | Alcohol, Juerga | Fuego, Droga | — | Hay que comer antes de beber, y después de un atracón no hay juerga |
| **Fantasma** | Chanza, Fantasma | — | Normal | El que va de fantasma te deja la gracia fría |

---

## 3. Los 20 useritos (validados)

Todos suman lo mismo en estadísticas (420), para que no haya ninguno roto de salida: cada uno destaca en algo y flojea en otra cosa. Las cifras se ajustarán al probar. La columna PS es la base: en combate el PS es `round(base × 2) + 80` (ver «Precisiones del motor»).

| # | Userito | Tipo | PS | Ata | Def | Vel | Esp | Movimientos |
|---|---|---|---|---|---|---|---|---|
| 1 | **Draguserín**: el dragón del parque de Usera | Fuego / Aire | 75 | 80 | 70 | 95 | 100 | Traca, Petardazo, Planeo, Esconderse |
| 2 | **Goudazard**: palito frito de gouda rebozado | Grasa / Fuego | 85 | 70 | 90 | 65 | 110 | Fritanga, Fogonazo, Pringue, Rebozado |
| 3 | **Aceitún**: perrita negra con forma de aceituna (por Aceituna) | Droga / Grasa | 70 | 85 | 70 | 110 | 85 | Raíces, Pringue, Lametazo, Cara de pena |
| 4 | **Cierzón**: remolino mañico que no para quieto | Aire | 70 | 90 | 65 | 120 | 75 | Cierzo, Planeo, Remolino, Venganza |
| 5 | **Turroncho**: bloque de turrón blando con almendras | Bronca / Droga | 100 | 80 | 125 | 35 | 80 | Almendrazo, Adoquín, Caparazón, Siesta |
| 6 | **Tocinón**: cerdo enorme y tranquilo, 152 kilos de userito | Normal / Grasa | 150 | 95 | 80 | 30 | 65 | Barrigazo, Pringue, Temblor, Siesta |
| 7 | **Roscochoco**: dulce navideño de chocolate, muy indigesto | Grasa / Juerga | 105 | 75 | 90 | 50 | 100 | Indigestión, Fritanga, Conga, Rebozado |
| 8 | **Espumarro**: jarra de cerveza a la que nunca se le baja la espuma | Alcohol / Normal | 95 | 70 | 80 | 75 | 100 | Ronda, Garrafón, ¡Una más!, Barrigazo |
| 9 | **Cajonazo**: cajón flamenco con brazos y mucho compás | Juerga | 85 | 105 | 90 | 80 | 60 | Rumba, Taconeo, Temblor, Compás |
| 10 | **Lentejasur**: lenteja sucia que aparece cuando menos te lo esperas | Droga / Fantasma | 60 | 65 | 60 | 120 | 115 | Lluvia de lentejas, Tropezón, Susto, Esporas |
| 11 | **Tragaperras**: la máquina del rincón del bar, que se ríe de ti | Chispa / Chanza | 85 | 60 | 95 | 65 | 115 | Premio gordo, Chispazo, Zasca, Cizaña |
| 12 | **Turito**: el userito que aburre y cansa | Normal | 115 | 70 | 110 | 45 | 80 | Dar la chapa, Te pillo en la barra, Turra, Bostezo |
| 13 | **Resacón**: nube gris que aparece a la mañana siguiente | Alcohol / Fantasma | 80 | 90 | 75 | 85 | 90 | Dolor de cabeza, Chupitazo, Venganza, Siesta |
| 14 | **Evoscar**: dos cabezas, una de mujer y otra de hombre, con cuerpo de caballo | Juerga / Chanza | 85 | 90 | 75 | 90 | 80 | Coz doble, Galope, A dos voces, Sí, y… |
| 15 | **Chupitochu**: chupito muy fuerte y ardiente | Alcohol / Fuego | 60 | 55 | 60 | 120 | 125 | Chupitazo, Fogonazo, Garrafón, Esconderse |
| 16 | **Caravaner**: una caravana | Bronca / Juerga | 110 | 90 | 115 | 30 | 75 | ¡Camioneees y caravanaaas!, Temblor, Caparazón, Siesta |
| 17 | **Camioner**: un camión | Normal / Bronca | 100 | 125 | 100 | 50 | 45 | Trompazo, Adoquín, Bocinazo, ¡Camioneees y caravanaaas! |
| 18 | **Criaturitah**: pequeña criaturita del bosque | Droga / Chanza | 80 | 60 | 80 | 100 | 100 | Esporas, Raíces, Vacile, Monada |
| 19 | **Ego-Ego**: fantasma muy flipado | Fantasma | 70 | 105 | 65 | 110 | 70 | Eco, Chulería, Flipada, Selfie |
| 20 | **Kbronero**: teclado heavy | Chispa / Juerga | 80 | 90 | 70 | 85 | 95 | Solo de teclado, Distorsión, Pogo, Compás |

Reparto por tipos (contando los dobles): Normal 4, Fuego 3, Droga 4, Bronca 3, Aire 2, Chispa 2, Alcohol 3, Juerga 5, Chanza 3, Grasa 4, Fantasma 3.

Cosas a tener en cuenta del equilibrio:

- **Turito** solo es débil a Juerga y no le afecta lo Fantasma: aguanta mucho, pega poco y aburre al rival con Turra y Bostezo.
- **Ego-Ego** pega muy fuerte, pero lo Normal no le toca y él no toca a los Normales, así que lleva Chulería (Juerga) para ellos. Es débil a Chanza: no soporta que se rían de él.
- **Aceitún** tiene una debilidad doble a Alcohol (×4): a la perrita, ni una gota.
- **Camioner y Caravaner** comparten el movimiento de la canción; si uno la canta justo después del otro, pega el doble (ver la tabla).

### Los movimientos

Potencia, precisión y PP. «Uno» es un rival a elegir; «todos», los tres rivales (al 75 %); «yo», el propio userito.

| Movimiento | Tipo | Pot. | Prec. | PP | Objetivo | Efecto |
|---|---|---|---|---|---|---|
| Barrigazo | Normal | 85 | 100 | 8 | uno | 30 %: paraliza |
| Trompazo | Normal | 120 | 90 | 3 | uno | El que lo usa recibe 1/4 del daño que hace |
| Galope | Normal | 80 | 100 | 8 | uno | — |
| Lametazo | Normal | 30 | 100 | 10 | uno | 30 %: paraliza |
| Dar la chapa | Normal | 80 | 100 | 8 | uno | 20 %: baja 1 nivel la Velocidad |
| Te pillo en la barra | Normal | 25 | 90 | 8 | uno | Lo atrapa 2-5 turnos: no puede cambiar y pierde 1/16 de PS por turno |
| Bocinazo | Normal | — | 100 | 8 | todos | Baja 1 nivel el Ataque de los rivales |
| Turra | Normal | — | 90 | 5 | todos | Se les quitan las ganas: baja 1 nivel el Ataque y el Especial |
| Bostezo | Normal | — | 100 | 5 | uno | Se queda dormido al final del turno siguiente |
| Cara de pena | Normal | — | 100 | 10 | uno | Nadie puede pegarle a esa carita: baja 2 niveles el Ataque |
| Esconderse | Normal | — | — | 5 | yo | Nadie puede tocarle este turno; si lo repite seguido, la mitad de las veces falla |
| Siesta | Normal | — | — | 5 | yo | Duerme 2 turnos y recupera todos los PS y estados |
| Traca | Fuego | 70 | 100 | 5 | todos | 10 %: quema |
| Fogonazo | Fuego | 90 | 100 | 8 | uno | 10 %: quema |
| Petardazo | Fuego | 110 | 85 | 3 | uno | 30 %: quema |
| Raíces | Droga | 60 | 100 | 8 | uno | Recupera la mitad del daño que hace |
| Almendrazo | Droga | 85 | 100 | 8 | uno | — |
| Lluvia de lentejas | Droga | 25 | 90 | 10 | uno | Pega de 2 a 5 veces |
| Esporas | Droga | — | 75 | 8 | uno | Lo duerme |
| Temblor | Bronca | 80 | 100 | 5 | todos | No afecta a los de tipo Aire |
| Adoquín | Bronca | 100 | 85 | 5 | uno | — |
| Caparazón | Bronca | — | — | 10 | yo | Sube 2 niveles la Defensa |
| Cierzo | Aire | 70 | 95 | 5 | todos | Baja 1 nivel la Velocidad de los rivales |
| Planeo | Aire | 80 | 100 | 8 | uno | — |
| Remolino | Aire | — | 100 | 8 | uno | Le obliga a cambiar a otro userito al azar |
| Chispazo | Chispa | 90 | 100 | 8 | uno | 10 %: paraliza |
| Distorsión | Chispa | 60 | 100 | 5 | todos | 10 %: achispa |
| Solo de teclado | Chispa | 130 | 90 | 3 | uno | Al turno siguiente no puede hacer nada (recarga) |
| Premio gordo | Chispa | ? | 100 | 5 | uno | Tirada de tragaperras: potencia 0, 40, 80 o 150 |
| Chupitazo | Alcohol | 80 | 100 | 8 | uno | 20 %: achispa |
| Ronda | Alcohol | 65 | 100 | 5 | todos | Ronda para todos. 10 %: achispa |
| Garrafón | Alcohol | 110 | 85 | 3 | uno | 30 %: achispa |
| ¡Una más! | Alcohol | — | 100 | 5 | todos | «Aquí no se va nadie»: los rivales no pueden cambiar el turno siguiente y baja 1 nivel su Velocidad |
| Dolor de cabeza | Alcohol | — | 90 | 8 | uno | Lo achispa |
| Rumba | Juerga | 20 | 90 | 10 | uno | Pega de 2 a 5 veces |
| Taconeo | Juerga | 85 | 100 | 8 | uno | 20 %: retrocede (pierde el turno si aún no ha actuado) |
| Conga | Juerga | 70 | 100 | 5 | todos | — |
| Pogo | Juerga | 75 | 95 | 5 | todos | 20 %: retroceden |
| Coz doble | Juerga | 45 | 100 | 8 | uno | Pega dos veces (una por cabeza) |
| Chulería | Juerga | 80 | 100 | 8 | uno | — |
| Compás | Juerga | — | — | 10 | yo | Sube 2 niveles el Ataque |
| ¡Camioneees y caravanaaas! | Juerga | 90 | 100 | 3 | todos | Si alguien la cantó el turno anterior, pega el doble |
| Zasca | Chanza | 100 | 90 | 5 | uno | — |
| Vacile | Chanza | 80 | 100 | 8 | uno | 20 %: baja 1 nivel el Especial |
| A dos voces | Chanza | 65 | 100 | 5 | todos | — |
| Monada | Chanza | — | 100 | 8 | todos | Nadie quiere pegarle: baja 1 nivel el Ataque de los rivales |
| Cizaña | Chanza | — | 90 | 5 | uno | Durante 2 turnos, sus ataques a un rival van a un rival al azar |
| Sí, y… | Chanza | — | — | 8 | — | Copia el último movimiento que se haya usado en la batalla, de quien sea |
| Fritanga | Grasa | 90 | 100 | 8 | uno | 20 %: quema (salta el aceite) |
| Pringue | Grasa | 65 | 100 | 5 | todos | 20 %: resbalan y baja 1 nivel su Velocidad |
| Tropezón | Grasa | 70 | 100 | 8 | uno | 30 %: lo empacha |
| Indigestión | Grasa | — | 90 | 5 | uno | Lo empacha |
| Rebozado | Grasa | — | — | 10 | yo | Sube 2 niveles la Defensa |
| Susto | Fantasma | 40 | 100 | 10 | uno | Ataca antes que nadie (solo van antes los cambios y Esconderse) |
| Eco | Fantasma | 40 | 100 | 10 | uno | Pega dos veces |
| Venganza | Fantasma | 50 | 100 | 5 | uno | Doble de potencia contra quien le hizo daño el turno anterior |
| Flipada | Fantasma | — | — | 5 | yo | Sube 1 nivel el Ataque, el Especial y la Velocidad; baja 1 nivel la Defensa |
| Selfie | Fantasma | — | 70 | 8 | todos | Flash en la cara: baja 1 nivel la precisión de los rivales |

---


### Useritopedia

Pedido por Jesús («una useritopedia con todos los detalles de todos los useritos: su número, su tipo, su descripción, etcétera»). `pantallas/useritopedia.ts` exporta `abrirUseritopedia(base, id?)`, hecha sobre `sobre` (`modal.ts`) como la guía: se abre encima de cualquier pantalla (o de nada, con `base` null) y la devuelve al cerrarse. Con `id` abre directamente la ficha de ese userito y VOLVER cierra; sin él abre la **LISTA**. Todavía no tiene entrada en el menú (la añade quien edite `menu.ts` / `flujo.ts`: `await abrirUseritopedia(escena)`).

- **Lista:** los 20 en el orden de `ESPECIES` (Nº01…Nº20, el mismo número de la ficha del draft), cada fila con número, miniatura 32×32, nombre, tipos y su mejor estadística (`ESP 100`). Se arrastra con inercia, flechas ↑↓ para moverse, Enter o toque para abrir, VOLVER.
- **Ficha:** una sola página que se desliza hacia abajo: nombre y Nº; el sprite de frente a 2× y el de espaldas, ambos con su reposo de dos fotogramas (a ~2 por segundo), y los tipos; la descripción (`userito.<id>.desc`); las cinco estadísticas base con barras (tocar una abre su `ayuda.stat.*`), el total (todos suman 420) y en qué estadística destaca y con qué puesto de 20; los cuatro movimientos con tipo, potencia, precisión, PP, objetivo (a uno / a todos / a sí mismo), categoría (físico / especial / estado, según `TIPOS_FISICOS`), prioridad y `mov.<id>.desc`; y «Le pega fuerte a / Le pegan fuerte (×4) / No le afectan», calculado con `eficacia` como en la ficha del draft (reutiliza `hileraTipos`, `defensoresCon` y `atacantesFuertes` de `guia.ts`). ◀ ▶ (arriba, abajo, flechas del teclado o deslizar de lado) pasan al anterior o siguiente con un deslizamiento de 160 ms y su grito (`sonido.grito`, que también suena al abrir y al tocar el sprite grande); VOLVER vuelve a la lista.
- **Rendimiento:** la pantalla es `estatica` (y `sobre` ahora propaga ese dato: un modal estático sobre nada o sobre otra pantalla estática no se repinta cada 250 ms). `paso` devuelve true solo mientras hay inercia, durante el deslizamiento entre useritos y en el instante en que cambia el fotograma de reposo. Cada fila de la lista y cada ficha (un lienzo alto con todo menos los dos sprites y la burbuja de explicación) se hornean una vez; en reposo se hornea una pieza por fotograma (filas, luego las fichas de las filas visibles; o los sprites y la ficha de los vecinos de la abierta), así que abrir una ficha o pasar con ◀ ▶ no se nota. Un fotograma son unas pocas llamadas a `drawImage`; el texto va por la caché de `fuente2`. Medido con la CPU 4× más lenta, 390×844: la lista en reposo no repinta nada; la ficha en reposo, 2 repintados por segundo de ~1,2-1,7 ms; arrastrando o deslizando, ~1,3 ms de media por fotograma (máx. 5 ms). Vista previa: `tools/pokeusera-v2.html?vista=useritopedia` (`&id=camioner` abre una ficha; `&medir=1` da `window.__medir`). Textos: `useritopedia.*` en `pokeusera.md`.
