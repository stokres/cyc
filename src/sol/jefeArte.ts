// The art of the boss: «La Sombra» (Pablo's shadow, the narrator, in his first form) and «El Narrador» (the
// second form, when he is cornered: a cloak made of the pages of the play, quills for hair, red eyes and four
// arms that hold a quill, an eraser, the script and an inkwell). Both are painted once into cached canvases;
// the pages that orbit them are separate small pictures that the fight draws around the sprite.
import { contorno } from './contorno';
import { linea } from './iconos';
import { ctx, elipse, lienzo, rect, una } from './pixel';

type Paleta = Record<string, string>;

/** A thick line: `linea` several times side by side. */
function grueso(x: CanvasRenderingContext2D, col: string, x0: number, y0: number, x1: number, y1: number, w = 3) {
  const horizontal = Math.abs(x1 - x0) > Math.abs(y1 - y0);
  for (let i = 0; i < w; i++) {
    const d = i - Math.floor(w / 2);
    if (horizontal) linea(x, col, x0, y0 + d, x1, y1 + d);
    else linea(x, col, x0 + d, y0, x1 + d, y1);
  }
}

/** A feather, pointing up from its quill end at (qx, qy), `largo` tall. */
function pluma(x: CanvasRenderingContext2D, p: Paleta, qx: number, qy: number, largo: number, ancho: number, inclina = 0) {
  for (let j = 0; j < largo; j++) {
    const k = j / largo;
    const w = Math.max(1, Math.round(Math.sin(k * Math.PI * 0.9 + 0.25) * ancho));
    const cx = qx + Math.round(inclina * k);
    const y = qy - j;
    if (j < 4) {
      rect(x, p.plumaHueso, cx, y, 1, 1);
      continue;
    }
    rect(x, p.pluma, cx - w, y, w, 1);
    rect(x, p.plumaSombra, cx + 1, y, w, 1);
    rect(x, p.plumaHueso, cx, y, 1, 1);
    if (j % 4 === 0) {
      rect(x, p.plumaSombra, cx - w, y, 1, 1);
      rect(x, p.plumaSombra, cx + w, y, 1, 1);
    }
  }
}

// ---------------------------------------------------------------- first form: La Sombra

function sombra(p: Paleta, f: number): HTMLCanvasElement {
  const c = lienzo(60, 68);
  const x = ctx(c);
  const o = f ? 1 : 0;
  // the tail: a column of smoke that tapers and tears into ribbons
  for (let y = 46; y < 66; y++) {
    const k = (y - 46) / 20;
    const half = Math.max(2, Math.round(14 - k * 10 + Math.sin(y * 0.7 + o * 2) * 1.2));
    const cx = 30 + Math.round(Math.sin(y * 0.35 + o * 1.4) * 2.2 * k);
    rect(x, k > 0.55 ? p.humoOscuro : p.humo, cx - half, y, half * 2, 1);
    if (k < 0.8) rect(x, p.humoLuz, cx - half, y, 1, 1);
  }
  for (const [tx, ty] of [[22, 60], [38, 62], [30, 65]]) {
    rect(x, p.humoOscuro, tx + o, ty, 2, 3);
    rect(x, p.humoOscuro, tx - 1 + o * 2, ty + 3, 1, 2);
  }
  // torso: the open fleece jacket over a shirt
  elipse(x, p.chaqueta, 30, 42, 16, 12);
  rect(x, p.chaqueta, 14, 36, 32, 12);
  rect(x, p.chaquetaOscura, 38, 36, 8, 12);
  rect(x, p.camisa, 25, 34, 10, 14);
  rect(x, p.camisaOscura, 33, 34, 2, 14);
  // the wool lining along the opening and the collar (little puffs)
  for (let j = 0; j < 14; j++) {
    rect(x, p.lana, 23 + (j % 2), 34 + j, 2, 1);
    rect(x, p.lana, 35 - (j % 2), 34 + j, 2, 1);
  }
  elipse(x, p.lana, 22, 33, 4.5, 2.5);
  elipse(x, p.lana, 38, 33, 4.5, 2.5);
  rect(x, p.camisaLuz, 28, 38, 4, 1);
  // neck
  rect(x, p.piel, 26, 29, 8, 6);
  rect(x, p.pielOscura, 31, 29, 3, 6);
  // head
  elipse(x, p.piel, 30, 18, 12, 12.5);
  elipse(x, p.pielOscura, 35, 21, 7, 9);
  elipse(x, p.pielLuz, 24, 14, 4, 3);
  // ears and the hoop earring
  elipse(x, p.piel, 17, 20, 2.5, 3.5);
  elipse(x, p.piel, 43, 20, 2.5, 3.5);
  rect(x, p.oro, 15, 23, 1, 4);
  rect(x, p.oro, 16, 27, 2, 1);
  rect(x, p.oro, 17, 23, 1, 4);
  rect(x, p.oroLuz, 15, 23, 1, 1);
  // the messy hair, standing up in spikes
  elipse(x, p.pelo, 30, 9, 13.5, 6);
  rect(x, p.pelo, 17, 9, 26, 6);
  const puas: Array<[number, number, number]> = [[18, 5, 5], [22, 9, 4], [26, 11, 4], [31, 12, 4], [36, 10, 4], [40, 7, 4], [44, 4, 3]];
  for (const [px, alto, w] of puas) {
    for (let j = 0; j < alto; j++) rect(x, p.pelo, px + Math.floor((j * (w - 1)) / (alto * 2)), 8 - j, Math.max(1, w - Math.floor(j / 2)), 1);
    rect(x, p.peloLuz, px, 8 - alto + 1, 1, Math.max(1, alto - 2));
  }
  rect(x, p.pelo, 16, 14, 4, 8);
  rect(x, p.pelo, 40, 14, 4, 8);
  rect(x, p.peloLuz, 22, 8, 6, 1);
  // the fringe over the brow
  for (let i = 0; i < 6; i++) rect(x, p.pelo, 20 + i * 3, 13, 3, 2 + (i % 2));
  // angry glowing eyes under slanted brows
  rect(x, p.pielOscura, 20, 15, 18, 2);
  rect(x, p.ojoBrillo, 21, 17, 6, 3);
  rect(x, p.ojoBrillo, 33, 17, 6, 3);
  rect(x, p.ojo, 22, 17, 4, 3);
  rect(x, p.ojo, 34, 17, 4, 3);
  rect(x, '#ffffff', 23, 17, 1, 1);
  rect(x, '#ffffff', 35, 17, 1, 1);
  rect(x, p.ceja, 20, 14, 2, 1);
  rect(x, p.ceja, 22, 15, 5, 1);
  rect(x, p.ceja, 33, 15, 5, 1);
  rect(x, p.ceja, 38, 14, 2, 1);
  // the short beard along the jaw and the big grin
  elipse(x, p.barba, 30, 27, 10, 5);
  rect(x, p.barba, 20, 22, 3, 5);
  rect(x, p.barba, 37, 22, 3, 5);
  rect(x, p.pielOscura, 29, 20, 3, 2);
  rect(x, p.boca, 22, 24, 16, 3);
  rect(x, p.boca, 21, 23, 1, 2);
  rect(x, p.boca, 38, 23, 1, 2);
  rect(x, '#ffffff', 23, 24, 14, 1);
  for (let i = 0; i < 7; i++) rect(x, p.dientes, 23 + i * 2, 25, 1, 1);
  rect(x, p.lengua, 27, 26, 5, 1);
  // the right arm up, with the quill
  grueso(x, p.chaqueta, 17, 36, 9, 32, 5);
  grueso(x, p.chaquetaOscura, 18, 38, 10, 34, 2);
  grueso(x, p.chaqueta, 9, 32, 8, 22, 4);
  rect(x, p.lana, 6, 30, 6, 2);
  elipse(x, p.piel, 8, 20, 3, 3);
  pluma(x, p, 7, 19, 18, 3, -3);
  rect(x, p.oro, 6, 18, 3, 2);
  elipse(x, p.ojoBrillo, 4, 2, 1.6, 1.6);
  // the left arm holds the script (an open book) in front of the belly
  grueso(x, p.chaqueta, 44, 36, 51, 44, 5);
  grueso(x, p.chaquetaOscura, 46, 38, 52, 45, 2);
  rect(x, p.lana, 48, 42, 5, 2);
  rect(x, p.tapa, 32, 47, 25, 14);
  rect(x, p.tapaLuz, 32, 47, 25, 1);
  rect(x, p.oro, 32, 47, 2, 2);
  rect(x, p.oro, 55, 47, 2, 2);
  rect(x, p.hoja, 34, 48, 10, 11);
  rect(x, p.hoja, 45, 48, 10, 11);
  rect(x, p.hojaSombra, 43, 48, 2, 11);
  for (let j = 0; j < 4; j++) {
    rect(x, p.texto, 35, 50 + j * 2, 7, 1);
    rect(x, p.textoOro, 46, 50 + j * 2, 6 - (j % 2) * 2, 1);
  }
  rect(x, p.tapa, 32, 60, 25, 1);
  elipse(x, p.piel, 33, 53, 2.4, 2.4);
  elipse(x, p.piel, 56, 53, 2, 2);
  return contorno(c, p.linea);
}

// ---------------------------------------------------------------- second form: El Narrador

function narradorFinal(p: Paleta, f: number): HTMLCanvasElement {
  const c = lienzo(74, 78);
  const x = ctx(c);
  const o = f ? 1 : 0;
  const cx = 37;
  // an inner dark body, then the cloak of pages in overlapping rows, jagged at the bottom
  for (let y = 34; y < 74; y++) {
    const k = (y - 34) / 40;
    const half = Math.round(12 + k * 17 + Math.sin(y * 0.5 + o * 2) * 0.8);
    rect(x, p.humoOscuro, cx - half, y, half * 2, 1);
  }
  const filas = [
    { y: 36, n: 3, w: 10 },
    { y: 43, n: 4, w: 10 },
    { y: 51, n: 5, w: 10 },
    { y: 60, n: 6, w: 10 },
    { y: 68, n: 6, w: 10 },
  ];
  filas.forEach((fl, r) => {
    const total = fl.n * (fl.w - 1);
    for (let i = 0; i < fl.n; i++) {
      const px = Math.round(cx - total / 2 + i * (fl.w - 1) + (r % 2 ? 3 : 0));
      const py = fl.y + ((i + r) % 2) * 1 + (r === filas.length - 1 ? o * (i % 2) : 0);
      rect(x, p.hoja, px, py, fl.w, 10);
      rect(x, p.hojaLuz, px, py, 1, 10);
      rect(x, p.hojaSombra, px + fl.w - 1, py, 1, 10);
      for (let j = 0; j < 3; j++) rect(x, (i + j + r) % 5 === 0 ? p.tachado : p.texto, px + 2, py + 3 + j * 2, fl.w - 4, 1);
      if ((i + r) % 4 === 1) rect(x, p.tachado, px + 1, py + 3, fl.w - 2, 1);
    }
  });
  // shoulders: a high collar of pages
  for (let i = 0; i < 7; i++) {
    const px = cx - 18 + i * 5;
    const alto = 5 + (i % 3) + (i === 3 ? 2 : 0);
    rect(x, p.hoja, px, 29 - alto + 7, 5, alto + 4);
    rect(x, p.hojaLuz, px, 29 - alto + 7, 1, alto + 4);
    rect(x, p.hojaSombra, px + 4, 29 - alto + 7, 1, alto + 4);
  }
  rect(x, p.humo, cx - 9, 30, 18, 8);
  // neck and head: the same face, bigger and with a grin of sharp teeth
  elipse(x, p.piel, cx, 20, 13, 13.5);
  elipse(x, p.pielOscura, cx + 5, 23, 8, 10);
  elipse(x, p.pielLuz, cx - 7, 15, 4, 3);
  elipse(x, p.piel, cx - 14, 22, 2.5, 3.5);
  elipse(x, p.piel, cx + 14, 22, 2.5, 3.5);
  rect(x, p.oro, cx - 17, 25, 1, 5);
  rect(x, p.oro, cx - 16, 30, 2, 1);
  rect(x, p.oro, cx - 15, 25, 1, 5);
  // the hair: quills fanning upward like a crown
  const plumas: Array<[number, number, number, number]> = [[-15, 10, 17, -9], [-10, 8, 22, -5], [-4, 7, 26, -2], [3, 7, 26, 2], [9, 8, 22, 5], [14, 10, 17, 9]];
  for (const [dx, y, largo, inc] of plumas) pluma(x, p, cx + dx, y + 8, largo, 3, inc);
  elipse(x, p.pelo, cx, 11, 14, 6);
  rect(x, p.pelo, cx - 14, 11, 28, 6);
  for (let i = 0; i < 8; i++) rect(x, p.pelo, cx - 14 + i * 4, 15, 4, 2 + (i % 2));
  rect(x, p.peloLuz, cx - 9, 10, 7, 1);
  // red furious eyes, slanted brows
  rect(x, p.pielOscura, cx - 11, 17, 22, 2);
  rect(x, p.ojoBrillo2, cx - 10, 19, 7, 4);
  rect(x, p.ojoBrillo2, cx + 3, 19, 7, 4);
  rect(x, p.ojo2, cx - 9, 19, 5, 4);
  rect(x, p.ojo2, cx + 4, 19, 5, 4);
  rect(x, '#ffffff', cx - 8, 19, 1, 1);
  rect(x, '#ffffff', cx + 5, 19, 1, 1);
  rect(x, p.pelo, cx - 10, 17, 7, 1);
  rect(x, p.pelo, cx - 6, 16, 3, 1);
  rect(x, p.pelo, cx + 3, 17, 7, 1);
  rect(x, p.pelo, cx + 3, 16, 3, 1);
  // beard and the toothy grin
  elipse(x, p.barba, cx, 28, 11, 5);
  rect(x, p.boca, cx - 10, 25, 20, 4);
  rect(x, p.boca, cx - 11, 24, 1, 3);
  rect(x, p.boca, cx + 10, 24, 1, 3);
  for (let i = 0; i < 9; i++) {
    rect(x, p.dientes, cx - 9 + i * 2, 25, 1, 2 + (i % 2));
    if (i % 2 === 0) rect(x, p.dientes, cx - 8 + i * 2, 28, 1, 1);
  }
  rect(x, p.lengua, cx - 3, 28, 6, 1);
  // four arms. Upper right: the giant quill held high; upper left: the eraser
  grueso(x, p.humo, cx + 14, 34, cx + 25, 26, 4);
  grueso(x, p.humo, cx + 25, 26, cx + 28, 16, 3);
  elipse(x, p.piel, cx + 28, 15, 2.6, 2.6);
  pluma(x, p, cx + 28, 14, 20, 3, 2);
  rect(x, p.oro, cx + 27, 13, 3, 2);
  grueso(x, p.humo, cx - 14, 34, cx - 25, 26, 4);
  grueso(x, p.humo, cx - 25, 26, cx - 28, 17, 3);
  elipse(x, p.piel, cx - 28, 16, 2.6, 2.6);
  // the eraser: pink with a blue band and a rubbed end
  rect(x, p.goma, cx - 35, 6, 10, 10);
  rect(x, p.gomaLuz, cx - 35, 6, 10, 1);
  rect(x, p.gomaSombra, cx - 27, 6, 2, 10);
  rect(x, p.gomaBanda, cx - 35, 10, 10, 3);
  rect(x, p.gomaBandaLuz, cx - 35, 10, 10, 1);
  rect(x, p.hoja, cx - 33, 4, 2, 2);
  rect(x, p.hoja, cx - 29, 3, 1, 3);
  // lower right: the inkwell with glowing ink; lower left: the open script
  grueso(x, p.humo, cx + 16, 42, cx + 28, 50, 4);
  elipse(x, p.piel, cx + 29, 51, 2.6, 2.6);
  rect(x, p.tintero, cx + 25, 53, 12, 9);
  rect(x, p.tinteroLuz, cx + 25, 53, 2, 9);
  rect(x, p.tinteroSombra, cx + 35, 53, 2, 9);
  rect(x, p.tintero, cx + 28, 50, 6, 3);
  elipse(x, p.tinta, cx + 31, 53, 4, 1.4);
  rect(x, p.tintaLuz, cx + 29, 52, 2, 1);
  rect(x, p.tinta, cx + 31, 46 - o, 1, 3);
  rect(x, p.tintaLuz, cx + 31, 44 - o, 1, 2);
  grueso(x, p.humo, cx - 16, 42, cx - 28, 50, 4);
  elipse(x, p.piel, cx - 29, 51, 2.6, 2.6);
  rect(x, p.tapa, cx - 41, 52, 22, 13);
  rect(x, p.oro, cx - 41, 52, 2, 2);
  rect(x, p.oro, cx - 21, 52, 2, 2);
  rect(x, p.hoja, cx - 39, 53, 9, 10);
  rect(x, p.hoja, cx - 29, 53, 8, 10);
  rect(x, p.hojaSombra, cx - 30, 53, 1, 10);
  for (let j = 0; j < 4; j++) {
    rect(x, p.texto, cx - 38, 55 + j * 2, 6, 1);
    rect(x, p.textoOro, cx - 28, 55 + j * 2, 5, 1);
  }
  rect(x, p.tachado, cx - 38, 57, 7, 1);
  return contorno(c, p.linea);
}

export function narrador(p: Paleta, f: number): HTMLCanvasElement {
  return p.fase === '2' ? narradorFinal(p, f) : sombra(p, f);
}

const BASE: Paleta = {
  pluma: '#f4f0e6', plumaSombra: '#b8b4d8', plumaHueso: '#fffaf0',
  oro: '#f0c040', oroLuz: '#ffe27a',
  hoja: '#f0ead8', hojaLuz: '#fffaf0', hojaSombra: '#b8b0c8', texto: '#7a7aa8', textoOro: '#d8a828', tachado: '#e8322c',
  tapa: '#1c1030', tapaLuz: '#4a3a78',
  dientes: '#ffffff', lengua: '#c8486a',
};

export const PALETAS_NARRADOR: Paleta[] = [
  {
    ...BASE, fase: '1',
    piel: '#5c4e9e', pielOscura: '#3a2e70', pielLuz: '#8478c8', pelo: '#171128', peloLuz: '#3a2e66', barba: '#120c22', boca: '#0b0716',
    chaqueta: '#2e2558', chaquetaOscura: '#1c1638', lana: '#6a5cac', camisa: '#5a4e98', camisaOscura: '#382f66', camisaLuz: '#8a7ac8',
    humo: '#2e2558', humoOscuro: '#1c1638', humoLuz: '#4a3d80', ojo: '#ffd84a', ojoBrillo: '#7a6a2a', ceja: '#0d0919',
    linea: '#0a0616',
  },
  {
    ...BASE, fase: '2',
    piel: '#7a3a9c', pielOscura: '#4a2068', pielLuz: '#aa62d0', pelo: '#1a0c26', peloLuz: '#4a2468', barba: '#12081c', boca: '#0b0412',
    hoja: '#d6cee4', hojaLuz: '#f0ecf8', hojaSombra: '#8e86b4', texto: '#5a5a90',
    humo: '#2a1238', humoOscuro: '#160a22', ojo2: '#ff5a6a', ojoBrillo2: '#8a1a3a',
    goma: '#ff8aa8', gomaLuz: '#ffc0d0', gomaSombra: '#c85a7a', gomaBanda: '#4a7ae8', gomaBandaLuz: '#8ab4ff',
    tintero: '#2a2a58', tinteroLuz: '#5a5aa0', tinteroSombra: '#161640', tinta: '#a45aff', tintaLuz: '#e0b8ff',
    linea: '#0a0412',
  },
];

// ---------------------------------------------------------------- the pages that orbit him

/** A page of the script for the boss's orbit, 10 × 13, `tipo` 0 = clean, 1 = crossed out, 2 = glowing gold. */
export const paginaGrande = (tipo: number) =>
  una(`jefe.pagina.${tipo}`, () => {
    const c = lienzo(10, 13);
    const x = ctx(c);
    rect(x, '#f4f0e6', 0, 0, 10, 13);
    rect(x, '#fffaf0', 0, 0, 1, 13);
    rect(x, '#b8b0c8', 9, 0, 1, 13);
    rect(x, '#d8d0e0', 0, 12, 10, 1);
    // folded corner
    rect(x, '#b8b0c8', 7, 0, 3, 3);
    rect(x, '#d8d0e0', 7, 0, 2, 2);
    for (let j = 0; j < 4; j++) rect(x, tipo === 2 ? '#d8a828' : '#7a7aa8', 2, 4 + j * 2, j % 2 ? 4 : 6, 1);
    if (tipo === 1) {
      rect(x, '#e8322c', 1, 5, 8, 1);
      rect(x, '#e8322c', 1, 9, 6, 1);
    }
    return contorno(c, tipo === 2 ? '#7a5a10' : '#3a3050');
  });
