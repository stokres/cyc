import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    // Inline every asset so the build can also ship as a single HTML file.
    assetsInlineLimit: 1024 * 1024,
    cssCodeSplit: false,
    modulePreload: false,
  },
});
