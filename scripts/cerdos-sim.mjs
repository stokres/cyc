// Balance check for Guille's pig tower (src/ui/cerdos.ts): simulated players tap
// when the pig looks right above the tower, with fast, normal and slow reactions,
// three rounds each. Prints the result, rounds lost, slips and collapses.
// It sees the centre perfectly, so real players will do somewhat worse.
// Usage: node scripts/cerdos-sim.mjs   (against npm run dev on :5173)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [nombre, retraso] of [['rápido (0–0,12 s)', 120], ['normal (0–0,2 s)', 200], ['lento (0,1–0,35 s)', 350]]) {
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
    const out = await page.evaluate((retraso) => new Promise((res) => {
      let tocado = false;
      const mira = () => {
        const e = window.__cerdos?.();
        if (e) window.__ultimo = e;
        if (!e) return res({ fin: window.__res, ...window.__ultimo });
        if (e.rondasPerdidas >= 3) return res({ ...e });
        // A player taps when the pig looks right above the tower, then reacts late.
        if (e.colgando && !tocado && Math.abs(e.x - e.objetivo) < 12) {
          tocado = true;
          setTimeout(() => { document.querySelector('.lienzo-cerdos').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); setTimeout(() => (tocado = false), 300); }, (retraso === 350 ? 100 : 0) + Math.random() * (retraso === 350 ? 250 : retraso));
        }
        requestAnimationFrame(mira);
      };
      mira();
    }), retraso);
    res.push(`${out.fin ?? 'NO'} r${out.rondasPerdidas} resb${out.resbalones} derr${out.derrumbes} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    await page.close();
  }
  console.log(nombre.padEnd(22), res.join(' | '));
}
await b.close();
