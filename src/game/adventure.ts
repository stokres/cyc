// The point-and-click layer: touch input, scripting API, camera and frame render.
import { Camera, Quality, Stage } from '../core/stage';
import { Gestures, PointerInfo } from '../core/input';
import { Sound } from '../core/audio';
import { clamp, wait } from '../core/util';
import { CAST, CREW_ORDER, CrewId, Mood } from '../art/cast';
import { Baked, bakeUsera, buildUseraLights, CURB_Y, drawUseraLive, LiveState, SCENE_W, updateUseraLights } from '../art/usera';
import { LightRig } from '../art/lighting';
import { Drizzle, makeGrain, Particles } from '../art/fx';
import { drawTerraceTable } from '../art/props';
import { ITEMS } from '../art/items';
import { Hud } from '../ui/hud';
import { Actor } from './actor';
import { freshState, ItemId, saveState, SaveState } from './state';

export interface Hotspot {
  id: string;
  name: string;
  /** Tap area in world units: x, y, w, h. */
  rect: [number, number, number, number];
  /** Where the active character stands to interact. */
  stand: [number, number];
  enabled?(): boolean;
  look(g: Adventure): Promise<void>;
  use(g: Adventure): Promise<void>;
  useItem?(g: Adventure, item: ItemId): Promise<boolean>;
}

export interface Chapter {
  hotspots(g: Adventure): Hotspot[];
  intro(g: Adventure): Promise<void>;
  objective(g: Adventure): string | null;
  hint(g: Adventure): string;
  banter(g: Adventure, other: CrewId): Promise<void>;
  lookFriend(g: Adventure, other: CrewId): Promise<void>;
  giveItem(g: Adventure, other: CrewId, item: ItemId): Promise<void>;
}

export interface Minigame {
  update(dt: number): void;
  /** World-space drawing between the characters and the front layer. */
  drawWorld(ctx: CanvasRenderingContext2D): void;
  /** Which actor the camera follows. */
  focus(): Actor;
  down?(p: PointerInfo): void;
  move?(p: PointerInfo): void;
  up?(p: PointerInfo): void;
}

export const WALK = { x0: 90, x1: 2330, y0: 800, y1: 968 };
export const TABLE = { x: 2060, y: 912 };

export class Adventure {
  readonly stage: Stage;
  readonly cam: Camera;
  readonly rig: LightRig;
  readonly hud: Hud;
  readonly sound = new Sound();
  readonly actors: Record<CrewId, Actor>;
  readonly particles = new Particles();
  state: SaveState;
  chapter!: Chapter;
  hotspots: Hotspot[] = [];
  private baked: Baked | null = null;
  private drizzle: Drizzle;
  private grain: HTMLCanvasElement;
  private grainPattern: CanvasPattern | null = null;
  private live: LiveState = { neon: 1, car: -1 };
  private neonT = 3;
  private carT = 8;
  private revealT = 0;
  private busy = false;
  minigame: Minigame | null = null;
  /** Beers on the terrace table (levels 0..1). */
  tableBeers: number[] = [];
  autoQuality = true;
  showFps = false;
  private frameTimes: number[] = [];
  private slowFor = 0;
  paused = false;
  private last = 0;
  private bakeTimer = 0;

  constructor(readonly root: HTMLElement, state: SaveState | null) {
    this.stage = new Stage(root);
    this.cam = new Camera(this.stage, SCENE_W);
    this.rig = buildUseraLights();
    this.state = state ?? freshState();
    this.actors = {} as Record<CrewId, Actor>;
    for (const id of CREW_ORDER) {
      const [x, y] = this.state.pos[id];
      this.actors[id] = new Actor(id, x, y);
    }
    this.drizzle = new Drizzle(SCENE_W, this.stage.quality === 'baja' ? 40 : 90);
    this.grain = makeGrain();
    this.hud = new Hud(root, {
      switchTo: (id) => this.switchTo(id),
      reveal: () => this.reveal(),
      hint: () => void this.showHint(),
      menu: () => this.onMenu?.(),
      selectItem: () => this.sound.tap(),
      lookItem: (id) => void this.run(() => this.say(this.active.id, ITEMS[id].look)),
    });
    const g = new Gestures(root);
    g.handlers = {
      tap: (p) => this.onTap(p),
      longPress: (p) => this.onLongPress(p),
      pressProgress: (p, t) => {
        if (!this.minigame && !this.hud.inDialogue && !this.busy) this.hud.pressRing(p ? p.x : null, p ? p.y : 0, t);
        else this.hud.pressRing(null, 0, 0);
      },
      down: (p) => this.minigame?.down?.(p),
      move: (p) => this.minigame?.move?.(p),
      up: (p) => this.minigame?.up?.(p),
    };
    this.stage.onResize(() => this.scheduleBake());
    this.cam.follow(this.active.x, true);
  }

  onMenu: (() => void) | null = null;
  onEnd: (() => void) | null = null;

  get active(): Actor {
    return this.actors[this.state.active];
  }

  get isBusy() {
    return this.busy;
  }

  // ------------------------------------------------------------ setup

  bake() {
    this.baked = bakeUsera(this.stage.px, this.rig);
    this.grainPattern = this.stage.ctx.createPattern(this.grain, 'repeat');
  }

  private scheduleBake() {
    clearTimeout(this.bakeTimer);
    this.bakeTimer = window.setTimeout(() => this.bake(), 120);
  }

  setChapter(c: Chapter) {
    this.chapter = c;
    this.hotspots = c.hotspots(this);
    this.refreshHud();
  }

  refreshHud() {
    this.hud.setActive(this.state.active);
    this.hud.setInventory(this.state.inv[this.state.active]);
    this.hud.objective(this.chapter?.objective(this) ?? null);
  }

  setQuality(q: Quality | 'auto') {
    this.autoQuality = q === 'auto';
    if (q !== 'auto') this.stage.setQuality(q);
    this.drizzle.setCount(this.stage.quality === 'baja' ? 40 : 90);
  }

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000));
      this.last = now;
      if (!this.paused) {
        this.update(dt);
        this.render();
      }
      this.measure(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ scripting API

  /** Run a script; blocks input until done and saves afterwards. */
  async run(fn: () => Promise<void>) {
    if (this.busy) return;
    this.busy = true;
    this.hud.toggleTray(false);
    try {
      await fn();
    } finally {
      this.busy = false;
      for (const a of Object.values(this.actors)) a.quiet();
      this.refreshHud();
      this.save();
    }
  }

  async say(who: CrewId | null, text: string, mood?: Mood) {
    const a = who ? this.actors[who] : null;
    if (a) {
      a.say(text);
      if (mood) a.setMood(mood, 4);
      // Others look at the speaker.
      for (const o of Object.values(this.actors)) if (o !== a) o.lookAt = a.x;
    }
    await this.hud.say(who, text, mood ?? a?.mood);
    a?.quiet();
    for (const o of Object.values(this.actors)) o.lookAt = null;
  }

  async walk(who: CrewId, x: number, y: number) {
    const a = this.actors[who];
    await a.walkTo(clamp(x, WALK.x0, WALK.x1), clamp(y, WALK.y0, WALK.y1));
  }

  flag(name: string): boolean {
    return !!this.state.flags[name];
  }

  set(name: string, v: boolean | number = true) {
    this.state.flags[name] = v;
  }

  has(who: CrewId, item: ItemId) {
    return this.state.inv[who].includes(item);
  }

  give(who: CrewId, item: ItemId) {
    if (!this.has(who, item)) this.state.inv[who].push(item);
    if (who === this.state.active) {
      this.hud.setInventory(this.state.inv[who]);
      this.hud.toast(`${CAST[who].name} tiene: ${ITEMS[item].name}`, item);
      this.sound.pickup();
    }
  }

  take(who: CrewId, item: ItemId) {
    this.state.inv[who] = this.state.inv[who].filter((i) => i !== item);
    if (who === this.state.active) this.hud.setInventory(this.state.inv[who]);
  }

  save() {
    for (const id of CREW_ORDER) this.state.pos[id] = [Math.round(this.actors[id].x), Math.round(this.actors[id].y)];
    saveState(this.state);
  }

  switchTo(id: CrewId) {
    if (this.busy || this.minigame || id === this.state.active) return;
    this.sound.tap();
    this.hud.select(null);
    this.state.active = id;
    this.refreshHud();
    const a = this.actors[id];
    a.setMood('happy', 1.2);
    this.hud.label(CAST[id].name, ...this.screenOf(a.headWorld().x, a.headWorld().y - 20));
  }

  reveal() {
    this.revealT = 2.6;
    this.sound.tap();
  }

  async showHint() {
    await this.run(() => this.say(null, this.chapter.hint(this)));
  }

  /** CSS pixel position of a world point. */
  screenOf(wx: number, wy: number): [number, number] {
    const s = this.cam.worldToScreen(wx, wy);
    const c = this.stage.toCss(s.x, s.y);
    return [c.x, c.y];
  }

  // ------------------------------------------------------------ input

  private worldOf(p: PointerInfo) {
    const l = this.stage.toLogical(p.x, p.y);
    return this.cam.screenToWorld(l.x, l.y);
  }

  private hotspotAt(wx: number, wy: number): Hotspot | null {
    // Fat-finger friendly: every hotspot gets a 26-unit margin.
    const m = 26;
    let best: Hotspot | null = null;
    let bestArea = Infinity;
    for (const h of this.hotspots) {
      if (h.enabled && !h.enabled()) continue;
      const [x, y, w, hh] = h.rect;
      if (wx >= x - m && wx <= x + w + m && wy >= y - m && wy <= y + hh + m) {
        const area = w * hh;
        if (area < bestArea) {
          best = h;
          bestArea = area;
        }
      }
    }
    return best;
  }

  private friendAt(wx: number, wy: number): Actor | null {
    for (const id of CREW_ORDER) {
      if (id === this.state.active) continue;
      if (this.actors[id].hit(wx, wy)) return this.actors[id];
    }
    return null;
  }

  private onTap(p: PointerInfo) {
    if (this.hud.inDialogue) {
      this.hud.tapDialogue();
      return;
    }
    if (this.minigame || this.busy || this.paused) return;
    const w = this.worldOf(p);
    const sel = this.hud.selected;
    const friend = this.friendAt(w.x, w.y);
    const hs = friend ? null : this.hotspotAt(w.x, w.y);
    this.sound.tap();
    if (sel) {
      this.hud.select(null);
      if (friend) {
        void this.run(() => this.chapter.giveItem(this, friend.id, sel));
        return;
      }
      if (hs) {
        void this.run(async () => {
          await this.approach(hs);
          const ok = hs.useItem ? await hs.useItem(this, sel) : false;
          if (!ok) {
            this.sound.nope();
            await this.say(this.active.id, 'No creo que eso funcione ahí.');
          }
        });
        return;
      }
    }
    if (friend) {
      this.hud.label(CAST[friend.id].name, ...this.screenOf(friend.headWorld().x, friend.headWorld().y - 20));
      void this.run(async () => {
        const a = this.active;
        const side = a.x < friend.x ? -1 : 1;
        await this.walk(a.id, friend.x + side * 150, friend.y + 4);
        a.face(friend.x);
        friend.face(a.x);
        await this.chapter.banter(this, friend.id);
      });
      return;
    }
    if (hs) {
      this.hud.label(hs.name, ...this.screenOf(hs.rect[0] + hs.rect[2] / 2, hs.rect[1]));
      void this.run(async () => {
        await this.approach(hs);
        await hs.use(this);
      });
      return;
    }
    // Floor: just walk (not a script, so it can be interrupted by another tap).
    void this.active.walkTo(clamp(w.x, WALK.x0, WALK.x1), clamp(w.y, WALK.y0, WALK.y1)).then(() => this.save());
  }

  private onLongPress(p: PointerInfo) {
    if (this.minigame || this.busy || this.hud.inDialogue || this.paused) return;
    const w = this.worldOf(p);
    const friend = this.friendAt(w.x, w.y);
    if (friend) {
      void this.run(() => this.chapter.lookFriend(this, friend.id));
      return;
    }
    const hs = this.hotspotAt(w.x, w.y);
    if (hs) {
      this.hud.label(hs.name, ...this.screenOf(hs.rect[0] + hs.rect[2] / 2, hs.rect[1]));
      void this.run(async () => {
        this.active.face(hs.rect[0] + hs.rect[2] / 2);
        await hs.look(this);
      });
    }
  }

  /** Test hook: tap (or long-press) a world position as a finger would. */
  tapWorld(wx: number, wy: number, long = false) {
    const s = this.cam.worldToScreen(wx, wy);
    const c = this.stage.toCss(s.x, s.y);
    const p = { x: c.x, y: c.y, id: 1 };
    if (long) this.onLongPress(p);
    else this.onTap(p);
  }

  async approach(hs: Hotspot) {
    const a = this.active;
    await this.walk(a.id, hs.stand[0], hs.stand[1]);
    a.face(hs.rect[0] + hs.rect[2] / 2);
    await wait(120);
  }

  // ------------------------------------------------------------ frame

  private update(dt: number) {
    this.hud.update(dt);
    // Lip sync follows the dialogue typewriter.
    const speaking = this.hud.speaking;
    for (const a of Object.values(this.actors)) {
      a.lipSync = speaking === a.id;
      a.update(dt);
    }
    // Neon flicker and passing cars (light events).
    this.neonT -= dt;
    if (this.neonT < 0) {
      this.live.neon = this.live.neon > 0.5 ? 0 : 1;
      this.neonT = this.live.neon > 0.5 ? 2 + Math.random() * 6 : 0.05 + Math.random() * 0.12;
    }
    this.carT -= dt;
    if (this.live.car >= 0) {
      this.live.car += dt / 2.8;
      if (this.live.car > 1) this.live.car = -1;
    } else if (this.carT < 0) {
      this.live.car = 0;
      this.carT = 10 + Math.random() * 12;
    }
    updateUseraLights(this.rig, this.live);
    this.drizzle.update(dt);
    this.particles.update(dt);
    this.revealT = Math.max(0, this.revealT - dt);
    this.minigame?.update(dt);
    const focus = this.minigame ? this.minigame.focus() : this.active;
    this.cam.follow(focus.x);
    this.cam.update(dt);
  }

  flickerNeon() {
    this.live.neon = 0;
    this.neonT = 0.4;
  }

  private render() {
    const ctx = this.stage.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, this.stage.canvas.width, this.stage.canvas.height);
    if (!this.baked) return;
    this.cam.apply(ctx);
    const H = 1080;
    ctx.drawImage(this.baked.back, 0, 0, SCENE_W, H);
    drawUseraLive(ctx, this.last / 1000, this.live);

    // Depth-sorted actors and props.
    const items: Array<{ y: number; draw: () => void }> = [];
    for (const a of Object.values(this.actors)) items.push({ y: a.y, draw: () => a.draw(ctx, this.rig) });
    items.push({
      y: TABLE.y,
      draw: () => drawTerraceTable(ctx, TABLE.x, TABLE.y, this.rig.tintFor(TABLE.x, TABLE.y - 140), !this.flag('mesaSeca'), this.tableBeers, this.last / 1000),
    });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    this.minigame?.drawWorld(ctx);
    this.particles.draw(ctx);
    ctx.drawImage(this.baked.front, 0, 0, SCENE_W, H);
    if (this.stage.quality !== 'baja') {
      const x0 = this.cam.x - this.cam.pad;
      this.drizzle.draw(ctx, this.rig, x0, x0 + this.stage.viewW);
    }
    if (this.revealT > 0) this.drawReveal(ctx);

    // Grain over the whole frame, in screen space.
    if (this.grainPattern && this.stage.quality !== 'baja') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = this.grainPattern;
      ctx.fillRect(0, 0, this.stage.canvas.width, this.stage.canvas.height);
    }
  }

  private drawReveal(ctx: CanvasRenderingContext2D) {
    const a = Math.min(1, this.revealT * 2);
    const pulse = 1 + Math.sin(this.last / 160) * 0.08;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 26px 'Alegreya Sans', sans-serif`;
    const marks: Array<[number, number, string]> = [];
    for (const h of this.hotspots) {
      if (h.enabled && !h.enabled()) continue;
      marks.push([h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3] / 2, h.name]);
    }
    for (const id of CREW_ORDER) {
      if (id === this.state.active) continue;
      const hw = this.actors[id].headWorld();
      marks.push([hw.x, hw.y + 40, CAST[id].name]);
    }
    for (const [x, y, name] of marks) {
      ctx.strokeStyle = 'rgba(219,180,108,0.95)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 26 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(219,180,108,0.95)';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      const w = ctx.measureText(name).width + 28;
      ctx.fillStyle = 'rgba(12,16,32,0.85)';
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y + 36, w, 40, 20);
      ctx.fill();
      ctx.fillStyle = '#f3ead6';
      ctx.fillText(name, x, y + 57);
    }
    ctx.restore();
  }

  private measure(dt: number) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 60) this.frameTimes.shift();
    const avg = this.frameTimes.reduce((s, v) => s + v, 0) / this.frameTimes.length;
    if (this.showFps) this.hud.fps(`${Math.round(1 / avg)} fps · ${this.stage.quality} · ${this.stage.canvas.width}×${this.stage.canvas.height}`);
    // Auto quality: step down if the phone can't keep ~40 fps for 2 seconds.
    if (this.autoQuality && !this.paused) {
      this.slowFor = avg > 1 / 40 ? this.slowFor + dt : 0;
      if (this.slowFor > 2) {
        this.slowFor = 0;
        this.frameTimes = [];
        if (this.stage.quality === 'alta') this.setQuality('media');
        else if (this.stage.quality === 'media') this.setQuality('baja');
        this.autoQuality = true;
      }
    }
  }
}

export { CURB_Y };
