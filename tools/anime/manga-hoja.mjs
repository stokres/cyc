// Hoja de revisión del manga del capítulo 2: los cinco personajes (y la sombra de Pablo) en todas sus viñetas y expresiones.
// Uso: node tools/anime/manga-hoja.mjs [salida.png] [plano]
//   Sin «plano»: la hoja de personajes (por defecto, /mnt/project-files/capitulo2/anime/manga-personajes.png).
//   Con un plano (lo que va tras @manga, entre comillas): ese plano a 844×390, p. ej.
//     node tools/anime/manga-hoja.mjs /tmp/p.png "pablo:ojos:suplica vero:boca chuchi:cara:sorpresa !gogogo"
// Las palabras de las onomatopeyas en castellano salen de src/textos/capitulo2.md (manga.ono.*).
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { hojaPersonajes, leerMarca, plano } from '../../src/arte/anime/manga.mjs';

const [salida = '/mnt/project-files/capitulo2/anime/manga-personajes.png', marca] = process.argv.slice(2);
mkdirSync(dirname(salida), { recursive: true });

const textos = {};
for (const l of readFileSync(new URL('../../src/textos/capitulo2.md', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^manga\.ono\.(\w+)\s*=\s*(.*)$/);
  if (m) textos[m[1]] = m[2].trim();
}

const svg = marca ? plano(leerMarca(marca.split(/\s+/)), 844, 390, textos) : hojaPersonajes();
const ancho = Number(svg.match(/ width="([\d.]+)"/)[1]);
const alto = Number(svg.match(/ height="([\d.]+)"/)[1]);
const html = `<!doctype html><body style="margin:0;background:#888">${svg}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: Math.ceil(ancho), height: Math.ceil(alto) }, deviceScaleFactor: marca ? 2 : 1 });
await p.setContent(html);
await p.screenshot({ path: salida });
await b.close();
console.log(salida);
