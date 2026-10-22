// Chapter 2: what moves in the Bar del Brío, drawn over the baked scenery (docs/CAPITULO2.md).
//
//   level 0-1  the telly flickers with a football match; the slot machine's lights, once it
//              is switched on (`c2.encendida`); the odd tube flaring; from level 1, a number
//              in the pool sheet that hops between squares
//   level 2    the telly shows the Usera dragon dancing; the tapas in the case breathe
//   level 3    the telly swings, three small bottles spin on their shelves, the slot machine
//              throbs and the sheet is all sevens (that part is baked)
//
// Docs/ESTILO.md, T5: every piece is turned into a bitmap once per level (the SVG comes
// from src/arte/escenas/bar.mjs) and a frame only draws those bitmaps; there is no SVG drawn
// into the canvas per frame and nothing covers the whole screen. Painted on the live overlays
// (Motor.extra): the layer `pared` (behind the characters) and `techo` (in front of them).
import type { Aventura } from '../juego/aventura';
import { svgABitmap } from '../motor/sprites';
import { piezasVivas } from '../arte/escenas/bar.mjs';

interface Bmp {
  c: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Listo {
  tele: { marco: Bmp; pantalla: { x: number; y: number; w: number; h: number }; partido: Bmp; cabeza: Bmp; cuerpo: Bmp; cola: Bmp; centro: number[]; brillo: HTMLCanvasElement };
  expositor: { fondo: Bmp; tapas: Array<Bmp & { fase: number; ax: number; ay: number }> };
  maquina: { pared: { x: number; y: number; w: number; h: number; luces: HTMLCanvasElement[] }; fuera: { x: number; y: number; w: number; h: number; luces: HTMLCanvasElement[] }; halo: HTMLCanvasElement };
  porra: { celdas: Array<{ n: number; x: number; y: number; w: number; h: number }>; marcador: Bmp };
  botellas: Array<{ c: HTMLCanvasElement; x: number; y: number; w: number; h: number; ox: number; oy: number }>;
  estrella: HTMLCanvasElement;
  tubo: HTMLCanvasElement;
  datos: ReturnType<typeof piezasVivas>;
}

const NS = 'http://www.w3.org/2000/svg';
const listos = new Map<number, Listo>();
const cargando = new Set<number>();

const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

/** A drawing in its own frame (x, y, w, h in scene units) as a bitmap `res` pixels per unit. */
async function bmp(svg: string, x: number, y: number, w: number, h: number, res: number): Promise<Bmp> {
  const W = Math.ceil(w * res);
  const H = Math.ceil(h * res);
  const c = await svgABitmap(`<svg xmlns="${NS}" viewBox="${x} ${y} ${w} ${h}" width="${W}" height="${H}">${svg}</svg>`, W, H);
  return { c, x, y, w, h };
}

/** A soft round light, painted once. */
function halo(r: number, color: [number, number, number], a = 1) {
  const c = lienzo(r * 2, r * 2);
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(r, r, 0, r, r, r);
  const rgba = (k: number) => `rgba(${color[0]},${color[1]},${color[2]},${(a * k).toFixed(3)})`;
  gr.addColorStop(0, rgba(1));
  gr.addColorStop(0.35, rgba(0.45));
  gr.addColorStop(1, rgba(0));
  x.fillStyle = gr;
  x.fillRect(0, 0, r * 2, r * 2);
  return c;
}

/** The four-pointed glint of the coin. */
function estrella(r: number) {
  const c = lienzo(r * 2, r * 2);
  const x = c.getContext('2d')!;
  x.translate(r, r);
  x.fillStyle = '#fff8d0';
  x.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const d = i % 2 ? r * 0.18 : r;
    x[i ? 'lineTo' : 'moveTo'](Math.cos(a) * d, Math.sin(a) * d);
  }
  x.closePath();
  x.fill();
  const gr = x.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
  gr.addColorStop(0, 'rgba(255,248,208,0.9)');
  gr.addColorStop(1, 'rgba(255,248,208,0)');
  x.fillStyle = gr;
  x.fillRect(-r, -r, r * 2, r * 2);
  return c;
}

async function preparar(nivel: number, res: number): Promise<Listo> {
  const d = piezasVivas(nivel);
  const t = d.tele;
  const [marco, partido, cabeza, cuerpo, cola, fondo, marcador, ...resto] = await Promise.all([
    bmp(t.marco.svg, t.marco.x, t.marco.y, t.marco.w, t.marco.h, res),
    bmp(t.partido, t.pantalla.x, t.pantalla.y, t.pantalla.w, t.pantalla.h, res),
    bmp(t.dragon.cabeza, -50, -40, 90, 62, res),
    bmp(t.dragon.cuerpo, -14, -24, 28, 38, res),
    bmp(t.dragon.cola, -36, -14, 40, 30, res),
    bmp(d.expositor.fondo.svg, d.expositor.fondo.x, d.expositor.fondo.y, d.expositor.fondo.w, d.expositor.fondo.h, res),
    bmp(d.porra.marcador.svg, 0, 0, d.porra.marcador.w, d.porra.marcador.h, res * 1.4),
    ...d.expositor.tapas.map((p) => bmp(p.svg, p.box.x, p.box.y, p.box.w, p.box.h, res)),
    ...d.botellas.map((b) => bmp(b.svg, b.ox, b.oy, b.w, b.h, res)),
  ]);
  const tapas = d.expositor.tapas.map((p, i) => ({ ...(resto[i] as Bmp), fase: p.fase, ax: p.x, ay: p.y + 4 }));
  const botellas = d.botellas.map((b, i) => ({ c: (resto[d.expositor.tapas.length + i] as Bmp).c, x: b.x, y: b.y, w: b.w, h: b.h, ox: b.ox, oy: b.oy }));
  const luces = async (v: (typeof d.maquina)['pared']) => ({ x: v.x, y: v.y, w: v.w, h: v.h, luces: await Promise.all(v.luces.map(async (s) => (await bmp(s, v.x, v.y, v.w, v.h, res)).c)) });
  const [pared, fuera] = await Promise.all([luces(d.maquina.pared), luces(d.maquina.fuera)]);
  // The screen's glass: a faint diagonal glare, painted once.
  const brillo = lienzo(t.pantalla.w * res, t.pantalla.h * res);
  {
    const x = brillo.getContext('2d')!;
    const gr = x.createLinearGradient(0, 0, brillo.width, brillo.height);
    gr.addColorStop(0, 'rgba(255,255,255,0.16)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.03)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, brillo.width, brillo.height);
  }
  return {
    tele: { marco, pantalla: t.pantalla, partido, cabeza, cuerpo, cola, centro: t.centro, brillo },
    expositor: { fondo, tapas },
    maquina: { pared, fuera, halo: halo(Math.ceil(110 * res), [255, 150, 120]) },
    porra: { celdas: d.porra.celdas, marcador },
    botellas,
    estrella: estrella(Math.ceil(16 * res)),
    tubo: halo(Math.ceil(70 * res), [215, 230, 255]),
    datos: d,
  };
}

/** The pieces of this level, once they are ready (they are being made the first time it asks). */
function piezas(nivel: number, px: number) {
  const l = listos.get(nivel);
  if (l) return l;
  if (!cargando.has(nivel)) {
    cargando.add(nivel);
    // Only the pieces of the level on screen are kept.
    for (const k of [...listos.keys()]) if (k !== nivel) listos.delete(k);
    void preparar(nivel, Math.max(1, px * 1.25))
      .then((r) => listos.set(nivel, r))
      .catch((e) => console.warn('[bar-vivo]', e))
      .finally(() => cargando.delete(nivel));
  }
  return null;
}

const suave = (a: number, b: number, v: number) => {
  const u = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
/** Cheap deterministic hash into 0..1. */
const azar = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Live drawing of the bar. `capa` is the layer just drawn (`pared`, behind the characters;
 * `techo`, in front of them), `nivel` the night's level (0 to 3).
 */
export function dibujarBarVivo(g: Aventura, ctx: CanvasRenderingContext2D, capa: string, nivel: number) {
  if (capa !== 'pared' && capa !== 'techo') return;
  const m = g.motor;
  const px = m.px;
  const L = piezas(nivel, px);
  if (!L) return;
  const t = m.t;
  const d = L.datos;
  const vw = m.vw;
  // Layer coordinates to the canvas: x = u + offset of the layer.
  const capaU = (k: number) => ctx.setTransform(px, 0, 0, px, m.off(k) * px, 0);
  const visible = (x0: number, x1: number, k: number) => {
    const o = m.off(k);
    return x1 + o > -40 && x0 + o < vw + 40;
  };

  if (capa === 'pared') {
    // ---- The telly.
    const T = L.tele;
    const P = T.pantalla;
    if (visible(P.x - 260, P.x + P.w + 260, 1)) {
      ctx.save();
      capaU(1);
      const [cx, cy] = T.centro;
      const girando = nivel === 3;
      // Its light on the wall, flickering (nothing else on the wall changes).
      const fl = 0.55 + 0.45 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1) * 0.5 + 0.2 * Math.sin(t * 17);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (nivel >= 2 ? 0.2 : 0.16) * (0.7 + 0.3 * fl);
      ctx.drawImage(L.maquina.halo, cx - 260, cy - 200, 520, 400);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.translate(cx, cy);
      if (girando) ctx.rotate(Math.sin(t * 0.5) * 0.3);
      ctx.translate(-cx, -cy);
      ctx.drawImage(T.marco.c, T.marco.x, T.marco.y, T.marco.w, T.marco.h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(P.x, P.y, P.w, P.h);
      ctx.clip();
      if (nivel < 2) {
        // A match: a soft flicker of the picture, a bright band now and then and a flash for the goal.
        ctx.globalAlpha = 0.84 + 0.1 * Math.sin(t * 5.1) + 0.05 * Math.sin(t * 23);
        ctx.drawImage(T.partido.c, P.x, P.y, P.w, P.h);
        ctx.globalAlpha = 1;
        const ciclo = (t % 6.5) / 6.5;
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(P.x, P.y + ciclo * (P.h + 20) - 10, P.w, 8);
        const gol = (t % 19) / 19;
        if (gol > 0.94) {
          ctx.fillStyle = `rgba(255,255,255,${(0.28 * Math.sin(((gol - 0.94) / 0.06) * Math.PI)).toFixed(2)})`;
          ctx.fillRect(P.x, P.y, P.w, P.h);
        }
      } else {
        // The Usera dragon, dancing on a colour that goes round: its body follows the head along a loop.
        ctx.fillStyle = `hsl(${((t * 38) % 360).toFixed(0)} ${nivel === 3 ? 55 : 80}% ${nivel === 3 ? 45 : 38}%)`;
        ctx.fillRect(P.x, P.y, P.w, P.h);
        const mx = P.x + P.w / 2;
        const my = P.y + P.h / 2 + 4;
        const pos = (s: number): [number, number] => [mx + (P.w * 0.3) * Math.sin(s * 0.9) * Math.cos(s * 0.31), my + (P.h * 0.22) * Math.sin(s * 1.9 + 0.6)];
        const paso = 0.26;
        const hasta = 6;
        for (let i = hasta; i >= 0; i--) {
          const [x, y] = pos(t - (i + 1) * paso);
          const e = 0.9 - i * 0.05;
          const bob = Math.sin(t * 6 - i * 0.9) * 2;
          if (i === hasta) {
            ctx.drawImage(L.tele.cola.c, x - 36 * e, y - 14 * e + bob, 40 * e, 30 * e);
          } else ctx.drawImage(L.tele.cuerpo.c, x - 14 * e, y - 24 * e + bob, 28 * e, 38 * e);
        }
        const [hx, hy] = pos(t);
        const [bx] = pos(t - 0.1);
        const dir = hx >= bx ? 1 : -1;
        ctx.save();
        ctx.translate(hx, hy + Math.sin(t * 6) * 2);
        ctx.rotate(Math.sin(t * 3.4) * 0.14 * dir);
        ctx.scale(dir * 0.9, 0.9);
        ctx.drawImage(L.tele.cabeza.c, -50, -40, 90, 62);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(T.brillo, P.x, P.y, P.w, P.h);
      ctx.restore();
      ctx.restore();
    }

    // ---- The tapas in the glass case (they breathe from level 2). The counter is nearer than the wall.
    const E = L.expositor;
    const kb = d.bar.k;
    const bx = m.screenX(d.bar.X, kb);
    {
      const ex = E.fondo;
      if (bx + (ex.x + ex.w) * kb > -40 && bx + ex.x * kb < vw + 40) {
        ctx.save();
        ctx.setTransform(px * kb, 0, 0, px * kb, bx * px, d.bar.y * px);
        ctx.drawImage(ex.c, ex.x, ex.y, ex.w, ex.h);
        const respira = nivel >= 2;
        for (const p of E.tapas) {
          const s = respira ? Math.sin(t * 2.1 + p.fase) : 0;
          const sx = 1 + 0.035 * s;
          const sy = 1 + 0.07 * s;
          ctx.save();
          ctx.translate(p.ax, p.ay);
          ctx.scale(sx, sy);
          ctx.drawImage(p.c, p.x - p.ax, p.y - p.ay, p.w, p.h);
          ctx.restore();
        }
        ctx.restore();
      }
    }

    // ---- The pool sheet: from level 1 a number hops from square to square.
    if (nivel >= 1) {
      const celdas = L.porra.celdas;
      if (visible(1990, 2320, 1)) {
        ctx.save();
        capaU(1);
        const marcas = nivel === 3 ? 2 : 1;
        for (let q = 0; q < marcas; q++) {
          const ciclo = 3.4 - q * 0.5;
          const paso = Math.floor(t / ciclo) + q * 31;
          const u = (t % ciclo) / ciclo;
          const c = celdas[Math.floor(azar(paso + 1) * celdas.length)];
          const a = suave(0, 0.12, u) * (1 - suave(0.86, 1, u));
          const pop = 1 + 0.35 * (1 - suave(0, 0.2, u));
          ctx.globalAlpha = a;
          const w = c.w * pop;
          const h = c.h * pop;
          ctx.drawImage(L.porra.marcador.c, c.x - w / 2, c.y - h / 2, w, h);
        }
        ctx.restore();
      }
    }

    // ---- Level 3: a few small bottles turn slowly on their shelves.
    if (nivel === 3) {
      ctx.save();
      capaU(1);
      L.botellas.forEach((b, i) => {
        if (!visible(b.x - 60, b.x + 60, 1)) return;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(t * (0.55 + i * 0.12) + i * 2);
        ctx.drawImage(b.c, b.ox, b.oy, b.w, b.h);
        ctx.restore();
      });
      ctx.restore();
    }
    return;
  }

  // ---- In front of the characters (`techo`).
  // The slot machine's lights, only once it is switched on.
  if (g.flag('c2.encendida')) {
    const fuera = g.flag('c2.separada');
    const lugar = fuera ? d.maquinaFuera : d.maquinaPared;
    const v = fuera ? L.maquina.fuera : L.maquina.pared;
    const k = m.f(lugar.y);
    const sx = m.screenX(lugar.X, k);
    // This layer is in front of everyone: with someone standing before the machine, it stays unlit
    // rather than shine through them.
    const tapada = [...g.pjs.values(), ...g.npcs.values()].some((a) => a.visible && a.y > lugar.y && Math.abs(a.X - lugar.X) < 160);
    if (!tapada && sx > -300 && sx < vw + 300) {
      ctx.save();
      ctx.setTransform(px * k, 0, 0, px * k, sx * px, lugar.y * px);
      const pulso = nivel === 3 ? 1 + 0.05 * Math.sin(t * 5) : 1;
      // Its glow on what is around it, then the lit marquee and reels.
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (nivel === 3 ? 0.4 + 0.2 * Math.sin(t * 5) : 0.3) * (0.8 + 0.2 * Math.sin(t * 9));
      ctx.drawImage(L.maquina.halo, -150, -480, 300, 280);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      ctx.translate(cx, cy);
      ctx.scale(pulso, pulso);
      ctx.translate(-cx, -cy);
      ctx.drawImage(v.luces[Math.floor(t * 5) % 3], v.x, v.y, v.w, v.h);
      ctx.restore();
    }
  }

  // The coin on the floor: it winks.
  if (g.flag('c2.duroVisible')) {
    const k = m.f(d.duro.y);
    const sx = m.screenX(d.duro.X, k);
    if (sx > -100 && sx < vw + 100) {
      const ciclo = (t * 0.9) % 1;
      const a = Math.sin(ciclo * Math.PI);
      const r = (10 + 22 * a) * k;
      ctx.save();
      ctx.setTransform(px, 0, 0, px, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 + 0.75 * a;
      ctx.drawImage(L.estrella, sx - r, d.duro.y - 6 * k - r, r * 2, r * 2);
      ctx.restore();
    }
  }

  // A tube now and then flares, as old ones do.
  const lapso = 7.5;
  const slot = Math.floor(t / lapso);
  const u = (t % lapso) / lapso;
  if (u < 0.05) {
    const tubo = d.tubos[Math.floor(azar(slot) * d.tubos.length)];
    const o = m.off(1.4);
    if (tubo.u + o > -300 && tubo.u + o < vw + 300) {
      const f = Math.sin((u / 0.05) * Math.PI * 5) > 0 ? 1 : 0.25;
      ctx.save();
      ctx.setTransform(px, 0, 0, px, o * px, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.4 * f * Math.sin((u / 0.05) * Math.PI);
      ctx.drawImage(L.tubo, tubo.u - tubo.len / 2, tubo.y - 52, tubo.len, 104);
      ctx.restore();
    }
  }
}
