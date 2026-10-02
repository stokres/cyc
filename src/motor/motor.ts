// The stage: two canvases (behind and in front of the characters) and the SVG
// in between where the actors live. Owns the camera, baking, per-frame drawing
// and the light that tints the actors.
import { depth, drawLateral, hexRGB, hornear, lienzo, type Escena, type Horneado, type RGB, type Zona } from './escena';
import { VIVO } from './vivo';
import type { Actor } from './actores';

const NS = 'http://www.w3.org/2000/svg';
export const H = 1080;

export type Calidad = 'alta' | 'media' | 'baja';
const ESCALA: Record<Calidad, number> = { alta: 1, media: 0.75, baja: 0.55 };

export class Motor {
  readonly back: HTMLCanvasElement;
  readonly front: HTMLCanvasElement;
  readonly svg: SVGSVGElement;
  readonly defs: SVGDefsElement;
  readonly world: SVGGElement;
  private bctx: CanvasRenderingContext2D;
  private fctx: CanvasRenderingContext2D;
  private cache = new Map<string, Horneado>();
  S: Escena | null = null;
  private baked: Horneado | null = null;
  private lights: Array<{ X: number; y: number; r: number; power: number; c: RGB }> = [];
  private amb: RGB = [1, 1, 1];
  cssW = 1;
  cssH = 1;
  /** Visible logical width (height is always 1080). */
  vw = 1920;
  px = 1;
  calidad: Calidad;
  /** Camera centre on the back plane. */
  cam = 0;
  camGoal = 0;
  t = 0;
  actores: Actor[] = [];
  /** Hidden layers (debug) and the flag test for pieces with a condition. */
  ocultas = new Set<string>();
  cond: (expr: string) => boolean = () => true;
  /** Extra drawing after a layer (scripts: olives on the floor, Zzz...). */
  extra: ((ctx: CanvasRenderingContext2D, capa: string) => void) | null = null;
  onResize: (() => void) | null = null;

  constructor(readonly root: HTMLElement) {
    this.back = lienzo(1, 1);
    this.back.className = 'capa';
    this.svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
    this.svg.setAttribute('class', 'capa actores');
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.defs = document.createElementNS(NS, 'defs') as SVGDefsElement;
    this.world = document.createElementNS(NS, 'g') as SVGGElement;
    this.svg.append(this.defs, this.world);
    this.front = lienzo(1, 1);
    this.front.className = 'capa';
    this.front.id = 'scene';
    root.prepend(this.back, this.svg, this.front);
    this.bctx = this.back.getContext('2d', { alpha: false })!;
    this.fctx = this.front.getContext('2d')!;
    this.calidad = matchMedia('(pointer: coarse)').matches ? 'media' : 'alta';
    this.resize();
    new ResizeObserver(() => this.resize()).observe(root);
  }

  // ------------------------------------------------------------ size and quality

  private pxFor() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return Math.min(this.cssH * dpr * ESCALA[this.calidad], H) / H;
  }

  resize() {
    const r = this.root.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    this.cssW = r.width;
    this.cssH = r.height;
    this.vw = (this.cssW / this.cssH) * H;
    const px = this.pxFor();
    for (const c of [this.back, this.front]) {
      c.width = Math.round(this.vw * px);
      c.height = Math.round(H * px);
    }
    this.svg.setAttribute('viewBox', `0 0 ${this.vw.toFixed(1)} ${H}`);
    const old = this.px;
    this.px = px;
    // Re-bake when the resolution changes a lot (rotation, quality change).
    if (this.S && Math.abs(px - old) / old > 0.2) {
      this.cache.clear();
      void this.cargar(this.S);
    }
    this.clampCam(true);
    this.onResize?.();
  }

  setCalidad(q: Calidad) {
    if (q === this.calidad) return;
    this.calidad = q;
    this.px = 0.0001;
    this.resize();
  }

  // ------------------------------------------------------------ scenes

  async cargar(S: Escena, onProgress?: (p: number) => void) {
    const key = `${S.id}@${this.px.toFixed(3)}`;
    let b = this.cache.get(key);
    if (!b) {
      b = await hornear(S, this.px, onProgress);
      this.cache.set(key, b);
    }
    this.S = S;
    this.baked = b;
    this.lights = S.lights.map((l) => ({ X: l.X, y: l.y, r: l.r, power: l.power, c: hexRGB(l.color) }));
    this.amb = hexRGB(S.ambient);
  }

  /** Bake a scene ahead of time so the door to it opens instantly. */
  async precargar(S: Escena) {
    const key = `${S.id}@${this.px.toFixed(3)}`;
    if (!this.cache.has(key)) this.cache.set(key, await hornear(S, this.px));
  }

  f(y: number) {
    return this.S ? depth(this.S).f(y) : 1;
  }

  /** Screen offset for a layer at depth k: screen x = u + off(k). */
  off(k: number) {
    const S = this.S!;
    return this.vw / 2 - S.CX + k * (S.CX - this.cam);
  }

  /** Screen x of a floor point (back-plane X) at depth k. */
  screenX(X: number, k: number) {
    return this.vw / 2 + k * (X - this.cam);
  }

  /** Floor point under a screen position, with y clamped into the walk band. */
  floorAt(sx: number, sy: number, fallbackY: number) {
    const S = this.S!;
    const y = sy > S.BASE ? Math.max(S.walk.y0, Math.min(S.walk.y1, sy)) : fallbackY;
    const k = this.f(y);
    return { X: this.cam + (sx - this.vw / 2) / k, y };
  }

  /** Screen rectangle of a tap zone (logical units). */
  zonaRect(z: Zona) {
    const x = z.u + this.off(z.k);
    return { x: x - z.w / 2, y: z.top, w: z.w, h: z.bottom - z.top };
  }

  seguir(X: number, snap = false) {
    this.camGoal = X;
    if (snap) this.cam = X;
    this.clampCam(snap);
  }

  private clampCam(snap = false) {
    const S = this.S;
    if (!S) return;
    const lo = Math.min(this.vw / 2, S.W / 2);
    const hi = Math.max(S.W - this.vw / 2, S.W / 2);
    this.camGoal = Math.max(lo, Math.min(hi, this.camGoal));
    if (snap) this.cam = this.camGoal;
    this.cam = Math.max(lo, Math.min(hi, this.cam));
  }

  // ------------------------------------------------------------ light on actors

  /** Light arriving at a point, pulled towards grey so costumes keep their hue (rule C3). */
  tintAt(X: number, y: number): RGB {
    let c: RGB = [...this.amb];
    for (const l of this.lights) {
      const dx = (X - l.X) / l.r;
      const dy = (y - l.y) / l.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= 1) continue;
      const f = (1 - d2) * (1 - d2) * l.power;
      c = [c[0] + l.c[0] * f, c[1] + l.c[1] * f, c[2] + l.c[2] * f];
    }
    const gr = c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
    const m = c.map((v) => v + (gr - v) * 0.45);
    return [Math.min(1.3, m[0] * 1.1 + 0.06), Math.min(1.3, m[1] * 1.1 + 0.06), Math.min(1.3, m[2] * 1.1 + 0.07)];
  }

  // ------------------------------------------------------------ frame

  update(dt: number) {
    this.t += dt;
    this.clampCam();
    this.cam += (this.camGoal - this.cam) * (1 - Math.exp(-dt * 3));
  }

  /** Characters' scale: character units (Fran ~270) to scene units at depth k. */
  escala(k: number) {
    return ((this.S?.M ?? 250) * 1.75 * k) / 270;
  }

  colocar() {
    const S = this.S;
    if (!S) return;
    for (const a of this.actores) {
      if (a.enCapa) {
        const s = this.escala(a.enCapa.k);
        a.place(a.enCapa.u + this.off(a.enCapa.k), a.enCapa.y, s);
      } else {
        const k = this.f(a.y);
        a.place(this.screenX(a.X, k), a.y, this.escala(k));
      }
      a.setTint(this.tintAt(a.X, a.y - 250));
    }
    // Depth order.
    const order = this.actores.filter((a) => a.visible).sort((a, b) => a.y + a.z - (b.y + b.z));
    let prev: Element | null = null;
    for (const a of order) {
      const want: ChildNode | null = prev ? prev.nextSibling : this.world.firstChild;
      if (want !== a.wrap) this.world.insertBefore(a.wrap, want);
      prev = a.wrap;
    }
  }

  dibujar() {
    const S = this.S;
    const B = this.baked;
    const b = this.bctx;
    const f = this.fctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.fillStyle = '#0b0f1e';
    b.fillRect(0, 0, this.back.width, this.back.height);
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.clearRect(0, 0, this.front.width, this.front.height);
    if (!S || !B) return;
    const px = B.px === this.px ? this.px : B.px;
    for (const L of B.capas) {
      if (this.ocultas.has(L.id)) continue;
      const ctx = L.z === 'front' ? f : b;
      if (L.floor) {
        // x_screen = u + a + sh*y: one shear makes every row move at its own depth.
        const sh = (S.CX - this.cam) / (S.BASE - S.HOR);
        const a = this.vw / 2 - S.CX - S.HOR * sh;
        ctx.setTransform(px, 0, px * sh, px, px * a, 0);
        for (const p of L.piezas) {
          const xa = p.x0 + a + sh * (sh > 0 ? p.y0 : p.y0 + p.h);
          const xb = p.x0 + p.w + a + sh * (sh > 0 ? p.y0 + p.h : p.y0);
          if (xa > this.vw || xb < 0) continue;
          ctx.drawImage(p.c, p.x0, p.y0, p.w, p.h);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        const off = this.off(L.k ?? 1);
        for (const p of L.piezas) {
          if (p.si && !this.cond(p.si)) continue;
          const x = p.x0 + off;
          if (x > this.vw || x + p.w < 0) continue;
          ctx.drawImage(p.c, Math.round(x * px), Math.round(p.y0 * px));
        }
      }
      for (const Lw of B.laterales) if (Lw.after === L.id) drawLateral(ctx, S, Lw, this.vw, this.cam, px);
      VIVO[S.id]?.({ ctx, capa: L.id, S, px, t: this.t, off: (k) => this.off(k) });
      this.extra?.(ctx, L.id);
    }
  }
}
