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
// mismo, unos brillos). Sobre rivales (`FX`): lluvia, almendrazo, traca, fogonazo, petardazo, chispazo, cierzo, chupitazo,
// garrafon, cancion, esporas, temblor, bocinazo, chapa, planeo, pringue, cara_de_pena, vacile, venganza, adoquin, barrigazo,
// ronda, unamas, zasca, coz, raices, setas, burbujeo, pesao, tubo, goudamadre, tendedero, remate, maletazo, embarque, monologo, carambola, crujiente, cortepapel, pasodoble, mancha, ayayay, serenata, picante, ochotortas, tinta, morrina, fiestapagana, todosdentro, flash, nubarron, carisimo, calada, vueltas y, del capítulo 2, penultima, persiana, lunes, ultimaronda. Sobre uno mismo (`FX_YO`, `lanzar` los llama
// con la lista de objetivos vacía): siesta, esconderse, rebozado, caparazon, compas, pantalones, cinturones, improvisa, ficha, limon, papiroflexia. Los de «todos» llegan a
// todos los rivales a la vez. Para añadir uno: función `(e, tipo, desde, a)` + entrada en `FX` o `FX_YO` + `LLEGA`/`LLEGA_YO`;
// el precalentado (`tareasPrecalentarEfectos`) lo recoge solo.
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
function hSalpicon(c1 = '#b86a14', c2 = '#f0b030', c3 = '#ffe08a'): Hoja {
  return ampH([0, 1, 2].map((f) => {
    const c = lienzo(21, 13);
    const x = ctxDe(c);
    const base = 10;
    pix(x, c1, 4 + f, base + 1, 13 - 2 * f, 1);
    pix(x, c2, 3 + f, base, 15 - 2 * f, 1);
    pix(x, c3, 5 + f, base - 1, 11 - 2 * f, 1);
    for (let k = -3; k <= 3; k++) {
      const h = (4 - Math.abs(k)) * (f === 0 ? 1.2 : f === 1 ? 1.6 : 1.0);
      const px = 10 + k * (2 + f * 0.8);
      pix(x, c2, Math.round(px), Math.round(base - h), 2, 2);
      pix(x, c3, Math.round(px), Math.round(base - h), 1, 1);
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

// ---- Atrezo de la tanda 5 (efectos de los movimientos compartidos y propios) -------------------------------
const eli =
  (cx: number, cy: number, rx: number, ry: number): Masc =>
  (i, j) =>
    ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1;
const caja =
  (x0: number, y0: number, x1: number, y1: number): Masc =>
  (i, j) =>
    i >= x0 && i <= x1 && j >= y0 && j <= y1;
const resta =
  (a: Masc, b: Masc): Masc =>
  (i, j) =>
    a(i, j) && !b(i, j);

function espejo(c: HTMLCanvasElement): HTMLCanvasElement {
  const r = lienzo(c.width, c.height);
  const x = ctxDe(r);
  x.translate(c.width, 0);
  x.scale(-1, 1);
  x.drawImage(c, 0, 0);
  return r;
}
/** Escala un sprite (vecino más cercano) para atrezo que tiene que leerse en una pantalla de 240 px. */
function esc(c: HTMLCanvasElement, k: number, libera = true): HTMLCanvasElement {
  const r = lienzo(Math.round(c.width * k), Math.round(c.height * k));
  ctxDe(r).drawImage(c, 0, 0, r.width, r.height);
  if (libera) c.width = c.height = 0; // el original ya no hace falta: suelta su memoria al momento
  return r;
}
/** Pinta las '#' de unas filas de texto con un color (glifos pequeños). */
function marca(x: CanvasRenderingContext2D, rows: string[], col: string, ox: number, oy: number): void {
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) if (r[i] !== '.') pix(x, col, ox + i, oy + j);
  });
}
const G_EXCL = ['##', '##', '##', '##', '..', '##'];
const G_INTE = ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'];

// -- chapa y pesao: bocadillos
const MAT_BOC: Mat = { ol: TINTA, base: '#fffdf0', luz: '#ffffff', som: '#d4cce4' };
const MAT_BOC2: Mat = { ol: TINTA, base: '#4fd0c4', luz: '#a8f4ec', som: '#2a9a90' };
function bocadillo(w: number, h: number, glifo: 'puntos' | '!' | '?', mat: Mat, col: string): HTMLCanvasElement {
  const cuerpo: Masc = (i, j) => j < h && !((i === 0 || i === w - 1) && (j === 0 || j === h - 1));
  const cola: Masc = (i, j) => j >= h && i >= 2 && i <= 5 - (j - h);
  const c = sombrear(w, h + 4, union(cuerpo, cola), mat);
  const x = ctxDe(c);
  const cx = w >> 1;
  const cy = h >> 1;
  if (glifo === 'puntos') {
    const g = w > 16 ? 2 : 1;
    for (let k = -1; k <= 1; k++) pix(x, col, cx + k * (2 * g + 1) - (g === 2 ? 1 : 0), cy - (g === 2 ? 1 : 0), g, g);
  } else {
    const r = glifo === '!' ? G_EXCL : G_INTE;
    marca(x, r, col, cx - (r[0].length >> 1), cy - (r.length >> 1));
  }
  return c;
}
function hBocadillos(): Hoja {
  return [bocadillo(13, 8, 'puntos', MAT_BOC, TINTA), bocadillo(17, 10, 'puntos', MAT_BOC, TINTA), bocadillo(21, 12, 'puntos', MAT_BOC, TINTA)];
}
function hBocadillosPesao(): Hoja {
  return [bocadillo(19, 13, '?', MAT_BOC2, '#ffffff'), bocadillo(19, 13, '!', MAT_BOC2, '#ffffff'), bocadillo(21, 13, '!', MAT_BOC2, '#ffffff')];
}

// -- siesta: Zzz, almohada, cruces de cura
const MAT_Z: Mat = { ol: '#3a3a78', base: '#f4f4ff', luz: '#ffffff', som: '#b4b8ec' };
function hZetas(): Hoja {
  return [
    [9, 3],
    [12, 4],
    [15, 5],
  ].map(([s, t]) => sombrear(s, s, (i, j) => j < t || j >= s - t || Math.abs(i + j - (s - 1)) <= t * 0.7, MAT_Z));
}
function hAlmohada(): Hoja {
  const w = 32;
  const h = 15;
  const c = sombrear(w, h, union(eli(15.5, 7, 14.5, 6.2), caja(1, 2, 4, 3), caja(w - 5, 2, w - 2, 3), caja(1, 11, 4, 12), caja(w - 5, 11, w - 2, 12)), { ol: TINTA, base: '#f4f0ff', luz: '#ffffff', som: '#c8c0e8' });
  const x = ctxDe(c);
  pix(x, '#9cb8f4', 6, 6, w - 12, 1);
  pix(x, '#7a98e0', 6, 7, w - 12, 1);
  pix(x, '#9cb8f4', 6, 9, w - 12, 1);
  for (const [i, j] of [[0, 1], [w - 1, 1], [0, 13], [w - 1, 13]]) pix(x, AMARILLO, i, j, 1, 2);
  return [c];
}
function hCruces(): Hoja {
  const p = { k: '#1c5a2a', g: '#6ee06e', l: '#d8ffd0' };
  const cruz = filas(['..kkk..', '..klk..', 'kkkgkkk', 'klggggk', 'kkkgkkk', '..kgk..', '..kkk..'], p);
  return [esc(cruz, 1.5, false), cruz];
}

// -- esconderse: nube blanca de humo (de bomba de humo)
const MAT_POOF: Mat = { ol: '#6a5a78', base: '#e8e2ee', luz: '#ffffff', som: '#b8accb' };
function hPoof(): Hoja {
  return [6, 10, 13].map((r) => {
    const T = 2 * r + 6;
    const c = T / 2;
    return sombrear(T, T, union(disco(c, c, r * 0.8), disco(c - r * 0.7, c + r * 0.25, r * 0.55), disco(c + r * 0.7, c + r * 0.25, r * 0.55), disco(c, c - r * 0.6, r * 0.55), disco(c, c + r * 0.55, r * 0.5)), MAT_POOF);
  });
}

// -- planeo: media luna de viento y plumas
function hLuna(): Hoja {
  const mat: Mat = { ol: '#4a78c8', base: '#f4fbff', luz: '#ffffff', som: '#cfe6ff' };
  return [11, 15, 18].map((r) => {
    const T = 2 * r + 6;
    const c = T / 2;
    return sombrear(T, T, resta(disco(c, c, r), disco(c - r * 0.42, c, r * 0.9)), mat);
  });
}
function hPluma(): Hoja {
  const rows = ['.......kkkk.', '....kkkWWWWk', '..kkWWWWwwk.', '.kWWWwwwkk..', 'kkWwwkkk....', 'kkkkk.......'];
  return [esc(filas(rows, { k: TINTA, W: '#ffffff', w: '#bcd4f0' }), 1.5), esc(filas(rows, { k: TINTA, W: '#fff4d8', w: '#e4c8a0' }), 1.5)];
}

// -- pringue: goterones y manchas de aceite
const MAT_ACEITE: Mat = { ol: '#3a3408', base: '#a8a02a', luz: '#e4e070', som: '#706a14' };
const gotaM =
  (cx: number, r: number, h: number): Masc =>
  (i, j) => {
    const yc = h - 1 - r;
    if (j >= yc) return (i - cx) ** 2 + (j - yc) ** 2 <= r * r + r * 0.6;
    return j >= 0 && Math.abs(i - cx) <= (j / yc) * r * 0.9;
  };
function hGoteronAceite(): Hoja {
  const g = sombrear(11, 15, gotaM(5, 5, 15), MAT_ACEITE);
  pix(ctxDe(g), '#ffffff', 3, 9, 1, 2);
  const p = sombrear(7, 10, gotaM(3, 3, 10), MAT_ACEITE);
  pix(ctxDe(p), '#fffbd0', 2, 6, 1, 1);
  return [g, p];
}
function hMancha(): Hoja {
  const sat: [number, number, number][] = [[-0.95, -0.5, 0.36], [0.95, -0.3, 0.3], [0.2, 0.95, 0.32], [-0.6, 0.85, 0.28], [0.75, 0.7, 0.26]];
  return [7, 10, 11].map((r) => {
    const T = 2 * r + 10;
    const c = T / 2;
    const cv = sombrear(T, T, union(eli(c, c, r * 1.1, r * 0.85), ...sat.map(([dx, dy, rr]) => disco(c + dx * r, c + dy * r, rr * r))), MAT_ACEITE);
    const x = ctxDe(cv);
    pix(x, '#fffbd0', Math.round(c - r * 0.5), Math.round(c - r * 0.4), 3, 1);
    pix(x, '#fffbd0', Math.round(c - r * 0.5), Math.round(c - r * 0.4) + 1, 1, 2);
    pix(x, '#fffbd0', Math.round(c + r * 0.3), Math.round(c + r * 0.2), 2, 1);
    return cv;
  });
}

// -- rebozado: migas de pan rallado
function hMigas(): Hoja {
  const p = { k: '#7a4a1c', l: '#fff0b0', g: '#e8b84a', d: '#c08a2c' };
  return [esc(filas(['.kk.', 'klgk', 'kgdk', '.kk.'], p), 1.5), esc(filas(['.kkk.', 'klggk', 'kgddk', '.kkk.'], p), 1.5), esc(filas(['..kk..', '.klgk.', 'klggdk', 'kgddk.', '.kkk..'], p), 1.5)];
}

// -- cara de pena: lagrimones y corazones rotos
function hLagrimas(): Hoja {
  const mat: Mat = { ol: '#2a5a9a', base: '#5ab4f4', luz: '#d8f4ff', som: '#3a84d0' };
  const g = sombrear(9, 13, gotaM(4, 4, 13), mat);
  pix(ctxDe(g), '#ffffff', 2, 8, 1, 2);
  const p = sombrear(6, 8, gotaM(2.5, 2.5, 8), mat);
  return [g, p];
}
const CORAZON = ['..kkk.kkk..', '.kRRRkRRRk.', 'kRwRRRRRRRk', 'kRwRRRRRRRk', 'kRRRRRRRRRk', '.kRRRRRRRk.', '..kRRRRRk..', '...kRRRk...', '....kRk....', '.....k.....'];
const CORAZON_P = ['.kk.kk.', 'kRRkRRk', 'kRwRRRk', '.kRRRk.', '..kRk..', '...k...'];
/** Un corazón de filas de texto, partido por una línea en zigzag: `sep` px de separación, `baja` px más abajo la mitad derecha, `grieta` solo marca la línea. */
function corazonRoto(rows: string[], pal: Record<string, string>, ancho: number, alto: number, sep: number, baja: number, grieta: boolean): HTMLCanvasElement {
  const c = lienzo(ancho, alto);
  const x = ctxDe(c);
  const w = rows[0].length;
  const ox = (ancho - w) >> 1;
  const oy = (alto - rows.length) >> 1;
  rows.forEach((fila, j) => {
    const corte = (w >> 1) + (j % 2 ? 1 : 0) - (j % 3 === 0 ? 1 : 0);
    for (let i = 0; i < w; i++) {
      if (fila[i] === '.') continue;
      if (grieta) {
        if (i === corte) pix(x, TINTA, ox + i, oy + j);
        else pix(x, pal[fila[i]], ox + i, oy + j);
      } else if (i < corte) pix(x, pal[fila[i]], ox + i - sep, oy + j);
      else pix(x, pal[fila[i]], ox + i + sep, oy + j + baja);
    }
  });
  return c;
}
function hCorazonRoto(): Hoja {
  const p = { k: TINTA, R: '#f0507c', w: '#ffc0d0' };
  const entero = corazonRoto(CORAZON, p, 21, 14, 0, 0, false);
  const f3 = corazonRoto(CORAZON, p, 21, 14, 4, 3, false);
  return ampH([entero, entero, corazonRoto(CORAZON, p, 21, 14, 0, 0, true), corazonRoto(CORAZON, p, 21, 14, 2, 1, false), f3, f3]);
}
function hCorazoncito(): Hoja {
  const p = { k: TINTA, R: '#f0507c', w: '#ffc0d0' };
  const entero = corazonRoto(CORAZON_P, p, 13, 9, 0, 0, false);
  return [entero, entero, corazonRoto(CORAZON_P, p, 13, 9, 1, 1, false), corazonRoto(CORAZON_P, p, 13, 9, 2, 2, false)];
}

// -- vacile: carita que guiña, signos de exclamación
function hCarita(): Hoja {
  const mat: Mat = { ol: '#8a5a10', base: '#ffd83a', luz: '#fff2a0', som: '#e0a83a' };
  return [0, 1].map((f) => {
    const c = sombrear(15, 15, disco(7, 7, 6.4), mat);
    const x = ctxDe(c);
    pix(x, TINTA, 4, 5, 1, 3);
    if (f) {
      pix(x, TINTA, 9, 6, 3, 1);
      pix(x, TINTA, 10, 5, 1, 1);
      pix(x, TINTA, 4, 10, 8, 1);
      pix(x, TINTA, 3, 9, 1, 1);
      pix(x, TINTA, 12, 9, 1, 1);
      pix(x, '#f0507c', 8, 11, 3, 2);
      pix(x, TINTA, 8, 13, 3, 1);
    } else {
      pix(x, TINTA, 10, 5, 1, 3);
      pix(x, TINTA, 4, 10, 8, 1);
      pix(x, TINTA, 3, 9, 1, 1);
      pix(x, TINTA, 12, 9, 1, 1);
    }
    pix(x, '#f08a6a', 2, 8, 2, 1);
    pix(x, '#f08a6a', 12, 8, 2, 1);
    return esc(c, 1.5);
  });
}
function hExclamacion(): Hoja {
  return [esc(filas(['.kkk.', 'kRRRk', 'kRwRk', 'kRwRk', 'kRRRk', 'kRRRk', '.kRk.', '.kkk.', '.....', '.kkk.', 'kRRRk', '.kkk.'], { k: TINTA, R: ROJO, w: '#ffb0a0' }), 1.5)];
}

// -- venganza: aura roja, puño, marca de enfado
function hAura(): Hoja {
  return [0, 1, 2].map((f) => {
    const T = 72;
    const c = lienzo(T, T);
    const x = ctxDe(c);
    for (let j = 0; j < T; j++) {
      for (let i = 0; i < T; i++) {
        const dx = i + 0.5 - T / 2;
        const dy = j + 0.5 - T / 2;
        const d = Math.hypot(dx, dy);
        const a = Math.atan2(dy, dx);
        const R = 28 + 4 * Math.sin(a * 6 + f * 2.1) + 2 * Math.sin(a * 11 - f * 1.7);
        const k = R - d;
        if (k < 0 || k > 6) continue;
        if (k < 1.4) {
          if ((i + j) & 1) pix(x, '#ffc040', i, j);
        } else if (k < 3.4) pix(x, ROJO, i, j);
        else if ((i + j) & 1) pix(x, ROJO_OSC, i, j);
      }
    }
    return c;
  });
}
function hPuno(): Hoja {
  const mat: Mat = { ol: ROJO_OSC, base: '#e8503c', luz: '#ff9a78', som: '#b02a2a' };
  const c = lienzo(24, 22);
  const x = ctxDe(c);
  x.drawImage(sombrear(13, 16, (i, j) => !((i === 0 || i === 12) && (j === 0 || j === 15)), mat), 1, 3);
  for (let k = 0; k < 4; k++) x.drawImage(sombrear(10, 6, (i, j) => !(i === 9 && (j === 0 || j === 5)), mat), 12, 1 + k * 5);
  x.drawImage(sombrear(13, 6, (i, j) => !(i === 0 && (j === 0 || j === 5)), mat), 3, 14);
  pix(x, '#ffd0b8', 14, 3, 4, 1);
  pix(x, '#ffd0b8', 14, 8, 4, 1);
  return [c];
}
function hEnfado(): Hoja {
  return [amp(filas(['kk...kk', 'kRk.kRk', '.kRkRk.', '..kRk..', '.kRkRk.', 'kRk.kRk', 'kk...kk'], { k: ROJO_OSC, R: ROJO }))];
}

// -- impactos: explosión de comic y onda de choque
function pum(R: number, r0: number, picos: number, mat: Mat): HTMLCanvasElement {
  const T = 2 * R + 3;
  const cc = (T - 1) / 2;
  return sombrear(T, T, (i, j) => {
    const dx = i - cc;
    const dy = j - cc;
    const u = ((Math.atan2(dy, dx) / (Math.PI * 2)) * picos + 100) % 1;
    return Math.hypot(dx, dy) <= r0 + (R - r0) * (1 - Math.abs(2 * u - 1));
  }, mat);
}
function hPum(): Hoja {
  const m: Mat = { ol: '#c8601a', base: AMARILLO, luz: BLANCO, som: NARANJA };
  return [pum(8, 4, 8, m), pum(14, 7, 9, m), pum(12, 7, 9, { ol: '#c8601a', base: NARANJA, luz: AMARILLO, som: ROJO })];
}
function hPumRojo(): Hoja {
  const m: Mat = { ol: ROJO_OSC, base: ROJO, luz: '#ffb030', som: ROJO_OSC };
  return [pum(9, 4, 9, m), pum(16, 8, 10, m), pum(13, 8, 10, { ol: ROJO_OSC, base: '#a83a30', luz: ROJO, som: ROJO_OSC })];
}
function hOnda(): Hoja {
  return [4, 9, 15, 21, 27].map((r, f) => {
    const T = 2 * r + 7;
    const c = lienzo(T, T);
    const x = ctxDe(c);
    const m = T / 2;
    for (let j = 0; j < T; j++) {
      for (let i = 0; i < T; i++) {
        const e = Math.abs(Math.hypot(i + 0.5 - m, j + 0.5 - m) - r);
        if (f < 3 ? e <= 1.1 : e <= 0.8) pix(x, '#fff8e0', i, j);
        else if (f < 3 ? e <= 2.1 : e <= 1.6) pix(x, '#b8ac94', i, j);
      }
    }
    return c;
  });
}

// -- barrigazo: la barriga
function hBarriga(): Hoja {
  const c = sombrear(21, 21, disco(10, 10, 9.4), { ol: '#8a4a3a', base: '#f4b894', luz: '#ffdcc0', som: '#d08a68' });
  const x = ctxDe(c);
  pix(x, '#9a5a44', 9, 11, 3, 1);
  pix(x, '#9a5a44', 10, 10, 1, 3);
  pix(x, '#ffeedd', 5, 5, 2, 1);
  return [esc(c, 1.4)];
}

// -- adoquín: piedra, mitades, cascotes y grieta
const MAT_PIEDRA: Mat = { ol: TINTA, base: '#8a8a96', luz: '#c8c8d4', som: '#5a5a68' };
function adoquinBase(): HTMLCanvasElement {
  const c = sombrear(18, 12, (i, j) => !((i <= 1 || i >= 16) && (j <= 1 || j >= 10)), MAT_PIEDRA);
  const x = ctxDe(c);
  pix(x, '#6a6a78', 5, 4, 3, 1);
  pix(x, '#6a6a78', 11, 7, 3, 1);
  pix(x, '#6a6a78', 4, 8, 1, 1);
  pix(x, '#b0b0bc', 12, 3, 2, 1);
  return c;
}
function hAdoquin(): Hoja {
  return girar(esc(adoquinBase(), 1.4));
}
function hMitadesAdoquin(): Hoja {
  const mitad = (izq: boolean): HTMLCanvasElement => {
    const c = lienzo(11, 13);
    const x = ctxDe(c);
    const b = adoquinBase();
    const corte = (j: number): number => 9 + (j % 3) - 1;
    for (let j = 0; j < 12; j++) {
      for (let i = 0; i < 18; i++) {
        if (izq ? i > corte(j) : i <= corte(j)) continue;
        const px = izq ? i : i - corte(j) - 1;
        x.drawImage(b, i, j, 1, 1, px, j, 1, 1);
      }
    }
    return c;
  };
  return [mitad(true), mitad(false)];
}
function hCascotes(): Hoja {
  return [
    sombrear(6, 5, eli(2.5, 2, 2.8, 2.2), MAT_PIEDRA),
    sombrear(5, 5, caja(0, 0, 4, 3), MAT_PIEDRA),
    sombrear(7, 6, union(caja(0, 1, 6, 5), caja(2, 0, 5, 0)), MAT_PIEDRA),
  ];
}
function hCraquelado(): Hoja {
  const c = lienzo(40, 20);
  const x = ctxDe(c);
  const rayos: [number, number][] = [[-18, -2], [-12, 6], [-4, 8], [6, 8], [14, 5], [19, -3], [8, -7], [-8, -7]];
  for (const [dx, dy] of rayos) {
    const mx = 20 + dx * 0.5 + (dy > 0 ? 2 : -2);
    const my = 10 + dy * 0.5;
    linea(x, '#d8bc8c', 20, 11, mx, my + 1, 1);
    linea(x, '#d8bc8c', mx, my + 1, 20 + dx, 10 + dy + 1, 1);
    linea(x, TINTA, 20, 10, mx, my, 2);
    linea(x, TINTA, mx, my, 20 + dx, 10 + dy, 1);
  }
  return [c];
}

// -- caparazón: escudo hexagonal
function hexagono(R: number, f: number): HTMLCanvasElement {
  const W = 2 * R + 3;
  const H = Math.ceil(R * 1.74) + 3;
  const c = lienzo(W, H);
  const x = ctxDe(c);
  const cx = (W - 1) / 2;
  const cy = (H - 1) / 2;
  const hex = (r: number, i: number, j: number): number => {
    const ax = Math.abs(i - cx);
    const ay = Math.abs(j - cy);
    return Math.max(ay / 0.866, ax + ay * 0.5) / r;
  };
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const g = hex(R, i, j);
      if (g > 1) continue;
      if (g > 0.9) pix(x, '#5a3a1c', i, j);
      else if (g > 0.8) pix(x, f === 1 ? '#fff0b0' : '#f0cc80', i, j);
      else if (f === 0) continue;
      else {
        const gi = hex(R * 0.42, i, j);
        if (gi > 0.82 && gi <= 1) pix(x, '#5a3a1c', i, j);
        else if (gi <= 0.82) {
          if ((i + j) & 1) pix(x, f === 1 ? '#fff0b0' : '#e0b868', i, j);
        }
        else if ((i + j) & 1) pix(x, f === 1 ? '#f8e0a0' : '#c8964c', i, j);
        // radios del panal
        const a = Math.atan2(j - cy, i - cx);
        const s = Math.abs(((a / (Math.PI / 3) + 0.5) % 1 + 1) % 1 - 0.5);
        if (gi > 1 && s < 0.05) pix(x, '#5a3a1c', i, j);
      }
    }
  }
  return c;
}
function hCaparazonCierra(): Hoja {
  return [hexagono(36, 0), hexagono(32, 0), hexagono(29, 2)];
}
function hCaparazonFijo(): Hoja {
  return [hexagono(29, 2), hexagono(29, 1)];
}

// -- ronda y ¡una más!: cañas, espuma, jarras
const MAT_ESPUMA: Mat = { ol: '#8a7a60', base: '#fffbea', luz: '#ffffff', som: '#e4dcc0' };
function hCana(): Hoja {
  const c = lienzo(10, 16);
  const x = ctxDe(c);
  const p: Record<string, string> = { k: TINTA, W: '#ffffff', w: '#e4dcc0', y: '#f0b030', Y: '#ffe08a', o: '#b86a14' };
  const rows = ['.kkkkkkkk.', 'kWWwWWwWWk', 'kwWWWWWWwk', 'kkWWwWWWkk', '.kYyyyyok.', '.kYyyyyok.', '.kyyyyyok.', '.kyYyyyok.', '.kyyyyyok.', '.kyyyyyok.', '.kyyyyyok.', '.kyyyyyok.', '..kyyyok..', '..kyyyok..', '..kkkkkk..', '..........'];
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) if (p[r[i]]) pix(x, p[r[i]], i, j);
  });
  return girar(esc(c, 1.5));
}
function hEspuma(): Hoja {
  return [5, 8, 9].map((r, f) => {
    const T = 2 * r + 8;
    const c = T / 2;
    const m = f < 2 ? union(disco(c, c, r * 0.6), disco(c - r * 0.6, c + 1, r * 0.5), disco(c + r * 0.6, c, r * 0.5), disco(c, c - r * 0.55, r * 0.5), disco(c + 1, c + r * 0.5, r * 0.45)) : union(disco(c - r * 0.8, c + 2, r * 0.3), disco(c + r * 0.85, c + 1, r * 0.3), disco(c, c - r * 0.85, r * 0.32), disco(c - r * 0.5, c - r * 0.6, r * 0.25), disco(c + r * 0.5, c + r * 0.65, r * 0.28));
    return sombrear(T, T, m, MAT_ESPUMA);
  });
}
function hEspumita(): Hoja {
  return [sombrear(7, 7, disco(3, 3, 2.8), MAT_ESPUMA), sombrear(5, 5, disco(2, 2, 1.8), MAT_ESPUMA)];
}
/** Jarra de cerveza que se llena (nivel 0..1) y rebosa de espuma (rebosa 1: corona; 2: corona y chorretes). */
function jarra(nivel: number, rebosa: number): HTMLCanvasElement {
  const W = 26;
  const H = 31;
  const mat: Mat = { ol: TINTA, base: '#d4ecfa', luz: '#ffffff', som: '#9cc4e0' };
  const c = sombrear(W, H, union(caja(0, 5, 18, 30), resta(eli(21, 17, 4.6, 9), eli(21, 17, 2, 6.2))), mat);
  const x = ctxDe(c);
  const jb = 29 - Math.round(23 * nivel);
  if (nivel > 0) {
    pix(x, '#f0b030', 2, jb, 15, 30 - jb);
    pix(x, '#ffe08a', 4, jb + 1, 2, Math.max(0, 27 - jb));
    pix(x, '#b86a14', 15, jb + 1, 2, Math.max(0, 28 - jb));
    pix(x, '#c8841c', 2, 29, 15, 1);
  }
  if (nivel > 0.7) {
    pix(x, '#ffffff', 2, jb - 2, 15, 3);
    pix(x, '#e4dcc0', 2, jb, 15, 1);
    for (let i = 3; i < 17; i += 4) pix(x, '#ffffff', i, jb - 3, 3, 1);
  }
  if (rebosa) {
    const g = rebosa > 1 ? 1.15 : 1;
    const m = union(disco(5, 6, 5 * g), disco(11, 4, 5.5 * g), disco(16, 6.5, 4.5 * g), disco(8, 8, 4));
    x.drawImage(sombrear(24, 15, m, MAT_ESPUMA), -1, 0);
    if (rebosa > 1) {
      pix(x, '#ffffff', 2, 12, 2, 8);
      pix(x, '#e4dcc0', 4, 12, 1, 8);
      pix(x, '#ffffff', 15, 12, 2, 5);
      pix(x, '#e4dcc0', 17, 12, 1, 5);
      pix(x, '#ffffff', 2, 20, 2, 2);
    }
  }
  return c;
}
function hJarra(): Hoja {
  const f = [jarra(0, 0), jarra(0.3, 0), jarra(0.55, 0), jarra(0.82, 0), jarra(1, 1), jarra(1, 2)];
  return [f[0], f[1], f[2], f[3], f[4], f[5], f[5], f[5]];
}

// -- compás: palmas, notas sueltas, flechas de subida
function manoMitad(): HTMLCanvasElement {
  const c = lienzo(12, 17);
  const x = ctxDe(c);
  const mat: Mat = { ol: '#6a3a2a', base: '#f4b894', luz: '#ffd8bc', som: '#d08a68' };
  x.drawImage(sombrear(8, 11, caja(0, 0, 7, 9), mat), 1, 6);
  [[1, 3], [3, 0], [5, 0], [7, 2]].forEach(([i, j]) => x.drawImage(sombrear(3, 9, caja(0, 0, 2, 7), mat), i, j));
  x.drawImage(sombrear(4, 6, eli(1.5, 2.5, 1.9, 2.8), mat), 8, 9);
  return c;
}
function hPalmas(): Hoja {
  const m = manoMitad();
  const e = espejo(m);
  const pos: [number, number][] = [[0, 26], [7, 19], [11, 15]];
  return pos.map(([l, r], f) => {
    const c = lienzo(38, 26);
    const x = ctxDe(c);
    x.drawImage(m, l, 7);
    x.drawImage(e, r, 7);
    if (f === 2) {
      for (const [x0, y0, x1, y1] of [[19, 5, 19, 0], [14, 6, 10, 2], [24, 6, 28, 2], [10, 12, 4, 11], [28, 12, 34, 11]] as const) linea(x, AMARILLO, x0, y0, x1, y1, 2);
    }
    return c;
  });
}
function hNotaSuelta(): Hoja {
  return [hNota('#ff9a3a', '#c8601a')[0]];
}
function hFlechaArriba(): Hoja {
  return [esc(filas(['....k....', '...kRk...', '..kRRRk..', '.kRRyRRk.', 'kkkRRRkkk', '..kRRRk..', '..kRRRk..', '..kkkkk..'], { k: ROJO_OSC, R: '#ff5a46', y: '#ffd0b0' }), 1.5)];
}

// -- zasca: latigazo blanco y marca de mano
function hLatigo(): Hoja {
  const W = 46;
  const H = 34;
  const traza = (u0: number, u1: number): HTMLCanvasElement => {
    const c = lienzo(W, H);
    const x = ctxDe(c);
    const pasada = (col: string, grosor: number): void => {
      for (let u = u0; u <= u1; u += 0.02) {
        const th = (1 + 6 * Math.sin(Math.PI * Math.min(1, Math.max(0, u)))) / 2 + grosor;
        if (th <= 0) continue;
        rellenarDisco(x, col, 5 + u * 36, 5 + u * 22 - 6 * Math.sin(Math.PI * u), th);
      }
    };
    pasada(TINTA, 1.2);
    pasada('#cfe6ff', 0.2);
    pasada('#ffffff', -0.9);
    return c;
  };
  return [traza(0, 0.5), traza(0.2, 0.8), traza(0.5, 1)];
}
function hLatigoEspejo(): Hoja {
  return hLatigo().map(espejo);
}
function hManota(): Hoja {
  const c = lienzo(17, 18);
  const x = ctxDe(c);
  const r = '#ee6a5c';
  const o = '#c84438';
  [[1, 4], [4, 2], [7, 1], [10, 3]].forEach(([i, j]) => pix(x, r, i, j, 2, 8 - j + 2));
  rellenarDisco(x, r, 7.5, 12, 4.8);
  pix(x, r, 12, 9, 4, 2);
  pix(x, r, 13, 11, 3, 2);
  pix(x, o, 3, 14, 9, 1);
  return [esc(c, 1.5)];
}

// -- coz doble: herradura
function hHerradura(): Hoja {
  const c = lienzo(17, 17);
  const x = ctxDe(c);
  const m: Masc = (i, j) => {
    const dx = i - 8;
    const dy = j - 7.5;
    const d = Math.hypot(dx, dy);
    return d <= 7.6 && d >= 3.7 && !(j > 9 && Math.abs(dx) < 4.6);
  };
  const fino = sombrear(17, 17, m, { ol: TINTA, base: '#b8c0d0', luz: '#f0f4ff', som: '#78809a' });
  x.drawImage(fino, 0, 0);
  for (const a of [-2.7, -1.57, -0.45, -3.14 + 0.15, -0.0]) pix(x, TINTA, Math.round(8 + 5.6 * Math.cos(a)), Math.round(7.5 + 5.6 * Math.sin(a)));
  return [esc(c, 1.5)];
}

// -- raíces: brotan del suelo y se enroscan
function raiz(fase: number, f: number): HTMLCanvasElement {
  const W = 20;
  const H = 42;
  const c = lienzo(W, H);
  const x = ctxDe(c);
  const alto = [10, 20, 31, 40][f];
  for (let k = 0; k <= alto; k++) {
    const y = H - 1 - k;
    const cx = Math.round(10 + 4 * Math.sin(k * 0.34 + fase) * (0.4 + k / 40));
    const w = k < alto * 0.3 ? 3 : k < alto * 0.65 ? 2 : 1;
    pix(x, TINTA, cx - w - 1, y);
    pix(x, TINTA, cx + w + 1, y);
    pix(x, '#8a5a2c', cx - w, y, 2 * w + 1, 1);
    pix(x, '#c08a4c', cx - w, y);
    if (k === alto) pix(x, TINTA, cx - w, y - 1, 2 * w + 1, 1);
    if (k === alto && f > 0) {
      pix(x, '#2a7a3a', cx + 1, y - 3, 3, 2);
      pix(x, '#4fb34a', cx + 1, y - 3, 2, 1);
      pix(x, '#4fb34a', cx - 3, y - 2, 2, 1);
    }
  }
  return c;
}
function hRaices(fase: number): Hoja {
  const f = [0, 1, 2, 3].map((k) => raiz(fase, k));
  return [f[0], f[1], f[2], f[3], f[3], f[3]];
}
const hRaicesA = (): Hoja => hRaices(0);
const hRaicesB = (): Hoja => hRaices(2.3);

// -- setas: setas que brotan y espirales de colores
const SETAS: [Mat, string][] = [
  [{ ol: '#6a1c1c', base: '#e0483c', luz: '#ff8a70', som: '#a82a2a' }, '#ffffff'],
  [{ ol: '#3e1c5a', base: '#a85cc4', luz: '#dc9cf0', som: '#7a3a98' }, '#ffe66a'],
  [{ ol: '#5a4a0a', base: '#f0c030', luz: '#fff08a', som: '#c09020' }, '#e0483c'],
];
function seta(cap: Mat, punto: string, etapa: number): HTMLCanvasElement {
  const W = 19;
  const H = 20;
  const c = lienzo(W, H);
  const x = ctxDe(c);
  const rx = [3.2, 5.4, 7.6][etapa];
  const ch = [3, 5, 7][etapa];
  const sh = [2, 5, 7][etapa];
  x.drawImage(sombrear(5, sh + 1, caja(0, 0, 4, sh), { ol: '#6a5a40', base: '#f4ecd0', luz: '#ffffff', som: '#cbbf9a' }), 7, H - sh - 1);
  const wc = Math.ceil(2 * rx) + 3;
  const gorro = sombrear(wc, ch + 1, (i, j) => j <= ch && ((i - (wc - 1) / 2) / rx) ** 2 + ((j - ch) / ch) ** 2 <= 1, cap);
  const gx = (W - wc) >> 1;
  const gy = H - sh - 1 - ch;
  x.drawImage(gorro, gx, gy);
  if (etapa >= 1) {
    pix(x, punto, gx + 2, gy + 2, 2, 1);
    pix(x, punto, gx + wc - 5, gy + 2, 2, 1);
  }
  if (etapa === 2) pix(x, punto, gx + (wc >> 1) - 1, gy + 4, 2, 1);
  return c;
}
function hSeta(v: number): Hoja {
  const f = [0, 1, 2].map((e) => seta(SETAS[v][0], SETAS[v][1], e));
  return [f[0], f[1], f[2], f[2], f[2], f[2]];
}
const hSetaA = (): Hoja => hSeta(0);
const hSetaB = (): Hoja => hSeta(1);
const hSetaC = (): Hoja => hSeta(2);
const ARCO_IRIS = ['#ff4a8a', '#ffd83a', '#4fd8a0', '#4a9aff', '#c25cff'];
function hEspiral(): Hoja {
  const R = 10;
  const T = 2 * R + 3;
  const c = lienzo(T, T);
  const x = ctxDe(c);
  const cc = (T - 1) / 2;
  for (let j = 0; j < T; j++) {
    for (let i = 0; i < T; i++) {
      const dx = i - cc;
      const dy = j - cc;
      const d = Math.hypot(dx, dy);
      if (d > R + 0.4) continue;
      if (d > R - 1) {
        pix(x, TINTA, i, j);
        continue;
      }
      const fase = (Math.atan2(dy, dx) / (Math.PI * 2) + 1 + d / 4.2) % 1;
      pix(x, ARCO_IRIS[Math.floor(fase * ARCO_IRIS.length)], i, j);
    }
  }
  return girar(c);
}
function hEsporaArcoiris(): Hoja {
  return ampH(ARCO_IRIS.slice(0, 4).map((col) => filas(['.p.', 'pwp', '.p.'], { p: col, w: '#ffffff' })));
}

// -- burbujeo: burbujas con chispitas
function burbuja(r: number, chispa: number): HTMLCanvasElement {
  const T = 2 * r + 3;
  const c = lienzo(T, T);
  const x = ctxDe(c);
  const cc = (T - 1) / 2;
  for (let j = 0; j < T; j++) {
    for (let i = 0; i < T; i++) {
      const dx = i - cc;
      const dy = j - cc;
      const d = Math.hypot(dx, dy);
      const e = Math.abs(d - r);
      if (e <= 0.8) pix(x, dx + dy > r * 0.4 ? '#3a84d0' : '#7ac8f4', i, j);
      else if (d < r - 0.8 && dx + dy < -r * 0.5 && d > r * 0.45) pix(x, '#e8f8ff', i, j);
    }
  }
  pix(x, '#ffffff', Math.round(cc - r * 0.55), Math.round(cc - r * 0.55), 2, 1);
  pix(x, '#ffffff', Math.round(cc - r * 0.55), Math.round(cc - r * 0.55) + 1, 1, 1);
  if (chispa) {
    pix(x, AMARILLO, cc - 1, cc, 3, 1);
    pix(x, AMARILLO, cc, cc - 1, 1, 3);
    pix(x, BLANCO, cc, cc, 1, 1);
    if (chispa > 1) {
      pix(x, AMARILLO, cc - 2, cc - 2);
      pix(x, AMARILLO, cc + 2, cc + 2);
    }
  }
  return c;
}
function hBurbujas(): Hoja {
  return [burbuja(7, 1), burbuja(5, 2), burbuja(4, 1)];
}
function hReventon(): Hoja {
  return [3, 5, 7].map((r) => {
    const T = 2 * r + 13;
    const c = lienzo(T, T);
    const x = ctxDe(c);
    const cc = (T - 1) / 2;
    const rr = r + 3;
    for (let j = 0; j < T; j++) {
      for (let i = 0; i < T; i++) {
        const dx = i - cc;
        const dy = j - cc;
        const e = Math.abs(Math.hypot(dx, dy) - rr);
        if (e > 0.8) continue;
        const s = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 12);
        if (s % 3 === 0) pix(x, '#7ac8f4', i, j);
      }
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.4;
      pix(x, k & 1 ? AMARILLO : BLANCO, Math.round(cc + Math.cos(a) * (rr + 3)), Math.round(cc + Math.sin(a) * (rr + 3)), 2, 2);
    }
    return c;
  });
}

// -- pesao: la P gordita
function pe(): HTMLCanvasElement {
  const bowl: Masc = (i, j) => i >= 1 && i <= 15 && j >= 0 && j <= 12 && !(i >= 14 && (j <= 1 || j >= 11)) && !(i === 15 && (j === 2 || j === 10));
  const contra: Masc = (i, j) => i >= 7 && i <= 10 && j >= 3 && j <= 8;
  return sombrear(17, 22, union(resta(bowl, contra), caja(1, 0, 7, 21)), { ol: '#8a3a10', base: '#ffb830', luz: '#fff08a', som: '#e0701c' });
}
function hPe(): Hoja {
  const p = pe();
  const ch = lienzo(25, 12);
  const x = ctxDe(ch);
  x.drawImage(p, 0, 0, 25, 12);
  return [esc(p, 1.4), esc(ch, 1.4)];
}

// -- tubo perfecto: ola que rompe
function hOla(): Hoja {
  const W = 62;
  const H = 52;
  const base = H - 2;
  const F: [number, number, number][] = [[22, 16, 0], [26, 28, 1], [30, 38, 2], [36, 12, 3]];
  return F.map(([px, ph, lab]) => {
    const alto = (i: number): number => {
      if (i <= px) return ph * Math.sin((i / px) * (Math.PI / 2)) ** 1.5;
      if (lab === 3) return Math.max(0, ph * (1 - (i - px) / 22));
      if (lab === 0) return Math.max(0, ph * (1 - (i - px) / 12));
      // con el labio hecho, la cara de la ola queda hueca: una pared fina y la espuma baja delante
      return i - px <= 3 ? ph * (1 - (i - px) / 3) * 0.9 : i - px <= 22 ? 5 : 0;
    };
    const lx = px + 8;
    const ly = base - ph + 11;
    const labio: Masc = (i, j) => {
      if (lab === 0 || lab === 3) return false;
      const dx = i - lx;
      const dy = j - ly;
      const d = Math.hypot(dx, dy);
      return d <= 11 && d >= 6.2 && (dy < 0 || dx > 0) && dy < 3 + lab * 4;
    };
    const m: Masc = (i, j) => i >= 0 && i < W && j >= 0 && j <= base && (j >= base - alto(i) || labio(i, j));
    const c = lienzo(W, H);
    const x = ctxDe(c);
    for (let j = 0; j <= base; j++) {
      for (let i = 0; i < W; i++) {
        if (!m(i, j)) continue;
        let prof = 0;
        while (prof < 20 && m(i, j - prof - 1)) prof++;
        let col = prof === 0 ? '#ffffff' : prof === 1 ? '#e4f8ff' : prof < 4 ? '#9fe0ff' : prof < 9 ? '#4aa8f0' : prof < 17 ? '#2a74d0' : '#1c4aa0';
        if ((i * 7 + j * 13) % 19 === 0 && prof > 1 && prof < 12) col = '#e4f8ff';
        if (j < base && (!m(i - 1, j) || !m(i + 1, j) || !m(i, j - 1) || !m(i, j + 1))) col = TINTA;
        else if (lab === 3 && prof < 3 && (i + j) % 3 === 0) col = '#ffffff';
        pix(x, col, i, j);
      }
    }
    return c;
  });
}
function hSalpiconAgua(): Hoja {
  return hSalpicon('#1c4aa0', '#4aa8f0', '#e4f8ff');
}
function hGotaAgua(): Hoja {
  const mat: Mat = { ol: '#1c4aa0', base: '#4aa8f0', luz: '#e4f8ff', som: '#2a74d0' };
  return [sombrear(7, 10, gotaM(3, 3, 10), mat), sombrear(5, 7, gotaM(2, 2, 7), mat)];
}

// -- bajarse los pantalones
const MAT_VAQUERO: Mat = { ol: TINTA, base: '#3a6ac8', luz: '#7aa6f4', som: '#284a98' };
function hPantalones(): Hoja {
  const c = sombrear(22, 22, union(caja(0, 0, 21, 9), caja(0, 10, 9, 21), caja(12, 10, 21, 21)), MAT_VAQUERO);
  const x = ctxDe(c);
  pix(x, '#7a4a24', 1, 1, 20, 2);
  pix(x, '#a8743a', 1, 1, 20, 1);
  pix(x, AMARILLO, 9, 1, 4, 2);
  pix(x, TINTA, 10, 2, 2, 1);
  pix(x, '#9ac0ff', 3, 5, 5, 1);
  pix(x, '#9ac0ff', 14, 5, 5, 1);
  pix(x, '#9ac0ff', 4, 14, 1, 4);
  return [c];
}
function hPantalonesCaidos(): Hoja {
  const c = sombrear(30, 10, union(eli(15, 5, 14.4, 4.4), caja(1, 4, 6, 8), caja(23, 4, 28, 8)), MAT_VAQUERO);
  const x = ctxDe(c);
  pix(x, '#7a4a24', 12, 2, 6, 2);
  pix(x, AMARILLO, 14, 2, 2, 2);
  pix(x, '#9ac0ff', 7, 5, 4, 1);
  return [c];
}
function hCalzoncillos(): Hoja {
  const c = sombrear(18, 10, union(caja(0, 0, 17, 5), caja(0, 6, 7, 9), caja(10, 6, 17, 9)), { ol: TINTA, base: '#fff8e0', luz: '#ffffff', som: '#d4cce4' });
  const x = ctxDe(c);
  for (const i of [3, 7, 11, 14]) pix(x, '#f0507c', i, 2, 2, 1);
  for (const i of [4, 8, 12]) pix(x, '#f0507c', i, 3, 1, 1);
  pix(x, '#9cb8f4', 1, 1, 16, 1);
  return [c];
}
function hRubor(): Hoja {
  const o = '#a82a5a';
  return [astro(3, o, '#ff9ac0', '#ffffff'), astro(5, o, '#ff9ac0', '#ffffff'), astro(4, o, '#ff9ac0', '#ffffff')];
}

// -- De Goudamadre: sartén con aceite y llamarada
function sarten(f: number): HTMLCanvasElement {
  const c = sombrear(34, 15, union(eli(12, 7, 11.6, 6.6), caja(22, 6, 33, 8)), { ol: TINTA, base: '#4a4a58', luz: '#8a8a9c', som: '#2a2a38' });
  const x = ctxDe(c);
  rellenarDisco(x, '#f0b030', 12, 6, 7.4);
  pix(x, '#ffe08a', 5, 4, 5, 1);
  pix(x, '#b86a14', 9, 9, 8, 1);
  pix(x, '#ffffff', f ? 14 : 9, f ? 5 : 6, 2, 1);
  pix(x, '#ffffff', f ? 8 : 15, f ? 7 : 4, 1, 1);
  pix(x, '#ffe08a', f ? 11 : 17, f ? 3 : 7, 2, 1);
  pix(x, '#8a8a9c', 24, 6, 8, 1);
  return c;
}
function hSartenVuela(): Hoja {
  return girar(sarten(0));
}
function hSartenQuieta(): Hoja {
  return [sarten(0), sarten(1)];
}
function hLlamarada(): Hoja {
  const W = 34;
  const H = 52;
  return [0, 1, 2, 3].map((f) => {
    const lenguas: [number, number, number][] = [[17, 40, 9], [8, 28, 6], [26, 31, 6.5]];
    const lengua = (alto: number, ancho: number, cx: number, fase: number): Masc => (i, j) => {
      const k = H - 3 - j;
      if (k < 0 || k > alto) return false;
      const u = k / alto;
      return Math.abs(i - (cx + 2.2 * Math.sin(k * 0.3 + fase) * u)) <= ancho * (1 - u ** 1.6) + 0.3;
    };
    const m = union(...lenguas.map(([cx, ah, an], n) => lengua(ah + ((f + n) % 3) * 2, an, cx, f * 1.6 + n)));
    const cv = sombrear(W, H, m, MAT_FUEGO[0]);
    const x = ctxDe(cv);
    const dentro = union(...lenguas.map(([cx, ah, an], n) => lengua((ah + ((f + n) % 3) * 2) * 0.62, an * 0.55, cx, f * 1.6 + n)));
    const nucleo = union(...lenguas.map(([cx, ah, an], n) => lengua((ah + ((f + n) % 3) * 2) * 0.34, an * 0.3, cx, f * 1.6 + n)));
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        if (nucleo(i, j)) pix(x, BLANCO, i, j);
        else if (dentro(i, j)) pix(x, AMARILLO, i, j);
      }
    }
    return cv;
  });
}

// -- Al tendedero: trozos de cuerda (cuatro orientaciones), pinzas de colores y, de vuelta, los pantalones
/** Un trozo de cuerda de tender: 0 horizontal, 1 diagonal «\», 2 vertical, 3 diagonal «/». */
function trozoCuerda(dir: number): HTMLCanvasElement {
  const L = 12;
  const w = dir === 2 ? 8 : L + 6;
  const h = dir === 0 ? 8 : L + 6;
  const c = lienzo(w, h);
  const x = ctxDe(c);
  const [x0, y0, x1, y1] = dir === 0 ? [3, 3, w - 4, 3] : dir === 2 ? [3, 3, 3, h - 4] : dir === 1 ? [3, 3, w - 4, h - 4] : [3, h - 4, w - 4, 3];
  linea(x, '#5a3a1e', x0, y0, x1, y1, 4);
  linea(x, '#d8bc8c', x0, y0, x1, y1, 2);
  // El torzal: un píxel más claro cada tres.
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let k = 1; k < n; k += 3) pix(x, '#f4e4bc', Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n));
  return c;
}
function hCuerdas(): Hoja {
  return [0, 1, 2, 3].map(trozoCuerda);
}
function hPinzas(): Hoja {
  const fila = ['.kkk.', 'kcllk', 'kcclk', '.kgk.', '.kck.', '.kck.', 'kc.ck'];
  return [
    ['#e0524a', '#ff9a8c'],
    ['#4a8ae0', '#9cc4ff'],
    ['#ffd83a', '#fff2a0'],
  ].map(([c, l]) => esc(filas(fila, { k: TINTA, c, l, g: '#a8aab8' }), 1.5));
}

// -- Remate por bulerías: el cajón que vuela y los golpes que suenan cada vez más grandes
function hCajon(): Hoja {
  const c = sombrear(15, 15, caja(0, 0, 14, 14), { ol: '#3a200e', base: '#c8884a', luz: '#ecb674', som: '#96602c' });
  const x = ctxDe(c);
  pix(x, '#f4d098', 2, 2, 11, 1);
  rellenarDisco(x, '#2a1608', 7, 8, 3);
  pix(x, '#6a4020', 6, 7, 2, 1);
  for (const [i, j] of [[2, 4], [12, 4], [2, 12], [12, 12]]) pix(x, '#e8e0d0', i, j);
  return girar(c).map((f) => esc(f, 1.5));
}
/** Estrella de impacto de seis tamaños (`idx` 0..5: cuanto más fuerte el golpe, más grande), con tres fotogramas: nace, estalla y se encoge. */
const RADIOS_REMATE = [6, 9, 13, 17, 21, 26];
function hGolpeCajon(idx: number): Hoja {
  const R = RADIOS_REMATE[idx];
  const a: Mat = { ol: '#c83a78', base: AMARILLO, luz: BLANCO, som: NARANJA };
  const b: Mat = { ol: '#c83a78', base: '#ff9ac0', luz: BLANCO, som: '#ee6aa4' };
  return [pum(Math.max(4, Math.round(R * 0.6)), Math.round(R * 0.3), 8, a), pum(R, Math.round(R * 0.5), 9, a), pum(Math.round(R * 0.85), Math.round(R * 0.4), 9, b)];
}

// ---- Tanda 8: maletas, tarjetas, cinturones, focos, micros, coches de choque, fichas, mordiscos, limones, tajos, papel, abanicos, cerveza ----
/** Destello de cuatro puntas en cuatro tamaños (nace, estalla, se afloja, se apaga). */
function hDestello(borde: string, medio: string, rs: number[] = [3, 6, 5, 2]): Hoja {
  return rs.map((r) => astro(r, borde, medio, '#ffffff'));
}
const hDestelloVerde = (): Hoja => hDestello('#1c7a3a', '#6ee06e');
const hDestelloAmarillo = (): Hoja => hDestello('#c8a81a', '#ffe83a');
const hDestelloTurquesa = (): Hoja => hDestello('#1c6a66', '#6ee8dc');
const hClic = (): Hoja => hDestello('#6a9ae0', '#cfe6ff', [4, 9, 7, 3]);

// -- maletazo: maleta blanca que cae, se aplasta y rebota
function hMaleta(): Hoja {
  const c = lienzo(24, 21);
  const x = ctxDe(c);
  pix(x, TINTA, 8, 0, 8, 1);
  pix(x, TINTA, 8, 1, 1, 4);
  pix(x, TINTA, 15, 1, 1, 4);
  pix(x, '#9a9aac', 9, 1, 6, 1);
  x.drawImage(sombrear(24, 15, (i, j) => !((i === 0 || i === 23) && (j === 0 || j === 14)), { ol: TINTA, base: '#f4f0ff', luz: '#ffffff', som: '#c4bcdc' }), 0, 4);
  pix(x, '#4a8ae0', 5, 5, 2, 13);
  pix(x, '#4a8ae0', 17, 5, 2, 13);
  pix(x, '#9cc4ff', 5, 5, 1, 13);
  pix(x, '#9cc4ff', 17, 5, 1, 13);
  pix(x, AMARILLO_OSC, 11, 10, 2, 3);
  pix(x, TINTA, 3, 19, 3, 2);
  pix(x, TINTA, 18, 19, 3, 2);
  // Aplastada: más ancha y más baja, apoyada en el mismo suelo.
  const s = lienzo(28, 21);
  ctxDe(s).drawImage(c, 0, 4, 28, 17);
  return [c, s];
}

// -- embarque: tarjeta de embarque y su fantasma
function hTarjeta(): Hoja {
  const c = sombrear(24, 12, (i, j) => !((i === 0 || i === 23) && (j === 0 || j === 11)), { ol: TINTA, base: '#fffdf0', luz: '#ffffff', som: '#d4cce4' });
  const x = ctxDe(c);
  pix(x, '#3a6ac8', 1, 1, 22, 2);
  pix(x, ROJO, 1, 4, 5, 7);
  for (const j of [4, 6, 8, 10]) pix(x, '#a8a8bc', 6, j);
  for (const i of [9, 11, 12, 14, 16, 17, 19]) pix(x, TINTA, i, 5, 1, 5);
  pix(x, '#ffffff', 3, 5, 1, 5);
  pix(x, '#ffffff', 2, 8, 3, 1);
  return [c];
}
function hTarjetaFantasma(): Hoja {
  return [sombrear(18, 8, (i, j) => !((i === 0 || i === 17) && (j === 0 || j === 7)), { ol: '#cfe6ff', base: '#f4fbff', luz: '#ffffff', som: '#cfe6ff' })];
}

// -- cinturones: cinturón de avión que baja abierto, se acerca y se abrocha con su hebilla
function hCinturon(): Hoja {
  const W = 52;
  const H = 22;
  const cx = 26;
  const cy = 10;
  const dentro = (i: number, j: number, rx: number, ry: number): boolean => ((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1;
  return [12, 6, 0].map((hueco) => {
    const c = lienzo(W, H);
    const x = ctxDe(c);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        if (!dentro(i, j, 24, 7.5) || dentro(i, j, 21, 4.6)) continue;
        if (j + 0.5 > cy + 1 && Math.abs(i + 0.5 - cx) < hueco) continue;
        const borde = !dentro(i, j, 23, 6.5) || dentro(i, j, 22, 5.6);
        pix(x, borde ? TINTA : j + 0.5 < cy ? '#6a9af0' : '#3a6ac8', i, j);
      }
    }
    if (hueco === 0) {
      pix(x, TINTA, 20, 12, 12, 7);
      pix(x, AMARILLO, 21, 13, 10, 5);
      pix(x, '#fff4a0', 21, 13, 10, 1);
      pix(x, AMARILLO_OSC, 21, 17, 10, 1);
      pix(x, '#a8aab8', 23, 15, 6, 1);
    }
    return esc(c, 1.5);
  });
}

// -- improvisa: foco con su haz, signos de interrogación y bombilla
function hFoco(): Hoja {
  const c = lienzo(44, 58);
  const x = ctxDe(c);
  for (let j = 10; j < 58; j++) {
    const semi = 5 + ((j - 10) / 47) * 17;
    for (let i = Math.ceil(22 - semi); i < 22 + semi; i++) {
      if (Math.abs(i + 0.5 - 22) > semi - 1.3) pix(x, '#ffe66a', i, j);
      else if ((i + j) & 1) pix(x, '#fff6b8', i, j);
    }
  }
  x.drawImage(sombrear(16, 10, (i, j) => !((i === 0 || i === 15) && (j === 0 || j === 9)), { ol: TINTA, base: '#5a5a68', luz: '#9a9aac', som: '#3a3a48' }), 14, 0);
  pix(x, BLANCO, 17, 8, 10, 1);
  pix(x, AMARILLO, 18, 9, 8, 1);
  return [c];
}
function hInterrogantes(): Hoja {
  return ['#ffd83a', '#ffffff'].map((col) => {
    const c = lienzo(11, 13);
    const x = ctxDe(c);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) marca(x, G_INTE, TINTA, 3 + dx, 2 + dy);
    marca(x, G_INTE, col, 3, 2);
    return esc(c, 1.5);
  });
}
function hBombilla(): Hoja {
  return [false, true].map((enc) => {
    const c = lienzo(15, 22);
    const x = ctxDe(c);
    x.drawImage(sombrear(15, 15, disco(7, 7, 6.6), enc ? { ol: '#a8801a', base: '#ffe83a', luz: '#fffbd0', som: '#f0c020' } : { ol: '#6a6a7c', base: '#d8d8e4', luz: '#ffffff', som: '#a8a8bc' }), 0, 0);
    const f = enc ? '#e08a24' : '#6a6a7c';
    pix(x, f, 6, 8, 3, 1);
    pix(x, f, 5, 6, 1, 2);
    pix(x, f, 9, 6, 1, 2);
    pix(x, TINTA, 4, 14, 7, 1);
    pix(x, '#a8aab8', 4, 15, 7, 2);
    pix(x, TINTA, 4, 17, 7, 1);
    pix(x, '#a8aab8', 5, 18, 5, 1);
    pix(x, TINTA, 5, 19, 5, 1);
    pix(x, TINTA, 6, 20, 3, 1);
    return c;
  });
}

// -- monólogo: micrófono de pie, ondas en arco y un bocadillo con «!»
function hMicro(): Hoja {
  const c = lienzo(18, 42);
  const x = ctxDe(c);
  x.drawImage(sombrear(12, 12, disco(5.5, 5.5, 5.6), { ol: TINTA, base: '#6a6a7c', luz: '#b0b0c4', som: '#44445a' }), 3, 0);
  for (let j = 2; j < 10; j++) for (let i = 4; i < 14; i++) if (((i + j) & 1) && Math.hypot(i - 8.5, j - 5.5) < 4.2) pix(x, '#9a9aac', i, j);
  pix(x, ROJO, 6, 11, 6, 1);
  pix(x, TINTA, 8, 12, 2, 3);
  pix(x, '#8a8a9c', 8, 15, 2, 21);
  pix(x, '#c8c8d8', 8, 15, 1, 21);
  linea(x, TINTA, 9, 36, 3, 41, 1);
  linea(x, TINTA, 9, 36, 15, 41, 1);
  linea(x, TINTA, 9, 36, 9, 41, 1);
  return [c];
}
/** Arcos de onda (tres tamaños) que se abren hacia la derecha (`dir` 1) o la izquierda (-1). */
function hArcos(dir: number): Hoja {
  return [8, 13, 19].map((r) => {
    const T = 2 * r + 7;
    const c = lienzo(T, T);
    const x = ctxDe(c);
    const m = T / 2;
    for (let j = 0; j < T; j++) {
      for (let i = 0; i < T; i++) {
        const dx = i + 0.5 - m;
        const dy = j + 0.5 - m;
        const e = Math.abs(Math.hypot(dx, dy) - r);
        if (e > 1.9 || Math.abs(Math.atan2(dy, dx * dir)) > 0.9) continue;
        pix(x, e <= 0.9 ? '#fff0a0' : AMARILLO_OSC, i, j);
      }
    }
    return c;
  });
}
const hArcosD = (): Hoja => hArcos(1);
const hArcosI = (): Hoja => hArcos(-1);

// -- carambola: coche de choque con su pértiga y su chispa
const MAT_COCHE: Mat = { ol: '#5a1818', base: '#e8503c', luz: '#ff9a78', som: '#b02a2a' };
function hCoche(dir: number): Hoja {
  return [0, 1].map((f) => {
    const c = lienzo(26, 21);
    const x = ctxDe(c);
    linea(x, '#6a6a7c', 6, 9, 5, 2, 1);
    x.drawImage(sombrear(26, 12, union(caja(0, 3, 25, 9), caja(5, 0, 18, 3)), MAT_COCHE), 0, 8);
    pix(x, AMARILLO, 2, 14, 22, 1);
    pix(x, '#a8e4ff', 8, 9, 10, 2);
    pix(x, '#d8f4ff', 8, 9, 3, 1);
    pix(x, '#fff8c0', 24, 13, 2, 2);
    pix(x, '#3a3a48', 0, 18, 26, 2);
    pix(x, '#8a8a9c', 1, 18, 24, 1);
    if (f) {
      pix(x, '#ffffff', 3, 0, 5, 3);
      pix(x, AMARILLO, 5, 0, 1, 3);
    } else {
      pix(x, AMARILLO, 4, 0, 3, 3);
      pix(x, '#ffffff', 5, 1, 1, 1);
    }
    return dir > 0 ? c : espejo(c);
  });
}
const hCocheD = (): Hoja => hCoche(1);
const hCocheI = (): Hoja => hCoche(-1);

// -- ficha: máquina con su ranura (apagada y encendida) y la moneda dorada que gira
function hRanura(): Hoja {
  return [false, true].map((enc) => {
    const c = sombrear(30, 18, (i, j) => !((i === 0 || i === 29) && (j === 0 || j === 17)), { ol: TINTA, base: '#2a3a78', luz: '#5a6ac0', som: '#1c2858' });
    const x = ctxDe(c);
    pix(x, '#e0a83a', 4, 5, 22, 1);
    pix(x, '#e0a83a', 4, 10, 22, 1);
    pix(x, '#e0a83a', 4, 6, 1, 4);
    pix(x, '#e0a83a', 25, 6, 1, 4);
    pix(x, enc ? '#b8ffb0' : TINTA, 6, 6, 18, 4);
    if (enc) pix(x, '#3ac060', 6, 8, 18, 2);
    pix(x, enc ? '#6ee06e' : ROJO, 3, 2, 3, 2);
    pix(x, enc ? '#6ee06e' : ROJO, 24, 2, 3, 2);
    pix(x, enc ? '#6ee06e' : '#8c1c1c', 13, 13, 4, 2);
    return esc(c, 1.5);
  });
}
function hFicha(): Hoja {
  const mat: Mat = { ol: '#8a5a14', base: AMARILLO, luz: '#fff4a0', som: '#e0a83a' };
  return [12, 9, 5, 9].map((w, f) => {
    const c = sombrear(w, 12, eli((w - 1) / 2, 5.5, w / 2, 6), mat);
    if (f === 0) {
      const x = ctxDe(c);
      for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) if (Math.abs(Math.hypot(i - 5.5, j - 5.5) - 3.3) < 0.6) pix(x, '#e0a83a', i, j);
    }
    return c;
  });
}

// -- crujiente: mandíbulas que se cierran (dos fotogramas) y migas doradas
function hMordisco(): Hoja {
  const diente = (desp: number): Masc => (i, j) => {
    if (j <= 7) return eli(11.5, 7, 11.5, 7.5)(i, j);
    const k = (((i + desp) % 6) + 6) % 6;
    return j <= 10 && Math.abs(k - 2) <= (10 - j) * 0.5 + 0.5;
  };
  const mat: Mat = { ol: TINTA, base: '#fffbea', luz: '#ffffff', som: '#e4dcc0' };
  const mandibula = (desp: number, abajo: boolean): HTMLCanvasElement => {
    const base = diente(desp);
    return sombrear(24, 11, abajo ? (i, j) => base(i, 10 - j) : base, mat);
  };
  return [
    [0, 13],
    [3, 10],
  ].map(([yt, yb], f) => {
    const c = lienzo(24, 24);
    const x = ctxDe(c);
    if (f === 0) pix(x, '#7a1c24', 3, 11, 18, 2);
    x.drawImage(mandibula(3, true), 0, yb);
    x.drawImage(mandibula(0, false), 0, yt);
    return c;
  });
}
function hMigasCrujientes(): Hoja {
  const p = { k: '#7a4a1c', l: '#fff0b0', g: '#e8b84a', d: '#c08a2c' };
  return [amp(filas(['.kk.', 'klgk', 'kgdk', '.kk.'], p)), amp(filas(['kk', 'kd'], p)), ...ampH([filas(['kkk', 'klk', 'kkk'], p)])];
}

// -- limón: gajo que se exprime y gotas amarillas
function hGajo(): Hoja {
  const c = sombrear(26, 14, (i, j) => Math.hypot(i + 0.5 - 13, j + 0.5) <= 13.2, { ol: '#8a7a0c', base: '#ffe83a', luz: '#fffbb0', som: '#d8c020' });
  const x = ctxDe(c);
  for (let j = 2; j < 14; j++) for (let i = 1; i < 25; i++) if (Math.hypot(i + 0.5 - 13, j + 0.5) <= 10) pix(x, '#fff6a0', i, j);
  for (const a of [0.52, 1.57, 2.62]) for (let r = 2; r <= 10; r++) pix(x, '#ffe83a', Math.round(13 + r * Math.cos(a)), Math.round(r * Math.sin(a)));
  const s = lienzo(30, 14);
  ctxDe(s).drawImage(c, 0, 0, 26, 14, 0, 0, 30, 10);
  return [c, s];
}
function hGotaLimon(): Hoja {
  return ampH([filas(['.a.', 'aaA', '.A.'], { a: '#ffe83a', A: '#c8a81a' }), filas(['aa', 'aA'], { a: '#ffe83a', A: '#c8a81a' })]);
}

// -- corte de papel: tajo diagonal fino (crece, brilla, se afina) y trocitos de papel
function hTajo(): Hoja {
  const N = 46;
  return [0.55, 1, 1].map((hasta, f) => {
    const c = lienzo(N, N);
    const x = ctxDe(c);
    for (let pasada = 0; pasada < 2; pasada++) {
      if (f === 2 && pasada === 0) continue;
      for (let k = 0; k <= 44; k++) {
        const t = k / 44;
        if (t > hasta) break;
        const w = f === 2 ? 1 : Math.max(1, Math.round(1 + 2.4 * Math.sin(Math.PI * t))) + (pasada === 0 ? 2 : 0);
        const px = 2 + t * 41 - (w - 1) / 2;
        pix(x, pasada === 0 ? '#bcd4f0' : f === 2 ? '#cfe6ff' : '#ffffff', Math.round(px), Math.round(px), w, w);
      }
    }
    return c;
  });
}
function hTrozosPapel(): Hoja {
  const p = { w: '#ffffff', W: '#cfe6ff' };
  return ampH([filas(['wW', 'Ww'], p), filas(['w.', 'Ww'], p), filas(['ww'], p)]);
}

// -- papiroflexia: hoja turquesa en tres etapas del pliegue (cara y canto de cada una, para que gire)
const MAT_PAPEL: Mat = { ol: '#1c6a66', base: '#4fd0c4', luz: '#a8f4ec', som: '#2a9a90' };
function hPapel(etapa: number): Hoja {
  if (etapa === 0) {
    const c = sombrear(17, 17, caja(0, 0, 16, 16), MAT_PAPEL);
    const x = ctxDe(c);
    for (let j = 2; j < 16; j++) for (let i = 1; i < j - 1; i++) pix(x, '#3fbfb4', i, j);
    for (let i = 1; i < 16; i++) pix(x, MAT_PAPEL.luz, i, i);
    return [c, sombrear(4, 17, caja(0, 0, 3, 16), MAT_PAPEL)];
  }
  if (etapa === 1) {
    const c = sombrear(17, 10, caja(0, 0, 16, 9), MAT_PAPEL);
    const x = ctxDe(c);
    pix(x, MAT_PAPEL.luz, 1, 4, 15, 1);
    pix(x, '#3fbfb4', 1, 5, 15, 3);
    return [c, sombrear(4, 10, caja(0, 0, 3, 9), MAT_PAPEL)];
  }
  const c = sombrear(21, 11, (i, j) => Math.abs(j - 5) <= ((20 - i) * 5) / 20 + 0.4, MAT_PAPEL);
  const x = ctxDe(c);
  for (let i = 2; i < 19; i++) {
    pix(x, MAT_PAPEL.luz, i, 5);
    if (i < 17) pix(x, '#3fbfb4', i, 6);
  }
  return [c, sombrear(21, 3, (i, j) => j === 1 || i < 15, MAT_PAPEL)];
}
const hPapel0 = (): Hoja => hPapel(0);
const hPapel1 = (): Hoja => hPapel(1);
const hPapel2 = (): Hoja => hPapel(2);

// -- pasodoble: abanico rojo y amarillo que se abre, y notas rojas y amarillas
function hAbanico(): Hoja {
  const W = 37;
  const H = 27;
  const cx = 18;
  const cy = 22;
  const R = 17;
  return [0.2, 0.65, 1.1, 1.25].map((sp) => {
    const dentro: Masc = (i, j) => {
      const dx = i + 0.5 - cx;
      const dy = cy - (j + 0.5);
      return dy >= -1 && Math.hypot(dx, dy) <= R && Math.abs(Math.atan2(dx, dy)) <= sp;
    };
    const c = sombrear(W, H, dentro, { ol: '#6a1818', base: ROJO, luz: '#ff7a5a', som: ROJO_OSC });
    const x = ctxDe(c);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        if (!dentro(i, j)) continue;
        const dx = i + 0.5 - cx;
        const dy = cy - (j + 0.5);
        const d = Math.hypot(dx, dy);
        if (d >= R - 1.5 || d < 4) continue;
        const sector = Math.floor(((Math.atan2(dx, dy) + sp) / (2 * sp)) * 7);
        pix(x, sector & 1 ? AMARILLO : '#e8503c', i, j);
      }
    }
    pix(x, '#8a5a2c', cx - 1, cy, 3, 4);
    pix(x, TINTA, cx - 1, cy + 4, 3, 1);
    return c;
  });
}
function hNotasPaso(): Hoja {
  const fila = ['..kkk...', '..kcck..', '..kck.k.', '..kck..k', '..kck...', '..kck...', 'kkkck...', 'kccdk...', 'kcddk...', '.kkk....'];
  return [
    { k: TINTA, c: '#ff5a46', d: '#a82a2a' },
    { k: TINTA, c: AMARILLO, d: '#c8901c' },
  ].map((p) => amp(filas(fila, p)));
}

// -- mancha de cerveza: charco ámbar que crece, con sus burbujas
const MAT_CERVEZA: Mat = { ol: '#6a3a08', base: '#e0a020', luz: '#ffe08a', som: '#b86a14' };
function hManchaCerveza(): Hoja {
  const sat: [number, number, number][] = [[-0.95, -0.5, 0.36], [0.95, -0.3, 0.3], [0.2, 0.95, 0.32], [-0.6, 0.85, 0.28], [0.75, 0.7, 0.26]];
  return [7, 10, 12].map((r) => {
    const T = 2 * r + 10;
    const c = T / 2;
    const cv = sombrear(T, T, union(eli(c, c, r * 1.1, r * 0.85), ...sat.map(([dx, dy, rr]) => disco(c + dx * r, c + dy * r, rr * r))), MAT_CERVEZA);
    const x = ctxDe(cv);
    pix(x, '#fff0b0', Math.round(c - r * 0.5), Math.round(c - r * 0.4), 3, 1);
    pix(x, '#fff0b0', Math.round(c - r * 0.5), Math.round(c - r * 0.4) + 1, 1, 2);
    pix(x, '#fff0b0', Math.round(c + r * 0.3), Math.round(c + r * 0.2), 2, 1);
    return cv;
  });
}

// ---- Tanda 9: sombrero de charro, corazones, salsa, tentáculos, tinta, nube triste y lluvia fina -------------------
/** Una mancha blanda con salpicaduras (como las de la cerveza y el aceite) en el material dado; tres tamaños. */
function manchaBlanda(mat: Mat, rs: number[], brillo: string): Hoja {
  const sat: [number, number, number][] = [[-0.95, -0.5, 0.36], [0.95, -0.3, 0.3], [0.2, 0.95, 0.32], [-0.6, 0.85, 0.28], [0.75, 0.7, 0.26]];
  return rs.map((r) => {
    const T = 2 * r + 10;
    const c = T / 2;
    const cv = sombrear(T, T, union(eli(c, c, r * 1.1, r * 0.85), ...sat.map(([dx, dy, rr]) => disco(c + dx * r, c + dy * r, rr * r))), mat);
    const x = ctxDe(cv);
    pix(x, brillo, Math.round(c - r * 0.5), Math.round(c - r * 0.4), 3, 1);
    pix(x, brillo, Math.round(c - r * 0.5), Math.round(c - r * 0.4) + 1, 1, 2);
    pix(x, brillo, Math.round(c + r * 0.3), Math.round(c + r * 0.2), 2, 1);
    return cv;
  });
}

// -- ¡Ay, ay, ay!: el sombrero de charro del cantante
function hSombrero(): Hoja {
  const c = sombrear(23, 14, union(caja(7, 1, 15, 8), eli(11, 10, 11, 3.2)), { ol: '#6a4a10', base: '#e8c050', luz: '#fff0a0', som: '#b08a28' });
  const x = ctxDe(c);
  pix(x, ROJO, 8, 6, 7, 2);
  for (const i of [9, 11, 13]) pix(x, AMARILLO, i, 6, 1, 1);
  pix(x, '#fff0a0', 2, 9, 3, 1);
  pix(x, '#fff0a0', 18, 9, 3, 1);
  return [esc(c, 1.5)];
}

// -- Serenata: un corazón rosa de buen tamaño
function hCorazonSerenata(): Hoja {
  const p = { k: TINTA, R: '#f0507c', w: '#ffc0d0' };
  return [amp(filas(CORAZON_P, p)), esc(filas(CORAZON_P, p), 1.5)];
}

// -- Salsa picante: gotas y mancha rojas
function hGotaSalsa(): Hoja {
  return ampH([filas(['.a.', 'aaA', '.A.'], { a: '#e8402c', A: '#8c1c1c' }), filas(['aa', 'aA'], { a: '#e8402c', A: '#8c1c1c' })]).map((c) => esc(c, 1.5));
}
function hManchaSalsa(): Hoja {
  return manchaBlanda({ ol: '#5a0f0f', base: '#d4382c', luz: '#ff8a5c', som: '#8c1c1c' }, [7, 10, 12], '#ffd0a0');
}

// -- Ocho tortas: un tentáculo morado con ventosas que se alza y se estampa (tres fotogramas), y su explosión morada
const MAT_PULPO: Mat = { ol: '#3a1c5c', base: '#8a4ac8', luz: '#c89af0', som: '#5c2c94' };
function tentaculo(curl: number): HTMLCanvasElement {
  const W = 36;
  const H = 28;
  const eje = (u: number): [number, number] => [3 + u * 29, 22 - 18 * Math.sin(Math.PI * u * 0.92) + curl * 11 * u * u];
  const ancho = (u: number): number => 4.4 * (1 - u) + 1.2;
  // La máscara se estampa una vez (un disco por punto del eje) en vez de medir la distancia a todos los puntos desde cada píxel.
  const masa = new Uint8Array(W * H);
  for (let k = 0; k <= 40; k++) {
    const u = k / 40;
    const [px, py] = eje(u);
    const r = ancho(u);
    for (let j = Math.max(0, Math.floor(py - r)); j <= Math.min(H - 1, Math.ceil(py + r)); j++) for (let i = Math.max(0, Math.floor(px - r)); i <= Math.min(W - 1, Math.ceil(px + r)); i++) if ((i - px) ** 2 + (j - py) ** 2 <= r * r) masa[j * W + i] = 1;
  }
  const c = sombrear(W, H, (i, j) => i >= 0 && j >= 0 && i < W && j < H && masa[j * W + i] === 1, MAT_PULPO);
  const x = ctxDe(c);
  for (let k = 3; k <= 8; k++) {
    const [px, py] = eje(k / 10 - 0.05);
    pix(x, '#f4b8e0', Math.round(px), Math.round(py + ancho(k / 10) * 0.5), 1, 1);
  }
  return c;
}
function hTentaculo(dir: number): Hoja {
  return [0, 0.6, 1.3].map((curl) => (dir > 0 ? tentaculo(curl) : espejo(tentaculo(curl))));
}
const hTentaculoD = (): Hoja => hTentaculo(1);
const hTentaculoI = (): Hoja => hTentaculo(-1);
function hPumMorado(): Hoja {
  return [pum(7, 3, 8, { ol: '#3a1c5c', base: '#c89af0', luz: '#ffffff', som: '#8a4ac8' })];
}

// -- Chorro de tinta: gotas negras y una mancha que se extiende
const MAT_TINTA: Mat = { ol: '#07050c', base: '#17132a', luz: '#6a6aa0', som: '#0a0814' };
function hGotaTinta(): Hoja {
  return ampH([filas(['.a.', 'aaA', '.A.'], { a: '#262040', A: '#0a0710' }), filas(['aa', 'aA'], { a: '#262040', A: '#0a0710' })]).map((c) => esc(c, 1.5));
}
function hManchaTinta(): Hoja {
  return manchaBlanda(MAT_TINTA, [9, 14, 17], '#9a9ad0');
}

// -- Morriña: una nube gris con cara triste y lluvia fina
function hNubeTriste(): Hoja {
  const c = sombrear(42, 20, union(disco(10, 12, 6), disco(19, 9, 8), disco(29, 9, 8), disco(36, 12, 6), caja(10, 11, 36, 17)), { ol: '#4a5468', base: '#9aa4b8', luz: '#d0d8e8', som: '#6c778c' });
  const x = ctxDe(c);
  pix(x, TINTA, 15, 10, 2, 2);
  pix(x, TINTA, 25, 10, 2, 2);
  pix(x, TINTA, 18, 15, 5, 1);
  pix(x, TINTA, 17, 16, 1, 1);
  pix(x, TINTA, 23, 16, 1, 1);
  pix(x, '#6ab4f4', 14, 12, 1, 2);
  return [esc(c, 1.5)];
}
function hLluviaFina(): Hoja {
  const p = { a: '#e4efff', A: '#7aa4e8' };
  return [filas(['a', 'a', 'A', 'A', 'A', 'a'], p), filas(['a', 'A', 'A', 'A', 'a', 'a'], p)].map((c) => amp(c));
}

// ---- Tanda 12: fiesta, fotomatón, flash, nubarrón, billetes, calada y remolino de feria ------------------------
// -- Fiesta pagana: confeti de colores y serpentinas
const COL_CONFETI = ['#ff4a8a', '#ffd83a', '#4fd8a0', '#4a9aff', '#c25cff', '#ff8a2c'];
function hConfeti(): Hoja {
  return COL_CONFETI.map((col) => esc(amp(filas(['aA', 'Aa'], { a: col, A: mezcla(col, TINTA, 0.35) })), 1.5));
}
function serpentina(col: string, fase: number): HTMLCanvasElement {
  const c = lienzo(18, 9);
  const x = ctxDe(c);
  for (let i = 0; i < 18; i++) {
    const y = Math.round(3 + 2.6 * Math.sin(i * 0.75 + fase));
    pix(x, mezcla(col, TINTA, 0.4), i, y + 1, 1, 2);
    pix(x, col, i, y, 1, 2);
  }
  return c;
}
const hSerpentinaRosa = (): Hoja => [serpentina('#ff4a8a', 0), serpentina('#ff4a8a', 2.2)];
const hSerpentinaCian = (): Hoja => [serpentina('#4ad8e8', 1), serpentina('#4ad8e8', 3.2)];

// -- ¡Todos dentro!: la cortinilla roja del fotomatón y las líneas de presión
function hCortinilla(): Hoja {
  const W = 44;
  const H = 52;
  const c = lienzo(W, H);
  const x = ctxDe(c);
  const pliegue = [ROJO_OSC, ROJO, '#ec5a48', ROJO, '#a82a24'];
  for (let i = 0; i < W; i++) {
    const fondo = H - 1 - (((i / 4) | 0) & 1 ? 2 : 0);
    for (let j = 4; j <= fondo; j++) pix(x, i === 0 || i === W - 1 ? TINTA : j === fondo ? '#e0b83a' : pliegue[i % 5], i, j);
  }
  pix(x, '#6c6c7c', 0, 0, W, 4);
  pix(x, '#d8d8e8', 0, 0, W, 1);
  pix(x, TINTA, 0, 3, W, 1);
  for (let i = 2; i < W - 2; i += 6) pix(x, '#d8d8e8', i, 3, 3, 3);
  return [c];
}
function hLineasPresion(): Hoja {
  const h = lienzo(16, 3);
  const hx = ctxDe(h);
  pix(hx, BLANCO, 0, 0, 16, 2);
  pix(hx, TINTA, 0, 2, 16, 1);
  const d = lienzo(10, 10);
  const dx = ctxDe(d);
  linea(dx, TINTA, 0, 1, 8, 9, 2);
  linea(dx, BLANCO, 0, 0, 8, 8, 2);
  return [h, d, espejo(d)];
}

// -- Flash: fogonazo blanco-azulado, cruz de rayos y aspas
function discoRapido(x: CanvasRenderingContext2D, color: string, cx: number, cy: number, r: number): void {
  for (let j = -r; j <= r; j++) {
    const w = Math.floor(Math.sqrt(r * r - j * j) + 0.4);
    pix(x, color, cx - w, cy + j, 2 * w + 1, 1);
  }
}
function hFogonazoFoto(): Hoja {
  return [8, 22, 30, 14].map((r) => {
    const T = 2 * r + 3;
    const c = lienzo(T, T);
    const x = ctxDe(c);
    discoRapido(x, '#9ec4ff', r + 1, r + 1, r);
    discoRapido(x, '#ffffff', r + 1, r + 1, Math.round(r * 0.8));
    return c;
  });
}
function hCruzFlash(): Hoja {
  return [14, 30, 24, 10].map((r) => astro(r, '#4a78c8', '#cfe6ff', '#ffffff'));
}
function hAspasFlash(): Hoja {
  return [8, 16, 12, 6].map((r) => {
    const c = lienzo(2 * r + 3, 2 * r + 3);
    const x = ctxDe(c);
    for (const [a, b] of [[0, 2 * r + 2], [2 * r + 2, 0]]) {
      linea(x, '#9ec4ff', 0, a, 2 * r + 2, b, 3);
      linea(x, '#ffffff', 0, a, 2 * r + 2, b, 1);
    }
    return c;
  });
}

// -- Nubarrón: nube gris blandita, su sombra y un solcito
function hNubarron(): Hoja {
  return [sombrear(58, 28, union(disco(12, 17, 9), disco(25, 12, 12), disco(40, 12, 12), disco(49, 17, 8), caja(12, 16, 49, 26)), { ol: '#3a4254', base: '#8a92a6', luz: '#c0c8d8', som: '#626a80' })];
}
function hSombraNube(): Hoja {
  const c = lienzo(44, 10);
  const x = ctxDe(c);
  x.fillStyle = 'rgba(40,30,70,0.34)';
  for (let j = 0; j < 10; j++) {
    const w = Math.floor(22 * Math.sqrt(1 - ((j - 4.5) / 5) ** 2));
    x.fillRect(22 - w, j, 2 * w, 1);
  }
  return [c];
}
function hSolcito(): Hoja {
  const c = sombrear(23, 23, disco(11, 11, 6), { ol: '#c8601a', base: AMARILLO, luz: BLANCO, som: NARANJA });
  const x = ctxDe(c);
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) {
    for (const k of [9, 10]) pix(x, AMARILLO, Math.round(11 + dx * k), Math.round(11 + dy * k));
  }
  return [c];
}

// -- Está carísimo: billetes, monedas con € y la etiqueta de precio
const EURO = ['..###.', '.#...#', '#####.', '.#....', '#####.', '.#...#', '..###.'];
function hBillete(): Hoja {
  const m: Mat = { ol: '#1c5a2c', base: '#4fc070', luz: '#a8f0b8', som: '#2c8a48' };
  const a = sombrear(14, 8, caja(0, 0, 13, 7), m);
  pix(ctxDe(a), '#d8ffd8', 6, 3, 2, 2);
  const b = sombrear(14, 5, caja(0, 0, 13, 4), m);
  pix(ctxDe(b), '#d8ffd8', 6, 2, 2, 1);
  return [esc(a, 1.5), esc(b, 1.5)];
}
function hMoneda(): Hoja {
  const m: Mat = { ol: '#8a5a10', base: AMARILLO, luz: '#fff4b0', som: '#d09a20' };
  const frente = (): HTMLCanvasElement => {
    const c = sombrear(10, 10, disco(4.5, 4.5, 4), m);
    marca(ctxDe(c), EURO, '#a06a10', 2, 1);
    return c;
  };
  const medio = (): HTMLCanvasElement => sombrear(6, 10, eli(2.5, 4.5, 2.4, 4.4), m);
  const canto = (): HTMLCanvasElement => sombrear(3, 10, caja(0, 0, 2, 9), m);
  return [esc(frente(), 1.5), esc(medio(), 1.5), esc(canto(), 1.5), esc(medio(), 1.5)];
}
function hEtiqueta(): Hoja {
  const c = sombrear(24, 30, resta(resta(caja(2, 7, 21, 29), (i, j) => i + j < 12), (i, j) => j - i < -11), { ol: '#5a4a3a', base: '#fff8e0', luz: '#ffffff', som: '#d8cca8' });
  const x = ctxDe(c);
  pix(x, ROJO, 11, 1, 1, 8);
  pix(x, TINTA, 11, 9, 2, 2);
  marca(x, EURO, ROJO, 9, 14);
  pix(x, '#c8b890', 6, 24, 12, 1);
  return [esc(c, 1.5)];
}

// -- Calada: brasa, volutas y nube de humo gris
function hBrasaGrande(): Hoja {
  const m: Mat = { ol: ROJO_OSC, base: NARANJA, luz: AMARILLO, som: ROJO };
  const a = sombrear(9, 9, disco(4, 4, 3.4), m);
  pix(ctxDe(a), BLANCO, 3, 3, 2, 2);
  const b = sombrear(7, 7, disco(3, 3, 2.6), m);
  pix(ctxDe(b), AMARILLO, 3, 3, 1, 1);
  return [esc(a, 1.5), esc(b, 1.5)];
}
function hVoluta(): Hoja {
  const m: Mat = { ol: '#6a6070', base: '#c8c0cc', luz: '#eee8f0', som: '#9a90a4' };
  return [3, 4, 5, 6].map((r) => sombrear(2 * r + 3, 2 * r + 3, disco(r + 1, r + 1, r), m));
}

// -- Dar vueltas: remolino de aire de lado, luces de feria y estrellitas de mareo
function hRemolino(R: number): Hoja {
  return [0, 1, 2, 3].map((f) => {
    const W = 2 * R + 3;
    const H = Math.round(R * 1.2) + 3;
    const c = lienzo(W, H);
    const x = ctxDe(c);
    const cx = (W - 1) / 2;
    const cy = (H - 1) / 2;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const dx = i - cx;
        const dy = (j - cy) / 0.6;
        const d = Math.hypot(dx, dy);
        if (d > R || d < 3) continue;
        const u = ((Math.atan2(dy, dx) / (Math.PI * 2)) * 2 + d / 11 + f * 0.125 + 8) % 1;
        if (u < 0.12) pix(x, '#f4fbff', i, j);
        else if (u < 0.24) pix(x, '#9ec4ff', i, j);
        else if (u < 0.3) pix(x, '#4a78c8', i, j);
      }
    }
    return c;
  });
}
const hRemolinoG = (): Hoja => hRemolino(22);
const hRemolinoP = (): Hoja => hRemolino(15);
function hLuzFeria(col: string): Hoja {
  return [amp(filas(['.aa.', 'aWaa', 'aaaA', '.AA.'], { a: col, W: '#ffffff', A: mezcla(col, TINTA, 0.45) }))];
}
const hLuzAmarilla = (): Hoja => hLuzFeria('#ffd83a');
const hLuzRoja = (): Hoja => hLuzFeria('#ff3a2c');
const hEstrellitaMareo = (): Hoja => [astro(3, '#c8a81a', '#ffe83a', '#ffffff')];

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
  /** Cuánto pega el golpe del efecto que se lanza, de 0 a 1 (solo lo usan los movimientos de potencia variable: Remate por bulerías). */
  fuerza = 0.5;

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
   * mismo). Devuelve su duración en ms. Todos los objetivos a la vez. `fuerza` (0 a 1): lo fuerte que pega, para los de potencia variable.
   */
  lanzar(mov: string, tipo: Tipo, desde: PuntoFx, a: PuntoFx[], fuerza = 0.5): number {
    this.fin = 0;
    this.fuerza = fuerza;
    const f = a.length ? FX[mov] : FX_YO[mov];
    if (f) f(this, tipo, desde, a);
    else generico(this, tipo, desde, a, MOVS[mov]?.pot == null);
    return this.fin;
  }

  /** Avanza `dt` ms (`k`: el ritmo del combate, 2 = el doble de deprisa); true mientras haya algo en pantalla. */
  paso(dt: number, k = 1): boolean {
    let n = this.n;
    if (!n) return false;
    if (dt > 50) dt = 50;
    dt *= k;
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
    e.mk(memo('nube', hNube), t.x - 10, t.y - 40, t.x, t.y - 33, 0, 600, 0, 0, 0.3, 1, 0, 160);
    const hl = unos('lenteja', hLenteja);
    for (let i = 0; i < 11; i++) {
      const x = t.x + (az() - 0.5) * 40;
      const y1 = t.y + 14 + az() * 14;
      e.mk(hl[i & 1], x, t.y - 29, x + (az() - 0.5) * 6, y1, 70 + ((az() * 300) | 0), 300, 0, 0, 0.6, 2, 0, 100);
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
    golpe(e, 'chispa', t.x, t.y + 4, 100, 0);
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
      e.mk(notas[j][(j + k) & 1], d.x, d.y - 12, t.x + ox, t.y - 6, j * 60 + k * 15, 340, 0, 9, 1, 0, 0, 90);
    }
    golpe(e, tipo, t.x, t.y, 380, 0);
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

// ---- Tanda 5: los movimientos compartidos por varios useritos y los propios nuevos --------------------------
/** Que lo que sube desde un userito de la fila de arriba no se salga de la pantalla. */
const alto = (y: number): number => (y < 14 ? 14 : y);
const hasta = (a: number, b: number, u: number): number => a + (b - a) * u;

const chapa: Efecto = (e, tipo, d, a) => {
  const hb = memo('bocadillo', hBocadillos);
  for (const t of a) {
    // Cuatro bocadillos con «…» (sin letras) vuelan al rival, crecen según se acercan y se le quedan pegados.
    for (let i = 0; i < 4; i++) {
      const oy = (i - 1.5) * 8;
      e.mk(hb, d.x + 14, d.y - 14, t.x - 12 + (i & 1) * 18, t.y + oy, i * 65, 330, -16 + i * 3, 3, 0.7, 0, 0, 110);
    }
    golpe(e, tipo, t.x, t.y, 235, 3);
  }
};

const siesta: Efecto = (e, _tipo, d) => {
  e.mk(memo('almohada', hAlmohada), d.x, d.y + 24, d.x, d.y + 24, 0, 780, 0, 0, 1, 0, 0, 160);
  const hz = memo('zetas', hZetas);
  for (let i = 0; i < 3; i++) e.mk(hz, d.x + 10 + i * 6, alto(d.y - 22 - i * 3), d.x + 18 + i * 20, alto(d.y - 40 - i * 5), 90 + i * 170, 520, 0, -3, 1, 0, 0, 120);
  const hc = unos('cruz-cura', hCruces);
  for (let i = 0; i < 4; i++) {
    const x = d.x + (i - 1.5) * 18;
    e.mk(hc[i & 1], x, d.y + 12, x + 2, alto(d.y - 24 - (i & 1) * 8), 380 + i * 80, 400, 0, 0, 1, 1, 0, 100);
  }
};

const planeo: Efecto = (e, tipo, d, a) => {
  const hl = memo('luna', hLuna);
  const hp = unos('pluma', hPluma);
  for (const t of a) {
    const arco = -52;
    e.mk(hl, d.x, d.y, t.x, t.y, 0, 300, arco, 0, 1, 0, 0, 0);
    // La estela: plumas que se quedan en el aire por donde pasa y caen despacio.
    for (let i = 1; i <= 5; i++) {
      const u = i / 6;
      const x = hasta(d.x, t.x, u);
      const y = hasta(d.y, t.y, u) + arco * 4 * u * (1 - u);
      e.mk(hp[i & 1], x, y, x - 4, y + 22, u * 300, 330, 0, -5, 1, 0, 0, 110);
    }
    golpe(e, tipo, t.x, t.y, 295, 3);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * 6.283 + az();
      e.mk(hp[i & 1], t.x, t.y, t.x + Math.cos(ang) * 28, t.y + Math.sin(ang) * 20, 300, 340, -10, 0, 1, 1, 0, 110);
    }
  }
};

const POOF_POS: [number, number][] = [[-20, -16], [0, -22], [20, -16], [-24, 4], [24, 4], [-18, 22], [0, 26], [18, 22], [0, 2]];
const esconderse: Efecto = (e, tipo, d) => {
  const hp = memo('poof', hPoof);
  for (let i = 0; i < POOF_POS.length; i++) {
    const [dx, dy] = POOF_POS[i];
    e.mk(hp, d.x + dx * 0.5, d.y + dy * 0.5, d.x + dx, alto(d.y + dy), i * 20, 540, 0, 0, 0.4, 1, 0, 150);
  }
  const hc = memoT('astilla', tipo, hAstilla2);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * 6.283 + 0.4;
    e.mk(hc, d.x, d.y, d.x + Math.cos(ang) * 38, alto(d.y + Math.sin(ang) * 34), 100, 380, -8, 0, 1, 1, 80, 100);
  }
};

const pringue: Efecto = (e, _tipo, d, a) => {
  const hg = unos('goteron-aceite', hGoteronAceite);
  const hm = memo('mancha', hMancha);
  a.forEach((t, k) => {
    // Un goterón enorme sale del que lo suelta y revienta en el rival, y las gotas salpican a los de alrededor.
    e.mk(hg[0], d.x, d.y, t.x, t.y - 4, k * 25, 230, -26, 0, 1, 0, 0, 0);
    e.mk(hm, t.x, t.y, t.x, t.y + 2, 230 + k * 25, 500, 0, 0, 1, 0, 0, 150);
    for (let i = 0; i < 4; i++) {
      const dx = (i - 1.5) * 18 + entre(-4, 4);
      e.mk(hg[1], t.x, t.y - 4, t.x + dx, t.y + 14 + entre(0, 10), 235 + k * 25, 300, -entre(14, 28), 0, 1, 0, 0, 90);
    }
  });
};

const rebozado: Efecto = (e, _tipo, d) => {
  const hm = unos('migas', hMigas);
  const y0 = alto(d.y - 44);
  // Llueve pan rallado dorado sobre el que se rebozaba y se le queda pegado por todas partes.
  for (let i = 0; i < 22; i++) {
    const x = d.x + entre(-26, 26);
    e.mk(hm[i % 3], x, y0, x + entre(-3, 3), alto(d.y + entre(-22, 24)), i * 12, 420, 0, 0, 0.55, 2, 0, 130);
  }
  const hb = memoT('brillo', 'grasa', hBrillo);
  for (let i = 0; i < 3; i++) e.mk(hb, d.x + (i - 1) * 20, alto(d.y - 6 + (i & 1) * 12), d.x + (i - 1) * 20, alto(d.y - 14 + (i & 1) * 12), 300 + i * 70, 300, 0, 0, 1, 1);
};

const cara_de_pena: Efecto = (e, _tipo, d, a) => {
  const hl = unos('lagrima', hLagrimas);
  const hc = memo('corazon-roto', hCorazonRoto);
  const hp = memo('corazoncito', hCorazoncito);
  for (const t of a) {
    // Tres lagrimones salen de los ojos hacia el rival...
    for (let i = 0; i < 3; i++) e.mk(hl[0], d.x + 8, d.y - 8, t.x - 12 + i * 12, t.y - 6 + i * 4, i * 80, 230, -22, 0, 1, 0, 0, 0);
    // ...y encima de él se rompe un corazón (y dos más pequeños).
    e.mk(hc, t.x, alto(t.y - 28), t.x, alto(t.y - 20), 200, 520, 0, 0, 1, 0, 0, 120);
    for (let i = 0; i < 2; i++) e.mk(hp, t.x + (i ? 22 : -22), alto(t.y - 14), t.x + (i ? 24 : -24), alto(t.y - 4), 330 + i * 80, 420, 0, 0, 1, 0, 0, 100);
    for (let i = 0; i < 4; i++) {
      const x = t.x + (i - 1.5) * 13;
      e.mk(hl[1], x, t.y - 12, x + (i - 1.5) * 3, t.y + 22, 270 + i * 40, 300, 0, 0, 1, 2, 0, 90);
    }
  }
};

const vacile: Efecto = (e, tipo, d, a) => {
  const hc = memo('carita', hCarita);
  const hx = memo('exclamacion', hExclamacion);
  for (const t of a) {
    e.mk(hc, d.x + 12, d.y - 8, t.x, t.y - 6, 0, 340, -20, 3, 0.7, 0, 0, 100);
    golpe(e, tipo, t.x, t.y, 235, 3);
    for (let i = 0; i < 3; i++) e.mk(hx, t.x + (i - 1) * 17, alto(t.y - 20), t.x + (i - 1) * 17, alto(t.y - 32 - (i & 1) * 6), 240 + i * 60, 380, 0, 0, 1, 1, 0, 110);
  }
};

const venganza: Efecto = (e, tipo, d, a) => {
  // Se enciende un aura roja con la marca de enfado, y el puño sale como un obús.
  e.mk(memo('aura', hAura), d.x, d.y, d.x, d.y, 0, 330, 0, 0, 1, 0, 70, 90);
  e.mk(memo('enfado', hEnfado), d.x + 18, alto(d.y - 26), d.x + 20, alto(d.y - 32), 40, 270, 0, 0, 1, 1, 0, 90);
  for (const t of a) {
    e.mk(memo('puno', hPuno), d.x, d.y, t.x, t.y, 170, 170, 0, 0, 1, 2, 0, 0);
    e.mk(memo('pum-rojo', hPumRojo), t.x, t.y, t.x, t.y, 340, 300);
    golpe(e, tipo, t.x, t.y, 340, 4);
  }
};

const adoquin: Efecto = (e, tipo, d, a) => {
  const hm = unos('mitad-adoquin', hMitadesAdoquin);
  const hc = unos('cascote', hCascotes);
  const hp = unos('polvo', hPolvo);
  for (const t of a) {
    // Sube alto, cae en parábola y se parte en dos; los cascotes saltan y queda una grieta en el suelo.
    e.mk(memo('adoquin', hAdoquin), d.x, d.y, t.x, t.y - 2, 0, 330, -66, 0, 1, 0, 70);
    e.mk(memo('craquelado', hCraquelado), t.x, t.y + 20, t.x, t.y + 20, 335, 440, 0, 0, 1, 0, 0, 130);
    e.mk(hm[0], t.x - 2, t.y, t.x - 20, t.y + 14, 335, 300, -16, 0, 1, 0, 0, 90);
    e.mk(hm[1], t.x + 2, t.y, t.x + 20, t.y + 14, 335, 300, -22, 0, 1, 0, 0, 90);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * 6.283 + az() * 0.8;
      e.mk(hc[i % 3], t.x, t.y, t.x + Math.cos(ang) * entre(18, 34), t.y + Math.sin(ang) * 18 + 8, 340, 320, -entre(14, 30), 0, 1, 0, 0, 100);
    }
    for (let i = 0; i < 2; i++) e.mk(hp[1], t.x + (i ? 12 : -12), t.y + 18, t.x + (i ? 18 : -18), t.y + 14, 340, 340, 0, 0, 1, 0, 0, 120);
    golpe(e, tipo, t.x, t.y, 330, 0);
  }
};

const caparazon: Efecto = (e, tipo, d) => {
  // El escudo se cierra desde fuera, queda brillando un momento y se apaga parpadeando.
  e.mk(memo('caparazon-cierra', hCaparazonCierra), d.x, d.y, d.x, d.y, 0, 280);
  e.mk(memo('caparazon-fijo', hCaparazonFijo), d.x, d.y, d.x, d.y, 280, 520, 0, 0, 1, 0, 130, 170);
  const hb = memoT('brillo', tipo, hBrillo);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * 6.283 + 0.8;
    e.mk(hb, d.x + Math.cos(ang) * 22, alto(d.y + Math.sin(ang) * 20), d.x + Math.cos(ang) * 30, alto(d.y + Math.sin(ang) * 27), 300 + i * 50, 300, 0, 0, 1, 1);
  }
};

const barrigazo: Efecto = (e, tipo, d, a) => {
  const ho = memo('onda', hOnda);
  for (const t of a) {
    e.mk(memo('barriga', hBarriga), d.x, d.y, t.x, t.y, 0, 230, -14, 0, 1, 2);
    e.mk(memo('pum', hPum), t.x, t.y, t.x, t.y, 230, 300);
    e.mk(ho, t.x, t.y + 4, t.x, t.y + 4, 235, 380);
    e.mk(ho, t.x, t.y + 4, t.x, t.y + 4, 310, 380);
    golpe(e, tipo, t.x, t.y, 235, 5);
  }
};

const ronda: Efecto = (e, tipo, d, a) => {
  const hc = memo('cana', hCana);
  const he = memo('espuma', hEspuma);
  const hs = unos('espumita', hEspumita);
  a.forEach((t, k) => {
    // Dos cañas por rival: llegan girando, revientan en espuma blanca y brindan.
    for (let i = 0; i < 2; i++) e.mk(hc, d.x, d.y - 4, t.x + (i ? 10 : -10), t.y + (i ? 6 : -6), i * 85 + k * 20, 290, -30 - i * 8, 0, 1, 0, 55);
    e.mk(he, t.x, t.y - 2, t.x, t.y - 6, 300 + k * 20, 340);
    for (let i = 0; i < 2; i++) e.mk(hs[i], t.x + (i ? 12 : -12), t.y, t.x + (i ? 20 : -20), t.y - 24, 310 + k * 20, 300, 0, 0, 1, 1, 0, 100);
    golpe(e, tipo, t.x, t.y, 295 + k * 20, 0);
  });
};

const unamas: Efecto = (e, tipo, d, a) => {
  const hj = memo('jarra', hJarra);
  const hs = unos('espumita', hEspumita);
  const hb = memoT('brillo', tipo, hBrillo);
  // Una jarra en alto del que pide otra, y a cada rival se le llena una delante hasta rebosar de espuma.
  e.mk(hj, d.x, alto(d.y - 40), d.x, alto(d.y - 44), 0, 560, 0, 0, 1, 0, 0, 130);
  a.forEach((t, k) => {
    e.mk(hj, t.x, t.y, t.x, t.y - 2, 80 + k * 40, 560, 0, 0, 1, 0, 0, 130);
    for (let i = 0; i < 2; i++) e.mk(hs[i], t.x + (i ? 14 : -14), t.y - 8, t.x + (i ? 20 : -20), t.y - 26, 430 + k * 40, 300, 0, 0, 1, 1, 0, 100);
    e.mk(hb, t.x, t.y - 20, t.x, t.y - 30, 460 + k * 40, 300, 0, 0, 1, 1);
  });
};

const compas: Efecto = (e, _tipo, d) => {
  const hp = memo('palmas', hPalmas);
  const y = alto(d.y - 34);
  // Tres palmas al ritmo, notas sueltas y, al final, flechas rojas que suben (sube el Ataque).
  for (let i = 0; i < 3; i++) e.mk(hp, d.x + (i - 1) * 8, y, d.x + (i - 1) * 8, y, i * 150, 150);
  const hn = memo('nota-suelta', hNotaSuelta);
  for (let i = 0; i < 3; i++) e.mk(hn, d.x + (i - 1) * 26, alto(d.y - 6), d.x + (i - 1) * 32, alto(d.y - 40 - (i & 1) * 8), 90 + i * 110, 360, 0, 5, 1, 0, 0, 100);
  const hf = memo('flecha-arriba', hFlechaArriba);
  for (let i = 0; i < 3; i++) e.mk(hf, d.x + (i - 1) * 18, alto(d.y + 6), d.x + (i - 1) * 18, alto(d.y - 22), 330 + i * 70, 340, 0, 0, 1, 1, 0, 110);
};

const zasca: Efecto = (e, tipo, _d, a) => {
  for (const t of a) {
    // Bofetón de ida y vuelta: dos latigazos blancos cruzados y la marca de la mano en rojo.
    e.mk(memo('latigo', hLatigo), t.x, t.y - 4, t.x, t.y - 4, 0, 170);
    e.mk(memo('latigo-e', hLatigoEspejo), t.x, t.y + 4, t.x, t.y + 4, 90, 170);
    e.mk(memo('manota', hManota), t.x - 2, t.y, t.x - 2, t.y, 80, 560, 0, 0, 1, 0, 0, 220);
    golpe(e, tipo, t.x, t.y, 80, 4);
  }
};

const coz: Efecto = (e, tipo, d, a) => {
  const hh = memo('herradura', hHerradura);
  const hp = unos('polvo', hPolvo);
  for (const t of a) {
    for (let i = 0; i < 2; i++) {
      const x = t.x + (i ? 9 : -9);
      const y = t.y + (i ? 8 : -8);
      const ret = i * 170;
      // Dos coces seguidas: la herradura llega, se queda marcada un instante y suelta estrellas.
      e.mk(hh, d.x, d.y, x, y, ret, 320, 0, 0, 0.4, 2, 0, 110);
      golpe(e, tipo, x, y, ret + 125, i ? 5 : 3);
      e.mk(hp[0], x, y + 10, x + (i ? 8 : -8), y + 6, ret + 130, 260);
    }
  }
};

const raices: Efecto = (e, _tipo, d, a) => {
  const hr = [memo('raices-a', hRaicesA), memo('raices-b', hRaicesB)];
  const hb = memoT('brillo', 'droga', hBrillo);
  for (const t of a) {
    // Brotan del suelo bajo el rival, se enroscan a su alrededor (unas más altas que otras) y le chupan fuerzas.
    const pos = [-26, -14, 14, 26, -4, 6];
    pos.forEach((dx, i) => e.mk(hr[i & 1], t.x + dx, t.y + 3 - (i > 3 ? 4 : 0), t.x + dx, t.y + 3 - (i > 3 ? 4 : 0), i * 40, 440, 0, 0, 1, 0, 0, 130));
    for (let i = 0; i < 3; i++) e.mk(hb, t.x + (i - 1) * 10, t.y - 4, hasta(t.x, d.x, 0.9) + (i - 1) * 6, hasta(t.y, d.y, 0.9), 330 + i * 70, 340, -22, 0, 1, 0, 0, 90);
  }
};

const setas: Efecto = (e, tipo, _d, a) => {
  const hs = [memo('seta-a', hSetaA), memo('seta-b', hSetaB), memo('seta-c', hSetaC)];
  const hi = memo('espiral', hEspiral);
  const hp = unos('espora-arcoiris', hEsporaArcoiris);
  const pos: [number, number][] = [[-28, 14], [-18, 25], [-4, 29], [10, 28], [22, 24], [30, 12]];
  for (const t of a) {
    // Setas que brotan en círculo a sus pies y espirales de colores que giran sobre su cabeza.
    pos.forEach(([dx, dy], i) => e.mk(hs[i % 3], t.x + dx, t.y + dy - 6, t.x + dx, t.y + dy - 6, 120 + i * 45, 520, 0, 0, 1, 0, 0, 130));
    const sp: [number, number][] = [[-20, -26], [22, -20], [2, -38]];
    sp.forEach(([dx, dy], i) => e.mk(hi, t.x + dx, alto(t.y + dy), t.x + dx, alto(t.y + dy - 8), 200 + i * 80, 520, 0, 3, 1, 0, 90, 120));
    for (let i = 0; i < 6; i++) {
      const x = t.x + (az() - 0.5) * 50;
      e.mk(hp[i & 3], x, t.y + 14, x + (az() - 0.5) * 14, alto(t.y - 22 - az() * 14), 250 + i * 40, 360, 0, -3, 1, 1, 0, 100);
    }
    golpe(e, tipo, t.x, t.y, 250, 0);
  }
};

const burbujeo: Efecto = (e, _tipo, d, a) => {
  const hb = unos('burbuja', hBurbujas);
  const hr = memo('reventon', hReventon);
  const hc = unos('chispa', hChispa);
  a.forEach((t, k) => {
    for (let i = 0; i < 3; i++) {
      const ret = i * 70 + k * 20;
      const tx = t.x + (i - 1) * 12;
      const ty = t.y + (i - 1) * 8;
      // Las burbujas ondulan hacia ellos y revientan en un chispazo.
      e.mk(hb[i], d.x, d.y, tx, ty, ret, 260, -10, 7, 1, 0, 0, 0);
      e.mk(hr, tx, ty, tx, ty, ret + 260, 200);
      e.mk(hc[i & 1], tx, ty, tx + (i - 1) * 14, ty - 10 + (i & 1) * 22, ret + 270, 220, -6, 0, 1, 1, 0, 80);
    }
  });
};

const pesao: Efecto = (e, tipo, _d, a) => {
  const hb = unos('bocadillo-pesao', hBocadillosPesao);
  const hp = unos('pe', hPe);
  for (const t of a) {
    // Una P gordita cae sobre el rival y lo aplasta, y con ella le llueven los bocadillos de «!» y «?».
    for (let i = 0; i < 3; i++) {
      const x = t.x + (i - 1) * 20;
      e.mk(hb[i], x, alto(t.y - 62), x, t.y - 14 + (i & 1) * 12, i * 90, 230, 0, 0, 0.8, 2, 0, 0);
    }
    e.mk(hp[0], t.x, alto(t.y - 64), t.x, t.y - 6, 100, 230, 0, 0, 1, 2);
    e.mk(hp[1], t.x, t.y + 2, t.x, t.y + 2, 330, 330, 0, 0, 1, 0, 0, 110);
    golpe(e, tipo, t.x, t.y - 2, 330, 3);
  }
};

const tubo: Efecto = (e, tipo, d, a) => {
  const hs = memo('salpicon-agua', hSalpiconAgua);
  const hg = unos('gota-agua', hGotaAgua);
  const hb = memoT('brillo', tipo, hBrillo);
  for (const t of a) {
    // Una ola se levanta sobre el rival, hace el tubo y rompe encima de él.
    e.mk(memo('ola', hOla), t.x - 2, t.y + 2, t.x + 2, t.y + 2, 0, 520, 0, 0, 1, 0, 0, 130);
    e.mk(hs, t.x, t.y + 14, t.x, t.y + 14, 290, 260);
    for (let i = 0; i < 6; i++) {
      const x = t.x + (i - 2.5) * 10;
      e.mk(hg[i & 1], x, t.y + 6, x + (i - 2.5) * 5, t.y + 24, 280, 300, -entre(18, 34), 0, 1, 0, 0, 90);
    }
  }
  // El que la surfea acelera: unos brillos.
  for (let i = 0; i < 3; i++) e.mk(hb, d.x + (i - 1) * 14, alto(d.y - 8), d.x + (i - 1) * 14, alto(d.y - 22), 200 + i * 60, 300, 0, 0, 1, 1);
};

const pantalones: Efecto = (e, _tipo, d) => {
  // Los pantalones caen hasta los tobillos, asoma el calzoncillo y al pobre le salen colores.
  e.mk(memo('pantalones', hPantalones), d.x, alto(d.y + 4), d.x, d.y + 22, 0, 240, 0, 0, 1, 2);
  e.mk(memo('pantalones-caidos', hPantalonesCaidos), d.x, d.y + 26, d.x, d.y + 26, 240, 560, 0, 0, 1, 0, 0, 160);
  e.mk(memo('calzoncillos', hCalzoncillos), d.x, d.y + 7, d.x, d.y + 7, 200, 560, 0, 0, 1, 0, 0, 160);
  const hg = unos('gota-agua', hGotaAgua);
  for (let i = 0; i < 3; i++) {
    const s = i === 1 ? 1 : i === 0 ? -1 : 1;
    e.mk(hg[i & 1], d.x + s * 6, alto(d.y - 22), d.x + s * (18 + i * 4), alto(d.y - 12 + i * 6), 220 + i * 60, 320, -16, 0, 1, 0, 0, 90);
  }
  const hr = memo('rubor', hRubor);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * 6.283 + 0.6;
    e.mk(hr, d.x + Math.cos(ang) * 16, alto(d.y - 14 + Math.sin(ang) * 14), d.x + Math.cos(ang) * 26, alto(d.y - 14 + Math.sin(ang) * 24), 260 + i * 50, 380, 0, 0, 1, 1);
  }
};

const goudamadre: Efecto = (e, tipo, d, a) => {
  const hg = unos('gota', hGota);
  const hr = memo('brasa', hBrasa);
  for (const t of a) {
    // Una sartén con aceite hirviendo vuela, aterriza a los pies del rival y estalla en una llamarada.
    e.mk(memo('sarten-vuela', hSartenVuela), d.x, d.y, t.x, t.y + 14, 0, 250, -36, 0, 1, 0, 60);
    e.mk(memo('sarten-quieta', hSartenQuieta), t.x, t.y + 14, t.x, t.y + 14, 250, 420, 0, 0, 1, 0, 90, 130);
    e.mk(memo('llamarada', hLlamarada), t.x, t.y - 8, t.x, t.y - 8, 260, 400, 0, 0, 1, 0, 80, 120);
    for (let i = 0; i < 6; i++) {
      const dx = (i - 2.5) * 9;
      e.mk(hg[i & 1], t.x + dx * 0.3, t.y + 10, t.x + dx, t.y + 16 + entre(0, 6), 255, 320, -entre(24, 42), 0, 1, 0, 0, 90);
    }
    for (let i = 0; i < 4; i++) e.mk(hr, t.x + entre(-8, 8), t.y - 4, t.x + entre(-24, 24), t.y - entre(26, 38), 290, 280, -8, 0, 1, 1, 0, 90);
    golpe(e, tipo, t.x, t.y, 255, 0);
  }
};

/** Al tendedero: una cuerda con pinzas cruza hasta el rival y le suelta el golpe; unos pantalones vuelan de vuelta a quien la tiró. */
const tendedero: Efecto = (e, tipo, d, a) => {
  const hc = unos('cuerda', hCuerdas);
  const hp = unos('pinza', hPinzas);
  const hq = memo('pantalones', hPantalones);
  for (const t of a) {
    const dx = t.x - d.x;
    const dy = t.y - d.y;
    const n = Math.max(5, Math.min(18, Math.round(Math.hypot(dx, dy) / 10)));
    // La orientación de los trozos sale del ángulo del tiro (horizontal, diagonal o vertical).
    const g = Math.atan2(Math.abs(dy), Math.abs(dx));
    const dir = g < 0.39 ? 0 : g > 1.18 ? 2 : dx >= 0 === dy >= 0 ? 1 : 3;
    // La cuerda se tiende de punta a punta con un poco de panza, trozo a trozo.
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const ret = Math.round(u * 190);
      const x = d.x + dx * u;
      const y = d.y + dy * u + 40 * u * (1 - u);
      e.mk(hc[dir], x, y, x, y, ret, 520 - ret, 0, 0, 1, 0, 0, 110);
    }
    // Tres pinzas colgadas de la cuerda.
    [0.3, 0.5, 0.7].forEach((u, k) => {
      const ret = Math.round(u * 190) + 20;
      const x = d.x + dx * u;
      const y = d.y + dy * u + 40 * u * (1 - u) + 6;
      e.mk(hp[k], x, y, x, y, ret, 500 - ret, 0, 0, 1, 0, 0, 110);
    });
    golpe(e, tipo, t.x, t.y, 215, 3);
    // Y los pantalones vuelven volando al tendedero, con dos rachas de viento detrás.
    e.mk(hq, t.x, t.y - 4, d.x, d.y - 6, 235, 380, -34, 0, 1, 0, 0, 100);
    const hr = d.x >= t.x ? unos('racha+', hRachaD) : unos('racha-', hRachaI);
    for (let j = 0; j < 2; j++) e.mk(hr[j], t.x, t.y - 8 + j * 14, d.x, d.y - 14 + j * 14, 250 + j * 50, 330, 0, 0, 1, 0);
  }
};

/** Remate por bulerías: el cajón vuela hasta el rival y le suena tres veces, cada golpe con su estrella y su onda, y más grandes cuanta más potencia (`fuerza`). */
const remate: Efecto = (e, tipo, d, a) => {
  const hc = memo('cajon', hCajon);
  const quieto = unos('cajon-quieto', () => [hc[0]]);
  const ho = e.fuerza < 0.5 ? memo('onda-corta', () => memo('onda', hOnda).slice(0, 3)) : memo('onda', hOnda);
  const hn = memo('nota-suelta', hNotaSuelta);
  const base = Math.max(0, Math.min(3, Math.round(e.fuerza * 3)));
  const sitio: [number, number][] = [[-8, -6], [8, 2], [0, -10]];
  for (const t of a) {
    e.mk(hc, d.x, d.y, t.x, t.y, 0, 210, -26, 0, 1, 0, 55);
    e.mk(quieto[0], t.x, t.y, t.x, t.y, 210, 270, 0, 0, 1, 0, 0, 100);
    for (let k = 0; k < 3; k++) {
      const ret = 210 + k * 85;
      const x = t.x + sitio[k][0];
      const y = t.y + sitio[k][1];
      const idx = base + k;
      e.mk(memo(`golpe-cajon-${idx}`, () => hGolpeCajon(idx)), x, y, x, y, ret, 240);
      e.mk(ho, x, y + 4, x, y + 4, ret + 10, 300);
      golpe(e, tipo, x, y, ret, k === 2 ? 4 : 2);
    }
    for (let i = 0; i < 3; i++) e.mk(hn, t.x + (i - 1) * 22, t.y - 14, t.x + (i - 1) * 30, alto(t.y - 46 - (i & 1) * 8), 300 + i * 70, 340, 0, 5, 1, 0, 0, 100);
  }
};

// ---- Tanda 8 ----------------------------------------------------------------------------------------------------
/** Maletazo: una maleta blanca cae desde arriba sobre el rival, lo aplasta, rebota hacia un lado y levanta polvo. */
const maletazo: Efecto = (e, tipo, _d, a) => {
  const hm = unos('maleta', hMaleta);
  const hp = memo('polvo', hPolvo);
  for (const t of a) {
    const y = t.y + 8;
    e.mk(hm[0], t.x, alto(t.y - 70), t.x, y, 0, 190, 0, 0, 1, 2);
    e.mk(hm[1], t.x, y, t.x, y, 190, 70);
    e.mk(hm[0], t.x, y, t.x + 14, y, 260, 230, -24, 0, 1, 0);
    e.mk(hm[0], t.x + 14, y, t.x + 14, y, 490, 220, 0, 0, 1, 0, 0, 130);
    for (const s of [-1, 1]) {
      e.mk(hp, t.x + s * 8, y + 6, t.x + s * 26, y + 2, 190, 320, 0, 0, 1, 1);
      e.mk(hp, t.x + 14 + s * 6, y + 6, t.x + 14 + s * 20, y + 3, 490, 240, 0, 0, 1, 1);
    }
    e.mk(memo('pum', hPum), t.x, t.y, t.x, t.y, 190, 210);
    golpe(e, tipo, t.x, t.y, 190, 3);
  }
};

/** Embarque prioritario: una tarjeta de embarque cruza en línea recta con estela de imágenes fantasma y rachas. */
const embarque: Efecto = (e, tipo, d, a) => {
  const ht = memo('tarjeta', hTarjeta);
  const hf = memo('tarjeta-fantasma', hTarjetaFantasma);
  for (const t of a) {
    const dx = t.x - d.x;
    const dy = t.y - d.y;
    e.mk(ht, d.x, d.y, t.x, t.y, 0, 130);
    for (let k = 1; k <= 5; k++) {
      const u = k / 6;
      e.mk(hf, d.x + dx * u, d.y + dy * u, d.x + dx * u, d.y + dy * u, Math.round(u * 130) + 10, 110, 0, 0, 1, 0, 0, 80);
    }
    const hr = dx >= 0 ? unos('racha+', hRachaD) : unos('racha-', hRachaI);
    for (let j = 0; j < 2; j++) e.mk(hr[1], d.x, d.y - 8 + j * 16, d.x + dx * 0.9, d.y - 8 + j * 16 + dy * 0.9, 15 + j * 25, 110, 0, 0, 1, 0, 0, 60);
    e.mk(memo('pum', hPum), t.x, t.y, t.x, t.y, 130, 200);
    golpe(e, tipo, t.x, t.y, 130, 4);
  }
};

/** Abróchense los cinturones: un cinturón de avión baja abierto, se cierra alrededor del userito y la hebilla hace «clic». */
const cinturones: Efecto = (e, _tipo, d) => {
  const hc = unos('cinturon', hCinturon);
  const y = d.y + 8;
  e.mk(hc[0], d.x, alto(y - 34), d.x, y, 0, 130, 0, 0, 1, 2);
  e.mk(hc[1], d.x, y, d.x, y, 130, 70);
  e.mk(hc[2], d.x, y, d.x, y, 200, 460, 0, 0, 1, 0, 0, 150);
  e.mk(memo('clic', hClic), d.x, y + 9, d.x, y + 9, 205, 260);
  const hch = memo('chispa', hChispa);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * 6.283 + 0.78;
    e.mk(hch, d.x, y + 9, d.x + Math.cos(ang) * 26, y + 9 + Math.sin(ang) * 16, 210, 240, 0, 0, 1, 1, 70, 80);
  }
};

/** ¡Improvisa!: un foco ilumina al userito, le salen interrogantes y al final se le enciende una bombilla. */
const improvisa: Efecto = (e, _tipo, d) => {
  const cy = alto(d.y - 20);
  e.mk(memo('foco', hFoco), d.x, cy, d.x, cy, 0, 620, 0, 0, 1, 0, 0, 160);
  const hq = unos('interrogante', hInterrogantes);
  for (let i = 0; i < 3; i++) {
    const x = d.x + (i - 1) * 15;
    e.mk(hq[i & 1], x, alto(d.y - 14), x + (i - 1) * 6, alto(d.y - 42 - (i & 1) * 8), i * 70, 330, 0, 4, 1, 1, 0, 90);
  }
  const by = alto(d.y - 36);
  e.mk(memo('bombilla', hBombilla), d.x, alto(d.y - 20), d.x, by, 220, 400, 0, 0, 0.35, 1, 130, 120);
  e.mk(memo('destello-amarillo', hDestelloAmarillo), d.x, by - 2, d.x, by - 2, 330, 260);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * 6.283 + 0.78;
    e.mk(memo('destello-amarillo', hDestelloAmarillo), d.x, by, d.x + Math.cos(ang) * 22, by + Math.sin(ang) * 18, 340, 260, 0, 0, 1, 1, 0, 90);
  }
};

/** Monólogo: un micrófono de pie junto al atacante, ondas en arco hacia cada rival y un bocadillo con «!». */
const monologo: Efecto = (e, tipo, d, a) => {
  const mx = d.x + 10;
  const my = d.y + 6;
  e.mk(memo('micro', hMicro), mx, my, mx, my, 0, 480, 0, 0, 1, 0, 0, 130);
  e.mk(memo('onda-chica', hAnilloChico), mx, my - 15, mx, my - 15, 30, 280);
  const hb = memo('bocadillo-grande', () => [bocadillo(17, 11, '!', MAT_BOC, ROJO)]);
  for (const t of a) {
    const arcos = t.x >= mx ? unos('arcos+', hArcosD) : unos('arcos-', hArcosI);
    for (let k = 0; k < 3; k++) e.mk(arcos[k], mx, my - 15, t.x - (t.x >= mx ? 14 : -14), t.y, 50 + k * 45, 190, 0, 0, 1, 0, 0, 60);
    e.mk(hb, t.x, t.y - 20, t.x, alto(t.y - 34), 240, 330, 0, 0, 0.5, 1, 0, 120);
    golpe(e, tipo, t.x, t.y, 245, 3);
  }
};

/** Carambola: un coche de choque rebota de un rival a otro y suelta chispas en cada choque. */
const carambola: Efecto = (e, tipo, d, a) => {
  const hch = memo('chispa', hChispa);
  const fl = memo('flash-choque', () => hFlashTraca().slice(0, 3));
  let px = d.x;
  let py = d.y;
  let ret = 0;
  for (const t of a) {
    const coche = t.x >= px ? memo('coche+', hCocheD) : memo('coche-', hCocheI);
    e.mk(coche, px, py, t.x, t.y, ret, 95, -8, 0, 1, 0, 45);
    ret += 95;
    e.mk(fl, t.x, t.y, t.x, t.y, ret, 200);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * 6.283 + 0.4 * az();
      e.mk(hch, t.x, t.y, t.x + Math.cos(ang) * 22, t.y + Math.sin(ang) * 22, ret, 220, -6, 0, 1, 1, 70, 80);
    }
    golpe(e, tipo, t.x, t.y, ret, 3);
    px = t.x;
    py = t.y;
  }
  e.mk(memo('coche+', hCocheD), px, py, px, py, ret, 220, 0, 0, 1, 0, 45, 100);
};

/** Otra ficha: una ficha dorada gira y cae en la ranura de una máquina, que se enciende en verde; destellos de recarga. */
const ficha: Efecto = (e, _tipo, d) => {
  const sy = alto(d.y - 56);
  const hr = unos('ranura', hRanura);
  e.mk(hr[0], d.x, sy, d.x, sy, 0, 260);
  e.mk(hr[1], d.x, sy, d.x, sy, 260, 520, 0, 0, 1, 0, 0, 150);
  e.mk(memo('ficha', hFicha), d.x, sy - 42, d.x, sy - 2, 0, 260, 0, 0, 1, 2, 55);
  const hd = memo('destello-verde', hDestelloVerde);
  e.mk(hd, d.x, sy, d.x, sy, 260, 260);
  for (let i = 0; i < 6; i++) {
    const x = d.x + (i - 2.5) * 11;
    e.mk(hd, x, d.y + 12, x + (i - 2.5) * 2, alto(d.y - 22 - (i & 1) * 8), 280 + i * 40, 380, 0, 0, 1, 1);
  }
  const hc = memo('cruces', hCruces);
  e.mk(hc, d.x - 18, d.y, d.x - 22, alto(d.y - 26), 320, 400, 0, 0, 1, 1, 90, 120);
  e.mk(hc, d.x + 18, d.y + 4, d.x + 22, alto(d.y - 22), 380, 400, 0, 0, 1, 1, 90, 120);
};

/** Crujiente: tres mordiscos seguidos, cada uno con su ráfaga de migas doradas. */
const crujiente: Efecto = (e, tipo, _d, a) => {
  const hm = memo('mordisco', hMordisco);
  const hg = unos('miga-crujiente', hMigasCrujientes);
  const sitio: [number, number][] = [[-10, -6], [9, 5], [-2, -13]];
  for (const t of a) {
    for (let k = 0; k < 3; k++) {
      const ret = 40 + k * 100;
      const x = t.x + sitio[k][0];
      const y = t.y + sitio[k][1];
      e.mk(hm, x, y, x, y, ret, 200, 0, 0, 1, 0, 0, 60);
      e.mk(memo('pum', hPum), x, y, x, y, ret + 100, 160);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * 6.283 + az();
        const r = entre(14, 28);
        e.mk(hg[(i + k) % 3], x, y, x + Math.cos(ang) * r, y + Math.sin(ang) * r, ret + 100, 260, -entre(6, 14), 0, 1, 0, 0, 90);
      }
    }
    golpe(e, tipo, t.x, t.y, 240, 3);
  }
};

/** Con limón: un gajo de limón cae sobre el userito, se exprime y le caen gotitas amarillas. */
const limon: Efecto = (e, _tipo, d) => {
  const y = alto(d.y - 28);
  e.mk(memo('gajo', hGajo), d.x, y - 16, d.x, y, 0, 560, 0, 0, 0.2, 0, 85, 130);
  const hg = unos('gota-limon', hGotaLimon);
  for (let i = 0; i < 6; i++) {
    const s = i - 2.5;
    e.mk(hg[i & 1], d.x + s * 3, y + 8, d.x + s * 7, d.y + 14, 150 + i * 45, 280, 0, 0, 1, 2, 0, 80);
  }
  const hd = memo('destello-amarillo', hDestelloAmarillo);
  for (let i = 0; i < 3; i++) e.mk(hd, d.x + (i - 1) * 20, d.y + 6, d.x + (i - 1) * 24, alto(d.y - 16 - (i & 1) * 8), 300 + i * 60, 320, 0, 0, 1, 1);
};

/** Corte de papel: un tajo diagonal fino y blanco sobre el rival, con destello y trocitos de papel. */
const cortepapel: Efecto = (e, tipo, _d, a) => {
  const hp = unos('trozo-papel', hTrozosPapel);
  for (const t of a) {
    e.mk(memo('tajo', hTajo), t.x, t.y, t.x, t.y, 0, 270);
    e.mk(memo('clic', hClic), t.x, t.y, t.x, t.y, 70, 240);
    for (let i = 0; i < 5; i++) {
      const s = i - 2;
      e.mk(hp[i % 3], t.x + s * 5, t.y + s * 5, t.x + s * 12 + (i & 1 ? 8 : -8), t.y + s * 12 + (i & 1 ? -8 : 8), 70, 300, -8, 0, 1, 1, 0, 100);
    }
    golpe(e, tipo, t.x, t.y, 80, 2);
  }
};

/** Papiroflexia: tres hojas de papel turquesa giran alrededor del userito y se pliegan hasta ser aviones. */
const papiroflexia: Efecto = (e, _tipo, d) => {
  const etapas = [memo('papel0', hPapel0), memo('papel1', hPapel1), memo('papel2', hPapel2)];
  const SEG = 6;
  const paso = 65;
  for (let s = 0; s < 3; s++) {
    for (let g = 0; g < SEG; g++) {
      const a0 = (s * 2 * Math.PI) / 3 + (g * Math.PI) / 3;
      const a1 = a0 + Math.PI / 3;
      e.mk(etapas[g >> 1], d.x + Math.cos(a0) * 26, alto(d.y - 2 + Math.sin(a0) * 18), d.x + Math.cos(a1) * 26, alto(d.y - 2 + Math.sin(a1) * 18), g * paso, paso, 0, 0, 1, 0, 45);
    }
    const a2 = (s * 2 * Math.PI) / 3 + 2 * Math.PI;
    e.mk(etapas[2], d.x + Math.cos(a2) * 26, alto(d.y - 2 + Math.sin(a2) * 18), d.x + Math.cos(a2) * 34, alto(d.y - 12 + Math.sin(a2) * 22), SEG * paso, 240, 0, 0, 1, 1, 45, 100);
  }
  const hd = memo('destello-turquesa', hDestelloTurquesa);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * 6.283 + 0.78;
    e.mk(hd, d.x, d.y, d.x + Math.cos(ang) * 28, alto(d.y + Math.sin(ang) * 22), SEG * paso, 280, 0, 0, 1, 1);
  }
};

/** Pasodoble: notas rojas y amarillas vuelan al rival y un abanico rojo y amarillo se abre y le da un aletazo. */
const pasodoble: Efecto = (e, tipo, d, a) => {
  const hn = unos('nota-paso', hNotasPaso);
  const hab = memo('abanico', hAbanico);
  for (const t of a) {
    for (let i = 0; i < 5; i++) e.mk(hn[i & 1], d.x + 10, d.y - 10, t.x + (i - 2) * 9, alto(t.y - 10 - (i & 1) * 8), i * 40, 280, -18 - i * 2, 4, 0.9, 0, 0, 90);
    e.mk(hab, t.x - 14, t.y + 4, t.x + 12, t.y - 12, 150, 400, 0, 0, 1, 0, 0, 120);
    golpe(e, tipo, t.x, t.y, 200, 3);
  }
};

/** Mancha de cerveza: un chorro ámbar cruza en arco, moja al rival y deja un charco con espuma. */
const mancha: Efecto = (e, tipo, d, a) => {
  const hg = unos('gota', hGota);
  for (const t of a) {
    for (let i = 0; i < 9; i++) e.mk(hg[i & 1], d.x + 8, d.y - 4, t.x, t.y - 6 + (i - 4) * 1.5, i * 16, 150, -26, 0, 1, 0);
    e.mk(memo('mancha-cerveza', hManchaCerveza), t.x, t.y + 4, t.x, t.y + 4, 160, 540, 0, 0, 1, 0, 0, 160);
    e.mk(memo('salpicon', hSalpicon), t.x, t.y + 12, t.x, t.y + 12, 160, 320);
    e.mk(memo('espuma', hEspuma), t.x, t.y - 4, t.x, t.y - 14, 200, 450, 0, 0, 1, 1);
    const he = unos('espumita', hEspumita);
    for (let i = 0; i < 4; i++) e.mk(he[i & 1], t.x + (i - 1.5) * 9, t.y, t.x + (i - 1.5) * 14, t.y - 18 - (i & 1) * 8, 230 + i * 30, 360, 0, 0, 1, 1, 0, 90);
    golpe(e, tipo, t.x, t.y, 160, 0);
  }
};

// ---- Tanda 9 ----------------------------------------------------------------------------------------------------
/** ¡Ay, ay, ay!: un sombrero de charro asoma sobre el cantante, su grito sale en ondas y arcos hacia cada rival, con notas ondulando. */
const ayayay: Efecto = (e, tipo, d, a) => {
  e.mk(memo('sombrero', hSombrero), d.x, alto(d.y - 28), d.x, alto(d.y - 32), 0, 400, 0, 0, 1, 0, 0, 120);
  const hr = memo('anillo-sonido', hAnilloSonido);
  for (let i = 0; i < 3; i++) e.mk(hr, d.x, d.y - 4, d.x, d.y - 4, i * 80, 320);
  const notas = [unos('nota-a', hNotaA), unos('nota-b', hNotaB), unos('nota-c', hNotaC)];
  a.forEach((t, k) => {
    const dir = t.x >= d.x ? 1 : -1;
    const arcos = dir > 0 ? unos('arcos+', hArcosD) : unos('arcos-', hArcosI);
    for (let j = 0; j < 3; j++) e.mk(arcos[j], d.x, d.y - 6, t.x - dir * 14, t.y, 30 + j * 45, 190, 0, 0, 1, 0, 0, 60);
    for (let j = 0; j < 2; j++) e.mk(notas[(j + k) % 3][j & 1], d.x, d.y - 12, t.x + (j - 0.5) * 12, t.y - 6, 40 + j * 70 + k * 15, 300, 0, 9, 1, 0, 0, 90);
    golpe(e, tipo, t.x, t.y, 240, 2);
  });
};

/** Serenata: dos notas vuelan hasta el rival y, a su alrededor, dan vueltas dos corazones y dos notas; al final suben corazoncitos. */
const serenata: Efecto = (e, _tipo, d, a) => {
  const hn = [unos('nota-b', hNotaB), unos('nota-c', hNotaC)];
  const hc = unos('corazon-serenata', hCorazonSerenata);
  const hp = unos('corazoncito', hCorazoncito);
  for (const t of a) {
    for (let j = 0; j < 2; j++) e.mk(hn[j][j], d.x, d.y - 10, t.x + (j - 0.5) * 16, alto(t.y - 20), j * 60, 190, 0, 5, 1, 0, 0, 80);
    const cy = alto(t.y - 4);
    const SEG = 8;
    const paso = 50;
    // Cuatro cosas que giran (corazón, nota, corazón, nota) una vuelta entera, en ocho tramos.
    for (let s = 0; s < 4; s++) {
      const h = s & 1 ? hn[(s >> 1) & 1] : hc;
      for (let g = 0; g < SEG; g++) {
        const a0 = (s * Math.PI) / 2 + (g * 2 * Math.PI) / SEG;
        const a1 = a0 + (2 * Math.PI) / SEG;
        const hoja = s & 1 ? h[(s >> 1) & 1] : h[s >> 1];
        e.mk(hoja, t.x + Math.cos(a0) * 30, alto(cy + Math.sin(a0) * 16), t.x + Math.cos(a1) * 30, alto(cy + Math.sin(a1) * 16), 140 + g * paso, paso, 0, 0, 1, 0, 0, g === SEG - 1 ? 40 : 0);
      }
    }
    for (let i = 0; i < 3; i++) e.mk(hp[0], t.x + (i - 1) * 13, cy + 4, t.x + (i - 1) * 17, alto(t.y - 34 - (i & 1) * 8), 520 + i * 70, 420, 0, 3, 1, 1, 0, 140);
  }
};

/** Salsa picante: un chorro rojo cruza en arco, moja al rival y deja una mancha; brotan tres llamitas y brasas. */
const picante: Efecto = (e, tipo, d, a) => {
  const hg = unos('gota-salsa', hGotaSalsa);
  const hf = memo('fuego-chico', hFuegoChico);
  const hb = memo('brasa', hBrasa);
  for (const t of a) {
    for (let i = 0; i < 10; i++) e.mk(hg[i & 1], d.x + 8, d.y - 4, t.x + (i - 4.5) * 1.2, t.y - 6 + ((i % 3) - 1) * 2, i * 15, 150, -22, 0, 1, 0);
    e.mk(memo('mancha-salsa', hManchaSalsa), t.x, t.y + 4, t.x, t.y + 4, 160, 560, 0, 0, 1, 0, 0, 160);
    e.mk(memo('pum-rojo', hPumRojo), t.x, t.y, t.x, t.y, 160, 200);
    for (let i = 0; i < 3; i++) e.mk(hf, t.x + (i - 1) * 14, t.y + 6, t.x + (i - 1) * 14, t.y - 14 - (i & 1) * 6, 180 + i * 60, 420, 0, 0, 1, 1, 70, 130);
    for (let i = 0; i < 3; i++) e.mk(hb, t.x + entre(-8, 8), t.y, t.x + entre(-22, 22), t.y - entre(20, 32), 220 + i * 40, 280, -8, 0, 1, 1, 0, 90);
    golpe(e, tipo, t.x, t.y, 160, 0);
  }
};

/** Ocho tortas: ocho zarpazos rápidos de tentáculo morado, uno por un lado y otro por el otro, cada uno con su estallido; el último, más fuerte. */
const ochotortas: Efecto = (e, tipo, _d, a) => {
  const sitios: [number, number][] = [[-1, -8], [1, 6], [-1, 3], [1, -10], [-1, 9], [1, 0], [-1, -4], [1, 8]];
  const hd = memo('tentaculo+', hTentaculoD);
  const hi = memo('tentaculo-', hTentaculoI);
  const hp = unos('pum-morado', hPumMorado)[0];
  for (const t of a) {
    sitios.forEach(([dir, dy], k) => {
      const ret = k * 62;
      const x = t.x - dir * 13;
      e.mk(dir > 0 ? hd : hi, x, t.y + dy, x, t.y + dy, ret, 130);
      e.mk(hp, t.x + dir * (k & 1 ? 3 : -3), t.y + dy, t.x + dir * (k & 1 ? 3 : -3), t.y + dy, ret + 60, 120);
    });
    golpe(e, tipo, t.x, t.y, 7 * 62 + 60, 3);
  }
};

/** Chorro de tinta: un chorro negro cruza en arco, salpica al rival y deja una mancha que se extiende y gotea. */
const tinta: Efecto = (e, tipo, d, a) => {
  const hg = unos('gota-tinta', hGotaTinta);
  for (const t of a) {
    for (let i = 0; i < 10; i++) e.mk(hg[i & 1], d.x + 8, d.y - 4, t.x + (i - 4.5) * 1.2, t.y - 6 + ((i % 3) - 1) * 2, i * 14, 140, -20, 0, 1, 0);
    e.mk(memo('mancha-tinta', hManchaTinta), t.x, t.y + 2, t.x, t.y + 2, 150, 700, 0, 0, 1, 0, 0, 200);
    for (let i = 0; i < 4; i++) e.mk(hg[i & 1], t.x, t.y, t.x + (i - 1.5) * 12, t.y - 14 - (i & 1) * 6, 150, 230, -10, 0, 1, 1, 0, 70);
    for (let i = 0; i < 3; i++) e.mk(hg[0], t.x + (i - 1) * 8, t.y + 6, t.x + (i - 1) * 8, t.y + 22, 300 + i * 90, 330, 0, 0, 1, 2, 0, 90);
    golpe(e, tipo, t.x, t.y, 150, 2);
  }
};

/** Morriña: una nube gris con cara triste se para encima del rival y le cae una lluvia fina. */
const morrina: Efecto = (e, _tipo, _d, a) => {
  const hl = unos('lluvia-fina', hLluviaFina);
  for (const t of a) {
    const cy = alto(t.y - 28);
    e.mk(memo('nube-triste', hNubeTriste), t.x - 12, cy, t.x, cy + 2, 0, 1000, 0, 0, 0.3, 1, 0, 200);
    for (let i = 0; i < 20; i++) {
      const x = t.x - 21 + (i % 10) * 5 + (i < 10 ? 0 : 2);
      e.mk(hl[i & 1], x, cy + 12, x - 1, t.y + 18 + (i % 3) * 3, 160 + i * 36, 230, 0, 0, 1, 2, 0, 70);
    }
  }
};

// ---- Tanda 12 ---------------------------------------------------------------------------------------------------
/** Fiesta pagana: de un cohete sale confeti hacia cada rival y estalla en confeti de colores, serpentinas, notas y un destello. */
const fiestapagana: Efecto = (e, tipo, d, a) => {
  const hc = unos('confeti', hConfeti);
  const hs = [memo('serpentina-rosa', hSerpentinaRosa), memo('serpentina-cian', hSerpentinaCian)];
  const notas = [unos('nota-a', hNotaA), unos('nota-b', hNotaB), unos('nota-c', hNotaC)];
  const hp = memo('pum', hPum);
  a.forEach((t, k) => {
    for (let i = 0; i < 3; i++) e.mk(hc[(i + k) % 6], d.x + 8, d.y - 6, t.x + (i - 1) * 6, t.y - 8, i * 25, 150, -14, 0, 1, 0, 0, 0);
    e.mk(hp, t.x, t.y - 4, t.x, t.y - 4, 150, 220);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * 6.283 + az() * 0.6;
      const r = entre(16, 32);
      e.mk(hc[(i + k * 2) % 6], t.x, t.y - 6, t.x + Math.cos(ang) * r, t.y - 6 + Math.sin(ang) * r * 0.8, 150 + i * 8, 430, 14, 0, 1, 1, 0, 120);
    }
    for (let i = 0; i < 2; i++) e.mk(hs[i], t.x + (i ? 4 : -4), t.y - 8, t.x + (i ? 30 : -30), alto(t.y - 26 - i * 6), 160 + i * 20, 420, -8, 0, 1, 1, 70, 130);
    for (let j = 0; j < 2; j++) e.mk(notas[(j + k) % 3][j & 1], t.x + (j - 0.5) * 10, t.y - 8, t.x + (j - 0.5) * 22, alto(t.y - 36), 220 + j * 80, 380, 0, -5, 1, 1, 0, 110);
    golpe(e, tipo, t.x, t.y, 220, 2);
  });
};

/** ¡Todos dentro!: la cortinilla roja del fotomatón cae sobre cada rival y se sacude; líneas que convergen y estrellas de golpe. */
const todosdentro: Efecto = (e, tipo, _d, a) => {
  const cort = memo('cortinilla', hCortinilla);
  const [lh, ld1, ld2] = unos('lineas-presion', hLineasPresion);
  const he = memo('destello-amarillo', hDestelloAmarillo);
  for (const t of a) {
    const cy = t.y + 2;
    e.mk(cort, t.x, alto(cy - 70), t.x, cy, 20, 150, 0, 0, 1, 2);
    e.mk(cort, t.x, cy, t.x, cy, 170, 300, 0, -3, 1, 0, 0, 90);
    e.mk(lh, t.x - 44, t.y - 2, t.x - 18, t.y - 2, 120, 150, 0, 0, 1, 2, 0, 60);
    e.mk(lh, t.x + 44, t.y - 2, t.x + 18, t.y - 2, 120, 150, 0, 0, 1, 2, 0, 60);
    e.mk(ld1, t.x - 36, t.y - 30, t.x - 14, t.y - 12, 130, 140, 0, 0, 1, 2, 0, 60);
    e.mk(ld2, t.x + 36, t.y - 30, t.x + 14, t.y - 12, 130, 140, 0, 0, 1, 2, 0, 60);
    e.mk(ld2, t.x - 36, t.y + 30, t.x - 14, t.y + 12, 130, 140, 0, 0, 1, 2, 0, 60);
    e.mk(ld1, t.x + 36, t.y + 30, t.x + 14, t.y + 12, 130, 140, 0, 0, 1, 2, 0, 60);
    for (let i = 0; i < 3; i++) e.mk(he, t.x + (i - 1) * 15, t.y + (i === 1 ? -22 : -4), t.x + (i - 1) * 15, t.y + (i === 1 ? -22 : -4), 260 + i * 35, 230, 0, 0, 1, 0, 0, 70);
    golpe(e, tipo, t.x, t.y, 175, 2);
  }
};

/** Flash: una chispa de cámara en el atacante y un fogonazo blanco-azulado sobre el rival, con cruz de rayos, aspas y manchas de deslumbramiento. */
const flash: Efecto = (e, tipo, d, a) => {
  const hcl = memo('clic', hClic);
  const disco4 = memo('fogonazo-foto', hFogonazoFoto);
  const cruz = memo('cruz-flash', hCruzFlash);
  const aspas = memo('aspas-flash', hAspasFlash);
  const man = memo('destello-violeta', () => hDestello('#7a3ac0', '#c8a0ff', [2, 3, 2]));
  e.mk(hcl, d.x + 8, d.y - 6, d.x + 8, d.y - 6, 0, 120);
  for (const t of a) {
    e.mk(disco4, t.x, t.y - 4, t.x, t.y - 4, 90, 240);
    e.mk(cruz, t.x, t.y - 4, t.x, t.y - 4, 90, 260);
    e.mk(aspas, t.x, t.y - 4, t.x, t.y - 4, 105, 240);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * 6.283 + 0.78;
      e.mk(hcl, t.x, t.y - 4, t.x + Math.cos(ang) * 30, t.y - 4 + Math.sin(ang) * 26, 120, 260, 0, 0, 1, 1, 0, 80);
    }
    for (let i = 0; i < 3; i++) e.mk(man, t.x + entre(-18, 18), t.y + entre(-22, 10), t.x + entre(-18, 18), t.y + entre(-22, 10), 270 + i * 30, 300, 0, 0, 1, 0, 0, 100);
    golpe(e, tipo, t.x, t.y, 100, 2);
  }
};

/** Nubarrón: una nube gris blandita cruza tapando el solcito de cada rival, con su sombra, ráfagas de viento y gotas finas. */
const nubarron: Efecto = (e, tipo, _d, a) => {
  const hl = unos('lluvia-fina', hLluviaFina);
  const rr = memo('racha+', hRachaD);
  for (const t of a) {
    const cy = alto(t.y - 32);
    e.mk(memo('solcito', hSolcito), t.x + 16, cy - 4, t.x + 16, cy - 4, 0, 900, 0, 0, 1, 0, 0, 150);
    e.mk(rr, t.x - 54, t.y - 14, t.x + 54, t.y - 14, 30, 360, 0, 0, 1, 1, 0, 100);
    e.mk(rr, t.x - 54, t.y + 8, t.x + 54, t.y + 8, 110, 360, 0, 0, 1, 1, 0, 100);
    e.mk(memo('sombra-nube', hSombraNube), t.x - 50, t.y + 18, t.x + 28, t.y + 18, 0, 850, 0, 0, 1, 1, 0, 160);
    e.mk(memo('nubarron', hNubarron), t.x - 50, cy, t.x + 28, cy, 0, 850, 0, 0, 1, 1, 0, 160);
    for (let i = 0; i < 8; i++) {
      const x = t.x - 14 + i * 5;
      e.mk(hl[i & 1], x, cy + 12, x - 2, t.y + 14, 380 + i * 45, 230, 0, 0, 1, 2, 0, 60);
    }
    golpe(e, tipo, t.x, t.y, 260, 2);
  }
};

/** Está carísimo: llueven billetes y monedas sobre el rival y le cae encima una etiqueta de precio enorme que lo hunde. */
const carisimo: Efecto = (e, tipo, _d, a) => {
  const hb = memo('billete', hBillete);
  const hm = memo('moneda', hMoneda);
  for (const t of a) {
    for (let i = 0; i < 5; i++) {
      const x = t.x + (i - 2) * 10 + entre(-3, 3);
      e.mk(hb, x, alto(t.y - 62 - (i & 1) * 10), x + (i & 1 ? 4 : -4), t.y + (i % 3) * 4 - 4, i * 30, 260, 0, i & 1 ? -4 : 4, 1, 2, 80, 70);
    }
    for (let i = 0; i < 4; i++) {
      const x = t.x + (i - 1.5) * 11;
      e.mk(hm, x, alto(t.y - 56), x, t.y + 2 + (i & 1) * 6, 60 + i * 35, 240, 0, 0, 1, 2, 60, 70);
    }
    const ty = alto(t.y - 12);
    e.mk(memo('etiqueta', hEtiqueta), t.x, alto(t.y - 76), t.x, ty, 140, 150, 0, 0, 1, 2);
    e.mk(memo('etiqueta', hEtiqueta), t.x, ty, t.x, ty, 290, 380, 0, 5, 1, 0, 0, 100);
    e.mk(memo('pum', hPum), t.x, t.y - 6, t.x, t.y - 6, 290, 220);
    golpe(e, tipo, t.x, t.y, 290, 3);
  }
};

/** Calada: una brasa naranja viaja en arco dejando una voluta de humo gris y, al llegar, sopla una nube de humo con chispas y brasas. */
const calada: Efecto = (e, tipo, d, a) => {
  const hv = unos('voluta', hVoluta);
  const hh = memo('humo', hHumo);
  const hch = memo('chispa', hChispa);
  const hbr = memo('brasa', hBrasa);
  for (const t of a) {
    const VUELO = 190;
    e.mk(memo('brasa-grande', hBrasaGrande), d.x + 8, d.y - 6, t.x - 10, t.y - 6, 0, VUELO, -14, 0, 1, 0, 60, 0);
    for (let i = 0; i < 5; i++) {
      const u = (i + 1) / 6;
      const x = hasta(d.x + 8, t.x - 10, u);
      const y = hasta(d.y - 6, t.y - 6, u) - 14 * 4 * u * (1 - u);
      e.mk(hv[Math.min(3, i)], x, y, x - 2, y - 8, u * VUELO, 360, 0, 0, 1, 1, 0, 110);
    }
    const dir = t.x >= d.x ? 1 : -1;
    for (let i = 0; i < 3; i++) e.mk(hh, t.x + (i - 1) * 12, t.y - 2, t.x + (i - 1) * 12 + dir * 10, t.y - 14 - (i & 1) * 6, VUELO + i * 25, 440, 0, 0, 1, 1, 0, 110);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * 6.283 + az();
      e.mk(hch, t.x, t.y - 4, t.x + Math.cos(ang) * 24, t.y - 4 + Math.sin(ang) * 20, VUELO + 10, 320, -8, 0, 1, 1, 70, 90);
    }
    for (let i = 0; i < 2; i++) e.mk(hbr, t.x + entre(-6, 6), t.y, t.x + entre(-20, 20), t.y - entre(18, 30), VUELO + 40 + i * 30, 300, -8, 0, 1, 1, 0, 90);
    golpe(e, tipo, t.x, t.y, VUELO, 2);
  }
};

/** Dar vueltas: un remolino de aire con luces de feria (amarillas y rojas) gira alrededor del rival, que se marea con estrellitas en órbita. */
const vueltas: Efecto = (e, tipo, _d, a) => {
  const luz = [memo('luz-amarilla', hLuzAmarilla), memo('luz-roja', hLuzRoja)];
  const est = memo('estrellita-mareo', hEstrellitaMareo);
  for (const t of a) {
    e.mk(memo('remolino-g', hRemolinoG), t.x, t.y + 10, t.x, t.y + 6, 0, 800, 0, 0, 1, 0, 70, 160);
    e.mk(memo('remolino-p', hRemolinoP), t.x, alto(t.y - 24), t.x, alto(t.y - 28), 60, 740, 0, 0, 1, 0, 70, 160);
    const SEG = 8;
    const cy = t.y - 4;
    for (let s = 0; s < 4; s++) {
      for (let g = 0; g < SEG; g++) {
        const a0 = (s * Math.PI) / 2 + (g * 2 * Math.PI) / SEG;
        const a1 = a0 + (2 * Math.PI) / SEG;
        e.mk(luz[s & 1], t.x + Math.cos(a0) * 27, alto(cy + Math.sin(a0) * 13), t.x + Math.cos(a1) * 27, alto(cy + Math.sin(a1) * 13), 40 + g * 55, 55, 0, 0, 1, 0, 0, g === SEG - 1 ? 25 : 0);
      }
    }
    const hy = alto(t.y - 30);
    for (let s = 0; s < 2; s++) {
      for (let g = 0; g < SEG; g++) {
        const a0 = s * Math.PI + (g * 2 * Math.PI) / SEG;
        const a1 = a0 + (2 * Math.PI) / SEG;
        e.mk(est, t.x + Math.cos(a0) * 15, alto(hy + Math.sin(a0) * 5), t.x + Math.cos(a1) * 15, alto(hy + Math.sin(a1) * 5), 220 + g * 60, 60, 0, 0, 1, 0, 0, g === SEG - 1 ? 30 : 0);
      }
    }
    golpe(e, tipo, t.x, t.y, 200, 2);
  }
};

// ---- Capítulo 2: los cuatro movimientos del Ultimosaurio ---------------------------------------------------------------
const MAT_CERV2: Mat = { ol: '#3a1a04', base: '#e8901a', luz: '#ffc84a', som: '#a24e0c' };
const MAT_ESPUMA2: Mat = { ol: '#7c68e6', base: '#f2ecff', luz: '#ffffff', som: '#cbbfe0' };
const MAT_CHAPA: Mat = { ol: '#2a3040', base: '#9aa6b8', luz: '#e6ecf5', som: '#6a7488' };

/** Una jarra de cerveza (cuerpo ámbar, espuma, asa y un brillo de cristal): cuatro giros de 90° para que dé vueltas al volar. */
function dibujoJarra(): HTMLCanvasElement {
  const c = lienzo(18, 19);
  const x = ctxDe(c);
  const asa = sombrear(8, 10, (i, j) => disco(3.2, 4.6, 3.6)(i, j) && !disco(3.2, 4.6, 1.5)(i, j) && i >= 2, MAT_CHAPA);
  x.drawImage(asa, 11, 6);
  x.drawImage(sombrear(12, 13, (i, j) => i >= 0 && i < 12 && j >= 0 && j < 13 && !(j >= 11 && (i < 1 || i > 10)), MAT_CERV2), 0, 5);
  x.drawImage(sombrear(14, 8, union(disco(3, 4.4, 3.2), disco(7, 3.4, 3.7), disco(10.6, 4.4, 2.9), (i, j) => j >= 3 && j <= 6 && i >= 2 && i <= 11), MAT_ESPUMA2), -1, 0);
  pix(x, '#fff0a0', 2, 9, 1, 6);
  pix(x, '#fff0a0', 4, 13, 1, 1);
  pix(x, '#ffffff', 8, 11, 1, 1);
  return c;
}
function hJarraGira(): Hoja {
  return girar(dibujoJarra());
}
/** La jarra grande de LA ÚLTIMA ronda (dos veces el tamaño). */
function hJarraGrande(): Hoja {
  return [amp(dibujoJarra())];
}
/** Gotas de cerveza (ámbar) y de espuma (blancas), de dos tamaños cada una. */
function hGotasCerveza(): Hoja {
  return [
    sombrear(5, 5, disco(2, 2, 1.8), MAT_CERV2),
    sombrear(7, 7, disco(3, 3, 2.9), MAT_CERV2),
    sombrear(5, 5, disco(2, 2, 1.8), MAT_ESPUMA2),
    sombrear(7, 7, disco(3, 3, 2.9), MAT_ESPUMA2),
  ];
}
/** El chapoteo de espuma al romperse la jarra: una estrella de espuma que se abre y un anillo de gotas. */
function hChapoteo(): Hoja {
  return [astro(6, '#a24e0c', '#ffc84a', '#fff0a0'), astro(10, '#7c68e6', '#f2ecff', '#ffffff'), astro(8, '#7c68e6', '#cbbfe0', '#f2ecff')];
}
function hChapoteoGrande(): Hoja {
  return [astro(9, '#a24e0c', '#ffc84a', '#fff0a0'), astro(15, '#7c68e6', '#f2ecff', '#ffffff'), astro(13, '#7c68e6', '#cbbfe0', '#f2ecff')];
}

/** La persiana metálica (58 × 38): lamas grises con su brillo y su sombra, listón de abajo con el tirador amarillo y las guías a los lados. */
function hPersiana(): Hoja {
  const W = 58;
  const H = 38;
  const c = lienzo(W, H);
  const x = ctxDe(c);
  for (let j = 0; j < H - 5; j++) {
    const fila = j % 5;
    const col = fila === 0 ? '#e6ecf5' : fila === 1 ? '#b8c2d2' : fila === 2 ? '#9aa6b8' : fila === 3 ? '#6a7488' : '#3a4258';
    pix(x, col, 2, j, W - 4, 1);
    // Los agujeritos de ventilación.
    if (fila === 2) for (let i = 6; i < W - 6; i += 6) pix(x, '#3a4258', i, j, 3, 1);
  }
  // Listón de abajo con su tirador.
  pix(x, '#2a3040', 0, H - 6, W, 6);
  pix(x, '#6a7488', 1, H - 5, W - 2, 4);
  pix(x, '#9aa6b8', 1, H - 5, W - 2, 1);
  pix(x, '#2a3040', 24, H - 5, 10, 3);
  pix(x, AMARILLO, 25, H - 4, 8, 1);
  // Guías a los lados.
  pix(x, '#2a3040', 0, 0, 2, H - 5);
  pix(x, '#2a3040', W - 2, 0, 2, H - 5);
  pix(x, '#6a7488', 1, 0, 1, H - 6);
  return [c];
}

/** Un despertador (22 × 25): campanas amarillas, esfera blanca con las manecillas en las seis y patas; dos fotogramas con las campanas a cada lado. */
function hDespertador(): Hoja {
  const hoja: Hoja = [];
  for (const f of [0, 1]) {
    const c = lienzo(22, 25);
    const x = ctxDe(c);
    const campana = sombrear(8, 7, disco(3.6, 4.6, 3.6), { ol: '#8a5a10', base: AMARILLO, luz: '#fff0a0', som: AMARILLO_OSC });
    x.drawImage(campana, 1 + f, 0 + (f ? 1 : 0));
    x.drawImage(campana, 13 - f, 0 + (f ? 0 : 1));
    pix(x, '#4a1010', 10, 2, 2, 5);
    x.drawImage(
      sombrear(22, 21, union(disco(11, 11, 9.4), (i, j) => j >= 17 && j <= 20 && ((i >= 4 && i <= 7) || (i >= 14 && i <= 17))), { ol: '#4a1010', base: ROJO, luz: '#ff7a5c', som: ROJO_OSC }),
      0,
      4,
    );
    rellenarDisco(x, '#fff8e0', 11, 15, 6.4);
    // Marcas de las horas, manecillas (las seis y cinco, un lunes) y el centro.
    for (const [i, j] of [[11, 10], [11, 20], [6, 15], [16, 15]] as [number, number][]) pix(x, TINTA, i, j, 1, 1);
    linea(x, TINTA, 11, 15, 11, 19, 1);
    linea(x, TINTA, 11, 15, 8, 13, 1);
    pix(x, ROJO, 11, 15, 1, 1);
    pix(x, '#ffffff', 8, 11, 2, 1);
    hoja.push(c);
  }
  return hoja;
}
/** Las ondas de un timbrazo (dos arcos): de lado a lado, `dir` = -1 mira a la izquierda. */
function hOndasTimbre(): Hoja {
  const a = filas(['..x.', '.x..', 'x...', 'x...', 'x...', '.x..', '..x.'], { x: '#fff0a0' });
  const b = filas(['...x', '..x.', '.x..', '.x..', '.x..', '..x.', '...x'], { x: '#fff0a0' });
  return [amp(a), amp(b)];
}
function hNubeLunes(): Hoja {
  return [sombrear(40, 18, union(disco(9, 11, 6), disco(17, 8, 7.5), disco(26, 8, 7.5), disco(33, 11, 6), (i, j) => j >= 10 && j <= 15 && i >= 9 && i <= 33), { ol: '#2a3040', base: '#6a7488', luz: '#9aa6b8', som: '#46506a' })];
}
/** Gotas finas de lluvia gris del lunes. */
function hLloviznaLunes(): Hoja {
  return [filas(['t', 't', 'T'], { t: '#9aa6b8', T: '#e6ecf5' })];
}

/** La penúltima: una jarra llena sale volando dando vueltas, deja un rastro de gotas y, al llegar, se rompe en un chapoteo de espuma. */
const penultima: Efecto = (e, tipo, d, a) => {
  const jarra = memo('jarra-gira', hJarraGira);
  const gotas = unos('gotas-cerveza', hGotasCerveza);
  const chap = memo('chapoteo', hChapoteo);
  for (const t of a) {
    const VUELO = 240;
    e.mk(jarra, d.x + 6, d.y - 6, t.x, t.y - 4, 0, VUELO, -22, 0, 1, 0, 55);
    for (let i = 0; i < 4; i++) {
      const u = (i + 1) / 5;
      const x = hasta(d.x + 6, t.x, u);
      const y = hasta(d.y - 6, t.y - 4, u) - 22 * 4 * u * (1 - u);
      e.mk(gotas[i & 1 ? 2 : 0], x, y, x + entre(-4, 4), y + 12, u * VUELO, 260, 0, 0, 1, 2, 0, 90);
    }
    e.mk(chap, t.x, t.y - 4, t.x, t.y - 4, VUELO, 260);
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * 6.283 + az() * 0.5;
      const r = entre(14, 28);
      e.mk(gotas[i % 4], t.x, t.y - 4, t.x + Math.cos(ang) * r, t.y - 4 + Math.sin(ang) * r * 0.8 + 6, VUELO + 10, 320, -10, 0, 1, 1, 0, 100);
    }
    golpe(e, tipo, t.x, t.y, VUELO, 1);
  }
};

/** Cierre de persiana: una persiana metálica cae de golpe sobre cada rival, rebota, lanza chispas de golpe seco y se queda un momento echada. */
const persiana: Efecto = (e, tipo, _d, a) => {
  const pers = memo('persiana', hPersiana);
  const des = memo('destello-chapa', () => hDestello('#6a7488', '#e6ecf5', [3, 5, 3]));
  const polvo = unos('polvo-persiana', hHumo);
  for (const t of a) {
    const cy = t.y - 2;
    e.mk(pers, t.x, alto(cy - 78), t.x, cy, 0, 210, 0, 0, 1, 2);
    e.mk(pers, t.x, cy, t.x, cy - 4, 210, 90, 0, 0, 1, 1);
    e.mk(pers, t.x, cy - 4, t.x, cy, 300, 80, 0, 0, 1, 2);
    e.mk(pers, t.x, cy, t.x, cy, 380, 360, 0, 0, 1, 0, 0, 110);
    for (const dx of [-26, 26]) e.mk(des, t.x + dx, cy + 14, t.x + dx, cy + 14, 205, 200);
    for (const dx of [-1, 1]) e.mk(polvo[0], t.x + dx * 24, cy + 16, t.x + dx * 40, cy + 8, 215, 330, 0, 0, 1, 1, 0, 110);
    golpe(e, tipo, t.x, t.y, 215, 2);
  }
};

/** Lunes por la mañana: un despertador suena encima del rival (vibra, con ondas a los lados) y un nubarrón gris le empieza a lloviznar. */
const lunes: Efecto = (e, tipo, _d, a) => {
  const desp = memo('despertador', hDespertador);
  const ondas = unos('ondas-timbre', hOndasTimbre);
  const nube = memo('nube-lunes', hNubeLunes);
  const lluvia = memo('llovizna-lunes', hLloviznaLunes);
  const bri = memoT('brillo', tipo, hBrillo);
  for (const t of a) {
    const cy = alto(t.y - 34);
    e.mk(desp, t.x, cy - 14, t.x, cy, 0, 140, 0, 0, 1, 1);
    e.mk(desp, t.x, cy, t.x, cy, 140, 560, 0, -3, 1, 0, 70, 120);
    for (const [dx, k] of [[-19, 0], [19, 1]] as [number, number][]) {
      e.mk(ondas[k], t.x + dx, cy, t.x + dx + (k ? 5 : -5), cy, 160, 520, 0, 0, 1, 0, 90, 120);
      e.mk(ondas[k], t.x + dx * 1.35, cy - 2, t.x + dx * 1.35 + (k ? 5 : -5), cy - 2, 260, 420, 0, 0, 1, 0, 90, 120);
    }
    e.mk(nube, t.x - 30, cy - 4, t.x, cy + 10, 200, 380, 0, 0, 1, 1);
    e.mk(nube, t.x, cy + 10, t.x, cy + 10, 580, 320, 0, 0, 1, 0, 0, 100);
    for (let i = 0; i < 6; i++) {
      const x = t.x - 12 + i * 5;
      e.mk(lluvia, x, cy + 20, x, t.y + 12, 340 + i * 45, 180, 0, 0, 1, 2, 0, 50);
    }
    for (let i = 0; i < 3; i++) e.mk(bri, t.x + (i - 1) * 14, t.y + entre(-6, 6), t.x + (i - 1) * 14, t.y - entre(10, 18), 330 + i * 50, 320, 0, 0, 1, 1);
  }
};

/** ¡La última ronda!: cuatro jarras vuelan seguidas hacia el rival y, tras ellas, cae del cielo una jarra enorme que revienta en una explosión de espuma. */
const ultimaronda: Efecto = (e, tipo, d, a) => {
  const jarra = memo('jarra-gira', hJarraGira);
  const grande = memo('jarra-grande', hJarraGrande);
  const gotas = unos('gotas-cerveza', hGotasCerveza);
  const chap = memo('chapoteo', hChapoteo);
  const chapG = memo('chapoteo-grande', hChapoteoGrande);
  for (const t of a) {
    for (let i = 0; i < 4; i++) {
      const ret = i * 60;
      const tx = t.x + (i - 1.5) * 9;
      e.mk(jarra, d.x + 6, d.y - 6, tx, t.y - 6 + (i & 1) * 6, ret, 170, -18 - i * 3, 0, 1, 0, 50);
      e.mk(chap, tx, t.y - 6 + (i & 1) * 6, tx, t.y - 6 + (i & 1) * 6, ret + 168, 170);
    }
    const CAE = 250;
    const cy = alto(t.y - 6);
    e.mk(grande, t.x, alto(cy - 96), t.x, cy, CAE, 170, 0, 0, 1, 2);
    const IMP = CAE + 170;
    e.mk(chapG, t.x, cy, t.x, cy, IMP, 280);
    e.mk(memo('pum', hPum), t.x, cy - 4, t.x, cy - 4, IMP, 240);
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * 6.283 + az() * 0.4;
      const r = entre(24, 44);
      e.mk(gotas[(i & 1) + (i % 3 === 0 ? 2 : 0)], t.x, cy, t.x + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.75 + 8, IMP + 10, 380, -16, 0, 1, 1, 0, 120);
    }
    golpe(e, tipo, t.x, t.y, IMP, 4);
  }
};

/** La jarra de CAZAR (capítulo 2, `VistaCombate.jarra`), al doble de tamaño: de pie y en sus cuatro giros de 90°. La pantalla de combate las dibuja. */
export const jarraDePie = (): HTMLCanvasElement => memo('jarra-grande', hJarraGrande)[0];
export const jarraGiros = (): HTMLCanvasElement[] => memo('jarra-gira-grande', () => girar(amp(dibujoJarra())));

/** La jarra se cierra con el userito dentro: un estallido de brillos dorados y blancos a su alrededor. */
const jarraCerrada: Efecto = (e, _tipo, _d, a) => {
  const oro = memo('destello-oro-jarra', () => hDestello('#a24e0c', '#ffd84a', [3, 6, 5, 2]));
  const blanco = memo('destello-blanco-jarra', () => hDestello('#7c68e6', '#f2ecff', [2, 4, 3]));
  for (const t of a) {
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * 6.283;
      e.mk(i & 1 ? blanco : oro, t.x, t.y, t.x + Math.cos(ang) * 30, t.y + Math.sin(ang) * 26, i * 18, 420, -6, 0, 1, 1, 70, 90);
    }
    e.mk(oro, t.x, t.y - 4, t.x, t.y - 4, 0, 260);
    e.mk(blanco, t.x, t.y - 4, t.x, t.y - 4, 120, 260);
  }
};

/** La jarra se abre y el userito se escapa: chapoteo de espuma, gotas y un fogonazo. */
const jarraAbierta: Efecto = (e, tipo, _d, a) => {
  const chapG = memo('chapoteo-grande', hChapoteoGrande);
  const gotas = unos('gotas-cerveza', hGotasCerveza);
  for (const t of a) {
    e.mk(chapG, t.x, t.y, t.x, t.y, 0, 280);
    e.mk(memo('pum', hPum), t.x, t.y - 4, t.x, t.y - 4, 0, 240);
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * 6.283 + az() * 0.4;
      const r = entre(22, 40);
      e.mk(gotas[(i & 1) + (i % 3 === 0 ? 2 : 0)], t.x, t.y, t.x + Math.cos(ang) * r, t.y + Math.sin(ang) * r * 0.75 + 8, 10, 360, -14, 0, 1, 1, 0, 110);
    }
    golpe(e, tipo, t.x, t.y, 0, 2);
  }
};

/** Efectos de los movimientos sobre rivales (y «todos»). */
const FX: Record<string, Efecto> = {
  lluvia, almendrazo, traca, fogonazo, petardazo, chispazo, cierzo, chupitazo, garrafon, cancion, esporas, temblor, bocinazo,
  chapa, planeo, pringue, cara_de_pena, vacile, venganza, adoquin, barrigazo, ronda, unamas, zasca, coz, raices,
  setas, burbujeo, pesao, tubo, goudamadre, tendedero, remate,
  maletazo, embarque, monologo, carambola, crujiente, cortepapel, pasodoble, mancha,
  ayayay, serenata, picante, ochotortas, tinta, morrina,
  fiestapagana, todosdentro, flash, nubarron, carisimo, calada, vueltas,
  penultima, persiana, lunes, ultimaronda,
  // No son movimientos: la jarra de CAZAR (`VistaCombate.jarra`).
  _jarra_cerrada: jarraCerrada,
  _jarra_abierta: jarraAbierta,
};

/** Efectos de los movimientos sobre uno mismo (objetivo «yo»: `lanzar` los llama sin objetivos). */
const FX_YO: Record<string, Efecto> = { siesta, esconderse, rebozado, caparazon, compas, pantalones, cinturones, improvisa, ficha, limon, papiroflexia };

/** Los movimientos con diseño propio (para la vista previa). */
export const MOVS_CON_EFECTO: readonly string[] = [...Object.keys(FX), ...Object.keys(FX_YO)];

/** Ms desde que sale el efecto hasta que «llega» al objetivo (cuando la pantalla de combate hace empezar el golpe y la barra). */
const LLEGA: Record<string, number> = {
  lluvia: 250,
  almendrazo: 250,
  traca: 150,
  fogonazo: 240,
  petardazo: 260,
  chispazo: 100,
  cierzo: 150,
  chupitazo: 280,
  garrafon: 320,
  cancion: 340,
  esporas: 260,
  temblor: 80,
  bocinazo: 200,
  chapa: 235,
  planeo: 295,
  pringue: 230,
  cara_de_pena: 230,
  vacile: 235,
  venganza: 340,
  adoquin: 330,
  barrigazo: 230,
  ronda: 290,
  unamas: 300,
  zasca: 80,
  coz: 125,
  raices: 200,
  setas: 250,
  burbujeo: 260,
  pesao: 330,
  tubo: 290,
  goudamadre: 255,
  tendedero: 215,
  remate: 210,
  maletazo: 190,
  embarque: 130,
  monologo: 245,
  carambola: 190,
  crujiente: 60,
  cortepapel: 80,
  pasodoble: 200,
  mancha: 160,
  ayayay: 240,
  serenata: 190,
  picante: 165,
  ochotortas: 70,
  tinta: 150,
  morrina: 330,
  fiestapagana: 220,
  todosdentro: 175,
  flash: 100,
  nubarron: 260,
  carisimo: 290,
  calada: 190,
  vueltas: 200,
  penultima: 240,
  persiana: 215,
  lunes: 330,
  ultimaronda: 420,
};

/** Lo mismo para los movimientos sobre uno mismo (cuándo se nota el efecto: el texto de lo que sube o baja viene detrás). */
const LLEGA_YO: Record<string, number> = { siesta: 200, esconderse: 140, rebozado: 240, caparazon: 280, compas: 260, pantalones: 250, cinturones: 205, improvisa: 300, ficha: 260, limon: 260, papiroflexia: 200 };

/** Cuándo llega el efecto de `mov` a su objetivo (ms desde `lanzar`); `conObjetivos` false: movimiento sobre uno mismo. */
export function llegadaFx(mov: string, conObjetivos: boolean): number {
  if (!conObjetivos) return LLEGA_YO[mov] ?? 150;
  return LLEGA[mov] ?? 130;
}

/**
 * Las tareas que hornean los sprites de todos los efectos, una por una (un movimiento o un tipo cada vez), para repartirlas
 * en ratos libres (`pantallas/precalentar.ts`): los lienzos son pequeños, pero juntos no caben en un solo fotograma.
 */
export function tareasPrecalentarEfectos(): (() => void)[] {
  const e = new EfectosMov();
  const d: PuntoFx = { x: 100, y: 100 };
  const a: PuntoFx[] = [
    { x: 0, y: 40 },
    { x: 200, y: 100 },
    { x: 200, y: 160 },
  ];
  const tareas: (() => void)[] = [];
  for (const m of Object.keys(FX)) {
    tareas.push(() => {
      e.lanzar(m, 'mindundi', d, a);
      e.limpiar();
    });
  }
  // Las estrellas del Remate por bulerías (seis tamaños) se hornean con el golpe más flojo y el más fuerte.
  for (const fuerza of [0, 1]) {
    tareas.push(() => {
      e.lanzar('remate', 'juerga', d, a, fuerza);
      e.limpiar();
    });
  }
  for (const m of Object.keys(FX_YO)) {
    tareas.push(() => {
      e.lanzar(m, 'mindundi', d, []);
      e.limpiar();
    });
  }
  for (const t of Object.keys(COLOR_TIPO) as Tipo[]) {
    tareas.push(() => {
      e.lanzar('zasca', t, d, a);
      e.lanzar('_', t, d, []);
      e.limpiar();
    });
  }
  return tareas;
}

/**
 * Las tareas que hornean los efectos de ESTOS movimientos con su propio tipo (el del movimiento, que es el que usa `lanzar` en el combate):
 * una tarea por movimiento. El combate las usa al empezar (`calentar`) en vez de las de todo el juego: solo hornea lo que van a usar los
 * doce useritos y con el tipo exacto, así que el arranque en frío cuesta la mitad y el primer golpe no hornea nada.
 */
export function tareasEfectosDe(movs: Iterable<string>): (() => void)[] {
  const e = new EfectosMov();
  const d: PuntoFx = { x: 100, y: 100 };
  const a: PuntoFx[] = [
    { x: 0, y: 40 },
    { x: 200, y: 100 },
    { x: 200, y: 160 },
  ];
  const tareas: (() => void)[] = [];
  for (const m of new Set(movs)) {
    const tipo = MOVS[m]?.tipo;
    if (!tipo) continue;
    // Los de uno mismo se lanzan sin objetivos (otro dibujo); el Remate por bulerías, con el golpe más flojo y el más fuerte.
    const objetivos = FX_YO[m] ? [] : a;
    for (const fuerza of m === 'remate' ? [0, 1] : [0.5]) {
      tareas.push(() => {
        e.lanzar(m, tipo, d, objetivos, fuerza);
        e.limpiar();
      });
    }
  }
  return tareas;
}

/** Hornea ya todos los sprites (por ejemplo, durante una pantalla de carga) para que el primer golpe no tenga que hacerlo. */
export function precalentarEfectos(): void {
  for (const f of tareasPrecalentarEfectos()) f();
}
