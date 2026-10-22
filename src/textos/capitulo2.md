# Capítulo 2 · La noche del Brío

<!--
CÓMO EDITAR ESTE ARCHIVO
Todo lo que se dice en el juego está aquí. Cámbialo a tu gusto y recarga.

  ## clave                     empieza un bloque de diálogo (no cambies la clave)
  FRAN: texto                  lo dice Fran (también PABLO, CHUCHI, GUILLE, ACEITUNA)
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

canto.instrucciones = Toca a cada uno cuando se ilumine para que cante su parte
canto.silabas = Ca-mio-neees-y-ca-ra-va-naaas
canto.fallo = ¡Desafinado! Otra vez
canto.segunda = ¡Otra vez, más fuerte!
canto.gana = ¡CAMIONEEES Y CARAVANAAAS!
