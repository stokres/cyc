// Pablo's bedroom at night: a small room seen from above in 3/4 (the original's rooms are smaller than the
// screen, with black around). The room is painted once; the bed's pieces and the window's panes are
// separate because Pablo and the lightning change them.
import { elipse, ctx, lienzo, mezcla, noche, rect, una } from './pixel';
import { TINTE_OBJETO } from './arte';
import type { Lectura, Objeto, Rect } from './mapas';

export const ANCHO_CUARTO = 224;
export const ALTO_CUARTO = 144;
/** Where the room goes on the 240×160 screen. */
export const CUARTO_X = 8;
export const CUARTO_Y = 8;
/** The wall's base: nothing walks above it. */
export const BASE_PARED = 48;

const madera = '#b27a43';
const maderaO = '#85582f';
const maderaL = '#d39d62';

export interface Cuarto {
  fondo: HTMLCanvasElement;
  /** The bed in pieces: frame and pillow, and the blanket over it (made, and thrown back). */
  cama: { base: HTMLCanvasElement; manta: HTMLCanvasElement; mantaAbierta: HTMLCanvasElement; x: number; y: number; almohada: { x: number; y: number } };
  /** The window's glass: dark and lit by lightning. */
  ventana: { x: number; y: number; oscura: HTMLCanvasElement; clara: HTMLCanvasElement };
  /** The beam of moonlight on the floor, brighter at each lightning flash. */
  haz: HTMLCanvasElement;
  objetos: Objeto[];
  rects: Rect[];
  lecturas: Lectura[];
  /** The door: stepping in it leaves the room. */
  puerta: Rect;
  /** Where Pablo is put when he comes in, and the mother's place. */
  inicio: { x: number; y: number };
  madre: { x: number; y: number };
  /** The candle's place (for its flicker). */
  vela: { x: number; y: number };
}

export function cuarto(): Cuarto {
  return una('cuarto', construir);
}

function cama() {
  const base = lienzo(36, 52);
  const x = ctx(base);
  // frame
  rect(x, maderaO, 0, 6, 36, 46);
  rect(x, madera, 1, 7, 34, 44);
  // headboard with rounded top
  rect(x, maderaO, 0, 0, 36, 9);
  rect(x, madera, 1, 1, 34, 7);
  rect(x, maderaL, 2, 1, 32, 1);
  rect(x, '#5a381c', 0, 8, 36, 1);
  // mattress and sheet
  rect(x, '#e9e6f0', 3, 9, 30, 41);
  rect(x, '#c7c3d6', 3, 48, 30, 2);
  // pillow
  rect(x, '#9d98b2', 6, 11, 24, 12);
  rect(x, '#f4f1fb', 6, 10, 24, 11);
  rect(x, '#ffffff', 7, 10, 22, 1);
  rect(x, '#d8d4e6', 8, 18, 20, 2);
  noche(base, TINTE_OBJETO);
  const manta = lienzo(36, 52);
  const m = ctx(manta);
  // patchwork quilt: squares in the colours of a village fiesta
  const cols = ['#2f9a8a', '#e0a22a', '#c0392b', '#3a7ac8'];
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 5; i++) {
      rect(m, cols[(i + j) % 4], 3 + i * 6, 25 + j * 6, 6, 6);
      rect(m, mezcla(cols[(i + j) % 4], '#ffffff', 0.25), 3 + i * 6, 25 + j * 6, 6, 1);
      rect(m, '#ffffff', 5 + i * 6, 27 + j * 6, 1, 1);
    }
  }
  rect(m, '#f4f1fb', 3, 22, 30, 4); // the folded sheet
  rect(m, '#c7c3d6', 3, 25, 30, 1);
  rect(m, '#9a2a24', 3, 49, 30, 2);
  rect(m, maderaO, 0, 48, 36, 4);
  rect(m, madera, 1, 48, 34, 2);
  noche(manta, TINTE_OBJETO);
  // thrown back: the quilt bunched at the foot
  const abierta = lienzo(36, 52);
  const a = ctx(abierta);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 5; i++) {
    rect(a, cols[(i + j + 1) % 4], 3 + i * 6, 38 + j * 6, 6, 6);
    rect(a, mezcla(cols[(i + j + 1) % 4], '#ffffff', 0.25), 3 + i * 6, 38 + j * 6, 6, 1);
  }
  rect(a, '#f4f1fb', 3, 34, 30, 4);
  rect(a, '#9a2a24', 3, 49, 30, 2);
  rect(a, maderaO, 0, 48, 36, 4);
  rect(a, madera, 1, 48, 34, 2);
  // the rumpled sheet's folds
  rect(a, '#c7c3d6', 6, 26, 12, 1);
  rect(a, '#c7c3d6', 18, 30, 10, 1);
  noche(abierta, TINTE_OBJETO);
  return { base, manta, mantaAbierta: abierta };
}

function ventana() {
  const mk = (clara: boolean) => {
    const c = lienzo(28, 26);
    const x = ctx(c);
    rect(x, clara ? '#c9d9ff' : '#141c3e', 0, 0, 28, 26);
    // the village roofs far away and the hills
    rect(x, clara ? '#4a5a8a' : '#0c1230', 0, 18, 28, 8);
    rect(x, clara ? '#4a5a8a' : '#0c1230', 4, 14, 8, 6);
    rect(x, clara ? '#4a5a8a' : '#0c1230', 16, 12, 9, 8);
    if (!clara) {
      // a few lit windows far away
      rect(x, '#e8b45a', 6, 17, 2, 2);
      rect(x, '#e8b45a', 20, 16, 2, 2);
      rect(x, '#e8b45a', 8, 22, 2, 2);
    }
    // rain
    x.fillStyle = clara ? 'rgba(80,100,170,0.6)' : 'rgba(150,175,230,0.55)';
    for (let i = 0; i < 16; i++) {
      const px = (i * 11) % 28;
      const py = (i * 7) % 22;
      x.fillRect(px, py, 1, 3);
      x.fillRect(px - 1, py + 3, 1, 1);
    }
    return c;
  };
  return { oscura: mk(false), clara: mk(true) };
}

function construir(): Cuarto {
  const W = ANCHO_CUARTO;
  const H = ALTO_CUARTO;
  const f = lienzo(W, H);
  const x = ctx(f);
  // --- back wall: plaster with a wooden dado, crown moulding
  rect(x, '#d9c2a0', 0, 0, W, BASE_PARED);
  for (let i = 0; i < W; i += 16) rect(x, '#cdb590', i, 0, 1, 34);
  rect(x, '#b79d7a', 0, 0, W, 3);
  rect(x, '#8a6a4a', 0, 3, W, 1);
  rect(x, maderaO, 0, 34, W, 14);
  rect(x, madera, 0, 36, W, 10);
  rect(x, maderaL, 0, 34, W, 2);
  for (let i = 0; i < W; i += 24) {
    rect(x, maderaO, i + 2, 38, 20, 1);
    rect(x, maderaO, i + 2, 44, 20, 1);
    rect(x, maderaO, i + 2, 38, 1, 7);
    rect(x, maderaO, i + 21, 38, 1, 7);
  }
  rect(x, '#5a3a22', 0, 47, W, 1);
  // --- floor: planks
  rect(x, '#b78650', 0, BASE_PARED, W, H - BASE_PARED);
  for (let y = BASE_PARED; y < H; y += 8) {
    rect(x, '#8c5f34', 0, y, W, 1);
    const off = ((y / 8) % 2) * 24;
    for (let px = off; px < W; px += 48) rect(x, '#8c5f34', px, y, 1, 8);
    rect(x, '#c99a62', 0, y + 1, W, 1);
  }
  // shadow of the wall on the floor
  rect(x, 'rgba(20,10,30,0.25)', 0, BASE_PARED, W, 3);
  // --- the side walls
  rect(x, '#b79d7a', 0, 0, 8, H);
  rect(x, '#b79d7a', W - 8, 0, 8, H);
  rect(x, maderaO, 7, BASE_PARED, 1, H - BASE_PARED);
  rect(x, maderaO, W - 8, BASE_PARED, 1, H - BASE_PARED);
  rect(x, '#8a6a4a', 0, 0, 8, 4);
  rect(x, '#8a6a4a', W - 8, 0, 8, 4);
  // --- the rug
  elipse(x, '#e8c55a', 112, 108, 44, 18);
  elipse(x, '#b3382c', 112, 108, 41, 16);
  elipse(x, '#e8c55a', 112, 108, 30, 11);
  elipse(x, '#2f9a8a', 112, 108, 28, 10);
  elipse(x, '#e8c55a', 112, 108, 14, 5);
  for (let i = 0; i < 12; i++) rect(x, '#e8c55a', 70 + i * 7, 126 + (i % 2), 1, 2);
  // --- desk against the wall: top, drawers, a lamp (a candle), scripts and a quill
  rect(x, maderaO, 118, 34, 52, 22);
  rect(x, madera, 119, 35, 50, 8);
  rect(x, maderaL, 119, 35, 50, 1);
  rect(x, '#6a4428', 119, 43, 50, 1);
  rect(x, maderaO, 120, 44, 4, 14);
  rect(x, maderaO, 164, 44, 4, 14);
  rect(x, '#9a6a3a', 126, 45, 32, 10);
  rect(x, '#6a4428', 126, 50, 32, 1);
  rect(x, '#e6c14a', 140, 47, 3, 2);
  rect(x, '#e6c14a', 140, 52, 3, 2);
  // scripts: loose pages and a thick book
  rect(x, '#f4ecd6', 124, 31, 14, 6);
  rect(x, '#ddd2b4', 126, 30, 12, 6);
  rect(x, '#8a6a4a', 128, 32, 8, 1);
  rect(x, '#8a6a4a', 128, 34, 6, 1);
  rect(x, '#3a6aa8', 148, 31, 12, 6);
  rect(x, '#f4ecd6', 149, 36, 10, 1);
  // quill and ink
  rect(x, '#2a1c2e', 142, 33, 3, 3);
  rect(x, '#f4f1fb', 145, 27, 1, 8);
  rect(x, '#d8d4e6', 146, 28, 1, 5);
  // --- shelf on the wall with books and the two theatre masks
  rect(x, maderaO, 124, 18, 46, 3);
  rect(x, maderaL, 124, 17, 46, 1);
  const libros = ['#c0392b', '#2f9a8a', '#e0a22a', '#3a6aa8', '#8a4cc0', '#d6502f'];
  libros.forEach((c, i) => {
    rect(x, c, 127 + i * 3, 10 + (i % 3), 3, 8 - (i % 3));
    rect(x, mezcla(c, '#ffffff', 0.3), 127 + i * 3, 10 + (i % 3), 1, 8 - (i % 3));
  });
  // comedy and tragedy masks
  elipse(x, '#f5d36a', 152, 12, 4, 5);
  rect(x, '#2a1c2e', 150, 11, 1, 1);
  rect(x, '#2a1c2e', 153, 11, 1, 1);
  rect(x, '#2a1c2e', 150, 14, 4, 1);
  rect(x, '#2a1c2e', 149, 13, 1, 1);
  rect(x, '#2a1c2e', 154, 13, 1, 1);
  elipse(x, '#7ab0e0', 160, 12, 4, 5);
  rect(x, '#2a1c2e', 158, 11, 1, 1);
  rect(x, '#2a1c2e', 161, 11, 1, 1);
  rect(x, '#2a1c2e', 158, 13, 4, 1);
  rect(x, '#2a1c2e', 158, 14, 1, 1);
  rect(x, '#2a1c2e', 161, 14, 1, 1);
  // --- wardrobe
  rect(x, maderaO, 178, 2, 32, 52);
  rect(x, madera, 179, 3, 30, 49);
  rect(x, maderaL, 179, 3, 30, 1);
  rect(x, '#6a4428', 193, 4, 2, 46);
  rect(x, '#a66f3a', 181, 6, 11, 20);
  rect(x, '#a66f3a', 196, 6, 11, 20);
  rect(x, '#a66f3a', 181, 29, 11, 20);
  rect(x, '#a66f3a', 196, 29, 11, 20);
  rect(x, '#e6c14a', 190, 28, 2, 3);
  rect(x, '#e6c14a', 196, 28, 2, 3);
  rect(x, '#4a2e1c', 178, 53, 32, 2);
  // --- the window's frame and curtains (the glass is drawn live)
  rect(x, maderaO, 62, 6, 36, 34);
  rect(x, madera, 63, 7, 34, 32);
  rect(x, maderaL, 63, 7, 34, 1);
  rect(x, '#5a3a22', 67, 11, 28, 1);
  rect(x, maderaO, 76, 11, 2, 26);
  rect(x, maderaO, 81, 11, 2, 26);
  rect(x, '#6a4428', 60, 38, 40, 3);
  rect(x, maderaL, 60, 38, 40, 1);
  // curtains
  rect(x, '#9a2a4a', 64, 8, 8, 28);
  rect(x, '#c0486a', 64, 8, 2, 28);
  rect(x, '#9a2a4a', 88, 8, 8, 28);
  rect(x, '#7a1e3a', 94, 8, 2, 28);
  rect(x, '#7a1e3a', 70, 8, 1, 28);
  rect(x, '#3a1a2a', 62, 6, 36, 2);
  // --- a poster of a play over the dado at the far left? no: a framed picture of the village
  rect(x, maderaO, 102, 8, 18, 14);
  rect(x, '#e8cf8a', 103, 9, 16, 12);
  rect(x, '#c0392b', 105, 15, 12, 5);
  rect(x, '#e0a22a', 108, 10, 6, 4);
  // --- the doorway at the bottom: the doormat and the light of the storm
  rect(x, '#2a1c2e', 100, H - 4, 24, 4);
  rect(x, '#7a8fbf', 102, H - 3, 20, 3);
  rect(x, '#8a2a24', 100, H - 12, 24, 8);
  rect(x, '#c0392b', 101, H - 11, 22, 6);
  for (let i = 0; i < 4; i++) rect(x, '#e8c55a', 104 + i * 5, H - 10, 3, 1);
  noche(f, [0.62, 0.66, 0.94]);
  // pools of warm light: the candle on the desk, a spot around the bed, the rug
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const k = 1 - i / 5;
    elipse(x, 'rgba(255,184,90,0.05)', 144, 66, 56 * k, 22 * k);
    elipse(x, 'rgba(255,184,90,0.035)', 112, 104, 70 * k, 24 * k);
    elipse(x, 'rgba(255,184,90,0.05)', 148, 40, 24 * k, 14 * k);
  }
  x.restore();
  // The candle
  rect(x, '#f6ead0', 156, 28, 3, 6);
  rect(x, '#8a6a4a', 155, 34, 5, 1);
  rect(x, '#ffd56a', 157, 25, 1, 3);
  rect(x, '#fff3b0', 157, 26, 1, 1);
  // dim the corners: a stepped vignette
  x.save();
  for (let i = 0; i < 4; i++) {
    x.strokeStyle = `rgba(6,8,24,${0.07 + i * 0.04})`;
    x.lineWidth = 2;
    x.strokeRect(i * 2 + 1, i * 2 + 1, W - i * 4 - 2, H - i * 4 - 2);
  }
  x.restore();

  // --- the moonlight's beam from the window to the floor (a stepped parallelogram), used for flashes
  const haz = lienzo(W, H);
  const h = ctx(haz);
  h.fillStyle = 'rgba(190,210,255,0.5)';
  for (let y = 0; y < 52; y++) {
    const a = 66 + y * 1.0;
    h.fillRect(Math.round(a + (y % 2 ? 0 : 1)), 44 + y, 28 + Math.floor(y / 6), 1);
  }
  rect(h, 'rgba(190,210,255,0.5)', 68, 40, 28, 4);

  const objetos: Objeto[] = [];
  // the cajón (the drum he sits on), on the floor
  const cajon = lienzo(18, 20);
  const c = ctx(cajon);
  rect(c, '#8a5a30', 0, 4, 18, 16);
  rect(c, '#c9975a', 1, 5, 16, 14);
  rect(c, '#e4b97a', 1, 1, 16, 4);
  rect(c, '#9a6a3a', 0, 0, 18, 1);
  elipse(c, '#4a2e1c', 9, 12, 3, 3);
  rect(c, '#6a4428', 0, 19, 18, 1);
  noche(cajon, TINTE_OBJETO);
  objetos.push({ id: 'cajon', x: 56, y: 88, frames: [cajon], base: 108 });

  const ca = cama();
  const v = ventana();
  const rects: Rect[] = [
    { x: 12, y: 38, w: 38, h: 38 }, // the bed
    { x: 118, y: 40, w: 52, h: 16 }, // the desk
    { x: 178, y: 40, w: 32, h: 16 }, // the wardrobe
    { x: 56, y: 94, w: 18, h: 14 }, // the cajón
  ];
  const lecturas: Lectura[] = [
    { rect: { x: 118, y: 56, w: 52, h: 12 }, clave: 'lectura.escritorio', quien: 'pablo' },
    { rect: { x: 176, y: 56, w: 34, h: 12 }, clave: 'lectura.armario', quien: 'pablo' },
    { rect: { x: 52, y: 108, w: 26, h: 10 }, clave: 'lectura.cajon', quien: 'pablo' },
    { rect: { x: 62, y: 50, w: 40, h: 10 }, clave: 'lectura.ventana', quien: 'pablo' },
  ];
  return {
    fondo: f,
    cama: { ...ca, x: 14, y: 28, almohada: { x: 14 + 18, y: 28 + 15 } },
    ventana: { x: 68, y: 12, ...v },
    haz,
    objetos,
    rects,
    lecturas,
    puerta: { x: 96, y: H - 14, w: 32, h: 14 },
    inicio: { x: 112, y: 122 },
    madre: { x: 62, y: 72 },
    vela: { x: 157, y: 26 },
  };
}
