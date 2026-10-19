# PokéUsera · Edición Jarra · combate

<!--
CÓMO EDITAR ESTE ARCHIVO
Mensajes del combate y descripciones de useritos y movimientos. Mismo formato que capitulo1.md:

  clave = texto                un texto suelto
  {quien}, {mov}...            el juego lo cambia por el nombre del userito, del movimiento...

La letra es de píxeles y la pantalla es estrecha (unos 40 caracteres por línea): textos cortos.
-->

// ---- tipos
tipo.mindundi = Mindundi
tipo.petardo = Petardo
tipo.droga = Droga
tipo.bronca = Bronca
tipo.ventolera = Ventolera
tipo.chispa = Chispa
tipo.alcohol = Alcohol
tipo.juerga = Juerga
tipo.chanza = Chanza
tipo.grasa = Grasa
tipo.fantasma = Fantasma

tipo.abrev.mindundi = MIN
tipo.abrev.petardo = PET
tipo.abrev.droga = DRO
tipo.abrev.bronca = BRO
tipo.abrev.ventolera = VEN
tipo.abrev.chispa = CHI
tipo.abrev.alcohol = ALC
tipo.abrev.juerga = JUE
tipo.abrev.chanza = CHA
tipo.abrev.grasa = GRA
tipo.abrev.fantasma = FAN

// ---- guía del combate: cartel de la acción, eficacia y ficha del userito
cartel.todos = TODOS
cartel.el_mismo = ÉL MISMO
cartel.mult = ×{n}
cartel.ef.mas = MUY EFICAZ ×{n}
cartel.ef.menos = POCO EFICAZ ×{n}
cartel.ef.nada = NO LE AFECTA
cartel.ef.corto_nada = NO AFECTA
cartel.ayuda = ?
ficha.sin_dano = SIN DAÑO
ficha.toca_userito = Toca a un userito para ver su ficha.
ficha.contra = TUS MOVIMIENTOS CONTRA ÉL
ficha.stats = ESTADÍSTICAS BASE
ficha.estado = ESTADO
ficha.objeto = OBJETO
ficha.sin_estado = Sin estado.
ficha.recien = Recién despierto: no se duerme.
ficha.niveles = CAMBIOS
ficha.toca = Toca un estado o una estadística para ver qué significa.
ficha.cerrar = CERRAR
ficha.cae = Fuera de combate.
ficha.stat.ps = PS
ficha.stat.ata = ATA
ficha.stat.def = DEF
ficha.stat.esp = ESP
ficha.stat.vel = VEL
ficha.stat.prec = PRE
ficha.prec_ayuda = PRE (Precisión): la probabilidad de acertar el golpe.

// ---- mensajes del combate
combate.usa = ¡{quien} usó {mov}!
combate.muy_eficaz = ¡Muy eficaz contra {quien}!
combate.poco_eficaz = Poco eficaz contra {quien}...
combate.no_afecta = No afecta a {quien}...
combate.critico = ¡Golpe crítico!
combate.falla = ¡Pero falló!
combate.esquiva = ¡{quien} esquiva el golpe!
combate.sin_efecto = Pero no le hizo nada a {quien}.
combate.sin_pp = ¡{quien} no tiene más movimientos!
combate.acorralado = ¡Entre todos acorralan a {quien}!
combate.venganza = ¡Venganza contra {quien}!
combate.cancion_doble = ¡Todos a coro! ¡Doble de fuerza!
combate.copia = ¡{quien} copia {mov}!
combate.cizana_desvia = ¡La cizaña manda el golpe de {quien} a otro lado!
combate.desvia = ¡{quien} va tan achispado que se equivoca de rival!
combate.veces = ¡Le dio {n} veces!
combate.drena = ¡{quien} chupa fuerzas del rival!
combate.rebote = ¡{quien} se resiente del golpe!
combate.cae = ¡{quien} cae redondo!
combate.sale = ¡{jugador} saca a {quien}!
combate.retira = ¡Vuelve, {quien}!
combate.cana = {jugador} se pide una caña para {quien}. ¡Salud!
combate.remolino = ¡{quien} sale volando!
combate.retrocede = ¡{quien} se achanta y pierde el turno!
combate.recarga = ¡{quien} está recargando pilas!
combate.esconde = ¡{quien} se esconde tras la barra!
combate.esconde_falla = ¡{quien} ya no cuela otra vez!
combate.esconde_protege = ¡No se ve a {quien} por ningún lado!
combate.proteccion_falla = ¡A {quien} no le sale otra vez!
combate.quepague = ¡{quien} pone cara de «yo no he sido»!
combate.quepague_desvia = ¡{otro} se escaquea! El golpe de {quien} se lo come otro.
combate.aguantar = ¡{quien} se pone firme: de aquí no se mueve!
combate.aguanta = ¡{quien} aguanta el tipo con un hilo de vida!
combate.despierta = ¡{quien} se despierta!
combate.dormido_sigue = {quien} ronca a pierna suelta.
combate.despierta_banco = ¡{quien} de {jugador} se ha despertado en el banquillo!
combate.recien = ¡{quien} tiene los ojos como platos! Ahora no se duerme.
combate.paralizado_no = ¡{quien} está paralizado! No se mueve.
combate.quemado_dano = ¡La quemadura le duele a {quien}!
combate.empachado_dano = ¡{quien} sufre un empacho!
combate.achispado_golpe = ¡{quien} va tan achispado que se pega solo!
combate.sobrio = A {quien} se le pasó la chispa.
combate.atrapa = ¡{quien} no puede irse de la barra!
combate.atrapado_dano = ¡{quien} sufre pegado a la barra!
combate.suelta = ¡{quien} se escapa de la barra!
combate.bostezo = ¡{quien} empieza a bostezar!
combate.cizana = ¡{quien} está lleno de cizaña!
combate.siesta = ¡{quien} se echa una siesta y se recupera!
combate.tendedero_vuelve = ¡{quien} vuelve al tendedero a secarse!
combate.ficha = ¡{quien} echa otra ficha y se recupera!
combate.limon = ¡{quien} se echa un chorrito de limón!
combate.improvisa = ¡{quien} improvisa {mov}!
combate.serenata = ¡{quien} se queda embobado con la serenata de {otro}!
combate.embobado_desvia = ¡Embobado con {otro}, {quien} ataca a otro lado!
combate.morrina = ¡A {quien} le entra la morriña!
combate.premio0 = ¡Tres limones! Sin premio.
combate.premio40 = ¡Salen unas monedas!
combate.premio80 = ¡Premio! ¡Lluvia de monedas!
combate.premio150 = ¡¡¡PREMIO GORDO!!! ¡Jackpot!
combate.tope_sube = ¡{quien} no puede subir más!
combate.tope_baja = ¡{quien} no puede bajar más!
combate.cierre = Vero empieza a recoger. ¡Hora de cerrar!
combate.cierre_sigue = Vero sigue apilando sillas.
combate.cierre_mas = ¡Vero apila sillas a toda prisa!
combate.grada_cana = ¡{jugador} invita a {quien} a una caña desde la grada!
combate.grada_abucheo = ¡{jugador} abuchea a {quien} desde la grada!
combate.eliminado = ¡{jugador} se queda sin useritos! Puesto {puesto}.
combate.fin = ¡{jugador} gana la batalla!
combate.estado.dormido = ¡{quien} se queda roque!
combate.estado.paralizado = ¡{quien} queda paralizado!
combate.estado.quemado = ¡{quien} se ha quemado!
combate.estado.empachado = ¡{quien} se ha empachado!
combate.estado.achispado = ¡{quien} va achispado!

// ---- subidas y bajadas de estadística
combate.sube1.ata = ¡El ataque de {quien} sube!
combate.sube2.ata = ¡El ataque de {quien} sube mucho!
combate.baja1.ata = ¡El ataque de {quien} baja!
combate.baja2.ata = ¡El ataque de {quien} baja mucho!
combate.sube1.def = ¡La defensa de {quien} sube!
combate.sube2.def = ¡La defensa de {quien} sube mucho!
combate.baja1.def = ¡La defensa de {quien} baja!
combate.baja2.def = ¡La defensa de {quien} baja mucho!
combate.sube1.vel = ¡La velocidad de {quien} sube!
combate.sube2.vel = ¡La velocidad de {quien} sube mucho!
combate.baja1.vel = ¡La velocidad de {quien} baja!
combate.baja2.vel = ¡La velocidad de {quien} baja mucho!
combate.sube1.esp = ¡El especial de {quien} sube!
combate.sube2.esp = ¡El especial de {quien} sube mucho!
combate.baja1.esp = ¡El especial de {quien} baja!
combate.baja2.esp = ¡El especial de {quien} baja mucho!
combate.sube1.prec = ¡La precisión de {quien} sube!
combate.sube2.prec = ¡La precisión de {quien} sube mucho!
combate.baja1.prec = ¡La precisión de {quien} baja!
combate.baja2.prec = ¡La precisión de {quien} baja mucho!

// ---- useritos: una línea graciosa
userito.draguserin.desc = El dragón del parque de Usera. Escupe petardos.
userito.goudazard.desc = Palito frito de gouda rebozado. Crujiente y peligroso.
userito.aceituna.desc = Perrita negra de Fran, que la llama «su novia». Muy dulce.
userito.cierzon.desc = Remolino mañico que no para quieto.
userito.turroncho.desc = Turrón blando con almendras. Duro por dentro.
userito.tocinon.desc = Cerdo tranquilo de 152 kilos. No corre, aplasta.
userito.roscochoco.desc = Dulce navideño de chocolate. Muy indigesto.
userito.espumarro.desc = Jarra de cerveza con espuma que nunca baja.
userito.cajonazo.desc = Cajón flamenco con brazos y mucho compás.
userito.lentejasur.desc = Lenteja sucia que sale cuando menos toca.
userito.tragaperras.desc = La máquina del rincón. Se ríe de ti.
userito.turito.desc = Aburre y cansa. Ya te lo está contando.
userito.resacon.desc = Nube gris de la mañana siguiente.
userito.evoscar.desc = Pareja aburrida con cuerpo de caballo. Discuten por todo.
userito.chupitochu.desc = Chupito muy fuerte y ardiente. Cuidado.
userito.caravaner.desc = Una caravana. Lenta, pero nadie la para.
userito.camioner.desc = Un camión. Cuando llega, llega.
userito.criaturitah.desc = Criaturita del bosque. Qué monada.
userito.ego-ego.desc = Fantasma muy flipado. Se cree el mejor.
userito.kbronero.desc = Teclado heavy. Solo y distorsión.
userito.cubatillo.desc = Cubata con hielos y pajita. Burbujea y se sube a la cabeza.
userito.p.desc = Una P gordita con patitas. Muy pesada, y no por la letra.
userito.jesuspelo.desc = Surfero de pelo blanco. Todo fluye, colega. Sin prisa.
userito.pantaloneto.desc = Unos pantalones escapados del tendedero. Van solos.
userito.maletrio.desc = Tres maletas apiladas. El equipaje perdido de Impropios Airlines.
userito.teloneon.desc = Telón rojo con careta, que improvisa. Lo bueno pasa detrás.
userito.choquechu.desc = Coche de choque de feria, con la pértiga echando chispas.
userito.torrezmon.desc = Un torrezno grasiento y crujiente, con su limón.
userito.papiroflexeon.desc = Avión de papel turquesa. Rápido, y corta como un papel.
userito.ceceseta.desc = La camiseta de Camiones y Caravanas. La fan número uno.
userito.mariachi.desc = Sombrero, bigote y trompeta. Llega a tu fiesta sin avisar y no se va hasta que cantes con él.
userito.pulpino.desc = Pulpo gallego con una mala leche de campeonato. Si le tocas, se enfada. Si no le tocas, también, pero menos.
userito.cilantrox.desc = Un tallo de cilantro con tres hojas. O te encanta o lo odias, y viene a montar una fiesta pagana.
userito.fotomaton.desc = El fotomatón de la calle, con su cortinilla. Te mete dentro, te hace cuatro fotos y te saca peor que en el DNI.
userito.cloudtrio.desc = Tres nubes blanditas, carísimas y muy polémicas. Nadie sabe por qué se compraron.
userito.cigarr.desc = Un cigarro de liar. Se enciende rápido, se lía solo y deja humo por todas partes.
userito.ollalocah.desc = La olla loca de la feria. Da vueltas hasta que se te revuelve todo lo que has comido.

// ---- movimientos: efecto corto para el menú
mov.barrigazo.desc = Golpe fuerte. Puede paralizar.
mov.trompazo.desc = Pega muy fuerte, pero tú también te haces daño: pierdes 1/4 de lo que le quitas al rival.
mov.galope.desc = Embestida sencilla.
mov.lametazo.desc = Lametazo. Puede paralizar.
mov.chapa.desc = Pega. Puede bajar la Velocidad.
mov.pillo.desc = Atrapa al rival 2-5 turnos: no puede cambiar y pierde 1/16 de PS cada turno.
mov.bocinazo.desc = Baja el Ataque de los rivales.
mov.turra.desc = Baja Ataque y Especial a todos.
mov.bostezo.desc = Duerme al rival el turno siguiente, salvo que acabe de despertar.
mov.cara_de_pena.desc = Baja mucho el Ataque del rival.
mov.esconderse.desc = Nadie te toca este turno.
mov.siesta.desc = Duerme 2 turnos. Cura la mitad de los PS.
mov.pantalones.desc = Sube mucho el Ataque y algo la Velocidad.
mov.traca.desc = Pega a todos. Puede quemar.
mov.fogonazo.desc = Pega. Puede quemar.
mov.petardazo.desc = Pega fuerte. Puede quemar.
mov.raices.desc = Pega y recupera la mitad.
mov.almendrazo.desc = Golpe sólido con almendras.
mov.lluvia.desc = Pega de 2 a 5 veces.
mov.esporas.desc = Duerme al rival, salvo que acabe de despertar.
mov.setas.desc = Pega. Puede achispar: no preguntes de qué eran.
mov.temblor.desc = Pega a todos. No afecta a Ventolera.
mov.adoquin.desc = Golpe pesado.
mov.caparazon.desc = Sube la Defensa.
mov.cierzo.desc = Pega a todos. Baja su Velocidad.
mov.tendedero.desc = Pega y se va al tendedero: vuelve al banquillo y eliges quién entra.
mov.planeo.desc = Golpe de viento.
mov.tubo.desc = Pega duro. Sube tu Velocidad.
mov.remolino.desc = Obliga al rival a cambiar.
mov.chispazo.desc = Pega. Puede paralizar.
mov.burbujeo.desc = Pega a todos. Puede paralizar.
mov.distorsion.desc = Pega a todos. Puede achispar.
mov.solo.desc = Pega muy fuerte. El turno siguiente no haces nada.
mov.premio.desc = Pega 0, 40, 80 o 150. ¡Suerte!
mov.chupitazo.desc = Pega. Puede achispar.
mov.ronda.desc = Pega a todos. Puede achispar.
mov.garrafon.desc = Pega fuerte. Puede achispar.
mov.unamas.desc = Los rivales no pueden cambiar y bajan 1 su Velocidad.
mov.dolor.desc = Achispa al rival.
mov.rumba.desc = Pega de 2 a 5 veces.
mov.remate.desc = Cuanta menos vida te queda, más pega: de 20 a 200. ¡Olé!
mov.taconeo.desc = Pega. Puede hacerle perder el turno (si aún no ha actuado).
mov.conga.desc = Pega a todos.
mov.pogo.desc = Pega a todos. Pueden perder el turno (si aún no han actuado).
mov.coz.desc = Pega dos veces.
mov.chuleria.desc = Golpe sin trucos.
mov.compas.desc = Sube mucho el Ataque.
mov.cancion.desc = Pega a todos. Doble tras cantarla.
mov.zasca.desc = Zasca fuerte, muy fuerte.
mov.vacile.desc = Pega. Puede bajar el Especial.
mov.pesao.desc = Pega y baja la Velocidad del rival.
mov.dosvoces.desc = Pega a todos.
mov.monada.desc = Baja el Ataque de los rivales.
mov.cizana.desc = Sus ataques van a un rival al azar.
mov.siy.desc = Copia el último movimiento usado.
mov.fritanga.desc = Pega. Puede quemar.
mov.goudamadre.desc = Pega fuerte. Puede quemar.
mov.pringue.desc = Pega a todos. Puede bajar Vel.
mov.tropezon.desc = Pega. Puede empachar.
mov.indigestion.desc = Empacha al rival.
mov.rebozado.desc = Sube mucho la Defensa.
mov.susto.desc = Ataca el primero.
mov.eco.desc = Pega dos veces.
mov.venganza.desc = Doble contra quien te pegó.
mov.flipada.desc = Sube Ata, Esp y Vel. Baja Def.
mov.selfie.desc = Baja la precisión de los rivales.
mov.desesperada.desc = Sin PP. Tú también te haces daño: pierdes 1/4 de lo que le quitas al rival.
mov.mecuelo.desc = Se cuela en la barra y pega el primero.
mov.rebufo.desc = Una racha de aire que llega antes que nadie.
mov.colleja.desc = Colleja a traición. Pega el primero.
mov.quepague.desc = Va el primero. Los golpes a ti se desvían a otro. Los de «todos», no.
mov.aguantar.desc = Va el primero. Este turno ningún golpe te deja con menos de 1 PS.
mov.devolver.desc = Va el último. Devuelve 1,5 veces el daño que te hicieron a quien te pegó el último.
mov.maletazo.desc = Le cae la maleta de arriba. Puede bajar la Defensa.
mov.embarque.desc = Pega el primero.
mov.cinturones.desc = Sube el Ataque y la Defensa.
mov.improvisa.desc = Usa un movimiento al azar de todo el juego. Sin ensayar.
mov.monologo.desc = Pega a todos con un monólogo que nadie pidió. Puede bajar el Especial.
mov.carambola.desc = Choca con todos. Puede bajar su Velocidad.
mov.ficha.desc = Cura la mitad de los PS y quita los estados. El turno siguiente no haces nada.
mov.crujiente.desc = Pega de 2 a 5 veces: cada mordisco cruje.
mov.limon.desc = Quita los estados y sube el Especial.
mov.cortepapel.desc = Pega con el triple de probabilidad de crítico.
mov.papiroflexia.desc = Sube el Ataque y la Velocidad.
mov.pasodoble.desc = Pega. Puede subir tu Velocidad.
mov.mancha.desc = Le pone perdida la camiseta. Puede bajar su Precisión.
mov.ayayay.desc = Un grito de mariachi que pega a todos. Puede hacerles perder el turno (si aún no han actuado).
mov.serenata.desc = Dos turnos embobado: si ataca a Mariachi con un ataque a uno, el golpe va a otro rival.
mov.picante.desc = Una salsa que pica. Puede quemar.
mov.ochotortas.desc = Una tirada de precisión y, si acierta, pega 8 veces: una por tentáculo.
mov.tinta.desc = Tinta en los ojos. Siempre baja 1 la Precisión.
mov.morrina.desc = Le entra la morriña. Baja 1 el Ataque y 1 la Velocidad.
mov.fiestapagana.desc = Una fiesta salvaje que pega a todos. Puede bajar 1 la Defensa.
mov.todosdentro.desc = Los mete a todos en la cabina y los aprieta. Puede bajar 1 la Velocidad.
mov.flash.desc = Un fogonazo en la cara. Puede bajar 1 la Precisión.
mov.nubarron.desc = Una nube les tapa el sol y les pega a todos.
mov.carisimo.desc = Les cobra una barbaridad. Puede bajar 1 el Especial.
mov.calada.desc = Una calada y un soplo de humo. Puede quemar.
mov.vueltas.desc = Gira que gira hasta marear. Puede hacerle perder el turno (si aún no ha actuado).

// ---- habilidades (motor/combate.ts, evento «habilidad»). Por cada una: .nombre = el rótulo sobre el userito y la ficha ·
//      .desc = lo que hace · .activa = la frase al activarse (si la tiene; {quien} = el que la tiene, {otro} = el otro userito)
hab.titulo = HABILIDAD

hab.fuego_dragon.nombre = Fuego de dragón
hab.fuego_dragon.desc = Sus ataques de Petardo queman el doble de veces.

hab.gratinado.nombre = Gratinado
hab.gratinado.desc = No se puede quemar.
hab.gratinado.activa = ¡{quien} está gratinado y no se quema!

hab.buena_chica.nombre = Buena chica
hab.buena_chica.desc = Quien le pega con un ataque a uno tiene un 30 % de bajar 1 su Ataque: nadie puede con esa carita.
hab.buena_chica.activa = ¡Con esa carita, a {otro} se le quitan las ganas de pegar!

hab.manico.nombre = Mañico
hab.manico.desc = Cada vez que un rival le baja una estadística, sube 2 su Ataque.

hab.duro_de_roer.nombre = Duro de roer
hab.duro_de_roer.desc = Los golpes críticos le hacen ×1,5 en vez de ×2.
hab.duro_de_roer.activa = ¡{quien} es duro de roer: el crítico le hace menos!

hab.kilos.nombre = 152 kilos
hab.kilos.desc = No le mueven: Remolino y perder el turno por un golpe no le afectan.
hab.kilos.activa = ¡{quien} pesa 152 kilos y no se mueve!

hab.indigesto.nombre = Indigesto
hab.indigesto.desc = Quien le pega con un ataque físico a uno solo tiene un 30 % de empacharse.
hab.indigesto.activa = ¡{otro} se empacha al pegar a {quien}!

hab.espuma.nombre = La espuma no baja
hab.espuma.desc = Los rivales no le pueden bajar las estadísticas.
hab.espuma.activa = ¡La espuma de {quien} no baja!

hab.cajon.nombre = Duro como un cajón
hab.cajon.desc = Con todos sus PS, ningún golpe le tumba: se queda a 1 PS.
hab.cajon.activa = ¡{quien} aguanta de pie, duro como un cajón!

hab.inesperado.nombre = Cuando menos te lo esperas
hab.inesperado.desc = Al salir al combate, su primer ataque es rápido (+1).
hab.inesperado.activa = ¡{quien} aparece cuando menos te lo esperas!

hab.bote.nombre = Bote acumulado
hab.bote.desc = Hace el doble de golpes críticos.

hab.conazo.nombre = Coñazo
hab.conazo.desc = Al salir al combate, todos los rivales bajan 1 su Ataque.
hab.conazo.activa = ¡{quien} suelta un coñazo y a los rivales se les quitan las ganas!

hab.curado.nombre = Ya estoy curado
hab.curado.desc = No se puede achispar.
hab.curado.activa = ¡{quien} ya está curado: no se achispa!

hab.dos_cabezas.nombre = Dos cabezas
hab.dos_cabezas.desc = No se puede dormir: siempre hay una cabeza despierta.
hab.dos_cabezas.activa = ¡Una cabeza de {quien} siempre está despierta!

hab.ardiente.nombre = Ardiente
hab.ardiente.desc = Quien le pega con un ataque físico a uno solo tiene un 30 % de quemarse.
hab.ardiente.activa = ¡{otro} se quema al tocar a {quien}!

hab.pareja.nombre = Pareja de carretera
hab.pareja.desc = Si su pareja (Camioner o Caravaner) está en combate, sea de quien sea, sus ataques pegan un 20 % más.

hab.fotosintesis.nombre = Alucinógeno
hab.fotosintesis.desc = Cura 1/16 de sus PS al final de cada turno.
hab.fotosintesis.cura = ¡{quien} está en otro mundo y se recupera!

hab.flipado.nombre = Flipado
hab.flipado.desc = Cada vez que tumba a un userito, sube 1 su Ataque.

hab.volumen.nombre = A todo volumen
hab.volumen.desc = Sus ataques a todos pegan al 100 %, no al 75 %.

hab.hielo.nombre = Con hielo
hab.hielo.desc = Los ataques de Petardo le hacen la mitad.

hab.pesadisimo.nombre = Pesadísimo
hab.pesadisimo.desc = Quien le pega con un ataque físico a uno solo baja 1 su Velocidad.
hab.pesadisimo.activa = ¡{otro} se cansa de pegar a {quien}!

hab.ola.nombre = Buena ola
hab.ola.desc = Los ataques de Ventolera no le hacen daño y le suben 1 la Velocidad.
hab.ola.activa = ¡{quien} surfea la ola: no le hace nada!

hab.lavado.nombre = Recién lavado
hab.lavado.desc = Al volver al banquillo se le quitan los estados y cura 1/8. Le va bien con Al tendedero.
hab.lavado.activa = ¡{quien} se da una ducha antes de irse al banquillo!

hab.maleta.nombre = Maleta cabreada
hab.maleta.desc = La primera vez que baja de la mitad de los PS, sube 2 su Ataque.
hab.maleta.activa = ¡La maleta de {quien} se ha cabreado!

hab.publico.nombre = Público entregado
hab.publico.desc = Cuando un rival falla un ataque, sube 1 su Especial (una vez por turno y hasta +2).

hab.corriente.nombre = Toma de corriente
hab.corriente.desc = Los ataques de Chispa no le hacen daño y le suben 1 el Especial: va enchufado a la red de la pista.
hab.corriente.activa = ¡{quien} se enchufa a la corriente!

hab.grasiento.nombre = Grasiento
hab.grasiento.desc = Sus ataques de Grasa empachan un 10 % de las veces.

hab.viento.nombre = A favor del viento
hab.viento.desc = Al salir al combate, sube 1 su Velocidad.

hab.fan.nombre = Fan de la gira
hab.fan.desc = Si Camioner o Caravaner están en combate, sea de quien sea, sus ataques pegan un 20 % más.

hab.cantaynollores.nombre = Canta y no llores
hab.cantaynollores.desc = Con menos de un tercio de sus PS, sus ataques de Juerga pegan un 50 % más.

hab.malaleche.nombre = Mala leche
hab.malaleche.desc = Cada vez que le pegan con un ataque, sube 1 su Ataque (una vez por turno como mucho, hasta +6).
hab.malaleche.activa = ¡{quien} se pone de mala leche!

hab.jabon.nombre = Sabor a jabón
hab.jabon.desc = Quien le pega con un ataque a uno solo tiene un 30 % de bajar 1 su Especial.
hab.jabon.activa = ¡{otro} se queda con sabor a jabón por pegar a {quien}!

hab.tira.nombre = Tira de cuatro
hab.tira.desc = Tras acertar un ataque a todos, sube 1 su Defensa (hasta +2).
hab.tira.activa = ¡{quien} saca la tira de fotos y se pone duro!

hab.blandito.nombre = Caro y blandito
hab.blandito.desc = Los ataques físicos a uno solo le hacen un 20 % menos.

hab.humo.nombre = Humo en la cara
hab.humo.desc = Quien le pega con un ataque físico a uno solo tiene un 30 % de bajar 1 su Precisión.
hab.humo.activa = ¡{quien} echa humo y {otro} no ve nada!

hab.feria.nombre = Vueltas de feria
hab.feria.desc = Al salir al combate, todos los rivales bajan 1 su Velocidad.
hab.feria.activa = ¡{quien} da vueltas y a los rivales se les revuelve todo!

// ---- ventajas de entrenador (motor/combate.ts: Chuchi «Llega tarde», Guille «Mañico», Ari «De su cosecha», Fer «Cancelación de ruido»)
combate.perk.chuchi = {quien} llegaba tarde: el golpe le pilla a medias.
combate.perk.guille = ¡{quien} aguanta como un buen mañico!
combate.perk.ari = ¡{quien} improvisa y el golpe sale mejor de lo previsto!
combate.perk.fer = {quien} lleva los cascos puestos: el ruido le llega más flojo.
combate.perk.fer_nada = {quien} lleva los cascos puestos: esta vez el ruido no le llega.

// ---- un movimiento a todos los rivales: una sola línea para todos los que lo sufren ({quienes}: «A, B y C»)
combate.todos.y = y
combate.todos.estado.dormido = ¡{quienes} se quedan roques!
combate.todos.estado.paralizado = ¡{quienes} quedan paralizados!
combate.todos.estado.quemado = ¡{quienes} se han quemado!
combate.todos.estado.empachado = ¡{quienes} se han empachado!
combate.todos.estado.achispado = ¡{quienes} van achispados!
combate.todos.sube1.ata = ¡El ataque de {quienes} sube!
combate.todos.sube2.ata = ¡El ataque de {quienes} sube mucho!
combate.todos.baja1.ata = ¡El ataque de {quienes} baja!
combate.todos.baja2.ata = ¡El ataque de {quienes} baja mucho!
combate.todos.sube1.def = ¡La defensa de {quienes} sube!
combate.todos.sube2.def = ¡La defensa de {quienes} sube mucho!
combate.todos.baja1.def = ¡La defensa de {quienes} baja!
combate.todos.baja2.def = ¡La defensa de {quienes} baja mucho!
combate.todos.sube1.vel = ¡La velocidad de {quienes} sube!
combate.todos.sube2.vel = ¡La velocidad de {quienes} sube mucho!
combate.todos.baja1.vel = ¡La velocidad de {quienes} baja!
combate.todos.baja2.vel = ¡La velocidad de {quienes} baja mucho!
combate.todos.sube1.esp = ¡El especial de {quienes} sube!
combate.todos.sube2.esp = ¡El especial de {quienes} sube mucho!
combate.todos.baja1.esp = ¡El especial de {quienes} baja!
combate.todos.baja2.esp = ¡El especial de {quienes} baja mucho!
combate.todos.sube1.prec = ¡La precisión de {quienes} sube!
combate.todos.sube2.prec = ¡La precisión de {quienes} sube mucho!
combate.todos.baja1.prec = ¡La precisión de {quienes} baja!
combate.todos.baja2.prec = ¡La precisión de {quienes} baja mucho!

// ---- sucesos del bar (turnos 5, 10, 15, 20 y 25; motor/combate.ts: iniciarSuceso). Por cada uno:
//      .nombre = el cartel y la chapita · .frase = lo que se dice al salir · .desc = lo que explica al tocar la chapita
suceso.titulo = SUCESO EN EL BAR
suceso.titulo.feria = SUCESO EN LA FERIA
suceso.al_momento = AL MOMENTO
suceso.dura1 = ESTE TURNO
suceso.dura = {n} TURNOS
suceso.resta1 = Dura este turno.
suceso.resta = Dura {n} turnos más.
suceso.nada = Pero esta vez no cambia nada.
suceso.cerrar = CERRAR

suceso.ronda.nombre = ¡Ronda gratis!
suceso.ronda.frase = Invita la casa: ¡ronda para todos! Cada userito en combate recupera 1/8 de su vida.
suceso.ronda.desc = Todos los useritos en combate curan 1/8 de sus PS.

suceso.luz.nombre = Se va la luz
suceso.luz.frase = ¡Se va la luz! Durante 2 turnos todos fallan más, menos los de Fantasma, que ven en la oscuridad y aciertan más.
suceso.luz.desc = Todos tienen 10 puntos menos de precisión, menos los de tipo Fantasma, que tienen 10 más.

suceso.happy.nombre = Happy hour
suceso.happy.frase = ¡Happy hour! Dos por uno: durante 2 turnos el Alcohol pega un 50 % más y achispa el doble de veces.
suceso.happy.desc = Los ataques de Alcohol pegan un 50 % más y achispan el doble de veces.

suceso.cumple.nombre = ¡Tapa gratis!
suceso.cumple.frase = ¡Tapa gratis para {quien}, que va peor! Cura 1/4 de su vida y sube 1 su Ataque.
suceso.cumple.desc = Al userito con menos vida le ponen una tapa gratis: cura 1/4 de sus PS y sube 1 su Ataque.

suceso.pelea.nombre = A por el flipao
suceso.pelea.frase = ¡A por el flipao! Todos a por {jugador}, que va ganando: este turno todos le pegan enteros, sin perder fuerza.
suceso.pelea.desc = Contra el jugador con más vida en total no cuenta el Acorralado: todos le pegan entero.

suceso.karaoke.nombre = Dale al karaoke
suceso.karaoke.frase = ¡Alguien le da al karaoke! Se canta a coro y se pega a coro: este turno los ataques a todos pegan enteros.
suceso.karaoke.desc = Los ataques a todos pegan al 100 % en vez de al 75 %.

suceso.barre.nombre = Vero recoge
suceso.barre.frase = Vero recoge todo con la escoba: ¡fuera las subidas y bajadas de estadísticas de todos!
suceso.barre.desc = Se borran todas las subidas y bajadas de estadísticas de todos los useritos.

suceso.premio.nombre = ¡Premio gordo!
suceso.premio.frase = ¡La tragaperras escupe monedas! Esto sí que es suerte: quien ya gastó la caña la recupera; si nadie, curan todos.
suceso.premio.desc = A un jugador al azar le devuelven la caña, si ya la había gastado. Si nadie la gastó, todos curan 1/8.
suceso.premio.cana = ¡{jugador} se lleva otra caña de premio! Ya puede volver a usarla.
suceso.premio.cura = Nadie ha gastado la caña: ¡las monedas son para todos! Todos recuperan 1/8 de su vida.

suceso.cierzo.nombre = Corre el viento
suceso.cierzo.frase = ¡Corre el viento! Vuelan las servilletas: durante 2 turnos todos bajan 1 su Velocidad y Ventolera pega un 50 % más.
suceso.cierzo.desc = Todos bajan 1 su Velocidad y los de tipo Ventolera pegan un 50 % más.

suceso.rosas.nombre = Pasa el de las rosas
suceso.rosas.frase = Pasa el de las rosas y le deja una a {quien}, pero hay que pagarla: sube 2 su Especial y pierde el 10 % de su vida actual.
suceso.rosas.desc = Un userito al azar recibe una rosa: sube 2 su Especial, pero la paga con el 10 % de su vida actual.

suceso.desfile.nombre = Desfile Drag
suceso.desfile.frase = ¡Desfile Drag! Que suene la música y salga la reina: durante 2 turnos Juerga y Chanza pegan un 50 % más.
suceso.desfile.desc = Los ataques de Juerga y de Chanza pegan un 50 % más.

suceso.peluca.nombre = Biberón de Jagger
suceso.peluca.frase = ¡Biberón de Jagger! Con tanto biberón no se apunta bien: todos bajan 1 su Precisión, menos los de Juerga.
suceso.peluca.desc = Todos bajan 1 su Precisión, menos los de tipo Juerga, que ya van de biberón todos los días.

suceso.comanda.nombre = ¡Comanda!
suceso.comanda.frase = ¡Marchando una comanda! Raciones para los más marchosos: los de Juerga y Chanza en combate recuperan 1/8 de su vida.
suceso.comanda.desc = Los useritos de Juerga y de Chanza que están en combate curan 1/8 de sus PS.

suceso.chinchin.nombre = Clin clin clin
suceso.chinchin.frase = ¡Clin, clin, clin! Juan invita a los que van peor: 2 turnos, los 2 jugadores con menos vida curan 1/8 al acabar cada turno.
suceso.chinchin.desc = Los 2 jugadores con menos vida en total curan 1/8 a su userito al final de cada turno.
suceso.chinchin.cura = ¡{quien} brinda y se anima!

suceso.choque.nombre = ¡Coches de choque!
suceso.choque.frase = ¡Coches de choque! Todos se estampan con todos y pierden 1/10 de sus PS, menos los de Chispa y Petardo, que ya tienen el carné.
suceso.choque.desc = Todos los useritos en combate chocan entre sí y pierden 1/10 de sus PS máximos, aunque sin llegar a tumbarlos. Los de tipo Chispa y Petardo no, porque van conduciendo.

suceso.pista.nombre = Saltan chispas
suceso.pista.frase = ¡Saltan chispas! Chispa pega un 50 % más y quien no es de Chispa pierde 1 de Velocidad al ser golpeado.
suceso.pista.desc = Los ataques de tipo Chispa pegan un 50 % más y todos los useritos que no son de tipo Chispa bajan 1 su Velocidad cada vez que reciben un ataque.

// ---- objetos de la barra (motor/combate.ts, pantallas/barra.ts, guía y ficha)
objeto.unico = UN USO
objeto.perm = PERMANENTE
objeto.gastado = GASTADO

objeto.mechero.nombre = Mechero
objeto.mechero.desc = El primer rival que le pegue con un ataque tiene un 50 % de quemarse.
objeto.mechero.activa = ¡El mechero de {quien} prende a {otro}!
objeto.mechero.falla = ¡El mechero de {quien} hace chispas, pero {otro} se libra!

objeto.chicle.nombre = Chicle de menta
objeto.chicle.desc = La primera vez que le dejan dormido, paralizado, quemado, empachado o achispado, se le quita al momento.
objeto.chicle.activa = ¡El chicle de menta despeja a {quien}!

objeto.bocata.nombre = Bocata de calamares
objeto.bocata.desc = Cuando baja de la mitad de los PS, se lo come y cura 1/5.
objeto.bocata.activa = ¡{quien} se zampa el bocata de calamares!

objeto.posavasos.nombre = Posavasos
objeto.posavasos.desc = El primer golpe muy eficaz (×2 o más) le hace la mitad.
objeto.posavasos.activa = ¡El posavasos amortigua el golpe a {quien}!

objeto.tapon.nombre = Tapón de cava
objeto.tapon.desc = Sus dos primeros ataques son rápidos (+1 de prioridad).
objeto.tapon.activa = ¡{quien} descorcha el tapón de cava y sale disparado!
objeto.tapon.activa2 = ¡Otro corchazo! {quien} vuelve a salir disparado.

objeto.palillo.nombre = Palillo en la boca
objeto.palillo.desc = Hace el doble de golpes críticos.
objeto.palillo.activa = ¡El palillo en la boca le da puntería a {quien}!

objeto.gafas.nombre = Gafas de sol
objeto.gafas.desc = Sus ataques tienen +10 de precisión.
objeto.gafas.activa = ¡Con las gafas de sol, {quien} apunta mejor!

objeto.zapatillas.nombre = Zapatillas nuevas
objeto.zapatillas.desc = Cada vez que sale al combate, sube 1 su Velocidad. La primera vez, también 1 su Ataque.
objeto.zapatillas.activa = ¡Las zapatillas nuevas aceleran a {quien}!

objeto.panuelo.nombre = Pañuelo de la peña
objeto.panuelo.desc = Sus ataques de su mismo tipo pegan un 20 % más.
objeto.panuelo.activa = ¡El pañuelo de la peña da moral a {quien}!

objeto.llavero.nombre = Llavero de la caravana
objeto.llavero.desc = Si cae, quien lo tumbó baja 1 su Ataque y 1 su Especial.
objeto.llavero.activa = ¡El llavero de {quien} se venga de {otro}!

// ---- AVENTURA (modo a un jugador): la jarra para cazar useritos salvajes
caza.lanza = ¡{jugador} lanza una jarra vacía a {quien}!
caza.tambalea = La jarra se tambalea... una... dos...
caza.atrapado = ¡Atrapado! {quien} se mete en la jarra.
caza.escapa = ¡Oh, no! {quien} se escapa de la jarra.

// ---- por qué un tipo le gana a otro (una frase por pareja ×2 o ×0; salen bajo «¡Muy eficaz!» las primeras veces y en la Guía)
tipo.logica.petardo.droga = Un petardo en el cenicero y adiós a la hierba.
tipo.logica.petardo.alcohol = El alcohol es inflamable: el petardo lo hace arder.
tipo.logica.droga.bronca = Un buen colocón y se le quitan las ganas de pelea.
tipo.logica.droga.grasa = Con tanta grasa, la droja entra mejor.
tipo.logica.bronca.petardo = A guantazos se apaga cualquier petardo.
tipo.logica.bronca.chispa = Un buen golpe desconecta la chispa.
tipo.logica.ventolera.petardo = El viento apaga la mecha.
tipo.logica.ventolera.juerga = El viento se lleva la fiesta (y las pelucas).
tipo.logica.ventolera.grasa = El viento barre la grasa de la barra.
tipo.logica.chispa.ventolera = El rayo cruza el aire como si nada.
tipo.logica.chispa.alcohol = Una chispa y el alcohol salta por los aires.
tipo.logica.alcohol.grasa = El alcohol desengrasa.
tipo.logica.alcohol.droga = Mezclar con alcohol: el colocón se vuelve cuelgue.
tipo.logica.juerga.mindundi = Una buena juerga saca al más mindundi de su rincón.
tipo.logica.juerga.bronca = Con música y copas nadie quiere pelea.
tipo.logica.chanza.juerga = Una burla a tiempo y se acaba la fiesta.
tipo.logica.chanza.fantasma = De los fantasmas se ríe hasta el que más miedo tiene.
tipo.logica.grasa.alcohol = La grasa absorbe el alcohol.
tipo.logica.grasa.juerga = Un charco de aceite y toda la juerga por los suelos.
tipo.logica.fantasma.chanza = El fantasma da más susto que risa.
tipo.logica.fantasma.fantasma = Los fantasmas se asustan entre ellos.
tipo.logica.fantasma.chispa = Se va la luz: el fantasma apaga la chispa.
tipo.logica.mindundi.fantasma = A un fantasma no se le puede tocar.
tipo.logica.bronca.ventolera = No se le puede pegar al viento.
tipo.logica.chispa.bronca = Los de Bronca llevan guantes de goma: la chispa no pasa.
tipo.logica.fantasma.mindundi = El mindundi ni lo ve: no se asusta.
