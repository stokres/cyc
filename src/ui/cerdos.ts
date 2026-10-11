// Minigame: Guille stacks the eight pigs he has left on the scale, to weigh
// them all at once (he is late). Tower Bloxx style: each pig swings from the
// pulley and a tap drops it. Off centre, the tower sways more (and the next one
// is harder); past the edge, the pig slides off. The last pig is the worst one:
// bigger, heavier, and it will not keep still.
//
// Hearts (three): a slip costs one, and so does a collapse. Each pig carries
// the ones above it; when their weight leans past its back the tower comes down
// at that joint, for real: the pigs above tip over to the side they lean to and
// fall off the screen one after another while the rest shakes. The tower stays
// at the height that held and the fallen pigs are stacked again, in order. You
// see it coming: from about half the limit the tower leans above that joint
// (more with the load), the pigs there tremble and a red bar pulses along that
// joint. Out of hearts, the round starts again; after two lost
// rounds it can be skipped (docs/JUGABILIDAD.md).
//
// Endless version (minigames menu, ./infinito.ts): the pigs keep coming round
// (the worst one every eighth), the pulley keeps swinging wider and faster, and
// out of hearts (slips or collapses) the game ends, once the fall is over. A
// point per pig, two if it lands dead centre; points already earned stay.
import { h } from './hud';
import { esVertical } from './orientacion';
import { marcador, type Infinito } from './infinito';
import type { SonidoMinijuego } from '../core/audio';
import { svgABitmap } from '../motor/sprites';
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
/** From this share of the limit the tower starts to show it: lean, tremble and the red bar. */
const AVISO = 0.55;
const INCLINA = 0.45; // lean above a joint at the limit, as a fraction of the width of the pig under it
const GIRA = 0.18; // tilt (rad) above a joint at the limit
const TEMBLOR = 16; // tremble (world units) at the limit
const MAX_DESVIO = 200; // the lean and tilt of the whole tower stop here (world units, rad)
const MAX_GIRO = 0.55;
const VUELCO = 1.1; // rad/s²: how fast the pigs above a broken joint tip over (angle = VUELCO·t²)
const SUELTA = 0.45; // s until the topmost pig of a collapse lets go

interface Colocado {
  i: number;
  x: number;
  y: number; // bottom
  w: number;
  h: number;
}

/** A pig of a collapsing tower: it tips over with the rest, then lets go and falls. */
interface Suelto {
  i: number;
  /** Offset from the pivot while it is still part of the tilting group. */
  dx: number;
  dy: number;
  /** When it lets go (s since the collapse began). */
  libre: number;
  suelto: boolean;
  fuera: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  rot0: number;
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
  /** Highest load ratio of any joint of the tower (1 is the limit; the warning starts at about 0.55). */
  carga: number;
  /** The tower is falling: nothing hangs from the pulley until it is over. */
  derrumbando: boolean;
  /** Frames drawn so far (scripts/rendimiento.mjs). */
  fotogramas: number;
}

/** A pig at the size it is drawn on this screen (px per world unit). */
function imagenCerdo(i: number, pxPorUnidad: number) {
  const p = PIARA[i];
  const w = 180 * U * p.s * pxPorUnidad;
  const h = 110 * U * p.s * pxPorUnidad;
  return svgABitmap(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-80 -100 180 110" width="${Math.ceil(w)}" height="${Math.ceil(h)}">${cerdo({ ...p, s: 1 })}</svg>`, w, h);
}

/** The same Madrid skyline as the farm scene, as one bitmap. */
function imagenMadrid(ancho: number) {
  const m = madrid();
  const w = m.x1 - m.x0;
  const hh = m.y1 - m.y0;
  const k = ancho / w;
  return svgABitmap(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${m.x0} ${m.y0} ${w} ${hh}" width="${Math.ceil(w * k)}" height="${Math.ceil(hh * k)}">${m.body}</svg>`, w * k, hh * k);
}

/** `sonido`: for the fast banjo polka, in a loop while the tower lasts. */
export function jugarCerdos(parent: HTMLElement, rapido = false, infinito?: Infinito, sonido?: SonidoMinijuego): Promise<Resultado> {
  const lienzo = h('canvas', { class: 'lienzo-cerdos' });
  const cuenta = h('span', { class: 'cuenta-cerdos' });
  const aviso = h('div', { class: 'aviso-cerdos', hidden: true });
  const saltar = h('button', { class: 'btn fantasma saltar', hidden: true }, texto('minijuego.saltar'));
  const cerrar = h('button', { class: 'cerrar', 'aria-label': texto('boton.cerrar') }, '×');
  const puntos = infinito ? marcador(infinito) : null;
  const capa = h('div', { class: 'cubierta minijuego cerdos' }, lienzo, h('p', { class: 'instrucciones' }, texto('cerdos.instrucciones')), cuenta, ...(puntos ? [puntos.el] : []), aviso, saltar, cerrar);
  parent.append(capa);
  sonido?.musica('granjaCerdos');
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
  let siguiente = 0; // how many pigs have been on the rope (endless: they come round again)
  /** Which pig of the herd the n-th one is (in the story, n itself). */
  const cual = (n: number) => n % PIARA.length;
  let entrada = 1; // 0..1 while a new pig slides in on the trolley
  let cayendo: { i: number; x: number; y: number; vx: number; vy: number; rot: number; vr: number; fuera: boolean } | null = null;
  let vaivenTorre = 0; // sway amplitude of the tower
  let golpe = 0; // the wobble a landing pig gives the tower, dying away
  let sacudida = 0; // quick tremble of the tower while pigs fall off it
  let largo = 0; // how many pigs the sway is worked out for: after a collapse it eases down to the new height
  let camara = 0; // how far the view has risen
  let pausa = 0; // seconds of message before going on
  let terminado: Resultado | null = null;
  let fotogramas = 0;
  /** The tower coming down: the pigs above the broken joint tip over together, then let go one by one. */
  let derrumbe: { t: number; lado: number; px: number; py: number; grupo: Suelto[] } | null = null;
  // What the tower shows of its load, per pig (index 0 is the one on the scale). Worked out each frame.
  const incl: number[] = []; // eased warning of the joint under each pig, signed by the side it leans to
  const desvio: number[] = []; // lean of each pig: the sum of the joints under it
  const giro: number[] = []; // tilt of each pig
  const temblor: number[] = []; // tremble of each pig, 0..1
  let carga = 0; // highest load ratio
  let critico = 0; // the joint closest to giving way (0 for none worth showing)
  let aCritico = 0; // its warning, 0..1
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
    // Past the story's eight (endless), it keeps growing, more slowly and up to a point.
    // Brisk from the first pig and quicker with each one (5 October 2026: it used to start slow).
    const mas = Math.max(0, n - PIARA.length);
    const A = Math.min(0.85, 0.34 + 0.03 * Math.min(n, PIARA.length) + 0.01 * mas);
    const w = Math.min(4.6, 2.3 + 0.16 * Math.min(n, PIARA.length) + 0.05 * mas);
    const peor = PIARA[cual(siguiente)]?.peor;
    return A * Math.sin(w * tt) + (peor ? 0.1 * Math.sin(3.3 * tt + 1) : 0);
  };
  /** Sway offset of the tower at a given height fraction: its slow sway, taller is wobblier, and the last landing's wobble. */
  const vaiven = (f: number) => (vaivenTorre + largo * 3) * Math.sin(t * 2.1) * Math.pow(f, 1.4) + golpe * Math.sin(t * 3.4) * Math.pow(f, 1.2);
  /** Where the pig k of the tower is drawn: its place, the sway, the lean of the load and the tremble. */
  const equis = (k: number, v = vaiven((k + 1) / largo)) => {
    const tr = temblor[k] ?? 0;
    return pila[k].x + v + (desvio[k] ?? 0) + (tr > 0 ? tr * tr * TEMBLOR * Math.sin(t * 47 + k * 2.3) : 0) + (sacudida > 0.05 ? sacudida * Math.sin(t * 41 + k * 1.9) : 0);
  };
  const cima = () => {
    const top = pila[pila.length - 1];
    if (!top) return { x: cx(), y: 0, w: PLATAFORMA * 2 };
    return { x: top.x + vaiven(1) + (desvio[pila.length - 1] ?? 0), y: top.y - top.h, w: top.w };
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
    return { colgando: !cayendo && !derrumbe && entrada >= 1 && pausa <= 0 && !terminado, x: c.x, prediccion: c.x + c.vx * ARRASTRE * tc, objetivo: top.x, colocados: pila.length, rondasPerdidas, vidas, ...cuentas, carga, derrumbando: !!derrumbe, fotogramas };
  };
  (window as unknown as { __cerdos?: () => EstadoCerdos }).__cerdos = estado;

  const soltar = () => {
    if (cayendo || derrumbe || entrada < 1 || pausa > 0 || terminado) return;
    const c = colgado();
    cayendo = { i: cual(siguiente), x: c.x, y: c.yPant - sueloPantalla(), vx: c.vx * ARRASTRE, vy: 0, rot: c.a * 0.4, vr: 0, fuera: false };
  };

  const perderRonda = () => {
    if (infinito) {
      // Endless: that was the game.
      cayendo = null;
      terminado = 'hecho';
      mostrar('cerdos.infinito.fin', 2.2);
      return;
    }
    rondasPerdidas++;
    cayendo = null;
    mostrar('cerdos.derrumbe', 1.6);
    pila = [];
    largo = 0;
    vidas = VIDAS;
    siguiente = 0;
    entrada = 0;
    vaivenTorre = 0;
    golpe = 0;
    sacudida = 0;
    if (rondasPerdidas >= 2) saltar.hidden = false;
  };

  // ---------------------------------------------------------------- the weight each pig carries
  /**
   * How loaded a joint is: where the centre of mass of everything above it sits against the back of the
   * pig under it, plus a bit for the sway, as a share of half that back. Over 1, the joint gives way.
   */
  const razon = (com: number, debajo: Colocado) => (Math.abs(com - debajo.x) + vaivenTorre * 0.25) / (debajo.w * 0.5);

  /** The lowest joint of the first `n` pigs that gives way (the pig over it and all above fall), 0 for none. */
  const puntoRotura = (n: number) => {
    let com = 0;
    let masa = 0;
    let corte = 0;
    for (let k = n - 1; k >= 1; k--) {
      com += pila[k].x * PIARA[pila[k].i].kg;
      masa += PIARA[pila[k].i].kg;
      if (razon(com / masa, pila[k - 1]) > 1) corte = k;
    }
    return corte;
  };

  /** What the tower shows of its load (the lean, the tremble, the red bar): once a frame, no allocations. */
  const medirCarga = (dt: number) => {
    const n = pila.length;
    incl.length = desvio.length = giro.length = temblor.length = n;
    const ease = Math.min(1, dt * 6);
    let com = 0;
    let masa = 0;
    carga = 0;
    critico = 0;
    aCritico = 0;
    for (let k = n - 1; k >= 1; k--) {
      com += pila[k].x * PIARA[pila[k].i].kg;
      masa += PIARA[pila[k].i].kg;
      const r = razon(com / masa, pila[k - 1]);
      if (r > carga) carga = r;
      const a = Math.min(1, Math.max(0, (r - AVISO) / (1 - AVISO)));
      const lado = com / masa >= pila[k - 1].x ? 1 : -1;
      const antes = incl[k] ?? 0;
      incl[k] = antes + (lado * a - antes) * ease;
      if (a > aCritico) {
        aCritico = a;
        critico = k;
      }
    }
    // From the scale up: each joint's lean and tilt add to the ones under it.
    let off = 0;
    let rot = 0;
    let tre = 0;
    for (let k = 0; k < n; k++) {
      if (k > 0) {
        off += (incl[k] ?? 0) * INCLINA * pila[k - 1].w;
        rot += (incl[k] ?? 0) * GIRA;
        tre = Math.max(tre, Math.abs(incl[k] ?? 0));
      }
      desvio[k] = Math.max(-MAX_DESVIO, Math.min(MAX_DESVIO, off));
      giro[k] = Math.max(-MAX_GIRO, Math.min(MAX_GIRO, rot));
      temblor[k] = tre;
    }
  };

  /** The tower gives way at `corte`: from that pig up, they tip over to the side they lean to. */
  const derrumbar = (corte: number) => {
    const n = pila.length;
    const debajo = pila[corte - 1];
    let com = 0;
    let masa = 0;
    for (let j = corte; j < n; j++) {
      com += pila[j].x * PIARA[pila[j].i].kg;
      masa += PIARA[pila[j].i].kg;
    }
    const lado = com / masa >= debajo.x ? 1 : -1;
    // They turn about the edge of the pig under, on the side they lean to.
    const px = equis(corte - 1) + lado * debajo.w * 0.45;
    const py = pila[corte].y;
    const grupo: Suelto[] = [];
    const paso = Math.min(0.09, 0.45 / Math.max(1, n - corte - 1));
    for (let j = corte; j < n; j++) {
      grupo.push({ i: pila[j].i, dx: equis(j) - px, dy: pila[j].y - py, libre: SUELTA + (n - 1 - j) * paso, suelto: false, fuera: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, rot0: giro[j] ?? 0 });
    }
    derrumbe = { t: 0, lado, px, py, grupo };
    pila.length = corte;
    siguiente = corte;
    cayendo = null;
    vidas--;
    cuentas.derrumbes++;
    vaivenTorre *= 0.6;
    golpe = Math.max(golpe, 16);
    sacudida = 7;
  };

  /** The fall: the group tips over about the pivot, then each pig lets go (the topmost first) and drops. */
  const caerTorre = (dt: number) => {
    const d = derrumbe!;
    d.t += dt;
    if (d.t < 1.2) golpe = Math.max(golpe, 14);
    const tau = Math.min(d.t, 1);
    const ang = d.lado * VUELCO * tau * tau;
    const vang = d.lado * 2 * VUELCO * tau * (d.t < 1 ? 1 : 0);
    const co = Math.cos(ang);
    const si = Math.sin(ang);
    const sp = sueloPantalla();
    let vivos = 0;
    for (const p of d.grupo) {
      if (p.fuera) continue;
      if (!p.suelto && d.t >= p.libre) {
        // Lets go with the speed it had on the turn.
        p.suelto = true;
        const rx = p.x - d.px;
        const ry = p.y - d.py;
        p.vx = Math.max(-700, Math.min(700, -vang * ry + d.lado * 90));
        p.vy = Math.max(-500, Math.min(500, vang * rx));
        p.vr = vang * 1.1 + d.lado * (0.5 + 0.35 * (p.i % 3));
      }
      if (!p.suelto) {
        p.x = d.px + p.dx * co - p.dy * si;
        p.y = d.py + p.dx * si + p.dy * co;
        p.rot = p.rot0 + ang;
      } else {
        p.vy += G * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (sp + p.y > H + 260) {
          p.fuera = true;
          continue;
        }
      }
      vivos++;
    }
    if (!vivos) {
      derrumbe = null;
      entrada = 0;
      mostrar('cerdos.secae', 1.1);
    }
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
    pila.push({ i: c.i, x: c.x - vaiven(1) - (desvio[pila.length - 1] ?? 0), y, w, h: m(c.i).h });
    largo = pila.length;
    const desvioCaida = Math.abs(d) / apoyo;
    const perfecto = desvioCaida < 0.06;
    if (perfecto) vaivenTorre = Math.max(0, vaivenTorre * 0.7);
    else vaivenTorre += desvioCaida * 32;
    // Every landing shakes the tower, more off centre and more with a heavy pig.
    golpe += 4 + desvioCaida * 25 + PIARA[c.i].kg / 60;
    // Each pig has to carry everything above it: if the weight of the pigs above leans past
    // its back (plus the sway), the tower comes down at that joint, however straight it is below.
    // What is left must hold too, so it keeps cutting lower until it does.
    let corte = pila.length;
    for (let k = puntoRotura(corte); k > 0; k = puntoRotura(corte)) corte = k;
    if (corte < pila.length) {
      derrumbar(corte);
      return false;
    }
    if (perfecto) mostrar('cerdos.perfecto', 0.6);
    puntos?.sumar(perfecto ? 2 : 1);
    siguiente++;
    entrada = 0;
    if (infinito) {
      if (PIARA[cual(siguiente)].peor) mostrar('cerdos.peor', 1.4);
    } else if (siguiente >= PIARA.length) {
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
    pila.forEach((p, k) => {
      // A tall tower (endless): the pigs far below the screen are not drawn.
      if (sp + p.y - p.h > H + 40) return;
      const v = vaiven((k + 1) / largo);
      pintarCerdo(p.i, equis(k, v), sp + p.y, v * 0.002 + (giro[k] ?? 0));
    });
    // The joint about to give way: a red bar pulsing along it, thicker and quicker the closer to the limit.
    if (!derrumbe && critico > 0 && aCritico > 0.25) {
      const deb = pila[critico - 1];
      const lx = equis(critico - 1);
      const ly = sp + pila[critico].y;
      const pulso = 0.5 + 0.5 * Math.sin(t * (9 + 10 * aCritico));
      const alto = 22 + 26 * aCritico;
      ctx.fillStyle = '#ff2d1f';
      ctx.strokeStyle = '#ffe3d2';
      ctx.lineWidth = 3;
      ctx.globalAlpha = Math.min(1, 0.55 + 0.45 * aCritico) * (0.5 + 0.5 * pulso);
      ctx.beginPath();
      ctx.roundRect(lx - deb.w * 0.6, ly - alto / 2 - 6, deb.w * 1.2, alto, alto / 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Pulley beam, trolley and rope.
    ctx.fillStyle = '#4a4f57';
    ctx.fillRect(0, 0, vw, 26);
    if (!terminado && !derrumbe && (infinito || siguiente < PIARA.length)) {
      const sig = cual(siguiente);
      const c = colgado();
      const px = c.x - CUERDA * Math.sin(c.a);
      ctx.fillStyle = '#2e3238';
      ctx.fillRect(px - 30, 18, 60, 30);
      if (!cayendo && entrada > 0) {
        ctx.strokeStyle = '#c9b48e';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(px, 44);
        ctx.lineTo(c.x, c.yPant - m(sig).h - 20);
        ctx.stroke();
        // The sling round its middle.
        ctx.strokeStyle = '#8a6a3a';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(c.x - 30, c.yPant - m(sig).h + 10);
        ctx.lineTo(c.x, c.yPant - m(sig).h - 20);
        ctx.lineTo(c.x + 30, c.yPant - m(sig).h + 10);
        ctx.stroke();
        const wiggle = PIARA[sig].peor ? 0.08 * Math.sin(t * 9) : 0.03 * Math.sin(t * 5);
        pintarCerdo(sig, c.x, c.yPant, c.a * 0.4 + wiggle);
      }
    }
    if (cayendo) pintarCerdo(cayendo.i, cayendo.x, sp + cayendo.y, cayendo.rot);
    // The pigs of a collapse, tipping over and falling, in front of everything.
    if (derrumbe) for (const p of derrumbe.grupo) if (!p.fuera) pintarCerdo(p.i, p.x, sp + p.y, p.rot);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const corazones = '♥'.repeat(Math.max(0, vidas));
    cuenta.textContent = infinito ? texto('cerdos.cuentaInfinito', { n: pila.length, vidas: corazones }) : texto('cerdos.cuenta', { n: pila.length, total: PIARA.length, vidas: corazones });
  };

  // ---------------------------------------------------------------- loop
  return new Promise((resolve) => {
    let ultimo = performance.now();
    let vivo = true;
    const fin = (r: Resultado) => {
      if (!vivo) return;
      vivo = false;
      ro.disconnect();
      sonido?.pararMusica();
      delete (window as unknown as { __cerdos?: unknown }).__cerdos;
      capa.remove();
      resolve(r);
    };
    const paso = (ahora: number) => {
      if (!vivo) return;
      // Phone held upright: the notice covers the game. Time does not pass, so nothing jumps on return.
      if (esVertical()) {
        ultimo = ahora;
        requestAnimationFrame(paso);
        return;
      }
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
      golpe *= Math.exp(-dt * 1.3);
      sacudida *= Math.exp(-dt * 2.5);
      // After a collapse the sway eases down to the height that is left.
      if (largo > pila.length) largo = pila.length + (largo - pila.length) * Math.exp(-dt * 4);
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
      if (derrumbe) caerTorre(dt);
      medirCarga(dt);
      // The view rises with the tower, so the top always has room above it (and sinks back when it falls).
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
