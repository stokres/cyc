// Small helpers to paint pixel art once into cached canvases (same idea as src/pang/arte/sprites.ts):
// char maps (one letter per pixel), crisp ellipses and a night grade. Nothing here runs per frame.

export const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};
export const ctx = (c: HTMLCanvasElement) => {
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  return x;
};

export type Pal = Record<string, string>;

/** Paints a char map: one letter per pixel; '.' or a letter not in the palette is empty. */
export function pintar(x: CanvasRenderingContext2D, filas: readonly string[], pal: Pal, ox = 0, oy = 0) {
  filas.forEach((fila, j) => {
    for (let i = 0; i < fila.length; i++) {
      const col = pal[fila[i]];
      if (!col) continue;
      let k = i + 1;
      while (k < fila.length && fila[k] === fila[i]) k++;
      x.fillStyle = col;
      x.fillRect(ox + i, oy + j, k - i, 1);
      i = k - 1;
    }
  });
}

/** A half map (its last column is the centre line) mirrored into a symmetrical whole. */
export const espejo = (m: readonly string[]) => m.map((f) => f + [...f].reverse().join(''));

/** Mirrors a whole map left to right. */
export const voltear = (m: readonly string[]) => m.map((f) => [...f].reverse().join(''));

export const rect = (x: CanvasRenderingContext2D, col: string, px: number, py: number, w: number, h: number) => {
  x.fillStyle = col;
  x.fillRect(px, py, w, h);
};

/** Crisp filled ellipse by scanlines. */
export function elipse(x: CanvasRenderingContext2D, col: string, cx: number, cy: number, rx: number, ry: number) {
  x.fillStyle = col;
  for (let j = Math.floor(cy - ry); j < Math.ceil(cy + ry); j++) {
    const dy = (j + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    const a = Math.round(cx - half);
    const b = Math.round(cx + half);
    if (b > a) x.fillRect(a, j, b - a, 1);
  }
}

/** Deterministic random generator: the art is the same on every load. */
export function azar(semilla: number) {
  let s = semilla >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** `#rrggbb` to [r, g, b]. */
export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mixes two hex colours. */
export function mezcla(a: string, b: string, t: number) {
  const A = rgb(a);
  const B = rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** The night grade: every opaque pixel multiplied by a blue tint (once, at paint time, no pixel read-back). */
export function noche(c: HTMLCanvasElement, tinte: [number, number, number] = [0.52, 0.6, 0.9]) {
  const t = lienzo(c.width, c.height);
  const y = ctx(t);
  y.drawImage(c, 0, 0);
  y.globalCompositeOperation = 'multiply';
  y.fillStyle = `rgb(${Math.round(tinte[0] * 255)},${Math.round(tinte[1] * 255)},${Math.round(tinte[2] * 255)})`;
  y.fillRect(0, 0, c.width, c.height);
  y.globalCompositeOperation = 'destination-in';
  y.drawImage(c, 0, 0);
  const x = ctx(c);
  x.clearRect(0, 0, c.width, c.height);
  x.drawImage(t, 0, 0);
  return c;
}

/** A copy of `src` flipped left to right. */
export function reflejar(src: HTMLCanvasElement) {
  const c = lienzo(src.width, src.height);
  const x = ctx(c);
  x.translate(src.width, 0);
  x.scale(-1, 1);
  x.drawImage(src, 0, 0);
  return c;
}

/** A copy rotated by `cuartos` quarter turns clockwise (exact on pixels). */
export function girar(src: HTMLCanvasElement, cuartos: number) {
  const q = ((cuartos % 4) + 4) % 4;
  const c = q % 2 ? lienzo(src.height, src.width) : lienzo(src.width, src.height);
  const x = ctx(c);
  x.translate(c.width / 2, c.height / 2);
  x.rotate((q * Math.PI) / 2);
  x.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}

const cache = new Map<string, unknown>();
/** Paints a thing the first time it is asked for and keeps it. */
export function una<T>(k: string, f: () => T): T {
  if (!cache.has(k)) cache.set(k, f());
  return cache.get(k) as T;
}
