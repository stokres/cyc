# Alacant Sun (el juego de Pablo)

<!--
CÓMO EDITAR ESTE ARCHIVO
Todo lo que se lee en «Alacant Sun» está aquí. Mismo formato que capitulo1.md, pero solo con textos sueltos:

  clave = texto                un texto. Quién lo dice sale de la clave: madre.*, aldeano.* y pablo.*
                               enseñan su retrato en la ventanita; el resto lo cuenta el narrador.
  [contento] texto             al principio de un texto, el que habla sonríe (ojos en ^^)
  madre.no.1, madre.no.2...    se van usando por turnos cada vez que Pablo dice que no
  clave.1, clave.2, clave.3    líneas de una conversación: salen una tras otra, cada una en su ventana

La letra del juego es de píxeles y solo tiene A-Z, a-z, 0-9, las tildes, la ü, la ñ, ¿ ¡ y . , : ; ! ? ' " - ( )
Un texto largo se parte solo en ventanas de tres líneas. Mejor corto que largo.
Los textos son provisionales: los revisará Jesús junto con el resto.
-->

// ---------------------------------------------------------------- título y consola

titulo.pie = PARA PABLO, CON CARIÑO
titulo.pulsa = PULSA A
consola.marca = CAMIONES Y CARAVANAS
consola.modelo = SOL PORTÁTIL
consola.start = START

// ---------------------------------------------------------------- interfaz

hud.ip = IP
poder.nombre = Sí, y...
nombre.pablo = Pablo
nombre.madre = Mamá
nombre.aldeano = Tío Vicent
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
fin.2 = Sí, y la noche acaba de empezar.
fin.continuara = CONTINUARÁ...
