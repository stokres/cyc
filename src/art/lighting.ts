// Scene lighting for Canvas 2D on phones.
// Static light is baked once into the background (ambient * albedo + light pools).
// Characters and props sample the same light list every frame, so they are lit
// by the scene instead of looking pasted on (style rules L1–L4 in docs/ESTILO.md).
import { RGB, add, hex, luma, mix, scale } from '../core/color';

export interface Light {
  x: number;
  y: number;
  /** Reach in world units. */
  r: number;
  color: RGB;
  power: number;
  /** Vertical squash of the pool on the ground (0..1). Lamps light the floor in an ellipse. */
  flat?: number;
  /** Lights tagged with a group can flicker or be animated at runtime. */
  group?: string;
}

export class LightRig {
  lights: Light[] = [];
  ambient: RGB;
  /** Main key light direction (cold sky light from the upper left). */
  key = { x: -0.6, y: -0.8 };
  /** Runtime multipliers per group (neon flicker, passing car...). */
  gain: Record<string, number> = {};

  constructor(ambientHex: string) {
    this.ambient = hex(ambientHex);
  }

  add(l: Light) {
    this.lights.push(l);
    return l;
  }

  private falloff(l: Light, x: number, y: number) {
    const dx = (x - l.x) / l.r;
    const dy = (y - l.y) / l.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= 1) return 0;
    const f = 1 - d2;
    return f * f;
  }

  /** Light colour arriving at a point (ambient + all lights). */
  at(x: number, y: number): RGB {
    let c: RGB = [...this.ambient];
    for (const l of this.lights) {
      const f = this.falloff(l, x, y);
      if (f > 0) c = add(c, scale(l.color, f * l.power * (l.group ? (this.gain[l.group] ?? 1) : 1)));
    }
    return c;
  }

  /** Strongest light near a point, used for rim light on characters. */
  strongest(x: number, y: number): { l: Light; f: number } | null {
    let best: { l: Light; f: number } | null = null;
    for (const l of this.lights) {
      const f = this.falloff(l, x, y) * l.power * (l.group ? (this.gain[l.group] ?? 1) : 1);
      if (f > 0.04 && (!best || f > best.f)) best = { l, f };
    }
    return best;
  }

  /**
   * Character tint: keeps hue of the costume readable (accents never change hue,
   * rule C3) by pulling the light colour halfway to its own grey.
   */
  tintFor(x: number, y: number): RGB {
    const c = this.at(x, y);
    const g = luma(c);
    const t = mix(c, [g, g, g], 0.45);
    // Characters always get a little extra so faces read on a small screen.
    return [Math.min(1.25, t[0] * 1.08 + 0.06), Math.min(1.25, t[1] * 1.08 + 0.06), Math.min(1.25, t[2] * 1.08 + 0.07)];
  }

  /** Paint the light map: ambient fill + additive pools. Used once when baking. */
  paintLightMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = cssRGB(this.ambient);
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const l of this.lights) {
      if (l.group) continue; // animated lights are drawn live, not baked
      paintPool(ctx, l, 1);
    }
    ctx.restore();
  }
}

export function paintPool(ctx: CanvasRenderingContext2D, l: Light, k: number) {
  const flat = l.flat ?? 1;
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.scale(1, flat);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, l.r);
  const c = scale(l.color, l.power * k);
  // Quadratic-ish falloff matching LightRig.falloff.
  g.addColorStop(0, cssRGB(c));
  g.addColorStop(0.3, cssRGB(scale(c, 0.83)));
  g.addColorStop(0.55, cssRGB(scale(c, 0.48)));
  g.addColorStop(0.8, cssRGB(scale(c, 0.13)));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-l.r, -l.r, l.r * 2, l.r * 2);
  ctx.restore();
}

/** Like css() but allows over-bright values to clip, for additive light. */
function cssRGB(c: RGB) {
  const f = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  return `rgb(${f(c[0])},${f(c[1])},${f(c[2])})`;
}

/**
 * Restrained glow on a light source only (bloom never covers the silhouette of
 * what it lights, rule L5).
 */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(0.25, color.replace('rgb(', 'rgba(').replace(')', ',0.45)'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
