// PokéUsera · Edición Jarra (arte v2): batch a of the 64×64 useritos (same conventions as useritos2.ts).
// Goudazard, Aceitún, Cierzón, Turroncho, Tocinón and Roscochoco.
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
  const mordisco = un(el(39.5, 11 + sq, 9, 8.4), el(30.5, 9 + sq, 3.4, 3));
  const cuerpo = men(bruto, mordisco);
  P.sombra(cuerpo, 0, 1, 1);
  P.forma(cuerpo, REBOZO, { modo: 'cil', eje: 32, semi: 14, rad: 5 });
  // Crumb texture of the breading: a few darker pits and bright crumbs.
  motas(P, cuerpo, REBOZO, 0.09, -1, 1, 2);
  motas(P, cuerpo, REBOZO, 0.07, 1, 2, 1);
  // Melted cheese filling the bite as a puffy dome, a drip hanging down the right flank.
  const queso = un(
    el(40, 13 + sq, 8.2, 7),
    trazo([[43.5, 19 + sq], [44.4, 27 + sq + g1], [43.6, 31 + sq + g1]], 3.6, 2.6),
    el(43.6, 32 + sq + g1, 2.7, 3),
    trazo([[35.5, 18 + sq], [35.6, 22 + sq + g1 * 1.5]], 2.2, 1.6),
    el(35.6, 23 + sq + g1 * 1.5, 2, 2.3),
  );
  P.sombra(queso, 0, 1, 1);
  P.forma(queso, QUESO, { rad: 4.2, grad: 0.35 });
  // Gouda holes and glints.
  P.llenar(el(38, 14.5 + sq, 1.6, 1.3), QUESO.r[0]);
  P.llenar(el(44, 12 + sq, 1, 1), QUESO.r[0]);
  P.llenar(el(44.4, 24 + sq, 0.9, 1.3), QUESO.r[0]);
  P.px(36, 9 + sq, CREMA);
  P.px(37, 8 + sq, CREMA);
  P.px(38, 8 + sq, CREMA);
  P.px(42, 23 + sq, CREMA);
  P.px(42, 24 + sq, CREMA);
  // A stretched thread of cheese from the drip (it sways between frames).
  const hilo = bez3([46, 35 + sq + g1], [49, 37 + sq + g1], [49, 42 + sq], [47, 46 + sq + f], 12);
  P.llenar(cur(hilo, 1), QUESO.r[2]);

  P.cara(() => {
    const y0 = 30 + sq;
    // Smug heavy-lidded eyes looking sideways; the right brow is raised.
    for (const cx of [27, 38]) {
      const ojo = el(cx, y0 + 2.5, 3.8, 3.4);
      P.llenar(ojo, CREMA);
      P.aro(ojo, TOSTA);
      P.llenar(el(cx + 1.3, y0 + 3.4, 1.7, 2), TOSTA);
      P.px(Math.round(cx + 1), y0 + 2, CREMA);
      // Heavy upper lid, cutting the top of the eye.
      P.llenar(inter(ojo, rc(cx - 6, y0 - 1, 12, 3)), REBOZO.r[1]);
      P.llenar(rc(Math.round(cx) - 4, y0 + 1, 8, 1), TOSTA);
    }
    P.llenar(cur([[22, y0 - 1], [26, y0 - 2], [30, y0 - 1]], 1), TOSTA);
    P.llenar(cur([[34, y0 - 2], [38, y0 - 5], [42, y0 - 4]], 1), TOSTA);
    // Smirk pulled up on one side, with a tooth.
    P.llenar(cur([[27, y0 + 11], [31, y0 + 12], [36, y0 + 11], [40, y0 + 8]], 1), TOSTA);
    P.llenar(rc(32, y0 + 12, 3, 1), CREMA);
    P.px(41, y0 + 8, REBOZO.r[1]);
    // Nose bump and blush.
    P.llenar(rc(31, y0 + 6, 2, 2), REBOZO.r[1]);
    P.llenar(rc(22, y0 + 7, 3, 2), '#f08a3a');
    P.llenar(rc(41, y0 + 7, 3, 2), '#f08a3a');
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

export const LOTE_A: Dibujo2[] = [{ id: 'goudazard', nombre: 'Goudazard', dibujar: goudazard }];
void [bez3, espejo, mover, poli];
