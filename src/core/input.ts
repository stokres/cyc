// Touch-first gestures: one tap (however long the finger stays down, as long as it stays
// put) and raw down/move/up for the minigames that drag.
// Coordinates are reported in CSS pixels relative to the target element.

export interface PointerInfo {
  x: number;
  y: number;
  id: number;
}

export interface GestureHandlers {
  tap?(p: PointerInfo): void;
  down?(p: PointerInfo): void;
  move?(p: PointerInfo): void;
  up?(p: PointerInfo): void;
}

const TAP_SLOP = 14; // css px a finger may wander and still count as a tap

export class Gestures {
  handlers: GestureHandlers = {};
  private start: { x: number; y: number; id: number } | null = null;
  private moved = false; // the finger wandered too far: it is a drag, not a tap

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
    if (e.button > 0) return; // right click and the like do nothing: there is only the tap
    const p = this.pos(e);
    this.el.setPointerCapture?.(e.pointerId);
    this.start = { x: p.x, y: p.y, id: e.pointerId };
    this.moved = false;
    this.handlers.down?.(p);
  }

  private onMove(e: PointerEvent) {
    const p = this.pos(e);
    this.handlers.move?.(p);
    if (this.start && e.pointerId === this.start.id) {
      if (Math.hypot(p.x - this.start.x, p.y - this.start.y) > TAP_SLOP) this.moved = true;
    }
  }

  private onUp(e: PointerEvent) {
    if (!this.start && !this.onScene(e)) return;
    const p = this.pos(e);
    this.handlers.up?.(p);
    // Fires on release, so a finger held still for a while is a tap like any other.
    if (this.start && e.pointerId === this.start.id && !this.moved) this.handlers.tap?.(p);
    this.start = null;
  }

  private cancel() {
    this.start = null;
    this.moved = true;
  }
}
