// La entrada a Impropios Kart (capítulo 2, tramo final): el suelo del bar se pone en perspectiva, gira y crece
// hasta llenarlo todo, y debajo ya está la pista. Es la hermana de `entrarEnConsola` (src/juego/pixelado.ts) y
// cuesta lo mismo: UNA instantánea de lo que hay en pantalla (el decorado y los personajes, pasados a imagen
// una vez con `Motor.instantanea`) y una animación CSS con perspectiva sobre ese lienzo. Ni bucle propio ni
// filtros ni SVG dibujado de nuevo (docs/ESTILO.md, T5).
import type { Aventura } from './aventura';

/**
 * Lanza `lanzar` (que pone el juego encima de todo: `jugarKart`) bajo una copia del bar que se tumba, gira y se
 * agranda como el suelo de una pista, y la quita cuando ya llena la pantalla. Devuelve lo que devuelva `lanzar`
 * cuando acabe el juego.
 */
export async function entrarEnPista<T>(g: Aventura, lanzar: () => Promise<T>): Promise<T> {
  const ritmo = g.rapido ? 0.2 : 1;
  const raiz = g.root;
  const caja = raiz.getBoundingClientRect();
  const foto = await g.motor.instantanea(Math.min(caja.width, 1000));
  const marco = document.createElement('div');
  marco.className = 'entrada-pista';
  const lienzo = document.createElement('canvas');
  lienzo.width = foto.width;
  lienzo.height = foto.height;
  lienzo.getContext('2d')!.drawImage(foto, 0, 0);
  marco.append(lienzo);
  raiz.append(marco);
  // El juego arranca debajo a la vez (es opaco y se carga mientras el suelo gira).
  const juego = lanzar();
  if (typeof lienzo.animate === 'function') {
    const giro = lienzo.animate(
      [
        { transform: 'perspective(900px) rotateX(0deg) rotateZ(0deg) scale(1)', offset: 0 },
        { transform: 'perspective(900px) rotateX(58deg) rotateZ(0deg) scale(1.15)', offset: 0.34, easing: 'ease-in-out' },
        { transform: 'perspective(900px) rotateX(64deg) rotateZ(220deg) scale(2.2)', offset: 0.68 },
        { transform: 'perspective(900px) rotateX(70deg) rotateZ(540deg) scale(5.5)', offset: 1 },
      ],
      { duration: 2300 * ritmo, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' },
    );
    await new Promise<void>((fin) => {
      giro.onfinish = () => fin();
      giro.oncancel = () => fin();
    });
    // Un último destello y la pista queda a la vista.
    const sale = marco.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260 * ritmo, fill: 'forwards' });
    await new Promise<void>((fin) => {
      sale.onfinish = () => fin();
      sale.oncancel = () => fin();
    });
  } else await g.esperar(400);
  marco.remove();
  lienzo.width = lienzo.height = 0;
  foto.width = foto.height = 0;
  return juego;
}
