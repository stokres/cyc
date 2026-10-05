# Guía de estilo · Camiones y Caravanas

**Versión 1.0 · 2 de octubre de 2026**

Adaptación para móvil del «Kit de estilo · Juegos de equipo v1.2». Del kit se conserva la dirección visual y se descarta lo que solo funciona en un portátil potente. Esta guía es la fuente de verdad del estilo del juego.

Imágenes de referencia del kit, solo como referencia de ambiente: `docs/referencias/`.

## 1. Resumen

- **Estilo: cartoon cinematográfico nocturno.** Formas redondeadas y simples, pocas tintas por material y luz de película: ambiente frío y luces prácticas cálidas.
- **Personajes caricaturizados y reconocibles en un móvil.** Cabezas grandes, rasgos distintivos exagerados y retratos grandes en los diálogos.
- **Prohibido:** contornos negros, trucos de lente (aberración cromática, viñeta fuerte, destellos de lente) y fotorrealismo.
- **La luz explica la escena, no la tapa.** En caso de duda, menos efectos.
- **Móvil primero:** todo se juzga en un móvil en horizontal, no en un monitor.

## 2. Qué se conserva del kit y qué no

| Del kit | Decisión | Motivo |
|---|---|---|
| Cartoon cinematográfico (B1–B20) | **Se conserva**, reescrito abajo | Encaja con una noche de jueves en Usera |
| Contraste frío/cálido, charcos de luz, suelo mojado | **Se conserva** | Es el corazón del ambiente |
| Contornos en tono oscuro del propio color (B9–B10) | **Se conserva** | Da legibilidad sin línea negra |
| Personajes vectoriales por piezas con huesos (B21–B23) | **Se conserva** | Permite animar caricaturas con poco coste |
| Interfaz de cristal ahumado y filetes dorados (B24–B26) | **Se conserva** | Funciona bien sobre escenas nocturnas |
| Acuarela por capas (A1–A17) | **Se aplaza** a los recuerdos (sección 8) | Cara de producir y no hace falta para la demo |
| Arte vectorial convertido en texturas con relieve e iluminado en el render | **Se conserva** (fase 2) | Es lo que da el volumen y la luz del kit |
| Render diferido completo (G-buffer de 5 MRT, reflejos en pantalla, volumétricos reales, bloom por mips) | **Se aligera** | Versión para móvil: menos luces por píxel, efectos a media resolución, haces como sprites y reflejos con la escena invertida |
| Motor `shared/engine.js` (T4) | **Descartado** | Está atado a la demo del faro (faro, generador, candado, gaviota) |
| Fuente Cochin | **Descartada** | Solo existe en Apple; en Android no se vería |
| T1–T2: 1920×1080 a 60 fps en un MacBook | **Sustituidos** por T1–T4 de esta guía | El objetivo es el móvil |
| Lista de comprobación en cada entrega | **Solo en hitos** | Demasiado proceso para un proyecto entre amigos |
| Blender, pixel art y el resto de mockups | **Descartados** | Ya los descartaba el propio kit (D6) |

## 3. Formas y color

- **F1:** siluetas redondeadas y simplificadas que se lean en un móvil.
- **F2:** el detalle baja con la distancia. Textura (ladrillos, baldosas) solo cerca; al fondo, manchas casi planas.
- **F3:** 2–3 tonos por material pintados en el arte: base, sombra y luz. Ni sombras proyectadas ni brillos pintados: los pone el render.
- **F4:** bruma entre planos para separar la profundidad.
- **F5:** partículas de clima (llovizna) en varias capas de profundidad, iluminadas por las luces que cruzan.
- **F6:** un único grano sutil para todo el fotograma. Se apaga en calidad baja.
- **C1:** una paleta dominante por escena con contraste de temperatura. En la calle de Usera: azul noche y ladrillo apagado frente al sodio de las farolas, el ámbar del bar, el rojo del neón del chino y el blanco frío del bazar.
- **C2:** los acentos saturados se reservan para los personajes, los objetos interactivos y los focos de la escena.
- **C3:** la luz no cambia el tono de los acentos. Los personajes reciben la luz de la escena atenuada hacia su gris, para que la camiseta de Fran siga siendo verde azulada bajo el neón.

## 4. Luz

- **L1:** una luz principal clara por escena. En la calle, la luna desde arriba a la derecha.
- **L2:** las luces prácticas (farolas, ventanas, rótulos) dejan charcos de luz en el suelo, con brillo húmedo si está mojado.
- **L3:** los personajes reciben las luces de la escena, tienen contraluz del lado de la luz más fuerte y sombra de contacto. Nunca pueden parecer pegados.
- **L4:** la luz estática se precalcula una vez (fondo × mapa de luz). Solo se anima en vivo lo que cambia: neón, farolillos, coches que pasan.
- **L5 (contención):** el resplandor solo aparece en las fuentes de luz y nunca tapa la silueta de lo que ilumina. Si al quitar un efecto la escena no pierde legibilidad ni ambiente, ese efecto sobra.
- **L6:** los eventos de luz (un coche que pasa, el neón que parpadea) reiluminan la escena de forma breve.

## 5. Personajes

- **P1 · Vectoriales por piezas en SVG** (`art/personajes/`), con los nombres de capa y puntos de giro de la plantilla del kit, y animados con huesos. Se generan con `tools/personajes/` y una persona puede redibujarlos encima.
- **P1b · Construcción de la cabeza:** eje de la cara y líneas de cejas, ojos, nariz y boca; en tres cuartos el puente de la nariz va entre los dos ojos. Cada personaje se revisa lado a lado con su foto (solo en local) y a tamaño de móvil.
- **P2 · Línea fina de silueta** en un tono oscuro de su propio color. Sin contornos negros.
- **P3 · Cabeza grande:** la cabeza mide alrededor de un tercio del personaje para que la cara se lea a unos 50 px de alto en un móvil.
- **P4 · Vista de tres cuartos** con los dos ojos visibles, en lugar de perfil puro. Se refleja en espejo para mirar al otro lado.
- **P5 · Retrato grande en cada diálogo**, con boca sincronizada con el texto, parpadeo y expresión. Es donde de verdad se luce el parecido.
- **P6 · Física secundaria:** barba, pelo y ropa reaccionan al movimiento.
- **P6b · Vestuario:** cada personaje puede tener varios conjuntos (`OUTFITS` en su archivo de `src/arte/personajes/`) con las mismas articulaciones, así que todos se animan con el mismo rig. Fran tiene «calle» y «casa» (camiseta vieja con lamparón, calzoncillos de corazones y zapatillas de felpa).
- **P7 · Rasgos de cada amigo**, exagerados para que se reconozcan:

| Amigo | Rasgos |
|---|---|
| Fran | Barba oscura grande y poblada, pelo oscuro con alguna cana, cejas gruesas, camiseta verde azulada, pantaloneta (pantalón corto por debajo de la rodilla con un poco de espinilla y calcetín a la vista), complexión ancha |
| Pablo | Pelo castaño revuelto hacia arriba, barba corta, pendiente de aro, chaqueta oscura de borreguillo abierta, vaqueros y zapatillas blancas. Cara de siempre tranquila; al reír, sonrisa con dientes y ojos en ^^ |
| Chuchi | Calvo con brillo, gafas cuadradas de pasta marrón oscuro, barba pelirroja recortada, media sonrisa, sudadera granate sin capucha, vaquero negro y zapatillas blancas; delgado y alto |
| Guille | El más alto, atlético, pelo oscuro algo largo, cejas gruesas, solo sombra de barba, mandíbula marcada, camisa hawaiana cantosa (mostaza con hibiscos rojos y hojas verdes), espalda recta, vaqueros y zapatillas marrones |

**Expresiones de todos:** de siempre, contento, sorprendido, triste (interior de las cejas hacia arriba) y enfadado (interior de las cejas hacia abajo y párpado caído hacia la nariz), más cinco bocas para hablar y parpadeo.

## 6. Interfaz

- **I1:** paneles redondeados de cristal ahumado con filete dorado.
- **I2:** títulos y nombres en Graduate (eco del rótulo universitario del logo); texto en Alegreya Sans. Las dos son de Google Fonts con licencia libre (OFL).
- **I3:** texto siempre legible: sobre panel o con contorno oscuro, y nunca por debajo de 14 px CSS.
- **I4:** zonas táctiles de al menos 44 px CSS. Los objetos de la escena tienen además un margen extra de 26 unidades alrededor.
- **I5:** la interfaz respeta las zonas seguras (notch, barra de inicio) y deja libre el centro de la escena.

## 7. Requisitos técnicos

- **T1 · Resolución lógica:** 1080 de alto. El ancho depende del móvil, y las escenas se pintan a 2400 de ancho para que los móviles alargados (19,5:9, 20:9) vean más escenario en lugar de bandas negras.
- **T2 · Rendimiento:** 60 fps en los móviles del grupo mientras algo se mueve y 30 fps en reposo, sin que el móvil se caliente. El menú tiene «Ver rendimiento» para medirlo en cada móvil, y `node scripts/rendimiento.mjs` lo mide en el ordenador. **La calidad «auto» (la de serie) baja sola** (5 de octubre de 2026): si mientras algo se mueve el juego no pasa de 48 fps durante cuatro segundos, el decorado se dibuja un escalón más pequeño (alta → media → baja), y el móvil lo recuerda para la próxima vez. Volver a elegir «auto» en el menú empieza de nuevo.
- **T5 · Qué hace pesado un juego así** (medido el 3 de octubre de 2026, tras ver que un Pixel 9 Pro se calentaba). Casi todo el coste es de la GPU, no de JavaScript, y estas reglas lo mantienen a raya:
  1. **Los personajes llegan a la pantalla como imágenes.** Se dibujan en SVG, pero cada pieza del esqueleto (brazo, muslo, cabeza por expresión) se convierte en imagen al cargar (`src/motor/sprites.ts`). Como vectores, cada pieza llevaba recortes y sombreados translúcidos que la GPU repetía en cada fotograma. Era lo que más pesaba, y con los cuatro en la terraza el juego bajaba a pocos fotogramas por segundo.
  2. **En reposo, los personajes se animan a 15 poses por segundo** («a doses», como los dibujos animados). Al andar o hablar van a 60.
  3. **El decorado solo se repinta si se mueve la cámara.** La luz viva (fuego, carteles, el coche) va en su propia capa encima.
  4. **El bucle no pasa de 60 fps** aunque la pantalla sea de 120 Hz, y baja a 30 en reposo.
  5. **Sin desenfoque de fondo (`backdrop-filter`) en los paneles:** sobre una escena que cambia, se recalcula en cada fotograma.
  6. Para arte nuevo de personajes, mejor pocas capas translúcidas y pocos recortes por pieza; para escenas, piezas opacas grandes antes que muchas capas a pantalla completa.
  7. **Nunca se dibuja una imagen SVG en un canvas en cada fotograma:** el navegador vuelve a rasterizar el vector cada vez, y peor si gira. Se pasa a mapa de bits una vez (un canvas) y se dibuja ese. Era lo que hundía el minijuego de los cerdos.
  8. **Un minijuego a pantalla completa pausa la escena de debajo** (`g.pausado`), y su bucle tampoco pasa de 60 fps.
  9. **Cambiar una imagen nunca deja un fotograma vacío:** en Android, Chrome pinta una imagen recién puesta en blanco hasta que la decodifica. La nueva va encima de la anterior y la anterior se quita cuando la nueva ya se ha pintado (`sinHueco`, en `src/motor/sprites.ts`). Era el parpadeo de la cabeza de Guille.
  10. **Todos los personajes pasan a imagen,** Aceituna incluida (sus orejas, aparte, para que se muevan).
  11. **Memoria con tope** (5 de octubre de 2026, tras caídas en el Pixel 9 Pro al llegar la música). Solo hay dos escenas horneadas a la vez, la de pantalla y la anterior; por adelantado solo se hornean las escenas a las que se llega por una puerta (`vecinas` en el capítulo). La calle sola ocupa unos 64 MB de lienzos: tenerlas todas pasaba de 100 MB. De la música, como mucho tres pistas descomprimidas (un minuto son unos 25 MB). La prueba de rendimiento mide la memoria al final del recorrido y falla por encima de 100 MB de decorado o 90 MB de música.
  12. **Las capas de luz viva se borran con `clearRect`, no con `reset()`,** y lo que se dibuja en ellas va entre `save()` y `restore()`.
- **T6 · Rendimiento desde la implementación,** no como arreglo posterior (decidido el 3 de octubre de 2026). Cada cambio que toque el dibujo, la música o la memoria se mide con `node scripts/rendimiento.mjs` antes del commit, y cada escena o minijuego nuevo se añade a ese script. El script mide con el sonido encendido, como el juego (`SIN_MUSICA=1` para comparar), y falla si detecta los errores de la regla T5 (SVG dibujado en canvas cada fotograma, personajes aún en vector, más de 60 fps, memoria por encima del tope).
- **T3 · Solo recursos propios** o con licencia clara. Las fotos del grupo son solo referencia: no se publican ni se suben al repositorio.
- **T4 · WebGL2 con respaldo en Canvas 2D** (decidido el 2 de octubre de 2026): WebGL2 para la luz con relieve y la atmósfera; Canvas 2D para móviles que no lo tengan. La luz con relieve ya funciona (`src/motor/gl.ts`), pero está **aplazada**: el juego usa Canvas 2D y el relieve solo se enciende añadiendo `?relieve` a la dirección.

## 8. Acuarela para los recuerdos (aplazado)

La idea del kit que más vale la pena: un **mundo en gris que recupera el color** según se resuelven los puzles, para reconstruir lo que pasó anoche o revivir anécdotas míticas. Si se hace:

- se construye por capas, nunca como filtro sobre la escena normal;
- los personajes siguen nítidos y con su color;
- se precalcula como el resto del fondo, para que no cueste nada por fotograma.

## 9. Revisión

En cada hito se hacen capturas en un móvil en horizontal (844×390 a 3×, como un iPhone) y a 1920×1080, se comparan con las capturas del hito anterior y se juega una partida completa sin errores de consola (`node scripts/playthrough.mjs`).
