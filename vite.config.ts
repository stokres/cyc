import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Relative paths: GitHub Pages serves the game from /<repositorio>/.
  base: './',
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
