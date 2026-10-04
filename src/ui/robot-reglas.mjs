// Rules for Chuchi's minigame (src/ui/robot.ts): Robi, the play park's mascot
// robot, will not let him leave, and Chuchi shoots ball-pit balls at the power
// button on his head with the park's air cannon. A homage to the WarioWare
// microgame where you shoot bananas up a giant nose.
//
// Plain JavaScript with no DOM, so the balance simulator runs it in Node
// (scripts/robot-sim.mjs). Logical units: the screen is 1080 tall, `vw` wide.
//
// - Tap where to shoot: the ball takes VUELO seconds to get there, so a moving
//   button has to be led.
// - Six hits on the button and he switches off. Hitting his head or body only
//   bounces off; while his party hat is down over the button, so does that.
// - He keeps coming closer (for a hug); misses bring him a little closer (less
//   in the later stretches), hits push him back. If he gets to Chuchi, the round is lost.
// - Three stretches, by hits: swaying; faster, bobbing, and the party hat;
//   wild, hopping, and the hat more often.

export const H = 1080;
export const VUELO = 0.5;
export const META = 6;
/** Robot art units to logical px at the start (scaled up as he comes closer). */
export const ESCALA = 1.12;
/** The button's centre in the robot's art, from his feet (robot.mjs: neck + button). */
export const BOTON = { x: 0, y: -542, r: 30 };
/** Head and body, for the bounces: centres and radii in art units. */
export const CABEZA = { x: 0, y: -440, r: 135 };
export const CUERPO = { x: 0, y: -210, r: 140 };
/** Seconds between shots, and how close counts as on the button (× its radius). */
export const RECARGA = 0.28;
export const HOLGURA = 1.2;

export const tramo = (golpes) => (golpes < 2 ? 1 : golpes < 4 ? 2 : 3);

/** Where Robi's feet are and how big he looks, `t` seconds into his routine, `cerca` 0–1. */
export function robotEn(vw, golpes, t, cerca) {
  const T = tramo(golpes);
  let x = vw / 2;
  let y = 0;
  if (T === 1) x += vw * 0.17 * Math.sin(t * 0.9);
  if (T === 2) {
    x += vw * 0.22 * Math.sin(t * 1.35);
    y -= 22 * Math.sin(t * 2.7);
  }
  if (T === 3) {
    x += vw * 0.2 * Math.sin(t * 1.8) + vw * 0.07 * Math.sin(t * 4.1 + 1);
    y -= 46 * Math.abs(Math.sin(t * 3.1));
  }
  const s = ESCALA * (0.92 + 0.45 * cerca);
  return { x, y: 770 + 170 * cerca + y, s, inclina: 0.1 * Math.sin(t * 2.1) };
}

/** The party hat over the button: 0 up out of the way, 1 down covering it. */
export function gorro(golpes, t) {
  const T = tramo(golpes);
  if (T === 1) return 0;
  const v = T === 2 ? Math.sin(t * 0.95) : Math.sin(t * 1.45 + 0.6);
  const umbral = T === 2 ? 0.5 : 0.3;
  return Math.max(0, Math.min(1, (v - umbral) * 6));
}

/** Where a point of his art is on screen (his head tilts round the neck). */
export function aPantalla(R, px, py) {
  const cuello = -350;
  const dy = py - cuello;
  const enCabeza = py < cuello;
  const c = enCabeza ? Math.cos(R.inclina) : 1;
  const s = enCabeza ? Math.sin(R.inclina) : 0;
  const lx = px * c - dy * s;
  const ly = cuello + px * s + dy * c;
  return { x: R.x + lx * R.s, y: R.y + ly * R.s };
}

export function botonEn(vw, golpes, t, cerca) {
  const R = robotEn(vw, golpes, t, cerca);
  const p = aPantalla(R, BOTON.x, BOTON.y);
  return { x: p.x, y: p.y, r: BOTON.r * R.s, cubierto: gorro(golpes, t) > 0.5 };
}

/**
 * What a ball aimed at (x, y) does when it gets there at time `t`:
 * 'boton' (a hit), 'gorro' (bounced off the hat), 'robot' (off his head or body), 'fuera'.
 */
export function resultado(vw, golpes, t, cerca, x, y) {
  const R = robotEn(vw, golpes, t, cerca);
  const b = aPantalla(R, BOTON.x, BOTON.y);
  const d = Math.hypot(x - b.x, y - b.y);
  if (d < BOTON.r * R.s * HOLGURA) return gorro(golpes, t) > 0.5 ? 'gorro' : 'boton';
  for (const c of [CABEZA, CUERPO]) {
    const p = aPantalla(R, c.x, c.y);
    if (Math.hypot(x - p.x, y - p.y) < c.r * R.s) return 'robot';
  }
  return 'fuera';
}

/** How fast he comes closer (share of the way per second), per stretch, and per miss or hit. */
export const ACERCA = [0, 0.026, 0.034, 0.042];
/**
 * A miss, per stretch: it still costs (shooting non-stop loses), but less as he
 * gets wilder, so the last stretch leaves room for more tries.
 */
export const FALLO = [0, 0.03, 0.025, 0.02];
export const ACIERTO = -0.2;
