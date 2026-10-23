// Hojas de prueba de arte «anime» para el capítulo 2 (primeros planos de conversación).
// Cada hoja es un SVG de 844×390 que se hornea una vez; no está enganchado al juego.
import { hojaPabloVero as a1, hojaFranGuille as a2 } from './estilo-a.mjs';
import { hojaPabloVeroB as b1 } from './estilo-b.mjs';
import { hojaPabloVeroC as c1 } from './estilo-c.mjs';

export function hojas() {
  return {
    'estilo-a-pablo-vero': a1(),
    'estilo-b-pablo-vero': b1(),
    'estilo-c-pablo-vero': c1(),
    'estilo-a-fran-guille': a2(),
  };
}
