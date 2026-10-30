// PokéUsera · Edición Jarra (arte v2): the title logo, baked once into a 220×90 canvas.
//
// Original chunky lettering built from thick rounded strokes (not a font, nothing like the real franchise
// logo): a yellow-orange body lit from the top left, a coloured inner edge, a thick dark-plum outline, a
// glossy highlight band and a drop shadow. «EDICIÓN JARRA» sits on a red ribbon, and Espumarro, the beer-jar
// mascot, peeks over the right end of it.
import { anchoTexto2, dibujarTexto2 } from './fuente2';
import { Mascara, Pintor, bez3, el, inter, men, mover, poli, rc, trazo, un, type Mat } from './pintor';
import { spriteFrente2 } from './sprites2';

export const ANCHO_LOGO2 = 220;
export const ALTO_LOGO2 = 90;

const CIRUELA = '#3a1334';
const CIRUELA_SOMBRA = '#1d0a1c';
const LETRA: Mat = { r: ['#c8461a', '#f27a1c', '#ffbd2a', '#ffe66a'], ol: '#9a3414', ol2: '#c8461a' };
const CINTA: Mat = { r: ['#6e1230', '#b02440', '#e04458', '#ff8a82'], ol: CIRUELA, ol2: '#6e1230' };
const CINTA_COLA: Mat = { r: ['#4e0c26', '#7e1832', '#a42a46'], ol: CIRUELA, ol2: '#4e0c26' };

const anillo = (cx: number, cy: number, rx: number, ry: number, t: number): Mascara => men(el(cx, cy, rx, ry), el(cx, cy, rx - t, ry - t));
const T = 2.6; // stroke radius
const tr = (pts: [number, number][]): Mascara => trazo(pts, T, T);

/** Letters: [advance, builder in local coordinates (baseline at y = 30, cap line at 5, x-height line at 12)]. */
const LETRAS: Record<string, [number, () => Mascara]> = {
  P: [19, () => un(tr([[3.5, 5.5], [3.5, 29.5]]), tr([[3.5, 7.5], [11, 7.5]]), tr(bez3([11, 7.5], [18, 7.5], [18, 19], [11, 19], 10)), tr([[11, 19], [3.5, 19]]))],
  o: [20, () => anillo(10, 21, 9.6, 9.2, 5)],
  k: [18, () => un(tr([[3.5, 5.5], [3.5, 29.5]]), tr([[15, 13.5], [5.5, 22]]), tr([[8.5, 20.5], [16, 29.5]]))],
  é: [19, () => un(men(anillo(9.5, 21, 9.5, 9.2, 5), rc(11, 23, 10, 4)), rc(3, 20, 13, 3), tr([[7, 7], [13.5, 3]]))],
  U: [21, () => un(tr([[4, 5.5], [4, 21]]), tr([[17, 5.5], [17, 21]]), tr(bez3([4, 20], [4, 33], [17, 33], [17, 20], 14)))],
  s: [17, () => un(tr(bez3([14, 17], [12.5, 13.3], [4, 13.3], [3.6, 18], 8)), tr(bez3([3.6, 18], [3.6, 21], [14.5, 21], [14.5, 24], 8)), tr(bez3([14.5, 24], [14.5, 28.3], [4, 28.3], [3, 26.5], 8)))],
  e: [19, () => un(men(anillo(9.5, 21, 9.5, 9.2, 5), rc(11, 23, 10, 4)), rc(3, 20, 13, 3))],
  r: [15, () => un(tr([[3.5, 13], [3.5, 29.5]]), tr(bez3([3.5, 19.5], [4, 13], [10, 11.5], [14, 14], 8)))],
  a: [19, () => un(anillo(9, 21, 8.8, 9.2, 5), tr([[15.5, 13], [15.5, 29.5]]))],
};

function dilatar(m: Mascara, r: number): Mascara {
  const out = new Mascara();
  m.each((x, y) => {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 1) out.add(x + i, y + j);
  });
  return out;
}
/** Bounding box of the opaque pixels of a baked sprite. */
function cajaOpaca(cv: HTMLCanvasElement): { x0: number; y0: number; x1: number; y1: number } {
  const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width,
    y0 = cv.height,
    x1 = 0,
    y1 = 0;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (!d[(y * cv.width + x) * 4 + 3]) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  return { x0, y0, x1, y1 };
}

let cache: HTMLCanvasElement | null = null;

/** The title logo (220×90), baked once. */
export function logo2(): HTMLCanvasElement {
  if (cache) return cache;
  const P = new Pintor(ANCHO_LOGO2, ALTO_LOGO2);
  const OY = 5;
  const texto = 'PokéUsera';
  let x = 4;
  const todo = new Mascara();
  Array.from(texto).forEach((ch, i) => {
    const [av, f] = LETRAS[ch];
    const dy = OY + (i % 2 ? 1 : 0);
    mover(f(), x, dy).each((a, b) => todo.add(a, b));
    x += av;
  });

  // Ribbon first (it sits under the lettering's shadow and behind the mascot).
  const CX0 = 28,
    CX1 = 156,
    CY = 52,
    CH = 17;
  const colaI = poli([[CX0 - 12, CY + 4], [CX0 + 6, CY + 4], [CX0 + 6, CY + CH + 4], [CX0 - 12, CY + CH + 4], [CX0 - 6.5, CY + 4 + CH / 2]]);
  const colaD = poli([[CX1 - 6, CY + 4], [CX1 + 12, CY + 4], [CX1 + 6.5, CY + 4 + CH / 2], [CX1 + 12, CY + CH + 4], [CX1 - 6, CY + CH + 4]]);
  P.forma(colaI, CINTA_COLA, { rad: 4, grad: 0.2 });
  P.forma(colaD, CINTA_COLA, { rad: 4, grad: 0.2 });
  P.forma(rc(CX0, CY, CX1 - CX0, CH), CINTA, { rad: 5, grad: 0.2 });
  // The folds: dark triangles where the tails go behind the band.
  P.llenar(poli([[CX0, CY + CH], [CX0 + 6, CY + CH], [CX0 + 6, CY + CH + 4]]), '#4e0c26');
  P.llenar(poli([[CX1, CY + CH], [CX1 - 6, CY + CH], [CX1 - 6, CY + CH + 4]]), '#4e0c26');
  P.llenar(rc(CX0 + 1, CY + 1, CX1 - CX0 - 2, 1), CINTA.r[3]);
  P.llenar(rc(CX0 + 1, CY + CH - 2, CX1 - CX0 - 2, 1), CINTA.r[0]);

  // Lettering: shadow, thick plum outline, then the lit body.
  const borde = dilatar(todo, 3);
  mover(borde, 1, 3).each((a, b) => P.px(a, b, CIRUELA_SOMBRA));
  borde.each((a, b) => P.px(a, b, CIRUELA));
  P.forma(todo, LETRA, { rad: 3.4, grad: 0.35, borde: 'suave' });
  // A glossy highlight band across the top of the letters, and a darker lower edge.
  P.tono(inter(todo, rc(0, OY + 6, ANCHO_LOGO2, 4)), LETRA, 1);
  P.tono(inter(todo, rc(0, OY + 26, ANCHO_LOGO2, 6)), LETRA, -1);
  // Sparkle glints on a few corners.
  for (const [a, b] of [[14, OY + 7], [47, OY + 6], [101, OY + 8], [150, OY + 15]] as [number, number][]) {
    P.px(a, b, '#fffbe0');
    P.px(a + 1, b, '#fff2a0');
    P.px(a, b + 1, '#fff2a0');
  }
  P.suavizar();
  const cv = P.hornear();
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const etiqueta = 'EDICIÓN JARRA';
  const ax = CX0 + Math.floor((CX1 - CX0 - anchoTexto2(etiqueta)) / 2);
  dibujarTexto2(ctx, etiqueta, ax, CY + 5, '#fff2b8', '#4e0c26');
  // Espumarro peeks over the right end of the ribbon.
  const mascota = spriteFrente2('espumarro', 0);
  const caja = cajaOpaca(mascota);
  ctx.drawImage(mascota, ANCHO_LOGO2 - 2 - (caja.x1 + 1), ALTO_LOGO2 - 1 - (caja.y1 + 1));
  cache = cv;
  return cv;
}
