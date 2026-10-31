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
titulo.version = v{v}

menu.solo = JUGAR SOLO
menu.aventura = AVENTURA
menu.online = JUGAR ONLINE
menu.ajustes = AJUSTES
menu.guia = GUÍA
menu.useritopedia = USERITOPEDIA
menu.estadisticas = ESTADÍSTICAS

// ---- estadísticas acumuladas de todas las partidas (pantallas/acumuladas.ts)
acum.volver = VOLVER
acum.pagina = {n}/{total} {nombre}
acum.pag.useritos = USERITOS
acum.pag.movs = MOVIMIENTOS
acum.pag.tipos = TIPOS
acum.pag.objetos = OBJETOS
acum.pag.escenarios = ESCENARIOS
acum.pag.entrenadores = ENTRENADORES
acum.pag.records = RÉCORDS
acum.pag.yo = YO
acum.fuente.todos = DE TODOS
acum.fuente.movil = EN ESTE MÓVIL
acum.filtro.todas = TODAS
acum.filtro.personas = SOLO PERSONAS
acum.total.una = 1 BATALLA, {t} TURNOS
acum.total.turnos = {n} BATALLAS, {t} TURNOS DE MEDIA
acum.nota.copia = SIN CONEXIÓN: ÚLTIMA COPIA DE LAS DE TODOS
acum.nota.sinred = NO SE PUDIERON CARGAR LAS DE TODOS
acum.nota.cargando = CARGANDO LAS DE TODOS...
acum.nota.copiayo = SIN CONEXIÓN: ÚLTIMA COPIA DE LAS TUYAS
acum.yo.cabecera = {nombre}
acum.yo.sincuenta = Aún no tienes cuenta. Créala en AJUSTES, MI CUENTA.
acum.yo.sinred = No se pudieron cargar tus números. Hace falta conexión.
acum.yo.vacio = Aún no hay batallas con tu cuenta. Juega alguna y vuelve a mirar.
acum.yo.bat = MIS BATALLAS
acum.yo.bat.d = {g} ganadas y {p} perdidas
acum.yo.bat.pie = Desde el {fecha}
acum.yo.vict = % DE VICTORIA
acum.yo.vict.d = {g} de {n} batallas ganadas
acum.yo.racha = RACHA ACTUAL
acum.yo.racha.d = Tu mejor racha: {m}
acum.yo.fav = USERITO FAVORITO
acum.yo.fav.d = {userito}, elegido {v} veces
acum.yo.fav.pie = En el {pct}% de tus batallas
acum.yo.gana = EL QUE MÁS GANA
acum.yo.gana.d = {userito}
acum.yo.gana.pie = {g} victorias en {n} batallas
acum.yo.dano = DAÑO TOTAL
acum.yo.dano.d = {media} de media por batalla
acum.yo.ko = KO
acum.yo.ko.d = {media} derribos por batalla
acum.yo.aventura = AVENTURA
acum.yo.aventura.d = {bares} de {total} bares ganados
acum.yo.aventura.campeon = ¡Campeón de la Aventura!
acum.yo.aventura.sin = Aún no has empezado la Aventura
acum.vacio = Aún no hay batallas guardadas. Juega alguna y vuelve a mirar.
acum.vacio.personas = Aún no hay batallas con personas. Prueba con TODAS.
acum.vacio.todos = No hay datos de todos. Mira EN ESTE MÓVIL.
acum.cargando = Cargando...
acum.sin = SIN DATOS
acum.grupo.escenarios = LOS BARES
acum.grupo.sucesos = SUCESOS DEL BAR
// Las medidas (cabecera de orden y líneas de cada fila): máximo 6 letras en las que son botón.
acum.m.eleg = ELEG.
acum.m.az = AL AZAR:
acum.m.vict = VICT.
acum.m.puesto = PUES.
acum.m.dano = DAÑO
acum.m.ko = KOS
acum.m.cae = CAÍD.
acum.m.cura = CURA
acum.m.crit = CRÍT.
acum.m.ini = INI.
acum.m.usos = USOS
acum.m.total = DAÑO
acum.m.media = MEDIA
acum.m.act = ACT.
acum.m.bat = BATAL.
acum.m.tur = TURNOS
acum.m.pct = % BAT.
acum.m.reci = RECIB.
acum.m.part = PART.
// Los récords: título, y la línea de detalle ({userito}, {mov}, {quien}, {bar}, {v}); la última línea es «quién - fecha».
acum.rec.golpe = EL GOLPE MÁS FUERTE
acum.rec.golpe.d = {userito} con {mov}
acum.rec.movdano = MOVIMIENTO MÁS DAÑINO
acum.rec.movdano.d = {v} de daño: {userito} con {mov}
acum.rec.ko = MÁS KOS EN UNA BATALLA
acum.rec.ko.d = {userito} derribó a {v}
acum.rec.dano = MÁS DAÑO EN UNA BATALLA
acum.rec.dano.d = {userito} hizo {v} de daño
acum.rec.aguante = MÁS DAÑO AGUANTADO
acum.rec.aguante.d = {userito} recibió {v} de daño
acum.rec.cura = MÁS CURACIÓN
acum.rec.cura.d = {userito} curó {v} PS
acum.rec.crit = MÁS CRÍTICOS
acum.rec.crit.d = {userito} dio {v} críticos
acum.rec.hab = MÁS HABILIDADES
acum.rec.hab.d = {userito} la activó {v} veces
acum.rec.campo = MÁS TURNOS SIN CAER
acum.rec.campo.d = {userito} aguantó {v} turnos en pie
acum.rec.danoj = MÁS DAÑO DE UN JUGADOR
acum.rec.danoj.d = {quien} hizo {v} de daño
acum.rec.larga = LA BATALLA MÁS LARGA
acum.rec.larga.d = {v} turnos en {bar}
acum.rec.corta = LA BATALLA MÁS CORTA
acum.rec.corta.d = {v} turnos en {bar}
acum.rec.sucesos = BATALLA CON MÁS SUCESOS
acum.rec.sucesos.d = {v} sucesos en {bar}
acum.rec.pie.con = {quien} - {fecha}
acum.rec.pie.sin = {fecha}

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
sala.eligiendo.nombre = eligiendo...
sala.elige = ELIGE TU ENTRENADOR
sala.tuyo = TUYO
sala.ocupado = OCUPADO
sala.modo = MODO
sala.velocidad = VELOCIDAD
sala.rellenar = RELLENAR CON MÁQUINA
sala.si = SÍ
sala.no = NO
sala.empezar = EMPEZAR
sala.salir = SALIR DE LA SALA
sala.cerrar.aviso = Si sales, se cierra la sala para todos.
sala.cerrar.salir = SALIR
sala.cerrar.quedar = QUEDARME
sala.config = MODO: {modo} · VELOCIDAD: {velocidad}
sala.loElige = Lo elige el anfitrión.
sala.esperando = Esperando al anfitrión...
sala.pista.elige = Elige tu entrenador.
sala.pista.faltan = Faltan jugadores.
sala.pista.listo = Todo listo.

// ---- cuenta de usuario (pantallas/cuenta.ts; ver docs/POKEUSERA.md, «Cuentas»)
cuenta.nombre.titulo = TU NOMBRE
cuenta.nombre.pregunta = ¿Cómo te llamas?
cuenta.nombre.ayuda = Hasta 12 letras. Es tu nombre en las estadísticas y en las partidas online.
cuenta.campo.nombre = NOMBRE
cuenta.campo.codigo = CÓDIGO
cuenta.entrar = ENTRAR
cuenta.guardar = GUARDAR
cuenta.yatengo = YA TENGO CUENTA
cuenta.mastarde = MÁS TARDE
cuenta.volver = VOLVER
cuenta.conectando = Conectando...
cuenta.sinred = Hace falta conexión para crear la cuenta. Puedes jugar igualmente: te lo preguntaré otra vez la próxima vez que abras el juego.
cuenta.error.nombre = Ese nombre no vale. Usa letras y números, hasta 12.
cuenta.error.repetido = Ya hay alguien con ese nombre. Prueba otro.
cuenta.error.codigo = El código son 6 letras y números.
cuenta.error.noexiste = No hay ninguna cuenta con ese código.
cuenta.error.red = Hace falta conexión para esto. Prueba más tarde.
cuenta.error.limite = Demasiados intentos. Espera un rato.
cuenta.error.servidor = El servidor no responde bien. Prueba más tarde.
cuenta.codigo.titulo = YA TENGO CUENTA
cuenta.codigo.pregunta = Escribe tu código
cuenta.codigo.ayuda = Lo ves en AJUSTES, MI CUENTA, en el móvil donde ya jugabas.
cuenta.mi.titulo = MI CUENTA
cuenta.mi.nombre = NOMBRE
cuenta.mi.codigo = CÓDIGO DE RECUPERACIÓN
cuenta.mi.ayuda = Con este código entras con tu cuenta desde otro móvil o el ordenador. Guárdalo.
cuenta.mi.cambiar = CAMBIAR NOMBRE
cuenta.mi.otra = USAR OTRA CUENTA
cuenta.mi.sin = Este móvil aún no tiene cuenta. Para crearla hace falta conexión.
cuenta.mi.crear = CREAR CUENTA
cuenta.cambiar.pregunta = Tu nuevo nombre
cuenta.cambiar.ayuda = Tus estadísticas siguen siendo tuyas.
cuenta.otra.pregunta = Código de la otra cuenta
cuenta.otra.ayuda = Este móvil pasará a ser de esa cuenta. Antes, apunta tu código: {codigo}.

// ---- ajustes y pausa
ajustes.cuenta = MI CUENTA
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
escenario.feria = LA FERIA

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
entrenador.vinas = Viñas
entrenador.ari = Ari
entrenador.fer = Fer
entrenador.titulo = ¿QUIÉN ERES?
entrenador.volver = VOLVER

// ventajas de entrenador (una por cada uno; el motor las aplica, ver docs/POKEUSERA.md)
entrenador.fran.perk = ¡Otra caña!
entrenador.fran.perk_d = Su caña cura el 60 % de los PS, no la mitad.
entrenador.pablo.perk = Labia
entrenador.pablo.perk_d = Sus movimientos de estado fallan menos: +10 de precisión.
entrenador.chuchi.perk = Llega tarde
entrenador.chuchi.perk_d = El primer golpe que recibe cada userito le hace un 15 % menos.
entrenador.guille.perk = Mañico
entrenador.guille.perk_d = Una vez por userito, aguanta con 1 PS un golpe mortal a vida llena.
entrenador.vinas.perk = Verso libre
entrenador.vinas.perk_d = Sus ataques de Chanza y Juerga pegan un 10 % más.
entrenador.ari.perk = Improvisadora nata
entrenador.ari.perk_d = Cada golpe que da tiene un 10 % más de salir crítico.
entrenador.fer.perk = Técnico residente
entrenador.fer.perk_d = Los movimientos con la etiqueta SONIDO (bocinas, gritos, música…) le hacen un 20 % menos.
entrenador.elegir = ELEGIR

// ---- draft
draft.titulo = DRAFT
draft.tuturno = ¡Tu turno!
draft.elige = Elige {nombre}
draft.elegir = ELEGIR
draft.luego = Luego
draft.tetoca = Te toca en {n}
draft.tesigue = Sigues tú
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
salida.apelear = ¡A PELEAR!
salida.secreto = Nadie lo ve hasta que empiece el combate.
salida.espera = ¡Listo! Esperando a los demás...
salida.sinobjeto = Sin objeto

// ---- modo de juego: NORMAL o AL AZAR (pantallas/modo.ts, la sala online)
modo.titulo = ¿CÓMO JUGAMOS?
modo.normal = NORMAL
modo.normal.d = Elegís los useritos por turnos (el draft) y cada uno coge un objeto en La barra.
modo.azar = AL AZAR
modo.azar.d = El juego reparte a cada uno 3 useritos y 1 objeto al azar. Tú solo decides con cuál sales primero.
modo.ultimo = ÚLTIMA VEZ
modo.volver = VOLVER
modo.pista = Toca un modo para jugar.

// ---- TU EQUIPO AL AZAR (pantallas/azar.ts): en el modo AL AZAR, en lugar del draft y de La barra
azar.titulo = TU EQUIPO AL AZAR
azar.pista = Toca a quien sale primero.
azar.sale = SALE
azar.lleva = Lo lleva {nombre}.
azar.sinobjeto = Sin objeto
azar.rivales = TUS RIVALES
azar.secreto = Los rivales no verán tu objeto hasta que funcione.
azar.apelear = ¡A PELEAR!
azar.espera = ¡Listo! Esperando a los demás...

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
batalla.cazar = CAZAR
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
podio.tupuesto = Has quedado {n}.º
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
ayuda.estado.dormido = Dormido: no hace nada durante 1 a 3 turnos. El sueño también pasa en el banquillo: puede despertarse allí. Al despertar, 2 turnos sin que lo duerman otra vez.
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
guia.tipos.recibe = Es débil a
guia.tipos.ninguno = Ninguno
guia.tipos.par = {a} contra {d}: {r}
guia.tipos.r.2 = doble de daño
guia.tipos.r.1 = daño normal
guia.tipos.r.05 = la mitad de daño
guia.tipos.r.0 = no le afecta
guia.tipos.porque = POR QUÉ
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
guia.sucesos.sitio.feria = la feria
guia.objetos.nota = Tras el draft, la barra te ofrece 3 objetos al azar: eliges uno y a cuál de tus useritos se lo das. Los rivales no ven qué llevas hasta que funciona; entonces sale un cartel. Casi todos se gastan al usarse; los permanentes lo dicen.
guia.perks.nota = Cada entrenador trae una ventaja pequeña. Vale para todos, también para la máquina.

// ---- ficha del draft: tipos del userito
draft.pega = Pega fuerte a
draft.pegan = Es débil a
draft.resiste = Resiste a
draft.inmune = Inmune a
draft.x4 = ×4
draft.habinfo = {nombre}: {desc}

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
useritopedia.h.hab = HABILIDAD
useritopedia.stats.toca = Toca una estadística para ver qué significa.
useritopedia.total = TOTAL {n}
useritopedia.mejor.linea = Lo suyo es {stat}: {v} puntos, puesto {p} de {n} useritos.
useritopedia.pot = POT
useritopedia.prec = PREC
useritopedia.pp = PP
useritopedia.sin = -
useritopedia.pot.azar = 0-150
useritopedia.pot.remate = 20-200
useritopedia.prio.rapido = RÁPIDO (+1)
useritopedia.prio.proteccion = PROTECCIÓN (+2)
useritopedia.prio.lento = LENTO (-1)
useritopedia.sonido = SONIDO
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

// ---- aventura (modo a un jugador: se cazan los useritos bar a bar; pantallas y flujo en src/pokeusera/caza/)
caza.salvaje = SALVAJE
caza.aparece = ¡Un {quien} salvaje aparece!
caza.volver = VOLVER
caza.elegir = ELEGIR
caza.equipo = EQUIPO
caza.inicial.titulo = ELIGE TU PRIMER USERITO
caza.inicial.pista = Toca uno para marcarlo.
caza.intro.1 = ¡Menudo cacao hay en Usera, {nombre}! Los useritos andan sueltos por los bares.
caza.intro.2 = Cázalos con la jarra, uno a uno, y gana a tus amigos en cada bar.
caza.intro.3 = ¡Y a la final, con las cañas bien frías!
caza.mapa.cazados = CAZADOS {n}/{total}
caza.mapa.cuenta = {n}/{total}
caza.mapa.cerrado = CERRADO
caza.mapa.final = FINAL
caza.mapa.final2 = LOS TRES A LA VEZ
caza.mapa.campeon = CAMPEÓN
caza.nueva = EMPEZAR DE NUEVO
caza.nueva.1 = ¿Empezar de nuevo?
caza.nueva.2 = Se borra todo lo que has cazado.
caza.zona.salvajes = AQUÍ ANDAN {n}/{total}
caza.zona.jefe = JEFE: {quien}
caza.zona.vencido = VENCIDO
caza.zona.lleva = LLEVA {n} USERITOS
caza.zona.buscar = BUSCAR USERITOS
caza.zona.retar = RETAR A {quien}
caza.equipo.titulo = TU EQUIPO
caza.equipo.primero = SALE PRIMERO
caza.equipo.segundo = SEGUNDO
caza.equipo.tercero = TERCERO
caza.equipo.libre = LIBRE
caza.equipo.pista = Toca uno para meterlo o sacarlo.
caza.equipo.lleno = Equipo lleno: saca a alguien antes.
caza.equipo.ultimo = Alguien tiene que salir a pelear.
caza.cazado.1 = ¡{quien} es tuyo!
caza.cazado.equipo = Se une a tu equipo.
caza.cazado.furgo = Tu equipo está lleno: se va a la furgo.
caza.cazado.completo = ¡Ya tienes a todos los de este bar!
caza.cazado.cuenta = Llevas {n} de {total}.
caza.ganado = {quien} se va a su casa, tan tranquilo.
caza.perdido.1 = Tu equipo no puede más.
caza.perdido.2 = Os recuperáis en la barra con unas aceitunas.
caza.huido = Sales por patas, que ya es algo.
caza.jefe.inicio = ¡{quien} te reta en su bar!
caza.jefe.gana.1 = ¡Has vencido a {quien}!
caza.jefe.abre = ¡Bar nuevo! Se abre {bar}.
caza.jefe.final = ¡Se abre la final! Los tres a la vez, sin piedad.
caza.jefe.repite = Otra vez ganas, pero sin premio.
caza.jefe.pierde = {quien} te ha dado un buen repaso.
caza.final.inicio = ¡La final! Los tres a la vez y cada uno a lo suyo.
caza.final.gana.1 = ¡Eres el campeón de Usera!
caza.final.gana.2 = Tus amigos piden una ronda. La pagan ellos, claro.
caza.final.pierde = Los tres se han repartido las cañas y a ti no te ha tocado ni la espuma. Otra vez será.
