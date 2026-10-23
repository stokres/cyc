// Las manos del manga del capítulo 2, una por personaje, con su gesto y su manga de camisa:
//   Pablo  · las palmas abiertas, suplicando (manga de borreguillo)
//   Fran   · el puño cerrado, enfadado (camiseta verde azulada)
//   Chuchi · el dedo índice en alto, «técnicamente...» (sudadera granate)
//   Guille · el pulgar arriba (camisa hawaiana de flores)
//   Vero   · una caña bien tirada (camiseta negra)
// Todo en tinta, en coordenadas de mano: las muñecas abajo (y ≈ 150), los dedos arriba. Cadenas SVG.
import { smooth, ellipse, f, P, S, G, T, PAPEL, BLANCO, tonos, sudor } from './manga-comun.mjs';

/** Un dedo (o un tubo): trazo grueso con borde de tinta y relleno de papel. */
const tubo = (pts, w, relleno = PAPEL, borde = 3.6) => {
  const d = pts.length === 2 ? `M${f(pts[0][0])} ${f(pts[0][1])}L${f(pts[1][0])} ${f(pts[1][1])}` : smooth(pts, false);
  return S(d, T, w + borde * 2) + S(d, relleno, w);
};
const sombraTubo = (pts, w, trama) => {
  const d = pts.length === 2 ? `M${f(pts[0][0] + w * 0.22)} ${f(pts[0][1])}L${f(pts[1][0] + w * 0.22)} ${f(pts[1][1])}` : smooth(pts.map(([x, y]) => [x + w * 0.22, y]), false);
  return S(d, trama, w * 0.5);
};
const pliegue = (x, y, w) => S(`M${f(x - w * 0.32)} ${f(y)}Q${f(x)} ${f(y + 3)} ${f(x + w * 0.32)} ${f(y)}`, T, 1.6);

/** Borde de nube (puño de borreguillo): tramos abombados hacia fuera. */
function festones(x0, x1, y, n, r) {
  const o = [];
  for (let i = 0; i < n; i++) o.push(ellipse(x0 + ((i + 0.5) * (x1 - x0)) / n, y, ((x1 - x0) / n) * 0.62, r));
  return o;
}

// ------------------------------------------------------------------ Pablo: palmas abiertas
function palma(c, tn, dx, dy, lejos) {
  const o = [];
  const w = 23;
  const dedos = [
    [[-34, 20], [-37, -50], [-38, -112]],
    [[-12, 16], [-13, -62], [-12, -132]],
    [[12, 18], [14, -56], [17, -120]],
    [[34, 30], [38, -30], [42, -86]],
  ];
  const trama = lejos ? tn.punto(0.46) : tn.punto(0.22);
  for (const d of dedos) o.push(tubo(d, w));
  // Pulgar hacia la izquierda.
  const pulgar = [[-48, 100], [-80, 52], [-96, 0]];
  o.push(tubo(pulgar, 26));
  const palmaD = smooth([[-52, 6, 'c'], [54, 12, 'c'], [58, 74], [46, 128], [18, 156], [-18, 156], [-46, 128], [-56, 74]]);
  o.push(P(palmaD, PAPEL), P(palmaD, trama));
  for (const d of dedos) o.push(sombraTubo(d, w, tn.punto(0.28)));
  // Pliegues de los dedos y líneas de la palma.
  for (const d of dedos) {
    o.push(pliegue(d[1][0], d[1][1] + 6, w), pliegue(d[1][0], d[1][1] - 38, w));
  }
  o.push(S('M-44 84Q-14 70 10 40', T, 2), S('M-36 104Q-6 98 30 70', T, 2), S('M40 60Q20 90 10 118', T, 1.8));
  o.push(S(smooth([[-52, 6], [-56, 74], [-46, 128], [-18, 156]], false), T, 3), S(smooth([[54, 12], [58, 74], [46, 128], [18, 156]], false), T, 3));
  o.push(S('M-52 6Q0 -4 54 12', T, 0.01));
  return G(o.join(''), { transform: `translate(${dx} ${dy})` });
}

function pablo(c, tn) {
  const o = [];
  // Manga de la chaqueta oscura con el puño de borreguillo.
  o.push(P(smooth([[-210, 300], [-120, 172], [-62, 150], [62, 150], [120, 172], [210, 300]]), T));
  o.push(palma(c, tn, 30, -14, true));
  o.push(palma(c, tn, -4, 8, false));
  const fest = festones(-84, 84, 168, 6, 20);
  fest.forEach((d) => (o.push(P(d, PAPEL)), o.push(S(d, T, 2.6))));
  o.push(P(smooth([[-86, 168], [86, 168], [96, 250], [-96, 250]]), PAPEL), P(smooth([[-86, 168], [86, 168], [96, 250], [-96, 250]]), tn.punto(0.3, 45)));
  fest.forEach((d) => o.push(P(d, PAPEL), S(d, T, 2.6)));
  o.push(S('M-86 168L-96 250', T, 2.6), S('M86 168L96 250', T, 2.6));
  // Gotas de sudor.
  o.push(sudor(-122, -60, 1.1, -10), sudor(130, -30, 0.9, 10));
  return o.join('');
}

// ------------------------------------------------------------------ puño y pulgar
/** Un puño visto de frente: cuatro dedos doblados como barras y el pulgar cruzado (o levantado si `arriba`). */
function puno(c, tn, { arriba = false } = {}) {
  const o = [];
  if (arriba) {
    // Pulgar en alto, por detrás de los dedos.
    const pu = [[-46, -30], [-50, -110], [-48, -160]];
    o.push(tubo(pu, 36));
    o.push(sombraTubo(pu, 36, tn.punto(0.3)));
    o.push(P(smooth([[-62, -156], [-48, -186], [-34, -156], [-48, -140]]), BLANCO), S(smooth([[-62, -156], [-48, -186], [-34, -156], [-48, -140]]), T, 2.4));
    o.push(S('M-60 -100Q-48 -92 -34 -100', T, 1.8), S('M-60 -62Q-48 -54 -34 -62', T, 1.6, { opacity: 0.8 }));
  }
  // Palma detrás (el borde del puño) y cuatro dedos doblados, de arriba abajo.
  const base = smooth([[-66, -50], [66, -50], [74, 40], [60, 80], [-60, 80], [-74, 40]]);
  o.push(P(base, T));
  for (let i = 0; i < 4; i++) {
    const y = -44 + i * 30;
    const dedo = [[-50 + i * 2, y], [0, y - 3], [50 - i * 2, y]];
    o.push(tubo(dedo, 34, PAPEL, 3.4));
    o.push(sombraTubo(dedo, 34, tn.punto(0.3)));
    o.push(S(`M${-40 + i * 2} ${y - 12}q2 8 -1 16`, T, 1.4, { opacity: 0.7 }), S(`M${38 - i * 2} ${y - 12}q-2 8 1 16`, T, 1.4, { opacity: 0.7 }));
  }
  // Lado en sombra del puño.
  o.push(P(smooth([[-74, 20], [-62, 78], [-34, 82], [-48, 40]]), tn.punto(0.5)));
  if (!arriba) {
    // Pulgar cruzado por delante, con su uña.
    const pu = [[-64, 74], [-16, 64], [40, 58]];
    o.push(tubo(pu, 32));
    o.push(sombraTubo(pu, 32, tn.punto(0.3)));
    o.push(S('M-22 52Q-14 58 -6 52', T, 1.6));
  }
  return o.join('');
}

// ------------------------------------------------------------------ Fran: puño
function fran(c, tn) {
  const o = [];
  // Antebrazo ancho y la manga corta de la camiseta verde azulada (trama media).
  const brazo = smooth([[-60, 60], [60, 60], [74, 200], [-74, 200]]);
  o.push(P(brazo, PAPEL), P(brazo, tn.punto(0.2)), S('M-60 60L-74 200', T, 3.2), S('M60 60L74 200', T, 3.2));
  for (let i = 0; i < 34; i++) o.push(S(`M${-52 + ((i * 37) % 104)} ${80 + ((i * 53) % 100)}l4 -3`, T, 1.3, { opacity: 0.8 }));
  const manga = smooth([[-96, 180], [96, 180], [124, 300], [-124, 300]]);
  o.push(P(manga, PAPEL), P(manga, tn.punto(0.38, 45)), P(smooth([[-96, 180], [-60, 180], [-70, 300], [-124, 300]]), tn.punto(0.55, 45)), S(manga, T, 3.2));
  o.push(S('M-86 196Q0 214 86 196', T, 2.6), S('M-40 230Q-30 260 -40 290', T, 1.6, { opacity: 0.7 }));
  o.push(puno(c, tn));
  // Líneas de temblor de rabia.
  for (let i = 0; i < 5; i++) o.push(S(`M${-110 - i * 9} ${-40 + i * 24}l-16 -6`, T, 3));
  for (let i = 0; i < 5; i++) o.push(S(`M${110 + i * 9} ${-40 + i * 24}l16 -6`, T, 3));
  return o.join('');
}

// ------------------------------------------------------------------ Guille: pulgar arriba
function guille(c, tn) {
  const o = [];
  const brazo = smooth([[-56, 60], [56, 60], [70, 190], [-70, 190]]);
  o.push(P(brazo, PAPEL), P(brazo, tn.punto(0.16)), S('M-56 60L-70 190', T, 3.2), S('M56 60L70 190', T, 3.2));
  // Manga de la camisa hawaiana con flores y hojas.
  const manga = smooth([[-100, 170], [100, 170], [136, 300], [-136, 300]]);
  o.push(P(manga, PAPEL), P(manga, tn.punto(0.24, 45)));
  const flores = [];
  for (const [x, y, s, rot] of [[-70, 236, 1.1, 0.3], [60, 268, 1.3, 1], [-20, 296, 0.9, 0.6], [110, 220, 0.9, 0.2]]) {
    for (let i = 0; i < 5; i++) {
      const a = rot + (i * 72 * Math.PI) / 180;
      const pt = (px, py) => [x + (px * Math.cos(a) - py * Math.sin(a)) * s, y + (px * Math.sin(a) + py * Math.cos(a)) * s];
      const p = [pt(0, 0), pt(-9, -14), pt(-6, -28), pt(6, -30), pt(11, -14)];
      flores.push(P(smooth(p.map(([a1, b1], j) => [a1, b1, j === 0 ? 'c' : undefined])), T));
    }
    flores.push(P(ellipse(x, y, 4 * s, 4 * s), BLANCO));
  }
  flores.push(P(smooth([[-120, 214, 'c'], [-90, 200], [-60, 204, 'c'], [-90, 222]]), T), P(smooth([[30, 214, 'c'], [60, 196], [86, 204, 'c'], [60, 222]]), T));
  o.push(G(flores.join(''), { 'clip-path': c.clip(manga) }), S(manga, T, 3.2));
  o.push(S('M-92 188Q0 206 92 188', T, 2.8));
  o.push(puno(c, tn, { arriba: true }));
  // Destellos de «¡genial!».
  o.push(estrellas([[-120, -110, 20], [110, -120, 14], [124, -10, 11]]));
  return o.join('');
}

const estrellas = (lista) =>
  lista
    .map(([x, y, r]) => {
      const e = `M${f(x)} ${f(y - r)}Q${f(x + r * 0.2)} ${f(y - r * 0.2)} ${f(x + r)} ${f(y)}Q${f(x + r * 0.2)} ${f(y + r * 0.2)} ${f(x)} ${f(y + r)}Q${f(x - r * 0.2)} ${f(y + r * 0.2)} ${f(x - r)} ${f(y)}Q${f(x - r * 0.2)} ${f(y - r * 0.2)} ${f(x)} ${f(y - r)}Z`;
      return P(e, BLANCO) + S(e, T, 2);
    })
    .join('');

// ------------------------------------------------------------------ Chuchi: el dedo índice en alto
function chuchi(c, tn) {
  const o = [];
  // Manga de la sudadera granate (trama oscura), con canalé en el puño.
  const manga = smooth([[-96, 176], [96, 176], [130, 300], [-130, 300]]);
  o.push(P(manga, PAPEL), P(manga, tn.punto(0.66, 45)), P(smooth([[-96, 176], [-56, 176], [-70, 300], [-130, 300]]), tn.punto(0.82, 45)), S(manga, T, 3.2));
  o.push(P(smooth([[-70, 160], [70, 160], [78, 194], [-78, 194]]), PAPEL), P(smooth([[-70, 160], [70, 160], [78, 194], [-78, 194]]), tn.punto(0.36, 0)), S(smooth([[-70, 160], [70, 160], [78, 194], [-78, 194]]), T, 3));
  for (let i = -5; i <= 5; i++) o.push(S(`M${i * 13} 162L${i * 14} 192`, T, 1.4, { opacity: 0.8 }));
  // Muñeca y mano: tres dedos doblados, pulgar al lado y el índice bien tieso.
  const muneca = smooth([[-44, 150], [44, 150], [48, 168], [-48, 168]]);
  o.push(P(muneca, PAPEL), S('M-44 150L-48 168', T, 3), S('M44 150L48 168', T, 3));
  o.push(tubo([[-30, 150], [-34, 60], [-36, -120]], 30));
  o.push(P(smooth([[-52, 150, 'c'], [52, 150, 'c'], [58, 100], [54, 50], [38, 22], [-8, 22], [-40, 40], [-52, 100]]), PAPEL), P(smooth([[-52, 150, 'c'], [52, 150, 'c'], [58, 100], [54, 50], [38, 22], [-8, 22], [-40, 40], [-52, 100]]), tn.punto(0.2)));
  // Dedos doblados (se ven sus nudillos).
  for (let i = 0; i < 3; i++) {
    const x = 0 + i * 20;
    o.push(tubo([[x - 4, 36], [x + 4, 66]], 24));
    o.push(S(`M${x - 11} 70Q${x + 3} 80 ${x + 15} 68`, T, 1.8));
  }
  // Pulgar sobre los dedos doblados.
  o.push(tubo([[-30, 118], [-6, 92], [14, 72]], 24));
  o.push(sombraTubo([[-30, 118], [-6, 92], [14, 72]], 24, tn.punto(0.28)));
  o.push(S(smooth([[-52, 150], [-58, 100], [-54, 50]], false), T, 3));
  o.push(S(smooth([[52, 150], [58, 100], [54, 50]], false), T, 3));
  // El índice: sombra, pliegues y uña; y un destello en la punta.
  o.push(sombraTubo([[-30, 150], [-34, 60], [-36, -120]], 30, tn.punto(0.3)));
  o.push(pliegue(-34, 40, 30), pliegue(-35, -30, 30), pliegue(-36, -78, 30));
  o.push(S('M-47 -118Q-36 -146 -25 -118', T, 2), P('M-46 -116Q-36 -140 -26 -116Q-36 -110 -46 -116Z', BLANCO));
  o.push(estrellas([[-36, -180, 22], [20, -140, 12], [-92, -150, 11]]));
  return o.join('');
}

// ------------------------------------------------------------------ Vero: una caña
function vero(c, tn) {
  const o = [];
  // Camiseta negra y antebrazo moreno.
  o.push(P(smooth([[-120, 300], [-100, 190], [-70, 168], [70, 168], [100, 190], [120, 300]]), T));
  const brazo = smooth([[-52, 100], [52, 100], [58, 190], [-58, 190]]);
  o.push(P(brazo, PAPEL), P(brazo, tn.punto(0.3, 45)), P(smooth([[-52, 100], [-30, 100], [-34, 190], [-58, 190]]), tn.punto(0.5, 45)), S('M-52 100L-58 190', T, 3.2), S('M52 100L58 190', T, 3.2));
  // El vaso de caña: tubo con cerveza, burbujas, espuma que rebosa y brillo.
  const vaso = smooth([[-62, -100, 'c'], [62, -100, 'c'], [54, 150, 'c'], [-54, 150, 'c']]);
  o.push(P(vaso, BLANCO), P(smooth([[-60, -52], [60, -52], [54, 150], [-54, 150]]), tn.punto(0.42, 60)));
  o.push(P(smooth([[-60, -52], [-30, -52], [-28, 150], [-54, 150]]), tn.punto(0.62, 60)));
  const rnd = (i) => ((i * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 20; i++) o.push(S(ellipse(-40 + rnd(i) * 80, -30 + rnd(i + 20) * 170, 2.6 + rnd(i + 50) * 2.2, 2.6 + rnd(i + 50) * 2.2), BLANCO, 1.4));
  o.push(S('M36 -40L42 130', BLANCO, 5, { opacity: 0.85 }), S('M24 -30L28 -10', BLANCO, 3));
  const espuma = [];
  for (let i = 0; i < 6; i++) espuma.push(ellipse(-48 + i * 19.5, -96 - (i % 2) * 8, 20, 22));
  espuma.push(ellipse(-20, -116, 24, 20), ellipse(24, -118, 22, 18));
  espuma.forEach((d) => o.push(P(d, PAPEL), S(d, T, 2.6)));
  o.push(P(smooth([[-62, -100], [62, -100], [62, -72], [-62, -72]]), PAPEL), S('M-62 -100L-62 -72', T, 2.6), S('M62 -100L62 -72', T, 2.6));
  o.push(S('M-30 -86Q-10 -80 8 -88', T, 1.6), S('M16 -98Q34 -92 46 -100', T, 1.6));
  o.push(S(vaso, T, 3.6));
  // La mano rodeando el vaso: cuatro dedos por delante y el pulgar por detrás.
  for (let i = 0; i < 4; i++) {
    const y = 20 + i * 27;
    const pts = [[-76, y + 4 + i * 2], [-20, y - 4], [38, y + 2]];
    o.push(tubo(pts, 23));
    o.push(sombraTubo(pts, 23, tn.punto(0.3)));
    o.push(S(`M${-70 + i * 3} ${y - 8}l-3 8`, T, 1.4, { opacity: 0 }));
  }
  o.push(tubo([[56, 6], [66, 64], [52, 116]], 24));
  o.push(S('M-36 16L-36 120', T, 0.01));
  o.push(S('M-86 20Q-96 60 -80 130', T, 3), S('M-70 130Q-60 150 -50 150', T, 3));
  // Anillo dorado en el dedo, como los aros.
  o.push(S(ellipse(-46, 75, 12, 3), BLANCO, 3.4), S(ellipse(-46, 75, 12, 3), T, 1.6, { opacity: 0.0 }));
  o.push(estrellas([[96, -120, 18], [-104, -110, 12], [110, -40, 10]]));
  return o.join('');
}

const HACEDORES = { pablo, fran, chuchi, guille, vero };

export const MANOS = Object.keys(HACEDORES);

/** La mano de `quien` (si no tiene: la de Pablo), en coordenadas de mano. */
export function mano(c, quien, k = 1) {
  const tn = tonos(c, k);
  return (HACEDORES[quien] ?? HACEDORES.pablo)(c, tn);
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
