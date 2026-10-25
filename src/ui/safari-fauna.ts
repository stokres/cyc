// The animals of the safari comic, each baked in a few pieces so a frame can bend them with transforms: a giraffe (body
// and neck), an elephant (body, ear, trunk) and an octopus (head and tentacles). Ink line, flat colour, a halftone shade.
import { TINTA, azar, elipse, lienzo, mezcla, rellenar, trama, type X } from './safari-dibujo';

type Punto = [number, number];

/** A tapered limb along a cubic curve (the octopus's tentacles, the elephant's trunk): returns the outline's path pieces. */
function miembro(x: X, p: [Punto, Punto, Punto, Punto], w0: number, w1: number) {
  const n = 28;
  const izq: Punto[] = [];
  const der: Punto[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const m = 1 - u;
    const px = m * m * m * p[0][0] + 3 * m * m * u * p[1][0] + 3 * m * u * u * p[2][0] + u * u * u * p[3][0];
    const py = m * m * m * p[0][1] + 3 * m * m * u * p[1][1] + 3 * m * u * u * p[2][1] + u * u * u * p[3][1];
    const dx = 3 * m * m * (p[1][0] - p[0][0]) + 6 * m * u * (p[2][0] - p[1][0]) + 3 * u * u * (p[3][0] - p[2][0]);
    const dy = 3 * m * m * (p[1][1] - p[0][1]) + 6 * m * u * (p[2][1] - p[1][1]) + 3 * u * u * (p[3][1] - p[2][1]);
    const L = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * Math.pow(u, 0.85)) / 2;
    izq.push([px - (dy / L) * w, py + (dx / L) * w]);
    der.push([px + (dy / L) * w, py - (dx / L) * w]);
  }
  x.beginPath();
  x.moveTo(izq[0][0], izq[0][1]);
  for (const q of izq) x.lineTo(q[0], q[1]);
  for (let i = der.length - 1; i >= 0; i--) x.lineTo(der[i][0], der[i][1]);
  x.closePath();
  return { izq, der };
}

// ---------------------------------------------------------------- giraffe

export interface Jirafa {
  cuerpo: HTMLCanvasElement;
  cuello: HTMLCanvasElement;
  w: number;
  h: number;
  /** Where the neck turns (the shoulder), in CSS px from the bitmaps' top left. */
  pivote: Punto;
}

/** A giraffe facing right, `h` px tall: the body with its legs, and the neck with the head (to sway on the shoulder). */
export function pintarJirafa(h: number, dpr: number, base = '#f0bf55', mancha = '#b86f2e'): Jirafa {
  const k = h / 100;
  const w = 74 * k;
  const lw = Math.max(1.4, k * 1.9);
  const pieza = (dibujar: (x: X) => void) => {
    const [c, x] = lienzo(w, h, dpr);
    x.scale(k, k);
    x.lineJoin = 'round';
    x.lineCap = 'round';
    dibujar(x);
    return c;
  };
  const lwu = lw / k;
  const manchas = (x: X, caja: [number, number, number, number], semilla: number, n: number, esc: number) => {
    const r = azar(semilla);
    x.fillStyle = mancha;
    for (let i = 0; i < n; i++) {
      const px = caja[0] + r() * caja[2];
      const py = caja[1] + r() * caja[3];
      const rr = (2.4 + r() * 2.4) * esc;
      x.beginPath();
      for (let a = 0; a < 7; a++) {
        const an = (a / 7) * Math.PI * 2;
        const rad = rr * (0.75 + r() * 0.5);
        const qx = px + Math.cos(an) * rad;
        const qy = py + Math.sin(an) * rad * 0.85;
        if (a) x.lineTo(qx, qy);
        else x.moveTo(qx, qy);
      }
      x.closePath();
      x.fill();
    }
  };
  const cuerpo = pieza((x) => {
    // Legs: the far pair darker, the near pair in the light; dark hooves.
    const pata = (px: number, py: number, qx: number, color: string) => {
      x.strokeStyle = TINTA;
      x.lineWidth = 5.4 + lwu * 1.6;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(qx, 95);
      x.stroke();
      x.strokeStyle = color;
      x.lineWidth = 5.4;
      x.stroke();
      x.strokeStyle = '#3a2a24';
      x.lineWidth = 5.8;
      x.beginPath();
      x.moveTo(qx, 94);
      x.lineTo(qx, 97.5);
      x.stroke();
    };
    const sombra = mezcla(base, '#8a4a22', 0.35);
    pata(11, 54, 9, sombra);
    pata(37, 54, 38.5, sombra);
    // Tail.
    x.strokeStyle = TINTA;
    x.lineWidth = 2 + lwu * 1.4;
    x.beginPath();
    x.moveTo(4, 47);
    x.quadraticCurveTo(-1, 54, 1, 66);
    x.stroke();
    x.strokeStyle = base;
    x.lineWidth = 2;
    x.stroke();
    elipse(x, 1, 68, 2.4, 3.6, '#5a3220');
    // The torso: a bean sloping down to the rump.
    x.beginPath();
    x.moveTo(3, 50);
    x.bezierCurveTo(3, 41, 14, 39, 26, 40);
    x.lineTo(42, 38);
    x.bezierCurveTo(50, 38, 54, 44, 52, 52);
    x.bezierCurveTo(50, 60, 42, 62, 32, 62);
    x.lineTo(16, 62);
    x.bezierCurveTo(7, 62, 3, 57, 3, 50);
    x.closePath();
    rellenar(x, base, lwu);
    x.save();
    x.clip();
    manchas(x, [4, 40, 46, 22], 5, 11, 1);
    trama(x, 0, 52, 60, 64, 'rgba(110,50,20,0.55)', (_a, b) => (b - 50) / 12, 3.2, 1.2);
    x.restore();
    pata(19, 56, 17.5, base);
    pata(46, 56, 47.5, base);
  });
  // The neck is drawn in the same frame as the body, so the pivot is just a point; it goes behind the body when put first.
  const cuello = pieza((x) => {
    // A curved neck from the shoulder (44, 48) up to the head at (62, 13).
    const cur: [Punto, Punto, Punto, Punto] = [[43, 50], [46, 36], [52, 26], [58, 15]];
    miembro(x, cur, 11, 7.2);
    rellenar(x, base, lwu);
    x.save();
    miembro(x, cur, 11, 7.2);
    x.clip();
    manchas(x, [42, 14, 18, 38], 9, 9, 0.8);
    // Shade on the lower-left of the neck.
    x.fillStyle = 'rgba(120,60,24,0.28)';
    x.fillRect(38, 14, 8, 40);
    x.restore();
    // Mane: a dark ridge along the back of the neck.
    x.strokeStyle = '#5a3220';
    x.lineWidth = 2.2;
    x.beginPath();
    x.moveTo(40, 47);
    x.bezierCurveTo(42, 34, 48, 24, 54, 12);
    x.stroke();
    // Ossicones, ear, head, muzzle, eye.
    x.strokeStyle = TINTA;
    x.lineWidth = 2.6 + lwu;
    x.beginPath();
    x.moveTo(57, 9);
    x.lineTo(56, 3);
    x.moveTo(61, 8);
    x.lineTo(62.5, 2.5);
    x.stroke();
    x.strokeStyle = base;
    x.lineWidth = 1.6;
    x.stroke();
    elipse(x, 56, 2.4, 2, 2, '#5a3220');
    elipse(x, 62.6, 1.9, 2, 2, '#5a3220');
    x.beginPath();
    x.ellipse(54.5, 9.5, 3.4, 1.6, -0.7, 0, Math.PI * 2);
    rellenar(x, mezcla(base, '#8a4a22', 0.3), lwu * 0.8);
    x.beginPath();
    x.ellipse(60.5, 12.5, 7.6, 4.8, 0.32, 0, Math.PI * 2);
    rellenar(x, base, lwu);
    x.beginPath();
    x.ellipse(67, 15.8, 5.6, 3.8, 0.28, 0, Math.PI * 2);
    rellenar(x, '#f6dca0', lwu);
    elipse(x, 70.2, 14.8, 0.9, 0.7, '#3a2a24');
    elipse(x, 69.8, 17.4, 0.9, 0.7, '#3a2a24');
    elipse(x, 62, 10.8, 1.5, 1.7, '#1c1218');
    elipse(x, 62.5, 10.2, 0.55, 0.55, '#ffffff');
    x.strokeStyle = TINTA;
    x.lineWidth = 0.8;
    x.beginPath();
    x.moveTo(63.2, 18);
    x.quadraticCurveTo(66, 19.4, 68.4, 18.4);
    x.stroke();
  });
  return { cuerpo, cuello, w, h, pivote: [43 * k, 50 * k] };
}

// ---------------------------------------------------------------- elephant

export interface Elefante {
  cuerpo: HTMLCanvasElement;
  oreja: HTMLCanvasElement;
  trompa: HTMLCanvasElement;
  w: number;
  h: number;
  /** Pivots: the ear's top, the trunk's root. */
  pivoteOreja: Punto;
  pivoteTrompa: Punto;
}

/** An elephant facing right, `h` px tall: body and head, the ear (flaps) and the trunk (rises to trumpet). */
export function pintarElefante(h: number, dpr: number, gris = '#a79ab0'): Elefante {
  const k = h / 80;
  const w = 108 * k;
  const lw = Math.max(1.5, k * 1.7);
  const lwu = lw / k;
  const claro = mezcla(gris, '#ffffff', 0.25);
  const oscuro = mezcla(gris, '#3a2a4a', 0.35);
  const pieza = (dibujar: (x: X) => void) => {
    const [c, x] = lienzo(w, h, dpr);
    x.scale(k, k);
    x.lineJoin = 'round';
    x.lineCap = 'round';
    dibujar(x);
    return c;
  };
  const cuerpo = pieza((x) => {
    const pata = (px: number, color: string) => {
      x.beginPath();
      x.roundRect(px, 46, 13, 32, 5);
      rellenar(x, color, lwu);
      // Toenails.
      x.fillStyle = '#efe4d4';
      for (const d of [2, 6, 10]) {
        x.beginPath();
        x.roundRect(px + d - 0.2, 74.4, 2.4, 3, 1);
        x.fill();
      }
    };
    pata(26, oscuro);
    pata(66, oscuro);
    // Tail.
    x.strokeStyle = TINTA;
    x.lineWidth = 2.6 + lwu;
    x.beginPath();
    x.moveTo(11, 30);
    x.quadraticCurveTo(4, 40, 7, 58);
    x.stroke();
    x.strokeStyle = gris;
    x.lineWidth = 1.7;
    x.stroke();
    elipse(x, 7, 60, 2.2, 4, '#4a3a58');
    // The body and the head, one shape.
    x.beginPath();
    x.moveTo(8, 38);
    x.bezierCurveTo(6, 16, 24, 8, 46, 9);
    x.bezierCurveTo(62, 8, 72, 6, 82, 10);
    x.bezierCurveTo(98, 12, 104, 26, 98, 40);
    x.lineTo(95, 46);
    x.lineTo(84, 50);
    x.lineTo(80, 60);
    x.lineTo(76, 60);
    x.lineTo(74, 56);
    x.bezierCurveTo(66, 58, 44, 58, 32, 56);
    x.bezierCurveTo(22, 56, 10, 52, 8, 38);
    x.closePath();
    rellenar(x, gris, lwu);
    x.save();
    x.clip();
    trama(x, 0, 36, 108, 62, 'rgba(60,40,80,0.55)', (_a, b) => (b - 34) / 26, 3.4, 1.3);
    trama(x, 0, 6, 108, 26, 'rgba(255,255,255,0.28)', (_a, b) => 1 - (b - 6) / 20, 3.4, 1.1);
    // Wrinkles.
    x.strokeStyle = 'rgba(60,40,80,0.4)';
    x.lineWidth = 0.9;
    for (const [a, b, c2, d] of [[24, 22, 30, 38], [40, 18, 44, 40], [56, 20, 58, 36]] as number[][]) {
      x.beginPath();
      x.moveTo(a, b);
      x.quadraticCurveTo((a + c2) / 2 + 2, (b + d) / 2, c2, d);
      x.stroke();
    }
    x.restore();
    // Face: eye, brow, cheek, and the tusks.
    elipse(x, 90, 24, 2.6, 3.1, '#fff7e6');
    elipse(x, 90.6, 24.4, 1.6, 2, '#1c1218');
    elipse(x, 91, 23.6, 0.6, 0.6, '#ffffff');
    x.strokeStyle = TINTA;
    x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(86, 20.4);
    x.quadraticCurveTo(90, 18.4, 94, 20.8);
    x.stroke();
    x.beginPath();
    x.moveTo(94, 38);
    x.quadraticCurveTo(102, 42, 102, 52);
    x.quadraticCurveTo(98, 46, 92, 43);
    x.closePath();
    rellenar(x, '#f6ecd4', lwu * 0.8);
    pata(36, gris);
    pata(76, gris);
  });
  const oreja = pieza((x) => {
    // A big ear hanging from its top (78, 12): wider at the bottom, with a pink inside and veins.
    x.beginPath();
    x.moveTo(80, 12);
    x.bezierCurveTo(60, 10, 54, 28, 60, 46);
    x.bezierCurveTo(66, 58, 82, 56, 88, 42);
    x.bezierCurveTo(92, 30, 90, 16, 80, 12);
    x.closePath();
    rellenar(x, claro, lwu);
    x.save();
    x.clip();
    x.fillStyle = '#d9a0b0';
    x.beginPath();
    x.ellipse(76, 36, 9, 15, 0.1, 0, Math.PI * 2);
    x.fill();
    trama(x, 54, 14, 94, 60, 'rgba(60,40,80,0.45)', (a) => (94 - a) / 40, 3.4, 1.2);
    x.restore();
    x.strokeStyle = 'rgba(60,40,80,0.45)';
    x.lineWidth = 0.9;
    x.beginPath();
    x.moveTo(78, 16);
    x.quadraticCurveTo(70, 30, 70, 46);
    x.moveTo(80, 18);
    x.quadraticCurveTo(80, 32, 78, 50);
    x.stroke();
  });
  const trompa = pieza((x) => {
    // The trunk hangs from the face, root at (96, 30), curling at the tip.
    const cur: [Punto, Punto, Punto, Punto] = [[95, 30], [104, 44], [102, 62], [96, 70]];
    miembro(x, cur, 13, 8);
    rellenar(x, gris, lwu);
    x.save();
    miembro(x, cur, 13, 8);
    x.clip();
    trama(x, 88, 28, 108, 74, 'rgba(60,40,80,0.5)', (a) => (a - 88) / 16, 3.2, 1.2);
    x.strokeStyle = 'rgba(60,40,80,0.45)';
    x.lineWidth = 0.9;
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      x.moveTo(94 + i * 0.7, 38 + i * 5);
      x.lineTo(104 + i * 0.4, 36 + i * 5.4);
      x.stroke();
    }
    x.restore();
    x.fillStyle = 'rgba(40,20,50,0.7)';
    x.beginPath();
    x.ellipse(94.6, 71, 2.6, 1.3, 0.4, 0, Math.PI * 2);
    x.fill();
  });
  return { cuerpo, oreja, trompa, w, h, pivoteOreja: [78 * k, 14 * k], pivoteTrompa: [95 * k, 31 * k] };
}

// ---------------------------------------------------------------- octopus

export interface Pulpo {
  cabeza: HTMLCanvasElement;
  tentaculo: HTMLCanvasElement[];
  /** Size of the head bitmap and of each tentacle's bitmap; the tentacles' pivots (their roots) are at `raiz`. */
  cw: number;
  ch: number;
  tw: number;
  th: number;
  raiz: Punto;
}

/**
 * A giant octopus, `r` px of head radius: a dome of a head with big sleepy eyes, and a few tentacles with suckers, each its
 * own bitmap whose root is at (`raiz`) so it can be waved or slapped down.
 */
export function pintarPulpo(r: number, dpr: number, piel = '#8e4fae', clara = '#c28ad6'): Pulpo {
  const lw = Math.max(1.8, r * 0.05);
  const cw = r * 2.5;
  const ch = r * 2.4;
  const [cabeza, x] = lienzo(cw, ch, dpr);
  x.translate(cw / 2, ch * 0.55);
  x.lineJoin = 'round';
  // The mantle: a tall dome.
  x.beginPath();
  x.moveTo(-r * 1.0, r * 0.7);
  x.bezierCurveTo(-r * 1.15, -r * 0.5, -r * 0.7, -r * 1.2, 0, -r * 1.2);
  x.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.15, -r * 0.5, r * 1.0, r * 0.7);
  x.bezierCurveTo(r * 0.5, r * 0.95, -r * 0.5, r * 0.95, -r * 1.0, r * 0.7);
  x.closePath();
  rellenar(x, piel, lw);
  x.save();
  x.clip();
  trama(x, -r * 1.2, -r * 1.2, r * 1.2, r, 'rgba(255,230,250,0.4)', (px, py) => (-(px + py * 0.3) / r) * 0.6 + 0.1, Math.max(3.4, r * 0.1), Math.max(1.1, r * 0.04));
  trama(x, -r * 1.2, -r * 0.2, r * 1.2, r, 'rgba(40,10,60,0.55)', (px, py) => ((py + r * 0.1) / r) * 0.9 + (px / r) * 0.2, Math.max(3.4, r * 0.1), Math.max(1.2, r * 0.045));
  // Spots on the mantle.
  const q = azar(3);
  x.fillStyle = clara;
  for (let i = 0; i < 9; i++) {
    const a = q() * Math.PI;
    const d = q() * r * 0.8;
    elipse(x, Math.cos(a + 3.14) * d, -r * 0.6 + Math.sin(a) * d * 0.5, r * (0.05 + q() * 0.07), r * (0.04 + q() * 0.06), clara);
  }
  x.restore();
  // The eyes: big, white, half hidden by heavy lids, pupils looking at the caravan.
  for (const ex of [-r * 0.42, r * 0.42]) {
    x.beginPath();
    x.arc(ex, r * 0.05, r * 0.3, 0, Math.PI * 2);
    rellenar(x, '#fff7e6', lw);
    elipse(x, ex + r * 0.07, r * 0.12, r * 0.14, r * 0.17, '#1c1218');
    elipse(x, ex + r * 0.1, r * 0.06, r * 0.045, r * 0.045, '#ffffff');
    x.beginPath();
    x.moveTo(ex - r * 0.33, r * 0.06);
    x.lineTo(ex - r * 0.3, -r * 0.16);
    x.quadraticCurveTo(ex, -r * 0.34, ex + r * 0.3, -r * 0.16);
    x.lineTo(ex + r * 0.33, r * 0.06);
    x.quadraticCurveTo(ex, -r * 0.04, ex - r * 0.33, r * 0.06);
    x.closePath();
    rellenar(x, mezcla(piel, '#4a2060', 0.2), lw);
  }
  x.strokeStyle = TINTA;
  x.lineWidth = lw;
  x.beginPath();
  x.moveTo(-r * 0.2, r * 0.48);
  x.quadraticCurveTo(0, r * 0.62, r * 0.2, r * 0.48);
  x.stroke();
  // Tentacle: root at the top left of its bitmap, going down and curling; suckers along its inner edge.
  const tw = r * 1.3;
  const th = r * 2.3;
  const raiz: Punto = [r * 0.3, r * 0.1];
  const tent = (variante: number) => {
    const [c, t] = lienzo(tw, th, dpr);
    t.lineJoin = 'round';
    const curva: [Punto, Punto, Punto, Punto][] = [
      [[raiz[0], raiz[1]], [r * 0.9, r * 0.8], [r * 0.1, r * 1.5], [r * 0.8, r * 2.1]],
      [[raiz[0], raiz[1]], [r * 0.1, r * 0.9], [r * 1.0, r * 1.4], [r * 0.5, r * 2.15]],
      [[raiz[0], raiz[1]], [r * 0.8, r * 0.7], [r * 0.9, r * 1.4], [r * 0.3, r * 2.05]],
    ];
    const cur = curva[variante % 3];
    const { izq } = miembro(t, cur, r * 0.42, r * 0.07);
    rellenar(t, piel, lw);
    t.save();
    miembro(t, cur, r * 0.42, r * 0.07);
    t.clip();
    trama(t, 0, 0, tw, th, 'rgba(40,10,60,0.5)', (px) => (px - r * 0.2) / (r * 0.8), Math.max(3.2, r * 0.09), Math.max(1.1, r * 0.04));
    for (let i = 3; i < izq.length - 3; i += 3) {
      const [sx, sy] = izq[i];
      const rr = r * 0.075 * (1 - i / izq.length * 0.7);
      elipse(t, sx + r * 0.1, sy + r * 0.03, rr, rr, '#f4b6d0');
    }
    t.restore();
    return c;
  };
  return { cabeza, tentaculo: [tent(0), tent(1), tent(2)], cw, ch, tw, th, raiz };
}
