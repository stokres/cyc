// Difficulty check of the chapter 2 Pang (src/pang/capitulo.ts): the computer plays the stages
// with a delay between its decisions (0.05 s is a machine, 0.25 s a person on a phone) and the
// script counts the lives it loses on each stage and how long the winning attempt lasts.
// The target (docs/CAPITULO2.md): a normal player clears each stage in one to three games, and a
// game is three lives, so up to eight lives lost (or nine with a bit of luck) before the stage falls.
//
// Time is virtual (requestAnimationFrame and performance.now are replaced), so a run takes
// seconds, not minutes. Against `npm run dev`:
//   PUERTO=5177 node scripts/pang-sim.mjs [reaccion=0.25] [partidas=20] [fase=0..2, default all in a row]
//   DEBUG=1 prints every lost life (cause, time left, bubbles, boss hit points).
import { chromium } from 'playwright';

const reaccion = Number(process.argv[2] ?? 0.25);
const partidas = Number(process.argv[3] ?? 20);
const solo = process.argv[4] !== undefined;
const fase0 = Number(process.argv[4] ?? 0);
const puerto = process.env.PUERTO ?? 5173;
const depurar = !!process.env.DEBUG;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(String(e)));
if (depurar) page.on('console', (m) => console.log(m.text()));
// A bare page on the dev server's origin, so the game's modules can be imported without the chapter running.
await page.route(`http://localhost:${puerto}/vacio.html`, (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><body style="margin:0"></body>' }));
await page.goto(`http://localhost:${puerto}/vacio.html`);

const filas = await page.evaluate(async ({ reaccion, partidas, solo, fase0, depurar }) => {
  const { jugarPangCapitulo } = await import('/src/pang/capitulo.ts');
  let vt = 1000;
  let cola = [];
  let id = 0;
  window.requestAnimationFrame = (f) => {
    cola.push([++id, f]);
    return id;
  };
  window.cancelAnimationFrame = (i) => {
    cola = cola.filter(([k]) => k !== i);
  };
  performance.now = () => vt;
  // The pixels do not matter to the rules: nothing is painted (sizes of sprites and canvases are unchanged), which is much faster.
  for (const k of ['drawImage', 'fillRect', 'fillText', 'strokeText', 'clearRect']) CanvasRenderingContext2D.prototype[k] = function () {};
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const res = [];
  for (let n = 0; n < partidas; n++) {
    let fin = null;
    jugarPangCapitulo(document.body, { fase: fase0, control: 'bot', reaccion, rapido: true }).then((r) => (fin = r));
    // fase: a number skips the entrance; the stages that follow come in order.
    const perdidas = [0, 0, 0];
    const segundos = [0, 0, 0];
    const porTiempo = [0, 0, 0];
    let faseVista = fase0;
    let herido = false;
    let marco = 0;
    const limite = 60 * 60 * 12;
    let f = 0;
    for (; f < limite && !fin; f++) {
      if (!cola.length) {
        await dormir(2);
        f--;
        continue;
      }
      vt += 1000 / 60;
      const lote = cola;
      cola = [];
      for (const [, cb] of lote) cb(vt);
      const e = window.__pang?.();
      if (!e) continue;
      if (e.partida) {
        const mu = e.partida.mundo;
        const ahora = e.partida.fotograma === 'herido';
        if (ahora && !herido) {
          perdidas[e.fase]++;
          if (e.partida.causa === 'tiempo') porTiempo[e.fase]++;
          marco = f;
          // Too many lives lost for this to be fun (four games): count it as failed and stop.
          if (perdidas[e.fase] >= 12) document.querySelector('.cerrar')?.click();
          if (depurar) {
            const j = mu.jugadores[0];
            console.log(`pierde (fase ${e.fase}): causa=${e.partida.causa} tiempo=${mu.tiempo.toFixed(0)} x=${j.x.toFixed(0)} burbujas=${mu.burbujas.length} jefe=${mu.jefe ? mu.jefe.hp.toFixed(0) : '-'}`);
          }
        }
        herido = ahora;
      }
      if (e.momento === 'victoria' && !segundos[2]) segundos[2] = (f - marco) / 60;
      if (e.fase !== faseVista) {
        segundos[faseVista] = (f - marco) / 60;
        marco = f;
        faseVista = e.fase;
        if (solo) document.querySelector('.cerrar')?.click();
      }
    }
    res.push({ fin: fin ?? 'sin terminar', perdidas, porTiempo, segundos, total: f / 60 });
    window.__pang = undefined;
    document.body.replaceChildren();
    cola = [];
  }
  return res;
}, { reaccion, partidas, solo, fase0, depurar });

const media = (l) => (l.reduce((x, y) => x + y, 0) / Math.max(1, l.length)).toFixed(1);
console.log(`reacción ${reaccion} s · ${partidas} intentos`);
for (const [i, nombre] of ['1 Usera (dragón)', '2 piso de Fran', '3 Las Vegas (Penúltima)'].entries()) {
  if (solo && i !== fase0) continue;
  // The runs that got to the stage: those that lost 12 lives there gave up (four games).
  const l = filas.filter((r) => (solo || i === 0 ? true : r.perdidas.slice(0, i).every((v) => v < 12)));
  const vidas = l.map((r) => r.perdidas[i]);
  const rendidos = vidas.filter((v) => v >= 12).length;
  const ganados = l.filter((r) => r.perdidas[i] < 12);
  const partidasN = ganados.map((r) => Math.floor(r.perdidas[i] / 3) + 1);
  const pct = (n) => `${((100 * n) / Math.max(1, l.length)).toFixed(0)} %`;
  console.log(
    `fase ${nombre.padEnd(26)} vidas perdidas (media, con tope 12): ${media(vidas)} · en 1 partida ${pct(partidasN.filter((x) => x === 1).length)}, en 2 ${pct(partidasN.filter((x) => x === 2).length)}, en 3 ${pct(partidasN.filter((x) => x === 3).length)}, en más ${pct(rendidos + partidasN.filter((x) => x > 3).length)} · partida ganadora: ${media(ganados.map((r) => r.segundos[i]))} s · vidas por tiempo: ${l.reduce((x, r) => x + r.porTiempo[i], 0)} de ${l.reduce((x, r) => x + r.perdidas[i], 0)}`,
  );
}
if (errores.length) console.log('ERRORES', errores.slice(0, 5).join('\n'));
await b.close();
