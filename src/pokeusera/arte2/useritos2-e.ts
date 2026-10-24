// PokéUsera · Edición Jarra (arte v2): batch e of the 64×64 useritos (same conventions as useritos2.ts).
// Maletrio, Teloneon, Choquechu, Torrezmón, Papiroflexeon and Ceceseta.
import type { Dibujo2 } from './useritos2';
import { Pintor, Mascara, bez3, cur, el, espejo, inter, men, poli, rc, rr, trazo, un, type Mat } from './pintor';

/** A faint ghostly halo round a silhouette: a solid pale ring and a dithered outer ring (drawn before the body, which covers its inside). */
function halo(P: Pintor, m: Mascara, claro: string, oscuro: string, fase: number, suelo = 63): void {
  const bb = m.caja();
  const x0 = bb.x0 - 4,
    y0 = bb.y0 - 4;
  const w = bb.x1 - bb.x0 + 9;
  const h = bb.y1 - bb.y0 + 9;
  const dentro = new Uint8Array(w * h);
  m.each((x, y) => (dentro[(y - y0) * w + x - x0] = 1));
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (dentro[j * w + i]) continue;
      let d = 9;
      for (let b = -3; b <= 3; b++) {
        for (let a = -3; a <= 3; a++) {
          const jj = j + b,
            ii = i + a;
          if (ii < 0 || jj < 0 || ii >= w || jj >= h || !dentro[jj * w + ii]) continue;
          d = Math.min(d, Math.hypot(a, b));
        }
      }
      const x = x0 + i,
        y = y0 + j;
      if (y > suelo) continue;
      if (d <= 2.3) P.px(x, y, claro);
      else if (d <= 3.4 && (x + y + fase) % 2 === 0) P.px(x, y, oscuro);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Maletrio · three white cabin suitcases stacked, a trio of lost luggage from the «Impropios Airlines» improv
// show: telescopic handle up, wheels on the bottom case, a bright tag swinging from the middle one and a faint
// ghostly halo (it turns up and vanishes). Top: startled, middle: smug grin, bottom: jet-lagged. From behind: the
// trolley-handle channels, ribs and a collection of stickers.
// ---------------------------------------------------------------------------------------------
const TINTA_M = '#262a48';
const MALETA: Mat = { r: ['#a4aacb', '#cfd4ea', '#eef1fb', '#ffffff'], ol: TINTA_M, ol2: '#7d86b4' };
const RUEDA: Mat = { r: ['#262a40', '#4a4f6e', '#8c92b8'], ol: TINTA_M };
const ETIQ: Mat = { r: ['#c8321c', '#ff6a1e', '#ffb340'], ol: TINTA_M, ol2: '#c8321c' };
const HALO_C = '#d6ccff';
const HALO_O = '#a99bff';

function maletrio(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const dy = f ? -1 : 0; // the whole trio hovers a pixel
  const abajo = rr(9, 42 + dy, 40, 16, 4);
  const medio = rr(14, 26 + dy, 38, 16, 4);
  const arriba = rr(12, 10 + dy, 34, 16, 4);
  const ruedas = un(el(17.5, 59 + dy, 3, 3), el(40.5, 59 + dy, 3, 3));
  const mango = un(rc(22, 4 + dy, 2, 6), rc(35, 4 + dy, 2, 6), rr(18, 1 + dy, 22, 4, 2));
  const todo = un(abajo, medio, arriba, ruedas, mango);
  halo(P, todo, HALO_C, HALO_O, f, 62 + dy);

  // Wheels and the telescopic handle (dark grey).
  P.forma(ruedas, RUEDA, { rad: 3, grad: 0.5 });
  P.px(16, 58 + dy, RUEDA.r[2]);
  P.px(39, 58 + dy, RUEDA.r[2]);
  P.llenar(rc(17, 60 + dy, 2, 1), RUEDA.r[0]);
  P.llenar(rc(40, 60 + dy, 2, 1), RUEDA.r[0]);
  P.forma(un(rc(22, 4 + dy, 2, 6), rc(35, 4 + dy, 2, 6)), RUEDA, { modo: 'plano', paso: 1, rad: 1 });
  P.forma(rr(18, 1 + dy, 22, 4, 2), RUEDA, { rad: 2, grad: 0.5 });
  P.llenar(rc(20, 2 + dy, 14, 1), RUEDA.r[2]);

  const maleta = (m: Mascara, x0: number, y0: number, w: number, h: number, sombra: boolean) => {
    if (sombra) P.sombra(m, 0, 1, 1);
    P.forma(m, MALETA, { rad: 3.4, grad: 0.35 });
    // Hard-shell frame groove round the panel; ribs only on the back panel.
    const ranura = men(rr(x0 + 2, y0 + 2, w - 4, h - 4, 2.6), rr(x0 + 3, y0 + 3, w - 6, h - 6, 2));
    P.llenar(ranura, MALETA.r[1]);
    ranura.each((x, y) => {
      if (!ranura.tiene(x - 1, y) && !ranura.tiene(x, y - 1) && ranura.tiene(x + 1, y)) P.px(x, y, MALETA.r[0]);
      else if (!ranura.tiene(x + 1, y) && ranura.tiene(x - 1, y) && y > y0 + h / 2) P.px(x, y, MALETA.r[3]);
    });
    if (E) {
      for (const c of [5, 8, w - 9, w - 6]) {
        P.llenar(rc(x0 + c, y0 + 3, 1, h - 6), MALETA.r[1]);
        P.llenar(rc(x0 + c + 1, y0 + 3, 1, h - 6), MALETA.r[3]);
      }
    }
    // Corner guards: a shade darker.
    for (const [cx, cy] of [[x0 + 1, y0 + 1], [x0 + w - 2, y0 + 1], [x0 + 1, y0 + h - 2], [x0 + w - 2, y0 + h - 2]] as [number, number][]) P.px(cx, cy, MALETA.r[0]);
  };
  maleta(abajo, 9, 42 + dy, 40, 16, false);
  maleta(medio, 14, 26 + dy, 38, 16, true);
  maleta(arriba, 12, 10 + dy, 34, 16, true);

  /** One pair of big dark eyes: `a` is the lid (0 open … 3 half shut). */
  const ojos = (cx: number, cy: number, sep: number, lid: number, brillo = true) => {
    for (const s of [-1, 1]) {
      const x = cx + s * sep;
      const ojo = el(x, cy, 2.7, 3.4);
      P.llenar(ojo, TINTA_M);
      if (brillo) {
        P.px(Math.round(x - 1), Math.round(cy - 2), '#ffffff');
        P.px(Math.round(x - 1), Math.round(cy - 1), '#ffffff');
        P.px(Math.round(x + 1), Math.round(cy + 1), MALETA.r[0]);
      }
      if (lid) P.llenar(inter(ojo, rc(0, Math.floor(cy - 4), 64, lid + 1)), MALETA.r[1]);
      if (lid) P.llenar(rc(Math.round(x - 3), Math.floor(cy - 4) + lid + 1, 6, 1), TINTA_M);
    }
  };

  P.cara(() => {
    // Top suitcase: startled (small round mouth, raised brows).
    ojos(29, 17 + dy, 5.5, 0);
    P.llenar(cur([[22, 12 + dy], [24, 11 + dy], [26, 12 + dy]], 1), TINTA_M);
    P.llenar(cur([[32, 12 + dy], [34, 11 + dy], [36, 12 + dy]], 1), TINTA_M);
    P.llenar(el(29, 22.5 + dy, 1.8, 1.6), TINTA_M);
    P.px(29, 22 + dy, ETIQ.r[2]);
    // Middle suitcase: the star, a big smug grin.
    ojos(33, 31 + dy, 6.5, 0);
    P.llenar(cur([[24, 26 + dy], [27, 27 + dy], [30, 27 + dy]], 1), TINTA_M);
    P.llenar(cur([[36, 27 + dy], [39, 25 + dy], [42, 26 + dy]], 1), TINTA_M);
    const boca = inter(el(33, 36.4 + dy, 6.2, 3.6), rc(20, 36 + dy, 28, 5));
    P.llenar(boca, TINTA_M);
    P.llenar(rc(28, 36 + dy, 11, 1), '#ffffff');
    P.llenar(inter(el(35, 40 + dy, 3, 1.8), boca), ETIQ.r[2]);
    P.px(26, 36 + dy, TINTA_M);
    P.px(40, 36 + dy, TINTA_M);
    P.llenar(rc(22, 34 + dy, 3, 2), ETIQ.r[2]);
    P.llenar(rc(42, 34 + dy, 3, 2), ETIQ.r[2]);
    // Bottom suitcase: jet-lagged, half-shut eyes with bags and a flat mouth.
    ojos(29, 48 + dy, 6, 2, false);
    P.llenar(rc(22, 52 + dy, 5, 1), MALETA.r[0]);
    P.llenar(rc(31, 52 + dy, 5, 1), MALETA.r[0]);
    P.llenar(cur([[26, 54 + dy], [29, 55 + dy], [32, 54 + dy]], 1), TINTA_M);
    P.px(33, 55 + dy, TINTA_M);
  });
  P.dorso(() => {
    // From behind: a pair of trolley-handle channels down every case, stickers, a lock.
    for (const [x0, y0, w, h] of [[12, 10 + dy, 34, 16], [14, 26 + dy, 38, 16], [9, 42 + dy, 40, 16]] as number[][]) {
      const cx = x0 + Math.floor(w / 2);
      P.llenar(rc(cx - 8, y0 + 2, 2, h - 4), RUEDA.r[1]);
      P.llenar(rc(cx + 6, y0 + 2, 2, h - 4), RUEDA.r[1]);
      P.llenar(rc(cx - 8, y0 + 2, 1, h - 4), RUEDA.r[2]);
      P.llenar(rc(cx + 6, y0 + 2, 1, h - 4), RUEDA.r[2]);
    }
    // Top: a round sticker with a little plane.
    P.forma(el(29, 18 + dy, 4.6, 4.6), ETIQ, { rad: 3, grad: 0.2 });
    P.llenar(rc(26, 18 + dy, 7, 1), '#ffffff');
    P.llenar(rc(28, 16 + dy, 2, 5), '#ffffff');
    P.px(31, 19 + dy, '#ffffff');
    // Middle: a lilac «ghost» sticker and a luggage-wrap strip.
    P.est(30, 30 + dy, ['..xxxx..', '.xxxxxx.', 'xxxxxxxx', 'xooxxoox', 'xooxxoox', 'xxxxxxxx', 'xxxxxxxx', 'x.xx.xx.'], { x: HALO_O, o: TINTA_M });
    P.px(31, 31 + dy, HALO_C);
    P.px(32, 31 + dy, HALO_C);
    // Bottom: a FRAGILE strip.
    P.llenar(rc(21, 49 + dy, 17, 5), ETIQ.r[0]);
    for (let x = 22; x < 37; x += 3) P.llenar(rc(x, 50 + dy, 2, 1), '#ffffff');
    P.llenar(rc(22, 52 + dy, 15, 1), ETIQ.r[2]);
    P.px(48 - 3, 56 + dy, TINTA_M);
  });

  // Little side carry-handles (the tag hangs from the middle one).
  const TH = (m: Mascara) => (E ? espejo(m) : m);
  P.forma(TH(rr(50, 29 + dy, 4, 7, 1.5)), RUEDA, { modo: 'plano', paso: 1, rad: 1 });
  P.forma(TH(rr(10, 14 + dy, 4, 7, 1.5)), RUEDA, { modo: 'plano', paso: 1, rad: 1 });
  P.forma(TH(rr(7, 46 + dy, 4, 7, 1.5)), RUEDA, { modo: 'plano', paso: 1, rad: 1 });
  // The tag swinging from the middle case's side handle (on the other side from behind).
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const bal = f ? 2 : 0;
  P.llenar(T(cur([[53, 33 + dy], [55 + bal / 2, 35 + dy], [56 + bal, 37 + dy]], 1)), TINTA_M);
  P.forma(T(poli([[53 + bal, 37 + dy], [60 + bal, 36 + dy], [62 + bal, 45 + dy], [55 + bal, 47 + dy]])), ETIQ, { rad: 3, grad: 0.3 });
  P.px(TX(56 + bal), 39 + dy, '#ffffff');
  P.llenar(T(rc(56 + bal, 40 + dy, 4, 4)), '#ffffff');
  P.px(TX(57 + bal), 41 + dy, TINTA_M);
  P.px(TX(59 + bal), 41 + dy, TINTA_M);
  P.px(TX(58 + bal), 42 + dy, TINTA_M);
  P.px(TX(57 + bal), 43 + dy, TINTA_M);
  P.px(TX(59 + bal), 43 + dy, TINTA_M);
}

// ---------------------------------------------------------------------------------------------
// Teloneon · a red velvet theatre curtain on its gold rod, tied back with tasselled cords, that floats like a
// ghost (scalloped hem, billowing sides). Its face is a white comedy mask hanging in the dark of the stage. From
// behind: the closed lining with the central seam, the curtain rings on the rod and a taped backstage note.
// ---------------------------------------------------------------------------------------------
const TINTA_T = '#240308';
const TERCIO: Mat = { r: ['#4a0814', '#7a0f24', '#b01a2e', '#dc3a3c'], ol: TINTA_T, ol2: '#4a0814' };
const DORADO: Mat = { r: ['#8a5a12', '#d9a020', '#ffd35a', '#fff0a8'], ol: TINTA_T, ol2: '#8a5a12' };
const CARETA: Mat = { r: ['#a8a0c0', '#e2dcee', '#ffffff'], ol: TINTA_T, ol2: '#a8a0c0' };
const ESCENA: Mat = { r: [TINTA_T, '#3e0a1c', '#6a1430'], ol: TINTA_T };
const MEJILLA_T = '#ff9a8a';

function teloneon(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const b = f ? 1 : 0; // the billow: sides swell and the hem wave shifts
  const w1 = f ? 1.4 : 0;
  const w2 = f ? 0 : 1.4;

  // Half a drape in front coordinates (left one); the right one is its mirror with the opposite hem wave.
  const drapeado = (lado: number): Mascara => {
    const o = lado ? w2 : w1;
    const o2 = lado ? w1 : w2;
    const cuerpo = E
      ? poli([[5 - b * 0.5, 12], [33, 12], [33, 56], [2 - b, 56], [2 - b, 38]])
      : poli([
          [5 - b * 0.5, 12],
          [30, 12],
          ...bez3([30, 12], [26, 24], [11, 26], [15, 36], 10),
          ...bez3([15, 36], [15, 44], [22, 48], [27, 56], 10),
          [27, 56],
          [2 - b, 56],
          [2 - b, 38],
        ]);
    return un(cuerpo, el(6.5, 56 + o, 5, 4.6), el(15.5, 57 + o2, 5.2, 4.8), el(24.5, 56 + o, 4.8, 4.6));
  };
  const izq = drapeado(0);
  const der = espejo(drapeado(1));

  // The dark of the stage behind (front) or nothing (back: the curtain is closed).
  P.cara(() => {
    const fondo = poli([[22, 12], [42, 12], [50, 36], [44, 58], [20, 58], [14, 36]]);
    P.forma(fondo, ESCENA, { rad: 12, grad: 0.2 });
    // A soft pool of stage light round the mask and a few gold glints.
    P.tono(el(32, 36, 12, 15), ESCENA, 1);
    P.px(20, 44, DORADO.r[2]);
    P.px(44, 30, DORADO.r[2]);
    P.px(26, 52 - b, DORADO.r[1]);
    P.px(40, 50 + b, DORADO.r[1]);
  });

  // Each drape: velvet folds and, from the front, the tie-back cord with its tassel.
  const dibujaTela = (m: Mascara, lado: number) => {
    const X = (x: number) => (lado ? 63 - x : x);
    P.sombra(m, 1, 0, 1);
    P.forma(m, TERCIO, { rad: 7, grad: 0.35 });
    // Velvet folds: lighter and darker vertical bands that hang from the rod.
    const pliegue = (x0: number, x1: number, y1: number, d: number) => {
      const c = cur(bez3([X(x0), 14], [X(x0 + d), 22], [X(x1 - d), 30], [X(x1), y1], 10), 2);
      P.tono(inter(c, m), TERCIO, -1);
      const c2 = cur(bez3([X(x0 + 2), 14], [X(x0 + d + 2), 22], [X(x1 - d + 2), 30], [X(x1 + 2), y1], 10), 1);
      P.tono(inter(c2, m), TERCIO, 1);
    };
    pliegue(9, 8, 54, 1);
    pliegue(16, 12, 36, 2);
    pliegue(23, 17, 34, 3);
    // Below the tie the cloth falls in long folds.
    for (const [x0, x1] of [[6 - b, 4], [11, 11], [17, 19]]) {
      P.tono(inter(cur([[X(x0), 40], [X(x1 + (lado ? -b : b)), 56]], 2), m), TERCIO, -1);
      P.tono(inter(cur([[X(x0 + 2), 40], [X(x1 + 2 + (lado ? -b : b)), 56]], 1), m), TERCIO, 1);
    }
    // Tie-back cord, knot and tassel.
    if (!E) {
      const cuerda = cur(bez3([X(2 - b), 33], [X(8), 38], [X(14), 38], [X(18), 32], 8), 2);
      P.forma(cuerda, DORADO, { rad: 1.4, paso: 2 });
      cuerda.each((x, y) => {
        if ((x + y) % 3 === 0) P.px(x, y, DORADO.r[1]);
      });
      P.forma(el(X(10), 38, 2.6, 2.6), DORADO, { rad: 2 });
      const borla = un(trazo([[X(10), 39], [X(10.5 + (lado ? -b : b) * 0.6), 45]], 1.1, 1.1), el(X(10.5 + (lado ? -b : b) * 0.6), 48, 2.6, 3.2));
      P.forma(borla, DORADO, { rad: 2 });
      for (const dx of [-1, 0, 1]) P.px(X(10 + dx + (lado ? -b : b) * 0.6), 51, DORADO.r[0]);
    }
  };
  dibujaTela(izq, 0);
  dibujaTela(der, 1);
  P.dorso(() => {
    // Closed: the two halves overlap in a seam down the middle, with a long shadow under the overlapping edge.
    P.llenar(cur(bez3([32, 14], [31, 28], [33, 44], [32, 58], 14), 1), TERCIO.r[0]);
    P.llenar(cur(bez3([33, 14], [32, 28], [34, 44], [33, 58], 14), 1), TERCIO.r[3]);
    P.llenar(cur(bez3([30, 14], [29, 28], [31, 44], [30, 58], 14), 1), TERCIO.r[1]);
  });

  // Gold fringe along the hem: little ticks under the scallops.
  const hem = un(izq, der);
  const bb = hem.caja();
  for (let x = bb.x0; x <= bb.x1; x += 2) {
    let ym = -1;
    for (let y = bb.y1; y >= bb.y0; y--) if (hem.tiene(x, y)) { ym = y; break; }
    if (ym > 44) {
      P.px(x, ym + 2, DORADO.r[1]);
      P.px(x, ym + 3, DORADO.r[2]);
    }
  }

  // The rod, its finials and the valance with gold fringe.
  const valancia = un(rc(6, 8, 52, 5), el(12, 13, 7, 4.5), el(23, 14, 6.5, 5), el(32, 14.5, 6, 5.4), el(41, 14, 6.5, 5), el(52, 13, 7, 4.5));
  P.sombra(valancia, 0, 1, 1);
  P.forma(valancia, TERCIO, { rad: 6, grad: 0.4 });
  for (const x of [17, 28, 37, 47]) P.tono(rc(x, 9, 2, 8), TERCIO, -1);
  for (const x of [15, 26, 35, 45]) P.tono(rc(x, 9, 1, 7), TERCIO, 1);
  const vb = valancia.caja();
  for (let x = vb.x0; x <= vb.x1; x++) {
    let ym = -1;
    for (let y = vb.y1; y >= vb.y0; y--) if (valancia.tiene(x, y)) { ym = y; break; }
    if (ym > 0 && x % 2 === 0) {
      P.px(x, ym + 2, DORADO.r[1]);
      P.px(x, ym + 3, DORADO.r[2]);
    }
  }
  P.forma(rr(4, 2, 56, 5, 2.4), DORADO, { rad: 2.4, grad: 0.3 });
  P.llenar(rc(7, 3, 50, 1), DORADO.r[3]);
  P.forma(un(el(4.5, 4.5, 3.4, 3.4), el(59.5, 4.5, 3.4, 3.4)), DORADO, { rad: 3 });
  P.px(3, 3, DORADO.r[3]);
  P.px(58, 3, DORADO.r[3]);
  P.dorso(() => {
    // Curtain rings clipped on the rod.
    for (let x = 9; x < 56; x += 6) {
      P.llenar(rc(x, 7, 3, 1), DORADO.r[3]);
      P.px(x, 8, DORADO.r[1]);
      P.px(x + 2, 8, DORADO.r[1]);
    }
  });

  P.cara(() => {
    // The comedy mask hanging in the middle; it bobs with the billow.
    const y0 = 34 + (f ? -1 : 0);
    const cara = poli([[22, y0 - 11], [42, y0 - 11], [43, y0 - 2], [40, y0 + 8], [32, y0 + 13.5], [24, y0 + 8], [21, y0 - 2]]);
    // Ribbons.
    P.llenar(cur([[21, y0 - 5], [16, y0 - 2], [13, y0 + 3 + b]], 1), DORADO.r[2]);
    P.llenar(cur([[42, y0 - 5], [47, y0 - 2], [50, y0 + 3 + b]], 1), DORADO.r[2]);
    P.sombra(cara, 1, 1, 1);
    P.forma(cara, CARETA, { rad: 7, grad: 0.4 });
    // Eye holes (happy almonds slanting up), brows, rosy cheeks, a wide grin with teeth.
    for (const sg of [-1, 1]) {
      const cx = 32 + sg * 6.6;
      P.llenar(el(cx, y0 - 2, 3.2, 3.8), TINTA_T);
      P.px(Math.round(cx - 1), Math.round(y0 - 4), '#ffffff');
      P.px(Math.round(cx - 1), Math.round(y0 - 3), '#ffffff');
      P.px(Math.round(cx + 1), Math.round(y0), CARETA.r[0]);
      // Thick raised brow, higher on the inside.
      P.llenar(cur([[cx - 4, y0 - 6], [cx - sg * 0.5, y0 - 8.4], [cx + 4, y0 - 7]], 1), CARETA.r[0]);
    }
    P.llenar(rc(26, y0 + 2, 3, 2), MEJILLA_T);
    P.llenar(rc(35, y0 + 2, 3, 2), MEJILLA_T);
    const boca = inter(el(32, y0 + 4.6, 7.6, 5), rc(20, y0 + 5, 24, 8));
    P.llenar(boca, TINTA_T);
    P.llenar(rc(26, y0 + 5, 12, 1), '#ffffff');
    P.llenar(rc(27, y0 + 8, 10, 1), ESCENA.r[2]);
    P.px(24, y0 + 4, TINTA_T);
    P.px(40, y0 + 4, TINTA_T);
    P.px(32, y0 + 1, CARETA.r[0]);
    P.px(32, y0, CARETA.r[0]);
  });
  P.dorso(() => {
    // The tie-back cord hangs loose across the lining with a tassel at each end.
    const soga = cur(bez3([7, 28], [22, 48], [42, 48], [57, 28], 20), 2);
    P.forma(soga, DORADO, { rad: 1.4, paso: 2 });
    soga.each((x, y) => {
      if ((x + y) % 3 === 0) P.px(x, y, DORADO.r[1]);
    });
    for (const x of [7, 56]) {
      P.forma(un(trazo([[x, 29], [x, 34]], 1.1, 1.1), el(x, 37, 2.6, 3.2)), DORADO, { rad: 2 });
      for (const dx of [-1, 0, 1]) P.px(x + dx, 40, DORADO.r[0]);
    }
  });
  P.dorso(() => {
    // A backstage note taped to the lining: an arrow and two scribbled lines.
    P.forma(rr(39, 47, 12, 9, 1), CARETA, { modo: 'plano', paso: 2, rad: 1 });
    P.llenar(rc(41, 49, 7, 1), CARETA.r[0]);
    P.llenar(cur([[41, 53], [47, 53]], 1), TINTA_T);
    P.px(46, 52, TINTA_T);
    P.px(46, 54, TINTA_T);
    P.llenar(rc(40, 46, 3, 2), DORADO.r[2]);
    P.llenar(rc(48, 46, 3, 2), DORADO.r[2]);
  });
}

// ---------------------------------------------------------------------------------------------
// Choquechu · a fairground bumper car: glossy red shell with yellow trim and a number roundel, a fat black rubber
// bumper all round, steering wheel and seat, and the tall pole at the back crackling with sparks. The headlights
// are its eyes (a mischievous lid over each). From behind: the rear deck with the pole's base plate, tail-lights
// and the seat from the other side.
// ---------------------------------------------------------------------------------------------
const TINTA_C = '#2a0610';
const COCHE: Mat = { r: ['#6a0e1a', '#b01828', '#e02e2e', '#ff6a50'], ol: TINTA_C, ol2: '#6a0e1a' };
const AMARILLO: Mat = { r: ['#b87a10', '#f2b81c', '#ffe05a', '#fff6b0'], ol: TINTA_C, ol2: '#b87a10' };
const GOMA_C: Mat = { r: ['#14141e', '#2c2c3c', '#555570'], ol: TINTA_C };
const METAL: Mat = { r: ['#6c7290', '#9aa0b8', '#d4d8e8'], ol: TINTA_C, ol2: '#6c7290' };
const ARCO = '#7ad8ff';

function choquechu(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const dy = f ? 1 : 0; // the car squats on its suspension, the spark stays where it is
  const Y = (y: number) => y + dy + 3;

  // The rubber bumper: a fat skirt all round the car, with a pale highlight on its top edge.
  const parachoques = rr(3, Y(43), 58, 15, 7);
  P.forma(parachoques, GOMA_C, { rad: 4.5, grad: 0.3 });
  P.llenar(cur(bez3([8, Y(45)], [20, Y(43.6)], [44, Y(43.6)], [56, Y(45)], 12), 1), GOMA_C.r[2]);
  P.llenar(rc(6, Y(51), 1, 4), GOMA_C.r[1]);
  P.llenar(rc(57, Y(51), 1, 4), GOMA_C.r[0]);
  // Pole: behind the seat from the front, in front of it from behind.
  const palo = (): void => {
    const x = 31;
    P.forma(rc(x, Y(5), 3, 24), METAL, { modo: 'cil', eje: x + 1.5, semi: 1.5, rad: 1.5 });
    for (let y = Y(10); y < Y(26); y += 3) P.px(x, y, METAL.r[0]);
    P.forma(rr(28, Y(3), 8, 4, 1), METAL, { rad: 1.6 });
    P.px(29, Y(4), METAL.r[2]);
  };
  const asiento = (): void => {
    P.forma(rr(22, Y(14), 20, 16, 5), GOMA_C, { rad: 4, grad: 0.4 });
    P.llenar(cur([[25, Y(16)], [30, Y(15)]], 1), GOMA_C.r[2]);
    P.llenar(rc(23, Y(19), 1, 6), GOMA_C.r[1]);
  };
  if (!E) {
    palo();
    asiento();
  }

  // The shell.
  const concha = rr(8, Y(24), 48, 25, 10);
  P.sombra(concha, 0, 2, 1);
  P.forma(concha, COCHE, { rad: 9, grad: 0.4 });
  // Yellow trim: a stripe round the lower shell and glints on the dome.
  const franja = inter(concha, rc(8, Y(41), 48, 3));
  P.forma(franja, AMARILLO, { modo: 'plano', paso: 2, rad: 1, borde: false });
  P.llenar(rc(11, Y(41), 42, 1), AMARILLO.r[3]);
  P.llenar(rc(11, Y(43), 42, 1), AMARILLO.r[1]);
  P.llenar(cur([[14, Y(28)], [19, Y(26)], [26, Y(25.4)]], 1), COCHE.r[3]);
  P.px(12, Y(30), COCHE.r[3]);
  P.px(11, Y(33), COCHE.r[3]);
  // Number roundel.
  const num = (x: number, y: number) => {
    P.forma(el(x, y, 4.4, 4.4), AMARILLO, { rad: 3, grad: 0.2 });
    P.llenar(el(x, y, 3.4, 3.4), AMARILLO.r[2]);
    P.est(Math.round(x) - 1, Math.round(y) - 2, ['xxx', '..x', '.x.', '.x.', '.x.'], { x: TINTA_C });
  };

  P.cara(() => {
    // Steering wheel on the cowl, seen from the front: a yellow ring with a chrome hub and two spokes.
    P.forma(el(32, Y(25.2), 8.6, 3.8), AMARILLO, { rad: 2.4, grad: 0.4 });
    P.llenar(el(32, Y(25.4), 6, 2), GOMA_C.r[1]);
    P.llenar(rc(27, Y(25), 10, 1), AMARILLO.r[1]);
    P.forma(el(32, Y(25.2), 2.2, 1.6), METAL, { rad: 1 });
    num(32, Y(38.4));
    // Headlight eyes with chrome rims, pupils that look at you, and a cheeky lid on each.
    for (const s of [-1, 1]) {
      const cx = 32 + s * 12.6;
      const cy = Y(35);
      P.forma(el(cx, cy, 6.8, 6.8), METAL, { rad: 2, grad: 0.3 });
      P.llenar(el(cx, cy, 5.6, 5.6), AMARILLO.r[3]);
      P.llenar(el(cx - s * 0.4, cy + 0.8, 3.4, 3.8), TINTA_C);
      P.px(Math.round(cx - s * 1.6), Math.round(cy - 0.6), AMARILLO.r[3]);
      P.px(Math.round(cx - s * 1.6), Math.round(cy + 0.4), AMARILLO.r[3]);
      P.px(Math.round(cx - s * 0.2), Math.round(cy + 3), METAL.r[1]);
      // The lid: slanted down towards the nose.
      const lid = poli(s < 0 ? [[cx - 7, cy - 8], [cx + 7, cy - 8], [cx + 7, cy - 3], [cx - 7, cy - 5.4]] : [[cx - 7, cy - 8], [cx + 7, cy - 8], [cx + 7, cy - 5.4], [cx - 7, cy - 3]]);
      P.llenar(inter(lid, el(cx, cy, 5.7, 5.7)), COCHE.r[2]);
      P.llenar(inter(cur(s < 0 ? [[cx - 7, cy - 5.4], [cx + 7, cy - 3]] : [[cx - 7, cy - 3], [cx + 7, cy - 5.4]], 1), el(cx, cy, 6.2, 6.2)), TINTA_C);
    }
    // Chrome grille on the bumper and two little corner lamps.
    P.forma(rr(24, Y(48), 16, 5, 2), METAL, { rad: 2 });
    for (let x = 26; x < 39; x += 3) P.llenar(rc(x, Y(49), 1, 3), GOMA_C.r[1]);
    for (const x of [8, 9, 54, 55]) P.px(x, Y(48), AMARILLO.r[2]);
  });
  P.dorso(() => {
    // Rear deck: the pole's base plate with bolts, two round tail-lights, a bumper sticker.
    P.forma(rr(24, Y(25), 16, 6, 2), METAL, { rad: 2 });
    P.px(26, Y(27), GOMA_C.r[1]);
    P.px(37, Y(27), GOMA_C.r[1]);
    P.px(26, Y(26), METAL.r[2]);
    num(32, Y(38.4));
    for (const s of [-1, 1]) {
      const cx = 32 + s * 14;
      P.forma(el(cx, Y(35.4), 5, 5), COCHE, { rad: 3, grad: 0.3, sesgo: 0.2 });
      P.llenar(el(cx, Y(35.4), 3.6, 3.6), AMARILLO.r[1]);
      P.llenar(el(cx - 0.5, Y(34.9), 2, 2), AMARILLO.r[3]);
      P.px(Math.round(cx + 1), Y(37), COCHE.r[1]);
    }
    P.forma(rr(24, Y(48), 16, 5, 2), AMARILLO, { rad: 2 });
    P.llenar(rc(26, Y(50), 12, 1), TINTA_C);
    P.px(26, Y(49), TINTA_C);
    P.px(37, Y(49), TINTA_C);
  });
  if (E) {
    // The seat is in front of the pole's base; the pole rises from the deck over it.
    asiento();
    palo();
  }
  // Sparks at the tip of the pole: bigger bolts that change shape between frames.
  const bolt = (pts: [number, number][]) => {
    const m = cur(pts, 2);
    m.each((x, y) => {
      for (const [ax, ay] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (!m.tiene(x + ax, y + ay)) P.px(x + ax, y + ay, ARCO);
    });
    m.each((x, y) => P.px(x, y, AMARILLO.r[3]));
  };
  const y0 = 9 + dy;
  if (!f) {
    bolt([[31, y0], [27, 6], [30, 4], [24, 1]]);
    bolt([[34, y0], [37, 7], [35, 5], [38, 2]]);
    P.px(43, 3, AMARILLO.r[3]);
    P.px(44, 4, AMARILLO.r[2]);
    P.px(20, 5, AMARILLO.r[2]);
    P.px(46, 8, AMARILLO.r[2]);
  } else {
    bolt([[31, y0], [28, 7], [26, 5], [21, 6]]);
    bolt([[34, y0], [36, 5], [39, 5], [41, 1]]);
    P.px(26, 1, AMARILLO.r[3]);
    P.px(25, 0, AMARILLO.r[2]);
    P.px(17, 9, AMARILLO.r[2]);
    P.px(46, 4, AMARILLO.r[2]);
  }
}

// ---------------------------------------------------------------------------------------------
// Torrezmón · a fried pork-belly block (a torrezno): blistered golden crackling on top, layers of fat and meat
// below, glints of grease, a lemon wedge worn as a jaunty hat and a lazy, blissed-out face. One arm waves.
// From behind: the same crackling and layers with a bite taken out of a corner, and the peel side of the lemon.
// ---------------------------------------------------------------------------------------------
const TINTA_Z = '#3a1406';
const CORTEZA: Mat = { r: ['#8a3a0a', '#c8641a', '#f0a030', '#ffd060', '#fff0a0'], ol: TINTA_Z, ol2: '#8a3a0a' };
const GRASA: Mat = { r: ['#c8a888', '#f2dcc0', '#fff8ea'], ol: TINTA_Z, ol2: '#6a2018' };
const CARNE: Mat = { r: ['#6a2018', '#a8402e', '#d06a50'], ol: TINTA_Z, ol2: '#6a2018' };
const LIMON: Mat = { r: ['#e0a812', '#f6ec5c', '#fff9c0'], ol: TINTA_Z, ol2: '#c08a0e' };

/** A lemon wedge: half an ellipse (flat side down at its own centre) turned by `ang` radians. */
function gajo(P: Pintor, cx: number, cy: number, rx: number, ry: number, ang: number, dorso: boolean): void {
  const m = new Mascara();
  const co = Math.cos(ang),
    si = Math.sin(ang);
  const R = Math.ceil(Math.max(rx, ry)) + 2;
  const pos = (x: number, y: number): [number, number] => {
    const dx = x + 0.5 - cx,
      dy = y + 0.5 - cy;
    return [(dx * co + dy * si) / rx, (-dx * si + dy * co) / ry];
  };
  for (let y = Math.floor(cy) - R; y <= Math.ceil(cy) + R; y++) {
    for (let x = Math.floor(cx) - R; x <= Math.ceil(cx) + R; x++) {
      const [u, v] = pos(x, y);
      if (v <= 0.04 && u * u + v * v <= 1) m.add(x, y);
    }
  }
  P.sombra(m, 1, 1, 1);
  P.forma(m, LIMON, { rad: 3, grad: 0.3, paso: dorso ? 0 : 1 });
  m.each((x, y) => {
    const [u, v] = pos(x, y);
    const t = Math.hypot(u, v);
    if (dorso) {
      // The peel side: a darker rim, a pale glint and a few pores.
      if (t > 0.8) P.px(x, y, LIMON.r[0]);
      else P.px(x, y, (x * 7 + y * 3) % 11 === 0 ? LIMON.r[0] : LIMON.r[1]);
      return;
    }
    const phi = Math.atan2(-v, u);
    if (t > 0.86) P.px(x, y, LIMON.r[0]);
    else if (t > 0.72) P.px(x, y, LIMON.r[2]);
    else if (t < 0.16) P.px(x, y, LIMON.r[2]);
    else {
      let sep = false;
      for (const f0 of [Math.PI / 3, (2 * Math.PI) / 3]) if (Math.abs(phi - f0) * t * rx < 0.75) sep = true;
      P.px(x, y, sep ? LIMON.r[2] : LIMON.r[1]);
    }
  });
}

function torrezmon(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const b = f ? -1 : 0; // frame 1: the hat bounces up and the hand waves the other way

  // Arms first (they sit behind the block's edge): the left one on the hip, the right one waving; cream cartoon gloves.
  const w = f ? 2 : 0;
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const X = (x: number) => (E ? 63 - x : x);
  P.forma(T(trazo([[14, 42], [6, 47]], 3.2, 2.8)), CARNE, { rad: 3 });
  P.forma(T(trazo([[50, 34], [57, 28 - w]], 3.2, 2.8)), CARNE, { rad: 3 });
  P.forma(T(el(5, 49, 3.8, 3.6)), GRASA, { rad: 3 });
  P.px(X(3), 50, GRASA.r[0]);
  P.px(X(5), 51, GRASA.r[0]);
  P.forma(T(el(57.5 + (f ? 1 : 0), 24 - w, 4, 3.8)), GRASA, { rad: 3 });
  P.px(X(56 + (f ? 1 : 0)), 22 - w, GRASA.r[0]);
  P.px(X(58 + (f ? 1 : 0)), 22 - w, GRASA.r[0]);
  P.px(X(55 + (f ? 1 : 0)), 24 - w, GRASA.r[0]);

  // The block, with the bumpy top.
  const base = rr(9, 18, 46, 40, 6);
  const bultos = un(el(14, 18.5, 5.6, 4.2), el(22, 17, 5.6, 4.4), el(31, 16, 5.8, 4.4), el(40, 17, 5.6, 4.4), el(48.5, 18.4, 5.6, 4.2));
  let bloque = un(base, bultos);
  if (E) {
    // The bite: three round scoops out of the lower right corner.
    bloque = men(bloque, un(el(56, 51, 5.4, 4.6), el(51.5, 58.5, 4.4, 3.6), el(57, 42.5, 3.4, 3.4)));
  }
  P.sombra(bloque, 0, 1, 1);
  P.forma(bloque, GRASA, { rad: 5, grad: 0.35 });
  // The crackling (golden skin) with a wavy lower edge.
  const costra = inter(bloque, un(rc(0, 0, 64, 34), el(15, 34, 6, 3), el(26, 34.6, 7, 3.4), el(38, 34.2, 7, 3.2), el(49, 34, 6.5, 3)));
  P.forma(costra, CORTEZA, { rad: 6, grad: 0.4, borde: false });
  // Layers of meat in the belly: each band is a dome of its own, so it gets a dark underside and a light top.
  P.forma(inter(bloque, rc(0, 39, 64, 7)), CARNE, { rad: 2.6, grad: 0.3, borde: false });
  P.forma(inter(bloque, rc(0, 49, 64, 5)), CARNE, { rad: 2.2, grad: 0.3, borde: false });
  // Fat marbling in the meat.
  P.llenarSobre(un(rc(16, 42, 3, 1), rc(35, 43, 4, 1), rc(46, 41, 2, 1), rc(24, 51, 4, 1), rc(41, 51, 3, 1)), GRASA.r[1], CARNE);
  P.llenarSobre(un(rc(26, 40, 2, 1), rc(12, 50, 2, 1)), CARNE.r[0], CARNE);

  // Blisters on the crackling: lighter bubbles with a dark crescent under them and a glint.
  const burbuja = (x: number, y: number, rx: number, ry: number) => {
    P.tono(el(x, y, rx, ry), CORTEZA, 1);
    P.tono(men(el(x, y, rx, ry), el(x, y - 1.2, rx, ry)), CORTEZA, -2);
    P.px(Math.round(x - rx * 0.4), Math.round(y - ry * 0.5), CORTEZA.r[4]);
    P.px(Math.round(x - rx * 0.4) + 1, Math.round(y - ry * 0.5), CORTEZA.r[3]);
  };
  const bs: [number, number, number, number][] = E
    ? [[13, 22, 3.4, 3], [24, 21, 3.6, 3.2], [36, 20, 3.4, 3], [48, 23, 3.6, 3.2], [18, 30, 3.2, 2.8], [31, 28, 3.6, 3.2], [44, 30, 3.2, 2.8], [52, 31, 2.4, 2.2]]
    : [[12, 21, 3, 2.8], [50, 21, 3.2, 3], [11, 30, 2.8, 2.6], [52, 30, 3, 2.8]];
  for (const [x, y, rx, ry] of bs) burbuja(x, y, rx, ry);
  // Grease glints: a streak along the top and little pale specks that move between frames.
  P.llenar(cur([[15, 15], [20, 13.6], [26, 13]], 1), CORTEZA.r[4]);
  P.llenar(cur([[36, 13], [41, 14], [46, 15]], 1), CORTEZA.r[3]);
  P.px(f ? 29 : 31, 19, CORTEZA.r[4]);
  P.px(f ? 52 : 54, 25, CORTEZA.r[4]);
  P.px(f ? 9 : 10, 27, CORTEZA.r[4]);
  // A drip of grease running down the crackling's edge.
  P.llenar(rc(54, 32, 1, 3), CORTEZA.r[3]);

  P.cara(() => {
    // Lazy, blissed-out eyes: heavy lids over big shiny eyes, a pinkish tinge, a content open smile.
    for (const cx of [22, 42]) {
      const ojo = el(cx, 23.6, 5.4, 5.6);
      P.llenar(ojo, GRASA.r[2]);
      P.aro(ojo, TINTA_Z);
      P.llenar(el(cx + (cx < 32 ? 1 : -1) * 0.6, 24.8, 3, 3.4), TINTA_Z);
      P.px(cx - 1, 23, GRASA.r[2]);
      P.px(cx - 1, 24, GRASA.r[2]);
      P.px(cx + 1 + (cx < 32 ? 1 : -1), 26, CARNE.r[2]);
      // Heavy lid: crackling colour over the upper half, with a dark line.
      P.llenar(inter(ojo, rc(cx - 6, 17, 12, 5)), CORTEZA.r[2]);
      P.llenar(rc(cx - 6, 22, 12, 1), TINTA_Z);
      P.llenar(rc(cx - 5, 21, 10, 1), CORTEZA.r[1]);
      // Sleepy pink veins and eye bags.
      P.px(cx + (cx < 32 ? -3 : 3), 25, CARNE.r[2]);
      P.llenar(rc(cx - 3, 29, 6, 1), CARNE.r[2]);
    }
    const boca = inter(el(32, 30.6, 6.6, 4.4), rc(20, 31, 24, 8));
    P.llenar(boca, TINTA_Z);
    P.llenar(rc(27, 31, 10, 1), GRASA.r[2]);
    P.llenar(inter(el(33, 36.4, 3.6, 2.4), boca), CARNE.r[2]);
    P.px(24, 31, TINTA_Z);
    P.px(40, 31, TINTA_Z);
    P.llenar(rc(14, 30, 3, 2), CARNE.r[2]);
    P.llenar(rc(47, 30, 3, 2), CARNE.r[2]);
  });
  P.dorso(() => {
    // From behind: a few salt crystals and a golden crumb trail.
    for (const [x, y] of [[17, 25], [29, 24], [40, 25], [22, 32], [47, 27]] as [number, number][]) P.px(x, y, CORTEZA.r[4]);
    P.px(53, 56, CORTEZA.r[2]);
    P.px(57, 53, CORTEZA.r[3]);
  });

  // The lemon wedge hat, tilted over one ear and bouncing a little.
  gajo(P, E ? 33 : 30, 17 + b, 13, 12, E ? 0.2 : -0.2, E);
  if (!E) {
    P.px(21, 9 + b, LIMON.r[2]);
    P.px(22, 8 + b, LIMON.r[2]);
  }
}

// ---------------------------------------------------------------------------------------------
// Papiroflexeon · a turquoise paper dart in flight, banking in the wind: creases and folded flaps in shades of
// turquoise, big eyes on the nose and gusts curling off the wingtips. The dart is a tiny 3-D model (two wing
// panels and the keel fin) turned and projected here, so the front view (nose coming at you) and the back view
// (tail towards you, nose far away) are really the two sides of the same object, each flat-shaded face by face.
// ---------------------------------------------------------------------------------------------
const TINTA_P = '#04323c';
const PAPEL: Mat = { r: ['#0a6a74', '#14a0a8', '#2cd0c8', '#7ee8dc', '#c8fff4'], ol: TINTA_P, ol2: '#0a6a74' };
const BLANCO_P = '#ffffff';

type V3 = [number, number, number];

function papiroflexeon(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  // Camera: yaw of the dart, elevation of the viewer, bank (roll). Frame 1 banks a bit more and the tips flex.
  const yaw = ((E ? -32 : 165) * Math.PI) / 180;
  const elev = ((E ? 42 : 30) * Math.PI) / 180;
  const roll = ((E ? 1 : 1) * (E ? (f ? 12 : 7) : (f ? 4 : 8)) * Math.PI) / 180;
  const D = E ? 36 : 40; // length
  const W = E ? 28 : 26; // half span
  const h = E ? (f ? 6 : 4) : f ? 14 : 12; // dihedral (wing tips raised)
  const Kd = E ? 12 : 22; // depth of the keel fin
  const N: V3 = [0, 0, 0];
  const C: V3 = [0, -1, D];
  const K: V3 = [0, -Kd, D];
  // Each wing is an inner panel plus a flap folded down along the outer part (the classic dart's second fold).
  const baja = f ? 11 : 9;
  const ML: V3 = [-W * (E ? 0.46 : 1), h, D];
  const MR: V3 = [W * (E ? 0.46 : 1), h, D];
  const A: V3 = [-W, h - baja, D - 3];
  const B: V3 = [W, h - baja, D - 3];
  const lerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // Rotate (yaw about y, then elevation about x, then roll about the view axis).
  const rot = (v: V3): V3 => {
    const cy = Math.cos(yaw),
      sy = Math.sin(yaw);
    let x = v[0] * cy + v[2] * sy;
    let y = v[1];
    let z = -v[0] * sy + v[2] * cy;
    const ce = Math.cos(elev),
      se = Math.sin(elev);
    const y2 = y * ce - z * se;
    const z2 = y * se + z * ce;
    y = y2;
    z = z2;
    const cr = Math.cos(roll),
      sr = Math.sin(roll);
    const x2 = x * cr - y * sr;
    y = x * sr + y * cr;
    x = x2;
    return [x, y, z];
  };
  // Fit the projected model into the canvas once (centre of its bounding box on (32, 33)).
  const pts = [N, A, B, C, K, ML, MR].map(rot);
  const xs = pts.map((p) => p[0]),
    ys = pts.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs),
    hh = Math.max(...ys) - Math.min(...ys);
  const esc = Math.min(58 / w, 54 / hh);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2,
    cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const bob = f ? -1 : 0;
  const pr = (v: V3): [number, number] => {
    const r = rot(v);
    return [32 + (r[0] - cx) * esc, 33 - (r[1] - cy) * esc + bob];
  };
  const prof = (v: V3): number => rot(v)[2];
  const luz: V3 = (() => {
    const l = Math.hypot(-0.55, 0.7, 0.62);
    return [-0.55 / l, 0.7 / l, 0.62 / l];
  })();
  /** Flat step of a face from its normal against the light (two-sided paper). */
  const paso = (a: V3, b: V3, c: V3, bias = 0): number => {
    const ra = rot(a),
      rb = rot(b),
      rc2 = rot(c);
    const u = [rb[0] - ra[0], rb[1] - ra[1], rb[2] - ra[2]];
    const v = [rc2[0] - ra[0], rc2[1] - ra[1], rc2[2] - ra[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    n = n.map((q) => q / l);
    if (n[2] < 0) n = n.map((q) => -q);
    const d = n[0] * luz[0] + n[1] * luz[1] + n[2] * luz[2] + bias;
    return Math.max(0, Math.min(4, Math.round(d * 4.2 - 0.2)));
  };
  const cara3 = (vs: V3[], bias = 0): void => {
    const m = poli(vs.map(pr));
    P.forma(m, PAPEL, { modo: 'plano', paso: paso(vs[0], vs[1], vs[2], bias) });
  };
  const trazo3 = (a: V3, b: V3, col: string): void => {
    const [x0, y0] = pr(a);
    const [x1, y1] = pr(b);
    P.llenar(cur([[x0, y0], [x1, y1]], 1), col);
  };

  // Speed lines trailing behind the dart (drawn first, so the dart covers their starts): dashes that slide along.
  const viento = (desde: V3, col: string, largo: number) => {
    const o = pr(desde);
    const t = pr([desde[0], desde[1], desde[2] + 10]);
    const L = Math.hypot(t[0] - o[0], t[1] - o[1]) || 1;
    const ux = (t[0] - o[0]) / L,
      uy = (t[1] - o[1]) / L;
    for (let d = 3; d < largo; d++) {
      if (((d + (f ? 3 : 0)) % 6) < 3) {
        const x = Math.round(o[0] + ux * d),
          y = Math.round(o[1] + uy * d);
        P.px(x, y, col);
        if (!E) P.px(x, y + 1, col);
      }
    }
  };

  // Painter's order: far faces first.
  type Cara = { d: number; dib: () => void; vs: V3[] };
  const caras: Cara[] = [];
  const cuando = (vs: V3[], dib: () => void) => caras.push({ d: vs.reduce((s2, v) => s2 + prof(v), 0) / vs.length, dib, vs });
  const keel: V3[] = [N, C, K];
  const izq: V3[] = [N, ML, C];
  const der: V3[] = [N, MR, C];
  const aleI: V3[] = [N, A, ML];
  const aleD: V3[] = [N, B, MR];
  cuando(keel, () => cara3(keel, E ? -0.15 : -0.4));
  cuando(izq, () => cara3(izq));
  cuando(der, () => cara3(der));
  if (E) {
    cuando(aleI, () => cara3(aleI, 0.05));
    cuando(aleD, () => cara3(aleD, -0.05));
  }
  caras.sort((a, b) => a.d - b.d);

  viento(A, PAPEL.r[4], 22);
  viento(B, '#ffffff', 20);
  viento(lerp(C, K, 0.6), PAPEL.r[3], 13);
  viento(lerp(A, C, 0.5), PAPEL.r[4], 14);
  const todo = un(...(E ? [keel, izq, der, aleI, aleD] : [keel, izq, der]).map((vs) => poli(vs.map(pr))));
  P.sombra(todo, 1, 2, 1);
  for (const c of caras) c.dib();

  // Creases: the keel line, and a fold parallel to each leading edge (the wing flap).
  trazo3(N, C, PAPEL.r[0]);
  if (!E) {
    // Fold lines parallel to the leading edges (the wing flaps seen from the front).
    trazo3(lerp(N, ML, 0.5), lerp(C, ML, 0.5), PAPEL.r[1]);
    trazo3(lerp(N, MR, 0.5), lerp(C, MR, 0.5), PAPEL.r[0]);
  }

  /** The pixel of a mask furthest from its edge (nearest to `cerca` on a tie): where a big eye fits best. */
  const centro = (m: Mascara, cerca: [number, number]): [number, number, number] => {
    let mejor: [number, number, number] = [-1, -1, 0];
    let puntos = -1e9;
    m.each((x, y) => {
      if ((x | y) & 1) return; // every other pixel is plenty to place an eye
      let d = 9;
      for (let j = -7; j <= 7 && d > 1; j++) for (let i = -7; i <= 7; i++) if (!m.tiene(x + i, y + j)) d = Math.min(d, Math.hypot(i, j) - 0.5);
      const pt = Math.min(d, 6) * 3 - 0.12 * Math.hypot(x - cerca[0], y - cerca[1]);
      if (pt > puntos) {
        puntos = pt;
        mejor = [x + 0.5, y + 0.5, d];
      }
    });
    return mejor;
  };
  P.cara(() => {
    // Eyes on the nose: each panel gets one, as big as its visible part allows; the nearer panel's eye is the bigger.
    const morro = pr(N);
    const visibles = caras.filter((c) => c.vs === izq || c.vs === der).map((c) => {
      let m = poli(c.vs.map(pr));
      for (const o of caras) if (o.d > c.d && o.vs !== keel) m = men(m, poli(o.vs.map(pr)));
      return m;
    });
    for (const [i, m] of visibles.entries()) {
      const [x, y, d] = centro(m, morro);
      if (x < 0) continue;
      const r = Math.max(2.6, Math.min(d - 0.8, 5.2));
      const ojo = el(x, y, r * 0.92, r * 1.08);
      P.llenar(ojo, BLANCO_P);
      P.aro(ojo, TINTA_P);
      P.llenar(el(x + (i ? 0.6 : -0.6), y + r * 0.2, r * 0.55, r * 0.66), TINTA_P);
      P.px(Math.round(x - r * 0.3), Math.round(y - r * 0.2), BLANCO_P);
      P.px(Math.round(x - r * 0.3), Math.round(y + r * 0.1), BLANCO_P);
      P.llenar(inter(ojo, rc(Math.floor(x - 7), Math.floor(y - 7), 14, Math.round(r * 0.55))), PAPEL.r[i ? 2 : 3]);
      P.llenar(cur([[x - r, y - r * 0.5], [x + r, y - r * 0.5]], 1), TINTA_P);
    }
    const [nx, ny] = pr(N);
    const mx = nx + 9,
      my = ny - 3;
    P.llenar(cur([[mx - 2, my - 1], [mx - 1, my + 0.5], [mx + 1, my + 0.5], [mx + 2, my - 1]], 1), PAPEL.r[4]);
  });
  P.dorso(() => {
    // A pencil doodle on the lit wing and a crumpled corner on the other.
    const e1 = pr([-10, h * 0.5, 36]);
    for (const [dx, dy] of [[0, -2], [-2, 0], [2, 0], [-1, 2], [1, 2], [0, 0]] as [number, number][]) P.px(Math.round(e1[0] + dx), Math.round(e1[1] + dy), PAPEL.r[1]);
    trazo3([-16, h * 0.7, 40], [-13, h * 0.7, 44], PAPEL.r[1]);
    trazo3([13, h * 0.7, 40], [16, h * 0.7, 44], PAPEL.r[0]);
  });
}

// ---------------------------------------------------------------------------------------------
// Ceceseta · a short-sleeved white T-shirt that has been to the party: the sleeves are its arms (raised in a cheer,
// one holding a little glass of beer), a red ribbed collar with the face just under it, the band's print on the chest
// (a little truck pulling a caravan, in pixels) and a beer stain with foam on the hem. From behind: the nape label,
// the tour-dates list and the stain on the other side.
// ---------------------------------------------------------------------------------------------
const TINTA_S = '#3a3252';
const CAMISETA: Mat = { r: ['#9aa0c8', '#c9cee8', '#eef0fa', '#ffffff'], ol: TINTA_S, ol2: '#8a90b8' };
const CUELLO: Mat = { r: ['#9a1c1c', '#d8382c', '#f06a50'], ol: TINTA_S, ol2: '#9a1c1c' };
const INTERIOR_S = '#5a5280';
const AZUL_S = '#2f62cf';
const AZUL_CL = '#8fd8ff';
const AMARILLO_S = '#ffc83a';
const AMBAR_S = '#e0a020';
const AMBAR_CL = '#f6d060';
const CARRILLO = '#ff8fa0';

function ceceseta(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const dy = f ? -1 : 0; // the shirt bobs to the beat
  // Arms (sleeves) swap heights between frames: a cheer, then the other arm up (the right one holds the glass).
  const yi = f ? 20 : 13; // left sleeve end
  const yd = f ? 13 : 20; // right sleeve end

  const manga = (lado: number, yf: number): void => {
    const X = (x: number) => (lado ? 63 - x : x);
    const brazo = un(trazo([[X(18), 21 + dy], [X(8.4), yf + dy]], 6.6, 5.8), el(X(18), 24 + dy, 5, 5));
    P.forma(T(brazo), CAMISETA, { rad: 4.8, grad: 0.35 });
    // The sleeve opening: a dark ring (the inside of the sleeve) with a cuff stitch.
    const abertura = el(X(7.6), yf + dy - 0.6, 4.7, 3.5);
    P.llenar(T(abertura), INTERIOR_S);
    P.aro(T(abertura), CAMISETA.r[0]);
    P.llenar(T(inter(abertura, rc(Math.floor(X(7.6)) - 6, Math.floor(yf + dy - 0.6) - 4, 12, 3))), TINTA_S);
  };
  // The little glass of beer cheered by the right sleeve.
  const copa = (): void => {
    const x = 53;
    const y = yd + dy - 11;
    const espuma = f ? 1 : 0;
    P.forma(T(rr(x, y, 7, 9, 1.5)), CAMISETA, { rad: 2.4, grad: 0.2 });
    P.llenar(T(rc(x + 1, y + 3, 5, 5)), AMBAR_S);
    P.llenar(T(rc(x + 1, y + 3, 1, 4)), AMBAR_CL);
    P.llenar(T(rc(x, y, 7, 3)), CAMISETA.r[3]);
    P.px(TX(x + 2), y - 1, CAMISETA.r[3]);
    P.px(TX(x + 5 - espuma), y - 1, CAMISETA.r[3]);
    P.px(TX(x + 6), y + 3 + espuma, CAMISETA.r[3]);
    P.px(TX(x + 4), y + 1, CAMISETA.r[2]);
  };
  manga(0, yi);
  manga(1, yd);

  // The torso.
  const torso = un(poli([[22, 12 + dy], [42, 12 + dy], [49, 21 + dy], [51, 53 + dy], [13, 53 + dy], [15, 21 + dy]]), el(32, 53 + dy, 19.4, 3));
  P.sombra(torso, 0, 1, 1);
  P.forma(torso, CAMISETA, { rad: 7, grad: 0.4 });
  // Folds: soft shading under the arms and down the sides.
  P.tono(el(17, 30 + dy, 3, 8), CAMISETA, -1);
  P.tono(el(47, 34 + dy, 3, 9), CAMISETA, -1);
  P.tono(cur([[24, 47 + dy], [27, 54 + dy]], 1), CAMISETA, -1);
  P.tono(cur([[39, 45 + dy], [37, 54 + dy]], 1), CAMISETA, -1);
  P.llenar(rc(14, 51 + dy, 37, 1), CAMISETA.r[1]); // hem stitch
  P.llenar(rc(14, 52 + dy, 37, 1), CAMISETA.r[2]);

  // The ribbed red collar and the dark inside of the neck.
  const collar = el(32, 12.8 + dy, 9, 4.4);
  P.forma(collar, CUELLO, { rad: 3, grad: 0.3 });
  if (!E) {
    P.llenar(el(32, 12.2 + dy, 6.4, 2.6), INTERIOR_S);
    P.llenar(inter(el(32, 11.8 + dy, 6.4, 2.6), rc(20, 8 + dy, 24, 3)), TINTA_S);
  } else {
    P.llenar(inter(el(32, 11 + dy, 6.2, 2), rc(20, 8 + dy, 24, 4)), INTERIOR_S);
  }
  for (let x = 25; x <= 39; x += 2) P.px(x, 16 + dy, CUELLO.r[0]);

  // The beer stain on the hem (with foam).
  const mancha = (cx: number, cy: number) => {
    const m = un(el(cx, cy, 5, 2.6), el(cx - 3, cy + 1.4, 2.6, 2), el(cx + 3.4, cy - 1.2, 2.4, 1.8));
    P.llenarSobre(m, AMBAR_S, CAMISETA);
    P.llenarSobre(inter(m, el(cx - 1, cy - 0.5, 3, 1.2)), AMBAR_CL, CAMISETA);
    P.px(Math.round(cx) - 4, Math.round(cy) - 1, CAMISETA.r[3]);
    P.px(Math.round(cx) + 1, Math.round(cy) + 1, CAMISETA.r[3]);
    P.px(Math.round(cx) + 5, Math.round(cy) + 2, AMBAR_S);
  };

  P.cara(() => {
    // Print: a little caravan pulled by a little truck, in pixels, with a scribbled «text» line under them.
    const leyenda: Record<string, string> = { R: CUELLO.r[1], r: CUELLO.r[0], B: AZUL_S, L: AZUL_CL, Y: AMARILLO_S, K: TINTA_S };
    P.est(19, 38 + dy, [
      '..BBBBBBB....rrrrrrr.....',
      '.BBBBBBBBB...RRRRRRR.RRR.',
      'BBLLBBLLBBB..RRRRRRRRRLLR',
      'BBLLBBLLBBB..RRRRRRRRRLLR',
      'BBBBBBBBBBBKKRRRRRRRRRRRR',
      'YYYYYYYYYYY..YYYYYYYYYYYY',
      'BBBBBBBBBBB..RRRRRRRRRRRR',
      '.KK.....KK....KK..KK.KK..',
    ], leyenda);
    P.llenar(rc(21, 47 + dy, 14, 1), CUELLO.r[0]);
    P.llenar(rc(37, 47 + dy, 7, 1), CUELLO.r[0]);
    mancha(41, 50 + dy);
    // The face under the collar: big eyes, rosy cheeks, a wide goofy grin; a brow up, a brow down.
    const fy = -4 + dy;
    for (const [cx, izq] of [[24.5, true], [39.5, false]] as [number, boolean][]) {
      if (f && !izq) {
        P.llenar(cur([[cx - 3, 29.5 + fy], [cx, 27 + fy], [cx + 3, 29.5 + fy]], 1), TINTA_S);
        continue;
      }
      const ojo = el(cx, 28.6 + fy, 3.2, 4);
      P.llenar(ojo, TINTA_S);
      P.px(Math.round(cx) - 1, 26 + fy, CAMISETA.r[3]);
      P.px(Math.round(cx) - 1, 27 + fy, CAMISETA.r[3]);
      P.px(Math.round(cx) + 1, 30 + fy, CAMISETA.r[0]);
    }
    P.llenar(cur([[21, 22 + fy], [24.5, 23 + fy], [28, 24 + fy]], 1), TINTA_S);
    P.llenar(cur([[36, 24 + fy], [39.5, 21.6 + fy], [43, 22.6 + fy]], 1), TINTA_S);
    P.llenar(rc(18, 32 + fy, 4, 3), CARRILLO);
    P.llenar(rc(42, 32 + fy, 4, 3), CARRILLO);
    const boca = inter(el(32, 34.4 + fy, 6.6, 5), rc(20, 35 + fy, 24, 8));
    P.llenar(boca, TINTA_S);
    P.llenar(rc(27, 35 + fy, 10, 1), CAMISETA.r[3]);
    P.llenar(inter(el(33, 40 + fy, 3.4, 2.2), boca), CARRILLO);
    P.px(25, 35 + fy, TINTA_S);
    P.px(39, 35 + fy, TINTA_S);
  });
  P.dorso(() => {
    // Nape label.
    P.forma(rr(29, 16 + dy, 6, 5, 1), CAMISETA, { modo: 'plano', paso: 3, rad: 1 });
    P.px(30, 18 + dy, TINTA_S);
    P.px(32, 18 + dy, TINTA_S);
    P.px(33, 19 + dy, TINTA_S);
    P.px(31, 19 + dy, TINTA_S);
    // Tour-dates print: a red header bar and rows of dashes (no legible letters).
    P.llenar(rc(21, 24 + dy, 22, 4), CUELLO.r[1]);
    P.llenar(rc(23, 25 + dy, 18, 1), CAMISETA.r[3]);
    P.llenar(rc(21, 27 + dy, 22, 1), CUELLO.r[0]);
    const filas: [number, number][] = [[21, 15], [21, 19], [21, 12], [21, 17]];
    filas.forEach(([x, w], i) => {
      const y = 31 + i * 3 + dy;
      P.llenar(rc(x, y, w, 1), TINTA_S);
      if (w < 18) {
        P.llenar(rc(x + w + 2, y, 3, 1), AZUL_S);
        P.px(x + w + 6, y, AMARILLO_S);
      }
    });
    mancha(24, 50 + dy);
  });
  copa();
}

export const LOTE_E: Dibujo2[] = [{ id: 'maletrio', nombre: 'Maletrio', dibujar: maletrio },
  { id: 'teloneon', nombre: 'Teloneon', dibujar: teloneon },
  { id: 'choquechu', nombre: 'Choquechu', dibujar: choquechu },
  { id: 'torrezmon', nombre: 'Torrezmón', dibujar: torrezmon },
  { id: 'papiroflexeon', nombre: 'Papiroflexeon', dibujar: papiroflexeon },
  { id: 'ceceseta', nombre: 'Ceceseta', dibujar: ceceseta },
];
