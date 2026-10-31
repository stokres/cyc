// Front-view heads of the four friends as small WebP images for the cover page (src/portada/): the same drawing as the dialogue portraits
// (`headFront` of src/arte/personajes/*.mjs), baked once here so the cover loads four tiny files instead of the characters' vector art.
// Usage: node tools/personajes/retratos-portada.mjs  → src/portada/retratos/{fran,pablo,chuchi,guille}.webp (256 px high, transparent)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const salida = 'src/portada/retratos';
mkdirSync(salida, { recursive: true });
const ids = ['fran', 'pablo', 'chuchi', 'guille'];
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const p = await b.newPage();
for (const id of ids) {
  const M = await import(`../../src/arte/personajes/${id}.mjs`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-65 -95 130 170" width="195" height="255">${M.headFront({ mood: 'happy' })}</svg>`;
  const url = await p.evaluate(async (s) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 195;
    c.height = 255;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', 0.9);
  }, svg);
  const datos = Buffer.from(url.split(',')[1], 'base64');
  writeFileSync(`${salida}/${id}.webp`, datos);
  console.log(`${salida}/${id}.webp · ${(datos.length / 1024).toFixed(1)} KB`);
}
await b.close();
