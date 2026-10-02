// Automated playthrough of the demo on a phone-sized viewport.
// Usage: node scripts/playthrough.mjs <url> <outDir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [url = 'http://localhost:5173/', out = 'revisiones/partida'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.stack || String(e)));
page.on('console', (m) => m.type() === 'error' && !m.text().includes('Failed to load resource') && errors.push(m.text()));
await page.addInitScript(() => localStorage.clear());
await page.goto(url);
await page.waitForTimeout(2500);
let n = 0;
const shot = async (name) => page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` });
const idle = () => page.waitForFunction(() => !window.__cyc.g.isBusy || document.querySelector('.dialogue') || document.querySelector('.cover .card'), null, { timeout: 30000 });
async function talk(maxClicks = 40, shotFirst) {
  let shotDone = false;
  let quiet = 0;
  let lastText = '';
  const t0 = Date.now();
  while (quiet < 4 && Date.now() - t0 < 60000 + maxClicks) {
    await page.waitForTimeout(220);
    const d = await page.$('.dialogue');
    if (d) {
      quiet = 0;
      if (shotFirst && !shotDone) {
        await page.waitForTimeout(1200);
        await shot(shotFirst);
        shotDone = true;
      }
      // Let the line finish typing, then advance.
      await page.waitForTimeout(500);
      const text = (await d.innerText()).replace(/\n/g, ' | ');
      if (text !== lastText) console.log('  »', text);
      lastText = text;
      await d.click().catch(() => {});
      continue;
    }
    const busy = await page.evaluate(() => window.__cyc.g.isBusy);
    if (busy) quiet = 0;
    else quiet++;
    if (await page.$('.cover .card')) return;
  }
}
const ready = () => page.waitForFunction(() => !window.__cyc.g.isBusy && !document.querySelector('.dialogue'), null, { timeout: 30000 });
const tap = async (x, y, long = false) => {
  await ready();
  await page.evaluate(([x, y, l]) => window.__cyc.g.tapWorld(x, y, l), [x, y, long]);
};
const press = async (sel) => {
  await ready();
  await page.click(sel);
};

await shot('titulo');
await page.click('.cover.title');
console.log('intro');
await talk(10, 'intro');
await shot('juego');

console.log('revelar');
await page.click('[aria-label="Mostrar zonas interactivas"]');
await page.waitForTimeout(400);
await shot('revelar');
await page.waitForTimeout(2600);

console.log('mesa (Fran)');
await tap(2060, 840);
await talk(6, 'mesa');
console.log('bazar (Fran)');
await tap(1600, 650);
await talk(6);
await tap(1600, 650);
await talk(6, 'bazar-sin-suelto');
console.log('pista');
await press('[aria-label="Pista"]');
await talk(3, 'pista');
console.log('cambiar a Pablo');
await press('[aria-label="Jugar con Pablo"]');
await page.waitForTimeout(500);
await tap(1700, 640);
await talk(6, 'compra');
await press('[aria-label="Inventario"]');
console.log('  estado:', await page.evaluate(() => JSON.stringify(window.__cyc.g.state.inv) + ' activo=' + window.__cyc.g.state.active));
await page.waitForTimeout(400);
await shot('inventario');
await page.click('[aria-label="Rollo de cocina"]');
await page.waitForTimeout(300);
await tap(2060, 840);
await talk(10, 'secar');
await shot('mesa-seca');

console.log('bar → ronda');
await tap(505, 640);
await talk(3);
await page.waitForSelector('.cover .card', { timeout: 20000 });
await shot('ronda-intro');
await page.click('text=Jugar con el dedo');
// A simple controller standing in for the player's thumb.
await page.evaluate(() => {
  window.__ctl = setInterval(() => {
    const mg = window.__cyc.g.minigame;
    if (!mg || !mg.running) return;
    const w = window.__cyc.g.stage.cssW * 0.12;
    mg.dragDx = Math.max(-w, Math.min(w, -(mg.theta * 4.5 + mg.omega * 1.1) * w));
  }, 30);
});
await page.waitForTimeout(6000);
await shot('ronda-juego');
await page.waitForFunction(() => window.__cyc.g.minigame?.finished, null, { timeout: 40000 });
await page.waitForTimeout(400);
await shot('ronda-resultado');
console.log('  resultado:', await page.evaluate(() => window.__cyc.g.minigame.levels.map((v) => v.toFixed(2)).join(' ')));
await page.click('text=Seguir');
await talk(10, 'brindis');
await page.waitForSelector('text=Fin de la demo', { timeout: 20000 });
await shot('fin');
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'Sin errores de consola');
await browser.close();
