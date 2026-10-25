// Performance check, to run before every commit that touches drawing (docs/ESTILO.md, T5).
//
// Plays each scene on a Pixel-sized landscape screen with software WebGL
// (SwiftShader, so the "GPU" shows up as CPU) and measures the CPU used by all of
// Chromium (Linux, /proc) and the frames drawn per second. Absolute numbers are
// only comparable between runs on the same machine; what matters is that they
// do not get worse.
//
// It also FAILS (exit 1) on the mistakes that made phones slow and hot:
//   - an SVG image drawn into a canvas every frame (the browser rasterises it again each time),
//   - characters still drawn as vector SVG after loading (clip paths in the actors),
//   - more than 60 frames a second (120 Hz screens).
//
// The sound is on, as in the game (the music plays in most scenes); SIN_MUSICA=1 measures
// without it, to compare.
//
// Usage: node scripts/rendimiento.mjs [escena...]   (against npm run dev on :5173)
//   escenas: prologo, piso, calle, bar, manga, granja, cerdos, backstage, palabras, rana, parque, robot, pang, sinfin, trailer, canas, canto, tragaperras, sol, solcombate, solcamino, solteatro, soljefe, solcalderon, kart, safari, boca, conceptos, caos, pangcompleto, pokecap (all by default)
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';

const HZ = 100;
const SEG = 5;
const quiero = process.argv.slice(2);
const toca = (e) => !quiero.length || quiero.includes(e);

function cpuChrome() {
  let t = 0;
  for (const pid of readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
    try {
      if (!readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes('chrome')) continue;
      const f = readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ');
      t += (+f[11] + +f[12]) / HZ;
    } catch {}
  }
  return t;
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(String(e)));
await page.addInitScript(() => {
  localStorage.clear();
  // Count SVG images drawn into canvases.
  const d = CanvasRenderingContext2D.prototype.drawImage;
  window.__svgEnCanvas = 0;
  CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
    if (img instanceof HTMLImageElement && /^data:image\/svg|\.svg(\?|$)/.test(img.src)) {
      window.__svgEnCanvas++;
      window.__svgUltimo = img.src.slice(0, 160) + ' · ' + new Error().stack.split('\n').slice(2, 5).join(' / ');
    }
    return d.call(this, img, ...a);
  };
});
await page.goto(`http://localhost:${process.env.PUERTO ?? 5173}/`);
await page.waitForFunction(() => window.__cyc);
await page.evaluate(() => window.__cyc.listo());
await page.evaluate(() => {
  const c = window.__cyc;
  c.titulo.remove();
  c.g.hud.setVisible(true);
  for (const id of ['fran', 'pablo', 'chuchi', 'guille']) c.g.poner(`empezado.${id}`);
  c.g.poner('despierto');
  // Measured always at the same quality, so runs compare: «auto» would step down here.
  c.g.calidadAuto = false;
  c.g.motor.setCalidad('media');
});
// The title screen's tap is what starts the sound in the game.
if (!process.env.SIN_MUSICA) await page.evaluate(() => window.__cyc.g.sound.start());
if (process.env.FPS_REPOSO) await page.evaluate((v) => (window.__cyc.g.fpsReposo = v), Number(process.env.FPS_REPOSO));

const filas = [];
async function medir(nombre, prep, contar = 'escena') {
  // Close any minigame left open by the previous scenario.
  await page.evaluate(() => {
    document.querySelectorAll('.cubierta.minijuego .cerrar, .cubierta.prologo .saltar').forEach((b) => b.click());
    window.__trailer?.().cerrar();
    window.__tragaperras?.().cerrar();
    clearInterval(window.__lucha);
    window.__sol?.().cerrar();
    window.__kart?.().cerrar();
    window.__poke?.().cerrar();
    window.__safari?.().cerrar();
    window.__boca?.().cerrar();
    window.__cortes?.parar();
    window.__cortes?.liberar();
    window.__cortes = null;
    // The minigames started here do not unpause the scene themselves.
    window.__cyc.g.pausado = false;
  });
  await page.evaluate(prep);
  await page.waitForTimeout(3000); // camera settled
  // Characters turned into bitmaps (a one-off cost when they first appear).
  // ...and the other scenes baked in the background (so doors open instantly).
  await page.waitForFunction(() => window.__sprites?.() === 0 && window.__cyc.g.motor.horneando === 0, null, { timeout: 90000, polling: 500 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('.ayuda').forEach((e) => (e.hidden = true)));
  const svg0 = await page.evaluate(() => window.__svgEnCanvas);
  const c0 = cpuChrome();
  const fps = await page.evaluate(({ seg, contar }) => new Promise((res) => {
    const m = window.__cyc.g.motor;
    const d = m.dibujar.bind(m);
    let n = 0;
    m.dibujar = () => {
      n++;
      d();
    };
    const f0 = window.__cerdos?.().fotogramas ?? 0;
    const p0 = window.__palabras?.().fotogramas ?? 0;
    const r0 = window.__rana?.().fotogramas ?? 0;
    const b0 = window.__robot?.().fotogramas ?? 0;
    const t0 = window.__trailer?.().fotogramas ?? 0;
    const ca0 = window.__canas?.().fotogramas ?? 0;
    const cn0 = window.__canto?.().fotogramas ?? 0;
    const tg0 = window.__tragaperras?.().fotogramas ?? 0;
    const g0 = window.__pang?.().fotogramas ?? 0;
    const so0 = window.__sol?.().fotogramas ?? 0;
    const ka0 = window.__kart?.().fotogramas ?? 0;
    const bo0 = window.__boca?.().fotogramas ?? 0;
    const pf0 = window.__pangFase?.().fotogramas ?? 0;
    const pk0 = window.__poke?.().fotogramas ?? 0;
    const sf0 = window.__safari?.().fotogramas ?? 0;
    setTimeout(() => {
      m.dibujar = d;
      res(contar === 'cerdos' ? ((window.__cerdos?.().fotogramas ?? 0) - f0) / seg : contar === 'palabras' ? ((window.__palabras?.().fotogramas ?? 0) - p0) / seg : contar === 'rana' ? ((window.__rana?.().fotogramas ?? 0) - r0) / seg : contar === 'robot' ? ((window.__robot?.().fotogramas ?? 0) - b0) / seg : contar === 'pang' ? ((window.__pang?.().fotogramas ?? 0) - g0) / seg : contar === 'trailer' ? ((window.__trailer?.().fotogramas ?? 0) - t0) / seg : contar === 'canas' ? ((window.__canas?.().fotogramas ?? 0) - ca0) / seg : contar === 'canto' ? ((window.__canto?.().fotogramas ?? 0) - cn0) / seg : contar === 'tragaperras' ? ((window.__tragaperras?.().fotogramas ?? 0) - tg0) / seg : contar === 'sol' ? ((window.__sol?.().fotogramas ?? 0) - so0) / seg : contar === 'kart' ? ((window.__kart?.().fotogramas ?? 0) - ka0) / seg : contar === 'boca' ? ((window.__boca?.().fotogramas ?? 0) - bo0) / seg : contar === 'pangfase' ? ((window.__pangFase?.().fotogramas ?? 0) - pf0) / seg : contar === 'safari' ? ((window.__safari?.().fotogramas ?? 0) - sf0) / seg : contar === 'pokecap' ? ((window.__poke?.().fotogramas ?? 0) - pk0) / seg : n / seg);
    }, seg * 1000);
  }), { seg: SEG, contar });
  const cpu = ((cpuChrome() - c0) / SEG) * 100;
  const svg = (await page.evaluate(() => window.__svgEnCanvas)) - svg0;
  const vector = await page.evaluate(() => document.querySelectorAll('svg.actores clipPath').length);
  const fallos = [];
  // One-off conversions (baking a scene, a new expression) are fine; every frame is not.
  if (svg > 0 && svg / SEG >= fps * 0.5) fallos.push(`${Math.round(svg / SEG)} imágenes SVG dibujadas en canvas por segundo (la última: ${await page.evaluate(() => window.__svgUltimo)})`);
  if (vector > 0) fallos.push(`${vector} recortes vectoriales en los personajes (no se han pasado a imagen)`);
  if (fps > 62) fallos.push(`${fps.toFixed(0)} fps, por encima del tope de 60`);
  filas.push(fallos);
  const musica = await page.evaluate(() => Object.keys(window.__cyc.g.sound.musicas).join('+'));
  console.log(`${nombre.padEnd(32)} CPU ${cpu.toFixed(0).padStart(4)} %   ${fps.toFixed(0).padStart(3)} fotogramas/s${musica ? '   ♪ ' + musica : ''}${fallos.length ? '   ✗ ' + fallos.join('; ') : ''}`);
}

const paseo = (a, b2, y) => `(() => { const f = window.__cyc.g.activo; let d = 1; clearInterval(window.__paseo); window.__paseo = setInterval(() => { d = -d; f.walkTo(d > 0 ? ${b2} : ${a}, ${y}); }, 3500); f.walkTo(${b2}, ${y}); })()`;
const quieto = `clearInterval(window.__paseo)`;
const ir = (escena, donde, extra = '') => `(async () => { clearInterval(window.__paseo); const g = window.__cyc.g; const e = g.estado; ${donde}; ${extra}; await g.irA('${escena}'); })()`;

if (toca('prologo')) {
  // The prologue: DOM and CSS over the paused scene (windows and stars switching
  // now and then, the lines coming in). The scene draws nothing: frames are ~0.
  await medir('prólogo', `(async () => {
    const g = window.__cyc.g;
    const { mostrarPrologo } = await import('/src/ui/prologo.ts');
    g.pausado = true;
    void mostrarPrologo(g.root.parentElement).then(() => (g.pausado = false));
  })()`);
}
if (toca('piso')) {
  await medir('piso, Fran quieto', ir('piso', `e.activo = 'fran'; e.donde.fran = { escena: 'piso', X: 1700, y: 890, face: 1 }`, `const F = g.pjs.get('fran'); if (F) { F.enCapa = null; F.rot = 0; F.eyesClosed = false; }`));
  await medir('piso, Fran andando', paseo(600, 2900, 890));
}
if (toca('calle')) {
  await medir('calle, los cuatro quietos', ir('calle', `e.final = true; e.activo = 'fran'; e.donde.fran = { escena: 'calle', X: 6640, y: 905, face: 1 }; e.donde.pablo = { escena: 'calle', X: 6330, y: 872, face: 1 }; e.donde.chuchi = { escena: 'calle', X: 6980, y: 875, face: -1 }; e.donde.guille = { escena: 'calle', X: 7160, y: 930, face: -1 }`));
  await medir('calle, Fran andando', paseo(5600, 7600, 900));
}
if (toca('bar')) {
  // The Bar del Brío inside, level 0 (as it always is), level 3 (warped, the dragon and the spinning pieces),
  // level 4 (the corridor with no end and the sloping floor), level 5 (upside down) and level 6 (the bar as Vero swallows Fran), with the four friends in
  // their places and then one of them walking along the counter.
  const preparar = (n) => ir(`bar${n}`, `e.final = true; e.activo = 'fran'; ${['chuchi', 'pablo', 'fran', 'guille'].map((id, i) => `e.donde.${id} = { escena: 'bar${n}', X: ${(n === 4 ? 2600 : 1250) + i * 250}, y: 930, face: ${i < 2 ? 1 : -1} }`).join('; ')}`, `
    const { escena } = await import('/src/arte/escenas/bar.mjs');
    const { dibujarBarVivo } = await import('/src/capitulos/bar-vivo.ts');
    for (let k = 0; k < 7; k++) g.cap.escenas['bar' + k] = () => escena(k);
    if (!g.cap.__barVivo) {
      g.cap.__barVivo = true;
      const orig = g.cap.dibujar;
      g.cap.dibujar = (gg, c2, capa) => {
        orig?.(gg, c2, capa);
        if (gg.escena.startsWith('bar')) dibujarBarVivo(gg, c2, capa, +gg.escena.slice(3));
      };
    }
    for (const id of ['fran', 'pablo', 'chuchi', 'guille']) { const F = g.pjs.get(id); if (F) { F.enCapa = null; F.rot = 0; F.eyesClosed = false; } }`);
  await medir('bar nivel 0, los cuatro quietos', preparar(0));
  await medir('bar nivel 0, Fran andando', paseo(1000, 2300, 960));
  await medir('bar nivel 3, los cuatro quietos', preparar(3));
  await medir('bar nivel 3, Fran andando', paseo(1000, 2300, 960));
  await medir('bar nivel 4, los cuatro quietos', preparar(4));
  await medir('bar nivel 4, Fran andando', paseo(1500, 4300, 960));
  await medir('bar nivel 5, los cuatro quietos', preparar(5));
  await medir('bar nivel 5, Fran andando', paseo(1000, 2300, 960));
  await medir('bar nivel 6, los cuatro quietos', preparar(6));
}
if (toca('manga')) {
  // Chapter 2: the manga shot (src/juego/manga.ts) over the long bar of level 4, with the four friends in their places:
  // one panel, three panels with onomatopoeias and the shadow of Pablo. The panels are baked ONCE to a bitmap and a
  // still canvas goes over the scene, so the cost has to be the bar's own (and no SVG drawn into a canvas each frame).
  // Also prints how long it takes to bake each shot (a one-off cost, in the first moment the shot is asked for).
  const sitios = ['chuchi', 'pablo', 'fran', 'guille'].map((id, i) => `e.donde.${id} = { escena: 'bar4', X: ${2600 + i * 250}, y: 930, face: ${i < 2 ? 1 : -1} }`).join('; ');
  const manga = (marca) => ir('bar4', `e.final = true; e.activo = 'fran'; ${sitios}`, `
    const { escena } = await import('/src/arte/escenas/bar.mjs');
    for (let k = 0; k < 7; k++) g.cap.escenas['bar' + k] = () => escena(k);
    for (const id of ['fran', 'pablo', 'chuchi', 'guille']) { const F = g.pjs.get(id); if (F) { F.enCapa = null; F.rot = 0; F.eyesClosed = false; } }
    g.plano.manga.ocultar();
    window.__mangaListo = false;`).replace(/\}\)\(\)$/, `
      const t0 = performance.now();
      await g.plano.manga.mostrar(${JSON.stringify(marca.split(' '))});
      window.__mangaMs = Math.round(performance.now() - t0);
      window.__mangaListo = true;
    })()`);
  for (const [nombre, marca] of [['manga, una viñeta (ojos)', 'pablo:ojos:suplica'], ['manga, tres viñetas y onomatopeyas', 'pablo:ojos:suplica vero:boca:picara chuchi:cara:sorpresa !gogogo !zas'], ['manga, la sombra de Pablo', 'sombra:cara:burla pablo:ojos:sorpresa !don']]) {
    await medir(nombre, manga(marca));
    const ms = await page.evaluate(() => window.__mangaMs);
    const activo = await page.evaluate(() => window.__cyc.g.plano.manga.activo);
    if (!activo) filas.push([`${nombre}: el plano manga no está en pantalla`]), console.log(`   ✗ ${nombre}: el plano manga no está en pantalla`);
    console.log(`   · horneado y puesto en ${ms} ms (una vez)`);
  }
  await page.evaluate(() => window.__cyc.g.plano.manga.ocultar());
}
if (toca('granja')) {
  await medir('granja, Guille quieto con moscas', ir('granja', `e.final = false; for (const id of ['fran','pablo','chuchi']) delete e.donde[id]; e.activo = 'guille'; e.donde.guille = { escena: 'granja', X: 1000, y: 890, face: 1 }`, `g.poner('g.olor')`));
  await medir('granja, Guille andando', paseo(400, 3200, 890));
}
if (toca('backstage')) {
  await medir('backstage, Pablo y su sombra', ir('backstage', `e.final = false; for (const id of ['fran','chuchi','guille']) delete e.donde[id]; e.activo = 'pablo'; e.donde.pablo = { escena: 'backstage', X: 2240, y: 880, face: 1 }`));
  await medir('backstage, andando', paseo(600, 3300, 880));
  await medir('backstage, sombra en la pantalla', `(() => { clearInterval(window.__paseo); const g = window.__cyc.g; g.poner('p.bloqueado'); g.poner('p.canon'); if (g.sombra) g.sombra.visible = false; g.activo.X = 3000; g.motor.seguir(3100, true); })()`);
}
if (toca('palabras')) {
  await medir('minijuego de las palabras', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarPalabras } = await import('/src/ui/palabras.ts');
    const { REPARTO } = await import('/src/juego/reparto.ts');
    g.pausado = true;
    void jugarPalabras(g.root, REPARTO.pablo.arte.body({}), false, undefined, g.sound);
    // Plays by itself: swipes across each negative word.
    const juega = () => {
      const e = window.__palabras?.();
      if (!e) return;
      const p = e.palabras.find((p) => p.negativa && !p.cortada && p.y > 60);
      if (p) {
        const c = document.querySelector('.lienzo-palabras');
        const ev = (t, x) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: p.y, pointerId: 1 }));
        ev('pointerdown', p.x - p.w / 2 - 4); ev('pointermove', p.x); ev('pointermove', p.x + p.w / 2 + 4); ev('pointerup', p.x + p.w / 2 + 4);
      }
      setTimeout(juega, 120);
    };
    setTimeout(juega, 6000);
  })()`, 'palabras');
}
if (toca('parque')) {
  // Chuchi in the play park: in the dark without his glasses (the live overlay), walking, and with the lights on and Robi awake.
  await medir('parque, a oscuras y sin gafas', ir('parque', `e.final = false; for (const id of ['fran','pablo','guille']) delete e.donde[id]; e.activo = 'chuchi'; e.donde.chuchi = { escena: 'parque', X: 2380, y: 880, face: 1 }`));
  await medir('parque, andando a oscuras', paseo(900, 3300, 880));
  await medir('parque, con luz y Robi', `(() => { clearInterval(window.__paseo); const g = window.__cyc.g; for (const k of ['c.gafas', 'c.cuarto', 'c.luz', 'c.robot']) g.poner(k); g.activo.X = 1200; g.motor.seguir(900, true); })()`);
}
if (toca('robot')) {
  await medir('minijuego del robot', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarRobot } = await import('/src/ui/robot.ts');
    g.pausado = true;
    void jugarRobot(g.root, false, undefined, g.sound);
    // Plays by itself: shoots where the button will be.
    const juega = () => {
      const e = window.__robot?.();
      if (!e) return;
      if (e.listo) {
        const B = e.boton(e.vuelo);
        document.querySelector('.lienzo-robot')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: B.x, clientY: B.y, pointerId: 1 }));
      }
      setTimeout(juega, 700);
    };
    setTimeout(juega, 6000);
  })()`, 'robot');
}
if (toca('pang')) {
  // The short Pang of chapter 2 (five stages): the entrance (foam and pixels) is part of the run; a bot plays the stage by itself.
  await medir('Pang corto (fase del piso)', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarPangCapitulo } = await import('/src/pang/capitulo.ts');
    g.pausado = true;
    void jugarPangCapitulo(g.root, { sonido: g.sound, fase: 1, control: 'bot' });
  })()`, 'pang');
  // Zaragoza: the cierzo's gusts, with the streaks and the arrow.
  await medir('Pang corto (Zaragoza, cierzo)', `(async () => {
    document.querySelectorAll('.cubierta.minijuego .cerrar').forEach((b) => b.click());
    const g = window.__cyc.g;
    const { jugarPangCapitulo } = await import('/src/pang/capitulo.ts');
    g.pausado = true;
    void jugarPangCapitulo(g.root, { sonido: g.sound, fase: 2, control: 'bot' });
  })()`, 'pang');
  await medir('Pang corto (Nevada, caravana)', `(async () => {
    document.querySelectorAll('.cubierta.minijuego .cerrar').forEach((b) => b.click());
    const g = window.__cyc.g;
    const { jugarPangCapitulo } = await import('/src/pang/capitulo.ts');
    g.pausado = true;
    void jugarPangCapitulo(g.root, { sonido: g.sound, fase: 3, control: 'bot' });
  })()`, 'pang');
  await medir('Pang corto (Las Vegas, jefe)', `(async () => {
    document.querySelectorAll('.cubierta.minijuego .cerrar').forEach((b) => b.click());
    const g = window.__cyc.g;
    const { jugarPangCapitulo } = await import('/src/pang/capitulo.ts');
    g.pausado = true;
    void jugarPangCapitulo(g.root, { sonido: g.sound, fase: 4, control: 'bot' });
  })()`, 'pang');
}
if (toca('kart')) {
  // Impropios Kart: a bot drives Chuchi (the computer's line) through the first stretches; the mode-7 floor, sprites and HUD are all in the run.
  await medir('Impropios Kart (carrera)', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarKart } = await import('/src/kart/kart.ts');
    g.pausado = true;
    void jugarKart(g.root, { sonido: g.sound });
    const espera = () => {
      const k = window.__kart?.();
      if (k?.carrera) k.auto(true);
      else setTimeout(espera, 200);
    };
    espera();
  })()`, 'kart');
}
if (toca('safari')) {
  // The safari comic (src/ui/safari.ts), the end of chapter 2: four pages of panels coming in (each a canvas of its own with its scene
  // redrawn by the frame: layers scrolling, wheels, dust, waves, an octopus, a braking caravan...), the bubbles, boxes and sounds as
  // baked bitmaps moved by CSS. One measure per page, in its busiest stretch (`ir(página, segundo)` jumps there).
  for (const [nombre, pag, seg] of [['safari, la M-30, los Monegros y el mapa', 0, 6], ['safari, la sabana y el diploma', 1, 3], ['safari, el océano, el pulpo y el kilómetro 4.000', 2, 5], ['safari, el cañón y Las Vegas al frenar', 3, 8]]) {
    await medir(nombre, `(async () => {
      clearInterval(window.__paseo);
      const g = window.__cyc.g;
      const { jugarSafari } = await import('/src/ui/safari.ts');
      g.pausado = true;
      void jugarSafari(g.root, { sonido: g.sound, pagina: ${pag} });
      for (let i = 0; i < 100 && !window.__safari?.().listo; i++) await new Promise((r) => setTimeout(r, 200));
      await window.__safari().ir(${pag}, ${seg});
    })()`, 'safari');
  }
}
if (toca('pokecap')) {
  // PokéUsera, the last game of chapter 2 (src/pokeusera/capitulo.ts), in its real shape: a phone held upright (412 x 915) with the game standing
  // in its own stage. Two moments: the silhouette (the three falling, the shadow coming down) and the hunt (the wild Ultimosaurio, the moves'
  // effects and the jarra), both on the world of the concepts' backdrop. The keys are pressed from the page, as a player would tap.
  await page.setViewportSize({ width: 412, height: 915 });
  const teclas = (cada) => `clearInterval(window.__lucha); window.__lucha = setInterval(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })), ${cada});`;
  await medir('pokecap: la silueta baja', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarPokeusera } = await import('/src/pokeusera/capitulo.ts');
    g.pausado = true;
    void jugarPokeusera(g.root, { sonido: g.sound, dino: true, semilla: 7 });
    await new Promise((r) => setTimeout(r, 1500));
    ${teclas(1100)}
  })()`, 'pokecap');
  await medir('pokecap: la caza (movimientos y jarra)', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarPokeusera } = await import('/src/pokeusera/capitulo.ts');
    g.pausado = true;
    void jugarPokeusera(g.root, { sonido: g.sound, dino: true, semilla: 7 });
    await new Promise((r) => setTimeout(r, 1500));
    ${teclas(300)}
    for (let i = 0; i < 400 && window.__poke?.().momento !== 'caza'; i++) await new Promise((r) => setTimeout(r, 200));
    await new Promise((r) => setTimeout(r, 4000));
  })()`, 'pokecap');
  await page.evaluate(() => {
    clearInterval(window.__lucha);
    window.__poke?.().cerrar();
  });
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 915, height: 412 });
}
if (toca('rana')) {
  await medir('minijuego de la rana', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarRana } = await import('/src/ui/rana.ts');
    const { REPARTO } = await import('/src/juego/reparto.ts');
    const F = REPARTO.fran;
    g.pausado = true;
    void jugarRana(g.root, { cuerpoFran: (a) => F.arte.body({ mood: a }, 'casa'), joints: F.arte.JOINTS, sonido: g.sound });
    // Plays by itself: aims for half a second (with the dotted line) and throws.
    const c = () => document.querySelector('.lienzo-rana');
    const ev = (t, x, y) => c()?.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
    const juega = () => {
      const e = window.__rana?.();
      if (!e) return;
      if (e.listo && !e.vuela) {
        const x = 500, y = 150;
        ev('pointerdown', x, y);
        ev('pointermove', x - 60, y + 30);
        setTimeout(() => ev('pointerup', x - 60, y + 30), 500);
      }
      setTimeout(juega, 900);
    };
    setTimeout(juega, 6000);
  })()`, 'rana');
}
if (toca('cerdos')) {
  await medir('minijuego de los cerdos', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarCerdos } = await import('/src/ui/cerdos.ts');
    g.pausado = true;
    void jugarCerdos(g.root, false, undefined, g.sound);
    // Plays by itself: drops each pig when it would land on the one below.
    const juega = () => {
      const e = window.__cerdos?.();
      if (!e) return;
      if (e.colgando && Math.abs(e.prediccion - e.objetivo) < 5) document.querySelector('.lienzo-cerdos').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      requestAnimationFrame(juega);
    };
    setTimeout(juega, 7000);
  })()`, 'cerdos');
}

if (toca('sinfin')) {
  // The endless versions (minigames menu) draw what the story does, plus a taller
  // and taller tower of pigs: the heaviest of them, measured as it grows.
  await medir('cerdos sin fin, torre creciendo', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarCerdos } = await import('/src/ui/cerdos.ts');
    g.pausado = true;
    void jugarCerdos(g.root, true, { record: 0 }, g.sound);
    const juega = () => {
      const e = window.__cerdos?.();
      if (!e) return;
      if (e.colgando && Math.abs(e.prediccion - e.objetivo) < 5) document.querySelector('.lienzo-cerdos').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      requestAnimationFrame(juega);
    };
    setTimeout(juega, 1500);
  })()`, 'cerdos');
}

if (toca('trailer')) {
  // The chapter 2 trailer, over the paused scene: the bar and the desert road (painted layers
  // scrolling, a few shapes on top); then the montage: the arcade games (256×144, scaled up),
  // the beer sliding, the slot machine and Vero (a few paths a frame). Each stretch plays in a
  // loop while it is measured.
  for (const [nombre, desde, hasta] of [['tráiler, barra y carretera', 2, 8], ['tráiler, montaje y Vero', 10, 26]]) {
    await medir(nombre, `(async () => {
      clearInterval(window.__paseo);
      const g = window.__cyc.g;
      const { mostrarTrailer } = await import('/src/ui/trailer.ts');
      g.pausado = true;
      void mostrarTrailer(g.root.parentElement, g.sound, false, { desde: ${desde}, hasta: ${hasta} });
    })()`, 'trailer');
  }
}

if (toca('canas')) {
  // Chapter 2: the beers along the bar (the trailer's bar, the friends' faces, a beer sliding with its
  // ring and trail, falling with a splash). Plays by itself: brakes the first two beers of each round
  // on the coaster and lets the third one go, so it never ends while it is measured.
  await medir('minijuego de las cañas', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarCanas } = await import('/src/ui/canas.ts');
    g.pausado = true;
    void jugarCanas(g.root, { sonido: g.sound });
    const juega = () => {
      const e = window.__canas?.();
      if (!e) return;
      if (e.listo && e.indice < 2 && e.parada >= e.objetivo) document.querySelector('.lienzo-canas')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
      requestAnimationFrame(juega);
    };
    setTimeout(juega, 3000);
  })()`, 'canas');
}
if (toca('canto')) {
  // Chapter 2: the chant. Plays by itself: sings the first two turns on the beat and misses the third,
  // so the phrase starts again and again (the first pass never ends while it is measured).
  await medir('minijuego del canto', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarCanto } = await import('/src/ui/canto.ts');
    g.pausado = true;
    void jugarCanto(g.root, { sonido: g.sound });
    const juega = () => {
      const e = window.__canto?.();
      if (!e) return;
      if (e.estado === 'canta' && e.cantor >= 0 && e.cantor < 2 && Math.abs(e.tm - e.proximo) < 0.03) {
        const c = e.caras[e.cantor];
        const lienzo = document.querySelector('.lienzo-canto');
        const r = lienzo.getBoundingClientRect();
        lienzo.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + c.x, clientY: r.top + c.y, pointerId: 1 }));
      }
      requestAnimationFrame(juega);
    };
    setTimeout(juega, 3000);
  })()`, 'canto');
}
if (toca('tragaperras')) {
  // Chapter 2: the slot machine up close (the painted machine, the reels scrolling, the bulbs; with the
  // jackpot, the coins pouring). Each stretch plays in a loop while it is measured.
  for (const [nombre, premio, desde, hasta, cara] of [['tragaperras, sin premio', false, 0, 3.6], ['tragaperras, premio y monedas', true, 2.4, 6.8], ['tragaperras, cara de Pablo y apagón', false, 1.2, 4.1, 'pablo']]) {
    await medir(nombre, `(async () => {
      clearInterval(window.__paseo);
      const g = window.__cyc.g;
      const { mostrarTragaperras } = await import('/src/ui/tragaperras.ts');
      g.pausado = true;
      void mostrarTragaperras(g.root, { premio: ${premio}, ${cara ? `cara: '${cara}', ` : ''}sonido: g.sound, prueba: { desde: ${desde}, hasta: ${hasta} } });
    })()`, 'tragaperras');
  }
}

if (toca('sol')) {
  // «Alacant Sun» (src/sol/): the village at night in the rain, Pablo walking back and forth along the
  // road (the cached tiles and sprites, two rain layers, the strings of lights, lightning now and then).
  await medir('sol: pueblo con lluvia', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    g.pausado = true;
    const { jugarSol } = await import('/src/sol/sol.ts');
    void jugarSol(g.root, { sonido: g.sound });
    await new Promise((r) => setTimeout(r, 400));
    const s = window.__sol();
    await s.irAlPueblo();
    s.poner(100, 328);
    let d = 1;
    window.__paseo = setInterval(() => {
      d = -d;
      window.__sol?.().mando.fijarDir(d, 0);
    }, 2500);
    s.mando.fijarDir(1, 0);
  })()`, 'sol');
}

if (toca('solcombate')) {
  // Combat of «Alacant Sun» (src/sol/combate.ts): the camera swaying round the night field, the status
  // boxes, and the hero orders (attacks, psynergy, the apuntador, La ovación) one after another; when
  // a fight ends the party rests and another one starts.
  await medir('solcombate: combate por turnos', `(async () => {
    clearInterval(window.__paseo);
    clearInterval(window.__lucha);
    const g = window.__cyc.g;
    g.pausado = true;
    const { jugarSol } = await import('/src/sol/sol.ts');
    const { descansar } = await import('/src/sol/grupo.ts');
    void jugarSol(g.root, { sonido: g.sound });
    await new Promise((r) => setTimeout(r, 400));
    const s = window.__sol();
    await s.irAlPueblo();
    const orden = ['atacar', 'poder', 'soltar', 'atacar', 'invocar:ovacion', 'poner', 'defender'];
    let i = 0;
    window.__lucha = setInterval(() => {
      const so = window.__sol?.();
      if (!so) return;
      if (!so.combate) {
        descansar(so.grupo);
        void so.luchar(['petardo', 'movil', 'critico', 'mosquito', 'spoiler']);
        return;
      }
      if (so.elegir(orden[i % orden.length], i % 3)) i++;
    }, 300);
  })()`, 'sol');
}

if (toca('solcamino')) {
  // The road to the theatre of «Alacant Sun» (src/sol/camino.ts): the countryside at night, the four friends in a
  // line along Pablo's path, the fireflies, back and forth along the road with the random fights off (the steps
  // counter keeps running).
  await medir('solcamino: el camino con la fila de amigos', `(async () => {
    clearInterval(window.__paseo);
    clearInterval(window.__lucha);
    const g = window.__cyc.g;
    g.pausado = true;
    const { jugarSol } = await import('/src/sol/sol.ts');
    void jugarSol(g.root, { sonido: g.sound });
    await new Promise((r) => setTimeout(r, 400));
    const s = window.__sol();
    await s.irAlCamino();
    s.encuentros(false);
    s.poner(100, 208);
    let d = 1;
    window.__paseo = setInterval(() => {
      const so = window.__sol?.();
      if (!so) return;
      d = -d;
      so.mando.fijarDir(d, 0);
    }, 2500);
    s.mando.fijarDir(1, 0);
  })()`, 'sol');
}

if (toca('solteatro')) {
  // The Teatro of «Alacant Sun» (src/sol/teatro.ts, arteteatro.ts): the bambalinas with their candles lit (flames,
  // halos, the ghost-free planks), Pablo and the friends walking along the footlights with the random fights off, a
  // map power cast now and then (the wind swirls and the leaves fly as particles); then the same room in the dark
  // (the candles out: darkness over everything, the safe planks glowing).
  const empieza = (oscuro) => `(async () => {
    clearInterval(window.__paseo);
    clearInterval(window.__lucha);
    const g = window.__cyc.g;
    g.pausado = true;
    const { jugarSol } = await import('/src/sol/sol.ts');
    void jugarSol(g.root, { sonido: g.sound });
    await new Promise((r) => setTimeout(r, 400));
    const s = window.__sol();
    await s.irAlTeatro('bam');
    s.encuentros(false);
    ${oscuro ? "s.resolver('velas');" : ''}
    s.poner(40, 203);
    s.elegirPoder('cierzo');
    let d = 1;
    let k = 0;
    window.__paseo = setInterval(() => {
      const so = window.__sol?.();
      if (!so) return;
      d = -d;
      so.mando.fijarDir(d, 0);
      // every other turn, a gust at the candles (facing north in front of one)
      if (++k % 3 === 0) so.mando.pulsar('r');
    }, 2500);
    s.mando.fijarDir(1, 0);
  })()`;
  await medir('solteatro: bambalinas con velas', empieza(false), 'sol');
  await medir('solteatro: bambalinas a oscuras', empieza(true), 'sol');
}

// The little player of the boss scenes: answers the dialogues with A and each menu with an order.
const BOT_JEFE = `
    window.__lucha = setInterval(() => {
      const so = window.__sol?.();
      if (!so) return;
      const c = so.combate;
      if (!c) return void so.mando.pulsar('a');
      if (c.menu === '' || c.menu === 'nivel') return void so.mando.pulsar('a');
      if (c.menu !== 'luchar' && c.menu !== 'ordenes') return;
      const q = c.turno;
      if (!q) return void so.mando.pulsar('a');
      const intentos = (window.__intentos ??= {});
      const clave = c.ronda + ':' + q;
      const n = (intentos[clave] = (intentos[clave] ?? 0) + 1);
      const ph = so.fase();
      let o = 'atacar';
      if (n > 1) o = 'atacar';
      else if (ph === 'guion') o = q === 'pablo' ? 'invocar:calderon' : 'defender';
      else if (q === 'pablo') o = c.ronda % 2 ? 'soltar' : 'poder:siy';
      else if (q === 'fran') o = c.ronda % 3 === 0 ? 'soltar' : 'poder:fresquito';
      else if (q === 'guille') o = c.ronda % 2 ? 'poder:cierzo' : 'soltar';
      else o = c.ronda % 2 ? 'poder:cincominutos' : 'soltar';
      so.elegir(o, 0);
    }, 200);`;

const PREP_JEFE = (alGuion) => `(async () => {
    clearInterval(window.__paseo);
    clearInterval(window.__lucha);
    const g = window.__cyc.g;
    g.pausado = true;
    const { jugarSol } = await import('/src/sol/sol.ts');
    const { expTotal, statsDe, darApuntador } = await import('/src/sol/grupo.ts');
    void jugarSol(g.root, { sonido: g.sound });
    await new Promise((r) => setTimeout(r, 400));
    const s = window.__sol();
    await s.irAlPueblo();
    s.unirTodos();
    for (const [id, dueno] of [['chist', 'pablo'], ['ejem', 'chuchi'], ['psst', 'fran'], ['shhh', 'guille']]) darApuntador(s.grupo, id, dueno);
    for (const m of s.grupo.miembros) {
      m.nivel = 6;
      m.exp = expTotal(6);
      const st = statsDe(s.grupo, m);
      m.pv = st.pv;
      m.ip = st.ip;
    }
    void s.jefe();
    ${BOT_JEFE}
    ${alGuion ? `
    // straight to the script moment, and then to Calderón's summon: it lasts 22 s, longer than the measuring window
    await new Promise((r) => setTimeout(r, 7000));
    window.__sol().guion();
    for (let i = 0; i < 600; i++) {
      await new Promise((r) => setTimeout(r, 200));
      if (window.__sol?.().combate?.mensaje.includes('Calder')) break;
    }` : ''}
  })()`;

if (toca('soljefe')) {
  // The boss of «Alacant Sun» (combate.ts, jefe; jefeArte.ts, efectosJefe.ts): the stage, the narrator with his orbiting
  // pages and his rewriting attacks, rounds with the four friends' orders.
  await medir('soljefe: el narrador en el escenario', PREP_JEFE(false), 'sol');
}

if (toca('solcalderon')) {
  // The long summon of Calderón de la Barca (calderon.ts): the sky opening, the rotating rays, the huge bust, the quill
  // writing in the air and the blow. The measure starts a few seconds into it.
  await medir('solcalderon: la invocacion de Calderon', PREP_JEFE(true), 'sol');
}

// Chapter 2, last stretch: these need the chapter-2 game itself (?capitulo2), so the page is reloaded; they go last.
if (toca('boca') || toca('conceptos') || toca('caos') || toca('pangcompleto')) {
  await page.goto(`http://localhost:${process.env.PUERTO ?? 5173}/?capitulo2&nueva`);
  await page.waitForFunction(() => window.__cyc);
  await page.evaluate(() => window.__cyc.listo());
  await page.evaluate(() => {
    const c = window.__cyc;
    c.titulo.remove();
    c.g.hud.setVisible(true);
    for (const id of ['fran', 'pablo', 'chuchi', 'guille']) c.g.poner(`empezado.${id}`);
    c.g.calidadAuto = false;
    c.g.motor.setCalidad('media');
  });
  if (!process.env.SIN_MUSICA) await page.evaluate(() => window.__cyc.g.sound.start());
}
if (toca('boca')) {
  // Vero's mouth (src/ui/boca.ts): the trailer's shot over the game, with the four friends as people (full bodies as bitmaps).
  // Open and still, drawing every frame.
  await medir('boca de Vero (abierta)', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { abrirBoca } = await import('/src/ui/boca.ts');
    g.hud.setVisible(false);
    void abrirBoca(g.root, { sonido: g.sound }).abre();
  })()`, 'boca');
  // ...and after the jump: the four already figures (jar, spiral with its ring, ball with glasses, flower) floating in the dark,
  // each with its glow (bitmaps and a few canvas fills, no SVG per frame).
  await medir('boca de Vero (figuras flotando)', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { abrirBoca } = await import('/src/ui/boca.ts');
    g.hud.setVisible(false);
    const boca = abrirBoca(g.root, { sonido: g.sound });
    await boca.abre();
    await boca.tragaFran();
    await boca.saltan();
  })()`, 'boca');
  await page.evaluate(() => window.__cyc.g.hud.setVisible(true));
}
const MUNDO = (extra = '') => `(async () => {
  clearInterval(window.__paseo);
  const g = window.__cyc.g;
  g.poner('c2.nivel', 7);
  const { prepararConceptos } = await import('/src/capitulos/conceptos-vivo.ts');
  await prepararConceptos(g);
  for (const id of g.estado.jugables) g.estado.donde[id] = { escena: 'conceptos', X: 1200, y: 900, face: 1 };
  await g.irA('conceptos', false);
  await g.velar(false);
  ${extra}
})()`;
if (toca('conceptos')) {
  // The world of the concepts (level 7): the void with the parallax shapes, the twelve pieces moving (all bitmaps baked once,
  // only transforms per frame) and Vero's lips; then with Fran found, «LA ÚLTIMA» shown and the dinosaur rising.
  await medir('conceptos, el mundo quieto', MUNDO());
  await medir('conceptos, Fran hallado, dino y Guille', MUNDO(`
    g.poner('c2.fran.hallado');
    const m = await import('/src/capitulos/conceptos-vivo.ts');
    m.revelarUltima(g);
    m.subirDino(g);
    m.darPasoGuille(g);`));
}
if (toca('caos')) {
  // The total chaos (level 8): hard cuts between normal / manga / Alacant Sun pixels / Pang pixels / pencil (each baked once, see
  // src/juego/estilos.ts), the hue turning, the camera spinning for good and the pieces at 2.6x.
  await medir('caos, cortes de estilo y giro', MUNDO(`
    g.poner('c2.nivel', 8);
    g.poner('c2.fran.hallado');
    const m = await import('/src/capitulos/conceptos-vivo.ts');
    const { prepararCortes } = await import('/src/juego/estilos.ts');
    m.revelarUltima(g);
    m.empezarCaos(g);
    m.subirDino(g);
    m.darPasoGuille(g);
    window.__cortes = await prepararCortes(g, null, ['fran:cara:enfado', 'vero:boca:picara', 'chuchi:ojos:seriedad', '!gogogo']);
    window.__cortes.iniciar();
    void g.plano.girar(1000, 3500000);`));
}

if (toca('pangcompleto')) {
  // The whole Pang (src/pang/completo.ts, from the minigames menu): a bot plays the last stage with the DOM layers over it, then the title
  // with its attract demo behind (a bot too) and the screens (plain DOM) over the canvas. Both are counted by the stage's own hook.
  await medir('Pang completo (Las Vegas, jefe)', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarPangCompleto } = await import('/src/pang/completo.ts');
    g.pausado = true;
    window.__cierraPang = new AbortController();
    void jugarPangCompleto(document.body, { sonido: g.sound, fase: 12, control: 'bot', senal: window.__cierraPang.signal });
  })()`, 'pangfase');
  await medir('Pang completo (título con demo)', `(async () => {
    window.__cierraPang?.abort();
    const g = window.__cyc.g;
    const { jugarPangCompleto } = await import('/src/pang/completo.ts');
    g.pausado = true;
    window.__cierraPang = new AbortController();
    void jugarPangCompleto(document.body, { sonido: g.sound, senal: window.__cierraPang.signal });
  })()`, 'pangfase');
  await page.evaluate(() => {
    window.__cierraPang?.abort();
    window.__cyc.g.pausado = false;
  });
}

// Memory after the whole tour (docs/ESTILO.md, T5.11): baked scenery and decoded music are
// capped; past these budgets a phone runs short of GPU memory and the frame rate falls apart.
const mem = await page.evaluate(() => ({ decorado: window.__cyc.g.motor.memoriaDecorado, musica: window.__cyc.g.sound.memoriaMusica }));
const fallosMem = [];
if (mem.decorado.mb > 100) fallosMem.push(`decorados: ${mem.decorado.mb} MB (máximo 100)`);
if (mem.musica > 50) fallosMem.push(`música descomprimida: ${mem.musica} MB (máximo 50)`);
filas.push(fallosMem);
console.log(`memoria al final: decorados ${mem.decorado.mb} MB en ${mem.decorado.escenas} escenas, música ${mem.musica} MB${fallosMem.length ? '   ✗ ' + fallosMem.join('; ') : ''}`);
await b.close();
if (errores.length) console.log('ERRORES:\n' + errores.join('\n'));
if (errores.length || filas.some((f) => f.length)) process.exit(1);
console.log('Sin fallos de rendimiento conocidos');
