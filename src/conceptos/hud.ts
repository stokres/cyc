// The interface of «Una más», painted on the same canvas: the jar's sips, the skills, the boss's life, the notices, the banners, the talk box with
// the speaker's portrait, the skill card and the end card. Plain fills and text, with the gold-on-smoked-glass look of the rest of the game
// (docs/ESTILO.md I1). Text lives in textos/conceptos.md; nothing is written here.
import { texto } from '../juego/textos';
import type { Arte } from './arte';
import type { Habilidad } from './datos';
import type { Mundo } from './mundo';

const DORADO = '#f2c14e';
const CRISTAL = 'rgba(16,8,38,0.78)';
const TITULO = "'Graduate', 'Alegreya Sans', serif";
const CUERPO = "'Alegreya Sans', sans-serif";

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 16, borde = DORADO) {
  ctx.fillStyle = CRISTAL;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = borde;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,200,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 4, y + 4, w - 8, h - 8, r - 3);
  ctx.stroke();
}

/** Breaks a text into lines that fit `ancho`. */
export function partir(ctx: CanvasRenderingContext2D, t: string, ancho: number): string[] {
  const out: string[] = [];
  let linea = '';
  for (const palabra of t.split(' ')) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > ancho && linea) {
      out.push(linea);
      linea = palabra;
    } else linea = prueba;
  }
  if (linea) out.push(linea);
  return out;
}

function sombreado(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, col: string, sombra = 'rgba(10,0,30,0.85)') {
  ctx.fillStyle = sombra;
  ctx.fillText(t, x + 2, y + 2);
  ctx.fillStyle = col;
  ctx.fillText(t, x, y);
}

const ICONO: Record<Habilidad, 'iconoCierzo' | 'iconoTeclazo' | 'iconoPared'> = { cierzo: 'iconoCierzo', teclazo: 'iconoTeclazo', pared: 'iconoPared' };

/** Everything that sits over the game: sips, skills, boss bar, notices, banners. */
export function dibujarHud(ctx: CanvasRenderingContext2D, m: Mundo, arte: Arte, vw: number, vh: number, t: number) {
  const j = m.j;
  const P = arte.props;
  // The jar's sips, top left.
  const dx = 42;
  const x0 = 20;
  const y0 = 12;
  panel(ctx, x0 - 8, y0 - 4, m.prog.vidaMax * dx + 14, 62, 14);
  for (let i = 0; i < m.prog.vidaMax; i++) {
    const lleno = i < j.vida;
    const s = lleno ? P.jarraLlena : P.jarraVacia;
    const bote = lleno && j.vida === 1 ? Math.sin(t * 9) * 1.5 : 0;
    ctx.drawImage(s.c, x0 + i * dx + 14 + s.x, y0 + 50 + s.y + bote, s.w, s.h);
  }
  // The skills earned.
  let k = 0;
  for (const h of m.habilidades()) {
    const s = P[ICONO[h]];
    const w = 34;
    ctx.drawImage(s.c, x0 + k * (w + 8), y0 + 66, w, w);
    k++;
  }
  // The boss.
  const b = m.jefe;
  if (b && m.pelea === 1 && !b.muerto) {
    const w = Math.min(460, vw - 420);
    const x = (vw - w) / 2;
    const y = vh - 46;
    panel(ctx, x - 14, y - 32, w + 28, 58, 12, '#ff7a6a');
    ctx.font = `700 18px ${TITULO}`;
    ctx.textAlign = 'center';
    sombreado(ctx, texto('jefe.gran'), vw / 2, y - 10, '#ffe9a8');
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, w, 12);
    const k2 = Math.max(0, b.hp / b.hpMax);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#ff5a3a');
    g.addColorStop(1, '#ffcf4a');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * k2, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, y, w * k2, 3);
    ctx.textAlign = 'left';
  }
  // Notices.
  ctx.textAlign = 'center';
  ctx.font = `700 20px ${CUERPO}`;
  let ay = 92;
  for (const a of m.avisos) {
    const al = Math.min(1, a.t * 6, (a.dur - a.t) * 3);
    ctx.globalAlpha = al;
    const w = ctx.measureText(a.texto).width + 40;
    panel(ctx, vw / 2 - w / 2, ay - 22, w, 36, 18);
    sombreado(ctx, a.texto, vw / 2, ay + 2, '#fff6e0');
    ay += 42;
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
  // Zone title.
  if (m.banner) {
    const b2 = m.banner;
    const al = Math.min(1, b2.t * 2.2, (3.4 - b2.t) * 2.2);
    ctx.globalAlpha = Math.max(0, al);
    ctx.textAlign = 'center';
    ctx.font = `700 44px ${TITULO}`;
    const y = vh * 0.3 - (1 - Math.min(1, b2.t * 2)) * -10;
    sombreado(ctx, b2.titulo, vw / 2, y, '#ffe9a8');
    ctx.font = `600 22px ${CUERPO}`;
    sombreado(ctx, b2.sub, vw / 2, y + 34, '#fff6e0');
    const w = ctx.measureText(b2.titulo).width;
    ctx.strokeStyle = DORADO;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(vw / 2 - 150, y + 52);
    ctx.lineTo(vw / 2 + 150, y + 52);
    ctx.stroke();
    void w;
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
  if (m.bannerJefe) {
    const b2 = m.bannerJefe;
    const al = Math.min(1, b2.t * 4, (3 - b2.t) * 3);
    ctx.globalAlpha = Math.max(0, al);
    ctx.textAlign = 'center';
    const desliza = (1 - Math.min(1, b2.t * 3)) * 120;
    ctx.fillStyle = 'rgba(40,0,20,0.7)';
    ctx.fillRect(0, vh * 0.3 - 40, vw, 112);
    ctx.fillStyle = '#ff7a6a';
    ctx.fillRect(0, vh * 0.3 - 40, vw, 3);
    ctx.fillRect(0, vh * 0.3 + 69, vw, 3);
    ctx.font = `700 50px ${TITULO}`;
    sombreado(ctx, b2.titulo, vw / 2 + desliza, vh * 0.3 + 14, '#ffe9a8');
    ctx.font = `600 22px ${CUERPO}`;
    sombreado(ctx, b2.sub, vw / 2 - desliza, vh * 0.3 + 48, '#fff6e0');
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}

// ---------------------------------------------------------------- the talk box

/** The portrait to show for a speaker, if any. */
function retrato(arte: Arte, quien: string | null) {
  if (quien === 'fran') return arte.fran.retrato[0];
  if (quien === 'guille') return arte.guille.retrato[0];
  if (quien === 'chuchi') return arte.chuchi.retrato[0];
  if (quien === 'pablo') return arte.pablo.retrato[0];
  return null;
}

export function dibujarDialogo(ctx: CanvasRenderingContext2D, m: Mundo, arte: Arte, vw: number, vh: number, t: number) {
  const dl = m.dialogo!;
  const l = dl.lineas[dl.i];
  const ancho = Math.min(840, vw - 60);
  const x = (vw - ancho) / 2;
  const alto = 128;
  const y = vh - alto - 16;
  const re = retrato(arte, l.quien);
  const izq = re ? 128 : 26;
  // Smoked glass with a gold rim; the portrait sticks out of the top.
  panel(ctx, x, y, ancho, alto, 18);
  if (re) {
    const px = x + 16;
    const py = y - 30;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, 98, 118, 16);
    const g = ctx.createLinearGradient(px, py, px, py + 118);
    g.addColorStop(0, '#5a2a8a');
    g.addColorStop(1, '#2a1050');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    const s = Math.min(92 / re.c.width, 112 / re.c.height);
    ctx.drawImage(re.c, px + 49 - (re.c.width * s) / 2, py + 62 - (re.c.height * s) / 2, re.c.width * s, re.c.height * s);
    ctx.restore();
    ctx.strokeStyle = DORADO;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, 98, 118, 16);
    ctx.stroke();
  }
  ctx.textAlign = 'left';
  if (l.quien) {
    ctx.font = `700 19px ${TITULO}`;
    sombreado(ctx, texto(`nombre.${l.quien}`), x + izq, y + 30, DORADO);
  }
  ctx.font = `500 21px ${CUERPO}`;
  const lineas = partir(ctx, l.texto, ancho - izq - 26);
  let quedan = Math.floor(dl.c);
  const y1 = y + (l.quien ? 58 : 40);
  for (let i = 0; i < lineas.length; i++) {
    const trozo = lineas[i].slice(0, Math.max(0, quedan));
    quedan -= lineas[i].length + 1;
    ctx.fillStyle = l.quien ? '#fff6e0' : '#d8cdf8';
    ctx.fillText(trozo, x + izq, y1 + i * 27);
    if (quedan <= 0) break;
  }
  if (dl.c >= l.texto.length) {
    ctx.fillStyle = DORADO;
    const by = y + alto - 20 + Math.sin(t * 6) * 3;
    ctx.beginPath();
    ctx.moveTo(x + ancho - 36, by - 6);
    ctx.lineTo(x + ancho - 22, by - 6);
    ctx.lineTo(x + ancho - 29, by + 4);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the skill card and the end card

function velo(ctx: CanvasRenderingContext2D, vw: number, vh: number, a: number) {
  ctx.fillStyle = `rgba(8,2,24,${a})`;
  ctx.fillRect(0, 0, vw, vh);
}

export function dibujarCarta(ctx: CanvasRenderingContext2D, m: Mundo, arte: Arte, vw: number, vh: number, t: number) {
  const c = m.carta!;
  const a = Math.min(1, c.t * 3);
  velo(ctx, vw, vh, 0.6 * a);
  const w = Math.min(560, vw - 60);
  const h = 250;
  const x = (vw - w) / 2;
  const y = (vh - h) / 2 - 10 + (1 - a) * 30;
  ctx.globalAlpha = a;
  panel(ctx, x, y, w, h, 22);
  const s = arte.props[ICONO[c.hab]];
  const R = 1.9 + Math.sin(t * 3) * 0.05;
  const iw = s.w * R;
  // A halo of light behind the icon.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a * (0.55 + 0.2 * Math.sin(t * 4));
  const gl = arte.brillos.turquesa;
  ctx.drawImage(gl, vw / 2 - iw * 1.1, y + 26 - iw * 0.2, iw * 2.2, iw * 2.2);
  ctx.restore();
  ctx.globalAlpha = a;
  ctx.drawImage(s.c, vw / 2 - iw / 2, y + 24, iw, iw);
  ctx.textAlign = 'center';
  ctx.font = `600 18px ${CUERPO}`;
  sombreado(ctx, texto('habilidad.nueva'), vw / 2, y + 24 + iw + 18, '#9ff0ec');
  ctx.font = `700 34px ${TITULO}`;
  sombreado(ctx, texto(`habilidad.${c.hab}`), vw / 2, y + 24 + iw + 54, '#ffe9a8');
  ctx.font = `500 20px ${CUERPO}`;
  const ls = partir(ctx, texto(`habilidad.${c.hab}.texto`), w - 60);
  ls.forEach((l, i) => sombreado(ctx, l, vw / 2, y + 24 + iw + 82 + i * 24, '#fff6e0'));
  if (c.t > 0.7) {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.font = `600 16px ${CUERPO}`;
    sombreado(ctx, texto('habilidad.nueva.tocar'), vw / 2, y + h - 14, DORADO);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

export function dibujarFin(ctx: CanvasRenderingContext2D, m: Mundo, vw: number, vh: number, t: number) {
  const a = Math.min(1, m.tEstado * 1.5);
  velo(ctx, vw, vh, 0.78 * a);
  const w = Math.min(600, vw - 60);
  const h = 230;
  const x = (vw - w) / 2;
  const y = (vh - h) / 2;
  ctx.globalAlpha = a;
  panel(ctx, x, y, w, h, 22);
  ctx.textAlign = 'center';
  ctx.font = `700 30px ${TITULO}`;
  sombreado(ctx, texto('fin.titulo'), vw / 2, y + 56, '#ffe9a8');
  ctx.font = `500 21px ${CUERPO}`;
  partir(ctx, texto('fin.texto'), w - 70).forEach((l, i) => sombreado(ctx, l, vw / 2, y + 100 + i * 27, '#fff6e0'));
  if (m.tEstado > 0.8) {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.font = `700 18px ${CUERPO}`;
    sombreado(ctx, texto('fin.boton'), vw / 2, y + h - 22, DORADO);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/** A line over the screen while the art bakes. */
export function dibujarCarga(ctx: CanvasRenderingContext2D, vw: number, vh: number, f: number, t: number) {
  ctx.fillStyle = '#0d0526';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.font = `600 22px ${CUERPO}`;
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 4);
  sombreado(ctx, texto('cargando'), vw / 2, vh / 2 - 14, '#fff6e0');
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#3a2858';
  ctx.fillRect(vw / 2 - 120, vh / 2 + 6, 240, 8);
  ctx.fillStyle = DORADO;
  ctx.fillRect(vw / 2 - 119, vh / 2 + 7, 238 * f, 6);
  ctx.textAlign = 'left';
}
