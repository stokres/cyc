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
/** Un rectángulo de esquinas redondas (más en la punta de arriba que en la de abajo). */
const rr = (x0, y0, x1, y1, rt, rb = rt) =>
  `M${f(x0)} ${f(y0 + rt)}Q${f(x0)} ${f(y0)} ${f(x0 + rt)} ${f(y0)}L${f(x1 - rt)} ${f(y0)}Q${f(x1)} ${f(y0)} ${f(x1)} ${f(y0 + rt)}L${f(x1)} ${f(y1 - rb)}Q${f(x1)} ${f(y1)} ${f(x1 - rb)} ${f(y1)}L${f(x0 + rb)} ${f(y1)}Q${f(x0)} ${f(y1)} ${f(x0)} ${f(y1 - rb)}Z`;

/** Los cuatro dedos del puño (de índice a meñique): nudillos en arco, de más a menos alto hacia el meñique. */
const DEDOS = [
  { cx: -63, top: -36, len: 92, w: 50 },
  { cx: -21, top: -52, len: 106, w: 50 },
  { cx: 21, top: -48, len: 100, w: 50 },
  { cx: 60, top: -24, len: 80, w: 46 },
];

/** Un dedo doblado visto de frente: nudillo arriba, primera falange en escorzo, segunda bajando y la yema con la uña asomando. */
function dedoDoblado(col, { cx, top, len, w }) {
  const o = [];
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y1 = top + len;
  const cuerpo = rr(x0, top, x1, y1, w * 0.46, w * 0.4);
  o.push(P(cuerpo, col.skin));
  // Segunda falange y yema: más abajo y más oscuras, porque el dedo se mete hacia la palma.
  o.push(P(rr(x0 + 1, top + 34, x1 - 1, y1 - 1, 3, w * 0.4), col.skinShadow, { opacity: 0.38 }));
  // Sombra del lado izquierdo y hilo de luz en el derecho.
  o.push(S(`M${f(cx - w * 0.3)} ${f(top + 16)}L${f(cx - w * 0.31)} ${f(y1 - 14)}`, col.skinShadow, w * 0.3, { opacity: 0.85 }));
  o.push(S(`M${f(cx + w * 0.32)} ${f(top + 16)}L${f(cx + w * 0.33)} ${f(y1 - 24)}`, col.skinLight, 3.4, { opacity: 0.8 }));
  // Nudillo: brillo y arco de luz encima, y los dos pliegues de la articulación.
  o.push(P(ellipse(cx + 2, top + 13, w * 0.27, 8.5), col.skinLight, { opacity: 0.95 }));
  o.push(S(`M${f(cx - w * 0.34)} ${f(top + 26)}Q${f(cx)} ${f(top + 36)} ${f(cx + w * 0.34)} ${f(top + 26)}`, col.lf, 2));
  o.push(S(`M${f(cx - w * 0.2)} ${f(top + 33)}Q${f(cx)} ${f(top + 39)} ${f(cx + w * 0.2)} ${f(top + 33)}`, col.skinDeep, 1.5, { opacity: 0.8 }));
  // Segunda articulación (abajo) y la uña asomando en la yema.
  o.push(S(`M${f(cx - w * 0.3)} ${f(top + 58)}Q${f(cx)} ${f(top + 64)} ${f(cx + w * 0.3)} ${f(top + 58)}`, col.lf, 1.7, { opacity: 0.85 }));
  const una = `M${f(cx - w * 0.26)} ${f(y1 - 6)}Q${f(cx - w * 0.24)} ${f(y1 - 20)} ${f(cx)} ${f(y1 - 20)}Q${f(cx + w * 0.24)} ${f(y1 - 20)} ${f(cx + w * 0.26)} ${f(y1 - 6)}Z`;
  o.push(P(una, mezcla(col.skinLight, MARFIL, 0.55)), S(una, col.lf, 1.8));
  o.push(S(cuerpo, col.lf, 3.4));
  return o.join('');
}

/** El pulgar cruzado por delante de los dedos: sale del abultamiento de la palma, sube en diagonal y acaba con su uña. */
function pulgarCruzado(col) {
  const o = [];
  const pu = [[-62, 100], [-52, 66], [-30, 44], [-4, 36]];
  // Sombra que el pulgar echa sobre los dedos.
  o.push(S(smooth(pu.map(([x, y]) => [x + 3, y + 8]), false), col.skinDeep, 54, { opacity: 0.55 }));
  o.push(tubo(pu, 50, col, col.skin, 3.6));
  o.push(sombraTubo(pu, 50, col));
  // El abultamiento de la palma donde nace el pulgar: tapa su arranque y le da volumen.
  const talon = smooth([[-93, 58], [-80, 46], [-40, 74], [-30, 124], [-58, 138], [-84, 108]]);
  o.push(P(talon, col.skin), P(smooth([[-93, 58], [-82, 48], [-68, 80], [-58, 138], [-84, 108]]), col.skinShadow, { opacity: 0.85 }));
  o.push(S(smooth([[-93, 58], [-92, 84], [-84, 108]], false), col.lf, 3.4));
  o.push(S('M-42 82Q-36 104 -42 126', col.skinDeep, 1.8, { opacity: 0.8 }));
  // Articulación del pulgar, con sus dos pliegues, y la uña en la punta.
  o.push(S('M-60 58Q-46 72 -34 62', col.lf, 1.9), S('M-56 68Q-46 78 -36 70', col.skinDeep, 1.4, { opacity: 0.8 }));
  const un = rr(-11, -9, 11, 9, 8, 8);
  o.push(G(P(un, mezcla(col.skinLight, MARFIL, 0.55)) + S(un, col.lf, 1.8) + S('M-6 -3Q0 -6 6 -3', MARFIL, 1.6, { opacity: 0.9 }), { transform: 'translate(6 38) rotate(-14)' }));
  return o.join('');
}

/** Un puño visto de frente: cuatro nudillos en arco, los dedos doblados con sus falanges, el pulgar cruzado por delante (o levantado si `arriba`). */
function puno(c, col, { arriba = false } = {}) {
  const o = [];
  if (arriba) {
    // Pulgar en alto, grueso y algo más corto que un dedo, por detrás de los dedos; la uña se ve de lado.
    const pu = [[-66, 30], [-69, -50], [-62, -118]];
    o.push(tubo(pu, 56, col));
    o.push(sombraTubo(pu, 56, col));
    const una = rr(-78, -138, -46, -96, 15, 10);
    o.push(G(P(una, mezcla(col.skinLight, MARFIL, 0.55)) + S(una, col.lf, 2.2) + S('M-70 -128L-70 -110', MARFIL, 2.4, { opacity: 0.9 }), { transform: 'rotate(4 -62 -121)' }));
    o.push(S('M-90 -52Q-68 -36 -46 -50', col.lf, 2), S('M-86 -42Q-68 -30 -50 -40', col.skinDeep, 1.5, { opacity: 0.8 }));
  }
  // Palma y canto de la mano, detrás de los dedos: el talón de la mano abulta debajo y se estrecha hacia la muñeca.
  const palma = smooth([[-80, -20, 'c'], [80, -20, 'c'], [90, 40], [80, 96], [54, 138], [-54, 138], [-82, 96], [-92, 40]]);
  o.push(P(palma, col.skin));
  // Volumen: lado en sombra a la izquierda, canto iluminado a la derecha y pliegue de la palma.
  o.push(P(smooth([[-92, 40], [-66, 30], [-54, 80], [-38, 134], [-54, 138], [-82, 96]]), col.skinShadow, { opacity: 0.85 }));
  o.push(S(smooth([[80, 36], [84, 80], [66, 122]], false), col.skinLight, 5, { opacity: 0.85 }));
  o.push(S('M-10 88Q18 96 44 78', col.skinDeep, 2, { opacity: 0.8 }));
  o.push(S(palma, col.lf, 3.4));
  // Dedos de derecha a izquierda, para que el índice quede por encima.
  for (const d of [...DEDOS].reverse()) o.push(dedoDoblado(col, d));
  if (!arriba) o.push(pulgarCruzado(col));
  // Tensión del puño: tendones que bajan hacia la muñeca y rayitas sobre los nudillos.
  o.push(S('M-26 112Q-22 126 -26 138', col.skinDeep, 1.8, { opacity: 0.75 }), S('M12 108Q16 124 12 138', col.skinDeep, 1.8, { opacity: 0.75 }));
  for (const d of arriba ? [] : DEDOS.slice(0, 3)) o.push(S(`M${f(d.cx - 8)} ${f(d.top - 7)}l-3 -9M${f(d.cx + 6)} ${f(d.top - 8)}l1 -10`, col.lf, 2.2, { opacity: 0.8 }));
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
  fran: [-130, -85, 130, 215],
  chuchi: [-140, -230, 140, 210],
  guille: [-140, -200, 140, 210],
  vero: [-130, -150, 130, 200],
  sombra: [-150, -150, 150, 200],
};
