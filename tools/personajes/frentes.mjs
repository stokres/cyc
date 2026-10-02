// Review sheet of the front-view heads used in dialogue portraits: moods, visemes, blink.
// Usage: node tools/personajes/frentes.mjs  → revisiones/frentes.png
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('revisiones', { recursive: true });
const ids = ['fran', 'pablo', 'chuchi', 'guille'];
const casos = [['neutral'], ['happy'], ['surprised'], ['sad'], ['angry'], ['neutral', 'a'], ['neutral', 'e'], ['neutral', 'o'], ['neutral', 'm'], ['neutral', null, true]];
let html = '<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:10px;background:#1b2342;font:12px sans-serif;color:#eee}.f{display:flex;gap:6px;margin-bottom:6px}figure{margin:0;background:#2a3458;border-radius:8px;padding:4px;text-align:center}</style>';
for (const id of ids) {
  const M = await import(`../../src/arte/personajes/${id}.mjs`);
  html += '<div class="f">' + casos.map(([mood, mouthKind, blink]) => `<figure><svg viewBox="-65 -95 130 170" width="130">${M.headFront({ mood: mood === 'neutral' ? M.INFO.defaultMood : mood, mouthKind: mouthKind ?? undefined, blink: !!blink })}</svg><figcaption>${mood}${mouthKind ? ' ' + mouthKind : ''}${blink ? ' parpadeo' : ''}</figcaption></figure>`).join('') + '</div>';
}
writeFileSync('revisiones/frentes.html', html);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1420, height: 900 } });
await p.goto('file://' + process.cwd() + '/revisiones/frentes.html');
await p.screenshot({ path: 'revisiones/frentes.png', fullPage: true });
await b.close();
console.log('revisiones/frentes.png');
