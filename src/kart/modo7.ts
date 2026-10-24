// «Mode 7»: the floor of the circuit drawn row by row in perspective from the baked texture, as the Super Nintendo did
// (and as the first Mario Kart did), plus what stands up from it: the walls and doorways of the house, cast column by
// column over a grid like *Wolfenstein*, the ceiling of the rooms as a second plane, and the projection of the loose
// things (karts, items, scenery) as scaled sprites that the walls can hide. Everything is low resolution (256×144) and
// blown up without smoothing by the screen.
//
// The whole frame (sky, floor, ceiling, walls) is one `ImageData` over a `Uint32Array`: per floor row the point under
// the middle of the row and the step from one pixel to the next are computed once, then every pixel is a texture read
// (from a half, a quarter... size copy of the texture for the far rows, so that distant tiles do not shimmer) and, far
// away, a blend into the haze. A wall column is a ray over the wall map (one cell per texel of the circuit, so that what
// is drawn is exactly what the kart bumps into) and a vertical strip of texture. Nothing here draws SVG, reads pixels
// back or allocates per frame.
import { ALTO_PANORAMA, ANCHO_PANORAMA } from './arte';
import { CELDA_TECHO, TAM, type Pista } from './pista';
import { ALTO_TECHO, K, texturas, type Texturas } from './texturas';

export const W = 256;
export const H = 144;
/** Row of the horizon. */
export const HOR = 54;
/** Focal length in pixels: also pixels per radian of the horizon's scroll. */
export const FOCAL = 102;
/** Height of the camera over the floor (world units). */
export const ALT_CAM = 30;
/** How far behind the kart the camera sits. */
export const ATRAS_CAM = 40;

const FILAS = H - HOR;
/** Farthest a wall is looked for (world units). */
const VISTA = 760;
/** Most layers of wall in one column (the low ones the ray goes over, and what stands behind), plus the doorways. */
const CAPAS = 5;
/** Kinds that the sprites behind them still show through (a velvet rope). */
const CALADOS = 1 << K.VALLA;

/** The haze: its colour and the distances at which it begins and is complete. Interiors have a closer, darker one. */
export interface Ambiente {
  r: number;
  g: number;
  b: number;
  desde: number;
  hasta: number;
}

const CIELO = 0xffdca66f;

export class Modo7 {
  private readonly img: ImageData;
  private readonly buf: Uint32Array;
  private readonly z = new Float32Array(FILAS);
  private readonly nivel = new Uint8Array(FILAS);
  private readonly zt = new Float32Array(HOR);
  private readonly pan: Uint32Array;
  private readonly tex: Texturas;
  private readonly kind: Uint8Array;
  private readonly colm: Uint16Array;
  private readonly dirm: Uint8Array;
  private readonly techo: Uint8Array;
  /** Per column: how many layers of wall can hide a sprite, and for each its distance and its top row. */
  private readonly capaN = new Uint8Array(W);
  private readonly capaZ = new Float32Array(W * CAPAS);
  private readonly capaY = new Int16Array(W * CAPAS);
  // the layers found for the column being cast (nearest first)
  private readonly lT = new Float32Array(10);
  private readonly lK = new Int16Array(10);
  private readonly lC = new Float32Array(10);
  private readonly lO = new Int32Array(10);
  private readonly lS = new Uint8Array(10);
  /** Camera of the last `escena` call, for the projections. */
  cx = 0;
  cy = 0;
  ang = 0;
  private fx = 1;
  private fy = 0;
  private rx = 0;
  private ry = 1;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly pista: Pista,
    panorama: HTMLCanvasElement,
  ) {
    this.img = ctx.createImageData(W, H);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.tex = texturas();
    this.kind = pista.paredes.kind;
    this.colm = pista.paredes.col;
    this.dirm = pista.paredes.dir;
    this.techo = pista.techo;
    this.pan = new Uint32Array(panorama.getContext('2d')!.getImageData(0, 0, ANCHO_PANORAMA, ALTO_PANORAMA).data.buffer.slice(0));
    for (let r = 0; r < FILAS; r++) {
      const z = (ALT_CAM * FOCAL) / (r + 0.5);
      this.z[r] = z;
      // texels covered by one screen pixel here → which half-size copy to read
      const huella = z / FOCAL;
      this.nivel[r] = Math.max(0, Math.min(3, Math.round(Math.log2(Math.max(1, huella)))));
    }
    for (let y = 0; y < HOR; y++) this.zt[y] = ((ALTO_TECHO - ALT_CAM) * FOCAL) / (HOR - y - 0.5);
  }

  /** Paints the whole frame seen from (cx, cy) looking along `ang`, sprites excepted. */
  escena(cx: number, cy: number, ang: number, reloj: number, amb: Ambiente) {
    this.cx = cx;
    this.cy = cy;
    this.ang = ang;
    this.fx = Math.cos(ang);
    this.fy = Math.sin(ang);
    this.rx = -this.fy;
    this.ry = this.fx;
    const nr = Math.round(amb.r);
    const ng = Math.round(amb.g);
    const nbl = Math.round(amb.b);
    const nieblaAbgr = (0xff000000 | (nbl << 16) | (ng << 8) | nr) >>> 0;
    this.cielo();
    this.suelo(amb, nr, ng, nbl, nieblaAbgr);
    this.techoPlano(amb, nr, ng, nbl, nieblaAbgr);
    this.muros(reloj, amb, nr, ng, nbl);
    this.ctx.putImageData(this.img, 0, 0);
  }

  /** The panorama of the horizon, scrolled by the heading, over the top rows. */
  private cielo() {
    const { buf, pan } = this;
    const px = ((Math.floor(this.ang * FOCAL - W / 2) % ANCHO_PANORAMA) + ANCHO_PANORAMA) % ANCHO_PANORAMA;
    const alto0 = HOR - ALTO_PANORAMA;
    if (alto0 > 0) buf.fill(CIELO, 0, alto0 * W);
    for (let r = Math.max(0, -alto0); r < ALTO_PANORAMA; r++) {
      const o = (alto0 + r) * W;
      const f = r * ANCHO_PANORAMA;
      if (px + W <= ANCHO_PANORAMA) buf.set(pan.subarray(f + px, f + px + W), o);
      else {
        const a = ANCHO_PANORAMA - px;
        buf.set(pan.subarray(f + px, f + ANCHO_PANORAMA), o);
        buf.set(pan.subarray(f, f + W - a), o + a);
      }
    }
  }

  private suelo(amb: Ambiente, nr: number, ng: number, nbl: number, nieblaAbgr: number) {
    const { buf, pista } = this;
    const mips = pista.mips;
    const span = Math.max(1, amb.hasta - amb.desde);
    for (let r = 0; r < FILAS; r++) {
      const z = this.z[r];
      const paso = z / FOCAL;
      const niv = this.nivel[r];
      const tex = mips[niv];
      const bits = 10 - niv;
      const mascara = (1 << bits) - 1;
      const esc = 1 / (1 << niv);
      let wx = (this.cx + this.fx * z - this.rx * paso * (W / 2)) * esc;
      let wy = (this.cy + this.fy * z - this.ry * paso * (W / 2)) * esc;
      const dx = this.rx * paso * esc;
      const dy = this.ry * paso * esc;
      const nb = Math.round(256 * Math.max(0, Math.min(1, (z - amb.desde) / span)));
      let o = (HOR + r) * W;
      if (nb === 0) {
        for (let x = 0; x < W; x++) {
          buf[o++] = tex[((wy & mascara) << bits) + (wx & mascara)];
          wx += dx;
          wy += dy;
        }
      } else if (nb >= 256) {
        buf.fill(nieblaAbgr, o, o + W);
      } else {
        for (let x = 0; x < W; x++) {
          const c = tex[((wy & mascara) << bits) + (wx & mascara)];
          const r0 = c & 255;
          const g0 = (c >> 8) & 255;
          const b0 = (c >> 16) & 255;
          buf[o++] = (0xff000000 | ((b0 + (((nbl - b0) * nb) >> 8)) << 16) | ((g0 + (((ng - g0) * nb) >> 8)) << 8) | (r0 + (((nr - r0) * nb) >> 8))) >>> 0;
          wx += dx;
          wy += dy;
        }
      }
    }
  }

  /** The ceiling plane over the covered cells of the house, on the rows over the horizon (the sky stays where it is open). */
  private techoPlano(amb: Ambiente, nr: number, ng: number, nbl: number, nieblaAbgr: number) {
    const { buf, techo } = this;
    const techos = this.tex.techos;
    const span = Math.max(1, amb.hasta - amb.desde);
    const nT = TAM / CELDA_TECHO;
    const sh = Math.log2(CELDA_TECHO);
    for (let y = 0; y < HOR; y++) {
      const z = this.zt[y];
      if (z > amb.hasta + 80) continue;
      const paso = z / FOCAL;
      let wx = this.cx + this.fx * z - this.rx * paso * (W / 2);
      let wy = this.cy + this.fy * z - this.ry * paso * (W / 2);
      const dx = this.rx * paso;
      const dy = this.ry * paso;
      const nb = Math.round(256 * Math.max(0, Math.min(1, (z - amb.desde) / span)));
      const ia = 256 - nb;
      const fr = (nr * nb) >> 8;
      const fg = (ng * nb) >> 8;
      const fb = (nbl * nb) >> 8;
      const fogC = fr | (fg << 8) | (fb << 16);
      let o = y * W;
      for (let x = 0; x < W; x++, o++, wx += dx, wy += dy) {
        const ix = Math.floor(wx);
        const iy = Math.floor(wy);
        if (ix < 0 || iy < 0 || ix >= TAM || iy >= TAM) continue;
        const t = techo[(iy >> sh) * nT + (ix >> sh)];
        if (!t) continue;
        if (nb >= 256) {
          buf[o] = nieblaAbgr;
          continue;
        }
        const c = techos[t][((iy & 63) << 6) + (ix & 63)];
        buf[o] = (0xff000000 | ((((c & 0xff00ff) * ia) >>> 8) & 0xff00ff) | ((((c & 0x00ff00) * ia) >>> 8) & 0x00ff00)) + fogC;
      }
    }
  }

  /** The walls and the doorways, cast over the wall map one column at a time. */
  private muros(reloj: number, amb: Ambiente, nr: number, ng: number, nbl: number) {
    const { kind, colm, dirm, buf, tex, lT, lK, lC, lO, lS, capaN, capaZ, capaY } = this;
    const { cx, cy, fx, fy, rx, ry } = this;
    const T = TAM;
    const kinds = tex.kinds;
    const puertas = this.pista.puertas;
    const frameAnim = Math.floor(reloj * 5) & 1;
    const span = Math.max(1, amb.hasta - amb.desde);
    // the doorways worth looking at (in range)
    let nPuertas = 0;
    for (let i = 0; i < puertas.length; i++) {
      const p = puertas[i];
      if (Math.hypot(p.x - cx, p.y - cy) < VISTA + p.medio) puertaVista[nPuertas++] = i;
    }
    const mx0 = Math.floor(cx);
    const my0 = Math.floor(cy);
    const kInicial = mx0 >= 0 && my0 >= 0 && mx0 < T && my0 < T ? kind[my0 * T + mx0] : 0;
    for (let x = 0; x < W; x++) {
      const lado = (x + 0.5 - W / 2) / FOCAL;
      const rdx = fx + rx * lado;
      const rdy = fy + ry * lado;
      // ---- DDA over the map
      let mx = mx0;
      let my = my0;
      const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
      const ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      const sx = rdx < 0 ? -1 : 1;
      const sy = rdy < 0 ? -1 : 1;
      let tx = rdx < 0 ? (cx - mx) * ddx : (mx + 1 - cx) * ddx;
      let ty = rdy < 0 ? (cy - my) * ddy : (my + 1 - cy) * ddy;
      let prev = kInicial;
      let n = 0;
      let tFin = VISTA;
      let lado0 = 0;
      for (let paso = 0; paso < 1400; paso++) {
        let t: number;
        if (tx < ty) {
          t = tx;
          tx += ddx;
          mx += sx;
          lado0 = 0;
        } else {
          t = ty;
          ty += ddy;
          my += sy;
          lado0 = 1;
        }
        if (t > VISTA || mx < 0 || my < 0 || mx >= T || my >= T) break;
        const o = my * T + mx;
        const k = kind[o];
        if (k !== prev) {
          prev = k;
          if (k !== 0 && kinds[k].alto > 0) {
            lT[n] = t;
            lK[n] = k;
            lC[n] = colm[o];
            lO[n] = o;
            lS[n] = lado0;
            n++;
            if (kinds[k].opaco || n >= CAPAS - 1) {
              tFin = t;
              break;
            }
          }
        }
      }
      // ---- doorways: analytic crossings of the frame's plane, merged by distance
      for (let q = 0; q < nPuertas; q++) {
        const p = puertas[puertaVista[q]];
        const den = rdx * p.tx + rdy * p.ty;
        if (Math.abs(den) < 1e-4) continue;
        const t = ((p.x - cx) * p.tx + (p.y - cy) * p.ty) / den;
        if (t < 1 || t >= tFin || n >= 9) continue;
        const l = (cx + rdx * t - p.x) * -p.ty + (cy + rdy * t - p.y) * p.tx;
        if (l < -p.medio || l >= p.medio) continue;
        // insert sorted
        let j = n;
        while (j > 0 && lT[j - 1] > t) {
          lT[j] = lT[j - 1];
          lK[j] = lK[j - 1];
          lC[j] = lC[j - 1];
          lO[j] = lO[j - 1];
          lS[j] = lS[j - 1];
          j--;
        }
        lT[j] = t;
        lK[j] = 100 + p.tipo;
        lC[j] = (l + p.medio) / (2 * p.medio);
        lO[j] = -1 - q;
        lS[j] = 0;
        n++;
      }
      // ---- draw far to near
      let nc = 0;
      for (let i = n - 1; i >= 0; i--) {
        const t = Math.max(0.5, lT[i]);
        const k = lK[i];
        const kk = FOCAL / t;
        let alto: number;
        let tw: number;
        let th: number;
        let mips: Uint32Array[];
        let colu: number;
        let esPuerta = false;
        let ratio = 0;
        // light on the wall: smooth with the way it faces (never with the grid's faces, which would stripe the slanted walls)
        let lum = 256;
        if (k >= 100) {
          const pt = tex.puertas[k - 100];
          alto = ALTO_TECHO;
          tw = pt.ancho;
          th = pt.alto;
          mips = pt.mips;
          colu = lC[i] * tw;
          esPuerta = true;
          const pp = puertas[puertaVista[-lO[i] - 1]];
          ratio = (((t / FOCAL) * (1 + lado * lado)) / Math.max(0.12, Math.abs(rdx * pp.tx + rdy * pp.ty))) * (tw / (2 * pp.medio));
        } else {
          const kd = kinds[k];
          alto = kd.alto;
          tw = kd.ancho;
          th = kd.alto;
          const fr = kd.frames;
          mips = fr[fr.length > 1 ? frameAnim : 0];
          // the column follows the exact spot hit along the wall, not just the cell: smooth texture on slanted walls
          const o = lO[i];
          colu = lC[i];
          const dd = dirm[o];
          const hx = cx + rdx * t - ((o % T) + 0.5);
          const hy = cy + rdy * t - (((o / T) | 0) + 0.5);
          const proy = hx * TANX[dd & 127] + hy * TANY[dd & 127];
          colu = (colu >> 2) + (dd & 128 ? -proy : proy);
          ratio = ((t / FOCAL) * (1 + lado * lado)) / Math.max(0.12, Math.abs(rdx * TANY[dd & 127] - rdy * TANX[dd & 127]));
          // the wall's inward normal: to the left of the travel on a left wall, to the right on a right one
          const ny = dd & 128 ? -TANX[dd & 127] : TANX[dd & 127];
          const nx = dd & 128 ? TANY[dd & 127] : -TANY[dd & 127];
          lum = Math.min(256, 230 + Math.round(34 * (nx * 0.55 - ny * 0.83)));
        }
        // at a grazing angle one screen column covers many texels along the wall: a smaller copy then, too
        const hl = ratio < 1.4 ? 0 : ratio < 2.8 ? 1 : ratio < 5.6 ? 2 : 3;
        const vl = kk >= 0.75 ? 0 : kk >= 0.37 ? 1 : kk >= 0.18 ? 2 : 3;
        const lvl = Math.min(mips.length - 1, Math.max(hl, vl));
        const twl = Math.max(1, tw >> lvl);
        const thl = Math.max(1, th >> lvl);
        const tx0 = esPuerta ? Math.min(twl - 1, Math.floor(colu) >> lvl) : Math.floor(colu) >> lvl & (twl - 1);
        const tex0 = mips[lvl];
        const yBase = HOR + ALT_CAM * kk;
        const yTop = HOR + (ALT_CAM - alto) * kk;
        let y0 = Math.ceil(yTop);
        let y1 = Math.min(H - 1, Math.floor(yBase));
        if (!esPuerta && (CALADOS >> k) & 1) {
          // see-through: does not hide sprites
        } else if (!esPuerta) {
          const ci = x * CAPAS + nc;
          capaZ[ci] = t;
          capaY[ci] = Math.max(-1, Math.min(H, Math.floor(yTop)));
          nc++;
        }
        if (y0 < 0) y0 = 0;
        if (y1 < y0) continue;
        const dv = thl / Math.max(1, yBase - yTop);
        let v = (y0 - yTop) * dv;
        // light: the side faces are a little darker; the haze takes over with distance
        const nb = Math.round(256 * Math.max(0, Math.min(1, (t - amb.desde) / span)));
        const a = ((256 - nb) * lum) >> 8;
        const fogC = ((nr * nb) >> 8) | (((ng * nb) >> 8) << 8) | (((nbl * nb) >> 8) << 16);
        let o = y0 * W + x;
        for (let y = y0; y <= y1; y++, o += W, v += dv) {
          let ty2 = Math.floor(v);
          if (ty2 >= thl) ty2 = thl - 1;
          const c = tex0[ty2 * twl + tx0];
          if (c >>> 24 === 0) continue;
          buf[o] = (0xff000000 | ((((c & 0xff00ff) * a) >>> 8) & 0xff00ff) | ((((c & 0x00ff00) * a) >>> 8) & 0x00ff00)) + fogC;
        }
      }
      capaN[x] = nc;
    }
  }

  /** The row from which a sprite at forward distance `dz` is hidden by a wall in this column (H if it is not). */
  recorte(x: number, dz: number): number {
    let y = H;
    const n = this.capaN[x];
    for (let i = 0; i < n; i++) {
      const ci = x * CAPAS + i;
      if (this.capaZ[ci] < dz && this.capaY[ci] < y) y = this.capaY[ci];
    }
    return y;
  }

  /** The kind of wall at a point of the world (0 = none): what the camera must not sink into. */
  paredEn(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= TAM || iy >= TAM) return K.TAPIA;
    return this.kind[iy * TAM + ix];
  }

  /** How tall a kind of wall is. */
  altoDe(k: number): number {
    return this.tex.kinds[k].alto;
  }

  /** The ceiling over a point (0 = open sky). */
  techoEn(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= TAM || iy >= TAM) return 0;
    const nT = TAM / CELDA_TECHO;
    return this.techo[(iy / CELDA_TECHO | 0) * nT + ((ix / CELDA_TECHO) | 0)];
  }

  /** Where a point of the world falls on the screen: x, y of the ground there and pixels per world unit; null behind or too near. */
  proyectar(x: number, y: number): { sx: number; sy: number; k: number; dz: number } | null {
    const dx = x - this.cx;
    const dy = y - this.cy;
    const dz = dx * this.fx + dy * this.fy;
    if (dz < 7) return null;
    const lado = dx * this.rx + dy * this.ry;
    const k = FOCAL / dz;
    return { sx: W / 2 + lado * k, sy: HOR + ALT_CAM * k, k, dz };
  }
}

/** Unit tangents for the 128 headings stored in the wall map. */
const TANX = new Float32Array(128);
const TANY = new Float32Array(128);
for (let i = 0; i < 128; i++) {
  TANX[i] = Math.cos((i / 128) * Math.PI * 2);
  TANY[i] = Math.sin((i / 128) * Math.PI * 2);
}

/** Scratch for the doorways in range (no allocation per frame). */
const puertaVista = new Int8Array(16);
