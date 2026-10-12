# Camiones y Caravanas · PANG

<!--
CÓMO EDITAR ESTE ARCHIVO
Todo lo que se dice en el Pang está aquí. Mismo formato que capitulo1.md:

  ## clave                     un bloque de diálogo (no cambies la clave)
  FRAN: texto                  lo dice Fran (también PABLO, CHUCHI, GUILLE, ACEITUNA, SOMBRA)
  FRAN (contento): texto       con cara: normal, contento, sorprendido, nervioso, triste, enfadado, chulo
  > texto                      lo cuenta el narrador
  clave = texto                un texto suelto
  {n}                          el juego lo cambia por un número

Los diálogos «## fase.N» salen antes de cada fase y «## fase.N.fin» al superarla
(los dos son opcionales: si borras uno, esa fase empieza o acaba sin conversación).
Los textos en MAYÚSCULAS van dentro de la recreativa, en letra de píxeles: cortos.
-->

// ---------------------------------------------------------------- título y menú

titulo = CAMIONES Y CARAVANAS
titulo.pang = PANG
titulo.sub = La vuelta al mundo de la penúltima
titulo.empezar = Toca para empezar
menu.nueva = Partida nueva
menu.seguir = Seguir en la fase {n}
menu.fases = Elegir fase
menu.records = Récords
menu.ajustes = Ajustes
menu.musica = Música
menu.efectos = Efectos
menu.volver = Volver
menu.pausa = Pausa
menu.reanudar = Seguir jugando
menu.salir = Salir al menú
menu.seguro = ¿Seguro? Toca otra vez
menu.ayuda = ◀ ▶ para andar. Disparo para lanzar el arpón hacia arriba. Cuando la barra se llena, Especial. Las burbujas grandes se parten en dos pequeñas; la más pequeña revienta. Que no te toque ninguna.
fases.titulo = Elegir fase
fases.bloqueada = Llega hasta aquí para desbloquearla
cargando = Encendiendo la recreativa…
girar = Gira el móvil para jugar
dialogo.saltar = Saltar
nombre.sombra = El narrador

// ---------------------------------------------------------------- elegir personaje

elegir.titulo = ¿Quién entra en la máquina?
elegir.cambiar = Cambiar de personaje
elegir.jugar = ¡A jugar!
elegir.paso = Paso
elegir.arma = Disparo
elegir.poder = Especial

pj.fran.paso = Lento pero seguro
pj.fran.arma = Arpón doble
pj.fran.arma.texto = Lanza dos arpones a la vez.
pj.fran.poder = ¡Una más!
pj.fran.poder.texto = Aquí no se va nadie: las burbujas se quedan quietas unos segundos.

pj.pablo.paso = Normal
pj.pablo.arma = Arpón de impro
pj.pablo.arma.texto = Se clava en el techo y se queda un rato. Nunca dice que no.
pj.pablo.poder = ¡Sí, y…!
pj.pablo.poder.texto = Todo se va de las manos: cada burbuja de la pantalla se parte a la vez.

pj.chuchi.paso = El más rápido
pj.chuchi.arma = Ráfaga
pj.chuchi.arma.texto = Disparos cortos y rápidos, como en su Space Invaders.
pj.chuchi.poder = Modo kinki
pj.chuchi.poder.texto = Unos segundos de ráfaga triple que atraviesa las burbujas.

pj.guille.paso = Normal
pj.guille.arma = Arpón ancho
pj.guille.arma.texto = El más alto del grupo lleva el arpón más gordo.
pj.guille.poder = Abrazo de oso
pj.guille.poder.texto = Un escudo de cariño que aguanta un golpe y, al romperse, revienta lo que tiene cerca.

// ---------------------------------------------------------------- dentro de la recreativa (letra de píxeles)

hud.fase = FASE {n}
hud.tiempo = TIEMPO
hud.puntos = PUNTOS
hud.especial = ESPECIAL
hud.listo = ¡LISTOS!
hud.ya = ¡YA!
hud.superada = ¡FASE SUPERADA!
hud.bonus = BONUS DE TIEMPO
hud.sinTiempo = ¡SE ACABÓ EL TIEMPO!
hud.tocado = ¡AY!
hud.jefe.robi = ROBI
hud.jefe.peor = EL PEOR
hud.jefe.penultima = LA PENÚLTIMA
hud.gorrito = ¡CON GORRITO NO!
hud.cierzo = CIERZO
hud.vida = ¡UNA CAÑA MÁS!
hud.poder.penultima = ¡UNA MÁS!
hud.poder.siy = ¡SÍ, Y…!
hud.poder.kinki = ¡MODO KINKI!
hud.poder.abrazo = ¡ABRAZO DE OSO!
hud.reloj = ¡QUIETAS!
hud.chupito = ¡CHUPITO!
hud.escudo = ESCUDO
hud.record = ¡RÉCORD!

boton.disparo = Disparo
boton.especial = Especial
boton.pausa = Pausa

// ---------------------------------------------------------------- las fases

fase.1.nombre = USERA
fase.1.lugar = El dragón
fase.2.nombre = USERA
fase.2.lugar = La calle de Fran
fase.3.nombre = USERA
fase.3.lugar = El piso de Fran
fase.4.nombre = BOLILANDIA
fase.4.lugar = El parque de bolas
fase.5.nombre = LAVAPIÉS
fase.5.lugar = El teatro
fase.6.nombre = LA GRANJA
fase.6.lugar = La báscula
fase.7.nombre = MADRID RÍO
fase.7.lugar = El Manzanares
fase.8.nombre = ÁVILA
fase.8.lugar = La muralla
fase.9.nombre = ZARAGOZA
fase.9.lugar = El Pilar
fase.10.nombre = JIJONA
fase.10.lugar = El turrón blando
fase.11.nombre = NEVADA
fase.11.lugar = El desierto
fase.12.nombre = LAS VEGAS
fase.12.lugar = La Penúltima

// ---------------------------------------------------------------- continuar y fin de partida

continuar.titulo = ¿Continuar?
continuar.texto = Empiezas otra vez la fase {n} con tres vidas. Los puntos vuelven a cero.
continuar.si = Continuar
continuar.no = Al menú
fin.titulo = Fin de la partida
records.titulo = Récords
records.vacio = Todavía no hay partidas. Ya tardas.
records.fase = fase {n}
records.nuevo = ¡Récord!
records.cyc = CYC
final.titulo = FIN
final.gracias = Gracias por jugar
final.puntos = {n} puntos

// ---------------------------------------------------------------- historia

## intro
> Bar del Brío. Jueves, 21:00. Cuatro amigos acaban de llegar.
FRAN (contento): Cuatro jarras grandes, Vero. Y unas bravas. Y luego otras cuatro jarras.
PABLO (contento): Esta noche pide himno. Escuchad: ¡pam, parapam, pam, pam!
> Pablo se arranca con el pasodoble de las fiestas del pueblo. Pero solo le salen dos palabras.
PABLO (chulo): ¡Camioneees y caravanaaas!
> En el rincón, la recreativa vieja que nunca funciona se enciende sola. «INSERT COIN». Nadie ha echado moneda.
CHUCHI (sorprendido): Esa máquina lleva enchufada desde el noventa y ocho. No la he visto encendida en la vida.
GUILLE (contento): ¡Uy, qué bonica! ¿Una partidica?
> La pantalla tira de ellos como una aspiradora. Fran se agarra a la barra. La barra se va con Fran.
SOMBRA (chulo): Bienvenidos a la máquina. Aquí dentro todo es espuma, y la espuma no se acaba nunca.
PABLO (sorprendido): ¿Tú también te has metido?
SOMBRA: Yo voy donde vayas tú. Y narro lo que pase. Que ayude ya es otra cosa.
SOMBRA (chulo): Os presento a la dueña de la máquina: la Penúltima. Una jarra que no quiere que esta noche termine nunca.
FRAN (contento): Hombre, dicho así no suena tan mal.
SOMBRA: Para salir, la vuelta al mundo. Doce pantallas. La última, en Las Vegas.
CHUCHI (contento): Burbujas que se parten en dos. Esto es el Pang. Le he echado más monedas que a la hucha de mis hijas.
GUILLE (contento): ¡Pues venga, a por ellas!

## fase.1
> Usera. El dragón del parque, a la hora de la siesta de los dragones. Una burbuja de espuma bota hacia vosotros.
SOMBRA: El arpón, hacia arriba. Una grande se parte en dos medianas, y así hasta que no queda nada. Fácil. De momento.

## fase.2
FRAN (contento): ¡Mi calle! Ese es mi portal. Y ahí al fondo, el Brío.
PABLO (contento): Un bar dentro de una máquina dentro de un bar. Metateatro del bueno.
CHUCHI: Ojo con los contenedores: el arpón no pasa.

## fase.3
FRAN (sorprendido): ¡Mi salón! ¿Y esa que corre por ahí...?
ACEITUNA (contento): ¡Guau!
FRAN (contento): ¡Aceituna! Si pasa corriendo, dejadla, que va soltando taquitos. Es una señora.
GUILLE: Los cojines se rompen. Fran, luego los recoges tú.

## fase.4
CHUCHI (nervioso): No. Bolilandia otra vez, no.
> Del fondo del parque de bolas sale botando una cabeza de robot con un gorrito de fiesta.
CHUCHI (sorprendido): ¡Robi! ¡Pero si te apagué!
SOMBRA (chulo): Aquí dentro todo vuelve. Con el gorrito puesto no le hacéis nada. Esperad a que se lo quite.
GUILLE (triste): Pobrecico. Si solo quiere un abrazo de cumpleaños.

## fase.4.fin
> Robi se apaga entre bolas de colores. Por última vez. Seguramente.
CHUCHI (contento): Feliz cumpleaños, Robi. De verdad.

## fase.5
PABLO (contento): El teatro. Mi casa.
> Las luces se apagan de golpe.
SOMBRA (chulo): Mi casa también. Y aquí la luz la llevo yo.
PABLO (enfadado): ¡Enciende eso!
SOMBRA: Os dejo un foco. Uno. El drama, a oscuras, gana mucho.

## fase.6
GUILLE (contento): ¡La granja! Huele a casa.
CHUCHI: Huele a purín, Guille.
GUILLE (contento): Eso he dicho.
> Algo enorme se mueve en la cuadra. Ciento cincuenta y dos kilos de mala leche.
GUILLE (nervioso): Es el Peor. Cada vez que le deis, soltará cerdicos. Reventadlos también, sin cariño.

## fase.6.fin
GUILLE (contento): ¡Pesado y medido! Ciento cincuenta y dos kilos. Ya tengo el dato para la tesis.

## fase.7
> Madrid Río. A orillas del Manzanares, las burbujas ya no caen: van de lado a lado como posavasos voladores.
CHUCHI (sorprendido): Esto ya no es el Pang que yo jugaba.
SOMBRA (chulo): Es el remix.

## fase.8
FRAN (contento): ¡Ávila! ¡Aupa! ¡Mi tierra!
PABLO (chulo): ¿Tú no eras vasco?
FRAN: Vasco de corazón, de Ávila de nacimiento y de Usera de cañas. Todo a la vez.
GUILLE: Hay escaleras en la muralla. Arriba se dispara mejor.

## fase.9
GUILLE (contento): ¡Zaragoza! ¡El Pilar! ¡Mi casica!
> Sopla el cierzo. Las burbujas van de lado. Los cuatro, también.
GUILLE (contento): Esto es una brisica. Vosotros agarraos, por si acaso.

## fase.10
PABLO (contento): Mi pueblo. Turrón blando, del bueno, del de verdad.
CHUCHI: Los bloques son de turrón. ¿Se pueden comer?
PABLO: Se pueden romper. Comer, luego. Primero el formato.

## fase.11
> El desierto de Nevada. Una caravana vieja flota en el cielo y nadie sabe por qué.
CHUCHI (nervioso): ¿Por qué me da la sensación de que esto ya lo he vivido?
PABLO: Será un recuerdo del futuro.
SOMBRA (chulo): Nada de spoilers. Y daos prisa, que aquí el tiempo corre más.

## fase.12
> Las Vegas. Neones, máquinas tragaperras y una jarra gigante que no cabe en el escenario.
SOMBRA: Ahí la tenéis. La Penúltima.
> La jarra se relame la espuma y habla con voz de bar a las tres de la mañana: «Una más... y nos vamos».
FRAN (sorprendido): ¡Oye, que eso lo digo yo!
CHUCHI: Por eso es tan fuerte, Fran. La has criado tú.
GUILLE (contento): ¡A por ella, que mañana se madruga!

## final
> La Penúltima revienta en una lluvia de espuma dorada.
PABLO (contento): Ahora sí. Todos juntos. Una, dos y...
> «¡Camioneees y caravanaaas!»
> La máquina tiembla, chisporrotea y los escupe uno detrás de otro sobre el suelo del Brío.
FRAN (sorprendido): ¿Cuánto rato hemos estado ahí dentro?
CHUCHI: Según el móvil, dos minutos.
GUILLE (contento): ¡Pues las jarras siguen frías!
> En la pantalla de la recreativa sale la tabla de récords. Arriba del todo, unas iniciales que nadie ha escrito: CYC.
PABLO (chulo): Camiones y Caravanas. Eso suena a leyenda.
> Desde la barra, Vero: «Vamos cerrando, chicos».
FRAN (contento): Una más y nos vamos.
SOMBRA: Y así empezó todo. Pero lo que pasó después... es otra historia.
