// Minigame: Guille stacks the eight pigs he has left on the scale, to weigh
// them all at once (he is late). Tower Bloxx style: each pig swings from the
// pulley and a tap drops it. Off centre, the tower sways more (and the next one
// is harder); past the edge, the pig slides off. Three slips and the round
// starts again; after two lost rounds it can be skipped (docs/JUGABILIDAD.md).
// The last pig is the worst one: bigger, heavier, and it will not keep still.
import { h } from './hud';
import { texto } from '../juego/textos';
import { cerdo, medidas, PIARA } from '../arte/cerdos.mjs';
import { madrid } from '../arte/escenas/granja.mjs';

export type Resultado = 'hecho' | 'saltado' | 'cancelado';

/** World units per unit of pig art. */
const U = 1.6;
const H = 1080;
const SUELO = 960; // screen y of the platform top at the start
const PLATAFORMA = 250; // half width of the scale platform
const PIVOTE_Y = 40;
const CUERDA = 330;
const G = 2600; // gravity, units/s²
const ARRASTRE = 0.25; // how much of the swing a dropped pig keeps
const VIDAS = 3;

interface Colocado {
  i: number;
  x: number;
  y: number; // bottom
  w: number;
  h: number;
}

/** State the automatic playthrough reads (scripts/playthrough.mjs). */
export interface EstadoCerdos {
  colgando: boolean;
  /** Where the hanging pig would land if dropped now. */
  prediccion: number;
  /** Centre of what it would land on. */
  objetivo: number;
  colocados: number;
  /** Where the hanging pig is now, and how the round is going. */
  x: number;
  rondasPerdidas: number;
  vidas: number;
  resbalones: number;
  derrumbes: number;
  /** Frames drawn so far (scripts/rendimiento.mjs). */
  fotogramas: number;
}

/**
 * SVG to a bitmap, once. Drawing an SVG <img> into a canvas makes the browser
 * rasterise the vectors again on every frame (worse when rotated): always draw
 * from a canvas instead (docs/ESTILO.md, T5).
 */
async function aBitmap(svg: string, w: number, h: number): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** A pig at the size it is drawn on this screen (px per world unit). */
function imagenCerdo(i: number, pxPorUnidad: number) {
  const p = PIARA[i];
  const w = 180 * U * p.s * pxPorUnidad;
  const h = 110 * U * p.s * pxPorUnidad;
  return aBitmap(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-80 -100 180 110" width="${Math.ceil(w)}" height="${Math.ceil(h)}">${cerdo({ ...p, s: 1 })}</svg>`, w, h);
}

/** The same Madrid skyline as the farm scene, as one bitmap. */
function imagenMadrid(ancho: number) {
  const m = madrid();
  const w = m.x1 - m.x0;
  const hh = m.y1 - m.y0;
  const k = ancho / w;
  return aBitmap(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${m.x0} ${m.y0} ${w} ${hh}" width="${Math.ceil(w * k)}" height="${Math.ceil(hh * k)}">${m.body}</svg>`, w * k, hh * k);
}

export function jugarCerdos(parent: HTMLElement, rapido = false): Promise<Resultado> {
  const lienzo = h('canvas', { class: 'lienzo-cerdos' });
  const cuenta = h('span', { class: 'cuenta-cerdos' });
  const aviso = h('div', { class: 'aviso-cerdos', hidden: true });
  const saltar = h('button', { class: 'btn fantasma saltar', hidden: true }, texto('minijuego.saltar'));
  const cerrar = h('button', { class: 'cerrar', 'aria-label': texto('boton.cerrar') }, '×');
  const capa = h('div', { class: 'cubierta minijuego cerdos' }, lienzo, h('p', { class: 'instrucciones' }, texto('cerdos.instrucciones')), cuenta, aviso, saltar, cerrar);
  parent.append(capa);
  const ctx = lienzo.getContext('2d')!;
  const imgs: Array<HTMLCanvasElement | null> = PIARA.map(() => null);
  let ciudad: HTMLCanvasElement | null = null;
  /** The sky, Madrid and the fields: drawn once per screen size, then one drawImage a frame. */
  let fondoListo: HTMLCanvasElement | null = null;

  let vw = 1920;
  let escala = 1;
  const medir = () => {
    const r = capa.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.8;
    lienzo.width = Math.round(r.width * dpr);
    lienzo.height = Math.round(r.height * dpr);
    escala = lienzo.height / H;
    vw = lienzo.width / escala;
    // Bitmaps at the size they will be drawn.
    fondoListo = null;
    PIARA.forEach((_, i) => void imagenCerdo(i, escala).then((im) => (imgs[i] = im)).catch(() => {}));
    void imagenMadrid(vw * 1.05 * escala).then((im) => {
      ciudad = im;
      fondoListo = null;
    }).catch(() => {});
  };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(capa);

  // ---------------------------------------------------------------- state
  let pila: Colocado[] = [];
  let vidas = VIDAS;
  let rondasPerdidas = 0;
  const cuentas = { resbalones: 0, derrumbes: 0 };
  let t = 0;
  let siguiente = 0; // index of the pig on the rope
  let entrada = 1; // 0..1 while a new pig slides in on the trolley
  let cayendo: { i: number; x: number; y: number; vx: number; vy: number; rot: number; vr: number; fuera: boolean } | null = null;
  let vaivenTorre = 0; // sway amplitude of the tower
  let camara = 0; // how far the view has risen
  let pausa = 0; // seconds of message before going on
  let terminado: Resultado | null = null;
  let fotogramas = 0;
  const m = (i: number) => {
    const d = medidas(PIARA[i].s);
    return { w: d.w * U, h: d.h * U };
  };
  const kg = () => pila.reduce((s, c) => s + PIARA[c.i].kg, 0);

  const mostrar = (clave: string, s = 1.2, vars: Record<string, string | number> = {}) => {
    aviso.textContent = texto(clave, vars);
    aviso.hidden = false;
    aviso.classList.remove('salta');
    void aviso.offsetWidth;
    aviso.classList.add('salta');
    pausa = rapido ? 0.05 : s;
  };

  const cx = () => vw / 2;
  /** Angle of the rope: wider and faster as the tower grows; the worst pig fidgets. */
  const angulo = (tt: number) => {
    const n = pila.length;
    const A = 0.3 + 0.025 * n;
    const w = 1.7 + 0.12 * n;
    const peor = PIARA[siguiente]?.peor;
    return A * Math.sin(w * tt) + (peor ? 0.1 * Math.sin(3.3 * tt + 1) : 0);
  };
  /** Sway offset of the tower at a given height fraction. */
  const vaiven = (f: number) => (vaivenTorre + pila.length * 2) * Math.sin(t * 2.1) * Math.pow(f, 1.4);
  const cima = () => {
    const top = pila[pila.length - 1];
    if (!top) return { x: cx(), y: 0, w: PLATAFORMA * 2 };
    return { x: top.x + vaiven(1), y: top.y - top.h, w: top.w };
  };
  const colgado = () => {
    const a = angulo(t);
    const slide = 1 - Math.pow(1 - entrada, 3);
    const px = cx() + (1 - slide) * (vw * 0.6);
    return { x: px + CUERDA * Math.sin(a), yPant: PIVOTE_Y + CUERDA * Math.cos(a), a, vx: CUERDA * Math.cos(a) * (angulo(t + 0.01) - a) / 0.01 };
  };
  const sueloPantalla = () => SUELO + camara;

  const estado = (): EstadoCerdos => {
    const c = colgado();
    const top = cima();
    // Fall time from the hanging height to the top of the tower (screen units).
    const caida = Math.max(0, sueloPantalla() + top.y - c.yPant);
    const tc = Math.sqrt((2 * caida) / G);
    return { colgando: !cayendo && entrada >= 1 && pausa <= 0 && !terminado, x: c.x, prediccion: c.x + c.vx * ARRASTRE * tc, objetivo: top.x, colocados: pila.length, rondasPerdidas, vidas, ...cuentas, fotogramas };
  };
  (window as unknown as { __cerdos?: () => EstadoCerdos }).__cerdos = estado;

  const soltar = () => {
    if (cayendo || entrada < 1 || pausa > 0 || terminado) return;
    const c = colgado();
    cayendo = { i: siguiente, x: c.x, y: c.yPant - sueloPantalla(), vx: c.vx * ARRASTRE, vy: 0, rot: c.a * 0.4, vr: 0, fuera: false };
  };

  const perderRonda = () => {
    rondasPerdidas++;
    cayendo = null;
    mostrar('cerdos.derrumbe', 1.6);
    pila = [];
    vidas = VIDAS;
    siguiente = 0;
    entrada = 0;
    vaivenTorre = 0;
    if (rondasPerdidas >= 2) saltar.hidden = false;
  };

  const aterrizar = (c: NonNullable<typeof cayendo>) => {
    const top = cima();
    const { w } = m(c.i);
    const d = c.x - top.x;
    const apoyo = pila.length ? top.w / 2 : PLATAFORMA;
    if (Math.abs(d) > apoyo) {
      // Past the edge: it slides off, squealing.
      c.fuera = true;
      c.vx = Math.sign(d || 1) * 380;
      c.vr = Math.sign(d || 1) * 4;
      vidas--;
      cuentas.resbalones++;
      mostrar(vidas > 0 ? 'cerdos.resbala' : 'cerdos.sinvidas', 1);
      return false;
    }
    const y = top.y;
    pila.push({ i: c.i, x: c.x - vaiven(1), y, w, h: m(c.i).h });
    const desvio = Math.abs(d) / apoyo;
    if (desvio < 0.06) {
      vaivenTorre = Math.max(0, vaivenTorre * 0.6);
      mostrar('cerdos.perfecto', 0.6);
    } else vaivenTorre += desvio * 30;
    // The weight leaning off the base, plus the sway: past the edge, the tower comes down.
    let com = 0;
    let masa = 0;
    for (const p of pila) {
      com += (p.x - pila[0].x) * PIARA[p.i].kg;
      masa += PIARA[p.i].kg;
    }
    if (pila.length > 1 && Math.abs(com / masa) + vaivenTorre * 0.4 > pila[0].w * 0.5) {
      cuentas.derrumbes++;
      perderRonda();
      return false;
    }
    siguiente++;
    entrada = 0;
    if (siguiente >= PIARA.length) {
      terminado = 'hecho';
      mostrar('cerdos.hecho', 2.2, { kg: kg() });
    } else if (PIARA[siguiente].peor) mostrar('cerdos.peor', 1.4);
    return true;
  };

  // ---------------------------------------------------------------- drawing
  const pintarFondo = (c: CanvasRenderingContext2D) => {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#18204a');
    g.addColorStop(0.55, '#5a3c6a');
    g.addColorStop(0.8, '#d8775a');
    g.addColorStop(1, '#f2a65e');
    c.fillStyle = g;
    c.fillRect(0, -200, vw, H + 200);
    // Madrid far away, then the fields (the sky goes 200 units higher, for the view rising).
    const base = 930;
    if (ciudad) {
      const w = vw * 1.05;
      const hh = (w * ciudad.height) / ciudad.width;
      c.drawImage(ciudad, (vw - w) / 2, base - hh, w, hh);
    }
    const campo = c.createLinearGradient(0, base - 6, 0, base + 200);
    campo.addColorStop(0, '#8a6c50');
    campo.addColorStop(1, '#6a5440');
    c.fillStyle = campo;
    c.fillRect(0, base - 6, vw, H);
  };
  const fondo = () => {
    if (!fondoListo) {
      fondoListo = document.createElement('canvas');
      fondoListo.width = lienzo.width;
      fondoListo.height = Math.ceil((H + 200) * escala);
      const c = fondoListo.getContext('2d')!;
      c.setTransform(escala, 0, 0, escala, 0, 200 * escala);
      pintarFondo(c);
    }
    // The backdrop barely moves as the view rises: far away.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fondoListo, 0, Math.round((Math.min(200, camara * 0.12) - 200) * escala));
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
  };

  const pintarCerdo = (i: number, x: number, yPant: number, rot = 0) => {
    const im = imgs[i];
    const s = PIARA[i].s * U;
    if (!im) {
      ctx.fillStyle = '#f2a7aa';
      ctx.fillRect(x - 56 * s, yPant - 72 * s, 112 * s, 54 * s);
      return;
    }
    // Upright pigs without save/restore; rotation only for the swinging and falling ones.
    if (Math.abs(rot) < 0.002) {
      ctx.drawImage(im, x - 80 * s, yPant - 100 * s, 180 * s, 110 * s);
      return;
    }
    ctx.save();
    ctx.translate(x, yPant);
    ctx.rotate(rot);
    ctx.drawImage(im, -80 * s, -100 * s, 180 * s, 110 * s);
    ctx.restore();
  };

  const pintar = () => {
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    fondo();
    const sp = sueloPantalla();
    // The scale: platform, cage posts and the display with the running total.
    ctx.fillStyle = '#7a6448';
    ctx.fillRect(0, sp + 20, vw, H);
    ctx.fillStyle = '#959ba3';
    ctx.fillRect(cx() - PLATAFORMA - 10, sp, PLATAFORMA * 2 + 20, 26);
    ctx.fillStyle = '#d6dade';
    ctx.fillRect(cx() - PLATAFORMA - 10, sp, PLATAFORMA * 2 + 20, 6);
    const dx = cx() + PLATAFORMA + 90;
    ctx.fillStyle = '#959ba3';
    ctx.fillRect(dx - 8, sp - 170, 16, 190);
    ctx.fillStyle = '#e8c23a';
    ctx.beginPath();
    ctx.roundRect(dx - 80, sp - 250, 160, 90, 12);
    ctx.fill();
    ctx.fillStyle = '#123018';
    ctx.fillRect(dx - 64, sp - 236, 128, 50);
    ctx.fillStyle = '#7cff9a';
    ctx.font = '700 38px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(kg()).padStart(4, '0'), dx, sp - 197);
    // The tower.
    pila.forEach((p, k) => pintarCerdo(p.i, p.x + vaiven((k + 1) / pila.length), sp + p.y, vaiven((k + 1) / pila.length) * 0.002));
    // Pulley beam, trolley and rope.
    ctx.fillStyle = '#4a4f57';
    ctx.fillRect(0, 0, vw, 26);
    if (!terminado && siguiente < PIARA.length) {
      const c = colgado();
      const px = c.x - CUERDA * Math.sin(c.a);
      ctx.fillStyle = '#2e3238';
      ctx.fillRect(px - 30, 18, 60, 30);
      if (!cayendo && entrada > 0) {
        ctx.strokeStyle = '#c9b48e';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(px, 44);
        ctx.lineTo(c.x, c.yPant - m(siguiente).h - 20);
        ctx.stroke();
        // The sling round its middle.
        ctx.strokeStyle = '#8a6a3a';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(c.x - 30, c.yPant - m(siguiente).h + 10);
        ctx.lineTo(c.x, c.yPant - m(siguiente).h - 20);
        ctx.lineTo(c.x + 30, c.yPant - m(siguiente).h + 10);
        ctx.stroke();
        const wiggle = PIARA[siguiente].peor ? 0.08 * Math.sin(t * 9) : 0.03 * Math.sin(t * 5);
        pintarCerdo(siguiente, c.x, c.yPant, c.a * 0.4 + wiggle);
      }
    }
    if (cayendo) pintarCerdo(cayendo.i, cayendo.x, sp + cayendo.y, cayendo.rot);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    cuenta.textContent = texto('cerdos.cuenta', { n: pila.length, total: PIARA.length, vidas: '♥'.repeat(Math.max(0, vidas)) });
  };

  // ---------------------------------------------------------------- loop
  return new Promise((resolve) => {
    let ultimo = performance.now();
    let vivo = true;
    const fin = (r: Resultado) => {
      if (!vivo) return;
      vivo = false;
      ro.disconnect();
      delete (window as unknown as { __cerdos?: unknown }).__cerdos;
      capa.remove();
      resolve(r);
    };
    const paso = (ahora: number) => {
      if (!vivo) return;
      // 60 fps at most, also on 120 Hz screens.
      if (ahora - ultimo < 1000 / 60 - 4) {
        requestAnimationFrame(paso);
        return;
      }
      const dt = Math.min(0.05, (ahora - ultimo) / 1000);
      ultimo = ahora;
      t += dt;
      if (entrada < 1) entrada = Math.min(1, entrada + dt * (rapido ? 6 : 1.8));
      vaivenTorre *= Math.exp(-dt * 0.05);
      if (pausa > 0) {
        pausa -= dt;
        if (pausa <= 0) {
          aviso.hidden = true;
          if (terminado) return fin(terminado);
          if (vidas <= 0) perderRonda();
        }
      }
      if (cayendo) {
        const c = cayendo;
        c.vy += G * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += c.vr * dt;
        if (!c.fuera) {
          const top = cima();
          if (c.y >= top.y) {
            c.y = top.y;
            if (aterrizar(c)) cayendo = null;
          }
        } else if (sueloPantalla() + c.y > H + 200) {
          cayendo = null;
          entrada = 0;
        }
      }
      // The view rises with the tower, so the top always has room above it.
      const alto = pila.length ? -cima().y : 0;
      const quiere = Math.max(0, alto - 420);
      camara += (quiere - camara) * Math.min(1, dt * 3);
      pintar();
      fotogramas++;
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
    lienzo.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      soltar();
    });
    saltar.addEventListener('click', (e) => {
      e.stopPropagation();
      fin('saltado');
    });
    cerrar.addEventListener('click', (e) => {
      e.stopPropagation();
      fin('cancelado');
    });
  });
}
