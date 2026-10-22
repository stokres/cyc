// Stages 3, 4 and 5: Fran's living room, the ball park and the theatre backstage.
import { AREA } from '../../tipos';
import { type Azar, type Ctx, bruma, cielo, disco, domo, elipse, entre, halo, linea, poli, punto, rect, tramado } from './base';

const L = AREA.izq;
const R = AREA.der;
const SUELO = AREA.suelo;

// ---------------------------------------------------------------------------
export function piso(x: Ctx, r: Azar) {
  // Wall: muted plum with faint vertical stripes, darker towards the ceiling.
  rect(x, L, 8, R - L, 168, '#3a3048');
  cielo(x, 8, 56, ['#2a2236', '#30283f', '#352c43'], L, R);
  for (let px = L + 6; px < R; px += 12) rect(x, px, 8, 2, 168, '#352b42');
  tramado(x, L, 8, R - L, 48, '#241c30', 0);
  // Skirting board and the strip of floor in front of it.
  rect(x, L, 170, R - L, 6, '#241c2c');
  rect(x, L, 170, R - L, 1, '#4a3c52');
  rect(x, L, 176, R - L, SUELO - 176, '#4e3426');
  for (let px = L; px < R; px += 16) rect(x, px, 176, 1, SUELO - 176, '#35231a');
  tramado(x, L, 176, R - L, 8, '#2a1a12', 4);

  // Terrace door on the right, with the night city in the glass.
  const vx = 296;
  const vy = 22;
  const vw = 60;
  rect(x, vx - 3, vy - 3, vw + 6, 152, '#1c1822');
  cielo(x, vy, vy + 146, ['#0e1540', '#16205a', '#222c6c', '#33387a'], vx, vx + vw);
  // skyline with lights
  let alt = 0;
  for (let px = vx; px < vx + vw; ) {
    const w = entre(r, 5, 10);
    alt = entre(r, 14, 40);
    rect(x, px, vy + 146 - alt - 20, Math.min(w, vx + vw - px), alt + 20, '#0b0f2c');
    for (let wy = vy + 146 - alt - 16; wy < vy + 140; wy += 6)
      for (let wx = px + 1; wx < Math.min(px + w, vx + vw) - 1; wx += 3) if (r() < 0.3) punto(x, wx, wy, r() < 0.7 ? '#c8a060' : '#7a98d8');
    px += w;
  }
  punto(x, vx + 40, vy + 100, '#d8323a');
  punto(x, vx + 12, vy + 92, '#d8323a');
  // glass bars
  rect(x, vx + vw / 2 - 1, vy, 2, 146, '#1c1822');
  for (const my of [vy + 40, vy + 90]) rect(x, vx, my, vw, 2, '#1c1822');
  // balcony railing
  rect(x, vx - 3, vy + 130, vw + 6, 2, '#1c1822');
  for (let px = vx; px < vx + vw; px += 4) rect(x, px, vy + 132, 1, 14, '#1c1822');
  // curtains
  for (const [cx, dir] of [[vx - 12, 1], [vx + vw - 2, -1]]) {
    for (let i = 0; i < 14; i++) rect(x, cx + (dir > 0 ? i : i), 12, 1, 160, i % 4 < 2 ? '#5a2430' : '#43182a');
    rect(x, cx, 12, 14, 3, '#2a1018');
    tramado(x, cx, 150, 14, 22, '#000000', 4);
  }
  rect(x, vx - 14, 10, vw + 28, 3, '#1c1018');

  // Shelves with muted books and a plant, centre-right of the wall.
  const estante = (sx: number, sy: number, w: number) => {
    rect(x, sx, sy, w, 2, '#6a4a34');
    rect(x, sx, sy + 2, w, 1, '#2a1c14');
    for (let px = sx + 2; px < sx + w - 4; ) {
      const bw = entre(r, 2, 4);
      const bh = entre(r, 9, 14);
      rect(x, px, sy - bh, bw, bh, ['#5a3a46', '#3a4e58', '#6a5a3a', '#44406a', '#4a5a42'][entre(r, 0, 4)]);
      rect(x, px, sy - bh, 1, bh, '#00000044');
      px += bw + (r() < 0.2 ? 3 : 0);
    }
  };
  estante(150, 44, 84);
  estante(150, 74, 84);
  // Framed picture on the wall.
  rect(x, 244, 30, 34, 26, '#1c1420');
  rect(x, 246, 32, 30, 22, '#3a5a6a');
  domo(x, 258, 54, 12, 8, '#2a4252');
  rect(x, 246, 46, 30, 8, '#4a3a4e');
  disco(x, 268, 40, 3, '#a8809a');
  // Sideboard under the blocks, dark and plain, with a small lamp.
  rect(x, 150, 140, 92, 32, '#2a2030');
  rect(x, 148, 138, 96, 3, '#44344a');
  rect(x, 150, 144, 92, 1, '#1a1220');
  for (let px = 152; px < 240; px += 30) {
    rect(x, px, 147, 28, 20, '#322838');
    rect(x, px + 13, 154, 3, 5, '#6a5a70');
  }
  rect(x, 166, 130, 2, 8, '#2a2030');
  poli(x, [[160, 130], [174, 130], [170, 121], [164, 121]], '#a88a6a');
  halo(x, 167, 124, 12, '#6a5040', 5);

  // Sofa (left), muted teal with lit top edges.
  const sx = 20;
  rect(x, sx + 8, 122, 76, 28, '#3a5560');
  rect(x, sx + 8, 122, 76, 3, '#4e6e7a');
  for (const cx of [sx + 10, sx + 48]) {
    rect(x, cx, 126, 34, 22, '#35505a');
    rect(x, cx, 126, 34, 2, '#4a6a76');
    rect(x, cx + 33, 126, 1, 22, '#27404a');
  }
  rect(x, sx, 130, 14, 38, '#2e4650');
  rect(x, sx, 130, 14, 3, '#4e6e7a');
  rect(x, sx + 78, 130, 14, 38, '#2e4650');
  rect(x, sx + 78, 130, 14, 3, '#4e6e7a');
  rect(x, sx + 6, 148, 80, 18, '#34505a');
  rect(x, sx + 6, 148, 80, 2, '#4a6a76');
  rect(x, sx + 6, 156, 80, 1, '#27404a');
  rect(x, sx + 6, 166, 80, 3, '#1e303a');
  rect(x, sx + 4, 169, 3, 3, '#14181c');
  rect(x, sx + 85, 169, 3, 3, '#14181c');
  // blanket and cushion
  rect(x, sx + 52, 146, 28, 8, '#7a4a3a');
  tramado(x, sx + 52, 146, 28, 8, '#a86a4a', 4);
  rect(x, sx + 14, 138, 12, 12, '#5a3a58');
  rect(x, sx + 14, 138, 12, 2, '#7a5a78');
  // Arc floor lamp: marble base, stem and an arc over the sofa to the shade.
  rect(x, 118, 168, 18, 4, '#4a4a56');
  rect(x, 118, 168, 18, 1, '#7a7a88');
  rect(x, 126, 60, 2, 108, '#3a3a46');
  rect(x, 126, 60, 1, 108, '#5a5a68');
  let px0 = 127;
  let py0 = 60;
  for (let t = 1; t <= 24; t++) {
    const u = t / 24;
    const qx = Math.round((1 - u) * (1 - u) * 127 + 2 * (1 - u) * u * 126 + u * u * 76);
    const qy = Math.round((1 - u) * (1 - u) * 60 + 2 * (1 - u) * u * 20 + u * u * 54);
    linea(x, px0, py0, qx, qy, '#3a3a46');
    linea(x, px0, py0 - 1, qx, qy - 1, '#5a5a68');
    px0 = qx;
    py0 = qy;
  }
  halo(x, 76, 64, 26, '#6a5a58', 7);
  poli(x, [[66, 54], [88, 54], [92, 68], [62, 68]], '#d8b888');
  rect(x, 66, 54, 22, 2, '#f0d8a8');
  rect(x, 62, 67, 30, 2, '#a88a68');
  // soft cone of light on the sofa
  poli(x, [[64, 69], [90, 69], [104, 120], [50, 120]], '#463a50');
  poli(x, [[70, 69], [84, 69], [92, 112], [62, 112]], '#524458');
  // Dog bed (Aceituna)
  elipse(x, 276, 171, 15, 5, '#2a1a1a');
  elipse(x, 276, 170, 14, 5, '#7a4a3a');
  elipse(x, 276, 169, 10, 3, '#34201e');
  rect(x, 266, 165, 4, 1, '#c8b898');
  rect(x, 284, 168, 5, 2, '#c8b898');
}

// ---------------------------------------------------------------------------
export function bolilandia(x: Ctx, r: Azar) {
  // Deep blue padded walls with big painted shapes.
  cielo(x, 8, 152, ['#1e2552', '#222a5a', '#262e60', '#2a3366'], L, R);
  for (let i = 0; i < 6; i++) {
    const cx = 50 + i * 64;
    disco(x, cx, 70, 20, '#2c3470');
    disco(x, cx, 70, 20, i % 2 ? '#2c3470' : '#2a3068');
  }
  for (let px = L; px < R; px += 16) {
    poli(x, [[px, 150], [px + 8, 126], [px + 16, 150]], '#252c5e');
  }
  bruma(x, 100, 152, '#1e2552', 2, 8);
  // Padded stripe along the wall at pit height
  rect(x, L, 148, R - L, 8, '#45304a');
  rect(x, L, 148, R - L, 1, '#6a4a6a');
  for (let px = L; px < R; px += 16) rect(x, px + 15, 148, 1, 8, '#2a1a30');

  // Climbing net on the left: padded posts and a mesh.
  rect(x, 14, 20, 6, 132, '#8a2e3e');
  rect(x, 14, 20, 2, 132, '#b0485a');
  rect(x, 96, 20, 6, 132, '#8a2e3e');
  rect(x, 96, 20, 2, 132, '#b0485a');
  rect(x, 14, 20, 88, 5, '#8a2e3e');
  for (let k = 20; k < 150; k += 8) tramado(x, 20, k, 76, 1, '#6a7ab8', 6);
  for (let k = 20; k < 96; k += 8) tramado(x, k, 25, 1, 125, '#6a7ab8', 6);
  // Slide on the right: tower, platform and a teal tube.
  rect(x, 326, 36, 5, 116, '#2e5a9a');
  rect(x, 326, 36, 2, 116, '#4a7ac0');
  rect(x, 362, 36, 5, 116, '#2e5a9a');
  rect(x, 320, 36, 52, 6, '#3a6ab0');
  rect(x, 320, 42, 52, 1, '#1e3a6a');
  for (let k = 0; k < 4; k++) rect(x, 332 + k * 8, 42, 2, 14, '#2e5a9a');
  poli(x, [[324, 52], [334, 62], [276, 134], [236, 146], [236, 132], [262, 118]], '#2a7a82');
  poli(x, [[324, 52], [328, 56], [268, 118], [244, 130], [240, 128], [262, 116]], '#3a9aa0');
  poli(x, [[334, 62], [326, 70], [272, 138], [236, 146], [248, 142], [276, 134]], '#1c5a62');
  rect(x, 232, 140, 30, 6, '#1c5a62');
  rect(x, 232, 140, 30, 2, '#2a7a82');

  // Garlands of pennants across the top.
  const guirnalda = (x0: number, x1: number, y0: number, hund: number, off: number) => {
    const cols = ['#a03a48', '#3a6ab0', '#3a8a5a', '#8a5aa8', '#b09040'];
    let ant = [x0, y0];
    for (let px = x0; px <= x1; px += 2) {
      const u = (px - x0) / (x1 - x0);
      const py = Math.round(y0 + Math.sin(u * Math.PI) * hund);
      linea(x, ant[0], ant[1], px, py, '#101428');
      ant = [px, py];
      if ((px - x0) % 10 === 0) {
        const c = cols[((px - x0) / 10 + off) % cols.length];
        poli(x, [[px - 3, py], [px + 3, py], [px, py + 7]], c);
      }
    }
  };
  guirnalda(L, 190, 12, 12, 0);
  guirnalda(190, R, 12, 12, 2);
  // Hanging sign shape in the middle: rounded board with balls, no text.
  rect(x, 176, 8, 1, 14, '#101428');
  rect(x, 216, 8, 1, 14, '#101428');
  rect(x, 164, 22, 66, 26, '#14183a');
  rect(x, 166, 24, 62, 22, '#a03a48');
  rect(x, 166, 24, 62, 2, '#c85a68');
  rect(x, 166, 44, 62, 2, '#6a1e2e');
  const bs = ['#3a6ab0', '#3a8a5a', '#b09040', '#8a5aa8'];
  for (let i = 0; i < 4; i++) {
    disco(x, 177 + i * 14, 35, 4, bs[i]);
    punto(x, 175 + i * 14, 33, '#e8e8f0');
  }
  // Padded columns in the middle, dim
  for (const cx of [148, 244]) {
    rect(x, cx, 20, 10, 130, '#2e3a78');
    rect(x, cx, 20, 3, 130, '#46549a');
    for (let k = 30; k < 150; k += 14) rect(x, cx, k, 10, 2, k % 28 === 2 ? '#a03a48' : '#3a8a5a');
  }
  // Ball pit at the bottom: dim balls over a dark pit.
  rect(x, L, 158, R - L, 26, '#0e1024');
  const cb = ['#5a1e28', '#1e3a6a', '#1e5236', '#54441e', '#44305e'];
  for (let k = 0; k < 4; k++) {
    for (let px = L - (k % 2) * 4; px < R; px += 8) {
      const jx = px + entre(r, 0, 1);
      const jy = 160 + k * 6 + entre(r, 0, 1);
      const c = cb[entre(r, 0, 4)];
      disco(x, jx + 4, jy + 3, 3, '#0a0c1c');
      disco(x, jx + 4, jy + 2, 3, c);
    }
  }
  rect(x, L, 156, R - L, 3, '#45304a');
  rect(x, L, 156, R - L, 1, '#6a4a6a');
}

// ---------------------------------------------------------------------------
export function teatro(x: Ctx, _r: Azar) {
  // Back wall of the stage house: dark brick.
  rect(x, L, 8, R - L, 176, '#1c1620');
  for (let by = 12; by < 184; by += 6) {
    rect(x, L, by, R - L, 1, '#150f18');
    for (let px = L + ((by / 6) % 2) * 5; px < R; px += 10) rect(x, px, by + 1, 1, 5, '#150f18');
  }
  rect(x, L, 8, R - L, 60, '#16111a');

  // Set flats leaning on braces: a city skyline and a tree.
  const hoja = (fx: number, fw: number, top: number, base: string, claro: string) => {
    linea(x, fx + 4, 170, fx - 8, 150, '#2a1c12');
    linea(x, fx + fw - 4, 170, fx + fw + 8, 150, '#2a1c12');
    rect(x, fx, top, fw, 170 - top, base);
    rect(x, fx, top, fw, 2, claro);
    rect(x, fx, top, 2, 170 - top, claro);
    rect(x, fx + fw - 1, top, 1, 170 - top, '#0c0a10');
  };
  hoja(84, 46, 76, '#2c4a52', '#4a6a72');
  for (let by = 90; by < 160; by += 14) for (let bx = 90; bx < 126; bx += 10) rect(x, bx, by, 5, 7, (bx + by) % 3 ? '#1c3238' : '#6a6a50');
  poli(x, [[84, 76], [107, 62], [130, 76]], '#3a5a62');
  hoja(262, 46, 80, '#2e3a2e', '#4a5a42');
  disco(x, 285, 108, 14, '#3a5a3a');
  disco(x, 278, 100, 10, '#4a6a46');
  rect(x, 283, 120, 4, 40, '#4a3424');

  // Light batten with spots and their faint cones.
  rect(x, 96, 28, 200, 2, '#3a3a46');
  for (let i = 0; i < 6; i++) {
    const lx = 108 + i * 34;
    const calido = i % 2 === 0;
    poli(x, [[lx, 30], [lx - 16, 120], [lx + 16, 120]], calido ? '#2a2229' : '#1f2331');
    poli(x, [[lx, 30], [lx - 8, 120], [lx + 8, 120]], calido ? '#30272e' : '#242a3a');
    rect(x, lx - 5, 30, 10, 7, '#14121a');
    rect(x, lx - 4, 36, 8, 2, calido ? '#e8d0a0' : '#a8d0f0');
    rect(x, lx - 1, 28, 2, 3, '#4a4a56');
  }

  // Fly lines with sandbags.
  for (let i = 0; i < 9; i++) {
    const rx = 140 + i * 12 + (i % 2) * 2;
    const fin = 70 + (i * 17) % 40;
    rect(x, rx, 26, 1, fin - 26, '#6a5a44');
    rect(x, rx - 2, fin, 5, 7, '#5a4a30');
    rect(x, rx - 2, fin, 5, 1, '#7a6a48');
    rect(x, rx - 1, fin + 2, 3, 1, '#3a2c1c');
  }
  // Pin rail with tied ropes, right.
  rect(x, 300, 128, 76, 3, '#4a3020');
  for (let px = 304; px < 372; px += 6) {
    rect(x, px, 124, 1, 5, '#8a7a5a');
    rect(x, px + 1, 130, 1, 14, '#6a5a44');
  }

  // Heavy curtains left and right, with a scalloped valance on top.
  const cortina = (cx: number, cw: number, dir: number) => {
    for (let i = 0; i < cw; i++) {
      const fase = (i + (dir > 0 ? 0 : 3)) % 8;
      const c = fase < 2 ? '#4a1c28' : fase < 5 ? '#34121e' : '#22090f';
      const alto = dir > 0 ? 184 - Math.round(Math.max(0, (i - cw + 24) / 4)) : 184 - Math.round(Math.max(0, (24 - i) / 4));
      rect(x, cx + i, 8, 1, alto - 8, c);
    }
  };
  cortina(L, 56, 1);
  cortina(R - 56, 56, -1);
  // tie-back cords
  rect(x, 56, 110, 6, 4, '#8a6a30');
  rect(x, R - 62, 110, 6, 4, '#8a6a30');
  // valance
  rect(x, L, 8, R - L, 14, '#3e1220');
  for (let px = L; px < R; px += 16) {
    domo(x, px + 8, 30, 8, 8, '#3e1220');
    rect(x, px + 6, 24, 4, 2, '#8a6a30');
  }
  rect(x, L, 8, R - L, 2, '#5a1c2c');
  rect(x, L, 20, R - L, 1, '#8a6a30');
  tramado(x, L, 22, R - L, 8, '#000000', 4);
  // Dim the floor area so the stage reads plain
  rect(x, L, 150, R - L, 34, '#120d16');
  rect(x, L, 150, R - L, 1, '#241a28');
  for (const ly of [158, 168, 178]) rect(x, L, ly, R - L, 1, '#1a131e');
}
