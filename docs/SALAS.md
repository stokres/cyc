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
| `lista { juego }` | El socket pasa a mirar la lista de ese juego, o de **todos** si `juego` es `'*'` (`JUEGO_TODOS`; lo usa la portada). Responde `salas` y lo repite cada vez que cambie cualquier sala (crear, entrar, salir, empezar, volver, cerrar). Solo a los sockets del vestíbulo. |
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
| `salas` | `{ salas: [{ codigo, juego, anfitrion: nombre\|null, jugadores, max, enPartida }], abiertas, max }`. La lista es solo del juego mirado (de todos con `'*'`); `abiertas` cuenta las de toda la web y `max` es `MAX_SALAS`. |
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
   `abrir()` → `mirarLista(juego)` o `mirarTodas()` (llegan eventos `salas`; `con.salas` y `con.abiertas` guardan lo último) → `crear(juego, max)` o `unirse(codigo, juego)` (`Promise<{ ok: true } | { ok: false, motivo }>`, con `'red'` si no hay conexión) → `elegir`, `empezar`, `volver`, `juego(a, datos)` → `salir()` (vuelve a la lista) o `cerrar()` (cierra el socket). Eventos con `on(tipo, f)`; el evento local `perdida` avisa de un socket cerrado sin pedirlo; tras `cerrada` el socket sigue abierto y `con.cierre` dice por qué.
3. La partida es tuya: el anfitrión la lleva y manda por `juego`; el servidor no la ve. Las pantallas de lista y sala también son tuyas (la lista de PokéUsera es `pantallaSalas` en `src/pokeusera/red/sala.ts`; el enlace `?sala=K7MZ` lo abre el flujo del juego; ver «Enlaces a una sala y la portada»).
4. Textos de la interfaz en `src/textos/`, nunca en el código.

## Enlaces a una sala y la portada

`src/sala/reglas.mjs` guarda `SALAS_EN_WEB`: los juegos cuya página sabe abrir una sala desde un enlace, con su ruta (hoy solo `{ pokeusera: '/pokeusera' }`). `enlaceSala(juego, codigo | 'nueva')` da el enlace (`'/pokeusera?sala=K7MZ'` o `'/pokeusera?sala=nueva'`), o `null` si el juego no está ahí.

**Contrato de los enlaces** (lo debe cumplir cualquier juego que se añada a `SALAS_EN_WEB`; el Pang lo hará al tener online). La página del juego lee `sala` con `parametros()` (`src/core/direccion.ts`, no `location.search`):

- `?sala=CODIGO` entra en esa sala (si no se puede —no existe, llena, en partida, sin red—, avisa con el texto de ese caso y enseña la lista de salas del juego).
- `?sala=nueva` **crea** una sala de 4 (`SALA_NUEVA`, como el botón de crear de su lista). Si no se puede (ya hay 4 salas, sin red) avisa igual y enseña la lista.
- Ambos pasan antes por lo que el juego pida siempre al abrir (título, nombre de la cuenta) y solo valen la primera vez (después, flujo normal).

**La pegatina «Salas online» de la portada** (`src/portada/salas.ts`, estilos `.salas` en `portada.css`, textos `salas.*` en `portada.md`, hueco `#salas` en `portada.html`, justo después de PokéUsera). Abre un `ConexionSala` propio, manda `lista '*'` y rehace el DOM solo cuando llega `salas` y la lista ha cambiado (nada por fotograma). Título «Salas online · n/4» (las abiertas en toda la web); una fila por sala (anfitrión o código, juego, `jugadores/max`) con un enlace ENTRAR a `enlaceSala` o, si juega o está llena, un sello «Jugando» / «Llena» sin enlace; las salas de juegos fuera de `SALAS_EN_WEB` salen sin botón. Un botón «Crear sala de {juego}» por cada juego de `SALAS_EN_WEB` (enlace a `?sala=nueva`; con 4 salas abiertas, apagado y con la línea «Ya hay 4 salas abiertas…»). Sin salas, una invitación y el botón de crear. **Sin conexión con `/sala`** (sin red, 401 sin el pase, fallo, conexión perdida) la pegatina está `hidden` y no dice nada; reintenta cada 15 s mientras la página se vea. Con la página oculta (`visibilitychange`) cierra el socket y al volver a verse lo reabre. La portada no manda token, así que nunca ocupa un sitio ni expulsa a nadie. Al añadir un juego a `SALAS_EN_WEB`, su nombre va en `portada.md` (`salas.juego.<id>`).

## Pang

El Pang tiene su online en otra rama (`claude/pang-cyc-56o0iv`, sin unir): una sala propia con su contraseña. **Al unirla tendrá que usar este servicio** (`src/sala/` y `JUEGOS_ONLINE`, que ya incluye `'pang'`) en vez de su sala propia: su lista de salas, sus códigos y su límite de salas son los de esta página, no los suyos.
