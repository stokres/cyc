// Guille, three-quarter view facing right. Same head-local construction as Fran:
//   eye line y=-2 · brow line y=-15 · nose base y=18 · mouth y=30 · face front x≈46.
// Likeness: dark hair worn a bit longer, thick dark brows, dark eyes, strong
// straight nose, defined jaw with only a shadow of stubble, wide smile that
// creases the cheeks. Tallest of the crew, athletic, muted ochre Hawaiian shirt.
import { ojos, cejas, boca, bocaDelAnimo } from './frente.mjs';
import { smooth, ellipse, path, stroke, g, shape, angryLid } from './svg.mjs';
import { makeBody } from './cuerpo.mjs';

export const C = {
  skin: '#e2af8c',
  skinShadow: '#c38a68',
  skinDeep: '#a86f4f',
  skinLight: '#f0c7a7',
  skinLine: '#8c5437',
  blush: '#d88a73',
  hair: '#211814',
  hairShadow: '#130e0b',
  hairLight: '#41332c',
  stubble: '#2b1e18',
  brow: '#1d1512',
  eye: '#22150f',
  lip: '#b8695a',
  mouth: '#5a2020',
  teeth: '#f6f2e8',
  tongue: '#c75a52',
};

function stipple(n, x0, y0, w, h, color, seed = 7, op = 0.4) {
  let st = seed;
  const r = () => ((st = (st * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n * 2 }, () => path(ellipse(x0 + r() * w, y0 + r() * h, 0.42, 0.42), color, { opacity: op * 0.7 }));
}

// Defined jaw and chin: no beard hides them.
const SKULL = smooth([
  [-40, -6], [-41, -32], [-28, -52], [-4, -60], [20, -57], [37, -44], [45, -24],
  [46, -8], [44, 0], [46, 10], [47, 22], [45.5, 34], [41, 44], [32, 50], [18, 51], [6, 44], [-2, 30], [-16, 14], [-34, 6],
]);
const NOSE = smooth([
  [29.5, -7], [33, 0], [38.5, 6.5], [44.5, 11], [48.5, 14.5], [49, 18], [45.5, 20.5], [40, 20.5], [35.5, 18], [32, 13], [30, 6], [28.5, 0],
]);
const EAR = smooth([[-8, -10], [-2, -6], [-1, 4], [-4, 14], [-10, 17], [-16, 12], [-17, 0], [-14, -9]]);
// Hair worn a bit longer: over the top of the ear and down the nape.
const HAIR = smooth([
  [-30, 10], [-42, -2], [-45, -18], [-43, -38], [-35, -53], [-24, -62], [-14, -66], [-4, -66], [6, -72], [16, -69], [26, -71], [35, -63], [43, -57], [49, -47], [52, -36],
  [49, -29], [44, -32], [40, -25, 'c'], [34, -33], [28, -28, 'c'], [22, -35], [15, -31, 'c'], [9, -36],
  [3, -26], [0, -14], [-2, -4], [-8, 0], [-16, 0], [-22, 6],
]);
const LOCK = smooth([[16, -48], [30, -50], [43, -43], [47, -31], [43, -24], [39, -33], [31, -39], [22, -40]]);
const STUBBLE = smooth([
  [-1, -6], [2, 10], [7, 26], [16, 42], [28, 51], [39, 46], [43, 34], [46, 24], [44, 20], [36, 22], [26, 20], [16, 14], [8, 4], [3, -8],
]);
const UPPER_LIP = smooth([[24, 24.5], [33, 20.5], [43, 20], [50, 23], [51, 26], [44, 25], [34, 25.5]]);

function face(happy) {
  return shape(SKULL, C.skin, [
    path(smooth([[-50, -40], [-14, -44], [-6, -10], [-8, 30], [-50, 30]]), C.skinShadow),
    path(ellipse(14, -7, 12, 6), C.skinShadow, { opacity: 0.4 }),
    path(ellipse(24, -36, 18, 9, -0.2), C.skinLight),
    path(ellipse(26, 6, 10, 6, -0.2), C.skinLight, { opacity: 0.85 }),
    path(ellipse(25, 9, 9, 5), C.blush, { opacity: 0.35 }),
    // Jaw underside in shadow, and a light on the chin.
    path(smooth([[-4, 28], [10, 46], [30, 54], [10, 60], [-10, 40]]), C.skinShadow, { opacity: 0.8 }),
    path(ellipse(30, 45, 7, 3.5, -0.2), C.skinLight, { opacity: 0.6 }),
    stroke(smooth([[30, 46.5], [30.5, 49.5]], false), C.skinShadow, 1, { opacity: 0.8 }),
    // A shadow of stubble, not a beard.
    path(STUBBLE, C.stubble, { opacity: 0.2 }),
    path(UPPER_LIP, C.stubble, { opacity: 0.22 }),
    ...stipple(40, 4, 14, 44, 34, C.stubble, 21, 0.35),
    // Smile creases.
    happy ? stroke(smooth([[42, 15], [47, 24], [46.5, 32]], false), C.skinShadow, 1.3) : '',
  ], C.skinLine, 1.6);
}

function ear() {
  return shape(EAR, C.skin, [path(ellipse(-9, 3, 4.5, 9, 0.1), C.skinDeep, { opacity: 0.7 }), path(ellipse(-13, -2, 3, 7, 0.1), C.skinShadow)], C.skinLine, 1.4);
}

function hair() {
  return shape(HAIR, C.hair, [
    path(ellipse(-38, -10, 18, 40), C.hairShadow),
    stroke(smooth([[-32, -50], [-14, -62], [10, -66]], false), C.hairLight, 3, { opacity: 0.85 }),
    stroke(smooth([[-38, -34], [-24, -48], [-2, -58]], false), C.hairLight, 2.2, { opacity: 0.6 }),
    stroke(smooth([[-34, -14], [-30, -4], [-24, 2]], false), C.hairLight, 1.6, { opacity: 0.6 }),
  ], C.hairShadow, 1.6);
}

function nose() {
  return shape(NOSE, C.skin, [
    path(smooth([[27, -2], [31, 3], [34, 11], [33, 16], [29, 9]]), C.skinShadow, { opacity: 0.7 }),
    path(smooth([[32, 17], [40, 20.5], [50, 18], [52, 24], [32, 24]]), C.skinShadow),
    path(ellipse(40, 17.8, 2.8, 1.7), C.skinDeep, { opacity: 0.85 }),
    path(smooth([[31.5, -3], [37.5, 4], [45, 10.5], [43, 12], [35, 6]]), C.skinLight),
  ], C.skinDeep, 1.2);
}

function eye(which, look = 0, open = 1, angry = false) {
  const [cx, cy, rx0, ry0] = which === 'cerca' ? [13, -2, 4.3, 4.9] : [38, -3, 3.1, 4.6];
  const rx = rx0 * open;
  const ry = ry0 * open;
  const x = cx + look;
  return shape(ellipse(x, cy, rx, ry), C.eye, [
    path(ellipse(x + rx * 0.3, cy - ry * 0.3, rx * 0.32, rx * 0.32), '#ffffff'),
    path(angry ? angryLid(which, x, cy, rx, ry) : smooth([[x - rx - 2, cy - ry - 3], [x + rx + 2, cy - ry - 3], [x + rx + 1, cy - ry * 0.55], [x, cy - ry * 0.75], [x - rx - 1, cy - ry * 0.5]]), C.skinShadow),
  ]);
}

function happyEye(which) {
  const [cx, cy, rx] = which === 'cerca' ? [13, -1, 5] : [38, -2, 3.6];
  return stroke(smooth([[cx - rx, cy + 1.5], [cx, cy - 3.5], [cx + rx, cy + 1.5]], false), C.eye, 2.6);
}

function eyelid(which) {
  const [cx, cy, rx] = which === 'cerca' ? [13, -1, 5.4] : [38, -2, 3.8];
  return stroke(smooth([[cx - rx, cy - 1], [cx, cy + 2.4], [cx + rx, cy - 1]], false), C.skinLine, 1.8);
}

/** Thick, dark, slightly arched brows. */
function brows(lift = 0, knit = 0) {
  const near = smooth([[1, -14 - lift + knit], [8, -19 - lift], [19, -19.8 - lift], [25, -16.5 - lift - knit], [24, -13.6 - lift - knit], [12, -14.8 - lift], [2, -11 - lift + knit]]);
  const far = smooth([[31, -16 - lift - knit], [38, -19.6 - lift], [45, -17.2 - lift + knit * 0.5], [44, -14.6 - lift], [32, -13.4 - lift - knit]]);
  return path(near, C.brow) + path(far, C.brow);
}

function mouth(kind = 'reposo') {
  const lowerLip = (pts) => stroke(smooth(pts, false), C.lip, 2.3);
  switch (kind) {
    case 'a':
      return [path(ellipse(39, 32, 9, 7.5), C.mouth), path(smooth([[31.5, 26.5], [46.5, 26.5], [44.5, 29.5], [33.5, 29.5]]), C.teeth), path(ellipse(39, 36.5, 5.5, 2.8), C.tongue)].join('');
    case 'o':
      return [path(ellipse(39, 31.5, 6, 6.8), C.mouth), path(ellipse(39, 35, 3.8, 2.2), C.tongue)].join('');
    case 'e':
      return [path(ellipse(39, 30, 11.5, 4.8), C.mouth), path(smooth([[29.5, 27], [48.5, 27], [46.5, 29.5], [31.5, 29.5]]), C.teeth)].join('');
    case 'm':
      return [stroke(smooth([[28.5, 28.5], [39, 30], [49, 28]], false), C.mouth, 2), lowerLip([[31.5, 31.8], [39, 33.4], [46.5, 31.8]])].join('');
    case 'triste':
      return [stroke(smooth([[28.5, 31], [38.5, 29.2], [48.5, 31]], false), C.mouth, 2.1), lowerLip([[32, 33], [38.5, 34.4], [45.5, 33]])].join('');
    case 'enfado':
      return [stroke(smooth([[28, 32], [33, 29.4], [43.5, 29.4], [49, 32]], false), C.mouth, 2.4), lowerLip([[32, 33.2], [38.5, 34], [45.5, 33.2]])].join('');
    case 'sonrisa':
      // Wide grin with the upper teeth, like in his photo.
      return [
        path(smooth([[25, 25.5], [38, 27.5], [52, 24], [49.5, 31.5], [39, 36], [29, 33.5]]), C.mouth),
        path(smooth([[26, 26], [38, 28], [51, 24.6], [49.5, 28.8], [38, 31.6], [27.5, 29.8]]), C.teeth),
        stroke(smooth([[33, 28.8], [33.3, 30.6]], false), '#d9d2c4', 0.8),
        stroke(smooth([[38.5, 29.6], [38.7, 31.4]], false), '#d9d2c4', 0.8),
        stroke(smooth([[44, 28.6], [44.2, 30.2]], false), '#d9d2c4', 0.8),
        lowerLip([[30, 35.5], [39, 38], [48, 33.5]]),
      ].join('');
    default:
      return [stroke(smooth([[29, 29], [38.5, 30.6], [48, 28.8]], false), C.mouth, 2.1), lowerLip([[31.5, 32.4], [38.5, 34], [45.5, 32.4]])].join('');
  }
}

function locks() {
  return [
    g('mechon_1', shape(LOCK, C.hair, [stroke(smooth([[22, -46], [34, -46], [42, -38]], false), C.hairLight, 1.8)], C.hairShadow, 1.3)),
  ].join('');
}

export function head({ mood = 'neutral', mouthKind, blink = false, look = 0 } = {}) {
  // Sad raises the inner ends of the brows; angry pulls them down towards the nose.
  const lift = mood === 'surprised' ? 5 : mood === 'happy' ? 1.5 : mood === 'angry' ? -1 : 0;
  const knit = mood === 'sad' ? 3.5 : mood === 'angry' ? -4.5 : 0;
  const open = mood === 'surprised' ? 1.2 : 1;
  const m = mouthKind ?? (mood === 'happy' ? 'sonrisa' : mood === 'surprised' ? 'o' : mood === 'sad' ? 'triste' : mood === 'angry' ? 'enfado' : 'reposo');
  const eyes = (w) => (blink ? eyelid(w) : mood === 'happy' ? happyEye(w) : eye(w, look, open, mood === 'angry'));
  return [
    g('cara', face(m === 'sonrisa')),
    g('oreja', ear()),
    g('pelo_detras', hair()),
    // No beard to act as the jaw: the mouth shapes carry the speech.
    g('mandibula', g('boca', mouth(m), { transform: 'translate(-3.5 0.5)' }), { transform: 'translate(0 0)' }),
    g('nariz', nose()),
    g('ojo_cerca', eyes('cerca')),
    g('ojo_lejos', eyes('lejos')),
    g('cejas', brows(lift, knit)),
    g('pelo', locks()),
  ].join('');
}

export function guides() {
  const l = (y, label) => `<line x1="-60" x2="70" y1="${y}" y2="${y}" stroke="#2a8cff" stroke-width="0.4" stroke-dasharray="2 2"/><text x="62" y="${y - 1}" font-size="3.5" fill="#2a8cff">${label}</text>`;
  return [l(-15, 'cejas'), l(-2, 'ojos'), l(18, 'nariz'), l(30, 'boca'), `<line x1="46" x2="46" y1="-70" y2="80" stroke="#2a8cff" stroke-width="0.4" stroke-dasharray="2 2"/>`].join('');
}

// ---------------------------------------------------------------- turnaround (head)

export function headFront({ mood = 'neutral', mouthKind, blink = false } = {}) {
  const mirror = (pts) => [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y])];
  const skull = smooth(mirror([[0, -60], [26, -56], [40, -42], [44, -20], [45, 2], [43, 24], [37, 40], [26, 50], [12, 54]]).slice(0, -1));
  const hair = smooth([
    [-46, -4], [-49, -20], [-46, -38], [-38, -52], [-28, -60], [-16, -68], [-4, -66], [6, -73], [18, -68], [30, -66], [38, -56], [46, -42], [49, -20], [46, -4],
    [42, -10], [40, -24], [33, -32, 'c'], [26, -28], [20, -36, 'c'], [12, -30], [4, -36, 'c'], [-4, -30], [-12, -34, 'c'], [-20, -28], [-30, -32, 'c'], [-38, -22], [-42, -10],
  ]);
  const lock = smooth([[-6, -44], [8, -48], [22, -42], [28, -30], [24, -24], [18, -32], [8, -36], [0, -36]]);
  const stubble = smooth([[-40, -4], [-38, 18], [-30, 34], [-16, 47], [0, 52], [16, 47], [30, 34], [38, 18], [40, -4], [34, 12], [24, 22], [0, 22], [-24, 22], [-34, 12]]);
  const eyeF = (x) => shape(ellipse(x, -2, 4.3, 4.9), C.eye, [
    path(ellipse(x + 1.3, -3.4, 1.3, 1.3), '#ffffff'),
    path(smooth([[x - 7, -10], [x + 7, -10], [x + 5.5, -4.8], [x, -5.8], [x - 5.5, -4.6]]), C.skinShadow),
  ]);
  return [
    shape(skull, C.skin, [
      path(smooth([[-50, -60], [-30, -60], [-36, 0], [-30, 56], [-50, 56]]), C.skinShadow),
      path(ellipse(6, -38, 20, 8), C.skinLight),
      path(ellipse(-20, 9, 8, 5), C.blush, { opacity: 0.3 }),
      path(ellipse(20, 9, 8, 5), C.blush, { opacity: 0.3 }),
      path(stubble, C.stubble, { opacity: 0.2 }),
      path(smooth([[-16, 24], [0, 20], [16, 24], [12, 26], [0, 25], [-12, 26]]), C.stubble, { opacity: 0.24 }),
      ...stipple(40, -34, 18, 68, 32, C.stubble, 23, 0.35),
      path(ellipse(0, 50, 7, 3), C.skinLight, { opacity: 0.6 }),
    ], C.skinLine, 1.6),
    shape(ellipse(-45, 4, 7, 12), C.skinShadow, [path(ellipse(-44, 5, 3.5, 7), C.skinDeep, { opacity: 0.6 })], C.skinLine, 1.3),
    shape(ellipse(45, 4, 7, 12), C.skin, [path(ellipse(44, 5, 3.5, 7), C.skinShadow)], C.skinLine, 1.3),
    shape(hair, C.hair, [path(smooth([[-52, -30], [-34, -40], [-38, 6], [-52, 6]]), C.hairShadow), stroke(smooth([[-26, -60], [-4, -66], [18, -64]], false), C.hairLight, 2.6, { opacity: 0.8 })], C.hairShadow, 1.6),
    shape(lock, C.hair, [stroke(smooth([[2, -42], [14, -42], [22, -34]], false), C.hairLight, 1.6)], C.hairShadow, 1.2),
    boca({ C, kind: mouthKind ?? bocaDelAnimo(mood), y: 29.5, w: 11, reposo: [stroke(smooth([[-10, 29.5], [0, 31], [10, 29.5]], false), C.mouth, 2.1), stroke(smooth([[-7, 33.5], [0, 35], [7, 33.5]], false), C.lip, 2.2)].join(''), sonrisa: [path(smooth([[-17, 27], [0, 29.5], [17, 27], [12, 35], [0, 38.5], [-12, 35]]), C.mouth), path(smooth([[-15.5, 27.5], [0, 30], [15.5, 27.5], [13.5, 31], [0, 33.5], [-13.5, 31]]), C.teeth), stroke(smooth([[-11, 38], [0, 40.5], [11, 38]], false), C.lip, 2.3), stroke(smooth([[-22, 18], [-24, 27], [-21, 34]], false), C.skinShadow, 1.2), stroke(smooth([[22, 18], [24, 27], [21, 34]], false), C.skinShadow, 1.2)].join('') }),
    path(smooth([[-3, -6], [3, -6], [5, 6], [7.5, 12], [5, 17], [0, 18], [-5, 17], [-7.5, 12], [-5, 6]]), C.skin),
    path(smooth([[-7.5, 12], [-5, 17], [0, 18], [5, 17], [7.5, 12], [6, 19], [0, 21], [-6, 19]]), C.skinShadow),
    stroke(smooth([[-5.5, 4], [-7.5, 12], [-5, 17]], false), C.skinDeep, 1.2),
    path(ellipse(-3.5, 16, 1.9, 1.2), C.skinDeep),
    path(ellipse(3.5, 16, 1.9, 1.2), C.skinDeep),
    path(ellipse(2, 7, 2.3, 5), C.skinLight),
    ojos({ C, eye: eyeF, mood, blink, rx: 4.3, ry: 4.9 }),
    cejas({ izq: path(smooth([[-27, -15], [-21, -20], [-10, -20.5], [-5, -17], [-7, -14.5], [-17, -16], [-25, -12.5]]), C.brow), der: path(smooth([[27, -15], [21, -20], [10, -20.5], [5, -17], [7, -14.5], [17, -16], [25, -12.5]]), C.brow), mood }),
  ].join('');
}

export function headProfile() {
  const skull = smooth([[-44, -4], [-44, -32], [-30, -52], [-6, -60], [18, -56], [33, -42], [38, -24], [38, -10], [37, 0], [40, 10], [39, 22], [38, 34], [36, 45], [26, 51], [10, 48], [0, 32], [-10, 16], [-26, 10], [-40, 6]]);
  const hair = smooth([[-30, 10], [-44, -2], [-48, -18], [-46, -40], [-36, -54], [-24, -62], [-12, -66], [-2, -66], [8, -72], [18, -66], [30, -60], [38, -48], [41, -34], [36, -36], [31, -29, 'c'], [25, -36], [18, -31, 'c'], [10, -36], [4, -26], [0, -14], [-4, -4], [-12, 0], [-20, 4]]);
  const nose = smooth([[36, -8], [41, 2], [48, 10], [51, 15], [48, 19], [41, 20], [37, 16]]);
  const stubble = smooth([[-4, -6], [0, 12], [8, 30], [18, 46], [30, 50], [37, 40], [39, 28], [36, 24], [28, 22], [18, 16], [8, 6], [0, -8]]);
  return [
    shape(skull, C.skin, [
      path(ellipse(18, -36, 16, 8), C.skinLight),
      path(ellipse(24, 8, 8, 5), C.blush, { opacity: 0.35 }),
      path(stubble, C.stubble, { opacity: 0.2 }),
      ...stipple(24, 4, 14, 32, 32, C.stubble, 27, 0.35),
      path(smooth([[0, 34], [16, 48], [30, 54], [10, 58], [-8, 40]]), C.skinShadow, { opacity: 0.8 }),
    ], C.skinLine, 1.6),
    shape(smooth([[-12, -10], [-4, -8], [-3, 4], [-6, 14], [-14, 14], [-18, 2]]), C.skin, [path(ellipse(-10, 3, 4, 8), C.skinShadow)], C.skinLine, 1.3),
    shape(hair, C.hair, [path(ellipse(-38, -12, 18, 40), C.hairShadow), stroke(smooth([[-28, -54], [-8, -64], [14, -64]], false), C.hairLight, 2.6, { opacity: 0.8 })], C.hairShadow, 1.6),
    stroke(smooth([[38, 29.5], [44, 30.2], [48, 29]], false), C.mouth, 2),
    stroke(smooth([[39, 32.5], [44, 33.6], [47.5, 32]], false), C.lip, 2.2),
    shape(nose, C.skin, [path(smooth([[37, 15], [42, 19.5], [50, 17], [52, 23], [37, 23]]), C.skinShadow), path(ellipse(42.5, 17.5, 2.8, 1.6), C.skinDeep)], C.skinDeep, 1.2),
    shape(smooth([[30, -6], [33, -5.5], [34, -2], [33, 1.5], [30, 2]]), C.eye, [path(ellipse(32.5, -3.6, 1, 1), '#ffffff'), path(smooth([[28, -9], [36, -9], [35, -4.5], [29, -4]]), C.skinShadow)]),
    path(smooth([[21, -14.5], [29, -19.5], [38, -18], [39, -15.5], [29, -15.6], [22, -11.5]]), C.brow),
  ].join('');
}

// ---------------------------------------------------------------- body

export const HEAD_AT = { x: 5, y: -241, s: 0.8 };

export const JOINTS = {
  cabeza: [3, -214],
  torso: [0, -118],
  brazo_sup_detras: [-16, -201], antebrazo_detras: [-17, -158], mano_detras: [-17, -118],
  brazo_sup_delante: [8, -199], antebrazo_delante: [9, -156], mano_delante: [9, -116],
  muslo_detras: [-11, -118], pierna_detras: [-11, -63], pie_detras: [-11, -10],
  muslo_delante: [13, -118], pierna_delante: [13, -63], pie_delante: [13, -10],
};

/** Tallest and athletic: broad shoulders, narrow waist, muted ochre Hawaiian shirt, jeans. */
export const body = makeBody({
  skin: C,
  top: {
    // Loud on purpose: bright mustard with green palm leaves, red hibiscus and white flowers.
    style: 'shirt', base: '#e2a32e', shadow: '#b67c1c', deep: '#8a5a10', light: '#f5c95f', line: '#5a3a08', seamBack: '#6e4810', button: '#fff6e0',
    pattern: { leaf: '#2c8a52', vein: '#1b5c35', flower: '#fff4dc', hibiscus: '#d93b33', centre: '#ffd34a', opacity: 0.95, scale: 1.15 },
  },
  pants: { base: '#46608f', shadow: '#334a73', deep: '#273a5c', light: '#6380b2', line: '#1d2a44' },
  shoes: { style: 'sneaker', base: '#ad7a4a', back: '#8d6038', light: '#cd9c6b', line: '#4d3018', sole: '#efe8dc', soleBack: '#c9c1b2', lace: '#efe8dc' },
  joints: JOINTS,
  torso: [
    [-12, -212], [-22, -209], [-30, -202], [-34, -189], [-35, -170], [-33, -150], [-30, -132], [-28, -121], [0, -118], [24, -120], [32, -124],
    [36, -140], [40, -160], [43, -178], [38, -196], [26, -208], [12, -215], [-6, -217],
  ],
  belly: 0,
  limb: 11,
  thigh: 18,
  headAt: HEAD_AT,
  head: (face) => head(face),
});

export const INFO = {
  name: 'Guille',
  defaultMood: 'neutral',
  traits: 'el más alto y de complexión atlética, pelo oscuro algo largo, cejas gruesas, solo una sombra de barba, sonrisa amplia, camisa hawaiana bien cantosa y vaqueros.',
};
