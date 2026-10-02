# Capítulo 1 · El jueves que casi no fue

<!--
CÓMO EDITAR ESTE ARCHIVO
Todo lo que se dice en el juego está aquí. Cámbialo a tu gusto y recarga.

  ## clave                     empieza un bloque de diálogo (no cambies la clave)
  FRAN: texto                  lo dice Fran (también PABLO, CHUCHI, GUILLE, ACEITUNA)
  FRAN (contento): texto       con cara: normal, contento, sorprendido, nervioso, triste, enfadado, chulo
  PABLO [20:12]: texto         mensaje del grupo de WhatsApp, con su hora
  > texto                      lo cuenta el narrador
  ---                          otra versión: cada vez que se repite, sale la siguiente
  clave = texto                un texto suelto (nombres, objetivos, pistas)
  {hora}                       el juego lo cambia por la hora del momento

Los textos de este capítulo son provisionales: están para probar el puzle.
-->

## intro
> Usera. Jueves, ocho y pico de la tarde.
> Fran se ha echado «una siestecita de diez minutos».

## despertar
FRAN (sorprendido): ¡Aupa! No estaba dormido, ¿eh? Estaba repasando el monólogo.
FRAN: Con los ojos cerrados. Como los profesionales.
FRAN: ¿Qué hora será? Me suena que tenía algo esta noche...

## ladrido
ACEITUNA: ¡Guau!

// ---------------------------------------------------------------- objetivos y pistas

objetivo.despierta = Toca la pantalla para despertar a Fran
objetivo.hora = Mira qué hora es
objetivo.salir = Sal de casa: a las 21:00 en el Bar del Río
objetivo.llaves = Recupera tus llaves
objetivo.vestirse = Vístete: en calzoncillos no se va al Río
objetivo.bar = Ve al Bar del Río
objetivo.fin = ¿Dónde se ha metido todo el mundo?

pista.hora = El reloj de la cocina está encima de la ventana. Mantén el dedo sobre él para mirarlo.
pista.movil = Tu móvil no para de vibrar encima de la mesa.
pista.puerta = Prueba a salir por la puerta del recibidor.
pista.llavero = Las llaves siempre van en el cuenco del recibidor. Siempre.
pista.aceituna = Aceituna está muy cómoda en su cama. Demasiado cómoda. Mírala bien.
pista.soborno = Aceituna no se mueve por nada... salvo por lo que le da nombre.
pista.huesos = En la mesa solo quedan huesos. Igual en la nevera hay más.
pista.tarro = Saca el tarro de la bolsa y tócate a ti mismo para intentar abrirlo.
pista.caliente = Los tarros que no abren se ablandan con agua caliente. Lo dice tu abuela.
pista.abrir = Ahora sí: intenta abrir el tarro otra vez.
pista.cogerllaves = Aceituna se ha levantado de su cama. ¿Qué había debajo?
pista.ropa = Tu ropa buena está tendida en la terraza.
pista.vestir = Abre la bolsa, elige la ropa y tócate a ti mismo para ponértela.
pista.abrirpuerta = Ya tienes las llaves: úsalas en la puerta.
pista.bar = El Bar del Río está al final de la calle, pasado el parque y el cruce.

// ---------------------------------------------------------------- ayudas de primera vez

ayuda.andar = Toca el suelo para andar.
ayuda.mirar = Mantén el dedo sobre algo para mirarlo.
ayuda.usar = Toca algo para usarlo o cogerlo.
ayuda.bolsa = Lo que coges va a la bolsa. Ábrela, elige un objeto y toca dónde usarlo.
ayuda.tuyo = Para usar un objeto contigo, elige el objeto y toca a Fran.
ayuda.ojo = Si te atascas, el ojo enseña todo lo que se puede tocar y la bombilla da pistas.

// ---------------------------------------------------------------- el piso: nombres

zona.reloj = Reloj
zona.ventana = Ventana
zona.grifo = Grifo
zona.nevera = Nevera
zona.movil = Móvil
zona.huesos = Cuenco
zona.tocadiscos = Tocadiscos
zona.chimenea = Chimenea
zona.cuadro = Cuadro
zona.cartel = Cartel
zona.sofa = Sofá
zona.terraza = Terraza
zona.bano = Baño
zona.perchero = Perchero
zona.llavero = Cuenco de las llaves
zona.puerta = Puerta de la calle
zona.telefonillo = Telefonillo
zona.aceituna = Aceituna
zona.llaves = Llaves
zona.fran = Fran

// ---------------------------------------------------------------- el piso: mirar y usar

## mirar.reloj
FRAN: Las {hora}. ¿Las {hora}?
FRAN (sorprendido): ¡Ene! ¡Que he quedado a las nueve en el Río con estos!
FRAN (nervioso): Diez minutos de siesta, dije. Diez. Soy un mentiroso profesional.
---
FRAN (nervioso): Las {hora}. El reloj no para. Qué manía tiene.

## mirar.ventana
FRAN: Usera anocheciendo. Desde aquí casi se ve el Río. Casi se huelen las bravas.

## usar.ventana
FRAN: Si salgo por la ventana llego antes, pero llego en camilla.

## mirar.grifo
FRAN: El grifo. Sale agua fría, agua caliente y, los martes, agua marrón.

## usar.grifo
FRAN: Un traguito de agua... No. Que luego no me cabe la caña.

## mirar.nevera
FRAN: Mi nevera. Con imanes de Aceituna, de Madrid y la lista de la compra de hace un mes.

## usar.nevera
FRAN: A ver qué hay... ¡Un tarro de aceitunas! Las de mi abuela de Tolosa.
FRAN (contento): Esto, para el Río, que siempre racanean con el aperitivo.

## usar.nevera.vacia
FRAN: Un yogur caducado y media cebolla. La nevera de un artista.

## mirar.movil
FRAN: Mi móvil, vibrando como loco. Eso son estos, seguro.

## coger.movil
FRAN: A ver qué dice el grupo...

## movil.chat
PABLO [20:02]: Señores, ¿sigue en pie lo del Río esta noche? Tengo escena nueva y necesito público.
GUILLE [20:05]: Yo voy seguro. Hoy he pesado cuarenta cerdos y tengo una sed que flipas.
CHUCHI [20:11]: Voy, pero tarde. Las niñas no se duermen ni con un monólogo de Fran.
PABLO [20:20]: ¿Fran? ¿Estás vivo?
GUILLE [20:31]: Este se ha dormido. Me juego una caña.

## movil.respuesta
FRAN [{hora}]: ¡Saliendo de casa! Pedidme una caña.

## movil.despues
FRAN: Técnicamente no he mentido. Estoy saliendo. Mentalmente.

## movil.otravez
FRAN: Mejor no lo miro, que me pongo más nervioso.

## mirar.huesos
FRAN: El cuenco de las aceitunas. Solo quedan huesos. ¿Quién se habrá comido...? Ah. Yo.

## usar.huesos
FRAN: Chupar un hueso de aceituna no cuenta como cena. Ni como soborno.

## mirar.tocadiscos
FRAN: Mi tocadiscos. Hoy no hay tiempo para vinilos. Hoy hay tiempo para cañas.

## usar.tocadiscos
FRAN: Ahora no, que como ponga un disco me vuelvo a dormir.

## mirar.chimenea
FRAN: La chimenea. En Usera. Que me digan a mí que no vivo como un marqués.

## usar.chimenea
FRAN: Las brasas aún aguantan. Como yo a las dos de la mañana.

## mirar.cuadro
FRAN: Un cuadro de la pareja. Dicen que es arte. Yo veo un rectángulo verde.

## mirar.cartel
FRAN (contento): «Más Patxi que nunca». Mi show. Si no lo has visto, no sé a qué esperas.

## usar.cartel
FRAN: No lo toco, que está firmado por mí. Vale una pasta.

## mirar.sofa
FRAN: El sofá. Mi enemigo. Me atrapa todos los jueves a la misma hora.

## usar.sofa
FRAN: Si me siento, no me levanto hasta el sábado.

## mirar.terraza
FRAN: La terraza, con el tendedero. Ahí está mi ropa buena, secándose.

## mirar.terraza.vacia
FRAN: La terraza. El tendedero ya no tiene nada que me interese.

## usar.terraza
> Fran sale a la terraza en calzoncillos.
FRAN (nervioso): ¡Qué rasca! Que no me vea la del quinto, que luego lo cuenta en la frutería.
FRAN: Mi camiseta y mi pantaloneta. Secas. Bueno, secas de Madrid.

## usar.terraza.vacia
FRAN: Ya no queda nada mío en el tendedero. Lo demás es de la pareja.

## mirar.bano
FRAN: El baño. Paso, que si entro me pongo a leer el champú.

## usar.bano
FRAN: Ahora no. Ya iré al del Río, que tiene más ambiente.

## mirar.perchero
FRAN: Mi chubasquero, una gorra y la correa de Aceituna.

## usar.perchero
FRAN: Hoy no llueve. Y Aceituna ya ha salido esta tarde. Dos veces.

## mirar.llavero
FRAN: El cuenco de las llaves. Vacío. ¿Vacío?

## usar.llavero
FRAN (sorprendido): ¡Mis llaves no están! Siempre las dejo aquí. Siempre. Bueno, casi siempre.

## mirar.puerta
FRAN: La puerta de la calle. Al otro lado: cañas, bravas y estos tres.

## usar.puerta
> Fran gira el pomo. Nada.
FRAN (sorprendido): ¡Está cerrada con llave! La pareja se ha ido de finde y han echado la llave por fuera.
FRAN (enfadado): ¡Que vivo aquí! ¡Que pago la mitad del wifi!

## usar.puerta.sinllaves
FRAN (nervioso): Sigue cerrada. Sin llaves no salgo de aquí ni a tiros.

## usar.puerta.calzoncillos
FRAN: ¿Así? ¿En calzoncillos de corazones?
FRAN: Hombre, en Usera se ha visto de todo, pero tengo una reputación.

## usar.puerta.abrir
> Clac, clac. La puerta se abre.
FRAN (contento): ¡Libertad! Aceituna, cariño, pórtate bien, que papá vuelve pronto.
FRAN: Bueno, pronto pronto, no.

## mirar.telefonillo
FRAN: El telefonillo. Solo llama el del butano y el de Glovo equivocándose de piso.

## usar.telefonillo
FRAN: ¿Hola? ¿Hay alguien? ¡Que me han encerrado!
> El telefonillo solo devuelve un zumbido.
FRAN: Ni el del butano me quiere.

// ---------------------------------------------------------------- Fran se mira

## mirar.fran.casa
FRAN: Camiseta del festival de 2014, calzoncillos de corazones y zapatillas de felpa. Irresistible.

## mirar.fran.calle
FRAN (contento): Camiseta verde y la pantaloneta. Que se rían, que la pantaloneta es un estilo de vida.

## despertar.ya
FRAN: ¡Ya voy, ya voy! Que no estaba dormido.

// ---------------------------------------------------------------- Aceituna

## mirar.aceituna
FRAN: Mi novia. Bueno, la perrita de la pareja, pero mi novia.
FRAN (sorprendido): Un momento... ¿Qué es eso que brilla debajo de ella? ¡Son mis llaves!

## mirar.aceituna.otravez
FRAN: Tumbada encima de mis llaves, haciéndose la dormida. Qué arte tiene.

## usar.aceituna
FRAN: Aceituna, cariño, mi vida, dame las llaves que llego tarde.
ACEITUNA: Grrr...
FRAN: Ni se mueve. Me quiere tanto que no quiere que me vaya.
---
FRAN: Aceituna, amor, mira qué cara de bueno pongo.
ACEITUNA: Grrrrrr...
FRAN: Nada. Esta solo se mueve por una cosa. Y no soy yo.

## mirar.aceituna.despierta
FRAN (contento): Mírala qué contenta. Se llama Aceituna por algo.

## usar.aceituna.despierta
FRAN (contento): ¿Quién es la perrita más guapa de Usera? ¡Tú!
ACEITUNA: ¡Guau!

## tarro.aceituna
FRAN: No, cariño, el tarro entero no. Que tú tampoco sabes abrirlo.

// ---------------------------------------------------------------- el tarro

objeto.movil = Móvil
objeto.movil.texto = Mi móvil. Tengo el grupo echando humo.
objeto.tarro = Tarro de aceitunas
objeto.tarro.texto = Aceitunas de la abuela. El tarro lo cerró ella, que tiene manos de remontista.
objeto.tarroCaliente = Tarro calentito
objeto.tarroCaliente.texto = Tarro de aceitunas, recién pasado por agua caliente.
objeto.llaves = Llaves
objeto.llaves.texto = Mis llaves. Con el llavero del Athletic que me regaló mi tío.
objeto.ropa = Ropa buena
objeto.ropa.texto = Mi camiseta y mi pantaloneta. La de los jueves.

tarro.instrucciones = Gira el dedo alrededor de la tapa para abrir el tarro

## tarro.duro
FRAN (enfadado): ¡Ene! ¡Que no se abre! Esto lo ha cerrado mi abuela con una llave inglesa.
---
FRAN (enfadado): Nada. Ni con la fuerza navarra de mi familia.
---
FRAN (nervioso): Este tarro me odia. Necesita ablandarse. Como yo los lunes.

## tarro.calentar
> Fran pone el tarro bajo el grifo de agua caliente.
FRAN: Como dice mi abuela: tarro que no abre, agua caliente y paciencia.
FRAN: Bueno, ella dice «paciencia». Yo digo «caña».

## grifo.calentado
FRAN: Ya está calentito. Más caliente y hago aceitunas al vapor.

## tarro.abierto
> ¡PLOC!
FRAN (sorprendido): ¡Arrea!
> Las aceitunas salen volando por toda la cocina.

## aceituna.come
ACEITUNA: ¡Guau!
FRAN: ¡Eso, Aceituna, a por ellas! Ya sabía yo que eras fácil de comprar.
FRAN (contento): ¡Y la cama libre! ¡Mis llaves!

## coger.llaves
FRAN (contento): ¡Mis llaves! Con sus babas y todo. Gracias, cariño.

## coger.ropa
FRAN: Ahora a ponérmela, que no es plan de ir en calzoncillos.

## vestirse
> Fran se cambia en un tiempo récord.
FRAN (contento): Camiseta. Pantaloneta. Ya pueden decir lo que quieran de mi pantaloneta.
FRAN: Hoy voy guapo. Hoy ligamos. Bueno, ligan ellos y yo me como las bravas.

## vestido.ya
FRAN: Ya voy vestido. Más guapo no puedo ir.

// ---------------------------------------------------------------- nervios

## nervios.1
FRAN (nervioso): Las {hora}. Que llego tarde, que llego tarde...

## nervios.2
FRAN (nervioso): Las {hora}. Guille ya estará por la segunda caña. Y yo aquí, en calzoncillos.

// ---------------------------------------------------------------- respuestas genéricas

## nofunciona
FRAN: No creo que eso funcione ahí.
---
FRAN: Eso no tiene ningún sentido. Ni siquiera para mí.
---
FRAN: Ni de broma. Y mira que yo de bromas sé.

## nadacontigo
FRAN: No sé qué quieres que haga yo con eso.

## tarde
FRAN (nervioso): ¡No hay tiempo para eso! ¡Que he quedado!

// ---------------------------------------------------------------- la calle

zona.ventanaBajo = Ventana
zona.portal = Portal de Fran
zona.merceria = Mercería
zona.fruteria = Frutería
zona.panaderia = Bollería china
zona.contenedores = Contenedores
zona.parque = Parque
zona.dragon = Dragón
zona.farmacia = Farmacia
zona.senal = Paso de cebra
zona.calleLateral = Calle
zona.puertaAzul = Portal azul
zona.bar = Bar del Río
zona.puerta40 = Portal 40
zona.peluqueria = Peluquería

## salir.calle
FRAN (contento): ¡Aire! Bueno, aire de Usera, que es aire con olor a churros.
FRAN: Al Río, que está al final de la calle.

## mirar.ventanaBajo
FRAN: Los del bajo. Siempre tienen la tele puesta. Hoy, «Saber y ganar».

## mirar.portal
FRAN: Mi portal. El número 12. Me lo sé porque el del Glovo nunca se lo sabe.

## usar.portal
FRAN: ¿Volver a casa? ¡Si acabo de salir! Aceituna me ha visto la cara de fiesta.

## mirar.merceria
FRAN: La mercería Loli. Cerrada desde que yo vivo aquí. Y los grafitis, cada vez mejores.

## mirar.fruteria
FRAN: Frutería y lo que haga falta. A las nueve de la noche te venden una sandía y una pila.

## usar.fruteria
FRAN: Una fruta... No, que luego no me cabe la caña.

## mirar.panaderia
FRAN (contento): Los bollos al vapor de aquí son un vicio. Ahora no, Fran. Ahora no.

## usar.panaderia
FRAN: Me como uno... ¡No! Que llego tarde. Bueno, a la vuelta.

## mirar.contenedores
FRAN: Amarillo, azul y gris. El reciclaje es como el humor: hay que saber dónde va cada cosa.

## mirar.parque
FRAN: El parque. De día, lleno de críos. De noche, lleno de gatos y de gente haciendo botellón.

## mirar.dragon
FRAN (contento): ¡El dragón de Usera! Tiene los ojos como yo un viernes por la mañana.

## usar.dragon
FRAN: Me tiro por el tobogán... No. Que la última vez me quedé encajado.

## mirar.farmacia
FRAN: La farmacia de guardia. Me sé el camino de memoria. Los viernes por la mañana, sobre todo.

## mirar.senal
FRAN: Paso de cebra. Aquí los coches paran. A veces.

## mirar.calleLateral
FRAN: Por ahí se va al Kebab y al locutorio. Hoy no. Hoy, recto al Río.

## mirar.puertaAzul
FRAN: Ese portal azul siempre tiene un gato en la ventana. Hoy no está. Habrá ido al Río.

## mirar.puerta40
FRAN: El 40. Como yo dentro de nada. «Los 40: con lo que yo he sido». Otro show mío.

## mirar.peluqueria
FRAN: La peluquería Rosi. Rosi me corta la barba. Bueno, me la negocia.

## mirar.bar
FRAN (contento): El Bar del Río. Nuestro bar. Las mejores bravas al sur del Manzanares.

## llegada.bar
FRAN (contento): ¡Ya estoy! ¡Perdón, perdón, que me he...!
FRAN (sorprendido): ¿Y estos? ¿No hay nadie?
FRAN: Las {hora}, tardísimo... ¡y he llegado el primero!
FRAN (nervioso): Pues nada. Habrá que hacer que vengan. Uno por uno.

fin.titulo = Fin del piloto
fin.texto = Fran ha llegado al Río... y no hay nadie. En la fase 2 tendrás que conseguir que vayan llegando Pablo, Chuchi y Guille.

// ---------------------------------------------------------------- modo prueba (selector)

prueba.aviso = Modo prueba: la crew está en la terraza del Río. Cambia de personaje desde la columna de la izquierda.

## charla.fran
FRAN (contento): ¡Venga, que esta la pago yo! Bueno, la siguiente. La siguiente seguro.
---
FRAN: ¿Otra caña? Venga, la última. La penúltima. Una más y nos vamos.

## charla.pablo
PABLO (contento): He escrito una escena en la que un camarero se enamora de un grifo de cerveza. ¿Os la leo?
---
PABLO: ¿Habéis visto a la camarera nueva? No, yo tampoco. Tengo novia. Solo comento la iluminación.

## charla.chuchi
CHUCHI (chulo): He dejado a las niñas dormidas, el portátil cerrado y el móvil en silencio. Hoy no existo.
---
CHUCHI (chulo): Una más y me pongo kinki. Avisados quedáis.

## charla.guille
GUILLE (contento): ¡Qué ganas tenía! Hoy he pesado cuarenta cerdos. Uno me ha mirado mal.
---
GUILLE: Me he duchado dos veces, ¿eh? Por si alguien lo dice.
