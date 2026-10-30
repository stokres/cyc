// Exports the PNG of the useritos sheet (GBA art). Needs `npx vite --port 5196 --host 127.0.0.1` running.
//   node tools/pokeusera-v2-export.mjs [carpeta de salida]
//   node tools/pokeusera-v2-export.mjs --hoja <archivo.png> [ids separados por comas] [zoom]
//     (hoja de contactos: frente 1, frente 2 y espalda de cada userito; sin ids, los de la última tanda, useritos2-e.ts)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const HOJA = process.argv[2] === '--hoja';
const OUT = HOJA ? dirname(process.argv[3]) : (process.argv[2] ?? '/mnt/project-files/batallas/graficos-v2');
const BASE = 'http://127.0.0.1:5196';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });

async function pagina(vista, z, ancho = 1600) {
  const p = await b.newPage({ viewport: { width: ancho, height: 1000 } });
  p.on('pageerror', (e) => console.log('[error]', e.message));
  await p.goto(`${BASE}/tools/pokeusera-v2.html?vista=${vista}&z=${z}`);
  await p.waitForTimeout(1200);
  return p;
}

if (HOJA) {
  const ids = process.argv[4] ? `&ids=${process.argv[4]}` : '';
  const z = Number(process.argv[5] ?? 4);
  const p = await b.newPage({ viewport: { width: 1800, height: 1200 } });
  p.on('pageerror', (e) => console.log('[error]', e.message));
  p.on('console', (m) => console.log('[pagina]', m.text()));
  await p.goto(`${BASE}/tools/pokeusera-v2.html?vista=hoja&z=${z}${ids}`);
  await p.waitForSelector('body[data-listo="1"]', { timeout: 20000 });
  await (await p.$('#hoja-w')).screenshot({ path: process.argv[3] });
  await p.close();
} else {
  const p = await pagina('detalle', 5, 1700);
  await (await p.$('#detalle-w')).screenshot({ path: `${OUT}/detalle-useritos.png` });
  await p.close();
}

await b.close();
