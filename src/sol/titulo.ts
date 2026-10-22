// The title screen of «Alacant Sun»: a rising sun over the village roofs, the logo on top. The backdrop is painted
// once (a 240×160 canvas); the loop only blits it, the logo and the blinking «press A» line.
import { escribir, anchoTexto } from './fuente';
import { azar, ctx, elipse, lienzo, rect, una } from './pixel';
import logoUrl from './logo-alacant-sun.png';

// The «Alacant Sun» logo: a ready-made picture (216×99), loaded once and blitted as it is, unscaled.
let logo: HTMLImageElement | null = null;

/** Draws the logo at the top centre of the 240×160 screen. If it has not loaded yet, this frame goes without it. */
export function dibujarLogo(g: CanvasRenderingContext2D) {
  if (!logo) {
    logo = new Image();
    logo.src = logoUrl;
  }
  if (!logo.complete || !logo.naturalWidth) return;
  const smooth = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.drawImage(logo, Math.round((240 - logo.naturalWidth) / 2), 1);
  g.imageSmoothingEnabled = smooth;
}

/** The static backdrop of the title: sky, sun, roofs and footer (the logo goes on top, `dibujarLogo`). */
export function portada(pie: string): HTMLCanvasElement {
  return una('portada', () => {
    const c = lienzo(240, 160);
    const x = ctx(c);
    // sky in bands, from deep indigo to a hot horizon
    const cielo = ['#120f3e', '#1a1352', '#241963', '#2f1d74', '#3e2285', '#552a8a', '#7a3490', '#a8409a', '#d4586a', '#ee7e48', '#f8a43a', '#ffc54a'];
    cielo.forEach((col, i) => rect(x, col, 0, Math.round((i * 116) / cielo.length), 240, Math.ceil(116 / cielo.length) + 1));
    // stars
    const r = azar(5);
    for (let i = 0; i < 40; i++) {
      const sx = Math.floor(r() * 240);
      const sy = Math.floor(r() * 60);
      rect(x, i % 5 === 0 ? '#ffffff' : '#b8b0f0', sx, sy, 1, 1);
    }
    // the sun: rays, glow rings and the disc
    const cx = 120;
    const cy = 122;
    for (let i = 0; i < 16; i++) {
      const a = Math.PI + (i / 15) * Math.PI;
      for (let d = 36; d < 96; d++) {
        const ancho = i % 2 ? 1 : 2;
        const px = Math.round(cx + Math.cos(a) * d);
        const py = Math.round(cy + Math.sin(a) * d);
        if (py > 111) continue;
        x.fillStyle = `rgba(255,214,110,${(0.5 * (96 - d)) / 60})`;
        x.fillRect(px, py, ancho, 1);
      }
    }
    for (let i = 0; i < 5; i++) elipse(x, `rgba(255,200,90,${0.1 + i * 0.03})`, cx, cy, 52 - i * 5, 52 - i * 5);
    elipse(x, '#ffb52a', cx, cy, 33, 33);
    elipse(x, '#ffd04a', cx, cy, 30, 30);
    elipse(x, '#ffe88a', cx, cy - 2, 24, 24);
    elipse(x, '#fff6c8', cx - 3, cy - 6, 14, 14);
    // everything below the horizon
    rect(x, '#1a1048', 0, 112, 240, 48);
    // far hills
    for (let px = 0; px < 240; px++) {
      const hy = 108 + Math.round(Math.sin(px / 23) * 3 + Math.sin(px / 9) * 1.2);
      rect(x, '#2c1a5c', px, hy, 1, 112 - hy);
    }
    // the village: roofs and lit windows
    const techos = ['#8a2a4a', '#2a5a8a', '#8a4a2a', '#4a2a8a', '#2a6a5a', '#8a3a2a'];
    let px = -4;
    let k = 0;
    while (px < 240) {
      const w = 22 + Math.floor(r() * 16);
      const alto = 14 + Math.floor(r() * 14);
      const base = 124 + Math.floor(r() * 6);
      const y0 = base - alto;
      const tec = techos[k++ % techos.length];
      rect(x, '#2a1c58', px, y0 + 8, w, alto);
      // roof: a trapezoid
      for (let j = 0; j < 9; j++) rect(x, tec, px - 2 + Math.floor(j / 2), y0 + j, w + 4 - Math.floor(j / 2) * 2, 1);
      rect(x, '#0e0a2a', px - 2, y0 + 8, w + 4, 1);
      // windows
      for (let wx = px + 4; wx < px + w - 4; wx += 8) {
        if (r() > 0.35) rect(x, '#ffd56a', wx, y0 + 12 + Math.floor(r() * 3), 3, 3);
      }
      px += w - 2;
    }
    // round trees in the front
    for (let tx = 6; tx < 240; tx += 28 + Math.floor(r() * 10)) {
      const ty = 138 + Math.floor(r() * 8);
      elipse(x, '#0c0a2e', tx, ty, 11, 12);
      elipse(x, '#1a1a4a', tx - 2, ty - 2, 8, 9);
      rect(x, '#0c0a2e', tx - 1, ty + 8, 3, 12);
    }
    rect(x, '#0a0826', 0, 150, 240, 10);
    // the footer
    escribir(x, pie, Math.round((240 - anchoTexto(pie)) / 2), 148, '#c9bfff', '#0a0826');
    return c;
  });
}
