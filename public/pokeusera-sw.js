// PokéUsera · service worker (docs/POKEUSERA.md, «Publicación»). It is a plain file: `npm run build` (the
// plugin in vite.config.ts) rewrites the two lines below in dist/ with the version and the list of files of the build.
// Only PokéUsera goes through here: the page, its scripts, drawings and music. The online room (/sala) and
// everything else (the cover, the chapter 1, the Pang...: they share the domain) is left to the network.
const VERSION = 'dev';
const ARCHIVOS = [];

const CACHE = `pokeusera-${VERSION}`;
const base = new URL('./', self.location.href);
const url = (f) => new URL(f, base).href;
const PAGINA = url('pokeusera.html');

self.addEventListener('install', (e) => {
  // The new version downloads in the background and takes over as soon as it is complete (no waiting for a tap: a stale
  // copy of the game kept running for days, and one from before the web-wide account asked for the account's code again).
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(ARCHIVOS.map((f) => c.add(new Request(url(f), { cache: 'reload' })))))
      .then(() => self.skipWaiting()),
  );
});

/** The cache of the version that was active before this one (written in `pokeusera-meta`). */
const META = 'pokeusera-meta';
const esPagina = (u) => {
  const resto = new URL(u).pathname.slice(base.pathname.length);
  return resto === 'pokeusera.html' || resto === 'pokeusera' || resto === 'aventura';
};

/** This worker is the one in charge (set on activation). */
let activo = false;

self.addEventListener('activate', (e) => {
  activo = true;
  e.waitUntil(
    (async () => {
      const meta = await caches.open(META);
      const r = await meta.match(url('__activa'));
      const previa = r ? await r.text() : null;
      await meta.put(url('__activa'), new Response(CACHE));
      const viejas = (await caches.keys()).filter((k) => k.startsWith('pokeusera-') && k !== CACHE && k !== META);
      // A service worker from before this one (no META) and an old copy of the game: its open pages are reloaded with the new game.
      const heredada = !previa && viejas.length > 0;
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // A page open with the previous version may still ask for its files: that cache stays until the next version.
      const guardar = !heredada && ventanas.length > 0 ? previa : null;
      await Promise.all(viejas.filter((k) => k !== guardar).map((k) => caches.delete(k)));
      await self.clients.claim();
      if (heredada) {
        for (const v of ventanas) if (esPagina(v.url)) void v.navigate(v.url).catch(() => undefined);
      }
    })(),
  );
});

self.addEventListener('message', (e) => {
  if (e.data !== 'actualizar') return;
  self.skipWaiting();
  // «Actualizar» from a page of an older game whose new version is already in charge: reload that page.
  const c = e.source;
  if (activo && c && 'navigate' in c) void c.navigate(c.url).catch(() => undefined);
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== base.origin || !u.pathname.startsWith(base.pathname)) return;
  if (u.pathname.endsWith('/sala')) return;
  if (req.mode === 'navigate') {
    const resto = u.pathname.slice(base.pathname.length);
    // The game's page (any ?query: ?combate, ?rapido...), by its file or by its clean routes (/pokeusera, /aventura: the page reads the route itself).
    // Cache first: it opens at once. A new version takes over as soon as it is downloaded (the page reloads if it was just opened).
    if (resto === 'pokeusera.html' || resto === 'pokeusera' || resto === 'aventura') {
      // From this version's own cache: the previous one may still be kept for an open page (see «activate»).
      e.respondWith(caches.open(CACHE).then((c) => c.match(PAGINA)).then((r) => r || fetch(req)));
    } else if (resto === '') {
      // «/» is the cover on the server of the game (the chapter elsewhere): network first, the cached game only if it is not there (offline).
      e.respondWith(fetch(req).catch(() => caches.open(CACHE).then((c) => c.match(PAGINA)).then((r) => r || Response.error())));
    }
    return;
  }
  // Scripts, drawings and music of the build: cache first. Anything else goes to the network.
  e.respondWith(caches.match(req, { ignoreSearch: false }).then((r) => r || fetch(req)));
});
