// Exports the PNGs of the graphics v2 sample. Needs `npx vite --port 5196 --host 127.0.0.1` running.
//   node tools/pokeusera-v2-export.mjs [carpeta de salida]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? '/mnt/project-files/batallas/graficos-v2';
const BASE = 'http://127.0.0.1:5196';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });

// 1. The current battle screen (390×844, scaled so its height matches the ×3 mock: 1560 px).
const pj = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1560 / 844 });
await pj.goto(`${BASE}/pokeusera.html?combate&semilla=5`);
await pj.waitForTimeout(6000);
const actual = (await pj.screenshot()).toString('base64');
await pj.close();

async function pagina(vista, z, ancho = 1600) {
  const p = await b.newPage({ viewport: { width: ancho, height: 1000 } });
  p.on('pageerror', (e) => console.log('[error]', e.message));
  await p.goto(`${BASE}/tools/pokeusera-v2.html?vista=${vista}&z=${z}`);
  await p.waitForTimeout(1200);
  return p;
}

let p = await pagina('antes', 4);
await (await p.$('#antes-w')).screenshot({ path: `${OUT}/antes-despues-useritos.png` });
await p.close();

p = await pagina('detalle', 5, 1700);
await (await p.$('#detalle-w')).screenshot({ path: `${OUT}/detalle-useritos.png` });
await p.close();

p = await pagina('combate', 3, 1700);
await p.evaluate((src) => new Promise((ok) => { const i = document.getElementById('actual'); i.onload = ok; i.src = `data:image/png;base64,${src}`; }), actual);
await (await p.$('#combate-w')).screenshot({ path: `${OUT}/antes-despues-combate.png` });
await p.close();
await b.close();
