// PokéUsera · Edición Jarra: the title logo, baked once into a 160×64 canvas.
// Original lettering: 5×7 block letters at 3 px per unit with a thick dark outline, a vertical
// gold-to-orange gradient and a highlight; a ribbon with «EDICIÓN JARRA» and the beer-jar mascot.
import { Lienzo, Mascara, desp, rc } from './pixel';
import { dibujarTexto, anchoTexto } from './fuente';
import { USERITOS } from './useritos';

// Each glyph: 5 columns, rows from the cap line (row 0) down to the baseline (row 6).
const LETRAS: Record<string, string[]> = {
  P: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....'],
  o: ['', '', '.XXX.', 'X...X', 'X...X', 'X...X', '.XXX.'],
  k: ['X....', 'X....', 'X..X.', 'X.X..', 'XX...', 'X.X..', 'X..XX'],
  é: ['...X.', '..X..', '.XXX.', 'X...X', 'XXXXX', 'X....', '.XXXX'],
  U: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  s: ['', '', '.XXXX', 'X....', '.XXX.', '....X', 'XXXX.'],
  e: ['', '', '.XXX.', 'X...X', 'XXXXX', 'X....', '.XXXX'],
  r: ['', '', 'X.XX.', 'XX..X', 'X....', 'X....', 'X....'],
  a: ['', '', '.XXX.', '....X', '.XXXX', 'X...X', '.XXXX'],
};

const U = 3; // pixels per unit
const PALETA = ['', '#2a1020', '#fff8c0', '#ffe14a', '#ffb81e', '#e87a1a', '#a8401a', '#6a2418'];

function dilatar(m: Mascara, r: number): Mascara {
  const out = new Mascara();
  m.each((x, y) => {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 1) out.add(x + i, y + j);
  });
  return out;
}

export function hornearLogo(): HTMLCanvasElement {
  const L = new Lienzo(160, 64);
  const letras = 'PokéUsera';
  const ancho = letras.length * 5 * U + (letras.length - 1) * 2;
  const x0 = Math.floor((160 - ancho) / 2);
  const y0 = 8;
  const m = new Mascara();
  Array.from(letras).forEach((ch, i) => {
    const g = LETRAS[ch];
    // A playful bounce: every other letter sits one pixel lower.
    const dy = i % 2 ? 1 : 0;
    g.forEach((fila, gy) => {
      Array.from(fila).forEach((c, gx) => {
        if (c === 'X') for (let j = 0; j < U; j++) for (let k = 0; k < U; k++) m.add(x0 + i * (5 * U + 2) + gx * U + k, y0 + gy * U + j + dy);
      });
    });
  });
  // Thick outline and a drop shadow underneath.
  const borde = dilatar(m, 2);
  desp(borde, 0, 2).each((x, y) => L.px(x, y, 7));
  borde.each((x, y) => L.px(x, y, 1));
  // Letters: gradient bands, a highlight on top edges, a darker bottom edge.
  const caja = m.caja();
  m.each((x, y) => {
    const rel = (y - caja.y0) / (caja.y1 - caja.y0 + 1);
    let c = rel < 0.45 ? 3 : 4;
    if (!m.tiene(x, y - 1)) c = 2;
    else if (!m.tiene(x, y + 1)) c = 6;
    L.px(x, y, c);
  });

  // Ribbon with the edition name.
  const texto = 'EDICIÓN JARRA';
  const rw = anchoTexto(texto) + 12;
  const rx = 6;
  const ry = 41;
  L.llenar(rc(rx + 1, ry, rw - 2, 14), 1);
  L.llenar(rc(rx, ry + 1, rw, 12), 1);
  L.llenar(rc(rx + 2, ry + 2, rw - 4, 10), 6);
  L.llenar(rc(rx + 2, ry + 2, rw - 4, 1), 5);
  L.llenar(rc(rx + 2, ry + 11, rw - 4, 1), 7);

  // Beer-jar mascot (Espumarro) at the right, a little tilted pride.
  const m2 = new Lienzo(32, 32);
  USERITOS.espumarro.dibujar(m2);
  const mascota = m2.hornear(USERITOS.espumarro.paleta);

  const cv = L.hornear(PALETA);
  const cx = cv.getContext('2d')!;
  cx.imageSmoothingEnabled = false;
  dibujarTexto(cx, texto, rx + 6, ry + 3, '#ffe14a', { sombra: '#2a1020' });
  cx.drawImage(mascota, 160 - 32 - 2, 31);
  return cv;
}
