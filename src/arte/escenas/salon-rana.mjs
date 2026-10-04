// Fran's living room for the ham toss (src/ui/rana.ts), seen from the side and
// built for a screen `vw` wide around the room the physics uses
// (src/ui/rana-fisica.mjs): the same rust sofa from behind, the same arc lamp,
// Aceituna's bed by the front door with the keys under the cushion, and the
// terrace door, where the draught comes from. Dusk outside, the lamp lit.
//
// The static room is one bitmap (made once). What moves is apart: the lamp's
// shade on its cable, the curtains, the dog and the ham.
import { smooth, ellipse, path, stroke, g, shape, rect, circle, poly, rectD, rr, lin, gpath, mat, box, rng } from './kit.mjs';
import { rrect } from '../personajes/svg.mjs';
import { posterFran } from './piso.mjs';

const SOFA = mat('#a4523a', '#7e3b28', '#c06a4e', '#5a2817', '#6a2f1f');
const WALNUT = mat('#7a5236', '#5c3c27', '#996b49', '#3a2416');
const CHARCOAL = mat('#4a4f57', '#353940', '#666c75', '#24272c');
const LAMPARA = { base: '#2f3036', luz: '#5a5c66', linea: '#141418' };

/** Where the terrace door is, for the room and for the curtains. */
export function puertaTerraza(vw) {
  const x0 = Math.round(vw * 0.6);
  return { x0, x1: x0 + Math.round(vw * 0.11), y0: 170, y1: 0 };
}

/** The room behind everything, `m` from mundo() in rana-fisica.mjs, SUELO the floor line. */
export function fondo(m, SUELO) {
  const { vw } = m;
  const H = 1080;
  const out = [];
  // Wall: sage gone grey at dusk, darker towards the ceiling.
  out.push(gpath(rectD(0, 0, vw, SUELO), lin(0, 0, 0, SUELO, [[0, '#3c3d36'], [0.55, '#55574a'], [1, '#5e5f50']])));
  // Cornice and skirting.
  out.push(rect(0, 0, vw, 30, '#2e2d2a'), rect(0, 30, vw, 8, '#4a4840'), rect(0, SUELO - 30, vw, 30, '#3a332c'), rect(0, SUELO - 30, vw, 5, '#5a5046'));

  // The terrace door, with the dusk sky and the rooftops of Usera.
  const T = puertaTerraza(vw);
  const ty1 = SUELO - 30;
  out.push(gpath(rectD(T.x0, T.y0, T.x1 - T.x0, ty1 - T.y0), lin(0, T.y0, 0, ty1, [[0, '#4b3a66'], [0.45, '#8a5a7e'], [0.75, '#d88a76'], [1, '#e8a87a']])));
  const R = rng(7);
  const techos = [];
  let x = T.x0;
  while (x < T.x1) {
    const w = 30 + R() * 60;
    techos.push([x, 520 + R() * 120], [x + w, 520 + R() * 120]);
    x += w;
  }
  out.push(poly([[T.x0, ty1], ...techos.map(([a, b]) => [Math.min(a, T.x1), b]), [T.x1, ty1]], '#2e2540'));
  for (let i = 0; i < 9; i++) out.push(rect(T.x0 + 12 + R() * (T.x1 - T.x0 - 30), 600 + R() * 120, 8, 10, R() > 0.5 ? '#ffd27a' : '#f0b060', { opacity: 0.85 }));
  // Terrace railing.
  for (let xx = T.x0; xx < T.x1; xx += 22) out.push(rect(xx, ty1 - 130, 4, 130, '#1e1a26'));
  out.push(rect(T.x0, ty1 - 136, T.x1 - T.x0, 8, '#1e1a26'));
  // Frame and the middle bar of the glass door.
  out.push(stroke(rr(T.x0, T.y0, T.x1 - T.x0, ty1 - T.y0, 4), CHARCOAL.base, 14), stroke(`M${(T.x0 + T.x1) / 2} ${T.y0}L${(T.x0 + T.x1) / 2} ${ty1}`, CHARCOAL.base, 10));
  out.push(path(smooth([[T.x0 + 20, T.y0 + 20], [T.x0 + 60, T.y0 + 20], [T.x0 + 24, T.y0 + 200]]), '#ffffff', { opacity: 0.08 }));
  // Curtain rail (the curtains move: rana.ts).
  out.push(rect(T.x0 - 70, T.y0 - 26, T.x1 - T.x0 + 140, 8, '#2a2622', { rx: 4 }));
  // The dusk light through the door, on the floor.
  out.push(gpath(polyD([[T.x0, SUELO], [T.x1, SUELO], [T.x1 + 220, H], [T.x0 - 260, H]]), lin(0, SUELO, 0, H, [[0, '#c88aa0', 0.28], [1, '#c88aa0', 0]])));

  // Over the sofa, the same poster of Fran's show as in the flat (piso.mjs), a
  // little bigger; its lettering is drawn by rana.ts with the game fonts.
  const P = cartel(m);
  out.push(`<g transform="translate(${P.x} ${P.y}) scale(${P.s}) translate(-1852 -250)">${posterFran()}</g>`);

  // The front door on the far right, panelled walnut.
  const dx = vw - 110;
  out.push(box(dx, 150, 200, SUELO - 150, WALNUT, { r: 3, sh: 0.04, li: 0.02 }), stroke(rr(dx + 24, 190, 150, 300, 4), WALNUT.shadow, 3), stroke(rr(dx + 24, 520, 150, 330, 4), WALNUT.shadow, 3));
  out.push(circle(dx + 40, 560, 8, '#c9a14f'));

  // Floor: warm boards in perspective, seen a little from above.
  out.push(gpath(rectD(0, SUELO, vw, H - SUELO), lin(0, SUELO, 0, H, [[0, '#5a3e28'], [1, '#7a5636']])));
  const fuga = { x: vw / 2, y: -1600 };
  for (let i = -24; i <= 24; i++) {
    const xb = vw / 2 + i * 160;
    const xt = fuga.x + (xb - fuga.x) * ((SUELO - fuga.y) / (H - fuga.y));
    out.push(stroke(`M${xt} ${SUELO}L${xb} ${H}`, '#3e2a1a', 2.2, { opacity: 0.55 }));
  }
  for (const [y, o] of [[SUELO + 26, 0.3], [SUELO + 64, 0.25], [SUELO + 112, 0.2]]) out.push(rect(0, y, vw, 2, '#3e2a1a', { opacity: o }));
  // The kilim rug under the middle of the room.
  const rx0 = m.sofa.x1 + 40;
  const rx1 = m.perro.x - 260;
  if (rx1 > rx0 + 200) {
    out.push(path(polyD([[rx0 + 30, SUELO + 22], [rx1 - 30, SUELO + 22], [rx1, H - 30], [rx0, H - 30]]), '#e3c891'), path(polyD([[rx0 + 44, SUELO + 30], [rx1 - 44, SUELO + 30], [rx1 - 14, H - 38], [rx0 + 14, H - 38]]), '#a8472f'));
    for (const k of [0.3, 0.7]) {
      const y = SUELO + 30 + (H - 68 - SUELO) * k;
      out.push(rect(rx0 + 30, y, rx1 - rx0 - 60, 8, '#2f3d5c'));
    }
  }

  // The arc lamp: base, pole and arm (the shade hangs apart).
  const L = m.lampara;
  const A = L.arco;
  out.push(shape(ellipse(L.base, SUELO - 6, 60, 14), LAMPARA.base, [path(ellipse(L.base, SUELO - 10, 52, 9), '#3e4048')], LAMPARA.linea, 1.6));
  const arco = `M${L.base} ${SUELO - 10}L${A[0].x} ${A[0].y}` + A.slice(1).map((p) => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
  out.push(stroke(arco, LAMPARA.linea, 20), stroke(arco, LAMPARA.base, 15), stroke(arco, LAMPARA.luz, 3, { opacity: 0.8, transform: 'translate(-3 -2)' }));
  out.push(shape(ellipse(L.pivote.x, L.pivote.y, 11, 9), LAMPARA.base, [], LAMPARA.linea, 1.6));

  // The sofa from behind, rust, with the knitted throw and a mustard cushion.
  const S = m.sofa;
  out.push(shape(smooth([[S.x1 - 120, S.top + 20], [S.x1 - 100, S.top - 36], [S.x1 - 30, S.top - 46], [S.x1 + 10, S.top - 20], [S.x1 + 6, S.top + 24]]), '#d9a441', [path(ellipse(S.x1 - 60, S.top - 20, 40, 12), '#ecc46e', { opacity: 0.7 })], '#7a5714', 1.6));
  out.push(shape(rr(S.x0, S.top, S.x1 - S.x0, SUELO - 20 - S.top, S.r), SOFA.base, [
    path(smooth([[S.x0, S.top + 60], [(S.x0 + S.x1) / 2, S.top + 40], [S.x1, S.top + 60], [S.x1, S.top + 90], [S.x0, S.top + 90]]), SOFA.light, { opacity: 0.45 }),
    rect(S.x0, SUELO - 140, S.x1 - S.x0, 140, SOFA.shadow),
    ...[0.33, 0.66].map((k) => stroke(`M${S.x0 + (S.x1 - S.x0) * k} ${S.top + 30}L${S.x0 + (S.x1 - S.x0) * k} ${SUELO - 60}`, SOFA.deep, 3, { opacity: 0.6 })),
  ], SOFA.line, 2.6));
  out.push(shape(smooth([[S.x0 + 26, S.top + 12], [S.x0 + 110, S.top - 6], [S.x0 + 200, S.top + 2], [S.x0 + 214, S.top + 70], [S.x0 + 200, S.top + 190, 'c'], [S.x0 + 160, S.top + 170], [S.x0 + 120, S.top + 200, 'c'], [S.x0 + 80, S.top + 160], [S.x0 + 40, S.top + 190, 'c'], [S.x0 + 30, S.top + 90]]), '#e8dcc0', [
    ...[0, 1, 2, 3].map((i) => stroke(`M${S.x0 + 60 + i * 40} ${S.top}Q${S.x0 + 66 + i * 40} ${S.top + 90} ${S.x0 + 58 + i * 40} ${S.top + 180}`, '#d2c4a6', 5)),
  ], '#9a8a68', 1.6));
  for (const fx of [S.x0 + 20, S.x1 - 40]) out.push(box(fx, SUELO - 22, 20, 22, mat('#6e4a2c', '#4e321c', '#8e6440', '#2e1c0e'), { r: 3 }));

  // Aceituna's bed by the door, the keys peeking out from under the cushion.
  const C = m.cama;
  const cx = (C.x0 + C.x1) / 2;
  out.push(path(ellipse(cx, SUELO + 4, (C.x1 - C.x0) / 2 + 10, 16), '#000', { opacity: 0.3 }));
  out.push(shape(rr(C.x0, C.top - 18, C.x1 - C.x0, SUELO - C.top + 18, C.r), '#6a7a96', [
    rect(C.x0, SUELO - 22, C.x1 - C.x0, 22, '#4e5c76'),
    rect(C.x0, C.top - 18, C.x1 - C.x0, 10, '#8a9ab4'),
  ], '#2e3a52', 2.4));
  out.push(shape(ellipse(cx, C.top - 2, (C.x1 - C.x0) / 2 - 26, 16), '#d9cdb4', [path(ellipse(cx + 10, C.top + 2, (C.x1 - C.x0) / 2 - 50, 9), '#c4b698')], '#8a7c5e', 1.6));
  const kx = C.x0 + 60;
  const ky = C.top + 6;
  out.push(g(null, [
    stroke(`M${kx} ${ky}a12 12 0 1 0 0.2 0`, '#c9a14f', 5),
    stroke(`M${kx + 10} ${ky + 2}L${kx + 44} ${ky + 8}M${kx + 34} ${ky + 6}l0 8M${kx + 42} ${ky + 8}l0 8`, '#d9dcd8', 5),
    shape(ellipse(kx - 22, ky + 6, 13, 9, 0.3), '#c8433a', [path(ellipse(kx - 22, ky + 6, 13, 3, 0.3), '#f4efe6')], '#6e1c17', 1.4),
  ]));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${H}" width="${vw}" height="${H}">${out.join('')}</svg>`;
}

/** Where the poster goes (top left) and its scale against the one in the flat. */
export function cartel(m) {
  return { x: m.sofa.x0 + 40, y: 230, s: 1.45 };
}

const polyD = (pts) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;

/** The lamp's shade, hanging from its cable at (0, 0); lit inside. ~110 wide. */
export function pantalla() {
  return [
    shape(smooth([[-56, 46], [-40, -10], [-14, -24], [14, -24], [40, -10], [56, 46]]), LAMPARA.base, [rect(-56, -24, 112, 18, '#4a4c56'), path(smooth([[20, -20], [40, -8], [52, 40], [36, 40]]), '#24252a')], LAMPARA.linea, 2),
    gpath(ellipse(0, 46, 56, 10), lin(0, 36, 0, 56, [[0, '#ffe7b0'], [1, '#ffc066']])),
    shape(ellipse(0, -26, 9, 6), LAMPARA.base, [], LAMPARA.linea, 1.4),
  ].join('');
}

/** A curtain hanging from the rail at (0, 0), ~90 wide and 560 long. */
export function cortina() {
  const pliegues = [-30, -10, 10, 30];
  return shape(smooth([[-44, 0, 'c'], [44, 0, 'c'], [48, 280], [52, 560, 'c'], [-52, 560, 'c'], [-48, 280]]), '#c8b48a', [
    ...pliegues.map((x) => path(smooth([[x - 6, 0], [x + 6, 0], [x + 8, 560], [x - 8, 560]]), '#a8956c', { opacity: 0.7 })),
    rect(-60, 0, 120, 26, '#8a7a56', { opacity: 0.5 }),
  ], '#6a5a3a', 1.6);
}

/** A cube of serrano ham, three-quarters, ~34 across, centred. */
export function taquito() {
  return [
    shape(smooth([[-16, -6, 'c'], [2, -16, 'c'], [17, -9, 'c'], [17, 10, 'c'], [-1, 18, 'c'], [-16, 10, 'c']]), '#b8424a', [
      path(smooth([[-16, -6, 'c'], [2, -16, 'c'], [17, -9, 'c'], [-1, 1, 'c']]), '#e07a80'),
      path(smooth([[-1, 1, 'c'], [17, -9, 'c'], [17, 10, 'c'], [-1, 18, 'c']]), '#8e2c36'),
      stroke('M-12 2Q-6 6 -2 4M4 8Q10 6 14 0M-8 -8Q0 -12 8 -10', '#f6e6d6', 2.6, { opacity: 0.9 }),
    ], '#5a1820', 1.4),
  ].join('');
}
