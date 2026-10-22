// Stages 1, 2 and 7: the street at dusk, Fran's street at night and Madrid Río at night.
import { AREA } from '../../tipos';
import { type Azar, type Ctx, bruma, charco, cielo, disco, domo, edificios, entre, estrellas, halo, letras, linea, poli, punto, rect, tramado } from './base';

const L = AREA.izq;
const R = AREA.der;
const SUELO = AREA.suelo;

/** A tree: dark blob of discs with a lit upper left. */
function arbol(x: Ctx, r: Azar, cx: number, base: number, rad: number, oscuro: string, medio: string, claro: string) {
  rect(x, cx - 1, base - rad, 3, rad, '#1a1a24');
  disco(x, cx, base - rad - 2, rad, oscuro);
  disco(x, cx - rad + 3, base - rad + 1, Math.round(rad * 0.7), oscuro);
  disco(x, cx + rad - 3, base - rad, Math.round(rad * 0.7), oscuro);
  disco(x, cx - 2, base - rad - 4, Math.round(rad * 0.7), medio);
  for (let i = 0; i < rad * 2; i++) punto(x, cx - rad + entre(r, 0, rad), base - 2 * rad + entre(r, 0, rad), claro);
}

/** A street lamp: pole, head, halo of light and a pool on the ground. */
function farola(x: Ctx, px: number, top: number, base: number, luz: string, halo1: string) {
  halo(x, px + 3, top + 2, 15, halo1, 7);
  rect(x, px, top + 3, 2, base - top - 3, '#14121c');
  rect(x, px + 1, top + 3, 1, base - top - 3, '#2a2836');
  rect(x, px, top + 1, 7, 2, '#14121c');
  rect(x, px + 4, top + 3, 4, 2, luz);
  rect(x, px + 5, top + 5, 2, 1, halo1);
  rect(x, px - 2, base - 3, 6, 3, '#14121c');
  charco(x, px + 5, base + 6, 26, 5, halo1, 5);
}

// ---------------------------------------------------------------------------
export function usera(x: Ctx, r: Azar) {
  cielo(x, 8, 152, ['#1b2450', '#262d62', '#3a3470', '#55407a', '#7a4a80', '#9a5a7a'], L, R);
  estrellas(x, r, 36, 10, 70, ['#c8d0ff', '#8890c8', '#e8e8ff']);
  // A small pale moon, top right.
  disco(x, 338, 30, 6, '#b8c0e0');
  disco(x, 340, 28, 5, '#8a92c0');
  disco(x, 336, 31, 4, '#c8d0ee');
  // Far blocks, hazy.
  edificios(x, r, { base: 152, x0: L, x1: R, hmin: 40, hmax: 76, wmin: 14, wmax: 26, cuerpo: '#34346a', lado: '#3c3c74', techo: '#44447c', apagada: '#34346a', luces: ['#6a5a8e', '#7a6a8a'], prob: 0.18, sep: 1 });
  bruma(x, 80, 152, '#7a4a80', 2, 10);
  // Mid blocks: flats at both sides, lower ones behind the park.
  edificios(x, r, { base: 152, x0: L, x1: 126, hmin: 70, hmax: 112, wmin: 20, wmax: 30, cuerpo: '#171a36', lado: '#20244a', techo: '#2c3060', apagada: '#1d2142', luces: ['#d8a24e', '#d8a24e', '#8ab0e0'], prob: 0.34, sep: 2 });
  edificios(x, r, { base: 152, x0: 270, x1: R, hmin: 70, hmax: 118, wmin: 20, wmax: 30, cuerpo: '#171a36', lado: '#20244a', techo: '#2c3060', apagada: '#1d2142', luces: ['#d8a24e', '#d8a24e', '#8ab0e0'], prob: 0.34, sep: 2 });
  edificios(x, r, { base: 152, x0: 126, x1: 270, hmin: 34, hmax: 56, wmin: 18, wmax: 28, cuerpo: '#1d2044', lado: '#262a54', techo: '#323668', apagada: '#232650', luces: ['#d8a24e', '#8ab0e0'], prob: 0.28, sep: 1 });
  // The park: lawn bank and trees.
  rect(x, L, 146, R - L, 8, '#1b3428');
  tramado(x, L, 146, R - L, 3, '#2a4a36', 6);
  arbol(x, r, 130, 150, 11, '#14301f', '#1f4a2c', '#2e5e38');
  arbol(x, r, 268, 150, 12, '#14301f', '#1f4a2c', '#2e5e38');
  arbol(x, r, 148, 150, 8, '#112a1b', '#1b3f28', '#2a5434');
  arbol(x, r, 251, 150, 8, '#112a1b', '#1b3f28', '#2a5434');
  // Ground: pavement, curb, plain.
  rect(x, L, 154, R - L, SUELO - 154, '#2a2a4a');
  rect(x, L, 154, R - L, 1, '#4a4a70');
  rect(x, L, 155, R - L, 3, '#34345a');
  tramado(x, L, 160, R - L, 24, '#1f1f3a', 4);
  // The dragon of the park: a red tube coiling in and out of the lawn, gold spikes on
  // its back, whiskers and a horned head up on the right.
  const cuerpo = '#a02a36';
  const sombra = '#6e1c2a';
  const luz = '#c4474e';
  const oro = '#d4a23e';
  const tubo = (px: number, py: number, rad: number) => {
    disco(x, px, py, rad, sombra);
    disco(x, px - 1, py - 1, rad - 1, cuerpo);
    if (rad > 3) disco(x, px - 2, py - 3, Math.max(1, rad - 4), luz);
  };
  const ondas: Array<[number, number]> = [];
  for (let px = 134; px <= 232; px += 2) {
    const u = (px - 134) / 24;
    const alto = Math.abs(Math.sin(u * Math.PI));
    ondas.push([px, 152 - Math.round(alto * 17)]);
  }
  // The coils sink into the lawn: nothing is drawn below its edge.
  x.save();
  x.beginPath();
  x.rect(L, 8, R - L, 150 - 8);
  x.clip();
  ondas.forEach(([px, py], i) => {
    const rad = 3 + Math.min(4, Math.round(i / 5));
    tubo(px, py, rad);
  });
  // gold spikes along the crests, belly scales on the lawn side
  ondas.forEach(([px, py], i) => {
    const rad = 3 + Math.min(4, Math.round(i / 5));
    if (i % 3 === 0) poli(x, [[px - 2, py - rad + 1], [px, py - rad - 4], [px + 2, py - rad + 1]], oro);
    if (i % 4 === 1) punto(x, px, py + 1, sombra);
  });
  x.restore();
  // neck rising from the last hump, curving towards the head
  for (let t = 0; t <= 24; t++) {
    const nx = 232 + Math.round(Math.sin(t / 7) * 4);
    const ny = 150 - t * 2;
    tubo(nx, ny, 5);
    if (t % 3 === 0) poli(x, [[nx - 4, ny + 1], [nx - 10, ny - 2], [nx - 4, ny - 3]], oro);
  }
  // head: snout, open jaw, horns, eye, mane and whiskers
  rect(x, 228, 96, 22, 12, cuerpo);
  rect(x, 250, 100, 10, 6, cuerpo);
  rect(x, 250, 106, 8, 3, sombra);
  rect(x, 228, 96, 22, 2, luz);
  rect(x, 228, 106, 22, 2, sombra);
  rect(x, 258, 100, 3, 2, '#1a0a10');
  rect(x, 237, 99, 4, 4, '#f0e8d8');
  rect(x, 239, 100, 2, 2, '#101018');
  poli(x, [[230, 96], [224, 86], [236, 95]], oro);
  poli(x, [[240, 95], [238, 85], [247, 95]], oro);
  poli(x, [[226, 100], [218, 104], [226, 110]], oro);
  linea(x, 260, 104, 270, 108, oro);
  linea(x, 260, 106, 268, 114, oro);
  linea(x, 258, 108, 262, 118, oro);
  punto(x, 255, 106, '#f0e8d8');
  punto(x, 252, 106, '#f0e8d8');
  // lamps with sodium light
  farola(x, 100, 82, 154, '#e8b060', '#8a6a4a');
  farola(x, 292, 88, 154, '#e8b060', '#8a6a4a');
}

// ---------------------------------------------------------------------------
export function calle(x: Ctx, r: Azar) {
  cielo(x, 8, 150, ['#080c20', '#0d1230', '#141a3c', '#1d2048', '#2a2650'], L, R);
  estrellas(x, r, 26, 10, 60, ['#aab4e0', '#7078a8']);
  disco(x, 340, 30, 6, '#a8b2d8');
  disco(x, 342, 28, 5, '#7a84b0');
  // Far blocks.
  edificios(x, r, { base: 152, x0: L, x1: R, hmin: 50, hmax: 90, wmin: 16, wmax: 28, cuerpo: '#171c3a', lado: '#1c2244', techo: '#242a50', apagada: '#171c3a', luces: ['#8a7048', '#586890'], prob: 0.14, sep: 1 });
  bruma(x, 70, 152, '#2a2650', 2, 9);

  // Left building: brick, balconies, shutters.
  const izq = (bx: number, bw: number, top: number, brick: string, junta: string, luz: string) => {
    rect(x, bx, top, bw, 152 - top, brick);
    for (let by = top + 2; by < 150; by += 4) {
      rect(x, bx, by, bw, 1, junta);
      for (let px = bx + ((by / 4) % 2) * 3; px < bx + bw; px += 6) rect(x, px, by + 1, 1, 3, junta);
    }
    tramado(x, bx, top, bw, 152 - top, '#000000', 3);
    rect(x, bx, top, bw, 3, '#4a3438');
    rect(x, bx, top + 3, bw, 1, '#1a1018');
    for (let wy = top + 12; wy < 120; wy += 30) {
      for (let wx = bx + 8; wx < bx + bw - 14; wx += 26) {
        rect(x, wx - 1, wy - 1, 12, 20, '#120c18');
        const on = r() < 0.5;
        rect(x, wx, wy, 10, 18, on ? luz : '#1f2442');
        if (on) tramado(x, wx, wy + 9, 10, 9, '#8a5a2a', 6);
        rect(x, wx + 4, wy, 1, 18, '#120c18');
        rect(x, wx - 3, wy + 17, 16, 2, '#2a1a20');
        rect(x, wx - 3, wy + 19, 16, 1, '#120c18');
        // shutters
        rect(x, wx - 3, wy, 2, 17, '#2e4a3a');
        rect(x, wx + 11, wy, 2, 17, '#2e4a3a');
      }
    }
  };
  izq(L, 120, 36, '#3a2428', '#2a1a20', '#c08a3a');
  izq(268, R - 268, 48, '#2c3050', '#20243e', '#7a9ac8');
  // Shop under the right building: cold bazaar light.
  rect(x, 290, 118, 54, 34, '#10142a');
  rect(x, 294, 122, 46, 26, '#4a5a7e');
  tramado(x, 294, 122, 46, 26, '#a8b8d8', 4);
  rect(x, 294, 122, 46, 2, '#d8e2f4');
  for (let px = 298; px < 338; px += 8) rect(x, px, 130, 5, 18, '#2a3452');
  rect(x, 288, 114, 58, 4, '#d8323a');
  rect(x, 288, 118, 58, 1, '#7a1a22');

  // Bar del Brío in the middle.
  const bx = 130;
  const bw = 134;
  rect(x, bx, 62, bw, 90, '#2a1a20');
  rect(x, bx, 62, bw, 3, '#4a3036');
  rect(x, bx, 65, bw, 1, '#120c18');
  tramado(x, bx, 66, bw, 86, '#000000', 3);
  for (let wx = bx + 12; wx < bx + bw - 14; wx += 30) {
    rect(x, wx - 1, 70, 14, 16, '#120c18');
    rect(x, wx, 71, 12, 14, r() < 0.5 ? '#9a6a30' : '#1f2442');
    rect(x, wx + 5, 71, 1, 14, '#120c18');
  }
  // Sign board with BRIO in amber pixels.
  rect(x, bx + 40, 90, 54, 22, '#120c18');
  rect(x, bx + 41, 91, 52, 1, '#4a3036');
  halo(x, bx + 67, 101, 34, '#8a5a24', 5);
  rect(x, bx + 40, 90, 54, 22, '#120c18');
  rect(x, bx + 41, 91, 52, 1, '#3a2a30');
  rect(x, bx + 41, 110, 52, 1, '#3a2a30');
  letras(x, 'BRIO', bx + 45, 94, 3, '#7a4a20');
  letras(x, 'BRIO', bx + 44, 93, 3, '#f4b848');
  // Awning and window glowing amber.
  rect(x, bx + 8, 114, bw - 16, 5, '#7a2a30');
  for (let px = bx + 8; px < bx + bw - 8; px += 8) rect(x, px, 114, 4, 5, '#a8444a');
  rect(x, bx + 8, 119, bw - 16, 1, '#2a1018');
  rect(x, bx + 14, 122, 56, 30, '#120c18');
  rect(x, bx + 16, 124, 52, 28, '#a8702e');
  tramado(x, bx + 16, 124, 52, 28, '#c88a3a', 7);
  tramado(x, bx + 16, 140, 52, 12, '#6a4220', 8);
  // silhouettes of bottles and a few heads at the bar
  for (let px = bx + 20; px < bx + 64; px += 7) {
    rect(x, px, 134, 2, 7, '#3a2210');
    rect(x, px, 132, 1, 2, '#3a2210');
  }
  disco(x, bx + 30, 142, 3, '#2a1808');
  disco(x, bx + 52, 143, 3, '#2a1808');
  rect(x, bx + 14, 146, 56, 2, '#4a2e1a');
  // Door
  rect(x, bx + 82, 120, 24, 32, '#120c18');
  rect(x, bx + 84, 122, 20, 30, '#2a1a20');
  rect(x, bx + 90, 126, 8, 24, '#8a5a28');
  tramado(x, bx + 88, 126, 14, 24, '#c88a3a', 5);
  // Door glow on the pavement
  charco(x, bx + 96, 160, 24, 5, '#8a5a2a', 5);
  halo(x, bx + 42, 138, 22, '#8a5a24', 4);

  // Pavement and road: plain.
  rect(x, L, 152, R - L, 8, '#2c2e48');
  rect(x, L, 152, R - L, 1, '#4a4c6e');
  rect(x, L, 159, R - L, 1, '#1a1c30');
  rect(x, L, 160, R - L, SUELO - 160, '#181a2e');
  tramado(x, L, 160, R - L, 24, '#222440', 3);
  // Wheelie bins, small and dim, against the wall.
  const cubo = (bxx: number) => {
    rect(x, bxx, 142, 12, 11, '#254030');
    rect(x, bxx, 142, 12, 2, '#355a42');
    rect(x, bxx - 1, 140, 14, 3, '#2e5038');
    rect(x, bxx + 9, 144, 2, 8, '#1a3024');
    disco(x, bxx + 2, 153, 1, '#0c0c14');
    disco(x, bxx + 9, 153, 1, '#0c0c14');
  };
  cubo(16);
  cubo(30);
  cubo(344);
  // Street lamps with sodium pools
  farola(x, 118, 72, 156, '#f0b848', '#8a6a3a');
  farola(x, 268, 78, 156, '#f0b848', '#8a6a3a');
}

// ---------------------------------------------------------------------------
export function madridrio(x: Ctx, r: Azar) {
  cielo(x, 8, 130, ['#070b20', '#0c1332', '#141d46', '#1d2956', '#2a3366'], L, R);
  estrellas(x, r, 40, 10, 80, ['#c8d4ff', '#7a88c0', '#e8eaff']);
  disco(x, 330, 34, 6, '#c8d2ee');
  disco(x, 332, 32, 5, '#8f9acb');
  // Far city skyline, hazy, with a cathedral dome and a spire.
  edificios(x, r, { base: 126, x0: L, x1: R, hmin: 14, hmax: 44, wmin: 14, wmax: 26, cuerpo: '#1a2552', lado: '#212d5e', techo: '#2a3668', apagada: '#1a2552', luces: ['#9a8250', '#6a84c0'], prob: 0.22, sep: 0 });
  domo(x, 96, 96, 14, 14, '#222f62');
  rect(x, 82, 96, 28, 30, '#1e2a5a');
  rect(x, 95, 70, 2, 14, '#222f62');
  rect(x, 94, 74, 4, 1, '#222f62');
  rect(x, 300, 70, 6, 56, '#202c5c');
  poli(x, [[299, 70], [303, 58], [307, 70]], '#202c5c');
  for (let wy = 82; wy < 120; wy += 8) punto(x, 303, wy, '#9a8250');
  bruma(x, 60, 128, '#2a3366', 3, 9);

  // The bridge: stone deck, parapet, five arches, lamps.
  rect(x, L, 112, R - L, 5, '#2a3058');
  rect(x, L, 112, R - L, 1, '#4a5486');
  rect(x, L, 117, R - L, 18, '#252a4e');
  tramado(x, L, 117, R - L, 18, '#1a1e3c', 4);
  for (let i = 0; i < 6; i++) {
    const cx = 40 + i * 62;
    domo(x, cx, 135, 20, 15, '#0b1030');
    domo(x, cx, 135, 20, 15, '#0b1030');
  }
  for (let i = 0; i < 6; i++) rect(x, 40 + i * 62 - 31 + 11, 117, 1, 18, '#343a64');
  for (let px = L; px < R; px += 7) rect(x, px, 108, 1, 4, '#252a4e');
  rect(x, L, 108, R - L, 1, '#343a64');
  const lamparas = [28, 90, 152, 214, 276, 338];
  for (const lx of lamparas) {
    rect(x, lx, 98, 2, 10, '#14183a');
    halo(x, lx + 1, 97, 12, '#7a6040', 6);
    rect(x, lx - 1, 96, 4, 3, '#e8b868');
  }
  // River with reflections.
  rect(x, L, 135, R - L, 20, '#0f1944');
  tramado(x, L, 135, R - L, 6, '#0a1236', 7);
  for (let i = 0; i < 90; i++) rect(x, L + entre(r, 0, R - L - 8), entre(r, 137, 153), entre(r, 3, 8), 1, '#1c2c64');
  for (const lx of lamparas) {
    for (let k = 0; k < 9; k++) rect(x, lx - 1 + (k % 2), 136 + k * 2, 2 + (k % 3 === 0 ? 1 : 0), 1, k < 5 ? '#6a5438' : '#3a3250');
  }
  // Lawn bank: dark green, plain
  rect(x, L, 155, R - L, 10, '#14281e');
  tramado(x, L, 155, R - L, 4, '#0e1c16', 7);
  rect(x, L, 165, R - L, SUELO - 165, '#162a22');
  tramado(x, L, 165, R - L, 19, '#1b3328', 5);
  // Promenade edge
  rect(x, L, 172, R - L, 12, '#283048');
  rect(x, L, 172, R - L, 1, '#3a4464');
  tramado(x, L, 173, R - L, 11, '#1d2438', 4);
  // Trees at the sides and park lamps
  for (const [tx, tb, tr] of [[22, 168, 13], [350, 168, 14], [58, 166, 9], [320, 166, 10]]) {
    rect(x, tx - 1, tb - tr, 3, tr, '#0c1018');
    disco(x, tx, tb - tr - 4, tr, '#0b1c18');
    disco(x, tx - tr + 3, tb - tr - 1, Math.round(tr * 0.7), '#0b1c18');
    disco(x, tx + tr - 3, tb - tr - 2, Math.round(tr * 0.7), '#0b1c18');
    disco(x, tx - 3, tb - tr - 7, Math.round(tr * 0.6), '#123024');
    for (let i = 0; i < tr; i++) punto(x, tx - tr + entre(r, 0, tr), tb - 2 * tr - 3 + entre(r, 0, tr), '#1c4a34');
  }
}
