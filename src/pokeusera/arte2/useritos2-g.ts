// PokéUsera · Edición Jarra (arte v2): batch g of the 64×64 useritos (same conventions as useritos2.ts).
// Cilantrox, Fotomatón, Cloudtrio, Cigarr and OllaLocah.
import type { Dibujo2 } from './useritos2';
import { Mascara, Pintor, bez3, cur, el, espejo, inter, men, poli, rc, rr, trazo, un, type Mat } from './pintor';

// ---------------------------------------------------------------------------------------------
// Cilantrox · a slim sprig of coriander: a thin elegant stem with a few rootlets, three flat serrated leaves
// with veins and a sly pair of eyes on each (one winks), a tiny party hat on the middle one, a small pennant
// garland on the stem and some confetti. Frame 1: stem and leaves sway. From behind: darker leaves with veins.
// ---------------------------------------------------------------------------------------------
const INK_C = '#0e2a18';
const VERDE: Mat = { r: ['#1c5a2a', '#2e8a38', '#58b842', '#a6e266'], ol: INK_C, ol2: '#1c5a2a' };
const GORRO: Mat = { r: ['#9a1a68', '#e03a9a', '#ff86c8'], ol: INK_C, ol2: '#9a1a68' };
const AMARILLO = '#ffd84a';
const BLANCO = '#ffffff';

function cilantrox(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: ReturnType<typeof rc>) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const sw = f ? 0.12 : -0.04; // leaf sway (radians)
  const sx = f ? 1.5 : -0.5; // the top of the stem leans with it

  // Rootlets under the foot.
  for (const [x, w] of [[28, -3], [31, -1], [34, 1], [37, 3]] as [number, number][]) {
    P.llenar(T(cur([[x + (x < 32 ? 1 : -1), 58.5], [x + w, 62.5]], 1)), '#d8c8a0');
  }

  // Confetti and the stem (behind the leaves).
  const conf: [number, number, string][] = [[8, 9, GORRO.r[2]], [55, 10, AMARILLO], [14, 17, BLANCO], [51, 19, GORRO.r[2]], [4, 36, AMARILLO], [59, 33, VERDE.r[3]], [22, 6, AMARILLO], [44, 5, BLANCO]];
  for (const [x, y, c] of conf) P.px(TX(x), y + (f ? 1 : 0), c);
  const tallo = bez3([32, 59], [29, 53], [35 + sx, 47], [32 + sx, 40], 14);
  P.sombra(T(trazo(tallo, 1.4, 1)), 0, 1, 1);
  P.forma(T(trazo(tallo, 1.4, 1)), VERDE, { rad: 2, grad: 0.3, paso: 2 });

  // A flat serrated leaf: `ang` points to the tip, `L` long, `W` wide.
  const hoja = (bx: number, by: number, ang: number, L: number, W: number): Mascara => {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const pt = (u: number, v: number): [number, number] => [bx + u * ca - v * sa, by + u * sa + v * ca];
    const lado: [number, number][] = [];
    const N = 30;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const env = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.75);
      const ond = Math.abs(Math.sin(Math.PI * t * 3.5 + 0.2));
      lado.push([t * L, (W / 2) * env * (0.5 + 0.5 * ond)]);
    }
    const pts = [...lado.map(([u, v]) => pt(u, v)), ...lado.reverse().map(([u, v]) => pt(u, -v))];
    return poli(pts);
  };
  const dibujaHoja = (bx: number, by: number, ang: number, L: number, W: number, ojos: number): void => {
    const m = hoja(bx, by, ang, L, W);
    P.sombra(T(m), 0, 1, 1);
    P.forma(T(m), VERDE, { rad: 3, grad: 0.35, sesgo: 0.05 });
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const pt = (u: number, v: number): [number, number] => [bx + u * ca - v * sa, by + u * sa + v * ca];
    // Midrib and side veins.
    P.llenarSobre(T(cur([pt(1, 0), pt(L * 0.9, 0)], 1)), VERDE.r[E ? 3 : 1], VERDE);
    for (const t of [0.28, 0.5, 0.7]) {
      for (const s of [-1, 1]) {
        P.llenarSobre(T(cur([pt(L * t, 0), pt(L * (t + 0.16), s * W * 0.34)], 1)), VERDE.r[E ? 3 : 2], VERDE);
      }
    }
    if (E) return;
    // Sly eyes on the leaf (mid-way along it): `ojos` = 0 both open, 1 wink on the right one.
    const [ex, ey] = pt(L * 0.52, 0);
    const sep = 3.4;
    for (const s of [-1, 1]) {
      const cx = Math.round(ex + s * sep);
      const cy = Math.round(ey);
      if (ojos === 1 && s > 0) {
        P.llenar(cur([[cx - 2, cy - 1], [cx + 1, cy + 1], [cx + 3, cy - 1]], 1), INK_C);
        continue;
      }
      const o = el(cx + 0.5, cy + 0.5, 2.5, 2.4);
      P.aro(o, INK_C);
      P.llenar(o, BLANCO);
      P.px(cx + (f ? 0 : 1), cy + 1, INK_C);
      P.px(cx + (f ? 0 : 1) + 1, cy + 1, INK_C);
      P.llenar(inter(rc(cx - 2, cy - 2, 6, 2), o), VERDE.r[1]); // heavy lid: a sly look
      P.llenar(cur([[cx - 2, cy - 0.5], [cx + 3, cy - 0.5]], 1), INK_C);
    }
  };

  // Petioles, side leaves first and the middle one in front.
  const bases: [number, number, number, number, number][] = [
    [24 + sx * 0.4, 38, -2.4 + sw, 25, 17],
    [40 + sx * 0.4, 38, -0.74 + sw, 25, 17],
  ];
  for (const [x, y] of bases) P.forma(T(trazo([[32 + sx * 0.6, 42], [x, y + 0.5]], 1, 0.9)), VERDE, { rad: 1, paso: 2 });
  P.forma(T(trazo([[32 + sx * 0.6, 42], [32 + sx, 34]], 1, 1)), VERDE, { rad: 1, paso: 2 });
  dibujaHoja(bases[0][0], bases[0][1], bases[0][2], 25, 17, 0);
  dibujaHoja(bases[1][0], bases[1][1], bases[1][2], 25, 17, 1);
  dibujaHoja(32 + sx, 36, -Math.PI / 2 + sw * 0.6, 27, 20, 0);
  if (E) P.tono(rc(0, 0, 64, 44), VERDE, -1);

  // Small pennant garland on the stem.
  const cuerda = bez3([27, 52], [29, 54.5], [35, 54.5], [37, 52], 12);
  P.llenar(cur(cuerda, 1), INK_C);
  const cols = [AMARILLO, GORRO.r[2], BLANCO, AMARILLO];
  [2, 4, 6, 8, 10].forEach((k, i) => {
    const [x, y] = cuerda[k];
    const X = Math.round(x);
    const Y = Math.round(y);
    const c = cols[i % 4];
    P.px(X, Y + 1, c);
    P.px(X + 1, Y + 1, c);
    P.px(X, Y + 2, GORRO.r[0]);
  });
}

// ---------------------------------------------------------------------------------------------
// Fotomatón · the street photo booth: a wide blue cabin with two angry flash-window eyes on its sign, a red
// curtain half drawn over the dark inside, a lamp on top and, in the slot on the right, a strip of four
// photos. Frame 1: the lamp flashes and the strip drops a little. From behind: louvres, a service hatch and
// the power cable.
// ---------------------------------------------------------------------------------------------
const INK_F = '#0e1424';
const AZUL: Mat = { r: ['#2a3a5c', '#4a6a96', '#7a9ac4', '#b0cae8'], ol: INK_F, ol2: '#2a3a5c' };
const ROJO: Mat = { r: ['#7c0c1c', '#d4202e', '#ff5a4a'], ol: INK_F, ol2: '#7c0c1c' };
const LUZ = '#ffd84a';
const LUZ2 = '#fff4b0';

function fotomaton(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const dy = 0;

  // Plinth.
  P.forma(rc(8, 58, 48, 4), AZUL, { rad: 2, paso: 0 });
  // Roof, body.
  const techo = rr(4, 5, 56, 8, 3);
  const cab = rr(7, 12, 50, 47, 3);
  P.sombra(cab, 0, 1, 1);
  P.forma(cab, AZUL, { rad: 5, grad: 0.3 });
  P.forma(techo, AZUL, { rad: 3, grad: 0.4, sesgo: 0.1 });
  // Lamp on top.
  P.forma(inter(el(32, 6, 6, 4.5), rc(0, 0, 64, 5)), { r: ['#c88a10', LUZ, LUZ2], ol: INK_F, ol2: '#c88a10' }, { rad: 3 });
  if (f) {
    // Flash rays.
    for (const [x, y] of [[22, 2], [20, 5], [42, 2], [44, 5], [32, 0]] as [number, number][]) {
      P.px(x, y, LUZ2);
      P.px(x + (x < 32 ? -1 : 1), y, LUZ);
    }
  }

  // Sign panel.
  const panel = rr(10, 15, 44, 15, 3);
  P.forma(panel, AZUL, { rad: 3, paso: 1, borde: true });
  P.cara(() => {
    // Two angry flash-window eyes.
    for (const lado of [0, 1]) {
      const X = (x: number) => (lado ? 63 - x : x);
      const cx = X(21);
      const ojo = el(cx + 0.5, 23, 6, 5.4);
      P.aro(ojo, INK_F);
      P.llenar(ojo, f ? LUZ2 : '#ffffff');
      P.llenar(inter(el(X(24), 24, 2.6, 3), ojo), INK_F);
      P.px(X(23), 23, '#ffffff');
      // Heavy angry brow, slanting down towards the middle.
      P.llenar(poli([[X(14), 16], [X(28.5), 22.5], [X(28.5), 17], [X(14), 15]]), INK_F);
      P.llenar(cur([[X(14), 19], [X(27), 25.5]], 1), AZUL.r[1]);
      P.llenar(inter(poli([[X(14), 17], [X(28), 24], [X(28), 28], [X(14), 28]]), ojo), AZUL.r[0]);
    }
    // A tight grille for a mouth.
    P.llenar(rc(26, 26, 12, 2), INK_F);
    for (let x = 27; x < 38; x += 2) P.px(x, 26, AZUL.r[2]);
  });
  P.dorso(() => {
    // Louvres.
    for (let y = 18; y < 28; y += 3) {
      P.llenar(rc(14, y, 36, 2), INK_F);
      P.llenar(rc(14, y, 36, 1), AZUL.r[0]);
    }
  });

  if (!E) {
    // Dark inside, curtain rod and the half-drawn red curtain.
    const hueco = rc(11, 33, 28, 25);
    P.forma(hueco, { r: [INK_F, INK_F, '#1c2640'], ol: INK_F, ol2: INK_F }, { paso: 0, borde: false });
    // A little stool seat inside.
    P.forma(rr(13, 52, 11, 4, 2), ROJO, { rad: 2, borde: true });
    // Curtain: gathered folds, scalloped hem.
    const cort = poli([[19, 34], [39, 34], [39, 53], [35, 54.5], [31, 53], [27, 55], [23, 53.5], [19, 52]]);
    P.sombra(cort, 1, 0, 1);
    P.forma(cort, ROJO, { rad: 4, grad: 0.3, modo: 'plano', paso: 1 });
    for (const x of [22, 26, 30, 34, 38]) {
      P.llenar(inter(rc(x, 34, 1, 21), cort), ROJO.r[0]);
      P.llenar(inter(rc(x - 2, 34, 1, 21), cort), ROJO.r[2]);
    }
    // Gathered bunch on the left edge, rod and rings.
    P.llenar(rc(11, 33, 28, 1), '#c8a050');
    for (let x = 14; x < 38; x += 4) P.px(x, 34, LUZ);
    // The shoes peeking under the curtain.
    P.llenar(rc(14, 57, 4, 1), '#ffffff');
  }
  if (E) {
    // Service hatch with a lock and a handle.
    P.forma(rr(14, 35, 28, 21, 2), AZUL, { rad: 3, paso: 1, borde: true });
    P.forma(rr(16, 37, 24, 17, 1), AZUL, { rad: 3, paso: 2, borde: 'suave' });
    P.forma(el(37, 46, 1.8, 3), ROJO, { rad: 2, paso: 1 });
    P.px(36, 45, ROJO.r[2]);
    P.llenar(rc(20, 41, 12, 1), AZUL.r[1]);
    P.llenar(rc(20, 46, 8, 1), AZUL.r[1]);
  }

  // Right panel: coin slot, button and the photo slot.
  const caja = rr(41, 32, 14, 26, 2);
  P.forma(caja, AZUL, { rad: 3, paso: 1, borde: true });
  if (!E) {
    P.llenar(rc(43, 34, 10, 2), INK_F);
    P.px(44, 34, LUZ);
    P.px(45, 34, LUZ);
    // Strip of four photos coming out of the slot.
    const sy = 36 + (f ? 1 : 0);
    for (let i = 0; i < 4; i++) {
      const y = sy + i * 5.5;
      const yy = Math.round(y);
      P.llenar(rc(44, yy, 8, 5), '#ffffff');
      P.llenar(rc(45, yy + 1, 6, 3), AZUL.r[1]);
      P.px(47 + (i % 2), yy + 2, '#ffbc86');
      P.px(48 + (i % 2), yy + 2, '#ffbc86');
      P.px(46 + (i % 3), yy + 1, i === 3 ? LUZ : AZUL.r[2]);
      P.llenar(rc(44, yy + 4, 8, 1), '#c8d4e8');
    }
    P.aro(rc(44, sy, 8, 21), INK_F);
  }
  if (E) {
    // Power cable and a plate.
    P.llenar(cur(bez3([48, 58], [52, 62], [58, 58], [61, 62], 12), 1), INK_F);
    P.llenar(rc(46, 38, 6, 3), AZUL.r[2]);
    P.llenar(rc(46, 44, 6, 1), AZUL.r[0]);
    P.llenar(rc(46, 48, 6, 1), AZUL.r[0]);
  }
  void men;
  void dy;
}

// ---------------------------------------------------------------------------------------------
// Cloudtrio · three plush white clouds hanging by thin threads (a big one in the middle, a small one top right
// and a medium one lower left), each with a vacant, silly face: huge empty eyes looking different ways and a
// slack open mouth with the tongue out and a drop of drool.
// Frame 1: they sway a little . From behind: faceless, stitched backs, threads and the tag.
// ---------------------------------------------------------------------------------------------
const INK_N = '#3a3450';
const CREMA: Mat = { r: ['#a2a8c8', '#c8cee6', '#e6eaf8', '#ffffff'], ol: '#5c6286', ol2: '#9aa2c4' };
const HILO = '#7c84a4';
const RUBOR = '#f4b4c8';
const LENGUA_N = '#f07890';
const BABA = '#b8e0ff';

function cloudtrio(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: ReturnType<typeof rc>) => (E ? espejo(m) : m);
  // Per cloud sway: [dx, dy] in frame 1.
  const a = f ? [-1, 1] : [0, 0];
  const b = f ? [1, -1] : [0, 0];
  const c = f ? [-1, -1] : [0, 0];

  const hilo = (x0: number, x1: number, y1: number): void => {
    P.llenar(T(cur([[x0, 0], [x1, y1]], 1)), HILO);
  };
  // A classic cloud: three round bumps over a flatter base. (cx, by) = centre / bottom, w wide, h tall.
  const nube = (cx: number, by: number, w: number, h: number): ReturnType<typeof rc> => {
    const base = rr(cx - w / 2, by - h * 0.5, w, h * 0.5, h * 0.25);
    return un(
      base,
      el(cx - w * 0.25, by - h * 0.5, w * 0.2, h * 0.36),
      el(cx + w * 0.02, by - h * 0.56, w * 0.25, h * 0.46),
      el(cx + w * 0.3, by - h * 0.46, w * 0.18, h * 0.33),
    );
  };
  // Silly face centred at (cx, cy): `r` eye radius, pupils look somewhere different each.
  const cara = (cx: number, cy: number, r: number, mir: [number, number][]): void => {
    if (E) return;
    const sep = r + 1.6;
    [-1, 1].forEach((s, i) => {
      const o = el(cx + s * sep, cy, r, r);
      P.aro(o, INK_N);
      P.llenar(o, '#ffffff');
      const [px, py] = mir[i];
      P.llenar(inter(el(cx + s * sep + px, cy + py, 1.1, 1.1), o), INK_N);
      P.px(Math.round(cx + s * (sep + r + 1.5)), Math.round(cy + r), RUBOR);
    });
    // Slack open mouth, tongue out and a drop of drool.
    const mx = Math.round(cx);
    const my = Math.round(cy + r + 2.5);
    P.llenar(rc(mx - 2, my, 5, 3), INK_N);
    P.llenar(rc(mx - 1, my + 1, 3, 3), LENGUA_N);
    P.px(mx, my + 4, LENGUA_N);
    P.px(mx + 3, my + 3, BABA);
    P.px(mx + 3, my + 4, BABA);
  };
  const cuerpo = (m: ReturnType<typeof rc>): void => {
    P.sombra(T(m), 0, 2, 1);
    P.forma(T(m), CREMA, { rad: 6, grad: 0.4 });
  };

  // Threads first (behind).
  hilo(47, 46 + b[0], 6 + b[1]);
  hilo(28, 28 + a[0], 21 + a[1]);
  hilo(8, 9 + c[0], 45 + c[1]);

  // Small cloud, top right.
  {
    const [dx, dy] = b;
    cuerpo(nube(47 + dx, 22 + dy, 24, 17));
    P.llenarSobre(T(cur([[38 + dx, 21.5 + dy], [47 + dx, 22.5 + dy], [56 + dx, 21.5 + dy]], 1)), CREMA.r[1], CREMA);
    cara(47 + dx, 15 + dy, 2.4, [[1, -1], [-1, 0.5]]);
  }
  // Big cloud in the middle.
  {
    const [dx, dy] = a;
    cuerpo(nube(28 + dx, 41 + dy, 31, 21));
    P.llenarSobre(T(cur([[15 + dx, 40 + dy], [28 + dx, 41 + dy], [42 + dx, 40 + dy]], 1)), CREMA.r[1], CREMA);
    cara(28 + dx, 32 + dy, 3, [[-1, -1], [1.2, 0.8]]);
  }
  // Medium cloud, lower left.
  {
    const [dx, dy] = c;
    cuerpo(nube(20 + dx, 61 + dy, 27, 18));
    P.llenarSobre(T(cur([[8 + dx, 60 + dy], [20 + dx, 61 + dy], [32 + dx, 60 + dy]], 1)), CREMA.r[1], CREMA);
    cara(20 + dx, 53 + dy, 2.7, [[0, -1.3], [1, 1]]);
  }

  // Stitched seams on the backs.
  P.dorso(() => {
    for (const [x, y] of [[42, 15], [46, 13], [50, 14], [24, 32], [28, 30], [32, 32], [16, 54], [20, 52], [24, 54]] as [number, number][]) P.px(x, y, CREMA.r[0]);
  });
}

// ---------------------------------------------------------------------------------------------
// Cigarr · a roll-up cigarette standing on its cardboard filter: crumpled white paper, an ash ring and a glowing
// ember, a smug face, one arm on his hip and a finger up. Frame 1: the smoke curls the other way. From behind:
// the paper's glued seam and creases, the filter, the ember and the smoke.
// ---------------------------------------------------------------------------------------------
const INK_G = '#2e2a3c';
const PAPEL: Mat = { r: ['#9a98b0', '#c8c6d8', '#ecebf4', '#ffffff'], ol: INK_G, ol2: '#6a687e' };
const FILTRO: Mat = { r: ['#8a5a2a', '#c48a4a', '#e8b878'], ol: '#3a2410', ol2: '#8a5a2a' };
const BRASA: Mat = { r: ['#b02a10', '#f06a10', '#ffc030'], ol: '#3a2410', ol2: '#b02a10' };
const CENIZA = '#6a687e';
const HUMO: Mat = { r: ['#9a98b0', '#c8c6d8', '#ecebf4'], ol: '#9a98b0', ol2: '#c8c6d8' };

function cigarr(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: ReturnType<typeof rc>) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const dy = f ? -1 : 0;

  // Smoke (behind everything).
  const humoPts: [number, number][] = f ? [[33, 14], [37, 10], [32, 6], [36, 2]] : [[32, 14], [28, 10], [33, 6], [29, 2]];
  const hr = [3, 3.8, 4.2, 3.6];
  const humo = un(...humoPts.map(([x, y], i) => el(x, y, hr[i], hr[i])), trazo(humoPts, 2.2, 3));
  P.forma(T(humo), HUMO, { rad: 3, borde: 'suave', grad: 0.4 });
  // A couple of tiny sparks.
  P.px(TX(f ? 41 : 24), f ? 14 : 16, BRASA.r[2]);
  P.px(TX(f ? 24 : 40), f ? 18 : 12, BRASA.r[1]);

  // Filter (the base): a rolled strip of cardboard.
  const filtro = rr(21, 47, 22, 14, 3);
  P.sombra(filtro, 0, 1, 1);
  P.forma(filtro, FILTRO, { rad: 4, grad: 0.35, modo: 'cil', eje: 32, semi: 11 });
  for (const x of [25, 29, 33, 37, 40]) P.llenarSobre(rc(x, 48, 1, 12), FILTRO.r[0], FILTRO);
  P.llenar(rc(24, 59, 16, 1), FILTRO.r[0]);

  // Paper body.
  const cuerpo = un(trazo([[32, 48 + dy], [32.5, 27 + dy]], 10.2, 9.6), el(32.5, 27 + dy, 9.6, 3.2));
  P.sombra(cuerpo, 0, 1, 1);
  P.forma(cuerpo, PAPEL, { rad: 6, grad: 0.35, modo: 'cil', eje: 32, semi: 10 });
  // Crumples: diagonal creases and a few folds.
  for (const [x0, y0, x1, y1] of [[24, 31, 27, 34], [38, 36, 41, 39], [25, 44, 28, 46], [37, 29, 40, 31], [39, 45, 41, 48]] as number[][]) {
    P.llenarSobre(T(cur([[x0, y0 + dy], [x1, y1 + dy]], 1)), PAPEL.r[0], PAPEL);
  }
  P.llenarSobre(cur([[24, 38 + dy], [26, 40 + dy]], 1), PAPEL.r[1], PAPEL);
  // The ring where the paper meets the filter.
  P.llenarSobre(rc(21, 46 + dy, 22, 1), PAPEL.r[0], PAPEL);

  // Ash ring and ember on top.
  const ceniza = el(32.5, 23.5 + dy, 9.8, 4);
  P.forma(ceniza, { r: [CENIZA, '#9a98b0', '#c8c6d8'], ol: INK_G, ol2: CENIZA }, { rad: 3, borde: true });
  for (const x of [26, 30, 35, 38]) P.px(x, 22 + dy, CENIZA);
  const brasa = el(32.5, 21 + dy, 8, 3.8);
  P.forma(brasa, BRASA, { rad: 3, grad: 0.3, sesgo: 0.2 });
  P.px(31, 20 + dy, BRASA.r[2]);
  P.px(32, 20 + dy, BRASA.r[2]);
  P.px(35, 21 + dy, BRASA.r[2]);
  P.px(29, 22 + dy, BRASA.r[0]);

  // Arms: left on the hip, right with a finger up.
  const hip = trazo([[22, 36 + dy], [14, 40 + dy], [20, 45 + dy]], 2.4, 2.4);
  P.forma(T(hip), PAPEL, { rad: 2, grad: 0.3 });
  const alto = trazo([[42, 38 + dy], [49, 35 + dy], [49, 29 + dy]], 2.4, 2.2);
  P.forma(T(alto), PAPEL, { rad: 2, grad: 0.3 });
  P.llenar(T(rc(48, 24 + dy, 2, 5)), PAPEL.r[2]);
  P.aro(T(rc(48, 24 + dy, 2, 5)), INK_G);

  P.cara(() => {
    // Smug: heavy half-closed lids, eyes glancing sideways, one brow up and a lopsided smirk.
    for (const cx of [27.5, 37.5]) {
      const ojo = el(cx, 33 + dy, 3.4, 3);
      P.aro(ojo, INK_G);
      P.llenar(ojo, '#ffffff');
      P.llenar(inter(el(cx + 1.2, 34.5 + dy, 1.6, 1.8), ojo), INK_G);
      P.llenar(inter(rc(cx - 4, 30 + dy, 9, 3), ojo), PAPEL.r[1]);
      P.llenar(cur([[cx - 3.5, 32.5 + dy], [cx + 3.5, 32.5 + dy]], 1), INK_G);
    }
    P.llenar(cur([[23.5, 28.5 + dy], [27, 27.5 + dy], [31, 29 + dy]], 1), INK_G);
    P.llenar(cur([[34, 28 + dy], [38, 26 + dy], [42, 27.5 + dy]], 1), INK_G);
    P.llenar(cur([[27, 41 + dy], [32, 43 + dy], [37, 40 + dy]], 1), INK_G);
    P.px(38, 39 + dy, INK_G);
    P.px(39, 38 + dy, INK_G);
    P.px(26, 40 + dy, INK_G);
  });
  P.dorso(() => {
    // Glued seam down the back with a lick of glue.
    P.llenar(cur([[32, 27 + dy], [33, 49 + dy]], 1), PAPEL.r[0]);
    P.llenar(cur([[30, 28 + dy], [31, 48 + dy]], 1), PAPEL.r[3]);
    for (let y = 31; y < 48; y += 4) P.px(34, y + dy, PAPEL.r[1]);
  });
}

// ---------------------------------------------------------------------------------------------
// OllaLocah · the «olla loca» fairground ride as a big red cauldron: a string of lights round the rim, a
// manic face with bulging eyes and a toothy grin, the lid flying off and three screaming riders poking out.
// Frame 1: the lid flips higher, the riders jump and the shine and the bulbs have moved on. From behind: the
// riders' hair, the ride's hatch with a sun, the bulbs and the lid.
// ---------------------------------------------------------------------------------------------
const INK_O = '#2a0a14';
const OLLA: Mat = { r: ['#7a1428', '#c42a2a', '#f0583a', '#ff9a70'], ol: INK_O, ol2: '#7a1428' };
const ORO: Mat = { r: ['#8a5a10', '#e8a820', '#ffe27a'], ol: INK_O, ol2: '#8a5a10' };
const PIEL: Mat = { r: ['#b4583a', '#e08a58', '#ffbc86'], ol: INK_O, ol2: '#b4583a' };
const LENGUA = '#ff6a8a';

function ollalocah(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const T = (m: ReturnType<typeof rc>) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);

  // Inside of the pot (dark), then the riders, then the front of the pot over them.
  const boca = el(32, 29, 25, 5.5);
  P.forma(boca, { r: [INK_O, INK_O, '#3a1424'], ol: INK_O, ol2: INK_O }, { paso: 1, borde: false });
  const jefe = f ? -3 : 0;
  const cabezas: [number, number, number][] = [
    [18, 25 + (f ? -2 : 1), 0],
    [32, 22 + jefe, 1],
    [46, 25 + (f ? 1 : -2), 2],
  ];
  for (const [x, y, k] of cabezas) {
    // Arms up.
    const brazo = (s: number) => trazo([[x + s * 3, y + 6], [x + s * 6.5, y - 1 - (f ? k % 2 : 1 - (k % 2)) * 2]], 1.5, 1.3);
    P.forma(T(brazo(-1)), PIEL, { rad: 1.5, borde: true });
    P.forma(T(brazo(1)), PIEL, { rad: 1.5, borde: true });
    const cab = el(x, y, 5, 5.3);
    P.sombra(T(cab), 0, 1, 1);
    P.forma(T(cab), PIEL, { rad: 4, grad: 0.35 });
    if (!E) {
      for (const s of [-1, 1]) {
        P.px(x + s * 2 - (s < 0 ? 1 : 0), y - 1, '#ffffff');
        P.px(x + s * 2 - (s < 0 ? 0 : 0), y - 1, INK_O);
      }
      P.llenar(rc(x - 1, y + 2, 3, 2), INK_O);
      P.px(x, y + 3, LENGUA);
      P.llenar(cur([[x - 4, y - 3], [x - 1, y - 2.5]], 1), INK_O);
      P.llenar(cur([[x + 1, y - 2.5], [x + 4, y - 3]], 1), INK_O);
    } else {
      P.llenar(inter(T(el(x, y - 2, 5.4, 3.8)), T(cab)), k === 1 ? '#d8a020' : INK_O);
    }
  }

  // The pot body.
  const cuerpo = inter(el(32, 39, 28, 22), rc(0, 29, 64, 40));
  P.sombra(cuerpo, 0, 1, 1);
  // Ear handles.
  for (const s of [-1, 1]) {
    P.forma(el(32 + s * 29, 40, 3.8, 5), ORO, { rad: 3 });
    P.llenar(el(32 + s * 29, 40, 1.4, 2.6), INK_O);
  }
  P.forma(cuerpo, OLLA, { rad: 9, grad: 0.4 });
  // Front lip of the rim in gold, with the string of bulbs.
  const labio = men(el(32, 30, 28, 5.6), el(32, 27.2, 27, 5));
  P.forma(un(labio, rc(5, 28, 54, 3)), ORO, { rad: 2, grad: 0.3, borde: true });
  for (let i = 0; i < 9; i++) {
    const x = 8 + i * 6.1;
    const on = (i + (f ? 1 : 0)) % 2 === 0;
    const y = 29.5 + 2.2 * Math.sin(((x - 5) / 54) * Math.PI) + 0.5;
    P.px(Math.round(x), Math.round(y), on ? '#ffffff' : ORO.r[0]);
    P.px(Math.round(x) + 1, Math.round(y), on ? ORO.r[2] : ORO.r[1]);
  }
  // Swirling shine that moves between frames.
  const sx = f ? 21 : 13;
  P.llenarSobre(T(cur([[sx, 49], [sx + 1, 44], [sx + 4, 40]], 1)), OLLA.r[3], OLLA);
  P.llenarSobre(T(cur([[sx + 3, 52], [sx + 4, 48]], 1)), OLLA.r[3], OLLA);
  P.llenarSobre(T(cur([[sx + 7, 53], [sx + 9, 50]], 1)), OLLA.r[2], OLLA);

  P.cara(() => {
    // Mad eyes: huge, bulging, pupils pointing different ways.
    const ojoI = el(21.5, 41, 7, 7.4);
    const ojoD = el(42.5, 40, 7.6, 8);
    for (const o of [ojoI, ojoD]) {
      P.aro(o, INK_O);
      P.llenar(o, '#ffffff');
    }
    const pup = (m: ReturnType<typeof el>, o: ReturnType<typeof el>) => P.llenar(inter(m, o), INK_O);
    pup(el(f ? 24 : 19, f ? 43 : 39.5, 2.2, 2.2), ojoI);
    pup(el(f ? 40 : 45, f ? 38 : 42, 2.2, 2.2), ojoD);
    // Red veins and a lid line.
    for (const [x, y] of [[16, 38], [17, 44], [27, 36], [47, 35], [48, 44], [38, 44], [39, 35]] as [number, number][]) P.px(x, y, OLLA.r[2]);
    P.llenar(cur([[14, 36], [18, 33.5], [25, 33.5], [28, 36]], 1), INK_O);
    P.llenar(cur([[36, 33], [42, 31], [48, 33], [50, 36]], 1), INK_O);
    // Toothy open grin.
    const grin = inter(el(32, 50, 14, 8), rc(0, 49, 64, 12));
    P.llenar(grin, INK_O);
    P.llenar(inter(rc(20, 49, 25, 2), grin), '#ffffff');
    for (let x = 23; x < 43; x += 4) P.px(x, 50, INK_O);
    P.llenar(inter(el(32, 57, 6.4, 3), grin), LENGUA);
  });
  P.dorso(() => {
    // Back hatch with a painted sun, rivets.
    P.forma(el(32, 46, 11, 11), ORO, { rad: 4, grad: 0.3 });
    P.forma(el(32, 46, 7, 7), OLLA, { rad: 3, paso: 2 });
    for (const [x, y] of [[32, 33], [32, 59], [19, 46], [45, 46], [23, 37], [41, 37], [23, 55], [41, 55]] as [number, number][]) P.px(x, y, ORO.r[2]);
    P.llenar(rc(30, 44, 5, 4), ORO.r[1]);
    P.px(31, 44, ORO.r[2]);
  });
  // Stubby feet.
  for (const x of [14, 32, 50]) P.forma(el(x, 61.4, 5, 2.2), ORO, { rad: 2, paso: 0 });

  // The lid, flying off: tilted a different way in each frame.
  const lx = f ? 49 : 14;
  const ly = f ? 6 : 8;
  const sg = f ? -1 : 1;
  const tapa = poli([[lx - 11, ly + 2 * sg], [lx + 11, ly - 2 * sg], [lx + 11, ly + 1 - 2 * sg], [lx - 11, ly + 3 + 2 * sg]]);
  const tapaF = un(tapa, el(lx, ly + 1, 11, 3.2));
  P.sombra(T(tapaF), 0, 1, 1);
  P.forma(T(tapaF), ORO, { rad: 3, grad: 0.4 });
  P.forma(T(el(lx + 1, ly - 3, 2.6, 2.4)), ORO, { rad: 2 });
  P.llenar(T(cur([[lx - 8, ly + 2.5], [lx + 8, ly + 2.5]], 1)), ORO.r[0]);
  // Motion ticks around the lid.
  P.px(TX(lx + (f ? -14 : 14)), ly - 2, ORO.r[2]);
  P.px(TX(lx + (f ? -15 : 15)), ly + 1, ORO.r[2]);
  P.px(TX(lx + (f ? -13 : 13)), ly + 4, ORO.r[2]);
}

export const LOTE_G: Dibujo2[] = [
  { id: 'cilantrox', nombre: 'Cilantrox', dibujar: cilantrox },
  { id: 'fotomaton', nombre: 'Fotomatón', dibujar: fotomaton },
  { id: 'cloudtrio', nombre: 'Cloudtrio', dibujar: cloudtrio },
  { id: 'cigarr', nombre: 'Cigarr', dibujar: cigarr },
  { id: 'ollalocah', nombre: 'OllaLocah', dibujar: ollalocah },
];
