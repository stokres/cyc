// Aceituna: the couple's small black dog, whom Fran looks after more than anyone.
// Same units as the crew (Fran is ~270 tall), three-quarter view facing right.
// Black fur reads through a bluish base, a lighter top light and a red collar.
import { smooth, ellipse, path, stroke, g, shape } from './svg.mjs';

const C = {
  fur: '#2c2b35',
  furShadow: '#1b1a21',
  furDeep: '#131218',
  furLight: '#4a4858',
  furSheen: '#6a6880',
  line: '#0d0c11',
  muzzle: '#3a3844',
  nose: '#141317',
  eye: '#1a120e',
  eyeRing: '#5a4a3a',
  tongue: '#e0707a',
  collar: '#c8433a',
  collarDark: '#8e2a22',
  tag: '#e2b84a',
  bed: '#6a7a96',
  bedShadow: '#4e5c76',
  bedLight: '#8a9ab4',
  bedLine: '#2e3a52',
  cushion: '#d9cdb4',
};

const leg = (side, x, near) => {
  // Thin leg with a little paw; pivot at the top.
  const base = near ? C.fur : C.furShadow;
  const sh = near ? C.furShadow : C.furDeep;
  const d = smooth([[x - 6, -36], [x + 6, -36], [x + 5, -14], [x + 4, -5], [x + 8, -2], [x + 8, 1, 'c'], [x - 5, 1, 'c'], [x - 5, -8], [x - 5, -20]]);
  return g(`pata_${side}`, [shape(d, base, [path(smooth([[x + 1, -36], [x + 6, -36], [x + 5, -10], [x + 1, -10]]), sh, { opacity: 0.8 })], C.line, 1.1)]);
};

const torso = () =>
  shape(
    smooth([[-38, -48], [-30, -56], [-6, -56], [18, -58], [32, -56], [40, -46], [40, -34], [32, -28], [16, -30], [0, -33], [-20, -32], [-34, -34], [-40, -40]]),
    C.fur,
    [
      path(smooth([[-38, -36], [-20, -32], [0, -33], [16, -30], [32, -28], [40, -34], [40, -26], [-40, -26]]), C.furShadow),
      path(smooth([[-34, -52], [-8, -56], [20, -58], [32, -55], [20, -52], [-6, -51], [-30, -48]]), C.furLight, { opacity: 0.85 }),
      path(ellipse(-26, -42, 9, 7), C.furShadow, { opacity: 0.6 }),
    ],
    C.line,
    1.3,
  );

const tail = () =>
  g('cola', [
    shape(smooth([[-36, -50], [-46, -62], [-50, -78], [-44, -90], [-40, -86], [-42, -74], [-36, -60], [-32, -52]]), C.fur, [path(smooth([[-46, -66], [-48, -80], [-44, -88], [-43, -78]]), C.furLight, { opacity: 0.7 })], C.line, 1.2),
  ]);

const ear = (id, x, y, rot, near) =>
  g(id, [
    shape(
      smooth([[x - 7, y + 2], [x - 6, y - 10], [x - 2, y - 20], [x + 3, y - 22], [x + 9, y - 16], [x + 6, y - 12], [x + 8, y + 1]]),
      near ? C.fur : C.furShadow,
      [path(smooth([[x - 3, y - 2], [x - 2, y - 14], [x + 2, y - 17], [x + 3, y - 4]]), near ? C.furDeep : C.furDeep, { opacity: 0.8 })],
      C.line,
      1.1,
    ),
  ], { transform: `rotate(${rot} ${x} ${y})` });

/** Head (group pivot at the neck, 30,-52). `pant`: tongue out; `blink`: eyes closed. */
export function head({ blink = false, pant = false, happy = false } = {}) {
  const eyeOpen = !blink;
  const eyeNear = eyeOpen
    ? [path(ellipse(54, -70, 4.6, happy ? 3.2 : 5), C.eye), path(ellipse(55.6, -72, 1.6, 1.6), '#ffffff'), path(ellipse(52.6, -68, 0.8, 0.8), '#ffffff', { opacity: 0.7 })].join('')
    : stroke('M49.5 -70Q54 -67 58.5 -70', C.furSheen, 1.6);
  const eyeFar = eyeOpen ? [path(ellipse(41.5, -70.5, 3, 4), C.eye), path(ellipse(42.4, -72, 1.1, 1.1), '#ffffff')].join('') : stroke('M39 -70Q41.5 -68 44 -70', C.furSheen, 1.4);
  return g(null, [
    ear('oreja_lejos', 38, -79, -14, false),
    shape(
      smooth([[28, -56], [28, -70], [34, -80], [46, -84], [56, -80], [62, -72], [70, -66], [74, -60], [72, -55], [64, -53], [54, -52], [42, -50], [32, -50]]),
      C.fur,
      [
        path(smooth([[58, -70], [70, -66], [74, -60], [72, -55], [64, -53], [56, -56]]), C.muzzle),
        path(smooth([[34, -78], [46, -83], [56, -80], [48, -77], [38, -74]]), C.furLight, { opacity: 0.85 }),
        path(smooth([[28, -58], [42, -52], [54, -52], [44, -48], [30, -50]]), C.furShadow),
      ],
      C.line,
      1.3,
    ),
    eyeFar,
    eyeNear,
    // Brow tufts give her an expression.
    stroke(happy ? 'M50 -77Q54 -79 58 -77' : 'M50 -76Q54 -78 58 -77', C.furSheen, 1.4, { opacity: 0.8 }),
    shape(ellipse(72, -61, 4, 3.2), C.nose, [path(ellipse(71, -62.5, 1.6, 1), '#8a8898')], C.line, 0.8),
    pant
      ? [path(smooth([[60, -55], [68, -54], [69, -48], [65, -44], [61, -47]]), C.tongue), stroke('M58 -55Q64 -57 70 -55', C.line, 1.2)].join('')
      : stroke('M60 -55Q65 -54 70 -56', C.line, 1.1),
    ear('oreja_cerca', 50, -80, 10, true),
    // Red collar with a little brass tag.
    shape(smooth([[28, -58], [36, -55], [42, -52], [40, -47], [34, -49], [27, -52]]), C.collar, [path(smooth([[28, -55], [41, -50], [40, -47], [27, -52]]), C.collarDark)], '#5e1612', 1),
    shape(ellipse(40, -44, 3, 3.4), C.tag, [path(ellipse(39, -45, 1, 1.2), '#fff2b0')], '#7a5714', 0.8),
  ]);
}

/** Standing dog: bones cola, pata_*, cabeza (pivot at the neck). */
export function body() {
  return g('perro', [
    g('de_pie', [
      tail(),
      leg('tras_lejos', -28, false),
      leg('del_lejos', 28, false),
      torso(),
      leg('tras_cerca', -22, true),
      leg('del_cerca', 33, true),
      g('cabeza_perro', [g(null, head())]),
    ]),
    g('tumbada', [lying()], { style: 'display:none' }),
  ]);
}

/** Curled up asleep on her bed: a black loaf with the head on the paws. */
export function lying({ blink = true } = {}) {
  return [
    shape(smooth([[-44, -6], [-40, -24], [-20, -34], [8, -34], [30, -26], [40, -12], [38, 0, 'c'], [-42, 0, 'c']]), C.fur, [
      path(smooth([[-40, -10], [0, -8], [38, -6], [38, 2], [-42, 2]]), C.furShadow),
      path(smooth([[-36, -22], [-16, -32], [10, -32], [-4, -27], [-24, -22]]), C.furLight, { opacity: 0.8 }),
    ], C.line, 1.3),
    // Tail curled round the front.
    shape(smooth([[-40, -4], [-30, 2], [0, 3], [28, 1], [30, -3], [2, -2], [-30, -4]]), C.fur, [], C.line, 1),
    // Front paws and the head resting on them.
    shape(smooth([[30, -6], [56, -6], [60, -2], [56, 1, 'c'], [30, 1, 'c']]), C.fur, [path(smooth([[30, -2], [58, -2], [56, 1], [30, 1]]), C.furShadow)], C.line, 1),
    g('cabeza_tumbada', [
      shape(smooth([[22, -18], [26, -30], [38, -34], [48, -30], [54, -22], [64, -16], [66, -10], [60, -6], [44, -5], [28, -8]]), C.fur, [
        path(smooth([[50, -20], [64, -16], [66, -10], [60, -6], [50, -8]]), C.muzzle),
        path(smooth([[28, -28], [38, -33], [48, -30], [40, -27]]), C.furLight, { opacity: 0.85 }),
      ], C.line, 1.2),
      blink ? stroke('M41 -21Q45 -18 49 -21', C.furSheen, 1.5) : [path(ellipse(45, -21, 3.6, 4), C.eye), path(ellipse(46.2, -22.5, 1.3, 1.3), '#fff')].join(''),
      shape(ellipse(64, -13, 3.4, 2.8), C.nose, [], C.line, 0.8),
      shape(smooth([[30, -30], [28, -40], [34, -42], [40, -34]]), C.fur, [], C.line, 1),
      shape(smooth([[22, -16], [28, -12], [34, -10], [32, -6], [24, -9]]), C.collar, [], '#5e1612', 0.8),
    ]),
  ].join('');
}

/** Her bed: an oval cushion with a raised rim, seen at three-quarters. */
export function bed() {
  return g('cama_perro', [
    path(ellipse(0, 2, 78, 14), '#000', { opacity: 0.25 }),
    shape(smooth([[-76, -6], [-70, -22], [-40, -30], [0, -32], [40, -30], [70, -22], [76, -6], [70, 4], [40, 9], [0, 10], [-40, 9], [-70, 4]]), C.bed, [
      path(smooth([[-76, -4], [-40, 6], [0, 8], [40, 6], [76, -4], [76, 12], [-76, 12]]), C.bedShadow),
      path(smooth([[-60, -22], [-30, -28], [20, -29], [50, -25], [20, -24], [-30, -23]]), C.bedLight, { opacity: 0.9 }),
    ], C.bedLine, 1.4),
    shape(ellipse(0, -14, 56, 10), C.cushion, [path(ellipse(6, -11, 44, 6), '#c4b698')], '#8a7c5e', 1.1),
  ]);
}

/** Water and food bowls by the fridge. */
export function bowls() {
  const bowl = (x, fill) => [
    path(ellipse(x, 1, 20, 4.5), '#000', { opacity: 0.22 }),
    shape(smooth([[x - 19, -9], [x + 19, -9], [x + 15, 0], [x - 15, 0]]), '#c8433a', [path(smooth([[x + 6, -9], [x + 19, -9], [x + 15, 0], [x + 4, 0]]), '#9e2e27')], '#5e1612', 1),
    path(ellipse(x, -9, 19, 4), '#9e2e27'),
    path(ellipse(x, -9, 15, 3), fill),
  ].join('');
  return g('cuencos', [bowl(-24, '#9cc8e0'), bowl(24, '#8a5a34')]);
}

export const INFO = { name: 'Aceituna', traits: 'perrita negra y pequeña, collar rojo con chapa, de la pareja pero la cuida Fran' };

// ---------------------------------------------------------------- rig

const TAU = Math.PI * 2;
const LEGS = { tras_lejos: [-28, -36], del_lejos: [28, -36], tras_cerca: [-22, -36], del_cerca: [33, -36] };

export class Perro {
  constructor(root) {
    this.root = root;
    this.stand = root.querySelector('#de_pie');
    this.lie = root.querySelector('#tumbada');
    this.headEl = root.querySelector('#cabeza_perro');
    this.headArt = this.headEl.firstElementChild;
    this.tailEl = root.querySelector('#cola');
    this.legs = Object.fromEntries(Object.keys(LEGS).map((k) => [k, root.querySelector('#pata_' + k)]));
    this.earN = root.querySelector('#oreja_cerca');
    this.earF = root.querySelector('#oreja_lejos');
    this.mode = 'lie';
    this.excited = 0;
    this.blinkT = 2;
    this.blink = 0;
    this.earT = 3;
    this.ear = 0;
    this.look = 0;
    this.key = '';
    this.cache = new Map();
  }

  headSvg(key) {
    let v = this.cache.get(key);
    if (!v) {
      const [b, p, h] = key.split('|');
      v = head({ blink: b === '1', pant: p === '1', happy: h === '1' });
      this.cache.set(key, v);
    }
    return v;
  }

  update(t, dt) {
    const lying = this.mode === 'lie';
    this.stand.style.display = lying ? 'none' : '';
    this.lie.style.display = lying ? '' : 'none';
    // Blinks and ear twitches.
    this.blinkT -= dt;
    if (this.blinkT < 0) {
      this.blink = 1;
      if (this.blinkT < -0.12) { this.blinkT = 1.8 + Math.random() * 3.5; this.blink = 0; }
    }
    this.earT -= dt;
    if (this.earT < 0) { this.ear = 1; this.earT = 2 + Math.random() * 4; }
    this.ear = Math.max(0, this.ear - dt * 5);
    if (lying) {
      const br = Math.sin(t * 1.6);
      this.lie.setAttribute('transform', `translate(0 ${(-0.6 * br).toFixed(2)}) scale(1 ${(1 + 0.025 * br).toFixed(3)})`);
      return;
    }
    const walk = this.mode === 'walk';
    const ex = this.excited;
    // Legs: diagonal pairs swing together when trotting.
    const ph = t * 3.1;
    for (const [k, [px, py]] of Object.entries(LEGS)) {
      const pair = k === 'tras_lejos' || k === 'del_cerca' ? 0 : Math.PI;
      const a = walk ? 30 * Math.sin(ph * TAU * 0.5 + pair) : 0;
      this.legs[k].setAttribute('transform', `rotate(${a.toFixed(1)} ${px} ${py})`);
    }
    const bob = walk ? -2.2 * Math.abs(Math.sin(ph * Math.PI)) : 0.5 * Math.sin(t * 2.2);
    const breathe = walk ? 1 : 1 + 0.02 * Math.sin(t * 2.2 * (1 + ex));
    this.stand.setAttribute('transform', `translate(0 ${bob.toFixed(2)}) translate(0 -40) scale(1 ${breathe.toFixed(3)}) translate(0 40)`);
    // Tail wags faster when she is happy to see Fran.
    const wag = (walk ? 14 : 8 + 22 * ex) * Math.sin(t * (walk ? 9 : 6 + 14 * ex));
    this.tailEl.setAttribute('transform', `rotate(${(wag - 6).toFixed(1)} -34 -50)`);
    const tilt = walk ? 3 * Math.sin(ph * Math.PI * 2) : this.look * 12 + 3 * Math.sin(t * 0.7);
    this.headEl.setAttribute('transform', `translate(0 ${(walk ? 1.4 * Math.sin(ph * TAU) : 0).toFixed(2)}) rotate(${tilt.toFixed(1)} 30 -54)`);
    this.earN?.setAttribute('transform', `rotate(${(10 - 18 * this.ear + 6 * ex).toFixed(1)} 50 -80)`);
    this.earF?.setAttribute('transform', `rotate(${(-14 - 10 * this.ear).toFixed(1)} 38 -79)`);
    const key = `${this.blink ? 1 : 0}|${ex > 0.5 || walk ? 1 : 0}|${ex > 0.5 ? 1 : 0}`;
    if (key !== this.key) {
      this.headArt.innerHTML = this.headSvg(key);
      this.key = key;
      this.earN = this.headArt.querySelector('#oreja_cerca');
      this.earF = this.headArt.querySelector('#oreja_lejos');
    }
  }
}
