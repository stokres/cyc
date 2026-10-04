// Robi, the play park's mascot robot (Chuchi's story): a big retro toy robot,
// teal head with a screen face, orange barrel body on treads, accordion arms with
// claw hands and, on top of its head, a big round power button that glows when it
// is on. The minigame (src/ui/robot.ts) shoots ball-pit balls at that button.
//
// Drawn in parts with known pivots so the minigame can move them:
//   cuerpo  treads, legs, body, neck      origin on the floor between the treads
//   cabeza  head, face, ears, antenna, button   pivot at the neck (0, -350)
//   brazo   one arm, hanging down           pivot at the shoulder (0, 0)
// `robot()` puts them together for the scene. Units: logical px at depth 1;
// about 580 tall.
import { smooth, ellipse, path, stroke, g, shape, rrect } from './personajes/svg.mjs';

const TEAL = { base: '#3fb8c8', shadow: '#2a8e9c', light: '#7ad8e4', line: '#145660' };
const NARANJA = { base: '#f08a3a', shadow: '#c86a24', light: '#ffb06a', line: '#6a3410' };
const CREMA = { base: '#f2ead8', shadow: '#d6ccb4', light: '#fffaf0', line: '#7a705a' };
const GRIS = { base: '#5a6070', shadow: '#40444f', light: '#7a8090', line: '#1e2028' };

export const CUELLO = { x: 0, y: -350 };
export const HOMBROS = [{ x: -126, y: -300 }, { x: 126, y: -300 }];
/** The power button's centre in the head's coordinates (pivot at the neck). */
export const BOTON = { x: 0, y: -192, r: 26 };

/** Treads, legs, body and neck. */
export function cuerpo({ encendido = false } = {}) {
  const out = [];
  // Treads and wheels.
  out.push(shape(rrect(0, -34, 118, 34, 30), GRIS.base, [path(rrect(0, -14, 118, 14, 12), GRIS.shadow)], GRIS.line, 2.4));
  for (const x of [-80, -27, 27, 80]) out.push(shape(ellipse(x, -34, 22, 22), '#2a2e38', [path(ellipse(x - 4, -38, 9, 9), '#6a7080')], '#101218', 2));
  // Stubby legs.
  for (const x of [-48, 48]) out.push(shape(rrect(x, -92, 26, 30, 8), CREMA.base, [path(rrect(x + 10, -92, 8, 30, 4), CREMA.shadow)], CREMA.line, 2));
  // Orange barrel body.
  out.push(shape(rrect(0, -222, 122, 112, 46), NARANJA.base, [
    path(rrect(70, -222, 50, 112, 40), NARANJA.shadow, { opacity: 0.8 }),
    path(rrect(-60, -300, 50, 22, 14), NARANJA.light, { opacity: 0.8 }),
  ], NARANJA.line, 3));
  // Chest panel: lights, a star, a speaker grille.
  out.push(shape(rrect(0, -236, 82, 58, 18), CREMA.base, [path(rrect(56, -236, 26, 58, 12), CREMA.shadow)], CREMA.line, 2.4));
  const luces = ['#e8452e', '#f5c95f', '#5ad08a', '#5aa8ff'];
  luces.forEach((c, i) => out.push(shape(ellipse(-51 + i * 34, -270, 11, 11), encendido ? c : '#8a8478', [], CREMA.line, 1.6)));
  const st = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 13 : 30;
    st.push([Math.cos(a) * r, -220 + Math.sin(a) * r, 'c']);
  }
  out.push(shape(smooth(st), encendido ? '#ffd23a' : '#c8b47a', [], '#8a6a10', 2));
  for (let i = 0; i < 4; i++) out.push(stroke(`M${-50} ${-186 + i * 9}L50 ${-186 + i * 9}`, CREMA.shadow, 3.4));
  // Accordion neck.
  for (let i = 0; i < 3; i++) out.push(shape(rrect(0, -340 + i * 10, 34 - i * 2, 7, 4), GRIS.light, [], GRIS.line, 1.6));
  return out.join('');
}

/** Head on its neck pivot (0, 0 here is the neck). `ojos`: 'apagado', 'encendido', 'mareo', 'x'. */
export function cabeza({ ojos = 'apagado', boton = 'apagado' } = {}) {
  const out = [];
  // Antenna with a ball.
  out.push(stroke('M70 -165L96 -232', GRIS.base, 6), shape(ellipse(98, -238, 13, 13), ojos === 'apagado' || ojos === 'x' ? '#8a8478' : '#ff5a8a', [], GRIS.line, 2));
  // Ear bolts.
  for (const s of [-1, 1]) out.push(shape(rrect(s * 134, -92, 16, 34, 8), NARANJA.base, [path(rrect(s * 140, -92, 8, 34, 4), NARANJA.shadow)], NARANJA.line, 2.4));
  // The head and its screen face.
  out.push(shape(rrect(0, -92, 128, 84, 48), TEAL.base, [
    path(rrect(78, -92, 50, 84, 40), TEAL.shadow, { opacity: 0.85 }),
    path(rrect(-56, -160, 52, 12, 8), TEAL.light, { opacity: 0.9 }),
  ], TEAL.line, 3));
  out.push(shape(rrect(0, -88, 100, 58, 30), '#16203a', [path(rrect(-40, -128, 40, 10, 6), '#2e3e64', { opacity: 0.8 })], '#0a1020', 2.4));
  // Eyes and mouth on the screen.
  for (const s of [-1, 1]) {
    const x = s * 46;
    if (ojos === 'encendido') out.push(path(ellipse(x, -100, 26, 26), '#5af0ff', { opacity: 0.35 }), path(ellipse(x, -100, 18, 18), '#aaf8ff'), path(ellipse(x + 5, -105, 6, 6), '#ffffff'));
    else if (ojos === 'mareo') out.push(stroke(`M${x} -100m-16 0a16 16 0 1 1 16 16a10 10 0 1 1 -10 -10a5 5 0 1 1 5 5`, '#aaf8ff', 4));
    else if (ojos === 'x') out.push(stroke(`M${x - 15} -115L${x + 15} -85M${x + 15} -115L${x - 15} -85`, '#ff5a4a', 6));
    else out.push(path(ellipse(x, -100, 18, 18), '#2a3654'));
  }
  if (ojos === 'encendido') out.push(stroke('M-40 -58Q0 -34 40 -58', '#aaf8ff', 6));
  else if (ojos === 'mareo') out.push(stroke('M-40 -52Q-20 -64 0 -52T40 -52', '#aaf8ff', 5));
  else out.push(stroke('M-36 -52L36 -52', ojos === 'x' ? '#ff5a4a' : '#2a3654', 5));
  // The power button on top, in its housing: what the minigame aims at.
  out.push(shape(rrect(BOTON.x, BOTON.y + 18, 48, 16, 12), GRIS.base, [path(rrect(BOTON.x, BOTON.y + 26, 48, 8, 6), GRIS.shadow)], GRIS.line, 2.4));
  const on = boton === 'encendido';
  const flash = boton === 'golpe';
  out.push(shape(ellipse(BOTON.x, BOTON.y + 4, BOTON.r + 6, BOTON.r * 0.95), flash ? '#ffffff' : on ? '#ff3a3a' : '#7a5a5a', [
    path(ellipse(BOTON.x - 8, BOTON.y - 6, 10, 7), on || flash ? '#ffd0d0' : '#a08080', { opacity: 0.9 }),
  ], on ? '#8a1010' : '#3a2a2a', 2.4));
  // The power symbol on it.
  out.push(stroke(`M${BOTON.x} ${BOTON.y - 12}L${BOTON.x} ${BOTON.y + 2}M${BOTON.x - 11} ${BOTON.y - 7}A14 14 0 1 0 ${BOTON.x + 11} ${BOTON.y - 7}`, on || flash ? '#fff4f0' : '#4a3a3a', 4));
  return out.join('');
}

/** One arm hanging from its shoulder at (0, 0): accordion tube and a three-finger claw. `zapato`: holding the shoe. */
export function brazo({ zapato = false } = {}) {
  const out = [];
  for (let i = 0; i < 7; i++) out.push(shape(rrect(0, 12 + i * 20, 22 - (i % 2) * 2, 11, 6), i % 2 ? GRIS.light : GRIS.base, [], GRIS.line, 1.6));
  out.push(shape(ellipse(0, 6, 24, 24), NARANJA.base, [path(ellipse(6, 10, 14, 14), NARANJA.shadow)], NARANJA.line, 2.4));
  // Claw.
  out.push(shape(rrect(0, 160, 26, 16, 8), CREMA.base, [], CREMA.line, 2));
  for (const a of [-0.5, 0, 0.5]) out.push(stroke(`M${Math.sin(a) * 14} 172Q${Math.sin(a) * 30} 196 ${Math.sin(a) * 22} 214`, CREMA.line, 9), stroke(`M${Math.sin(a) * 14} 172Q${Math.sin(a) * 30} 196 ${Math.sin(a) * 22} 214`, CREMA.base, 6));
  if (zapato) out.push(`<g transform="translate(0 214) rotate(180) scale(1.1)">${zapatoBrilli()}</g>`);
  return out.join('');
}

/**
 * The little one's party shoe: pink, with a strap, glitter and a light in the
 * sole, centred on (0, 0), ~70 long.
 */
export function zapatoBrilli({ luz = true } = {}) {
  const out = [];
  out.push(shape(smooth([[-34, 6, 'c'], [-36, -10], [-24, -22], [-6, -20], [10, -10], [30, -6], [38, 2], [34, 10, 'c']]), '#f27aa8', [
    path(smooth([[-34, 2], [34, 2], [34, 10], [-34, 10]]), '#d4588a'),
    path(smooth([[-22, -18], [-6, -18], [-10, -8], [-24, -10]]), '#ffb0cc', { opacity: 0.8 }),
  ], '#7a1e44', 1.6));
  out.push(path(rrect(0, 10, 36, 4, 3), luz ? '#fff07a' : '#e8d8c8'));
  out.push(stroke('M-8 -18Q4 -30 14 -12', '#7a1e44', 4), stroke('M-8 -18Q4 -30 14 -12', '#ffd6e6', 2));
  // Glitter.
  for (const [x, y, r] of [[-20, -8, 2.4], [-4, -12, 1.8], [12, -4, 2.2], [24, 0, 1.6], [-14, 0, 1.6], [4, 2, 2]]) out.push(path(ellipse(x, y, r, r), '#fff6fb'));
  return out.join('');
}

/**
 * The whole robot for the scene. `estado`: 'apagado' (on its pedestal, head
 * down), 'encendido' (arms out, the shoe up in one claw), 'vencido' (slumped,
 * X eyes).
 */
export function robot({ estado = 'apagado' } = {}) {
  const on = estado === 'encendido';
  // Degrees, clockwise: an arm hanging down turned 150 points up and out to the left.
  const brazoI = on ? 150 : estado === 'vencido' ? 14 : 6;
  const brazoD = on ? -100 : estado === 'vencido' ? -16 : -6;
  const cab = estado === 'apagado' ? 8 : estado === 'vencido' ? 22 : -4;
  return g(null, [
    g(null, brazo({ zapato: on }), { transform: `translate(${HOMBROS[0].x} ${HOMBROS[0].y}) rotate(${brazoI})` }),
    cuerpo({ encendido: on }),
    g(null, brazo(), { transform: `translate(${HOMBROS[1].x} ${HOMBROS[1].y}) rotate(${brazoD})` }),
    g(null, cabeza({ ojos: on ? 'encendido' : estado === 'vencido' ? 'x' : 'apagado', boton: on ? 'encendido' : 'apagado' }), { transform: `translate(${CUELLO.x} ${CUELLO.y}) rotate(${cab})` }),
  ], estado === 'vencido' ? { transform: 'translate(0 40) rotate(-6)' } : {});
}
