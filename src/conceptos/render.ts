// Drawing «Una más»: one canvas, a fixed view height of 540 game units and a width that follows the screen. Everything on it is a bitmap baked
// once (the background layers, the room's tiles, the characters' frames, the sprites; docs/ESTILO.md T5/T6) and a frame is a few dozen drawImage
// calls plus the particles: no SVG, no gradients built per frame, no filters. The camera is rounded to whole device pixels so nothing shimmers.
import { texto } from '../juego/textos';
import { ESCALA, type Arte, type Sprite } from './arte';
import { TILE } from './datos';
import type { Enem } from './enemigos';
import { sueloEn } from './fisica';
import { dibujarCapas } from './fondos';
import { hornearPlataforma, TROZO, type PlatBmp } from './nivel';
import { dibujarCarta, dibujarDialogo, dibujarFin, dibujarHud, partir } from './hud';
import { VISTA_ALTO, ZOOM, type Mundo, type Plat } from './mundo';
import type { Cuadro } from './rig';

/** Largest canvas height in device pixels (the phone's GPU does the rest by scaling it up). */
const TOPE_PX = 540;

interface Mota {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  f: number;
}

export class Pintor {
  readonly ctx: CanvasRenderingContext2D;
  /** Device pixels per game unit. */
  esc = 1;
  vw = 960;
  readonly vh = 540;
  /** The world's view in world units (the screen's divided by the zoom). */
  get vwM() {
    return this.vw / ZOOM;
  }
  readonly vhM = VISTA_ALTO;
  private vineta: HTMLCanvasElement;
  private vinetaRoja: HTMLCanvasElement;
  private motas: Mota[] = [];
  private tableros = new Map<string, HTMLCanvasElement>();
  private plataformas = new Map<string, PlatBmp>();
  private burbujas = new Map<string, HTMLCanvasElement>();
  tactil = matchMedia('(pointer: coarse)').matches;

  constructor(
    readonly lienzo: HTMLCanvasElement,
    readonly arte: Arte,
    readonly m: Mundo,
  ) {
    this.ctx = lienzo.getContext('2d', { alpha: false })!;
    this.vineta = this.crearVineta('rgba(6,0,22,0.0)', 'rgba(6,0,22,0.62)');
    this.vinetaRoja = this.crearVineta('rgba(120,0,10,0)', 'rgba(200,10,30,0.8)');
    const r = (s: number) => {
      let x = s;
      return () => ((x = (x * 16807) % 2147483647) / 2147483647);
    };
    const a = r(99);
    for (let i = 0; i < 14; i++) this.motas.push({ x: a() * 1400, y: a() * 540, vx: 6 + a() * 14, vy: -(3 + a() * 12), s: 2 + a() * 5, f: a() * 6 });
  }

  /** A small image stretched over the screen: the dark corners (and, in the same pass, the tint of the grade). */
  private crearVineta(centro: string, borde: string, tinte = '') {
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 180;
    const x = c.getContext('2d')!;
    if (tinte) {
      x.fillStyle = tinte;
      x.fillRect(0, 0, 320, 180);
    }
    const g = x.createRadialGradient(160, 90, 40, 160, 90, 190);
    g.addColorStop(0, centro);
    g.addColorStop(0.55, centro);
    g.addColorStop(1, borde);
    x.fillStyle = g;
    x.fillRect(0, 0, 320, 180);
    return c;
  }

  /** The vignette is clear in the middle, so only its four edge bands are blitted (a fraction of the screen, not all of it). */
  private dibujarVineta(v: HTMLCanvasElement) {
    const { ctx, vw, vh } = this;
    const fx = 0.2;
    const fy = 0.24;
    const w = v.width;
    const h = v.height;
    ctx.drawImage(v, 0, 0, w, h * fy, 0, 0, vw, vh * fy);
    ctx.drawImage(v, 0, h * (1 - fy), w, h * fy, 0, vh * (1 - fy), vw, vh * fy);
    ctx.drawImage(v, 0, h * fy, w * fx, h * (1 - 2 * fy), 0, vh * fy, vw * fx, vh * (1 - 2 * fy));
    ctx.drawImage(v, w * (1 - fx), h * fy, w * fx, h * (1 - 2 * fy), vw * (1 - fx), vh * fy, vw * fx, vh * (1 - 2 * fy));
  }

  /** The canvas as big as fits, capped in device pixels; the view keeps its 540 units of height. */
  ajustar(cssW: number, cssH: number, dpr: number) {
    const pxH = Math.min(cssH * dpr, TOPE_PX);
    this.esc = pxH / this.vh;
    const pxW = Math.round(cssW * (pxH / cssH));
    this.lienzo.width = pxW;
    this.lienzo.height = Math.round(pxH);
    this.vw = pxW / this.esc;
    this.m.vista(this.vw / ZOOM);
  }

  // ---------------------------------------------------------------- frames

  private cuadro(f: Cuadro, esc: number, x: number, y: number, flip: boolean, alfa = 1) {
    const ctx = this.ctx;
    const s = esc / f.ppu;
    if (alfa !== 1) ctx.globalAlpha = alfa;
    if (flip) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.drawImage(f.c, -f.ax * s, -f.ay * s, f.c.width * s, f.c.height * s);
      ctx.restore();
    } else ctx.drawImage(f.c, x - f.ax * s, y - f.ay * s, f.c.width * s, f.c.height * s);
    if (alfa !== 1) ctx.globalAlpha = 1;
  }

  private sprite(s: Sprite, x: number, y: number, alfa = 1, escX = 1) {
    const ctx = this.ctx;
    if (alfa !== 1) ctx.globalAlpha = alfa;
    ctx.drawImage(s.c, x + s.x * escX, y + s.y, s.w * escX, s.h);
    if (alfa !== 1) ctx.globalAlpha = 1;
  }

  private frameFran(): Cuadro {
    const m = this.m;
    const a = m.arte.fran;
    const j = m.j;
    if (m.estado === 'muerte') return a.dano[0];
    if (j.aturdido > 0) return a.dano[0];
    if (j.atq >= 0) return a.ataque[j.atq < 0.06 ? 0 : j.atq < 0.12 ? 1 : j.atq < 0.19 ? 2 : 3];
    if (m.estado === 'carta') return a.celebra[Math.floor(m.reloj * 5) % 2];
    if (j.pared !== 0) return a.baja[0];
    if (!j.suelo) return j.vy < 0 ? a.sube[0] : a.baja[0];
    if (j.aterrizaT > 0) return a.aterriza[0];
    if (Math.abs(j.vx) > 40) return a.correr[Math.floor(j.pasos / 15) % 8];
    return a.idle[Math.floor(m.reloj * 8) % 6];
  }

  private frameEnemigo(e: Enem): Cuadro {
    const A = this.arte;
    if (e.tipo === 'reloj') {
      const r = A.reloj;
      if (e.kx > 0) return r.dano[0];
      if (e.estado === 'gotea') return r.gotea[Math.floor(e.animT * 7) % 2];
      return r.repta[Math.floor(e.animT * 5) % 4];
    }
    const a = e.tipo === 'gran' ? A.gran : A.despertador;
    if (e.kx > 0 || (e.muerto && e.tipo === 'gran')) return a.dano[0];
    switch (e.estado) {
      case 'alerta':
      case 'ring':
        return a.alerta[Math.floor(e.animT * 20) % 2];
      case 'carga':
        return a.carga[Math.floor(e.animT * 16) % 2];
      case 'mareo':
        return a.mareo[Math.floor(e.animT * 6) % 2];
      case 'agacha':
      case 'aterriza':
        return a.agacha[0];
      case 'salta':
        return a.salta[0];
      case 'patrulla':
        return Math.abs(e.vx) > 5 ? a.andar[Math.floor(e.animT * 8) % 4] : a.andar[0];
      default:
        return a.andar[0];
    }
  }

  private sombra(x: number, y: number, w: number) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8,0,24,0.38)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, w, w * 0.16, 0, 0, 6.3);
    ctx.fill();
  }

  /** The y of the first floor under (x, y), for the shadow of something in the air. */
  private sueloBajo(x: number, y: number): number | null {
    const m = this.m;
    for (let f = Math.floor(y / TILE); f < m.rej.rows; f++) {
      if (sueloEn(m.rej, x, f * TILE - 4)) return f * TILE;
    }
    return null;
  }

  private tablero(clave: string): HTMLCanvasElement {
    let c = this.tableros.get(clave);
    if (c) return c;
    const tx = texto(this.tactil ? `${clave}.tactil` : `${clave}.pc`);
    const ok = !tx.startsWith('[');
    const t = ok ? tx : texto(clave);
    c = document.createElement('canvas');
    const k = 2;
    const x = c.getContext('2d')!;
    x.font = `700 ${15 * k}px 'Alegreya Sans', sans-serif`;
    const ls = partir(x, t, 250 * k);
    const w = Math.ceil(Math.max(...ls.map((l) => x.measureText(l).width)) + 28 * k);
    const h = ls.length * 20 * k + 20 * k;
    c.width = w;
    c.height = h;
    x.font = `700 ${15 * k}px 'Alegreya Sans', sans-serif`;
    x.fillStyle = 'rgba(16,8,38,0.82)';
    x.beginPath();
    x.roundRect(2, 2, w - 4, h - 4, 12 * k);
    x.fill();
    x.strokeStyle = '#f2c14e';
    x.lineWidth = 2 * k;
    x.stroke();
    x.fillStyle = '#fff6e0';
    x.textAlign = 'center';
    ls.forEach((l, i) => x.fillText(l, w / 2, 25 * k + i * 20 * k));
    this.tableros.set(clave, c);
    return c;
  }

  // ---------------------------------------------------------------- the world

  dibujar(t: number) {
    const { ctx, m, arte } = this;
    const { esc, vw, vh } = this;
    const fx = m.fx;
    ctx.setTransform(esc, 0, 0, esc, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const fondo = m.fondo;
    if (!fondo || !m.nivel) {
      ctx.fillStyle = '#0d0526';
      ctx.fillRect(0, 0, vw, vh);
      return;
    }
    // Shake and the punch of the camera.
    const tem = fx.temblor;
    const sx = tem > 0.2 ? (Math.random() - 0.5) * 2 * tem : 0;
    const sy = tem > 0.2 ? (Math.random() - 0.5) * 2 * tem : 0;
    const ez = esc * ZOOM;
    const camX = Math.round((m.cam.x + sx) * ez) / ez;
    const camY = Math.round((m.cam.y + sy) * ez) / ez;
    ctx.save();
    if (fx.zoom > 0.01) {
      const z = 1 + 0.028 * fx.zoom;
      ctx.translate(vw / 2, vh / 2);
      ctx.scale(z, z);
      ctx.translate(-vw / 2, -vh / 2);
    }
    ctx.scale(ZOOM, ZOOM);
    dibujarCapas(ctx, fondo, camX, camY, this.vwM, this.vhM, m.H, false);
    // A drifting haze between the walls and the game.
    this.motasAtras(t, camX, fondo.motas);

    ctx.save();
    ctx.translate(-camX, -camY);
    this.mundo(t, camX, camY);
    ctx.restore();

    dibujarCapas(ctx, fondo, camX, camY, this.vwM, this.vhM, m.H, true);
    ctx.restore();
    this.dibujarVineta(this.vineta);

    if (fx.dano > 0.02) {
      ctx.globalAlpha = fx.dano * 0.9;
      this.dibujarVineta(this.vinetaRoja);
      ctx.globalAlpha = 1;
    }
    if (fx.flash > 0.01) {
      ctx.globalAlpha = Math.min(1, fx.flash);
      ctx.fillStyle = fx.flashCol;
      ctx.fillRect(0, 0, vw, vh);
      ctx.globalAlpha = 1;
    }
    if (m.fade > 0.01) {
      ctx.fillStyle = `rgba(6,0,20,${Math.min(1, m.fade)})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    // The death text sits over the black.
    if (m.estado === 'muerte' && m.tMuerte > 0.9) {
      const a = Math.min(1, (m.tMuerte - 0.9) * 2) * (m.tMuerte > 1.7 ? Math.max(0, 1 - (m.tMuerte - 1.7) * 5) : 1);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = "700 48px 'Graduate', serif";
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(texto('muerte.texto'), vw / 2, vh / 2 + 14);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
    if (m.estado !== 'fin') dibujarHud(ctx, m, arte, vw, vh, t);
    if (m.estado === 'dialogo' && m.dialogo) dibujarDialogo(ctx, m, arte, vw, vh, t);
    if (m.estado === 'carta' && m.carta) dibujarCarta(ctx, m, arte, vw, vh, t);
    if (m.estado === 'fin') dibujarFin(ctx, m, vw, vh, t);
  }

  /** Floating motes of light in front of the far layers. */
  private motasAtras(t: number, camX: number, colores: string[]) {
    const { ctx } = this;
    const vw = this.vwM;
    const vh = this.vhM;
    const g = this.arte.brillos;
    ctx.globalCompositeOperation = 'lighter';
    const nombres = colores.length ? ['oro', 'blanco', 'turquesa'] : ['oro'];
    this.motas.forEach((p, i) => {
      const x = (((p.x + p.vx * t - camX * 0.6) % (vw + 80)) + vw + 80) % (vw + 80) - 40;
      const y = (((p.y + p.vy * t + Math.sin(t * 0.7 + p.f) * 18) % (vh + 60)) + vh + 60) % (vh + 60) - 30;
      ctx.globalAlpha = 0.28 + 0.22 * Math.sin(t * 1.6 + p.f * 3);
      const s = p.s * 3;
      ctx.drawImage(g[nombres[i % nombres.length]], x - s, y - s, s * 2, s * 2);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private mundo(t: number, camX: number, camY: number) {
    const { ctx, m, arte } = this;
    const vw = this.vwM;
    const P = arte.props;
    const vh = this.vhM;
    const n = m.nivel!;
    // ---- tiles
    const x0 = Math.max(0, camX);
    const y0 = Math.max(0, camY);
    const x1 = Math.min(m.W, camX + vw);
    const y1 = Math.min(m.H, camY + vh);
    const T4 = TILE * TROZO;
    for (const [fx, fy] of n.trozos) {
      const a = Math.max(fx * T4, x0);
      const b = Math.min((fx + 1) * T4, x1);
      const c0 = Math.max(fy * T4, y0);
      const d0 = Math.min((fy + 1) * T4, y1);
      if (b > a && d0 > c0) ctx.drawImage(n.c, a * n.esc, c0 * n.esc, (b - a) * n.esc, (d0 - c0) * n.esc, a, c0, b - a, d0 - c0);
    }
    // ---- gates shut by a fight
    for (let f = 0; f < m.rej.rows; f++) {
      for (let c = 0; c < m.rej.cols; c++) {
        if (m.rej.g[f][c] !== 'X') continue;
        const x = c * TILE;
        const y = f * TILE;
        const g = ctx.createLinearGradient(x, 0, x + TILE, 0);
        g.addColorStop(0, '#6a1030');
        g.addColorStop(0.5, '#d8384e');
        g.addColorStop(1, '#6a1030');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, TILE, TILE + 1);
        ctx.fillStyle = 'rgba(255,214,120,0.7)';
        ctx.fillRect(x + 10, y, 3, TILE);
        ctx.fillRect(x + TILE - 14, y, 3, TILE);
      }
    }
    const visible = (x: number, ancho = 140) => x > camX - ancho && x < camX + vw + ancho;
    const pulso = 0.8 + 0.2 * Math.sin(t * 2.4);
    // ---- slabs that move or fall
    for (const p of m.plats) if (p.alfa > 0.01 && visible(p.x + p.w / 2, p.w / 2 + 60)) this.plat(p, t);

    // ---- bars
    for (const b of m.barras) {
      if (!visible(b.x, 200)) continue;
      this.sprite(P.barra, b.x, b.y);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.55 + b.brillo * 0.4) * pulso;
      const r = 110 + b.brillo * 60;
      ctx.drawImage(arte.brillos.ambar, b.x + 28 - r, b.y - 64 - r, r * 2, r * 2);
      ctx.globalAlpha = 0.25 * pulso;
      ctx.drawImage(arte.brillos.ambar, b.x - 130, b.y - 40, 260, 70);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // ---- doors
    for (const p of m.puertas) {
      if (!visible(p.x, 200)) continue;
      this.sprite(P.portal, p.x, p.y);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * pulso;
      ctx.drawImage(arte.brillos.oro, p.x - 110, p.y - 190, 220, 220);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // ---- signs
    for (const c of m.carteles) {
      if (!visible(c.x, 200)) continue;
      ctx.fillStyle = '#5a3a6a';
      ctx.fillRect(c.x - 3, c.y - 70, 6, 70);
      const tb = this.tablero(c.clave);
      const k = 0.4;
      const cerca = Math.abs(m.j.x - c.x) < 220;
      ctx.globalAlpha = cerca ? 1 : 0.78;
      ctx.drawImage(tb, c.x - (tb.width * k) / 2, c.y - 70 - tb.height * k - 4, tb.width * k, tb.height * k);
      ctx.globalAlpha = 1;
    }
    // ---- sips
    for (const s of m.sorbos) {
      if (!visible(s.x)) continue;
      const bob = Math.sin(t * 3 + s.x) * 4;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6 * pulso;
      ctx.drawImage(arte.brillos.oro, s.x - 40, s.y - 80 + bob, 80, 80);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      this.sprite(P.sorbo, s.x, s.y - 4 + bob);
    }
    // ---- Guille's flower
    if (m.flor.estado !== 'ninguna' && visible(m.flor.x, 300)) this.flor(t);

    // ---- puddles
    for (const c of m.charcos) {
      if (!visible(c.x)) continue;
      const k = c.w / 144;
      const al = Math.min(1, c.vida * 1.2, (c.vida0 - c.vida) * 4);
      this.sprite(P.charco, c.x, c.y + 3, al, k);
    }
    // ---- enemies
    for (const e of m.enems) {
      if (!visible(e.x, 200)) continue;
      this.enemigo(e, t);
    }
    // ---- Guille, once free and out of the flower: drawn by flor()
    // ---- Fran
    m.fx.dibujarArcos(ctx);
    this.fran(t);
    // ---- shots
    for (const p of m.proy) this.proyectil(p, t);
    // ---- particles and arcs
    m.fx.dibujar(ctx, t);
    // The front petals of the flower go over Guille.
    if (m.flor.estado === 'cerrada' || (m.flor.estado === 'abriendo' && m.flor.t < 0.55)) {
      const f = m.flor;
      const tr = f.estado === 'abriendo' ? Math.sin(f.t * 60) * 2 : 0;
      this.sprite(P.florCerrada, f.x + tr, f.y);
    } else if (m.flor.estado === 'abriendo' || m.flor.estado === 'abierta' || m.flor.estado === 'entrando') {
      this.sprite(P.florAbierta, m.flor.x, m.flor.y);
    }
  }

  private flor(t: number) {
    const { m, arte, ctx } = this;
    const f = m.flor;
    const P = arte.props;
    this.sprite(P.florFondo, f.x, f.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4 + 0.15 * Math.sin(t * 2);
    ctx.drawImage(arte.brillos.magenta, f.x - 150, f.y - 260, 300, 300);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Guille: inside until the petals open, then he hops out beside it, and then he shrinks and dives into Fran's jar (rescued: in the jar for good).
    const G = arte.guille;
    if (f.guille === 'atrapado') {
      const fr = G.atrapado[Math.floor(t * 8) % 4];
      this.cuadro(fr, ESCALA.guille, f.x, f.y - 72, false);
    } else if (f.guille === 'libre' && f.estado === 'entrando') {
      const k = Math.min(1, f.t / 1.05);
      const e = k * k * (3 - 2 * k);
      const [jx, jy] = this.m.posJarra();
      const x0 = f.x + 118;
      const gx = x0 + (jx - x0) * e;
      const gy = f.y + (jy - f.y) * e - Math.sin(Math.PI * k) * 120;
      this.cuadro(G.celebra[Math.floor(t * 10) % 2], ESCALA.guille * (1 - 0.86 * e), gx, gy, jx > x0);
    } else if (f.guille === 'libre') {
      const k = f.estado === 'abierta' ? 1 : Math.min(1, Math.max(0, (f.t - 0.55) / 0.75));
      const e = 1 - (1 - k) * (1 - k);
      const gx = f.x + 118 * e;
      const gy = f.y - 72 + 72 * e - Math.sin(Math.PI * k) * 70;
      const fr = k < 1 ? G.celebra[Math.floor(t * 8) % 2] : G.idle[Math.floor(t * 8) % 6];
      if (k >= 1) this.sombra(gx, f.y, 26);
      this.cuadro(fr, ESCALA.guille, gx, gy, true);
    }
  }

  /** A slab: its baked piece, shaking before it falls. */
  private plat(p: Plat, t: number) {
    const { ctx, m } = this;
    const clave = `${m.sala.zona}|${p.w}|${p.def.tipo}`;
    let b = this.plataformas.get(clave);
    if (!b) {
      b = hornearPlataforma(m.sala.zona, p.w, p.def.tipo);
      this.plataformas.set(clave, b);
    }
    const tiembla = p.estado === 'tiembla' ? Math.sin(t * 90) * 1.8 : 0;
    if (p.alfa < 1) ctx.globalAlpha = p.alfa;
    ctx.drawImage(b.c, p.x - b.ox + tiembla, p.y - b.oy, b.c.width / b.esc, b.c.height / b.esc);
    if (p.alfa < 1) ctx.globalAlpha = 1;
  }

  /** The friends in Fran's jar: their little heads over the foam (they duck inside while he swings), and now and then a remark over his head. */
  private asoman(t: number) {
    const { ctx, m, arte } = this;
    const j = m.j;
    const amigos = m.amigos();
    if (!amigos.length || m.estado === 'muerte' || m.estado === 'fin') return;
    const [jx, jy] = m.posJarra();
    const agacha = j.atq >= 0 ? 1 : 0;
    amigos.forEach((q, i) => {
      const s = arte.asoma[q];
      if (!s) return;
      const off = (i - (amigos.length - 1) / 2) * 15;
      const bota = j.suelo && Math.abs(j.vx) > 40 ? Math.sin(j.pasos * 0.11 + i * 2) * 2.2 : Math.sin(t * 2.2 + i) * 0.8;
      ctx.drawImage(s.c, jx + off + s.x, jy + s.y + bota + agacha * s.h * 0.55, s.w, s.h);
    });
    const b = m.burbuja;
    if (b && m.estado === 'jugando') {
      const img = this.burbuja(b.quien, b.texto);
      const k = 0.5;
      const al = Math.min(1, b.t * 5, (b.dur - b.t) * 4);
      ctx.globalAlpha = Math.max(0, al);
      const w = img.width * k;
      const h = img.height * k;
      ctx.drawImage(img, j.x - w / 2 + j.cara * 14, j.y - 82 - 34 - h - (1 - Math.min(1, b.t * 5)) * -6, w, h);
      ctx.globalAlpha = 1;
    }
  }

  /** A speech bubble, baked once per text. */
  private burbuja(quien: string, tx: string): HTMLCanvasElement {
    const clave = `${quien}|${tx}`;
    let c = this.burbujas.get(clave);
    if (c) return c;
    const k = 2;
    const x0 = document.createElement('canvas').getContext('2d')!;
    x0.font = `700 ${15 * k}px 'Alegreya Sans', sans-serif`;
    const ls = partir(x0, tx, 230 * k);
    const nombre = texto(`nombre.${quien}`);
    const w = Math.ceil(Math.max(...ls.map((l) => x0.measureText(l).width), 60 * k) + 26 * k);
    const h = Math.ceil((ls.length * 19 + 28) * k + 12 * k);
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d')!;
    const hh = h - 12 * k;
    x.fillStyle = 'rgba(255,248,230,0.96)';
    x.strokeStyle = '#6a3a1a';
    x.lineWidth = 2 * k;
    x.beginPath();
    x.roundRect(2, 2, w - 4, hh - 4, 12 * k);
    x.fill();
    x.stroke();
    x.beginPath();
    x.moveTo(w / 2 - 8 * k, hh - 3);
    x.lineTo(w / 2, h - 2);
    x.lineTo(w / 2 + 8 * k, hh - 3);
    x.closePath();
    x.fill();
    x.beginPath();
    x.moveTo(w / 2 - 8 * k, hh - 2);
    x.lineTo(w / 2, h - 2);
    x.lineTo(w / 2 + 8 * k, hh - 2);
    x.stroke();
    x.fillStyle = 'rgba(255,248,230,1)';
    x.fillRect(w / 2 - 7 * k, hh - 5, 14 * k, 5);
    x.textAlign = 'left';
    x.font = `800 ${12 * k}px 'Graduate', 'Alegreya Sans', serif`;
    x.fillStyle = quien === 'guille' ? '#b8780a' : quien === 'chuchi' ? '#c0304a' : '#2a56c8';
    x.fillText(nombre, 13 * k, 18 * k);
    x.font = `700 ${15 * k}px 'Alegreya Sans', sans-serif`;
    x.fillStyle = '#2a1840';
    ls.forEach((l, i) => x.fillText(l, 13 * k, (36 + i * 19) * k));
    this.burbujas.set(clave, c);
    return c;
  }

  private enemigo(e: Enem, t: number) {
    const { ctx, arte } = this;
    const f = this.frameEnemigo(e);
    const flash = e.hurtT > 0 ? arte.blanco.get(f) ?? f : f;
    const esc = e.tipo === 'gran' ? ESCALA.gran : e.tipo === 'reloj' ? ESCALA.reloj : ESCALA.despertador;
    // The telegraphs: a red glow while it winds up.
    const aviso = e.estado === 'alerta' || e.estado === 'agacha' || e.estado === 'ring';
    if (e.suelo && !e.muerto) this.sombra(e.x, e.y, e.hw * 1.05);
    if (aviso || (e.tipo === 'gran' && e.fase === 2 && !e.muerto)) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = aviso ? 0.5 + 0.3 * Math.sin(t * 30) : 0.28 + 0.1 * Math.sin(t * 6);
      const r = e.tipo === 'gran' ? 140 : 56;
      ctx.drawImage(arte.brillos.rojo, e.x - r, e.y - e.h * 0.55 - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    let ox = 0;
    if (aviso || e.estado === 'carga') ox = (Math.random() - 0.5) * (e.tipo === 'gran' ? 5 : 3);
    const alfa = e.muerto && e.tipo === 'gran' ? Math.max(0, 1 - this.m.tEstado / 1.6) * (0.55 + 0.45 * Math.sin(t * 50)) : 1;
    this.cuadro(flash, esc, e.x + ox, e.y, e.dir < 0, alfa);
    if (e.estado === 'dormido') return;
    // Sleepy clock: a small «z» is not text, it is two strokes drawn as a zig-zag.
    if (e.tipo === 'reloj' && e.estado !== 'gotea' && Math.abs(this.m.j.x - e.x) > 460) {
      ctx.strokeStyle = 'rgba(220,210,255,0.7)';
      ctx.lineWidth = 2;
      const zy = e.y - e.h - 14 - ((t * 14) % 14);
      ctx.beginPath();
      ctx.moveTo(e.x + 20, zy);
      ctx.lineTo(e.x + 30, zy);
      ctx.lineTo(e.x + 20, zy + 9);
      ctx.lineTo(e.x + 30, zy + 9);
      ctx.stroke();
    }
  }

  private proyectil(p: Mundo['proy'][number], t: number) {
    const { ctx, arte } = this;
    if (p.tipo === 'onda') {
      // A running bank of dust and foam, 34 high: a wedge with a golden crest.
      const lado = Math.sign(p.vx);
      ctx.fillStyle = 'rgba(255,226,170,0.85)';
      ctx.beginPath();
      ctx.moveTo(p.x - lado * 26, p.y);
      ctx.quadraticCurveTo(p.x - lado * 6, p.y - 40, p.x + lado * 20, p.y - 30 - Math.sin(t * 40) * 3);
      ctx.lineTo(p.x + lado * 24, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(Math.min(p.x - lado * 26, p.x + lado * 24), p.y - 3, 50, 3);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(arte.brillos.oro, p.x - 40, p.y - 50, 80, 70);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // A ring of sound that grows.
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#ffcf4a';
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.3);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r - 3, 0, 6.3);
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.drawImage(arte.brillos.oro, p.x - p.r * 1.4, p.y - p.r * 1.4, p.r * 2.8, p.r * 2.8);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  private fran(t: number) {
    const { ctx, m, arte } = this;
    const j = m.j;
    if (m.estado === 'muerte' && m.tMuerte > 0.9) return;
    const f = this.frameFran();
    // A shadow on the floor (smaller the higher he is).
    const sb = j.suelo ? j.y : this.sueloBajo(j.x, j.y);
    if (sb !== null) this.sombra(j.x, sb, 22 * Math.max(0.5, 1 - (sb - j.y) / 500));
    // Rim light on his back, warm, behind him.
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16;
    ctx.drawImage(arte.brillos.oro, j.x - 70, j.y - 120, 140, 140);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Blink while protected.
    const parpadeo = j.inv > 0 && j.aturdido <= 0 && Math.floor(t * 20) % 2 === 0;
    this.cuadro(f, ESCALA.fran, j.x, j.y, j.cara < 0, parpadeo ? 0.4 : 1);
    this.asoman(t);
  }
}
