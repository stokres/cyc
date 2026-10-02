// App icons (home screen on the phone): Fran's front face, happy, on the night blue.
// Usage: node tools/icono.mjs  → public/icono-{180,192,512}.png
import { chromium } from 'playwright';
import * as fran from '../src/arte/personajes/fran.mjs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-86 -100 172 172"><rect x="-86" y="-100" width="172" height="172" fill="#1b2342"/><circle cx="0" cy="-14" r="80" fill="#2a3458"/>${fran.headFront({ mood: 'happy' })}</svg>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const n of [180, 192, 512]) {
  const p = await b.newPage({ viewport: { width: n, height: n } });
  await p.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${n}" height="${n}" `)}</body>`);
  await p.screenshot({ path: `public/icono-${n}.png` });
  await p.close();
}
await b.close();
console.log('public/icono-{180,192,512}.png');
