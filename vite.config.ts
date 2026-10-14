import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  plugins: [pokeuseraSw()],
  // Online room: `npm start` (PORT=8080) in another terminal serves /sala; POKEUSERA_SALA overrides the target.
  server: { proxy: { '/sala': { target: process.env.POKEUSERA_SALA ?? 'ws://localhost:8080', ws: true } } },
  build: {
    target: 'es2020',
    rollupOptions: {
      // The chapter (index.html) and PokéUsera (pokeusera.html), a game of its own.
      input: { main: resolve(__dirname, 'index.html'), pokeusera: resolve(__dirname, 'pokeusera.html') },
    },
  },
});
