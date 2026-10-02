// Screenshot helper: node scripts/shots.mjs <url> <out.png> [WxH] [dpr] [waitMs] [evalJs]
import { chromium } from 'playwright';
const [url, out, size = '1920x1080', dpr = '1', wait = '1500', evalJs] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: Number(dpr), hasTouch: true, isMobile: Number(dpr) > 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.stack || String(e)));
await page.goto(url);
await page.waitForTimeout(Number(wait));
if (evalJs) { console.log('eval:', await page.evaluate(evalJs)); await page.waitForTimeout(600); }
const clip = process.env.CLIP ? Object.fromEntries(['x', 'y', 'width', 'height'].map((k, i) => [k, Number(process.env.CLIP.split(',')[i])])) : undefined;
await page.screenshot({ path: out, clip });
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
