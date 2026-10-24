// El mundo de los conceptos (capítulo 2, tramo final): el dibujo de todo lo que hay en él, como cadenas SVG
// puras. Nada de personas: los cuatro amigos son figuras abstractas que se reconocen por su color (sacado de
// la paleta `C` de cada uno) y un rasgo, y Vero es una boca dorada que lo envuelve todo. Los conceptos son
// objetos. El juego lo hornea una vez a bitmap (src/capitulos/conceptos-vivo.ts, docs/ESTILO.md T5.7) y solo
// lo mueve, lo gira y lo escala: aquí no hay animación.
//
// Las palabras («MAÑANA», «LA ÚLTIMA»...) no se dibujan aquí: están en src/textos/capitulo2.md y las pone el
// juego encima del bitmap con la letra de la página (un SVG como imagen no carga las fuentes web).
import { C as FRAN } from './personajes/fran.mjs';
import { C as PABLO } from './personajes/pablo.mjs';
import { C as CHUCHI } from './personajes/chuchi.mjs';
import { C as GUILLE } from './personajes/guille.mjs';
import { C as VERO } from './personajes/vero.mjs';
import { ellipse, path, shape, smooth, stroke } from './personajes/svg.mjs';

const NS = 'http://www.w3.org/2000/svg';
const f = (v) => +v.toFixed(1);
/** Un dibujo suelto con su caja (x, y, w, h en sus propias unidades). */
const lienzo = (x, y, w, h, body) => ({ x, y, w, h, svg: `<svg xmlns="${NS}" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${body}</svg>` });
const circulo = (cx, cy, r, fill, a = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${a}/>`;
const rect = (x, y, w, h, fill, rx = 0, a = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}" fill="${fill}"${a}/>`;
const linea = (d, color, w, a = {}) => stroke(d, color, w, a);

// ---------------------------------------------------------------- colores de cada uno (de sus paletas `C`)

/** Cada amigo con el color que lo delata, para que otros módulos (la escena, los cortes) pinten con él. */
export const COLORES = {
  fran: { principal: '#2e8a8c', claro: '#4fb0ae', hondo: '#154647', barba: FRAN.beard },
  pablo: { principal: PABLO.hair, claro: PABLO.hairLight, hondo: PABLO.hairShadow, aro: PABLO.earring, borrego: '#e8dcc4' },
  chuchi: { principal: CHUCHI.skin, claro: CHUCHI.skinLight, hondo: CHUCHI.skinLine, gafas: CHUCHI.frame, barba: CHUCHI.beard, sudadera: '#8a2a3a' },
  guille: { principal: '#e0a82e', claro: '#f5c95f', hondo: '#8a5a12', hibisco: '#c8433a', hoja: '#3f7a3c', pelo: GUILLE.hair },
  vero: { principal: VERO.gold, claro: VERO.goldLight, hondo: VERO.goldShadow, labios: '#86283a' },
};

// ---------------------------------------------------------------- los cuatro, hechos figura

/**
 * Fran: la jarra infinita. Verde azulada como su camiseta, con la espuma oscura de su barba desbordándose y
 * una cinta sin fin pintada en la panza. Se queda sin palabra: «UNA MÁS» se la pone el juego encima.
 */
export function jarraFran() {
  const c = COLORES.fran;
  const cuerpo = smooth([[-40, -52, 'c'], [40, -52, 'c'], [46, -10], [44, 40], [38, 62, 'c'], [-38, 62, 'c'], [-44, 40], [-46, -10]]);
  const asa = linea('M44 -34C84 -40 90 34 40 40', c.hondo, 13) + linea('M44 -34C84 -40 90 34 40 40', c.claro, 7);
  const espuma = smooth([
    [-52, -50], [-50, -70], [-34, -80], [-18, -72], [-2, -86], [18, -74], [36, -82], [52, -66], [54, -48],
    [48, -26, 'c'], [42, -36], [34, -14, 'c'], [26, -38], [14, -20, 'c'], [4, -40], [-8, -16, 'c'], [-18, -38], [-30, -8, 'c'], [-40, -34], [-50, -22, 'c'],
  ]);
  const burbujas = [[-18, 6, 5], [8, 22, 4], [-4, 44, 6], [22, 2, 3.5], [-26, 34, 3.5]].map(([x, y, r]) => circulo(x, y, r, '#ffffff', ' fill-opacity="0.35"')).join('');
  // La cinta sin fin: un ocho tumbado.
  const infinito = linea('M-24 12C-24 -6 -4 -6 0 12C4 30 24 30 24 12C24 -6 4 -6 0 12C-4 30 -24 30 -24 12', '#e9f6f4', 6, { opacity: 0.85 });
  const cuerpoSvg = shape(cuerpo, c.principal, [rect(-60, 36, 120, 40, '#1f6567'), rect(-44, -52, 16, 120, c.claro, 0, ' fill-opacity="0.55"'), burbujas, infinito], c.hondo, 3);
  const goteo = [-30, 6, 30].map((x, i) => path(ellipse(x, -22 + i * 3, 5, 14 + i * 2), c.barba)).join('');
  return lienzo(-70, -100, 170, 180, asa + cuerpoSvg + path(espuma, c.barba) + path(smooth([[-40, -66], [-20, -78], [0, -70], [-10, -62]]), '#4a3a32', { opacity: 0.7 }) + goteo);
}

/**
 * Pablo: la espiral del relato (el color de su pelo y su chaqueta de borreguillo). El aro del pendiente va
 * aparte para que gire a su aire alrededor.
 */
export function espiralPablo() {
  const c = COLORES.pablo;
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const a = t * Math.PI * 6.4;
    const r = 6 + t * 74;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const d = smooth(pts, false);
  // El borreguillo: rizos crema que salen del exterior de la espiral.
  const rizos = [0.86, 0.9, 0.94, 0.98, 0.78].map((t) => {
    const a = t * Math.PI * 6.4;
    const r = 6 + t * 74;
    return circulo(Math.cos(a) * (r + 7), Math.sin(a) * (r + 7), 7, c.borrego);
  });
  const cuerpo = linea(d, c.hondo, 20) + linea(d, c.principal, 14) + linea(d, c.claro, 4, { opacity: 0.8, transform: 'translate(-1.5,-1.5)' }) + rizos.join('') + circulo(0, 0, 9, '#2b2724') + circulo(-2, -2, 3, '#86603f');
  return lienzo(-96, -96, 192, 192, cuerpo);
}

/** El aro del pendiente de Pablo, plateado: gira alrededor de la espiral. */
export function aroPablo() {
  const c = COLORES.pablo;
  return lienzo(-34, -34, 68, 68, linea(ellipse(0, 0, 25, 25), '#8a909a', 9) + linea(ellipse(0, 0, 25, 25), c.aro, 5.5) + linea('M-18 -14C-10 -24 4 -26 12 -22', '#ffffff', 2.4, { opacity: 0.85 }));
}

/**
 * Chuchi: una bola calva y brillante con la sudadera granate en diagonal y, posadas torcidas en su borde, sus
 * gafas de pasta (como un objeto, no como una cara). La aguja del reloj (siempre llega tarde) va aparte, porque gira.
 */
export function circuloChuchi() {
  const c = COLORES.chuchi;
  const disco = ellipse(0, 0, 66, 66);
  const gafa = (x) => rect(x - 25, -22, 50, 42, 'none', 11, ` stroke="${c.gafas}" stroke-width="9"`) + rect(x - 21, -18, 42, 34, '#cfe6f0', 8, ' fill-opacity="0.38"');
  const cuerpo = shape(disco, c.principal, [
    path('M-80 18L80 -34L80 6L-80 62Z', c.sudadera),
    path(ellipse(-26, -40, 20, 9, -0.6), '#ffffff', { opacity: 0.8 }),
  ], c.hondo, 3);
  // Las gafas no van en «la cara»: se posan torcidas en el borde de la bola, como un objeto aparte.
  const gafas = `<g transform="translate(40 -46) rotate(-26) scale(0.82)"><path d="M-46 -8h92" stroke="${c.gafas}" stroke-width="5"/>${gafa(-26)}${gafa(26)}</g>`;
  return lienzo(-86, -96, 176, 176, cuerpo + gafas + circulo(-38, -38, 4, '#ffffff', ' fill-opacity="0.9"'));
}

/** La aguja del reloj de Chuchi, con su cabeza redonda, apuntando hacia arriba desde su centro. */
export function agujaChuchi() {
  const c = COLORES.chuchi;
  return lienzo(-12, -112, 24, 130, path(smooth([[-4, 8, 'c'], [4, 8, 'c'], [2, -92, 'c'], [0, -108, 'c'], [-2, -92, 'c']]), c.sudadera) + circulo(0, 0, 10, c.sudadera) + circulo(0, 0, 4, '#f6d9c8'));
}

/**
 * Guille: una flor, la más alta, con los colores de su camisa hawaiana: pétalos mostaza con hibiscos rojos y
 * hojas verdes. Los pétalos van por un lado y el tallo con sus hojas por otro, para que la cabeza gire.
 */
export function florGuille() {
  const c = COLORES.guille;
  const petalos = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    return `<g transform="rotate(${f((a * 180) / Math.PI)})">${shape(smooth([[0, -16, 'c'], [20, -46], [10, -86, 'c'], [-10, -86, 'c'], [-20, -46]]), i % 2 ? c.principal : c.claro, [circulo(0, -62, 7, c.hibisco), circulo(-4, -72, 2.6, '#fff1b8')], c.hondo, 2.6)}</g>`;
  });
  const hibisco = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2;
    return path(ellipse(Math.cos(a) * 11, Math.sin(a) * 11, 10, 6, a), c.hibisco);
  });
  return lienzo(-96, -96, 192, 192, petalos.join('') + circulo(0, 0, 25, c.hondo) + circulo(0, 0, 21, '#6a3a16') + hibisco.join('') + circulo(0, 0, 6, '#fff1b8'));
}

/** El tallo largo de Guille con sus dos hojas estampadas (el más alto). */
export function talloGuille() {
  const c = COLORES.guille;
  const hoja = (s) => `<g transform="scale(${s} 1)">${shape(smooth([[0, 0, 'c'], [46, -30], [86, -10, 'c'], [48, 22]]), c.hoja, [circulo(40, -4, 6, c.hibisco), circulo(62, -8, 4, c.principal)], '#26532a', 2.4)}</g>`;
  return lienzo(-100, 0, 200, 270, linea('M0 0C-8 90 8 170 0 262', '#26532a', 16) + linea('M0 0C-8 90 8 170 0 262', c.hoja, 10) + `<g transform="translate(0 110)">${hoja(1)}</g><g transform="translate(0 176)">${hoja(-1)}</g>`);
}

/** La boca de Vero, dorada: el labio de abajo (sonrisa que sube por los lados, con aros en las comisuras). */
export function labioInferior(ancho) {
  const c = COLORES.vero;
  const w = ancho;
  const d = `M-80 40C${w * 0.18} -60 ${w * 0.38} -90 ${w / 2} -92C${w * 0.62} -90 ${w * 0.82} -60 ${w + 80} 40V260H-80Z`;
  const cuerpo = shape(d, c.principal, [
    path(`M${w * 0.1} 120C${w * 0.3} 20 ${w * 0.4} 10 ${w / 2} 10C${w * 0.6} 10 ${w * 0.7} 20 ${w * 0.9} 120V260H${w * 0.1}Z`, c.hondo, { opacity: 0.45 }),
    path(`M${w * 0.3} -30C${w * 0.4} -62 ${w * 0.6} -62 ${w * 0.7} -30C${w * 0.6} -46 ${w * 0.4} -46 ${w * 0.3} -30Z`, c.claro, { opacity: 0.9 }),
  ], c.hondo, 5);
  // Aros dorados en las comisuras.
  const aros = [30, w - 30].map((x) => linea(ellipse(x, 58, 20, 28), c.hondo, 9) + linea(ellipse(x, 58, 20, 28), c.principal, 5.5)).join('');
  return lienzo(-100, -100, w + 200, 380, cuerpo + aros);
}

/** El labio de arriba, dorado, cortado por el borde de la pantalla. */
export function labioSuperior(ancho) {
  const c = COLORES.vero;
  const w = ancho;
  const d = `M-80 -260V30C${w * 0.2} 110 ${w * 0.36} 120 ${w * 0.44} 94Q${w / 2} 128 ${w * 0.56} 94C${w * 0.64} 120 ${w * 0.8} 110 ${w + 80} 30V-260Z`;
  return lienzo(-100, -270, w + 200, 430, shape(d, c.principal, [
    path(`M${w * 0.08} -260V-20C${w * 0.3} 40 ${w * 0.44} 50 ${w / 2} 40C${w * 0.56} 50 ${w * 0.7} 40 ${w * 0.92} -20V-260Z`, c.hondo, { opacity: 0.4 }),
    path(`M${w * 0.34} 66C${w * 0.42} 80 ${w * 0.58} 80 ${w * 0.66} 66C${w * 0.58} 74 ${w * 0.42} 74 ${w * 0.34} 66Z`, c.claro, { opacity: 0.85 }),
  ], c.hondo, 5));
}

// ---------------------------------------------------------------- los conceptos, hechos objeto

/** MAÑANA: una puerta que no se abre, con su sol pintado encima y tres cerrojos. */
export function puertaManana() {
  const dorado = '#d9a63a';
  const sol = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI + (i / 8) * Math.PI;
    return linea(`M${f(Math.cos(a) * 36)} ${f(-128 + Math.sin(a) * 36)}L${f(Math.cos(a) * 52)} ${f(-128 + Math.sin(a) * 52)}`, dorado, 6);
  });
  const hoja = shape('M-60 -110H60V160H-60Z', '#4a6a92', [
    ...[[-46, -96], [4, -96], [-46, -20], [4, -20]].map(([x, y]) => rect(x, y, 42, y < -50 ? 62 : 150, '#3a5678', 4)),
    rect(-60, 150, 120, 10, '#2c4260'),
  ], '#223650', 4);
  return lienzo(-76, -190, 152, 360, rect(-72, -118, 144, 282, '#7a5a3a', 6) + hoja + sol.join('') + path('M-36 -128a36 36 0 0 1 72 0Z', dorado)
    + circulo(40, 28, 9, '#e3b445', ' stroke="#8a5a12" stroke-width="3"') + [-70, 20, 100].map((y) => rect(-60, y, 26, 12, '#9aa0a8', 3)).join('') + rect(-44, 96, 16, 22, '#c8433a', 3));
}

/** CASA: la casita de siempre, siempre lejos (con su ventana encendida). */
export function casa() {
  return lienzo(-60, -56, 120, 112, shape(smooth([[-40, -4, 'c'], [-40, 40, 'c'], [40, 40, 'c'], [40, -4, 'c']]), '#e8d6b0', [rect(-42, 30, 84, 12, '#c8b48a')], '#8a7a56', 3)
    + shape(smooth([[-52, -2, 'c'], [0, -46, 'c'], [52, -2, 'c']]), '#c8433a', [rect(-54, -6, 108, 6, '#8e2c36')], '#6e1c17', 3)
    + rect(-8, 8, 18, 32, '#8a5a30', 3) + rect(-34, 4, 16, 16, '#ffd27a', 2) + rect(18, 4, 16, 16, '#ffd27a', 2) + rect(14, -42, 10, 18, '#a8956c', 1));
}

/** LA PENÚLTIMA: una jarra ámbar que se rellena sola, con la flecha de la cerveza que vuelve a entrar. */
export function jarraPenultima() {
  const ambar = '#d8932a';
  const cuerpo = smooth([[-34, -46, 'c'], [34, -46, 'c'], [38, 6], [36, 54, 'c'], [-36, 54, 'c'], [-38, 6]]);
  return lienzo(-70, -112, 150, 180,
    linea('M36 -30C74 -34 80 30 34 36', '#8a5a14', 12) + linea('M36 -30C74 -34 80 30 34 36', '#f1c04a', 6)
    + shape(cuerpo, ambar, [rect(-50, 24, 100, 40, '#a8661c'), rect(-34, -46, 14, 110, '#ffd27a', 0, ' fill-opacity="0.5"'), ...[[-10, 0], [12, 22], [-6, 36]].map(([x, y]) => circulo(x, y, 4, '#fff1b8', ' fill-opacity="0.6"'))], '#7a4c10', 3)
    + path(smooth([[-40, -46], [-34, -62], [-14, -58], [2, -70], [22, -60], [38, -66], [40, -46]]), '#fff6e0')
    // La cerveza que sale por arriba, da la vuelta y vuelve a entrar.
    + linea('M-6 -78C-50 -126 60 -126 14 -80', '#f1c04a', 7, { 'stroke-dasharray': '3 11' }) + path('M6 -86L20 -78L4 -72Z', '#f1c04a'));
}

/** EL TRABAJO: una montaña de papeles con un clip, un sobre con su aviso rojo y la corbata de alguien. */
export function trabajo() {
  const hoja = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})">${rect(-36, -46, 72, 92, '#f4efe4', 3, ' stroke="#9a927e" stroke-width="2.5"')}${[-28, -16, -4, 8, 20].map((l) => rect(-26, l, 52, 4, '#b8b09c', 1)).join('')}</g>`;
  return lienzo(-84, -84, 168, 170, hoja(-24, 6, -14) + hoja(24, 4, 12) + hoja(0, -6, 0)
    + shape('M-34 22H34V70H-34Z', '#e8dcc0', [path('M-34 22L0 52L34 22Z', '#cbbd9c')], '#8a7a56', 3)
    + linea('M-18 -50C-18 -64 0 -64 0 -50V-14', '#9aa0a8', 5) + circulo(40, 20, 19, '#d6403a', ' stroke="#8e1c18" stroke-width="3"') + rect(38, 8, 4, 16, '#ffffff', 1) + circulo(40, 29, 2.4, '#ffffff'));
}

/** El reloj derretido, colgado de una rama y goteando por los dos lados. */
export function relojDerretido() {
  const cara = smooth([[-62, -20], [-44, -58], [4, -64], [46, -50], [66, -6], [60, 34], [64, 80, 'c'], [48, 60], [38, 100, 'c'], [24, 60], [4, 76], [-14, 52], [-30, 92, 'c'], [-44, 52], [-62, 62, 'c'], [-66, 20]]);
  return lienzo(-96, -92, 192, 190,
    rect(-96, -86, 192, 14, '#5a4a3a', 6) + linea('M-60 -76C-70 -60 -60 -44 -50 -44', '#5a4a3a', 8)
    + shape(cara, '#f0e6c8', [path(smooth([[-62, -20], [-44, -58], [4, -64], [46, -50], [66, -6], [30, -20], [-20, -30]]), '#ffffff', { opacity: 0.55 }), path(smooth([[-66, 30], [-40, 20], [0, 36], [40, 20], [62, 34], [62, 80], [-60, 70]]), '#d4c394')], '#a8761c', 4)
    + circulo(0, -4, 4, '#5a2020') + linea('M0 -4L-3 -40', '#5a2020', 5) + linea('M0 -4L26 8', '#5a2020', 5)
    + [-1, 0, 1, 2].map((i) => i * 30 - 6).map((x) => `<g transform="translate(${x} -34)">${circulo(0, 0, 3, '#5a2020')}</g>`).join(''));
}

/** El «NO» que rebota: dos letras gordas dibujadas con trazos (la ene y la o), rojo ladrillo con su sombra. */
export function noRebota() {
  const trazos = (color, w, dx = 0, dy = 0) =>
    `<g transform="translate(${dx} ${dy})">${linea('M-70 40V-40L-22 40V-40', color, w)}${linea(ellipse(34, 0, 28, 40), color, w)}</g>`;
  return lienzo(-96, -72, 192, 150, trazos('#5a1010', 26, 6, 8) + trazos('#fff1e0', 26) + trazos('#d6403a', 17));
}

/** LA ÚLTIMA: la jarra que nadie ha visto nunca, solo su contorno a trazos y una luz blanca dentro. */
export function jarraUltima() {
  const cuerpo = smooth([[-40, -52, 'c'], [40, -52, 'c'], [46, 6], [42, 62, 'c'], [-42, 62, 'c'], [-46, 6]]);
  return lienzo(-86, -96, 190, 190,
    path(ellipse(0, 4, 74, 84), '#ffffff', { opacity: 0.08 })
    + path(cuerpo, '#ffffff', { opacity: 0.12 })
    + linea(cuerpo, '#fff6e0', 6, { 'stroke-dasharray': '2 13' })
    + linea('M44 -34C86 -40 92 34 42 40', '#fff6e0', 6, { 'stroke-dasharray': '2 13' })
    + linea('M-36 -52C-30 -78 -8 -70 0 -84C12 -70 34 -78 38 -52', '#fff6e0', 6, { 'stroke-dasharray': '2 13' }));
}

// ---------------------------------------------------------------- el userito, solo su sombra

/** Una curva suave por unos puntos, muestreada: [{ x, y, nx, ny, t }] con la normal (hacia la derecha de la marcha). */
function muestrear(pts, n) {
  const P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  const sal = [];
  for (let k = 0; k <= n; k++) {
    const u = (k / n) * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(u));
    const s = u - i;
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * s + (2 * a - 5 * b + 4 * c2 - d) * s * s + (-a + 3 * b - 3 * c2 + d) * s * s * s);
    const d = (a, b, c2, dd) => 0.5 * ((-a + c2) + 2 * (2 * a - 5 * b + 4 * c2 - dd) * s + 3 * (-a + 3 * b - 3 * c2 + dd) * s * s);
    const x = c(p0[0], p1[0], p2[0], p3[0]);
    const y = c(p0[1], p1[1], p2[1], p3[1]);
    const tx = d(p0[0], p1[0], p2[0], p3[0]);
    const ty = d(p0[1], p1[1], p2[1], p3[1]);
    const l = Math.hypot(tx, ty) || 1;
    sal.push({ x, y, nx: -ty / l, ny: tx / l, t: k / n, r: p1[2] + (p2[2] - p1[2]) * s });
  }
  return sal;
}

/**
 * La silueta ENORME del userito mitológico (el dinosaurio del caos): llena toda la pantalla por detrás de todo.
 * De perfil mirando a la izquierda: cabeza arriba con la boca abierta y un ojo que brilla, un cuello larguísimo en
 * S, el lomo con sus placas, cuatro patas y una cola que se sale por la derecha. Silueta oscura con contorno de luz.
 * Mide 2 300 × 1 080 (centrada en x = 0, como la pantalla), así que se pinta en unidades de escena.
 */
export function dinosaurio() {
  const sombra = '#0d0716';
  const lejos = '#1c1030';
  const luz = '#b98cff';
  const resplandor = '#7a4cff';
  /** El cuerpo, la cola y las patas se corren a la derecha: el cuello sale de sus hombros. */
  const DX = 190;
  // ---- El cuello: una cadena de círculos a lo largo de una curva que se afina hasta la cabeza.
  const eje = muestrear(
    [
      [210, 860, 135],
      [160, 750, 94],
      [100, 640, 68],
      [30, 540, 54],
      [-50, 455, 46],
      [-140, 390, 42],
      [-240, 348, 40],
      [-320, 335, 40],
    ],
    28,
  );
  const cuello = eje.map((p) => ({ x: p.x, y: p.y, r: p.r }));
  // ---- El cuerpo, la cola y las patas.
  const cuerpo = smooth([[-200, 810], [-150, 690], [-40, 625], [120, 590], [300, 592], [480, 630], [640, 706], [706, 810], [640, 930], [480, 1020], [260, 1060], [40, 1050], [-110, 985]]);
  const cola = smooth([[600, 690, 'c'], [700, 700], [830, 722], [970, 704], [1110, 650], [1260, 590, 'c'], [1130, 700], [980, 790], [830, 850], [700, 905], [610, 930, 'c']], true, 0.9);
  const pata = (x, ancho, y0 = 880) => smooth([[x - ancho / 2, y0, 'c'], [x + ancho / 2, y0, 'c'], [x + ancho / 2 + 6, 1090], [x - ancho / 2 - 6, 1090]]);
  const patasLejos = [pata(10, 130), pata(500, 150)];
  const patasCerca = [pata(-80, 150), pata(380, 160)];
  // ---- La cabeza (arriba) y la mandíbula de abajo, abierta, con sus dientes.
  const cabeza = smooth([
    [-340, 292], [-420, 262], [-520, 256], [-612, 278], [-700, 318], [-775, 356, 'c'], [-792, 392], [-762, 418], [-690, 428], [-600, 398], [-500, 384], [-400, 376], [-338, 370],
  ]);
  const mandibula = smooth([[-372, 388, 'c'], [-440, 448], [-548, 506], [-655, 530], [-722, 512], [-706, 478], [-615, 452], [-525, 418], [-440, 396]], true, 0.9);
  const dientes = (xs, y, dir, h) => xs.map((x) => `<path d="M${x - 11} ${y}L${x} ${y + dir * h}L${x + 11} ${y}Z"/>`).join('');
  const dientesArriba = dientes([-740, -700, -655, -610, -565, -520], 420, 1, 40);
  const dientesAbajo = dientes([-690, -645, -600, -555], 478, -1, 36);
  // ---- Las placas del lomo: rombos que se levantan del cuello, del lomo y de la cola.
  const placa = (x, y, nx, ny, alto, ancho) => {
    const ox = x - nx * 26;
    const oy = y - ny * 26;
    const tx = -ny;
    const ty = nx;
    const pts = [
      [ox - tx * ancho, oy - ty * ancho],
      [x + nx * alto * 0.5 - tx * ancho * 0.9, y + ny * alto * 0.5 - ty * ancho * 0.9],
      [x + nx * alto, y + ny * alto],
      [x + nx * alto * 0.5 + tx * ancho * 0.9, y + ny * alto * 0.5 + ty * ancho * 0.9],
      [ox + tx * ancho, oy + ty * ancho],
    ];
    return 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L') + 'Z';
  };
  const placas = [];
  // Cuello: del lado de atrás (la derecha del recorrido), cada vez más pequeñas hacia la cabeza.
  eje.forEach((p, i) => {
    if (i < 3 || i % 3 !== 0 || p.t > 0.92) return;
    const s = 1; // la normal de la curva mira hacia atrás (la derecha del cuello)
    placas.push({ d: placa(p.x + s * p.nx * (p.r - 4), p.y + s * p.ny * (p.r - 4), s * p.nx, s * p.ny, 46 + (1 - p.t) * 60, 26 + (1 - p.t) * 14), dx: 0 });
  });
  // Lomo y cola.
  const lomo = muestrear([[-110, 655, 0], [10, 612, 0], [130, 588, 0], [250, 586, 0], [370, 600, 0], [480, 630, 0], [585, 676, 0], [690, 706, 0], [800, 716, 0], [930, 706, 0], [1070, 666, 0], [1190, 622, 0]], 19);
  lomo.forEach((p, i) => {
    if (i % 2 === 1 && i > 0) return;
    const m = 1 - Math.abs(p.t - 0.32) * 1.5;
    const alto = 70 + Math.max(0, m) * 95;
    // La normal de `muestrear` apunta hacia abajo en un recorrido de izquierda a derecha: se invierte.
    placas.push({ d: placa(p.x, p.y, -p.nx, -p.ny, alto * (p.t > 0.7 ? 0.7 : 1), 30 + Math.max(0, m) * 16), dx: DX });
  });
  // ---- Todo junto: primero resplandor y contorno de luz de cada pieza, encima las siluetas.
  const piezas = [
    ...patasLejos.map((d) => ({ d, f: lejos, dx: DX })),
    { d: cola, f: sombra, dx: DX },
    { d: cuerpo, f: sombra, dx: DX },
    ...placas.map((p) => ({ d: p.d, f: sombra, dx: p.dx })),
    ...patasCerca.map((d) => ({ d, f: sombra, dx: DX })),
    { d: cabeza, f: sombra, dx: 0 },
    { d: mandibula, f: sombra, dx: 0 },
  ];
  const circulos = cuello.map((c) => ({ c }));
  const trazo = (w, color, op) => ` stroke="${color}" stroke-width="${w}" stroke-opacity="${op}" stroke-linejoin="round"`;
  const halo = (w, color, op) =>
    piezas.map((p) => `<path d="${p.d}" transform="translate(${p.dx} 0)" fill="${color}"${trazo(w, color, op)}/>`).join('') +
    circulos.map(({ c }) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.r.toFixed(1)}" fill="${color}"${trazo(w, color, op)}/>`).join('') +
    `<g fill="${color}"${trazo(w, color, op)}>${dientesArriba}${dientesAbajo}</g>`;
  const relleno =
    piezas.map((p) => `<path d="${p.d}" transform="translate(${p.dx} 0)" fill="${p.f}"/>`).join('') +
    circulos.map(({ c }) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.r.toFixed(1)}" fill="${sombra}"/>`).join('') +
    `<g fill="${sombra}">${dientesArriba}${dientesAbajo}</g>`;
  // El orden importa: las patas del lado lejano van un poco más claras y la cabeza tapa el final del cuello.
  const cabezaRelleno = path(cabeza, sombra) + path(mandibula, sombra) + `<g fill="${sombra}">${dientesArriba}${dientesAbajo}</g>`;
  const ojo = circulo(-520, 306, 19, '#fff0b0') + `<ellipse cx="-526" cy="306" rx="6" ry="15" fill="#2a0a3a"/>` + circulo(-514, 298, 4.5, '#ffffff');
  const fosa = `<ellipse cx="-742" cy="360" rx="9" ry="6" fill="${luz}" fill-opacity="0.55"/>`;
  const cuerpoSvg = halo(46, resplandor, 0.22) + halo(34, resplandor, 0.35) + halo(17, luz, 1) + relleno + cabezaRelleno + ojo + fosa;
  return lienzo(-1150, 0, 2300, 1080, `<g transform="translate(0 100)">${cuerpoSvg}</g>`);
}

// ---------------------------------------------------------------- formas que flotan

export const FORMAS = ['circulo', 'anillo', 'triangulo', 'cuadrado', 'media', 'zigzag', 'rayas', 'estrella', 'cruz'];

/** Una forma abstracta de fondo en un color (se hornea una por tipo y se reutiliza a distintos tamaños y giros). */
export function forma(tipo, color, oscuro = '#1a1222') {
  const lw = 7;
  const cuerpos = {
    circulo: circulo(0, 0, 44, color) + circulo(-14, -14, 12, '#ffffff', ' fill-opacity="0.35"'),
    anillo: linea(ellipse(0, 0, 36, 36), color, 17),
    triangulo: path('M0 -48L46 36H-46Z', color, { stroke: oscuro, 'stroke-width': lw, 'stroke-linejoin': 'round', 'stroke-opacity': 0.35 }),
    cuadrado: rect(-36, -36, 72, 72, color, 6) + rect(-36, -36, 72, 18, '#ffffff', 6, ' fill-opacity="0.22"'),
    media: path('M-46 20A46 46 0 0 1 46 20Z', color) + path('M-30 20A30 30 0 0 1 30 20Z', oscuro, { opacity: 0.25 }),
    zigzag: linea('M-44 18L-22 -18L0 18L22 -18L44 18', color, 13),
    rayas: [-30, -10, 10, 30].map((y) => rect(-44, y - 5, 88, 10, color, 5)).join(''),
    estrella: path('M0 -50L12 -16L48 -14L20 8L30 44L0 24L-30 44L-20 8L-48 -14L-12 -16Z', color),
    cruz: rect(-14, -46, 28, 92, color, 7) + rect(-46, -14, 92, 28, color, 7),
  };
  return lienzo(-56, -56, 112, 112, cuerpos[tipo]);
}
