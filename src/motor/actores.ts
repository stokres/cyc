// Everything that lives on the floor among the characters: protagonists (rigged
// SVG with an outfit), Aceituna, and props such as the dog bed or terrace
// tables. They sit in one SVG between the back and front canvases, are sorted
// by depth and tinted by the scene light (rule L3).
import { Rig } from '../arte/personajes/rig-runtime.mjs';
import { Perro, body as perroBody } from '../arte/personajes/aceituna.mjs';
import type { RGB } from './escena';

const NS = 'http://www.w3.org/2000/svg';

function el(tag: string, attrs: Record<string, string | number> = {}, parent?: Element) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.appendChild(e);
  return e;
}

/** A character module from src/arte/personajes (Fran, Pablo, Chuchi, Guille). */
export interface ArteDePersonaje {
  body(face?: object, outfit?: string): string;
  head(o?: { mood?: string; mouthKind?: string; blink?: boolean }): string;
  JOINTS: Record<string, [number, number]>;
  INFO: { name: string; defaultMood?: string; traits?: string };
}

let uid = 0;

export class Actor {
  readonly wrap: SVGGElement;
  readonly flip: SVGGElement;
  readonly inner: SVGGElement;
  private shadowEl: SVGEllipseElement;
  private cm: SVGElement;
  private tint: RGB = [1, 1, 1];
  X = 0;
  y = 900;
  /** 1 facing right, -1 facing left. */
  face = 1;
  /** Extra depth bias for sorting (props sit slightly behind whoever stands on them). */
  z = 0;
  visible = true;
  /** Rotation and lift, for lying down or popping up from behind furniture. */
  rot = 0;
  lift = 0;
  /** Override placement in a layer's own space (asleep on the sofa). */
  enCapa: { u: number; k: number; y: number } | null = null;
  shadowOn = true;
  speed = 250;
  private target: { X: number; y: number; done: () => void } | null = null;

  constructor(world: SVGGElement, defs: SVGDefsElement, readonly id: string, art: string, shadow: [number, number] = [44, 9]) {
    const n = ++uid;
    this.wrap = el('g', {}, world) as SVGGElement;
    this.shadowEl = el('ellipse', { cx: 0, cy: 0, rx: shadow[0], ry: shadow[1], fill: '#120c10', opacity: shadow[0] ? 0.32 : 0 }, this.wrap) as SVGEllipseElement;
    const f = el('filter', { id: `luz-${n}`, 'color-interpolation-filters': 'sRGB', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
    this.cm = el('feColorMatrix', { type: 'matrix', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0' }, f);
    this.flip = el('g', {}, this.wrap) as SVGGElement;
    this.inner = el('g', { filter: `url(#luz-${n})` }, this.flip) as SVGGElement;
    this.inner.innerHTML = art;
  }

  get moving() {
    return !!this.target;
  }

  setTint(t: RGB) {
    if (Math.abs(t[0] - this.tint[0]) + Math.abs(t[1] - this.tint[1]) + Math.abs(t[2] - this.tint[2]) < 0.01) return;
    this.tint = t;
    this.cm.setAttribute('values', `${t[0].toFixed(3)} 0 0 0 0 0 ${t[1].toFixed(3)} 0 0 0 0 0 ${t[2].toFixed(3)} 0 0 0 0 0 1 0`);
  }

  lookAt(X: number) {
    if (Math.abs(X - this.X) > 4) this.face = X > this.X ? 1 : -1;
  }

  /** Walk to a floor point; resolves on arrival (or when interrupted by a new walk). */
  walkTo(X: number, y: number): Promise<void> {
    this.target?.done();
    return new Promise((done) => (this.target = { X, y, done }));
  }

  stop() {
    this.target?.done();
    this.target = null;
  }

  /** Moves towards the target; returns true while walking. */
  step(dt: number) {
    const t = this.target;
    if (!t) return false;
    const dx = t.X - this.X;
    const dy = t.y - this.y;
    const dist = Math.hypot(dx, dy * 2);
    if (dist < 6) {
      this.X = t.X;
      this.y = t.y;
      this.target = null;
      t.done();
      return false;
    }
    const k = Math.min(1, (this.speed * dt) / dist);
    this.X += dx * k;
    this.y += dy * k * 0.6;
    if (Math.abs(dx) > 2) this.face = dx > 0 ? 1 : -1;
    return true;
  }

  place(sx: number, y: number, s: number) {
    this.wrap.style.display = this.visible ? '' : 'none';
    if (!this.visible) return;
    this.wrap.setAttribute('transform', `translate(${sx.toFixed(1)} ${(y - this.lift * s).toFixed(1)}) scale(${s.toFixed(3)})`);
    this.flip.setAttribute('transform', `scale(${this.face} 1)${this.rot ? ` rotate(${this.rot})` : ''}`);
    this.shadowEl.style.display = this.shadowOn && !this.rot ? '' : 'none';
  }

  update(_t: number, _dt: number) {}
}

/** A protagonist: rigged body, outfit, moods and lip sync. */
export class Personaje extends Actor {
  private rig: InstanceType<typeof Rig>;
  private outfit: string | undefined;

  constructor(world: SVGGElement, defs: SVGDefsElement, id: string, readonly arte: ArteDePersonaje, outfit?: string, seed = 0) {
    super(world, defs, id, arte.body({}, outfit), [44, 9]);
    this.outfit = outfit;
    this.rig = new Rig(this.inner.querySelector('#personaje'), arte, { seed });
  }

  get name() {
    return this.arte.INFO.name;
  }

  get ropa() {
    return this.outfit;
  }

  /** Change clothes: same rig, new pieces. */
  vestir(outfit: string) {
    if (outfit === this.outfit) return;
    const { mood, talking } = this.rig;
    this.outfit = outfit;
    this.inner.innerHTML = this.arte.body({}, outfit);
    this.rig = new Rig(this.inner.querySelector('#personaje'), this.arte, { seed: this.rig.seed });
    Object.assign(this.rig, { mood, talking });
  }

  set mood(m: string) {
    this.rig.mood = m;
  }
  get mood() {
    return this.rig.mood;
  }
  set talking(v: boolean) {
    this.rig.talking = v;
  }
  set eyesClosed(v: boolean) {
    (this.rig as unknown as { eyesClosed: boolean }).eyesClosed = v;
  }

  update(t: number, dt: number) {
    this.rig.mode = this.moving ? 'walk' : 'idle';
    this.rig.update(t, dt);
  }
}

/** Aceituna. Modes: 'lie' (curled up), 'idle', 'walk'. */
export class Perrita extends Actor {
  readonly rig: InstanceType<typeof Perro>;

  constructor(world: SVGGElement, defs: SVGDefsElement) {
    super(world, defs, 'aceituna', perroBody(), [44, 7]);
    this.rig = new Perro(this.inner.querySelector('#perro'));
    this.speed = 300;
  }

  update(t: number, dt: number) {
    if (this.rig.mode !== 'lie') this.rig.mode = this.moving ? 'walk' : 'idle';
    this.rig.update(t, dt);
  }
}

/** Something on the floor: a bed, a table, keys. */
export class Objeto extends Actor {
  constructor(world: SVGGElement, defs: SVGDefsElement, id: string, svg: string, readonly si?: string, shadow?: [number, number]) {
    super(world, defs, id, svg, shadow ?? [0, 0]);
  }
}
