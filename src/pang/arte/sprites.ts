// Pixel-art sprites of the Pang: the four, the bubbles, the bosses, the items, the blocks.
// Everything is painted ONCE into small canvases (cached) and the game only drawImage()s
// them, never resized with smoothing (docs/ESTILO.md, T5). Placeholder version: flat
// shapes with the right sizes, to be replaced by the real art with the same API.
import type { Anim, Bloque, ColorBola, Jefe, Objeto, PjId, Talla, Variante } from '../tipos';
import { RADIO } from '../tipos';

const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};
const cache = new Map<string, unknown>();
function una<T>(k: string, f: () => T): T {
  if (!cache.has(k)) cache.set(k, f());
  return cache.get(k) as T;
}

/** Size of a player frame: 24 × 32, feet at the bottom centre (12, 32). Facing right. */
export const JUGADOR = { w: 24, h: 32 } as const;

/**
 * A player's animations. Frame counts: quieto 2, andar 4, disparar 1 (looking up,
 * facing the camera), escalar 2 (from behind), herido 2, victoria 2.
 */
export function jugador(pj: PjId): Record<Anim, HTMLCanvasElement[]> {
  return una(`pj|${pj}`, () => {
    const color = { fran: '#2e8a8c', pablo: '#3a3a44', chuchi: '#7b2432', guille: '#d9a62a' }[pj];
    const f = () => {
      const c = lienzo(JUGADOR.w, JUGADOR.h);
      const x = c.getContext('2d')!;
      x.fillStyle = '#e8b296';
      x.fillRect(7, 2, 10, 10);
      x.fillStyle = color;
      x.fillRect(5, 12, 14, 12);
      x.fillStyle = '#2c3b5a';
      x.fillRect(6, 24, 12, 8);
      return c;
    };
    return { quieto: [f(), f()], andar: [f(), f(), f(), f()], disparar: [f()], escalar: [f(), f()], herido: [f(), f()], victoria: [f(), f()] };
  });
}

/** A 10 × 10 face for the lives counter. */
export function cara(pj: PjId): HTMLCanvasElement {
  return una(`cara|${pj}`, () => {
    const c = lienzo(10, 10);
    const x = c.getContext('2d')!;
    x.fillStyle = '#e8b296';
    x.fillRect(1, 1, 8, 8);
    return c;
  });
}

/** A bubble: (2r + 2) square, its centre in the middle. */
export function burbuja(variante: Variante, talla: Talla, color: ColorBola = 'roja'): HTMLCanvasElement {
  return una(`b|${variante}|${talla}|${color}`, () => {
    const r = RADIO[talla];
    const c = lienzo(r * 2 + 2, r * 2 + 2);
    const x = c.getContext('2d')!;
    x.fillStyle = variante === 'bola' ? '#d8323a' : '#e9b13c';
    x.beginPath();
    x.arc(r + 1, r + 1, r, 0, Math.PI * 2);
    x.fill();
    return c;
  });
}

/** The pop of a bubble of that size: 4 frames, (2r + 12) square, centred like the bubble. */
export function estallido(variante: Variante, talla: Talla): HTMLCanvasElement[] {
  return una(`e|${variante}|${talla}`, () => {
    const r = RADIO[talla];
    return [0, 1, 2, 3].map((k) => {
      const c = lienzo(r * 2 + 12, r * 2 + 12);
      const x = c.getContext('2d')!;
      x.strokeStyle = '#fbf3dc';
      x.beginPath();
      x.arc(r + 6, r + 6, r * 0.6 + k * 2, 0, Math.PI * 2);
      x.stroke();
      return c;
    });
  });
}

/** An item a bubble drops: 12 × 12. */
export function objeto(o: Objeto): HTMLCanvasElement {
  return una(`o|${o}`, () => {
    const c = lienzo(12, 12);
    const x = c.getContext('2d')!;
    x.fillStyle = '#ffd36a';
    x.fillRect(2, 2, 8, 8);
    return c;
  });
}

/** A block, painted at its size. `roto`: the cracked look a breakable block has after its first hit is not used; breakables go in one hit. */
export function bloque(b: Pick<Bloque, 'w' | 'h' | 'estilo' | 'rompible'>): HTMLCanvasElement {
  return una(`k|${b.estilo}|${b.w}|${b.h}|${b.rompible ? 1 : 0}`, () => {
    const c = lienzo(b.w, b.h);
    const x = c.getContext('2d')!;
    x.fillStyle = b.rompible ? '#c99a5a' : '#6a6a7a';
    x.fillRect(0, 0, b.w, b.h);
    return c;
  });
}

/** A ladder, 16 wide and `alto` tall. */
export function escalera(alto: number): HTMLCanvasElement {
  return una(`l|${alto}`, () => {
    const c = lienzo(16, alto);
    const x = c.getContext('2d')!;
    x.fillStyle = '#8a6a3a';
    x.fillRect(1, 0, 2, alto);
    x.fillRect(13, 0, 2, alto);
    for (let y = 2; y < alto; y += 6) x.fillRect(1, y, 14, 2);
    return c;
  });
}

/**
 * A boss's frames, all the same size, centred on (w/2, h/2), which is also the centre of
 * its round hit area of radius `radio`.
 *   robi:      normal, gorrito (party hat on: shots bounce), golpe (flash when hit)
 *   peor:      normal, golpe
 *   penultima: normal, escupe (mouth open), enfadada (below half health), golpe
 */
export interface HojaJefe {
  w: number;
  h: number;
  radio: number;
  frames: Record<string, HTMLCanvasElement>;
}
export function jefe(j: Jefe): HojaJefe {
  return una(`j|${j}`, () => {
    const tam = { robi: [56, 56, 24], peor: [64, 52, 24], penultima: [72, 80, 32] }[j];
    const [w, h, radio] = tam;
    const f = (col: string) => {
      const c = lienzo(w, h);
      const x = c.getContext('2d')!;
      x.fillStyle = col;
      x.beginPath();
      x.arc(w / 2, h / 2, radio, 0, Math.PI * 2);
      x.fill();
      return c;
    };
    const nombres = { robi: ['normal', 'gorrito', 'golpe'], peor: ['normal', 'golpe'], penultima: ['normal', 'escupe', 'enfadada', 'golpe'] }[j];
    return { w, h, radio, frames: Object.fromEntries(nombres.map((n) => [n, f(n === 'golpe' ? '#ffffff' : '#8a8aa0')])) };
  });
}

/** Aceituna running across the floor (stage 3): 4 frames, 20 × 14, facing right, feet at the bottom. */
export function aceituna(): HTMLCanvasElement[] {
  return una('aceituna', () =>
    [0, 1, 2, 3].map(() => {
      const c = lienzo(20, 14);
      const x = c.getContext('2d')!;
      x.fillStyle = '#1a1a1a';
      x.fillRect(2, 4, 16, 8);
      return c;
    }),
  );
}

/** Guille's bear-hug shield (and the «escudo» item's): 2 frames, 32 × 40, centred on the player (feet at y = 36). */
export function escudo(): HTMLCanvasElement[] {
  return una('escudo', () =>
    [0, 1].map(() => {
      const c = lienzo(32, 40);
      const x = c.getContext('2d')!;
      x.strokeStyle = '#ffd36a';
      x.strokeRect(1, 1, 30, 38);
      return c;
    }),
  );
}
