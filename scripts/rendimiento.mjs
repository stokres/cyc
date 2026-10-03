// Performance check: CPU used by all Chromium processes (Linux, /proc) and frames
// drawn per second, in four scenes, on a Pixel-sized landscape screen with
// software WebGL (SwiftShader, so the "GPU" shows up as CPU).
// Usage: node scripts/rendimiento.mjs   (against npm run dev on :5173)
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';
const HZ = 100;
export function porProceso() {
  const r = {};
  for (const pid of readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
    try {
      const cmd = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
      if (!cmd.includes('chrome')) continue;
      const tipo = (cmd.match(/--type=([a-z-]+)/) || [, 'browser'])[1] + (cmd.includes('utility-sub-type=network') ? '-net' : '');
      const f = readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ');
      r[tipo] = (r[tipo] ?? 0) + (+f[11] + +f[12]) / HZ;
    } catch {}
  }
  return r;
}
function cpuChrome() {
  let t = 0;
  for (const pid of readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
    try {
      const cmd = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
      if (!cmd.includes('chrome')) continue;
      const f = readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ');
      t += (+f[11] + +f[12]) / HZ;
    } catch {}
  }
  return t;
}
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.clear());
await page.goto('http://localhost:5173/');
await page.waitForFunction(() => window.__cyc);
await page.evaluate(() => window.__cyc.listo());
await page.touchscreen.tap(420, 200);
await page.waitForSelector('.eleccion');
await page.click('.eleccion-pj[data-id="fran"]');
for (let i = 0; i < 30 && (await page.evaluate(() => window.__cyc.g.ocupadoAhora || document.querySelector('.dialogo'))); i++) { await page.touchscreen.tap(420, 150); await page.waitForTimeout(150); }
await page.touchscreen.tap(420, 200);
for (let i = 0; i < 30 && (await page.evaluate(() => window.__cyc.g.ocupadoAhora || document.querySelector('.dialogo'))); i++) { await page.touchscreen.tap(420, 150); await page.waitForTimeout(150); }
await page.evaluate(() => document.querySelectorAll('.ayuda').forEach((e) => (e.hidden = true)));
async function medir(nombre, prep) {
  await page.evaluate(prep);
  await page.waitForTimeout(9000);
  const c0 = cpuChrome();
  const p0 = porProceso();
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const m = window.__cyc.g.motor; const d = m.dibujar.bind(m); let draws = 0; m.dibujar = () => { draws++; d(); }; const tick = () => { n++; if (performance.now() - t0 < 6000) requestAnimationFrame(tick); else { m.dibujar = d; res(draws / 6); } }; requestAnimationFrame(tick); }));
  const c1 = cpuChrome();
  const p1 = porProceso();
  console.log('   ' + Object.keys(p1).map((k) => `${k}: ${(((p1[k] - (p0[k] ?? 0)) / 6) * 100).toFixed(0)}%`).join('  '));
  console.log(`${nombre.padEnd(30)} CPU ${(((c1 - c0) / 6) * 100).toFixed(0).padStart(4)} %   fotogramas dibujados ${fps.toFixed(0)}/s`);
}
await medir('piso, Fran quieto', () => {});
await medir('piso, Fran andando', () => { const f = window.__cyc.g.activo; let d = 1; window.__paseo = setInterval(() => { d = -d; f.walkTo(d > 0 ? 2900 : 600, 890); }, 3500); f.walkTo(2900, 890); });
await medir('calle, los cuatro quietos', async () => {
  clearInterval(window.__paseo);
  const g = window.__cyc.g; const e = g.estado;
  e.donde.fran = { escena: 'calle', X: 6640, y: 905, face: 1 }; e.donde.pablo = { escena: 'calle', X: 6330, y: 872, face: 1 }; e.donde.chuchi = { escena: 'calle', X: 6980, y: 875, face: -1 }; e.donde.guille = { escena: 'calle', X: 7160, y: 930, face: -1 };
  e.activo = 'fran'; e.final = true; // so walking past the crossing does not end Fran's story
  const F = g.pjs.get('fran'); F.enCapa = null; F.rot = 0; await g.irA('calle');
});
await medir('calle, Fran andando', () => { const f = window.__cyc.g.activo; let d = 1; window.__paseo = setInterval(() => { d = -d; f.walkTo(d > 0 ? 7600 : 5600, 900); }, 4000); f.walkTo(7600, 900); });
await b.close();
