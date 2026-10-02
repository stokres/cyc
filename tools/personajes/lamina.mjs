// Builds Fran's character sheet: an animated rig preview, turnaround, expressions
// and phone-size check. Output: artifact/fran-lamina.html (published for review)
// and art/personajes/fran.svg (the layered source, kit-template conventions).
// Usage: node tools/personajes/lamina.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import * as F from '../../src/arte/personajes/fran.mjs';
import { svg } from '../../src/arte/personajes/svg.mjs';

mkdirSync('artifact', { recursive: true });
mkdirSync('art/personajes', { recursive: true });

// Layered source file, same piece names and pivots as the kit's artist template.
writeFileSync('art/personajes/fran.svg', svg('-80 -292 160 302', F.body(), 'Fran · Camiones y Caravanas'));

const stripIds = (s) => s.replace(/<g id="[^"]*"/g, '<g').replace(/<circle id="pivot-[^>]*>/g, '');
const VB_BODY = '-80 -292 160 302';
const VB_HEAD = '-65 -80 135 155';

// Head variants for the live rig: mood × mouth × blink.
const moods = ['neutral', 'happy', 'surprised', 'angry'];
const mouths = ['auto', 'reposo', 'a', 'e', 'o', 'm'];
const heads = {};
for (const mood of moods) for (const m of mouths) for (const blink of [0, 1]) {
  heads[`${mood}|${m}|${blink}`] = F.head({ mood, mouthKind: m === 'auto' ? undefined : m, blink: !!blink });
}

const hero = F.body();
const expressions = [
  ['neutral', 'Tranquilo'],
  ['happy', 'Contento'],
  ['surprised', 'Sorprendido'],
  ['angry', 'Mosqueado'],
].map(([m, label]) => `<figure><svg viewBox="${VB_HEAD}" role="img" aria-label="Fran ${label.toLowerCase()}">${stripIds(F.head({ mood: m }))}</svg><figcaption>${label}</figcaption></figure>`).join('');
const visemes = [
  ['reposo', 'Reposo'],
  ['m', 'M · B · P'],
  ['a', 'A'],
  ['e', 'E · I'],
  ['o', 'O · U'],
].map(([k, label]) => `<figure><svg viewBox="${VB_HEAD}" role="img" aria-label="Boca ${label}">${stripIds(F.head({ mouthKind: k }))}</svg><figcaption>${label}</figcaption></figure>`).join('');
const turnaround = [
  [F.headFront(), 'De frente', '-65 -80 130 155'],
  [F.head(), 'Tres cuartos', VB_HEAD],
  [F.headProfile(), 'De perfil', '-65 -80 130 155'],
].map(([body, label, vb]) => `<figure><svg viewBox="${vb}" role="img" aria-label="Fran ${label.toLowerCase()}">${stripIds(body)}</svg><figcaption>${label}</figcaption></figure>`).join('');

const html = `<title>Fran · lámina</title>
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
.wrap { max-width: 1100px; margin: 0 auto; padding-inline: 16px; padding-block: 24px 48px; display: grid; gap: 28px; }
header { display: grid; gap: 6px; }
.eyebrow { font-family: var(--display); color: var(--gold); letter-spacing: .12em; font-size: 13px; }
h1 { margin: 0; font-family: var(--display); font-weight: 400; font-size: clamp(30px, 6vw, 48px); letter-spacing: .03em; text-wrap: balance; }
h2 { margin: 0 0 12px; font-family: var(--display); font-weight: 400; font-size: 20px; color: var(--gold); letter-spacing: .05em; }
p { margin: 0; max-width: 65ch; color: var(--cream); }
.lead { color: var(--muted); }
.hero { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 20px; align-items: stretch; }
.stage { position: relative; border-radius: 22px; overflow: hidden; background:
  radial-gradient(ellipse at 50% 85%, rgba(255, 190, 120, .28), transparent 55%),
  linear-gradient(#1a2240, #0e1429 70%, #0b1022); min-height: 440px; display: grid; place-items: end center; padding-top: 16px; border: 1px solid rgba(219,180,108,.35); }
.stage svg { height: min(64vh, 520px); width: auto; max-width: 100%; display: block; margin-bottom: 4%; position: relative; }
.pivot { display: none; }
.floor { position: absolute; left: 0; right: 0; bottom: 0; height: 18%; background: linear-gradient(rgba(60,64,84,.55), rgba(30,32,46,.9)); }
.controls { display: grid; gap: 16px; align-content: start; background: var(--panel); border-radius: 22px; padding: 18px; border: 1px solid rgba(219,180,108,.2); }
.group { display: grid; gap: 8px; }
.label { font-family: var(--display); font-size: 12px; letter-spacing: .1em; color: var(--muted); }
.seg { display: flex; flex-wrap: wrap; gap: 8px; }
.seg button { font: 600 15px var(--body); color: var(--cream); background: var(--panel-2); border: 1px solid rgba(243,234,214,.18); border-radius: 999px; padding: 8px 16px; cursor: pointer; min-height: 40px; }
.seg button[aria-pressed="true"] { background: var(--gold); color: var(--ink); border-color: var(--gold); }
.seg button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.notes { display: grid; gap: 6px; font-size: 15px; color: var(--muted); }
.notes b { color: var(--cream); font-weight: 600; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
figure { margin: 0; background: var(--paper); border-radius: 16px; padding: 10px 10px 8px; display: grid; gap: 4px; }
figure svg { width: 100%; height: auto; display: block; }
figcaption { text-align: center; color: #5b5446; font-size: 14px; font-weight: 600; }
.phone { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.phone div { background: linear-gradient(#1a2240, #0e1429); border-radius: 14px; border: 1px solid rgba(219,180,108,.25); display: grid; place-items: end center; padding: 12px 8px 6px; gap: 6px; min-height: 170px; }
.phone span { color: var(--muted); font-size: 13px; }
section { display: grid; gap: 4px; }
@media (max-width: 760px) { .hero { grid-template-columns: 1fr; } .stage { min-height: 360px; } .g3, .phone { grid-template-columns: repeat(3, minmax(0, 1fr)); } .phone div { min-height: 150px; } }
@media (prefers-reduced-motion: reduce) { .stage svg { animation: none; } }
</style>
<div class="wrap">
  <header>
    <div class="eyebrow">CAMIONES Y CARAVANAS · PERSONAJES</div>
    <h1>Fran</h1>
    <p class="lead">Lámina de personaje para revisar antes de dibujar a Pablo y a Chuchi. Estilo de Nora, construido por piezas con puntos de giro para animarlo en el juego.</p>
  </header>

  <div class="hero">
    <div class="stage">
      <div class="floor"></div>
      <svg id="fran-svg" viewBox="${VB_BODY}" role="img" aria-label="Fran animado">
        <g id="fran-live">${hero.replace('<g id="personaje"', '<g id="personaje"')}</g>
      </svg>
    </div>
    <div class="controls">
      <div class="group">
        <div class="label">ANIMACIÓN</div>
        <div class="seg" id="mode">
          <button aria-pressed="true" data-v="idle">Reposo</button>
          <button aria-pressed="false" data-v="walk">Andar</button>
          <button aria-pressed="false" data-v="talk">Hablar</button>
        </div>
      </div>
      <div class="group">
        <div class="label">EXPRESIÓN</div>
        <div class="seg" id="mood">
          <button aria-pressed="true" data-v="neutral">Tranquilo</button>
          <button aria-pressed="false" data-v="happy">Contento</button>
          <button aria-pressed="false" data-v="surprised">Sorprendido</button>
          <button aria-pressed="false" data-v="angry">Mosqueado</button>
        </div>
      </div>
      <div class="notes">
        <div><b>Rasgos que mandan:</b> bigote que baja a una perilla larga, cejas gruesas y rectas, canas en las patillas, camiseta verde azulada y complexión ancha.</div>
        <div><b>Animación:</b> ciclo de paso con contacto, bajada y paso; brazos a contratiempo; la barba es la mandíbula y se mueve al hablar; mechones y barba con inercia.</div>
        <div><b>Aún sin luz de escena:</b> en el juego recibirá la luz de las farolas y del bar, con contraluz y sombra.</div>
      </div>
    </div>
  </div>

  <section>
    <h2>Cabeza en tres vistas</h2>
    <div class="grid g3">${turnaround}</div>
  </section>

  <section>
    <h2>Expresiones</h2>
    <div class="grid">${expressions}</div>
  </section>

  <section>
    <h2>Bocas para hablar</h2>
    <div class="grid g3">${visemes}</div>
  </section>

  <section>
    <h2>Tamaño real en un móvil</h2>
    <p class="lead">Altura a la que aparecerá en pantalla en un móvil en horizontal, según lo cerca que esté de la cámara.</p>
    <div class="phone">
      ${[150, 120, 95].map((h) => `<div><svg viewBox="${VB_BODY}" style="height:${h}px;width:auto" aria-hidden="true"><use href="#personaje"/></svg><span>${h} px</span></div>`).join('')}
    </div>
  </section>
</div>
<script>
const HEADS = ${JSON.stringify(heads)};
const J = ${JSON.stringify(F.JOINTS)};
const root = document.getElementById('personaje');
const piece = (id) => root.querySelector('#' + id);
const headArt = root.querySelector('#cabeza > g');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let mode = 'idle', mood = 'neutral';
for (const [id, set] of [['mode', (v) => (mode = v)], ['mood', (v) => (mood = v)]]) {
  const el = document.getElementById(id);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    for (const x of el.children) x.setAttribute('aria-pressed', String(x === b));
    set(b.dataset.v);
  });
}

// Bone hierarchy: parent, pivot.
const BONES = [
  ['torso', 'root'], ['cabeza', 'torso'],
  ['brazo_sup_detras', 'torso'], ['antebrazo_detras', 'brazo_sup_detras'], ['mano_detras', 'antebrazo_detras'],
  ['brazo_sup_delante', 'torso'], ['antebrazo_delante', 'brazo_sup_delante'], ['mano_delante', 'antebrazo_delante'],
  ['muslo_detras', 'root'], ['pierna_detras', 'muslo_detras'], ['pie_detras', 'pierna_detras'],
  ['muslo_delante', 'root'], ['pierna_delante', 'muslo_delante'], ['pie_delante', 'pierna_delante'],
];
const els = Object.fromEntries(BONES.map(([b]) => [b, piece(b)]));

const TAU = Math.PI * 2;
const pos = (v) => Math.max(0, v);
function legPose(ph) {
  // ph 0 = heel contact with the leg forward; 0.5 = toe off behind.
  const thigh = 24 * Math.cos(TAU * ph);
  const swing = ph > 0.5;
  const knee = 4 + (swing ? 46 * Math.sin(Math.PI * (ph - 0.5) * 2) : 12 * pos(Math.sin(TAU * ph * 2)));
  const foot = -(thigh - knee) + (swing ? 12 * Math.sin(Math.PI * (ph - 0.5) * 2) : 0) + (ph < 0.08 ? -10 * (1 - ph / 0.08) : 0);
  return [thigh, -knee, foot];
}

// Secondary motion: damped springs driven by the body's movement.
const spring = (k, d) => ({ x: 0, v: 0, step(target, dt) { this.v += ((target - this.x) * k - this.v * d) * dt; this.x += this.v * dt; return this.x; } });
const beardS = spring(60, 7), tuftS = spring(90, 8);
let lastRootY = 0;

let blinkT = 2, blink = 0, viseme = 'reposo', visT = 0, talkI = 0;
const TALK = 'oye no veas la que se ha liado en el bar el rio esta noche ';
const MOUTH = (c) => 'aá'.includes(c) ? 'a' : 'oóuú'.includes(c) ? 'o' : 'eéií'.includes(c) ? 'e' : 'mbp'.includes(c) ? 'm' : c === ' ' ? 'reposo' : 'e';

function pose(t) {
  const P = { root: [0, 0], torso: 0, cabeza: 0 };
  if (mode === 'walk') {
    const ph = (t / 1.0) % 1;
    const [tf, kf, ff] = legPose(ph);
    const [tb, kb, fb] = legPose((ph + 0.5) % 1);
    Object.assign(P, {
      muslo_delante: tf, pierna_delante: kf, pie_delante: ff,
      muslo_detras: tb, pierna_detras: kb, pie_detras: fb,
      brazo_sup_delante: -20 * Math.cos(TAU * ph), antebrazo_delante: 14 + 12 * (0.5 + 0.5 * Math.sin(TAU * (ph - 0.15))), mano_delante: 4,
      brazo_sup_detras: 20 * Math.cos(TAU * ph), antebrazo_detras: 14 + 12 * (0.5 - 0.5 * Math.sin(TAU * (ph - 0.15))), mano_detras: 4,
      torso: 3 + 1.2 * Math.cos(TAU * 2 * ph),
      cabeza: -2 - 1.5 * Math.cos(TAU * 2 * (ph - 0.12)),
    });
    P.root = [0, 3.2 * Math.cos(TAU * 2 * (ph - 0.06)) - 1];
  } else {
    const br = Math.sin(TAU * t / 3.4);
    const sway = Math.sin(TAU * t / 7);
    Object.assign(P, {
      muslo_delante: -1.2 * sway, pierna_delante: 0, pie_delante: 1.2 * sway,
      muslo_detras: -1.2 * sway, pierna_detras: 0, pie_detras: 1.2 * sway,
      brazo_sup_delante: 3 + 1.5 * Math.sin(TAU * t / 3.4 + 0.6), antebrazo_delante: 8 + 2 * br, mano_delante: 4,
      brazo_sup_detras: -2 + 1.2 * Math.sin(TAU * t / 3.4 + 1.2), antebrazo_detras: 7, mano_detras: 3,
      torso: 0.7 * br, cabeza: -0.8 * br + 2.5 * Math.sin(TAU * t / 9),
    });
    P.root = [1.6 * sway, 0.7 * br];
    if (mode === 'talk') {
      // Gesture beats: the hand comes up to chest height, waves a little, and rests again.
      const g = Math.sin(t * 2.3);
      const e = Math.min(1, Math.max(0, 0.5 + 0.9 * Math.sin(t * 0.85)));
      const ease = e * e * (3 - 2 * e);
      const lerp = (a, b) => a + (b - a) * ease;
      Object.assign(P, {
        brazo_sup_delante: lerp(P.brazo_sup_delante, 16 + 7 * g),
        antebrazo_delante: lerp(P.antebrazo_delante, 112 + 14 * Math.sin(t * 3.1 + 1)),
        mano_delante: lerp(P.mano_delante, 18 + 12 * Math.sin(t * 4.3)),
        cabeza: 2.5 * Math.sin(t * 4.1) + 1.5 * g, torso: 1.5 + 0.8 * g,
      });
    }
  }
  return P;
}

let t0 = performance.now(), lastT = 0, lastKey = '';
function frame(now) {
  const t = window.__freeze ?? (now - t0) / 1000;
  const dt = Math.min(0.05, t - lastT);
  lastT = t;
  const P = pose(reduced ? 0 : t);

  // World matrices: child = parent · T(pivot) · R(-angle) · T(-pivot)  (SVG y points down).
  const M = { root: new DOMMatrix().translate(P.root[0], P.root[1]) };
  for (const [b, parent] of BONES) {
    const [px, py] = J[b];
    M[b] = M[parent].translate(px, py).rotate(-(P[b] || 0)).translate(-px, -py);
    els[b].setAttribute('transform', M[b].toString());
  }

  // Face: blink, lip sync, expression.
  blinkT -= dt;
  if (blinkT < 0) { blink = 1; if (blinkT < -0.13) { blinkT = 2.2 + Math.random() * 3; blink = 0; } }
  if (mode === 'talk') {
    visT += dt;
    if (visT > 0.085) { visT = 0; talkI = (talkI + 1) % TALK.length; viseme = MOUTH(TALK[talkI]); }
  } else viseme = 'auto';
  const key = mood + '|' + viseme + '|' + (blink ? 1 : 0);
  if (key !== lastKey) { headArt.innerHTML = HEADS[key]; lastKey = key; }

  // Beard and fringe lag behind the bob of the body.
  const clampV = (v, m) => Math.max(-m, Math.min(m, v));
  const vy = clampV((P.root[1] - lastRootY) / Math.max(dt, 1 / 30), 40);
  lastRootY = P.root[1];
  const bs = clampV(beardS.step(-vy * 0.1 + (mode === 'talk' ? 1.5 * Math.sin(t * 4.1) : 0), dt), 5);
  const ts = clampV(tuftS.step(-vy * 0.2, dt), 7);
  const jaw = headArt.querySelector('#mandibula');
  if (jaw) {
    const base = jaw.getAttribute('data-base') ?? jaw.getAttribute('transform') ?? '';
    jaw.setAttribute('data-base', base);
    jaw.setAttribute('transform', base + ' rotate(' + bs.toFixed(2) + ' 20 18)');
  }
  for (const [id, px, py] of [['mechon_1', 22, -46], ['mechon_2', 6, -48]]) {
    headArt.querySelector('#' + id)?.setAttribute('transform', 'rotate(' + ts.toFixed(2) + ' ' + px + ' ' + py + ')');
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
</script>
`;
writeFileSync('artifact/fran-lamina.html', html);
console.log(`artifact/fran-lamina.html · ${(html.length / 1024).toFixed(0)} KB · art/personajes/fran.svg`);
