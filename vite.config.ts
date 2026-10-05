import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths: GitHub Pages serves the game from /<repositorio>/.
  base: './',
  build: {
    target: 'es2020',
  },
});
