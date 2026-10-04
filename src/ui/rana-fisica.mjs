// Physics for «La rana de Aceituna» (src/ui/rana.ts): Fran tosses cubes of ham
// across the living room into Aceituna's open mouth, like the bar game where you
// throw coins into a frog's mouth.
//
// Plain JavaScript with no DOM, so the balance simulator can run it in Node
// (scripts/rana-sim.mjs). Logical units: the screen is 1080 tall, `vw` wide.
//
// - Gravity, quadratic air drag and, in the last stretch, a draught from the
//   terrace door that pushes sideways.
// - The ham bounces off the floor, the walls, the ceiling, the back of the
//   armchair, the arc lamp's pole and arm, and the lamp's shade, which hangs from
//   a cable and swings like a pendulum when it is hit.
// - It is caught when it reaches the open mouth; it bounces off her head.
// - Fixed sub-steps of 1/240 s, so fast throws do not tunnel through anything.

export const H = 1080;
export const SUELO = 944;
export const G = 2400;
/** Quadratic air drag: a = −k·|v|·v. */
export const ARRASTRE = 0.00008;
export const R_TACO = 16;
/** Slingshot: the longest pull counted (logical px) and speed per px of pull. */
export const TIRON_MAX = 300;
export const K_TIRO = 10;
const PASO = 1 / 240;

/**
 * Aceituna sitting on her bed, relative to her anchor (between her front paws,
 * on the cushion), facing left, in logical px. Matches the art in rana.ts
 * (aceituna.mjs `sentada`, drawn mirrored at ESCALA_PERRO).
 */
export const PERRO = {
  boca: { dx: -86, dy: -268, r: 50 },
  cabeza: { dx: -12, dy: -312, r: 60 },
  cuerpo: { dx: 18, dy: -140, r: 92 },
};
/** Height of the bed's cushion above the floor. */
export const CAMA = 64;

/** The room for a screen `vw` wide: where everything is. */
export function mundo(vw) {
  const ancla = { x: Math.round(vw * 0.14), y: 660 };
  const sofa = { x0: Math.round(vw * 0.25), x1: Math.round(vw * 0.25) + 320, top: 600, r: 56 };
  // The arc lamp stands behind Fran: its pole is out of the way, its arm and
  // shade hang over the middle of the room.
  const base = Math.round(vw * 0.06);
  const pivote = { x: Math.round(vw * 0.46), y: 120 };
  const arco = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    // Quadratic curve from the top of the pole to the end of the arm.
    const p0 = { x: base, y: 170 };
    const c = { x: base + (pivote.x - base) * 0.35, y: -40 };
    arco.push({ x: (1 - u) * (1 - u) * p0.x + 2 * u * (1 - u) * c.x + u * u * pivote.x, y: (1 - u) * (1 - u) * p0.y + 2 * u * (1 - u) * c.y + u * u * pivote.y });
  }
  const perro = { x: Math.round(vw * 0.84), y: SUELO - CAMA };
  return {
    vw,
    ancla,
    sofa,
    lampara: { base, pivote, arco, cable: 190, r: 50, th: 0, w: 0 },
    poste: { x0: base, y0: SUELO, x1: base, y1: 170, r: 9 },
    perro,
    cama: { x0: perro.x - 190, x1: perro.x + 190, top: SUELO - CAMA + 8, r: 30 },
  };
}

/**
 * Where Aceituna's anchor is in each stretch of the game, `t` seconds in:
 *   1. still, mouth wide open;
 *   2. swaying from side to side on her bed;
 *   3. snapping: the mouth opens and shuts (see bocaAbierta) and she bobs;
 *   4. all of it, with the draught from the terrace (see vientoEn).
 */
export function perroEn(m, tramo, t) {
  let x = m.perro.x;
  let y = m.perro.y;
  if (tramo === 2) x += Math.sin(t * 1.7) * 85;
  if (tramo === 3) {
    x += Math.sin(t * 1.1) * 30;
    y -= Math.abs(Math.sin(t * Math.PI / CICLO_BOCA)) * 30;
  }
  if (tramo === 4) {
    x += Math.sin(t * 1.5) * 70;
    y -= Math.abs(Math.sin(t * 2.1)) * 30;
  }
  return { x, y };
}

/** Seconds in one open-and-shut of her mouth, from the third stretch on. */
export const CICLO_BOCA = 1.5;

/** Is her mouth open? Always in the first two stretches; then most of the time. */
export function bocaAbierta(tramo, t) {
  if (tramo < 3) return true;
  return ((t % CICLO_BOCA) + CICLO_BOCA) % CICLO_BOCA < CICLO_BOCA * (tramo === 3 ? 0.6 : 0.65);
}

/** The draught from the terrace in the last stretch: sideways acceleration. */
export function vientoEn(tramo, t) {
  if (tramo < 4) return 0;
  return 440 * Math.sin(t * 0.7) + 140 * Math.sin(t * 1.9 + 1);
}

/** A slingshot pull (finger minus where it went down) gives the launch velocity: the opposite way. */
export function velocidadDeTiro(px, py) {
  const l = Math.hypot(px, py);
  const k = l > TIRON_MAX ? TIRON_MAX / l : 1;
  return { vx: -px * k * K_TIRO, vy: -py * k * K_TIRO };
}

export function nuevoTaco(m, px, py) {
  const { vx, vy } = velocidadDeTiro(px, py);
  return { x: m.ancla.x, y: m.ancla.y, vx, vy, ang: 0, w: vx * 0.006, estado: 'vuela', quieto: 0, t: 0 };
}

/** The lamp shade's centre and velocity. */
export function pantalla(L) {
  const s = Math.sin(L.th);
  const c = Math.cos(L.th);
  return { x: L.pivote.x + L.cable * s, y: L.pivote.y + L.cable * c, vx: L.cable * L.w * c, vy: -L.cable * L.w * s };
}

function avanzarLampara(L, h) {
  L.w += (-(G / L.cable) * Math.sin(L.th) - 0.6 * L.w) * h;
  L.th += L.w * h;
}

/** Push the ham out of a contact with normal n (pointing at the ham) and bounce. */
function rebotar(t, nx, ny, pen, e, fr, ovx = 0, ovy = 0) {
  t.x += nx * pen;
  t.y += ny * pen;
  const rvx = t.vx - ovx;
  const rvy = t.vy - ovy;
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) return 0;
  const tx = -ny;
  const ty = nx;
  const vt = rvx * tx + rvy * ty;
  const nvt = vt * (1 - fr);
  t.vx = ovx + tx * nvt - nx * vn * e;
  t.vy = ovy + ty * nvt - ny * vn * e;
  // Rolling: the spin follows the sliding speed along the surface.
  t.w = t.w * 0.4 + (nvt / R_TACO) * 0.6;
  return -vn;
}

function contraSegmento(t, x0, y0, x1, y1, r) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const u = Math.max(0, Math.min(1, ((t.x - x0) * dx + (t.y - y0) * dy) / (dx * dx + dy * dy || 1)));
  const cx = x0 + dx * u;
  const cy = y0 + dy * u;
  const d = Math.hypot(t.x - cx, t.y - cy);
  const lim = r + R_TACO;
  if (d >= lim) return null;
  const n = d > 1e-6 ? [(t.x - cx) / d, (t.y - cy) / d] : [0, -1];
  return { nx: n[0], ny: n[1], pen: lim - d };
}

/** Rounded box from x0..x1, top..floor, corners of radius r. */
function contraCaja(t, b) {
  const ix0 = b.x0 + b.r;
  const ix1 = b.x1 - b.r;
  const iy0 = b.top + b.r;
  const cx = Math.max(ix0, Math.min(ix1, t.x));
  const cy = Math.max(iy0, Math.min(SUELO + 400, t.y));
  const d = Math.hypot(t.x - cx, t.y - cy);
  const lim = b.r + R_TACO;
  if (d >= lim) return null;
  const n = d > 1e-6 ? [(t.x - cx) / d, (t.y - cy) / d] : [0, -1];
  return { nx: n[0], ny: n[1], pen: lim - d };
}

function contraCirculo(t, x, y, r) {
  const d = Math.hypot(t.x - x, t.y - y);
  const lim = r + R_TACO;
  if (d >= lim) return null;
  const n = d > 1e-6 ? [(t.x - x) / d, (t.y - y) / d] : [0, -1];
  return { nx: n[0], ny: n[1], pen: lim - d };
}

/**
 * One sub-step for one piece of ham. `c`: { perro: {x, y, vx, vy}, viento,
 * boca (is the mouth open), lampara (move the shade when hit) }.
 * Returns what it touched, if anything: 'boca', 'hocico', 'cabeza', 'perro', 'suelo',
 * 'pared', 'techo', 'sofa', 'lampara', 'poste', 'cama'.
 */
function pasoTaco(m, t, h, c) {
  const v = Math.hypot(t.vx, t.vy);
  t.vx += (c.viento - ARRASTRE * v * t.vx) * h;
  t.vy += (G - ARRASTRE * v * t.vy) * h;
  t.x += t.vx * h;
  t.y += t.vy * h;
  t.ang += t.w * h;
  t.t += h;
  let ev = null;
  // Into the mouth: caught.
  const P = c.perro;
  if (c.boca && Math.hypot(t.x - (P.x + PERRO.boca.dx), t.y - (P.y + PERRO.boca.dy)) < PERRO.boca.r) return 'boca';
  // Shut: the ham bounces off her snout.
  const k0 = c.boca ? null : contraCirculo(t, P.x + PERRO.boca.dx, P.y + PERRO.boca.dy, PERRO.boca.r * 0.7);
  if (k0 && rebotar(t, k0.nx, k0.ny, k0.pen, 0.5, 0.2, P.vx, P.vy) > 120) ev = 'hocico';
  const k1 = contraCirculo(t, P.x + PERRO.cabeza.dx, P.y + PERRO.cabeza.dy, PERRO.cabeza.r);
  if (k1 && rebotar(t, k1.nx, k1.ny, k1.pen, 0.5, 0.2, P.vx, P.vy) > 120) ev ??= 'cabeza';
  const k2 = contraCirculo(t, P.x + PERRO.cuerpo.dx, P.y + PERRO.cuerpo.dy, PERRO.cuerpo.r);
  if (k2 && rebotar(t, k2.nx, k2.ny, k2.pen, 0.35, 0.3, P.vx, P.vy) > 120) ev ??= 'perro';
  const k3 = contraCaja(t, m.cama);
  if (k3 && rebotar(t, k3.nx, k3.ny, k3.pen, 0.2, 0.5) > 120) ev ??= 'cama';
  const k4 = contraCaja(t, m.sofa);
  if (k4 && rebotar(t, k4.nx, k4.ny, k4.pen, 0.3, 0.35) > 120) ev ??= 'sofa';
  const p = m.poste;
  const k5 = contraSegmento(t, p.x0, p.y0, p.x1, p.y1, p.r);
  if (k5 && rebotar(t, k5.nx, k5.ny, k5.pen, 0.6, 0.1) > 120) ev ??= 'poste';
  const A = m.lampara.arco;
  for (let i = 1; i < A.length; i++) {
    const k = contraSegmento(t, A[i - 1].x, A[i - 1].y, A[i].x, A[i].y, 8);
    if (k && rebotar(t, k.nx, k.ny, k.pen, 0.6, 0.1) > 120) ev ??= 'poste';
  }
  // The shade: a pendulum that takes some of the blow.
  const L = m.lampara;
  const S = pantalla(L);
  const k6 = contraCirculo(t, S.x, S.y, L.r);
  if (k6) {
    const antes = { vx: t.vx, vy: t.vy };
    const golpe = rebotar(t, k6.nx, k6.ny, k6.pen, 0.55, 0.15, S.vx, S.vy);
    if (c.lampara && golpe) {
      // Momentum the ham lost goes into the swing (the shade is three times heavier).
      const dvx = antes.vx - t.vx;
      const dvy = antes.vy - t.vy;
      L.w += ((dvx * Math.cos(L.th) - dvy * Math.sin(L.th)) / L.cable) * 0.33;
    }
    if (golpe > 120) ev ??= 'lampara';
  }
  // The room: floor, walls and ceiling.
  if (t.y + R_TACO > SUELO) {
    const g = rebotar(t, 0, -1, t.y + R_TACO - SUELO, 0.38, 0.25);
    if (g > 160) ev ??= 'suelo';
  }
  if (t.y - R_TACO < 0) rebotar(t, 0, 1, R_TACO - t.y, 0.4, 0.1) > 120 && (ev ??= 'techo');
  if (t.x - R_TACO < 0) rebotar(t, 1, 0, R_TACO - t.x, 0.45, 0.1) > 120 && (ev ??= 'pared');
  if (t.x + R_TACO > m.vw) rebotar(t, -1, 0, t.x + R_TACO - m.vw, 0.45, 0.1) > 120 && (ev ??= 'pared');
  // At rest on the floor (or anywhere): it stops counting.
  if (Math.hypot(t.vx, t.vy) < 40) {
    t.quieto += h;
    if (t.quieto > 0.25) t.estado = 'quieto';
  } else t.quieto = 0;
  return ev;
}

/**
 * Advance the room by `dt` seconds: the lamp and every piece of ham still
 * flying or rolling. `c.perroEn(h)` gives the dog's anchor `h` seconds into the
 * step (so a hopping dog is where it really is at each sub-step), `c.bocaEn(h)`
 * whether her mouth is open then.
 * Returns [{ taco, ev }] for everything that happened.
 */
export function paso(m, tacos, dt, c) {
  const n = Math.max(1, Math.ceil(dt / PASO - 1e-6));
  const h = dt / n;
  const eventos = [];
  for (let i = 0; i < n; i++) {
    avanzarLampara(m.lampara, h);
    const a = c.perroEn(i * h);
    const b = c.perroEn((i + 1) * h);
    const perro = { x: b.x, y: b.y, vx: (b.x - a.x) / h, vy: (b.y - a.y) / h };
    for (const t of tacos) {
      if (t.estado !== 'vuela') continue;
      const ev = pasoTaco(m, t, h, { perro, viento: c.viento, boca: c.bocaEn((i + 1) * h), lampara: true });
      if (ev === 'boca') t.estado = 'comido';
      if (ev) eventos.push({ taco: t, ev });
    }
  }
  return eventos;
}

/**
 * Where a throw would go: the path of a piece of ham with this pull, for up to
 * `tmax` seconds or until it first touches something. The dog and the shade stay
 * where they are now. Used for the dotted aim line and by the simulators.
 */
export function trayectoria(m, px, py, c, tmax = 3, cada = 1 / 30) {
  const t = nuevoTaco(m, px, py);
  const L = m.lampara;
  const copia = { ...m, lampara: { ...L } };
  const puntos = [{ x: t.x, y: t.y, t: 0 }];
  let siguiente = cada;
  let ev = null;
  while (t.t < tmax && !ev) {
    ev = pasoTaco(copia, t, PASO, { perro: { ...c.perro, vx: 0, vy: 0 }, viento: c.viento, boca: c.boca ?? true, lampara: false });
    if (t.t >= siguiente || ev) {
      puntos.push({ x: t.x, y: t.y, t: t.t });
      siguiente += cada;
    }
  }
  return { puntos, ev };
}
