// «Mode 7»: the floor of the circuit drawn row by row in perspective from the baked texture, as the Super Nintendo did
// (and as the first Mario Kart did), plus the projection of the things that stand on it (karts, items, scenery) as
// scaled sprites. Everything is low resolution (256×144) and blown up without smoothing by the screen.
//
// The floor is one `ImageData` of ~90 rows over a `Uint32Array`: per row the point under the middle of the row and the
// step from one pixel to the next are computed once, then every pixel is a texture read (from a half, a quarter...
// size copy of the texture for the far rows, so that distant tiles do not shimmer) and, far away, a blend into the
// haze. Nothing here draws SVG, reads pixels back or allocates per frame.
import { NIEBLA } from './arte';
import type { Pista } from './pista';

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
const NIEBLA_DESDE = 380;
const NIEBLA_HASTA = 1000;

export class Modo7 {
  private readonly img: ImageData;
  private readonly buf: Uint32Array;
  private readonly z = new Float32Array(FILAS);
  private readonly nivel = new Uint8Array(FILAS);
  private readonly niebla = new Uint16Array(FILAS);
  private readonly nr: number;
  private readonly ng: number;
  private readonly nb: number;
  /** Camera of the last `suelo` call, for the projections. */
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
  ) {
    this.img = ctx.createImageData(W, FILAS);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.nr = parseInt(NIEBLA.slice(1, 3), 16);
    this.ng = parseInt(NIEBLA.slice(3, 5), 16);
    this.nb = parseInt(NIEBLA.slice(5, 7), 16);
    for (let r = 0; r < FILAS; r++) {
      const z = (ALT_CAM * FOCAL) / (r + 0.5);
      this.z[r] = z;
      // texels covered by one screen pixel here → which half-size copy to read
      const huella = z / FOCAL;
      this.nivel[r] = Math.max(0, Math.min(3, Math.round(Math.log2(Math.max(1, huella)))));
      this.niebla[r] = Math.round(256 * Math.max(0, Math.min(1, (z - NIEBLA_DESDE) / (NIEBLA_HASTA - NIEBLA_DESDE))));
    }
  }

  /** Paints the floor seen from (cx, cy) looking along `ang`. */
  suelo(cx: number, cy: number, ang: number) {
    this.cx = cx;
    this.cy = cy;
    this.ang = ang;
    this.fx = Math.cos(ang);
    this.fy = Math.sin(ang);
    this.rx = -this.fy;
    this.ry = this.fx;
    const { buf, pista } = this;
    const mips = pista.mips;
    for (let r = 0; r < FILAS; r++) {
      const z = this.z[r];
      const paso = z / FOCAL;
      const niv = this.nivel[r];
      const tex = mips[niv];
      const bits = 10 - niv;
      const mascara = (1 << bits) - 1;
      const esc = 1 / (1 << niv);
      let wx = (cx + this.fx * z - this.rx * paso * (W / 2)) * esc;
      let wy = (cy + this.fy * z - this.ry * paso * (W / 2)) * esc;
      const dx = this.rx * paso * esc;
      const dy = this.ry * paso * esc;
      const nb = this.niebla[r];
      let o = r * W;
      if (nb === 0) {
        for (let x = 0; x < W; x++) {
          buf[o++] = tex[((wy & mascara) << bits) + (wx & mascara)];
          wx += dx;
          wy += dy;
        }
      } else if (nb >= 256) {
        const c = (0xff000000 | (this.nb << 16) | (this.ng << 8) | this.nr) >>> 0;
        buf.fill(c, o, o + W);
      } else {
        const { nr, ng, nb: nbl } = this;
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
    this.ctx.putImageData(this.img, 0, HOR);
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
