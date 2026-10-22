// Plays the start of chapter 2 once, from the Brío's door to «Continuará…» (docs/CAPITULO2.md), on a
// phone-sized viewport and by touch, like a player: the round (the beers minigame, skipped after two
// misses), the slot machine (Chuchi, Guille), the duro, the fresquitos (Pablo's two wrong lines first),
// the spin, the chant (skipped) and the Pang (closed with ×). Screenshots of each level of the night.
// Fails on any console error or if a step does not do what it should.
// Usage: node scripts/capitulo2.mjs [url] [outDir]   (against npm run dev; the url gets ?capitulo2&nueva)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [base = `http://localhost:${process.env.PUERTO ?? 5173}/`, out = 'revisiones/capitulo2'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.stack || String(e)));
page.on('console', (m) => m.type() === 'error' && !m.text().includes('Failed to load resource') && errors.push(m.text()));
await page.goto(`${base}?capitulo2&nueva`);
await page.waitForFunction(() => window.__cyc, null, { timeout: 30000 });
await page.evaluate(() => window.__cyc.listo());

let n = 0;
const shot = (name) => page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);
const flag = (k) => page.evaluate((k) => !!window.__cyc.g.estado.flags[k], k);
const check = (ok, msg) => ok || errors.push('PASO FALLIDO: ' + msg);

/** Tap through dialogue until the running script ends, or a choice or a full-screen piece comes up. */
async function charla() {
  let last = '';
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > 90000) return void errors.push('charla: atascado');
    await wait(120);
    const s = await page.evaluate(() => ({
      busy: window.__cyc.g.ocupadoAhora,
      d: document.querySelector('.dialogo')?.innerText ?? null,
      opciones: !!document.querySelector('.opciones-dialogo .opcion-dialogo'),
      tuto: !!document.querySelector('.cubierta.tutorial'),
      over: !!document.querySelector('.cubierta.movil, .cubierta.minijuego, .cubierta.tragaperras, .cubierta.rotulo, .cubierta.titulo'),
    }));
    if (s.over || s.opciones) return;
    if (s.tuto) {
      await page.touchscreen.tap(300, 250);
      await wait(400);
      continue;
    }
    if (s.d !== null) {
      const t = s.d.replace(/\s*▸\s*$/, '').replace(/\n/g, ' · ');
      if (t !== last) console.log('   »', t);
      last = t;
      await page.touchscreen.tap(420, 150);
      continue;
    }
    if (!s.busy) return;
  }
}

const camaraQuieta = () => page.waitForFunction(() => Math.abs(window.__cyc.g.motor.cam - window.__cyc.g.motor.camGoal) < 3, null, { timeout: 20000 });

const zonaCss = (id) =>
  page.evaluate((id) => {
    const g = window.__cyc.g;
    const r = g.motor.zonaRect(g.zona(id));
    return [((r.x + r.w / 2) / g.motor.vw) * g.motor.cssW, ((r.y + r.h / 2) / 1080) * g.motor.cssH];
  }, id);

const actorCss = (id) =>
  page.evaluate((id) => {
    const g = window.__cyc.g;
    const a = g.pjs.get(id) ?? g.npcs.get(id);
    const k = g.motor.f(a.y);
    return [(g.motor.screenX(a.X, k) / g.motor.vw) * g.motor.cssW, ((a.y - 150 * g.motor.escala(k)) / 1080) * g.motor.cssH];
  }, id);

/** Walk until something is on screen (as a player would), then return where to touch it. */
async function ver(donde) {
  for (let i = 0; i < 30; i++) {
    await camaraQuieta();
    const [x, y] = await donde();
    if (x > 60 && x < 800) return [x, y];
    await page.touchscreen.tap(x < 90 ? 110 : 690, 355);
    await wait(300);
    await charla();
    await page.waitForFunction(() => !window.__cyc.g.activo.moving, null, { timeout: 20000 });
  }
  errors.push('no llego a verlo');
  return donde();
}

async function tocar([x, y]) {
  await page.touchscreen.tap(x, y);
  await wait(150);
  await charla();
}
const tocarZona = async (id) => tocar(await ver(() => zonaCss(id)));
const tocarActor = async (id) => tocar(await ver(() => actorCss(id)));

async function como(id) {
  if ((await page.evaluate(() => window.__cyc.g.estado.activo)) === id) return;
  await page.click('.reparto .pj:first-child');
  await wait(300);
  await page.click(`.reparto .pj[data-id="${id}"]`);
  await wait(500);
  await page.waitForFunction((id) => window.__cyc.g.estado.activo === id, id, { timeout: 20000 }).catch(() => {});
  await camaraQuieta();
  await charla();
  const ahora = await page.evaluate(() => window.__cyc.g.estado.activo);
  if (ahora !== id) {
    await shot(`no-cambia-a-${id}`);
    errors.push(`el selector no cambia a ${id} (sigue ${ahora})`);
  }
}

async function conObjeto(id, zona) {
  const destino = await ver(() => zonaCss(zona));
  await page.click('.bolsa button');
  await wait(250);
  await page.click(`.bandeja .usar[data-id="${id}"]`);
  await wait(200);
  await tocar(destino);
}

/** A minigame with «Saltar»: no taps until it offers to skip, then skip. */
async function saltarMinijuego(sel, nombre) {
  await page.waitForSelector(sel, { timeout: 20000 });
  await wait(1500);
  await shot(nombre);
  await page.waitForSelector(`${sel} .saltar:not([hidden])`, { timeout: 120000 });
  await page.click(`${sel} .saltar`);
  await page.waitForSelector(sel, { state: 'detached', timeout: 10000 });
  await charla();
}

/** The slot machine close-up: watch it, then a tap closes it. */
async function tragaperras(nombre) {
  await page.waitForSelector('.cubierta.tragaperras', { timeout: 20000 });
  await wait(6000);
  await shot(nombre);
  for (let i = 0; i < 20 && (await page.$('.cubierta.tragaperras')); i++) {
    await page.touchscreen.tap(420, 200);
    await wait(700);
  }
  check(!(await page.$('.cubierta.tragaperras')), `la tragaperras (${nombre}) no se cierra al tocar`);
  await charla();
}

async function paso(nombre, fn, comprobar) {
  console.log(`· ${nombre}`);
  await fn();
  if (comprobar) check(await flag(comprobar), `${nombre} (falta ${comprobar})`);
  // Nobody stands on top of anyone else (they would hide each other), Vero included.
  await page.waitForFunction(() => ![...(window.__cyc.g.pjs?.values() ?? [])].some((p) => p.moving), null, { timeout: 10000 }).catch(() => {});
  const juntos = await page.evaluate(() => {
    const g = window.__cyc.g;
    if (!g.escena.startsWith('bar')) return [];
    const a = [...g.pjs.entries(), ...g.npcs.entries()].filter(([, p]) => p.visible);
    const r = [];
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (Math.abs(a[i][1].X - a[j][1].X) < 100) r.push(`${a[i][0]}-${a[j][0]}`);
    return r;
  });
  check(!juntos.length, `${nombre}: uno tapa a otro (${juntos.join(', ')})`);
}

// ---------------------------------------------------------------- chapter 2
await shot('titulo');
await page.touchscreen.tap(420, 200);
await paso('La puerta del Brío y la entrada', async () => {
  await page.waitForFunction(() => window.__cyc.g.escena === 'calle', null, { timeout: 30000 });
  await wait(1500);
  await shot('puerta');
  await charla();
  await page.waitForFunction(() => window.__cyc.g.escena === 'bar0', null, { timeout: 30000 });
  await charla();
}, 'empezado.fran');
await shot('bar0');
const nivel = () => page.evaluate(() => Number(window.__cyc.g.estado.flags['c2.nivel'] ?? 0));

await paso('Con Chuchi, Vero no le pone la ronda', async () => {
  await como('chuchi');
  await tocarActor('vero');
});
check(!(await flag('c2.ronda')), 'Chuchi pide la ronda');
await paso('Fran pide la ronda: las cañas', async () => {
  await como('fran');
  await tocarActor('vero');
  await saltarMinijuego('.cubierta.minijuego.canas', 'canas');
  await page.waitForFunction(() => window.__cyc.g.escena === 'bar1', null, { timeout: 20000 });
  await charla();
}, 'c2.ronda');
check((await nivel()) === 1, 'tras las cañas la noche no está en el nivel 1');
await shot('bar1');

await paso('Chuchi mira la tragaperras', async () => {
  await como('chuchi');
  await tocarZona('tragaperras');
}, 'c2.diagnostico');
await paso('Guille la separa de la pared', async () => {
  await como('guille');
  await tocarZona('tragaperras');
}, 'c2.separada');
await shot('separada');
await paso('Coger el duro', () => tocarZona('tragaperras'));
check(await page.evaluate(() => window.__cyc.g.tiene('duro')), 'no se coge el duro');
await paso('El duro no entra todavía', () => conObjeto('duro', 'tragaperras'), 'c2.duroProbado');
check(!(await flag('c2.tirada')), 'la máquina se traga el duro antes de los fresquitos');

await paso('Pablo y los fresquitos (dos frases malas y la buena)', async () => {
  await como('pablo');
  await tocarActor('vero');
  for (const i of [0, 1, 2]) {
    await page.waitForSelector('.opciones-dialogo .opcion-dialogo', { timeout: 20000 });
    if (i === 0) await shot('opciones');
    await wait(600);
    await page.click(`.opciones-dialogo .opcion-dialogo:nth-child(${i + 1})`);
    await wait(200);
    await charla();
  }
  await page.waitForFunction(() => window.__cyc.g.escena === 'bar2', null, { timeout: 20000 });
  await charla();
}, 'c2.fresquitos');
check((await nivel()) === 2, 'tras los fresquitos la noche no está en el nivel 2');
await shot('bar2');

await paso('El duro, la tirada, el canto y el premio', async () => {
  // The duro is in the pocket of whoever picked it up.
  await como(await page.evaluate(() => window.__cyc.g.estado.jugables.find((id) => window.__cyc.g.tiene('duro', id))));
  await conObjeto('duro', 'tragaperras');
  await tragaperras('tirada');
  await saltarMinijuego('.cubierta.minijuego.canto', 'canto');
  await tragaperras('premio');
  await page.waitForFunction(() => window.__cyc.g.escena === 'bar3', null, { timeout: 20000 });
  await charla();
}, 'c2.premio');
check((await nivel()) === 3, 'tras el premio la noche no está en el nivel 3');

await paso('Fran cierra los ojos: el Pang', async () => {
  await page.waitForSelector('.cubierta.minijuego.pang', { timeout: 30000 });
  await wait(1200);
  await shot('pang-espuma');
  await wait(4000);
  await shot('pang');
  await page.click('.cubierta.minijuego.pang .cerrar');
  await page.waitForSelector('.cubierta.minijuego.pang', { state: 'detached', timeout: 10000 });
  await page.waitForSelector('.dialogo', { timeout: 10000 }).catch(() => {});
  await wait(800);
  await shot('bar3');
  await charla();
}, 'c2.pang');
await paso('Continuará', async () => {
  // «Continuará…» goes with a tap; then the end card.
  for (let i = 0; i < 60 && !(await page.$('#fin-seguir')); i++) {
    if (await page.$('.cubierta.rotulo')) await page.touchscreen.tap(420, 200);
    await wait(1000);
  }
  check(await page.$('#fin-seguir'), 'no sale la tarjeta del final');
  await wait(600);
  await shot('fin');
});

await browser.close();
if (errors.length) {
  console.log('\nFALLOS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('\nCapítulo 2 sin fallos.');
