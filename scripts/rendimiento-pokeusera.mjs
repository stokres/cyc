// PokéUsera · performance check (CLAUDE.md: every scene that is touched must pass it; docs/POKEUSERA.md, «Rendimiento»).
//
// Loads each screen of the game on a phone-sized screen (390×844, dpr 2.6) with the CPU slowed down 4×
// (CDP Emulation.setCPUThrottlingRate, like a mid-range phone) and measures, for a few seconds:
//   - redraws per second (frames where the loop really drew: `paso` returned true, the screen was marked
//     dirty, or the 250 ms blink tick) and the loop's wake-ups per second (capped at 60);
//   - average and worst milliseconds of a drawn frame (`paso` + `dibujar`, from the `?medir` counters of
//     src/pokeusera/pantalla.ts) and the share of the main thread used by the animation-frame callbacks;
//   - drawImage calls per drawn frame, canvases created while measuring (should be 0: nothing may be baked
//     in steady state; the ones the background baking of precalentar.ts makes are not counted) and in total since the page loaded (memory), and the first-frames spike (baking);
//   - long tasks (> 50 ms, the browser's own jank measure: a bake that blocks the thread) while measuring.
// Before measuring, a screen is given time to finish the art the game warms up in the background
// (src/pokeusera/pantallas/precalentar.ts): it waits until no canvas has been created for 1.5 s.
// It FAILS (exit 1) when a screen goes over its budget (see PRESUPUESTOS: today's measurements plus margin).
//
// It starts nothing itself: run `npm run dev` first.
//   node scripts/rendimiento-pokeusera.mjs [pantalla...]     (default: all)  [PUERTO=5173]
//   node scripts/rendimiento-pokeusera.mjs 5174 combate-juega     (a bare number is the port)
//   screens: titulo, menu, entrenador, draft, draft-flujo, combate-elige, combate-juega, combate-ritmo, podio, estadisticas, useritopedia, useritopedia-ficha, guia
// Environment: SEG=4 (seconds measured per screen), CPU=4 (throttling rate; 1 = none, budgets then do not apply),
//   VOLCAR=carpeta (also write a PNG of every screen there, to compare looks before/after).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const puertoArg = args.find((a) => /^\d{4,5}$/.test(a));
const PUERTO = Number(puertoArg ?? process.env.PUERTO ?? 5173);
const quiero = args.filter((a) => a !== puertoArg);
const SEG = Number(process.env.SEG ?? 4);
const CPU = Number(process.env.CPU ?? 4);
const BASE = `http://localhost:${PUERTO}/pokeusera.html`;

/**
 * Budgets, set from the measurements of 13 October 2026 (CPU ×4, a laptop-class CPU) with a ~50 % margin:
 *   redibujos: max redraws per second.  ms: max average ms per drawn frame.  pico: max ms of the worst frame.
 *   cb: max % of the main thread spent in animation-frame callbacks.  di: max drawImage per drawn frame.
 *   lienzos: max canvases created while measuring.  largas: max long tasks (> 50 ms) while measuring.
 *   primer: max ms of the worst frame since the page loaded (or since entering the screen, for draft-flujo).
 */
const PRESUPUESTOS = {
  //                  redibujos/s  ms/fotog.  pico  hilo cb %  drawImage  lienzos en reposo  tareas largas  1.º pico (arranque)
  titulo: { redibujos: 62, ms: 1.5, pico: 20, cb: 10, di: 25, lienzos: 0, largas: 0, primer: 1000 },
  menu: { redibujos: 6, ms: 1, pico: 20, cb: 3, di: 5, lienzos: 0, largas: 0, primer: 1000 },
  entrenador: { redibujos: 15, ms: 2.5, pico: 20, cb: 5, di: 45, lienzos: 0, largas: 0, primer: 1000 },
  draft: { redibujos: 15, ms: 4, pico: 30, cb: 6, di: 80, lienzos: 0, largas: 0, primer: 1600 },
  'draft-flujo': { redibujos: 15, ms: 4, pico: 30, cb: 6, di: 80, lienzos: 40, largas: 1, primer: 300 },
  'combate-elige': { redibujos: 8, ms: 4, pico: 25, cb: 5, di: 85, lienzos: 0, largas: 0, primer: 600 },
  // ?auto plays ten times faster than a person sees (the animations last a tenth): nearly always something moves. It also sets off the move effects (≈ 10 drawImage while one flies).
  // «Lienzos» here are the screen's own (the text lines, damage numbers, badges); the background baking of precalentar.ts is not counted.
  'combate-juega': { redibujos: 60, ms: 6, pico: 50, cb: 30, di: 120, lienzos: 200, largas: 6, primer: 600 },
  'combate-ritmo': { redibujos: 40, ms: 5, pico: 50, cb: 16, di: 100, lienzos: 60, largas: 4, primer: 600 },
  podio: { redibujos: 30, ms: 3, pico: 20, cb: 8, di: 55, lienzos: 0, largas: 0, primer: 1500 },
  estadisticas: { redibujos: 8, ms: 6, pico: 25, cb: 4, di: 150, lienzos: 0, largas: 0, primer: 1500 },
  useritopedia: { redibujos: 2, ms: 3, pico: 10, cb: 3, di: 45, lienzos: 0, largas: 0, primer: 1500 },
  'useritopedia-ficha': { redibujos: 6, ms: 3, pico: 10, cb: 4, di: 25, lienzos: 0, largas: 0, primer: 1500 },
  guia: { redibujos: 8, ms: 3, pico: 20, cb: 4, di: 70, lienzos: 0, largas: 0, primer: 1000 },
};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Each screen: how to reach it (`ir`), what it needs to be steady (`listo`). Keys: Enter accepts, arrows move. */
const PANTALLAS = {
  titulo: { url: '', ir: async () => {} },
  menu: { url: '', ir: async (p) => { await tecla(p, 'Enter'); } },
  entrenador: { url: '', ir: async (p) => { await tecla(p, 'Enter'); await tecla(p, 'Enter'); } },
  draft: { url: '?draft', ir: async () => {} },
  // The draft as a player reaches it: title, menu, trainer pick, one and a half seconds on each (the background baking
  // gets only that long). «1.º pico» is then the worst frame from the moment ELEGIR is pressed: how much the draft stalls.
  'draft-flujo': { url: '', ir: async (p, marca) => { await tecla(p, 'Enter'); await dormir(1500); await tecla(p, 'Enter'); await dormir(1500); await marca(); await tecla(p, 'Enter'); }, quieto: false },
  'combate-elige': { url: '?combate&semilla=7', ir: async () => {}, esperar: 2500 },
  // The battle plays by itself (and writes new lines of text all the time): there is no quiet moment to wait for.
  'combate-juega': { url: '?combate&auto&semilla=7', ir: async () => {}, esperar: 1500, quieto: false },
  // The same battle at the pace a player sees (the speed setting NORMAL, no ?auto shortcut speed-up): `cfg` is changed in the page (dev server only).
  'combate-ritmo': { url: '?combate&auto&semilla=7', ir: async (p) => { await p.evaluate(async () => { const ui = await import('/src/pokeusera/pantallas/ui.ts'); ui.cfg.rapido = false; ui.cfg.velocidad = 'normal'; }); }, esperar: 3000, quieto: false },
  // Reached by playing a whole quick game by itself (?auto): the podium, then ESTADÍSTICAS with Enter.
  podio: { url: '?auto&semilla=7', ir: async (p) => { await hastaPodio(p); } },
  estadisticas: { url: '?auto&semilla=7', ir: async (p) => { await hastaPodio(p); await tecla(p, 'Enter'); } },
  // The Useritopedia: menu → USERITOPEDIA (third entry): the list, and a card (Enter on the first userito).
  useritopedia: { url: '', ir: async (p) => { await tecla(p, 'Enter'); await tecla(p, 'ArrowDown', false); await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); } },
  'useritopedia-ficha': { url: '', ir: async (p) => { await tecla(p, 'Enter'); await tecla(p, 'ArrowDown', false); await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); await tecla(p, 'Enter', false); }, esperar: 1500 },
  // The guide: menu → GUÍA (fourth entry).
  guia: { url: '', ir: async (p) => { await tecla(p, 'Enter'); for (let i = 0; i < 3; i++) await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); } },
};
for (const n of quiero) if (!PANTALLAS[n]) { console.error(`Pantalla desconocida: ${n}. Hay: ${Object.keys(PANTALLAS).join(', ')}`); process.exit(2); }

/** Presses a key. With `cambia` (the default) the screen is expected to change: the key is pressed again once if nothing happened (a slow, busy machine can lose one). */
async function tecla(p, k, cambia = true) {
  for (let intento = 0; intento < (cambia ? 2 : 1); intento++) {
    const antes = await p.evaluate(() => window.__medir.cambios);
    await p.keyboard.press(k);
    const ok = await p.waitForFunction((n) => window.__medir.cambios > n, antes, { timeout: 2500 }).then(() => true, () => false);
    if (ok) break;
  }
  await dormir(250);
}

/** Waits until the background baking is over: no canvas created for 1.5 s (at most `max` ms). */
async function esperarQuieto(p, max = 45000) {
  const t0 = Date.now();
  let ultimo = -1;
  let quietas = 0;
  while (Date.now() - t0 < max && quietas < 3) {
    const n = await p.evaluate(() => window.__lienzos + window.__lienzosFondo);
    quietas = n === ultimo ? quietas + 1 : 0;
    ultimo = n;
    await dormir(500);
  }
}

async function hastaPodio(p) {
  // The game ends when the state has a winner; the podium takes a moment after the last turn plays.
  await p.waitForFunction(() => window.__pokeusera?.partida?.estado?.ganador != null, null, { timeout: 240000, polling: 500 });
  const n = await p.evaluate(() => window.__medir.cambios);
  await p.waitForFunction((n0) => window.__medir.cambios > n0, n, { timeout: 60000, polling: 250 });
  await dormir(1200);
}

const b = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const filas = [];
const fallos = [];

for (const nombre of Object.keys(PANTALLAS)) {
  if (quiero.length && !quiero.includes(nombre)) continue;
  const def = PANTALLAS[nombre];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.6, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch {}
    const w = window;
    w.__lienzos = 0;
    w.__di = 0;
    w.__raf = { n: 0, ms: 0, max: 0 };
    w.__largas = { n: 0, max: 0 };
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { w.__largas.n++; if (e.duration > w.__largas.max) w.__largas.max = e.duration; } }).observe({ entryTypes: ['longtask'] });
    } catch {}
    // Canvases created (baked): each one is memory and a texture upload.
    const ce = document.createElement.bind(document);
    // (Those made inside a task of the background baking, precalentar.ts, are not the screen's: they are counted apart.)
    w.__lienzosFondo = 0;
    document.createElement = (tag, o) => { if (String(tag).toLowerCase() === 'canvas') { if (w.__precalentando) w.__lienzosFondo++; else w.__lienzos++; } return ce(tag, o); };
    // drawImage calls: the cost of a frame on a phone is mostly the number of blits.
    const di = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...a) { w.__di++; return di.apply(this, a); };
    // Time spent inside animation-frame callbacks (every wake-up of the loop, drawn or not).
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf((t) => { const t0 = performance.now(); cb(t); const d = performance.now() - t0; w.__raf.n++; w.__raf.ms += d; if (d > w.__raf.max) w.__raf.max = d; });
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await page.goto(BASE + (def.url ? def.url + '&medir' : '?medir'));
  await page.waitForFunction(() => window.__medir && window.__medir.dibujos > 2, null, { timeout: 60000 });
  // `marca()`: from there on the «first spike» counts only what happens after it (entering a screen from the previous one).
  const marca = () => page.evaluate(() => { window.__medir.reiniciar(); });
  await def.ir(page, marca);
  await dormir(def.esperar ?? 1200);
  if (def.quieto !== false) await esperarQuieto(page);
  // The spike of the first frames (baking sprites, panels...) is what the reset throws away; keep it apart.
  const primer = await page.evaluate(() => window.__medir.max);
  await page.evaluate(() => {
    window.__medir.reiniciar();
    window.__di = 0;
    window.__raf.n = window.__raf.ms = window.__raf.max = 0;
    window.__largas.n = window.__largas.max = 0;
    window.__lienzos0 = window.__lienzos;
    window.__t0 = performance.now();
  });
  await dormir(SEG * 1000);
  const m = await page.evaluate(() => {
    const seg = (performance.now() - window.__t0) / 1000;
    const x = window.__medir;
    return { seg, rafs: x.rafs, dibujos: x.dibujos, ms: x.ms, max: x.max, di: window.__di, cb: window.__raf.ms, lienzos: window.__lienzos - window.__lienzos0, lienzosTotal: window.__lienzos + window.__lienzosFondo, largas: window.__largas.n, largaMax: window.__largas.max };
  });
  if (process.env.VOLCAR) {
    mkdirSync(process.env.VOLCAR, { recursive: true });
    await page.screenshot({ path: `${process.env.VOLCAR}/${nombre}.png` });
  }
  const fila = {
    nombre,
    redibujos: m.dibujos / m.seg,
    despertares: m.rafs / m.seg,
    ms: m.dibujos ? m.ms / m.dibujos : 0,
    pico: m.max,
    cb: (m.cb / (m.seg * 1000)) * 100,
    di: m.dibujos ? m.di / m.dibujos : 0,
    lienzos: m.lienzos,
    lienzosTotal: m.lienzosTotal,
    largas: m.largas,
    largaMax: m.largaMax,
    primer,
  };
  filas.push(fila);
  const pres = PRESUPUESTOS[nombre];
  if (CPU === 4 && pres) {
    const malo = [];
    if (fila.redibujos > pres.redibujos) malo.push(`redibujos ${fila.redibujos.toFixed(1)}/s > ${pres.redibujos}`);
    if (fila.ms > pres.ms) malo.push(`ms/fotograma ${fila.ms.toFixed(2)} > ${pres.ms}`);
    if (fila.pico > pres.pico) malo.push(`pico ${fila.pico.toFixed(1)} ms > ${pres.pico}`);
    if (fila.cb > pres.cb) malo.push(`hilo en callbacks ${fila.cb.toFixed(1)} % > ${pres.cb}`);
    if (fila.di > pres.di) malo.push(`drawImage/fotograma ${fila.di.toFixed(0)} > ${pres.di}`);
    if (fila.lienzos > pres.lienzos) malo.push(`lienzos creados en reposo ${fila.lienzos} > ${pres.lienzos}`);
    if (fila.largas > pres.largas) malo.push(`tareas largas (>50 ms) ${fila.largas} > ${pres.largas} (la peor ${fila.largaMax.toFixed(0)} ms)`);
    if (fila.primer > pres.primer) malo.push(`primer pico (arranque) ${fila.primer.toFixed(0)} ms > ${pres.primer}`);
    if (malo.length) fallos.push(`${nombre}: ${malo.join('; ')}`);
  }
  if (errores.length) fallos.push(`${nombre}: errores de la página: ${errores.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await b.close();

const f = (v, d = 1) => v.toFixed(d);
console.log(`\nPokéUsera · rendimiento (CPU ×${CPU}, 390×844 @2.6, ${SEG} s por pantalla)`);
console.log('pantalla         redibujos/s  despert./s  ms/fotog.  pico ms  hilo cb %  drawImage/fot.  lienzos(+reposo)  tareas largas  1.º pico ms');
for (const x of filas) {
  console.log(
    `${x.nombre.padEnd(16)} ${f(x.redibujos).padStart(10)}  ${f(x.despertares).padStart(10)}  ${f(x.ms, 2).padStart(9)}  ${f(x.pico).padStart(7)}  ${f(x.cb).padStart(9)}  ${f(x.di, 0).padStart(14)}  ${String(x.lienzosTotal).padStart(8)} (+${x.lienzos})  ${String(x.largas).padStart(6)} (${f(x.largaMax, 0)} ms)  ${f(x.primer, 0).padStart(10)}`,
  );
}
if (fallos.length) {
  console.log('\nFALLA:');
  for (const x of fallos) console.log('  - ' + x);
  process.exit(1);
}
console.log('\nBien: todas las pantallas dentro de presupuesto.');
