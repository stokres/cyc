// Plays the scene sheet end to end like a player would: wake Fran, cross the
// flat, go out, walk the street to the bar. Fails on any console error.
// Usage: node tools/escenas/recorrido.mjs [outDir]
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const out = process.argv[2] ?? 'revisiones/escenas/recorrido';
mkdirSync(out, { recursive: true });
const test = process.cwd() + '/revisiones/escenas/_prueba.html';
writeFileSync(test, '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + readFileSync('artifact/escenas.html', 'utf8'));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g/.test(m.text())) errors.push(m.text()); });
page.on('requestfailed', () => {});
page.on('pageerror', (e) => errors.push(e.stack || String(e)));
await page.goto('file://' + test);
const ready = () => page.waitForFunction(() => window.__m?.scene && !document.getElementById('velo').classList.contains('on'), null, { timeout: 60000 });
await ready();
await page.$eval('#escenario', (e) => e.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(200);
const box = await (await page.$('#escenario')).boundingBox();
// Tap at a logical scene position (x in screen units of 1080-high view).
const tapLogical = async (lx, ly) => {
  const vw = await page.evaluate(() => __m.vw);
  await page.touchscreen.tap(box.x + (lx / vw) * box.width, box.y + (ly / 1080) * box.height);
};
const waitIdle = () => page.waitForFunction(() => !__m.target, null, { timeout: 30000 });
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
let step = 0;
const log = async (msg) => console.log(String(++step).padStart(2, '0'), msg, await page.evaluate(() => `[${__m.scene.id} ${__m.state} X=${Math.round(__m.fran.X)} y=${Math.round(__m.fran.y)}]`));

await shot('01-dormido');
await log('Fran duerme en el sofá');
await tapLogical(1200, 600);
await page.waitForFunction(() => __m.state === 'libre', null, { timeout: 5000 });
await page.waitForTimeout(900);
await shot('02-despierto');
await log('Se despierta; Aceituna ladra');
await tapLogical(300, 900);
await waitIdle();
await page.waitForTimeout(600);
await shot('03-cocina');
await log('Va a la cocina');
const perro = await page.evaluate(() => Math.abs(__m.perro.X - __m.fran.X));
console.log('   Aceituna a', Math.round(perro), 'unidades de Fran');
if (perro > 400) errors.push('Aceituna no sigue a Fran');
// Walk to the front door through taps on the floor, then tap the door.
for (let i = 0; i < 6 && (await page.evaluate(() => __m.fran.X)) < 2900; i++) {
  await tapLogical(2200, 900);
  await waitIdle();
}
await log('Llega al recibidor');
const doorX = await page.evaluate(() => __m.screenX(__m.scene.spots.salida.X, 1));
await tapLogical(doorX, 520);
await page.waitForFunction(() => __m.scene.id === 'calle' && !document.getElementById('velo').classList.contains('on'), null, { timeout: 60000 });
await page.waitForTimeout(500);
await shot('04-portal');
await log('Sale a la calle por su portal');
for (let i = 0; i < 40 && (await page.evaluate(() => __m.fran.X)) < 6600; i++) {
  await tapLogical(2200, 880);
  await page.waitForTimeout(700);
  if (i === 8) await shot('05-parque');
  if (i === 16) await shot('06-cruce');
}
await waitIdle();
await shot('07-bar');
await log('Llega al Bar del Río');
const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
console.log('   fps (navegador de pruebas, sin GPU):', fps.toFixed(0));
await browser.close();
if (errors.length) {
  console.log('ERRORES:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Sin errores de consola');
