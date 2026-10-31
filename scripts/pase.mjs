// La puerta de la web: una clave del grupo (variable CYC_CLAVE) que se escribe una vez y deja una cookie de 400 días.
// Lo usa scripts/servir-pokeusera.mjs (producción); `npm run dev` no tiene puerta.
//   - Sin CYC_CLAVE (o vacía): no hay puerta, todo abierto como antes, y se avisa por consola una vez.
//   - Con CYC_CLAVE: la cookie `cyc_pase` vale HMAC-SHA256(CYC_CLAVE, 'cyc-pase-1') en hex, así que cambiar la clave en Railway echa a todos.
//   - POST /api/entrar {clave}: compara (sin espacios sobrantes ni mayúsculas), pone la cookie y responde {ok:true}; 403 si no es; 429 tras demasiados fallos de una IP.
//   - Sin cookie, el servidor responde 401 a las páginas HTML (con la página de entrada), a /api y a la sala; todo lo demás (/assets, robots.txt, iconos, manifiestos) queda libre.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ip } from './api-estadisticas.mjs';

export const COOKIE = 'cyc_pase';
const DIAS = 400;
/** Fallos por IP en cada ventana antes del 429 (la clave es corta de teclear, no una contraseña fuerte: esto frena probar a lo bruto). */
const LIMITE = { max: 10, ms: 10 * 60_000 };
const MAX_CUERPO = 1024;

const hmac = (clave, mensaje) => createHmac('sha256', clave).update(mensaje).digest();
const iguales = (a, b) => a.length === b.length && timingSafeEqual(a, b);

/** Lo que un campo `cookie` guarda con ese nombre, o ''. */
function leerCookie(req, nombre) {
  const cab = req.headers.cookie;
  if (typeof cab !== 'string') return '';
  for (const parte of cab.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nombre) return parte.slice(i + 1).trim();
  }
  return '';
}

/**
 * Crea la puerta. `activa` es false si no hay CYC_CLAVE; entonces `autorizada` lo deja pasar todo y `manejar` no hace nada.
 * @param {{ clave?: string, aviso?: (m: string) => void }} [o]
 */
export function crearPase({ clave = process.env.CYC_CLAVE ?? '', aviso = (m) => console.warn(m) } = {}) {
  const secreto = clave.trim();
  if (!secreto) {
    aviso('[pase] CYC_CLAVE no está definida: la web está abierta a cualquiera.');
    return { activa: false, autorizada: () => true, manejar: () => false };
  }
  console.log('[pase] puerta puesta (CYC_CLAVE).');
  const valor = hmac(secreto, 'cyc-pase-1').toString('hex');
  const esperado = Buffer.from(valor, 'utf8');
  // Se compara el resumen de lo escrito, en minúsculas, con el de la clave: misma longitud siempre.
  const resumenClave = hmac('cyc-clave-1', secreto.toLowerCase());

  /** Fallos recientes por IP (instantes). */
  const fallos = new Map();
  const recientes = (k, ahora) => {
    const lista = (fallos.get(k) ?? []).filter((t) => ahora - t < LIMITE.ms);
    if (lista.length) fallos.set(k, lista);
    else fallos.delete(k);
    return lista;
  };
  setInterval(() => {
    const ahora = Date.now();
    for (const k of [...fallos.keys()]) recientes(k, ahora);
  }, 5 * 60_000).unref();

  const json = (res, codigo, cuerpo, extra = {}) => {
    res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
    res.end(JSON.stringify(cuerpo));
  };

  const cuerpoJson = (req) =>
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
      req.on('end', () => {
        try {
          const o = JSON.parse(Buffer.concat(trozos).toString('utf8') || '{}');
          ok(o && typeof o === 'object' ? o : null);
        } catch {
          ok(null);
        }
      });
      req.on('error', () => ok(null));
    });

  const galleta = (req) => {
    const seguro = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() === 'https';
    return `${COOKIE}=${valor}; Max-Age=${DIAS * 86400}; Path=/; HttpOnly; SameSite=Lax${seguro ? '; Secure' : ''}`;
  };

  async function entrar(req, res) {
    const k = ip(req);
    if (recientes(k, Date.now()).length >= LIMITE.max) return json(res, 429, { error: 'limite' });
    const o = await cuerpoJson(req);
    const intento = typeof o?.clave === 'string' ? o.clave.trim().toLowerCase() : '';
    if (!intento || !iguales(hmac('cyc-clave-1', intento), resumenClave)) {
      fallos.set(k, [...recientes(k, Date.now()), Date.now()]);
      return json(res, 403, { error: 'clave' });
    }
    return json(res, 200, { ok: true }, { 'Set-Cookie': galleta(req) });
  }

  return {
    activa: true,
    /** ¿Trae la cookie buena? (también para el upgrade del WebSocket de la sala). */
    autorizada(req) {
      const c = Buffer.from(leerCookie(req, COOKIE), 'utf8');
      return iguales(c, esperado);
    },
    /** Responde POST /api/entrar (true) o no hace nada (false). */
    manejar(req, res) {
      const ruta = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (ruta !== '/api/entrar') return false;
      if (req.method !== 'POST') json(res, 405, { error: 'solo POST' });
      else void entrar(req, res).catch((e) => json(res, 500, { error: String(e?.message ?? e) }));
      return true;
    },
  };
}
