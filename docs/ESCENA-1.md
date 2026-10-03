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
| Pablo | Su piso: atrapado en su propia narración, con bloqueo de escritor | Provisional (diseño abajo) |
| Chuchi | Encerrado en un parque de bolas cuando ya se han ido todos | Provisional (por pensar) |
| Guille | Una granja a las afueras de Madrid: pesar cerdos y quitarse el olor | Provisional (diseño abajo) |

Las historias provisionales son una habitación genérica (`src/arte/escenas/provisional.mjs`) con un objeto que apunta a la historia y una puerta: tocar el objeto y salir. Están para probar la estructura de principio a fin hasta que el grupo dé el contexto de cada una.

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
3. **El soborno:** Aceituna solo se mueve por aceitunas. En la mesa solo quedan huesos; en la nevera hay un tarro que no hay quien abra. Con agua caliente se abre de golpe y las aceitunas salen volando.
4. **Va en calzoncillos de corazones:** su pantaloneta está tendida en la terraza.

El paso a paso y las mecánicas que enseña están en `docs/JUGABILIDAD.md`.

## Otras ideas para el arranque

Se pueden cambiar por la actual o sumarse:

- **La pantaloneta centrifugando.** Está en la lavadora y la puerta se ha bloqueado con el programa más largo del mundo. Fran tiene que engañar a la lavadora: bajar el diferencial, encontrar la contraseña del wifi para la app de la pareja... Sin pantaloneta no sale.
- **Aceituna no le deja irse.** Se planta en la puerta con ojos tristes. Fran tiene que montarle su propio plan de jueves: la tele con «Saber y ganar», un calcetín suyo que huela a él y su pelota escondida en el sofá.
- **El móvil sin batería.** El cargador lo ha mordisqueado Aceituna y sin móvil no puede avisar de que llega tarde. Fran tiene que sacar batería de donde sea: el tocadiscos, la lámpara de arco, el telefonillo.

## Las otras tres historias (en diseño)

Cada historia sigue el mismo patrón que la de Fran: **llegar → puzle de objetos → minijuego → salida** hacia el Río. Hablado el 3 de octubre de 2026; nada implementado todavía.

### Pablo · Atrapado en su propia narración

- **Lugar:** su piso (comparte con dos compañeros). Distribución y estilo, pendientes del grupo.
- **El narrador:** una **sombra con la silueta de Pablo** que le lleva la contraria («Pablo intentó abrir la puerta. La puerta estaba cerrada. Siempre lo estuvo»).
- **Puzle de objetos:** sencillo, para seguir usando la bolsa: cargar de papel la máquina de escribir. El narrador asegura que no hay papel en toda la casa. Idea sin cerrar: acabar escribiendo en papel higiénico, o quitárselo a un compañero de piso.
- **La trama:** Pablo está pensando un formato nuevo de impro y tiene bloqueo de escritor. Tras discutir un rato con el narrador, la batalla final decide si se desbloquea.
- **Minijuego · Cortar palabras** (estilo *Fruit Ninja*):
  - Caen palabras sobre un fondo onírico, el espacio abstracto donde se construye la narración en la cabeza de Pablo. Las lanza el narrador.
  - Se deslizan los dedos para **cortar las negativas** («no», «sí, pero», «negar», «bloquear», «dudar»…) y **dejar pasar las positivas** («sí, y», «aceptar», «adaptar», «avanzar»…), en el sentido de la impro.
  - **Dos categorías y nada más.** «Sí, pero» es negativa.
  - **Colores:** al principio, negativas en rojos y naranjas, positivas en verdes y azules. Más adelante los colores se mezclan para despistar (una negativa en verde).
  - **Ritmo:** primero pocas palabras, luego cada vez más. Se lee, no son solo reflejos: palabras grandes y como mucho 3 o 4 en pantalla.
  - **Fallar:** una barra de bloqueo sube si cortas una positiva o si una negativa llega abajo; si se llena, se repite.
  - **Duración:** ni muy corto ni muy largo (unos 45–60 s en fases).
  - **Las listas de palabras se editan en `src/textos/`**, una por categoría.

### Guille · Pesando cerdos

- **Lugar:** una granja a las afueras de Madrid, con el skyline de Madrid al fondo. No sale nadie más.
- **Antes del minijuego:** un mini puzle de objetos para poder pesar (idea: la báscula no tiene pilas y las pilas están en la radio de las jotas; sin música, los cerdos se ponen nerviosos).
- **Minijuego · Apilar cerdos** (estilo *Tower Bloxx*): va tarde, así que los pesa todos a la vez.
  - Los cerdos, de distintos tamaños, cuelgan balanceándose de una polea y se toca para soltarlos **encima de la báscula**.
  - Si caen descentrados, la torre se tambalea más; si se pasan del borde, se cae.
  - Objetivo: unos 10 cerdos. La aguja de la báscula sube con cada uno.
- **Después, el olor a cerdo:** tiene que ducharse o fabricarse una colonia **combinando dos o tres objetos** en la bolsa (mecánica nueva, por ejemplo alcohol del botiquín + romero + agua de la manguera). Idea: moscas siguiéndole hasta que se quita el olor.

### Chuchi · Atrapado en un parque de bolas

- Se ha despistado y se ha quedado encerrado en un parque de bolas tope guay, con muchos elementos: se han ido todos y solo queda él. Las niñas no salen.
- Por pensar (el grupo): por qué se queda dentro, el puzle de objetos y el minijuego. Ideas sobre la mesa: buscar en la piscina de bolas apartándolas con el dedo, la máquina de gancho de la entrada y bajar el tobogán gigante. El parque es vertical (redes, tubos, toboganes): dos alturas o dos escenas.

### Final del capítulo 1

Los cuatro llegan a la vez a la terraza y **entran en el Bar del Río**. Ahí acaba el capítulo 1; el capítulo 2 empieza dentro del bar.

## Pendiente

- Foto de Aceituna para ajustar su aspecto.
- Hora del despertar. Se ha supuesto que anochece (sobre las 20:35, el reloj de la cocina) y que la calle ya es de noche.
- Nombres reales de las calles, si se quieren en las placas. Ahora solo pone «USERA».
- La luz con relieve en WebGL2 está hecha pero aplazada: apagada por defecto, se prueba con `?relieve` en la dirección. Opciones pendientes: dejarla, más suave o solo en los personajes.
