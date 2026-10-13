# PokéUsera · Edición Jarra · combate

<!--
CÓMO EDITAR ESTE ARCHIVO
Mensajes del combate y descripciones de useritos y movimientos. Mismo formato que capitulo1.md:

  clave = texto                un texto suelto
  {quien}, {mov}...            el juego lo cambia por el nombre del userito, del movimiento...

La letra es de píxeles y la pantalla es estrecha (unos 40 caracteres por línea): textos cortos.
-->

// ---- tipos
tipo.normal = Normal
tipo.fuego = Fuego
tipo.planta = Planta
tipo.tierra = Tierra
tipo.aire = Aire
tipo.rayo = Rayo
tipo.alcohol = Alcohol
tipo.juerga = Juerga
tipo.chanza = Chanza
tipo.grasa = Grasa
tipo.fantasma = Fantasma

tipo.abrev.normal = NOR
tipo.abrev.fuego = FUE
tipo.abrev.planta = PLA
tipo.abrev.tierra = TIE
tipo.abrev.aire = AIR
tipo.abrev.rayo = RAY
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
userito.aceitun.desc = Perrita negra con forma de aceituna. Ni una gota.
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
userito.evoscar.desc = Dos cabezas, cuerpo de caballo. Sí, y...
userito.chupitochu.desc = Chupito muy fuerte y ardiente. Cuidado.
userito.caravaner.desc = Una caravana. Lenta, pero nadie la para.
userito.camioner.desc = Un camión. Cuando llega, llega.
userito.criaturitah.desc = Criaturita del bosque. Qué monada.
userito.ego-ego.desc = Fantasma muy flipado. Se cree el mejor.
userito.kbronero.desc = Teclado heavy. Solo y distorsión.

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
mov.traca.desc = Pega a todos. Puede quemar.
mov.fogonazo.desc = Pega. Puede quemar.
mov.petardazo.desc = Pega fuerte. Puede quemar.
mov.raices.desc = Pega y recupera la mitad.
mov.almendrazo.desc = Golpe sólido con almendras.
mov.lluvia.desc = Pega de 2 a 5 veces.
mov.esporas.desc = Duerme al rival.
mov.temblor.desc = Pega a todos. No afecta a Aire.
mov.adoquin.desc = Golpe pesado.
mov.caparazon.desc = Sube mucho la Defensa.
mov.cierzo.desc = Pega a todos. Baja su Velocidad.
mov.planeo.desc = Golpe de viento.
mov.remolino.desc = Obliga al rival a cambiar.
mov.chispazo.desc = Pega. Puede paralizar.
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
mov.dosvoces.desc = Pega a todos.
mov.monada.desc = Baja el Ataque de los rivales.
mov.cizana.desc = Sus ataques van a un rival al azar.
mov.siy.desc = Copia el último movimiento usado.
mov.fritanga.desc = Pega. Puede quemar.
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

// ---- ventajas de entrenador (motor/combate.ts: Chuchi «Llega tarde», Guille «Mañico»)
combate.perk.chuchi = {quien} llegaba tarde: el golpe le pilla a medias.
combate.perk.guille = ¡{quien} aguanta como un buen mañico!
