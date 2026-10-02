# Escena 1 · Casa de Fran y calle de Usera

Encargo del 2 de octubre de 2026, con las referencias del grupo (plano del piso, foto del Bar del Río y foto del dragón de Usera). Las fotos son solo referencia y no están en el repositorio.

## Historia (arranque)

- Empieza en **casa de Fran**, solo. Se despierta de una siesta en el sofá.
- Comparte piso con una pareja que nunca está. Su perra, **Aceituna** (negra, pequeña y muy maja), es de la pareja, pero quien la cuida es Fran. Está por el piso.
- La salida a la calle está **a la derecha del todo** del piso.
- **Primer objetivo:** conseguir que los demás lleguen a la primera quedada en Usera. El grupo todavía no se llama Camiones y Caravanas; el nombre llega después.
- El primer puzle o minijuego del piso está pendiente de que el grupo lo explique.

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

## Fase 2: que vayan llegando (ideas)

Fran ya está en el Río y no hay nadie. Cada amigo está atascado en su sitio y el selector permite saltar a él, como en *Day of the Tentacle*:

- **Chuchi:** las niñas no se duermen. Minijuego de cuento o nana, y escaparse sin que se despierten. Si además le llaman del trabajo por algo urgente, peor.
- **Pablo:** atrapado en un ensayo de impro que no acaba, o en un cortejo de camino al bar. Necesita una salida dramática bien escrita.
- **Guille:** viene de pesar cerdos y huele a purín. Su novia no le deja salir hasta ducharse, y se ha acabado el gel.
- **Fran,** desde la terraza, usa el móvil para ir desbloqueándolos («échate otra caña» como argumento universal).

## Pendiente

- Confirmar el nombre: «Bar del Río» (el del toldo) o «Bar El Río».
- Foto de Aceituna para ajustar su aspecto.
- Hora del despertar. Se ha supuesto que anochece (sobre las 20:35, el reloj de la cocina) y que la calle ya es de noche.
- Nombres reales de las calles, si se quieren en las placas. Ahora solo pone «USERA».
- La luz con relieve en WebGL2 está hecha pero aplazada: apagada por defecto, se prueba con `?relieve` en la dirección. Opciones pendientes: dejarla, más suave o solo en los personajes.
