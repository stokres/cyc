// Plays the pilot from start to finish on a phone-sized viewport, like a player:
// choose Fran, wake him, switch to Pablo halfway and finish his story (the
// script, the scissors, the follow spot and the word battle with his shadow), go back to Fran, solve the flat puzzle and walk towards the Bar del Río,
// then Chuchi's placeholder and Guille's farm (batteries, rosemary and alcohol
// picked up early, the pig tower, the homemade cologne), and watch the four
// arrive together.
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

/** Walk until a character is on screen, then return where to touch them. */
async function verActor(id) {
  for (let i = 0; i < 30; i++) {
    const [x, y] = await actorCss(id);
    if (x > 60 && x < 800) return [x, y];
    await page.touchscreen.tap(x < 90 ? 110 : 690, 355);
    await wait(300);
    await charla();
    await page.waitForFunction(() => !window.__cyc.g.activo.moving, null, { timeout: 20000 });
  }
  errors.push(`no llego a ver a ${id}`);
  return actorCss(id);
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

/**
 * Fran's ham toss: wait for a calm moment, find a pull whose path meets the
 * mouth where it will be (and open) when the ham gets there, and drag it.
 * Returns how many throws it took.
 */
async function lanzarJamon() {
  await page.waitForSelector('.cubierta.rana');
  let tiros = 0;
  let foto = false;
  for (let i = 0; i < 3000 && (await page.$('.cubierta.rana')); i++) {
    const listo = await page.evaluate(() => { const e = window.__rana?.(); return !!e && e.listo && !e.vuela; });
    if (!listo) {
      await wait(80);
      continue;
    }
    const tiro = await page.evaluate(() => {
      const e = window.__rana();
      const RETRASO = 0.09; // from here to letting go
      const Lmax = 300 * e.escala;
      let mejor = null;
      for (let L = Lmax * 0.3; L <= Lmax; L += Lmax / 120) {
        for (let a = 0; a <= 80; a += 1) {
          const r = (a * Math.PI) / 180;
          const px = -L * Math.cos(r);
          const py = L * Math.sin(r);
          for (const p of e.prever(px, py).puntos) {
            const B = e.bocaEn(p.t + RETRASO);
            const d = Math.hypot(p.x - B.x, p.y - B.y);
            if (B.abierta && d < e.boca.r * 0.5 && (!mejor || d < mejor.d)) mejor = { d, px, py };
          }
        }
      }
      return mejor;
    });
    if (!tiro) {
      await wait(80);
      continue;
    }
    await page.mouse.move(500, 150);
    await page.mouse.down();
    await page.mouse.move(500 + tiro.px, 150 + tiro.py, { steps: 2 });
    if (!foto) {
      foto = true;
      await shot('rana');
    }
    await page.mouse.up();
    tiros++;
    await page.waitForFunction(() => !window.__rana?.()?.vuela, null, { timeout: 8000 }).catch(() => {});
  }
  await page.waitForSelector('.cubierta.rana', { state: 'detached', timeout: 30000 });
  return tiros;
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
/** Chuchi's ball cannon: lead the button by the flight time, and wait for the party hat to go up. */
async function dispararRobot() {
  await page.waitForSelector('.cubierta.robot');
  let tiros = 0;
  let foto = false;
  for (let i = 0; i < 2000 && (await page.$('.cubierta.robot')); i++) {
    const p = await page.evaluate(() => {
      const e = window.__robot?.();
      if (!e || !e.listo) return null;
      const B = e.boton(e.vuelo + 0.06);
      return B.cubierto ? null : B;
    });
    if (!p) {
      await wait(50);
      continue;
    }
    await page.mouse.click(p.x, p.y);
    tiros++;
    if (!foto && tiros === 3) {
      foto = true;
      await wait(250);
      await shot('robot');
    }
    await wait(320);
  }
  await page.waitForSelector('.cubierta.robot', { state: 'detached', timeout: 30000 });
  return tiros;
}

async function historiaChuchi() {
  await shot('parque');
  for (let i = 1; i <= 3; i++) await paso(`Chuchi: rebuscar en la piscina de bolas (${i})`, async () => tocar(await verZona('piscina')));
  check(await flag('c.gafas'), 'Chuchi no encuentra las gafas');
  await shot('parque-gafas');
  await paso('Chuchi: la puerta del personal, cerrada', async () => tocar(await verZona('puertaPersonal')), 'c.puertaProbada');
  await paso('Chuchi: la llave, en un gancho muy alto', async () => tocar(await verZona('gancho')), 'c.ganchoVisto');
  await paso('Chuchi: la red de las bolas', async () => tocar(await verZona('red')), 'c.red');
  await paso('Chuchi: el palo de la piñata', async () => tocar(await verZona('palo')), 'c.palo');
  await paso('Chuchi: empalmar la red y el palo', async () => {
    await combinar('red', 'palo');
    check(await page.evaluate(() => window.__cyc.g.tiene('redLarga')), 'no sale la red larguísima');
  });
  await paso('Chuchi: pescar la llave', () => usarEn('redLarga', 'gancho'), 'c.llave');
  await paso('Chuchi: abrir el cuarto del personal', () => usarEn('llave', 'puertaPersonal'), 'c.cuarto');
  await paso('Chuchi: dar la luz (y despertar a Robi)', async () => tocar(await verZona('puertaPersonal')), 'c.robot');
  await shot('parque-luz');
  await paso('Chuchi: el cañón de bolas contra Robi', async () => {
    await tocar(await verZona('canon'));
    await charla();
    const tiros = await dispararRobot();
    console.log(`   » Robi apagado en ${tiros} tiros`);
    await charla();
  }, 'c.vencido');
  await paso('Chuchi: el zapato de brilli-brilli', async () => tocar(await verZona('zapato')), 'c.zapato');
  await shot('parque-zapato');
  await paso('Chuchi: por la salida, al Río', async () => tocar(await verZona('persiana')));
  await rotulo('chuchi');
}

/** Two items put together: choose one, open the bag again and tap the other. */
async function combinar(a, b) {
  await objeto(a);
  await page.click('.bolsa button');
  await wait(250);
  await page.click(`.bandeja .usar[data-id="${b}"]`);
  await wait(200);
  await charla();
}

/** The pig tower: drop each pig when it would land on the centre of the one below. */
async function apilarCerdos() {
  await page.waitForSelector('.cubierta.cerdos');
  await wait(800);
  let foto = false;
  for (let i = 0; i < 400 && (await page.$('.cubierta.cerdos')); i++) {
    const r = await page.evaluate(() => new Promise((res) => {
      const t0 = performance.now();
      const mira = () => {
        const e = window.__cerdos?.();
        if (!e) return res('fin');
        if (e.colgando && Math.abs(e.prediccion - e.objetivo) < 5) {
          document.querySelector('.lienzo-cerdos').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          return res(e.colocados);
        }
        if (performance.now() - t0 > 4000) return res('espera');
        requestAnimationFrame(mira);
      };
      mira();
    }));
    if (r === 'fin') break;
    if (r === 5 && !foto) {
      foto = true;
      await wait(500);
      await shot('cerdos');
    }
    await wait(250);
  }
  await page.waitForSelector('.cubierta.cerdos', { state: 'detached', timeout: 20000 });
  await charla();
}

/** Walk until a zone is in view, then choose an item and use it there. */
async function usarEn(item, zona) {
  const p = await verZona(zona);
  await objeto(item);
  await tocar(p);
}

/** The word battle: swipe across each negative word as it falls, never the positive ones. */
async function cortarPalabras() {
  await page.waitForSelector('.cubierta.palabras');
  let foto = false;
  for (let i = 0; i < 2000 && (await page.$('.cubierta.palabras')); i++) {
    const e = await page.evaluate(() => window.__palabras?.() ?? null);
    if (!e) break;
    const blanco = e.palabras.find((p) => p.negativa && !p.cortada && p.y > 70 && p.y < 330);
    if (blanco) {
      // A swipe through the word, short enough not to touch the others.
      const y = blanco.y;
      // Words fall tilted: compare their tilted boxes' real height.
      const alto = (p) => Math.abs((p.w / 2) * Math.sin(p.rot)) + Math.abs((p.h / 2) * Math.cos(p.rot));
      const otras = e.palabras.filter((p) => !p.negativa && !p.cortada && Math.abs(p.y - y) < alto(p) + 8);
      const x0 = blanco.x - blanco.w / 2 - 6;
      const x1 = blanco.x + blanco.w / 2 + 6;
      if (!otras.some((p) => p.x + p.w / 2 > x0 && p.x - p.w / 2 < x1)) {
        await page.mouse.move(x0, y);
        await page.mouse.down();
        await page.mouse.move(x1, y, { steps: 4 });
        await page.mouse.up();
      }
      if (!foto && e.fase === 3) {
        foto = true;
        await shot('palabras');
      }
    }
    await wait(60);
  }
  await page.waitForSelector('.cubierta.palabras', { state: 'detached', timeout: 30000 });
  await charla();
}

async function historiaPablo() {
  await shot('backstage');
  await paso('Pablo: hablar con su sombra', async () => {
    const [x, y] = await page.evaluate(() => {
      const g = window.__cyc.g;
      const s = g.sombra;
      const k = g.motor.f(s.y);
      return [(g.motor.screenX(s.X, k) / g.motor.vw) * g.motor.cssW, ((s.y - 150 * g.motor.escala(k)) / 1080) * g.motor.cssH];
    });
    await tocar([x, y]);
  });
  await paso('Pablo: el libreto del baúl', async () => tocar(await verZona('baul')), 'p.libreto');
  await paso('Pablo: las tijeras de vestuario', async () => tocar(await verZona('tijeras')), 'p.tijeras');
  await paso('Pablo: cortar el libreto en hojas', async () => {
    await combinar('libreto', 'tijeras');
    check(await page.evaluate(() => window.__cyc.g.tiene('hojas')), 'no salen las hojas');
  });
  await paso('Pablo: hojas a la máquina', () => usarEn('hojas', 'maquina'), 'p.bloqueado');
  await paso('Pablo: el cuadro de luces y la batalla con el narrador', async () => {
    await page.touchscreen.tap(...(await verZona('cuadro')));
    await charla();
    await cortarPalabras();
  }, 'p.ganado');
  await shot('pablo-gana');
  // After the battle the shadow leaves the scene: only its voice stays, in the dialogues.
  check(await page.evaluate(() => window.__cyc.g.sombra === null), 'la sombra sigue en escena tras la batalla');
  await paso('Pablo: la máquina, ya con el narrador a favor', async () => tocar(await verZona('maquina')));
  await paso('Pablo: por la puerta de artistas', async () => tocar(await verZona('puertaArtistas')));
  await rotulo('pablo');
}

async function historiaGuille() {
  await shot('granja');
  await paso('Guille: la báscula no tiene pilas', async () => tocar(await verZona('bascula')), 'g.basculaVista');
  await paso('Guille: las pilas de la radio', async () => tocar(await verZona('radio')), 'g.pilas');
  // Anything that can be picked up can be picked up any time (docs/JUGABILIDAD.md):
  // the rosemary and the alcohol, and put together, before he even smells.
  await paso('Guille: romero, antes de saber para qué', async () => tocar(await verZona('romero')), 'g.romero');
  await paso('Guille: alcohol del botiquín', async () => tocar(await verZona('botiquin')), 'g.alcohol');
  await paso('Guille: juntar alcohol y romero', async () => {
    await combinar('alcohol', 'romero');
    check(await page.evaluate(() => window.__cyc.g.tiene('alcoholRomero')), 'no sale el alcohol de romero');
  });
  await paso('Guille: pilas en la báscula', () => usarEn('pilas', 'bascula'), 'basculaLista');
  await paso('Guille: apilar los ocho cerdos', async () => {
    await page.touchscreen.tap(...(await verZona('bascula')));
    await charla();
    await apilarCerdos();
    const kg = await page.evaluate(() => window.__cyc.g.flag('g.pesados'));
    check(kg, 'los cerdos no quedan pesados');
  }, 'g.olor');
  await shot('moscas');
  await paso('Guille: agua de la manguera', () => usarEn('alcoholRomero', 'manguera'), 'g.colonia');
  await paso('Guille: echarse la colonia', async () => {
    await objeto('colonia');
    await tocar(await actorCss('guille'));
  }, 'g.limpio');
  await paso('Guille: al coche', async () => tocar(await verZona('coche')));
  await rotulo('guille');
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
  await page.waitForFunction(() => window.__cyc.g.escena === 'backstage' && !document.querySelector('.velo.on'), null, { timeout: 30000 });
  await charla();
}, 'empezado.pablo');
await historiaPablo();
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
await paso('Sacar el jamón de la nevera', async () => tocar(await verZona('nevera')), 'jamon');
await paso('Probar un taquito (usarlo con Fran)', async () => {
  await objeto('jamon');
  await tocar(await actorCss('fran'));
});
await paso('Lanzarle el jamón a Aceituna: la rana', async () => {
  const perra = await verActor('aceituna');
  await objeto('jamon');
  await page.touchscreen.tap(...perra);
  await charla();
  const tiros = await lanzarJamon();
  console.log(`   » ocho a la boca en ${tiros} tiros`);
  check(tiros > 0 && tiros <= 24, `la rana no se gana con tiros buenos (${tiros})`);
  await charla();
  await shot('aceituna-levantada');
}, 'jamonComido');
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
await historiaChuchi();
await escoger('guille');
await historiaGuille();
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
  // Talking about Vero, in through the door, fade to black and the narrator.
  for (let i = 0; i < 40 && !(await page.$('.cubierta.rotulo.continuara')); i++) {
    await charla();
    if (i === 3) await shot('entran');
    await wait(400);
  }
  await page.waitForSelector('.cubierta.rotulo.continuara', { timeout: 30000 });
  await wait(2800);
  await shot('continuara');
  await page.click('.cubierta.rotulo.continuara');
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
