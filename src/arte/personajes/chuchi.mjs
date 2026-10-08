// Chuchi, three-quarter view facing right. Same head-local construction as Fran:
//   eye line y=-2 · brow line y=-15 · nose base y=18 · mouth y=30 · face front x≈46.
// Likeness: shaved egg-shaped head with a shine, squarish dark-brown glasses,
// trimmed ginger beard and mustache, closed half smile, light brows, ears that
// stand out a little, black crew-neck sweater, slim and the tallest of the three.
import { ojos, cejas, boca, bocaDelAnimo } from './frente.mjs';
import { smooth, ellipse, path, stroke, g, shape, angryLid, rrect } from './svg.mjs';
import { makeBody } from './cuerpo.mjs';

export const C = {
  skin: '#f1c6a9',
  skinShadow: '#d59f86',
  skinDeep: '#be856b',
  skinLight: '#fde2cf',
  skinLine: '#a0624a',
  blush: '#e8988a',
  stubble: '#8c6a54',
  beard: '#a2643c',
  beardShadow: '#7b4627',
  beardLight: '#c98b5c',
  beardLine: '#4a2614',
  brow: '#9a6440',
  eye: '#3d2a1e',
  lip: '#c27064',
  mouth: '#5e2622',
  teeth: '#f6f2e8',
  tongue: '#c75a52',
  frame: '#46291a',
  frameLight: '#7c5239',
};

function stipple(n, x0, y0, w, h, color, seed = 7) {
  let st = seed;
  const r = () => ((st = (st * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => path(ellipse(x0 + r() * w, y0 + r() * h, 0.8, 0.8), color, { opacity: 0.5 }));
}

// Taller cranium: no hair, so the skull itself is the silhouette.
const SKULL = smooth([
  [-34, 4], [-41, -14], [-42, -36], [-32, -57], [-8, -68], [18, -65], [36, -51], [45, -28],
  [46, -8], [44, 0], [46, 10], [44, 22], [39, 36], [28, 46], [10, 44], [0, 30], [-6, 16], [-18, 12],
]);
const NOSE = smooth([
  [29.5, -6], [32.5, 0.5], [37.5, 6], [43.5, 10], [47.5, 13], [48.5, 16.5], [45, 19.5], [40, 20], [35.5, 18], [32, 13.5], [30, 7], [28.5, 0.5],
]);
const EAR = smooth([[-7, -12], [0, -7], [1, 5], [-3, 16], [-10, 19], [-17, 13], [-18, 0], [-15, -10]]);
const BEARD = smooth([
  [-1, -9], [-5, 6], [-4, 20], [2, 32], [10, 42], [20, 50], [32, 55], [43, 52], [51, 44], [55, 32], [54, 24],
  [47, 23], [38, 23], [29, 20], [20, 15], [12, 9], [5, 0],
]);
const MUSTACHE = smooth([[24, 24], [31, 19.5], [39, 18], [47, 19.5], [53, 23], [55, 27.5], [50, 26.5], [43, 23.5], [35, 24], [28, 26]]);

function face() {
  return shape(SKULL, C.skin, [
    // Back of the head in shadow; very short hair as a soft haze around the sides.
    path(ellipse(-40, -12, 26, 46, 0.15), C.skinShadow),
    path(smooth([[-40, -30], [-22, -36], [-6, -28], [-4, -8], [-16, 6], [-32, 6], [-40, -10]]), C.stubble, { opacity: 0.12 }),
    // Shine on the scalp, then a smaller hot spot.
    path(ellipse(14, -50, 17, 7.5, -0.3), C.skinLight),
    path(ellipse(18, -52, 7, 2.8, -0.3), '#fff4ea', { opacity: 0.85 }),
    path(ellipse(26, 6, 9, 5, -0.2), C.skinLight, { opacity: 0.8 }),
    path(ellipse(25, 9, 8, 4.5), C.blush, { opacity: 0.38 }),
  ], C.skinLine, 1.6);
}

function ear() {
  return shape(EAR, C.skin, [path(ellipse(-8, 3, 5, 10, 0.1), C.skinDeep, { opacity: 0.7 }), path(ellipse(-13, -2, 3.2, 8, 0.1), C.skinShadow)], C.skinLine, 1.4);
}

function nose() {
  return shape(NOSE, C.skin, [
    path(smooth([[27, -2], [31, 3], [34, 11], [33, 16], [29, 9]]), C.skinShadow, { opacity: 0.7 }),
    path(smooth([[32, 17], [40, 20], [49, 17.5], [51, 23], [32, 23]]), C.skinShadow),
    path(ellipse(40, 17.3, 2.8, 1.7), C.skinDeep, { opacity: 0.85 }),
    path(smooth([[31.5, -2], [37.5, 4], [44, 9.5], [42, 11], [35, 6]]), C.skinLight),
  ], C.skinDeep, 1.2);
}

function eye(which, look = 0, open = 1, angry = false) {
  const [cx, cy, rx0, ry0] = which === 'cerca' ? [13, -2, 3.8, 4.6] : [38.5, -3, 2.7, 4.3];
  const rx = rx0 * open;
  const ry = ry0 * open;
  const x = cx + look;
  return shape(ellipse(x, cy, rx, ry), C.eye, [
    path(ellipse(x + rx * 0.3, cy - ry * 0.3, rx * 0.34, rx * 0.34), '#ffffff'),
    // Calm, slightly lowered lids: the knowing look.
    path(angry ? angryLid(which, x, cy, rx, ry) : smooth([[x - rx - 2, cy - ry - 3], [x + rx + 2, cy - ry - 3], [x + rx + 1, cy - ry * 0.3], [x, cy - ry * 0.5], [x - rx - 1, cy - ry * 0.25]]), C.skinShadow),
  ]);
}

function happyEye(which) {
  const [cx, cy, rx] = which === 'cerca' ? [13, -1, 4.5] : [38.5, -2, 3.3];
  return stroke(smooth([[cx - rx, cy + 1.5], [cx, cy - 3], [cx + rx, cy + 1.5]], false), C.eye, 2.4);
}

function eyelid(which) {
  const [cx, cy, rx] = which === 'cerca' ? [13, -1, 4.8] : [38.5, -2, 3.4];
  return stroke(smooth([[cx - rx, cy - 1], [cx, cy + 2.2], [cx + rx, cy - 1]], false), C.skinLine, 1.7);
}

/** Squarish glasses with thick dark-brown frames, seen in three-quarter view. */
function glasses() {
  const near = rrect(13, -3, 9.8, 8.6, 3.6);
  const far = rrect(38.8, -3.5, 6.2, 8.4, 2.8);
  return [
    stroke(smooth([[3.2, -6], [-2, -6.5], [-8, -6.5]], false), C.frame, 2.4),
    path(near, '#ffffff', { opacity: 0.1 }),
    path(far, '#ffffff', { opacity: 0.1 }),
    stroke(near, C.frame, 2.8),
    stroke(far, C.frame, 2.6),
    stroke(smooth([[22.8, -5.5], [27.7, -7.5], [32.6, -5.5]], false), C.frame, 2.4),
    // Glare and a lighter edge on the top of the frame.
    stroke(smooth([[6.5, -8.5], [10.5, -10]], false), '#ffffff', 1.4, { opacity: 0.55 }),
    stroke(smooth([[35.5, -8.5], [37.5, -9.6]], false), '#ffffff', 1.2, { opacity: 0.5 }),
    stroke(smooth([[6, -11.6], [20, -11.6]], false), C.frameLight, 0.9),
  ].join('');
}

function brows(lift = 0, knit = 0, cocked = 0) {
  const near = smooth([[3, -15 - lift + knit], [10, -19 - lift], [19, -19.5 - lift], [24, -17 - lift - knit], [23, -15 - lift - knit], [14, -16.6 - lift], [6, -13.6 - lift + knit]]);
  const far = smooth([[31.5, -17 - lift - knit - cocked], [38, -20 - lift - cocked], [45.5, -18 - lift - cocked], [44.5, -15.6 - lift - cocked], [38, -17.4 - lift - cocked], [32.5, -15 - lift - knit - cocked]]);
  return path(near, C.brow) + path(far, C.brow);
}

function beard() {
  return shape(BEARD, C.beard, [
    path(smooth([[-12, -12], [6, 8], [10, 34], [20, 62], [-20, 62]]), C.beardShadow),
    path(ellipse(44, 42, 7, 7, -0.3), C.beardLight, { opacity: 0.6 }),
    ...stipple(40, 0, 12, 54, 40, C.beardLight, 13),
  ], C.beardLine, 1.4);
}

function mustache() {
  return shape(MUSTACHE, C.beard, [path(ellipse(42, 20, 8, 2.4, -0.1), C.beardLight, { opacity: 0.7 })], C.beardLine, 1.2);
}

/** 'reposo' is Chuchi's resting face: a closed half smile, higher on the far side. */
function mouth(kind = 'reposo') {
  const lowerLip = (pts) => stroke(smooth(pts, false), C.lip, 2.1);
  switch (kind) {
    case 'a':
      return [path(ellipse(39, 32.5, 8.5, 7.5), C.mouth), path(smooth([[31.5, 27], [46.5, 27], [44.5, 30], [33.5, 30]]), C.teeth), path(ellipse(39, 37, 5, 2.6), C.tongue)].join('');
    case 'o':
      return [path(ellipse(39, 31.5, 5.5, 6.5), C.mouth), path(ellipse(39, 35, 3.6, 2), C.tongue)].join('');
    case 'e':
      return [path(ellipse(39, 30.5, 11, 4.6), C.mouth), path(smooth([[30, 27.5], [48, 27.5], [46, 30], [32, 30]]), C.teeth)].join('');
    case 'm':
      return [stroke(smooth([[29, 28.5], [39, 30], [49, 27.5]], false), C.mouth, 2), lowerLip([[32, 31.5], [39, 33.2], [46, 31.5]])].join('');
    case 'triste':
      return [stroke(smooth([[29, 31], [38.5, 29.2], [48, 31]], false), C.mouth, 2.1), lowerLip([[32, 33], [38.5, 34.4], [45, 33]])].join('');
    case 'enfado':
      return [stroke(smooth([[28.5, 32], [33.5, 29.4], [43.5, 29.4], [48.5, 32]], false), C.mouth, 2.4), lowerLip([[32, 33.2], [38.5, 34], [45, 33.2]])].join('');
    case 'sonrisa':
      return [
        path(smooth([[26, 26], [38, 28.5], [51, 23.5], [48, 31], [39, 34.5], [30, 32]]), C.mouth),
        path(smooth([[27, 26.5], [38, 29], [50, 24.2], [48.5, 28], [38, 31], [28.5, 29.5]]), C.teeth),
        lowerLip([[31, 34.5], [39, 36.5], [47, 32.5]]),
      ].join('');
    default:
      return [stroke(smooth([[28, 29.5], [37, 31], [44, 29.5], [49, 25.5]], false), C.mouth, 2.1), lowerLip([[31.5, 32], [38.5, 33.8], [45, 31.5]])].join('');
  }
}

const JAW_DROP = { reposo: 0, m: 0, sonrisa: 1.2, a: 4.5, o: 3.5, e: 2 };

/** `gafas: false`: without his glasses (Bolilandia, until he finds them), squinting a little. */
export function head({ mood = 'smug', mouthKind, blink = false, look = 0, gafas = true } = {}) {
  // Sad raises the inner ends of the brows; angry pulls them down towards the nose.
  const lift = mood === 'surprised' ? 5 : mood === 'happy' ? 1.5 : mood === 'angry' ? -1 : 0;
  const knit = mood === 'sad' ? 3.5 : mood === 'angry' ? -4.5 : 0;
  const cocked = mood === 'smug' || mood === 'neutral' ? 1.6 : 0;
  const open = (mood === 'surprised' ? 1.22 : 1) * (gafas ? 1 : 0.8);
  const m = mouthKind ?? (mood === 'happy' ? 'sonrisa' : mood === 'surprised' ? 'o' : mood === 'sad' ? 'triste' : mood === 'angry' ? 'enfado' : 'reposo');
  const jaw = JAW_DROP[m] ?? 0;
  const eyes = (w) => (blink ? eyelid(w) : mood === 'happy' ? happyEye(w) : eye(w, look, open, mood === 'angry'));
  return [
    g('cara', face()),
    g('oreja', ear()),
    g('mandibula', [g('barba', beard()), g('boca', mouth(m))], { transform: `translate(${jaw * 0.25} ${jaw})` }),
    g('bigote', mustache()),
    g('nariz', nose()),
    g('ojo_cerca', eyes('cerca')),
    g('ojo_lejos', eyes('lejos')),
    gafas ? g('gafas', glasses()) : '',
    g('cejas', brows(lift, knit, cocked)),
  ].join('');
}

export function guides() {
  const l = (y, label) => `<line x1="-60" x2="70" y1="${y}" y2="${y}" stroke="#2a8cff" stroke-width="0.4" stroke-dasharray="2 2"/><text x="62" y="${y - 1}" font-size="3.5" fill="#2a8cff">${label}</text>`;
  return [l(-15, 'cejas'), l(-2, 'ojos'), l(18, 'nariz'), l(30, 'boca'), `<line x1="46" x2="46" y1="-70" y2="80" stroke="#2a8cff" stroke-width="0.4" stroke-dasharray="2 2"/>`].join('');
}

// ---------------------------------------------------------------- turnaround (head)

export function headFront({ mood = 'smug', mouthKind, blink = false, gafas = true } = {}) {
  const mirror = (pts) => [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y])];
  const skull = smooth(mirror([[0, -68], [24, -64], [38, -50], [44, -26], [45, 0], [42, 22], [34, 38], [18, 47]]).slice(0, -1));
  const beard = smooth([
    [-40, -4], [-40, 16], [-34, 31], [-24, 42], [-12, 50], [0, 53], [12, 50], [24, 42], [34, 31], [40, 16], [40, -4],
    [36, 0], [34, 14], [27, 22], [16, 24], [0, 23], [-16, 24], [-27, 22], [-34, 14], [-36, 0],
  ]);
  const mustache = smooth([[-18, 25], [-10, 20], [0, 19], [10, 20], [18, 25], [20, 29], [12, 26], [0, 25], [-12, 26], [-20, 29]]);
  const eyeF = (x) => shape(ellipse(x, -2, 3.8, 4.6), C.eye, [
    path(ellipse(x + 1.2, -3.4, 1.2, 1.2), '#ffffff'),
    path(smooth([[x - 6, -9], [x + 6, -9], [x + 5, -3.6], [x, -4.4], [x - 5, -3.4]]), C.skinShadow),
  ]);
  const lens = (x) => stroke(rrect(x, -3, 10.2, 9, 3.8), C.frame, 2.8) + path(rrect(x, -3, 10.2, 9, 3.8), '#ffffff', { opacity: 0.1 });
  return [
    shape(skull, C.skin, [
      path(smooth([[-50, -70], [-30, -66], [-36, 0], [-30, 50], [-50, 50]]), C.skinShadow),
      path(smooth([[-46, -30], [-36, -36], [-34, 6], [-46, 6]]), C.stubble, { opacity: 0.2 }),
      path(smooth([[46, -30], [36, -36], [34, 6], [46, 6]]), C.stubble, { opacity: 0.2 }),
      path(ellipse(6, -50, 20, 8), C.skinLight),
      path(ellipse(10, -54, 8, 3), '#fff4ea', { opacity: 0.85 }),
      path(ellipse(-20, 9, 7, 4.5), C.blush, { opacity: 0.35 }),
      path(ellipse(20, 9, 7, 4.5), C.blush, { opacity: 0.35 }),
    ], C.skinLine, 1.6),
    shape(ellipse(-47, 2, 8, 13.5), C.skinShadow, [path(ellipse(-46, 3, 4, 8), C.skinDeep, { opacity: 0.6 })], C.skinLine, 1.3),
    shape(ellipse(47, 2, 8, 13.5), C.skin, [path(ellipse(46, 3, 4, 8), C.skinShadow)], C.skinLine, 1.3),
    shape(beard, C.beard, [
      path(smooth([[-50, -10], [-30, -10], [-26, 60], [-50, 60]]), C.beardShadow),
      ...stipple(36, -36, 24, 72, 26, C.beardLight, 17),
    ], C.beardLine, 1.4),
    boca({ C, kind: mouthKind ?? bocaDelAnimo(mood), y: 28.5, w: 11, reposo: stroke(smooth([[-11, 29], [0, 30.5], [8, 29], [13, 26]], false), C.mouth, 2.1), sonrisa: [path(smooth([[-15, 26], [0, 28.5], [15, 26], [11, 33], [0, 35.5], [-11, 33]]), C.mouth), path(smooth([[-13.5, 26.5], [0, 29], [13.5, 26.5], [12, 29.6], [0, 31.8], [-12, 29.6]]), C.teeth)].join('') }),
    stroke(smooth([[-7, 33], [0, 34.6], [7, 33]], false), C.lip, 2),
    shape(mustache, C.beard, [], C.beardLine, 1.2),
    path(smooth([[-3, -4], [3, -4], [5, 6], [7.5, 12], [5, 17], [0, 18], [-5, 17], [-7.5, 12], [-5, 6]]), C.skin),
    path(smooth([[-7.5, 12], [-5, 17], [0, 18], [5, 17], [7.5, 12], [6, 19], [0, 21], [-6, 19]]), C.skinShadow),
    stroke(smooth([[-5.5, 4], [-7.5, 12], [-5, 17]], false), C.skinDeep, 1.2),
    path(ellipse(-3.5, 16, 1.9, 1.2), C.skinDeep),
    path(ellipse(3.5, 16, 1.9, 1.2), C.skinDeep),
    path(ellipse(2, 7, 2.3, 5), C.skinLight),
    ojos({ C, eye: eyeF, mood, blink, rx: 3.8, ry: 4.6 }),
    ...(gafas
      ? [
          lens(-16) + lens(16),
          stroke(smooth([[-6, -4], [0, -7], [6, -4]], false), C.frame, 2.4),
          stroke(smooth([[-26, -5], [-38, -6]], false), C.frame, 2.4),
          stroke(smooth([[26, -5], [38, -6]], false), C.frame, 2.4),
          stroke(smooth([[-21, -9], [-17, -10.5]], false), '#ffffff', 1.4, { opacity: 0.55 }),
          stroke(smooth([[11, -9], [15, -10.5]], false), '#ffffff', 1.4, { opacity: 0.55 }),
        ]
      : []),
    cejas({ izq: path(smooth([[-26, -16], [-20, -20], [-11, -20.5], [-6, -17.5], [-8, -15.5], [-14, -17.5], [-22, -16.5], [-25, -13.5]]), C.brow), der: path(smooth([[26, -17.5], [20, -21.5], [11, -22], [6, -19], [8, -17], [14, -19], [22, -18], [25, -15]]), C.brow), mood }),
  ].join('');
}

export function headProfile() {
  const skull = smooth([[-38, 6], [-45, -14], [-46, -36], [-34, -56], [-8, -68], [16, -64], [32, -50], [38, -28], [38, -10], [37, 0], [40, 10], [39, 22], [36, 36], [26, 47], [6, 42], [-4, 24], [-12, 14], [-24, 12]]);
  const nose = smooth([[36, -8], [41, 2], [47, 10], [50, 15], [47, 19], [41, 20], [37, 16]]);
  const beard = smooth([[-2, -10], [-6, 8], [-4, 24], [4, 38], [16, 48], [30, 54], [42, 50], [48, 40], [48, 30], [44, 24], [36, 26], [26, 24], [14, 18], [6, 10], [2, 0]]);
  return [
    shape(skull, C.skin, [
      path(ellipse(-44, -14, 20, 44, 0.1), C.skinShadow, { opacity: 0.85 }),
      path(smooth([[-44, -30], [-24, -38], [-6, -30], [-4, -8], [-16, 6], [-36, 8], [-44, -8]]), C.stubble, { opacity: 0.12 }),
      path(ellipse(8, -54, 18, 7, -0.15), C.skinLight),
      path(ellipse(12, -56, 7, 2.6, -0.15), '#fff4ea', { opacity: 0.85 }),
      path(ellipse(24, 8, 8, 5), C.blush, { opacity: 0.38 }),
    ], C.skinLine, 1.6),
    shape(smooth([[-12, -12], [-3, -9], [-2, 5], [-6, 16], [-15, 16], [-19, 2]]), C.skin, [path(ellipse(-10, 3, 4.5, 9), C.skinShadow)], C.skinLine, 1.3),
    shape(beard, C.beard, [path(smooth([[-12, -14], [10, 8], [14, 40], [26, 64], [-14, 64]]), C.beardShadow), ...stipple(26, 2, 14, 44, 34, C.beardLight, 19)], C.beardLine, 1.4),
    stroke(smooth([[38, 29.5], [44, 30], [48, 26.5]], false), C.mouth, 2),
    stroke(smooth([[39, 32], [44, 33], [47, 31.5]], false), C.lip, 2),
    shape(smooth([[32, 24], [40, 19], [48, 19], [52, 23], [46, 24], [38, 24]]), C.beard, [], C.beardLine, 1.2),
    shape(nose, C.skin, [path(smooth([[37, 15], [42, 19.5], [49, 17], [51, 23], [37, 23]]), C.skinShadow), path(ellipse(42.5, 17.5, 2.8, 1.6), C.skinDeep)], C.skinDeep, 1.2),
    shape(smooth([[30, -6], [32.5, -5.5], [33.5, -2], [32.5, 1.5], [30, 2]]), C.eye, [path(ellipse(32, -3.6, 0.9, 0.9), '#ffffff'), path(smooth([[28, -9], [35, -9], [34.5, -4], [29, -3.8]]), C.skinShadow)]),
    // Lens seen edge-on, temple arm back to the ear.
    stroke(rrect(35, -3, 2.4, 8.8, 1.6), C.frame, 2.6),
    stroke(smooth([[33, -6], [14, -7], [-6, -6]], false), C.frame, 2.4),
    path(smooth([[22, -16.5], [29, -20], [37, -19], [38, -16.5], [30, -17.2], [23, -13.5]]), C.brow),
  ].join('');
}

// ---------------------------------------------------------------- body

export const HEAD_AT = { x: 9, y: -228, s: 0.76 };

export const JOINTS = {
  cabeza: [6, -206],
  torso: [0, -114],
  brazo_sup_detras: [-14, -193], antebrazo_detras: [-15, -151], mano_detras: [-15, -113],
  brazo_sup_delante: [6, -191], antebrazo_delante: [7, -149], mano_delante: [7, -111],
  muslo_detras: [-10, -114], pierna_detras: [-10, -60], pie_detras: [-10, -10],
  muslo_delante: [12, -114], pierna_delante: [12, -60], pie_delante: [12, -10],
};

/**
 * Chuchi's «wardrobe»: the same clothes, with or without his glasses. 'singafas' is how his
 * story starts (they fell off in the tube slide); an outfit may change the head, here and in
 * the dialogue portraits (headFront).
 */
export const OUTFITS = {
  calle: {},
  singafas: {
    head: (face) => head({ ...face, gafas: false }),
    headFront: (o) => headFront({ ...o, gafas: false }),
  },
};

/** Slim and tall: maroon crew-neck sweatshirt, black jeans, white trainers. */
export const body = makeBody({
  skin: C,
  outfits: OUTFITS,
  outfit: 'calle',
  top: { style: 'hoodie', hood: false, base: '#7b2432', shadow: '#5b1824', deep: '#43101a', light: '#9b3646', line: '#2c0a10' },
  pants: { base: '#2b2c32', shadow: '#1f2025', deep: '#16171a', light: '#40434c', line: '#0c0c0e' },
  shoes: { style: 'sneaker', base: '#ecebe6', back: '#cfccc4', light: '#ffffff', line: '#8a877f', sole: '#dcd7cb', soleBack: '#bdb8ad', lace: '#c4bfb4' },
  joints: JOINTS,
  torso: [
    [-19, -206], [-29, -199], [-32, -182], [-32, -160], [-31, -140], [-30, -126], [-28, -117], [0, -114], [23, -116], [33, -120],
    [36, -134], [37, -150], [36, -168], [33, -185], [26, -199], [12, -207], [-6, -209],
  ],
  belly: 0,
  limb: 9,
  thigh: 16,
  headAt: HEAD_AT,
  head: (face) => head(face),
});

export const INFO = {
  name: 'Chuchi',
  defaultMood: 'smug',
  traits: 'cabeza afeitada con brillo, gafas cuadradas de pasta marrón oscuro, barba pelirroja recortada, media sonrisa con la boca cerrada, sudadera granate, vaquero negro y zapatillas blancas.',
};
