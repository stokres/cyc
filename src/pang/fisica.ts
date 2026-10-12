// Bouncing bodies (bubbles and bosses) and the small geometry the game needs.
import type { Bloque } from './tipos';
import { AREA } from './tipos';
import { GRAVEDAD, type Cuerpo } from './mundo';

/** Does the circle touch the rectangle? */
export function circuloRect(cx: number, cy: number, r: number, rx: number, ry: number, rw: number, rh: number): boolean {
  const px = cx < rx ? rx : cx > rx + rw ? rx + rw : cx;
  const py = cy < ry ? ry : cy > ry + rh ? ry + rh : cy;
  const dx = cx - px;
  const dy = cy - py;
  return dx * dx + dy * dy < r * r;
}

/** The vertical speed that makes the bottom of a body rise `h` px above where it bounced. */
export const velocidadBote = (h: number) => -Math.sqrt(2 * GRAVEDAD * h);

function rebotarArriba(c: Cuerpo) {
  if (c.bote > 0) c.vy = velocidadBote(c.bote);
  else if (c.vy > 0) c.vy = -c.vy;
}

/**
 * One step: gravity (unless `bote` is 0), movement, and bounces off the walls, ceiling,
 * floor and every side of the blocks. A landing sets the vertical speed so the body
 * always rises to the same height. `viento` pushes it sideways without changing `vx`.
 */
export function moverCuerpo(c: Cuerpo, dt: number, bloques: Bloque[], viento = 0) {
  if (c.bote > 0) c.vy += GRAVEDAD * dt;
  c.x += (c.vx + viento) * dt;
  c.y += c.vy * dt;
  const r = c.r;
  if (c.x - r < AREA.izq) {
    c.x = AREA.izq + r;
    if (c.vx < 0) c.vx = -c.vx;
  } else if (c.x + r > AREA.der) {
    c.x = AREA.der - r;
    if (c.vx > 0) c.vx = -c.vx;
  }
  if (c.y - r < AREA.techo) {
    c.y = AREA.techo + r;
    if (c.vy < 0) c.vy = -c.vy;
  }
  if (c.y + r > AREA.suelo) {
    c.y = AREA.suelo - r;
    rebotarArriba(c);
  }
  for (let i = 0; i < bloques.length; i++) {
    const b = bloques[i];
    const px = c.x < b.x ? b.x : c.x > b.x + b.w ? b.x + b.w : c.x;
    const py = c.y < b.y ? b.y : c.y > b.y + b.h ? b.y + b.h : c.y;
    const dx = c.x - px;
    const dy = c.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    let nx: number;
    let ny: number;
    if (d2 === 0) {
      // The centre got inside: leave by the nearest side.
      const izq = c.x - b.x;
      const der = b.x + b.w - c.x;
      const arr = c.y - b.y;
      const aba = b.y + b.h - c.y;
      const m = Math.min(izq, der, arr, aba);
      nx = m === izq ? -1 : m === der ? 1 : 0;
      ny = nx !== 0 ? 0 : m === arr ? -1 : 1;
      if (nx < 0) c.x = b.x - r;
      else if (nx > 0) c.x = b.x + b.w + r;
      else if (ny < 0) c.y = b.y - r;
      else c.y = b.y + b.h + r;
    } else {
      const d = Math.sqrt(d2);
      nx = dx / d;
      ny = dy / d;
      c.x += nx * (r - d);
      c.y += ny * (r - d);
    }
    // Reflect along the axis the body mostly hit.
    if (Math.abs(nx) > Math.abs(ny)) {
      if (nx * c.vx < 0) c.vx = -c.vx;
    } else if (ny < 0) {
      if (c.vy > 0) rebotarArriba(c);
    } else if (c.vy < 0) c.vy = -c.vy;
  }
}
