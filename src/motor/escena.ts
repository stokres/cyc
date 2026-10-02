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
}

export interface PiezaHorneada {
  c: HTMLCanvasElement;
  x0: number;
  y0: number;
  w: number;
  h: number;
  si?: string;
}

export interface CapaHorneada extends Omit<Capa, 'pieces' | 'body'> {
  piezas: PiezaHorneada[];
}

export interface LateralHorneado extends Omit<Lateral, 'body' | 'emissive'> {
  c: HTMLCanvasElement;
}

export interface Horneado {
  capas: CapaHorneada[];
  laterales: LateralHorneado[];
  px: number;
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

async function bakeLateral(S: Escena, Lw: Lateral, px: number): Promise<LateralHorneado> {
  const q = px * (Lw.res ?? 0.6);
  const w = Lw.len * S.M;
  const h = Lw.h * S.M;
  const c = await raster(Lw.body, 0, -h, w, h, q);
  const ctx = c.getContext('2d')!;
  if (Lw.texts) drawTexts(ctx, Lw.texts, 0, -h, q, false);
  // Night light: ambient, a little more towards the street mouth.
  const lm = lienzo(c.width, c.height);
  const lx = lm.getContext('2d')!;
  const gr = lx.createLinearGradient(Lw.face > 0 ? 0 : c.width, 0, Lw.face > 0 ? c.width : 0, 0);
  gr.addColorStop(0, cssRGB(hexRGB(Lw.near ?? S.ambient)));
  gr.addColorStop(1, cssRGB(hexRGB(Lw.far ?? S.ambient)));
  lx.fillStyle = gr;
  lx.fillRect(0, 0, c.width, c.height);
  lx.setTransform(q, 0, 0, q, 0, h * q);
  lx.globalCompositeOperation = 'lighter';
  for (const l of Lw.lights ?? []) pool(lx, l.x, l.y, l.r, l.r * (l.flat ?? 1), hexRGB(l.color), l.power);
  multiplyLight(c, lm);
  if (Lw.emissive) ctx.drawImage(await raster(Lw.emissive, 0, -h, w, h, q), 0, 0);
  if (Lw.texts) drawTexts(ctx, Lw.texts, 0, -h, q, true);
  const { body: _b, emissive: _e, ...rest } = Lw;
  return { ...rest, c };
}

/** Rasterise and light every layer at `px` device pixels per scene unit. */
export async function hornear(S: Escena, px: number, onProgress?: (p: number) => void): Promise<Horneado> {
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
    for (const p of tiles(L)) {
      const w = p.x1 - p.x0;
      const h = p.y1 - p.y0;
      const c = await raster(p.body, p.x0, p.y0, w, h, px);
      const ctx = c.getContext('2d')!;
      if (L.texts) drawTexts(ctx, L.texts, p.x0, p.y0, px, false);
      if (L.lit) {
        // Light map in this layer's own coordinates.
        const lm = lienzo(c.width, c.height);
        const lx = lm.getContext('2d')!;
        lx.setTransform(px, 0, 0, px, -p.x0 * px, -p.y0 * px);
        lx.fillStyle = cssRGB(L.ambient ? hexRGB(L.ambient) : amb);
        lx.fillRect(p.x0, p.y0, w, h);
        lx.globalCompositeOperation = 'lighter';
        for (const l of L.lights === false ? [] : lights) {
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
          for (const s of S.shafts ?? []) {
            const gp = (X: number, k: number) => [S.CX + k * (X - S.CX), D.yOf(k)];
            const pts = [gp(s.X0, 1), gp(s.X1, 1), gp(s.X1 + s.dX, s.k1), gp(s.X0 + s.dX, s.k1)];
            const gr = lx.createLinearGradient(0, S.BASE, 0, D.yOf(s.k1));
            const sc = hexRGB(s.color);
            gr.addColorStop(0, cssRGB(sc, s.power));
            gr.addColorStop(1, cssRGB(sc, s.power * 0.15));
            lx.fillStyle = gr;
            lx.beginPath();
            pts.forEach(([x, y], i) => (i ? lx.lineTo(x, y) : lx.moveTo(x, y)));
            lx.closePath();
            lx.fill();
          }
        }
        multiplyLight(c, lm);
      }
      const emissive = p.emissive ?? L.emissive;
      if (emissive) ctx.drawImage(await raster(emissive, p.x0, p.y0, w, h, px), 0, 0);
      if (L.texts) drawTexts(ctx, L.texts, p.x0, p.y0, px, true);
      if (L.glows) {
        ctx.save();
        ctx.setTransform(px, 0, 0, px, -p.x0 * px, -p.y0 * px);
        ctx.globalCompositeOperation = 'lighter';
        for (const gl of L.glows) glow(ctx, gl.x, gl.y, gl.r, gl.color, gl.a);
        ctx.restore();
      }
      piezas.push({ c, x0: p.x0, y0: p.y0, w, h, si: p.si });
      onProgress?.(++done / total);
    }
    const { pieces: _p, body: _b, ...rest } = L;
    capas.push({ ...rest, piezas });
  }
  const laterales: LateralHorneado[] = [];
  for (const Lw of S.laterals ?? []) {
    laterales.push(await bakeLateral(S, Lw, px));
    onProgress?.(++done / total);
  }
  return { capas, laterales, px };
}

/** Draw a wall running into depth as sheared strips, so its foot follows the ground. */
export function drawLateral(ctx: CanvasRenderingContext2D, S: Escena, Lw: LateralHorneado, vw: number, cam: number, px: number) {
  const N = 36;
  const zw = S.ZW ?? 8;
  const xs = (d: number): [number, number] => {
    const k = zw / (zw + d);
    return [vw / 2 + k * (Lw.X - cam), k];
  };
  const [a0] = xs(0);
  const [a1] = xs(Lw.len);
  // Only the face that looks at the camera is drawn.
  if ((a1 - a0) * Lw.face <= 0) return;
  const tw = Lw.c.width;
  const th = Lw.c.height;
  const yb = (k: number) => S.HOR + (S.BASE - S.HOR) * k;
  ctx.save();
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
    ctx.setTransform(a * 1.04, b, 0, d, e - 0.04 * a * (s0 + sw / 2), f);
    ctx.drawImage(Lw.c, s0, 0, sw, th, s0, 0, sw, th);
  }
  ctx.restore();
}
