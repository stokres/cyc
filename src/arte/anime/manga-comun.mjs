// Piezas del manga a color del capítulo 2 (el estilo C de Jesús, ampliado a los cinco personajes y pasado a color
// con la paleta del juego: docs/ESTILO.md y las paletas `C` de src/arte/personajes). Solo devuelve cadenas SVG; se
// hornea UNA vez a bitmap y nunca por fotograma.
//
// Reglas del estilo: color plano con sombreado de anime (cel shading: base, sombra y luz), línea en un marrón muy
// oscuro (nunca negro puro), marfil en lugar de blanco puro, nada de negro en grandes superficies, y tramas solo como un
// brillo muy suave dentro del color. Las líneas de concentración, los bordes y las onomatopeyas usan colores del bar
// (ámbar, ladrillo, azul noche) y el dorado de los botones.
import { smooth, ellipse, poly, line, f, rng, P, S, G, estrella, gota } from './comun.mjs';

export { smooth, ellipse, poly, line, f, rng, P, S, G, estrella, gota };

// ------------------------------------------------------------------ paleta
/** La línea de dibujo: un marrón ciruela muy oscuro (el «tono oscuro de su propio color» de ESTILO.md, P2). */
export const T = '#2b1c20';
/** El «blanco» del dibujo: marfil cálido (dientes, ojos, brillos). Nunca #fff. */
export const MARFIL = '#f7efdc';
/** El dorado de los botones y los filetes del cuadro de diálogo (--gold de ui.css). */
export const ORO = '#dbb46c';
export const ORO_OSC = '#a8761c';
/** Azul noche de la interfaz (--ink de ui.css): el fondo entre viñetas. */
export const NOCHE = '#0b1124';
export const LADRILLO = '#c8433a';
export const AMBAR = '#ffb45a';

/** Mezcla dos colores #rrggbb (t = 0: a; t = 1: b). */
export function mezcla(a, b, t = 0.5) {
  const n = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, bl] = n(a).map((v, i) => Math.round(v + (n(b)[i] - v) * t));
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Color con transparencia: `#rrggbb` → `rgba(...)`. */
export function alfa(h, a) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
}

// ------------------------------------------------------------------ brillo suave (lo que antes eran las tramas)
/**
 * Una trama de puntos muy suave, de un solo color y con poca opacidad, solo como brillo dentro de un color (nunca
 * como contraste). El paso es de `paso` píxeles de pantalla sea cual sea la escala `k` del dibujo.
 */
export function trama(c, k, color, a = 0.14, paso = 5.5, ang = 45) {
  const memo = (c.__tramas ??= new Map());
  const esc = paso / k;
  const clave = [color, a, f(esc), ang].join('|');
  if (memo.has(clave)) return memo.get(clave);
  const id = c.id('tp');
  const r = esc * 0.28;
  c.def(`<pattern id="${id}" width="${f(esc)}" height="${f(esc)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${ang})"><circle cx="${f(esc / 2)}" cy="${f(esc / 2)}" r="${f(r)}" fill="${color}" fill-opacity="${a}"/></pattern>`);
  const v = `url(#${id})`;
  memo.set(clave, v);
  return v;
}

// ------------------------------------------------------------------ líneas

/** Líneas de concentración desde un centro, con un vacío central. */
export function concentracion(cx, cy, { n = 120, interior = 150, color = T, seed = 3, grosor = 0.02, R = 900, jitter = 120 } = {}) {
  const rnd = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r0 = interior + rnd() * jitter;
    const w = grosor * (0.3 + rnd());
    out.push(P(poly([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R], [cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R]]), color));
  }
  return out.join('');
}

/** Líneas verticales de «gran disgusto» que caen de arriba. */
export function lineasCaida(x0, x1, y0, y1, { n = 24, seed = 5, color = T, grosor = 1.6 } = {}) {
  const rnd = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + rnd() * 0.8) / n) * (x1 - x0);
    const l = (y1 - y0) * (0.3 + rnd() * 0.7);
    out.push(S(line(x, y0, x - 6, y0 + l), color, grosor * (0.5 + rnd())));
  }
  return out.join('');
}

/** Vena de enfado: cuatro arcos en cruz, en el rojo ladrillo del bar. */
export function vena(x, y, s = 1, tinta = LADRILLO) {
  const arco = (r) => G([S('M4 -13Q13 -13 13 -4', T, 6.4), S('M2 -9Q9 -9 9 -2', T, 3.6), S('M4 -13Q13 -13 13 -4', tinta, 3.6), S('M2 -9Q9 -9 9 -2', tinta, 1.6)], { transform: `rotate(${r})` });
  return G([0, 90, 180, 270].map(arco).join(''), { transform: `translate(${f(x)} ${f(y)}) scale(${s})` });
}

/** Destello de cuatro puntas: dorado claro con filete dorado oscuro. */
export function brillo4(x, y, r, tinta = ORO_OSC, relleno = '#fff1b8') {
  return P(estrella(x, y, r, 0.2), relleno) + S(estrella(x, y, r, 0.2), tinta, Math.max(1.2, r * 0.07));
}

/** Gota de sudor: azul pálido del sudor de Vero, con filete azul y un brillo. */
export function sudor(x, y, s = 1, rot = 0) {
  const gt = gota(0, 0, s);
  return G([P(gt, '#bfe3f2'), S(gt, '#5f93ad', 2.4), P(ellipse(-3.4 * s, 5 * s, 1.8 * s, 4 * s, 0.4), MARFIL, { opacity: 0.85 })], { transform: `translate(${f(x)} ${f(y)}) rotate(${rot})` });
}

// ------------------------------------------------------------------ letras y onomatopeyas

/** Un alfabeto de trazos (rejilla 4×6) para las onomatopeyas en castellano: la palabra sale de src/textos. */
const LETRAS = {
  A: [[[0, 6], [2, 0], [4, 6]], [[0.8, 4], [3.2, 4]]],
  B: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[3, 3], [4, 4], [4, 5], [3, 6], [0, 6]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  D: [[[0, 0], [0, 6], [2.5, 6], [4, 4.5], [4, 1.5], [2.5, 0], [0, 0]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3.5], [2, 3.5]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[1, 0], [3, 0]], [[2, 0], [2, 6]], [[1, 6], [3, 6]]],
  J: [[[4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3.5]], [[1.3, 2.6], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3.5], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]],
  P: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2.5], [3, 3.5], [0, 3.5]]],
  Q: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]], [[2.5, 4.5], [4, 6.4]]],
  R: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2.5], [3, 3.5], [0, 3.5]], [[2, 3.5], [4, 6]]],
  S: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 2.2], [1, 3], [3, 3], [4, 3.8], [4, 5], [3, 6], [1, 6], [0, 5]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 2.5], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3]], [[4, 0], [2, 3], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  '!': [[[2, 0], [2, 3.8]], [[2, 5.6], [2, 5.7]]],
  '¡': [[[2, 2.2], [2, 6]], [[2, 0.3], [2, 0.4]]],
  '?': [[[0.3, 1.2], [1, 0], [3, 0], [4, 1.2], [4, 2.4], [2, 3.4], [2, 4]], [[2, 5.6], [2, 5.7]]],
  '.': [[[2, 5.6], [2, 5.7]]],
};

const camino = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L');

/** Trazos de una palabra (sin tilde ni minúsculas), en una caja de alto 6·s que empieza en (x, y). Devuelve `{ trazos, ancho }`. */
function trazosPalabra(palabra, s) {
  const limpia = palabra.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const trazos = [];
  let x = 0;
  for (const ch of limpia) {
    const L = LETRAS[ch];
    if (!L) {
      x += 3 * s;
      continue;
    }
    for (const t of L) trazos.push(camino(t.map(([a, b]) => [x + a * s, b * s])));
    x += (ch === '!' || ch === '¡' || ch === '.' ? 3.2 : 5.4) * s;
  }
  return { trazos, ancho: x };
}

/** Trazos de katakana (rejilla de 7×7) para las onomatopeyas japonesas. */
const KANA = {
  go: [[[0.5, 0.5], [6.2, 0.5], [5.7, 6.8], [-0.4, 6.8]], [[5.6, -2.4], [6.9, -3.8]], [[7.6, -1.2], [8.9, -2.6]]],
  do: [[[1.6, -0.6], [1.6, 7.4]], [[1.6, 3.2], [5.6, 5.4]], [[4.4, -1.8], [5.4, -3.2]], [[6.6, -0.8], [7.6, -2.2]]],
  n: [[[0.2, 0.8], [2.6, 2.6]], [[0.2, 6.8], [3.6, 5.6], [6.6, 1.2]]],
  ha: [[[2.9, 0.4], [0.4, 6.8]], [[4.4, 2.2], [6.8, 6.4]]],
  bo: [[[0.2, 1.8], [6.6, 1.8]], [[3.4, -0.4], [3.4, 6.8]], [[3.4, 3.2], [0.6, 6.4]], [[3.4, 3.2], [6.4, 6.4]]],
};

/** Ráfaga de trazos con borde: relleno `relleno`, borde `borde`; cada trazo en rejilla de `s`. */
function tinta(trazos, grueso, relleno, borde, bw) {
  return trazos.map((d) => S(d, borde, grueso + bw * 2)).join('') + trazos.map((d) => S(d, relleno, grueso)).join('');
}

function kana(clave, x, y, s, relleno, borde, bw) {
  const tr = KANA[clave].map((t) => camino(t.map(([a, b]) => [x + a * s, y + b * s])));
  return tinta(tr, 1.55 * s, relleno, borde, bw);
}

/**
 * Onomatopeya hecha dibujo. `palabra`: la de castellano, ya traducida (viene de src/textos); `tipo`:
 *   gogogo (ゴゴゴ, tres en vertical) · don (ドン) · ha (ハハハ, risa) · zas (la palabra)
 * Devuelve un grupo centrado en (x, y), con alto aproximado `alto`, girado `rot` grados.
 */
export function onomatopeya(tipo, { x, y, alto = 120, rot = 0, palabra = '', invertida = false, color = '#ffd27a' } = {}) {
  const relleno = invertida ? T : color;
  const borde = invertida ? MARFIL : T;
  let cuerpo = '';
  if (tipo === 'gogogo') {
    const s = alto / 3 / 10.5;
    for (let i = 0; i < 3; i++) cuerpo += kana('go', -3 * s - i * 0.6 * s, -alto / 2 + 4.8 * s + i * 10.8 * s, s, relleno, borde, 3.2);
  } else if (tipo === 'don') {
    const s = alto / 12;
    cuerpo += kana('do', -9.6 * s, -3.5 * s, s * 1.15, relleno, borde, 3.6) + kana('n', 0.4 * s, -3 * s, s * 1.15, relleno, borde, 3.6);
  } else if (tipo === 'ha') {
    const s = alto / 12;
    for (let i = 0; i < 3; i++) cuerpo += kana('ha', -11 * s + i * 7.8 * s, -3 * s + (i % 2) * 1.8 * s, s, relleno, borde, 3);
  } else if (tipo === 'bo') {
    cuerpo += kana('bo', -4 * 1.3, -4, alto / 9, relleno, borde, 3);
  } else if (tipo === 'zas' && palabra) {
    const s = alto / 6.4;
    const { trazos, ancho } = trazosPalabra(palabra, s);
    cuerpo += G(tinta(trazos, 1.35 * s, relleno, borde, 3.6), { transform: `translate(${f(-ancho / 2 + 1.4 * s)} ${f(-3.2 * s)})` });
  }
  return G(cuerpo, { transform: `translate(${f(x)} ${f(y)}) rotate(${rot})` });
}

/** Aureola de impacto: estrella de picos irregulares (para el «ZAS» y el «DON»). */
export function impacto(cx, cy, r, { picos = 16, seed = 8, relleno = '#f1c75b', borde = T, bw = 3 } = {}) {
  const rnd = rng(seed);
  const pts = [];
  for (let i = 0; i < picos * 2; i++) {
    const a = (i / (picos * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * (0.55 + rnd() * 0.12) : r * (0.9 + rnd() * 0.25);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return P(poly(pts), relleno) + S(poly(pts), borde, bw);
}
