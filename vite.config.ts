import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ESPECIES, MOVS, SUCESOS } from './src/pokeusera/datos';
import { ENTRENADORES, ESCENARIOS, OBJETOS } from './src/pokeusera/tipos';
import { crearApiEstadisticas } from './scripts/api-estadisticas.mjs';
import { RUTAS } from './scripts/rutas.mjs';
import { prepararCatalogo } from './src/pokeusera/estadisticas/agregado.mjs';

/** The game's lists the server needs to validate a battle summary (ids of useritos, moves, objects, trainers, bars and sucesos). */
const catalogo = () => ({
  especies: ESPECIES.map((s) => s.id),
  movs: Object.keys(MOVS),
  objetos: [...OBJETOS],
  entrenadores: [...ENTRENADORES],
  escenarios: [...ESCENARIOS],
  sucesos: Object.keys(SUCESOS),
});

/** The release number: package.json `version` (docs/POKEUSERA.md, «Publicación»: only its third digit goes up at each release). */
const lanzamiento: string = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')).version;

/** The version written into each battle summary: the commit being built (Railway gives it; otherwise git), or the date. */
function versionJuego(): string {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Accumulated statistics (docs/POKEUSERA.md, «Estadísticas acumuladas»): the build writes dist/pokeusera-catalogo.json for the server to validate with,
 * and `npm run dev` answers /api/batallas and /api/estadisticas itself (data in ./datos-pokeusera or POKEUSERA_DATOS), so the section works while developing.
 */
function pokeuseraEstadisticas(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'pokeusera-estadisticas',
    configResolved(c) {
      config = c;
    },
    async configureServer(server) {
      const api = await crearApiEstadisticas({ catalogo: prepararCatalogo(catalogo()) });
      server.middlewares.use((req, res, next) => {
        if (!api.manejar(req, res)) next();
      });
    },
    closeBundle() {
      if (config.command !== 'build') return;
      const dist = resolve(config.root, config.build.outDir);
      if (existsSync(dist)) writeFileSync(resolve(dist, 'pokeusera-catalogo.json'), JSON.stringify(catalogo()));
    },
  };
}

/**
 * `npm run dev` answers the clean routes of the domain (scripts/rutas.mjs) with their page, as the server of the game does (`/pokeusera`, `/aventura`, `/pang`...),
 * so they can be tried while developing. «/» stays the chapter here (the scripts and the habit open it): the cover is at /portada.html.
 */
function rutasLimpias(): Plugin {
  return {
    name: 'rutas-limpias',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [ruta, ...resto] = (req.url ?? '/').split('?');
        const limpia = ruta.replace(/\/+$/, '');
        if (limpia && Object.hasOwn(RUTAS, limpia)) req.url = `/${(RUTAS as Record<string, string>)[limpia]}${resto.length ? '?' + resto.join('?') : ''}`;
        next();
      });
    },
  };
}

/**
 * PokéUsera as an installable app: after the build, writes the version and the list of files of the game
 * (its page, scripts, styles, drawings and music, found from its entry chunk; nothing of the chapter 1) into
 * dist/pokeusera-sw.js, so the service worker can store them all. Versioned by the content of those files.
 */
function pokeuseraSw(): Plugin {
  let config: ResolvedConfig;
  const archivos = new Set<string>();
  return {
    name: 'pokeusera-sw',
    apply: 'build',
    configResolved(c) {
      config = c;
    },
    generateBundle(_o, bundle) {
      archivos.clear();
      const raiz = Object.values(bundle).find(
        (c) => c.type === 'chunk' && c.isEntry && (c.facadeModuleId?.endsWith('pokeusera.html') || c.moduleIds.some((m) => m.endsWith('src/pokeusera/main.ts'))),
      );
      if (!raiz || raiz.type !== 'chunk') throw new Error('pokeusera-sw: no encuentro el módulo de entrada de PokéUsera');
      const vistos = new Set<string>();
      const visitar = (nombre: string) => {
        const c = bundle[nombre];
        if (!c || vistos.has(nombre)) return;
        vistos.add(nombre);
        archivos.add(nombre);
        if (c.type !== 'chunk') return;
        const meta = (c as unknown as { viteMetadata?: { importedCss: Set<string>; importedAssets: Set<string> } }).viteMetadata;
        for (const f of [...(meta?.importedCss ?? []), ...(meta?.importedAssets ?? [])]) archivos.add(f);
        for (const f of [...c.imports, ...c.dynamicImports]) visitar(f);
      };
      visitar(raiz.fileName);
    },
    closeBundle() {
      const dist = resolve(config.root, config.build.outDir);
      const sw = resolve(dist, 'pokeusera-sw.js');
      if (!existsSync(sw)) throw new Error('pokeusera-sw: falta public/pokeusera-sw.js en el build');
      const lista = ['pokeusera.html', 'pokeusera.webmanifest', 'pokeusera-icono-180.png', 'pokeusera-icono-192.png', 'pokeusera-icono-512.png', ...archivos];
      const unicos = [...new Set(lista)].filter((f) => existsSync(resolve(dist, f))).sort();
      const hash = createHash('sha256');
      for (const f of unicos) hash.update(f).update(readFileSync(resolve(dist, f)));
      const version = hash.digest('hex').slice(0, 12);
      let codigo = readFileSync(sw, 'utf8');
      const antes = codigo;
      codigo = codigo.replace(/^const VERSION = .*$/m, `const VERSION = '${version}';`).replace(/^const ARCHIVOS = .*$/m, `const ARCHIVOS = ${JSON.stringify(unicos)};`);
      if (codigo === antes) throw new Error('pokeusera-sw: no encuentro VERSION ni ARCHIVOS en pokeusera-sw.js');
      writeFileSync(sw, codigo);
      console.log(`pokeusera-sw: versión ${version}, ${unicos.length} archivos para guardar`);
    },
  };
}

export default defineConfig({
  // Relative paths: GitHub Pages serves the game from /<repositorio>/.
  base: './',
  plugins: [pokeuseraSw(), pokeuseraEstadisticas(), rutasLimpias()],
  // __POKEUSERA_LANZAMIENTO__: the release number shown on the title screen (package.json `version`, docs/POKEUSERA.md «Publicación»).
  define: { __POKEUSERA_VERSION__: JSON.stringify(versionJuego()), __POKEUSERA_LANZAMIENTO__: JSON.stringify(lanzamiento) },
  // Online room: `npm start` (PORT=8080) in another terminal serves /sala; POKEUSERA_SALA overrides the target.
  server: { proxy: { '/sala': { target: process.env.POKEUSERA_SALA ?? 'ws://localhost:8080', ws: true } } },
  build: {
    target: 'es2020',
    rollupOptions: {
      // The chapter (index.html), PokéUsera (pokeusera.html), a game of its own, and the cover of the domain (portada.html, no game code in it).
      input: { main: resolve(__dirname, 'index.html'), pokeusera: resolve(__dirname, 'pokeusera.html'), portada: resolve(__dirname, 'portada.html') },
    },
  },
});
