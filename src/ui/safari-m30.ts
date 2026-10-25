// Safari comic, shot 1: the caravan on the M-30 at dawn, with Madrid's blocks of flats, the gasometer and the four towers
// behind, a blue gantry sign («A-2 Zaragoza») going over it and the morning's traffic. Painted once; a frame draws images.
import { texto } from '../juego/textos';
import { azar, TINTA, elipse, lienzo, mezcla, nube, rellenar, trama, vertical, envolver } from './safari-dibujo';
import { crearVehiculoComic, dibujarTile, dibujarVehiculoComic, hornearTile, polvo, soltar, ventanaDe, type Constructor, type Tile } from './safari-base';

/** A side-on car with the comic's ink; `taxi` is Madrid's white one with the red diagonal band. */
function pintarCoche(w: number, dp: number, color: string, tipo: 'taxi' | 'coche' | 'furgon') {
  const h = w * (tipo === 'furgon' ? 0.5 : 0.42);
  const [c, x] = lienzo(w + 4, h + 4, dp);
  x.translate(2, 2);
  const lw = Math.max(1.3, w * 0.025);
  x.lineJoin = 'round';
  // Body and cabin.
  x.beginPath();
  if (tipo === 'furgon') {
    x.roundRect(0, h * 0.08, w, h * 0.68, w * 0.06);
  } else {
    x.moveTo(0, h * 0.74);
    x.lineTo(0, h * 0.5);
    x.quadraticCurveTo(0, h * 0.42, w * 0.1, h * 0.4);
    x.lineTo(w * 0.28, h * 0.36);
    x.lineTo(w * 0.38, h * 0.08);
    x.lineTo(w * 0.7, h * 0.08);
    x.lineTo(w * 0.8, h * 0.38);
    x.lineTo(w * 0.94, h * 0.44);
    x.quadraticCurveTo(w, h * 0.46, w, h * 0.56);
    x.lineTo(w, h * 0.74);
    x.closePath();
  }
  rellenar(x, color, lw);
  x.save();
  x.clip();
  trama(x, 0, h * 0.5, w, h, 'rgba(40,20,30,0.38)', (_a, b) => (b - h * 0.5) / (h * 0.3), 3.8, 1.3);
  if (tipo === 'taxi') {
    x.fillStyle = '#d63a30';
    x.beginPath();
    x.moveTo(w * 0.42, h * 0.74);
    x.lineTo(w * 0.52, h * 0.36);
    x.lineTo(w * 0.62, h * 0.36);
    x.lineTo(w * 0.52, h * 0.74);
    x.fill();
  }
  x.restore();
  // Windows.
  x.fillStyle = '#7a8cb0';
  x.beginPath();
  if (tipo === 'furgon') {
    x.roundRect(w * 0.72, h * 0.16, w * 0.22, h * 0.26, w * 0.03);
  } else {
    x.moveTo(w * 0.31, h * 0.36);
    x.lineTo(w * 0.4, h * 0.14);
    x.lineTo(w * 0.68, h * 0.14);
    x.lineTo(w * 0.76, h * 0.36);
    x.closePath();
  }
  x.fill();
  x.strokeStyle = TINTA;
  x.lineWidth = lw * 0.8;
  x.stroke();
  if (tipo === 'taxi') {
    x.fillStyle = '#4ac26a';
    x.beginPath();
    x.roundRect(w * 0.47, -h * 0.02, w * 0.1, h * 0.1, 2);
    x.fill();
    x.stroke();
  }
  // The wheels.
  for (const wx of [0.22, 0.78]) {
    elipse(x, w * wx, h * 0.76, h * 0.17, h * 0.17, '#2a2226');
    elipse(x, w * wx, h * 0.76, h * 0.07, h * 0.07, '#a9acb4');
    x.beginPath();
    x.arc(w * wx, h * 0.76, h * 0.17, 0, Math.PI * 2);
    x.stroke();
  }
  elipse(x, w * 0.97, h * 0.52, w * 0.025, w * 0.02, '#ffe6a0');
  return { img: c, w: w + 4, h: h + 4, base: h * 0.93 };
}

export const escenaM30: Constructor = (m) => {
  const { w, h, dp } = m;
  const hz = h * 0.56;
  const suelo = h * 0.905;
  const vel = 250;
  const liberables: Array<Tile | HTMLCanvasElement> = [];
  const guardar = <T extends Tile | HTMLCanvasElement>(t: T) => (liberables.push(t), t);

  // The sky at dawn: violet at the top, pink in the middle, a warm band at the horizon; a few stars still up there.
  const [cielo, sx] = lienzo(w, h, dp);
  sx.fillStyle = vertical(sx, 0, hz + 6, [0, '#3b3a7a'], [0.35, '#85569a'], [0.68, '#e8808a'], [1, '#ffc27a']);
  sx.fillRect(0, 0, w, h);
  const r0 = azar(5);
  for (let i = 0; i < 26; i++) {
    const a = r0() * 0.55;
    sx.fillStyle = `rgba(255,240,220,${0.55 * (1 - a / 0.55)})`;
    sx.fillRect(r0() * w, a * hz, 1.6, 1.6);
  }
  // The sun, half-risen behind the towers: a halo, rays of halftone and the disc with its ink.
  const solX = w * 0.72;
  const solR = h * 0.15;
  const [sol, sl] = lienzo(solR * 6, solR * 6, dp);
  const hg = sl.createRadialGradient(solR * 3, solR * 3, solR * 0.8, solR * 3, solR * 3, solR * 3);
  hg.addColorStop(0, 'rgba(255,214,140,0.75)');
  hg.addColorStop(0.5, 'rgba(255,170,110,0.28)');
  hg.addColorStop(1, 'rgba(255,170,110,0)');
  sl.fillStyle = hg;
  sl.fillRect(0, 0, solR * 6, solR * 6);
  sl.beginPath();
  sl.arc(solR * 3, solR * 3, solR, 0, Math.PI * 2);
  rellenar(sl, '#fff0b8', 2.4);
  sl.save();
  sl.clip();
  trama(sl, solR * 2, solR * 3, solR * 4, solR * 4, 'rgba(235,130,60,0.5)', (_a, b) => (b - solR * 3) / solR, 4.4, 1.6);
  sl.restore();
  // Soft clouds in the dawn, scrolling very slowly.
  const nubes = guardar(
    hornearTile(w * 1.4, hz, dp, (x) => {
      const r = azar(11);
      for (let k = 0; k < 4; k++) {
        const cx = (k + 0.3 + r() * 0.4) * (w * 1.4) / 4;
        envolver(w * 1.4, cx, h * 0.3, (px) => nube(x, px, h * (0.1 + r() * 0.2), h * (0.07 + r() * 0.05), '#ffd6c4', '#e6909c', 1.6));
      }
    }),
  );
  // The far skyline: the four towers, the gasometer, flats; light violet, with a thin ink line.
  const Tf = w * 1.6;
  const lejos = guardar(
    hornearTile(Tf, hz + 2, dp, (x) => {
      const r = azar(31);
      const base = hz;
      const col = '#9a6ca0';
      x.lineJoin = 'round';
      x.lineWidth = 1.2;
      x.strokeStyle = 'rgba(43,28,32,0.55)';
      let px = 0;
      while (px < Tf - 20) {
        const bw = 16 + r() * 34;
        const bh = h * (0.05 + r() * 0.1);
        const cw = Math.min(bw, Tf - px);
        x.fillStyle = mezcla(col, '#ffb48a', r() * 0.35);
        x.fillRect(px, base - bh, cw, bh);
        x.strokeRect(px, base - bh, cw, bh);
        x.fillStyle = 'rgba(255,230,190,0.5)';
        for (let wy = base - bh + 5; wy < base - 6; wy += 8) for (let wx = px + 4; wx < px + cw - 4; wx += 7) if (r() < 0.22) x.fillRect(wx, wy, 2.4, 3);
        px += bw + r() * 6;
      }
      // The four towers, each taller than the one before, close together.
      const tx = Tf * 0.34;
      [0.3, 0.36, 0.27, 0.4].forEach((alto, i) => {
        const bx = tx + i * 17;
        const bh = h * alto;
        x.fillStyle = mezcla('#a67cae', '#ffc08e', 0.22 + i * 0.05);
        x.fillRect(bx, base - bh, 14, bh);
        x.strokeRect(bx, base - bh, 14, bh);
        x.fillStyle = 'rgba(255,236,200,0.5)';
        x.fillRect(bx + 8, base - bh, 4, bh);
        for (let wy = base - bh + 6; wy < base - 4; wy += 5) {
          x.fillStyle = 'rgba(255,214,150,0.45)';
          x.fillRect(bx + 3, wy, 7, 1.4);
        }
        x.fillStyle = TINTA;
        x.fillRect(bx + 6, base - bh - 7, 1.4, 7);
      });
      // The gasometer: a fat drum with its ribs.
      const gx = Tf * 0.72;
      const gh = h * 0.13;
      x.fillStyle = '#b07a92';
      x.fillRect(gx, base - gh, 70, gh);
      x.strokeRect(gx, base - gh, 70, gh);
      x.strokeStyle = 'rgba(43,28,32,0.4)';
      for (let k = 1; k < 9; k++) {
        x.beginPath();
        x.moveTo(gx + k * 70 / 9, base - gh);
        x.lineTo(gx + k * 70 / 9, base);
        x.stroke();
      }
      x.beginPath();
      x.moveTo(gx - 6, base - gh);
      x.lineTo(gx + 76, base - gh);
      x.lineTo(gx + 70, base - gh - 6);
      x.lineTo(gx, base - gh - 6);
      x.closePath();
      x.fillStyle = '#8a5a82';
      x.fill();
      x.strokeStyle = 'rgba(43,28,32,0.55)';
      x.stroke();
      // A haze at the foot so it melts into the dawn.
      x.fillStyle = vertical(x, base - h * 0.14, base, [0, 'rgba(255,190,140,0)'], [1, 'rgba(255,190,140,0.55)']);
      x.fillRect(0, base - h * 0.14, Tf, h * 0.14);
    }),
  );
  // The blocks of flats of the barrio: brick, windows, balconies, washing lines, aerials.
  const Tm = w * 2.2;
  const bloques = guardar(
    hornearTile(Tm, h * 0.5, dp, (x) => {
      const r = azar(77);
      const base = h * 0.5 - 2;
      const anchos: number[] = [];
      let s = 0;
      while (s < Tm - 70) {
        const a = 58 + r() * 52;
        anchos.push(a);
        s += a + 4;
      }
      const k = (Tm - 4 * anchos.length) / anchos.reduce((q, v) => q + v, 0);
      const cols = ['#d9784f', '#e4a35e', '#c45c52', '#e8c27c', '#d08a74', '#b9694c'];
      let px = 0;
      x.lineJoin = 'round';
      anchos.forEach((a0, i) => {
        const bw = a0 * k;
        const bh = h * (0.1 + r() * 0.15);
        const col = cols[Math.floor(r() * cols.length)];
        const by = base - bh;
        x.beginPath();
        x.rect(px, by, bw, bh);
        rellenar(x, col, 2);
        // Shade on the left: the sun is on the right.
        x.save();
        x.clip();
        x.fillStyle = 'rgba(70,30,70,0.22)';
        x.fillRect(px, by, bw * 0.3, bh);
        trama(x, px, by, px + bw, base, 'rgba(70,30,60,0.42)', (_a, b) => (b - (by + bh * 0.45)) / (bh * 0.55), 4.6, 1.7);
        x.restore();
        // Parapet and aerials.
        x.fillStyle = mezcla(col, '#2b1c20', 0.25);
        x.fillRect(px - 2, by - 4, bw + 4, 5);
        x.strokeStyle = TINTA;
        x.lineWidth = 1.5;
        x.strokeRect(px - 2, by - 4, bw + 4, 5);
        if (r() < 0.7) {
          const ax = px + bw * (0.2 + r() * 0.6);
          x.beginPath();
          x.moveTo(ax, by - 4);
          x.lineTo(ax, by - 14);
          x.moveTo(ax - 5, by - 11);
          x.lineTo(ax + 5, by - 11);
          x.moveTo(ax - 3, by - 14);
          x.lineTo(ax + 3, by - 14);
          x.stroke();
        }
        // Windows with their blinds, some lit; balconies; the odd washing line.
        const cols2 = Math.max(2, Math.floor((bw - 10) / 17));
        const filas = Math.floor((bh - 14) / 19);
        for (let fy = 0; fy < filas; fy++) {
          for (let cx2 = 0; cx2 < cols2; cx2++) {
            const wx = px + 8 + cx2 * ((bw - 16) / cols2) + 1;
            const wy = by + 10 + fy * 19;
            const luz = r() < 0.28;
            x.fillStyle = luz ? '#ffd877' : '#524468';
            x.fillRect(wx, wy, 8, 11);
            x.strokeStyle = TINTA;
            x.lineWidth = 1.2;
            x.strokeRect(wx, wy, 8, 11);
            if (!luz) {
              x.fillStyle = 'rgba(255,200,170,0.4)';
              x.fillRect(wx + 1, wy + 1, 2.4, 9);
            }
            if (fy % 2 === 1 && r() < 0.6) {
              x.fillStyle = '#3d3238';
              x.fillRect(wx - 2, wy + 11, 12, 2.6);
              if (r() < 0.4) {
                x.fillStyle = ['#e8453a', '#4a86c8', '#f0d248'][Math.floor(r() * 3)];
                x.fillRect(wx + 1, wy + 11.8, 3, 5);
                x.fillRect(wx + 5, wy + 11.8, 3, 4);
              }
            }
          }
        }
        // The entrance at street level.
        x.fillStyle = '#4a3a4a';
        x.fillRect(px + bw * 0.4, base - 15, 9, 15);
        x.strokeRect(px + bw * 0.4, base - 15, 9, 15);
        px += bw + 4;
        void i;
      });
      // Street trees at the foot, round and green-gold.
      for (let t = 0; t < 14; t++) {
        const tx = r() * Tm;
        const tr = 8 + r() * 6;
        envolver(Tm, tx, tr * 2, (q) => {
          x.fillStyle = '#4a3a30';
          x.fillRect(q - 1.4, base - tr * 0.6, 2.8, tr * 0.8);
          x.beginPath();
          x.arc(q, base - tr * 1.4, tr, 0, Math.PI * 2);
          rellenar(x, mezcla('#6f9a4a', '#e8b650', r() * 0.6), 1.8);
        });
      }
    }),
  );
  // The carriageway: the far lane, the concrete barrier, the near lane, the wall in front.
  const [calzada, cz] = lienzo(w, h, dp);
  const barreraY = h * 0.71;
  cz.fillStyle = vertical(cz, h * 0.6, h, [0, '#6a5a66'], [1, '#463a44']);
  cz.fillRect(0, h * 0.6, w, h * 0.4);
  cz.fillStyle = '#7a6a76';
  cz.fillRect(0, h * 0.6, w, h * 0.11);
  trama(cz, 0, h * 0.6, w, h * 0.71, 'rgba(60,40,70,0.3)', (_a, b) => 1 - (b - h * 0.6) / (h * 0.11), 4.6, 1.3);
  // Concrete barrier.
  cz.beginPath();
  cz.moveTo(0, barreraY + h * 0.035);
  cz.lineTo(w, barreraY + h * 0.035);
  cz.lineTo(w, barreraY + h * 0.012);
  cz.lineTo(0, barreraY + h * 0.012);
  cz.closePath();
  rellenar(cz, '#d6c8c0', 2);
  cz.fillStyle = 'rgba(70,50,70,0.35)';
  cz.fillRect(0, barreraY + h * 0.03, w, h * 0.005);
  // The edge line and the near lane's shoulder.
  cz.fillStyle = '#e8dcc4';
  cz.fillRect(0, h * 0.77, w, 2);
  cz.fillStyle = '#e8dcc4';
  cz.fillRect(0, h * 0.945, w, 2.4);
  cz.fillStyle = 'rgba(255,190,130,0.18)';
  cz.fillRect(0, h * 0.775, w, h * 0.03);
  // Lane dashes and the fast streaks of the speed, as scrolling tiles.
  const rayas = guardar(
    hornearTile(w * 0.6, h * 0.1, dp, (x) => {
      x.fillStyle = '#efe4c8';
      x.beginPath();
      x.roundRect(0, h * 0.04, w * 0.22, 3.4, 1.6);
      x.fill();
      x.fillStyle = 'rgba(255,230,190,0.5)';
      x.fillRect(w * 0.35, h * 0.012, w * 0.18, 1.4);
      x.fillRect(w * 0.1, h * 0.075, w * 0.14, 1.2);
    }),
  );
  // The gantry with its blue sign (over the caravan), as a tile that goes by.
  const Tg = w * 2.3;
  const letras = texto('safari.cartel.zaragoza');
  const placa = texto('safari.cartel.a2');
  const portico = guardar(
    hornearTile(Tg, h * 0.6, dp, (x) => {
      const gx = Tg * 0.4;
      x.lineJoin = 'round';
      // The post and the beam, in galvanised grey.
      x.fillStyle = '#9aa0a8';
      x.fillRect(gx, h * 0.04, 9, h * 0.56);
      x.strokeStyle = TINTA;
      x.lineWidth = 1.8;
      x.strokeRect(gx, h * 0.04, 9, h * 0.56);
      x.fillStyle = '#b4bac0';
      x.fillRect(gx - 6, h * 0.04, w * 1.1, 8);
      x.strokeRect(gx - 6, h * 0.04, w * 1.1, 8);
      x.strokeStyle = 'rgba(43,28,32,0.5)';
      x.lineWidth = 1.2;
      for (let q = 0; q < w * 1.1; q += 12) {
        x.beginPath();
        x.moveTo(gx - 6 + q, h * 0.04 + 8);
        x.lineTo(gx + q + 3, h * 0.04 + 8);
        x.stroke();
      }
      // The sign: blue, white edge, the road number in a shield and the city with its arrow.
      const sw = Math.min(w * 0.6, 230);
      const sh = Math.min(h * 0.27, 62);
      const sx0 = gx + w * 0.28;
      const sy0 = h * 0.04 + 14;
      x.fillStyle = '#4a4a50';
      x.fillRect(sx0 + sw * 0.2, h * 0.04 + 8, 2.4, 6);
      x.fillRect(sx0 + sw * 0.8, h * 0.04 + 8, 2.4, 6);
      x.beginPath();
      x.roundRect(sx0, sy0, sw, sh, 5);
      rellenar(x, '#2860a8', 2.4);
      x.strokeStyle = '#f4ecd8';
      x.lineWidth = 2.2;
      x.beginPath();
      x.roundRect(sx0 + 4, sy0 + 4, sw - 8, sh - 8, 3);
      x.stroke();
      x.fillStyle = 'rgba(15,35,80,0.4)';
      trama(x, sx0, sy0 + sh * 0.5, sx0 + sw, sy0 + sh, 'rgba(10,30,70,0.5)', (_a, b) => (b - sy0 - sh * 0.5) / (sh * 0.5), 4.4, 1.3);
      x.fillStyle = '#f4ecd8';
      x.font = `800 ${Math.round(sh * 0.34)}px "Alegreya Sans", sans-serif`;
      x.textAlign = 'left';
      x.textBaseline = 'middle';
      x.fillText(placa, sx0 + 12, sy0 + sh * 0.5);
      x.font = `800 ${Math.round(sh * 0.38)}px "Alegreya Sans", sans-serif`;
      x.fillText(letras.toLocaleUpperCase('es'), sx0 + 12 + sh * 0.95, sy0 + sh * 0.5);
      x.fillStyle = '#f4ecd8';
      x.beginPath();
      x.moveTo(sx0 + sw - 14, sy0 + sh * 0.3);
      x.lineTo(sx0 + sw - 14, sy0 + sh * 0.72);
      x.lineTo(sx0 + sw - 20, sy0 + sh * 0.6);
      x.moveTo(sx0 + sw - 14, sy0 + sh * 0.72);
      x.lineTo(sx0 + sw - 8, sy0 + sh * 0.6);
      x.strokeStyle = '#f4ecd8';
      x.lineWidth = 2.6;
      x.stroke();
    }),
  );
  // The rail in front, a blur of posts.
  const valla = guardar(
    hornearTile(w * 0.8, h * 0.12, dp, (x) => {
      x.fillStyle = 'rgba(52,40,50,0.92)';
      x.fillRect(0, h * 0.045, w * 0.8, h * 0.035);
      x.fillStyle = 'rgba(210,200,190,0.4)';
      x.fillRect(0, h * 0.05, w * 0.8, 1.6);
      x.fillStyle = 'rgba(40,30,40,0.95)';
      for (let q = 0; q < 5; q++) x.fillRect(q * w * 0.16 + 6, h * 0.045, 8, h * 0.075);
    }),
  );
  const aves = [0, 1].map((k) => {
    const [c, x] = lienzo(18, 10, dp);
    x.strokeStyle = 'rgba(60,30,60,0.9)';
    x.lineWidth = 1.6;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(1, k ? 8 : 2);
    x.quadraticCurveTo(5, k ? 3 : 4, 9, 6);
    x.quadraticCurveTo(13, k ? 3 : 4, 17, k ? 8 : 2);
    x.stroke();
    return c;
  });
  guardar(cielo);
  guardar(sol);
  const vc = crearVehiculoComic(h * 0.355, dp);
  guardar(vc.img);
  const cx = w * 0.4;
  const cars = [
    { s: pintarCoche(h * 0.3, dp, '#e8e0d0', 'taxi'), x0: 0.15, v: 70, y: h * 0.795 },
    { s: pintarCoche(h * 0.27, dp, '#d8483a', 'coche'), x0: 0.62, v: 95, y: h * 0.795 },
    { s: pintarCoche(h * 0.36, dp, '#e4cf86', 'furgon'), x0: 0.95, v: 55, y: h * 0.793 },
  ];
  cars.forEach((c) => guardar(c.s.img));
  const Tc = w * 1.7;

  return {
    ventana: ventanaDe(vc, cx, suelo, w, h),
    pintar(x, t) {
      const zoom = 1 + Math.min(1, t / 9) * 0.06;
      const ax = cx - vc.vw / 2 + vc.ventana[0];
      const ay = suelo - vc.base - vc.tope + vc.ventana[1];
      x.save();
      x.translate(ax, ay);
      x.scale(zoom, zoom);
      x.translate(-ax, -ay);
      x.drawImage(cielo, 0, 0, w, h);
      // The sun comes up a little.
      const sy = hz + h * 0.03 - Math.min(t, 12) * h * 0.012;
      x.drawImage(sol, solX - solR * 3, sy - solR * 3, solR * 6, solR * 6);
      dibujarTile(x, nubes, t * 4, 0, w);
      // The birds.
      for (let b = 0; b < 5; b++) {
        const bx = ((b * 83 + t * 22) % (w + 60)) - 30;
        const by = h * (0.1 + (b % 3) * 0.06) + Math.sin(t * 1.4 + b) * 3;
        x.drawImage(aves[Math.floor(t * 5 + b) % 2], bx, by, 18, 10);
      }
      dibujarTile(x, lejos, t * 10, hz - lejos.h + 2, w);
      dibujarTile(x, bloques, t * 55, h * 0.68 - bloques.h + 2, w);
      x.drawImage(calzada, 0, 0, w, h);
      // Traffic in the far lane, drifting back.
      for (const c of cars) {
        const px = (((c.x0 * Tc - t * c.v) % Tc) + Tc) % Tc - c.s.w;
        if (px < w) x.drawImage(c.s.img, px, c.y - c.s.base, c.s.w, c.s.h);
      }
      dibujarTile(x, rayas, t * vel, h * 0.78, w);
      polvo(x, vc, cx, suelo, t, vel, { n: 8, largo: vc.vw * 0.9, alto: vc.vh * 0.2, alfa: 0.55 });
      dibujarVehiculoComic(x, vc, cx, suelo, t, { vel, bote: h * 0.006 });
      dibujarTile(x, portico, t * 300 + 0, h * 0.0, w, portico.h);
      dibujarTile(x, valla, t * 800, h * 0.88, w);
      x.restore();
    },
    liberar() {
      soltar(...liberables);
    },
  };
};
