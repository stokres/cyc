// Safari comic, shots 4 and 5: Africa at golden hour (giraffes, an elephant that trots along beside the caravan and the
// horn that makes it trumpet) and the close-up of the caravan's cracked window, with Guille's diploma taped inside.
import { texto } from '../juego/textos';
import { azar, TINTA, alfa, elipse, lienzo, mezcla, nube, onda, rellenar, trama, vertical, envolver, lerp, suave, acota, FUENTE } from './safari-dibujo';
import { crearVehiculoComic, dibujarTile, dibujarVehiculoComic, hornearTile, polvo, soltar, ventanaDe, type Constructor, type Tile } from './safari-base';
import { perfil, pintarSol } from './safari-paisaje';
import { pintarElefante, pintarJirafa } from './safari-fauna';

/** An acacia: a flat umbrella crown on a bent trunk, dark against the evening, with a warm rim light on its top. */
function pintarAcacia(h: number, dpr: number, verde = '#46602c') {
  const w = h * 1.5;
  const [c, x] = lienzo(w, h, dpr);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  x.strokeStyle = TINTA;
  x.lineWidth = h * 0.16;
  x.beginPath();
  x.moveTo(w * 0.5, h);
  x.bezierCurveTo(w * 0.48, h * 0.7, w * 0.58, h * 0.55, w * 0.5, h * 0.4);
  x.moveTo(w * 0.52, h * 0.62);
  x.quadraticCurveTo(w * 0.36, h * 0.5, w * 0.26, h * 0.42);
  x.moveTo(w * 0.52, h * 0.55);
  x.quadraticCurveTo(w * 0.66, h * 0.46, w * 0.76, h * 0.4);
  x.stroke();
  x.strokeStyle = '#5a3a28';
  x.lineWidth = h * 0.1;
  x.stroke();
  const copa = () => {
    x.beginPath();
    x.moveTo(w * 0.04, h * 0.42);
    x.bezierCurveTo(w * 0.02, h * 0.22, w * 0.3, h * 0.2, w * 0.5, h * 0.2);
    x.bezierCurveTo(w * 0.7, h * 0.2, w * 0.98, h * 0.22, w * 0.96, h * 0.42);
    x.bezierCurveTo(w * 0.8, h * 0.5, w * 0.7, h * 0.4, w * 0.5, h * 0.46);
    x.bezierCurveTo(w * 0.3, h * 0.4, w * 0.2, h * 0.5, w * 0.04, h * 0.42);
    x.closePath();
  };
  copa();
  rellenar(x, verde, Math.max(1.6, h * 0.035));
  x.save();
  copa();
  x.clip();
  trama(x, 0, h * 0.3, w, h * 0.5, 'rgba(10,25,10,0.5)', (_a, b) => (b - h * 0.3) / (h * 0.16), 3.6, 1.3);
  x.strokeStyle = 'rgba(255,200,110,0.8)';
  x.lineWidth = h * 0.04;
  x.beginPath();
  x.moveTo(w * 0.1, h * 0.28);
  x.bezierCurveTo(w * 0.3, h * 0.2, w * 0.7, h * 0.2, w * 0.92, h * 0.3);
  x.stroke();
  x.restore();
  return { img: c, w, h };
}

export const escenaSabana: Constructor = (m) => {
  const { w, h, dp } = m;
  const hz = h * 0.44;
  const suelo = h * 0.8;
  const vel = 230;
  const liberables: Array<Tile | HTMLCanvasElement> = [];
  const guardar = <T extends Tile | HTMLCanvasElement>(t: T) => (liberables.push(t), t);

  const [cielo, sx] = lienzo(w, h, dp);
  sx.fillStyle = vertical(sx, 0, hz + 4, [0, '#3f6fae'], [0.4, '#d98a8a'], [0.78, '#ffb060'], [1, '#ffd890']);
  sx.fillRect(0, 0, w, hz + 6);
  guardar(cielo);
  const solR = h * 0.075;
  const sol = pintarSol(solR, dp, '#fff0b8', '#ffd04a', 'rgba(255,200,110,0.5)');
  guardar(sol.img);
  const nubes = guardar(
    hornearTile(w * 1.3, hz, dp, (x) => {
      const r = azar(14);
      for (let k = 0; k < 4; k++) {
        const cx = ((k + 0.5) / 4) * w * 1.3;
        envolver(w * 1.3, cx, w * 0.2, (px) => {
          x.save();
          x.translate(px, h * (0.1 + r() * 0.2));
          x.scale(2, 0.55);
          nube(x, 0, 0, h * (0.06 + r() * 0.03), '#ffd0b8', '#e68a8a', 1.6);
          x.restore();
        });
      }
    }),
  );
  // A far blue mountain with a snowy top, and the haze at its foot.
  const Tl = w * 1.4;
  const monte = guardar(
    hornearTile(Tl, hz + 2, dp, (x) => {
      const f = onda(3, Tl, 3);
      perfil(x, Tl, hz, (px) => h * 0.1 + f(px) * h * 0.05, '#7d79b0', 1.4);
      // Kilimanjaro, left of centre.
      const kx = Tl * 0.3;
      x.beginPath();
      x.moveTo(kx - h * 0.4, hz);
      x.lineTo(kx - h * 0.1, hz - h * 0.2);
      x.lineTo(kx, hz - h * 0.23);
      x.lineTo(kx + h * 0.12, hz - h * 0.2);
      x.lineTo(kx + h * 0.42, hz);
      x.closePath();
      rellenar(x, '#8a80b8', 1.6);
      x.beginPath();
      x.moveTo(kx - h * 0.1, hz - h * 0.2);
      x.lineTo(kx, hz - h * 0.23);
      x.lineTo(kx + h * 0.12, hz - h * 0.2);
      x.lineTo(kx + h * 0.06, hz - h * 0.17);
      x.lineTo(kx, hz - h * 0.19);
      x.lineTo(kx - h * 0.05, hz - h * 0.165);
      x.closePath();
      rellenar(x, '#fff6ea', 1.2);
      x.fillStyle = vertical(x, hz - h * 0.08, hz, [0, 'rgba(255,190,130,0)'], [1, 'rgba(255,190,130,0.7)']);
      x.fillRect(0, hz - h * 0.08, Tl, h * 0.08);
    }),
  );
  // Rolling gold grassland with acacias on it.
  const acacias = [pintarAcacia(h * 0.2, dp), pintarAcacia(h * 0.15, dp, '#3e5a2c'), pintarAcacia(h * 0.12, dp, '#4a6430')];
  acacias.forEach((a) => guardar(a.img));
  const Tm = w * 1.8;
  const llano = guardar(
    hornearTile(Tm, h * 0.34, dp, (x) => {
      const f = onda(8, Tm, 4);
      const r = azar(2);
      const base = h * 0.18;
      perfil(x, Tm, base, (px) => h * 0.05 + f(px) * h * 0.025, '#c8a64a', 1.8, 4, h * 0.3);
      for (let k = 0; k < 7; k++) {
        const a = acacias[k % 3];
        const px = ((k + 0.3 + r() * 0.4) / 7) * Tm;
        envolver(Tm, px, a.w, (q) => x.drawImage(a.img, q - a.w / 2, base - h * 0.05 - f(q) * h * 0.025 - a.h + 4, a.w, a.h));
      }
      // Darker grass in front.
      perfil(x, Tm, base + h * 0.08, (px) => f(px * 1.7) * h * 0.012, mezcla('#b08a38', '#8a6a28', 0.4), 1.6, 4, h * 0.3);
      trama(x, 0, base, Tm, base + h * 0.2, 'rgba(110,70,20,0.4)', (_a, b) => (b - base) / (h * 0.2), 5, 1.5);
    }),
  );
  // The giraffes: three of them, in the middle distance.
  const jirafas = [
    { s: pintarJirafa(h * 0.52, dp), u: 0.2, f: 0, z: 1 },
    { s: pintarJirafa(h * 0.42, dp, '#e8b44c', '#a8602a'), u: 0.42, f: 1.7, z: 0.8 },
    { s: pintarJirafa(h * 0.47, dp, '#f4c660', '#b46a2a'), u: 0.86, f: 3.1, z: 0.9 },
  ];
  jirafas.forEach((j) => (guardar(j.s.cuerpo), guardar(j.s.cuello)));
  // The dirt road, and the tall grass whipping past in front.
  const [camino, cm] = lienzo(w, h, dp);
  cm.fillStyle = vertical(cm, h * 0.58, h, [0, '#c49a50'], [1, '#8a5a2a']);
  cm.fillRect(0, h * 0.6, w, h * 0.4);
  cm.fillStyle = '#d6a868';
  cm.fillRect(0, h * 0.67, w, h * 0.19);
  trama(cm, 0, h * 0.67, w, h * 0.86, 'rgba(120,70,30,0.4)', (_a, b) => (b - h * 0.67) / (h * 0.19), 4.6, 1.5);
  cm.strokeStyle = TINTA;
  cm.lineWidth = 1.6;
  cm.beginPath();
  cm.moveTo(0, h * 0.67);
  cm.lineTo(w, h * 0.67);
  cm.moveTo(0, h * 0.865);
  cm.lineTo(w, h * 0.865);
  cm.stroke();
  guardar(camino);
  const huellas = guardar(
    hornearTile(w * 0.6, h * 0.2, dp, (x) => {
      x.fillStyle = 'rgba(110,70,30,0.35)';
      for (const [px, py] of [[0.1, 0.4], [0.26, 0.6], [0.42, 0.35], [0.5, 0.7]]) elipse(x, w * 0.6 * px, h * 0.2 * py, w * 0.03, h * 0.012, 'rgba(110,70,30,0.35)');
    }),
  );
  const hierba = guardar(
    hornearTile(w * 0.9, h * 0.2, dp, (x) => {
      const r = azar(23);
      x.lineCap = 'round';
      for (let k = 0; k < 26; k++) {
        const px = r() * w * 0.9;
        const base = h * (0.17 + r() * 0.03);
        const alto = h * (0.06 + r() * 0.11);
        envolver(w * 0.9, px, 20, (q) => {
          for (const [col, lw] of [[TINTA, 3.4], [mezcla('#d4b254', '#9a7a30', r()), 2]] as Array<[string, number]>) {
            x.strokeStyle = col;
            x.lineWidth = lw;
            x.beginPath();
            for (let a = -2; a <= 2; a++) {
              x.moveTo(q + a * 1.6, base);
              x.quadraticCurveTo(q + a * 4, base - alto * 0.6, q + a * 7 + 3, base - alto * (0.8 + (a === 0 ? 0.2 : 0)));
            }
            x.stroke();
          }
        });
      }
    }),
  );
  const aves = [0, 1].map((k) => {
    const [c, x] = lienzo(16, 9, dp);
    x.strokeStyle = TINTA;
    x.lineWidth = 1.6;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(1, k ? 7 : 2);
    x.quadraticCurveTo(5, k ? 2 : 4, 8, 5);
    x.quadraticCurveTo(11, k ? 2 : 4, 15, k ? 7 : 2);
    x.stroke();
    return guardar(c);
  });
  const vc = crearVehiculoComic(h * 0.255, dp);
  guardar(vc.img);
  const cx = w * 0.4;
  const ele = pintarElefante(h * 0.42, dp);
  guardar(ele.cuerpo);
  guardar(ele.oreja);
  guardar(ele.trompa);
  const luz = guardar(
    (() => {
      const [c, x] = lienzo(w, h, 1);
      x.fillStyle = vertical(x, 0, h, [0, 'rgba(255,170,90,0.0)'], [1, 'rgba(255,150,60,0.16)']);
      x.fillRect(0, 0, w, h);
      return c;
    })(),
  );

  return {
    ventana: ventanaDe(vc, cx, suelo, w, h),
    pintar(x, t, ev) {
      const zoom = 1 + Math.min(1, t / 11) * 0.05;
      const ax = cx - vc.vw / 2 + vc.ventana[0];
      const ay = suelo - vc.base - vc.tope + vc.ventana[1];
      x.save();
      x.translate(ax, ay);
      x.scale(zoom, zoom);
      x.translate(-ax, -ay);
      x.drawImage(cielo, 0, 0, w, h);
      x.save();
      x.translate(w * 0.64, hz - h * 0.08);
      x.rotate(t * 0.12);
      x.drawImage(sol.img, -sol.s / 2, -sol.s / 2, sol.s, sol.s);
      x.restore();
      dibujarTile(x, nubes, t * 5, 0, w);
      for (let b = 0; b < 6; b++) {
        const bx = ((b * 71 + t * 26) % (w + 60)) - 30;
        const by = h * (0.12 + (b % 3) * 0.05) + Math.sin(t * 1.6 + b * 2) * 3;
        x.drawImage(aves[Math.floor(t * 6 + b) % 2], bx, by, 16, 9);
      }
      dibujarTile(x, monte, t * 4, hz - monte.h + 2, w);
      dibujarTile(x, llano, t * 24, hz - h * 0.18 + h * 0.015, w);
      // The giraffes (a bitmap each; the neck sways on its shoulder and they bob as they walk).
      for (const j of jirafas) {
        const T = Tm;
        const px = (((j.u * T - t * 24 - j.s.w / 2) % T) + T) % T - 10;
        if (px > w || px < -j.s.w) continue;
        const gy = hz + h * (0.19 + 0.08 * j.z) - j.s.h + Math.sin(t * 2.2 + j.f) * 1.2;
        x.save();
        x.translate(px + j.s.pivote[0], gy + j.s.pivote[1]);
        x.rotate(Math.sin(t * 0.9 + j.f) * 0.07 + Math.sin(t * 2.2 + j.f) * 0.02);
        x.drawImage(j.s.cuello, -j.s.pivote[0], -j.s.pivote[1], j.s.w, j.s.h);
        x.restore();
        x.drawImage(j.s.cuerpo, px, gy, j.s.w, j.s.h);
      }
      x.drawImage(camino, 0, 0, w, h);
      dibujarTile(x, huellas, t * vel, h * 0.74, w);
      polvo(x, vc, cx, suelo, t, vel, { n: 11, largo: vc.vw * 1.05, alto: vc.vh * 0.32, alfa: 0.75 });
      dibujarVehiculoComic(x, vc, cx, suelo, t, { vel, bote: h * 0.005 });
      // The elephant trots in from the right and keeps pace on the near side; at the horn it rears its trunk and trumpets.
      const entra = suave((t - 2.4) / 2.4);
      if (t > 2.3) {
        const ex = lerp(w * 1.25, w * 0.74, entra);
        const trompeta = ev.trompa !== undefined ? suave(ev.trompa / 0.3) * (1 - suave((ev.trompa - 1.6) / 0.5)) : 0;
        const asusto = ev.bocina !== undefined ? suave(ev.bocina / 0.12) * (1 - suave((ev.bocina - 0.5) / 0.4)) : 0;
        const bote = Math.abs(Math.sin(t * 7.2)) * h * 0.012 * (entra < 1 ? 1 : 0.5) + asusto * h * 0.02;
        const ey = h * 0.99 - bote;
        x.save();
        x.translate(ex, ey);
        x.rotate(-0.03 + Math.sin(t * 7.2) * 0.012 - trompeta * 0.07);
        const ox = -ele.w * 0.5;
        const oy = -ele.h;
        x.drawImage(ele.cuerpo, ox, oy, ele.w, ele.h);
        // Ear: flaps; wide open when trumpeting.
        x.save();
        x.translate(ox + ele.pivoteOreja[0], oy + ele.pivoteOreja[1]);
        x.rotate(Math.sin(t * 6.4) * 0.12 + 0.1 + trompeta * 0.5 + asusto * 0.5);
        x.drawImage(ele.oreja, -ele.pivoteOreja[0], -ele.pivoteOreja[1], ele.w, ele.h);
        x.restore();
        // Trunk: swings; up when trumpeting.
        x.save();
        x.translate(ox + ele.pivoteTrompa[0], oy + ele.pivoteTrompa[1]);
        x.rotate(Math.sin(t * 3.6) * 0.12 - trompeta * 1.25 + Math.sin(t * 28) * 0.03 * trompeta);
        x.drawImage(ele.trompa, -ele.pivoteTrompa[0], -ele.pivoteTrompa[1], ele.w, ele.h);
        x.restore();
        x.restore();
      }
      dibujarTile(x, hierba, t * 420, h * 0.86, w);
      x.drawImage(luz, 0, 0, w, h);
      x.restore();
      void acota;
    },
    liberar() {
      soltar(...liberables);
    },
  };
};

/**
 * The caravan's cracked window, up close, with the diploma taped inside it. The glass shows sliding reflections, the
 * whole caravan shudders over the potholes and the diploma flaps a little behind it.
 */
export const escenaDiploma: Constructor = (m) => {
  const { w, h, dp } = m;
  const liberables: Array<Tile | HTMLCanvasElement> = [];
  const guardar = <T extends Tile | HTMLCanvasElement>(t: T) => (liberables.push(t), t);
  const lw = Math.max(2, h * 0.007);
  // The caravan's wall.
  const [pared, p] = lienzo(w, h, dp);
  p.fillStyle = '#e9dcc0';
  p.fillRect(0, 0, w, h);
  p.fillStyle = '#d4c4a4';
  p.fillRect(0, 0, w, h * 0.05);
  p.fillStyle = '#9a5a3c';
  p.fillRect(0, h * 0.8, w, h * 0.07);
  p.fillStyle = '#c9b896';
  p.fillRect(0, h * 0.94, w, h * 0.06);
  p.strokeStyle = TINTA;
  p.lineWidth = lw;
  p.beginPath();
  p.moveTo(0, h * 0.8);
  p.lineTo(w, h * 0.8);
  p.moveTo(0, h * 0.87);
  p.lineTo(w, h * 0.87);
  p.stroke();
  trama(p, 0, h * 0.62, w, h, 'rgba(120,80,50,0.35)', (_a, b) => (b - h * 0.62) / (h * 0.38), 4.6, 1.5);
  // Rivets and a dent.
  for (const [px, py] of [[0.06, 0.84], [0.94, 0.84], [0.06, 0.1], [0.94, 0.1]]) elipse(p, w * px, h * py, 2.6, 2.6, '#b4a484');
  p.fillStyle = '#e0a24a';
  p.fillRect(w * 0.04, h * 0.82, w * 0.05, h * 0.03);
  guardar(pared);
  // The window: a thick frame, dark glass with a crack.
  const vx = w * 0.09;
  const vy = h * 0.17;
  const vw = w * 0.82;
  const vh = h * 0.55;
  const [vidrio, v] = lienzo(vw, vh, dp);
  v.fillStyle = vertical(v, 0, vh, [0, '#4a5e84'], [1, '#2a3752']);
  v.fillRect(0, 0, vw, vh);
  guardar(vidrio);
  // The diploma: parchment, a title in the display face, a name, a footer, a red seal with ribbons.
  const dw = vw * 0.74;
  const dh = vh * 0.84;
  const [dip, d] = lienzo(dw + 8, dh + 8, dp);
  d.translate(4, 4);
  d.fillStyle = '#fbf0d2';
  d.beginPath();
  d.rect(0, 0, dw, dh);
  d.fill();
  trama(d, 0, 0, dw, dh, 'rgba(170,120,60,0.45)', (px, py) => Math.max(px / dw - 0.55, py / dh - 0.6, 0.6 - px / dw - 0.1) * 1.4, 4, 1.3);
  d.lineWidth = lw * 1.1;
  d.strokeStyle = TINTA;
  d.strokeRect(0, 0, dw, dh);
  d.strokeStyle = '#b08848';
  d.lineWidth = lw * 0.9;
  d.strokeRect(dw * 0.04, dh * 0.05, dw * 0.92, dh * 0.9);
  d.lineWidth = 1;
  d.strokeRect(dw * 0.06, dh * 0.075, dw * 0.88, dh * 0.85);
  d.textAlign = 'center';
  d.textBaseline = 'middle';
  d.fillStyle = '#8a5a22';
  d.font = `400 ${Math.round(dh * 0.1)}px Graduate, Georgia, serif`;
  d.fillText(texto('safari.diploma.arriba').toLocaleUpperCase('es'), dw / 2, dh * 0.17);
  d.fillStyle = TINTA;
  d.font = `800 ${Math.round(dh * 0.14)}px ${FUENTE}`;
  const titulo = texto('safari.diploma.titulo').toLocaleUpperCase('es');
  d.fillText(titulo, dw / 2, dh * 0.37, dw * 0.84);
  d.strokeStyle = '#b08848';
  d.lineWidth = 1.2;
  d.beginPath();
  d.moveTo(dw * 0.2, dh * 0.5);
  d.lineTo(dw * 0.8, dh * 0.5);
  d.stroke();
  d.fillStyle = '#5a3a1a';
  d.font = `italic 700 ${Math.round(dh * 0.17)}px ${FUENTE}`;
  d.fillText(texto('safari.diploma.nombre'), dw / 2, dh * 0.64, dw * 0.8);
  d.fillStyle = '#7a5a2a';
  d.font = `700 ${Math.round(dh * 0.075)}px ${FUENTE}`;
  d.fillText(texto('safari.diploma.pie').toLocaleUpperCase('es'), dw * 0.4, dh * 0.84, dw * 0.56);
  // The seal.
  d.fillStyle = '#c8402e';
  d.beginPath();
  d.moveTo(dw * 0.78, dh * 0.74);
  d.lineTo(dw * 0.74, dh * 0.97);
  d.lineTo(dw * 0.8, dh * 0.92);
  d.lineTo(dw * 0.84, dh * 0.99);
  d.lineTo(dw * 0.86, dh * 0.74);
  d.closePath();
  rellenar(d, '#c8402e', lw * 0.8);
  d.beginPath();
  d.arc(dw * 0.82, dh * 0.74, dh * 0.09, 0, Math.PI * 2);
  rellenar(d, '#d44a34', lw);
  d.beginPath();
  d.arc(dw * 0.82, dh * 0.74, dh * 0.055, 0, Math.PI * 2);
  d.strokeStyle = 'rgba(255,230,190,0.8)';
  d.lineWidth = 1.4;
  d.stroke();
  guardar(dip);
  // Black electrical tape on the corners.
  const cinta = (px: number, py: number, giro: number) => {
    const L = vw * 0.17;
    const [c, x] = lienzo(L, L * 0.38, dp);
    x.fillStyle = '#26202a';
    x.beginPath();
    x.moveTo(0, 2);
    x.lineTo(L * 0.96, 0);
    x.lineTo(L, L * 0.2);
    x.lineTo(L * 0.94, L * 0.38);
    x.lineTo(2, L * 0.36);
    x.lineTo(L * 0.05, L * 0.2);
    x.closePath();
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.18)';
    x.fillRect(L * 0.1, L * 0.06, L * 0.8, L * 0.05);
    return { c: guardar(c), L, px, py, giro };
  };
  const cintas = [cinta(0.1, 0.1, -0.5), cinta(0.9, 0.1, 0.5), cinta(0.1, 0.9, 0.5), cinta(0.9, 0.9, -0.5)];
  // A shine across the glass, sliding: two light bands.
  const brillo = guardar(
    hornearTile(vw * 1.4, vh, dp, (x) => {
      x.save();
      x.rotate(0.0);
      for (const [px, ancho, a] of [[0.1, 0.16, 0.2], [0.3, 0.04, 0.3], [0.62, 0.22, 0.14], [0.85, 0.05, 0.22]]) {
        x.fillStyle = `rgba(255,236,200,${a})`;
        x.beginPath();
        x.moveTo(vw * 1.4 * px, 0);
        x.lineTo(vw * 1.4 * (px + ancho), 0);
        x.lineTo(vw * 1.4 * (px + ancho) - vh * 0.5, vh);
        x.lineTo(vw * 1.4 * px - vh * 0.5, vh);
        x.closePath();
        x.fill();
      }
      x.restore();
    }),
  );
  // The crack, drawn over everything.
  const [grieta, g] = lienzo(vw, vh, dp);
  g.strokeStyle = 'rgba(214,226,248,0.9)';
  g.lineWidth = 1.6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(vw * 0.08, vh * 0.1);
  g.lineTo(vw * 0.26, vh * 0.34);
  g.lineTo(vw * 0.2, vh * 0.52);
  g.lineTo(vw * 0.3, vh * 0.8);
  g.moveTo(vw * 0.26, vh * 0.34);
  g.lineTo(vw * 0.44, vh * 0.28);
  g.moveTo(vw * 0.2, vh * 0.52);
  g.lineTo(vw * 0.06, vh * 0.6);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = 0.7;
  g.stroke();
  guardar(grieta);
  const sombraV = guardar(
    (() => {
      const [c, x] = lienzo(vw, vh, 1);
      x.fillStyle = vertical(x, 0, vh, [0, 'rgba(20,30,60,0.0)'], [1, 'rgba(20,30,60,0.35)']);
      x.fillRect(0, 0, vw, vh);
      return c;
    })(),
  );

  return {
    ventana: [0.5, 0.2],
    pintar(x, t) {
      const sac = Math.sin(t * 9.1) * 0.7 + Math.max(0, Math.sin(t * 2.3)) * Math.sin(t * 33) * 1.2;
      x.save();
      x.translate(w / 2, h * 0.5);
      x.scale(1.04, 1.04);
      x.translate(-w / 2, -h * 0.5 + sac * 0.4);
      x.drawImage(pared, 0, 0, w, h);
      // The window frame.
      x.fillStyle = '#c9b896';
      x.beginPath();
      x.roundRect(vx - h * 0.025, vy - h * 0.025, vw + h * 0.05, vh + h * 0.05, h * 0.04);
      x.fill();
      x.strokeStyle = TINTA;
      x.lineWidth = lw * 1.3;
      x.stroke();
      x.save();
      x.translate(vx, vy);
      x.beginPath();
      x.roundRect(0, 0, vw, vh, h * 0.025);
      x.clip();
      x.drawImage(vidrio, 0, 0, vw, vh);
      // The diploma flaps on its tape: it shudders with the potholes.
      x.save();
      x.translate(vw / 2, vh / 2);
      x.rotate(Math.sin(t * 3.1) * 0.012 + sac * 0.006);
      x.drawImage(dip, -dw / 2 - 4, -dh / 2 - 4 + sac * 0.8, dw + 8, dh + 8);
      for (const c of cintas) {
        x.save();
        x.translate((c.px - 0.5) * dw * 1.06, (c.py - 0.5) * dh * 1.04 + sac * 0.8);
        x.rotate(c.giro);
        x.drawImage(c.c, -c.L / 2, -c.L * 0.19, c.L, c.L * 0.38);
        x.restore();
      }
      x.restore();
      dibujarTile(x, brillo, t * 70, 0, vw);
      x.drawImage(sombraV, 0, 0, vw, vh);
      x.drawImage(grieta, 0, 0, vw, vh);
      x.restore();
      // Glint on the frame.
      x.strokeStyle = 'rgba(255,255,255,0.4)';
      x.lineWidth = 1.6;
      x.beginPath();
      x.roundRect(vx - h * 0.02, vy - h * 0.02, vw + h * 0.04, vh + h * 0.04, h * 0.035);
      x.stroke();
      x.restore();
      void alfa;
      void vertical;
    },
    liberar() {
      soltar(...liberables);
    },
  };
};
