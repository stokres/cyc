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
cartel.cierzo.pc = Cierzo: pulsa Espacio otra vez en el aire
cartel.cierzo.tactil = Cierzo: pulsa Saltar otra vez en el aire
cartel.alto.pc = Esa repisa queda muy alta. Ya volverás
cartel.alto.tactil = Esa repisa queda muy alta. Ya volverás
cartel.chuchi.pc = Con el jarrazo normal (Z o J), los NO se rompen
cartel.chuchi.tactil = Con el jarrazo normal, los NO se rompen
cartel.pablo.pc = Contra una pared, Espacio te impulsa
cartel.pablo.tactil = Contra una pared, Saltar te impulsa

// ---------------------------------------------------------------- quién habla

nombre.fran = Fran
nombre.guille = Guille
nombre.chuchi = Chuchi
nombre.pablo = Pablo

// ---------------------------------------------------------------- controles (los rótulos de los botones y de la ayuda de PC)

mando.saltar = Saltar
mando.atacar = Jarrazo
mando.tecla.saltar = Espacio
mando.tecla.atacar = Z

// ---------------------------------------------------------------- avisos

aviso.guardado = Barra de bar: partida guardada
aviso.jarra = La jarra, rellena
aviso.sorbo = Un sorbo más en la jarra
aviso.jarraMas = ¡La jarra crece un sorbo!
aviso.pinchos = ¡Ay! Pinchos
aviso.secreto = ¡Un muro falso! Había un hueco detrás
muerte.texto = Una más…
jefe.gran = El Gran Despertador
jefe.gran.sub = A las tantas, ni se te ocurra

// ---------------------------------------------------------------- habilidades

habilidad.cierzo = CIERZO
habilidad.cierzo.texto = Un viento mañico, siempre activo: pulsa saltar otra vez en el aire y te da un segundo salto
habilidad.teclazo = TECLAZO
habilidad.teclazo.texto = Siempre activo: tu jarrazo normal rompe los bloques de NO
habilidad.pared = SALTO DE PARED
habilidad.pared.texto = Siempre activo: desliza por las paredes y salta contra ellas para impulsarte
habilidad.nueva = Habilidad conseguida
habilidad.nueva.tocar = Toca para seguir

// ---------------------------------------------------------------- pausa y final de esta entrega

pausa.titulo = Pausa
pausa.continuar = Continuar
pausa.saltar = Saltar «Una más»
pausa.salir = Salir
mapa.titulo = Mapa
mapa.aqui = Estás aquí
mapa.volver = Volver
mapa.leyenda.barra = Bar
mapa.leyenda.sorbo = Sorbo
mapa.leyenda.amigo = Amigo
mapa.leyenda.jefe = Jefe
fin.titulo = Y por ahora, hasta aquí
fin.texto = Fran tiene a Guille en la jarra y el Cierzo. Faltan Chuchi y Pablo: la Bandeja de Entrada y el Teatro de los Conceptos llegan en la próxima entrega.
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
GUILLE (chulo): Toma, un regalo del jardín: el Cierzo. Pulsa saltar otra vez en el aire y te da otro salto.
FRAN (contento): ¿Y tú, por dónde vas?
GUILLE: Yo me meto en tu jarra, que ahí me conozco el terreno. Y no, no se lo contamos a Chuchi.
> Guille se encoge y se zambulle en la cerveza de Fran.

// ---------------------------------------------------------------- los amigos en la jarra
// Cuando Fran lleva un rato quieto, asoman, sueltan una gracieta propia y se esconden (cada uso suelta la siguiente). Con dos o tres dentro, a veces se pelean.
// Voces según docs/PERSONAJES.md: Guille (mañico, safari, animales, purín, su novia, Impropios), Chuchi (padre de dos hijas, informático, siempre tarde,
// gafas), Pablo (galán con novia, dramaturgo, turrón blando, cajón, juegos de mesa, impro).

## comenta.guille
GUILLE: Desde aquí arriba se ve todo. Y huele a malta.
---
GUILLE: Esto es un ecosistema, Fran. Con espuma.
---
GUILLE: Cuarenta horas de curso y nadie me pregunta por los relojes.
---
GUILLE: Si ves un elefante, es una jirafa con el cuello cerca.
---
GUILLE: Huele un poco a purín, pero a purín bueno.
---
GUILLE: Mi novia no se cree que esté dentro de una jarra. Con razón.
---
GUILLE: Chacho, qué sitio para ver un safari.
---
GUILLE: Desde que dejé Impropios no me caía nadie en la cabeza. Hasta hoy.
---
GUILLE: Una gallina pesa menos que este jarrazo, te lo digo yo.
---
GUILLE: Aquí abajo hay marea, como en el Ebro.
---
GUILLE: Cuidado con la fauna: ese reloj tiene cara de mamífero.

## comenta.chuchi
CHUCHI: Llego tarde, pero llego. Dentro de una jarra, pero llego.
---
CHUCHI: Tengo dos hijas y ninguna hace tanto ruido como tú saltando.
---
CHUCHI: Esto se arregla reiniciando. ¿Dónde está el botón?
---
CHUCHI: Yo también estoy hasta arriba de correos. Pero aquí son de verdad.
---
CHUCHI: Mis gafas ya no se empañan. Se emborrachan.
---
CHUCHI: Un día libre. Y me lo paso dentro de una jarra. Increíble.
---
CHUCHI: Esto no tiene copia de seguridad, ¿verdad? No me gusta.
---
CHUCHI: Dame otra caña y te arreglo el router del mundo entero.
---
CHUCHI: Si mis hijas me ven así, me quitan la paga.
---
CHUCHI: Estaba en una reunión. Ahora estoy en una jarra. Prefiero la jarra.
---
CHUCHI: Ya sé por qué siempre llego tarde: nunca me avisáis de que hay espuma.

## comenta.pablo
PABLO: Esto da para una obra en tres actos. Y ya tengo el título.
---
PABLO: Mi novia diría que estoy flirteando con la espuma. Y sí.
---
PABLO: Si tuviera un cajón, ahora mismo os hacía un solo.
---
PABLO: En mi pueblo el turrón es blando y aquí todo es blando. Me siento en casa.
---
PABLO: Esto es impro pura. Y yo soy el galán, claro.
---
PABLO: ¿Hay un personaje que sea una jarra? Se lo apunto a la compañía.
---
PABLO: Nunca he actuado dentro de una jarra. Todo es empezar.
---
PABLO: Hagamos un juego de mesa: gana el que no se moje.
---
PABLO: Soy dramaturgo. Mi vida es un monólogo, pero tú sales.
---
PABLO: Sonrío porque la cerveza está buena, no por otra cosa.
---
PABLO: Fran, tu jarra tiene unas vistas de teatro.

## pelea.guille.chuchi
CHUCHI: Quita, que me mojas las gafas.
GUILLE: Pues no te pegues a mi chaleco, que es de safari.
CHUCHI: Es un chaleco con bolsillos de espuma.
GUILLE: Cuarenta horas, Chuchi. Cuarenta.
---
GUILLE: Chuchi, mueve el codo, que me sales por la oreja.
CHUCHI: No hay sitio. Esto tiene capacidad para una caña y media.
GUILLE: Pues sobras tú.
CHUCHI: Voy a abrir un ticket de queja.
---
CHUCHI: ¿Quién se ha comido mi espuma?
GUILLE: Yo la estaba analizando. Para la ciencia.
CHUCHI: Pues análisis pagado: me debes media.
---
GUILLE: Te has sentado encima de mi diploma.
CHUCHI: Pues dóblalo, que esto no es una oficina.
GUILLE: Eres un informático sin respeto a las ovejas.
CHUCHI: Tú, un guía sin nada que guiar.

## pelea.guille.pablo
PABLO: Guille, que me despeinas.
GUILLE: Si eso es un pelo de granja.
PABLO: Es un peinado de galán.
GUILLE: Es el gallo más guapo del corral.
---
GUILLE: Pablo, ¿puedes dejar de ensayar monólogos? Retumba todo.
PABLO: Es teatro de cámara. Cámara de cerveza.
GUILLE: Pues que cierren la cámara.
---
PABLO: Me toca asomarme a mí, tú ya has salido.
GUILLE: Yo llegué primero, que soy el del curso.
PABLO: Y yo el del público. Se acabó la discusión.
---
GUILLE: Aparta el pie, que pisas una vaca invisible.
PABLO: En el teatro todo es invisible hasta que aplauden.
GUILLE: Pues aplaude y apártate.

## pelea.chuchi.pablo
CHUCHI: Pablo, aparta, que estoy en medio de un chiste.
PABLO: Tus chistes tienen más cola que un viernes.
CHUCHI: Y tú más teatro que un jueves.
PABLO: Los jueves son sagrados, Chuchi.
---
PABLO: ¿Me prestas las gafas? Necesito mirar con intención.
CHUCHI: No. Son para leer correos.
PABLO: Léeme uno con pasión.
CHUCHI: «Re: Re: Re: Urgente».
PABLO: Qué final. Debería haberlo escrito yo.
---
CHUCHI: Que no empujes.
PABLO: No empujo, improviso.
CHUCHI: Pues improvisa hacia allá.
PABLO: Eso es un sí, y… ¡me voy a caer!
---
PABLO: Chuchi, tienes espuma en las gafas.
CHUCHI: No la veo. Tengo espuma en las gafas.
PABLO: Es la mejor crítica que me han hecho.

## pelea.guille.chuchi.pablo
GUILLE: Que no cabemos.
CHUCHI: Pues sal tú, que eres el guía.
PABLO: Yo me quedo en el centro, que soy el protagonista.
GUILLE: ¡El protagonista es Fran!
FRAN: Callaos los tres, que estoy concentrado.
---
PABLO: Esto es un trío: la jarra, la espuma y yo.
CHUCHI: Y yo, que sujeto el router.
GUILLE: Y yo, que os sujeto a los dos.
FRAN: Como me salpiquéis, os vais andando.
---
CHUCHI: Yo pido ventana.
GUILLE: Aquí no hay ventanas, hay asa.
PABLO: Pues yo pido el asa, que es de galán.
FRAN: A la próxima, cada uno en su caña.
