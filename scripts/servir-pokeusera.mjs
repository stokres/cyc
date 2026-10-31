// Server of all the games, for Railway (`npm start`, after `npm run build`): serves ./dist with clean URLs (scripts/rutas.mjs), plus the online room of
// PokéUsera at /sala (scripts/sala-pokeusera.mjs) and its statistics API at /api (scripts/api-estadisticas.mjs, docs/POKEUSERA.md).
//   /            the cover (dist/portada.html)           /pokeusera   PokéUsera (dist/pokeusera.html)       /aventura   PokéUsera, straight into AVENTURA
//   /capitulo1   the chapter (dist/index.html)           /pang        the whole Pang (index.html opens it, see src/core/direccion.ts)
//   /capitulo2 /sol /kart /unamas   hidden games, the same way (they work, the cover does not announce them)
//   /fly         Fly (dist/fly/index.html, built with base /fly/)     /trazo   Trazo (dist/trazo/index.html)
// A route with a final slash (/pang/) redirects (301) to the one without: the relative paths of the build (./assets/...) would break under it (Fly uses absolute /fly/... paths, Trazo loads nothing relative, but the rule is the same for all).
// The files of dist/ keep their own paths (/assets/..., /pokeusera-sw.js, /index.html, /pokeusera.html?aventura...): old links and installed apps still work.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adjuntarSala } from './sala-pokeusera.mjs';
import { RUTAS } from './rutas.mjs';
import { crearApiEstadisticas, leerCatalogo } from './api-estadisticas.mjs';

// POKEUSERA_DIST: another build folder (to try a build without touching ./dist).
const RAIZ = resolve(process.env.POKEUSERA_DIST ?? fileURLToPath(new URL('../dist', import.meta.url)));
const PUERTO = Number(process.env.PORT) || 8080;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8',
};

function responder(res, codigo, cuerpo, tipo = 'text/plain; charset=utf-8') {
  res.writeHead(codigo, { 'Content-Type': tipo, 'Cache-Control': 'no-cache' });
  res.end(cuerpo);
}

/** The file for a URL path, or null if it escapes ./dist or does not exist. */
async function buscar(ruta) {
  let decodificada;
  try {
    decodificada = decodeURIComponent(ruta);
  } catch {
    return null;
  }
  if (decodificada.includes('\0')) return null;
  const limpia = normalize(decodificada);
  const archivo = resolve(join(RAIZ, limpia));
  if (archivo !== RAIZ && !archivo.startsWith(RAIZ + sep)) return null;
  try {
    const info = await stat(archivo);
    if (info.isFile()) return { archivo, info };
    if (info.isDirectory()) {
      const indice = join(archivo, 'index.html');
      const i = await stat(indice);
      if (i.isFile()) return { archivo: indice, info: i };
    }
  } catch {
    /* not there */
  }
  return null;
}

// Estadísticas acumuladas (scripts/api-estadisticas.mjs): POST /api/batallas y GET /api/estadisticas. POKEUSERA_DATOS: la carpeta de los datos (por defecto ./datos-pokeusera).
let estadisticas = null;
try {
  estadisticas = await crearApiEstadisticas({ catalogo: await leerCatalogo(join(RAIZ, 'pokeusera-catalogo.json')) });
} catch (e) {
  console.error(`[estadisticas] desactivadas: ${e.code === 'ENOENT' ? 'falta pokeusera-catalogo.json en ' + RAIZ + ' (npm run build lo crea)' : e.message}`);
}

const servidor = createServer(async (req, res) => {
  if (estadisticas?.manejar(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'HEAD') return responder(res, 405, 'Method Not Allowed');
  const url = new URL(req.url ?? '/', 'http://localhost');
  const ruta = url.pathname;
  // /pang/ → /pang (keeping the query)
  if (ruta.length > 1 && ruta.endsWith('/') && Object.hasOwn(RUTAS, ruta.replace(/\/+$/, ''))) {
    res.writeHead(301, { Location: ruta.replace(/\/+$/, '') + url.search, 'Cache-Control': 'no-cache' });
    return res.end();
  }
  // A clean route is served as the page it stands for (the file keeps its own path: `ruta` below is what was asked).
  const hallado = await buscar(Object.hasOwn(RUTAS, ruta) ? '/' + RUTAS[ruta] : ruta);
  if (!hallado) return responder(res, 404, 'No encontrado');
  const ext = extname(hallado.archivo).toLowerCase();
  const cabeceras = {
    'Content-Type': TIPOS[ext] ?? 'application/octet-stream',
    'Content-Length': hallado.info.size,
    // Built files in /assets (and in /fly/assets) carry a hash in their name: they never change. Everything else is rechecked.
    'Cache-Control': /^\/(fly\/)?assets\//.test(ruta) ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  };
  // The service worker (the installed app, docs/POKEUSERA.md): never cached, so a new version is noticed at once; it lives at the root, so its scope is the whole site.
  if (ruta === '/pokeusera-sw.js') {
    cabeceras['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    cabeceras['Service-Worker-Allowed'] = '/';
  }
  // Files that are not hashed (Fly's models in /fly/models, the pages...) are rechecked each time: with Last-Modified the check costs a 304 instead of the whole file.
  if (cabeceras['Cache-Control'] === 'no-cache') {
    const modificado = new Date(Math.floor(hallado.info.mtimeMs / 1000) * 1000);
    cabeceras['Last-Modified'] = modificado.toUTCString();
    const desde = Date.parse(req.headers['if-modified-since'] ?? '');
    if (desde >= modificado.getTime()) {
      delete cabeceras['Content-Length'];
      res.writeHead(304, cabeceras);
      return res.end();
    }
  }
  res.writeHead(200, cabeceras);
  if (req.method === 'HEAD') return res.end();
  createReadStream(hallado.archivo).on('error', () => res.destroy()).pipe(res);
});

adjuntarSala(servidor);
servidor.listen(PUERTO, '0.0.0.0', () => console.log(`PokéUsera en el puerto ${PUERTO} (sirviendo ${RAIZ})`));
