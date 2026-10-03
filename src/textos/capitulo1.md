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

// ---------------------------------------------------------------- las cuatro historias

situacion.fran = Se ha quedado dormido en el sofá.
situacion.pablo = En el teatro, sin papel y discutiendo con su sombra.
situacion.chuchi = Con las niñas en casa. Bueno, más o menos.
situacion.guille = En la granja, con ocho cerdos por pesar.

camino.fran = Fran ya va de camino al Río
camino.pablo = Pablo ya va de camino al Río
camino.chuchi = Chuchi ya va de camino al Río
camino.guille = Guille ya va de camino al Río
camino.faltan = Faltan {quien}.
camino.falta = Falta {quien}.
camino.todos = ¡Ya van los cuatro!

ayuda.cambiar = Puedes cambiar de personaje cuando quieras desde la columna de la izquierda.

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
objetivo.fin = ¡Los cuatro en el Río!

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
ayuda.combinar = Para juntar dos cosas, elige una en la bolsa, vuelve a abrirla y toca la otra.
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

## nocombina
FRAN: Eso con eso no pega ni con cola.

## nocombina.guille
GUILLE: Eso con eso no hace nada. Bueno, sí: un lío.

## nocombina.pablo
PABLO: Esas dos cosas no tienen química. Ni en escena ni fuera.
> Como Pablo y la puntualidad.

## nocombina.chuchi
CHUCHI: Eso no compila.

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

## llegada.fran
FRAN (contento): ¡Ahí está el Río! Con su terraza y sus sillas de plástico.
FRAN (nervioso): Las {hora}. Estos ya estarán por la segunda caña. Pongo cara de «el tráfico».

// ---------------------------------------------------------------- Guille: la granja

zona.corral = Corral
zona.bascula = Báscula
zona.puertaNave = Nave
zona.radio = Radio
zona.botiquin = Botiquín
zona.manguera = Grifo y manguera
zona.romero = Romero
zona.coche = Coche de Guille
zona.madrid = Madrid

objetivo.guille = Pesa los ocho cerdos que quedan
objetivo.guille.pilas = Busca pilas para la báscula
objetivo.guille.pesar = Pesa los ocho cerdos de una vez
objetivo.guille.olor = Quítate el olor a cerdo
objetivo.guille.salir = Coge el coche y vete al Río

pista.guille.bascula = Lo primero es la báscula. Tócala.
pista.guille.radio = Algo en la granja funciona con pilas y está sonando ahora mismo.
pista.guille.pilas = Usa las pilas en la báscula: ábrelas en la bolsa y toca la báscula.
pista.guille.pesar = Toca la báscula y apila los cerdos. Suéltalos cuando estén encima del de abajo.
pista.guille.botiquin = El alcohol del botiquín huele a limpio. Más o menos.
pista.guille.romero = Junto al grifo hay una mata de romero que huele de maravilla.
pista.guille.combinar = Junta el alcohol y el romero en la bolsa: elige uno, vuelve a abrirla y toca el otro.
pista.guille.agua = Le falta agua: usa el alcohol de romero en el grifo.
pista.guille.ponerse = Ya tienes colonia. Elígela en la bolsa y tócate a ti mismo.
pista.guille.salir = El coche está aparcado a la derecha. Al Río.

objeto.pilas = Pilas
objeto.pilas.texto = Dos pilas gordas de la radio. Huelen a jota.
objeto.alcohol = Alcohol
objeto.alcohol.texto = Alcohol del botiquín. Para heridas, para limpiar y para emergencias de olor.
objeto.romero = Romero
objeto.romero.texto = Unas ramicas de romero. Huelen a monte y a abuela.
objeto.alcoholRomero = Alcohol de romero
objeto.alcoholRomero.texto = Alcohol con romero. Huele bien, pero pica. Le falta rebajarlo con agua.
objeto.colonia = Colonia de granja
objeto.colonia.texto = Colonia casera: alcohol, romero y agua de la manguera. Eau de Guille.

## intro.guille
> Una granja a las afueras de Madrid. Jueves, ocho y diez.
GUILLE (contento): ¡Hala! Treinta y dos cerdos pesados. Solo me quedan ocho.
GUILLE (sorprendido): ¿Las ocho y diez ya? ¡Que a las nueve estoy en el Río con estos!
GUILLE: Pues nada: los peso todos a la vez y listo. Ocho cerdos encima de la báscula. ¿Qué puede salir mal?

## g.mirar.corral
GUILLE (contento): Mis cerdicos. Los ocho que me quedan, bailando la jota de la radio.
---
GUILLE: El de la esquina es el peor de todos. Ciento cincuenta kilos de mala leche.

## g.mirar.corral.nerviosos
GUILLE (nervioso): Sin música se me han puesto nerviosos. Les va la jota, qué le vamos a hacer.

## g.mirar.corral.pesados
GUILLE (contento): Pesados y apuntados. Ya podéis dormir tranquilos, majos.

## g.usar.corral
GUILLE: Venga, cerdicos, a la báscula. Bueno, en cuanto la báscula quiera.

## g.mirar.bascula
GUILLE: La báscula del ganado. Con la pantalla apagada, que es como más bonita está.

## g.mirar.bascula.lista
GUILLE (contento): Encendida y a cero. Que vengan los cerdos.

## g.bascula.apagada
> Guille aprieta el botón. Nada.
GUILLE (enfadado): ¡No tiene pilas! ¡Otra vez! ¿Quién se lleva las pilas de una báscula?
GUILLE: Pues yo, la semana pasada. Para la radio.

## g.bascula.pilas
> Guille pone las pilas. La pantalla se enciende: 0000.
GUILLE (contento): ¡Ahí está! Ya puedo pesar.

## g.bascula.antes
GUILLE: Venga: los ocho a la vez, uno encima de otro. Con cariño, que son delicados.
GUILLE (nervioso): El peor, el último. Que si va abajo, aplasta a los demás de la pura mala leche.

## g.bascula.hecho
GUILLE: Ya están pesados. Si los peso otra vez, me dan las doce.

## g.cerdos.cancelado
GUILLE: Un momento, que respiro. Y ellos también.

## g.cerdos.hecho
GUILLE (contento): ¡Ocho cerdos de una vez! ¡Récord mundial de Guille!
GUILLE: Apuntado todo. Y el peor, encima de todos, mirándome por encima del hombro.

## g.cerdos.saltado
> Guille los acaba pesando uno a uno. Tarda, pero lo hace.
GUILLE: Bueno. A la antigua. Tampoco me ha ido tan mal.

## g.olor
GUILLE (sorprendido): Uy. Uy, uy, uy.
GUILLE (nervioso): Huelo a cerdo. Pero a cerdo de verdad, a cerdo de concurso.
GUILLE: Así no me dejan entrar ni en el Río, y eso que en el Río entra todo el mundo.

## g.mirar.radio
GUILLE (contento): La radio de la nave, con su jota. A los cerdos les encanta, y a mí más.

## g.mirar.radio.apagada
GUILLE: La radio, sin pilas y sin jota. Qué triste está.

## g.radio.pilas
> Guille abre la tapa de la radio. La jota se corta en lo mejor.
GUILLE: Perdona, maja. Es por una buena causa.

## g.radio.silencio
GUILLE (nervioso): Uy, los cerdos se han quedado mirándome. Sin música se ponen nerviosos.
GUILLE: Tranquilos, que os canto yo luego. «Si vas a Calatayud...»

## g.radio.sinpilas
GUILLE: Ya no tiene pilas. Ni jota. Ni alegría.

## mirar.puertaNave
GUILLE: La nave. Paja, sacos de pienso y una lavadora que no funciona desde 2019.

## usar.puertaNave
GUILLE: Dentro solo hay paja y pienso. Y una ducha que es un cubo con agujeros. Paso.

## mirar.botiquin
GUILLE: El botiquín. Tiritas, gasas y un bote de alcohol más grande que mi brazo.

## g.botiquin
GUILLE: El bote de alcohol. Nunca se sabe. Con cuarenta cerdos, menos todavía.

## g.botiquin.vacio
GUILLE: Ya tengo el alcohol. Lo demás son tiritas de dinosaurios.

## mirar.romero
GUILLE: Una mata de romero. Huele a monte. Y a guiso de mi abuela.

## g.romero
GUILLE (contento): Unas ramicas de romero. Esto huele a gloria.

## g.romero.ya
GUILLE: Ya tengo romero. Si cojo más, me quedo sin mata.

## mirar.manguera
GUILLE: El grifo y la manguera. El agua sale helada. Helada de pingüino.

## g.manguera.antes
GUILLE: Agua para los cerdicos. Ahora no, que están en la jota.

## g.manguera
GUILLE (nervioso): ¿Ducharme con la manguera? A estas horas y con este fresco, ni loco.
GUILLE: Necesito algo que huela fuerte. Y bien. Algo con... ¿colonia? No tengo colonia. Me la invento.

## g.manguera.limpio
GUILLE: Ya huelo a romero. No me mojo más, que encojo.

## g.manguera.falta
GUILLE: Solo con eso no basta. Primero tengo que mezclar algo con algo.

## g.combinar
> Guille mete las ramicas de romero en el bote de alcohol y lo agita.
GUILLE (contento): ¡Alcohol de romero! Ahora le falta agua, que esto así quema.

## g.colonia.hecha
> Un chorrito de la manguera, otra agitada...
GUILLE (contento): ¡Colonia de granja! Eau de Guille. La patento mañana.

## g.colonia.antes
GUILLE: ¿Colonia ahora? Si todavía no he tocado un cerdo. Me la guardo, que luego la voy a necesitar.

## g.colonia.falta
GUILLE: Así, sin rebajar, me deja la piel como un tomate. Le falta agua.

## g.colonia.usar
> Guille se echa la colonia por todas partes. Por todas.
GUILLE (contento): ¡Huelo a romero! Un poco a cerdo también, pero a cerdo que ha ido al monte.
> Las moscas se van, ofendidas.

## g.mirar.guille.olor
GUILLE (nervioso): Camisa de flores y olor a cerdo. Las moscas me han hecho fan.

## mirar.coche
GUILLE: Mi coche. Rojo, viejo y con más kilómetros que la Vuelta.

## g.coche.antes
GUILLE: Antes tengo que pesar los cerdos. Si no, el jefe me pesa a mí.

## g.coche.olor
GUILLE (nervioso): ¿Así? Si me subo así, el coche huele a cerdo hasta 2040.

## g.salida
GUILLE (contento): ¡Cerdicos, me voy! Mañana más. Portaos bien, que os veo.
> El coche arranca a la segunda. Bueno, a la tercera.

## g.mirar.madrid
GUILLE: Madrid al fondo. Las Cuatro Torres, las KIO, el Pirulí... Desde aquí parece de juguete.
---
GUILLE (contento): Y allí abajo, en algún sitio, el Río. Con sus bravas. Esperándome.

// ---------------------------------------------------------------- minijuego: apilar cerdos

cerdos.instrucciones = Toca para soltar el cerdo encima de la torre
cerdos.cuenta = {n} de {total} · {vidas}
cerdos.perfecto = ¡Perfecto!
cerdos.resbala = ¡Se resbala!
cerdos.sinvidas = ¡Se escapan todos!
cerdos.derrumbe = ¡Se cae la torre! Otra vez
cerdos.peor = ¡Ahora el peor!
cerdos.hecho = ¡{kg} kilos de cerdo!

// ---------------------------------------------------------------- Pablo: el backstage del teatro Joso

nombre.sombra = El narrador

zona.puertaArtistas = Puerta de artistas
zona.cartel = Cartel del Joso
zona.perchero = Perchero de vestuario
zona.tijeras = Tijeras
zona.maniqui = Maniquí
zona.baul = Baúl de atrezo
zona.maletas = Maletas
zona.maquina = Máquina de escribir
zona.flexo = Flexo
zona.cuadro = Cuadro de luces
zona.canon = Cañón de seguimiento
zona.nubes = Nubes de cojín
zona.pantalla = Pantalla de proyección

objetivo.pablo = Consigue papel para la máquina
objetivo.pablo.escribir = Pon el papel en la máquina
objetivo.pablo.luz = Más luz: el cuadro de luces
objetivo.pablo.salir = Sal por la puerta de artistas: al Río

pista.pablo.baul = En el baúl de atrezo hay libretos viejos. Impresos por una sola cara.
pista.pablo.tijeras = Un libreto encuadernado no entra en la máquina. En la mesita del vestuario hay unas tijeras.
pista.pablo.combinar = Junta el libreto y las tijeras en la bolsa: elige uno, vuelve a abrirla y toca el otro.
pista.pablo.maquina = Ya tienes hojas: úsalas en la máquina de escribir.
pista.pablo.luz = Con el flexo no basta. El cuadro de luces enciende el cañón de seguimiento.
pista.pablo.batalla = Tu sombra está en la pantalla de proyección. Tócala, o el cuadro de luces, para plantarle cara.
pista.pablo.salir = La puerta de artistas, bajo el cartel verde de SALIDA.

objeto.libreto = Libreto
objeto.libreto.texto = «La vida es sueño», versión de 2009. Impreso por una sola cara. Encuadernado a conciencia.
objeto.tijeras = Tijeras
objeto.tijeras.texto = Las tijeras de vestuario. Cortan tela, hilo y, si hace falta, egos.
objeto.hojas = Hojas sueltas
objeto.hojas.texto = Hojas de «La vida es sueño», en blanco por detrás. Calderón no se va a enterar.

## intro.pablo
> Teatro Joso, entre bambalinas. Jueves, ocho y media.
> Pablo teclea su formato nuevo de impro. Tac, tac, tac...
PABLO (contento): «Formato número catorce. Título provisional: "Palabra"».
> Era un título excelente.
PABLO (contento): Gracias.
> Pablo siguió escribiendo, inspirado como nunca. Tac, tac, tac, tac.
PABLO (contento): «El público grita una palabra, y los actores...»
> ...y los actores la olvidan a los diez segundos. Como siempre.
PABLO (sorprendido): No. Los actores la usan. Con mucho cuidado.
> Pablo escribió «con mucho cuidado». Luego lo tachó. Luego lo volvió a escribir.
PABLO (enfadado): ¡Eso no ha pasado!
> Pasó. Y entonces se acabó la hoja. Y con ella, la idea.
PABLO (nervioso): Vale. ¿Quién está narrando esto?

## intro.pablo.sombra
> La sombra de Pablo se despega de sus pies, se sacude el polvo y da un paso atrás.
SOMBRA (chulo): Yo. Tu narrador. Aquí, detrás de ti. No, al otro lado. Eso.
PABLO (nervioso): ¿Mi sombra habla?
SOMBRA (chulo): Narro. Es como hablar, pero con más estilo. Y te informo: no queda papel en todo el teatro.
PABLO: Eso ya lo veremos.

## p.maquina.sinpapel
PABLO: La máquina, sin papel. Y la frase a medias: «los actores tienen que...». ¿Que qué?
> Pablo miró la máquina. La máquina no le devolvió la mirada.

## p.maquina.libreto
PABLO: El libreto entero no entra. Está encuadernado como si fuera a escaparse.

## p.maquina.papel
> Pablo mete una hoja. Se aclara la garganta. Coloca los dedos.
> Y no escribe nada.
PABLO (nervioso): Es la luz. Con este flexo no veo ni lo que pienso.
SOMBRA (chulo): No es la luz, Pablo. Soy yo. Estás bloqueado.

## p.maquina.bloqueo
PABLO (enfadado): Ni una letra. Necesito más luz. O menos sombra.

## p.maquina.hecho
PABLO (contento): «Formato: el público grita una palabra y los actores dicen que sí. A todo.» Perfecto.
SOMBRA (contento): Lo firmo. Y yo no regalo nada. Ahora, la puerta de artistas: está a la izquierda, bajo el cartel verde.

## mirar.flexo
PABLO: El flexo. Alumbra lo justo para que se vea que no escribo.

## p.baul
PABLO: El baúl de atrezo. Calaveras de plástico, un cetro, una corona... ¡Un libreto!
PABLO (contento): «La vida es sueño». Impreso por una sola cara. Por detrás, todo blanco.
> Pablo sonrió. El narrador también, pero por otros motivos.

## p.baul.vacio
PABLO: Ya no hay más libretos. Solo una corona de cartón y una calavera que me mira mal.

## mirar.baul
PABLO: El baúl de atrezo. Aquí acaba todo lo que no se tira. Como en mi cabeza.

## p.tijeras
PABLO: Las tijeras de vestuario. Me las llevo. Prometo devolverlas. Bueno, prometo intentarlo.

## mirar.tijeras
PABLO: Unas tijeras de sastre en la mesita de vestuario.

## p.combinar
> Pablo corta el lomo del libreto con las tijeras de vestuario.
PABLO (contento): ¡Hojas sueltas! Calderón por delante, mi formato por detrás.
SOMBRA: Calderón está revolviéndose en su tumba. Con estilo, eso sí.

## mirar.perchero
PABLO: El vestuario de la compañía: chaquetas de comandante, gorras de comandante y pañuelos turquesa.
> Nadie en el teatro sabía por qué había tantos uniformes de piloto. Nadie preguntaba.

## usar.perchero
PABLO (chulo): Si me pongo la gorra de comandante, ¿me sale el formato? Mejor no. Luego no me la quito.

## mirar.maniqui
PABLO: El maniquí con uniforme de piloto y pañuelo turquesa. Va más elegante que yo.

## usar.maniqui
PABLO: Buenas noches, comandante. ¿Alguna idea? ¿No? Ya somos dos.

## mirar.maletas
PABLO: Tres maletas blancas, de grande a pequeña. Siempre viajan juntas. Como nosotros.

## usar.maletas
PABLO: Vacías. Las maletas de impro nunca llevan nada dentro. Lo pone el público.

## mirar.nubes
PABLO (contento): Las tres nubes de cojín. Las más blanditas de todo Madrid.

## usar.nubes
PABLO: Si me tumbo en las nubes, me duermo. Y si me duermo, gana el narrador.

## mirar.cartel
PABLO (contento): «Joso, Laboratorio Teatral». Con su elefante. Aquí he estrenado más que en ningún sitio.

## mirar.cuadro
PABLO: El cuadro de luces. Palancas, fusibles y un letrero amarillo que da miedo.

## p.cuadro.antes
PABLO: No toco el cuadro si no hace falta. La última vez apagué medio Lavapiés.

## p.cuadro.despues
PABLO: Mejor no toco más el cuadro. Ya tengo bastante luz. Por dentro, sobre todo.
SOMBRA: Haces bien. Que el último que tocó ese cuadro apagó medio Lavapiés. Y era tú.

## p.canon.despues
SOMBRA: Déjalo apagado. Ya no necesito tres metros: me quedo a tus pies, que se narra mejor.

## p.pantalla.despues
SOMBRA (contento): Ahí arriba estaba enorme, ¿eh? Pero se está mejor aquí abajo, de tu parte.

## p.mirar.pablo.despues
PABLO (contento): Formato terminado, y ni rastro de la sombra.
SOMBRA: Abajo, Pablo. Mira abajo. Sigo aquí. Pero ya juego en tu equipo.

## mirar.canon
PABLO: El cañón de seguimiento. Apunta a la pantalla de proyección, como si esperara a alguien.

## p.canon.usar
PABLO: El cañón se enciende desde el cuadro de luces.

## p.canon.encendido
PABLO: Encendido y apuntando a mi sombra. Bueno, a mi narrador. Bueno, a mí.

## mirar.pantalla
PABLO: La pantalla de proyección. Un telón blanco esperando que alguien le proyecte algo.

## usar.pantalla
PABLO: Está tan oscuro que en la pantalla no se ve nada. Ni mi talento.

## p.mirar.pantalla.sombra
PABLO (nervioso): Mi sombra, de tres metros. Con los brazos cruzados. Esto no pinta bien.

## p.canon
> Pablo baja la palanca. El cañón de seguimiento se enciende con un zumbido.
> La sombra de Pablo salta a la pantalla de proyección. Ahora mide tres metros.
SOMBRA (chulo): ¡Por fin un escenario a mi altura!
PABLO (sorprendido): ¿Qué haces ahí?
SOMBRA: Narrar. A lo grande. «No». «Sí, pero». «Ya lo pensarás mañana». ¿Te suena?
PABLO (enfadado): Me suena a bloqueo. Y del bloqueo se sale diciendo que sí.
SOMBRA (chulo): A ver si es verdad. Te lanzo palabras. Corta las malas. Si puedes.

## p.batalla.otra
SOMBRA (chulo): ¿Otra vez tú? Venga. Te lanzo palabras.

## p.batalla.cancelada
SOMBRA (chulo): Un dramaturgo que abandona a mitad del segundo acto. Qué original.

## p.gana
> La sombra encoge, y encoge, y se mete otra vez bajo los pies de Pablo, como si nunca hubiera salido.
SOMBRA (contento): Vale. Lo admito. Era un buen formato.
PABLO (sorprendido): ¿Sigues ahí?
SOMBRA: Siempre. Pero ahora narro a tu favor. Escribe.
PABLO (contento): ¿Ves? Sí, y... ahora lo escribo.
> Y Pablo escribió. Por fin. Hasta el narrador se emocionó un poco.
SOMBRA: Y ahora, al Río. Por la puerta de artistas, que llegas tarde. Eso también lo narro.

## p.gana.saltado
> El narrador se cansa antes que Pablo. La sombra encoge y se mete otra vez bajo sus pies.
SOMBRA: Bueno, bueno. Escribe, anda. Que llegas tarde. Desde aquí abajo te echo una mano.
PABLO (contento): ¡Sí, y...! Ya está. Formato terminado.

## p.puerta.antes
> Pablo empuja la puerta. La puerta no se abre. Narrativamente, no toca.
PABLO (enfadado): ¡Eso no se lo cree nadie!
SOMBRA (chulo): Primero el formato. Luego las cañas. Así funcionan las buenas historias.

## p.salida
PABLO (contento): ¡Me voy al Río! ¿Vienes?
SOMBRA: Soy tu sombra, Pablo. Voy a todas partes. Pero no pido.
> La puerta de artistas se abre. Por fin.

## p.mirar.sombra.papel
PABLO: Mi sombra. Más alta que yo. Y más borde.

## p.mirar.sombra.bloqueo
PABLO (nervioso): Mi sombra, con cara de saber algo que yo no sé.

## p.hablar.sombra.papel
PABLO: ¿No tienes papel?
SOMBRA: Soy una sombra. No tengo ni bolsillos.
---
PABLO: ¿Y si me ayudas, en vez de narrar?
SOMBRA (chulo): «Pablo pidió ayuda. Nadie respondió». ¿Ves? Narrar es más rápido.
---
SOMBRA: Una pista, porque me caes bien: los libretos viejos solo se imprimían por una cara.
PABLO (sorprendido): ¿Me estás ayudando?
SOMBRA: Te estoy narrando. Que te ayude es casualidad.

## p.hablar.sombra.bloqueo
PABLO (enfadado): Déjame escribir.
SOMBRA (chulo): Yo no te impido nada. Solo describo cómo no escribes.
---
PABLO: Necesito más luz.
SOMBRA: Más luz, más sombra. Tú verás.

## p.sombra.objeto
SOMBRA (chulo): ¿Me ofreces eso? Qué detalle. Sigo sin dejarte escribir.

## p.sombra.tijeras
SOMBRA (sorprendido): ¿Vas a cortarme? Soy una sombra, Pablo. Como mucho, me recortas.

## p.sombra.libreto
SOMBRA: Calderón. «Toda la vida es sueño». Y la tuya, de momento, bloqueo.

// ---------------------------------------------------------------- minijuego: cortar palabras

palabras.instrucciones = Corta las palabras que bloquean. Deja pasar las que suman.
palabras.bloqueo = Bloqueo
palabras.pagina = Página
palabras.malcorte = ¡Esa sumaba!
palabras.seescapa = ¡Se te ha colado!
palabras.pierde = ¡Bloqueado! Otra vez
palabras.gana = ¡Desbloqueado!

// Las palabras que caen. Sepáralas con barras: «una / otra / otra más».
palabras.negativas = no / sí, pero / bloquear / negar / dudar / juzgar / controlar / planificar / explicar / corregir / imponer / esperar / ignorar / miedo
palabras.positivas = sí, y / aceptar / escuchar / adaptar / avanzar / confiar / construir / ofrecer / jugar / arriesgar / compartir / celebrar / fallar

// ---------------------------------------------------------------- final: los cuatro llegan a la vez

## final.antes
> Bar del Río. A la misma hora, por cuatro sitios distintos...

## final
FRAN (sorprendido): ¿Pero qué...? ¿Llegáis ahora?
PABLO (contento): Llego tarde con estilo. Es una entrada en escena.
CHUCHI: Yo llego tarde porque tengo dos hijas. Tengo bula.
GUILLE (contento): ¡Maño! ¡Pues ya estamos todos! Y nadie ha pedido, ¿no?
FRAN: Los cuatro a las {hora}, a la vez. Esto no lo escribe ni Pablo.
PABLO (chulo): Hombre, yo lo habría escrito mejor.
> Y así empezó lo de los jueves. Pero esa es otra historia.

fin.titulo = Fin del piloto
fin.texto = Los cuatro han llegado al Río. La historia de Chuchi es provisional: pronto tendrá sus propios puzles.

// ---------------------------------------------------------------- historia provisional (Chuchi)

zona.salida = Puerta
zona.cosa.chuchi = Caja de juguetes

objetivo.chuchi = Sal de casa sin despertar a nadie
pista.chuchi = (Historia provisional) Toca la caja de juguetes y luego sal por la puerta.
pista.chuchi.salir = La puerta de la derecha lleva al Río.

## intro.chuchi
> Casa de Chuchi. Jueves, ocho y veinte.
CHUCHI: Las dos dormidas. Por fin. Ahora, sin hacer ruido, me pongo los zapatos y...
> Algo cruje bajo su pie.
CHUCHI (enfadado): Un Lego. Siempre hay un Lego.
> (Historia provisional: pronto vendrán los contratiempos de Chuchi.)

## prov.chuchi.ventana
CHUCHI: Ni un ruido en la calle. Que siga así hasta que salga.

## prov.chuchi.cosa
CHUCHI: La caja de juguetes. Ahí dentro hay más tecnología que en mi oficina.

## prov.chuchi.usar
> Chuchi recoge los juguetes del suelo, uno a uno, en silencio.
CHUCHI (sorprendido): ¡Mis llaves! En la cocinita de juguete. Junto a una tortilla de fieltro.

## prov.chuchi.salida.mirar
CHUCHI: La puerta. Sin llaves es decoración.

## prov.chuchi.salida.antes
CHUCHI (nervioso): ¿Y mis llaves? Estaban aquí. Seguro que alguien ha jugado a las casitas con ellas.

## prov.chuchi.salida
CHUCHI (chulo): Cerrando despacito... Libre. Hoy no existo para nadie.

## mirar.pablo
PABLO (chulo): Chaqueta de borreguillo, pendiente y sonrisa de estreno. Listo para un público exigente.
> Y para un narrador más exigente todavía.

## mirar.chuchi
CHUCHI: Gafas, ropa de salir y una pegatina de unicornio en la manga. Bueno, eso último lo quito.

## mirar.guille
GUILLE (contento): Camisa de flores, vaqueros y zapatillas. Elegante hasta en la granja.

## g.mirar.guille.limpio
GUILLE (contento): Camisa de flores y oliendo a romero. Hoy ligo yo, ¿eh? Bueno, ligaría, si no tuviera novia.

## nofunciona.pablo
PABLO: Eso no tiene arco dramático.

## nofunciona.chuchi
CHUCHI: Eso no compila.

## nofunciona.guille
GUILLE: ¡Maño, eso no va ahí!

## nadacontigo.pablo
PABLO: No sé qué quieres que haga yo con eso.

## nadacontigo.chuchi
CHUCHI: No sé qué quieres que haga yo con eso.

## nadacontigo.guille
GUILLE: ¿Y yo qué hago con eso, maño? ¿Me lo pongo de sombrero?

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
