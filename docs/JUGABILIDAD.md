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
| Usar objetos | La bolsa (abajo a la derecha) se despliega; tocas el objeto y luego el destino. Mantener pulsado un objeto lo examina |
| Varios amigos | Retratos arriba a la izquierda para cambiar de personaje, como en *Maniac Mansion*. Cada amigo tiene su inventario y sus frases |
| Dar cosas a otro amigo | Tocas el objeto y luego al amigo |
| Atascarse | La bombilla da una pista según el punto de la historia |
| Un amigo delante de una puerta | Para hablar con un amigo hay que tocarle la cabeza o los hombros; el resto del cuerpo deja pasar el toque a lo que haya detrás |

## Reglas de los minijuegos

1. **Un solo gesto:** tocar a tiempo, deslizar, arrastrar, mantener o inclinar.
2. **Entre 15 y 30 segundos** y reintento inmediato.
3. **Se puede saltar** tras dos fallos, para que nadie se quede sin ver la historia.
4. **El giroscopio siempre tiene alternativa táctil.** iPhone pide permiso con un toque, y algunos navegadores o marcos lo bloquean.
5. **Nunca se pide inclinar el móvil mientras hay texto que leer.**
6. **Se ajustan con un simulador** antes de probarlos (`node scripts/ronda-sim.mjs`). El listón: sin tocar nada se pierde, con reflejos normales (0,2–0,3 s) se gana y con reflejos lentos (0,4 s) se queda al límite.

### La ronda (demo)

Llevar cuatro cañas de la barra a la mesa de la terraza. La bandeja se va inclinando por las rachas de aire, el paso y los charcos, y hay que corregir hacia el lado contrario, inclinando el móvil o deslizando el dedo. Si se inclina más de unos 11°, la cerveza se derrama. Hacen falta al menos dos cañas para ganar, y tres estrellas piden casi no derramar.

### Ideas para otros minijuegos

Son ejemplos de controles, para sustituirlos por vuestras anécdotas:

- **Duelo de pullas** al estilo de los insultos con espada de *Monkey Island*.
- **Karaoke** de ritmo, tocando a tiempo.
- **El último metro:** deslizar para esquivar por Usera.
- **Aparcar la caravana:** arrastrar con cuidado.

## La demo (capítulo 1)

1. Intro: los tres llegan al bar y está lleno.
2. Objetivo: conseguir mesa en la terraza. La única libre está empapada.
3. El bazar 24h vende rollo de cocina, pero hace falta efectivo, y solo Pablo lleva monedas. Se resuelve cambiando a Pablo o pidiéndole las monedas.
4. Con el rollo se seca la mesa y se pide la ronda: minijuego.
5. Brindis y tarjeta de fin de la demo.

**Todo el texto del capítulo 1 es provisional:** solo sirve para probar las mecánicas. El guion de verdad saldrá de vuestras anécdotas.

## Siguientes pasos

- Probar la demo en los móviles de los cuatro con «Ver rendimiento» activado.
- Fotos del cuarto amigo.
- Guion y anécdotas reales para el capítulo 1.
- Publicarlo en un sitio estable (Netlify, Cloudflare Pages o GitHub Pages) para que el giroscopio funcione fuera de la vista previa.
- Escribir los diálogos en Ink, para que el guion se pueda editar sin tocar código.
