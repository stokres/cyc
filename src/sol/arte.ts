// The world's pixel art of «Sol de Levante»: tiles of the village, houses, trees, the fountain, the crate of
// soft turrón... Everything is painted ONCE into cached canvases, in day colours, then put through the
// night grade (pixel.ts, `noche`) and the lights painted on top (windows, lamps), so the frame loop only
// drawImage()s them (docs/ESTILO.md, T5). Nothing here depends on the map.
import { azar, ctx, elipse, lienzo, mezcla, noche, pintar, rect, una } from './pixel';

export const T = 16;

/** The night tints: the scenery gets bluer and darker than the characters (who keep their colours). */
export const TINTE_SUELO: [number, number, number] = [0.46, 0.58, 0.9];
export const TINTE_OBJETO: [number, number, number] = [0.58, 0.64, 0.92];

// Day palette (before the grade).
const C = {
  hierba: '#5db35c', hierbaO: '#4a9a4e', hierbaL: '#7ccb6c', hierbaM: '#3f8844',
  tierra: '#cfa86a', tierraO: '#b68e55', tierraL: '#e4c88d', tierraP: '#8d6a3e',
  adoquin: '#bdb7c9', adoquinO: '#8f89a3', adoquinL: '#dcd7e8',
  agua: '#3a86dc', aguaO: '#2a68b8', aguaL: '#69b3f2',
  piedra: '#a8a2b4', piedraO: '#77718a', piedraL: '#cbc6d8',
  madera: '#b27a43', maderaO: '#85582f', maderaL: '#d39d62',
  setoO: '#2f7a3f', seto: '#43974d', setoL: '#67bb63',
};

/** The tile kinds of the village map. */
export type Baldosa = 'g' | 'd' | 'p' | 'w' | 'b' | 'f' | 'h' | 'x';
// g grass, d dirt, p plaza cobbles, w water, b bridge, f fence, h hedge, x forest (solid grass under trees)

// ---------------------------------------------------------------- ground tiles

const hash = (x: number, y: number, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function hierba(x: CanvasRenderingContext2D, tx: number, ty: number) {
  rect(x, C.hierba, tx, ty, T, T);
  for (let i = 0; i < 9; i++) {
    const px = tx + Math.floor(hash(tx, ty, i) * 15);
    const py = ty + Math.floor(hash(ty, tx, i + 40) * 14);
    const claro = hash(tx + i, ty, 7) > 0.5;
    rect(x, claro ? C.hierbaL : C.hierbaO, px, py, 1, 2);
    if (claro) rect(x, C.hierbaL, px + 1, py + 1, 1, 1);
  }
}

function tierra(x: CanvasRenderingContext2D, tx: number, ty: number) {
  rect(x, C.tierra, tx, ty, T, T);
  for (let i = 0; i < 7; i++) {
    const px = tx + Math.floor(hash(tx, ty, i + 90) * 14);
    const py = ty + Math.floor(hash(ty, tx, i + 70) * 14);
    const k = hash(px, py, 3);
    rect(x, k > 0.66 ? C.tierraL : k > 0.33 ? C.tierraO : C.tierraP, px, py, k > 0.5 ? 2 : 1, 1);
  }
}

function adoquin(x: CanvasRenderingContext2D, tx: number, ty: number, gx: number, gy: number) {
  rect(x, C.adoquin, tx, ty, T, T);
  // Cobbles in staggered rows of 8 px.
  for (let j = 0; j < 2; j++) {
    const off = (gy + j) % 2 === 0 ? 0 : 4;
    rect(x, C.adoquinO, tx, ty + j * 8 + 7, T, 1);
    for (let i = -1; i < 3; i++) rect(x, C.adoquinO, tx + off + i * 8 + 4, ty + j * 8, 1, 7);
  }
  for (let i = 0; i < 4; i++) {
    const px = tx + Math.floor(hash(gx, gy, i + 5) * 14);
    const py = ty + Math.floor(hash(gy, gx, i + 9) * 14);
    rect(x, C.adoquinL, px, py, 2, 1);
  }
}

function tablones(x: CanvasRenderingContext2D, tx: number, ty: number, vertical: boolean) {
  rect(x, C.madera, tx, ty, T, T);
  for (let i = 0; i < 4; i++) {
    if (vertical) {
      rect(x, C.maderaO, tx + i * 4 + 3, ty, 1, T);
      rect(x, C.maderaL, tx + i * 4, ty, 1, T);
    } else {
      rect(x, C.maderaO, tx, ty + i * 4 + 3, T, 1);
      rect(x, C.maderaL, tx, ty + i * 4, T, 1);
    }
  }
  for (let i = 0; i < 4; i++) {
    const a = vertical ? tx + i * 4 + 1 : tx + 1;
    const b = vertical ? ty + 1 : ty + i * 4 + 1;
    rect(x, C.maderaO, a, b, 1, 1);
    rect(x, C.maderaO, a + (vertical ? 0 : 13), b + (vertical ? 13 : 0), 1, 1);
  }
}

/** A picket fence tile: horizontal runs along x, vertical runs along y. */
function valla(x: CanvasRenderingContext2D, tx: number, ty: number, horizontal: boolean) {
  const pal = { m: C.madera, o: C.maderaO, l: C.maderaL, s: 'rgba(20,30,10,0.35)' };
  if (horizontal) {
    // two rails and posts every 8 px
    rect(x, pal.s, tx, ty + 14, T, 2);
    rect(x, pal.o, tx, ty + 6, T, 2);
    rect(x, pal.m, tx, ty + 5, T, 2);
    rect(x, pal.o, tx, ty + 11, T, 2);
    rect(x, pal.m, tx, ty + 10, T, 2);
    for (const px of [1, 9]) {
      rect(x, pal.m, tx + px, ty + 2, 4, 12);
      rect(x, pal.l, tx + px, ty + 2, 1, 12);
      rect(x, pal.o, tx + px + 3, ty + 2, 1, 12);
      rect(x, pal.l, tx + px + 1, ty + 1, 2, 1);
    }
  } else {
    // seen along its length: the rails run down the screen and a post stands in each tile
    rect(x, pal.s, tx + 9, ty + 12, 5, 4);
    rect(x, pal.o, tx + 7, ty, 3, T);
    rect(x, pal.m, tx + 7, ty, 2, T);
    rect(x, pal.l, tx + 7, ty, 1, T);
    rect(x, pal.o, tx + 5, ty + 4, 7, 12);
    rect(x, pal.m, tx + 5, ty + 4, 5, 12);
    rect(x, pal.l, tx + 5, ty + 4, 1, 12);
    rect(x, pal.l, tx + 4, ty + 3, 8, 2);
    rect(x, pal.m, tx + 4, ty + 5, 8, 1);
  }
}

function seto(x: CanvasRenderingContext2D, tx: number, ty: number) {
  rect(x, C.hierba, tx, ty, T, T);
  elipse(x, C.setoO, tx + 8, ty + 9, 8, 7);
  elipse(x, C.seto, tx + 7, ty + 7, 7, 6);
  elipse(x, C.setoL, tx + 6, ty + 5, 4, 3);
  for (let i = 0; i < 5; i++) rect(x, C.setoL, tx + 3 + Math.floor(hash(tx, ty, i) * 9), ty + 3 + Math.floor(hash(ty, tx, i) * 8), 1, 1);
}

// ---------------------------------------------------------------- the ground of a whole map

export interface Luz {
  x: number;
  y: number;
  rx: number;
  ry: number;
  /** Warm light is 255,190,90; a cool one, 150,190,255. */
  rgb: [number, number, number];
  fuerza?: number;
}

/**
 * Bakes the ground of a whole map: tiles, banks, flowers and the pools of light at the end. Water tiles are
 * left empty (their frames come from `aguaFrames`).
 */
export function sueloDe(mapa: Baldosa[][], luces: Luz[], flores = true): HTMLCanvasElement {
  const h = mapa.length;
  const w = mapa[0].length;
  const c = lienzo(w * T, h * T);
  const x = ctx(c);
  const en = (tx: number, ty: number): Baldosa | null => (tx < 0 || ty < 0 || tx >= w || ty >= h ? null : mapa[ty][tx]);
  const agua = (tx: number, ty: number) => en(tx, ty) === 'w';
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const k = mapa[ty][tx];
      const px = tx * T;
      const py = ty * T;
      if (k === 'w') {
        hierba(x, px, py);
        continue;
      }
      if (k === 'g' || k === 'x') hierba(x, px, py);
      else if (k === 'd') tierra(x, px, py);
      else if (k === 'p') adoquin(x, px, py, tx, ty);
      else if (k === 'b') tablones(x, px, py, false);
      else if (k === 'h') seto(x, px, py);
      else if (k === 'f') {
        // grass, then a fence running along whichever way its neighbours go
        hierba(x, px, py);
        const vecinoV = en(tx, ty - 1) === 'f' || en(tx, ty + 1) === 'f';
        const vecinoH = en(tx - 1, ty) === 'f' || en(tx + 1, ty) === 'f';
        valla(x, px, py, vecinoH || !vecinoV);
      }
    }
  }
  // Flowers on the grass, here and there.
  if (flores) {
    const cols = ['#f06a8c', '#f5d54a', '#ffffff', '#b784f0'];
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        if (mapa[ty][tx] !== 'g') continue;
        if (hash(tx, ty, 77) > 0.14) continue;
        const px = tx * T + 2 + Math.floor(hash(tx, ty, 78) * 11);
        const py = ty * T + 3 + Math.floor(hash(tx, ty, 79) * 9);
        const col = cols[Math.floor(hash(tx, ty, 80) * cols.length)];
        rect(x, col, px, py, 2, 1);
        rect(x, col, px + 1, py - 1, 1, 3);
        rect(x, '#f5d54a', px + 1, py, 1, 1);
        rect(x, C.hierbaO, px + 1, py + 2, 1, 1);
      }
    }
  }
  // Banks: where land meets water, a stone lip and its shadow.
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      if (mapa[ty][tx] === 'w') continue;
      const px = tx * T;
      const py = ty * T;
      if (agua(tx, ty - 1)) {
        // water above: the lip is this tile's top edge
        rect(x, C.piedraO, px, py, T, 1);
        rect(x, C.piedraL, px, py + 1, T, 2);
        rect(x, C.piedra, px, py + 3, T, 1);
        rect(x, C.piedraO, px, py + 4, T, 1);
      }
      if (agua(tx - 1, ty)) {
        rect(x, C.piedraO, px, py, 1, T);
        rect(x, C.piedraL, px + 1, py, 2, T);
        rect(x, C.piedra, px + 3, py, 1, T);
      }
      if (agua(tx + 1, ty)) {
        rect(x, C.piedra, px + T - 4, py, 1, T);
        rect(x, C.piedraL, px + T - 3, py, 2, T);
        rect(x, C.piedraO, px + T - 1, py, 1, T);
      }
      if (agua(tx, ty + 1)) {
        // water below: the wall of the bank is seen from the front
        rect(x, C.piedraL, px, py + T - 6, T, 1);
        rect(x, C.piedra, px, py + T - 5, T, 3);
        rect(x, C.piedraO, px, py + T - 2, T, 2);
        for (let i = 0; i < 2; i++) rect(x, C.piedraO, px + 4 + i * 8, py + T - 5, 1, 3);
      }
    }
  }
  noche(c, TINTE_SUELO);
  // Pools of light.
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (const l of luces) {
    const f = l.fuerza ?? 1;
    const [r, g, b] = l.rgb;
    for (let i = 0; i < 4; i++) {
      const k = 1 - i / 4;
      x.fillStyle = `rgba(${r},${g},${b},${0.075 * f})`;
      elipse(x, `rgba(${r},${g},${b},${0.075 * f})`, l.x, l.y, l.rx * k, l.ry * k);
    }
  }
  x.restore();
  return c;
}

/** Frames of the water: every water tile of the map, rippling; the land stays transparent. */
export function aguaFrames(mapa: Baldosa[][], n = 3): HTMLCanvasElement[] {
  const h = mapa.length;
  const w = mapa[0].length;
  const marcos: HTMLCanvasElement[] = [];
  for (let f = 0; f < n; f++) {
    const c = lienzo(w * T, h * T);
    const x = ctx(c);
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        if (mapa[ty][tx] !== 'w') continue;
        const px = tx * T;
        const py = ty * T;
        rect(x, C.agua, px, py, T, T);
        const arriba = ty > 0 && mapa[ty - 1][tx] !== 'w';
        if (arriba) rect(x, C.aguaO, px, py, T, 3);
        // ripples: short light lines that drift with the frame
        for (let i = 0; i < 3; i++) {
          const ox = Math.floor(hash(tx, ty, i + 11) * 10);
          const oy = 4 + Math.floor(hash(ty, tx, i + 21) * 9);
          const dx = (ox + f * (3 + i)) % 13;
          rect(x, C.aguaL, px + dx, py + oy, 3, 1);
          rect(x, C.aguaO, px + ((dx + 5) % 13), py + oy + 2, 2, 1);
        }
        // the left bank's shade
        if (tx > 0 && mapa[ty][tx - 1] !== 'w') rect(x, C.aguaO, px, py, 2, T);
      }
    }
    noche(c, [0.62, 0.74, 1]);
    marcos.push(c);
  }
  return marcos;
}

// ---------------------------------------------------------------- sparkles, rain, small things

/** A 5×5 star of light, in four brightnesses (twinkle). */
export const destello = (nivel: 0 | 1 | 2) =>
  una(`destello.${nivel}`, () => {
    const c = lienzo(5, 5);
    const x = ctx(c);
    if (nivel === 0) {
      rect(x, '#cfeaff', 2, 2, 1, 1);
    } else if (nivel === 1) {
      rect(x, '#cfeaff', 2, 1, 1, 3);
      rect(x, '#cfeaff', 1, 2, 3, 1);
    } else {
      rect(x, '#ffffff', 2, 0, 1, 5);
      rect(x, '#ffffff', 0, 2, 5, 1);
      rect(x, '#dff3ff', 1, 1, 1, 1);
      rect(x, '#dff3ff', 3, 1, 1, 1);
      rect(x, '#dff3ff', 1, 3, 1, 1);
      rect(x, '#dff3ff', 3, 3, 1, 1);
    }
    return c;
  });

/** Rain streaks painted once on a 240×160 tile (the loop scrolls it). */
export function lluvia(densidad: number, semilla: number, largo = 4, col = 'rgba(190,215,255,0.62)') {
  return una(`lluvia.${semilla}`, () => {
    const c = lienzo(240, 160);
    const x = ctx(c);
    const r = azar(semilla);
    x.fillStyle = col;
    for (let i = 0; i < densidad; i++) {
      const px = Math.floor(r() * 240);
      const py = Math.floor(r() * 160);
      // a slanted streak: down and a little to the left
      for (let k = 0; k < largo; k++) x.fillRect((px - Math.floor(k / 2) + 240) % 240, (py + k) % 160, 1, 1);
    }
    return c;
  });
}

// ---------------------------------------------------------------- houses

export interface OpcionesCasa {
  /** Width in tiles (5 or 6). */
  w: number;
  techo: string;
  /** The door's tile column, counted from the house's left edge (the door is drawn at the middle of that tile). */
  puerta: number;
  /** Which windows glow (some houses are dark: everyone is at the party). */
  ventanas?: boolean;
  chimenea?: boolean;
  /** A string of bulbs along the eaves. */
  guirnalda?: boolean;
  /** Plaster colour. */
  pared?: string;
}

/** A house 5 tiles tall: a big roof (3 tiles) and the wall (2). The door is at the bottom row. */
export function casa(o: OpcionesCasa): HTMLCanvasElement {
  return una(`casa.${o.w}.${o.techo}.${o.puerta}.${o.ventanas}.${o.chimenea}.${o.guirnalda}.${o.pared}`, () => {
    const W = o.w * T;
    const H = 5 * T;
    const c = lienzo(W, H);
    const x = ctx(c);
    const claro = mezcla(o.techo, '#ffffff', 0.22);
    const oscuro = mezcla(o.techo, '#1a0f2a', 0.28);
    const muyOscuro = mezcla(o.techo, '#1a0f2a', 0.5);
    const pared = o.pared ?? '#e7d3a8';
    const paredO = mezcla(pared, '#2a1a3a', 0.22);
    const paredL = mezcla(pared, '#ffffff', 0.25);
    // --- wall
    rect(x, pared, 4, 47, W - 8, 33);
    rect(x, paredO, 4, 47, W - 8, 3); // shadow under the eaves
    rect(x, paredO, W - 8, 50, 4, 30); // right edge shade
    rect(x, paredL, 4, 50, 1, 30);
    // stone base
    rect(x, C.piedra, 4, 73, W - 8, 7);
    rect(x, C.piedraL, 4, 73, W - 8, 1);
    for (let i = 0; i < (W - 8) / 8; i++) rect(x, C.piedraO, 4 + i * 8 + (i % 2) * 3, 74, 1, 6);
    rect(x, C.piedraO, 4, 79, W - 8, 1);
    // timber frame
    const maderaV = (px: number) => {
      rect(x, C.maderaO, px, 50, 2, 23);
    };
    maderaV(4);
    maderaV(W - 6);
    rect(x, C.maderaO, 4, 60, W - 8, 1);
    // --- roof: a trapezoid of tiles, rows of 4 px
    const alturaTecho = 46;
    for (let y = 2; y < alturaTecho; y++) {
      const inset = Math.round(12 * (1 - (y - 2) / (alturaTecho - 3)));
      const fila = Math.floor((y - 2) / 4);
      const enFila = (y - 2) % 4;
      const base = fila % 2 === 0 ? o.techo : claro;
      for (let px = inset; px < W - inset; px++) {
        let col = base;
        if (enFila === 3) col = oscuro;
        else if (enFila === 0 && fila > 0) col = fila % 2 === 0 ? o.techo : claro;
        // staggered joints
        if (enFila < 3 && (px + (fila % 2) * 4) % 8 === 0) col = oscuro;
        // right side darker (the moon is up on the left)
        if (px > W - inset - 4 && y > 8) col = oscuro;
        x.fillStyle = col;
        x.fillRect(px, y, 1, 1);
      }
    }
    // ridge
    rect(x, claro, 12, 1, W - 24, 2);
    rect(x, oscuro, 12, 3, W - 24, 1);
    // eaves: a scalloped edge and the cast shadow
    for (let px = 0; px < W; px++) {
      const g = px % 4 < 2 ? 0 : 1;
      rect(x, muyOscuro, px, alturaTecho + g, 1, 1);
    }
    rect(x, oscuro, 0, alturaTecho - 1, W, 1);
    // chimney
    if (o.chimenea) {
      const cx = 10;
      rect(x, C.piedraO, cx, 0, 9, 14);
      rect(x, C.piedra, cx + 1, 1, 6, 12);
      rect(x, C.piedraL, cx + 1, 1, 6, 1);
      rect(x, '#3a2a40', cx - 1, 0, 11, 2);
      for (let j = 0; j < 3; j++) rect(x, C.piedraO, cx + 1, 4 + j * 4, 6, 1);
      rect(x, C.piedra, cx - 1, 0, 11, 1);
    }
    // --- door (a wood arch), centred on the given column
    const dx = Math.round(o.puerta * T + T / 2 - 7);
    rect(x, C.maderaO, dx - 1, 58, 16, 22);
    rect(x, C.madera, dx, 60, 14, 20);
    rect(x, C.madera, dx + 1, 58, 12, 2);
    for (let i = 0; i < 3; i++) rect(x, C.maderaO, dx + 4 + i * 4, 60, 1, 20);
    rect(x, C.maderaL, dx + 1, 61, 1, 18);
    rect(x, '#e6c14a', dx + 11, 70, 2, 2);
    rect(x, C.piedraO, dx - 2, 79, 18, 1);
    // doorstep
    rect(x, C.piedraL, dx - 2, 78, 18, 2);
    // --- planter
    const pot = (px: number) => {
      rect(x, '#9a5a3a', px, 74, 10, 6);
      rect(x, '#bb7a52', px, 74, 10, 1);
      for (let i = 0; i < 4; i++) rect(x, i % 2 ? '#ec5a7c' : '#f5d54a', px + 1 + i * 2 + 0, 70 + (i % 2), 2, 3);
      rect(x, C.seto, px, 72, 10, 3);
    };
    pot(dx > 22 ? 8 : W - 18);
    noche(c, TINTE_OBJETO);
    // --- windows and lamp, glowing (painted after the grade)
    const encendido = o.ventanas !== false;
    const ventana = (vx: number) => {
      rect(x, '#2a1c2e', vx - 1, 51, 16, 15);
      rect(x, encendido ? '#ffd56a' : '#35476e', vx, 52, 14, 13);
      if (encendido) {
        rect(x, '#fff0a8', vx + 1, 53, 12, 5);
        rect(x, '#ffb64a', vx + 1, 60, 12, 5);
      }
      rect(x, '#5a3a24', vx + 6, 52, 2, 13);
      rect(x, '#5a3a24', vx, 58, 14, 2);
      // shutters
      rect(x, '#4a8a6a', vx - 3, 52, 3, 13);
      rect(x, '#4a8a6a', vx + 14, 52, 3, 13);
      rect(x, '#2f6a4e', vx - 3, 52, 1, 13);
      rect(x, '#2f6a4e', vx + 16, 52, 1, 13);
      // sill with a flower box
      rect(x, '#6a4528', vx - 2, 66, 18, 2);
      rect(x, '#2a7a3c', vx - 1, 64, 16, 2);
      for (let i = 0; i < 5; i++) rect(x, i % 2 ? '#ff6a8a' : '#ffe14a', vx + i * 3, 63, 2, 2);
    };
    const gap = (W - 8) / 4;
    const posiciones = [4 + gap * 0.55, 4 + gap * 3.45 - 14].map(Math.round);
    for (const vx of posiciones) if (Math.abs(vx + 7 - dx - 7) > 16) ventana(vx);
    if (o.w >= 6) {
      const mid = Math.round(W / 2 - 7);
      if (Math.abs(mid - dx) > 20) ventana(mid);
    }
    // lantern beside the door
    const lx = dx + 17;
    if (lx < W - 6) {
      rect(x, '#2a1c2e', lx, 62, 5, 7);
      rect(x, '#ffd56a', lx + 1, 63, 3, 5);
      rect(x, '#fff0a8', lx + 1, 63, 3, 1);
      rect(x, '#2a1c2e', lx + 2, 60, 1, 2);
    }
    // glow around the lights
    x.save();
    x.globalCompositeOperation = 'lighter';
    const halo = (cx: number, cy: number, rx: number, ry: number, a: number) => {
      for (let i = 0; i < 3; i++) {
        const k = 1 - i / 3;
        elipse(x, `rgba(255,190,90,${a})`, cx, cy, rx * k, ry * k);
      }
    };
    if (encendido) for (const vx of posiciones) if (Math.abs(vx - dx) > 16) halo(vx + 7, 58, 14, 11, 0.07);
    if (lx < W - 6) halo(lx + 2, 66, 8, 8, 0.1);
    x.restore();
    // bulbs on the eaves
    if (o.guirnalda) {
      const cols = ['#ff5a5a', '#ffd84a', '#5ae08a', '#5ab4ff', '#ff7ad0'];
      for (let px = 6, i = 0; px < W - 4; px += 6, i++) {
        const y = alturaTecho + 3 + ((i + 1) % 2);
        rect(x, '#1c1226', px, alturaTecho + 2, 1, y - alturaTecho - 2);
        rect(x, cols[i % cols.length], px - 1, y, 3, 3);
        rect(x, '#ffffff', px, y, 1, 1);
      }
    }
    return c;
  });
}

// ---------------------------------------------------------------- trees

/** A round tree 32×48: a canopy of blobs in three greens and a short trunk. Variant 0–2. */
export function arbol(variante = 0): HTMLCanvasElement {
  return una(`arbol.${variante}`, () => {
    const c = lienzo(32, 48);
    const x = ctx(c);
    const r = azar(900 + variante * 17);
    const verdes = variante === 2 ? ['#2f7f44', '#46a050', '#7ccf6c'] : variante === 1 ? ['#33803f', '#4cae52', '#86d46c'] : ['#2e7a3e', '#43a04f', '#74c968'];
    // trunk and its roots
    rect(x, '#6a4428', 13, 34, 7, 13);
    rect(x, '#8c5d36', 13, 34, 4, 13);
    rect(x, '#4a2e1c', 18, 34, 2, 13);
    rect(x, '#6a4428', 11, 45, 11, 2);
    rect(x, '#4a2e1c', 11, 46, 11, 1);
    // canopy
    const blobs: Array<[number, number, number]> = [[16, 15, 14], [8, 22, 9], [24, 22, 9], [16, 27, 10], [12, 11, 8], [21, 12, 8]];
    for (const [cx, cy, rr] of blobs) elipse(x, verdes[0], cx, cy + 1, rr, rr);
    for (const [cx, cy, rr] of blobs) elipse(x, verdes[1], cx - 1, cy - 1, rr - 1.5, rr - 1.5);
    for (const [cx, cy, rr] of blobs.slice(0, 4)) elipse(x, verdes[2], cx - 3, cy - 4, rr / 2.4, rr / 2.8);
    // leaf clusters, only inside the blobs
    for (let i = 0; i < 40; i++) {
      const px = 4 + Math.floor(r() * 24);
      const py = 4 + Math.floor(r() * 28);
      if (!blobs.some(([cx, cy, rr]) => (px - cx) ** 2 + (py - cy) ** 2 < (rr - 2) ** 2)) continue;
      rect(x, i % 3 ? verdes[0] : verdes[2], px, py, 2, 1);
    }
    // a few fruits or blossoms
    if (variante === 1) for (let i = 0; i < 6; i++) rect(x, '#ff7aa2', 6 + Math.floor(r() * 20), 8 + Math.floor(r() * 20), 2, 2);
    // outline in a dark green
    noche(c, TINTE_OBJETO);
    return c;
  });
}

// ---------------------------------------------------------------- props

/** A tall carved gate post with a lantern, 12×40. */
export const postePuerta = () =>
  una('postePuerta', () => {
    const c = lienzo(14, 44);
    const x = ctx(c);
    rect(x, '#6a4428', 3, 10, 8, 33);
    rect(x, '#8c5d36', 3, 10, 5, 33);
    rect(x, '#b27a43', 3, 10, 1, 33);
    rect(x, '#4a2e1c', 3, 42, 8, 2);
    rect(x, '#4a2e1c', 2, 18, 10, 1);
    rect(x, '#4a2e1c', 2, 30, 10, 1);
    // a carved sun on the top
    rect(x, '#b27a43', 2, 7, 10, 4);
    elipse(x, '#e0a22a', 7, 5, 4, 4);
    elipse(x, '#f5c542', 7, 5, 3, 3);
    noche(c, TINTE_OBJETO);
    // the lantern hanging from the side, lit
    rect(x, '#2a1c2e', 10, 14, 1, 3);
    rect(x, '#2a1c2e', 10, 17, 4, 6);
    rect(x, '#ffd56a', 11, 18, 2, 4);
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) elipse(x, 'rgba(255,200,100,0.14)', 12, 20, 5 - i * 1.5, 5 - i * 1.5);
    x.restore();
    return c;
  });

/** A lamp post 8×40, its lantern lit. */
export const farola = () =>
  una('farola', () => {
    const c = lienzo(12, 44);
    const x = ctx(c);
    rect(x, '#3d3850', 5, 12, 3, 31);
    rect(x, '#5a5470', 5, 12, 1, 31);
    rect(x, '#3d3850', 3, 40, 7, 3);
    rect(x, '#2a2638', 3, 42, 7, 1);
    rect(x, '#3d3850', 4, 6, 5, 8);
    noche(c, TINTE_OBJETO);
    // the lantern, lit
    rect(x, '#2a2638', 2, 2, 9, 2);
    rect(x, '#2a2638', 3, 0, 7, 2);
    rect(x, '#2a2638', 2, 4, 1, 8);
    rect(x, '#2a2638', 10, 4, 1, 8);
    rect(x, '#ffd56a', 3, 4, 7, 8);
    rect(x, '#fff3b0', 4, 4, 5, 4);
    rect(x, '#2a2638', 2, 12, 9, 2);
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) elipse(x, 'rgba(255,200,100,0.12)', 6.5, 8, 6 - i * 2, 6 - i * 2);
    x.restore();
    return c;
  });

/** The crate of soft turrón, 16×20: the nougat slabs show on top. */
export const caja = () =>
  una('caja', () => {
    const c = lienzo(16, 20);
    const x = ctx(c);
    // front
    rect(x, '#c9975a', 0, 9, 16, 11);
    rect(x, '#e4b97a', 0, 9, 16, 1);
    rect(x, '#8a5a30', 0, 19, 16, 1);
    rect(x, '#9a6a3a', 0, 9, 1, 11);
    rect(x, '#9a6a3a', 15, 9, 1, 11);
    for (const py of [12, 16]) rect(x, '#9a6a3a', 1, py, 14, 1);
    // a red label with a little almond
    rect(x, '#d4453a', 4, 13, 8, 3);
    rect(x, '#f4e4b8', 6, 14, 4, 1);
    // top: slabs of turrón in a wooden frame
    rect(x, '#a9783f', 0, 2, 16, 8);
    rect(x, '#e4b97a', 0, 2, 16, 1);
    rect(x, '#f6ead0', 1, 3, 14, 6);
    rect(x, '#fff8e4', 1, 3, 14, 1);
    rect(x, '#e3cfa2', 1, 8, 14, 1);
    rect(x, '#e3cfa2', 7, 3, 1, 6);
    // almonds
    for (const [px, py] of [[3, 5], [5, 7], [10, 4], [12, 6], [9, 7], [2, 7]]) {
      rect(x, '#b88450', px, py, 2, 1);
      rect(x, '#d4a874', px, py - 1, 1, 1);
    }
    // soft: a drip of cream over the front edge
    rect(x, '#f6ead0', 5, 9, 2, 3);
    rect(x, '#f6ead0', 11, 9, 1, 2);
    noche(c, [0.7, 0.74, 0.95]);
    return c;
  });

/** Barrel 14×16. */
export const barril = () =>
  una('barril', () => {
    const c = lienzo(14, 18);
    const x = ctx(c);
    elipse(x, '#8a5a30', 7, 4, 7, 4);
    rect(x, '#a9783f', 0, 4, 14, 12);
    rect(x, '#c9975a', 2, 4, 2, 12);
    rect(x, '#6a4428', 11, 4, 3, 12);
    elipse(x, '#c9975a', 7, 4, 6, 3);
    elipse(x, '#8a5a30', 7, 4, 4, 2);
    for (const py of [6, 12]) {
      rect(x, '#4a4458', 0, py, 14, 2);
      rect(x, '#6a6480', 0, py, 14, 1);
    }
    rect(x, '#6a4428', 1, 16, 12, 2);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** Bench 32×16. */
export const banco = () =>
  una('banco', () => {
    const c = lienzo(32, 18);
    const x = ctx(c);
    rect(x, '#85582f', 2, 2, 28, 3);
    rect(x, '#b27a43', 2, 1, 28, 2);
    rect(x, '#85582f', 2, 8, 28, 3);
    rect(x, '#d39d62', 2, 7, 28, 2);
    rect(x, '#3d3850', 3, 11, 3, 6);
    rect(x, '#3d3850', 26, 11, 3, 6);
    rect(x, '#3d3850', 3, 5, 2, 3);
    rect(x, '#3d3850', 27, 5, 2, 3);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** Sign on a post, 16×26. */
export const cartel = () =>
  una('cartel', () => {
    const c = lienzo(20, 28);
    const x = ctx(c);
    rect(x, '#6a4428', 9, 12, 3, 15);
    rect(x, '#4a2e1c', 11, 12, 1, 15);
    rect(x, '#85582f', 1, 2, 18, 12);
    rect(x, '#e8cf8a', 2, 3, 16, 10);
    rect(x, '#c9a85a', 2, 12, 16, 1);
    // an arrow, a fiesta and a sun
    rect(x, '#b3382c', 4, 7, 9, 2);
    rect(x, '#b3382c', 11, 5, 1, 6);
    rect(x, '#b3382c', 12, 6, 1, 4);
    rect(x, '#b3382c', 13, 7, 1, 2);
    rect(x, '#e8a22c', 14, 4, 2, 2);
    noche(c, TINTE_OBJETO);
    return c;
  });

/** Pot with flowers 14×14. */
export const maceta = (color = '#ff6a8a') =>
  una(`maceta.${color}`, () => {
    const c = lienzo(14, 16);
    const x = ctx(c);
    rect(x, '#9a5a3a', 2, 9, 10, 7);
    rect(x, '#bb7a52', 2, 9, 10, 1);
    rect(x, '#6a3a24', 3, 15, 8, 1);
    rect(x, C.seto, 1, 5, 12, 5);
    rect(x, C.setoO, 1, 8, 12, 2);
    for (const [px, py] of [[2, 3], [6, 1], [10, 3], [4, 5], [8, 4]]) {
      rect(x, color, px, py, 3, 3);
      rect(x, '#fff1a8', px + 1, py + 1, 1, 1);
    }
    noche(c, TINTE_OBJETO);
    return c;
  });

/** The market stall: striped awning, counter with slabs of turrón, bulbs under the awning. 48×44. */
export const puesto = (a = '#d4453a', b = '#f4ead6') =>
  una(`puesto.${a}`, () => {
    const c = lienzo(48, 46);
    const x = ctx(c);
    // counter
    rect(x, '#85582f', 2, 28, 44, 17);
    rect(x, '#b27a43', 2, 28, 44, 3);
    rect(x, '#d39d62', 2, 28, 44, 1);
    for (let i = 0; i < 5; i++) rect(x, '#6a4428', 6 + i * 9, 33, 1, 12);
    rect(x, '#6a4428', 2, 44, 44, 1);
    // slabs of turrón on the counter
    for (let i = 0; i < 4; i++) {
      const px = 6 + i * 10;
      rect(x, '#e6d1a4', px, 22, 8, 6);
      rect(x, '#fff3d4', px, 22, 8, 2);
      rect(x, '#b88450', px + 1, 25, 2, 1);
      rect(x, '#b88450', px + 5, 24, 2, 1);
      rect(x, '#c2a878', px, 27, 8, 1);
    }
    // posts
    rect(x, '#6a4428', 2, 10, 3, 20);
    rect(x, '#6a4428', 43, 10, 3, 20);
    // awning: stripes with a scalloped edge
    for (let px = 0; px < 48; px++) {
      const col = Math.floor(px / 4) % 2 === 0 ? a : b;
      rect(x, col, px, 2, 1, 12);
      rect(x, mezcla(col, '#1a0f2a', 0.2), px, 12, 1, 2);
      const g = Math.floor(px / 4) % 2 === 0 ? 3 : 2;
      rect(x, col, px, 14, 1, g);
    }
    rect(x, mezcla(a, '#ffffff', 0.3), 0, 2, 48, 1);
    rect(x, '#3a2a40', 0, 1, 48, 1);
    noche(c, TINTE_OBJETO);
    // bulbs under the awning, lit
    const cols = ['#ffd84a', '#ff9a4a', '#ffd84a', '#ff9a4a'];
    for (let i = 0; i < 4; i++) {
      const px = 6 + i * 11;
      rect(x, '#1c1226', px + 1, 17, 1, 3);
      rect(x, cols[i], px, 20, 3, 3);
      rect(x, '#fff7c8', px + 1, 20, 1, 1);
    }
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) elipse(x, 'rgba(255,190,90,0.07)', 7 + i * 11, 22, 7 - k * 2, 6 - k * 2);
    x.restore();
    return c;
  });

/** Fountain basin 64×56, the central column and its tiers; water in two frames (the spout is drawn live). */
export function fuente(frame: number): HTMLCanvasElement {
  return una(`fuente.${frame}`, () => {
    const c = lienzo(64, 56);
    const x = ctx(c);
    // basin: outer rim ellipse, the water inside
    elipse(x, C.piedraO, 32, 40, 32, 16);
    elipse(x, C.piedra, 32, 38, 32, 15);
    elipse(x, C.piedraL, 32, 36, 30, 13);
    elipse(x, C.aguaO, 32, 37, 27, 11);
    elipse(x, C.agua, 32, 38, 26, 10);
    // ripples
    for (let i = 0; i < 7; i++) {
      const rx = 8 + ((i * 9 + frame * 3) % 46);
      const ry = 34 + (i % 4) * 3;
      rect(x, C.aguaL, rx, ry, 4, 1);
    }
    // rim details: stones
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const px = Math.round(32 + Math.cos(a) * 28.5);
      const py = Math.round(37 + Math.sin(a) * 12.5);
      rect(x, C.piedraO, px, py, 1, 2);
    }
    // central pillar, two tiers
    rect(x, C.piedraO, 28, 24, 8, 16);
    rect(x, C.piedra, 28, 24, 6, 16);
    rect(x, C.piedraL, 28, 24, 2, 16);
    elipse(x, C.piedraO, 32, 22, 11, 4);
    elipse(x, C.piedraL, 32, 21, 10, 3);
    elipse(x, C.aguaO, 32, 21, 8, 2);
    rect(x, C.piedraO, 30, 8, 4, 14);
    rect(x, C.piedra, 30, 8, 3, 14);
    elipse(x, C.piedraL, 32, 8, 5, 2);
    // a sun on top
    elipse(x, '#f5c542', 32, 4, 4, 4);
    elipse(x, '#ffe27a', 32, 3, 3, 3);
    for (const [px, py] of [[26, 4], [38, 4], [32, -1], [27, 0], [37, 0]]) rect(x, '#f5c542', px, Math.max(0, py), 1, 2);
    noche(c, TINTE_OBJETO);
    return c;
  });
}

/** The big translucent hand of stage light: an open palm, fingers up, 26×32. Rotate it for other directions. */
export const manoLuz = () =>
  una('manoLuz', () => {
    const c = lienzo(26, 32);
    const x = ctx(c);
    const pal = { h: 'rgba(255,248,200,0.95)', l: 'rgba(255,236,150,0.72)', o: 'rgba(255,200,90,0.55)', g: 'rgba(255,214,110,0.30)' };
    pintar(
      x,
      [
        '.........hh.....hh......',
        '........hllh...hllh.....',
        '........hllh...hllh.....',
        '...hh...hllh...hllh.....',
        '..hllh..hllh...hllh.hh..',
        '..hllh..hllh...hllh.hllh',
        '..hllh..hllh.hhhllh.hllh',
        '..hllhhhhllhhhllllhhhllh',
        '..hllllhhllhhllllllhllhh',
        '...hllllhllhhllllllllllh',
        '...hlllllllllllllllllllh',
        '....hlllllllllllllllllh.',
        '....hhllllllllllllllllh.',
        '..hh.hllllllllllllllllh.',
        '.hllhhlllllllllllllllh..',
        '.hlllhllllllllllllllllh.',
        '..hllllllllllllllllllh..',
        '...hlllllllllllllllllh..',
        '....hllllllllllllllllh..',
        '.....hlllllllllllllllh..',
        '......hllllllllllllllh..',
        '.......hllllllllllllh...',
        '.......hllllllllllllh...',
        '........hllllllllllh....',
        '........hhhhhhhhhhhh....',
      ],
      { ...pal },
      0,
      0,
    );
    // soft outer glow
    x.globalCompositeOperation = 'destination-over';
    x.fillStyle = pal.g;
    x.fillRect(0, 0, 0, 0);
    return c;
  });

/** Four-pointed sparkles in the colours of the psynergy, 5×5. */
export const chispa = (col: string) =>
  una(`chispa.${col}`, () => {
    const c = lienzo(5, 5);
    const x = ctx(c);
    rect(x, col, 2, 0, 1, 5);
    rect(x, col, 0, 2, 5, 1);
    rect(x, '#ffffff', 2, 2, 1, 1);
    return c;
  });
export const puntito = (col: string) =>
  una(`puntito.${col}`, () => {
    const c = lienzo(3, 3);
    const x = ctx(c);
    rect(x, col, 1, 0, 1, 3);
    rect(x, col, 0, 1, 3, 1);
    return c;
  });
