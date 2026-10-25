// Safari comic, shots 8 and 9: the red rocks of the West (a cactus loses an arm to the caravan's roof rack) and the
// desert of Nevada at dusk, with Las Vegas on the horizon, a neon sign and the caravan braking to a stop. Painted once;
// a frame draws images.
import { texto } from '../juego/textos';
import { azar, TINTA, lienzo, nube, onda, rellenar, trama, vertical, envolver, acota, lerp, suave, FUENTE, estrella } from './safari-dibujo';
import { crearVehiculoComic, dibujarTile, dibujarVehiculoComic, hornearTile, polvo, soltar, ventanaDe, type Constructor, type Tile } from './safari-base';
import { mesa, perfil, pintarCactus, pintarSol } from './safari-paisaje';

/** Moment (seconds into the shot) at which the roof rack clips the cactus' arm; the onomatopoeia comes with it (src/ui/safari.ts). */
const T_CRAC = 5.5;

export const escenaCanon: Constructor = (m) => {
  const { w, h, dp } = m;
  const hz = h * 0.5;
  const suelo = h * 0.93;
  const vel = 210;
  const liberables: Array<Tile | HTMLCanvasElement> = [];
  const guardar = <T extends Tile | HTMLCanvasElement>(t: T) => (liberables.push(t), t);

  // A deep blue afternoon sky, pale gold at the horizon.
  const [cielo, sx] = lienzo(w, hz + 4, dp);
  sx.fillStyle = vertical(sx, 0, hz, [0, '#3f86d0'], [0.6, '#9ccfee'], [1, '#fde2ac']);
  sx.fillRect(0, 0, w, hz + 4);
  guardar(cielo);
  const sol = guardar(pintarSol(h * 0.05, dp, '#fff4c8', '#ffc23a').img);
  const solS = h * 0.05 * 4.4;
  const nubes = guardar(
    hornearTile(w * 1.3, hz, dp, (x) => {
      const r = azar(12);
      for (let k = 0; k < 3; k++) {
        envolver(w * 1.3, ((k + 0.5) / 3) * w * 1.3, w * 0.2, (px) => {
          x.save();
          x.translate(px, h * (0.08 + r() * 0.2));
          x.scale(2.2, 0.55);
          nube(x, 0, 0, h * (0.06 + r() * 0.03), '#fffaf0', '#e8e4ea', 1.6);
          x.restore();
        });
      }
    }),
  );
  // The far buttes, pale in the haze; the near ones, tall, red and dark on their shaded side.
  const Tl = w * 1.7;
  const lejos = guardar(
    hornearTile(Tl, hz + 2, dp, (x) => {
      mesa(x, Tl * 0.05, hz + 2, w * 0.34, h * 0.15, '#eab496', '#cf8c78', 3, 1.4);
      mesa(x, Tl * 0.4, hz + 2, w * 0.26, h * 0.2, '#e8aa8c', '#c8826c', 4, 1.4);
      mesa(x, Tl * 0.72, hz + 2, w * 0.3, h * 0.13, '#eab496', '#cf8c78', 5, 1.4);
      x.fillStyle = vertical(x, hz - h * 0.22, hz + 2, [0, 'rgba(253,226,172,0)'], [1, 'rgba(253,226,172,0.55)']);
      x.fillRect(0, hz - h * 0.22, Tl, h * 0.22 + 2);
    }),
  );
  const Tm = w * 1.5;
  const medias = guardar(
    hornearTile(Tm, hz + 2, dp, (x) => {
      mesa(x, Tm * 0.06, hz + 2, w * 0.3, h * 0.3, '#d2704a', '#9a4430', 6, 2);
      mesa(x, Tm * 0.52, hz + 2, w * 0.2, h * 0.4, '#cf6a44', '#8e3c2c', 8, 2);
      mesa(x, Tm * 0.78, hz + 2, w * 0.24, h * 0.24, '#d8794e', '#a24a34', 9, 2);
    }),
  );
  // The sand and the road, static.
  const [campo, cm] = lienzo(w, h, dp);
  cm.fillStyle = vertical(cm, hz, h, [0, '#f0c088'], [0.6, '#d8844e'], [1, '#b8532e']);
  cm.fillRect(0, hz, w, h - hz);
  trama(cm, 0, hz, w, h * 0.82, 'rgba(150,60,40,0.3)', (_a, b) => (b - hz) / (h * 0.32) - 0.1, 5, 1.6);
  cm.fillStyle = '#6e5e68';
  cm.fillRect(0, h * 0.835, w, h * 0.15);
  cm.fillStyle = '#b8a898';
  cm.fillRect(0, h * 0.82, w, h * 0.018);
  cm.fillRect(0, h * 0.985, w, h * 0.02);
  trama(cm, 0, h * 0.835, w, h * 0.985, 'rgba(50,30,50,0.4)', (_a, b) => 1 - (b - h * 0.835) / (h * 0.15) * 1.1, 4.4, 1.3);
  cm.strokeStyle = TINTA;
  cm.lineWidth = 1.6;
  cm.beginPath();
  cm.moveTo(0, h * 0.82);
  cm.lineTo(w, h * 0.82);
  cm.moveTo(0, h * 0.985);
  cm.lineTo(w, h * 0.985);
  cm.stroke();
  guardar(campo);
  // Boulders and sagebrush between the buttes and the road.
  const rocas = guardar(
    hornearTile(w * 1.2, h * 0.3, dp, (x) => {
      const r = azar(33);
      for (let k = 0; k < 9; k++) {
        const px = r() * w * 1.2;
        const py = h * (0.07 + r() * 0.2);
        const rr = h * (0.015 + r() * 0.025);
        envolver(w * 1.2, px, rr * 2, (q) => {
          x.beginPath();
          x.ellipse(q, py, rr * 1.5, rr, 0, Math.PI, 0);
          x.closePath();
          rellenar(x, '#b4553a', 1.6);
          x.fillStyle = 'rgba(80,20,20,0.3)';
          x.beginPath();
          x.ellipse(q + rr * 0.4, py, rr * 1.1, rr * 0.8, 0, Math.PI * 1.1, Math.PI * 1.95);
          x.fill();
        });
      }
      for (let k = 0; k < 14; k++) {
        const px = r() * w * 1.2;
        const py = h * (0.1 + r() * 0.2);
        const rr = h * (0.01 + r() * 0.015);
        envolver(w * 1.2, px, rr * 3, (q) => {
          for (const [dx, dy] of [[-0.9, 0.1], [0, -0.4], [0.9, 0.05]] as Array<[number, number]>) {
            x.beginPath();
            x.ellipse(q + dx * rr, py + dy * rr, rr, rr * 0.8, 0, 0, Math.PI * 2);
            rellenar(x, r() > 0.5 ? '#7a7a44' : '#5e6a38', 1.2);
          }
        });
      }
    }),
  );
  const rayas = guardar(
    hornearTile(w * 0.55, h * 0.06, dp, (x) => {
      x.fillStyle = '#f2e6c4';
      x.beginPath();
      x.roundRect(0, h * 0.02, w * 0.2, 3.2, 1.6);
      x.fill();
    }),
  );

  const vc = crearVehiculoComic(h * 0.2, dp);
  guardar(vc.img);
  const cx = w * 0.5;
  const x0 = cx - vc.vw / 2;
  // The cactus, and its right arm as a bitmap of its own to be knocked off.
  const ch = h * 0.35;
  const cac = pintarCactus(ch, dp);
  guardar(cac.sin);
  guardar(cac.con);
  guardar(cac.brazo);
  const cacBase = h * 0.84;
  const spC = vel * 0.9;
  const xcT = x0 + vc.vh * 1.46 - ch * 0.27;
  const xc = (t: number) => xcT + (T_CRAC - t) * spC;
  const brazoX = cac.w / 2 - 2;
  const brazoY = ch * 0.285 + 2;
  const sueloArma = h * 0.8;
  // Where the arm starts, and its flight: up and forward, spinning, to land on the sand and be left behind.
  const a0x = xcT + brazoX + cac.aw / 2 - cac.w / 2;
  const a0y = cacBase - ch + brazoY + cac.ah / 2;
  const vy0 = -h * 0.95;
  const gr = h * 3.2;
  const tl = (-vy0 + Math.sqrt(vy0 * vy0 + 2 * gr * (sueloArma - a0y))) / gr;
  const giro = 9;
  const puffW = vc.puff.w;
  const trozos = [
    { vx: 70, vy: -h * 0.6, c: '#5f9a4a' },
    { vx: 130, vy: -h * 0.45, c: '#4a8038' },
    { vx: -30, vy: -h * 0.7, c: '#5f9a4a' },
    { vx: 190, vy: -h * 0.3, c: '#7ab45a' },
  ];

  return {
    ventana: ventanaDe(vc, cx, suelo, w, h),
    pintar(x, t) {
      const zoom = 1 + Math.min(1, t / 9) * 0.05;
      const ax = cx - vc.vw / 2 + vc.ventana[0];
      const ay = suelo - vc.base - vc.tope + vc.ventana[1];
      const tb = t - T_CRAC;
      x.save();
      x.translate(ax, ay);
      x.scale(zoom, zoom);
      x.translate(-ax, -ay);
      x.drawImage(cielo, 0, 0, w, hz + 4);
      x.save();
      x.translate(w * 0.8, h * 0.14);
      x.rotate(t * 0.15);
      x.drawImage(sol, -solS / 2, -solS / 2, solS, solS);
      x.restore();
      dibujarTile(x, nubes, t * 6, 0, w);
      dibujarTile(x, lejos, t * 7, hz - lejos.h + 2, w);
      dibujarTile(x, medias, t * 22, hz - medias.h + 2, w);
      x.drawImage(campo, 0, 0, w, h);
      dibujarTile(x, rocas, t * vel * 0.55, hz + h * 0.04, w);
      dibujarTile(x, rayas, t * vel, h * 0.885, w);
      // The cactus, behind the caravan: with its arm until the knock, without it afterwards.
      const cxp = xc(t);
      if (cxp > -cac.w && cxp < w + cac.w) {
        x.drawImage(tb < 0 ? cac.con : cac.sin, cxp - cac.w / 2, cacBase - ch, cac.w, ch);
      }
      // The arm, lying on the sand once it has landed (behind the caravan's wheels).
      const aterrizado = tb >= tl;
      const brazoPos = () => {
        if (!aterrizado) return { px: a0x + 60 * tb, py: a0y + vy0 * tb + 0.5 * gr * tb * tb, r: giro * tb };
        const u = tb - tl;
        const rebote = Math.abs(Math.sin(u * 13)) * Math.exp(-u * 6) * h * 0.04;
        return { px: a0x + 60 * tl - spC * u, py: sueloArma - rebote, r: giro * tl + Math.min(u * 4, 0.4) * 0 };
      };
      const dibujaBrazo = () => {
        const { px, py, r } = brazoPos();
        if (px < -cac.aw * 2) return;
        x.save();
        x.translate(px, py);
        x.rotate(r);
        x.drawImage(cac.brazo, -cac.aw / 2, -cac.ah / 2, cac.aw, cac.ah);
        x.restore();
      };
      if (tb > 0 && aterrizado) dibujaBrazo();
      polvo(x, vc, cx, suelo, t, vel, { n: 10, largo: vc.vw * 1.1, alto: vc.vh * 0.1, alfa: 0.6 });
      // The knock makes the caravan hop.
      const salto = tb > 0 ? Math.abs(Math.sin(tb * 17)) * Math.exp(-tb * 5) * h * 0.012 : 0;
      dibujarVehiculoComic(x, vc, cx, suelo, t, { vel, bote: h * 0.005, dy: -salto });
      if (tb > 0 && !aterrizado) dibujaBrazo();
      // A puff of dust and a few green chunks where it broke.
      if (tb > 0 && tb < 0.9) {
        const u = tb / 0.9;
        const s = (0.5 + u * 1.3) * 0.8;
        x.globalAlpha = (1 - u) * 0.9;
        x.drawImage(vc.puff.img, a0x + 20 - puffW * s * 0.5 - spC * tb * 0.3, a0y + 14 - vc.puff.h * s * 0.5, puffW * s, vc.puff.h * s);
        x.globalAlpha = 1;
        for (const z of trozos) {
          const px = a0x + 10 + z.vx * tb - spC * tb * 0.4;
          const py = a0y + z.vy * tb + 0.5 * gr * tb * tb;
          x.save();
          x.translate(px, py);
          x.rotate(tb * 12 + z.vx);
          x.fillStyle = z.c;
          x.strokeStyle = TINTA;
          x.lineWidth = 1.2;
          x.fillRect(-3, -2, 6, 4);
          x.strokeRect(-3, -2, 6, 4);
          x.restore();
        }
      }
      x.restore();
    },
    liberar() {
      soltar(...liberables);
    },
  };
};

// ---------------------------------------------------------------- Las Vegas at dusk

/** A baked neon sign on two posts, with its bulbs lit in one of two alternating phases. */
function hornearCartel(w: number, h: number, dp: number, fase: number, linea1: string, linea2: string) {
  const [c, x] = lienzo(w, h, dp);
  const sh = h * 0.62;
  x.lineJoin = 'round';
  x.lineCap = 'round';
  // Posts.
  for (const px of [w * 0.22, w * 0.78]) {
    x.fillStyle = '#4a3040';
    x.fillRect(px - 3, sh - 2, 6, h - sh + 2);
    x.strokeStyle = TINTA;
    x.lineWidth = 1.6;
    x.strokeRect(px - 3, sh - 2, 6, h - sh + 2);
  }
  // The board, with a cream rim.
  x.beginPath();
  x.roundRect(3, 3, w - 6, sh - 3, sh * 0.16);
  rellenar(x, '#3a1236', 2.6);
  x.beginPath();
  x.roundRect(9, 9, w - 18, sh - 15, sh * 0.12);
  x.strokeStyle = '#ff5aa8';
  x.lineWidth = 2;
  x.shadowColor = '#ff2a8a';
  x.shadowBlur = 8;
  x.stroke();
  x.shadowBlur = 0;
  // Bulbs round the rim.
  const bombillas: Array<[number, number]> = [];
  const nA = Math.floor((w - 24) / 14);
  for (let k = 0; k < nA; k++) {
    const px = 12 + ((w - 24) * (k + 0.5)) / nA;
    bombillas.push([px, 6], [px, sh - 4]);
  }
  const nB = Math.floor((sh - 14) / 14);
  for (let k = 0; k < nB; k++) {
    const py = 10 + ((sh - 20) * (k + 0.5)) / nB;
    bombillas.push([6, py], [w - 6, py]);
  }
  bombillas.forEach(([qx, qy], j) => {
    const on = j % 2 === fase;
    if (on) {
      const g = x.createRadialGradient(qx, qy, 0, qx, qy, 8);
      g.addColorStop(0, 'rgba(255,240,170,0.9)');
      g.addColorStop(1, 'rgba(255,170,70,0)');
      x.fillStyle = g;
      x.fillRect(qx - 8, qy - 8, 16, 16);
    }
    x.beginPath();
    x.arc(qx, qy, 2.4, 0, Math.PI * 2);
    x.fillStyle = on ? '#fff3c0' : '#8a6a40';
    x.fill();
    x.lineWidth = 0.9;
    x.strokeStyle = TINTA;
    x.stroke();
  });
  // The words, in neon.
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.shadowColor = '#4af0ff';
  x.shadowBlur = 8;
  x.fillStyle = '#c8fbff';
  x.font = `800 ${Math.round(sh * 0.22)}px ${FUENTE}`;
  x.fillText(linea1, w / 2, sh * 0.27, w * 0.7);
  x.shadowColor = '#ff3a9a';
  x.shadowBlur = 10;
  x.fillStyle = '#ffd0ea';
  x.font = `800 ${Math.round(sh * 0.34)}px ${FUENTE}`;
  x.fillText(linea2, w / 2, sh * 0.62, w * 0.84);
  x.shadowBlur = 0;
  // A little star at each side.
  for (const px of [w * 0.1, w * 0.9]) {
    estrella(x, px, sh * 0.5, sh * 0.1, sh * 0.04, 4, Math.PI / 4);
    rellenar(x, '#ffe27a', 1.2);
  }
  return c;
}

export const escenaVegas: Constructor = (m) => {
  const { w, h, dp } = m;
  const hz = h * 0.54;
  const suelo = h * 0.93;
  const liberables: Array<Tile | HTMLCanvasElement> = [];
  const guardar = <T extends Tile | HTMLCanvasElement>(t: T) => (liberables.push(t), t);
  // The caravan runs, brakes at T0 and is still by T0+DUR; everything else moves by the distance it has covered.
  const V0 = 300;
  const T0 = 1.0;
  const DUR = 1.9;
  const dist = (t: number) => (t < T0 ? V0 * t : V0 * (T0 + (DUR / 3) * (1 - Math.pow(1 - Math.min(1, (t - T0) / DUR), 3))));
  const veloc = (t: number) => (t < T0 ? V0 : V0 * Math.pow(Math.max(0, 1 - (t - T0) / DUR), 2));
  const Dtot = dist(T0 + DUR);

  // The sky, from a deep violet to a coral horizon, with the last of the sun and the first stars.
  const [fondo, fx] = lienzo(w, h, dp);
  fx.fillStyle = vertical(fx, 0, hz, [0, '#1a1650'], [0.45, '#5a2a78'], [0.8, '#e0506c'], [1, '#ffb064']);
  fx.fillRect(0, 0, w, hz + 3);
  const rs = azar(41);
  for (let k = 0; k < 60; k++) {
    const a = rs();
    const px = rs() * w;
    const py = rs() * hz * 0.62;
    fx.fillStyle = `rgba(255,248,220,${0.35 + a * 0.5})`;
    fx.beginPath();
    fx.arc(px, py, 0.6 + a * 0.9, 0, Math.PI * 2);
    fx.fill();
  }
  {
    const sx = w * 0.14;
    const g = fx.createRadialGradient(sx, hz, h * 0.02, sx, hz, h * 0.5);
    g.addColorStop(0, 'rgba(255,200,110,0.65)');
    g.addColorStop(1, 'rgba(255,150,90,0)');
    fx.fillStyle = g;
    fx.fillRect(0, 0, w, hz);
    fx.beginPath();
    fx.arc(sx, hz + h * 0.01, h * 0.065, Math.PI, 0);
    rellenar(fx, '#fff0b8', 2);
  }
  guardar(fondo);
  const brillos = guardar(
    (() => {
      const [c, x] = lienzo(w, h * 0.12, dp);
      const r = azar(77);
      for (let k = 0; k < 10; k++) {
        estrella(x, r() * w, h * (0.01 + r() * 0.1), 2.6 + r() * 2, 0.5, 4, 0);
        x.fillStyle = '#fff6d8';
        x.fill();
      }
      return c;
    })(),
  );
  // The mountains, low and purple.
  const Tt = w * 1.8;
  const montes = guardar(
    hornearTile(Tt, hz + 2, dp, (x) => {
      const f = onda(11, Tt, 3);
      const g = onda(19, Tt, 5);
      perfil(x, Tt, hz, (px) => h * 0.11 + f(px) * h * 0.05 + g(px) * h * 0.02, '#4e2c6c', 1.4);
      x.fillStyle = vertical(x, hz - h * 0.2, hz, [0, 'rgba(255,120,110,0)'], [1, 'rgba(255,140,100,0.4)']);
      x.fillRect(0, hz - h * 0.2, Tt, h * 0.2 + 2);
    }),
  );
  // The skyline: a pyramid with its beam, a tower, a sphere, a needle, and a billboard of its own.
  const hs = h * 0.5;
  const Ts = w * 1.5;
  const vegas = texto('safari.cartel.vegas').toLocaleUpperCase('es');
  const dibujarCiudad = (luces: boolean) => (x: CanvasRenderingContext2D) => {
    const r = azar(luces ? 91 : 90);
    if (!luces) {
      // Filler towers.
      const bloque = (px: number, bw: number, bh: number, col: string) => {
        x.beginPath();
        x.rect(px, hs - bh, bw, bh + 2);
        rellenar(x, col, 1.4);
        x.fillStyle = 'rgba(255,90,170,0.14)';
        x.fillRect(px, hs - bh * 0.35, bw, bh * 0.35 + 2);
      };
      let px = 4;
      while (px < Ts - 40) {
        const bw = h * (0.04 + r() * 0.06);
        const orilla = px < 20 || px > Ts - 90;
        const bh = h * (orilla ? 0.04 + r() * 0.03 : 0.07 + r() * 0.15);
        bloque(px, bw, bh, r() > 0.5 ? '#34205e' : '#2a1a4e');
        px += bw + h * (0.004 + r() * 0.012);
      }
      // The pyramid and its beam of light.
      const pb = h * 0.2;
      const ph = h * 0.15;
      const pxm = Ts * 0.1;
      x.fillStyle = vertical(x, 0, hs, [0, 'rgba(190,235,255,0)'], [0.55, 'rgba(190,235,255,0.5)'], [1, 'rgba(190,235,255,0.0)']);
      x.beginPath();
      x.moveTo(pxm - 2, hs - ph);
      x.lineTo(pxm - 14, 0);
      x.lineTo(pxm + 14, 0);
      x.lineTo(pxm + 2, hs - ph);
      x.closePath();
      x.fill();
      x.beginPath();
      x.moveTo(pxm - pb / 2, hs + 2);
      x.lineTo(pxm, hs - ph);
      x.lineTo(pxm + pb / 2, hs + 2);
      x.closePath();
      rellenar(x, '#3a2a6c', 1.6);
      x.fillStyle = 'rgba(255,90,170,0.2)';
      x.beginPath();
      x.moveTo(pxm, hs - ph);
      x.lineTo(pxm + pb / 2, hs + 2);
      x.lineTo(pxm + pb * 0.05, hs + 2);
      x.closePath();
      x.fill();
      // The lattice tower.
      const tx = Ts * 0.22;
      const th = h * 0.27;
      const tb = h * 0.1;
      x.beginPath();
      x.moveTo(tx - tb / 2, hs + 2);
      x.quadraticCurveTo(tx - tb * 0.12, hs - th * 0.4, tx - 2, hs - th);
      x.lineTo(tx + 2, hs - th);
      x.quadraticCurveTo(tx + tb * 0.12, hs - th * 0.4, tx + tb / 2, hs + 2);
      x.closePath();
      rellenar(x, '#4a2c78', 1.5);
      x.strokeStyle = 'rgba(255,170,220,0.5)';
      x.lineWidth = 0.9;
      for (let k = 1; k < 7; k++) {
        const yy = hs - (th * k) / 7;
        const ww = lerp(tb * 0.5, 2, k / 7);
        x.beginPath();
        x.moveTo(tx - ww, yy);
        x.lineTo(tx + ww, yy + th / 14);
        x.moveTo(tx + ww, yy);
        x.lineTo(tx - ww, yy + th / 14);
        x.stroke();
      }
      // The billboard of its own, on a hotel.
      const bx = Ts * 0.3;
      const bwid = h * 0.16;
      const bhei = h * 0.17;
      bloque(bx, bwid, bhei, '#3a2468');
      x.fillStyle = '#4a2c5c';
      x.fillRect(bx + bwid * 0.2, hs - bhei - h * 0.04, 2.4, h * 0.045);
      x.fillRect(bx + bwid * 0.78, hs - bhei - h * 0.04, 2.4, h * 0.045);
      x.beginPath();
      x.roundRect(bx - h * 0.02, hs - bhei - h * 0.1, bwid + h * 0.04, h * 0.065, 3);
      rellenar(x, '#2a0e2e', 1.6);
      x.fillStyle = '#ffe27a';
      x.shadowColor = '#ffb030';
      x.shadowBlur = 6;
      x.font = `800 ${Math.round(h * 0.037)}px ${FUENTE}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(vegas, bx + bwid / 2, hs - bhei - h * 0.067, bwid + h * 0.02);
      x.shadowBlur = 0;
      // The sphere.
      const sxr = Ts * 0.43;
      const sr = h * 0.09;
      const gs = x.createRadialGradient(sxr - sr * 0.3, hs - sr * 1.3, sr * 0.1, sxr, hs - sr, sr);
      gs.addColorStop(0, '#d86aff');
      gs.addColorStop(0.5, '#6a3aa8');
      gs.addColorStop(1, '#321e62');
      x.beginPath();
      x.arc(sxr, hs - sr * 0.9, sr, 0, Math.PI * 2);
      rellenar(x, gs, 1.6);
      x.save();
      x.clip();
      trama(x, sxr - sr, hs - sr * 1.9, sxr + sr, hs + 2, 'rgba(255,90,200,0.55)', (_a, b) => (b - (hs - sr * 1.9)) / (sr * 2), 4.2, 1.3);
      x.restore();
      // The needle with its saucer.
      const nx = Ts * 0.165;
      const nh = h * 0.34;
      x.beginPath();
      x.moveTo(nx - 3.4, hs + 2);
      x.lineTo(nx - 1.6, hs - nh);
      x.lineTo(nx + 1.6, hs - nh);
      x.lineTo(nx + 3.4, hs + 2);
      x.closePath();
      rellenar(x, '#3e2670', 1.3);
      x.beginPath();
      x.ellipse(nx, hs - nh * 0.74, h * 0.045, h * 0.014, 0, 0, Math.PI * 2);
      rellenar(x, '#5a3a98', 1.4);
      x.beginPath();
      x.moveTo(nx, hs - nh);
      x.lineTo(nx, hs - nh - h * 0.04);
      x.strokeStyle = TINTA;
      x.lineWidth = 1.3;
      x.stroke();
    } else {
      // The lit windows, in a second layer that twinkles.
      for (let k = 0; k < 150; k++) {
        const px = r() * Ts;
        const py = hs - r() * h * 0.22;
        x.fillStyle = r() > 0.5 ? '#ffe27a' : r() > 0.5 ? '#ff8ac8' : '#7ae8ff';
        x.fillRect(px, py, 1.8, 2.4);
      }
    }
  };
  const ciudad = guardar(hornearTile(Ts, hs + 2, dp, dibujarCiudad(false)));
  const luces = guardar(hornearTile(Ts, hs + 2, dp, dibujarCiudad(true)));
  // The dusk ground, the road and its edges, static.
  const [campo, cm] = lienzo(w, h, dp);
  cm.fillStyle = vertical(cm, hz, h, [0, '#c0607a'], [0.35, '#7a3a60'], [1, '#3a2048']);
  cm.fillRect(0, hz, w, h - hz);
  trama(cm, 0, hz, w, h * 0.8, 'rgba(30,10,50,0.4)', (_a, b) => (b - hz) / (h * 0.3), 5, 1.6);
  cm.fillStyle = '#463a4c';
  cm.fillRect(0, h * 0.82, w, h * 0.165);
  cm.fillStyle = '#9a8498';
  cm.fillRect(0, h * 0.805, w, h * 0.018);
  cm.fillRect(0, h * 0.987, w, h * 0.02);
  trama(cm, 0, h * 0.82, w, h * 0.985, 'rgba(10,0,30,0.45)', (_a, b) => 1 - (b - h * 0.82) / (h * 0.165) * 1.1, 4.4, 1.3);
  cm.strokeStyle = TINTA;
  cm.lineWidth = 1.6;
  cm.beginPath();
  cm.moveTo(0, h * 0.805);
  cm.lineTo(w, h * 0.805);
  cm.moveTo(0, h * 0.987);
  cm.lineTo(w, h * 0.987);
  cm.stroke();
  guardar(campo);
  // Joshua trees and sagebrush in silhouette along the sand.
  const arboles = guardar(
    hornearTile(w * 1.3, h * 0.3, dp, (x) => {
      const r = azar(57);
      for (let k = 0; k < 7; k++) {
        const px = r() * w * 1.3;
        const py = h * (0.22 + r() * 0.05);
        const al = h * (0.08 + r() * 0.08);
        envolver(w * 1.3, px, al, (q) => {
          x.strokeStyle = TINTA;
          x.lineCap = 'round';
          for (const [col, lw] of [[TINTA, 5.2], ['#2a1a3e', 3.4]] as Array<[string, number]>) {
            x.strokeStyle = col;
            x.lineWidth = lw;
            x.beginPath();
            x.moveTo(q, py);
            x.lineTo(q + 1, py - al * 0.6);
            x.moveTo(q + 1, py - al * 0.45);
            x.lineTo(q - al * 0.28, py - al * 0.85);
            x.moveTo(q + 1, py - al * 0.6);
            x.lineTo(q + al * 0.3, py - al * 0.95);
            x.stroke();
          }
        });
      }
      for (let k = 0; k < 12; k++) {
        const px = r() * w * 1.3;
        const py = h * (0.24 + r() * 0.05);
        const rr = h * (0.012 + r() * 0.014);
        envolver(w * 1.3, px, rr * 3, (q) => {
          for (const [dx, dy] of [[-0.9, 0.1], [0, -0.4], [0.9, 0.05]] as Array<[number, number]>) {
            x.beginPath();
            x.ellipse(q + dx * rr, py + dy * rr, rr, rr * 0.8, 0, 0, Math.PI * 2);
            rellenar(x, '#3a2a52', 1.2);
          }
        });
      }
    }),
  );
  const rayas = guardar(
    hornearTile(w * 0.55, h * 0.06, dp, (x) => {
      x.fillStyle = '#f2dcae';
      x.beginPath();
      x.roundRect(0, h * 0.02, w * 0.2, 3.2, 1.6);
      x.fill();
    }),
  );
  // Streaks of speed, which fade as the caravan brakes.
  const rachas = guardar(
    hornearTile(w * 1.1, h * 0.5, dp, (x) => {
      const r = azar(15);
      x.lineCap = 'round';
      for (let k = 0; k < 11; k++) {
        const px = r() * w * 1.1;
        const L = 40 + r() * 90;
        x.strokeStyle = `rgba(255,236,214,${0.35 + r() * 0.35})`;
        x.lineWidth = 1.2 + r() * 1.4;
        const py = h * (0.04 + r() * 0.42);
        envolver(w * 1.1, px, L, (q) => {
          x.beginPath();
          x.moveTo(q, py);
          x.lineTo(q + L, py);
          x.stroke();
        });
      }
    }),
  );
  // The neon sign, in its two phases.
  const cw = w * 0.4;
  const chh = h * 0.42;
  const [palabra1, ...resto] = texto('safari.cartel.penultima').toLocaleUpperCase('es').split(' ');
  const letrero = [0, 1].map((f) => guardar(hornearCartel(cw, chh, dp, f, palabra1, resto.join(' '))));
  const cartelY = h * 0.805 - chh;
  const cartelFinal = w * 0.76;
  // The headlights.
  const vc = crearVehiculoComic(h * 0.2, dp);
  guardar(vc.img);
  const cx = w * 0.32;
  const x0 = cx - vc.vw / 2;
  const luz = guardar(
    (() => {
      const L = w * 0.6;
      const A = h * 0.3;
      const [c, x] = lienzo(L, A, dp);
      const g = x.createLinearGradient(0, 0, L, 0);
      g.addColorStop(0, 'rgba(255,236,160,0.62)');
      g.addColorStop(1, 'rgba(255,230,150,0)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(0, A * 0.46);
      x.lineTo(L, A * 0.02);
      x.lineTo(L, A * 0.98);
      x.lineTo(0, A * 0.54);
      x.closePath();
      x.fill();
      return c;
    })(),
  );
  const tinte = guardar(
    (() => {
      const [c, x] = lienzo(w, h, 1);
      x.fillStyle = vertical(x, 0, h, [0, 'rgba(40,0,80,0.12)'], [1, 'rgba(255,90,140,0.1)']);
      x.fillRect(0, 0, w, h);
      return c;
    })(),
  );
  const luciernagas = [
    [0.1, 3.1, 28, 14, 0.4],
    [0.6, 2.2, 22, 18, 2.4],
    [1.3, 4.0, 34, 10, 4.1],
  ];

  return {
    ventana: ventanaDe(vc, cx, suelo, w, h),
    pintar(x, t) {
      const D = dist(t);
      const v = veloc(t);
      const zoom = 1 + Math.min(1, t / 10) * 0.06;
      const ax = cx - vc.vw / 2 + vc.ventana[0];
      const ay = suelo - vc.base - vc.tope + vc.ventana[1];
      x.save();
      x.translate(ax, ay);
      x.scale(zoom, zoom);
      x.translate(-ax, -ay);
      x.drawImage(fondo, 0, 0, w, h);
      x.globalAlpha = 0.55 + 0.45 * Math.sin(t * 3.1);
      x.drawImage(brillos, 0, h * 0.04, w, h * 0.12);
      x.globalAlpha = 1;
      dibujarTile(x, montes, D * 0.03 + t * 0.5, hz - montes.h + 2, w);
      dibujarTile(x, ciudad, D * 0.06, hz - ciudad.h + 2, w);
      x.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2.6);
      dibujarTile(x, luces, D * 0.06, hz - luces.h + 2, w);
      x.globalAlpha = 1;
      x.drawImage(campo, 0, 0, w, h);
      dibujarTile(x, arboles, D * 0.45, hz + h * 0.01, w);
      dibujarTile(x, rayas, D, h * 0.885, w);
      // The sign comes in from the right and stays where the caravan stops.
      const sxp = cartelFinal + (Dtot - D) * 0.9;
      if (sxp - cw / 2 < w) {
        const fase = Math.floor(t * 3) % 2;
        x.drawImage(letrero[fase], sxp - cw / 2, cartelY, cw, chh);
        // A few moths round its light.
        x.fillStyle = 'rgba(255,244,214,0.9)';
        for (const [ph, vv, rx, ry, off] of luciernagas) {
          const a = t * vv + off;
          x.beginPath();
          x.arc(sxp + Math.cos(a) * rx * 1.3 + ph * 4, cartelY + chh * 0.3 + Math.sin(a * 1.3) * ry, 1.4, 0, Math.PI * 2);
          x.fill();
        }
      }
      // The speed streaks while it runs.
      if (v > 20) {
        x.globalAlpha = acota(v / V0) * 0.9;
        dibujarTile(x, rachas, D * 2.2, h * 0.3, w);
        x.globalAlpha = 1;
      }
      // Dust: the running trail, then the skid cloud.
      if (v > 120) polvo(x, vc, cx, suelo, t, v, { n: 10, largo: vc.vw * 1.1, alto: vc.vh * 0.1, alfa: 0.6 });
      const rueda = x0 + vc.ruedas[0][0];
      for (let k = 0; k < 8; k++) {
        const a = t - T0 - k * 0.13;
        if (a < 0 || a > 1.5) continue;
        const u = a / 1.5;
        const s = 0.55 + u * 1.5;
        x.globalAlpha = (1 - u) * 0.85;
        x.drawImage(vc.puff.img, rueda - 14 - a * 46 - k * 6 - (vc.puff.w * s) / 2, suelo - a * 18 - vc.puff.h * s * 0.7, vc.puff.w * s, vc.puff.h * s);
      }
      x.globalAlpha = 1;
      // The caravan: wheels by distance, a dive when it brakes, a shiver when it idles.
      const freno = acota((t - T0) / (DUR + 0.5));
      const pitch = Math.sin(Math.PI * Math.min(1, freno * 1.6)) * 0.03 * (freno < 1 ? 1 : 0);
      const ralenti = t > T0 + DUR ? Math.sin(t * 41) * 0.6 : 0;
      dibujarVehiculoComic(x, vc, cx, suelo, D / V0, { vel: V0, bote: v > 60 ? h * 0.004 * suave(v / V0) : 0, inclina: pitch, dy: ralenti });
      // The headlights come on once it has stopped.
      const enc = suave(acota((t - (T0 + DUR * 0.7)) / 0.5));
      if (enc > 0) {
        x.globalAlpha = enc * (0.85 + 0.15 * Math.sin(t * 9));
        x.globalCompositeOperation = 'lighter';
        x.drawImage(luz, x0 + vc.vw - 8, suelo - vc.vh * 0.46 - h * 0.15, w * 0.6, h * 0.3);
        x.globalCompositeOperation = 'source-over';
        x.globalAlpha = 1;
      }
      x.drawImage(tinte, 0, 0, w, h);
      x.restore();
    },
    liberar() {
      soltar(...liberables);
    },
  };
};
