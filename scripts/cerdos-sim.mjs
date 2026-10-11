// Balance check for Guille's pig tower (src/ui/cerdos.ts): simulated players with a precise,
// normal and clumsy sense of timing. Prints the result, rounds lost, slips and collapses.
// Usage: node scripts/cerdos-sim.mjs [historia|infinito] [games=3] [parallel=1]   (against npm run dev on :5173)
//   historia (default): the story's eight pigs; infinito: the minigames-menu version, which prints
//   how many pigs were stacked at the end and what cost the last heart (slips or collapses).
import { chromium } from 'playwright';
const modo = process.argv[2] === 'infinito' ? 'infinito' : 'historia';
const partidas = Number(process.argv[3]) || 3;
const paralelo = Number(process.argv[4]) || 1;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function jugar(sigma) {
  const page = await b.newPage({ viewport: { width: 844, height: 390 } });
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__cyc);
  await page.evaluate(() => window.__cyc.listo());
  await page.evaluate(async (modo) => { const g = window.__cyc.g; window.__cyc.titulo.remove(); g.estado.activo = 'guille'; g.poner('empezado.guille'); g.poner('basculaLista'); await g.irA('granja'); void import('/src/ui/cerdos.ts').then((m) => m.jugarCerdos(g.root, false, modo === 'infinito' ? { record: 0 } : undefined).then((r) => (window.__res = r))); }, modo);
  await page.waitForFunction(() => window.__cerdos);
  const t0 = Date.now();
  // Players aim where the pig will land (`prediccion`, the drift as it falls included) and tap
  // when it will be right over the tower, give or take their timing error: a human error, early
  // or late, of ±30 ms (precise), ±60 ms (normal) or ±100 ms (clumsy).
  const out = await page.evaluate(({ sigma, modo }) => new Promise((res) => {
    let previo = null;
    let cita = 0; // when the tap is due (performance.now), 0 for none
    let pico = 0; // most pigs stacked at any moment
    let causa = ''; // what cost the last heart
    let ant = { resbalones: 0, derrumbes: 0 };
    let cargaAntes = 0; // load ratio of the tower while the last pig hung (1 is the limit)
    const avisos = []; // for each collapse, the load it had before the pig that brought it down
    const gauss = () => Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random());
    const mira = () => {
      const e = window.__cerdos?.();
      if (e) {
        window.__ultimo = e;
        pico = Math.max(pico, e.colocados);
        if (e.resbalones > ant.resbalones) causa = 'resbalones';
        if (e.derrumbes > ant.derrumbes) {
          causa = 'derrumbes';
          avisos.push(cargaAntes);
        }
        if (e.colgando) cargaAntes = e.carga;
        ant = { resbalones: e.resbalones, derrumbes: e.derrumbes };
      }
      if (!e) return res({ fin: window.__res, ...window.__ultimo, pico, causa, avisos });
      if (e.rondasPerdidas >= 3 || (modo === 'infinito' && pico >= 40)) return res({ ...e, pico, causa, avisos, tope: true });
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
  }), { sigma, modo });
  await page.close();
  return { ...out, seg: (Date.now() - t0) / 1000 };
}

for (const [nombre, sigma] of [['preciso (±30 ms)', 30], ['normal (±60 ms)', 60], ['torpe (±100 ms)', 100]]) {
  const res = [];
  const cola = Array.from({ length: partidas }, (_, i) => i);
  await Promise.all(Array.from({ length: paralelo }, async () => {
    while (cola.length) {
      cola.shift();
      res.push(await jugar(sigma));
    }
  }));
  // Collapses that came with a warning (the tower was already at 55 % of the limit or more).
  const avisados = res.flatMap((o) => o.avisos ?? []);
  const aviso = `derrumbes con aviso previo (carga ≥ 0,55): ${avisados.filter((c) => c >= 0.55).length} de ${avisados.length}`;
  if (modo === 'historia') {
    console.log(nombre.padEnd(22), res.map((o) => `${o.fin ?? 'NO'} r${o.rondasPerdidas} resb${o.resbalones} derr${o.derrumbes} ${o.seg.toFixed(0)}s`).join(' | '));
    console.log(' '.repeat(22), `sin saltar: ${res.filter((o) => o.rondasPerdidas === 0).length} a la primera, ${res.filter((o) => o.rondasPerdidas === 1).length} con una ronda perdida, ${res.filter((o) => o.rondasPerdidas === 2).length} con dos, ${res.filter((o) => o.rondasPerdidas >= 3).length} sin terminar | ${aviso}`);
  } else {
    const media = (f) => (res.reduce((s, o) => s + f(o), 0) / res.length).toFixed(1);
    const porDerr = res.filter((o) => o.causa === 'derrumbes' && !o.tope).length;
    const porResb = res.filter((o) => o.causa === 'resbalones' && !o.tope).length;
    const topes = res.filter((o) => o.tope).length;
    console.log(nombre.padEnd(22), `n=${res.length} cerdos(pico) media ${media((o) => o.pico)} [${res.map((o) => o.pico).sort((a, c) => a - c).join(',')}] | último corazón: resbalones ${porResb}, derrumbes ${porDerr}, tope ${topes} | resb/partida ${media((o) => o.resbalones)}, derr/partida ${media((o) => o.derrumbes)} | ${aviso}`);
  }
}
await b.close();
