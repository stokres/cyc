// PokéUsera · estadísticas acumuladas del servidor (docs/POKEUSERA.md, «Estadísticas acumuladas»).
//   POST /api/batallas      un resumen de batalla (JSON, hasta 32 KB): se valida, se añade al final de un JSONL y se suma al agregado.
//   GET  /api/estadisticas  { v, n, ag }: los agregados de todas las batallas (se calculan al arrancar y al añadir; el GET no recorre el archivo).
// Los resúmenes viven en `${POKEUSERA_DATOS}/batallas.jsonl` (por defecto ./datos-pokeusera). En Railway hace falta un Volume montado ahí, o el disco se borra en cada despliegue.
// La suma es `src/pokeusera/estadisticas/agregado.mjs`, la misma que usa el móvil para sus datos locales.
// Lo usan scripts/servir-pokeusera.mjs (producción) y vite.config.ts (npm run dev).
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { FORMATO, agregadoVacio, normalizarResumen, prepararCatalogo, sumarResumen } from '../src/pokeusera/estadisticas/agregado.mjs';

const MAX_CUERPO = 32 * 1024;
/** Por IP: envíos de batallas y lecturas permitidos en cada ventana. Una batalla dura minutos: esto da mucho margen a un grupo de amigos tras la misma wifi. */
const LIMITES = {
  envio: { max: 60, ms: 10 * 60_000 },
  lectura: { max: 120, ms: 60_000 },
};

/** Carga `pokeusera-catalogo.json` (lo escribe `npm run build` junto al juego, a partir de datos.ts). */
export async function leerCatalogo(ruta) {
  return prepararCatalogo(JSON.parse(await readFile(ruta, 'utf8')));
}

const ip = (req) => {
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real) return real.trim();
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff) return xff.split(',').pop().trim();
  return req.socket.remoteAddress ?? '?';
};

/**
 * Starts the statistics: reads the JSONL once and returns `{ manejar(req, res) }`; `manejar` answers the two endpoints and returns true,
 * or returns false for any other path (the caller serves its own things).
 * @param {{ carpeta?: string, catalogo: ReturnType<typeof prepararCatalogo>, aviso?: (m: string) => void }} o
 */
export async function crearApiEstadisticas({ carpeta, catalogo, aviso = (m) => console.log(m) }) {
  const dir = resolve(carpeta ?? process.env.POKEUSERA_DATOS ?? './datos-pokeusera');
  const archivo = join(dir, 'batallas.jsonl');
  const ag = agregadoVacio();
  const vistos = new Set();
  let respuesta = null;
  let escribible = true;

  // ---- arranque: el archivo, una sola vez
  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    escribible = false;
    aviso(`[estadisticas] no puedo crear ${dir} (${e.code ?? e.message}): se cuentan en memoria y se pierden al reiniciar`);
  }
  let malas = 0;
  try {
    const lineas = createInterface({ input: createReadStream(archivo, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const l of lineas) {
      if (!l.trim()) continue;
      let r;
      try {
        r = normalizarResumen(JSON.parse(l), catalogo);
      } catch {
        r = { error: 'json' };
      }
      if (r.error) malas++;
      else if (!vistos.has(r.resumen.id)) {
        vistos.add(r.resumen.id);
        sumarResumen(ag, r.resumen);
      }
    }
  } catch (e) {
    if (e.code !== 'ENOENT') aviso(`[estadisticas] no puedo leer ${archivo}: ${e.code ?? e.message}`);
  }
  aviso(`[estadisticas] ${ag.todas.n} batallas en ${archivo}${malas ? ` (${malas} líneas que no valen, ignoradas)` : ''}`);

  // ---- un solo escritor: las líneas se añaden de una en una y en orden
  let cola = Promise.resolve();
  const escribir = (linea) => {
    const p = cola.then(() => appendFile(archivo, linea, 'utf8'));
    cola = p.catch(() => undefined);
    return p;
  };

  // ---- límites por IP
  const ventanas = new Map();
  const permitido = (clave, lim) => {
    const ahora = Date.now();
    const lista = (ventanas.get(clave) ?? []).filter((t) => ahora - t < lim.ms);
    if (lista.length >= lim.max) {
      ventanas.set(clave, lista);
      return false;
    }
    lista.push(ahora);
    ventanas.set(clave, lista);
    return true;
  };
  setInterval(() => {
    const ahora = Date.now();
    for (const [k, v] of ventanas) if (!v.some((t) => ahora - t < 10 * 60_000)) ventanas.delete(k);
  }, 5 * 60_000).unref();

  const json = (res, codigo, cuerpo) => {
    const s = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
    res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(s);
  };

  /** Reads the body up to `MAX_CUERPO` bytes; null if it is bigger. */
  const leerCuerpo = (req) =>
    new Promise((ok) => {
      const trozos = [];
      let n = 0;
      req.on('data', (t) => {
        n += t.length;
        if (n > MAX_CUERPO) {
          ok(null);
          req.destroy();
        } else trozos.push(t);
      });
      req.on('end', () => ok(Buffer.concat(trozos).toString('utf8')));
      req.on('error', () => ok(null));
    });

  async function recibir(req, res) {
    if (!permitido(`e|${ip(req)}`, LIMITES.envio)) return json(res, 429, { error: 'demasiados envíos' });
    const largo = Number(req.headers['content-length']);
    if (Number.isFinite(largo) && largo > MAX_CUERPO) return json(res, 413, { error: 'demasiado grande' });
    const texto = await leerCuerpo(req);
    if (texto === null) return json(res, 413, { error: 'demasiado grande' });
    let bruto;
    try {
      bruto = JSON.parse(texto);
    } catch {
      return json(res, 400, { error: 'json' });
    }
    const r = normalizarResumen(bruto, catalogo);
    if (r.error) return json(res, 400, { error: r.error });
    const resumen = r.resumen;
    if (vistos.has(resumen.id)) return json(res, 200, { ok: true, repetida: true });
    vistos.add(resumen.id);
    if (escribible) {
      try {
        await escribir(JSON.stringify(resumen) + '\n');
      } catch (e) {
        vistos.delete(resumen.id);
        aviso(`[estadisticas] no puedo escribir en ${archivo}: ${e.code ?? e.message}`);
        return json(res, 503, { error: 'no se pudo guardar' });
      }
    }
    sumarResumen(ag, resumen);
    respuesta = null;
    return json(res, 200, { ok: true, n: ag.todas.n });
  }

  return {
    /** Answers /api/batallas and /api/estadisticas (true), or does nothing (false). */
    manejar(req, res) {
      const ruta = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (ruta === '/api/batallas') {
        if (req.method !== 'POST') json(res, 405, { error: 'solo POST' });
        else void recibir(req, res).catch((e) => json(res, 500, { error: String(e?.message ?? e) }));
        return true;
      }
      if (ruta === '/api/estadisticas') {
        if (req.method !== 'GET') json(res, 405, { error: 'solo GET' });
        else if (!permitido(`l|${ip(req)}`, LIMITES.lectura)) json(res, 429, { error: 'demasiadas lecturas' });
        else json(res, 200, (respuesta ??= JSON.stringify({ v: FORMATO, n: ag.todas.n, ag })));
        return true;
      }
      return false;
    },
    /** Batallas contadas (para los avisos del arranque y las pruebas). */
    get batallas() {
      return ag.todas.n;
    },
  };
}
