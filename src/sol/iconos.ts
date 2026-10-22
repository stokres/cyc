// The small pixel icons of the fight: the six orders (Atacar, Impronergía, Apuntadores, Invocar, Objeto,
// Defender), the little prompter («apuntador») in each element and a few more (the shield of a friend who
// defends, the cursors). Everything is painted once into cached canvases.
import { apagar, contorno } from './contorno';
import { COLOR_ELEMENTO, type Elemento } from './grupo';
import { ctx, elipse, lienzo, rect, una } from './pixel';

export type Orden = 'atacar' | 'poder' | 'apuntadores' | 'invocar' | 'objeto' | 'defender';
export const ORDENES: readonly Orden[] = ['atacar', 'poder', 'apuntadores', 'invocar', 'objeto', 'defender'];

/** Pixel line (Bresenham) on a context. */
export function linea(x: CanvasRenderingContext2D, col: string, x0: number, y0: number, x1: number, y1: number) {
  x.fillStyle = col;
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    x.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** The little man of the theatre who whispers the lines from the shell, with his cap, 12×16 (+ outline). */
export function apuntador(el: Elemento, frame = 0): HTMLCanvasElement {
  return una(`apuntador.${el}.${frame % 2}`, () => {
    const col = COLOR_ELEMENTO[el];
    const c = lienzo(12, 16);
    const x = ctx(c);
    const f = frame % 2;
    // legs and feet (he hops)
    rect(x, '#1a1630', 3, 14 - f, 2, 2);
    rect(x, '#1a1630', 7, 14 - f, 2, 2);
    // black prompter's jacket with a white collar and a bow tie in his colour
    rect(x, '#2a2440', 3, 9 - f, 6, 6);
    rect(x, '#ffffff', 4, 9 - f, 4, 1);
    rect(x, col.medio, 5, 10 - f, 2, 1);
    // the script in his hand
    rect(x, '#f4f0e6', 9, 10 - f, 3, 4);
    rect(x, '#9aa0c0', 10, 11 - f, 1, 1);
    rect(x, '#9aa0c0', 10, 13 - f, 1, 1);
    rect(x, '#2a2440', 8, 11 - f, 1, 2);
    // face
    elipse(x, '#f2c8a0', 6, 7 - f, 3.6, 3);
    rect(x, '#2a1c20', 4, 6 - f, 1, 2);
    rect(x, '#2a1c20', 8, 6 - f, 1, 2);
    rect(x, '#b04a4a', 5, 9 - f, 2, 1);
    // the cap: a dome of his element with a brim and a button
    elipse(x, col.medio, 6, 4 - f, 4.6, 2.8);
    rect(x, col.oscuro, 2, 5 - f, 8, 1);
    rect(x, col.claro, 3, 3 - f, 2, 1);
    rect(x, col.claro, 5, 0 - f + 1, 2, 1);
    return contorno(c, '#1c1430');
  });
}

/** The order icons, 16×16 plus the outline. */
export function iconoOrden(o: Orden, apagado = false): HTMLCanvasElement {
  const base = una(`icono.orden.${o}`, () => {
    const c = lienzo(16, 16);
    const x = ctx(c);
    if (o === 'atacar') {
      // a sword, tip up and to the right
      for (let i = 0; i < 10; i++) {
        rect(x, '#f4f8ff', 13 - i, 1 + i, 1, 1);
        rect(x, '#a8b4d8', 14 - i, 1 + i, 1, 1);
      }
      rect(x, '#ffffff', 14, 0, 1, 1);
      linea(x, '#f0c040', 3, 7, 8, 12);
      linea(x, '#d89a20', 4, 7, 8, 11);
      linea(x, '#8a4a24', 3, 10, 1, 12);
      linea(x, '#8a4a24', 4, 11, 2, 13);
      rect(x, '#f0c040', 0, 13, 2, 2);
    } else if (o === 'poder') {
      // a four-pointed star of psynergy with a little one beside it
      for (let i = 0; i < 6; i++) {
        rect(x, '#ffe27a', 7, 2 + i, 1, 1);
        rect(x, '#ffe27a', 7, 12 - i, 1, 1);
        rect(x, '#ffe27a', 2 + i, 7, 1, 1);
        rect(x, '#ffe27a', 12 - i, 7, 1, 1);
      }
      rect(x, '#ffe27a', 5, 6, 5, 3);
      rect(x, '#ffe27a', 6, 5, 3, 5);
      rect(x, '#ffffff', 6, 6, 3, 3);
      rect(x, '#8ad8ff', 13, 2, 1, 3);
      rect(x, '#8ad8ff', 12, 3, 3, 1);
      rect(x, '#ff8ad0', 2, 12, 1, 3);
      rect(x, '#ff8ad0', 1, 13, 3, 1);
    } else if (o === 'apuntadores') {
      const r = lienzo(18, 18);
      ctx(r).drawImage(apuntador('tierra', 0), 2, 0);
      return r;
    } else if (o === 'invocar') {
      // a stage curtain pulled aside, with a light in the middle
      rect(x, '#f0c040', 1, 1, 14, 2);
      rect(x, '#d89a20', 1, 3, 14, 1);
      elipse(x, '#fff0a8', 8, 9, 3.2, 5);
      rect(x, '#d8283a', 1, 4, 5, 10);
      rect(x, '#d8283a', 10, 4, 5, 10);
      rect(x, '#8a1a2a', 3, 4, 1, 10);
      rect(x, '#8a1a2a', 12, 4, 1, 10);
      rect(x, '#f0504a', 2, 4, 1, 9);
      rect(x, '#f0504a', 11, 4, 1, 9);
      rect(x, '#d8283a', 5, 6, 1, 8);
      rect(x, '#d8283a', 10, 6, 1, 8);
      rect(x, '#f0c040', 1, 14, 3, 1);
      rect(x, '#f0c040', 12, 14, 3, 1);
      rect(x, '#ffffff', 8, 7, 1, 2);
    } else if (o === 'objeto') {
      // a bag tied with a cord
      elipse(x, '#c88a4a', 8, 10, 6, 5);
      rect(x, '#c88a4a', 5, 3, 6, 4);
      rect(x, '#e8b070', 4, 8, 2, 4);
      rect(x, '#8a5a2a', 11, 9, 2, 4);
      rect(x, '#8a5a2a', 5, 7, 6, 1);
      rect(x, '#d8283a', 4, 2, 8, 1);
      rect(x, '#d8283a', 3, 1, 3, 1);
      rect(x, '#d8283a', 10, 1, 3, 1);
      rect(x, '#f4f0e6', 6, 10, 4, 3);
      rect(x, '#8a5a2a', 7, 11, 2, 1);
    } else {
      // a shield with a gold rim
      rect(x, '#f0c040', 2, 1, 12, 2);
      rect(x, '#f0c040', 2, 1, 2, 8);
      rect(x, '#f0c040', 12, 1, 2, 8);
      rect(x, '#f0c040', 3, 9, 10, 2);
      rect(x, '#f0c040', 5, 11, 6, 2);
      rect(x, '#f0c040', 7, 13, 2, 2);
      rect(x, '#4a7ae8', 4, 3, 8, 6);
      rect(x, '#4a7ae8', 4, 9, 8, 1);
      rect(x, '#4a7ae8', 5, 10, 6, 1);
      rect(x, '#4a7ae8', 6, 11, 4, 1);
      rect(x, '#4a7ae8', 7, 12, 2, 1);
      rect(x, '#8ab4ff', 4, 3, 3, 4);
      rect(x, '#2a4aa8', 9, 5, 3, 5);
      rect(x, '#ffffff', 5, 4, 1, 2);
    }
    return contorno(c, '#0a0f3a');
  });
  return apagado ? una(`icono.orden.${o}.off`, () => apagar(base)) : base;
}

/** The little shield over a friend who is defending, 9×10. */
export const escudito = () =>
  una('escudito', () => {
    const c = lienzo(8, 9);
    const x = ctx(c);
    rect(x, '#f0c040', 0, 0, 8, 2);
    rect(x, '#f0c040', 0, 0, 1, 5);
    rect(x, '#f0c040', 7, 0, 1, 5);
    rect(x, '#f0c040', 1, 5, 6, 1);
    rect(x, '#f0c040', 2, 6, 4, 1);
    rect(x, '#f0c040', 3, 7, 2, 1);
    rect(x, '#4a7ae8', 1, 2, 6, 3);
    rect(x, '#8ab4ff', 1, 2, 2, 2);
    rect(x, '#4a7ae8', 2, 5, 4, 1);
    rect(x, '#4a7ae8', 3, 6, 2, 1);
    return contorno(c, '#0a0f3a');
  });

/** A downward arrow that marks the friend whose turn it is, 7×6. */
export const flechita = () =>
  una('flechita', () => {
    const c = lienzo(7, 5);
    const x = ctx(c);
    rect(x, '#ffe27a', 0, 0, 7, 1);
    rect(x, '#ffe27a', 1, 1, 5, 1);
    rect(x, '#ffe27a', 2, 2, 3, 1);
    rect(x, '#ffe27a', 3, 3, 1, 1);
    return contorno(c, '#3a2008');
  });
