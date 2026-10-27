// The tiles as seen by the physics: who is solid, who is a one-way ledge, who hurts; and the box mover shared by Fran and the enemies.
import { TILE, type Sala } from './datos';

/** A room being played: its grid (a gate can close it live) and its exits. */
export interface Rejilla {
  sala: Sala;
  g: string[][];
  cols: number;
  rows: number;
}

export function crearRejilla(sala: Sala): Rejilla {
  return { sala, g: sala.filas.map((f) => [...f]), cols: sala.cols, rows: sala.rows };
}

/** What a box is allowed to go through. */
export interface Paso {
  /** Falls through one-way ledges (↓ + jump). */
  bajar?: boolean;
  /** Goes through the curtains «T». */
  telones?: boolean;
  /** Goes through the false walls «F» (only Fran does). */
  falsos?: boolean;
}

/** A box on the ground: x is the centre, y the feet. */
export interface Caja {
  x: number;
  y: number;
  hw: number;
  h: number;
}

const EPS = 0.001;

/** The character of a tile; outside the grid it depends on the exits. */
export function tile(r: Rejilla, c: number, f: number): string {
  if (f < 0) return '#';
  if (f >= r.rows) return '.';
  if (c < 0 || c >= r.cols) {
    const lado = c < 0 ? 'izq' : 'der';
    return r.sala.salidas.some((s) => s.lado === lado && f >= s.fila0 && f <= s.fila1) ? '.' : '#';
  }
  return r.g[f][c];
}

export const esSolido = (ch: string, p?: Paso) => ch === '#' || ch === 'N' || ch === 'X' || (ch === 'T' && !p?.telones) || (ch === 'F' && !p?.falsos);

/** Moves a box horizontally by `dx`, stopping at solid tiles. Returns true if it hit a wall. */
export function moverX(r: Rejilla, b: Caja, dx: number, p?: Paso): boolean {
  if (!dx) return false;
  const nx = b.x + dx;
  const f0 = Math.floor((b.y - b.h + EPS) / TILE);
  const f1 = Math.floor((b.y - EPS) / TILE);
  const borde = dx > 0 ? nx + b.hw : nx - b.hw;
  const c = Math.floor(borde / TILE);
  for (let f = f0; f <= f1; f++) {
    if (esSolido(tile(r, c, f), p)) {
      b.x = dx > 0 ? c * TILE - b.hw - EPS : (c + 1) * TILE + b.hw + EPS;
      return true;
    }
  }
  b.x = nx;
  return false;
}

/** Moves a box vertically by `dy`. Returns 1 if it landed, -1 if it hit its head, 0 otherwise. */
export function moverY(r: Rejilla, b: Caja, dy: number, p?: Paso): number {
  if (!dy) return 0;
  const c0 = Math.floor((b.x - b.hw + EPS) / TILE);
  const c1 = Math.floor((b.x + b.hw - EPS) / TILE);
  if (dy > 0) {
    const ny = b.y + dy;
    const f = Math.floor(ny / TILE);
    const antes = b.y;
    for (let c = c0; c <= c1; c++) {
      const ch = tile(r, c, f);
      const sup = ch === '=' && !p?.bajar && antes <= f * TILE + 1;
      if (esSolido(ch, p) || sup) {
        b.y = f * TILE - EPS;
        return 1;
      }
    }
    b.y = ny;
    return 0;
  }
  const ny = b.y + dy;
  const f = Math.floor((ny - b.h) / TILE);
  for (let c = c0; c <= c1; c++) {
    if (esSolido(tile(r, c, f), p)) {
      b.y = (f + 1) * TILE + b.h + EPS;
      return -1;
    }
  }
  b.y = ny;
  return 0;
}

/** Is there ground right under the feet (with a tolerance)? */
export function haySuelo(r: Rejilla, b: Caja, p?: Paso, tol = 2): boolean {
  const c0 = Math.floor((b.x - b.hw + EPS) / TILE);
  const c1 = Math.floor((b.x + b.hw - EPS) / TILE);
  const f = Math.floor((b.y + tol) / TILE);
  for (let c = c0; c <= c1; c++) {
    const ch = tile(r, c, f);
    if (esSolido(ch, p) || (ch === '=' && !p?.bajar && b.y <= f * TILE + tol)) return true;
  }
  return false;
}

/** Is there ground under a point (an enemy looking ahead for a ledge)? */
export function sueloEn(r: Rejilla, x: number, y: number): boolean {
  const c = Math.floor(x / TILE);
  const f = Math.floor((y + 4) / TILE);
  const ch = tile(r, c, f);
  return esSolido(ch) || ch === '=';
}

/** Does the box touch spikes? Only the lower part of a spike tile hurts. */
export function tocaPinchos(r: Rejilla, b: Caja): boolean {
  const c0 = Math.floor((b.x - b.hw + 4) / TILE);
  const c1 = Math.floor((b.x + b.hw - 4) / TILE);
  const f0 = Math.floor((b.y - b.h * 0.5) / TILE);
  const f1 = Math.floor((b.y - 1) / TILE);
  for (let f = f0; f <= f1; f++) {
    for (let c = c0; c <= c1; c++) {
      if (tile(r, c, f) !== '^') continue;
      if (b.y > f * TILE + TILE * 0.42) return true;
    }
  }
  return false;
}

/** Does a rectangle overlap a solid tile? (a shockwave stopping at a wall) */
export function chocaRect(r: Rejilla, x0: number, y0: number, x1: number, y1: number, p?: Paso): boolean {
  for (let f = Math.floor(y0 / TILE); f <= Math.floor((y1 - EPS) / TILE); f++) {
    for (let c = Math.floor(x0 / TILE); c <= Math.floor((x1 - EPS) / TILE); c++) if (esSolido(tile(r, c, f), p)) return true;
  }
  return false;
}
