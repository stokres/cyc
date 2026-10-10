// Scene data (authored in src/arte/escenas) and how it is baked and drawn.
// Each layer is SVG painted in daylight albedo; baking rasterises it once,
// multiplies the scene's light map and adds the light sources on top
// (docs/ESTILO.md, L4). Drawing applies the camera model in docs/ESCENA-1.md:
// each layer moves at its own depth, the floor is sheared row by row and walls
// that run into depth are drawn as strips.

export type RGB = [number, number, number];

export interface Texto {
  x: number;
  y: number;
  s: string;
  size: number;
  font?: 'display' | 'body' | 'serif';
  weight?: number;
  color: string;
  align?: CanvasTextAlign;
  maxW?: number;
  spacing?: number;
  emissive?: boolean;
  glow?: string;
  blur?: number;
}

export interface Pieza {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  body: string;
  emissive?: string;
  /** Flag condition: 'flag' or '!flag'. The piece is drawn only when it holds. */
  si?: string;
}

export interface Glow {
  x: number;
  y: number;
  r: number;
  color: string;
  a: number;
}

export interface Capa {
  id: string;
  k?: number;
  floor?: boolean;
  z?: 'front';
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  body?: string;
  pieces?: Pieza[];
  emissive?: string;
  texts?: Texto[];
  glows?: Glow[];
  lit?: boolean;
  ambient?: string;
  lights?: false;
  /** Painted texture (paper grain and pigment) baked into the albedo, 0–1. Free per frame. */
  textura?: number;
}

export interface Luz {
  X: number;
  y: number;
  r: number;
  color: string;
  power: number;
  fy?: number;
  flat?: number;
}

export interface Lateral {
  id: string;
  X: number;
  face: 1 | -1;
  len: number;
  h: number;
  after: string;
  body: string;
  emissive?: string;
  texts?: Texto[];
  near?: string;
  far?: string;
  lights?: Array<{ x: number; y: number; r: number; color: string; power: number; flat?: number }>;
  res?: number;
}

export interface Zona {
  u: number;
  k: number;
  w: number;
  top: number;
  bottom: number;
  X: number;
  y: number;
}

export interface Prop {
  id: string;
  X: number;
  y: number;
  svg: string;
  z?: number;
  si?: string;
  shadow?: [number, number];
}

export interface Escena {
  id: string;
  name: string;
  W: number;
  H: number;
  HOR: number;
  BASE: number;
  CX: number;
  M: number;
  ZW?: number;
  speed?: number;
  ambient: string;
  walk: { y0: number; y1: number; x0: number; x1: number };
  start: { X: number; y: number };
  layers: Capa[];
  laterals?: Lateral[];
  props?: Prop[];
  lights: Luz[];
  shafts?: Array<{ X0: number; X1: number; dX: number; k1: number; color: string; power: number }>;
  spots: Record<string, Record<string, number>>;
  zonas: Record<string, Zona>;
  /** Key light (towards the light, y down), for relief: the moon, the dusk window... */
  clave?: [number, number, number];
}

/** Textures the WebGL renderer made for a piece (see gl.ts). */
export interface TexturasGL {
  alb: WebGLTexture;
  nrm: WebGLTexture;
  luz: WebGLTexture | null;
  emi: WebGLTexture | null;
  /** Size of the albedo in pixels. */
  w: number;
  h: number;
}

export interface PiezaHorneada {
  /** Canvas 2D: the finished piece. GL: same as `alb` until uploaded. */
  c: HTMLCanvasElement;
  x0: number;
  y0: number;
  w: number;
  h: number;
  si?: string;
  alb?: HTMLCanvasElement;
  luz?: HTMLCanvasElement | null;
  emi?: HTMLCanvasElement | null;
  luces?: LuzCapa[];
  tex?: TexturasGL;
}

export interface CapaHorneada extends Omit<Capa, 'pieces' | 'body'> {
  piezas: PiezaHorneada[];
}

export interface LateralHorneado extends Omit<Lateral, 'body' | 'emissive'>, Omit<PiezaHorneada, 'x0' | 'y0' | 'w' | 'h' | 'si'> {}

export interface Horneado {
  capas: CapaHorneada[];
  laterales: LateralHorneado[];
  px: number;
  modo: Modo;
}

const NS = 'http://www.w3.org/2000/svg';
const TILE = 1400;

export const FONTS = {
  display: "'Graduate', 'Rockwell', Georgia, serif",
  body: "'Alegreya Sans', 'Trebuchet MS', 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', 'DejaVu Serif', serif",
};

export const hexRGB = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const cssRGB = (c: RGB, k = 1, a = 1) => {
  const f = (v: number) => Math.round(Math.max(0, Math.min(1, v * k)) * 255);
  return a >= 1 ? `rgb(${f(c[0])},${f(c[1])},${f(c[2])})` : `rgba(${f(c[0])},${f(c[1])},${f(c[2])},${a})`;
};

export function lienzo(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

async function raster(body: string, x: number, y: number, w: number, h: number, px: number) {
  const W = Math.max(1, Math.round(w * px));
  const Hh = Math.max(1, Math.round(h * px));
  const svg = `<svg xmlns="${NS}" width="${W}" height="${Hh}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="none">${body}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = lienzo(W, Hh);
    c.getContext('2d')!.drawImage(img, 0, 0, W, Hh);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function pool(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: RGB, power: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, cssRGB(color, power));
  g.addColorStop(0.3, cssRGB(color, power * 0.83));
  g.addColorStop(0.55, cssRGB(color, power * 0.48));
  g.addColorStop(0.8, cssRGB(color, power * 0.13));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/** Restrained glow on a light source only (rule L5). */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) {
  const c = hexRGB(color);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, cssRGB(c, 1, a));
  g.addColorStop(0.25, cssRGB(c, 1, a * 0.45));
  g.addColorStop(1, cssRGB(c, 1, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Sign lettering, drawn with the page fonts (SVG images cannot load web fonts). */
function drawTexts(ctx: CanvasRenderingContext2D, texts: Texto[], x0: number, y0: number, px: number, emissive: boolean) {
  ctx.save();
  ctx.setTransform(px, 0, 0, px, -x0 * px, -y0 * px);
  for (const t of texts) {
    if (!!t.emissive !== emissive) continue;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.font = `${t.weight ?? 400} ${t.size}px ${FONTS[t.font ?? 'body']}`;
    ctx.textAlign = t.align ?? 'center';
    ctx.textBaseline = 'middle';
    if (t.spacing) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = t.spacing + 'px';
    const w = ctx.measureText(t.s).width;
    if (t.maxW && w > t.maxW) ctx.scale(t.maxW / w, 1);
    if (t.glow) {
      ctx.shadowColor = t.glow;
      ctx.shadowBlur = t.blur ?? 14;
    }
    ctx.fillStyle = t.color;
    ctx.fillText(t.s, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Painted texture: paper grain and blotches of pigment, as two tiles made once
 * from value noise in octaves on a grid that wraps (so they repeat without seams).
 * Where the noise is below its mean the paint gets darker (multiplied), where it
 * is above, lighter (the paint added to itself): both scale the three channels
 * alike, so colours keep their saturation. Soft light would wash them out.
 */
const TEX_N = 512;
/** Scene units one tile covers: the grain stays the same size at every quality. */
const TEX_U = 640;
/** Strongest change of brightness at full strength. */
const TEX_AMP = 0.25;
let teselas: { oscura: HTMLCanvasElement; clara: HTMLCanvasElement } | null = null;

function teselasTextura() {
  if (teselas) return teselas;
  const octava = (celdas: number, seed: number) => {
    let s = seed;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const g = Array.from({ length: celdas * celdas }, r);
    const v = (i: number, j: number) => g[(j % celdas) * celdas + (i % celdas)];
    return (x: number, y: number) => {
      const gx = (x / TEX_N) * celdas;
      const gy = (y / TEX_N) * celdas;
      const i = Math.floor(gx);
      const j = Math.floor(gy);
      const fx = gx - i;
      const fy = gy - j;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const a = v(i, j);
      const b = v(i + 1, j);
      const c = v(i, j + 1);
      const d = v(i + 1, j + 1);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  };
  // Broad blotches, brush-sized patches, then fine grain (cells of ~4 scene units, still visible at «media»).
  const capas: Array<[(x: number, y: number) => number, number]> = [
    [octava(4, 7), 0.3],
    [octava(16, 11), 0.35],
    [octava(64, 13), 0.23],
    [octava(160, 17), 0.12],
  ];
  const oscura = lienzo(TEX_N, TEX_N);
  const clara = lienzo(TEX_N, TEX_N);
  const dO = oscura.getContext('2d')!.createImageData(TEX_N, TEX_N);
  const dC = clara.getContext('2d')!.createImageData(TEX_N, TEX_N);
  for (let j = 0; j < TEX_N; j++) {
    for (let i = 0; i < TEX_N; i++) {
      let v = 0;
      for (const [o, w] of capas) v += o(i, j) * w;
      const m = Math.max(-1, Math.min(1, (v - 0.5) * 3.3)) * TEX_AMP;
      const p = (j * TEX_N + i) * 4;
      dO.data[p] = dO.data[p + 1] = dO.data[p + 2] = 255 * (1 + Math.min(0, m));
      dO.data[p + 3] = 255;
      dC.data[p] = dC.data[p + 1] = dC.data[p + 2] = 255;
      dC.data[p + 3] = 255 * Math.max(0, m);
    }
  }
  oscura.getContext('2d')!.putImageData(dO, 0, 0);
  clara.getContext('2d')!.putImageData(dC, 0, 0);
  return (teselas = { oscura, clara });
}

/**
 * Paint the texture into a piece's albedo, anchored to the scene (not to the
 * piece, so neighbouring tiles meet without a seam) and only where the piece
 * has paint.
 */
function texturizar(alb: HTMLCanvasElement, x0: number, y0: number, px: number, fuerza: number) {
  const T = teselasTextura();
  const ctx = alb.getContext('2d')!;
  const t = lienzo(alb.width, alb.height);
  const tx = t.getContext('2d')!;
  const capa = (tesela: HTMLCanvasElement) => {
    const pat = tx.createPattern(tesela, 'repeat')!;
    pat.setTransform(new DOMMatrix().scale(TEX_U / TEX_N));
    tx.setTransform(px, 0, 0, px, -x0 * px, -y0 * px);
    tx.globalCompositeOperation = 'copy';
    tx.fillStyle = pat;
    tx.fillRect(x0, y0, alb.width / px, alb.height / px);
    tx.setTransform(1, 0, 0, 1, 0, 0);
  };
  ctx.save();
  ctx.globalAlpha = Math.min(1, fuerza);
  // Lighter: the albedo itself, through the light tile's alpha, added on top.
  capa(T.clara);
  tx.globalCompositeOperation = 'source-in';
  tx.drawImage(alb, 0, 0);
  const claro = lienzo(alb.width, alb.height);
  claro.getContext('2d')!.drawImage(t, 0, 0);
  // Darker: the dark tile, cut to the piece, multiplied.
  capa(T.oscura);
  tx.globalCompositeOperation = 'destination-in';
  tx.drawImage(alb, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(t, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(claro, 0, 0);
  ctx.restore();
  t.width = t.height = claro.width = claro.height = 0;
}

function multiplyLight(c: HTMLCanvasElement, lm: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!;
  const alpha = lienzo(c.width, c.height);
  alpha.getContext('2d')!.drawImage(c, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(lm, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(alpha, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}

export const depth = (S: Escena) => ({
  f: (y: number) => (y - S.HOR) / (S.BASE - S.HOR),
  yOf: (k: number) => S.HOR + (S.BASE - S.HOR) * k,
});

/**
 * How a piece is baked:
 * - '2d': one canvas, albedo x light map + emissive (Canvas 2D renderer).
 * - 'gl': the three kept apart (albedo, a low-res light map, emissive), so the
 *   WebGL renderer can add relief lighting on top (see gl.ts).
 */
export type Modo = '2d' | 'gl';

/** Lights already moved into a layer's own coordinates, for the relief shader. */
export interface LuzCapa {
  x: number;
  y: number;
  r: number;
  power: number;
  c: RGB;
  flat: number;
}

interface Capas3 {
  alb: HTMLCanvasElement;
  luz: HTMLCanvasElement | null;
  emi: HTMLCanvasElement | null;
}

/** The low-res light map is enough for the GL renderer: light is smooth. */
const LUZ_GL = 0.25;

function componer({ alb, luz, emi }: Capas3) {
  const c = alb;
  if (luz) {
    const lm = luz.width === c.width ? luz : lienzo(c.width, c.height);
    if (lm !== luz) {
      const lx = lm.getContext('2d')!;
      lx.imageSmoothingQuality = 'high';
      lx.drawImage(luz, 0, 0, c.width, c.height);
    }
    multiplyLight(c, lm);
  }
  if (emi) c.getContext('2d')!.drawImage(emi, 0, 0);
  return c;
}

async function bakeLateral(S: Escena, Lw: Lateral, px: number, modo: Modo): Promise<LateralHorneado> {
  const q = px * (Lw.res ?? 0.6);
  const w = Lw.len * S.M;
  const h = Lw.h * S.M;
  const alb = await raster(Lw.body, 0, -h, w, h, q);
  if (Lw.texts) drawTexts(alb.getContext('2d')!, Lw.texts, 0, -h, q, false);
  // Night light: ambient, a little more towards the street mouth.
  const ql = modo === 'gl' ? q * LUZ_GL : q;
  const lm = lienzo(w * ql, h * ql);
  const lx = lm.getContext('2d')!;
  const gr = lx.createLinearGradient(Lw.face > 0 ? 0 : lm.width, 0, Lw.face > 0 ? lm.width : 0, 0);
  gr.addColorStop(0, cssRGB(hexRGB(Lw.near ?? S.ambient)));
  gr.addColorStop(1, cssRGB(hexRGB(Lw.far ?? S.ambient)));
  lx.fillStyle = gr;
  lx.fillRect(0, 0, lm.width, lm.height);
  lx.setTransform(ql, 0, 0, ql, 0, h * ql);
  lx.globalCompositeOperation = 'lighter';
  for (const l of Lw.lights ?? []) pool(lx, l.x, l.y, l.r, l.r * (l.flat ?? 1), hexRGB(l.color), l.power);
  let emi: HTMLCanvasElement | null = null;
  if (Lw.emissive || Lw.texts?.some((t) => t.emissive)) {
    emi = Lw.emissive ? await raster(Lw.emissive, 0, -h, w, h, q) : lienzo(alb.width, alb.height);
    if (Lw.texts) drawTexts(emi.getContext('2d')!, Lw.texts, 0, -h, q, true);
  }
  const { body: _b, emissive: _e, ...rest } = Lw;
  if (modo === 'gl') return { ...rest, c: alb, alb, luz: lm, emi, luces: [] };
  return { ...rest, c: componer({ alb, luz: lm, emi }) };
}

/** Rasterise and light every layer at `px` device pixels per scene unit. */
export async function hornear(S: Escena, px: number, onProgress?: (p: number) => void, modo: Modo = '2d'): Promise<Horneado> {
  const D = depth(S);
  const amb = hexRGB(S.ambient);
  const lights = S.lights.map((l) => ({ ...l, c: hexRGB(l.color) }));
  const capas: CapaHorneada[] = [];
  const tiles = (L: Capa): Pieza[] =>
    L.pieces ??
    Array.from({ length: Math.ceil((L.x1! - L.x0!) / TILE) }, (_, i) => ({
      x0: L.x0! + i * TILE - (i ? 6 : 0),
      x1: Math.min(L.x1!, L.x0! + (i + 1) * TILE + 6),
      y0: L.y0!,
      y1: L.y1!,
      body: L.body!,
    }));
  const total = S.layers.reduce((n, L) => n + tiles(L).length, 0) + (S.laterals?.length ?? 0);
  let done = 0;
  for (const L of S.layers) {
    const piezas: PiezaHorneada[] = [];
    // The scene lights as this layer sees them (relief shader).
    const usadas = L.lit && L.lights !== false ? lights : [];
    const lucesCapa: LuzCapa[] = usadas.map((l) => {
      if (L.floor) {
        const fy = l.fy ?? Math.max(S.BASE + 20, l.y);
        const k = D.f(fy);
        return { x: S.CX + k * (l.X - S.CX), y: fy, r: l.r * k, power: l.power, c: l.c, flat: l.flat ?? 0.42 };
      }
      const k = L.k ?? 1;
      return { x: S.CX + k * (l.X - S.CX), y: l.y, r: l.r * k, power: l.power, c: l.c, flat: 1 };
    });
    for (const p of tiles(L)) {
      const w = p.x1 - p.x0;
      const h = p.y1 - p.y0;
      const alb = await raster(p.body, p.x0, p.y0, w, h, px);
      if (L.textura) texturizar(alb, p.x0, p.y0, px, L.textura);
      if (L.texts) drawTexts(alb.getContext('2d')!, L.texts, p.x0, p.y0, px, false);
      let lm: HTMLCanvasElement | null = null;
      if (L.lit) {
        // Light map in this layer's own coordinates.
        const ql = modo === 'gl' ? px * LUZ_GL : px;
        lm = lienzo(w * ql, h * ql);
        const lx = lm.getContext('2d')!;
        lx.setTransform(ql, 0, 0, ql, -p.x0 * ql, -p.y0 * ql);
        lx.fillStyle = cssRGB(L.ambient ? hexRGB(L.ambient) : amb);
        lx.fillRect(p.x0, p.y0, w, h);
        lx.globalCompositeOperation = 'lighter';
        for (const l of usadas) {
          if (L.floor) {
            const fy = l.fy ?? Math.max(S.BASE + 20, l.y);
            const k = D.f(fy);
            pool(lx, S.CX + k * (l.X - S.CX), fy, l.r * k, l.r * (l.flat ?? 0.42), l.c, l.power * 1.1);
          } else {
            const k = L.k ?? 1;
            pool(lx, S.CX + k * (l.X - S.CX), l.y, l.r * k, l.r * k, l.c, l.power);
          }
        }
        if (L.floor) {
          for (const s2 of S.shafts ?? []) {
            const gp = (X: number, k: number) => [S.CX + k * (X - S.CX), D.yOf(k)];
            const pts = [gp(s2.X0, 1), gp(s2.X1, 1), gp(s2.X1 + s2.dX, s2.k1), gp(s2.X0 + s2.dX, s2.k1)];
            const gr = lx.createLinearGradient(0, S.BASE, 0, D.yOf(s2.k1));
            const sc = hexRGB(s2.color);
            gr.addColorStop(0, cssRGB(sc, s2.power));
            gr.addColorStop(1, cssRGB(sc, s2.power * 0.15));
            lx.fillStyle = gr;
            lx.beginPath();
            pts.forEach(([x, y], i) => (i ? lx.lineTo(x, y) : lx.moveTo(x, y)));
            lx.closePath();
            lx.fill();
          }
        }
      }
      const emissive = p.emissive ?? L.emissive;
      let emi: HTMLCanvasElement | null = null;
      if (emissive || L.glows || L.texts?.some((t) => t.emissive)) {
        emi = emissive ? await raster(emissive, p.x0, p.y0, w, h, px) : lienzo(alb.width, alb.height);
        const ex = emi.getContext('2d')!;
        if (L.texts) drawTexts(ex, L.texts, p.x0, p.y0, px, true);
        if (L.glows) {
          ex.save();
          ex.setTransform(px, 0, 0, px, -p.x0 * px, -p.y0 * px);
          ex.globalCompositeOperation = 'lighter';
          for (const gl of L.glows) glow(ex, gl.x, gl.y, gl.r, gl.color, gl.a);
          ex.restore();
        }
      }
      const base = { x0: p.x0, y0: p.y0, w, h, si: p.si };
      if (modo === 'gl') {
        const cerca = lucesCapa.filter((l) => l.x + l.r > p.x0 && l.x - l.r < p.x1 && l.y + l.r * l.flat > p.y0 && l.y - l.r * l.flat < p.y1);
        piezas.push({ ...base, c: alb, alb, luz: lm, emi, luces: cerca.slice(0, 16) });
      } else piezas.push({ ...base, c: componer({ alb, luz: lm, emi }) });
      onProgress?.(++done / total);
    }
    const { pieces: _p, body: _b, ...rest } = L;
    capas.push({ ...rest, piezas });
  }
  const laterales: LateralHorneado[] = [];
  for (const Lw of S.laterals ?? []) {
    laterales.push(await bakeLateral(S, Lw, px, modo));
    onProgress?.(++done / total);
  }
  return { capas, laterales, px, modo };
}

/**
 * A wall running into depth, cut into strips. Each strip is an affine transform
 * from texture pixels to device pixels, sheared so its foot follows the ground.
 */
export function tirasLateral(S: Escena, Lw: Lateral, tw: number, th: number, vw: number, cam: number, px: number) {
  const N = 36;
  const zw = S.ZW ?? 8;
  const xs = (d: number): [number, number] => {
    const k = zw / (zw + d);
    return [vw / 2 + k * (Lw.X - cam), k];
  };
  const out: Array<{ m: [number, number, number, number, number, number]; s0: number; sw: number }> = [];
  const [a0] = xs(0);
  const [a1] = xs(Lw.len);
  // Only the face that looks at the camera is drawn.
  if ((a1 - a0) * Lw.face <= 0) return out;
  const yb = (k: number) => S.HOR + (S.BASE - S.HOR) * k;
  for (let i = 0; i < N; i++) {
    // Strips are denser near the camera, where the wall is wider on screen.
    const u0 = i / N;
    const u1 = (i + 1) / N;
    const d0 = Lw.len * u0 * u0;
    const d1 = Lw.len * u1 * u1;
    const [x0, k0] = xs(d0);
    const [x1, k1] = xs(d1);
    if (Math.min(x0, x1) > vw || Math.max(x0, x1) < 0) continue;
    const s0 = Lw.face > 0 ? (d0 / Lw.len) * tw : (1 - d1 / Lw.len) * tw;
    const sw = ((d1 - d0) / Lw.len) * tw;
    const [xl, yl, xr, yr] = Lw.face > 0 ? [x0, yb(k0), x1, yb(k1)] : [x1, yb(k1), x0, yb(k0)];
    const a = ((xr - xl) * px) / sw;
    const slope = (yr - yl) / (xr - xl);
    const d = (Lw.h * S.M * ((k0 + k1) / 2) * px) / th;
    const e = xl * px - s0 * a;
    const b = slope * a;
    const f = yl * px - b * s0 - d * th;
    // 4% wider around the strip centre so neighbouring strips overlap without seams.
    out.push({ m: [a * 1.04, b, 0, d, e - 0.04 * a * (s0 + sw / 2), f], s0, sw });
  }
  return out;
}

/** Canvas 2D: draw a lateral wall strip by strip. */
export function drawLateral(ctx: CanvasRenderingContext2D, S: Escena, Lw: LateralHorneado, vw: number, cam: number, px: number) {
  const tw = Lw.c.width;
  const th = Lw.c.height;
  ctx.save();
  for (const t of tirasLateral(S, Lw as unknown as Lateral, tw, th, vw, cam, px)) {
    ctx.setTransform(...t.m);
    ctx.drawImage(Lw.c, t.s0, 0, t.sw, th, t.s0, 0, t.sw, th);
  }
  ctx.restore();
}
