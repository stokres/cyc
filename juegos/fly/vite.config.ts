import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base for a loose build or `npm run dev`. On camionesycaravanas.es the build is made with `--base /fly/` (scripts/construir-juegos.mjs in the root of the repo), since the page is served from /fly and relative paths would resolve against /.
  base: './',
  // three.js alone is ~550 kB minified; that's expected for this project.
  build: { chunkSizeWarningLimit: 1000 },
});
