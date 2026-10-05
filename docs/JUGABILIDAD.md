# Jugabilidad · Camiones y Caravanas

Decisiones de diseño para que una aventura gráfica con minijuegos funcione en un móvil.

## Plataforma

- **Juego web** que se abre con un enlace y se puede añadir a la pantalla de inicio. No pasa por tiendas de apps y funciona en iPhone y Android.
- **Solo en horizontal.** En vertical aparece un aviso para girar el móvil, porque iPhone no deja bloquear la orientación.
- **Autoguardado** en el propio navegador (cada jugador en su móvil) tras cada acción y al salir de la página, para seguir otro día donde lo dejaste.

## Partida guardada y capítulos

Lo guarda `src/juego/partida.ts`, en una sola entrada del navegador (`cyc.partida.v4`) con tres cosas:

- **Tu partida**: la historia tal y como vas, capítulo tras capítulo.
- **Un rejuego**: un capítulo ya superado, jugado otra vez desde el principio. Es una partida aparte que nunca toca la tuya; al volver a tu partida sigues exactamente donde estabas, aunque hayas superado dos capítulos y estés rejugando el primero.
- **Lo conseguido**: capítulos y minijuegos superados, en cualquiera de las dos partidas. Sirve para la lista de capítulos y para el menú de minijuegos.

En el menú, **Capítulos** enseña cada capítulo (superado, en curso o todavía no) y deja rejugar los superados. Mientras rejuegas, el título y el menú lo avisan, y desde Capítulos (o desde la tarjeta del final) vuelves a tu partida. **Empezar de nuevo** solo reinicia la partida que estás jugando: lo conseguido no se borra nunca. Al terminar un capítulo, la tarjeta final ofrece rejugarlo. Las partidas guardadas con la versión anterior pasan a ser tu partida, y si habían llegado al final, el capítulo 1 y sus minijuegos cuentan como superados.

**Partidas de versiones antiguas.** Al cargar, `reparar` (`src/juego/aventura.ts`) arregla lo que una versión nueva haya dejado atrás: quien esté en una escena que ya no existe (Chuchi en su escena provisional, antes de Bolilandia), o cuya historia el capítulo diga que ha cambiado (`caducados`), empieza su historia otra vez; los demás conservan su avance, y los objetos que ya no existen salen de la bolsa. Si una escena falla al cargar, el velo se levanta y sigues en la escena de antes en vez de quedarte en «Preparando la escena…».

**Salida de emergencia.** Abrir el juego con `?nueva` al final de la dirección (por ejemplo `https://stokres.github.io/cyc/?nueva`) borra la partida guardada (no los ajustes) y empieza desde cero.

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

## Sonido y música

- El sonido arranca con el primer toque (los móviles no dejan antes) y se apaga entero con «Sonido» en el menú. Con la app en segundo plano o el móvil bloqueado, se suspende.
- Ya no hay ruido de fondo constante (decidido el 4 de octubre de 2026): era un siseo molesto.
- **Música en bucle sin cortes** (`src/core/audio.ts`, pistas en `src/sonido/musica.ts`): se genera con `tools/musica` (cada pieza con `bucle` y la ruta de `src/sonido`, por ejemplo `python3 barrio.py bucle ../../src/sonido/barrio.mp3`). Cada archivo lleva medio segundo de margen a cada lado del bucle con lo que va justo antes y después, y el final del bucle se funde con lo que precede a su inicio, así que la junta no da chasquido en ningún móvil. Entra y sale con un fundido.
- **Dos clases de música:** la de la escena, que la escena pide en cada fotograma como una o varias capas, cada una con su volumen y su posición (`musica` en el capítulo), y la de un minijuego, que suena sola mientras dura y después devuelve la de la escena.
- **«Por el barrio»** (`barrio.py`), el paseo tranquilo, suena en el piso de Fran, en su calle y en el backstage de Pablo.
- **El rock del Bar del Río desde la puerta** (`bar_rockero.py puerta`: la mezcla con solo los graves y algo de medios, casi en mono): en la calle de Fran se oye muy bajito al principio y sube según se acerca a la puerta del bar, hacia su lado, mientras «Por el barrio» se va apagando; en el final, con los cuatro en la puerta, suena solo el bar. Se ajusta en `src/capitulos/capitulo1.ts` (`BARRIO`, `BAR_MIN`, `BAR_LEJOS`).
- **El «Continuará…» del final** tiene su pasodoble (`pasodoble.py`, original: un pasodoble festero con bocina de camión, motor, frenos y pitido de marcha atrás). El arranque del camión y la fanfarria suenan una vez y el resto se repite mientras dure el rótulo; al cerrarlo vuelve el bar.
- **La radio de la granja** (Guille) suena desde el principio de la escena con la polca de banjo (`tools/musica/banjo.py radio`): más fuerte cuanto más cerca está Guille (nunca baja del 22 %) y un poco hacia el lado de la radio. Al quitarle las pilas se corta. Se ajusta en `src/capitulos/guille.ts` (`RADIO_MIN`, `RADIO_LEJOS`).
- **Minijuegos**, en la historia y sin fin: «Dándole vueltas» (`vueltas.py`) en la rana de Aceituna; «Jaleo» (`jaleo.py`), el big band frenético, en la batalla de palabras de Pablo; «Contra Robi» (`contra_robi.py`), con el «Cumpleaños feliz» de Robi en pitidos de robot, en el cañón de Bolilandia; y la polca de la granja, más rápida y con escobillas, cencerro y gruñidos (`banjo.py cerdos`), en la torre de cerdos.
- El parque de Bolilandia (Chuchi) aún no tiene música de escena. El tema principal está por rehacer, más pop-rock; el resto de los efectos, por decidir.

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
- **El último tramo, más llevadero** (5 de octubre de 2026: era el más difícil con diferencia). Con la corriente, Aceituna se mueve más despacio y menos, tiene la boca abierta algo más de tiempo, y el viento es más flojo y cambia más despacio, para poder apuntar contando con él. Ahora acierta una mano humana como en el tercero (una de cada cuatro), no una de cada seis.
- **Un paquete trae 24 taquitos.** Si tardas en tirar, Fran se come uno. Si se acaba el paquete antes de los ocho, se empieza otra vez con otro; tras dos rondas perdidas aparece «Saltar».
- Lo que cae al suelo, Aceituna no se lo come: es una señora.
- Se ajusta con `node scripts/rana-sim.mjs`, que mide para cada tramo cuánto espacio de tiro acierta y cuántas veces acierta una mano humana (±5 % de fuerza, ±2,5° y momento aleatorio).

### Las palabras (Pablo)

Cortar con el dedo las palabras negativas (en sentido de impro) que lanza el narrador y dejar pasar las positivas. Tres fases: colores honestos, más rápido y colores mezclados (y al final, aún más rápido). **Las palabras se lanzan, no caen** (5 de octubre de 2026: caían rectas y despacio, y aburría): salen de lado y rebotan en los bordes, desde la segunda fase se mecen como hojas, y giran cada vez más; caen más deprisa y más seguidas que antes. Se ajusta con `node scripts/palabras-sim.mjs` (jugadores con reflejos de 0,25, 0,4 y 0,6 s que cortan por donde vieron la palabra). Cortar una positiva o dejar caer una negativa llena la barra de bloqueo, y solo esa barra hace perder: si se llena la página antes, se gana, aunque se escape la última. Tras dos rondas perdidas aparece «Saltar». Las listas de palabras están en los textos.

### Los cerdos (Guille)

Apilar los ocho cerdos encima de la báscula, estilo *Tower Bloxx*: un toque suelta el cerdo que se balancea en la polea. Descentrado, la torre se tambalea más; fuera del borde, resbala. Tres resbalones o un derrumbe y se repite; tras dos rondas perdidas aparece «Saltar». El último es el peor de todos.

- **La polea va rápida desde el primer cerdo** y acelera con cada uno (5 de octubre de 2026: empezaba tan lenta que los ocho salían a la primera).
- **Cada cerdo carga con los de encima:** si el peso de los que tiene encima se sale de su lomo (con el vaivén), la torre se viene abajo a esa altura, aunque abajo esté recta. Cada cerdo que cae la sacude, más cuanto más descentrado y más pesado, y cuanto más alta, más se mece la cima.
- Se ajusta con `node scripts/cerdos-sim.mjs`: jugadores que apuntan adonde caerá el cerdo y tocan con un error de ±30, ±60 o ±100 ms. El preciso la hace casi siempre a la primera, el normal en una a tres rondas y el torpe suele necesitar «Saltar».

### El cañón contra Robi (Chuchi)

Homenaje al microjuego de *WarioWare* de disparar plátanos a una nariz gigante: desde detrás del cañón de bolas del parque, **se toca donde disparar** y la bola tarda medio segundo en llegar, así que al botón luminoso de la cabeza de Robi hay que apuntarle por delante. Seis aciertos lo apagan. Si la bola da en la cabeza, en el cuerpo o en el gorrito de fiesta que se pone sobre el botón, rebota. Robi se va acercando para dar un abrazo de cumpleaños; los fallos le acercan un poco (un 3 % del camino en el primer tramo, un 2,5 % en el segundo y un 2 % en el último, para que al final haya más intentos), los aciertos le echan atrás, y si llega se repite (tras dos rondas perdidas aparece «Saltar»). Tres tramos por aciertos: balanceo; más rápido, botando y con el gorrito; y a saltos. **El segundo y el tercero se mueven menos** que al principio (5 de octubre de 2026: con el gorrito eran casi imposibles), el botón cuenta con margen (1,45 veces su radio) y **el gorrito solo tapa cuando está bajado del todo**: un botón que se ve es un botón al que se le puede dar. Se ajusta con `node scripts/robot-sim.mjs`: quien apunta, aunque sea poco, gana; quien dispara sin parar a donde está el botón gana más o menos dos de cada tres, porque cada fallo acerca a Robi.

### Minijuegos sin fin (menú de minijuegos)

En el menú, **Minijuegos** abre los minijuegos que hayas superado en la historia (en tu partida o en un rejuego), en una versión sin fin: la misma mecánica, pero la dificultad sigue subiendo hasta que pierdes, y hay puntos (decidido el 4 de octubre de 2026). Los que aún no has superado salen bloqueados, con quién los tiene en su historia. El código está en cada minijuego, con la opción `infinito` (`src/ui/infinito.ts` pone el marcador).

| Minijuego | Puntos | Cómo sube la dificultad | Se acaba |
|---|---|---|---|
| La rana de Aceituna | 1 por taquito a la boca | Los cuatro tramos de la historia y, después, su meneo, su boca y la corriente cada vez más rápidos y fuertes | A los tres fallos (con un acierto de una de cada dos al principio, uno solo duraría dos tiros) |
| Las palabras de Pablo | 1 por palabra que bloquea cortada | Pasada la página de la historia, caen cada vez más rápido y más seguidas | Cuando se llena el bloqueo |
| El cañón contra Robi | 1 por bola en el botón | Pasados los seis aciertos, Robi se mueve y avanza cada vez más rápido, y cada acierto le echa menos atrás | Cuando llega a abrazarte |
| La torre de cerdos | 1 por cerdo, 2 si cae en el centro | La piara vuelve a empezar (el peor, cada ocho) y la polea se balancea cada vez más ancha y rápida | Tres resbalones o un derrumbe |

Cada pocos aciertos sale «¡Nivel N!». Al acabar, una tarjeta enseña los puntos, si es récord y **tus cinco mejores partidas** de ese minijuego, con la fecha. El ranking es de cada móvil: se guarda con la partida (`src/juego/partida.ts`, `apuntarPuntos`) y no se borra al empezar de nuevo. Un ranking compartido entre los cuatro necesitaría un servidor (GitHub Pages solo sirve archivos), así que queda como mejora futura.

Equilibrio: `node scripts/robot-sim.mjs` también simula la versión sin fin (un jugador hábil hace unos 70 aciertos de media, uno normal unos 23 y quien dispara sin parar unos 3).

### La ronda (aparcada)

Llevar cuatro cañas de la barra a la terraza inclinando el móvil o deslizando el dedo. Estaba en el mockup; volverá cuando la crew esté en el Río, con el arte nuevo.

### Ideas para otros minijuegos

Son ejemplos de controles, para sustituirlos por vuestras anécdotas:

- **Duelo de pullas** al estilo de los insultos con espada de *Monkey Island*.
- **Karaoke** de ritmo, tocando a tiempo.
- **El último metro:** deslizar para esquivar por Usera.
- **Aparcar la caravana:** arrastrar con cuidado.

## El piloto (capítulo 1)

**Prólogo** (decidido el 4 de octubre de 2026): tras la pantalla de título, al empezar una partida nueva (la primera, tras «Empezar de nuevo» y al rejugar un capítulo), unas frases sobre Usera de noche presentan a los cuatro y el lío del jueves. Cada frase pasa sola cuando da tiempo a leerla, un toque la adelanta y «Saltar intro» se las salta todas. Las frases están en `src/textos/capitulo1.md` (`## prologo`): cada línea es una pantalla, y las de un personaje enseñan su retrato y su nombre. El código está en `src/ui/prologo.ts`: la noche se pinta una vez y solo se apagan y encienden unas pocas ventanas y estrellas, sin repintar nada más.

Después se elige con quién empezar y se puede cambiar cuando se quiera (ver `docs/ESCENA-1.md`). Las cuatro historias están hechas.

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

El reloj de Fran avanza con cada paso y se va poniendo nervioso. Cuando los cuatro van de camino, llegan a la vez a la terraza del Río, entran en el bar hablando de Vero y, tras un fundido a negro, «Continuará…»: fin del capítulo 1.

**Todos los textos son provisionales** y se cambian en `src/textos/capitulo1.md`.

## Siguientes pasos

- Probar el piloto en los móviles de los cuatro con «Ver rendimiento» activado.
- Publicarlo en un sitio estable (Netlify, Cloudflare Pages o GitHub Pages) para el giroscopio.
