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
ajustes.volver = VOLVER

velocidad.lenta = LENTA
velocidad.normal = NORMAL
velocidad.rapida = RÁPIDA

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

// ---- draft
draft.titulo = DRAFT
draft.tuturno = ¡Tu turno!
draft.elige = Elige {nombre}
draft.elegir = ELEGIR
draft.volver = VOLVER
draft.apelear = ¡A pelear!

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
