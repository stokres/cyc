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
//   escenas: prologo, piso, calle, granja, cerdos, backstage, palabras, rana, parque, robot, sinfin, trailer (all by default)
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
await page.goto('http://localhost:5173/');
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
    document.querySelectorAll('.cubierta.minijuego .cerrar, .cubierta.prologo .saltar, .cubierta.trailer .saltar').forEach((b) => b.click());
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
    setTimeout(() => {
      m.dibujar = d;
      res(contar === 'cerdos' ? ((window.__cerdos?.().fotogramas ?? 0) - f0) / seg : contar === 'palabras' ? ((window.__palabras?.().fotogramas ?? 0) - p0) / seg : contar === 'rana' ? ((window.__rana?.().fotogramas ?? 0) - r0) / seg : contar === 'robot' ? ((window.__robot?.().fotogramas ?? 0) - b0) / seg : contar === 'trailer' ? ((window.__trailer?.().fotogramas ?? 0) - t0) / seg : n / seg);
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
  // The chapter 2 trailer, over the paused scene: the painted desert (pushed in, with its
  // smoke) and the caravan's lumps; then the arcade games (256×144, scaled up) and Vero
  // (a few paths a frame). Each pair of shots plays in a loop while it is measured.
  for (const [nombre, desde, hasta] of [['tráiler, desierto y caravana', 4, 12.5], ['tráiler, recreativas y Vero', 14.5, 24.5]]) {
    await medir(nombre, `(async () => {
      clearInterval(window.__paseo);
      const g = window.__cyc.g;
      const { mostrarTrailer } = await import('/src/ui/trailer.ts');
      g.pausado = true;
      void mostrarTrailer(g.root.parentElement, g.sound, false, { desde: ${desde}, hasta: ${hasta} });
    })()`, 'trailer');
  }
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
