// Minigame: «La rana de Aceituna». Fran tosses cubes of serrano ham across the
// living room into Aceituna's mouth, like the bar game where you throw coins
// into a frog's mouth. Slingshot control: drag back and let go; the further the
// pull, the harder the throw. Physics (parabolas, drag, bounces, the lamp's
// swinging shade, the draught) in ./rana-fisica.mjs.
//
// Four stretches, two catches each, harder and harder: she keeps still; she
// sways; she snaps her mouth open and shut; and the terrace door lets a draught
// in. The dotted aim line gets shorter every stretch. A pack has 24 cubes and if
// you dither, Fran eats one himself. Out of ham before eight catches, Fran opens
// another pack and it starts again; after two lost rounds it can be skipped
// (docs/JUGABILIDAD.md). Balance: node scripts/rana-sim.mjs.
//
// Endless version (minigames menu, ./infinito.ts): ham without end and no Fran
// helping himself; after the four stretches her routine and the draught keep
// getting quicker and stronger. Three cubes that she does not catch end the game
// (a hit rate of about one in two at the start would make one too few). A point
// per catch.
//
// Performance (docs/ESTILO.md, T5): the room, Fran's poses, Aceituna's faces,
// her tail, the shade, the curtains and the ham are bitmaps made once per screen
// size; each frame only moves them. The loop never runs faster than 60 fps.
import { h } from './hud';
import { texto } from '../juego/textos';
import { FONTS } from '../motor/escena';
import { silueta, svgABitmap } from '../motor/sprites';
import { enPose, type Huesos } from '../motor/poses';
import { icono } from '../arte/objetos.mjs';
import { sentada, colaSentada } from '../arte/personajes/aceituna.mjs';
import { fondo, pantalla, cortina, taquito, puertaTerraza, cartel } from '../arte/escenas/salon-rana.mjs';
import { POSTER_TEXTS } from '../arte/escenas/piso.mjs';
import * as F from './rana-fisica.mjs';
import { marcador, type Infinito } from './infinito';

export type Resultado = 'hecho' | 'saltado' | 'cancelado';

const H = F.H;
const TRAMOS = 4;
const POR_TRAMO = 2;
const META = TRAMOS * POR_TRAMO;
const PAQUETE = 24;
/** Seconds without throwing before Fran eats one himself. */
const GULA = 8;
/** Endless: cubes she may not catch before the game is over, and catches per «level». */
const VIDAS = 3;
const NIVEL_CADA = 4;
/** Seconds of flight the dotted aim line shows, per stretch. */
const VISTA = [0, 1.1, 0.55, 0.28, 0.12];
/** Aceituna's art units to logical px (her catch area in rana-fisica.mjs matches it). */
const ESCALA_PERRO = 2;
/** Where Fran's feet are: he stands nearer the camera than the room. */
const FRAN_PIES = 1046;

/** Fran's poses (degrees, as in the rig) and his face in each. */
const POSES_FRAN: Record<string, { h: Huesos; animo: string }> = {
  reposo: { animo: 'neutral', h: { brazo_sup_delante: 22, antebrazo_delante: 98, mano_delante: 10, brazo_sup_detras: -8, antebrazo_detras: 14 } },
  contento: { animo: 'happy', h: { brazo_sup_delante: 22, antebrazo_delante: 98, mano_delante: 10, brazo_sup_detras: -8, antebrazo_detras: 14 } },
  apunta: { animo: 'neutral', h: { torso: 8, cabeza: 4, brazo_sup_delante: -58, antebrazo_delante: 30, mano_delante: 10, brazo_sup_detras: 34, antebrazo_detras: 46, muslo_delante: 16, pierna_delante: -8, muslo_detras: -12, pierna_detras: -4 } },
  lanza: { animo: 'happy', h: { torso: -10, cabeza: -6, brazo_sup_delante: 118, antebrazo_delante: 12, mano_delante: -12, brazo_sup_detras: -34, antebrazo_detras: 20, muslo_delante: 22, pierna_delante: -10, muslo_detras: -20, pierna_detras: -24 } },
  come: { animo: 'happy', h: { torso: 6, cabeza: 6, brazo_sup_delante: 34, antebrazo_delante: 142, mano_delante: 20, brazo_sup_detras: -6, antebrazo_detras: 18 } },
};
type PoseFran = keyof typeof POSES_FRAN;
/** The part of Fran's space his pose bitmaps cover. */
const VB_FRAN = { x: -190, y: -330, w: 380, h: 345 };

type Cara = 'espera' | 'cerrada' | 'masca' | 'digna' | 'golpe';
const CARAS: Record<Cara, { boca: string; ojos: string }> = {
  espera: { boca: 'abierta', ojos: 'ilusion' },
  cerrada: { boca: 'cerrada', ojos: 'ilusion' },
  masca: { boca: 'masca', ojos: 'feliz' },
  digna: { boca: 'cerrada', ojos: 'digna' },
  golpe: { boca: 'cerrada', ojos: 'golpe' },
};
const VB_PERRO = { x: -80, y: -228, w: 160, h: 238 };
const VB_COLA = { x: -74, y: -70, w: 46, h: 64 };
const PIVOTE_COLA = { x: -44, y: -14 };

interface Miga {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  c: string;
}

type Taco = ReturnType<typeof F.nuevoTaco> & { fuera: number; tocoSuelo: boolean; perdido?: boolean };

/** State the automatic playthrough reads (scripts/playthrough.mjs), positions in CSS px. */
export interface EstadoRana {
  ancla: { x: number; y: number };
  boca: { x: number; y: number; r: number };
  abierta: boolean;
  tramo: number;
  comidos: number;
  quedan: number;
  vuela: boolean;
  listo: boolean;
  rondasPerdidas: number;
  fotogramas: number;
  /** CSS px per logical px. */
  escala: number;
  /** The free path of a throw with this pull (CSS px), ignoring the dog. */
  prever: (px: number, py: number) => { puntos: Array<{ x: number; y: number; t: number }>; ev: string | null };
  /** Where the mouth will be `dt` seconds from now, and whether it will be open. */
  bocaEn: (dt: number) => { x: number; y: number; abierta: boolean };
}

export interface OpcionesRana {
  /** Fran's body SVG with this face (his current clothes). */
  cuerpoFran: (animo: string) => string;
  joints: Record<string, number[]>;
  rapido?: boolean;
  /** The endless version, from the minigames menu. */
  infinito?: Infinito;
}

/** A warm glow, for the lamp: made once. */
function bitmapBrillo(r: number, color: string, alfa: number) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(2, Math.ceil(r * 2));
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, color.replace('A', String(alfa)));
  g.addColorStop(0.5, color.replace('A', String(alfa * 0.4)));
  g.addColorStop(1, color.replace('A', '0'));
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

/** A short text drawn once (the «¡Ñam!» that pops out of her mouth). */
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
  x.strokeStyle = '#2a1410';
  x.strokeText(t, c.width / 2, c.height / 2);
  x.fillStyle = color;
  x.fillText(t, c.width / 2, c.height / 2);
  return c;
}

const svgDe = (vb: { x: number; y: number; w: number; h: number }, k: number, cuerpo: string) =>
  svgABitmap(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${Math.ceil(vb.w * k)}" height="${Math.ceil(vb.h * k)}">${cuerpo}</svg>`, vb.w * k, vb.h * k);

export function jugarRana(parent: HTMLElement, op: OpcionesRana): Promise<Resultado> {
  const lienzo = h('canvas', { class: 'lienzo-rana' });
  const ganasEl = h('div', { class: 'barra ganas' }, h('span', { class: 'etq' }, texto('rana.ganas')), h('span', { class: 'lleno' }));
  const cuentaEl = h('span', { class: 'cuenta' });
  const municion = h('div', { class: 'municion' }, h('span', { class: 'icono' }), cuentaEl);
  (municion.firstChild as HTMLElement).innerHTML = icono('jamon');
  const aviso = h('div', { class: 'aviso-cerdos', hidden: true });
  const saltar = h('button', { class: 'btn fantasma saltar', hidden: true }, texto('minijuego.saltar'));
  const cerrar = h('button', { class: 'cerrar', 'aria-label': texto('boton.cerrar') }, '×');
  const inf = op.infinito;
  const puntos = inf ? marcador(inf) : null;
  ganasEl.hidden = !!inf;
  const capa = h('div', { class: 'cubierta minijuego rana' }, lienzo, h('p', { class: 'instrucciones' }, texto('rana.instrucciones')), ganasEl, municion, ...(puntos ? [puntos.el] : []), aviso, saltar, cerrar);
  parent.append(capa);
  const ctx = lienzo.getContext('2d')!;

  // ---------------------------------------------------------------- screen and bitmaps
  let vw = 1920;
  let escala = 1;
  let m = F.mundo(vw);
  let generacion = 0;
  const bmp: {
    fondo?: HTMLCanvasElement;
    caras: Partial<Record<Cara, HTMLCanvasElement>>;
    cola?: HTMLCanvasElement;
    pantalla?: HTMLCanvasElement;
    cortina?: HTMLCanvasElement;
    taco?: HTMLCanvasElement;
    fran: Partial<Record<PoseFran, HTMLCanvasElement>>;
    brillo?: HTMLCanvasElement;
    charco?: HTMLCanvasElement;
    nam?: HTMLCanvasElement;
  } = { caras: {}, fran: {} };
  /** Fran: scale, where his feet go, and his hand in each pose (art units). */
  const fran = { k: 2.6, x: 0, manos: {} as Record<string, { x: number; y: number }> };

  const preparar = async () => {
    const gen = ++generacion;
    const k = escala;
    const ok = () => gen === generacion;
    bmp.brillo = bitmapBrillo(320 * k, 'rgba(255,214,150,A)', 0.42);
    bmp.charco = bitmapBrillo(260 * k, 'rgba(255,200,130,A)', 0.3);
    bmp.nam = bitmapTexto(texto('rana.nam'), 56 * k, '#ffd27a');
    // Fran first: his hand at rest decides where he stands.
    const cuerpos: Partial<Record<PoseFran, HTMLCanvasElement>> = {};
    for (const nombre of Object.keys(POSES_FRAN) as PoseFran[]) {
      const p = POSES_FRAN[nombre];
      const { svg, M } = enPose(op.cuerpoFran(p.animo), op.joints, p.h);
      const [mx, my] = op.joints.mano_delante;
      const mano = M.mano_delante.transformPoint(new DOMPoint(mx + 4, my + 10));
      fran.manos[nombre] = { x: mano.x, y: mano.y };
      if (nombre === 'reposo') {
        fran.k = (m.ancla.y - FRAN_PIES) / mano.y;
        fran.x = m.ancla.x - mano.x * fran.k;
      }
      const c = await silueta(svg, VB_FRAN.h * fran.k * k, null, VB_FRAN).catch(() => null);
      if (!ok()) return;
      if (c) cuerpos[nombre] = c;
    }
    bmp.fran = cuerpos;
    const kp = ESCALA_PERRO * k;
    for (const cara of Object.keys(CARAS) as Cara[]) {
      const c = await svgDe(VB_PERRO, kp, sentada(CARAS[cara])).catch(() => null);
      if (!ok()) return;
      if (c) bmp.caras[cara] = c;
    }
    bmp.cola = await svgDe(VB_COLA, kp, colaSentada());
    bmp.pantalla = await svgDe({ x: -62, y: -36, w: 124, h: 96 }, k, pantalla());
    bmp.cortina = await svgDe({ x: -60, y: -4, w: 120, h: 570 }, k, cortina());
    bmp.taco = await svgDe({ x: -21, y: -21, w: 42, h: 42 }, k, taquito());
    const f = await svgDe({ x: 0, y: 0, w: vw, h: H }, k, fondo(m, F.SUELO).replace(/^<svg[^>]*>|<\/svg>$/g, ''));
    // The poster's lettering, with the game fonts, as in the flat.
    const C = cartel(m);
    const x = f.getContext('2d')!;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (const tx of POSTER_TEXTS) {
      x.setTransform(k * C.s, 0, 0, k * C.s, (C.x - 1852 * C.s) * k, (C.y - 250 * C.s) * k);
      x.font = `400 ${tx.size}px ${FONTS[tx.font as keyof typeof FONTS]}`;
      x.fillStyle = tx.color;
      x.fillText(tx.s, tx.x, tx.y, tx.maxW);
    }
    if (ok()) bmp.fondo = f;
  };

  const medir = () => {
    const r = capa.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.8;
    lienzo.width = Math.max(2, Math.round(r.width * dpr));
    lienzo.height = Math.max(2, Math.round(r.height * dpr));
    escala = lienzo.height / H;
    vw = lienzo.width / escala;
    m = F.mundo(vw);
    bmp.fondo = undefined;
    void preparar();
  };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(capa);

  // ---------------------------------------------------------------- state
  let t = 0; // the dog's clock (stops during announcements)
  let tramo = 1;
  let comidos = 0;
  let quedan = PAQUETE;
  let rondasPerdidas = 0;
  let tacos: Taco[] = [];
  let migas: Miga[] = [];
  let pops: Array<{ x: number; y: number; t: number }> = [];
  let ocioso = 0;
  let pose: PoseFran = 'reposo';
  let poseHasta = 0;
  let cara: Cara | null = null;
  let caraHasta = 0;
  let alegria = 0; // tail wagging after a catch
  let trago = 0; // the gulp
  let reloj = 0; // animation time, always running
  let pausa = 0;
  let terminado: Resultado | null = null;
  let tras: null | (() => void) = null;
  let fotogramas = 0;
  let avisoSuelo = false;
  let apunta: null | { x0: number; y0: number; x: number; y: number } = null;
  let hojas: Array<{ x: number; y: number; vy: number; f: number }> = [];
  let vidas = VIDAS;
  /**
   * Endless: catches past the story's eight make her routine quicker (her clock
   * runs faster) and the draught stronger, up to a point. Always 1 in the story.
   */
  const extra = () => (inf ? Math.max(0, comidos - META) : 0);
  const ritmo = () => 1 + Math.min(1, 0.06 * extra());
  const fuerza = () => 1 + Math.min(0.8, 0.05 * extra());
  const vientoAhora = () => F.vientoEn(tramo, t) * fuerza();

  const mostrar = (clave: string, s = 1.2, luego?: () => void, vars: Record<string, string | number> = {}) => {
    const variantes = texto(clave, vars).split(' / ');
    aviso.textContent = variantes[Math.floor(Math.random() * variantes.length)];
    aviso.hidden = false;
    aviso.classList.remove('salta');
    void aviso.offsetWidth;
    aviso.classList.add('salta');
    pausa = op.rapido ? 0.05 : s;
    tras = luego ?? null;
  };
  const ponerPose = (p: PoseFran, s: number) => {
    pose = p;
    poseHasta = reloj + s;
  };
  const ponerCara = (c: Cara, s: number) => {
    cara = c;
    caraHasta = reloj + s;
  };
  const vuela = () => tacos.some((x) => x.estado === 'vuela');
  const masca = () => cara === 'masca' && reloj < caraHasta;
  const bocaAbierta = (dt = 0) => !masca() && F.bocaAbierta(tramo, t + dt * ritmo());
  const perro = (dt = 0) => F.perroEn(m, tramo, t + dt * ritmo());

  const empezarRonda = () => {
    tramo = 1;
    comidos = 0;
    quedan = PAQUETE;
    t = 0;
    tacos = [];
    m.lampara.th = 0;
    m.lampara.w = 0;
    mostrar('rana.tramo1', 1.6);
  };
  empezarRonda();

  const lanzar = () => {
    if (!apunta) return;
    const px = apunta.x - apunta.x0;
    const py = apunta.y - apunta.y0;
    apunta = null;
    if (Math.hypot(px, py) < 30 || quedan <= 0 || vuela() || pausa > 0 || terminado) {
      ponerPose('reposo', 0);
      return;
    }
    tacos.push({ ...F.nuevoTaco(m, px, py), fuera: 0, tocoSuelo: false });
    if (!inf) quedan--;
    ocioso = 0;
    ponerPose('lanza', 0.35);
  };

  const comido = (x: number, y: number) => {
    comidos++;
    puntos?.sumar(1);
    alegria = 1.6;
    trago = 1;
    ponerCara('masca', 0.75);
    ponerPose('contento', 0.9);
    pops.push({ x, y: y - 30, t: 0 });
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const v = 160 + Math.random() * 240;
      migas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, c: i % 3 ? '#c8505a' : '#f6e6d6' });
    }
    if (inf) {
      if (comidos < META && comidos % POR_TRAMO === 0) {
        tramo = comidos / POR_TRAMO + 1;
        t = 0;
        mostrar(`rana.tramo${tramo}`, 1.6);
      } else if (comidos >= META && (comidos - META) % NIVEL_CADA === 0) mostrar('infinito.nivel', 1.2, undefined, { n: 2 + (comidos - META) / NIVEL_CADA });
    } else if (comidos >= META) {
      terminado = 'hecho';
      mostrar('rana.gana', 2.4);
    } else if (comidos % POR_TRAMO === 0) {
      tramo = comidos / POR_TRAMO + 1;
      // Her new routine starts from where she is now (every stretch starts still at 0).
      t = 0;
      mostrar(`rana.tramo${tramo}`, 1.6);
    }
  };

  // ---------------------------------------------------------------- input
  const logico = (e: PointerEvent) => {
    const r = lienzo.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * vw, y: ((e.clientY - r.top) / r.height) * H };
  };
  lienzo.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (terminado || vuela() || quedan <= 0) return;
    lienzo.setPointerCapture?.(e.pointerId);
    const p = logico(e);
    apunta = { x0: p.x, y0: p.y, x: p.x, y: p.y };
    ponerPose('apunta', 99);
  });
  lienzo.addEventListener('pointermove', (e) => {
    if (!apunta) return;
    const p = logico(e);
    apunta.x = p.x;
    apunta.y = p.y;
  });
  lienzo.addEventListener('pointerup', lanzar);
  lienzo.addEventListener('pointercancel', () => {
    apunta = null;
    ponerPose('reposo', 0);
  });

  const css = () => {
    const r = lienzo.getBoundingClientRect();
    return { r, k: r.height / H };
  };
  (window as unknown as { __rana?: () => EstadoRana }).__rana = () => {
    const { r, k } = css();
    const P = perro();
    return {
      ancla: { x: r.left + m.ancla.x * k, y: r.top + m.ancla.y * k },
      boca: { x: r.left + (P.x + F.PERRO.boca.dx) * k, y: r.top + (P.y + F.PERRO.boca.dy) * k, r: F.PERRO.boca.r * k },
      abierta: bocaAbierta(),
      tramo,
      comidos,
      quedan,
      vuela: vuela(),
      listo: !!bmp.fondo && pausa <= 0 && !terminado,
      rondasPerdidas,
      fotogramas,
      escala: k,
      prever: (px, py) => {
        const tr = F.trayectoria(m, px / k, py / k, { perro: { x: -1e6, y: -1e6 }, viento: vientoAhora(), boca: true }, 3, 1 / 60);
        return { puntos: tr.puntos.map((p) => ({ x: r.left + p.x * k, y: r.top + p.y * k, t: p.t })), ev: tr.ev };
      },
      bocaEn: (dt) => {
        const Q = perro(dt);
        return { x: r.left + (Q.x + F.PERRO.boca.dx) * k, y: r.top + (Q.y + F.PERRO.boca.dy) * k, abierta: bocaAbierta(dt) };
      },
    };
  };

  // ---------------------------------------------------------------- drawing
  /** Draw a bitmap made at `escala` with its art origin `o` (art units × k) at logical (x, y). */
  const dibujar = (img: HTMLCanvasElement | undefined, x: number, y: number, ox: number, oy: number, sx = 1, sy = 1, rot = 0, alfa = 1) => {
    if (!img) return;
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
    ctx.globalAlpha = alfa;
    ctx.drawImage(img, -ox, -oy, img.width / escala, img.height / escala);
    ctx.globalAlpha = 1;
  };

  const pintar = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!bmp.fondo) {
      ctx.fillStyle = '#2a2622';
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      return;
    }
    ctx.drawImage(bmp.fondo, 0, 0);
    const L = m.lampara;
    const S = F.pantalla(L);
    // Warm light from the shade: on the wall around it and in a pool below, swinging with it.
    ctx.globalCompositeOperation = 'lighter';
    dibujar(bmp.brillo, S.x, S.y + 20, 320, 320);
    dibujar(bmp.charco, S.x + Math.sin(L.th) * 600, F.SUELO + 30, 260, 260, 1.6, 0.35);
    ctx.globalCompositeOperation = 'source-over';
    // The curtains: still, or blown by the draught.
    const T = puertaTerraza(vw);
    const viento = vientoAhora();
    for (const [x, fase] of [[T.x0 - 30, 0], [T.x1 + 30, 1.7]] as const) {
      const sopla = (viento / 600) * 0.45 + Math.sin(reloj * (tramo === 4 ? 3.1 : 0.8) + fase) * (tramo === 4 ? 0.05 : 0.012);
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.translate(x, T.y0 - 22);
      ctx.transform(1, 0, Math.tan(sopla), 1, 0, 0);
      if (bmp.cortina) ctx.drawImage(bmp.cortina, -60, -4, bmp.cortina.width / escala, bmp.cortina.height / escala);
    }
    // The draught: leaves blown in from the terrace.
    if (tramo === 4) {
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.fillStyle = '#8a9a5a';
      for (const hj of hojas) {
        ctx.save();
        ctx.translate(hj.x, hj.y);
        ctx.rotate(hj.f);
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Which way it blows, and how hard.
      const ax = (T.x0 + T.x1) / 2;
      const ay = 230;
      const len = (viento / 600) * 260;
      ctx.strokeStyle = 'rgba(255,246,224,0.9)';
      ctx.fillStyle = 'rgba(255,246,224,0.9)';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      for (const dy of [-22, 0, 22]) {
        ctx.beginPath();
        ctx.moveTo(ax - len / 2, ay + dy);
        ctx.quadraticCurveTo(ax, ay + dy + Math.sin(reloj * 6 + dy) * 8, ax + len / 2, ay + dy);
        ctx.stroke();
      }
      if (Math.abs(len) > 20) {
        const sg = Math.sign(len);
        ctx.beginPath();
        ctx.moveTo(ax + len / 2 + sg * 30, ay);
        ctx.lineTo(ax + len / 2 - sg * 6, ay - 26);
        ctx.lineTo(ax + len / 2 - sg * 6, ay + 26);
        ctx.fill();
      }
    }
    // Aceituna: her tail, then her, mirrored to face Fran.
    const P = perro();
    const kp = ESCALA_PERRO;
    const ahora: Cara = cara && reloj < caraHasta ? cara : bocaAbierta() ? 'espera' : 'cerrada';
    const meneo = ahora === 'digna' ? -0.25 : Math.sin(reloj * (alegria > 0 ? 22 : 5)) * (alegria > 0 ? 0.55 : 0.18);
    const squash = 1 - 0.06 * Math.sin(Math.min(1, 1 - trago) * Math.PI) * (trago > 0 ? 1 : 0);
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.translate(P.x, P.y);
    ctx.scale(-kp, kp * squash);
    if (bmp.cola) {
      ctx.save();
      ctx.translate(PIVOTE_COLA.x, PIVOTE_COLA.y);
      ctx.rotate(meneo);
      ctx.drawImage(bmp.cola, VB_COLA.x - PIVOTE_COLA.x, VB_COLA.y - PIVOTE_COLA.y, VB_COLA.w, VB_COLA.h);
      ctx.restore();
    }
    const img = bmp.caras[ahora] ?? bmp.caras.espera;
    if (img) ctx.drawImage(img, VB_PERRO.x, VB_PERRO.y, VB_PERRO.w, VB_PERRO.h);
    // The lamp's cable and shade.
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.strokeStyle = '#141418';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(L.pivote.x, L.pivote.y);
    ctx.lineTo(S.x - Math.sin(L.th) * 30, S.y - Math.cos(L.th) * 30);
    ctx.stroke();
    if (bmp.pantalla) dibujar(bmp.pantalla, S.x, S.y - 4, 62, 36, 1, 1, -L.th);
    // The ham in the air (and fading on the floor), with its shadow on the floor.
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    for (const tc of tacos) {
      const alto = Math.max(0, F.SUELO - tc.y);
      const k = Math.max(0.25, 1 - alto / 900);
      ctx.fillStyle = `rgba(20,12,8,${(0.35 * k * (1 - tc.fuera)).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(tc.x, F.SUELO + 10, 20 * k, 6 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const tc of tacos) dibujar(bmp.taco, tc.x, tc.y, 21, 21, 1, 1, tc.ang, 1 - tc.fuera);
    // Fran, and the cube in his hand when he has one.
    const fp = bmp.fran[pose] ?? bmp.fran.reposo;
    if (fp) dibujar(fp, fran.x, FRAN_PIES, -VB_FRAN.x * fran.k, -VB_FRAN.y * fran.k);
    const enMano = (pose === 'apunta' || pose === 'reposo' || pose === 'contento') && quedan > 0 && !vuela() && !terminado;
    if (enMano) {
      const mn = fran.manos[pose];
      dibujar(bmp.taco, fran.x + mn.x * fran.k, FRAN_PIES + mn.y * fran.k - 8, 21, 21, 0.9, 0.9, 0.3);
    }
    // The aim: where the finger went down, the pull, and the dotted path.
    if (apunta) {
      const px = apunta.x - apunta.x0;
      const py = apunta.y - apunta.y0;
      const l = Math.hypot(px, py);
      const c = l > F.TIRON_MAX ? F.TIRON_MAX / l : 1;
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.strokeStyle = 'rgba(255,246,224,0.55)';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 12]);
      ctx.beginPath();
      ctx.moveTo(apunta.x0, apunta.y0);
      ctx.lineTo(apunta.x0 + px * c, apunta.y0 + py * c);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,246,224,0.35)';
      ctx.beginPath();
      ctx.arc(apunta.x0, apunta.y0, 22, 0, Math.PI * 2);
      ctx.fill();
      if (l >= 30) {
        const tr = F.trayectoria(m, px, py, { perro: { x: -1e6, y: -1e6 }, viento, boca: true }, VISTA[tramo], 1 / 24);
        tr.puntos.forEach((p, i) => {
          if (i === 0) return;
          const a = 1 - p.t / (VISTA[tramo] + 0.05);
          ctx.fillStyle = `rgba(255,246,224,${(0.9 * a).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7 - 3 * (1 - a), 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
    // Crumbs and «¡Ñam!».
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    for (const g of migas) {
      ctx.globalAlpha = Math.max(0, 1 - g.t * 1.4);
      ctx.fillStyle = g.c;
      ctx.fillRect(g.x - 4, g.y - 3, 8, 6);
    }
    ctx.globalAlpha = 1;
    if (bmp.nam) for (const p of pops) dibujar(bmp.nam, p.x, p.y - p.t * 90, bmp.nam.width / escala / 2, bmp.nam.height / escala / 2, 1 + 0.25 * Math.min(1, p.t * 6), 1 + 0.25 * Math.min(1, p.t * 6), -0.12, Math.max(0, 1 - p.t * 1.1));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // HUD.
    (ganasEl.lastChild as HTMLElement).style.width = `${(comidos / META) * 100}%`;
    cuentaEl.textContent = inf ? '♥'.repeat(Math.max(0, vidas)) : `× ${quedan}`;
  };

  // ---------------------------------------------------------------- loop
  return new Promise((resolve) => {
    let ultimo = performance.now();
    let vivo = true;
    const fin = (r: Resultado) => {
      if (!vivo) return;
      vivo = false;
      ro.disconnect();
      delete (window as unknown as { __rana?: unknown }).__rana;
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
      alegria = Math.max(0, alegria - dt);
      trago = Math.max(0, trago - dt * 3);
      if (pose !== 'apunta' && reloj > poseHasta) pose = 'reposo';
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
        t += dt * ritmo();
        if (!apunta && !vuela()) ocioso += dt;
        // Dithering: Fran helps himself (not in the endless version: no pack to run out of).
        if (ocioso > GULA && quedan > 0 && !inf) {
          ocioso = 0;
          quedan--;
          ponerPose('come', 1.3);
          mostrar('rana.gula', 1.3);
        }
        // Out of ham with no catch to spare: another pack, from the start.
        if (quedan <= 0 && !vuela() && comidos < META) {
          rondasPerdidas++;
          if (rondasPerdidas >= 2) saltar.hidden = false;
          mostrar('rana.pierde', 2, empezarRonda);
        }
      }
      // The room's physics runs all the time (the shade keeps swinging).
      const t0 = t;
      const r0 = ritmo();
      const eventos = F.paso(m, tacos, dt, {
        perroEn: (hh: number) => F.perroEn(m, tramo, t0 + (pausa > 0 ? 0 : hh * r0)),
        bocaEn: (hh: number) => !masca() && F.bocaAbierta(tramo, t0 + hh * r0),
        viento: vientoAhora(),
      });
      for (const { taco, ev } of eventos as Array<{ taco: Taco; ev: string }>) {
        if (ev === 'boca') {
          const P = perro();
          comido(P.x + F.PERRO.boca.dx, P.y + F.PERRO.boca.dy);
        } else if (ev === 'cabeza' || ev === 'hocico') ponerCara('golpe', 0.6);
        else if (ev === 'suelo') taco.tocoSuelo = true;
      }
      for (const tc of tacos) {
        if (tc.estado === 'comido') tc.fuera = 1;
        else if (tc.estado === 'quieto') {
          if (inf && !tc.perdido && !terminado) {
            // Endless: one she did not catch.
            tc.perdido = true;
            vidas--;
            ponerCara('digna', 1.1);
            if (vidas <= 0) {
              terminado = 'hecho';
              mostrar('rana.infinito.fin', 2.2);
            } else mostrar('rana.infinito.fallo', 0.8);
          } else if (!inf && tc.fuera === 0 && tc.tocoSuelo && !masca()) {
            // On the floor? She will not stoop to that.
            ponerCara('digna', 1.1);
            if (!avisoSuelo && !terminado) {
              avisoSuelo = true;
              mostrar('rana.suelo', 1.4);
            }
          }
          tc.fuera = Math.min(1, tc.fuera + dt * 0.9);
        }
      }
      tacos = tacos.filter((tc) => tc.fuera < 1);
      for (const g of migas) {
        g.vy += F.G * 0.5 * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.t += dt;
      }
      migas = migas.filter((g) => g.t < 0.8);
      for (const p of pops) p.t += dt;
      pops = pops.filter((p) => p.t < 1);
      if (tramo === 4) {
        const T = puertaTerraza(vw);
        const v = vientoAhora();
        if (hojas.length < 14 && Math.random() < dt * 6) hojas.push({ x: v > 0 ? T.x0 + 40 : T.x1 - 40, y: 260 + Math.random() * 560, vy: 20 + Math.random() * 50, f: Math.random() * 6 });
        for (const hj of hojas) {
          hj.x += v * 1.5 * dt;
          hj.y += hj.vy * dt;
          hj.f += dt * 4;
        }
        hojas = hojas.filter((hj) => hj.x > -40 && hj.x < vw + 40 && hj.y < F.SUELO);
      }
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
