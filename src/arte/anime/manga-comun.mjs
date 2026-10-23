// Piezas de tinta del manga en blanco y negro del capítulo 2 (estilo C de Jesús, ampliado a los cinco
// personajes). Solo devuelve cadenas SVG; se hornea UNA vez a bitmap y nunca por fotograma.
//
// Reglas del estilo (las de estilo-c.mjs): tinta negra (T) sobre papel crema (PAPEL), blancos puros (#fff) solo para
// brillos y letras, tramas de punto y de raya (screentone) que miden lo mismo en pantalla se amplíe lo que se amplíe
// el dibujo (por eso `tonos(c, k)` recibe la escala), líneas de concentración y onomatopeyas hechas con trazos.
import { smooth, ellipse, poly, line, f, rng, P, S, G, estrella, gota } from './comun.mjs';

export { smooth, ellipse, poly, line, f, rng, P, S, G, estrella, gota };

export const T = '#0b0a0d';
export const PAPEL = '#f6f2e6';
export const BLANCO = '#fff';

// ------------------------------------------------------------------ tramas

/**
 * Las tramas de un dibujo de escala `k` (pantalla / unidades del dibujo): el paso de los puntos es de
 * `paso` píxeles de pantalla. `punto(c, cobertura)`: tramas de punto, de 0 (nada) a 1 (negro); por encima
 * de 0,55 son puntos de papel sobre negro. Los patrones se guardan en el contexto para no repetirlos.
 */
export function tonos(c, k = 1, paso = 4.4) {
  const memo = (c.__tonos ??= new Map());
  const esc = paso / k;
  const clave = (...a) => a.join('|');
  const patron = (id, w, h, cuerpo, ang) => {
    c.def(`<pattern id="${id}" width="${f(w)}" height="${f(h)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${ang})">${cuerpo}</pattern>`);
    return `url(#${id})`;
  };
  return {
    esc,
    punto(cobertura, ang = 45, tinta = T) {
      const kk = clave('p', f(cobertura), ang, tinta, f(esc));
      if (memo.has(kk)) return memo.get(kk);
      const id = c.id('tp');
      let v;
      if (cobertura <= 0.55) {
        const r = esc * Math.sqrt(cobertura / Math.PI);
        v = patron(id, esc, esc, `<circle cx="${f(esc / 2)}" cy="${f(esc / 2)}" r="${f(r)}" fill="${tinta}"/>`, ang);
      } else {
        const r = esc * Math.sqrt((1 - cobertura) / Math.PI);
        v = patron(id, esc, esc, `<rect width="${f(esc)}" height="${f(esc)}" fill="${tinta}"/><circle cx="${f(esc / 2)}" cy="${f(esc / 2)}" r="${f(r)}" fill="${PAPEL}"/>`, ang);
      }
      memo.set(kk, v);
      return v;
    },
    /** Trama de rayas: grosor `w` (fracción del paso). */
    raya(w = 0.3, ang = 45, tinta = T, paso2 = paso * 0.7) {
      const kk = clave('r', f(w), ang, tinta, f(esc), paso2);
      if (memo.has(kk)) return memo.get(kk);
      const e2 = paso2 / k;
      const id = c.id('tr');
      const v = patron(id, e2, e2, `<rect width="${f(e2 * w)}" height="${f(e2)}" fill="${tinta}"/>`, ang);
      memo.set(kk, v);
      return v;
    },
  };
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

/** Vena de enfado: cuatro arcos en cruz. */
export function vena(x, y, s = 1, tinta = T) {
  const arco = (r) => G([S('M4 -13Q13 -13 13 -4', tinta, 4.2), S('M2 -9Q9 -9 9 -2', tinta, 2)], { transform: `rotate(${r})` });
  return G([0, 90, 180, 270].map(arco).join(''), { transform: `translate(${f(x)} ${f(y)}) scale(${s})` });
}

/** Destello de cuatro puntas con borde de tinta. */
export function brillo4(x, y, r, tinta = T, relleno = BLANCO) {
  return P(estrella(x, y, r, 0.2), relleno) + S(estrella(x, y, r, 0.2), tinta, Math.max(1.4, r * 0.08));
}

/** Gota de sudor con borde. */
export function sudor(x, y, s = 1, rot = 0) {
  const gt = gota(0, 0, s);
  return G([P(gt, BLANCO), S(gt, T, 2.4), P(ellipse(-3 * s, 4 * s, 2 * s, 4 * s, 0.4), T, { opacity: 0.0 }), S(`M${f(-5 * s)} ${f(2 * s)}Q${f(-5 * s)} ${f(9 * s)} ${f(-1 * s)} ${f(11 * s)}`, T, 1.4)], { transform: `translate(${f(x)} ${f(y)}) rotate(${rot})` });
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
export function onomatopeya(tipo, { x, y, alto = 120, rot = 0, palabra = '', invertida = false } = {}) {
  const relleno = invertida ? T : BLANCO;
  const borde = invertida ? BLANCO : T;
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
export function impacto(cx, cy, r, { picos = 16, seed = 8, relleno = BLANCO, borde = T, bw = 3 } = {}) {
  const rnd = rng(seed);
  const pts = [];
  for (let i = 0; i < picos * 2; i++) {
    const a = (i / (picos * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * (0.55 + rnd() * 0.12) : r * (0.9 + rnd() * 0.25);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return P(poly(pts), relleno) + S(poly(pts), borde, bw);
}
