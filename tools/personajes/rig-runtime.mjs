// Browser-side rig: poses the SVG pieces of a character every frame.
// Bones follow the kit template hierarchy; angles are degrees, positive = forward.

const BONES = [
  ['torso', 'root'], ['cabeza', 'torso'],
  ['brazo_sup_detras', 'torso'], ['antebrazo_detras', 'brazo_sup_detras'], ['mano_detras', 'antebrazo_detras'],
  ['brazo_sup_delante', 'torso'], ['antebrazo_delante', 'brazo_sup_delante'], ['mano_delante', 'antebrazo_delante'],
  ['muslo_detras', 'root'], ['pierna_detras', 'muslo_detras'], ['pie_detras', 'pierna_detras'],
  ['muslo_delante', 'root'], ['pierna_delante', 'muslo_delante'], ['pie_delante', 'pierna_delante'],
];

const TAU = Math.PI * 2;
const pos = (v) => Math.max(0, v);
const clampV = (v, m) => Math.max(-m, Math.min(m, v));
const MOUTH = (c) => ('aá'.includes(c) ? 'a' : 'oóuú'.includes(c) ? 'o' : 'eéií'.includes(c) ? 'e' : 'mbp'.includes(c) ? 'm' : c === ' ' ? 'reposo' : 'e');

function legPose(ph) {
  // ph 0 = heel contact with the leg forward; 0.5 = toe off behind.
  const thigh = 24 * Math.cos(TAU * ph);
  const swing = ph > 0.5;
  const knee = 4 + (swing ? 46 * Math.sin(Math.PI * (ph - 0.5) * 2) : 12 * pos(Math.sin(TAU * ph * 2)));
  const foot = -(thigh - knee) + (swing ? 12 * Math.sin(Math.PI * (ph - 0.5) * 2) : 0) + (ph < 0.08 ? -10 * (1 - ph / 0.08) : 0);
  return [thigh, -knee, foot];
}

function spring(k, d) {
  return { x: 0, v: 0, step(target, dt) { this.v += ((target - this.x) * k - this.v * d) * dt; this.x += this.v * dt; return this.x; } };
}

export class Rig {
  /** root: the <g id="personaje"> element; mod: the character module (head(), JOINTS, INFO). */
  constructor(root, mod, { seed = 0 } = {}) {
    this.root = root;
    this.mod = mod;
    this.J = mod.JOINTS;
    this.els = Object.fromEntries(BONES.map(([b]) => [b, root.querySelector('#' + b)]));
    this.headArt = root.querySelector('#cabeza > g');
    this.mode = 'idle';
    this.mood = mod.INFO.defaultMood ?? 'neutral';
    this.talking = false;
    this.seed = seed;
    this.cache = new Map();
    this.blinkT = 1 + seed;
    this.blink = 0;
    this.viseme = 'auto';
    this.visT = 0;
    this.talkI = 0;
    this.lastKey = '';
    this.lastRootY = 0;
    this.beard = spring(60, 7);
    this.tuft = spring(90, 8);
    this.text = 'oye no veas la que se ha liado esta noche en el bar ';
  }

  headSvg(key) {
    let v = this.cache.get(key);
    if (!v) {
      const [mood, m, blink] = key.split('|');
      v = this.mod.head({ mood, mouthKind: m === 'auto' ? undefined : m, blink: blink === '1' });
      this.cache.set(key, v);
    }
    return v;
  }

  pose(t) {
    const P = { root: [0, 0], torso: 0, cabeza: 0 };
    const s = this.seed;
    if (this.mode === 'walk') {
      const ph = (t / 1.0 + s * 0.37) % 1;
      const [tf, kf, ff] = legPose(ph);
      const [tb, kb, fb] = legPose((ph + 0.5) % 1);
      Object.assign(P, {
        muslo_delante: tf, pierna_delante: kf, pie_delante: ff,
        muslo_detras: tb, pierna_detras: kb, pie_detras: fb,
        brazo_sup_delante: -20 * Math.cos(TAU * ph), antebrazo_delante: 14 + 12 * (0.5 + 0.5 * Math.sin(TAU * (ph - 0.15))), mano_delante: 4,
        brazo_sup_detras: 20 * Math.cos(TAU * ph), antebrazo_detras: 14 + 12 * (0.5 - 0.5 * Math.sin(TAU * (ph - 0.15))), mano_detras: 4,
        torso: 3 + 1.2 * Math.cos(TAU * 2 * ph),
        cabeza: -2 - 1.5 * Math.cos(TAU * 2 * (ph - 0.12)),
      });
      P.root = [0, 3.2 * Math.cos(TAU * 2 * (ph - 0.06)) - 1];
      return P;
    }
    const tt = t + s * 1.7;
    const br = Math.sin((TAU * tt) / 3.4);
    const sway = Math.sin((TAU * tt) / 7);
    Object.assign(P, {
      muslo_delante: -1.2 * sway, pierna_delante: 0, pie_delante: 1.2 * sway,
      muslo_detras: -1.2 * sway, pierna_detras: 0, pie_detras: 1.2 * sway,
      brazo_sup_delante: 3 + 1.5 * Math.sin((TAU * tt) / 3.4 + 0.6), antebrazo_delante: 8 + 2 * br, mano_delante: 4,
      brazo_sup_detras: -2 + 1.2 * Math.sin((TAU * tt) / 3.4 + 1.2), antebrazo_detras: 7, mano_detras: 3,
      torso: 0.7 * br, cabeza: -0.8 * br + 2.5 * Math.sin((TAU * tt) / 9),
    });
    P.root = [1.6 * sway, 0.7 * br];
    if (this.talking) {
      // Gesture beats: the hand comes up to chest height, waves a little, and rests again.
      const g = Math.sin(tt * 2.3);
      const e = Math.min(1, Math.max(0, 0.5 + 0.9 * Math.sin(tt * 0.85)));
      const ease = e * e * (3 - 2 * e);
      const lerp = (a, b) => a + (b - a) * ease;
      Object.assign(P, {
        brazo_sup_delante: lerp(P.brazo_sup_delante, 16 + 7 * g),
        antebrazo_delante: lerp(P.antebrazo_delante, 112 + 14 * Math.sin(tt * 3.1 + 1)),
        mano_delante: lerp(P.mano_delante, 18 + 12 * Math.sin(tt * 4.3)),
        cabeza: 2.5 * Math.sin(tt * 4.1) + 1.5 * g, torso: 1.5 + 0.8 * g,
      });
    }
    return P;
  }

  update(t, dt) {
    const P = this.pose(t);
    const J = this.J;
    const M = { root: new DOMMatrix().translate(P.root[0], P.root[1]) };
    for (const [b, parent] of BONES) {
      const [px, py] = J[b];
      M[b] = M[parent].translate(px, py).rotate(-(P[b] || 0)).translate(-px, -py);
      this.els[b]?.setAttribute('transform', M[b].toString());
    }
    // Face: blink, lip sync, expression.
    this.blinkT -= dt;
    if (this.blinkT < 0) {
      this.blink = 1;
      if (this.blinkT < -0.13) { this.blinkT = 2.2 + Math.random() * 3; this.blink = 0; }
    }
    if (this.talking) {
      this.visT += dt;
      if (this.visT > 0.085) { this.visT = 0; this.talkI = (this.talkI + 1) % this.text.length; this.viseme = MOUTH(this.text[this.talkI]); }
    } else this.viseme = 'auto';
    const key = this.mood + '|' + this.viseme + '|' + (this.blink || this.eyesClosed ? 1 : 0);
    if (key !== this.lastKey) { this.headArt.innerHTML = this.headSvg(key); this.lastKey = key; }
    // Beard and hair lag behind the bob of the body.
    const vy = clampV((P.root[1] - this.lastRootY) / Math.max(dt, 1 / 30), 40);
    this.lastRootY = P.root[1];
    const bs = clampV(this.beard.step(-vy * 0.1 + (this.talking ? 1.5 * Math.sin(t * 4.1) : 0), dt), 5);
    const ts = clampV(this.tuft.step(-vy * 0.2, dt), 7);
    const jaw = this.headArt.querySelector('#mandibula');
    if (jaw) {
      const base = jaw.getAttribute('data-base') ?? jaw.getAttribute('transform') ?? '';
      jaw.setAttribute('data-base', base);
      jaw.setAttribute('transform', base + ' rotate(' + bs.toFixed(2) + ' 20 18)');
    }
    for (const [id, px, py] of [['mechon_1', 22, -46], ['mechon_2', 6, -48]]) {
      this.headArt.querySelector('#' + id)?.setAttribute('transform', 'rotate(' + ts.toFixed(2) + ' ' + px + ' ' + py + ')');
    }
  }
}
