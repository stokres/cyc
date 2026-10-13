// PokéUsera · Edición Jarra (arte v2): batch c of the 64×64 useritos (same conventions as useritos2.ts).
import type { Dibujo2 } from './useritos2';
import { Pintor, Mascara, bez3, cur, el, espejo, inter, mover, men, par, poli, rc, rr, trazo, un, type Mat } from './pintor';

/**
 * A flame tongue: an S-shaped spine from the base (x0, y0) to the tip (tx, ty) swollen near the base and tapering to a
 * point. `a` is the amplitude of the S (positive bulges the lower half to the right and the tip curls back left).
 */
function llamaMasa(x0: number, y0: number, w: number, tx: number, ty: number, a = 0): Mascara {
  const h = y0 - ty;
  const esp = bez3([x0, y0], [x0 + a, y0 - h * 0.34], [x0 + (tx - x0) * 0.7 - a * 0.9, y0 - h * 0.7], [tx, ty], 22);
  const izq: [number, number][] = [];
  const der: [number, number][] = [];
  esp.forEach(([x, y], i) => {
    const t = i / (esp.length - 1);
    const p = esp[Math.max(0, i - 1)];
    const q = esp[Math.min(esp.length - 1, i + 1)];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const l = Math.hypot(dx, dy) || 1;
    const r = w * Math.pow(1 - t, 0.72) * (0.8 + 0.3 * Math.sin(Math.min(1, t * 2.6) * Math.PI * 0.5));
    izq.push([x + (dy / l) * r, y - (dx / l) * r]);
    der.push([x - (dy / l) * r, y + (dx / l) * r]);
  });
  return poli([...izq, ...der.reverse()]);
}

// ---------------------------------------------------------------------------------------------
// Chupitochu · a fierce shot glass of burning liquor, flames for hair.
// ---------------------------------------------------------------------------------------------
const VIDRIO_C: Mat = { r: ['#6f98b4', '#b4dcea', '#f2ffff'], ol: '#2a1220', ol2: '#4d7690' };
const LICOR: Mat = { r: ['#4a0c14', '#7c1418', '#b82a1c', '#e65018', '#ff8a24'], ol: '#2a1220' };
const LLAMA: Mat = { r: ['#c43018', '#f26a1c', '#ffb42c', '#fff09a'], ol: '#7c1418', ol2: '#c43018' };
const TINTA_C = '#2a1220';
const BRASA = '#fff09a';

function chupitochu(P: Pintor): void {
  const f = P.f;
  const sw = f ? 1 : -1; // flames lean one way, then the other
  const cima = 27; // y of the rim and the liquor surface

  // Glass: a tapered tumbler with a heavy bottom and an elliptical rim.
  const cuerpo = un(poli([[15, cima], [49, cima], [44, 59], [20, 59]]), rr(20, 55, 24, 5, 2.4), el(32, cima, 17.4, 3.8));
  P.forma(cuerpo, VIDRIO_C, { modo: 'cil', eje: 32, semi: 17, rad: 3.2 });
  // The liquor inside (3 px of glass wall at the sides, a thick glass bottom).
  const licor = un(poli([[18.4, cima + 3.4], [45.6, cima + 3.4], [41.8, 54], [22.2, 54]]), el(32, 54, 9.8, 2.4));
  P.forma(licor, LICOR, { modo: 'cil', eje: 32, semi: 14, borde: false, rim: false, grad: 0.5 });
  // The open mouth of the glass: the glowing surface of the liquor and a thin ring of glass in front of it.
  P.llenar(el(32, cima, 14.8, 2.9), '#f26a1c');
  P.llenar(inter(el(32, cima + 0.4, 13, 2.1), rc(0, cima, 64, 5)), '#ffb42c');
  P.llenar(inter(el(31, cima + 0.2, 8, 1), rc(0, cima, 64, 5)), BRASA);
  for (let x = 16; x <= 48; x++) {
    const u = (x + 0.5 - 32) / 17.4;
    const y = Math.round(cima + 3.4 * Math.sqrt(Math.max(0, 1 - u * u)));
    P.px(x, y, x < 28 ? '#f2ffff' : x < 40 ? '#b4dcea' : '#6f98b4');
  }
  // Refraction: a long bright streak on the left, a short one on the right, a glint on the foot.
  P.llenar(rc(16, cima + 5, 1, 20), '#f2ffff');
  P.px(16, cima + 5, '#ffffff');
  P.llenar(rc(15, cima + 3, 1, 2), '#b4dcea');
  P.px(17, cima + 26, '#b4dcea');
  P.llenar(rc(47, cima + 8, 1, 9), '#b4dcea');
  P.llenar(rc(46, cima + 18, 1, 2), '#b4dcea');
  P.llenar(rc(23, 57, 9, 1), '#f2ffff');
  P.llenar(rc(34, 58, 6, 1), '#6f98b4');
  P.llenar(rc(17, cima - 1, 3, 1), '#f2ffff');
  // Bubbles of the burning liquor.
  const burb: [number, number][] = [[38, 49], [25, 51], [42, 42]];
  burb.forEach(([x, y], i) => {
    const yy = y - (f ? 1 + (i % 2) : 0);
    P.px(x, yy, '#ff8a24');
    P.px(x + 1, yy, '#b82a1c');
  });

  P.cara(() => {
    // Angry eyes: whites cut by a steep brow, an ember pupil that stares, a brow of ink.
    for (const lado of [0, 1]) {
      const X = (x: number) => (lado ? 63 - x : x);
      const T = (m: Mascara) => (lado ? espejo(m) : m);
      const blanco = inter(el(25.8, 40.2, 4.1, 4.4), poli([[20, 35.4], [30, 39.4], [30, 48], [20, 48]]));
      P.llenar(T(blanco), BRASA);
      P.aro(T(blanco), TINTA_C);
      P.llenar(T(inter(blanco, rc(20, 43, 12, 4))), '#ffb42c');
      P.llenar(T(el(26.8, 40.2, 2.3, 2.7)), TINTA_C);
      P.px(X(26), 39, '#ffffff');
      P.px(X(25), 40, '#ffffff');
      // The brow: thick, slanted down towards the middle, with a lit edge.
      P.llenar(T(trazo([[19.8, 33.4], [29.4, 37.8]], 1.6, 1.4)), TINTA_C);
      P.llenar(T(trazo([[20.8, 32.2], [25.4, 34.4]], 0.7, 0.7)), '#7c1418');
    }
    // Snarling mouth: wide, with little teeth, a spark of tongue.
    const boca = poli([[25, 47.6], [39, 47.6], [37.6, 52], [26.4, 52]]);
    P.llenar(boca, TINTA_C);
    P.llenar(inter(boca, rc(22, 48, 20, 2)), BRASA);
    for (const x of [27, 30, 33, 36]) P.px(x, 49, TINTA_C);
    for (const x of [28, 31, 34, 37]) P.px(x, 51, BRASA);
    P.px(24, 46, TINTA_C);
    P.px(40, 46, TINTA_C);
    // Hot cheeks.
    P.llenar(rc(20, 46, 2, 2), '#ff8a24');
    P.llenar(rc(42, 46, 2, 2), '#ff8a24');
  });
  P.dorso(() => {
    // From behind: a cream label on the glass with a little flame badge, a long glint.
    const eti = rr(22, cima + 9, 20, 17, 3);
    P.forma(eti, { r: ['#f26a1c', '#ffb42c', '#fff09a'], ol: '#2a1220', ol2: '#7c1418' }, { rad: 3, sesgo: 0.1 });
    P.forma(llamaMasa(32, cima + 21.6, 5, 33, cima + 11.4, 2.6), { r: ['#7c1418', '#c43018', '#c43018'], ol: '#4a0c14' }, { paso: 1 });
    P.llenar(llamaMasa(32, cima + 21, 3, 32.6, cima + 14.6, 1.6), '#f26a1c');
    P.llenar(llamaMasa(32, cima + 20.6, 1.5, 32.4, cima + 17, 0.8), '#ffb42c');
    P.llenar(rc(25, cima + 23, 14, 1), '#f26a1c');
    P.llenar(rc(27, cima + 25, 10, 1), '#f26a1c');
    P.llenar(rc(24, cima + 10, 4, 1), '#fff09a');
  });

  // Flames dancing on top, five tongues of different sizes (the sway alternates between frames).
  const lenguas: { x: number; w: number; tx: number; ty: number; a: number }[] = [
    { x: 21, w: 4.2, tx: 9 + sw, ty: 17, a: -4 },
    { x: 43, w: 4.4, tx: 55 - sw, ty: 15 + (f ? 1 : 0), a: 4 },
    { x: 26, w: 5.8, tx: 18 + sw, ty: 8 + (f ? 1 : 0), a: -5 },
    { x: 38, w: 5.8, tx: 47 - sw, ty: 6 + (f ? 0 : 1), a: 5 },
    { x: 32, w: 7, tx: 34 + sw * 2, ty: 1 + (f ? 2 : 0), a: -5 },
  ];
  for (const l of lenguas) {
    const m = llamaMasa(l.x, cima + 1, l.w, l.tx, l.ty, l.a);
    P.forma(m, LLAMA, { paso: 1, borde: true });
    const alto = cima - l.ty;
    // Darker red at the foot and on the shaded side, a hot orange body, a yellow heart and a white-hot core.
    P.llenar(inter(m, rc(0, cima - 3, 64, 6)), '#c43018');
    P.llenar(llamaMasa(l.x - 0.6, cima, l.w * 0.8, l.x + (l.tx - l.x) * 0.8, cima - alto * 0.8, l.a * 0.85), '#f26a1c');
    P.llenar(llamaMasa(l.x - 0.4, cima, l.w * 0.58, l.x + (l.tx - l.x) * 0.55, cima - alto * 0.62, l.a * 0.6), '#ffb42c');
    P.llenar(llamaMasa(l.x - 0.4, cima - 0.5, l.w * 0.28, l.x + (l.tx - l.x) * 0.28, cima - alto * 0.36, l.a * 0.3), BRASA);
  }
  // Floating embers.
  P.px(7 - sw, 19 - (f ? 2 : 0), '#ffb42c');
  P.px(57 + sw, 9 + (f ? 2 : 0), '#ffb42c');
  P.px(59 + sw, 10 + (f ? 2 : 0), '#f26a1c');
  P.px(5 - sw, 25 - (f ? 2 : 0), '#f26a1c');
}

// ---------------------------------------------------------------------------------------------
// Caravaner · cream-and-teal vintage caravan seen front-3/4 (oblique: the front face is flat to the viewer,
// the left side and the roof recede up-left). Portholes for eyes, curtains, tow-hitch nose.
// ---------------------------------------------------------------------------------------------
const CREMA_C: Mat = { r: ['#d2bf94', '#ecdcb4', '#faf0d2', '#fffbe8'], ol: '#5a3c28', ol2: '#a8885a' };
const TURQ: Mat = { r: ['#1c6a6c', '#2a9a98', '#4cc4b8', '#8ae4d4'], ol: '#0e3a44', ol2: '#1c6a6c' };
const CROMO: Mat = { r: ['#7a8490', '#c0cad4', '#fffbe8'], ol: '#1a1c24', ol2: '#7a8490' };
const GOMA: Mat = { r: ['#1a1c24', '#3a3f4c', '#3a3f4c'], ol: '#1a1c24' };
const TINTA2 = '#1a1c24';
const NARANJA = '#e8602c';

/** Rounded box outline as a polygon: radius rt at the top corners, rb at the bottom ones. */
function cajaRedonda(x: number, y: number, w: number, h: number, rt: number, rb: number): Mascara {
  const pts: [number, number][] = [];
  const arco = (cx: number, cy: number, r: number, a0: number) => {
    for (let i = 0; i <= 8; i++) {
      const a = ((a0 + (i / 8) * 90) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  arco(x + rt, y + rt, rt, 180);
  arco(x + w - rt, y + rt, rt, 270);
  arco(x + w - rb, y + h - rb, rb, 0);
  arco(x + rb, y + h - rb, rb, 90);
  return poli(pts);
}

/** Caravan skew: a point at depth `u` (0 = front edge, 1 = back edge) and front-plane height `y`. */
const prof = (x: number, u: number, y: number): [number, number] => [x - 17 * u, y - 4 * u];

function caravaner(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const dy = f ? 1 : 0; // frame 1: the body sags a pixel on its springs
  const Y = (y: number) => y + dy;
  const mira = f ? 1 : -1; // pupils glance one way, then the other

  // The far wheel only peeks out under the front face.
  P.forma(rr(46, 51, 12, 8, 3), GOMA, { rad: 2.5, paso: 0 });
  P.llenar(rc(48, 52, 6, 1), '#3a3f4c');

  // Left wall, roof and front face: the front shape swept up-left gives the whole body.
  const frente = cajaRedonda(24, Y(12), 34, 42, 11, 5);
  let barrido = new Mascara();
  for (let k = 0; k <= 17; k++) barrido = un(barrido, mover(frente, -k, -Math.round(k * 0.235)));
  const zonaPared = poli([[24.5, Y(24)], [6, Y(18.5)], [6, Y(58)], [24.5, Y(58)]]);
  const pared = inter(men(barrido, frente), zonaPared);
  const techo = men(barrido, frente, zonaPared);
  P.forma(pared, CREMA_C, { rad: 7, sesgo: -0.3, grad: 0.1 });
  P.forma(techo, CREMA_C, { rad: 3, sesgo: 0.3, grad: 0.1 });
  P.forma(frente, CREMA_C, { rad: 9, sesgo: 0, grad: 0.4 });
  // Teal stripes: along the roof edge and along the skirt, on both planes.
  const bandaF = (y0: number, y1: number) => rc(0, Y(y0), 64, y1 - y0);
  const bandaP = (y0: number, y1: number) => poli([prof(24, 0, Y(y0)), prof(24, 1, Y(y0)), prof(24, 1, Y(y1)), prof(24, 0, Y(y1))]);
  P.forma(inter(bandaP(46, 54), pared), TURQ, { rad: 3, sesgo: -0.5, grad: 0 });
  P.forma(inter(bandaF(45, 54), frente), TURQ, { rad: 3, sesgo: 0, grad: 0.1 });
  P.forma(inter(frente, rc(0, Y(12), 64, 6)), TURQ, { rad: 2, sesgo: 0.1, grad: 0 });

  // Roof vent and a tiny aerial.
  P.forma(rr(26, Y(2), 11, 7, 3), TURQ, { rad: 3 });
  P.llenar(rc(28, Y(3), 4, 1), '#8ae4d4');
  P.llenar(rc(27, Y(6), 9, 1), '#1c6a6c');
  P.llenar(cur([[48, Y(10)], [51, Y(3)]], 1), TINTA2);
  P.px(51, Y(2), NARANJA);

  if (!E) {
    // --- Front: the door on the left wall.
    const S = (u: number, y: number): [number, number] => prof(24, u, Y(y));
    const puerta = poli([S(0.1, 21), S(0.44, 21), S(0.44, 46), S(0.1, 46)]);
    P.forma(puerta, TURQ, { rad: 3, sesgo: -0.45, grad: 0 });
    const [vx, vy] = S(0.27, 29);
    P.forma(el(vx, vy, 2.6, 3.2), CROMO, { rad: 2, sesgo: -0.1 });
    P.llenar(el(vx, vy + 0.2, 1.4, 1.9), '#8ae4d4');
    P.px(vx - 1, vy - 1, '#fffbe8');
    const [hx, hy] = S(0.14, 37);
    P.llenar(rc(hx, hy, 1, 3), '#c0cad4');
    P.px(hx, hy, '#fffbe8');
    // A second window on the wall with a drape.
    const vent = poli([S(0.56, 22), S(0.9, 22), S(0.9, 34), S(0.56, 34)]);
    P.forma(vent, CROMO, { rad: 2, sesgo: -0.5 });
    P.llenar(inter(vent, poli([S(0.6, 24), S(0.86, 24), S(0.86, 32), S(0.6, 32)])), '#4cc4b8');
    P.llenar(inter(vent, poli([S(0.6, 24), S(0.86, 24), S(0.86, 26.4), S(0.6, 26.4)])), '#8ae4d4');
    P.llenar(inter(vent, poli([S(0.6, 24), S(0.67, 24), S(0.65, 32), S(0.6, 32)])), '#2a9a98');
    // A teal stripe along the wall.
    P.llenar(poli([S(0.45, 38), S(1, 38), S(1, 40), S(0.45, 40)]), '#2a9a98');
    // Eyes: portholes with a chrome ring, curtains tied to the sides.
    const ojos: [number, number][] = [[33, 29.5], [49, 29.5]];
    for (const [cx, cy0] of ojos) {
      const cy = Y(cy0);
      const anillo = men(el(cx, cy, 6.6, 6.6), el(cx, cy, 4.8, 4.8));
      P.forma(anillo, CROMO, { rad: 1.6 });
      const dentro = el(cx, cy, 4.8, 4.8);
      P.llenar(dentro, '#fffbe8');
      P.llenar(inter(dentro, rc(Math.floor(cx) - 6, cy - 6, 12, 3)), '#faf0d2');
      // Drapes at the two sides of the window.
      P.llenar(inter(dentro, poli([[cx - 6, cy - 6], [cx - 3.2, cy - 6], [cx - 4.2, cy - 1.5], [cx - 3.8, cy + 1.2], [cx - 4.6, cy + 2.4], [cx - 6, cy + 2.4]])), '#2a9a98');
      P.llenar(inter(dentro, poli([[cx + 6, cy - 6], [cx + 3.2, cy - 6], [cx + 4.2, cy - 1.5], [cx + 3.8, cy + 1.2], [cx + 4.6, cy + 2.4], [cx + 6, cy + 2.4]])), '#2a9a98');
      P.llenar(inter(dentro, rc(Math.floor(cx) - 6, cy - 6, 12, 1)), '#4cc4b8');
            // Pupils.
      P.llenar(el(cx + mira * 0.6, cy + 0.8, 2.3, 2.8), TINTA2);
      P.px(Math.round(cx + mira * 0.6) - 1, cy - 0.4, '#fffbe8');
      P.px(Math.round(cx + mira * 0.6) - 1, cy - 1.4, '#fffbe8');
    }
    // Eyebrows: little chrome strips over the windows, lifted at the outer ends.
    // Smile: an open happy mouth under the eyes with a tongue.
    const boca = inter(el(41, Y(37), 8.2, 5.6), rc(30, Y(37), 22, 8));
    P.llenar(boca, TINTA2);
    P.llenar(inter(boca, rc(30, Y(37), 22, 2)), '#fffbe8');
    P.llenar(inter(el(41, Y(43.6), 4.4, 2.6), boca), NARANJA);
    P.px(32, Y(36), TINTA2);
    P.px(50, Y(36), TINTA2);
    // Marker lights like rosy cheeks.
    for (const cx of [28.5, 53.5]) {
      P.llenar(el(cx, Y(38), 2.2, 2.2), NARANJA);
      P.aro(el(cx, Y(38), 2.2, 2.2), '#5a3c28');
      P.px(Math.round(cx) - 1, Y(37), '#fffbe8');
    }
    // Number plate on the skirt.
    P.llenar(rc(35, Y(48), 12, 4), '#fffbe8');
    P.aro(rc(35, Y(48), 12, 4), TINTA2);
    for (const x of [37, 39, 41, 43]) P.llenar(rc(x, Y(49), 1, 2), TINTA2);
  }
  if (E) {
    // --- Back: rear window with drapes, tail lights, a spare wheel and the plate.
    const S = (u: number, y: number): [number, number] => prof(24, u, Y(y));
    for (const [u0, u1] of [[0.18, 0.5], [0.6, 0.86]] as [number, number][]) {
      const vent = poli([S(u0, 20), S(u1, 20), S(u1, 36), S(u0, 36)]);
      P.forma(vent, CROMO, { rad: 2, sesgo: -0.5 });
      P.llenar(inter(vent, poli([S(u0 + 0.03, 22), S(u1 - 0.03, 22), S(u1 - 0.03, 34), S(u0 + 0.03, 34)])), '#4cc4b8');
      P.llenar(inter(vent, poli([S(u0 + 0.03, 22), S(u1 - 0.03, 22), S(u1 - 0.03, 26), S(u0 + 0.03, 26)])), '#8ae4d4');
      P.llenar(inter(vent, poli([S(u0 + 0.03, 22), S(u0 + 0.12, 22), S(u0 + 0.08, 34), S(u0 + 0.03, 34)])), '#2a9a98');
    }
    // Rear window.
    const ven = rr(29, Y(17), 24, 14, 4);
    P.forma(ven, CROMO, { rad: 2 });
    const cris = rr(31, Y(19), 20, 10, 3);
    P.llenar(cris, '#4cc4b8');
    P.llenar(inter(cris, rc(31, Y(19), 20, 3)), '#8ae4d4');
    P.llenar(inter(cris, poli([[31, Y(19)], [37, Y(19)], [34, Y(29)], [31, Y(29)]])), '#2a9a98');
    P.llenar(inter(cris, poli([[51, Y(19)], [45, Y(19)], [48, Y(29)], [51, Y(29)]])), '#2a9a98');
    P.llenar(cur([[39, Y(27)], [43, Y(22)]], 1), '#fffbe8');
    P.px(37, Y(24), '#1c6a6c');
    P.px(45, Y(24), '#1c6a6c');
    // Spare wheel.
    const rueda = el(41, Y(40.4), 7.4, 7.4);
    P.forma(rueda, GOMA, { rad: 3, paso: 0 });
    P.llenar(men(el(41, Y(40.4), 6.2, 6.2), el(41, Y(40.4), 3.6, 3.6)), '#3a3f4c');
    P.forma(el(41, Y(40.4), 3.6, 3.6), CROMO, { rad: 3 });
    P.px(41, Y(40), '#fffbe8');
    for (const [dx, dyy] of [[0, -2], [2, 0], [0, 2], [-2, 0]] as [number, number][]) P.px(41 + dx, Y(40) + dyy + 0, '#7a8490');
    // Tail lights and plate.
    for (const [x0, x1] of [[26, 29], [53, 56]]) {
      P.forma(rr(x0, Y(33), x1 - x0 + 1, 8, 1), { r: [NARANJA, NARANJA, '#faf0d2'], ol: '#5a3c28' }, { rad: 2 });
    }
    P.llenar(rc(35, Y(49), 12, 4), '#fffbe8');
    P.aro(rc(35, Y(49), 12, 4), TINTA2);
    for (const x of [37, 39, 41, 43]) P.llenar(rc(x, Y(50), 1, 2), TINTA2);
  }

  // Near-side wheel in front of the wall, on its dark arch.
  const arco = inter(pared, el(14.5, 52, 9.6, 9.6));
  P.llenar(arco, TINTA2);
  P.forma(el(14.5, 52.2, 7.4, 7.4), GOMA, { rad: 3, paso: 0 });
  P.llenar(cur(bez3([9, 49], [11, 46], [15, 45.4], [19, 47], 8), 1), '#3a3f4c');
  P.forma(el(14.5, 52.2, 3.6, 3.6), CROMO, { rad: 3 });
  P.px(13, 51, '#fffbe8');
  P.px(14, 50, '#fffbe8');
  P.px(16, 54, TINTA2);
  P.px(12, 54, '#7a8490');
  P.px(16, 50, '#7a8490');

  if (!E) {
    // Tow hitch: an A-frame ending in a coupling ball, the "nose".
    P.forma(un(trazo([[34, Y(51)], [39.6, 57.6]], 1.5, 1.3), trazo([[48, Y(51)], [42.4, 57.6]], 1.5, 1.3)), CROMO, { rad: 1.5 });
    P.llenar(cur([[35, Y(52)], [38.6, 56.4]], 1), '#fffbe8');
    P.forma(rr(38, 57, 6, 3, 1.4), CROMO, { rad: 1.5 });
    P.forma(el(41, 61.4, 2.4, 1.7), GOMA, { rad: 1.5, paso: 1 });
    P.px(40, 61, '#c0cad4');
  } else {
    // Rear bumper.
    P.forma(rc(25, Y(53), 33, 2), CROMO, { rad: 1.2, borde: false });
    P.llenar(rc(26, Y(53), 30, 1), '#fffbe8');
  }
}

// ---------------------------------------------------------------------------------------------
// Camioner · the red truck cab, the other half of the saga duo. Headlight eyes, chrome grille grin,
// sun visor, chrome air horns on the roof like bull horns, wing-mirror ears, mud flaps.
// ---------------------------------------------------------------------------------------------
const ROJO_C: Mat = { r: ['#6a1420', '#a82030', '#d83a34', '#f2685a'], ol: '#2c0a14', ol2: '#6a1420' };
const CROMO2: Mat = { r: ['#6c7684', '#b4c0cc', '#f4fbff'], ol: '#1a1c24', ol2: '#6c7684' };
const CRISTAL: Mat = { r: ['#2c5a86', '#58a0cc', '#a8e0f4'], ol: '#1a1c24', ol2: '#2c5a86' };
const GOMA2: Mat = { r: ['#1a1c24', '#3a3f4c', '#3a3f4c'], ol: '#1a1c24' };
const AMBAR = '#ffb42c';

function camioner(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const dy = f ? 1 : 0; // the cab settles on its suspension
  const Y = (y: number) => y + dy;
  const mira = f ? 1 : -1;
  const T = (m: Mascara) => m; // (all drawn symmetric; kept for readability)
  void T;

  // Exhaust stacks: behind the cab from the front, in front of the back panel from behind (drawn later).
  const pila = (x: number) => {
    P.forma(rr(x, 12, 4, 30, 1.8), CROMO2, { modo: 'cil', eje: x + 2, semi: 2, rad: 2 });
    P.llenar(rc(x, 12, 4, 1), '#1a1c24');
    P.llenar(rc(x + 1, 13, 2, 1), '#6c7684');
    P.llenar(rc(x + 1, 15, 1, 24), '#f4fbff');
    P.llenar(rc(x, 22, 4, 1), '#6c7684');
    P.llenar(rc(x, 34, 4, 1), '#6c7684');
  };
  const humo = (x: number) => {
    const d = f ? 1 : 0;
    P.forma(el(x + 2 - d, 8 - d, 2.8, 2.4), CROMO2, { rad: 2, paso: 1, borde: false });
    P.forma(el(x + 3 + d, 4 - d * 2, 2, 1.8), CROMO2, { rad: 2, paso: 1, borde: false });
    P.px(x + 1 - d, 7 - d, '#f4fbff');
    P.px(x + 3 + d, 3 - d * 2, '#f4fbff');
  };
  if (!E) {
    pila(6);
    pila(54);
    humo(6);
    humo(54);
  }

  // Tyres and mud flaps.
  for (const x of [3, 52]) {
    P.forma(rr(x, 35, 9, 24, 3), GOMA2, { rad: 3, paso: 0 });
    for (const y of [38, 42, 46, 50, 54]) P.llenar(rc(x + 1, y, 7, 1), '#3a3f4c');
    P.llenar(rc(x + 1, 36, 1, 21), '#3a3f4c');
  }
  for (const x of [3, 53]) {
    P.forma(rr(x, 56, 8, 6, 1), GOMA2, { rad: 2, paso: 1 });
    P.llenar(rc(x + 1, 58, 6, 1), '#6c7684');
    P.px(x + 3, 59, '#b4c0cc');
    P.px(x + 4, 59, '#b4c0cc');
  }

  // The cab: rounded box, wheel-arch fenders, a long visor.
  const cab = cajaRedonda(12, Y(10), 40, 46, 9, 4);
  P.sombra(cab, 0, 1, 1);
  P.forma(cab, ROJO_C, { rad: 10, grad: 0.4 });
  for (const x of [2, 50]) P.forma(rr(x, Y(33), 12, 9, 4), ROJO_C, { rad: 4, grad: 0.3 });
  // Wing mirrors: the ears.
  for (const lado of [0, 1]) {
    const X = (x: number) => (lado ? 63 - x : x);
    P.llenar(rc(lado ? 52 : 10, Y(24), 3, 1), '#6c7684');
    P.forma(lado ? rr(53, Y(18), 6, 11, 2.6) : rr(5, Y(18), 6, 11, 2.6), ROJO_C, { rad: 3 });
    if (!E) {
      P.llenar(lado ? rc(55, Y(20), 3, 7) : rc(6, Y(20), 3, 7), '#a8e0f4');
      P.px(X(7), Y(20), '#f4fbff');
      P.px(X(7), Y(21), '#f4fbff');
    } else {
      P.px(X(7), Y(20), '#f2685a');
      P.px(X(7), Y(21), '#f2685a');
    }
  }

  P.cara(() => {
    // Windscreen under the visor.
    const parabrisas = rr(15, Y(19), 34, 12, 3);
    P.forma(parabrisas, CRISTAL, { rad: 5, grad: 0.5 });
    P.llenar(cur([[18, Y(28)], [24, Y(21)]], 1), '#f4fbff');
    P.llenar(cur([[21, Y(29)], [24, Y(25)]], 1), '#a8e0f4');
    P.llenar(cur([[33, Y(29)], [39, Y(21)]], 1), '#a8e0f4');
    P.llenar(rc(31, Y(19), 2, 1), '#1a1c24');
    // Dice hanging from the mirror, wipers.
    P.llenar(cur([[32, Y(20)], [32, Y(23)]], 1), '#1a1c24');
    P.llenar(rc(30, Y(23), 4, 4), '#f4fbff');
    P.aro(rc(30, Y(23), 4, 4), '#1a1c24');
    P.px(31, Y(24), '#1a1c24');
    P.px(32, Y(25), '#1a1c24');
    if (f) {
      P.llenar(cur([[38, Y(30)], [43, Y(24)]], 1), '#1a1c24');
      P.llenar(cur([[20, Y(30)], [25, Y(24)]], 1), '#1a1c24');
    } else {
      P.llenar(cur([[38, Y(30)], [47, Y(29)]], 1), '#1a1c24');
      P.llenar(cur([[17, Y(30)], [26, Y(29)]], 1), '#1a1c24');
    }
  });
  // The visor: a darker brim with a chrome edge.
  const visera = rr(10, Y(13), 44, 6, 3);
  P.forma(visera, ROJO_C, { rad: 3, sesgo: -0.1, grad: 0.1 });
  P.llenar(rc(12, Y(14), 40, 1), '#f2685a');
  P.llenar(rc(11, Y(17), 42, 1), '#6a1420');
  // Roof marker lights.
  for (const x of [26, 31, 36]) {
    P.forma(rr(x, Y(9), 4, 3, 1), { r: ['#e8602c', AMBAR, '#f4fbff'], ol: '#2c0a14', ol2: '#e8602c' }, { rad: 1.5, rim: false });
  }
  // Chrome air horns on the roof, bull-horn style.
  for (const lado of [0, 1]) {
    const X = (x: number) => (lado ? 63 - x : x);
    const trompa = trazo([[X(22), Y(11)], [X(18), Y(8)], [X(15.4), Y(3.6)]], 1.4, 2.8);
    P.forma(trompa, CROMO2, { rad: 2.2 });
    P.llenar(el(X(14.9), Y(3.2), 2.2, 1.5), '#1a1c24');
    P.px(X(18), Y(9), '#f4fbff');
  }

  if (!E) {
    // Headlight eyes with chrome bezels.
    for (const cx of [22, 42]) {
      const cy = Y(37);
      const aro = el(cx, cy, 6.6, 6.6);
      P.llenar(aro, '#6c7684');
      P.llenar(el(cx - 0.4, cy - 0.5, 6, 6), '#b4c0cc');
      P.aro(aro, '#1a1c24');
      P.llenar(cur([[cx - 4, cy - 4], [cx - 1, cy - 5.6]], 1), '#f4fbff');
      P.px(cx - 5, cy - 2, '#f4fbff');
      P.llenar(el(cx, cy, 4.6, 4.6), '#f4fbff');
      P.llenar(inter(el(cx, cy, 4.6, 4.6), rc(cx - 6, cy + 2, 12, 5)), AMBAR);
      P.llenar(el(cx + mira * 0.6, cy + 0.2, 2.2, 2.7), '#1a1c24');
      P.px(Math.round(cx + mira * 0.6) - 1, cy - 1, '#f4fbff');
      P.px(Math.round(cx + mira * 0.6) - 1, cy - 2, '#f4fbff');
    }
    // Marker lights: orange cheeks.
    for (const cx of [14.5, 49.5]) {
      P.llenar(el(cx, Y(46), 2, 2), '#e8602c');
      P.aro(el(cx, Y(46), 2, 2), '#2c0a14');
      P.px(Math.round(cx) - 1, Y(45), '#f4fbff');
    }
    // Chrome grille grin: a half-moon of chrome with dark slots like teeth.
    const boca = inter(el(32, Y(44), 14.4, 8.4), rc(0, Y(44), 64, 12));
    P.forma(boca, CROMO2, { rad: 3 });
    const hueco = inter(el(32, Y(44), 12.4, 6.4), rc(0, Y(45), 64, 12));
    P.llenar(hueco, '#1a1c24');
    hueco.each((x, y) => {
      if ((x - 20) % 3 === 0 && y > Y(45)) P.px(x, y, '#b4c0cc');
    });
    P.llenar(rc(21, Y(45), 22, 1), '#6c7684');
  }
  if (E) {
    // Rear window, number plate, tool box, tail lights; the stacks stand in front of the panel.
    P.forma(rr(18, Y(19), 28, 11, 3), CRISTAL, { modo: 'plano', paso: 1 });
    P.llenar(rc(19, Y(20), 26, 2), '#a8e0f4');
    P.llenar(rc(19, Y(28), 26, 1), '#2c5a86');
    P.llenar(cur([[22, Y(27)], [27, Y(22)]], 1), '#f4fbff');
    P.llenar(cur([[31, Y(27)], [35, Y(22)]], 1), '#a8e0f4');
    P.llenar(cur([[37, Y(27)], [40, Y(23)]], 1), '#a8e0f4');
    P.forma(rr(15, Y(33), 34, 8, 2), ROJO_C, { rad: 3, sesgo: -0.15 });
    for (const x of [19, 26, 33, 40, 46]) P.llenar(rc(x, Y(35), 1, 4), '#6a1420');
    P.llenar(rc(17, Y(34), 30, 1), '#f2685a');
    P.llenar(rc(27, Y(43), 10, 5), '#3a3f4c');
    P.llenar(rc(28, Y(44), 8, 3), '#6c7684');
    for (const x of [16, 46]) {
      P.forma(rr(x, Y(43), 3, 8, 1), { r: ['#e8602c', AMBAR, '#f4fbff'], ol: '#2c0a14', ol2: '#e8602c' }, { rad: 1.5, rim: false });
    }
    pila(8);
    pila(52);
    humo(8);
    humo(52);
  }
  // Chrome bumper, the same front and back.
  P.forma(rr(7, Y(52), 50, 6, 2.6), CROMO2, { rad: 2.4 });
  P.llenar(rc(10, Y(53), 44, 1), '#f4fbff');
  P.llenar(rc(9, Y(56), 46, 1), '#6c7684');
  if (!E) {
    P.llenar(rc(26, Y(53), 12, 3), '#f4fbff');
    P.aro(rc(26, Y(53), 12, 3), '#1a1c24');
    for (const x of [28, 30, 33, 35]) P.px(x, Y(54), '#1a1c24');
  }
}

/** A leaf: a curved spine swollen in the middle and pointed at both ends (width w). */
function hojaMasa(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], w: number): { m: Mascara; spine: [number, number][]; norm: [number, number][] } {
  const spine = bez3(p0, p1, p2, p3, 24);
  const izq: [number, number][] = [];
  const der: [number, number][] = [];
  const norm: [number, number][] = [];
  spine.forEach(([x, y], i) => {
    const t = i / (spine.length - 1);
    const a = spine[Math.max(0, i - 1)];
    const q = spine[Math.min(spine.length - 1, i + 1)];
    const dx = q[0] - a[0];
    const dy = q[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const r = w * Math.pow(Math.sin(Math.PI * (0.04 + 0.92 * t)), 0.85);
    izq.push([x + (dy / l) * r, y - (dx / l) * r]);
    der.push([x - (dy / l) * r, y + (dx / l) * r]);
    norm.push([dy / l, -dx / l]);
  });
  return { m: poli([...izq, ...der.reverse()]), spine, norm };
}

// ---------------------------------------------------------------------------------------------
// Criaturitah · a tiny moss-green forest creature: leaf ears, enormous shiny eyes, an acorn-cap hat.
// ---------------------------------------------------------------------------------------------
const MUSGO: Mat = { r: ['#2f6a3a', '#4c9a44', '#82c85a', '#c0ec8c'], ol: '#14341c', ol2: '#2f6a3a', rim: '#a8e870' };
const BELLOTA: Mat = { r: ['#4a2a18', '#7a4a24', '#b07838', '#dca860'], ol: '#2a140c', ol2: '#4a2a18' };
const SAVIA = '#14341c';
const BRILLO = '#f6ffe0';
const ROSA = '#f29090';

function criaturitah(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const by = f ? 1 : 0; // the head sinks a pixel as it breathes
  const bal = f ? 1 : 0; // the ears sway out
  const T = (m: Mascara) => espejo(m);

  // Little leafy tail (visible from behind, a tuft peeking from the front).
  {
    const c = hojaMasa([40, 58], [52, 58], [58, 50], [56, 42 + bal], 5);
    if (E) {
      P.forma(c.m, MUSGO, { rad: 2.8 });
      P.llenar(cur(c.spine.map(([x, y]) => [Math.round(x), Math.round(y)] as [number, number]), 1), '#2f6a3a');
    } else {
      const c2 = hojaMasa([42, 59], [50, 59], [53, 55], [52, 51 + bal], 3);
      P.forma(c2.m, MUSGO, { rad: 2 });
    }
  }
  // Ears: big leaves with a midrib and veins.
  for (const lado of [0, 1]) {
    const X = (x: number) => (lado ? 63 - x : x);
    const h = hojaMasa([22, 31 + by], [8 - bal, 31], [4 - bal, 20], [8 - bal, 6 + by], 6.6);
    const M = (m: Mascara) => (lado ? T(m) : m);
    P.forma(M(h.m), MUSGO, { rad: 4.4, grad: 0.5 });
    const pts = h.spine.map(([x, y]) => [Math.round(X(x)), Math.round(y)] as [number, number]);
    P.llenar(cur(pts.slice(2, 22), 1), '#2f6a3a');
    for (const k of [7, 11, 15]) {
      const [x, y] = h.spine[k];
      const [nx, ny] = h.norm[k];
      P.llenar(cur([[Math.round(X(x)), Math.round(y)], [Math.round(X(x + nx * 3.4 - 1.6)), Math.round(y + ny * 3.4 - 2)]], 1), '#4c9a44');
    }
    if (!E) {
      const [x, y] = h.spine[6];
      P.px(Math.round(X(x)) + (lado ? 1 : -1), Math.round(y), '#c0ec8c');
    }
  }

  // Feet and body.
  P.forma(un(el(24, 60, 5.4, 2.8), el(40, 60, 5.4, 2.8)), MUSGO, { rad: 2.4 });
  for (const x of [20, 23, 26, 37, 40, 43]) P.px(x, 61, '#2f6a3a');
  const cuerpo = el(32, 52 + by * 0.5, 12.6, 9.6);
  P.forma(cuerpo, MUSGO, { rad: 8, grad: 0.4 });
  P.cara(() => {
    P.llenar(el(32, 54, 7, 6), '#c0ec8c');
    P.tono(el(32, 54, 7, 6), MUSGO, 0);
    P.llenar(inter(el(32, 54, 7, 6), rc(20, 51, 24, 2)), '#82c85a');
    for (const x of [27, 32, 37]) P.px(x, 57, '#82c85a');
  });
  // Paws.
  for (const lado of [0, 1]) {
    const X = (x: number) => (lado ? 63 - x : x);
    const pata = el(X(20.6), 52.4 + by, 3.4, 3.6);
    P.forma(pata, MUSGO, { rad: 3 });
    if (!E) for (const dx of [-1, 1]) P.px(X(20) + dx * (lado ? -1 : 1), 54 + by, '#2f6a3a');
  }

  // The head.
  const cabeza = el(32, 33 + by, 19.4, 16.6);
  P.sombra(cabeza, 0, 2, 1);
  P.forma(cabeza, MUSGO, { rad: 9, grad: 0.45 });
  P.tono(el(22, 23 + by, 7, 4), MUSGO, 1);
  P.tono(el(44, 44 + by, 7, 4), MUSGO, -1);
  P.cara(() => {
    // Huge shiny eyes: dark, with a coloured lower iris and two glints; sparkle that changes between frames.
    for (const lado of [0, 1]) {
      const X = (x: number) => (lado ? 63 - x : x);
      const M = (m: Mascara) => (lado ? T(m) : m);
      const ojo = el(23.6, 36.4 + by, 6.4, 7.4);
      P.llenar(M(ojo), SAVIA);
      P.llenar(M(inter(el(24.4, 39.6 + by, 5, 5), ojo)), '#3a9a7a');
      P.llenar(M(inter(el(24.4, 40.6 + by, 3.4, 3), ojo)), '#82c85a');
      P.llenar(M(el(24.2, 37.2 + by, 3.2, 3.4)), SAVIA);
      // The glints.
      P.llenar(M(rc(20, 32 + by, 3, 3)), BRILLO);
      P.px(X(20), 32 + by, SAVIA);
      P.px(X(21), 38 + by, '#3a9a7a');
      P.px(X(27), 41 + by, BRILLO);
      P.px(X(26), 42 + by, BRILLO);
      if (f) {
        P.px(X(25), 35 + by, BRILLO);
        P.px(X(25), 36 + by, BRILLO);
      }
      // Lashes: a lifted outer lid.
      P.px(X(17), 31 + by, SAVIA);
      P.px(X(16), 32 + by, SAVIA);
    }
    // Tiny nose, a small smile, rosy cheeks.
    P.llenar(rc(31, 42 + by, 2, 2), '#14341c');
    P.px(31, 42 + by, '#4c9a44');
    P.llenar(cur([[28, 45 + by], [30, 47 + by], [32, 46 + by]], 1), SAVIA);
    P.llenar(cur([[32, 46 + by], [34, 47 + by], [36, 45 + by]], 1), SAVIA);
    P.llenar(el(14.6, 43 + by, 3, 1.8), ROSA);
    P.llenar(el(49.4, 43 + by, 3, 1.8), ROSA);
    P.px(14, 42 + by, '#f6ffe0');
  });
  P.dorso(() => {
    // Back of the head: moss patches and a little whorl of leaves.
    for (const [x, y, r] of [[22, 38, 3], [42, 36, 2.6], [30, 45, 2.4], [38, 44, 3]] as [number, number, number][]) {
      P.tono(el(x, y + by, r, r * 0.8), MUSGO, -1);
      P.px(x - 1, y - 2 + by, '#82c85a');
    }
    P.tono(el(24, 26 + by, 6, 3.6), MUSGO, 1);
    // Leaf-print chevrons down the back.
    for (const [y, c] of [[39, '#2f6a3a'], [45, '#2f6a3a']] as [number, string][]) {
      P.llenar(cur([[21, y - 4 + by], [32, y + 1 + by], [43, y - 4 + by]], 1), c);
      P.llenar(cur([[22, y - 5 + by], [32, y + by], [42, y - 5 + by]], 1), '#82c85a');
    }
  });

  // Acorn cap: dark brown with a diamond lattice, a lip, a stem and a sprouting leaf.
  const gorro = inter(un(el(32, 22 + by, 16.8, 10.6), rc(15.5, 21 + by, 33, 3)), poli([[0, 0], [64, 0], [64, 25 + by], [32, 28.5 + by], [0, 25 + by]]));
  P.sombra(gorro, 0, 2, 1);
  P.forma(gorro, BELLOTA, { rad: 7, grad: 0.5 });
  P.escamas(inter(gorro, rc(0, 0, 64, 24 + by)), BELLOTA, 4, 3);
  // Lip of the cap.
  P.llenar(inter(gorro, rc(15, 23 + by, 34, 1)), '#4a2a18');
  P.llenar(inter(gorro, rc(15, 22 + by, 22, 1)), '#dca860');
  // Stem and leaf.
  P.forma(rr(30, 7 + by, 4, 6, 1.6), BELLOTA, { rad: 2 });
  const brote = hojaMasa([33, 8 + by], [40, 4 + by], [46, 4 + by - bal], [50, 8 + by - bal], 3.4);
  P.forma(brote.m, MUSGO, { rad: 2.4 });
  P.llenar(cur(brote.spine.slice(2, 21).map(([x, y]) => [Math.round(x), Math.round(y)] as [number, number]), 1), '#2f6a3a');
}

// ---------------------------------------------------------------------------------------------
// Kbronero · a black synth with legs, a wild purple metal mane, studded wristbands, the horns sign,
// LED eyes and a grin with the tongue out.
// ---------------------------------------------------------------------------------------------
const NEGRO: Mat = { r: ['#0e0a14', '#241c34', '#3c3254', '#5e5080'], ol: '#0e0a14', ol2: '#241c34', rim: '#5e5080' };
const MELENA: Mat = { r: ['#3a1458', '#6a2aa0', '#a050d8', '#d890f8'], ol: '#0e0a14', ol2: '#3a1458' };
const PIEL: Mat = { r: ['#b8603c', '#e8a074', '#ffd8b0'], ol: '#0e0a14', ol2: '#b8603c' };
const LED = '#ff2a3c';
const LED2 = '#ff9aa0';
const MARFIL = '#f4f0ff';
const PLATA = '#a89cc8';
const NEGRO0 = '#0e0a14';

function kbronero(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const sw = f ? 2 : -1; // the mane whips from side to side
  const by = f ? 1 : 0; // head-banging bob of the whole body
  const Y = (y: number) => y + by;

  // --- The mane, behind the keyboard: a big mass and long, whipped locks.
  const hebra = (p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], r0: number, r1: number, sesgo = 0) => {
    const pts = bez3(p0, p1, p2, p3, 18);
    P.forma(trazo(pts, r0, r1), MELENA, { rad: Math.max(1.8, r0 * 0.7), sesgo, grad: 0.3 });
    return pts;
  };
  const mass = un(el(32, Y(23), 27, 11), el(32, Y(19), 21, 11));
  P.forma(mass, MELENA, { rad: 8, sesgo: -0.15, grad: 0.4 });
  const todas: [number, number][][] = [];
  // Top locks fan out; every one curls the same way, like a headbanger's whip.
  for (let i = 0; i < 9; i++) {
    const a = ((-76 + i * 19) * Math.PI) / 180;
    const bx = 32 + (i - 4) * 5;
    const L = i === 0 || i === 8 ? 17 : 19 + ((i * 7) % 4) * 1.3;
    const tx = Math.max(1.5, Math.min(62, bx + Math.sin(a) * L + sw * 1.5));
    const ty = Math.max(1, Y(22) - Math.cos(a) * L);
    const dx = Math.sin(a);
    const dyy = -Math.cos(a);
    const curl = 5 * (f ? -1 : 1) * 0 + 3.4;
    const p1: [number, number] = [bx + dx * L * 0.35, Y(22) + dyy * L * 0.45];
    const p2: [number, number] = [tx - dx * L * 0.25 + curl * -dyy * 0.6, ty - dyy * L * 0.3 + curl * dx * 0.6];
    todas.push(hebra([bx, Y(22)], p1, p2, [tx, ty], 6.2, 0.8, i % 2 ? -0.15 : 0.05));
  }
  // Side locks falling past the shoulders (the left one is long).
  todas.push(hebra([12, Y(26)], [0, Y(30)], [-1, Y(42)], [4 + sw, Y(52)], 5, 0.8, -0.25));
  todas.push(hebra([15, Y(24)], [6, Y(32)], [5, Y(42)], [9 + sw, Y(49)], 4.2, 0.8, -0.1));
  todas.push(hebra([52, Y(25)], [63, Y(30)], [64, Y(38)], [60 - sw, Y(44)], 4.4, 0.8, -0.25));
  // Light streaks along the locks.
  todas.forEach((pts, i) => {
    P.llenar(cur(pts.slice(3 + (i % 3), 12 + (i % 3)).map(([x, y]) => [Math.round(x - 1), Math.round(y)] as [number, number]), 1), i % 2 ? '#a050d8' : '#d890f8');
  });

  // --- Legs and boots.
  for (const x of [20, 44]) {
    P.forma(trazo([[x, Y(47)], [x, 55]], 2.6, 2.4), NEGRO, { rad: 2 });
    P.forma(un(el(x - 0.5, 58.6, 6.6, 3.8), rc(x - 6, 60, 12, 2)), NEGRO, { rad: 3.4, sesgo: 0.1 });
    P.llenar(cur([[x - 5, 57], [x - 3, 55.4]], 1), '#5e5080');
    P.llenar(rc(x - 6, 61, 13, 1), NEGRO0);
    P.llenar(rc(x - 2, 52, 5, 1), PLATA);
    P.px(x - 1, 52, MARFIL);
    P.px(x + 1, 56, LED);
    P.px(x + 2, 56, LED);
  }

  // --- The keyboard body.
  const cuerpo = rr(7, Y(18), 50, 32, 4);
  P.sombra(cuerpo, 0, 2, 1);
  P.forma(cuerpo, NEGRO, { rad: 6, grad: 0.4, sesgo: 0.32 });
  // Wooden-black end cheeks.
  for (const x of [7, 52]) P.llenar(rc(x, Y(20), 5, 28), '#241c34');
  for (const x of [8, 53]) P.llenar(rc(x, Y(20), 1, 28), '#3c3254');

  P.cara(() => {
    // Three little knobs between the eyes, with red indicators.
    for (const x of [28, 32, 36]) {
      P.forma(el(x, Y(28), 1.9, 1.9), NEGRO, { rad: 1.6, sesgo: 0.3, rim: false });
      P.px(x, Y(27), LED);
    }
    for (const x of [20, 24, 38, 42]) P.px(x, Y(21), '#5e5080');
    P.llenar(rc(16, Y(20), 32, 1), '#3c3254');
    // Glowing LED eyes with fierce cut lids.
    for (const lado of [0, 1]) {
      const X = (x: number) => (lado ? 63 - x : x);
      const T = (m: Mascara) => (lado ? espejo(m) : m);
      const ojo = rr(14, Y(25), 11, 8, 2);
      P.llenar(T(ojo), LED);
      P.aro(T(ojo), NEGRO0);
      for (const y of [28, 31]) P.llenar(T(rc(15, Y(y), 9, 1)), '#ff2a3c');
      P.llenar(T(poli([[14, Y(25)], [26, Y(25)], [26, Y(27)], [14, Y(29.6)]])), NEGRO0);
      P.llenar(T(rc(16, Y(30), 3, 2)), LED2);
      P.px(X(20), Y(29), LED2);
      // Pixel pupil that wanders.
      P.llenar(T(rc(21 - (f ? 1 : 0), Y(29), 2, 2)), NEGRO0);
    }
    // The grin with the tongue out.
    const boca = inter(el(32, Y(33), 13, 6.4), rc(0, Y(34), 64, 8));
    P.llenar(boca, NEGRO0);
    P.llenar(inter(boca, rc(0, Y(34), 64, 2)), MARFIL);
    for (const x of [23, 26, 29, 35, 38, 41]) P.px(x, Y(35), PLATA);
    P.px(19, Y(33), NEGRO0);
    P.px(45, Y(33), NEGRO0);
    // Tongue: out and down over the keys, wobbling.
    const lengua = un(inter(el(33, Y(37.4), 4.6, 3.4), rc(0, Y(36), 64, 8)), rr(30, Y(37), 7, 5 + (f ? 1 : 0), 2.4));
    P.llenar(lengua, LED);
    P.aro(lengua, NEGRO0);
    P.llenar(rc(33, Y(38), 1, 3 + (f ? 1 : 0)), '#b8603c');
    P.px(31, Y(38), LED2);
  });
  P.dorso(() => {
    // Rear panel: a metal handle, ports and jacks, a vent and a red power LED, a long cable.
    P.forma(rr(14, Y(21), 36, 4, 2), { r: ['#5e5080', PLATA, MARFIL], ol: NEGRO0 }, { rad: 1.6 });
    for (const x of [18, 26, 34]) {
      P.forma(el(x, Y(31), 3.4, 3.4), NEGRO, { rad: 3, sesgo: 0.2 });
      P.llenar(el(x, Y(31), 1.6, 1.6), NEGRO0);
      P.px(x - 1, Y(29), PLATA);
    }
    for (const x of [42, 47]) {
      P.forma(el(x, Y(31), 2.2, 2.2), NEGRO, { rad: 2 });
      P.px(x, Y(31), PLATA);
    }
    for (let y = 36; y < 46; y += 2) P.llenar(rc(16, Y(y), 24, 1), '#241c34');
    P.px(46, Y(41), LED);
    P.px(47, Y(41), LED2);
    P.llenar(rc(44, Y(37), 6, 1), PLATA);
    P.forma(trazo(bez3([47, Y(33)], [58, Y(38)], [64, 51], [54, 61], 18), 1.2, 1.2), NEGRO, { rad: 1.2, paso: 1, rim: false });
  });

  // The key bed (front only; the back is the rear panel).
  P.cara(() => {
    const lecho = rr(10, Y(39), 44, 11, 1);
    P.llenar(lecho, NEGRO0);
    for (let k = 0; k < 11; k++) {
      const x = 11 + k * 4;
      P.llenar(rc(x, Y(40), 3, 9), MARFIL);
      P.llenar(rc(x, Y(48), 3, 1), PLATA);
      P.llenar(rc(x + 2, Y(40), 1, 8), PLATA);
    }
    for (let k = 0; k < 10; k++) {
      if (k === 2 || k === 6) continue;
      const x = 13 + k * 4;
      P.llenar(rc(x, Y(40), 3, 5), NEGRO0);
      P.llenar(rc(x, Y(40), 1, 4), '#3c3254');
    }
  });

  // --- Arms: the left one on the hip, the right one raised making the horns sign.
  const muneca = (cx: number, cy: number, g: number) => {
    cx = Math.round(cx);
    cy = Math.round(cy);
    P.forma(rr(cx - 4, cy - 2, 8, g, 1.4), NEGRO, { rad: 2, sesgo: 0.5, rim: false });
    for (let i = 0; i < 3; i++) {
      P.px(cx - 3 + i * 3, cy - 1, MARFIL);
      P.px(cx - 3 + i * 3, cy, PLATA);
    }
  };
  const brazoI = trazo(bez3([9, Y(33)], [2, Y(34)], [1.4, Y(42)], [6, Y(46.4)], 12), 2.8, 2.5);
  P.forma(brazoI, PIEL, { rad: 2.4 });
  P.forma(el(7, Y(49), 3.4, 3), PIEL, { rad: 2.4 });
  P.llenar(rc(6, Y(49), 1, 2), '#b8603c');
  muneca(5.6, Y(45.2), 4);
  // Right arm up.
  const brazoD = trazo(bez3([55, Y(33)], [63, Y(34)], [64, Y(25)], [58, Y(20)], 12), 3.4, 2.8);
  P.forma(brazoD, PIEL, { rad: 2.8 });
  // Horns hand: index and pinky up, the thumb folded over the other two.
  P.forma(rr(53, Y(2), 3, 9, 1.4), PIEL, { rad: 1.4 });
  P.forma(rr(60, Y(3), 3, 8, 1.4), PIEL, { rad: 1.4 });
  P.forma(rr(53, Y(8), 10, 9, 3), PIEL, { rad: 3 });
  P.forma(trazo([[55, Y(15)], [58.4, Y(10.6)]], 1.6, 1.4), PIEL, { rad: 1.4, sesgo: 0.3 });
  P.llenar(rc(56, Y(9), 2, 1), '#b8603c');
  P.llenar(rc(59, Y(9), 1, 1), '#b8603c');
  muneca(58.4, Y(19.6), 5);

  if (E) {
    // From behind the mane hangs over the back panel.
    for (let i = 0; i < 8; i++) {
      const x = 10 + i * 6;
      const lado = i < 4 ? -1 : 1; // parted down the middle
      const largo = 23 + ((i * 5) % 4) * 1.8;
      const pts = bez3([x, Y(12)], [x + lado * 1, Y(17)], [x + lado * 2.4, Y(21)], [x + lado * 3 + sw * 0.5, Y(largo)], 14);
      P.forma(trazo(pts, 4.4, 0.8), MELENA, { rad: 2.8, sesgo: i % 2 ? -0.2 : 0.1, grad: 0.3 });
      P.llenar(cur(pts.slice(2, 9).map(([px, py]) => [Math.round(px - 1), Math.round(py)] as [number, number]), 1), i % 2 ? '#a050d8' : '#d890f8');
    }
  }
  // Hair falls over the shoulders in front a little.
  if (!E) {
    P.forma(trazo([[10, Y(20)], [5, Y(26)], [6, Y(34)]], 2.6, 0.8), MELENA, { rad: 1.8 });
    P.forma(trazo([[54, Y(20)], [57, Y(24)], [54, Y(30)]], 2.4, 0.8), MELENA, { rad: 1.8 });
  }
}

export const LOTE_C: Dibujo2[] = [
  { id: 'chupitochu', nombre: 'Chupitochu', dibujar: chupitochu },
  { id: 'caravaner', nombre: 'Caravaner', dibujar: caravaner },
  { id: 'camioner', nombre: 'Camioner', dibujar: camioner },
  { id: 'criaturitah', nombre: 'Criaturitah', dibujar: criaturitah },
  { id: 'kbronero', nombre: 'Kbronero', dibujar: kbronero },
];
void [cur, mover, men, par, un];
