// Packs dist/ into one self-contained HTML body for sharing as a claude.ai Artifact
// (the host adds <!doctype>, <head> and <body>; scripts and styles must be inline).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const css = [];
const js = [];
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+\.css)"[^>]*>/g, (_, f) => (css.push(readFileSync(join(dist, f), 'utf8')), ''));
html = html.replace(/<script type="module"[^>]*src="\.\/([^"]+\.js)"[^>]*><\/script>/g, (_, f) => (js.push(readFileSync(join(dist, f), 'utf8')), ''));
const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
const keep = [...head.matchAll(/<(title|link)[^>]*>(?:[^<]*<\/title>)?/g)].map((m) => m[0]).filter((t) => !/preconnect|manifest|icon/.test(t)).join('\n');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].trim();
const out = `${keep}\n<style>\n${css.join('\n')}\n</style>\n${body}\n<script type="module">\n${js.join('\n').replace(/<\/script/gi, '<\\/script')}\n</script>\n`;
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/camiones-y-caravanas.html', out);
console.log(`artifact/camiones-y-caravanas.html · ${(out.length / 1024).toFixed(0)} KB`);
