// PokéUsera · small drawing and timing helpers shared by the screens (GBA look: arte2/).
import type { EntrenadorId, Estado, Tipo } from '../tipos';
import { ENTRENADORES } from '../tipos';
import { texto } from '../../juego/textos';
import { ALTO_CELDA, anchoTexto2, dibujarTexto2, envolver2 } from '../arte2/fuente2';
import { icono2 as caraEntrenador } from '../arte2/entrenadores2';
import { JUGADORES2, ORO_UI, ORO_UI_OSC, PAPEL_ALTO, SOMBRA_TEXTO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { BANDAS, cursor2, hornear, panelCacheado, pegable, relleno } from '../arte2/ui2';
import { COLOR_TIPO, NOMBRE_TIPO } from '../arte/paleta';
import { ANCHO } from '../pantalla';

export { ALTO_CELDA, envolver2 as envolver, anchoTexto2 as ancho, TINTA2, TINTA_SUAVE, SOMBRA_TEXTO, PAPEL_ALTO };

/** Battle pacing the player chooses in AJUSTES / the pause box (saved in localStorage 'pokeusera.v1'). */
export type Velocidad = 'lenta' | 'normal' | 'rapida';
export const VELOCIDADES: readonly Velocidad[] = ['lenta', 'normal', 'rapida'];

/** Global switches. `rapido`: fast animations only (?auto, ?rapido, and an online guest catching up). `velocidad`: the saved setting. */
export const cfg: { rapido: boolean; velocidad: Velocidad; velocidadSala: Velocidad | null } = { rapido: false, velocidad: 'normal', velocidadSala: null };
/** The speed that rules the battle: online it is the room's (the host's choice, the same for everybody), otherwise the phone's setting. */
export const velocidadActiva = (): Velocidad => cfg.velocidadSala ?? cfg.velocidad;

export interface Ritmo {
  /** Typewriter speed (characters per second). */
  cps: number;
  /** Pause after a line is written before the next one comes by itself (ms); −1 = only on a tap. */
  espera: number;
  /** Multiplier of the animations' length (lunges, blinks, falls...). */
  anim: number;
  /** Milliseconds the HP bars take to drain. */
  barra: number;
  /** Pause between two players' actions (ms). */
  entre: number;
  /** How long the «ORDEN DEL TURNO» strip stays (ms). */
  orden: number;
  /** How long a floating number or tag stays (ms). */
  flota: number;
}

const RITMOS: Record<Velocidad, Ritmo> = {
  lenta: { cps: 24, espera: -1, anim: 1.8, barra: 1100, entre: 900, orden: 2200, flota: 1500 },
  normal: { cps: 34, espera: 1250, anim: 1.3, barra: 750, entre: 400, orden: 1300, flota: 1000 },
  // About the pace of the first version.
  rapida: { cps: 42, espera: 650, anim: 1, barra: 500, entre: 150, orden: 900, flota: 800 },
};

/** The pacing of the chosen speed. */
export const ritmo = (): Ritmo => RITMOS[velocidadActiva()];

/** Waits `ms` (much shorter in the fast smoke-test mode). */
export function dormir(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, cfg.rapido ? Math.min(ms, 20) : ms));
}

/** Texts without placeholders, as they come out of `texto` (which runs a regex over its string on every call; screens ask for dozens per frame). */
const planos = new Map<string, string>();
export function t(clave: string, vars?: Record<string, string | number>): string {
  if (vars) return texto(clave, vars);
  const p = planos.get(clave);
  if (p !== undefined) return p;
  const s = texto(clave);
  if (!s.includes('{') && !s.startsWith('[')) planos.set(clave, s); // a missing key comes back as «[key]»: not remembered
  return s;
}

/** A trainer's colour: always the same for the same friend (Fran red, Pablo blue, Chuchi green, Guille orange). */
export const colorEnt = (id: EntrenadorId): string => JUGADORES2[Math.max(0, ENTRENADORES.indexOf(id))].base;
export const colorEntOsc = (id: EntrenadorId): string => JUGADORES2[Math.max(0, ENTRENADORES.indexOf(id))].oscuro;
export const colorEntClaro = (id: EntrenadorId): string => JUGADORES2[Math.max(0, ENTRENADORES.indexOf(id))].claro;
export const nombreEnt = (id: EntrenadorId): string => texto(`entrenador.${id}`);

export const parpadea = (ahora: number, periodo = 500): boolean => Math.floor(ahora / periodo) % 2 === 0;

/** Idle frame (0 or 1) of the sprites: about two a second; `desfase` keeps the useritos from breathing in step. */
export const reposo = (ahora: number, desfase = 0): number => Math.floor((ahora + desfase) / 500) % 2;

/**
 * For a screen whose only motion is a few values derived from the clock (a blink phase, a breathing frame, a
 * hop rounded to whole pixels): `paso` fills `v` with those values the way `dibujar` computes them and
 * returns `cambio()`, so the screen redraws exactly when something would look different, not every frame.
 */
export class Firma {
  readonly v: Int32Array;
  private prev: Int32Array;
  constructor(n: number) {
    this.v = new Int32Array(n);
    this.prev = new Int32Array(n).fill(0x7fffffff);
  }
  /** Whether `v` differs from the last time this was asked (and remembers it). */
  cambio(): boolean {
    let distinto = false;
    for (let i = 0; i < this.v.length; i++) {
      if (this.v[i] !== this.prev[i]) {
        this.prev[i] = this.v[i];
        distinto = true;
      }
    }
    return distinto;
  }
}

// ------------------------------------------------------------------ text

/** Text with its capital line at `y` (see arte2/fuente2.ts), dark ink with the soft paper shadow by default. */
export function texto2(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string = TINTA2, sombra: string | null = SOMBRA_TEXTO): number {
  return dibujarTexto2(ctx, s, x, y, color, sombra);
}

/** Text centred on x (default: the middle of the screen). */
export function centrado(ctx: CanvasRenderingContext2D, s: string, y: number, color: string = TINTA2, opts: { x?: number; sombra?: string | null } = {}) {
  const x = (opts.x ?? Math.floor(ANCHO / 2)) - Math.floor(anchoTexto2(s) / 2);
  dibujarTexto2(ctx, s, x, y, color, opts.sombra === undefined ? SOMBRA_TEXTO : opts.sombra);
}

export function derecha(ctx: CanvasRenderingContext2D, s: string, xFin: number, y: number, color: string = TINTA2, sombra: string | null = SOMBRA_TEXTO) {
  dibujarTexto2(ctx, s, xFin - anchoTexto2(s), y, color, sombra);
}

/** Text scaled by an integer (the glyphs are baked canvases: drawn with smoothing off they stay crisp), with an optional dark outline. */
export function textoGrande(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, escala = 2, contorno: string | null = null) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.scale(escala, escala);
  const X = Math.round(x / escala);
  const Y = Math.round(y / escala);
  if (contorno) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) dibujarTexto2(ctx, s, X + dx, Y + dy, contorno, null);
  dibujarTexto2(ctx, s, X, Y, color, null);
  ctx.restore();
}

/** Text with a one-pixel dark outline so it reads over anything. */
export function conContorno(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, contorno: string = TINTA2) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) dibujarTexto2(ctx, s, x + dx, y + dy, contorno, null);
  dibujarTexto2(ctx, s, x, y, color, null);
}

/** `s` cut so that it fits `maxPx` px. */
export function recortar(s: string, maxPx: number): string {
  const chars = Array.from(s);
  while (chars.length > 1 && anchoTexto2(chars.join('')) > maxPx) chars.pop();
  return chars.join('');
}

export function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** «4.º», hand-fitted: the number, a dot and the º glyph of the font. */
export function ordinal(ctx: CanvasRenderingContext2D, n: number, x: number, y: number, color: string, escala = 1) {
  const s = `${n}.º`;
  if (escala === 1) dibujarTexto2(ctx, s, x, y, color, null);
  else textoGrande(ctx, s, x, y, color, escala);
}
export const anchoOrdinal = (n: number): number => anchoTexto2(`${n}.º`);

// ------------------------------------------------------------------ small widgets

function fichaDirecta(ctx: CanvasRenderingContext2D, ent: EntrenadorId, x: number, y: number, lado: number) {
  const osc = colorEntOsc(ent);
  relleno(ctx, TINTA2, x, y, lado, lado);
  relleno(ctx, colorEnt(ent), x + 1, y + 1, lado - 2, lado - 2);
  rect(ctx, osc, x + 1, y + lado - 3, lado - 2, 2);
  const cara = caraEntrenador(ent);
  if (lado >= 18) ctx.drawImage(cara, x + Math.floor((lado - 16) / 2), y + Math.floor((lado - 16) / 2));
  else {
    const c = Math.floor((16 - (lado - 2)) / 2);
    ctx.drawImage(cara, c, c, lado - 2, lado - 2, x + 1, y + 1, lado - 2, lado - 2);
  }
}

const fichas = new Map<number, Map<EntrenadorId, HTMLCanvasElement>>();

/** A player's tile: his colour with his face (16×16) in the middle; `lado` ≥ 14 (smaller than 18 crops the face's margin). Baked per trainer and size. */
export function ficha(ctx: CanvasRenderingContext2D, ent: EntrenadorId, x: number, y: number, lado = 18) {
  if (!pegable(ctx, x, y)) return fichaDirecta(ctx, ent, x, y, lado);
  let porEnt = fichas.get(lado);
  if (!porEnt) {
    porEnt = new Map();
    fichas.set(lado, porEnt);
  }
  let c = porEnt.get(ent);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = lado;
    fichaDirecta(c.getContext('2d')!, ent, 0, 0, lado);
    porEnt.set(ent, c);
  }
  ctx.drawImage(c, x, y);
}

/** A ◀ (dir −1) or ▶ (dir +1) arrow, 5×7. */
export function flecha(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 1 | -1, color: string = TINTA2) {
  const anchos = [2, 3, 4, 5, 4, 3, 2];
  anchos.forEach((a, i) => rect(ctx, color, dir > 0 ? x : x + 5 - a, y + i, a, 1));
}

/** ▲ (dir −1) or ▼ (dir +1), 7×4. */
export function flechaV(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 1 | -1, color: string = TINTA2) {
  for (let i = 0; i < 4; i++) {
    const w = dir > 0 ? 7 - i * 2 : 1 + i * 2;
    rect(ctx, color, x + Math.floor((7 - w) / 2), y + i, w, 1);
  }
}

/** The pause button's three bars (11×7). */
export function menuIcono(ctx: CanvasRenderingContext2D, x: number, y: number, color: string = TINTA2) {
  for (let i = 0; i < 3; i++) rect(ctx, color, x, y + i * 3, 11, 2);
}

/** Draws a baked canvas scaled to w×h without smoothing. */
export function dibujaEscalado(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  ctx.drawImage(cv, 0, 0, cv.width, cv.height, Math.round(x), Math.round(y), w, h);
}

/** Gold highlight behind the selected row, with the ▶ cursor. */
export function realce(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  relleno(ctx, ORO_UI_OSC, x, y, w, h);
  relleno(ctx, '#fbe19a', x + 1, y + 1, w - 2, h - 2);
  rect(ctx, '#fff3c8', x + 3, y + 1, w - 6, 1);
  rect(ctx, '#f0c860', x + 2, y + h - 4, w - 4, 3);
  cursor2(ctx, x + 6, y + Math.floor((h - 7) / 2));
}

/** A framed button: the paper panel, gold highlight and ▶ when selected. `activo` false greys it out. */
export function boton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: string, sel: boolean, activo = true) {
  panelCacheado(ctx, x, y, w, h);
  if (sel) {
    relleno(ctx, ORO_UI_OSC, x + 3, y + 3, w - 6, h - 6);
    relleno(ctx, '#fbe19a', x + 4, y + 4, w - 8, h - 8);
    rect(ctx, '#fff3c8', x + 6, y + 4, w - 12, 1);
    rect(ctx, '#f0c860', x + 5, y + h - 8, w - 10, 3);
  }
  const tw = anchoTexto2(s);
  const tx = x + Math.floor((w - tw) / 2) + (sel ? 4 : 0);
  const ty = y + Math.floor((h - 7) / 2) + 1;
  dibujarTexto2(ctx, s, tx, ty, activo ? TINTA2 : '#a898a8', sel ? '#f0c860' : activo ? SOMBRA_TEXTO : null);
  if (sel) cursor2(ctx, tx - 10, y + Math.floor((h - 7) / 2));
}

/** Pill colours for the status tags (background, text). */
export const COLOR_ESTADO: Record<Estado | 'achispado', [string, string]> = {
  dormido: ['#8aa0c8', TINTA2],
  paralizado: ['#eec31c', TINTA2],
  quemado: ['#e8562a', '#fff6e0'],
  empachado: ['#7aa83c', TINTA2],
  achispado: ['#a85cc4', '#fff6e0'],
};

function etiquetaDirecta(ctx: CanvasRenderingContext2D, e: Estado | 'achispado', x: number, y: number): number {
  const s = texto(`estado.${e}`);
  const w = anchoTexto2(s) + 6;
  const [bg, fg] = COLOR_ESTADO[e];
  relleno(ctx, TINTA2, x, y, w, 11);
  relleno(ctx, bg, x + 1, y + 1, w - 2, 9);
  rect(ctx, 'rgba(255,255,255,0.35)', x + 2, y + 1, w - 4, 1);
  dibujarTexto2(ctx, s, x + 3, y + 2, fg, null);
  return w;
}

const etiquetas = new Map<string, HTMLCanvasElement>();

/** A little status tag («DOR», «PAR»...), baked once per state. Returns its width. */
export function etiquetaEstado(ctx: CanvasRenderingContext2D, e: Estado | 'achispado', x: number, y: number): number {
  let c = etiquetas.get(e);
  if (!c) {
    const w = anchoTexto2(texto(`estado.${e}`)) + 6;
    c = document.createElement('canvas');
    c.width = w;
    c.height = 11;
    etiquetaDirecta(c.getContext('2d')!, e, 0, 0);
    etiquetas.set(e, c);
  }
  if (pegable(ctx, x, y)) ctx.drawImage(c, x, y);
  else etiquetaDirecta(ctx, e, x, y);
  return c.width;
}

function luminoso(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

/** Height of a type badge. */
export const ALTO_INSIGNIA = 11;

function insigniaDirecta(ctx: CanvasRenderingContext2D, tipo: Tipo, x: number, y: number, w: number, nombre: string) {
  const c = COLOR_TIPO[tipo];
  relleno(ctx, TINTA2, x, y, w, ALTO_INSIGNIA);
  relleno(ctx, c, x + 1, y + 1, w - 2, ALTO_INSIGNIA - 2);
  rect(ctx, 'rgba(255,255,255,0.35)', x + 2, y + 1, w - 4, 1);
  rect(ctx, 'rgba(0,0,0,0.2)', x + 2, y + ALTO_INSIGNIA - 2, w - 4, 1);
  dibujarTexto2(ctx, nombre, x + Math.floor((w - anchoTexto2(nombre)) / 2), y + 2, luminoso(c) ? TINTA2 : '#fff8e8', null);
}

/** Badge (type name, or a short name on the type's colour), baked per type, width and name. */
function insignia(ctx: CanvasRenderingContext2D, tipo: Tipo, x: number, y: number, w: number, nombre: string) {
  if (!pegable(ctx, x, y)) return insigniaDirecta(ctx, tipo, x, y, w, nombre);
  const c = hornear(`insignia|${tipo}|${w}|${nombre}`, w, ALTO_INSIGNIA, (cx) => insigniaDirecta(cx, tipo, 0, 0, w, nombre));
  ctx.drawImage(c, x, y);
}

/** Small coloured badge with the type name (or `rotulo`: e.g. a move's name on its type's colour). Returns its width. */
export function insignaTipo(ctx: CanvasRenderingContext2D, tipo: Tipo, x: number, y: number, fijo = 0, rotulo?: string): number {
  const nombre = rotulo ?? NOMBRE_TIPO[tipo].toUpperCase();
  const w = fijo || anchoTexto2(nombre) + 7;
  insignia(ctx, tipo, x, y, w, nombre);
  return w;
}

/** The type's compact chip: its short name (3 letters) on the type's colour. `solo`: a small square with only the initial. Returns its width. */
export function chipTipo(ctx: CanvasRenderingContext2D, tipo: Tipo, x: number, y: number, solo = false): number {
  const abrev = t(`tipo.abrev.${tipo}`);
  const nombre = solo ? abrev.charAt(0) : abrev;
  const w = solo ? 9 : anchoTexto2(nombre) + 7;
  insignia(ctx, tipo, x, y, w, nombre);
  return w;
}

/** A thin stat bar (value 0..max) in `color`. Height 7. */
export function barraValor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, frac: number, color: string) {
  relleno(ctx, TINTA2, x, y, w, 7);
  rect(ctx, '#6e5a70', x + 1, y + 1, w - 2, 5);
  const n = Math.max(1, Math.round((w - 2) * Math.max(0, Math.min(1, frac))));
  rect(ctx, color, x + 1, y + 1, n, 5);
  rect(ctx, 'rgba(255,255,255,0.4)', x + 1, y + 1, n, 1);
  rect(ctx, 'rgba(0,0,0,0.25)', x + 1, y + 5, n, 1);
}

/** A semi-transparent veil over a rectangle (greyed-out rows). */
export function velo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = '#f8edd2', alfa = 0.6) {
  ctx.save();
  ctx.globalAlpha = alfa;
  rect(ctx, color, x, y, w, h);
  ctx.restore();
}

/** A dark veil with its own cache-free fill (modals). */
export function oscurecer(ctx: CanvasRenderingContext2D, alto: number, alfa = 0.55) {
  ctx.fillStyle = `rgba(36,25,42,${alfa})`;
  ctx.fillRect(0, 0, ANCHO, alto);
}

/** Baked plain backgrounds by screen height: the last three at most (a window being resized would otherwise pile up 130 of them). */
const papeles = new Map<number, HTMLCanvasElement>();

/** A baked plain background for the screens that have no scene behind them (draft, podium, statistics, lobby). */
export function fondoPapel(ctx: CanvasRenderingContext2D, alto: number) {
  let c = papeles.get(alto);
  if (!c) {
    if (papeles.size >= 3) papeles.delete(papeles.keys().next().value!);
    c = document.createElement('canvas');
    c.width = ANCHO;
    c.height = alto;
    const cx = c.getContext('2d')!;
    rect(cx, '#d9c9a0', 0, 0, ANCHO, alto);
    for (let y = 0; y < alto; y += 16) {
      for (let x = (y / 16) % 2 ? 0 : 16; x < ANCHO; x += 32) rect(cx, '#d2c096', x, y, 16, 16);
    }
    // a soft vignette at the top and bottom
    const g = cx.createLinearGradient(0, 0, 0, alto);
    g.addColorStop(0, 'rgba(255,248,224,0.35)');
    g.addColorStop(0.3, 'rgba(255,248,224,0)');
    g.addColorStop(0.75, 'rgba(90,70,96,0)');
    g.addColorStop(1, 'rgba(90,70,96,0.28)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, ANCHO, alto);
    papeles.set(alto, c);
  }
  ctx.drawImage(c, 0, 0);
}

/** The top bar's plate (18 px: paper gradient, gold line), baked once. */
export function barraArriba(ctx: CanvasRenderingContext2D) {
  const c = hornear('barra', ANCHO, 18, (cx) => {
    rect(cx, TINTA2, 0, 0, ANCHO, 18);
    rect(cx, '#5a4660', 0, 0, ANCHO, 1);
    rect(cx, BANDAS[1], 0, 1, ANCHO, 16);
    rect(cx, PAPEL_ALTO, 0, 1, ANCHO, 7);
    rect(cx, ORO_UI, 0, 17, ANCHO, 1);
  });
  ctx.drawImage(c, 0, 0);
}

/** The countdown chip at the right of the top bar. */
export function chipTiempo(ctx: CanvasRenderingContext2D, s: string, rojo: boolean) {
  const w = anchoTexto2(s) + 14;
  const x = ANCHO - w - 6;
  relleno(ctx, TINTA2, x, 3, w, 12);
  relleno(ctx, rojo ? '#9c1c1c' : '#5a4660', x + 1, 4, w - 2, 10);
  dibujarTexto2(ctx, s, x + 7, 6, rojo ? '#ffd0c0' : '#fdf0c0');
}

/** Tweens driven by the screen's `paso`: `animar(ms, fn(p))` resolves when p reaches 1. */
export class Animador {
  private lista: { dur: number; t: number; fn: (p: number) => void; fin: () => void }[] = [];

  /** `factor`: multiplies every duration (the battle passes its speed setting). */
  constructor(private factor?: () => number) {}

  /** `fijo`: `ms` is the final length (the factor does not apply). */
  animar(ms: number, fn: (p: number) => void, fijo = false): Promise<void> {
    const dur = cfg.rapido ? ms * 0.1 : fijo ? ms : ms * (this.factor?.() ?? 1);
    return new Promise((res) => {
      if (dur <= 0) {
        fn(1);
        res();
        return;
      }
      fn(0);
      this.lista.push({ dur, t: 0, fn, fin: res });
    });
  }

  paso(dt: number): boolean {
    const l = this.lista;
    for (let i = 0; i < l.length; i++) {
      const a = l[i];
      a.t += dt;
      const p = Math.min(1, a.t / a.dur);
      a.fn(p);
      if (p >= 1) {
        l.splice(i--, 1);
        a.fin();
      }
    }
    return l.length > 0;
  }

  get activo(): boolean {
    return this.lista.length > 0;
  }
}

/** Keyboard cursor for a vertical list: returns the new index for an arrow action. */
export function mover(sel: number, n: number, a: 'arriba' | 'abajo'): number {
  return a === 'arriba' ? (sel + n - 1) % n : (sel + 1) % n;
}
