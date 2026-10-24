// Plays the start of chapter 2 once, from the Brío's door to «Continuará…» (docs/CAPITULO2.md), on a
// phone-sized viewport and by touch, like a player: the round (the beers minigame, skipped after two
// misses), the slot machine (Chuchi, Guille), the duro, the fresquitos (Pablo's two wrong lines first),
// the spin, the chant (skipped) and the Pang (closed with ×). Then the rest of the night (first part): Fran wakes in
// the long bar (bar4) and tells the dragon, the slot machine spins alone and stops on Pablo's face, the bar turns
// upside down (bar5), the narrator takes over, the picture is squeezed into the console of Alacant Sun (which is
// skipped, closed with window.__sol().cerrar()) and Pablo opens his eyes. Then the last stretch: Chuchi's boss and «una
// más» (manga), the slot machine on his face, the floor turning into Impropios Kart (skipped, closed with
// window.__kart().cerrar()), Vero growing and swallowing Fran (the mouth), the world of the concepts (taps: three jokes,
// Fran as «Una más», «LA ÚLTIMA») and the total chaos up to «Continuará…». Screenshots of each level of the night.
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
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` });
  // The manga shots also go where Jesús looks at them (MANGA_OUT=/mnt/project-files/capitulo2/anime).
  if (name.startsWith('manga-en-juego') && process.env.MANGA_OUT) await page.screenshot({ path: `${process.env.MANGA_OUT}/${name}.png` });
  // And the ones of the last stretch (FINAL_OUT=/mnt/project-files/capitulo2/final).
  if (name.startsWith('final-') && process.env.FINAL_OUT) await page.screenshot({ path: `${process.env.FINAL_OUT}/${name}.png` });
};
const wait = (ms) => page.waitForTimeout(ms);
const flag = (k) => page.evaluate((k) => !!window.__cyc.g.estado.flags[k], k);
const check = (ok, msg) => ok || errors.push('PASO FALLIDO: ' + msg);

/** Screenshots to take when a line of the dialogue shows (a piece of its text, the name of the file): the camera has time to land. */
const fotos = [];
const fotoAl = (trozo, nombre, manga, espera = 900, sinCortes = false) => fotos.push([trozo, nombre, manga, espera, sinCortes]);
const mangaActivo = () => page.evaluate(() => window.__cyc.g.plano.manga.activo);

/** Tap through dialogue until the running script ends, or a choice or a full-screen piece comes up. */
async function charla() {
  let last = '';
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > 150000) return void errors.push('charla: atascado');
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
      if (t !== last) {
        console.log('   »', t);
        const i = fotos.findIndex(([trozo]) => t.includes(trozo));
        if (i >= 0) {
          const [, nombre, manga, espera, sinCortes] = fotos[i];
          await wait(espera);
          // The manga shots: on screen (and the hud away) in the lines that have one, gone in the ones that do not.
          if (manga !== undefined) check((await mangaActivo()) === manga, `${nombre}: el plano manga ${manga ? 'no sale' : 'no se va'}`);
          // The cuts of the chaos change every few frames: for a clean picture of the world, they are hidden for a moment.
          const velo = sinCortes ? await page.addStyleTag({ content: '.corte-estilo { display: none !important; }' }) : null;
          if (velo) await wait(150);
          await shot(nombre);
          await velo?.evaluate((e) => e.remove());
          fotos.splice(i, 1);
        }
      }
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

// The manga shots of the night (src/textos/capitulo2.md, «@manga»): one picture of each, and the 'solo' one goes away.
fotoAl('Esto no paga en monedas', 'manga-en-juego-1-premio', true);
fotoAl('Oye, mi niño', 'noche-premio-sin-manga', false);
fotoAl('has cerrado los ojos hace un minuto', 'manga-en-juego-2-chuchi-un-minuto', true);
fotoAl('Dos minutos de dragón', 'manga-en-juego-3-fran-dragon', true);
fotoAl('No me creéis', 'manga-en-juego-4-fran-triste', true);
fotoAl('Esa cara', 'manga-en-juego-5-ojos-de-pablo', true);
fotoAl('Os habéis puesto a soñar', 'manga-en-juego-6-sombra', true);
fotoAl('Esta historia la acabo yo', 'manga-en-juego-7-sombra-ojos', true);
fotoAl('La vida es sueño', 'manga-en-juego-8-pablo-despierta', true);
fotoAl('La pantalla se marea', 'noche-sin-manga', false);

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

fotoAl('Yo te creo lo del cerdo', 'noche-chuchi-cerdo-inclinado');
fotoAl('¿Por qué la barra no se acaba', 'noche-bar4-contrapicado');
fotoAl('Los taburetes están en el techo', 'noche-bar5-reves');
fotoAl('Qué escena tan bonita', 'noche-narrador');
fotoAl('seguimos del revés', 'noche-bar5-cierre');

await paso('Fran cierra los ojos: el Pang', async () => {
  await page.waitForSelector('.cubierta.minijuego.pang', { timeout: 30000 });
  await wait(1200);
  await shot('pang-espuma');
  await wait(4000);
  await shot('pang');
  await page.click('.cubierta.minijuego.pang .cerrar');
  await page.waitForSelector('.cubierta.minijuego.pang', { state: 'detached', timeout: 10000 });
  await page.waitForFunction(() => window.__cyc.g.escena === 'bar4', null, { timeout: 40000 });
  await charla();
}, 'c2.pang');
check((await nivel()) === 4, 'tras el Pang la noche no está en el nivel 4');
await shot('bar4');

await paso('La tragaperras gira sola y para en la cara de Pablo', async () => {
  await page.waitForSelector('.cubierta.tragaperras', { timeout: 40000 });
  // The face lands with the last reel (2.4 s) and the machine dies at 3.1 s.
  await wait(2750);
  await shot('noche-maquina-cara-pablo');
  await wait(900);
  await shot('noche-maquina-apagada');
  await page.waitForSelector('.cubierta.tragaperras', { state: 'detached', timeout: 10000 });
  await charla();
  await page.waitForFunction(() => window.__cyc.g.escena === 'bar5', null, { timeout: 40000 });
  await charla();
});
check((await nivel()) === 5, 'tras la tragaperras la noche no está en el nivel 5');
await shot('bar5');

// The lines of the last stretch run on in the same dialogue as Pablo's eyes: their shots are asked for before that.
fotoAl('Calderón lo dijo con más gracia', 'bar5-final');
fotoAl('Es el jefe', 'final-1-chuchi-jefe', false);
fotoAl('¡UNA MÁS!', 'final-2-chuchi-manga-fran', true, 1400);
fotoAl('Una más, Chuchi', 'final-2b-manga-ojos', true, 1400);
fotoAl('el correo es lo único', 'final-2c-chuchi-fran', true, 1400);
fotoAl('Ahora me persiguen', 'final-4-tras-la-maquina', false);
fotoAl('con la copa en la mano', 'final-5-chuchi-con-la-copa', false);
fotoAl('Es un buen tamaño', 'final-6-vero-crece', false);
fotoAl('Esta vez la quiero yo', 'final-6b-vero-manga', true, 1400);
fotoAl('¿Eso es una boca?', 'final-7-boca-de-vero', false, 1500);
fotoAl('SE LO HA TRAGADO', 'final-8-fran-ya-dentro', false);
fotoAl('Y al entrar, se deshicieron', 'final-8b-se-deshacen', false);
fotoAl('Esto no es el Brío', 'final-9-mundo-conceptos', false, 1600);
await paso('El narrador, la consola y Alacant Sun', async () => {
  // The pixelated shrink: a few pictures on the way, then the console.
  await page.waitForSelector('.pixelado', { timeout: 60000 });
  await wait(250);
  await shot('noche-consola-pixeles');
  await wait(650);
  await shot('noche-consola-encoge');
  await page.waitForSelector('.sol-capa', { timeout: 20000 });
  await page.waitForSelector('.pixelado', { state: 'detached', timeout: 20000 });
  await wait(1500);
  await shot('noche-consola-sol');
  check(await page.evaluate(() => !!window.__sol), 'Alacant Sun no arranca');
  // Alacant Sun is not played here: closed from the hook, the story goes on.
  await page.evaluate(() => window.__sol().cerrar());
  await page.waitForSelector('.sol-capa', { state: 'detached', timeout: 10000 });
  await charla();
});
await paso('Pablo abre los ojos', async () => {
  await wait(500);
  await charla();
});
check(!(await page.$('.pixelado')), 'se queda la capa del pixelado');

await paso('Chuchi, el jefe y «una más»: la tragaperras con su cara', async () => {
  await tragaperras('final-3-tragaperras-chuchi');
  check(await page.evaluate(() => window.__cyc.g.escena === 'bar5'), 'la escena no es el bar del revés tras la tragaperras de Chuchi');
});
await paso('El suelo se estira y se convierte en la pista: Impropios Kart', async () => {
  // The transition is shot while the dialogue runs on its own (the tilted floor is on screen a second after it starts).
  const transicion = page.waitForSelector('.entrada-pista', { timeout: 120000 }).then(async () => {
    await wait(1000);
    await shot('final-4b-suelo-en-perspectiva');
  });
  await charla();
  await transicion;
  await page.waitForSelector('.cubierta.minijuego.kart', { timeout: 60000 });
  await wait(2500);
  check(await page.evaluate(() => !!window.__kart), 'el Kart no arranca');
  // The Kart is not played here: closed from the hook, the story goes on.
  await page.evaluate(() => window.__kart().cerrar());
  await page.waitForSelector('.cubierta.minijuego.kart', { state: 'detached', timeout: 10000 });
  await wait(600);
});
await paso('Chuchi vuelve con la copa, Vero crece y se traga a Fran (la boca)', async () => {
  await charla();
  await page.waitForFunction(() => window.__cyc.g.escena === 'conceptos', null, { timeout: 60000 });
  await wait(800);
});
check((await nivel()) === 7, 'en el mundo de los conceptos la noche no está en el nivel 7');
check(!(await page.$('.capa-boca')), 'se queda la capa de la boca');

// The world of the concepts: touched by position, because everything floats and the zones follow it (zonaCss reads them live).
fotoAl('Un NO enorme rebota', 'final-10-concepto-no', false, 700);
fotoAl('¿Habéis oído esa jarra', 'final-10b-pista-de-la-jarra', false);
fotoAl('¡Es Fran!', 'final-11-fran-una-mas', false, 1200);
fotoAl('aparece el contorno de una jarra', 'final-12-la-ultima-aparece', false, 1500);
fotoAl('Me veo en dibujitos', 'final-13-caos-cortes-1', false, 1400);
fotoAl('Yo en píxeles', 'final-14-caos-cortes-2', false, 1100);
fotoAl('Es el userito', 'final-15-dinosaurio', false, 4200, true);
fotoAl('Este es mío', 'final-16-guille-flor-y-jarra', false, 1300);

const tocarConcepto = async (id) => tocar(await zonaCss(id));
await paso('Tocar tres conceptos (los chistes) y que alguien señale la jarra', async () => {
  await shot('final-9b-mundo-conceptos');
  for (const id of ['no', 'casa', 'reloj']) await tocarConcepto(id);
});
check(await flag('c2.con.pista'), 'tras tres conceptos nadie señala la jarra');
await paso('Fran es la jarra de «una más»', async () => {
  await tocarConcepto('fran');
}, 'c2.fran.hallado');
await paso('LA ÚLTIMA: el caos total', async () => {
  await tocarConcepto('ultima');
  await page.waitForSelector('.cubierta.rotulo', { timeout: 120000 });
});
check((await nivel()) === 8, 'tras pedir la última la noche no está en el nivel 8');

await paso('Continuará', async () => {
  await wait(300);
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
