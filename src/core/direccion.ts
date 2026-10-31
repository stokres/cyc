// The address of the page as the games read it. On the server of the game the games have clean routes (`/pang`, `/capitulo2`...,
// scripts/rutas.mjs) that serve the same page as before (index.html, pokeusera.html), and the server cannot invent a `location.search`:
// so each route stands for the flag that used to be written in the query (`/pang` is `?pangcompleto`). The old addresses keep working.

/** The flag each clean route stands for (the routes with no flag, /capitulo1 and /pokeusera, open the page's default game). */
const ALIAS: Record<string, string> = {
  '/pang': 'pangcompleto',
  '/capitulo2': 'capitulo2',
  '/sol': 'sol',
  '/kart': 'kart',
  '/unamas': 'unamas',
  '/aventura': 'aventura',
};

const ruta = () => location.pathname.replace(/\/+$/, '') || '/';

/** Opened by a clean route (`/pang`) rather than by a query (`index.html?pangcompleto`). */
export const porRutaLimpia = (): boolean => ruta() in ALIAS || ruta() === '/capitulo1' || ruta() === '/pokeusera';

/** The parameters of the address: those of `location.search` plus the flag of the route (`/pang` adds `pangcompleto`). */
export function parametros(): URLSearchParams {
  const p = new URLSearchParams(location.search);
  const alias = ALIAS[ruta()];
  if (alias && !p.has(alias)) p.set(alias, '');
  return p;
}

/** Where to go when a game opened by itself ends: the cover if it was opened by a clean route; otherwise the page without the query, as it always was. */
export function volverAlInicio(): void {
  location.href = porRutaLimpia() ? new URL('./', location.href).href : location.pathname;
}
