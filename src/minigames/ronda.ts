// Minijuego "La ronda": carry four cañas from the bar to the terrace table.
// One input, two ways to give it: tilt the phone, or drag a thumb sideways.
// Rules for every minigame (docs/JUGABILIDAD.md): one gesture, 15–30 s,
// instant retry, skippable after two failures, gyro always has a touch fallback.
import { CrewId } from '../art/cast';
import { PointerInfo } from '../core/input';
import { clamp, wait } from '../core/util';
import { Actor } from '../game/actor';
import { Adventure, Minigame, TABLE } from '../game/adventure';
import { h } from '../ui/hud';

const START_X = 505;
const END_X = TABLE.x - 150;
const LANE_Y = 900;
const SPEED = 82;
const BUMPS = [560, 1180, 1700]; // puddles on the route
const SPILL_AT = 0.19; // radians

type Input = 'touch' | 'gyro';

class Ronda implements Minigame {
  theta = 0;
  omega = 0;
  levels = [1, 1, 1, 1];
  t = 0;
  running = false;
  finished = false;
  private u = 0;
  private dragX0: number | null = null;
  private dragDx = 0;
  private tilt = 0;
  private tilt0: number | null = null;
  private bumped = new Set<number>();
  private sloshT = 0;
  private hud: { bar: HTMLElement; glasses: HTMLElement[]; root: HTMLElement; hint: HTMLElement } | null = null;
  private onOrient = (e: DeviceOrientationEvent) => {
    const ang = screen.orientation?.angle ?? Number((window as unknown as { orientation?: number }).orientation ?? 0);
    const beta = e.beta ?? 0;
    const gamma = e.gamma ?? 0;
    this.tilt = ang === 90 ? beta : ang === 270 || ang === -90 ? -beta : gamma;
  };

  constructor(private g: Adventure, private carrier: Actor, private input: Input) {}

  focus() {
    return this.carrier;
  }

  begin() {
    if (this.input === 'gyro') window.addEventListener('deviceorientation', this.onOrient);
    const bar = h('i', {});
    const glasses = [0, 1, 2, 3].map(() => h('i', {}, h('b', {})));
    const hint = h(
      'div',
      { class: 'mg-hint glass' },
      this.input === 'gyro' ? 'Inclina el móvil hacia el lado contrario al que se cae la bandeja' : 'Desliza el dedo hacia el lado contrario al que se cae la bandeja',
    );
    const root = h(
      'div',
      { class: 'mg-top glass' },
      h('div', { class: 'mg-meta' }, h('span', {}, 'BARRA'), h('div', { class: 'mg-glasses' }, ...glasses), h('span', {}, 'MESA')),
      h('div', { class: 'mg-progress' }, bar),
    );
    this.g.hud.root.append(root, hint);
    this.hud = { bar, glasses, root, hint };
  }

  end() {
    window.removeEventListener('deviceorientation', this.onOrient);
    this.hud?.root.remove();
    this.hud?.hint.remove();
  }

  calibrate() {
    this.tilt0 = this.tilt;
  }

  down(p: PointerInfo) {
    this.dragX0 = p.x;
    this.dragDx = 0;
  }
  move(p: PointerInfo) {
    if (this.dragX0 !== null) this.dragDx = p.x - this.dragX0;
  }
  up() {
    this.dragX0 = null;
    this.dragDx = 0;
  }

  update(dt: number) {
    const c = this.carrier;
    if (!this.running) {
      this.theta *= 0.9;
      c.carryTilt = this.theta;
      return;
    }
    this.t += dt;
    // Player input.
    let target = 0;
    if (this.input === 'gyro' && this.tilt0 !== null) target = clamp((this.tilt - this.tilt0) / 16, -1, 1);
    const touchU = clamp(this.dragDx / (this.g.stage.cssW * 0.12), -1, 1);
    if (Math.abs(touchU) > Math.abs(target)) target = touchU;
    this.u += (target - this.u) * Math.min(1, dt * 14);

    // Disturbances: gusts, walking rhythm, puddle bumps.
    const ramp = Math.min(1, this.t / 3);
    const gust = (1.5 * Math.sin(this.t * 0.83 + 0.4) + 0.9 * Math.sin(this.t * 2.1 + 1.3) + 0.5 * Math.sin(this.t * 3.7)) * ramp;
    const stepWobble = 0.9 * Math.sin(c.walkPhase * 2);
    for (const bx of BUMPS) {
      if (!this.bumped.has(bx) && c.x > bx) {
        this.bumped.add(bx);
        this.omega += (Math.random() < 0.5 ? -1 : 1) * 0.75;
        this.g.particles.burst(c.x, c.y, 10, 'rgba(190,210,240,0.85)', 260, 260);
        this.g.sound.splash();
      }
    }
    // Slightly unstable tray: it drifts unless you correct it. Tuned with
    // scripts/ronda-sim (human reaction 0.2–0.35 s wins; no input loses).
    const acc = 0.5 * this.theta + 0.5 * (gust + stepWobble) + 3.0 * this.u - 3.2 * this.omega;
    this.omega += acc * dt;
    this.theta = clamp(this.theta + this.omega * dt, -0.62, 0.62);
    if (Math.abs(this.theta) >= 0.62) this.omega *= -0.3;
    c.carryTilt = this.theta;

    // Spill when tilted past ~11°.
    const over = Math.abs(this.theta) - SPILL_AT;
    if (over > 0) {
      this.levels = this.levels.map((l, i) => {
        const edge = 1 + Math.abs(i - 1.5) * 0.25;
        return Math.max(0, l - over * 0.8 * edge * dt * (1 + Math.abs(this.omega) * 0.4));
      });
      this.sloshT -= dt;
      if (this.sloshT < 0) {
        this.sloshT = 0.18;
        this.g.sound.slosh(Math.min(1, over * 3));
        const tray = this.trayPos();
        const side = Math.sign(this.theta);
        this.g.particles.drip(tray.x + side * 70, tray.y, side * 60, 'rgba(240,180,60,0.9)', c.y);
      }
    }

    // Walk forward, slower when the tray is tilted.
    const speed = SPEED * (1 - Math.min(0.55, Math.abs(this.theta) * 1.4));
    c.x = Math.min(END_X, c.x + speed * dt);
    c.walkPhase += (speed * dt) / (62 * c.scale);
    c.facing = 1;

    if (this.hud) {
      this.hud.bar.style.width = `${((c.x - START_X) / (END_X - START_X)) * 100}%`;
      this.levels.forEach((l, i) => ((this.hud!.glasses[i].firstChild as HTMLElement).style.height = `${l * 100}%`));
    }
    if (c.x >= END_X || this.levels.every((l) => l <= 0.02)) {
      this.running = false;
      this.finished = true;
    }
  }

  trayPos() {
    const hnd = this.carrier.handWorld();
    return { x: hnd.x + 6, y: hnd.y - 16 };
  }

  drawWorld(ctx: CanvasRenderingContext2D) {
    const p = this.trayPos();
    const tint = this.g.rig.tintFor(p.x, p.y);
    const P = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      const f = (v: number, k: number) => Math.round(Math.min(255, v * k));
      return `rgb(${f((n >> 16) & 255, tint[0])},${f((n >> 8) & 255, tint[1])},${f(n & 255, tint[2])})`;
    };
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(this.theta);
    // Glasses sit on the tray; beer stays level with gravity.
    this.levels.forEach((lvl, i) => {
      const gx = -48 + i * 32;
      ctx.save();
      ctx.translate(gx, -19);
      ctx.beginPath();
      ctx.moveTo(-11, -17);
      ctx.lineTo(11, -17);
      ctx.lineTo(8, 17);
      ctx.lineTo(-8, 17);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(220,235,240,0.3)';
      ctx.fillRect(-12, -18, 24, 36);
      if (lvl > 0.01) {
        ctx.rotate(-this.theta);
        const top = 17 - 34 * lvl;
        ctx.fillStyle = P('#e9a12a');
        ctx.fillRect(-30, top, 60, 60);
        ctx.fillStyle = P('#fbf3df');
        ctx.fillRect(-30, top - 5, 60, 6);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(240,250,255,0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });
    // Round steel tray seen from the side.
    ctx.fillStyle = P('#9aa0a8');
    ctx.beginPath();
    ctx.roundRect(-82, -4, 164, 9, 4);
    ctx.fill();
    ctx.fillStyle = P('#c9ced5');
    ctx.fillRect(-80, -4, 160, 3);
    ctx.restore();

    // Danger arc under the tray: shows the tilt at a glance.
    if (this.running) {
      const a = this.theta;
      ctx.save();
      ctx.translate(this.carrier.x, this.carrier.y + 40);
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(243,234,214,0.18)';
      ctx.beginPath();
      ctx.arc(0, 0, 70, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.strokeStyle = Math.abs(a) > SPILL_AT ? 'rgba(255,106,85,0.95)' : 'rgba(219,180,108,0.95)';
      ctx.beginPath();
      ctx.arc(0, 0, 70, Math.PI * 1.5 + a * 0.55 - 0.06, Math.PI * 1.5 + a * 0.55 + 0.06);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function card(g: Adventure, title: string, body: Array<HTMLElement | string>, buttons: Array<[string, string, () => void]>) {
  const row = h('div', { class: 'row' });
  const el = g.hud.cover('', h('div', { class: 'card glass' }, h('h2', {}, title), ...body, row));
  for (const [label, cls, fn] of buttons) row.append(h('button', { class: `btn ${cls}`, onclick: (e) => (e.stopPropagation(), el.remove(), fn()) }, label));
  return el;
}

function choose<T>(g: Adventure, title: string, body: Array<HTMLElement | string>, options: Array<[string, string, T]>): Promise<T> {
  return new Promise((res) => card(g, title, body, options.map(([l, c, v]) => [l, c, () => res(v)] as [string, string, () => void])));
}

async function countdown(g: Adventure) {
  for (const n of ['3', '2', '1']) {
    const el = h('div', { class: 'countdown' }, n);
    g.hud.root.append(el);
    g.sound.tap();
    await wait(650);
    el.remove();
  }
}

async function askGyro(): Promise<boolean> {
  const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
  if (!DOE) return false;
  try {
    if (typeof DOE.requestPermission === 'function') return (await DOE.requestPermission()) === 'granted';
    return true;
  } catch {
    return false;
  }
}

/** Plays the minigame until the player wins or skips. Resolves with the beer levels. */
export async function playRonda(g: Adventure, who: CrewId): Promise<number[]> {
  const carrier = g.actors[who];
  g.hud.setHudVisible(false);
  const hasGyro = 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches;
  let input: Input = 'touch';
  let result: number[] | null = null;

  while (!result) {
    const fails = g.state.ronda.fails;
    const opts: Array<[string, string, string]> = [['Jugar con el dedo', 'primary', 'touch']];
    if (hasGyro) opts.push(['Inclinar el móvil', '', 'gyro']);
    if (fails >= 2) opts.push(['Saltar minijuego', 'ghost', 'skip']);
    const pick = await choose(
      g,
      'La ronda',
      [
        h('p', {}, 'Lleva las cuatro cañas de la barra a la mesa sin derramarlas.'),
        h('p', { class: 'small' }, 'Si la bandeja se inclina hacia un lado, corrige hacia el otro: inclinando el móvil o deslizando el dedo. Cuidado con los charcos.'),
      ],
      opts,
    );
    if (pick === 'skip') {
      result = [0.5, 0.5, 0.5, 0.5];
      break;
    }
    input = pick as Input;
    if (input === 'gyro' && !(await askGyro())) {
      input = 'touch';
      g.hud.toast('Sin permiso para el giroscopio: juega con el dedo');
    }

    // Set up the run.
    carrier.x = START_X;
    carrier.y = LANE_Y;
    carrier.facing = 1;
    carrier.action = 'carry';
    const game = new Ronda(g, carrier, input);
    g.minigame = game;
    g.cam.follow(carrier.x, true);
    game.begin();
    await countdown(g);
    game.calibrate();
    game.running = true;
    while (!game.finished) await wait(50);
    game.end();
    carrier.action = 'idle';

    const total = game.levels.reduce((s, v) => s + v, 0);
    const stars = total >= 3.4 ? 3 : total >= 2.6 ? 2 : total >= 2 ? 1 : 0;
    g.state.ronda.best = Math.max(g.state.ronda.best, stars);
    const starEl = h('div', { class: 'stars', 'aria-label': `${stars} de 3 estrellas` }, ...[0, 1, 2].map((i) => h('span', { class: i < stars ? '' : 'off' }, '★')));
    const amount = `${total.toFixed(1).replace('.', ',')} de 4 cañas`;
    if (stars > 0) {
      g.sound.win();
      const again = await choose(g, '¡Ronda servida!', [starEl, h('p', {}, `Han llegado ${amount}.`)], [
        ['Seguir', 'primary', false],
        ['Repetir', 'ghost', true],
      ]);
      if (!again) result = game.levels;
    } else {
      g.sound.lose();
      g.state.ronda.fails++;
      const opt: Array<[string, string, boolean]> = [['Reintentar', 'primary', true]];
      if (g.state.ronda.fails >= 2) opt.push(['Saltar', 'ghost', false]);
      const again = await choose(g, 'Se ha quedado en espuma', [starEl, h('p', {}, `Solo han llegado ${amount}. Hacen falta al menos dos.`)], opt);
      if (!again) result = [0.5, 0.5, 0.5, 0.5];
    }
    g.minigame = null;
    g.save();
  }
  g.minigame = null;
  carrier.action = 'idle';
  carrier.x = END_X;
  carrier.y = TABLE.y - 10;
  g.hud.setHudVisible(true);
  return result;
}
