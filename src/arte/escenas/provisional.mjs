// Placeholder room for the story that is not written yet (Chuchi): back wall, floor, a window, the way out on the right and one object
// that hints at the story. They keep the camera, light and tap model of the
// real scenes, so each story can be played from start to end while its art is
// still to come.
import { path, rect, circle, line, polyD, rectD, rr, lin, gpath, mat, box, bevel, framed, persp, rng } from './kit.mjs';

const P = persp({ HOR: 200, BASE: 800, CX: 1170 });
const W = 2400;
const M = 250;

const WOOD = mat('#b98a5a', '#966a42', '#d4a676', '#5e4129');

function uRange(k, pad = 60) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const vw of [1440, 1920, 2400, 2560]) {
    for (const c of [vw / 2, Math.max(vw / 2, W - vw / 2)]) {
      const off = vw / 2 - P.CX + k * (P.CX - c);
      lo = Math.min(lo, -off);
      hi = Math.max(hi, vw - off);
    }
  }
  return [Math.floor(lo - pad), Math.ceil(hi + pad)];
}

function wall(o) {
  const out = [rect(-80, 0, W + 160, 805, o.pared)];
  out.push(gpath(rectD(-80, 0, W + 160, 805), lin(0, 60, 0, 440, [[0, '#2a2230', 0.25], [1, '#2a2230', 0]])));
  out.push(rect(-80, 0, W + 160, 46, o.techo), rect(-80, 46, W + 160, 14, '#f0e8dc'), rect(-80, 60, W + 160, 8, '#2a2230', { opacity: 0.1 }));
  out.push(rect(-80, 772, W + 160, 28, o.rodapie), rect(-80, 772, W + 160, 4, '#fbf7f0', { opacity: 0.6 }));
  // Window with the night outside.
  out.push(rect(330, 236, 380, 300, '#e8e0d2'), rect(348, 254, 344, 264, '#1c2446'));
  out.push(gpath(rectD(348, 254, 344, 264), lin(0, 254, 0, 518, [[0, '#2c3a6e', 1], [1, '#4a3c64', 1]])));
  for (let i = 0; i < 9; i++) {
    const y = 400 + ((i * 37) % 70);
    out.push(rect(356 + i * 37, y, 26, 518 - y, '#141a34'));
  }
  out.push(rect(517, 254, 6, 264, '#e8e0d2'), rect(330, 536, 380, 16, '#d6cdbd'));
  // The way out: a door on the right.
  out.push(rect(2040, 236, 250, 536, '#3a2a20'), bevel(2056, 252, 218, 520, WOOD, { inset: 16 }));
  out.push(circle(2240, 520, 11, '#d8b25a'), circle(2240, 520, 5, '#8a6a2a'));
  return out.join('');
}

function floor(o) {
  const out = [];
  const { gp } = P;
  const kMax = P.f(1080) + 0.3;
  const quad = (X0, X1, k0, k1) => polyD([gp(X0, k0), gp(X1, k0), gp(X1, k1), gp(X0, k1)]);
  const r = rng(o.semilla);
  out.push(path(quad(-1600, W + 1800, 1, kMax), o.suelo[0]));
  // Boards running away from the camera, staggered joints.
  for (let X = -1600; X < W + 1800; X += 40) {
    let z = 1;
    let primera = true;
    while (1 / z < kMax) {
      const z1 = z - (primera ? 0.04 + r() * 0.2 : 0.16 + r() * 0.1);
      primera = false;
      const k0 = 1 / z;
      const k1 = Math.min(kMax, 1 / Math.max(z1, 0.2));
      out.push(path(quad(X, X + 40, k0, k1), o.suelo[Math.floor(r() * o.suelo.length)]));
      out.push(path(quad(X, X + 40, k0, k0 + 0.006), '#3a2a1e', { opacity: 0.5 }));
      out.push(path(quad(X, X + 1.5, k0, k1), '#3a2a1e', { opacity: 0.35 }));
      z = z1;
    }
  }
  return out.join('');
}

// ---------------------------------------------------------------- one object per story

/** Chuchi: the toy box and the girls' drawings on the wall. */
function juguetes() {
  const out = [box(1100, 640, 300, 132, mat('#e07a8a', '#c05a6a', '#f2a0ac', '#7a2a3a'), { r: 10 })];
  out.push(circle(1160, 626, 26, '#f5c95f'), path(rr(1220, 596, 60, 46, 8), '#5ab0d8'), circle(1330, 620, 22, '#7bb46c'));
  const dibujos = [['#fff6e0', '#e07a8a'], ['#fff6e0', '#5ab0d8'], ['#fff6e0', '#f5c95f']];
  dibujos.forEach(([papel, tinta], i) => {
    const x = 1000 + i * 170;
    const y = 270 + (i % 2) * 30;
    out.push(rect(x, y, 140, 110, papel), circle(x + 50, y + 50, 24, tinta, { opacity: 0.8 }), line(x + 20, y + 95, x + 120, y + 85, tinta, 6));
  });
  return out.join('');
}

const OBJETO = { juguetes };

/**
 * A placeholder room.
 * @param {{ id: string, name: string, pared: string, techo: string, rodapie: string, suelo: string[], ambient: string, objeto: keyof typeof OBJETO, luz: string, semilla: number }} o
 */
export function escena(o) {
  const fl = uRange(P.f(1080));
  return {
    id: o.id,
    name: o.name,
    W,
    H: 1080,
    HOR: P.HOR,
    BASE: P.BASE,
    CX: P.CX,
    M,
    ambient: o.ambient,
    walk: { y0: 846, y1: 936, x0: 160, x1: 2240 },
    start: { X: 900, y: 890 },
    layers: [
      { id: 'pared', k: 1, x0: -80, x1: W + 80, y0: 0, y1: 805, body: wall(o) + OBJETO[o.objeto](), lit: true },
      { id: 'suelo', floor: true, x0: fl[0], x1: fl[1], y0: 800, y1: 1080, body: floor(o), lit: true },
    ],
    lights: [
      { X: 1240, y: 120, r: 1100, color: o.luz, power: 0.7, fy: 880 },
      { X: 520, y: 380, r: 600, color: '#9aa6dc', power: 0.35, fy: 860 },
      { X: 2160, y: 300, r: 600, color: o.luz, power: 0.35, fy: 860 },
    ],
    spots: {},
    zonas: {
      ventana: { u: 520, k: 1, w: 380, top: 236, bottom: 552, X: 520, y: 866 },
      cosa: { u: 1250, k: 1, w: 560, top: 240, bottom: 780, X: 1250, y: 870 },
      salida: { u: 2165, k: 1, w: 250, top: 236, bottom: 772, X: 2120, y: 866 },
    },
  };
}
