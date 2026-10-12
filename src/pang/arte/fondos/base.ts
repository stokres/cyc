// Pixel-art helpers shared by the twelve backgrounds: integer-only drawing (no
// anti-aliasing), banded or ordered-dither gradients, a seeded RNG, tiny pixel glyphs,
// the frame of blocks around the play area and the floor tiles.
import { AREA, FRANJA, W } from '../../tipos';

export type Ctx = CanvasRenderingContext2D;
export type Azar = () => number;

/** Seeded RNG (mulberry32): every background is identical on every run. */
export function semilla(s: number): Azar {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [a, b]. */
export const entre = (r: Azar, a: number, b: number) => a + Math.floor(r() * (b - a + 1));

export function rect(x: Ctx, a: number, b: number, w: number, h: number, c: string) {
  x.fillStyle = c;
  x.fillRect(a, b, w, h);
}

export const punto = (x: Ctx, a: number, b: number, c: string) => rect(x, a, b, 1, 1, c);

/** A filled disc, scanline by scanline (hard edges). */
export function disco(x: Ctx, cx: number, cy: number, rad: number, c: string) {
  x.fillStyle = c;
  for (let dy = -rad; dy <= rad; dy++) {
    const w = Math.floor(Math.sqrt(rad * rad + rad - dy * dy));
    x.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
  }
}

/** A filled ellipse. */
export function elipse(x: Ctx, cx: number, cy: number, rx: number, ry: number, c: string) {
  x.fillStyle = c;
  for (let dy = -ry; dy <= ry; dy++) {
    const t = 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5));
    const w = Math.round(rx * Math.sqrt(Math.max(0, t)));
    x.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
  }
}

/** The top half of an ellipse standing on `base` (domes, humps, arches). */
export function domo(x: Ctx, cx: number, base: number, rx: number, ry: number, c: string) {
  x.fillStyle = c;
  for (let dy = 0; dy < ry; dy++) {
    const t = 1 - (dy * dy) / (ry * ry);
    const w = Math.round(rx * Math.sqrt(Math.max(0, t)));
    x.fillRect(cx - w, base - 1 - dy, 2 * w, 1);
  }
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Ordered-dither fill of a rectangle: `nivel` 0–16 is the share of pixels painted. */
export function tramado(x: Ctx, a: number, b: number, w: number, h: number, c: string, nivel: number) {
  if (nivel <= 0) return;
  if (nivel >= 16) return rect(x, a, b, w, h, c);
  x.fillStyle = c;
  for (let py = b; py < b + h; py++) {
    // Runs of consecutive painted pixels in the row become one fillRect.
    let ini = -1;
    for (let px = a; px <= a + w; px++) {
      const on = px < a + w && BAYER[(py & 3) * 4 + (px & 3)] < nivel;
      if (on && ini < 0) ini = px;
      else if (!on && ini >= 0) {
        x.fillRect(ini, py, px - ini, 1);
        ini = -1;
      }
    }
  }
}

/** Polygon fill by scanlines at pixel centres; `nivel` < 16 dithers it. */
export function poli(x: Ctx, pts: Array<[number, number]>, c: string, nivel = 16) {
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    y0 = Math.min(y0, p[1]);
    y1 = Math.max(y1, p[1]);
  }
  x.fillStyle = c;
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    const yc = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      if ((p[1] <= yc && q[1] > yc) || (q[1] <= yc && p[1] > yc)) xs.push(p[0] + ((yc - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.round(xs[i]);
      const b = Math.round(xs[i + 1]);
      if (nivel >= 16) x.fillRect(a, y, b - a, 1);
      else tramado(x, a, y, b - a, 1, c, nivel);
    }
  }
}

/** A 1px line (Bresenham). */
export function linea(x: Ctx, x0: number, y0: number, x1: number, y1: number, c: string) {
  x.fillStyle = c;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
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

/**
 * A banded sky from y0 to y1 across the play area: one flat colour per band, with a
 * 4-row ordered-dither transition at every join so it never looks like a smooth gradient.
 */
export function cielo(x: Ctx, y0: number, y1: number, cols: string[], a: number = AREA.izq, b: number = AREA.der) {
  const n = cols.length;
  const alto = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const ya = Math.round(y0 + i * alto);
    const yb = i === n - 1 ? y1 : Math.round(y0 + (i + 1) * alto);
    rect(x, a, ya, b - a, yb - ya, cols[i]);
    if (i < n - 1) for (let k = 0; k < 4; k++) tramado(x, a, yb - 4 + k, b - a, 1, cols[i + 1], (k + 1) * 3);
  }
}

/** Haze: a dithered veil that fades from `n0` (top) to `n1` (bottom) in density. */
export function bruma(x: Ctx, y0: number, y1: number, c: string, n0: number, n1: number, a: number = AREA.izq, b: number = AREA.der) {
  for (let y = y0; y < y1; y++) {
    const n = Math.round(n0 + ((n1 - n0) * (y - y0)) / Math.max(1, y1 - y0 - 1));
    tramado(x, a, y, b - a, 1, c, n);
  }
}

/** Scattered stars of 1 px (a few 2 px crosses). */
export function estrellas(x: Ctx, r: Azar, n: number, y0: number, y1: number, cols: string[]) {
  for (let i = 0; i < n; i++) {
    const px = entre(r, AREA.izq + 2, AREA.der - 3);
    const py = entre(r, y0, y1);
    const c = cols[entre(r, 0, cols.length - 1)];
    punto(x, px, py, c);
    if (r() < 0.12) {
      punto(x, px - 1, py, c);
      punto(x, px + 1, py, c);
      punto(x, px, py - 1, c);
      punto(x, px, py + 1, c);
    }
  }
}

/** A blob of dithered light (lamps, windows, neon): three nested dither rings, denser inside. */
export function halo(x: Ctx, cx: number, cy: number, rad: number, c: string, fuerza = 8) {
  const pasos: Array<[number, number]> = [[1, 0.5], [0.68, 0.85], [0.4, 1.3]];
  for (const [k, d] of pasos) {
    const rr = Math.max(2, Math.round(rad * k));
    const n = Math.max(3, Math.round(fuerza * d));
    for (let dy = -rr; dy <= rr; dy++) {
      const w = Math.floor(Math.sqrt(rr * rr - dy * dy));
      tramado(x, cx - w, cy + dy, 2 * w + 1, 1, c, n);
    }
  }
}

/** A pool of light on the ground: a flat dithered ellipse. */
export function charco(x: Ctx, cx: number, cy: number, rx: number, ry: number, c: string, n = 6) {
  for (let dy = -ry; dy <= ry; dy++) {
    const t = 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5));
    const w = Math.round(rx * Math.sqrt(Math.max(0, t)));
    tramado(x, cx - w, cy + dy, 2 * w + 1, 1, c, n);
  }
}

/** Opts for `edificios`. */
export interface OpcEdificios {
  /** Ground line the buildings stand on. */
  base: number;
  x0: number;
  x1: number;
  hmin: number;
  hmax: number;
  wmin: number;
  wmax: number;
  cuerpo: string;
  /** Lit side (right edge) and roof edge colours. */
  lado: string;
  techo: string;
  /** Unlit window colour; lit colours; share of windows lit. */
  apagada: string;
  luces: string[];
  prob: number;
  sep?: number;
}

/** A row of buildings with window grids (flats, city silhouettes). */
export function edificios(x: Ctx, r: Azar, o: OpcEdificios) {
  for (let bx = o.x0; bx < o.x1; ) {
    const w = entre(r, o.wmin, o.wmax);
    const h = entre(r, o.hmin, o.hmax);
    const top = o.base - h;
    const wc = Math.min(w, o.x1 - bx);
    if (wc < 8) break;
    rect(x, bx, top, wc, h, o.cuerpo);
    rect(x, bx + wc - 2, top, 2, h, o.lado);
    rect(x, bx, top, wc, 1, o.techo);
    if (r() < 0.35) rect(x, bx + entre(r, 2, wc - 6), top - 3, 4, 3, o.cuerpo);
    for (let wy = top + 4; wy < o.base - 6; wy += 7) {
      for (let wx = bx + 3; wx < bx + wc - 5; wx += 5) {
        if (r() < o.prob) rect(x, wx, wy, 2, 3, o.luces[entre(r, 0, o.luces.length - 1)]);
        else if (o.apagada !== o.cuerpo) rect(x, wx, wy, 2, 3, o.apagada);
      }
    }
    bx += wc + (o.sep ?? 0);
  }
}

// ---------------------------------------------------------------------------
// Pixel glyphs (3 × 5), for the signs.
const GLIFOS: Record<string, string[]> = {
  B: ['110', '101', '110', '101', '110'],
  R: ['110', '101', '110', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  O: ['111', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  E: ['111', '100', '110', '100', '111'],
  G: ['011', '100', '101', '101', '011'],
  A: ['010', '101', '111', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
};

/** Draws a word with the pixel glyphs; returns its width. */
export function letras(x: Ctx, palabra: string, px: number, py: number, esc: number, c: string) {
  x.fillStyle = c;
  let cx = px;
  for (const ch of palabra) {
    const g = GLIFOS[ch];
    if (g) g.forEach((fila, j) => [...fila].forEach((v, i) => v === '1' && x.fillRect(cx + i * esc, py + j * esc, esc, esc)));
    cx += 4 * esc;
  }
  return cx - px - esc;
}

// ---------------------------------------------------------------------------
// The frame of blocks and the floor tiles.

export interface TemaMarco {
  /** Two alternating block tones, bevel light and bevel shadow. */
  base: string;
  base2: string;
  luz: string;
  sombra: string;
  /** 'ladrillo' staggers the joints like bricks (8 × 4 courses). */
  tipo?: 'bloque' | 'ladrillo';
}

/** Blocks around the play area: top row, left and right columns down to the strip. */
export function marco(x: Ctx, t: TemaMarco, r: Azar) {
  const tile = (tx: number, ty: number) => {
    const alt = (tx / 8 + ty / 8) % 2 === 0;
    rect(x, tx, ty, 8, 8, alt ? t.base : t.base2);
    if (t.tipo === 'ladrillo') {
      rect(x, tx, ty, 8, 1, t.luz);
      rect(x, tx, ty + 3, 8, 1, t.sombra);
      rect(x, tx, ty + 4, 8, 1, t.luz);
      rect(x, tx, ty + 7, 8, 1, t.sombra);
      rect(x, tx + 7, ty, 1, 3, t.sombra);
      rect(x, tx + 3, ty + 4, 1, 3, t.sombra);
    } else {
      rect(x, tx, ty, 8, 1, t.luz);
      rect(x, tx, ty, 1, 8, t.luz);
      rect(x, tx, ty + 7, 8, 1, t.sombra);
      rect(x, tx + 7, ty, 1, 8, t.sombra);
    }
    if (r() < 0.5) punto(x, tx + 2 + Math.floor(r() * 4), ty + 2 + Math.floor(r() * 4), t.sombra);
  };
  for (let tx = 0; tx < W; tx += 8) tile(tx, 0);
  for (let ty = 8; ty < FRANJA; ty += 8) {
    tile(0, ty);
    tile(W - 8, ty);
  }
  // Inner shadow so the play area looks recessed.
  for (let k = 0; k < 3; k++) {
    const n = [10, 6, 3][k];
    tramado(x, AREA.izq, AREA.techo + k, AREA.der - AREA.izq, 1, '#000000', n);
    tramado(x, AREA.izq + k, AREA.techo, 1, AREA.suelo - AREA.techo, '#000000', n);
    tramado(x, AREA.der - 1 - k, AREA.techo, 1, AREA.suelo - AREA.techo, '#000000', n);
  }
}

export type TipoSuelo = 'ladrillo' | 'adoquin' | 'parquet' | 'acolchado' | 'tablas' | 'paja' | 'paseo' | 'piedra' | 'losas' | 'terracota' | 'arena' | 'alfombra';

/** The floor tiles, y 184–192: the first row is the walking surface's edge. */
export function suelo(x: Ctx, tipo: TipoSuelo, r: Azar) {
  const y = AREA.suelo;
  const a = AREA.izq;
  const w = AREA.der - AREA.izq;
  const fila = (yy: number, c: string, h = 1) => rect(x, a, yy, w, h, c);
  const juntas = (yy: number, h: number, paso: number, off: number, c: string) => {
    for (let px = a + off; px < AREA.der; px += paso) rect(x, px, yy, 1, h, c);
  };
  switch (tipo) {
    case 'ladrillo':
      rect(x, a, y, w, 8, '#8a4a3a');
      fila(y, '#b06650');
      fila(y + 3, '#5e2e26');
      fila(y + 4, '#a05a46');
      fila(y + 7, '#5e2e26');
      juntas(y + 1, 2, 12, 4, '#5e2e26');
      juntas(y + 5, 2, 12, 10, '#5e2e26');
      break;
    case 'adoquin':
      rect(x, a, y, w, 8, '#4a4e66');
      fila(y, '#7a7e9a');
      fila(y + 4, '#2c2e44');
      fila(y + 7, '#2c2e44');
      juntas(y + 1, 3, 14, 6, '#2c2e44');
      juntas(y + 5, 2, 14, 13, '#2c2e44');
      for (let px = a + 2; px < AREA.der; px += 14) rect(x, px, y + 1, 5, 1, '#5e6280');
      break;
    case 'parquet':
      rect(x, a, y, w, 8, '#7a4e32');
      fila(y, '#a07048');
      for (let i = 0, px = a; px < AREA.der; i++, px += 16) {
        rect(x, px, y + 1, 16, 7, i % 2 ? '#6a4228' : '#7a4e32');
        rect(x, px, y + 1, 1, 7, '#3e2416');
        rect(x, px, y + 4, 16, 1, '#4e3020');
      }
      fila(y + 7, '#3e2416');
      break;
    case 'acolchado': {
      const cols = ['#8a2e3e', '#2e5a9a', '#2e7a52', '#a07a2e'];
      for (let i = 0, px = a; px < AREA.der; i++, px += 24) {
        const c = cols[i % 4];
        rect(x, px, y, 24, 8, c);
        
        rect(x, px + 23, y, 1, 8, '#00000055');
        rect(x, px, y + 7, 24, 1, '#00000066');
        rect(x, px + 11, y + 3, 2, 2, '#00000044');
      }
      tramado(x, a, y, w, 1, '#ffffff', 8);
      break;
    }
    case 'tablas':
      rect(x, a, y, w, 8, '#4a3020');
      fila(y, '#7a5436');
      fila(y + 3, '#2e1c12');
      fila(y + 7, '#2e1c12');
      juntas(y + 1, 2, 40, 12, '#2e1c12');
      juntas(y + 4, 3, 40, 32, '#2e1c12');
      for (let px = a + 4; px < AREA.der; px += 20) punto(x, px, y + 2, '#8a6a46');
      break;
    case 'paja':
      rect(x, a, y, w, 8, '#4a3626');
      fila(y, '#6a4e34');
      for (let i = 0; i < 70; i++) rect(x, a + entre(r, 0, w - 4), y + entre(r, 1, 7), entre(r, 2, 4), 1, r() < 0.6 ? '#a8884a' : '#7a6038');
      tramado(x, a, y + 5, w, 3, '#2e2018', 6);
      break;
    case 'paseo':
      rect(x, a, y, w, 8, '#4e5870');
      fila(y, '#8090a8');
      fila(y + 7, '#2c3448');
      juntas(y + 1, 6, 24, 0, '#2c3448');
      for (let px = a + 3; px < AREA.der; px += 24) rect(x, px, y + 2, 8, 1, '#5e6a84');
      break;
    case 'piedra':
      rect(x, a, y, w, 8, '#6a5a58');
      fila(y, '#9a8478');
      fila(y + 4, '#3e3034');
      fila(y + 7, '#3e3034');
      juntas(y + 1, 3, 20, 5, '#3e3034');
      juntas(y + 5, 2, 20, 15, '#3e3034');
      tramado(x, a, y + 5, w, 2, '#4e4046', 5);
      break;
    case 'losas':
      rect(x, a, y, w, 8, '#7a7e8a');
      fila(y, '#aab0bc');
      fila(y + 7, '#4e525e');
      juntas(y + 1, 6, 16, 0, '#4e525e');
      for (let i = 0, px = a + 8; px < AREA.der; i++, px += 16) {
        punto(x, px, y + 3, '#5e6270');
        punto(x, px - 1, y + 4, '#5e6270');
        punto(x, px + 1, y + 4, '#5e6270');
        punto(x, px, y + 5, '#5e6270');
        if (i % 2) punto(x, px, y + 4, '#aab0bc');
      }
      break;
    case 'terracota':
      rect(x, a, y, w, 8, '#a8583a');
      fila(y, '#d08060');
      fila(y + 7, '#6e3624');
      juntas(y + 1, 6, 12, 0, '#6e3624');
      for (let px = a + 3; px < AREA.der; px += 12) {
        rect(x, px, y + 2, 3, 1, '#b86a48');
        punto(x, px + 5, y + 5, '#8e4630');
      }
      break;
    case 'arena':
      rect(x, a, y, w, 8, '#a68660');
      fila(y, '#cfae80');
      for (let i = 0; i < 90; i++) punto(x, a + entre(r, 0, w - 1), y + entre(r, 1, 7), r() < 0.5 ? '#8a6c4a' : '#c4a274');
      for (let i = 0; i < 12; i++) rect(x, a + entre(r, 0, w - 12), y + entre(r, 2, 6), entre(r, 6, 12), 1, '#8a6c4a');
      break;
    case 'alfombra':
      rect(x, a, y, w, 8, '#4a1232');
      fila(y, '#7a2a52');
      for (let px = a; px < AREA.der; px += 16) {
        const c = px + 8;
        rect(x, c - 1, y + 2, 2, 1, '#c8a050');
        rect(x, c - 3, y + 3, 6, 2, '#c8a050');
        rect(x, c - 1, y + 5, 2, 1, '#c8a050');
        rect(x, c - 1, y + 3, 2, 2, '#2a0a1e');
        rect(x, px, y + 7, 16, 1, '#2a0a1e');
        punto(x, px, y + 3, '#3a8a9a');
      }
      break;
  }
}
