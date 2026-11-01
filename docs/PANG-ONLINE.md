# PANG online: de uno a cuatro en una sala de la web

Pedido por Jesús (12 de octubre de 2026) y vuelto a traer el 1 de noviembre de 2026, ahora sobre las **salas comunes de la web** (`docs/SALAS.md`) en vez de la sala única con contraseña de la rama original (`claude/pang-cyc-56o0iv`, que ya no se usa). Este documento es el contrato entre las piezas; `docs/PANG.md` sigue siendo la especificación del juego.

## Cómo funciona

- **Salas:** `ConexionSala` (`src/sala/conexion.ts`) con el juego `'pang'`. Menú → «Jugar online» → lista de salas del Pang → «Crear sala» (1 a 4 jugadores), tocar una sala o escribir su código de 4 letras → sala (cada jugador elige su personaje, **único**; los nombres son los de la cuenta de la web; «Compartir» el enlace) → el anfitrión pulsa «¡A jugar!», elige la fase de salida y empieza. Todo en `src/pang/red/sala.ts`.
- **Enlaces:** `/pang?sala=K7MZ` entra directamente en esa sala (si falla —no existe, llena, en partida—, la lista dice por qué) y `/pang?sala=nueva` abre «Crear sala». Sin pasar por el título.
- **El anfitrión simula; los invitados pintan.** El navegador del anfitrión lleva la partida con todos los jugadores, como en el juego de siempre. Los invitados solo mandan sus botones y pintan lo que el anfitrión les manda. El servidor solo reparte mensajes.
- **Salidas y cierres:** la sala cerrada (`cerrada`: el anfitrión se fue o pasaron 30 minutos sin mensajes), la conexión perdida (`perdida`) o un invitado que se va (`salio`, solo lo ve el anfitrión: su muñeco desaparece y los demás siguen) llevan a la lista o al menú con un aviso corto («Se ha cerrado la sala.», «Se ha perdido la conexión.»). El anfitrión que sale de la partida cierra la sala para todos.
- **Al acabar** (las doce fases, o «Al menú» tras perder) el anfitrión manda `volver` y todos regresan a la sala.
- **Inactividad:** el servidor cierra una sala sin mensajes en 30 minutos. En partida hay tráfico siempre (los invitados mandan botones cada 0,5 s y el anfitrión, fotos), pero en las pantallas entre fases (continuar, final, elegir fase) no: **el anfitrión manda `{ k: 'vivo' }` cada 60 s** durante toda la partida online.

## Reglas con varios jugadores (`n > 1`)

Con un solo jugador (también en online con uno) todo es exactamente como en `docs/PANG.md`: sin burbujas de refuerzo, sin fotos, la pausa para el juego y los récords van a la tabla de siempre.

- **Cooperativo:** las mismas burbujas para todos. Cada uno tiene sus vidas, sus puntos, su barra de especial y su arma. Los puntos y la barra son de quien revienta la burbuja (o golpea al jefe, o recoge el objeto).
- **Al recibir un golpe:** pierde una vida, se queda 1,2 s con la animación de herido sin chocar con nada y vuelve en ese mismo sitio parpadeando 2 s (`golpeado`; con escudo no hay golpe). La fase sigue para los demás. Sin vidas, queda **fuera**: no se pinta ni choca hasta que acaba la fase; en la fase siguiente vuelve con 1 vida. Perder una vida pierde el arma (Pablo la conserva).
- **La fase se pierde** si todos están fuera o si se acaba el tiempo (entonces todos pierden una vida y la fase empieza de nuevo, con sus burbujas de refuerzo otra vez). Al perderla sin vidas: «¿Continuar?», que decide **el anfitrión** (los invitados esperan): la fase otra vez, cada uno con 3 vidas, el arma normal y los puntos a cero.
- **Especiales:** el de Fran congela todo (para todos); el de Pablo parte todas las burbujas (los puntos, para Pablo); el kinki de Chuchi y el abrazo de Guille son solo suyos.
- **Objetos:** los coge el primero que los toca, también las armas (el reloj y el chupito afectan a todos; el escudo, la caña y la comida, a quien los coge). La caña sigue siendo una por fase. Al elegir un arma nueva, «nunca sale la que ya llevas» solo mira al jugador 0.
- **Jefes:** vida × (1 + 0,5 × (n − 1)). Sin burbujas de refuerzo.
- **Salida:** los jugadores empiezan repartidos alrededor de `fase.inicio`, separados 40 px y sin salirse del área.
- **Teatro (fase 5):** a oscuras hay luz alrededor de cada jugador.
- **Marcador con varios:** la franja de abajo se reparte en `n` paneles, uno por jugador (cara, puntos, arma, vidas y barra). El tiempo pasa arriba a la derecha del área de juego. En cada pantalla, el jugador propio lleva una flechita encima durante «¡LISTOS!» y «¡YA!».
- **Pausa:** online no para el juego (los demás siguen): el menú se abre encima y se cierra solo si la fase acaba. «Salir de la partida» te saca de la partida y de la sala.

### Más burbujas con más jugadores (solo `n > 1` y fases sin jefe)

- Cuántas: `extras = max(n − 1, round(B × 0,4 × (n − 1)))`, con `B` el número de burbujas iniciales de la fase (p. ej. 4 jugadores y `B` = 4: 3 extras; `B` = 10: 12).
- Cuáles: cada extra es una copia (talla, variante y color) de las burbujas iniciales de la fase **por orden, de la más grande a la más pequeña, dando la vuelta si hace falta**.
- Cuándo: no están al empezar. **Caen del techo de una en una**: la primera a los 3 s de «¡YA!» y luego una cada 4 s, en una x al azar dentro del área y libre de bloques (si no hay hueco, en cualquiera), en una dirección horizontal al azar y con un pequeño estallido. Con las burbujas congeladas (reloj, Fran) el reloj de las que faltan espera.
- La fase **solo se supera cuando han entrado todas las extra y no queda ninguna burbuja**. El tiempo de la fase no cambia.
- Todo esto lo hace la simulación del anfitrión (`prepararRefuerzos` y `soltarRefuerzo` en `src/pang/juego.ts`; `Mundo.refuerzos`); los invitados solo ven burbujas nuevas en la foto.

## Récords

- Con **n ≥ 2** cada jugador, al acabar la partida (sin vidas, final o al salir), manda **sus propios puntos** con `enviarRecord('pangGrupo', puntos, { pj, fase, n }, fecha)`. `n` es el número de jugadores al empezar la partida. Tabla nueva `pangGrupo` en `src/cuenta/tablas.mjs` (`extra` `{ pj, fase, n }`, `n` entero de 2 a 4, validado en `limpiarExtra` por el servidor).
- Con **n = 1** online va a la tabla de siempre (`pang`, y a «En este móvil»). Las partidas en grupo **no** se guardan en «En este móvil», que es solo de partidas de uno.
- Al salir en mitad de una fase cuentan los puntos que ya tenía en ese momento (en el juego de uno cuentan los de antes de la fase).
- La pantalla de récords tiene la pestaña **«En grupo»** (tabla `pangGrupo`, mismas filas que «De todos» más «con N»).

## Mensajes de la partida

Todos son JSON dentro de `juego { a, datos }` (`docs/SALAS.md`); el servidor no mira `datos`.

- Invitado → anfitrión: `{ k: 'mandos', izq, der, arriba, abajo, fuego, disparo, especial, sube }`. Los tres últimos son contadores que solo crecen (cada pulsación suma uno), para que no se pierda ninguna.
- Anfitrión → todos: `{ k: 'fase', n, jugadores: { id, pj, vidas, puntos, arma }[] }` al empezar cada fase (el índice en esa lista es el número de jugador); `{ k: 'estado', ...foto }` unas 30 veces por segundo; `{ k: 'fin', resultado }` cuando acaba la fase (`resultado` es el de `jugarFase`: `superada` y puntos, vidas y arma de cada uno); para las pantallas entre fases `{ k: 'final' }` (tras la fase 12) y `{ k: 'menu' }` (el anfitrión no continúa); y `{ k: 'vivo' }` cada 60 s. Si `fin` dice que se perdió, los invitados esperan («El anfitrión decide si seguís…») hasta la siguiente `fase` (continuar) o `menu`.

## Las fotos

Archivos: `src/pang/red/sala.ts` (lista y sala), `online.ts` (una partida entera), `foto.ts` (las fotos y su interpolación); además `juego.ts` (`rol`, `alFoto`, `recibirFoto`, `terminarRed`, `sacarJugador` y el control `'red'`) y la grabadora de efectos en `sonido.ts`.

- **Cada navegador crea una `Partida` por fase** con `jugarFase`. La del anfitrión (`rol: 'anfitrion'`) es la de siempre, con los demás como jugadores `'red'`: `online.ts` escribe sus botones en `partida.mandos[i]`. La del invitado (`rol: 'invitado'`) nunca llama a `simular`: recibe fotos (`partida.recibirFoto`) y pinta con el `dibujar()` de siempre. Con un solo jugador en la fase, el anfitrión no usa `rol`.
- **La foto** (`sacarFoto`, cada 30 ms, después de los pasos de simulación) es un JSON pequeño: el flujo de la fase (estado, tiempo en él, causa, bonus), el tiempo, el reloj congelado, el viento, los jugadores, las burbujas, los bloques rotos, los cables, las balas, los objetos, los efectos, los números flotantes, el jefe, el rótulo, lo especial de la fase y los sonidos del intervalo. Son arrays con claves cortas y números redondeados. De cada jugador viaja: posición, dirección, escalera, animación, disparo, invulnerabilidad, **escudo (golpes) y abrazo** (en un número), puntos, vidas, barra, **kinki**, caído, fuera y **arma**. Los objetos incluyen los cuatro de arma (`armaDoble`, `armaTriple`, `armaFijo`, `armaRafaga`) y los cables llevan si están pegados. **No viajan imágenes**: el invitado las reconstruye con las funciones cacheadas de `arte/sprites.ts` (por eso `Efecto`, `Popup` y `Aviso` guardan de qué se hicieron).
- **Sonidos:** `Efectos` tiene una grabadora; el anfitrión vuelca en cada foto lo que sonó y el invitado lo reproduce (`reproducir`) cuando su imagen llega a esa foto.
- **Interpolación** (`Espejo`, en el invitado): guarda las últimas fotos con la hora del anfitrión (`ts`) y la diferencia de relojes más favorable que ha visto; pinta unos 70 ms por detrás de la última (algo más si dejan de llegar, y vuelve a bajar) y mezcla linealmente las dos fotos que rodean esa hora: jugadores por índice, burbujas por `id`, el jefe, la aceituna y el reloj de la oscuridad. Todo lo demás toma la foto más nueva. Si no llega ninguna, se queda la última, y a los 2 s sale «ESPERANDO AL ANFITRION».
- **Botones del invitado:** `online.ts` los lee de su `Entrada` local cada ~16 ms y manda `mandos` cuando algo cambia (y cada 500 ms de latido). El anfitrión suelta los botones de quien lleva 3 s sin dar señales.
- **Rendimiento** (`docs/ESTILO.md`, T5): nada se pinta por fotograma que se pueda guardar; la foto va solo cuando hay más de un jugador en la fase.
