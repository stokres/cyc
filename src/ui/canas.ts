// Minigame: «Las cañas por la barra» (chapter 2). Fran asks Vero for another round and she slides the
// beers down the bar, one by one, to the four friends sitting along it. One tap brakes the beer:
// if it stops on the coaster of the one who is waiting for it, good (his face lights up); if it
// stops short or goes past, it tips off the bar with a splash and the round starts again. Four
// beers a round, each one quicker, to a friend nearer or further away. The beer brakes with friction
// after the tap (it does not stop dead), so the tap goes a little before: a small gold ring on the
// bar shows where it would stop if you tapped now. After two lost rounds «Saltar» appears
// (docs/JUGABILIDAD.md).
//
// The pace: a beer is pushed so that the ideal tap comes TIEMPO seconds after the push, whoever it is
// for (further away means quicker); the first takes a bit more than a second and the last a bit less
// than eight tenths. The coaster, plus the glass's own width, is how much error is allowed: about a
// tenth of a second either way for the quickest beer. With normal reflexes a round is won in one or
// two tries; without tapping, never.
//
// The bar is the trailer's (src/ui/bar-pintura.ts), seen from the side; the friends are their front
// portraits as bitmaps (docs/ESTILO.md, T5). Everything is painted once per screen size; each frame
// only draws those images and a few shapes. The loop never passes 60 fps.
import { h } from './hud';
import { esVertical } from './orientacion';
import { texto } from '../juego/textos';
import { REPARTO, type PjId } from '../juego/reparto';
import { FONTS } from '../motor/escena';
import { elipse, lienzo, pintarBar, pintarCana, type Cana } from './bar-pintura';
import { crearFicha } from './fichas';
import type { SonidoMinijuego } from '../core/audio';

export type Resultado = 'hecho' | 'saltado' | 'cancelado';

/** The friends along the bar, left to right. */
const AMIGOS: PjId[] = ['pablo', 'chuchi', 'guille', 'fran'];
const ANIMOS = ['neutral', 'happy', 'sad'] as const;
type Animo = (typeof ANIMOS)[number];
/** Who gets the beers of each try, in order: far and near, a different mix each round. */
const ORDEN = [
  [1, 3, 0, 2],
  [2, 0, 3, 1],
  [3, 1, 2, 0],
  [0, 2, 1, 3],
];
/** Seconds from the push to the ideal tap, for the first to the fourth beer of a round. */
const TIEMPO = [1.2, 1.05, 0.95, 0.85];
/** Friction after the tap: the speed falls to 1/e in 1/ROZ seconds, so it slides V/ROZ further. */
const ROZ = 2.3;
/** Lost rounds before «Saltar». */
const PARA_SALTAR = 2;
/** Gravity of the fall and the splash, in screen heights a second squared. */
const G = 5.5;

/** State the automatic tests read (scripts/rendimiento.mjs), positions in CSS px. */
export interface EstadoCanas {
  fase: 'espera' | 'desliza' | 'asienta' | 'cae' | 'fin';
  /** A beer is sliding and has not been braked yet: a tap now brakes it. */
  listo: boolean;
  /** Where the beer is, and where it would stop if it were braked now. */
  x: number;
  parada: number;
  /** The coaster it is for, and how far from its centre a stop still counts. */
  objetivo: number;
  tolerancia: number;
  frenada: boolean;
  /** Beers served in this round (0 to 4), tries lost and the beer of the round (0 to 3). */
  servidas: number;
  rondasPerdidas: number;
  indice: number;
  fotogramas: number;
}

export interface OpcionesCanas {
  rapido?: boolean;
  /** Not used yet (the bar's own music keeps playing underneath); here for the same shape as the others. */
  sonido?: SonidoMinijuego;
}

interface Gota {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  espuma: boolean;
}

/** Vero's bust, behind the bar on the left: dark hair in a bun, brown skin, big lips, hoops, black tee. */
function pintarVero(x: CanvasRenderingContext2D, cx: number, H: number) {
  const r = H * 0.115;
  const cy = H * 0.3;
  // Black tee: the shoulders, cut off by the counter.
  x.fillStyle = '#16121a';
  x.beginPath();
  x.moveTo(cx - r * 2.1, H * 0.6);
  x.quadraticCurveTo(cx - r * 2.05, cy + r * 1.35, cx - r * 0.55, cy + r * 1.2);
  x.lineTo(cx + r * 0.55, cy + r * 1.2);
  x.quadraticCurveTo(cx + r * 2.05, cy + r * 1.35, cx + r * 2.1, H * 0.6);
  x.closePath();
  x.fill();
  x.fillStyle = '#2a2230';
  x.fillRect(cx - r * 0.05, cy + r * 1.3, r * 0.1, H * 0.2);
  // Neck.
  x.fillStyle = '#8a5230';
  x.beginPath();
  x.roundRect(cx - r * 0.3, cy + r * 0.7, r * 0.6, r * 0.7, r * 0.2);
  x.fill();
  // Hair behind, and the bun.
  elipse(x, cx, cy - r * 1.18, r * 0.44, r * 0.4, '#1d1411');
  elipse(x, cx, cy - r * 0.08, r * 1.04, r * 1.08, '#1d1411');
  // Face.
  elipse(x, cx, cy + r * 0.08, r * 0.9, r * 1.0, '#a46a40');
  elipse(x, cx - r * 0.5, cy + r * 0.3, r * 0.22, r * 0.14, 'rgba(176,84,64,0.35)');
  elipse(x, cx + r * 0.5, cy + r * 0.3, r * 0.22, r * 0.14, 'rgba(176,84,64,0.35)');
  // Fringe pulled back.
  x.fillStyle = '#1d1411';
  x.beginPath();
  x.ellipse(cx, cy - r * 0.72, r * 0.98, r * 0.42, 0, Math.PI, 0);
  x.fill();
  // Eyes, brows, nose.
  for (const lado of [-1, 1]) {
    elipse(x, cx + lado * r * 0.37, cy - r * 0.04, r * 0.19, r * 0.12, '#f6eee2');
    elipse(x, cx + lado * r * 0.37, cy - r * 0.04, r * 0.09, r * 0.095, '#2a1710');
    x.strokeStyle = '#1d1411';
    x.lineWidth = Math.max(1.5, r * 0.07);
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(cx + lado * r * 0.2, cy - r * 0.27);
    x.quadraticCurveTo(cx + lado * r * 0.4, cy - r * 0.36, cx + lado * r * 0.6, cy - r * 0.26);
    x.stroke();
  }
  elipse(x, cx, cy + r * 0.28, r * 0.1, r * 0.07, 'rgba(110,60,36,0.5)');
  // Big lips, smiling.
  elipse(x, cx, cy + r * 0.56, r * 0.33, r * 0.14, '#7e2d2e');
  elipse(x, cx, cy + r * 0.52, r * 0.2, r * 0.05, 'rgba(255,255,255,0.18)');
  x.strokeStyle = '#4a1a1a';
  x.lineWidth = Math.max(1, r * 0.04);
  x.beginPath();
  x.moveTo(cx - r * 0.3, cy + r * 0.56);
  x.quadraticCurveTo(cx, cy + r * 0.62, cx + r * 0.3, cy + r * 0.56);
  x.stroke();
  // Small hoops.
  x.strokeStyle = '#e8b84a';
  x.lineWidth = Math.max(1.5, r * 0.06);
  for (const lado of [-1, 1]) {
    x.beginPath();
    x.arc(cx + lado * r * 0.94, cy + r * 0.34, r * 0.15, 0, Math.PI * 2);
    x.stroke();
  }
}

export function jugarCanas(parent: HTMLElement, o: OpcionesCanas = {}): Promise<Resultado> {
  const rapido = o.rapido ?? false;
  const canvas = h('canvas', { class: 'lienzo-canas' });
  const para = h('div', { class: 'para-canas', hidden: true });
  const aviso = h('div', { class: 'aviso-mini', hidden: true });
  const saltar = h('button', { class: 'btn fantasma saltar', hidden: true }, texto('minijuego.saltar'));
  const cerrar = h('button', { class: 'cerrar', 'aria-label': texto('boton.cerrar') }, '×');
  const capa = h('div', { class: 'cubierta minijuego canas' }, canvas, h('p', { class: 'instrucciones' }, texto('canas.instrucciones')), para, aviso, saltar, cerrar);
  parent.append(capa);
  const ctx = canvas.getContext('2d')!;

  // ---------------------------------------------------------------- what is painted, once per screen size
  let W = 844;
  let H = 390;
  let dpr = 1;
  let fondo: HTMLCanvasElement | null = null;
  let vaso: Cana | null = null;
  let brillo: HTMLCanvasElement | null = null;
  const fichas: Array<Partial<Record<Animo, HTMLCanvasElement>>> = AMIGOS.map(() => ({}));
  /** Where things stand (CSS px). */
  const geo = { yBarra: 0, x0: 0, xFin: 0, xs: [0, 0, 0, 0], rx: 0, aceptar: 0, rFicha: 0, yFicha: 0, altoVaso: 0 };

  const pintarFondo = () => {
    const dp = Math.min(dpr, 1.5);
    const [c, x] = lienzo(W, H, dp);
    // The bar as in the trailer, as wide as the screen.
    x.drawImage(pintarBar(W / 1.5, H, dp).img, 0, 0, W, H);
    pintarVero(x, W * 0.085, H);
    // The coasters, with the name of each friend under them.
    const tam = Math.max(14, Math.round(H * 0.046));
    x.font = `400 ${tam}px ${FONTS.display}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    AMIGOS.forEach((id, i) => {
      const cx = geo.xs[i];
      elipse(x, cx, geo.yBarra + 3, geo.rx * 1.08, geo.rx * 0.25, 'rgba(0,0,0,0.35)');
      elipse(x, cx, geo.yBarra + 1, geo.rx, geo.rx * 0.22, '#e2b04a');
      elipse(x, cx, geo.yBarra + 1, geo.rx * 0.88, geo.rx * 0.18, '#3a2118');
      x.lineWidth = 3;
      x.strokeStyle = 'rgba(20,8,6,0.85)';
      x.strokeText(REPARTO[id].nombre, cx, geo.yBarra + H * 0.12);
      x.fillStyle = '#f3ead6';
      x.fillText(REPARTO[id].nombre, cx, geo.yBarra + H * 0.12);
    });
    fondo = c;
  };

  const medir = () => {
    const r = capa.getBoundingClientRect();
    W = Math.max(2, r.width);
    H = Math.max(2, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    geo.yBarra = H * 0.8;
    geo.x0 = W * 0.2;
    geo.xFin = W * 0.965;
    geo.xs = [0.36, 0.52, 0.68, 0.84].map((u) => W * u);
    geo.rx = Math.min(W * 0.05, H * 0.12);
    geo.aceptar = geo.rx * 1.2;
    geo.rFicha = Math.min(W * 0.072, H * 0.155);
    geo.yFicha = H * 0.35;
    geo.altoVaso = H * 0.25;
    const dp = Math.min(dpr, 1.5);
    pintarFondo();
    vaso = pintarCana(geo.altoVaso, dp);
    // The glow behind the friend who is waiting for the beer.
    const [b, bx] = lienzo(geo.rFicha * 3.4, geo.rFicha * 3.4, dp);
    const rad = geo.rFicha * 1.7;
    const halo = bx.createRadialGradient(rad, rad, geo.rFicha * 0.8, rad, rad, rad);
    halo.addColorStop(0, 'rgba(255,214,110,0.55)');
    halo.addColorStop(1, 'rgba(255,214,110,0)');
    bx.fillStyle = halo;
    bx.fillRect(0, 0, rad * 2, rad * 2);
    brillo = b;
    // The friends' faces in a ring of their colour, one bitmap for each mood.
    AMIGOS.forEach((id, i) => {
      for (const animo of ANIMOS) {
        void crearFicha(id, { mood: animo }, geo.rFicha, dp)
          .then((f) => (fichas[i][animo] = f))
          .catch(() => {});
      }
    });
  };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(capa);
  // The names are in the titles' font: painted again once it has loaded.
  void document.fonts?.load('400 20px Graduate').then(() => pintarFondo());

  // ---------------------------------------------------------------- state
  let fase: EstadoCanas['fase'] = 'espera';
  /** Seconds left of the current pause (before a push, after a good one, after a fall). */
  let pausa = rapido ? 0.1 : 0.8;
  let t = 0;
  let fotogramas = 0;
  let intentos = 0;
  let rondasPerdidas = 0;
  let indice = 0;
  /** The friends already served this round, and the mood of each face. */
  let servidas: number[] = [];
  const animo: Animo[] = AMIGOS.map(() => 'neutral');
  const hasta: number[] = AMIGOS.map(() => 0);
  let destino = 0;
  const vaso1 = { x: 0, v: 0, v0: 0, frenada: false, tHasta: 0, giro: 0, vy: 0, vx: 0, y: 0, mano: 0 };
  let sacudida = 0;
  let gotas: Gota[] = [];
  let terminado = false;
  /** Ends the game: set when the loop starts. */
  let acabar: ((r: Resultado) => void) | null = null;

  const orden = () => ORDEN[intentos % ORDEN.length];
  const para1 = () => orden()[indice];
  /** Speed (px/s) that makes the ideal tap come TIEMPO seconds after the push, for this friend. */
  const velocidad = (quien: number) => (geo.xs[quien] - geo.x0) / (TIEMPO[indice] + 1 / ROZ);

  const mostrar = (clave: string, s = 1.5) => {
    aviso.textContent = texto(clave);
    aviso.hidden = false;
    aviso.classList.remove('salta');
    void aviso.offsetWidth;
    aviso.classList.add('salta');
    pausa = rapido ? 0.1 : s;
  };

  const cambiarAnimo = (i: number, a: Animo, s: number) => {
    animo[i] = a;
    hasta[i] = a === 'neutral' ? 0 : t + s;
  };

  const lanzar = () => {
    destino = para1();
    const v = velocidad(destino);
    Object.assign(vaso1, { x: geo.x0, v, v0: v, frenada: false, giro: 0, vy: 0, vx: 0, y: 0, mano: 1 });
    fase = 'desliza';
    para.textContent = texto('canas.para', { quien: REPARTO[AMIGOS[destino]].nombre });
    para.style.left = `${Math.round(geo.xs[0] - geo.rFicha - 8)}px`;
    para.style.top = `${Math.round(geo.yBarra - geo.altoVaso - 50)}px`;
    para.hidden = false;
  };

  const reiniciarRonda = () => {
    servidas = [];
    indice = 0;
    animo.fill('neutral');
    hasta.fill(0);
    aviso.hidden = true;
    fase = 'espera';
    pausa = rapido ? 0.1 : 0.7;
  };

  const caer = () => {
    fase = 'cae';
    para.hidden = true;
    vaso1.vx = vaso1.v * 0.5;
    vaso1.vy = 0;
    vaso1.giro = 0;
    vaso1.y = 0;
    cambiarAnimo(destino, 'sad', 1.6);
  };

  /** The beer has stopped (or gone off the end): on the coaster, or off the bar. */
  const resolver = () => {
    if (Math.abs(vaso1.x - geo.xs[destino]) <= geo.aceptar) {
      fase = 'asienta';
      para.hidden = true;
      servidas.push(destino);
      cambiarAnimo(destino, 'happy', 99);
      pausa = rapido ? 0.1 : 0.7;
    } else caer();
  };

  const frenar = () => {
    if (fase !== 'desliza' || vaso1.frenada || terminado) return;
    vaso1.frenada = true;
  };

  const estado = (): EstadoCanas => ({
    fase,
    listo: fase === 'desliza' && !vaso1.frenada,
    x: vaso1.x,
    parada: vaso1.x + vaso1.v / ROZ,
    objetivo: geo.xs[destino],
    tolerancia: geo.aceptar,
    frenada: vaso1.frenada,
    servidas: servidas.length,
    rondasPerdidas,
    indice,
    fotogramas,
  });
  (window as unknown as { __canas?: () => EstadoCanas }).__canas = estado;

  // ---------------------------------------------------------------- the update
  const salpicar = (x: number, y: number) => {
    for (let k = 0; k < 18; k++) {
      const a = -Math.PI / 2 + (k - 8.5) * 0.17;
      const v = H * (0.5 + ((k * 37) % 10) / 14);
      gotas.push({ x, y, vx: Math.cos(a) * v * 0.9, vy: Math.sin(a) * v, r: H * (0.006 + ((k * 13) % 5) * 0.0025), espuma: k % 3 === 0 });
    }
  };

  const actualizar = (dt: number) => {
    for (let i = 0; i < AMIGOS.length; i++) if (hasta[i] && t > hasta[i]) {
      animo[i] = 'neutral';
      hasta[i] = 0;
    }
    sacudida *= Math.exp(-dt * 7);
    if (vaso1.mano > 0) vaso1.mano = Math.max(0, vaso1.mano - dt * 3.2);
    for (const g of gotas) {
      g.vy += G * H * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
    }
    gotas = gotas.filter((g) => g.y < H * 1.05);
    if (pausa > 0) {
      pausa -= dt;
      if (pausa <= 0) {
        if (fase === 'fin') return acabar?.('hecho');
        if (fase === 'espera') lanzar();
        else if (fase === 'asienta') {
          if (servidas.length >= AMIGOS.length) {
            terminado = true;
            mostrar('canas.gana', 1.5);
            fase = 'fin';
          } else {
            indice++;
            fase = 'espera';
            pausa = rapido ? 0.05 : 0.45;
          }
        } else if (fase === 'cae') {
          // The message has been read: another round.
          intentos++;
          reiniciarRonda();
        }
      }
    }
    if (fase === 'desliza') {
      if (!vaso1.frenada) vaso1.x += vaso1.v * dt;
      else {
        const k = Math.exp(-ROZ * dt);
        vaso1.x += (vaso1.v * (1 - k)) / ROZ;
        vaso1.v *= k;
      }
      // Leans back with the push and forward with the brake.
      const aim = vaso1.frenada ? 0.1 * (vaso1.v / vaso1.v0) : -0.07;
      vaso1.giro += (aim - vaso1.giro) * Math.min(1, dt * 14);
      if (vaso1.x >= geo.xFin) caer();
      else if (vaso1.frenada && vaso1.v < geo.altoVaso * 0.05) resolver();
    } else if (fase === 'asienta') {
      // It settles onto the middle of its coaster.
      vaso1.x += (geo.xs[destino] - vaso1.x) * Math.min(1, dt * 14);
      vaso1.giro += (0 - vaso1.giro) * Math.min(1, dt * 14);
    } else if (fase === 'cae') {
      // It tips over the edge of the bar towards us and goes down, splashing at the bottom.
      const antes = vaso1.y;
      vaso1.vy += G * H * dt;
      vaso1.y += vaso1.vy * dt;
      vaso1.x += vaso1.vx * dt;
      vaso1.giro += dt * (vaso1.vx >= 0 ? 4.2 : -4.2) * Math.min(1, vaso1.y / (H * 0.05) + 0.3);
      if (antes < H * 0.2 && vaso1.y >= H * 0.2) {
        salpicar(vaso1.x, H * 0.98);
        sacudida = 1;
        pausa = 0;
        mostrar('canas.cae', 1.7);
        rondasPerdidas++;
        if (rondasPerdidas >= PARA_SALTAR) saltar.hidden = false;
      }
    }
  };

  // ---------------------------------------------------------------- the drawing
  const pintar = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (sacudida > 0.02) ctx.translate(Math.sin(t * 90) * sacudida * H * 0.012, Math.cos(t * 77) * sacudida * H * 0.012);
    if (fondo) ctx.drawImage(fondo, 0, 0, W, H);
    // The friends' faces; the one who is waiting is lit and bounces a little.
    const espera = fase === 'desliza' || fase === 'espera' ? (fase === 'desliza' ? destino : para1()) : -1;
    const R = geo.rFicha;
    AMIGOS.forEach((_, i) => {
      const f = fichas[i][animo[i]] ?? fichas[i].neutral;
      const cuenta = i === espera && fase === 'desliza';
      const bob = cuenta ? Math.sin(t * 9) * H * 0.008 : animo[i] === 'happy' ? Math.sin(t * 12 + i) * H * 0.006 : 0;
      if (cuenta && brillo) ctx.drawImage(brillo, geo.xs[i] - R * 1.7, geo.yFicha + bob - R * 1.7, R * 3.4, R * 3.4);
      if (f) ctx.drawImage(f, geo.xs[i] - R, geo.yFicha + bob - R, 2 * R, 2 * R);
      if (cuenta) {
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = Math.max(3, R * 0.07);
        ctx.beginPath();
        ctx.arc(geo.xs[i], geo.yFicha + bob, R + ctx.lineWidth * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    if (vaso) {
      const sitio = (x: number, y: number, giro: number, alfa = 1) => {
        ctx.save();
        ctx.globalAlpha = alfa;
        ctx.translate(x, y);
        if (giro) ctx.rotate(giro);
        ctx.drawImage(vaso!.img, -vaso!.w / 2, -vaso!.h + vaso!.h * 0.02, vaso!.w, vaso!.h);
        ctx.restore();
      };
      // The beers already served, on their coasters.
      for (const i of servidas) if (!(i === destino && fase === 'asienta')) sitio(geo.xs[i], geo.yBarra, 0);
      if (fase === 'desliza' || fase === 'asienta') {
        if (fase === 'desliza') {
          // Where it would stop if you tapped now.
          const p = vaso1.x + vaso1.v / ROZ;
          const parpadeo = vaso1.frenada ? 0.45 : 0.75 + 0.25 * Math.sin(t * 10);
          ctx.strokeStyle = `rgba(255,224,138,${parpadeo})`;
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.ellipse(p, geo.yBarra + 1, geo.rx * 0.5, geo.rx * 0.13, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          // The wet trail it leaves on the varnish.
          const largo = Math.min(W * 0.2, vaso1.x - geo.x0 + 10);
          if (largo > 4 && !vaso1.frenada) {
            const trazo = ctx.createLinearGradient(vaso1.x, 0, vaso1.x - largo, 0);
            trazo.addColorStop(0, 'rgba(255,220,160,0.35)');
            trazo.addColorStop(1, 'rgba(255,220,160,0)');
            ctx.fillStyle = trazo;
            ctx.fillRect(vaso1.x - largo, geo.yBarra - 2, largo, 4);
          }
          // Vero's hand and forearm, pushing it off.
          if (vaso1.mano > 0) {
            const u = vaso1.mano;
            const hx = geo.x0 - geo.altoVaso * 0.2 - (1 - u) * geo.altoVaso * 0.5;
            ctx.strokeStyle = '#a46a40';
            ctx.lineWidth = geo.altoVaso * 0.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(W * 0.1, geo.yBarra - geo.altoVaso * 0.16);
            ctx.lineTo(hx, geo.yBarra - geo.altoVaso * 0.16);
            ctx.stroke();
            ctx.lineCap = 'butt';
            elipse(ctx, hx, geo.yBarra - geo.altoVaso * 0.16, geo.altoVaso * 0.13, geo.altoVaso * 0.12, '#b27648');
          }
        }
        sitio(vaso1.x, geo.yBarra, vaso1.giro);
      } else if (fase === 'cae') sitio(vaso1.x, geo.yBarra + vaso1.y, vaso1.giro);
    }
    // The splash: drops of beer and flecks of foam.
    for (const g of gotas) elipse(ctx, g.x, g.y, g.r, g.r * 1.2, g.espuma ? '#fbf3dc' : '#e8a82a');
    ctx.restore();
  };

  // ---------------------------------------------------------------- loop
  return new Promise((resolve) => {
    let ultimo = performance.now();
    let vivo = true;
    const fin = (r: Resultado) => {
      if (!vivo) return;
      vivo = false;
      ro.disconnect();
      delete (window as unknown as { __canas?: unknown }).__canas;
      capa.remove();
      canvas.width = canvas.height = 0;
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
      actualizar(dt);
      if (!vivo) return;
      pintar();
      fotogramas++;
      requestAnimationFrame(paso);
    };
    acabar = fin;
    requestAnimationFrame(paso);
    canvas.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      frenar();
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
