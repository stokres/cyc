// PokéUsera · Edición Jarra (arte v2): batch a of the 64×64 useritos (same conventions as useritos2.ts).
// Goudazard, Cierzón, Turroncho, Tocinón and Roscochoco.
import type { Dibujo2 } from './useritos2';
import { Pintor, Mascara, bez3, cur, el, espejo, inter, men, mover, par, poli, rc, rr, trazo, un, type Mat } from './pintor';

/** Deterministic hash in [0, 1) for texture speckles. */
function azar(x: number, y: number, s = 0): number {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Re-tones scattered pixels of material `mat` inside mask `m` (crumbs, pores, grain) one ramp step up or down. */
function motas(P: Pintor, m: Mascara, mat: Mat, prob: number, delta: number, semilla = 0, minPaso = 1): void {
  const id = P.mat(mat);
  m.each((x, y) => {
    if (P.matEn(x, y) !== id) return;
    const i = y * P.w + x;
    if (P.paso[i] < minPaso) return;
    if (azar(x, y, semilla) >= prob) return;
    const p = Math.max(0, Math.min(mat.r.length - 1, P.paso[i] + delta));
    P.g[i] = P.c(mat.r[p]);
  });
}

// ---------------------------------------------------------------------------------------------
// Goudazard · fried breaded gouda stick, a bite out of the top and melted cheese oozing out.
// ---------------------------------------------------------------------------------------------
const REBOZO: Mat = { r: ['#6e300a', '#a8541a', '#d98a28', '#f4bc48', '#ffe38a'], ol: '#3a1606', ol2: '#a8541a', rim: '#d98a28' };
const QUESO: Mat = { r: ['#d9890f', '#ffc424', '#ffe262', '#fff6dc'], ol: '#6e300a', ol2: '#a8541a' };
const CREMA = '#fff6dc';
const TOSTA = '#3a1606';

function goudazard(P: Pintor): void {
  const f = P.f;
  const sq = f; // frame 1: squashed a pixel (the stick bounces)
  // Little feet.
  P.forma(un(rr(21, 55, 8, 5, 2), rr(35, 55, 8, 5, 2)), REBOZO, { rad: 2.4 });
  // Arms: akimbo, hands on the hips. They sit behind the body.
  const brazo = un(trazo([[20, 31 + sq], [13.5, 36 + sq], [19.5, 43 + sq]], 2.3, 2.1), el(13.5, 36 + sq, 2.7, 2.7));
  P.forma(par(brazo), REBOZO, { rad: 2.4 });
  // Body: a chunky breaded stick with crunchy bumps on its edge and a big bite out of the top right.
  const g1 = f ? 2 : 0;
  const bruto = un(rr(18, 10 + sq, 28, 46 - sq, 6), rc(17, 24, 1, 4), rc(46, 33, 1, 4), rc(17, 43, 1, 3), rc(46, 25, 1, 3), rc(19, 9 + sq, 5, 1));
  const mordisco = un(el(40.5, 10 + sq, 8, 8.6), el(32.2, 8.5 + sq, 3.6, 4.2));
  const cuerpo = men(bruto, mordisco);
  P.sombra(cuerpo, 0, 1, 1);
  P.forma(cuerpo, REBOZO, { modo: 'cil', eje: 32, semi: 14, rad: 5 });
  // Crumb texture of the breading: a few darker pits and bright crumbs.
  motas(P, cuerpo, REBOZO, 0.09, -1, 1, 2);
  motas(P, cuerpo, REBOZO, 0.07, 1, 2, 1);
  // Melted cheese filling the bite as a puffy dome, a drip hanging down the right flank.
  const queso = un(
    el(38.8, 15 + sq, 8, 4.8),
    el(40.6, 14 + sq, 6, 4.6),
    trazo([[43.5, 18 + sq], [44.4, 25 + sq + g1], [43.6, 28 + sq + g1]], 3.4, 2.5),
    el(43.6, 29 + sq + g1, 2.6, 2.8),
    trazo([[35.5, 18 + sq], [35.6, 22 + sq + g1 * 1.5]], 2.2, 1.6),
    el(35.6, 23 + sq + g1 * 1.5, 2, 2.3),
  );
  P.sombra(queso, 0, 1, 1);
  P.forma(queso, QUESO, { rad: 4.2, grad: 0.35 });
  // Gouda holes and glints.
  P.llenar(el(37, 16 + sq, 1.6, 1.1), QUESO.r[0]);
  P.llenar(el(43.5, 13.5 + sq, 1, 1), QUESO.r[0]);
  P.llenar(el(44.4, 22 + sq, 0.9, 1.3), QUESO.r[0]);
  P.px(36, 13 + sq, CREMA);
  P.px(37, 12 + sq, CREMA);
  P.px(38, 12 + sq, CREMA);
  P.px(42, 21 + sq, CREMA);
  P.px(42, 22 + sq, CREMA);
  // A stretched thread of cheese from the drip (it sways between frames).
  const hilo = bez3([46, 32 + sq + g1], [49, 35 + sq + g1], [49, 40 + sq], [47, 44 + sq + f], 12);
  P.llenar(cur(hilo, 1), QUESO.r[2]);

  P.cara(() => {
    const y0 = 30 + sq;
    // Smug heavy-lidded eyes looking sideways; the right brow is raised.
    for (const cx of [26.5, 36.5]) {
      const ojo = el(cx, y0 + 2.5, 3.8, 3.4);
      P.llenar(ojo, CREMA);
      P.aro(ojo, TOSTA);
      P.llenar(el(cx + 1.3, y0 + 3.4, 1.7, 2), TOSTA);
      P.px(Math.round(cx + 1), y0 + 2, CREMA);
      // Heavy upper lid, cutting the top of the eye.
      P.llenar(inter(ojo, rc(cx - 6, y0 - 1, 12, 3)), REBOZO.r[1]);
      P.llenar(rc(Math.round(cx) - 4, y0 + 1, 8, 1), TOSTA);
    }
    P.llenar(cur([[21, y0 - 1], [25, y0 - 2], [29, y0 - 1]], 1), TOSTA);
    P.llenar(cur([[33, y0 - 2], [37, y0 - 5], [41, y0 - 4]], 1), TOSTA);
    // Smirk pulled up on one side, with a tooth.
    P.llenar(cur([[26, y0 + 11], [30, y0 + 12], [35, y0 + 11], [39, y0 + 8]], 1), TOSTA);
    P.llenar(rc(31, y0 + 12, 3, 1), CREMA);
    P.px(40, y0 + 8, REBOZO.r[1]);
    // Nose bump and blush.
    P.llenar(rc(30, y0 + 6, 2, 2), REBOZO.r[1]);
    P.llenar(rc(21, y0 + 7, 3, 2), '#f08a3a');
    P.llenar(rc(39, y0 + 7, 3, 2), '#f08a3a');
  });
  P.dorso(() => {
    // From behind: a cheese string runs down the back and a golden fry line shades the crust.
    P.llenar(cur([[26, 24 + sq], [25, 36 + sq], [26, 46 + sq]], 1), REBOZO.r[3]);
    P.llenar(cur([[40, 24 + sq], [41, 38 + sq], [40, 50 + sq]], 1), REBOZO.r[1]);
    for (const [x, y] of [[28, 30], [35, 41], [30, 47], [37, 33]] as [number, number][]) {
      P.px(x, y + sq, REBOZO.r[4]);
      P.px(x + 1, y + sq, REBOZO.r[3]);
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Cierzón · grey-blue whirlwind with a grumpy face and a red-and-black baturro cachirulo.
// ---------------------------------------------------------------------------------------------
const VIENTO: Mat = { r: ['#3c4c78', '#5c74a4', '#8aa4cc', '#b8cfe8', '#e8f2fc'], ol: '#1c2440', ol2: '#3c4c78', rim: '#b8cfe8' };
const ROJO_C = '#d82a30';
const ROJO_O = '#8a1420';
const NEGRO_C = '#1c2440';
const HOJA_C = '#d9892a';
const HOJA_O = '#8a4a18';

function cachirulo(P: Pintor, banda: Mascara): void {
  // Red-and-black 2×2 check, shaded by a darker red towards the lower edge.
  P.forma(banda, { r: [ROJO_O, ROJO_C, ROJO_C], ol: NEGRO_C }, { modo: 'plano', paso: 1 });
  banda.each((x, y) => {
    if (P.matEn(x, y) < 0) return;
    const negro = ((x >> 1) + (y >> 1)) % 2 === 0;
    P.px(x, y, negro ? NEGRO_C : !banda.tiene(x, y + 1) || !banda.tiene(x, y + 2) ? ROJO_O : ROJO_C);
  });
}

function cierzon(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const w = f ? 1 : -1; // the whole whirl twists a pixel each frame
  // The funnel: stacked bands, narrower and more offset towards the tip.
  const bandas: [number, number, number, number][] = [
    [32 - w, 60, 2.4, 1.9],
    [33 + w, 56, 5.4, 3.2],
    [30 - w, 51.5, 8.8, 4],
    [34 + w, 46, 12.5, 4.8],
    [30 - w, 40, 16.5, 5.6],
  ];
  for (const [cx, cy, rx, ry] of bandas) {
    const b = el(cx, cy, rx, ry);
    P.sombra(b, 0, 1, 1);
    P.forma(b, VIENTO, { rad: ry * 0.9, grad: 0.45 });
  }
  // Swirl streaks: a groove below every band and a light streak on every other one.
  bandas.forEach(([cx, cy, rx, ry], i) => {
    if (i === 0) return;
    const sh = (i % 2 ? 1 : -1) * (f ? 2 : 0);
    P.llenar(cur(bez3([cx - rx * 0.75 + sh, cy], [cx - rx * 0.4 + sh, cy + ry * 1.1], [cx + rx * 0.4 + sh, cy + ry * 1.1], [cx + rx * 0.8 + sh, cy - ry * 0.3], 14), 1), VIENTO.r[1]);
    if (i % 2) P.llenar(cur(bez3([cx - rx * 0.6 + sh, cy - ry * 0.3], [cx - rx * 0.3 + sh, cy - ry * 0.85], [cx + rx * 0.2 + sh, cy - ry * 0.9], [cx + rx * 0.45 + sh, cy - ry * 0.5], 10), 1), VIENTO.r[4]);
  });
  // The head: a big billowing cloud with scalloped puffs.
  const cab = un(el(32, 28, 19.5, 13), el(19.5, 22, 8.4, 8.4), el(44.5, 22, 8.4, 8.4), el(32, 14.5, 9.5, 7.5), el(22.5, 17, 6.6, 6), el(41.5, 17, 6.6, 6));
  P.sombra(cab, 0, 1, 1);
  P.forma(cab, VIENTO, { rad: 9, grad: 0.5 });
  // Wisps curling out of the head like tiny arms (they trail in the wind).
  const rizo = (pts: [number, number][], g: number) => P.forma(trazo(pts, g, g * 0.5), VIENTO, { rad: 1.6, paso: 3, borde: true });
  rizo(bez3([13, 35], [3, 33 - f * 2], [2, 45], [10 + f, 47], 12), 1.8);
  rizo(bez3([51, 35], [61, 33 + f * 2], [62, 45], [54 - f, 47], 12), 1.8);
  // Leaves caught in the wind (they orbit a little between frames).
  const hoja = (x: number, y: number, tilt: number) => {
    const m = tilt ? poli([[x, y + 3], [x + 3, y], [x + 7, y - 1], [x + 5, y + 3], [x + 2, y + 5]]) : poli([[x, y], [x + 3, y - 3], [x + 7, y - 2], [x + 5, y + 1], [x + 2, y + 3]]);
    P.forma(m, { r: [HOJA_O, HOJA_C, HOJA_C], ol: NEGRO_C }, { modo: 'plano', paso: 1 });
    P.llenar(cur(tilt ? [[x + 1, y + 4], [x + 6, y]] : [[x + 1, y + 2], [x + 6, y - 2]], 1), HOJA_O);
  };
  hoja(4 + f * 2, 52 - f, f);
  hoja(52 - f * 2, 55 + f, 1 - f);
  hoja(52 + f, 9 - f * 2, f);
  // Cloud curls on the lobes of the head and short wind dashes beside the funnel.
  P.llenar(cur(bez3([21, 14], [23, 10], [27, 10], [28, 13], 8), 1), VIENTO.r[4]);
  P.llenar(cur(bez3([36, 11], [39, 8], [43, 9], [44, 12], 8), 1), VIENTO.r[4]);
  P.llenar(cur([[2 + f * 2, 56], [10 + f * 2, 56]], 1), VIENTO.r[3]);
  P.llenar(cur([[6 - f * 2, 59], [12 - f * 2, 59]], 1), VIENTO.r[2]);
  P.llenar(cur([[54 - f * 2, 49], [61 - f * 2, 49]], 1), VIENTO.r[3]);
  P.cara(() => {
    // Cachirulo: the headscarf band across the forehead, a knot on the right and two tails flapping.
    const banda = poli([...bez3([12, 15], [24, 18], [40, 18], [52, 15], 14), ...bez3([52, 21], [40, 24], [24, 24], [12, 21], 14)] as [number, number][]);
    cachirulo(P, inter(banda, cab));
    const nudo = el(47, 20.5, 3.6, 3.4);
    cachirulo(P, poli([[49, 20], [55, 18 - f], [61, 21 - f * 2], [58, 24], [52, 24]]));
    cachirulo(P, poli([[48, 22], [53, 26], [57, 31 + f], [52, 31], [47, 26]]));
    cachirulo(P, nudo);
    // Grumpy face: heavy brows slanting down to the middle, glaring eyes, a deep frown, puffed cheeks.
    for (const cx of [24, 40]) {
      const dir = cx < 32 ? 1 : -1;
      const ojo = el(cx, 30, 4.6, 3.4);
      P.llenar(ojo, VIENTO.r[4]);
      P.aro(ojo, NEGRO_C);
      P.llenar(rc(cx - 1 + dir, 29, 3, 4), NEGRO_C);
      P.px(cx + dir, 29, VIENTO.r[4]);
      // Upper lid cuts the eye in a slant.
      P.llenar(cur([[cx - 5 * dir, 26], [cx + 4 * dir, 29]], 2), VIENTO.r[1]);
      P.llenar(cur([[cx - 5 * dir, 25], [cx + 5 * dir, 28]], 1), NEGRO_C);
    }
    P.llenar(cur(bez3([26, 40], [29, 35.5], [35, 35.5], [38, 40], 8), 2), NEGRO_C);
    P.px(25, 41, NEGRO_C);
    P.px(39, 41, NEGRO_C);
    P.llenar(cur([[28, 38], [36, 38]], 1), VIENTO.r[3]);
    P.llenar(rc(14, 35, 3, 2), VIENTO.r[3]);
    P.llenar(rc(47, 35, 3, 2), VIENTO.r[3]);
  });
  P.dorso(() => {
    // From behind: the knot of the headscarf at the nape with its tails fluttering to the left, and a swirl on the crown.
    const banda = poli([...bez3([12, 15], [24, 18], [40, 18], [52, 15], 14), ...bez3([52, 21], [40, 24], [24, 24], [12, 21], 14)] as [number, number][]);
    cachirulo(P, inter(banda, cab));
    cachirulo(P, poli([[29, 20], [21, 20 + f], [13, 18 + f * 2], [16, 24], [25, 25]]));
    cachirulo(P, poli([[30, 22], [24, 27], [19, 32 + f], [25, 33], [31, 27]]));
    cachirulo(P, el(32, 21.5, 4, 3.6));
    P.llenar(cur(bez3([24, 12], [28, 8], [37, 8], [40, 12], 10), 1), VIENTO.r[4]);
    P.llenar(cur(bez3([18, 29], [26, 38], [40, 38], [48, 29], 12), 1), VIENTO.r[1]);
    P.llenar(cur(bez3([22, 30], [28, 34], [38, 34], [44, 30], 10), 1), VIENTO.r[4]);
  });
  void E;
}

// ---------------------------------------------------------------------------------------------
// Turroncho · a sturdy block of soft turrón with almonds and wafer sheets, fast asleep on its feet.
// ---------------------------------------------------------------------------------------------
const TURRON: Mat = { r: ['#a8743a', '#d09a54', '#e8bf7c', '#f8dca4'], ol: '#5c3a1c', ol2: '#a8743a', rim: '#d09a54' };
const OBLEA: Mat = { r: ['#d8bf90', '#f2e4c0', '#fffaf0'], ol: '#5c3a1c', ol2: '#d8bf90' };
const ALMENDRA: Mat = { r: ['#7a4a1e', '#b0783a', '#d9a45e'], ol: '#4a2810', ol2: '#7a4a1e' };
const TINTA_T = '#5c3a1c';

function almendra(P: Pintor, x: number, y: number, tipo: number): void {
  const m = tipo === 0 ? el(x, y, 3.6, 2.2) : tipo === 1 ? poli([[x - 3, y + 2], [x - 1, y - 2], [x + 3, y - 2], [x + 2, y + 1], [x - 1, y + 3]]) : poli([[x - 3, y - 2], [x - 1, y + 2], [x + 3, y + 2], [x + 2, y - 1], [x - 1, y - 3]]);
  P.sombra(m, 1, 1, 1);
  P.forma(m, ALMENDRA, { rad: 1.8, grad: 0.3 });
  P.px(Math.round(x) - 1, Math.round(y) - 1, ALMENDRA.r[2]);
}

function turroncho(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const sq = f; // frame 1: the block settles a pixel as it breathes out
  // Little feet and stubby arms.
  P.forma(un(rr(17, 54, 11, 6, 2), rr(36, 54, 11, 6, 2)), ALMENDRA, { rad: 2.6 });
  P.forma(par(trazo([[12.5, 32 + sq], [8.5, 38 + sq], [10, 43 + sq]], 2.6, 2.2)), TURRON, { rad: 2.4 });
  // Front face of the block with a soft rounded edge.
  const frente = rr(12, 20 + sq, 40, 34 - sq, 4);
  P.sombra(frente, 0, 1, 1);
  P.forma(frente, TURRON, { rad: 6, grad: 0.45 });
  // Soft grain of the nougat: darker pits and pale sugar.
  motas(P, frente, TURRON, 0.1, -1, 4, 1);
  motas(P, frente, TURRON, 0.08, 1, 5, 1);
  // Wafer sheet at the base and the lip of the one on top.
  P.forma(rc(12, 50, 40, 4), OBLEA, { modo: 'plano', paso: 1 });
  P.llenar(rc(13, 50, 38, 1), OBLEA.r[2]);
  P.llenar(rc(13, 53, 38, 1), OBLEA.r[0]);
  for (let x = 15; x < 51; x += 4) P.px(x, 51, OBLEA.r[0]);
  // Almonds buried in the front.
  const almendras: [number, number, number][] = [[18, 28, 1], [35, 27, 0], [46, 29, 2], [17, 46, 0], [46, 46, 1]];
  if (!E) for (const [x, y, t] of almendras) almendra(P, x, y + sq, t);
  P.dorso(() => {
    for (const [x, y, t] of [[18, 28, 1], [27, 31, 0], [37, 26, 2], [46, 31, 0], [16, 40, 0], [26, 41, 2], [36, 38, 1], [46, 42, 2], [22, 47, 0], [38, 47, 2], [31, 24, 1]] as [number, number, number][]) almendra(P, x, y + sq, t);
    // A crack in the nougat and a bite-sized dent.
    P.llenar(cur([[30, 33 + sq], [32, 36 + sq], [31, 39 + sq]], 1), TURRON.r[0]);
  });
  // Top face (wafer, seen from slightly above) and the front lip of the wafer.
  const tapa = poli([[12, 21 + sq], [17.5, 12 + sq], [46.5, 12 + sq], [52, 21 + sq]]);
  P.sombra(tapa, 0, 1, 1);
  P.forma(tapa, OBLEA, { rad: 4, grad: 0.35, sesgo: 0.15 });
  tapa.each((x, y) => {
    if (P.matEn(x, y) >= 0 && (x + y) % 5 === 0 && y % 2 === (sq ? 1 : 0)) P.px(x, y, OBLEA.r[0]);
  });
  P.forma(rc(12, 20 + sq, 40, 4), OBLEA, { modo: 'plano', paso: 1 });
  P.llenar(rc(13, 20 + sq, 38, 1), OBLEA.r[2]);
  P.llenar(rc(13, 23 + sq, 38, 1), OBLEA.r[0]);
  for (let x = 15; x < 51; x += 4) P.px(x, 21 + sq, OBLEA.r[0]);
  // A couple of almonds resting on the wafer.
  almendra(P, 28, 16 + sq, 1);
  almendra(P, 40, 17 + sq, 0);
  P.cara(() => {
    const y = sq;
    // Sleeping face: closed eyes curled like little moons, flat brows, a tiny mouth and a rosy blush.
    for (const cx of [24, 40]) {
      P.llenar(cur(bez3([cx - 4, 35 + y], [cx - 2, 39 + y], [cx + 2, 39 + y], [cx + 4, 35 + y], 8), 1), TINTA_T);
      P.llenar(cur([[cx - 2, 38 + y], [cx + 2, 38 + y]], 1), TINTA_T);
      P.px(cx - 4, 34 + y, TINTA_T);
      P.px(cx + 4, 34 + y, TINTA_T);
      P.llenar(cur([[cx - 3, 31 + y], [cx + 3, 31 + y]], 1), TURRON.r[0]);
    }
    P.llenar(rc(31, 38 + y, 2, 1), TURRON.r[0]);
    P.llenar(inter(el(32, 43 + y, 2.6, 2.2), rc(28, 43 + y, 8, 4)), TINTA_T);
    P.llenar(inter(el(32, 45 + y, 1.4, 1), rc(28, 45 + y, 8, 4)), '#d9806a');
    P.llenar(rc(15, 40 + y, 4, 2), '#f0a090');
    P.llenar(rc(45, 40 + y, 4, 2), '#f0a090');
  });
  // The snore bubble: it swells between frames.
  const r = f ? 4.6 : 3.4;
  const bx = 56;
  const by = 9 - (f ? 1 : 0);
  const burbuja = el(bx, by, r, r);
  P.forma(burbuja, OBLEA, { rad: r, grad: 0.2, sesgo: 0.25 });
  P.px(Math.round(bx - r * 0.45), Math.round(by - r * 0.45), '#ffffff');
  P.px(Math.round(bx - r * 0.45) + 1, Math.round(by - r * 0.45), '#ffffff');
  P.px(Math.round(bx - r * 0.45), Math.round(by - r * 0.45) + 1, '#ffffff');
  P.px(51, 17, OBLEA.r[1]);
  P.px(53, 14, OBLEA.r[1]);
}

// ---------------------------------------------------------------------------------------------
// Tocinón · a huge round pink pig, calm and heavy («152 kilos de userito»).
// ---------------------------------------------------------------------------------------------
const CERDO: Mat = { r: ['#a8486a', '#d4708c', '#f0a0b4', '#ffc6d2', '#ffe6ec'], ol: '#5a1c34', ol2: '#a8486a', rim: '#ff9ab0' };
const MORRO: Mat = { r: ['#d4708c', '#f0a0b4', '#ffc6d2'], ol: '#7a2a48', ol2: '#a8486a' };
const PEZUNA = '#7a2a48';
const TINTA_C = '#3a0f22';

function tocinon(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const resp = f ? 1 : 0; // breathing: the belly swells a pixel
  const tw = f ? 1 : 0;
  // Floppy ears, behind the head; they twitch on frame 1.
  const oreja = poli([[10, 22], [10 - tw, 8 + tw], [19, 7 + tw], [28, 15]]);
  P.forma(par(oreja), CERDO, { rad: 3.4 });
  P.cara(() => {
    P.llenar(par(poli([[14, 19], [14 - tw, 12 + tw], [19.5, 11 + tw], [24, 16]])), CERDO.r[1]);
  });
  // The big round body, flattened where it rests on the ground.
  const cuerpo = inter(un(el(32, 35.5, 26.5, 22 + resp * 0.5), rc(10, 40, 44, 15)), un(el(32, 36, 27, 24 + resp), rc(5, 36, 54, 19)));
  P.sombra(cuerpo, 0, 1, 1);
  P.forma(cuerpo, CERDO, { rad: 12, grad: 0.5, sesgo: 0.04 });
  // Short stubby legs with hooves, in front of the belly.
  P.forma(un(rr(12, 52, 13, 8, 3), rr(39, 52, 13, 8, 3)), CERDO, { rad: 3.5, sesgo: -0.1 });
  P.llenar(un(rc(14, 58, 4, 2), rc(20, 58, 4, 2), rc(41, 58, 4, 2), rc(47, 58, 4, 2)), PEZUNA);
  P.llenar(un(rc(14, 58, 4, 1), rc(20, 58, 4, 1), rc(41, 58, 4, 1), rc(47, 58, 4, 1)), CERDO.r[0]);
  // A soft fold of fat across the belly and some shade.
  P.llenar(cur(bez3([12, 47], [20, 52], [44, 52], [52, 47], 14), 1), CERDO.r[1]);
  P.tono(el(47, 46, 9, 7), CERDO, -1);
  P.tono(el(20, 20, 9, 4), CERDO, 1);
  P.cara(() => {
    // Big snout with two nostrils, a calm little smile, small sleepy eyes and rosy cheeks.
    const morro = el(32, 41.5 + resp, 10.5, 7.6);
    P.sombra(morro, 0, 1, 1);
    P.forma(morro, MORRO, { rad: 6, grad: 0.3 });
    P.llenar(el(28, 42 + resp, 1.8, 2.5), PEZUNA);
    P.llenar(el(36, 42 + resp, 1.8, 2.5), PEZUNA);
    P.px(27, 41 + resp, MORRO.r[2]);
    P.px(35, 41 + resp, MORRO.r[2]);
    P.llenar(cur(bez3([26, 47.5 + resp], [29, 50 + resp], [35, 50 + resp], [38, 47.5 + resp], 8), 1), PEZUNA);
    for (const cx of [20.5, 43.5]) {
      const dir = cx < 32 ? 1 : -1;
      const ojo = el(cx, 32.5 + resp, 3.3, 2.9);
      P.llenar(ojo, TINTA_C);
      P.px(Math.round(cx) - dir, 32 + resp, CERDO.r[4]);
      P.px(Math.round(cx) - dir, 33 + resp, '#8a4a68');
      P.llenar(inter(ojo, rc(cx - 5, 29 + resp, 10, 2)), CERDO.r[1]);
      P.llenar(cur([[cx - 3.5, 31 + resp], [cx + 3.5, 31 + resp]], 1), TINTA_C);
      P.llenar(el(cx + dir * 0.5, 37.5 + resp, 3.2, 2.1), CERDO.r[3]);
    }
  });
  P.dorso(() => {
    // From behind: a big round rump with a crease between the hams and a corkscrew tail.
    P.llenar(cur(bez3([32, 42], [31, 47], [33, 51], [32, 55], 10), 1), CERDO.r[0]);
    P.llenar(cur(bez3([13, 42], [15, 49], [18, 52], [24, 54], 10), 1), CERDO.r[1]);
    P.llenar(cur(bez3([51, 42], [49, 49], [46, 52], [40, 54], 10), 1), CERDO.r[0]);
    const cola: [number, number][] = [];
    for (let i = 0; i <= 36; i++) {
      const t = i / 36;
      const ang = Math.PI * 0.2 + t * Math.PI * 4.2;
      const r = 0.8 + t * 6;
      cola.push([32 + Math.cos(ang) * r * 1.15 + f * t * 1.5, 38 - t * 6 + Math.sin(ang) * r * 0.75]);
    }
    const mc = trazo(cola, 2, 1.7);
    P.sombra(mc, 1, 1, 1);
    P.forma(mc, CERDO, { rad: 1.8, paso: 3, sesgo: 0.3 });
    // The back of the head: a line of bristles on the neck.
    for (const x of [24, 28, 32, 36, 40]) P.px(x, 17 + (x % 8 === 0 ? 1 : 0), CERDO.r[0]);
  });
  void E;
}

// ---------------------------------------------------------------------------------------------
// Roscochoco · a Christmas ring cake («roscón») under one chocolate glaze, queasy from the grease.
// Deliberately plain (Jesús, 13 Oct 2026: «un diseño más sencillo, menos colorines»): 8 colours in all —
// outline, three chocolate tones, two dough tones, cream and a single red (cherries and tongue).
// ---------------------------------------------------------------------------------------------
const TINTA_R = '#26100a';
const CHOCO: Mat = { r: ['#4a2214', '#6e3620', '#94502e'], ol: TINTA_R, ol2: '#4a2214', rim: '#6e3620' };
const MASA: Mat = { r: ['#c47a30', '#e8a850', '#e8a850'], ol: TINTA_R, ol2: '#c47a30' };
const CEREZA = '#d82a38';
const CREMA_R = '#fff0dc';

function roscochoco(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const sq = f; // frame 1: the cake sags a pixel, queasily
  const cy = 34.5 + sq * 0.5;
  const exterior = el(32, cy, 28.5, 25 - sq * 0.5);
  const agujero = el(32, 25.5 + sq * 0.5, 9.4, 5.6);
  const anillo = men(exterior, agujero);
  // The dough underneath (it shows below the glaze), then one chocolate glaze with a few drips.
  P.sombra(anillo, 0, 1, 1);
  P.forma(anillo, MASA, { rad: 8, grad: 0.4 });
  const gotas = un(rr(11, 50 + sq, 6, 8, 2), rr(27, 53 + sq, 7, 6 + sq, 2), rr(43, 51 + sq, 6, 7, 3));
  // The glaze stops short of the outer edge, so a rim of dough shows all round and the drips run over it.
  const cubierta = el(32, cy - 1.4, 24.8, 21.6 - sq * 0.5);
  const glaseado = men(inter(anillo, un(cubierta, gotas)), agujero);
  P.forma(glaseado, CHOCO, { rad: 11, grad: 0.5 });
  // The hole: a dark inner wall, lit a little on its lower lip.
  P.llenar(agujero, CHOCO.r[0]);
  P.llenar(cur(bez3([24, 27 + sq], [28, 32 + sq], [36, 32 + sq], [40, 27 + sq], 10), 1), CHOCO.r[2]);
  // One long glint on the glaze.
  P.llenar(cur(bez3([8, 32], [9, 22], [15, 14], [23, 11], 12), 1), CREMA_R);
  // Toppings: just a few cherries and a pinch of pearl sugar (a different spread from behind).
  const cereza = (x: number, y: number) => {
    const m = el(x, y, 3.6, 3.4);
    P.sombra(m, 1, 1, 1);
    P.forma(m, { r: [CEREZA, CEREZA, CEREZA], ol: TINTA_R }, { rad: 2.4, paso: 1 });
    P.px(x - 1, y - 1, CREMA_R);
  };
  const azucar: [number, number][] = E
    ? [[16, 20], [49, 20], [12, 36], [52, 36], [24, 44], [40, 44]]
    : [[17, 18], [47, 18], [54, 30], [13, 28]];
  if (!E) {
    cereza(15, 22);
    cereza(32, 12);
    cereza(50, 22);
  } else {
    cereza(14, 32);
    cereza(32, 12);
    cereza(50, 30);
    cereza(32, 44);
  }
  azucar.forEach(([x, y], i) => P.px(x, y, (i + f) % 3 === 0 ? CREMA_R : CHOCO.r[2]));
  P.cara(() => {
    const y = sq;
    // Queasy face: heavy-lidded eyes looking down, a wobbly mouth with the tongue lolling.
    for (const cx of [22, 42]) {
      const dir = cx < 32 ? 1 : -1;
      const ojo = el(cx, 40 + y, 4.8, 3.8);
      P.llenar(ojo, CREMA_R);
      P.aro(ojo, TINTA_R);
      P.llenar(el(cx + dir, 41.4 + y, 1.9, 2), TINTA_R);
      P.px(cx + (dir > 0 ? 0 : -2), 40.5 + y, CREMA_R);
      P.llenar(inter(ojo, rc(cx - 6, 36 + y, 12, 3)), CHOCO.r[1]);
      P.llenar(cur([[cx - 5 * dir, 37 + y - (dir > 0 ? 1 : 0)], [cx + 5 * dir, 38.5 + y - (dir > 0 ? 0 : 1)]], 1), TINTA_R);
    }
    const boca = inter(el(32, 47 + y, 6.4, 3.6), rc(24, 47 + y, 16, 6));
    P.llenar(boca, TINTA_R);
    P.llenar(cur([[26, 47 + y], [29, 45.5 + y], [32, 47 + y], [35, 45.5 + y], [38, 47 + y]], 1), TINTA_R);
    P.llenar(inter(el(34, 50.5 + y, 3.4, 2.6), boca), CEREZA);
    P.llenar(cur([[27, 46 + y], [37, 46 + y]], 1), CREMA_R);
  });
}

export const LOTE_A: Dibujo2[] = [
  { id: 'goudazard', nombre: 'Goudazard', dibujar: goudazard },
  { id: 'cierzon', nombre: 'Cierzón', dibujar: cierzon },
  { id: 'turroncho', nombre: 'Turroncho', dibujar: turroncho },
  { id: 'tocinon', nombre: 'Tocinón', dibujar: tocinon },
  { id: 'roscochoco', nombre: 'Roscochoco', dibujar: roscochoco },
];
void [bez3, espejo, mover, poli];
