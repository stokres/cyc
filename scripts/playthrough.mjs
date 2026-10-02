// Plays the pilot from start to finish on a phone-sized viewport, like a player:
// choose Fran, wake him, switch to Pablo halfway and finish his (placeholder)
// story, go back to Fran, solve the flat puzzle and walk towards the Bar del Río,
// then finish Chuchi's and Guille's, and watch the four arrive together.
// Fails on any console error or if a step does not do what it should.
// Usage: node scripts/playthrough.mjs [url] [outDir]   (add ?relieve to the url to play it with relief light)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [url = 'http://localhost:5173/', out = 'revisiones/partida'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
// Software WebGL, so the relief renderer can run too (url ending in ?relieve).
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.stack || String(e)));
page.on('console', (m) => m.type() === 'error' && !m.text().includes('Failed to load resource') && errors.push(m.text()));
await page.addInitScript(() => localStorage.clear());
await page.goto(url);
await page.waitForFunction(() => window.__cyc, null, { timeout: 30000 });
await page.evaluate(() => window.__cyc.listo());
console.log('render:', await page.evaluate(() => window.__cyc.g.motor.modo));

let n = 0;
const shot = (name) => page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);
const flag = (k) => page.evaluate((k) => !!window.__cyc.g.estado.flags[k], k);
function check(ok, msg) {
  if (!ok) errors.push('PASO FALLIDO: ' + msg);
}

/** Tap through dialogue until the running script ends. */
async function charla() {
  let last = '';
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > 60000) {
      errors.push('charla: atascado');
      return;
    }
    await wait(120);
    const s = await page.evaluate(() => ({ busy: window.__cyc.g.ocupadoAhora, d: document.querySelector('.dialogo')?.innerText ?? null, over: !!document.querySelector('.cubierta.movil, .cubierta.minijuego, .cubierta.rotulo, .cubierta.eleccion, .cubierta.titulo') }));
    if (s.over) return;
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

async function zonaCss(id) {
  return page.evaluate((id) => {
    const g = window.__cyc.g;
    const r = g.motor.zonaRect(g.zona(id));
    return [((r.x + r.w / 2) / g.motor.vw) * g.motor.cssW, ((r.y + r.h / 2) / 1080) * g.motor.cssH];
  }, id);
}

async function actorCss(id) {
  await camaraQuieta();
  return page.evaluate((id) => {
    const g = window.__cyc.g;
    const a = id === 'aceituna' ? g.perro : g.pjs.get(id);
    const k = g.motor.f(a.y);
    const h = (id === 'aceituna' ? 50 : 150) * g.motor.escala(k);
    return [(g.motor.screenX(a.X, k) / g.motor.vw) * g.motor.cssW, ((a.y - h) / 1080) * g.motor.cssH];
  }, id);
}

/** Walk until a zone is on screen (as a player would), then return its centre. */
const camaraQuieta = () => page.waitForFunction(() => Math.abs(window.__cyc.g.motor.cam - window.__cyc.g.motor.camGoal) < 3, null, { timeout: 20000 });

async function verZona(id) {
  for (let i = 0; i < 30; i++) {
    await camaraQuieta();
    const [x, y] = await zonaCss(id);
    if (x > 60 && x < 800) return [x, y];
    await page.touchscreen.tap(x < 90 ? 110 : 690, 355);
    await wait(300);
    await charla();
    await page.waitForFunction(() => !window.__cyc.g.activo.moving, null, { timeout: 20000 });
  }
  errors.push(`no llego a ver la zona ${id}`);
  return zonaCss(id);
}

async function tocar([x, y]) {
  await page.touchscreen.tap(x, y);
  await wait(150);
  await charla();
}

async function mantener([x, y]) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await wait(700);
  await page.mouse.up();
  await wait(150);
  await charla();
}

async function objeto(id) {
  await page.click('.bolsa button');
  await wait(250);
  await page.click(`.bandeja .usar[data-id="${id}"]`);
  await wait(200);
}

/** Circle a finger around the jar lid. */
async function girar(vueltas) {
  await page.waitForSelector('.zona-giro');
  const b = await (await page.$('.zona-giro')).boundingBox();
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height * 0.46;
  const r = b.width * 0.3;
  await page.mouse.move(cx + r, cy);
  await page.mouse.down();
  for (let a = 0; a <= vueltas * 360; a += 12) {
    if (!(await page.$('.zona-giro'))) break;
    await page.mouse.move(cx + Math.cos((a * Math.PI) / 180) * r, cy + Math.sin((a * Math.PI) / 180) * r);
  }
  await page.mouse.up();
  await wait(700);
  await charla();
}

/** Pick a protagonist on the start screen (or the one between stories). */
async function escoger(id) {
  await page.waitForSelector('.cubierta.eleccion');
  await wait(300);
  await page.click(`.eleccion-pj[data-id="${id}"]`);
  await wait(300);
  await page.waitForFunction(() => !document.querySelector('.velo.on'), null, { timeout: 30000 });
  await charla();
}

/** End of a story: the title card over the fade. */
async function rotulo(id) {
  await page.waitForSelector('.cubierta.rotulo', { timeout: 30000 });
  await shot(`camino-${id}`);
  const ok = await page.evaluate((id) => window.__cyc.g.estado.llegados.includes(id), id);
  check(ok, `${id} no va de camino`);
  await wait(700);
  await page.click('.cubierta.rotulo');
  await wait(300);
}

/** A placeholder story: the object, then the way out. */
async function provisional(id) {
  await shot(id);
  await paso(`${id}: la cosa de su historia`, async () => tocar(await verZona('cosa')), `cosa.${id}`);
  await paso(`${id}: salir hacia el Río`, async () => tocar(await verZona('salida')));
  await rotulo(id);
}

async function paso(nombre, fn, comprobar) {
  console.log(`· ${nombre}`);
  await fn();
  if (comprobar) check(await flag(comprobar), `${nombre} (falta ${comprobar})`);
}

// ---------------------------------------------------------------- the pilot
await shot('titulo');
await page.touchscreen.tap(420, 200);
await page.waitForSelector('.cubierta.eleccion');
await wait(400);
await shot('eleccion');
await escoger('fran');
await shot('dormido');
await paso('Despertar a Fran', () => tocar([420, 200]), 'despierto');
await shot('despierto');
await paso('Cambiar a Pablo desde el selector', async () => {
  await page.click('.reparto .pj:nth-child(2)');
  await wait(300);
  await page.waitForFunction(() => window.__cyc.g.escena === 'casaPablo' && !document.querySelector('.velo.on'), null, { timeout: 30000 });
  await charla();
}, 'empezado.pablo');
await provisional('pablo');
await paso('Volver con Fran, donde lo dejamos', async () => {
  await escoger('fran');
  const ok = await page.evaluate(() => window.__cyc.g.escena === 'piso' && window.__cyc.g.estado.activo === 'fran');
  check(ok, 'no vuelve al piso de Fran');
}, 'despierto');
await paso('Mirar el reloj (mantener pulsado)', async () => mantener(await verZona('reloj')), 'horaVista');
await paso('Coger el móvil y leer el grupo', async () => {
  await tocar(await verZona('movil'));
  await page.waitForSelector('.cubierta.movil');
  await wait(4500);
  await shot('movil');
  await page.click('.telefono .cerrar');
  await wait(200);
  await charla();
}, 'chatLeido');
await paso('Probar la puerta', async () => tocar(await verZona('puerta')), 'puertaProbada');
await shot('puerta');
await paso('Mirar el cuenco de las llaves', async () => tocar(await verZona('llavero')), 'llaveroVisto');
await paso('Mirar a Aceituna', async () => mantener(await actorCss('aceituna')), 'aceitunaVista');
await paso('Pedirle las llaves', async () => tocar(await actorCss('aceituna')));
await paso('Sacar el tarro de la nevera', async () => tocar(await verZona('nevera')), 'tarro');
await paso('Intentar abrirlo en frío', async () => {
  await objeto('tarro');
  await page.touchscreen.tap(...(await actorCss('fran')));
  await wait(400);
  await shot('tarro');
  await girar(1);
}, 'tarroIntentado');
await paso('Calentarlo en el grifo', async () => {
  await objeto('tarro');
  await tocar(await verZona('grifo'));
}, 'tarroCaliente');
await paso('Abrirlo caliente', async () => {
  await objeto('tarroCaliente');
  await page.touchscreen.tap(...(await actorCss('fran')));
  await wait(400);
  await girar(2);
  await shot('aceitunas');
  await charla();
}, 'aceitunasComidas');
await paso('Coger las llaves de la cama', async () => tocar(await verZona('llaves')), 'llaves');
await paso('Intentar salir en calzoncillos', async () => tocar(await verZona('puerta')));
await paso('Coger la ropa de la terraza', async () => tocar(await verZona('terraza')), 'ropaCogida');
await paso('Vestirse', async () => {
  await objeto('ropa');
  await tocar(await actorCss('fran'));
}, 'vestido');
await shot('vestido');
await paso('Salir a la calle', async () => {
  await objeto('llaves');
  await tocar(await verZona('puerta'));
  await page.waitForFunction(() => window.__cyc.g.escena === 'calle' && !document.querySelector('.velo.on'), null, { timeout: 30000 });
  await wait(300);
  await charla();
}, 'enCalle');
await shot('calle');
await paso('Andar hacia el Bar del Río', async () => {
  for (let i = 0; i < 60; i++) {
    if (await page.$('.cubierta.rotulo')) break;
    await page.touchscreen.tap(690, 355);
    await charla();
    await wait(900);
    if (i === 10) await shot('parque');
    if (i === 20) await shot('cruce');
  }
}, 'bar');
const fran = await page.evaluate(() => ({ hora: window.__cyc.g.hora, inv: window.__cyc.g.estado.inv.fran }));
console.log(`  Fran ve el Río a las ${fran.hora}. Bolsa: ${fran.inv.join(', ')}`);
await rotulo('fran');
await escoger('chuchi');
await provisional('chuchi');
await escoger('guille');
await provisional('guille');
await paso('Los cuatro llegan a la vez', async () => {
  await page.waitForFunction(() => window.__cyc.g.escena === 'calle' && !document.querySelector('.velo.on'), null, { timeout: 30000 });
  // The narrator, then the four walk in together and Fran speaks first.
  await page.waitForSelector('.dialogo.narrador', { timeout: 30000 });
  await wait(300);
  await page.touchscreen.tap(420, 150);
  await wait(150);
  await page.touchscreen.tap(420, 150);
  await page.waitForSelector('.dialogo:not(.narrador)', { timeout: 30000 });
  await wait(600);
  await shot('llegan');
  await charla();
  await page.waitForSelector('.cubierta.titulo', { timeout: 30000 });
  const e = await page.evaluate(() => ({ final: window.__cyc.g.estado.final, aqui: Object.values(window.__cyc.g.estado.donde).filter((d) => d.escena === 'calle').length, hora: window.__cyc.g.hora }));
  check(e.final && e.aqui === 4, 'la escena final no tiene a los cuatro');
  console.log(`  Llegan los cuatro a las ${e.hora}`);
  await shot('fin');
});

await browser.close();
if (errors.length) {
  console.log('ERRORES:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Sin errores de consola');
