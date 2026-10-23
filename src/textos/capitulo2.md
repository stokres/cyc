# Capítulo 2 · La noche del Brío

<!--
CÓMO EDITAR ESTE ARCHIVO
Todo lo que se dice en el juego está aquí. Cámbialo a tu gusto y recarga.

  ## clave                     empieza un bloque de diálogo (no cambies la clave)
  FRAN: texto                  lo dice Fran (también PABLO, CHUCHI, GUILLE y VERO)
  FRAN (contento): texto       con cara: normal, contento, sorprendido, nervioso, triste, enfadado, chulo
  PABLO [20:12]: texto         mensaje del grupo de WhatsApp, con su hora
  > texto                      lo cuenta el narrador
  ---                          otra versión: cada vez que se repite, sale la siguiente
  clave = texto                un texto suelto (nombres, objetivos, pistas)
  {hora}                       el juego lo cambia por la hora del momento

Los textos de este capítulo son provisionales: están para probar el puzle.
-->

// ---------------------------------------------------------------- las cañas por la barra
// Minijuego de Fran y Vero (src/ui/canas.ts). «{quien}» es el nombre de quien espera la caña.

canas.instrucciones = Toca para frenar cada caña delante de quien la espera
canas.para = Para {quien}
canas.cae = ¡Al suelo! Otra ronda
canas.gana = ¡Ronda servida!

// ---------------------------------------------------------------- el canto a cuatro
// Minijuego de los cuatro (src/ui/canto.ts). Las sílabas van separadas por guiones,
// de dos en dos: Pablo canta las dos primeras, Fran las dos siguientes, y así.
// Si cambias su número, el juego reparte las que haya entre los cuatro.

canto.instrucciones = Toca a cada uno cuando se ilumine para que cante su parte
canto.silabas = Ca-mio-neees-y-ca-ra-va-naaas
canto.fallo = ¡Desafinado! Otra vez
canto.segunda = ¡Otra vez, más fuerte!
canto.gana = ¡CAMIONEEES Y CARAVANAAAS!

// ---------------------------------------------------------------- título y fin del arranque

titulo.capitulo2 = Capítulo 2 · Lo que pasó dentro
c2.fin.sub = Fin del arranque del capítulo 2
c2.fin.titulo = Hasta aquí, de momento
c2.fin.texto = El capítulo 2 sigue en obras. Fran ha despertado en el Brío, pero la noche no ha hecho más que empezar.

// ---------------------------------------------------------------- arranque: la puerta del Brío

## c2.intro
> Bar del Brío. Jueves. Ya no son las nueve.
> Van por la tercera ronda. O por la cuarta. Nadie lleva la cuenta, y eso es buena señal.
> Fuera, Usera se va a dormir. Dentro, la noche no ha hecho más que empezar.

## c2.mesa
GUILLE (contento): ¡Y entonces el cerdo me mira y se sienta! Como una persona, ¿eh?
PABLO (contento): Eso es una obra de teatro. «El cerdo que se sentó». Primer acto.
CHUCHI: Chicos, yo me voy a ir yendo. Que las niñas madrugan.
FRAN (sorprendido): ¿Irte? ¿Ahora? ¡Si estamos calentando!
CHUCHI: Una más y me pongo kinki. Avisados quedáis.
FRAN (chulo): Pues una más. Ya está. Voy a por la ronda.

// ---------------------------------------------------------------- objetivos y pistas

objetivo.c2.ronda = Pide otra ronda en la barra antes de que Chuchi se vaya
objetivo.c2.moneda = Consigue jugar a la tragaperras
objetivo.c2.fresquitos = Convence a Vero para que saque los fresquitos
objetivo.c2.duro = Mete el duro en la tragaperras

pista.c2.ronda = Vero está detrás de la barra. Que le pida Fran, que es el de «una más».
pista.c2.cambio = Guille lleva un billete de cincuenta. Quizá Vero se lo cambie.
pista.c2.maquina = La tragaperras está «fuera de servicio». Chuchi entiende de máquinas.
pista.c2.enchufe = El enchufe de la tragaperras está detrás. Alguien fuerte tendría que separarla de la pared.
pista.c2.cogerduro = Detrás de la tragaperras brilla algo en el suelo.
pista.c2.meterduro = Abre la bolsa, elige el duro y toca la tragaperras.
pista.c2.fresquitos = Pablo es el que mejor se lleva con Vero. Que hable él.
pista.c2.duro2 = Con los fresquitos, todo parece posible. Prueba otra vez con el duro.

// ---------------------------------------------------------------- el bar: nombres

zona.c2.puerta = Puerta
zona.c2.tabaco = Máquina de tabaco
zona.c2.barra = Barra
zona.c2.grifos = Grifos de cerveza
zona.c2.expositor = Expositor de tapas
zona.c2.estanteria = Estantería de botellas
zona.c2.tele = Tele
zona.c2.porra = Porra de la cesta de Navidad
zona.c2.tragaperras = Tragaperras
zona.c2.bano = Baño

objeto.duro = Duro de 1987
objeto.duro.texto = Cinco pesetas de 1987. En la cara, el rey. Por detrás, nada que se pueda pagar con esto.

// ---------------------------------------------------------------- el bar: mirar

## c2.mirar.puerta
FRAN: La puerta del Brío. Por fuera, Usera. Por dentro, nosotros. Se está mejor por dentro.

## c2.puerta
FRAN (chulo): De aquí no se va nadie. Por lo menos hasta la siguiente.
---
FRAN: Ni se te ocurra. La puerta es para entrar.

## c2.puerta.chuchi
CHUCHI: Podría irme ahora. Nadie se daría cuenta.
FRAN (enfadado): ¡Te estoy viendo, Chuchi!

## c2.puerta.sueno
FRAN (sorprendido): La puerta se ha puesto a respirar. Mejor no la abro.

## c2.mirar.tabaco
CHUCHI: La máquina de tabaco da cambio. Si compras tabaco. Y aquí no fuma nadie.

## c2.mirar.tabaco.2
CHUCHI (sorprendido): Las marcas de tabaco se han cambiado los nombres. Esa pone «Fresquito Light».

## c2.mirar.barra
FRAN (contento): La barra del Brío. Fría, metálica y siempre con una caña esperando.

## c2.mirar.grifos
GUILLE (contento): Dos grifos. Uno de cerveza y otro de cerveza. El Brío no se complica.

## c2.mirar.grifos.2
GUILLE (sorprendido): El grifo de la izquierda gotea hacia arriba. Eso no lo había visto nunca.

## c2.mirar.expositor
GUILLE (contento): Ensaladilla, boquerones y oreja. El expositor más bonito de Usera.

## c2.mirar.expositor.2
GUILLE (nervioso): La ensaladilla me ha saludado. Y yo le he devuelto el saludo, por educación.

## c2.mirar.estanteria
PABLO: Botellas de todo lo que existe. Y de dos o tres cosas que no deberían existir.

## c2.mirar.estanteria.2
PABLO (sorprendido): Las botellas se han ordenado por colores. ¿Siempre han estado así?
GUILLE: Siempre. Bueno, desde hace un fresquito.

## c2.mirar.tele
CHUCHI: El fútbol sin volumen. Como debe ser.

## c2.mirar.tele.2
CHUCHI: En la tele sale el dragón de Usera. Bailando. Con el sonido quitado, por suerte.

## c2.mirar.tele.3
CHUCHI (sorprendido): Ahora en la tele salgo yo. Mirando la tele.

## c2.mirar.porra
FRAN: La porra de la cesta de Navidad. Yo llevo el 23. Este año toca, lo noto.

## c2.mirar.porra.1
FRAN: La porra de la cesta de Navidad. Yo llevo el 23. Juraría que hace un momento estaba en otra casilla.
FRAN (nervioso): Será la caña. Las cañas no hacen eso. Creo.

## c2.mirar.porra.3
FRAN (sorprendido): ¡Todos los números son sietes! Ahora sí que toca seguro.

## c2.mirar.barra.4
GUILLE (nervioso): Llevo diez minutos andando por la barra y sigo en la misma caña.

## c2.mirar.barra.5
CHUCHI (sorprendido): La barra cuelga del techo. Por lo menos las cañas ya no se derraman: se quedan quietas por orgullo.

## c2.mirar.estanteria.5
PABLO: Las botellas siguen en su sitio. Es el sitio el que ha cambiado de sitio.

## c2.mirar.porra.4
CHUCHI (sorprendido): La porra se repite. Esta es la tercera vez que veo el nombre de Fran con un siete.

## c2.mirar.tragaperras
GUILLE: «Fuera de servicio». Con lo bonita que es.

## c2.mirar.bano
FRAN: El único baño del Brío. Cola de uno: yo, cada dos cañas.

## c2.mirar.bano.3
FRAN (nervioso): La puerta del baño está más lejos cada vez que la miro.

// ---------------------------------------------------------------- los cuatro, en el bar

## c2.mirar.fran
FRAN (contento): Una caña en la mano y la noche por delante. Así sí.

## c2.mirar.pablo
PABLO (chulo): Chaqueta de borreguillo, sonrisa de estreno y el bar entero de público.

## c2.mirar.chuchi
CHUCHI: Las niñas dormidas, el portátil cerrado. Hoy solo existo para vosotros. Un rato.

## c2.mirar.guille
GUILLE (contento): Camisa de flores y oliendo a romero. El rey del Brío.

## c2.charla.fran
FRAN (contento): ¡Venga, que esta la pago yo!
---
FRAN: ¿Otra caña? Venga, la última. La penúltima. Una más y nos vamos.

## c2.charla.pablo
PABLO (contento): Esto es un primer acto buenísimo. Cuatro amigos, un bar y una tragaperras. Algo va a pasar.
---
PABLO: ¿Me dejaría Vero traerme el cajón?

## c2.charla.chuchi
CHUCHI: Una más. Solo una. Y me voy. Seguro.
---
CHUCHI (chulo): Como me pongáis otra, me pongo kinki.

## c2.charla.guille
GUILLE (contento): ¡Qué ganas tenía de estar con vosotros! Ven aquí, que te doy un abrazo.
---
GUILLE: Me he duchado dos veces, ¿eh? Por si alguien lo dice.

// ---------------------------------------------------------------- Vero

## c2.vero.charla
VERO (chulo): ¿Qué te pongo, mi niño? Bueno, ya sé lo que te pongo: lo mismo.
---
VERO: Si vais a montar jaleo, montadlo bajito, ¿oíste?
---
VERO (contento): Treinta personas en este bar y los únicos que dan trabajo sois vosotros cuatro, mi amor.

## c2.vero.objeto
VERO: Eso guárdalo, mi vida, que aquí se paga con dinero.

## c2.vero.duro
VERO (sorprendido): ¿Un duro? Mi niño, eso es de antes de que yo naciera.

## c2.vero.despues
VERO (chulo): Ni me mires, que el quinto fresquito no sale.

## c2.vero.sueno
VERO (sorprendido): Oye... ¿y por qué me miráis así? ¿Tengo algo en la cara?

// ---------------------------------------------------------------- la ronda: las cañas por la barra

## c2.ronda.noeres
CHUCHI: La ronda que la pida Fran, que es el de «una más».

## c2.ronda.noeres.pablo
PABLO: Que pida Fran. Es su escena.

## c2.ronda.noeres.guille
GUILLE: Pide tú, Fran, que a ti Vero te hace caso. A mí me mira raro desde lo del cerdo.

## c2.vero.ronda
FRAN (contento): ¡Vero! Otra ronda, que Chuchi se nos escapa.
VERO: Ay, Fran, siempre lo mismo. Te las tiro por la barra y las paras tú. Si se cae una, la pagas, mi amor.
FRAN (chulo): ¡Esta la pago yo de todas formas!

## c2.canas.cancelada
VERO: ¿Qué pasa, que ya no queréis? Pues ahí se quedan.

## c2.ronda.servida
CHUCHI: Bueno. Pero esta es la última. De verdad.
FRAN (contento): La última. La penúltima. Una más y nos vamos.
> Nadie se fue.

## c2.tragaperras.idea
GUILLE (contento): ¡Anda! La tragaperras. ¡Hace años que no juego!
FRAN (contento): Si sale premio, la siguiente ronda la paga la máquina.
PABLO: ¿Alguien lleva suelto?
CHUCHI: Yo pago todo con el móvil. Hasta el pan.
GUILLE: Yo llevo un billete de cincuenta desde agosto. Por si acaso.
FRAN: Yo llevo el llavero de Osasuna. Y la ilusión.

## c2.vero.cambio
GUILLE: Vero, ¿me cambias cincuenta?
VERO: ¿Cambio para la tragaperras? Ni lo sueñes, mi vida. Además, está rota.
GUILLE (triste): Dos noes en una frase. Eso duele.

// ---------------------------------------------------------------- la máquina: Chuchi y Guille

## c2.tragaperras.rota
FRAN: «Fuera de servicio». Hasta la máquina se quiere ir a casa.
---
FRAN: Fuera de servicio. Esto lo arregla alguien que sepa de cacharros.

## c2.tragaperras.rota.pablo
PABLO: «Fuera de servicio». Como yo un lunes. Chuchi sabrá qué le pasa.

## c2.tragaperras.rota.guille
GUILLE: «Fuera de servicio». Le daría un golpe, pero eso solo funciona con la radio de la granja.

## c2.chuchi.tragaperras
CHUCHI (chulo): Apartad. Esto es como el router: se desenchufa, se cuentan diez y se vuelve a enchufar.
CHUCHI: El problema es que el enchufe está detrás. Y esto pesa como un frigorífico.

## c2.separar.noeres
FRAN: Esto pesa como un frigorífico. Aquí hace falta alguien que levante cerdos.

## c2.separar.noeres.pablo
PABLO: Yo levanto cajas de ritmo, no máquinas. Guille, ¿tú no pesabas cerdos?

## c2.separar.noeres.chuchi
CHUCHI: Yo soy el cerebro de la operación. El músculo es Guille.

## c2.guille.tragaperras.antes
GUILLE (contento): ¿Pesada? He levantado cerdos de ciento cincuenta kilos. Esto es una caja con luces.

## c2.guille.tragaperras
> Guille separa la máquina de la pared. Detrás, polvo, chapas, un mechero... y algo que brilla.
GUILLE (sorprendido): ¡Un duro! ¡Un duro de 1987!
CHUCHI: Ya está desenchufada. Uno, dos... diez. Enchufada.
> La tragaperras se enciende con un acorde un poco desafinado.

## c2.coger.duro
> El duro de 1987, con el polvo de varias décadas. Al bolsillo.

## c2.tragaperras.encendida
GUILLE (contento): Ya funciona. Ahora solo falta dinero. Del de ahora.

## c2.tragaperras.conduro
GUILLE: Ya funciona. ¿Y si probamos con el duro?

## c2.tragaperras.despues
FRAN (contento): Esta máquina y yo ya somos amigos.

## c2.duro.probar
> «Moneda no válida».
FRAN: Normal: esto no vale desde antes del euro.
PABLO: A lo mejor solo falta ambiente.

## c2.duro.mirar
FRAN: Cinco pesetas. Con esto en el 87 te tomabas un café. Bueno, medio.

## c2.duro.dar
CHUCHI: Guárdalo tú, que lo vas a necesitar para la máquina.

// ---------------------------------------------------------------- los fresquitos: Pablo y Vero

## c2.fresquitos.noeres
FRAN: A mí Vero ya me ha puesto la ronda. Para los fresquitos hace falta labia. Pablo.

## c2.fresquitos.noeres.chuchi
CHUCHI: Yo con desconocidos me pongo tímido. Y Vero, sin los fresquitos, es una desconocida. Que vaya Pablo.

## c2.fresquitos.noeres.guille
GUILLE: Yo ya le he pedido cambio y me ha dicho que no dos veces. Que lo intente Pablo, que es el galán.

## c2.pablo.vero
PABLO (chulo): Vero. Tú y yo sabemos que esta noche pide fresquitos.
VERO: Los fresquitos se ganan, chico. Hazme reír y te los pongo.

c2.opcion.1 = Un chiste de camareros
c2.opcion.2 = Un piropo de los míos
c2.opcion.3 = Una escena de impro con ella

## c2.pablo.opcion.1
PABLO: Entra un esqueleto en un bar y pide una caña y una fregona.
VERO: Ese me lo contó Fran en 2014. Y en 2015. Y anoche.

## c2.pablo.opcion.2
PABLO (chulo): Vero, si fueras una tapa, serías la que nunca se acaba.
VERO: Pablo, tú tienes novia. Siguiente.

## c2.pablo.opcion.3
PABLO (contento): Escena: tú eres una camarera que sabe que esta noche va a pasar algo raro. Y yo...
VERO: Y tú eres el cliente que no se calla. Ya te cogí la idea.
> Vero sonríe. Lo justo.
VERO: Cuatro fresquitos. Y el quinto ni me lo pidas, ¿oíste?

## c2.fresquitos.despues
GUILLE (sorprendido): ¿Soy yo, o el bar está más... de colores?
CHUCHI: Son los fresquitos. Los fresquitos hacen eso. Creo.

// ---------------------------------------------------------------- la tirada y el canto

## c2.duro.entra
FRAN (contento): ¡Esta la pago yo!
> La máquina se traga el duro de 1987 como si fuera un euro recién hecho. Nadie lo comenta.

## c2.duro.sinpremio
GUILLE: Un cerdo. Siempre acabo con un cerdo.
FRAN (triste): Nada. Mi duro.
PABLO (chulo): Esto no es una tirada, es una escena muda. Le falta música.

## c2.canto.antes
PABLO (contento): Escuchad. Un pasodoble de mi pueblo.
> Pablo coge aire. Y le salen dos palabras.
PABLO: ¡Camioneees y caravanaaas!
CHUCHI (sorprendido): ¿Camiones y qué?
GUILLE (contento): ¡Me encanta! ¡Otra vez, todos!

## c2.premio.antes
> Y por primera vez en la historia del Bar del Brío, sonó la canción.

## c2.premio
GUILLE (contento): ¡PREMIO GORDO!
@manga guille:cara:risa chuchi:ojos:sorpresa !don solo
CHUCHI (sorprendido): ¡Esto no paga en monedas desde 2002!
VERO (sorprendido): Oye, mi niño... ¿y desde cuándo las paredes son redondas?
FRAN (contento): Que no pare. Que no pare nunca.

// ---------------------------------------------------------------- Fran cierra los ojos

## c2.fran.ojos
FRAN (contento): Cinco minutitos. Solo cinco. Como los profesionales.
> La espuma de su caña empezó a crecer. Y a botar.

// ---------------------------------------------------------------- el resto de la noche (primera parte)
// Provisional. Las líneas que empiezan por @ no se dicen: son la cámara loca (src/juego/camara.ts):
//   @holandes 8 500 · @nivelar · @zoom pablo 2.4 · @corte chuchi 2.6 -7 · @general · @contrapicado 14
//   @barrido vero 1.8 · @temblor 14 700 · @foco tragaperras (la cámara de verdad viaja hasta allí) · @espera 400
// El plano manga (src/juego/manga.ts): 1 a 3 viñetas inclinadas en blanco y negro, con el diálogo en su cuadro:
//   @manga pablo:ojos:suplica vero:boca chuchi:cara:sorpresa !gogogo      personaje:tipo:expresión (cara · ojos · boca · mano)
//   !gogogo !don !ha !zas son onomatopeyas dibujadas · solo: se va al acabar la siguiente línea · @manga fin: vuelve
//   Expresiones: pablo suplica sorpresa seriedad risa · fran enfado sorpresa triste risa · chuchi sorpresa duda seriedad
//   risa · guille risa sorpresa nervioso seriedad · vero picara sorpresa risa seriedad · sombra burla seriedad
// El bar 4 es un pasillo que no se acaba, con el suelo inclinado; el bar 5, el Brío del revés.

## c2.noche.despierta
@holandes 7 0
@temblor 16 900
FRAN (sorprendido): ¡AUPA! ¡Un dragón! ¡Había un dragón!
@corte fran 2.4 -6
FRAN (nervioso): Estaba en Usera. Y el dragón salía de la tele, ¿vale? Verde, enorme, con cara de no haber cenado.
@manga chuchi:cara:duda chuchi:mano
CHUCHI: Fran, has cerrado los ojos hace un minuto. Un minuto y poco.
@manga fran:mano fran:cara:enfado !zas
FRAN (enfadado): ¡Dos minutos de dragón, Chuchi! Se comía mi piso. Se comía Las Vegas. ¡Y al final venía La Penúltima, una caña de siete metros!
@barrido pablo 2.1
PABLO (chulo): Dragón, piso, Las Vegas, caña final. Tiene estructura. Quita el portal y tienes un monólogo.
@corte guille 2.4 8
GUILLE (contento): Yo creo que era un cerdo grande. Los cerdos grandes tienen ese efecto en la gente.
@manga fran:cara:triste chuchi:ojos:duda
FRAN (triste): No me creéis.
@corte chuchi 2.2 -6
CHUCHI: Yo te creo lo del cerdo.
@general 500
@contrapicado 12 700
FRAN (sorprendido): Un momento. ¿Por qué la barra no se acaba?
@corte guille 2.2 6
GUILLE (nervioso): Lleva así un rato. No quise decir nada para no cortar el rollo.
CHUCHI (nervioso): Y el suelo baja. Yo me llevo agarrado a este taburete desde hace diez minutos.
@barrido vero 1.8 -1
VERO: Yo de eso no sé nada, mi amor. Yo solo pongo las cañas.

## c2.noche.maquina
@nivelar 400
@foco tragaperras
> Allá al fondo del pasillo, que está muy al fondo, algo hace «clic».
@zoom tragaperras 1.7
> La tragaperras, que nadie ha tocado, empieza a girar. Sola. Otra vez.
CHUCHI (nervioso): Nadie ha echado un duro. Yo no he tocado nada. Lo juro por mis hijas.
GUILLE (nervioso): ¿Me va a salir otro cerdo?

## c2.noche.pablo
@general 500
@temblor 12 600
> La máquina se apaga de golpe. Se oye caer el último rodillo, como una puerta.
@foco pablo
@manga pablo:ojos:sorpresa sombra:ojos:seriedad !gogogo
PABLO (nervioso): Esa cara...
@corte chuchi 2.2 5
CHUCHI: Es la tuya, Pablo.
@corte pablo 3 8
PABLO (triste): Ya sé que es la mía. Lo que me preocupa es que ahora esté mirándome desde dentro.
@corte guille 2.2 -6
GUILLE (nervioso): A mí me ha parecido que guiñaba.
@general 400
@temblor 22 900
> Las luces del Brío parpadean. Una, dos, tres veces. A la tercera, el mundo se da la vuelta.

## c2.noche.reves
@holandes 5 0
@temblor 26 1300
@contrapicado 14 900
GUILLE (nervioso): ¡Los taburetes están en el techo!
CHUCHI (sorprendido): No. El techo está en el suelo. Es distinto.
@corte fran 2.4 -8
FRAN (sorprendido): ¿Y yo sobre qué estoy de pie?
VERO: Sobre el techo, mi vida. Pásate la fregona por los pies, que ahí arriba se pega.
@barrido pablo 2
PABLO (nervioso): Esto ya no es un sueño. Esto es una enmienda a la totalidad.
@zoom pablo 2.8
> Y detrás de Pablo, su sombra se despega de sus pies y se estira, desperezándose.

## c2.noche.narrador
@zoom pablo 2.2 900
SOMBRA (chulo): Qué escena tan bonita. Un bar del revés, cuatro amigos, una máquina con tu cara...
PABLO (sorprendido): ¡Tú! ¿No te habías quedado en el capítulo uno?
SOMBRA (chulo): Los narradores no nos quedamos en ningún capítulo. Nos reservamos.
@corte fran 2.4 6
FRAN: ¿Y este quién es?
CHUCHI: La sombra de Pablo. El narrador. Es largo de explicar.
@manga sombra:cara:burla pablo:ojos:sorpresa !gogogo
SOMBRA (chulo): Os habéis puesto a soñar y a ninguno se le da bien acabarlo. Así que tranquilos.
@temblor 20 700
@manga sombra:ojos:seriedad !don
SOMBRA (chulo): Esta historia la acabo yo.
@manga fin

## c2.noche.consola
@temblor 18 1000
> La pantalla se marea. Pierde píxeles. Se encoge, y se encoge, hasta caber entera en una consola de las de antes.

## c2.noche.sueno
> Y en algún sitio, alguien abrió los ojos.

## c2.noche.pablo.ojos
@manga pablo:ojos:sorpresa pablo:cara:seriedad pablo:boca:seriedad !gogogo
PABLO (sorprendido): «La vida es sueño, y los sueños, sueños son».
@zoom pablo 3 0
@holandes -9 600
PABLO: Calderón lo dijo con más gracia. Yo me he enterado con menos luz.
@barrido chuchi 2.3
CHUCHI: ¿Estás bien? Te has quedado mirando la máquina y te has ido.
@corte pablo 2.8 8
PABLO (triste): Me he metido en una consola, Chuchi. Con una sombra, un teatro y un cuarto con mi madre.
@corte guille 2.2 -7
GUILLE (contento): ¡Qué bien! Yo he soñado que pesaba una nube y daba tres kilos.
@temblor 10 500
@nivelar 600
@general 700
FRAN (sorprendido): Un momento. Si Pablo ha vuelto, ¿por qué seguimos del revés?
@contrapicado 10 700
VERO: Porque la noche no ha terminado, mi amor. Ni de lejos.

// ---------------------------------------------------------------- manga (onomatopeyas en castellano; las japonesas son dibujo)
manga.ono.zas = ¡ZAS!
