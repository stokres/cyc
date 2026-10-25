// La silueta del userito mitológico (el dinosaurio del caos; docs/CAPITULO2.md). Se hornea una vez y sube desde abajo.
import { ellipse, path, smooth } from './personajes/svg.mjs';

const NS = 'http://www.w3.org/2000/svg';
const f = (v) => +v.toFixed(1);
const lienzo = (x, y, w, h, body) => ({ x, y, w, h, svg: `<svg xmlns="${NS}" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${body}</svg>` });
const circulo = (cx, cy, r, fill, a = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${a}/>`;

// ---------------------------------------------------------------- el userito, solo su sombra

/** Una curva suave por unos puntos, muestreada: [{ x, y, nx, ny, t }] con la normal (hacia la derecha de la marcha). */
function muestrear(pts, n) {
  const P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  const sal = [];
  for (let k = 0; k <= n; k++) {
    const u = (k / n) * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(u));
    const s = u - i;
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * s + (2 * a - 5 * b + 4 * c2 - d) * s * s + (-a + 3 * b - 3 * c2 + d) * s * s * s);
    const d = (a, b, c2, dd) => 0.5 * ((-a + c2) + 2 * (2 * a - 5 * b + 4 * c2 - dd) * s + 3 * (-a + 3 * b - 3 * c2 + dd) * s * s);
    const x = c(p0[0], p1[0], p2[0], p3[0]);
    const y = c(p0[1], p1[1], p2[1], p3[1]);
    const tx = d(p0[0], p1[0], p2[0], p3[0]);
    const ty = d(p0[1], p1[1], p2[1], p3[1]);
    const l = Math.hypot(tx, ty) || 1;
    sal.push({ x, y, nx: -ty / l, ny: tx / l, t: k / n, r: p1[2] + (p2[2] - p1[2]) * s });
  }
  return sal;
}

/**
 * La silueta ENORME del userito mitológico (el dinosaurio del caos): llena toda la pantalla por detrás de todo.
 * De perfil mirando a la izquierda: cabeza arriba con la boca abierta y un ojo que brilla, un cuello larguísimo en
 * S, el lomo con sus placas, cuatro patas y una cola que se sale por la derecha. Silueta oscura con contorno de luz.
 * Mide 2 300 × 1 080 (centrada en x = 0, como la pantalla), así que se pinta en unidades de escena.
 */
export function dinosaurio() {
  const sombra = '#0d0716';
  const lejos = '#1c1030';
  const luz = '#b98cff';
  const resplandor = '#7a4cff';
  /** El cuerpo, la cola y las patas se corren a la derecha: el cuello sale de sus hombros. */
  const DX = 190;
  // ---- El cuello: una cadena de círculos a lo largo de una curva que se afina hasta la cabeza.
  const eje = muestrear(
    [
      [210, 860, 135],
      [160, 750, 94],
      [100, 640, 68],
      [30, 540, 54],
      [-50, 455, 46],
      [-140, 390, 42],
      [-240, 348, 40],
      [-320, 335, 40],
    ],
    28,
  );
  const cuello = eje.map((p) => ({ x: p.x, y: p.y, r: p.r }));
  // ---- El cuerpo, la cola y las patas.
  const cuerpo = smooth([[-200, 810], [-150, 690], [-40, 625], [120, 590], [300, 592], [480, 630], [640, 706], [706, 810], [640, 930], [480, 1020], [260, 1060], [40, 1050], [-110, 985]]);
  const cola = smooth([[600, 690, 'c'], [700, 700], [830, 722], [970, 704], [1110, 650], [1260, 590, 'c'], [1130, 700], [980, 790], [830, 850], [700, 905], [610, 930, 'c']], true, 0.9);
  const pata = (x, ancho, y0 = 880) => smooth([[x - ancho / 2, y0, 'c'], [x + ancho / 2, y0, 'c'], [x + ancho / 2 + 6, 1090], [x - ancho / 2 - 6, 1090]]);
  const patasLejos = [pata(10, 130), pata(500, 150)];
  const patasCerca = [pata(-80, 150), pata(380, 160)];
  // ---- La cabeza (arriba) y la mandíbula de abajo, abierta, con sus dientes.
  const cabeza = smooth([
    [-340, 292], [-420, 262], [-520, 256], [-612, 278], [-700, 318], [-775, 356, 'c'], [-792, 392], [-762, 418], [-690, 428], [-600, 398], [-500, 384], [-400, 376], [-338, 370],
  ]);
  const mandibula = smooth([[-372, 388, 'c'], [-440, 448], [-548, 506], [-655, 530], [-722, 512], [-706, 478], [-615, 452], [-525, 418], [-440, 396]], true, 0.9);
  const dientes = (xs, y, dir, h) => xs.map((x) => `<path d="M${x - 11} ${y}L${x} ${y + dir * h}L${x + 11} ${y}Z"/>`).join('');
  const dientesArriba = dientes([-740, -700, -655, -610, -565, -520], 420, 1, 40);
  const dientesAbajo = dientes([-690, -645, -600, -555], 478, -1, 36);
  // ---- Las placas del lomo: rombos que se levantan del cuello, del lomo y de la cola.
  const placa = (x, y, nx, ny, alto, ancho) => {
    const ox = x - nx * 26;
    const oy = y - ny * 26;
    const tx = -ny;
    const ty = nx;
    const pts = [
      [ox - tx * ancho, oy - ty * ancho],
      [x + nx * alto * 0.5 - tx * ancho * 0.9, y + ny * alto * 0.5 - ty * ancho * 0.9],
      [x + nx * alto, y + ny * alto],
      [x + nx * alto * 0.5 + tx * ancho * 0.9, y + ny * alto * 0.5 + ty * ancho * 0.9],
      [ox + tx * ancho, oy + ty * ancho],
    ];
    return 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L') + 'Z';
  };
  const placas = [];
  // Cuello: del lado de atrás (la derecha del recorrido), cada vez más pequeñas hacia la cabeza.
  eje.forEach((p, i) => {
    if (i < 3 || i % 3 !== 0 || p.t > 0.92) return;
    const s = 1; // la normal de la curva mira hacia atrás (la derecha del cuello)
    placas.push({ d: placa(p.x + s * p.nx * (p.r - 4), p.y + s * p.ny * (p.r - 4), s * p.nx, s * p.ny, 46 + (1 - p.t) * 60, 26 + (1 - p.t) * 14), dx: 0 });
  });
  // Lomo y cola.
  const lomo = muestrear([[-110, 655, 0], [10, 612, 0], [130, 588, 0], [250, 586, 0], [370, 600, 0], [480, 630, 0], [585, 676, 0], [690, 706, 0], [800, 716, 0], [930, 706, 0], [1070, 666, 0], [1190, 622, 0]], 19);
  lomo.forEach((p, i) => {
    if (i % 2 === 1 && i > 0) return;
    const m = 1 - Math.abs(p.t - 0.32) * 1.5;
    const alto = 70 + Math.max(0, m) * 95;
    // La normal de `muestrear` apunta hacia abajo en un recorrido de izquierda a derecha: se invierte.
    placas.push({ d: placa(p.x, p.y, -p.nx, -p.ny, alto * (p.t > 0.7 ? 0.7 : 1), 30 + Math.max(0, m) * 16), dx: DX });
  });
  // ---- Todo junto: primero resplandor y contorno de luz de cada pieza, encima las siluetas.
  const piezas = [
    ...patasLejos.map((d) => ({ d, f: lejos, dx: DX })),
    { d: cola, f: sombra, dx: DX },
    { d: cuerpo, f: sombra, dx: DX },
    ...placas.map((p) => ({ d: p.d, f: sombra, dx: p.dx })),
    ...patasCerca.map((d) => ({ d, f: sombra, dx: DX })),
    { d: cabeza, f: sombra, dx: 0 },
    { d: mandibula, f: sombra, dx: 0 },
  ];
  const circulos = cuello.map((c) => ({ c }));
  const trazo = (w, color, op) => ` stroke="${color}" stroke-width="${w}" stroke-opacity="${op}" stroke-linejoin="round"`;
  const halo = (w, color, op) =>
    piezas.map((p) => `<path d="${p.d}" transform="translate(${p.dx} 0)" fill="${color}"${trazo(w, color, op)}/>`).join('') +
    circulos.map(({ c }) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.r.toFixed(1)}" fill="${color}"${trazo(w, color, op)}/>`).join('') +
    `<g fill="${color}"${trazo(w, color, op)}>${dientesArriba}${dientesAbajo}</g>`;
  const relleno =
    piezas.map((p) => `<path d="${p.d}" transform="translate(${p.dx} 0)" fill="${p.f}"/>`).join('') +
    circulos.map(({ c }) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.r.toFixed(1)}" fill="${sombra}"/>`).join('') +
    `<g fill="${sombra}">${dientesArriba}${dientesAbajo}</g>`;
  // El orden importa: las patas del lado lejano van un poco más claras y la cabeza tapa el final del cuello.
  const cabezaRelleno = path(cabeza, sombra) + path(mandibula, sombra) + `<g fill="${sombra}">${dientesArriba}${dientesAbajo}</g>`;
  const ojo = circulo(-520, 306, 19, '#fff0b0') + `<ellipse cx="-526" cy="306" rx="6" ry="15" fill="#2a0a3a"/>` + circulo(-514, 298, 4.5, '#ffffff');
  const fosa = `<ellipse cx="-742" cy="360" rx="9" ry="6" fill="${luz}" fill-opacity="0.55"/>`;
  const cuerpoSvg = halo(46, resplandor, 0.22) + halo(34, resplandor, 0.35) + halo(17, luz, 1) + relleno + cabezaRelleno + ojo + fosa;
  return lienzo(-1150, 0, 2300, 1080, `<g transform="translate(0 100)">${cuerpoSvg}</g>`);
}

