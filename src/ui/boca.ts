// «Vero se traga a Fran» (capítulo 2, tramo final): el plano del tráiler, la boca de Vero tan cerca que llena la
// pantalla (`dibujarVero`, src/ui/trailer.ts), pero a mitad de camino: la boca se abre del todo, Fran sube
// hasta ella y desaparece dentro; los otros tres saltan detrás. Entran como personas (el cuerpo entero de
// siempre) y, al cruzar los dientes, se rompen en trozos que salen disparados y se recomponen, dentro de la
// oscuridad, en su figura del mundo de los conceptos (src/arte/conceptos.mjs): Fran, la jarra; Pablo, la
// espiral con su aro; Chuchi, la bola con las gafas; Guille, la flor. Ahí se quedan flotando. Entre una fase y
// otra el guion habla (el cuadro de diálogo queda por encima: esta capa está por debajo de él), y al final la
// cámara se lanza dentro y todo se queda negro.
//
//   const boca = abrirBoca(root, { sonido, rapido });
//   await boca.abre();      la boca se abre
//   await boca.tragaFran(); Fran sube, cruza los dientes y se hace jarra
//   await boca.saltan();    Pablo, Chuchi y Guille saltan detrás y se hacen figura
//   await boca.bucea();     la cámara se lanza dentro: negro
//   boca.cerrar();
//
// Rendimiento (docs/ESTILO.md, T5): los cuerpos y las figuras se hacen una vez como bitmaps (`silueta` y
// `svgABitmap`); el fotograma dibuja la boca (unos pocos trazos de canvas, como el tráiler), esos bitmaps y unos
// cuantos trozos de color (rellenos de canvas). Nada de SVG por fotograma. El bucle no pasa de 60 fps.
import { h } from './hud';
import { esVertical } from './orientacion';
import { dibujarVero } from './trailer';
import { REPARTO, type PjId } from '../juego/reparto';
import { silueta, svgABitmap } from '../motor/sprites';
import * as A from '../arte/conceptos.mjs';
import type { SonidoMinijuego } from '../core/audio';

export interface OpcionesBoca {
  sonido?: SonidoMinijuego;
  /** Para las pruebas: sin esperas. */
  rapido?: boolean;
}

export interface Boca {
  abre(): Promise<void>;
  tragaFran(): Promise<void>;
  saltan(): Promise<void>;
  bucea(): Promise<void>;
  /** Se va con un fundido (quien llama ya ha puesto lo siguiente debajo) y se cierra. */
  fundir(): Promise<void>;
  cerrar(): void;
}

type Fase = 'abre' | 'quieta' | 'traga' | 'saltan' | 'bucea' | 'negro';

/** Dónde espera cada uno, como persona (fracciones de la pantalla), y dónde se queda flotando ya hecho figura. */
const SITIOS: Record<PjId, { x: number; y: number }> = {
  fran: { x: 0.5, y: 0.57 },
  pablo: { x: 0.15, y: 0.5 },
  chuchi: { x: 0.85, y: 0.5 },
  guille: { x: 0.31, y: 0.58 },
};
const FIGURAS: Record<PjId, { x: number; y: number }> = {
  pablo: { x: 0.3, y: 0.645 },
  fran: { x: 0.435, y: 0.66 },
  guille: { x: 0.565, y: 0.655 },
  chuchi: { x: 0.695, y: 0.645 },
};
const IDS: PjId[] = ['fran', 'pablo', 'chuchi', 'guille'];
const SALTAN: PjId[] = ['pablo', 'chuchi', 'guille'];
/** Segundos de cada fase. */
const DURACION = { abre: 1.5, traga: 2.1, salto: 1.7, entre: 0.6, bucea: 1.35 };
/** Instante de dibujarVero en el que la boca está abierta del todo, y en el que acaba su zambullida. */
const S_ABIERTA = 1.5;
const S_BUCEO = 1.6;
/** El cruce de los dientes: a qué altura (fracción de la pantalla) se rompen. */
const Y_DIENTES = 0.54;
/** Tiempos del salto (0..1): se acerca, se rompe y lanza los trozos, los trozos se recomponen, la figura se asienta. */
const T_ROMPE = 0.4;
const T_VUELVEN = 0.62;
const T_FIGURA = 0.88;
/** Trozos de cuerpo en cada eje, al romperse. */
const COLS = 3;
const FILAS = 4;

interface Trozo {
  a: number;
  v: number;
  r: number;
  giro: number;
  forma: number;
  /** Dónde se pone al recomponerse, alrededor del centro de la figura. */
  ra: number;
  rd: number;
  col: number;
}

const azar = (sem: number) => {
  let s = sem;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
};

const trozos = (n: number, sem: number): Trozo[] => {
  const az = azar(sem);
  return Array.from({ length: n }, () => ({
    a: az() * Math.PI * 2,
    v: 0.25 + az() * 0.6,
    r: 0.006 + az() * 0.011,
    giro: (az() - 0.5) * 12,
    forma: Math.floor(az() * 3),
    ra: az() * Math.PI * 2,
    rd: az() * 0.5,
    col: Math.floor(az() * 3),
  }));
};

/** Un dibujo de `conceptos.mjs` ya hecho bitmap: `c` cubre el cuadro (x, y, w, h), en píxeles CSS de la pantalla. */
interface Bmp {
  c: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Dibujo {
  x: number;
  y: number;
  w: number;
  h: number;
  svg: string;
}

/** Lo de cada uno: su cuerpo de siempre, su figura (con la pieza que gira aparte, si la tiene) y su resplandor. */
interface Juego {
  persona: HTMLCanvasElement;
  figura: Bmp;
  extra?: Bmp;
  brillo: HTMLCanvasElement;
}

/** Hornea un dibujo para que su lado mayor mida `lado` píxeles CSS, con `res` píxeles de bitmap por píxel CSS. */
const hornear = async (d: Dibujo, lado: number, res: number): Promise<Bmp> => {
  const s = lado / Math.max(d.w, d.h);
  const svg = d.svg.replace(/ width="[^"]*" height="[^"]*"/, ` width="${Math.ceil(d.w * s * res)}" height="${Math.ceil(d.h * s * res)}"`);
  return { c: await svgABitmap(svg, d.w * s * res, d.h * s * res), x: d.x * s, y: d.y * s, w: d.w * s, h: d.h * s };
};

const resplandor = (color: string, r: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(2, Math.ceil(r * 2));
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, color + 'cc');
  g.addColorStop(0.5, color + '44');
  g.addColorStop(1, color + '00');
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  return c;
};

/** Qué dibujos de `conceptos.mjs` son cada figura (y la pieza que gira aparte, con su tamaño respecto a la figura). */
const DIBUJOS: Record<PjId, { figura: () => Dibujo; extra?: () => Dibujo }> = {
  fran: { figura: A.jarraFran },
  pablo: { figura: A.espiralPablo, extra: A.aroPablo },
  chuchi: { figura: A.circuloChuchi, extra: A.agujaChuchi },
  guille: { figura: A.florGuille },
};
const COLOR_FIGURA: Record<PjId, string> = {
  fran: A.COLORES.fran.claro,
  pablo: A.COLORES.pablo.aro,
  chuchi: A.COLORES.chuchi.sudadera,
  guille: A.COLORES.guille.claro,
};
/** Los colores de los trozos de cada uno (de su figura). */
const PALETA: Record<PjId, string[]> = {
  fran: [A.COLORES.fran.principal, A.COLORES.fran.claro, A.COLORES.fran.barba],
  pablo: [A.COLORES.pablo.principal, A.COLORES.pablo.borrego, A.COLORES.pablo.aro],
  chuchi: [A.COLORES.chuchi.sudadera, A.COLORES.chuchi.principal, A.COLORES.chuchi.gafas],
  guille: [A.COLORES.guille.principal, A.COLORES.guille.claro, A.COLORES.guille.hibisco],
};
const NUM: Record<PjId, number> = { fran: 0, pablo: 1, chuchi: 2, guille: 3 };

const suave = (u: number) => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

export function abrirBoca(root: HTMLElement, o: OpcionesBoca = {}): Boca {
  const canvas = h('canvas', { class: 'plano', 'aria-hidden': 'true' });
  const capa = h('div', { class: 'capa-boca' }, canvas);
  root.append(capa);
  const ctx = canvas.getContext('2d')!;
  let W = 0;
  let Hh = 0;
  let dpr = 1;
  const juegos = new Map<PjId, Juego>();
  /** Alto de una persona y lado de una figura, en píxeles CSS. */
  let ALTO_P = 0;
  let LADO_F = 0;
  let generacion = 0;
  const soltar = () => {
    for (const j of juegos.values()) {
      j.persona.width = j.persona.height = 0;
      j.figura.c.width = j.figura.c.height = 0;
      if (j.extra) j.extra.c.width = j.extra.c.height = 0;
      j.brillo.width = j.brillo.height = 0;
    }
    juegos.clear();
  };
  const medir = async () => {
    const caja = capa.getBoundingClientRect();
    const w = Math.max(2, caja.width);
    const hh = Math.max(2, caja.height);
    const d = Math.min(window.devicePixelRatio || 1, 2);
    if (w === W && hh === Hh && d === dpr && juegos.size) return;
    W = w;
    Hh = hh;
    dpr = d;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(Hh * dpr);
    ALTO_P = Hh * 0.34;
    LADO_F = Hh * 0.22;
    const gen = ++generacion;
    const res = Math.min(dpr, 1.5);
    const hechos = await Promise.all(
      IDS.map(async (id) => {
        const ficha = REPARTO[id];
        const dib = DIBUJOS[id];
        const fig = dib.figura();
        const ext = dib.extra?.();
        const [persona, figura, extra] = await Promise.all([
          silueta(ficha.arte.body({}, ficha.ropa), ALTO_P * res, null),
          hornear(fig, LADO_F, res * 1.3),
          // La pieza que gira aparte se hornea a la misma escala que la figura (su lado, en proporción).
          ext ? hornear(ext, (LADO_F * Math.max(ext.w, ext.h)) / Math.max(fig.w, fig.h), res * 1.3) : Promise.resolve(undefined),
        ]);
        return [id, { persona, figura, extra, brillo: resplandor(COLOR_FIGURA[id], LADO_F * 1.1 * res) } as Juego] as const;
      }),
    );
    if (gen !== generacion || cerrado) return;
    soltar();
    for (const [id, j] of hechos) juegos.set(id, j);
  };
  let cerrado = false;
  const lista = medir();
  const ro = new ResizeObserver(() => void medir());
  ro.observe(capa);

  let fase: Fase = 'abre';
  let t0 = 0;
  let sv = 0;
  let pendiente: (() => void) | null = null;
  let tiempo = 0;
  let ultimo = 0;
  /** Fran ya está dentro (hecho jarra) y los otros tres ya han saltado. */
  let franDentro = false;
  let saltaron = false;
  const fragmentos = new Map<PjId, Trozo[]>(IDS.map((id, i) => [id, trozos(26, 11 + i * 7)]));
  const rapido = !!o.rapido;

  const termina = (f: Fase) => {
    if (fase === 'traga') franDentro = true;
    if (fase === 'saltan') saltaron = true;
    fase = f;
    t0 = tiempo;
    const p = pendiente;
    pendiente = null;
    p?.();
  };
  const esperar = (): Promise<void> => (rapido ? Promise.resolve() : new Promise((r) => (pendiente = r)));

  // La boca (degradados y trazos de `dibujarVero`) solo cambia mientras se abre y se lanza: el resto del tiempo se
  // pinta una vez en un lienzo aparte y cada fotograma lo copia (solo se mueven las personas y las figuras).
  let fondo: HTMLCanvasElement | null = null;
  let fondoSv = -1;
  const pintarBoca = () => {
    if (fase === 'abre' || fase === 'bucea') return dibujarVero(ctx, W, Hh, sv);
    if (!fondo || fondoSv !== sv || fondo.width !== canvas.width || fondo.height !== canvas.height) {
      fondo ??= document.createElement('canvas');
      fondo.width = canvas.width;
      fondo.height = canvas.height;
      const c = fondo.getContext('2d')!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      dibujarVero(c, W, Hh, sv);
      fondoSv = sv;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fondo, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  /** Una persona entera (su cuerpo de siempre), centrada en (x, y). */
  const persona = (id: PjId, x: number, y: number, k: number, a = 1, rot = 0) => {
    const j = juegos.get(id);
    if (!j || k <= 0.01 || a <= 0) return;
    const hh = ALTO_P * k;
    const ww = (j.persona.width / j.persona.height) * hh;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(j.persona, -ww / 2, -hh / 2, ww, hh);
    ctx.restore();
  };

  /** Una figura ya hecha: su resplandor, su pieza que gira y ella misma, flotando en la oscuridad. */
  const figura = (id: PjId, x: number, y: number, k = 1, a = 1, giro = 0) => {
    const j = juegos.get(id);
    if (!j || k <= 0.01 || a <= 0) return;
    const f = j.figura;
    const t = tiempo + NUM[id] * 1.7;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = a * (0.55 + 0.2 * Math.sin(t * 2.2));
    ctx.globalCompositeOperation = 'lighter';
    const rb = LADO_F * 1.1 * k;
    ctx.drawImage(j.brillo, -rb, -rb, rb * 2, rb * 2);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    ctx.scale(k, k);
    // Cada una a su manera: la jarra se mece, la espiral y la flor giran, la bola se balancea y su aguja da el segundo.
    const rot = id === 'fran' ? Math.sin(t * 1.3) * 0.28 : id === 'chuchi' ? Math.sin(t * 1.1) * 0.22 : t * (id === 'pablo' ? 0.9 : 0.6);
    if (j.extra && id === 'chuchi') {
      ctx.save();
      ctx.rotate(Math.floor(t * 2) * (Math.PI / 6));
      ctx.drawImage(j.extra.c, j.extra.x, j.extra.y, j.extra.w, j.extra.h);
      ctx.restore();
    }
    ctx.rotate(rot + giro);
    ctx.drawImage(f.c, f.x, f.y, f.w, f.h);
    ctx.restore();
    if (j.extra && id === 'pablo') {
      // El aro del pendiente le da vueltas.
      const ex = j.extra;
      ctx.save();
      ctx.globalAlpha = a;
      const ang = t * 1.9;
      ctx.translate(x + Math.cos(ang) * LADO_F * 0.5 * k, y + Math.sin(ang) * LADO_F * 0.4 * k);
      ctx.rotate(ang * 1.3);
      ctx.scale(k, k);
      ctx.drawImage(ex.c, ex.x, ex.y, ex.w, ex.h);
      ctx.restore();
    }
  };

  /** Dónde flota una figura ya hecha (con su vaivén). */
  const reposo = (id: PjId) => ({
    x: FIGURAS[id].x * W + Math.sin(tiempo * 0.7 + NUM[id] * 2) * W * 0.008,
    y: FIGURAS[id].y * Hh + Math.sin(tiempo * 1.1 + NUM[id] * 1.3) * Hh * 0.016,
  });

  /**
   * El salto de uno de ellos, de `k` = 0 a 1: viene de donde espera como persona, cruza los dientes, se rompe en
   * trozos (del cuerpo y de colores) que salen disparados, los trozos se recomponen en su figura y esta se asienta.
   */
  const salta = (id: PjId, k: number, giraAl: number) => {
    const j = juegos.get(id);
    if (!j) return;
    const x0 = SITIOS[id].x * W;
    const y0 = SITIOS[id].y * Hh;
    const fx = FIGURAS[id].x * W;
    const fy = FIGURAS[id].y * Hh;
    const xc = fx + (0.5 - FIGURAS[id].x) * W * 0.15;
    const yc = Y_DIENTES * Hh;
    if (k < T_ROMPE) {
      // Se acerca en arco, encogiéndose y girando.
      const e = suave(k / T_ROMPE);
      const x = x0 + (xc - x0) * e;
      const y = y0 + (yc - y0) * e - Math.sin(e * Math.PI) * Hh * 0.2;
      return persona(id, x, y, 1 - 0.38 * e, 1, e * giraAl * 0.25);
    }
    const ts = fragmentos.get(id)!;
    const b = suave((k - T_ROMPE) / (T_VUELVEN - T_ROMPE + 0.18));
    // El cuerpo se hace tiras: cada trozo sale de donde estaba en la persona, empujado desde el punto del cruce.
    if (k < T_VUELVEN + 0.18) {
      const hh = ALTO_P * 0.62;
      const ww = (j.persona.width / j.persona.height) * hh;
      const tw = ww / COLS;
      const th = hh / FILAS;
      const sw = j.persona.width / COLS;
      const sh = j.persona.height / FILAS;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - b * 1.15);
      for (let r = 0; r < FILAS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tr = ts[(r * COLS + c) % ts.length];
          const lx = -ww / 2 + (c + 0.5) * tw;
          const ly = -hh / 2 + (r + 0.5) * th;
          const empuje = Hh * (0.1 + tr.v * 0.34) * b;
          const e = 1 - b * 0.55;
          ctx.save();
          ctx.translate(xc + lx + Math.cos(tr.a) * empuje, yc + ly + Math.sin(tr.a) * empuje + b * Hh * 0.05);
          ctx.rotate(tr.giro * b * 0.5);
          ctx.drawImage(j.persona, c * sw, r * sh, sw, sh, (-tw / 2) * e, (-th / 2) * e, tw * e + 0.5, th * e + 0.5);
          ctx.restore();
        }
      }
      ctx.restore();
    }
    // Trozos de su color: salen disparados del cruce y, ya dentro, se juntan y se recomponen en la figura.
    const pal = PALETA[id];
    const sale = suave((k - T_ROMPE) / (T_VUELVEN - T_ROMPE));
    const junta = suave((k - T_VUELVEN) / (T_FIGURA - T_VUELVEN));
    const aparece = suave((k - T_ROMPE) / 0.06);
    if (k < T_FIGURA + 0.04) {
      ctx.save();
      for (const tr of ts) {
        const dist = tr.v * Hh * 0.32 * sale;
        const sx = xc + Math.cos(tr.a) * dist;
        const sy = yc + Math.sin(tr.a) * dist + sale * Hh * 0.04;
        // De donde han salido, al sitio de su figura (cada trozo, en un punto distinto de ella).
        const dx = fx + Math.cos(tr.ra) * tr.rd * LADO_F * 0.55;
        const dy = fy + Math.sin(tr.ra) * tr.rd * LADO_F * 0.55;
        const px = sx + (dx - sx) * junta;
        const py = sy + (dy - sy) * junta;
        const r = Hh * tr.r * (1.6 - 0.9 * junta) * aparece * (1 - suave((k - T_FIGURA) / 0.04));
        if (r <= 0.2) continue;
        ctx.fillStyle = pal[tr.col];
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(tr.giro * (sale + junta * 0.5));
        if (tr.forma === 0) ctx.fillRect(-r, -r, r * 2, r * 2);
        else if (tr.forma === 1) {
          ctx.beginPath();
          ctx.moveTo(0, -r * 1.3);
          ctx.lineTo(r * 1.2, r);
          ctx.lineTo(-r * 1.2, r);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    }
    // La figura se asienta con un rebote.
    if (k >= T_VUELVEN) {
      const u = suave((k - (T_FIGURA - 0.1)) / 0.2);
      if (u > 0) {
        const rebote = 1 + (k > T_FIGURA ? 0.18 * Math.sin(Math.min(1, (k - T_FIGURA) / 0.12) * Math.PI) : 0);
        const p = reposo(id);
        figura(id, fx + (p.x - fx) * u, fy + (p.y - fy) * u, (0.45 + 0.55 * u) * rebote, u, (1 - u) * 2.4);
      }
    }
  };

  const dibujar = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pintarBoca();
    const u = tiempo - t0;
    const bob = (n: number) => Math.sin(tiempo * 3 + n) * Hh * 0.008;
    // En la zambullida, todo cae hacia la oscuridad y se apaga.
    const buceo = fase === 'bucea' ? Math.min(1, u / DURACION.bucea) : fase === 'negro' ? 1 : 0;
    const hundida = (id: PjId) => {
      const p = reposo(id);
      const e = buceo * buceo;
      figura(id, p.x + (W / 2 - p.x) * e * 0.5, p.y + e * Hh * 0.25, 1 + e * 1.4, 1 - e);
    };
    // ---- Fran: espera delante de la boca como persona, sube a ella y se hace jarra dentro.
    if (!franDentro) {
      if (fase === 'abre' || fase === 'quieta') persona('fran', SITIOS.fran.x * W, SITIOS.fran.y * Hh + bob(0), 1);
      else if (fase === 'traga') salta('fran', Math.min(1, u / DURACION.traga), 4);
    } else if (buceo < 1) hundida('fran');
    // ---- Los otros esperan, saltan y, al entrar, se rompen y se hacen figura.
    SALTAN.forEach((id, i) => {
      if (saltaron) return buceo < 1 ? hundida(id) : undefined;
      if (fase === 'saltan') {
        const k = (u - i * DURACION.entre) / DURACION.salto;
        if (k >= 0) return salta(id, Math.min(1, k), i % 2 ? -3 : 3);
      }
      persona(id, SITIOS[id].x * W, SITIOS[id].y * Hh + bob(i + 1), 1);
    });
  };

  let fotogramas = 0;
  const paso = (ahora: number) => {
    if (cerrado) return;
    requestAnimationFrame(paso);
    if (esVertical()) {
      ultimo = ahora;
      return;
    }
    // 60 fps como mucho, también en pantallas de 120 Hz.
    if (ultimo && ahora - ultimo < 1000 / 60 - 4) return;
    const dt = ultimo ? Math.min(0.1, (ahora - ultimo) / 1000) : 0;
    ultimo = ahora;
    tiempo += dt;
    const u = tiempo - t0;
    if (fase === 'abre') {
      sv = Math.min(S_ABIERTA, u * (S_ABIERTA / DURACION.abre));
      if (u >= DURACION.abre) termina('quieta');
    } else if (fase === 'traga') {
      sv = S_ABIERTA;
      if (u >= DURACION.traga) termina('quieta');
    } else if (fase === 'saltan') {
      sv = S_ABIERTA;
      if (u >= DURACION.entre * (SALTAN.length - 1) + DURACION.salto + 0.3) termina('quieta');
    } else if (fase === 'bucea') {
      sv = S_BUCEO + (u / DURACION.bucea) * (2.95 - S_BUCEO);
      if (u >= DURACION.bucea) termina('negro');
    } else sv = fase === 'negro' ? 3 : S_ABIERTA;
    fotogramas++;
    dibujar();
  };

  void lista.then(() => {
    if (cerrado) return;
    dibujar();
    requestAnimationFrame(paso);
  });
  (window as unknown as { __boca?: unknown }).__boca = () => ({ fase, sv, fotogramas, u: tiempo - t0, cerrar: () => cerrar() });

  const ir = async (f: Fase): Promise<void> => {
    await lista;
    if (rapido) {
      fase = f === 'abre' ? 'quieta' : f;
      if (f === 'traga') franDentro = true;
      if (f === 'saltan') saltaron = true;
      sv = f === 'bucea' ? 3 : S_ABIERTA;
      if (f === 'bucea') fase = 'negro';
      return;
    }
    fase = f;
    t0 = tiempo;
    await esperar();
  };

  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    ro.disconnect();
    delete (window as unknown as { __boca?: unknown }).__boca;
    capa.remove();
    canvas.width = canvas.height = 0;
    soltar();
    if (fondo) fondo.width = fondo.height = 0;
    fondo = null;
  };

  return {
    abre: () => ir('abre'),
    tragaFran: () => ir('traga'),
    saltan: () => ir('saltan'),
    bucea: () => ir('bucea'),
    async fundir() {
      if (!rapido) {
        capa.style.transition = 'opacity 700ms ease-out';
        capa.style.opacity = '0';
        await new Promise((r) => setTimeout(r, 720));
      }
      cerrar();
    },
    cerrar,
  };
}
