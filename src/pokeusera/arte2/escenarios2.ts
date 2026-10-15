// PokéUsera · Edición Jarra (arte v2): the battle backdrops, baked once each (nothing is drawn per frame).
//
//  - 'brio':    the Bar del Brío (`fondoBar`, in escena2.ts).
//  - 'terraza': a bar terrace at night: striped awning with string lights, street lamps, plastic tables and
//               chairs on the pavement, the street and the facades of Usera behind.
//  - 'rural':   a country-house lounge (whitewashed walls, wooden beams, stone fireplace) turned into a drag
//               party: sequin curtain, runway, disco ball, coloured spots, feathers, boas and wigs.
//  - 'juan':    Bar Donde Juan: brown brick wall with the big abstract painting, black pendant lamps, a wine
//               rack, a yellow wall, terracotta floor tiles on the diagonal, dark wooden chairs with cream
//               seats, white tablecloths and hearty dishes (torreznos, croquetas, cocido, huevos rotos, chuletón).
//  - 'feria':   a fair at night: a big wheel with lights behind a shooting gallery and a candy-floss stall, bunting, and the
//               steel floor of a dodgem rink in front (a rubber barrier, little cars with their poles sparking).
//
// Same layout rule as the Bar: the top band (under the HUD) and the strips beside the panels carry the
// detail; the floor is calm and low-contrast so the sprites and plates read first (a veil is laid on at the
// end). Everything is `fillRect` (no antialiased paths, no SVG, no filters); the floors are written once into
// an ImageData created at bake time (never read back from a canvas).
import type { EscenarioId } from '../tipos';
import { fondoBar } from './escena2';

// The ids live in tipos.ts (the contract); re-exported here for the preview tool (tools/pokeusera-v2.ts).
export { ESCENARIOS } from '../tipos';
export type { EscenarioId } from '../tipos';

type Cx = CanvasRenderingContext2D;
type RGB = [number, number, number];

function lienzo(w: number, h: number): [HTMLCanvasElement, Cx] {
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

function rgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function mezcla(a: string, b: string, t: number): string {
  const A = rgb(a);
  const B = rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function r(cx: Cx, color: string, x: number, y: number, w: number, h: number): void {
  cx.fillStyle = color;
  cx.fillRect(x, y, w, h);
}

/** A filled pixel ellipse (row spans, no antialiasing). */
function elip(cx: Cx, color: string, xm: number, ym: number, rx: number, ry: number): void {
  cx.fillStyle = color;
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.25))));
    cx.fillRect(xm - w, ym + dy, w * 2 + 1, 1);
  }
}

/** A soft glow made of a few nested translucent ellipses (stepped, pixel-art style). */
function halo(cx: Cx, c: RGB, xm: number, ym: number, rx: number, ry: number, a: number, pasos = 4): void {
  for (let i = 0; i < pasos; i++) {
    const f = 1 - i / pasos;
    elip(cx, `rgba(${c[0]},${c[1]},${c[2]},${(a / pasos).toFixed(3)})`, xm, ym, Math.max(1, Math.round(rx * f)), Math.max(1, Math.round(ry * f)));
  }
}

/** A trapezoid (or cone) filled by rows: from row ya to yb, x range [a0,b0] at the top and [a1,b1] at the bottom. */
function trap(cx: Cx, color: string, ya: number, yb: number, a0: number, b0: number, a1: number, b1: number): void {
  cx.fillStyle = color;
  const n = Math.max(1, yb - ya);
  for (let y = ya; y < yb; y++) {
    const t = (y - ya) / n;
    const a = Math.round(a0 + (a1 - a0) * t);
    const b = Math.round(b0 + (b1 - b0) * t);
    cx.fillRect(Math.min(a, b), y, Math.abs(b - a) + 1, 1);
  }
}

// ------------------------------------------------------------------------------------------------ floors

interface OpcSuelo {
  ancho: number;
  alto: number;
  y0: number;
  vy: number;
  K: number;
  fw: number;
  /** Tile id of the floor point (X across, in tile widths from the centre; Z depth). */
  id: (X: number, Z: number) => number;
  color: (id: number, X: number, Z: number, x: number, y: number) => RGB;
  /** Colour of the joints between tiles (null: none). */
  junta: RGB | null;
  /** Far tiles melt into this colour over `brumaH` rows, up to `brumaF`. */
  bruma: RGB;
  brumaH: number;
  brumaF: number;
}

/** A floor in perspective from row y0 to the bottom (one ImageData, written once at bake time). */
function suelo(cx: Cx, o: OpcSuelo): void {
  const h = o.alto - o.y0;
  const img = cx.createImageData(o.ancho, h);
  const d = img.data;
  let a = new Int32Array(o.ancho + 1);
  let b = new Int32Array(o.ancho + 1);
  const fila = (y: number, dst: Int32Array): void => {
    const t = y - o.vy;
    const w = o.fw * t;
    const Z = o.K / t;
    for (let x = -1; x < o.ancho; x++) dst[x + 1] = o.id((x + 0.5 - o.ancho / 2) / w, Z);
  };
  fila(o.y0 - 1, b);
  for (let y = o.y0; y < o.alto; y++) {
    [a, b] = [b, a];
    fila(y, b);
    const t = y - o.vy;
    const w = o.fw * t;
    const Z = o.K / t;
    const f = Math.max(0, 1 - (y - o.y0) / o.brumaH) * o.brumaF;
    let i = (y - o.y0) * o.ancho * 4;
    for (let x = 0; x < o.ancho; x++, i += 4) {
      const id = b[x + 1];
      const X = (x + 0.5 - o.ancho / 2) / w;
      let c: RGB;
      if (o.junta && (b[x] !== id || a[x + 1] !== id)) c = o.junta;
      else c = o.color(id, X, Z, x, y);
      d[i] = c[0] + (o.bruma[0] - c[0]) * f;
      d[i + 1] = c[1] + (o.bruma[1] - c[1]) * f;
      d[i + 2] = c[2] + (o.bruma[2] - c[2]) * f;
      d[i + 3] = 255;
    }
  }
  cx.putImageData(img, 0, o.y0);
}

function tono(c: RGB, k: number): RGB {
  return [c[0] + k, c[1] + k, c[2] + k];
}

// ================================================================================================
//  LA TERRAZA
// ================================================================================================

/** A window of a facade: `lit` (warm light, a curtain), `dark` (sky reflection) or `persiana` (rolled-down blind). */
function ventana(cx: Cx, x: number, y: number, w: number, h: number, modo: 'luz' | 'oscura' | 'persiana', marco: string, k: number): void {
  r(cx, '#141830', x - 1, y - 1, w + 2, h + 2);
  r(cx, marco, x, y, w, h);
  if (modo === 'luz') {
    r(cx, '#f2c55a', x + 1, y + 1, w - 2, h - 2);
    r(cx, '#f8dc86', x + 1, y + 1, w - 2, 2);
    r(cx, k % 2 ? '#d8786a' : '#8ac0b0', x + 1, y + 1, 2, h - 2); // curtain
    r(cx, k % 2 ? '#d8786a' : '#8ac0b0', x + w - 3, y + 1, 2, h - 2);
    r(cx, '#c8974a', x + Math.floor(w / 2), y + 1, 1, h - 2);
  } else if (modo === 'oscura') {
    r(cx, '#2a3258', x + 1, y + 1, w - 2, h - 2);
    r(cx, '#3a467a', x + 1, y + 1, 2, h - 2);
    r(cx, '#46548c', x + 1, y + 1, 1, 4);
    r(cx, '#1c2240', x + Math.floor(w / 2), y + 1, 1, h - 2);
  } else {
    r(cx, '#7a8090', x + 1, y + 1, w - 2, h - 2);
    for (let j = 2; j < h - 1; j += 2) r(cx, '#5a6072', x + 1, y + j, w - 2, 1);
    r(cx, '#9aa0b0', x + 1, y + 1, w - 2, 1);
  }
  r(cx, '#9aa0b8', x - 1, y + h + 1, w + 2, 2); // sill
  r(cx, '#5a6082', x - 1, y + h + 2, w + 2, 1);
}

function balcon(cx: Cx, x: number, y: number, w: number, verde: boolean): void {
  r(cx, '#8a90a8', x, y, w, 2);
  r(cx, '#4a5070', x, y + 2, w, 1);
  r(cx, '#2a2e48', x, y - 5, w, 1);
  for (let i = 1; i < w - 1; i += 3) r(cx, '#2a2e48', x + i, y - 5, 1, 5);
  if (verde) {
    r(cx, '#2f6a3c', x + 2, y - 8, 4, 3);
    r(cx, '#4a9a52', x + 3, y - 9, 2, 2);
    r(cx, '#d85a7a', x + 4, y - 9, 1, 1);
    r(cx, '#2f6a3c', x + w - 7, y - 7, 4, 2);
  }
}

function aire(cx: Cx, x: number, y: number): void {
  r(cx, '#141830', x, y, 9, 7);
  r(cx, '#c8ccd8', x + 1, y + 1, 7, 5);
  r(cx, '#9aa0b4', x + 1, y + 4, 7, 2);
  r(cx, '#5a6078', x + 2, y + 2, 3, 3);
  r(cx, '#3a4058', x + 3, y + 3, 1, 1);
}

function fachada(cx: Cx, x0: number, x1: number, y0: number, yb: number, base: string, claro: string, oscuro: string): void {
  const w = x1 - x0;
  r(cx, base, x0, y0, w, yb - y0);
  // horizontal courses, very quiet
  for (let y = y0 + 3; y < yb; y += 4) r(cx, claro, x0, y, w, 1);
  // night shading: darker at the edges
  r(cx, oscuro, x0, y0, 2, yb - y0);
  r(cx, oscuro, x1 - 2, y0, 2, yb - y0);
  // cornice between floors and over the shops
  r(cx, '#141830', x0, yb - 33, w, 1);
  r(cx, claro, x0, yb - 32, w, 2);
  r(cx, oscuro, x0, yb - 30, w, 2);
}

function farmacia(cx: Cx, x: number, y: number): void {
  // projecting green-cross sign, lit
  r(cx, '#141830', x + 5, y - 6, 1, 6);
  halo(cx, [90, 255, 150], x + 6, y + 6, 16, 14, 0.2, 4);
  r(cx, '#0e3a24', x, y, 13, 13);
  r(cx, '#2ad070', x + 1, y + 1, 11, 11);
  r(cx, '#9effc0', x + 5, y + 2, 3, 9);
  r(cx, '#9effc0', x + 2, y + 5, 9, 3);
  r(cx, '#e8fff0', x + 5, y + 2, 3, 1);
}

function linterna(cx: Cx, x: number, y: number): void {
  r(cx, '#141830', x + 3, y - 4, 1, 4);
  halo(cx, [255, 70, 50], x + 3, y + 4, 8, 8, 0.25, 3);
  r(cx, '#5a1010', x, y, 7, 8);
  r(cx, '#e03a2a', x + 1, y + 1, 5, 6);
  r(cx, '#ff7a5a', x + 1, y + 1, 2, 4);
  r(cx, '#f0c040', x + 1, y + 3, 5, 1);
  r(cx, '#f0c040', x + 3, y + 8, 1, 3);
  r(cx, '#f0c040', x + 2, y + 11, 3, 1);
}

function farola(cx: Cx, x: number, yTop: number, ySuelo: number): void {
  // light cone first (translucent), then pole and lantern on top of it
  trap(cx, 'rgba(255,214,130,0.07)', yTop + 8, ySuelo + 6, x - 3, x + 3, x - 34, x + 34);
  trap(cx, 'rgba(255,224,150,0.06)', yTop + 8, ySuelo + 6, x - 2, x + 2, x - 20, x + 20);
  r(cx, '#0e1224', x - 1, yTop + 12, 3, ySuelo - yTop - 12);
  r(cx, '#3c4468', x - 1, yTop + 12, 1, ySuelo - yTop - 12);
  r(cx, '#0e1224', x - 3, ySuelo - 6, 7, 6); // base
  r(cx, '#2a3050', x - 2, ySuelo - 5, 2, 5);
  r(cx, '#0e1224', x - 2, yTop + 10, 5, 3);
  // lantern
  halo(cx, [255, 210, 120], x, yTop + 5, 22, 20, 0.4, 5);
  r(cx, '#0e1224', x - 5, yTop - 1, 11, 2);
  r(cx, '#0e1224', x - 3, yTop - 3, 7, 2);
  r(cx, '#0e1224', x - 5, yTop + 1, 1, 9);
  r(cx, '#0e1224', x + 5, yTop + 1, 1, 9);
  r(cx, '#fff2b8', x - 4, yTop + 1, 9, 8);
  r(cx, '#ffffff', x - 2, yTop + 2, 5, 5);
  r(cx, '#e8b84a', x - 4, yTop + 7, 9, 2);
  r(cx, '#0e1224', x - 4, yTop + 9, 9, 1);
}

function sillaPlastico(cx: Cx, x: number, y: number, c: string, espalda: boolean): void {
  const osc = mezcla(c, '#12101a', 0.55);
  const cla = mezcla(c, '#ffffff', 0.35);
  r(cx, 'rgba(10,12,30,0.35)', x - 1, y + 17, 14, 3);
  if (espalda) {
    r(cx, osc, x, y, 11, 10);
    r(cx, c, x + 1, y + 1, 9, 8);
    r(cx, cla, x + 1, y + 1, 9, 1);
    for (const sx of [3, 5, 7]) r(cx, osc, x + sx, y + 3, 1, 5);
  }
  r(cx, osc, x - 1, y + 9, 13, 5); // seat
  r(cx, c, x, y + 9, 11, 3);
  r(cx, cla, x, y + 9, 11, 1);
  r(cx, mezcla(c, '#12101a', 0.25), x, y + 12, 11, 1);
  r(cx, osc, x, y + 14, 2, 5);
  r(cx, osc, x + 9, y + 14, 2, 5);
  r(cx, c, x, y + 14, 1, 4);
  r(cx, c, x + 9, y + 14, 1, 4);
}

function mesaPlastico(cx: Cx, x: number, y: number, w: number, color: string): void {
  r(cx, 'rgba(10,12,30,0.35)', x - 1, y + 20, w + 4, 4);
  r(cx, '#4a5070', x + Math.floor(w / 2) - 1, y + 9, 3, 12);
  r(cx, '#2a3050', x + Math.floor(w / 2) - 7, y + 20, 15, 2);
  r(cx, '#6a7090', x + Math.floor(w / 2) - 7, y + 20, 15, 1);
  r(cx, '#363c5c', x, y, w, 10);
  r(cx, color, x + 1, y + 1, w - 2, 6);
  r(cx, mezcla(color, '#ffffff', 0.5), x + 1, y + 1, w - 2, 1);
  r(cx, mezcla(color, '#303858', 0.35), x + 1, y + 7, w - 2, 2);
  r(cx, mezcla(color, '#303858', 0.55), x + 1, y + 9, w - 2, 1);
}

function cana(cx: Cx, x: number, y: number): void {
  r(cx, '#141830', x, y - 6, 5, 7);
  r(cx, '#e8a82a', x + 1, y - 5, 3, 5);
  r(cx, '#fff6dc', x + 1, y - 6, 3, 2);
  r(cx, '#ffd870', x + 1, y - 4, 1, 3);
}

function fondoTerraza(ancho: number, alto: number): HTMLCanvasElement {
  const [cv, cx] = lienzo(ancho, alto);
  const NOCHE = '#1c2446';
  r(cx, NOCHE, 0, 0, ancho, alto);
  const yS = 28; // top of the facades (under the awning)
  const yB = 112; // base of the facades
  // ---- the cross street between two buildings (sky, far blocks, stars, a far lamp)
  const gx0 = 120;
  const gx1 = 152;
  for (let y = yS; y < yB; y++) r(cx, mezcla('#18204a', '#3a4a84', (y - yS) / (yB - yS)), gx0, y, gx1 - gx0, 1);
  for (let i = 0; i < 14; i++) {
    const h = hash(i, 7);
    r(cx, h % 3 ? '#9aa8d4' : '#e8eeff', gx0 + 2 + (h % (gx1 - gx0 - 4)), yS + ((h >>> 5) % 22), 1, 1);
  }
  r(cx, '#222a52', gx0, 60, 14, 52); // far blocks
  r(cx, '#2a3260', gx0 + 12, 50, 20, 62);
  r(cx, '#1c2244', gx0 + 26, 66, 8, 46);
  for (let i = 0; i < 12; i++) {
    const h = hash(i, 91);
    if (h % 3 === 0) r(cx, '#f0c45a', gx0 + 3 + (h % 26), 54 + ((h >>> 6) % 46), 2, 2);
  }
  halo(cx, [255, 220, 140], 136, 92, 9, 9, 0.35, 3);
  r(cx, '#0e1224', 135, 94, 2, 18);
  r(cx, '#fff2b8', 134, 91, 4, 3);
  // ---- facades
  const FACH: [number, number, string, string, string, string][] = [
    [0, 56, '#7a3c3c', '#823f40', '#5e2e34', '#c8a878'],
    [56, 122, '#9a7a52', '#a2825a', '#7a5e42', '#d8c8a0'],
    [152, 240, '#8a5a60', '#926268', '#6a444e', '#c0b8b0'],
  ];
  for (const [x0, x1, base, claro, oscuro] of FACH) fachada(cx, x0, x1, yS, yB, base, claro, oscuro);
  // windows, upper floors
  for (const [x0, x1, , , , marco] of FACH) {
    let k = 0;
    for (let x = x0 + 8; x + 11 < x1 - 4; x += 19) {
      const h = hash(x, 3);
      ventana(cx, x, 36, 10, 15, h % 5 === 0 ? 'persiana' : h % 3 === 0 ? 'oscura' : 'luz', marco, k++);
      ventana(cx, x, 60, 10, 15, h % 4 === 0 ? 'persiana' : h % 3 === 1 ? 'luz' : 'oscura', marco, k++);
    }
  }
  balcon(cx, 8, 56, 14, true);
  balcon(cx, 64, 80 - 24, 14, false);
  balcon(cx, 160, 56, 14, true);
  aire(cx, 44, 44);
  aire(cx, 205, 66);
  aire(cx, 108, 44);
  // laundry on a line
  r(cx, '#141830', 170, 30, 36, 1);
  [['#e8e0d0', 172], ['#d86a6a', 180], ['#6aa8d8', 187], ['#f0d070', 196]].forEach(([c, x]) => {
    r(cx, c as string, x as number, 31, 5, 7);
    r(cx, mezcla(c as string, '#202040', 0.3), x as number, 36, 5, 2);
  });
  // ---- ground-floor shops
  // left: a bazaar with red lanterns
  r(cx, '#141830', 4, 83, 48, 29);
  r(cx, '#f4d88a', 6, 91, 44, 21);
  for (let i = 0; i < 12; i++) {
    const h = hash(i, 55);
    r(cx, ['#e84a4a', '#4aa0e8', '#58c070', '#f0f0f0', '#e870b8'][h % 5], 8 + (h % 40), 93 + ((h >>> 4) % 16), 3, 3);
  }
  r(cx, '#b8903a', 6, 99, 44, 1);
  r(cx, '#b8903a', 6, 106, 44, 1);
  r(cx, '#a02424', 4, 82, 48, 9);
  r(cx, '#d83a34', 4, 82, 48, 2);
  for (let x = 7; x < 50; x += 5) r(cx, '#f0c040', x, 85, 3, 2);
  linterna(cx, 10, 91);
  linterna(cx, 42, 91);
  // middle: a bar with a neon pint glass in the window
  r(cx, '#141830', 62, 83, 54, 29);
  r(cx, '#e89a42', 64, 85, 50, 27);
  r(cx, '#f4b85c', 64, 85, 50, 5);
  for (let i = 0; i < 6; i++) {
    r(cx, ['#4f8a52', '#b0762c', '#7a6a9c', '#a85a3c'][i % 4], 68 + i * 8, 99, 3, 9);
    r(cx, '#3a2418', 68 + i * 8, 108, 3, 1);
  }
  r(cx, '#6a4528', 64, 108, 50, 4);
  halo(cx, [90, 230, 255], 100, 96, 14, 12, 0.35, 3);
  r(cx, '#16507a', 95, 87, 11, 16);
  r(cx, '#5ae0ff', 96, 88, 9, 3);
  r(cx, '#5ae0ff', 96, 91, 1, 11);
  r(cx, '#5ae0ff', 104, 91, 1, 11);
  r(cx, '#ff5ab0', 97, 94, 7, 1);
  r(cx, '#ff5ab0', 97, 98, 7, 1);
  // right: the pharmacy and a closed shop with its shutter
  r(cx, '#141830', 158, 83, 32, 29);
  r(cx, '#cfeed8', 160, 85, 28, 27);
  r(cx, '#8ad0a0', 160, 85, 28, 4);
  for (let x = 163; x < 186; x += 7) r(cx, '#5aa878', x, 98, 4, 8);
  farmacia(cx, 192, 84);
  r(cx, '#141830', 206, 84, 32, 28);
  r(cx, '#7a8090', 207, 85, 30, 27);
  for (let y = 86; y < 112; y += 2) r(cx, '#5a6072', 207, y, 30, 1);
  r(cx, '#9aa0b0', 207, 85, 30, 1);
  r(cx, 'rgba(255,90,180,0.65)', 214, 98, 14, 2); // a tag scribbled on the shutter
  r(cx, 'rgba(90,220,255,0.65)', 216, 101, 10, 2);
  // ---- the street: far pavement, road, kerb
  r(cx, '#566090', 0, yB, ancho, 5);
  r(cx, '#7a84b0', 0, yB, ancho, 1);
  r(cx, '#3a4268', 0, yB + 4, ancho, 1);
  r(cx, '#262a44', 0, yB + 5, ancho, 28);
  for (let x = 4; x < ancho; x += 30) r(cx, '#8a8f9c', x, yB + 18, 14, 1);
  for (let i = 0; i < 40; i++) {
    const h = hash(i, 17);
    r(cx, '#30355a', h % ancho, yB + 7 + ((h >>> 8) % 24), 3 + (h % 4), 1);
  }
  // reflections of the lamps on the wet road
  for (const x of [12, 228, 136]) r(cx, 'rgba(255,214,130,0.16)', x - 5, yB + 7, 10, 24);
  r(cx, '#8a92b8', 0, yB + 33, ancho, 2);
  r(cx, '#c6cce8', 0, yB + 33, ancho, 1);
  r(cx, '#4a5278', 0, yB + 35, ancho, 3);
  // ---- the terrace pavement: big slabs in perspective
  suelo(cx, {
    ancho,
    alto,
    y0: yB + 38,
    vy: 40,
    K: 3550,
    fw: 0.2,
    id: (X, Z) => Math.imul(Math.floor(X * 0.5), 7919) ^ Math.floor(Z * 0.5),
    color: (id, _X, _Z, x, y) => {
      const v = hash(x >> 1, y >> 1) % 17 === 0 ? -8 : 0;
      const base: RGB = ((id >>> 1) & 3) === 0 ? [92, 100, 134] : [86, 94, 128];
      return tono(base, v);
    },
    junta: [60, 68, 102],
    bruma: [66, 72, 108],
    brumaH: 70,
    brumaF: 0.5,
  });
  // pools of lamplight on the pavement
  for (const x of [12, 228]) {
    halo(cx, [255, 210, 130], x, yB + 62, 56, 22, 0.3, 4);
  }
  halo(cx, [255, 210, 130], 128, yB + 100, 70, 26, 0.12, 3);
  // ---- terrace furniture (red plastic chairs, white tables), kept to the strips between the panels
  const rojo = '#d8423a';
  const verde = '#46a86a';
  const mesas: [number, number, string][] = [
    [104, 150, rojo],
    [4, 156, verde],
    [186, 176, rojo],
  ];
  for (const [x, y, c] of mesas) {
    sillaPlastico(cx, x - 12, y - 6, c, true);
    sillaPlastico(cx, x + 36, y - 6, c, true);
  }
  for (const [x, y] of mesas) {
    mesaPlastico(cx, x, y, 32, '#e8ecf2');
    cana(cx, x + 7, y + 4);
    cana(cx, x + 20, y + 3);
    r(cx, '#f4f0e0', x + 13, y + 3, 5, 2); // a tapas plate
    r(cx, '#d8803a', x + 14, y + 2, 3, 1);
  }
  // ---- the awning: striped canvas, scalloped valance, shadow and string lights
  for (let x = 0; x < ancho; x += 10) {
    const par = (x / 10) % 2 === 0;
    r(cx, par ? '#d0463c' : '#f0e4cc', x, 0, 10, 20);
    r(cx, par ? '#e86a5a' : '#fff8e8', x, 0, 2, 20);
    r(cx, par ? '#a0302c' : '#d4c4a4', x + 8, 0, 2, 20);
    // scallop: a half disc under each stripe
    for (let j = 0; j < 6; j++) {
      const w = Math.round(5 * Math.sqrt(1 - ((j + 0.5) / 6) ** 2) * 2);
      r(cx, par ? '#d0463c' : '#f0e4cc', x + 5 - Math.floor(w / 2), 20 + j, Math.max(2, w), 1);
    }
    r(cx, par ? '#a0302c' : '#d4c4a4', x + 3, 25, 4, 1);
  }
  r(cx, '#6a1c1e', 0, 19, ancho, 1);
  r(cx, 'rgba(10,12,30,0.35)', 0, 27, ancho, 3);
  r(cx, 'rgba(10,12,30,0.18)', 0, 30, ancho, 3);
  // string lights: bulbs on two sagging wires
  for (const [y0, fase] of [[26, 0.4], [33, 2.2]] as [number, number][]) {
    for (let x = 0; x < ancho; x += 1) {
      const y = y0 + Math.round(3 * Math.sin((x / ancho) * Math.PI * 6 + fase) + 3);
      r(cx, '#0e1224', x, y, 1, 1);
    }
    for (let x = 6; x < ancho; x += 16) {
      const y = y0 + Math.round(3 * Math.sin((x / ancho) * Math.PI * 6 + fase) + 3);
      halo(cx, [255, 214, 120], x, y + 3, 6, 6, 0.28, 2);
      r(cx, '#fff2b8', x - 1, y + 1, 3, 3);
      r(cx, '#ffffff', x, y + 1, 1, 1);
    }
  }
  // lamp posts on top of everything, at the kerb
  farola(cx, 12, 26, yB + 38);
  farola(cx, 229, 26, yB + 38);
  // night veil: keeps contrast low so the sprites read first
  r(cx, 'rgba(28,36,74,0.10)', 0, 0, ancho, alto);
  return cv;
}

// ================================================================================================
//  CASA RURAL DRAG QUEEN
// ================================================================================================

const ARCO = ['#ff4fa8', '#ffb02e', '#ffe14a', '#4ad07a', '#3ab8f0', '#9a6af0'];

function piedraBloque(cx: Cx, x0: number, y0: number, w: number, h: number, sem: number): void {
  const grises = ['#a49c8e', '#948c80', '#b4ac9c', '#8a8478', '#9c9486'];
  r(cx, '#5c564c', x0, y0, w, h);
  for (let y = y0; y < y0 + h; y += 5) {
    let x = x0 - (hash(y, sem) % 6);
    while (x < x0 + w) {
      const bw = 8 + (hash(x, y + sem) % 7);
      const c = grises[hash(x + 1, y) % grises.length];
      const xa = Math.max(x0, x);
      const xb = Math.min(x0 + w, x + bw - 1);
      if (xb > xa) {
        r(cx, c, xa, y, xb - xa, Math.min(4, y0 + h - y));
        r(cx, mezcla(c, '#ffffff', 0.25), xa, y, xb - xa, 1);
        r(cx, mezcla(c, '#2a2218', 0.3), xa, Math.min(y + 3, y0 + h - 1), xb - xa, 1);
      }
      x += bw;
    }
  }
}

function chimenea(cx: Cx, x: number, y: number): void {
  // 70 wide: hood (trapezoid) and flue above, stone arch hearth below. (x, y) = top-left of the flue.
  const w = 70;
  piedraBloque(cx, x + 22, y, 26, 22, 1); // flue
  // hood
  for (let j = 0; j < 14; j++) {
    const a = x + 22 - Math.round((j / 14) * 14);
    const b = x + 48 + Math.round((j / 14) * 14);
    piedraBloque(cx, a, y + 22 + j, b - a, 1, 2 + j);
  }
  piedraBloque(cx, x + 8, y + 36, w - 16, 44, 4); // wall of the hearth
  // mantel (wooden beam)
  r(cx, '#3a2414', x + 2, y + 34, w - 4, 6);
  r(cx, '#7a5030', x + 2, y + 34, w - 4, 2);
  r(cx, '#5a3a20', x + 2, y + 36, w - 4, 2);
  // firebox
  r(cx, '#2a1c14', x + 20, y + 46, 30, 34);
  r(cx, '#120a08', x + 22, y + 48, 26, 32);
  for (let i = 0; i < 6; i++) piedraBloque(cx, x + 17 + i * 0, y + 46, 3, 34, 9);
  // fire
  halo(cx, [255, 140, 40], x + 35, y + 74, 24, 18, 0.35, 4);
  r(cx, '#3a2010', x + 24, y + 76, 22, 4);
  r(cx, '#5a3418', x + 26, y + 74, 18, 3);
  trap(cx, '#d4421a', y + 58, y + 76, x + 35, x + 35, x + 26, x + 44);
  trap(cx, '#f08a2a', y + 62, y + 76, x + 35, x + 35, x + 29, x + 41);
  trap(cx, '#ffd24a', y + 67, y + 76, x + 35, x + 35, x + 31, x + 39);
  r(cx, '#d4421a', x + 28, y + 64, 2, 10);
  r(cx, '#f08a2a', x + 41, y + 66, 2, 8);
  r(cx, '#fff3a0', x + 34, y + 72, 3, 4);
}

function boa(cx: Cx, x0: number, y0: number, x1: number, y1: number, caida: number, c: string, semilla: number): void {
  const osc = mezcla(c, '#401030', 0.4);
  const cla = mezcla(c, '#ffffff', 0.45);
  const n = x1 - x0;
  for (let x = 0; x <= n; x++) {
    const t = x / n;
    const y = Math.round(y0 + (y1 - y0) * t + caida * Math.sin(Math.PI * t));
    const h = 5 + (hash(x, semilla) % 2);
    r(cx, osc, x0 + x, y - 3, 1, h + 1);
    r(cx, c, x0 + x, y - 2, 1, h - 1);
    if (hash(x, semilla + 3) % 3 === 0) r(cx, cla, x0 + x, y - 2, 1, 1);
    if (hash(x, semilla + 5) % 4 === 0) r(cx, cla, x0 + x, y - 3 + h, 1, 1);
  }
}

/** A feather plume: a fan of feathers (soft leaf shapes) from a point. */
function plumero(cx: Cx, x: number, y: number, largo: number, colores: string[], abre: number): void {
  const n = colores.length;
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + ((i - (n - 1) / 2) / Math.max(1, n - 1)) * abre;
    const c = colores[i];
    const osc = mezcla(c, '#2a1030', 0.45);
    const cla = mezcla(c, '#ffffff', 0.5);
    for (let s = 2; s <= largo; s += 2) {
      const px = Math.round(x + Math.cos(ang) * s);
      const py = Math.round(y + Math.sin(ang) * s);
      const g = Math.max(1, Math.round(1 + 2.4 * Math.sin((s / largo) * Math.PI * 0.9)));
      elip(cx, osc, px, py, g + 1, g + 1);
    }
    for (let s = 2; s <= largo; s += 2) {
      const px = Math.round(x + Math.cos(ang) * s);
      const py = Math.round(y + Math.sin(ang) * s);
      const g = Math.max(1, Math.round(1 + 2.4 * Math.sin((s / largo) * Math.PI * 0.9)));
      elip(cx, c, px, py, g, g);
      if (g > 1) r(cx, cla, px - 1, py - 1, 1, 1);
    }
  }
}

function cabezaPeluca(cx: Cx, x: number, y: number, pelo: string, alta: number): void {
  // a mannequin head on a stick; (x, y) = centre of the head
  const osc = mezcla(pelo, '#2a1030', 0.5);
  const cla = mezcla(pelo, '#ffffff', 0.45);
  r(cx, '#5a3a24', x, y + 7, 1, 14);
  r(cx, '#5a3a24', x - 4, y + 20, 9, 2);
  elip(cx, osc, x, y - alta + 1, 9, 8 + alta / 2); // big bouffant
  elip(cx, pelo, x, y - alta + 1, 8, 7 + alta / 2);
  elip(cx, osc, x - 8, y + 2, 3, 6);
  elip(cx, osc, x + 8, y + 2, 3, 6);
  elip(cx, pelo, x - 8, y + 2, 2, 5);
  elip(cx, pelo, x + 8, y + 2, 2, 5);
  elip(cx, '#2a1020', x, y + 1, 5, 6);
  elip(cx, '#f4cfae', x, y + 1, 4, 5);
  r(cx, '#2a1020', x - 3, y, 2, 1);
  r(cx, '#2a1020', x + 1, y, 2, 1);
  r(cx, '#e04a78', x - 1, y + 3, 3, 1);
  r(cx, cla, x - 5, y - alta - 3, 3, 1);
  r(cx, cla, x - 6, y - alta - 2, 1, 2);
  r(cx, '#ffe14a', x - 1, y - alta - 7, 3, 2); // little tiara
  r(cx, '#fff6b0', x, y - alta - 8, 1, 1);
}

function bolaEspejos(cx: Cx, x: number, y: number, rad: number): void {
  halo(cx, [255, 255, 255], x, y, rad * 3, rad * 3, 0.22, 4);
  r(cx, '#2a2438', x, 0, 1, y - rad);
  const pal = ['#f4f6fc', '#c8cedf', '#9aa2bc', '#dfe3f2', '#7a84a2', '#ffffff'];
  const rare = ['#ff6ab8', '#5ae0f0', '#ffe14a', '#8aff9a'];
  for (let j = -rad; j <= rad; j++) {
    for (let i = -rad; i <= rad; i++) {
      const d = i * i + j * j;
      if (d > rad * rad) continue;
      if (d > (rad - 1) * (rad - 1)) {
        r(cx, '#3a3450', x + i, y + j, 1, 1);
        continue;
      }
      const h = hash((x + i) >> 1, (y + j) >> 1);
      let c = pal[h % pal.length];
      if (h % 13 === 0) c = rare[(h >>> 4) % rare.length];
      // shade toward the lower right
      if (i + j > rad * 0.6) c = mezcla(c, '#2a2438', 0.45);
      else if (i + j < -rad * 0.6) c = mezcla(c, '#ffffff', 0.3);
      r(cx, c, x + i, y + j, 1, 1);
    }
  }
  r(cx, '#e8c24c', x - 1, y - rad - 3, 3, 3);
}

/** A stage spotlight (a can on the beam) with a translucent cone. */
function foco(cx: Cx, x: number, y: number, color: RGB, haciaX: number, haciaY: number, ancho: number): void {
  const [R, G, B] = color;
  trap(cx, `rgba(${R},${G},${B},0.13)`, y + 6, haciaY, x - 2, x + 2, haciaX - ancho, haciaX + ancho);
  trap(cx, `rgba(${R},${G},${B},0.10)`, y + 6, haciaY, x - 1, x + 1, haciaX - ancho * 0.55, haciaX + ancho * 0.55);
  // pool of light where it lands
  elip(cx, `rgba(${R},${G},${B},0.16)`, haciaX, haciaY, ancho, Math.round(ancho * 0.32));
  elip(cx, `rgba(${R},${G},${B},0.14)`, haciaX, haciaY, Math.round(ancho * 0.6), Math.round(ancho * 0.2));
  // the can
  r(cx, '#12101a', x - 5, y - 1, 11, 4);
  r(cx, '#3a3648', x - 4, y - 1, 9, 1);
  r(cx, '#12101a', x - 3, y + 3, 7, 4);
  r(cx, `rgb(${R},${G},${B})`, x - 2, y + 5, 5, 2);
  r(cx, '#ffffff', x - 1, y + 5, 3, 1);
  r(cx, '#12101a', x, 8, 1, y - 8);
}

function fondoRural(ancho: number, alto: number): HTMLCanvasElement {
  const [cv, cx] = lienzo(ancho, alto);
  const yB = 112; // base of the wall
  // ---- whitewashed wall with trowel marks
  r(cx, '#e8e0cc', 0, 0, ancho, yB);
  for (let i = 0; i < 150; i++) {
    const h = hash(i, 5);
    const x = h % ancho;
    const y = ((h >>> 8) % (yB - 14)) + 10;
    r(cx, h % 3 ? '#ddd4bc' : '#f4eedd', x, y, 3 + (h % 5), 1 + ((h >>> 3) % 2));
  }
  // rustic skirting of wood planks
  r(cx, '#6a4426', 0, yB - 16, ancho, 16);
  for (let x = 0; x < ancho; x += 9) {
    r(cx, '#523520', x, yB - 16, 1, 16);
    r(cx, '#8a5e38', x + 1, yB - 16, 1, 16);
  }
  r(cx, '#3a2414', 0, yB - 16, ancho, 1);
  r(cx, '#9a6c40', 0, yB - 15, ancho, 1);
  r(cx, '#3a2414', 0, yB - 2, ancho, 2);
  // ---- chimney (left)
  chimenea(cx, 6, 14);
  // the boa on the mantel and a wig head next to it
  boa(cx, 8, 48, 74, 50, 5, '#ff4fa8', 11);
  // ---- the sequin curtain in the middle (a door opening), with a gold rail
  const cx0 = 96;
  const cw = 44;
  r(cx, '#2a1838', cx0 - 2, 18, cw + 4, yB - 18);
  for (let i = 0; i < cw; i++) {
    const c = ARCO[(Math.floor(i / 2) + (i >> 4)) % ARCO.length];
    const cc = mezcla(c, '#401850', i % 4 === 0 ? 0.35 : 0);
    r(cx, cc, cx0 + i, 20, 1, yB - 22);
    if (i % 3 === 0) r(cx, mezcla(c, '#ffffff', 0.55), cx0 + i, 24 + ((hash(i, 4) % 8) * 9) % (yB - 40), 1, 5);
    if (i % 2 === 0) r(cx, mezcla(c, '#ffffff', 0.35), cx0 + i, 20 + (hash(i, 9) % 60), 1, 2);
  }
  for (let y = 22; y < yB - 2; y += 6) r(cx, 'rgba(255,255,255,0.10)', cx0, y, cw, 1);
  r(cx, '#e8c24c', cx0 - 3, 17, cw + 6, 3);
  r(cx, '#fff0a0', cx0 - 3, 17, cw + 6, 1);
  r(cx, '#9a7a28', cx0 - 3, 19, cw + 6, 1);
  // ---- the coat stand (right edge) with boas, feathers and wigs
  r(cx, '#5a3a24', 232, 30, 2, 82);
  r(cx, '#3a2414', 233, 30, 1, 82);
  r(cx, '#e8c24c', 229, 28, 8, 2);
  boa(cx, 223, 36, 236, 44, 6, '#3ad0e0', 21);
  boa(cx, 224, 50, 238, 62, 7, '#ffb02e', 31);
  // ---- ceiling beams (dark wood) with the spotlights hung on them
  r(cx, '#3a2414', 0, 0, ancho, 11);
  r(cx, '#6a4426', 0, 0, ancho, 3);
  r(cx, '#523520', 0, 3, ancho, 5);
  r(cx, '#2a180c', 0, 8, ancho, 3);
  for (let x = 0; x < ancho; x += 11) r(cx, '#2a180c', x + (hash(x, 1) % 7), 3, 1 + (hash(x, 2) % 3), 4);
  r(cx, '#2a180c', 0, 11, ancho, 1);
  r(cx, 'rgba(60,40,20,0.22)', 0, 12, ancho, 3);
  for (const x of [20, 74, 160, 214]) {
    r(cx, '#12101a', x, 1, 3, 3); // iron bracket
  }
  // a boa draped over the beam
  boa(cx, 0, 11, 70, 15, 5, '#c85aff', 41);
  boa(cx, 160, 11, 240, 14, 7, '#ff4fa8', 51);
  // ---- disco ball (centre-right strip) and its sparkles on the wall
  bolaEspejos(cx, 146, 38, 9);
  for (let i = 0; i < 46; i++) {
    const h = hash(i, 71);
    const x = h % ancho;
    const y = 16 + ((h >>> 8) % (yB - 30));
    const c = ['#ffffff', '#ff8ac8', '#8ae8ff', '#ffe98a'][h % 4];
    r(cx, c, x, y, 1, 1);
    if (h % 5 === 0) {
      r(cx, c, x - 1, y, 3, 1);
      r(cx, c, x, y - 1, 1, 3);
    }
  }
  // ---- floor: wooden planks in perspective, with the runway on top
  suelo(cx, {
    ancho,
    alto,
    y0: yB,
    vy: 20,
    K: 3550,
    fw: 0.1325,
    id: (X, Z) => {
      const col = Math.floor(X * 0.75);
      return Math.imul(col, 7919) ^ Math.floor((Z + (hash(col, 3) % 5)) / 3);
    },
    color: (id, _X, _Z, x, y) => {
      const h = hash(id & 0xffff, id >> 16) % 9;
      const base: RGB = [176 - h * 3, 122 - h * 3, 74 - h * 2];
      const grano = hash(x >> 3, y >> 1) % 11 === 0 ? -10 : 0;
      return tono(base, grano);
    },
    junta: [96, 62, 36],
    bruma: [205, 190, 160],
    brumaH: 60,
    brumaF: 0.4,
  });
  // the runway: a glossy plum strip, narrow at the back and wide in front, with a row of bulbs on each edge
  const yP = yB + 2;
  const centro = ancho / 2;
  const semi = (y: number) => 11 + Math.round((y - yP) * 0.4);
  for (let y = yP; y < alto; y++) {
    const s = semi(y);
    r(cx, y % 8 < 4 ? '#652878' : '#5e2470', centro - s, y, s * 2, 1);
  }
  for (let y = yP; y < alto; y++) {
    const s = semi(y);
    r(cx, '#3a1448', centro - s, y, 2, 1);
    r(cx, '#3a1448', centro + s - 2, y, 2, 1);
    r(cx, 'rgba(255,255,255,0.16)', centro - 2, y, 4, 1); // gloss streak
  }
  for (let y = yP + 3; y < alto; y += 12 + Math.floor((y - yP) / 30)) {
    const s = semi(y);
    const c = ARCO[Math.floor(y / 12) % ARCO.length];
    for (const sx of [centro - s - 1, centro + s - 1]) {
      halo(cx, rgb(mezcla(c, '#ffffff', 0.2)), sx + 1, y + 1, 5, 4, 0.3, 2);
      r(cx, '#2a1030', sx - 1, y - 1, 4, 4);
      r(cx, c, sx, y, 2, 2);
      r(cx, '#ffffff', sx, y, 1, 1);
    }
  }
  // spotlights beams and their pools (translucent)
  foco(cx, 47, 14, [255, 90, 190], 96, yB + 70, 22);
  foco(cx, 120, 14, [90, 220, 255], 150, yB + 96, 24);
  foco(cx, 192, 14, [255, 220, 90], 130, yB + 56, 20);
  foco(cx, 228, 14, [160, 110, 255], 190, yB + 104, 20);
  // feathers, boas and wigs lying around (the corners and the strip beside the runway)
  plumero(cx, 14, yB + 54, 24, ['#ff4fa8', '#ff8ac8', '#ffb4dc', '#ff6ab8'], 1.7);
  plumero(cx, 226, yB + 50, 22, ['#3ad0e0', '#8aeaf4', '#5ad8e8'], 1.5);
  boa(cx, 4, yB + 76, 70, yB + 84, 8, '#ffe14a', 61);
  boa(cx, 168, yB + 112, 238, yB + 104, 8, '#4ad07a', 71);
  // confetti on the floor
  for (let i = 0; i < 70; i++) {
    const h = hash(i, 123);
    r(cx, ARCO[h % ARCO.length], h % ancho, yB + 6 + ((h >>> 8) % (alto - yB - 8)), 2, 1);
  }
  // the wig stand and the vanity (left of the curtain, in front of the wall)
  cabezaPeluca(cx, 86, yB - 30, '#b86af0', 8);
  // colour wash: pink and cyan light spilling on the wall
  elip(cx, 'rgba(255,90,190,0.10)', 52, 52, 48, 40);
  elip(cx, 'rgba(90,220,255,0.10)', 186, 60, 44, 40);
  elip(cx, 'rgba(255,225,90,0.08)', 120, 80, 40, 24);
  // veil
  r(cx, 'rgba(240,226,200,0.10)', 0, 0, ancho, alto);
  return cv;
}

// ================================================================================================
//  BAR DONDE JUAN
// ================================================================================================

/** A dark wooden chair, front view: cream seat, back with square cut-outs. (x, y) = top-left of the back. */
function sillaMadera(cx: Cx, x: number, y: number, hueco: string): void {
  const osc = '#1c1418';
  const mad = '#3a2a2c';
  const cla = '#5a4244';
  r(cx, 'rgba(60,30,16,0.30)', x - 1, y + 21, 17, 3);
  r(cx, osc, x, y, 14, 12);
  r(cx, mad, x + 1, y + 1, 12, 10);
  r(cx, cla, x + 1, y + 1, 12, 1);
  r(cx, cla, x + 1, y + 1, 1, 10);
  for (const [sx, sy] of [[3, 3], [8, 3], [3, 7], [8, 7]]) {
    r(cx, osc, x + sx - 1, y + sy - 1, 4, 4);
    r(cx, hueco, x + sx, y + sy, 2, 2);
  }
  // seat
  r(cx, osc, x - 1, y + 12, 16, 5);
  r(cx, '#efe6c4', x, y + 12, 14, 3);
  r(cx, '#fffadc', x, y + 12, 14, 1);
  r(cx, '#cfc298', x, y + 14, 14, 1);
  r(cx, mad, x, y + 15, 14, 1);
  // legs
  r(cx, osc, x, y + 17, 3, 5);
  r(cx, osc, x + 11, y + 17, 3, 5);
  r(cx, mad, x, y + 17, 1, 4);
  r(cx, mad, x + 11, y + 17, 1, 4);
}

/** A square table with a white cloth, 3/4 view. (x, y) = top-left of the table top. */
function mesaMantel(cx: Cx, x: number, y: number, w: number): void {
  r(cx, 'rgba(60,30,16,0.28)', x + 1, y + 21, w + 2, 4);
  // top surface
  r(cx, '#a8b0b8', x, y, w, 9);
  r(cx, '#f6f8fa', x + 1, y + 1, w - 2, 7);
  r(cx, '#ffffff', x + 1, y + 1, w - 2, 1);
  r(cx, '#dde3e8', x + 1, y + 6, w - 2, 2);
  // cloth hanging in the front, with folds
  r(cx, '#b4bcc4', x, y + 9, w, 13);
  r(cx, '#eceff2', x + 1, y + 9, w - 2, 12);
  for (let i = 3; i < w - 3; i += 6) {
    r(cx, '#d2d8de', x + i, y + 9, 1, 12);
    r(cx, '#ffffff', x + i + 1, y + 9, 1, 8);
  }
  r(cx, '#c4cad2', x + 1, y + 20, w - 2, 2);
}

function platoTorreznos(cx: Cx, x: number, y: number): void {
  elip(cx, '#9aa0a8', x + 6, y + 1, 7, 3);
  elip(cx, '#f4f4ee', x + 6, y, 6, 2);
  for (const [dx, dy, wd] of [[1, -3, 5], [5, -4, 5], [8, -2, 4]]) {
    r(cx, '#6a3418', x + dx, y + dy, wd, 4);
    r(cx, '#c9803a', x + dx + 1, y + dy, wd - 1, 3);
    r(cx, '#f0d88a', x + dx + 1, y + dy + 1, wd - 2, 1); // the fat line
    r(cx, '#e8a850', x + dx + 1, y + dy, 2, 1);
  }
}

function platoCroquetas(cx: Cx, x: number, y: number): void {
  elip(cx, '#9aa0a8', x + 6, y + 1, 7, 3);
  elip(cx, '#f4f4ee', x + 6, y, 6, 2);
  for (const [dx, dy] of [[1, -3], [5, -4], [9, -3], [3, -1], [7, -1]]) {
    r(cx, '#8a4a18', x + dx, y + dy, 4, 3);
    r(cx, '#d9a24a', x + dx, y + dy, 3, 2);
    r(cx, '#f3cd7a', x + dx, y + dy, 1, 1);
  }
}

function ollaCocido(cx: Cx, x: number, y: number): void {
  // an earthenware pot with chickpeas, a chorizo and a cabbage leaf, steam above
  r(cx, '#5a2a14', x, y - 7, 14, 8);
  r(cx, '#b8642e', x + 1, y - 6, 12, 6);
  r(cx, '#d88a4a', x + 1, y - 6, 3, 5);
  r(cx, '#8a4420', x + 10, y - 6, 3, 6);
  r(cx, '#5a2a14', x - 2, y - 8, 18, 3);
  r(cx, '#c8703a', x - 1, y - 8, 16, 1);
  r(cx, '#e8c868', x + 1, y - 7, 12, 1); // chickpeas
  r(cx, '#f4dc88', x + 3, y - 7, 2, 1);
  r(cx, '#d83a2a', x + 5, y - 9, 5, 2); // chorizo
  r(cx, '#8a1c18', x + 5, y - 8, 5, 1);
  r(cx, '#5aa850', x + 2, y - 9, 3, 2);
  r(cx, '#5a2a14', x - 3, y - 5, 2, 3); // handles
  r(cx, '#5a2a14', x + 15, y - 5, 2, 3);
  // steam
  for (const [dx, dy] of [[3, -12], [4, -14], [8, -13], [9, -15], [6, -17]]) r(cx, 'rgba(255,255,255,0.55)', x + dx, y + dy, 1, 2);
}

function platoHuevosRotos(cx: Cx, x: number, y: number): void {
  elip(cx, '#9aa0a8', x + 7, y + 1, 8, 3);
  elip(cx, '#f4f4ee', x + 7, y, 7, 2);
  for (let i = 0; i < 9; i++) r(cx, i % 3 ? '#e8b848' : '#f4d070', x + 2 + i, y - 3 + (i % 2), 1, 3); // chips
  r(cx, '#d8504a', x + 3, y - 2, 4, 2); // ham
  r(cx, '#f4e8d8', x + 5, y - 5, 5, 3); // white of the egg
  r(cx, '#fff6dc', x + 5, y - 5, 5, 1);
  r(cx, '#f0a420', x + 6, y - 5, 3, 3); // yolk
  r(cx, '#ffd45a', x + 6, y - 5, 1, 1);
}

function platoChuleton(cx: Cx, x: number, y: number): void {
  r(cx, '#5a3a20', x, y - 1, 17, 4); // wooden board
  r(cx, '#9a6a3a', x + 1, y - 1, 15, 2);
  r(cx, '#3a1c10', x + 1, y - 6, 14, 6); // steak, dark outline
  r(cx, '#9a3a22', x + 2, y - 5, 12, 4);
  r(cx, '#c4583a', x + 2, y - 5, 12, 1);
  r(cx, '#5a2010', x + 4, y - 4, 1, 3); // grill marks
  r(cx, '#5a2010', x + 8, y - 4, 1, 3);
  r(cx, '#5a2010', x + 11, y - 4, 1, 3);
  r(cx, '#f2e6c4', x + 13, y - 6, 3, 5); // fat rim
  r(cx, '#f6f0e0', x + 14, y - 8, 4, 3); // the bone
  r(cx, '#d8cfb4', x + 16, y - 7, 1, 2);
  r(cx, '#fffaf0', x + 5, y - 6, 2, 1); // a pinch of salt
}

function florero(cx: Cx, x: number, y: number): void {
  r(cx, '#cfe2e6', x, y - 4, 3, 4);
  r(cx, '#ffffff', x, y - 4, 1, 3);
  r(cx, '#4a9a52', x, y - 8, 1, 4);
  r(cx, '#5ab862', x + 1, y - 9, 1, 5);
  r(cx, '#3a7a42', x + 2, y - 7, 1, 3);
}

function lampara(cx: Cx, x: number, y: number, w: number): void {
  // a black drum lamp: the cord, the dark body and the bright white underside with its glow
  r(cx, '#141014', x + 4, 0, 1, y);
  r(cx, '#141014', x + w - 5, 0, 1, y);
  halo(cx, [255, 244, 214], x + w / 2, y + 9, w * 0.8, 14, 0.16, 3);
  r(cx, '#0a080c', x, y, w, 7);
  r(cx, '#2a262e', x + 1, y, w - 2, 1);
  r(cx, '#3a363e', x + 1, y + 1, 2, 5);
  r(cx, '#0a080c', x + 2, y + 7, w - 4, 2);
  r(cx, '#fffbe8', x + 3, y + 7, w - 6, 1);
  r(cx, '#ffffff', x + 6, y + 7, w - 12, 1);
  r(cx, '#f4ecc8', x + 4, y + 8, w - 8, 1);
}

function botellero(cx: Cx, x: number, y: number, w: number, h: number): void {
  r(cx, '#100c10', x, y, w, h);
  r(cx, '#2a2428', x + 1, y + 1, w - 2, h - 2);
  const col = ['#7a1c28', '#5a8a4a', '#d8d0a0', '#7a1c28', '#3a4a30'];
  for (let j = 0; j < Math.floor((h - 4) / 6); j++) {
    for (let i = 0; i < Math.floor((w - 4) / 6); i++) {
      const bx = x + 3 + i * 6;
      const by = y + 3 + j * 6;
      const c = col[hash(i, j) % col.length];
      r(cx, '#100c10', bx, by, 5, 4);
      r(cx, c, bx + 1, by + 1, 3, 2);
      r(cx, mezcla(c, '#ffffff', 0.4), bx + 1, by + 1, 1, 1);
      r(cx, '#9a949a', bx, by + 1, 1, 2); // the neck pointing to us
    }
  }
}

function cuadro(cx: Cx, x: number, y: number): void {
  // The big abstract painting (56×56): a cross of white, red and black shapes in a dark frame.
  const N = '#2e2628';
  const B = '#ece8e0';
  const Bs = '#bdb8ae';
  const R = '#b83a30';
  const Rc = '#e0604e';
  const K = '#14101a';
  r(cx, K, x, y, 56, 56);
  r(cx, '#4a3c40', x + 1, y + 1, 54, 1);
  r(cx, N, x + 2, y + 2, 52, 52);
  // black corner blocks, lighter edge lines
  r(cx, '#3a3034', x + 2, y + 2, 14, 18);
  r(cx, '#3a3034', x + 40, y + 2, 14, 18);
  r(cx, '#3a3034', x + 2, y + 38, 16, 16);
  r(cx, '#3a3034', x + 38, y + 38, 16, 16);
  const ix = x + 2;
  const iy = y + 2;
  const blanco = (xa: number, ya: number, w: number, h: number): void => {
    r(cx, K, ix + xa - 1, iy + ya - 1, w + 2, h + 2);
    r(cx, B, ix + xa, iy + ya, w, h);
    r(cx, Bs, ix + xa, iy + ya + h - 3, w, 3);
    r(cx, Bs, ix + xa + w - 2, iy + ya, 2, h);
    r(cx, '#ffffff', ix + xa, iy + ya, w - 2, 1);
  };
  // top: a wide trapezoid
  trap(cx, K, iy + 0, iy + 19, ix + 13, ix + 37, ix + 17, ix + 33);
  trap(cx, B, iy + 1, iy + 18, ix + 14, ix + 36, ix + 18, ix + 32);
  trap(cx, Bs, iy + 14, iy + 18, ix + 16, ix + 34, ix + 18, ix + 32);
  blanco(1, 22, 15, 15);
  blanco(35, 20, 16, 17);
  blanco(19, 39, 13, 12);
  // the two red bars and the scribbled strip between them
  r(cx, K, ix + 16, iy + 19, 20, 20);
  r(cx, R, ix + 17, iy + 20, 18, 6);
  r(cx, Rc, ix + 17, iy + 20, 18, 1);
  r(cx, '#82241e', ix + 17, iy + 25, 18, 1);
  r(cx, R, ix + 17, iy + 32, 18, 6);
  r(cx, Rc, ix + 17, iy + 32, 18, 1);
  r(cx, '#82241e', ix + 17, iy + 37, 18, 1);
  for (let i = 0; i < 9; i++) r(cx, i % 3 ? '#e8e4dc' : '#7a7470', ix + 18 + i * 2, iy + 27 + (i % 2) * 2, 2, 1 + (i % 2));
}

type Plato = 'cocido' | 'huevos' | 'chuleton' | 'torreznos';

/** A table with its two chairs and two dishes. (x, y) = top-left of the table top. */
function grupoMesa(cx: Cx, x: number, y: number, w: number, plato: Plato): void {
  sillaMadera(cx, x - 15, y, '#c8a888');
  sillaMadera(cx, x + w + 1, y, '#c8a888');
  mesaMantel(cx, x, y, w);
  florero(cx, x + 3, y + 5);
  if (plato === 'cocido') {
    ollaCocido(cx, x + 14, y + 8);
    platoTorreznos(cx, x + 24, y + 7);
  } else if (plato === 'huevos') {
    platoHuevosRotos(cx, x + 6, y + 7);
    platoCroquetas(cx, x + 22, y + 7);
  } else if (plato === 'chuleton') {
    platoChuleton(cx, x + 10, y + 7);
    platoTorreznos(cx, x + 1, y + 7);
  } else {
    platoTorreznos(cx, x + 8, y + 7);
    platoCroquetas(cx, x + 20, y + 7);
  }
}

function fondoJuan(ancho: number, alto: number): HTMLCanvasElement {
  const [cv, cx] = lienzo(ancho, alto);
  const yB = 112;
  // ---- brown brick wall
  const LAD = ['#92593a', '#86502f', '#9e6841', '#7e4c30', '#a47046'];
  r(cx, '#b49a80', 0, 0, ancho, yB); // light mortar
  for (let fila = 0, y = 0; y < yB; fila++, y += 4) {
    const off = fila % 2 ? 7 : 0;
    for (let x = -off; x < ancho; x += 15) {
      const h = hash(x, fila);
      const c = LAD[h % LAD.length];
      const xa = Math.max(0, x);
      const w = Math.min(x + 14, ancho) - xa;
      r(cx, c, xa, y, w, 3);
      r(cx, mezcla(c, '#ffffff', 0.14), xa, y, w, 1);
      r(cx, mezcla(c, '#2a160c', 0.25), xa, y + 2, w, 1);
    }
  }
  r(cx, 'rgba(40,20,12,0.16)', 0, 0, ancho, yB); // the wall sits in the shade
  // dark ceiling and its soft transition
  r(cx, '#1c1a24', 0, 0, ancho, 8);
  r(cx, '#2a2834', 0, 7, ancho, 1);
  r(cx, 'rgba(20,14,18,0.35)', 0, 8, ancho, 4);
  r(cx, 'rgba(20,14,18,0.18)', 0, 12, ancho, 6);
  // ---- the yellow wall at the right, with its shelf and a plant
  r(cx, '#d6b02e', 196, 28, 44, yB - 28);
  r(cx, '#c8a028', 196, 28, 2, yB - 28);
  for (let y = 32; y < yB; y += 8) r(cx, '#e0bc3e', 198, y, 42, 1);
  r(cx, '#20181c', 200, 62, 40, 3);
  r(cx, '#46363a', 200, 62, 40, 1);
  r(cx, '#cfe2e6', 224, 54, 3, 4);
  r(cx, '#4a9a52', 224, 49, 1, 5);
  r(cx, '#5ab862', 225, 48, 1, 6);
  r(cx, '#3a7a42', 226, 50, 1, 4);
  // ---- the wine rack (top right)
  botellero(cx, 196, 14, 44, 38);
  r(cx, 'rgba(255,244,214,0.10)', 196, 14, 44, 38);
  // ---- the big painting
  cuadro(cx, 100, 27);
  // wall washed by the lamps
  // ---- tables with white cloth, against the wall, with chairs and dishes
  grupoMesa(cx, 18, 84, 36, 'cocido');
  grupoMesa(cx, 96, 90, 36, 'huevos');
  grupoMesa(cx, 164, 84, 30, 'chuleton');
  // wall base
  r(cx, '#1c1418', 0, yB - 3, ancho, 3);
  r(cx, '#46363a', 0, yB - 3, ancho, 1);
  // ---- terracotta floor, tiles on the diagonal
  suelo(cx, {
    ancho,
    alto,
    y0: yB,
    vy: 30,
    K: 3550,
    fw: 0.1325,
    id: (X, Z) => {
      const a = Math.floor((X * 0.9 + Z * 0.85) / 2.2);
      const b = Math.floor((X * 0.9 - Z * 0.85) / 2.2);
      return Math.imul(a, 73856093) ^ Math.imul(b, 19349663);
    },
    color: (id, _X, _Z, x, y) => {
      const h = (id >>> 0) % 9;
      const base: RGB = [192 - h * 4, 110 - h * 3, 66 - h * 2];
      const gr = hash(x >> 1, y >> 1) % 21 === 0 ? -9 : 0;
      return tono(base, gr);
    },
    junta: [124, 66, 40],
    bruma: [150, 100, 68],
    brumaH: 40,
    brumaF: 0.45,
  });
  r(cx, 'rgba(70,34,20,0.20)', 0, yB, ancho, 3);
  // two more tables out on the floor (the strips the panels leave free)
  grupoMesa(cx, 78, 150, 38, 'chuleton');
  grupoMesa(cx, 38, 204, 38, 'torreznos');
  // ---- pendant lamps (on top of everything), and a warm wash from them
  lampara(cx, 20, 18, 34);
  lampara(cx, 112, 14, 34);
  lampara(cx, 160, 20, 32);
  // veil
  r(cx, 'rgba(236,214,180,0.14)', 0, 0, ancho, alto);
  return cv;
}

// ================================================================================================
//  LA FERIA
// ================================================================================================

/** A 1-pixel line (Bresenham): wheel spokes, struts and poles. */
function linea(cx: Cx, color: string, x0: number, y0: number, x1: number, y1: number): void {
  cx.fillStyle = color;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    cx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

const BOMBILLAS = ['#ffe27a', '#ff6ab8', '#6ae8ff', '#8cf07a', '#ffb04a'];

/** A fairground bulb: a bright 2×2 core with a soft halo of its own colour. */
function bombilla(cx: Cx, x: number, y: number, color: string, halo_ = 0.3): void {
  const c = rgb(color);
  halo(cx, c, x, y, 5, 5, halo_, 2);
  r(cx, color, x - 1, y - 1, 2, 2);
  r(cx, '#ffffff', x - 1, y - 1, 1, 1);
}

/** The big wheel: dark steel rim and spokes, two struts to the ground, cabins that hang straight down and bulbs all along the rim. */
function noria(cx: Cx, xc: number, yc: number, rad: number, ySuelo: number): void {
  const ACERO = '#4a5498';
  const ACERO_CLARO = '#8a94d8';
  // struts first (behind the wheel)
  linea(cx, ACERO, xc - 1, yc, xc - 26, ySuelo);
  linea(cx, ACERO, xc, yc, xc - 25, ySuelo);
  linea(cx, ACERO, xc + 1, yc, xc + 26, ySuelo);
  linea(cx, ACERO, xc, yc, xc + 25, ySuelo);
  linea(cx, ACERO_CLARO, xc - 1, yc + 1, xc - 26, ySuelo);
  // a soft wash of the lights behind it
  halo(cx, [255, 190, 255], xc, yc, rad + 10, rad + 10, 0.22, 4);
  // rim (two rings) and spokes
  for (let a = 0; a < 720; a++) {
    const t = (a / 720) * Math.PI * 2;
    cx.fillStyle = ACERO;
    cx.fillRect(Math.round(xc + Math.cos(t) * rad), Math.round(yc + Math.sin(t) * rad), 1, 1);
    cx.fillRect(Math.round(xc + Math.cos(t) * (rad - 2)), Math.round(yc + Math.sin(t) * (rad - 2)), 1, 1);
  }
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2 + 0.2;
    linea(cx, k % 2 ? ACERO : ACERO_CLARO, xc, yc, Math.round(xc + Math.cos(t) * rad), Math.round(yc + Math.sin(t) * rad));
  }
  // cabins: they hang from 12 points of the rim
  const COL = ['#ff6ab8', '#6ae8ff', '#ffe27a', '#8cf07a', '#ff9a4a', '#b08cff'];
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2 + 0.2;
    const x = Math.round(xc + Math.cos(t) * rad);
    const y = Math.round(yc + Math.sin(t) * rad);
    const c = COL[k % COL.length];
    r(cx, ACERO_CLARO, x, y, 1, 3);
    r(cx, '#12163a', x - 3, y + 3, 7, 6);
    r(cx, c, x - 2, y + 4, 5, 4);
    r(cx, mezcla(c, '#ffffff', 0.45), x - 2, y + 4, 5, 1);
    r(cx, mezcla(c, '#1a1040', 0.4), x - 2, y + 7, 5, 1);
  }
  // bulbs on the rim, in turns
  for (let k = 0; k < 24; k++) {
    const t = (k / 24) * Math.PI * 2;
    bombilla(cx, Math.round(xc + Math.cos(t) * (rad + 1)), Math.round(yc + Math.sin(t) * (rad + 1)), BOMBILLAS[k % BOMBILLAS.length], 0.34);
  }
  halo(cx, [255, 240, 200], xc, yc, 9, 9, 0.45, 3);
  r(cx, '#12163a', xc - 3, yc - 3, 7, 7);
  r(cx, '#ffe27a', xc - 2, yc - 2, 5, 5);
  r(cx, '#ffffff', xc - 1, yc - 1, 2, 2);
}

/** A bull's-eye target (red and white rings). */
function diana(cx: Cx, x: number, y: number, rad: number): void {
  elip(cx, '#3a1220', x, y, rad + 1, rad + 1);
  elip(cx, '#f4ecdc', x, y, rad, rad);
  elip(cx, '#d83a3a', x, y, Math.max(1, rad - 2), Math.max(1, rad - 2));
  elip(cx, '#f4ecdc', x, y, Math.max(1, rad - 4), Math.max(1, rad - 4));
  elip(cx, '#d83a3a', x, y, 1, 1);
}

/** A prize teddy for the shelf. */
function peluche(cx: Cx, x: number, y: number, c: string): void {
  r(cx, mezcla(c, '#2a1030', 0.5), x - 4, y + 2, 9, 7);
  r(cx, c, x - 3, y + 2, 7, 6);
  r(cx, mezcla(c, '#ffffff', 0.3), x - 3, y + 2, 7, 1);
  r(cx, mezcla(c, '#2a1030', 0.5), x - 3, y - 3, 3, 3);
  r(cx, mezcla(c, '#2a1030', 0.5), x + 1, y - 3, 3, 3);
  r(cx, mezcla(c, '#2a1030', 0.5), x - 3, y - 1, 7, 4);
  r(cx, c, x - 2, y - 1, 5, 3);
  r(cx, '#2a1030', x - 1, y, 1, 1);
  r(cx, '#2a1030', x + 1, y, 1, 1);
}

/** Bunting: a drooping wire with flags in turns. */
function banderines(cx: Cx, x0: number, x1: number, y: number, caida: number, fase: number): void {
  const COL = ['#ff5a7a', '#ffe27a', '#5ad0ff', '#8cf07a', '#ff9a4a', '#b08cff'];
  const n = x1 - x0;
  const yAt = (x: number) => y + Math.round(caida * Math.sin(((x - x0) / n) * Math.PI) + fase);
  for (let x = x0; x <= x1; x++) r(cx, '#0e1228', x, yAt(x), 1, 1);
  for (let x = x0 + 3, k = 0; x < x1 - 2; x += 6, k++) {
    const c = COL[k % COL.length];
    const y0 = yAt(x) + 1;
    r(cx, c, x - 2, y0, 5, 1);
    r(cx, c, x - 1, y0 + 1, 3, 1);
    r(cx, c, x, y0 + 2, 1, 1);
    r(cx, mezcla(c, '#ffffff', 0.4), x - 2, y0, 2, 1);
  }
}

/** A striped fairground awning (red and cream) with a row of bulbs under its edge. */
function toldoFeria(cx: Cx, x: number, y: number, w: number, h: number, a: string, b: string): void {
  for (let i = 0; i < w; i += 6) {
    const par = (i / 6) % 2 === 0;
    const c = par ? a : b;
    r(cx, c, x + i, y, Math.min(6, w - i), h);
    r(cx, mezcla(c, '#ffffff', 0.25), x + i, y, 1, h);
    r(cx, mezcla(c, '#1a1030', 0.3), x + Math.min(6, w - i) - 1 + i, y, 1, h);
  }
  r(cx, '#3a1830', x, y + h, w, 1);
  for (let i = 4; i < w; i += 9) bombilla(cx, x + i, y + h + 2, BOMBILLAS[(i / 9) % BOMBILLAS.length | 0], 0.3);
}

/** A tiny dodgem car, seen from the front-above: black rubber bumper all around, painted body, the seat and the pole that goes up with a spark. */
function cocheChoque(cx: Cx, x: number, y: number, c: string, chispa: boolean, espejo: boolean, largo = 15): void {
  const d = espejo ? -1 : 1;
  // shadow
  r(cx, 'rgba(10,14,34,0.35)', x + 1, y + 14, 24, 2);
  // pole up and back, with its spark
  const px = espejo ? x + 4 : x + 20;
  const top = y + 3 - largo;
  linea(cx, '#9aa4c8', px, y + 3, px + 5 * d, top);
  linea(cx, '#5a6494', px + 1, y + 3, px + 1 + 5 * d, top);
  if (chispa) {
    const sx = px + 5 * d;
    const sy = top - 1;
    halo(cx, [140, 230, 255], sx, sy, 7, 7, 0.4, 3);
    r(cx, '#ffffff', sx - 1, sy - 3, 2, 7);
    r(cx, '#ffffff', sx - 3, sy - 1, 7, 2);
    r(cx, '#7aeaff', sx - 4, sy, 1, 1);
    r(cx, '#7aeaff', sx + 4, sy, 1, 1);
    r(cx, '#ffe27a', sx - 2, sy - 2, 1, 1);
    r(cx, '#ffe27a', sx + 2, sy + 2, 1, 1);
  } else {
    r(cx, '#cfd6f0', px + 5 * d, top - 1, 2, 2);
  }
  // rubber bumper ring (rounded corners) and the painted body inside it, with its corners cut
  const anillo: [number, number][] = [[3, 20], [1, 24], [0, 26], [0, 26], [0, 26], [0, 26], [0, 26], [0, 26], [0, 26], [1, 24], [3, 20]];
  anillo.forEach(([dx, w], i) => r(cx, '#161826', x + dx, y + 3 + i, w, 1));
  r(cx, '#3a3f60', x + 3, y + 3, 20, 1);
  r(cx, '#2a2e44', x + 1, y + 4, 24, 1);
  const cuerpo: [number, number][] = [[4, 18], [2, 22], [2, 22], [2, 22], [2, 22], [2, 22], [3, 20], [4, 18]];
  cuerpo.forEach(([dx, w], i) => {
    const tono_ = i === 0 ? mezcla(c, '#ffffff', 0.4) : i >= 6 ? mezcla(c, '#1a1030', 0.4) : i >= 4 ? mezcla(c, '#1a1030', 0.18) : c;
    r(cx, tono_, x + dx, y + 5 + i, w, 1);
  });
  // seat back (rises behind the driver), cockpit and steering wheel
  r(cx, mezcla(c, '#1a1030', 0.6), x + 8, y + 1, 10, 5);
  r(cx, mezcla(c, '#ffffff', 0.25), x + 9, y + 2, 8, 2);
  elip(cx, mezcla(c, '#1a1030', 0.55), x + 13, y + 8, 5, 2);
  r(cx, '#1a1c2c', x + 11, y + 9, 5, 1);
  r(cx, '#ffffff', x + 12, y + 8, 2, 1);
  // headlights
  r(cx, '#fff2b8', x + 4, y + 10, 3, 2);
  r(cx, '#fff2b8', x + 19, y + 10, 3, 2);
}

function fondoFeria(ancho: number, alto: number): HTMLCanvasElement {
  const [cv, cx] = lienzo(ancho, alto);
  const yB = 112; // base of the booths
  const yP = 128; // where the dodgem floor starts
  // ---- night sky: deep blue to violet at the horizon
  for (let y = 0; y < yB; y++) r(cx, mezcla('#10153a', '#4a2a78', y / yB), 0, y, ancho, 1);
  for (let i = 0; i < 26; i++) {
    const h = hash(i, 5);
    r(cx, h % 3 ? '#9aa0d8' : '#f0f0ff', h % ancho, 18 + ((h >>> 8) % 60), 1, 1);
  }
  // far silhouettes of the fairground (a roller-coaster track and a tent) in a hazy blue
  for (let x = 0; x < ancho; x++) {
    const y = 84 + Math.round(10 * Math.sin(x / 13) + 6 * Math.sin(x / 5.3));
    r(cx, '#2a2a66', x, y, 1, 1);
    if (x % 9 === 0) r(cx, '#2a2a66', x, y, 1, yB - y);
  }
  trap(cx, '#262660', 78, yB, 14, 14, 0, 34);
  trap(cx, '#262660', 78, yB, 14, 14, 28, 0);
  // ---- the big wheel, behind everything else
  noria(cx, 146, 62, 42, yB);
  // ---- bunting across the top band
  banderines(cx, 0, ancho, 20, 4, 0);
  banderines(cx, 0, 130, 27, 3, 1);
  // ---- left: the shooting gallery (tiro al blanco): counter, targets, a shelf of prizes
  r(cx, '#12122c', 0, 70, 92, yB - 70);
  r(cx, '#3a2a58', 2, 78, 88, 34);
  r(cx, '#4e3a74', 2, 78, 88, 2);
  for (let x = 6; x < 88; x += 10) diana(cx, x + 4, 93, 4);
  r(cx, '#2a1a40', 2, 104, 88, 3);
  for (const [px, c] of [[10, '#d89a5a'], [28, '#ff8aa8'], [46, '#8ac8ff'], [64, '#b8f08a'], [80, '#ffd24a']] as [number, string][]) peluche(cx, px, 98, c);
  r(cx, '#2a1a40', 2, 106, 88, 1);
  toldoFeria(cx, 0, 70, 92, 7, '#d8383a', '#f6e8d0');
  // the counter with a toy rifle
  r(cx, '#6a3a22', 0, 106, 94, yB - 106);
  r(cx, '#8a4e2e', 0, 106, 94, 2);
  r(cx, '#4a2616', 0, yB - 1, 94, 1);
  r(cx, '#2a2a30', 58, 103, 22, 2);
  r(cx, '#6a3a22', 52, 104, 8, 3);
  for (let x = 6; x < 92; x += 9) bombilla(cx, x, 80, BOMBILLAS[(x / 9) % BOMBILLAS.length | 0], 0.28);
  // ---- right: a candy-floss and churros stall
  r(cx, '#12122c', 178, 76, 62, yB - 76);
  r(cx, '#5a2a4a', 180, 86, 58, yB - 86);
  r(cx, '#7a3a60', 180, 86, 58, 2);
  toldoFeria(cx, 176, 76, 64, 8, '#4a9ae8', '#f6e8d0');
  // candy floss cones: a pink cloud on a stick
  for (const [x, c] of [[190, '#ff9ac8'], [206, '#9ad8ff'], [222, '#ff9ac8']] as [number, string][]) {
    r(cx, '#e8d8b8', x, 98, 2, 12);
    elip(cx, c, x + 1, 95, 6, 5);
    elip(cx, mezcla(c, '#ffffff', 0.5), x - 1, 93, 3, 2);
  }
  r(cx, '#6a3a22', 178, 106, 62, yB - 106);
  r(cx, '#8a4e2e', 178, 106, 62, 2);
  // ---- a pole with a lamp between the stalls
  r(cx, '#0e1228', 95, 70, 2, yB - 70);
  bombilla(cx, 96, 70, '#ffe27a', 0.45);
  // ---- the dodgem barrier: padded rubber wall with a hazard stripe on top
  r(cx, '#0e1020', 0, yB, ancho, yP - yB);
  r(cx, '#2a2e48', 0, yB + 1, ancho, 9);
  r(cx, '#3a3f60', 0, yB + 1, ancho, 1);
  for (let x = 0; x < ancho; x += 8) {
    r(cx, '#e8c23a', x, yB + 11, 4, 3);
    r(cx, '#161826', x + 4, yB + 11, 4, 3);
  }
  r(cx, '#9aa4c8', 0, yB + 10, ancho, 1);
  r(cx, '#1a1c2c', 0, yB + 14, ancho, 2);
  // ---- the dodgem floor: dark steel plates in perspective, with their joints and a cold sheen
  suelo(cx, {
    ancho,
    alto,
    y0: yP,
    vy: 40,
    K: 3550,
    fw: 0.2,
    id: (X, Z) => Math.imul(Math.floor(X * 0.5), 7919) ^ Math.floor(Z * 0.5),
    color: (id, X, _Z, x, y) => {
      const v = hash(x >> 1, y >> 1) % 19 === 0 ? -8 : 0;
      const placa = (id >>> 1) & 3;
      const base: RGB = placa === 0 ? [74, 84, 112] : placa === 1 ? [68, 78, 106] : [72, 82, 110];
      // a long cold streak of light across the floor
      const brillo = Math.max(0, 14 - Math.abs(X - 0.35) * 22) + Math.max(0, 9 - Math.abs(X + 0.9) * 18);
      return tono(base, v + brillo);
    },
    junta: [44, 52, 78],
    bruma: [60, 52, 100],
    brumaH: 60,
    brumaF: 0.5,
  });
  // pools of coloured light on the steel from the stalls and the wheel
  halo(cx, [255, 120, 200], 30, yP + 40, 60, 18, 0.16, 4);
  halo(cx, [110, 220, 255], 150, yP + 90, 80, 22, 0.13, 4);
  halo(cx, [255, 220, 120], 210, yP + 150, 60, 20, 0.12, 4);
  // ---- three little dodgem cars in the strips the panels leave free; two of them have just bumped (a spark between them)
  cocheChoque(cx, 12, 166, '#e8483a', true, false);
  cocheChoque(cx, 52, 169, '#f2c230', false, true);
  halo(cx, [255, 240, 160], 42, 176, 9, 7, 0.45, 3);
  r(cx, '#ffffff', 41, 174, 2, 5);
  r(cx, '#ffffff', 39, 176, 6, 2);
  r(cx, '#ffe27a', 38, 175, 1, 1);
  r(cx, '#ffe27a', 45, 177, 1, 1);
  cocheChoque(cx, 106, 230, '#3a9ae8', true, true, 8);
  // ---- low veil: keeps the contrast down so the panels and the useritos read first
  r(cx, 'rgba(26,20,60,0.10)', 0, 0, ancho, alto);
  return cv;
}

// ================================================================================================

/** The battle backdrop for a scene, ancho × alto, baked once (the caller keeps it). */
export function fondoEscenario(id: EscenarioId, ancho = 240, alto = 360): HTMLCanvasElement {
  switch (id) {
    case 'terraza':
      return fondoTerraza(ancho, alto);
    case 'rural':
      return fondoRural(ancho, alto);
    case 'juan':
      return fondoJuan(ancho, alto);
    case 'feria':
      return fondoFeria(ancho, alto);
    default:
      return fondoBar(ancho, alto);
  }
}
