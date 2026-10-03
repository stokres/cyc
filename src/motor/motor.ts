// The stage: what is behind the characters, the SVG where the actors live, and
// what is in front of them. Owns the camera, baking, per-frame drawing and the
// light that falls on the actors.
//
// Two renderers (docs/ESTILO.md, T4):
// - WebGL2 with relief light (gl.ts): the default on any phone that has it.
// - Canvas 2D with the baked light: quality «baja» and phones without WebGL2.
import { depth, drawLateral, hexRGB, hornear, lienzo, tirasLateral, type Escena, type Horneado, type Lateral, type Modo, type RGB, type Zona } from './escena';
import { esquinas, RenderGL } from './gl';
import { VIVO } from './vivo';
import type { Actor } from './actores';

const NS = 'http://www.w3.org/2000/svg';
export const H = 1080;
const FONDO: [number, number, number, number] = [11 / 255, 15 / 255, 30 / 255, 1];

export type Calidad = 'alta' | 'media' | 'baja';
const ESCALA: Record<Calidad, number> = { alta: 1, media: 0.75, baja: 0.55 };

/** Where the strongest light near a point comes from (for relief on the actors). */
export interface LuzPrincipal {
  dx: number;
  dy: number;
  fuerza: number;
}

export class Motor {
  // Canvas 2D path.
  private back2d: HTMLCanvasElement;
  private front2d: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;
  private fctx: CanvasRenderingContext2D;
  // WebGL path: GL canvases plus 2D overlays for the animated light.
  private backGL: HTMLCanvasElement;
  private frontGL: HTMLCanvasElement;
  private vivoB: HTMLCanvasElement;
  private vivoF: HTMLCanvasElement;
  private vbctx: CanvasRenderingContext2D;
  private vfctx: CanvasRenderingContext2D;
  private glB: RenderGL | null = null;
  private glF: RenderGL | null = null;
  readonly svg: SVGSVGElement;
  readonly defs: SVGDefsElement;
  readonly world: SVGGElement;
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
  modo: Modo = '2d';
  /**
   * What the static layers were last drawn with (Canvas 2D). While the camera
   * stands still they are not drawn again: only the live light is, on its own
   * overlay. A point-and-click spends most of its time standing still.
   */
  private pintado = { cam: NaN, vw: 0, px: 0, baked: null as Horneado | null, cond: '' };
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
    const capa = () => {
      const c = lienzo(1, 1);
      c.className = 'capa';
      return c;
    };
    this.back2d = capa();
    this.backGL = capa();
    this.vivoB = capa();
    this.front2d = capa();
    this.frontGL = capa();
    this.vivoF = capa();
    this.svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
    this.svg.setAttribute('class', 'capa actores');
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.defs = document.createElementNS(NS, 'defs') as SVGDefsElement;
    this.world = document.createElementNS(NS, 'g') as SVGGElement;
    this.svg.append(this.defs, this.world);
    root.prepend(this.back2d, this.backGL, this.vivoB, this.svg, this.front2d, this.frontGL, this.vivoF);
    this.bctx = this.back2d.getContext('2d', { alpha: false })!;
    this.fctx = this.front2d.getContext('2d')!;
    this.vbctx = this.vivoB.getContext('2d')!;
    this.vfctx = this.vivoF.getContext('2d')!;
    this.calidad = matchMedia('(pointer: coarse)').matches ? 'media' : 'alta';
    this.elegirModo();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(root);
  }

  /** The canvas behind the characters that is on screen now. */
  get back() {
    return this.modo === 'gl' ? this.backGL : this.back2d;
  }

  get conRelieve() {
    return this.modo === 'gl';
  }

  /** Draw the static layers again on the next frame. */
  invalidar() {
    this.pintado.cam = NaN;
  }

  /** True while the camera is still travelling towards its goal. */
  get camaraMoviendose() {
    return this.cam !== this.camGoal;
  }

  private elegirModo() {
    // The WebGL contexts are only made when relief is first asked for.
    if (this.relieve && !this.glProbado) {
      this.glProbado = true;
      this.glB = RenderGL.crear(this.backGL, true);
      this.glF = this.glB ? RenderGL.crear(this.frontGL, false) : null;
    }
    this.modo = this.glB && this.glF && this.calidad !== 'baja' && this.relieve ? 'gl' : '2d';
    const gl = this.modo === 'gl';
    for (const c of [this.backGL, this.frontGL]) c.hidden = !gl;
    for (const c of [this.back2d, this.front2d]) c.hidden = gl;
    // The live light has its own overlays in both renderers; taps land on the top one (see core/input.ts).
    this.vivoF.id = 'scene';
    this.invalidar();
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
    const W = Math.round(this.vw * px);
    const Hp = Math.round(H * px);
    const visibles = this.modo === 'gl' ? [this.backGL, this.frontGL, this.vivoB, this.vivoF] : [this.back2d, this.front2d, this.vivoB, this.vivoF];
    for (const c of [this.back2d, this.front2d, this.backGL, this.frontGL, this.vivoB, this.vivoF]) {
      const on = visibles.includes(c);
      c.width = on ? W : 1;
      c.height = on ? Hp : 1;
    }
    this.svg.setAttribute('viewBox', `0 0 ${this.vw.toFixed(1)} ${H}`);
    const old = this.px;
    this.px = px;
    // Re-bake when the resolution changes a lot (rotation, quality change).
    if (this.S && Math.abs(px - old) / old > 0.2) {
      this.vaciar();
      void this.cargar(this.S);
    }
    this.clampCam(true);
    this.invalidar();
    this.onResize?.();
  }

  /**
   * Relief light (WebGL2). Postponed: off by default, `?relieve` in the URL turns
   * it on to try it. Off = the Canvas 2D renderer at the same resolution.
   */
  relieve = false;
  private glProbado = false;

  setRelieve(on: boolean) {
    if (on === this.relieve) return;
    this.relieve = on;
    this.vaciar();
    this.elegirModo();
    this.px = 0.0001;
    this.resize();
  }

  setCalidad(q: Calidad) {
    if (q === this.calidad) return;
    this.calidad = q;
    this.vaciar();
    this.elegirModo();
    this.px = 0.0001;
    this.resize();
  }

  /** Drop every baked scene (and its GPU textures). */
  private vaciar() {
    for (const b of this.cache.values()) {
      for (const L of b.capas) for (const p of L.piezas) if (p.tex) (L.z === 'front' ? this.glF : this.glB)?.liberar(p.tex);
      for (const Lw of b.laterales) if (Lw.tex) this.glB?.liberar(Lw.tex);
    }
    this.cache.clear();
  }

  // ------------------------------------------------------------ scenes

  private clave(S: Escena) {
    return `${S.id}@${this.px.toFixed(3)}@${this.modo}`;
  }

  /** Scenes being baked right now (scripts/rendimiento.mjs waits for none before measuring). */
  horneando = 0;

  private async hornearYSubir(S: Escena, onProgress?: (p: number) => void) {
    this.horneando++;
    const b = await hornear(S, this.px, onProgress, this.modo).finally(() => this.horneando--);
    if (b.modo === 'gl') {
      for (const L of b.capas) for (const p of L.piezas) (L.z === 'front' ? this.glF : this.glB)!.subir(p);
      for (const Lw of b.laterales) this.glB!.subir(Lw);
    }
    return b;
  }

  async cargar(S: Escena, onProgress?: (p: number) => void) {
    const key = this.clave(S);
    let b = this.cache.get(key);
    if (!b) {
      b = await this.hornearYSubir(S, onProgress);
      this.cache.set(key, b);
    }
    this.S = S;
    this.baked = b;
    this.lights = S.lights.map((l) => ({ X: l.X, y: l.y, r: l.r, power: l.power, c: hexRGB(l.color) }));
    this.amb = hexRGB(S.ambient);
    if (this.glB) {
      const k = S.clave ?? [0.45, -0.75, 0.5];
      this.glB.clave = k;
      this.glF!.clave = k;
    }
  }

  /** Bake a scene ahead of time so the door to it opens instantly. */
  async precargar(S: Escena) {
    const key = this.clave(S);
    if (!this.cache.has(key)) this.cache.set(key, await this.hornearYSubir(S));
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

  /** Direction the light mostly comes from at a point (lamps weighted by reach, plus the key light). */
  luzPrincipal(X: number, y: number): LuzPrincipal {
    const k = this.S?.clave ?? [0.45, -0.75, 0.5];
    let dx = k[0] * 0.3;
    let dy = k[1] * 0.3;
    let fuerza = 0;
    for (const l of this.lights) {
      const ex = (l.X - X) / l.r;
      const ey = (l.y - y) / l.r;
      const d2 = ex * ex + ey * ey;
      if (d2 >= 1) continue;
      const w = (1 - d2) * (1 - d2) * l.power * (l.c[0] * 0.3 + l.c[1] * 0.59 + l.c[2] * 0.11);
      const n = Math.hypot(ex, ey) || 1;
      dx += (ex / n) * w;
      dy += (ey / n) * w;
      fuerza += w;
    }
    return { dx, dy, fuerza };
  }

  // ------------------------------------------------------------ frame

  update(dt: number) {
    this.t += dt;
    this.clampCam();
    this.cam += (this.camGoal - this.cam) * (1 - Math.exp(-dt * 3));
    // Settle instead of creeping by fractions of a pixel forever (that would redraw every frame).
    if (Math.abs(this.camGoal - this.cam) * this.px < 0.25) this.cam = this.camGoal;
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
      a.setRelieve(this.conRelieve ? this.luzPrincipal(a.X, a.y - 250) : null);
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
    if (this.modo === 'gl') return this.dibujarGL();
    // Live light (fire, signs, the odd car...) every frame, on the overlays,
    // from a clean state: a clip or a save left over by a frame must not stick.
    for (const c of [this.vbctx, this.vfctx]) {
      if (c.reset) c.reset();
      else {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, this.vivoB.width, this.vivoB.height);
      }
    }
    if (S && B && B.modo === '2d') for (const L of B.capas) if (!this.ocultas.has(L.id)) this.vivo(L.z === 'front' ? this.vfctx : this.vbctx, L.id);
    // The baked layers only when something they depend on has changed.
    const cond = B ? this.condiciones(B) : '';
    const P = this.pintado;
    if (B && B === P.baked && P.vw === this.vw && P.px === B.px && P.cond === cond && Math.abs(this.cam - P.cam) * B.px < 0.15) return;
    Object.assign(P, { cam: this.cam, vw: this.vw, px: B?.px ?? 0, baked: B, cond });
    const b = this.bctx;
    const f = this.fctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.fillStyle = '#0b0f1e';
    b.fillRect(0, 0, this.back2d.width, this.back2d.height);
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.clearRect(0, 0, this.front2d.width, this.front2d.height);
    if (!S || !B || B.modo !== '2d') return;
    const px = B.px;
    for (const L of B.capas) {
      if (this.ocultas.has(L.id)) continue;
      const ctx = L.z === 'front' ? f : b;
      if (L.floor) {
        // x_screen = u + a + sh*y: one shear makes every row move at its own depth.
        const [sh, a] = this.cizalla();
        ctx.setTransform(px, 0, px * sh, px, px * a, 0);
        for (const p of L.piezas) {
          if (!this.pisoVisible(p, sh, a)) continue;
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
    }
  }

  /** Which pieces with a flag condition are showing (a change means redrawing). */
  private condiciones(B: Horneado) {
    let k = '';
    for (const L of B.capas) for (const p of L.piezas) if (p.si) k += this.cond(p.si) ? '1' : '0';
    return k;
  }

  private cizalla(): [number, number] {
    const S = this.S!;
    const sh = (S.CX - this.cam) / (S.BASE - S.HOR);
    return [sh, this.vw / 2 - S.CX - S.HOR * sh];
  }

  private pisoVisible(p: { x0: number; y0: number; w: number; h: number }, sh: number, a: number) {
    const xa = p.x0 + a + sh * (sh > 0 ? p.y0 : p.y0 + p.h);
    const xb = p.x0 + p.w + a + sh * (sh > 0 ? p.y0 + p.h : p.y0);
    return !(xa > this.vw || xb < 0);
  }

  private vivo(ctx: CanvasRenderingContext2D, capa: string) {
    const S = this.S!;
    VIVO[S.id]?.({ ctx, capa, S, px: this.px, t: this.t, off: (k) => this.off(k) });
    this.extra?.(ctx, capa);
  }

  private dibujarGL() {
    const S = this.S;
    const B = this.baked;
    const gB = this.glB!;
    const gF = this.glF!;
    const W = this.backGL.width;
    const Hp = this.backGL.height;
    gB.empezar(W, Hp, FONDO);
    gF.empezar(W, Hp, [0, 0, 0, 0]);
    for (const c of [this.vbctx, this.vfctx]) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, W, Hp);
    }
    if (!S || !B || B.modo !== 'gl') return;
    const px = B.px;
    for (const L of B.capas) {
      if (this.ocultas.has(L.id)) continue;
      const front = L.z === 'front';
      const g = front ? gF : gB;
      if (L.floor) {
        const [sh, a] = this.cizalla();
        const m: [number, number, number, number, number, number] = [px, 0, px * sh, px, px * a, 0];
        for (const p of L.piezas) {
          if (!p.tex || !this.pisoVisible(p, sh, a)) continue;
          g.dibujar(p.tex, { esquinas: esquinas(m, p.x0, p.y0, p.x0 + p.w, p.y0 + p.h), capa: [p.x0, p.y0, p.x0 + p.w, p.y0 + p.h] }, p.luces);
        }
      } else {
        const off = this.off(L.k ?? 1);
        for (const p of L.piezas) {
          if (!p.tex || (p.si && !this.cond(p.si))) continue;
          const x = p.x0 + off;
          if (x > this.vw || x + p.w < 0) continue;
          const X0 = Math.round(x * px);
          const Y0 = Math.round(p.y0 * px);
          const m: [number, number, number, number, number, number] = [1, 0, 0, 1, X0, Y0];
          g.dibujar(p.tex, { esquinas: esquinas(m, 0, 0, p.tex.w, p.tex.h), capa: [p.x0, p.y0, p.x0 + p.w, p.y0 + p.h] }, p.luces);
        }
      }
      for (const Lw of B.laterales) {
        if (Lw.after !== L.id || !Lw.tex) continue;
        const { w: tw, h: th } = Lw.tex;
        for (const t of tirasLateral(S, Lw as unknown as Lateral, tw, th, this.vw, this.cam, px)) {
          g.dibujar(Lw.tex, { esquinas: esquinas(t.m, t.s0, 0, t.s0 + t.sw, th), uv: [t.s0 / tw, 0, (t.s0 + t.sw) / tw, 1], capa: [0, 0, 1, 1] }, [], gB.relieve * 0.8);
        }
      }
      this.vivo(front ? this.vfctx : this.vbctx, L.id);
    }
  }
}
