# PANG online: los cuatro en una sala

Pedido por Jesús el 12 de octubre de 2026: jugar online los cuatro, en una sola sala con una contraseña sencilla. Este documento es el contrato entre las piezas; `docs/PANG.md` sigue siendo la especificación del juego.

## Cómo funciona

- **Una sola sala** en el mismo servidor de Railway que sirve el juego (`scripts/servir-pang.mjs`), por WebSocket en la ruta `/sala`. La contraseña es la variable de entorno `PANG_CLAVE` de Railway; si no está puesta, la sala no pide contraseña (y el servidor lo avisa en el registro). Nunca se escribe en el repositorio.
- **El anfitrión hace de recreativa.** El primero que entra en la sala es el anfitrión: su navegador simula la partida con todos los jugadores, como en el juego de siempre. Los demás (invitados) solo mandan sus botones y pintan lo que el anfitrión les manda. El servidor solo reparte mensajes; no sabe nada del juego.
- **Si el anfitrión se va**, la sala se cierra para todos y vuelven al menú. Si se va un invitado, su muñeco desaparece de la partida y los demás siguen.
- De 1 a 4 jugadores, cada uno con un personaje distinto.

## Reglas con varios jugadores (`n > 1`)

Con un solo jugador (también en online con uno) todo es exactamente como en `docs/PANG.md`.

- **Cooperativo:** las mismas burbujas para todos. Cada uno tiene sus vidas, sus puntos, su barra de especial y su arma. Los puntos y la barra son de quien revienta la burbuja (o golpea al jefe, o recoge el objeto).
- **Al recibir un golpe** (decisión pendiente de Jesús; por defecto «reaparece»): pierde una vida, se queda 1,2 s con la animación de herido sin chocar con nada y vuelve en ese mismo sitio parpadeando 2 s (invulnerable). La fase sigue para los demás. Sin vidas, queda **fuera**: no se pinta ni choca hasta que acaba la fase; en la fase siguiente vuelve con 1 vida.
- **La fase se pierde** si todos están fuera, o si se acaba el tiempo (entonces todos pierden una vida y la fase empieza de nuevo, como con uno). Al perderla sin vidas: «¿Continuar?» para todos (decide el anfitrión): la fase otra vez, cada uno con 3 vidas y sus puntos a cero.
- **Especiales:** el de Fran congela todo (para todos); el de Pablo parte todas las burbujas (los puntos, para Pablo); el kinki de Chuchi y el escudo de Guille son solo suyos.
- **Objetos:** los coge el primero que los toca. El reloj y el chupito afectan a todos; el escudo, la caña y la comida, a quien los coge. La caña sigue siendo una por fase.
- **Jefes:** vida × (1 + 0,5 × (n − 1)).
- **Salida:** los jugadores empiezan repartidos alrededor de `fase.inicio`, separados 40 px y sin salirse del área.
- **Teatro (fase 5):** a oscuras hay luz alrededor de cada jugador.
- **Marcador con varios:** la franja de abajo se reparte en `n` paneles, uno por jugador (cara, puntos, vidas y barra). El tiempo pasa arriba a la derecha del área de juego. En cada pantalla, el jugador propio lleva una flechita encima durante «¡LISTOS!» y «¡YA!».

## Mensajes

Todos son JSON. El servidor solo mira `tipo` y, en el reparto, `a`.

Del navegador al servidor:

| `tipo` | Campos | Qué hace el servidor |
|---|---|---|
| `entrar` | `clave` | Comprueba la contraseña. Si vale y hay sitio (máx. 4) y no hay partida en curso, le da un `id` y le responde `bienvenida`; si no, `rechazo` y cierra. |
| `elegir` | `pj` | Le asigna ese personaje si está libre (o `null` para soltarlo) y manda `sala` a todos. |
| `empezar` | — | Solo el anfitrión. Marca la partida en curso y reenvía `empezar` a todos. |
| `volver` | — | Solo el anfitrión: la partida terminó; la sala vuelve a admitir gente y se reenvía a todos. |
| `juego` | `a: 'anfitrion' \| 'todos'`, `datos` | Reenvía `{ tipo: 'juego', de: id, datos }` al anfitrión o a todos menos al que lo manda. |

Del servidor al navegador:

| `tipo` | Campos |
|---|---|
| `bienvenida` | `id`, `anfitrion: boolean` |
| `rechazo` | `motivo: 'clave' \| 'llena' \| 'en-partida'` |
| `sala` | `jugadores: { id, pj: PjId \| null, anfitrion: boolean }[]`, `enPartida: boolean` |
| `empezar`, `volver` | lo que mandó el anfitrión |
| `juego` | `de`, `datos` |
| `salio` | `id` (un invitado se fue) |
| `cerrada` | el anfitrión se fue: la sala queda vacía |

El servidor manda un ping de WebSocket cada 20 s para que Railway no corte la conexión.

### Dentro de `juego` (los `datos`)

- Invitado → anfitrión: `{ k: 'mandos', izq, der, arriba, abajo, fuego, disparo, especial, sube }`. Los tres últimos son contadores que solo crecen (cada pulsación suma uno), para que no se pierda ninguna.
- Anfitrión → todos: `{ k: 'fase', n, jugadores }` al empezar cada fase; `{ k: 'estado', ... }` unas 30 veces por segundo con la foto de la partida; `{ k: 'continuar' }`, `{ k: 'final', puntos }` y `{ k: 'menu' }` para las pantallas entre fases.
