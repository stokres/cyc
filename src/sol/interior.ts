// The insides of the peña (the shop) and of the inn: one still room each, painted once into two canvases of
// 240×160, the back (wall, floor, shelves, beds) and the front (the counter, drawn over the keeper's legs).
// The keeper stands at `TENDERO`, Pablo and his friends line up at the bottom, by the door.
import { elipse, ctx, lienzo, rect, una } from './pixel';
import { PANTALLA_H, PANTALLA_W } from './interfaz';

export type Sala = 'tienda' | 'posada';

/** Feet of the keeper behind the counter, and of Pablo at the door. */
export const TENDERO = { x: 120, y: 88 } as const;
export const ENTRADA = { x: 120, y: 150 } as const;

const MADERA = { a: '#a8683a', b: '#8a5630', c: '#c9975a', d: '#5a3418' };

function paredYSuelo(x: CanvasRenderingContext2D, pared: string, paredO: string, suelo: string, sueloO: string) {
  // back wall, with a skirting board and a plank floor in perspective
  rect(x, pared, 0, 0, PANTALLA_W, 70);
  for (let i = 0; i < 30; i++) rect(x, paredO, i * 8 + 7, 0, 1, 70);
  rect(x, paredO, 0, 0, PANTALLA_W, 4);
  rect(x, MADERA.d, 0, 66, PANTALLA_W, 4);
  rect(x, MADERA.c, 0, 66, PANTALLA_W, 1);
  rect(x, suelo, 0, 70, PANTALLA_W, PANTALLA_H - 70);
  for (let j = 0; j < 8; j++) {
    const y = 70 + j * 11 + j * j;
    if (y > PANTALLA_H) break;
    rect(x, sueloO, 0, y, PANTALLA_W, 1);
  }
  for (let i = 0; i < 20; i++) rect(x, sueloO, (i * 13 + 5) % PANTALLA_W, 74 + ((i * 7) % 70), 9, 1);
}

function ventanaNoche(x: CanvasRenderingContext2D, px: number, py: number) {
  rect(x, MADERA.d, px - 2, py - 2, 34, 30);
  rect(x, '#1c2a68', px, py, 30, 26);
  for (const [sx, sy] of [[4, 4], [20, 8], [10, 16], [24, 20], [14, 6]]) rect(x, '#ffffff', px + sx, py + sy, 1, 1);
  elipse(x, '#ffe9a0', px + 22, py + 7, 4, 4);
  elipse(x, '#1c2a68', px + 24, py + 6, 3.5, 3.5);
  rect(x, MADERA.d, px + 14, py, 2, 26);
  rect(x, MADERA.d, px, py + 12, 30, 2);
  rect(x, MADERA.c, px - 3, py + 26, 36, 3);
}

function lamparaTecho(x: CanvasRenderingContext2D, px: number) {
  rect(x, '#2a2230', px, 0, 1, 14);
  rect(x, '#2a2230', px - 5, 14, 11, 2);
  elipse(x, '#ffe9a0', px, 20, 5, 5);
  elipse(x, '#fff7d0', px - 1, 19, 2.5, 2.5);
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) elipse(x, 'rgba(255,190,90,0.07)', px, 24, 60 - i * 12, 40 - i * 8);
  x.restore();
}

function fondoTienda(): HTMLCanvasElement {
  const c = lienzo(PANTALLA_W, PANTALLA_H);
  const x = ctx(c);
  paredYSuelo(x, '#d8c08a', '#c4aa72', '#8a5a36', '#6e4426');
  ventanaNoche(x, 18, 14);
  // pennants of the peña along the top
  const cols = ['#e8453a', '#f5c542', '#3aa0e0', '#52c26a', '#e86aa8'];
  for (let i = 0; i < 27; i++) {
    const px = 4 + i * 9;
    const py = 3 + Math.round(Math.sin(i / 3) * 2);
    rect(x, cols[i % 5], px, py, 5, 1);
    rect(x, cols[i % 5], px + 1, py + 1, 3, 1);
    rect(x, cols[i % 5], px + 2, py + 2, 1, 1);
  }
  // shelves with slabs of turrón, jars and bottles
  const estante = (px: number, py: number, w: number) => {
    rect(x, MADERA.d, px, py, w, 3);
    rect(x, MADERA.c, px, py, w, 1);
    rect(x, '#4a2a14', px, py + 3, w, 1);
  };
  for (const [px, py, w] of [[70, 26, 150], [70, 46, 150]] as const) estante(px, py, w);
  for (let i = 0; i < 6; i++) {
    const px = 74 + i * 24;
    rect(x, '#f6ead0', px, 16, 18, 10);
    rect(x, '#fff8e4', px, 16, 18, 3);
    rect(x, '#e3cfa2', px, 24, 18, 2);
    for (const [ax, ay] of [[3, 19], [8, 21], [13, 18]]) rect(x, '#b88450', px + ax, ay, 2, 1);
    rect(x, '#d4453a', px + 6, 10, 6, 6);
    rect(x, '#fff0d0', px + 8, 12, 2, 2);
  }
  for (let i = 0; i < 8; i++) {
    const px = 74 + i * 18;
    const col = ['#4ab4f0', '#f0b030', '#e8453a', '#52c26a'][i % 4];
    rect(x, '#3a2a40', px + 3, 34, 6, 12);
    rect(x, col, px + 4, 36, 4, 9);
    rect(x, '#ffffff', px + 4, 36, 1, 8);
    rect(x, '#3a2a40', px + 5, 31, 2, 4);
  }
  // sacks of almonds on the floor and a barrel
  for (const px of [12, 34]) {
    elipse(x, '#c8a870', px + 9, 92, 12, 11);
    rect(x, '#8a6a3a', px + 5, 78, 8, 3);
    elipse(x, '#d8b880', px + 7, 88, 5, 5);
    rect(x, '#8a6a3a', px + 2, 98, 14, 2);
  }
  // strings of chorizos and garlic
  for (const px of [58, 62]) {
    rect(x, '#3a2a10', px, 0, 1, 8);
    rect(x, '#a8322a', px - 1, 8, 3, 12);
    rect(x, '#7a1c18', px + 1, 9, 1, 10);
  }
  lamparaTecho(x, 120);
  return c;
}

function fondoPosada(): HTMLCanvasElement {
  const c = lienzo(PANTALLA_W, PANTALLA_H);
  const x = ctx(c);
  paredYSuelo(x, '#cdb0d8', '#b494c4', '#7a4a38', '#5e3426');
  ventanaNoche(x, 18, 14);
  // two beds against the back wall, quilted
  const cama = (px: number, manta: string, mantaO: string) => {
    rect(x, MADERA.d, px, 28, 46, 40);
    rect(x, MADERA.b, px + 1, 30, 44, 8);
    rect(x, '#f4f0e6', px + 4, 36, 38, 10);
    rect(x, '#d8d4e4', px + 4, 44, 38, 2);
    rect(x, manta, px + 3, 46, 40, 20);
    rect(x, mantaO, px + 3, 62, 40, 4);
    for (let i = 0; i < 4; i++) rect(x, mantaO, px + 8 + i * 9, 48, 1, 14);
    rect(x, MADERA.d, px, 66, 4, 8);
    rect(x, MADERA.d, px + 42, 66, 4, 8);
  };
  cama(100, '#d8504a', '#9a2e30');
  cama(160, '#3f7ac4', '#2c5a98');
  // a bedside table with a candle, a fireplace at the right
  rect(x, MADERA.a, 84, 50, 14, 18);
  rect(x, MADERA.d, 84, 50, 14, 2);
  rect(x, '#f4f0e6', 90, 40, 3, 10);
  rect(x, '#ffd84a', 91, 36, 1, 4);
  rect(x, '#fff7c8', 91, 37, 1, 2);
  rect(x, '#5a5470', 214, 34, 22, 34);
  rect(x, '#2a2230', 218, 44, 14, 24);
  rect(x, '#e8602a', 221, 58, 8, 10);
  rect(x, '#ffb040', 223, 61, 4, 7);
  rect(x, '#8a8498', 212, 32, 26, 3);
  // a rug
  elipse(x, '#a8322a', 120, 130, 56, 12);
  elipse(x, '#f0c860', 120, 130, 50, 9);
  elipse(x, '#a8322a', 120, 130, 40, 7);
  lamparaTecho(x, 70);
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) elipse(x, 'rgba(255,150,60,0.07)', 225, 64, 50 - i * 11, 30 - i * 6);
  x.restore();
  return c;
}

/** The counter over which the keeper looks, drawn in front of him. */
function frente(tipo: Sala): HTMLCanvasElement {
  const c = lienzo(PANTALLA_W, PANTALLA_H);
  const x = ctx(c);
  const py = tipo === 'tienda' ? 84 : 86;
  rect(x, MADERA.b, 56, py + 8, 128, 26);
  rect(x, MADERA.c, 54, py, 132, 8);
  rect(x, '#d8b078', 54, py, 132, 2);
  rect(x, MADERA.d, 54, py + 8, 132, 1);
  rect(x, MADERA.d, 56, py + 33, 128, 2);
  for (let i = 0; i < 6; i++) rect(x, MADERA.d, 62 + i * 22, py + 12, 1, 20);
  if (tipo === 'tienda') {
    // a slab of turrón and a pair of shot glasses on the counter
    rect(x, '#f6ead0', 70, py - 5, 16, 6);
    rect(x, '#fff8e4', 70, py - 5, 16, 2);
    rect(x, '#b88450', 74, py - 3, 2, 1);
    rect(x, '#bfe8f4', 150, py - 6, 4, 6);
    rect(x, '#f0b030', 150, py - 3, 4, 3);
    rect(x, '#bfe8f4', 160, py - 6, 4, 6);
    rect(x, '#f0b030', 160, py - 3, 4, 3);
  } else {
    // a bell and the guest book
    rect(x, '#e0b030', 150, py - 4, 6, 4);
    rect(x, '#fff0a0', 152, py - 6, 2, 2);
    rect(x, '#7a1c24', 78, py - 3, 14, 3);
    rect(x, '#f4f0e6', 79, py - 5, 12, 3);
  }
  return c;
}

export const fondoSala = (s: Sala) => una(`interior.fondo.${s}`, () => (s === 'tienda' ? fondoTienda() : fondoPosada()));
export const frenteSala = (s: Sala) => una(`interior.frente.${s}`, () => frente(s));
