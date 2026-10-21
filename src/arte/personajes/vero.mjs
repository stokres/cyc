// Vero, the Bar del Brío's waitress, three-quarter view facing right. Same head-local
// construction as Fran:
//   eye line y=-2 · brow line y=-15 · nose base y=18 · mouth y=30 · face front x≈46.
// Likeness (docs/CAPITULO2.md): Cuban, young, tall and good-looking; warm brown skin and
// full lips (the very tones of her close-up in the trailer, src/ui/trailer.ts), big dark
// eyes, dark hair pulled up into a high bun with a few loose strands, small gold hoops.
// Black short-sleeved tee, short dark apron tied at the waist. Not playable: she has the
// same body rig and the same faces as the four (docs/ESTILO.md, P8), plus a nervous one.
import { ojos, cejas, iris, brillo } from './frente.mjs';
import { smooth, ellipse, path, stroke, g, shape } from './svg.mjs';
import { makeBody } from './cuerpo.mjs';

export const C = {
  // Skin: the trailer's close-up (#b67a52 lit, #9c623e, #6e4028 in shade), as a cartoon in 3 tones.
  skin: '#b87a52',
  skinShadow: '#9a5f3d',
  skinDeep: '#7b4a2d',
  skinLight: '#d09566',
  skinLine: '#592f1c',
  blush: '#cc6648',
  hair: '#2b1b15',
  hairShadow: '#150c09',
  hairLight: '#5c3d2e',
  tie: '#9a2f45',
  tieShadow: '#6e1e2c',
  tieLight: '#c25a70',
  brow: '#24150f',
  eye: '#1d100b',
  iris: '#4d2b17',
  irisLight: '#85532f',
  // Lips: the trailer's wine tones (#6e1e2c above, #86283a below).
  lipUp: '#6e1e2c',
  lip: '#86283a',
  lipLight: '#c06a7c',
  lipLine: '#431019',
  mouth: '#3a0f17',
  teeth: '#f6f2e8',
  tongue: '#c4575a',
  gold: '#e3b445',
  goldShadow: '#a8761c',
  goldLight: '#fff1b8',
  sweat: '#bfe3f2',
  sweatLine: '#6fa6bf',
};

const gauss = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));

/**
 * Full lips between x = xL and xR, on the mouth line cy. One builder for the 3/4 view and
 * the front, and for every mouth: `open` opens it (cavity, teeth, tongue), `lift` raises both
 * corners (smile) or lowers them (sad), `far` raises only the right corner (a smirk), `wave`
 * makes it wobble, `thUp` and `thLow` are the thickness of each lip.
 */
function labios({ xL, xR, cy, open = 0, lift = 0, far = 0, wave = 0, thUp = 4.2, thLow = 6.1, bow = 1, dientes = 0, lengua = false }) {
  const N = 11;
  const ts = Array.from({ length: N }, (_, i) => i / (N - 1));
  const X = (t) => xL + (xR - xL) * t;
  const env = (t) => Math.max(0, Math.sin(Math.PI * t)) ** 0.55;
  const corner = (t) => cy - lift * (2 * t - 1) ** 2 - far * t ** 3 + wave * Math.sin(t * Math.PI * 3);
  const op = (t) => open * Math.max(0, Math.sin(Math.PI * t)) ** 0.7;
  const top = (t) => corner(t) - op(t) * 0.42;
  const bot = (t) => corner(t) + op(t) * 0.58;
  const bump = (t) => bow * (0.9 * (gauss(t, 0.34, 0.12) + gauss(t, 0.66, 0.12)) - 0.6 * gauss(t, 0.5, 0.07));
  const outerUp = (t) => top(t) - (thUp + bump(t)) * env(t);
  const outerLow = (t) => bot(t) + thLow * env(t) ** 0.85;
  const P = (fn, list = ts) => list.map((t) => [X(t), fn(t)]);
  const corners = (pts) => pts.map((p, i) => (i === 0 || i === pts.length - 1 ? [p[0], p[1], 'c'] : p));
  const inner = (pts) => pts.slice(1, -1).reverse();
  const out = [];
  if (open > 0.4) {
    const cav = smooth([...corners(P(top)), ...inner(P(bot))]);
    const shade = [];
    if (dientes) {
      const tt = ts.filter((t) => t >= 0.08 && t <= 0.92);
      shade.push(path(smooth([...P((t) => top(t) - 0.4, tt), ...P((t) => top(t) + dientes * (0.7 + 0.3 * Math.sin(Math.PI * t)), tt).reverse()]), C.teeth));
    }
    if (lengua) shade.push(path(ellipse(X(0.5), bot(0.5) - open * 0.2, (xR - xL) * 0.2, open * 0.22), C.tongue));
    out.push(shape(cav, C.mouth, shade));
  }
  out.push(path(smooth([...corners(P(outerUp)), ...inner(P(top))]), C.lipUp));
  out.push(path(smooth([...corners(P(bot)), ...inner(P(outerLow))]), C.lip));
  if (thLow > 4) out.push(path(ellipse(X(0.46), bot(0.5) + thLow * 0.52, (xR - xL) * 0.13, 0.85), C.lipLight, { opacity: 0.55 }));
  if (open <= 0.4) out.push(stroke(smooth(P(corner), false), C.lipLine, 1.1));
  out.push(stroke(smooth(P(outerUp), false), C.lipLine, 0.8, { opacity: 0.55 }), stroke(smooth(P(outerLow), false), C.lipLine, 0.8, { opacity: 0.45 }));
  return out.join('');
}

/** What each mouth shape looks like: hw = width relative to the resting mouth. */
const BOCAS = {
  reposo: { hw: 1, lift: 0.5, far: 0.4 },
  // Her resting face: a wry half smile, the far corner higher.
  picara: { hw: 1, lift: 0.2, far: 2.8, thLow: 5.8 },
  sonrisa: { hw: 1.1, open: 5.4, lift: 2.4, far: 0.8, dientes: 2.8, lengua: true },
  a: { hw: 0.9, open: 8.6, dientes: 2.8, lengua: true, thUp: 4, thLow: 5.8 },
  e: { hw: 1.08, open: 4, lift: 1, dientes: 2.8, thUp: 3.7, thLow: 5.2 },
  o: { hw: 0.6, open: 8.4, lengua: true, thUp: 4.5, thLow: 5.9 },
  m: { hw: 0.96, thUp: 3.7, thLow: 5 },
  triste: { hw: 0.96, lift: -1.8, thUp: 3.7, thLow: 6.3 },
  enfado: { hw: 1, lift: -1.2, open: 1.8, dientes: 1.6, thUp: 2.8, thLow: 3.8 },
  nervioso: { hw: 0.9, wave: 0.8, lift: -0.4, thUp: 3.4, thLow: 4.8 },
};
BOCAS.sorpresa = BOCAS.o;

function boca34(kind) {
  const p = BOCAS[kind] ?? BOCAS.reposo;
  return labios({ thUp: 4.2, thLow: 6.1, ...p, xL: 37.1 - 9 * p.hw, xR: 37.1 + 9 * p.hw, cy: 30.4 });
}
function bocaFrente(kind) {
  const p = BOCAS[kind] ?? BOCAS.reposo;
  return labios({ ...p, xL: -12.5 * p.hw, xR: 12.5 * p.hw, cy: 30, thUp: (p.thUp ?? 4.4) + 0.4, thLow: (p.thLow ?? 6.2) + 0.4 });
}

/** The mouth each mood shows when nobody is talking. */
const BOCA_DEL_ANIMO = { neutral: 'reposo', smug: 'picara', happy: 'sonrisa', surprised: 'o', sad: 'triste', angry: 'enfado', nervous: 'nervioso' };

// ---------------------------------------------------------------- 3/4 head

// A softer jaw than the men's, with a rounded chin.
const SKULL = smooth([
  [-40, -6], [-41, -32], [-28, -52], [-4, -60], [20, -57], [37, -44], [45, -24],
  [46, -8], [44, 0], [46, 10], [46.5, 21], [44, 32], [38.5, 42], [29, 48.5], [18, 49.5], [7, 43], [-1, 29], [-16, 14], [-34, 6],
]);
const NOSE = smooth([
  [30.5, -6], [33.5, 0], [37.8, 5.5], [42, 9.5], [44.8, 12.8], [45.6, 16.4], [43, 19], [39, 19.6], [35, 17.8], [32.5, 13], [30.8, 6], [29.5, 0],
]);
const EAR = smooth([[-8, -10], [-2, -6], [-1, 4], [-4, 14], [-10, 17], [-16, 12], [-17, 0], [-14, -9]]);
// Hair pulled back off the face: the mass over the skull, ending in a soft hairline.
const HAIR = smooth([
  [-32, 13], [-41, 0], [-44, -18], [-42, -38], [-34, -54], [-21, -63], [-5, -68], [12, -67], [27, -61], [37, -54], [42.5, -46], [44.5, -39, 'c'],
  [37, -41.5], [28, -44.5], [18, -44], [10, -38.5], [5, -28], [3, -14], [1.5, -4], [-5, 5], [-14, 11], [-23, 15],
]);
const BUN = smooth([
  [-34, -66], [-38, -75], [-33, -84], [-19, -88], [-5, -84], [0, -75], [-4, -66], [-18, -62],
]);
// A loose lock in front of the ear that flicks out at the end.
const STRAND = smooth([
  [2, -36], [4.2, -22], [3, -8], [1.5, 6], [2.5, 15], [7.5, 21, 'c'], [6, 13], [8, 3], [9.5, -10], [9.5, -24], [8, -37, 'c'],
]);
const WISP = smooth([[20, -44], [24, -48], [29, -45], [25, -46.5], [21, -42.5]]);

function face() {
  return shape(SKULL, C.skin, [
    path(smooth([[-50, -40], [-14, -44], [-6, -10], [-8, 30], [-50, 30]]), C.skinShadow),
    path(ellipse(14, -7, 12, 6), C.skinShadow, { opacity: 0.35 }),
    path(ellipse(24, -36, 18, 9, -0.2), C.skinLight),
    path(ellipse(27, 6, 10, 6, -0.2), C.skinLight, { opacity: 0.85 }),
    path(ellipse(25, 10, 9, 5), C.blush, { opacity: 0.4 }),
    // Underside of the jaw in shadow, and a light on the chin.
    path(smooth([[-4, 27], [10, 44], [28, 52], [10, 58], [-10, 40]]), C.skinShadow, { opacity: 0.8 }),
    path(ellipse(30, 43.5, 6, 3, -0.2), C.skinLight, { opacity: 0.55 }),
  ], C.skinLine, 1.6);
}

function ear() {
  return [
    shape(EAR, C.skin, [path(ellipse(-9, 3, 4.5, 9, 0.1), C.skinDeep, { opacity: 0.7 }), path(ellipse(-13, -2, 3, 7, 0.1), C.skinShadow)], C.skinLine, 1.4),
    // Small gold hoop on the lobe.
    stroke(ellipse(-10.5, 20.5, 3.5, 4.3), C.goldShadow, 2.4),
    stroke(ellipse(-10.5, 20.5, 3.5, 4.3), C.gold, 1.6),
    path(ellipse(-12.5, 18.6, 0.8, 0.8), C.goldLight),
  ].join('');
}

function bun() {
  return shape(BUN, C.hair, [
    path(smooth([[-42, -70], [-27, -70], [-25, -60], [-42, -60]]), C.hairShadow, { opacity: 0.8 }),
    path(smooth([[-36, -78], [-28, -85], [-18, -87], [-8, -82], [-14, -83], [-24, -81], [-32, -75]]), C.hairLight, { opacity: 0.9 }),
    // The hair coiled round on itself.
    stroke(smooth([[-31, -76], [-20, -83], [-8, -77]], false), C.hairShadow, 1.2, { opacity: 0.8 }),
    stroke(smooth([[-28, -70], [-18, -76], [-8, -70]], false), C.hairShadow, 1.2, { opacity: 0.7 }),
    stroke(smooth([[-12, -83], [-5, -76], [-7, -68]], false), C.hairLight, 1.4, { opacity: 0.7 }),
  ], C.hairShadow, 1.6);
}

function pelo() {
  return shape(HAIR, C.hair, [
    path(ellipse(-40, -8, 17, 38), C.hairShadow, { opacity: 0.55 }),
    stroke(smooth([[40, -52], [22, -63], [0, -67]], false), C.hairLight, 3, { opacity: 0.85 }),
    stroke(smooth([[40, -44], [20, -54], [-2, -58], [-20, -60]], false), C.hairLight, 2.2, { opacity: 0.6 }),
    stroke(smooth([[26, -42], [8, -50], [-14, -52], [-30, -48]], false), C.hairShadow, 1.6, { opacity: 0.7 }),
    stroke(smooth([[-36, -34], [-26, -20], [-20, -4]], false), C.hairLight, 1.6, { opacity: 0.5 }),
    stroke(smooth([[-40, -22], [-33, -8], [-28, 6]], false), C.hairLight, 1.4, { opacity: 0.45 }),
  ], C.hairShadow, 1.6);
}

/** The hair tie round the base of the bun, over the hair. */
function goma() {
  const ring = smooth([[-35, -65], [-31, -70], [-18, -72], [-4, -70], [0, -65], [-5, -61.5], [-18, -60], [-31, -61.5]]);
  return shape(ring, C.tie, [
    path(smooth([[-37, -59], [-2, -59], [-5, -63], [-18, -62], [-31, -63]]), C.tieShadow),
    stroke(smooth([[-29, -68], [-18, -70.2], [-7, -68.5]], false), C.tieLight, 1.5, { opacity: 0.9 }),
    stroke(smooth([[-25, -68], [-25.5, -62]], false), C.tieShadow, 1, { opacity: 0.7 }),
    stroke(smooth([[-11, -68.5], [-11.5, -62.5]], false), C.tieShadow, 1, { opacity: 0.7 }),
  ], C.tieShadow, 1.3);
}

function nose() {
  return shape(NOSE, C.skin, [
    path(smooth([[27, -2], [31, 3], [34, 11], [33, 16], [29, 9]]), C.skinShadow, { opacity: 0.7 }),
    path(smooth([[32, 16.5], [40, 20], [47, 17.8], [49, 24], [32, 24]]), C.skinShadow),
    path(ellipse(39.5, 17.4, 2.8, 1.6), C.skinDeep, { opacity: 0.85 }),
    path(smooth([[32, -2], [37.5, 4], [43, 9], [41.8, 10.6], [35, 6]]), C.skinLight),
    path(ellipse(43.2, 13.6, 1.5, 1.1), C.skinLight, { opacity: 0.8 }),
  ], C.skinDeep, 1.2);
}

/** Heaviness of the upper lid (fraction of the eye it covers) for each mood: [outer corner, inner corner]. */
const PARPADO = { neutral: [0.06, 0.06], smug: [0.2, 0.2], happy: [0.1, 0.1], surprised: [0, 0], sad: [0.38, 0.05], angry: [0.15, 0.55], nervous: [0.04, 0.04] };

/** Big dark eye with an iris that is lighter below, a heavy upper lash line and a flick at the outer corner. */
function eye(which, look = 0, mood = 'neutral') {
  const [cx, cy, rx0, ry0] = which === 'cerca' ? [13, -2, 5.8, 6.6] : [38.5, -3, 4.1, 6];
  const open = mood === 'surprised' ? 1.2 : 1;
  const rx = rx0 * open;
  const ry = ry0 * open;
  const x = cx + look;
  const [co, ci] = PARPADO[mood] ?? PARPADO.neutral;
  // Outer corner is on the left for the near eye, on the right for the far one.
  const sgn = which === 'cerca' ? -1 : 1;
  const yo = cy - ry + 2 * ry * co;
  const yi = cy - ry + 2 * ry * ci;
  const [yl, yr] = sgn < 0 ? [yo, yi] : [yi, yo];
  const lid = [[x - rx - 2, yl - 0.2], [x, (yl + yr) / 2 - 0.5], [x + rx + 2, yr - 0.2]];
  const lashes = smooth([[x - rx - 1.2, yl + 0.2], [x - rx * 0.4, (yl + yr) / 2 - 1.2 + (yl - yr) * 0.2], [x + rx * 0.5, (yl + yr) / 2 - 1], [x + rx + 1.2, yr + 0.2]], false);
  const ox = x + sgn * (rx + 1.2);
  return [
    shape(ellipse(x, cy, rx, ry), C.eye, [
      ...iris(x, cy, rx, ry, C),
      path(smooth([[x - rx, cy + ry * 0.35], [x, cy + ry * 0.95], [x + rx, cy + ry * 0.35], [x, cy + ry * 0.55]]), C.irisLight, { opacity: 0.6 }),
      path(ellipse(x + rx * 0.3, cy - ry * 0.3, rx * 0.34, rx * 0.34), '#ffffff'),
      brillo(x, cy, rx, ry),
      path(smooth([[lid[0][0] - 1, cy - ry - 3], [lid[2][0] + 1, cy - ry - 3], lid[2], lid[1], lid[0]]), C.skinShadow),
    ]),
    stroke(lashes, C.eye, 2),
    stroke(smooth([[ox, (sgn < 0 ? yl : yr) + 0.2], [ox + sgn * 2.4, (sgn < 0 ? yl : yr) - 1.9]], false), C.eye, 1.4),
  ].join('');
}

function happyEye(which) {
  const [cx, cy, rx] = which === 'cerca' ? [13, -1, 5.2] : [38, -2, 3.8];
  const sgn = which === 'cerca' ? -1 : 1;
  return stroke(smooth([[cx - rx, cy + 1.5], [cx, cy - 3.8], [cx + rx, cy + 1.5]], false), C.eye, 2.6) +
    stroke(smooth([[cx + sgn * rx, cy + 1.3], [cx + sgn * (rx + 2.2), cy - 0.7]], false), C.eye, 1.4);
}

function eyelid(which) {
  const [cx, cy, rx] = which === 'cerca' ? [13, -1, 5.6] : [38, -2, 4];
  const sgn = which === 'cerca' ? -1 : 1;
  return stroke(smooth([[cx - rx, cy - 1], [cx, cy + 2.6], [cx + rx, cy - 1]], false), C.eye, 2) +
    stroke(smooth([[cx + sgn * rx, cy - 1], [cx + sgn * (rx + 2.2), cy - 2.6]], false), C.eye, 1.4);
}

/** Arched, groomed brows. `cocked` lifts only the far one (the wry look). */
function brows(lift = 0, knit = 0, cocked = 0) {
  const near = smooth([[2, -13 - lift + knit], [8, -18.5 - lift], [17, -20.8 - lift], [24, -17.6 - lift - knit], [23.5, -15.6 - lift - knit], [16, -17.6 - lift], [8, -15.4 - lift], [3, -11.2 - lift + knit]]);
  const far = smooth([[31, -17 - lift - knit - cocked], [37, -20.8 - lift - cocked], [44, -18.2 - lift + knit * 0.5 - cocked], [43.5, -16.2 - lift - cocked], [37, -17.8 - lift - cocked], [31.5, -14.8 - lift - knit - cocked]]);
  return path(near, C.brow) + path(far, C.brow);
}

function gota(x, y, k = 1) {
  const d = smooth([[x, y - 5 * k, 'c'], [x + 2.6 * k, y - 0.5 * k], [x + 2.2 * k, y + 2.6 * k], [x, y + 3.8 * k], [x - 2.2 * k, y + 2.6 * k], [x - 2.6 * k, y - 0.5 * k]]);
  return shape(d, C.sweat, [path(ellipse(x - 0.8 * k, y + 1.6 * k, 0.7 * k, 1.1 * k), '#ffffff', { opacity: 0.8 })], C.sweatLine, 0.9);
}

function pelillos() {
  return [
    g('mechon_2', shape(STRAND, C.hair, [stroke(smooth([[6.5, -32], [6.5, -10], [4.5, 8], [3.5, 16]], false), C.hairLight, 1.2, { opacity: 0.8 })], C.hairShadow, 1.2)),
    shape(WISP, C.hair, [], C.hairShadow, 0.8),
  ].join('');
}

export function head({ mood = 'smug', mouthKind, blink = false, look = 0 } = {}) {
  // Sad raises the inner ends of the brows; angry pulls them down towards the nose.
  const lift = mood === 'surprised' ? 5 : mood === 'happy' ? 1.5 : mood === 'nervous' ? 2.5 : mood === 'angry' ? -1 : 0;
  const knit = mood === 'sad' ? 3.5 : mood === 'nervous' ? 2.2 : mood === 'angry' ? -4.5 : 0;
  const cocked = mood === 'smug' ? 3.2 : 0;
  const m = mouthKind ?? BOCA_DEL_ANIMO[mood] ?? 'reposo';
  const mira = look || (mood === 'nervous' ? 2 : 0);
  const eyes = (w) => (blink ? eyelid(w) : mood === 'happy' ? happyEye(w) : eye(w, mira, mood));
  return [
    // A touch flatter than drawn, so her bun does not make her taller than Guille.
    g('moño', bun(), { transform: 'translate(-18 -62) scale(1 0.8) translate(18 62)' }),
    g('cara', face()),
    g('pelo_detras', pelo()),
    g('oreja', ear()),
    g('goma', goma()),
    // No beard to act as the jaw: the mouth shapes carry the speech.
    g('mandibula', g('boca', boca34(m))),
    // Smile creases.
    m === 'sonrisa' ? stroke(smooth([[42.5, 14], [47, 22], [46.5, 30]], false), C.skinShadow, 1.2) : '',
    g('nariz', nose()),
    g('ojo_cerca', eyes('cerca')),
    g('ojo_lejos', eyes('lejos')),
    g('cejas', brows(lift, knit, cocked)),
    mood === 'nervous' ? gota(33, -33) : '',
    g('pelo', pelillos()),
  ].join('');
}

export function guides() {
  const l = (y, label) => `<line x1="-60" x2="70" y1="${y}" y2="${y}" stroke="#2a8cff" stroke-width="0.4" stroke-dasharray="2 2"/><text x="62" y="${y - 1}" font-size="3.5" fill="#2a8cff">${label}</text>`;
  return [l(-15, 'cejas'), l(-2, 'ojos'), l(18, 'nariz'), l(30, 'boca'), `<line x1="46" x2="46" y1="-70" y2="80" stroke="#2a8cff" stroke-width="0.4" stroke-dasharray="2 2"/>`].join('');
}

// ---------------------------------------------------------------- turnaround (head)

export function headFront({ mood = 'smug', mouthKind, blink = false } = {}) {
  const mirror = (pts) => [...pts, ...pts.slice().reverse().map(([x, y, c]) => (c ? [-x, y, c] : [-x, y]))];
  const skull = smooth(mirror([[0, -56], [21, -53], [33, -43], [38, -24], [39, -2], [37, 16], [31, 32], [22, 44], [10, 51]]).slice(0, -1));
  const hair = smooth([
    [-40, -12], [-43, -26], [-38, -42], [-30, -53], [-16, -59], [0, -61], [16, -59], [30, -53], [38, -42], [43, -26], [40, -12],
    [36, -16], [36, -28], [31, -36], [24, -40.5], [12, -43.5], [0, -45], [-12, -43.5], [-24, -40.5], [-31, -36], [-36, -28], [-36, -16],
  ]);
  const bunF = smooth([[-18, -61], [-20, -69], [-12, -77], [0, -81.5], [12, -77], [20, -69], [18, -61], [0, -58]]);
  const ring = smooth([[-19, -60], [-10, -63.5], [0, -64], [10, -63.5], [19, -60], [10, -56.5], [0, -56], [-10, -56.5]]);
  const strand = smooth([[-38, -18], [-38, -2], [-36.5, 12], [-32.5, 24], [-28.5, 29], [-30.5, 31.5, 'c'], [-34, 21], [-35, 8], [-33.5, -8], [-33.5, -19]]);
  const sgn = mood === 'nervous' ? 2 : 0;
  const eyeF = (x) => [
    shape(ellipse(x + sgn, -2, 5.7, 6.3), C.eye, [
      ...iris(x + sgn, -2, 5.7, 6.3, C, 0),
      path(smooth([[x + sgn - 5.7, 2], [x + sgn, 6], [x + sgn + 5.7, 2], [x + sgn, 3.2]]), C.irisLight, { opacity: 0.6 }),
      path(ellipse(x + sgn + 1.6, -4, 1.7, 1.7), '#ffffff'),
      brillo(x + sgn, -2, 5.7, 6.3),
      path(smooth([[x - 8, -11.5], [x + 8, -11.5], [x + 6.4, mood === 'smug' ? -4.2 : -6.4], [x, mood === 'smug' ? -5 : -7.2], [x - 6.4, mood === 'smug' ? -4.2 : -6.4]]), C.skinShadow),
    ]),
    // Lash line with a flick at the outer corner.
    stroke(smooth([[x - 7, -2.4], [x - 3.8, -8.2], [x + 2, -8.6], [x + 6.8, -5.2]], false), C.eye, 2),
    // The flick floats over the lid when it droops.
    mood === 'sad' || mood === 'angry' ? '' : stroke(smooth([[x + (x < 0 ? -7 : 6.8), x < 0 ? -2.4 : -5.2], [x + (x < 0 ? -9.6 : 9.4), x < 0 ? -4.8 : -7.4]], false), C.eye, 1.4),
  ].join('');
  const blinkOrHappy = blink || mood === 'happy';
  const flicks = blinkOrHappy ? [-1, 1].map((s) => stroke(smooth([[s * 22, -1.6], [s * 24.6, -3.8]], false), C.eye, 1.4)).join('') : '';
  const cejaIzq = (l = 0, k = 0) => path(smooth([[-27, -14 - l - k], [-22, -19.5 - l], [-13, -21.5 - l], [-6, -18.5 - l + k], [-7.5, -16.4 - l + k], [-14, -18.7 - l], [-22, -16.5 - l], [-26, -12.4 - l - k]]), C.brow);
  const cejaDer = (l = 0, k = 0) => path(smooth([[27, -14 - l - k], [22, -19.5 - l], [13, -21.5 - l], [6, -18.5 - l + k], [7.5, -16.4 - l + k], [14, -18.7 - l], [22, -16.5 - l], [26, -12.4 - l - k]]), C.brow);
  const nervous = mood === 'nervous';
  const smug = mood === 'smug';
  const m = mouthKind ?? BOCA_DEL_ANIMO[mood] ?? 'reposo';
  return [
    shape(bunF, C.hair, [
      path(smooth([[-22, -62], [-9, -62], [-9, -68], [-22, -70]]), C.hairShadow, { opacity: 0.6 }),
      stroke(smooth([[-13, -76], [-4, -79.5], [7, -77.5]], false), C.hairLight, 2, { opacity: 0.9 }),
      stroke(smooth([[-12, -70], [0, -76], [12, -70]], false), C.hairShadow, 1.1, { opacity: 0.8 }),
    ], C.hairShadow, 1.5),
    shape(skull, C.skin, [
      path(smooth([[-50, -60], [-30, -60], [-36, 0], [-30, 56], [-50, 56]]), C.skinShadow),
      path(ellipse(6, -37, 20, 8), C.skinLight),
      path(ellipse(-21, 10, 8, 5), C.blush, { opacity: 0.4 }),
      path(ellipse(21, 10, 8, 5), C.blush, { opacity: 0.4 }),
      path(ellipse(-23, 5, 8, 4.5, 0.2), C.skinLight, { opacity: 0.55 }),
      path(ellipse(23, 5, 8, 4.5, -0.2), C.skinLight, { opacity: 0.55 }),
      path(ellipse(0, 49, 6.5, 2.8), C.skinLight, { opacity: 0.55 }),
    ], C.skinLine, 1.6),
    shape(ellipse(-39.5, 4, 6.2, 11), C.skinShadow, [path(ellipse(-38.5, 5, 3.2, 6.2), C.skinDeep, { opacity: 0.6 })], C.skinLine, 1.3),
    shape(ellipse(39.5, 4, 6.2, 11), C.skin, [path(ellipse(38.5, 5, 3.2, 6.2), C.skinShadow)], C.skinLine, 1.3),
    // Small gold hoops.
    ...[-1, 1].map((s) => stroke(ellipse(s * 40.5, 19, 3.4, 4.2), C.goldShadow, 2.4) + stroke(ellipse(s * 40.5, 19, 3.4, 4.2), C.gold, 1.6) + path(ellipse(s * 40.5 - 1.8, 17.2, 0.8, 0.8), C.goldLight)),
    shape(hair, C.hair, [
      path(smooth([[-52, -30], [-34, -40], [-38, 6], [-52, 6]]), C.hairShadow),
      stroke(smooth([[-30, -56], [-8, -63], [14, -62]], false), C.hairLight, 2.6, { opacity: 0.85 }),
      stroke(smooth([[-34, -46], [-14, -56], [4, -57]], false), C.hairLight, 1.6, { opacity: 0.55 }),
      stroke(smooth([[-6, -50], [10, -54], [28, -50]], false), C.hairShadow, 1.4, { opacity: 0.65 }),
    ], C.hairShadow, 1.6),
    shape(ring, C.tie, [
      path(smooth([[-20, -57], [20, -57], [10, -60], [0, -59], [-10, -60]]), C.tieShadow),
      stroke(smooth([[-12, -62.6], [0, -63.8], [11, -62.6]], false), C.tieLight, 1.4, { opacity: 0.9 }),
    ], C.tieShadow, 1.2),
    shape(strand, C.hair, [stroke(smooth([[-36, -14], [-36, 4], [-33.5, 20]], false), C.hairLight, 1.2, { opacity: 0.75 })], C.hairShadow, 1.1),
    bocaFrente(m),
    m === 'sonrisa' ? stroke(smooth([[-22, 17], [-25, 26], [-22, 34]], false), C.skinShadow, 1.2) + stroke(smooth([[22, 17], [25, 26], [22, 34]], false), C.skinShadow, 1.2) : '',
    smug ? stroke(smooth([[21, 24], [23.5, 29], [22.5, 33.5]], false), C.skinShadow, 1.1, { opacity: 0.8 }) : '',
    // Nose: small and soft.
    path(smooth([[-3, -6], [3, -6], [4.6, 6], [6.8, 12], [4.6, 17], [0, 18], [-4.6, 17], [-6.8, 12], [-4.6, 6]]), C.skin),
    path(smooth([[-7, 12], [-4.8, 17], [0, 18], [4.8, 17], [7, 12], [5.6, 19], [0, 21], [-5.6, 19]]), C.skinShadow),
    stroke(smooth([[-5, 4], [-6.8, 12], [-4.6, 17]], false), C.skinDeep, 1.2),
    path(ellipse(-3.4, 16, 1.9, 1.2), C.skinDeep),
    path(ellipse(3.4, 16, 1.9, 1.2), C.skinDeep),
    path(ellipse(1.6, 8, 2.1, 4.6), C.skinLight),
    ojos({ C, eye: eyeF, mood: nervous || smug ? 'neutral' : mood, blink, rx: 5.7, ry: 6.3, lid: C.skin }),
    flicks,
    cejas({
      izq: cejaIzq(nervous ? 2.5 : 0, nervous ? -2.2 : 0),
      der: cejaDer(nervous ? 2.5 : smug ? 3 : 0, nervous ? -2.2 : 0),
      mood: nervous ? 'neutral' : mood,
    }),
    nervous ? gota(36, -30, 1.2) : '',
  ].join('');
}

export function headProfile() {
  const skull = smooth([[-44, -4], [-44, -32], [-30, -52], [-6, -60], [18, -56], [33, -42], [38, -24], [38, -10], [37, 0], [40, 10], [39, 21], [37.5, 32], [34, 43], [25, 48], [10, 46], [0, 32], [-10, 16], [-26, 10], [-40, 6]]);
  const hair = smooth([[-32, 12], [-44, -2], [-47, -20], [-45, -40], [-35, -55], [-22, -63], [-4, -67], [12, -66], [26, -61], [36, -52], [41, -42], [38, -38], [30, -38], [20, -36], [10, -30], [4, -20], [2, -8], [-4, 2], [-14, 10], [-24, 14]]);
  const bunP = smooth([[-34, -62], [-37, -74], [-31, -85], [-18, -89], [-6, -84], [-2, -73], [-6, -63], [-18, -59]]);
  const noseP = smooth([[36, -8], [40, 2], [46, 10], [49, 14.5], [47, 18], [41, 19.5], [37, 16]]);
  return [
    shape(bunP, C.hair, [stroke(smooth([[-30, -80], [-20, -86], [-9, -80]], false), C.hairLight, 2, { opacity: 0.85 }), stroke(smooth([[-28, -72], [-18, -79], [-8, -73]], false), C.hairShadow, 1.1, { opacity: 0.8 })], C.hairShadow, 1.5),
    shape(skull, C.skin, [
      path(ellipse(18, -36, 16, 8), C.skinLight),
      path(ellipse(24, 8, 8, 5), C.blush, { opacity: 0.4 }),
      path(smooth([[0, 33], [16, 46], [28, 52], [10, 56], [-8, 40]]), C.skinShadow, { opacity: 0.8 }),
    ], C.skinLine, 1.6),
    shape(smooth([[-12, -10], [-4, -8], [-3, 4], [-6, 14], [-14, 14], [-18, 2]]), C.skin, [path(ellipse(-10, 3, 4, 8), C.skinShadow)], C.skinLine, 1.3),
    stroke(ellipse(-9.5, 18.5, 3.3, 4.1), C.goldShadow, 2.4),
    stroke(ellipse(-9.5, 18.5, 3.3, 4.1), C.gold, 1.6),
    shape(hair, C.hair, [path(ellipse(-38, -12, 18, 40), C.hairShadow), stroke(smooth([[32, -52], [12, -63], [-8, -65]], false), C.hairLight, 2.6, { opacity: 0.8 })], C.hairShadow, 1.6),
    shape(smooth([[-34, -66], [-30, -70], [-17, -72], [-5, -70], [-1, -65], [-6, -61.5], [-17, -60], [-30, -61.5]]), C.tie, [stroke(smooth([[-28, -68], [-17, -70], [-7, -68]], false), C.tieLight, 1.4, { opacity: 0.9 })], C.tieShadow, 1.2),
    // Full lips, the upper one a little forward.
    path(smooth([[36.5, 26.5], [41, 24.2], [46.5, 25.2], [47.8, 28.4], [44, 30.2], [38, 30.4]]), C.lipUp),
    path(smooth([[37, 30.4], [44, 30.2], [46.4, 32.6], [43.6, 36.6], [38.5, 36.6], [36, 33.6]]), C.lip),
    stroke(smooth([[36.2, 30.3], [41, 31], [46.2, 30]], false), C.lipLine, 1),
    path(ellipse(41, 34.2, 2.3, 0.8), C.lipLight, { opacity: 0.55 }),
    shape(noseP, C.skin, [path(smooth([[36, 14], [41, 18.5], [48, 17], [50, 22], [36, 22]]), C.skinShadow), path(ellipse(41.5, 17, 2.8, 1.6), C.skinDeep)], C.skinDeep, 1.2),
    shape(smooth([[30, -6.5], [33.5, -6], [34.5, -2], [33.5, 2], [30, 2.5]]), C.eye, [path(ellipse(32.8, -3.8, 1, 1), '#ffffff'), path(smooth([[28, -9], [36, -9], [35, -4], [29, -3.4]]), C.skinShadow)]),
    stroke(smooth([[29, -5], [32, -7.4], [35, -5.6]], false), C.eye, 1.8),
    stroke(smooth([[34.5, -5.8], [37.2, -8]], false), C.eye, 1.3),
    path(smooth([[21, -14.5], [28, -20.5], [37, -19], [37.8, -16.5], [29, -17.4], [22, -11.5]]), C.brow),
  ].join('');
}

// ---------------------------------------------------------------- body

export const HEAD_AT = { x: 5, y: -226, s: 0.8 };

export const JOINTS = {
  cabeza: [3, -205],
  torso: [0, -112],
  brazo_sup_detras: [-13, -193], antebrazo_detras: [-14, -151], mano_detras: [-14, -113],
  brazo_sup_delante: [9, -191], antebrazo_delante: [10, -149], mano_delante: [10, -111],
  muslo_detras: [-10, -112], pierna_detras: [-10, -60], pie_detras: [-10, -10],
  muslo_delante: [12, -112], pierna_delante: [12, -60], pie_delante: [12, -10],
};

/** The bar's dark apron: a short waist apron with a pouch, and a bar towel in the band. */
const A = { base: '#2f3550', shadow: '#202538', light: '#4a5378', line: '#0f1220', stitch: '#d1ae6e', towel: '#e9e2d0', towelLine: '#9a2f45' };

function delantal({ front, back, hipY }) {
  const yb = hipY - 34; // top of the band
  const yh = hipY + 22; // hem
  const panel = smooth([[back - 1, yb + 8], [front - 5, yb + 8], [front + 2, hipY - 16, 'c'], [front + 4, yh - 4], [front - 8, yh + 3], [2, yh + 5], [back + 1, yh], [back - 2, hipY - 14, 'c']]);
  const band = smooth([[back - 2, yb], [front - 4, yb - 2], [front - 1, yb + 11, 'c'], [back - 1, yb + 13, 'c']]);
  const pouch = smooth([[4, hipY - 9], [front - 4, hipY - 10], [front - 3, hipY + 14], [4, hipY + 16]]);
  const towel = smooth([[-17, yb + 6], [-6, yb + 6], [-5, hipY + 6], [-18, hipY + 8]]);
  return [
    // The knot and the two tails of the ties, at her back.
    shape(smooth([[back - 1, yb + 4], [back - 9, yb + 1], [back - 12, yb + 6], [back - 7, yb + 10]]), A.shadow, [], A.line, 1.1),
    shape(smooth([[back - 4, yb + 9], [back - 9, hipY - 10], [back - 6, hipY - 7], [back - 1, yb + 12]]), A.shadow, [], A.line, 1.1),
    shape(panel, A.base, [
      // Side away from the light, a soft fold, and the light on the front.
      path(smooth([[back - 6, yb], [back + 16, yb], [back + 12, hipY + 8], [back + 16, yh + 8], [back - 6, yh + 8]]), A.shadow, { opacity: 0.85 }),
      path(smooth([[front - 18, yb + 14], [front - 6, yb + 14], [front - 2, hipY - 4], [front - 6, yh], [front - 14, yh]]), A.light, { opacity: 0.55 }),
      stroke(smooth([[-4, hipY + 16], [-1, hipY + 26], [-2, yh + 4]], false), A.shadow, 1.6, { opacity: 0.8 }),
      stroke(smooth([[front - 22, hipY + 18], [front - 20, hipY + 26], [front - 21, yh + 2]], false), A.shadow, 1.4, { opacity: 0.7 }),
      // Stitched hem and side seams.
      stroke(smooth([[back - 2, yh - 3], [2, yh + 2], [front - 8, yh - 1], [front + 6, yh - 6]], false), A.stitch, 0.9, { 'stroke-dasharray': '2.4 2', opacity: 0.85 }),
    ], A.line, 1.6),
    // Pouch with a stitched edge.
    shape(pouch, A.base, [path(smooth([[4, hipY - 9], [front - 4, hipY - 10], [front - 4, hipY - 4], [4, hipY - 3]]), A.shadow, { opacity: 0.8 }), path(ellipse(front - 11, hipY + 5, 4, 7), A.light, { opacity: 0.4 })], A.line, 1.2),
    stroke(smooth([[6, hipY - 7], [front - 6, hipY - 8], [front - 5, hipY + 12], [6, hipY + 14]], false), A.stitch, 0.9, { 'stroke-dasharray': '2.2 1.9', opacity: 0.85 }),
    // The bar towel tucked into the band.
    shape(towel, A.towel, [path(smooth([[-20, yb + 6], [-14, yb + 6], [-13, hipY + 8], [-20, hipY + 8]]), '#cfc6b0'), stroke(`M-18 ${hipY - 6}L-6 ${hipY - 8}`, A.towelLine, 1.4), stroke(`M-18 ${hipY - 1}L-6 ${hipY - 3}`, A.towelLine, 1.4)], '#7d7466', 1.1),
    // The band, with the buckle of her ties.
    shape(band, A.light, [path(smooth([[back - 4, yb + 6], [front, yb + 4], [front, yb + 14], [back - 4, yb + 14]]), A.base, { opacity: 0.8 })], A.line, 1.5),
    stroke(smooth([[back + 2, yb + 5], [10, yb + 4], [front - 8, yb + 2.4]], false), A.stitch, 0.9, { 'stroke-dasharray': '2.2 1.9', opacity: 0.8 }),
  ].join('');
}

/** Wardrobe: only the bar clothes for now. */
export const OUTFITS = {
  barra: {},
};

/** Tall and slim: black short-sleeved tee, dark short apron, black jeans, black trainers. */
export const body = makeBody({
  skin: C,
  outfits: OUTFITS,
  outfit: 'barra',
  top: {
    style: 'tee', base: '#1e1e25', shadow: '#15151a', deep: '#0d0d11', light: '#3d3d4a', line: '#07070a', sleeveK: 0.82,
  },
  pants: { base: '#33343e', shadow: '#25262e', deep: '#1a1b21', light: '#4d505d', line: '#0c0c0f', stitch: '#6a6d7a' },
  shoes: { style: 'sneaker', base: '#26262d', back: '#1b1b21', light: '#4a4a55', line: '#09090c', sole: '#e8e2d6', soleBack: '#bdb7aa', lace: '#cfc9bd', stripe: '#5a5a66', eyelet: '#8a877f' },
  joints: JOINTS,
  torso: [
    [-9, -208], [-19, -205], [-26, -198], [-28, -185], [-27, -168], [-24, -148], [-24, -132], [-27, -118], [0, -112], [22, -114], [30, -118],
    [32, -128], [28, -146], [30, -160], [35, -174], [34, -190], [26, -201], [13, -207], [-2, -210],
  ],
  belly: 0,
  neckHalf: 8,
  encima: delantal,
  // Second version of the body (docs/ESTILO.md, P8).
  v2: true,
  limb: 8.6,
  thigh: 15.5,
  headAt: HEAD_AT,
  head: (face) => head(face),
});

export const INFO = {
  name: 'Vero',
  defaultMood: 'smug',
  traits: 'cubana, joven, alta y guapa, piel morena cálida, labios grandes, ojos grandes y oscuros, pelo moreno en un moño alto con algún mechón suelto, aros pequeños dorados, camiseta negra de manga corta y delantal corto oscuro; media sonrisa con retranca.',
};
