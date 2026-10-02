// The stage maps a fixed logical world (height 1080) onto any phone screen.
// Width varies with the screen's aspect ratio; scenes are painted wider than
// 16:9 so long phones (19.5:9, 20:9) see more scenery instead of black bars.

export const LOGICAL_H = 1080;

export type Quality = 'alta' | 'media' | 'baja';

const QUALITY_SCALE: Record<Quality, number> = { alta: 1, media: 0.75, baja: 0.55 };

export class Stage {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  cssW = 1;
  cssH = 1;
  /** Device pixels per logical unit. */
  px = 1;
  /** Visible logical width. */
  viewW = 1920;
  quality: Quality = 'media';
  private listeners: Array<() => void> = [];

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'scene';
    parent.appendChild(this.canvas);
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;
    const isTouch = matchMedia('(pointer: coarse)').matches;
    this.quality = isTouch ? 'media' : 'alta';
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.resize();
  }

  onResize(fn: () => void) {
    this.listeners.push(fn);
  }

  setQuality(q: Quality) {
    if (q === this.quality) return;
    this.quality = q;
    this.resize(true);
  }

  resize(force = false) {
    const r = this.canvas.parentElement!.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (!force && w === this.cssW && h === this.cssH) return;
    this.cssW = w;
    this.cssH = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const k = QUALITY_SCALE[this.quality];
    // Never render more pixels than a 1080p frame needs.
    const targetH = Math.min(h * dpr * k, LOGICAL_H);
    this.px = targetH / LOGICAL_H;
    this.canvas.width = Math.round((w / h) * targetH);
    this.canvas.height = Math.round(targetH);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.viewW = (w / h) * LOGICAL_H;
    for (const fn of this.listeners) fn();
  }

  /** CSS pixel position (relative to the canvas) to logical screen units. */
  toLogical(cx: number, cy: number): { x: number; y: number } {
    return { x: (cx / this.cssW) * this.viewW, y: (cy / this.cssH) * LOGICAL_H };
  }

  /** Logical screen units to CSS pixels. */
  toCss(x: number, y: number): { x: number; y: number } {
    return { x: (x / this.viewW) * this.cssW, y: (y / LOGICAL_H) * this.cssH };
  }
}

/** Horizontal camera over a scene wider than the view. */
export class Camera {
  x = 0;
  private target = 0;

  constructor(private stage: Stage, public sceneW: number) {}

  /** Offset that centres a scene narrower than the view. */
  get pad(): number {
    return Math.max(0, (this.stage.viewW - this.sceneW) / 2);
  }

  follow(wx: number, snap = false) {
    const vw = this.stage.viewW;
    const max = Math.max(0, this.sceneW - vw);
    this.target = Math.min(max, Math.max(0, wx - vw / 2));
    if (snap) this.x = this.target;
  }

  update(dt: number) {
    const k = 1 - Math.exp(-dt * 4);
    this.x += (this.target - this.x) * k;
  }

  /** Apply world transform: world units -> device pixels. */
  apply(ctx: CanvasRenderingContext2D) {
    const p = this.stage.px;
    ctx.setTransform(p, 0, 0, p, Math.round((this.pad - this.x) * p), 0);
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: sx + this.x - this.pad, y: sy };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: wx - this.x + this.pad, y: wy };
  }
}
