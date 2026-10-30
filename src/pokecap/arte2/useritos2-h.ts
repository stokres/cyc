// PokéUsera · Edición Jarra (arte v2): batch h of the 64×64 useritos (same conventions as useritos2.ts).
// The Ultimosaurio, the mythical userito of chapter 2 (src/pokecap/capitulo.ts). It lives only in the chapter's copy.
import type { Dibujo2 } from './useritos2';
import { Pintor, bez3, el, poli, rc, rr, trazo, un, type Mat } from './pintor';

// ---------------------------------------------------------------------------------------------
// Ultimosaurio · LA ÚLTIMA made a dinosaur: a ghostly violet sauropod (long neck, fat body, stubby legs) whose belly glows
// amber like a pint seen through glass, with a foam crest on its head, beer-cap plates down its back and a little mug at the
// tip of its tail. Everybody knows it and nobody has seen it: yellow eyes with a sly grin. Frame 1: it bobs, the head sways
// and the tail wags. From behind: the back of the head with the foam, the plates along the spine, the tail with its mug.
// ---------------------------------------------------------------------------------------------
const FANTASMA: Mat = { r: ['#2a1f66', '#4c3bb0', '#7c68e6', '#c0b4ff'], ol: '#140d38', ol2: '#2a1f66', rim: '#8fe0ff' };
const CERVEZA: Mat = { r: ['#a24e0c', '#e8901a', '#ffc84a', '#fff0a0'], ol: '#3a1a04', ol2: '#a24e0c' };
const ESPUMA: Mat = { r: ['#cbbfe0', '#f2ecff', '#ffffff'], ol: '#4c3bb0', ol2: '#7c68e6' };
const OJO = '#ffe45a';
const OSC = '#140d38';

function ultimosaurio(P: Pintor): void {
  const f = P.f;
  const E = P.espalda;
  const b = f ? -1 : 0; // the whole body bobs
  const sway = f ? 1.5 : 0; // head and tail sway

  if (!E) {
    // ---- Back legs (far side, darker), the tail and the neck with its head (all of them behind the body).
    for (const x of [35, 45]) P.forma(rr(x, 49, 9, 12, 3), FANTASMA, { rad: 3, sesgo: -0.25 });
    const cola = trazo(bez3([46, 44 + b], [56, 47 + b], [59 + sway, 39 + b], [55 + sway, 31 + b], 18), 6.2, 2);
    P.sombra(cola, 1, 1, 1);
    P.forma(cola, FANTASMA, { rad: 4, grad: 0.35 });
    // The mug at the tip of the tail: amber with a foam head and a handle.
    const jx = 52 + sway;
    const jy = 21 + b;
    P.forma(rr(jx + 6, jy + 3, 3, 6, 1.4), ESPUMA, { rad: 1.4, paso: 1 });
    P.forma(rr(jx, jy, 8, 12, 2), CERVEZA, { rad: 3, grad: 0.3 });
    P.forma(un(el(jx + 2, jy - 1, 2.6, 2), el(jx + 5.5, jy - 1.5, 2.4, 2)), ESPUMA, { rad: 2, paso: 2 });
    P.px(jx + 2, jy + 4, '#fff0a0');
    P.px(jx + 2, jy + 5, '#fff0a0');

    const cuello = trazo(bez3([26, 40 + b], [10, 37 + b], [6 + sway, 22 + b], [17 + sway, 14 + b], 18), 8.4, 5.4);
    P.sombra(cuello, 1, 1, 1);
    P.forma(cuello, FANTASMA, { rad: 5, grad: 0.35 });
    const hx = 19 + sway;
    const hy = 11 + b;
    const cabeza = un(el(hx + 2, hy, 8.4, 6.4), el(hx - 6, hy + 2, 6.4, 4.8));
    P.sombra(cabeza, 1, 1, 1);
    P.forma(cabeza, FANTASMA, { rad: 5, grad: 0.4 });
    // Foam crest on top of the head.
    P.forma(un(el(hx - 1, hy - 5.5, 3.4, 2.6), el(hx + 4, hy - 6.5, 3.8, 3), el(hx + 9, hy - 4.5, 3, 2.4)), ESPUMA, { rad: 2, paso: 2 });
    P.px(hx + 3, hy - 8, '#ffffff');
    P.cara(() => {
      // Eye: a bright yellow oval with a dark pupil and a glint; sly eyebrow.
      P.forma(el(hx + 4, hy - 0.5, 3.2, 3.4), { r: [OJO, OJO, '#ffffff'], ol: OSC }, { paso: 1, borde: true });
      P.px(hx + 4, hy - 0.5, OSC);
      P.px(hx + 4, hy + 0.5, OSC);
      P.px(hx + 3, hy - 2, '#ffffff');
      P.llenar(rc(hx + 1, hy - 4, 7, 1), OSC);
      // A wide grin along the snout: open mouth with teeth and a tongue.
      P.llenar(rc(hx - 11, hy + 2, 15, 1), OSC);
      P.llenar(rc(hx - 10, hy + 3, 13, 2), OSC);
      P.llenar(rc(hx - 8, hy + 5, 8, 1), '#e0689c');
      for (const x of [-9, -6, -3, 0]) P.px(hx + x, hy + 3, '#ffffff');
      P.px(hx + 4, hy + 2, OSC);
      P.px(hx + 5, hy + 1, OSC);
      P.px(hx - 11, hy - 1, OSC); // nostril
      P.px(hx + 7, hy + 3, '#e0689c');
      P.px(hx + 8, hy + 3, '#e0689c');
    });

    // ---- Body, belly, plates and front legs.
    const cuerpo = un(el(32, 41 + b, 19, 14.5), rc(20, 38 + b, 26, 10));
    P.sombra(cuerpo, 1, 1, 1);
    P.forma(cuerpo, FANTASMA, { rad: 9, grad: 0.4 });
    P.tono(el(23, 33 + b, 8, 4), FANTASMA, 1);
    for (const x of [15, 26]) P.forma(rr(x, 49, 9, 12, 3), FANTASMA, { rad: 3 });
    for (const x of [15, 26]) for (let i = 0; i < 3; i++) P.px(x + 1 + i * 3, 59, '#c0b4ff');
    const vientre = el(28, 45 + b, 12, 8.5);
    P.sombra(vientre, 1, 1, 0);
    P.forma(vientre, CERVEZA, { rad: 5, grad: 0.35 });
    for (const [x, y] of [[22, 44], [30, 48], [26, 50], [34, 43]] as [number, number][]) P.px(x, y + b, '#fff0a0'); // bubbles in the pint
    P.px(23, 45 + b, '#ffc84a');
    const placas: [number, number, number][] = [[27, 29, 4.2], [35, 27.5, 5], [43, 31, 4.2], [47, 38, 3.4]];
    for (const [x, y, s] of placas) {
      const pl = poli([[x - s, y + s * 0.9 + b], [x, y - s * 1.5 + b], [x + s, y + s * 0.9 + b]]);
      P.forma(pl, CERVEZA, { rad: 2, grad: 0.3 });
      P.px(Math.round(x), Math.round(y - s * 0.9 + b), '#fff0a0');
    }
    for (const [x, y] of [[4, 40], [58, 6], [8, 56], [52, 58]] as [number, number][]) P.px(x, y + (f ? 1 : 0), '#ffffff');
  } else {
    // ---- From behind: the neck and the back of the head peep over the body, the tail comes round at the bottom right with its mug.
    const cuello = trazo(bez3([31, 36 + b], [31, 28 + b], [30 + sway, 22 + b], [30 + sway, 16 + b], 14), 7.2, 5.4);
    P.sombra(cuello, 1, 1, 1);
    P.forma(cuello, FANTASMA, { rad: 5, grad: 0.35 });
    const hx = 30 + sway;
    const hy = 11 + b;
    P.forma(un(el(hx, hy, 9, 7), el(hx - 7.5, hy + 1, 3, 2.6), el(hx + 7.5, hy + 1, 3, 2.6)), FANTASMA, { rad: 5, grad: 0.4 });
    P.forma(un(el(hx - 3, hy - 6, 3.6, 2.8), el(hx + 2.5, hy - 7, 4, 3), el(hx + 7, hy - 5.5, 3, 2.4)), ESPUMA, { rad: 2, paso: 2 });
    P.px(hx + 3, hy - 9, '#ffffff');
    // Two yellow glints from the corner of its eyes: it looks back at you.
    P.px(hx - 8, hy + 1, OJO);
    P.px(hx + 8, hy + 1, OJO);
    P.forma(rr(15, 49, 10, 12, 3), FANTASMA, { rad: 3, sesgo: -0.1 });
    P.forma(rr(39, 49, 10, 12, 3), FANTASMA, { rad: 3, sesgo: -0.1 });
    const cuerpo = un(el(32, 41 + b, 20, 16), rc(13, 40 + b, 38, 11));
    P.sombra(cuerpo, 1, 1, 1);
    P.forma(cuerpo, FANTASMA, { rad: 9, grad: 0.4 });
    P.tono(el(22, 32 + b, 8, 4), FANTASMA, 1);
    const placas: [number, number, number][] = [[32, 27, 3], [32, 36, 4.4], [32, 47, 5.4]];
    for (const [x, y, s] of placas) {
      const pl = poli([[x - s, y + s * 0.9 + b], [x, y - s * 1.4 + b], [x + s, y + s * 0.9 + b]]);
      P.forma(pl, CERVEZA, { rad: 2, grad: 0.3 });
      P.px(Math.round(x - 1), Math.round(y - s * 0.2 + b), '#fff0a0');
    }
    const cola = trazo(bez3([38, 53 + b], [46, 63 + b], [58, 60 + b], [57 + sway, 49 + b], 18), 6, 2.4);
    P.sombra(cola, 1, 1, 1);
    P.forma(cola, FANTASMA, { rad: 4, grad: 0.35 });
    const jx = 51 + sway;
    const jy = 38 + b;
    P.forma(rr(jx + 6, jy + 3, 3, 6, 1.4), ESPUMA, { rad: 1.4, paso: 1 });
    P.forma(rr(jx, jy, 8, 12, 2), CERVEZA, { rad: 3, grad: 0.3 });
    P.forma(un(el(jx + 2, jy - 1, 2.6, 2), el(jx + 5.5, jy - 1.5, 2.4, 2)), ESPUMA, { rad: 2, paso: 2 });
    P.px(jx + 2, jy + 4, '#fff0a0');
    for (const [x, y] of [[6, 38], [58, 14], [6, 56]] as [number, number][]) P.px(x, y + (f ? 1 : 0), '#ffffff');
  }
}

export const LOTE_H: Dibujo2[] = [{ id: 'ultimosaurio', nombre: 'Ultimosaurio', dibujar: ultimosaurio }];
