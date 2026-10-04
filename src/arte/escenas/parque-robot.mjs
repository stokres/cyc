// Chuchi's minigame (src/ui/robot.ts), seen from behind the ball cannon: the
// play park's exit straight ahead, its shutter up and the street outside, the
// mural sky with its rainbow on the wall, the foam mats running towards the door
// and the edge of the ball pit at the bottom. Robi stands in between (drawn live).
// Also the cannon with Chuchi's hands on it, the balls and Robi's party hat.
import { smooth, ellipse, path, stroke, shape, rect, circle, line, rectD, rr, lin, rad, gpath, mat, box, rng } from './kit.mjs';
import { rrect } from '../personajes/svg.mjs';

const BOLAS = ['#e8452e', '#f5c95f', '#5ad08a', '#5aa8ff', '#f27aa8', '#ff9a3a'];
export { BOLAS };
const AMARILLO = mat('#f5c33a', '#d4a020', '#ffe07a', '#7a5a08');

/** The room, a screen `vw` wide and 1080 tall. `suelo`: the floor line under Robi. */
export function fondoRobot(vw, suelo = 800) {
  const H = 1080;
  const cx = vw / 2;
  const out = [];
  // Mural sky on the back wall, a rainbow and clouds.
  out.push(gpath(rectD(0, 0, vw, suelo), lin(0, 0, 0, suelo, [[0, '#4a8ad0'], [1, '#9ccaf0']])));
  const arco = (r, c) => stroke(`M${cx - r} ${suelo - 120}A${r} ${r * 0.75} 0 0 1 ${cx + r} ${suelo - 120}`, c, 40);
  ['#e8452e', '#ff9a3a', '#f5c95f', '#5ad08a', '#5aa8ff', '#8a6ad8'].forEach((c, i) => out.push(arco(vw * 0.42 - i * 40, c)));
  for (const [x, y, s] of [[0.12, 150, 1.6], [0.3, 90, 1.1], [0.72, 120, 1.5], [0.9, 200, 1]]) {
    const X = vw * x;
    out.push(path(smooth([[X - 80 * s, y], [X - 70 * s, y - 30 * s], [X - 30 * s, y - 46 * s], [X, y - 66 * s], [X + 46 * s, y - 56 * s], [X + 80 * s, y - 26 * s], [X + 90 * s, y, 'c']]), '#ffffff', { opacity: 0.85 }));
  }
  // The exit straight ahead: frame, the shutter rolled up, the glass doors and the street.
  const ex0 = cx - 230;
  const ex1 = cx + 230;
  out.push(rect(ex0 - 30, 300, ex1 - ex0 + 60, suelo - 300, '#5a6070'));
  out.push(gpath(rectD(ex0, 340, ex1 - ex0, suelo - 340), lin(0, 340, 0, suelo, [[0, '#1c2446'], [1, '#3a3458']])));
  for (let i = 0; i < 6; i++) out.push(rect(ex0 + 20 + i * 74, 470 + (i % 3) * 30, 50, 80, '#2e2c48'), rect(ex0 + 34 + i * 74, 486 + (i % 3) * 30, 14, 16, '#ffd27a', { opacity: 0.7 }));
  out.push(rect(ex0, 640, ex1 - ex0, suelo - 640, '#25223a'), rect(ex0 + 300, 400, 10, 240, '#3a3a44'), circle(ex0 + 305, 400, 24, '#ffd27a', { opacity: 0.9 }));
  out.push(rect(ex0, 340, ex1 - ex0, 30, '#9aa0a8'), rect(ex0, 370, ex1 - ex0, 6, '#7a8088'));
  out.push(stroke(rr(ex0 + 24, 384, ex1 - ex0 - 48, suelo - 390, 4), '#c8ccd4', 8), stroke(`M${cx} 384L${cx} ${suelo - 6}`, '#c8ccd4', 6));
  // The SALIDA sign (lettering added by robot.ts with the game font).
  out.push(path(rr(cx - 110, 236, 220, 56, 8), '#14361e'), path(rr(cx - 104, 241, 208, 46, 6), '#3ad06a', { opacity: 0.9 }));
  out.push(gpath(rectD(cx - 300, 160, 600, 220), rad(cx, 264, 300, [[0, '#3ad06a', 0.35], [1, '#3ad06a', 0]], 0.5)));
  // Padded wainscot in colours along the wall.
  const cols = [mat('#3a7ad8', '#2a5aa8', '#6a9ae8', '#163a70'), mat('#e0503a', '#b03a28', '#f07a60', '#6a1a10'), AMARILLO, mat('#4ab86a', '#36904e', '#7ad890', '#14502a')];
  for (let x = -40, i = 0; x < vw; x += 200, i++) {
    if (x + 200 > ex0 - 30 && x < ex1 + 30) continue;
    out.push(box(x, suelo - 150, 200, 150, cols[i % 4], { r: 16, sh: 0.12, li: 0.1, side: false, lw: 2 }));
  }
  // Foam mats running towards the door, in strong perspective.
  const fuga = { x: cx, y: suelo - 360 };
  const mats = ['#c8423a', '#3a74c8', '#e8b83a', '#46a860'];
  const filas = [suelo, suelo + 40, suelo + 95, suelo + 170, suelo + 270, H + 20];
  for (let f = 0; f < filas.length - 1; f++) {
    const y0 = filas[f];
    const y1 = filas[f + 1];
    const k0 = (y0 - fuga.y) / (suelo - fuga.y);
    const k1 = (y1 - fuga.y) / (suelo - fuga.y);
    for (let i = -12; i < 12; i++) {
      const xa = (X, k) => fuga.x + (X - fuga.x) * k;
      const X0 = cx + i * 260;
      const X1 = X0 + 260;
      out.push(path(`M${xa(X0, k0)} ${y0}L${xa(X1, k0)} ${y0}L${xa(X1, k1)} ${y1}L${xa(X0, k1)} ${y1}Z`, mats[(i + f + 40) % 4]));
      out.push(line(xa(X0, k0), y0, xa(X0, k1), y1, '#000000', 3, { opacity: 0.2 }));
    }
    out.push(rect(0, y0, vw, 3, '#000000', { opacity: 0.18 }));
  }
  // The ball pit's padded edge at the bottom, heaped with balls.
  const r = rng(5);
  out.push(box(-40, H - 90, vw + 80, 120, mat('#3a7ad8', '#2a5aa8', '#6a9ae8', '#163a70'), { r: 30, sh: 0.2, li: 0.12, side: false, lw: 3 }));
  for (let i = 0; i < Math.round(vw / 9); i++) {
    const x = r() * vw;
    if (Math.abs(x - cx) < 230) continue;
    const y = H - 100 + r() * 16;
    out.push(circle(x, y, 24 + r() * 6, BOLAS[Math.floor(r() * 6)]), circle(x - 7, y - 8, 7, '#ffffff', { opacity: 0.45 }));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${H}" width="${vw}" height="${H}">${out.join('')}</svg>`;
}

/**
 * The air cannon from behind, as Chuchi holds it: its barrel points up the
 * screen from the pivot at (0, 0); ~340 tall. His hands (and burgundy sleeves)
 * grip the handles on either side.
 */
export function canonRobot() {
  const out = [];
  // Hopper full of balls behind the barrel.
  out.push(shape(smooth([[-120, 40], [120, 40], [100, 140, 'c'], [-100, 140, 'c']]), '#5aa8ff', [path(smooth([[60, 40], [120, 40], [100, 140], [70, 140]]), '#3a7ad8')], '#163a70', 3));
  for (let i = 0; i < 7; i++) out.push(circle(-84 + i * 28, 46 - (i % 2) * 10, 16, BOLAS[i % 6]), circle(-90 + i * 28, 40 - (i % 2) * 10, 5, '#ffffff', { opacity: 0.5 }));
  // Barrel, foreshortened: wide at the back, narrow at the muzzle.
  out.push(shape(smooth([[-70, 60, 'c'], [-46, -200], [-34, -240, 'c'], [34, -240, 'c'], [46, -200], [70, 60, 'c']]), AMARILLO.base, [
    path(smooth([[20, -240], [46, -200], [70, 60], [30, 60]]), AMARILLO.shadow),
    path(smooth([[-56, 30], [-38, -190], [-26, -190], [-36, 30]]), AMARILLO.light, { opacity: 0.8 }),
    rect(-80, -40, 160, 18, '#e0503a'),
    rect(-80, -120, 160, 14, '#e0503a'),
  ], AMARILLO.line, 3));
  out.push(shape(ellipse(0, -242, 36, 14), '#2a2e38', [path(ellipse(0, -240, 26, 8), '#0e1016')], '#141618', 2.4));
  // Handles and Chuchi's hands, with the sleeves of his burgundy sweatshirt.
  for (const s of [-1, 1]) {
    out.push(stroke(`M${s * 66} 10L${s * 120} 30`, '#5a6070', 16));
    out.push(shape(smooth([[s * 150, 200, 'c'], [s * 110, 80], [s * 112, 44], [s * 150, 36], [s * 196, 60], [s * 216, 200, 'c']]), '#8a2a3a', [path(smooth([[s * 112, 60], [s * 196, 70], [s * 200, 96], [s * 116, 88]]), '#a83e50', { opacity: 0.8 })], '#4a1220', 2.4));
    out.push(shape(ellipse(s * 128, 30, 34, 28, s * 0.4), '#e8b296', [path(ellipse(s * 120, 22, 20, 12, s * 0.4), '#f4c8ae', { opacity: 0.8 })], '#9a5a3e', 2));
    for (let i = 0; i < 3; i++) out.push(stroke(`M${s * (104 + i * 12)} ${12 + i * 3}Q${s * (98 + i * 12)} ${30 + i * 2} ${s * (106 + i * 12)} ${40}`, '#9a5a3e', 2.4));
  }
  return out.join('');
}

/** A ball from the pit, centred, radius 30 at 1:1, with a highlight. */
export function bola(color) {
  return [
    shape(ellipse(0, 0, 30, 30), color, [path(ellipse(10, 10, 26, 26), '#000000', { opacity: 0.18 })], '#00000055', 1.6),
    path(ellipse(-10, -11, 9, 7, -0.6), '#ffffff', { opacity: 0.7 }),
  ].join('');
}

/** Robi's party hat, standing on (0, 0): a striped cone with a pompom, ~120 tall. */
export function gorroFiesta() {
  return [
    shape(smooth([[-52, 0, 'c'], [0, -118, 'c'], [52, 0, 'c']]), '#8a3ad8', [
      ...[0, 1, 2].map((i) => path(smooth([[-46 + i * 16, -14 - i * 34], [46 - i * 16, -14 - i * 34], [40 - i * 16, -30 - i * 34], [-40 + i * 16, -30 - i * 34]]), '#f5c95f')),
      path(smooth([[10, -110], [52, 0], [20, 0]]), '#000000', { opacity: 0.15 }),
    ], '#3a1060', 2.4),
    shape(ellipse(0, -120, 14, 14), '#f27aa8', [], '#7a1e44', 2),
    shape(rrect(0, 0, 56, 6, 4), '#f5c95f', [], '#7a5a08', 1.6),
  ].join('');
}
