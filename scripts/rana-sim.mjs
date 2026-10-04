// Balance check for Fran's ham toss (src/ui/rana.ts, physics in
// src/ui/rana-fisica.mjs). For each stretch and screen width:
//   - how much of the pull space lands in the mouth (any release moment),
//   - the best throw found, and
//   - how often a player hits with that throw in mind but a human hand:
//     pull length ±5 %, angle ±2.5° and a random release moment.
// Runs in Node, no browser: node scripts/rana-sim.mjs
import { mundo, nuevoTaco, paso, perroEn, vientoEn, bocaAbierta, TIRON_MAX } from '../src/ui/rana-fisica.mjs';

function tiro(vw, tramo, px, py, t0) {
  const m = mundo(vw);
  const taco = nuevoTaco(m, px, py);
  let t = t0;
  for (let i = 0; i < 60 * 4; i++) {
    const dt = 1 / 60;
    const ev = paso(m, [taco], dt, { perroEn: (h) => perroEn(m, tramo, t + h), viento: vientoEn(tramo, t), bocaEn: (h) => bocaAbierta(tramo, t + h) });
    t += dt;
    if (ev.some((e) => e.ev === 'boca')) return true;
    if (taco.estado !== 'vuela') return false;
  }
  return false;
}

const gauss = () => Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random());

for (const vw of [1920, 2340]) {
  console.log(`\nPantalla ${vw} de ancho`);
  for (const tramo of [1, 2, 3, 4]) {
    // Pull space: down-left of the finger (throw up and right).
    const Ls = [];
    for (let L = 120; L <= TIRON_MAX; L += 6) Ls.push(L);
    const As = [];
    for (let a = 0; a <= 80; a += 2.5) As.push(a);
    const fases = tramo === 1 ? [0] : [0, 0.7, 1.4, 2.1, 2.8, 3.5];
    const k = Ls.map((L) => As.map((a) => {
      const r = (a * Math.PI) / 180;
      let n = 0;
      for (const t0 of fases) if (tiro(vw, tramo, -L * Math.cos(r), L * Math.sin(r), t0)) n++;
      return n / fases.length;
    }));
    const aciertos = k.flat().reduce((s, v) => s + v, 0);
    const total = k.flat().length;
    // The most forgiving throw: best on average with its neighbours.
    let mejor = null;
    for (let i = 1; i < Ls.length - 1; i++) {
      for (let j = 1; j < As.length - 1; j++) {
        let s = 0;
        for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) s += k[i + di][j + dj];
        if (!mejor || s > mejor.s) mejor = { s, L: Ls[i], a: As[j], k: k[i][j] };
      }
    }
    // A human with the best throw in mind.
    let bien = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const L = mejor.L * (1 + gauss() * 0.05);
      const r = ((mejor.a + gauss() * 2.5) * Math.PI) / 180;
      if (tiro(vw, tramo, -L * Math.cos(r), L * Math.sin(r), Math.random() * 20)) bien++;
    }
    console.log(
      `  tramo ${tramo}: ${((aciertos / total) * 100).toFixed(1).padStart(5)} % del espacio acierta · mejor tiro ${mejor.L}px a ${mejor.a}° (${(mejor.k * 100).toFixed(0)} %) · mano humana ${((bien / N) * 100).toFixed(0)} %`,
    );
  }
}
