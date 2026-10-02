// Small drawing helpers shared by the scene painters.
import { rng } from '../core/util';

export type Ctx = CanvasRenderingContext2D;

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function poly(ctx: Ctx, pts: number[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}

export function fillRect(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

export function vgrad(ctx: Ctx, y0: number, y1: number, stops: Array<[number, string]>) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** Brick wall with 3 tones and gentle irregularity. Detail only in near planes (rule F2). */
export function bricks(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number, tones: [string, string, string], mortar: string, bw = 34, bh = 13) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = mortar;
  ctx.fillRect(x, y, w, h);
  const r = rng(seed);
  for (let row = 0, yy = y; yy < y + h; row++, yy += bh) {
    const off = row % 2 ? bw / 2 : 0;
    for (let xx = x - off; xx < x + w; xx += bw) {
      const p = r();
      ctx.fillStyle = p < 0.62 ? tones[0] : p < 0.86 ? tones[1] : tones[2];
      ctx.beginPath();
      ctx.roundRect(xx + 1.5, yy + 1.5, bw - 3, bh - 3, 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Text that fits a width, used for shop signs. */
export function signText(ctx: Ctx, text: string, x: number, y: number, maxW: number, font: string, color: string, align: CanvasTextAlign = 'center') {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const m = ctx.measureText(text).width;
  if (m > maxW) {
    ctx.translate(x, y);
    ctx.scale(maxW / m, 1);
    ctx.fillText(text, 0, 0);
  } else ctx.fillText(text, x, y);
  ctx.restore();
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}
