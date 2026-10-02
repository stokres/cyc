// Builds the crew sheet: Fran, Pablo and Chuchi animated together with the
// shared rig, plus each one's turnaround and expressions. The character code
// is bundled into the page and draws the SVG in the browser, so the page stays
// light. Output: artifact/crew-lamina.html. Usage: node tools/personajes/lamina-crew.mjs
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as crew from './crew.mjs';
import { svg } from './svg.mjs';

mkdirSync('artifact', { recursive: true });
mkdirSync('art/personajes', { recursive: true });
for (const id of ['fran', 'pablo', 'chuchi']) {
  writeFileSync(`art/personajes/${id}.svg`, svg('-80 -302 160 312', crew[id].body(), `${crew[id].INFO.name} · Camiones y Caravanas`));
}

const bundle = await build({
  entryPoints: ['tools/personajes/crew.mjs'],
  bundle: true,
  format: 'iife',
  globalName: 'CREW',
  minify: true,
  write: false,
  target: 'es2020',
});
const js = bundle.outputFiles[0].text;

const html = `<title>La crew</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700&family=Graduate&display=swap">
<style>
/* Character sheet in the game's own night palette: one deliberate dark look. */
:root {
  --ink: #0b1124;
  --panel: #141b33;
  --panel-2: #1b2342;
  --paper: #efe6d2;
  --gold: #dbb46c;
  --cream: #f3ead6;
  --muted: #a9a394;
  --display: 'Graduate', 'Rockwell', Georgia, serif;
  --body: 'Alegreya Sans', 'Trebuchet MS', 'Segoe UI', sans-serif;
  color-scheme: dark;
}
html, body { background: var(--ink); color: var(--cream); }
body { margin: 0; font: 17px/1.45 var(--body); }
.wrap { max-width: 1100px; margin: 0 auto; padding-inline: 16px; padding-block: 24px 48px; display: grid; gap: 30px; }
header { display: grid; gap: 6px; }
.eyebrow { font-family: var(--display); color: var(--gold); letter-spacing: .12em; font-size: 13px; }
h1 { margin: 0; font-family: var(--display); font-weight: 400; font-size: clamp(30px, 6vw, 48px); letter-spacing: .03em; text-wrap: balance; }
h2 { margin: 0; font-family: var(--display); font-weight: 400; font-size: 22px; color: var(--gold); letter-spacing: .05em; }
p { margin: 0; max-width: 65ch; }
.lead { color: var(--muted); }
.stage { position: relative; border-radius: 22px; overflow: hidden; border: 1px solid rgba(219,180,108,.35);
  background: radial-gradient(ellipse at 30% 90%, rgba(255,190,120,.25), transparent 50%), radial-gradient(ellipse at 75% 90%, rgba(255,120,90,.16), transparent 45%), linear-gradient(#1a2240, #0e1429 70%, #0b1022); }
.stage svg { display: block; width: 100%; height: auto; max-height: 62vh; position: relative; }
.floor { position: absolute; left: 0; right: 0; bottom: 0; height: 14%; background: linear-gradient(rgba(60,64,84,.55), rgba(30,32,46,.9)); }
.controls { display: flex; flex-wrap: wrap; gap: 18px 28px; align-items: end; background: var(--panel); border-radius: 18px; padding: 16px 18px; border: 1px solid rgba(219,180,108,.2); }
.group { display: grid; gap: 8px; }
.label { font-family: var(--display); font-size: 12px; letter-spacing: .1em; color: var(--muted); }
.seg { display: flex; flex-wrap: wrap; gap: 8px; }
.seg button { font: 600 15px var(--body); color: var(--cream); background: var(--panel-2); border: 1px solid rgba(243,234,214,.18); border-radius: 999px; padding: 8px 16px; cursor: pointer; min-height: 40px; }
.seg button[aria-pressed="true"] { background: var(--gold); color: var(--ink); border-color: var(--gold); }
.seg button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.who { display: grid; gap: 12px; }
.who .head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; }
.traits { color: var(--muted); font-size: 15px; }
.rows { display: grid; grid-template-columns: 3fr 4fr; gap: 10px; }
.grid { display: grid; gap: 10px; }
.g3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.g4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
figure { margin: 0; background: var(--paper); border-radius: 14px; padding: 8px 8px 6px; display: grid; gap: 4px; }
figure svg { width: 100%; height: auto; display: block; }
figcaption { text-align: center; color: #5b5446; font-size: 13px; font-weight: 600; }
.phone { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.phone div { background: linear-gradient(#1a2240, #0e1429); border-radius: 14px; border: 1px solid rgba(219,180,108,.25); display: grid; place-items: end center; padding: 12px 8px 6px; gap: 6px; }
.phone span { color: var(--muted); font-size: 13px; }
.pivot { display: none; }
@media (max-width: 860px) { .rows { grid-template-columns: 1fr; } }
@media (max-width: 560px) { .phone { grid-template-columns: 1fr; } }
.phone svg { max-width: 100%; height: auto; }
</style>
<div class="wrap">
  <header>
    <div class="eyebrow">CAMIONES Y CARAVANAS · PERSONAJES</div>
    <h1>La crew</h1>
    <p class="lead">Fran, Pablo y Chuchi con el mismo método y el mismo rig. Fran ya está aprobado; esta lámina es para revisar a Pablo y a Chuchi a su lado.</p>
  </header>

  <div class="stage">
    <div class="floor"></div>
    <svg id="crew" viewBox="-300 -330 600 345" role="img" aria-label="Fran, Pablo y Chuchi animados"></svg>
  </div>
  <div class="controls">
    <div class="group">
      <div class="label">ANIMACIÓN</div>
      <div class="seg" id="mode">
        <button aria-pressed="true" data-v="idle">Reposo</button>
        <button aria-pressed="false" data-v="walk">Andar</button>
        <button aria-pressed="false" data-v="talk">Charla</button>
      </div>
    </div>
    <div class="group">
      <div class="label">EXPRESIÓN</div>
      <div class="seg" id="mood">
        <button aria-pressed="true" data-v="default">La de siempre</button>
        <button aria-pressed="false" data-v="happy">Contentos</button>
        <button aria-pressed="false" data-v="surprised">Sorprendidos</button>
        <button aria-pressed="false" data-v="angry">Mosqueados</button>
      </div>
    </div>
  </div>

  <div id="people" class="wrap" style="padding:0;gap:30px"></div>

  <section class="who">
    <h2>Tamaño real en un móvil</h2>
    <p class="lead">Los tres a la altura a la que aparecerán en un móvil en horizontal.</p>
    <div class="phone" id="phone"></div>
  </section>
</div>
<script>${js}</script>
<script>
const IDS = ['fran', 'pablo', 'chuchi'];
const VB_HEAD = '-65 -95 135 175';
const stage = document.getElementById('crew');
// Fran and Pablo face right, Chuchi faces them: a group chatting in the street.
const PLACE = { fran: 'translate(-170 0)', pablo: 'translate(-10 0)', chuchi: 'translate(170 0) scale(-1 1)' };
const WALK = { fran: 'translate(-170 0)', pablo: 'translate(0 0)', chuchi: 'translate(170 0)' };
const rigs = {};
const wraps = {};
for (const [i, id] of IDS.entries()) {
  const m = CREW[id];
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', PLACE[id]);
  g.innerHTML = m.body();
  stage.appendChild(g);
  wraps[id] = g;
  rigs[id] = new CREW.Rig(g.querySelector('#personaje'), m, { seed: i });
}

// Per-character sections: three views and four expressions.
const people = document.getElementById('people');
const NAMES = { neutral: 'Tranquilo', happy: 'Contento', surprised: 'Sorprendido', angry: 'Mosqueado' };
for (const id of IDS) {
  const m = CREW[id];
  const fig = (body, label, vb = VB_HEAD) => '<figure><svg viewBox="' + vb + '" role="img" aria-label="' + m.INFO.name + ' ' + label.toLowerCase() + '">' + body + '</svg><figcaption>' + label + '</figcaption></figure>';
  const cells = [
    fig(m.headFront(), 'De frente'), fig(m.head(), 'Tres cuartos'), fig(m.headProfile(), 'De perfil'),
    ...['neutral', 'happy', 'surprised', 'angry'].map((k) => fig(m.head({ mood: k }), NAMES[k])),
  ];
  const sec = document.createElement('section');
  sec.className = 'who';
  sec.innerHTML = '<div class="head"><h2>' + m.INFO.name + '</h2><span class="traits">' + m.INFO.traits + '</span></div><div class="grid">' + cells.join('') + '</div>';
  people.appendChild(sec);
}
const phone = document.getElementById('phone');
for (const h of [150, 120, 95]) {
  const d = document.createElement('div');
  d.innerHTML = '<svg viewBox="-260 -320 520 330" style="max-height:' + h + 'px" aria-hidden="true">' + IDS.map((id) => '<g transform="' + PLACE[id].replace(/-?\\d+/, (v) => String(Math.round(+v * 0.75))) + '">' + CREW[id].body() + '</g>').join('') + '</svg><span>' + h + ' px</span>';
  phone.appendChild(d);
}

let mode = 'idle', mood = 'default';
for (const [el, set] of [[document.getElementById('mode'), (v) => (mode = v)], [document.getElementById('mood'), (v) => (mood = v)]]) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    for (const x of el.children) x.setAttribute('aria-pressed', String(x === b));
    set(b.dataset.v);
  });
}

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const t0 = performance.now();
let last = 0;
function frame(now) {
  const t = window.__freeze ?? (now - t0) / 1000;
  const dt = Math.min(0.05, Math.max(0, t - last));
  last = t;
  const speaker = IDS[Math.floor(t / 3.4) % 3];
  for (const id of IDS) {
    const r = rigs[id];
    r.mode = mode === 'walk' ? 'walk' : 'idle';
    r.talking = mode === 'talk' && id === speaker;
    r.mood = mood === 'default' ? CREW[id].INFO.defaultMood ?? 'neutral' : mood;
    wraps[id].setAttribute('transform', mode === 'walk' ? WALK[id] : PLACE[id]);
    r.update(reduced ? 0 : t, dt);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
</script>
`;
writeFileSync('artifact/crew-lamina.html', html);
console.log(`artifact/crew-lamina.html · ${(html.length / 1024).toFixed(0)} KB`);
