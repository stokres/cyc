// Cuentas de la web: la lista cerrada de juegos que se guardan en el perfil y la clave de localStorage de cada uno. La comparten el servidor
// (scripts/cuentas.mjs) y el cliente (src/cuenta/sincronizar.ts), JavaScript con tipos en juegos.d.mts porque el servidor no compila TypeScript.
// Cada clave guarda un texto (casi siempre un JSON de unos pocos KB) que el perfil copia tal cual, sin mirar dentro.
//
// No se guardan `cyc.ajustes` (calidad gráfica, fps y pantalla completa dependen del aparato: lo que va bien en el ordenador no va bien en el móvil),
// `cyc.calidad.auto` ni las claves de estadísticas, de la sala o de la cuenta misma.

/** juego → clave de localStorage. */
export const JUEGOS = {
  capitulo1: 'cyc.partida.v4',
  capitulo2: 'cyc.capitulo2',
  pang: 'cyc.pang.v1',
  aventura: 'pokeusera.caza.v1',
  pokeusera: 'pokeusera.v1',
};

/** Tope de un juego (bytes del texto). Lo normal son 1 a 10 KB. */
export const MAX_JUEGO = 64 * 1024;
/** Tope de todo el perfil (suma de sus juegos). */
export const MAX_PERFIL = 256 * 1024;
/** Una marca de tiempo anterior a esto (septiembre de 2001) no es de un reloj en hora. */
const ACT_MIN = 1e12;

export const esJuego = (x) => typeof x === 'string' && Object.hasOwn(JUEGOS, x);

/**
 * El `act` (milisegundos del último cambio, lo pone el cliente) listo para guardar: entero razonable, y si va al futuro (reloj adelantado)
 * se queda en `ahora`. null si no es un número razonable.
 */
export function limpiarAct(x, ahora = Date.now()) {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < ACT_MIN) return null;
  return Math.min(Math.round(x), ahora);
}

/** El contenido de un juego (el texto de su clave de localStorage; null = clave borrada) o undefined si no vale. */
export function limpiarDatos(x) {
  if (x === null) return null;
  if (typeof x !== 'string' || new TextEncoder().encode(x).length > MAX_JUEGO) return undefined;
  return x;
}
