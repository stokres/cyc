// The title screen: a rising sun over the village roofs, the logo in gold. Painted once (a 240×160 canvas);
// the loop only blits it and blinks the «press A» line.
import { escribir, anchoTexto } from './fuente';
import { azar, ctx, elipse, lienzo, rect, una } from './pixel';

/** The logo text scaled up (nearest) in gold with a dark outline and a bevel. */
function rotulo(s: string, escala: number): HTMLCanvasElement {
  const base = lienzo(anchoTexto(s) + 2, 11);
  escribir(ctx(base), s, 1, 0, '#ffffff');
  const w = base.width * escala;
  const h = 11 * escala;
  const c = lienzo(w + 8, h + 8);
  const x = ctx(c);
  const llena = lienzo(w, h);
  const l = ctx(llena);
  l.drawImage(base, 0, 0, w, h);
  // gold: bands from pale to deep («source-atop» keeps what the other bands painted)
  l.globalCompositeOperation = 'source-atop';
  const bandas = ['#fff3b0', '#ffe27a', '#ffd04a', '#f5b02a', '#e08a1c', '#b8580f'];
  const bh = h / bandas.length;
  bandas.forEach((b, i) => {
    l.fillStyle = b;
    l.fillRect(0, Math.floor(i * bh), w, Math.ceil(bh) + 1);
  });
  // the outline: a dark silhouette in eight directions behind, and a drop shadow
  const sil = lienzo(w, h);
  const s2 = ctx(sil);
  s2.drawImage(base, 0, 0, w, h);
  s2.globalCompositeOperation = 'source-in';
  s2.fillStyle = '#2a0f3a';
  s2.fillRect(0, 0, w, h);
  const t = 1;
  x.globalAlpha = 0.5;
  x.drawImage(sil, 4 + t, 4 + t + 2);
  x.globalAlpha = 1;
  for (let dy = -t; dy <= t; dy++) for (let dx = -t; dx <= t; dx++) if (dx || dy) x.drawImage(sil, 4 + dx, 4 + dy);
  x.drawImage(llena, 4, 4);
  return c;
}

/** The whole static title: sky, sun, roofs and logo. */
export function portada(nombre: { arriba: string; abajo: string; pie: string }): HTMLCanvasElement {
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
    const cy = 112;
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
    // the logo
    const arriba = rotulo(nombre.arriba, 2);
    const abajo = rotulo(nombre.abajo, 3);
    x.drawImage(arriba, Math.round((240 - arriba.width) / 2), 8);
    x.drawImage(abajo, Math.round((240 - abajo.width) / 2), 36);
    // a small sun between the words' ends
    // the footer
    escribir(x, nombre.pie, Math.round((240 - anchoTexto(nombre.pie)) / 2), 148, '#c9bfff', '#0a0826');
    return c;
  });
}
