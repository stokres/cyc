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

// ---- movimientos: efecto corto para el menú
mov.barrigazo.desc = Golpe fuerte. Puede paralizar.
mov.trompazo.desc = Brutal. Te hieres con el golpe.
mov.galope.desc = Embestida sencilla.
mov.lametazo.desc = Lametazo. Puede paralizar.
mov.chapa.desc = Pega. Puede bajar la Velocidad.
mov.pillo.desc = Atrapa 2-5 turnos. No puede huir.
mov.bocinazo.desc = Baja el Ataque de los rivales.
mov.turra.desc = Baja Ataque y Especial a todos.
mov.bostezo.desc = Duerme al rival el turno siguiente.
mov.cara_de_pena.desc = Baja mucho el Ataque del rival.
mov.esconderse.desc = Nadie te toca este turno.
mov.siesta.desc = Duerme 2 turnos. Cura todo.
mov.pantalones.desc = Sube mucho Ata y Vel. Baja mucho Def.
mov.traca.desc = Pega a todos. Puede quemar.
mov.fogonazo.desc = Pega. Puede quemar.
mov.petardazo.desc = Pega fuerte. Puede quemar.
mov.raices.desc = Pega y recupera la mitad.
mov.almendrazo.desc = Golpe sólido con almendras.
mov.lluvia.desc = Pega de 2 a 5 veces.
mov.esporas.desc = Duerme al rival.
mov.setas.desc = Pega. Puede achispar: no preguntes de qué eran.
mov.temblor.desc = Pega a todos. No afecta a Ventolera.
mov.adoquin.desc = Golpe pesado.
mov.caparazon.desc = Sube la Defensa.
mov.cierzo.desc = Pega a todos. Baja su Velocidad.
mov.planeo.desc = Golpe de viento.
mov.tubo.desc = Pega. Sube tu Velocidad.
mov.remolino.desc = Obliga al rival a cambiar.
mov.chispazo.desc = Pega. Puede paralizar.
mov.burbujeo.desc = Pega a todos. Puede paralizar.
mov.distorsion.desc = Pega a todos. Puede achispar.
mov.solo.desc = Brutal. Luego toca recargar.
mov.premio.desc = Pega 0, 40, 80 o 150. ¡Suerte!
mov.chupitazo.desc = Pega. Puede achispar.
mov.ronda.desc = Pega a todos. Puede achispar.
mov.garrafon.desc = Pega fuerte. Puede achispar.
mov.unamas.desc = Nadie cambia. Baja su Velocidad.
mov.dolor.desc = Achispa al rival.
mov.rumba.desc = Pega de 2 a 5 veces.
mov.taconeo.desc = Pega. Puede hacerle retroceder.
mov.conga.desc = Pega a todos.
mov.pogo.desc = Pega a todos. Pueden retroceder.
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
mov.desesperada.desc = Sin PP. Te hieres un poco.
mov.mecuelo.desc = Se cuela en la barra y pega el primero.
mov.rebufo.desc = Una racha de aire que llega antes que nadie.
mov.colleja.desc = Colleja a traición. Pega el primero.
mov.quepague.desc = Va el primero. Los golpes a ti se desvían a otro. Los de «todos», no.
mov.aguantar.desc = Va el primero. Este turno ningún golpe te deja con menos de 1 PS.
mov.devolver.desc = Va el último. Devuelve 1,5 veces el daño que te hicieron a quien te pegó el último.

// ---- ventajas de entrenador (motor/combate.ts: Chuchi «Llega tarde», Guille «Mañico»)
combate.perk.chuchi = {quien} llegaba tarde: el golpe le pilla a medias.
combate.perk.guille = ¡{quien} aguanta como un buen mañico!

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
suceso.al_momento = AL MOMENTO
suceso.dura1 = ESTE TURNO
suceso.dura = {n} TURNOS
suceso.resta1 = Dura este turno.
suceso.resta = Dura {n} turnos más.
suceso.cerrar = CERRAR

suceso.ronda.nombre = ¡Ronda gratis!
suceso.ronda.frase = Invita la casa: ¡ronda para todos! Todos recuperan fuerzas.
suceso.ronda.desc = Todos los useritos en combate curan 1/8 de sus PS.

suceso.luz.nombre = Se va la luz
suceso.luz.frase = ¡Se va la luz! Ahora nadie ve nada, salvo los fantasmas.
suceso.luz.desc = Todos fallan más (20 puntos menos de precisión), menos los de tipo Fantasma, que se mueven a oscuras.

suceso.happy.nombre = Happy hour
suceso.happy.frase = ¡Happy hour! Dos por uno y todo el mundo achispado.
suceso.happy.desc = Los ataques de Alcohol pegan un 50 % más y achispan el doble de veces.

suceso.cumple.nombre = ¡Es su cumple!
suceso.cumple.frase = ¡Es el cumple de {quien}! Le sacan una tarta con una vela.
suceso.cumple.desc = Al userito con menos vida le sacan una tarta: cura 1/4 de sus PS y sube 1 su Ataque.

suceso.pelea.nombre = Pelea en la barra
suceso.pelea.frase = ¡Pelea en la barra! Todos a por {jugador}, que va ganando.
suceso.pelea.desc = Contra el jugador con más vida en total no cuenta el Acorralado: todos le pegan entero.

suceso.karaoke.nombre = Dale al karaoke
suceso.karaoke.frase = ¡Alguien le da al karaoke! Se canta a coro y se pega a coro.
suceso.karaoke.desc = Los ataques a todos pegan al 100 % en vez de al 75 %.

suceso.barre.nombre = Vero barre
suceso.barre.frase = Vero pasa la escoba y barre todo: ¡fuera subidas y bajadas!
suceso.barre.desc = Se borran todas las subidas y bajadas de estadísticas de todos los useritos.

suceso.premio.nombre = Premio de la tragaperras
suceso.premio.frase = ¡La tragaperras escupe monedas! Esto sí que es suerte.
suceso.premio.desc = A un jugador al azar le devuelven la caña, si ya la había gastado. Si nadie la gastó, todos curan 1/8.
suceso.premio.cana = ¡{jugador} se lleva otra caña de premio!
suceso.premio.cura = Nadie ha gastado la caña: ¡las monedas son para todos!

suceso.cierzo.nombre = Cierzo de golpe
suceso.cierzo.frase = ¡Cierzo de golpe! Vuelan las servilletas y las ganas de correr.
suceso.cierzo.desc = Todos bajan 1 su Velocidad y los de tipo Ventolera pegan un 50 % más.

suceso.rosas.nombre = Pasa el de las rosas
suceso.rosas.frase = Pasa el de las rosas y le deja una a {quien}. Qué detalle.
suceso.rosas.desc = Un userito al azar recibe una rosa y sube 1 su Especial.

suceso.desfile.nombre = Desfile Drag
suceso.desfile.frase = ¡Desfile Drag! Que suene la música y salga la reina.
suceso.desfile.desc = Los ataques de Juerga y de Chanza pegan un 50 % más.

suceso.peluca.nombre = Peluca descolocada
suceso.peluca.frase = ¡Peluca descolocada! Con el flequillo en los ojos no se apunta bien.
suceso.peluca.desc = Todos bajan 1 su Precisión, menos los de tipo Juerga, que van de peluca todos los días.

suceso.comanda.nombre = ¡Comanda!
suceso.comanda.frase = ¡Marchando una comanda! Raciones para los más marchosos.
suceso.comanda.desc = Los useritos de Juerga y de Chanza que están en combate curan 1/8 de sus PS.

suceso.chinchin.nombre = Chin chin
suceso.chinchin.frase = ¡Chin chin! Juan invita a los que van peor.
suceso.chinchin.desc = Los 2 jugadores con menos vida en total curan 1/8 a su userito al final de cada turno.
suceso.chinchin.cura = ¡{quien} brinda y se anima!

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
objeto.bocata.desc = Cuando baja de la mitad de los PS, se lo come y cura 1/4.
objeto.bocata.activa = ¡{quien} se zampa el bocata de calamares!

objeto.posavasos.nombre = Posavasos
objeto.posavasos.desc = El primer golpe muy eficaz (×2 o más) le hace la mitad.
objeto.posavasos.activa = ¡El posavasos amortigua el golpe a {quien}!

objeto.tapon.nombre = Tapón de cava
objeto.tapon.desc = Su primer ataque es rápido (+1 de prioridad).
objeto.tapon.activa = ¡{quien} descorcha el tapón de cava y sale disparado!

objeto.palillo.nombre = Palillo en la boca
objeto.palillo.desc = Hace el doble de golpes críticos.
objeto.palillo.activa = ¡El palillo en la boca le da puntería a {quien}!

objeto.gafas.nombre = Gafas de sol
objeto.gafas.desc = Sus ataques tienen +10 de precisión.
objeto.gafas.activa = ¡Con las gafas de sol, {quien} apunta mejor!

objeto.zapatillas.nombre = Zapatillas nuevas
objeto.zapatillas.desc = Cada vez que sale al combate, sube 1 su Velocidad.
objeto.zapatillas.activa = ¡Las zapatillas nuevas aceleran a {quien}!

objeto.panuelo.nombre = Pañuelo de la peña
objeto.panuelo.desc = Sus ataques de su mismo tipo pegan un 20 % más.
objeto.panuelo.activa = ¡El pañuelo de la peña da moral a {quien}!

objeto.llavero.nombre = Llavero de la caravana
objeto.llavero.desc = Si cae, quien lo tumbó baja 1 su Ataque y 1 su Especial.
objeto.llavero.activa = ¡El llavero de {quien} se venga de {otro}!
