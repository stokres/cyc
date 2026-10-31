# Camiones y Caravanas · PANG

<!--
CÓMO EDITAR ESTE ARCHIVO
Todo lo que se lee en el Pang (el corto del capítulo 2 y el completo del menú de minijuegos) está aquí. Mismo formato que capitulo1.md:

  clave = texto                un texto suelto
  {n}                          el juego lo cambia por un número

Por ahora es solo el juego, sin historia ni conversaciones (decidido por Jesús el 12 de octubre de 2026).
Los textos en MAYÚSCULAS van dentro de la recreativa, en letra de píxeles: cortos.
-->

// ---------------------------------------------------------------- título y menú

titulo = CAMIONES Y CARAVANAS
titulo.pang = PANG
titulo.sub = La vuelta al mundo de la penúltima
titulo.empezar = Toca para empezar
menu.nueva = Partida nueva
menu.seguir = Seguir en la fase {n}
menu.fases = Elegir fase
menu.records = Récords
menu.ajustes = Ajustes
menu.musica = Música
menu.efectos = Efectos
menu.volver = Volver
menu.minijuegos = Volver a los minijuegos
menu.web = Volver a la web
menu.pausa = Pausa
menu.reanudar = Seguir jugando
menu.salir = Salir al menú
menu.seguro = ¿Seguro? Toca otra vez
menu.ayuda = ◀ ▶ para andar. Disparo para lanzar el arpón hacia arriba. Cuando la barra se llena, Especial. Las burbujas grandes se parten en dos pequeñas; la más pequeña revienta. Que no te toque ninguna.
fases.titulo = Elegir fase
fases.bloqueada = Llega hasta aquí para desbloquearla
cargando = Encendiendo la recreativa…
girar = Gira el móvil para jugar

// ---------------------------------------------------------------- elegir personaje

elegir.titulo = ¿Quién entra en la máquina?
elegir.cambiar = Cambiar de personaje
elegir.jugar = ¡A jugar!
elegir.paso = Paso
elegir.arma = Disparo
elegir.poder = Especial

pj.fran.paso = Lento pero seguro
pj.fran.arma = Arpón doble
pj.fran.arma.texto = Lanza dos arpones a la vez.
pj.fran.poder = ¡Una más!
pj.fran.poder.texto = Aquí no se va nadie: las burbujas se quedan quietas unos segundos.

pj.pablo.paso = Normal
pj.pablo.arma = Arpón de impro
pj.pablo.arma.texto = Se clava en el techo y se queda un rato. Nunca dice que no.
pj.pablo.poder = ¡Sí, y…!
pj.pablo.poder.texto = Todo se va de las manos: cada burbuja de la pantalla se parte a la vez.

pj.chuchi.paso = El más rápido
pj.chuchi.arma = Ráfaga
pj.chuchi.arma.texto = Disparos cortos y rápidos, como en su Space Invaders.
pj.chuchi.poder = Modo kinki
pj.chuchi.poder.texto = Unos segundos de ráfaga triple que atraviesa las burbujas.

pj.guille.paso = Normal
pj.guille.arma = Arpón ancho
pj.guille.arma.texto = El más alto del grupo lleva el arpón más gordo.
pj.guille.poder = Abrazo de oso
pj.guille.poder.texto = Un escudo de cariño que aguanta un golpe y, al romperse, revienta lo que tiene cerca.

// ---------------------------------------------------------------- dentro de la recreativa (letra de píxeles)

hud.fase = FASE {n}
hud.tiempo = TIEMPO
hud.puntos = PUNTOS
hud.especial = ESPECIAL
hud.listo = ¡LISTOS!
hud.ya = ¡YA!
hud.superada = ¡FASE SUPERADA!
hud.bonus = BONUS DE TIEMPO
hud.sinTiempo = ¡SE ACABÓ EL TIEMPO!
hud.tocado = ¡AY!
hud.jefe.robi = ROBI
hud.jefe.peor = EL PEOR
hud.jefe.penultima = LA PENÚLTIMA
hud.gorrito = ¡CON GORRITO NO!
hud.cierzo = CIERZO
hud.vida = ¡UNA CAÑA MÁS!
hud.poder.penultima = ¡UNA MÁS!
hud.poder.siy = ¡SÍ, Y…!
hud.poder.kinki = ¡MODO KINKI!
hud.poder.abrazo = ¡ABRAZO DE OSO!
hud.reloj = ¡QUIETAS!
hud.chupito = ¡CHUPITO!
hud.escudo = ESCUDO
hud.record = ¡RÉCORD!

boton.disparo = Disparo
boton.especial = Especial
boton.pausa = Pausa
tecla.disparo = Espacio
tecla.especial = E
pang.teclas = ← → o A D para andar · Espacio para disparar · E para el Especial

// ---------------------------------------------------------------- el Pang corto del capítulo 2

pang.instrucciones = ◀ ▶ para andar. Disparo lanza el arpón hacia arriba. Que no te toque ninguna burbuja.
pang.victoria = ¡VICTORIA!
pang.victoria.sub = LA PENÚLTIMA, VENCIDA

// ---------------------------------------------------------------- las fases

fase.1.nombre = USERA
fase.1.lugar = El dragón
fase.2.nombre = USERA
fase.2.lugar = La calle de Fran
fase.3.nombre = USERA
fase.3.lugar = El piso de Fran
fase.4.nombre = BOLILANDIA
fase.4.lugar = El parque de bolas
fase.5.nombre = LAVAPIÉS
fase.5.lugar = El teatro
fase.6.nombre = LA GRANJA
fase.6.lugar = La báscula
fase.7.nombre = MADRID RÍO
fase.7.lugar = El Manzanares
fase.8.nombre = ÁVILA
fase.8.lugar = La muralla
fase.9.nombre = ZARAGOZA
fase.9.lugar = El Pilar
fase.10.nombre = JIJONA
fase.10.lugar = El turrón blando
fase.11.nombre = NEVADA
fase.11.lugar = El desierto
fase.12.nombre = LAS VEGAS
fase.12.lugar = La Penúltima

// ---------------------------------------------------------------- continuar y fin de partida

continuar.titulo = ¿Continuar?
continuar.texto = Empiezas otra vez la fase {n} con tres vidas. Los puntos vuelven a cero.
continuar.si = Continuar
continuar.no = Al menú
fin.titulo = Fin de la partida
records.titulo = Récords
records.vacio = Todavía no hay partidas. Ya tardas.
records.fase = fase {n}
records.nuevo = ¡Récord!
records.cyc = CYC
records.todos = De todos
records.local = En este móvil
records.cargando = Cargando…
records.vaciotodos = Todavía no hay marcas de nadie. Sé el primero.
records.sincuenta = Ponte un nombre en la portada para salir aquí.
records.sinred = Sin conexión: no se pueden ver los récords de todos.
records.viejo = Sin conexión: esto es lo último que se vio.
final.titulo = FIN
final.gracias = Gracias por jugar
final.puntos = {n} puntos

// ---------------------------------------------------------------- varios jugadores

hud.fuera = FUERA
