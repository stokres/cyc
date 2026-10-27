# Capítulo 2 · El arranque (especificación)

Decidido con Jesús entre el 16 y el 21 de octubre de 2026. El guion y el planteamiento completos están en la carpeta del proyecto (`capitulo2/planteamiento.md`, `capitulo2/guion-arranque.md`, `capitulo2/plan-arte.md`); aquí está lo que el código necesita para que las piezas encajen.

## La historia del arranque

La noche se cuenta **en orden**. Empieza en la puerta del Bar del Brío, donde acabó el capítulo 1: un texto del narrador sobre la fachada, la cámara entra y los cuatro están en la barra. Puzle a cuatro, «Una moneda para la tragaperras»:

1. Chuchi quiere irse. Fran pide otra ronda a Vero: **minijuego de las cañas por la barra**. Sube el nivel de la noche a 1.
2. La tragaperras está «fuera de servicio». Chuchi la reinicia «como el router», pero el enchufe está detrás. **Guille la separa de la pared en cuanto la usa** (25 de octubre de 2026: antes esperaba a que Chuchi la hubiera mirado; ahora, si nadie la ha mirado, el diálogo lleva la idea del router a Chuchi) y detrás aparece **un duro de 1987** (objeto de la bolsa). **Chuchi cruza el bar andando hasta el enchufe** (`separar`, `SOCKET_C` en `capitulo2.ts`), la enciende, y vuelve a su sitio. La máquina separada es un mueble cerrado (el lado izquierdo se ve en perspectiva, `maquinaFuera` en `bar.mjs`).
3. La máquina no acepta pesetas. Pablo convence a Vero para los **fresquitos** (conversación con tres opciones; las dos malas tienen respuesta propia). Nivel 2.
4. Ahora sí, la máquina se traga el duro. Tirada sin premio (limón, campana, cerdo).
5. Pablo se arranca con un pasodoble y le salen dos palabras. **Minijuego del canto a cuatro**: «¡Camioneees y caravanaaas!». Nivel 3. **Premio gordo**: tres caras de Fran (25 de octubre de 2026, como el resto de tiradas con cara; antes eran tres sietes) y lluvia de monedas. **Tras el canto la tragaperras suena con el tonillo**: cada rodillo que se fija toca una nota de «Ca-mio-neees» y el premio, «y ca-ra-va-naaas» (`tools/musica/tragaperras_cantada.py`; pistas `tragaperrasSinCamiones` y `tragaperrasPremioCamiones`, con la bandera `c2.premio`; `mostrarTragaperras(..., { cantada })`). Antes del canto suenan las de siempre.
6. Zoom a Fran, que cierra los ojos. La espuma de su caña llena la pantalla y empieza **el *Pang* corto**, cinco fases del camino de Usera a Las Vegas (Usera, el piso de Fran, Zaragoza, la granja y Las Vegas contra la Penúltima). Al acabar, Fran abre los ojos en el bar, más desmadrado que antes. Continuará.

Los cuatro están en la misma escena desde el principio y se cambia de personaje con el selector, como en el capítulo 1. Cada paso lo hace quien tiene que hacerlo (Fran pide la ronda, Chuchi la máquina, Guille la mueve, Pablo los fresquitos); con otro personaje, una frase propia que pide cambiar.

## Vero

Camarera del Brío, personaje no jugable. Cubana, joven, alta, guapa, piel morena, labios grandes, pelo moreno recogido; camiseta negra de manga corta, delantal corto oscuro y aros pequeños. Habla con cariño y retranca («mi amor», «mi niño», «mi vida», «chico», «¿oíste?»). En los textos habla como `VERO:`.

- Arte: `src/arte/personajes/vero.mjs`, con la misma forma que los cuatro (`body`, `headFront`, `INFO`, `JOINTS`, `OUTFITS`) y el cuerpo de la segunda versión.
- En el bar está detrás de la barra (`spots.vero`); la barra que la tapa de cintura para abajo es un objeto del suelo (`props`), que se ordena por profundidad con los personajes. Está a la izquierda de la torre de grifos (X 1520) para que no la tape. En la porra, Fran juega el 5 y su casilla dice «Patxi» en rojo con un corazón (`NUM_FRAN` en `bar.mjs`). Al empezar el capítulo cada uno lleva lo que acabó el 1 (`OBJETOS_FIN_CAPITULO1`, `capitulo2.ts`): Fran móvil y llaves, Pablo tijeras, Chuchi zapato, Guille nada.

## El bar: escenas `bar0` a `bar6`

`src/arte/escenas/bar.mjs` exporta `escena(nivel)` (0–6; del 4 al 6 están más abajo, después del Pang). Las cuatro tienen la misma distribución y las mismas zonas; cambia la paleta y lo que el sueño deforma. El `id` de cada una es `bar0`…`bar3`. Subir de nivel es cargar la siguiente (`vecinas` la hornea por adelantado); solo hay un bar horneado en pantalla.

| Nivel | Cuándo | Qué cambia en el horneado |
|---|---|---|
| 0 | Al entrar | El Brío de siempre |
| 1 | Tras las cañas | Casi nada horneado; el número que se mueve en la porra es una pieza viva |
| 2 | Tras los fresquitos | Colores más saturados y botellas reordenadas por colores |
| 3 | Tras el canto | Paredes y líneas curvadas, la porra llena de sietes, paleta de sueño |

**Zonas** (ids fijos; nombres en `zona.c2.<id>`): `puerta`, `tabaco`, `barra`, `grifos`, `expositor`, `estanteria`, `tele`, `porra`, `tragaperras`, `bano`.

**Spots** (ids fijos): `vero` (`X`, `y`), `fran`, `pablo`, `chuchi`, `guille` (`X`, `y`, `face`: dónde está cada uno en la barra al empezar), `entrada` (`X`: donde arranca la cámara), `tragaperras` (`X`, `y`: dónde se pone quien la usa), `tragaperrasSeparada` (`X`, `y`: dónde queda la máquina separada de la pared).

**Props**: `barra` (frente de la barra, por delante de Vero y por detrás de los cuatro), `tragaperras` (`si: '!c2.separada'`) y `tragaperrasFuera` (`si: 'c2.separada'`), `duro` (`si: 'c2.duroVisible'`).

**Piezas vivas** (se pintan encima del decorado horneado, en `src/capitulos/bar-vivo.ts`, `dibujarBarVivo(g, ctx, capa, nivel)`): la pantalla de la tele (en el nivel 2, el dragón de Usera), las luces de la tragaperras (solo con `c2.encendida`), el número de la porra que cambia de casilla (desde el nivel 1), las tapas que respiran (nivel 2 y 3) y el giro lento de unas pocas piezas (nivel 3). Todo pasado a imagen una vez.

## Las bebidas de los cuatro (`src/capitulos/bebidas.ts`)

Revisión de Jesús (octubre de 2026): en el bar los cuatro llevan una **caña** en la mano de delante, beben y van a la barra a por otra. Tras los **fresquitos** (`c2.fresquitos`) la caña pasa a ser un **gin tonic** (copa balón con hielo, rodaja y pajita) para todos. Los vasos (`src/arte/vasos.mjs`, siete niveles de bebida) son bitmaps hechos una vez (`src/motor/vasos.ts`, `VasoEnMano`); el rig (`rig-runtime.mjs`: `agarre`, `bebe`, `vaso`) los lleva pegados a la mano, siempre derechos, y en un trago sube el brazo, echa la cabeza atrás e inclina el vaso hacia la boca. Por fotograma solo hay un temporizador y un número. Beben los que no juegan cada 5–9 s; el activo, solo si lo dejan quieto 6 s y nunca se acaba su vaso. Con el vaso vacío (y tras la ronda) el que no juega va a Vero, deja el vaso, coge otro y vuelve a su sitio; nunca se mueven solos durante diálogos, guiones ni cámara (`libre`). Niveles 4 a 6: solo sujetan el vaso; mundo de los conceptos y caos: nada. Prueba: `window.__bebidas` (`estado()`, `sorbo(id)`, `vaciar(id)`, `fijar(id, u)`). Los capturas están en `revision/tanda1/cervezas/`.

## El resto de la noche (después del Pang)

Jesús (23 de octubre de 2026): «según avanza la noche, el absurdo y visualmente el juego tiene que volverse loquísimo; el bar también tiene que transformarse y tiene que haber cambios de plano, la cámara [...] sobre todo la parte final». Orden del capítulo a partir del Pang: **Pang (Fran) → Alacant Sun (Pablo) → Impropios Kart (Chuchi) → Vero se traga a Fran → el mundo de los conceptos → el caos total → PokéUsera (Guille, el último juego, aparte)**. Space Invaders y Street Fighter quedan descartados. Hecho todo hasta el caos total; `elRestoDeLaNoche` (`src/capitulos/capitulo2.ts`) llega hasta el mundo de los conceptos y de ahí el jugador toca (`tocarConcepto` → `elCaos`); PokéUsera ya está dentro (`pokeusera(g)` en `elCaos`, justo antes del «Continuará»; ver su sección).

1. **Fran despierta en el bar 4** y cuenta el dragón (Usera, su piso, Las Vegas, La Penúltima). Los demás no le creen. Cortes y planos inclinados.
2. **La tragaperras gira sola** (la cámara viaja hasta su rincón) y **para en la cara de Pablo**, las tres ruedas, y se apaga. `mostrarTragaperras(root, { premio: false, cara: 'pablo' })`; el guion `GuionTragaperras.apagon` apaga las bombillas y funde a negro.
3. **Bar 5, el Brío del revés.** Vuelve el narrador del capítulo 1: la sombra de Pablo se despega de sus pies. «Esta historia la acabo yo.»
4. **La pantalla se pixela y se encoge hasta entrar en la consola** (`src/juego/pixelado.ts`, `entrarEnConsola`): el revés de la salida de Alacant Sun. Una instantánea del bar con los personajes (`Motor.instantanea`), un canvas pequeño que baja de resolución a golpes y una animación CSS que lo encoge, aplastado, sobre la pantalla de la consola, que esperaba debajo.
5. **Alacant Sun** (`jugarSol(root, { sonido })`, lanzado como el Pang: `g.pausado` y `minijuegoSuperado('sol')`; `'saltado'` y `'cancelado'` siguen igual). Al acabar, la consola se encoge y vuelve el bar.
6. **Pablo abre los ojos** en el bar («La vida es sueño...») con la cámara loca.
7. **Chuchi y el Impropios Kart** (`chuchiYElKart`, más abajo).
8. **Vero crece, se traga a Fran y los otros tres saltan detrás** (`veroTragaAFran`, bar 6 y la boca).
9. **«Una más»** (minijuego, `src/conceptos/`): Fran cae solo en el mundo de los conceptos; la noche sigue en el nivel 6 y, al volver, el bar de siempre. Después, el safari y el «Continuará».

Los primeros planos son el **plano manga** (más abajo): estilo C de Jesús, el que eligió entre tres pruebas («lo más reconocible posible»).

### Chuchi y el Impropios Kart (`chuchiYElKart`)

1. El móvil de Chuchi vibra (el jefe, a las tantas), «me voy ya, de verdad», y Fran contesta con **«¡UNA MÁS!»** en plano manga (`@manga chuchi:cara:seriedad fran:cara:enfado !gogogo`, luego `fran:ojos:enfado chuchi:ojos:duda !don`).
2. La tragaperras gira sola otra vez y **para en la cara de Chuchi** (`mostrarTragaperras(root, { premio: false, cara: 'chuchi' })`, como con la de Pablo).
3. **El suelo se estira y se convierte en la pista** (`src/juego/pista.ts`, `entrarEnPista(g, lanzar)`), como `entrarEnConsola`, pero en vez de encogerse la instantánea del bar (`Motor.instantanea`) se tumba en perspectiva (`rotateX`), gira (`rotateZ`) y se agranda hasta fundirse con la pista (Web Animations API, solo CSS); nada se dibuja por fotograma.
4. **`jugarKart`** (`src/kart/kart.ts`, ver `capitulo2/impropios-kart.md`), lanzado como el Pang: `g.pausado`, `g.minijuegoSuperado('kart')` solo con `'hecho'`; `'saltado'` y `'cancelado'` siguen igual.
5. Chuchi vuelve a la barra con la copa («Hecho. Una carrera contra todos vosotros y yo, el primero»; los cinco rivales son Fran, Pablo, Guille, Fer y Viñas, decididos por Jesús el 25 de octubre de 2026, y sus pilotos se dibujan en `src/kart/pilotos.ts` y `arte.ts`), Vero le pone otra y Fran: «¡Una más! ¡Lo sabía!».

### Vero se traga a Fran (`veroTragaAFran`, bar 6 y `src/ui/boca.ts`)

- **Nivel 6, `bar6`** (`construir6` en `bar.mjs`): el bar del nivel 5 recoloreado a una paleta «tragada» (`tragado`, encima de la del revés); misma geometría, así que se hornea como los demás. Vero crece de verdad detrás de la barra (`Actor.crece`, un factor de escala que `crecer` sube en ~2 s) mientras hablan.
- **La boca** (`abrirBoca(root, { sonido, rapido })` → `{ abre, tragaFran, saltan, bucea, fundir, cerrar }`): el plano del tráiler (`dibujarVero`, `src/ui/trailer.ts`) a mitad: la boca se abre del todo (`abre`), Fran sube en arco y desaparece dentro (`tragaFran`), los otros tres saltan detrás (`saltan`) y la cámara se lanza dentro (`bucea`) hasta el negro; tras `bucea`, el negro lo cubre la pantalla de «Una más» (`boca.cerrar()` justo después de lanzar el juego; `fundir` ya no se usa en el capítulo). **Nada de medallones de retrato** (24 de octubre de 2026): entran como personas (el cuerpo entero de siempre, `silueta` de `src/motor/sprites.ts`) y, **al cruzar los dientes, se rompen** en tiras de su cuerpo y en trozos de los colores de su figura, que salen disparados y **se recomponen dentro, en la oscuridad, en su figura** (**pieza a pieza**: cada trozo de la figura nueva sale volando desde el cruce de los dientes, con su retraso y su arco, y se coloca en su sitio; ver «Los cuatro, hechos figura» más abajo), que se queda flotando con un resplandor de su color y respirando como en el mundo de los conceptos. Fran hace lo mismo al ser tragado. Cuerpos y figuras son bitmaps hechos una vez; el fotograma dibuja la boca, esos bitmaps y unos cuantos rellenos de canvas. La boca, cuando está quieta, se pinta una vez en un lienzo aparte y cada fotograma solo lo copia (10 → 44 fps con SwiftShader). El gancho `window.__boca()` da `{ fase, u }` (`u`: segundos de la fase) para sacar fotos a mitad del salto. La capa va por debajo del cuadro de diálogo y el guion habla entre fase y fase.

### «Una más» (`veroTragaAFran` → `jugarUnaMas`, `src/conceptos/`)

Cambio de Jesús (27 de octubre de 2026): el puzle de tocar conceptos, el caos de cortes de estilo, el dinosaurio con «???» y PokéUsera **ya no están en el capítulo 2**; los sustituye un solo minijuego, **«Una más»**, un metroidvania (diseño en `capitulo2/conceptos-metroidvania.md`; el código y sus textos, `src/textos/conceptos.md`, son de `src/conceptos/`). En él Fran cae solo en el mundo de los conceptos, rescata a Guille, Chuchi y Pablo (que se meten en su jarra) y vence a LA ÚLTIMA, un dinosaurio de cerveza; al final se encoge a jarra y Guille la atrapa en su tarro («Este es mío»).

- **Flujo** (`veroTragaAFran`): igual que antes hasta `boca.bucea()`; luego `g.pausado`, `cargarModulo('unamas')` (precargado en `programarPrecarga`), `jugarUnaMas(g.root, { sonido, rapido })` y `boca.cerrar()` (la pantalla del juego, con z-index 10, queda por encima del negro de la boca). `g.minijuegoSuperado('unamas')` solo con `'hecho'`; `'saltado'` y `'cancelado'` siguen igual.
- **Vuelta al bar** (`vueltaAlBar`): los cuatro en sus sitios de `bar6` (Vero con su tamaño de siempre: `irA` rehace los NPC), diálogo `c2.unamas.vuelta` (Guille con su tarro y la jarra-dinosaurio dentro, Vero lo comenta) que enlaza con el safari. La noche se queda en el nivel 6; ya no hay niveles 7 y 8 ni escena `conceptos`.
- **Quitado** (27 de octubre): `conceptos-vivo.ts`, `conceptos-fondo.ts`, `escenas/conceptos.mjs`, `src/juego/estilos.ts` (los cortes), los textos `c2.conceptos.*`, `c2.concepto.*`, `c2.figura.*`, `c2.caos.*`, `c2.pokeusera.*` y los objetivos y pistas de conceptos. Se conserva `conceptos-rig.ts` y `src/arte/conceptos*.mjs` (la boca y «Una más» usan las figuras). **PokéUsera sigue en el repositorio como juego aparte** (`?pokecap`, `pokeusera.html`) pero ya no sale del capítulo ni se precarga.
- **Menú de minijuegos**: «Una más» sale como Pang, Alacant Sun y el Kart (`SUELTOS`, `jugarSuelto`) una vez superado en la historia (`minijuego.unamas`, `minijuegos.suelto.unamas` en `interfaz.md`); también se abre suelto con `?unamas`.
- **Pruebas**: `scripts/capitulo2.mjs` lo cierra con `window.__unamas().cerrar()` (acaba como `'cancelado'`: no hay gancho para terminarlo como `'hecho'`). `node scripts/rendimiento.mjs unamas`.

### El safari y el final (`veroTragaAFran` → `safari(g)`, `src/ui/safari*.ts`)

Final del capítulo (24 de octubre de 2026, pedido de Jesús): tras «Una más» y con el Ultimosaurio en su tarro, **Guille (guía de safari titulado: ver `docs/PERSONAJES.md`) propone un safari en su caravana** (diálogo `c2.safari.propone`, en `capitulo2.md`) y el viaje se cuenta como un **cómic con movimiento**: cuatro páginas de 2 o 3 viñetas que entran una a una (deslizándose, cayendo, girando, asomando), cada una con su propia animación barata, y al final la tarjeta **«¿Continuará?»** (`c2.fin.continuara`; no se toca `fin.continuara`, que es la del capítulo 1) con el pasodoble. `safari(g)` hace `jugarSafari(g.root, { rapido, sonido })` (`src/ui/safari.ts`) → `'hecho' | 'saltado' | 'cancelado'`: con cualquiera sigue a `fin(g)` (la historia no espera al cómic) y `g.capituloSuperado(2)`. Se hace después de PokéUsera y de `c2.pokeusera.vuelve`.

- **Lenguaje del cómic**: papel crema con fibra, tinta marrón oscuro (`TINTA` de `safari-dibujo.ts`, nunca negro), paleta cálida, sombras de **trama de puntos** (media tinta), calles claras entre viñetas, **bordes con personalidad** (recto, redondo, ondulado en el océano, dientes en el cañón, marquesina de bombillas en Las Vegas). **Nadie sale dibujado**: solo la caravana (la camioneta con la caravana del tráiler, con baca, equipaje, rueda de repuesto y banderín: `src/ui/vehiculo-pintura.ts` + `crearVehiculoComic` en `safari-base.ts`). Los **bocadillos salen de la ventana de la caravana** (la cola apunta siempre a ella, la cámara hace un travelling lento con zoom sobre ese punto, así que la cola no se despega) y rebotan al aparecer; las **cartuchas** del narrador («Madrid, M-30. Seis y media de la mañana.», «Tres días después... África.», «Kilómetro 4.000»); las **onomatopeyas** están dibujadas, no tecleadas (fuente de trazos de `safari-dibujo.ts`): ¡BRUM!, ¡FIUUU!, ¡PIIIII!, ¡PRRRUUU!, ¡PLAF!, ¡CRAC!, ¡CHIRRRR!. Los bocadillos pueden llevar `dura` (se esfuman pasados esos segundos: en el diploma, para no tapar el dibujo).
- **Páginas y parajes** (datos en `PAGINAS`, `safari.ts`; cada `escena` es un `Constructor` de `safari-escenas.ts`): **1** M-30 al amanecer (capas con parallax, coches y humo, `safari-m30.ts`), los Monegros (aerogeneradores girando, el toro negro, el cierzo, una bola de matorral; `safari-campo.ts`) y el mapa que se va volando por la ventana; **2** la sabana africana (jirafas con el cuello que se balancea, un elefante que llega a la carrera y trompetea cuando suena la bocina, acacias y un Kilimanjaro; `safari-africa.ts`, bichos en `safari-fauna.ts`) y el diploma de Guille pegado con cinta aislante en la ventana rota; **3** el Atlántico de noche, con la caravana flotando, un pulpo gigante que da un manotazo (`¡PLAF!`) y la luna enorme, y el cartel de «Kilómetro 4.000» con una gaviota (`safari-mar.ts`); **4** las rocas rojas del Oeste (un cactus al que la baca le arranca un brazo: `¡CRAC!`) y el desierto de Nevada al atardecer, con el perfil de Las Vegas (la pirámide con su haz de luz, la torre, la esfera, la aguja y un cartel de «LAS VEGAS»), un cartel de neón gigante con **«La Penúltima»** y la caravana frenando en seco (`safari-oeste.ts`) hasta quedarse quieta con los faros encendidos.
- **Ritmo y mando**: cada página dura lo que se tarda en leerla (los bocadillos van saliendo con su hora); **un toque lleva al siguiente elemento al momento** y, con todo puesto, pasa la página (giro en perspectiva); «Saltar» (como en los minijuegos) y ✕. La música sigue siendo la del juego: `granjaRadio` en el viaje y, al entrar la última viñeta, el **pasodoble** (que sigue sonando en «¿Continuará?»); `sonido.tono/ruido` para el efecto de cada onomatopeya.
- **Cómo está hecho (rendimiento)**: todo el decorado se hornea **una vez** (capas como `Tile` que se repiten sin costura y se desplazan a su velocidad, imágenes sueltas que se giran con transformaciones: ruedas, aspas, cuello de la jirafa, trompa y oreja del elefante, tentáculos del pulpo, rayos del sol...), el lienzo de cada viñeta solo hace `drawImage` por fotograma (a 1,5× como mucho) y los bocadillos, cartuchas y onomatopeyas son imágenes horneadas movidas con CSS (`transform`/`opacity`) y la API de animaciones web. Cada página se hornea mientras se lee la anterior (viñeta a viñeta, dejando hueco entre una y otra). Nada de SVG por fotograma; bucle con tope de 60 fps; con el móvil de pie se pausa (`esVertical()`).
- **Pruebas**: `?safari` (suelto; `&pagina=N` empieza en la página N, de 1 a 4, `&rapido`); `window.__safari()` → `{ pagina, listo, tp, fotogramas, cerrar(), ir(n, t) }` (`ir`: salta a la página `n` —desde 0— en su segundo `t`, con todo lo anterior ya puesto). `scripts/capitulo2.mjs` pasa por el safari **en tiempo real** (saca una captura por página y otra al llegar a Las Vegas, comprueba que pinta fotogramas y que la tarjeta dice «¿Continuará?»; con `SAFARI_OUT=<carpeta>` copia ahí esas capturas). `node scripts/rendimiento.mjs safari` mide las cuatro páginas.

### La cámara loca (`src/juego/camara.ts`)

Una sola transformación CSS sobre `Motor.escenario` (el contenedor de los lienzos y los personajes): nada de filtros por fotograma ni SVG dibujado de nuevo; el bucle (solo mientras algo se mueve) va a 60 fps como mucho y la transformación se quita en un plano normal. La interfaz (diálogo, selector) no se inclina. Desde el guion: `g.plano.holandes(10, 600)`, `await g.plano.barrido('pablo')`... Desde los textos, líneas que empiezan por `@` entre dos de diálogo:

| Marca | Qué hace |
|---|---|
| `@holandes 10 600` | Plano holandés: 10 grados, en 600 ms (`@nivelar` lo endereza) |
| `@zoom pablo 2.4` | Zoom de golpe a la cara de alguien o a una zona (`@zoom tragaperras 1.8`); con ms, empujón lento |
| `@corte chuchi 2.6 -7` | Corte seco a otro encuadre, con inclinación; `@corte general` vuelve al plano abierto |
| `@contrapicado 14` | Contrapicado (`@picado` al revés) |
| `@barrido vero 1.8` | Barrido: el plano se va en rayas y vuelve sobre Vero; espera a aterrizar |
| `@temblor 14 700` | Sacudida que se apaga en 700 ms |
| `@foco tragaperras` | La cámara de verdad viaja hasta ahí (el bar es más ancho que la pantalla) y espera; `@foco libre` |
| `@girar 2 7000` | La toma entera da 2 vueltas en 7 s y acaba derecha (el caos) |
| `@espera 400` | Espera |
| `@manga pablo:ojos:suplica vero:boca !gogogo` | Plano manga (más abajo); `@manga fin` o cualquier otra marca de encuadre vuelve al plano de siempre |

### El plano manga (`src/juego/manga.ts`, `src/arte/anime/manga*.mjs`)

Una a tres viñetas inclinadas **a color** (color plano con sombreado de anime con la paleta del juego: pieles, pelos, iris y ropa de las paletas `C` de `src/arte/personajes`; línea marrón oscura, nunca negro; fondos en tonos del bar con contraste moderado; bordes dorados como los botones; onomatopeyas doradas y rojo ladrillo; la trama solo queda como un brillo muy suave de puntos). Jesús pidió el color el 24 de octubre de 2026: el blanco y negro de alto contraste le parecía demasiado raro. Las viñetas ocupan la pantalla y entran de golpe con un corte (un empujón de 190 ms y un fogonazo, solo CSS) mientras el diálogo sigue en su cuadro (el resto de la interfaz se oculta). El dibujo es un módulo puro de cadenas SVG; el juego lo **hornea una vez a bitmap** (`svgABitmap`, a la resolución de la pantalla, 3 planos guardados como mucho) y pone ese lienzo quieto: nada por fotograma, sin filtros.

- **Marca:** `@manga pablo:ojos:suplica vero:boca chuchi:cara:sorpresa !gogogo`. Cada viñeta es `personaje:tipo:expresión` (la expresión es opcional; sin ella, la primera del personaje). Personajes: `pablo fran chuchi guille vero sombra` (la sombra de Pablo: negro con ojos blancos; sin manos). Tipos: `cara`, `ojos` (franja estrecha), `boca`, `mano`. Expresiones: Pablo `suplica sorpresa seriedad risa`; Fran `enfado sorpresa triste risa`; Chuchi `sorpresa duda seriedad risa` (con `seriedad`, las gafas brillan y tapan los ojos); Guille `risa sorpresa nervioso seriedad`; Vero `picara sorpresa risa seriedad`; sombra `burla seriedad`. Onomatopeyas dibujadas: `!gogogo` (ゴゴゴ), `!don` (ドン), `!ha` (ハハハ) y `!zas` (la palabra, ¡ZAS!, está en `manga.ono.zas` de `capitulo2.md` y se dibuja con un alfabeto de trazos). `solo`: se va al acabar la siguiente línea de diálogo.
- **Cuándo vuelve el plano de siempre:** `@manga fin`, otra `@manga`, o cualquier marca que cambie el encuadre (`@corte`, `@zoom`, `@barrido`, `@general`...). Al acabar el guion también se quita.
- **Reparto de las viñetas:** una, a toda pantalla; dos, en columnas inclinadas; tres, en tres columnas, o, si hay unos `ojos`, los ojos arriba a la izquierda, la alta a la derecha y la tercera abajo a la izquierda (la tapa en parte el cuadro de diálogo).
- **Hoja de revisión:** `node tools/anime/manga-hoja.mjs` (todos los personajes y expresiones) o `node tools/anime/manga-hoja.mjs salida.png "pablo:ojos:suplica vero:boca !gogogo"` (un plano de 844×390).
- **En el guion** (`capitulo2.md`): tras el premio gordo (nivel 3, corto y `solo`); el dragón de Fran y la incredulidad de Chuchi (nivel 4, tres planos); los ojos de Pablo y los ojos blancos de la cara de la tragaperras; la sombra narradora; y Pablo al despertar con «La vida es sueño».

### Los bares 4 y 5 (`escena(4)` y `escena(5)`)

Mismas zonas y mismos puntos que los demás (las zonas y los sitios se mueven con las piezas), horneados una vez, sin filtros.

- **Bar 4, el bar con luces de discoteca** (simplificado el 25 de octubre de 2026; antes era un pasillo de 5 700 con la barra interminable y el suelo inclinado). Mide 3 000 como los demás: es el bar del nivel 3 (líneas curvadas, la porra de sietes, las botellas que giran) con la paleta ácida (`pasillo`: magenta, lima, verde azulado, azul eléctrico y violeta sobre grises índigo), `construir(4)` con `esSueno`. La tragaperras sigue en su sitio y las cámaras `@holandes`/`@contrapicado` del guion ponen lo torcido.
- **Bar 5, del revés.** La pared está volteada (el techo abajo, los azulejos arriba), la barra, los taburetes y las botellas cuelgan del techo (capa `colgante`), las lámparas de techo son lámparas de pie y el suelo que pisan es un techo de escayola con sus fluorescentes. Paleta del revés (`reves`: luces oscuras, oscuros claros, tonos opuestos).
- Las piezas vivas (`src/capitulos/bar-vivo.ts`) del nivel 5 van volteadas (`volteo`).
- Al subir del 4 en adelante los cuatro vuelven a sus sitios de la barra.

## Minijuegos y piezas a pantalla completa

Todos con la forma de los del capítulo 1 (`src/ui/rana.ts`, `cerdos.ts`): una cubierta `.cubierta.minijuego`, la franja de objetivo y el botón «Saltar» dorado tras dos rondas perdidas, bucle con tope de 60 fps y gancho de prueba `window.__<nombre>()` con `fotogramas`.

- `src/ui/canas.ts`: `jugarCanas(root, { rapido, sonido }) → Promise<'hecho' | 'saltado' | 'cancelado'>`. Vero desliza cañas por la barra; un toque frena cada una delante de quien la espera.
- `src/ui/canto.ts`: `jugarCanto(root, { rapido, sonido }) → Promise<Resultado>`. Las caras de los cuatro se iluminan a golpe de música; tocar a cada uno a tiempo para que cante su parte (Pablo «Ca-mio», Fran «neees-y», Chuchi «ca-ra», Guille «va-naaas»).
- `src/ui/tragaperras.ts`: `mostrarTragaperras(root, { premio, rapido, sonido }) → Promise<void>`. La máquina de cerca: sin premio para en limón, campana y cerdo; con premio, tres sietes (o, con `cara`, tres caras: la de Fran en el premio gordo) y lluvia de monedas; con `cantada`, el sonido del tonillo. Reaprovecha el dibujo del tráiler.
- `src/pang/` (traído de la rama `claude/pang-cyc-56o0iv`, sin el juego en red): `jugarPangCapitulo(root, { rapido, sonido }) → Promise<Resultado>`. Solo Fran, **cinco fases** (`FASES_CAPITULO`, `src/pang/capitulo.ts`): Usera (la 1 del juego completo), el piso de Fran (3), **Zaragoza** (9, el cierzo sopla las burbujas), **la granja** (6, con las pacas de paja; en el juego completo es el jefe el Peor, aquí son dos burbujas de purín) y Las Vegas con la Penúltima (12), que sigue siendo la última. La 4.ª era Nevada con la caravana y Jesús la cambió por la granja el 25 de octubre de 2026; se elige en un único sitio (`FASE_CUATRO`, `capitulo.ts`). Suavizadas como las otras: 150 s, dos burbujas medianas (14 impactos, como el piso en vez de los 45 del Zaragoza del juego completo), más lentas (×0,8 y ×0,7) y el cierzo a media fuerza (`cierzo: 0.5`). La Penúltima tiene 24 de vida en el Pang corto y 40 en el completo (18 y 30 hasta el 25 de octubre de 2026, que Jesús la encontró demasiado fácil). Mientras dura el Pang corto, la música del bar no vuelve entre fases (`Sound.retener`). Con `fase` se salta a cada una (0 a 4). Empieza con la espuma de la caña llenando la pantalla.
- `src/pang/completo.ts`: `jugarPangCompleto(root, { sonido, volumenes })`, el Pang entero (título, los cuatro amigos, las doce fases y su guardado). Ver el apartado siguiente y `docs/PANG.md`.

## Minijuegos para rejugar (menú de minijuegos)

Jesús (24 de octubre de 2026): «una vez se supera ese minijuego, en el menú tendrá que estar disponible el Pang completo que ya creamos. No solo estas 5 fases. Similar para el Alacant Sun [...] y lo mismo con el Impro Kart». En el menú de minijuegos (`menuMinijuegos`, `src/main.ts`) salen tres filas más, **solo cuando se ha superado cada uno en la historia** (`partida.progreso.minijuegos.pang | sol | kart`, que marca `g.minijuegoSuperado(id)`; mientras el capítulo 2 siga oculto no salen). Se juegan **enteros** (no en la versión sin fin y sin récord de los del capítulo 1), como `jugarKartSuelto` hacía con el Kart, y al salir o cerrar vuelve el menú (`jugarSuelto`):

| Fila | Qué abre | Guardado |
|---|---|---|
| **Pang** (Fran) | **El Pang completo**, no las cinco fases: `jugarPangCompleto` (`src/pang/completo.ts`), con título y demo, elegir a uno de los cuatro, las doce fases de Usera a Las Vegas, récords y ajustes. Sin el modo online (no hay servidor en GitHub Pages): no hay `src/pang/red/` ni «Jugar online». El menú del Pang tiene un último botón, «Volver a los minijuegos» (también Esc), y la pausa tiene «Salir al menú» | El suyo (`cyc.pang.v1`: fase más alta, récords y volúmenes), que sigue de una vez a otra |
| **Alacant Sun** (Pablo) | `jugarSol` entero, desde el cuarto de Pablo | `jugarSol` no guarda nada (no usa `localStorage`), así que cada vez empieza de cero: es lo más sencillo y coherente con la historia |
| **Impropios Kart** (Chuchi) | `jugarKart`, una carrera suelta | Ninguno |

Para que las filas salgan de verdad, `g.onProgreso` de `main.ts` ya **apunta los minijuegos ganados en el capítulo 2** (`?capitulo2`) en `partida.progreso` (antes salía sin apuntar nada); los capítulos superados siguen sin apuntarse. Atajos de prueba: `?pangcompleto` abre el Pang entero suelto (con `&fase=N`, `&pj=fran|pablo|chuchi|guille` y `&bot` juega esa fase y las siguientes sin menús), `?sol` y `?kart`.

## Textos y música

- `src/textos/capitulo2.md`: todo el texto del capítulo 2 (formato de `capitulo1.md`). `src/textos/pang.md`: los del *Pang*.
- Música: `brio` (el rock del bar, por dentro) y `brioSueno` (el mismo, deformado, para los niveles 2 y 3), en `src/sonido/musica.ts`.

## Cómo se juega mientras no está publicado

Con `?capitulo2` en la dirección se juega el capítulo 2 desde el principio, con su propia partida guardada aparte; el capítulo 1 no cambia. `node scripts/capitulo2.mjs` (contra `npm run dev`) lo juega entero una vez, por toques, y saca capturas (con `FINAL_OUT=<carpeta>` copia ahí las del tramo final: Chuchi y el Kart, la boca, «Una más» y la vuelta al bar); salta el Kart, Alacant Sun y Una más con `window.__kart().cerrar()`, `window.__sol().cerrar()` y `window.__unamas().cerrar()`; si cambias el puzle, actualízalo. Enlazarlo con el final del capítulo 1 queda para cuando Jesús lo apruebe.

## Rendimiento

`node scripts/rendimiento.mjs bar canas canto tragaperras pang manga kart pokecap safari boca unamas pangcompleto`; el bloque `safari` mide cada una de las cuatro páginas del cómic del final en su tramo más movido (en el SwiftShader del ordenador baja a unos 10 fotogramas/s —el tráiler, que es lo más parecido, da de 13 a 23—: lo que cuenta es que no falle y que se compare entre ejecuciones); el bloque `pang` mide el piso, Zaragoza, la granja y la Penúltima del Pang corto, `pangcompleto` (recarga la página con `?capitulo2`, al final) la Penúltima y el título con su demo del Pang completo (contados con `window.__pangFase()`), el bloque `bar` mide también los niveles 4, 5 y 6, `boca` la boca de Vero abierta (con las personas esperando) y con las cuatro figuras flotando, `unamas` el metroidvania con su jefe (estos dos y `pangcompleto` recargan la página con `?capitulo2` donde hace falta y van al final), `tragaperras` la cara de Pablo con el apagón y `manga` tres planos manga sobre el bar 4 (con lo que tarda en hornearse cada uno) (con `PUERTO=` si el servidor no está en el 5173). Mismas reglas que el resto (`docs/ESTILO.md`, T5 y T6).
