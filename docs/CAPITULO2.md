# Capítulo 2 · El arranque (especificación)

Decidido con Jesús entre el 16 y el 21 de octubre de 2026. El guion y el planteamiento completos están en la carpeta del proyecto (`capitulo2/planteamiento.md`, `capitulo2/guion-arranque.md`, `capitulo2/plan-arte.md`); aquí está lo que el código necesita para que las piezas encajen.

## La historia del arranque

La noche se cuenta **en orden**. Empieza en la puerta del Bar del Brío, donde acabó el capítulo 1: un texto del narrador sobre la fachada, la cámara entra y los cuatro están en la barra. Puzle a cuatro, «Una moneda para la tragaperras»:

1. Chuchi quiere irse. Fran pide otra ronda a Vero: **minijuego de las cañas por la barra**. Sube el nivel de la noche a 1.
2. La tragaperras está «fuera de servicio». Chuchi la reinicia «como el router», pero el enchufe está detrás. Guille la separa de la pared y detrás aparece **un duro de 1987** (objeto de la bolsa).
3. La máquina no acepta pesetas. Pablo convence a Vero para los **fresquitos** (conversación con tres opciones; las dos malas tienen respuesta propia). Nivel 2.
4. Ahora sí, la máquina se traga el duro. Tirada sin premio (limón, campana, cerdo).
5. Pablo se arranca con un pasodoble y le salen dos palabras. **Minijuego del canto a cuatro**: «¡Camioneees y caravanaaas!». Nivel 3. **Premio gordo**: tres sietes y lluvia de monedas.
6. Zoom a Fran, que cierra los ojos. La espuma de su caña llena la pantalla y empieza **el *Pang* corto** (Usera, el piso de Fran y Las Vegas contra la Penúltima). Al acabar, Fran abre los ojos en el bar, más desmadrado que antes. Continuará.

Los cuatro están en la misma escena desde el principio y se cambia de personaje con el selector, como en el capítulo 1. Cada paso lo hace quien tiene que hacerlo (Fran pide la ronda, Chuchi la máquina, Guille la mueve, Pablo los fresquitos); con otro personaje, una frase propia que pide cambiar.

## Vero

Camarera del Brío, personaje no jugable. Cubana, joven, alta, guapa, piel morena, labios grandes, pelo moreno recogido; camiseta negra de manga corta, delantal corto oscuro y aros pequeños. Habla con cariño y retranca («mi amor», «mi niño», «mi vida», «chico», «¿oíste?»). En los textos habla como `VERO:`.

- Arte: `src/arte/personajes/vero.mjs`, con la misma forma que los cuatro (`body`, `headFront`, `INFO`, `JOINTS`, `OUTFITS`) y el cuerpo de la segunda versión.
- En el bar está detrás de la barra (`spots.vero`); la barra que la tapa de cintura para abajo es un objeto del suelo (`props`), que se ordena por profundidad con los personajes.

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

## El resto de la noche (después del Pang)

Jesús (23 de octubre de 2026): «según avanza la noche, el absurdo y visualmente el juego tiene que volverse loquísimo; el bar también tiene que transformarse y tiene que haber cambios de plano, la cámara [...] sobre todo la parte final». Orden del capítulo a partir del Pang: **Pang (Fran) → Alacant Sun (Pablo) → Impropios Kart (Chuchi) → Vero se traga a Fran → el mundo de los conceptos → el caos total → PokéUsera (Guille, el último juego, aparte)**. Space Invaders y Street Fighter quedan descartados. Hecho todo hasta el caos total; `elRestoDeLaNoche` (`src/capitulos/capitulo2.ts`) llega hasta el mundo de los conceptos y de ahí el jugador toca (`tocarConcepto` → `elCaos`); el hueco del PokéUsera está marcado con `// POKEUSERA:` en `elCaos`, justo antes del «Continuará».

1. **Fran despierta en el bar 4** y cuenta el dragón (Usera, su piso, Las Vegas, La Penúltima). Los demás no le creen. Cortes y planos inclinados.
2. **La tragaperras gira sola** (la cámara viaja hasta el fondo del pasillo) y **para en la cara de Pablo**, las tres ruedas, y se apaga. `mostrarTragaperras(root, { premio: false, cara: 'pablo' })`; el guion `GuionTragaperras.apagon` apaga las bombillas y funde a negro.
3. **Bar 5, el Brío del revés.** Vuelve el narrador del capítulo 1: la sombra de Pablo se despega de sus pies. «Esta historia la acabo yo.»
4. **La pantalla se pixela y se encoge hasta entrar en la consola** (`src/juego/pixelado.ts`, `entrarEnConsola`): el revés de la salida de Alacant Sun. Una instantánea del bar con los personajes (`Motor.instantanea`), un canvas pequeño que baja de resolución a golpes y una animación CSS que lo encoge, aplastado, sobre la pantalla de la consola, que esperaba debajo.
5. **Alacant Sun** (`jugarSol(root, { sonido })`, lanzado como el Pang: `g.pausado` y `minijuegoSuperado('sol')`; `'saltado'` y `'cancelado'` siguen igual). Al acabar, la consola se encoge y vuelve el bar.
6. **Pablo abre los ojos** en el bar («La vida es sueño...») con la cámara loca.
7. **Chuchi y el Impropios Kart** (`chuchiYElKart`, más abajo).
8. **Vero crece, se traga a Fran y los otros tres saltan detrás** (`veroTragaAFran`, bar 6 y la boca).
9. **El mundo de los conceptos** (nivel 7): hay que encontrar a Fran.
10. **El caos total** (nivel 8) al pedir «la última»; después, el hueco del PokéUsera y el «Continuará».

Los primeros planos son el **plano manga** (más abajo): estilo C de Jesús, el que eligió entre tres pruebas («lo más reconocible posible»).

### Chuchi y el Impropios Kart (`chuchiYElKart`)

1. El móvil de Chuchi vibra (el jefe, a las tantas), «me voy ya, de verdad», y Fran contesta con **«¡UNA MÁS!»** en plano manga (`@manga chuchi:cara:seriedad fran:cara:enfado !gogogo`, luego `fran:ojos:enfado chuchi:ojos:duda !don`).
2. La tragaperras gira sola otra vez y **para en la cara de Chuchi** (`mostrarTragaperras(root, { premio: false, cara: 'chuchi' })`, como con la de Pablo).
3. **El suelo se estira y se convierte en la pista** (`src/juego/pista.ts`, `entrarEnPista(g, lanzar)`), como `entrarEnConsola`, pero en vez de encogerse la instantánea del bar (`Motor.instantanea`) se tumba en perspectiva (`rotateX`), gira (`rotateZ`) y se agranda hasta fundirse con la pista (Web Animations API, solo CSS); nada se dibuja por fotograma.
4. **`jugarKart`** (`src/kart/kart.ts`, ver `capitulo2/impropios-kart.md`), lanzado como el Pang: `g.pausado`, `g.minijuegoSuperado('kart')` solo con `'hecho'`; `'saltado'` y `'cancelado'` siguen igual.
5. Chuchi vuelve a la barra con la copa («Hecho. Una carrera, cinco desconocidos y yo, el primero»), Vero le pone otra y Fran: «¡Una más! ¡Lo sabía!».

### Vero se traga a Fran (`veroTragaAFran`, bar 6 y `src/ui/boca.ts`)

- **Nivel 6, `bar6`** (`construir6` en `bar.mjs`): el bar del nivel 5 recoloreado a una paleta «tragada» (`tragado`, encima de la del revés); misma geometría, así que se hornea como los demás. Vero crece de verdad detrás de la barra (`Actor.crece`, un factor de escala que `crecer` sube en ~2 s) mientras hablan.
- **La boca** (`abrirBoca(root, { sonido, rapido })` → `{ abre, tragaFran, saltan, bucea, fundir, cerrar }`): el plano del tráiler (`dibujarVero`, `src/ui/trailer.ts`) a mitad: la boca se abre del todo (`abre`), Fran sube en arco y desaparece dentro (`tragaFran`), los otros tres saltan detrás y al entrar **se deshacen en trozos de su color** (`saltan`) y la cámara se lanza dentro (`bucea`) hasta el negro; `fundir` lo sustituye por el mundo de los conceptos. Las caras son fichas (`crearFicha`) hechas una vez; la boca, cuando está quieta, se pinta una vez en un lienzo aparte y cada fotograma solo lo copia (10 → 44 fps con SwiftShader). La capa va por debajo del cuadro de diálogo y el guion habla entre fase y fase.

### El mundo de los conceptos (nivel 7, escena `conceptos`)

Ya no es un bar: un **vacío de colores** (`src/arte/escenas/conceptos.mjs`, fondo en degradado con tres manchas de color; mide 2 400 de ancho pero la cámara se queda quieta y cabe entera en pantalla). Lo que flota se pinta en vivo (`src/capitulos/conceptos-vivo.ts`, `dibujarConceptos`) con **bitmaps hechos una vez** (`prepararConceptos`, que se llama mientras suena la boca; `liberarConceptos` al acabar): solo `drawImage` con traslación, giro y escala por fotograma.

- **Los conceptos** son objetos con su palabra debajo (la palabra va en `capitulo2.md`, `c2.concepto.*`, y se pinta en el bitmap con la letra de la página): `MAÑANA` (una puerta que intenta abrirse), `CASA` (una casita que se aleja justo cuando la miras), `LA PENÚLTIMA` (una caña que late), `EL TRABAJO` (papeles con un correo urgente que vibra), `LAS TANTAS` (el reloj derretido, que se mece) y `EL NO` (una palabra enorme que rebota). Cada uno tiene su chiste al tocarlo (`c2.conceptos.<id>`).
- **Los cuatro, hechos figura** (`src/arte/conceptos.mjs`, nada de caras; cada uno con los colores de su paleta `C` y un rasgo): Pablo, una **espiral** marrón de borreguillo con el aro del pendiente girando alrededor; Chuchi, una **bola** calva con la sudadera granate en diagonal y sus gafas posadas torcidas en el borde, con la aguja del reloj detrás; Guille, una **flor** alta de pétalos mostaza con hibiscos rojos y hojas; Fran, una **jarra** verde azulada con la espuma oscura de su barba y una cinta infinita («UNA MÁS»); y Vero, **la boca dorada** que envuelve todo (los labios arriba y abajo, que respiran). En los diálogos salen los retratos de siempre, no las figuras (decisión del agente, a confirmar con Jesús).
- **Fondo:** 44 formas abstractas (círculos, anillos, triángulos, cruces...) en paralaje, hechas una vez por tipo y color y giradas/escaladas en vivo.
- **Puzle (pocos toques):** tocar conceptos y figuras da chistes (`c2.figura.*`); tras tres conceptos, alguien señala **la jarra que no deja de decir «una más»** (`c2.conceptos.pista`). Tocar la jarra de **Fran** (que va vagando) lo encuentra (`c2.fran.hallado`) y aparece, solo su contorno, **LA ÚLTIMA** (`revelarUltima`). Tocar LA ÚLTIMA lanza el caos. Las zonas de toque se recolocan cada fotograma sobre cada pieza (`z.u`, `z.top`, `z.bottom`).
- Música `brioSueno`; `fpsReposo` 60 en esta escena; `.sin-reparto` esconde el selector de personajes (los del motor están ocultos).

### El caos total (nivel 8, `elCaos`)

Decir «la última» lo rompe todo: **cortes rápidos entre estilos** (`src/juego/estilos.ts`, `prepararCortes(g, bar, marcaManga) → { iniciar, parar, estilos, mostrar, liberar }`): el mundo normal, la foto del bar de antes, **plano manga**, **píxeles de Alacant Sun** (240 px, posterizado), **píxeles del Pang** (384 px, 16 colores) y **lápiz** (bordes de Sobel y rayado). Cada uno se hornea **una sola vez** a un lienzo que vive dentro de `Motor.escenario` (gira con la cámara) y un corte es solo quitar y poner `hidden`. A la vez: la cámara da vueltas (`@girar`), el color de fondo recorre el arco iris, las piezas van a ×2,6, la **silueta de un dinosaurio** con «???» encima se levanta al fondo (el «userito mitológico») y, al final, **Guille, hecho flor, da un paso al frente con su jarra: «Este es mío.»**. Marcas nuevas en los textos (`c2.caos.*`): `@girar 2 7000` (la cámara da 2 vueltas en 7 s y acaba derecha), `@caos on|off|dino|guille`. Ahí está el hueco del PokéUsera (`// POKEUSERA:` en `elCaos`): de esa frase saldrá el juego; hasta entonces viene el «Continuará».

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
| `@foco tragaperras` | La cámara de verdad viaja hasta ahí (el bar 4 es más largo que la pantalla) y espera; `@foco libre` |
| `@girar 2 7000` | La toma entera da 2 vueltas en 7 s y acaba derecha (el caos) |
| `@caos on` | Solo `c2.caos.*`: `on`/`off` los cortes de estilo, `dino` sube el dinosaurio, `guille` adelanta a Guille con su jarra |
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

- **Bar 4, el pasillo.** Mide 5 700 (los demás, 3 000): el centro del bar (estantería, porra, barra, taburetes, tubos y lámparas) se repite tres veces; la puerta y la máquina de tabaco quedan en un extremo y la tele, la tragaperras y el baño en el otro. La barra no se acaba: cinco módulos que salen de la escena por los dos lados. **El suelo está inclinado** (cizalla vertical, `INCL`): todo lo estático se inclina y, para que los pies sigan en el suelo, el motor levanta a los personajes con `Escena.pendiente` (`Motor.alzada`; los toques sobre el suelo y la cámara loca lo tienen en cuenta). Paleta ácida (`pasillo`).
- **Bar 5, del revés.** La pared está volteada (el techo abajo, los azulejos arriba), la barra, los taburetes y las botellas cuelgan del techo (capa `colgante`), las lámparas de techo son lámparas de pie y el suelo que pisan es un techo de escayola con sus fluorescentes. Paleta del revés (`reves`: luces oscuras, oscuros claros, tonos opuestos).
- Las piezas vivas (`src/capitulos/bar-vivo.ts`) siguen a su copia de la pared: `desp` (dónde está cada copia), `inclina` (la pendiente) y `volteo`.
- Al subir a estos niveles los cuatro vuelven a sus sitios de la barra (los bares tienen tamaños distintos).

## Minijuegos y piezas a pantalla completa

Todos con la forma de los del capítulo 1 (`src/ui/rana.ts`, `cerdos.ts`): una cubierta `.cubierta.minijuego`, la franja de objetivo y el botón «Saltar» dorado tras dos rondas perdidas, bucle con tope de 60 fps y gancho de prueba `window.__<nombre>()` con `fotogramas`.

- `src/ui/canas.ts`: `jugarCanas(root, { rapido, sonido }) → Promise<'hecho' | 'saltado' | 'cancelado'>`. Vero desliza cañas por la barra; un toque frena cada una delante de quien la espera.
- `src/ui/canto.ts`: `jugarCanto(root, { rapido, sonido }) → Promise<Resultado>`. Las caras de los cuatro se iluminan a golpe de música; tocar a cada uno a tiempo para que cante su parte (Pablo «Ca-mio», Fran «neees-y», Chuchi «ca-ra», Guille «va-naaas»).
- `src/ui/tragaperras.ts`: `mostrarTragaperras(root, { premio, rapido, sonido }) → Promise<void>`. La máquina de cerca: sin premio para en limón, campana y cerdo; con premio, tres sietes y lluvia de monedas. Reaprovecha el dibujo del tráiler.
- `src/pang/` (traído de la rama `claude/pang-cyc-56o0iv`, sin el juego en red): `jugarPangCapitulo(root, { rapido, sonido }) → Promise<Resultado>`. Solo Fran, fases de Usera, el piso de Fran y Las Vegas con la Penúltima; empieza con la espuma de la caña llenando la pantalla.

## Textos y música

- `src/textos/capitulo2.md`: todo el texto del capítulo 2 (formato de `capitulo1.md`). `src/textos/pang.md`: los del *Pang*.
- Música: `brio` (el rock del bar, por dentro) y `brioSueno` (el mismo, deformado, para los niveles 2 y 3), en `src/sonido/musica.ts`.

## Cómo se juega mientras no está publicado

Con `?capitulo2` en la dirección se juega el capítulo 2 desde el principio, con su propia partida guardada aparte; el capítulo 1 no cambia. `node scripts/capitulo2.mjs` (contra `npm run dev`) lo juega entero una vez, por toques, y saca capturas (con `FINAL_OUT=<carpeta>` copia ahí las del tramo final: Chuchi y el Kart, la boca, el mundo de los conceptos y el caos); salta el Kart y Alacant Sun con `window.__kart().cerrar()` y `window.__sol().cerrar()`; si cambias el puzle, actualízalo. Enlazarlo con el final del capítulo 1 queda para cuando Jesús lo apruebe.

## Rendimiento

`node scripts/rendimiento.mjs bar canas canto tragaperras pang manga kart boca conceptos caos`; el bloque `bar` mide también los niveles 4, 5 y 6, `boca` la boca de Vero abierta, `conceptos` el mundo quieto y con Fran hallado y el dinosaurio, `caos` los cortes de estilo con la cámara girando (estos tres recargan la página con `?capitulo2` y van al final), `tragaperras` la cara de Pablo con el apagón y `manga` tres planos manga sobre el bar 4 (con lo que tarda en hornearse cada uno) (con `PUERTO=` si el servidor no está en el 5173). Mismas reglas que el resto (`docs/ESTILO.md`, T5 y T6).
