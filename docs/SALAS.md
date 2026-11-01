# Salas online (servicio común de la web)

Una sola infraestructura de salas para **todos los juegos** de la web. Cada juego solo programa su partida: el servidor reparte mensajes y el navegador del anfitrión lleva la partida (el servidor no sabe nada de ningún juego).

- Servidor: `scripts/salas.mjs` (WebSocket en `/sala`; lo monta `scripts/servir-pokeusera.mjs`).
- Reglas compartidas (servidor y cliente): `src/sala/reglas.mjs` (+ `.d.mts`).
- Cliente común: `src/sala/conexion.ts` (`ConexionSala`, sin importar ningún juego; solo lee el token de la cuenta de `src/cuenta/`).
- Primer juego que lo usa: PokéUsera (`src/pokeusera/red/`, «Online» en `docs/POKEUSERA.md`).

## Reglas

- **Como mucho 4 salas abiertas en toda la web** (`MAX_SALAS`), de cualquier juego. La quinta recibe `rechazo { motivo: 'muchas' }`.
- Cada sala es de un juego de `JUEGOS_ONLINE` (`'pokeusera'`, `'pang'`; para añadir uno, se añade ahí) y de **1 a 4 jugadores** (`max`, lo elige quien crea la sala).
- **Código de 4 letras** (`K7MZ`) del alfabeto `ALFABETO_SALA` (sin 0, O, 1, I, L). `limpiarCodigoSala(x)` acepta minúsculas y espacios y devuelve el código en mayúsculas o `null`.
- Sin contraseña de sala: a `/sala` solo llega quien pasó la puerta de la web (`CYC_CLAVE`, cookie; `scripts/pase.mjs`).
- **Nombres:** salen de la cuenta de la web. El cliente manda su token (`tokenLocal()`) al crear o unirse y el servidor lo cambia por el nombre (`cuentaDeToken`, de `scripts/api-estadisticas.mjs`); sin cuenta, `nombre: null`. El token no se reenvía a nadie.
- Una sala tiene un anfitrión (id 0 al crearla; el id de cada jugador es el más bajo libre). Un socket está en el **vestíbulo** o dentro de **una** sala.
- Los personajes (`pj`) los define cada juego; el servidor solo exige que sean únicos en la sala y de la forma `limpiarPj` (`/^[a-z0-9_-]{1,20}$/`).

## Mensajes (JSON, campo `tipo`)

**Cliente → servidor**

| Mensaje | Qué hace |
|---|---|
| `lista { juego }` | El socket pasa a mirar la lista de ese juego. Responde `salas` y lo repite cada vez que cambie cualquier sala (crear, entrar, salir, empezar, volver, cerrar). Solo a los sockets del vestíbulo. |
| `crear { juego, max, token? }` | Crea una sala (`max` entero 1 a 4) y mete al socket como anfitrión. `rechazo`: `muchas`, `invalido`. |
| `unirse { codigo, juego, token? }` | Entra en una sala. `rechazo`: `noexiste`, `otrojuego`, `enpartida`, `llena`. |
| `elegir { pj }` | Elige personaje (`null` lo suelta). Si está cogido, solo el que lo pidió recibe `sala` con el estado real. No durante la partida. |
| `empezar` / `volver` | Solo el anfitrión: empieza la partida (`enPartida`) / vuelve a la sala. Se reparte `empezar` / `volver` a todos. |
| `juego { a, datos }` | Tráfico de la partida. `a`: `'anfitrion'`, `'todos'` o (solo si lo manda el anfitrión) el id de un jugador. Nunca vuelve al que lo manda. |
| `salir` | Deja la sala y vuelve al vestíbulo. Si es el anfitrión, la sala se cierra. |
| `entrar { clave }` | Solo para clientes viejos de PokéUsera (apps instaladas con caché): se unen a la primera sala de `pokeusera` con sitio y sin partida, o crean una de 4; si no se puede, `rechazo { motivo: 'llena' }` y se cierra el socket. |

**Servidor → cliente**

| Mensaje | Contenido |
|---|---|
| `salas` | `{ salas: [{ codigo, juego, anfitrion: nombre\|null, jugadores, max, enPartida }], abiertas, max }`. La lista es solo del juego mirado; `abiertas` cuenta las de toda la web y `max` es `MAX_SALAS`. |
| `bienvenida` | `{ id, anfitrion, codigo, juego, max }`: ya estás dentro. |
| `rechazo` | `{ motivo }`: `muchas`, `noexiste`, `otrojuego`, `enpartida`, `llena`, `invalido`. **No cierra el socket** (sigues en el vestíbulo y puedes probar otra cosa). |
| `sala` | `{ codigo, juego, max, jugadores: [{ id, pj, anfitrion, nombre }], enPartida }` a todos los de la sala, cada vez que algo cambia. |
| `empezar`, `volver` | Aviso a todos los de la sala. |
| `juego` | `{ de, datos }`: lo que mandó otro jugador. |
| `salio` | `{ id }`, solo al anfitrión: un invitado se fue. |
| `cerrada` | `{ motivo: 'anfitrion' \| 'inactiva' }`: la sala ya no existe; tus sockets siguen abiertos y vuelves al vestíbulo. |

## Cierre y limpieza (nunca una sala fantasma)

- Se va el anfitrión (`salir`, el socket se cierra o muere por el ping) → `cerrada { motivo: 'anfitrion' }` a todos y la sala se borra. Una sala sin nadie se borra.
- **Inactividad:** 30 min sin ningún mensaje de sus jugadores → `cerrada { motivo: 'inactiva' }` (se revisa cada minuto). Un juego que pueda estar callado más tiempo (p. ej. un podio abierto) tiene que mandar algo de vez en cuando o aceptar que se cierre.
- **Misma cuenta en otra conexión** (recarga de página, móvil que se reconectó): si alguien crea o se une con un token cuya cuenta ya está en una sala con otro socket, ese socket viejo se saca antes (como si se cerrara) y libera la sala fantasma.
- Un socket que no manda nada en 10 s tras conectar se cierra. Ping cada 20 s (Railway); un socket que no contesta se cierra. `maxPayload` de 64 KB; no se reenvía a un cliente con más de 1 MB pendiente.
- El servidor escribe en el registro una línea al abrir y al cerrar una sala: `[salas] abierta K7MZ pokeusera (2/4 en la web)`.

## Cómo usarlo desde un juego nuevo

1. Añade el juego a `JUEGOS_ONLINE` en `src/sala/reglas.mjs`.
2. En el cliente, usa `ConexionSala` (o una clase tuya que la extienda, como `Conexion` de PokéUsera):
   `abrir()` → `mirarLista(juego)` (llegan eventos `salas`; `con.salas` y `con.abiertas` guardan lo último) → `crear(juego, max)` o `unirse(codigo, juego)` (`Promise<{ ok: true } | { ok: false, motivo }>`, con `'red'` si no hay conexión) → `elegir`, `empezar`, `volver`, `juego(a, datos)` → `salir()` (vuelve a la lista) o `cerrar()` (cierra el socket). Eventos con `on(tipo, f)`; el evento local `perdida` avisa de un socket cerrado sin pedirlo; tras `cerrada` el socket sigue abierto y `con.cierre` dice por qué.
3. La partida es tuya: el anfitrión la lleva y manda por `juego`; el servidor no la ve. Las pantallas de lista y sala también son tuyas (la lista de PokéUsera es `pantallaSalas` en `src/pokeusera/red/sala.ts`; el enlace `?sala=K7MZ` lo abre el flujo del juego).
4. Textos de la interfaz en `src/textos/`, nunca en el código.

## Pang

El Pang tiene su online en otra rama (`claude/pang-cyc-56o0iv`, sin unir): una sala propia con su contraseña. **Al unirla tendrá que usar este servicio** (`src/sala/` y `JUEGOS_ONLINE`, que ya incluye `'pang'`) en vez de su sala propia: su lista de salas, sus códigos y su límite de salas son los de esta página, no los suyos.
