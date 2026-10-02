// Fran, three-quarter view facing right. Head-local units: skull centre at (0,0),
// about 100 units from chin to crown. Construction lines (see guides()):
//   eye line y=-2 · brow line y=-15 · nose base y=18 · mouth y=30 · face front x≈46.
import { smooth, ellipse, path, stroke, g, shape } from './svg.mjs';
import { makeBody } from './cuerpo.mjs';

export const C = {
  skin: '#e8b296',
  skinShadow: '#c88a70',
  skinDeep: '#b0735c',
  skinLight: '#f7d0b6',
  skinLine: '#93533f',
  blush: '#e48f80',
  hair: '#2b221e',
  hairShadow: '#1a1412',
  hairLight: '#4b3e37',
  hairGrey: '#948b84',
  beard: '#2a201c',
  beardShadow: '#181210',
  beardLight: '#4a3a32',
  beardLine: '#120d0b',
  brow: '#1f1815',
  eye: '#2a1a16',
  lip: '#b5675b',
  mouth: '#5a2422',
  teeth: '#f4efe4',
  tongue: '#c45a55',
};

// ---------------------------------------------------------------- outlines

export const SKULL = smooth([
  [-40, -6], [-40, -32], [-27, -50], [-4, -58], [20, -55], [37, -42], [45, -22],
  [46, -8], [44, 0], [46, 10], [44, 22], [39, 36], [28, 46], [10, 44], [0, 30], [-6, 16], [-20, 12], [-36, 6],
]);

const NOSE = smooth([
  [29.5, -6], [32.5, 0.5], [37, 5.5], [42.5, 9], [46.5, 12], [48, 15.5], [45, 19], [40, 19.5], [35.5, 17.8], [32, 13.5], [30, 7], [28.5, 0.5],
]);

const EAR = smooth([[-8, -10], [-2, -6], [-1, 4], [-4, 14], [-10, 17], [-16, 12], [-17, 0], [-14, -9]]);

const HAIR = smooth([
  [-36, 12], [-44, -6], [-45, -20], [-42, -36], [-38, -44], [-32, -52], [-24, -56], [-18, -63], [-8, -63], [0, -68],
  [10, -65], [18, -68], [26, -62], [34, -60], [40, -52], [47, -46], [48, -38],
  [44, -36], [40, -30, 'c'], [36, -36], [30, -31, 'c'], [24, -38], [17, -32, 'c'], [11, -37],
  [5, -29], [1, -18], [-1, -6], [-6, 4], [-17, 8], [-27, 13],
]);

// Jaw beard that thickens into a long chin beard; cheeks stay bare.
const BEARD = smooth([
  [-1, -10], [-5, 4], [-5, 18], [1, 30], [9, 41], [16, 52], [22, 62], [29, 69], [39, 71], [47, 64],
  [52, 50], [55, 37], [55, 28], [49, 25], [45, 30], [38, 33], [30, 32], [22, 30], [13, 25], [6, 15], [2, 2],
]);
// Stubble shadow on the lower cheeks, above the beard line.
const STUBBLE = smooth([[0, -2], [6, 12], [16, 22], [30, 26], [44, 24], [48, 18], [36, 18], [22, 14], [10, 6], [4, -4]]);

const MUSTACHE = smooth([
  [24, 25], [30, 19.5], [38, 17.5], [46, 19], [52, 22.5], [55.5, 28], [54, 34], [50, 31], [46, 27.5], [38, 28], [31, 29],
]);

// ---------------------------------------------------------------- pieces

export function headBack() {
  // Hair mass behind the head (the "capucha" layer in the kit template).
  return shape(HAIR, C.hair, [
    path(ellipse(-40, -10, 22, 46), C.hairShadow),
    stroke(smooth([[-30, -54], [-10, -64], [16, -62]], false), C.hairLight, 3, { opacity: 0.8 }),
    stroke(smooth([[-36, -40], [-18, -54], [4, -58]], false), C.hairLight, 2.4, { opacity: 0.6 }),
    // Salt and pepper on the sides, around and above the ear.
    path(smooth([[-28, -24], [-12, -26], [-2, -14], [-3, 0], [-14, 6], [-28, 6], [-36, -8]]), C.hairGrey, { opacity: 0.14 }),
    ...[[-26, -18], [-18, -22], [-12, -10], [-30, -4], [-20, -2], [-6, -20], [-8, -4]].map(([x, y]) => stroke(`M${x} ${y}q1.5 -2.5 3.5 -3`, C.hairGrey, 1.1, { opacity: 0.8 })),
  ], C.hairShadow, 1.6);
}

export function face() {
  return shape(SKULL, C.skin, [
    // Side plane of the head in shadow (three-quarter turn).
    path(smooth([[-50, -40], [-14, -44], [-6, -10], [-8, 30], [-50, 30]]), C.skinShadow),
    // Eye sockets under a heavy brow.
    path(ellipse(14, -6, 13, 8), C.skinShadow, { opacity: 0.55 }),
    path(ellipse(39, -7, 7, 7), C.skinShadow, { opacity: 0.55 }),
    // Forehead and cheekbone light.
    path(ellipse(24, -34, 18, 9, -0.2), C.skinLight),
    path(ellipse(28, 6, 9, 5, -0.3), C.skinLight, { opacity: 0.8 }),
    // Cheek warmth.
    path(ellipse(26, 8, 9, 5), C.blush, { opacity: 0.35 }),
    // Stubble on the lower cheeks.
    path(STUBBLE, C.beard, { opacity: 0.16 }),
  ], C.skinLine, 1.6);
}

export function ear() {
  return shape(EAR, C.skin, [
    path(ellipse(-9, 3, 4.5, 9, 0.1), C.skinDeep, { opacity: 0.7 }),
    path(ellipse(-13, -2, 3, 7, 0.1), C.skinShadow),
  ], C.skinLine, 1.4);
}

export function nose() {
  return shape(NOSE, C.skin, [
    // Near side of the nose in light, underside and nostril in shadow.
    path(smooth([[27, -2], [31, 3], [34, 11], [33, 16], [29, 9]]), C.skinShadow, { opacity: 0.7 }),
    path(smooth([[32, 16.5], [40, 19.5], [48, 17], [50, 23], [32, 23]]), C.skinShadow),
    path(ellipse(39.5, 17, 2.8, 1.7), C.skinDeep, { opacity: 0.85 }),
    path(smooth([[31.5, -2], [37, 4], [44, 9.5], [42, 11], [35, 6]]), C.skinLight),
  ], C.skinDeep, 1.2);
}

/** Eyes: dark ovals with a catchlight, Nora style. Far eye narrower. */
export function eye(which, look = 0, open = 1, squint = 0, angry = false) {
  const [cx, cy, rx0, ry0] = which === 'cerca' ? [13, -2, 4.4, 5.4] : [38, -3, 3.1, 5];
  const rx = rx0 * open;
  const ry = ry0 * open;
  const x = cx + look;
  // A slightly heavy upper lid, like Fran's calm, hooded eyes.
  const top = cy - ry * 0.62;
  // Angry: the lid drops towards the nose (inner corner), narrowing the eye.
  const inner = cy - ry * 0.05;
  const outer = cy - ry * 0.6;
  const [lt, rt] = which === 'cerca' ? [outer, inner] : [inner, outer];
  const lid = angry
    ? smooth([[x - rx - 2, cy - ry - 3], [x + rx + 2, cy - ry - 3], [x + rx + 1, rt], [x, (lt + rt) / 2 - 0.4], [x - rx - 1, lt]])
    : smooth([[x - rx - 2, cy - ry - 3], [x + rx + 2, cy - ry - 3], [x + rx + 1, top + 0.6], [x, top - 0.6], [x - rx - 1, top + 1.2]]);
  const parts = [
    path(ellipse(x + rx * 0.3, cy - ry * 0.25, rx * 0.32, rx * 0.32), '#ffffff'),
    path(lid, C.skinShadow),
  ];
  // Happy: cheeks push the lower lid up into a smile-shaped eye.
  if (squint) parts.push(path(smooth([[x - rx - 2, cy + ry + 3], [x - rx - 1, cy + ry * (1 - squint)], [x, cy + ry * (0.55 - squint)], [x + rx + 1, cy + ry * (1 - squint)], [x + rx + 2, cy + ry + 3]]), C.skin));
  return shape(ellipse(x, cy, rx, ry), C.eye, parts);
}

/** Laughing eye: an upward arc. */
export function happyEye(which) {
  const [cx, cy, rx] = which === 'cerca' ? [13, -1, 5.2] : [38, -2, 3.8];
  return stroke(smooth([[cx - rx, cy + 1.5], [cx, cy - 3.5], [cx + rx, cy + 1.5]], false), C.eye, 2.6);
}

export function eyelid(which) {
  const [cx, cy, rx] = which === 'cerca' ? [13, -1, 5.6] : [38, -2, 4];
  return stroke(smooth([[cx - rx, cy - 1], [cx, cy + 2.4], [cx + rx, cy - 1]], false), C.skinLine, 1.8);
}

/** Thick straight brows, Fran's strongest facial trait. `lift` raises them, `knit` angles them. */
export function brows(lift = 0, knit = 0) {
  const near = smooth([[1, -14 - lift + knit], [9, -18.5 - lift], [20, -18 - lift], [25, -15.5 - lift - knit], [23, -12.5 - lift - knit], [11, -13.5 - lift], [2, -10.5 - lift + knit]]);
  const far = smooth([[32, -15.5 - lift - knit], [38.5, -18 - lift], [45, -16.5 - lift + knit * 0.5], [44, -13.5 - lift], [33, -12.5 - lift - knit]]);
  return path(near, C.brow) + path(far, C.brow);
}

export function beard(sway = 0) {
  const s = sway;
  const outline = s ? smooth([
    [-1, -10], [-5, 4], [-5, 18], [1, 30], [9 + s * 0.3, 41], [16 + s * 0.6, 52], [22 + s, 62], [29 + s, 69], [39 + s, 71], [47 + s, 64],
    [52 + s * 0.5, 50], [55, 37], [55, 28], [49, 25], [45, 30], [38, 33], [30, 32], [22, 30], [13, 25], [6, 15], [2, 2],
  ]) : BEARD;
  return shape(outline, C.beard, [
    // Back of the jaw in shadow; grey creeping in at the sideburn.
    path(smooth([[-12, -12], [6, 8], [10, 34], [20, 76], [-20, 76]]), C.beardShadow),
    path(smooth([[-4, -10], [2, -2], [3, 14], [-2, 22], [-6, 10]]), C.hairGrey, { opacity: 0.32 }),
    // Light on the front of the chin beard.
    path(ellipse(43 + s, 46, 7, 13, -0.35), C.beardLight, { opacity: 0.5 }),
    // Hair strands.
    ...[
      [[33, 38], [35, 50], [36 + s, 62]],
      [[42, 38], [44, 47], [43 + s, 57]],
      [[24, 36], [27, 48], [30 + s, 60]],
      [[49, 36], [50, 44], [49 + s, 50]],
      [[12, 28], [15, 38], [20 + s, 48]],
    ].map((p) => stroke(smooth(p, false), C.beardLight, 1.3, { opacity: 0.7 })),
  ], C.beardLine, 1.6);
}

/** Mouth shapes, seen between the mustache and the beard. */
export function mouth(kind = 'reposo') {
  const lowerLip = path(smooth([[30, 30], [38, 33.5], [47, 30], [44, 34.5], [38, 36], [32, 34.5]]), C.lip);
  switch (kind) {
    case 'a':
      return [path(ellipse(38.5, 33.5, 8.5, 7), C.mouth), path(smooth([[31, 29], [46, 29], [44, 31.5], [33, 31.5]]), C.teeth), path(ellipse(38.5, 37.5, 5, 2.6), C.tongue)].join('');
    case 'o':
      return [path(ellipse(38.5, 33, 5.5, 6.2), C.mouth), path(ellipse(38.5, 36, 3.5, 2), C.tongue)].join('');
    case 'e':
      return [path(ellipse(38.5, 32, 10, 4.2), C.mouth), path(smooth([[30, 29.5], [47, 29.5], [45, 31.5], [32, 31.5]]), C.teeth)].join('');
    case 'm':
      return path(smooth([[29, 30], [38, 32], [48, 29.5], [44, 33], [38, 34], [32, 33]]), C.lip);
    case 'triste':
      return [stroke(smooth([[30, 31.5], [38, 30.2], [47, 31.5]], false), C.mouth, 1.8), path(smooth([[31, 32.5], [38, 34], [46, 32.5], [43, 35.5], [38, 36.2], [33, 35.5]]), C.lip)].join('');
    case 'enfado':
      return [stroke(smooth([[29.5, 32.5], [34, 30], [42, 30], [47.5, 32.5]], false), C.mouth, 2.2), path(smooth([[32, 33], [38, 33.8], [45, 33], [42, 35.4], [35, 35.4]]), C.lip)].join('');
    case 'sonrisa':
      return [path(smooth([[27, 28], [38, 31], [50, 27], [46, 35], [38, 38], [31, 35]]), C.mouth), path(smooth([[29, 28.5], [48, 28], [46, 31], [31, 31.2]]), C.teeth)].join('');
    default:
      return [stroke(smooth([[30, 29.5], [38, 31], [47, 29]], false), C.mouth, 1.8), lowerLip].join('');
  }
}

export function mustache() {
  return shape(MUSTACHE, C.beard, [
    path(ellipse(44, 20, 10, 3, -0.1), C.beardLight, { opacity: 0.7 }),
    path(ellipse(26, 26, 6, 5), C.beardShadow),
  ], C.beardLine, 1.4);
}

/** Front hair: the fringe tufts sit over the forehead (pivots let them sway). */
export function fringe() {
  const tuft1 = smooth([[18, -50], [30, -50], [41, -42], [44, -32], [38, -36], [32, -31], [28, -40], [20, -44]]);
  const tuft2 = smooth([[0, -48], [12, -52], [22, -46], [24, -34], [18, -38], [12, -33], [8, -42]]);
  return [
    g('mechon_1', shape(tuft1, C.hair, [stroke(smooth([[24, -47], [34, -44], [40, -37]], false), C.hairLight, 1.8)], C.hairShadow, 1.2)),
    g('mechon_2', shape(tuft2, C.hair, [stroke(smooth([[6, -46], [14, -46], [20, -40]], false), C.hairLight, 1.6)], C.hairShadow, 1.2)),
  ].join('');
}

/** Construction guides for review sheets. */
export function guides() {
  const l = (y, label) => `<line x1="-60" x2="70" y1="${y}" y2="${y}" stroke="#2a8cff" stroke-width="0.4" stroke-dasharray="2 2"/><text x="62" y="${y - 1}" font-size="3.5" fill="#2a8cff">${label}</text>`;
  return [l(-15, 'cejas'), l(-2, 'ojos'), l(18, 'nariz'), l(30, 'boca'), `<line x1="46" x2="46" y1="-70" y2="80" stroke="#2a8cff" stroke-width="0.4" stroke-dasharray="2 2"/>`].join('');
}

const JAW_DROP = { reposo: 0, m: 0, sonrisa: 1, a: 4.5, o: 3.5, e: 2 };

export function head({ mood = 'neutral', mouthKind, blink = false, look = 0, sway = 0 } = {}) {
  // Sad raises the inner ends of the brows; angry pulls them down towards the nose.
  const lift = mood === 'surprised' ? 5 : mood === 'happy' ? 2 : mood === 'angry' ? -1 : 0;
  const knit = mood === 'sad' ? 3.5 : mood === 'angry' ? -4.5 : 0;
  const open = mood === 'surprised' ? 1.22 : 1;
  const squint = mood === 'happy' ? 0.55 : 0;
  const angry = mood === 'angry';
  const m = mouthKind ?? (mood === 'happy' ? 'sonrisa' : mood === 'surprised' ? 'o' : mood === 'sad' ? 'triste' : angry ? 'enfado' : 'reposo');
  // The beard is the jaw: it drops when the mouth opens.
  const jaw = JAW_DROP[m] ?? 0;
  return [
    g('cara', face()),
    g('pelo_detras', headBack()),
    g('oreja', ear()),
    g('mandibula', [g('barba', beard(sway)), g('boca', mouth(m))], { transform: `translate(${jaw * 0.25} ${jaw})` }),
    g('bigote', mustache()),
    g('nariz', nose()),
    g('ojo_cerca', blink ? eyelid('cerca') : squint ? happyEye('cerca') : eye('cerca', look, open, 0, angry)),
    g('ojo_lejos', blink ? eyelid('lejos') : squint ? happyEye('lejos') : eye('lejos', look, open, 0, angry)),
    g('cejas', brows(lift, knit)),
    g('pelo', fringe()),
  ].join('');
}

// ---------------------------------------------------------------- body

export const HEAD_AT = { x: 10, y: -221, s: 0.82 };

export const JOINTS = {
  cabeza: [6, -196],
  torso: [0, -104],
  brazo_sup_detras: [-16, -183], antebrazo_detras: [-17, -143], mano_detras: [-17, -107],
  brazo_sup_delante: [6, -181], antebrazo_delante: [7, -141], mano_delante: [7, -105],
  muslo_detras: [-11, -104], pierna_detras: [-11, -55], pie_detras: [-11, -10],
  muslo_delante: [13, -104], pierna_delante: [13, -55], pie_delante: [13, -10],
};

/** Stocky build, teal tee, jeans and dark sneakers. */
export const body = makeBody({
  skin: C,
  top: { style: 'tee', base: '#2e8a8c', shadow: '#1f6567', deep: '#174f51', light: '#4fb0ae', line: '#154647', seamBack: '#123e40' },
  pants: { base: '#3e5279', shadow: '#2c3b5a', deep: '#222e47', light: '#566c96', line: '#1d2840' },
  shoes: { style: 'sneaker', base: '#2f3138', back: '#26282e', light: '#4b4e57', line: '#15161a', sole: '#ece7dc', soleBack: '#c9c2b4' },
  joints: JOINTS,
  torso: [
    [-22, -196], [-33, -189], [-37, -172], [-38, -150], [-36, -130], [-34, -116], [-31, -107], [0, -104], [26, -106], [38, -110],
    [44, -122], [47, -138], [45, -156], [40, -174], [30, -188], [14, -197], [-6, -199],
  ],
  belly: 1,
  limb: 10,
  thigh: 19,
  headAt: HEAD_AT,
  head: (face) => head(face),
});

export const INFO = {
  name: 'Fran',
  defaultMood: 'neutral',
  traits: 'bigote que baja a una perilla larga, cejas gruesas y rectas, canas en las patillas, camiseta verde azulada y complexión ancha.',
};

// ---------------------------------------------------------------- turnaround (head)

/** Front view: symmetric, for portraits and moments facing the camera. */
export function headFront({ mood = 'neutral' } = {}) {
  const mirror = (pts) => [...pts, ...pts.slice().reverse().map(([x, y, c]) => (c ? [-x, y, c] : [-x, y]))];
  const skull = smooth(mirror([[0, -58], [26, -55], [40, -40], [45, -18], [46, 2], [43, 22], [35, 37], [20, 45]]).slice(0, -1));
  const hair = smooth([
    [-47, 0], [-51, -22], [-48, -36], [-42, -48], [-34, -55], [-28, -63], [-18, -64], [-10, -70], [0, -67], [8, -72], [18, -66], [28, -66], [36, -57], [44, -50], [48, -38], [51, -22], [47, 0],
    [42, -8], [40, -24], [32, -32, 'c'], [24, -28], [16, -36, 'c'], [8, -30], [0, -37, 'c'], [-8, -30], [-16, -35, 'c'], [-24, -28], [-33, -32, 'c'], [-40, -24], [-42, -8],
  ]);
  const beard = smooth([
    [-41, -4], [-42, 16], [-36, 32], [-26, 46], [-14, 60], [0, 68], [14, 60], [26, 46], [36, 32], [42, 16], [41, -4],
    [37, 0], [35, 14], [28, 24], [18, 29], [10, 34], [0, 36], [-10, 34], [-18, 29], [-28, 24], [-35, 14], [-37, 0],
  ]);
  const mustache = smooth([[-20, 30], [-14, 22], [-5, 20], [0, 22], [5, 20], [14, 22], [20, 30], [22, 37], [17, 34], [10, 28], [0, 28], [-10, 28], [-17, 34], [-22, 37]]);
  const eyeF = (x) => shape(ellipse(x, -2, 4.4, 5.4), C.eye, [
    path(ellipse(x + 1.4, -3.4, 1.4, 1.4), '#ffffff'),
    path(smooth([[x - 7, -10], [x + 7, -10], [x + 5.5, -5.6], [x, -6.6], [x - 5.5, -5.4]]), C.skinShadow),
  ]);
  const happy = mood === 'happy';
  return [
    shape(skull, C.skin, [
      path(smooth([[-50, -60], [-30, -60], [-36, 0], [-30, 50], [-50, 50]]), C.skinShadow),
      path(ellipse(-16, -6, 12, 8), C.skinShadow, { opacity: 0.5 }),
      path(ellipse(16, -6, 12, 8), C.skinShadow, { opacity: 0.5 }),
      path(ellipse(6, -36, 20, 8), C.skinLight),
      path(ellipse(-22, 12, 8, 5), C.blush, { opacity: 0.3 }),
      path(ellipse(22, 12, 8, 5), C.blush, { opacity: 0.3 }),
    ], C.skinLine, 1.6),
    shape(ellipse(-46, 2, 7, 12), C.skinShadow, [path(ellipse(-45, 3, 3.5, 7), C.skinDeep, { opacity: 0.6 })], C.skinLine, 1.3),
    shape(ellipse(46, 2, 7, 12), C.skin, [path(ellipse(45, 3, 3.5, 7), C.skinShadow)], C.skinLine, 1.3),
    shape(hair, C.hair, [
      path(smooth([[-52, -30], [-34, -40], [-38, 4], [-52, 4]]), C.hairShadow),
      path(smooth([[-46, -20], [-40, -22], [-40, -2], [-46, -2]]), C.hairGrey, { opacity: 0.3 }),
      path(smooth([[46, -20], [40, -22], [40, -2], [46, -2]]), C.hairGrey, { opacity: 0.3 }),
      stroke(smooth([[-24, -56], [0, -62], [22, -58]], false), C.hairLight, 2.6, { opacity: 0.8 }),
    ], C.hairShadow, 1.6),
    shape(beard, C.beard, [
      path(smooth([[-50, -10], [-30, -10], [-26, 70], [-50, 70]]), C.beardShadow),
      path(ellipse(8, 50, 10, 12), C.beardLight, { opacity: 0.5 }),
      ...[[-20, 40], [-8, 44], [6, 44], [18, 40]].map(([x, y]) => stroke(smooth([[x, y], [x * 0.9, y + 10], [x * 0.7, y + 18]], false), C.beardLight, 1.3, { opacity: 0.7 })),
    ], C.beardLine, 1.6),
    happy
      ? path(smooth([[-14, 30], [0, 33], [14, 30], [10, 39], [0, 42], [-10, 39]]), C.mouth) + path(smooth([[-12, 30.5], [0, 33], [12, 30.5], [11, 33], [0, 35], [-11, 33]]), C.teeth)
      : [stroke(smooth([[-10, 31], [0, 32.5], [10, 31]], false), C.mouth, 1.8), path(smooth([[-8, 32], [0, 35], [8, 32], [5, 36.5], [0, 37.5], [-5, 36.5]]), C.lip)].join(''),
    shape(mustache, C.beard, [path(ellipse(8, 22, 8, 2.5), C.beardLight, { opacity: 0.6 })], C.beardLine, 1.3),
    // Nose seen from the front: a soft bulb with shadowed nostrils.
    path(smooth([[-3, -6], [3, -6], [5, 6], [8, 12], [5, 17], [0, 18], [-5, 17], [-8, 12], [-5, 6]]), C.skin),
    path(smooth([[-8, 12], [-5, 17], [0, 18], [5, 17], [8, 12], [6, 19], [0, 21], [-6, 19]]), C.skinShadow),
    stroke(smooth([[-6, 4], [-8, 12], [-5, 17]], false), C.skinDeep, 1.2),
    path(ellipse(-3.5, 16, 2, 1.3), C.skinDeep),
    path(ellipse(3.5, 16, 2, 1.3), C.skinDeep),
    path(ellipse(2, 8, 2.5, 5), C.skinLight),
    happy ? stroke(smooth([[-21, 0], [-16, -5], [-11, 0]], false), C.eye, 2.6) + stroke(smooth([[11, 0], [16, -5], [21, 0]], false), C.eye, 2.6) : eyeF(-16) + eyeF(16),
    path(smooth([[-27, -15], [-20, -19.5], [-8, -18.5], [-5, -15.5], [-8, -13], [-20, -14], [-26, -12]]), C.brow),
    path(smooth([[27, -15], [20, -19.5], [8, -18.5], [5, -15.5], [8, -13], [20, -14], [26, -12]]), C.brow),
  ].join('');
}

/** Profile, facing right. */
export function headProfile() {
  const skull = smooth([[-44, -4], [-44, -32], [-30, -52], [-6, -60], [18, -56], [33, -42], [38, -24], [38, -10], [37, 0], [40, 10], [38, 22], [34, 36], [22, 46], [4, 40], [-4, 24], [-12, 14], [-26, 10], [-40, 6]]);
  const hair = smooth([[-38, 14], [-48, -12], [-48, -30], [-44, -42], [-36, -52], [-28, -58], [-18, -62], [-8, -69], [2, -66], [12, -70], [22, -63], [32, -58], [38, -48], [42, -36], [34, -36], [30, -30, 'c'], [24, -36], [16, -32, 'c'], [8, -38], [2, -30], [-2, -16], [-6, 2], [-16, 8], [-28, 14]]);
  const nose = smooth([[36, -8], [41, 2], [48, 10], [51, 15], [48, 19], [41, 20], [37, 16]]);
  const beard = smooth([[-2, -10], [-6, 8], [-4, 26], [4, 42], [14, 56], [24, 66], [36, 68], [44, 58], [48, 44], [47, 30], [43, 25], [36, 30], [26, 28], [14, 22], [6, 12], [2, 0]]);
  const mustache = smooth([[30, 25], [36, 19], [45, 19], [50, 24], [50, 31], [45, 28], [38, 28]]);
  return [
    shape(skull, C.skin, [
      path(ellipse(28, -6, 10, 8), C.skinShadow, { opacity: 0.55 }),
      path(ellipse(18, -36, 16, 8), C.skinLight),
      path(ellipse(24, 8, 8, 5), C.blush, { opacity: 0.35 }),
    ], C.skinLine, 1.6),
    shape(hair, C.hair, [
      path(ellipse(-38, -14, 18, 40), C.hairShadow),
      path(smooth([[-26, -24], [-8, -26], [-2, -10], [-4, 2], [-18, 8], [-30, 4]]), C.hairGrey, { opacity: 0.16 }),
      stroke(smooth([[-28, -52], [-8, -62], [14, -60]], false), C.hairLight, 2.6, { opacity: 0.8 }),
    ], C.hairShadow, 1.6),
    shape(smooth([[-12, -10], [-4, -8], [-3, 4], [-6, 14], [-14, 14], [-18, 2]]), C.skin, [path(ellipse(-10, 3, 4, 8), C.skinShadow)], C.skinLine, 1.3),
    shape(beard, C.beard, [
      path(smooth([[-12, -14], [10, 8], [14, 40], [26, 74], [-14, 74]]), C.beardShadow),
      path(ellipse(38, 48, 7, 12, -0.3), C.beardLight, { opacity: 0.5 }),
      ...[[[24, 36], [27, 48], [30, 60]], [[34, 38], [37, 48], [37, 58]], [[14, 28], [17, 40], [22, 52]]].map((p) => stroke(smooth(p, false), C.beardLight, 1.3, { opacity: 0.7 })),
    ], C.beardLine, 1.6),
    stroke(smooth([[38, 30], [44, 31], [48, 30]], false), C.mouth, 1.8),
    path(smooth([[38, 31], [44, 33], [48, 31], [46, 35], [41, 35]]), C.lip),
    shape(mustache, C.beard, [], C.beardLine, 1.3),
    shape(nose, C.skin, [path(smooth([[37, 15], [42, 19.5], [50, 17], [52, 23], [37, 23]]), C.skinShadow), path(ellipse(42.5, 17.5, 2.8, 1.6), C.skinDeep)], C.skinDeep, 1.2),
    shape(smooth([[30, -6.5], [33, -6], [34, -2], [33, 2.5], [30, 3]]), C.eye, [path(ellipse(32.5, -4, 1, 1), '#ffffff'), path(smooth([[28, -9], [36, -9], [35, -4.5], [29, -4.5]]), C.skinShadow)]),
    path(smooth([[22, -15], [30, -18.5], [38, -17], [39, -14], [30, -13.5], [23, -12]]), C.brow),
  ].join('');
}
