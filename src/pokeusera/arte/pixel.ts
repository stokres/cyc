// PokéUsera · Edición Jarra: a tiny pixel-art toolkit. Sprites are described with masks
// (ellipses, rects, polygons, lines) painted back to front on an indexed grid; every part gets
// an outline and simple top-left shading automatically. The grid is baked into a canvas once.
//
// Palette indices: 0 transparent, 1 outline (near-black), 2 white/highlight, 3 light, 4 main,
// 5 shade (darker main), 6 and 7 free accent colours of the sprite.

export const STRIDE = 256;

export class Mascara {
  readonly s = new Set<number>();
  tiene(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < STRIDE && y < STRIDE && this.s.has(y * STRIDE + x);
  }
  add(x: number, y: number): this {
    if (x >= 0 && y >= 0 && x < STRIDE && y < STRIDE) this.s.add(y * STRIDE + x);
    return this;
  }
  get tamano(): number {
    return this.s.size;
  }
  each(f: (x: number, y: number) => void): void {
    this.s.forEach((k) => f(k % STRIDE, Math.floor(k / STRIDE)));
  }
  caja(): { x0: number; y0: number; x1: number; y1: number } {
    let x0 = 99,
      y0 = 99,
      x1 = -1,
      y1 = -1;
    this.each((x, y) => {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    });
    return { x0, y0, x1, y1 };
  }
}

/** Ellipse centred on (cx, cy) in continuous coordinates (pixel centres at +0.5). */
export function el(cx: number, cy: number, rx: number, ry: number): Mascara {
  const m = new Mascara();
  for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) {
    for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) m.add(x, y);
    }
  }
  return m;
}

export function rc(x: number, y: number, w: number, h: number): Mascara {
  const m = new Mascara();
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) m.add(x + i, y + j);
  return m;
}

/** Rounded rectangle: corners cut with radius r. */
export function rr(x: number, y: number, w: number, h: number, r: number): Mascara {
  const m = new Mascara();
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const cx = i < r ? r : i >= w - r ? w - r : i + 0.5;
      const cy = j < r ? r : j >= h - r ? h - r : j + 0.5;
      const dx = i + 0.5 - cx;
      const dy = j + 0.5 - cy;
      if (r <= 0 || dx * dx + dy * dy <= r * r + 0.01 || ((i >= r && i < w - r) || (j >= r && j < h - r))) m.add(x + i, y + j);
    }
  }
  return m;
}

/** Polygon (even-odd) sampled at pixel centres. */
export function poli(pts: [number, number][]): Mascara {
  const m = new Mascara();
  let y0 = 99,
    y1 = -1;
  for (const [, y] of pts) {
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) m.add(x, y);
    }
  }
  return m;
}

/** Thick line (square brush of `g` pixels), Bresenham. */
export function lin(x0: number, y0: number, x1: number, y1: number, g = 1): Mascara {
  const m = new Mascara();
  let x = Math.round(x0),
    y = Math.round(y0);
  const X1 = Math.round(x1),
    Y1 = Math.round(y1);
  const dx = Math.abs(X1 - x),
    dy = -Math.abs(Y1 - y);
  const sx = x < X1 ? 1 : -1,
    sy = y < Y1 ? 1 : -1;
  let err = dx + dy;
  const o = Math.floor((g - 1) / 2);
  for (;;) {
    for (let j = 0; j < g; j++) for (let i = 0; i < g; i++) m.add(x - o + i, y - o + j);
    if (x === X1 && y === Y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return m;
}

/** A polyline through the points (e.g. a bent tail or whisker), thickness g. */
export function cur(pts: [number, number][], g = 1): Mascara {
  const m = new Mascara();
  for (let i = 0; i + 1 < pts.length; i++) lin(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], g).each((x, y) => m.add(x, y));
  return m;
}

/** Quadratic Bézier sampled into a polyline of integer points. */
export function bez(p0: [number, number], p1: [number, number], p2: [number, number], n = 12): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}

export function un(...ms: Mascara[]): Mascara {
  const m = new Mascara();
  for (const a of ms) a.s.forEach((k) => m.s.add(k));
  return m;
}
export function men(a: Mascara, ...bs: Mascara[]): Mascara {
  const m = new Mascara();
  a.s.forEach((k) => {
    if (!bs.some((b) => b.s.has(k))) m.s.add(k);
  });
  return m;
}
export function inter(a: Mascara, b: Mascara): Mascara {
  const m = new Mascara();
  a.s.forEach((k) => {
    if (b.s.has(k)) m.s.add(k);
  });
  return m;
}
export function desp(a: Mascara, dx: number, dy: number): Mascara {
  const m = new Mascara();
  a.each((x, y) => m.add(x + dx, y + dy));
  return m;
}
/** Mirror around the vertical axis of a canvas `ancho` pixels wide. */
export function esp(a: Mascara, ancho = 32): Mascara {
  const m = new Mascara();
  a.each((x, y) => m.add(ancho - 1 - x, y));
  return m;
}

const LEYENDA: Record<string, number> = { k: 1, w: 2, l: 3, m: 4, s: 5, a: 6, b: 7, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7 };

export interface OpcionesParte {
  /** Draw an outline around the part (default true). */
  borde?: boolean;
  /** Tones [light, base, shade]; `false` = flat. By default derived from the colour. */
  tonos?: [number, number, number] | false;
  /** Shade crescent depth: 1 (small) or 2 (big); default by size. */
  t?: number;
}

export class Lienzo {
  readonly g: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
    /** True while building a back view: the `cara` layers are skipped. */
    readonly espalda = false,
  ) {
    this.g = new Uint8Array(w * h);
  }

  get(x: number, y: number): number {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.g[y * this.w + x];
  }

  /** Direct pixel. */
  px(x: number, y: number, c: number): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y * this.w + x] = c;
    return this;
  }

  /** Direct pixels on a list of [x, y] pairs. */
  pxs(c: number, ...pts: [number, number][]): this {
    for (const [x, y] of pts) this.px(x, y, c);
    return this;
  }

  /** Fills a mask with one flat colour, no outline. */
  llenar(m: Mascara, c: number): this {
    m.each((x, y) => this.px(x, y, c));
    return this;
  }

  /** Draws only where the target currently has colour `sobre` (for patches that must stay inside a part). */
  llenarSobre(m: Mascara, c: number, ...sobre: number[]): this {
    m.each((x, y) => {
      if (sobre.includes(this.get(x, y))) this.px(x, y, c);
    });
    return this;
  }

  /** A paint stroke of straight pixels (no brush). */
  linea(x0: number, y0: number, x1: number, y1: number, c: number, g = 1): this {
    return this.llenar(lin(x0, y0, x1, y1, g), c);
  }

  rect(x: number, y: number, w: number, h: number, c: number): this {
    return this.llenar(rc(x, y, w, h), c);
  }

  /** Paints a part: fill with shading, then an outline around it (over whatever is beneath). */
  parte(m: Mascara, c: number, o: OpcionesParte = {}): this {
    const borde = o.borde ?? true;
    let tonos: [number, number, number] | false;
    if (o.tonos !== undefined) tonos = o.tonos;
    else if (c === 4) tonos = [3, 4, 5];
    else if (c === 3) tonos = [2, 3, 4];
    else tonos = false;
    const bb = m.caja();
    const t = o.t ?? (Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0) >= 13 ? 2 : 1);
    if (borde) {
      m.each((x, y) => {
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          if (!m.tiene(x + dx, y + dy)) this.px(x + dx, y + dy, 1);
        }
      });
    }
    m.each((x, y) => {
      if (!tonos) return this.px(x, y, c);
      const luz = !m.tiene(x - 1, y) || !m.tiene(x, y - 1) || (t > 1 && !m.tiene(x - 1, y - 1));
      const som = !m.tiene(x + 1, y) || !m.tiene(x, y + 1) || !m.tiene(x + t, y + t);
      this.px(x, y, luz && !som ? tonos[0] : som && !luz ? tonos[2] : tonos[1]);
    });
    return this;
  }

  /** Outline of a mask over what is already there, without filling (e.g. for a jagged edge). */
  contorno(m: Mascara, c = 1): this {
    m.each((x, y) => {
      if (!m.tiene(x + 1, y) || !m.tiene(x - 1, y) || !m.tiene(x, y + 1) || !m.tiene(x, y - 1)) this.px(x, y, c);
    });
    return this;
  }

  /** Stamps ASCII art at (x, y): '.' and ' ' skip; k w l m s a b (or digits 1..7) set colours. */
  est(x: number, y: number, filas: string[], reflejar = false): this {
    filas.forEach((f, j) => {
      const cs = reflejar ? Array.from(f).reverse() : Array.from(f);
      cs.forEach((ch, i) => {
        const c = LEYENDA[ch];
        if (c !== undefined) this.px(x + i, y + j, c);
      });
    });
    return this;
  }

  /** Stamps a symmetrical detail: once at x and mirrored on the 32-wide canvas. */
  estPar(x: number, y: number, filas: string[], ancho = 32): this {
    this.est(x, y, filas);
    const w = Math.max(...filas.map((f) => f.length));
    this.est(ancho - x - w, y, filas, true);
    return this;
  }

  /** Runs `f` only for the front view (faces and other front-only detail). */
  cara(f: () => void): this {
    if (!this.espalda) f();
    return this;
  }

  /** Runs `f` only for the back view. */
  dorso(f: () => void): this {
    if (this.espalda) f();
    return this;
  }

  /** Mirror the whole grid horizontally in place. */
  voltear(): this {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w >> 1; x++) {
        const a = y * this.w + x;
        const b = y * this.w + (this.w - 1 - x);
        const t = this.g[a];
        this.g[a] = this.g[b];
        this.g[b] = t;
      }
    }
    return this;
  }

  /** Back-sprite trick: halve to w/2 × h/2 (most frequent opaque colour, outline wins ties) and double again. */
  engordar(): this {
    const out = new Uint8Array(this.g.length);
    for (let by = 0; by < this.h; by += 2) {
      for (let bx = 0; bx < this.w; bx += 2) {
        const cnt = new Array<number>(8).fill(0);
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) cnt[this.get(bx + i, by + j)]++;
        const opacos = 4 - cnt[0];
        let mejor = 0;
        if (opacos >= 2) {
          let n = -1;
          for (let c = 1; c < 8; c++) {
            if (cnt[c] > n || (cnt[c] === n && c === 1)) {
              n = cnt[c];
              mejor = c;
            }
          }
        }
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if (bx + i < this.w && by + j < this.h) out[(by + j) * this.w + bx + i] = mejor;
      }
    }
    this.g.set(out);
    return this;
  }

  /** Bakes the grid into a canvas using the given palette (index 0 is ignored: transparent). */
  hornear(paleta: string[]): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    const cx = cv.getContext('2d')!;
    const img = cx.createImageData(this.w, this.h);
    const rgbs = paleta.map((p) => {
      const n = parseInt(p.slice(1), 16);
      return [n >> 16, (n >> 8) & 255, n & 255];
    });
    for (let i = 0; i < this.g.length; i++) {
      const c = this.g[i];
      if (!c) continue;
      const [R, G, B] = rgbs[c] ?? rgbs[1];
      img.data[i * 4] = R;
      img.data[i * 4 + 1] = G;
      img.data[i * 4 + 2] = B;
      img.data[i * 4 + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    return cv;
  }
}
