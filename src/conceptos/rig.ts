// Turns a rig of loose pieces (the friends' faceted figures, the enemies: src/arte/conceptos-fig-*.mjs, src/arte/una-mas.mjs) into
// ANIMATION FRAMES: bitmaps of the whole figure in a pose. Docs/ESTILO.md T5: characters reach the screen as images, never as pieces
// moved every frame; the pieces are baked once (hornearFigura, src/capitulos/conceptos-rig.ts) and here each pose is composed ONCE
// into a canvas, cropped to its pixels. In the game a frame is a single drawImage.
//
// A pose is a set of tweaks over the rest pose: `mods[id]` turns a piece about its pivot (`rot`, radians, clockwise), shifts it (`dx`, `dy`,
// figure units) or squashes it (`sx`, `sy`, about the pivot); the tweak of a piece is inherited by its children (`padre`): the beard
// follows the head, the mug follows the arm. `cuerpo` does the same to the whole figure about its feet.
import { hornearFigura, type FiguraBmp, type FiguraDef, type ParteBmp, type ParteDef } from '../capitulos/conceptos-rig';

export interface Mov {
  rot?: number;
  dx?: number;
  dy?: number;
  sx?: number;
  sy?: number;
}

export interface Pose {
  mods?: Record<string, Mov>;
  /** The whole figure, about its feet. */
  cuerpo?: Mov;
  /** Phase of the cloth that waves (radians). */
  onda?: number;
  /** Pieces that are not drawn in this pose. */
  ocultar?: string[];
}

/** A baked frame: `ax`, `ay` is where the figure's feet-centre is inside the bitmap (pixels); `ppu` the bitmap pixels per figure unit. */
export interface Cuadro {
  c: HTMLCanvasElement;
  ax: number;
  ay: number;
  ppu: number;
}

type Sitio = { x0: number; y0: number; x1: number; y1: number };

function aplicar(m: DOMMatrix, q: ParteDef, mod: Mov | undefined): DOMMatrix {
  if (!mod) return m;
  let r = m;
  if (mod.dx || mod.dy) r = r.translate(mod.dx ?? 0, mod.dy ?? 0);
  const sx = mod.sx ?? 1;
  const sy = mod.sy ?? 1;
  if (mod.rot || sx !== 1 || sy !== 1) {
    const [px, py] = q.piv ?? [0, 0];
    r = r.translate(px, py);
    if (mod.rot) r = r.rotate((mod.rot * 180) / Math.PI);
    if (sx !== 1 || sy !== 1) r = r.scale(sx, sy);
    r = r.translate(-px, -py);
  }
  return r;
}

/** Poses are written for a figure that faces right; one drawn facing left (Guille) gets them mirrored. */
function espejo(m: Mov | undefined, sg: number): Mov | undefined {
  return m && sg < 0 ? { ...m, rot: m.rot ? -m.rot : m.rot, dx: m.dx ? -m.dx : m.dx } : m;
}

function matrizDe(p: ParteBmp, pose: Pose, base: DOMMatrix, sg: number): DOMMatrix {
  let m = base;
  for (const q of p.cadena ?? [p.def]) m = aplicar(m, q, espejo(pose.mods?.[q.id], sg));
  return m;
}

/** Composes every pose of a baked figure into frames at `ppu` bitmap pixels per figure unit. */
export function componerPoses(F: FiguraBmp, def: FiguraDef, poses: Pose[], ppu: number, margen = 20): Cuadro[] {
  // The piece bitmaps were baked at some resolution `res`: they are drawn into their (x, y, w, h) box, so any ppu works.
  const visibles = F.partes.filter((p) => !p.def.fija && !p.def.orb && !p.def.cae);
  return poses.map((pose) => {
    const base = new DOMMatrix();
    let b0 = base;
    if (def.mira < 0) b0 = b0.scale(-1, 1);
    const c = pose.cuerpo;
    const sg = def.mira < 0 ? -1 : 1;
    if (c) b0 = aplicar(b0, { id: 'cuerpo', piv: [0, 0], x: 0, y: 0, w: 0, h: 0, svg: '' }, espejo(c, sg));
    // First the bounds, then the pixels.
    const caja: Sitio = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const mats = new Map<ParteBmp, DOMMatrix>();
    for (const p of visibles) {
      if (pose.ocultar?.includes(p.def.id)) continue;
      const m = matrizDe(p, pose, b0, sg);
      mats.set(p, m);
      const d = p.def;
      const extra = d.onda ? d.onda.amp * d.h : 0;
      for (const [x, y] of [[d.x - extra, d.y], [d.x + d.w + extra, d.y], [d.x - extra, d.y + d.h], [d.x + d.w + extra, d.y + d.h]]) {
        const q = m.transformPoint(new DOMPoint(x, y));
        caja.x0 = Math.min(caja.x0, q.x);
        caja.y0 = Math.min(caja.y0, q.y);
        caja.x1 = Math.max(caja.x1, q.x);
        caja.y1 = Math.max(caja.y1, q.y);
      }
    }
    caja.x0 -= margen;
    caja.y0 -= margen;
    caja.x1 += margen;
    caja.y1 += margen;
    const w = Math.max(2, Math.ceil((caja.x1 - caja.x0) * ppu));
    const h = Math.max(2, Math.ceil((caja.y1 - caja.y0) * ppu));
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const x = cv.getContext('2d')!;
    for (const p of visibles) {
      const m = mats.get(p);
      if (!m) continue;
      const d = p.def;
      const T = new DOMMatrix().scale(ppu).translate(-caja.x0, -caja.y0).multiply(m);
      x.setTransform(T);
      if (d.onda) {
        const N = 6;
        const sh = p.c.height / N;
        const dh = d.h / N;
        for (let k = 0; k < N; k++) {
          const off = d.onda.amp * d.h * Math.sin((pose.onda ?? 0) + d.onda.fase + k * 0.75) * Math.pow(k / (N - 1), 1.3);
          x.drawImage(p.c, 0, k * sh, p.c.width, sh, d.x + off, d.y + k * dh, d.w, dh + 0.7);
        }
      } else x.drawImage(p.c, d.x, d.y, d.w, d.h);
    }
    return recortar(cv, -caja.x0 * ppu, -caja.y0 * ppu, ppu);
  });
}

/** Crops a canvas to the pixels that are not transparent (a frame is mostly the figure, not margin). */
function recortar(c: HTMLCanvasElement, ax: number, ay: number, ppu: number): Cuadro {
  const x = c.getContext('2d', { willReadFrequently: true })!;
  const { width: w, height: h } = c;
  const d = x.getImageData(0, 0, w, h).data;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (d[(j * w + i) * 4 + 3] > 8) {
        if (i < x0) x0 = i;
        if (i > x1) x1 = i;
        if (j < y0) y0 = j;
        if (j > y1) y1 = j;
      }
    }
  }
  if (x1 < 0) return { c, ax, ay, ppu };
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  c.width = c.height = 0;
  return { c: out, ax: ax - x0, ay: ay - y0, ppu };
}

/** Bakes the pieces of a rig (with the paint texture) and composes its poses. `res` = piece bitmap pixels per figure unit. */
export async function hornearRig(def: FiguraDef, poses: Pose[], ppu: number): Promise<Cuadro[]> {
  const F = await hornearFigura(def, ppu * 1.0);
  const r = componerPoses(F, def, poses, ppu);
  // The pieces are no longer needed: only their composed frames.
  for (const p of F.partes) p.c.width = p.c.height = 0;
  F.aura.width = F.aura.height = 0;
  return r;
}

/** A copy of a frame filled with one colour wherever it has pixels (the white flash of a hit). */
export function tenir(f: Cuadro, color: string): Cuadro {
  const c = document.createElement('canvas');
  c.width = f.c.width;
  c.height = f.c.height;
  const x = c.getContext('2d')!;
  x.drawImage(f.c, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return { ...f, c };
}
