// Pablo, three-quarter view facing right. Same head-local construction as Fran:
//   eye line y=-2 · brow line y=-15 · nose base y=18 · mouth y=30 · face front x≈46.
// Likeness: big open grin with teeth, smiling eyes, brown hair swept up with a
// loose strand, short full beard darker than the hair, earring, tanned skin.
import { ojos, cejas, boca, bocaDelAnimo } from './frente.mjs';
import { smooth, ellipse, path, stroke, g, shape, angryLid } from './svg.mjs';
import { makeBody } from './cuerpo.mjs';

/** A tapered tuft of hair growing from (x, y) towards (tx, ty). */
function tuft(x, y, tx, ty, w = 4) {
  const mx = (x + tx) / 2 + (ty - y) * 0.15;
  const my = (y + ty) / 2 - (tx - x) * 0.15;
  return shape(smooth([[x - w, y + 1], [mx - w * 0.3, my], [tx, ty, 'c'], [mx + w * 0.4, my + w * 0.6], [x + w, y + 2]]), C.hair, [], C.hairShadow, 1.1);
}

/** Scattered dots inside a box (deterministic), to suggest a short beard. */
function stipple(n, x0, y0, w, h, color, seed = 7) {
  let st = seed;
  const r = () => ((st = (st * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => path(ellipse(x0 + r() * w, y0 + r() * h, 0.8, 0.8), color, { opacity: 0.5 }));
}

export const C = {
  skin: '#dba27e',
  skinShadow: '#bc805f',
  skinDeep: '#a4694c',
  skinLight: '#ecbe9b',
  skinLine: '#874c33',
  blush: '#d6806a',
  hair: '#5c3d28',
  hairShadow: '#3d2819',
  hairLight: '#86603f',
  beard: '#5c3f2b',
  beardShadow: '#41291b',
  beardLight: '#80593e',
  beardLine: '#24180f',
  brow: '#3f2a1c',
  eye: '#2a1a14',
  lip: '#b8604f',
  mouth: '#5a2020',
  teeth: '#f6f2e8',
  tongue: '#c75a52',
  earring: '#d7dbe1',
};

const SKULL = smooth([
  [-40, -6], [-40, -32], [-27, -50], [-4, -58], [20, -55], [37, -42], [45, -22],
  [46, -8], [44, 0], [46, 10], [45, 22], [41, 36], [31, 48], [12, 47], [0, 32], [-6, 16], [-20, 12], [-36, 6],
]);
const NOSE = smooth([
  [29.5, -7], [33, 0], [38.5, 6.5], [44.5, 11], [48.5, 14.5], [49, 18], [45.5, 20.5], [40, 20.5], [35.5, 18], [32, 13], [30, 6], [28.5, 0],
]);
const EAR = smooth([[-8, -10], [-2, -6], [-1, 4], [-4, 14], [-10, 17], [-16, 12], [-17, 0], [-14, -9]]);
const HAIR = smooth([
  [-34, 12], [-43, -8], [-45, -30], [-41, -46], [-33, -58], [-24, -64], [-18, -70], [-8, -72], [0, -78], [10, -76], [16, -82],
  [26, -78], [34, -76], [40, -68], [46, -62], [49, -52], [48, -46],
  [44, -44], [38, -46, 'c'], [32, -41], [26, -45, 'c'], [20, -40], [13, -44, 'c'], [7, -36],
  [2, -22], [-1, -8], [-6, 2], [-16, 6], [-26, 10],
]);
const STRAND = smooth([[36, -48], [44, -52], [50, -46], [50, -36], [46, -40], [42, -46]]);
const BEARD = smooth([
  [-1, -9], [-5, 6], [-4, 20], [2, 32], [10, 42], [20, 49], [31, 53], [42, 51], [50, 44], [54, 34], [53, 25],
  [47, 24], [40, 24], [31, 22], [22, 18], [13, 12], [5, 2],
]);
const STUBBLE = smooth([[2, -4], [8, 8], [18, 16], [32, 20], [46, 21], [48, 15], [34, 14], [20, 10], [10, 2], [6, -6]]);
const MUSTACHE = smooth([[23, 24], [30, 19.5], [39, 18], [47, 19.5], [53, 23], [55, 27], [50, 26], [43, 23.5], [35, 24], [28, 26]]);

function headBack() {
  return shape(HAIR, C.hair, [
    path(ellipse(-38, -14, 18, 42), C.hairShadow),
    // Short sides, a touch lighter where the hair thins.
    path(smooth([[-30, -26], [-12, -28], [-2, -14], [-3, 2], [-14, 6], [-28, 6], [-36, -8]]), C.hairShadow, { opacity: 0.55 }),
    stroke(smooth([[-30, -52], [-12, -64], [12, -70]], false), C.hairLight, 3, { opacity: 0.85 }),
    stroke(smooth([[-36, -38], [-20, -52], [2, -62]], false), C.hairLight, 2.2, { opacity: 0.6 }),
    stroke(smooth([[14, -70], [28, -72], [42, -62]], false), C.hairLight, 2.2, { opacity: 0.7 }),
    stroke(smooth([[6, -60], [20, -62], [36, -56]], false), C.hairShadow, 1.6, { opacity: 0.7 }),
  ], C.hairShadow, 1.6);
}

function face() {
  return shape(SKULL, C.skin, [
    path(smooth([[-50, -40], [-14, -44], [-6, -10], [-8, 30], [-50, 30]]), C.skinShadow),
    path(ellipse(14, -8, 12, 6), C.skinShadow, { opacity: 0.35 }),
    path(ellipse(24, -34, 18, 9, -0.2), C.skinLight),
    // High cheekbones pushed up by the smile.
    path(ellipse(26, 6, 10, 6, -0.2), C.skinLight, { opacity: 0.9 }),
    path(ellipse(25, 9, 9, 5), C.blush, { opacity: 0.4 }),
    path(STUBBLE, C.beard, { opacity: 0.18 }),
  ], C.skinLine, 1.6);
}

function ear() {
  return [
    shape(EAR, C.skin, [path(ellipse(-9, 3, 4.5, 9, 0.1), C.skinDeep, { opacity: 0.7 }), path(ellipse(-13, -2, 3, 7, 0.1), C.skinShadow)], C.skinLine, 1.4),
    // Earring: a small silver hoop on the lobe.
    stroke(ellipse(-11, 17.5, 3.2, 3.6), C.earring, 1.8),
    path(ellipse(-12.5, 15.2, 0.9, 0.9), '#ffffff'),
  ].join('');
}

function nose() {
  return shape(NOSE, C.skin, [
    path(smooth([[27, -2], [31, 3], [34, 11], [33, 16], [29, 9]]), C.skinShadow, { opacity: 0.7 }),
    path(smooth([[32, 17], [40, 20.5], [50, 18], [52, 24], [32, 24]]), C.skinShadow),
    path(ellipse(40, 17.8, 2.8, 1.7), C.skinDeep, { opacity: 0.85 }),
    path(smooth([[31.5, -3], [37.5, 4], [45, 10.5], [43, 12], [35, 6]]), C.skinLight),
  ], C.skinDeep, 1.2);
}

/** Smiling eye: the cheek pushes the lower lid up and leaves a little crease. */
function eye(which, look = 0, open = 1, smile = 0.3, angry = false) {
  const [cx, cy, rx0, ry0] = which === 'cerca' ? [13, -2, 4.2, 5.2] : [38, -3, 3, 4.8];
  const rx = rx0 * open;
  const ry = ry0 * open;
  const x = cx + look;
  const parts = [path(ellipse(x + rx * 0.3, cy - ry * 0.3, rx * 0.32, rx * 0.32), '#ffffff')];
  if (smile) parts.push(path(ellipse(x, cy + ry * (1.55 - smile), rx * 1.8, ry * 0.9), C.skin));
  if (angry) parts.push(path(angryLid(which, x, cy, rx, ry), C.skinShadow));
  return [
    shape(ellipse(x, cy, rx, ry), C.eye, parts),
    smile ? stroke(smooth([[x - rx - 1, cy + ry * 0.9], [x, cy + ry * 1.25], [x + rx + 1, cy + ry * 0.8]], false), C.skinShadow, 1.1) : '',
    // Crow's feet when smiling (outer corner of the far eye).
    which === 'lejos' && smile ? stroke(smooth([[x + rx + 2, cy + 1], [x + rx + 5, cy - 1]], false), C.skinShadow, 1) + stroke(smooth([[x + rx + 2, cy + 3], [x + rx + 5, cy + 4]], false), C.skinShadow, 1) : '',
  ].join('');
}

function happyEye(which) {
  const [cx, cy, rx] = which === 'cerca' ? [13, -1, 5] : [38, -2, 3.6];
  return stroke(smooth([[cx - rx, cy + 1.5], [cx, cy - 3.5], [cx + rx, cy + 1.5]], false), C.eye, 2.5);
}

function eyelid(which) {
  const [cx, cy, rx] = which === 'cerca' ? [13, -1, 5.4] : [38, -2, 3.8];
  return stroke(smooth([[cx - rx, cy - 1], [cx, cy + 2.4], [cx + rx, cy - 1]], false), C.skinLine, 1.8);
}

/** Arched, medium brows. */
function brows(lift = 0, knit = 0) {
  const near = smooth([[2, -13 - lift + knit], [7, -18.5 - lift], [15, -21 - lift], [23, -18.5 - lift - knit], [24.5, -15.5 - lift - knit], [16, -17.5 - lift], [8, -15.5 - lift], [3, -11 - lift + knit]]);
  const far = smooth([[32, -16.5 - lift - knit], [38, -20 - lift], [45, -17 - lift], [44.5, -14.5 - lift], [38, -17 - lift], [33, -14 - lift - knit]]);
  return path(near, C.brow) + path(far, C.brow);
}

function beard() {
  return shape(BEARD, C.beard, [
    path(smooth([[-12, -12], [6, 8], [10, 34], [20, 60], [-20, 60]]), C.beardShadow),
    path(ellipse(44, 42, 7, 6, -0.3), C.beardLight, { opacity: 0.5 }),
    // Short beard: stipple instead of long strands.
    ...stipple(40, 0, 12, 54, 40, C.beardLight),
  ], C.beardLine, 1.4);
}

function mustache() {
  return shape(MUSTACHE, C.beard, [path(ellipse(42, 20, 8, 2.4, -0.1), C.beardLight, { opacity: 0.6 })], C.beardLine, 1.2);
}

/** Mouth shapes. 'sonrisa' is Pablo's resting face: a wide grin with teeth. */
function mouth(kind = 'sonrisa') {
  const lowerLip = (pts) => stroke(smooth(pts, false), C.lip, 2.2);
  switch (kind) {
    case 'a':
      return [path(ellipse(39, 33, 9.5, 8), C.mouth), path(smooth([[31, 27], [47, 27], [45, 30], [33, 30]]), C.teeth), path(ellipse(39, 38, 5.5, 2.8), C.tongue)].join('');
    case 'o':
      return [path(ellipse(39, 32, 6, 7), C.mouth), path(ellipse(39, 35.5, 3.8, 2.2), C.tongue)].join('');
    case 'e':
      return [path(ellipse(39, 30.5, 12, 5), C.mouth), path(smooth([[29, 27.5], [49, 27.5], [47, 30], [31, 30]]), C.teeth)].join('');
    case 'm':
      return [stroke(smooth([[27, 28], [39, 30.5], [51, 27]], false), C.mouth, 2), lowerLip([[31, 31.5], [39, 33.5], [47, 31.5]])].join('');
    case 'reposo':
      // Relaxed, closed: the hint of a smile only at the far corner.
      return [stroke(smooth([[28, 28.5], [38, 30], [47, 29], [50.5, 27]], false), C.mouth, 2.1), lowerLip([[31.5, 32], [39, 33.6], [46, 32]])].join('');
    case 'triste':
      return [stroke(smooth([[28.5, 31], [38, 29.2], [48.5, 31]], false), C.mouth, 2.1), lowerLip([[32, 33], [39, 34.4], [46, 33]])].join('');
    case 'enfado':
      return [stroke(smooth([[28, 32], [33, 29.4], [43, 29.4], [49, 32]], false), C.mouth, 2.4), lowerLip([[32, 33.2], [39, 34], [46, 33.2]])].join('');
    default:
      // Wide smile showing the upper teeth, mouth only slightly open.
      return [
        path(smooth([[25, 25], [38, 27], [52, 23.5], [49, 30.5], [39, 34], [29, 32]]), C.mouth),
        path(smooth([[26, 25.5], [38, 27.5], [51, 24], [49.5, 28.4], [38, 30.8], [27.5, 29]]), C.teeth),
        stroke(smooth([[32, 28.5], [32.4, 30.2]], false), '#d9d2c4', 0.8),
        stroke(smooth([[38, 29.5], [38.2, 31]], false), '#d9d2c4', 0.8),
        stroke(smooth([[44, 28.4], [44.2, 30]], false), '#d9d2c4', 0.8),
        lowerLip([[30, 34], [39, 36.2], [48, 32]]),
      ].join('');
  }
}

function fringe() {
  return [
    // Flyaway wisps on top (pivot where they grow).
    g('mechon_1', [tuft(10, -73, 17, -84, 6), tuft(23, -73, 32, -81, 5.5)]),
    g('mechon_2', shape(STRAND, C.hair, [stroke(smooth([[38, -50], [45, -48], [47, -38]], false), C.hairLight, 1.5)], C.hairShadow, 1.2)),
  ].join('');
}

const JAW_DROP = { reposo: 0, m: 0, sonrisa: 1.5, a: 4.5, o: 3.5, e: 2 };

export function head({ mood = 'neutral', mouthKind, blink = false, look = 0 } = {}) {
  // Sad raises the inner ends of the brows; angry pulls them down towards the nose.
  const lift = mood === 'surprised' ? 5 : mood === 'happy' ? 1.5 : mood === 'angry' ? -1 : 0;
  const knit = mood === 'sad' ? 3.5 : mood === 'angry' ? -4.5 : 0;
  const open = mood === 'surprised' ? 1.2 : 1;
  const smile = mood === 'neutral' ? 0.12 : 0;
  const m = mouthKind ?? (mood === 'happy' ? 'sonrisa' : mood === 'surprised' ? 'o' : mood === 'sad' ? 'triste' : mood === 'angry' ? 'enfado' : 'reposo');
  const jaw = JAW_DROP[m] ?? 0;
  const eyes = (w) => (blink ? eyelid(w) : mood === 'happy' ? happyEye(w) : eye(w, look, open, smile, mood === 'angry'));
  return [
    g('cara', face()),
    g('pelo_detras', headBack()),
    g('oreja', ear()),
    g('mandibula', [g('barba', beard()), g('boca', mouth(m))], { transform: `translate(${jaw * 0.25} ${jaw})` }),
    g('bigote', mustache()),
    g('nariz', nose()),
    g('ojo_cerca', eyes('cerca')),
    g('ojo_lejos', eyes('lejos')),
    g('cejas', brows(lift, knit)),
    g('pelo', fringe()),
  ].join('');
}

export function guides() {
  const l = (y, label) => `<line x1="-60" x2="70" y1="${y}" y2="${y}" stroke="#2a8cff" stroke-width="0.4" stroke-dasharray="2 2"/><text x="62" y="${y - 1}" font-size="3.5" fill="#2a8cff">${label}</text>`;
  return [l(-15, 'cejas'), l(-2, 'ojos'), l(18, 'nariz'), l(30, 'boca'), `<line x1="46" x2="46" y1="-70" y2="80" stroke="#2a8cff" stroke-width="0.4" stroke-dasharray="2 2"/>`].join('');
}

// ---------------------------------------------------------------- turnaround (head)

export function headFront({ mood = 'neutral', mouthKind, blink = false } = {}) {
  const mirror = (pts) => [...pts, ...pts.slice().reverse().map(([x, y, c]) => (c ? [-x, y, c] : [-x, y]))];
  const skull = smooth(mirror([[0, -58], [26, -55], [40, -40], [44, -18], [45, 2], [42, 24], [33, 40], [18, 48]]).slice(0, -1));
  const hair = smooth([
    [-44, -8], [-47, -26], [-44, -42], [-36, -54], [-24, -64], [-12, -70], [0, -74], [12, -72], [24, -76], [36, -66], [44, -54], [47, -40], [46, -24], [44, -8],
    [40, -16], [38, -30], [32, -38, 'c'], [24, -34], [16, -40, 'c'], [8, -34], [0, -40, 'c'], [-8, -34], [-16, -39, 'c'], [-24, -33], [-32, -37, 'c'], [-38, -28], [-40, -16],
  ]);
  const wisps = [tuft(-4, -71, 1, -80, 6), tuft(11, -71, 18, -79, 5.5)].join('');
  const beard = smooth([
    [-40, -4], [-40, 16], [-34, 31], [-24, 42], [-12, 49], [0, 52], [12, 49], [24, 42], [34, 31], [40, 16], [40, -4],
    [36, 0], [34, 14], [27, 22], [16, 24], [0, 23], [-16, 24], [-27, 22], [-34, 14], [-36, 0],
  ]);
  const mustache = smooth([[-18, 25], [-10, 20], [0, 19], [10, 20], [18, 25], [20, 29], [12, 26], [0, 25], [-12, 26], [-20, 29]]);
  const eyeF = (x) => [
    shape(ellipse(x, -2, 4.2, 5.2), C.eye, [path(ellipse(x + 1.3, -3.6, 1.3, 1.3), '#ffffff'), path(ellipse(x, 4.4, 8, 4.5), C.skin)]),
    stroke(smooth([[x - 5, 2.6], [x, 4.4], [x + 5, 2.4]], false), C.skinShadow, 1.1),
  ].join('');
  return [
    shape(skull, C.skin, [
      path(smooth([[-50, -60], [-30, -60], [-36, 0], [-30, 50], [-50, 50]]), C.skinShadow),
      path(ellipse(6, -36, 20, 8), C.skinLight),
      path(ellipse(-20, 9, 8, 5), C.blush, { opacity: 0.35 }),
      path(ellipse(20, 9, 8, 5), C.blush, { opacity: 0.35 }),
    ], C.skinLine, 1.6),
    shape(ellipse(-45, 2, 7, 12), C.skinShadow, [path(ellipse(-44, 3, 3.5, 7), C.skinDeep, { opacity: 0.6 })], C.skinLine, 1.3),
    shape(ellipse(45, 2, 7, 12), C.skin, [path(ellipse(44, 3, 3.5, 7), C.skinShadow)], C.skinLine, 1.3),
    stroke(ellipse(-46, 16, 3.2, 3.6), C.earring, 1.8),
    shape(hair, C.hair, [
      path(smooth([[-52, -30], [-34, -40], [-38, 4], [-52, 4]]), C.hairShadow),
      stroke(smooth([[-26, -58], [-4, -68], [18, -70]], false), C.hairLight, 2.6, { opacity: 0.8 }),
      stroke(smooth([[-10, -56], [8, -60], [26, -56]], false), C.hairShadow, 1.6, { opacity: 0.7 }),
    ], C.hairShadow, 1.6),
    wisps,
    shape(beard, C.beard, [
      path(smooth([[-50, -10], [-30, -10], [-26, 60], [-50, 60]]), C.beardShadow),
      ...stipple(36, -36, 24, 72, 26, C.beardLight, 11),
    ], C.beardLine, 1.4),
    boca({ C, kind: mouthKind ?? bocaDelAnimo(mood), y: 28.5, w: 12, reposo: stroke(smooth([[-11, 29], [0, 30.5], [11, 29]], false), C.mouth, 2.2), sonrisa: [path(smooth([[-17, 26], [0, 28.5], [17, 26], [12, 33], [0, 36], [-12, 33]]), C.mouth), path(smooth([[-15.5, 26.5], [0, 29], [15.5, 26.5], [13.5, 30], [0, 32.5], [-13.5, 30]]), C.teeth), stroke(smooth([[-11, 36], [0, 38.5], [11, 36]], false), C.lip, 2.2)].join('') }),
    shape(mustache, C.beard, [], C.beardLine, 1.2),
    path(smooth([[-3, -6], [3, -6], [5, 6], [7.5, 12], [5, 17], [0, 18], [-5, 17], [-7.5, 12], [-5, 6]]), C.skin),
    path(smooth([[-7.5, 12], [-5, 17], [0, 18], [5, 17], [7.5, 12], [6, 19], [0, 21], [-6, 19]]), C.skinShadow),
    stroke(smooth([[-5.5, 4], [-7.5, 12], [-5, 17]], false), C.skinDeep, 1.2),
    path(ellipse(-3.5, 16, 1.9, 1.2), C.skinDeep),
    path(ellipse(3.5, 16, 1.9, 1.2), C.skinDeep),
    path(ellipse(2, 7, 2.3, 5), C.skinLight),
    ojos({ C, eye: eyeF, mood, blink, rx: 4.2, ry: 5.2 }),
    cejas({ izq: path(smooth([[-27, -15], [-21, -20], [-13, -21.5], [-6, -18.5], [-7, -16.5], [-14, -18.5], [-22, -17], [-26, -13]]), C.brow), der: path(smooth([[27, -15], [21, -20], [13, -21.5], [6, -18.5], [7, -16.5], [14, -18.5], [22, -17], [26, -13]]), C.brow), mood }),
  ].join('');
}

export function headProfile() {
  const skull = smooth([[-44, -4], [-44, -32], [-30, -52], [-6, -60], [18, -56], [33, -42], [38, -24], [38, -10], [37, 0], [40, 10], [39, 22], [36, 36], [26, 47], [6, 42], [-4, 24], [-12, 14], [-26, 10], [-40, 6]]);
  const hair = smooth([[-38, 14], [-48, -12], [-48, -32], [-42, -46], [-32, -58], [-18, -66], [-4, -72], [10, -74], [22, -70], [32, -62], [38, -50], [40, -40], [34, -38], [28, -32, 'c'], [22, -38], [14, -33, 'c'], [6, -38], [1, -30], [-2, -16], [-6, 2], [-16, 8], [-28, 14]]);
  const wisps = [tuft(2, -71, 9, -80, 6), tuft(15, -70, 23, -77, 5.5)].join('');
  const nose = smooth([[36, -8], [41, 2], [48, 10], [51, 15], [48, 19], [41, 20], [37, 16]]);
  const beard = smooth([[-2, -10], [-6, 8], [-4, 24], [4, 38], [16, 48], [30, 54], [42, 50], [48, 40], [48, 30], [44, 24], [36, 26], [26, 24], [14, 18], [6, 10], [2, 0]]);
  return [
    shape(skull, C.skin, [path(ellipse(18, -36, 16, 8), C.skinLight), path(ellipse(24, 8, 8, 5), C.blush, { opacity: 0.4 })], C.skinLine, 1.6),
    shape(hair, C.hair, [path(ellipse(-38, -14, 18, 40), C.hairShadow), stroke(smooth([[-28, -54], [-8, -66], [14, -68]], false), C.hairLight, 2.6, { opacity: 0.8 })], C.hairShadow, 1.6),
    wisps,
    shape(smooth([[-12, -10], [-4, -8], [-3, 4], [-6, 14], [-14, 14], [-18, 2]]), C.skin, [path(ellipse(-10, 3, 4, 8), C.skinShadow)], C.skinLine, 1.3),
    stroke(ellipse(-11, 17.5, 3.2, 3.6), C.earring, 1.8),
    shape(beard, C.beard, [
      path(smooth([[-12, -14], [10, 8], [14, 40], [26, 64], [-14, 64]]), C.beardShadow),
      ...stipple(26, 2, 14, 44, 34, C.beardLight, 5),
    ], C.beardLine, 1.4),
    path(smooth([[34, 26], [44, 28], [50, 24], [48, 31], [40, 33]]), C.mouth),
    path(smooth([[35, 26.5], [44, 28.5], [49.5, 25], [48, 28.5], [40, 30]]), C.teeth),
    shape(smooth([[32, 24], [40, 19], [48, 19], [52, 23], [46, 24], [38, 24]]), C.beard, [], C.beardLine, 1.2),
    shape(nose, C.skin, [path(smooth([[37, 15], [42, 19.5], [50, 17], [52, 23], [37, 23]]), C.skinShadow), path(ellipse(42.5, 17.5, 2.8, 1.6), C.skinDeep)], C.skinDeep, 1.2),
    shape(smooth([[30, -6.5], [33, -6], [34, -2], [33, 2], [30, 2.5]]), C.eye, [path(ellipse(32.5, -4, 1, 1), '#ffffff'), path(ellipse(31, 4.5, 5, 3), C.skin)]),
    stroke(smooth([[28, 1.5], [31, 3], [34, 1.5]], false), C.skinShadow, 1),
    path(smooth([[22, -15], [28, -20], [37, -18.5], [38, -16], [30, -17], [23, -12]]), C.brow),
  ].join('');
}

// ---------------------------------------------------------------- body

export const HEAD_AT = { x: 10, y: -221, s: 0.82 };

export const JOINTS = {
  cabeza: [6, -196],
  torso: [0, -104],
  brazo_sup_detras: [-14, -183], antebrazo_detras: [-15, -143], mano_detras: [-15, -107],
  brazo_sup_delante: [6, -181], antebrazo_delante: [7, -141], mano_delante: [7, -105],
  muslo_detras: [-10, -104], pierna_detras: [-10, -55], pie_detras: [-10, -10],
  muslo_delante: [12, -104], pierna_delante: [12, -55], pie_delante: [12, -10],
};

/** Slimmer build, dark fleece jacket with a sherpa collar, lighter jeans, white trainers. */
export const body = makeBody({
  skin: C,
  top: {
    style: 'sherpa', base: '#3b3b41', shadow: '#29292e', deep: '#1d1d21', light: '#5f5f68', line: '#131316', inner: '#8a8d94', innerShadow: '#5d6067',
    collar: { base: '#4d4943', shadow: '#38352f', light: '#6c665c', line: '#1b1916' },
  },
  pants: { base: '#4f6d9f', shadow: '#3b5582', deep: '#2f466d', light: '#6886b8', line: '#22314d' },
  shoes: { style: 'sneaker', base: '#ecebe6', back: '#cfccc4', light: '#ffffff', line: '#8a877f', sole: '#dcd7cb', soleBack: '#bdb8ad', lace: '#c4bfb4' },
  joints: JOINTS,
  torso: [
    [-20, -196], [-30, -189], [-33, -172], [-33, -150], [-32, -130], [-31, -116], [-29, -107], [0, -104], [24, -106], [34, -110],
    [38, -124], [39, -140], [38, -158], [35, -175], [27, -189], [12, -197], [-6, -199],
  ],
  belly: 0,
  limb: 9.5,
  thigh: 16.5,
  headAt: HEAD_AT,
  head: (face) => head(face),
});

export const INFO = {
  name: 'Pablo',
  defaultMood: 'neutral',
  traits: 'cara tranquila que al reír se le llena de dientes y ojos en ^^, pelo castaño revuelto hacia arriba, barba corta, pendiente de aro y chaqueta oscura de borreguillo.',
};
