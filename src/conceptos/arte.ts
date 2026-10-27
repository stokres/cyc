// The art of «Una más», all baked ONCE when the game opens (docs/ESTILO.md T5): the friends' faceted figures (src/arte/conceptos-fig-*.mjs) and the
// enemies and props (src/arte/una-mas.mjs) become animation FRAMES (rig.ts) and sprites; the game only blits them. The look is the world of the
// concepts' own: painted blocks with violet shadows, no black outlines.
import * as A from '../arte/conceptos.mjs';
import type { Amigo } from './datos';
import * as U from '../arte/una-mas.mjs';
import { hornearDibujo, resplandor, type FiguraDef } from '../capitulos/conceptos-rig';
import { hornearRig, tenir, type Cuadro, type Pose } from './rig';

/** Bitmap pixels per logical pixel for the characters (the canvas is at most ~1.4× logical, so 1.5 is crisp). */
const Q = 1.5;

/** A baked sprite and where to draw it, in logical units, from its anchor. */
export interface Sprite {
  c: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Logical pixels per figure unit of each character. */
export const ESCALA = { fran: 0.155, guille: 0.15, despertador: 0.36, gran: 0.92, reloj: 0.5 } as const;

export type AnimFran = 'idle' | 'correr' | 'sube' | 'baja' | 'aterriza' | 'ataque' | 'carga' | 'dano' | 'mutis' | 'celebra' | 'retrato';
export type AnimGuille = 'idle' | 'celebra' | 'atrapado' | 'retrato';
export type AnimDespertador = 'andar' | 'alerta' | 'carga' | 'mareo' | 'dano' | 'agacha' | 'salta';
export type AnimReloj = 'repta' | 'gotea' | 'dano';

export interface Arte {
  fran: Record<AnimFran, Cuadro[]>;
  guille: Record<AnimGuille, Cuadro[]>;
  despertador: Record<AnimDespertador, Cuadro[]>;
  gran: Record<AnimDespertador, Cuadro[]>;
  reloj: Record<AnimReloj, Cuadro[]>;
  /** The same frames flashed white (a hit), by character and animation. */
  blanco: Map<Cuadro, Cuadro>;
  props: {
    barra: Sprite;
    sorbo: Sprite;
    florFondo: Sprite;
    florCerrada: Sprite;
    florAbierta: Sprite;
    portal: Sprite;
    charco: Sprite;
    gota: Sprite;
    iconoCierzo: Sprite;
    iconoTeclazo: Sprite;
    iconoPared: Sprite;
    jarraLlena: Sprite;
    jarraVacia: Sprite;
  };
  brillos: Record<string, HTMLCanvasElement>;
  /** A friend's little head with foam round its neck: what peeks out of Fran's jar once rescued. Anchored at the bottom centre. */
  asoma: Partial<Record<Amigo, Sprite>>;
}

const sen = Math.sin;
const fase = (i: number, n: number) => (i / n) * Math.PI * 2;
const n8 = Array.from({ length: 8 }, (_, i) => i);

// ---------------------------------------------------------------- Fran's and Guille's poses (figure units; the rig faces right)

/** Everything of the figure that is not the head, for the dialogue portrait. */
const soloCabeza = (def: FiguraDef, cabeza: string[]) => def.partes.map((p) => p.id).filter((id) => !cabeza.includes(id));

function posesFran(def: FiguraDef) {
  const idle: Pose[] = Array.from({ length: 6 }, (_, i) => {
    const f = fase(i, 6);
    return { onda: f, mods: { torso: { sy: 1 + 0.012 * sen(f), sx: 1 - 0.006 * sen(f) }, cabeza: { dy: 3 * sen(f - 0.5), rot: 0.02 * sen(f) }, barba: { rot: 0.03 * sen(2 * f) }, 'brazo.a': { rot: 0.03 * sen(f + 1) }, vaso: { rot: 0.04 * sen(2 * f + 2) }, 'brazo.b': { rot: 0.04 * sen(f + 0.5) } } };
  });
  const correr: Pose[] = n8.map((i) => {
    const f = fase(i, 8);
    const s = sen(f);
    const c = Math.cos(f);
    const dy = 10 * Math.abs(s) - 7;
    return {
      onda: f * 1.5,
      cuerpo: { rot: 0.1 },
      mods: {
        'pierna.a': { rot: 0.85 * s },
        'pierna.b': { rot: -0.85 * s },
        torso: { dy },
        cabeza: { dy, rot: -0.05 * s },
        tela: { dy },
        'brazo.a': { dy, rot: -0.45 + 0.45 * c },
        'brazo.b': { dy, rot: -0.6 * c },
        vaso: { rot: 0.12 * s },
        barba: { rot: 0.06 * c },
      },
    };
  });
  const sube: Pose = { onda: 2, mods: { 'pierna.a': { rot: -0.85 }, 'pierna.b': { rot: 0.4 }, 'brazo.b': { rot: 2.5 }, 'brazo.a': { rot: -2.0 }, torso: { sy: 1.04 }, cabeza: { dy: 3 } } };
  const baja: Pose = { onda: 4, mods: { 'pierna.a': { rot: -0.4 }, 'pierna.b': { rot: 0.4 }, 'brazo.b': { rot: 2.0 }, 'brazo.a': { rot: -1.4 }, torso: { sy: 0.97 }, cabeza: { dy: -5 }, tela: { sy: 1.25 } } };
  const aterriza: Pose = { onda: 1, cuerpo: { sy: 0.88, sx: 1.1 }, mods: { 'pierna.a': { rot: -0.5 }, 'pierna.b': { rot: 0.5 }, 'brazo.a': { rot: -0.5 }, 'brazo.b': { rot: 0.6 } } };
  // The jarrazo: the mug arm goes back and up, over the head and down in front (clockwise).
  const ataque: Pose[] = [
    { cuerpo: { rot: -0.1 }, mods: { 'brazo.a': { rot: 2.2 }, vaso: { rot: 0.3 }, 'brazo.b': { rot: -0.8 }, 'pierna.a': { rot: 0.35 }, 'pierna.b': { rot: -0.35 } } },
    { cuerpo: { rot: -0.02 }, mods: { 'brazo.a': { rot: 3.3 }, vaso: { rot: 0.1 }, 'brazo.b': { rot: -1.2 }, 'pierna.a': { rot: 0.1 }, 'pierna.b': { rot: -0.25 } } },
    { cuerpo: { rot: 0.1 }, mods: { 'brazo.a': { rot: 4.3 }, vaso: { rot: -0.2 }, 'brazo.b': { rot: -1.4 }, 'pierna.a': { rot: -0.45 }, 'pierna.b': { rot: 0.4 } } },
    { cuerpo: { rot: 0.16 }, mods: { 'brazo.a': { rot: 5.0 }, vaso: { rot: 0.7 }, 'brazo.b': { rot: -1.2 }, 'pierna.a': { rot: -0.55 }, 'pierna.b': { rot: 0.45 } } },
  ];
  const carga: Pose = { cuerpo: { sy: 0.94, rot: 0.1 }, mods: { 'brazo.a': { rot: 2.0 }, vaso: { rot: 0.3 }, 'brazo.b': { rot: -1.0 }, 'pierna.a': { rot: 0.45 }, 'pierna.b': { rot: -0.45 } } };
  const dano: Pose = { cuerpo: { rot: -0.2 }, mods: { 'brazo.b': { rot: 1.3 }, 'brazo.a': { rot: 1.1 }, vaso: { rot: 0.5 }, cabeza: { rot: -0.2, dy: -4 }, 'pierna.a': { rot: 0.3 }, 'pierna.b': { rot: -0.2 }, tela: { sy: 1.2 } } };
  const mutis: Pose = { cuerpo: { rot: 0.42 }, onda: 5, mods: { 'pierna.a': { rot: -1.05 }, 'pierna.b': { rot: 0.95 }, 'brazo.b': { rot: 2.4 }, 'brazo.a': { rot: -1.0 }, cabeza: { rot: -0.2 } } };
  const celebra: Pose[] = [0, 1].map((i) => ({ onda: i * 2, mods: { 'brazo.a': { rot: 3.1 + 0.2 * i }, 'brazo.b': { rot: 2.7 - 0.2 * i }, cabeza: { dy: -6 - 4 * i }, vaso: { rot: 0.3 * (i ? 1 : -1) } } }));
  const retrato: Pose = { ocultar: soloCabeza(def, ['cabeza', 'cara', 'barba']) };
  return { idle, correr, sube: [sube], baja: [baja], aterriza: [aterriza], ataque, carga: [carga], dano: [dano], mutis: [mutis], celebra, retrato: [retrato] } satisfies Record<AnimFran, Pose[]>;
}

function posesGuille(def: FiguraDef) {
  const idle: Pose[] = Array.from({ length: 6 }, (_, i) => {
    const f = fase(i, 6);
    return {
      onda: f,
      mods: {
        torso: { sy: 1 + 0.012 * sen(f) },
        cabeza: { dy: 2.5 * sen(f - 0.4), rot: 0.025 * sen(f + 1) },
        'pelo.a': { rot: 0.05 * sen(f + 0.3) },
        'pelo.b': { rot: 0.04 * sen(f + 1.5), dy: 2 * sen(f) },
        'pelo.c': { rot: 0.05 * sen(f + 2.4) },
        'brazo.a': { rot: 0.04 * sen(f + 1.1) },
        'brazo.b': { rot: 0.04 * sen(f + 0.3) },
        vaso: { rot: 0.05 * sen(2 * f + 2) },
      },
    };
  });
  const celebra: Pose[] = [0, 1].map((i) => ({ onda: i * 2.5, mods: { 'brazo.a': { rot: 3.0 + 0.25 * i }, 'brazo.b': { rot: 2.8 - 0.25 * i }, cabeza: { dy: -6 - 3 * i, rot: i ? 0.06 : -0.06 }, vaso: { rot: 0.3 }, 'pelo.b': { dy: -3 * i } } }));
  // Shut in the flower, banging on the petals.
  const atrapado: Pose[] = Array.from({ length: 4 }, (_, i) => {
    const f = fase(i, 4);
    return { onda: f, mods: { 'brazo.a': { rot: 2.4 + 0.4 * sen(f) }, 'brazo.b': { rot: 2.5 - 0.4 * sen(f) }, cabeza: { dy: 3 * sen(f), rot: 0.06 * sen(f) }, 'pelo.b': { dy: 3 * sen(f + 1) } } };
  });
  const retrato: Pose = { ocultar: soloCabeza(def, ['cabeza', 'cara', 'pelo.a', 'pelo.b', 'pelo.c']) };
  return { idle, celebra, atrapado, retrato: [retrato] } satisfies Record<AnimGuille, Pose[]>;
}

function posesDespertador() {
  const andar: Pose[] = Array.from({ length: 4 }, (_, i) => {
    const f = fase(i, 4);
    return { mods: { cuerpo: { dy: -5 * Math.abs(sen(f)), rot: 0.05 * sen(f) }, 'pie.a': { rot: 0.5 * sen(f) }, 'pie.b': { rot: -0.5 * sen(f) }, 'campana.a': { rot: 0.08 * sen(f * 2) }, 'campana.b': { rot: -0.08 * sen(f * 2) } } };
  });
  const alerta: Pose[] = [0, 1].map((i) => {
    const sg = i ? 1 : -1;
    return { mods: { cuerpo: { rot: 0.07 * sg, sy: 1.04, sx: 0.97 }, 'campana.a': { rot: -0.4 * sg }, 'campana.b': { rot: 0.4 * sg }, martillo: { rot: 0.85 * sg }, 'pie.a': { rot: 0.15 }, 'pie.b': { rot: -0.15 } } };
  });
  const carga: Pose[] = [0, 1].map((i) => ({ mods: { cuerpo: { rot: 0.32, dy: -4 }, 'pie.a': { rot: i ? 1.0 : -1.0 }, 'pie.b': { rot: i ? -1.0 : 1.0 }, 'campana.a': { rot: -0.55 }, 'campana.b': { rot: -0.3 }, martillo: { rot: i ? 0.5 : -0.5 } } }));
  const mareo: Pose[] = [0, 1].map((i) => {
    const sg = i ? 1 : -1;
    return { mods: { cuerpo: { rot: 0.26 * sg, sy: 0.95, sx: 1.04 }, 'campana.a': { rot: 0.3 * sg }, 'campana.b': { rot: 0.5 * sg }, martillo: { rot: -0.9 * sg }, 'pie.a': { rot: 0.3 * sg }, 'pie.b': { rot: -0.1 * sg } } };
  });
  const dano: Pose = { mods: { cuerpo: { rot: -0.3, sx: 0.88, sy: 1.12, dy: -4 }, 'campana.a': { rot: -0.6 }, 'campana.b': { rot: 0.7 }, martillo: { rot: 0.9 } } };
  const agacha: Pose = { mods: { cuerpo: { sy: 0.78, sx: 1.16 }, 'campana.a': { rot: -0.3 }, 'campana.b': { rot: 0.3 }, 'pie.a': { rot: 0.2 }, 'pie.b': { rot: -0.2 } } };
  const salta: Pose = { mods: { cuerpo: { sy: 1.16, sx: 0.9 }, 'campana.a': { rot: 0.5 }, 'campana.b': { rot: -0.5 }, 'pie.a': { rot: 0.5 }, 'pie.b': { rot: -0.5 }, martillo: { rot: 0.4 } } };
  return { andar, alerta, carga, mareo, dano: [dano], agacha: [agacha], salta: [salta] } satisfies Record<AnimDespertador, Pose[]>;
}

function posesReloj() {
  const repta: Pose[] = Array.from({ length: 4 }, (_, i) => {
    const f = fase(i, 4);
    return { mods: { cuerpo: { sx: 1 + 0.1 * sen(f), sy: 1 - 0.09 * sen(f) }, 'gota.a': { dy: 3 * sen(2 * f) }, 'gota.b': { dy: 3 * sen(2 * f + 1) } } };
  });
  const gotea: Pose[] = [0, 1].map((i) => ({ mods: { cuerpo: { sy: 0.93 - 0.03 * i, sx: 1.05 }, 'gota.a': { dy: 10 + 10 * i, sy: 1.3 + 0.3 * i }, 'gota.b': { dy: 6 + 14 * i, sy: 1.2 + 0.4 * i } } }));
  const dano: Pose = { mods: { cuerpo: { sx: 1.22, sy: 0.72 }, 'gota.a': { dy: 8 }, 'gota.b': { dy: 8 } } };
  return { repta, gotea, dano: [dano] } satisfies Record<AnimReloj, Pose[]>;
}

// ---------------------------------------------------------------- baking

/** A portrait frame made small, with a ring of beer foam over its lower third (it is peeking out of the jar). */
function cabecita(f: Cuadro, esc: number): Sprite {
  const k = 0.72;
  const w = (f.c.width / f.ppu) * esc * k;
  const h = (f.c.height / f.ppu) * esc * k;
  const q = 2.4;
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * q + 8);
  c.height = Math.ceil(h * q + 8);
  const x = c.getContext('2d')!;
  x.drawImage(f.c, 4, 4, w * q, h * q);
  // Foam: cream bubbles across the bottom, so that the head seems to come up out of it.
  const cy = c.height - 4;
  const blobs = [[0.12, 0.2], [0.3, 0.26], [0.5, 0.22], [0.7, 0.27], [0.88, 0.2], [0.04, 0.14], [0.96, 0.14]];
  for (const [fx, r] of blobs) {
    const bx = 4 + w * q * fx;
    const br = w * q * r * 0.7;
    const g = x.createRadialGradient(bx - br * 0.3, cy - br * 0.55, br * 0.1, bx, cy - br * 0.35, br);
    g.addColorStop(0, '#fffdf4');
    g.addColorStop(0.7, '#fbe9cc');
    g.addColorStop(1, '#e8c898');
    x.fillStyle = g;
    x.beginPath();
    x.arc(bx, cy - br * 0.35, br, 0, 6.3);
    x.fill();
  }
  x.fillStyle = '#fbe9cc';
  x.fillRect(4, cy - h * q * 0.08, w * q, h * q * 0.08 + 4);
  return { c, x: -c.width / q / 2, y: -c.height / q + 2, w: c.width / q, h: c.height / q };
}

async function sprite(d: { x: number; y: number; w: number; h: number; svg: string }, esc: number, q = Q): Promise<Sprite> {
  const c = await hornearDibujo(d, esc * q);
  return { c, x: d.x * esc, y: d.y * esc, w: d.w * esc, h: d.h * esc };
}

async function rig<K extends string>(def: FiguraDef, poses: Record<K, Pose[]>, esc: number, q = Q): Promise<Record<K, Cuadro[]>> {
  const nombres = Object.keys(poses) as K[];
  const lista = nombres.flatMap((n) => poses[n]);
  const cuadros = await hornearRig(def, lista, esc * q);
  const out = {} as Record<K, Cuadro[]>;
  let i = 0;
  for (const n of nombres) {
    out[n] = cuadros.slice(i, i + poses[n].length);
    i += poses[n].length;
  }
  return out;
}

let hecho: Promise<Arte> | null = null;

/** Bakes everything. `avance` is told how far along it is (0–1). Called once; the result is kept. */
export function cargarArte(avance?: (f: number) => void): Promise<Arte> {
  hecho ??= (async () => {
    const pasos = 11;
    let n = 0;
    const paso = <T>(p: Promise<T>) => p.then((r) => (avance?.(++n / pasos), r));
    const fran = A.figura('fran') as unknown as FiguraDef;
    const guille = A.figura('guille') as unknown as FiguraDef;
    const des = U.despertador() as unknown as FiguraDef;
    const gran = U.despertador({ color: '#d6385a', oro: '#ffb23a' }) as unknown as FiguraDef;
    const rel = U.reloj() as unknown as FiguraDef;
    const E = ESCALA;
    const [f, g, d, gr, r] = [
      await paso(rig(fran, posesFran(fran), E.fran)),
      await paso(rig(guille, posesGuille(guille), E.guille)),
      await paso(rig(des, posesDespertador(), E.despertador)),
      await paso(rig(gran, posesDespertador(), E.gran, 1.2)),
      await paso(rig(rel, posesReloj(), E.reloj)),
    ];
    const [barra, sorbo, florFondo, florCerrada, florAbierta, portal, charco, gota, iC, iT, iM, jl, jv] = await Promise.all([
      sprite(U.barra(), 0.62),
      sprite(U.sorbo(), 0.8),
      sprite(U.florFondo(), 0.62),
      sprite(U.florCerrada(), 0.62),
      sprite(U.florAbierta(), 0.62),
      sprite(U.portal(), 0.62),
      sprite(U.charco(), 0.9),
      sprite(U.gotaCae(), 0.8),
      sprite(U.iconoCierzo(), 0.7),
      sprite(U.iconoTeclazo(), 0.7),
      sprite(U.iconoPared(), 0.7),
      sprite(U.jarraVida(true), 0.5),
      sprite(U.jarraVida(false), 0.5),
    ]);
    avance?.(1);
    // White copies of the enemies' frames, ready for the flash of a hit.
    const blanco = new Map<Cuadro, Cuadro>();
    for (const anim of [d, gr, r] as Record<string, Cuadro[]>[]) for (const lista of Object.values(anim)) for (const c of lista) blanco.set(c, tenir(c, '#fff4e0'));
    const asoma: Arte['asoma'] = { guille: cabecita(g.retrato[0], E.guille) };
    return {
      fran: f,
      guille: g,
      despertador: d,
      gran: gr,
      reloj: r,
      blanco,
      props: { barra, sorbo, florFondo, florCerrada, florAbierta, portal, charco, gota, iconoCierzo: iC, iconoTeclazo: iT, iconoPared: iM, jarraLlena: jl, jarraVacia: jv },
      brillos: {
        oro: resplandor('#ffd95a', 64, 0.95),
        blanco: resplandor('#ffffff', 64, 0.95),
        espuma: resplandor('#fff3d0', 64, 0.9),
        turquesa: resplandor('#46e0d0', 64, 0.95),
        magenta: resplandor('#ff4fa8', 64, 0.95),
        rojo: resplandor('#ff5a4a', 64, 0.95),
        violeta: resplandor('#9a7cff', 64, 0.9),
        ambar: resplandor('#ffb347', 64, 0.95),
      },
      asoma,
    } satisfies Arte;
  })();
  return hecho;
}

/** Frees the memory of the baked art when the game closes. */
export function soltarArte() {
  hecho = null;
}
