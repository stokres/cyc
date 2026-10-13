// Exports the PNG of the useritos sheet (GBA art). Needs `npx vite --port 5196 --host 127.0.0.1` running.
//   node tools/pokeusera-v2-export.mjs [carpeta de salida]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? '/mnt/project-files/batallas/graficos-v2';
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

let p = await pagina('detalle', 5, 1700);
await (await p.$('#detalle-w')).screenshot({ path: `${OUT}/detalle-useritos.png` });
await p.close();

await b.close();
