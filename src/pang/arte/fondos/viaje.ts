// Stages 6 and 8 to 12: the farm, Ávila, Zaragoza, Jijona, Nevada and Las Vegas.
import { AREA } from '../../tipos';
import { type Azar, type Ctx, bruma, charco, cielo, disco, domo, edificios, elipse, entre, estrellas, halo, letras, linea, poli, punto, rect, tramado } from './base';

const L = AREA.izq;
const R = AREA.der;
const SUELO = AREA.suelo;

/** A zigzag ridge of mountains: heights between a and b above `base`, filled down to it. */
function sierra(x: Ctx, r: Azar, base: number, a: number, b: number, paso: number, c: string, nieve?: string) {
  const pts: Array<[number, number]> = [[L, base]];
  let px = L;
  while (px < R) {
    const h = entre(r, a, b);
    pts.push([px, base - h]);
    px += entre(r, paso, paso * 2);
  }
  pts.push([R, base - entre(r, a, b)], [R, base]);
  poli(x, pts, c);
  if (nieve) for (const p of pts.slice(1, -2)) if (base - p[1] > b - 4) poli(x, [[p[0] - 3, p[1] + 3], [p[0], p[1]], [p[0] + 3, p[1] + 3]], nieve, 9);
}

// ---------------------------------------------------------------------------
export function granja(x: Ctx, r: Azar) {
  cielo(x, 8, 140, ['#2a3064', '#3e3a74', '#5c4680', '#82507e', '#a45e74', '#bc6e66'], L, R);
  rect(x, L, 140, R - L, 12, '#bc6e66');
  estrellas(x, r, 14, 10, 40, ['#b0b8e8']);
  // Setting sun behind the hills (small and dim).
  disco(x, 150, 126, 11, '#c87a62');
  disco(x, 150, 126, 8, '#d49070');
  // The Madrid skyline, far and faint: four tall towers and low blocks.
  edificios(x, r, { base: 134, x0: 250, x1: R, hmin: 8, hmax: 20, wmin: 8, wmax: 14, cuerpo: '#5a4a7c', lado: '#5a4a7c', techo: '#6a5a8a', apagada: '#5a4a7c', luces: ['#8a7a9a'], prob: 0.1 });
  for (const [tx, th] of [[286, 46], [300, 52], [314, 44], [328, 48]]) {
    rect(x, tx, 134 - th, 8, th, '#5e4e82');
    rect(x, tx + 6, 134 - th, 2, th, '#6a5a8c');
    rect(x, tx, 134 - th, 8, 1, '#8070a0');
  }
  // Hills in two planes.
  sierra(x, r, 140, 8, 20, 40, '#3e3868');
  bruma(x, 112, 140, '#a45e74', 2, 7);
  sierra(x, r, 152, 6, 14, 60, '#2a3440');
  rect(x, L, 148, R - L, 8, '#233428');
  // Barn on the left: gambrel roof, X door, hayloft.
  rect(x, 14, 94, 92, 58, '#7a3030');
  rect(x, 14, 94, 3, 58, '#5e2226');
  for (let px = 18; px < 106; px += 4) rect(x, px, 96, 1, 56, '#6a2a2c');
  tramado(x, 14, 94, 92, 58, '#000000', 3);
  poli(x, [[10, 94], [30, 76], [90, 76], [110, 94]], '#3a2a34');
  poli(x, [[10, 94], [30, 76], [34, 76], [16, 94]], '#4a3a46');
  rect(x, 30, 76, 60, 1, '#5a4a56');
  rect(x, 48, 82, 24, 14, '#1c0e12');
  rect(x, 46, 80, 28, 2, '#c0b4b0');
  rect(x, 46, 96, 28, 1, '#c0b4b0');
  rect(x, 38, 114, 44, 38, '#4a1e22');
  rect(x, 36, 112, 48, 2, '#c0b4b0');
  rect(x, 36, 112, 2, 40, '#c0b4b0');
  rect(x, 82, 112, 2, 40, '#c0b4b0');
  linea(x, 38, 114, 82, 150, '#c0b4b0');
  linea(x, 82, 114, 38, 150, '#c0b4b0');
  rect(x, 60, 112, 2, 40, '#c0b4b0');
  // Silo beside it.
  rect(x, 110, 82, 14, 70, '#6a6a7e');
  rect(x, 110, 82, 3, 70, '#8a8a9c');
  rect(x, 121, 82, 3, 70, '#4a4a5c');
  domo(x, 117, 82, 7, 6, '#8a8a9c');
  for (let k = 94; k < 150; k += 10) rect(x, 110, k, 14, 1, '#4a4a5c');
  // Haystacks.
  for (const [hx, hh] of [[160, 20], [190, 15]]) {
    poli(x, [[hx - 15, 152], [hx - 4, 152 - hh], [hx + 4, 152 - hh], [hx + 15, 152]], '#7a6038');
    poli(x, [[hx - 15, 152], [hx - 4, 152 - hh], [hx - 1, 152 - hh], [hx - 6, 152]], '#9a7e48');
    poli(x, [[hx + 6, 152], [hx + 4, 152 - hh], [hx + 15, 152]], '#54402a');
    for (let k = 0; k < 7; k++) rect(x, hx - 11 + entre(r, 0, 20), 152 - entre(r, 2, hh - 2), 3, 1, '#5e4a2e');
  }
  // Pig pen on the right: mud, fence, two pigs and a trough, and the weighing scale.
  elipse(x, 290, 150, 44, 5, '#3a2a22');
  tramado(x, 248, 146, 84, 8, '#2a1c16', 5);
  const cerdo = (px: number, py: number, dir: number) => {
    elipse(x, px, py, 8, 5, '#a87880');
    elipse(x, px - dir, py - 2, 6, 2, '#c08a92');
    disco(x, px + dir * 8, py, 3, '#a87880');
    rect(x, px + dir * 10, py, 2, 2, '#8a5a62');
    poli(x, [[px + dir * 6, py - 4], [px + dir * 8, py - 7], [px + dir * 9, py - 3]], '#8a5a62');
    rect(x, px - 5, py + 4, 2, 3, '#7a5058');
    rect(x, px + 3, py + 4, 2, 3, '#7a5058');
    punto(x, px + dir * 7, py - 1, '#101018');
  };
  cerdo(268, 146, 1);
  cerdo(316, 145, -1);
  rect(x, 284, 150, 14, 4, '#5a4230');
  for (let px = 244; px <= 336; px += 18) {
    rect(x, px, 132, 3, 24, '#6a4a34');
    rect(x, px, 132, 1, 24, '#8a6a4a');
  }
  rect(x, 244, 138, 95, 2, '#6a4a34');
  rect(x, 244, 146, 95, 2, '#6a4a34');
  rect(x, 244, 138, 95, 1, '#8a6a4a');
  // Weighing scale: low platform with a round dial on a post.
  rect(x, 214, 148, 22, 4, '#4a4e5a');
  rect(x, 214, 148, 22, 1, '#7a808e');
  rect(x, 224, 128, 3, 20, '#4a4e5a');
  disco(x, 225, 126, 7, '#2a2e38');
  disco(x, 225, 126, 5, '#d0d4d8');
  linea(x, 225, 126, 228, 122, '#8a2a2a');
  // Ground: dirt with some tufts, plain.
  rect(x, L, 152, R - L, SUELO - 152, '#3a2e2a');
  tramado(x, L, 152, R - L, 10, '#2a2420', 5);
  tramado(x, L, 166, R - L, 18, '#2e2622', 4);
  for (let i = 0; i < 40; i++) {
    const tx = entre(r, L + 2, R - 4);
    const ty = entre(r, 156, 180);
    rect(x, tx, ty, 1, 2, '#3c4a2a');
    rect(x, tx + 2, ty + 1, 1, 1, '#3c4a2a');
  }
  elipse(x, 90, 165, 20, 3, '#2a2220');
}

// ---------------------------------------------------------------------------
export function avila(x: Ctx, r: Azar) {
  cielo(x, 8, 134, ['#262c64', '#363876', '#4e4280', '#6e4a82', '#965878', '#b86c6a'], L, R);
  estrellas(x, r, 20, 10, 50, ['#b0b8e8', '#8890c8']);
  sierra(x, r, 126, 12, 34, 50, '#403c70', '#8a88b4');
  bruma(x, 94, 126, '#965878', 2, 8);
  // The cathedral's apse in the middle: battlemented cylinder, two towers, spire.
  const cat = '#4a4062';
  const catL = '#7a5a66';
  rect(x, 170, 84, 44, 44, cat);
  rect(x, 170, 84, 3, 44, catL);
  for (let px = 170; px < 214; px += 8) rect(x, px, 78, 5, 7, cat);
  for (let py = 94; py < 124; py += 12) for (let px = 178; px < 210; px += 12) {
    rect(x, px, py, 2, 6, '#c08a58');
    rect(x, px, py, 2, 1, cat);
  }
  rect(x, 222, 50, 14, 78, cat);
  rect(x, 222, 50, 2, 78, catL);
  poli(x, [[220, 50], [229, 30], [238, 50]], cat);
  rect(x, 228, 24, 2, 8, cat);
  rect(x, 227, 27, 4, 1, cat);
  rect(x, 226, 64, 6, 10, '#241c34');
  rect(x, 150, 66, 14, 62, cat);
  rect(x, 150, 66, 2, 62, catL);
  for (let px = 150; px < 164; px += 5) rect(x, px, 62, 3, 5, cat);
  rect(x, 154, 80, 3, 8, '#c08a58');
  // The town wall, hazy and cool so the platforms read in front of it.
  const muro = '#54465a';
  rect(x, L, 104, R - L, 50, muro);
  rect(x, L, 104, R - L, 2, '#a07a6a');
  for (let px = L; px < R; px += 8) rect(x, px, 99, 5, 6, muro);
  for (let px = L; px < R; px += 8) rect(x, px, 99, 5, 1, '#a07a6a');
  for (let by = 112; by < 150; by += 7) {
    rect(x, L, by, R - L, 1, '#4a3c50');
    for (let px = L + ((by / 7) % 2) * 6; px < R; px += 12) rect(x, px, by + 1, 1, 6, '#4a3c50');
  }
  // Round towers with battlements and arrow slits.
  for (const tx of [26, 138, 244, 352]) {
    const tw = 24;
    rect(x, tx - tw / 2, 86, tw, 68, '#62505e');
    rect(x, tx - tw / 2, 86, 4, 68, '#8a6a68');
    rect(x, tx + tw / 2 - 5, 86, 5, 68, '#44384e');
    for (let px = tx - tw / 2; px < tx + tw / 2; px += 6) {
      rect(x, px, 80, 4, 7, '#62505e');
      rect(x, px, 80, 4, 1, '#8a6a68');
    }
    rect(x, tx - 1, 102, 2, 8, '#1a1428');
    rect(x, tx - 1, 124, 2, 8, '#1a1428');
    for (let by = 92; by < 150; by += 6) rect(x, tx - tw / 2 + 4, by, tw - 9, 1, '#4a3c50');
  }
  // Gate between the two central towers.
  rect(x, 179, 134, 24, 20, '#171326');
  domo(x, 191, 134, 12, 8, '#171326');
  rect(x, 179, 130, 24, 2, '#8a6a68');
  bruma(x, 70, 100, '#965878', 1, 5);
  // Ground: dusty track and scrub, plain.
  rect(x, L, 154, R - L, SUELO - 154, '#4a3c48');
  rect(x, L, 154, R - L, 2, '#2e2538');
  tramado(x, L, 156, R - L, 28, '#3e3244', 4);
  for (let i = 0; i < 30; i++) {
    const tx = entre(r, L + 2, R - 6);
    const ty = entre(r, 160, 180);
    rect(x, tx, ty, 3, 1, '#5e5060');
    rect(x, tx + 1, ty - 1, 1, 1, '#5e5060');
  }
}

// ---------------------------------------------------------------------------
/** A streak of wind-torn cloud: long and thin, with ragged ends. */
function racha(x: Ctx, cx: number, cy: number, len: number, c: string, c2: string) {
  const a = cx - Math.floor(len / 2);
  rect(x, a, cy, len, 1, c);
  rect(x, a + Math.floor(len * 0.15), cy + 1, Math.floor(len * 0.7), 1, c2);
  tramado(x, a - 8, cy, 8, 1, c, 7);
  tramado(x, a + len, cy, 12, 1, c, 5);
  tramado(x, a + Math.floor(len * 0.15) - 6, cy + 1, 6, 1, c2, 6);
  tramado(x, a + Math.floor(len * 0.85), cy + 1, 10, 1, c2, 5);
}

export function zaragoza(x: Ctx, r: Azar) {
  cielo(x, 8, 140, ['#3c6498', '#4670a4', '#547eb0', '#668ebc', '#7ca2c8', '#92b4d0'], L, R);
  // Windswept clouds: long streaks, some slightly stacked.
  for (let i = 0; i < 16; i++) {
    const cy = entre(r, 14, 100);
    const len = entre(r, 40, 130);
    racha(x, entre(r, L + 20, R - 20), cy, len, '#b4c6da', '#8fa8c4');
    if (r() < 0.5) racha(x, entre(r, L + 20, R - 20), cy + 3, entre(r, 20, 60), '#a0b6cc', '#8fa8c4');
  }
  // City on the left, pale and hazy.
  edificios(x, r, { base: 130, x0: L, x1: 148, hmin: 20, hmax: 46, wmin: 14, wmax: 22, cuerpo: '#8a8aa0', lado: '#7a7a92', techo: '#a0a0b4', apagada: '#6e6e88', luces: ['#6e6e88'], prob: 0.6 });
  // The Basílica del Pilar: brick body, four towers, tiled domes.
  const ladr = '#9a6a5a';
  const ladrS = '#745044';
  const ladrL = '#b48270';
  rect(x, 164, 92, 160, 40, ladr);
  rect(x, 164, 92, 160, 3, ladrL);
  rect(x, 164, 124, 160, 8, ladrS);
  for (let px = 170; px < 320; px += 10) {
    rect(x, px, 102, 4, 16, '#5a3a38');
    domo(x, px + 2, 102, 2, 3, '#5a3a38');
  }
  // Domes: tiles in blue, white, green and a touch of ochre.
  const tejas = (cx: number, base: number, rx: number, ry: number) => {
    domo(x, cx, base, rx, ry, '#2e5a98');
    for (let dy = 0; dy < ry; dy++) {
      const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
      for (let px = cx - w; px < cx + w; px++) {
        const t = ((px - cx + 200) >> 1) + dy;
        if (t % 4 === 0) punto(x, px, base - 1 - dy, '#d4dce4');
        else if (t % 4 === 2) punto(x, px, base - 1 - dy, '#3a8a7e');
      }
    }
    rect(x, cx - rx, base - 1, rx * 2, 1, '#1e3a68');
    rect(x, cx - 1, base - ry - 4, 2, 4, '#c8a44a');
    punto(x, cx, base - ry - 5, '#d8dce4');
  };
  rect(x, 222, 74, 36, 20, ladr);
  rect(x, 222, 74, 36, 2, ladrL);
  tejas(240, 76, 18, 17);
  for (const cx of [196, 284]) {
    rect(x, cx - 11, 82, 22, 12, ladr);
    tejas(cx, 84, 10, 11);
  }
  for (const cx of [176, 208, 272, 304]) tejas(cx, 94, 6, 6);
  // Four towers with tiled spires.
  for (const tx of [148, 168, 308, 328]) {
    rect(x, tx - 6, 62, 12, 70, ladr);
    rect(x, tx - 6, 62, 2, 70, ladrL);
    rect(x, tx + 4, 62, 2, 70, ladrS);
    rect(x, tx - 7, 60, 14, 3, ladrL);
    for (let py = 70; py < 126; py += 12) rect(x, tx - 2, py, 4, 6, '#3a2e3a');
    tejas(tx, 60, 7, 9);
    rect(x, tx - 1, 42, 2, 6, '#c8a44a');
  }
  // The stone bridge across the whole width: parapet, deck, seven arches.
  rect(x, L, 126, R - L, 4, '#8a7e78');
  rect(x, L, 126, R - L, 1, '#b4a89e');
  rect(x, L, 130, R - L, 18, '#7a6e6c');
  tramado(x, L, 130, R - L, 18, '#5a504e', 4);
  for (let i = 0; i < 7; i++) {
    const cx = 36 + i * 52;
    domo(x, cx, 148, 19, 15, '#2a5a78');
    tramado(x, cx - 19, 138, 38, 10, '#1a3e58', 7);
  }
  // River and quay: plain.
  rect(x, L, 148, R - L, 12, '#3a6a88');
  tramado(x, L, 148, R - L, 5, '#2a5a78', 6);
  for (let i = 0; i < 60; i++) rect(x, L + entre(r, 0, R - L - 8), entre(r, 149, 158), entre(r, 3, 9), 1, '#7aa4b8');
  rect(x, L, 160, R - L, SUELO - 160, '#6a6e7c');
  rect(x, L, 160, R - L, 2, '#9a9ea8');
  tramado(x, L, 162, R - L, 22, '#555a68', 4);
}

// ---------------------------------------------------------------------------
export function jijona(x: Ctx, r: Azar) {
  cielo(x, 8, 152, ['#4a80b8', '#5a90c0', '#6a9ec8', '#7eaed0', '#94bcd6'], L, R);
  // Two small clouds, flat-bottomed.
  for (const [cx, cy] of [[60, 40], [310, 56]]) {
    elipse(x, cx, cy, 16, 4, '#d4e0ea');
    disco(x, cx - 6, cy - 3, 5, '#d4e0ea');
    disco(x, cx + 5, cy - 4, 6, '#d4e0ea');
    rect(x, cx - 16, cy + 3, 33, 2, '#a8bacc');
  }
  // Dry hills, two planes with terraces.
  sierra(x, r, 138, 16, 36, 60, '#8a7a84');
  bruma(x, 100, 138, '#94bcd6', 4, 9);
  sierra(x, r, 150, 8, 22, 70, '#8a7456');
  for (let k = 0; k < 4; k++) tramado(x, L, 130 + k * 5, R - L, 1, '#6a5640', 7);
  // The town: white houses stepping up the hill on the left.
  const casa = (cx: number, base: number, w: number, h: number, teja: string) => {
    rect(x, cx, base - h, w, h, '#d4ccc0');
    rect(x, cx + w - 3, base - h, 3, h, '#a8a0a2');
    poli(x, [[cx - 1, base - h], [cx + w + 1, base - h], [cx + w - 2, base - h - 4], [cx + 2, base - h - 4]], teja);
    rect(x, cx + 3, base - h + 4, 2, 3, '#3a5a8a');
    if (w > 12) rect(x, cx + 8, base - h + 4, 2, 3, '#3a5a8a');
    rect(x, cx + 2, base - 5, 3, 5, '#6a4a3a');
  };
  casa(18, 140, 16, 16, '#9a5a42');
  casa(36, 134, 14, 14, '#9a5a42');
  casa(54, 140, 18, 18, '#8a4e3a');
  casa(76, 130, 14, 14, '#9a5a42');
  casa(94, 140, 16, 16, '#8a4e3a');
  casa(112, 134, 14, 12, '#9a5a42');
  // Bell tower with a tiled dome.
  rect(x, 140, 82, 12, 60, '#d0c8bc');
  rect(x, 148, 82, 4, 60, '#a8a0a2');
  rect(x, 143, 92, 4, 8, '#3a3a52');
  domo(x, 146, 82, 8, 8, '#3a74a8');
  rect(x, 145, 70, 2, 4, '#d4dce4');
  // The turrón factory on the right: sawtooth roof, brick chimney with a thin smoke.
  rect(x, 266, 104, 80, 38, '#c4b8a4');
  rect(x, 266, 104, 80, 2, '#d8ccb8');
  rect(x, 340, 104, 6, 38, '#9a8e84');
  for (let k = 0; k < 4; k++) poli(x, [[268 + k * 20, 104], [268 + k * 20, 94], [286 + k * 20, 104]], '#8a8890');
  rect(x, 272, 114, 14, 10, '#3a5a8a');
  rect(x, 292, 114, 14, 10, '#3a5a8a');
  rect(x, 312, 114, 14, 10, '#3a5a8a');
  rect(x, 288, 126, 24, 16, '#4a3a34');
  rect(x, 350, 46, 10, 96, '#9a5a46');
  rect(x, 358, 46, 2, 96, '#784438');
  rect(x, 350, 46, 10, 3, '#b87058');
  rect(x, 350, 56, 10, 2, '#d4ccc0');
  for (let k = 0; k < 6; k++) disco(x, 356 + k * 4 - (k > 2 ? 2 : 0), 40 - k * 6, 3 + k, k % 2 ? '#b4c4d2' : '#c4d0da');
  // Almond trees: trunk, round crown with blossom dots.
  const almendro = (tx: number, base: number, rad: number) => {
    rect(x, tx - 1, base - rad, 3, rad, '#4a3a2e');
    disco(x, tx, base - rad - 3, rad, '#5e7650');
    disco(x, tx - rad + 3, base - rad, Math.round(rad * 0.7), '#5e7650');
    disco(x, tx + rad - 3, base - rad - 1, Math.round(rad * 0.7), '#5e7650');
    disco(x, tx - 2, base - rad - 6, Math.round(rad * 0.65), '#7a9262');
    for (let i = 0; i < rad * 2; i++) punto(x, tx - rad + entre(r, 0, rad * 2), base - 2 * rad - 3 + entre(r, 0, rad * 2 - 4), '#ead4d8');
    elipse(x, tx, base, rad, 2, '#6a5a44');
  };
  almendro(184, 150, 9);
  almendro(222, 148, 7);
  almendro(260, 152, 10);
  almendro(26, 152, 8);
  // Plain dry earth for the walking area.
  rect(x, L, 150, R - L, SUELO - 150, '#7a6650');
  tramado(x, L, 152, R - L, 6, '#8a7458', 6);
  tramado(x, L, 164, R - L, 20, '#6a5842', 5);
  for (let i = 0; i < 36; i++) rect(x, entre(r, L, R - 5), entre(r, 156, 181), entre(r, 2, 4), 1, '#5e4e3a');
}

// ---------------------------------------------------------------------------
export function nevada(x: Ctx, r: Azar) {
  cielo(x, 8, 130, ['#4472aa', '#5282b4', '#6692bc', '#82a6c2', '#a4b8c0', '#c4c2b4'], L, R);
  // Distant mountains in blue haze, then nearer ones, then the mesas.
  sierra(x, r, 126, 10, 26, 36, '#7c88ac');
  sierra(x, r, 128, 6, 16, 40, '#8a7e98');
  bruma(x, 96, 128, '#c4c2b4', 4, 10);
  const mesa = (mx: number, w: number, top: number, base: number) => {
    const cuerpo = '#8a4e3e';
    poli(x, [[mx, base], [mx + 4, top + 8], [mx + 8, top], [mx + w - 8, top], [mx + w - 4, top + 8], [mx + w, base]], cuerpo);
    rect(x, mx + 8, top, w - 16, 3, '#b0705a');
    poli(x, [[mx + w - 12, top + 3], [mx + w - 8, top + 3], [mx + w - 4, top + 8], [mx + w, base], [mx + w - 16, base]], '#64352e');
    for (let py = top + 9; py < base - 2; py += 7) {
      rect(x, mx + 5, py, w - 14, 2, '#7a4034');
      rect(x, mx + 5, py + 2, w - 14, 1, '#9a5a46');
    }
    for (let px = mx + 12; px < mx + w - 12; px += 17) rect(x, px, top + 3, 2, 10 + (px % 7), '#74382f');
    tramado(x, mx, base - 14, w, 14, '#a4a4a8', 4);
  };
  mesa(24, 92, 62, 128);
  mesa(278, 86, 78, 128);
  mesa(226, 30, 88, 128);
  // Heat haze bands along the horizon.
  for (let k = 0; k < 6; k++) {
    const yy = 118 + k * 2;
    for (let px = L; px < R; px += 24) tramado(x, px + ((k * 7) % 11), yy, entre(r, 12, 22), 1, '#e0d8c4', 6);
  }
  // Desert floor.
  rect(x, L, 128, R - L, SUELO - 128, '#9a7c5e');
  tramado(x, L, 128, R - L, 10, '#c4a884', 5);
  tramado(x, L, 150, R - L, 34, '#7a6048', 4);
  for (let i = 0; i < 60; i++) punto(x, entre(r, L, R - 1), entre(r, 130, 182), r() < 0.5 ? '#7a6048' : '#b49470');
  // Road in perspective to the vanishing point.
  poli(x, [[190, 128], [202, 128], [330, 184], [66, 184]], '#3a3a44');
  poli(x, [[190, 128], [192, 128], [86, 184], [66, 184]], '#5a5a62');
  poli(x, [[200, 128], [202, 128], [330, 184], [306, 184]], '#5a5a62');
  for (const [dy, dh, dw] of [[132, 2, 1], [138, 3, 2], [146, 4, 2], [156, 5, 3], [168, 7, 3], [180, 4, 3]]) rect(x, 196 - Math.floor(dw / 2), dy, dw, dh, '#b0a05a');
  // Saguaros, dim and small.
  const cacto = (cx: number, base: number, h: number) => {
    rect(x, cx - 2, base - h, 4, h, '#2e5a3e');
    rect(x, cx - 2, base - h, 1, h, '#3e7a52');
    rect(x, cx - 8, base - h * 0.6, 3, 8, '#2e5a3e');
    rect(x, cx - 8, base - h * 0.6 + 6, 7, 2, '#2e5a3e');
    rect(x, cx + 5, base - h * 0.75, 3, 8, '#2e5a3e');
    rect(x, cx + 2, base - h * 0.75 + 6, 6, 2, '#2e5a3e');
    rect(x, cx - 2, base - h - 1, 4, 1, '#3e7a52');
  };
  cacto(26, 158, 34);
  cacto(356, 156, 30);
  cacto(112, 140, 16);
  cacto(288, 140, 14);
  for (const [bx, bw] of [[46, 12], [326, 14]]) {
    elipse(x, bx, 168, bw, 3, '#6a5240');
    elipse(x, bx, 166, bw - 3, 3, '#8a6e58');
  }
}

// ---------------------------------------------------------------------------
export function vegas(x: Ctx, r: Azar) {
  cielo(x, 8, 140, ['#06081a', '#0a0c26', '#10103a', '#1a1250', '#2a1a5c'], L, R);
  estrellas(x, r, 90, 10, 100, ['#e8eaff', '#a8b0e8', '#7a80c0', '#ffd8e8']);
  sierra(x, r, 134, 6, 20, 50, '#16163e');
  // Far towers with many small lights and neon outlines.
  edificios(x, r, { base: 150, x0: L, x1: R, hmin: 30, hmax: 80, wmin: 14, wmax: 24, cuerpo: '#10102c', lado: '#161640', techo: '#22225a', apagada: '#161638', luces: ['#d8b060', '#5a98d0', '#d85aa0'], prob: 0.2, sep: 1 });
  bruma(x, 70, 150, '#2a1a5c', 2, 8);
  // Left casino: wide marquee, vertical neon, rows of windows.
  rect(x, L, 70, 108, 82, '#1a1038');
  rect(x, L, 70, 108, 2, '#3a2a70');
  rect(x, L + 100, 70, 8, 82, '#241650');
  for (let wy = 80; wy < 130; wy += 8) for (let wx = L + 6; wx < L + 94; wx += 7) rect(x, wx, wy, 3, 4, r() < 0.3 ? '#c8a050' : '#241a48');
  for (let py = 74; py < 150; py += 2) punto(x, L + 96, py, '#3ac8e0');
  rect(x, L + 8, 132, 84, 4, '#e03a8a');
  rect(x, L + 8, 136, 84, 16, '#0c0820');
  for (let px = L + 12; px < L + 90; px += 12) {
    domo(x, px + 4, 152, 5, 12, '#2a1a58');
    domo(x, px + 4, 152, 3, 9, '#0c0820');
  }
  // Right: a glass pyramid with a faint beam, and a dome.
  poli(x, [[292, 150], [336, 74], [380, 150]], '#12123a');
  poli(x, [[336, 74], [380, 150], [336, 150]], '#0c0c2a');
  for (let k = 0; k < 8; k++) tramado(x, 300 + k * 3, 150 - k * 9, 72 - k * 6, 1, '#3a5ab0', 6);
  linea(x, 292, 150, 336, 74, '#3ac8e0');
  linea(x, 380, 150, 336, 74, '#3ac8e0');
  tramado(x, 333, 8, 6, 66, '#4aa8e0', 3);
  domo(x, 280, 150, 14, 18, '#1a1048');
  for (let k = 0; k < 5; k++) tramado(x, 268, 134 + k * 3, 24, 1, '#a04aa0', 6);
  // The welcome sign: a diamond marquee with bulbs and pixel letters, on a pole.
  const sx = 194;
  const sy = 72;
  rect(x, sx - 2, sy + 22, 4, 80, '#14102c');
  rect(x, sx - 1, sy + 22, 1, 80, '#34286a');
  rect(x, sx - 14, sy + 36, 28, 8, '#14102c');
  rect(x, sx - 12, sy + 38, 24, 1, '#3ac8e0');
  rect(x, sx - 12, sy + 41, 24, 1, '#e03a8a');
  halo(x, sx, sy, 56, '#3a1e58', 3);
  poli(x, [[sx, sy - 28], [sx + 48, sy], [sx, sy + 28], [sx - 48, sy]], '#12082a');
  poli(x, [[sx, sy - 24], [sx + 42, sy], [sx, sy + 24], [sx - 42, sy]], '#1c0e3c');
  // bulbs along the four edges
  for (let k = 0; k <= 8; k++) {
    const u = k / 8;
    for (const [ax, ay, bx, by] of [[sx, sy - 27, sx + 47, sy], [sx + 47, sy, sx, sy + 27], [sx, sy + 27, sx - 47, sy], [sx - 47, sy, sx, sy - 27]]) {
      punto(x, Math.round(ax + (bx - ax) * u), Math.round(ay + (by - ay) * u), k % 2 ? '#f0e4b8' : '#8a7a5a');
    }
  }
  letras(x, 'VEGAS', sx - 19 - 1, sy - 4, 2, '#7a1e58');
  letras(x, 'VEGAS', sx - 19, sy - 5, 2, '#ff5aa8');
  rect(x, sx - 30, sy + 9, 60, 1, '#3ac8e0');
  // Palms: dark trunks, fronds with a magenta rim.
  const palmera = (px: number, base: number, h: number, dir: number) => {
    const noche = '#0a0818';
    let cx = px;
    for (let t = 0; t < h; t++) {
      cx = px + Math.round(Math.sin((t / h) * 1.6) * 7 * dir);
      rect(x, cx - 1, base - t, t > h - 8 ? 2 : 3, 1, noche);
    }
    const ty = base - h;
    // fronds: arcs that rise, then droop, with short feathers hanging from them
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + ((k + 0.5) / 9) * Math.PI;
      const len = 24 + (k % 3) * 3;
      for (let u = 0; u <= 1; u += 0.06) {
        const fx = Math.round(cx + Math.cos(a) * len * u);
        const fy = Math.round(ty + Math.sin(a) * len * u * 0.55 + len * u * u * (0.3 + 0.7 * Math.abs(Math.cos(a))));
        rect(x, fx, fy, 2, 2, noche);
        if (u > 0.2) rect(x, fx, fy + 2, 1, 2 + (k % 2), noche);
        if (u > 0.3 && k % 2 === 0 && Math.sin(a) < -0.3) punto(x, fx, fy - 1, '#8a2a6a');
      }
    }
    disco(x, cx, ty + 1, 2, noche);
  };
  palmera(128, 176, 52, -1);
  palmera(262, 176, 46, 1);
  palmera(354, 178, 62, -1);
  // Street: dark, with neon reflections kept low.
  rect(x, L, 150, R - L, SUELO - 150, '#150e2c');
  rect(x, L, 150, R - L, 2, '#2a1c54');
  tramado(x, L, 152, R - L, 32, '#0c0820', 5);
  charco(x, 100, 164, 50, 6, '#a02a70', 3);
  charco(x, 296, 164, 56, 6, '#2a7a9a', 3);
  charco(x, 194, 170, 36, 5, '#8a5a30', 2);
}
