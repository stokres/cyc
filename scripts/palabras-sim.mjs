// Balance check for Pablo's battle of words (src/ui/palabras.ts): simulated players with a
// quick, normal and slow reaction see a negative word, watch it for a moment to judge where it
// is going, and slash where they expect it to be when their finger gets there, give or take
// their aim and their timing. Whatever else crosses that line gets cut too, the positive words
// included. Three games each (PARTIDAS=n for another number): the result, rounds lost, and how
// full the block meter got.
// Usage: node scripts/palabras-sim.mjs   (against npm run dev on :5173)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
/** Normal distribution, mean 0, deviation 1. */
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const PERFILES = [
  ['rápido (0,25 s, ±6 px)', 250, 6, 30],
  ['normal (0,4 s, ±10 px)', 400, 10, 55],
  ['lento (0,6 s, ±14 px)', 600, 14, 90],
];
for (const [nombre, reaccion, punteria, pulso] of PERFILES) {
  const res = [];
  for (let intento = 0; intento < Number(process.env.PARTIDAS || 3); intento++) {
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
    let perdidas = 0;
    // Words this player has just gone for, by their width (the same word keeps it).
    const vistas = new Set();
    const id = (q) => `${q.negativa}${Math.round(q.w)}`;
    const ver = () => page.evaluate(() => window.__palabras?.() ?? null);
    for (;;) {
      const e = await ver();
      if (!e) break;
      peor = Math.max(peor, e.bloqueo);
      perdidas = e.rondasPerdidas;
      if (e.rondasPerdidas >= 3 || Date.now() - t0 > 240000) break;
      // A negative word, well in view, that this player has not gone for yet.
      const p = e.palabras.find((q) => q.negativa && !q.cortada && q.y > 40 && q.y < 280 && !vistas.has(id(q)));
      if (!p) {
        await page.waitForTimeout(30);
        continue;
      }
      vistas.add(id(p));
      // A first look, then a second one to see which way it is going.
      const ta = Date.now();
      await page.waitForTimeout(80);
      const q = (await ver())?.palabras.find((o) => id(o) === id(p) && !o.cortada);
      const dt = (Date.now() - ta) / 1000;
      if (!q) continue;
      const vx = (q.x - p.x) / dt;
      const vy = (q.y - p.y) / dt;
      // The rest of the reaction, then the slash, aimed where the word should be by then:
      // the aim misses by up to a few pixels and the finger arrives a little early or late.
      const espera = Math.max(0, reaccion * (0.8 + Math.random() * 0.4) - 80);
      const llega = (espera + 25) / 1000 + (gauss() * pulso) / 1000;
      const x = q.x + vx * llega + gauss() * punteria * 0.5;
      const y = q.y + vy * llega + gauss() * punteria;
      if (y > 380) continue;
      await page.waitForTimeout(espera);
      const x0 = x - q.w / 2 - 12;
      const x1 = x + q.w / 2 + 12;
      await page.mouse.move(x0, y - 12);
      await page.mouse.down();
      await page.mouse.move(x1, y + 12, { steps: 4 });
      await page.mouse.up();
      // Missed? It can be gone for again in a moment.
      const k = id(p);
      setTimeout(() => vistas.delete(k), 400);
    }
    const fin = await page.evaluate(() => window.__res ?? null);
    res.push(`${fin ?? 'NO'} r${perdidas} bloqueo máx ${peor} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    await page.close();
  }
  console.log(nombre.padEnd(24), res.join(' | '));
}
await b.close();
