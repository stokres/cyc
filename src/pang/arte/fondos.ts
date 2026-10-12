// The twelve backgrounds of the Pang, in pixel art, each painted ONCE into a W × H canvas
// (cached) and drawn with one drawImage per frame. Placeholder version, to be replaced by
// the real art with the same API.
import { AREA, FRANJA, H, W, type FondoId } from '../tipos';

const cache = new Map<FondoId, HTMLCanvasElement>();

/**
 * The whole screen for a stage: the scene inside the play area (x 8–376, y 8–184), the
 * frame of blocks around it, the floor tiles from 184 to 192 and black from 192 down
 * (the score strip, drawn by the game).
 */
export function fondo(id: FondoId): HTMLCanvasElement {
  let c = cache.get(id);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = '#5a6a8a';
  x.fillRect(0, 0, W, FRANJA);
  x.fillStyle = '#1b2450';
  x.fillRect(AREA.izq, AREA.techo, AREA.der - AREA.izq, AREA.suelo - AREA.techo);
  x.fillStyle = '#8a4a3a';
  x.fillRect(AREA.izq, AREA.suelo, AREA.der - AREA.izq, FRANJA - AREA.suelo);
  x.fillStyle = '#05060c';
  x.fillRect(0, FRANJA, W, H - FRANJA);
  cache.set(id, c);
  return c;
}
