// The small things every rule uses: score, announcements, floating numbers, new bubbles.
import { texto } from '../juego/textos';
import { burbuja, estallido } from './arte/sprites';
import { rotulo } from './hud';
import { ALTURA_BOTE, BARRA_LLENA, VEL_BURBUJA, type Burbuja, type Mundo } from './mundo';
import { RADIO, type ColorBola, type Talla, type Variante } from './tipos';

/** An extra life every this many points. */
const PUNTOS_POR_VIDA = 20000;

export const velocidadBurbujas = (m: Mundo) => VEL_BURBUJA * (m.fase.prisa ?? 1);

/** A floating number (or short word) that rises and fades. */
export function popup(m: Mundo, x: number, y: number, txt: string, color = '#ffffff') {
  if (m.popups.length < 24) m.popups.push({ x, y, t: 0, img: rotulo(txt, color) });
}

/** Adds points; with a position, shows them floating there. Every 20 000 gives a life. */
export function sumar(m: Mundo, puntos: number, x?: number, y?: number) {
  m.puntos += puntos;
  m.hudSucio = true;
  if (x !== undefined && y !== undefined) popup(m, x, y, String(puntos));
  while (m.puntos >= m.siguienteVida) {
    m.siguienteVida += PUNTOS_POR_VIDA;
    vidaExtra(m);
  }
}

export function vidaExtra(m: Mundo) {
  m.vidas++;
  m.hudSucio = true;
  m.sfx.vidaExtra();
  avisar(m, 'hud.vida');
}

/** The big line in the middle of the play area (texts: `hud.*`). */
export function avisar(m: Mundo, clave: string, color = '#ffd36a') {
  m.aviso = { img: rotulo(texto(clave), color, 16), t: 0 };
}

export function llenarBarra(m: Mundo, n: number) {
  m.barra = Math.min(BARRA_LLENA, m.barra + n);
}

/** A bubble with the right size, look and speed. `vx`/`vy` in px/s. */
export function crearBurbuja(m: Mundo, x: number, y: number, talla: Talla, variante: Variante, color: ColorBola, vx: number, vy: number): Burbuja {
  return {
    id: m.sigId++,
    x,
    y,
    vx,
    vy,
    r: RADIO[talla],
    bote: variante === 'posavasos' ? 0 : ALTURA_BOTE[talla],
    talla,
    variante,
    color,
    img: burbuja(variante, talla, color),
  };
}

/** The puff of a burst bubble (or a piece of an exploding boss) at a point. */
export function efectoPop(m: Mundo, x: number, y: number, variante: Variante, talla: Talla, retraso = 0) {
  m.efectos.push({ x, y, t: -retraso, frames: estallido(variante, talla) });
}
