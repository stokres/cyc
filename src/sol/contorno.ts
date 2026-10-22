// A 1 px outline for pixel art painted once (never per frame): every opaque pixel gets a neighbour in the
// given colour, which is a dark tone of the sprite's own colours (docs/ESTILO.md: no black outlines).
import { ctx, lienzo } from './pixel';

/** `c` with a 1 px outline in `col` around it (the result is 2 px bigger each way). */
export function contorno(c: HTMLCanvasElement, col: string): HTMLCanvasElement {
  const s = lienzo(c.width, c.height);
  const sx = ctx(s);
  sx.drawImage(c, 0, 0);
  sx.globalCompositeOperation = 'source-in';
  sx.fillStyle = col;
  sx.fillRect(0, 0, s.width, s.height);
  const r = lienzo(c.width + 2, c.height + 2);
  const x = ctx(r);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) x.drawImage(s, dx, dy);
  x.drawImage(c, 1, 1);
  return r;
}

/** The same canvas dimmed to a flat grey-blue (a command that cannot be used now). */
export function apagar(c: HTMLCanvasElement): HTMLCanvasElement {
  const r = lienzo(c.width, c.height);
  const x = ctx(r);
  x.drawImage(c, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(60,72,128,0.72)';
  x.fillRect(0, 0, r.width, r.height);
  return r;
}
