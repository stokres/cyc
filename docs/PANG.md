# Camiones y Caravanas · PANG

Juego aparte (12 de octubre de 2026, a petición de Jesús): un *Pang* de recreativa con los cuatro amigos y doce fases de Usera a Las Vegas. **Por ahora es solo el juego, sin historia** (ni intro ni conversaciones; decidido por Jesús el mismo día): título, elegir personaje y las doce fases seguidas. Vive en la rama `claude/pang-cyc-56o0iv`, se abre con `pang.html` y no toca el capítulo 1.

## Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `pang.html` | Página del juego. `pang.html?fase=N&pj=fran` juega esa fase directamente (para probar); `&bots=1..3` añade bots con los otros personajes; `&demo` la juega sola |
| `src/pang/tipos.ts` | Contrato común: pantalla lógica, área de juego, tallas de burbuja, datos de fase, estilo de cada personaje |
| `src/pang/fases.ts` | Las doce fases (burbujas, bloques, escaleras, jefe, especial, música, tiempo) |
| `src/pang/juego.ts` | Una fase jugada por 1 a 4 jugadores (`Partida`: un `Mandos` y un `JugadorVivo` por jugador): bucle, física, armas, objetos, jefes, marcador y botones táctiles. Con varios jugadores rigen las reglas de `docs/PANG-ONLINE.md` |
| `src/pang/mundo.ts`, `hud.ts`, `bot.ts` | El estado de la fase (`Mundo.jugadores`), el marcador (un panel por jugador si son varios) y el bot (uno por jugador) |
| `src/pang/sonido.ts` | Efectos de sonido sintetizados (con grabadora opcional para el juego online) |
| `src/pang/red/` | Jugar online (`docs/PANG-ONLINE.md`): conexión, sala, fotos de la partida y el flujo de un juego online |
| `src/pang/arte/sprites.ts` | Pixel art de muñecos, burbujas, jefes, objetos, bloques y escaleras |
| `src/pang/arte/fondos.ts` | Los doce fondos de pixel art |
| `src/pang/main.ts`, `pantallas.ts`, `ui/`, `guardado.ts`, `pang.css` | Título, menú, elegir personaje, continuar, final, récords, ajustes y guardado |
| `src/textos/pang.md` | Todos los textos (mismo formato que el capítulo 1) |
| `scripts/servir-pang.mjs` | Servidor de `dist` para Railway (`npm start`): `/` abre el Pang |

## Pantalla y aspecto

- **Pixel art de recreativa**, como el *Pang* del tráiler del capítulo 2: lógica de 384 × 216 (16:9), ampliada sin suavizar al mayor múltiplo entero que quepa. El menú y la elección de personaje van en HTML con los retratos de siempre (`retrato` de `src/juego/reparto.ts`) y el estilo de la guía (cristal ahumado, filete dorado, Graduate y Alegreya Sans).
- Área de juego: paredes en x = 8 y x = 376, techo en y = 8, suelo en y = 184. De 192 a 216, el marcador, con la letra *Press Start 2P* (Google Fonts, OFL).
- **Rendimiento** (`docs/ESTILO.md`, T5): todo se pinta una vez en lienzos pequeños y cada fotograma solo copia imágenes; nada de SVG en el lienzo; bucle con tope de 60 fps; la física va a pasos fijos.

## Reglas

- **Burbujas.** Cuatro tallas (radio 20, 12, 7 y 4). Un impacto parte una en dos de la talla siguiente, que saltan un poco hacia arriba y salen en direcciones opuestas; la más pequeña revienta. Botan siempre a la misma altura según su talla y flotan como en el original (12 de octubre de 2026, Jesús: iban demasiado rápidas): caen con menos gravedad que el jugador, las grandes van más despacio que las pequeñas y todas aceleran fase a fase (de ×0,8 en la 1 a ×1,2 en la 12). Los **posavasos** (fase 7) no caen: van en diagonal y rebotan en todo. Puntos: 50, 100, 150 y 200 de mayor a menor.
- **Jugador.** Anda a izquierda y derecha y nunca salta. En la fase 8 sube y baja por escaleras a las murallas. Si le toca una burbuja o un jefe, pierde una vida y la fase empieza otra vez (como en el original); igual si se acaba el tiempo. Tres vidas; sin vidas, «¿Continuar?», que repite la fase con tres vidas y los puntos a cero (continuaciones sin límite, para que todos vean el final).
- **Al superar una fase**, bonus por el tiempo que sobra.

### Los cuatro

| | Disparo | Paso (px/s) | Especial |
|---|---|---|---|
| Fran | Arpón doble: dos a la vez | 62 | **¡Una más!**: las burbujas (y el jefe) se quedan quietas 5 s |
| Pablo | Arpón de impro: se clava en el techo y se queda 2,5 s | 72 | **¡Sí, y…!**: cada burbuja se parte a la vez; al jefe le quita 3 |
| Chuchi | Ráfaga: balas cortas y rápidas (hasta 5 a la vez) | 84 | **Modo kinki**: 6 s de ráfaga triple que atraviesa |
| Guille | Arpón ancho (7 px en vez de 3) | 72 | **Abrazo de oso**: escudo que aguanta un golpe y al romperse revienta lo que tiene a menos de 48 px |

La barra del especial se llena con 16 burbujas reventadas (o golpes al jefe) y se conserva entre vidas.

### Objetos (12 % de las burbujas sueltan uno; caen, esperan 6 s y parpadean antes de irse)

- **Reloj** de la cocina de Fran: congela las burbujas 5 s.
- **Chupito**: dinamita, todas las burbujas a la talla más pequeña (no sale con jefe).
- **Escudo**: aguanta un golpe.
- **Caña**: vida extra (una por fase como mucho).
- **Comida** para puntos: taquitos de jamón, aceitunas, croqueta, turrón y yema de Ávila.

### Lo especial de cada fase

- **3 · Piso de Fran:** Aceituna cruza corriendo de vez en cuando y suelta taquitos. No hace daño.
- **5 · Teatro:** la sombra apaga las luces: 8 s a oscuras y 3 s con luz. A oscuras solo se ve alrededor del jugador y bajo un foco que se pasea.
- **9 · Zaragoza:** el cierzo sopla a rachas, cambia de lado y empuja burbujas y jugador; un aviso dice hacia dónde.
- **4 · Robi** (jefe): bota como una burbuja grande. Cada pocos segundos se pone el gorrito de fiesta y los disparos rebotan. Suelta bolas pequeñas al recibir golpes.
- **6 · El Peor** (jefe): el cerdo de 152 kilos bota más bajo y más rápido; cada golpe suelta un cerdito (una burbuja pequeña). Al final, más rápido.
- **12 · La Penúltima** (jefe final): una jarra gigante que flota por arriba y escupe burbujas de champán; a media vida se enfada y escupe más.

## Música

Tres temas propios, sintetizados con `tools/musica/pang.py` (12 de octubre de 2026, Jesús pidió música cañera con melodías buenas, en la línea de *VVVVVV* y *Streets of Rage 2*): «A tope por Usera» (chiptune, 150 ppm, la menor; también en el título y los menús), «La calle de la penúltima» (house con FM de Mega Drive, 126 ppm, re dórico) y «Última ronda» (168 ppm, mi menor; la de los jefes). Se turnan fase a fase (`musica` en `src/pang/fases.ts`). Se generan con `python3 pang.py <usera|calle|ronda> bucle ../../src/sonido/pang-<nombre>.mp3`.

## Controles

- **Móvil (horizontal):** ◀ ▶ abajo a la izquierda (se puede deslizar el dedo de uno a otro), Disparo y Especial abajo a la derecha, y Pausa arriba a la derecha. En la fase 8 salen ▲ ▼ para las escaleras. Botones de al menos 44 px CSS, semitransparentes y en las zonas seguras.
- **Teclado:** flechas o A/D para andar, ↑/↓ o W/S en las escaleras, espacio, Z o J para disparar, ↑ (o W, fuera de las escaleras), Ctrl o Cmd, X, K o Mayúsculas para el especial, Esc o P para la pausa.

## Jugar online

«Jugar online» en el menú principal abre la sala (hasta cuatro jugadores, una sola sala, con contraseña): cada uno elige personaje, el anfitrión empieza y elige la fase. La contraseña es la variable de entorno `PANG_CLAVE` del servidor (en Railway; para probar en local, `PANG_CLAVE=prueba npm start`); si no está puesta, la sala no pide contraseña. Cómo funciona y los mensajes: `docs/PANG-ONLINE.md`.

## Guardado

En el navegador (`cyc.pang.v1`): la fase más alta alcanzada (para «Seguir» y «Elegir fase»), las cinco mejores partidas (puntos, personaje, fase y fecha) y los volúmenes. En la tabla de récords, una marca fija de CYC siempre va primero.

## Publicación

GitHub Pages solo publica una fuente por repositorio (el capítulo 1, desde la rama principal), así que el Pang se publica en **Railway** desde su rama: Railway hace `npm run build` y `npm start` (`scripts/servir-pang.mjs`), y vuelve a publicar con cada push.
