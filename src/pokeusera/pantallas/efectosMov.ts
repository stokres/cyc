// PokéUsera · efectos visuales de los movimientos (docs/POKEUSERA.md, «Efectos de movimientos»).
//
// Módulo autónomo: la pantalla de combate llama a `lanzar` al empezar el golpe, a `paso(dt)` en cada fotograma
// y a `dibujar(ctx)` mientras `paso` devuelva true. No lleva texto.
//
// Rendimiento (docs/ESTILO.md, T5): cada sprite de partícula se hornea UNA vez en lienzos de unos pocos píxeles
// (perezosamente, la primera vez que un efecto lo pide) y se guarda a nivel de módulo; dibujar es solo drawImage
// de esos lienzos con posiciones enteras. Las partículas viven en un depósito fijo (64, creado una vez; sin
// asignaciones ni cierres por fotograma). Nada de SVG, filtros, sombras difuminadas, degradados por fotograma ni
// lecturas de píxeles. Si el depósito está lleno, la partícula nueva se descarta.
//
// Movimientos con diseño propio (el resto usa una chispa genérica del color de su tipo; los de estado sobre uno
// mismo, unos brillos): lluvia, almendrazo, traca, fogonazo, petardazo, chispazo, cierzo, chupitazo, garrafon,
// cancion, esporas, temblor, bocinazo.
import { COLOR_TIPO } from '../arte/paleta';
import { MOVS } from '../datos';
import type { Tipo } from '../tipos';

export interface PuntoFx {
  x: number;
  y: number;
}

type Hoja = HTMLCanvasElement[];

// ------------------------------------------------------------------------------------------------------------
// Azar (para que las vistas previas se repitan: `semillaFx`)
// ------------------------------------------------------------------------------------------------------------
let semilla = 20261013;
function az(): number {
  semilla = (semilla * 1664525 + 1013904223) >>> 0;
  return semilla / 4294967296;
}
/** Fija la semilla del azar de los efectos (solo para vistas previas y capturas). */
export function semillaFx(n: number): void {
  semilla = n >>> 0;
}
const entre = (a: number, b: number): number => a + (b - a) * az();

// ------------------------------------------------------------------------------------------------------------
// Horneado de sprites (se ejecuta una sola vez por sprite, la primera vez que hace falta)
// ------------------------------------------------------------------------------------------------------------
function lienzo(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
function ctxDe(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  return x;
}
function pix(x: CanvasRenderingContext2D, color: string, i: number, j: number, w = 1, h = 1): void {
  x.fillStyle = color;
  x.fillRect(i, j, w, h);
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
function mezcla(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const h = (v: number): string => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(r1 + (r2 - r1) * t)}${h(g1 + (g2 - g1) * t)}${h(b1 + (b2 - b1) * t)}`;
}

/** Dibuja filas de texto: cada carácter es un color de `pal` ('.' = transparente). */
function filas(f: string[], pal: Record<string, string>): HTMLCanvasElement {
  const w = f[0].length;
  const c = lienzo(w, f.length);
  const x = ctxDe(c);
  f.forEach((fila, j) => {
    if (fila.length !== w) throw new Error(`efectosMov: fila irregular (${fila})`);
    for (let i = 0; i < w; i++) {
      const col = pal[fila[i]];
      if (col) pix(x, col, i, j);
    }
  });
  return c;
}

/** Duplica cada píxel (para atrezo pequeño que tiene que leerse en una pantalla de 240 px). */
function amp(c: HTMLCanvasElement): HTMLCanvasElement {
  const r = lienzo(c.width * 2, c.height * 2);
  ctxDe(r).drawImage(c, 0, 0, r.width, r.height);
  return r;
}
const ampH = (h: Hoja): Hoja => h.map(amp);

/** Giros de 90° (exactos, sin deformar píxeles): 4 fotogramas. */
function girar(c: HTMLCanvasElement): Hoja {
  const out: Hoja = [];
  for (let q = 0; q < 4; q++) {
    const impar = q & 1;
    const w = impar ? c.height : c.width;
    const h = impar ? c.width : c.height;
    const r = lienzo(w, h);
    const x = ctxDe(r);
    x.translate(w / 2, h / 2);
    x.rotate((q * Math.PI) / 2);
    x.drawImage(c, -c.width / 2, -c.height / 2);
    out.push(r);
  }
  return out;
}

type Masc = (i: number, j: number) => boolean;
const disco =
  (cx: number, cy: number, r: number): Masc =>
  (i, j) =>
    (i - cx) ** 2 + (j - cy) ** 2 <= r * r + r * 0.6;
const union =
  (...m: Masc[]): Masc =>
  (i, j) =>
    m.some((f) => f(i, j));

interface Mat {
  ol: string;
  base: string;
  luz: string;
  som: string;
}

/** Pinta una máscara como una masa iluminada desde arriba a la izquierda (contorno de color + 3 tonos). */
function sombrear(w: number, h: number, dentro: Masc, m: Mat): HTMLCanvasElement {
  const c = lienzo(w, h);
  const x = ctxDe(c);
  const d: Masc = (i, j) => i >= 0 && j >= 0 && i < w && j < h && dentro(i, j);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (!d(i, j)) continue;
      let col = m.base;
      if (!d(i - 1, j) || !d(i + 1, j) || !d(i, j - 1) || !d(i, j + 1)) col = m.ol;
      else if (!d(i - 1, j - 1) || !d(i, j - 2) || !d(i - 2, j)) col = m.luz;
      else if (!d(i + 1, j + 1) || !d(i, j + 2) || !d(i + 2, j)) col = m.som;
      pix(x, col, i, j);
    }
  }
  return c;
}

function rellenarDisco(x: CanvasRenderingContext2D, color: string, cx: number, cy: number, r: number): void {
  const m = disco(cx, cy, r);
  for (let j = Math.floor(cy - r - 1); j <= cy + r + 1; j++) for (let i = Math.floor(cx - r - 1); i <= cx + r + 1; i++) if (m(i, j)) pix(x, color, i, j);
}

/** Estrella de cuatro puntas (astroide): borde, medio y centro. Lado 2r+1. */
function astro(r: number, fuera: string, medio: string, centro: string): HTMLCanvasElement {
  const c = lienzo(2 * r + 1, 2 * r + 1);
  const x = ctxDe(c);
  const lim = Math.pow(r, 0.62) + 0.05;
  for (let j = 0; j <= 2 * r; j++) {
    for (let i = 0; i <= 2 * r; i++) {
      const s = Math.pow(Math.abs(i - r), 0.62) + Math.pow(Math.abs(j - r), 0.62);
      if (s > lim) continue;
      pix(x, s <= lim * 0.34 ? centro : s <= lim * 0.7 ? medio : fuera, i, j);
    }
  }
  return c;
}

function linea(x: CanvasRenderingContext2D, color: string, x0: number, y0: number, x1: number, y1: number, g: number): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let k = 0; k <= n; k++) pix(x, color, Math.round(x0 + ((x1 - x0) * k) / n - (g - 1) / 2), Math.round(y0 + ((y1 - y0) * k) / n - (g - 1) / 2), g, g);
}

// ---- Cachés (nivel de módulo, perezosos) ------------------------------------------------------------------
const cache = new Map<string, Hoja>();
function memo(k: string, f: () => Hoja): Hoja {
  let h = cache.get(k);
  if (!h) {
    h = f();
    cache.set(k, h);
  }
  return h;
}
const sueltos = new Map<string, Hoja[]>();
/** Cada fotograma de una hoja como hoja de uno (para partículas que eligen variante sin ciclar). */
function unos(k: string, f: () => Hoja): Hoja[] {
  let h = sueltos.get(k);
  if (!h) {
    h = f().map((c) => [c]);
    sueltos.set(k, h);
  }
  return h;
}
function memoT(k: string, t: Tipo, f: (t: Tipo) => Hoja): Hoja {
  const kk = `${k}|${t}`;
  let h = cache.get(kk);
  if (!h) {
    h = f(t);
    cache.set(kk, h);
  }
  return h;
}

// ---- Paletas sueltas -----------------------------------------------------------------------------------------
const TINTA = '#3b2a3f';
const BLANCO = '#fff8e0';
const AMARILLO = '#ffd83a';
const AMARILLO_OSC = '#e0a83a';
const NARANJA = '#f08a24';
const ROJO = '#d4382c';
const ROJO_OSC = '#8c1c1c';
const MAT_HUMO: Mat = { ol: '#4a3a50', base: '#a89cae', luz: '#d8d0dc', som: '#7c6c88' };
const MAT_POLVO: Mat = { ol: '#8a6a44', base: '#d8bc8c', luz: '#f4e4bc', som: '#b8946a' };
const MAT_ESPORA: Mat = { ol: '#4a7a3a', base: '#a8d870', luz: '#e4f8a8', som: '#7cb04c' };
const MAT_FUEGO: Mat[] = [
  { ol: ROJO_OSC, base: NARANJA, luz: AMARILLO, som: ROJO },
  { ol: ROJO_OSC, base: NARANJA, luz: AMARILLO, som: ROJO },
  { ol: ROJO_OSC, base: NARANJA, luz: AMARILLO, som: ROJO },
  { ol: '#5a2a2a', base: ROJO, luz: NARANJA, som: ROJO_OSC },
  { ol: '#4a2a3a', base: '#a83a30', luz: '#d4582c', som: '#6a2430' },
];

// ---- Sprites sueltos -----------------------------------------------------------------------------------------
function hLenteja(): Hoja {
  const m: Mat = { ol: '#4a2e18', base: '#c08a4c', luz: '#ecc888', som: '#8a5a2c' };
  const elipse = (cx: number, cy: number, rx: number, ry: number): Masc => (i, j) => ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1;
  return [sombrear(11, 8, elipse(5, 3.5, 5.2, 3.6), m), sombrear(9, 8, elipse(4, 3.5, 4.2, 3.9), m)];
}
function hNube(): Hoja {
  const mat: Mat = { ol: '#2e2438', base: '#6e5f80', luz: '#a698ba', som: '#4a3c5c' };
  return [sombrear(46, 20, union(disco(10, 12, 6), disco(19, 9, 8), disco(29, 9, 8), disco(37, 12, 6), (i, j) => j >= 11 && j <= 16 && i >= 10 && i <= 37), mat)];
}
function hAlmendra(): Hoja {
  const elipse: Masc = (i, j) => ((i - 7.5) / 7.2) ** 2 + ((j - 4.5) / 3.9) ** 2 <= 1;
  const c = sombrear(15, 9, elipse, { ol: '#5a3a1c', base: '#e0c088', luz: '#f8e4b8', som: '#b08a50' });
  pix(ctxDe(c), '#8a6a3c', 4, 6, 6, 1);
  return girar(c);
}
function hAstilla(): Hoja {
  return ampH([filas(['tT', 'nt'], { T: '#f4dca8', t: '#e0c088', n: '#8a6a3c' })]);
}
function hChispa(): Hoja {
  return [astro(2, '#c8601a', AMARILLO, BLANCO), astro(3, '#c8601a', NARANJA, AMARILLO)];
}
function hFlashTraca(): Hoja {
  return [astro(5, '#c8601a', BLANCO, BLANCO), astro(9, '#c8601a', AMARILLO, BLANCO), astro(8, ROJO_OSC, NARANJA, AMARILLO), astro(4, ROJO_OSC, ROJO, ROJO)];
}
function hMecha(): Hoja {
  return [astro(3, '#c8601a', AMARILLO, BLANCO), astro(4, '#c8601a', BLANCO, BLANCO)];
}
function hBrasa(): Hoja {
  return ampH([filas(['oy', 'rR'], { o: NARANJA, y: AMARILLO, r: ROJO, R: ROJO_OSC })]);
}

/** Bola de fuego con lenguas: `r` por fotograma, lienzo cuadrado `tam`. */
function bolaFuego(tam: number, rs: number[], mats: Mat[], nucleo: boolean): Hoja {
  return rs.map((r, f) => {
    const c = tam / 2;
    const cy = c + 2;
    const lenguas: Masc = (i, j) => {
      for (let k = -1; k <= 1; k++) {
        const alto = r * (k === 0 ? 0.95 : 0.6) + ((f + k * 2 + 4) % 3);
        const dy = cy - r * 0.6 - j;
        if (dy < 0 || dy > alto) continue;
        if (Math.abs(i - (c + k * r * 0.62)) <= (r * 0.42 * (1 - dy / alto)) + 0.4) return true;
      }
      return false;
    };
    const cv = sombrear(tam, tam, union(disco(c, cy, r), lenguas), mats[Math.min(f, mats.length - 1)]);
    if (nucleo && r > 6) {
      const x = ctxDe(cv);
      rellenarDisco(x, f < 3 ? AMARILLO : NARANJA, c, cy + 1, r * 0.55);
      rellenarDisco(x, f < 3 ? BLANCO : AMARILLO, c, cy + 1, r * 0.3);
    }
    return cv;
  });
}
function hFuegoChico(): Hoja {
  return bolaFuego(24, [5, 6, 5], MAT_FUEGO, false);
}
function hFogonazo(): Hoja {
  return bolaFuego(50, [8, 13, 17, 16, 10], MAT_FUEGO, true);
}
function hExplosion(): Hoja {
  const T = 64;
  const c = T / 2;
  const rs = [5, 12, 19, 24, 27, 27];
  const mats: Mat[] = [
    { ol: AMARILLO_OSC, base: BLANCO, luz: '#ffffff', som: '#ffe66a' },
    { ol: '#c8601a', base: AMARILLO, luz: '#fff8c0', som: NARANJA },
    { ol: ROJO_OSC, base: NARANJA, luz: AMARILLO, som: ROJO },
    { ol: ROJO_OSC, base: NARANJA, luz: AMARILLO, som: ROJO },
    { ol: '#5a2a2a', base: ROJO, luz: NARANJA, som: ROJO_OSC },
    MAT_HUMO,
  ];
  return rs.map((r, f) => {
    const anillo: Masc = (i, j) => disco(c, c, r)(i, j) && !disco(c, c, r * 0.52)(i, j);
    const cv = sombrear(T, T, f === 5 ? anillo : union(disco(c, c, r), disco(c - r * 0.7, c + r * 0.3, r * 0.45), disco(c + r * 0.7, c - r * 0.2, r * 0.45), disco(c + r * 0.1, c - r * 0.75, r * 0.4)), mats[f]);
    if (f === 2 || f === 3) {
      const x = ctxDe(cv);
      rellenarDisco(x, AMARILLO, c, c, r * (f === 2 ? 0.55 : 0.4));
      rellenarDisco(x, BLANCO, c, c, r * (f === 2 ? 0.3 : 0.2));
    }
    return cv;
  });
}
function hPetardo(): Hoja {
  return girar(amp(filas(['..y..', '.yoy.', '..k..', 'kkkkk', 'krrRk', 'kwwwk', 'krrRk', 'kwwwk', 'krrRk', 'kkkkk'], { y: AMARILLO, o: NARANJA, k: TINTA, r: ROJO, R: ROJO_OSC, w: BLANCO })));
}
function hEscombro(): Hoja {
  return ampH([filas(['nN', 'Nk'], { n: '#a86a2c', N: '#6a3a1c', k: TINTA }), filas(['rR', 'Rk'], { r: ROJO, R: ROJO_OSC, k: TINTA })]);
}
function hHumo(): Hoja {
  return [6, 9, 12].map((r) => sombrear(2 * r + 3, 2 * r + 3, disco(r + 1, r + 1, r), MAT_HUMO));
}
function hRayo(): Hoja {
  const vars: [number, number][][] = [
    [[16, 3], [6, 24], [18, 28], [5, 54], [16, 58], [9, 84]],
    [[7, 3], [17, 22], [5, 31], [18, 52], [8, 60], [14, 84]],
  ];
  return vars.map((pts) => {
    const c = lienzo(24, 90);
    const x = ctxDe(c);
    const trazo = (col: string, g: number): void => {
      for (let k = 0; k < pts.length - 1; k++) linea(x, col, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], g);
    };
    trazo(AMARILLO_OSC, 7);
    trazo(AMARILLO, 5);
    trazo(BLANCO, 2);
    return c;
  });
}
function hCrepitar(): Hoja {
  // Arco eléctrico corto en el atacante: dos zigzags.
  return [0, 1].map((v) => {
    const c = lienzo(19, 19);
    const x = ctxDe(c);
    const pts: [number, number][] = v ? [[1, 17], [8, 9], [11, 12], [17, 1]] : [[1, 1], [9, 8], [8, 12], [17, 17]];
    for (let k = 0; k < pts.length - 1; k++) linea(x, AMARILLO_OSC, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 4);
    for (let k = 0; k < pts.length - 1; k++) linea(x, AMARILLO, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 2);
    return c;
  });
}
function hRacha(dir: number): Hoja {
  const larga = (w: number): HTMLCanvasElement => {
    const c = lienzo(w, 12);
    const x = ctxDe(c);
    const px = (col: string, a: number, b: number, j: number): void => pix(x, col, dir > 0 ? a : w - 1 - b, j, b - a + 1, 1);
    px('#4a78c8', 8, w - 10, 6);
    px('#6e98f0', 4, w - 6, 7);
    px('#f4fbff', 4, w - 4, 4);
    px('#f4fbff', 2, w - 6, 5);
    px('#cfe6ff', 6, w - 8, 3);
    px('#6e98f0', 10, w - 10, 2);
    px('#6e98f0', w - 4, w - 2, 3);
    px('#f4fbff', w - 4, w - 3, 2);
    px('#f4fbff', w - 3, w - 2, 1);
    px('#6e98f0', w - 2, w - 1, 0);
    px('#cfe6ff', w - 3, w - 2, 0);
    return c;
  };
  return [larga(48), larga(32)];
}
const hRachaD = (): Hoja => hRacha(1);
const hRachaI = (): Hoja => hRacha(-1);
function hHoja(): Hoja {
  return ampH([filas(['.gG', 'Gg.'], { g: '#4fb34a', G: '#2a7a3a' }), filas(['tT.', '.nt'], { t: '#c08a4c', T: '#e0b070', n: '#8a5a2c' })]);
}
function hVaso(): Hoja {
  return girar(amp(filas(['kkkkkkk', 'kcaaack', 'kcaaAck', '.kaaak.', '..kak..', '..kck..', '.kkkkk.'], { k: TINTA, c: '#e4f4ff', a: '#f0b030', A: '#b86a14' })));
}
function hGota(): Hoja {
  return ampH([filas(['.a.', 'aaA', '.A.'], { a: '#f0b030', A: '#b86a14' }), filas(['aa', 'aA'], { a: '#f0b030', A: '#b86a14' })]);
}
function hSalpicon(): Hoja {
  return ampH([0, 1, 2].map((f) => {
    const c = lienzo(21, 13);
    const x = ctxDe(c);
    const base = 10;
    pix(x, '#b86a14', 4 + f, base + 1, 13 - 2 * f, 1);
    pix(x, '#f0b030', 3 + f, base, 15 - 2 * f, 1);
    pix(x, '#ffe08a', 5 + f, base - 1, 11 - 2 * f, 1);
    for (let k = -3; k <= 3; k++) {
      const h = (4 - Math.abs(k)) * (f === 0 ? 1.2 : f === 1 ? 1.6 : 1.0);
      const px = 10 + k * (2 + f * 0.8);
      pix(x, '#f0b030', Math.round(px), Math.round(base - h), 2, 2);
      pix(x, '#ffe08a', Math.round(px), Math.round(base - h), 1, 1);
    }
    return c;
  }));
}
function hBotella(): Hoja {
  const w = 15;
  const h = 22;
  const cuerpo = sombrear(w, h, union(disco(7, 14, 6.3), (i, j) => i >= 5 && i <= 9 && j >= 3 && j <= 10), { ol: '#1c4a2a', base: '#3f9a52', luz: '#8ae08a', som: '#27743a' });
  const x = ctxDe(cuerpo);
  pix(x, '#f0e4c0', 3, 12, 9, 5);
  pix(x, '#c8a860', 3, 16, 9, 1);
  pix(x, ROJO, 6, 13, 3, 2);
  pix(x, '#8a5a2c', 5, 1, 5, 3);
  pix(x, '#5a3a1c', 5, 3, 5, 1);
  pix(x, TINTA, 4, 1, 1, 3);
  pix(x, TINTA, 10, 1, 1, 3);
  pix(x, TINTA, 5, 0, 5, 1);
  return girar(cuerpo);
}
function hCristal(): Hoja {
  return girar(amp(filas(['cw.', 'wcc', '.cG'], { c: '#bfe8d4', w: '#ffffff', G: '#5aa890' })));
}
function hNota(color: string, oscuro: string): Hoja {
  const p = { k: TINTA, c: color, d: oscuro };
  return ampH([
    filas(['..kkk...', '..kcck..', '..kck.k.', '..kck..k', '..kck...', '..kck...', 'kkkck...', 'kccdk...', 'kcddk...', '.kkk....'], p),
    filas(['..kkkkkkkkk', '..kccccccck', '..kckkkkkck', '..kck...kck', '..kck...kck', '..kck...kck', 'kkkck.kkkck', 'kccdk.kccdk', 'kcddk.kcddk', '.kkk...kkk.'], p),
  ]);
}
function hNotaA(): Hoja {
  return hNota('#ffd83a', '#c8901c');
}
function hNotaB(): Hoja {
  return hNota('#ff7ab0', '#c8407c');
}
function hNotaC(): Hoja {
  return hNota('#6ee0e0', '#2a9aa8');
}
function hAnilloSonido(): Hoja {
  const rs = [4, 9, 14, 19, 24, 28];
  return rs.map((r) => {
    const T = 2 * r + 7;
    const c = lienzo(T, T);
    const x = ctxDe(c);
    const m = T / 2;
    for (let j = 0; j < T; j++) {
      for (let i = 0; i < T; i++) {
        const dx = i + 0.5 - m;
        const dy = j + 0.5 - m;
        const d = Math.hypot(dx, dy);
        const e = Math.abs(d - r);
        if (e > 2.1) continue;
        const sector = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 12);
        if (sector % 3 === 2 && r > 6) continue;
        pix(x, e <= 0.95 ? '#fff0a0' : AMARILLO_OSC, i, j);
      }
    }
    return c;
  });
}
function hAnilloChico(): Hoja {
  return hAnilloSonido().slice(0, 5);
}
function hPolvo(): Hoja {
  return [4, 7, 9, 11].map((r) => sombrear(2 * r + 3, 2 * r + 3, union(disco(r + 1, r + 1, r), disco(r * 0.5 + 1, r + 2, r * 0.6), disco(r * 1.5 + 1, r + 2, r * 0.6)), MAT_POLVO));
}
function hGrieta(): Hoja {
  const c = lienzo(52, 10);
  const x = ctxDe(c);
  const pts: [number, number][] = [[1, 5], [10, 2], [18, 7], [27, 2], [36, 7], [44, 3], [51, 5]];
  for (let k = 0; k < pts.length - 1; k++) linea(x, '#d8bc8c', pts[k][0], pts[k][1] + 2, pts[k + 1][0], pts[k + 1][1] + 2, 1);
  for (let k = 0; k < pts.length - 1; k++) linea(x, '#3b2a3f', pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 2);
  return [c];
}
function hPiedra(): Hoja {
  return ampH([filas(['nn', 'Nn'], { n: '#a88a5c', N: '#6a5030' })]);
}
function hBolaEsporas(): Hoja {
  return [sombrear(21, 21, union(disco(8, 11, 6), disco(13, 8, 6), disco(11, 13, 6)), MAT_ESPORA)];
}
function hFloracion(): Hoja {
  return [10, 14, 17, 18].map((r) => {
    const T = 2 * r + 10;
    const c = T / 2;
    return sombrear(T, T, union(disco(c - r * 0.55, c + 2, r * 0.62), disco(c + r * 0.55, c + 2, r * 0.62), disco(c, c - r * 0.25, r * 0.72), disco(c, c + r * 0.4, r * 0.7)), MAT_ESPORA);
  });
}
function hEspora(): Hoja {
  return ampH([filas(['.y.', 'yYy', '.y.'], { y: '#f4f8b0', Y: '#a8c040' })]);
}

// ---- Por tipo ----------------------------------------------------------------------------------------------------
function hEstrella(t: Tipo): Hoja {
  const col = COLOR_TIPO[t];
  const borde = mezcla(col, TINTA, 0.4);
  return [6, 11, 10, 6].map((r) => astro(r, borde, col, '#ffffff'));
}
function hAstilla2(t: Tipo): Hoja {
  const col = COLOR_TIPO[t];
  const pal = { c: col, l: mezcla(col, '#ffffff', 0.55), o: mezcla(col, TINTA, 0.45) };
  return ampH([filas(['cl', 'oc'], pal), filas(['lc', 'co'], pal)]);
}
function hBolita(t: Tipo): Hoja {
  const col = COLOR_TIPO[t];
  return [sombrear(9, 9, disco(4, 4, 3.4), { ol: mezcla(col, TINTA, 0.5), base: col, luz: mezcla(col, '#ffffff', 0.6), som: mezcla(col, TINTA, 0.25) })];
}
function hBrillo(t: Tipo): Hoja {
  const col = COLOR_TIPO[t];
  const o = mezcla(col, TINTA, 0.35);
  const claro = mezcla(col, '#ffffff', 0.6);
  return [astro(3, o, claro, '#ffffff'), astro(6, o, claro, '#ffffff'), astro(5, o, claro, '#ffffff'), astro(2, o, claro, '#ffffff')];
}

// ------------------------------------------------------------------------------------------------------------
// Depósito de partículas
// ------------------------------------------------------------------------------------------------------------
const MAX = 64;
const VACIA: Hoja = [];

class Part {
  hoja: Hoja = VACIA;
  /** Tiempo transcurrido (negativo = aún no ha salido). */
  t = 0;
  dur = 1;
  x0 = 0;
  y0 = 0;
  x1 = 0;
  y1 = 0;
  /** Altura del arco (px; negativo = sube). */
  arco = 0;
  /** >0 ondula en vertical, <0 en horizontal. */
  osc = 0;
  /** Fracción de la vida que dura el movimiento (después se queda quieta). */
  fm = 1;
  /** 0 lineal, 1 frena al final, 2 acelera. */
  ease = 0;
  /** ms por fotograma (0: reparte los fotogramas por la vida). */
  vel = 0;
  /** ms finales en los que parpadea hasta desaparecer. */
  parp = 0;
  x = 0;
  y = 0;
  fr = 0;
  vis = false;
}

export class EfectosMov {
  private readonly pool: Part[] = [];
  private n = 0;
  /** Fin (ms) del efecto lanzado en este momento. */
  private fin = 0;

  constructor() {
    for (let i = 0; i < MAX; i++) this.pool.push(new Part());
  }

  get activo(): boolean {
    return this.n > 0;
  }

  /** Cuántas partículas hay vivas (para pruebas). */
  get vivas(): number {
    return this.n;
  }

  /** Para de golpe. */
  limpiar(): void {
    this.n = 0;
  }

  /**
   * Empieza el efecto de `mov` desde el atacante en `desde` hacia cada punto de `a` (vacío: movimiento sobre uno
   * mismo). Devuelve su duración en ms. Todos los objetivos a la vez.
   */
  lanzar(mov: string, tipo: Tipo, desde: PuntoFx, a: PuntoFx[]): number {
    this.fin = 0;
    const f = a.length ? FX[mov] : undefined;
    if (f) f(this, tipo, desde, a);
    else generico(this, tipo, desde, a, MOVS[mov]?.pot == null);
    return this.fin;
  }

  /** Avanza `dt` ms; true mientras haya algo en pantalla. */
  paso(dt: number): boolean {
    let n = this.n;
    if (!n) return false;
    if (dt > 50) dt = 50;
    const pool = this.pool;
    let j = 0;
    for (let i = 0; i < n; i++) {
      const p = pool[i];
      p.t += dt;
      if (p.t >= p.dur) continue;
      if (p.t >= 0) {
        const mv = p.dur * p.fm;
        const u = p.t >= mv ? 1 : p.t / mv;
        const e = p.ease === 1 ? 1 - (1 - u) * (1 - u) : p.ease === 2 ? u * u : u;
        let x = p.x0 + (p.x1 - p.x0) * e;
        let y = p.y0 + (p.y1 - p.y0) * e + p.arco * 4 * e * (1 - e);
        if (p.osc > 0) y += p.osc * Math.sin(u * 9.42478);
        else if (p.osc < 0) x -= p.osc * Math.sin(u * 9.42478);
        p.x = x;
        p.y = y;
        const nf = p.hoja.length;
        p.fr = nf === 1 ? 0 : p.vel > 0 ? ((p.t / p.vel) | 0) % nf : Math.min(nf - 1, ((p.t / p.dur) * nf) | 0);
        p.vis = p.parp === 0 || p.dur - p.t > p.parp || (((p.t / 45) | 0) & 1) === 0;
      }
      if (i !== j) {
        pool[i] = pool[j];
        pool[j] = p;
      }
      j++;
    }
    this.n = j;
    return j > 0;
  }

  /** Dibuja las partículas vivas (solo drawImage de sprites horneados, en posiciones enteras). */
  dibujar(ctx: CanvasRenderingContext2D): void {
    const pool = this.pool;
    for (let i = 0, n = this.n; i < n; i++) {
      const p = pool[i];
      if (p.t < 0 || !p.vis) continue;
      const c = p.hoja[p.fr];
      ctx.drawImage(c, ((p.x + 0.5) | 0) - (c.width >> 1), ((p.y + 0.5) | 0) - (c.height >> 1));
    }
  }

  /** Añade una partícula (se descarta si el depósito está lleno). */
  mk(h: Hoja, x0: number, y0: number, x1: number, y1: number, ret: number, dur: number, arco = 0, osc = 0, fm = 1, ease = 0, vel = 0, parp = 0): void {
    const fin = ret + dur;
    if (fin > this.fin) this.fin = fin;
    if (this.n >= MAX) return;
    const p = this.pool[this.n++];
    p.hoja = h;
    p.t = -ret;
    p.dur = dur;
    p.x0 = x0;
    p.y0 = y0;
    p.x1 = x1;
    p.y1 = y1;
    p.arco = arco;
    p.osc = osc;
    p.fm = fm;
    p.ease = ease;
    p.vel = vel;
    p.parp = parp;
    p.x = x0;
    p.y = y0;
    p.fr = 0;
    p.vis = ret === 0;
  }
}

// ------------------------------------------------------------------------------------------------------------
// Los efectos. Cada uno: (depósito, tipo, atacante, objetivos). Los tiempos son ms.
// ------------------------------------------------------------------------------------------------------------
type Efecto = (e: EfectosMov, tipo: Tipo, d: PuntoFx, a: PuntoFx[]) => void;

/** Impacto genérico del color del tipo: estrella + astillas. */
function golpe(e: EfectosMov, tipo: Tipo, x: number, y: number, ret: number, astillas: number): void {
  e.mk(memoT('estrella', tipo, hEstrella), x, y, x, y, ret, 200);
  const h = memoT('astilla', tipo, hAstilla2);
  for (let i = 0; i < astillas; i++) {
    const ang = (i / astillas) * 6.283 + az();
    const r = entre(12, 20);
    e.mk(h, x, y, x + Math.cos(ang) * r, y + Math.sin(ang) * r, ret + 20, 220, -4, 0, 1, 1, 70, 70);
  }
}

/** Todo lo demás: una bolita del color del tipo viaja al objetivo y estalla (o brilla, si es de estado). */
function generico(e: EfectosMov, tipo: Tipo, d: PuntoFx, a: PuntoFx[], estado: boolean): void {
  if (!a.length) {
    // Sobre uno mismo: cuatro brillos que suben.
    const h = memoT('brillo', tipo, hBrillo);
    for (let i = 0; i < 4; i++) {
      const x = d.x + (i - 1.5) * 12 + entre(-3, 3);
      e.mk(h, x, d.y + entre(4, 18), x + entre(-3, 3), d.y - entre(14, 26), i * 70, 380, 0, 0, 1, 1);
    }
    return;
  }
  const bola = memoT('bolita', tipo, hBolita);
  for (const t of a) {
    e.mk(bola, d.x, d.y, t.x, t.y, 0, 130, -8, 0, 1, 0);
    if (estado) {
      const h = memoT('brillo', tipo, hBrillo);
      for (let i = 0; i < 3; i++) e.mk(h, t.x + (i - 1) * 14, t.y + entre(-8, 8), t.x + (i - 1) * 14, t.y - entre(10, 20), 130 + i * 50, 300, 0, 0, 1, 1);
    } else golpe(e, tipo, t.x, t.y, 130, 4);
  }
}

const lluvia: Efecto = (e, _tipo, _d, a) => {
  for (const t of a) {
    e.mk(memo('nube', hNube), t.x - 10, t.y - 44, t.x, t.y - 36, 0, 600, 0, 0, 0.3, 1, 0, 160);
    const hl = unos('lenteja', hLenteja);
    for (let i = 0; i < 11; i++) {
      const x = t.x + (az() - 0.5) * 40;
      const y1 = t.y + 14 + az() * 14;
      e.mk(hl[i & 1], x, t.y - 32, x + (az() - 0.5) * 6, y1, 70 + ((az() * 300) | 0), 300, 0, 0, 0.6, 2, 0, 100);
    }
  }
};

const almendrazo: Efecto = (e, tipo, d, a) => {
  const hv = memo('almendra', hAlmendra);
  const ha = memo('astilla-alm', hAstilla);
  for (const t of a) {
    for (let i = 0; i < 3; i++) {
      const ret = i * 90;
      const tx = t.x + entre(-8, 8);
      const ty = t.y + entre(-8, 8);
      e.mk(hv, d.x, d.y, tx, ty, ret, 250, -26, 0, 1, 0, 45);
      golpe(e, tipo, tx, ty, ret + 245, 0);
      for (let k = 0; k < 2; k++) e.mk(ha, tx, ty, tx + entre(-18, 18), ty + entre(6, 16), ret + 250, 250, -14, 0, 1, 1, 0, 90);
    }
  }
};

const traca: Efecto = (e, _tipo, d, a) => {
  const hf = memo('flash-traca', hFlashTraca);
  const hm = memo('mecha', hMecha);
  const hc = unos('chispa', hChispa);
  a.forEach((t, k) => {
    e.mk(hm, d.x, d.y, t.x, t.y, 0, 150, -6, 0, 1, 0, 40);
    for (let j = 0; j < 4; j++) {
      const ang = az() * 6.283;
      const r = entre(6, 24);
      const x = t.x + Math.cos(ang) * r;
      const y = t.y + Math.sin(ang) * r * 0.9;
      const ret = 60 + j * 100 + k * 25;
      e.mk(hf, x, y, x, y, ret, 170);
      for (let s = 0; s < 2; s++) {
        const an = az() * 6.283;
        e.mk(hc[s], x, y, x + Math.cos(an) * 16, y + Math.sin(an) * 14 + 4, ret + 20, 230, -6, 0, 1, 1, 0, 80);
      }
    }
  });
};

const fogonazo: Efecto = (e, _tipo, d, a) => {
  const hs = memo('fuego-chico', hFuegoChico);
  const hb = memo('fogonazo', hFogonazo);
  const hr = memo('brasa', hBrasa);
  for (const t of a) {
    e.mk(hs, d.x, d.y, t.x, t.y, 0, 240, -10, 0, 1, 0, 60);
    e.mk(hb, t.x, t.y - 4, t.x, t.y - 4, 240, 300);
    for (let i = 0; i < 5; i++) e.mk(hr, t.x + entre(-8, 8), t.y, t.x + entre(-22, 22), t.y - entre(22, 34), 260, 280, -8, 0, 1, 1, 0, 90);
  }
};

const petardazo: Efecto = (e, _tipo, d, a) => {
  const hp = memo('petardo', hPetardo);
  const hx = memo('explosion', hExplosion);
  const he = unos('escombro', hEscombro);
  const hh = memo('humo', hHumo);
  for (const t of a) {
    e.mk(hp, d.x, d.y, t.x, t.y, 0, 260, -30, 0, 1, 0, 50);
    e.mk(hx, t.x, t.y, t.x, t.y, 260, 340);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * 6.283 + az() * 0.6;
      const r = entre(26, 40);
      e.mk(he[i & 1], t.x, t.y, t.x + Math.cos(ang) * r, t.y + Math.sin(ang) * r * 0.8 + 6, 270, 330, -14, 0, 1, 1, 0, 100);
    }
    for (let i = 0; i < 2; i++) e.mk(hh, t.x + (i ? 10 : -10), t.y - 6, t.x + (i ? 14 : -14), t.y - 28, 330 + i * 20, 270, 0, 0, 1, 1);
  }
};

const chispazo: Efecto = (e, _tipo, d, a) => {
  const hr = memo('rayo', hRayo);
  const hc = memo('crepitar', hCrepitar);
  const hs = unos('chispa', hChispa);
  for (const t of a) {
    e.mk(hc, d.x, d.y - 4, d.x, d.y - 4, 0, 120, 0, 0, 1, 0, 40);
    e.mk(hr, t.x, t.y - 37, t.x, t.y - 37, 100, 300, 0, 0, 1, 0, 50, 90);
    golpe(e, 'rayo', t.x, t.y + 4, 100, 0);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * 6.283 + az();
      e.mk(hs[i & 1], t.x, t.y + 6, t.x + Math.cos(ang) * entre(14, 28), t.y + 6 + Math.sin(ang) * entre(8, 18), 110, 260, -6, 0, 1, 1, 0, 90);
    }
  }
};

const cierzo: Efecto = (e, _tipo, d, a) => {
  const hl = unos('hoja', hHoja);
  a.forEach((t, k) => {
    const dir = t.x >= d.x ? 1 : -1;
    const hr = dir > 0 ? unos('racha+', hRachaD) : unos('racha-', hRachaI);
    for (let j = 0; j < 4; j++) {
      const y = t.y - 22 + j * 14 + entre(-3, 3);
      e.mk(hr[j & 1], t.x - dir * 90, y, t.x + dir * 90, y, j * 70 + k * 25, 300, 0, 0, 1, 0);
    }
    for (let j = 0; j < 3; j++) {
      const y = t.y + entre(-26, 22);
      e.mk(hl[j & 1], t.x - dir * 90, y, t.x + dir * 90, y + entre(-8, 8), 40 + j * 75 + k * 20, 380, 0, -4, 1, 0, 0);
    }
  });
};

/** Vaso y botella comparten la caída: un proyectil que gira, un salpicón y gotas. */
function lanzado(e: EfectosMov, tipo: Tipo, d: PuntoFx, t: PuntoFx, vuelo: number, proyectil: Hoja, alto: number, cristales: number, gotas: number): void {
  e.mk(proyectil, d.x, d.y, t.x, t.y, 0, vuelo, alto, 0, 1, 0, 55);
  e.mk(memo('salpicon', hSalpicon), t.x, t.y - 2, t.x, t.y - 2, vuelo, 220);
  golpe(e, tipo, t.x, t.y, vuelo - 5, 0);
  const hg = unos('gota', hGota);
  for (let i = 0; i < gotas; i++) {
    const ang = -Math.PI * (0.1 + 0.8 * (i / (gotas - 1 || 1)));
    const r = entre(14, 26);
    e.mk(hg[i & 1], t.x, t.y, t.x + Math.cos(ang) * r * 1.3, t.y + 12, vuelo, 280, Math.sin(ang) * r * 1.4, 0, 1, 0, 0, 90);
  }
  if (cristales) {
    const hc = memo('cristal', hCristal);
    for (let i = 0; i < cristales; i++) e.mk(hc, t.x, t.y, t.x + entre(-26, 26), t.y + entre(2, 14), vuelo + 10, 300, -entre(14, 26), 0, 1, 0, 60, 100);
  }
}

const chupitazo: Efecto = (e, tipo, d, a) => {
  for (const t of a) lanzado(e, tipo, d, t, 280, memo('vaso', hVaso), -34, 0, 6);
};

const garrafon: Efecto = (e, tipo, d, a) => {
  for (const t of a) lanzado(e, tipo, d, t, 320, memo('botella', hBotella), -42, 5, 4);
};

const cancion: Efecto = (e, tipo, d, a) => {
  const notas = [unos('nota-a', hNotaA), unos('nota-b', hNotaB), unos('nota-c', hNotaC)];
  // Salen del cantante...
  for (let i = 0; i < 3; i++) e.mk(notas[i][i & 1], d.x + (i - 1) * 14, d.y - 10, d.x + (i - 1) * 18, d.y - 36, i * 60, 360, 0, 4, 1, 1, 0, 100);
  // ...y vuelan ondulando hacia cada oyente.
  a.forEach((t, k) => {
    for (let j = 0; j < 3; j++) {
      const ox = (j - 1) * 6;
      e.mk(notas[j][(j + k) & 1], d.x, d.y - 12, t.x + ox, t.y - 6, j * 90 + k * 15, 400, 0, 9, 1, 0, 0, 90);
    }
    golpe(e, tipo, t.x, t.y, 480, 0);
  });
};

const esporas: Efecto = (e, _tipo, d, a) => {
  for (const t of a) {
    e.mk(memo('bola-esporas', hBolaEsporas), d.x, d.y, t.x, t.y, 0, 260, -12, 0, 1, 0);
    e.mk(memo('floracion', hFloracion), t.x, t.y - 2, t.x, t.y - 6, 260, 420);
    const hs = memo('espora', hEspora);
    for (let i = 0; i < 8; i++) {
      const x = t.x + (az() - 0.5) * 34;
      const y = t.y + (az() - 0.3) * 24;
      e.mk(hs, x, y, x + (az() - 0.5) * 14, y - 22 - az() * 16, 260 + i * 15, 320, 0, -3, 1, 1, 0, 100);
    }
  }
};

const temblor: Efecto = (e, _tipo, d, a) => {
  const hp = memo('polvo', hPolvo);
  const hc = memo('piedra', hPiedra);
  const hg = memo('grieta', hGrieta);
  // El atacante pisa fuerte.
  for (let i = 0; i < 2; i++) e.mk(hp, d.x + (i ? 16 : -16), d.y + 24, d.x + (i ? 22 : -22), d.y + 20, 0, 320);
  for (const t of a) {
    e.mk(hg, t.x, t.y + 24, t.x, t.y + 24, 40, 480, 0, 0, 1, 0, 0, 120);
    for (let j = 0; j < 4; j++) {
      const x = t.x - 24 + j * 16 + entre(-3, 3);
      e.mk(hp, x, t.y + 22, x + (j < 2 ? -4 : 4), t.y + 16, 40 + j * 40, 340);
      e.mk(hc, x, t.y + 20, x + entre(-10, 10), t.y + 24, 50 + j * 40, 300, -entre(14, 26), 0, 1, 0, 0, 80);
    }
  }
};

const bocinazo: Efecto = (e, _tipo, d, a) => {
  const hr = memo('anillo-sonido', hAnilloSonido);
  const hc = memo('anillo-chico', hAnilloChico);
  for (let i = 0; i < 3; i++) e.mk(hr, d.x, d.y, d.x, d.y, i * 110, 340);
  for (const t of a) for (let i = 0; i < 2; i++) e.mk(hc, t.x, t.y, t.x, t.y, 200 + i * 100, 300);
};

const FX: Record<string, Efecto> = { lluvia, almendrazo, traca, fogonazo, petardazo, chispazo, cierzo, chupitazo, garrafon, cancion, esporas, temblor, bocinazo };

/** Los movimientos con diseño propio (para la vista previa). */
export const MOVS_CON_EFECTO: readonly string[] = Object.keys(FX);

/** Hornea ya todos los sprites (por ejemplo, durante una pantalla de carga) para que el primer golpe no tenga que hacerlo. */
export function precalentarEfectos(): void {
  const e = new EfectosMov();
  const d: PuntoFx = { x: 100, y: 100 };
  const a: PuntoFx[] = [
    { x: 0, y: 40 },
    { x: 200, y: 100 },
    { x: 200, y: 160 },
  ];
  for (const m of Object.keys(FX)) {
    e.lanzar(m, 'normal', d, a);
    e.limpiar();
  }
  for (const t of Object.keys(COLOR_TIPO) as Tipo[]) {
    e.lanzar('zasca', t, d, a);
    e.lanzar('_', t, d, []);
    e.limpiar();
  }
}
