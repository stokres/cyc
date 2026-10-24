// Las caras del manga a color del capítulo 2: Pablo, Fran, Chuchi, Guille, Vero y la sombra de Pablo, de frente,
// en color plano con sombreado de anime (base, sombra y luz) y línea marrón oscura. Un motor de expresiones
// compartido (ojos, cejas, boca, extras) y, por personaje, lo que lo hace reconocible: la silueta de su pelo (o la
// calva con brillo de Chuchi), su barba, sus gafas, su aro, el moño y los aros de Vero, la camisa de flores de Guille.
// Los colores salen de las paletas `C` de src/arte/personajes/*.mjs (las mismas del juego y de los retratos del
// cuadro de diálogo); la ropa, de sus `OUTFITS`. Rasgos de docs/PERSONAJES.md.
//
// Coordenadas de la cara (mirando al frente, centrada en x = 0): línea de ojos y = 0 · cejas y ≈ -40 · base de la
// nariz y ≈ 52 · boca y ≈ 84 · barbilla y ≈ 135. Todo devuelve cadenas SVG.
import { smooth, ellipse, poly, line, f, rng, P, S, G, T, MARFIL, mezcla, alfa, vena, sudor, brillo4 } from './manga-comun.mjs';
import { ceja as cejaForma, mechon, mechonEje } from './comun.mjs';
import { rrect } from '../personajes/svg.mjs';
import { C as cPablo } from '../personajes/pablo.mjs';
import { C as cFran } from '../personajes/fran.mjs';
import { C as cChuchi } from '../personajes/chuchi.mjs';
import { C as cGuille } from '../personajes/guille.mjs';
import { C as cVero } from '../personajes/vero.mjs';

export const PERSONAJES = ['pablo', 'fran', 'chuchi', 'guille', 'vero'];

/** Las expresiones que tiene cada personaje en el juego (la primera es la de siempre). */
export const EXPRESIONES = {
  pablo: ['suplica', 'sorpresa', 'seriedad', 'risa'],
  fran: ['enfado', 'sorpresa', 'triste', 'risa'],
  chuchi: ['sorpresa', 'duda', 'seriedad', 'risa'],
  guille: ['risa', 'sorpresa', 'nervioso', 'seriedad'],
  vero: ['picara', 'sorpresa', 'risa', 'seriedad'],
  sombra: ['burla', 'seriedad'],
};

// ------------------------------------------------------------------ expresiones
// ceja: [subida del extremo interior, del exterior, arqueo] (negativo = arriba); cejaI: la ceja izquierda, si es distinta.
const EXPR = {
  normal: { ojo: 'abierto', ceja: [0, 0, 0], boca: 'neutra', ex: [] },
  suplica: { ojo: 'suplica', ceja: [-18, 4, 6], boca: 'tiembla', ex: ['lagrima', 'sudor', 'rubor'] },
  sorpresa: { ojo: 'sorpresa', ceja: [-22, -22, 8], boca: 'o', ex: ['sudor', 'susto'] },
  enfado: { ojo: 'enfado', ceja: [18, -4, 0], boca: 'grito', ex: ['vena'] },
  seriedad: { ojo: 'entornado', ceja: [8, 0, 0], boca: 'plana', ex: [] },
  risa: { ojo: 'feliz', ceja: [-4, -10, 2], boca: 'risa', ex: ['rubor'] },
  duda: { ojo: 'entornado', ceja: [-4, -18, 6], cejaI: [10, 4, 0], boca: 'torcida', ex: ['sudor'] },
  triste: { ojo: 'triste', ceja: [-20, 8, 2], boca: 'triste', ex: ['lagrima'] },
  nervioso: { ojo: 'nervioso', ceja: [-12, 0, 4], boca: 'ondulada', ex: ['sudor', 'sudor2'] },
  picara: { ojo: 'entornado', ceja: [-4, -14, 8], cejaI: [4, 2, 0], boca: 'picara', ex: ['rubor'] },
  burla: { ojo: 'sombra', ceja: [0, 0, 0], boca: 'burla', ex: [] },
};
const expr = (nombre) => EXPR[nombre] ?? EXPR.normal;

// ------------------------------------------------------------------ colores por personaje
/** El color de la sombra: la paleta del juego más un tono de línea propio (la piel, oscurecida hacia la tinta). */
const pal = (C, extra = {}) => ({ ...C, lf: mezcla(C.skinLine, T, 0.4), boca: mezcla(C.mouth, T, 0.35), ...extra });

export const PAL = {
  pablo: pal(cPablo),
  fran: pal(cFran),
  // Las cejas pelirrojas de Chuchi, un poco más oscuras para que se lean con el trazo grueso.
  chuchi: pal(cChuchi, { brow: mezcla(cChuchi.brow, T, 0.3) }),
  guille: pal(cGuille),
  vero: pal(cVero),
};

// Ropa (de los OUTFITS de cada personaje).
export const ROPA = {
  // Chaqueta de borreguillo: fuera gris carbón, forro gris claro.
  pablo: { base: '#3b3b41', shadow: '#29292e', light: '#5f5f68', forro: '#9a9ca2', forroSombra: '#6d7077', forroLuz: '#b9bbc0' },
  // Camiseta verde azulada.
  fran: { base: '#2e8a8c', shadow: '#1f6567', light: '#4fb0ae', line: '#154647' },
  // Sudadera granate.
  chuchi: { base: '#7b2432', shadow: '#5b1824', light: '#9b3646', line: '#43101a' },
  // Camisa hawaiana mostaza con hibiscos rojos y hojas verdes.
  guille: { base: '#e2a32e', shadow: '#b67c1c', light: '#f5c95f', hoja: '#2c8a52', nervio: '#1b5c35', flor: '#d93b33', florSombra: '#a42a2b', centro: '#ffd34a' },
  // Camiseta oscura (azul noche, no negro).
  vero: { base: '#2c2d3f', shadow: '#1f2030', light: '#4a4c66' },
};

/** La sombra de Pablo: azul noche casi negro, con luz violeta en el borde. */
export const SOMBRA = '#17131f';
const SOMBRA_LUZ = '#8a78c0';

// ------------------------------------------------------------------ rasgos por personaje
const R = {
  pablo: { ex: 44, w: 66, h: 66, grueso: 6.5, pest: 3, flick: 0, ceja: [12, -44, 76, -50, 9.5, 5, 7], ym: 86, hw: 34, nariz: 1, ir: 1, col: PAL.pablo },
  fran: { ex: 42, w: 54, h: 50, grueso: 6.5, pest: 0, flick: 0, ceja: [8, -40, 80, -42, 18, 13, 3], ym: 94, hw: 36, nariz: 1.18, ir: 0.92, col: PAL.fran },
  chuchi: { ex: 42, w: 40, h: 38, grueso: 4.4, pest: 0, flick: 0, ceja: [16, -56, 72, -58, 6, 3.4, 6], ym: 90, hw: 32, nariz: 1.12, ir: 0.95, col: PAL.chuchi },
  guille: { ex: 43, w: 58, h: 56, grueso: 6, pest: 1, flick: 0, ceja: [10, -43, 82, -47, 16, 10, 4], ym: 88, hw: 36, nariz: 1.05, ir: 1, col: PAL.guille },
  vero: { ex: 40, w: 64, h: 62, grueso: 6.5, pest: 3, flick: 22, ceja: [14, -47, 76, -50, 6.2, 3, 11], ym: 90, hw: 30, nariz: 0.82, ir: 1.02, labios: true, col: PAL.vero },
};

// ------------------------------------------------------------------ ojo (marco local: el centro del ojo, +x hacia fuera)
const FORMAS = {
  abierto: { top: [0.1, -0.3, -0.47, -0.4, 0], bot: [0.1, 0.3, 0.44, 0.3, 0], ir: 0.3 },
  suplica: { top: [0.1, -0.36, -0.58, -0.48, 0.02], bot: [0.1, 0.38, 0.54, 0.38, 0.02], ir: 0.37 },
  sorpresa: { redondo: true, ry: 0.66, ir: 0.12 },
  enfado: { top: [0.2, 0.02, -0.1, -0.2, -0.14], bot: [0.12, 0.24, 0.3, 0.22, -0.02], ir: 0.25 },
  entornado: { top: [0.04, -0.06, -0.1, -0.06, 0.02], bot: [0.04, 0.22, 0.28, 0.22, 0.02], ir: 0.26 },
  triste: { top: [-0.26, -0.4, -0.38, -0.16, 0.16], bot: [0.0, 0.34, 0.46, 0.4, 0.22], ir: 0.34 },
  nervioso: { redondo: true, ry: 0.56, ir: 0.15 },
};

/** Iris de color con la pupila oscura, el reflejo inferior más claro y dos brillos de marfil. */
function iris(col, cx, cy, rx, ry, { pupila = 0.52, brillos = true } = {}) {
  const claro = col.irisLight ?? mezcla(col.iris, '#e0a468', 0.5);
  return [
    P(ellipse(cx, cy, rx, ry), col.iris),
    P(ellipse(cx, cy + ry * 0.5, rx * 0.78, ry * 0.46), claro, { opacity: 0.75 }),
    P(ellipse(cx, cy + ry * 0.04, rx * pupila, ry * (pupila + 0.08)), T),
    P(ellipse(cx - rx * 0.34, cy - ry * 0.34, rx * 0.38, ry * 0.3), MARFIL),
    brillos ? P(ellipse(cx + rx * 0.42, cy + ry * 0.36, rx * 0.16, ry * 0.13), MARFIL) : '',
  ].join('');
}

function ojo(c, r, tipo, { sombraSup = true } = {}) {
  const { w, h, grueso, pest, flick, col } = r;
  if (tipo === 'feliz') {
    const arco = `M${f(-w / 2)} ${f(h * 0.2)}Q${f(0)} ${f(-h * 0.8)} ${f(w / 2)} ${f(h * 0.2)}`;
    const o = [S(arco, T, grueso * 1.7)];
    for (let i = 0; i < Math.max(2, pest); i++) o.push(S(`M${f(w * (0.2 + 0.12 * i))} ${f(-h * (0.5 - 0.1 * i))}l${f(w * 0.1)} ${f(-h * 0.14)}`, T, 3.2));
    if (flick) o.push(S(`M${f(w / 2)} ${f(h * 0.2)}Q${f(w / 2 + flick * 0.5)} ${f(h * 0.1)} ${f(w / 2 + flick)} ${f(-h * 0.2)}`, T, 4.4));
    return o.join('');
  }
  if (tipo === 'sombra') {
    // Ojo de la sombra: una almendra afilada de marfil, sin iris.
    const a = smooth([[-w / 2, h * 0.22, 'c'], [-w * 0.2, -h * 0.12], [w * 0.2, -h * 0.34], [w / 2 + 8, -h * 0.34, 'c'], [w * 0.22, h * 0.08], [-w * 0.18, h * 0.3]]);
    return P(a, '#f4ead2');
  }
  const F = FORMAS[tipo] ?? FORMAS.abierto;
  const xs = [-w / 2, -w / 4, 0, w / 4, w / 2];
  if (F.redondo) {
    // Ojo redondo (sorpresa, nervios): un óvalo, con el borde superior más grueso.
    const rxo = w * 0.52;
    const ryo = h * F.ry * 0.78;
    const G8 = Array.from({ length: 12 }, (_, i) => [Math.cos((i / 12) * Math.PI * 2) * rxo, Math.sin((i / 12) * Math.PI * 2) * ryo]);
    const formaR = smooth(G8);
    const rr = w * (F.ir ?? 0.14) * r.ir * 1.3;
    const oo = [
      G([P(formaR, MARFIL), P(smooth([[-rxo, -ryo * 0.2], [0, -ryo * 1.2], [rxo, -ryo * 0.2], [rxo, -ryo * 0.55], [0, -ryo * 1.3], [-rxo, -ryo * 0.55]]), alfa('#6a4a5a', 0.25)), iris(col, w * 0.02, h * 0.04, rr, rr * 1.15, { pupila: 0.5 })].join(''), { 'clip-path': c.clip(formaR) }),
      S(formaR, T, grueso * 0.8),
      S(smooth(G8.slice(7, 12).concat([G8[0]]).map((p) => p), false), T, grueso * 1.25),
    ];
    for (let i = 0; i < pest; i++) oo.push(S(`M${f(rxo * (0.5 + 0.12 * i))} ${f(-ryo * (0.7 - 0.2 * i))}l${f(w * 0.12)} ${f(-h * 0.1)}`, T, 3.2));
    if (flick) oo.push(P(`M${f(rxo * 0.6)} ${f(-ryo * 0.7)}Q${f(rxo)} ${f(-ryo * 0.7)} ${f(rxo + flick)} ${f(-ryo - flick * 0.4)}Q${f(rxo + 6)} ${f(-ryo * 0.2)} ${f(rxo * 0.9)} ${f(-ryo * 0.2)}Z`, T));
    return oo.join('');
  }
  const top = xs.map((x, i) => [x, F.top[i] * h]);
  const bot = xs.map((x, i) => [x, F.bot[i] * h]);
  const pt = (a, i) => (i === 0 || i === 4 ? [a[0], a[1], 'c'] : a);
  const forma = smooth([...top.map(pt), ...bot.slice(1, 4).reverse()]);
  const linTop = smooth(top, false);
  const k = c.clip(forma);
  const ir = (F.ir ?? 0.3) * r.ir;
  const rx = ir * w;
  const ry = Math.min(rx * 1.3, h * 0.6);
  const medio = ((F.top[2] + F.bot[2]) / 2) * h;
  const icx = w * 0.04;
  const icy = medio + (tipo === 'entornado' || tipo === 'enfado' ? h * 0.1 : h * 0.03);
  const llora = tipo === 'suplica' || tipo === 'triste';
  const dentro = [
    P(forma, MARFIL),
    sombraSup ? P(smooth([...top.map((p) => [p[0], p[1] - 4]), ...top.slice().reverse().map((p) => [p[0], p[1] + h * 0.26])]), alfa('#6a4a5a', 0.28)) : '',
    iris(col, icx, icy, rx, ry),
    llora ? P(estrella4(icx + rx * 0.34, icy - ry * 0.1, rx * 0.4), MARFIL) : '',
    llora ? P(`M${f(-w)} ${f(h * 0.32)}Q${f(0)} ${f(h * 0.26)} ${f(w)} ${f(h * 0.32)}L${f(w)} ${f(h)}L${f(-w)} ${f(h)}Z`, '#cfe8f2', { opacity: 0.45 }) : '',
    llora ? S(smooth([[-w * 0.4, h * 0.36], [0, h * 0.31], [w * 0.4, h * 0.34]], false), MARFIL, 2.6) : '',
  ].join('');
  const o = [G(dentro, { 'clip-path': k }), S(linTop, T, grueso)];
  // Párpado superior más grueso hacia fuera.
  o.push(S(smooth([top[2], top[3], top[4]], false), T, grueso * 1.75));
  if (tipo === 'enfado') o.push(S(smooth([top[0], top[1], top[2]], false), T, grueso * 1.5));
  // Línea inferior fina y pliegue (en el color de la línea de la piel, más suave que la tinta).
  o.push(S(smooth([bot[1], bot[2], bot[3]], false), col.lf, 1.8, { opacity: 0.85 }));
  o.push(S(smooth([[top[1][0], top[1][1] - h * 0.2], [top[2][0], top[2][1] - h * 0.26], [top[3][0], top[3][1] - h * 0.18]], false), col.lf, 1.8, { opacity: tipo === 'sorpresa' ? 0 : 0.8 }));
  // Pestañas hacia fuera y arriba (y el rabillo de Vero).
  for (let i = 0; i < pest; i++) {
    const bx = w * (0.22 + 0.1 * i);
    const by = top[3][1] + (top[4][1] - top[3][1]) * (i / Math.max(1, pest)) * 0.6;
    o.push(S(`M${f(bx)} ${f(by)}Q${f(bx + w * 0.1)} ${f(by - h * 0.06)} ${f(bx + w * 0.17)} ${f(by - h * 0.2 - i * 2)}`, T, 3.2));
  }
  if (flick) o.push(P(`M${f(w * 0.2)} ${f(top[3][1] - 1)}Q${f(w * 0.55)} ${f(top[4][1] - 4)} ${f(w / 2 + flick)} ${f(top[4][1] - flick * 0.8)}Q${f(w * 0.6)} ${f(top[4][1] + 6)} ${f(w / 2)} ${f(top[4][1] + 3)}Z`, T));
  return o.join('');
}

/** Estrella de cuatro puntas (sin importar de comun: se usa dentro del ojo). */
function estrella4(x, y, r, k = 0.2) {
  return `M${f(x)} ${f(y - r)}Q${f(x + r * k)} ${f(y - r * k)} ${f(x + r)} ${f(y)}Q${f(x + r * k)} ${f(y + r * k)} ${f(x)} ${f(y + r)}Q${f(x - r * k)} ${f(y + r * k)} ${f(x - r)} ${f(y)}Q${f(x - r * k)} ${f(y - r * k)} ${f(x)} ${f(y - r)}Z`;
}

/** Los dos ojos (el derecho es el local; el izquierdo, su espejo). */
function ojos(c, r, e) {
  const uno = ojo(c, r, e.ojo);
  return G(uno, { transform: `translate(${r.ex} 0)` }) + G(uno, { transform: `translate(${-r.ex} 0) scale(-1 1)` });
}

function cejas(r, e) {
  const [xi, yi, xo, yo, t0, t1, arq] = r.ceja;
  const hacer = (ce) => {
    const [di, dd, ar] = ce;
    return P(cejaForma(xi, yi + di, xo, yo + dd, t0, t1, arq + ar), r.col.brow);
  };
  const der = hacer(e.ceja);
  const izq = hacer(e.cejaI ?? e.ceja);
  return der + G(izq, { transform: 'scale(-1 1)' });
}

// ------------------------------------------------------------------ nariz
function nariz(r, { sombra = true } = {}) {
  const s = r.nariz;
  const lf = r.col.lf;
  const o = [];
  o.push(S(`M${f(9 * s)} ${f(14)}Q${f(15 * s)} ${f(40)} ${f(14 * s)} ${f(48)}Q${f(8 * s)} ${f(57 * s)} ${f(-4 * s)} ${f(55 * s)}`, lf, 3));
  o.push(S(`M${f(-14 * s)} ${f(50)}Q${f(-10 * s)} ${f(57 * s)} ${f(-4 * s)} ${f(55 * s)}`, lf, 2.6));
  o.push(P(ellipse(10 * s, 53 * s, 3.6, 2.4, 0.3), lf), P(ellipse(-10 * s, 53 * s, 3.2, 2.2, -0.3), lf));
  if (sombra) o.push(S(`M${f(-10)} ${f(4)}Q${f(-12 * s)} ${f(30)} ${f(-14 * s)} ${f(48)}`, r.col.skinDeep, 2, { opacity: 0.7 }));
  // Luz en el puente de la nariz.
  o.push(S(`M${f(3 * s)} ${f(14)}Q${f(7 * s)} ${f(30)} ${f(6 * s)} ${f(42)}`, r.col.skinLight, 2.6, { opacity: 0.8 }));
  return o.join('');
}

// ------------------------------------------------------------------ boca (marco local: centro de la boca)
function boca(c, r, tipo, { barba = false } = {}) {
  const hw = r.hw;
  const col = r.col;
  const dientes = (ancho, alto, n = 6) => {
    const o = [P(`M${f(-ancho)} ${f(-3)}Q0 ${f(2)} ${f(ancho)} ${f(-3)}L${f(ancho * 0.9)} ${f(alto)}Q0 ${f(alto + 4)} ${f(-ancho * 0.9)} ${f(alto)}Z`, col.teeth)];
    for (let i = 1; i < n; i++) o.push(S(line(-ancho + (i * 2 * ancho) / n, -1, -ancho * 0.9 + (i * 1.8 * ancho) / n, alto + 1), mezcla(col.teeth, '#8a6a64', 0.55), 1.4));
    return o.join('');
  };
  const lengua = (y, rx, ry) => P(ellipse(0, y, rx, ry), col.tongue);
  // Con barba, el labio rodea la boca (el rosa de los labios del juego); en Vero, los labios vinotinto.
  const anillo = (d, ancho) => (barba ? S(d, col.lip, ancho + 8) : '') + (r.labios ? S(d, col.lip, ancho) : '');
  const MB = col.boca;
  switch (tipo) {
    case 'risa': {
      const d = `M${f(-hw)} -6Q0 0 ${f(hw)} -6C${f(hw * 0.85)} 40 ${f(-hw * 0.85)} 40 ${f(-hw)} -6Z`;
      return [anillo(d, 9), P(d, col.mouth), G(dientes(hw * 0.86, 10) + lengua(26, hw * 0.45, 9), { 'clip-path': c.clip(d) }), S(d, MB, 3.6)].join('');
    }
    case 'grito': {
      const d = `M${f(-hw)} -8Q0 -3 ${f(hw)} -8L${f(hw * 0.86)} 22Q${f(hw * 0.75)} 58 0 60Q${f(-hw * 0.75)} 58 ${f(-hw * 0.86)} 22Z`;
      return [anillo(d, 9), P(d, col.mouth), G(dientes(hw * 0.88, 12, 7) + lengua(46, hw * 0.55, 13), { 'clip-path': c.clip(d) }), S(d, MB, 3.6)].join('');
    }
    case 'o': {
      const d = ellipse(0, 14, hw * 0.4, hw * 0.54);
      return [anillo(d, 9), P(d, col.mouth), P(ellipse(0, 26, hw * 0.24, hw * 0.14), col.tongue), P(ellipse(-hw * 0.14, 4, 4.4, 2.6, -0.4), MARFIL, { opacity: 0.8 }), S(d, MB, 3.6)].join('');
    }
    case 'tiembla': {
      const d = `M${f(-hw * 0.7)} 4Q${f(-hw * 0.5)} -3 ${f(-hw * 0.3)} 4T${f(hw * 0.1)} 4T${f(hw * 0.5)} 4T${f(hw * 0.7)} 4`;
      return anillo(d, 5) + S(d, MB, 3.4) + S(`M${f(-hw * 0.3)} 14Q0 18 ${f(hw * 0.3)} 14`, col.lf, 1.6, { opacity: 0.7 });
    }
    case 'ondulada': {
      const d = `M${f(-hw * 0.8)} 2Q${f(-hw * 0.55)} -6 ${f(-hw * 0.3)} 2T${f(0.1)} 2T${f(hw * 0.3)} 2T${f(hw * 0.8)} 2`;
      return anillo(d, 5) + S(d, MB, 3.6);
    }
    case 'triste': {
      const d = `M${f(-hw * 0.8)} 8Q0 -8 ${f(hw * 0.8)} 8`;
      return anillo(d, 6) + S(d, MB, 3.8) + S(`M${f(-hw * 0.3)} 16Q0 20 ${f(hw * 0.3)} 16`, col.lf, 1.6, { opacity: 0.7 });
    }
    case 'plana': {
      const d = `M${f(-hw * 0.9)} 2Q0 5 ${f(hw * 0.9)} 2`;
      return anillo(d, 5) + S(d, MB, 4) + S(`M${f(-hw * 0.4)} 14Q0 18 ${f(hw * 0.4)} 14`, col.lf, 1.6, { opacity: 0.7 });
    }
    case 'torcida': {
      const d = `M${f(-hw * 0.85)} 8Q${f(-hw * 0.1)} 3 ${f(hw * 0.2)} 1T${f(hw * 0.9)} -8`;
      return anillo(d, 5) + S(d, MB, 3.8) + S(`M${f(hw * 0.9)} -8l5 -5`, col.lf, 2.2);
    }
    case 'picara': {
      const d = `M${f(-hw * 0.9)} 2Q${f(-hw * 0.1)} 12 ${f(hw * 0.9)} -8`;
      const abre = `M${f(hw * 0.2)} 8Q${f(hw * 0.6)} 6 ${f(hw * 0.9)} -8Q${f(hw * 0.7)} 16 ${f(hw * 0.2)} 8Z`;
      return anillo(d, 7) + S(d, MB, 4) + P(abre, col.mouth) + S(`M${f(hw * 0.9)} -8l6 -6`, col.lf, 2.4) + P(`M${f(hw * 0.32)} 8Q${f(hw * 0.6)} 4 ${f(hw * 0.76)} -2L${f(hw * 0.7)} 8Z`, col.teeth);
    }
    case 'burla': {
      // La sonrisa de la sombra: una luna de marfil.
      return P(`M${f(-hw * 1.1)} -2Q0 ${f(30)} ${f(hw * 1.1)} -2Q0 ${f(14)} ${f(-hw * 1.1)} -2Z`, '#f4ead2');
    }
    default: {
      const d = `M${f(-hw * 0.85)} 2Q0 9 ${f(hw * 0.85)} 2`;
      return anillo(d, 6) + S(d, MB, 3.6) + S(`M${f(-hw * 0.35)} 14Q0 18 ${f(hw * 0.35)} 14`, col.lf, 1.6, { opacity: 0.7 });
    }
  }
}

// ------------------------------------------------------------------ extras (sudor, lágrimas, rubor, susto, vena)
function extras(r, e, { hairH = -150 } = {}) {
  const o = [];
  for (const x of e.ex) {
    if (x === 'sudor') o.push(sudor(100, hairH + 70, 1.6, 8), sudor(112, hairH + 100, 0.9, 8));
    if (x === 'sudor2') o.push(sudor(-104, hairH + 80, 1.3, -8));
    if (x === 'lagrima') o.push(sudor(-r.ex - 14, 44, 0.9, 180), sudor(r.ex + 14, 44, 0.9, 180));
    if (x === 'rubor') {
      for (const s of [-1, 1]) {
        o.push(P(ellipse(s * (r.ex + 2), 44, 24, 13, s * 0.15), r.col.blush, { opacity: 0.42 }));
        for (let i = 0; i < 3; i++) o.push(S(line(s * (r.ex - 12 + i * 12), 40, s * (r.ex - 2 + i * 12), 54), mezcla(r.col.blush, T, 0.3), 2, { opacity: 0.85 }));
      }
    }
    if (x === 'vena') o.push(vena(122, -94, 1.5));
    if (x === 'susto') {
      for (let i = 0; i < 7; i++) {
        const a = (-150 + i * 20) * (Math.PI / 180);
        const r0 = 178;
        const r1 = 208;
        o.push(S(line(Math.cos(a) * r0, -20 + Math.sin(a) * r0, Math.cos(a) * r1, -20 + Math.sin(a) * r1), '#e9d8b8', 3, { opacity: 0.85 }));
      }
    }
  }
  return o.join('');
}

// ------------------------------------------------------------------ formas de la cabeza
/** Contorno simétrico: puntos de la mitad derecha, de la coronilla a la barbilla. */
function simetrico(der) {
  const izq = der
    .slice(1, -1)
    .reverse()
    .map(([x, y, c]) => [-x, y, c]);
  return smooth([...der, ...izq]);
}
const CARAS = {
  pablo: [[0, -118], [60, -104], [86, -60], [90, -10], [92, 30], [86, 62], [70, 98], [46, 122], [0, 134]],
  fran: [[0, -122], [64, -108], [92, -62], [96, -10], [98, 34], [94, 70], [80, 104], [50, 128], [0, 138]],
  chuchi: [[0, -152], [46, -142], [80, -104], [92, -52], [95, 0], [93, 40], [86, 76], [66, 108], [38, 128], [0, 134]],
  guille: [[0, -122], [60, -112], [86, -70], [88, -20], [89, 34], [88, 76], [80, 112, 'c'], [58, 136], [30, 146], [0, 148]],
  vero: [[0, -116], [58, -104], [82, -60], [84, -10], [84, 36], [78, 70], [64, 100], [44, 122], [20, 134], [0, 138]],
};

function oreja(x, y, rx, ry, col, lado) {
  return G(
    [
      P(ellipse(0, 0, rx, ry), col.skin),
      P(ellipse(rx * 0.1, ry * 0.05, rx * 0.62, ry * 0.7), col.skinShadow),
      S(`M${f(-rx * 0.1)} ${f(-ry * 0.6)}Q${f(rx * 0.7)} ${f(-ry * 0.2)} ${f(-rx * 0.1)} ${f(ry * 0.5)}`, col.lf, 1.8),
      S(ellipse(0, 0, rx, ry), col.lf, 3),
    ],
    { transform: `translate(${x} ${y}) scale(${lado} 1)` },
  );
}

function cuello(col, ancho = 44, y0 = 90, y1 = 210) {
  const d = smooth([[-ancho, y0], [-ancho - 2, y1], [ancho + 2, y1], [ancho, y0]]);
  return [
    P(d, col.skin),
    // Sombra del mentón sobre el cuello y lado izquierdo en sombra.
    P(`M${-ancho} ${y0}Q0 ${y0 + 40} ${ancho} ${y0}V${y0 + 12}Q0 ${y0 + 52} ${-ancho} ${y0 + 12}Z`, col.skinDeep, { opacity: 0.8 }),
    P(smooth([[-ancho, y0 + 8], [-ancho - 2, y1], [-ancho * 0.2, y1], [-ancho * 0.3, y0 + 30]]), col.skinShadow, { opacity: 0.8 }),
    S(`M${-ancho} ${y0}L${-ancho - 2} ${y1}`, col.lf, 3),
    S(`M${ancho} ${y0}L${ancho + 2} ${y1}`, col.lf, 3),
  ].join('');
}

/** Las mejillas y la frente con luz y el lado izquierdo en sombra (cel shading de la cara). */
function sombreadoCara(col, sombra, luces = true) {
  const o = [P(sombra, col.skinShadow)];
  if (luces) o.push(P(ellipse(46, 24, 20, 11, -0.5), col.skinLight, { opacity: 0.75 }), P(ellipse(12, -82, 38, 9), col.skinLight, { opacity: 0.55 }));
  return o.join('');
}

// ------------------------------------------------------------------ pelo
/** Dos pasadas: contorno gordo y relleno encima, y solo queda el borde de la silueta de la unión de formas. */
function union(formas, relleno, borde = T, grosor = 6.5) {
  return formas.map((d) => S(d, borde, grosor)).join('') + formas.map((d) => P(d, relleno)).join('');
}

// ================================================================== PABLO
/** Borde de nube (borreguillo): cada tramo entre dos puntos se abomba hacia fuera. */
function nube(pts, abombo = 10) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const gx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const gy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  for (let i = 1; i <= pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i % pts.length];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const L = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = -(y1 - y0) / L;
    const ny = (x1 - x0) / L;
    const signo = nx * (mx - gx) + ny * (my - gy) >= 0 ? 1 : -1;
    d += `Q${f(mx + nx * abombo * signo * 1.6)} ${f(my + ny * abombo * signo * 1.6)} ${f(x1)} ${f(y1)}`;
  }
  return d + 'Z';
}

/** El tupé de Pablo: una masa de pelo y seis mechones hacia arriba, revueltos y echados a la derecha. */
const PABLO_CASCO = smooth([[-90, -6, 'c'], [-98, -50], [-92, -98], [-72, -122], [-40, -130], [0, -134], [40, -130], [72, -120], [94, -96], [100, -50], [92, -6, 'c'], [84, -20], [80, -64], [66, -88], [50, -96], [36, -78], [20, -98], [0, -84], [-22, -100], [-42, -82], [-62, -94], [-78, -62], [-84, -20]]);
const PABLO_MECHONES = [[-72, -104, -100, -152, 46, 0.3], [-42, -118, -54, -178, 58, -0.26], [-4, -124, 30, -188, 62, 0.3], [34, -122, 80, -172, 58, 0.3], [68, -104, 112, -136, 44, 0.26]];
const pabloFormas = () => [PABLO_CASCO, ...PABLO_MECHONES.map(([x, y, tx, ty, w, cu]) => mechon(x, y, tx, ty, w, cu))];

function pablo(c, e) {
  const r = R.pablo;
  const col = r.col;
  const J = ROPA.pablo;
  const o = [];
  // Chaqueta de borreguillo (gris carbón) abierta, con el cuello de nube (forro gris claro).
  const torso = smooth([[-200, 270], [-176, 196], [-112, 164], [-50, 150], [50, 150], [112, 164], [176, 196], [200, 270]]);
  o.push(P(torso, J.base), P(smooth([[-200, 270], [-176, 196], [-112, 164], [-70, 172], [-100, 270]]), J.shadow), S(torso, T, 3));
  o.push(cuello(col, 42, 90, 190));
  o.push(P(smooth([[-44, 150], [0, 178], [44, 150], [40, 200], [-40, 200]]), J.shadow), S(smooth([[-44, 150], [0, 178], [44, 150]], false), T, 2.6));
  const solapa = (s) => {
    const base = nube([[s * 44, 150], [s * 84, 152], [s * 124, 166], [s * 160, 190], [s * 170, 232], [s * 168, 280], [s * 60, 280], [s * 44, 238], [s * 30, 196]], 11);
    return [
      P(base, J.forro),
      G(P(poly([[s * 20, 226], [s * 190, 226], [s * 190, 290], [s * 20, 290]]), J.forroSombra) + P(ellipse(s * 110, 172, 26, 8, s * 0.5), J.forroLuz, { opacity: 0.8 }), { 'clip-path': c.clip(base) }),
      S(base, mezcla(J.forroSombra, T, 0.6), 3),
    ].join('');
  };
  o.push(solapa(-1), solapa(1));
  // Orejas y el aro (pendiente de plata), bien visible.
  o.push(oreja(-95, 14, 11, 24, col, -1), oreja(95, 14, 11, 24, col, 1));
  o.push(S(ellipse(-97, 56, 12.5, 15), mezcla(col.earring, T, 0.55), 8), S(ellipse(-97, 56, 12.5, 15), col.earring, 3.8), S('M-106 50Q-102 45 -96 44', MARFIL, 1.4));
  // Cara.
  const cara = simetrico(CARAS.pablo);
  o.push(P(cara, col.skin));
  o.push(sombreadoCara(col, smooth([[-40, -90], [-92, -60], [-94, 20], [-86, 66], [-66, 106], [-40, 120], [-60, 40], [-62, -30]])));
  // Barba corta: un borde pegado a la mandíbula, patilla y bigote.
  const barba = smooth([[-92, -6, 'c'], [-90, 40], [-76, 80], [-52, 114], [-26, 130], [0, 135], [26, 130], [52, 114], [76, 80], [90, 40], [92, -6, 'c'], [82, 24], [72, 52], [58, 74], [40, 78], [22, 68], [8, 64], [0, 66], [-8, 64], [-22, 68], [-40, 78], [-58, 74], [-72, 52], [-82, 24]]);
  o.push(P(barba, col.beard), P(smooth([[-92, -6], [-90, 40], [-76, 80], [-52, 114], [-26, 130], [0, 135], [-30, 100], [-60, 70], [-80, 30]]), col.beardShadow, { opacity: 0.75 }), S(barba, col.beardLine, 2.2));
  o.push(S('M30 118Q50 108 66 84', col.beardLight, 2.4, { opacity: 0.8 }), S('M-8 124Q14 124 34 114', col.beardLight, 2, { opacity: 0.7 }));
  o.push(S(cara, col.lf, 3.4));
  o.push(nariz(r));
  o.push(G(boca(c, r, e.boca, { barba: true }), { transform: `translate(0 ${r.ym})` }));
  o.push(ojos(c, r, e), cejas(r, e));
  o.push(pabloPelo(col));
  o.push(extras(r, e, { hairH: -150 }));
  return o.join('');
}

/** El pelo de Pablo: silueta de las formas unidas, lado en sombra y brillos de mechón. */
function pabloPelo(col, solido = null) {
  const o = [union(pabloFormas(), solido ?? col.hair, solido ? solido : T)];
  if (solido) return o.join('');
  // Sombra: el lado izquierdo de cada mechón y la sien.
  o.push(P(smooth([[-96, -20], [-100, -60], [-94, -98], [-76, -118], [-62, -104], [-74, -90], [-80, -60], [-84, -20]]), col.hairShadow));
  for (const [x, y, tx, ty, w, cu] of PABLO_MECHONES) {
    o.push(P(mechon(x - w * 0.26, y + 4, tx - 4, ty + 3, w * 0.34, cu), col.hairShadow));
    o.push(S(mechonEje(x + w * 0.12, y, tx, ty, cu, 0.22, 0.8), col.hairLight, Math.max(2.4, w * 0.09)));
  }
  o.push(S('M-60 -122Q-30 -136 8 -132', col.hairLight, 3), S('M-20 -108Q10 -122 40 -110', col.hairLight, 2.4));
  return o.join('');
}

// ================================================================== FRAN
function fran(c, e) {
  const r = R.fran;
  const col = r.col;
  const J = ROPA.fran;
  const o = [];
  // Camiseta verde azulada, hombros anchos y cuello redondo.
  const torso = smooth([[-230, 270], [-210, 200], [-130, 164], [-60, 150], [60, 150], [130, 164], [210, 200], [230, 270]]);
  o.push(cuello(col, 46, 90, 190));
  o.push(P(torso, J.base), P(smooth([[-230, 270], [-210, 200], [-130, 164], [-100, 200], [-110, 270]]), J.shadow), P(smooth([[210, 200], [130, 164], [150, 190], [190, 230], [230, 270], [200, 270]]), J.light, { opacity: 0.55 }), S(torso, J.line, 3.2));
  o.push(P(smooth([[-70, 154], [-40, 192], [0, 204], [40, 192], [70, 154], [50, 150], [0, 160], [-50, 150]]), J.shadow), S(smooth([[-70, 154], [-40, 192], [0, 204], [40, 192], [70, 154]], false), J.line, 3));
  o.push(oreja(-98, 12, 12, 26, col, -1), oreja(98, 12, 12, 26, col, 1));
  const cara = simetrico(CARAS.fran);
  o.push(P(cara, col.skin), sombreadoCara(col, smooth([[-40, -90], [-96, -60], [-98, 20], [-90, 70], [-60, 110], [-36, 36], [-60, -30]])));
  o.push(S(cara, col.lf, 3.4));
  // Barba ENORME y oscura: de oreja a oreja, mucho por debajo de la barbilla, en pico.
  const barba = smooth([[-102, -8, 'c'], [-106, 40], [-102, 92], [-86, 136], [-60, 166], [-32, 190], [0, 204], [32, 190], [60, 166], [86, 136], [102, 92], [106, 40], [102, -8, 'c'], [94, 14], [86, 38], [68, 54], [46, 60], [24, 58], [0, 62], [-24, 58], [-46, 60], [-68, 54], [-86, 38], [-94, 14]]);
  o.push(P(barba, col.beard));
  o.push(P(smooth([[-102, -8], [-106, 40], [-102, 92], [-86, 136], [-60, 166], [-32, 190], [0, 204], [-10, 150], [-40, 100], [-70, 60], [-90, 20]]), col.beardShadow, { opacity: 0.8 }));
  // Mechas de la barba (más claras) y canas.
  for (const [x0, y0, x1, y1, w] of [[-70, 70, -78, 130, 2.4], [-48, 90, -52, 160, 2], [-24, 110, -22, 184, 2.4], [24, 110, 22, 184, 2.2], [50, 92, 54, 160, 2], [72, 72, 80, 132, 2.4], [-84, 56, -96, 100, 1.8], [86, 56, 98, 104, 1.8]]) {
    o.push(S(`M${x0} ${y0}Q${(x0 + x1) / 2 + 8} ${(y0 + y1) / 2} ${x1} ${y1}`, col.beardLight, w, { opacity: 0.9 }));
  }
  o.push(S('M-56 116Q-46 150 -34 176', col.beardLight, 3.2), S('M40 130Q52 150 58 168', col.hairGrey, 2.6, { opacity: 0.85 }), S('M-86 40Q-82 70 -70 96', col.beardLight, 2.4));
  o.push(P(smooth([[30, 150], [50, 130], [66, 108], [60, 150], [40, 176]]), col.beardLight, { opacity: 0.4 }));
  o.push(S(barba, T, 3));
  // Bigote espeso sobre la boca.
  const bigote = smooth([[0, 58], [24, 56], [50, 62], [68, 78, 'c'], [48, 86], [26, 80], [0, 76], [-26, 80], [-48, 86], [-68, 78, 'c'], [-50, 62], [-24, 56]]);
  o.push(P(bigote, col.beardShadow), S('M-40 66Q-20 62 -4 66', col.beardLight, 2, { opacity: 0.9 }), S('M40 66Q20 62 4 66', col.beardLight, 2, { opacity: 0.9 }), S(bigote, T, 2));
  o.push(nariz(r, { sombra: false }));
  o.push(G(boca(c, r, e.boca, { barba: true }), { transform: `translate(0 ${r.ym})` }));
  o.push(ojos(c, r, e), cejas(r, e));
  // Pelo oscuro ondulado con alguna cana.
  const pelo = smooth([[-102, 14, 'c'], [-106, -50], [-96, -100], [-62, -134], [-30, -150], [0, -156], [36, -152], [70, -134], [96, -100], [106, -50], [102, 14, 'c'], [94, -30], [90, -62], [78, -86], [62, -90], [50, -76], [34, -92], [16, -78], [-2, -94], [-18, -78], [-34, -94], [-50, -80], [-66, -92], [-82, -72], [-92, -30]]);
  o.push(P(pelo, col.hair));
  o.push(P(smooth([[-102, 14], [-106, -50], [-96, -100], [-62, -134], [-50, -120], [-82, -90], [-90, -40], [-92, -30]]), col.hairShadow, { opacity: 0.9 }));
  o.push(S('M-70 -120Q-34 -146 6 -144', col.hairLight, 4.4), S('M20 -144Q50 -146 78 -122', col.hairLight, 3.6), S('M-90 -90Q-86 -110 -76 -122', col.hairLight, 2.8));
  o.push(S('M-30 -128Q-10 -138 14 -130', col.hairGrey, 2.2, { opacity: 0.9 }), S('M36 -120Q48 -128 60 -122', col.hairGrey, 2.2, { opacity: 0.9 }), S('M-8 -112Q4 -118 18 -110', col.hairGrey, 1.8, { opacity: 0.8 }));
  o.push(S(pelo, T, 3.2));
  o.push(extras(r, e, { hairH: -156 }));
  return o.join('');
}

// ================================================================== CHUCHI
function chuchi(c, e) {
  const r = R.chuchi;
  const col = r.col;
  const J = ROPA.chuchi;
  const o = [];
  // Sudadera granate sin capucha, con cuello de canalé.
  const torso = smooth([[-170, 270], [-160, 200], [-110, 168], [-52, 152], [52, 152], [110, 168], [160, 200], [170, 270]]);
  o.push(cuello(col, 40, 100, 190));
  o.push(P(torso, J.base), P(smooth([[-170, 270], [-160, 200], [-110, 168], [-84, 210], [-90, 270]]), J.shadow), P(smooth([[160, 200], [110, 168], [126, 196], [150, 240], [170, 270], [140, 270]]), J.light, { opacity: 0.5 }), S(torso, J.line, 3.2));
  const cuelloSud = smooth([[-52, 152], [-40, 186], [0, 200], [40, 186], [52, 152], [44, 148], [0, 160], [-44, 148]]);
  o.push(P(cuelloSud, J.shadow), S(cuelloSud, J.line, 2.8));
  for (let i = -3; i <= 3; i++) o.push(S(line(i * 11, 164 + Math.abs(i) * 2, i * 12, 190 - Math.abs(i) * 4), J.line, 1.4, { opacity: 0.7 }));
  o.push(oreja(-96, 16, 13, 28, col, -1), oreja(96, 16, 13, 28, col, 1));
  // Calva: cabeza redonda con mucho brillo.
  const cara = simetrico(CARAS.chuchi);
  o.push(P(cara, col.skin));
  o.push(P(smooth([[-30, -146], [-84, -110], [-94, -40], [-96, 10], [-88, 70], [-66, 108], [-40, 124], [-62, 40], [-66, -50], [-56, -110]]), col.skinShadow));
  o.push(P(smooth([[-60, -128], [-90, -80], [-96, -10], [-86, 60], [-70, 100], [-82, 20], [-80, -50], [-60, -100]]), col.skinDeep, { opacity: 0.45 }));
  // Barba pelirroja recortada.
  const barba = smooth([[-93, 6, 'c'], [-90, 44], [-76, 82], [-54, 114], [-28, 134], [0, 142], [28, 134], [54, 114], [76, 82], [90, 44], [93, 6, 'c'], [84, 30], [72, 60], [54, 72], [34, 70], [18, 60], [0, 66], [-18, 60], [-34, 70], [-54, 72], [-72, 60], [-84, 30]]);
  o.push(P(barba, col.beard), P(smooth([[-93, 6], [-90, 44], [-76, 82], [-54, 114], [-28, 134], [0, 142], [-16, 100], [-44, 80], [-70, 50], [-86, 24]]), col.beardShadow, { opacity: 0.7 }), S(barba, col.beardLine, 2.2));
  for (let i = 0; i < 14; i++) o.push(S(`M${-64 + i * 10} ${100 + (i % 3) * 7}q3 7 1 13`, col.beardLight, 1.6, { opacity: 0.75 }));
  for (let i = 0; i < 9; i++) o.push(S(`M${-34 + i * 8.5} ${72 + (i % 2) * 3}q2 5 0 9`, col.beardLight, 1.4, { opacity: 0.7 }));
  o.push(S(cara, col.lf, 3.4));
  o.push(nariz(r, { sombra: false }));
  o.push(G(boca(c, r, e.boca, { barba: true }), { transform: `translate(0 ${r.ym})` }));
  // Gafas cuadradas de pasta marrón oscuro; el brillo tapa los ojos en la expresión seria.
  const glare = e.ojo === 'entornado' && !e.cejaI;
  const lente = (s) => {
    const d = rrect(0, 0, 33, 28, 9);
    const g = [P(d, '#f1eadb')];
    if (glare) {
      g.push(P(d, '#d3e2ee', { opacity: 0.55 }), P('M-34 -30L-6 -30L-34 -2Z', MARFIL), S('M-24 22L18 -28', MARFIL, 7), S('M-6 26L28 -20', MARFIL, 3.4));
    } else {
      g.push(G(ojo(c, { ...r, w: 38, h: 34 }, e.ojo, { sombraSup: false }), { transform: `translate(${s * 2} 0) ${s < 0 ? 'scale(-1 1)' : ''}` }));
      g.push(P(d, '#d3e2ee', { opacity: 0.16 }));
    }
    return G(g.join(''), { 'clip-path': c.clip(d) }) + S(d, col.frame, 8.5) + S('M-20 -25Q0 -28 16 -25', col.frameLight, 2.2, { opacity: 0.9 });
  };
  o.push(G(lente(1), { transform: `translate(${r.ex} 0)` }), G(lente(-1), { transform: `translate(${-r.ex} 0)` }));
  if (glare) o.push(...[1, -1].map((s) => G(S('M-18 -14L-4 -26', MARFIL, 3.4) + S('M12 20L22 10', MARFIL, 3), { transform: `translate(${s * r.ex} 0)` })));
  o.push(S('M-12 -12Q0 -17 12 -12', col.frame, 7), S('M-76 -10L-97 -18', col.frame, 6), S('M76 -10L97 -18', col.frame, 6));
  o.push(cejas(r, e));
  // Brillo de la calva (la luz de la calva del juego).
  o.push(P(ellipse(-20, -112, 42, 17, -0.22), col.skinLight), P(ellipse(-20, -114, 32, 10, -0.22), '#fff4ea'), P(ellipse(24, -120, 9, 4, -0.3), '#fff4ea'));
  o.push(brillo4(-86, -128, 22), brillo4(78, -122, 13));
  o.push(S('M-52 -126Q-30 -138 -4 -140', col.skinLine, 1.6, { opacity: 0.5 }));
  o.push(extras(r, e, { hairH: -150 }));
  return o.join('');
}

// ================================================================== GUILLE
/** Un hibisco rojo con sus pétalos sombreados, el centro amarillo y el estambre. */
export function flor(x, y, s, rot = 0) {
  const J = ROPA.guille;
  const o = [];
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * 72 * Math.PI) / 180;
    const pt = (px, py) => [x + (px * Math.cos(a) - py * Math.sin(a)) * s, y + (px * Math.sin(a) + py * Math.cos(a)) * s];
    const p = [pt(0, 0), pt(-9, -14), pt(-6, -28), pt(6, -30), pt(11, -14)];
    const d = smooth(p.map(([a1, b1], j) => [a1, b1, j === 0 ? 'c' : undefined]));
    o.push(P(d, J.flor), S(d, J.florSombra, 1.6 * s), S(`M${f(p[0][0])} ${f(p[0][1])}L${f(pt(0, -22)[0])} ${f(pt(0, -22)[1])}`, J.florSombra, 1.6 * s));
  }
  o.push(P(ellipse(x, y, 4.4 * s, 4.4 * s), J.centro), S(`M${f(x)} ${f(y)}l${f(10 * s)} ${f(-12 * s)}`, J.florSombra, 2 * s), P(ellipse(x + 10 * s, y - 12 * s, 2.4 * s, 2.4 * s), J.centro));
  return o.join('');
}
export function hoja(x, y, s, rot) {
  const J = ROPA.guille;
  const d = smooth([[0, 0, 'c'], [10, -10], [30, -12], [44, -2, 'c'], [30, 10], [10, 8]]);
  return G(P(d, J.hoja) + S('M2 0L40 -2', J.nervio, 1.8) + S(d, J.nervio, 1.2), { transform: `translate(${x} ${y}) rotate(${rot}) scale(${s})` });
}

const GUILLE_CASCO = smooth([[-92, 30, 'c'], [-106, -24], [-104, -88], [-78, -134], [-44, -158], [-6, -168], [34, -164], [70, -146], [96, -112], [108, -70], [100, 10, 'c'], [90, -14], [88, -54], [78, -84], [60, -98], [38, -92], [18, -106], [-4, -94], [-28, -108], [-52, -92], [-72, -98], [-86, -70], [-90, -30]]);
const GUILLE_MECHONES = [[-90, -50, -108, 14, 26, 0.12]];
const GUILLE_TRASERA = (s) => smooth([[s * 96, -50], [s * 106, 0], [s * 108, 40], [s * 102, 70, 'c'], [s * 98, 52, 'c'], [s * 92, 76, 'c'], [s * 88, 30]]);

function guille(c, e) {
  const r = R.guille;
  const col = r.col;
  const J = ROPA.guille;
  const o = [];
  // Pelo largo por detrás de las orejas, con las puntas desiguales.
  o.push(P(GUILLE_TRASERA(-1), col.hair), P(GUILLE_TRASERA(1), col.hair), S(GUILLE_TRASERA(-1), T, 3), S(GUILLE_TRASERA(1), T, 3));
  // Camisa hawaiana abierta: mostaza, solapas grandes y flores de hibisco con hojas, a lo bestia.
  const torso = smooth([[-260, 290], [-244, 200], [-150, 166], [-64, 152], [64, 152], [150, 166], [244, 200], [260, 290]]);
  o.push(P(torso, J.base), P(smooth([[-260, 290], [-244, 200], [-150, 166], [-110, 200], [-130, 290]]), J.shadow, { opacity: 0.8 }), S(torso, T, 3.2));
  const motivos = [];
  for (const [x, y, s, rot] of [[-130, 226, 1.45, 0.2], [-60, 270, 1.1, 1], [134, 222, 1.5, 0.5], [62, 270, 1.1, 0.1], [-196, 240, 1.2, 0.6], [200, 232, 1.2, 1.2]]) motivos.push(flor(x, y, s, rot));
  for (const [x, y, s, rot] of [[-176, 196, 1.3, 200], [-92, 250, 1.3, 30], [172, 200, 1.3, 20], [96, 252, 1.3, 150], [-230, 232, 1.2, 190], [226, 224, 1.3, 200]]) motivos.push(hoja(x, y, s, rot));
  o.push(G(motivos.join(''), { 'clip-path': c.clip(torso) }));
  o.push(cuello(col, 40, 92, 200));
  // Cuello de la camisa: dos solapas abiertas con flores.
  const solapa = (s) => {
    const d = smooth([[s * 40, 146, 'c'], [s * 104, 152, 'c'], [s * 130, 222, 'c'], [s * 62, 196, 'c']]);
    return [P(d, J.light), G(P(poly([[s * 20, 190], [s * 150, 190], [s * 150, 240], [s * 20, 240]]), J.base, { opacity: 0.7 }), { 'clip-path': c.clip(d) }), flor(s * 94, 190, 0.78, s * 0.6), S(d, T, 3.4)].join('');
  };
  o.push(solapa(-1), solapa(1));
  o.push(S('M-46 196L-40 290', T, 3.2, { opacity: 0.85 }), S('M46 196L40 290', T, 3.2, { opacity: 0.85 }));
  o.push(oreja(-90, 14, 11, 24, col, -1), oreja(90, 14, 11, 24, col, 1));
  // Cara larga con mandíbula marcada.
  const cara = simetrico(CARAS.guille);
  o.push(P(cara, col.skin), sombreadoCara(col, smooth([[-40, -90], [-90, -60], [-90, 30], [-82, 112], [-58, 136], [-36, 140], [-60, 60], [-62, -30]])));
  o.push(P(smooth([[-82, 112], [-58, 136], [-30, 146], [0, 148], [30, 146], [58, 136], [82, 112], [70, 124], [40, 138], [0, 140], [-40, 138], [-70, 124]]), col.skinShadow, { opacity: 0.9 }));
  // Sombra de barba: puntitos desde las patillas, el labio y la barbilla.
  const rnd = rng(23);
  for (let i = 0; i < 230; i++) {
    const x = (rnd() * 2 - 1) * 84;
    const y = 40 + rnd() * 108;
    const dentro = Math.abs(x) < 36 + (y - 40) * 0.5 && !(y < 70 && Math.abs(x) < 18) && y < 150 - Math.abs(x) * 0.18;
    const borde = Math.abs(x) > 56 && y < 130;
    if (dentro && (y > 100 || y < 82 || Math.abs(x) > 28 || borde)) o.push(P(ellipse(x, y, 1.2, 1.2), col.stubble, { opacity: 0.55 }));
  }
  o.push(S(cara, col.lf, 3.4));
  // La mandíbula marcada: dos trazos en las esquinas del maxilar.
  o.push(S('M-84 92Q-74 116 -52 136', col.skinDeep, 2.2, { opacity: 0.9 }), S('M84 92Q74 116 52 136', col.skinDeep, 2.2, { opacity: 0.9 }), S('M-66 70Q-60 84 -56 96', col.skinDeep, 1.6, { opacity: 0.7 }), S('M66 70Q60 84 56 96', col.skinDeep, 1.6, { opacity: 0.7 }));
  o.push(nariz(r));
  o.push(G(boca(c, r, e.boca, { barba: false }), { transform: `translate(0 ${r.ym})` }));
  o.push(ojos(c, r, e), cejas(r, e));
  // Pelo oscuro algo largo: masa ondulada y echada al lado, con mechones sueltos y un rizo sobre la frente.
  const rizo = mechon(8, -100, -22, -50, 26, -0.4);
  const rizo2 = mechon(36, -96, 24, -62, 18, -0.3);
  o.push(union([GUILLE_CASCO, ...GUILLE_MECHONES.map(([x, y, tx, ty, w, cu]) => mechon(x, y, tx, ty, w, cu)), rizo, rizo2], col.hair));
  o.push(P(smooth([[-100, 10], [-106, -24], [-104, -88], [-78, -134], [-60, -150], [-86, -100], [-92, -50], [-92, 0]]), col.hairShadow, { opacity: 0.9 }));
  o.push(S('M-76 -130Q-40 -158 6 -158', col.hairLight, 4.6), S('M26 -158Q64 -150 92 -118', col.hairLight, 3.8), S('M-100 -64Q-98 -96 -84 -118', col.hairLight, 2.8));
  o.push(S('M-44 -140Q-10 -150 30 -144', mezcla(col.hairLight, '#a89a96', 0.4), 2, { opacity: 0.8 }), S('M48 -136Q72 -132 86 -116', mezcla(col.hairLight, '#a89a96', 0.4), 1.8, { opacity: 0.8 }));
  o.push(S(mechonEje(8, -100, -22, -50, -0.4, 0.15, 0.8), col.hairLight, 2.6), S(mechonEje(36, -96, 24, -62, -0.3, 0.15, 0.8), col.hairLight, 2));
  o.push(extras(r, e, { hairH: -152 }));
  return o.join('');
}

// ================================================================== VERO
function vero(c, e) {
  const r = R.vero;
  const col = r.col;
  const J = ROPA.vero;
  const o = [];
  // Moño alto con goma (detrás de la cabeza).
  const monio = ellipse(6, -170, 32, 30);
  o.push(P(monio, col.hair), P(ellipse(-8, -160, 22, 20), col.hairShadow, { opacity: 0.8 }));
  o.push(S('M-16 -186Q4 -200 26 -186', col.hairLight, 3), S('M-22 -170Q4 -190 30 -170', col.hairLight, 2.2), S('M-10 -154Q8 -164 28 -156', col.hairLight, 2.2));
  o.push(S(monio, T, 3));
  // La goma del moño, granate.
  const goma = smooth([[-34, -146], [-30, -134], [0, -128], [38, -134], [44, -146], [20, -154], [-10, -154]]);
  o.push(P(goma, col.tie), S(goma, T, 3), S('M-20 -144Q4 -150 28 -144', col.tieLight, 2.4));
  // Camiseta azul noche, hombros estrechos.
  const torso = smooth([[-150, 270], [-134, 206], [-84, 170], [-42, 152], [42, 152], [84, 170], [134, 206], [150, 270]]);
  o.push(P(torso, J.base), P(smooth([[-150, 270], [-134, 206], [-84, 170], [-60, 196], [-90, 270]]), J.shadow), P(smooth([[134, 206], [84, 170], [100, 200], [122, 240], [150, 270], [128, 270]]), J.light, { opacity: 0.7 }), S(torso, T, 3));
  // Cuello moreno.
  o.push(cuello(col, 37, 96, 190));
  o.push(P(smooth([[-40, 152], [0, 200], [40, 152], [30, 150], [0, 176], [-30, 150]]), J.shadow), S('M-44 154Q0 200 44 154', T, 2.6));
  // Orejas (casi tapadas) y aros dorados.
  o.push(oreja(-84, 16, 9, 22, col, -1), oreja(84, 16, 9, 22, col, 1));
  for (const s of [-1, 1]) {
    o.push(S(ellipse(s * 90, 66, 14, 17), col.goldShadow, 8), S(ellipse(s * 90, 66, 14, 17), col.gold, 4), S(`M${s * 80} 56Q${s * 84} 52 ${s * 90} 51`, col.goldLight, 1.8));
  }
  // Cara ovalada de piel morena.
  const cara = simetrico(CARAS.vero);
  o.push(P(cara, col.skin));
  o.push(sombreadoCara(col, smooth([[-40, -90], [-86, -60], [-86, 30], [-70, 100], [-40, 126], [-30, 60], [-50, -20]]), false));
  o.push(P(smooth([[0, 100], [44, 120], [20, 134], [0, 138], [-20, 134], [-44, 120]]), col.skinShadow, { opacity: 0.8 }));
  // Luz del pómulo y de la frente.
  o.push(P(ellipse(52, 28, 22, 12, -0.5), col.skinLight, { opacity: 0.85 }), P(ellipse(-48, 30, 18, 10, 0.5), col.skinLight, { opacity: 0.45 }), P(ellipse(10, -80, 40, 10), col.skinLight, { opacity: 0.6 }), P(ellipse(0, 28, 7, 20), col.skinLight, { opacity: 0.5 }));
  o.push(S(cara, col.lf, 3.4));
  o.push(nariz(r));
  o.push(G(boca(c, r, e.boca, { barba: false }), { transform: `translate(0 ${r.ym})` }));
  // Labios llenos, vinotinto con brillos.
  o.push(G(labios(e), { transform: `translate(0 ${r.ym})` }));
  o.push(ojos(c, r, e), cejas(r, e));
  // Pelo recogido hacia atrás con entradas, raya fina y mechones sueltos.
  const pelo = smooth([[-86, -6, 'c'], [-94, -50], [-86, -94], [-56, -122], [0, -132], [56, -122], [86, -94], [94, -50], [86, -6, 'c'], [80, -34], [74, -64], [56, -90], [30, -104], [0, -102], [-30, -104], [-56, -90], [-74, -64], [-80, -34]]);
  o.push(P(pelo, col.hair));
  o.push(P(smooth([[-86, -6], [-94, -50], [-86, -94], [-56, -122], [-44, -108], [-74, -84], [-82, -44], [-80, -34]]), col.hairShadow, { opacity: 0.9 }));
  o.push(S('M-60 -108Q-30 -124 0 -122', col.hairLight, 4.4), S('M20 -122Q50 -118 70 -98', col.hairLight, 3.6), S('M-84 -60Q-82 -86 -70 -100', col.hairLight, 2.6));
  o.push(S(pelo, T, 3.2));
  o.push(S('M80 -40Q92 -10 86 30', col.hair, 4.4), S('M-80 -40Q-92 -10 -88 30', col.hair, 4.4), S('M80 -40Q92 -10 86 30', T, 0.01));
  o.push(extras(r, e, { hairH: -150 }));
  return o.join('');
}

function labios(e) {
  const col = R.vero.col;
  const t = e.boca;
  if (t === 'risa' || t === 'grito' || t === 'o' || t === 'burla') return '';
  const hw = R.vero.hw;
  const sonrie = t === 'picara' || t === 'torcida';
  const abajo = t === 'triste' ? -4 : 0;
  const sup = smooth([[-hw, 2 + abajo, 'c'], [-hw * 0.5, -8], [-hw * 0.18, -4], [0, -9], [hw * 0.18, -4], [hw * 0.5, -8], [hw, sonrie ? -8 : 2 + abajo, 'c'], [hw * 0.5, 4], [0, 3], [-hw * 0.5, 4]]);
  const inf = smooth([[-hw, 2 + abajo, 'c'], [-hw * 0.5, 4], [0, 3], [hw * 0.5, 4], [hw, sonrie ? -8 : 2 + abajo, 'c'], [hw * 0.6, 18], [0, 24], [-hw * 0.6, 18]]);
  return [
    P(inf, col.lip), P(sup, col.lipUp), S(inf, col.lipLine, 1.6, { opacity: 0.8 }), S(sup, col.lipLine, 1.6, { opacity: 0.8 }),
    P(ellipse(0, 15, hw * 0.4, 2.8), col.lipLight, { opacity: 0.9 }), P(ellipse(-hw * 0.4, -3, 6, 1.8, -0.2), col.lipLight, { opacity: 0.7 }), P(ellipse(hw * 0.4, -3, 5, 1.6, 0.2), col.lipLight, { opacity: 0.7 }),
    S(`M${-hw} ${2 + abajo}Q0 6 ${hw} ${sonrie ? -8 : 2 + abajo}`, col.lipLine, 2),
  ].join('');
}

// ================================================================== SOMBRA (la sombra de Pablo: azul noche con ojos de marfil)
function sombra(c, e, opc) {
  const r = R.pablo;
  const o = [];
  o.push(P(smooth([[-190, 270], [-168, 196], [-110, 164], [-50, 150], [50, 150], [110, 164], [168, 196], [190, 270]]), SOMBRA));
  o.push(P(cuelloForma(), SOMBRA));
  const cara = simetrico(CARAS.pablo);
  o.push(P(ellipse(-95, 14, 11, 24), SOMBRA), P(ellipse(95, 14, 11, 24), SOMBRA), S(ellipse(-95, 14, 11, 24), SOMBRA, 3));
  o.push(P(cara, SOMBRA), S(cara, SOMBRA, 3.4));
  o.push(pabloPelo(R.pablo.col, SOMBRA));
  // Un hilo de luz violeta en el borde de la silueta (para que el oscuro no se funda con el fondo).
  o.push(S(smooth([[-98, -50], [-92, -98], [-72, -122]], false), SOMBRA_LUZ, 2.2, { opacity: 0.9 }), S(smooth([[100, -50], [94, -96], [74, -120]], false), SOMBRA_LUZ, 2.2, { opacity: 0.9 }));
  o.push(S(smooth([[-190, 270], [-168, 196], [-110, 164]], false), SOMBRA_LUZ, 2.2, { opacity: 0.6 }), S(smooth([[190, 270], [168, 196], [110, 164]], false), SOMBRA_LUZ, 2.2, { opacity: 0.6 }));
  const estrecho = opc?.expr === 'seriedad';
  const eye = (s) => G(ojo(c, { ...r, w: 64, h: 60 }, 'sombra'), { transform: `translate(${s * 46} ${estrecho ? 6 : 0}) ${s < 0 ? 'scale(-1 1)' : ''} ${estrecho ? 'scale(1 0.62)' : ''}` });
  o.push(eye(1), eye(-1));
  if (!estrecho) o.push(G(boca(c, r, 'burla'), { transform: `translate(0 ${r.ym + 12}) scale(1.15 1)` }));
  return o.join('');
}

const cuelloForma = () => smooth([[-42, 90], [-44, 190], [44, 190], [42, 90]]);

// ------------------------------------------------------------------ API
const HACEDORES = { pablo, fran, chuchi, guille, vero, sombra };

/**
 * La cara de `quien` con la expresión `nombre`, en coordenadas de cara. `c` es el contexto SVG (defs). `k` (la
 * escala a la que se va a dibujar) ya no hace falta: el color es plano y no hay tramas que midan lo mismo en pantalla.
 */
export function cara(c, quien, nombre) {
  const e = expr(nombre);
  const hacer = HACEDORES[quien];
  if (!hacer) throw new Error(`manga: personaje desconocido «${quien}»`);
  return hacer(c, quien === 'sombra' ? { ...e, ojo: 'sombra', boca: 'burla' } : e, { expr: nombre });
}

/** Cajas (en coordenadas de cara) que encuadran cada tipo de viñeta de cada personaje: [x0, y0, x1, y1]. */
export const CAJAS = {
  pablo: { cara: [-140, -200, 140, 215], ojos: [-122, -78, 122, 24], boca: [-110, 46, 110, 150] },
  fran: { cara: [-146, -170, 146, 215], ojos: [-122, -74, 122, 24], boca: [-120, 40, 120, 190] },
  chuchi: { cara: [-140, -170, 140, 215], ojos: [-122, -84, 122, 34], boca: [-110, 44, 110, 150] },
  guille: { cara: [-150, -170, 150, 240], ojos: [-122, -76, 122, 26], boca: [-110, 46, 110, 160] },
  vero: { cara: [-140, -215, 140, 215], ojos: [-120, -82, 120, 24], boca: [-100, 50, 100, 140] },
  sombra: { cara: [-140, -205, 140, 215], ojos: [-122, -80, 122, 26], boca: [-110, 46, 110, 150] },
};
