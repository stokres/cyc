// PokéUsera · the title backdrop: a night street in Usera. Brick buildings with lit windows, the Bar del Brío
// with its neon sign, a string of bulbs across the street, a terrace and the pavement where the useritos party.
// Everything is baked once per screen height into a handful of canvases (the still backdrop plus small
// «lit» layers for the stars, the bulbs and the neon); the screen only blits them, so a frame is a few drawImage.
import { ANCHO } from '../pantalla';
import { anchoTexto2, dibujarTexto2 } from '../arte2/fuente2';
import { plataforma } from '../arte2/escena2';
import { mezclar, r } from '../arte2/ui2';
import { t } from './ui';

/** Where things go for a screen height `H` (the logo ends at `finLogo`; the useritos' feet at `yPies`). */
export function disenoTitulo(H: number) {
  const logoY = 18 + Math.round((H - 384) * 0.08);
  const finLogo = logoY + 90;
  const yR = finLogo + 14; // roof line of the bar
  const yPies = Math.max(Math.round(H * 0.68), yR + 150);
  const yG = yPies - 26; // where the facade meets the pavement
  const yBordillo = yPies + 18;
  // Parked truck and caravan: their wheels touch yV; the prompt goes below them (never on top of them).
  const yCalzada = yBordillo + 5;
  const yV0 = yCalzada + 44;
  const yPrompt = Math.min(Math.max(Math.round(H * 0.8), yV0 + 22), H - 54);
  const yV = Math.min(yV0, yPrompt - 4);
  return { logoY, finLogo, yR, yG, yPies, yBordillo, yV, yPrompt, xs: [10, 62, 114, 166], dy: [0, 8, 0, 8] };
}

export interface CapasTitulo {
  fondo: HTMLCanvasElement;
  /** Sparkles of the stars, three phases; drawn at y 0. */
  estrellas: HTMLCanvasElement[];
  /** Lit bulbs, even and odd ones; drawn at `yGuirnalda`. */
  bombillas: HTMLCanvasElement[];
  yGuirnalda: number;
  /** The neon sign lit (with its glow); drawn at (`xNeon`, `yNeon`). */
  neon: HTMLCanvasElement;
  xNeon: number;
  yNeon: number;
}

function lienzo(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d')!;
  cx.imageSmoothingEnabled = false;
  return [cv, cx];
}

function hash(x: number, y: number): number {
  let h = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

const BOMBILLAS = ['#ffd24a', '#ff5a4a', '#5ad27a', '#5aa0ff', '#ff7ac0'];

/** Brick wall with mortar lines and a speckle, `w`×`h`, in tones of `base`. */
function ladrillos(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string): void {
  r(cx, base, x, y, w, h);
  const mortero = mezclar(base, '#1a0e1a', 0.4);
  const claro = mezclar(base, '#ffffff', 0.08);
  for (let j = 0; j < h; j += 4) {
    r(cx, mortero, x, y + j + 3, w, 1);
    const off = (j >> 2) % 2 ? 4 : 0;
    for (let i = off; i < w; i += 8) r(cx, mortero, x + i, y + j, 1, 3);
  }
  for (let j = 0; j < h; j += 4) for (let i = 0; i < w; i += 4) if (hash(x + i, y + j) % 5 === 0) r(cx, claro, x + i + 1, y + j, 3, 2);
}

function ventanas(cx: CanvasRenderingContext2D, x: number, y: number, cols: number, filas: number, paso: [number, number], sem: number): void {
  for (let j = 0; j < filas; j++) {
    for (let i = 0; i < cols; i++) {
      const vx = x + i * paso[0];
      const vy = y + j * paso[1];
      const h = hash(i + sem, j + sem * 3) % 7;
      r(cx, '#1c1228', vx - 1, vy - 1, 8, 12);
      if (h < 4) {
        r(cx, h === 0 ? '#ffe9a0' : '#f4c64a', vx, vy, 6, 10);
        r(cx, '#c8902a', vx, vy + 7, 6, 3);
        r(cx, '#1c1228', vx + 3, vy, 1, 10); // mullion
        if (h === 2) r(cx, '#8a4a3a', vx, vy, 3, 5); // a curtain
      } else {
        r(cx, '#2c2040', vx, vy, 6, 10);
        r(cx, '#3a2c52', vx, vy, 6, 1);
      }
      r(cx, '#6a5a70', vx - 2, vy + 11, 10, 1); // sill
    }
  }
}

/** A string of bulbs sagging between points; returns the bulb list [x, y, colour]. */
function posicionesBombillas(y0: number): [number, number, string][] {
  const out: [number, number, string][] = [];
  for (let i = 0; i < 21; i++) {
    const x = 6 + i * 11.4;
    const u = (x % 120) / 60 - 1; // -1..1 inside each scallop
    out.push([Math.round(x), y0 + 2 + Math.round(11 * (1 - u * u)), BOMBILLAS[i % BOMBILLAS.length]]);
  }
  return out;
}

/** A caravan (84 wide, 34 tall incl. wheel), wheels at `yb`, left end at `x`. */
function caravana(cx: CanvasRenderingContext2D, x: number, yb: number): void {
  const t0 = yb - 30;
  r(cx, '#16101c', x - 8, yb - 9, 9, 2); // hitch
  r(cx, '#16101c', x, t0 - 1, 84, 28); // outline
  r(cx, '#e8dfc4', x + 1, t0, 82, 26);
  r(cx, '#f8f0d8', x + 1, t0, 82, 3); // lit roof edge
  r(cx, '#8a8070', x + 1, t0 + 23, 82, 3);
  r(cx, '#3e7a76', x + 1, t0 + 15, 82, 4); // teal stripe
  r(cx, '#d8402c', x + 1, t0 + 19, 82, 2);
  r(cx, '#b8a888', x + 30, t0 - 4, 14, 3); // roof vent
  r(cx, '#16101c', x + 30, t0 - 5, 14, 1);
  r(cx, '#16101c', x + 10, t0 + 4, 26, 12); // window
  r(cx, '#f4c64a', x + 11, t0 + 5, 24, 10);
  r(cx, '#ffe9a0', x + 11, t0 + 5, 24, 3);
  r(cx, '#8a4a3a', x + 11, t0 + 5, 5, 10);
  r(cx, '#16101c', x + 23, t0 + 5, 1, 10);
  r(cx, '#16101c', x + 56, t0 + 2, 15, 22); // door
  r(cx, '#c8b890', x + 57, t0 + 3, 13, 20);
  r(cx, '#f4c64a', x + 59, t0 + 5, 8, 7);
  r(cx, '#16101c', x + 68, t0 + 14, 1, 3);
  r(cx, '#ff5040', x + 1, t0 + 8, 2, 4); // tail light
  for (const wx of [x + 40]) {
    r(cx, '#16101c', wx - 6, yb - 12, 13, 13);
    r(cx, '#2a2438', wx - 5, yb - 11, 11, 11);
    r(cx, '#8a8a98', wx - 2, yb - 8, 5, 5);
  }
  // string of tiny bulbs under the awning edge
  for (let i = 0; i < 6; i++) r(cx, BOMBILLAS[i % BOMBILLAS.length], x + 5 + i * 13, t0 + 27, 2, 2);
}

/** A box truck (110 wide, 40 tall) facing right, wheels at `yb`, left end at `x`. */
function camion(cx: CanvasRenderingContext2D, x: number, yb: number): void {
  const t0 = yb - 36;
  r(cx, '#16101c', x, t0 - 1, 80, 34); // box outline
  r(cx, '#c8461a', x + 1, t0, 78, 32);
  r(cx, '#e8742c', x + 1, t0, 78, 3);
  r(cx, '#8a2e12', x + 1, t0 + 29, 78, 3);
  for (let i = 8; i < 78; i += 10) r(cx, '#a8381a', x + i, t0 + 3, 1, 26); // ribs
  r(cx, '#ffbd2a', x + 6, t0 + 11, 60, 5); // band
  r(cx, '#16101c', x + 6, t0 + 11, 60, 1);
  r(cx, '#16101c', x + 6, t0 + 15, 60, 1);
  for (let i = 0; i < 6; i++) r(cx, i % 2 ? '#3a1334' : '#fff0a0', x + 9 + i * 10, t0 + 12, 6, 3);
  r(cx, '#16101c', x + 80, t0 + 9, 28, 25); // cab outline
  r(cx, '#e8742c', x + 81, t0 + 10, 26, 22);
  r(cx, '#c8461a', x + 81, t0 + 26, 26, 6);
  r(cx, '#16101c', x + 90, t0 + 12, 16, 10); // window
  r(cx, '#5a8ac8', x + 91, t0 + 13, 14, 8);
  r(cx, '#a8d0f0', x + 91, t0 + 13, 5, 3);
  r(cx, '#16101c', x + 82, t0 + 5, 7, 5); // exhaust / mirror
  r(cx, '#ffe9a0', x + 105, t0 + 24, 3, 4); // headlight
  r(cx, '#fff8d0', x + 106, t0 + 25, 2, 2);
  r(cx, '#ff5040', x, t0 + 22, 2, 4); // tail light
  r(cx, '#9a9aa8', x + 106, t0 + 30, 4, 3); // bumper
  // light cone
  cx.fillStyle = 'rgba(255,235,150,0.14)';
  cx.beginPath();
  cx.moveTo(x + 108, t0 + 25);
  cx.lineTo(x + 130, t0 + 21);
  cx.lineTo(x + 130, t0 + 38);
  cx.closePath();
  cx.fill();
  for (const wx of [x + 14, x + 32, x + 94]) {
    r(cx, '#16101c', wx - 7, yb - 14, 15, 15);
    r(cx, '#2a2438', wx - 6, yb - 13, 13, 13);
    r(cx, '#8a8a98', wx - 2, yb - 9, 5, 5);
  }
}

function mesa(cx: CanvasRenderingContext2D, x: number, yBase: number): void {
  // two stools and a round table with a checked cloth and a jar of beer
  for (const dx of [-17, 11]) {
    r(cx, '#2a1630', x + dx + 1, yBase - 9, 6, 2);
    r(cx, '#c8602a', x + dx, yBase - 11, 8, 3);
    r(cx, '#e8884a', x + dx, yBase - 11, 8, 1);
    r(cx, '#2a1630', x + dx + 1, yBase - 8, 1, 8);
    r(cx, '#2a1630', x + dx + 6, yBase - 8, 1, 8);
  }
  r(cx, '#2a1630', x - 1, yBase - 14, 3, 14);
  r(cx, '#2a1630', x - 6, yBase - 1, 13, 2);
  r(cx, '#2a1630', x - 12, yBase - 25, 25, 7);
  r(cx, '#e8e0c8', x - 11, yBase - 24, 23, 5);
  for (let i = 0; i < 23; i += 4) r(cx, '#d8402c', x - 11 + i, yBase - 24, 2, 5);
  r(cx, '#2a1630', x - 12, yBase - 18, 25, 1);
  // jar
  r(cx, '#f4e6b0', x - 3, yBase - 33, 6, 3);
  r(cx, '#e8b83a', x - 3, yBase - 30, 6, 6);
  r(cx, '#fff0a0', x - 2, yBase - 30, 1, 5);
}

function construir(H: number): CapasTitulo {
  const L = disenoTitulo(H);
  const { yR, yG, yPies } = L;
  const [fondo, cx] = lienzo(ANCHO, H);
  // ----- sky: a deep blue-plum gradient glowing orange-plum toward the rooftops
  const g = cx.createLinearGradient(0, 0, 0, yR + 10);
  g.addColorStop(0, '#0e0c28');
  g.addColorStop(0.55, '#2a1650');
  g.addColorStop(1, '#8a4668');
  cx.fillStyle = g;
  cx.fillRect(0, 0, ANCHO, yR + 10);
  // banded dither on the gradient so it reads as pixel art
  for (let y = 0; y < yR + 10; y += 6) for (let x = (y / 6) % 2 ? 0 : 1; x < ANCHO; x += 2) if (hash(x, y) % 3 === 0) r(cx, 'rgba(20,10,50,0.18)', x, y, 1, 1);
  // stars (dim ones; the twinkle layers light a few)
  const estrellas: [number, number][] = [];
  for (let i = 0; i < 46; i++) {
    const x = hash(i, 1) % ANCHO;
    const y = 3 + (hash(i, 2) % Math.max(20, yR - 30));
    estrellas.push([x, y]);
    r(cx, i % 4 === 0 ? 'rgba(255,240,200,0.9)' : 'rgba(210,210,255,0.55)', x, y, 1, 1);
  }
  // moon
  for (let j = -8; j <= 8; j++) {
    for (let i = -8; i <= 8; i++) {
      const dentro = i * i + j * j <= 49;
      const hueco = (i - 3) * (i - 3) + (j + 2) * (j + 2) <= 36;
      if (dentro && !hueco) r(cx, '#f6edc0', 214 + i, 16 + j, 1, 1);
    }
  }
  // far skyline
  for (let x = 40; x < 204; ) {
    const w = 10 + (hash(x, 5) % 12);
    const h = 14 + (hash(x, 6) % 30);
    r(cx, '#2a1a44', x, yR - h, w, h + 10);
    for (let j = yR - h + 3; j < yR - 2; j += 5) for (let i = x + 2; i < x + w - 2; i += 4) if (hash(i, j) % 4 === 0) r(cx, '#c8a050', i, j, 2, 2);
    x += w;
  }
  // ----- brick buildings on both sides, taller than the bar
  const izqY = yR - 64;
  ladrillos(cx, 0, izqY, 44, yG - izqY, '#5a2e3a');
  r(cx, '#2a1630', 0, izqY - 3, 46, 4);
  r(cx, '#7a4a52', 0, izqY - 3, 46, 1);
  ventanas(cx, 6, izqY + 10, 4, 6, [10, 22], 3);
  const derY = yR - 44;
  ladrillos(cx, 196, derY, 44, yG - derY, '#52303a');
  r(cx, '#2a1630', 194, derY - 3, 46, 4);
  r(cx, '#7a4a52', 194, derY - 3, 46, 1);
  ventanas(cx, 202, derY + 10, 4, 5, [10, 22], 11);
  // night veil on the bricks so the logo reads over them
  r(cx, 'rgba(20,10,40,0.28)', 0, izqY - 3, 44, yG - izqY + 3);
  r(cx, 'rgba(20,10,40,0.28)', 196, derY - 3, 44, yG - derY + 3);
  // ----- the bar: teal facade with a wooden cornice, tiles at the foot
  const bx = 40;
  const bw = 160;
  r(cx, '#244a52', bx, yR, bw, yG - yR);
  for (let x = bx; x < bx + bw; x += 8) r(cx, '#1e3e46', x, yR + 30, 1, yG - yR - 30);
  r(cx, '#5e3e26', bx - 4, yR - 5, bw + 8, 6);
  r(cx, '#7a5434', bx - 4, yR - 5, bw + 8, 2);
  r(cx, '#46301e', bx - 4, yR + 1, bw + 8, 2);
  // tiled foot
  r(cx, '#e8dfc4', bx, yG - 14, bw, 14);
  for (let x = bx; x < bx + bw; x += 10) r(cx, '#c9bd9a', x, yG - 14, 1, 14);
  r(cx, '#c9bd9a', bx, yG - 7, bw, 1);
  r(cx, '#3e7a76', bx, yG - 16, bw, 2);
  r(cx, 'rgba(20,10,40,0.35)', bx, yG - 14, bw, 14);
  // sign board
  const sx = bx + 6;
  const sw = bw - 12;
  const sy = yR + 5;
  r(cx, '#0c0818', sx - 1, sy - 1, sw + 2, 28);
  r(cx, '#1a1230', sx, sy, sw, 26);
  r(cx, '#e0a83a', sx, sy, sw, 1);
  r(cx, '#a8741c', sx, sy + 25, sw, 1);
  r(cx, '#e0a83a', sx, sy, 1, 26);
  r(cx, '#a8741c', sx + sw - 1, sy, 1, 26);
  // neon text: dim in the backdrop, lit (with halo) in its own layer
  const rotulo = t('escenario.brio');
  const anchoRot = anchoTexto2(rotulo);
  const esc = anchoRot * 2 <= sw - 8 ? 2 : 1;
  const tx = sx + Math.round((sw - anchoRot * esc) / 2);
  const ty = sy + Math.round((26 - 9 * esc) / 2);
  const pintarRotulo = (c: CanvasRenderingContext2D, ox: number, oy: number, col: string) => {
    c.save();
    c.scale(esc, esc);
    dibujarTexto2(c, rotulo, Math.round((tx - ox) / esc), Math.round((ty - oy) / esc), col, null);
    c.restore();
  };
  pintarRotulo(cx, 0, 0, '#6a3060');
  const [neon, nx] = lienzo(sw, 26);
  const halo = (dx: number, dy: number, col: string) => {
    nx.save();
    nx.scale(esc, esc);
    dibujarTexto2(nx, rotulo, Math.round((tx - sx) / esc) + dx, Math.round((ty - sy) / esc) + dy, col, null);
    nx.restore();
  };
  nx.globalAlpha = 0.35;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) halo(dx, dy, '#ff2a8a');
  nx.globalAlpha = 1;
  halo(0, 0, '#ffb0d8');
  // a thin cyan underline tube
  r(nx, 'rgba(90,220,255,0.45)', 6, 23, sw - 12, 1);
  r(nx, '#8ae8ff', 8, 22, sw - 16, 1);
  // ----- bar windows (warm, with silhouettes) and the door
  for (const wx of [bx + 8, bx + bw - 50]) {
    r(cx, '#1c1228', wx - 1, yR + 36, 44, yG - yR - 62);
    r(cx, '#f4c64a', wx + 1, yR + 38, 40, yG - yR - 66);
    r(cx, '#ffe9a0', wx + 1, yR + 38, 40, 6);
    r(cx, '#c8902a', wx + 1, yG - 36, 40, 6);
    r(cx, '#1c1228', wx + 20, yR + 38, 2, yG - yR - 66);
    // bottles and a patron silhouette
    for (let i = 0; i < 4; i++) r(cx, '#5a3a2a', wx + 4 + i * 9, yG - 50 - (hash(wx, i) % 6), 3, 14);
    r(cx, '#6a3a2a', wx + 26, yG - 54, 8, 8);
    r(cx, '#6a3a2a', wx + 24, yG - 46, 12, 10);
    r(cx, '#8a4a3a', wx + 1, yR + 38, 5, yG - yR - 66);
    r(cx, '#8a4a3a', wx + 36, yR + 38, 5, yG - yR - 66);
    r(cx, '#6a5a70', wx - 3, yG - 30, 48, 3);
  }
  const dxp = bx + Math.round(bw / 2) - 14;
  r(cx, '#1c1228', dxp - 2, yR + 34, 32, yG - yR - 34);
  r(cx, '#6a3e22', dxp, yR + 36, 28, yG - yR - 36);
  r(cx, '#8a5a34', dxp, yR + 36, 28, 1);
  r(cx, '#f4c64a', dxp + 4, yR + 40, 20, 26);
  r(cx, '#ffe9a0', dxp + 4, yR + 40, 20, 5);
  r(cx, '#6a3e22', dxp + 13, yR + 40, 2, 26);
  r(cx, '#6a3e22', dxp + 4, yR + 52, 20, 2);
  r(cx, '#e8c24c', dxp + 22, yG - 24, 3, 3);
  // ----- pavement, curb and road
  r(cx, '#6a5a78', 0, yG, ANCHO, yPies + 18 - yG);
  for (let y = yG; y < yPies + 18; y += 9) r(cx, '#5a4a68', 0, y, ANCHO, 1);
  for (let y = yG, k = 0; y < yPies + 18; y += 9, k++) for (let x = (k % 2) * 12; x < ANCHO; x += 24) r(cx, '#5a4a68', x, y, 1, 9);
  const yBordillo = yPies + 18;
  r(cx, '#b8a8c0', 0, yBordillo, ANCHO, 3);
  r(cx, '#e0d4e4', 0, yBordillo, ANCHO, 1);
  r(cx, '#4a3a58', 0, yBordillo + 3, ANCHO, 2);
  r(cx, '#2a2038', 0, yBordillo + 5, ANCHO, H - yBordillo - 5);
  for (let x = 6; x < ANCHO; x += 44) r(cx, '#8a7a50', x, yBordillo + 26, 24, 2);
  // warm light pooling on the pavement from the windows and the door, and the neon's pink reflection on the road
  r(cx, 'rgba(255,200,100,0.12)', bx + 6, yG, 44, 28);
  r(cx, 'rgba(255,200,100,0.12)', bx + bw - 50, yG, 44, 28);
  r(cx, 'rgba(255,200,100,0.16)', dxp - 6, yG, 40, 36);
  for (let i = 0; i < 9; i++) r(cx, `rgba(255,90,160,${0.18 - i * 0.018})`, 54 + i * 2, yBordillo + 6 + i * 7, 132 - i * 4, 2);
  // parked caravan and truck, side view, lights on; then puddles under them that mirror the lights
  const yV = L.yV;
  r(cx, 'rgba(0,0,0,0.35)', 4, yV - 1, 100, 3);
  r(cx, 'rgba(0,0,0,0.35)', 108, yV - 1, 128, 3);
  caravana(cx, 6, yV);
  camion(cx, 112, yV);
  const charco = (px: number, py: number, pw: number, luces: [number, string][]) => {
    if (py + 5 > H - 24) return;
    r(cx, '#3a2c54', px, py, pw, 5);
    r(cx, '#4a3a6a', px + 2, py + 1, pw - 4, 3);
    for (const [lx, col] of luces) r(cx, col, lx, py + 1, 4, 3);
  };
  charco(14, yV + 4, 70, [[34, 'rgba(255,220,120,0.6)'], [58, 'rgba(255,220,120,0.6)'], [16, 'rgba(255,60,50,0.6)']]);
  charco(122, yV + 4, 108, [[218, 'rgba(255,240,170,0.7)'], [150, 'rgba(255,200,100,0.5)'], [124, 'rgba(255,60,50,0.6)']]);
  charco(56, yV + 12, 34, [[66, 'rgba(255,90,160,0.4)']]);
  // ----- terrace tables at the two ends of the pavement
  mesa(cx, 26, yG + 24);
  mesa(cx, 214, yG + 24);
  // ----- the useritos' mats (beer mats) on the pavement
  const mat = plataforma(26, 5);
  L.xs.forEach((x, i) => cx.drawImage(mat, x + 32 - Math.floor(mat.width / 2), yPies + L.dy[i] - 13));
  // ----- bulbs: dark ones in the backdrop, with the wire
  const yGu = yR + 30;
  const bomb = posicionesBombillas(yGu + 6);
  for (let x = 0; x < ANCHO; x++) {
    const u = (x % 120) / 60 - 1;
    r(cx, '#16101c', x, yGu + 4 + Math.round(11 * (1 - u * u)), 1, 1);
  }
  for (const [x, y, c] of bomb) {
    r(cx, '#16101c', x, y - 1, 2, 2);
    r(cx, mezclar(c, '#1c1228', 0.55), x - 1, y + 1, 4, 4);
  }
  // ----- lit layers
  const estCapas = [0, 1, 2].map((fase) => {
    const [cv, c] = lienzo(ANCHO, yR);
    estrellas.forEach(([x, y], i) => {
      if (i % 3 !== fase || y >= yR - 2) return;
      r(c, 'rgba(255,255,230,0.35)', x - 1, y, 3, 1);
      r(c, 'rgba(255,255,230,0.35)', x, y - 1, 1, 3);
      r(c, '#ffffff', x, y, 1, 1);
    });
    return cv;
  });
  const bombCapas = [0, 1].map((par) => {
    const [cv, c] = lienzo(ANCHO, 40);
    bomb.forEach(([x, y, col], i) => {
      if (i % 2 !== par) return;
      r(c, `${col}33`, x - 4, y - 3 - yGu, 10, 12);
      r(c, `${col}55`, x - 3, y - 2 - yGu, 8, 10);
      r(c, col, x - 1, y + 1 - yGu, 4, 4);
      r(c, mezclar(col, '#ffffff', 0.7), x, y + 1 - yGu, 2, 2);
    });
    return cv;
  });
  return { fondo, estrellas: estCapas, bombillas: bombCapas, yGuirnalda: yGu, neon, xNeon: sx, yNeon: sy };
}

const cache = new Map<number, CapasTitulo>();

/** The title backdrop layers for the screen height `H`, baked once (the last two heights are kept). */
export function capasTitulo(H: number): CapasTitulo {
  let c = cache.get(H);
  if (!c) {
    if (cache.size >= 2) cache.delete(cache.keys().next().value!);
    c = construir(H);
    cache.set(H, c);
  }
  return c;
}
