# Alacant Sun (el juego de Pablo)

<!--
CÓMO EDITAR ESTE ARCHIVO
Todo lo que se lee en «Alacant Sun» está aquí. Mismo formato que capitulo1.md, pero solo con textos sueltos:

  clave = texto                un texto. Quién lo dice sale de la clave: madre.*, aldeano.* y pablo.*
                               enseñan su retrato en la ventanita; el resto lo cuenta el narrador.
  [contento] texto             al principio de un texto, el que habla sonríe (ojos en ^^)
  madre.no.1, madre.no.2...    se van usando por turnos cada vez que Pablo dice que no
  clave.1, clave.2, clave.3    líneas de una conversación: salen una tras otra, cada una en su ventana
  @fran texto                  al principio de un texto, habla ese personaje (@pablo, @narrador, @tendera...);
                               @nadie = el narrador de siempre, sin retrato. Va antes que [contento]

La letra del juego es de píxeles y solo tiene A-Z, a-z, 0-9, las tildes, la ü, la ñ, ¿ ¡ y . , : ; ! ? ' " - ( )
Un texto largo se parte solo en ventanas de tres líneas. Mejor corto que largo.

El mundo usa: charla.<amigo>.N (cada amigo se une al grupo), une.<amigo>, narrador.*, tienda.*, posada.*, menu.*
(el menú START), chist.*, cofre.*, escondite.*, madre.derrota.* y derrota.*; los letreros son lectura.* y letrero.*.
El Teatro usa: teatro.*, puzle.*, fantasma.*, chat.* (cada mensaje es «< hora | texto» si lo dice el otro o «> hora | texto» si
lo dice el que piensa), puerta.*, bambalinas.*, apuntador.<id>.aparece/unido, escenario.*, poder.<id>.nada y mapa.*.
El combate (src/sol/combate.ts) usa: combate.* (menús, la línea de arriba y el final), orden.* (los seis iconos),
poder.<id>.nombre, apuntador.*, invocacion.*, objeto.*, enemigo.<id>.nombre y enemigo.<id>.<ataque>, etiqueta.*
y ovacion.grito.*. Los huecos entre llaves ({quien}, {n}...) los rellena el juego. La línea de arriba admite unas
36 letras: mejor corta.
Los textos son provisionales: los revisará Jesús junto con el resto.
-->

// ---------------------------------------------------------------- título y consola

titulo.pie = PARA PABLO, CON CARIÑO
titulo.pulsa = PULSA A
consola.marca = CAMIONES Y CARAVANAS
consola.modelo = ALACANT SUN
consola.start = START

// ---------------------------------------------------------------- interfaz

hud.ip = IP
poder.nombre = Sí, y...
nombre.pablo = Pablo
nombre.madre = Mamá
nombre.aldeano = Tío Vicent
nombre.narrador = Sombra
nombre.tendera = Tendera
nombre.posadero = Posadero
opcion.si = Sí
opcion.no = No

// ---------------------------------------------------------------- la habitación (empieza dormido)

madre.despertar.1 = ¡Pablo! ¡Pablo, hijo, despierta!
madre.despertar.2 = Han empezado las fiestas y tú roncando como un tractor.
madre.pregunta = ¿Te levantas ya?

// Cada "no" de Pablo recibe un "sí, y..." de su madre y la pregunta se repite. Salen por turnos.
madre.no.1 = ¿Que no? ¡Un "sí, y..."! Sí, y además se está acabando el turrón blando.
madre.no.2 = ¡Dice que no! Sí, y tu padre ya te ha guardado sitio en la plaza.
madre.no.3 = Sí, y fuera hay tormenta, ¡hasta los truenos quieren verte en las fiestas!
madre.no.4 = Sí, y yo de aquí no me muevo hasta que me digas que sí.

pablo.si = [contento] Vale, vale... Sí, y además me pongo la chaqueta.
madre.si.1 = ¡Así me gusta! Anda, baja a la plaza, que ya han encendido las luces.
madre.si.2 = La puerta está abajo, ¿eh? Por si te pierdes en tu propia casa.
madre.monedas = Y toma 40 monedas para las fiestas. ¡No te las gastes todas en el mismo puesto!

madre.fuera.1 = Anda, ve a la plaza. Yo me quedo por si vuelve a tronar.
madre.fuera.2 = ¿Todavía aquí? ¡La plaza, Pablo!
madre.fuera.3 = Sí, y llévate el paraguas. Ay, no: si ya te has ido.

lectura.escritorio = Mi obra de teatro. Lleva tres años en el segundo acto.
lectura.armario = Mi ropa de las fiestas. La chaqueta ya me la he puesto... creo.
lectura.cajon = Mi cajón. Si no lo toco un día, se me olvida cómo se hace.
lectura.ventana = Truena y llueve, pero la plaza brilla desde aquí. Hoy no me quedo en casa.

// ---------------------------------------------------------------- el pueblo

pablo.pueblo = ¡Qué noche! Llueve, truena... y huele a turrón blando.
consejo.mover = Mantén B mientras andas para correr. R usa tu impronergía.

lectura.puerta = Cerrada. Todo el mundo está en la plaza.
lectura.fuente = La fuente tiene un sol en lo alto y el agua brilla con las luces de la fiesta.
lectura.puesto = Un puesto de turrón blando. Huele a almendra y a miel.
lectura.cartel = FIESTAS DEL TURRÓN BLANDO. La plaza está al otro lado de la valla.
lectura.caja.1 = Una caja de turrón blando. Tapa justo la entrada a la plaza.
lectura.caja.2 = La caja, ahora de lado, tan tranquila. Huele que alimenta.

pablo.caja.1 = Una caja de turrón blando atasca la entrada de las fiestas.
pablo.caja.2 = Si pudiera empujarla con un "sí, y..."
consejo.caja = Mira a la caja y pulsa R para usar "Sí, y...".

pablo.sinip = No me queda impronergía. Andar un rato me la devuelve.
pablo.nada = No hay nada que empujar ahí.
pablo.atasca = La caja no se mueve: hay algo detrás.

aldeano.hola.1 = ¡Pablo! Menuda noche, ¿eh? Llueve y todo el pueblo está en la plaza.
aldeano.hola.2 = Pero no se puede pasar: alguien ha dejado una caja de turrón en la puerta.
aldeano.hola.3 = Tú que eres de la impro... ¿no podrás empujarla con eso del "sí, y..."?
pablo.aldeano = [contento] Tranquilo, Vicent. Sí, y además me encargo yo.
aldeano.otra.1 = ¡Dale a esa caja, Pablo! Aquí no hay quien pase.
aldeano.otra.2 = Cuando abras la plaza, avísame. Llevo toda la noche con ganas de turrón.
aldeano.luego.1 = ¡Ya pasa la gente! Sí, y encima ha empezado la orquesta. ¡A la plaza!

// ---------------------------------------------------------------- final de esta parte

fin.1 = [contento] ¡La plaza! Luces, turrón y todo el pueblo esperando.
fin.continuara = CONTINUARÁ...

// ---------------------------------------------------------------- la sombra se queda con el final

narrador.hola.1 = Qué escena tan bonita. La plaza, las luces, el héroe que llega justo a tiempo...
narrador.hola.2 = Soy yo, Pablo. Tu sombra. El que cuenta lo que haces mientras tú lo haces.
narrador.obra.1 = Y tu obra, esos cuatro actos tuyos, es una historia estupenda. Demasiado buena para ti.
narrador.obra.2 = Mira, ya vuelan las páginas. Me las llevo al Teatro.
pablo.mias = ¡Eh! ¡Esos actos son míos! ¡Devuélvemelos!
narrador.final = Esta historia la acabo yo.
pablo.amigos.1 = Se ha llevado mi obra... Solo no puedo con él.
pablo.amigos.2 = Los demás andarán por el pueblo. Voy a buscarlos.
pablo.antes = Primero, la plaza. Algo me dice que ahí pasa algo.
pablo.falta = No me voy sin los demás. ¡Hay que buscarlos por el pueblo!

// ---------------------------------------------------------------- los amigos se unen

charla.fran.1 = ¡Aupa, Pablo! Aquí, con mi caña, esperando a que alguien se eche otra.
charla.fran.2 = @pablo Fran, una sombra se ha llevado mi obra al Teatro. Te necesito.
charla.fran.3 = ¡Ene! Eso se arregla con otra caña. Bueno, primero la obra. ¡Voy contigo!
charla.guille.1 = ¡Pablo, maño! Aquí, mirando la fuente. Se parece a la del Pilar, pero con más turrón.
charla.guille.2 = @pablo Guille, me han robado el final de la obra. Hay que ir al Teatro.
charla.guille.3 = Cuenta conmigo. Pesé cerdos todo un año; una sombra no me da miedo.
charla.guille.4 = Eso sí: si huelo a purín, no es culpa mía.
une.fran = Fran se une al grupo.
une.guille = Guille se une al grupo.
une.chuchi = Chuchi se une al grupo.
consejo.start = Pulsa START para abrir el menú: impronergía, apuntadores, objetos y estado.
pablo.chuchi = Solo falta Chuchi. Seguro que llega tarde.
charla.chuchi.1 = ¡Perdón, perdón! Llego tarde, pero llego.
charla.chuchi.2 = @pablo Chuchi, ¿y las niñas?
charla.chuchi.3 = Dormidas. Por fin. Cuéntame qué me he perdido.
charla.chuchi.4 = @pablo Casi todo. Una sombra me ha quitado el final. Vamos al Teatro.
charla.chuchi.5 = Pues vamos. Y si por el camino hay algún chupito, mejor.
pablo.todos = Ya estamos los cuatro. El camino al Teatro sale por el este de la plaza.

// ---------------------------------------------------------------- la peña y la posada

tienda.hola = ¡Bienvenido a la peña! Turrón blando y chupitos, lo mejor del pueblo.
tienda.comprar = Comprar
tienda.salir = Salir
tienda.adios = ¡Vuelve cuando quieras!
tienda.sinmonedas = No tienes monedas.
tienda.gracias = Compras {objeto}.
posada.hola = Una cama para los cuatro cuesta {n} monedas. ¿Descansáis?
posada.no = Cuando queráis. La cama no se va a ninguna parte.
posada.pobre = Pues sin monedas no hay cama, majo.
posada.listo = ¡Buenos días! Estáis como nuevos.

// ---------------------------------------------------------------- el menú START

menu.impronergia = Impronergía
menu.apuntadores = Apuntadores
menu.objetos = Objetos
menu.estado = Estado
menu.monedas = Monedas
menu.poner = Poner
menu.quitar = Quitar
menu.soloCombate = Esa impronergía es solo para combatir.
menu.nohace = No hace falta.
menu.recupera = Todavía se está recuperando.
menu.sinapuntadores = Aún no tenéis apuntadores.
menu.cura = {quien} recupera {n} PV.
menu.usa = {quien} usa {objeto}.
menu.puesto = {apuntador} se pone en {quien}.
menu.quitado = {apuntador} queda en espera.
apuntador.dueno = Dueño
apuntador.estado = Estado
apuntador.bono = Bono

// ---------------------------------------------------------------- el camino al Teatro

letrero.teatro = TEATRO
lectura.cartelInicio = CAMINO DEL TEATRO. Cuidado con los petardos, que andan sueltos.
lectura.cartelCamino = CAMINO DEL TEATRO. Solo ida: el final os espera allí.
lectura.granja = La granja duerme. Huele a naranjas y a paja.
pablo.camino = El camino del Teatro, de noche y sin lluvia. Aquí se ve hasta la luna.
chist.aparece = ¡Un apuntador salvaje! Susurra algo desde su rincón.
chist.unido = Chist, el apuntador, se une al grupo.
consejo.apuntador = Ponlo o quítalo en START. En combate, suéltalo para un ataque especial.
cofre.monedas = Encuentras {n} monedas.
cofre.objeto = Encuentras {objeto} x{n}.
cofre.vacio = El cofre está vacío.
escondite.hallado = ¡Un chupito perdido! Encuentras {objeto}.
pablo.teatro.1 = El Teatro. Las puertas están abiertas, y dentro suenan unas páginas.
pablo.teatro.2 = Ahí dentro está mi sombra con mi final. Esto no acaba aquí.

// ---------------------------------------------------------------- el Teatro (mazmorra con un puzle por impronergía)

// Palabras pintadas en los carteles (muy cortas: caben en 24 píxeles)
teatro.taquilla = TAQUILLA
teatro.cartel1 = ACTO IV
teatro.cartel2 = ESTRENO
teatro.escenario = ESCENARIO

// La primera vez que se entra en cada sala
teatro.sala.ves = El vestíbulo. Una verja dorada cierra el paso al patio de butacas, y en el suelo hay dos marcas de actor.
teatro.sala.pat = El patio de butacas. Entre las filas hay un foso lleno de cerveza vieja. Huele a función de hace cien años.
teatro.sala.pal = Los palcos. Al puente le falta un trozo, y por aquí hay rocas que parecen de las que no pesan.
teatro.sala.bam = Las bambalinas. Los candelabros deslumbran y las tablas crujen. Ojo dónde se pisa.
teatro.sala.fos = El foso, bajo el escenario. Al fondo, una puerta con una estrella pide una contraseña.
teatro.sala.esc = El escenario. Un foco redondo, el telón a medio abrir y alguien esperando en el centro.
consejo.poderes = Pulsa R para usar la impronergía elegida y L para cambiarla. Gastan IP, que vuelve al andar.

// La impronergía del mapa (los nombres de Sí, y... Fresquito, Cierzo y Abrazo de oso están más abajo)
poder.chat.nombre = Leer el chat
poder.siy.nada = Nada que empujar por aquí. Sí, y si lo hubiera, ¡lo empujaba!
poder.fresquito.nada = ¡Aupa! No hay ningún charco que enfriar. Qué pena, con lo que me gusta lo fresquito.
poder.cierzo.nada = Aquí no hay velas que apagar ni hojas que soplar. El cierzo se me queda en el pecho.
poder.abrazo.nada = No hay nada que abrazar por aquí. Ni un mal cerdo.
poder.chat.nada = Aquí nadie piensa en voz alta. Mejor: así no me llegan notificaciones.
mapa.sinip = Me he quedado sin IP. Habrá que andar un rato para que vuelva.
estatua.atasca = No se mueve. Detrás hay algo que no le deja pasar.

// Lo que se lee en el sitio
lectura.estatua = Una máscara de teatro sobre un pedestal. A mano no se mueve ni un milímetro.
lectura.roca = Una roca de cartón piedra, hueca por dentro. Pesa lo que un suspiro, pero necesita un buen abrazo.
lectura.taquilla = TAQUILLA. Entradas agotadas desde hace cien años.
lectura.foso = El foso de la orquesta, lleno de cerveza. A nado ni de broma. Algo frío lo arreglaría.
lectura.puente = Un puente de madera al que le falta un trozo del tamaño de una roca.
lectura.aviso = CUIDADO. Solo pisan seguro los tramoyistas: sus huellas brillan en la oscuridad. Con tanta vela no se ven.

// Puzles resueltos
puzle.estatuas = Las dos máscaras encajan en sus marcas y la verja dorada sube. ¡Qué buen atrezzo!
puzle.hielo = Los charcos se hielan en una escalera de cubitos. Ya se puede cruzar el foso.
puzle.roca = La roca cae en el hueco y el puente aguanta. Se puede pasar.
puzle.velas = Sin velas, las huellas de los tramoyistas brillan en las tablas. Hay camino seguro.

// Los fantasmas y el chat
nombre.tramoyista = Tramoyista
nombre.acomodador = Acomodador
fantasma.acomodador.otra = Llevo cien años sin decir ni pío, pero lo pienso todo muy alto. Quien sepa leer el chat de un fantasma se entera de todo.
fantasma.tramoyista = Uuuh... el telón... la clave... no me acuerdo... uuuh.
fantasma.tramoyista.otra = Uuuh... ¿te lo he dicho ya? Qué cabeza la mía. Ya no la tengo.
chat.titulo.tramoyista = Tramoyista
chat.titulo.acomodador = Acomodador
chat.cerrar = Pulsa A para cerrar
chat.tramoyista.1 = < 23:38 | Jefe, el telón se ha vuelto a atascar.
chat.tramoyista.2 = > 23:39 | Pues dale con la palanca del foso, anda.
chat.tramoyista.3 = < 23:40 | Ya. Oye, y la clave de la puerta del escenario, ¿cuál era?
chat.tramoyista.4 = > 23:41 | ¿Otra vez? Es lo que se hace al salir de escena sin decir ni pío.
chat.tramoyista.5 = < 23:41 | ¿Foro?
chat.tramoyista.6 = > 23:42 | ¡No! El foro es por donde se sale. Lo que se hace es el... bueno, ya me entiendes.
chat.tramoyista.7 = < 23:42 | Ah, ya. Gracias, jefe.
chat.tramoyista.8 = > 23:43 | Y apúntalo, que yo no soy inmortal. Bueno. Ya no.
chat.tramoyista.fin = Salir sin decir ni pío, y por el foro... Creo que ya sé la contraseña de la puerta.
chat.acomodador.1 = > 00:02 | ¿Tramoyista? ¿Sigues abajo, en el foso?
chat.acomodador.2 = < 00:02 | Aquí, con mis cuerdas.
chat.acomodador.3 = > 00:03 | Cien años sin hablar con nadie.
chat.acomodador.4 = < 00:03 | Pues a mí me dejaron la clave del escenario y no se la cuento ni al apuntador.
chat.acomodador.5 = > 00:04 | Habrá que leerte la cabeza a ti, entonces.

// La puerta del escenario (la contraseña buena es la tercera)
puerta.cerrada = La puerta del escenario tiene una estrella y una cerradura de palabra. ¿Cuál es la contraseña?
puerta.op.1 = Telón
puerta.op.2 = Foro
puerta.op.3 = Mutis
puerta.op.4 = Bambalina
puerta.mal = La estrella parpadea en rojo. Esa no es. Alguien aquí abajo la sabe y piensa muy alto.
puerta.bien = La estrella se enciende y el pestillo hace clic. ¡Mutis por el foro!

bambalinas.cae = ¡Crac! La tabla cede y vuelves atrás.

// Los tres apuntadores del Teatro
apuntador.ejem.aparece = ¡Un apuntador! Ejem tose desde su rincón, como si fuera a decir algo.
apuntador.ejem.unido = Ejem, el apuntador del fuego, se une al grupo.
apuntador.psst.aparece = ¡Un apuntador! Psst chista bajito para que no se entere nadie.
apuntador.psst.unido = Psst, el apuntador del agua, se une al grupo.
apuntador.shhh.aparece = ¡Un apuntador! Shhh pide silencio con el dedo en los labios.
apuntador.shhh.unido = Shhh, el apuntador del viento, se une al grupo.

// El escenario: la sombra y los cuatro
escenario.sombra.1 = Habéis llegado hasta el escenario. Qué constancia. Me gusta el público que no se va.
escenario.sombra.2 = Tus actos, Pablo: cuatro actos y ni un final decente. Yo se lo voy a dar.
escenario.final = Esta historia la acabo yo.
escenario.fran = ¡Aupa, sombra! Esto se arregla con una caña y un poco de calma. Y si no, con dos.
escenario.guille = ¿Un final escrito por una sombra? Maño, eso no cuaja ni en Zaragoza.
escenario.chuchi = Yo solo quiero volver antes de que se despierten las niñas. Así que, sin ofender, aparta.
escenario.pablo = Mi obra y mis amigos. El final lo escribimos entre todos. ¡Sí, y...!
escenario.telon = Pues que suba el telón. A ver quién improvisa mejor.

// ---------------------------------------------------------------- si pierden

madre.derrota.1 = Ay, hijo, qué susto. Os han traído a casa hechos un trapo.
madre.derrota.2 = Dormid, descansad y a la próxima os lleváis el paraguas.
derrota.monedas = Por el camino se han perdido {n} monedas.
pablo.derrota = Estoy bien, mamá. Sí, y además voy a volver.

// ---------------------------------------------------------------- el grupo (nombres de los cuatro en combate)

nombre.fran = Fran
nombre.chuchi = Chuchi
nombre.guille = Guille

// ---------------------------------------------------------------- combate: menús

// Los textos pueden llevar huecos entre llaves que rellena el juego: {quien}, {poder}, {n}...
combate.aparece.uno = ¡Aparece {nombre}!
combate.aparece.varios = ¡{nombre} y su pandilla!
combate.luchar = Luchar
combate.huir = Huir
combate.estado = Estado

// Los seis iconos de órdenes de cada amigo
orden.atacar = Atacar
orden.poder = Impronergía
orden.apuntadores = Apuntadores
orden.invocar = Invocar
orden.objeto = Objeto
orden.defender = Defender

// Lo que sale si eliges un icono apagado
combate.nada.poder = No sabe ninguna impronergía.
combate.nada.apuntadores = No tiene apuntadores a mano.
combate.nada.invocar = No hay apuntadores en espera.
combate.nada.objeto = No quedan objetos.

// ---------------------------------------------------------------- combate: la línea de arriba

combate.ataca = ¡{quien} ataca!
combate.usa = ¡{quien} usa {poder}!
combate.defiende = {quien} se defiende.
combate.suelta = ¡{quien} suelta a {apuntador}!
combate.pone = {quien} vuelve a poner a {apuntador}.
combate.invoca = ¡{quien} invoca {invocacion}!
combate.objeto = {quien} usa {objeto}.
combate.critico = ¡Golpe crítico!
combate.sin.ip = No hay impronergía suficiente.
combate.sin.apuntadores = Ya no están los apuntadores.
combate.sin.huida = ¡Esta vez no se puede huir!
combate.huye.intento = ¡Intentáis huir!
combate.huye.ok = ¡Habéis escapado!
combate.huye.no = ¡No hay forma de huir!
combate.vuelve = {apuntador} vuelve con {quien}.

// ---------------------------------------------------------------- combate: el final

combate.victoria = ¡Victoria! La función continúa.
combate.exp = Cada uno gana {n} de experiencia.
combate.monedas = Encontráis {n} monedas.
combate.hallado = Encontráis {objeto}.
combate.nivel = ¡{quien} sube al nivel {n}!
combate.aprende = {quien} aprende {poder}.
combate.derrota = Los cuatro se han quedado en el suelo...

// ---------------------------------------------------------------- estado y etiquetas

etiqueta.pv = PV
etiqueta.ip = IP
etiqueta.atk = Ataque
etiqueta.def = Defensa
etiqueta.agi = Agilidad
etiqueta.exp = Exp.
estado.nivel = Nv
estado.ninguno = Sin apuntadores
elemento.tierra = Tierra
elemento.fuego = Fuego
elemento.agua = Agua
elemento.viento = Viento

// ---------------------------------------------------------------- impronergía de combate

poder.siy.nombre = Sí, y...
poder.cajonazo.nombre = Cajonazo
poder.fresquito.nombre = Fresquito
poder.otracana.nombre = Otra caña
poder.cierzo.nombre = Cierzo
poder.abrazo.nombre = Abrazo de oso
poder.cincominutos.nombre = Cinco minutos
poder.chupito.nombre = Chupito flambeado

efecto.y = y...
efecto.chist = ¡Chist!

// ---------------------------------------------------------------- apuntadores e invocaciones

apuntador.chist.nombre = Chist
apuntador.ejem.nombre = Ejem
apuntador.psst.nombre = Psst
apuntador.shhh.nombre = Shhh
apuntador.accion.puesto = Soltar
apuntador.accion.espera = Poner
apuntador.accion.recupera = Dormido
apuntador.estado.puesto = Puesto
apuntador.estado.espera = En espera
apuntador.estado.recupera = Recuperando

invocacion.ovacion.nombre = La ovación
invocacion.calderon.nombre = Calderón

ovacion.grito.1 = ¡Bravo!
ovacion.grito.2 = ¡Otra!
ovacion.grito.3 = ¡Olé!
ovacion.grito.4 = ¡Guapo!

// ---------------------------------------------------------------- objetos

objeto.turron.nombre = Turrón blando
objeto.chupito.nombre = Chupito

// ---------------------------------------------------------------- enemigos (nombre y el nombre de cada ataque)

enemigo.petardo.nombre = Petardo
enemigo.petardo.chispazo = Chispazo
enemigo.petardo.traca = Traca final
enemigo.traca.nombre = Traca gorda
enemigo.traca.chispazo = Chispazo
enemigo.traca.traca = Traca final

enemigo.movil.nombre = Móvil sonando
enemigo.movil.vibracion = Vibración
enemigo.movil.politono = Politono
enemigo.movil2.nombre = Móvil a tope
enemigo.movil2.vibracion = Vibración
enemigo.movil2.politono = Politono

enemigo.spoiler.nombre = Spoiler
enemigo.spoiler.destripe = Destripe
enemigo.spoiler.susurro = Susurro
enemigo.spoiler2.nombre = Spoiler de serie
enemigo.spoiler2.destripe = Destripe
enemigo.spoiler2.susurro = Susurro

enemigo.critico.nombre = Crítico
enemigo.critico.tachon = Tachón
enemigo.critico.critica = Mala crítica
enemigo.critico2.nombre = Crítico de prensa
enemigo.critico2.tachon = Tachón
enemigo.critico2.critica = Mala crítica

enemigo.chist.nombre = Chist
enemigo.chist.soplo = Soplo
enemigo.chist.chistido = Chistido
enemigo.chist.notaalpie = Nota al pie
enemigo.ejem.nombre = Ejem
enemigo.ejem.soplo = Soplo
enemigo.ejem.chistido = Chistido
enemigo.ejem.notaalpie = Nota al pie
enemigo.psst.nombre = Psst
enemigo.psst.soplo = Soplo
enemigo.psst.chistido = Chistido
enemigo.psst.notaalpie = Nota al pie
enemigo.shhh.nombre = Shhh
enemigo.shhh.soplo = Soplo
enemigo.shhh.chistido = Chistido
enemigo.shhh.notaalpie = Nota al pie
enemigo.mosquito.nombre = Mosquito huertano
enemigo.mosquito.picotazo = Picotazo
enemigo.mosquito.zumbido = Zumbido
enemigo.mosquito2.nombre = Mosquito tigre
enemigo.mosquito2.picotazo = Picotazo
enemigo.mosquito2.zumbido = Zumbido
