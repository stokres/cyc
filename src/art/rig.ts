// Piece-based character rig drawn with Canvas 2D paths.
// Local space: feet at (0,0), +y down, facing +x. Bones are angles measured
// from "straight down", positive = forward. Every piece is outlined with a
// darker tone of its own colour (no black outlines, rule P2) and painted with
// 2–3 tones (base, shadow, light).
import { CastDef, Mood } from './cast';

export type Paint = (hex: string) => string;

export interface Pose {
  bob: number;
  lean: number;
  breathe: number;
  hipX: number;
  thighF: number;
  shinF: number;
  thighB: number;
  shinB: number;
  armF: number;
  foreF: number;
  armB: number;
  foreB: number;
  headTilt: number;
  headY: number;
}

export interface FaceState {
  mood: Mood;
  /** 0 open … 1 closed */
  blink: number;
  /** Mouth shape while talking: 0 closed, 1 'a', 2 'o', 3 'e' */
  viseme: number;
  /** -1..1 where the pupils look along x (local, + = forward) */
  look: number;
  /** Secondary motion: beard or hair tuft sway (-1..1) */
  sway: number;
}

export interface Joints {
  hip: [number, number];
  shoulderF: [number, number];
  elbowF: [number, number];
  handF: [number, number];
  shoulderB: [number, number];
  handB: [number, number];
  head: [number, number];
}

export const REST_POSE: Pose = {
  bob: 0,
  lean: 0,
  breathe: 0,
  hipX: 0,
  thighF: 0.05,
  shinF: 0.05,
  thighB: -0.05,
  shinB: 0.05,
  armF: 0.08,
  foreF: 0.18,
  armB: -0.06,
  foreB: 0.14,
  headTilt: 0,
  headY: 0,
};

const down = (a: number, len: number): [number, number] => [Math.sin(a) * len, Math.cos(a) * len];

export function skeleton(d: CastDef, p: Pose): Joints {
  const b = d.build;
  const legLen = b.thigh + b.shin;
  const hip: [number, number] = [p.hipX, -legLen + p.bob];
  const shoulderY = hip[1] - b.torso * (1 + p.breathe);
  const lean = p.lean;
  const sx = hip[0] + Math.sin(lean) * b.torso;
  const shoulderF: [number, number] = [sx + b.shoulders * 0.12, shoulderY + 16];
  const shoulderB: [number, number] = [sx - b.shoulders * 0.28, shoulderY + 14];
  const e = down(p.armF + lean, b.upperArm);
  const elbowF: [number, number] = [shoulderF[0] + e[0], shoulderF[1] + e[1]];
  const h = down(p.armF + p.foreF + lean, b.foreArm);
  const handF: [number, number] = [elbowF[0] + h[0], elbowF[1] + h[1]];
  const eb = down(p.armB + lean, b.upperArm);
  const hb = down(p.armB + p.foreB + lean, b.foreArm);
  const handB: [number, number] = [shoulderB[0] + eb[0] + hb[0], shoulderB[1] + eb[1] + hb[1]];
  const head: [number, number] = [sx + 4, shoulderY - d.head.ry * 0.86 + p.headY];
  return { hip, shoulderF, elbowF, handF, shoulderB, handB, head };
}

function seg(ctx: CanvasRenderingContext2D, a: [number, number], b: [number, number], w: number, fill: string, line: string, c?: [number, number]) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  if (c) ctx.lineTo(c[0], c[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = line;
  ctx.lineWidth = w + 5;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
}

/** Darker tone of the same colour for silhouette lines. */
function lineOf(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const k = 0.5;
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export interface DrawOpts {
  paint: Paint;
  /** Flat fill for the rim-light silhouette pass. */
  flat?: string;
  /** Prop in the front hand. */
  hold?: 'beer' | 'paper' | null;
}

/** Draw the whole character in local space. */
export function drawCharacter(ctx: CanvasRenderingContext2D, d: CastDef, p: Pose, f: FaceState, o: DrawOpts) {
  const P: Paint = o.flat ? () => o.flat! : o.paint;
  const L = (hex: string) => (o.flat ? o.flat! : o.paint(lineOf(hex)));
  const j = skeleton(d, p);
  const b = d.build;

  // Back arm (behind everything).
  drawArm(ctx, d, j.shoulderB, p.armB + p.lean, p.foreB, P, L, true);
  // Legs.
  drawLeg(ctx, d, [j.hip[0] - b.hips * 0.16, j.hip[1]], p.thighB, p.shinB, P, L, true);
  drawLeg(ctx, d, [j.hip[0] + b.hips * 0.14, j.hip[1]], p.thighF, p.shinF, P, L, false);
  // Torso.
  drawTorso(ctx, d, p, j, P, L);
  // Head.
  ctx.save();
  ctx.translate(j.head[0], j.head[1]);
  ctx.rotate(p.headTilt);
  drawHead(ctx, d, f, P, L);
  ctx.restore();
  // Front arm on top.
  drawArm(ctx, d, j.shoulderF, p.armF + p.lean, p.foreF, P, L, false, o.hold ?? null);
}

function drawLeg(ctx: CanvasRenderingContext2D, d: CastDef, hip: [number, number], thigh: number, bend: number, P: Paint, L: Paint, back: boolean) {
  const b = d.build;
  const k = down(thigh, b.thigh);
  const knee: [number, number] = [hip[0] + k[0], hip[1] + k[1]];
  const s = down(thigh - bend, b.shin);
  const ankle: [number, number] = [knee[0] + s[0], knee[1] + s[1]];
  const pants = back ? d.pants.shadow : d.pants.base;
  const w = b.limb + 8;
  seg(ctx, hip, ankle, w, P(pants), L(d.pants.base), knee);
  // Light strip on the front of the shin (painted tone, not lighting).
  if (!back) {
    ctx.strokeStyle = P(d.pants.light);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(knee[0] + w * 0.32, knee[1] + 6);
    ctx.lineTo(ankle[0] + w * 0.28, ankle[1] - 14);
    ctx.stroke();
  }
  // Shoe.
  const sh = d.shoes;
  ctx.save();
  ctx.translate(ankle[0], ankle[1]);
  ctx.beginPath();
  ctx.ellipse(10, 2, 27, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = L(sh.base);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10, 0, 24, 11.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = P(back ? sh.shadow : sh.base);
  ctx.fill();
  ctx.fillStyle = P(sh.sole);
  ctx.fillRect(-13, 6, 47, 5);
  ctx.restore();
}

function drawArm(ctx: CanvasRenderingContext2D, d: CastDef, sh: [number, number], a: number, bend: number, P: Paint, L: Paint, back: boolean, hold: DrawOpts['hold'] = null) {
  const b = d.build;
  const e = down(a, b.upperArm);
  const elbow: [number, number] = [sh[0] + e[0], sh[1] + e[1]];
  const h = down(a + bend, b.foreArm);
  const hand: [number, number] = [elbow[0] + h[0], elbow[1] + h[1]];
  const top = d.top.tones;
  const sleeve = back ? top.shadow : top.base;
  const w = b.limb;
  if (d.top.style === 'tee') {
    // Short sleeve, bare forearm.
    const skin = back ? d.skin.shadow : d.skin.base;
    seg(ctx, elbow, hand, w - 4, P(skin), L(d.skin.base));
    seg(ctx, sh, [sh[0] + e[0] * 0.55, sh[1] + e[1] * 0.55], w + 8, P(sleeve), L(top.base));
  } else {
    seg(ctx, sh, hand, w + 2, P(sleeve), L(top.base), elbow);
    // Cuff.
    const cx = elbow[0] + h[0] * 0.86;
    const cy = elbow[1] + h[1] * 0.86;
    ctx.fillStyle = P(top.light);
    ctx.beginPath();
    ctx.arc(cx, cy, (w + 2) / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hand.
  ctx.beginPath();
  ctx.arc(hand[0], hand[1], 13.5, 0, Math.PI * 2);
  ctx.fillStyle = L(d.skin.base);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hand[0], hand[1], 11, 0, Math.PI * 2);
  ctx.fillStyle = P(back ? d.skin.shadow : d.skin.base);
  ctx.fill();
  if (hold === 'beer') drawBeerGlass(ctx, hand[0] + 4, hand[1] - 20, 1, P);
  if (hold === 'paper') {
    ctx.fillStyle = P('#f1efe9');
    ctx.beginPath();
    ctx.roundRect(hand[0] - 6, hand[1] - 22, 26, 30, 6);
    ctx.fill();
  }
}

/** A caña: small glass, beer and foam. `level` 0..1. */
export function drawBeerGlass(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, P: Paint) {
  const w = 22;
  const h = 34;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w / 2 - 3, h / 2);
  ctx.lineTo(-w / 2 + 3, h / 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(220,235,240,0.35)';
  ctx.fill();
  if (level > 0.02) {
    const top = h / 2 - h * level;
    ctx.fillStyle = P('#e9a12a');
    ctx.fillRect(-w / 2 + 2, top, w - 4, h / 2 - top - 1);
    ctx.fillStyle = P('#fbf3df');
    ctx.fillRect(-w / 2 + 1, top - 5, w - 2, 7);
  }
  ctx.strokeStyle = 'rgba(240,250,255,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawTorso(ctx: CanvasRenderingContext2D, d: CastDef, p: Pose, j: Joints, P: Paint, L: Paint) {
  const b = d.build;
  const [hx, hy] = j.hip;
  const top = hy - b.torso * (1 + p.breathe);
  const sx = hx + Math.sin(p.lean) * b.torso;
  const sw = b.shoulders;
  const ww = b.waist;
  const hw = b.hips;
  const t = d.top.tones;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(sx - sw * 0.5, top + 18);
    ctx.quadraticCurveTo(sx - sw * 0.48, top, sx - sw * 0.3, top - 2);
    ctx.lineTo(sx + sw * 0.32, top - 2);
    ctx.quadraticCurveTo(sx + sw * 0.52, top + 2, sx + sw * 0.5, top + 26);
    // Chest and belly bulge forward.
    ctx.quadraticCurveTo(hx + ww * 0.55 + b.belly * 1.6, hy - b.torso * 0.45, hx + hw * 0.5 + b.belly * 0.5, hy - 6);
    ctx.lineTo(hx - hw * 0.5, hy - 6);
    ctx.quadraticCurveTo(hx - ww * 0.58, hy - b.torso * 0.5, sx - sw * 0.5, top + 18);
    ctx.closePath();
  };
  // Pelvis in trouser colour.
  ctx.beginPath();
  ctx.roundRect(hx - hw * 0.5, hy - 22, hw + b.belly * 0.4, 40, 14);
  ctx.fillStyle = L(d.pants.base);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(hx - hw * 0.5 + 3, hy - 19, hw + b.belly * 0.4 - 6, 34, 12);
  ctx.fillStyle = P(d.pants.base);
  ctx.fill();
  // Neck.
  ctx.fillStyle = P(d.skin.shadow);
  ctx.beginPath();
  ctx.roundRect(sx - 14, top - 34, 30, 44, 10);
  ctx.fill();
  // Body: outline, base, shadow side, light side.
  path();
  ctx.lineWidth = 6;
  ctx.strokeStyle = L(t.base);
  ctx.stroke();
  ctx.fillStyle = P(t.base);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  ctx.fillStyle = P(t.shadow);
  ctx.beginPath();
  ctx.ellipse(sx - sw * 0.72, (top + hy) / 2, sw * 0.42, b.torso, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(hx - hw, hy - 26, hw * 2 + 40, 30);
  ctx.fillStyle = P(t.light);
  ctx.beginPath();
  ctx.ellipse(sx + sw * 0.32, top + 30, sw * 0.18, 26, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Garment details.
  if (d.top.style === 'tee') {
    ctx.strokeStyle = P(t.shadow);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(sx + 6, top + 2, 22, 12, 0, 0, Math.PI);
    ctx.stroke();
  } else if (d.top.style === 'sweater') {
    ctx.strokeStyle = P(t.light);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(sx + 6, top + 2, 23, 13, 0, 0, Math.PI);
    ctx.stroke();
    // Ribbed hem.
    ctx.fillStyle = P(t.light);
    ctx.fillRect(hx - hw * 0.6, hy - 30, hw * 1.3 + b.belly, 8);
  } else if (d.top.style === 'sherpa') {
    // Open front with zip and a darker tee underneath.
    ctx.fillStyle = P('#26262a');
    ctx.beginPath();
    ctx.moveTo(sx + sw * 0.1, top);
    ctx.lineTo(sx + sw * 0.36, top);
    ctx.lineTo(hx + hw * 0.44, hy - 8);
    ctx.lineTo(hx + hw * 0.24, hy - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = P('#9a9aa2');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + sw * 0.1, top + 4);
    ctx.lineTo(hx + hw * 0.24, hy - 8);
    ctx.stroke();
    // Pockets.
    ctx.strokeStyle = P(t.shadow);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy - 50);
    ctx.lineTo(hx + 10, hy - 24);
    ctx.stroke();
  }
  ctx.restore();
  // Sherpa collar sits on top of the shoulders.
  if (d.top.style === 'sherpa' && d.top.collar) {
    const c = d.top.collar;
    ctx.fillStyle = L(c.base);
    ctx.beginPath();
    ctx.ellipse(sx - 2, top + 4, 44, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P(c.base);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.05 + (i / 8) * 0.9);
      ctx.beginPath();
      ctx.arc(sx - 2 + Math.cos(a + Math.PI) * 36, top + 4 + Math.sin(a) * 12, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = P(c.light);
    ctx.beginPath();
    ctx.ellipse(sx + 18, top + 2, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- head

/** Head in local space, centred on the skull, facing +x (three-quarter view). */
export function drawHead(ctx: CanvasRenderingContext2D, d: CastDef, f: FaceState, P: Paint, L: Paint) {
  const { rx, ry, jaw } = d.head;
  const s = d.skin;
  const shape = () => {
    ctx.beginPath();
    ctx.ellipse(0, -4, rx, ry * 0.92, 0, 0, Math.PI * 2);
    // Cheek and jaw push towards the front-bottom (three-quarter face).
    ctx.moveTo(18 + 52 * jaw, 26);
    ctx.ellipse(18, 26, 52 * jaw, 46, 0, 0, Math.PI * 2);
  };

  if (d.hair.style === 'messyBrown') drawHairBack(ctx, d, f, P, L);

  shape();
  ctx.lineWidth = 6;
  ctx.strokeStyle = L(s.base);
  ctx.stroke();
  ctx.fillStyle = P(s.base);
  ctx.fill();
  // Form shading: back of the head in shadow, light on the forehead.
  ctx.save();
  shape();
  ctx.clip();
  ctx.fillStyle = P(s.shadow);
  ctx.beginPath();
  ctx.ellipse(-rx * 1.18, 0, rx * 0.72, ry * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10, ry * 0.95, rx * 0.9, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P(s.light);
  ctx.beginPath();
  ctx.ellipse(22, -ry * 0.42, rx * 0.36, ry * 0.2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ear (back side).
  ctx.beginPath();
  ctx.ellipse(-26, 6, 13, 19, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = L(s.base);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-26, 6, 10.5, 16.5, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = P(s.base);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-24, 7, 5, 10, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = P(s.shadow);
  ctx.fill();
  if (d.earring) {
    ctx.strokeStyle = P(d.earring);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-25, 27, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Blush.
  ctx.fillStyle = P(s.blush);
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(-2, 18, 13, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(52, 16, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (d.beard.style !== 'full') drawBeard(ctx, d, f, P, L);
  drawMouth(ctx, d, f, P);
  if (d.beard.style === 'full') drawBeard(ctx, d, f, P, L);
  drawNose(ctx, d, P, L);
  drawEyes(ctx, d, f, P, L);
  drawHairFront(ctx, d, f, P, L);
  if (d.glasses) drawGlasses(ctx, d, P);
}

function drawEyes(ctx: CanvasRenderingContext2D, d: CastDef, f: FaceState, P: Paint, L: Paint) {
  const happy = f.mood === 'happy';
  const surprised = f.mood === 'surprised';
  const eyes: Array<[number, number, number]> = [
    [0, -8, 1],
    [42, -10, 0.74],
  ];
  for (const [x, y, k] of eyes) {
    const rx = 11 * k;
    const ry = surprised ? 14 : 12.5;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = P('#fbf8f2');
    ctx.fill();
    ctx.clip();
    // Iris and pupil.
    const lx = x + 2.5 * k + f.look * 3 * k;
    ctx.fillStyle = P(d.eyes);
    ctx.beginPath();
    ctx.ellipse(lx, y + 1, 7.5 * k, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#120c0a';
    ctx.beginPath();
    ctx.ellipse(lx, y + 1, 3.6 * k, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(lx + 2.5 * k, y - 2.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Lids: blink, happy squint.
    const lid = Math.max(f.blink, happy ? 0.28 : d.id === 'chuchi' ? 0.18 : 0.1);
    ctx.fillStyle = P(d.skin.base);
    ctx.fillRect(x - rx - 2, y - ry - 2, rx * 2 + 4, (ry * 2 + 2) * lid);
    if (happy) {
      ctx.beginPath();
      ctx.ellipse(x, y + ry + 4, rx + 2, 8, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Upper lid line.
    ctx.strokeStyle = L(d.skin.shadow);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const ly = y - ry + (ry * 2 + 2) * Math.max(f.blink, 0.1);
    ctx.moveTo(x - rx, ly + 2);
    ctx.quadraticCurveTo(x, ly - 3, x + rx, ly + 2);
    ctx.stroke();
  }
  // Brows.
  const br = d.brows;
  const lift = br.lift + (surprised ? 7 : 0);
  ctx.strokeStyle = P(br.color);
  ctx.lineCap = 'round';
  ctx.lineWidth = br.thick;
  ctx.beginPath();
  ctx.moveTo(-14, -30 - lift);
  ctx.quadraticCurveTo(0, -38 - lift, 14, -32 - lift);
  ctx.stroke();
  ctx.lineWidth = br.thick * 0.85;
  ctx.beginPath();
  ctx.moveTo(33, -33 - lift);
  ctx.quadraticCurveTo(44, -38 - lift, 53, -32 - lift + (f.mood === 'smug' ? -4 : 0));
  ctx.stroke();
}

function drawNose(ctx: CanvasRenderingContext2D, d: CastDef, P: Paint, L: Paint) {
  const big = d.id === 'fran' ? 1.15 : 1;
  ctx.save();
  ctx.translate(48, 4);
  ctx.scale(big, big);
  ctx.beginPath();
  ctx.moveTo(-4, -18);
  ctx.quadraticCurveTo(14, 2, 14, 10);
  ctx.quadraticCurveTo(12, 17, 0, 15);
  ctx.quadraticCurveTo(-6, 12, -4, 6);
  ctx.closePath();
  ctx.fillStyle = L(d.skin.base);
  ctx.lineWidth = 4;
  ctx.strokeStyle = L(d.skin.base);
  ctx.stroke();
  ctx.fillStyle = P(d.skin.base);
  ctx.fill();
  ctx.fillStyle = P(d.skin.shadow);
  ctx.beginPath();
  ctx.ellipse(2, 12, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P(d.skin.light);
  ctx.beginPath();
  ctx.ellipse(6, 0, 3, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMouth(ctx: CanvasRenderingContext2D, d: CastDef, f: FaceState, P: Paint) {
  const x = 30;
  const y = d.id === 'fran' ? 40 : 36;
  const dark = P('#5a2422');
  const lip = P(d.skin.shadow);
  ctx.save();
  ctx.translate(x, y);
  if (f.viseme > 0) {
    const shapes: Array<[number, number]> = [
      [0, 0],
      [11, 10],
      [8, 9],
      [14, 6],
    ];
    const [w, h] = shapes[f.viseme];
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(0, 2, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P('#f6f1e6');
    ctx.fillRect(-w * 0.7, 2 - h, w * 1.4, h * 0.45);
    ctx.fillStyle = P('#c85b56');
    ctx.beginPath();
    ctx.ellipse(0, 2 + h * 0.55, w * 0.55, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (f.mood === 'happy') {
    // Big open grin with teeth (Pablo's resting face).
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(-18, -4);
    ctx.quadraticCurveTo(0, -1, 18, -6);
    ctx.quadraticCurveTo(14, 18, -2, 18);
    ctx.quadraticCurveTo(-16, 14, -18, -4);
    ctx.fill();
    ctx.fillStyle = P('#fbf6ea');
    ctx.beginPath();
    ctx.moveTo(-16, -3);
    ctx.quadraticCurveTo(0, 0, 16, -5);
    ctx.lineTo(14, 4);
    ctx.quadraticCurveTo(0, 7, -14, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P('#c85b56');
    ctx.beginPath();
    ctx.ellipse(0, 13, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (f.mood === 'surprised') {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(0, 4, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = f.mood === 'smug' ? dark : lip;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (f.mood === 'smug') {
      ctx.moveTo(-12, 2);
      ctx.quadraticCurveTo(2, 6, 14, -4);
    } else {
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(0, 5, 12, 0);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawBeard(ctx: CanvasRenderingContext2D, d: CastDef, f: FaceState, P: Paint, L: Paint) {
  const t = d.beard.tones;
  const sway = f.sway * 8;
  if (d.beard.style === 'full') {
    // Fran: big dark beard from the sideburns down past the chin, with a mustache.
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(-12, -8);
      ctx.quadraticCurveTo(-26, 40, -4 + sway * 0.4, 84);
      ctx.quadraticCurveTo(20 + sway, 114, 54 + sway * 0.8, 98);
      ctx.quadraticCurveTo(80, 70, 74, 28);
      ctx.lineTo(66, 16);
      // Upper edge across the cheek, under the eyes.
      ctx.quadraticCurveTo(42, 12, 20, 16);
      ctx.quadraticCurveTo(2, 10, -4, -10);
      ctx.closePath();
    };
    shape();
    ctx.lineWidth = 6;
    ctx.strokeStyle = L(t.base);
    ctx.stroke();
    ctx.fillStyle = P(t.base);
    ctx.fill();
    ctx.save();
    shape();
    ctx.clip();
    ctx.fillStyle = P(t.shadow);
    ctx.beginPath();
    ctx.ellipse(-22, 50, 26, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = P(t.light);
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 7; i++) {
      const x = 8 + i * 9;
      ctx.beginPath();
      ctx.moveTo(x, 54 + (i % 2) * 8);
      ctx.quadraticCurveTo(x + 3 + sway * 0.3, 78, x - 2 + sway * 0.6, 98 - (i % 3) * 6);
      ctx.stroke();
    }
    ctx.restore();
    // Mouth opening inside the beard.
    const open = f.viseme > 0 ? 9 : 3.5;
    ctx.fillStyle = P('#4a1e1c');
    ctx.beginPath();
    ctx.ellipse(32, 44, 13, open, 0, 0, Math.PI * 2);
    ctx.fill();
    if (f.viseme > 0) {
      ctx.fillStyle = P('#f3eee2');
      ctx.fillRect(22, 37, 20, 4);
    }
    // Mustache.
    ctx.fillStyle = P(t.base);
    ctx.beginPath();
    ctx.moveTo(10, 34);
    ctx.quadraticCurveTo(32, 18, 58, 30);
    ctx.quadraticCurveTo(52, 40, 34, 36);
    ctx.quadraticCurveTo(18, 42, 10, 34);
    ctx.fill();
    ctx.fillStyle = P(t.light);
    ctx.beginPath();
    ctx.ellipse(40, 28, 10, 3, -0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.beard.style === 'stubble') {
    // Pablo: short beard shadow along the jaw and chin.
    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = P(t.base);
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.quadraticCurveTo(-28, 40, 0, 62);
    ctx.quadraticCurveTo(28, 78, 58, 54);
    ctx.quadraticCurveTo(70, 36, 66, 20);
    ctx.quadraticCurveTo(56, 34, 44, 24);
    ctx.quadraticCurveTo(28, 22, 10, 26);
    ctx.quadraticCurveTo(-2, 20, -4, -2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(12, 26);
    ctx.quadraticCurveTo(32, 16, 56, 24);
    ctx.quadraticCurveTo(48, 30, 32, 28);
    ctx.quadraticCurveTo(18, 30, 12, 26);
    ctx.fill();
    ctx.restore();
  } else {
    // Chuchi: neat ginger beard and mustache.
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.quadraticCurveTo(-24, 44, 2 + sway * 0.3, 70);
      ctx.quadraticCurveTo(30 + sway * 0.5, 86, 56, 62);
      ctx.quadraticCurveTo(70, 44, 66, 22);
      ctx.quadraticCurveTo(54, 36, 42, 28);
      ctx.quadraticCurveTo(28, 50, 12, 30);
      ctx.quadraticCurveTo(-2, 22, -6, 0);
      ctx.closePath();
    };
    shape();
    ctx.lineWidth = 5;
    ctx.strokeStyle = L(t.base);
    ctx.stroke();
    ctx.fillStyle = P(t.base);
    ctx.fill();
    ctx.save();
    shape();
    ctx.clip();
    ctx.fillStyle = P(t.shadow);
    ctx.beginPath();
    ctx.ellipse(-20, 40, 24, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = P(t.base);
    ctx.beginPath();
    ctx.moveTo(12, 28);
    ctx.quadraticCurveTo(32, 18, 56, 26);
    ctx.quadraticCurveTo(46, 33, 32, 30);
    ctx.quadraticCurveTo(20, 34, 12, 28);
    ctx.fill();
    ctx.fillStyle = P(t.light);
    ctx.beginPath();
    ctx.ellipse(38, 24, 9, 2.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHairBack(ctx: CanvasRenderingContext2D, d: CastDef, f: FaceState, P: Paint, L: Paint) {
  const { rx, ry } = d.head;
  const t = d.hair.tones;
  ctx.fillStyle = L(t.base);
  ctx.beginPath();
  ctx.ellipse(-8, -18, rx + 8, ry * 0.86, 0, Math.PI * 0.9, Math.PI * 2.05);
  ctx.fill();
  void f;
  void P;
}

function drawHairFront(ctx: CanvasRenderingContext2D, d: CastDef, f: FaceState, P: Paint, L: Paint) {
  const { rx, ry } = d.head;
  const t = d.hair.tones;
  if (d.hair.style === 'bald') {
    // Shine on the scalp; the renderer tints it with the scene light.
    ctx.fillStyle = P(t.light);
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.ellipse(12, -ry * 0.68, rx * 0.34, ry * 0.12, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Very short hair shadow above the ear.
    ctx.fillStyle = P('#b98a6c');
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(-34, -4, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  const sway = f.sway * 6;
  const shape = () => {
    ctx.beginPath();
    if (d.hair.style === 'messyDark') {
      // Fran: short, thick, a bit messy, fringe on the forehead.
      ctx.moveTo(-rx + 2, 6);
      ctx.quadraticCurveTo(-rx - 6, -ry * 0.8, -6, -ry - 6);
      ctx.quadraticCurveTo(rx * 0.7, -ry - 2, rx + 2, -ry * 0.42);
      ctx.lineTo(rx * 0.62, -ry * 0.4);
      ctx.lineTo(rx * 0.5, -ry * 0.3);
      ctx.lineTo(rx * 0.32, -ry * 0.46);
      ctx.lineTo(rx * 0.14, -ry * 0.36);
      ctx.lineTo(-rx * 0.04, -ry * 0.5);
      ctx.quadraticCurveTo(-rx * 0.22, -ry * 0.12, -rx * 0.18, 0);
      ctx.lineTo(-rx * 0.4, 2);
      ctx.quadraticCurveTo(-rx * 0.55, -ry * 0.2, -rx * 0.72, 10);
    } else {
      // Pablo: brown, messy, swept up and back with a tuft on top.
      ctx.moveTo(-rx + 4, 4);
      ctx.quadraticCurveTo(-rx - 10, -ry * 0.9, -10, -ry - 14);
      ctx.quadraticCurveTo(10 + sway, -ry - 34, 26 + sway, -ry - 18);
      ctx.quadraticCurveTo(40 + sway, -ry - 26, 52 + sway, -ry - 8);
      ctx.quadraticCurveTo(rx + 8, -ry * 0.7, rx - 2, -ry * 0.48);
      ctx.lineTo(rx * 0.55, -ry * 0.5);
      ctx.lineTo(rx * 0.36, -ry * 0.56);
      ctx.lineTo(rx * 0.12, -ry * 0.48);
      ctx.quadraticCurveTo(-rx * 0.16, -ry * 0.3, -rx * 0.14, -2);
      ctx.lineTo(-rx * 0.36, 0);
      ctx.quadraticCurveTo(-rx * 0.52, -ry * 0.2, -rx * 0.7, 8);
    }
    ctx.closePath();
  };
  shape();
  ctx.lineWidth = 5;
  ctx.strokeStyle = L(t.base);
  ctx.stroke();
  ctx.fillStyle = P(t.base);
  ctx.fill();
  ctx.save();
  shape();
  ctx.clip();
  ctx.fillStyle = P(t.shadow);
  ctx.beginPath();
  ctx.ellipse(-rx * 0.85, -ry * 0.1, rx * 0.5, ry * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = P(t.light);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const x = -rx * 0.3 + i * 18;
    ctx.beginPath();
    ctx.moveTo(x, -ry * 0.92 + Math.abs(i - 2) * 5);
    ctx.quadraticCurveTo(x + 12 + sway * 0.5, -ry * 0.8, x + 16, -ry * 0.6);
    ctx.stroke();
  }
  if (d.hair.grey) {
    ctx.fillStyle = P(d.hair.grey);
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 14; i++) {
      const a = 2.3 + i * 0.13;
      ctx.fillRect(Math.cos(a) * rx * 0.86, Math.sin(a) * ry * 0.5 - 6, 3, 9);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // Sideburn joining the beard.
  if (d.beard.style === 'full') {
    ctx.fillStyle = P(d.beard.tones.base);
    ctx.beginPath();
    ctx.roundRect(-16, -18, 14, 34, 6);
    ctx.fill();
  }
}

function drawGlasses(ctx: CanvasRenderingContext2D, d: CastDef, P: Paint) {
  const frame = P(d.glasses!.frame);
  ctx.strokeStyle = frame;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, -8, 19, 18, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(43, -9, 14, 17, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Bridge and temple arm towards the ear.
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(19, -10);
  ctx.quadraticCurveTo(24, -15, 29, -10);
  ctx.moveTo(-19, -10);
  ctx.lineTo(-30, -4);
  ctx.stroke();
  // Subtle lens reflection.
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, -20);
  ctx.lineTo(6, -4);
  ctx.moveTo(36, -20);
  ctx.lineTo(46, -8);
  ctx.stroke();
}

/** Head-and-shoulders portrait for dialogue and the crew switcher. */
export function drawBust(ctx: CanvasRenderingContext2D, d: CastDef, f: FaceState, P: Paint) {
  const L = (hex: string) => P(lineOf(hex));
  const t = d.top.tones;
  const sw = d.build.shoulders * 1.25;
  // Shoulders.
  ctx.beginPath();
  ctx.moveTo(-sw * 0.62, 190);
  ctx.quadraticCurveTo(-sw * 0.6, 92, -10, 86);
  ctx.quadraticCurveTo(sw * 0.62, 88, sw * 0.66, 190);
  ctx.closePath();
  ctx.lineWidth = 6;
  ctx.strokeStyle = L(t.base);
  ctx.stroke();
  ctx.fillStyle = P(t.base);
  ctx.fill();
  ctx.fillStyle = P(t.shadow);
  ctx.beginPath();
  ctx.ellipse(-sw * 0.6, 160, sw * 0.32, 80, 0, 0, Math.PI * 2);
  ctx.fill();
  // Neck.
  ctx.fillStyle = P(d.skin.shadow);
  ctx.beginPath();
  ctx.roundRect(-12, 50, 34, 46, 12);
  ctx.fill();
  if (d.top.style === 'sherpa' && d.top.collar) {
    ctx.fillStyle = P(d.top.collar.base);
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * (0.02 + (i / 9) * 0.96);
      ctx.beginPath();
      ctx.arc(6 + Math.cos(a + Math.PI) * 52, 92 + Math.sin(a) * 16, 13, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = P(d.top.style === 'sweater' ? t.light : t.shadow);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(6, 88, 30, 12, 0, 0, Math.PI);
    ctx.stroke();
  }
  drawHead(ctx, d, f, P, L);
}
