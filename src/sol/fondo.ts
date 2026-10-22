// The backgrounds of the fights: wide panoramas painted once, in three layers that tile sideways, so the
// battle camera can turn and the layers slide at different speeds (parallax). Only drawImage per frame.
//
// 'campo': the Alacant countryside at night: moon, stars, the sierra, the castle of Santa Bárbara on its
// hill over a sea with the lights of the city, then rows of orange trees, almond trees and palms in front
// of a farmhouse, and the furrowed earth with its irrigation channel in the foreground.
import { azar, ctx, elipse, lienzo, rect, una } from './pixel';
import { linea } from './iconos';
import { PANTALLA_H, PANTALLA_W } from './interfaz';

export type FondoCombate = 'campo';

const W_LEJOS = 360;
const W_MEDIO = 420;
const W_SUELO = 480;
/** Screen row where each layer's canvas begins. */
const Y_LEJOS = 0;
const Y_MEDIO = 25;
const Y_SUELO = 60;

/** Pixels the layer moves for one radian of camera turn. */
const VEL_LEJOS = 26;
const VEL_MEDIO = 60;
const VEL_SUELO = 104;

const ondulado = (x: number, w: number, tonos: Array<[number, number, number]>) => {
  let v = 0;
  for (const [k, a, f] of tonos) v += a * Math.sin(((x * k) / w) * Math.PI * 2 + f);
  return v;
};

function lejos(): HTMLCanvasElement {
  return una('fondo.campo.lejos', () => {
    const c = lienzo(W_LEJOS, 64);
    const x = ctx(c);
    const r = azar(7);
    // sky in bands
    const cielo = ['#0a1034', '#0d1640', '#101c4c', '#14255a', '#193068', '#1f3c78', '#264a88', '#2e5898', '#3a68a6'];
    cielo.forEach((col, i) => rect(x, col, 0, i * 5, W_LEJOS, 5));
    // a glow of fiesta lights low down
    for (let i = 0; i < 4; i++) {
      x.fillStyle = `rgba(255,150,80,${0.05 + i * 0.03})`;
      x.fillRect(0, 36 + i * 2, W_LEJOS, 2);
    }
    // stars
    for (let i = 0; i < 90; i++) {
      const sx = Math.floor(r() * W_LEJOS);
      const sy = Math.floor(r() * 34);
      rect(x, r() > 0.8 ? '#fff6c8' : '#cfd8ff', sx, sy, 1, 1);
      if (r() > 0.93) {
        rect(x, '#8a98d8', sx - 1, sy, 3, 1);
        rect(x, '#8a98d8', sx, sy - 1, 1, 3);
      }
    }
    // the moon, with its glow
    const mx = 292;
    const my = 16;
    for (let i = 4; i >= 1; i--) {
      x.fillStyle = `rgba(200,220,255,${0.04 * (5 - i)})`;
      x.beginPath();
      x.arc(mx, my, 9 + i * 3, 0, 7);
      x.fill();
    }
    elipse(x, '#f4f0d0', mx, my, 9, 9);
    elipse(x, '#e0dab0', mx + 3, my + 2, 4, 4);
    rect(x, '#d4cca0', mx - 5, my - 4, 3, 2);
    rect(x, '#d4cca0', mx - 2, my + 5, 3, 2);
    rect(x, '#d4cca0', mx + 5, my - 5, 2, 2);
    // the sierra (it tiles: only whole sines)
    for (let px = 0; px < W_LEJOS; px++) {
      const h1 = 33 + ondulado(px, W_LEJOS, [[3, 3.6, 0.4], [7, 1.8, 1.9], [13, 0.9, 0.2]]);
      rect(x, '#1b2a5c', px, Math.round(h1), 1, 50 - Math.round(h1));
      const h2 = 40 + ondulado(px, W_LEJOS, [[4, 2.4, 2.2], [9, 1.2, 0.7]]);
      rect(x, '#16224c', px, Math.round(h2), 1, 50 - Math.round(h2));
    }
    // the hill and the castle of Santa Bárbara
    const cx = 128;
    for (let px = -34; px <= 34; px++) {
      const h = Math.round(18 * Math.exp(-(px * px) / 300));
      if (h > 0) rect(x, '#0e1840', cx + px, 47 - h, 1, h + 3);
    }
    const mur = '#0e1840';
    rect(x, mur, cx - 14, 33, 28, 9);
    for (let i = 0; i < 7; i++) rect(x, mur, cx - 14 + i * 4, 31, 2, 2);
    rect(x, mur, cx - 18, 28, 7, 14);
    rect(x, mur, cx + 11, 26, 7, 16);
    for (let i = 0; i < 3; i++) {
      rect(x, mur, cx - 18 + i * 3, 26, 2, 2);
      rect(x, mur, cx + 11 + i * 3, 24, 2, 2);
    }
    rect(x, mur, cx - 3, 24, 7, 9);
    rect(x, mur, cx - 2, 22, 5, 2);
    for (const [wx, wy] of [[cx - 16, 33], [cx + 13, 31], [cx - 1, 29], [cx + 5, 36], [cx - 9, 37]]) rect(x, '#ffb64a', wx, wy, 1, 2);
    // the sea, with the reflection of the moon
    const mar = ['#16408a', '#1a4a96', '#1e54a2', '#2260ae', '#2668b8', '#2a70c0', '#2e76c6', '#327cca', '#3682d0'];
    mar.forEach((col, i) => rect(x, col, 0, 47 + i * 2, W_LEJOS, 2));
    for (let i = 0; i < 9; i++) {
      const w = 3 + i * 2;
      rect(x, i % 2 ? '#d8e8d0' : '#a8c0d8', mx - w / 2, 48 + i * 2, w, 1);
    }
    for (let i = 0; i < 70; i++) rect(x, '#6aa0e0', Math.floor(r() * W_LEJOS), 47 + Math.floor(r() * 17), 2 + Math.floor(r() * 3), 1);
    // the lights of the city along the shore
    for (let i = 0; i < 60; i++) {
      const lx = Math.floor(r() * W_LEJOS);
      rect(x, r() > 0.5 ? '#ffc65a' : '#ffe8a0', lx, 46 + (Math.floor(r() * 2)), 1, 1);
    }
    // a lighthouse far to the left
    rect(x, '#0e1840', 36, 38, 3, 9);
    rect(x, '#ffe8a0', 36, 36, 3, 2);
    return c;
  });
}

/** One tree of the orchards (the crown, painted on the layer) with its foot at (px, py). */
function arbol(x: CanvasRenderingContext2D, tipo: 'naranjo' | 'almendro' | 'palmera', px: number, py: number, r: () => number) {
  if (tipo === 'palmera') {
    // curved trunk and a crown of fronds
    for (let i = 0; i < 22; i++) {
      const bx = px + Math.round(Math.sin(i / 7) * 3);
      rect(x, i % 3 ? '#5a4030' : '#3e2a22', bx, py - i, 3, 1);
    }
    const tx = px + Math.round(Math.sin(22 / 7) * 3) + 1;
    const ty = py - 22;
    for (const [dx, dy] of [[-11, 3], [-9, -2], [-4, -6], [0, -7], [5, -6], [10, -2], [12, 4], [-6, 5], [6, 5]]) {
      linea(x, '#1f5a3a', tx, ty, tx + dx, ty + dy);
      linea(x, '#2a7048', tx, ty - 1, tx + dx, ty + dy - 1);
    }
    rect(x, '#5a4030', tx - 1, ty, 3, 2);
    return;
  }
  rect(x, '#4a3224', px - 1, py - 8, 3, 8);
  rect(x, '#2e2018', px + 1, py - 8, 1, 8);
  if (tipo === 'naranjo') {
    elipse(x, '#1f4a38', px, py - 15, 12, 10);
    elipse(x, '#2a6048', px - 3, py - 18, 7, 5);
    elipse(x, '#38785a', px - 4, py - 20, 3, 2);
    for (let i = 0; i < 6; i++) rect(x, i % 2 ? '#f09a2a' : '#ffb84a', px - 9 + Math.floor(r() * 18), py - 22 + Math.floor(r() * 14), 2, 2);
  } else {
    elipse(x, '#46684c', px, py - 15, 11, 9);
    elipse(x, '#5a8060', px - 3, py - 18, 6, 4);
    for (let i = 0; i < 12; i++) rect(x, i % 3 ? '#f6d8e0' : '#ffffff', px - 9 + Math.floor(r() * 18), py - 22 + Math.floor(r() * 14), 1, 1);
  }
}

function medio(): HTMLCanvasElement {
  return una('fondo.campo.medio', () => {
    const c = lienzo(W_MEDIO, 40);
    const x = ctx(c);
    const r = azar(21);
    // a low wall and the farmhouse with its lit window
    rect(x, '#2c3a4c', 0, 34, W_MEDIO, 4);
    rect(x, '#22303a', 0, 38, W_MEDIO, 2);
    const casa = (hx: number) => {
      rect(x, '#8c92b0', hx, 20, 34, 16);
      rect(x, '#6c7298', hx + 24, 20, 10, 16);
      rect(x, '#8a3a34', hx - 3, 16, 40, 5);
      rect(x, '#a8483c', hx - 2, 14, 38, 3);
      rect(x, '#6a2a2c', hx + 6, 11, 22, 4);
      rect(x, '#ffc65a', hx + 6, 25, 6, 6);
      rect(x, '#fff0a8', hx + 7, 26, 2, 2);
      rect(x, '#3a2a28', hx + 8, 25, 1, 6);
      rect(x, '#3a2a28', hx + 6, 28, 6, 1);
      rect(x, '#3a3a58', hx + 20, 26, 5, 10);
    };
    casa(278);
    const planta: Array<['naranjo' | 'almendro' | 'palmera', number]> = [
      ['naranjo', 20], ['almendro', 56], ['palmera', 90], ['naranjo', 128], ['almendro', 168], ['naranjo', 204],
      ['palmera', 240], ['almendro', 340], ['naranjo', 372], ['palmera', 402],
    ];
    for (const [t, px] of planta) {
      arbol(x, t, px, 38, r);
      // the layer tiles: a tree on the edge is drawn on the other side too
      if (px > W_MEDIO - 30) arbol(x, t, px - W_MEDIO, 38, r);
      if (px < 30) arbol(x, t, px + W_MEDIO, 38, r);
    }
    // a fence in front of the trees
    for (let px = 4; px < W_MEDIO; px += 9) {
      rect(x, '#5a4638', px, 33, 2, 7);
      rect(x, '#3e2e26', px + 1, 33, 1, 7);
    }
    rect(x, '#5a4638', 0, 35, W_MEDIO, 1);
    rect(x, '#5a4638', 0, 37, W_MEDIO, 1);
    // the whole layer darkened a little, a night tint
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(14,24,66,0.42)';
    x.fillRect(0, 0, W_MEDIO, 40);
    return c;
  });
}

function suelo(): HTMLCanvasElement {
  return una('fondo.campo.suelo', () => {
    const alto = PANTALLA_H - Y_SUELO;
    const c = lienzo(W_SUELO, alto);
    const x = ctx(c);
    const r = azar(99);
    // earth in bands, greener far away and redder near
    for (let j = 0; j < alto; j++) {
      const k = j / alto;
      const col = `rgb(${Math.round(38 + 36 * k)},${Math.round(52 + 22 * k)},${Math.round(56 - 8 * k)})`;
      rect(x, col, 0, j, W_SUELO, 1);
    }
    // the irrigation channel, a ribbon of water with the glow of the moon
    rect(x, '#243a58', 0, 22, W_SUELO, 5);
    rect(x, '#4a78b0', 0, 23, W_SUELO, 3);
    rect(x, '#7aa8d8', 0, 23, W_SUELO, 1);
    for (let i = 0; i < 40; i++) rect(x, '#c8e0f8', Math.floor(r() * W_SUELO), 24 + Math.floor(r() * 2), 3 + Math.floor(r() * 4), 1);
    rect(x, '#1e2c3a', 0, 21, W_SUELO, 1);
    rect(x, '#1e2c3a', 0, 27, W_SUELO, 1);
    // furrows in perspective, with a row of little crop plants on every other one
    for (let i = 0; i < 14; i++) {
      const y = Math.round(30 + Math.pow(i, 1.42) * 4.4);
      if (y > alto - 2) break;
      const grosor = 1 + Math.floor(i / 5);
      rect(x, 'rgba(18,22,30,0.4)', 0, y, W_SUELO, grosor);
      rect(x, 'rgba(120,110,80,0.28)', 0, y + grosor, W_SUELO, 1);
      if (i % 2 === 0) {
        const sep = 14 + i * 4;
        const rad = 2 + Math.floor(i / 3);
        for (let px = (i * 7) % sep; px < W_SUELO; px += sep) {
          elipse(x, '#1d4a30', px, y - rad + 1, rad + 1, rad);
          elipse(x, '#2c6842', px - 1, y - rad, rad - 0.5, rad - 1);
          if (r() > 0.7) rect(x, '#e8503a', px + 1, y - rad - 1, 2, 2);
        }
      }
    }
    // stones and tufts
    for (let i = 0; i < 46; i++) {
      const px = Math.floor(r() * W_SUELO);
      const py = 30 + Math.floor(r() * (alto - 34));
      const s = 1 + Math.floor(py / 30);
      if (i % 2) {
        elipse(x, '#5a5e72', px, py, s + 1, s);
        rect(x, '#8a8ea8', px - 1, py - s, s, 1);
      } else {
        for (let k = -1; k <= 1; k++) rect(x, '#3a6a44', px + k * 2, py - s - 1 + Math.abs(k), 1, s + 2);
      }
    }
    // a little mist over the far end
    for (let j = 0; j < 8; j++) {
      x.fillStyle = `rgba(110,140,190,${0.16 - j * 0.02})`;
      x.fillRect(0, j, W_SUELO, 1);
    }
    return c;
  });
}

const capa = (g: CanvasRenderingContext2D, img: HTMLCanvasElement, y: number, ancho: number, desp: number) => {
  const o = Math.round((((desp % ancho) + ancho) % ancho));
  g.drawImage(img, -o, y);
  if (ancho - o < PANTALLA_W) g.drawImage(img, ancho - o, y);
};

/**
 * Draws the background for a camera turned `giro` radians. `t` is the time in seconds (a little shimmer on the sea).
 * The turn is the same number the fighters are placed with.
 */
export function dibujarFondo(g: CanvasRenderingContext2D, _fondo: FondoCombate, giro: number, t: number) {
  capa(g, lejos(), Y_LEJOS, W_LEJOS, giro * VEL_LEJOS + 90);
  capa(g, suelo(), Y_SUELO, W_SUELO, giro * VEL_SUELO + 60);
  capa(g, medio(), Y_MEDIO, W_MEDIO, giro * VEL_MEDIO + 130);
  // shimmer on the sea and a twinkling star or two (a handful of pixels, no cached picture)
  const dl = (((giro * VEL_LEJOS + 90) % W_LEJOS) + W_LEJOS) % W_LEJOS;
  for (let i = 0; i < 7; i++) {
    const fase = (t * 0.7 + i * 0.37) % 1;
    if (fase > 0.3) continue;
    const px = Math.round(((i * 53 + 17) % W_LEJOS) - dl + W_LEJOS) % W_LEJOS;
    if (px < PANTALLA_W) {
      g.fillStyle = fase < 0.15 ? '#ffffff' : '#9ac0f0';
      g.fillRect(px, 49 + ((i * 5) % 12), 2, 1);
    }
  }
}
