// PokéUsera · service worker (docs/POKEUSERA.md, «Publicación»). It is a plain file: `npm run build` (the
// plugin in vite.config.ts) rewrites the two lines below in dist/ with the version and the list of files of the build.
// Only PokéUsera goes through here: the page, its scripts, drawings and music. The online room (/sala) and
// everything else (the chapter 1 included) is left to the network.
const VERSION = 'dev';
const ARCHIVOS = [];

const CACHE = `pokeusera-${VERSION}`;
const base = new URL('./', self.location.href);
const url = (f) => new URL(f, base).href;
const PAGINA = url('pokeusera.html');

self.addEventListener('install', (e) => {
  // The new version downloads in the background; it waits (no skipWaiting) until the player taps «actualizar».
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(ARCHIVOS.map((f) => c.add(new Request(url(f), { cache: 'reload' }))))),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k.startsWith('pokeusera-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'actualizar') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== base.origin || !u.pathname.startsWith(base.pathname)) return;
  if (u.pathname.endsWith('/sala')) return;
  if (req.mode === 'navigate') {
    const resto = u.pathname.slice(base.pathname.length);
    // The game's page (any ?query: ?combate, ?rapido...). Cache first: it opens at once, and the update waits for its turn.
    if (resto === 'pokeusera.html') {
      e.respondWith(caches.match(PAGINA).then((r) => r || fetch(req)));
    } else if (resto === '') {
      // «/» is PokéUsera on the server of the game (the chapter elsewhere): network first, the cached game only if it is not there.
      e.respondWith(fetch(req).catch(() => caches.match(PAGINA).then((r) => r || Response.error())));
    }
    return;
  }
  // Scripts, drawings and music of the build: cache first. Anything else goes to the network.
  e.respondWith(caches.match(req, { ignoreSearch: false }).then((r) => r || fetch(req)));
});
