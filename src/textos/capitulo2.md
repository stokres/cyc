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

canto.instrucciones = Toca la cara de quien canta
canto.refuerzo = ¡Toca la cara que brilla, a tiempo!
canto.silabas = Ca-mio-neees-y-ca-ra-va-naaas
canto.fallo = ¡Desafinado! Otra vez
canto.segunda = ¡Otra vez, más fuerte!
canto.gana = ¡CAMIONEEES Y CARAVANAAAS!

// ---------------------------------------------------------------- título y fin del arranque

titulo.capitulo2 = Capítulo 2 · Lo que pasó dentro
c2.fin.continuara = ¿Continuará?
c2.fin.sub = Fin del capítulo 2, de momento
c2.fin.titulo = Hasta aquí, de momento
c2.fin.texto = Los cuatro han cazado al Ultimosaurio, se han ido de safari en la caravana de Guille y han llegado al desierto de Las Vegas, con La Penúltima brillando al fondo. Si hay más, ya se verá. Puede que sí. Puede que no.

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
pista.c2.maquina = La tragaperras está «fuera de servicio». Guille puede separarla de la pared; Chuchi entiende de máquinas.
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
FRAN: La porra de la cesta de Navidad. Yo llevo el 5. Vero me ha apuntado como «Patxi», en rojo y con un corazón. Mi nombre de humorista. Este año toca, lo noto.

## c2.mirar.porra.1
FRAN: La porra de la cesta de Navidad. Yo llevo el 5, con mi «Patxi» y mi corazón de Vero. Juraría que hace un momento estaba en otra casilla.
FRAN (nervioso): Será la caña. Las cañas no hacen eso. Creo.

## c2.mirar.porra.3
FRAN (sorprendido): ¡Todos los números son sietes! Ahora sí que toca seguro.

## c2.mirar.barra.4
GUILLE (nervioso): La barra brilla como una discoteca. Y juraría que las cañas se me acercan solas.

## c2.mirar.barra.5
CHUCHI (sorprendido): La barra cuelga del techo. Por lo menos las cañas ya no se derraman: se quedan quietas por orgullo.

## c2.mirar.estanteria.5
PABLO: Las botellas siguen en su sitio. Es el sitio el que ha cambiado de sitio.

## c2.mirar.porra.4
CHUCHI (sorprendido): Los sietes de la porra ahora brillan en colores. Hasta «Patxi» lleva un siete. Nada de esto es normal. Bueno, nada de esta noche.

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

## c2.guille.tragaperras.directo
GUILLE (contento): «Fuera de servicio»... Veamos qué hay detrás. He levantado cerdos de ciento cincuenta kilos: esto es una caja con luces.

## c2.guille.tragaperras
> Guille separa la máquina de la pared. Detrás, polvo, chapas, un mechero... y algo que brilla.
GUILLE (sorprendido): ¡Un duro! ¡Un duro de 1987!

## c2.chuchi.router
CHUCHI (chulo): Apartad. Esto es como el router: se desenchufa, se cuentan diez y se vuelve a enchufar. Y el enchufe está ahí, al fondo.

## c2.chuchi.enchufa
CHUCHI: Ya está desenchufada. Uno, dos... diez. Enchufada.

## c2.tragaperras.enciende
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
// El bar 4 es el bar de siempre con las luces de discoteca y las líneas torcidas; el bar 5, el Brío del revés.

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
FRAN (sorprendido): Un momento. ¿Por qué está todo tan brillante? Esto parece una discoteca.
@corte guille 2.2 6
GUILLE (nervioso): Lleva así un rato. No quise decir nada para no cortar el rollo.
CHUCHI (nervioso): Y las paredes se mueven. Yo me llevo agarrado a este taburete desde hace diez minutos.
@barrido vero 1.8 -1
VERO: Yo de eso no sé nada, mi amor. Yo solo pongo las cañas.

## c2.noche.maquina
@nivelar 400
@foco tragaperras
> En la esquina del fondo, algo hace «clic».
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
@zoom pablo+sombra 1.6 900
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

// ---------------------------------------------------------------- tramo final: de Chuchi al mundo de los conceptos
// Provisional (los revisa Jesús). Marcas nuevas de la cámara, además de las de más arriba:
//   @girar 2 6000        la imagen entera da 2 vueltas en 6 s y acaba derecha
//   @caos on / @caos off los cortes rapidísimos entre estilos (normal, manga, píxel de Alacant Sun, píxel del Pang, lápiz)
//   @caos dino           sube la silueta enorme del dinosaurio (con su rugido; el temblor lo pone @temblor)
//   @caos guille         Guille da un paso al frente con su jarra
// En el mundo de los conceptos los amigos son figuras: se les enfoca por el nombre de su figura (@zoom fran 2.2).

// ---- Chuchi se quiere ir (bar del revés) e Impropios Kart

## c2.chuchi.jefe
@nivelar 500
@corte chuchi 2.4 -4
> El móvil de Chuchi vibra encima de la barra. Una vez. Dos. Doce.
CHUCHI (nervioso): Es el jefe. A las tantas. Asunto: «Urgente (otra vez)».
CHUCHI: «Necesito el informe para ayer.» ¿Ayer no había pasado ya?
@general 400
CHUCHI (enfadado): Se acabó. Me voy. Me voy ya, de verdad. Las niñas, el informe, el sueño...
@manga chuchi:cara:seriedad fran:cara:enfado !gogogo
FRAN (enfadado): ¡UNA MÁS!
@manga fran:ojos:enfado chuchi:ojos:duda !don
FRAN (enfadado): ¡Una más, Chuchi! ¡Una sola! ¡Que el correo no se va a ir a ningún sitio!
CHUCHI (sorprendido): Fran, el correo es lo único que nunca se va a ningún sitio.
@manga fin

## c2.chuchi.maquina
@temblor 10 600
@foco tragaperras
@zoom tragaperras 1.7
> Al fondo, la tragaperras vuelve a dar vueltas. Nadie la ha tocado. Nadie lleva un duro encima, y menos uno de 1987.
GUILLE (nervioso): Ya está otra vez con lo suyo.

## c2.chuchi.cara
@general 400
@temblor 14 700
> Se para en la cara de Chuchi. Tres veces. Chuchi, Chuchi, Chuchi. Y se apaga con un suspiro.
CHUCHI (sorprendido): Ahora me persiguen hasta las tragaperras.
PABLO (chulo): Es una señal. Yo, que he leído mucho, te digo que es una señal.
FRAN (contento): ¡Es que quiere que te quedes!

## c2.chuchi.pista
@temblor 20 1400
@holandes 12 800
CHUCHI (nervioso): ¿Alguien más ve que las baldosas se están alargando?
GUILLE (nervioso): Todas hacia el mismo sitio. Como los cerdos cuando oyen el cubo.
> El suelo se estira hasta el horizonte y se pone a girar. En algún lugar, alguien cuenta: «tres, dos, uno...»

## c2.chuchi.vuelve
@nivelar 500
@general 500
> Chuchi vuelve a la barra con la copa en la mano y el aire de quien ha ganado algo en un sueño.
CHUCHI (contento): Hecho. Una carrera contra todos vosotros y yo, el primero. Ahora sí que me voy con la cabeza alta.
CHUCHI: Me tomo esta de despedida y desaparezco.
VERO: Toma, mi niño. Otra, que a esa ya le quedaba un dedo.
CHUCHI (sorprendido): ¡Pero si es que me iba! Vero, ¿de dónde sale esta copa?
VERO: De mi corazón, mi vida. Y de la botella, pero sobre todo de lo otro.
FRAN (contento): ¡Una más! ¡Lo sabía!

// ---- Vero se traga a Fran

## c2.vero.crece
@temblor 24 1400
@contrapicado 16 900
> Detrás de la barra, Vero empieza a crecer. Sin prisa. Como quien sube la persiana de su bar.
GUILLE (nervioso): Oye, ¿Vero siempre ha sido de este tamaño?
VERO: Es un buen tamaño, mi niño. Para lo que vengo a hacer.
@barrido fran 2
FRAN (nervioso): Vero, tu cabeza está pasando por encima de la lámpara.
@corte vero 2.2 -4
VERO: Fran, mi amor. Con la de veces que has pedido «una más»...
@manga vero:boca:picara fran:ojos:sorpresa !gogogo
VERO: Esta vez la quiero yo.

## c2.vero.traga
FRAN (sorprendido): ¿Eso es una boca? ¡Tiene luces del Brío dentro! ¡Y se oye la tele!
VERO: Anda, ven, mi amor, que no pasa nada. Aquí dentro se está calentito.

## c2.vero.salta
PABLO (sorprendido): ¡SE LO HA TRAGADO!
CHUCHI (nervioso): ¡Fran! ¡FRAN! ¡Escupe, Vero, que me debe dos cañas!
GUILLE (nervioso): ¡Yo salto! ¡Ningún mañico deja a un vasco atrás!
PABLO (chulo): Un héroe nunca deja a su camarera con una boca abierta. ¡Dentro!

## c2.vero.dentro
> Y al entrar, se deshicieron. Primero las esquinas, luego los contornos, y por último la idea que tenían de sí mismos.

// ---- El mundo de los conceptos

zona.c2.concepto.manana = Mañana
zona.c2.concepto.casa = Casa
zona.c2.concepto.penultima = La penúltima
zona.c2.concepto.trabajo = El trabajo
zona.c2.concepto.reloj = Las tantas
zona.c2.concepto.no = El no
zona.c2.concepto.fran = Una más
zona.c2.concepto.ultima = La última
zona.c2.concepto.pablo = Pablo
zona.c2.concepto.chuchi = Chuchi
zona.c2.concepto.guille = Guille
zona.c2.concepto.vero = Vero

// Las palabras que se pintan sobre los conceptos (lo que se lee en pantalla, en mayúsculas).
c2.concepto.manana = MAÑANA
c2.concepto.casa = CASA
c2.concepto.penultima = LA PENÚLTIMA
c2.concepto.trabajo = EL TRABAJO
c2.concepto.reloj = LAS TANTAS
c2.concepto.unamas = UNA MÁS
c2.concepto.ultima = LA ÚLTIMA
c2.concepto.dino = ???

objetivo.c2.conceptos.fran = Toca los conceptos y encuentra a Fran
objetivo.c2.conceptos.ultima = Para salir hace falta LA ÚLTIMA
pista.c2.conceptos.fran = Fran tiene que estar por aquí, hecho concepto. Toca lo que repita «una más».
pista.c2.conceptos.ultima = Todos juntos otra vez. Para salir, toca LA ÚLTIMA, la jarra que nadie ha visto.

## c2.conceptos.entrada
> Esto no es el Brío. Esto ni siquiera es un sitio. Es donde se quedan colgadas las palabras cuando se les acaba la frase.
PABLO (sorprendido): ¿Por qué soy una figurita de peana? Y, sobre todo, ¿por qué me favorece?
CHUCHI (nervioso): Soy un montón de formas sueltas con gafas. Estoy muy reconocible, pero por piezas.
GUILLE (contento): ¡Estoy hecho de triángulos y de flores! ¡Y soy el más alto! ¡Siempre quise ser el más alto!
CHUCHI (nervioso): Falta uno. ¿Dónde está Fran?
PABLO: Esto es un mundo de conceptos. Toquemos lo que veamos: alguien tendrá algo que decir.

## c2.conceptos.manana
CHUCHI (nervioso): MAÑANA. La puerta a la que llevo diez años empujando.
> La puerta tiembla, se estrecha un poco y vuelve a su sitio. No se abre. Nunca se abre.
GUILLE (contento): Es de las que se abren hacia dentro. Hacia dentro de mañana.
---
PABLO: Si la tocas dos veces es mañana dos veces. Es lo que hago yo con los ensayos.

## c2.conceptos.casa
PABLO: CASA. Cada paso que doy hacia ella, ella da dos hacia atrás.
CHUCHI (triste): Es lo mismo que me dicen las niñas por teléfono: «¿Papá, ya llegas?»
> La casita se aleja, se acerca y se vuelve a alejar. Por si acaso, con la luz de la ventana encendida.
---
GUILLE (triste): Yo nunca llego a tiempo a mi casa. Pero tengo la excusa de que mi casa está en Zaragoza.

## c2.conceptos.trabajo
CHUCHI (nervioso): EL TRABAJO. Con sus avisos y todo. Hasta aquí me ha seguido.
> El sobre vibra. Chuchi se encoge por reflejo, como un perro al oír un trueno.
PABLO (chulo): Estás hecho de piezas sueltas y aun así te llegan los correos.
---
CHUCHI (enfadado): No pienso abrirlo. No pienso abrir... Vale, lo abro un segundo.

## c2.conceptos.reloj
PABLO: Un reloj derretido. Dalí lo pintó pensando en una cena que se alargó.
GUILLE (sorprendido): Marca las tantas. Siempre las tantas.
CHUCHI: Es el único reloj puntual del universo: siempre llega justo a las tantas.
---
GUILLE (contento): Mola. Se parece a mis cerdos después de comer.

## c2.conceptos.no
> Un NO enorme rebota de un lado a otro y, cada vez que cae, el mundo tiembla un poquito.
CHUCHI: Ese es el que le digo a Fran cada jueves.
PABLO (chulo): Y rebota, rebota, rebota, hasta que se convierte en un «bueno, una más».
---
GUILLE (nervioso): Me da un poco de miedo. Parece un «no» de los de madre.

## c2.conceptos.penultima
GUILLE (contento): LA PENÚLTIMA. Una jarra que no se acaba. ¡Qué invento!
PABLO: Porque la penúltima nunca es la penúltima. Es la antepenúltima de la siguiente.
CHUCHI (nervioso): Eso lo sé yo muy bien. Me lo sé desde la universidad.
---
> La cerveza sale por arriba, da una vuelta por el aire y vuelve a entrar. El mundo funciona así.

## c2.conceptos.pista
PABLO (sorprendido): Un momento. ¿Habéis oído esa vocecita que no para de repetir «una más»?
CHUCHI (sorprendido): La figura redondita de la barba, con la jarra que nunca se vacía... Sí, la oigo desde hace un rato.
GUILLE (contento): ¡Si es que se le nota a la legua!

## c2.conceptos.fran
@zoom fran 2.2
FRAN (contento): ¡UNA MÁS!
PABLO (sorprendido): ¡Es Fran! ¡Se ha escondido detrás de nosotros, con su jarra!
FRAN (contento): ¡Una más! ¡Una más! ¡Una más!
CHUCHI: Fran, ¿puedes decir otra cosa?
FRAN (triste): Una... más...
GUILLE (contento): Está claro: ha llegado a su esencia.
@general 500

## c2.conceptos.revela
CHUCHI (nervioso): Vale. Ya estamos los cuatro. Pues nos vamos a casa.
PABLO: Aquí el problema es la puerta. Para salir hace falta LA ÚLTIMA. Y la última nunca la ha visto nadie.
> Y entonces, en mitad del mundo, como una idea que se va formando, aparece el contorno de una jarra. Solo el contorno.

## c2.conceptos.ultima
@zoom ultima 2.2 600
CHUCHI (sorprendido): LA ÚLTIMA. Existe.
PABLO: Dicen que quien la pide se va a su casa.
GUILLE (contento): Pues pídela tú, Chuchi, que eres el que se quería ir.
CHUCHI (nervioso): Vale... Una ronda más. La última. Pero de verdad.
FRAN (triste): Una... más...
@general 500
@temblor 30 1500
> En cuanto lo dijo en voz alta, el mundo de los conceptos se quedó sin palabras.

// Lo que dicen al tocar cada figura (por probar, o cuando ya se ha tocado casi todo).
## c2.figura.pablo
PABLO (chulo): Soy un puñado de piezas que flotan, con un aro que me cuelga de la oreja. Me define: doy vueltas a todo.
---
PABLO: Las piezas que giran son mi forma natural. El teatro, si lo piensas, es un bucle con público.

## c2.figura.chuchi
CHUCHI: Llevo la barriga hecha de triángulos. Por eso llego tarde: es que llego, pero todavía.
---
CHUCHI (nervioso): Estas gafas sí que me las reconozco. Lo demás lo estoy asimilando.

## c2.figura.guille
GUILLE (contento): ¡Soy un montón de flores con la camisa puesta! Lo de ser alto es genética.
---
GUILLE (contento): Tengo hojas con hibiscos. ¡He nacido para esto!

## c2.figura.fran
FRAN (contento): ¡Una más!
---
FRAN (triste): Una... más... (Es que no me sale otra cosa.)

## c2.figura.vero
VERO: Mi amor, estás dentro de mí. Haz el favor de no tocar las paredes.
---
VERO: Aquí dentro se está calentito, ¿oíste? Tú pide, que yo te lo pongo.
---
VERO (chulo): Soy una camarera de oro y seda que lo envuelve todo. Ya lo era antes, pero ahora se nota más.

// ---- El caos total

## c2.caos.empieza
@caos on
@girar 2 7000
@temblor 26 4000
> Y todo, a la vez, dejó de parecerse a lo que era.
PABLO (sorprendido): ¡Me veo en dibujitos! ¡Y otra vez normal! ¡Y en dibujitos!
CHUCHI (sorprendido): ¡Yo en píxeles! ¡Y a lápiz! ¡Y en la máquina del Pang!
GUILLE (contento): ¡Y yo en todos! ¡Es el día de la foto, muchachos!
VERO: Es que la última, mi niño, enseña todo lo que tiene.

## c2.caos.dino
@caos dino
@temblor 32 3600
> Y al fondo, muy al fondo, algo enorme se levantó.
CHUCHI (nervioso): ¿Eso es... un dinosaurio?
PABLO (sorprendido): Tiene un cartel encima. Pone «???».
GUILLE (nervioso): Es el userito. El mitológico. Lo conoce todo el mundo y no lo ha visto nadie.
FRAN (sorprendido): ¡Una más!

## c2.caos.guille
@caos off
@nivelar 500
@general 500
> Entonces Guille, hecho de formas y de flores, dio un paso al frente. Y en una de sus manos, una jarra.
@caos guille
GUILLE (chulo): Este es mío.

## c2.pokeusera.vuelve
@general 500
> Y, de una manera o de otra, el mitológico acabó dentro de la jarra de Guille.
GUILLE (contento): Doctor en ciencias animales, señores. Los herbívoros se me daban bien; los mitológicos, todavía mejor.
FRAN (sorprendido): ¡Guille, te has guardado la última en una jarra!
CHUCHI (nervioso): Pues no la sueltes, que como se levante otra vez...

// ---- Guille propone el safari (tras cazar al Ultimosaurio) y el cómic de la caravana (src/ui/safari.ts)

## c2.safari.propone
@general 500
GUILLE (contento): Oídme. Ahora que tengo a este pichoncito en la jarra... ¿y si nos vamos de safari?
CHUCHI (sorprendido): ¿De... safari?
GUILLE (contento): ¡Que soy guía titulado! Con mi curso oficial y todo: cuarenta horas, diploma y un chaleco con bolsillos.
PABLO (chulo): Un hombre que caza dinosaurios con una jarra. Qué menos que un diploma.
GUILLE: Tengo una caravana aparcada ahí fuera. Cabemos todos. Y el Ultimosaurio va en la jarra, que viaja de lujo.
FRAN (sorprendido): ¿Y hay caña en un safari?
GUILLE (contento): Hay un bar en cada charca, Fran. Los animales también salen de cañas.
CHUCHI (nervioso): Pero mañana trabajo...
FRAN (contento): ¡Una más y nos vamos!
> Y así, con una jarra, un diploma y una caravana, los cuatro se echaron a la carretera.

// Las páginas del cómic. Cada viñeta tiene su cartucha (el narrador), sus bocadillos (salen de la caravana: nadie se ve,
// solo ella habla) y sus onomatopeyas. Lo que dice cada uno: Chuchi se preocupa, Guille presume de curso, Pablo se
// emociona, Fran quiere caña. Los rótulos que salen en el dibujo (carteles, diploma) también están aquí.

safari.p1.a.cart = Madrid, M-30. Seis y media de la mañana.
safari.p1.a.b1 = Oye, pero... ¿seguro que es por aquí?
safari.p1.a.b2 = A ver, que no nos hemos equivocado.
safari.p1.b.cart = Tres horas después: los Monegros.
safari.p1.b.b1 = ¿Quién tiene el mapa?
safari.p1.b.b2 = Yo tengo el curso.
safari.p1.c.b2 = Mejor. Así no discutimos.

safari.p2.a.cart = Tres días después... África.
safari.p2.a.b1 = ¡Jirafas! ¡Mirad qué cuellos!
safari.p2.a.b2 = Guille... eso era un elefante.
safari.p2.a.b3 = Silencio, que se asustan.
safari.p2.a.b4 = ¡Perdón! Era para saludar.
safari.p2.b.cart = Mientras tanto, en la ventana...
safari.p2.b.b1 = Ahí lo pone: guía titulado.
safari.p2.b.b2 = Está pegado con cinta aislante.
safari.p2.b.b3 = Con muy buena cinta.

safari.p3.a.cart = Océano Atlántico. Más o menos.
safari.p3.a.b1 = ¿Esto flota?
safari.p3.a.b2 = Todo flota si se lo pides con cariño.
safari.p3.a.b3 = ¿Se come?
safari.p3.a.b4 = Mañana trabajo...
safari.p3.b.cart = Kilómetro 4.000
safari.p3.b.b1 = ¿Cuánto falta?
safari.p3.b.b2 = Ya casi, ya casi.

safari.p4.a.cart = Rocas rojas. Utah o Arizona.
safari.p4.a.b1 = Una más y nos vamos.
safari.p4.a.b2 = Eso dijiste en Zaragoza.
safari.p4.a.b3 = Tranquilos: era un cactus joven.
safari.p4.b.cart = Nevada. Atardecer.
safari.p4.b.b1 = ¿Eso es Las Vegas?
safari.p4.b.b2 = Sí. Y nosotros, en el desierto.
safari.p4.b.b3 = ¿Ese cartel pone «La Penúltima»?
safari.p4.b.b4 = Chicos... esto no venía en el curso.

// Las onomatopeyas (dibujadas con trazos; aquí solo la palabra).
safari.ono.brum = ¡BRUM!
safari.ono.fiu = ¡FIUUU!
safari.ono.piii = ¡PIIIII!
safari.ono.prru = ¡PRRRUUU!
safari.ono.plaf = ¡PLAF!
safari.ono.crac = ¡CRAC!
safari.ono.frena = ¡CHIRRRR!

// Rótulos dentro de los dibujos.
safari.cartel.a2 = A-2
safari.cartel.zaragoza = Zaragoza
safari.cartel.km = KM 4000
safari.cartel.penultima = La Penúltima
safari.cartel.vegas = Las Vegas
safari.diploma.arriba = Diploma
safari.diploma.titulo = Guía de safari
safari.diploma.nombre = Guille
safari.diploma.pie = Curso oficial · Aprobado

// ---------------------------------------------------------------- manga (onomatopeyas en castellano; las japonesas son dibujo)
manga.ono.zas = ¡ZAS!
