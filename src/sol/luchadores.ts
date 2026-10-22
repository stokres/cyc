// The four friends in the fights, seen from behind and a little to the side like the original's party at
// the bottom of the battle screen. Each frame is painted once into a cached canvas.
// PLACEHOLDER: for now the walking sprite from behind, until they are drawn at this size.
import { marco, type Amigo } from './personajes';
import { ctx, lienzo, una } from './pixel';

export type PoseCombate = 'quieto' | 'ataque' | 'poder' | 'herido' | 'caido' | 'victoria';

export const LUCHADOR_W = 32;
export const LUCHADOR_H = 40;
/** Where the feet are inside the frame (the fight places each friend by this point). */
export const LUCHADOR_PIES = { x: 16, y: 38 } as const;

/** How many frames each pose has (`frame` goes from 0 to this minus one). */
export const FRAMES: Record<PoseCombate, number> = { quieto: 2, ataque: 3, poder: 2, herido: 1, caido: 1, victoria: 2 };

/** One cached frame of a friend in a fight. */
export function luchador(q: Amigo, pose: PoseCombate, frame: number): HTMLCanvasElement {
  return una(`luchador.${q}.${pose}.${frame}`, () => {
    const c = lienzo(LUCHADOR_W, LUCHADOR_H);
    const x = ctx(c);
    const m = marco(q, pose === 'caido' ? 'E' : 'NW', pose === 'ataque' ? 1 + (frame % 2) : 0, pose === 'poder' ? 'poder' : 'normal');
    x.drawImage(m, 8, LUCHADOR_PIES.y - 22);
    return c;
  });
}
