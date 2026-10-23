// The pixel art of Impropios Kart, all painted once into cached canvases (nothing here runs per frame).
//
// The karts are small voxel-ish models (boxes, cylinders and a sphere for the head) turned into sprites from sixteen
// angles by a tiny software renderer: that way every driver, in every colour, has the same kart seen from the same
// sixteen sides, and the game only ever blits and scales them. The heads are painted from the driver's data
// (pilotos.ts): Chuchi is bald and shiny, with square black glasses and a short grey beard; the rivals have a plain face.
import { anchoTexto, escribir } from '../sol/fuente';
import { ctx, elipse, lienzo, pintar, rect } from '../sol/pixel';
import type { Piloto } from './pilotos';

/** World units covered by one pixel of a sprite (a kart is ~34 px wide, ~14 units). */
export const UNIDAD_PX = 0.42;
export const ANGULOS = 16;
/** Where the kart's ground centre sits in its sprite. */
export const ANCLA_KART = { x: 22, y: 36 };
const KW = 44;
const KH = 46;

type RGB = [number, number, number];
const rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mezclar = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const oscuro = (c: RGB, f: number): RGB => [c[0] * f, c[1] * f, c[2] * f];

interface P3 {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  c: RGB;
  /** Shiny (the bald head). */
  brillo?: boolean;
}

type ColorFn = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => RGB;
const STEP = 0.5;

function caja3(out: P3[], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, f: ColorFn) {
  const nx = Math.max(1, Math.ceil((x1 - x0) / STEP));
  const ny = Math.max(1, Math.ceil((y1 - y0) / STEP));
  const nz = Math.max(1, Math.ceil((z1 - z0) / STEP));
  const X = (i: number) => x0 + ((i + 0.5) * (x1 - x0)) / nx;
  const Y = (i: number) => y0 + ((i + 0.5) * (y1 - y0)) / ny;
  const Z = (i: number) => z0 + ((i + 0.5) * (z1 - z0)) / nz;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) out.push({ x: X(i), y: Y(j), z: z1, nx: 0, ny: 0, nz: 1, c: f(X(i), Y(j), z1, 0, 0, 1) });
  for (let j = 0; j < ny; j++)
    for (let k = 0; k < nz; k++) {
      out.push({ x: x1, y: Y(j), z: Z(k), nx: 1, ny: 0, nz: 0, c: f(x1, Y(j), Z(k), 1, 0, 0) });
      out.push({ x: x0, y: Y(j), z: Z(k), nx: -1, ny: 0, nz: 0, c: f(x0, Y(j), Z(k), -1, 0, 0) });
    }
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++) {
      out.push({ x: X(i), y: y1, z: Z(k), nx: 0, ny: 1, nz: 0, c: f(X(i), y1, Z(k), 0, 1, 0) });
      out.push({ x: X(i), y: y0, z: Z(k), nx: 0, ny: -1, nz: 0, c: f(X(i), y0, Z(k), 0, -1, 0) });
    }
}

/** A cylinder whose axis runs along x (a wheel): side and both caps. */
function cil3(out: P3[], xa: number, xb: number, yc: number, zc: number, R: number, f: ColorFn) {
  const na = Math.ceil((2 * Math.PI * R) / STEP);
  const nx = Math.max(1, Math.ceil((xb - xa) / STEP));
  for (let a = 0; a < na; a++) {
    const t = ((a + 0.5) / na) * Math.PI * 2;
    const cy = Math.cos(t);
    const cz = Math.sin(t);
    for (let i = 0; i < nx; i++) {
      const x = xa + ((i + 0.5) * (xb - xa)) / nx;
      out.push({ x, y: yc + cy * R, z: zc + cz * R, nx: 0, ny: cy, nz: cz, c: f(x, yc + cy * R, zc + cz * R, 0, cy, cz) });
    }
  }
  for (const [x, n] of [[xa, -1], [xb, 1]] as const) {
    for (let r = 0; r < R; r += STEP) {
      const m = Math.max(1, Math.ceil((2 * Math.PI * (r + STEP / 2)) / STEP));
      for (let a = 0; a < m; a++) {
        const t = ((a + 0.5) / m) * Math.PI * 2;
        const y = yc + Math.cos(t) * (r + STEP / 2);
        const z = zc + Math.sin(t) * (r + STEP / 2);
        out.push({ x, y, z, nx: n, ny: 0, nz: 0, c: f(x, y, z, n, 0, 0) });
      }
    }
  }
}

function esfera3(out: P3[], cx: number, cy: number, cz: number, R: number, f: ColorFn, brillo = false) {
  const nv = Math.ceil((Math.PI * R) / STEP);
  for (let v = 0; v < nv; v++) {
    const lat = -Math.PI / 2 + ((v + 0.5) / nv) * Math.PI;
    const r = Math.cos(lat);
    const nu = Math.max(4, Math.ceil((2 * Math.PI * R * r) / STEP));
    for (let u = 0; u < nu; u++) {
      const lon = ((u + 0.5) / nu) * Math.PI * 2;
      // lon 0 = the front (+y)
      const nx = Math.sin(lon) * r;
      const ny = Math.cos(lon) * r;
      const nz = Math.sin(lat);
      out.push({ x: cx + nx * R, y: cy + ny * R, z: cz + nz * R, nx, ny, nz, c: f(cx + nx * R, cy + ny * R, cz + nz * R, nx, ny, nz), brillo });
    }
  }
}

// ---------------------------------------------------------------- the kart model

const HIERRO: RGB = rgb('#4a4252');
const GOMA: RGB = rgb('#2b2530');
const CUBO: RGB = rgb('#aeb0c0');
const TUBO: RGB = rgb('#9a9aaa');

function modeloKart(p: Piloto): P3[] {
  const out: P3[] = [];
  const cuerpo = rgb(p.color);
  const cuerpoOsc = oscuro(cuerpo, 0.72);
  const blanco: RGB = [250, 246, 238];
  const piel = rgb(p.piel);
  const camiseta = rgb(p.camiseta);
  // wheels: big ones behind, smaller in front
  for (const lado of [-1, 1]) {
    const xa = lado < 0 ? -15 : 10;
    const xb = lado < 0 ? -10 : 15;
    cil3(out, xa, xb, -9.5, 5.5, 5.5, (_x, y, z, nx) => (Math.abs(nx) > 0.5 && Math.hypot(y + 9.5, z - 5.5) < 2.6 ? CUBO : GOMA));
    const xc = lado < 0 ? -13 : 9;
    const xd = lado < 0 ? -9 : 13;
    cil3(out, xc, xd, 11, 4.2, 4.2, (_x, y, z, nx) => (Math.abs(nx) > 0.5 && Math.hypot(y - 11, z - 4.2) < 2 ? CUBO : GOMA));
  }
  caja3(out, -9, 9, -13, 12, 2, 5, () => HIERRO);
  caja3(out, -8, 8, -11, 8, 5, 10, (x, _y, _z, _nx, _ny, nz) => (nz > 0.5 && Math.abs(x) < 1.6 ? blanco : cuerpo));
  caja3(out, -5, 5, 8, 17, 3, 8, (x, _y, _z, _nx, _ny, nz) => (nz > 0.5 && Math.abs(x) < 1.6 ? blanco : cuerpo));
  caja3(out, -6.5, 6.5, 15.5, 17.5, 3, 6, () => HIERRO);
  caja3(out, -6, 6, -11, -8, 10, 16, () => cuerpoOsc);
  // exhaust pipes and a rear wing
  caja3(out, -4.5, -2.5, -17, -11, 4, 7, () => TUBO);
  caja3(out, 2.5, 4.5, -17, -11, 4, 7, () => TUBO);
  caja3(out, -10.5, 10.5, -15.5, -12.5, 12, 13.5, () => cuerpoOsc);
  caja3(out, -8, -7, -14.5, -13.5, 10, 12, () => HIERRO);
  caja3(out, 7, 8, -14.5, -13.5, 10, 12, () => HIERRO);
  // the driver
  caja3(out, -4.5, 4.5, -7, 0, 10, 17, () => camiseta);
  caja3(out, -6.5, -4.5, -5, 4, 12, 15.5, () => camiseta);
  caja3(out, 4.5, 6.5, -5, 4, 12, 15.5, () => camiseta);
  caja3(out, -4.5, -2.5, 4, 6, 12.5, 15, () => piel);
  caja3(out, 2.5, 4.5, 4, 6, 12.5, 15, () => piel);
  caja3(out, -4, 4, 5.5, 7, 13, 16, () => GOMA);
  // the head: a big round one
  esfera3(out, 0, -2, 23, 6.8, (_x, _y, _z, nx, ny, nz) => colorCabeza(p, nx, ny, nz), !!p.brillo);
  return out;
}

/** The colour of a point of the head from the direction it faces (nx right, ny forward, nz up, unit sphere). */
function colorCabeza(p: Piloto, nx: number, ny: number, nz: number): RGB {
  const piel = rgb(p.piel);
  const sombra = oscuro(piel, 0.86);
  const ax = Math.abs(nx);
  const frente = ny > 0.3;
  if (p.gafas) {
    const marco: RGB = rgb('#1a1620');
    const lente: RGB = rgb('#7fa8c8');
    // temples run back to the ears: visible from behind and the sides
    if (ax > 0.8 && nz > 0.08 && nz < 0.4 && ny > -0.55) return marco;
    if (frente && ny > 0.38) {
      const enBanda = nz > 0.0 && nz < 0.46 && ax < 0.84;
      if (enBanda) {
        const lenteDentro = ax > 0.2 && ax < 0.72 && nz > 0.1 && nz < 0.36;
        if (!lenteDentro) return marco;
        // an eye inside each lens
        if (Math.abs(ax - 0.46) < 0.1 && Math.abs(nz - 0.22) < 0.09) return rgb('#241a24');
        return lente;
      }
    }
  } else if (frente && ny > 0.45) {
    // two dots for eyes and a small smile
    if (Math.abs(ax - 0.4) < 0.13 && Math.abs(nz - 0.2) < 0.14) return rgb('#241a24');
    if (nz > 0.38 && nz < 0.47 && Math.abs(ax - 0.4) < 0.16) return oscuro(rgb(p.pelo ?? p.piel), 0.7);
    if (ny > 0.7 && nz < -0.22 && nz > -0.4 && ax < 0.36 && nz < -0.22 - ax * ax * 0.6) return rgb('#8a2f3a');
  }
  if (p.barba) {
    const b = rgb(p.barba);
    // moustache, beard and sideburns
    if (ny > 0.55 && nz > -0.16 && nz < -0.04 && ax < 0.45 && !(ax < 0.06)) return oscuro(b, 0.9);
    if (nz < -0.1 && ny > -0.25 && ax < 0.95 && !(ny > 0.7 && nz > -0.36 && nz < -0.26 && ax < 0.3)) return Math.sin(nx * 23 + nz * 31) > 0.5 ? oscuro(b, 0.82) : b;
    if (nz < -0.1 && ny > 0.7 && nz > -0.36 && nz < -0.26 && ax < 0.3) return rgb('#7a3a3a');
    if (nz < 0.02 && ax > 0.78 && ny > -0.2) return b;
  }
  if (p.pelo) {
    const h = rgb(p.pelo);
    if (nz > 0.5 || (ny < -0.25 && nz > -0.35)) return nz > 0.82 ? mezclar(h, [255, 255, 255], 0.18) : h;
    if (ny > 0.3 && nz > 0.4) return h;
  }
  // a plain nose
  if (ny > 0.88 && ax < 0.14 && nz > -0.12 && nz < 0.12) return sombra;
  return piel;
}

const modelos = new Map<string, P3[]>();
const spritesKartCache = new Map<string, HTMLCanvasElement[]>();
const PITCH = (28 * Math.PI) / 180;

/** The sixteen views of a driver's kart, seen from behind (0) and turning clockwise as seen from above. */
export function spritesKart(p: Piloto): HTMLCanvasElement[] {
  const hit = spritesKartCache.get(p.id);
  if (hit) return hit;
  let pts = modelos.get(p.id);
  if (!pts) {
    pts = modeloKart(p);
    modelos.set(p.id, pts);
  }
  const out: HTMLCanvasElement[] = [];
  for (let k = 0; k < ANGULOS; k++) out.push(vista(pts, (k * Math.PI * 2) / ANGULOS));
  spritesKartCache.set(p.id, out);
  return out;
}

function vista(pts: P3[], theta: number): HTMLCanvasElement {
  const zb = new Float32Array(KW * KH).fill(1e9);
  const px32 = new Uint32Array(KW * KH);
  const cs = Math.cos(theta);
  const sn = Math.sin(theta);
  const cp = Math.cos(PITCH);
  const sp = Math.sin(PITCH);
  // the light comes from the upper left, in front of the kart; the viewer is behind and above
  const Lx = -0.5;
  const Ly = -0.4;
  const Lz = 0.77;
  const Vy = -cp;
  const Vz = sp;
  const hx = Lx;
  const hy = Ly + Vy;
  const hz = Lz + Vz;
  const hl = Math.hypot(hx, hy, hz);
  for (const p of pts) {
    const nxr = p.nx * cs + p.ny * sn;
    const nyr = -p.nx * sn + p.ny * cs;
    if (nyr * Vy + p.nz * Vz < -0.04) continue; // facing away
    const xr = p.x * cs + p.y * sn;
    const yr = -p.x * sn + p.y * cs;
    const px = Math.round(ANCLA_KART.x + xr);
    const py = Math.round(ANCLA_KART.y - (p.z * cp + yr * sp));
    if (px < 0 || py < 0 || px >= KW || py >= KH) continue;
    const prof = yr * cp - p.z * sp;
    const i = py * KW + px;
    if (prof >= zb[i]) continue;
    zb[i] = prof;
    const lamb = Math.max(0, nxr * Lx + nyr * Ly + p.nz * Lz);
    const t = Math.round((0.52 + 0.62 * lamb) * 6) / 6;
    let [r, g, b] = p.c;
    r *= t * 1.02;
    g *= t;
    b *= t * 1.06;
    if (p.brillo) {
      const sp2 = (nxr * hx + nyr * hy + p.nz * hz) / hl;
      if (sp2 > 0.955) {
        r = 255;
        g = 252;
        b = 245;
      } else if (sp2 > 0.9) {
        r = (r + 255) / 2;
        g = (g + 250) / 2;
        b = (b + 240) / 2;
      }
    }
    px32[i] = (0xff000000 | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r)) >>> 0;
  }
  // the outline, in a dark plum
  const borde = (0xff000000 | (46 << 16) | (24 << 8) | 38) >>> 0;
  const fin = px32.slice();
  for (let y = 0; y < KH; y++)
    for (let x = 0; x < KW; x++) {
      if (px32[y * KW + x]) continue;
      if ((x > 0 && px32[y * KW + x - 1]) || (x < KW - 1 && px32[y * KW + x + 1]) || (y > 0 && px32[(y - 1) * KW + x]) || (y < KH - 1 && px32[(y + 1) * KW + x])) fin[y * KW + x] = borde;
    }
  const c = lienzo(KW, KH);
  const x = ctx(c);
  // the shadow first
  x.fillStyle = 'rgba(30,14,40,0.38)';
  elipse(x, 'rgba(30,14,40,0.38)', ANCLA_KART.x, ANCLA_KART.y + 1, 17, 6);
  const img = x.createImageData(KW, KH);
  new Uint32Array(img.data.buffer).set(fin);
  const k = lienzo(KW, KH);
  ctx(k).putImageData(img, 0, 0);
  x.drawImage(k, 0, 0);
  return c;
}

/** A sprite washed with a colour on its opaque pixels (a flash when hit). */
export function lavado(src: HTMLCanvasElement, color: string, a: number): HTMLCanvasElement {
  const c = lienzo(src.width, src.height);
  const x = ctx(c);
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = a;
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

const boas = new Map<HTMLCanvasElement, HTMLCanvasElement>();
/** The kart in its feather boa: a fluffy pink halo round the whole sprite (Boa de plumas). */
export function conBoa(src: HTMLCanvasElement): HTMLCanvasElement {
  const hit = boas.get(src);
  if (hit) return hit;
  const W = src.width + 8;
  const H = src.height + 8;
  const c = lienzo(W, H);
  const x = ctx(c);
  const sil = lienzo(W, H);
  const s = ctx(sil);
  s.drawImage(src, 4, 4);
  const a = s.getImageData(0, 0, W, H).data;
  const out = x.createImageData(W, H);
  const o = new Uint32Array(out.data.buffer);
  const plumas = [0xffc880ff, 0xffa84fff, 0xfff8f0ff, 0xff9a3ae0];
  for (let yy = 0; yy < H; yy++)
    for (let xx = 0; xx < W; xx++) {
      // distance to the nearest opaque pixel (up to 3)
      let d = 9;
      for (let dy = -3; dy <= 3 && d > 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const px = xx + dx;
          const py = yy + dy;
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          if (a[(py * W + px) * 4 + 3] > 0) d = Math.min(d, Math.max(Math.abs(dx), Math.abs(dy)));
        }
      if (a[(yy * W + xx) * 4 + 3] === 0 && d <= 2 + ((xx * 7 + yy * 13) % 3 === 0 ? 1 : 0)) o[yy * W + xx] = plumas[(xx + yy * 2) % plumas.length] >>> 0;
    }
  x.putImageData(out, 0, 0);
  x.drawImage(src, 4, 4);
  boas.set(src, c);
  return c;
}

// ---------------------------------------------------------------- items

export type ItemId = 'chupito' | 'maleta' | 'tacon' | 'sangria' | 'boa' | 'luz';
export const ITEMS: ItemId[] = ['chupito', 'maleta', 'tacon', 'sangria', 'boa', 'luz'];

const MAPAS_ITEM: Record<Exclude<ItemId, 'boa'>, { filas: string[]; pal: Record<string, string> }> = {
  chupito: {
    filas: [
      '................',
      '..ooooooooooo...',
      '..owwWwwwwwwo...',
      '..owwWwwwwwwo.l.',
      '..ogggggggggoll.',
      '..ogGggggggGolL.',
      '..oggggggggGo.L.',
      '..oggggggggGo...',
      '...ogggggggGo...',
      '...ogggggggGo...',
      '....oggggggo....',
      '....ooGGGGoo....',
      '.....owwwwo.....',
      '.....owwwwo.....',
      '....oooooooo....',
      '................',
    ],
    pal: { o: '#4a6a86', w: '#dff0ff', W: '#ffffff', g: '#ffb62a', G: '#d9800e', l: '#a8d838', L: '#6a9a1c' },
  },
  maleta: {
    filas: [
      '................',
      '.....kkkkkk.....',
      '.....k....k.....',
      '..oooooooooooo..',
      '..obbbbbbbbbBo..',
      '..obbbbbbbbbBo..',
      '..oyyyyyyyyyyo..',
      '..obbbbwbbbbBo..',
      '..obbbwwwbbbBo..',
      '..obbwwwwwbbBo..',
      '..obbbbwbbbbBo..',
      '..obbbbbbbbbBo..',
      '..oBBBBBBBBBBo..',
      '..oooooooooooo..',
      '...kk......kk...',
      '................',
    ],
    pal: { o: '#1a2a56', b: '#2f6fd0', B: '#1f4a96', y: '#ffd24a', w: '#ffffff', k: '#3a3340' },
  },
  tacon: {
    filas: [
      '................',
      '................',
      '...........rrrr.',
      '..........rrrrR.',
      '.........rrrrrR.',
      '........rrrrrrR.',
      '.......rrrrrrRR.',
      '..rrr.rrrrrrrRR.',
      '.rrrrrrrrrrrRR..',
      'rrrhrrrrrrRRRR..',
      'rrrrrrrrrRRRR...',
      '.kkkkkkkkkkRk...',
      '...........k.k..',
      '..............k.',
      '..............k.',
      '................',
    ],
    pal: { r: '#e0203c', R: '#a01028', h: '#ff8a96', k: '#3a2030' },
  },
  sangria: {
    filas: [
      '................',
      '..ooooooooooo...',
      '..owwwwwwwwwo.o.',
      '..orrrrrrrrro.o.',
      '..orRrrrrrrro.oo',
      '..orrrXXrrrro.oo',
      '..orrXxxXrrro.o.',
      '..orrrXXrrrroo..',
      '..orrrrrrRro....',
      '..orRrrrrrro....',
      '..orrrrrrrro....',
      '..oRRRRRRRRo....',
      '..ooooooooooo...',
      '................',
      '................',
      '................',
    ],
    pal: { o: '#6a2a3a', w: '#f4dfe6', r: '#c8203c', R: '#8a1030', X: '#ff9a2a', x: '#ffd27a' },
  },
  luz: {
    filas: [
      '................',
      '.....oooooo.....',
      '....oyyyyyyo....',
      '...oyyywyyyyo...',
      '...oyywwyyyyo...',
      '...oyyyyKyyyo...',
      '...oyyyKKyyyo...',
      '....oyyKyyyo....',
      '.....oyKyyo.....',
      '.....ogggo......',
      '.....okkko......',
      '.....ogggo......',
      '......ooo.......',
      '................',
      '................',
      '................',
    ],
    pal: { o: '#6a5a20', y: '#fff2a0', w: '#ffffff', K: '#c08a10', g: '#9aa0aa', k: '#5a5a66' },
  },
};

const iconos = new Map<ItemId, HTMLCanvasElement>();
/** 16×16 icon of an item: also the sprite it has in the world. */
export function icono(id: ItemId): HTMLCanvasElement {
  let c = iconos.get(id);
  if (c) return c;
  c = lienzo(16, 16);
  const x = ctx(c);
  if (id === 'boa') {
    // a fluffy pink boa in an S
    const cols = ['#ff80c8', '#ff4fa8', '#fff0f8', '#e03a9a'];
    const ruta: Array<[number, number]> = [[3, 12], [5, 13], [8, 12], [11, 11], [12, 8], [10, 5], [7, 4], [4, 4], [3, 2]];
    ruta.forEach(([px, py], i) => {
      elipse(x, cols[i % 4], px + 0.5, py + 0.5, 2.6, 2.6);
      elipse(x, cols[(i + 2) % 4], px - 0.3, py - 0.8, 1.2, 1.2);
    });
  } else {
    const m = MAPAS_ITEM[id];
    pintar(x, m.filas, m.pal);
  }
  iconos.set(id, c);
  return c;
}

let cajaImg: HTMLCanvasElement | null = null;
/** The item box: a golden cube with a «?» (16×18). */
export function spriteCaja(): HTMLCanvasElement {
  if (cajaImg) return cajaImg;
  const c = lienzo(18, 20);
  const x = ctx(c);
  pintar(
    x,
    [
      '..................',
      '.....oooooooo.....',
      '...ooLLLLLLLLoo...',
      '..oLLLLLLLLLLLLo..',
      '.oLLLLLLLLLLLLLLo.',
      'ooooooooooooooooo.',
      'oYYYYYYYooGGGGGGo.',
      'oYYYwwwYooGGwwGGo.',
      'oYYwYYYwooGwGGGwo.',
      'oYYYYYwYooGGGGwGo.',
      'oYYYYwYYooGGGwGGo.',
      'oYYYYwYYooGGGwGGo.',
      'oYYYYYYYooGGGGGGo.',
      'oYYYYwYYooGGGwGGo.',
      'oYYYYYYYooGGGGGGo.',
      'ooooooooooooooooo.',
      '..................',
    ],
    { o: '#6a3a10', L: '#ffe27a', Y: '#ffb82a', G: '#e08a10', w: '#ffffff' },
    0,
    1,
  );
  cajaImg = c;
  return c;
}

let charcoImg: HTMLCanvasElement | null = null;
/** The puddle of sangría left on the floor (flat: drawn squashed in the world). */
export function spriteCharco(): HTMLCanvasElement {
  if (charcoImg) return charcoImg;
  const c = lienzo(40, 22);
  const x = ctx(c);
  elipse(x, '#5a0a24', 20, 11, 19, 10);
  elipse(x, '#a8122f', 20, 11, 17, 8.5);
  elipse(x, '#d02a46', 19, 10, 13, 6);
  elipse(x, '#ff7a8a', 13, 7, 4, 1.6);
  elipse(x, '#ff9a2a', 28, 12, 3.2, 3.2);
  elipse(x, '#ffd27a', 28, 12, 1.8, 1.8);
  charcoImg = c;
  return c;
}

let destellos: HTMLCanvasElement | null = null;
/** A small four-point sparkle (7×7). */
export function spriteBrillo(): HTMLCanvasElement {
  if (destellos) return destellos;
  const c = lienzo(7, 7);
  pintar(ctx(c), ['...w...', '...w...', '..www..', 'wwwwwww', '..www..', '...w...', '...w...'], { w: '#ffffff' });
  destellos = c;
  return c;
}

// ---------------------------------------------------------------- scenery

export interface Sprite {
  img: HTMLCanvasElement;
  /** Anchor at the foot: [x, y] of the pixel that stands on the floor. */
  ax: number;
  ay: number;
}

const cacheDecor = new Map<string, Sprite>();

const trazo = (x: CanvasRenderingContext2D, col: string, x0: number, y0: number, x1: number, y1: number, grosor = 1) => {
  x.fillStyle = col;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) x.fillRect(Math.round(x0 + ((x1 - x0) * i) / n - grosor / 2), Math.round(y0 + ((y1 - y0) * i) / n - grosor / 2), grosor, grosor);
};

export function spriteDecorado(tipo: string): Sprite {
  const hit = cacheDecor.get(tipo);
  if (hit) return hit;
  let s: Sprite;
  switch (tipo) {
    case 'palmera': {
      const c = lienzo(64, 112);
      const x = ctx(c);
      // trunk with rings
      for (let y = 40; y < 108; y++) {
        const w = 3 + Math.round(((y - 40) / 68) * 2);
        const cx = 32 + Math.round(Math.sin((y - 40) / 22) * 2);
        rect(x, (y >> 2) & 1 ? '#8a5a30' : '#a06a3a', cx - w, y, w * 2, 1);
        rect(x, '#5e3a1c', cx + w - 1, y, 1, 1);
      }
      elipse(x, 'rgba(30,14,40,0.35)', 32, 109, 14, 3);
      const hojas = ['#2f9a4a', '#1f7a3a', '#5ac26a'];
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2 + 0.2;
        const dx = Math.cos(ang);
        const dy = Math.sin(ang);
        let px = 32;
        let py = 40;
        for (let t = 0; t < 26; t++) {
          px += dx * 1.15;
          py += dy * 0.55 + t * 0.045;
          const g = Math.max(1, Math.round(3.4 - t / 9));
          rect(x, hojas[(a + (t >> 3)) % 3], Math.round(px) - 1, Math.round(py) - 1, g + 1, g);
        }
      }
      elipse(x, '#8a5a30', 28, 43, 2.5, 2.5);
      elipse(x, '#6a3f20', 35, 44, 2.5, 2.5);
      s = { img: c, ax: 32, ay: 109 };
      break;
    }
    case 'sombrilla': {
      const c = lienzo(56, 68);
      const x = ctx(c);
      rect(x, '#e8e0d0', 27, 22, 2, 44);
      rect(x, '#b8b0a0', 28, 22, 1, 44);
      elipse(x, 'rgba(30,14,40,0.35)', 28, 66, 12, 2.5);
      for (let i = -24; i < 24; i++) {
        const t = i / 24;
        const h = Math.round(Math.sqrt(1 - t * t) * 14);
        const seg = Math.floor((i + 24) / 6);
        for (let y = 0; y < h; y++) rect(x, seg & 1 ? '#fafafa' : '#e0383c', 28 + i, 24 - y + 0, 1, 1);
        rect(x, '#8a2024', 28 + i, 24, 1, 1);
      }
      rect(x, '#8a2024', 27, 9, 2, 2);
      s = { img: c, ax: 28, ay: 66 };
      break;
    }
    case 'flamenco': {
      const c = lienzo(40, 56);
      const x = ctx(c);
      elipse(x, 'rgba(30,14,40,0.35)', 20, 53, 11, 3);
      rect(x, '#e86a8a', 15, 40, 2, 12);
      rect(x, '#e86a8a', 22, 40, 2, 12);
      elipse(x, '#ff9ab4', 20, 34, 12, 9);
      elipse(x, '#ffb6c8', 17, 31, 7, 4);
      // neck, head and beak
      for (let i = 0; i < 18; i++) rect(x, '#ff9ab4', 28 + Math.round(Math.sin(i / 3.2) * 2.2), 30 - i, 4, 1);
      elipse(x, '#ff9ab4', 31, 11, 4, 3.5);
      rect(x, '#2a1a22', 33, 10, 1, 1);
      rect(x, '#f6c24a', 34, 11, 5, 2);
      rect(x, '#2a1a22', 38, 12, 1, 2);
      // the float's ring
      elipse(x, '#fafafa', 20, 38, 13, 4);
      elipse(x, '#ff9ab4', 20, 38, 9, 2);
      s = { img: c, ax: 20, ay: 53 };
      break;
    }
    case 'planta': {
      const c = lienzo(40, 64);
      const x = ctx(c);
      elipse(x, 'rgba(30,14,40,0.35)', 20, 61, 11, 3);
      pintar(x, ['.cccccccccc.', '.CccccccccC.', '..cccccccc..', '...CccccC...', '...cccccc...', '...CCCCCC...'], { c: '#c8683a', C: '#9a4a24' }, 14, 52);
      rect(x, '#5a3a1c', 19, 36, 2, 17);
      const g = ['#2f9a4a', '#1f7a3a', '#5ac26a'];
      for (const [px, py, r, k] of [[20, 20, 11, 0], [12, 28, 8, 1], [28, 28, 8, 2], [20, 11, 8, 2], [14, 17, 6, 1], [27, 18, 6, 0]] as const) elipse(x, g[k], px, py, r, r);
      elipse(x, '#9be08a', 17, 14, 3, 2);
      s = { img: c, ax: 20, ay: 61 };
      break;
    }
    case 'cactus': {
      const c = lienzo(28, 48);
      const x = ctx(c);
      elipse(x, 'rgba(30,14,40,0.35)', 14, 45, 9, 2.5);
      pintar(x, ['.cccccccc.', '.CcccccccC', '..cccccc..', '..CCCCCC..'], { c: '#c8683a', C: '#9a4a24' }, 9, 37);
      rect(x, '#3a9a58', 11, 8, 6, 30);
      rect(x, '#5ac27a', 12, 8, 2, 30);
      rect(x, '#3a9a58', 4, 18, 7, 4);
      rect(x, '#3a9a58', 4, 12, 4, 10);
      rect(x, '#3a9a58', 17, 22, 7, 4);
      rect(x, '#3a9a58', 20, 15, 4, 11);
      rect(x, '#ff7aa8', 12, 5, 4, 3);
      s = { img: c, ax: 14, ay: 45 };
      break;
    }
    case 'lampara': {
      const c = lienzo(36, 80);
      const x = ctx(c);
      elipse(x, 'rgba(30,14,40,0.35)', 18, 77, 9, 2.5);
      rect(x, '#5a4a3a', 17, 26, 2, 50);
      elipse(x, '#5a4a3a', 18, 76, 6, 2);
      elipse(x, 'rgba(255,220,140,0.28)', 18, 22, 17, 17);
      for (let y = 0; y < 18; y++) {
        const w = 6 + Math.round(y * 0.55);
        rect(x, y < 3 ? '#fff0b8' : '#f4d27a', 18 - w, 8 + y, w * 2, 1);
        rect(x, '#d9a844', 18 + w - 3, 8 + y, 3, 1);
      }
      s = { img: c, ax: 18, ay: 77 };
      break;
    }
    case 'altavoz': {
      const c = lienzo(40, 60);
      const x = ctx(c);
      elipse(x, 'rgba(30,14,40,0.35)', 20, 57, 14, 3);
      rect(x, '#1a1420', 6, 8, 28, 48);
      rect(x, '#2e2638', 7, 9, 26, 3);
      rect(x, '#0e0a12', 6, 54, 28, 2);
      elipse(x, '#0e0a12', 20, 22, 9, 9);
      elipse(x, '#3a3040', 20, 22, 7, 7);
      elipse(x, '#14101a', 20, 22, 3, 3);
      elipse(x, '#0e0a12', 20, 43, 7, 7);
      elipse(x, '#3a3040', 20, 43, 5.5, 5.5);
      elipse(x, '#14101a', 20, 43, 2.5, 2.5);
      rect(x, '#ff4fa8', 30, 10, 2, 2);
      s = { img: c, ax: 20, ay: 57 };
      break;
    }
    case 'foco': {
      const c = lienzo(40, 100);
      const x = ctx(c);
      elipse(x, 'rgba(30,14,40,0.35)', 20, 96, 10, 2.5);
      trazo(x, '#3a3040', 20, 70, 11, 96, 2);
      trazo(x, '#3a3040', 20, 70, 29, 96, 2);
      rect(x, '#3a3040', 19, 36, 2, 36);
      // the lamp and its beam
      for (let y = 0; y < 28; y++) {
        const w = 3 + Math.round((28 - y) * 0.3);
        x.fillStyle = `rgba(255,236,150,${0.1 + 0.2 * (y / 28)})`;
        x.fillRect(20 - w, y, w * 2, 1);
      }
      rect(x, '#6a6070', 13, 28, 14, 10);
      rect(x, '#8a8090', 13, 28, 14, 2);
      elipse(x, '#fff2b0', 20, 33, 5, 3);
      s = { img: c, ax: 20, ay: 96 };
      break;
    }
    case 'bola': {
      const c = lienzo(44, 60);
      const x = ctx(c);
      rect(x, '#8a8090', 21, 0, 1, 14);
      for (let j = -16; j <= 16; j++) {
        const w = Math.sqrt(256 - j * j);
        for (let i = -Math.floor(w); i < Math.floor(w); i++) {
          const cx = 22 + i;
          const cy = 30 + j;
          const k = hashi(Math.floor(i / 4), Math.floor(j / 4));
          const luz = (-i * 0.6 - j * 0.8) / 16;
          const base = k < 0.25 ? [200, 220, 255] : k < 0.5 ? [255, 190, 230] : k < 0.75 ? [230, 230, 240] : [170, 190, 230];
          const t = Math.max(0.55, Math.min(1.2, 0.85 + luz * 0.35));
          const edge = (i % 4 === 0 || j % 4 === 0) ? 0.8 : 1;
          x.fillStyle = `rgb(${Math.min(255, base[0] * t * edge)},${Math.min(255, base[1] * t * edge)},${Math.min(255, base[2] * t * edge)})`;
          x.fillRect(cx, cy, 1, 1);
        }
      }
      pintar(x, ['...w...', '...w...', '..www..', 'wwwwwww', '..www..', '...w...', '...w...'], { w: '#ffffff' }, 10, 20);
      s = { img: c, ax: 22, ay: 46 };
      break;
    }
    case 'tumbona': {
      const c = lienzo(48, 28);
      const x = ctx(c);
      elipse(x, 'rgba(30,14,40,0.3)', 24, 25, 20, 3);
      for (let i = 0; i < 34; i++) rect(x, (i >> 2) & 1 ? '#fafafa' : '#3a9ad8', 6 + i, 14 - Math.round(i * 0.1), 1, 7);
      rect(x, '#e6e0d0', 6, 21, 34, 2);
      rect(x, '#fafafa', 36, 7, 7, 14);
      rect(x, '#3a9ad8', 38, 7, 2, 14);
      rect(x, '#8a8070', 8, 23, 2, 3);
      rect(x, '#8a8070', 36, 23, 2, 3);
      s = { img: c, ax: 24, ay: 25 };
      break;
    }
    case 'arco':
    default: {
      s = arco();
      break;
    }
  }
  cacheDecor.set(tipo, s);
  return s;
}

const hashi = (a: number, b: number) => {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** The arch over the start line with the Impropios Airlines banner. 250×92 px; the posts stand ±120 px from the middle. */
function arco(): Sprite {
  const W = 256;
  const H = 96;
  const c = lienzo(W, H);
  const x = ctx(c);
  for (const px of [6, W - 20]) {
    rect(x, '#3a3040', px, 22, 14, 70);
    rect(x, '#5a5068', px, 22, 4, 70);
    rect(x, '#2a2030', px + 10, 22, 4, 70);
    rect(x, '#8a8098', px - 2, 88, 18, 6);
    rect(x, '#f2c14e', px + 1, 20, 12, 3);
  }
  // the banner: deep blue with a gold edge and a white stripe
  rect(x, '#f2c14e', 4, 4, W - 8, 34);
  rect(x, '#1f3f8a', 6, 6, W - 12, 30);
  rect(x, '#2f5fc0', 6, 6, W - 12, 4);
  rect(x, '#142a60', 6, 32, W - 12, 4);
  // checkered flag band under the banner
  for (let i = 0; i < W - 12; i += 6) for (let j = 0; j < 2; j++) rect(x, (i / 6 + j) & 1 ? '#f8f4ea' : '#1c1418', 6 + i, 36 + j * 3, 6, 3);
  const txt = 'IMPROPIOS AIRLINES';
  const t = lienzo(anchoTexto(txt) + 2, 11);
  escribir(ctx(t), txt, 1, 0, '#ffffff', '#0e1c40');
  const k = 2;
  const tw = t.width * k;
  x.imageSmoothingEnabled = false;
  x.drawImage(t, 0, 0, t.width, 11, Math.round((W - tw) / 2), 9, tw, 11 * k);
  // a tiny plane on each side
  for (const px of [18, W - 34]) pintar(x, ['...w....', '...ww...', 'wwwwwww.', '..wwwwww', '...ww...', '...w....'], { w: '#ffffff' }, px, 14);
  return { img: c, ax: W / 2, ay: H - 2 };
}

// ---------------------------------------------------------------- the horizon

export const ANCHO_PANORAMA = 640;
export const ALTO_PANORAMA = 56;
/** The haze colour the floor fades into, also the bottom edge of the panorama. */
export const NIEBLA = '#f4dcb2';

let panoramaImg: HTMLCanvasElement | null = null;
/** The sky and the far scenery of the country house, one turn of the horizon (it scrolls as the kart turns). */
export function panorama(): HTMLCanvasElement {
  if (panoramaImg) return panoramaImg;
  const W = ANCHO_PANORAMA;
  const H = ALTO_PANORAMA;
  const c = lienzo(W, H);
  const x = ctx(c);
  // sky: bands from deep blue to a warm haze
  const bandas = ['#6fa6dc', '#7db0e0', '#8cbbe4', '#9cc6e8', '#b0d0e8', '#c8d8e4', '#e0dcd0', '#f0dcc0', '#f4dcb2'];
  const alto = 40;
  bandas.forEach((b, i) => rect(x, b, 0, Math.floor((i * alto) / bandas.length), W, Math.ceil(alto / bandas.length) + 1));
  // the sun
  elipse(x, '#fff3c0', 470, 24, 9, 9);
  elipse(x, '#fffbe8', 470, 24, 6, 6);
  // clouds
  for (const [cx, cy, s] of [[60, 10, 1], [200, 16, 0.8], [340, 8, 1.1], [560, 14, 0.9], [420, 6, 0.7]] as const) {
    elipse(x, '#ffffff', cx, cy, 16 * s, 4 * s);
    elipse(x, '#ffffff', cx - 8 * s, cy - 2, 9 * s, 4 * s);
    elipse(x, '#ffffff', cx + 9 * s, cy - 1, 10 * s, 4 * s);
    elipse(x, '#dde8f4', cx, cy + 3 * s, 14 * s, 1.6 * s);
  }
  // two lines of hills
  for (let i = 0; i < W; i++) {
    const h1 = 30 + Math.round(Math.sin(i / 38) * 3 + Math.sin(i / 13) * 1.2);
    rect(x, '#9fb88a', i, h1, 1, H - h1);
    const h2 = 36 + Math.round(Math.sin(i / 27 + 2) * 2.5 + Math.sin(i / 9) * 0.8);
    rect(x, '#7fa06a', i, h2, 1, H - h2);
  }
  // vineyard rows on the near hill
  for (let i = 0; i < W; i += 5) rect(x, '#6a8c56', i, 44, 1, 12);
  // cypresses, olive trees
  for (let i = 0; i < 24; i++) {
    const px = Math.round(i * (W / 24) + hashi(i, 2) * 14);
    const py = 40 + Math.round(hashi(i, 3) * 5);
    if (i % 3 === 0) {
      elipse(x, '#2f6a3a', px, py - 6, 2.5, 8);
      elipse(x, '#3f8a4a', px - 0.5, py - 7, 1.2, 6);
    } else {
      rect(x, '#6a4a2a', px, py - 3, 1, 4);
      elipse(x, '#6a8a4a', px, py - 5, 4.5, 3);
      elipse(x, '#8aaa6a', px - 1, py - 6, 2.5, 1.6);
    }
  }
  // the country house: stone walls, a terracotta roof, a chimney with smoke, shutters, a porch
  const casa = (cx: number, base: number, ancho: number, alto2: number) => {
    const x0 = cx - Math.floor(ancho / 2);
    rect(x, '#d9c3a0', x0, base - alto2, ancho, alto2);
    for (let j = 0; j < alto2; j += 4) for (let i = 0; i < ancho; i += 6) rect(x, (i / 6 + j / 4) & 1 ? '#c8b08a' : '#e4d0b0', x0 + i + ((j / 4) & 1 ? 3 : 0), base - alto2 + j, 5, 3);
    rect(x, '#9a8060', x0, base - 1, ancho, 1);
    // roof
    for (let r = 0; r < 9; r++) rect(x, r & 1 ? '#c25a38' : '#b04a2c', x0 - 3 + r, base - alto2 - 9 + r, ancho + 6 - 2 * r, 1);
    rect(x, '#8a3a20', x0 - 3, base - alto2 - 1, ancho + 6, 1);
    // chimney and smoke
    rect(x, '#a89070', x0 + ancho - 10, base - alto2 - 16, 5, 9);
    rect(x, '#6a5a4a', x0 + ancho - 11, base - alto2 - 17, 7, 2);
    for (const [sx, sy, r] of [[0, -22, 2], [2, -26, 3], [5, -31, 3.5]] as const) elipse(x, 'rgba(255,255,255,0.7)', x0 + ancho - 7 + sx, base - alto2 + sy, r, r - 0.5);
    // windows with shutters, a door
    for (let wx = x0 + 6; wx < x0 + ancho - 10; wx += 14) {
      rect(x, '#3a4a6a', wx, base - alto2 + 4, 6, 7);
      rect(x, '#fff0b0', wx + 1, base - alto2 + 5, 4, 5);
      rect(x, '#3a8a5a', wx - 2, base - alto2 + 4, 2, 7);
      rect(x, '#3a8a5a', wx + 6, base - alto2 + 4, 2, 7);
    }
    rect(x, '#6a4426', cx - 3, base - 10, 7, 10);
    rect(x, '#f2c14e', cx + 2, base - 5, 1, 1);
  };
  casa(120, 46, 70, 16);
  casa(380, 47, 54, 13);
  // a windmill far away
  rect(x, '#e8dcc8', 555, 28, 5, 14);
  for (const [dx, dy] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) trazo(x, '#a89070', 557, 28, 557 + dx, 28 + dy, 1);
  // string lights over the whole horizon
  for (let i = 0; i < W; i += 2) {
    const y = 3 + Math.round(Math.abs(Math.sin((i / 64) * Math.PI)) * 4);
    rect(x, '#5a4a3a', i, y, 2, 1);
    if (i % 8 === 0) rect(x, ['#ff6fb5', '#ffe36e', '#6fe0ff', '#ff9a3c'][(i / 8) % 4], i, y + 1, 2, 2);
  }
  // the end of the horizon: a pink neon «DRAG» sign over the gala's side
  const sign = lienzo(30, 11);
  escribir(ctx(sign), 'DRAG', 1, 0, '#ff9ad8', '#a01868');
  x.drawImage(sign, 0, 0, 30, 11, 270, 18, 30, 11);
  // the bottom edge melts into the haze
  for (let y = 46; y < H; y++) {
    x.globalAlpha = Math.min(1, (y - 44) / 10);
    rect(x, NIEBLA, 0, y, W, 1);
  }
  x.globalAlpha = 1;
  panoramaImg = c;
  return c;
}

// ---------------------------------------------------------------- the podium and the cup

let copaImg: HTMLCanvasElement | null = null;
export function spriteCopa(): HTMLCanvasElement {
  if (copaImg) return copaImg;
  const c = lienzo(20, 24);
  pintar(
    ctx(c),
    [
      '..................',
      '.oooooooooooooooo.',
      '.oYYYYYYYYYYYYLLo.',
      'ooYYYYYYYYYYYYLLoo',
      'oYoYYYYYYYYYYYLLoYo',
      'oYoYYYYYYYYYYYLLoYo',
      'ooYYYYYYYYYYYYLLoo',
      '.oYYYYYYYYYYYYLo..',
      '..oYYYYYYYYYYLo...',
      '...oYYYYYYYYYo....',
      '....ooYYYYYoo.....',
      '......oYYYo.......',
      '.......oYo........',
      '.......oYo........',
      '......oYYYo.......',
      '.....oYYYYYo......',
      '....ooooooooo.....',
      '...oBBBBBBBBBo....',
      '...oBBBBBBBBBo....',
      '...ooooooooooo....',
    ],
    { o: '#8a5a10', Y: '#f2c14e', L: '#fff0a0', B: '#5a3a18' },
  );
  copaImg = c;
  return c;
}
