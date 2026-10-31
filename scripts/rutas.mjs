// Clean URLs of the domain → the page of dist/ that serves them. The one list, shared by the server of the game (scripts/servir-pokeusera.mjs)
// and `npm run dev` (vite.config.ts). The mode a route opens in (/pang → ?pangcompleto...) is added by the page itself: src/core/direccion.ts keeps the other half.
export const RUTAS = {
  '/': 'portada.html',
  '/capitulo1': 'index.html',
  '/pokeusera': 'pokeusera.html',
  '/aventura': 'pokeusera.html',
  '/pang': 'index.html',
  // Games of juegos/ (docs in juegos/README.md): each one is built into its own folder of dist/ (scripts/construir-juegos.mjs).
  '/fly': 'fly/index.html',
  '/trazo': 'trazo/index.html',
  // Hidden: they work but the cover does not announce them.
  '/capitulo2': 'index.html',
  '/sol': 'index.html',
  '/kart': 'index.html',
  '/unamas': 'index.html',
};
