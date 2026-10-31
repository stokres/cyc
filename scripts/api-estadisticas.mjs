// PokéUsera · estadísticas acumuladas del servidor (docs/POKEUSERA.md, «Estadísticas acumuladas»).
//   POST /api/batallas      un resumen de batalla (JSON, hasta 32 KB): se valida, se añade al final de un JSONL y se suma al agregado.
//   GET  /api/estadisticas  { v, n, ag, cuentas }: los agregados de todas las batallas (se calculan al arrancar y al añadir; el GET no recorre el archivo)
//                           y, de cada cuenta con batallas, sus sumas (la tabla de ENTRENADORES). Con `?cuenta=<id público>`: { v, n, nombre, racha, ag } de esa cuenta.
//   POST /api/cuentas, POST /api/cuentas/recuperar, GET|PUT /api/cuentas/yo, GET|PUT /api/cuentas/yo/juegos/<juego>: las cuentas de usuario de la web, con lo guardado
//                           de cada juego (scripts/cuentas.mjs; docs/POKEUSERA.md, «Cuentas»).
//                           Cada jugador de un resumen llega con su token en `cu`; aquí se cambia por el id público de su cuenta (o null): el token no se guarda ni se devuelve nunca.
// Los resúmenes viven en `${POKEUSERA_DATOS}/batallas.jsonl` (por defecto ./datos-pokeusera). En Railway hace falta un Volume montado ahí, o el disco se borra en cada despliegue.
// La suma es `src/pokeusera/estadisticas/agregado.mjs`, la misma que usa el móvil para sus datos locales.
// Lo usan scripts/servir-pokeusera.mjs (producción) y vite.config.ts (npm run dev).
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { FORMATO, agregadoVacio, normalizarResumen, prepararCatalogo, sumarResumen } from '../src/pokeusera/estadisticas/agregado.mjs';
import { limpiarCodigo } from '../src/cuenta/reglas.mjs';
import { esJuego, MAX_JUEGO } from '../src/cuenta/juegos.mjs';
import { crearAlmacenCuentas } from './cuentas.mjs';

const MAX_CUERPO = 32 * 1024;
/** El cuerpo de un juego: su texto (hasta MAX_JUEGO) va dentro de un JSON, donde cada comilla se duplica, y lleva el `act`. */
const MAX_CUERPO_JUEGO = 2 * MAX_JUEGO + 1024;
/** Por IP: envíos de batallas y lecturas permitidos en cada ventana. Una batalla dura minutos: esto da mucho margen a un grupo de amigos tras la misma wifi. */
const LIMITES = {
  envio: { max: 60, ms: 10 * 60_000 },
  lectura: { max: 120, ms: 60_000 },
  /** Cuentas: crear (un grupo de amigos tras la misma wifi cabe de sobra), probar códigos (frena la fuerza bruta: 32^6 posibles) y leer/subir el perfil. */
  crear: { max: 12, ms: 60 * 60_000 },
  recuperar: { max: 20, ms: 10 * 60_000 },
  perfil: { max: 120, ms: 60_000 },
};

/** Carga `pokeusera-catalogo.json` (lo escribe `npm run build` junto al juego, a partir de datos.ts). */
export async function leerCatalogo(ruta) {
  return prepararCatalogo(JSON.parse(await readFile(ruta, 'utf8')));
}

export const ip = (req) => {
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
  // Las cuentas (su archivo es hermano de batallas.jsonl). Cuando cambia un nombre o entra una cuenta, el JSON de /api/estadisticas se rehace.
  const cuentas = await crearAlmacenCuentas({ carpeta: dir, aviso, alCambiar: () => (respuesta = null) });
  /** Por id público de cuenta: sus agregados (con el mismo agregado.mjs, solo con su jugador) y su racha de victorias, en el orden en que llegaron. */
  const porCuenta = new Map();
  const deCuenta = (id) => {
    let c = porCuenta.get(id);
    if (!c) porCuenta.set(id, (c = { ag: agregadoVacio(), actual: 0, mejor: 0 }));
    return c;
  };
  /** Suma una batalla ya limpia (con `cu` públicos) a los agregados de todos y a los de cada cuenta que juega en ella. */
  const contar = (resumen) => {
    sumarResumen(ag, resumen);
    for (const j of resumen.ju) {
      if (!j.cu) continue;
      const c = deCuenta(j.cu);
      sumarResumen(c.ag, { ...resumen, ju: [j] });
      if (j.pu === 1) c.mejor = Math.max(c.mejor, ++c.actual);
      else c.actual = 0;
    }
  };

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
        contar(r.resumen);
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

  /** Reads the body up to `tope` bytes (32 KB by default); null if it is bigger. */
  const leerCuerpo = (req, tope = MAX_CUERPO) =>
    new Promise((ok) => {
      const trozos = [];
      let n = 0;
      req.on('data', (t) => {
        n += t.length;
        if (n > tope) {
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
    // El token de cada jugador se cambia por el id público de su cuenta: solo personas, una vez por batalla; lo que no sea un token de verdad queda en null.
    const usadas = new Set();
    for (const j of resumen.ju) {
      const id = j.pe && j.cu ? cuentas.idDeToken(j.cu) : null;
      j.cu = id && !usadas.has(id) ? id : null;
      if (j.cu) usadas.add(j.cu);
    }
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
    contar(resumen);
    respuesta = null;
    return json(res, 200, { ok: true, n: ag.todas.n });
  }

  // ---- cuentas
  const tokenDe = (req) => {
    const t = req.headers['x-token'];
    return typeof t === 'string' ? t.trim() : '';
  };
  /** El cuerpo como objeto JSON, o responde el error y devuelve null. */
  async function cuerpoJson(req, res, tope = MAX_CUERPO) {
    const largo = Number(req.headers['content-length']);
    const texto = Number.isFinite(largo) && largo > tope ? null : await leerCuerpo(req, tope);
    if (texto === null) return void json(res, 413, { error: 'demasiado grande' });
    try {
      const o = JSON.parse(texto || '{}');
      if (o && typeof o === 'object' && !Array.isArray(o)) return o;
    } catch {
      /* below */
    }
    return void json(res, 400, { error: 'json' });
  }
  const perfil = (c, conJuegos) => ({ id: c.id, nombre: c.nombre, codigo: c.codigo, alta: c.alta, ...(conJuegos ? { juegos: cuentas.actsDe(c) } : {}) });
  const errorCambio = (res, e) => json(res, e === 'repetido' ? 409 : e === 'disco' ? 503 : 400, { error: e });

  async function crearCuenta(req, res) {
    if (!permitido(`c|${ip(req)}`, LIMITES.crear)) return json(res, 429, { error: 'demasiadas cuentas' });
    const o = await cuerpoJson(req, res);
    if (!o) return;
    const r = await cuentas.crear(o.nombre);
    if (r.error) return errorCambio(res, r.error);
    return json(res, 200, { token: r.cuenta.token, codigo: r.cuenta.codigo, nombre: r.cuenta.nombre, id: r.cuenta.id });
  }
  async function recuperarCuenta(req, res) {
    if (!permitido(`r|${ip(req)}`, LIMITES.recuperar)) return json(res, 429, { error: 'demasiados intentos' });
    const o = await cuerpoJson(req, res);
    if (!o) return;
    const codigo = limpiarCodigo(o.codigo);
    if (!codigo) return json(res, 400, { error: 'codigo' });
    const c = cuentas.recuperar(codigo);
    if (!c) return json(res, 404, { error: 'no existe' });
    return json(res, 200, { token: c.token, nombre: c.nombre, codigo: c.codigo, id: c.id });
  }
  async function miCuenta(req, res) {
    if (!permitido(`p|${ip(req)}`, LIMITES.perfil)) return json(res, 429, { error: 'demasiadas peticiones' });
    const c = cuentas.deToken(tokenDe(req));
    if (!c) return json(res, 401, { error: 'token' });
    if (req.method === 'GET') return json(res, 200, perfil(c, true));
    const o = await cuerpoJson(req, res);
    if (!o) return;
    const r = await cuentas.cambiar(c, { nombre: o.nombre });
    if (r.error) return errorCambio(res, r.error);
    return json(res, 200, perfil(c, false));
  }
  /** GET|PUT /api/cuentas/yo/juegos/<juego>: lo guardado de un juego en el perfil (`{ datos, act }`). */
  async function miJuego(req, res, juego) {
    if (!permitido(`p|${ip(req)}`, LIMITES.perfil)) return json(res, 429, { error: 'demasiadas peticiones' });
    const c = cuentas.deToken(tokenDe(req));
    if (!c) return json(res, 401, { error: 'token' });
    if (!esJuego(juego)) return json(res, 404, { error: 'juego' });
    if (req.method === 'GET') {
      const g = cuentas.juego(c, juego);
      return g ? json(res, 200, { datos: g.datos, act: g.act }) : json(res, 404, { error: 'sin datos' });
    }
    const o = await cuerpoJson(req, res, MAX_CUERPO_JUEGO);
    if (!o) return;
    const r = await cuentas.guardarJuego(c, juego, o);
    if (r.error === 'viejo') return json(res, 409, { error: 'viejo', act: r.act });
    if (r.error === 'grande') return json(res, 413, { error: 'demasiado grande' });
    if (r.error) return json(res, r.error === 'disco' ? 503 : 400, { error: r.error });
    return json(res, 200, { ok: true, act: r.act });
  }

  /** Las sumas de una cuenta para la tabla de ENTRENADORES: partidas, victorias, suma de puestos, daño hecho/recibido, KO y el entrenador que más usa. */
  function resumenCuenta(id, c) {
    const s = c.ag.personas;
    let fav = '';
    let mas = 0;
    const t = { id, nombre: cuentas.nombreDe(id), n: s.n, g: 0, pu: 0, dh: 0, dr: 0, ko: 0, fav };
    for (const [en, e] of Object.entries(s.ent)) {
      t.g += e.g;
      t.pu += e.pu;
      t.dh += e.dh;
      t.dr += e.dr;
      t.ko += e.ko;
      if (e.n > mas) {
        mas = e.n;
        t.fav = en;
      }
    }
    return t;
  }
  const estadisticasTodos = () => {
    const lista = [];
    for (const [id, c] of porCuenta) if (cuentas.existe(id) && c.ag.personas.n > 0) lista.push(resumenCuenta(id, c));
    return JSON.stringify({ v: FORMATO, n: ag.todas.n, ag, cuentas: lista });
  };

  return {
    /** Answers /api/batallas, /api/estadisticas and /api/cuentas* (true), or does nothing (false). */
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
        else {
          const id = new URL(req.url ?? '/', 'http://localhost').searchParams.get('cuenta');
          if (id === null) json(res, 200, (respuesta ??= estadisticasTodos()));
          else {
            const c = cuentas.existe(id) ? (porCuenta.get(id) ?? { ag: agregadoVacio(), actual: 0, mejor: 0 }) : null;
            if (!c) json(res, 404, { error: 'no existe' });
            else json(res, 200, { v: FORMATO, n: c.ag.personas.n, nombre: cuentas.nombreDe(id), racha: { a: c.actual, m: c.mejor }, ag: c.ag });
          }
        }
        return true;
      }
      if (ruta === '/api/cuentas' || ruta === '/api/cuentas/recuperar' || ruta === '/api/cuentas/yo') {
        const solo = ruta === '/api/cuentas/yo' ? ['GET', 'PUT'] : ['POST'];
        if (!solo.includes(req.method)) json(res, 405, { error: 'método' });
        else {
          const f = ruta === '/api/cuentas' ? crearCuenta : ruta === '/api/cuentas/recuperar' ? recuperarCuenta : miCuenta;
          void f(req, res).catch((e) => json(res, 500, { error: String(e?.message ?? e) }));
        }
        return true;
      }
      if (ruta.startsWith('/api/cuentas/yo/juegos/')) {
        if (req.method !== 'GET' && req.method !== 'PUT') json(res, 405, { error: 'método' });
        else void miJuego(req, res, ruta.slice('/api/cuentas/yo/juegos/'.length)).catch((e) => json(res, 500, { error: String(e?.message ?? e) }));
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
