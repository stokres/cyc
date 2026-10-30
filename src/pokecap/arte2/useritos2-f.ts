// PokéUsera · Edición Jarra (arte v2): batch f of the 64×64 useritos (same conventions as useritos2.ts).
// Mariachi and Pulpiño.
import type { Dibujo2 } from './useritos2';
import { Pintor, bez3, cur, el, espejo, inter, poli, rc, trazo, un, type Mat } from './pintor';

// ---------------------------------------------------------------------------------------------
// Mariachi · a chubby big-headed mariachi: huge charro hat with gold embroidery, black suit with silver
// buttons down the sides, a big red bow at the neck, a handlebar moustache and a brass trumpet. Frame 1:
// he doffs the hat with one hand and the trumpet tilts up with a note. From behind: the hat from behind,
// black hair and ears, the embroidered gold diamond on the jacket back, the bow tails and the trumpet.
// ---------------------------------------------------------------------------------------------
const TINTA_M = '#0c0810';
const TRAJE: Mat = { r: ['#1a1626', '#2e2a44', '#4a4668'], ol: TINTA_M, ol2: '#1a1626' };
const PIEL: Mat = { r: ['#b4583a', '#e08a58', '#ffbc86'], ol: TINTA_M, ol2: '#b4583a' };
const ROJO: Mat = { r: ['#8c0c1c', '#d4202e', '#ff5448'], ol: TINTA_M, ol2: '#8c0c1c' };
const ORO: Mat = { r: ['#8c5a0c', '#e0a018', '#ffe27a'], ol: TINTA_M, ol2: '#8c5a0c' };
const PLATA = '#aab4d0';
const PLATA_O = '#6e7898';
const BLANCO = '#ffffff';

function mariachi(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: ReturnType<typeof rc>) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const dy = f ? -1 : 0; // the whole body bobs a pixel in frame 1
  const dh = f ? -3 : 0; // the hat is lifted
  const dt = f ? -3 : 0; // the trumpet tilts up

  const boton = (x: number, y: number): void => {
    P.px(x, y, BLANCO);
    P.px(x + 1, y, PLATA);
    P.px(x, y + 1, PLATA);
    P.px(x + 1, y + 1, PLATA_O);
  };

  // Boots.
  for (const x of [22.5, 41.5]) {
    P.forma(el(x, 60.5, 7, 3.4), TRAJE, { rad: 3 });
    if (!E) P.px(Math.round(x) + (x < 32 ? -4 : 3), 61, PLATA);
  }

  // Torso.
  const torso = el(32, 50 + dy, 18.5, 11.5);
  P.forma(torso, TRAJE, { rad: 8, grad: 0.4 });
  // Silver buttons down both sides.
  for (const y of [47, 51, 55]) {
    boton(21, y + dy);
    boton(41, y + dy);
  }
  // Gold lapel stitching (front) or the embroidered diamond (back).
  P.cara(() => {
    P.llenar(cur([[27, 46 + dy], [25, 51 + dy], [26, 58 + dy]], 1), ORO.r[1]);
    P.llenar(cur([[37, 46 + dy], [39, 51 + dy], [38, 58 + dy]], 1), ORO.r[1]);
    P.px(26, 52 + dy, ORO.r[2]);
    P.px(38, 52 + dy, ORO.r[2]);
    // Belt buckle.
    P.forma(rc(29, 57 + dy, 6, 3), ORO, { rad: 1.5, borde: false });
    P.px(30, 58 + dy, ORO.r[2]);
  });
  P.dorso(() => {
    const rombo = poli([[32, 41 + dy], [42, 51 + dy], [32, 61 + dy], [22, 51 + dy]]);
    P.llenar(inter(rombo, torso), TRAJE.r[1]);
    P.aro(poli([[32, 43 + dy], [40, 51 + dy], [32, 59 + dy], [24, 51 + dy]]), ORO.r[1]);
    P.llenar(inter(el(32, 51 + dy, 3.4, 3.4), torso), ORO.r[1]);
    P.px(31, 50 + dy, ORO.r[2]);
    P.px(32, 50 + dy, ORO.r[2]);
    P.px(32, 47 + dy, ORO.r[2]);
    P.px(32, 55 + dy, ORO.r[0]);
    P.px(28, 51 + dy, ORO.r[2]);
    P.px(36, 51 + dy, ORO.r[0]);
    // Centre seam.
    P.llenar(cur([[32, 59 + dy], [32, 61 + dy]], 1), TRAJE.r[0]);
  });

  // The trumpet in his right hand (the viewer's right from the front): tube, three valves and a flared bell.
  const trompeta = (): void => {
    const by = 45.5 + dt * 1.3;
    const tubo = trazo([[41, 53 + dy], [52, 46 + dt]], 2.1, 1.9);
    const campana = un(poli([[51, 43.5 + dt], [51, 48.5 + dt], [59, by + 7.4], [59, by - 7.4]]), el(59, by, 2.8, 7.6));
    P.sombra(T(un(tubo, campana)), 0, 1, 1);
    P.forma(T(tubo), ORO, { rad: 1.8 });
    P.forma(T(campana), ORO, { rad: 3, grad: 0.3 });
    P.llenar(T(el(60, by, 1.9, 5.6)), TINTA_M);
    P.px(TX(59), Math.round(by) - 6, ORO.r[2]);
    P.px(TX(58), Math.round(by) - 7, ORO.r[2]);
    for (const [vx, vy] of [[44, 51.5], [46.5, 50], [49, 48.5]] as [number, number][]) {
      const y = Math.round(vy + dt * (vx - 41) / 11) + dy * 0;
      P.px(TX(vx), y - 3, BLANCO);
      P.llenar(T(rc(vx, y - 2, 1, 2)), PLATA);
    }
    // Mouthpiece loop under the tube.
    P.llenar(T(cur([[42, 56 + dy], [48, 56 + dy + dt * 0.4], [53, 51 + dt]], 1)), ORO.r[0]);
    if (f) {
      // A little gold note floats up from the bell.
      const nx = 57,
        ny = 30;
      P.llenar(T(rc(nx, ny, 3, 2)), ORO.r[2]);
      P.llenar(T(rc(nx + 2, ny - 5, 1, 6)), ORO.r[2]);
      P.llenar(T(cur([[nx + 3, ny - 5], [nx + 5, ny - 3]], 1)), ORO.r[2]);
      P.px(TX(nx), ny + 1, ORO.r[1]);
      P.px(TX(nx + 1), ny + 1, ORO.r[1]);
    }
  };
  trompeta();

  // Right arm (holds the trumpet) and hand.
  const brazoD = trazo([[48, 45 + dy], [44, 53 + dy]], 4.4, 3.8);
  P.forma(T(brazoD), TRAJE, { rad: 3.4 });
  P.llenar(T(rc(41, 52 + dy, 4, 1)), PLATA);
  P.forma(T(el(43.5, 54.5 + dy, 3.2, 2.8)), PIEL, { rad: 2.4, borde: 'suave' });
  // Left arm: down in frame 0, up to the brim in frame 1.
  const manoI = f ? [8.5, 24.5] : [13, 58];
  const brazoI = f ? trazo([[15, 46 + dy], [9, 27]], 4.4, 3.6) : trazo([[15, 46 + dy], [13, 56]], 4.4, 3.8);
  P.forma(T(brazoI), TRAJE, { rad: 3.4 });

  // Bow tails when seen from behind (the knot is hidden by the head).
  P.dorso(() => {
    P.forma(poli([[31, 47 + dy], [20, 43 + dy], [18, 49 + dy], [21, 54 + dy], [31, 50 + dy]]), ROJO, { rad: 3 });
    P.forma(poli([[33, 47 + dy], [44, 43 + dy], [46, 49 + dy], [43, 54 + dy], [33, 50 + dy]]), ROJO, { rad: 3 });
  });

  // Head: ears, then the face (or the black hair from behind).
  for (const x of [16.2, 47.8]) P.forma(el(x, 34 + dy, 3.2, 3.8), PIEL, { rad: 2.4, borde: 'suave' });
  const cabeza = el(32, 32 + dy, 15.5, 14);
  P.sombra(cabeza, 0, 1, 1);
  if (!E) {
    P.forma(cabeza, PIEL, { rad: 9, grad: 0.35 });
    // The hair, seen when the hat is lifted.
    const pelo = inter(cabeza, el(32, 13 + dy, 18, 10.5));
    P.llenar(pelo, TRAJE.r[1]);
    P.llenar(inter(pelo, el(28, 12 + dy, 9, 5)), TRAJE.r[2]);
    // Eyes: big, shiny, looking at you.
    for (const cx of [24.8, 39.2]) {
      const ojo = el(cx, 33 + dy, 4.5, 5.1);
      P.aro(ojo, TINTA_M);
      P.llenar(ojo, BLANCO);
      P.llenar(inter(el(cx + (cx < 32 ? 0.5 : -0.5), 33.8 + dy, 2.9, 3.5), ojo), TINTA_M);
      const hx = Math.round(cx + (cx < 32 ? 0.5 : -0.5));
      P.px(hx - 1, 32 + dy, BLANCO);
      P.px(hx - 1, 33 + dy, BLANCO);
      P.px(hx + 1, 36 + dy, PIEL.r[2]);
    }
    // Brows, raised and merry.
    P.llenar(cur([[20, 28 + dy], [24, 26.5 + dy], [29, 27.5 + dy]], 1), TINTA_M);
    P.llenar(cur([[35, 27.5 + dy], [40, 26.5 + dy], [44, 28 + dy]], 1), TINTA_M);
    // Nose, mouth (a big open grin) and the moustache over them.
    P.forma(el(32, 37.4 + dy, 3.4, 2.9), PIEL, { rad: 2.5, borde: 'suave', sesgo: 0.1 });
    const boca = inter(el(32, 44.3 + dy, 5.8, 3.8), cabeza);
    P.llenar(boca, TINTA_M);
    P.llenar(inter(rc(26, 42 + dy, 12, 2), boca), BLANCO);
    P.llenar(inter(el(33, 47 + dy, 3.4, 2.2), boca), ROJO.r[1]);
    const bigote = un(
      trazo(bez3([32.5, 39.2 + dy], [28, 41 + dy], [23, 40.4 + dy], [20, 36.2 + dy], 14), 1.9, 0.7),
      trazo(bez3([31.5, 39.2 + dy], [36, 41 + dy], [41, 40.4 + dy], [44, 36.2 + dy], 14), 1.9, 0.7),
    );
    P.forma(bigote, TRAJE, { rad: 2.6, grad: 0.3, sesgo: 0.35 });
    P.llenar(cur([[28, 39.6 + dy], [23, 39.8 + dy]], 1), TRAJE.r[2]);
    P.llenar(cur([[36, 39.6 + dy], [41, 39.8 + dy]], 1), TRAJE.r[2]);
    // The red bow.
    const lazoI = poli([[29, 47.5 + dy], [19, 43.5 + dy], [16.5, 48.5 + dy], [19, 53.5 + dy], [29, 50 + dy]]);
    P.sombra(lazoI, 0, 1, 1);
    P.forma(lazoI, ROJO, { rad: 3.4 });
    const lazoD = poli([[35, 47.5 + dy], [45, 43.5 + dy], [47.5, 48.5 + dy], [45, 53.5 + dy], [35, 50 + dy]]);
    P.sombra(lazoD, 0, 1, 1);
    P.forma(lazoD, ROJO, { rad: 3.4 });
    P.llenar(cur([[28, 48.5 + dy], [20, 47 + dy]], 1), ROJO.r[0]);
    P.llenar(cur([[36, 48.5 + dy], [44, 47 + dy]], 1), ROJO.r[0]);
    P.forma(el(32, 48.8 + dy, 3.4, 3.4), ROJO, { rad: 2.6 });
    P.px(31, 47 + dy, ROJO.r[2]);
  } else {
    P.forma(cabeza, TRAJE, { rad: 9, grad: 0.35 });
    P.llenar(cur([[21, 40 + dy], [26, 44 + dy]], 1), TRAJE.r[0]);
    P.llenar(cur([[43, 40 + dy], [38, 44 + dy]], 1), TRAJE.r[0]);
    P.llenar(inter(el(25, 30 + dy, 4, 6), cabeza), TRAJE.r[2]);
    P.llenar(cur([[24, 38 + dy], [32, 41 + dy], [40, 38 + dy]], 1), TRAJE.r[0]);
    P.llenar(cur([[27, 36 + dy], [32, 38 + dy], [37, 36 + dy]], 1), TRAJE.r[2]);
    P.px(23, 27 + dy, TRAJE.r[2]);
    P.px(22, 29 + dy, TRAJE.r[2]);
    // The red band of the bow behind the neck.
    P.llenar(inter(rc(22, 45 + dy, 20, 2), un(torso, cabeza)), ROJO.r[1]);
  }

  // The huge charro hat.
  const brimY = 17 + dh + dy;
  const ala = un(el(32, brimY, 30, 6), el(6.5, brimY - 3.5, 5.5, 4), el(57.5, brimY - 3.5, 5.5, 4));
  const copa = un(poli([[24, brimY + 1], [40, brimY + 1], [43, brimY - 10], [21, brimY - 10]]), el(32, brimY - 10, 11, 3.8));
  P.sombra(un(ala, copa), 0, 2, 1);
  P.forma(copa, TRAJE, { rad: 7, grad: 0.4, modo: 'cil', eje: 32, semi: 11 });
  P.forma(ala, TRAJE, { rad: 5, grad: 0.4 });
  // The crown rises out of the brim: redraw its front over the brim's top edge.
  const frente = inter(copa, rc(0, 0, 64, brimY - 1));
  P.llenar(frente, TRAJE.r[1]);
  P.llenar(inter(frente, rc(0, 0, 29, 64)), TRAJE.r[2]);
  P.llenar(inter(frente, rc(38, 0, 26, 64)), TRAJE.r[0]);
  P.aro(copa, TINTA_M);
  // Gold trim along the brim, in studs.
  const arco: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const a = 0.08 * Math.PI + (i / 24) * 0.84 * Math.PI;
    arco.push([32 + 27 * Math.cos(a), brimY + 3.6 * Math.sin(a)]);
  }
  P.llenar(cur(arco, 1), ORO.r[1]);
  arco.forEach(([x, y], i) => {
    if (i % 3 === 0) P.px(Math.round(x), Math.round(y), ORO.r[2]);
  });
  // Crown band with gold studs and flowers.
  P.llenar(inter(rc(0, brimY - 5, 64, 4), copa), ORO.r[1]);
  P.llenar(inter(rc(0, brimY - 5, 64, 1), copa), ORO.r[2]);
  P.llenar(inter(rc(0, brimY - 2, 64, 1), copa), ORO.r[0]);
  for (let x = 25; x <= 39; x += 3) P.px(x, brimY - 4, ORO.r[0]);
  P.cara(() => {
    for (const x of [32, 26, 38]) {
      const y = x === 32 ? brimY - 8 : brimY - 7;
      P.px(x, y - 1, ORO.r[2]);
      P.px(x - 1, y, ORO.r[2]);
      P.px(x + 1, y, ORO.r[2]);
      P.px(x, y + 1, ORO.r[2]);
      P.px(x, y, ORO.r[1]);
    }
  });
  P.dorso(() => {
    for (const x of [27, 32, 37]) {
      P.px(x, brimY - 9, ORO.r[2]);
      P.px(x - 1, brimY - 8, ORO.r[1]);
      P.px(x + 1, brimY - 8, ORO.r[1]);
    }
  });
  // Gold curls on the raised ends of the brim.
  P.px(6, brimY - 4, ORO.r[2]);
  P.px(7, brimY - 3, ORO.r[1]);
  P.px(57, brimY - 4, ORO.r[2]);
  P.px(56, brimY - 3, ORO.r[1]);
  // The lifting hand (frame 1) takes the brim from above.
  if (f) {
    P.forma(T(el(manoI[0], manoI[1], 3.3, 3.1)), PIEL, { rad: 2.6, borde: 'suave' });
    P.px(TX(manoI[0] - 1), manoI[1] - 1, PIEL.r[2]);
  } else {
    P.forma(T(el(manoI[0], manoI[1], 3.2, 2.9)), PIEL, { rad: 2.4, borde: 'suave' });
    P.llenar(T(rc(11, 55, 5, 1)), PLATA);
  }
}

// ---------------------------------------------------------------------------------------------
// Pulpiño · a Galician octopus in a very bad mood: reddish purple, angry brows, a clenched grimace,
// paprika flecks and an oily shine (like pulpo á feira), suckered tentacles (one raised in a fist) and a
// little beret, sitting on a round wooden plate. Frame 1: the tentacles squirm and the fist shakes.
// From behind: the oily mantle covered in paprika, the beret's stalk and the plate.
// ---------------------------------------------------------------------------------------------
const TINTA_P = '#2a0a1e';
const PULPO: Mat = { r: ['#5a1438', '#8c2850', '#b84068', '#e47898'], ol: TINTA_P, ol2: '#5a1438' };
const CREMA0 = '#e8a898';
const CREMA1 = '#fff0e4';
const PIM0 = '#d82a12';
const PIM1 = '#ff7a24';
const MADERA: Mat = { r: ['#5e3010', '#9a5a24', '#d89a52'], ol: TINTA_P, ol2: '#5e3010' };
const BOINA: Mat = { r: ['#1e2c4c', '#34508a', '#5878b8'], ol: TINTA_P, ol2: '#1e2c4c' };

function pulpino(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: ReturnType<typeof rc>) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const dy = f ? -1 : 0; // the head puffs up with rage
  const idP = P.mat(PULPO);

  // The plate.
  const plato = el(32, 57, 29.5, 5.6);
  P.forma(plato, MADERA, { rad: 4, grad: 0.4 });
  P.tono(el(32, 57.4, 24, 3.6), MADERA, -1);
  P.llenar(cur([[11, 57], [17, 58]], 1), MADERA.r[0]);
  P.llenar(cur([[44, 58], [52, 57]], 1), MADERA.r[0]);
  P.llenar(cur([[24, 60], [32, 60.5]], 1), MADERA.r[0]);
  P.llenar(cur([[9, 55], [13, 53.3], [20, 52.2], [28, 51.8]], 1), MADERA.r[2]);
  P.llenar(cur([[50, 53], [54, 54.5]], 1), MADERA.r[2]);

  // Suckers along a tentacle: little creamy discs on the underside.
  const ventosas = (pts: [number, number][], ts: number[], lado: number, desde = 0): void => {
    for (const t of ts) {
      if (t < desde) continue;
      const k = Math.min(pts.length - 2, Math.round(t * (pts.length - 1)));
      const [x, y] = pts[k];
      const [x2, y2] = pts[k + 1];
      const l = Math.hypot(x2 - x, y2 - y) || 1;
      const nx = -(y2 - y) / l;
      const ny = (x2 - x) / l;
      const r = 1.9 * (1 - t) + 1.6;
      const px = Math.floor(TX(x + nx * lado * r * 0.5) - 0.5);
      const py = Math.floor(y + ny * lado * r * 0.5 - 0.5);
      const ok = (a: number, b: number) => P.matEn(a, b) === idP;
      if (![ok(px, py), ok(px + 1, py), ok(px, py + 1), ok(px + 1, py + 1)].every(Boolean)) continue;
      P.px(px, py, CREMA1);
      P.px(px + 1, py, CREMA1);
      P.px(px, py + 1, CREMA0);
      P.px(px + 1, py + 1, CREMA0);
      if (ok(px, py + 2)) P.px(px, py + 2, PULPO.r[0]);
    }
  };

  // Tentacle paths (front coordinates).
  const w = f ? 1 : 0;
  const ta = bez3([18, 35], [5, 37], [2 + w, 52 - w * 2], [13 + w * 2, 57 - w * 2], 28);
  const tb = bez3([26, 39], [23, 47], [13 - w, 52], [17 - w * 2, 60 - w], 28);
  const tc = bez3([38, 39], [41, 47], [51 + w, 51], [46 + w * 2, 59.5 - w], 28);
  const fy = f ? -4 : 0;
  const td = bez3([46, 35], [59, 38], [61, 27 + fy], [54, 24 + fy], 28);
  const manoD: [number, number] = [53.5, 21.5 + fy];

  const dibuja = (pts: [number, number][], r0: number, r1: number) => {
    const m = T(trazo(pts, r0, r1));
    P.sombra(m, 0, 1, 1);
    P.forma(m, PULPO, { rad: 3.4, grad: 0.35 });
  };
  dibuja(ta, 5.4, 1.7);
  dibuja(tb, 5.2, 1.7);
  dibuja(tc, 5.2, 1.7);
  // The fist: a thick tentacle ending in a closed, curled ball.
  dibuja(td, 5.6, 3.8);
  const puno = un(el(manoD[0], manoD[1], 5.6, 5), el(manoD[0] + 1.5, manoD[1] + 3.2, 3.6, 2.6));
  P.forma(T(puno), PULPO, { rad: 4, grad: 0.35 });
  // The curled tip winds over the fist: a darker coil with suckers across it.
  P.llenarSobre(T(cur([[manoD[0] - 4, manoD[1] + 1], [manoD[0] - 1, manoD[1] + 3.5], [manoD[0] + 3.4, manoD[1] + 3.2], [manoD[0] + 5, manoD[1] + 0.5]], 1)), PULPO.r[0], PULPO);
  for (const [dx, dyv] of [[-3, 0.2], [0.5, 2], [4, 0.6]] as [number, number][]) {
    const px = Math.round(TX(manoD[0] + dx));
    const py = Math.round(manoD[1] + dyv);
    if (P.matEn(px, py) === idP) {
      P.px(px, py, CREMA1);
      P.px(px, py + 1, CREMA0);
    }
  }
  // Knuckle creases.
  P.llenarSobre(T(cur([[manoD[0] - 2, manoD[1] - 4], [manoD[0] - 2, manoD[1] - 1]], 1)), PULPO.r[0], PULPO);
  P.llenarSobre(T(cur([[manoD[0] + 1, manoD[1] - 4.5], [manoD[0] + 1.5, manoD[1] - 1.5]], 1)), PULPO.r[0], PULPO);

  // The head: a big bulbous mantle.
  const cabeza = un(el(32, 24 + dy, 19, 16.5), el(32, 33 + dy, 17, 10.5));
  P.sombra(cabeza, 0, 2, 1);
  P.forma(cabeza, PULPO, { rad: 9, grad: 0.35 });
  P.tono(el(44, 36 + dy, 7, 5), PULPO, -1);

  // Suckers (from the front: the whole underside; from behind: just the curled tips).
  const solo = E ? 0.78 : 0;
  ventosas(ta, [0.3, 0.45, 0.6, 0.74, 0.88], -1, solo);
  ventosas(tb, [0.4, 0.55, 0.7, 0.85], 1, solo);
  ventosas(tc, [0.4, 0.55, 0.7, 0.85], -1, solo);
  ventosas(td, [0.3, 0.45, 0.6], -1, solo);

  // Paprika flecks over head and tentacles, and the oily shine.
  for (let y = 4; y < 62; y++) {
    for (let x = 0; x < 64; x++) {
      if (P.matEn(x, y) !== idP) continue;
      const h = (x * 73 + y * 151 + ((x * y) >> 2) * 31) % 37;
      if (h === 0 || h === 19) P.px(x, y, PIM0);
      else if (h === 9) P.px(x, y, PIM1);
    }
  }
  const brillo = (pts: [number, number][]) => {
    pts.forEach(([x, y], i) => {
      if (i % 3 !== 2 && P.matEn(TX(x), y) === idP) P.px(TX(x), y, CREMA1);
    });
  };
  brillo([[16, 27 + dy], [16, 24 + dy], [17, 21 + dy], [18, 18 + dy], [20, 16 + dy], [22, 14 + dy]]);
  P.px(TX(20), 12 + dy, CREMA1);
  brillo([[23, 41 + dy], [26, 42 + dy], [29, 42 + dy]]);
  P.px(TX(12), 47, CREMA1);
  P.px(TX(23), 52, CREMA1);
  P.px(TX(41), 51, CREMA1);
  if (f) P.px(TX(58), 24, CREMA1);
  else P.px(TX(58), 28, CREMA1);

  P.cara(() => {
    // Eyes: big, with a heavy lid slanting down towards the nose.
    for (const lado of [0, 1]) {
      const X = (x: number) => (lado ? 63 - x : x);
      const ojo = T(el(X(24.5), 29 + dy, 5.3, 5.3));
      P.aro(ojo, TINTA_P);
      P.llenar(ojo, CREMA1);
      P.llenar(inter(T(el(X(26.2), 31.2 + dy, 2.7, 3.2)), ojo), TINTA_P);
      P.px(X(25), 30 + dy, CREMA1);
      P.px(X(25), 31 + dy, CREMA1);
      const tapa = T(poli([[X(16), 17 + dy], [X(32), 17 + dy], [X(32), 30.6 + dy], [X(16), 24.2 + dy]]));
      P.llenar(inter(tapa, ojo), PULPO.r[1]);
      P.llenar(T(cur([[X(15.5), 23 + dy], [X(31), 29.5 + dy]], 2)), TINTA_P);
      // Frown creases above the brow.
      P.px(X(30), 25 + dy, PULPO.r[0]);
      P.px(X(29), 24 + dy, PULPO.r[0]);
    }
    // The grimace: clenched teeth.
    const sup = bez3([22, 40 + dy], [27, 33 + dy], [37, 33 + dy], [42, 40 + dy], 20);
    const inf = sup.map(([x, y]) => [x * 0.93 + 2.2, y + 3.4] as [number, number]).reverse();
    const boca = poli([...sup, ...inf]);
    P.llenar(boca, CREMA1);
    boca.each((x, y) => {
      if (x % 3 === 1) P.px(x, y, PULPO.r[0]);
    });
    P.llenar(cur(sup, 1), TINTA_P);
    P.llenar(cur(inf, 1), TINTA_P);
    P.llenar(cur([[sup[0][0], sup[0][1]], [inf[inf.length - 1][0], inf[inf.length - 1][1]]], 1), TINTA_P);
    P.llenar(cur([[sup[20][0], sup[20][1]], [inf[0][0], inf[0][1]]], 1), TINTA_P);
    // Anger mark.
    const ax = 44;
    const ay = 16 + dy;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
      P.px(ax + sx * 2, ay + sy * 2, PIM0);
      P.px(ax + sx * 3, ay + sy * 2, PIM0);
      P.px(ax + sx * 2, ay + sy * 3, PIM0);
    }
  });
  P.dorso(() => {
    // A second oily gleam and a seam of paprika across the mantle.
    P.px(40, 20 + dy, CREMA1);
    P.px(41, 21 + dy, CREMA1);
    P.px(42, 23 + dy, CREMA1);
    P.llenarSobre(cur([[22, 33 + dy], [28, 38 + dy], [36, 38 + dy], [42, 33 + dy]], 1), PULPO.r[1], PULPO);
  });

  // Shake lines around the fist in frame 1.
  if (f) {
    const [hx, hy] = manoD;
    P.llenar(T(cur([[hx + 7, hy - 4], [hx + 9, hy - 6]], 1)), PIM1);
    P.llenar(T(cur([[hx + 8, hy], [hx + 11, hy]], 1)), PIM1);
    P.llenar(T(cur([[hx - 8, hy - 5], [hx - 10, hy - 7]], 1)), PIM1);
  }

  // The little beret, tilted.
  const boina = un(el(29, 9.5 + dy, 12.5, 5), el(23, 11 + dy, 6, 3.4));
  P.sombra(boina, 0, 2, 1);
  P.forma(boina, BOINA, { rad: 4.2, grad: 0.4 });
  P.tono(el(30, 13 + dy, 10, 1.6), BOINA, -1);
  P.forma(rc(33, 3 + dy, 2, 2), BOINA, { rad: 1, borde: true });
  P.px(33, 3 + dy, BOINA.r[2]);
}

export const LOTE_F: Dibujo2[] = [
  { id: 'mariachi', nombre: 'Mariachi', dibujar: mariachi },
  { id: 'pulpino', nombre: 'Pulpiño', dibujar: pulpino },
];
