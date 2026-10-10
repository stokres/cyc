// Shared body builder for the crew. Body space: feet at y=0, facing right,
// rest pose (arms and legs straight). Pieces and pivots follow the kit's artist
// template, so every character uses the same rig and animations.
import { smooth, ellipse, path, stroke, g, shape, pivot } from './svg.mjs';

const f = (v) => +(+v).toFixed(1);
const poli = (pts) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;

// Limbs of the second version (cfg.v2): capsules, a round end at each joint. Where
// two pieces meet, the one on top has no outline at its round end and the one
// below has an outlined end a touch wider: straight, the joint melts away; bent,
// that outline is the elbow or the knee.
/** Capsule from (x1, y1) with half width r1 down to (x2, y2) with r2. */
function capsula(x1, y1, r1, x2, y2, r2) {
  return `M${f(x1 - r1)} ${f(y1)}L${f(x2 - r2)} ${f(y2)}A${f(r2)} ${f(r2)} 0 0 0 ${f(x2 + r2)} ${f(y2)}L${f(x1 + r1)} ${f(y1)}A${f(r1)} ${f(r1)} 0 0 0 ${f(x1 - r1)} ${f(y1)}Z`;
}
/** Outline of a capsule's two long sides, and of its top or bottom end if asked. */
function contorno(x1, y1, r1, x2, y2, r2, color, w, { arriba = false, abajo = false } = {}) {
  const d = [`M${f(x1 - r1)} ${f(y1)}L${f(x2 - r2)} ${f(y2)}`, `M${f(x1 + r1)} ${f(y1)}L${f(x2 + r2)} ${f(y2)}`];
  if (arriba) d.push(`M${f(x1 + r1)} ${f(y1)}A${f(r1)} ${f(r1)} 0 0 0 ${f(x1 - r1)} ${f(y1)}`);
  if (abajo) d.push(`M${f(x2 - r2)} ${f(y2)}A${f(r2)} ${f(r2)} 0 0 0 ${f(x2 + r2)} ${f(y2)}`);
  return stroke(d.join(''), color, w);
}
/** Shade down the back of a limb (the side away from the light). */
function sombraLado(x1, y1, r1, x2, y2, r2, color, k = 0.3) {
  return path(poli([[x1 - r1 - 6, y1 - r1 - 2], [x1 - r1 + r1 * 2 * k, y1 - r1 - 2], [x2 - r2 + r2 * 2 * k, y2 + r2 + 2], [x2 - r2 - 6, y2 + r2 + 2]]), color, { opacity: 0.85 });
}

/**
 * cfg = {
 *   skin: { skin, skinShadow, skinDeep, skinLine },
 *   top: { style: 'tee' | 'shirt' | 'sherpa' | 'sweater' | 'hoodie', base, shadow, deep, light, line, collar?, inner?, pattern? },
 *   pants: { base, shadow, deep, light, line },
 *   shoes: { style: 'sneaker' | 'boot', base, back, light, line, sole, soleBack },
 *   joints, torso (point list), belly (0..1), limb (arm width), thigh (thigh width),
 *   headAt: { x, y, s }, head(face) -> svg string,
 * }
 */
/** Muted Hawaiian print: leaves and small flowers scattered over a box. */
function hawaiian(x0, y0, w, h, P, seed = 3, n = 18) {
  let st = seed;
  const r = () => ((st = (st * 16807) % 2147483647) / 2147483647);
  const out = [];
  const op = P.opacity ?? 0.75;
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w;
    const y = y0 + r() * h;
    const a = r() * Math.PI;
    const kind = r();
    const sz = (5 + r() * 4) * (P.scale ?? 1);
    if (kind < (P.hibiscus ? 0.5 : 0.7)) {
      const pts = [[0, -sz], [sz * 0.42, -sz * 0.2], [sz * 0.3, sz * 0.5], [0, sz], [-sz * 0.3, sz * 0.5], [-sz * 0.42, -sz * 0.2]].map(([px, py]) => [x + px * Math.cos(a) - py * Math.sin(a), y + px * Math.sin(a) + py * Math.cos(a)]);
      out.push(path(smooth(pts), P.leaf, { opacity: op }));
      out.push(stroke(`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}L${pts[3][0].toFixed(1)} ${pts[3][1].toFixed(1)}`, P.vein, 0.7, { opacity: 0.6 }));
    } else if (P.hibiscus && kind < 0.8) {
      // Big hibiscus: five round petals and a bright centre.
      const pr = sz * 0.42;
      for (let k = 0; k < 5; k++) {
        const b = a + (k / 5) * Math.PI * 2;
        out.push(path(ellipse(x + Math.cos(b) * pr, y + Math.sin(b) * pr, pr * 0.85, pr * 0.85), P.hibiscus, { opacity: 0.95 }));
      }
      out.push(path(ellipse(x, y, pr * 0.45, pr * 0.45), P.centre ?? P.flower));
    } else {
      for (let k = 0; k < 5; k++) {
        const b = a + (k / 5) * Math.PI * 2;
        out.push(path(ellipse(x + Math.cos(b) * 2.4, y + Math.sin(b) * 2.4, 1.8, 1.8), P.flower, { opacity: 0.85 }));
      }
      out.push(path(ellipse(x, y, 1.2, 1.2), P.centre ?? P.leaf));
    }
  }
  return out;
}

/**
 * Wardrobe: `cfg.outfits = { calle: { top, pants, shoes }, casa: {...} }` and
 * `cfg.outfit` names the default one. body(face, outfit) draws any of them with
 * the same joints, so every outfit animates with the same rig.
 */
export function makeBody(base) {
  const cache = {};
  return function body(face = {}, outfit = base.outfit) {
    const o = outfit && base.outfits ? base.outfits[outfit] : null;
    const key = o ? outfit : '_';
    const fn = (cache[key] ??= buildBody(o ? { ...base, ...o } : base));
    return fn(face);
  };
}

function buildBody(cfg) {
  const J = cfg.joints;
  const S = cfg.skin;
  const T = cfg.top;
  const Pn = cfg.pants;
  const TORSO = smooth(cfg.torso);
  const [, hipY] = J.torso;
  const top = cfg.shoulderY ?? J.cabeza[1]; // shoulder line
  const front = Math.max(...cfg.torso.map((p) => p[0]));
  const back = Math.min(...cfg.torso.map((p) => p[0]));
  const aw = cfg.limb ?? 10; // half width of the upper arm
  const V2 = !!cfg.v2;

  function torso() {
    const [nx, ny] = J.cabeza;
    const neck = shape(smooth([[nx - 10, ny - 14], [nx + 8, ny - 14], [nx + 10, top + 4], [nx - 12, top + 4]]), S.skinShadow, [], S.skinLine, 1.2);
    // Waistband: no wider than the two thighs together, so it never pokes out under the top.
    const tw = cfg.thigh ?? 19;
    const hl = J.muslo_detras[0] - tw + 1;
    const hr = J.muslo_delante[0] + tw - 1;
    const hips = shape(smooth([[hl, hipY - 14], [hr, hipY - 14], [hr, hipY + 4], [hr - 4, hipY + 10, 'c'], [hl + 4, hipY + 10, 'c'], [hl, hipY + 4]]), Pn.base, [
      path(smooth([[hl - 2, hipY - 16], [hl + 14, hipY - 16], [hl + 14, hipY + 14], [hl - 2, hipY + 14]]), Pn.shadow),
    ], Pn.line, 1.4);
    const shading = [
      // Side plane away from us, and the underside above the hem.
      path(smooth([[back - 8, top - 8], [back + 18, top - 4], [back + 14, (top + hipY) / 2], [back + 18, hipY + 4], [back - 8, hipY + 8]]), T.shadow),
      path(smooth([[back, hipY - 8], [0, hipY - 12], [front - 7, hipY - 14], [front + 5, hipY - 2], [back, hipY + 8]]), T.shadow, { opacity: 0.8 }),
      // Light on the chest.
      path(ellipse(front - 17, top + 28, 11, 16, -0.25), T.light, { opacity: V2 ? 0.45 : 0.9 }),
    ];
    if (cfg.belly) shading.push(path(ellipse(front - 6, hipY - 32, 5, 11, -0.2), T.light, { opacity: 0.5 }));
    if (T.style === 'tee') {
      shading.push(
        stroke(smooth([[-14, top + 1], [-2, top + 5], [12, top + 2]], false), T.shadow, 3),
        stroke(smooth([[26, hipY - 18], [31, hipY - 21], [36, hipY - 17]], false), T.light, 1.4, { opacity: 0.7 }),
      );
      if (V2) {
        // Rib of the neck, a stitched hem, and the folds where the tee hangs over the belly.
        shading.push(
          stroke(smooth([[-15, top + 6], [-2, top + 10], [13, top + 7]], false), T.deep, 1, { opacity: 0.6 }),
          stroke(`M${back - 2} ${hipY - 7}L${front + 4} ${hipY - 9}`, T.deep, 1, { 'stroke-dasharray': '3 2.4', opacity: 0.7 }),
          stroke(smooth([[front - 30, hipY - 26], [front - 18, hipY - 20], [front - 6, hipY - 22]], false), T.shadow, 2, { opacity: 0.9 }),
          stroke(smooth([[front - 34, hipY - 14], [front - 22, hipY - 10], [front - 12, hipY - 12]], false), T.shadow, 1.6, { opacity: 0.8 }),
          stroke(smooth([[back + 12, top + 26], [back + 16, top + 40], [back + 14, top + 52]], false), T.shadow, 1.6, { opacity: 0.8 }),
          stroke(smooth([[front - 8, top + 14], [front - 2, top + 30], [front - 2, top + 46]], false), T.light, 2.2, { opacity: 0.5 }),
        );
      }
      // House tee: a sauce stain and a hole over the belly.
      if (T.stain) shading.push(path(smooth([[front - 26, top + 40], [front - 16, top + 36], [front - 12, top + 46], [front - 20, top + 52], [front - 28, top + 48]]), T.stain, { opacity: 0.7 }));
      if (T.hole) shading.push(path(ellipse(front - 10, hipY - 30, 4, 3, 0.3), S.skinShadow), path(ellipse(front - 10.5, hipY - 30.5, 2.6, 1.8, 0.3), S.skin));
    } else if (T.style === 'shirt') {
      // Open camp collar showing the neck, a button placket and a muted print.
      const px = front - 13;
      shading.push(
        ...hawaiian(back, top - 6, front - back, hipY - top + 12, T.pattern, 5, 26),
        path(smooth([[nx - 6, top - 2], [nx + 16, top - 2], [px + 1, top + 24, 'c']]), S.skin),
        path(smooth([[nx - 6, top - 2], [nx + 4, top - 2], [px - 2, top + 20]]), S.skinShadow, { opacity: 0.6 }),
        stroke(smooth([[px, top + 22], [px - 1, (top + hipY) / 2], [px + 1, hipY + 6]], false), T.deep, 1.4),
        ...[0.32, 0.55, 0.78].map((k) => path(ellipse(px + 2.5, top + 22 + (hipY - top - 22) * k, 1.6, 1.6), T.button ?? '#efe6d0')),
      );
    } else if (T.style === 'hoodie') {
      // Kangaroo pocket, ribbed hem, drawstrings.
      const pk = smooth([[back + 10, hipY - 40], [front - 10, hipY - 42], [front - 4, hipY - 14, 'c'], [back + 8, hipY - 14, 'c']]);
      shading.push(
        path(smooth([[back - 4, hipY - 12], [front + 6, hipY - 14], [front + 6, hipY + 8], [back - 4, hipY + 8]]), T.shadow, { opacity: 0.9 }),
        ...[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((k) => stroke(`M${back + (front - back) * k} ${hipY - 11}l0 9`, T.deep, 1.1, { opacity: 0.8 })),
        path(pk, T.shadow, { opacity: 0.55 }),
        stroke(pk, T.deep, 1.6),
        ...(T.hood === false
          ? [stroke(smooth([[-16, top + 3], [-2, top + 8], [14, top + 4]], false), T.light, 4)]
          : [
              stroke(smooth([[front - 22, top + 6], [front - 23, top + 26], [front - 21, top + 34]], false), T.string, 1.6),
              stroke(smooth([[front - 14, top + 5], [front - 13, top + 24], [front - 12, top + 31]], false), T.string, 1.6),
            ]),
      );
    } else if (T.style === 'sweater') {
      // Crew neck rib and ribbed hem.
      shading.push(
        path(smooth([[back - 4, hipY - 12], [front + 6, hipY - 14], [front + 6, hipY + 8], [back - 4, hipY + 8]]), T.light, { opacity: 0.45 }),
        ...[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((k) => stroke(`M${back + (front - back) * k} ${hipY - 11}l0 9`, T.shadow, 1.1, { opacity: 0.7 })),
        stroke(smooth([[-16, top + 3], [-2, top + 8], [14, top + 4]], false), T.light, 4),
      );
    } else if (T.style === 'sherpa') {
      // Open jacket: the tee shows down the front, zip along the opening, ribbed hem.
      const cx = front - 17;
      const mid = (top + hipY) / 2;
      shading.push(
        path(smooth([[cx - 3, top - 2], [cx + 14, top], [front + 3, hipY - 6], [cx + 8, hipY + 6], [cx - 6, mid]]), T.inner),
        path(smooth([[cx + 10, top + 4], [front + 3, top + 30], [front + 3, hipY - 6], [cx + 14, hipY]]), T.innerShadow ?? T.shadow, { opacity: 0.6 }),
        stroke(smooth([[cx - 3, top + 2], [cx - 7, mid], [cx + 4, hipY + 4]], false), T.deep, 3),
        stroke(smooth([[cx - 5, top + 6], [cx - 9, mid], [cx + 1, hipY + 4]], false), '#a3a4ab', 1.1, { opacity: 0.85 }),
        path(smooth([[back - 4, hipY - 10], [cx, hipY - 12], [cx + 2, hipY + 6], [back - 4, hipY + 6]]), T.deep, { opacity: 0.8 }),
        stroke(smooth([[back + 20, mid + 4], [back + 34, mid + 2]], false), T.deep, 2.2),
        // Fleece texture: soft specks.
        ...Array.from({ length: 34 }, (_, i) => {
          const x = back + 6 + ((i * 37) % Math.max(1, cx - back - 10));
          const y = top + 10 + ((i * 53) % (hipY - top - 22));
          return path(ellipse(x, y, 1.3, 1), T.light, { opacity: 0.28 });
        }),
      );
    }
    const garment = shape(TORSO, T.base, shading, T.line, 1.6);
    let collar = '';
    if (T.style === 'shirt') {
      // Collar flaps lying open on the shoulders.
      const px = front - 13;
      const flapF = smooth([[nx + 14, top - 4], [nx + 24, top - 2], [px + 4, top + 16], [px + 1, top + 24, 'c'], [nx + 12, top + 6]]);
      const flapB = smooth([[nx - 9, top - 1], [nx + 2, top - 3], [nx - 1, top + 6], [nx - 10, top + 6]]);
      collar = shape(flapB, T.shadow, [], T.line, 1.3) + shape(flapF, T.base, [path(ellipse(nx + 20, top + 4, 4, 7, -0.6), T.light, { opacity: 0.8 })], T.line, 1.4);
    }
    if (T.style === 'hoodie' && T.hood !== false) {
      // The hood rests on the back of the shoulders, behind the head.
      const hood = smooth([[nx - 30, top + 12], [nx - 30, top - 6], [nx - 20, top - 16], [nx - 4, top - 18], [nx + 8, top - 10], [nx + 10, top + 4], [nx - 6, top + 8]]);
      collar = shape(hood, T.base, [path(ellipse(nx - 10, top - 4, 9, 9), T.deep), path(ellipse(nx - 24, top + 2, 6, 10), T.shadow)], T.line, 1.5);
    }
    if (T.style === 'sherpa' && T.collar) {
      const c = T.collar;
      const ring = smooth([[nx - 22, top + 6], [nx - 20, top - 10], [nx - 6, top - 16], [nx + 10, top - 15], [nx + 22, top - 6], [nx + 24, top + 8], [nx + 14, top + 4], [nx, top + 2], [nx - 12, top + 8]]);
      collar = shape(ring, c.base, [
        path(ellipse(nx - 14, top - 2, 9, 12), c.shadow),
        ...[[-16, -12], [-6, -16], [6, -15], [16, -10], [22, 0]].map(([x, y]) => path(ellipse(nx + x, top + y, 4, 3), c.light, { opacity: 0.8 })),
      ], c.line, 1.4);
    }
    return neck + hips + garment + collar;
  }

  /** A relaxed hand hanging from the wrist: palm, fingers curled a little and the thumb in front. */
  function manoV2(wx, wy, rw, isBack) {
    const skin = isBack ? S.skinShadow : S.skin;
    const shade = isBack ? S.skinDeep : S.skinShadow;
    const palma = `M${f(wx - rw)} ${f(wy)}A${f(rw)} ${f(rw)} 0 0 1 ${f(wx + rw)} ${f(wy)}` +
      `C${f(wx + rw + 1.5)} ${f(wy + 6)} ${f(wx + 10)} ${f(wy + 12)} ${f(wx + 8.5)} ${f(wy + 19)}` +
      `C${f(wx + 7)} ${f(wy + 25)} ${f(wx + 1)} ${f(wy + 27.5)} ${f(wx - 3)} ${f(wy + 26)}` +
      `C${f(wx - 8)} ${f(wy + 24)} ${f(wx - 10)} ${f(wy + 15)} ${f(wx - 9.5)} ${f(wy + 8)}` +
      `C${f(wx - 9)} ${f(wy + 4)} ${f(wx - rw - 0.5)} ${f(wy + 2)} ${f(wx - rw)} ${f(wy)}Z`;
    const pulgar = smooth([[wx + 3, wy + 2], [wx + 8.5, wy + 3.5], [wx + 12, wy + 9], [wx + 12.5, wy + 15], [wx + 10, wy + 17], [wx + 7.5, wy + 13], [wx + 4, wy + 8]]);
    const dedos = [0, 1, 2].map((i) => stroke(smooth([[wx - 5.5 + i * 4, wy + 14], [wx - 5 + i * 4.3, wy + 20], [wx - 4 + i * 4.6, wy + 25]], false), shade, 1.1));
    return [
      shape(palma, skin, [
        path(poli([[wx - 14, wy - 8], [wx - 4, wy - 8], [wx - 4, wy + 30], [wx - 14, wy + 30]]), shade, { opacity: 0.7 }),
        stroke(smooth([[wx - 8, wy + 13], [wx - 1, wy + 15], [wx + 7, wy + 13]], false), shade, 1, { opacity: 0.6 }),
        ...dedos,
      ], S.skinLine, 1.4),
      shape(pulgar, skin, [path(ellipse(wx + 10.3, wy + 13.6, 1.8, 1.3, 0.4), S.skinLight ?? S.skin, { opacity: 0.8 })], S.skinLine, 1.2),
    ].join('');
  }

  /** Arm of the second version (short sleeves): no joint lines at the elbow or the wrist. */
  function armV2(side) {
    const isBack = side === 'detras';
    const [sx, sy] = J[`brazo_sup_${side}`];
    const [ex, ey] = J[`antebrazo_${side}`];
    const [wx, wy] = J[`mano_${side}`];
    const skin = isBack ? S.skinShadow : S.skin;
    const shade = isBack ? S.skinDeep : S.skinShadow;
    const cloth = isBack ? T.shadow : T.base;
    const re = aw - 1;
    const rw = aw * 0.66;
    const L = S.skinLine;
    // Upper arm on top: its elbow end has no outline. Forearm below: its elbow end, wider and outlined.
    const upper = shape(capsula(sx, sy + 4, aw, ex, ey, re), skin, [sombraLado(sx, sy + 4, aw, ex, ey, re, shade)]) + contorno(sx, sy + 4, aw, ex, ey, re, L, 1.4);
    const fore = shape(capsula(ex, ey, re + 0.8, wx, wy, rw), skin, [
      sombraLado(ex, ey, re + 0.8, wx, wy, rw, shade),
      isBack ? '' : path(ellipse(ex + re * 0.35, (ey + wy) / 2 - 4, 2.4, 9), S.skinLight ?? S.skin, { opacity: 0.55 }),
    ]) + contorno(ex, ey, re + 0.8, wx, wy, rw, L, 1.4, { arriba: true });
    const sleeve = smooth([[sx - 13, sy - 4], [sx - 6, sy - 13], [sx + 7, sy - 14], [sx + 15, sy - 5], [sx + 16, sy + 12], [sx + 15, sy + 24, 'c'], [sx - 15, sy + 24, 'c'], [sx - 15, sy + 10]]);
    return g(`brazo_${side}`, [
      g(`mano_${side}`, [manoV2(wx, wy, rw + 0.8, isBack), pivot(`mano_${side}`, wx, wy)]),
      g(`antebrazo_${side}`, [fore, pivot(`antebrazo_${side}`, ex, ey)]),
      g(`brazo_sup_${side}`, [
        upper,
        shape(sleeve, cloth, [
          path(smooth([[sx - 20, sy - 16], [sx - 5, sy - 16], [sx - 6, sy + 30], [sx - 20, sy + 30]]), isBack ? T.deep : T.shadow),
          isBack ? '' : path(smooth([[sx + 4, sy - 12], [sx + 11, sy - 8], [sx + 12, sy + 8], [sx + 7, sy + 10]]), T.light, { opacity: 0.6 }),
          stroke(`M${sx - 16} ${sy + 19}L${sx + 16} ${sy + 19}`, isBack ? T.seamBack ?? T.line : T.deep, 1, { 'stroke-dasharray': '2.6 2', opacity: 0.8 }),
          stroke(smooth([[sx - 4, sy + 2], [sx + 2, sy + 10], [sx + 1, sy + 16]], false), isBack ? T.deep : T.shadow, 1.4, { opacity: 0.8 }),
        ], T.line, 1.5),
        pivot(`brazo_sup_${side}`, sx, sy),
      ]),
    ]);
  }

  function arm(side) {
    if (V2 && T.style === 'tee') return armV2(side);
    const isBack = side === 'detras';
    const [sx, sy] = J[`brazo_sup_${side}`];
    const [ex, ey] = J[`antebrazo_${side}`];
    const [wx, wy] = J[`mano_${side}`];
    const skin = isBack ? S.skinShadow : S.skin;
    const cloth = isBack ? T.shadow : T.base;
    const upper = smooth([[sx - aw - 1, sy + 4], [sx + aw + 1, sy + 4], [ex + aw, ey - 2], [ex + 1, ey + 9], [ex - aw, ey - 2]]);
    const fore = smooth([[ex - aw, ey - 5], [ex + aw, ey - 5], [wx + aw - 2, wy - 2], [wx, wy + 5], [wx - aw + 2, wy - 2]]);
    const hand = smooth([[wx - 9, wy - 4], [wx + 8, wy - 4], [wx + 10, wy + 7], [wx + 9, wy + 17], [wx + 2, wy + 23], [wx - 6, wy + 21], [wx - 10, wy + 10]]);
    const thumb = smooth([[wx + 6, wy + 1], [wx + 12, wy + 5], [wx + 13, wy + 12], [wx + 9, wy + 13], [wx + 6, wy + 8]]);
    const shadeStrip = (c) => [path(smooth([[sx - 24, sy], [sx - 4, sy], [ex - 3, ey + 40], [wx - 24, wy + 40]]), c, { opacity: 0.8 })];
    const handPiece = g(`mano_${side}`, [
      shape(hand, skin, [...shadeStrip(isBack ? S.skinDeep : S.skinShadow), stroke(smooth([[wx - 3, wy + 8], [wx - 2, wy + 16]], false), S.skinShadow, 1.2)], S.skinLine, 1.4),
      shape(thumb, skin, [], S.skinLine, 1.2),
      pivot(`mano_${side}`, wx, wy),
    ]);
    if (T.style === 'tee' || T.style === 'shirt') {
      const sleeve = smooth([[sx - 13, sy - 4], [sx - 6, sy - 13], [sx + 7, sy - 14], [sx + 15, sy - 5], [sx + 16, sy + 12], [sx + 15, sy + 24, 'c'], [sx - 15, sy + 24, 'c'], [sx - 15, sy + 10]]);
      const skinShade = shadeStrip(isBack ? S.skinDeep : S.skinShadow);
      return g(`brazo_${side}`, [
        handPiece,
        g(`antebrazo_${side}`, [shape(fore, skin, skinShade, S.skinLine, 1.4), pivot(`antebrazo_${side}`, ex, ey)]),
        g(`brazo_sup_${side}`, [
          shape(upper, skin, skinShade, S.skinLine, 1.4),
          shape(sleeve, cloth, [
            path(smooth([[sx - 20, sy - 16], [sx - 5, sy - 16], [sx - 6, sy + 30], [sx - 20, sy + 30]]), isBack ? T.deep : T.shadow),
            isBack ? '' : path(ellipse(sx + 7, sy - 4, 5, 9), T.light, { opacity: 0.7 }),
            ...(T.pattern ? hawaiian(sx - 18, sy - 16, 36, 40, T.pattern, isBack ? 9 : 7, 6) : []),
            stroke(`M${sx - 16} ${sy + 20}L${sx + 16} ${sy + 20}`, isBack ? T.seamBack ?? T.line : T.shadow, 1.6),
          ], T.line, 1.5),
          pivot(`brazo_sup_${side}`, sx, sy),
        ]),
      ]);
    }
    // Long sleeves: cloth all the way down, with a cuff at the wrist.
    const cap = smooth([[sx - aw - 3, sy + 6], [sx - aw, sy - 10], [sx, sy - 15], [sx + aw + 1, sy - 9], [sx + aw + 4, sy + 8], [ex + aw + 1, ey - 2], [ex + 1, ey + 9], [ex - aw - 1, ey - 2]]);
    const foreSleeve = smooth([[ex - aw - 0.5, ey - 6], [ex + aw + 0.5, ey - 6], [wx + aw, wy - 3, 'c'], [wx - aw, wy - 3, 'c']]);
    const cuff = smooth([[wx - aw - 1, wy - 9], [wx + aw + 1, wy - 9], [wx + aw + 1, wy - 1, 'c'], [wx - aw - 1, wy - 1, 'c']]);
    const clothShade = shadeStrip(isBack ? T.deep : T.shadow);
    return g(`brazo_${side}`, [
      handPiece,
      g(`antebrazo_${side}`, [
        shape(foreSleeve, cloth, clothShade, T.line, 1.4),
        shape(cuff, isBack ? T.shadow : T.style === 'hoodie' ? T.shadow : T.light, T.style === 'sweater' || T.style === 'hoodie' ? [0.25, 0.5, 0.75].map((k) => stroke(`M${wx - aw + 2 * aw * k} ${wy - 8}l0 6`, T.style === 'hoodie' ? T.deep : T.shadow, 1)) : [], T.line, 1.3),
        pivot(`antebrazo_${side}`, ex, ey),
      ]),
      g(`brazo_sup_${side}`, [
        shape(cap, cloth, [...clothShade, isBack ? '' : path(ellipse(sx + 6, sy - 2, 5, 12), T.light, { opacity: 0.6 })], T.line, 1.5),
        pivot(`brazo_sup_${side}`, sx, sy),
      ]),
    ]);
  }

  /** The shoe at the ankle (sneaker, boot or slipper), the near one lit. */
  function pie(ax, ay, isBack) {
    const Sh = cfg.shoes;
    let foot;
    if (Sh.style === 'slipper') {
      // House slippers: low felt shape, no laces.
      const sl = smooth([[ax - 14, ay - 4], [ax + 6, ay - 7], [ax + 20, ay - 3], [ax + 27, ay + 3], [ax + 27, ay + 8, 'c'], [ax - 15, ay + 8, 'c'], [ax - 16, ay + 2]]);
      foot = shape(sl, isBack ? Sh.back : Sh.base, [
        path(smooth([[ax - 18, ay + 5], [ax + 30, ay + 5], [ax + 30, ay + 10], [ax - 18, ay + 10]]), isBack ? Sh.soleBack : Sh.sole),
        isBack ? '' : path(ellipse(ax + 10, ay - 2, 9, 3, -0.1), Sh.light, { opacity: 0.8 }),
      ], Sh.line, 1.4);
    } else if (Sh.style === 'boot') {
      const boot = smooth([[ax - 15, ay - 18], [ax + 6, ay - 18], [ax + 12, ay - 8], [ax + 26, ay - 3], [ax + 28, ay + 8, 'c'], [ax - 16, ay + 8, 'c'], [ax - 17, ay - 4]]);
      foot = shape(boot, isBack ? Sh.back : Sh.base, [
        path(smooth([[ax - 18, ay + 3], [ax + 30, ay + 3], [ax + 30, ay + 10], [ax - 18, ay + 10]]), isBack ? Sh.soleBack : Sh.sole),
        isBack ? '' : path(ellipse(ax + 14, ay - 5, 8, 3, -0.2), Sh.light, { opacity: 0.8 }),
        stroke(`M${ax - 15} ${ay - 13}L${ax + 7} ${ay - 13}`, Sh.line, 1.2, { opacity: 0.6 }),
      ], Sh.line, 1.4);
    } else {
      const shoe = smooth([[ax - 15, ay - 8], [ax + 4, ay - 10], [ax + 18, ay - 6], [ax + 28, ay + 1], [ax + 28, ay + 8, 'c'], [ax - 16, ay + 8, 'c'], [ax - 17, ay]]);
      foot = shape(shoe, isBack ? Sh.back : Sh.base, [
        path(smooth([[ax - 18, ay + 3], [ax + 30, ay + 3], [ax + 30, ay + 10], [ax - 18, ay + 10]]), isBack ? Sh.soleBack : Sh.sole),
        isBack ? '' : path(ellipse(ax + 8, ay - 5, 8, 3, -0.15), Sh.light),
        isBack ? '' : stroke(smooth([[ax + 2, ay - 8], [ax + 6, ay - 4], [ax + 10, ay - 7]], false), Sh.lace ?? Sh.sole, 1.2, { opacity: 0.8 }),
        // Second version: toe cap, a side stripe, eyelets and laces, heel tab and tread.
        ...(V2 ? [
          path(smooth([[ax + 14, ay - 5], [ax + 22, ay - 3], [ax + 30, ay + 2], [ax + 30, ay + 4], [ax + 16, ay + 3], [ax + 12, ay - 1]]), isBack ? Sh.back : Sh.light, { opacity: 0.7 }),
          stroke(smooth([[ax - 12, ay - 1], [ax - 2, ay - 5], [ax + 10, ay - 4], [ax + 16, ay + 0.5]], false), isBack ? Sh.soleBack : Sh.sole, 2.2, { opacity: isBack ? 0.5 : 0.85 }),
          ...[0, 1, 2].map((i) => path(ellipse(ax - 2 + i * 4.5, ay - 8.5 + i * 0.8, 0.9, 0.9), isBack ? Sh.back : Sh.sole)),
          ...(isBack ? [] : [0, 1].map((i) => stroke(`M${f(ax - 3 + i * 4.5)} ${f(ay - 7)}l4 -2.4`, Sh.lace ?? Sh.sole, 1.1))),
          path(poli([[ax - 19, ay - 4], [ax - 14, ay - 11], [ax - 10, ay - 10], [ax - 13, ay - 1]]), isBack ? Sh.soleBack : Sh.light, { opacity: 0.8 }),
          stroke(`M${f(ax - 18)} ${f(ay + 6)}L${f(ax + 30)} ${f(ay + 6)}`, isBack ? Sh.back : Sh.soleBack, 0.9, { 'stroke-dasharray': '2 1.6' }),
        ] : []),
      ], Sh.line, 1.4);
    }
    return foot;
  }

  /**
   * Leg of the second version: the thigh's knee end is outlined (the shin covers
   * it while the leg is straight) and the shin's is not, so no line crosses the knee.
   */
  function legV2(side) {
    const isBack = side === 'detras';
    const [hx, hy] = J[`muslo_${side}`];
    const [kx, ky] = J[`pierna_${side}`];
    const [ax, ay] = J[`pie_${side}`];
    const tw = cfg.thigh ?? 19;
    const rk = tw - 4;
    const ra = 8;
    const cloth = isBack ? Pn.shadow : Pn.base;
    const clothShade = isBack ? Pn.deep : Pn.shadow;
    const skin = isBack ? S.skinShadow : S.skin;
    const skinShade = isBack ? S.skinDeep : S.skinShadow;
    const L = Pn.line;
    const SL = S.skinLine;
    const luz = (x1, y1, x2, y2) => (isBack ? '' : path(poli([[x1 + 6, y1], [x1 + 11, y1], [x2 + 9, y2], [x2 + 5, y2]]), Pn.light, { opacity: 0.6 }));
    const costura = (x1, y1, x2, y2) => (Pn.stitch && !isBack ? stroke(`M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`, Pn.stitch, 0.9, { 'stroke-dasharray': '2.2 1.8', opacity: 0.85 }) : '');
    const calcetin = (y0) => [
      path(poli([[ax - 14, y0], [ax + 14, y0], [ax + 14, ay + 4], [ax - 14, ay + 4]]), Pn.sock ?? '#ece7dc'),
      ...[-4, 0, 4].map((dx) => stroke(`M${f(ax + dx)} ${f(y0 + 1)}l0 4`, '#c9c2b4', 0.8)),
    ];
    let thighArt;
    if (Pn.length === 'boxers') {
      const t = Pn.hem ?? 0.45;
      const bx = hx + (kx - hx) * t;
      const by = hy + (ky - hy) * t;
      const hearts = Pn.hearts ? [[-6, 0.25], [6, 0.5], [-4, 0.75], [8, 0.15]].map(([dx, k]) => {
        const x = hx + (bx - hx) * k + dx;
        const y = hy - 4 + (by - hy) * k;
        return path(`M${x} ${y + 2.6}l-2.6 -2.6a1.5 1.5 0 0 1 2.6 -1.7a1.5 1.5 0 0 1 2.6 1.7z`, Pn.hearts);
      }) : [];
      const boxer = smooth([[hx - tw - 1, hy - 9], [hx + tw + 1, hy - 9], [bx + tw + 1.5, by, 'c'], [bx - tw - 1.5, by, 'c']]);
      thighArt = shape(capsula(hx, hy - 4, tw - 3, kx, ky, rk + 0.8), skin, [sombraLado(hx, hy - 4, tw - 3, kx, ky, rk, skinShade)]) +
        contorno(hx, hy - 4, tw - 3, kx, ky, rk + 0.8, SL, 1.3, { abajo: true }) +
        shape(boxer, cloth, [sombraLado(hx, hy - 9, tw, bx, by, tw, clothShade), ...hearts, stroke(`M${bx - tw} ${by - 3}L${bx + tw} ${by - 3}`, Pn.shadow, 1.2, { 'stroke-dasharray': '2.4 2' })], L, 1.5);
    } else {
      thighArt = shape(capsula(hx, hy - 8, tw, kx, ky, rk + 0.8), cloth, [
        sombraLado(hx, hy - 8, tw, kx, ky, rk, clothShade, 0.32),
        luz(hx, hy - 8, kx, ky),
        costura(hx - tw + 5, hy - 4, kx - rk + 3, ky - 2),
        isBack ? '' : stroke(smooth([[kx - 6, ky - 10], [kx + 2, ky - 6], [kx + 9, ky - 9]], false), clothShade, 1.4, { opacity: 0.8 }),
      ]) + contorno(hx, hy - 8, tw, kx, ky, rk + 0.8, L, 1.5, { abajo: true });
    }
    let shinArt;
    if (Pn.length === 'shorts') {
      // Shorts that stop below the knee: a denim tube with a turned-up hem, the calf and a low sock below.
      const t = Pn.hem ?? 0.6;
      const hxm = kx + (ax - kx) * t;
      const hym = ky + (ay - ky) * t;
      const rh = rk + 1.5;
      const calf = shape(capsula(kx, ky + 8, 10.5, ax, ay, ra), skin, [sombraLado(kx, ky + 8, 10.5, ax, ay, ra, skinShade), ...calcetin(ay - 16)]) + contorno(kx, ky + 8, 10.5, ax, ay, ra, SL, 1.3);
      const tubo = `M${f(kx - rk)} ${f(ky)}L${f(hxm - rh)} ${f(hym)}L${f(hxm + rh)} ${f(hym)}L${f(kx + rk)} ${f(ky)}A${f(rk)} ${f(rk)} 0 0 0 ${f(kx - rk)} ${f(ky)}Z`;
      const denim = shape(tubo, cloth, [
        sombraLado(kx, ky, rk, hxm, hym, rh, clothShade, 0.32),
        luz(kx, ky, hxm, hym),
        costura(kx - rk + 3, ky, hxm - rh + 3, hym - 6),
        path(poli([[hxm - rh - 2, hym - 7], [hxm + rh + 2, hym - 7], [hxm + rh + 2, hym + 2], [hxm - rh - 2, hym + 2]]), isBack ? Pn.deep : Pn.light, { opacity: 0.55 }),
        stroke(`M${f(hxm - rh)} ${f(hym - 7)}L${f(hxm + rh)} ${f(hym - 7)}`, L, 1.1),
      ]) + stroke(`M${f(kx - rk)} ${f(ky)}L${f(hxm - rh)} ${f(hym)}L${f(hxm + rh)} ${f(hym)}L${f(kx + rk)} ${f(ky)}`, L, 1.5);
      shinArt = calf + denim;
    } else if (Pn.length === 'boxers') {
      shinArt = shape(capsula(kx, ky, rk, ax, ay, ra), skin, [sombraLado(kx, ky, rk, ax, ay, ra, skinShade), ...calcetin(ay - 16)]) + contorno(kx, ky, rk, ax, ay, ra, SL, 1.3);
    } else {
      shinArt = shape(capsula(kx, ky, rk, ax, ay, rk - 2), cloth, [sombraLado(kx, ky, rk, ax, ay, rk - 2, clothShade, 0.32), luz(kx, ky, ax, ay), costura(kx - rk + 3, ky, ax - rk + 4, ay - 6)]) +
        contorno(kx, ky, rk, ax, ay, rk - 2, L, 1.5);
    }
    return g(`pierna_${side}_grupo`, [
      g(`muslo_${side}`, [thighArt, pivot(`muslo_${side}`, hx, hy)]),
      g(`pierna_${side}`, [shinArt, pivot(`pierna_${side}`, kx, ky)]),
      g(`pie_${side}`, [pie(ax, ay, isBack), pivot(`pie_${side}`, ax, ay)]),
    ]);
  }

  function leg(side) {
    if (V2) return legV2(side);
    const isBack = side === 'detras';
    const [hx, hy] = J[`muslo_${side}`];
    const [kx, ky] = J[`pierna_${side}`];
    const [ax, ay] = J[`pie_${side}`];
    const tw = cfg.thigh ?? 19;
    const base = isBack ? Pn.shadow : Pn.base;
    const thigh = smooth([[hx - tw, hy - 8], [hx + tw, hy - 8], [kx + tw - 3.5, ky], [kx + 1, ky + 9], [kx - tw + 4, ky]]);
    const shin = smooth([[kx - 14, ky - 6], [kx + 14, ky - 6], [ax + 14, ay - 2, 'c'], [ax + 1, ay + 2], [ax - 14, ay - 2, 'c']]);
    const shade = [
      path(smooth([[hx - 24, hy - 10], [hx - 7, hy - 10], [kx - 6, ky], [ax - 7, ay], [ax - 24, ay]]), isBack ? Pn.deep : Pn.shadow),
      isBack ? '' : path(smooth([[hx + 7, hy], [hx + 13, hy], [kx + 11, ky], [ax + 10, ay - 4], [ax + 6, ay - 4], [kx + 6, ky]]), Pn.light, { opacity: 0.7 }),
    ];
    const foot = pie(ax, ay, isBack);
    let shinArt;
    let thighArt = shape(thigh, base, shade, Pn.line, 1.5);
    if (Pn.length === 'boxers') {
      // Boxer shorts: cloth only on the top of the thigh, bare legs and socks below.
      const t = Pn.hem ?? 0.45;
      const bx = hx + (kx - hx) * t;
      const by = hy + (ky - hy) * t;
      const skinThigh = smooth([[hx - tw + 3, hy - 4], [hx + tw - 3, hy - 4], [kx + tw - 6, ky], [kx + 1, ky + 8], [kx - tw + 6, ky]]);
      const cloth = smooth([[hx - tw - 1, hy - 9], [hx + tw + 1, hy - 9], [bx + tw + 1.5, by, 'c'], [bx - tw - 1.5, by, 'c']]);
      const hearts = Pn.hearts ? [[-6, 0.25], [6, 0.5], [-4, 0.75], [8, 0.15]].map(([dx, k]) => {
        const x = hx + (bx - hx) * k + dx;
        const y = hy - 4 + (by - hy) * k;
        return path(`M${x} ${y + 2.6}l-2.6 -2.6a1.5 1.5 0 0 1 2.6 -1.7a1.5 1.5 0 0 1 2.6 1.7z`, Pn.hearts);
      }) : [];
      thighArt = [
        shape(skinThigh, isBack ? S.skinShadow : S.skin, [path(smooth([[hx - 24, hy], [hx - 6, hy], [kx - 6, ky], [kx - 22, ky]]), isBack ? S.skinDeep : S.skinShadow, { opacity: 0.8 })], S.skinLine, 1.3),
        shape(cloth, base, [...shade, ...hearts, stroke(`M${bx - tw} ${by - 3}L${bx + tw} ${by - 3}`, Pn.shadow, 1.4)], Pn.line, 1.5),
      ].join('');
      const leg = smooth([[kx - 10, ky - 4], [kx + 10, ky - 4], [ax + 8, ay - 4, 'c'], [ax - 8, ay - 4, 'c']]);
      shinArt = shape(leg, isBack ? S.skinShadow : S.skin, [
        path(smooth([[kx - 16, ky], [kx - 3, ky], [ax - 2, ay], [ax - 16, ay]]), isBack ? S.skinDeep : S.skinShadow, { opacity: 0.8 }),
        path(smooth([[ax - 10, ay - 16], [ax + 10, ay - 16], [ax + 10, ay - 2], [ax - 10, ay - 2]]), Pn.sock ?? '#ece7dc'),
      ], S.skinLine, 1.3);
    } else if (Pn.length === 'shorts') {
      // Shorts that end below the knee: a strip of shin and the ankle show, then a low sock.
      const t = Pn.hem ?? 0.6;
      const hxm = kx + (ax - kx) * t;
      const hym = ky + (ay - ky) * t;
      const leg = smooth([[kx - 10, ky], [kx + 10, ky], [ax + 8, ay - 4, 'c'], [ax - 8, ay - 4, 'c']]);
      const cloth = smooth([[kx - 15, ky - 6], [kx + 15, ky - 6], [hxm + 16.5, hym, 'c'], [hxm - 16.5, hym, 'c']]);
      shinArt = [
        shape(leg, isBack ? S.skinShadow : S.skin, [
          path(smooth([[kx - 16, ky], [kx - 3, ky], [ax - 2, ay], [ax - 16, ay]]), isBack ? S.skinDeep : S.skinShadow, { opacity: 0.8 }),
          path(smooth([[ax - 10, ay - 11], [ax + 10, ay - 11], [ax + 10, ay - 2], [ax - 10, ay - 2]]), Pn.sock ?? '#ece7dc'),
        ], S.skinLine, 1.3),
        shape(cloth, base, [...shade, stroke(`M${hxm - 15} ${hym - 4}L${hxm + 15} ${hym - 4}`, Pn.shadow, 1.6)], Pn.line, 1.5),
      ].join('');
    } else {
      shinArt = shape(shin, base, [...shade, stroke(`M${ax - 13} ${ay - 7}L${ax + 13} ${ay - 7}`, Pn.shadow, 1.6)], Pn.line, 1.5);
    }
    return g(`pierna_${side}_grupo`, [
      g(`muslo_${side}`, [thighArt, pivot(`muslo_${side}`, hx, hy)]),
      g(`pierna_${side}`, [shinArt, pivot(`pierna_${side}`, kx, ky)]),
      g(`pie_${side}`, [foot, pivot(`pie_${side}`, ax, ay)]),
    ]);
  }

  /** Whole character in the rest pose, layered like the kit's artist template. */
  return function body(face = {}) {
    const h = cfg.headAt;
    return g('personaje', [
      arm('detras'),
      leg('detras'),
      leg('delante'),
      g('torso', [torso(), pivot('torso', ...J.torso)]),
      g('cabeza', [g(null, cfg.head(face), { transform: `translate(${h.x} ${h.y}) scale(${h.s})` }), pivot('cabeza', ...J.cabeza)]),
      arm('delante'),
    ]);
  };
}
