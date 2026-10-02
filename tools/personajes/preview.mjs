// Renders review sheets of a character to PNG.
// Usage: PJ=fran|pablo|chuchi [FOTO=/ruta/foto] node tools/personajes/preview.mjs <cabeza|expresiones|vistas|cuerpo|movil>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const name = process.argv[2] ?? 'cabeza';
const who = process.env.PJ ?? 'fran';
const out = `revisiones/${who}`;
mkdirSync(out, { recursive: true });
const F = await import(`./${who}.mjs?${Date.now()}`);
// Optional reference photo for side-by-side review (local only, never committed): FOTO=/ruta/foto.jpg
const photo = (h) => (process.env.FOTO ? `<figure><img src="${process.env.FOTO}" height="${h}"><figcaption>Foto (solo revisión local)</figcaption></figure>` : '');
const cell = (vb, body, w = 520, label = '') => `<figure><svg viewBox="${vb}" width="${w}">${body}</svg><figcaption>${label}</figcaption></figure>`;
const sheets = {
  cabeza: () => [
    photo(560),
    cell('-65 -95 135 165', F.head() + F.guides(), 480, 'Construcción'),
    cell('-65 -95 135 165', F.head(), 480, 'Reposo'),
  ],
  expresiones: () => ['neutral', 'happy', 'surprised', 'sad', 'angry'].map((m) => cell('-65 -95 135 175', F.head({ mood: m }), 300, m))
    .concat(['a', 'e', 'o', 'm'].map((k) => cell('-65 -95 135 175', F.head({ mouthKind: k }), 360, k)))
    .concat([cell('-65 -95 135 175', F.head({ blink: true }), 360, 'parpadeo')]),
  cuerpo: () => [
    photo(420),
    cell('-80 -292 160 302', F.body(), 520, 'Cuerpo · reposo'),
    cell('-80 -292 160 302', F.body({ mood: 'happy' }), 300, 'contento'),
    [140, 110].map((px) => cell('-80 -292 160 302', F.body(), px * 0.52, `${px}px de alto`)).join(''),
  ],
  vistas: () => [
    cell('-65 -95 130 170', F.headFront(), 380, 'Frente'),
    cell('-65 -95 135 170', F.head(), 380, 'Tres cuartos'),
    cell('-65 -95 130 170', F.headProfile(), 380, 'Perfil'),
    cell('-65 -95 130 170', F.headFront({ mood: 'neutral' }), 380, 'Frente · neutral'),
  ],
  movil: () => [40, 50, 60, 80].map((px) => cell('-65 -95 135 175', F.head(), px * 1.65, `${px}px`)),
};
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:16px;background:#e9e4da;font:14px sans-serif;display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end}figure{margin:0;background:#f6f2ea;padding:8px;border-radius:8px}figcaption{text-align:center;color:#555}.pivot{display:none}</style>${sheets[name]().join('')}`;
const file = `${process.cwd()}/${out}/${name}.html`;
writeFileSync(file, html);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.goto('file://' + file);
await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
await browser.close();
console.log(`${out}/${name}.png`);
