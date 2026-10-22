// The animation of each power, prompter, summon and enemy attack of the fight. Each function is a script the
// fight awaits: it asks the scene (`Escena`) for timed animations and calls `impacto(i)` at the instant the
// hit lands, so that the damage number, the flash and the health bar fall on the beat of the picture.
// Targets are given as functions that return where the target is NOW (the camera keeps turning).
import { texto } from '../juego/textos';
import { chispa, manoLuz } from './arte';
import { apuntador as imgApuntador, linea } from './iconos';
import { cana, cajon, cometa, cono, columnaHielo, chupito, corazon, easeIn, easeOut, globo, grito, haz, hoja, limitar, llama, pagina, anillo, persona, Particulas, rosa, telonArriba, telonLado, zarpa } from './efectos';
import { dibujarEmocion } from './interfaz';
import { girar, reflejar, una } from './pixel';
import { EFECTO_APUNTADOR, EFECTO_CURA, EFECTO_GOLPE, EFECTO_PODER, type SonidoSol } from './sonido';
import type { Elemento } from './grupo';
import { COLOR_ELEMENTO } from './grupo';

export interface Punto {
  x: number;
  y: number;
}

/** Where a fighter is on screen right now (the centre of its body). */
export type Donde = () => Punto;

export interface OpcionesAnim {
  /** Runs every frame while the animation lasts (t = seconds since it began). */
  tick?: (t: number, dt: number) => void;
  /** Draws every frame. */
  draw?: (g: CanvasRenderingContext2D, t: number) => void;
  /** Under the fighters ('bajo'), over them ('sobre') or over the whole screen except the windows ('tope'). */
  capa?: 'bajo' | 'sobre' | 'tope';
  /** Things that happen at an instant. */
  eventos?: Array<{ t: number; f: () => void }>;
}

/** What the effects need from the fight. */
export interface Escena {
  parts: Particulas;
  sonido: SonidoSol;
  animar(dur: number, o?: OpcionesAnim): Promise<void>;
  sacudir(amp: number, dur: number): void;
  destello(col: string, alfa: number, dur: number): void;
  /** Hides the windows (a big summon takes the whole screen). */
  ocultarUI(si: boolean): void;
}

const pt = (d: Donde) => d();

/** A line of 2 px drawn pixel by pixel. */
function trazo(g: CanvasRenderingContext2D, col: string, x0: number, y0: number, x1: number, y1: number) {
  linea(g, col, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1));
  linea(g, col, Math.round(x0) + 1, Math.round(y0), Math.round(x1) + 1, Math.round(y1));
}

// ---------------------------------------------------------------- the plain hit and small things

/** The sword: three slashes across the target. */
export async function fxTajo(e: Escena, objetivo: Donde, impacto: () => void) {
  await e.animar(0.4, {
    capa: 'sobre',
    eventos: [
      {
        t: 0.1,
        f: () => {
          impacto();
          const p = pt(objetivo);
          e.parts.estallido(p.x, p.y, ['#ffffff', '#ffe27a', '#ffd0a0'], 9, 70, 0.4);
        },
      },
    ],
    draw: (g, t) => {
      const p = pt(objetivo);
      for (let i = 0; i < 3; i++) {
        const ti = t - 0.05 - i * 0.06;
        if (ti < 0 || ti > 0.13) continue;
        const k = ti / 0.1;
        const x0 = p.x - 11 + i * 5;
        const y0 = p.y - 13 + i * 2;
        trazo(g, ti > 0.09 ? '#ffe27a' : '#ffffff', x0, y0, x0 + 14 * Math.min(1, k), y0 + 20 * Math.min(1, k));
      }
    },
  });
}

/** A little burst where an enemy's blow lands on a friend. */
export async function fxGolpeEnemigo(e: Escena, objetivo: Donde, impacto: () => void, cols = ['#ffffff', '#ffd0a0', '#ff8a5a']) {
  await e.animar(0.3, {
    capa: 'sobre',
    eventos: [
      {
        t: 0.05,
        f: () => {
          impacto();
          const p = pt(objetivo);
          e.parts.estallido(p.x, p.y, cols, 10, 70, 0.4);
        },
      },
    ],
    draw: (g, t) => {
      if (t < 0.04 || t > 0.2) return;
      const p = pt(objetivo);
      const r = 3 + (t - 0.04) * 60;
      g.drawImage(chispa('#ffffff'), Math.round(p.x - 2), Math.round(p.y - 2));
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.fillStyle = '#ffffff';
        g.fillRect(Math.round(p.x + dx * r), Math.round(p.y + dy * r), 2, 2);
      }
    },
  });
}

/** Green sparkles climbing around somebody (a heal). */
export async function fxCura(e: Escena, objetivo: Donde, impacto: () => void) {
  e.sonido.efecto(EFECTO_CURA_SONIDO);
  await e.animar(0.8, {
    capa: 'sobre',
    eventos: [{ t: 0.15, f: impacto }],
    tick: (t) => {
      if (t > 0.6) return;
      const p = pt(objetivo);
      e.parts.nueva({ x: p.x - 9 + Math.random() * 18, y: p.y + 14, vy: -26 - Math.random() * 18, dura: 0.55, col: Math.random() > 0.5 ? '#8cf08c' : '#e8ffd0', w: 1, h: Math.random() > 0.5 ? 2 : 1 });
    },
    draw: (g, t) => {
      const p = pt(objetivo);
      if (t > 0.1 && t < 0.5 && Math.floor(t * 20) % 2 === 0) g.drawImage(chispa('#8cf08c'), Math.round(p.x - 2 + Math.sin(t * 20) * 6), Math.round(p.y - 8 - t * 20));
    },
  });
}
const EFECTO_CURA_SONIDO = EFECTO_CURA;

/** Blue sparkles (IP back). */
export async function fxIP(e: Escena, objetivo: Donde, impacto: () => void) {
  e.sonido.efecto(EFECTO_CURA);
  await e.animar(0.8, {
    capa: 'sobre',
    eventos: [{ t: 0.15, f: impacto }],
    tick: (t) => {
      if (t > 0.6) return;
      const p = pt(objetivo);
      e.parts.nueva({ x: p.x - 9 + Math.random() * 18, y: p.y + 14, vy: -26 - Math.random() * 18, dura: 0.55, col: Math.random() > 0.5 ? '#8ad8ff' : '#e0f6ff', w: 1, h: Math.random() > 0.5 ? 2 : 1 });
    },
  });
}

// ---------------------------------------------------------------- Pablo (earth)

/** «Sí, y…»: the hand of stage light falls on the target, and then falls again, bigger. */
export async function fxSiY(e: Escena, objetivo: Donde, impacto: (golpe: number) => void) {
  const mano = una('fx.manoAbajo', () => girar(manoLuz(), 2));
  for (let h = 0; h < 2; h++) {
    e.sonido.efecto(EFECTO_PODER, 0.8);
    await e.animar(0.6, {
      capa: 'sobre',
      eventos: [
        {
          t: 0.3,
          f: () => {
            impacto(h);
            e.sacudir(2, 0.16);
            const p = pt(objetivo);
            e.parts.estallido(p.x, p.y, ['#fff6c8', '#ffe27a', '#ffb04a'], 12, 80, 0.5);
          },
        },
      ],
      draw: (g, t) => {
        const p = pt(objetivo);
        const caida = t < 0.3 ? easeIn(t / 0.3) : 1;
        const sube = t > 0.4 ? easeOut((t - 0.4) / 0.2) : 0;
        const a = t < 0.3 ? 0.5 + caida * 0.4 : Math.max(0, 0.9 - (t - 0.3) * 2.6);
        g.globalAlpha = Math.max(0, Math.min(1, a * 0.7));
        g.drawImage(cono(), Math.round(p.x - 22), Math.round(p.y - 90));
        g.globalAlpha = Math.max(0, Math.min(1, 1 - sube));
        const oy = (1 - caida) * -46 - sube * 30;
        g.drawImage(mano, Math.round(p.x - 13), Math.round(p.y - 30 + oy));
        g.globalAlpha = 1;
      },
    });
    if (h === 0) {
      const p = pt(objetivo);
      e.parts.nueva({ txt: texto('efecto.y'), x: p.x - 8, y: p.y - 26, vy: -22, dura: 0.5, col: '#ffe27a', parpadea: false });
      await e.animar(0.28);
    }
  }
}

/** «Cajonazo»: a cajón falls from the sky on the target and the beat runs along the ground to its neighbours. */
export async function fxCajonazo(e: Escena, objetivos: Donde[], impacto: (i: number) => void) {
  const caja = cajon();
  e.sonido.efecto(EFECTO_PODER, 0.8);
  let onda = -1;
  await e.animar(0.95, {
    capa: 'sobre',
    eventos: [
      {
        t: 0.34,
        f: () => {
          onda = 0;
          impacto(0);
          e.sacudir(3, 0.25);
          const p = pt(objetivos[0]);
          e.parts.estallido(p.x, p.y + 12, ['#d89a52', '#8a5424', '#ffe27a'], 14, 90, 0.6);
        },
      },
      ...objetivos.slice(1).map((o, i) => ({
        t: 0.48 + i * 0.04,
        f: () => {
          impacto(i + 1);
          const p = pt(o);
          e.parts.estallido(p.x, p.y + 12, ['#d89a52', '#8a5424'], 8, 60, 0.5);
        },
      })),
    ],
    draw: (g, t) => {
      const p = pt(objetivos[0]);
      if (t < 0.4) {
        const k = easeIn(Math.min(1, t / 0.34));
        g.drawImage(caja, Math.round(p.x - 9), Math.round(p.y - 14 - 56 * (1 - k)));
      }
      if (onda >= 0 && t > 0.34) {
        const r = (t - 0.34) * 130;
        anillo(g, p.x, p.y + 14, r, r * 0.38, '#ffe27a', 2);
        if (r > 8) anillo(g, p.x, p.y + 14, r - 7, (r - 7) * 0.38, '#d89a52', 1);
      }
    },
  });
}

// ---------------------------------------------------------------- Fran (water)

/** «Fresquito»: a column of ice grows under the target and bursts. */
export async function fxFresquito(e: Escena, objetivo: Donde, impacto: () => void) {
  const col = columnaHielo();
  e.sonido.efecto(EFECTO_PODER, 0.9);
  await e.animar(1, {
    capa: 'sobre',
    eventos: [
      {
        t: 0.55,
        f: () => {
          impacto();
          e.sacudir(2, 0.18);
          const p = pt(objetivo);
          e.parts.estallido(p.x, p.y, ['#ffffff', '#9adcff', '#5ab0f0', '#dff4ff'], 22, 100, 0.8);
        },
      },
    ],
    tick: (t) => {
      if (t < 0.5) {
        const p = pt(objetivo);
        e.parts.nueva({ x: p.x - 12 + Math.random() * 24, y: p.y - 30, vy: 30 + Math.random() * 20, dura: 0.5, col: '#dff4ff', w: 1, h: 1 });
      }
    },
    draw: (g, t) => {
      if (t > 0.58) return;
      const p = pt(objetivo);
      const k = easeOut(Math.min(1, t / 0.45));
      const hh = Math.max(1, Math.round(col.height * k));
      const parpadeo = t > 0.5 && Math.floor(t * 40) % 2;
      if (!parpadeo) g.drawImage(col, 0, col.height - hh, col.width, hh, Math.round(p.x - 6), Math.round(p.y + 15 - hh), col.width, hh);
    },
  });
}

/** «Otra caña»: a pint tips over the friend and the foam turns into sparkles. */
export async function fxOtraCana(e: Escena, objetivo: Donde, impacto: () => void) {
  const c = cana();
  e.sonido.efecto(EFECTO_PODER, 0.8);
  await e.animar(1.1, {
    capa: 'sobre',
    eventos: [{ t: 0.55, f: () => {
      impacto();
      e.sonido.efecto(EFECTO_CURA);
    } }],
    tick: (t) => {
      const p = pt(objetivo);
      if (t > 0.2 && t < 0.55) {
        e.parts.nueva({ x: p.x - 2 + Math.random() * 6, y: p.y - 24, vx: -4 + Math.random() * 8, vy: 40, dura: 0.35, col: Math.random() > 0.5 ? '#ffd860' : '#fff6e0', w: 1, h: 2 });
      }
      if (t > 0.5 && t < 0.95) e.parts.nueva({ x: p.x - 10 + Math.random() * 20, y: p.y + 12, vy: -28 - Math.random() * 20, dura: 0.55, col: Math.random() > 0.5 ? '#8cf08c' : '#ffe27a', w: 1, h: 2 });
    },
    draw: (g, t) => {
      const p = pt(objetivo);
      const k = easeOut(Math.min(1, t / 0.25));
      const sale = t > 0.7 ? easeIn((t - 0.7) / 0.3) : 0;
      const x = p.x - 4 + 8 * (1 - k) + sale * 12;
      const y = p.y - 42 + 10 * k - sale * 10;
      // tipped over: drawn rotated by a quarter turn when pouring
      const img = t > 0.2 && t < 0.7 ? una('fx.canaGirada', () => girar(c, 1)) : c;
      g.drawImage(img, Math.round(x), Math.round(y));
      if (t > 0.5 && t < 0.9 && Math.floor(t * 24) % 2 === 0) g.drawImage(chispa('#8cf08c'), Math.round(p.x - 2), Math.round(p.y - 10 - (t - 0.5) * 30));
    },
  });
}

// ---------------------------------------------------------------- Guille (wind)

/** «Cierzo»: the Zaragoza wind sweeps the field from the right, over the target and its neighbours. */
export async function fxCierzo(e: Escena, objetivos: Donde[], impacto: (i: number) => void) {
  e.sonido.efecto(EFECTO_PODER, 0.9);
  const orden = objetivos.map((_, i) => i).sort((a, b) => pt(objetivos[b]).x - pt(objetivos[a]).x);
  const yBase = () => pt(objetivos[0]).y;
  await e.animar(1.05, {
    capa: 'sobre',
    eventos: orden.map((i, n) => ({
      t: 0.35 + n * 0.1,
      f: () => {
        impacto(i);
        const p = pt(objetivos[i]);
        e.parts.estallido(p.x, p.y, ['#ffffff', '#e0c8ff', '#c8f0c8'], 8, 60, 0.4);
      },
    })),
    tick: (t) => {
      if (t > 0.75) return;
      for (let i = 0; i < 3; i++) {
        const y = yBase() - 38 + Math.random() * 70;
        e.parts.nueva({ x: 250, y, vx: -380 - Math.random() * 120, vy: (Math.random() - 0.5) * 20, dura: 0.7, col: Math.random() > 0.4 ? '#e8e0ff' : '#ffffff', w: 6 + Math.floor(Math.random() * 8), h: 1, parpadea: false });
      }
      if (Math.random() > 0.5) e.parts.nueva({ x: 250, y: yBase() - 30 + Math.random() * 60, vx: -220 - Math.random() * 100, vy: -20 + Math.random() * 40, dura: 0.9, img: hoja(Math.random() > 0.5 ? '#6ab84a' : '#c8a83a'), parpadea: false });
    },
  });
}

/** «Abrazo de oso»: two big paws close on the target with hearts. */
export async function fxAbrazo(e: Escena, objetivo: Donde, impacto: () => void) {
  const z = zarpa();
  const zi = una('fx.zarpaIzq', () => reflejar(z));
  const cor = corazon();
  e.sonido.efecto(EFECTO_PODER, 0.8);
  await e.animar(1.15, {
    capa: 'sobre',
    eventos: [
      {
        t: 0.5,
        f: () => {
          impacto();
          e.sacudir(2.5, 0.3);
          const p = pt(objetivo);
          for (let i = 0; i < 5; i++) e.parts.nueva({ x: p.x - 10 + Math.random() * 20, y: p.y - 4, vy: -24 - Math.random() * 14, vx: -6 + Math.random() * 12, dura: 0.7, img: cor, parpadea: true });
        },
      },
    ],
    draw: (g, t) => {
      const p = pt(objetivo);
      const cierra = easeOut(Math.min(1, t / 0.45));
      const abre = t > 0.8 ? easeIn((t - 0.8) / 0.3) : 0;
      const sacude = t > 0.5 && t < 0.85 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
      const sep = 36 * (1 - cierra) + 12 + abre * 30;
      g.drawImage(zi, Math.round(p.x - sep - 12 + sacude), Math.round(p.y - 8));
      g.drawImage(z, Math.round(p.x + sep - 2 - sacude), Math.round(p.y - 8));
    },
  });
}

// ---------------------------------------------------------------- Chuchi (fire)

/** «Cinco minutos»: nothing happens (Chuchi is on his way) and then, late, a comet arrives. */
export async function fxCincoMinutos(e: Escena, quien: Donde, objetivo: Donde, impacto: () => void) {
  const cm = cometa();
  const cola: Punto[] = [];
  // the wait: «...» and a drop of sweat over his head
  await e.animar(1.05, {
    capa: 'sobre',
    draw: (g, t) => {
      const q = quien();
      dibujarEmocion(g, { tipo: t < 0.5 ? 'puntos' : 'gota', t: t < 0.5 ? t : t - 0.5, dura: 1 }, Math.round(q.x), Math.round(q.y - 20));
    },
  });
  e.sonido.efecto(EFECTO_PODER, 0.9);
  await e.animar(0.75, {
    capa: 'sobre',
    eventos: [
      {
        t: 0.4,
        f: () => {
          impacto();
          e.sacudir(3, 0.25);
          e.destello('#ffd8a0', 0.5, 0.16);
          const p = pt(objetivo);
          e.parts.estallido(p.x, p.y, ['#ffffff', '#ffd84a', '#f08a2a', '#e8322c'], 24, 110, 0.7);
        },
      },
    ],
    draw: (g, t) => {
      const p = pt(objetivo);
      if (t < 0.4) {
        const k = easeIn(t / 0.4);
        const x = -14 + (p.x + 14) * k;
        const y = -14 + (p.y + 14) * k;
        cola.push({ x, y });
        if (cola.length > 9) cola.shift();
        cola.forEach((c, i) => {
          const a = (i + 1) / cola.length;
          g.globalAlpha = a * 0.8;
          g.drawImage(llama(i), Math.round(c.x - 6), Math.round(c.y - 9));
        });
        g.globalAlpha = 1;
        g.drawImage(cm, Math.round(x - 7), Math.round(y - 7));
      } else if (t < 0.7) {
        g.drawImage(llama(Math.floor(t * 12)), Math.round(p.x - 6), Math.round(p.y - 10));
        g.drawImage(llama(Math.floor(t * 12) + 1), Math.round(p.x - 14), Math.round(p.y - 4));
        g.drawImage(llama(Math.floor(t * 12) + 2), Math.round(p.x + 3), Math.round(p.y - 4));
      }
    },
  });
}

/** «Chupito flambeado»: a shot flies in and the fire spreads over the target and its neighbours. */
export async function fxChupito(e: Escena, quien: Donde, objetivos: Donde[], impacto: (i: number) => void) {
  const vaso = chupito();
  e.sonido.efecto(EFECTO_PODER, 0.9);
  await e.animar(1.1, {
    capa: 'sobre',
    eventos: objetivos.map((_, i) => ({
      t: 0.4 + i * 0.07,
      f: () => {
        impacto(i);
        const p = pt(objetivos[i]);
        e.parts.estallido(p.x, p.y, ['#ffffff', '#ffd84a', '#f08a2a'], 10, 80, 0.5);
      },
    })),
    draw: (g, t) => {
      const q = quien();
      const p0 = pt(objetivos[0]);
      if (t < 0.4) {
        const k = t / 0.4;
        g.drawImage(vaso, Math.round(q.x + (p0.x - q.x) * k - 3), Math.round(q.y + (p0.y - q.y) * k - Math.sin(k * Math.PI) * 26 - 4));
      }
      if (t > 0.4 && t < 1) {
        objetivos.forEach((o, i) => {
          const p = pt(o);
          const f = Math.floor(t * 12 + i);
          g.drawImage(llama(f), Math.round(p.x - 6), Math.round(p.y - 8));
          g.drawImage(llama(f + 1), Math.round(p.x - 12), Math.round(p.y - 1));
          g.drawImage(llama(f + 2), Math.round(p.x + 1), Math.round(p.y - 1));
        });
      }
    },
  });
}

// ---------------------------------------------------------------- the prompters

/** The prompter pops out of the floor next to its owner, shouts and throws pages of the script at the target. */
export async function fxApuntador(e: Escena, el: Elemento, quien: Donde, objetivo: Donde, impacto: () => void) {
  const col = COLOR_ELEMENTO[el];
  const pag = pagina();
  e.sonido.efecto(EFECTO_APUNTADOR);
  const big = (f: number) => una(`fx.apuntadorGrande.${el}.${f % 2}`, () => {
    const s = imgApuntador(el, f);
    const c = document.createElement('canvas');
    c.width = s.width * 2;
    c.height = s.height * 2;
    const x = c.getContext('2d')!;
    x.imageSmoothingEnabled = false;
    x.drawImage(s, 0, 0, c.width, c.height);
    return c;
  });
  await e.animar(1.55, {
    capa: 'sobre',
    eventos: [
      { t: 0.7, f: () => e.sonido.efecto(EFECTO_GOLPE, 0.6) },
      {
        t: 1.1,
        f: () => {
          impacto();
          e.sacudir(2, 0.18);
          const p = pt(objetivo);
          e.parts.estallido(p.x, p.y, [col.claro, col.medio, '#ffffff'], 16, 90, 0.6);
        },
      },
    ],
    draw: (g, t) => {
      const q = quien();
      const o = pt(objetivo);
      // a ring of sparkles on the floor where he comes up
      const sale = easeOut(Math.min(1, t / 0.3));
      const baja = t > 1.3 ? easeIn((t - 1.3) / 0.25) : 0;
      const img = big(Math.floor(t * 6));
      const px = Math.round(q.x + 12);
      const py = Math.round(q.y + 16);
      if (t < 0.5) anillo(g, px + 12, py, 4 + t * 36, (4 + t * 36) * 0.4, col.claro, 1);
      const alto = Math.round(img.height * sale * (1 - baja));
      if (alto > 0) g.drawImage(img, 0, 0, img.width, alto, px, py - alto, img.width, alto);
      // the shout
      if (t > 0.3 && t < 1.1) globo(g, texto('efecto.chist'), px + 12, py - img.height - 2);
      // the pages in flight
      if (t > 0.65 && t < 1.12) {
        for (let i = 0; i < 4; i++) {
          const k = limitar((t - 0.65 - i * 0.05) / 0.4, 0, 1);
          if (k <= 0 || k >= 1) continue;
          const x = px + 12 + (o.x - px - 12) * k;
          const y = py - 16 + (o.y - py + 16) * k - Math.sin(k * Math.PI) * 18 + i * 3;
          g.drawImage(pag, Math.round(x - 3), Math.round(y - 3));
        }
      }
    },
  });
}

/** A prompter goes back to its owner (a short flight of sparkles). */
export async function fxPonerApuntador(e: Escena, el: Elemento, quien: Donde) {
  const col = COLOR_ELEMENTO[el];
  e.sonido.efecto(EFECTO_APUNTADOR);
  await e.animar(0.8, {
    capa: 'sobre',
    draw: (g, t) => {
      const q = quien();
      const k = easeOut(Math.min(1, t / 0.5));
      const img = imgApuntador(el, Math.floor(t * 6));
      if (t < 0.55) g.drawImage(img, Math.round(q.x + 30 * (1 - k) - 7), Math.round(q.y - 6 - 26 * (1 - k) - 9));
      if (t > 0.45 && t < 0.75) g.drawImage(chispa(col.claro), Math.round(q.x - 2), Math.round(q.y - 10 - (t - 0.45) * 30));
    },
    tick: (t) => {
      if (t > 0.5 && t < 0.7) {
        const q = quien();
        e.parts.estallido(q.x, q.y, [col.claro, '#ffffff'], 2, 40, 0.5);
      }
    },
  });
}

// ---------------------------------------------------------------- «La ovación»

interface Grito {
  s: string;
  x: number;
  y: number;
  t: number;
}

const FILAS = [
  { s: 1, base: 112, sep: 12, sombra: 0.6, desp: 0 },
  { s: 1.5, base: 134, sep: 19, sombra: 0.35, desp: 7 },
  { s: 2, base: 164, sep: 28, sombra: 0, desp: 12 },
];

/**
 * The summon: the whole public of the theatre, in three rows with velvet curtains and spotlights, claps
 * more and more until the sound itself knocks the enemies down. It takes the whole screen for ~4.6 s.
 */
export async function fxOvacion(e: Escena, enemigos: Donde[], impacto: (i: number) => void) {
  const DUR = 4.7;
  const lluvia = new Particulas();
  const gritos: Grito[] = [];
  let proxGrito = 0.6;
  let nGrito = 0;
  let golpeada = false;
  e.ocultarUI(true);
  e.sonido.efecto(EFECTO_PODER, 1);
  await e.animar(DUR, {
    capa: 'tope',
    eventos: [
      {
        t: 3.0,
        f: () => {
          golpeada = true;
          enemigos.forEach((_, i) => impacto(i));
          e.sacudir(5, 0.6);
          e.destello('#ffffff', 0.85, 0.28);
          e.sonido.efecto(EFECTO_GOLPE);
        },
      },
    ],
    tick: (t, dt) => {
      lluvia.update(dt);
      // the more they clap, the more it shakes
      if (t > 1.3 && t < 3 && Math.floor(t * 12) !== Math.floor((t - dt) * 12)) e.sacudir(0.7 + (t - 1.3) * 1.2, 0.09);
      // confetti from the ceiling and roses thrown from the front rows
      if (t > 0.5 && t < 4) {
        for (let i = 0; i < 2; i++) {
          lluvia.nueva({ x: Math.random() * 240, y: -4, vx: -10 + Math.random() * 20, vy: 30 + Math.random() * 40, dura: 2.5, col: ['#ff5a8a', '#ffd84a', '#6ad8ff', '#8cf06a', '#ffffff'][Math.floor(Math.random() * 5)], w: 2, h: 2, parpadea: false });
        }
        if (Math.random() > 0.8) {
          const x0 = 20 + Math.random() * 200;
          lluvia.nueva({ x: x0, y: 150, vx: (140 - x0) * 0.3 + (Math.random() - 0.5) * 20, vy: -90 - Math.random() * 30, ay: 150, dura: 1.2, img: rosa(), parpadea: false });
        }
      }
      if (t > proxGrito && t < 3.4) {
        gritos.push({ s: grito(nGrito++), x: 50 + Math.random() * 140, y: 100 + Math.random() * 30, t: 0 });
        proxGrito = t + 0.32;
      }
      for (const gr of gritos) gr.t += dt;
      while (gritos.length && gritos[0].t > 0.75) gritos.shift();
    },
    draw: (g, t) => {
      const entra = easeOut(limitar(t / 0.55, 0, 1));
      const sale = 1 - easeIn(limitar((t - 4.0) / 0.7, 0, 1));
      const k = Math.min(entra, sale);
      g.fillStyle = `rgba(10,4,32,${0.66 * k})`;
      g.fillRect(0, 0, 240, 160);
      // the spotlights, crossing over the enemies
      g.globalAlpha = k * (0.7 + 0.3 * Math.sin(t * 9));
      const hz = haz();
      for (const [x, y] of [[20, -4], [100, -4], [160, -4], [215, -4]]) g.drawImage(hz, x, y);
      g.globalAlpha = 1;
      // the audience, back row first
      FILAS.forEach((f, r) => {
        const sube = (1 - limitar((entra - r * 0.08) / (1 - r * 0.08), 0, 1)) * 62 + (1 - sale) * 62;
        const n = Math.ceil(260 / f.sep);
        for (let i = 0; i < n; i++) {
          const v = i * 7 + r * 3;
          const frame = Math.floor(t * (5 + t * 1.6) + i * 0.7 + r * 1.3) % 2;
          const p = persona(v, frame, f.s, f.sombra);
          const bob = (Math.floor(t * (5 + t * 1.6) + i * 0.4) % 2) * (f.s > 1.2 ? 2 : 1);
          g.drawImage(p, Math.round(i * f.sep - f.desp), Math.round(f.base - p.height + sube - bob));
        }
      });
      // confetti and roses over the audience
      lluvia.dibujar(g);
      // the shouts
      for (const gr of gritos) globo(g, gr.s, gr.x, Math.round(gr.y - gr.t * 10));
      // the curtains frame everything
      g.drawImage(telonLado(false), Math.round(-30 * (1 - k)), 0);
      g.drawImage(telonLado(true), Math.round(212 + 30 * (1 - k)), 0);
      g.drawImage(telonArriba(), 0, Math.round(-24 * (1 - k)));
      // the wave of sound, from the stalls up over the stage
      if (t > 2.6 && t < 3.6) {
        const r = (t - 2.6) * 300;
        anillo(g, 120, 140, r, r * 0.5, '#ffffff', 2);
        if (r > 10) anillo(g, 120, 140, r - 9, (r - 9) * 0.5, '#ffe27a', 2);
        if (r > 22) anillo(g, 120, 140, r - 20, (r - 20) * 0.5, '#ff8ad0', 1);
      }
      if (golpeada && t < 3.25) {
        g.fillStyle = `rgba(255,255,255,${(3.25 - t) * 1.2})`;
        g.fillRect(0, 0, 240, 100);
      }
    },
  });
  e.ocultarUI(false);
}

// ---------------------------------------------------------------- what the enemies do

/** The ring of notes of a phone, flying to the friends. */
export async function fxTimbre(e: Escena, quien: Donde, objetivos: Donde[], impacto: (i: number) => void) {
  e.sonido.efecto(EFECTO_PODER, 0.7);
  await e.animar(0.95, {
    capa: 'sobre',
    eventos: objetivos.map((_, i) => ({
      t: 0.5 + i * 0.05,
      f: () => {
        impacto(i);
        const p = pt(objetivos[i]);
        e.parts.estallido(p.x, p.y, ['#ffe27a', '#ffffff'], 6, 50, 0.4);
      },
    })),
    tick: (t) => {
      if (t < 0.45 && Math.floor(t * 20) !== Math.floor((t - 0.016) * 20)) {
        const q = quien();
        for (const o of objetivos) {
          const p = pt(o);
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d = Math.hypot(dx, dy) || 1;
          e.parts.nueva({ x: q.x, y: q.y, vx: (dx / d) * 150 + (Math.random() - 0.5) * 20, vy: (dy / d) * 150 + (Math.random() - 0.5) * 20, dura: 0.5, txt: '♪', col: Math.random() > 0.5 ? '#ffe27a' : '#ffffff', parpadea: false });
        }
      }
    },
  });
}

/** A swarm of tiny dashes (a mosquito's buzz) that reaches every friend. */
export async function fxZumbido(e: Escena, quien: Donde, objetivos: Donde[], impacto: (i: number) => void) {
  e.sonido.efecto(EFECTO_PODER, 0.5);
  await e.animar(0.85, {
    capa: 'sobre',
    eventos: objetivos.map((_, i) => ({
      t: 0.45 + i * 0.05,
      f: () => {
        impacto(i);
        const p = pt(objetivos[i]);
        e.parts.estallido(p.x, p.y, ['#e0c8ff', '#ffffff'], 6, 50, 0.4);
      },
    })),
    tick: (t) => {
      if (t < 0.4) {
        const q = quien();
        for (const o of objetivos) {
          const p = pt(o);
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d = Math.hypot(dx, dy) || 1;
          e.parts.nueva({ x: q.x, y: q.y, vx: (dx / d) * 160 + (Math.random() - 0.5) * 80, vy: (dy / d) * 160 + (Math.random() - 0.5) * 80, dura: 0.4, col: '#c8b8ff', w: 2, h: 1, parpadea: false });
        }
      }
    },
  });
}

/** A petardo goes off: a big burst of fire that reaches everybody. */
export async function fxEstallido(e: Escena, quien: Donde, objetivos: Donde[], impacto: (i: number) => void, alExplotar: () => void) {
  await e.animar(1.15, {
    capa: 'sobre',
    eventos: [
      {
        t: 0.35,
        f: () => {
          alExplotar();
          e.sacudir(5, 0.5);
          e.destello('#fff0c0', 0.9, 0.3);
          e.sonido.efecto(EFECTO_GOLPE);
          const q = quien();
          e.parts.estallido(q.x, q.y, ['#ffffff', '#ffd84a', '#f08a2a', '#e8322c', '#7a1a14'], 40, 140, 0.9);
        },
      },
      ...objetivos.map((_, i) => ({
        t: 0.6 + i * 0.04,
        f: () => {
          impacto(i);
          const p = pt(objetivos[i]);
          e.parts.estallido(p.x, p.y, ['#ffd84a', '#f08a2a', '#e8322c'], 12, 80, 0.5);
        },
      })),
    ],
    draw: (g, t) => {
      const q = quien();
      if (t < 0.35) {
        // swelling and flickering before it goes
        if (Math.floor(t * 30) % 2) g.drawImage(chispa('#ffffff'), Math.round(q.x - 2 + Math.sin(t * 90) * 3), Math.round(q.y - 8));
      } else if (t < 0.85) {
        const r = (t - 0.35) * 150;
        anillo(g, q.x, q.y, r, r * 0.7, '#ffd84a', 2);
        if (r > 10) anillo(g, q.x, q.y, r - 9, (r - 9) * 0.7, '#e8322c', 2);
        for (let i = 0; i < 3; i++) g.drawImage(llama(Math.floor(t * 12) + i), Math.round(q.x - 6 + (i - 1) * 12), Math.round(q.y - 10));
      }
    },
  });
}

/** The critic's bad review: a stream of sparks from the friend back to the enemy (IP stolen). */
export async function fxChupa(e: Escena, quien: Donde, objetivo: Donde, impacto: () => void) {
  e.sonido.efecto(EFECTO_PODER, 0.6);
  await e.animar(1.0, {
    capa: 'sobre',
    eventos: [
      {
        t: 0.35,
        f: () => {
          impacto();
          const p = pt(objetivo);
          e.parts.estallido(p.x, p.y, ['#ffffff', '#ff8a8a', '#ffe27a'], 8, 60, 0.4);
        },
      },
    ],
    tick: (t) => {
      if (t > 0.5 && t < 0.95) {
        const q = quien();
        const p = pt(objetivo);
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        for (let i = 0; i < 2; i++) e.parts.nueva({ x: p.x + (Math.random() - 0.5) * 8, y: p.y + (Math.random() - 0.5) * 8, vx: (dx / d) * 120, vy: (dy / d) * 120, dura: 0.5, col: Math.random() > 0.5 ? '#8ad8ff' : '#ffffff', w: 2, h: 2, parpadea: false });
      }
    },
  });
}

/** A thin bright line from the enemy to the friend (the spoiler spoils). */
export async function fxHaz(e: Escena, quien: Donde, objetivo: Donde, impacto: () => void) {
  await e.animar(0.6, {
    capa: 'sobre',
    eventos: [
      {
        t: 0.2,
        f: () => {
          impacto();
          const p = pt(objetivo);
          e.parts.estallido(p.x, p.y, ['#ffffff', '#ff5a5a', '#ffd0d0'], 12, 80, 0.45);
        },
      },
    ],
    draw: (g, t) => {
      if (t < 0.12 || t > 0.4) return;
      const q = quien();
      const p = pt(objetivo);
      const k = Math.min(1, (t - 0.12) / 0.1);
      trazo(g, t < 0.3 ? '#ffffff' : '#ff8a8a', q.x, q.y, q.x + (p.x - q.x) * k, q.y + (p.y - q.y) * k);
    },
  });
}
