// PokéUsera · baked backdrops and plates: the Bar del Brío (one canvas per screen height), the plum tray
// under the battle's text box and menus, and the half-size thumbnails of the useritos (32×32, made once
// by averaging 2×2 blocks of the 64×64 art, so the little ones stay crisp and keep their colours).
import { fondoBar, plataforma } from '../arte2/escena2';
import { hornear } from '../arte2/ui2';
import { spriteFrente2 } from '../arte2/sprites2';
import { ANCHO } from '../pantalla';

const barras = new Map<number, HTMLCanvasElement>();

/** The Bar del Brío at the logical width and `alto`, optionally dimmed with a plum veil (menus, title). */
export function dibujarFondoBar(ctx: CanvasRenderingContext2D, alto: number, oscuro = 0) {
  let c = barras.get(alto);
  if (!c) {
    c = fondoBar(ANCHO, alto);
    barras.set(alto, c);
  }
  ctx.drawImage(c, 0, 0);
  if (oscuro > 0) {
    ctx.fillStyle = `rgba(48,30,56,${oscuro})`;
    ctx.fillRect(0, 0, ANCHO, alto);
  }
}

/** The tray under the field: a plum gradient with a gold line on top, from `y` to the bottom. */
export function dibujarBandeja(ctx: CanvasRenderingContext2D, y: number, alto: number) {
  const h = alto - y;
  const c = hornear(`bandeja|${h}`, ANCHO, h, (cx) => {
    const g = cx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#5a4660');
    g.addColorStop(1, '#3b2a3f');
    cx.fillStyle = g;
    cx.fillRect(0, 0, ANCHO, h);
    cx.fillStyle = '#e0a83a';
    cx.fillRect(0, 0, ANCHO, 1);
    cx.fillStyle = '#8a6a8a';
    cx.fillRect(0, 1, ANCHO, 1);
  });
  ctx.drawImage(c, 0, y);
}

const plataformas = new Map<string, HTMLCanvasElement>();

/** A beer-mat platform, baked once per size. */
export function plataformaCacheada(rx: number, ry: number): HTMLCanvasElement {
  const k = `${rx}|${ry}`;
  let c = plataformas.get(k);
  if (!c) {
    c = plataforma(rx, ry);
    plataformas.set(k, c);
  }
  return c;
}

let lector: CanvasRenderingContext2D | null = null;
/** Pixels of a baked canvas, read through one small software canvas (so the GPU canvases are never read back). */
function leer(cv: HTMLCanvasElement): Uint8ClampedArray {
  if (!lector) {
    const c = document.createElement('canvas');
    lector = c.getContext('2d', { willReadFrequently: true })!;
  }
  const c = lector.canvas;
  c.width = cv.width;
  c.height = cv.height;
  lector.clearRect(0, 0, c.width, c.height);
  lector.drawImage(cv, 0, 0);
  return lector.getImageData(0, 0, c.width, c.height).data;
}

const miniaturas = new Map<string, HTMLCanvasElement>();

/** The 32×32 thumbnail of a userito (front, frame 0). */
export function miniatura(id: string): HTMLCanvasElement {
  let m = miniaturas.get(id);
  if (m) return m;
  const src = spriteFrente2(id, 0);
  const d = leer(src);
  m = document.createElement('canvas');
  m.width = m.height = 32;
  const mx = m.getContext('2d')!;
  const out = mx.createImageData(32, 32);
  for (let j = 0; j < 32; j++) {
    for (let i = 0; i < 32; i++) {
      let n = 0;
      let R = 0;
      let G = 0;
      let B = 0;
      for (let b = 0; b < 4; b++) {
        const k = ((j * 2 + (b >> 1)) * 64 + i * 2 + (b & 1)) * 4;
        if (d[k + 3] > 0) {
          n++;
          R += d[k];
          G += d[k + 1];
          B += d[k + 2];
        }
      }
      if (n >= 2) {
        const o = (j * 32 + i) * 4;
        out.data[o] = R / n;
        out.data[o + 1] = G / n;
        out.data[o + 2] = B / n;
        out.data[o + 3] = 255;
      }
    }
  }
  mx.putImageData(out, 0, 0);
  miniaturas.set(id, m);
  return m;
}

/** Lowest opaque row of a sprite (so every userito stands on the same line), computed once. */
const pies = new Map<HTMLCanvasElement, number>();
export function pieSprite(cv: HTMLCanvasElement): number {
  let p = pies.get(cv);
  if (p === undefined) {
    const d = leer(cv);
    p = 0;
    for (let y = cv.height - 1; y >= 0 && !p; y--) {
      for (let x = 0; x < cv.width; x++) {
        if (d[(y * cv.width + x) * 4 + 3]) {
          p = y;
          break;
        }
      }
    }
    pies.set(cv, p);
  }
  return p;
}
