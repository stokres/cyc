// Offline tuning of "La ronda" (src/minigames/ronda.ts): a human-like controller
// with reaction delay. Usage: node scripts/ronda-sim.mjs
function run({ delay = 0.25, gain = 1, noise = 0.3, seed = 1, none = false, A = 1.5, C = 8.5, B = 2.4, G = 1, K = 1.25, F = 4.5, D = 1.1 }) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let th = 0, om = 0, t = 0, x = 505, phase = 0, u = 0; const levels = [1, 1, 1, 1]; const hist = [];
  const bumps = [560, 1180, 1700]; const bumped = new Set(); const dt = 1 / 60;
  while (x < 1910 && t < 60) {
    t += dt; hist.push([th, om]);
    const past = hist[Math.max(0, hist.length - 1 - Math.round(delay / dt))];
    let target = none ? 0 : Math.max(-1, Math.min(1, -(past[0] * F + past[1] * D) * gain + (rnd() - 0.5) * noise));
    u += (target - u) * Math.min(1, dt * 14);
    const ramp = Math.min(1, t / 3);
    const gust = (1.5 * Math.sin(t * 0.83 + 0.4) + 0.9 * Math.sin(t * 2.1 + 1.3) + 0.5 * Math.sin(t * 3.7)) * ramp * G;
    const wob = 0.9 * G * Math.sin(phase * 2);
    for (const b of bumps) if (!bumped.has(b) && x > b) { bumped.add(b); om += (rnd() < 0.5 ? -1 : 1) * 1.5 * G; }
    om += (A * th + gust + wob + C * u - B * om) * dt;
    th = Math.max(-0.62, Math.min(0.62, th + om * dt));
    const over = Math.abs(th) - 0.16;
    if (over > 0) for (let i = 0; i < 4; i++) levels[i] = Math.max(0, levels[i] - over * K * (1 + Math.abs(i - 1.5) * 0.25) * dt * (1 + Math.abs(om) * 0.4));
    const sp = 82 * (1 - Math.min(0.55, Math.abs(th) * 1.4)); x += sp * dt; phase += sp * dt / 57;
  }
  return { total: levels.reduce((a, b) => a + b).toFixed(2), t: t.toFixed(1) };
}

const avg = (o) => { let t = 0; for (let sd = 1; sd <= 6; sd++) t += +run({ ...o, seed: sd }).total; return (t / 6).toFixed(2); };
for (const P of [
  { A: 0.6, C: 3.2, B: 3.0, G: 0.55, K: 0.9 },
  { A: 0.5, C: 3.0, B: 3.2, G: 0.5, K: 0.8 },
  { A: 0.7, C: 3.5, B: 3.0, G: 0.6, K: 0.9 },
  { A: 0.8, C: 4, B: 3.2, G: 0.65, K: 1.0 },
]) {
  const row = [JSON.stringify(P), 'none', avg({ ...P, none: true })];
  for (const delay of [0.2, 0.3, 0.4]) for (const gain of [0.5, 1, 2]) row.push(`d${delay}g${gain}:${avg({ ...P, delay, gain })}`);
  console.log(row.join(' '));
}
