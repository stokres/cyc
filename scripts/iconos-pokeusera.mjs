// PokéUsera · app icons: a pixel-art beer jar with a P, drawn on a 32×32 grid and saved as PNG in public/
// (pokeusera-icono-192/512/180.png). Run it again only if the drawing changes:  node scripts/iconos-pokeusera.mjs
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const publico = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const TAMANOS = { 'pokeusera-icono-192.png': 192, 'pokeusera-icono-512.png': 512, 'pokeusera-icono-180.png': 180 };

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
const resultado = await pagina.evaluate((tamanos) => {
  const FONDO = '#3a1334', FONDO2 = '#4c1a45', LINEA = '#1d0a1c', ORO = '#e0a83a';
  const CERV = '#f2a81c', CERV_CLARA = '#ffd45a', CERV_OSC = '#c8741a', ESPUMA = '#fff6dc', ESPUMA_OSC = '#e8d4a8';
  const P = ['11110', '10001', '10001', '11110', '10000', '10000', '10000'];
  const dibujar = (ctx, s) => {
    const rc = (c, x, y, w, h) => {
      ctx.fillStyle = c;
      // The 32×32 drawing sits in the middle of a 38×38 grid, so it stays inside a maskable icon's safe zone.
      const x0 = Math.round((x + 3) * s), y0 = Math.round((y + 3) * s);
      ctx.fillRect(x0, y0, Math.round((x + 3 + w) * s) - x0, Math.round((y + 3 + h) * s) - y0);
    };
    ctx.fillStyle = FONDO;
    ctx.fillRect(0, 0, 38 * s, 38 * s);
    // a lighter disc (kept inside the safe zone of a maskable icon)
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if ((x - 15.5) ** 2 + (y - 16) ** 2 <= 14.5 ** 2) rc(FONDO2, x, y, 1, 1);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const d = (x - 15.5) ** 2 + (y - 16) ** 2;
      if (d > 14.5 ** 2 && d <= 15.7 ** 2) rc(ORO, x, y, 1, 1);
    }
    // handle (behind the glass)
    rc(LINEA, 20, 12, 6, 12);
    rc(CERV_OSC, 21, 13, 4, 10);
    rc(LINEA, 21, 15, 2, 6);
    rc(FONDO2, 22, 16, 1, 4);
    rc(CERV, 21, 13, 4, 1);
    // glass: outline, beer, light on the left and shade on the right
    rc(LINEA, 7, 9, 14, 18);
    rc(CERV, 8, 10, 12, 16);
    rc(CERV_CLARA, 9, 10, 2, 15);
    rc(CERV_OSC, 18, 10, 2, 16);
    rc(CERV_OSC, 8, 25, 12, 1);
    // bubbles
    for (const [x, y] of [[13, 23], [16, 22], [11, 11], [17, 12]]) rc(CERV_CLARA, x, y, 1, 1);
    // foam: outline then bumps
    rc(LINEA, 6, 6, 16, 5);
    for (const [x, y, w, h] of [[7, 5, 4, 2], [11, 4, 5, 3], [16, 5, 4, 2]]) rc(LINEA, x - 1, y - 1, w + 2, h + 2);
    rc(ESPUMA, 7, 7, 14, 3);
    for (const [x, y, w, h] of [[7, 5, 4, 3], [11, 4, 5, 4], [16, 5, 4, 3]]) rc(ESPUMA, x, y, w, h);
    rc(ESPUMA_OSC, 7, 9, 14, 1);
    // the P, in dark plum with a light shadow
    P.forEach((fila, j) => [...fila].forEach((c, i) => {
      if (c === '1') {
        rc(LINEA, 11 + i, 14 + j, 1, 1);
      }
    }));
    // the glass shines
    rc('#fff6dc', 9, 12, 1, 3);
  };
  const salida = {};
  for (const [nombre, s] of Object.entries(tamanos)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    dibujar(ctx, s / 38);
    salida[nombre] = cv.toDataURL('image/png').split(',')[1];
  }
  return salida;
}, TAMANOS);
await navegador.close();

mkdirSync(publico, { recursive: true });
for (const [nombre, b64] of Object.entries(resultado)) writeFileSync(join(publico, nombre), Buffer.from(b64, 'base64'));
console.log('Iconos guardados en', publico);
