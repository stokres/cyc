// Builds the scene sheet: Fran's flat and the street, playable, with layer toggles.
// The scenes are authored in Node (SVG strings) and baked in the browser.
// Output: artifact/escenas.html (+ art/escenas/*.svg). Usage: node tools/escenas/lamina-escenas.mjs
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as piso from './piso.mjs';

const scenes = { piso: piso.escena() };
try {
  const calle = await import('./calle.mjs');
  scenes.calle = calle.escena();
} catch (e) {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
}

// Each layer as a standalone SVG, so it can be opened and redrawn by hand.
mkdirSync('art/escenas', { recursive: true });
for (const S of Object.values(scenes)) {
  for (const L of S.layers) {
    const parts = L.pieces ?? [{ x0: L.x0, x1: L.x1, y0: L.y0, y1: L.y1, body: L.body }];
    const x0 = Math.min(...parts.map((p) => p.x0));
    const x1 = Math.max(...parts.map((p) => p.x1));
    const y0 = Math.min(...parts.map((p) => p.y0));
    const y1 = Math.max(...parts.map((p) => p.y1));
    const body = parts.map((p) => p.body).join('') + (L.emissive ?? '');
    writeFileSync(`art/escenas/${S.id}-${L.id}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}"><title>${S.name} · capa ${L.id}</title>${body}</svg>\n`);
  }
}

for (const S of Object.values(scenes)) {
  for (const Lw of S.laterals ?? []) {
    const w = Lw.len * S.M;
    const h = Lw.h * S.M;
    writeFileSync(`art/escenas/${S.id}-${Lw.id}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-h} ${w} ${h}"><title>${S.name} · pared lateral ${Lw.id}</title>${Lw.body}${Lw.emissive ?? ''}</svg>\n`);
  }
}

const bundle = await build({
  entryPoints: ['tools/escenas/motor.mjs'],
  bundle: true,
  format: 'iife',
  globalName: 'MOTOR',
  minify: true,
  write: false,
  target: 'es2020',
});
const js = bundle.outputFiles[0].text;
const data = JSON.stringify(scenes).replace(/</g, '\\u003c');

const LAYER_NAMES = {
  exterior: 'Cielo y tejados', terraza: 'Terraza', pared: 'Pared del fondo', suelo: 'Suelo', muebles: 'Primer plano',
  cielo: 'Cielo', lejos: 'Ciudad al fondo', parque: 'Parque', dragon: 'Dragón', transversal: 'Calle transversal', fachadas: 'Fachadas', calzada: 'Acera y calzada', frente: 'Primer plano',
};

const html = `<title>Escenas de Usera</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700;800&family=Graduate&display=swap">
<style>
/* Scene sheet in the game's own night palette: one deliberate dark look. */
:root {
  --ink: #0b1124;
  --panel: #141b33;
  --panel-2: #1b2342;
  --gold: #dbb46c;
  --cream: #f3ead6;
  --muted: #a9a394;
  --display: 'Graduate', 'Rockwell', Georgia, serif;
  --body: 'Alegreya Sans', 'Trebuchet MS', 'Segoe UI', sans-serif;
  color-scheme: dark;
}
html, body { background: var(--ink); color: var(--cream); }
body { margin: 0; font: 17px/1.45 var(--body); }
.wrap { max-width: 1280px; margin: 0 auto; padding-inline: 16px; padding-block: 18px 48px; display: grid; gap: 22px; }
header { display: grid; gap: 4px; }
.eyebrow { font-family: var(--display); color: var(--gold); letter-spacing: .12em; font-size: 13px; }
h1 { margin: 0; font-family: var(--display); font-weight: 400; font-size: clamp(26px, 5vw, 40px); letter-spacing: .03em; text-wrap: balance; }
h2 { margin: 0; font-family: var(--display); font-weight: 400; font-size: 20px; color: var(--gold); letter-spacing: .05em; }
p { margin: 0; max-width: 70ch; }
.lead { color: var(--muted); }
.escenario { position: relative; width: 100%; aspect-ratio: 19.5 / 9; max-height: calc(100vh - 24px); border-radius: 18px; overflow: hidden; border: 1px solid rgba(219,180,108,.35); background: #0b0f1e; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
.escenario:fullscreen { border-radius: 0; border: 0; max-height: none; aspect-ratio: auto; width: 100vw; height: 100vh; }
.capa { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
svg.capa { overflow: visible; pointer-events: none; }
.fx { position: absolute; inset: 0; pointer-events: none; }
.pivot { display: none; }
.bocadillo { position: absolute; transform: translate(-50%, -100%); background: rgba(243,234,214,.95); color: #1a1a24; font: 800 clamp(14px, 2.2vw, 20px) var(--body); padding: 4px 12px; border-radius: 14px; white-space: nowrap; transition: opacity .2s; }
.ui { position: absolute; display: flex; gap: 8px; z-index: 2; }
.ui.arriba { top: max(10px, env(safe-area-inset-top)); right: max(10px, env(safe-area-inset-right)); }
.ui.nombre { top: max(10px, env(safe-area-inset-top)); left: max(10px, env(safe-area-inset-left)); pointer-events: none; }
.chip { font: 600 15px var(--body); color: var(--cream); background: rgba(14,20,41,.72); border: 1px solid rgba(219,180,108,.45); border-radius: 999px; padding: 8px 14px; min-height: 44px; box-sizing: border-box; display: inline-flex; align-items: center; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
button.chip { cursor: pointer; }
button.chip:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.nombre .chip { font-family: var(--display); font-weight: 400; letter-spacing: .06em; font-size: 14px; }
.pista { position: absolute; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); pointer-events: none; z-index: 2; transition: opacity .3s; }
.velo { position: absolute; inset: 0; background: #05070f; opacity: 0; pointer-events: none; transition: opacity .45s; z-index: 3; display: grid; place-items: center; }
.velo.on { opacity: 1; }
.velo span { font-family: var(--display); color: var(--gold); letter-spacing: .1em; font-size: 14px; }
.controls { display: flex; flex-wrap: wrap; gap: 14px 24px; align-items: end; background: var(--panel); border-radius: 18px; padding: 14px 16px; border: 1px solid rgba(219,180,108,.2); }
.group { display: grid; gap: 8px; }
.label { font-family: var(--display); font-size: 12px; letter-spacing: .1em; color: var(--muted); }
.seg { display: flex; flex-wrap: wrap; gap: 8px; }
.seg button { font: 600 15px var(--body); color: var(--cream); background: var(--panel-2); border: 1px solid rgba(243,234,214,.18); border-radius: 999px; padding: 8px 14px; cursor: pointer; min-height: 44px; }
.seg button[aria-pressed="true"] { background: var(--gold); color: var(--ink); border-color: var(--gold); }
.seg button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.notes { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.note { background: var(--panel); border-radius: 14px; padding: 14px 16px; border: 1px solid rgba(219,180,108,.15); display: grid; gap: 6px; }
.note b { font-family: var(--display); font-weight: 400; color: var(--gold); letter-spacing: .04em; font-size: 14px; }
.note span { color: var(--muted); font-size: 15px; }
@media (max-width: 700px) { .chip { font-size: 14px; padding: 6px 12px; } }
</style>
<div class="wrap">
  <header>
    <div class="eyebrow">CAMIONES Y CARAVANAS · ESCENAS</div>
    <h1>Casa de Fran y calle de Usera</h1>
    <p class="lead">Toca el suelo para andar. Fran empieza dormido en el sofá; la puerta de la derecha sale a la calle.</p>
  </header>

  <div class="escenario" id="escenario">
    <div class="ui nombre"><span class="chip" id="nombre">Casa de Fran</span></div>
    <div class="ui arriba">
      <button class="chip" id="otra">Otra vez</button>
      <button class="chip" id="full">Pantalla completa</button>
    </div>
    <div class="pista"><span class="chip" id="pista"></span></div>
    <div class="velo on" id="velo"><span id="carga">PREPARANDO LA ESCENA…</span></div>
  </div>

  <div class="controls">
    <div class="group">
      <div class="label">ESCENA</div>
      <div class="seg" id="esc"></div>
    </div>
    <div class="group">
      <div class="label">CAPAS (APÁGALAS PARA VER EL PARALLAX)</div>
      <div class="seg" id="capas"></div>
    </div>
  </div>

  <section class="notes" id="notas"></section>
</div>
<script>${js}</script>
<script>
const SCENES = ${data};
const NAMES = ${JSON.stringify(LAYER_NAMES)};
const NOTES = {
  piso: [
    ['Distribución', 'Cocina, frigorífico, chimenea, terraza y baño como en el plano, más el recibidor con la puerta de la calle a la derecha.'],
    ['Capas', 'Cielo y tejados de Usera tras los cristales, la terraza, la pared, el suelo en perspectiva y, delante, la mesa frente a la cocina y el sofá frente a la chimenea.'],
    ['Luz', 'Anochece: entra luz malva por la terraza y calientan la chimenea, el aplique, la lámpara de arco y la del recibidor.'],
    ['Aceituna', 'Duerme en su cama junto a la terraza. Cuando Fran se despierta, ladra y le sigue a todas partes.'],
  ],
  calle: [
    ['Recorrido', 'Del portal de Fran, entre edificios y comercios, al parque del dragón; luego un cruce y la calle peatonal del Bar del Río con su terraza.'],
    ['Profundidad', 'La acera, la calle transversal y el suelo del parque se mueven por filas, como un suelo real. El dragón y los árboles van en capas propias.'],
  ],
};
const stage = document.getElementById('escenario');
const m = new MOTOR.Motor(stage, SCENES);
const velo = document.getElementById('velo');
const carga = document.getElementById('carga');
const pista = document.getElementById('pista');
pista.parentElement.style.opacity = '0';
m.on('hint', (s) => { pista.textContent = s; pista.parentElement.style.opacity = s ? '1' : '0'; });
let current = null;
async function go(id, place) {
  velo.classList.add('on');
  await new Promise((r) => setTimeout(r, 450));
  carga.textContent = 'PREPARANDO LA ESCENA…';
  await m.load(id, { onProgress: (p) => (carga.textContent = 'PREPARANDO LA ESCENA… ' + Math.round(p * 100) + ' %') });
  if (place) place();
  current = id;
  document.getElementById('nombre').textContent = SCENES[id].name;
  for (const b of document.querySelectorAll('#esc button')) b.setAttribute('aria-pressed', String(b.dataset.v === id));
  buildLayers();
  notes();
  velo.classList.remove('on');
}
function buildLayers() {
  const el = document.getElementById('capas');
  el.innerHTML = '';
  for (const L of SCENES[current].layers) {
    const b = document.createElement('button');
    b.textContent = NAMES[L.id] ?? L.id;
    b.setAttribute('aria-pressed', String(!m.hidden.has(L.id)));
    b.onclick = () => {
      if (m.hidden.has(L.id)) m.hidden.delete(L.id); else m.hidden.add(L.id);
      b.setAttribute('aria-pressed', String(!m.hidden.has(L.id)));
    };
    el.appendChild(b);
  }
}
function notes() {
  document.getElementById('notas').innerHTML = (NOTES[current] ?? []).map(([t, d]) => '<div class="note"><b>' + t + '</b><span>' + d + '</span></div>').join('');
}
const esc = document.getElementById('esc');
for (const id of Object.keys(SCENES)) {
  const b = document.createElement('button');
  b.dataset.v = id;
  b.textContent = SCENES[id].name;
  b.onclick = () => go(id);
  esc.appendChild(b);
}
m.on('spot', (key) => {
  if (key === 'salida') go('calle');
  if (key === 'bar') m.say('Bar del Río', m.fran, 2.2);
  if (key === 'portal') go('piso', () => { m.state = 'libre'; Object.assign(m.fran, { X: 3150, y: 880, face: -1 }); m.perroState = 'sigue'; m.perro.X = 3000; m.perro.y = 900; m.cam = 3400; m.emit('hint', ''); });
});
document.getElementById('otra').onclick = () => go(current);
document.getElementById('full').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else stage.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
};
m.start();
go('piso');
window.__m = m;
</script>
`;
writeFileSync('artifact/escenas.html', html);
console.log(`artifact/escenas.html · ${(html.length / 1024).toFixed(0)} KB · ${Object.keys(scenes).join(', ')}`);
