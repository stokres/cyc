// PokéUsera · Edición Jarra (arte v2): the three sample useritos at 64×64 — front, back, two idle frames.
// Every drawing is a function of the painter, which knows if it is a back view (`P.espalda`) and which
// idle frame it is (`P.f`, 0 or 1). Each one uses at most 16 colours (checked by `P.numColores`).
import { LOTE_A } from './useritos2-a';
import { LOTE_B } from './useritos2-b';
import { LOTE_C } from './useritos2-c';
import { LOTE_D } from './useritos2-d';
import { LOTE_E } from './useritos2-e';
import { LOTE_F } from './useritos2-f';
import { Pintor, Mascara, bez3, cur, el, espejo, mover, par, poli, rc, rr, trazo, un, men, inter, lin, type Mat } from './pintor';

export interface Dibujo2 {
  id: string;
  nombre: string;
  dibujar: (P: Pintor) => void;
}

/** Fills `m` mirrored on a 64-wide canvas, keeping the original too. */

// ---------------------------------------------------------------------------------------------
// Ego-Ego · purple ghost with sunglasses and a gold chain, very full of itself, flexing.
// ---------------------------------------------------------------------------------------------
const FANTASMA: Mat = { r: ['#4a2890', '#7646c8', '#a374e8', '#d2b4fa'], ol: '#1f0e44', ol2: '#4a2890', rim: '#8fe0ff' };
const ORO: Mat = { r: ['#8a4e10', '#d98a1c', '#ffd048', '#fff2a8'], ol: '#3a1c06', ol2: '#8a4e10' };
const GAFAS: Mat = { r: ['#14102a', '#14102a', '#2c2552'], ol: '#14102a', ol2: '#14102a' };
const BLANCO = '#fbf6ff';
const OSC = '#1f0e44';

function brillo4(P: Pintor, x: number, y: number, g: number): void {
  // A four-point sparkle of size g.
  P.px(x, y, BLANCO);
  for (let i = 1; i <= g; i++) {
    P.px(x - i, y, i === g ? '#d2b4fa' : BLANCO);
    P.px(x + i, y, i === g ? '#d2b4fa' : BLANCO);
    P.px(x, y - i, i === g ? '#d2b4fa' : BLANCO);
    P.px(x, y + i, i === g ? '#d2b4fa' : BLANCO);
  }
}

function egoEgo(P: Pintor): void {
  const f = P.f;
  const dy = f ? -1 : 0; // the ghost hovers: frame 1 is one pixel higher
  const ola = f ? 1 : 0; // the hem wave shifts
  // Body: dome, bell-shaped trunk, big scalloped hem with a wisp of tail.
  const dome = el(32, 27 + dy, 18.5, 17.5);
  const tronco = poli([
    [13.5, 27 + dy],
    [50.5, 27 + dy],
    [53, 41 + dy],
    [51, 52 + dy],
    [13, 52 + dy],
    [11, 41 + dy],
  ]);
  const festones = un(
    el(17.5 - ola, 53 + dy, 5.6, 5),
    el(26.5 + ola, 55 + dy, 5, 5.4),
    el(37 - ola, 55 + dy, 5, 5.4),
    el(46.5 + ola, 53 + dy, 5.6, 5),
  );
  const cuerpo = un(dome, tronco, festones);

  // Flexing arms (drawn first: they sit behind the body edge).
  const bic = f ? 1 : 0;
  const brazoI = un(
    trazo([[20, 41 + dy], [9, 38 + dy]], 5.4, 4.8),
    trazo([[9, 38 + dy], [7.5, 22 + dy - bic]], 4.6, 4.0),
    el(11.5, 33 + dy - bic, 6.8, 5.6 + bic * 0.5),
  );
  const puno = un(el(7, 15.5 + dy - bic, 6.2, 6.4), rr(2, 14 + dy - bic, 10, 6, 2));
  const dibujaBrazo = (lado: number) => {
    const T = (m: Mascara) => (lado ? espejo(m) : m);
    const X = (x: number) => (lado ? 63 - x : x);
    P.forma(T(brazoI), FANTASMA, { rad: 5 });
    P.forma(T(puno), FANTASMA, { rad: 5.2 });
    // Gold bracelet and the muscle line of the bicep.
    P.forma(T(rr(3, 24 + dy - bic, 9, 3, 1)), ORO, { rad: 1.5 });
    for (const [x, y] of [[8, 35], [9, 36], [10, 36]] as [number, number][]) P.px(X(x), y + dy - bic, '#4a2890');
    for (const [x, y] of [[9, 29], [10, 28], [11, 28], [12, 28]] as [number, number][]) P.px(X(x), y + dy - bic, '#d2b4fa');
    // Fist: finger lines and a thumb.
    for (const x of [4, 7, 10]) P.llenar(rc(X(x), 14 + dy - bic, 1, 4), '#4a2890');
    P.px(X(5), 11 + dy - bic, '#d2b4fa');
    P.px(X(6), 10 + dy - bic, '#d2b4fa');
  };
  dibujaBrazo(0);
  dibujaBrazo(1);

  P.sombra(cuerpo, 1, 1, 1);
  P.forma(cuerpo, FANTASMA, { rad: 9.5, grad: 0.42 });
  // Ectoplasm glow: a light patch top-left.
  P.tono(el(24, 16 + dy, 7, 4.5), FANTASMA, 1);
  P.tono(el(44, 46 + dy, 7, 4), FANTASMA, -1);

  P.cara(() => {
    // Sunglasses: two lenses and a bridge, with a diagonal glint; frames are dark.
    const lenteI = rr(17, 24 + dy, 14, 9, 3);
    const lenteD = rr(33, 24 + dy, 14, 9, 3);
    const puente = rc(30, 25 + dy, 4, 2);
    P.forma(un(lenteI, lenteD, puente), GAFAS, { modo: 'plano', paso: 1 });
    for (const x0 of [17, 33]) {
      P.llenar(rc(x0 + 1, 25 + dy, 12, 1), '#2c2552');
      P.px(x0 + 3, 27 + dy, BLANCO);
      P.px(x0 + 4, 26 + dy, BLANCO);
      P.px(x0 + 5, 25 + dy, BLANCO);
      P.px(x0 + 8, 28 + dy, '#a374e8');
      P.px(x0 + 9, 27 + dy, '#a374e8');
    }
    // Eyebrows: the right one raised.
    P.llenar(cur([[36, 21 + dy], [40, 19 + dy], [45, 20 + dy]], 1), OSC);
    P.llenar(cur([[19, 21 + dy], [24, 20 + dy], [29, 21 + dy]], 1), OSC);
    // Smirk with a gold tooth.
    const boca = inter(el(33, 36.5 + dy, 9, 5), rc(20, 37 + dy, 30, 8));
    P.llenar(boca, OSC);
    P.llenar(rc(26, 37 + dy, 14, 1), BLANCO);
    P.px(29, 38 + dy, BLANCO);
    P.px(30, 38 + dy, BLANCO);
    P.px(36, 38 + dy, '#ffd048');
    P.px(37, 38 + dy, '#ffd048');
    P.px(36, 37 + dy, '#fff2a8');
    P.px(32, 40 + dy, '#f58cc8');
    P.px(33, 40 + dy, '#f58cc8');
    P.px(34, 40 + dy, '#f58cc8');
    P.llenar(cur([[24, 36 + dy], [25, 38 + dy]], 1), OSC);
    P.llenar(cur([[43, 36 + dy], [42, 38 + dy]], 1), OSC);
    P.px(44, 35 + dy, OSC);
    P.px(20, 35 + dy, '#f58cc8');
    P.px(21, 35 + dy, '#f58cc8');
    // Gold chain with a € pendant.
    const cadena = cur(bez3([19, 41 + dy], [22, 53 + dy], [42, 53 + dy], [45, 41 + dy], 22), 2);
    P.forma(cadena, ORO, { rad: 1.2, paso: 2 });
    cadena.each((x, y) => {
      if ((x + y) % 4 < 1) P.px(x, y, '#8a4e10');
      else if ((x + y) % 4 === 2) P.px(x, y, '#fff2a8');
    });
    P.forma(el(32, 51 + dy, 5.4, 5.4), ORO, { rad: 4 });
    P.est(29, 48 + dy, ['..xxx', '.x...', 'xxxx.', '.x...', '..xxx'], { x: '#8a4e10' });
  });
  P.dorso(() => {
    // From behind: the temples of the sunglasses wrap round the head, a gold chain clasp at the nape,
    // a wisp of ghostly hair on top and the cape-like fold of the ectoplasm down the back.
    P.llenar(cur(bez3([13.5, 28 + dy], [24, 25 + dy], [40, 25 + dy], [50.5, 28 + dy], 14), 2), '#14102a');
    P.px(32, 26 + dy, '#2c2552');
    P.px(20, 26 + dy, '#2c2552');
    P.px(43, 26 + dy, '#2c2552');
    const collar = cur(bez3([16, 38 + dy], [24, 45 + dy], [40, 45 + dy], [48, 38 + dy], 20), 2);
    P.forma(collar, ORO, { rad: 1.2, paso: 2 });
    collar.each((x, y) => {
      if ((x + y) % 4 < 1) P.px(x, y, '#8a4e10');
      else if ((x + y) % 4 === 2) P.px(x, y, '#fff2a8');
    });
    P.forma(rr(30, 41 + dy, 5, 5, 1), ORO, { rad: 2 });
    P.px(32, 43 + dy, '#8a4e10');
    P.px(33, 43 + dy, '#8a4e10');
    P.forma(trazo([[30, 11 + dy], [31, 6 + dy], [36, 4 + dy], [37, 7 + dy]], 2.4, 1.2), FANTASMA, { rad: 2 });
    P.llenar(cur(bez3([22, 31 + dy], [20, 40 + dy], [22, 48 + dy], [26, 51 + dy], 10), 1), '#4a2890');
    P.llenar(cur(bez3([42, 31 + dy], [44, 40 + dy], [42, 48 + dy], [38, 51 + dy], 10), 1), '#4a2890');
    P.px(26, 18 + dy, '#d2b4fa');
    P.px(25, 19 + dy, '#d2b4fa');
  });

  // Ego sparkles.
  brillo4(P, 57, 8, f ? 2 : 3);
  brillo4(P, 5, 56, f ? 3 : 2);
  P.px(53, 14, BLANCO);
  P.px(10, 48, BLANCO);
}


// ---------------------------------------------------------------------------------------------
// Draguserín · red-and-gold festive dragon from the Usera park, whiskers, small and cheerful.
// ---------------------------------------------------------------------------------------------
const ROJO: Mat = { r: ['#5e1030', '#a01c34', '#d93a38', '#f26a52'], ol: '#2a0a1c', ol2: '#5e1030', rim: '#ff9f7a' };
const OROD: Mat = { r: ['#8a4e10', '#d98a1c', '#ffd048', '#fff2a8'], ol: '#3a1c06', ol2: '#8a4e10' };
const CREMA = '#fff6e0';
const TINTA = '#2a0a1c';

function draguserin(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const hy = f; // the head sinks one pixel on frame 1 (breathing)
  const by = f ? 0 : 0;
  // The tail curls up on the viewer's right from the front and on the left from the back.
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const colaPts = bez3([40, 57], [52, 65], [65, 58], [59, 47 - f], 18);
  P.forma(T(trazo(colaPts, 5, 2.2)), ROJO, { rad: 3.2 });
  P.escamas(T(trazo(colaPts, 4, 1)), ROJO, 5, 4);
  // Flame-like gold tuft on the tail tip: three leaves.
  const penacho = un(trazo([[59, 48 - f], [53.5, 40 - f]], 2.8, 0.6), trazo([[59, 48 - f], [59.5, 36 - f]], 2.9, 0.6), trazo([[59, 48 - f], [63, 40 - f]], 2.6, 0.6));
  P.forma(T(penacho), OROD, { rad: 2 });

  // Feet with claws.
  const pies = un(el(22.5, 60, 7, 3.6), el(41.5, 60, 7, 3.6));
  P.forma(pies, ROJO, { rad: 3 });
  for (const x of [18, 22, 26, 37, 41, 45]) P.px(x, 62, '#ffd048');
  for (const x of [18, 22, 26, 37, 41, 45]) P.px(x, 63, '#3a1c06');

  // Body, belly plates, arms.
  const cuerpo = el(32, 48 + by, 14.5, 12.5);
  P.forma(cuerpo, ROJO, { rad: 8, grad: 0.4 });
  P.escamas(cuerpo, ROJO, 5, 4);
  const brazo = un(trazo([[19, 41], [14, 49]], 3.4, 3), el(13.5, 50, 3.4, 3));
  P.forma(par(brazo), ROJO, { rad: 3 });
  for (const x of [11, 13, 15]) P.px(x, 52, '#ffd048');
  for (const x of [48, 50, 52]) P.px(x, 52, '#ffd048');
  P.cara(() => {
    const barriga = el(32, 50, 8.5, 9.5);
    P.forma(barriga, OROD, { rad: 6, grad: 0.3 });
    for (const y of [45, 48, 51, 54, 57]) {
      const ancho = Math.round(8 * Math.sqrt(Math.max(0, 1 - ((y - 50) / 9.5) ** 2)));
      P.llenar(cur(bez3([32 - ancho, y], [32 - ancho / 2, y + 1.5], [32 + ancho / 2, y + 1.5], [32 + ancho, y], 8), 1), '#8a4e10');
    }
  });
  P.dorso(() => {
    // Gold dorsal spines running down from the head to the tail.
    for (let i = 0; i < 5; i++) {
      const y = 38 + i * 4.6;
      P.forma(poli([[32 - 3, y + 4], [32, y - 1.5], [32 + 3, y + 4]]), OROD, { rad: 2 });
    }
    P.px(32, 37, '#fff2a8');
  });

  // Whiskers: long golden wisps that wave a little between frames.
  function bigotes(): void {
    const w = f ? 2 : 0;
    for (const lado of [0, 1]) {
      const X = (x: number) => (lado ? 63 - x : x);
      const pts = bez3([X(22), 36 + hy], [X(9), 33 + hy + w], [X(11), 46 - w], [X(4), 52 + w], 20);
      const m = cur(pts, 2);
      m.each((x, y) => {
        const c = !m.tiene(x, y - 1) ? '#fff2a8' : !m.tiene(x, y + 1) ? '#d98a1c' : '#ffd048';
        P.px(x, y, c);
      });
      const [ex, ey] = pts[pts.length - 1];
      P.forma(el(ex, ey + 0.5, 2, 2), OROD, { rad: 1.5 });
    }
  }
  if (E) bigotes();
  // Head: golden frill, horns, then the head itself.
  const frillI = poli([[16, 14 + hy], [7, 10 + hy], [10, 16 + hy], [3, 19 + hy], [9, 24 + hy], [5, 29 + hy], [15, 29 + hy]]);
  P.forma(par(frillI), OROD, { rad: 3.4 });
  P.forma(par(trazo([[21, 14 + hy], [17, 8 + hy], [12.5, 3 + hy]], 3.4, 1.0)), OROD, { rad: 2 });
  P.llenar(par(cur([[18, 10 + hy], [20, 9 + hy]], 1)), '#8a4e10');
  P.llenar(par(cur([[16, 7 + hy], [18, 6 + hy]], 1)), '#8a4e10');
  const cabeza = el(32, 24 + hy, 19.5, 15.5);
  P.sombra(cabeza, 0, 2, 1);
  P.forma(cabeza, ROJO, { rad: 9, grad: 0.4 });
  P.escamas(inter(cabeza, rc(18, 10 + hy, 28, 8)), ROJO, 5, 4);
  P.cara(() => {
    // Gold mark on the forehead.
    P.forma(poli([[32, 9 + hy], [35.5, 13.5 + hy], [32, 18 + hy], [28.5, 13.5 + hy]]), OROD, { rad: 2.4 });
    P.px(32, 13 + hy, '#8a4e10');
    P.px(32, 14 + hy, '#8a4e10');
    // Muzzle.
    const hocico = el(32, 32 + hy, 11, 6.8);
    P.forma(hocico, OROD, { rad: 5, grad: 0.3 });
    P.px(28, 29 + hy, '#3a1c06');
    P.px(29, 30 + hy, '#3a1c06');
    P.px(36, 29 + hy, '#3a1c06');
    P.px(35, 30 + hy, '#3a1c06');
    // Open smile with a tongue and two little fangs.
    const boca = inter(el(32, 33.6 + hy, 6.8, 4.6), rc(20, 34 + hy, 24, 6));
    P.llenar(boca, TINTA);
    P.llenar(inter(el(32, 38 + hy, 3.6, 2), rc(20, 36 + hy, 24, 4)), '#f0507a');
    P.px(27, 34 + hy, CREMA);
    P.px(37, 34 + hy, CREMA);
    P.px(27, 35 + hy, CREMA);
    P.px(37, 35 + hy, CREMA);
    // Smile lines.
    P.px(24, 33 + hy, '#8a4e10');
    P.px(40, 33 + hy, '#8a4e10');
    // Big cheerful eyes, a lower lid pushed up by a smile, thick golden eyebrows raised and happy.
    for (const cx of [22.5, 41.5]) {
      const dir = cx < 32 ? 1 : -1;
      const ojo = el(cx, 22.5 + hy, 5.4, 5.8);
      P.llenar(ojo, CREMA);
      P.aro(ojo, TINTA);
      P.llenar(el(cx + 0.8 * dir, 23.2 + hy, 3.4, 4), '#a85a14');
      P.llenar(el(cx + 0.8 * dir, 23.4 + hy, 2, 2.6), TINTA);
      P.px(Math.round(cx) - 1 + dir, 21 + hy, CREMA);
      P.px(Math.round(cx) + dir, 21 + hy, CREMA);
      P.px(Math.round(cx) - 1 + dir, 22 + hy, CREMA);
      P.px(Math.round(cx) + 1 + 2 * dir, 25 + hy, '#ffd048');
      const mejilla = inter(ojo, el(cx, 31.5 + hy, 8, 6.2));
      P.llenar(mejilla, '#d93a38');
      mejilla.each((x, y) => {
        if (!mejilla.tiene(x, y - 1) && ojo.tiene(x, y - 1)) P.px(x, y, '#5e1030');
      });
      // Thin upper lid.
      P.llenar(inter(ojo, un(el(cx, 17.2 + hy, 6.4, 3.2))), '#a01c34');
    }
    P.forma(cur(bez3([16, 15 + hy], [20, 9.5 + hy], [26, 10 + hy], [28.5, 12.5 + hy], 8), 2), OROD, { rad: 1.4, paso: 2, borde: false });
    P.forma(cur(bez3([35.5, 12.5 + hy], [38, 10 + hy], [44, 9.5 + hy], [48, 15 + hy], 8), 2), OROD, { rad: 1.4, paso: 2, borde: false });
    // Pink cheeks.
    P.llenar(rc(15, 28 + hy, 3, 2), '#ff8a8a');
    P.llenar(rc(46, 28 + hy, 3, 2), '#ff8a8a');
  });
  P.dorso(() => {
    // Back of the head: the dorsal mane runs from the forehead down the neck, ears (frill) sit at the sides.
    P.forma(poli([[29, 9], [32, 4 + hy], [35, 9], [37, 16 + hy], [32, 21 + hy], [27, 16 + hy]]), OROD, { rad: 3 });
    for (const [x, y] of [[32, 8], [32, 11], [32, 14]] as [number, number][]) P.px(x, y + hy, '#8a4e10');
    P.px(31, 7 + hy, '#fff2a8');
    P.escamas(inter(cabeza, rc(14, 18 + hy, 36, 20)), ROJO, 5, 4);
    P.tono(el(24, 31 + hy, 9, 4), ROJO, -1);
    P.tono(el(40, 31 + hy, 9, 4), ROJO, -1);
  });

  if (!E) bigotes();
}


// ---------------------------------------------------------------------------------------------
// Espumarro · a beer jar with an overflowing foam head and a happy face: the edition mascot.
// ---------------------------------------------------------------------------------------------
const CERVEZA: Mat = { r: ['#a85a0c', '#e08a14', '#fbb82a', '#ffe07a'], ol: '#4a2406', ol2: '#a85a0c' };
const ESPUMA: Mat = { r: ['#e2cdb2', '#fff1da', '#ffffff'], ol: '#8a6446', ol2: '#e2cdb2' };
const VIDRIO: Mat = { r: ['#86b2c4', '#c4e4ee', '#f4ffff'], ol: '#4a2406', ol2: '#5c7e90' };

function espumarro(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  // The handle is on the viewer's right from the front and on the left from behind: the whole mug is
  // drawn in front coordinates and every mask and pixel goes through these mirrors.
  const T = (m: Mascara) => (E ? espejo(m) : m);
  const TX = (x: number) => (E ? 63 - x : x);
  const px = (x: number, y: number, c: string) => P.px(TX(x), y, c);
  const lle = (m: Mascara, c: string) => P.llenar(T(m), c);
  const forma = (m: Mascara, mat: Mat, o: Parameters<Pintor['forma']>[2] = {}) =>
    P.forma(T(m), mat, o.eje !== undefined ? { ...o, eje: TX(o.eje) } : o);
  const salto = f ? -1 : 0; // frame 1: the foam rises a pixel
  const base = 59;
  // Handle (a glass ring).
  forma(men(rr(40, 24, 21, 31, 10), rr(46, 30, 9, 19, 4)), VIDRIO, { rad: 3.2 });
  // Glass body, then the beer inside it (the glass stays as a thick wall and a heavy base).
  forma(rr(7, 14, 38, base - 14, 5), VIDRIO, { modo: 'cil', eje: 26, semi: 19 });
  forma(rr(10, 17, 32, base - 17 - 7, 3), CERVEZA, { modo: 'cil', eje: 26, semi: 16, borde: false, rim: false });
  // Glints on the left, a deeper band at the foot of the beer.
  lle(rc(14, 22 + salto, 2, 20), '#ffe07a');
  lle(rc(14, 22 + salto, 2, 1), '#ffffff');
  lle(rc(14, 45, 2, 2), '#ffe07a');
  lle(rc(37, 24, 1, 18), '#fbb82a');
  lle(rc(9, 18, 1, 28), '#f4ffff');
  lle(rc(10, 50, 32, 1), '#a85a0c');
  // Glass foot: highlights on the thick base.
  lle(rc(11, 53, 9, 1), '#f4ffff');
  lle(rc(12, 55, 3, 1), '#f4ffff');
  // Bubbles rising (they shift between frames).
  const burbujas: [number, number][] = [[20, 46], [31, 40], [38, 47], [24, 28], [34, 30], [17, 36]];
  burbujas.forEach(([x, y], i) => {
    const yy = y - (f ? 2 + (i % 2) : 0);
    px(x, yy, '#ffe07a');
    px(x + 1, yy, '#ffe07a');
    px(x, yy + 1, '#ffe07a');
    px(x + 1, yy + 1, '#fbb82a');
  });
  P.cara(() => {
    // Happy ^ ^ eyes, a wide open smile with a tongue, rosy cheeks.
    for (const cx of [19, 33]) {
      lle(cur(bez3([cx - 4, 36], [cx - 3, 30], [cx + 3, 30], [cx + 4, 36], 8), 2), '#4a2406');
      px(cx - 2, 30, '#fff1da');
    }
    lle(rc(13, 38, 4, 2), '#ff7a6a');
    lle(rc(35, 38, 4, 2), '#ff7a6a');
    lle(inter(el(26, 40, 8, 6.4), rc(10, 40, 32, 9)), '#4a2406');
    lle(rc(20, 40, 12, 1), '#ffffff');
    lle(inter(el(26, 47, 5, 3.2), rc(10, 44, 32, 6)), '#f0507a');
  });
  P.dorso(() => {
    // From behind: a cream star sticker on the glass, a deeper beer colour and a long glint.
    const x0 = 22;
    forma(poli([[x0 + 4, 30], [x0 + 6, 35], [x0 + 11, 35], [x0 + 7, 38.5], [x0 + 9, 44], [x0 + 4, 40.5], [x0 - 1, 44], [x0 + 1, 38.5], [x0 - 3, 35], [x0 + 2, 35]]), ESPUMA, { rad: 2.4 });
    P.tono(T(rc(10, 40, 32, 10)), CERVEZA, -1);
    lle(rc(35, 22 + salto, 2, 8), '#ffe07a');
  });
  // The foam head: a puffy overflowing cloud with drips down the glass.
  const nube = un(
    el(14, 15 + salto, 8.2, 6.4),
    el(24, 9 + salto, 9, 8),
    el(35, 11 + salto, 9, 7.4),
    el(42, 17 + salto, 6.2, 5),
    el(8, 19 + salto, 4.4, 4),
    rc(10, 15 + salto, 32, 6),
  );
  const gotas = un(rr(8, 19 + salto, 6, 15 + (f ? 2 : 0), 3), rr(36, 20 + salto, 5, 11, 2.5), rr(25, 20 + salto, 4, 6, 2));
  const espuma = un(nube, gotas);
  P.sombra(T(espuma), 0, 2, 1);
  forma(espuma, ESPUMA, { rad: 5, grad: 0.5 });
  // Foam bubbles: little arcs in the shade colour and bright specks.
  const arcos: [number, number][] = [[14, 12], [26, 8], [34, 12], [20, 17], [40, 16], [30, 17], [11, 24 + (f ? 1 : 0)]];
  for (const [x, y] of arcos) {
    px(x, y + salto, '#e2cdb2');
    px(x + 1, y + 1 + salto, '#e2cdb2');
    px(x + 2, y + salto, '#e2cdb2');
  }
  for (const [x, y] of [[17, 7], [28, 4], [36, 8], [10, 13]] as [number, number][]) {
    px(x, y + salto, '#ffffff');
    px(x + 1, y + salto, '#ffffff');
  }
  // A couple of flying foam blobs.
  forma(el(53 - (f ? 1 : 0), 10 + (f ? -2 : 0), 2.6, 2.6), ESPUMA, { rad: 2 });
  forma(el(57, 17 + (f ? -2 : 0), 1.8, 1.8), ESPUMA, { rad: 1.5 });
}


export const DIBUJOS2: Dibujo2[] = [
  { id: 'draguserin', nombre: 'Draguserín', dibujar: draguserin },
  { id: 'espumarro', nombre: 'Espumarro', dibujar: espumarro },
  { id: 'ego-ego', nombre: 'Ego-Ego', dibujar: egoEgo },
];
// The other useritos, drawn in batches; a batch may redraw one above (the later one wins).
for (const d of [...LOTE_A, ...LOTE_B, ...LOTE_C, ...LOTE_D, ...LOTE_E, ...LOTE_F]) {
  const i = DIBUJOS2.findIndex((x) => x.id === d.id);
  if (i >= 0) DIBUJOS2[i] = d;
  else DIBUJOS2.push(d);
}
export const dibujo2 = (id: string): Dibujo2 => DIBUJOS2.find((d) => d.id === id) ?? DIBUJOS2[0];
void [rr, men, lin, mover, un];
