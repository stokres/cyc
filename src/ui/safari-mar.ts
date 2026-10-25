// Safari comic, shots 6 and 7: the caravan afloat on the Atlantic at night, with a giant octopus slapping the water beside
// it, and the little strip of «kilómetro 4.000» at dawn with a signpost floating by. Painted once; a frame draws images.
import { texto } from '../juego/textos';
import { azar, TINTA, elipse, estrella, lienzo, nube, onda, pintarGota, rellenar, trama, vertical, envolver, lerp, suave, FUENTE } from './safari-dibujo';
import { crearVehiculoComic, dibujarTile, dibujarVehiculoComic, hornearTile, soltar, ventanaDe, type Constructor, type Tile } from './safari-base';
import { perfil } from './safari-paisaje';
import { pintarPulpo } from './safari-fauna';

/** Moment (seconds into the shot) at which the tentacle slaps the water; the onomatopoeia comes with it (src/ui/safari.ts). */
const T_PLAF = 5.9;

/** A repeating row of waves: a body of water with a lit crest, white foam flecks and a halftone in the troughs. */
function hornearOlas(w: number, alto: number, dp: number, sx: number, cuerpo: string, cresta: string, semilla: number, amp: number, lw = 1.8) {
  return hornearTile(w, alto, dp, (x) => {
    const f = onda(semilla, w, 3);
    const g = onda(semilla + 4, w, 5);
    const base = alto * 0.3;
    perfil(x, w, base, (px) => amp * (f(px * sx) * 0.7 + g(px) * 0.3), cuerpo, 0, 3, alto);
    // The crest, a thick pale line with the ink under it.
    x.lineJoin = 'round';
    x.lineCap = 'round';
    for (const [col, ancho, dy] of [[TINTA, lw * 2.2, 0], [cresta, lw * 1.1, -0.5]] as Array<[string, number, number]>) {
      x.beginPath();
      for (let px = -3; px <= w + 3; px += 3) {
        const y = base - amp * (f(px * sx) * 0.7 + g(px) * 0.3) + dy;
        if (px === -3) x.moveTo(px, y);
        else x.lineTo(px, y);
      }
      x.strokeStyle = col;
      x.lineWidth = ancho;
      x.stroke();
    }
    trama(x, 0, base, w, alto, 'rgba(8,16,60,0.5)', (_px, py) => (py - base) / (alto - base) * 1.1 - 0.1, 4.6, 1.5);
    const r = azar(semilla * 7);
    x.fillStyle = 'rgba(240,250,255,0.8)';
    for (let k = 0; k < 9; k++) {
      const px = r() * w;
      const py = base - amp * (f(px * sx) * 0.7 + g(px) * 0.3);
      envolver(w, px, 12, (q) => {
        x.beginPath();
        x.ellipse(q, py + 3 + r() * alto * 0.2, 5 + r() * 7, 1.6, 0, 0, Math.PI * 2);
        x.fill();
      });
    }
  });
}

export const escenaOceano: Constructor = (m) => {
  const { w, h, dp } = m;
  const wl = h * 0.56;
  const liberables: Array<Tile | HTMLCanvasElement> = [];
  const guardar = <T extends Tile | HTMLCanvasElement>(t: T) => (liberables.push(t), t);

  // The sky: a deep night, lighter toward the horizon, with stars and a huge moon.
  const [cielo, cx0] = lienzo(w, h, dp);
  cx0.fillStyle = vertical(cx0, 0, wl, [0, '#0a1034'], [0.55, '#262a68'], [1, '#6a4e94']);
  cx0.fillRect(0, 0, w, wl + 2);
  const rs = azar(8);
  for (let i = 0; i < 70; i++) {
    const a = rs();
    cx0.fillStyle = `rgba(255,244,220,${0.35 + rs() * 0.5})`;
    const s = rs() < 0.12 ? 2.4 : 1.4;
    cx0.fillRect(rs() * w, a * wl * 0.9, s, s);
  }
  guardar(cielo);
  const luR = h * 0.13;
  const luna = (() => {
    const S = luR * 4;
    const [c, x] = lienzo(S, S, dp);
    x.translate(S / 2, S / 2);
    const g = x.createRadialGradient(0, 0, luR * 0.9, 0, 0, S / 2);
    g.addColorStop(0, 'rgba(255,238,190,0.55)');
    g.addColorStop(1, 'rgba(255,238,190,0)');
    x.fillStyle = g;
    x.fillRect(-S / 2, -S / 2, S, S);
    x.beginPath();
    x.arc(0, 0, luR, 0, Math.PI * 2);
    rellenar(x, '#fff0c8', 2.6);
    x.save();
    x.clip();
    for (const [dx, dy, r] of [[-0.35, -0.2, 0.2], [0.28, 0.25, 0.26], [0.05, -0.5, 0.12], [-0.3, 0.45, 0.14], [0.5, -0.2, 0.1]]) {
      x.beginPath();
      x.arc(dx * luR, dy * luR, r * luR, 0, Math.PI * 2);
      x.fillStyle = 'rgba(190,160,110,0.45)';
      x.fill();
      x.strokeStyle = 'rgba(120,90,60,0.5)';
      x.lineWidth = 1.2;
      x.stroke();
    }
    trama(x, -luR, -luR * 0.1, luR, luR, 'rgba(150,120,90,0.5)', (px, py) => ((py + luR * 0.1) / luR + (px + luR) / (luR * 3)) * 0.8, 4, 1.3);
    x.restore();
    return guardar(c);
  })();
  const luS = luR * 4;
  const nubes = guardar(
    hornearTile(w * 1.3, wl, dp, (x) => {
      const r = azar(22);
      for (let k = 0; k < 4; k++) {
        const cx = ((k + 0.5) / 4) * w * 1.3;
        envolver(w * 1.3, cx, w * 0.2, (px) => {
          x.save();
          x.translate(px, h * (0.12 + r() * 0.22));
          x.scale(2.2, 0.5);
          nube(x, 0, 0, h * (0.06 + r() * 0.04), '#4a4a90', '#2c2c6a', 1.6);
          x.restore();
        });
      }
    }),
  );
  // A faraway island with palms, and the sea.
  const [mar, mx] = lienzo(w, h, dp);
  mx.fillStyle = vertical(mx, wl, h, [0, '#2f4a98'], [0.4, '#16306e'], [1, '#08153e']);
  mx.fillRect(0, wl, w, h - wl);
  // The moon's reflection: a column of dashes.
  const lx = w * 0.78;
  for (let k = 0; k < 16; k++) {
    const y = wl + 4 + k * (h * 0.02) * (1 + k * 0.1);
    const an = (14 + k * 4) * (1 - k * 0.025);
    mx.fillStyle = `rgba(255,236,180,${0.62 - k * 0.032})`;
    mx.beginPath();
    mx.roundRect(lx - an / 2 + Math.sin(k * 2.1) * 6, y, an, 2.4, 1.2);
    mx.fill();
  }
  guardar(mar);
  const isla = guardar(
    hornearTile(w * 1.5, h * 0.2, dp, (x) => {
      const base = h * 0.2 - 1;
      const f = onda(2, w * 1.5, 3);
      perfil(x, w * 1.5, base, (px) => (Math.max(0, f(px)) * h * 0.035) * (px > w * 0.25 && px < w * 0.6 ? 1.6 : 0.2) + h * 0.004, '#1c2050', 1.4);
      x.lineWidth = 2;
      x.strokeStyle = TINTA;
      x.lineCap = 'round';
      for (const [px, alto] of [[w * 0.36, h * 0.11], [w * 0.41, h * 0.085], [w * 0.5, h * 0.1]]) {
        const bx = px;
        const by = base - h * 0.03;
        x.beginPath();
        x.moveTo(bx, by);
        x.quadraticCurveTo(bx + 3, by - alto * 0.5, bx - 2, by - alto);
        x.stroke();
        for (const a of [-2.4, -1.9, -1.2, -0.7]) {
          x.beginPath();
          x.moveTo(bx - 2, by - alto);
          x.quadraticCurveTo(bx - 2 + Math.cos(a) * 12, by - alto + Math.sin(a) * 8 - 3, bx - 2 + Math.cos(a) * 20, by - alto + Math.sin(a) * 6 + 7);
          x.stroke();
        }
      }
    }),
  );
  const olas1 = guardar(hornearOlas(w * 1.1, h * 0.2, dp, 1, '#25448c', '#7fa4e8', 3, h * 0.012));
  const olas2 = guardar(hornearOlas(w * 0.9, h * 0.26, dp, 2, '#1a3678', '#6a92da', 5, h * 0.018));
  const olas3 = guardar(hornearOlas(w * 1.3, h * 0.34, dp, 1, '#14306c', '#5a84cc', 7, h * 0.026, 2.2));
  const olasF = guardar(hornearOlas(w * 0.8, h * 0.22, dp, 2, '#102a62', '#4a74bc', 11, h * 0.02, 2.4));
  // The caravan, and the octopus.
  const vc = crearVehiculoComic(h * 0.3, dp);
  guardar(vc.img);
  const cx = w * 0.34;
  const aguaY = h * 0.84;
  const suelo = aguaY + vc.base * 0.12;
  const r = h * 0.2;
  const pulpo = pintarPulpo(r, dp);
  guardar(pulpo.cabeza);
  pulpo.tentaculo.forEach(guardar);
  const gota = pintarGota(h * 0.012, dp, '#d6ecf8');
  guardar(gota.img);
  const hx = w * 0.8;
  const hy = h * 0.44;
  const espuma = guardar(
    (() => {
      const [c, x] = lienzo(h * 0.28, h * 0.09, dp);
      x.translate(h * 0.14, h * 0.045);
      for (const [dx, dy, rr] of [[-0.9, 0.2, 0.5], [-0.3, -0.2, 0.7], [0.4, 0, 0.6], [1, 0.25, 0.4]]) {
        x.beginPath();
        x.arc(dx * h * 0.05, dy * h * 0.03, rr * h * 0.035, 0, Math.PI * 2);
        rellenar(x, '#f0faff', 1.4);
      }
      return c;
    })(),
  );
  const estrellas = guardar(
    (() => {
      const [c, x] = lienzo(12, 12, dp);
      x.translate(6, 6);
      estrella(x, 0, 0, 5.6, 1.2, 4, Math.PI / 4);
      x.fillStyle = '#fff6d8';
      x.fill();
      return c;
    })(),
  );

  return {
    ventana: ventanaDe(vc, cx, suelo, w, h),
    pintar(x, t) {
      const zoom = 1 + Math.min(1, t / 11) * 0.05;
      const bobs = Math.sin(t * 1.9) * h * 0.012 + Math.sin(t * 3.1) * h * 0.004;
      const sacudida = t > T_PLAF ? Math.exp(-(t - T_PLAF) * 2.2) : 0;
      const ang = Math.sin(t * 1.5) * 0.02 + Math.sin((t - T_PLAF) * 11) * 0.05 * sacudida;
      const ax = cx - vc.vw / 2 + vc.ventana[0];
      const ay = suelo - vc.base - vc.tope + vc.ventana[1];
      x.save();
      x.translate(ax, ay);
      x.scale(zoom, zoom);
      x.translate(-ax, -ay);
      x.drawImage(cielo, 0, 0, w, h);
      for (let k = 0; k < 8; k++) {
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.8 + k * 0.17) + k * 1.3));
        x.globalAlpha = a;
        x.drawImage(estrellas, ((k * 211 + 70) % w), h * (0.05 + ((k * 37) % 30) / 100), 12, 12);
      }
      x.globalAlpha = 1;
      x.drawImage(luna, w * 0.78 - luS / 2, h * 0.22 - luS / 2, luS, luS);
      dibujarTile(x, nubes, t * 4, 0, w);
      dibujarTile(x, isla, t * 3, wl - h * 0.2 + 1, w);
      x.drawImage(mar, 0, 0, w, h);
      dibujarTile(x, olas1, t * 14, wl - h * 0.06, w);
      // The octopus: the head, with three tentacles waving and a fourth that slaps the water by the caravan.
      const respira = Math.sin(t * 1.4) * 0.012;
      const brazo = (n: number, rx: number, ry: number, th: number) => {
        x.save();
        x.translate(rx, ry);
        x.rotate(th);
        x.drawImage(pulpo.tentaculo[n], -pulpo.raiz[0], -pulpo.raiz[1], pulpo.tw, pulpo.th);
        x.restore();
      };
      brazo(1, hx + r * 0.95, hy + r * 0.75, Math.PI + 0.55 + Math.sin(t * 1.3) * 0.12);
      brazo(2, hx + r * 1.25, hy + r * 0.8, Math.PI - 0.35 + Math.sin(t * 1.1 + 2) * 0.1);
      x.save();
      x.translate(hx, hy + r * 0.1);
      x.scale(1 + respira, 1 - respira);
      x.drawImage(pulpo.cabeza, -pulpo.cw / 2, -pulpo.ch * 0.55, pulpo.cw, pulpo.ch);
      x.restore();
      // The slapping arm (root on the head's left).
      let th = 2.7 + Math.sin(t * 1.2) * 0.1;
      const aviso = suave((t - (T_PLAF - 1.2)) / 1.0);
      if (t < T_PLAF) th = lerp(th, 3.15, aviso);
      else {
        const caida = suave((t - T_PLAF) / 0.1);
        const vuelta = suave((t - T_PLAF - 1.1) / 1.6);
        th = lerp(lerp(3.15, 1.52, caida), 2.7, vuelta);
      }
      brazo(0, hx - r * 0.95, hy + r * 0.62, th);
      dibujarTile(x, olas2, t * 30, wl + h * 0.02, w);
      // The caravan floats: bobbing, leaning, with its wheels turning slowly like paddles.
      x.save();
      x.beginPath();
      x.rect(0, 0, w, aguaY + bobs);
      x.clip();
      dibujarVehiculoComic(x, vc, cx, suelo, t, { vel: 70, dy: bobs - h * 0.01, inclina: ang });
      x.restore();
      // Foam at the caravan's waterline and its wake behind.
      for (let k = 0; k < 6; k++) {
        const u = ((t * 0.5 + k / 6) % 1);
        x.globalAlpha = (1 - u) * 0.9;
        x.drawImage(espuma, cx - vc.vw * 0.5 - u * w * 0.14, aguaY + bobs - h * 0.045 + (k % 2) * 3, espuma.width / dp, espuma.height / dp);
      }
      x.globalAlpha = 1;
      x.drawImage(espuma, cx + vc.vw * 0.5 - h * 0.1, aguaY + bobs - h * 0.05, h * 0.2, h * 0.065);
      dibujarTile(x, olas3, t * 60, aguaY - h * 0.1 + bobs * 0.6, w);
      // The splash of the slap: a ring of foam and drops thrown up.
      if (t > T_PLAF) {
        const s = t - T_PLAF;
        const sx = hx - r * 0.95 - Math.sin(1.52) * pulpo.th * 0.9;
        const sy = hy + r * 0.62 + Math.cos(1.52) * pulpo.th * 0.9;
        const rg = suave(s / 0.9);
        x.globalAlpha = Math.max(0, 1 - s / 1.1);
        x.strokeStyle = '#e8f6ff';
        x.lineWidth = 3;
        x.beginPath();
        x.ellipse(sx, sy + 6, h * 0.04 + rg * h * 0.14, h * 0.012 + rg * h * 0.03, 0, 0, Math.PI * 2);
        x.stroke();
        x.globalAlpha = 1;
        const rd = azar(12);
        for (let k = 0; k < 14; k++) {
          const vx = (rd() - 0.5) * 240;
          const vy = -(160 + rd() * 220);
          const px = sx + vx * s * 0.8;
          const py = sy + vy * s + 520 * s * s;
          if (py > sy + 12 || s > 1.6) continue;
          const e = 0.6 + rd() * 0.7;
          x.drawImage(gota.img, px - gota.cx * e, py - gota.cy * e, gota.w * e, gota.h * e);
        }
      }
      dibujarTile(x, olasF, t * 120, h * 0.9, w);
      x.restore();
    },
    liberar() {
      soltar(...liberables);
    },
  };
};

/** Kilometre 4,000: a thin strip of open sea at dawn, the caravan afloat on the left, a signpost with a gull drifting past. */
export const escenaKilometro: Constructor = (m) => {
  const { w, h, dp } = m;
  const wl = h * 0.5;
  const liberables: Array<Tile | HTMLCanvasElement> = [];
  const guardar = <T extends Tile | HTMLCanvasElement>(t: T) => (liberables.push(t), t);
  const [fondo, fx] = lienzo(w, h, dp);
  fx.fillStyle = vertical(fx, 0, wl, [0, '#5a6ab4'], [0.55, '#e88aa0'], [1, '#ffcf8a']);
  fx.fillRect(0, 0, w, wl + 2);
  fx.fillStyle = vertical(fx, wl, h, [0, '#f2a898'], [0.25, '#4a8ab8'], [1, '#1c4a88']);
  fx.fillRect(0, wl, w, h - wl);
  // The sun, half out of the sea, with its path of light.
  const sx = w * 0.8;
  fx.save();
  fx.beginPath();
  fx.rect(0, 0, w, wl);
  fx.clip();
  const g = fx.createRadialGradient(sx, wl, h * 0.05, sx, wl, h * 0.9);
  g.addColorStop(0, 'rgba(255,230,160,0.8)');
  g.addColorStop(1, 'rgba(255,200,120,0)');
  fx.fillStyle = g;
  fx.fillRect(0, 0, w, h);
  fx.beginPath();
  fx.arc(sx, wl + h * 0.02, h * 0.24, 0, Math.PI * 2);
  rellenar(fx, '#fff0b8', 2.4);
  trama(fx, sx - h * 0.3, wl - h * 0.2, sx + h * 0.3, wl + h * 0.1, 'rgba(240,140,60,0.5)', (_a, b) => (b - wl + h * 0.2) / (h * 0.3), 4, 1.4);
  fx.restore();
  for (let k = 0; k < 7; k++) {
    fx.fillStyle = `rgba(255,236,190,${0.7 - k * 0.08})`;
    fx.beginPath();
    fx.roundRect(sx - (20 + k * 12) / 2, wl + 4 + k * h * 0.07, 20 + k * 12, 2.2, 1.1);
    fx.fill();
  }
  guardar(fondo);
  const nubes = guardar(
    hornearTile(w * 1.3, wl, dp, (x) => {
      const r = azar(31);
      for (let k = 0; k < 4; k++) {
        const cx = ((k + 0.5) / 4) * w * 1.3;
        envolver(w * 1.3, cx, w * 0.2, (px) => {
          x.save();
          x.translate(px, h * (0.1 + r() * 0.2));
          x.scale(2.6, 0.45);
          nube(x, 0, 0, h * (0.1 + r() * 0.05), '#ffc4b0', '#e08090', 1.4);
          x.restore();
        });
      }
    }),
  );
  const olas1 = guardar(hornearOlas(w * 1.1, h * 0.5, dp, 1, '#3a78b4', '#c8ecf8', 3, h * 0.02, 1.6));
  const olas2 = guardar(hornearOlas(w * 0.9, h * 0.6, dp, 2, '#2a64a4', '#a8d8f0', 5, h * 0.03, 1.8));
  const olasF = guardar(hornearOlas(w * 0.8, h * 0.5, dp, 2, '#1c4c8c', '#88c0e8', 9, h * 0.034, 2));
  const vc = crearVehiculoComic(h * 0.43, dp);
  guardar(vc.img);
  const cx = w * 0.15;
  const aguaY = h * 0.82;
  const suelo = aguaY + vc.base * 0.12;
  // The signpost: a barrel for a float, a post, and a white board with its red letters; a gull stands on top.
  const km = texto('safari.cartel.km').toLocaleUpperCase('es');
  const sw = h * 1.5;
  const sh = h * 1.0;
  const [seno, sx2] = lienzo(sw, sh, dp);
  guardar(seno);
  {
    const x = sx2;
    x.lineJoin = 'round';
    x.lineCap = 'round';
    x.strokeStyle = TINTA;
    x.lineWidth = h * 0.1;
    x.beginPath();
    x.moveTo(sw * 0.5, sh * 0.96);
    x.lineTo(sw * 0.5, sh * 0.3);
    x.stroke();
    x.strokeStyle = '#8a5a34';
    x.lineWidth = h * 0.062;
    x.stroke();
    x.beginPath();
    x.roundRect(sw * 0.5 - h * 0.34, sh * 0.78, h * 0.68, h * 0.2, h * 0.07);
    rellenar(x, '#c8403a', 2);
    x.strokeStyle = 'rgba(255,255,255,0.7)';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(sw * 0.5 - h * 0.3, sh * 0.85);
    x.lineTo(sw * 0.5 + h * 0.3, sh * 0.85);
    x.stroke();
    x.beginPath();
    x.roundRect(sw * 0.5 - h * 0.46, sh * 0.2, h * 0.92, h * 0.34, 4);
    rellenar(x, '#f6ecd4', 2.4);
    x.fillStyle = '#c8402e';
    x.font = `800 ${Math.round(h * 0.25)}px ${FUENTE}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(km, sw * 0.5, sh * 0.375, h * 0.84);
  }
  // A gull, standing, and its wings for the flight.
  const gaviota = (alas: boolean) => {
    const [c, x] = lienzo(h * 0.5, h * 0.4, dp);
    x.lineJoin = 'round';
    x.lineCap = 'round';
    const gx = h * 0.25;
    const gy = h * 0.3;
    x.beginPath();
    x.ellipse(gx, gy - h * 0.06, h * 0.13, h * 0.08, -0.15, 0, Math.PI * 2);
    rellenar(x, '#f6f0e6', 1.8);
    x.beginPath();
    x.arc(gx + h * 0.12, gy - h * 0.14, h * 0.045, 0, Math.PI * 2);
    rellenar(x, '#f6f0e6', 1.8);
    x.beginPath();
    x.moveTo(gx + h * 0.16, gy - h * 0.15);
    x.lineTo(gx + h * 0.23, gy - h * 0.13);
    x.lineTo(gx + h * 0.16, gy - h * 0.12);
    rellenar(x, '#f0a43a', 1.4);
    elipse(x, gx + h * 0.125, gy - h * 0.15, 1.5, 1.5, TINTA);
    if (alas) {
      x.beginPath();
      x.moveTo(gx - h * 0.02, gy - h * 0.1);
      x.quadraticCurveTo(gx - h * 0.1, gy - h * 0.34, gx - h * 0.22, gy - h * 0.3);
      x.quadraticCurveTo(gx - h * 0.1, gy - h * 0.2, gx + h * 0.06, gy - h * 0.08);
      rellenar(x, '#cfd6e0', 1.6);
    } else {
      x.beginPath();
      x.moveTo(gx - h * 0.1, gy - h * 0.08);
      x.quadraticCurveTo(gx - h * 0.02, gy - h * 0.0, gx + h * 0.08, gy - h * 0.07);
      x.quadraticCurveTo(gx, gy - h * 0.14, gx - h * 0.1, gy - h * 0.08);
      rellenar(x, '#cfd6e0', 1.6);
    }
    x.strokeStyle = '#d08a3a';
    x.lineWidth = 1.6;
    x.beginPath();
    x.moveTo(gx - h * 0.02, gy - h * 0.0);
    x.lineTo(gx - h * 0.02, gy + h * 0.06);
    x.moveTo(gx + h * 0.04, gy - h * 0.0);
    x.lineTo(gx + h * 0.04, gy + h * 0.06);
    x.stroke();
    return guardar(c);
  };
  const gaviotas = [gaviota(false), gaviota(true)];

  return {
    ventana: ventanaDe(vc, cx, suelo, w, h),
    pintar(x, t) {
      const bobs = Math.sin(t * 1.8) * h * 0.02 + Math.sin(t * 3.3) * h * 0.006;
      x.drawImage(fondo, 0, 0, w, h);
      dibujarTile(x, nubes, t * 5, 0, w);
      dibujarTile(x, olas1, t * 12, wl - h * 0.1, w);
      dibujarTile(x, olas2, t * 28, wl + h * 0.05, w);
      // The signpost drifts by.
      const sxp = w * 1.2 - t * 85;
      if (sxp > -sw && sxp < w + sw) {
        const bs = Math.sin(t * 2.4 + 1) * h * 0.03;
        x.save();
        x.translate(sxp, aguaY - sh + h * 0.22 + bs);
        x.rotate(Math.sin(t * 1.7) * 0.04);
        x.drawImage(seno, -sw / 2, 0, sw, sh);
        // The gull on top of it, hopping now and then.
        const salto = Math.max(0, Math.sin(t * 2.2)) > 0.96 ? h * 0.06 : 0;
        x.drawImage(gaviotas[salto ? 1 : 0], -h * 0.25, sh * 0.2 - h * 0.34 - salto, h * 0.5, h * 0.4);
        x.restore();
      }
      x.save();
      x.beginPath();
      x.rect(0, 0, w, aguaY + bobs);
      x.clip();
      dibujarVehiculoComic(x, vc, cx, suelo, t, { vel: 60, dy: bobs - h * 0.015, inclina: Math.sin(t * 1.4) * 0.015 });
      x.restore();
      dibujarTile(x, olas2, t * 46 + 200, aguaY - h * 0.05 + bobs * 0.6, w);
      // A gull flying across.
      const gxp = (((t * 40) % (w + 120)) - 60);
      x.drawImage(gaviotas[Math.floor(t * 4) % 2], gxp, h * 0.1 + Math.sin(t * 2) * 5, h * 0.36, h * 0.29);
      dibujarTile(x, olasF, t * 90, h * 0.93, w);
    },
    liberar() {
      soltar(...liberables);
    },
  };
};
