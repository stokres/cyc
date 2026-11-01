// The online rooms of the whole web: the pure rules (no DOM, no Node) shared by the server (scripts/salas.mjs) and the phone (src/sala/conexion.ts),
// so both check the same things (docs/SALAS.md). JavaScript with types in reglas.d.mts because the server does not compile TypeScript.

/** Rooms open at once in the whole web (all games together). */
export const MAX_SALAS = 4;
export const MAX_JUGADORES = 4;
/** The games that have online rooms. */
export const JUEGOS_ONLINE = ['pokeusera', 'pang'];
/** What a socket sends in `lista` to watch the rooms of ALL the games at once (the cover page's sticker). */
export const JUEGO_TODOS = '*';
/** The word that, in a game's link (`?sala=nueva`), means «create a room» instead of a room's code. */
export const SALA_NUEVA = 'nueva';
/**
 * The games whose page can open a room from a link, with their route: `?sala=K7MZ` joins that room, `?sala=nueva` creates one (docs/SALAS.md).
 * A game is added here only when its page keeps that promise. The cover page shows the rooms of every game, but only links to these.
 */
export const SALAS_EN_WEB = { pokeusera: '/pokeusera' };
/** Without 0/O/1/I/L, which are mixed up when copying. */
export const ALFABETO_SALA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODIGO_SALA_LARGO = 4;

/** The code of a room as people type it («k7mz », «K 7 M Z» are fine): 'K7MZ', or null if it does not have the shape. */
export function limpiarCodigoSala(x) {
  if (typeof x !== 'string') return null;
  const c = x.toUpperCase().replace(/\s+/g, '');
  if (c.length !== CODIGO_SALA_LARGO) return null;
  for (const ch of c) if (!ALFABETO_SALA.includes(ch)) return null;
  return c;
}

/** The id of a character a player picks in a room (each game has its own list; the server only checks the shape): a string of 1 to 20 of a-z, 0-9, _ and -, or null. */
export function limpiarPj(x) {
  return typeof x === 'string' && /^[a-z0-9_-]{1,20}$/.test(x) ? x : null;
}

/** The link that takes a player to a room of a game: `/pokeusera?sala=K7MZ`, or `/pokeusera?sala=nueva` to create one. Null if that game's page cannot open rooms from a link. */
export function enlaceSala(juego, codigo) {
  if (!Object.hasOwn(SALAS_EN_WEB, juego)) return null;
  const c = codigo === SALA_NUEVA ? SALA_NUEVA : limpiarCodigoSala(codigo);
  return c ? `${SALAS_EN_WEB[juego]}?sala=${c}` : null;
}
