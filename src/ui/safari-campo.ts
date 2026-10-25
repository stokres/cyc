// Safari comic, shots 2 and 3: the Monegros (a steppe with wind turbines and a black bull on a hill) and the map that
// blows away out of the caravan's window. Painted once; a frame draws images.
import { azar, TINTA, elipse, lienzo, mezcla, nube, onda, rellenar, trama, vertical, envolver } from './safari-dibujo';
import { crearVehiculoComic, dibujarTile, dibujarVehiculoComic, hornearTile, polvo, soltar, ventanaDe, type Constructor, type Tile } from './safari-base';
import { perfil, pintarAspas, pintarSol, pintarToro } from './safari-paisaje';

export const escenaMonegros: Constructor = (m) => {
  const { w, h, dp } = m;
  const hz = h * 0.5;
  const suelo = h * 0.9;
  const vel = 240;
  const liberables: Array<Tile | HTMLCanvasElement> = [];
  const guardar = <T extends Tile | HTMLCanvasElement>(t: T) => (liberables.push(t), t);

  // A tall pale sky, almost white at the horizon, with long thin clouds pulled by the cierzo.
  const [cielo, sx] = lienzo(w, hz + 4, dp);
  sx.fillStyle = vertical(sx, 0, hz, [0, '#5aa4e0'], [0.55, '#a8d4ee'], [1, '#fbe8b8']);
  sx.fillRect(0, 0, w, hz + 4);
  guardar(cielo);
  const nubes = guardar(
    hornearTile(w * 1.3, hz, dp, (x) => {
      const r = azar(3);
      for (let k = 0; k < 4; k++) {
        const cx = ((k + 0.4) / 4) * w * 1.3;
        envolver(w * 1.3, cx, w * 0.2, (px) => {
          x.save();
          x.translate(px, h * (0.08 + r() * 0.22));
          x.scale(2.4, 0.5);
          nube(x, 0, 0, h * (0.07 + r() * 0.04), '#fffaf0', '#dfe6ee', 1.6);
          x.restore();
        });
      }
    }),
  );
  const sol = guardar(pintarSol(h * 0.075, dp).img);
  const solS = h * 0.075 * 4.4;
  // The far hills, pale and low.
  const Tl = w * 1.5;
  const lomas = guardar(
    hornearTile(Tl, hz + 2, dp, (x) => {
      const f = onda(9, Tl, 3);
      const g = onda(14, Tl, 4);
      perfil(x, Tl, hz, (px) => h * 0.07 + f(px) * h * 0.04, '#d6b0a2', 1.4);
      perfil(x, Tl, hz, (px) => h * 0.03 + g(px) * h * 0.02, '#e2c09a', 1.2);
    }),
  );
  // The wind turbines on the far ridge (their towers in a tile, their blades turning on top).
  const Tt = w * 1.25;
  const torres = [
    { u: 0.12, alto: h * 0.26 },
    { u: 0.45, alto: h * 0.31 },
    { u: 0.78, alto: h * 0.22 },
  ];
  const molinos = guardar(
    hornearTile(Tt, hz + 2, dp, (x) => {
      for (const t of torres) {
        const px = t.u * Tt;
        x.beginPath();
        x.moveTo(px - 3, hz);
        x.lineTo(px - 1.2, hz - t.alto);
        x.lineTo(px + 1.2, hz - t.alto);
        x.lineTo(px + 3, hz);
        x.closePath();
        rellenar(x, '#f4efe4', 1.4);
        x.fillStyle = 'rgba(190,170,150,0.7)';
        x.fillRect(px - 0.2, hz - t.alto, 3, t.alto);
        elipse(x, px, hz - t.alto, 3.4, 3.4, '#e4dccc');
      }
    }),
  );
  const aspas = guardar(pintarAspas(h * 0.16, dp).img);
  const aspasS = h * 0.16 * 2 + 6;
  // The steppe: a ground gradient, gypsum patches, shrubs and the bull on its hill, as a tile that scrolls.
  const Tm = w * 1.9;
  const toro = pintarToro(h * 0.27, dp);
  guardar(toro.img);
  const yb = h * 0.36;
  const estepa = guardar(
    hornearTile(Tm, h * 0.7, dp, (x) => {
      const r = azar(21);
      const f = onda(5, Tm, 3);
      // A swell of land with the bull on top.
      const colina = (px: number) => {
        const d = (px - Tm * 0.55) / (Tm * 0.13);
        return h * 0.1 * Math.exp(-d * d) + f(px) * h * 0.008;
      };
      perfil(x, Tm, yb + h * 0.03, (px) => colina(px) + h * 0.012, '#d9a874', 2, 4, h * 0.7);
      x.drawImage(toro.img, Tm * 0.55 - toro.w * 0.45, yb + h * 0.03 - h * 0.1 - toro.h + 8, toro.w, toro.h);
      // The land in front of it: lighter, with gypsum patches, shrubs and stones.
      perfil(x, Tm, yb + h * 0.07, (px) => h * 0.01 + f(px * 1.3) * h * 0.008, '#e6bc82', 2, 4, h * 0.7);
      for (let k = 0; k < 20; k++) {
        const px = r() * Tm;
        const py = yb + h * (0.1 + r() * 0.2);
        const rr = h * (0.02 + r() * 0.04);
        envolver(Tm, px, rr * 3, (q) => {
          x.save();
          x.translate(q, py);
          x.scale(2.4, 0.6);
          x.beginPath();
          x.arc(0, 0, rr, 0, Math.PI * 2);
          x.fillStyle = 'rgba(250,244,230,0.75)';
          x.fill();
          x.restore();
        });
      }
      for (let k = 0; k < 24; k++) {
        const px = r() * Tm;
        const py = yb + h * (0.09 + r() * 0.2);
        const rr = h * (0.012 + r() * 0.022);
        envolver(Tm, px, rr * 3, (q) => {
          for (const [dx, dy, q2] of [[-0.9, 0.1, 0.8], [0, -0.35, 1], [0.9, 0.05, 0.85]] as Array<[number, number, number]>) {
            x.beginPath();
            x.ellipse(q + dx * rr, py + dy * rr, rr * q2, rr * q2 * 0.8, 0, 0, Math.PI * 2);
            rellenar(x, mezcla('#6a7a3c', '#4a5a2c', r()), 1.4);
          }
        });
      }
    }),
  );
  // The road and its edge, static; the dashes and tufts scroll.
  const [camino, cm] = lienzo(w, h, dp);
  cm.fillStyle = vertical(cm, hz, h, [0, '#ecd09c'], [1, '#c48e58']);
  cm.fillRect(0, hz, w, h - hz);
  trama(cm, 0, h * 0.64, w, h, 'rgba(120,70,40,0.32)', (_a, b) => (b - h * 0.64) / (h * 0.36), 5, 1.6);
  cm.fillStyle = '#7c6e74';
  cm.fillRect(0, h * 0.76, w, h * 0.2);
  cm.fillStyle = '#b4a496';
  cm.fillRect(0, h * 0.745, w, h * 0.018);
  cm.fillRect(0, h * 0.955, w, h * 0.02);
  trama(cm, 0, h * 0.76, w, h * 0.96, 'rgba(50,30,50,0.4)', (_a, b) => 1 - (b - h * 0.76) / (h * 0.2) * 1.1, 4.4, 1.3);
  cm.strokeStyle = TINTA;
  cm.lineWidth = 1.6;
  cm.beginPath();
  cm.moveTo(0, h * 0.745);
  cm.lineTo(w, h * 0.745);
  cm.moveTo(0, h * 0.975);
  cm.lineTo(w, h * 0.975);
  cm.stroke();
  guardar(camino);
  const rayas = guardar(
    hornearTile(w * 0.55, h * 0.06, dp, (x) => {
      x.fillStyle = '#f2e6c4';
      x.beginPath();
      x.roundRect(0, h * 0.02, w * 0.2, 3.2, 1.6);
      x.fill();
    }),
  );
  const matas = guardar(
    hornearTile(w * 0.9, h * 0.12, dp, (x) => {
      const r = azar(44);
      for (let k = 0; k < 16; k++) {
        const px = r() * w * 0.9;
        const py = h * (0.03 + r() * 0.08);
        envolver(w * 0.9, px, 30, (q) => {
          x.strokeStyle = mezcla('#8a6a30', '#5a4a24', r());
          x.lineWidth = 2;
          x.lineCap = 'round';
          x.beginPath();
          for (let a = -2; a <= 2; a++) {
            x.moveTo(q, py);
            x.lineTo(q + a * 4, py - 8 - r() * 8);
          }
          x.stroke();
        });
      }
    }),
  );
  const viento = guardar(
    hornearTile(w * 1.1, hz, dp, (x) => {
      const r = azar(31);
      x.strokeStyle = 'rgba(255,255,255,0.55)';
      x.lineWidth = 1.6;
      x.lineCap = 'round';
      for (let k = 0; k < 9; k++) {
        const px = r() * w * 1.1;
        const py = h * (0.05 + r() * 0.36);
        const L = 26 + r() * 50;
        envolver(w * 1.1, px, L, (q) => {
          x.beginPath();
          x.moveTo(q, py);
          x.bezierCurveTo(q + L * 0.3, py - 5, q + L * 0.6, py + 5, q + L, py - 2);
          x.stroke();
        });
      }
    }),
  );
  // A tumbleweed rolling across.
  const rodante = (() => {
    const r = h * 0.075;
    const [c, x] = lienzo(r * 2.4, r * 2.4, dp);
    x.translate(r * 1.2, r * 1.2);
    const q = azar(5);
    x.lineCap = 'round';
    for (const [col, lw] of [[TINTA, 2.6], ['#b88a4a', 1.5]] as Array<[string, number]>) {
      x.strokeStyle = col;
      x.lineWidth = lw;
      q();
      const qq = azar(5);
      for (let k = 0; k < 14; k++) {
        const a = qq() * Math.PI * 2;
        const rr = r * (0.45 + qq() * 0.55);
        x.beginPath();
        x.ellipse(0, 0, rr, rr * (0.5 + qq() * 0.5), a, qq() * 6, qq() * 6 + 3.2);
        x.stroke();
      }
    }
    return { img: guardar(c), r };
  })();
  const vc = crearVehiculoComic(h * 0.37, dp);
  guardar(vc.img);
  const cx = w * 0.6;
  const tinte = guardar(
    (() => {
      const [c, x] = lienzo(w, h, 1);
      x.fillStyle = vertical(x, 0, h, [0, 'rgba(255,240,200,0.0)'], [1, 'rgba(255,170,90,0.14)']);
      x.fillRect(0, 0, w, h);
      return c;
    })(),
  );

  return {
    ventana: ventanaDe(vc, cx, suelo, w, h),
    pintar(x, t) {
      const zoom = 1 + Math.min(1, t / 9) * 0.05;
      const ax = cx - vc.vw / 2 + vc.ventana[0];
      const ay = suelo - vc.base - vc.tope + vc.ventana[1];
      x.save();
      x.translate(ax, ay);
      x.scale(zoom, zoom);
      x.translate(-ax, -ay);
      x.drawImage(cielo, 0, 0, w, hz + 4);
      x.save();
      x.translate(w * 0.8, h * 0.2);
      x.rotate(t * 0.15);
      x.drawImage(sol, -solS / 2, -solS / 2, solS, solS);
      x.restore();
      dibujarTile(x, nubes, t * 6, 0, w);
      dibujarTile(x, lomas, t * 6, hz - lomas.h + 2, w);
      dibujarTile(x, molinos, t * 16, hz - molinos.h + 2, w);
      // The blades turn (a bitmap, rotated).
      for (const tt of torres) {
        for (const k of [0, -1]) {
          const px = ((tt.u * Tt - t * 16) % Tt + Tt) % Tt + k * Tt;
          if (px < -aspasS || px > w + aspasS) continue;
          x.save();
          x.translate(px, hz - tt.alto);
          x.rotate(t * (1.1 + tt.u) + tt.u * 9);
          x.drawImage(aspas, -aspasS / 2, -aspasS / 2, aspasS, aspasS);
          x.restore();
        }
      }
      dibujarTile(x, estepa, t * 70, hz - yb, w);
      x.drawImage(camino, 0, 0, w, h);
      dibujarTile(x, rayas, t * vel, h * 0.855, w);
      dibujarTile(x, viento, t * 380, 0, w);
      polvo(x, vc, cx, suelo, t, vel, { n: 10, largo: vc.vw * 1.25, alto: vc.vh * 0.1, alfa: 0.65 });
      dibujarVehiculoComic(x, vc, cx, suelo, t, { vel, bote: h * 0.006 });
      // The tumbleweed hops across the road in front of the caravan, going the other way.
      const T = w * 2.4;
      const rx = w * 1.3 - ((t * 230) % T) + 30;
      const hop = Math.abs(Math.sin(t * 5.1)) * h * 0.08;
      x.save();
      x.translate(rx, h * 0.97 - rodante.r - hop);
      x.rotate(-(rx / rodante.r) * 0.9);
      x.drawImage(rodante.img, -rodante.r * 1.2, -rodante.r * 1.2, rodante.r * 2.4, rodante.r * 2.4);
      x.restore();
      dibujarTile(x, matas, t * 620, h * 0.9, w);
      x.drawImage(tinte, 0, 0, w, h);
      x.restore();
    },
    liberar() {
      soltar(...liberables);
    },
  };
};

/** The map blowing out of the window: a close-up of the caravan's side, a map that flaps away, and the land streaking by. */
export const escenaMapa: Constructor = (m) => {
  const { w, h, dp } = m;
  const liberables: Array<Tile | HTMLCanvasElement> = [];
  const guardar = <T extends Tile | HTMLCanvasElement>(t: T) => (liberables.push(t), t);
  const [fondo, fx] = lienzo(w, h, dp);
  fx.fillStyle = vertical(fx, 0, h * 0.62, [0, '#4f9ee0'], [1, '#f6e4b4']);
  fx.fillRect(0, 0, w, h);
  fx.fillStyle = vertical(fx, h * 0.55, h, [0, '#e2b87e'], [1, '#b8844e']);
  fx.fillRect(0, h * 0.58, w, h * 0.42);
  guardar(fondo);
  // Streaks of speed, in two tiles at two speeds.
  const racha = (semilla: number, n: number, y0: number, y1: number, alfaC: number) =>
    guardar(
      hornearTile(w * 1.2, h, dp, (x) => {
        const r = azar(semilla);
        x.lineCap = 'round';
        for (let k = 0; k < n; k++) {
          const px = r() * w * 1.2;
          const L = 30 + r() * 80;
          x.strokeStyle = `rgba(255,248,230,${alfaC * (0.5 + r() * 0.5)})`;
          x.lineWidth = 1.2 + r() * 1.6;
          const py = h * (y0 + r() * (y1 - y0));
          envolver(w * 1.2, px, L, (q) => {
            x.beginPath();
            x.moveTo(q, py);
            x.lineTo(q + L, py);
            x.stroke();
          });
        }
      }),
    );
  const rachas1 = racha(8, 14, 0.05, 0.55, 0.5);
  const rachas2 = racha(19, 12, 0.6, 0.98, 0.45);
  const suelo = h * 0.94;
  const vc = crearVehiculoComic(h * 0.6, dp);
  guardar(vc.img);
  const cx = vc.vw / 2 + w * 0.03;
  // The map: a folded sheet with a route, an X and a little mountain; its two sides.
  const mw = h * 0.3;
  const mh = h * 0.22;
  const [mapa, mp] = lienzo(mw + 4, mh + 4, dp);
  mp.translate(2, 2);
  mp.beginPath();
  mp.moveTo(0, 2);
  mp.lineTo(mw * 0.33, 0);
  mp.lineTo(mw * 0.66, 3);
  mp.lineTo(mw, 0);
  mp.lineTo(mw - 2, mh);
  mp.lineTo(mw * 0.66, mh - 3);
  mp.lineTo(mw * 0.33, mh);
  mp.lineTo(2, mh - 2);
  mp.closePath();
  rellenar(mp, '#f6ead0', 2);
  mp.save();
  mp.clip();
  mp.fillStyle = 'rgba(190,150,90,0.3)';
  mp.fillRect(mw * 0.33, 0, mw * 0.33, mh);
  trama(mp, 0, 0, mw, mh, 'rgba(160,110,60,0.4)', (px) => (px / mw) * 0.6 - 0.1, 4, 1.2);
  mp.restore();
  mp.strokeStyle = '#c8402e';
  mp.lineWidth = 1.8;
  mp.setLineDash([4, 3]);
  mp.beginPath();
  mp.moveTo(mw * 0.1, mh * 0.8);
  mp.bezierCurveTo(mw * 0.3, mh * 0.2, mw * 0.5, mh * 0.9, mw * 0.8, mh * 0.35);
  mp.stroke();
  mp.setLineDash([]);
  mp.lineWidth = 2.4;
  mp.beginPath();
  mp.moveTo(mw * 0.76, mh * 0.2);
  mp.lineTo(mw * 0.86, mh * 0.5);
  mp.moveTo(mw * 0.86, mh * 0.2);
  mp.lineTo(mw * 0.76, mh * 0.5);
  mp.stroke();
  mp.strokeStyle = TINTA;
  mp.lineWidth = 1.4;
  mp.beginPath();
  mp.moveTo(mw * 0.12, mh * 0.35);
  mp.lineTo(mw * 0.2, mh * 0.18);
  mp.lineTo(mw * 0.28, mh * 0.35);
  mp.stroke();
  guardar(mapa);

  return {
    ventana: ventanaDe(vc, cx, suelo, w, h),
    pintar(x, t) {
      x.drawImage(fondo, 0, 0, w, h);
      dibujarTile(x, rachas1, t * 520, 0, w);
      // The caravan's side, huge, shaking on the road.
      dibujarVehiculoComic(x, vc, cx, suelo, t, { vel: 260, bote: h * 0.012, banderin: false });
      // The map flaps out of the window, on a lazy S that climbs, and comes round again.
      const T = 4.6;
      const u = ((t - 0.5) % T + T) % T / T;
      if (t > 0.5) {
        const wx = cx - vc.vw / 2 + vc.ventana[0] + vc.v.cw * 0.12;
        const wy = suelo - vc.base - vc.tope + vc.ventana[1] + vc.v.ch * 0.08;
        const px = wx + u * (w - wx + mw * 1.4);
        const py = wy - Math.sin(u * 2.4) * h * 0.46 - u * h * 0.1 + Math.sin(u * 14) * h * 0.03;
        x.save();
        x.translate(px, py);
        x.rotate(Math.sin(u * 17) * 0.5 + u * 3.4);
        x.scale(1, 0.55 + 0.45 * Math.cos(u * 21));
        const s = 0.6 + Math.min(1, u * 3) * 0.55;
        x.scale(s, s);
        x.drawImage(mapa, -mw / 2, -mh / 2, mw + 4, mh + 4);
        x.restore();
      }
      dibujarTile(x, rachas2, t * 900, 0, w);
    },
    liberar() {
      soltar(...liberables);
    },
  };
};
