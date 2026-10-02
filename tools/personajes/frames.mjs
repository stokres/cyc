// Contact sheet of an animation from the character sheet: node tools/personajes/frames.mjs <url> <out.png> [mode] [frames] [period]
import { chromium } from 'playwright';
const [url, out, mode = 'walk', n = '8', period = '1'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(url); await p.waitForTimeout(800);
await p.click(`[data-v=${mode}]`);
const shots = [];
for (let i = 0; i < +n; i++) {
  await p.evaluate((t) => (window.__freeze = t), (i / +n) * +period);
  await p.waitForTimeout(400);
  const el = await p.$('#fran-svg');
  shots.push((await el.screenshot()).toString('base64'));
}
const p2 = await b.newPage({ viewport: { width: 1600, height: 500 } });
await p2.setContent(`<body style="margin:0;display:flex;gap:4px;background:#111">${shots.map((s) => `<img src="data:image/png;base64,${s}" style="height:480px">`).join('')}</body>`);
await p2.screenshot({ path: out, fullPage: true });
await b.close();
