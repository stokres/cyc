// Weather and frame effects: drizzle in depth layers lit by the street lights
// (rule F5), puddle splashes, and one subtle grain over the whole frame (rule F6).
import { css } from '../core/color';
import { rng } from '../core/util';
import { LightRig } from './lighting';

interface Drop {
  x: number;
  y: number;
  layer: number;
}

const LAYERS = [
  { speed: 900, len: 16, width: 1.2, alpha: 0.18 },
  { speed: 1300, len: 26, width: 1.6, alpha: 0.26 },
  { speed: 1800, len: 40, width: 2.2, alpha: 0.34 },
];

export class Drizzle {
  private drops: Drop[] = [];
  private splashes: Array<{ x: number; y: number; t: number }> = [];
  wind = -0.12;

  constructor(private w: number, count: number) {
    const r = rng(99);
    for (let i = 0; i < count; i++) this.drops.push({ x: r() * w, y: r() * 1080, layer: i % 3 });
  }

  setCount(n: number) {
    while (this.drops.length > n) this.drops.pop();
    const r = rng(this.drops.length + 7);
    while (this.drops.length < n) this.drops.push({ x: r() * this.w, y: r() * 1080, layer: this.drops.length % 3 });
  }

  update(dt: number) {
    for (const d of this.drops) {
      const L = LAYERS[d.layer];
      d.y += L.speed * dt;
      d.x += L.speed * this.wind * dt;
      const floor = d.layer === 2 ? 1000 : d.layer === 1 ? 900 : 780;
      if (d.y > floor) {
        if (d.layer > 0 && Math.random() < 0.35) this.splashes.push({ x: d.x, y: floor - Math.random() * 60, t: 0 });
        d.y = -40 - Math.random() * 200;
        d.x = Math.random() * this.w;
      }
      if (d.x < 0) d.x += this.w;
    }
    for (const s of this.splashes) s.t += dt;
    this.splashes = this.splashes.filter((s) => s.t < 0.3);
  }

  draw(ctx: CanvasRenderingContext2D, rig: LightRig, x0: number, x1: number) {
    ctx.lineCap = 'round';
    for (const d of this.drops) {
      if (d.x < x0 - 40 || d.x > x1 + 40) continue;
      const L = LAYERS[d.layer];
      const c = rig.at(d.x, d.y);
      const lum = Math.min(1, (c[0] + c[1] + c[2]) / 2.2);
      ctx.strokeStyle = css([0.7 + c[0] * 0.3, 0.75 + c[1] * 0.25, 0.85 + c[2] * 0.15], L.alpha * (0.45 + lum));
      ctx.lineWidth = L.width;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - L.len * this.wind, d.y - L.len);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(220,228,245,0.35)';
    ctx.lineWidth = 1.5;
    for (const s of this.splashes) {
      if (s.x < x0 || s.x > x1) continue;
      const r = 3 + s.t * 40;
      ctx.globalAlpha = 1 - s.t / 0.3;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, r, r * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/** Burst of droplets: puddle splash or spilled beer. */
export class Particles {
  private ps: Array<{ x: number; y: number; vx: number; vy: number; t: number; life: number; c: string; r: number; floor: number }> = [];

  burst(x: number, y: number, n: number, color: string, spread = 260, up = 380, floor = y + 4) {
    for (let i = 0; i < n; i++) {
      this.ps.push({ x, y, vx: (Math.random() - 0.5) * spread, vy: -Math.random() * up, t: 0, life: 0.5 + Math.random() * 0.4, c: color, r: 2 + Math.random() * 3, floor });
    }
  }

  drip(x: number, y: number, vx: number, color: string, floor: number) {
    this.ps.push({ x, y, vx: vx + (Math.random() - 0.5) * 40, vy: 20, t: 0, life: 1.2, c: color, r: 2.5 + Math.random() * 2, floor });
  }

  update(dt: number) {
    for (const p of this.ps) {
      p.t += dt;
      p.vy += 1500 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > p.floor) {
        p.y = p.floor;
        p.vy = 0;
        p.vx *= 0.5;
      }
    }
    this.ps = this.ps.filter((p) => p.t < p.life);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.ps) {
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** One soft paper grain for the whole frame, drawn in screen space. */
export function makeGrain(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 192;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(192, 192);
  const r = rng(3);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r();
    const light = v > 0.5;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = light ? 255 : 0;
    img.data[i + 3] = Math.floor(Math.abs(v - 0.5) * 2 * 15);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
