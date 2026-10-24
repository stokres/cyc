// Las manos del manga a color del capítulo 2, una por personaje, con su gesto y su manga de camisa:
//   Pablo  · las palmas abiertas, suplicando (manga de borreguillo)
//   Fran   · el puño cerrado, enfadado (camiseta verde azulada)
//   Chuchi · el dedo índice en alto, «técnicamente...» (sudadera granate)
//   Guille · el pulgar arriba (camisa hawaiana de flores)
//   Vero   · una caña bien tirada (camiseta azul noche)
// Color plano con sombra (cel shading) y los colores de piel y ropa de cada uno (los de manga-cara.mjs), en
// coordenadas de mano: las muñecas abajo (y ≈ 150), los dedos arriba. Cadenas SVG.
import { smooth, ellipse, f, P, S, G, T, MARFIL, mezcla, ORO_OSC, LADRILLO, sudor } from './manga-comun.mjs';
import { PAL, ROPA, flor, hoja } from './manga-cara.mjs';

/** Un dedo (o un tubo): trazo grueso con borde de la línea de la piel y relleno del color de la piel. */
const tubo = (pts, w, col, relleno = col.skin, borde = 3.6) => {
  const d = pts.length === 2 ? `M${f(pts[0][0])} ${f(pts[0][1])}L${f(pts[1][0])} ${f(pts[1][1])}` : smooth(pts, false);
  return S(d, col.lf, w + borde * 2) + S(d, relleno, w);
};
/** La sombra a un lado del dedo (el izquierdo, como en las caras) y un hilo de luz en el otro. */
const sombraTubo = (pts, w, col) => {
  const mover = (dx) => (pts.length === 2 ? `M${f(pts[0][0] + dx)} ${f(pts[0][1])}L${f(pts[1][0] + dx)} ${f(pts[1][1])}` : smooth(pts.map(([x, y]) => [x + dx, y]), false));
  return S(mover(-w * 0.26), col.skinShadow, w * 0.42) + S(mover(w * 0.25), col.skinLight, w * 0.16, { opacity: 0.8 });
};
const pliegue = (x, y, w, col) => S(`M${f(x - w * 0.32)} ${f(y)}Q${f(x)} ${f(y + 3)} ${f(x + w * 0.32)} ${f(y)}`, col.lf, 1.6);

/** Borde de nube (puño de borreguillo): tramos abombados hacia fuera. */
function festones(x0, x1, y, n, r) {
  const o = [];
  for (let i = 0; i < n; i++) o.push(ellipse(x0 + ((i + 0.5) * (x1 - x0)) / n, y, ((x1 - x0) / n) * 0.62, r));
  return o;
}

// ------------------------------------------------------------------ Pablo: palmas abiertas
function palma(c, col, dx, dy, lejos) {
  const o = [];
  const w = 23;
  const dedos = [
    [[-34, 20], [-37, -50], [-38, -112]],
    [[-12, 16], [-13, -62], [-12, -132]],
    [[12, 18], [14, -56], [17, -120]],
    [[34, 30], [38, -30], [42, -86]],
  ];
  const piel = lejos ? mezcla(col.skin, col.skinShadow, 0.5) : col.skin;
  for (const d of dedos) o.push(tubo(d, w, col, piel));
  // Pulgar hacia la izquierda.
  o.push(tubo([[-48, 100], [-80, 52], [-96, 0]], 26, col, piel));
  const palmaD = smooth([[-52, 6, 'c'], [54, 12, 'c'], [58, 74], [46, 128], [18, 156], [-18, 156], [-46, 128], [-56, 74]]);
  o.push(P(palmaD, piel));
  if (!lejos) for (const d of dedos) o.push(sombraTubo(d, w, col));
  else for (const d of dedos) o.push(S(smooth(d.map(([x, y]) => [x - w * 0.26, y]), false), col.skinShadow, w * 0.4));
  o.push(P(smooth([[-52, 6, 'c'], [-30, 10, 'c'], [-30, 100], [-18, 150], [-46, 128], [-56, 74]]), col.skinShadow, { opacity: 0.7 }));
  // Pliegues de los dedos y líneas de la palma.
  for (const d of dedos) {
    o.push(pliegue(d[1][0], d[1][1] + 6, w, col), pliegue(d[1][0], d[1][1] - 38, w, col));
  }
  o.push(S('M-44 84Q-14 70 10 40', col.skinDeep, 2), S('M-36 104Q-6 98 30 70', col.skinDeep, 2), S('M40 60Q20 90 10 118', col.skinDeep, 1.8));
  o.push(S(smooth([[-52, 6], [-56, 74], [-46, 128], [-18, 156]], false), col.lf, 3), S(smooth([[54, 12], [58, 74], [46, 128], [18, 156]], false), col.lf, 3));
  return G(o.join(''), { transform: `translate(${dx} ${dy})` });
}

function pablo(c) {
  const col = PAL.pablo;
  const J = ROPA.pablo;
  const o = [];
  // Manga de la chaqueta de borreguillo con el puño de nube.
  o.push(P(smooth([[-210, 300], [-120, 172], [-62, 150], [62, 150], [120, 172], [210, 300]]), J.base));
  o.push(palma(c, col, 30, -14, true));
  o.push(palma(c, col, -4, 8, false));
  const fest = festones(-84, 84, 168, 6, 20);
  const puno = smooth([[-86, 168], [86, 168], [96, 250], [-96, 250]]);
  const linea = mezcla(J.forroSombra, T, 0.6);
  fest.forEach((d) => (o.push(P(d, J.forro)), o.push(S(d, linea, 2.6))));
  o.push(P(puno, J.forro), P(smooth([[-86, 168], [-40, 168], [-50, 250], [-96, 250]]), J.forroSombra, { opacity: 0.8 }));
  fest.forEach((d) => o.push(P(d, J.forro), S(d, linea, 2.6)));
  o.push(S('M-86 168L-96 250', linea, 2.6), S('M86 168L96 250', linea, 2.6));
  // Gotas de sudor.
  o.push(sudor(-122, -60, 1.1, -10), sudor(130, -30, 0.9, 10));
  return o.join('');
}

// ------------------------------------------------------------------ puño y pulgar
/** Un puño visto de frente: cuatro dedos doblados como barras y el pulgar cruzado (o levantado si `arriba`). */
function puno(c, col, { arriba = false } = {}) {
  const o = [];
  if (arriba) {
    // Pulgar en alto, por detrás de los dedos.
    const pu = [[-46, -30], [-50, -110], [-48, -160]];
    o.push(tubo(pu, 36, col));
    o.push(sombraTubo(pu, 36, col));
    o.push(P(smooth([[-62, -156], [-48, -186], [-34, -156], [-48, -140]]), col.skinLight), S(smooth([[-62, -156], [-48, -186], [-34, -156], [-48, -140]]), col.lf, 2.4));
    o.push(S('M-60 -100Q-48 -92 -34 -100', col.lf, 1.8), S('M-60 -62Q-48 -54 -34 -62', col.lf, 1.6, { opacity: 0.8 }));
  }
  // Palma detrás (el borde del puño) y cuatro dedos doblados, de arriba abajo.
  const base = smooth([[-66, -50], [66, -50], [74, 40], [60, 80], [-60, 80], [-74, 40]]);
  o.push(P(base, col.skinDeep), S(base, col.lf, 3));
  for (let i = 0; i < 4; i++) {
    const y = -44 + i * 30;
    const dedo = [[-50 + i * 2, y], [0, y - 3], [50 - i * 2, y]];
    o.push(tubo(dedo, 34, col, col.skin, 3.4));
    o.push(S(`M${-50 + i * 2} ${y + 8}L${50 - i * 2} ${y + 8}`, col.skinShadow, 9, { opacity: 0.9 }), S(`M${-46 + i * 2} ${y - 9}L${46 - i * 2} ${y - 9}`, col.skinLight, 4, { opacity: 0.8 }));
    o.push(S(`M${-40 + i * 2} ${y - 12}q2 8 -1 16`, col.lf, 1.4, { opacity: 0.6 }), S(`M${38 - i * 2} ${y - 12}q-2 8 1 16`, col.lf, 1.4, { opacity: 0.6 }));
  }
  // Lado en sombra del puño.
  o.push(P(smooth([[-74, 20], [-62, 78], [-34, 82], [-48, 40]]), col.skinShadow, { opacity: 0.8 }));
  if (!arriba) {
    // Pulgar cruzado por delante, con su uña.
    const pu = [[-64, 74], [-16, 64], [40, 58]];
    o.push(tubo(pu, 32, col));
    o.push(sombraTubo(pu, 32, col));
    o.push(S('M-22 52Q-14 58 -6 52', col.lf, 1.6));
  }
  return o.join('');
}

// ------------------------------------------------------------------ Fran: puño
function fran(c) {
  const col = PAL.fran;
  const J = ROPA.fran;
  const o = [];
  // Antebrazo ancho y la manga corta de la camiseta verde azulada.
  const brazo = smooth([[-60, 60], [60, 60], [74, 200], [-74, 200]]);
  o.push(P(brazo, col.skin), P(smooth([[-60, 60], [-30, 60], [-40, 200], [-74, 200]]), col.skinShadow, { opacity: 0.8 }), S('M-60 60L-74 200', col.lf, 3.2), S('M60 60L74 200', col.lf, 3.2));
  for (let i = 0; i < 34; i++) o.push(S(`M${-52 + ((i * 37) % 104)} ${80 + ((i * 53) % 100)}l4 -3`, col.hair, 1.5, { opacity: 0.55 }));
  const manga = smooth([[-96, 180], [96, 180], [124, 300], [-124, 300]]);
  o.push(P(manga, J.base), P(smooth([[-96, 180], [-60, 180], [-70, 300], [-124, 300]]), J.shadow), P(smooth([[96, 180], [70, 180], [86, 300], [124, 300]]), J.light, { opacity: 0.5 }), S(manga, J.line, 3.2));
  o.push(S('M-86 196Q0 214 86 196', J.line, 2.6), S('M-40 230Q-30 260 -40 290', J.line, 1.6, { opacity: 0.7 }));
  o.push(puno(c, col));
  // Líneas de temblor de rabia (rojo ladrillo).
  for (let i = 0; i < 5; i++) o.push(S(`M${-110 - i * 9} ${-40 + i * 24}l-16 -6`, LADRILLO, 3.4));
  for (let i = 0; i < 5; i++) o.push(S(`M${110 + i * 9} ${-40 + i * 24}l16 -6`, LADRILLO, 3.4));
  return o.join('');
}

// ------------------------------------------------------------------ Guille: pulgar arriba
function guille(c) {
  const col = PAL.guille;
  const J = ROPA.guille;
  const o = [];
  const brazo = smooth([[-56, 60], [56, 60], [70, 190], [-70, 190]]);
  o.push(P(brazo, col.skin), P(smooth([[-56, 60], [-26, 60], [-36, 190], [-70, 190]]), col.skinShadow, { opacity: 0.8 }), S('M-56 60L-70 190', col.lf, 3.2), S('M56 60L70 190', col.lf, 3.2));
  // Manga de la camisa hawaiana con flores y hojas.
  const manga = smooth([[-100, 170], [100, 170], [136, 300], [-136, 300]]);
  o.push(P(manga, J.base), P(smooth([[-100, 170], [-60, 170], [-80, 300], [-136, 300]]), J.shadow, { opacity: 0.8 }));
  const motivos = [];
  for (const [x, y, s, rot] of [[-70, 236, 1.1, 0.3], [60, 268, 1.3, 1], [-20, 296, 0.9, 0.6], [110, 220, 0.9, 0.2]]) motivos.push(flor(x, y, s, rot));
  motivos.push(hoja(-120, 214, 1.2, 330), hoja(30, 214, 1.2, 320), hoja(100, 262, 1.1, 200));
  o.push(G(motivos.join(''), { 'clip-path': c.clip(manga) }), S(manga, T, 3.2));
  o.push(S('M-92 188Q0 206 92 188', T, 2.8, { opacity: 0.85 }));
  o.push(puno(c, col, { arriba: true }));
  // Destellos de «¡genial!».
  o.push(estrellas([[-120, -110, 20], [110, -120, 14], [124, -10, 11]]));
  return o.join('');
}

const estrellas = (lista) =>
  lista
    .map(([x, y, r]) => {
      const e = `M${f(x)} ${f(y - r)}Q${f(x + r * 0.2)} ${f(y - r * 0.2)} ${f(x + r)} ${f(y)}Q${f(x + r * 0.2)} ${f(y + r * 0.2)} ${f(x)} ${f(y + r)}Q${f(x - r * 0.2)} ${f(y + r * 0.2)} ${f(x - r)} ${f(y)}Q${f(x - r * 0.2)} ${f(y - r * 0.2)} ${f(x)} ${f(y - r)}Z`;
      return P(e, '#fff1b8') + S(e, ORO_OSC, 2);
    })
    .join('');

// ------------------------------------------------------------------ Chuchi: el dedo índice en alto
function chuchi(c) {
  const col = PAL.chuchi;
  const J = ROPA.chuchi;
  const o = [];
  // Manga de la sudadera granate, con canalé en el puño.
  const manga = smooth([[-96, 176], [96, 176], [130, 300], [-130, 300]]);
  o.push(P(manga, J.base), P(smooth([[-96, 176], [-56, 176], [-70, 300], [-130, 300]]), J.shadow), P(smooth([[96, 176], [70, 176], [86, 300], [130, 300]]), J.light, { opacity: 0.5 }), S(manga, J.line, 3.2));
  const canale = smooth([[-70, 160], [70, 160], [78, 194], [-78, 194]]);
  o.push(P(canale, J.shadow), P(smooth([[30, 160], [70, 160], [78, 194], [40, 194]]), J.base, { opacity: 0.7 }), S(canale, J.line, 3));
  for (let i = -5; i <= 5; i++) o.push(S(`M${i * 13} 162L${i * 14} 192`, J.line, 1.4, { opacity: 0.7 }));
  // Muñeca y mano: tres dedos doblados, pulgar al lado y el índice bien tieso.
  const muneca = smooth([[-44, 150], [44, 150], [48, 168], [-48, 168]]);
  o.push(P(muneca, col.skinShadow), S('M-44 150L-48 168', col.lf, 3), S('M44 150L48 168', col.lf, 3));
  o.push(tubo([[-30, 150], [-34, 60], [-36, -120]], 30, col));
  const palmaD = smooth([[-52, 150, 'c'], [52, 150, 'c'], [58, 100], [54, 50], [38, 22], [-8, 22], [-40, 40], [-52, 100]]);
  o.push(P(palmaD, col.skin), P(smooth([[-52, 150, 'c'], [-20, 150, 'c'], [-24, 100], [-26, 40], [-40, 40], [-52, 100]]), col.skinShadow, { opacity: 0.8 }));
  // Dedos doblados (se ven sus nudillos).
  for (let i = 0; i < 3; i++) {
    const x = 0 + i * 20;
    o.push(tubo([[x - 4, 36], [x + 4, 66]], 24, col));
    o.push(S(`M${x - 11} 70Q${x + 3} 80 ${x + 15} 68`, col.lf, 1.8));
  }
  // Pulgar sobre los dedos doblados.
  o.push(tubo([[-30, 118], [-6, 92], [14, 72]], 24, col));
  o.push(sombraTubo([[-30, 118], [-6, 92], [14, 72]], 24, col));
  o.push(S(smooth([[-52, 150], [-58, 100], [-54, 50]], false), col.lf, 3));
  o.push(S(smooth([[52, 150], [58, 100], [54, 50]], false), col.lf, 3));
  // El índice: sombra, pliegues y uña; y un destello en la punta.
  o.push(sombraTubo([[-30, 150], [-34, 60], [-36, -120]], 30, col));
  o.push(pliegue(-34, 40, 30, col), pliegue(-35, -30, 30, col), pliegue(-36, -78, 30, col));
  o.push(S('M-47 -118Q-36 -146 -25 -118', col.lf, 2), P('M-46 -116Q-36 -140 -26 -116Q-36 -110 -46 -116Z', '#f8dccb'));
  o.push(estrellas([[-36, -180, 22], [20, -140, 12], [-92, -150, 11]]));
  return o.join('');
}

// ------------------------------------------------------------------ Vero: una caña
function vero(c) {
  const col = PAL.vero;
  const J = ROPA.vero;
  const o = [];
  // Camiseta azul noche y antebrazo moreno.
  o.push(P(smooth([[-120, 300], [-100, 190], [-70, 168], [70, 168], [100, 190], [120, 300]]), J.base), P(smooth([[-120, 300], [-100, 190], [-70, 168], [-50, 190], [-70, 300]]), J.shadow));
  const brazo = smooth([[-52, 100], [52, 100], [58, 190], [-58, 190]]);
  o.push(P(brazo, col.skin), P(smooth([[-52, 100], [-30, 100], [-34, 190], [-58, 190]]), col.skinShadow, { opacity: 0.85 }), S('M-52 100L-58 190', col.lf, 3.2), S('M52 100L58 190', col.lf, 3.2));
  // El vaso de caña: tubo de vidrio con cerveza dorada, burbujas, espuma que rebosa y brillo.
  const vaso = smooth([[-62, -100, 'c'], [62, -100, 'c'], [54, 150, 'c'], [-54, 150, 'c']]);
  o.push(P(vaso, '#e9dfc8'), P(smooth([[-60, -52], [60, -52], [54, 150], [-54, 150]]), '#e8a935'));
  o.push(P(smooth([[-60, -52], [-30, -52], [-28, 150], [-54, 150]]), '#c4821d', { opacity: 0.9 }), P(smooth([[30, -52], [60, -52], [54, 150], [24, 150]]), '#f6c85f', { opacity: 0.7 }));
  const rnd = (i) => ((i * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 20; i++) o.push(S(ellipse(-40 + rnd(i) * 80, -30 + rnd(i + 20) * 170, 2.6 + rnd(i + 50) * 2.2, 2.6 + rnd(i + 50) * 2.2), '#fbe3a0', 1.4, { opacity: 0.85 }));
  o.push(S('M36 -40L42 130', '#fff1c8', 5, { opacity: 0.85 }), S('M24 -30L28 -10', '#fff1c8', 3));
  const espuma = [];
  for (let i = 0; i < 6; i++) espuma.push(ellipse(-48 + i * 19.5, -96 - (i % 2) * 8, 20, 22));
  espuma.push(ellipse(-20, -116, 24, 20), ellipse(24, -118, 22, 18));
  const linea = '#9a7a4a';
  espuma.forEach((d) => o.push(P(d, MARFIL), S(d, linea, 2.6)));
  o.push(P(smooth([[-62, -100], [62, -100], [62, -72], [-62, -72]]), MARFIL), P(smooth([[-62, -100], [-30, -100], [-30, -72], [-62, -72]]), '#e3d4b2'), S('M-62 -100L-62 -72', linea, 2.6), S('M62 -100L62 -72', linea, 2.6));
  o.push(S('M-30 -86Q-10 -80 8 -88', linea, 1.6), S('M16 -98Q34 -92 46 -100', linea, 1.6));
  o.push(S(vaso, '#8a6a3c', 3.6));
  // La mano rodeando el vaso: cuatro dedos por delante y el pulgar por detrás.
  for (let i = 0; i < 4; i++) {
    const y = 20 + i * 27;
    const pts = [[-76, y + 4 + i * 2], [-20, y - 4], [38, y + 2]];
    o.push(tubo(pts, 23, col));
    o.push(sombraTubo(pts, 23, col));
  }
  o.push(tubo([[56, 6], [66, 64], [52, 116]], 24, col));
  o.push(S('M-86 20Q-96 60 -80 130', col.lf, 3), S('M-70 130Q-60 150 -50 150', col.lf, 3));
  // Anillo dorado en el dedo, como los aros.
  o.push(S(ellipse(-46, 75, 12, 3), col.goldShadow, 4.6), S(ellipse(-46, 75, 12, 3), col.gold, 2.4));
  o.push(estrellas([[96, -120, 18], [-104, -110, 12], [110, -40, 10]]));
  return o.join('');
}

const HACEDORES = { pablo, fran, chuchi, guille, vero };

export const MANOS = Object.keys(HACEDORES);

/** La mano de `quien` (si no tiene: la de Pablo), en coordenadas de mano. */
export function mano(c, quien) {
  return (HACEDORES[quien] ?? HACEDORES.pablo)(c);
}

/** Caja que encuadra la mano de cada uno: [x0, y0, x1, y1]. */
export const CAJA_MANO = {
  pablo: [-150, -150, 150, 200],
  fran: [-140, -90, 140, 230],
  chuchi: [-140, -230, 140, 210],
  guille: [-140, -200, 140, 210],
  vero: [-130, -150, 130, 200],
  sombra: [-150, -150, 150, 200],
};
