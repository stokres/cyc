// Screenshots of the scene sheet. Usage:
//   node tools/escenas/shot.mjs <out.png> [WxH] [dpr] [js to run before the shot] [wait ms]
import { chromium } from 'playwright';
const [out, size = '1600x900', dpr = '1', js = '', wait = '600'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: Number(dpr), hasTouch: true, isMobile: Number(dpr) > 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.stack || String(e)));
// The publisher wraps the page in a document with a viewport meta; do the same locally.
const { readFileSync, writeFileSync } = await import('node:fs');
const test = process.cwd() + '/revisiones/escenas/_prueba.html';
writeFileSync(test, '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + readFileSync('artifact/escenas.html', 'utf8'));
await page.goto('file://' + test);
await page.waitForFunction(() => window.__m && window.__m.scene && !document.getElementById('velo').classList.contains('on'), null, { timeout: 60000 });
await page.waitForTimeout(400);
if (js) { const r = await page.evaluate(`(async () => { ${js} })()`); if (r !== undefined) console.log('eval:', r); }
await page.waitForTimeout(Number(wait));
const el = process.env.FULL ? null : await page.$('#escenario');
await (el ?? page).screenshot({ path: out });
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
