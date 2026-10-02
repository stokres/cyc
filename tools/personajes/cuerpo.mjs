// Shared body builder for the crew. Body space: feet at y=0, facing right,
// rest pose (arms and legs straight). Pieces and pivots follow the kit's artist
// template, so every character uses the same rig and animations.
import { smooth, ellipse, path, stroke, g, shape, pivot } from './svg.mjs';

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
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w;
    const y = y0 + r() * h;
    const a = r() * Math.PI;
    const sz = 5 + r() * 4;
    if (r() < 0.7) {
      const pts = [[0, -sz], [sz * 0.42, -sz * 0.2], [sz * 0.3, sz * 0.5], [0, sz], [-sz * 0.3, sz * 0.5], [-sz * 0.42, -sz * 0.2]].map(([px, py]) => [x + px * Math.cos(a) - py * Math.sin(a), y + px * Math.sin(a) + py * Math.cos(a)]);
      out.push(path(smooth(pts), P.leaf, { opacity: 0.75 }));
      out.push(stroke(`M${(pts[0][0] + 0).toFixed(1)} ${pts[0][1].toFixed(1)}L${pts[3][0].toFixed(1)} ${pts[3][1].toFixed(1)}`, P.vein, 0.7, { opacity: 0.6 }));
    } else {
      for (let k = 0; k < 5; k++) {
        const b = a + (k / 5) * Math.PI * 2;
        out.push(path(ellipse(x + Math.cos(b) * 2.4, y + Math.sin(b) * 2.4, 1.8, 1.8), P.flower, { opacity: 0.8 }));
      }
      out.push(path(ellipse(x, y, 1.2, 1.2), P.leaf));
    }
  }
  return out;
}

export function makeBody(cfg) {
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

  function torso() {
    const [nx, ny] = J.cabeza;
    const neck = shape(smooth([[nx - 10, ny - 14], [nx + 8, ny - 14], [nx + 10, top + 4], [nx - 12, top + 4]]), S.skinShadow, [], S.skinLine, 1.2);
    const hips = shape(smooth([[back + 4, hipY - 14], [front - 8, hipY - 14], [front - 6, hipY + 12, 'c'], [back + 5, hipY + 12, 'c']]), Pn.base, [
      path(smooth([[back + 2, hipY - 16], [back + 18, hipY - 16], [back + 18, hipY + 14], [back + 2, hipY + 14]]), Pn.shadow),
    ], Pn.line, 1.4);
    const shading = [
      // Side plane away from us, and the underside above the hem.
      path(smooth([[back - 8, top - 8], [back + 18, top - 4], [back + 14, (top + hipY) / 2], [back + 18, hipY + 4], [back - 8, hipY + 8]]), T.shadow),
      path(smooth([[back, hipY - 8], [0, hipY - 12], [front - 7, hipY - 14], [front + 5, hipY - 2], [back, hipY + 8]]), T.shadow, { opacity: 0.8 }),
      // Light on the chest.
      path(ellipse(front - 17, top + 28, 11, 16, -0.25), T.light, { opacity: 0.9 }),
    ];
    if (cfg.belly) shading.push(path(ellipse(front - 6, hipY - 32, 5, 11, -0.2), T.light, { opacity: 0.5 }));
    if (T.style === 'tee') {
      shading.push(
        stroke(smooth([[-14, top + 1], [-2, top + 5], [12, top + 2]], false), T.shadow, 3),
        stroke(smooth([[26, hipY - 18], [31, hipY - 21], [36, hipY - 17]], false), T.light, 1.4, { opacity: 0.7 }),
      );
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
        stroke(smooth([[front - 22, top + 6], [front - 23, top + 26], [front - 21, top + 34]], false), T.string, 1.6),
        stroke(smooth([[front - 14, top + 5], [front - 13, top + 24], [front - 12, top + 31]], false), T.string, 1.6),
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
      const flapB = smooth([[nx - 10, top - 4], [nx + 2, top - 6], [nx - 2, top + 8], [nx - 14, top + 10]]);
      collar = shape(flapB, T.shadow, [], T.line, 1.3) + shape(flapF, T.base, [path(ellipse(nx + 20, top + 4, 4, 7, -0.6), T.light, { opacity: 0.8 })], T.line, 1.4);
    }
    if (T.style === 'hoodie') {
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

  function arm(side) {
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

  function leg(side) {
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
    const Sh = cfg.shoes;
    let foot;
    if (Sh.style === 'boot') {
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
      ], Sh.line, 1.4);
    }
    return g(`pierna_${side}_grupo`, [
      g(`muslo_${side}`, [shape(thigh, base, shade, Pn.line, 1.5), pivot(`muslo_${side}`, hx, hy)]),
      g(`pierna_${side}`, [
        shape(shin, base, [...shade, stroke(`M${ax - 13} ${ay - 7}L${ax + 13} ${ay - 7}`, Pn.shadow, 1.6)], Pn.line, 1.5),
        pivot(`pierna_${side}`, kx, ky),
      ]),
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
