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
// Usage: node scripts/rendimiento.mjs [escena...]   (against npm run dev on :5173)
//   escenas: piso, calle, granja, cerdos (all by default)
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

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
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
});
if (process.env.FPS_REPOSO) await page.evaluate((v) => (window.__cyc.g.fpsReposo = v), Number(process.env.FPS_REPOSO));

const filas = [];
async function medir(nombre, prep, contar = 'escena') {
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
    setTimeout(() => {
      m.dibujar = d;
      res(contar === 'cerdos' ? ((window.__cerdos?.().fotogramas ?? 0) - f0) / seg : n / seg);
    }, seg * 1000);
  }), { seg: SEG, contar });
  const cpu = ((cpuChrome() - c0) / SEG) * 100;
  const svg = (await page.evaluate(() => window.__svgEnCanvas)) - svg0;
  const vector = await page.evaluate(() => document.querySelectorAll('svg.actores clipPath').length);
  const fallos = [];
  // One-off conversions (baking a scene, a new expression) are fine; every frame is not.
  if (svg / SEG >= fps * 0.5) fallos.push(`${Math.round(svg / SEG)} imágenes SVG dibujadas en canvas por segundo (la última: ${await page.evaluate(() => window.__svgUltimo)})`);
  if (vector > 0) fallos.push(`${vector} recortes vectoriales en los personajes (no se han pasado a imagen)`);
  if (fps > 62) fallos.push(`${fps.toFixed(0)} fps, por encima del tope de 60`);
  filas.push(fallos);
  console.log(`${nombre.padEnd(32)} CPU ${cpu.toFixed(0).padStart(4)} %   ${fps.toFixed(0).padStart(3)} fotogramas/s${fallos.length ? '   ✗ ' + fallos.join('; ') : ''}`);
}

const paseo = (a, b2, y) => `(() => { const f = window.__cyc.g.activo; let d = 1; clearInterval(window.__paseo); window.__paseo = setInterval(() => { d = -d; f.walkTo(d > 0 ? ${b2} : ${a}, ${y}); }, 3500); f.walkTo(${b2}, ${y}); })()`;
const quieto = `clearInterval(window.__paseo)`;
const ir = (escena, donde, extra = '') => `(async () => { clearInterval(window.__paseo); const g = window.__cyc.g; const e = g.estado; ${donde}; ${extra}; await g.irA('${escena}'); })()`;

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
if (toca('cerdos')) {
  await medir('minijuego de los cerdos', `(async () => {
    clearInterval(window.__paseo);
    const g = window.__cyc.g;
    const { jugarCerdos } = await import('/src/ui/cerdos.ts');
    g.pausado = true;
    void jugarCerdos(g.root);
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

await b.close();
if (errores.length) console.log('ERRORES:\n' + errores.join('\n'));
if (errores.length || filas.some((f) => f.length)) process.exit(1);
console.log('Sin fallos de rendimiento conocidos');
