# Jugabilidad · Camiones y Caravanas

Decisiones de diseño para que una aventura gráfica con minijuegos funcione en un móvil.

## Plataforma

- **Juego web** que se abre con un enlace y se puede añadir a la pantalla de inicio. No pasa por tiendas de apps y funciona en iPhone y Android.
- **Solo en horizontal.** En vertical aparece un aviso para girar el móvil, porque iPhone no deja bloquear la orientación.
- **Autoguardado** en el propio navegador tras cada acción.

## Point and click en pantalla táctil

| Problema | Solución |
|---|---|
| No hay «pasar el ratón por encima» | El botón del ojo enseña todas las zonas interactivas durante unos segundos |
| Nueve verbos no caben en un móvil | **Un toque** hace la acción lógica (ir, usar, hablar). **Mantener pulsado** examina, con un anillo que se va llenando |
| El dedo tapa lo que tocas | Zonas táctiles con margen extra, y un rótulo con el nombre de lo que has tocado |
| Usar objetos | La bolsa (abajo a la derecha) se despliega con tarjetas grandes; tocas el objeto y luego el destino. El ojo pequeño de cada tarjeta lo examina. Mientras llevas un objeto, un aviso arriba dice «Usar … en…» y tocarlo lo suelta |
| Aprender a jugar | La primera vez que hace falta cada gesto aparece una ayuda corta abajo («Mantén el dedo sobre algo para mirarlo») |
| Elegir con quién empezar | Pantalla con los cuatro de frente, en tarjetas grandes, y una frase con su situación. Sale al empezar y cada vez que alguien termina su historia |
| Varios amigos | Columna de retratos grandes a la izquierda (al menos 52 px, el activo más grande y con su color). Tocar a otro lleva a su historia, donde la dejaste, como en *Day of the Tentacle*. Cada uno tiene su bolsa, su reloj y sus frases (`clave.pablo` en los textos gana a `clave` cuando juegas con Pablo). Quien ya va de camino al Río sale apagado y con una ✓ |
| Acabar una historia | Fundido a negro antes de llegar al bar y un rótulo («Pablo ya va de camino al Río · Faltan…»). Con los cuatro de camino, escena final: llegan a la vez |
| Usar algo contigo | Eliges el objeto en la bolsa y tocas a tu propio personaje (vestirse, abrir un tarro, mirar el móvil) |
| Dar cosas a otro amigo | Tocas el objeto y luego al amigo |
| Atascarse | La bombilla da una pista según el punto de la historia |
| Un amigo delante de una puerta | Para hablar con un amigo hay que tocarle la cabeza o los hombros; el resto del cuerpo deja pasar el toque a lo que haya detrás |

## Reglas de los minijuegos

1. **Un solo gesto:** tocar a tiempo, deslizar, arrastrar, mantener o inclinar.
2. **Duración según el minijuego** (decidido el 3 de octubre de 2026: no hay un límite fijo) y reintento inmediato.
3. **Se puede saltar** tras dos fallos, para que nadie se quede sin ver la historia.
4. **El giroscopio siempre tiene alternativa táctil.** iPhone pide permiso con un toque, y algunos navegadores o marcos lo bloquean.
5. **Nunca se pide inclinar el móvil mientras hay texto que leer.**
6. **Se ajustan con un simulador** antes de probarlos (`node scripts/ronda-sim.mjs`). El listón: sin tocar nada se pierde, con reflejos normales (0,2–0,3 s) se gana y con reflejos lentos (0,4 s) se queda al límite.

### El tarro (piloto)

Abrir el tarro de aceitunas girando el dedo alrededor de la tapa. En frío no pasa de un tercio de vuelta y la tapa se resbala; con agua caliente se abre a la vuelta y media. Se puede cerrar con la ✕ y volver a intentarlo cuando se quiera.

### La ronda (aparcada)

Llevar cuatro cañas de la barra a la terraza inclinando el móvil o deslizando el dedo. Estaba en el mockup; volverá cuando la crew esté en el Río, con el arte nuevo.

### Ideas para otros minijuegos

Son ejemplos de controles, para sustituirlos por vuestras anécdotas:

- **Cortar palabras** (Pablo) y **apilar cerdos** (Guille): en `docs/ESCENA-1.md`.
- **Duelo de pullas** al estilo de los insultos con espada de *Monkey Island*.
- **Karaoke** de ritmo, tocando a tiempo.
- **El último metro:** deslizar para esquivar por Usera.
- **Aparcar la caravana:** arrastrar con cuidado.

## El piloto (capítulo 1)

Se elige con quién empezar y se puede cambiar cuando se quiera (ver `docs/ESCENA-1.md`). Las historias de Pablo, Chuchi y Guille son provisionales: tocar el objeto de su habitación y salir por la puerta.

### La historia de Fran

Fran se despierta de la siesta a las 20:35 y había quedado a las 21:00 en el Bar del Río. Cada paso enseña una mecánica:

1. **Tocar** para despertarle.
2. **Mirar** (mantener pulsado) el reloj: se da cuenta de la hora.
3. **Coger** el móvil: el grupo de WhatsApp presenta a los demás.
4. **La puerta** está cerrada con llave: la pareja se ha ido de finde y la ha echado por fuera.
5. Las llaves no están en el cuenco: **Aceituna** está tumbada encima y no se mueve.
6. En la mesa solo quedan huesos; en la nevera hay un **tarro de aceitunas**.
7. **Usar el tarro contigo** abre el minijuego, pero en frío no se abre. **Usar el tarro en el grifo** lo calienta.
8. Con el tarro caliente se abre: las aceitunas salen volando, Aceituna va a por ellas y deja las llaves a la vista.
9. Para salir falta vestirse: la **ropa** está tendida en la terraza. **Usarla contigo** cambia el vestuario de Fran.
10. Sale a la calle y **anda** hacia el Río. Al pasar el cruce lo ve y se funde a negro: ya va de camino.

El reloj de Fran avanza con cada paso y se va poniendo nervioso. Cuando los cuatro van de camino, llegan a la vez a la terraza del Río y termina el piloto.

**Todos los textos son provisionales** y se cambian en `src/textos/capitulo1.md`.

## Siguientes pasos

- Escribir las historias de Pablo, Chuchi y Guille cuando llegue el contexto del grupo (ideas en `docs/ESCENA-1.md`).
- Probar el piloto en los móviles de los cuatro con «Ver rendimiento» activado.
- Publicarlo en un sitio estable (Netlify, Cloudflare Pages o GitHub Pages) para el giroscopio.
