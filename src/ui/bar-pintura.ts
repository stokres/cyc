// Shared drawings of the Bar del Brío, painted once to bitmaps: the trailer's shots (src/ui/trailer.ts)
// and the chapter 2 minigame of the beers sliding down the bar (src/ui/canas.ts) use the same ones, so
// the bar looks the same everywhere. A frame only draws these images and a few small shapes
// (docs/ESTILO.md, T5.7).

export const azar = (semilla: number) => () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
export const suave = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export const mezclar = (a: number, b: number, u: number) => a + (b - a) * u;

/** A canvas of W×H CSS px at density `dpr`, with its context already scaled. */
export function lienzo(W: number, H: number, dpr: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(W * dpr));
  c.height = Math.max(2, Math.round(H * dpr));
  const x = c.getContext('2d')!;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, x] as const;
}

export const elipse = (x: CanvasRenderingContext2D, ex: number, ey: number, rx: number, ry: number, color: string, giro = 0) => {
  x.fillStyle = color;
  x.beginPath();
  x.ellipse(ex, ey, Math.max(0.1, rx), Math.max(0.1, ry), giro, 0, Math.PI * 2);
  x.fill();
};
// ---------------------------------------------------------------- the bar

/** The bar's counter, painted once: wider than the screen, so the camera can follow a glass. */
export interface Bar {
  img: HTMLCanvasElement;
  /** Its width in CSS px (the height is the screen's). */
  ancho: number;
  /** Where things stand on the counter. */
  encimera: number;
}

/**
 * A bar at night, painted once: a warm dark wall, shelves of bottles in the haze behind, a
 * string of little bulbs, and the counter in front, seen from above: polished wood that gets
 * nearer and warmer towards the bottom, with the bulbs' light on its varnish.
 */
export function pintarBar(W: number, H: number, dpr: number): Bar {
  const ancho = W * 1.5;
  const [img, x] = lienzo(ancho, H, dpr);
  const r = azar(21);
  const fondo = H * 0.56;
  const pared = x.createLinearGradient(0, 0, 0, fondo);
  pared.addColorStop(0, '#140b10');
  pared.addColorStop(1, '#3a1d18');
  x.fillStyle = pared;
  x.fillRect(0, 0, ancho, fondo);
  // Three shelves of bottles.
  for (const by of [H * 0.17, H * 0.32, H * 0.47]) {
    for (let bx = r() * 20; bx < ancho; ) {
      const bw = H * (0.03 + r() * 0.02);
      const bh = H * (0.075 + r() * 0.04);
      x.fillStyle = ['#8a4a1c', '#2e5a2a', '#9aa7a0', '#6a1820', '#b07a2a', '#3a2a4a'][Math.floor(r() * 6)];
      x.beginPath();
      x.roundRect(bx, by - bh, bw, bh, bw * 0.3);
      x.fill();
      x.fillRect(bx + bw * 0.32, by - bh - H * 0.025, bw * 0.36, H * 0.03);
      x.fillStyle = 'rgba(255,220,170,0.25)';
      x.fillRect(bx + bw * 0.18, by - bh * 0.85, bw * 0.14, bh * 0.6);
      bx += bw + H * (0.01 + r() * 0.03);
    }
    x.fillStyle = '#5a3422';
    x.fillRect(0, by, ancho, H * 0.016);
    x.fillStyle = '#8a5a36';
    x.fillRect(0, by, ancho, H * 0.004);
  }
  // A warm haze over the back of the bar, so what is on the counter stands out (F4).
  x.fillStyle = 'rgba(40,18,16,0.45)';
  x.fillRect(0, 0, ancho, fondo);
  // A string of bulbs sagging across the top, each with its own small glow (L5).
  for (let k = 0; k < 3; k++) {
    const x0 = (ancho / 3) * k;
    const x1 = x0 + ancho / 3;
    x.strokeStyle = '#2a1a16';
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(x0, H * 0.04);
    x.quadraticCurveTo((x0 + x1) / 2, H * 0.13, x1, H * 0.04);
    x.stroke();
    for (let j = 1; j < 8; j++) {
      const u = j / 8;
      const bx = mezclar(x0, x1, u);
      const by = H * 0.04 + 4 * u * (1 - u) * H * 0.045 + H * 0.012;
      const halo = x.createRadialGradient(bx, by, 0, bx, by, H * 0.06);
      halo.addColorStop(0, 'rgba(255,190,110,0.35)');
      halo.addColorStop(1, 'rgba(255,190,110,0)');
      x.fillStyle = halo;
      x.fillRect(bx - H * 0.06, by - H * 0.06, H * 0.12, H * 0.12);
      elipse(x, bx, by, H * 0.008, H * 0.011, '#ffd9a0');
    }
  }
  // The counter's far edge, then its top coming towards us.
  x.fillStyle = '#b07a48';
  x.fillRect(0, fondo - H * 0.008, ancho, H * 0.008);
  const tapa = x.createLinearGradient(0, fondo, 0, H);
  tapa.addColorStop(0, '#3a1c10');
  tapa.addColorStop(1, '#8e502c');
  x.fillStyle = tapa;
  x.fillRect(0, fondo, ancho, H - fondo);
  // The grain of the wood, running along the counter.
  x.fillStyle = 'rgba(40,16,8,0.18)';
  for (let k = 0; k < 9; k++) {
    const y = fondo + (H - fondo) * ((k + r() * 0.5) / 9) ** 1.4;
    x.fillRect(0, y, ancho, Math.max(1, H * 0.003 * (1 + k * 0.3)));
  }
  // The bulbs and the bottles shining on the varnish.
  for (let bx = r() * 40; bx < ancho; bx += H * (0.1 + r() * 0.14)) {
    const brillo = x.createLinearGradient(0, fondo, 0, fondo + H * 0.22);
    brillo.addColorStop(0, 'rgba(255,200,130,0.16)');
    brillo.addColorStop(1, 'rgba(255,200,130,0)');
    x.fillStyle = brillo;
    x.fillRect(bx, fondo, H * (0.01 + r() * 0.02), H * 0.22);
  }
  return { img, ancho, encimera: H * 0.83 };
}

/** A pint of beer `ph` px tall with its head of foam, painted once (its bottom centre is at the middle of the bottom). */
export function pintarCana(ph: number, dpr: number) {
  const pw = ph * 0.52;
  const [c, x] = lienzo(pw * 1.3, ph * 1.12, dpr);
  const ox = pw * 0.15;
  const oy = ph * 0.12;
  const vaso = () => {
    x.beginPath();
    x.moveTo(ox, oy);
    x.lineTo(ox + pw, oy);
    x.lineTo(ox + pw * 0.88, oy + ph);
    x.lineTo(ox + pw * 0.12, oy + ph);
    x.closePath();
  };
  x.save();
  vaso();
  x.clip();
  const cerveza = x.createLinearGradient(0, oy, 0, oy + ph);
  cerveza.addColorStop(0, '#f2b632');
  cerveza.addColorStop(1, '#b8701a');
  x.fillStyle = cerveza;
  x.fillRect(0, oy, pw * 1.3, ph);
  x.fillStyle = 'rgba(255,240,200,0.35)';
  x.fillRect(ox + pw * 0.12, oy, pw * 0.1, ph);
  x.restore();
  // The head of foam, spilling a little over the rim.
  x.fillStyle = '#fbf3dc';
  x.fillRect(ox, oy, pw, ph * 0.14);
  for (let k = 0; k < 5; k++) elipse(x, ox + pw * (0.1 + k * 0.2), oy, pw * 0.14, ph * 0.08, '#fbf3dc');
  x.strokeStyle = 'rgba(235,245,250,0.55)';
  x.lineWidth = Math.max(1, ph * 0.012);
  vaso();
  x.stroke();
  x.fillStyle = 'rgba(235,245,250,0.4)';
  x.fillRect(ox + pw * 0.12, oy + ph - ph * 0.05, pw * 0.76, ph * 0.05);
  return { img: c, w: pw * 1.3, h: ph * 1.12 };
}
export type Cana = ReturnType<typeof pintarCana>;

/** The four shots slammed down on the counter, one a beat, and the liquor inside each. */
export const CHUPITOS = ['#d08a2a', '#6fae3a', '#c8323a', '#e0a83a'];

/**
 * Shots and beers on the bar: two pints with their bubbles going up, and a shot glass
 * slammed down on each beat (a quick fall, a squash, a splash), the camera jolting each time.
 */
export function dibujarBarra(x: CanvasRenderingContext2D, W: number, H: number, bar: Bar, cana: Cana, s: number) {
  const golpe = s % 0.5;
  const sacudida = s < 2 ? Math.max(0, 1 - golpe / 0.14) * H * 0.012 : 0;
  const z = 1.04 + 0.04 * suave(s / 2);
  x.save();
  x.translate(W / 2, H / 2 + sacudida * Math.sin(s * 90));
  x.scale(z, z);
  x.translate(-W / 2, -H / 2);
  x.drawImage(bar.img, -(bar.ancho - W) * 0.35, 0, bar.ancho, H);
  const base = bar.encimera;
  // The pints on either side, their bubbles rising.
  for (const [px, fase] of [[W * 0.15, 0], [W * 0.85, 0.5]]) {
    x.drawImage(cana.img, px - cana.w / 2, base - cana.h + cana.h * 0.02, cana.w, cana.h);
    x.fillStyle = 'rgba(255,245,215,0.7)';
    for (let k = 0; k < 6; k++) {
      const u = (s * 0.8 + fase + k / 6) % 1;
      x.fillRect(px - cana.w * 0.22 + ((k * 37) % 10) * cana.w * 0.045, base - cana.h * 0.06 - u * cana.h * 0.68, 2, 2);
    }
  }
  // The shots.
  const sh = H * 0.21;
  const tw = sh * 0.72;
  const bw = sh * 0.56;
  CHUPITOS.forEach((licor, k) => {
    // It lands on the beat: it starts falling just before (the first one is already landing at the cut).
    const d = s - k * 0.5 + 0.07;
    if (d < 0) return;
    const gx = W * (0.335 + k * 0.11);
    const cae = d < 0.07 ? (1 - d / 0.07) ** 2 * H * 0.45 : 0;
    const aplasta = d >= 0.07 && d < 0.2 ? 1 - 0.14 * Math.sin(((d - 0.07) / 0.13) * Math.PI) : 1;
    const alto = sh * aplasta;
    const ancho = 1 + (1 - aplasta) * 0.6;
    const y0 = base - cae;
    x.save();
    x.translate(gx, y0);
    x.scale(ancho, 1);
    // The glass: a thick base, the liquor, the rim.
    x.fillStyle = 'rgba(215,232,238,0.32)';
    x.beginPath();
    x.moveTo(-tw / 2, -alto);
    x.lineTo(tw / 2, -alto);
    x.lineTo(bw / 2, 0);
    x.lineTo(-bw / 2, 0);
    x.closePath();
    x.fill();
    const nivel = 0.62 + (d < 0.3 ? 0.05 * Math.sin(d * 40) * (1 - d / 0.3) : 0);
    x.fillStyle = licor;
    x.beginPath();
    x.moveTo(-mezclar(bw, tw, nivel) / 2 + 2, -alto * nivel);
    x.lineTo(mezclar(bw, tw, nivel) / 2 - 2, -alto * nivel);
    x.lineTo(bw / 2 - 2, -alto * 0.2);
    x.lineTo(-bw / 2 + 2, -alto * 0.2);
    x.closePath();
    x.fill();
    x.fillStyle = 'rgba(235,245,250,0.5)';
    x.fillRect(-bw / 2, -alto * 0.2, bw, alto * 0.2);
    x.fillRect(-tw / 2, -alto, tw, Math.max(1.5, alto * 0.025));
    x.fillStyle = 'rgba(255,255,255,0.35)';
    x.fillRect(-tw * 0.32, -alto * 0.9, tw * 0.08, alto * 0.6);
    x.restore();
    // The splash: drops of liquor thrown up and out, falling back.
    if (d >= 0.07 && d < 0.45) {
      const u = d - 0.07;
      x.fillStyle = licor;
      for (let j = 0; j < 7; j++) {
        const a = -Math.PI / 2 + (j - 3) * 0.38;
        const v = H * (0.5 + (j % 3) * 0.18);
        const dx = Math.cos(a) * v * u;
        const dy = Math.sin(a) * v * u + H * 3.2 * u * u;
        elipse(x, gx + dx, base - sh * 0.62 + dy, H * 0.007, H * 0.009, licor);
      }
    }
  });
  x.restore();
}

