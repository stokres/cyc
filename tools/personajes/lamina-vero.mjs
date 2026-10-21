// Review sheets of Vero, the Bar del Brío's waitress, rendered to PNG with Chromium:
//   vero-lamina.png          Vero full body in 3/4, the front portrait, all her faces, the rig and phone size.
//   vero-con-los-cuatro.png  Vero next to Fran, Pablo, Chuchi and Guille at the same scale, and phone size.
// The character code is bundled into the page and draws the SVG in the browser (like lamina-crew.mjs).
// Usage: SALIDA=/ruta/carpeta node tools/personajes/lamina-vero.mjs   (default: revisiones/vero)
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../..', import.meta.url));
const salida = process.env.SALIDA ?? 'revisiones/vero';
mkdirSync(salida, { recursive: true });

const bundle = await build({
  stdin: {
    contents: [
      "export * as vero from './src/arte/personajes/vero.mjs';",
      "export * as fran from './src/arte/personajes/fran.mjs';",
      "export * as pablo from './src/arte/personajes/pablo.mjs';",
      "export * as chuchi from './src/arte/personajes/chuchi.mjs';",
      "export * as guille from './src/arte/personajes/guille.mjs';",
      "export { Rig } from './src/arte/personajes/rig-runtime.mjs';",
    ].join('\n'),
    resolveDir: raiz,
    sourcefile: 'entrada-vero.mjs',
  },
  bundle: true,
  format: 'iife',
  globalName: 'PJ',
  minify: true,
  write: false,
  target: 'es2020',
});
const js = bundle.outputFiles[0].text;

const estilo = `
:root { --ink:#0b1124; --panel:#141b33; --paper:#efe6d2; --gold:#dbb46c; --cream:#f3ead6; --muted:#a9a394;
  --display:'Graduate','Rockwell',Georgia,serif; --body:'Alegreya Sans','Trebuchet MS','Segoe UI',sans-serif; color-scheme:dark; }
html,body { background:var(--ink); color:var(--cream); }
body { margin:0; font:17px/1.45 var(--body); }
.wrap { width:1320px; margin:0 auto; padding:28px 16px 40px; display:grid; gap:26px; }
.eyebrow { font-family:var(--display); color:var(--gold); letter-spacing:.12em; font-size:13px; }
h1 { margin:0; font-family:var(--display); font-weight:400; font-size:46px; letter-spacing:.03em; }
h2 { margin:0 0 10px; font-family:var(--display); font-weight:400; font-size:19px; color:var(--gold); letter-spacing:.05em; }
p { margin:0; max-width:80ch; } .lead { color:var(--muted); }
.hero { display:grid; grid-template-columns:420px 1fr; gap:18px; align-items:stretch; }
.stage { position:relative; border-radius:22px; overflow:hidden; border:1px solid rgba(219,180,108,.35);
  background:radial-gradient(ellipse at 50% 88%, rgba(255,190,120,.28), transparent 55%), linear-gradient(#1a2240,#0e1429 70%,#0b1022); }
.stage svg { display:block; position:relative; }
.floor { position:absolute; left:0; right:0; bottom:0; height:12%; background:linear-gradient(rgba(60,64,84,.55),rgba(30,32,46,.9)); }
.row { display:grid; gap:10px; }
.g7 { grid-template-columns:repeat(7,1fr); } .g6 { grid-template-columns:repeat(6,1fr); } .g5 { grid-template-columns:repeat(5,1fr); } .g2 { grid-template-columns:1fr 1fr; }
figure { margin:0; background:var(--paper); border-radius:14px; padding:8px 8px 6px; display:grid; gap:4px; }
figure svg { width:100%; height:auto; display:block; }
figcaption { text-align:center; color:#5b5446; font-size:14px; font-weight:600; }
.oscura { background:linear-gradient(#1a2240,#0e1429); border:1px solid rgba(219,180,108,.25); } .oscura figcaption { color:var(--muted); }
.portadas { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.phone { display:flex; gap:14px; align-items:flex-end; flex-wrap:wrap; }
.phone > div { background:linear-gradient(#1a2240,#0e1429); border-radius:14px; border:1px solid rgba(219,180,108,.25); display:grid; place-items:end center; padding:12px 10px 6px; gap:6px; }
.phone span { color:var(--muted); font-size:13px; } .pivot { display:none; }
.cabezas { display:flex; gap:14px; align-items:flex-end; background:linear-gradient(#1a2240,#0e1429); border:1px solid rgba(219,180,108,.25); border-radius:14px; padding:12px 16px 8px; width:max-content; }
.cabezas div { display:grid; gap:4px; place-items:center; } .cabezas span { color:var(--muted); font-size:13px; }
`;

const cabecera = `<meta charset="utf-8"><title>Vero · lámina</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700&family=Graduate&display=swap">
<style>${estilo}</style>`;

// Browser side. Plain strings only (no template literals), so nothing here needs escaping.
const comun = String.raw`
const NS = 'http://www.w3.org/2000/svg';
const VB_BODY = '-80 -312 160 322';
const VB_HEAD = '-65 -100 135 180';
const VB_FRONT = '-62 -100 124 168';
const NOMBRE = { vero: 'Vero', fran: 'Fran', pablo: 'Pablo', chuchi: 'Chuchi', guille: 'Guille' };
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
const fig = (inner, vb, label, extra) => '<figure' + (extra ? ' class="' + extra + '"' : '') + '><svg viewBox="' + vb + '">' + inner + '</svg><figcaption>' + label + '</figcaption></figure>';
/** A character in the rig, posed at time t: returns the <g> holding it. */
function poner(id, { modo = 'idle', t = 1.3, habla = false, mood, seed = 0 } = {}) {
  const m = PJ[id];
  const g = document.createElementNS(NS, 'g');
  g.innerHTML = m.body();
  const rig = new PJ.Rig(g.querySelector('#personaje'), m, { seed });
  rig.mode = modo;
  rig.talking = habla;
  if (mood) rig.mood = mood;
  for (let k = 0; k <= Math.round(t * 60); k++) rig.update(k / 60, 1 / 60);
  return g;
}
const markup = (g) => g.outerHTML;
const rowHtml = (cls, items) => '<div class="row ' + cls + '">' + items.join('') + '</div>';
const seccion = (titulo, cuerpo, nota) => '<section><h2>' + titulo + '</h2>' + (nota ? '<p class="lead" style="margin-bottom:10px">' + nota + '</p>' : '') + cuerpo + '</section>';
window.__altos = {};
function alto(id) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('style', 'position:absolute;left:-9999px;width:10px;height:10px');
  document.body.append(s);
  s.innerHTML = PJ[id].body();
  for (const p of s.querySelectorAll('.pivot')) p.remove();
  const b = s.getBBox();
  s.remove();
  window.__altos[id] = Math.round(-b.y);
  return Math.round(-b.y);
}
`;

const scriptVero = String.raw`
const MOODS = [['smug', 'De siempre (retranca)'], ['neutral', 'Normal'], ['happy', 'Contenta'], ['surprised', 'Sorprendida'], ['nervous', 'Nerviosa'], ['sad', 'Triste'], ['angry', 'Enfadada']];
const BOCAS = [['reposo', 'Reposo'], ['m', 'M · B · P'], ['a', 'A'], ['e', 'E · I'], ['o', 'O · U']];
const V = PJ.vero;
const root = document.getElementById('root');
const cuerpo = V.body();
let h = '';
h += '<header><div class="eyebrow">CAMIONES Y CARAVANAS · PERSONAJES · CAPÍTULO 2</div><h1>Vero</h1><p class="lead">Camarera del Bar del Brío, no jugable. ' + V.INFO.traits + ' Mismo método y mismo rig que los cuatro (cuerpo de la segunda versión); conjunto «barra».</p></header>';

const poses = [
  [poner('vero', { t: 1.3 }), 'En reposo'],
  [poner('vero', { modo: 'walk', t: 0.2 }), 'Andando (contacto)'],
  [poner('vero', { modo: 'walk', t: 0.7 }), 'Andando (paso)'],
  [poner('vero', { habla: true, t: 3.1 }), 'Hablando, gesto'],
  [poner('vero', { habla: true, t: 3.1, mood: 'happy' }), 'Contenta, hablando'],
];
h += '<div class="hero"><div class="stage" style="height:640px"><div class="floor"></div><svg viewBox="' + VB_BODY + '" style="height:620px;margin:10px auto 0;display:block">' + cuerpo + '</svg></div>'
  + '<div style="display:grid;gap:18px;align-content:start">'
  + '<div class="portadas">' + fig(V.headFront(), VB_FRONT, 'Retrato de frente (diálogos)') + fig(V.head(), VB_HEAD, 'Tres cuartos (en la escena)') + '</div>'
  + seccion('Con el rig', rowHtml('g5', poses.map(([g, l]) => '<figure class="oscura"><svg viewBox="' + VB_BODY + '">' + markup(g) + '</svg><figcaption>' + l + '</figcaption></figure>')))
  + '</div></div>';

h += seccion('Caras en tres cuartos', rowHtml('g7', MOODS.map(([m, l]) => fig(V.head({ mood: m }), VB_HEAD, l))));
h += seccion('Retratos de frente', rowHtml('g7', MOODS.map(([m, l]) => fig(V.headFront({ mood: m }), VB_FRONT, l))));
h += seccion('Bocas para hablar y parpadeo', rowHtml('g6', [...BOCAS.map(([k, l]) => fig(V.head({ mood: 'neutral', mouthKind: k }), VB_HEAD, l)), fig(V.head({ mood: 'neutral', blink: true }), VB_HEAD, 'Parpadeo')])
  + '<div style="height:10px"></div>' + rowHtml('g6', [...BOCAS.map(([k, l]) => fig(V.headFront({ mood: 'neutral', mouthKind: k }), VB_FRONT, l)), fig(V.headFront({ mood: 'neutral', blink: true }), VB_FRONT, 'Parpadeo')]));
h += seccion('Tamaño de móvil', '<div class="phone">'
  + [150, 120, 95].map((px) => '<div><svg viewBox="' + VB_BODY + '" style="height:' + px + 'px;width:auto">' + cuerpo + '</svg><span>' + px + ' px de alto</span></div>').join('')
  + '</div><div style="height:12px"></div><div class="cabezas">'
  + [80, 64, 50].map((px) => '<div><svg viewBox="' + VB_HEAD + '" style="height:' + px + 'px;width:auto">' + V.head() + '</svg><span>' + px + ' px</span></div>').join('')
  + [80, 64, 50].map((px) => '<div><svg viewBox="' + VB_FRONT + '" style="height:' + px + 'px;width:auto">' + V.headFront() + '</svg><span>' + px + ' px</span></div>').join('')
  + '</div>', 'A la altura a la que aparecerá en un móvil en horizontal; las cabezas, a 80, 64 y 50 px de alto.');
root.innerHTML = h;
window.__listo = true;
`;

const scriptCuatro = String.raw`
const IDS = ['vero', 'fran', 'pablo', 'chuchi', 'guille'];
const root = document.getElementById('root');
let h = '<header><div class="eyebrow">CAMIONES Y CARAVANAS · PERSONAJES · CAPÍTULO 2</div><h1>Vero con los cuatro</h1><p class="lead">Los cinco a la misma escala, dibujados con el mismo método y animados con el mismo rig. Las líneas marcan la altura de la cabeza de cada uno.</p></header>';
const altos = Object.fromEntries(IDS.map((id) => [id, alto(id)]));

// Lineup: all five facing right, with the top of each one marked.
const X = { vero: -300, fran: -150, pablo: 0, chuchi: 150, guille: 300 };
let linea = '<svg viewBox="-380 -330 760 345" style="width:100%;height:auto;display:block">';
for (const id of IDS) linea += '<line x1="-370" x2="370" y1="' + -altos[id] + '" y2="' + -altos[id] + '" stroke="' + (id === 'vero' ? '#dbb46c' : '#6f7aa6') + '" stroke-width="0.6" stroke-dasharray="3 3" opacity="' + (id === 'vero' || id === 'guille' || id === 'pablo' ? 0.8 : 0) + '"/>';
for (const [i, id] of IDS.entries()) linea += '<g transform="translate(' + X[id] + ' 0)">' + markup(poner(id, { seed: i, t: 1.3 + i * 0.9 })) + '</g>';
for (const id of IDS) linea += '<text x="' + X[id] + '" y="13" text-anchor="middle" font-size="9" fill="#a9a394" font-family="sans-serif">' + NOMBRE[id] + ' · ' + altos[id] + '</text>';
linea += '</svg>';
h += '<section><h2>A la misma escala</h2><div class="stage"><div class="floor" style="height:7%"></div>' + linea + '</div></section>';

// In the bar: Vero behind the counter, the four in front of it facing her.
const barra = '<rect x="-380" y="-102" width="760" height="14" fill="#8d97ad"/><rect x="-380" y="-88" width="760" height="88" fill="#3a3f55"/><rect x="-380" y="-102" width="760" height="3" fill="#c7cfe0" opacity="0.8"/>';
let bar = '<svg viewBox="-380 -330 760 345" style="width:100%;height:auto;display:block">';
bar += '<g transform="translate(-250 0)">' + markup(poner('vero', { habla: true, t: 3.1, mood: 'smug' })) + '</g>' + barra;
const PL = { fran: -90, pablo: 40, chuchi: 170, guille: 300 };
for (const [i, id] of ['fran', 'pablo', 'chuchi', 'guille'].entries()) bar += '<g transform="translate(' + PL[id] + ' 0) scale(-1 1)">' + markup(poner(id, { seed: i + 1, t: 1.3 + i * 0.9 })) + '</g>';
bar += '</svg>';
h += '<section><h2>En la barra</h2><p class="lead" style="margin-bottom:10px">Vero detrás de la barra, de cintura para abajo tapada, y los cuatro delante, mirándola.</p><div class="stage"><div class="floor" style="height:7%"></div>' + bar + '</div></section>';

// Phone size: the five together at three heights, and the five heads at 50 px.
const juntos = (px) => '<svg viewBox="-380 -330 760 345" style="height:' + px + 'px;width:auto">' + IDS.map((id) => '<g transform="translate(' + X[id] + ' 0)">' + markup(poner(id, { seed: 2, t: 1.3 })) + '</g>').join('') + '</svg>';
h += '<section><h2>Tamaño de móvil</h2><div class="phone">' + [150, 120, 95].map((px) => '<div>' + juntos(px) + '<span>' + px + ' px de alto</span></div>').join('') + '</div>'
  + '<div style="height:12px"></div><div class="cabezas">' + IDS.map((id) => '<div><svg viewBox="-65 -100 135 180" style="height:64px;width:auto">' + PJ[id].head() + '</svg><span>' + NOMBRE[id] + '</span></div>').join('')
  + IDS.map((id) => '<div><svg viewBox="-62 -100 124 168" style="height:64px;width:auto">' + PJ[id].headFront() + '</svg><span>' + NOMBRE[id] + '</span></div>').join('') + '</div></section>';
root.innerHTML = h;
window.__listo = true;
`;

function pagina(titulo, guion, ancho) {
  return `<!doctype html><html lang="es">${cabecera.replace('Vero · lámina', titulo)}<body><div id="root" class="wrap" style="width:${ancho}px"></div><script>${js}</script><script>${comun}</script><script>${guion}</script></body></html>`;
}

const hojas = [
  ['vero-lamina', pagina('Vero · lámina', scriptVero, 1320), 1352],
  ['vero-con-los-cuatro', pagina('Vero con los cuatro', scriptCuatro, 1180), 1212],
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [nombre, html, ancho] of hojas) {
  const archivo = `${raiz}/revisiones/${nombre}.html`;
  mkdirSync(`${raiz}/revisiones`, { recursive: true });
  writeFileSync(archivo, html);
  const p = await b.newPage({ viewport: { width: ancho, height: 900 }, deviceScaleFactor: 1.5 });
  p.on('pageerror', (e) => console.error('[página]', e.message));
  p.on('console', (m) => m.type() === 'error' && console.error('[consola]', m.text()));
  await p.goto('file://' + archivo, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction('window.__listo === true', null, { timeout: 30000 });
  await p.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]));
  await p.screenshot({ path: `${salida}/${nombre}.png`, fullPage: true });
  const altos = await p.evaluate(() => window.__altos);
  console.log(`${salida}/${nombre}.png`, Object.keys(altos).length ? JSON.stringify(altos) : '');
  await p.close();
}
await b.close();
