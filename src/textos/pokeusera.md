# PokéUsera · Edición Jarra · interfaz

<!--
CÓMO EDITAR ESTE ARCHIVO
Todo lo que se lee en los menús de PokéUsera está aquí. Mismo formato que capitulo1.md:

  clave = texto                un texto suelto
  {n}                          el juego lo cambia por un valor

La letra es de píxeles y la pantalla es estrecha (unos 40 caracteres por línea; en las cajas de menú, algo menos): textos cortos.
Los mensajes del combate y las descripciones de useritos y movimientos están en pokeusera-combate.md.
-->

// ---- título y menú
titulo = POKéUSERA
titulo.sub = EDICIÓN JARRA
titulo.toca = TOCA PARA EMPEZAR
titulo.credito = PARA FRAN - PABLO - CHUCHI - GUILLE

menu.solo = JUGAR SOLO
menu.online = JUGAR ONLINE
menu.ajustes = AJUSTES
menu.guia = GUÍA
menu.useritopedia = USERITOPEDIA

// ---- online (contraseña y sala)
online.titulo = JUGAR ONLINE
online.clave = CONTRASEÑA
online.entrar = ENTRAR
online.volver = VOLVER
online.conectando = Conectando...
online.error.clave = Contraseña incorrecta.
online.error.llena = La sala está llena.
online.error.enpartida = Ya hay una partida en marcha.
online.error.red = No hay conexión con la sala.
online.cerrada = Se ha cerrado la sala.
online.salio = {nombre} se ha ido. Sigue la máquina.

sala.titulo = SALA
sala.anfitrion = ANFITRIÓN
sala.tu = TÚ
sala.libre = LIBRE
sala.eligiendo = ELIGIENDO
sala.elige = ELIGE TU ENTRENADOR
sala.tuyo = TUYO
sala.ocupado = OCUPADO
sala.rellenar = RELLENAR CON MÁQUINA
sala.si = SÍ
sala.no = NO
sala.empezar = EMPEZAR
sala.salir = SALIR
sala.esperando = Esperando al anfitrión...
sala.pista.elige = Elige tu entrenador.
sala.pista.faltan = Faltan jugadores.
sala.pista.listo = Todo listo.

// ---- ajustes y pausa
ajustes.titulo = AJUSTES
ajustes.musica = MÚSICA
ajustes.efectos = EFECTOS
ajustes.velocidad = VELOCIDAD DEL COMBATE
ajustes.escenario = ESCENARIO
ajustes.volver = VOLVER

velocidad.lenta = LENTA
velocidad.normal = NORMAL
velocidad.rapida = RÁPIDA

escenario.azar = AL AZAR
escenario.brio = BAR DEL BRÍO
escenario.terraza = LA TERRAZA
escenario.rural = CASA RURAL DRAG QUEEN
escenario.juan = BAR DONDE JUAN

pausa.titulo = PAUSA
pausa.abandonar = ABANDONAR
pausa.seguir = SEGUIR
pausa.seguro = ¿Seguro?
pausa.si = SÍ
pausa.no = NO

// ---- entrenadores
entrenador.fran = Fran
entrenador.pablo = Pablo
entrenador.chuchi = Chuchi
entrenador.guille = Guille
entrenador.titulo = ¿QUIÉN ERES?
entrenador.volver = VOLVER

// ventajas de entrenador (una por cada uno; el motor las aplica, ver docs/POKEUSERA.md)
entrenador.fran.perk = ¡Otra caña!
entrenador.fran.perk_d = Su caña cura el 60 % de los PS, no la mitad.
entrenador.pablo.perk = Labia
entrenador.pablo.perk_d = Sus movimientos de estado fallan menos: +10 de precisión.
entrenador.chuchi.perk = Llega tarde
entrenador.chuchi.perk_d = El primer golpe que recibe cada userito le hace un 20 % menos.
entrenador.guille.perk = Mañico
entrenador.guille.perk_d = Una vez por userito, aguanta con 1 PS un golpe mortal a vida llena.
entrenador.elegir = ELEGIR

// ---- draft
draft.titulo = DRAFT
draft.tuturno = ¡Tu turno!
draft.elige = Elige {nombre}
draft.elegir = ELEGIR
draft.movinfo = {nombre} (PP {pp}): {desc}
draft.apelear = ¡A pelear!

// ---- la barra (pantallas/barra.ts): tras el draft, un objeto para uno de tus useritos
barra.titulo = LA BARRA
barra.pista1 = Elige un objeto de los tres.
barra.pista2 = ¿Quién se lo lleva?
barra.secreto = Los rivales no verán qué llevas hasta que funcione.
barra.elegir = ELEGIR
barra.cambiar = OTRO OBJETO
barra.espera = ¡Listo! Esperando a los demás...
barra.lleva = Se lo lleva {nombre}.
barra.apelear = ¡A pelear!

// ---- ¿quién sale primero? (pantallas/salida.ts): tras la barra, cada uno elige en secreto qué userito abre el combate
salida.titulo = ¿QUIÉN SALE PRIMERO?
salida.pista = Toca uno. Otro toque lo confirma.
salida.sale = Sale {nombre}.
salida.salir = SALIR
salida.secreto = Nadie lo ve hasta que empiece el combate.
salida.espera = ¡Listo! Esperando a los demás...
salida.movs = MOVS
salida.sinobjeto = Sin objeto

// ---- combate
batalla.inicio = ¡Empieza la batalla a cuatro!
batalla.espera = Esperando a los demás...
batalla.tiempo = ¡Se acabó el tiempo!
batalla.turno = TURNO {n}
batalla.volver = VOLVER
batalla.historial = HISTORIAL
batalla.orden = ORDEN DEL TURNO
batalla.tag.muy = ¡MUY EFICAZ!
batalla.tag.poco = POCO EFICAZ
batalla.tag.critico = ¡CRÍTICO!
batalla.tag.noafecta = NO AFECTA
batalla.tag.escondido = ESCONDIDO
batalla.tag.falla = FALLA
batalla.tag.esquiva = ESQUIVA
batalla.tag.acorralado = 1/2
batalla.tag.estado.dormido = DORMIDO
batalla.tag.estado.paralizado = PARALIZADO
batalla.tag.estado.quemado = QUEMADO
batalla.tag.estado.empachado = EMPACHADO
batalla.tag.estado.achispado = ACHISPADO
batalla.nivel = N50
batalla.que_hara = ¿Qué hará {quien}?
batalla.luchar = LUCHAR
batalla.userito = USERITOS
batalla.cana = CAÑA
batalla.objetivo = ¿A quién?
batalla.objetivo2 = Toca a un rival.
batalla.equipo = ¿A quién sacas?
batalla.quien_sale = ¿Quién sale?
batalla.en_combate = ACTIVO
batalla.grada = Miras desde la grada. ¿Qué haces?
batalla.grada_cana = INVITAR A CAÑA
batalla.grada_abucheo = ABUCHEAR
batalla.grada_nada = NADA

estado.dormido = DOR
estado.paralizado = PAR
estado.quemado = QUE
estado.empachado = EMP
estado.achispado = ACH

// ---- podio
podio.gana = ¡{nombre} gana!
podio.otra = OTRA
podio.menu = MENÚ
podio.stats = ESTADÍSTICAS
podio.turnos = {n} TURNOS
podio.mvp = MVP: {nombre} con {n} de daño
podio.sin_mvp = Nadie le pegó a nadie.

// ---- estadísticas (frases cortas: caben unos 40 caracteres por línea)
stats.volver = VOLVER
stats.nada = Sin datos.
stats.tab.resumen = RESUMEN
stats.tab.userit = USERITOS
stats.tab.duelos = DUELOS
stats.tab.premios = PREMIOS
stats.m.dh = DAÑO HECHO
stats.m.dr = DAÑO RECIBIDO
stats.m.cu = CURADO
stats.m.ko = DERRIBOS
stats.m.cae = USERITOS CAÍDOS
stats.m.gol = GOLPES DADOS
stats.m.fal = FALLOS
stats.m.cri = CRÍTICOS
stats.m.sup = MUY EFICACES
stats.m.esq = ESQUIVAS
stats.u.hecho = HECHO
stats.u.recibido = RECIB.
stats.u.derribos = KOS
stats.u.turnos = TURNOS
stats.u.curado = CURADO
stats.u.golpes = GOLPES
stats.u.fav = FAVORITO: {mov} X{n}
stats.u.sin = NO LLEGÓ A ATACAR
stats.u.max = MEJOR GOLPE: {n} CON {mov}
stats.u.caido = K.O.
stats.duelos.ayuda = LA FILA PEGA A LA COLUMNA
stats.duelos.nemesis = NÉMESIS
stats.duelos.victima = VÍCTIMA FAVORITA
stats.duelos.ko = {n} KO
stats.duelos.nadie = -

// ---- premios: nombre y una línea de broma
premio.mvp.n = MVP
premio.mvp.d = Pega como una mula de Usera
premio.saco.n = SACO DE BOXEO
premio.saco.d = Se comió todos los palos
premio.matagigantes.n = MATAGIGANTES
premio.matagigantes.d = Más useritos al suelo
premio.cana.n = REY DE LA CAÑA
premio.cana.d = Se curó con espuma
premio.gafe.n = GAFE
premio.gafe.d = Falla más que una feria
premio.francotirador.n = FRANCOTIRADOR
premio.francotirador.d = Más golpes críticos
premio.cambia.n = EL VELETA
premio.cambia.d = Cambia cada dos por tres
premio.superviviente.n = SUPERVIVIENTE
premio.superviviente.d = Su userito no se rindió
premio.rencoroso.n = RENCOROSO
premio.rencoroso.d = Daño de Venganza. Lo apunta todo

// ---- ayuda (la usan la GUÍA, la ficha de estado del combate y la del draft)
ayuda.estado.dormido = Dormido: no hace nada durante 1 a 3 turnos. El sueño también pasa en el banquillo: puede despertarse allí.
ayuda.estado.paralizado = Paralizado: 1 de cada 4 turnos no actúa y su Velocidad baja a la cuarta parte.
ayuda.estado.quemado = Quemado: pierde 1/16 de sus PS cada turno y su Ataque baja a la mitad.
ayuda.estado.empachado = Empachado: pierde 1/8 de sus PS cada turno hasta que se cure o caiga.
ayuda.estado.achispado = Achispado: de 2 a 4 turnos. Al atacar, 1 de cada 3 veces se pega a sí mismo y 1 de cada 3 le da a otro rival al azar.
ayuda.stat.ps = PS: su vida. Si llega a 0, cae y sale el siguiente de tu equipo.
ayuda.stat.ata = ATA (Ataque): fuerza de los golpes de tipo Mindundi, Bronca, Ventolera, Juerga y Fantasma.
ayuda.stat.def = DEF (Defensa): aguanta mejor esos mismos golpes.
ayuda.stat.esp = ESP (Especial): fuerza y aguante con Petardo, Droga, Chispa, Alcohol, Chanza y Grasa.
ayuda.stat.vel = VEL (Velocidad): el más rápido ataca antes en cada turno.
ayuda.tipos = Cada userito tiene uno o dos tipos, y cada movimiento, uno. Un golpe de tipo fuerte contra el rival hace el doble; uno flojo, la mitad; y algunos no le afectan. Si el movimiento es de su mismo tipo, pega 1,5 veces más.

// ---- guía (menú, pausa y draft: pantallas/guia.ts)
guia.volver = VOLVER
guia.tab.como = JUEGO
guia.tab.stats = DATOS
guia.tab.tipos = TIPOS
guia.tab.estados = ESTADOS
guia.tab.reglas = BAR
guia.tab.objetos = OBJETOS
guia.h.como = CÓMO SE JUEGA
guia.h.stats = ESTADÍSTICAS
guia.h.tipos = TABLA DE TIPOS
guia.h.estados = ESTADOS
guia.h.reglas = REGLAS DEL BAR
guia.h.objetos = OBJETOS DE LA BARRA
guia.h.perks = VENTAJAS DE ENTRENADOR
guia.h.sucesos = SUCESOS DEL BAR

guia.como.1.t = EL DRAFT
guia.como.1.d = Antes de pelear os turnáis para elegir useritos, sin repetir (1-2-3-4, 4-3-2-1, 1-2-3-4). Cada uno se lleva tres. Tienes 20 segundos por elección.
guia.como.2.t = LA BARRA
guia.como.2.d = Con los equipos hechos, la barra te ofrece 3 objetos al azar: eliges uno y a cuál de tus useritos se lo das. Tienes 20 segundos. Los rivales no ven qué llevas hasta que funciona. Después eliges, en secreto y en 15 segundos, cuál de tus tres useritos sale primero.
guia.como.3.t = TODOS A LA VEZ
guia.como.3.d = Cada turno los cuatro elegís a la vez y en secreto: atacar (un movimiento y, si es a un rival, a quién), cambiar de userito o usar la caña (una vez por batalla). Tienes 30 segundos; si no eliges, tu userito pega con un movimiento al azar a un rival al azar.
guia.como.4.t = EL MÁS RÁPIDO, PRIMERO
guia.como.4.d = Primero van los cambios y la caña, y luego los ataques por prioridad (mira la pestaña BAR) y, dentro de cada una, de más a menos Velocidad. Si hay empate, a suertes.
guia.como.5.t = EL ÚLTIMO EN PIE
guia.como.5.d = Cuando cae tu userito sale el siguiente. Si caen los tres, quedas eliminado y tu puesto es el orden en que caes. Gana el último que se queda en pie.
guia.como.6.t = EL TRUCO
guia.como.6.d = Mira las pestañas TIPOS y ESTADOS: saber quién pega fuerte a quién gana más batallas que la suerte.

guia.stats.niveles.t = SUBIR Y BAJAR
guia.stats.niveles.d = Algunos movimientos suben o bajan una estadística (menos los PS) entre -6 y +6 niveles. Con +2 se dobla; con -2 se queda a la mitad. Todo se pierde al cambiar de userito.
guia.stats.reparto = Todos los useritos suman lo mismo en total: el que destaca en algo, flojea en otra cosa.

guia.tipos.ejes = Fila: quien ataca. Columna: quien defiende.
guia.tipos.toca = Toca un tipo (o una casilla) para ver sus puntos fuertes y flojos.
guia.tipos.l.x2 = DOBLE
guia.tipos.l.x05 = LA MITAD
guia.tipos.l.x0 = NADA
guia.tipos.fuerte = Pega fuerte a
guia.tipos.flojo = Pega poco a
guia.tipos.nada = No afecta a
guia.tipos.recibe = Le pegan fuerte
guia.tipos.ninguno = Ninguno
guia.tipos.par = {a} contra {d}: {r}
guia.tipos.r.2 = doble de daño
guia.tipos.r.1 = daño normal
guia.tipos.r.05 = la mitad de daño
guia.tipos.r.0 = no le afecta
guia.tipos.t = CÓMO FUNCIONA

guia.estados.nota = Solo puede haber un estado a la vez (Achispado se suma a los demás). Se ven junto al nombre del userito, con su etiqueta. La Siesta los cura todos. El sueño sigue pasando en el banquillo; la quemadura y el empacho solo duelen a quien está luchando.

guia.reglas.acorralado.t = ACORRALADO
guia.reglas.acorralado.d = Si varios le pegan a un mismo userito en un turno, el segundo golpe y los siguientes hacen la mitad. Ir en manada sale menos a cuenta. Esos golpes recortados llevan un 1/2 rojo junto al número de daño.
guia.reglas.venganza.t = VENGANZA
guia.reglas.venganza.d = Algunos movimientos, como Venganza, pegan el doble a quien te hizo daño el turno anterior. Aquí todo se apunta.
guia.reglas.cierre.t = HORA DE CERRAR
guia.reglas.cierre.d = Desde el turno 30 sale Vero y pone las sillas encima de las mesas: al acabar cada turno todos pierden 1/8 de sus PS, y cada cuatro turnos, 1/8 más. Nadie se eterniza.
guia.reglas.grada.t = DESDE LA GRADA
guia.reglas.grada.d = Si te eliminan no te quedas mirando: cada tres turnos puedes invitar a una caña a un userito en pie (le cura 1/10 de sus PS) o abuchearle (baja su precisión). Para ayudar a un amigo o para fastidiar a un enemigo.
guia.reglas.cana.t = LA CAÑA
guia.reglas.cana.d = Una por batalla y jugador: en vez de atacar, tu userito se bebe una caña y recupera la mitad de sus PS (Fran, un 60 %). Va antes que los ataques, así que siempre llega a tiempo.
guia.reglas.prioridad.t = PRIORIDAD
guia.reglas.prioridad.d = Cada movimiento va antes o después según su prioridad, aunque seas más lento. La Velocidad solo decide entre los que tienen la misma. Mira el iconito de cada movimiento:
guia.prio.rapido.t = RÁPIDO (+1)
guia.prio.rapido.d = Ataca antes que los demás: ¡Me cuelo!, Rebufo, Colleja y Susto. Pegan poco, pero rematan.
guia.prio.proteccion.t = PROTECCIÓN (+2)
guia.prio.proteccion.d = Van las primeras: Esconderse, ¡Que pague otro! y Aguantar el tipo. Si usas una dos turnos seguidos, la segunda falla la mitad de las veces. Los golpes que no te dan no cuentan para Acorralado.
guia.prio.lento.t = LENTO (-1)
guia.prio.lento.d = Va el último: Devolvérsela devuelve 1,5 veces el daño que te hicieron a quien te pegó el último.
guia.sucesos.nota = En los turnos 5, 10, 15, 20 y 25 pasa algo en el bar, y no se repite en la misma batalla. Los que duran dejan una chapita bajo el campo: tócala y te lo explica. Desde el turno 30 manda la Hora de cerrar.
guia.sucesos.donde = Solo en {sitio}.
guia.sucesos.sitio.brio = el Bar del Brío
guia.sucesos.sitio.terraza = la terraza
guia.sucesos.sitio.rural = la Casa Rural Drag Queen
guia.sucesos.sitio.juan = el Bar Donde Juan
guia.objetos.nota = Tras el draft, la barra te ofrece 3 objetos al azar: eliges uno y a cuál de tus useritos se lo das. Los rivales no ven qué llevas hasta que funciona; entonces sale un cartel. Casi todos se gastan al usarse; los permanentes lo dicen.
guia.perks.nota = Cada entrenador trae una ventaja pequeña. Vale para todos, también para la máquina.

// ---- ficha del draft: tipos del userito
draft.pega = Le pega fuerte a
draft.pegan = Le pegan fuerte
draft.inmune = No le afectan
draft.x4 = ×4

// ---- useritopedia (pantallas/useritopedia.ts)
useritopedia.titulo = USERITOPEDIA
useritopedia.volver = VOLVER
useritopedia.objetos = OBJETOS
useritopedia.lista.pista = Toca un userito para ver su ficha completa.
useritopedia.num = Nº{n}
useritopedia.de = {n} DE {total}
useritopedia.mejor = {stat} {v}
useritopedia.stat.ps = PS
useritopedia.stat.ata = ATA
useritopedia.stat.def = DEF
useritopedia.stat.vel = VEL
useritopedia.stat.esp = ESP
useritopedia.h.stats = ESTADÍSTICAS BASE
useritopedia.h.movs = MOVIMIENTOS
useritopedia.h.tipos = FRENTE A LOS TIPOS
useritopedia.stats.toca = Toca una estadística para ver qué significa.
useritopedia.total = TOTAL {n}
useritopedia.total.igual = Todos los useritos suman lo mismo: aquí manda la maña.
useritopedia.total.dist = Cada userito reparte los puntos a su manera.
useritopedia.mejor.linea = Lo suyo es {stat}: {v} puntos, puesto {p} de {n} useritos.
useritopedia.pot = POT
useritopedia.prec = PREC
useritopedia.pp = PP
useritopedia.sin = -
useritopedia.pot.azar = 0-150
useritopedia.prio.rapido = RÁPIDO (+1)
useritopedia.prio.proteccion = PROTECCIÓN (+2)
useritopedia.prio.lento = LENTO (-1)
useritopedia.cat.fisico = FÍSICO
useritopedia.cat.especial = ESPECIAL
useritopedia.cat.estado = ESTADO
useritopedia.obj.uno = A UNO
useritopedia.obj.todos = A TODOS
useritopedia.obj.yo = A SÍ MISMO
useritopedia.obj.auto = AL QUE LE PEGÓ
useritopedia.prev = Anterior
useritopedia.sig = Siguiente

// ---- app instalable (menú, aviso de versión nueva, sin conexión)
menu.instalar = INSTALAR EN EL MÓVIL
menu.actualizar.1 = HAY VERSIÓN NUEVA
menu.actualizar.2 = TOCA PARA ACTUALIZAR
pwa.ios.titulo = EN EL IPHONE, DESDE SAFARI:
pwa.ios.1 = 1. Toca Compartir, el cuadrado con la flecha hacia arriba.
pwa.ios.2 = 2. Elige «Añadir a pantalla de inicio».
pwa.sinconexion = Sin conexión no hay sala online. Puedes jugar solo contra la máquina.
