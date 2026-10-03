// Review sheet of Guille's pigs (src/arte/cerdos.mjs): the eight to weigh, in
// order, plus a nervous one. Usage: node tools/personajes/cerdos.mjs → revisiones/cerdos.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { cerdo, PIARA } from '../../src/arte/cerdos.mjs';

mkdirSync('revisiones', { recursive: true });
const celda = (svg) => `<svg viewBox="-110 -140 220 150" width="280" style="background:#3a4466;margin:4px;border-radius:8px">${svg}</svg>`;
const html = [...PIARA.map((p) => celda(cerdo(p))), celda(cerdo({ nervioso: true }))].join('');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 600 } });
await p.setContent(`<body style="margin:0;padding:6px;background:#1b2342">${html}</body>`);
await p.screenshot({ path: 'revisiones/cerdos.png', fullPage: true });
await b.close();
console.log('revisiones/cerdos.png');
