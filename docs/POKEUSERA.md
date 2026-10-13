# PokéUsera · Edición Jarra

Juego aparte de batallas de useritos a cuatro, al estilo de los primeros juegos de monstruos de Game Boy, pero todo original (criaturas, nombres, sprites, música). Pedido por Jesús el 12 de octubre de 2026; nombre, reglas, tipos y useritos validados por él ese día. Rama `claude/batallas-a-cuatro-4c2aj0`; no toca el capítulo 1 ni el Pang.

## 1. Cómo está hecho

| Pieza | Dónde |
|---|---|
| Entrada | `pokeusera.html` → `src/pokeusera/main.ts` |
| Tipos compartidos (el contrato) | `src/pokeusera/tipos.ts` |
| Datos: tipos, useritos y movimientos | `src/pokeusera/datos.ts` |
| Motor de combate (puro, sin DOM, azar con semilla) | `src/pokeusera/motor/` (`combate.ts`, `draft.ts`, `bot.ts`, `azar.ts`) |
| Arte: paleta, letra de píxeles, sprites, marcos | `src/pokeusera/arte/` |
| Sonido: música y efectos | `src/pokeusera/sonido.ts`, MP3 en `src/sonido/pokeusera-*.mp3`, generados con `tools/musica/pokeusera.py` |
| Pantallas y flujo | `src/pokeusera/pantallas/` |
| Online | `src/pokeusera/red/`, servidor `scripts/servir-pokeusera.mjs` + `scripts/sala-pokeusera.mjs` |
| Textos | `src/textos/pokeusera.md` (interfaz) y `src/textos/pokeusera-combate.md` (mensajes del combate, descripciones de useritos y movimientos) |

### Pantalla

- **Vertical, en el móvil.** Lógica de 160 px de ancho (el de la Game Boy); el alto sale de la proporción de la pantalla, entre 256 y 346 px. Se amplía sin suavizar (`image-rendering: pixelated`) para ocupar el ancho.
- **Aspecto Game Boy Color:** letra de píxeles 8×8 propia (con tildes, ñ, ¡ y ¿), marcos de texto como los del original, cursor ▶, barras de PS verde/amarilla/roja. Cada userito tiene su paleta de 4 colores (como en la Game Boy Color); de frente a 32×32 y de espaldas (el propio) con píxeles dobles, como el original.
- **Combate a cuatro en vertical:** los tres rivales en filas arriba (ficha a la izquierda: nombre, N50, barra de PS y color del entrenador; sprite de frente a la derecha) y el tuyo abajo (sprite de espaldas a la izquierda, ficha con PS en números a la derecha). Debajo, el cuadro de texto y los menús.
- Todo se toca: zonas táctiles de al menos 44 px CSS. En el ordenador también con flechas, Enter/Z (aceptar) y Escape/X (atrás).
- **Rendimiento** (`docs/ESTILO.md`, T5): lienzo pequeño, sprites horneados una vez en lienzos, nada de SVG, bucle con tope de 60 fps y se repinta solo cuando algo cambia.

### Flujo

Título («Toca para empezar») → menú: **Jugar solo** (tú y tres de la máquina) / **Jugar online** (sala con contraseña) / Ajustes (música, efectos) → elegir entrenador (Fran, Pablo, Chuchi, Guille) → **draft en serpiente** → **combate** → **podio** (1.º a 4.º) → volver a jugar.

### Online

Como el Pang (`docs/PANG-ONLINE.md` en su rama): una sola sala por WebSocket en `/sala`, contraseña en la variable `POKEUSERA_CLAVE` del servidor (nunca en el repositorio). El primero que entra es el anfitrión: su navegador lleva el draft y el combate con el motor (`Partida`); los invitados mandan sus elecciones y pintan lo que llega. Al ser por turnos solo viajan elecciones y resultados. El servidor no sabe nada del juego: reparte mensajes.

**Código** (`src/pokeusera/red/`): `conexion.ts` (el WebSocket), `sala.ts` (pantalla de contraseña y sala, en lienzo Game Boy; la contraseña se escribe en un `<input>` real colocado encima del lienzo y se recuerda en `localStorage` `pokeusera.clave`), `online.ts` (el hilo: contraseña → sala → partida → sala…), `anfitrion.ts`, `invitado.ts` y `mensajes.ts` (los tipos de los mensajes).

**La sala.** Lista de quién está (icono, nombre, «ANFITRIÓN», «TÚ»), cada uno elige entrenador (los ya cogidos salen apagados; `elegir`) y el anfitrión ve «RELLENAR CON MÁQUINA: SÍ/NO» (por defecto SÍ) y EMPEZAR. Juegan solo los que han elegido entrenador (los demás miran). El anfitrión necesita entrenador propio; con SÍ se rellena hasta cuatro asientos con la máquina (con los entrenadores libres, por orden) y con NO se juega con los que hay (mínimo 2). Orden de asientos: id de la sala, y la máquina detrás.

**Mensajes de juego**, dentro de `juego` (los viejos nombres de este documento ya no valen):

- Invitado → anfitrión (`a: 'anfitrion'`):
  - `{ k: 'pick', n, especie }`: `n` es el nº de picks ya hechos (`draft.elegidos.length`), para que una respuesta vieja no cuente para una pregunta nueva.
  - `{ k: 'eleccion', turno, eleccion }`: `turno` es el de `pide`; `eleccion` es una `Eleccion` o `null` (grada: nada).
  - `{ k: 'reemplazoIdx', turno, idx }`: `turno` es `estado.turno` del mensaje `turno` que lo pidió; `idx` es el índice en `equipo`.
- Anfitrión → todos (`a: 'todos'`), en este orden dentro de cada partida:
  - `{ k: 'asientos', asientos: [{ entrenador, nombre, bot }], seats: { [idSala]: asiento } }`: quien no sale en `seats` solo mira.
  - `{ k: 'draft', draft, turnoDe, plazoMs }` (cada vez que cambia el draft; `turnoDe` es quien elige ahora, `null` = fin; eso ya es la petición del pick).
  - `{ k: 'inicio', estado }`.
  - `{ k: 'pide', turno, quienes, plazoMs }`: los de `quienes` eligen (también los eliminados cuando se abre la grada).
  - `{ k: 'turno', turno, eventos, estado, reemplazan, rempMs }`: `reemplazan` son los asientos que ahora deben elegir quién sale (tienen `rempMs`).
  - `{ k: 'reemplazo', eventos, estado }`, `{ k: 'fin', estado }`.
  - `{ k: 'salio', seat, nombre }`: un invitado se fue y la máquina juega por él (todos ven una línea de texto).
  - `{ k: 'otra' }`: el anfitrión eligió OTRA en el podio; sigue un `asientos` nuevo y otro draft.
- Mensajes de la sala (los del servidor): `elegir`, `empezar` (a todos), `volver` (a todos: de vuelta a la sala; lo manda el anfitrión al elegir MENÚ en el podio), `salio` (al anfitrión), `cerrada` (se fue el anfitrión).

**Reglas de la conexión.**

- El anfitrión no espera a las animaciones de nadie: manda y sigue, y solo espera las respuestas (hasta el plazo + 1,2 s de gracia; después la `Partida` decide por el invitado: movimiento al azar, primer vivo, etc.). Una respuesta que llega antes de la pregunta se guarda para ella; las que llegan tarde se tiran.
- Cada invitado procesa los mensajes en orden con una cola. Si se retrasa y hay más de 2 turnos en cola, los reproduce rápido hasta ponerse al día. Una pregunta que el anfitrión ya cerró (porque pasó el plazo y siguió con el siguiente mensaje) se descarta y no se manda. El plazo que ve el invitado es el del anfitrión menos lo que tardó en llegar y 0,6 s de margen.
- El anfitrión valida lo que llega (forma del mensaje, objetivos dentro del rango); el motor corrige el resto.
- Un invitado que se va (`salio`) pasa a ser máquina el resto de la partida y las preguntas que tenía pendientes las contesta la máquina al momento. Si se va el anfitrión, la sala se cierra para todos: «Se ha cerrado la sala» y al menú; igual si se pierde la conexión.
- En el podio el invitado solo tiene MENÚ (sale de la sala). El anfitrión elige OTRA (mismo grupo, otro draft; los invitados vuelven al draft solos) o MENÚ (todos a la pantalla de la sala).
- ABANDONAR en la pausa: el invitado sale de la sala; el anfitrión también, y eso la cierra para todos.
- Para probar a mano: `?rapido` (solo animaciones rápidas; `?auto` es solo para la partida en solitario). Con `POKEUSERA_CLAVE=prueba PORT=8080 node scripts/servir-pokeusera.mjs` (tras `npm run build`) y dos pestañas se juega una sala completa; en la consola, `window.__pokeusera` da acceso a la partida del anfitrión o a la cola del invitado.

### Publicación

Railway, desde esta rama: `npm run build` y `npm start` (`scripts/servir-pokeusera.mjs`, `/` abre el juego). Variable `POKEUSERA_CLAVE` para la sala.

## Precisiones del motor

- **Nivel 50.** PS = base + 60; Ataque, Defensa, Velocidad y Especial = base + 5.
- **Daño** (como el original): `floor(floor(22 × Pot × A / D) / 50) + 2`, por 1,5 si es del mismo tipo, por la eficacia, por un azar de 0,85 a 1 y por 2 si es crítico (probabilidad Vel base / 512). Mínimo 1 si afecta. «A todos»: × 0,75. **Acorralado:** el segundo golpe y los siguientes que recibe un mismo userito en un turno, de otros jugadores, × 0,5.
- **Niveles de estadística:** multiplicador (2 + n) / 2 si n ≥ 0, 2 / (2 − n) si n < 0. Precisión igual. Quemado: Ataque a la mitad; Paralizado: Velocidad a la cuarta parte.
- **Orden:** cambios y caña; Esconderse; Susto; el resto de más a menos Velocidad (empates a suertes).
- **Objetivo caído a mitad de turno:** el golpe va a otro rival en pie al azar.
- **Achispado:** al atacar, 1/3 se pega a sí mismo (potencia 40, físico, sin tipo), 1/3 su ataque «uno» va a otro rival al azar, 1/3 normal.
- **Sin PP en ningún movimiento:** usa «A la desesperada» (Normal, 50, sin fallo, recibe 1/4 del daño).
- **Reemplazo:** al final del turno, quien tiene el userito caído elige cuál sale (15 s; si no, el primero vivo). Si ya no le quedan, queda eliminado con el puesto que toque.
- **Fin:** cuando queda uno. Si los últimos caen a la vez, gana quien tenía más PS (en %) al empezar el turno.
- **Tiempos:** 30 s por turno, 20 s por elección en el draft. Al acabar el tiempo: movimiento al azar contra rival al azar (o lo que diga la máquina).

## 2. Reglas (validadas por Jesús el 12-oct-2026)

### Lo básico

- **De 2 a 4 jugadores, todos contra todos**, en la misma sala con contraseña que el Pang. Los sitios vacíos los ocupa la máquina (un rival fácil), así que dos amigos también pueden jugar una batalla a cuatro. También se puede jugar solo contra tres de la máquina.
- **Cada jugador es uno de los cuatro amigos como entrenador** (Fran, Pablo, Chuchi o Guille, en sprite de Game Boy), y cada uno con su color.
- **Equipo de 3 useritos**, todos a nivel 50. Sin experiencia ni objetos que llevar: llegar, elegir y pegarse.
- Una batalla dura unos **10-15 minutos**.

### Elegir equipo: el draft en serpiente

Todos ven los 20 useritos a la vez y se eligen por turnos, sin repetir: 1-2-3-4, 4-3-2-1, 1-2-3-4. 20 segundos por elección; si se acaba el tiempo, la máquina elige por ti. Así cada uno tiene useritos distintos, y ya hay pique antes de pelear.

### Cada turno

1. **Todos eligen a la vez y en secreto**, con 30 segundos de tiempo: **atacar** (un movimiento y, si es a un solo rival, **a quién**), **cambiar** de userito o usar la **caña** (una por batalla: cura la mitad de los PS).
2. Se resuelve en este orden: cambios y caña, después «Esconderse» y «Susto», y luego los ataques del más rápido al más lento (empate: a suertes).
3. Si se acaba el tiempo, tu userito usa un movimiento al azar contra un rival al azar.

### Elegir objetivo (lo nuevo de luchar a cuatro)

- **Movimientos a un rival:** tocas el userito de uno de los otros tres. Si ese userito cae antes de que te toque, el golpe va a otro rival en pie al azar (el reemplazo sale al final del turno).
- **Movimientos a todos:** golpean a los tres rivales a la vez, con el 75 % de la potencia.
- **Movimientos a ti mismo:** suben tus estadísticas, te curan o te esconden.

### Tres reglas para que funcione a cuatro

- **Acorralado.** Si en un mismo turno a un userito le pegan dos o más rivales, el segundo golpe y los siguientes le hacen la mitad. Se puede ir a por uno entre todos, pero sale menos a cuenta.
- **Venganza.** Algunos movimientos pegan el doble a quien te hizo daño en el turno anterior. Quien abusa, lo paga.
- **Hora de cerrar.** A partir del turno 25 sale Vero y pone las sillas encima de las mesas: al final de cada turno todos los useritos pierden 1/8 de sus PS. Así ninguna batalla se eterniza.

### Quién gana

- Te eliminan cuando caen tus tres useritos. **Gana el último en pie**, y el resto queda en el orden en que cayó (2.º, 3.º, 4.º).
- Si los últimos caen en el mismo turno, gana el que tenía más PS (en porcentaje) al empezar ese turno.
- **Desde la grada** (opcional, lo recomiendo): los eliminados no se quedan mirando. Cada tres turnos pueden **invitar a una caña** a un userito que siga en pie (cura 1/10 de sus PS) o **abuchearle** (baja su precisión). Da juego para piques y venganzas, aunque permite ayudar a un amigo.

### Como en el original

- **Cinco estadísticas:** PS, Ataque, Defensa, Velocidad y Especial (una sola para atacar y defender con movimientos especiales).
- **Físicos y especiales según el tipo:** Normal, Tierra, Aire, Juerga y Fantasma son físicos (usan Ataque y Defensa); Fuego, Planta, Rayo, Alcohol, Chanza y Grasa son especiales (usan Especial).
- **Mismo tipo que el userito:** el movimiento pega un 50 % más.
- **Críticos:** cuanto más rápido es el userito, más críticos (doble de daño).
- **PP** por movimiento, como en el original (los fuertes tienen pocos).
- **Subidas y bajadas de estadísticas** por niveles, de −6 a +6; se pierden al cambiar de userito.
- **Estados** (uno a la vez, salvo Achispado, que se suma):
  - **Dormido:** no actúa durante 1-3 turnos.
  - **Paralizado:** un 25 % de las veces no actúa, y su Velocidad baja a la cuarta parte.
  - **Quemado:** pierde 1/16 de sus PS cada turno y su Ataque baja a la mitad.
  - **Empachado** (nuevo, nuestro veneno): pierde 1/8 de sus PS cada turno hasta que se cura o cae.
  - **Achispado** (nuestra confusión): durante 2-4 turnos, cada vez que ataca puede pegarse a sí mismo (1 de cada 3 veces) o pegar a otro rival al azar (1 de cada 3).

### Tabla de tipos

Once tipos. Doble de daño (×2), la mitad (×½) o nada (×0). Si un userito tiene dos tipos, se multiplican.

| Ataque de tipo | ×2 contra | ×½ contra | ×0 contra | La lógica |
|---|---|---|---|---|
| **Normal** | — | Tierra | Fantasma | A un fantasma no le toca nadie normal |
| **Fuego** | Planta, Alcohol | Fuego, Tierra, Grasa | — | El alcohol arde; lo frito ya está frito |
| **Planta** | Tierra, Grasa | Fuego, Planta, Alcohol | — | La verdura compensa la grasa |
| **Tierra** | Fuego, Rayo | Planta | Aire | — |
| **Aire** | Fuego, Juerga | Rayo, Tierra | — | El viento apaga la vela y el cierzo vacía las terrazas |
| **Rayo** | Aire, Alcohol | Rayo, Planta | Tierra | Electricidad y líquidos, mala idea |
| **Alcohol** | Grasa, Planta | Alcohol, Fuego | — | El alcohol disuelve la grasa |
| **Juerga** | Normal, Tierra | Grasa | — | La gente normal no aguanta una juerga |
| **Chanza** | Juerga, Fantasma | Chanza | — | Una buena chanza corta el rollo y desinfla al flipado |
| **Grasa** | Alcohol, Juerga | Fuego, Planta | — | Hay que comer antes de beber, y después de un atracón no hay juerga |
| **Fantasma** | Chanza, Fantasma | — | Normal | El que va de fantasma te deja la gracia fría |

---

## 3. Los 20 useritos (validados)

Todos suman lo mismo en estadísticas (420), para que no haya ninguno roto de salida: cada uno destaca en algo y flojea en otra cosa. Las cifras se ajustarán al probar.

| # | Userito | Tipo | PS | Ata | Def | Vel | Esp | Movimientos |
|---|---|---|---|---|---|---|---|---|
| 1 | **Draguserín**: el dragón del parque de Usera | Fuego / Aire | 75 | 80 | 70 | 95 | 100 | Traca, Petardazo, Planeo, Esconderse |
| 2 | **Goudazard**: palito frito de gouda rebozado | Grasa / Fuego | 85 | 70 | 90 | 65 | 110 | Fritanga, Fogonazo, Pringue, Rebozado |
| 3 | **Aceitún**: perrita negra con forma de aceituna (por Aceituna) | Planta / Grasa | 70 | 85 | 70 | 110 | 85 | Raíces, Pringue, Lametazo, Cara de pena |
| 4 | **Cierzón**: remolino mañico que no para quieto | Aire | 70 | 90 | 65 | 120 | 75 | Cierzo, Planeo, Remolino, Venganza |
| 5 | **Turroncho**: bloque de turrón blando con almendras | Tierra / Planta | 100 | 80 | 125 | 35 | 80 | Almendrazo, Adoquín, Caparazón, Siesta |
| 6 | **Tocinón**: cerdo enorme y tranquilo, 152 kilos de userito | Normal / Grasa | 150 | 95 | 80 | 30 | 65 | Barrigazo, Pringue, Temblor, Siesta |
| 7 | **Roscochoco**: dulce navideño de chocolate, muy indigesto | Grasa / Juerga | 105 | 75 | 90 | 50 | 100 | Indigestión, Fritanga, Conga, Rebozado |
| 8 | **Espumarro**: jarra de cerveza a la que nunca se le baja la espuma | Alcohol / Normal | 95 | 70 | 80 | 75 | 100 | Ronda, Garrafón, ¡Una más!, Barrigazo |
| 9 | **Cajonazo**: cajón flamenco con brazos y mucho compás | Juerga | 85 | 105 | 90 | 80 | 60 | Rumba, Taconeo, Temblor, Compás |
| 10 | **Lentejasur**: lenteja sucia que aparece cuando menos te lo esperas | Planta / Fantasma | 60 | 65 | 60 | 120 | 115 | Lluvia de lentejas, Tropezón, Susto, Esporas |
| 11 | **Tragaperras**: la máquina del rincón del bar, que se ríe de ti | Rayo / Chanza | 85 | 60 | 95 | 65 | 115 | Premio gordo, Chispazo, Zasca, Cizaña |
| 12 | **Turito**: el userito que aburre y cansa | Normal | 115 | 70 | 110 | 45 | 80 | Dar la chapa, Te pillo en la barra, Turra, Bostezo |
| 13 | **Resacón**: nube gris que aparece a la mañana siguiente | Alcohol / Fantasma | 80 | 90 | 75 | 85 | 90 | Dolor de cabeza, Chupitazo, Venganza, Siesta |
| 14 | **Evoscar**: dos cabezas, una de mujer y otra de hombre, con cuerpo de caballo | Juerga / Chanza | 85 | 90 | 75 | 90 | 80 | Coz doble, Galope, A dos voces, Sí, y… |
| 15 | **Chupitochu**: chupito muy fuerte y ardiente | Alcohol / Fuego | 60 | 55 | 60 | 120 | 125 | Chupitazo, Fogonazo, Garrafón, Esconderse |
| 16 | **Caravaner**: una caravana | Tierra / Juerga | 110 | 90 | 115 | 30 | 75 | ¡Camioneees y caravanaaas!, Temblor, Caparazón, Siesta |
| 17 | **Camioner**: un camión | Normal / Tierra | 100 | 125 | 100 | 50 | 45 | Trompazo, Adoquín, Bocinazo, ¡Camioneees y caravanaaas! |
| 18 | **Criaturitah**: pequeña criaturita del bosque | Planta / Chanza | 80 | 60 | 80 | 100 | 100 | Esporas, Raíces, Vacile, Monada |
| 19 | **Ego-Ego**: fantasma muy flipado | Fantasma | 70 | 105 | 65 | 110 | 70 | Eco, Chulería, Flipada, Selfie |
| 20 | **Kbronero**: teclado heavy | Rayo / Juerga | 80 | 90 | 70 | 85 | 95 | Solo de teclado, Distorsión, Pogo, Compás |

Reparto por tipos (contando los dobles): Normal 4, Fuego 3, Planta 4, Tierra 3, Aire 2, Rayo 2, Alcohol 3, Juerga 5, Chanza 3, Grasa 4, Fantasma 3.

Cosas a tener en cuenta del equilibrio:

- **Turito** solo es débil a Juerga y no le afecta lo Fantasma: aguanta mucho, pega poco y aburre al rival con Turra y Bostezo.
- **Ego-Ego** pega muy fuerte, pero lo Normal no le toca y él no toca a los Normales, así que lleva Chulería (Juerga) para ellos. Es débil a Chanza: no soporta que se rían de él.
- **Aceitún** tiene una debilidad doble a Alcohol (×4): a la perrita, ni una gota.
- **Camioner y Caravaner** comparten el movimiento de la canción; si uno la canta justo después del otro, pega el doble (ver la tabla).

### Los movimientos

Potencia, precisión y PP. «Uno» es un rival a elegir; «todos», los tres rivales (al 75 %); «yo», el propio userito.

| Movimiento | Tipo | Pot. | Prec. | PP | Objetivo | Efecto |
|---|---|---|---|---|---|---|
| Barrigazo | Normal | 85 | 100 | 15 | uno | 30 %: paraliza |
| Trompazo | Normal | 120 | 90 | 5 | uno | El que lo usa recibe 1/4 del daño que hace |
| Galope | Normal | 80 | 100 | 15 | uno | — |
| Lametazo | Normal | 30 | 100 | 30 | uno | 30 %: paraliza |
| Dar la chapa | Normal | 80 | 100 | 15 | uno | 20 %: baja 1 nivel la Velocidad |
| Te pillo en la barra | Normal | 25 | 90 | 15 | uno | Lo atrapa 2-5 turnos: no puede cambiar y pierde 1/16 de PS por turno |
| Bocinazo | Normal | — | 100 | 15 | todos | Baja 1 nivel el Ataque de los rivales |
| Turra | Normal | — | 90 | 10 | todos | Se les quitan las ganas: baja 1 nivel el Ataque y el Especial |
| Bostezo | Normal | — | 100 | 10 | uno | Se queda dormido al final del turno siguiente |
| Cara de pena | Normal | — | 100 | 20 | uno | Nadie puede pegarle a esa carita: baja 2 niveles el Ataque |
| Esconderse | Normal | — | — | 10 | yo | Nadie puede tocarle este turno; si lo repite seguido, la mitad de las veces falla |
| Siesta | Normal | — | — | 10 | yo | Duerme 2 turnos y recupera todos los PS y estados |
| Traca | Fuego | 70 | 100 | 10 | todos | 10 %: quema |
| Fogonazo | Fuego | 90 | 100 | 15 | uno | 10 %: quema |
| Petardazo | Fuego | 110 | 85 | 5 | uno | 30 %: quema |
| Raíces | Planta | 60 | 100 | 15 | uno | Recupera la mitad del daño que hace |
| Almendrazo | Planta | 85 | 100 | 15 | uno | — |
| Lluvia de lentejas | Planta | 25 | 90 | 20 | uno | Pega de 2 a 5 veces |
| Esporas | Planta | — | 75 | 15 | uno | Lo duerme |
| Temblor | Tierra | 80 | 100 | 10 | todos | No afecta a los de tipo Aire |
| Adoquín | Tierra | 100 | 85 | 10 | uno | — |
| Caparazón | Tierra | — | — | 20 | yo | Sube 2 niveles la Defensa |
| Cierzo | Aire | 70 | 95 | 10 | todos | Baja 1 nivel la Velocidad de los rivales |
| Planeo | Aire | 80 | 100 | 15 | uno | — |
| Remolino | Aire | — | 100 | 15 | uno | Le obliga a cambiar a otro userito al azar |
| Chispazo | Rayo | 90 | 100 | 15 | uno | 10 %: paraliza |
| Distorsión | Rayo | 60 | 100 | 10 | todos | 10 %: achispa |
| Solo de teclado | Rayo | 130 | 90 | 5 | uno | Al turno siguiente no puede hacer nada (recarga) |
| Premio gordo | Rayo | ? | 100 | 10 | uno | Tirada de tragaperras: potencia 0, 40, 80 o 150 |
| Chupitazo | Alcohol | 80 | 100 | 15 | uno | 20 %: achispa |
| Ronda | Alcohol | 65 | 100 | 10 | todos | Ronda para todos. 10 %: achispa |
| Garrafón | Alcohol | 110 | 85 | 5 | uno | 30 %: achispa |
| ¡Una más! | Alcohol | — | 100 | 10 | todos | «Aquí no se va nadie»: los rivales no pueden cambiar el turno siguiente y baja 1 nivel su Velocidad |
| Dolor de cabeza | Alcohol | — | 90 | 15 | uno | Lo achispa |
| Rumba | Juerga | 20 | 90 | 20 | uno | Pega de 2 a 5 veces |
| Taconeo | Juerga | 85 | 100 | 15 | uno | 20 %: retrocede (pierde el turno si aún no ha actuado) |
| Conga | Juerga | 70 | 100 | 10 | todos | — |
| Pogo | Juerga | 75 | 95 | 10 | todos | 20 %: retroceden |
| Coz doble | Juerga | 45 | 100 | 15 | uno | Pega dos veces (una por cabeza) |
| Chulería | Juerga | 80 | 100 | 15 | uno | — |
| Compás | Juerga | — | — | 20 | yo | Sube 2 niveles el Ataque |
| ¡Camioneees y caravanaaas! | Juerga | 90 | 100 | 5 | todos | Si alguien la cantó el turno anterior, pega el doble |
| Zasca | Chanza | 100 | 90 | 10 | uno | — |
| Vacile | Chanza | 80 | 100 | 15 | uno | 20 %: baja 1 nivel el Especial |
| A dos voces | Chanza | 65 | 100 | 10 | todos | — |
| Monada | Chanza | — | 100 | 15 | todos | Nadie quiere pegarle: baja 1 nivel el Ataque de los rivales |
| Cizaña | Chanza | — | 90 | 10 | uno | Durante 2 turnos, sus ataques a un rival van a un rival al azar |
| Sí, y… | Chanza | — | — | 15 | — | Copia el último movimiento que se haya usado en la batalla, de quien sea |
| Fritanga | Grasa | 90 | 100 | 15 | uno | 20 %: quema (salta el aceite) |
| Pringue | Grasa | 65 | 100 | 10 | todos | 20 %: resbalan y baja 1 nivel su Velocidad |
| Tropezón | Grasa | 70 | 100 | 15 | uno | 30 %: lo empacha |
| Indigestión | Grasa | — | 90 | 10 | uno | Lo empacha |
| Rebozado | Grasa | — | — | 20 | yo | Sube 2 niveles la Defensa |
| Susto | Fantasma | 40 | 100 | 30 | uno | Ataca antes que nadie (solo van antes los cambios y Esconderse) |
| Eco | Fantasma | 40 | 100 | 20 | uno | Pega dos veces |
| Venganza | Fantasma | 50 | 100 | 10 | uno | Doble de potencia contra quien le hizo daño el turno anterior |
| Flipada | Fantasma | — | — | 10 | yo | Sube 1 nivel el Ataque, el Especial y la Velocidad; baja 1 nivel la Defensa |
| Selfie | Fantasma | — | 70 | 15 | todos | Flash en la cara: baja 1 nivel la precisión de los rivales |

---

