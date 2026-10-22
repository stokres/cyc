// The pixel art of the road to the theatre and of the village's two new doors: orange and almond trees, palms,
// prickly pears (chumberas), rocks, chests, a lost shot glass, the signs of the peña and the inn, and the
// theatre's front. Painted once into cached canvases in day colours and put through the night grade, like
// arte.ts; the frame loop only draws them.
import { TINTE_OBJETO } from './arte';
import { anchoTexto, escribir } from './fuente';
import { azar, ctx, elipse, lienzo, noche, rect, una } from './pixel';
import { linea } from './iconos';

/** A canopy of blobs in three greens with a trunk, 32×46 (the base of the trunk at the bottom). */
function copa(
  c: HTMLCanvasElement,
  verdes: [string, string, string],
  semilla: number,
  frutos: { col: string; luz: string; n: number } | null,
  tronco: [string, string, string],
) {
  const x = ctx(c);
  const r = azar(semilla);
  // trunk and roots
  rect(x, tronco[0], 13, 30, 7, 15);
  rect(x, tronco[1], 13, 30, 4, 15);
  rect(x, tronco[2], 18, 30, 2, 15);
  rect(x, tronco[0], 11, 43, 11, 2);
  rect(x, tronco[2], 11, 44, 11, 1);
  const blobs: Array<[number, number, number]> = [[16, 15, 13], [8, 21, 8], [24, 21, 8], [16, 25, 9], [11, 10, 7], [21, 11, 7]];
  for (const [cx, cy, rr] of blobs) elipse(x, verdes[0], cx, cy + 1, rr, rr);
  for (const [cx, cy, rr] of blobs) elipse(x, verdes[1], cx - 1, cy - 1, rr - 1.5, rr - 1.5);
  for (const [cx, cy, rr] of blobs.slice(0, 4)) elipse(x, verdes[2], cx - 3, cy - 4, rr / 2.4, rr / 2.8);
  for (let i = 0; i < 36; i++) {
    const px = 4 + Math.floor(r() * 24);
    const py = 3 + Math.floor(r() * 26);
    if (!blobs.some(([cx, cy, rr]) => (px - cx) ** 2 + (py - cy) ** 2 < (rr - 2) ** 2)) continue;
    rect(x, i % 3 ? verdes[0] : verdes[2], px, py, 2, 1);
  }
  if (frutos) {
    let n = 0;
    for (let i = 0; i < 80 && n < frutos.n; i++) {
      const px = 5 + Math.floor(r() * 22);
      const py = 5 + Math.floor(r() * 24);
      if (!blobs.some(([cx, cy, rr]) => (px - cx) ** 2 + (py - cy) ** 2 < (rr - 3) ** 2)) continue;
      rect(x, frutos.col, px, py, 3, 3);
      rect(x, frutos.luz, px, py, 1, 1);
      n++;
    }
  }
}

/** An orange tree, 32×46: a round dark crown full of oranges. */
export const naranjo = () =>
  una('campo.naranjo', () => {
    const c = lienzo(32, 46);
    copa(c, ['#27703a', '#3d9448', '#68c05c'], 41, { col: '#ff9422', luz: '#ffd27a', n: 11 }, ['#6a4428', '#8c5d36', '#4a2e1c']);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** An almond tree in blossom, 32×46: a paler crown covered in white and pink flowers. */
export const almendro = () =>
  una('campo.almendro', () => {
    const c = lienzo(32, 46);
    copa(c, ['#6d9a62', '#8dbb7c', '#b6dc9e'], 77, null, ['#5a3e2a', '#7c5a3c', '#3e2a1c']);
    const x = ctx(c);
    const r = azar(5);
    const blobs: Array<[number, number, number]> = [[16, 15, 13], [8, 21, 8], [24, 21, 8], [16, 25, 9], [11, 10, 7], [21, 11, 7]];
    for (let i = 0; i < 70; i++) {
      const px = 3 + Math.floor(r() * 26);
      const py = 2 + Math.floor(r() * 28);
      if (!blobs.some(([cx, cy, rr]) => (px - cx) ** 2 + (py - cy) ** 2 < (rr - 1) ** 2)) continue;
      rect(x, i % 4 === 0 ? '#f6b4cc' : '#fff4f8', px, py, 2, 2);
      if (i % 5 === 0) rect(x, '#e88aac', px, py, 1, 1);
    }
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A palm tree, 36×66: a ringed trunk that leans a little, fronds like fireworks and a bunch of dates. */
export const palmera = () =>
  una('campo.palmera', () => {
    const c = lienzo(36, 66);
    const x = ctx(c);
    // trunk, slightly curved, with its rings
    for (let y = 0; y < 52; y++) {
      const px = 15 + Math.round(Math.sin(y / 20) * 2 + y * 0.03);
      rect(x, '#8a6a46', px, 12 + y, 6, 1);
      rect(x, '#b08a5a', px, 12 + y, 2, 1);
      rect(x, '#5e4630', px + 4, 12 + y, 2, 1);
      if (y % 4 === 0) rect(x, '#5e4630', px, 12 + y, 6, 1);
    }
    rect(x, '#5e4630', 12, 62, 12, 3);
    rect(x, '#3e2e20', 12, 64, 12, 1);
    // fronds from the top (18, 12): [angle, length, droop]
    const fr: Array<[number, number, number]> = [[-170, 17, 7], [-140, 17, 5], [-105, 13, 1], [-75, 13, 1], [-40, 17, 5], [-10, 17, 7], [160, 14, 10], [20, 14, 10]];
    for (const [ang, largo, caida] of fr) {
      const a = (ang * Math.PI) / 180;
      let px = 18;
      let py = 12;
      for (let i = 0; i < largo; i++) {
        const t = i / largo;
        px = 18 + Math.cos(a) * i;
        py = 12 + Math.sin(a) * i * 0.8 + caida * t * t;
        rect(x, '#2f7a3e', Math.round(px), Math.round(py), 2, 2);
        rect(x, '#4cae56', Math.round(px), Math.round(py) - 1, 1, 1);
        // leaflets
        if (i % 2 === 0 && i > 2) {
          rect(x, '#3d9448', Math.round(px), Math.round(py) + 2, 1, 2);
          rect(x, '#2f7a3e', Math.round(px) + 1, Math.round(py) - 2, 1, 2);
        }
      }
    }
    elipse(x, '#3d9448', 18, 12, 4, 3);
    // dates
    for (const [px, py] of [[15, 15], [18, 16], [21, 15]]) {
      rect(x, '#9a5a24', px, py, 2, 3);
      rect(x, '#c98a3a', px, py, 1, 1);
    }
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A prickly pear (chumbera), 22×24: green pads with spines and red fruits. */
export const chumbera = () =>
  una('campo.chumbera', () => {
    const c = lienzo(22, 24);
    const x = ctx(c);
    const pala = (cx: number, cy: number, rx: number, ry: number) => {
      elipse(x, '#2f7a4a', cx, cy + 1, rx, ry);
      elipse(x, '#4aa862', cx - 0.5, cy, rx - 1, ry - 1);
      elipse(x, '#76cf86', cx - 2, cy - 2, rx / 2.4, ry / 2.8);
      for (const [dx, dy] of [[-2, -2], [2, -1], [0, 2], [-3, 1], [3, 3]]) rect(x, '#f4f0d0', Math.round(cx + dx), Math.round(cy + dy), 1, 1);
    };
    pala(10, 18, 7, 5);
    pala(5, 12, 4.5, 6);
    pala(15, 11, 4.5, 6);
    pala(11, 5, 4, 4.5);
    for (const [px, py] of [[2, 6], [18, 4], [8, 1], [14, 15]]) {
      rect(x, '#d8284a', px, py, 3, 3);
      rect(x, '#ff7a96', px, py, 1, 1);
    }
    rect(x, '#2a2218', 6, 22, 9, 1);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A rock, 18×13. */
export const roca = () =>
  una('campo.roca', () => {
    const c = lienzo(18, 13);
    const x = ctx(c);
    elipse(x, '#6b6678', 9, 8, 8.5, 5);
    elipse(x, '#8f8aa0', 8, 6.5, 7, 4);
    elipse(x, '#b5b0c6', 6, 5, 3.5, 2);
    rect(x, '#4d4960', 3, 11, 12, 1);
    rect(x, '#5a5470', 12, 7, 2, 3);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A bush, 20×14. */
export const matorral = () =>
  una('campo.matorral', () => {
    const c = lienzo(20, 14);
    const x = ctx(c);
    elipse(x, '#2a6a38', 10, 8, 9.5, 5.5);
    elipse(x, '#3d9448', 9, 6.5, 8, 4.5);
    elipse(x, '#68c05c', 7, 4.5, 4, 2.5);
    for (const [px, py] of [[4, 7], [12, 5], [15, 8]]) rect(x, '#f6e6a0', px, py, 1, 1);
    rect(x, '#1e4a28', 3, 12, 14, 1);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** A wooden chest with gold bands, shut or open (a warm light comes out of it), 18×16. */
export const cofre = (abierto: boolean) =>
  una(`campo.cofre.${abierto}`, () => {
    const c = lienzo(18, 18);
    const x = ctx(c);
    // body
    rect(x, '#7a4a28', 1, 8, 16, 9);
    rect(x, '#a8683a', 1, 8, 16, 2);
    rect(x, '#5a3418', 1, 15, 16, 2);
    rect(x, '#8a5630', 1, 10, 2, 5);
    rect(x, '#e0b030', 1, 8, 2, 9);
    rect(x, '#e0b030', 15, 8, 2, 9);
    rect(x, '#8a6a10', 2, 16, 14, 1);
    if (!abierto) {
      // lid
      elipse(x, '#8a5630', 9, 7, 8, 5);
      rect(x, '#8a5630', 1, 4, 16, 5);
      rect(x, '#a8683a', 2, 3, 14, 2);
      rect(x, '#e0b030', 1, 4, 2, 5);
      rect(x, '#e0b030', 15, 4, 2, 5);
      rect(x, '#5a3418', 1, 8, 16, 1);
      rect(x, '#fff0a8', 8, 8, 2, 3);
      rect(x, '#c89820', 8, 10, 2, 1);
      noche(c, TINTE_OBJETO);
      return c;
    }
    // open: the lid leans back and the inside shines
    rect(x, '#3a2410', 2, 7, 14, 2);
    rect(x, '#ffe27a', 3, 6, 12, 2);
    rect(x, '#fff7c8', 5, 6, 8, 1);
    rect(x, '#8a5630', 2, 0, 14, 5);
    rect(x, '#a8683a', 3, 0, 12, 1);
    rect(x, '#e0b030', 2, 0, 2, 5);
    rect(x, '#e0b030', 14, 0, 2, 5);
    rect(x, '#5a3418', 2, 4, 14, 1);
    noche(c, TINTE_OBJETO);
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) elipse(x, 'rgba(255,214,110,0.16)', 9, 6, 8 - i * 2, 5 - i);
    x.restore();
    return c;
  });

/** A shot glass lost on the ground («chupito»), 7×10, with a glint drawn over it live. */
export const chupitoSuelo = () =>
  una('campo.chupito', () => {
    const c = lienzo(7, 10);
    const x = ctx(c);
    rect(x, '#bfe8f4', 1, 1, 5, 7);
    rect(x, '#e8f8ff', 1, 1, 1, 7);
    rect(x, '#f0b030', 2, 4, 3, 4);
    rect(x, '#ffd860', 2, 4, 3, 1);
    rect(x, '#8aa0b4', 1, 8, 5, 1);
    rect(x, '#8aa0b4', 2, 9, 3, 1);
    return c;
  });

/** The sign of the peña (a slab of soft turrón on a board), hanging from a bracket, 18×26. */
export const letreroTienda = () =>
  una('campo.letreroTienda', () => {
    const c = lienzo(18, 26);
    const x = ctx(c);
    rect(x, '#4a2e1c', 0, 0, 2, 26);
    rect(x, '#4a2e1c', 0, 1, 14, 2);
    rect(x, '#2a1a10', 5, 3, 1, 3);
    rect(x, '#2a1a10', 12, 3, 1, 3);
    rect(x, '#7a4a28', 3, 6, 14, 14);
    rect(x, '#e8cf8a', 4, 7, 12, 12);
    rect(x, '#c9a85a', 4, 18, 12, 1);
    // the slab of turrón with almonds
    rect(x, '#f6ead0', 5, 10, 10, 6);
    rect(x, '#fff8e4', 5, 10, 10, 2);
    rect(x, '#e3cfa2', 5, 15, 10, 1);
    for (const [px, py] of [[6, 13], [9, 12], [12, 14], [13, 11]]) rect(x, '#b88450', px, py, 2, 1);
    rect(x, '#d4453a', 7, 8, 6, 1);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** The sign of the inn (a crescent moon and a pillow), 18×26. */
export const letreroPosada = () =>
  una('campo.letreroPosada', () => {
    const c = lienzo(18, 26);
    const x = ctx(c);
    rect(x, '#4a2e1c', 0, 0, 2, 26);
    rect(x, '#4a2e1c', 0, 1, 14, 2);
    rect(x, '#2a1a10', 5, 3, 1, 3);
    rect(x, '#2a1a10', 12, 3, 1, 3);
    rect(x, '#7a4a28', 3, 6, 14, 14);
    rect(x, '#2a3a8a', 4, 7, 12, 12);
    elipse(x, '#ffe27a', 9, 12, 4, 4);
    elipse(x, '#2a3a8a', 11, 11, 3.5, 3.5);
    rect(x, '#ffffff', 5, 8, 1, 1);
    rect(x, '#ffffff', 13, 16, 1, 1);
    rect(x, '#f4f0e6', 5, 16, 6, 2);
    rect(x, '#9aa0c0', 5, 18, 6, 1);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** The front of the theatre, 144×110: columns, a pediment with the two masks, a lit marquee and a red curtain at the door. */
export function teatro(letrero: string): HTMLCanvasElement {
  return una(`campo.teatro.${letrero}`, () => {
    const W = 144;
    const H = 110;
    const c = lienzo(W, H);
    const x = ctx(c);
    const piedra = '#d9cdb4';
    const piedraO = '#a89a80';
    const piedraL = '#f0e6d0';
    // the stairs
    for (let i = 0; i < 4; i++) {
      rect(x, i % 2 ? '#a89a80' : '#c4b89e', 10 - i * 3, 100 + i * 2, W - 20 + i * 6, 2);
    }
    rect(x, '#7a6e58', 4, 108, W - 8, 2);
    // the body
    rect(x, '#e8dcc0', 8, 42, W - 16, 58);
    rect(x, '#c4b496', 8, 42, W - 16, 3);
    rect(x, '#c4b496', W - 12, 45, 4, 55);
    rect(x, piedraL, 8, 45, 2, 55);
    // plinth
    rect(x, piedraO, 8, 92, W - 16, 8);
    rect(x, piedra, 8, 92, W - 16, 1);
    // pediment: a triangle with a dentil cornice
    for (let y = 0; y < 34; y++) {
      const half = Math.round((y / 33) * (W / 2 - 4));
      rect(x, y < 3 ? piedraL : piedra, W / 2 - half, 8 + y, half * 2, 1);
    }
    for (let y = 4; y < 31; y++) {
      const half = Math.round((y / 33) * (W / 2 - 14));
      rect(x, '#b0a088', W / 2 - half, 10 + y, half * 2, 1);
    }
    rect(x, piedraO, 4, 41, W - 8, 3);
    rect(x, piedraL, 4, 40, W - 8, 1);
    for (let i = 0; i < 24; i++) rect(x, '#8a7c64', 6 + i * 6, 43, 3, 2);
    // the masks of comedy and tragedy on the pediment
    const mascara = (cx: number, col: string, triste: boolean) => {
      elipse(x, '#5a4a30', cx, 30, 8, 9);
      elipse(x, col, cx, 30, 7, 8);
      rect(x, '#2a1a10', cx - 4, 27, 3, 3);
      rect(x, '#2a1a10', cx + 1, 27, 3, 3);
      if (triste) {
        rect(x, '#2a1a10', cx - 3, 36, 6, 1);
        rect(x, '#2a1a10', cx - 4, 37, 1, 1);
        rect(x, '#2a1a10', cx + 3, 37, 1, 1);
      } else {
        rect(x, '#2a1a10', cx - 3, 35, 6, 1);
        rect(x, '#2a1a10', cx - 4, 34, 1, 1);
        rect(x, '#2a1a10', cx + 3, 34, 1, 1);
      }
    };
    mascara(W / 2 - 10, '#e8c050', false);
    mascara(W / 2 + 10, '#9ac0e8', true);
    // columns
    for (const cx of [14, 40, W - 54, W - 28]) {
      rect(x, piedraO, cx, 46, 14, 50);
      rect(x, piedra, cx, 46, 11, 50);
      rect(x, piedraL, cx + 1, 46, 3, 50);
      for (let k = 0; k < 4; k++) rect(x, '#b8aa90', cx + 4 + k * 2, 50, 1, 42);
      rect(x, piedraL, cx - 2, 44, 18, 4);
      rect(x, piedraO, cx - 2, 47, 18, 1);
      rect(x, piedraL, cx - 2, 94, 18, 4);
      rect(x, piedraO, cx - 2, 97, 18, 1);
    }
    // the door: a big arch with a red velvet curtain behind and a warm light
    const dx = W / 2 - 14;
    rect(x, '#5a3a24', dx - 3, 56, 34, 44);
    elipse(x, '#5a3a24', dx + 14, 58, 17, 9);
    rect(x, '#3a0a14', dx, 58, 28, 42);
    elipse(x, '#3a0a14', dx + 14, 60, 14, 8);
    for (let i = 0; i < 7; i++) {
      rect(x, i % 2 ? '#a81c32' : '#c8283e', dx + i * 4, 60, 4, 40);
      rect(x, '#e8506a', dx + i * 4, 60, 1, 40);
    }
    rect(x, '#e0b030', dx, 58, 28, 2);
    rect(x, '#2a0610', dx + 13, 60, 2, 40);
    // the lit marquee over the door, bulbs round it
    rect(x, '#2a1a30', dx - 12, 46, 52, 10);
    rect(x, '#e8cf8a', dx - 10, 48, 48, 6);
    // the posters at the sides
    for (const px of [W / 2 - 52, W / 2 + 42]) {
      rect(x, '#3a2a40', px, 62, 18, 24);
      rect(x, '#f4ead6', px + 1, 63, 16, 22);
      rect(x, '#b3382c', px + 3, 66, 12, 6);
      for (let j = 0; j < 4; j++) rect(x, '#9aa0c0', px + 3, 75 + j * 2, 12, 1);
    }
    noche(c, TINTE_OBJETO);
    // the marquee's name and its bulbs, lit (after the grade)
    escribir(x, letrero, Math.round(W / 2 - anchoTexto(letrero) / 2), 47, '#8a2a20', '#f4e4b8');
    for (let i = 0; i < 12; i++) {
      const px = dx - 10 + i * 4;
      rect(x, i % 2 ? '#ffd84a' : '#ff9a4a', px, 55, 2, 2);
      rect(x, '#fff7c8', px, 55, 1, 1);
    }
    // the glow from the door
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) elipse(x, 'rgba(255,170,80,0.10)', W / 2, 92, 34 - i * 7, 22 - i * 4);
    for (let i = 0; i < 3; i++) elipse(x, 'rgba(255,214,110,0.10)', W / 2, 52, 30 - i * 8, 7 - i);
    x.restore();
    return c;
  });
}

/** A lantern of paper on a post for the theatre's steps, 12×36 (lit). */
export const farolillo = () =>
  una('campo.farolillo', () => {
    const c = lienzo(14, 38);
    const x = ctx(c);
    rect(x, '#3d3850', 6, 12, 2, 25);
    rect(x, '#5a5470', 6, 12, 1, 25);
    rect(x, '#3d3850', 3, 35, 8, 2);
    noche(c, TINTE_OBJETO);
    elipse(x, '#c8283e', 7, 7, 5, 6);
    elipse(x, '#ff7a5a', 7, 6, 4, 5);
    elipse(x, '#ffe0a0', 6, 5, 2, 3);
    rect(x, '#e0b030', 4, 1, 6, 1);
    rect(x, '#e0b030', 4, 12, 6, 1);
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) elipse(x, 'rgba(255,170,80,0.14)', 7, 7, 8 - i * 2.5, 8 - i * 2.5);
    x.restore();
    return c;
  });

/** Tall stalks of cane (caña) for the acequia's bank, 14×26. */
export const canas = () =>
  una('campo.canas', () => {
    const c = lienzo(14, 26);
    const x = ctx(c);
    for (const [px, h] of [[2, 22], [5, 26], [8, 20], [11, 24]]) {
      linea(x, '#7a9a4a', px, 25, px + (px % 2 ? 1 : -1), 25 - h);
      rect(x, '#a8c866', px + (px % 2 ? 1 : -1) - 1, 25 - h, 3, 3);
    }
    noche(c, TINTE_OBJETO);
    return c;
  });

