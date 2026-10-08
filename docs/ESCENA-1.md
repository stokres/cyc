# Escena 1 · Casa de Fran y calle de Usera

Encargo del 2 de octubre de 2026, con las referencias del grupo (plano del piso, foto del Bar del Río y foto del dragón de Usera). Las fotos son solo referencia y no están en el repositorio.

El bar se llama **Bar del Río**. En los rótulos pone «BAR DEL RIO», en mayúsculas y sin tilde, como en el toldo.

## Estructura del capítulo 1: cuatro historias que acaban en el Río

Decidido el 2 de octubre de 2026:

- **Al empezar se elige con quién:** Fran, Pablo, Chuchi o Guille. Cada uno tiene su propia historia, en su sitio, con sus puzles y su reloj.
- **Se puede cambiar de personaje en cualquier momento** desde la columna de la izquierda; cada uno sigue donde lo dejaste. Si te atascas con uno, sigues con otro. Ningún puzle depende de que otro personaje haga algo antes.
- **Al terminar su historia, cada uno se funde a negro antes de llegar al bar,** con un rótulo («Fran ya va de camino al Río») y una marca ✓ en el selector. Ya no se puede jugar con él.
- **Cuando van los cuatro,** escena final en la terraza del Río: llegan a la vez desde sitios distintos, cada uno convencido de que era el último, y entran en el bar. Ahí acaba el capítulo 1.
- El grupo de WhatsApp puede servir de hilo común y de pista suave entre historias (pendiente).

| Quién | Dónde empieza | Estado |
|---|---|---|
| Fran | Su piso; se ha quedado dormido en el sofá | Hecha (el puzle de abajo); acaba al ver el Río desde el cruce |
| Pablo | El backstage del teatro Joso: sin papel, bloqueado y discutiendo con su sombra | Hecha |
| Chuchi | Bolilandia, un parque de bolas: encerrado a oscuras, sin gafas, buscando el zapato de la pequeña | Hecha |
| Guille | Una granja a las afueras de Madrid: pesar cerdos y quitarse el olor | Hecha |

**Pendiente del grupo** para escribirlas: dónde empieza cada uno, quién más puede salir (novias, compañeros de piso, la pareja de Chuchi; si las niñas se oyen fuera de plano), anécdotas o frases reales, duración de cada historia, si cada uno trae algo que importe en el bar, y si el narrador de Pablo es un personaje con voz propia.

## Historia de Fran (arranque)

- Empieza en **casa de Fran**, solo. Se despierta de una siesta en el sofá.
- Comparte piso con una pareja que nunca está. Su perra, **Aceituna** (negra, pequeña y muy maja), es de la pareja, pero quien la cuida es Fran. Está por el piso.
- La salida a la calle está **a la derecha del todo** del piso.
- **Objetivo del capítulo:** que los cuatro lleguen a la primera quedada en Usera. El grupo todavía no se llama Camiones y Caravanas; el nombre llega después.

## Piso de Fran (`tools/escenas/piso.mjs`)

- **Distribución del plano**, de izquierda a derecha: cocina, frigorífico, chimenea, terraza y baño. Después van el recibidor y la puerta de la calle. A la izquierda se ve la puerta del dormitorio.
- **Primer plano:** la mesa frente a la cocina y el sofá frente a la chimenea, de espaldas a la cámara. Fran duerme en el sofá.
- **Capas, de fondo a frente:**
  1. Cielo y tejados al anochecer, que solo se ven por los cristales.
  2. La terraza.
  3. La pared.
  4. El suelo en perspectiva.
  5. Los personajes y los objetos del suelo.
  6. Los muebles de primer plano.
- **Luz:** anochece. Entra luz malva por la terraza, y dan luz cálida la chimenea, el aplique, la lámpara de arco y la lámpara del recibidor.

## Calle (`tools/escenas/calle.mjs`)

Es una calle larga (8.200 unidades, unas tres pantallas y media), de noche. De izquierda a derecha:

1. **Portal de Fran:** un edificio de ladrillo, una ventana con reja y una mercería cerrada con grafitis.
2. **Comercios:** una frutería con cajas en la acera y una bollería china con farolillos.
3. **Parque infantil grande**, con verja, árboles, bancos y farolas de bola. **El dragón chino** se ve al fondo, entre las traseras de los bloques vecinos.
4. **Esquina con farmacia** y **cruce** con paso de cebra. La calle transversal se ve en perspectiva real.
5. **Calle peatonal con el Bar del Río**, inspirado en la foto pero sin copiarla al detalle. Lleva toldo negro, cartel luminoso, carta de raciones, puerta azul a la izquierda y portal salmón con el 40 a la derecha. Delante tiene la **terraza**: mesas de aluminio y sillas de plástico negras.

**Marcas:** no se usan las de la foto (cerveza, café). En su lugar hay carteles genéricos.

## Cámara y profundidad (fase 3 del plan)

- **Modelo de cámara único.** La pared del fondo o las fachadas están a profundidad 1, y cada capa está a su profundidad real:
  - El parallax de cada capa es exacto.
  - Los objetos de una capa más cercana se colocan con `u = CX + k·(X − CX)`.
- **Suelo:** se dibuja con una cizalla, de modo que cada fila se mueve a su profundidad. Así es un suelo en perspectiva de verdad.
- **Paredes que se alejan** (calle transversal y medianeras del parque): se dibujan en tiras, una por profundidad.
- **Luz, como pide la guía (L4):**
  - Cada capa se pinta en «luz de día» y se hornea una vez multiplicada por su mapa de luz.
  - Las fuentes de luz se dibujan después.
  - Lo que cambia se anima en vivo: fuego, polvo en el aire, cruz de farmacia, tele del bar y algún coche al fondo.
- **Personajes:** reciben el tinte de la luz del sitio donde están.

## Puzle inicial (en el piloto)

Fran se ha quedado dormido y había quedado a las 21:00 en el Río. Lo que le impide salir:

1. **La puerta** está cerrada con llave por fuera: la pareja se ha ido de finde sin saber que él estaba en casa.
2. **Las llaves** no están en el cuenco: Aceituna está tumbada encima y no se mueve.
3. **El soborno:** Aceituna solo se mueve por comida, y no se rebaja a cogerla de la mano. En la nevera hay taquitos de jamón: Fran se los lanza a la boca desde el otro lado del salón (minijuego de la rana, `src/ui/rana.ts`, con su propio salón de lado en `src/arte/escenas/salon-rana.mjs`: el sofá, la lámpara de arco, la puerta de la terraza y la cama de Aceituna junto a la puerta). Con ocho dentro, se levanta.
4. **Va en calzoncillos de corazones:** su pantaloneta está tendida en la terraza.

El paso a paso y las mecánicas que enseña están en `docs/JUGABILIDAD.md`.

## Otras ideas para el arranque

Se pueden cambiar por la actual o sumarse:

- **La pantaloneta centrifugando.** Está en la lavadora y la puerta se ha bloqueado con el programa más largo del mundo. Fran tiene que engañar a la lavadora: bajar el diferencial, encontrar la contraseña del wifi para la app de la pareja... Sin pantaloneta no sale.
- **Aceituna no le deja irse.** Se planta en la puerta con ojos tristes. Fran tiene que montarle su propio plan de jueves: la tele con «Saber y ganar», un calcetín suyo que huela a él y su pelota escondida en el sofá.
- **El móvil sin batería.** El cargador lo ha mordisqueado Aceituna y sin móvil no puede avisar de que llega tarde. Fran tiene que sacar batería de donde sea: el tocadiscos, la lámpara de arco, el telefonillo.

## Las otras tres historias (en diseño)

Cada historia sigue el mismo patrón que la de Fran: **llegar → puzle de objetos → minijuego → salida** hacia el Río. Hablado el 3 de octubre de 2026; nada implementado todavía.

### Pablo · Atrapado en su propia narración (hecha)

- **Lugar:** el backstage del **teatro Joso** (parodia del teatro donde actúa la compañía; en el cartel, «Joso, Laboratorio Teatral» con un elefante en vez del búho), de noche y oscuro (`src/arte/escenas/backstage.mjs`).
- **De izquierda a derecha:** puerta de artistas bajo el cartel verde de SALIDA (la salida), el cartel del Joso, el perchero de vestuario con la mesita de las tijeras, un maniquí, el baúl de atrezo, tres maletas blancas, la mesa de Pablo con la máquina de escribir, el flexo y su cajón, la escalera, el cuadro de luces, el cañón de seguimiento y la pantalla de proyección, con las tres nubes de cojín delante y decorados viejos apoyados.
- **Guiños a la compañía de impro, sin nombrarla:** las tres nubes de cojín, las chaquetas y gorras de comandante de avión, los pañuelos turquesa y las maletas blancas.
- **El narrador es la sombra de Pablo:** al principio solo narra con `>`, mientras Pablo escribe; cuando empieza a llevarle la contraria y Pablo pregunta quién narra, se despega de sus pies y sale como Pablo en silueta oscura, siempre un paso detrás de él (anda algo más despacio y le alcanza al pararse). Se puede tocar para hablar con ella, y contesta según el momento de la historia. Tras ganar la batalla se mete otra vez bajo sus pies y desaparece de la escena: solo se la lee en los diálogos, ya a favor de Pablo. Habla como `SOMBRA:` en los textos, con un retrato de Pablo a oscuras, y también narra con `>` llevándole la contraria.
- **La historia, paso a paso** (`src/capitulos/pablo.ts`, textos `p.*`):
  1. Pablo escribe un formato nuevo de impro y la hoja se acaba a mitad de frase. El narrador: «no queda papel en todo el teatro».
  2. En el baúl hay un libreto de *La vida es sueño* impreso por una cara; en la mesita del vestuario, unas tijeras. **Juntados en la bolsa**: hojas sueltas, en blanco por detrás.
  3. Hojas en la máquina... y no escribe nada: bloqueado, y con el flexo no ve.
  4. El cuadro de luces enciende el **cañón de seguimiento**: su sombra salta a la pantalla de proyección, gigante, y empieza la batalla.
  5. Desbloqueado: termina el formato y sale por la puerta de artistas.
- **Minijuego · Cortar palabras** (`src/ui/palabras.ts`, estilo *Fruit Ninja*):
  - Caen palabras, inclinadas y girando, sobre un fondo onírico con letras que suben flotando. La sombra gigante de Pablo, al fondo, las lanza haciendo el histrión (`src/ui/sombra-histrionica.ts`): poses nuevas con brazos de araña, ojos brillantes y mueca, y números irreales (se estira hasta el techo, se derrite, gira como una peonza, se cuelga boca abajo, se divide en un coro de tres, hace reverencias burlonas). Cuando Pablo falla se parte de risa con ecos; a veces patalea cuando corta bien.
  - Se desliza el dedo para **cortar las negativas** y **dejar pasar las positivas**, en el sentido de la impro. Dos categorías y nada más: «sí, pero» es negativa.
  - **Tres fases** (unos 54 s): pocas palabras con colores honestos (negativas en rojos y naranjas, positivas en verdes y azules); más y más rápidas; y al final los colores se mezclan para despistar y las últimas caen todavía más deprisa.
  - **Fallar:** cortar una positiva o dejar caer una negativa sube la barra de bloqueo. Solo esa barra hace perder: con cinco fallos se repite. Cuando se llena la página se gana, aunque quede alguna palabra en el aire. Tras dos rondas perdidas se puede saltar.
  - **Las palabras se editan en `src/textos/capitulo1.md`**: `palabras.negativas` y `palabras.positivas`, separadas por barras.

### Guille · Pesando cerdos (hecha)

- **Lugar:** una granja a las afueras de Madrid al atardecer (`src/arte/escenas/granja.mjs`). Detrás de las vallas bajas se ven campos de secano y el skyline de Madrid: Cuatro Torres, KIO, Torre Picasso, el Pirulí, Edificio España y Torre de Madrid, con las balizas rojas parpadeando. No sale nadie más.
- **De izquierda a derecha:** el corral con los cerdos, la báscula del ganado, la nave (puerta corredera, radio en la ventana y botiquín), el grifo con la manguera, una mata de romero y el coche de Guille, que es la salida.
- **La historia, paso a paso** (`src/capitulos/guille.ts`, textos `g.*` en `capitulo1.md`):
  1. La báscula no tiene pilas.
  2. Las tiene la radio que suena con jotas. Sin música, los cerdos se ponen nerviosos.
  3. Pilas en la báscula y, al tocarla, el minijuego.
  4. Huele a cerdo: le siguen las moscas.
  5. Alcohol del botiquín y romero, **juntados en la bolsa** (mecánica nueva), más agua de la manguera: colonia de granja.
  6. Se echa la colonia y se va en el coche.
- **Minijuego · Apilar cerdos** (`src/ui/cerdos.ts`, estilo *Tower Bloxx*): va tarde, así que los pesa los **8** a la vez.
  - Cada cerdo cuelga balanceándose de una polea y se toca para soltarlo encima de la torre, sobre la báscula, que va sumando los kilos.
  - Si cae descentrado, la torre se tambalea más; si se sale del borde, resbala. Tres resbalones o un derrumbe y se repite; tras dos rondas perdidas se puede saltar.
  - **El peor, el último:** más grande, más pesado (152 kg) y no para de revolverse.
  - Los cerdos están en `src/arte/cerdos.mjs` (lámina: `node tools/personajes/cerdos.mjs`). Para ajustar la dificultad: `node scripts/cerdos-sim.mjs`.

### Chuchi · Atrapado en un parque de bolas

Decidido el 4 de octubre de 2026 (`src/capitulos/chuchi.ts`, escena `src/arte/escenas/parque.mjs`):

- **Bolilandia**, un parque de bolas de Usera, después del cumpleaños de una compañera de clase de la mayor. Su pareja se ha llevado a las niñas; la pequeña se ha ido con un solo zapato, **el de brilli-brilli**. Chuchi entra a buscarlo por el tubo del castillo y, cuando sale por el tobogán, han cerrado y han apagado las luces. Las niñas no salen: solo se notan sus trastadas.
- **De izquierda a derecha:** la salida con su persiana eléctrica y el cartel de SALIDA; **Robi**, el robot mascota, dormido en su peana; el zapatero; la recepción con el cartel de BOLILANDIA; la puerta de SOLO PERSONAL con la llave colgada muy alta; la mesa de la fiesta y la piñata; la red de las bolas; la estructura de redes con el tobogán de tubo y la piscina de bolas, y delante, en el suelo y a la derecha, el cañón de bolas: amarillo, sobre un carro rojo con dos ruedas azules y una tolva llena de bolas, bien separado del tobogán para que no se confundan. En la pared, un cielo pintado con arcoíris; en el suelo, colchonetas de colores.
- **El puzle:**
  1. **Sin gafas no ve nada:** la escena está lechosa y las cosas pequeñas no se pueden tocar. Las gafas están en la piscina de bolas: hay que rebuscar (sale antes un chupete y un calcetín). Hasta entonces Chuchi va sin ellas, entornando los ojos, en la escena y en su retrato (el vestuario `singafas` de `src/arte/personajes/chuchi.mjs`, que cambia la cabeza); al encontrarlas se las pone.
  2. La **persiana** es eléctrica y está a oscuras. El cuadro eléctrico está en el cuarto del personal, cerrado; la **llave cuelga de un gancho muy alto**, fuera del alcance de los niños (y de Chuchi).
  3. **La red de las bolas + el palo de la piñata**, empalmados con la cinta americana del mango, dan una red larguísima con la que pesca la llave.
  4. Llave → cuarto → palanca del cuadro: se encienden las luces, sube la persiana... y **Robi se despierta**, se planta delante de la salida con el zapato en la pinza y no deja salir a nadie «hasta que termine la fiesta».
  5. El **cañón de bolas** (minijuego) apaga a Robi, que vuelve a su peana y deja caer el zapato. Se recoge (hace luces) y se sale.
- **A oscuras:** un velo oscuro sobre toda la escena, menos donde llegan las luces de emergencia; sin gafas, además, los bordes lechosos. Va pintado con la capa fija de delante (solo se repinta si se mueve la cámara o cambia algo), no en cada fotograma.
- **Minijuego · El cañón contra Robi** (`src/ui/robot.ts`, homenaje al de *WarioWare* de disparar plátanos a una nariz gigante): desde detrás del cañón, se toca donde disparar. La bola tarda medio segundo en llegar, así que al botón luminoso de la cabeza de Robi hay que **apuntarle por delante**.
  - Seis aciertos y se apaga. En la cabeza o el cuerpo, la bola rebota; con el **gorrito de fiesta** bajado sobre el botón, también.
  - Robi se acerca poco a poco para darte un **abrazo de cumpleaños**: los fallos le acercan y los aciertos le echan atrás. Si llega, se repite; tras dos rondas perdidas se puede saltar.
  - Tres tramos según los aciertos: se balancea; más rápido, botando y con el gorrito; y en «modo fiesta total», a saltos y con el gorrito más a menudo.
  - Robi está en `src/arte/robot.mjs` (por piezas, para moverlas). Para ajustar la dificultad: `node scripts/robot-sim.mjs`.

### Final del capítulo 1

Los cuatro llegan a la vez a la terraza (cada uno con algo de su historia: Chuchi con el zapato de purpurina, Guille oliendo a romero) y, camino de la puerta, hablan de **Vero**, la camarera del cutis perfecto. **Entran en el Bar del Río** uno a uno, fundido a negro, el narrador («Lo que pasó dentro... es otra historia») y **«Continuará…»**. Después, la tarjeta de fin del capítulo 1. Ahí acaba el capítulo 1; el capítulo 2 empieza dentro del bar.

## Pendiente

- Foto de Aceituna para ajustar su aspecto.
- Hora del despertar. Se ha supuesto que anochece (sobre las 20:35, el reloj de la cocina) y que la calle ya es de noche.
- Nombres reales de las calles, si se quieren en las placas. Ahora solo pone «USERA».
- La luz con relieve en WebGL2 está hecha pero aplazada: apagada por defecto, se prueba con `?relieve` en la dirección. Opciones pendientes: dejarla, más suave o solo en los personajes.
