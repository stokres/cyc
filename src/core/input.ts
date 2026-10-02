// Touch-first gestures: tap, long press (examine) and raw drag for minigames.
// Coordinates are reported in CSS pixels relative to the target element.

export interface PointerInfo {
  x: number;
  y: number;
  id: number;
}

export interface GestureHandlers {
  tap?(p: PointerInfo): void;
  longPress?(p: PointerInfo): void;
  /** Long-press progress 0..1 while the finger is held still (for a ring indicator). */
  pressProgress?(p: PointerInfo | null, t: number): void;
  down?(p: PointerInfo): void;
  move?(p: PointerInfo): void;
  up?(p: PointerInfo): void;
}

const TAP_SLOP = 14; // css px a finger may wander and still count as a tap
const LONG_PRESS_MS = 450;
const PRESS_DELAY_MS = 120; // ring appears only after this, so taps stay clean

export class Gestures {
  handlers: GestureHandlers = {};
  private start: { x: number; y: number; t: number; id: number } | null = null;
  private fired = false;
  private raf = 0;

  constructor(private el: HTMLElement) {
    el.addEventListener('pointerdown', (e) => this.onDown(e));
    el.addEventListener('pointermove', (e) => this.onMove(e));
    el.addEventListener('pointerup', (e) => this.onUp(e));
    el.addEventListener('pointercancel', () => this.cancel());
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private pos(e: PointerEvent): PointerInfo {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, id: e.pointerId };
  }

  /** Only touches on the scene itself count; UI buttons handle their own taps. */
  private onScene(e: PointerEvent) {
    const t = e.target as HTMLElement;
    return t === this.el || t.tagName === 'CANVAS' && t.id === 'scene';
  }

  private onDown(e: PointerEvent) {
    if (!this.onScene(e)) return;
    if (e.button > 0) {
      // Right click on desktop = examine.
      if (e.button === 2) this.handlers.longPress?.(this.pos(e));
      return;
    }
    const p = this.pos(e);
    this.el.setPointerCapture?.(e.pointerId);
    this.start = { x: p.x, y: p.y, t: performance.now(), id: e.pointerId };
    this.fired = false;
    this.handlers.down?.(p);
    const tick = () => {
      if (!this.start || this.fired) return;
      const held = performance.now() - this.start.t;
      if (held > PRESS_DELAY_MS) {
        const t = Math.min(1, (held - PRESS_DELAY_MS) / (LONG_PRESS_MS - PRESS_DELAY_MS));
        this.handlers.pressProgress?.({ x: this.start.x, y: this.start.y, id: this.start.id }, t);
      }
      if (held >= LONG_PRESS_MS) {
        this.fired = true;
        this.handlers.pressProgress?.(null, 0);
        this.handlers.longPress?.({ x: this.start.x, y: this.start.y, id: this.start.id });
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(tick);
  }

  private onMove(e: PointerEvent) {
    const p = this.pos(e);
    this.handlers.move?.(p);
    if (this.start && e.pointerId === this.start.id) {
      if (Math.hypot(p.x - this.start.x, p.y - this.start.y) > TAP_SLOP) {
        this.fired = true; // became a drag
        this.handlers.pressProgress?.(null, 0);
      }
    }
  }

  private onUp(e: PointerEvent) {
    if (!this.start && !this.onScene(e)) return;
    const p = this.pos(e);
    this.handlers.up?.(p);
    if (this.start && e.pointerId === this.start.id) {
      if (!this.fired) {
        this.handlers.pressProgress?.(null, 0);
        this.handlers.tap?.(p);
      }
    }
    this.start = null;
    cancelAnimationFrame(this.raf);
  }

  private cancel() {
    this.start = null;
    this.fired = true;
    cancelAnimationFrame(this.raf);
    this.handlers.pressProgress?.(null, 0);
  }
}
