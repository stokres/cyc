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
| Hablar con alguien que no es del grupo | Se le toca, como a un amigo. En la historia de Pablo, su sombra (el narrador) le sigue y contesta según el momento |
| Varios amigos | Columna de retratos grandes a la izquierda (al menos 52 px, el activo más grande y con su color). Tocar a otro lleva a su historia, donde la dejaste, como en *Day of the Tentacle*. Cada uno tiene su bolsa, su reloj y sus frases (`clave.pablo` en los textos gana a `clave` cuando juegas con Pablo). Quien ya va de camino al Río sale apagado y con una ✓ |
| Acabar una historia | Fundido a negro antes de llegar al bar y un rótulo («Pablo ya va de camino al Río · Faltan…»). Con los cuatro de camino, escena final: llegan a la vez |
| Usar algo contigo | Eliges el objeto en la bolsa y tocas a tu propio personaje (vestirse, probar el jamón, mirar el móvil) |
| Dar cosas a otro amigo | Tocas el objeto y luego al amigo |
| Coger objetos | **Lo que se puede coger se puede coger siempre** (decidido el 3 de octubre de 2026), aunque todavía no se sepa para qué sirve; y también se puede juntar con otros. Nada se bloquea hasta «su momento» de la historia |
| Juntar dos objetos | Eliges uno en la bolsa, vuelves a abrirla y tocas el otro (alcohol + romero en la historia de Guille). Si no pegan, el personaje lo dice |
| Atascarse | La bombilla da una pista según el punto de la historia |
| Un amigo delante de una puerta | Para hablar con un amigo hay que tocarle la cabeza o los hombros; el resto del cuerpo deja pasar el toque a lo que haya detrás |

## Reglas de los minijuegos

1. **Un solo gesto:** tocar a tiempo, deslizar, arrastrar, mantener o inclinar.
2. **Duración según el minijuego** (decidido el 3 de octubre de 2026: no hay un límite fijo) y reintento inmediato.
3. **Se puede saltar** tras dos fallos, para que nadie se quede sin ver la historia.
4. **El giroscopio siempre tiene alternativa táctil.** iPhone pide permiso con un toque, y algunos navegadores o marcos lo bloquean.
5. **Nunca se pide inclinar el móvil mientras hay texto que leer.**
6. **Se ajustan con un simulador** antes de probarlos (`node scripts/ronda-sim.mjs`). El listón: sin tocar nada se pierde, con reflejos normales (0,2–0,3 s) se gana y con reflejos lentos (0,4 s) se queda al límite.

### La rana de Aceituna (Fran)

Lanzar taquitos de jamón a la boca de Aceituna de un extremo a otro del salón, como el juego de la rana de los bares (decidido el 4 de octubre de 2026). Control de **tirachinas**: se arrastra hacia atrás y se suelta; cuanto más largo el tirón, más fuerte el lanzamiento.

- **Física** (`src/ui/rana-fisica.mjs`): gravedad, rozamiento del aire y rebotes en el suelo, las paredes, el techo, el respaldo del sofá, el poste y el brazo de la lámpara de arco, y la pantalla de la lámpara, que cuelga del cable y se balancea como un péndulo si le das. En la cabeza o el hocico de Aceituna, rebota; en la boca abierta, se lo come.
- Hay dos caminos: un arco bajo, por debajo de la lámpara y por encima del sofá, y una bomba por encima de la pantalla.
- **Cuatro tramos, dos taquitos cada uno:** quieta; se menea de lado a lado; abre y cierra la boca; y entra corriente por la terraza, que empuja el jamón de lado (las cortinas, las hojas y una flecha lo enseñan). La línea de puntos que enseña la trayectoria se acorta en cada tramo.
- **Un paquete trae 24 taquitos.** Si tardas en tirar, Fran se come uno. Si se acaba el paquete antes de los ocho, se empieza otra vez con otro; tras dos rondas perdidas aparece «Saltar».
- Lo que cae al suelo, Aceituna no se lo come: es una señora.
- Se ajusta con `node scripts/rana-sim.mjs`, que mide para cada tramo cuánto espacio de tiro acierta y cuántas veces acierta una mano humana (±5 % de fuerza, ±2,5° y momento aleatorio).

### Las palabras (Pablo)

Cortar con el dedo las palabras negativas (en sentido de impro) que lanza el narrador y dejar pasar las positivas. Tres fases: colores honestos, más rápido y colores mezclados (y al final, aún más rápido). Cortar una positiva o dejar caer una negativa llena la barra de bloqueo, y solo esa barra hace perder: si se llena la página antes, se gana, aunque se escape la última. Tras dos rondas perdidas aparece «Saltar». Las listas de palabras están en los textos.

### Los cerdos (Guille)

Apilar los ocho cerdos encima de la báscula, estilo *Tower Bloxx*: un toque suelta el cerdo que se balancea en la polea. Descentrado, la torre se tambalea más; fuera del borde, resbala. Tres resbalones o un derrumbe y se repite; tras dos rondas perdidas aparece «Saltar». El último es el peor de todos. Se ajusta con `node scripts/cerdos-sim.mjs`.

### El cañón contra Robi (Chuchi)

Homenaje al microjuego de *WarioWare* de disparar plátanos a una nariz gigante: desde detrás del cañón de bolas del parque, **se toca donde disparar** y la bola tarda medio segundo en llegar, así que al botón luminoso de la cabeza de Robi hay que apuntarle por delante. Seis aciertos lo apagan. Si la bola da en la cabeza, en el cuerpo o en el gorrito de fiesta que se pone sobre el botón, rebota. Robi se va acercando para dar un abrazo de cumpleaños; los fallos le acercan, los aciertos le echan atrás, y si llega se repite (tras dos rondas perdidas aparece «Saltar»). Tres tramos por aciertos: balanceo; más rápido, botando y con el gorrito; y a saltos. Se ajusta con `node scripts/robot-sim.mjs`: quien apunta por delante gana, quien dispara sin parar a donde está el botón pierde.

### La ronda (aparcada)

Llevar cuatro cañas de la barra a la terraza inclinando el móvil o deslizando el dedo. Estaba en el mockup; volverá cuando la crew esté en el Río, con el arte nuevo.

### Ideas para otros minijuegos

Son ejemplos de controles, para sustituirlos por vuestras anécdotas:

- **Duelo de pullas** al estilo de los insultos con espada de *Monkey Island*.
- **Karaoke** de ritmo, tocando a tiempo.
- **El último metro:** deslizar para esquivar por Usera.
- **Aparcar la caravana:** arrastrar con cuidado.

## El piloto (capítulo 1)

Se elige con quién empezar y se puede cambiar cuando se quiera (ver `docs/ESCENA-1.md`). Las cuatro historias están hechas.

### La historia de Fran

Fran se despierta de la siesta a las 20:35 y había quedado a las 21:00 en el Bar del Río. Cada paso enseña una mecánica:

1. **Tocar** para despertarle.
2. **Mirar** (mantener pulsado) el reloj: se da cuenta de la hora.
3. **Coger** el móvil: el grupo de WhatsApp presenta a los demás.
4. **La puerta** está cerrada con llave: la pareja se ha ido de finde y la ha echado por fuera.
5. Las llaves no están en el cuenco: **Aceituna** está tumbada encima y no se mueve.
6. En el cuenco solo quedan huesos de aceituna; en la nevera hay un paquete de **taquitos de jamón**.
7. **Usar el jamón en Aceituna:** si se lo das, se hace la digna; si se lo tiras a la boca, eso ya es cazar. Abre el minijuego de **la rana de Aceituna**.
8. Con ocho a la boca, se levanta de la cama, va a por Fran meneando el rabo y deja las llaves a la vista.
9. Para salir falta vestirse: la **ropa** está tendida en la terraza. **Usarla contigo** cambia el vestuario de Fran.
10. Sale a la calle y **anda** hacia el Río. Al pasar el cruce lo ve y se funde a negro: ya va de camino.

El reloj de Fran avanza con cada paso y se va poniendo nervioso. Cuando los cuatro van de camino, llegan a la vez a la terraza del Río y termina el piloto.

**Todos los textos son provisionales** y se cambian en `src/textos/capitulo1.md`.

## Siguientes pasos

- Probar el piloto en los móviles de los cuatro con «Ver rendimiento» activado.
- Publicarlo en un sitio estable (Netlify, Cloudflare Pages o GitHub Pages) para el giroscopio.
