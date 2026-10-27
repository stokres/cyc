# Camiones y Caravanas · «UNA MÁS» (el mundo de los conceptos como metroidvania, capítulo 2)

<!--
CÓMO EDITAR ESTE ARCHIVO
Todo lo que se lee en «Una más» está aquí. Mismo formato que capitulo1.md:

  ## clave                     empieza un bloque de diálogo (no cambies la clave)
  FRAN: texto                  lo dice Fran (también PABLO, CHUCHI, GUILLE)
  FRAN (contento): texto       con cara: normal, contento, sorprendido, nervioso, triste, enfadado, chulo
  > texto                      lo cuenta el narrador
  clave = texto                un texto suelto (nombres, carteles, avisos)
  {n}                          el juego lo cambia por un valor

Los textos de esta fase (el Recibidor y el Jardín del Cierzo) son provisionales hasta que llegue el guion real.
Las líneas de diálogo caben en dos renglones de la caja: mejor cortas.
-->

// ---------------------------------------------------------------- zonas

zona.recibidor = El Recibidor
zona.recibidor.sub = Donde cae Fran
zona.jardin = El Jardín del Cierzo
zona.jardin.sub = Flores, triángulos y relojes de las tantas

// ---------------------------------------------------------------- carteles del tutorial (PC y móvil)

cartel.andar.pc = Andar: ← → o A D
cartel.andar.tactil = Andar: botones de abajo a la izquierda
cartel.saltar.pc = Saltar: Espacio. Mantén para saltar más alto
cartel.saltar.tactil = Saltar: botón de la derecha. Mantén para saltar más alto
cartel.atacar.pc = Jarrazo: Z o J
cartel.atacar.tactil = Jarrazo: botón de atacar
cartel.pinchos = Los pinchos duelen. Salta por encima
cartel.barra.pc = Las barras de bar guardan la partida y rellenan la jarra
cartel.barra.tactil = Las barras de bar guardan la partida y rellenan la jarra
cartel.cierzo.pc = Cierzo: Espacio otra vez en el aire
cartel.cierzo.tactil = Cierzo: toca saltar otra vez en el aire

// ---------------------------------------------------------------- quién habla

nombre.fran = Fran
nombre.guille = Guille

// ---------------------------------------------------------------- controles (los rótulos de los botones y de la ayuda de PC)

mando.saltar = Saltar
mando.atacar = Jarrazo
mando.habilidad = Cierzo
mando.habilidad.teclazo = Teclazo
mando.habilidad.mutis = Mutis
mando.tecla.saltar = Espacio
mando.tecla.atacar = Z
mando.tecla.habilidad = X

// ---------------------------------------------------------------- avisos

aviso.guardado = Barra de bar: partida guardada
aviso.jarra = La jarra, rellena
aviso.sorbo = Un sorbo más en la jarra
aviso.jarraMas = ¡La jarra crece un sorbo!
aviso.pinchos = ¡Ay! Pinchos
muerte.texto = Una más…
jefe.gran = El Gran Despertador
jefe.gran.sub = A las tantas, ni se te ocurra

// ---------------------------------------------------------------- habilidades

habilidad.cierzo = CIERZO
habilidad.cierzo.texto = Un viento mañico: salta otra vez en el aire
habilidad.teclazo = TECLAZO
habilidad.teclazo.texto = Mantén atacar y suelta: rompe los bloques de NO
habilidad.mutis = MUTIS POR EL FORO
habilidad.mutis.texto = Un acelerón invulnerable que atraviesa telones
habilidad.nueva = Habilidad conseguida
habilidad.nueva.tocar = Toca para seguir

// ---------------------------------------------------------------- pausa y final de esta entrega

pausa.titulo = Pausa
pausa.continuar = Continuar
pausa.saltar = Saltar «Una más»
pausa.salir = Salir
fin.titulo = Y por ahora, hasta aquí
fin.texto = Fran tiene a Guille y el Cierzo. Faltan Chuchi y Pablo: la Bandeja de Entrada y el Teatro de los Conceptos llegan en la próxima entrega.
fin.boton = Terminar
cargando = Despertando en el mundo de los conceptos…

// ---------------------------------------------------------------- diálogos
// Nada de esto está escrito en el código: los bloques se piden por su clave.

## intro
> Fran abre los ojos. O lo que ahora le hace de ojos.
FRAN (sorprendido): ¿Dónde está el bar? Y lo que es peor: ¿dónde está mi caña?
FRAN (contento): Ah, aquí. Y llena, como siempre. Esto de que nunca se vacíe empieza a ser sospechoso.
FRAN: Los chicos tienen que estar por aquí. Pablo, Chuchi, Guille… ¡aupa!

## despertador
FRAN (enfadado): Un despertador con patas. Ya sabía yo que mañana no era de fiar.

## recibidor.salida
FRAN: Esa puerta huele a flores y a madrugón. Vamos, que «una más» y a casa.

## jardin.entra
FRAN (sorprendido): ¡Arrea! Flores, triángulos… y relojes derritiéndose. Esto es una resaca con jardinero.

## reloj
FRAN: Un reloj de las tantas. Pobre, también él quiere irse a la cama.

## jefe.antes
FRAN (nervioso): Eso no es un despertador. Es un despertador con oposiciones.

## jefe.despues
FRAN (contento): ¡Eso por sonar a deshoras!
> La jarra de Fran crece un sorbo.

## guille.antes
GUILLE (sorprendido): ¡Fran! ¡Aquí! Estoy dentro de una flor. Y no es de las que huelen bien.
FRAN: ¿Estás entero?
GUILLE: Soy una figura de bloques con camisa hawaiana. Estoy como siempre.
FRAN (contento): Pues no te muevas, que te saco.

## guille.despues
GUILLE (contento): ¡Libre! Tengo el curso oficial de guía de safari y aun así me ha comido una flor. Cuarenta horas, Fran.
FRAN: Lo importante es que estás vivo.
GUILLE (chulo): Toma, un regalo del jardín: el Cierzo. Un viento mañico que te da otro salto en el aire.
FRAN (contento): ¿Y tú qué haces?
GUILLE: Yo te sigo. Y no, no se lo contamos a Chuchi.

## guille.sigue
GUILLE: Ahí arriba hay una salida. Con el Cierzo llegas de sobra.
---
GUILLE: Cuando quieras, guía. Que yo ya llevo el chaleco.
