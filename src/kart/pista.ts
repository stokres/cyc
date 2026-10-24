// The circuit of Impropios Kart: a country house. One 1024×1024 texture (the floor, painted once by code in
// 16-bit pixel art), the surface map that goes with it (track, grass, water, wall, oil, turbo, item box, slippery
// tile) and the racing line the computer follows, all made from one closed spline.
//
// How it is built: the centre line is a spline through the control points below. For every texel we find the nearest
// sample of the line (its distance, how far along the track it is, and on which side), and from those three numbers
// each tramo of the house paints its own look: gravel at the door, the garden around the pool, the rug and sofas of
// the lounge, the kitchen tiles and the oil, and the drag gala's catwalk with its lights, public and turbo pads.
// Nothing here runs per frame; `construirPista` is awaited once, in slices, while the race is being prepared.
import { K } from './texturas';

export const TAM = 1024;
/** The ceiling map has one cell per this many texels. */
export const CELDA_TECHO = 4;

/** Surface types, as stored in the surface map. */
export const SUP = { PISTA: 0, HIERBA: 1, AGUA: 2, MURO: 3, ACEITE: 4, TURBO: 5, CAJA: 6, RESBALA: 7 } as const;
export type Sup = (typeof SUP)[keyof typeof SUP];

/** The five tramos of the house, in the order they are driven. */
export const ZONA = { SALIDA: 0, JARDIN: 1, SALON: 2, COCINA: 3, GALA: 4 } as const;
export const CLAVE_ZONA = ['zona.salida', 'zona.jardin', 'zona.salon', 'zona.cocina', 'zona.gala'] as const;

/** [x, y, zone of the stretch that starts here, half width of the road, width of the shoulder]. The loop is clockwise. */
const CONTROL: Array<[number, number, number, number, number]> = [
  // the door: gravel path, the start/finish line, a banner
  [895, 840, 0, 44, 24],
  [840, 912, 0, 44, 24],
  [740, 925, 0, 44, 24],
  [640, 924, 0, 44, 24],
  // the garden and the pool
  [520, 925, 1, 46, 32],
  [390, 930, 1, 46, 32],
  [270, 915, 1, 46, 32],
  [175, 865, 1, 46, 32],
  [120, 775, 1, 46, 32],
  [115, 670, 1, 46, 32],
  // the lounge: tight bends between the furniture
  [165, 585, 2, 38, 12],
  [235, 515, 2, 38, 12],
  [170, 440, 2, 38, 12],
  [115, 350, 2, 38, 12],
  [190, 275, 2, 38, 12],
  [130, 195, 2, 38, 12],
  [190, 125, 2, 38, 12],
  [310, 105, 2, 38, 12],
  [410, 150, 2, 40, 12],
  // the kitchen: slippery tiles around the island
  [500, 115, 3, 42, 12],
  [620, 92, 3, 42, 12],
  [740, 105, 3, 42, 12],
  [830, 160, 3, 42, 12],
  [870, 260, 3, 42, 12],
  // the drag gala: the catwalk
  [885, 340, 4, 48, 14],
  [905, 450, 4, 48, 14],
  [905, 600, 4, 48, 14],
  [900, 740, 4, 48, 14],
];

/** Where the finish line sits (the spline sample nearest to this point). */
const PUNTO_META: [number, number] = [775, 923];
/** The wall band (furniture, public...) painted beyond the shoulder. */
const BANDA = 26;

interface Muestra {
  x: number;
  y: number;
  /** Arc length from the first sample. */
  s: number;
  /** Unit tangent, and unit normal to the right of the travel. */
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  semi: number;
  hombro: number;
  zona: number;
}

/** A waypoint of the racing line. */
export interface PuntoLinea {
  x: number;
  y: number;
  s: number;
  /** Heading of the line here. */
  ang: number;
  /** How sharp the bend ahead is (radians turned over the next stretch): the computer slows down for it. */
  curva: number;
  semi: number;
  zona: number;
}

/** A thing standing on the floor that is seen from the camera as a sprite. */
export interface Decorado {
  tipo:
    | 'olivo'
    | 'sombrilla'
    | 'flamenco'
    | 'planta'
    | 'lampara'
    | 'altavoz'
    | 'foco'
    | 'bola'
    | 'arco'
    | 'tumbona'
    | 'pozo'
    | 'maceta'
    | 'cipres'
    | 'publico'
    | 'neon'
    | 'focoTecho'
    | 'jamon'
    | 'ajos'
    | 'colgante'
    | 'ventilador'
    | 'baston';
  /** Variant of the drawing (the audience, the lounge...). */
  v?: number;
  x: number;
  y: number;
  /** Size relative to its drawing. */
  escala: number;
  /** Height above the floor in world units (the disco ball hangs). */
  alto?: number;
}

/** A doorway: a flat frame across the corridor at (x, y), perpendicular to the unit tangent (tx, ty). */
export interface Puerta {
  x: number;
  y: number;
  tx: number;
  ty: number;
  /** Half the width of the frame. */
  medio: number;
  /** Index into PUERTA (texturas.ts). */
  tipo: number;
}

export interface Caja {
  x: number;
  y: number;
  /** The surface to put back when the box comes again. */
  suelo: Sup;
}

export interface Pista {
  /** Floor colours (ABGR), the full size and three halvings for the far rows. */
  mips: Uint32Array[];
  sup: Uint8Array;
  linea: PuntoLinea[];
  longitud: number;
  /** Index of the first waypoint at or after the finish line, and the line itself. */
  meta: { idx: number; x: number; y: number; ang: number; s: number };
  cajas: Caja[];
  decorado: Decorado[];
  /** Positions of the six places on the grid, best first. */
  parrilla: Array<{ x: number; y: number; ang: number }>;
  /** The walls the camera sees: the kind of wall of every texel that is a wall in `sup` (0 = none), and the column of its texture ×4 and the heading of the wall there (7 bits of angle, the top bit set on the right-hand walls). */
  paredes: { kind: Uint8Array; col: Uint16Array; dir: Uint8Array };
  /** The ceiling over the rooms: one cell per CELDA_TECHO texels, 0 = open sky, 1 lounge, 2 kitchen, 3 gala. */
  techo: Uint8Array;
  /** The doorways between the rooms (see-through frames). */
  puertas: Puerta[];
  /** The minimap, painted once. */
  mapa: HTMLCanvasElement;
  /** Zone at an arc length. */
  zonaEn(s: number): number;
  /** Place and heading of the line at an arc length and a lateral offset (right is positive). */
  enLinea(s: number, lado: number): { x: number; y: number; ang: number };
  /** The surface at a world position (a wall outside the map). */
  supEn(x: number, y: number): Sup;
  /** Overwrites a disc of the surface map (the item boxes appear and vanish with it). */
  poner(x: number, y: number, r: number, sup: Sup): void;
}

// ---------------------------------------------------------------- colours and noise

const col = (hex: number) => (0xff000000 | ((hex & 0xff) << 16) | (hex & 0xff00) | ((hex >> 16) & 0xff)) >>> 0;
const mezcla = (a: number, b: number, t: number) => {
  const r = (a & 255) + ((b & 255) - (a & 255)) * t;
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t;
  const bl = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t;
  return (0xff000000 | (bl << 16) | (g << 8) | r) >>> 0;
};
const hash = (x: number, y: number) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Noise in blocks of `b` texels. */
const bloque = (x: number, y: number, b: number) => hash(Math.floor(x / b), Math.floor(y / b));
const mod = (a: number, n: number) => ((a % n) + n) % n;
const pick = <T>(arr: readonly T[], r: number) => arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];

// ---------------------------------------------------------------- the spline

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function muestrear(paso: number): { m: Muestra[]; sCtrl: number[] } {
  const n = CONTROL.length;
  const m: Muestra[] = [];
  const inicioCtrl: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = [CONTROL[(i - 1 + n) % n], CONTROL[i], CONTROL[(i + 1) % n], CONTROL[(i + 2) % n]];
    const largo = Math.hypot(c[2][0] - c[1][0], c[2][1] - c[1][1]);
    const pasos = Math.max(2, Math.round(largo / paso));
    inicioCtrl.push(m.length);
    for (let k = 0; k < pasos; k++) {
      const t = k / pasos;
      const e = t * t * (3 - 2 * t);
      m.push({
        x: catmull(c[0][0], c[1][0], c[2][0], c[3][0], t),
        y: catmull(c[0][1], c[1][1], c[2][1], c[3][1], t),
        s: 0,
        tx: 0,
        ty: 0,
        nx: 0,
        ny: 0,
        semi: c[1][3] + (c[2][3] - c[1][3]) * e,
        hombro: c[1][4] + (c[2][4] - c[1][4]) * e,
        zona: c[1][2],
      });
    }
  }
  let s = 0;
  for (let i = 0; i < m.length; i++) {
    const a = m[(i - 1 + m.length) % m.length];
    const b = m[(i + 1) % m.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    m[i].tx = dx / l;
    m[i].ty = dy / l;
    m[i].nx = -m[i].ty;
    m[i].ny = m[i].tx;
    m[i].s = s;
    s += Math.hypot(b.x - m[i].x, b.y - m[i].y);
  }
  (m as Muestra[] & { total?: number }).total = s;
  return { m, sCtrl: inicioCtrl.map((i) => m[i].s) };
}

// ---------------------------------------------------------------- the building

const pausa = () => new Promise<void>((r) => setTimeout(r, 0));

/** Furniture of the lounge: [first control point, last control point, side (-1 left, 1 right, 0 both), kind]. */
const MUEBLES: Array<[number, number, number, string]> = [
  [10, 11.4, -1, 'sofa'],
  [10.3, 11.5, 1, 'sofa'],
  [11.5, 12.6, -1, 'chimenea'],
  [12, 13, 1, 'estanteria'],
  [12.9, 13.9, -1, 'estanteria'],
  [13.4, 14.5, 1, 'sofa'],
  [14.3, 15.4, -1, 'sofa'],
  [15.2, 16.2, 1, 'sofa'],
  [15.7, 16.4, -1, 'mesa'],
  [16.7, 17.8, -1, 'sofa'],
  [16.8, 17.6, 1, 'estanteria'],
  [17.9, 18.55, -1, 'mesa'],
  [18.1, 18.9, 1, 'mesa'],
];

export async function construirPista(avance: (f: number) => void = () => {}): Promise<Pista> {
  const { m: muestras, sCtrl } = muestrear(3);
  const longitud = (muestras as Muestra[] & { total?: number }).total ?? 0;
  const N = muestras.length;
  const T = TAM;

  // ---- nearest sample for every texel
  const dist2 = new Float32Array(T * T).fill(1e9);
  const idx = new Int16Array(T * T).fill(-1);
  for (let i = 0; i < N; i++) {
    const p = muestras[i];
    const R = Math.ceil(p.semi + p.hombro + BANDA + 4);
    const y0 = Math.max(0, Math.floor(p.y - R));
    const y1 = Math.min(T - 1, Math.ceil(p.y + R));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - p.y;
      const w = Math.sqrt(Math.max(0, R * R - dy * dy));
      const x0 = Math.max(0, Math.floor(p.x - w));
      const x1 = Math.min(T - 1, Math.ceil(p.x + w));
      const fila = y * T;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - p.x;
        const d2 = dx * dx + dy * dy;
        if (d2 < dist2[fila + x]) {
          dist2[fila + x] = d2;
          idx[fila + x] = i;
        }
      }
    }
    if (i % 200 === 0) {
      avance((0.25 * i) / N);
      await pausa();
    }
  }

  /** Arc length at a (fractional) control point. */
  const sAt = (c: number) => {
    const i = Math.floor(c);
    const s0 = sCtrl[i];
    const s1 = i + 1 >= CONTROL.length ? longitud : sCtrl[i + 1];
    return s0 + (s1 - s0) * (c - i);
  };
  // the house's front door sits at the end of the catwalk: from there on it is outside again
  const sFront = sAt(27.78);
  for (const p of muestras) if (p.zona === ZONA.GALA && p.s >= sFront) p.zona = ZONA.SALIDA;

  // ---- the line of the computer, a waypoint every ~18 units
  const linea: PuntoLinea[] = [];
  const cada = 6;
  for (let i = 0; i < N; i += cada) {
    const p = muestras[i];
    linea.push({ x: p.x, y: p.y, s: p.s, ang: Math.atan2(p.ty, p.tx), curva: 0, semi: p.semi, zona: p.zona });
  }
  const L = linea.length;
  for (let i = 0; i < L; i++) {
    // radians turned between a few waypoints behind and ahead
    let d = linea[(i + 4) % L].ang - linea[i].ang;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    linea[i].curva = Math.abs(d);
  }

  // ---- the finish line
  let metaI = 0;
  let mejor = 1e9;
  for (let i = 0; i < N; i++) {
    const d = Math.hypot(muestras[i].x - PUNTO_META[0], muestras[i].y - PUNTO_META[1]);
    if (d < mejor) {
      mejor = d;
      metaI = i;
    }
  }
  const sMeta = muestras[metaI].s;
  /** Arc length measured from the finish line (0 at the line, `longitud` a lap later). */
  const desdeMeta = (s: number) => mod(s - sMeta, longitud);

  // ---- the features, in world coordinates
  const PISCINA = { x0: 200, y0: 640, x1: 500, y1: 830 };
  const COPING = 9;
  const tablon = { ax: 300, ay: 884, bx: 142, by: 736, medio: 14 };
  const manchas: Array<[number, number, number]> = [
    [838, 168, 17], [858, 186, 13], [822, 184, 11], [866, 205, 10],
    [585, 100, 12], [602, 108, 9],
  ];
  // turbo pads: [control point index + fraction, half width]
  const turbos: Array<[number, number]> = [
    [27.3, 18], [25.4, 18], [26.3, 18], [5.55, 15], [21.5, 18], [2.6, 18],
  ];

  const sTurbos = turbos.map(([c, w]) => ({ s: sAt(c), w }));
  const sMuebles = MUEBLES.map(([a, b, lado, tipo], k) => ({ s0: sAt(a), s1: sAt(b), lado, tipo, k }));
  const sUmbral = [sCtrl[10], sCtrl[19], sCtrl[24], sFront];

  // ---- paint
  const color = new Uint32Array(T * T);
  const sup = new Uint8Array(T * T);
  const pKind = new Uint8Array(T * T);
  const pCol = new Uint16Array(T * T);
  const pDir = new Uint8Array(T * T);
  const PISTA = SUP.PISTA;

  for (let ty = 0; ty < T; ty++) {
    for (let tx = 0; tx < T; tx++) {
      const o = ty * T + tx;
      const i = idx[o];
      let c: number;
      let s: number = SUP.MURO;
      if (tx < 10 || ty < 10 || tx >= T - 10 || ty >= T - 10) {
        // the fence all round the world
        c = ((tx >> 2) + (ty >> 2)) & 1 ? col(0x8a6a44) : col(0x6e5234);
        color[o] = c;
        sup[o] = SUP.MURO;
        pKind[o] = K.TAPIA;
        continue;
      }
      if (i < 0) {
        color[o] = fondoLejos(tx, ty);
        sup[o] = SUP.MURO;
        pKind[o] = K.TAPIA;
        pCol[o] = ((tx + ty) * 4) & 0xffff;
        continue;
      }
      const p = muestras[i];
      const dx = tx + 0.5 - p.x;
      const dy = ty + 0.5 - p.y;
      const ad = Math.sqrt(dist2[o]);
      const d = dx * p.nx + dy * p.ny;
      const u = p.s + dx * p.tx + dy * p.ty;
      const z = p.zona;
      if (ad < p.semi) {
        c = calzada(z, tx, ty, u, d, ad, p.semi, desdeMeta(u));
        s = z === ZONA.COCINA ? SUP.RESBALA : PISTA;
        // zone thresholds: a strip of floor crossing the road where the house changes room
        for (const su of sUmbral) {
          if (Math.abs(u - su) < 3) {
            c = mod(Math.floor(u - su), 2) ? col(0x7a4a28) : col(0x8d5a32);
          }
        }
      } else if (ad < p.semi + p.hombro) {
        c = hombro(z, tx, ty, u, d, ad - p.semi);
        s = SUP.HIERBA;
      } else {
        const w = ad - p.semi - p.hombro;
        paredDe(z, d >= 0, w, u, sMuebles);
        pKind[o] = _kind;
        pCol[o] = _col;
        pDir[o] = (Math.round((mod(Math.atan2(p.ty, p.tx), Math.PI * 2) / (Math.PI * 2)) * 128) & 127) | (d >= 0 ? 128 : 0);
        c = muro(z, tx, ty, u, d, w, sMuebles);
      }
      color[o] = c;
      sup[o] = s;
    }
    if (ty % 96 === 0) {
      avance(0.25 + (0.55 * ty) / T);
      await pausa();
    }
  }

  // ---- the pool (a hole in the hedge and the shoulder, never in the road)
  for (let ty = PISCINA.y0 - COPING; ty < PISCINA.y1 + COPING + 10; ty++) {
    for (let tx = PISCINA.x0 - COPING; tx < PISCINA.x1 + COPING; tx++) {
      const o = ty * T + tx;
      const i = idx[o];
      if (i >= 0) {
        const p = muestras[i];
        if (Math.sqrt(dist2[o]) < p.semi) continue;
      }
      const dentro = tx >= PISCINA.x0 && tx < PISCINA.x1 && ty >= PISCINA.y0 && ty < PISCINA.y1;
      if (dentro) {
        color[o] = agua(tx, ty, PISCINA);
        sup[o] = SUP.AGUA;
      } else {
        // the coping: pale stone tiles (a low kerb for the camera), driveable only where it was shoulder
        if (ty >= PISCINA.y1 + COPING && sup[o] !== SUP.MURO) continue;
        color[o] = copete(tx, ty);
        if (sup[o] === SUP.MURO) {
          pKind[o] = K.BORDILLO;
          pCol[o] = (tx * 4) & 0xffff;
        }
      }
    }
  }

  // ---- the springboard: a plank across the pool, an optional shortcut for whoever carries a turbo
  const vx = tablon.bx - tablon.ax;
  const vy = tablon.by - tablon.ay;
  const lv = Math.hypot(vx, vy);
  const ux = vx / lv;
  const uy = vy / lv;
  for (let ty = Math.floor(Math.min(tablon.ay, tablon.by)) - 20; ty < Math.max(tablon.ay, tablon.by) + 20; ty++) {
    for (let tx = Math.floor(Math.min(tablon.ax, tablon.bx)) - 20; tx < Math.max(tablon.ax, tablon.bx) + 20; tx++) {
      const px = tx + 0.5 - tablon.ax;
      const py = ty + 0.5 - tablon.ay;
      const a = px * ux + py * uy;
      const b = px * -uy + py * ux;
      if (a < 0 || a > lv || Math.abs(b) > tablon.medio) continue;
      const o = ty * T + tx;
      const i = idx[o];
      if (i >= 0 && Math.sqrt(dist2[o]) < muestras[i].semi) continue;
      color[o] = tablonColor(a, b, tablon.medio);
      sup[o] = SUP.PISTA;
    }
  }

  // ---- oil stains (only over the road)
  for (const [mx, my, r] of manchas) {
    for (let ty = Math.floor(my - r); ty <= my + r; ty++) {
      for (let tx = Math.floor(mx - r); tx <= mx + r; tx++) {
        const dd = Math.hypot(tx + 0.5 - mx, ty + 0.5 - my);
        if (dd > r) continue;
        const o = ty * T + tx;
        if (sup[o] !== SUP.RESBALA && sup[o] !== SUP.PISTA) continue;
        const brillo = dd > r * 0.35 && dd < r * 0.6 && (tx + ty) % 7 < 2;
        color[o] = brillo ? col(0x6a4a8c) : dd > r - 2 ? col(0x2a1a26) : col(0x1a1220);
        sup[o] = SUP.ACEITE;
      }
    }
  }

  // ---- turbo pads
  const pistaT = (tx: number, ty: number) => {
    const o = ty * T + tx;
    const i = idx[o];
    if (i < 0) return;
    const p = muestras[i];
    const ad = Math.sqrt(dist2[o]);
    if (ad >= p.semi) return;
    if (sup[o] !== PISTA && sup[o] !== SUP.RESBALA) return;
    const dx = tx + 0.5 - p.x;
    const dy = ty + 0.5 - p.y;
    const d = dx * p.nx + dy * p.ny;
    const u = p.s + dx * p.tx + dy * p.ty;
    for (const { s: st, w } of sTurbos) {
      const a = u - st;
      if (a < 0 || a > 26 || Math.abs(d) > w) continue;
      const v = a - Math.abs(d) * 0.9;
      color[o] = mod(Math.floor(v / 5), 2) ? col(0xffd23a) : col(0xff8a1f);
      if (Math.abs(d) > w - 1.5 || a < 1.5 || a > 24.5) color[o] = col(0xfff3a0);
      sup[o] = SUP.TURBO;
      return;
    }
  };
  for (const p of muestras) {
    if (!sTurbos.some(({ s }) => Math.abs(p.s - s - 13) < 40)) continue;
    const R = Math.ceil(p.semi);
    for (let ty = Math.floor(p.y - R); ty <= p.y + R; ty++) for (let tx = Math.floor(p.x - R); tx <= p.x + R; tx++) pistaT(tx, ty);
  }

  // ---- the finish line: two rows of black and white squares across the road
  for (let i = 0; i < N; i++) {
    const p = muestras[i];
    if (Math.abs(desdeMeta(p.s)) > 12 && Math.abs(desdeMeta(p.s) - longitud) > 12) continue;
    const R = Math.ceil(p.semi);
    for (let ty = Math.floor(p.y - R); ty <= p.y + R; ty++) {
      for (let tx = Math.floor(p.x - R); tx <= p.x + R; tx++) {
        const o = ty * T + tx;
        if (idx[o] !== i) continue;
        const ad = Math.sqrt(dist2[o]);
        if (ad >= p.semi - 1) continue;
        const dx = tx + 0.5 - p.x;
        const dy = ty + 0.5 - p.y;
        const d = dx * p.nx + dy * p.ny;
        const a = dx * p.tx + dy * p.ty + muestras[i].s - sMeta;
        const aa = mod(a + longitud / 2, longitud) - longitud / 2;
        if (aa < -4 || aa >= 4) continue;
        color[o] = (Math.floor((aa + 4) / 4) + Math.floor((d + 100) / 4)) & 1 ? col(0x1c1418) : col(0xf8f4ea);
      }
    }
  }

  const iEn = (s: number) => {
    let lo = 0;
    let hi = N - 1;
    const ss = mod(s, longitud);
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (muestras[mid].s <= ss) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  // ---- the walls the camera sees must be exactly the walls of the surface map
  for (let o = 0; o < T * T; o++) {
    if (sup[o] !== SUP.MURO) pKind[o] = K.NADA;
    else if (pKind[o] === K.NADA) pKind[o] = K.TAPIA;
  }

  // ---- the ceiling: over the lounge, the kitchen and the gala, from the patio door to the front door
  const nT = T / CELDA_TECHO;
  const techo = new Uint8Array(nT * nT);
  for (let cy = 0; cy < nT; cy++)
    for (let cx = 0; cx < nT; cx++) {
      const i = idx[(cy * CELDA_TECHO + CELDA_TECHO / 2) * T + cx * CELDA_TECHO + CELDA_TECHO / 2];
      if (i < 0) continue;
      const z = muestras[i].zona;
      if (z >= ZONA.SALON && z <= ZONA.GALA) techo[cy * nT + cx] = z - 1;
    }

  // ---- the doorways, at the changes of room
  const puertas: Puerta[] = [];
  for (const [sd, tipo] of [[sCtrl[10], 0], [sCtrl[19], 1], [sCtrl[24], 2], [sFront, 3]] as const) {
    const i = iEn(sd);
    const p = muestras[i];
    puertas.push({ x: p.x, y: p.y, tx: p.tx, ty: p.ty, medio: p.semi + p.hombro + 3, tipo });
  }

  avance(0.85);
  await pausa();

  // ---- the item boxes: sets of three across the road
  const cajas: Caja[] = [];
  const juegosDeCajas: Array<[number, number]> = [
    [5.2, 0], [9.0, 0], [13.5, 0], [17.5, 0], [21.3, 0], [24.8, 0], [26.7, 0],
  ];
  const enLinea = (s: number, lado: number) => {
    const ss = mod(s, longitud);
    let a = 0;
    // binary search for the sample at this arc length
    let lo = 0;
    let hi = N - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (muestras[mid].s <= ss) lo = mid;
      else hi = mid - 1;
    }
    a = lo;
    const p = muestras[a];
    const q = muestras[(a + 1) % N];
    const dsq = (q.s > p.s ? q.s : longitud) - p.s;
    const f = dsq > 0 ? Math.min(1, (ss - p.s) / dsq) : 0;
    const x = p.x + (q.x - p.x) * f;
    const y = p.y + (q.y - p.y) * f;
    const tx = p.tx + (q.tx - p.tx) * f;
    const ty = p.ty + (q.ty - p.ty) * f;
    const l = Math.hypot(tx, ty) || 1;
    return { x: x - (ty / l) * lado, y: y + (tx / l) * lado, ang: Math.atan2(ty, tx) };
  };
  for (const [c] of juegosDeCajas) {
    const s0 = sAt(c);
    for (const lado of [-22, 0, 22]) {
      const q = enLinea(s0, lado);
      const o = Math.floor(q.y) * T + Math.floor(q.x);
      cajas.push({ x: q.x, y: q.y, suelo: sup[o] as Sup });
    }
  }
  const poner = (x: number, y: number, r: number, v: Sup) => {
    for (let ty = Math.floor(y - r); ty <= y + r; ty++)
      for (let tx = Math.floor(x - r); tx <= x + r; tx++) if (Math.hypot(tx + 0.5 - x, ty + 0.5 - y) <= r && tx >= 0 && ty >= 0 && tx < T && ty < T) sup[ty * T + tx] = v;
  };
  for (const c of cajas) poner(c.x, c.y, 8, SUP.CAJA);

  // ---- the standing scenery (sprites), where nothing drives: behind the low walls, hanging from the ceiling, in the pool
  const decorado: Decorado[] = [];
  const lateral = (i: number, lado: number, extra: number) => {
    const p = muestras[i];
    const dd = p.semi + p.hombro + extra;
    return { x: p.x + p.nx * lado * dd, y: p.y + p.ny * lado * dd };
  };
  const enPiscina = (x: number, y: number, m = 20) => x > PISCINA.x0 - m && x < PISCINA.x1 + m && y > PISCINA.y0 - m && y < PISCINA.y1 + m;
  // outside: olive trees and cypresses on the lawn behind the garden wall, a well, pots
  for (let k = 0; k < 40; k++) {
    const s0 = sCtrl[0] + k * 66 + hash(k, 3) * 22;
    const sd = mod(s0, longitud);
    if (sd > sFront - 120 && sd < sFront + 40) continue;
    const i = iEn(sd);
    const p = muestras[i];
    if (p.zona !== ZONA.JARDIN && p.zona !== ZONA.SALIDA) continue;
    const q = lateral(i, 1, 10 + hash(k, 4) * 10);
    if (enPiscina(q.x, q.y, 14)) continue;
    const r = hash(k, 5);
    decorado.push({ tipo: r < 0.7 ? 'olivo' : 'cipres', x: q.x, y: q.y, escala: 0.9 + hash(k, 6) * 0.35, v: k });
  }
  {
    // the well, behind the wall near the start
    const i = iEn(sMeta + 95);
    const q = lateral(i, 1, 11);
    decorado.push({ tipo: 'pozo', x: q.x, y: q.y, escala: 1 });
    for (const dsd of [-110, 30, 190]) {
      const j = iEn(sMeta + dsd);
      if (muestras[j].zona !== ZONA.SALIDA && muestras[j].zona !== ZONA.JARDIN) continue;
      const m2 = lateral(j, 1, 18);
      decorado.push({ tipo: 'maceta', x: m2.x, y: m2.y, escala: 1.1 });
    }
  }
  // on the pool's terrace: loungers and parasols, flamingos floating in it
  for (const [x, y, v] of [[232, 841, 0], [316, 841, 1], [392, 841, 0]] as const) decorado.push({ tipo: 'tumbona', x, y, escala: 0.95, v });
  for (const x of [270, 352, 440]) decorado.push({ tipo: 'sombrilla', x, y: 842, escala: 0.95, v: x });
  decorado.push({ tipo: 'maceta', x: 207, y: 838, escala: 0.9 });
  decorado.push({ tipo: 'maceta', x: 482, y: 838, escala: 0.9 });
  decorado.push({ tipo: 'flamenco', x: 330, y: 745, escala: 1.4, alto: 0 });
  decorado.push({ tipo: 'flamenco', x: 420, y: 790, escala: 1.2, alto: 0 });
  decorado.push({ tipo: 'flamenco', x: 250, y: 700, escala: 1.1, alto: 0 });
  // the lounge: a lamp and a plant behind the sofas, pendant lamps down the middle
  for (const m of sMuebles) {
    if (m.tipo !== 'sofa') continue;
    const lado = m.lado === 0 ? 1 : m.lado;
    const l1 = lateral(iEn(m.s0 + 9), lado, 8);
    decorado.push({ tipo: 'lampara', x: l1.x, y: l1.y, escala: 1, v: m.k });
    const l2 = lateral(iEn(m.s1 - 9), lado, 10);
    decorado.push({ tipo: 'planta', x: l2.x, y: l2.y, escala: 0.9, v: m.k });
  }
  for (let sd = sCtrl[10] + 70; sd < sCtrl[19] - 40; sd += 150) {
    const q = enLinea(sd, 0);
    decorado.push({ tipo: 'colgante', x: q.x, y: q.y, escala: 1, alto: 45, v: 0 });
  }
  // the kitchen: hams and garlic braids over the island, pots on it, pendant lamps
  for (let sd = sCtrl[19] + 30; sd < sCtrl[24] - 20; sd += 58) {
    const i = iEn(sd);
    const q = lateral(i, 1, 9 + hash(i, 2) * 6);
    const k = Math.floor((sd - sCtrl[19]) / 58);
    if (k % 3 === 2) decorado.push({ tipo: 'planta', x: q.x, y: q.y, escala: 0.8, alto: 22 });
    else decorado.push({ tipo: k % 3 === 0 ? 'jamon' : 'ajos', x: q.x, y: q.y, escala: 1, alto: 40 });
  }
  for (let sd = sCtrl[19] + 80; sd < sCtrl[24] - 40; sd += 140) {
    const q = enLinea(sd, 0);
    decorado.push({ tipo: 'colgante', x: q.x, y: q.y, escala: 1, alto: 45, v: 1 });
  }
  // the drag gala: the audience behind the ropes on both sides, speakers, rigs and the disco ball
  for (let sd = sCtrl[24] + 26; sd < sFront - 36; sd += 21) {
    for (const lado of [-1, 1]) {
      const i = iEn(sd + (lado > 0 ? 9 : 0));
      const q = lateral(i, lado, 10 + hash(i, lado) * 8);
      decorado.push({ tipo: 'publico', x: q.x, y: q.y, escala: 1, v: Math.floor(hash(i, lado + 5) * 6) });
    }
  }
  for (let k = 0; k < 5; k++) {
    for (const lado of [-1, 1]) {
      const q = lateral(iEn(sCtrl[24] + 70 + k * 104 + (lado > 0 ? 40 : 0)), lado, 21);
      decorado.push({ tipo: 'altavoz', x: q.x, y: q.y, escala: 1.0 });
    }
  }
  for (let k = 0; k < 6; k++) {
    const q = enLinea(sCtrl[24] + 60 + k * 82, k % 2 ? 30 : -30);
    decorado.push({ tipo: 'focoTecho', x: q.x, y: q.y, escala: 1, alto: 46, v: k });
  }
  {
    const q = enLinea(sCtrl[24] + (sFront - sCtrl[24]) * 0.52, 0);
    decorado.push({ tipo: 'bola', x: q.x, y: q.y, escala: 1.2, alto: 38 });
    const n = enLinea(sFront - 70, 0);
    decorado.push({ tipo: 'neon', x: n.x, y: n.y, escala: 1.7, alto: 40 });
  }
  // the banner over the start line
  {
    const q = enLinea(sMeta, 0);
    decorado.push({ tipo: 'arco', x: q.x, y: q.y, escala: 1 });
  }

  // ---- the grid: three rows of two, behind the line
  const parrilla: Pista['parrilla'] = [];
  for (let k = 0; k < 6; k++) {
    const q = enLinea(sMeta - 22 - Math.floor(k / 2) * 26 - (k % 2) * 12, k % 2 ? 18 : -18);
    parrilla.push(q);
  }

  // ---- mip levels
  const mips: Uint32Array[] = [color];
  for (let l = 1; l < 4; l++) {
    const s = T >> l;
    const prev = mips[l - 1];
    const ps = s * 2;
    const a = new Uint32Array(s * s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const i0 = y * 2 * ps + x * 2;
        const c0 = prev[i0];
        const c1 = prev[i0 + 1];
        const c2 = prev[i0 + ps];
        const c3 = prev[i0 + ps + 1];
        const r = ((c0 & 255) + (c1 & 255) + (c2 & 255) + (c3 & 255)) >> 2;
        const g = (((c0 >> 8) & 255) + ((c1 >> 8) & 255) + ((c2 >> 8) & 255) + ((c3 >> 8) & 255)) >> 2;
        const b = (((c0 >> 16) & 255) + ((c1 >> 16) & 255) + ((c2 >> 16) & 255) + ((c3 >> 16) & 255)) >> 2;
        a[y * s + x] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
      }
    mips.push(a);
  }

  // ---- the minimap: the house seen from above, one pixel per ~21 texels (a colour for each room)
  const MAPA = 48;
  const mapa = document.createElement('canvas');
  mapa.width = MAPA;
  mapa.height = MAPA;
  {
    const x = mapa.getContext('2d')!;
    const img = x.createImageData(MAPA, MAPA);
    const u32 = new Uint32Array(img.data.buffer);
    const k = T / MAPA;
    const colorZona = [col(0xf0e2bc), col(0xe0b888), col(0xd05060), col(0xf0a868), col(0xd070f0)];
    for (let y = 0; y < MAPA; y++)
      for (let xx = 0; xx < MAPA; xx++) {
        // the road wins if any texel of the cell is road
        let camino = 0;
        let agua = 0;
        let pared = 0;
        let zona = 0;
        for (let sy = 0; sy < k; sy += 5)
          for (let sx = 0; sx < k; sx += 5) {
            const o = Math.floor(y * k + sy) * T + Math.floor(xx * k + sx);
            const v = sup[o];
            if (v === SUP.PISTA || v === SUP.RESBALA || v === SUP.TURBO || v === SUP.CAJA || v === SUP.ACEITE) {
              camino++;
              const ii = idx[o];
              if (ii >= 0) zona = muestras[ii].zona;
            } else if (v === SUP.AGUA) agua++;
            else if (pKind[o] === K.SALON || pKind[o] === K.COCINA || pKind[o] === K.GALA || pKind[o] === K.FACHADA) pared++;
          }
        u32[y * MAPA + xx] = camino >= 3 ? colorZona[zona] : agua >= 6 ? col(0x3b9fe0) : pared >= 3 ? col(0x6a5878) : col(0x2a2038);
      }
    x.putImageData(img, 0, 0);
  }

  avance(1);

  return {
    mips,
    sup,
    linea,
    longitud,
    meta: (() => {
      const q = enLinea(sMeta, 0);
      let idxM = 0;
      let mj = 1e9;
      for (let i = 0; i < L; i++) {
        const dd = Math.hypot(linea[i].x - q.x, linea[i].y - q.y);
        if (dd < mj) {
          mj = dd;
          idxM = i;
        }
      }
      return { idx: idxM, x: q.x, y: q.y, ang: q.ang, s: sMeta };
    })(),
    cajas,
    decorado,
    parrilla,
    paredes: { kind: pKind, col: pCol, dir: pDir },
    techo,
    puertas,
    mapa,
    zonaEn: (s) => {
      const ss = mod(s, longitud);
      let lo = 0;
      let hi = N - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (muestras[mid].s <= ss) lo = mid;
        else hi = mid - 1;
      }
      return muestras[lo].zona;
    },
    enLinea,
    supEn: (x, y) => {
      const tx = Math.floor(x);
      const ty = Math.floor(y);
      if (tx < 0 || ty < 0 || tx >= T || ty >= T) return SUP.MURO;
      return sup[ty * T + tx] as Sup;
    },
    poner,
  };
}

// ---------------------------------------------------------------- the looks of each tramo

// What kind of wall stands at a point of the wall band, and the column of its texture ×4 (set by `paredDe`).
let _kind: number = K.NADA;
let _col = 0;

type Mueble = { s0: number; s1: number; lado: number; tipo: string; k: number };

/**
 * The kind of wall of the cell at lateral distance `w` beyond the shoulder (`der`: on the right of the travel) and arc
 * length `u`. Low things (a sofa, the island, a velvet rope) come first and the room's real wall stands behind them.
 */
function paredDe(z: number, der: boolean, w: number, u: number, muebles: Mueble[]) {
  // the texture runs with the travel on the left wall and against it on the right wall, so that both read left to right
  _col = Math.floor((der ? -u : u) * 4) & 0xffff;
  switch (z) {
    case ZONA.SALIDA:
    case ZONA.JARDIN:
      if (!der) _kind = w < 8 ? K.JARDINERA : K.FACHADA;
      else _kind = w < 8 ? K.MURETE : w < BANDA ? K.CESPED : K.TAPIA;
      return;
    case ZONA.SALON: {
      _kind = K.SALON;
      if (w >= BANDA) return;
      const lado = der ? 1 : -1;
      for (const m of muebles) {
        if (u < m.s0 || u >= m.s1 || (m.lado !== 0 && m.lado !== lado)) continue;
        const a = u - m.s0;
        const largo = m.s1 - m.s0;
        switch (m.tipo) {
          case 'sofa':
            _kind = K.SOFA;
            break;
          case 'estanteria':
            _kind = K.ESTANTERIA;
            break;
          case 'mesa':
            _kind = K.MESA;
            break;
          default:
            // the fireplace: its 128-wide texture stretched over the length of the piece
            _kind = K.CHIMENEA;
            _col = Math.floor(((der ? largo - a : a) / largo) * 128 * 4) & 0xffff;
            return;
        }
        _col = Math.floor((der ? -a : a) * 4) & 0xffff;
        return;
      }
      return;
    }
    case ZONA.COCINA:
      _kind = der && w < BANDA ? K.ISLA : K.COCINA;
      return;
    default:
      _kind = w < BANDA ? K.VALLA : K.GALA;
  }
}

/** The pool's coping seen from above: pale stone slabs. */
function copete(x: number, y: number): number {
  const loseta = ((x >> 4) + (y >> 4)) & 1;
  if (mod(x, 16) < 1 || mod(y, 16) < 1) return col(0xc8c0ac);
  return loseta ? col(0xf6efe0) : col(0xeae1cc);
}

function fondoLejos(x: number, y: number): number {
  // behind everything (never seen, the walls stand in front): a plain dark tone
  return ((x >> 5) + (y >> 5)) & 1 ? col(0x54443a) : col(0x4a3c32);
}

/** Terracotta floor tiles (baldosas de barro cocido), 12×12. */
function barro(x: number, y: number, oscuro = 1): number {
  const bx = Math.floor(x / 12);
  const by = Math.floor(y / 12);
  const lx = mod(x, 12);
  const ly = mod(y, 12);
  const v = hash(bx, by);
  let c = pick([0xc86a3c, 0xbf6035, 0xd27644, 0xc46438], v);
  if (lx === 11 || ly === 11) c = 0x8a4a2a;
  else if (lx === 0 || ly === 0) c = 0xdc8858;
  else if (hash(x, y) > 0.97) c = 0xb05a32;
  return col(oscuro < 1 ? mezclaHex(c, 0x000000, 1 - oscuro) : c);
}

/** One 16×16 encaustic (hydraulic) tile of the kitchen: calm, with a small motif on every other one. */
function hidraulica(a: number, b: number, lx: number, ly: number): number {
  const claroT = (a + b) & 1;
  if (lx === 15 || ly === 15) return col(0xcfb48a);
  const dx = Math.abs(lx - 7.5);
  const dy = Math.abs(ly - 7.5);
  if (claroT) {
    // cream with a small blue flower
    if (dx + dy < 1.8) return col(0xe8b838);
    if (dx + dy < 4.6 && (dx < 1.6 || dy < 1.6 || dx + dy < 3)) return col(0x3a68b0);
    if (dx > 5.6 && dy > 5.6) return col(0x8cb0d8);
    return col(0xf6ecd2);
  }
  // sand with a thin terracotta frame
  if (Math.max(dx, dy) > 5.4 && Math.max(dx, dy) < 6.6) return col(0xd8946a);
  return col(0xeccaa0);
}

function calzada(z: number, x: number, y: number, u: number, d: number, ad: number, semi: number, desdeMeta: number): number {
  const borde = semi - ad;
  switch (z) {
    case ZONA.SALIDA: {
      if (borde < 4) {
        if (borde < 1.2) return col(0x9a8a6c);
        return mod(Math.floor(u / 8), 2) ? col(0xf6ecd4) : col(0xd2c4a2);
      }
      const rodada = Math.abs(Math.abs(d) - 14) < 2.5;
      const n = hash(x >> 1, y >> 1);
      let c = rodada ? col(0xcfb98f) : col(0xdecda8);
      if (n < 0.07) c = col(0xc4ad82);
      else if (n > 0.95) c = col(0xefe2c0);
      // a doormat at the line
      if (desdeMeta > 6 && desdeMeta < 22 && Math.abs(d) < semi - 8) c = mod(Math.floor(desdeMeta / 3) + Math.floor((d + 100) / 3), 2) ? col(0xb5543a) : col(0xd8704a);
      return c;
    }
    case ZONA.JARDIN: {
      if (borde < 4) return borde < 1.2 ? col(0xb89a72) : col(0xfaf4e6);
      const fila = Math.floor((d + 200) / 6);
      const off = (fila & 1) * 5;
      const ladrillo = Math.floor((u + off) / 10);
      const juntaV = mod(u + off, 10) < 1;
      const juntaH = mod(d + 200, 6) < 1;
      if (juntaV || juntaH) return col(0xb8946a);
      return col(pick([0xe8cca2, 0xe0be90, 0xeed4ac, 0xe4c49a], hash(ladrillo, fila)));
    }
    case ZONA.SALON: {
      // a rug over the terracotta: cream fringe, navy and gold bands, a wine field with a regular lattice of motifs
      if (borde < 2.5) return barro(x, y);
      if (borde < 3.6) return mod(Math.floor(u), 2) ? col(0xf0e4c8) : col(0xcdbd98);
      if (borde < 5.5) return col(0x22305a);
      if (borde < 7) return col(0xd9a24a);
      if (borde < 8.6) return col(0x6e1424);
      const a = mod(u, 24) - 12;
      const b = mod(d + 12, 24) - 12;
      const r = Math.abs(a) + Math.abs(b);
      if (r < 2) return col(0x6e1424);
      if (r < 5) return col(0xe0b058);
      if (r < 6) return col(0x6e1424);
      if (Math.abs(d) < 1.2) return col(0xc89438);
      return bloque(x, y, 2) < 0.1 ? col(0x93222f) : col(0xa42c3a);
    }
    case ZONA.COCINA: {
      if (borde < 2) return col(0xb8794a);
      return hidraulica(Math.floor(u / 16), Math.floor((d + 400) / 16), mod(u, 16), mod(d + 400, 16));
    }
    default: {
      // the catwalk
      if (borde < 1.5) return col(0x2a0e38);
      if (borde < 4.5) {
        const k = Math.floor(u / 8);
        const on = mod(u, 8) < 5;
        if (!on) return col(0x2a0e38);
        return k & 1 ? col(0xff6fb5) : col(0xffe36e);
      }
      if (Math.abs(d) < 1.6 && mod(u, 16) < 9) return col(0xf2c14e);
      let c = mezcla(col(0x4b1860), col(0x8a31a0), Math.max(0, 1 - Math.abs(d) / semi) * 0.9);
      if (mod(u + d * 0.6 + 400, 46) < 3) c = mezcla(c, col(0xffffff), 0.28);
      // spotlight pools of colour
      const k = Math.floor(u / 90);
      const cc = mod(u, 90) - 45;
      const luz = Math.hypot(cc, d + (k & 1 ? 10 : -10));
      if (luz < 30) c = mezcla(c, col(pick([0xff6fb5, 0x6fe0ff, 0xffe36e], hash(k, 3))), (1 - luz / 30) * 0.5);
      return c;
    }
  }
}

function hombro(z: number, x: number, y: number, u: number, d: number, _w: number): number {
  switch (z) {
    case ZONA.SALIDA: {
      const n = hash(x >> 1, y >> 1);
      if (n > 0.996) return col(pick([0xf06a8c, 0xffd24a, 0xffffff], hash(x, y)));
      return bloque(x, y, 3) < 0.5 ? col(0x6aaa48) : col(0x5e9c41);
    }
    case ZONA.JARDIN: {
      const n = hash(x >> 1, y >> 1);
      if (n > 0.995) return col(0xffffff);
      const stripe = mod(Math.floor(u / 22), 2);
      return stripe ? col(0x62b04b) : col(0x56a042);
    }
    case ZONA.SALON:
      // worn terracotta tiles (the slow edge of the room)
      return barro(x, y, 0.82);
    case ZONA.COCINA: {
      return (Math.floor(u / 8) + Math.floor((d + 200) / 8)) & 1 ? col(0xb36a43) : col(0x9e5a38);
    }
    default: {
      const n = hash(x, y);
      if (n > 0.975) return col(0x9a7aff);
      return col(0x1d1226);
    }
  }
}

function muro(z: number, x: number, y: number, u: number, d: number, w: number, muebles: Mueble[]): number {
  // Seen from above, and only over the low walls (the high ones hide it): what lies on top of each thing.
  switch (z) {
    case ZONA.SALIDA:
    case ZONA.JARDIN: {
      switch (_kind) {
        case K.JARDINERA: {
          const f = hash(x, y);
          return f > 0.8 ? col(pick([0xe03a48, 0xff7aa8, 0xffd23a], hash(x >> 1, y))) : col(f > 0.4 ? 0x3c9a4a : 0x2f8a44);
        }
        case K.MURETE:
          return w < 1.5 ? col(0xfffaf0) : col(0xe6dcc4);
        case K.CESPED: {
          const n = hash(x >> 1, y >> 1);
          if (n > 0.992) return col(0xffffff);
          return bloque(x, y, 3) < 0.5 ? col(0x62ae4c) : col(0x58a244);
        }
        case K.FACHADA:
          return col(0xa89878);
        default:
          return col(0x8a7a62);
      }
    }
    case ZONA.SALON:
      return w < BANDA ? mueble(u, d, w, muebles) : col(0x7d5230);
    case ZONA.COCINA:
      return w < BANDA ? cocina(x, y, u, d, w) : col(0xdce8ec);
    default:
      return w < BANDA ? col(hash(x, y) > 0.97 ? 0x9a7aff : 0x1d1226) : col(0x641026);
  }
}

function mueble(u: number, d: number, w: number, muebles: Mueble[]): number {
  const lado = d >= 0 ? 1 : -1;
  for (const m of muebles) {
    if (u < m.s0 || u >= m.s1 || (m.lado !== 0 && m.lado !== lado)) continue;
    const a = u - m.s0;
    const largo = m.s1 - m.s0;
    switch (m.tipo) {
      case 'sofa': {
        const paletas = [[0x3b6fb0, 0x2d5a96, 0x6a9be0], [0xd9a232, 0xb5821e, 0xf2c860], [0x3a9a78, 0x2a7a5c, 0x6cc8a0], [0xc65a7a, 0x9e3f5c, 0xe88aa6]];
        const [b, osc, cla] = paletas[m.k % paletas.length];
        if (w < 1.5) return col(cla);
        if (a < 4 || a > largo - 4) return col(w < 14 ? osc : b);
        if (mod(a, 26) < 1.4) return col(osc);
        return col(w < 3 ? cla : b);
      }
      case 'estanteria':
        return col(w < 1.5 ? 0xe0b27a : 0x8a5a30);
      case 'mesa':
        return col(w < 12 ? 0xd8a468 : 0x7d5230);
      case 'chimenea':
        return col(w < 20 ? 0xaaa29a : 0x8a827a);
    }
  }
  return col(0x7d5230);
}

function mezclaHex(a: number, b: number, t: number): number {
  const r = (a & 255) + ((b & 255) - (a & 255)) * t;
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t;
  const bl = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

function cocina(x: number, y: number, u: number, d: number, w: number): number {
  if (d >= 0) {
    // the island seen from above: marble, burners and a sink
    if (w < 1.5) return col(0xf8f4ec);
    const a = mod(u, 120);
    for (const cx of [20, 44]) {
      for (const cy of [8, 20]) {
        const r = Math.hypot(a - cx, w - cy);
        if (r < 3) return col(0x2a2024);
        if (r < 5) return col(0xd03a2a);
      }
    }
    if (a > 70 && a < 110 && w > 5 && w < 22) {
      const borde = a < 72 || a > 108 || w < 7 || w > 20;
      return borde ? col(0x9aa8b0) : col(0xc8d4da);
    }
    return hash(x >> 1, y >> 1) > 0.9 ? col(0xc8c0b8) : col(0xece6dc);
  }
  return col(0xe8c48c);
}

function agua(x: number, y: number, r: { x0: number; y0: number; x1: number; y1: number }): number {
  const olas = mod(Math.floor(x / 3 + Math.sin(y / 7) * 2 + y / 5), 9) < 1.4;
  const baldosa = mod(x - r.x0, 16) < 1 || mod(y - r.y0, 16) < 1;
  if (baldosa) return col(0x2a96d0);
  if (olas) return col(0x9be8ff);
  return bloque(x, y, 4) < 0.5 ? col(0x3fb6e8) : col(0x36aadc);
}

function tablonColor(a: number, b: number, medio: number): number {
  // the springboard: a white fibreglass board with blue edges and a grip surface
  if (Math.abs(b) > medio - 1.8) return col(0x2a7ac0);
  if (Math.abs(b) > medio - 3) return col(0xdcecf6);
  if (mod(a, 9) < 1) return col(0xbfd2de);
  return col(mod(Math.floor(a / 9), 2) ? 0xf6f8fa : 0xeaf0f4);
}
