// Minigame: Chuchi against Robi, the play park's mascot robot, who will not let
// him leave until the party is over. From behind the park's air cannon, tap
// where to shoot: the ball takes half a second to get there, so the glowing
// power button on Robi's head has to be led. A homage to the WarioWare
// microgame where you shoot bananas up a giant nose.
//
// Six hits switch him off. Misses (and balls bouncing off his head, his body or
// his party hat) let him come closer, for a birthday hug; hits push him back. If
// he gets to Chuchi the round starts again; after two lost rounds it can be
// skipped (docs/JUGABILIDAD.md). Rules in ./robot-reglas.mjs, balance with
// node scripts/robot-sim.mjs.
//
// Performance (docs/ESTILO.md, T5): the room, Robi's body, head (one bitmap per
// face), arms and hat, the cannon and the balls are bitmaps made once per screen
// size; each frame only moves them. The loop never runs faster than 60 fps.
import { h } from './hud';
import { texto } from '../juego/textos';
import { FONTS } from '../motor/escena';
import { svgABitmap } from '../motor/sprites';
import { cuerpo, cabeza, brazo, HOMBROS, CUELLO, BOTON as BOTON_CABEZA } from '../arte/robot.mjs';
import { fondoRobot, canonRobot, bola, gorroFiesta, BOLAS } from '../arte/escenas/parque-robot.mjs';
import * as R from './robot-reglas.mjs';

export type Resultado = 'hecho' | 'saltado' | 'cancelado';

const H = R.H;
/** Where the cannon pivots (bottom middle) and its size. */
const CANON_Y = H - 20;
const CANON_K = 1.05;
const BOCA_CANON = 242;

type Cara = 'on' | 'golpe' | 'mareo' | 'fin';
const CARAS: Record<Cara, { ojos: string; boton: string }> = {
  on: { ojos: 'encendido', boton: 'encendido' },
  golpe: { ojos: 'mareo', boton: 'golpe' },
  mareo: { ojos: 'mareo', boton: 'encendido' },
  fin: { ojos: 'x', boton: 'apagado' },
};
const VB_CUERPO = { x: -140, y: -372, w: 280, h: 378 };
const VB_CABEZA = { x: -168, y: -280, w: 336, h: 296 };
const VB_BRAZO = { x: -52, y: -30, w: 104, h: 300 };
const VB_GORRO = { x: -62, y: -142, w: 124, h: 152 };
const VB_CANON = { x: -230, y: -270, w: 460, h: 480 };
const VB_BOLA = { x: -32, y: -32, w: 64, h: 64 };

interface Bola {
  c: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  /** Once it gets there: what happened, and how it carries on. */
  fin: null | { r: string; vx: number; vy: number; x: number; y: number; s: number; t: number };
}

/** State the automatic playthrough reads (scripts/playthrough.mjs), positions in CSS px. */
export interface EstadoRobot {
  boton: (dt: number) => { x: number; y: number; r: number; cubierto: boolean };
  vuelo: number;
  golpes: number;
  meta: number;
  cerca: number;
  rondasPerdidas: number;
  listo: boolean;
  fotogramas: number;
}

const svgDe = (vb: { x: number; y: number; w: number; h: number }, k: number, cuerpoSvg: string) =>
  svgABitmap(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${Math.ceil(vb.w * k)}" height="${Math.ceil(vb.h * k)}">${cuerpoSvg}</svg>`, vb.w * k, vb.h * k);

/** A short text drawn once (the robot's «¡BIP!» and the like). */
function bitmapTexto(t: string, tam: number, color: string) {
  const c = document.createElement('canvas');
  const x = c.getContext('2d')!;
  x.font = `400 ${tam}px ${FONTS.display}`;
  c.width = Math.ceil(x.measureText(t).width + tam * 0.8);
  c.height = Math.ceil(tam * 1.6);
  x.font = `400 ${tam}px ${FONTS.display}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineJoin = 'round';
  x.lineWidth = tam * 0.18;
  x.strokeStyle = '#102030';
  x.strokeText(t, c.width / 2, c.height / 2);
  x.fillStyle = color;
  x.fillText(t, c.width / 2, c.height / 2);
  return c;
}

export function jugarRobot(parent: HTMLElement, rapido = false): Promise<Resultado> {
  const lienzo = h('canvas', { class: 'lienzo-robot' });
  const cercaEl = h('div', { class: 'barra cerca' }, h('span', { class: 'etq' }, texto('robot.cerca')), h('span', { class: 'lleno' }));
  const bateriaEl = h('div', { class: 'barra bateria' }, h('span', { class: 'etq' }, texto('robot.bateria')), h('span', { class: 'lleno' }));
  const aviso = h('div', { class: 'aviso-cerdos', hidden: true });
  const saltar = h('button', { class: 'btn fantasma saltar', hidden: true }, texto('minijuego.saltar'));
  const cerrar = h('button', { class: 'cerrar', 'aria-label': texto('boton.cerrar') }, '×');
  const capa = h('div', { class: 'cubierta minijuego robot' }, lienzo, h('p', { class: 'instrucciones' }, texto('robot.instrucciones')), cercaEl, bateriaEl, aviso, saltar, cerrar);
  parent.append(capa);
  const ctx = lienzo.getContext('2d')!;

  // ---------------------------------------------------------------- screen and bitmaps
  let vw = 1920;
  let escala = 1;
  let generacion = 0;
  const bmp: {
    fondo?: HTMLCanvasElement;
    cuerpo?: HTMLCanvasElement;
    caras: Partial<Record<Cara, HTMLCanvasElement>>;
    brazo?: HTMLCanvasElement;
    brazoZapato?: HTMLCanvasElement;
    gorro?: HTMLCanvasElement;
    canon?: HTMLCanvasElement;
    bolas: HTMLCanvasElement[];
    pops: HTMLCanvasElement[];
  } = { caras: {}, bolas: [], pops: [] };

  const preparar = async () => {
    const gen = ++generacion;
    const k = escala;
    const ok = () => gen === generacion;
    // Robi is drawn at most this big (art units × ESCALA × the closest he gets).
    const kr = k * R.ESCALA * 1.4;
    const f = await svgDe({ x: 0, y: 0, w: vw, h: H }, k, fondoRobot(vw).replace(/^<svg[^>]*>|<\/svg>$/g, ''));
    // The exit sign's lettering, with the game font.
    const x = f.getContext('2d')!;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.font = `800 32px ${FONTS.body}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = '#eafff0';
    x.fillText(texto('robot.salida'), vw / 2, 264);
    const partes = {
      cuerpo: await svgDe(VB_CUERPO, kr, cuerpo({ encendido: true })),
      brazo: await svgDe(VB_BRAZO, kr, brazo()),
      brazoZapato: await svgDe(VB_BRAZO, kr, brazo({ zapato: true })),
      gorro: await svgDe(VB_GORRO, kr, gorroFiesta()),
      canon: await svgDe(VB_CANON, k * CANON_K, canonRobot()),
    };
    const caras: Partial<Record<Cara, HTMLCanvasElement>> = {};
    for (const c of Object.keys(CARAS) as Cara[]) caras[c] = await svgDe(VB_CABEZA, kr, cabeza(CARAS[c]));
    const bolas = [];
    for (const c of BOLAS) bolas.push(await svgDe(VB_BOLA, k, bola(c)));
    if (!ok()) return;
    Object.assign(bmp, partes, { caras, bolas, fondo: f });
    bmp.pops = texto('robot.au').split(' / ').map((t) => bitmapTexto(t, 64 * k, '#fff4a0'));
  };

  const medir = () => {
    const r = capa.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.8;
    lienzo.width = Math.max(2, Math.round(r.width * dpr));
    lienzo.height = Math.max(2, Math.round(r.height * dpr));
    escala = lienzo.height / H;
    vw = lienzo.width / escala;
    bmp.fondo = undefined;
    apunta = { x: vw / 2, y: 420 };
    void preparar();
  };
  let apunta = { x: 960, y: 420 };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(capa);

  // ---------------------------------------------------------------- state
  let t = 0; // Robi's clock (stops during announcements)
  let reloj = 0; // animation, always running
  let golpes = 0;
  let cerca = 0;
  let rondasPerdidas = 0;
  let recarga = 0;
  let bolas: Bola[] = [];
  let chispas: Array<{ x: number; y: number; vx: number; vy: number; t: number; c: string }> = [];
  let pops: Array<{ x: number; y: number; t: number; i: number }> = [];
  let cara: Cara = 'on';
  let caraHasta = 0;
  let retroceso = 0;
  let sacudida = 0;
  let caida = 0; // Robi slumping when switched off
  let pausa = 0;
  let terminado: Resultado | null = null;
  let tras: null | (() => void) = null;
  let fotogramas = 0;

  const mostrar = (clave: string, s = 1.4, luego?: () => void) => {
    aviso.textContent = texto(clave);
    aviso.hidden = false;
    aviso.classList.remove('salta');
    void aviso.offsetWidth;
    aviso.classList.add('salta');
    pausa = rapido ? 0.05 : s;
    tras = luego ?? null;
  };
  const empezar = () => {
    golpes = 0;
    cerca = 0;
    t = 0;
    bolas = [];
    cara = 'on';
    mostrar('robot.inicio', 1.8);
  };
  empezar();

  const canonX = () => vw / 2;
  const boca = () => {
    const a = Math.atan2(apunta.x - canonX(), CANON_Y - apunta.y);
    const l = BOCA_CANON * CANON_K;
    return { x: canonX() + Math.sin(a) * l, y: CANON_Y - Math.cos(a) * l, a };
  };

  const disparar = (x: number, y: number) => {
    if (pausa > 0 || terminado || recarga > 0) return;
    apunta = { x, y };
    const b = boca();
    bolas.push({ c: Math.floor(Math.random() * BOLAS.length), x0: b.x, y0: b.y, x1: x, y1: y, t: 0, fin: null });
    recarga = R.RECARGA;
    retroceso = 1;
  };

  const llega = (b: Bola) => {
    const r = R.resultado(vw, golpes, t, cerca, b.x1, b.y1);
    const sale = Math.random() < 0.5 ? -1 : 1;
    b.fin = { r, x: b.x1, y: b.y1, s: 0.32, t: 0, vx: sale * (120 + Math.random() * 160), vy: r === 'fuera' ? -60 : -260 };
    if (r === 'boton') {
      golpes++;
      cerca = Math.max(0, cerca + R.ACIERTO);
      sacudida = 1;
      cara = 'golpe';
      caraHasta = reloj + 0.25;
      pops.push({ x: b.x1, y: b.y1 - 40, t: 0, i: Math.floor(Math.random() * Math.max(1, bmp.pops.length)) });
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 200 + Math.random() * 380;
        chispas.push({ x: b.x1, y: b.y1, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0, c: i % 2 ? '#fff4a0' : '#ff7a5a' });
      }
      if (golpes >= R.META) {
        terminado = 'hecho';
        cara = 'fin';
        caraHasta = Infinity;
        mostrar('robot.gana', 2.6);
      } else if (golpes === 2 || golpes === 4) {
        mostrar(`robot.tramo${R.tramo(golpes)}`, 1.1);
      }
    } else cerca += R.FALLO;
  };

  // ---------------------------------------------------------------- input
  lienzo.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const r = lienzo.getBoundingClientRect();
    disparar(((e.clientX - r.left) / r.width) * vw, ((e.clientY - r.top) / r.height) * H);
  });
  lienzo.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = lienzo.getBoundingClientRect();
    apunta = { x: ((e.clientX - r.left) / r.width) * vw, y: ((e.clientY - r.top) / r.height) * H };
  });

  (window as unknown as { __robot?: () => EstadoRobot }).__robot = () => {
    const r = lienzo.getBoundingClientRect();
    const k = r.height / H;
    return {
      boton: (dt) => {
        const b = R.botonEn(vw, golpes, t + dt, cerca);
        return { x: r.left + b.x * k, y: r.top + b.y * k, r: b.r * k, cubierto: b.cubierto };
      },
      vuelo: R.VUELO,
      golpes,
      meta: R.META,
      cerca,
      rondasPerdidas,
      listo: !!bmp.fondo && pausa <= 0 && !terminado && recarga <= 0,
      fotogramas,
    };
  };

  // ---------------------------------------------------------------- drawing
  /** A bitmap made at `escala × k` for a viewBox `vb`, drawn with its origin at the current transform. */
  const pieza = (img: HTMLCanvasElement | undefined, vb: { x: number; y: number; w: number; h: number }) => {
    if (img) ctx.drawImage(img, vb.x, vb.y, vb.w, vb.h);
  };

  const pintar = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!bmp.fondo) {
      ctx.fillStyle = '#4a8ad0';
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      return;
    }
    ctx.drawImage(bmp.fondo, 0, 0);
    // Robi.
    const P = R.robotEn(vw, golpes, t, cerca);
    const s = P.s * (1 - 0.08 * caida);
    const temblor = sacudida > 0 ? Math.sin(reloj * 60) * 10 * sacudida : 0;
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.fillStyle = 'rgba(10,20,40,0.28)';
    ctx.beginPath();
    ctx.ellipse(P.x, 770 + 170 * cerca + 8, 150 * P.s, 26 * P.s, 0, 0, Math.PI * 2);
    ctx.fill();
    const base = (sx: number, sy: number, rot = 0) => {
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.translate(P.x + temblor, P.y);
      ctx.rotate(-0.12 * caida);
      ctx.scale(s, s);
      ctx.translate(sx, sy);
      if (rot) ctx.rotate(rot);
    };
    const enfadado = terminado === 'hecho';
    // Arm with the shoe, waving it (behind the body), the body, the other arm.
    base(HOMBROS[0].x, HOMBROS[0].y, enfadado ? 0.3 : (150 + 18 * Math.sin(reloj * 3.2)) * (Math.PI / 180));
    pieza(bmp.brazoZapato, VB_BRAZO);
    base(0, 0);
    pieza(bmp.cuerpo, VB_CUERPO);
    base(HOMBROS[1].x, HOMBROS[1].y, enfadado ? -0.3 : (-100 + 24 * Math.sin(reloj * 2.3 + 1)) * (Math.PI / 180));
    pieza(bmp.brazo, VB_BRAZO);
    // Head on the neck, tilting; the party hat rising out of it over the button.
    base(CUELLO.x, CUELLO.y, P.inclina + 0.35 * caida);
    const cr = reloj < caraHasta ? cara : terminado === 'hecho' ? 'fin' : sacudida > 0.2 ? 'mareo' : 'on';
    pieza(bmp.caras[cr], VB_CABEZA);
    const gz = terminado ? 0 : R.gorro(golpes, t);
    if (gz > 0.02 && bmp.gorro) {
      ctx.translate(BOTON_CABEZA.x, BOTON_CABEZA.y + 24);
      ctx.scale(1, gz);
      pieza(bmp.gorro, VB_GORRO);
    }
    // The balls: flying away (smaller and smaller), then bouncing or gone.
    for (const b of bolas) {
      const img = bmp.bolas[b.c];
      if (!img) continue;
      let x: number;
      let y: number;
      let k: number;
      let a = 1;
      if (!b.fin) {
        const u = Math.min(1, b.t / R.VUELO);
        x = b.x0 + (b.x1 - b.x0) * u;
        y = b.y0 + (b.y1 - b.y0) * u - Math.sin(u * Math.PI) * 140 * (1 - u * 0.3);
        k = 1.25 - 0.93 * u;
      } else {
        x = b.fin.x;
        y = b.fin.y;
        k = b.fin.s;
        a = Math.max(0, 1 - b.fin.t * 1.4);
      }
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.globalAlpha = a;
      ctx.drawImage(img, x - 32 * k, y - 32 * k, 64 * k, 64 * k);
      ctx.globalAlpha = 1;
    }
    // Sparks and «¡BIP!».
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    for (const c of chispas) {
      ctx.globalAlpha = Math.max(0, 1 - c.t * 2);
      ctx.fillStyle = c.c;
      ctx.fillRect(c.x - 5, c.y - 5, 10, 10);
    }
    ctx.globalAlpha = 1;
    for (const p of pops) {
      const img = bmp.pops[p.i];
      if (!img) continue;
      const k = 1 + 0.3 * Math.min(1, p.t * 6);
      ctx.globalAlpha = Math.max(0, 1 - p.t * 1.2);
      ctx.drawImage(img, p.x - (img.width / escala) * k / 2, p.y - p.t * 80 - (img.height / escala) * k / 2, (img.width / escala) * k, (img.height / escala) * k);
    }
    ctx.globalAlpha = 1;
    // The cannon, turned towards the aim, kicking back when it fires.
    const b = boca();
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.translate(canonX(), CANON_Y + retroceso * 30);
    ctx.rotate(b.a);
    ctx.scale(CANON_K, CANON_K);
    pieza(bmp.canon, VB_CANON);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    (cercaEl.lastChild as HTMLElement).style.width = `${Math.min(1, cerca) * 100}%`;
    (bateriaEl.lastChild as HTMLElement).style.width = `${(1 - golpes / R.META) * 100}%`;
  };

  // ---------------------------------------------------------------- loop
  return new Promise((resolve) => {
    let ultimo = performance.now();
    let vivo = true;
    const fin = (r: Resultado) => {
      if (!vivo) return;
      vivo = false;
      ro.disconnect();
      delete (window as unknown as { __robot?: unknown }).__robot;
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
      reloj += dt;
      recarga = Math.max(0, recarga - dt);
      retroceso = Math.max(0, retroceso - dt * 6);
      sacudida = Math.max(0, sacudida - dt * 1.6);
      if (terminado === 'hecho') caida = Math.min(1, caida + dt * 1.2);
      if (pausa > 0) {
        pausa -= dt;
        if (pausa <= 0) {
          aviso.hidden = true;
          if (terminado) return fin(terminado);
          const luego = tras;
          tras = null;
          luego?.();
        }
      } else if (!terminado) {
        t += dt;
        cerca += dt * R.ACERCA[R.tramo(golpes)];
        if (cerca >= 1) {
          // The birthday hug: round lost.
          rondasPerdidas++;
          if (rondasPerdidas >= 2) saltar.hidden = false;
          cerca = 1;
          mostrar('robot.abrazo', 2.2, empezar);
        }
      }
      for (const b of bolas) {
        if (!b.fin) {
          b.t += dt;
          if (b.t >= R.VUELO) llega(b);
        } else {
          b.fin.t += dt;
          b.fin.vy += 1400 * dt;
          b.fin.x += b.fin.vx * dt;
          b.fin.y += b.fin.vy * dt;
          b.fin.s = b.fin.r === 'fuera' ? Math.max(0.15, b.fin.s - dt * 0.2) : b.fin.s + dt * 0.5;
        }
      }
      bolas = bolas.filter((b) => !b.fin || (b.fin.t < 0.8 && b.fin.r !== 'boton'));
      for (const c of chispas) {
        c.vy += 900 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.t += dt;
      }
      chispas = chispas.filter((c) => c.t < 0.5);
      for (const p of pops) p.t += dt;
      pops = pops.filter((p) => p.t < 0.9);
      pintar();
      fotogramas++;
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
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
