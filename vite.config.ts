import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Relative paths: GitHub Pages serves the game from /<repositorio>/.
  base: './',
  build: {
    target: 'es2020',
    rollupOptions: {
      // The chapter (index.html) and the Pang (pang.html), a game of its own.
      input: { main: resolve(__dirname, 'index.html'), pang: resolve(__dirname, 'pang.html') },
    },
  },
});
