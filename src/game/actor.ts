// A crew member in the world: movement, procedural animation and lit drawing.
import { RGB, css, hex, mul } from '../core/color';
import { Spring, clamp } from '../core/util';
import { CAST, CastDef, CrewId, Mood } from '../art/cast';
import { LightRig } from '../art/lighting';
import { FaceState, Joints, Pose, REST_POSE, drawCharacter, skeleton } from '../art/rig';

export type Action = 'idle' | 'walk' | 'reach' | 'wipe' | 'carry' | 'toast';

const WALK_SPEED = 300; // world units per second at depth scale 1
const MOUTH_FROM_CHAR: Record<string, number> = { a: 1, á: 1, o: 2, ó: 2, u: 2, ú: 2, e: 3, é: 3, i: 3, í: 3 };

export class Actor {
  readonly def: CastDef;
  x: number;
  y: number;
  facing = 1;
  private turn: Spring;
  private target: { x: number; y: number } | null = null;
  private arrive: (() => void) | null = null;
  action: Action = 'idle';
  actionT = 0;
  walkPhase = 0;
  t = Math.random() * 10;
  mood: Mood;
  moodTimer = 0;
  talking = false;
  /** True while the dialogue box is still typing this actor's line. */
  lipSync = false;
  /** Text being spoken, for lip sync. */
  speech = '';
  speechT = 0;
  private blinkT = 1 + Math.random() * 3;
  private blink = 0;
  private sway = new Spring(0, 40, 5);
  private lastX = 0;
  lookAt: number | null = null;
  hold: 'beer' | 'paper' | null = null;
  /** Extra pose override, e.g. the tray carry in the minigame. */
  carryTilt = 0;
  private paintCache = new Map<string, string>();

  constructor(id: CrewId, x: number, y: number) {
    this.def = CAST[id];
    this.x = x;
    this.y = y;
    this.lastX = x;
    this.mood = this.def.mood;
    this.turn = new Spring(1, 140, 18);
  }

  get id(): CrewId {
    return this.def.id;
  }

  /** Depth scale: further up the sidewalk = smaller. */
  get depth(): number {
    return 0.86 + clamp((this.y - 790) / 180, 0, 1) * 0.16;
  }

  get scale(): number {
    return this.depth * this.def.scale * 0.92;
  }

  get height(): number {
    const b = this.def.build;
    return (b.thigh + b.shin + b.torso + this.def.head.ry * 1.9) * this.scale;
  }

  walkTo(x: number, y: number): Promise<void> {
    if (this.arrive) this.arrive();
    this.target = { x, y };
    this.action = 'walk';
    return new Promise((res) => {
      this.arrive = res;
    });
  }

  stop() {
    this.target = null;
    if (this.action === 'walk') this.action = 'idle';
    const a = this.arrive;
    this.arrive = null;
    a?.();
  }

  face(x: number) {
    if (Math.abs(x - this.x) > 4) this.facing = x > this.x ? 1 : -1;
  }

  say(text: string) {
    this.speech = text;
    this.speechT = 0;
    this.talking = true;
  }

  quiet() {
    this.talking = false;
    this.speech = '';
  }

  setMood(m: Mood, seconds = 2.5) {
    this.mood = m;
    this.moodTimer = seconds;
  }

  async act(a: Action, seconds: number) {
    this.action = a;
    this.actionT = 0;
    await new Promise((r) => setTimeout(r, seconds * 1000));
    if (this.action === a) this.action = 'idle';
  }

  update(dt: number) {
    this.t += dt;
    this.actionT += dt;
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const step = WALK_SPEED * this.depth * dt;
      if (dist <= step) {
        this.x = this.target.x;
        this.y = this.target.y;
        this.stop();
      } else {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
        this.walkPhase += (step / (62 * this.scale)) * 1.0;
      }
    } else if (this.action !== 'carry') {
      // Ease the legs back to rest.
      this.walkPhase += (Math.round(this.walkPhase / Math.PI) * Math.PI - this.walkPhase) * Math.min(1, dt * 10);
    }
    this.turn.step(this.facing, dt);
    // Blink.
    this.blinkT -= dt;
    if (this.blinkT < 0) {
      this.blink = 1;
      this.blinkT = 2.4 + Math.random() * 3.2;
    }
    this.blink = Math.max(0, this.blink - dt * 8);
    // Secondary motion reacts to horizontal speed.
    const vx = (this.x - this.lastX) / Math.max(dt, 1e-3);
    this.lastX = this.x;
    this.sway.step(clamp(-vx / 400, -1, 1) + Math.sin(this.t * 1.7) * 0.08, dt);
    if (this.talking) this.speechT += dt;
    if (this.moodTimer > 0) {
      this.moodTimer -= dt;
      if (this.moodTimer <= 0) this.mood = this.def.mood;
    }
  }

  pose(): Pose {
    const p: Pose = { ...REST_POSE };
    const t = this.t;
    const walking = this.action === 'walk' || this.action === 'carry';
    p.breathe = Math.sin(t * 1.7) * 0.012;
    p.headY = Math.sin(t * 1.7 + 0.6) * 1.5;
    if (walking) {
      const ph = this.walkPhase;
      const s = Math.sin(ph);
      const c = Math.cos(ph);
      p.thighF = 0.44 * s;
      p.thighB = -0.44 * s;
      p.shinF = 0.08 + 0.8 * Math.max(0, -c);
      p.shinB = 0.08 + 0.8 * Math.max(0, c);
      p.bob = -6 * Math.abs(Math.cos(ph)) + 3;
      p.lean = 0.05;
      p.armF = -0.38 * s + 0.05;
      p.armB = 0.38 * s;
      p.foreF = 0.3 + 0.2 * Math.max(0, -s);
      p.foreB = 0.3 + 0.2 * Math.max(0, s);
      p.headTilt = Math.sin(ph * 2) * 0.015;
    } else {
      p.hipX = Math.sin(t * 0.6) * 2;
      p.armF = 0.08 + Math.sin(t * 0.9) * 0.03;
      p.armB = -0.06 + Math.sin(t * 0.9 + 1) * 0.03;
    }
    if (this.talking && !walking) {
      // Talk with the hands now and then.
      const g = Math.sin(this.speechT * 2.2);
      p.armF = -0.25 + 0.2 * g;
      p.foreF = 1.5 + 0.25 * Math.sin(this.speechT * 5.3);
      p.headTilt = Math.sin(this.speechT * 3.1) * 0.04;
    }
    switch (this.action) {
      case 'reach':
        p.armF = 1.25;
        p.foreF = 0.2;
        p.lean = 0.08;
        break;
      case 'wipe':
        p.armF = 0.85 + Math.sin(this.actionT * 14) * 0.28;
        p.foreF = 0.35;
        p.lean = 0.16;
        break;
      case 'carry':
        p.armF = 2.0 + this.carryTilt * 0.3;
        p.foreF = 1.45;
        p.armB = 0.25;
        p.foreB = 0.5;
        p.lean = -0.03;
        break;
      case 'toast':
        p.armF = 2.55 + Math.sin(this.actionT * 3) * 0.08;
        p.foreF = 0.45;
        p.headTilt = -0.08;
        break;
    }
    return p;
  }

  face_(): FaceState {
    let viseme = 0;
    if (this.talking && this.lipSync) {
      const i = Math.floor(this.speechT * 13);
      const ch = this.speech.charAt(i % Math.max(1, this.speech.length)).toLowerCase();
      viseme = MOUTH_FROM_CHAR[ch] ?? (ch === ' ' || ch === '.' || ch === ',' ? 0 : (i % 3) + 1);
    }
    let look = 0.3;
    if (this.lookAt !== null) look = clamp(((this.lookAt - this.x) * this.facing) / 300, -1, 1);
    return { mood: this.mood, blink: this.blink, viseme, look, sway: this.sway.x };
  }

  joints(): Joints {
    return skeleton(this.def, this.pose());
  }

  /** Front hand position in world space. */
  handWorld(): { x: number; y: number } {
    const j = this.joints();
    const s = this.scale;
    return { x: this.x + j.handF[0] * s * this.turn.x, y: this.y + j.handF[1] * s };
  }

  headWorld(): { x: number; y: number } {
    const j = this.joints();
    const s = this.scale;
    return { x: this.x + j.head[0] * s * this.turn.x, y: this.y + (j.head[1] - this.def.head.ry) * s };
  }

  draw(ctx: CanvasRenderingContext2D, rig: LightRig) {
    const s = this.scale;
    const tint: RGB = rig.tintFor(this.x, this.y - this.height * 0.5);
    this.paintCache.clear();
    const paint = (h: string) => {
      let v = this.paintCache.get(h);
      if (!v) {
        v = css(mul(hex(h), tint));
        this.paintCache.set(h, v);
      }
      return v;
    };
    const pose = this.pose();
    const face = this.face_();

    // Contact shadow (characters never look pasted on).
    ctx.save();
    ctx.fillStyle = 'rgba(12,10,20,0.42)';
    ctx.beginPath();
    ctx.ellipse(this.x + 4, this.y + 2, 62 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    const flip = Math.abs(this.turn.x) < 0.08 ? 0.08 * Math.sign(this.turn.x || 1) : this.turn.x;
    ctx.scale(s * flip, s);

    // Rim light from the strongest nearby practical light.
    const strong = rig.strongest(this.x, this.y - this.height * 0.6);
    if (strong) {
      // Only a thin sliver on the side facing the light, never a sticker outline.
      const side = Math.sign(strong.l.x - this.x) || 1;
      const k = Math.min(1, strong.f * 1.4);
      const c = strong.l.color;
      const rim: RGB = [c[0] * (0.45 + 0.5 * k), c[1] * (0.4 + 0.45 * k), c[2] * (0.35 + 0.4 * k)];
      ctx.save();
      ctx.translate((side * 3.5) / flip, -1.5);
      drawCharacter(ctx, this.def, pose, face, { paint, flat: css(rim), hold: this.hold });
      ctx.restore();
    }
    drawCharacter(ctx, this.def, pose, face, { paint, hold: this.hold });
    ctx.restore();
  }

  /** Rough hit box in world space, for tapping a friend. */
  hit(x: number, y: number): boolean {
    // Head and shoulders only, so a friend standing in front of a door
    // doesn't steal taps meant for it.
    const h = this.height;
    return Math.abs(x - this.x) < 75 * this.scale && y < this.y - h * 0.5 && y > this.y - h - 20;
  }
}
