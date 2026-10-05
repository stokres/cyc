// Balance check for Guille's pig tower (src/ui/cerdos.ts): simulated players with a precise,
// normal and clumsy sense of timing, three games each. Prints the result, rounds lost,
// slips and collapses.
// Usage: node scripts/cerdos-sim.mjs   (against npm run dev on :5173)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
// Players aim where the pig will land (`prediccion`, the drift as it falls included) and tap
// when it will be right over the tower, give or take their timing error: a human error, early
// or late, of ±30 ms (precise), ±60 ms (normal) or ±100 ms (clumsy).
for (const [nombre, sigma] of [['preciso (±30 ms)', 30], ['normal (±60 ms)', 60], ['torpe (±100 ms)', 100]]) {
  const res = [];
  for (let intento = 0; intento < 3; intento++) {
    const page = await b.newPage({ viewport: { width: 844, height: 390 } });
    await page.addInitScript(() => localStorage.clear());
    await page.goto('http://localhost:5173/');
    await page.waitForFunction(() => window.__cyc);
    await page.evaluate(() => window.__cyc.listo());
    await page.evaluate(async () => { const g = window.__cyc.g; window.__cyc.titulo.remove(); g.estado.activo = 'guille'; g.poner('empezado.guille'); g.poner('basculaLista'); await g.irA('granja'); void import('/src/ui/cerdos.ts').then((m) => m.jugarCerdos(g.root).then((r) => (window.__res = r))); });
    await page.waitForFunction(() => window.__cerdos);
    const t0 = Date.now();
    const out = await page.evaluate((sigma) => new Promise((res) => {
      let previo = null;
      let cita = 0; // when the tap is due (performance.now), 0 for none
      const gauss = () => Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random());
      const mira = () => {
        const e = window.__cerdos?.();
        if (e) window.__ultimo = e;
        if (!e) return res({ fin: window.__res, ...window.__ultimo });
        if (e.rondasPerdidas >= 3) return res({ ...e });
        const ahora = performance.now();
        if (cita && ahora >= cita) {
          cita = 0;
          document.querySelector('.lienzo-cerdos').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        } else if (!cita && e.colgando && previo) {
          // Heading for the tower: when will the landing point cross it?
          const v = (e.prediccion - previo.p) / ((ahora - previo.t) / 1000);
          const falta = (e.objetivo - e.prediccion) / v;
          if (v && falta > 0 && falta < 0.25) cita = ahora + falta * 1000 + gauss() * sigma;
        }
        previo = e.colgando ? { p: e.prediccion, t: ahora } : null;
        requestAnimationFrame(mira);
      };
      mira();
    }), sigma);
    res.push(`${out.fin ?? 'NO'} r${out.rondasPerdidas} resb${out.resbalones} derr${out.derrumbes} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    await page.close();
  }
  console.log(nombre.padEnd(22), res.join(' | '));
}
await b.close();
