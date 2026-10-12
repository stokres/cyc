import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Relative paths: GitHub Pages serves the game from /<repositorio>/.
  base: './',
  // Online room: `npm start` (PORT=8080) in another terminal serves /sala; PANG_SALA overrides the target.
  server: { proxy: { '/sala': { target: process.env.PANG_SALA ?? 'ws://localhost:8080', ws: true } } },
  build: {
    target: 'es2020',
    rollupOptions: {
      // The chapter (index.html) and the Pang (pang.html), a game of its own.
      input: { main: resolve(__dirname, 'index.html'), pang: resolve(__dirname, 'pang.html') },
    },
  },
});
