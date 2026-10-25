// Landscape pieces shared by the safari comic's shots: a filled profile under a curve, a sun with rays, a mesa, a cactus...
import { TINTA, alfa, azar, elipse, lienzo, mezcla, rellenar, trama, type X } from './safari-dibujo';

/** A filled shape under a curve: `f(px)` is the height above `base` (px from 0 to `ancho` in steps of `paso`), with an ink line on top. */
export function perfil(x: X, ancho: number, base: number, f: (px: number) => number, fill: string | CanvasGradient, lw = 0, paso = 4, extra = 0) {
  x.beginPath();
  x.moveTo(-paso, base + extra);
  for (let px = -paso; px <= ancho + paso; px += paso) x.lineTo(px, base - f(px));
  x.lineTo(ancho + paso, base + extra);
  x.closePath();
  x.fillStyle = fill;
  x.fill();
  if (lw > 0) {
    x.beginPath();
    for (let px = -paso; px <= ancho + paso; px += paso) {
      if (px === -paso) x.moveTo(px, base - f(px));
      else x.lineTo(px, base - f(px));
    }
    x.lineWidth = lw;
    x.strokeStyle = TINTA;
    x.lineJoin = 'round';
    x.stroke();
  }
}

/** A sun with rays, as a bitmap to be turned slowly: halo, triangular rays, the disc with its ink and a halftone shade. */
export function pintarSol(r: number, dpr: number, disco = '#fff0b0', rayo = '#ffd24a', halo = 'rgba(255,214,120,0.45)') {
  const S = r * 4.4;
  const [c, x] = lienzo(S, S, dpr);
  x.translate(S / 2, S / 2);
  const g = x.createRadialGradient(0, 0, r * 0.8, 0, 0, S / 2);
  g.addColorStop(0, halo);
  g.addColorStop(1, 'rgba(255,214,120,0)');
  x.fillStyle = g;
  x.fillRect(-S / 2, -S / 2, S, S);
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    x.save();
    x.rotate(a);
    x.beginPath();
    x.moveTo(r * 1.12, -r * 0.16);
    x.lineTo(r * (i % 2 ? 1.5 : 1.8), 0);
    x.lineTo(r * 1.12, r * 0.16);
    x.closePath();
    rellenar(x, rayo, Math.max(1.4, r * 0.05));
    x.restore();
  }
  x.beginPath();
  x.arc(0, 0, r, 0, Math.PI * 2);
  rellenar(x, disco, Math.max(2, r * 0.07));
  x.save();
  x.clip();
  trama(x, -r, -r * 0.1, r, r, 'rgba(240,150,50,0.55)', (_a, b) => (b + r * 0.1) / (r * 1.1), Math.max(3.4, r * 0.14), Math.max(1, r * 0.06));
  x.restore();
  return { img: c, s: S };
}

/** A wind turbine's three blades, as a bitmap to be turned (its hub in the middle). */
export function pintarAspas(largo: number, dpr: number) {
  const S = largo * 2 + 6;
  const [c, x] = lienzo(S, S, dpr);
  x.translate(S / 2, S / 2);
  for (let i = 0; i < 3; i++) {
    x.save();
    x.rotate((i / 3) * Math.PI * 2);
    x.beginPath();
    x.moveTo(0, -largo * 0.05);
    x.quadraticCurveTo(largo * 0.5, -largo * 0.1, largo, -largo * 0.01);
    x.lineTo(largo, largo * 0.015);
    x.quadraticCurveTo(largo * 0.5, largo * 0.07, 0, largo * 0.05);
    x.closePath();
    rellenar(x, '#f4efe4', Math.max(1.2, largo * 0.03));
    x.restore();
  }
  elipse(x, 0, 0, largo * 0.08, largo * 0.08, '#d8d0c0');
  x.beginPath();
  x.arc(0, 0, largo * 0.08, 0, Math.PI * 2);
  x.lineWidth = Math.max(1.2, largo * 0.03);
  x.strokeStyle = TINTA;
  x.stroke();
  return { img: c, s: S };
}

/** The silhouette of a big black bull on a hill (the roadside billboards of Spain), facing right. `h` is its height. */
export function pintarToro(h: number, dpr: number) {
  const w = h * 1.55;
  const [c, x] = lienzo(w + 6, h + 6, dpr);
  x.translate(3, 3);
  const k = h / 70;
  x.scale(k, k);
  x.beginPath();
  x.moveTo(6, 34);
  x.bezierCurveTo(8, 22, 24, 15, 40, 17);
  x.bezierCurveTo(50, 8, 62, 9, 70, 17);
  x.lineTo(76, 15);
  x.bezierCurveTo(76, 8, 80, 4, 87, 2);
  x.bezierCurveTo(83, 6, 83, 10, 84, 15);
  x.bezierCurveTo(90, 17, 96, 22, 98, 30);
  x.bezierCurveTo(100, 36, 96, 40, 90, 38);
  x.lineTo(82, 36);
  x.bezierCurveTo(78, 42, 74, 46, 70, 46);
  x.lineTo(70, 66);
  x.lineTo(63, 66);
  x.lineTo(60, 48);
  x.lineTo(42, 48);
  x.lineTo(38, 66);
  x.lineTo(31, 66);
  x.lineTo(30, 48);
  x.bezierCurveTo(24, 50, 16, 48, 14, 44);
  x.lineTo(12, 66);
  x.lineTo(5, 66);
  x.bezierCurveTo(4, 56, 6, 48, 4, 42);
  x.bezierCurveTo(2, 40, 4, 36, 6, 34);
  x.closePath();
  x.fillStyle = '#231a1e';
  x.fill();
  // The other horn, behind, and the tail.
  x.strokeStyle = '#231a1e';
  x.lineWidth = 2.4;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(74, 14);
  x.bezierCurveTo(72, 6, 74, 2, 78, 0);
  x.moveTo(6, 36);
  x.bezierCurveTo(-2, 40, -2, 50, 0, 56);
  x.stroke();
  x.fillStyle = 'rgba(255,200,150,0.22)';
  x.fillRect(40, 20, 28, 2);
  return { img: c, w: w + 6, h: h + 6 };
}

/** A saguaro cactus with two arms (`arm` false: without its right arm, which is a bitmap of its own). */
export function pintarCactus(h: number, dpr: number, verde = '#5f9a4a') {
  const w = h * 0.75;
  const arm = { x: w * 0.5 + h * 0.07, y: h * 0.4 };
  const dibujar = (x: X, conBrazoDerecho: boolean) => {
    const r = h * 0.07;
    const lw = Math.max(1.6, h * 0.025);
    const tronco = () => {
      x.beginPath();
      x.roundRect(w / 2 - r, h * 0.05, r * 2, h * 0.95, r);
    };
    // Left arm: out, then up.
    const brazoIz = () => {
      x.beginPath();
      x.roundRect(w / 2 - r - h * 0.2, h * 0.42, h * 0.2 + r, r * 1.5, r * 0.75);
      x.roundRect(w / 2 - r - h * 0.2, h * 0.2, r * 1.5, h * 0.3, r * 0.75);
    };
    const brazoDe = () => {
      x.beginPath();
      x.roundRect(w / 2, h * 0.5, h * 0.2 + r, r * 1.5, r * 0.75);
      x.roundRect(w / 2 + h * 0.2 + r - r * 1.5, h * 0.3, r * 1.5, h * 0.28, r * 0.75);
    };
    const formas = [tronco, brazoIz, ...(conBrazoDerecho ? [brazoDe] : [])];
    for (const f of formas) {
      f();
      x.lineWidth = lw * 2;
      x.strokeStyle = TINTA;
      x.lineJoin = 'round';
      x.stroke();
    }
    for (const f of formas) {
      f();
      x.fillStyle = verde;
      x.fill();
    }
    // Ribs and spines.
    x.strokeStyle = mezcla(verde, '#1c3a24', 0.5);
    x.lineWidth = lw * 0.7;
    x.beginPath();
    for (const o of [-0.45, 0.45]) {
      x.moveTo(w / 2 + o * r, h * 0.1);
      x.lineTo(w / 2 + o * r, h * 0.97);
    }
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.22)';
    x.fillRect(w / 2 - r * 0.7, h * 0.1, r * 0.4, h * 0.8);
  };
  const [c, x] = lienzo(w, h, dpr);
  dibujar(x, false);
  const [c2, y] = lienzo(w, h, dpr);
  dibujar(y, true);
  // The arm alone (a separate bitmap to be broken off): out and up, 0.2h by 0.3h.
  const aw = h * 0.2 + h * 0.1;
  const ah = h * 0.32;
  const [brazo, z] = lienzo(aw, ah, dpr);
  {
    const r = h * 0.07;
    const lw = Math.max(1.6, h * 0.025);
    const f = () => {
      z.beginPath();
      z.roundRect(2, ah - r * 1.5 - 2, h * 0.2 + r, r * 1.5, r * 0.75);
      z.roundRect(h * 0.2 + r - r * 1.5 + 2, 2, r * 1.5, ah - 4, r * 0.75);
    };
    f();
    z.lineWidth = lw * 2;
    z.strokeStyle = TINTA;
    z.lineJoin = 'round';
    z.stroke();
    f();
    z.fillStyle = verde;
    z.fill();
  }
  return { sin: c, con: c2, brazo, w, h, aw, ah, arm };
}

/** A far mesa with strata, a flat top and a cracked face; `color` is its lit side. */
export function mesa(x: X, bx: number, base: number, ancho: number, alto: number, color: string, sombra: string, semilla = 1, lw = 2) {
  const r = azar(semilla);
  const t = ancho * 0.16;
  const trazar = () => {
    x.beginPath();
    x.moveTo(bx, base);
    x.lineTo(bx + t * 0.5, base - alto * 0.55);
    x.lineTo(bx + t, base - alto * 0.62);
    x.lineTo(bx + t * 1.2, base - alto * 0.95);
    x.lineTo(bx + ancho * 0.42, base - alto);
    x.lineTo(bx + ancho * 0.5, base - alto * 0.94);
    x.lineTo(bx + ancho - t * 1.2, base - alto * 0.96);
    x.lineTo(bx + ancho - t * 0.8, base - alto * 0.6);
    x.lineTo(bx + ancho - t * 0.2, base - alto * 0.5);
    x.lineTo(bx + ancho, base);
    x.closePath();
  };
  trazar();
  rellenar(x, color, lw);
  x.save();
  trazar();
  x.clip();
  // The shaded half (the sun comes from the right), strata and a few cracks.
  x.fillStyle = sombra;
  x.beginPath();
  x.moveTo(bx, base);
  x.lineTo(bx + ancho * 0.52, base);
  x.lineTo(bx + ancho * 0.46, base - alto);
  x.lineTo(bx + t, base - alto);
  x.closePath();
  x.fill();
  trama(x, bx, base - alto, bx + ancho, base, alfa(sombra, 0.9), (px, py) => (py - (base - alto)) / alto * 0.9 + (bx + ancho - px) / ancho * 0.2 - 0.25, 4.6, 1.5);
  x.strokeStyle = 'rgba(43,28,32,0.35)';
  x.lineWidth = lw * 0.6;
  for (let k = 1; k < 6; k++) {
    const y = base - alto * (k / 6) + (r() - 0.5) * 3;
    x.beginPath();
    x.moveTo(bx, y);
    x.lineTo(bx + ancho, y + (r() - 0.5) * 4);
    x.stroke();
  }
  x.lineWidth = lw * 0.8;
  for (let k = 0; k < 3; k++) {
    const gx = bx + ancho * (0.2 + r() * 0.6);
    x.beginPath();
    x.moveTo(gx, base - alto * (0.55 + r() * 0.3));
    x.lineTo(gx + (r() - 0.5) * 8, base - alto * 0.1);
    x.stroke();
  }
  x.restore();
  x.beginPath();
  x.moveTo(bx, base);
  x.lineTo(bx + t * 0.5, base - alto * 0.55);
  x.lineTo(bx + t, base - alto * 0.62);
  x.lineTo(bx + t * 1.2, base - alto * 0.95);
  x.lineTo(bx + ancho * 0.42, base - alto);
  x.lineTo(bx + ancho * 0.5, base - alto * 0.94);
  x.lineTo(bx + ancho - t * 1.2, base - alto * 0.96);
  x.lineTo(bx + ancho - t * 0.8, base - alto * 0.6);
  x.lineTo(bx + ancho - t * 0.2, base - alto * 0.5);
  x.lineTo(bx + ancho, base);
  x.lineWidth = lw;
  x.strokeStyle = TINTA;
  x.lineJoin = 'round';
  x.stroke();
}
