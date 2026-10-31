// Récords de todos (docs/POKEUSERA.md, «Cuentas»): la lista cerrada de tablas y lo que vale en cada una. La comparten el servidor (scripts/records.mjs)
// y el cliente (src/cuenta/records.ts): JavaScript con tipos en tablas.d.mts porque el servidor no compila TypeScript.
// Una tabla por juego con puntos: el Pang y los minijuegos sin fin del capítulo 1 (los mismos ids que `MINIJUEGOS` de src/main.ts).

/** Los personajes del Pang (los mismos que `PJS` de src/pang/tipos.ts). */
export const PJS_PANG = ['fran', 'pablo', 'chuchi', 'guille'];
export const FASES_PANG = 12;

/** tabla → tope de puntos (una marca por encima se rechaza: ninguna partida de verdad llega ahí) y qué `extra` lleva. */
export const TABLAS = {
  pang: { max: 9_999_999, extra: 'pang' },
  rana: { max: 99_999, extra: null },
  palabras: { max: 99_999, extra: null },
  robot: { max: 99_999, extra: null },
  cerdos: { max: 99_999, extra: null },
};

/** Marcas que guarda el servidor por tabla y por cuenta (una cuenta puede salir varias veces, como en una recreativa). */
export const POR_CUENTA = 10;
export const POR_TABLA = 100;
/** Las que devuelve `GET /api/records?tabla=`. */
export const TOP = 10;

/** Una marca anterior a esto (septiembre de 2001) no es de un reloj en hora. */
const FECHA_MIN = 1e12;
const DIA_MS = 24 * 60 * 60 * 1000;

export const esTabla = (x) => typeof x === 'string' && Object.hasOwn(TABLAS, x);

/** Los puntos como entero positivo dentro del tope de la tabla, o null. */
export function limpiarPuntos(tabla, x) {
  if (!esTabla(tabla) || typeof x !== 'number' || !Number.isInteger(x) || x < 1 || x > TABLAS[tabla].max) return null;
  return x;
}

/**
 * El `extra` listo para guardar: null si la tabla no lleva (o no vino), `{ pj, fase }` en el Pang, o undefined si no vale
 * (una clave de más, un personaje que no existe, una fase fuera de 1 a 12).
 */
export function limpiarExtra(tabla, x) {
  if (!esTabla(tabla) || x === undefined || x === null) return null;
  if (TABLAS[tabla].extra !== 'pang') return undefined;
  if (typeof x !== 'object' || Array.isArray(x) || Object.keys(x).some((k) => k !== 'pj' && k !== 'fase')) return undefined;
  if (!PJS_PANG.includes(x.pj) || !Number.isInteger(x.fase) || x.fase < 1 || x.fase > FASES_PANG) return undefined;
  return { pj: x.pj, fase: x.fase };
}

/** El instante de la partida (milisegundos; llega como número o como texto ISO): el de ahora si no vale o va muy al futuro (reloj adelantado). */
export function limpiarFecha(x, ahora = Date.now()) {
  const ms = typeof x === 'string' ? Date.parse(x) : x;
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < FECHA_MIN || ms > ahora + DIA_MS) return ahora;
  return Math.min(Math.round(ms), ahora);
}
