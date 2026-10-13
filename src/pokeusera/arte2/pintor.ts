// PokéUsera · Edición Jarra (arte v2, estilo portátil de 32 bits): the sprite painter.
//
// Same idea as arte/pixel.ts (shapes are masks painted back to front), but each shape is lit as a
// little height field: a distance transform gives it a dome (or cylinder) profile, a light from the
// top-left is quantised into a 3–5 step colour ramp, and the edges get a *coloured* outline (dark
// hue of the material, lighter on the lit side) plus an optional rim light on the shaded side. Parts
// can cast a soft contact shadow on what is under them. Everything ends in an indexed grid whose
// palette is built on the fly, so every sprite reports how many colours it really uses.
import { Mascara, bez, cur, el, inter, lin, men, poli, rc, rr, un } from '../arte/pixel';

export { Mascara, bez, cur, el, inter, lin, men, poli, rc, rr, un };

/** Width/height of the new sprites. */
export const TAM = 64;

export type Rampa = string[];

/** A material: a ramp dark→light (3 to 5 steps), outline colours and an optional rim colour. */
export interface Mat {
  /** Colours from darkest to lightest. */
  r: Rampa;
  /** Outline on the shaded sides (a dark shade of the same hue). */
  ol: string;
  /** Outline on the lit sides (a bit lighter and more saturated). Defaults to `ol`. */
  ol2?: string;
  /** Rim light on the shaded edge. */
  rim?: string;
}

export interface OpcionesForma {
  /** Outline: true (default, selective), false (none) or 'suave' (lit-side colour everywhere). */
  borde?: boolean | 'suave';
  /** Dome radius in pixels (how wide the lit and shaded bands are). */
  rad?: number;
  /** 'domo' (default), 'cil' (cylinder: vertical bands, `eje` = x of the axis, `semi` = half width) or 'plano'. */
  modo?: 'domo' | 'cil' | 'plano';
  eje?: number;
  semi?: number;
  /** Added to the lighting value (positive = lighter). */
  sesgo?: number;
  /** Strength of the broad top-left → bottom-right gradient (default 0.3). */
  grad?: number;
  /** Rim light on or off (default on when the material has one). */
  rim?: boolean;
  /** Paint at this fixed step (for flat parts). */
  paso?: number;
}

const LUZ: [number, number, number] = (() => {
  const l = Math.hypot(-0.55, -0.7, 0.62);
  return [-0.55 / l, -0.7 / l, 0.62 / l];
})();

function hex2rgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** Distance (≈ Euclidean) from every member pixel to the nearest non-member, 1 on the edge ring. */
function distancia(m: Mascara, x0: number, y0: number, w: number, h: number): Float32Array {
  // A zero border all round stands for «outside», so the neighbour reads need no bounds checks.
  const W = w + 2;
  const p = new Float32Array(W * (h + 2));
  const G = 1e6;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (m.tiene(x0 + i, y0 + j)) p[(j + 1) * W + i + 1] = G;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = (j + 1) * W + i + 1;
      const v = p[k];
      if (!v) continue;
      p[k] = Math.min(p[k - 1] + 1, p[k - W] + 1, p[k - W - 1] + 1.414, p[k - W + 1] + 1.414, v);
    }
  }
  for (let j = h - 1; j >= 0; j--) {
    for (let i = w - 1; i >= 0; i--) {
      const k = (j + 1) * W + i + 1;
      const v = p[k];
      if (!v) continue;
      p[k] = Math.min(p[k + 1] + 1, p[k + W] + 1, p[k + W + 1] + 1.414, p[k + W - 1] + 1.414, v);
    }
  }
  const d = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) d[j * w + i] = p[(j + 1) * W + i + 1];
  return d;
}

const V4: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const V4X = [1, -1, 0, 0];
const V4Y = [0, 0, 1, -1];

export class Pintor {
  /** Palette index per pixel (0 = transparent). */
  readonly g: Uint16Array;
  /** Material id per pixel: -1 nothing, -2 outline or hand-placed pixel. */
  readonly mid: Int16Array;
  /** Ramp step per pixel (for contact shadows and corner smoothing). */
  readonly paso: Int8Array;
  readonly pal: string[] = [''];
  private readonly idx = new Map<string, number>();
  private readonly mats: Mat[] = [];

  constructor(
    readonly w = TAM,
    readonly h = TAM,
    /** True while painting a back view. */
    readonly espalda = false,
    /** Idle frame (0 or 1). */
    readonly f = 0,
  ) {
    this.g = new Uint16Array(w * h);
    this.mid = new Int16Array(w * h).fill(-1);
    this.paso = new Int8Array(w * h);
  }

  /** Registers a colour and returns its palette index. */
  c(hex: string): number {
    let i = this.idx.get(hex);
    if (i === undefined) {
      i = this.pal.length;
      this.pal.push(hex);
      this.idx.set(hex, i);
    }
    return i;
  }

  get numColores(): number {
    return this.pal.length - 1;
  }

  private readonly ids = new Map<Mat, number>();
  /** Registers a material in this painter and returns its id. */
  mat(m: Mat): number {
    let id = this.ids.get(m);
    if (id === undefined) {
      id = this.mats.length;
      this.mats.push(m);
      this.ids.set(m, id);
    }
    return id;
  }

  private dentro(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Palette colour at a pixel, or 0. */
  get(x: number, y: number): number {
    return this.dentro(x, y) ? this.g[y * this.w + x] : 0;
  }

  /** Material id at a pixel (-1 empty). */
  matEn(x: number, y: number): number {
    return this.dentro(x, y) ? this.mid[y * this.w + x] : -1;
  }

  /** Direct pixel with a hex colour (or palette index). It counts as a hand-placed pixel. */
  px(x: number, y: number, col: string | number): this {
    if (!this.dentro(x, y)) return this;
    const i = y * this.w + x;
    this.g[i] = typeof col === 'string' ? this.c(col) : col;
    this.mid[i] = -2;
    return this;
  }

  pxs(col: string, ...pts: [number, number][]): this {
    for (const [x, y] of pts) this.px(x, y, col);
    return this;
  }

  /** Fills a mask with one colour (hand-placed). */
  llenar(m: Mascara, col: string): this {
    m.each((x, y) => this.px(x, y, col));
    return this;
  }

  /** Fills only the pixels of the mask that already belong to material `mat` (patches that must stay inside a part). */
  llenarSobre(m: Mascara, col: string, mat: Mat): this {
    m.each((x, y) => {
      if (this.matEn(x, y) === this.mat(mat)) this.px(x, y, col);
    });
    return this;
  }

  /** A one-pixel ring just outside a mask (hand-placed). */
  aro(m: Mascara, col: string): this {
    m.each((x, y) => {
      for (const [dx, dy] of V4) if (!m.tiene(x + dx, y + dy)) this.px(x + dx, y + dy, col);
    });
    return this;
  }

  linea(x0: number, y0: number, x1: number, y1: number, col: string, g = 1): this {
    return this.llenar(lin(x0, y0, x1, y1, g), col);
  }

  /** Stamps ASCII art: '.' and ' ' skip; every other character is looked up in `leyenda` (hex colours). */
  est(x: number, y: number, filas: string[], leyenda: Record<string, string>, reflejar = false): this {
    filas.forEach((fila, j) => {
      const cs = reflejar ? Array.from(fila).reverse() : Array.from(fila);
      cs.forEach((ch, i) => {
        const col = leyenda[ch];
        if (col) this.px(x + i, y + j, col);
      });
    });
    return this;
  }

  /** Runs `f` only for the front view. */
  cara(f: () => void): this {
    if (!this.espalda) f();
    return this;
  }

  /** Runs `f` only for the back view. */
  dorso(f: () => void): this {
    if (this.espalda) f();
    return this;
  }

  /** Paints a lit shape with its outline. */
  forma(m: Mascara, mat: Mat, o: OpcionesForma = {}): this {
    const mid = this.mat(mat);
    const bb = m.caja();
    const x0 = bb.x0 - 1,
      y0 = bb.y0 - 1;
    const w = bb.x1 - bb.x0 + 3,
      h = bb.y1 - bb.y0 + 3;
    // The members once as plain arrays, and as a bitmap over the box (+1 all round): the passes below look at
    // them many times, and a Set lookup per neighbour was most of the time a sprite took to bake.
    const nm = m.tamano;
    const PX = new Int32Array(nm);
    const PY = new Int32Array(nm);
    const dentroM = new Uint8Array(w * h);
    let q0 = 0;
    m.each((x, y) => {
      PX[q0] = x;
      PY[q0++] = y;
      dentroM[(y - y0) * w + x - x0] = 1;
    });
    const en = (x: number, y: number): boolean => {
      const i = x - x0,
        j = y - y0;
      return i >= 0 && j >= 0 && i < w && j < h && dentroM[j * w + i] === 1;
    };
    const D = distancia(m, x0, y0, w, h);
    const n = mat.r.length;
    const rad = o.rad ?? Math.max(2.5, Math.min(9, Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2.4));
    const modo = o.modo ?? 'domo';
    const hh = new Float32Array(w * h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const d = D[j * w + i];
        if (!d) continue;
        const t = Math.min(1, (d - 0.5) / rad);
        hh[j * w + i] = rad * Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
      }
    }
    const H = (i: number, j: number) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : hh[j * w + i]);
    const cx = (bb.x0 + bb.x1 + 1) / 2,
      cy = (bb.y0 + bb.y1 + 1) / 2;
    const ext = Math.max(bb.x1 - bb.x0 + 1, bb.y1 - bb.y0 + 1) / 2;
    const grad = o.grad ?? 0.3;
    const sesgo = o.sesgo ?? 0;
    // Thresholds on the lighting value for each number of steps.
    const um = n >= 5 ? [-0.1, 0.22, 0.58, 0.9] : n === 4 ? [0.02, 0.4, 0.76] : [0.1, 0.62];
    const pasos = new Int8Array(w * h);
    const lumen = new Float32Array(w * h);
    for (let q = 0; q < nm; q++) {
      const x = PX[q],
        y = PY[q];
      const i = x - x0,
        j = y - y0;
      let lum: number;
      if (o.paso !== undefined || modo === 'plano') {
        lum = 0.55;
      } else if (modo === 'cil') {
        const nx = Math.max(-1, Math.min(1, (x + 0.5 - (o.eje ?? cx)) / (o.semi ?? ext)));
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
        lum = nx * LUZ[0] * 1.15 + nz * LUZ[2] + 0.05;
        // The vertical edges still curl like a dome.
        const gx = (H(i + 1, j) - H(i - 1, j)) / 2;
        const gy = (H(i, j + 1) - H(i, j - 1)) / 2;
        const l = Math.sqrt(gx * gx + gy * gy + 1);
        lum = lum * 0.55 + ((-gx * LUZ[0] - gy * LUZ[1] + LUZ[2]) / l) * 0.45;
      } else {
        const gx = (H(i + 1, j) - H(i - 1, j)) / 2;
        const gy = (H(i, j + 1) - H(i, j - 1)) / 2;
        const l = Math.sqrt(gx * gx + gy * gy + 1);
        // n = (-gx, -gy, 1)/l and light L: lum = n·L.
        lum = (-gx * LUZ[0] - gy * LUZ[1] + LUZ[2]) / l;
      }
      lum += sesgo;
      lumen[j * w + i] = lum;
    }
    // Broad gradient: lighter towards the light, darker away from it.
    const hl = ext * Math.hypot(LUZ[0], LUZ[1]);
    for (let q = 0; q < nm; q++) {
      const x = PX[q],
        y = PY[q];
      const dot = ((x + 0.5 - cx) * LUZ[0] + (y + 0.5 - cy) * LUZ[1]) / hl;
      lumen[(y - y0) * w + x - x0] -= grad * dot;
    }
    for (let q = 0; q < nm; q++) {
      const k = (PY[q] - y0) * w + PX[q] - x0;
      if (o.paso !== undefined) {
        pasos[k] = o.paso;
        continue;
      }
      const lum = lumen[k];
      let p = 0;
      for (const u of um) if (lum > u) p++;
      pasos[k] = p;
    }
    // Tidy: a pixel whose four neighbours agree on another step takes it (no speckle).
    if (o.paso === undefined) {
      const copia = pasos.slice();
      for (let q = 0; q < nm; q++) {
        const x = PX[q],
          y = PY[q];
        const k = (y - y0) * w + x - x0;
        // The four neighbours (right, left, below, above), -1 when outside the mask.
        const v = en(x + 1, y) ? copia[k + 1] : -1;
        if (v < 0) continue;
        if ((en(x - 1, y) ? copia[k - 1] : -1) !== v) continue;
        if ((en(x, y + 1) ? copia[k + w] : -1) !== v) continue;
        if ((en(x, y - 1) ? copia[k - w] : -1) !== v) continue;
        if (v !== copia[k]) pasos[k] = v;
      }
    }
    const borde = o.borde ?? true;
    const conRim = (o.rim ?? true) && !!mat.rim;
    // Outline first, so the fill never hides what the outline leaves inside.
    if (borde) {
      // Palette indices of the outline colours, registered the first time they are needed (as before).
      let iOl = -1;
      let iOl2 = -1;
      const getOl = () => (iOl >= 0 ? iOl : (iOl = this.c(mat.ol)));
      const getOl2 = () => (iOl2 >= 0 ? iOl2 : (iOl2 = this.c(mat.ol2 ?? mat.ol)));
      for (let q = 0; q < nm; q++) {
        const x = PX[q],
          y = PY[q];
        for (let v = 0; v < 4; v++) {
          const dx = V4X[v],
            dy = V4Y[v];
          const px = x + dx,
            py = y + dy;
          if (en(px, py)) continue;
          // The outline pixel sits at (px, py); its outward direction from the part is (dx, dy).
          const luz = dx * LUZ[0] + dy * LUZ[1] > 0;
          const claro = borde === 'suave' || luz;
          const ya = this.dentro(px, py) ? this.mid[py * this.w + px] : -9;
          if (ya === -9) continue;
          const col = claro ? getOl2() : getOl();
          // A shaded-side outline wins over a lit-side one if both want the same pixel.
          if (ya === -2 && this.g[py * this.w + px] === getOl() && claro) continue;
          this.g[py * this.w + px] = col;
          this.mid[py * this.w + px] = -2;
        }
      }
    }
    for (let q = 0; q < nm; q++) {
      const x = PX[q],
        y = PY[q];
      const k = (y - y0) * w + x - x0;
      let p = Math.max(0, Math.min(n - 1, pasos[k]));
      let col = mat.r[p];
      if (conRim && D[k] <= 1.01 && o.paso === undefined) {
        // Rim light: the first pixel row inside the shaded edge.
        let sombra = false;
        for (let v = 0; v < 4 && !sombra; v++) sombra = !en(x + V4X[v], y + V4Y[v]) && V4X[v] * LUZ[0] + V4Y[v] * LUZ[1] < -0.2;
        if (sombra && p <= Math.max(1, n - 3)) {
          col = mat.rim!;
          p = 1;
        }
      }
      this.g[y * this.w + x] = this.c(col);
      this.mid[y * this.w + x] = mid;
      this.paso[y * this.w + x] = p;
    }
    return this;
  }

  /** Soft contact shadow of a mask on whatever is beneath it (drawn *before* the part itself). */
  sombra(m: Mascara, dx: number, dy: number, k = 1): this {
    m.each((x, y) => {
      const X = x + dx,
        Y = y + dy;
      if (m.tiene(X, Y)) return;
      const i = Y * this.w + X;
      if (!this.dentro(X, Y)) return;
      const id = this.mid[i];
      if (id < 0) return;
      const mat = this.mats[id];
      const p = Math.max(0, this.paso[i] - k);
      this.g[i] = this.c(mat.r[p]);
      this.paso[i] = p;
    });
    return this;
  }

  /** Shifts the ramp step of the pixels of `m` that belong to material `mat` (soft patches of light or shade). */
  tono(m: Mascara, mat: Mat, delta: number): this {
    const id = this.mat(mat);
    m.each((x, y) => {
      if (!this.dentro(x, y)) return;
      const i = y * this.w + x;
      if (this.mid[i] !== id) return;
      const p = Math.max(0, Math.min(mat.r.length - 1, this.paso[i] + delta));
      this.g[i] = this.c(mat.r[p]);
      this.paso[i] = p;
    });
    return this;
  }

  /** Scales: staggered little arcs shaded one step darker, a highlight pixel above each. Stays inside material `mat`. */
  escamas(m: Mascara, mat: Mat, sx = 4, sy = 3, opts: { luz?: boolean } = {}): this {
    const id = this.mat(mat);
    const bb = m.caja();
    let fila = 0;
    for (let y = bb.y0; y <= bb.y1; y += sy, fila++) {
      for (let x = bb.x0 - (fila % 2 ? 0 : sx / 2); x <= bb.x1; x += sx) {
        const arcos: [number, number][] = [
          [x - 1, y],
          [x, y + 1],
          [x + 1, y],
        ];
        if (!arcos.every(([ax, ay]) => m.tiene(ax, ay) && this.matEn(ax, ay) === id)) continue;
        for (const [ax, ay] of arcos) {
          const i = ay * this.w + ax;
          const p = Math.max(0, this.paso[i] - 1);
          this.g[i] = this.c(mat.r[p]);
        }
        if (opts.luz !== false && this.matEn(x, y - 1) === id && m.tiene(x, y - 1)) {
          const i = (y - 1) * this.w + x;
          const p = Math.min(mat.r.length - 1, this.paso[i] + 1);
          this.g[i] = this.c(mat.r[p]);
        }
      }
    }
    return this;
  }

  /**
   * Inner corners of the outline get a half-tone pixel (a hand-made anti-aliasing): where a filled
   * pixel touches the outline on two perpendicular sides it drops one step towards the outline.
   */
  suavizar(): this {
    const marcas: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (this.mid[i] < 0) continue;
        const h = this.esContorno(x + 1, y) || this.esContorno(x - 1, y);
        const v = this.esContorno(x, y + 1) || this.esContorno(x, y - 1);
        if (h && v && this.paso[i] > 0) marcas.push(i);
      }
    }
    for (const i of marcas) {
      const mat = this.mats[this.mid[i]];
      const p = this.paso[i] - 1;
      this.g[i] = this.c(mat.r[p]);
      this.paso[i] = p;
    }
    return this;
  }

  private esContorno(x: number, y: number): boolean {
    return this.matEn(x, y) === -2 && this.get(x, y) !== 0 && this.esBorde(x, y);
  }

  private bordes = new Set<number>();
  private esBorde(x: number, y: number): boolean {
    if (this.bordes.size === 0) for (const mt of this.mats) (this.bordes.add(this.c(mt.ol)), this.bordes.add(this.c(mt.ol2 ?? mt.ol)));
    return this.bordes.has(this.get(x, y));
  }

  /** RGBA bytes of the grid. */
  rgba(): Uint8ClampedArray {
    const out = new Uint8ClampedArray(this.w * this.h * 4);
    const rgbs = this.pal.map((p) => (p ? hex2rgb(p) : [0, 0, 0]));
    for (let i = 0; i < this.g.length; i++) {
      const c = this.g[i];
      if (!c) continue;
      const [R, G, B] = rgbs[c];
      out[i * 4] = R;
      out[i * 4 + 1] = G;
      out[i * 4 + 2] = B;
      out[i * 4 + 3] = 255;
    }
    return out;
  }

  /** Bakes the grid into a canvas, once. */
  hornear(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    const cx = cv.getContext('2d')!;
    const img = cx.createImageData(this.w, this.h);
    img.data.set(this.rgba());
    cx.putImageData(img, 0, 0);
    return cv;
  }
}

/** Cubic Bézier sampled into a polyline. */
export function bez3(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], n = 16): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
}

/** Tapered stroke along a polyline: radius goes from r0 to r1 (a disc at every sample). */
export function trazo(pts: [number, number][], r0: number, r1: number): Mascara {
  const m = new Mascara();
  // Resample by arc length at ~0.5 px.
  const largos: number[] = [0];
  for (let i = 1; i < pts.length; i++) largos.push(largos[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = largos[largos.length - 1] || 1;
  for (let s = 0; s <= total * 2; s++) {
    const d = s / 2;
    let k = 1;
    while (k < largos.length - 1 && largos[k] < d) k++;
    const t = (d - largos[k - 1]) / Math.max(1e-6, largos[k] - largos[k - 1]);
    const x = pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * Math.min(1, t);
    const y = pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * Math.min(1, t);
    const r = r0 + (r1 - r0) * (d / total);
    for (let j = Math.floor(y - r) - 1; j <= Math.ceil(y + r) + 1; j++) {
      for (let i = Math.floor(x - r) - 1; i <= Math.ceil(x + r) + 1; i++) {
        if ((i + 0.5 - x) ** 2 + (j + 0.5 - y) ** 2 <= r * r) m.add(i, j);
      }
    }
  }
  return m;
}

/** Shifts a mask. */
export function mover(a: Mascara, dx: number, dy: number): Mascara {
  const m = new Mascara();
  a.each((x, y) => m.add(x + dx, y + dy));
  return m;
}

/** Mirror image of a mask around the vertical axis of a canvas `ancho` wide. */
export function espejo(a: Mascara, ancho = TAM): Mascara {
  const m = new Mascara();
  a.each((x, y) => m.add(ancho - 1 - x, y));
  return m;
}

/** A mask plus its mirror image. */
export const par = (m: Mascara, ancho = TAM): Mascara => un(m, espejo(m, ancho));
