// Serves ./dist for Railway (`npm start`, after `npm run build`). No dependencies.
// «/» opens the Pang (dist/pang.html); the chapter 1 stays at /index.html.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
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
  const limpia = normalize(decodificada === '/' ? '/pang.html' : decodificada);
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

const servidor = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return responder(res, 405, 'Method Not Allowed');
  const ruta = new URL(req.url ?? '/', 'http://localhost').pathname;
  const hallado = await buscar(ruta);
  if (!hallado) return responder(res, 404, 'No encontrado');
  const ext = extname(hallado.archivo).toLowerCase();
  const cabeceras = {
    'Content-Type': TIPOS[ext] ?? 'application/octet-stream',
    'Content-Length': hallado.info.size,
    // Built files in /assets carry a hash in their name: they never change. Everything else is rechecked.
    'Cache-Control': ruta.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  };
  res.writeHead(200, cabeceras);
  if (req.method === 'HEAD') return res.end();
  createReadStream(hallado.archivo).on('error', () => res.destroy()).pipe(res);
});

servidor.listen(PUERTO, '0.0.0.0', () => console.log(`Pang en el puerto ${PUERTO} (sirviendo ${RAIZ})`));
