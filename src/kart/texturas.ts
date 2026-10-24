// The textures of the walls, ceilings and doorways of Impropios Kart: 16-bit pixel art painted once by code into
// `Uint32Array`s (ABGR, alpha 0 = see-through), with a few halvings of each for the far columns so that distant
// bricks do not shimmer. One texel is one world unit, so a 64-unit-high wall is 64 rows tall. Nothing runs per frame.
//
// A «kind» is a sort of wall that the circuit's wall map (pista.ts) refers to by number: the whitewashed façade, the
// lounge's panelled wall, the kitchen's tiles, the gala's sequin curtain, and the low things that the camera sees over
// (the pool's kerb, a sofa, the kitchen island, a velvet rope...).

export const K = {
  NADA: 0,
  FACHADA: 1,
  JARDINERA: 2,
  MURETE: 3,
  CESPED: 4,
  TAPIA: 5,
  SALON: 6,
  SOFA: 7,
  ESTANTERIA: 8,
  CHIMENEA: 9,
  COCINA: 10,
  ISLA: 11,
  MESA: 12,
  GALA: 13,
  VALLA: 14,
  BORDILLO: 15,
} as const;
export const N_KINDS = 16;

/** The ceiling's height over the floor, and the height of the rooms' walls. */
export const ALTO_TECHO = 64;

export interface TexKind {
  /** Wall height in world units (= rows of the texture). */
  alto: number;
  /** Width of the texture (a power of two). */
  ancho: number;
  /** Does a ray stop here (nothing is seen beyond), or is it low/partial so that the ray goes on? */
  opaco: boolean;
  /** frames[frame][mip] = texels. */
  frames: Uint32Array[][];
}

export interface TexPuerta {
  ancho: number;
  alto: number;
  mips: Uint32Array[];
}

// ---------------------------------------------------------------- painting tools

const abgr = (hex: number) => (0xff000000 | ((hex & 0xff) << 16) | (hex & 0xff00) | ((hex >> 16) & 0xff)) >>> 0;
const hs = (x: number, y: number, s = 0) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const mezcla = (a: number, b: number, t: number) => {
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t;
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t;
  const bl = (a & 255) + ((b & 255) - (a & 255)) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
};
const oscuro = (c: number, f: number) => mezcla(c, 0x000000, f);
const claro = (c: number, f: number) => mezcla(c, 0xffffff, f);

class Tx {
  readonly d: Uint32Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.d = new Uint32Array(w * h);
  }
  /** One pixel; x wraps (the texture tiles sideways), y is clipped. */
  p(x: number, y: number, c: number) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (y < 0 || y >= this.h) return;
    x = ((x % this.w) + this.w) % this.w;
    this.d[y * this.w + x] = abgr(c);
  }
  /** A pixel only if it is still empty. */
  q(x: number, y: number, c: number) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (y < 0 || y >= this.h) return;
    x = ((x % this.w) + this.w) % this.w;
    if (!this.d[y * this.w + x]) this.d[y * this.w + x] = abgr(c);
  }
  r(x: number, y: number, w: number, h: number, c: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, c);
  }
  /** Clears (makes see-through) a rectangle. */
  borrar(x: number, y: number, w: number, h: number) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const yy = Math.floor(y + j);
        if (yy < 0 || yy >= this.h) continue;
        const xx = (((Math.floor(x + i) % this.w) + this.w) % this.w);
        this.d[yy * this.w + xx] = 0;
      }
  }
  /** A filled ellipse. */
  e(cx: number, cy: number, rx: number, ry: number, c: number) {
    for (let j = Math.floor(-ry); j <= Math.ceil(ry); j++)
      for (let i = Math.floor(-rx); i <= Math.ceil(rx); i++) if ((i / rx) ** 2 + (j / ry) ** 2 <= 1) this.p(cx + i, cy + j, c);
  }
  linea(x0: number, y0: number, x1: number, y1: number, c: number) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.p(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
  }
  /** A char map: letters from the palette, '.' empty. */
  mapa(x: number, y: number, filas: readonly string[], pal: Record<string, number>) {
    filas.forEach((f, j) => {
      for (let i = 0; i < f.length; i++) if (pal[f[i]] !== undefined) this.p(x + i, y + j, pal[f[i]]);
    });
  }
  /** Writes a rectangle's pixels through a function (hex colour or -1 to leave). */
  cada(x: number, y: number, w: number, h: number, f: (i: number, j: number, X: number, Y: number) => number) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const c = f(i, j, x + i, y + j);
        if (c >= 0) this.p(x + i, y + j, c);
      }
  }
}

/** Whitewashed rough stone in rows of uneven blocks, over a rectangle of the texture. */
function encalado(t: Tx, x0: number, y0: number, w: number, h: number, seed: number, contraste = 1) {
  const base = [0xf2eadb, 0xece2cf, 0xe5dac4, 0xf6efe2];
  const junta = mezcla(0xf0e8d6, 0xa89a80, 0.55 * contraste);
  const luz = 0xfffaf0;
  let y = y0;
  let fila = 0;
  while (y < y0 + h) {
    const alt = 6 + Math.floor(hs(fila, seed) * 4);
    let x = x0 - Math.floor(hs(fila, seed + 1) * 14);
    while (x < x0 + w) {
      const an = 11 + Math.floor(hs(x + fila * 5, seed + 3) * 11);
      const c = base[Math.floor(hs(x * 3 + 1, y + seed) * base.length)];
      for (let j = 0; j < alt; j++) {
        if (y + j >= y0 + h) break;
        for (let i = 0; i < an; i++) {
          const X = x + i;
          if (X < x0 || X >= x0 + w) continue;
          let col = c;
          if (j >= alt - 1 || i >= an - 1) col = junta;
          else if (j === 0 && i < an - 2) col = luz;
          else if (hs(X, y + j, seed) > 0.93) col = oscuro(c, 0.06);
          t.p(X, y + j, col);
        }
      }
      x += an;
    }
    y += alt;
    fila++;
  }
}

/** A dark-wood beam across the top of a wall (rows y0..y0+h). */
function viga(t: Tx, y0: number, h: number, base = 0x6a4326) {
  for (let j = 0; j < h; j++) {
    const f = j === 0 ? 0.28 : j < 2 ? 0.1 : j >= h - 2 ? -0.22 : 0;
    for (let x = 0; x < t.w; x++) {
      const veta = hs(x >> 2, j, 7) > 0.8 ? -0.1 : 0;
      t.p(x, y0 + j, f + veta > 0 ? claro(base, f + veta) : oscuro(base, -(f + veta)));
    }
  }
  // a soft shadow under it
  for (let x = 0; x < t.w; x++) {
    const o = t.d[(y0 + h) * t.w + x];
    if (o) t.p(x, y0 + h, oscuro(0xe0d2b6, 0.2));
  }
}

/** Panelled wood wainscot from row y0 to the bottom. */
function zocalo(t: Tx, y0: number, base = 0x8a5a34) {
  const H = t.h;
  for (let y = y0; y < H; y++)
    for (let x = 0; x < t.w; x++) {
      const px = x % 16;
      const py = y - y0;
      let c = base;
      if (py === 0) c = claro(base, 0.35);
      else if (py === 1) c = oscuro(base, 0.15);
      else if (py >= 3 && py < H - y0 - 3) {
        // a bevelled panel
        if (px === 2 || (py === 3 && px > 2 && px < 14)) c = oscuro(base, 0.28);
        else if (px === 13 || (py === H - y0 - 4 && px > 2 && px < 14)) c = claro(base, 0.18);
        else if (px < 2 || px > 13) c = oscuro(base, 0.08);
        else c = hs(x, y, 11) > 0.9 ? oscuro(base, 0.08) : base;
      }
      if (y >= H - 2) c = oscuro(base, 0.45);
      t.p(x, y, c);
    }
}

// ---------------------------------------------------------------- the walls

const PIEDRA_BASE = 0xb8a88c;

function fachada(): Tx {
  const t = new Tx(256, 88);
  // plaster and a stone footing
  encalado(t, 0, 16, 256, 56, 11, 0.7);
  for (let y = 70; y < 88; y++)
    for (let x = 0; x < 256; x++) {
      const fila = Math.floor((y - 70) / 6);
      const bx = Math.floor((x + (fila & 1) * 9) / 18);
      const junta = (y - 70) % 6 === 5 || (x + (fila & 1) * 9) % 18 === 17;
      const c = [0xb3a284, 0xa89878, 0xbdae90][Math.floor(hs(bx, fila, 3) * 3)];
      t.p(x, y, junta ? oscuro(PIEDRA_BASE, 0.4) : (y - 70) % 6 === 0 ? claro(c, 0.15) : c);
    }
  // the terracotta roof's edge: tiles over a deep shadow
  for (let y = 0; y < 15; y++)
    for (let x = 0; x < 256; x++) {
      const fila = Math.floor(y / 3);
      const k = (x + (fila & 1) * 4) % 8;
      let c = [0xc4603a, 0xb85432, 0xd2744a][Math.floor(hs(Math.floor((x + (fila & 1) * 4) / 8), fila, 5) * 3)];
      if (y % 3 === 2) c = oscuro(c, 0.28);
      else if (y % 3 === 0) c = claro(c, 0.1);
      if (k === 7) c = oscuro(c, 0.2);
      t.p(x, y, c);
    }
  t.r(0, 15, 256, 2, 0x7a3a22);
  for (let x = 0; x < 256; x++) t.p(x, 17, mezcla(0xece2cf, 0x9a8a70, 0.4));
  for (let x = 0; x < 256; x++) t.p(x, 18, mezcla(0xece2cf, 0x9a8a70, 0.2));
  // a window with green shutters thrown open and a pot on the sill
  const ventana = (cx: number, y0: number, conMaceta: boolean) => {
    const w = 24;
    const h = 34;
    const x0 = cx - w / 2;
    // stone surround
    t.r(x0 - 3, y0 - 3, w + 6, h + 6, 0xd9cdb2);
    t.r(x0 - 3, y0 - 3, w + 6, 1, 0xfffaf0);
    t.r(x0 - 3, y0 + h + 2, w + 6, 1, 0x9a8a70);
    // glass
    t.cada(x0, y0, w, h, (i, j) => {
      if (i === w / 2 - 1 || i === w / 2 || j === 15 || j === 16) return 0xeee4cc; // the muntins
      const reflejo = i + j < 12 && (i + j) % 4 < 2;
      return reflejo ? 0x7fa8d0 : mezcla(0x2f4a78, 0x4a6c9c, j / h);
    });
    t.r(x0, y0 + h, w, 3, 0xe8dcc0);
    t.r(x0 - 2, y0 + h + 3, w + 4, 2, 0x8a7a60);
    // shutters: louvred green leaves against the wall
    for (const lado of [-1, 1]) {
      const sx = lado < 0 ? x0 - 3 - 8 : x0 + w + 3;
      t.cada(sx, y0 - 2, 8, h + 4, (i, j) => {
        if (i === 0 || i === 7 || j === 0 || j === h + 3) return 0x1f5a3a;
        return j % 3 === 1 ? 0x56b07a : j % 3 === 2 ? 0x2c7a4e : 0x3e9a64;
      });
    }
    if (conMaceta) {
      t.r(x0 + 2, y0 + h - 1, 20, 1, 0x9a4a2a);
      t.mapa(x0 + 3, y0 + h - 8, ['.r.R..r..R.r.r..', 'rRrgrRgrRgrRgrr.', '.gGgGgrGgGggGg..', '..GgGgggGgGgG...'], { r: 0xe03a48, R: 0xb82838, g: 0x3c9a4a, G: 0x2a7438 });
      t.mapa(x0 + 4, y0 + h - 4, ['cccccccccccccc', '.CcccccccccccC', '..CccccccccC..'], { c: 0xc8683a, C: 0x9a4a24 });
    }
  };
  // 64-wide cells: 0 window with pots, 1 small barred window, 2 window, 3 climbing vine and a lantern
  ventana(32, 26, true);
  // a small barred window
  {
    const x0 = 64 + 22;
    t.r(x0 - 2, 36, 24, 20, 0xd9cdb2);
    t.cada(x0, 38, 20, 16, (i, j) => (i % 5 === 2 ? 0x2a2a30 : mezcla(0x26324e, 0x3c5078, j / 16)));
    t.r(x0 - 2, 54, 24, 2, 0x8a7a60);
  }
  ventana(128 + 32, 26, false);
  // vine
  for (let k = 0; k < 90; k++) {
    const x = 192 + 8 + Math.floor(hs(k, 4) * 34);
    const y = 20 + Math.floor(hs(k, 5) * 48);
    const cl = [0x2f8a44, 0x3c9a4a, 0x5ab864, 0x1f6a34][Math.floor(hs(k, 6) * 4)];
    t.r(x, y, 2, 2, cl);
  }
  for (let y = 18; y < 66; y++) t.p(192 + 14 + Math.floor(Math.sin(y / 6) * 3) + (y > 40 ? 4 : 0), y, 0x5a3a20);
  // iron lantern
  t.r(192 + 49, 34, 1, 4, 0x2a2a30);
  t.r(192 + 47, 38, 5, 7, 0x2a2a30);
  t.r(192 + 48, 39, 3, 5, 0xffe08a);
  t.p(192 + 49, 41, 0xffffff);
  return t;
}

function jardinera(): Tx {
  const t = new Tx(64, 10);
  // the planter box and the plants over it (the top rows are leaves and flowers, uneven)
  t.cada(0, 4, 64, 6, (i, j) => {
    if (j === 0) return 0xf6efe2;
    if (j === 5) return 0x8a7a64;
    if (i % 32 === 0 || i % 32 === 31) return 0xc8bca4;
    return j < 2 ? 0xeee4d0 : 0xe2d6bf;
  });
  t.r(0, 5, 64, 1, 0x3a78b8);
  t.r(0, 6, 64, 1, 0x5aa0dc);
  for (let x = 0; x < 64; x++) {
    const alt = 2 + Math.floor(hs(x >> 1, 1) * 3);
    for (let j = 0; j < alt; j++) {
      const flor = hs(x, j, 9) > 0.72;
      t.p(x, 4 - j, flor ? [0xe03a48, 0xff7aa8, 0xffd23a, 0xff5a86][Math.floor(hs(x, 2) * 4)] : [0x2f8a44, 0x3c9a4a, 0x5ab864][Math.floor(hs(x, j) * 3)]);
    }
  }
  return t;
}

function murete(): Tx {
  const t = new Tx(128, 14);
  t.cada(0, 0, 128, 14, (i, j) => {
    if (j < 2) return j === 0 ? 0xfffaf0 : 0xe6dcc4;
    if (j === 2) return 0x9a8a70;
    const fila = Math.floor((j - 3) / 4);
    const bx = Math.floor((i + (fila & 1) * 8) / 16);
    if ((j - 3) % 4 === 3 || (i + (fila & 1) * 8) % 16 === 15) return 0x8a7a62;
    return [0xcbbd9f, 0xc0b194, 0xd4c6a8][Math.floor(hs(bx, fila, 2) * 3)];
  });
  // ivy
  for (let k = 0; k < 40; k++) t.r(Math.floor(hs(k, 8) * 128), 2 + Math.floor(hs(k, 9) * 10), 2, 2, [0x2f8a44, 0x3c9a4a, 0x1f6a34][k % 3]);
  return t;
}

function tapia(): Tx {
  const t = new Tx(256, 44);
  encalado(t, 0, 4, 256, 40, 21, 0.8);
  // capping tiles
  t.cada(0, 0, 256, 4, (i, j) => (j === 3 ? 0x7a3a22 : (i % 8 === 7 ? 0x9a4a2c : j === 0 ? 0xd8784c : 0xc4603a)));
  // bougainvillea tumbling over it
  for (let g = 0; g < 7; g++) {
    const cx = Math.floor(hs(g, 31) * 256);
    const largo = 14 + Math.floor(hs(g, 32) * 16);
    for (let k = 0; k < 150; k++) {
      const a = hs(k, g, 33) * Math.PI * 2;
      const r = Math.sqrt(hs(k, g, 34));
      const x = cx + Math.cos(a) * r * 16;
      const y = 3 + Math.abs(Math.sin(a)) * r * largo;
      const c = hs(k, g, 35) > 0.45 ? [0xe0307a, 0xff4f9a, 0xc02068, 0xff80b4][Math.floor(hs(k, g, 36) * 4)] : [0x2f8a44, 0x3c9a4a, 0x1f6a34][Math.floor(hs(k, g, 37) * 3)];
      t.r(x, y, 2, 2, c);
    }
  }
  return t;
}

function salon(): Tx {
  const t = new Tx(256, 64);
  encalado(t, 0, 8, 256, 38, 31, 0.55);
  viga(t, 0, 6);
  zocalo(t, 46);
  // 0: a wall lamp
  {
    const cx = 32;
    for (let j = -14; j <= 14; j++)
      for (let i = -16; i <= 16; i++) {
        const d = Math.hypot(i, j * 1.2);
        if (d < 16 && t.d[(20 + j) * 256 + cx + i]) t.p(cx + i, 20 + j, mezcla(0xece2cf, 0xffe9a8, (1 - d / 16) * 0.55));
      }
    t.r(cx - 1, 18, 3, 8, 0x3a2e24);
    t.mapa(cx - 4, 12, ['..hhhh..', '.hhHHhh.', 'hhHHHHhh', 'hHHYYHHh', 'hhHHHHhh'], { h: 0xd9a844, H: 0xf6d27a, Y: 0xfff2b8 });
    t.r(cx - 5, 17, 10, 1, 0xfff2b8);
  }
  // 1: paintings
  {
    const cuadro = (x: number, y: number, w: number, h: number, tipo: number) => {
      t.r(x - 2, y - 2, w + 4, h + 4, 0xb8862c);
      t.r(x - 2, y - 2, w + 4, 1, 0xf2cc6a);
      t.r(x - 1, y - 1, w + 2, h + 2, 0x6a4a1c);
      t.cada(x, y, w, h, (i, j) => {
        if (tipo === 0) {
          // a landscape: sky, hills, a house
          const col = j < h * 0.45 ? mezcla(0x8cc4ec, 0xdceaf2, j / (h * 0.45)) : j < h * 0.7 ? [0x6aa04a, 0x8abc62][(i >> 3) & 1] : 0x4a8a3a;
          if (i > w * 0.55 && i < w * 0.8 && j > h * 0.45 && j < h * 0.7) return j < h * 0.55 ? 0xc4603a : 0xf2eadb;
          return col;
        }
        // a portrait in warm colours
        const ov = ((i - w / 2) / (w * 0.32)) ** 2 + ((j - h * 0.42) / (h * 0.3)) ** 2 < 1;
        if (ov) return j < h * 0.34 ? 0x3a2a24 : 0xe8c09a;
        if (j > h * 0.7) return 0x7a2030;
        return 0x5a6a52;
      });
    };
    cuadro(64 + 10, 14, 26, 18, 0);
    cuadro(64 + 44, 20, 10, 14, 1);
  }
  // 2: a deer's head on a wooden shield
  {
    const cx = 128 + 32;
    t.mapa(cx - 7, 14, ['..bbbbbbbb..', '.bBBBBBBBBb.', 'bBBBBBBBBBBb', 'bBBBBBBBBBBb', 'bBBBBBBBBBBb', '.bBBBBBBBBb.', '..bBBBBBBb..', '...bbBBbb...', '.....bb.....'], { b: 0x4a2c14, B: 0x7a4a24 });
    t.mapa(cx - 4, 18, ['..tttttt..', '.tTTTTTTt.', 'tTTTTTTTTt', '.tTTTTTTt.', '..tTTTTt..', '...tTTt...', '....nn....'], { t: 0x8a5a30, T: 0xc89258, n: 0x2a1a16 });
    t.p(cx - 3, 20, 0x1a1210);
    t.p(cx + 2, 20, 0x1a1210);
    // antlers
    const asta = (dir: number) => {
      let x = cx + dir * 5;
      let y = 20;
      for (let k = 0; k < 14; k++) {
        x += dir * 0.9;
        y -= 1.05;
        t.p(x, y, 0xe8dcc0);
        t.p(x + dir, y, 0xb8a888);
        if (k % 4 === 2) for (let m = 1; m <= 4; m++) t.p(x + dir * m * 0.4, y - m, 0xe8dcc0);
      }
    };
    asta(-1);
    asta(1);
  }
  // 3: an arched window onto the garden, with curtains
  {
    const cx = 192 + 32;
    t.r(cx - 16, 10, 32, 36, 0xf6efe2);
    t.cada(cx - 13, 13, 26, 33, (i, j) => {
      const arco = j < 9 && (i - 13) ** 2 / 169 + (9 - j) ** 2 / 81 > 1;
      if (arco) return -1;
      if (i === 12 || i === 13 || j === 17) return 0xf4ecd8;
      return j < 22 ? mezcla(0x9ccaee, 0xd8ecf6, j / 22) : j < 30 ? 0x7cb060 : 0x5a9a48;
    });
    t.borrar(0, 0, 0, 0);
    // olive in the distance, curtains tied back
    t.e(cx - 6, 36, 5, 3, 0x7a9a6a);
    t.r(cx - 7, 38, 1, 4, 0x5a4a30);
    for (const lado of [-1, 1]) {
      const x0 = lado < 0 ? cx - 16 : cx + 8;
      t.cada(x0, 10, 8, 38, (i, j) => (j < 3 ? 0xc89030 : i % 3 === 0 ? 0x8a2030 : i % 3 === 1 ? 0xa83040 : 0x701828));
      t.r(x0, 30, 8, 2, 0xf2c14e);
    }
    t.r(cx - 18, 8, 36, 3, 0x6a4326);
  }
  return t;
}

function sofa(): Tx {
  const t = new Tx(128, 20);
  const paletas = [
    [0x3b6fb0, 0x2d5a96, 0x6a9be0],
    [0xc65a7a, 0x9e3f5c, 0xe88aa6],
  ];
  for (let s = 0; s < 2; s++) {
    const [b, osc, cla] = paletas[s];
    const x0 = s * 64;
    // legs
    for (const lx of [3, 59]) t.r(x0 + lx, 18, 2, 2, 0x4a2c14);
    // the back, a row of tufted panels
    t.cada(x0 + 6, 0, 52, 9, (i, j) => (j === 0 ? cla : j === 1 ? b : i % 13 === 12 ? osc : j > 7 ? osc : mezcla(b, osc, j / 12)));
    for (let k = 0; k < 4; k++)
      for (const by of [3, 6]) t.p(x0 + 12 + k * 13, by, oscuro(b, 0.4));
    // arms at both ends (rolled)
    for (const ax of [0, 56]) {
      t.cada(x0 + ax, 3, 8, 16, (i, j) => (j < 2 ? claro(b, 0.35) : i < 1 || i > 6 ? osc : j > 13 ? osc : i < 3 ? mezcla(b, cla, 0.25) : b));
    }
    // two seat cushions with a piping line
    for (let c = 0; c < 2; c++) {
      t.cada(x0 + 8 + c * 24, 9, 24, 10, (i, j) => (j === 0 ? cla : i === 0 || i === 23 ? osc : j > 8 ? osc : j === 1 ? claro(b, 0.15) : b));
    }
    t.r(x0 + 8, 19, 48, 1, oscuro(osc, 0.35));
  }
  return t;
}

function mesa(): Tx {
  const t = new Tx(64, 11);
  // a low wooden coffee table: top, apron and legs, with a vase and a book on it
  t.cada(0, 5, 64, 2, (_i, j) => (j === 0 ? 0xd8a468 : 0x8a5a30));
  t.r(0, 7, 64, 1, 0x5a3a1c);
  for (const lx of [3, 29, 31, 60]) t.r(lx, 8, 2, 3, 0x5a3a1c);
  t.r(4, 7, 56, 1, 0x6a4426);
  t.mapa(14, 0, ['.gg.', 'gGgg', '.vv.', 'vVvv', 'vVvv', '.vv.'], { g: 0x3c9a4a, G: 0xe03a48, v: 0x3a78b8, V: 0x6aaae0 });
  t.r(40, 3, 10, 2, 0xc03a3a);
  t.r(41, 2, 8, 1, 0xf0e0b8);
  return t;
}

function estanteria(): Tx {
  const t = new Tx(128, 46);
  t.r(0, 0, 128, 46, 0x6a4426);
  for (let b = 0; b < 4; b++) {
    const y0 = 3 + b * 11;
    t.r(0, y0 + 9, 128, 2, 0x8a5a30);
    t.r(0, y0 + 9, 128, 1, 0xb07a44);
    let x = 3;
    while (x < 125) {
      const an = 2 + Math.floor(hs(x, b, 5) * 3);
      const alt = 6 + Math.floor(hs(x, b, 6) * 3);
      const c = [0xc03a3a, 0x3a6ac0, 0x3aa04a, 0xe0b030, 0x8a4ac0, 0xe07030, 0xf0e0c0][Math.floor(hs(x, b, 7) * 7)];
      if (hs(x, b, 8) > 0.9) {
        // a gap or a jar
        t.e(x + 3, y0 + 6, 3, 3, 0xc8683a);
        x += 7;
        continue;
      }
      t.r(x, y0 + 9 - alt, an, alt, c);
      t.r(x, y0 + 9 - alt, 1, alt, claro(c, 0.2));
      x += an + (hs(x, b, 9) > 0.8 ? 2 : 0);
    }
  }
  t.r(0, 0, 3, 46, 0x8a5a30);
  t.r(125, 0, 3, 46, 0x4a2c14);
  t.r(0, 0, 128, 2, 0xa8723c);
  return t;
}

function chimenea(frame: number): Tx {
  const t = new Tx(128, 64);
  // whitewashed breast with stone corners
  encalado(t, 0, 0, 128, 64, 41, 0.9);
  // the stone surround
  t.cada(10, 14, 108, 50, (_i, _j, X, Y) => {
    const fila = Math.floor((Y - 14) / 7);
    const bx = Math.floor((X + (fila & 1) * 7) / 14);
    if ((Y - 14) % 7 === 6 || (X + (fila & 1) * 7) % 14 === 13) return 0x6a625c;
    return [0xa09890, 0x8e867e, 0xb0a8a0][Math.floor(hs(bx, fila, 4) * 3)];
  });
  // the opening: dark, with the fire
  t.cada(34, 30, 60, 34, (i, j) => {
    const arco = j < 10 && (i - 30) ** 2 / 900 + (10 - j) ** 2 / 100 > 1;
    if (arco) return -1;
    return mezcla(0x1a100c, 0x2c1a12, j / 34);
  });
  t.r(34, 60, 60, 4, 0x3a3030);
  // logs and flames
  t.r(46, 56, 36, 4, 0x4a2c14);
  t.r(46, 56, 36, 1, 0x7a4a24);
  t.e(52, 57, 3, 2, 0x2a1a10);
  t.e(76, 57, 3, 2, 0x2a1a10);
  for (let x = 44; x < 84; x++) {
    const centro = 1 - Math.abs(x - 64) / 22;
    if (centro <= 0) continue;
    const alt = Math.floor(centro * (20 + hs(x >> 1, frame, 3) * 12 + (frame ? 4 : 0)));
    for (let y = 0; y < alt; y++) {
      const f = y / alt;
      t.p(x, 56 - y, f < 0.25 ? 0xfff0a0 : f < 0.5 ? 0xffc83a : f < 0.8 ? 0xff7a1f : 0xd0381c);
    }
  }
  // glow on the stones
  for (let j = 0; j < 12; j++) t.q(34, 40 + j, 0x5a2a18);
  // mantel: a wooden beam with candles and a jar
  t.r(2, 10, 124, 4, 0x6a4326);
  t.r(2, 10, 124, 1, 0xb07a44);
  t.r(2, 13, 124, 1, 0x3a2412);
  for (const cx of [22, 106]) {
    t.r(cx, 3, 3, 7, 0xf6efe2);
    t.p(cx + 1, 1, 0xffd23a);
    t.p(cx + 1, 2, 0xffffff);
  }
  t.mapa(60, 1, ['..bb..', '.bBBb.', 'bBBBBb', 'bBwwBb', '.bBBb.'], { b: 0x2f5fa8, B: 0x5a8ad8, w: 0xf4f2ea });
  // a copper pot hanging
  t.e(18, 26, 5, 4, 0xc8683a);
  t.r(14, 22, 9, 1, 0x8a4220);
  return t;
}

function cocina(): Tx {
  const t = new Tx(256, 64);
  // azulejos: 8×8 white tiles, a small blue flower on one in four, a Talavera border at the top
  t.cada(0, 0, 256, 64, (i, j) => {
    if (j < 6) return -1;
    const tx = Math.floor(i / 8);
    const ty = Math.floor((j - 6) / 8);
    const lx = i % 8;
    const ly = (j - 6) % 8;
    if (lx === 7 || ly === 7) return 0xd2cebe;
    if (tx % 2 === 0 && ty % 2 === 0) {
      const dx = Math.abs(lx - 3.5);
      const dy = Math.abs(ly - 3.5);
      if (dx + dy < 1.2) return 0xe8b838;
      if (dx + dy < 3.2 && (dx < 1 || dy < 1)) return 0x2f5fa8;
    }
    return lx === 0 || ly === 0 ? 0xffffff : 0xf6f4ec;
  });
  viga(t, 0, 5);
  // a Talavera border: blue and ochre
  t.cada(0, 6, 256, 4, (i, j) => (j === 0 || j === 3 ? 0x2f5fa8 : (i >> 2) % 2 ? 0xe8b838 : 0x5a8ad8));
  // the counter top and the cabinets
  t.r(0, 44, 256, 2, 0xece6dc);
  t.r(0, 46, 256, 1, 0x8a7a68);
  t.cada(0, 47, 256, 17, (i, j) => {
    const px = i % 24;
    if (j === 16) return 0x4a2c14;
    if (px < 1 || px > 22) return 0x6a4426;
    if (j < 1) return 0x8a5a30;
    if (px === 1 || j === 1 || px === 22 || j === 15) return j === 15 || px === 22 ? 0xa8723c : 0x8a5a30;
    if (px > 8 && px < 15 && j > 2 && j < 5) return 0xe8d8a0;
    return (Math.floor(i / 24) & 1) ? 0xc68b50 : 0xb97d44;
  });
  // 0: a shelf with copper pots and jars
  {
    const x0 = 6;
    t.r(x0, 30, 52, 2, 0x8a5a30);
    t.r(x0, 30, 52, 1, 0xb07a44);
    for (let k = 0; k < 4; k++) {
      t.e(x0 + 8 + k * 12, 26, 5, 4, k % 2 ? 0xc8683a : 0xd9a844);
      t.r(x0 + 3 + k * 12, 22, 11, 1, k % 2 ? 0x8a4220 : 0xa87c24);
      t.p(x0 + 6 + k * 12, 25, 0xfff2b8);
    }
    t.r(x0 + 2, 20, 48, 1, 0x2a2a30);
    for (let k = 0; k < 5; k++) {
      t.mapa(x0 + 4 + k * 10, 13, ['.cc.', 'cCCc', 'cCCc', 'cCCc'], { c: 0xb88a4a, C: 0xe8c880 });
    }
  }
  // 1: the hood and the burners
  {
    const x0 = 64 + 8;
    t.cada(x0, 12, 48, 18, (i, j) => {
      const ancho = 14 + j * 1.0;
      if (Math.abs(i - 24) > ancho) return -1;
      return j === 0 ? 0xf0c890 : i < 24 ? mezcla(0xb8682c, 0xe8a458, (j % 6) / 6) : mezcla(0xa05822, 0xd89048, (j % 6) / 6);
    });
    t.r(x0 + 22, 2, 5, 10, 0x8a4a20);
    for (let k = 0; k < 4; k++) {
      t.r(x0 + 6 + k * 11, 43, 7, 1, 0x2a2a30);
      t.p(x0 + 8 + k * 11, 42, 0x6ac0ff);
      t.p(x0 + 10 + k * 11, 42, 0x6ac0ff);
      t.p(x0 + 9 + k * 11, 41, 0xffffff);
    }
    t.r(x0 + 6, 50, 36, 10, 0x1c1c22);
    t.r(x0 + 8, 52, 32, 6, 0x34343c);
    t.r(x0 + 8, 52, 32, 1, 0x6a6a76);
  }
  // 2: a window over the sink, with shutters
  {
    const cx = 128 + 32;
    t.r(cx - 15, 10, 30, 28, 0xf0e8d6);
    t.cada(cx - 12, 13, 24, 22, (i, j) => (i === 11 || i === 12 || j === 10 ? 0xf0e8d6 : mezcla(0xbfe0f4, 0xfff8dc, j / 22)));
    for (const lado of [-1, 1]) {
      const x0 = lado < 0 ? cx - 24 : cx + 16;
      t.cada(x0, 11, 8, 26, (i, j) => (i === 0 || i === 7 ? 0x1f5a3a : j % 3 === 1 ? 0x56b07a : 0x2c7a4e));
    }
    t.r(cx - 12, 36, 24, 2, 0xe8dcc0);
    // the sink on the counter
    t.r(cx - 10, 43, 20, 2, 0x9aa8b0);
    t.r(cx - 1, 38, 2, 5, 0xb8c4cc);
    t.r(cx - 1, 37, 5, 1, 0xb8c4cc);
  }
  // 3: garlic braids and a ham hanging from the beam
  {
    const x0 = 192;
    for (const [hx, largo] of [[10, 26], [24, 20]] as const) {
      t.r(x0 + hx, 5, 1, 4, 0x6a4a20);
      for (let k = 0; k < largo; k += 3) {
        const x = x0 + hx + (k % 6 === 0 ? -1 : 1);
        t.e(x, 10 + k, 2.4, 2.2, 0xf4f0e4);
        t.p(x - 1, 9 + k, 0xffffff);
        t.p(x + 1, 11 + k, 0xc8c0a8);
        t.p(x, 7 + k, 0xb89a6a);
      }
      t.r(x0 + hx, 10 + largo - 3, 1, 4, 0xc03a3a);
    }
    // the ham on its rack
    t.r(x0 + 38, 5, 1, 5, 0x6a4a20);
    t.r(x0 + 48, 5, 1, 5, 0x6a4a20);
    t.e(x0 + 44, 19, 7, 10, 0x8a2a24);
    t.e(x0 + 43, 17, 4, 6, 0xb84a3a);
    t.r(x0 + 38, 27, 12, 1, 0xf0e0d0);
    t.r(x0 + 43, 29, 3, 4, 0x3a2a20);
    t.r(x0 + 36, 9, 16, 1, 0xf0e0d0);
    // a hanging pan
    t.e(x0 + 22, 38, 7, 5, 0x3a3a42);
    t.r(x0 + 22, 28, 1, 9, 0x6a6a76);
    t.e(x0 + 20, 36, 3, 1, 0x7a7a88);
  }
  return t;
}

function isla(): Tx {
  const t = new Tx(128, 24);
  // marble top, then the wooden cabinets of the kitchen island
  t.cada(0, 6, 128, 18, (i, j) => {
    if (j === 0) return 0xfffaf0;
    if (j < 3) return 0xe8e2d6;
    if (j === 3) return 0x9a8a78;
    const px = i % 32;
    if (j === 17) return 0x4a2c14;
    if (px < 1 || px > 30) return 0x5a3a1c;
    if (px === 1 || j === 4 || px === 30 || j === 16) return 0xa8723c;
    if (px > 12 && px < 19 && j > 6 && j < 9) return 0xe8d8a0;
    return (Math.floor(i / 32) & 1) ? 0xc08040 : 0xb07438;
  });
  // things on top: a pan, a bowl of lemons, bottles (the rows above 6 are see-through)
  t.e(14, 4, 7, 2, 0x4a4a52);
  t.r(21, 3, 8, 1, 0x4a4a52);
  t.e(50, 4, 6, 2, 0x3a78b8);
  for (const [x, y] of [[48, 2], [51, 2], [50, 1]]) t.e(x, y, 1.6, 1.4, 0xf2d23a);
  t.r(88, 0, 3, 6, 0x2f7a3a);
  t.r(89, 0, 1, 1, 0xc03a3a);
  t.r(96, 1, 3, 5, 0x7a1a2a);
  t.r(107, 3, 10, 3, 0xe8d8b0);
  t.r(108, 2, 8, 1, 0xf6ecd0);
  return t;
}

function gala(frame: number): Tx {
  const t = new Tx(256, 64);
  // the sequin curtain: deep magenta folds that run top to bottom
  t.cada(0, 0, 256, 64, (i, j) => {
    const fold = Math.sin((i / 256) * Math.PI * 2 * 21) * 0.5 + 0.5;
    const base = mezcla(0x5a0a40, 0xb41a7c, fold);
    const g = hs(i, j, 51 + frame * 13);
    if (g > 0.955) return 0xffffff;
    if (g > 0.92) return [0xff9ad8, 0x6fe0ff, 0xffe36e][Math.floor(hs(i, j, 5) * 3)];
    if (g > 0.85) return mezcla(base, 0xff6fb5, 0.5);
    return j % 5 === 0 ? oscuro(base, 0.08) : base;
  });
  // the valance on top: a gold swag with tassels
  for (let x = 0; x < 256; x++) {
    const s = Math.abs(((x % 32) - 16) / 16);
    const h = 5 + Math.floor((1 - s * s) * 6);
    for (let y = 0; y < h; y++) t.p(x, y, y === h - 1 ? 0x8a6410 : y === 0 ? 0xfff0a0 : (x + y) % 4 < 2 ? 0xf2c14e : 0xd9a830);
    if (x % 32 === 16) {
      t.r(x - 1, h, 3, 4, 0xf2c14e);
      t.r(x, h + 4, 1, 3, 0xd9a830);
    }
  }
  // fringe at the foot
  for (let x = 0; x < 256; x++) {
    t.p(x, 61, 0xf2c14e);
    t.p(x, 62, x % 2 ? 0xd9a830 : 0xf6d27a);
    t.p(x, 63, 0x6a4a10);
  }
  return t;
}

function valla(): Tx {
  const t = new Tx(128, 14);
  // brass posts with a velvet rope between them; below the rope it is see-through
  for (let px = 0; px < 128; px += 32) {
    t.r(px + 14, 3, 3, 11, 0xd9a844);
    t.r(px + 14, 3, 1, 11, 0xfff0a0);
    t.r(px + 13, 12, 5, 2, 0xb88820);
    t.e(px + 15.5, 2, 2.5, 2.5, 0xf6d27a);
    t.p(px + 15, 1, 0xffffff);
    for (let i = 0; i < 29; i++) {
      const x = px + 17 + i;
      const y = 4 + Math.floor(Math.sin((i / 29) * Math.PI) * 3);
      t.p(x, y, 0xe03a52);
      t.p(x, y + 1, 0xa01430);
      t.p(x, y - 1, 0xff7a8a);
    }
  }
  return t;
}

function bordillo(): Tx {
  const t = new Tx(64, 5);
  t.cada(0, 0, 64, 5, (i, j) => {
    if (j === 0) return 0xffffff;
    if (j === 4) return 0x8aa4b4;
    if (j === 2) return i % 8 < 4 ? 0x3a96d0 : 0x6ac0ee;
    return i % 16 === 15 ? 0xc8d4da : 0xf0ece0;
  });
  return t;
}

// ---------------------------------------------------------------- the doorways (see-through in the opening)

function puertaBase(w: number, h: number): Tx {
  return new Tx(w, h);
}

/** The cutout's top edge, as the row at which the opening starts for each column (curve = how much it rises in the middle). */
function hueco(t: Tx, x0: number, x1: number, yTope: number, curva: number) {
  const mid = (x0 + x1) / 2;
  const med = (x1 - x0) / 2;
  for (let x = x0; x < x1; x++) {
    const k = (x - mid + 0.5) / med;
    const y0 = Math.round(yTope + curva * k * k);
    t.borrar(x, y0, 1, t.h - y0);
  }
}

/** The patio door: whitewashed jambs and lintel, tiles over it, and the wooden leaves open against the jambs. */
function puertaPatio(): Tx {
  const t = puertaBase(128, 64);
  encalado(t, 0, 0, 128, 64, 61, 0.9);
  // stone jambs and a stone arch
  t.cada(0, 6, 128, 58, (i, _j, X, Y) => {
    const arc = i < 14 || i > 113 || Y < 24;
    if (!arc) return -1;
    const fila = Math.floor((Y - 6) / 7);
    const bx = Math.floor((X + (fila & 1) * 7) / 14);
    if ((Y - 6) % 7 === 6 || (X + (fila & 1) * 7) % 14 === 13) return 0x8a7860;
    return [0xcfc0a4, 0xc2b296, 0xd8caae][Math.floor(hs(bx, fila, 8) * 3)];
  });
  // roof tiles over the lintel
  t.cada(0, 0, 128, 7, (i, j) => (j === 6 ? 0x7a3a22 : j % 3 === 2 ? 0x9a4a2c : (i + (j >> 2) * 4) % 8 === 7 ? 0xa04c2e : j % 3 === 0 ? 0xd8784c : 0xc4603a));
  hueco(t, 14, 114, 12, 10);
  // the open leaves: dark boards seen edge-on at each jamb, with iron hinges
  for (const lado of [0, 1]) {
    const x0 = lado ? 106 : 14;
    t.cada(x0, 22, 8, 42, (i, j) => (i === 0 || i === 7 ? 0x3a2412 : j % 7 === 0 ? 0x5a3a1c : i % 3 === 0 ? 0x7a4a24 : 0x8a5a30));
    for (const hy of [26, 40, 54]) t.r(x0, hy, 8, 2, 0x2a2a30);
  }
  // a lantern over the middle
  t.r(63, 6, 2, 4, 0x2a2a30);
  t.r(60, 10, 8, 8, 0x2a2a30);
  t.r(61, 11, 6, 6, 0xffe08a);
  t.p(63, 13, 0xffffff);
  return t;
}

/** The stone arch between the lounge and the kitchen. */
function arcoCocina(): Tx {
  const t = puertaBase(128, 64);
  t.cada(0, 0, 128, 64, (_i, _j, X, Y) => {
    const fila = Math.floor(Y / 7);
    const bx = Math.floor((X + (fila & 1) * 7) / 14);
    if (Y % 7 === 6 || (X + (fila & 1) * 7) % 14 === 13) return 0x7a6c5a;
    return [0xb8aa94, 0xaa9c86, 0xc4b69e][Math.floor(hs(bx, fila, 9) * 3)];
  });
  // the half-round opening, and a keystone
  for (let x = 0; x < 128; x++) {
    const k = (x - 63.5) / 47;
    if (Math.abs(k) >= 1) continue;
    const y0 = Math.round(64 - 50 * Math.sqrt(1 - k * k));
    t.borrar(x, y0, 1, 64 - y0);
  }
  t.r(61, 12, 6, 8, 0xe0d2b6);
  t.r(61, 12, 6, 1, 0xffffff);
  // a dark rim inside the arch
  for (let x = 0; x < 128; x++) {
    const k = (x - 63.5) / 47;
    if (Math.abs(k) >= 1) continue;
    const y0 = Math.round(64 - 50 * Math.sqrt(1 - k * k));
    t.p(x, y0, 0x5a4c3c);
    t.p(x, y0 + 1, 0x8a7c68);
  }
  return t;
}

/** The sequin curtain, parted, between the kitchen and the gala. */
function telon(): Tx {
  const t = puertaBase(128, 64);
  t.cada(0, 0, 128, 64, (i, j) => {
    const fold = Math.sin(i * 0.9) * 0.5 + 0.5;
    const base = mezcla(0x5a0a40, 0xb41a7c, fold);
    const g = hs(i, j, 71);
    if (g > 0.95) return 0xffffff;
    if (g > 0.9) return [0xff9ad8, 0x6fe0ff, 0xffe36e][Math.floor(hs(i, j, 5) * 3)];
    return base;
  });
  // open it: a curve of curtain on each side, tied back with a gold cord
  for (let x = 0; x < 128; x++) {
    const k = Math.abs(x - 63.5) / 63.5;
    const ancho = 26 * (1 - k) + 2; // the cut gets narrower toward the sides
    const borde = 20 + Math.round(36 * Math.pow(Math.max(0, 1 - k * 1.7), 1.4));
    const y0 = Math.max(14, 64 - borde * 0 - Math.round((1 - Math.min(1, k * 1.6)) * 50));
    if (k < 0.62) t.borrar(x, Math.min(63, Math.max(13, 14 + Math.round(k * k * 18))), 1, 64);
    void ancho;
    void y0;
  }
  // swag on top (gold) with tassels
  for (let x = 0; x < 128; x++) {
    const s = Math.abs(((x % 32) - 16) / 16);
    const h = 8 + Math.floor((1 - s * s) * 6);
    for (let y = 0; y < h; y++) t.p(x, y, y === h - 1 ? 0x8a6410 : y === 0 ? 0xfff0a0 : (x + y) % 4 < 2 ? 0xf2c14e : 0xd9a830);
    if (x % 32 === 16) {
      t.r(x - 1, h, 3, 5, 0xf2c14e);
      t.r(x, h + 5, 1, 3, 0xd9a830);
    }
  }
  // gold tie-backs
  for (const cx of [26, 101]) {
    t.r(cx - 2, 38, 6, 3, 0xf2c14e);
    t.r(cx - 1, 41, 4, 5, 0xd9a830);
  }
  return t;
}

/** The front door of the house: a timber lintel, tiles, and big wooden leaves open against the jambs. */
function puertaPrincipal(): Tx {
  const t = puertaBase(128, 64);
  encalado(t, 0, 0, 128, 64, 81, 0.9);
  t.cada(0, 0, 128, 7, (i, j) => (j === 6 ? 0x7a3a22 : j % 3 === 2 ? 0x9a4a2c : (i + (j >> 2) * 4) % 8 === 7 ? 0xa04c2e : j % 3 === 0 ? 0xd8784c : 0xc4603a));
  // stone jambs
  t.cada(0, 7, 128, 57, (i, _j, X, Y) => {
    if (!(i < 14 || i > 113 || Y < 17)) return -1;
    const fila = Math.floor((Y - 7) / 7);
    const bx = Math.floor((X + (fila & 1) * 7) / 14);
    if ((Y - 7) % 7 === 6 || (X + (fila & 1) * 7) % 14 === 13) return 0x8a7860;
    return [0xcfc0a4, 0xc2b296, 0xd8caae][Math.floor(hs(bx, fila, 18) * 3)];
  });
  // a timber lintel
  t.cada(10, 12, 108, 6, (i, j) => (j === 0 ? 0xb07a44 : j === 5 ? 0x3a2412 : i % 11 === 5 ? 0x5a3a1c : 0x7a4a24));
  t.borrar(14, 18, 100, 46);
  // wooden leaves open, with studs
  for (const lado of [0, 1]) {
    const x0 = lado ? 100 : 14;
    t.cada(x0, 18, 14, 46, (i, j) => (i === 0 || i === 13 ? 0x3a2412 : j % 8 === 0 ? 0x4a2c14 : i % 4 === 0 ? 0x6a4426 : 0x7a4a24));
    for (let k = 0; k < 5; k++) {
      t.p(x0 + 3, 22 + k * 9, 0x2a2a30);
      t.p(x0 + 10, 22 + k * 9, 0x2a2a30);
    }
    t.r(x0 + (lado ? 1 : 11), 38, 2, 5, 0x2a2a30);
  }
  // the house number and a lamp
  t.r(63, 8, 2, 3, 0x2a2a30);
  t.r(60, 11, 8, 5, 0xffe08a);
  t.r(60, 11, 8, 1, 0x2a2a30);
  t.r(60, 15, 8, 1, 0x2a2a30);
  return t;
}

// ---------------------------------------------------------------- the ceilings (64×64 tiles, repeated over the floor plan)

export interface TexTecho {
  d: Uint32Array;
  /** Mean colour of the tile when seen from far away. */
  lejos: number;
}

function techoViguetas(): Tx {
  const t = new Tx(64, 64);
  // whitewashed boards between dark beams that form a coffered grid
  t.cada(0, 0, 64, 64, (i, j) => {
    const viga = i < 7 || j < 7;
    if (viga) {
      const lo = i < 7 && j >= 7 ? i : j < 7 && i >= 7 ? j : Math.min(i, j);
      const f = lo === 0 ? 0.3 : lo >= 5 ? -0.25 : 0;
      const veta = hs(i >> 2, j >> 2, 3) > 0.75 ? -0.08 : 0;
      return f + veta > 0 ? claro(0x74492a, f + veta) : oscuro(0x74492a, -(f + veta));
    }
    const tab = (i >> 3) & 1;
    if (j % 8 === 0) return 0xd6c8aa;
    return hs(i >> 1, j, 5) > 0.93 ? 0xe0d2b6 : tab ? 0xece0c4 : 0xe6d8ba;
  });
  return t;
}

function techoGala(): Tx {
  const t = new Tx(64, 64);
  t.cada(0, 0, 64, 64, (i, j) => {
    // a dark ceiling with a silver truss grid, and coloured lamps at the crossings
    if (i % 32 < 2 || j % 32 < 2) return i % 32 === 0 || j % 32 === 0 ? 0xc8c8d8 : 0x6a6a80;
    return mezcla(0x14081e, 0x2a1238, hs(i >> 3, j >> 3, 2) * 0.8);
  });
  for (const [x, y, c] of [[0, 0, 0xff6fb5], [32, 0, 0x6fe0ff], [0, 32, 0xffe36e], [32, 32, 0xa98bff]] as const) {
    t.e(x + 1, y + 1, 3, 3, mezcla(c, 0x000000, 0.35));
    t.e(x + 1, y + 1, 2, 2, c);
    t.p(x + 1, y + 1, 0xffffff);
  }
  return t;
}

// ---------------------------------------------------------------- assembling

function conMips(base: Uint32Array, w: number, h: number, niveles = 3): Uint32Array[] {
  const out = [base];
  let pw = w;
  let ph = h;
  for (let l = 1; l <= niveles; l++) {
    const nw = Math.max(1, pw >> 1);
    const nh = Math.max(1, ph >> 1);
    const prev = out[l - 1];
    const a = new Uint32Array(nw * nh);
    for (let y = 0; y < nh; y++)
      for (let x = 0; x < nw; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) {
            const c = prev[Math.min(ph - 1, y * 2 + dy) * pw + Math.min(pw - 1, x * 2 + dx)];
            if (c >>> 24 === 0) continue;
            r += c & 255;
            g += (c >> 8) & 255;
            b += (c >> 16) & 255;
            n++;
          }
        a[y * nw + x] = n >= 2 ? (0xff000000 | (Math.round(b / n) << 16) | (Math.round(g / n) << 8) | Math.round(r / n)) >>> 0 : 0;
      }
    out.push(a);
    pw = nw;
    ph = nh;
  }
  return out;
}

export interface Texturas {
  kinds: TexKind[];
  puertas: TexPuerta[];
  techos: Uint32Array[];
}

/** Indices of the doorways. */
export const PUERTA = { PATIO: 0, ARCO: 1, TELON: 2, PRINCIPAL: 3 } as const;

let cache: Texturas | null = null;

export function texturas(): Texturas {
  if (cache) return cache;
  const kinds: TexKind[] = Array.from({ length: N_KINDS }, () => ({ alto: 0, ancho: 1, opaco: false, frames: [[new Uint32Array(1)]] }));
  const poner = (k: number, tx: Tx[], opaco: boolean) => {
    kinds[k] = { alto: tx[0].h, ancho: tx[0].w, opaco, frames: tx.map((x) => conMips(x.d, x.w, x.h)) };
  };
  poner(K.FACHADA, [fachada()], true);
  poner(K.JARDINERA, [jardinera()], false);
  poner(K.MURETE, [murete()], false);
  poner(K.TAPIA, [tapia()], true);
  poner(K.SALON, [salon()], true);
  poner(K.SOFA, [sofa()], false);
  poner(K.ESTANTERIA, [estanteria()], false);
  poner(K.CHIMENEA, [chimenea(0), chimenea(1)], true);
  poner(K.COCINA, [cocina()], true);
  poner(K.ISLA, [isla()], false);
  poner(K.MESA, [mesa()], false);
  poner(K.GALA, [gala(0), gala(1)], true);
  poner(K.VALLA, [valla()], false);
  poner(K.BORDILLO, [bordillo()], false);
  // grass strip: nothing to draw, the ray goes on (alto 0)
  kinds[K.CESPED] = { alto: 0, ancho: 1, opaco: false, frames: [[new Uint32Array(1)]] };
  const puertas: TexPuerta[] = [puertaPatio(), arcoCocina(), telon(), puertaPrincipal()].map((x) => ({ ancho: x.w, alto: x.h, mips: conMips(x.d, x.w, x.h) }));
  cache = { kinds, puertas, techos: [new Uint32Array(1), techoViguetas().d, techoViguetas().d, techoGala().d] };
  return cache;
}

/** The ceiling seen through the doors of the circuit: an average colour per ceiling type for the far rows. */
export const TECHO_LEJOS = [0, 0xcdbfa0, 0xd8cdb2, 0x2a1238];
