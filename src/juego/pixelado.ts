// The way into the handheld console (chapter 2, Alacant Sun): the reverse of its way out. At the end of the
// Sol the whole console shrinks to a point and the bar is back; here the bar itself goes the other way: the
// picture on screen (scenery and characters) loses its resolution in steps, as if the night were being
// squashed into pixels, and shrinks, squeezed to the shape of a handheld's screen, until it lands exactly
// on the console's screen, which was waiting underneath.
//
// Cost (docs/ESTILO.md, T5): one snapshot of what is on screen (Motor.instantanea, the characters rasterised
// once), then one small canvas redrawn a handful of times with timers and one CSS animation for the shrink.
// No frame loop, no filter and no SVG drawn again.
import type { Aventura } from './aventura';

/** How many pixels across the picture is at each step of the pixelation, as a fraction of the screen's width. */
const PASOS = [0.5, 0.25, 0.12, 0.06, 0.04];

/**
 * Runs `lanzar` (which puts the console on screen, covering everything: `jugarSol`) under a pixelated copy
 * of the bar and brings the copy down onto the console's screen. Resolves with what `lanzar` resolves, when
 * the game is over; the bar is back as it was.
 */
export async function entrarEnConsola<T>(g: Aventura, lanzar: () => Promise<T>, pantalla = '.sol-pantalla'): Promise<T> {
  const ritmo = g.rapido ? 0.25 : 1;
  const raiz = g.root;
  const caja = raiz.getBoundingClientRect();
  const foto = await g.motor.instantanea(Math.min(caja.width, 1000));
  const pix = document.createElement('canvas');
  pix.className = 'pixelado';
  const poner = (columnas: number) => {
    pix.width = Math.max(2, Math.round(columnas));
    pix.height = Math.max(2, Math.round((columnas * foto.height) / foto.width));
    const x = pix.getContext('2d')!;
    x.imageSmoothingEnabled = true;
    x.drawImage(foto, 0, 0, pix.width, pix.height);
  };
  poner(foto.width);
  raiz.append(pix);
  // The console goes under the copy at once (it is opaque), and the game starts there.
  const juego = lanzar();
  const dest = raiz.querySelector<HTMLElement>(pantalla)?.getBoundingClientRect();
  // Down in resolution, step by step, with a little shake of the whole thing.
  for (const f of PASOS) {
    poner(foto.width * f);
    pix.style.transform = `translate(${Math.round((Math.random() - 0.5) * 8)}px, ${Math.round((Math.random() - 0.5) * 6)}px)`;
    await g.esperar(110 * ritmo);
  }
  pix.style.transform = '';
  // And in: shrunk and squeezed onto the console's screen.
  if (dest && typeof pix.animate === 'function') {
    const sx = dest.width / caja.width;
    const sy = dest.height / caja.height;
    const tx = dest.left - caja.left;
    const ty = dest.top - caja.top;
    const a = pix.animate(
      [
        { transform: 'translate(0,0) scale(1,1)', offset: 0 },
        { transform: `translate(${tx * 0.5}px,${ty * 0.5}px) scale(${(1 + sx) / 2},${(1 + sy) / 2}) rotate(-2deg)`, offset: 0.5 },
        { transform: `translate(${tx}px,${ty}px) scale(${sx},${sy})`, offset: 1 },
      ],
      { duration: 1000 * ritmo, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' },
    );
    await new Promise<void>((fin) => {
      a.onfinish = () => fin();
      a.oncancel = () => fin();
    });
    // It lands on a grid of the console's own: 240 by 160.
    poner(240);
    await g.esperar(150 * ritmo);
  }
  pix.remove();
  pix.width = pix.height = 0;
  return juego;
}
