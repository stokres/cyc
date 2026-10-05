// Balance check for Pablo's battle of words (src/ui/palabras.ts): simulated players with a
// quick, normal and slow reaction see a negative word, take that long to react, and swipe
// across where they saw it (give or take their aim). Whatever else crosses that line gets
// cut too, the positive words included. Three games each: the result, rounds lost, and how
// full the block meter got.
// Usage: node scripts/palabras-sim.mjs   (against npm run dev on :5173)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [nombre, reaccion, punteria] of [['rápido (0,25 s, ±6 px)', 250, 6], ['normal (0,4 s, ±10 px)', 400, 10], ['lento (0,6 s, ±14 px)', 600, 14]]) {
  const res = [];
  for (let intento = 0; intento < 3; intento++) {
    const page = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
    await page.addInitScript(() => localStorage.clear());
    await page.goto('http://localhost:5173/');
    await page.waitForFunction(() => window.__cyc);
    await page.evaluate(() => window.__cyc.listo());
    await page.evaluate(async () => {
      const g = window.__cyc.g;
      window.__cyc.titulo.remove();
      g.pausado = true;
      const { jugarPalabras } = await import('/src/ui/palabras.ts');
      const { REPARTO } = await import('/src/juego/reparto.ts');
      void jugarPalabras(g.root, REPARTO.pablo.arte.body({}), false).then((r) => (window.__res = r));
    });
    await page.waitForFunction(() => window.__palabras);
    const t0 = Date.now();
    let peor = 0;
    const vistas = new Set();
    for (;;) {
      const e = await page.evaluate(() => window.__palabras?.() ?? null);
      if (!e) break;
      peor = Math.max(peor, e.bloqueo);
      if (e.rondasPerdidas >= 3 || Date.now() - t0 > 240000) break;
      // A negative word, well in view, that this player has not gone for yet.
      const p = e.palabras.find((q) => q.negativa && !q.cortada && q.y > 60 && q.y < 300 && !vistas.has(`${Math.round(q.x / 40)}`));
      if (p) {
        vistas.add(`${Math.round(p.x / 40)}`);
        setTimeout(() => vistas.delete(`${Math.round(p.x / 40)}`), 1500);
        const y = p.y + (Math.random() - 0.5) * 2 * punteria;
        const x0 = p.x - p.w / 2 - 10 + (Math.random() - 0.5) * punteria;
        const x1 = p.x + p.w / 2 + 10 + (Math.random() - 0.5) * punteria;
        await page.waitForTimeout(reaccion * (0.8 + Math.random() * 0.4));
        await page.mouse.move(x0, y);
        await page.mouse.down();
        await page.mouse.move(x1, y, { steps: 4 });
        await page.mouse.up();
      } else await page.waitForTimeout(40);
    }
    const fin = await page.evaluate(() => window.__res ?? null);
    const ult = await page.evaluate(() => window.__palabras?.() ?? null);
    res.push(`${fin ?? 'NO'} r${ult?.rondasPerdidas ?? '?'} bloqueo máx ${peor} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    await page.close();
  }
  console.log(nombre.padEnd(24), res.join(' | '));
}
await b.close();
