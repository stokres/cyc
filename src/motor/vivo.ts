// Light that changes and cannot be baked, drawn every frame over the layers
// (rule L4): the fire and the dust in the flat, the pharmacy cross, the bar's
// telly, the odd car at the end of the side street and the lights on the
// Madrid towers seen from Guille's farm.
import { glow, type Escena } from './escena';

export interface Vivo {
  ctx: CanvasRenderingContext2D;
  /** Layer just drawn. */
  capa: string;
  S: Escena;
  px: number;
  t: number;
  /** Screen offset of a layer at depth k (screen x = u + off(k)). */
  off(k: number): number;
}

function piso({ ctx, capa, S, px, t, off }: Vivo) {
  if (capa !== 'pared' && capa !== 'suelo') return;
  ctx.save();
  ctx.setTransform(px, 0, 0, px, off(1) * px, 0);
  ctx.globalCompositeOperation = 'lighter';
  if (capa === 'pared') {
    // Low flames licking the logs, and a flicker on the surround.
    const F = S.spots.fuego;
    const fl = 0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 7.3 + 1);
    for (let i = 0; i < 6; i++) {
      const x = F.X - 66 + i * 26;
      const h = 26 + 22 * (0.5 + 0.5 * Math.sin(t * (6 + i) + i * 2.1));
      const sw = 4 * Math.sin(t * 9 + i);
      const g = ctx.createLinearGradient(0, 742, 0, 742 - h);
      g.addColorStop(0, 'rgba(255,170,70,0.85)');
      g.addColorStop(0.6, 'rgba(255,110,40,0.5)');
      g.addColorStop(1, 'rgba(255,80,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 10, 744);
      ctx.quadraticCurveTo(x - 9 + sw, 742 - h * 0.5, x + sw * 1.5, 742 - h);
      ctx.quadraticCurveTo(x + 9 + sw, 742 - h * 0.5, x + 10, 744);
      ctx.fill();
    }
    glow(ctx, F.X, 720, 260, '#ff8a3a', 0.12 * fl);
  } else {
    // Dust motes drifting in the light from the terrace.
    for (let i = 0; i < 14; i++) {
      const ph = i * 1.37;
      const u = Math.sin(ph * 3.1) * 0.5 + 0.5;
      const x = 2160 + u * 420 + Math.sin(t * 0.3 + ph) * 30;
      const y = 300 + ((t * (8 + (i % 5) * 3) + i * 37) % 560);
      const a = 0.1 + 0.12 * Math.sin(t * 1.5 + ph);
      ctx.fillStyle = `rgba(255,236,220,${a.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(x - (y - 300) * 0.35, y, 1.1 + (i % 3) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function calle({ ctx, capa, S, px, t, off }: Vivo) {
  if (capa === 'fachadas') {
    ctx.save();
    ctx.setTransform(px, 0, 0, px, off(1) * px, 0);
    ctx.globalCompositeOperation = 'lighter';
    // Pharmacy cross: the green LEDs pulse like the real ones.
    const P = S.spots.cruz;
    const pulse = 0.55 + 0.45 * Math.sin(t * 3);
    glow(ctx, P.x, P.y, 150, '#46ff8a', 0.3 * pulse);
    ctx.fillStyle = `rgba(150,255,190,${(0.35 + 0.5 * pulse).toFixed(2)})`;
    const a = 16;
    ctx.fillRect(P.x - a / 2, P.y - a * 1.5, a, a * 3);
    ctx.fillRect(P.x - a * 1.5, P.y - a / 2, a * 3, a);
    // The bar's telly flickering behind the window.
    const tv = S.spots.tele;
    const fl = 0.5 + 0.5 * Math.sin(t * 11) * Math.sin(t * 3.7);
    glow(ctx, tv.x, tv.y, 90, fl > 0.5 ? '#9ec0ff' : '#cfe6ff', 0.18 + 0.12 * fl);
    ctx.restore();
  }
  if (capa === 'transversal') {
    // Now and then a car crosses the far end of the side street.
    const T = S.spots.cruce;
    const cyc = (t % 14) / 14;
    if (cyc < 0.25) {
      const u = cyc / 0.25;
      ctx.save();
      // Only seen down the side street: the facades and its walls hide the rest
      // (the WebGL renderer draws this over every back layer).
      const L = Math.max(off(T.k) + T.a0, off(1) + T.b0);
      const R = Math.min(off(T.k) + T.a1, off(1) + T.b1);
      if (R <= L) {
        ctx.restore();
        return;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath();
      ctx.rect(L * px, 0, (R - L) * px, ctx.canvas.height);
      ctx.clip();
      ctx.setTransform(px, 0, 0, px, off(T.k) * px, 0);
      ctx.globalCompositeOperation = 'lighter';
      const x = T.x0 + (T.x1 - T.x0) * u;
      glow(ctx, x, T.y, 120, '#fff4d8', 0.5);
      ctx.fillStyle = 'rgba(255,250,235,0.95)';
      ctx.beginPath();
      ctx.arc(x, T.y, 3.5, 0, Math.PI * 2);
      ctx.arc(x - 16, T.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function granja({ ctx, capa, S, px, t, off }: Vivo) {
  if (capa !== 'skyline') return;
  // Aviation lights on the Madrid towers, slowly blinking out of step.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const nave = S.spots.nave;
  let i = 0;
  for (const [id, b] of Object.entries(S.spots)) {
    if (!id.startsWith('baliza')) continue;
    const on = Math.sin(t * 2.2 + i++ * 1.7) > 0.2;
    if (!on) continue;
    // Behind the barn: not seen (this layer is drawn over every back layer).
    const sx = b.x + off(b.k);
    if (sx > nave.x0 + off(1) - 12 && sx < nave.x1 + off(1) + 12) continue;
    ctx.setTransform(px, 0, 0, px, off(b.k) * px, 0);
    glow(ctx, b.x, b.y, 10, '#ff4a3a', 0.6);
    ctx.fillStyle = '#ff6a5a';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const VIVO: Record<string, (v: Vivo) => void> = { piso, calle, granja };
