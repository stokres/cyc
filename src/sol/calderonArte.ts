// The art of the summon «Calderón»: Calderón de la Barca as a huge bust (hair to the shoulders, a long moustache
// with upturned ends, a pointed beard, the stiff white golilla and the red cross of Santiago on his black robe), his
// giant quill and the hand that holds it, the open sky, the rays and the clouds. All painted once into cached
// canvases at the size they are shown (the bust is 124 × 150 on a 240 × 160 screen); the sequence only moves them.
import { contorno } from './contorno';
import { linea } from './iconos';
import { ctx, elipse, lienzo, rect, una } from './pixel';

export const CALDERON_W = 124;
export const CALDERON_H = 150;

const PIEL = '#f2c8a0';
const PIEL_O = '#d49c74';
const PIEL_OO = '#b87c58';
const PIEL_LUZ = '#ffe0c0';
const PELO = '#2e1e1c';
const PELO_L = '#4e3430';
const PELO_O = '#1a1010';
const NEGRO = '#1c1826';
const NEGRO_L = '#34304c';
const NEGRO_O = '#100e18';


/** Calderón's bust: head, golilla, robe with the cross, and the hand that holds the scroll. The quill hand is apart. */
export const calderon = () =>
  una('calderon.busto', () => {
    const c = lienzo(CALDERON_W, CALDERON_H);
    const x = ctx(c);
    const cx = 62;
    // ---- the black robe: wide shoulders widening to the bottom, with folds
    for (let y = 70; y < CALDERON_H; y++) {
      const half = Math.min(62, Math.round(32 + (y - 70) * 0.8));
      rect(x, NEGRO, cx - half, y, half * 2, 1);
    }
    for (let y = 70; y < CALDERON_H; y++) {
      const half = Math.min(62, Math.round(32 + (y - 70) * 0.8));
      rect(x, NEGRO_L, cx - half + 1, y, 2, 1);
      rect(x, NEGRO_O, cx + half - 3, y, 3, 1);
    }
    // vertical folds of the cape
    for (const [fx, f0] of [[14, 96], [26, 90], [40, 86], [84, 86], [98, 92], [110, 100]] as const) {
      for (let y = f0; y < CALDERON_H; y++) {
        rect(x, NEGRO_O, fx + Math.round(Math.sin(y * 0.09 + fx) * 1.5), y, 2, 1);
        rect(x, NEGRO_L, fx + 2 + Math.round(Math.sin(y * 0.09 + fx) * 1.5), y, 1, 1);
      }
    }
    // the shoulder highlights
    elipse(x, NEGRO_L, 34, 82, 8, 3);
    elipse(x, NEGRO_O, 90, 84, 7, 3);
    // the opening of the robe, a row of gold buttons and a dark doublet
    rect(x, NEGRO_O, cx - 3, 80, 6, CALDERON_H - 80);
    for (let y = 88; y < CALDERON_H; y += 8) {
      elipse(x, '#f0c040', cx, y, 1.8, 1.8);
      rect(x, '#ffe27a', cx - 1, y - 1, 1, 1);
    }
    // the red cross of Santiago on the chest (left side of the robe, on the viewer's right): a sword with fleur-de-lis arms
    const kx = 88;
    const ky = 104;
    const rojo = '#d8283a';
    const rojoO = '#8a1424';
    rect(x, rojo, kx + 4, ky, 5, 24);
    rect(x, rojo, kx - 1, ky + 6, 15, 5);
    rect(x, rojoO, kx + 8, ky, 1, 24);
    rect(x, rojoO, kx - 1, ky + 10, 15, 1);
    for (const [ex, ey] of [[kx + 6, ky - 2], [kx - 3, ky + 8], [kx + 15, ky + 8]]) elipse(x, rojo, ex, ey, 2.5, 2.5);
    linea(x, rojo, kx + 6, ky + 24, kx + 6, ky + 30);
    rect(x, rojo, kx + 5, ky + 24, 3, 3);
    rect(x, '#ff6a7a', kx + 4, ky + 1, 1, 8);
    // ---- the golilla: a wide flat stiff white collar under the chin, pleated
    elipse(x, '#c8c8dc', cx, 74, 33, 9);
    elipse(x, '#ffffff', cx, 72, 32, 8);
    for (let i = -30; i <= 30; i += 3) {
      const h = Math.round(Math.sqrt(Math.max(0, 1 - (i / 32) ** 2)) * 8);
      rect(x, '#d4d4e8', cx + i, 72 - h + 1, 1, h * 2 - 1);
      rect(x, '#ffffff', cx + i + 1, 72 - h + 1, 1, h * 2 - 2);
    }
    elipse(x, '#e8e8f4', cx, 70, 22, 5);
    elipse(x, '#1a1420', cx, 70, 13, 3.4);
    // the scalloped lower edge of the collar
    for (let i = -30; i <= 30; i += 4) {
      const h = Math.round(Math.sqrt(Math.max(0, 1 - (i / 32) ** 2)) * 8);
      elipse(x, '#ffffff', cx + i + 2, 72 + h, 2.4, 1.6);
      rect(x, '#b8b8d0', cx + i + 3, 72 + h, 1, 2);
    }
    // ---- the neck
    rect(x, PIEL_O, cx - 8, 60, 16, 12);
    rect(x, PIEL_OO, cx + 3, 60, 5, 12);
    // ---- the hair behind the head: long, to the shoulders
    elipse(x, PELO, cx, 34, 28, 31);
    rect(x, PELO, cx - 28, 34, 10, 30);
    rect(x, PELO, cx + 18, 34, 10, 30);
    for (let y = 40; y < 66; y++) {
      rect(x, PELO_O, cx - 28 + (y % 3 === 0 ? 1 : 0), y, 2, 1);
      rect(x, PELO_O, cx + 26 - (y % 3 === 0 ? 1 : 0), y, 2, 1);
    }
    elipse(x, PELO, cx - 24, 65, 5, 3);
    elipse(x, PELO, cx + 24, 65, 5, 3);
    // ---- the face
    elipse(x, PIEL, cx, 38, 20, 25);
    elipse(x, PIEL, cx, 50, 16, 17);
    elipse(x, PIEL_O, cx + 9, 44, 9, 18);
    elipse(x, PIEL, cx - 2, 42, 14, 20);
    elipse(x, PIEL_LUZ, cx - 8, 28, 6, 4);
    // the hair over the high forehead: it falls to the sides with a widow's peak
    elipse(x, PELO, cx, 15, 25, 11);
    rect(x, PELO, cx - 26, 15, 52, 8);
    for (let i = 0; i < 6; i++) {
      elipse(x, PELO, cx - 20 + i * 2, 23 + i, 4, 4);
      elipse(x, PELO, cx + 20 - i * 2, 23 + i, 4, 4);
    }
    elipse(x, PELO, cx - 14, 26, 6, 5);
    elipse(x, PELO, cx + 14, 26, 6, 5);
    elipse(x, PIEL, cx, 24, 7, 4);
    rect(x, PELO_L, cx - 18, 11, 12, 2);
    rect(x, PELO_L, cx - 8, 9, 8, 1);
    // ---- the brows, the eyes
    for (const s of [-1, 1]) {
      const ex = cx + s * 11;
      for (let i = 0; i < 12; i++) rect(x, PELO_O, ex - 6 + i, 31 + Math.round(Math.abs(i - 6) * 0.3 * s * -1 + (s < 0 ? 1 - i * 0.12 : i * 0.12 - 0.4)), 1, 3);
      // eye: white, dark iris, a heavy lid above and a bag below
      elipse(x, '#fffaf0', ex, 38, 6, 3.4);
      elipse(x, '#5a3a22', ex + s * -0.5, 38, 2.8, 3);
      rect(x, '#1a1010', ex - 1, 37, 2, 2);
      rect(x, '#ffffff', ex - 1 + (s > 0 ? 0 : 0), 36, 1, 1);
      rect(x, PIEL_OO, ex - 7, 34, 14, 1);
      rect(x, PIEL_O, ex - 6, 35, 12, 1);
      rect(x, PIEL_O, ex - 5, 42, 10, 1);
    }
    // ---- the nose: long and straight with a rounded tip and a shadow on one side
    rect(x, PIEL_O, cx + 1, 36, 3, 14);
    rect(x, PIEL_OO, cx + 3, 40, 1, 10);
    elipse(x, PIEL, cx, 51, 5, 3.4);
    elipse(x, PIEL_O, cx + 2, 52, 3, 2.2);
    rect(x, PIEL_OO, cx - 3, 53, 2, 1);
    rect(x, PIEL_OO, cx + 2, 53, 2, 1);
    rect(x, PIEL_LUZ, cx - 1, 38, 1, 10);
    // the cheeks
    elipse(x, '#ec9c8c', cx - 14, 48, 3.5, 2.5);
    elipse(x, '#d88c7c', cx + 14, 48, 3, 2.5);
    // ---- the moustache: wide, black, with the two ends curled up
    for (const s of [-1, 1]) {
      for (let i = 0; i < 20; i++) {
        const mx = cx + s * (2 + i);
        const my = 56 + Math.round(Math.sin((i / 20) * 2) * 2) - (i > 12 ? (i - 12) * 1.15 : 0);
        rect(x, PELO_O, mx, Math.round(my), 1, 5 - (i > 12 ? 1 : 0) - (i > 16 ? 1 : 0) - (i > 18 ? 1 : 0));
        rect(x, PELO_L, mx, Math.round(my), 1, 1);
      }
    }
    rect(x, PELO_O, cx - 3, 55, 6, 4);
    // ---- the mouth and the pointed beard (perilla), plus a thin beard along the jaw
    rect(x, '#8a3a34', cx - 5, 60, 10, 2);
    rect(x, '#c0605a', cx - 4, 62, 8, 1);
    for (let a = 0.35; a < Math.PI - 0.35; a += 0.05) {
      const bx = cx + Math.cos(a) * 16;
      const by = 46 + Math.sin(a) * 18;
      rect(x, PELO_O, Math.round(bx) - 1, Math.round(by) - 1, 3, 3);
    }
    for (let j = 0; j < 17; j++) {
      const w = Math.max(1, Math.round(6 - j * 0.32));
      rect(x, PELO_O, cx - w, 63 + j, w * 2, 1);
      rect(x, PELO_L, cx - w, 63 + j, 1, 1);
    }
    // ---- the other arm: a sleeve down the right side with a lace cuff and the hand with a rolled scroll
    elipse(x, '#ffffff', 108, 134, 6, 4);
    for (let i = -5; i <= 5; i += 2) rect(x, '#c8c8dc', 108 + i, 136, 1, 2);
    elipse(x, PIEL, 108, 142, 4, 4);
    rect(x, PIEL_O, 110, 142, 2, 4);
    rect(x, '#e8dcb8', 96, 140, 22, 7);
    rect(x, '#fffaf0', 96, 140, 22, 2);
    rect(x, '#b8a878', 96, 146, 22, 1);
    elipse(x, '#c8b88a', 96, 143, 2, 4);
    elipse(x, '#c8b88a', 118, 143, 2, 4);
    return contorno(c, NEGRO_O);
  });

/** The hand with the lace cuff that holds the quill, 20 × 18, the quill going up from its pinch at (10, 5). */
export const manoPluma = () =>
  una('calderon.mano', () => {
    const c = lienzo(20, 18);
    const x = ctx(c);
    rect(x, '#ffffff', 2, 10, 16, 8);
    for (let i = 0; i < 8; i++) rect(x, '#c8c8dc', 3 + i * 2, 14, 1, 4);
    rect(x, '#e8e8f4', 2, 10, 16, 1);
    elipse(x, PIEL, 10, 8, 7, 5.5);
    elipse(x, PIEL_O, 12, 10, 5, 3.5);
    // fingers curling around the quill
    for (let i = 0; i < 4; i++) {
      rect(x, PIEL, 6 + i * 2, 2, 2, 5);
      rect(x, PIEL_O, 6 + i * 2 + 1, 3, 1, 4);
    }
    rect(x, PIEL_LUZ, 6, 2, 3, 1);
    return contorno(c, '#6a3a2a');
  });

/** The giant quill, 20 × 84: a long feather curving a little, the nib at the bottom. Pivot at (10, 80). */
export const plumaGrande = () =>
  una('calderon.pluma', () => {
    const c = lienzo(20, 84);
    const x = ctx(c);
    for (let j = 0; j < 84; j++) {
      const k = j / 84;
      const curva = Math.round(Math.sin(k * Math.PI * 0.8) * 3);
      const cxp = 10 + curva;
      const y = 83 - j;
      if (j < 14) {
        rect(x, j < 4 ? '#f0c040' : '#fffaf0', cxp, y, 2, 1);
        if (j < 4) rect(x, '#3a2a10', cxp + 1, y, 1, 1);
        continue;
      }
      const w = Math.max(1, Math.round(Math.sin(((j - 14) / 70) * Math.PI * 0.95 + 0.15) * 8.5));
      rect(x, '#fffaf0', cxp - w, y, w, 1);
      rect(x, '#dcd6ee', cxp + 2, y, Math.max(1, w - 1), 1);
      rect(x, '#ffffff', cxp, y, 2, 1);
      if (j % 5 === 0) {
        rect(x, '#b8b0d8', cxp - w, y, 1, 1);
        rect(x, '#b8b0d8', cxp + 1 + w, y, 1, 1);
      }
      if (j % 7 === 3) rect(x, '#c8c0e0', cxp - w + 1, y, Math.max(1, w - 2), 1);
    }
    return contorno(c, '#6a5a98');
  });

/** The open sky behind him, 240 × 160: deep blue above, rose and gold below, with soft clouds and stars. */
export const cielo = () =>
  una('calderon.cielo', () => {
    const c = lienzo(240, 160);
    const x = ctx(c);
    const bandas = ['#1a1e5e', '#243074', '#304088', '#4a54a0', '#6a68b4', '#8a7cc0', '#b090c0', '#d8a8b8', '#f0c0a0', '#ffd890', '#fff0b0'];
    bandas.forEach((col, i) => rect(x, col, 0, Math.round((i * 160) / bandas.length), 240, Math.ceil(160 / bandas.length) + 1));
    // stars in the upper half
    for (let i = 0; i < 46; i++) {
      const sx = (i * 97 + 13) % 240;
      const sy = (i * 53 + 7) % 70;
      rect(x, i % 4 ? '#ffffff' : '#fff0a0', sx, sy, 1, 1);
      if (i % 9 === 0) {
        rect(x, '#c8d0ff', sx - 1, sy, 3, 1);
        rect(x, '#c8d0ff', sx, sy - 1, 1, 3);
      }
    }
    // layers of clouds, bigger and brighter toward the bottom
    for (let r = 0; r < 4; r++) {
      const y0 = 70 + r * 24;
      for (let i = 0; i < 9; i++) {
        const cxn = (i * 31 + r * 17) % 250;
        const w = 22 + r * 8 + (i % 3) * 6;
        elipse(x, ['#c8b0d8', '#e0c0d0', '#f4d4c8', '#fff0d8'][r], cxn, y0 + (i % 2) * 4, w, 7 + r * 2);
        elipse(x, ['#e0c8e8', '#f0d8e0', '#fce4d8', '#ffffff'][r], cxn - 4, y0 - 3 + (i % 2) * 4, w * 0.7, 4 + r);
      }
    }
    return c;
  });

/** A cone of rays, 256 × 256, alternating pale wedges that fade out from the middle; drawn turning. */
export const rayos = () =>
  una('calderon.rayos', () => {
    const c = lienzo(256, 256);
    const x = ctx(c);
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / n / 2;
      const g = x.createRadialGradient(128, 128, 4, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,248,200,0.75)');
      g.addColorStop(0.55, 'rgba(255,240,170,0.32)');
      g.addColorStop(1, 'rgba(255,230,150,0)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(128, 128);
      x.arc(128, 128, 128, a0, a1);
      x.closePath();
      x.fill();
    }
    return c;
  });

/** A soft golden glow disc, 180 × 180, for the halo behind him. */
export const aura = () =>
  una('calderon.aura', () => {
    const c = lienzo(180, 180);
    const x = ctx(c);
    const g = x.createRadialGradient(90, 90, 4, 90, 90, 90);
    g.addColorStop(0, 'rgba(255,255,230,0.95)');
    g.addColorStop(0.35, 'rgba(255,240,170,0.55)');
    g.addColorStop(0.7, 'rgba(255,214,120,0.2)');
    g.addColorStop(1, 'rgba(255,200,100,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 180, 180);
    return c;
  });

/** A little cloud, 52 × 22, in one of three shapes. */
export const nube = (v: number) =>
  una(`calderon.nube.${v % 3}`, () => {
    const c = lienzo(52, 22);
    const x = ctx(c);
    const f = v % 3;
    elipse(x, '#d8c8e8', 26, 14, 24, 7);
    elipse(x, '#e8dcf0', 18 + f * 6, 10, 12 + f * 2, 7);
    elipse(x, '#f4ecf8', 32 - f * 4, 9, 10, 6);
    elipse(x, '#ffffff', 22 + f * 3, 7, 7, 4);
    rect(x, '#b8a8d0', 6, 19, 40, 2);
    return c;
  });
