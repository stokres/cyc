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
  const cuerpo = un(poli([[15, cima], [49, cima], [44, 58], [20, 58]]), rr(20, 53, 24, 7, 3), el(32, cima, 17.4, 3.8));
  P.forma(cuerpo, VIDRIO_C, { modo: 'cil', eje: 32, semi: 17, rad: 3.2 });
  // The liquor inside (3 px of glass wall at the sides, a thick glass bottom).
  const licor = un(poli([[18.4, cima + 3.4], [45.6, cima + 3.4], [41.6, 52], [22.4, 52]]), el(32, 52, 9.6, 2.4));
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
  P.llenar(rc(23, 56, 9, 1), '#f2ffff');
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
      P.llenar(T(el(27.2, 40.4, 1.8, 2.3)), TINTA_C);
      P.px(X(26), 39, '#ffffff');
      // The brow: thick, slanted down towards the middle, with a lit edge.
      P.llenar(T(trazo([[19.6, 33.2], [30.6, 38.4]], 1.7, 1.5)), TINTA_C);
      P.llenar(T(trazo([[20.6, 32], [26, 34.4]], 0.7, 0.7)), '#7c1418');
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
    const eti = rr(22, cima + 9, 20, 16, 3);
    P.forma(eti, { r: ['#d9b98a', '#f4e2b6', '#fff6dc'], ol: '#7c1418', ol2: '#b82a1c' }, { rad: 3 });
    P.forma(llamaMasa(32, cima + 22.5, 4.6, 33, cima + 12.5, 2.5), LLAMA, { rad: 2 });
    P.llenar(llamaMasa(32, cima + 22, 2.2, 32.6, cima + 17, 1), '#ffb42c');
    P.px(32, cima + 21, BRASA);
    for (const x of [24, 26, 28, 36, 38, 40]) P.px(x, cima + 23, '#b82a1c');
    P.llenar(rc(24, cima + 11, 4, 1), '#fff6dc');
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

export const LOTE_C: Dibujo2[] = [{ id: 'chupitochu', nombre: 'Chupitochu', dibujar: chupitochu }];
void [cur, mover, men, par, un];
