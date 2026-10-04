// Balance check for Chuchi's minigame (src/ui/robot.ts, rules in
// src/ui/robot-reglas.mjs). Simulated players tap where they think the button
// will be when the ball gets there: they react late, misjudge the lead and the
// aim, and (the careful ones) wait for the party hat to go up.
// Prints, per kind of player, rounds won out of 40 and how long they took; and
// for the endless version (minigames menu), the average score and the best.
// Runs in Node, no browser: node scripts/robot-sim.mjs
import { VUELO, META, RECARGA, ACERCA, FALLO, tramo, botonEn, resultado, gorro, ritmo, empuje } from '../src/ui/robot-reglas.mjs';

const gauss = () => Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random());

function ronda(vw, j, infinito = false) {
  let t = 0;
  let golpes = 0;
  let cerca = 0;
  let espera = 0;
  const vuelan = [];
  const dt = 1 / 60;
  while (t < 600) {
    // Robi's routine clock runs faster past six hits (endless only); the player's does not.
    const r = ritmo(golpes);
    t += dt * r;
    espera -= dt * r;
    cerca += dt * ACERCA[tramo(golpes)] * r;
    for (const b of vuelan) {
      if (b.llega <= t && !b.hecho) {
        b.hecho = true;
        const r = resultado(vw, golpes, t, cerca, b.x, b.y);
        if (r === 'boton') {
          cerca = Math.max(0, cerca + empuje(golpes));
          golpes++;
        } else cerca += FALLO[tramo(golpes)];
      }
    }
    if (golpes >= META && !infinito) return { gana: true, t };
    if (cerca >= 1) return { gana: false, t, golpes };
    if (espera > 0) continue;
    // The player looks, decides and taps: late, and leading by a guess.
    const ve = t;
    const lead = VUELO * (j.lead + gauss() * j.dudaLead) + j.retraso;
    const B = botonEn(vw, golpes, ve + lead, cerca);
    if (j.paciente && gorro(golpes, ve + lead) > 0.3) {
      espera = 0.1;
      continue;
    }
    vuelan.push({ x: B.x + gauss() * j.punteria, y: B.y + gauss() * j.punteria, llega: ve + j.retraso + VUELO });
    espera = Math.max(RECARGA, j.ritmo + Math.random() * j.ritmo);
  }
  return { gana: false, t, golpes };
}

const JUGADORES = {
  'hábil (apunta por delante, paciente)': { lead: 1, dudaLead: 0.15, punteria: 14, retraso: 0.18, ritmo: 0.5, paciente: true },
  'normal (adelanta algo, dispara a ratos)': { lead: 0.8, dudaLead: 0.3, punteria: 22, retraso: 0.25, ritmo: 0.6, paciente: true },
  'del montón (adelanta poco, dispara aunque esté el gorro)': { lead: 0.6, dudaLead: 0.4, punteria: 30, retraso: 0.3, ritmo: 0.45, paciente: false },
  'a lo loco (no adelanta, dispara sin parar)': { lead: 0, dudaLead: 0.2, punteria: 30, retraso: 0.25, ritmo: 0.3, paciente: false },
};

for (const vw of [1920, 2340]) {
  console.log(`\nPantalla ${vw} de ancho`);
  for (const [nombre, j] of Object.entries(JUGADORES)) {
    let ganadas = 0;
    let tiempo = 0;
    for (let i = 0; i < 40; i++) {
      const r = ronda(vw, j);
      if (r.gana) {
        ganadas++;
        tiempo += r.t;
      }
    }
    console.log(`  ${nombre.padEnd(58)} gana ${String(ganadas).padStart(2)}/40${ganadas ? ` en ${(tiempo / ganadas).toFixed(0)} s` : ''}`);
  }
}

console.log('\nVersión sin fin (puntos = aciertos), pantalla 2340');
for (const [nombre, j] of Object.entries(JUGADORES)) {
  const puntos = Array.from({ length: 40 }, () => ronda(2340, j, true).golpes ?? 0);
  console.log(`  ${nombre.padEnd(58)} media ${String(Math.round(puntos.reduce((a, b) => a + b, 0) / puntos.length)).padStart(3)} · mejor ${Math.max(...puntos)}`);
}
