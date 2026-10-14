// PokéUsera · the battle screen. Three rival rows on top (info panel left, front sprite right),
// your row below (back sprite left, panel right with HP numbers), then the text box / menus.
// It draws and plays only what it is told:
//   alInicio(estado)            the teams come out
//   pedirEleccion(j, estado, ms) / pedirReemplazo(j, estado, ms)   the local player decides (promises)
//   alTurno(eventos, estado) / alReemplazo(eventos, estado)       play the events, then adopt `estado`
// so a guest can drive it from network messages exactly like the host does from Partida.
import { ENTRENADORES, type Eleccion, type Estado, type EstadoCombate, type Evento, type ObjetoId, type ObjetoLlevado, type Stat, type SucesoId, type Tipo, type Userito } from '../tipos';
import { COLOR_TIPO } from '../arte/paleta';
import { hayTexto } from '../../juego/textos';
import { ESPECIE, MOVS, DESESPERADA, OBJETO_PERMANENTE, SUCESOS, eficacia } from '../datos';
import { activo, eliminado, enGrada, movsDisponibles, necesitaObjetivo, puedeCambiar, rivalesEnPie, vivos } from '../motor/combate';
import { anchoTexto2, dibujarTexto2 } from '../arte2/fuente2';
import { PS_TONOS, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { spriteEspalda2, spriteFrente2 } from '../arte2/sprites2';
import { barraPS2, bandaEntrenador, filaMenu, hornear, panel, panelCacheado, pegable, pip, relleno } from '../arte2/ui2';
import { clasePrioridad, iconoPrioridad, LADO_ICONO_PRIO } from './iconosMov';
import { JUGADORES2, SOMBRA_TEXTO } from '../arte2/paleta2';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { CajaTexto } from './caja';
import { menuPausa } from './ajustes';
import { EfectosMov, llegadaFx, tareasPrecalentarEfectos, type PuntoFx } from './efectosMov';
import { cajaSprite, dibujarBandeja, dibujarFondoEscenario, hornearFondoEscenario, miniatura, pieSprite, plataformaCacheada } from './fondos';
import { abrirGuia } from './guia';
import { LADO_ICONO_OBJETO, iconoObjeto, tareasPrecalentarObjetos } from './iconosObjeto';
import { sobre } from './modal';
import {
  ALTO_CELDA,
  ALTO_INSIGNIA,
  Animador,
  barraArriba,
  barraValor,
  boton,
  cfg,
  chipTiempo,
  chipTipo,
  colorEnt,
  colorEntOsc,
  dormir,
  envolver,
  etiquetaEstado,
  Firma,
  ficha,
  flecha,
  flechaV,
  insignaTipo,
  menuIcono,
  mover,
  oscurecer,
  parpadea,
  realce,
  recortar,
  rect,
  reposo,
  ritmo,
  t,
  texto2,
  textoGrande,
} from './ui';

const PS_ROJO = '#ff6a52';
const PS_VERDE = PS_TONOS.alto[1];
const TAG_GRIS = '#e8dcc0';
const TAG_ORO = '#ffd23a';

type Modo = 'cola' | 'espera' | 'accion' | 'movs' | 'objetivo' | 'equipo' | 'grada' | 'gradaObj';

interface Fx {
  /** HP shown (animated) of the active userito. */
  ps: number;
  oculto: boolean;
  /** Milliseconds of blinking left. */
  parpadeo: number;
  /** Horizontal offset of the lunge (px). */
  salto: number;
  /** Vertical offset of the lunge (px, towards the target's row). */
  saltoY: number;
  /** 0..1: sliding down into the ground. */
  caida: number;
  /** 0..1: rising out of the cap (1 = fully there). */
  alza: number;
  /** −1 none, else 0..1 of the cap animation. */
  chapa: number;
  /** 0..1 how greyed the row is. */
  velo: number;
}

/** Side of the userito sprites. */
const LADO = 64;

/**
 * The action being played: who acts (−1 = nobody: end-of-turn effects) and who it is aimed at. The rows that do not
 * take part are dimmed, the actor's mat glows in his colour, each target wears pulsing corner brackets. With a move
 * (`mov`) the action banner shows under the text box; a switch or a caña has no banner.
 */
interface Foco {
  actor: number;
  objetivos: number[];
  /** performance.now() when it began (fade in, pulse). */
  t0: number;
  /** The move being used (null: a switch, a caña, an end-of-turn effect). */
  mov: string | null;
  /** The banner's target part: faces, «TODOS» or «ÉL MISMO». */
  destino: 'caras' | 'todos' | 'yo';
}

/** Which card the info box opens on a status or stat. */
type Tema = { k: 'estado'; e: Estado | 'achispado' } | { k: 'objeto'; id: ObjetoId } | { k: 'stat'; s: 'ps' | 'ata' | 'def' | 'esp' | 'vel' | 'prec' } | { k: 'tipos' } | null;

/** Height of the action banner under the text box. */
const ALTO_CARTEL = 40;

/** Height of the field (the backdrop) on a screen of height `H`: the top bar, the four rows and the sprite of the last one. */
export function alturaCampo(H: number): number {
  const k = Math.max(0, Math.min(1, (H - 384) / 136));
  return 18 + 4 + 3 * Math.round(50 + k * 26) + 78;
}

/** The width of a trainer's name in capitals (it is asked for every frame), and of a status tag's text. */
const anchosNombre = new Map<string, number>();
const anchoNombre = (nombre: string): number => {
  let w = anchosNombre.get(nombre);
  if (w === undefined) anchosNombre.set(nombre, (w = anchoTexto2(nombre.toUpperCase())));
  return w;
};
const anchosEstado = new Map<string, number>();
const anchoEstado = (e: Estado | 'achispado'): number => {
  let w = anchosEstado.get(e);
  if (w === undefined) anchosEstado.set(e, (w = anchoTexto2(t(`estado.${e}`))));
  return w;
};
/** The widths of a userito's type chips with names (`largo`) and as bare squares (`corto`), by the types it has. */
const chipsAncho = new Map<string, { largo: number; corto: number }>();
function anchosChips(tipos: readonly Tipo[]): { largo: number; corto: number } {
  const clave = tipos.join('|');
  let a = chipsAncho.get(clave);
  if (!a) {
    let largo = (tipos.length - 1) * 2;
    let corto = largo;
    for (const tp of tipos) {
      largo += anchoTexto2(t(`tipo.abrev.${tp}`)) + 7;
      corto += 9;
    }
    chipsAncho.set(clave, (a = { largo, corto }));
  }
  return a;
}

/** The three jar pips of a row as one baked strip (25×7, a pip every 9 px) per colour and number of jars standing: one blit instead of three. */
const tirasPips: Map<string, HTMLCanvasElement>[] = [new Map(), new Map(), new Map(), new Map()];
function pipsFila(ctx: CanvasRenderingContext2D, x: number, y: number, vivos: number, color: string) {
  const m = tirasPips[Math.max(0, Math.min(3, vivos))];
  if (!pegable(ctx, x, y)) {
    for (let i = 0; i < 3; i++) pip(ctx, x + i * 9, y, i < vivos, color);
    return;
  }
  let c = m.get(color);
  if (!c) {
    c = document.createElement('canvas');
    c.width = 25;
    c.height = 7;
    const cx = c.getContext('2d')!;
    for (let i = 0; i < 3; i++) pip(cx, i * 9, 0, i < vivos, color);
    m.set(color, c);
  }
  ctx.drawImage(c, x, y);
}

/** The type chips of a userito as one baked strip (with names, or bare squares), by its types. */
const tirasChips = new Map<string, HTMLCanvasElement>();

/** Floating labels the frame signature looks at one by one (the rest are folded into the last slot). */
const MAX_FIRMA_FLOT = 12;

/** The dimming of the rows that do not take part fades in over this long, in this many steps (a 40 % veil: 5 % a step cannot be seen). */
const PASOS_FUNDIDO = 8;
const duracionFundido = (): number => (cfg.rapido ? 60 : 180);

/** How opaque a floating label is at `p` (0..1 of its life), in sixteenths: it fades over the last quarter. */
const alfaFlotante = (p: number): number => Math.max(0, Math.round((p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1) * 16));
/** How many pixels a floating damage number has risen at `p`: a little jump up, then it floats. */
const subidaFlotante = (p: number): number => Math.round(Math.min(1, p * 4) * 14 + p * 6);

/** A number or tag floating over a userito. The text (with its outline) is baked once when it is created: drawing it is one `drawImage`. */
interface Flotante {
  j: number;
  /** The baked label (1x; the numbers are drawn at 2x). */
  img: HTMLCanvasElement;
  /** 'num': rises from the middle of the sprite; 'tag': a short label near the bottom. */
  tipo: 'num' | 'tag';
  /** Vertical slot so several tags do not overlap. */
  hueco: number;
  t0: number;
  dur: number;
  /** A damage number of an Acorralado hit: the «1/2» badge goes under it. */
  acorr: boolean;
}

/** The order of the actions of a turn, derived from its events. */
interface OrdenTurno {
  lista: { j: number; especie: string }[];
  /** Index of the action being played (−1 = none yet), and how many have finished. */
  actual: number;
}

interface GrupoHistorial {
  turno: number;
  lineas: string[];
}

const nuevoFx = (): Fx => ({ ps: 0, oculto: false, parpadeo: 0, salto: 0, saltoY: 0, caida: 0, alza: 1, chapa: -1, velo: 0 });

// The bottle cap (20×20), baked once.
let capsula: HTMLCanvasElement | null = null;
function chapaImg(): HTMLCanvasElement {
  if (capsula) return capsula;
  const c = document.createElement('canvas');
  c.width = c.height = 20;
  const x = c.getContext('2d')!;
  for (let j = 0; j < 20; j++) {
    for (let i = 0; i < 20; i++) {
      const dx = i - 9.5;
      const dy = j - 9.5;
      const r = Math.hypot(dx, dy);
      if (r > 9.9) continue;
      const ang = Math.atan2(dy, dx);
      const diente = r > 8.3 && Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 20) % 2 === 0;
      if (diente) continue;
      x.fillStyle = r > 8 ? '#6a4a14' : r > 5.4 ? '#e0a520' : '#f6cf5a';
      if (r <= 5.4 && dx + dy < -3) x.fillStyle = '#fff2b0';
      if (r > 8.8) x.fillStyle = '#3b2a3f';
      x.fillRect(i, j, 1, 1);
    }
  }
  capsula = c;
  return c;
}

/** The small red «1/2» badge that marks a hit halved by Acorralado, baked on first use (same look as its badge in the guide). */
let chipAcorr: HTMLCanvasElement | null = null;
function chipAcorralado(): HTMLCanvasElement {
  if (chipAcorr) return chipAcorr;
  const s = t('batalla.tag.acorralado');
  const w = anchoTexto2(s) + 5;
  chipAcorr = hornear(`acorralado|${s}`, w, 11, (cx) => {
    relleno(cx, TINTA2, 0, 0, w, 11);
    relleno(cx, '#d4382c', 1, 1, w - 2, 9);
    rect(cx, 'rgba(255,255,255,0.4)', 2, 1, w - 4, 1);
    texto2(cx, s, 3, 2, '#fff8e8', null);
  });
  return chipAcorr;
}

/** A label with a one-pixel dark outline, baked once per text and colour (the outline is 8 text draws: not per frame). */
const rotulos = new Map<string, HTMLCanvasElement>();
function rotuloFlotante(s: string, color: string): HTMLCanvasElement {
  // Its own cache (not `hornear`'s, which forgets the oldest quarter at 300 plates: a battle bakes dozens of distinct damage numbers and
  // would push the panels out). A label is a few hundred bytes and there are at most a hundred numbers and a dozen tags.
  const clave = `${color}|${s}`;
  let c = rotulos.get(clave);
  if (!c) {
    const w = anchoTexto2(s) + 2;
    c = document.createElement('canvas');
    c.width = w;
    c.height = ALTO_CELDA + 3;
    const cx = c.getContext('2d')!;
    cx.imageSmoothingEnabled = false;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) dibujarTexto2(cx, s, 1 + dx, 3 + dy, TINTA2, null);
    dibujarTexto2(cx, s, 1, 3, color, null);
    rotulos.set(clave, c);
  }
  return c;
}

/** Width of the big banner of a suceso and of its chip's height. */
const ANCHO_CARTEL_SUCESO = ANCHO - 28;
const ALTO_CARTEL_SUCESO = 58;
const ALTO_CHAPA = 13;
/** The colour of the line «dura N turnos más» in the card of a suceso. */
const colorAyuda = '#a8501c';

/** The big banner of a suceso of the bar («SUCESO EN EL BAR», its name in big letters, how long it lasts), baked once per suceso: a blit per frame while it is up. */
function cartelSucesoImg(id: SucesoId): HTMLCanvasElement {
  const nombre = t(`suceso.${id}.nombre`).toUpperCase();
  const w = ANCHO_CARTEL_SUCESO;
  const h = ALTO_CARTEL_SUCESO;
  return hornear(`suceso-cartel|${id}|${nombre}`, w, h, (cx) => {
    panel(cx, 0, 0, w, h);
    // The ribbon with the heading.
    const cab = t('suceso.titulo');
    const rw = anchoTexto2(cab) + 20;
    const rx = Math.floor((w - rw) / 2);
    relleno(cx, TINTA2, rx, 6, rw, 12);
    texto2(cx, cab, rx + 10, 9, '#fdf0c0', null);
    // The name: as big as it fits.
    const dos = anchoTexto2(nombre) * 2 <= w - 16;
    const escala = dos ? 2 : 1;
    const nw = anchoTexto2(nombre) * escala;
    textoGrande(cx, nombre, Math.floor((w - nw) / 2), dos ? 23 : 27, TINTA2, escala);
    // How long it lasts, in a gold pill.
    const dura = SUCESOS[id].dura;
    const tx = dura === 0 ? t('suceso.al_momento') : dura === 1 ? t('suceso.dura1') : t('suceso.dura', { n: dura });
    const pw = anchoTexto2(tx) + 12;
    const px = Math.floor((w - pw) / 2);
    relleno(cx, TINTA2, px, 42, pw, 11);
    relleno(cx, '#f0c860', px + 1, 43, pw - 2, 9);
    rect(cx, 'rgba(255,255,255,0.4)', px + 2, 43, pw - 4, 1);
    texto2(cx, tx, px + 6, 45, TINTA2, null);
    // A few gold sparkles at the sides.
    for (const [sx, sy] of [[12, 28], [w - 13, 28], [20, 46], [w - 21, 46]]) {
      rect(cx, '#e0a83a', sx, sy - 2, 1, 5);
      rect(cx, '#e0a83a', sx - 2, sy, 5, 1);
    }
  });
}

/** The chip under the field while a suceso lasts: its name and the turns it has left. Baked per suceso and turns. */
function chapaSucesoImg(id: SucesoId, turnos: number): HTMLCanvasElement {
  const nombre = t(`suceso.${id}.nombre`).toUpperCase();
  const wn = anchoTexto2(nombre);
  const w = wn + 20;
  return hornear(`suceso-chapa|${id}|${turnos}|${nombre}`, w, ALTO_CHAPA, (cx) => {
    relleno(cx, TINTA2, 0, 0, w, ALTO_CHAPA);
    relleno(cx, '#fbe19a', 1, 1, w - 2, ALTO_CHAPA - 2);
    rect(cx, '#fff3c8', 3, 1, w - 6, 1);
    texto2(cx, nombre, 4, 3, TINTA2, null);
    const bx = 4 + wn + 3;
    relleno(cx, TINTA2, bx, 2, 11, 9);
    relleno(cx, '#d4382c', bx + 1, 3, 9, 7);
    const n = String(turnos);
    texto2(cx, n, bx + 1 + Math.floor((9 - anchoTexto2(n)) / 2), 4, '#fff8e8', null);
  });
}

/** A translucent veil of a fixed colour as a ready-made `rgba` fill (no `save`, no `globalAlpha`); the strings are made once per level of alpha. */
function velos(r: number, g: number, b: number) {
  const cache: string[] = [];
  return (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alfa: number) => {
    const k = Math.max(0, Math.min(255, Math.round(alfa * 255)));
    if (k === 0) return;
    ctx.fillStyle = cache[k] ??= `rgba(${r},${g},${b},${k / 255})`;
    ctx.fillRect(x, y, w, h);
  };
}
const veloCrema = velos(240, 226, 192);

/** The corner brackets of a target (one baked piece per colour and corner), the glow ring of the actor's mat (per size and colour). */
const esquinas = new Map<string, HTMLCanvasElement>();
const anillos = new Map<string, HTMLCanvasElement>();
const BRAZO = 8;
/** Origin of a corner inside its 20x20 baked piece. */
const ORIGEN_ESQ = 10;

/** One bracket corner with its dark edge, the corner pixel at (cx, cy); `dx`/`dy` say where its arms go. */
function trazarEsquina(ctx: CanvasRenderingContext2D, color: string, cx: number, cy: number, dx: 1 | -1, dy: 1 | -1) {
  const hx = dx > 0 ? cx : cx - BRAZO + 1;
  const vy = dy > 0 ? cy : cy - BRAZO + 1;
  const gx = dx > 0 ? cx : cx - 1;
  const gy = dy > 0 ? cy : cy - 1;
  rect(ctx, TINTA2, hx - 1, gy - 1, BRAZO + 2, 4);
  rect(ctx, TINTA2, gx - 1, vy - 1, 4, BRAZO + 2);
  rect(ctx, color, hx, gy, BRAZO, 2);
  rect(ctx, color, gx, vy, 2, BRAZO);
}

function esquinaCacheada(color: string, dx: 1 | -1, dy: 1 | -1): HTMLCanvasElement {
  const clave = `${color}|${dx}|${dy}`;
  let c = esquinas.get(clave);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 2 * ORIGEN_ESQ;
    trazarEsquina(c.getContext('2d')!, color, ORIGEN_ESQ, ORIGEN_ESQ, dx, dy);
    esquinas.set(clave, c);
  }
  return c;
}

/** Pixel ellipse outline of 2 px (the glow around a mat), no anti-aliasing. */
function trazarAnillo(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string) {
  for (let dy = -ry; dy <= ry; dy++) {
    const ancho = Math.round(rx * Math.sqrt(1 - (dy / ry) ** 2));
    const borde = Math.abs(dy) >= ry - 1 ? ancho : Math.max(2, Math.round(ancho - rx * Math.sqrt(1 - ((Math.abs(dy) + 1.5) / ry) ** 2)));
    const y = cy + dy;
    if (Math.abs(dy) >= ry - 1) rect(ctx, color, cx - ancho, y, ancho * 2, 1);
    else {
      rect(ctx, color, cx - ancho, y, borde, 1);
      rect(ctx, color, cx + ancho - borde, y, borde, 1);
    }
  }
}

/** The mat's glow: a dark ring and a coloured one inside it, baked together once per size and colour. Its top-left is (cx − rx − 1, cy − ry). */
function anilloCacheado(rx: number, ry: number, color: string): HTMLCanvasElement {
  const clave = `${rx}|${ry}|${color}`;
  let c = anillos.get(clave);
  if (!c) {
    c = document.createElement('canvas');
    c.width = 2 * (rx + 1) + 1;
    c.height = 2 * (ry + 1) + 1;
    const cx = c.getContext('2d')!;
    // The dark ring is one pixel bigger on every side; the coloured one sits one pixel up (as it was drawn: centre cy, dark cy + 1).
    trazarAnillo(cx, rx + 1, ry + 1, rx + 1, ry + 1, TINTA2);
    trazarAnillo(cx, rx + 1, ry, rx, ry, color);
    anillos.set(clave, c);
  }
  return c;
}

/** Text lines that only comment on a hit that the screen already shows (tags, numbers). */
const REACCIONES = new Set(['combate.critico', 'combate.muy_eficaz', 'combate.poco_eficaz', 'combate.veces']);

/** Lines that tell what happened to ONE target of an area move; they travel with the hits of that move (see `grupoArea`). */
const TEXTOS_DE_GRUPO = new Set([...REACCIONES, 'combate.no_afecta', 'combate.esconde_protege', 'combate.sin_efecto', 'combate.tope_sube', 'combate.tope_baja', 'combate.atrapa', 'combate.bostezo', 'combate.cizana', 'combate.venganza', 'combate.aguanta']);

type EvGolpe = Extract<Evento, { k: 'golpe' }>;

/** The sound of a hit: the more notable the better (critical, super effective, normal, weak). */
const sonidoGolpe = (g: EvGolpe) => (g.critico ? 'critico' : g.ef > 1 ? 'golpeFuerte' : g.ef < 1 ? 'golpeFlojo' : 'golpe') as 'critico' | 'golpeFuerte' | 'golpeFlojo' | 'golpe';
type EvEfecto = Extract<Evento, { k: 'estado' | 'nivel' }>;

export class VistaCombate implements Escena {
  /** What is on screen (changes as the events play). */
  disp!: EstadoCombate;
  /** The engine's last full state (for the menus). */
  private real!: EstadoCombate;
  private fx: Fx[] = [];
  private anim = new Animador(() => ritmo().anim);
  private caja = new CajaTexto(206);
  private modo: Modo = 'cola';
  private sel = 0;
  private selMov = 0;
  private plazoFin = 0;
  private ultimoTic = -1;
  private turnoHud = 1;
  private foco: Foco | null = null;
  private flotantes: Flotante[] = [];
  /** The visual effects of the moves (lentils, firecrackers...): see `efectosMov.ts`. */
  private efectos = new EfectosMov();
  /** What the frame looks like apart from the animations (see `paso`): redraw only when it changes. */
  private firma = new Firma(8 + 2 * MAX_FIRMA_FLOT);
  /** The big banner of a suceso of the bar being announced (null: none). */
  private cartelSuceso: SucesoId | null = null;
  private geomH = -1;
  private geomVal: ReturnType<VistaCombate['calcularGeom']> | null = null;
  private rivLista: number[] = [];
  private rivYo = -1;
  private rivN = -1;
  private orden: OrdenTurno | null = null;
  /** performance.now() until which the big «ORDEN DEL TURNO» strip shows (0 = hidden). */
  private ordenHasta = 0;
  /** The battle log by turn (HISTORIAL), with the lines already wrapped for the box. */
  private historial: GrupoHistorial[] = [];
  private versionHistorial = 0;
  /** What the clock chip last showed (see `paso`). */
  private marcaReloj = -1;
  /** The last wrapped lines of the log for the box under the text (see `registro`). */
  private registroCache: { clave: string; todas: string[] } | null = null;
  /** The replacements phase is playing: a 'sale' event gets the spotlight. */
  private enReemplazo = false;
  /** An action has already been played in this turn (a pause goes between actions). */
  private hubo = false;
  /** The turn's end-of-turn part has begun. */
  private finVisto = false;
  private objetivosPosibles: number[] = [];
  private movElegido = 0;
  private gradaAccion: 'cana' | 'abucheo' = 'cana';
  private reemplazo = false;
  private resolverEleccion: ((e: Eleccion | null) => void) | null = null;
  private resolverReemplazo: ((i: number) => void) | null = null;
  /** Set by the flow: the player chose ABANDONAR in the pause box. */
  alAbandonar: (() => void) | null = null;
  private yo: number;

  /** `miSeat`: this screen's player (null = just watching: seat 0 goes at the bottom). */
  constructor(miSeat: number | null) {
    this.yo = miSeat ?? 0;
  }

  // ------------------------------------------------------------------ feeding (host or network)

  async alInicio(estado: EstadoCombate): Promise<void> {
    await this.calentar(estado);
    this.adoptar(estado);
    this.turnoHud = estado.turno;
    // The bar's own tune (the draft already chose and decoded it when it knew the bar; asking again keeps that choice).
    sonido.elegirCombate(estado.escenario);
    sonido.musica('combate');
    this.fx.forEach((f) => {
      f.oculto = true;
      f.alza = 0;
    });
    sonido.efecto('turno');
    const orden = [...this.rivales(), this.yo];
    const sacadas = orden.map(async (j, i) => {
      await dormir(250 * i);
      await this.entra(j);
    });
    const texto = this.caja.decir(t('batalla.inicio'), 900);
    await Promise.all([texto, ...sacadas]);
  }

  /**
   * Bakes the art of the twelve useritos (both idle frames of front and back, and the thumbnail) and of the move effects before the teams come out, a few at a
   * time, giving the screen a frame in between: the background baking (`precalentar.ts`) normally has done it long ago, but a
   * battle can start before that (the ?combate shortcut, an online guest who skipped the title).
   */
  private async calentar(estado: EstadoCombate) {
    const vistas = new Set<string>();
    const tareas: (() => void)[] = [];
    for (const q of estado.jugadores) {
      for (const u of q.equipo) {
        if (vistas.has(u.especie)) continue;
        vistas.add(u.especie);
        tareas.push(() => miniatura(u.especie), () => spriteFrente2(u.especie, 0), () => spriteFrente2(u.especie, 1), () => spriteEspalda2(u.especie, 0), () => spriteEspalda2(u.especie, 1));
      }
    }
    // The bar's backdrop and the object icons (a baked backdrop is a big canvas: better before the first frame than in it).
    tareas.push(() => hornearFondoEscenario(estado.escenario, alturaCampo(pantalla().alto)), ...tareasPrecalentarObjetos());
    // The sprites of the move effects too (already baked when the background baking is over: then this is a few empty loops).
    tareas.push(...tareasPrecalentarEfectos());
    let t0 = performance.now();
    for (const f of tareas) {
      f();
      if (performance.now() - t0 > 8) {
        await new Promise<void>((res) => requestAnimationFrame(() => res()));
        t0 = performance.now();
      }
    }
  }

  /** The local player decides the turn. */
  pedirEleccion(j: number, estado: EstadoCombate, plazoMs: number): Promise<Eleccion | null> {
    return new Promise((res) => {
      this.real = estado;
      this.turnoHud = estado.turno;
      this.yo = j;
      this.plazoFin = Date.now() + plazoMs;
      this.ultimoTic = -1;
      this.reemplazo = false;
      this.sel = 0;
      this.selMov = 0;
      this.caja.fijar('');
      const afuera = eliminado(estado, j);
      this.modo = afuera ? 'grada' : 'accion';
      this.resolverEleccion = (e) => {
        this.resolverEleccion = null;
        res(e);
      };
    });
  }

  /** The local player picks who comes in after a fall. */
  pedirReemplazo(j: number, estado: EstadoCombate, plazoMs: number): Promise<number> {
    return new Promise((res) => {
      this.real = estado;
      this.yo = j;
      this.plazoFin = Date.now() + plazoMs;
      this.ultimoTic = -1;
      this.reemplazo = true;
      const q = estado.jugadores[j];
      this.sel = Math.max(0, vivos(q)[0] ?? 0);
      this.caja.fijar('');
      this.modo = 'equipo';
      this.resolverReemplazo = (i) => {
        this.resolverReemplazo = null;
        res(i);
      };
    });
  }

  async alTurno(eventos: Evento[], estado: EstadoCombate): Promise<void> {
    this.cerrarMenus();
    this.grupoHistorial(estado.turno - 1);
    this.enReemplazo = false;
    await this.reproducir(eventos);
    this.terminarReproduccion();
    this.adoptar(estado);
    this.turnoHud = estado.turno;
  }

  async alReemplazo(eventos: Evento[], estado: EstadoCombate): Promise<void> {
    this.cerrarMenus();
    this.grupoHistorial(estado.turno - 1);
    this.enReemplazo = true;
    this.hubo = false;
    await this.reproducir(eventos, false);
    this.enReemplazo = false;
    this.terminarReproduccion();
    this.adoptar(estado);
  }

  /** A line from outside the battle (online: someone left): queued in the text box. */
  aviso(s: string) {
    this.registrar(s);
    void this.caja.decir(s, 1400);
    pantalla().redibujar();
  }

  async alFin(estado: EstadoCombate): Promise<void> {
    this.cerrarMenus();
    this.adoptar(estado);
    await dormir(700);
  }

  private cerrarMenus() {
    this.modo = 'cola';
    this.plazoFin = 0;
    this.reemplazo = false;
    this.caja.vaciar();
  }

  // ------------------------------------------------------------------ state helpers

  private rivales(): number[] {
    const n = this.disp.jugadores.length;
    if (n !== this.rivN || this.yo !== this.rivYo) {
      this.rivN = n;
      this.rivYo = this.yo;
      this.rivLista = [];
      for (let j = 0; j < n; j++) if (j !== this.yo) this.rivLista.push(j);
    }
    return this.rivLista;
  }

  /** Takes `estado` as the truth: sprites, bars, statuses, places. */
  private adoptar(estado: EstadoCombate) {
    this.real = estado;
    this.disp = structuredClone(estado);
    this.disp.jugadores.forEach((q, j) => {
      const f = (this.fx[j] ??= nuevoFx());
      const u = activo(this.disp, j);
      f.ps = u.ps;
      f.oculto = u.ps <= 0;
      f.parpadeo = 0;
      f.salto = 0;
      f.saltoY = 0;
      f.caida = 0;
      f.alza = 1;
      f.chapa = -1;
      f.velo = q.puesto > 1 ? 1 : 0;
    });
    this.musicaSegunJugadores();
  }

  private musicaSegunJugadores() {
    const enPie = this.disp.jugadores.filter((q) => q.puesto === 0).length;
    sonido.musica(enPie <= 2 ? 'final' : 'combate');
    // The next tunes are fetched and decoded before they are needed, so that they start at once: the final one when three are left,
    // the fanfare when two are (a decode takes a while on a phone, and a late tune is worse than none).
    if (enPie <= 3) sonido.precargar('final');
    if (enPie <= 2) sonido.precargar('victoria');
  }

  // ------------------------------------------------------------------ playing the events

  private terminarReproduccion() {
    this.efectos.limpiar();
    this.foco = null;
    this.orden = null;
    this.ordenHasta = 0;
    this.flotantes = [];
  }

  /** Who acts, in order, taken from the events of a turn: attacks, switches and cañas (not the grada). */
  private derivarOrden(eventos: Evento[]): OrdenTurno {
    const lista: OrdenTurno['lista'] = [];
    for (const ev of eventos) {
      if (ev.fin) break;
      if (ev.k === 'usa' || (ev.k === 'texto' && ev.j !== undefined && (ev.clave === 'combate.retira' || ev.clave === 'combate.cana'))) {
        const j = ev.j as number;
        lista.push({ j, especie: this.userito(j).especie });
      }
    }
    return { lista, actual: -1 };
  }

  private async reproducir(eventos: Evento[], conOrden = true) {
    this.hubo = false;
    this.finVisto = false;
    this.foco = null;
    const orden = this.derivarOrden(eventos);
    // The order of the turn first, for a moment.
    if (conOrden && orden.lista.length >= 2) {
      this.orden = orden;
      const ms = cfg.rapido ? 0 : ritmo().orden;
      if (ms > 0) {
        this.ordenHasta = performance.now() + ms;
        sonido.efecto('turno');
        await dormir(ms);
        this.ordenHasta = 0;
      }
    } else if (conOrden) this.orden = orden.lista.length ? orden : null;
    // The targets of the area move being played (two or more): their results play all at once (`grupoArea`).
    let area: number[] | null = null;
    for (let i = 0; i < eventos.length; i++) {
      const ev = eventos[i];
      if (ev.k === 'suceso') {
        // The suceso and what it does to the useritos (heals, stage changes: the events right after it) play as one.
        let k = i + 1;
        while (k < eventos.length && this.deSuceso(eventos[k])) k++;
        await this.suceso(ev, eventos.slice(i + 1, k));
        i = k - 1;
        continue;
      }
      if (ev.k === 'usa') area = (ev.obj?.length ?? 0) >= 2 ? ev.obj! : null;
      else if (area && this.deGrupo(ev, area)) {
        let k = i + 1;
        while (k < eventos.length && this.deGrupo(eventos[k], area)) k++;
        await this.grupoArea(eventos.slice(i, k));
        i = k - 1;
        continue;
      }
      // Pure text lines that follow each other (the same hit: critical, super effective...) share a box when they fit.
      if (ev.k === 'texto' && ev.clave) {
        this.entrarFin(ev);
        const grupo = [ev];
        let linea = t(ev.clave, ev.vars);
        while (i + 1 < eventos.length) {
          const sig = eventos[i + 1];
          if (sig.k !== 'texto' || !sig.clave || !!sig.fin !== !!ev.fin) break;
          const junto = `${linea} ${t(sig.clave, sig.vars)}`;
          if (!this.caja.cabe(junto, this.lineasCaja())) break;
          linea = junto;
          grupo.push(sig);
          i++;
        }
        for (const g of grupo) this.efectoTexto(g);
        // Reactions to a hit (critical, effectiveness, «n times») are also shown as tags over the userito: they wait less.
        const breve = grupo.every((g) => REACCIONES.has(g.clave ?? ''));
        await this.decir(linea, breve && ritmo().espera > 0 ? Math.round(ritmo().espera / 2) : undefined);
        continue;
      }
      // The hits of a multi-hit move go quicker, one after the other (the last one drains the bar at the normal pace).
      await this.evento(ev, ev.k === 'golpe' && this.sigueGolpe(eventos, i));
    }
  }

  /** Whether the next hit event (skipping the lines that comment on this one) is another hit on the same userito. */
  private sigueGolpe(eventos: Evento[], i: number): boolean {
    const ev = eventos[i] as EvGolpe;
    if (ev.fin) return false;
    for (let k = i + 1; k < eventos.length; k++) {
      const sig = eventos[k];
      if (sig.k === 'texto' && sig.j === ev.j && REACCIONES.has(sig.clave ?? '')) continue;
      return sig.k === 'golpe' && sig.j === ev.j && !sig.fin;
    }
    return false;
  }

  /** Whether `ev` is a result of the area move on one of its targets `area` (a hit, a miss, a status, a fall, or the line about one). */
  private deGrupo(ev: Evento, area: number[]): boolean {
    if (ev.fin) return false;
    switch (ev.k) {
      case 'golpe':
      case 'falla':
      case 'estado':
      case 'nivel':
      case 'cae':
        return area.includes(ev.j);
      case 'texto':
        return ev.j !== undefined && area.includes(ev.j) && (TEXTOS_DE_GRUPO.has(ev.clave ?? '') || (ev.clave ?? '').startsWith('combate.perk.'));
      default:
        return false;
    }
  }

  /** Whether `ev` is an effect of the suceso just announced (a heal, a stage change, or a line about them). */
  private deSuceso(ev: Evento): boolean {
    if (!ev.fin) return false;
    switch (ev.k) {
      case 'cura':
      case 'nivel':
        return !ev.clave || ev.clave.startsWith('combate.');
      case 'texto':
        return (ev.clave ?? '').startsWith('suceso.premio.') || (ev.clave ?? '').startsWith('combate.tope_');
      default:
        return false;
    }
  }

  /**
   * Something happens in the bar: the big banner and the phrase, then its effects on the useritos all at once. A suceso that lasts
   * joins the chips under the field (`disp.sucesos`, the same the engine's state will carry).
   */
  private async suceso(ev: Extract<Evento, { k: 'suceso' }>, efectos: Evento[]) {
    this.entrarFin(ev);
    this.foco = null;
    if (ev.turnos > 0) this.disp.sucesos = [...this.disp.sucesos.filter((x) => x.id !== ev.id), { id: ev.id, turnos: ev.turnos }];
    this.cartelSuceso = ev.id;
    sonido.efecto('turno');
    pantalla().redibujar();
    // The banner stays while the phrase is read (with the tap-to-continue pace, until the tap) and at least a moment.
    const minimo = cfg.rapido ? 0 : Math.max(900, ritmo().orden);
    await Promise.all([ev.clave ? this.decir(t(ev.clave, ev.vars)) : Promise.resolve(), dormir(minimo)]);
    this.cartelSuceso = null;
    pantalla().redibujar();
    if (efectos.length) await this.grupoArea(efectos);
  }

  private userito(j: number): Userito {
    return activo(this.disp, j);
  }

  /**
   * The object of `u` (player j's userito) as this screen may show it: your own always, the others' only once it has worked
   * (`visto`: the event of its first use sets it). Until then a rival's object is not drawn, whatever the state carries.
   */
  private objetoVisible(j: number, u: Userito): ObjetoLlevado | null {
    const o = u.objeto;
    return o && (j === this.yo || o.visto) ? o : null;
  }

  /** Puts a line in the log and in the text box. */
  private decir(linea: string, esperaMs?: number): Promise<void> {
    this.registrar(linea);
    return this.caja.decir(linea, esperaMs);
  }

  private registrar(linea: string) {
    if (!this.historial.length) this.historial.push({ turno: 0, lineas: [] });
    this.historial[this.historial.length - 1].lineas.push(linea);
    this.versionHistorial++;
  }

  private grupoHistorial(turno: number) {
    const ult = this.historial[this.historial.length - 1];
    if (!ult || ult.turno !== turno) this.historial.push({ turno, lineas: [] });
  }

  // ---- the spotlight

  private ponerFoco(actor: number, objetivos: number[], mov: string | null = null) {
    let destino: Foco['destino'] = 'caras';
    if (mov) {
      const fuera = objetivos.filter((j) => j !== actor);
      if (!fuera.length) destino = 'yo';
      else if (MOVS[mov]?.objetivo === 'todos' || fuera.length > 1) destino = 'todos';
    }
    this.foco = { actor, objetivos, t0: performance.now(), mov, destino };
    if (this.orden && actor >= 0) {
      // The action being played is the next one in the list that belongs to this player.
      let i = this.orden.actual + 1;
      while (i < this.orden.lista.length && this.orden.lista[i].j !== actor) i++;
      if (i < this.orden.lista.length) this.orden.actual = i;
    }
  }

  /** Something floats over a userito for a moment. `acorr`: a damage number that carries the «1/2» badge. */
  private flota(j: number, s: string, color: string, tipo: 'num' | 'tag', acorr = false) {
    const ahora = performance.now();
    let hueco = 0;
    for (const f of this.flotantes) if (f.j === j && f.tipo === tipo && ahora - f.t0 < f.dur) hueco++;
    this.flotantes.push({ j, img: rotuloFlotante(s, color), tipo, hueco, t0: ahora, dur: cfg.rapido ? 120 : ritmo().flota, acorr });
  }

  /** What a pure text event adds on screen (a tag, the spotlight on a switch or a caña) before its line shows. */
  private efectoTexto(ev: Extract<Evento, { k: 'texto' }>) {
    if (ev.j === undefined) return;
    switch (ev.clave) {
      case 'combate.no_afecta':
        this.flota(ev.j, t('batalla.tag.noafecta'), TAG_GRIS, 'tag');
        break;
      case 'combate.esconde_protege':
        this.flota(ev.j, t('batalla.tag.escondido'), TAG_GRIS, 'tag');
        break;
      case 'combate.retira':
      case 'combate.cana':
        this.hubo = true;
        this.ponerFoco(ev.j, []);
        break;
      case 'combate.grada_cana':
      case 'combate.grada_abucheo':
        this.ponerFoco(-1, [ev.j]);
        break;
    }
  }

  /** The first event after the last action: the spotlight goes out (what follows are the bar's effects). */
  private entrarFin(ev: Evento) {
    if (!ev.fin || this.finVisto) return;
    this.finVisto = true;
    this.foco = null;
    if (this.orden) this.orden.actual = this.orden.lista.length;
  }

  /** Plays one event. `corto`: a hit of a multi-hit move that is followed by another one (quicker flash and bar). */
  private async evento(ev: Evento, corto = false) {
    const tareas: Promise<void>[] = [];
    let linea = ev.clave ? t(ev.clave, ev.vars) : null;
    // «X used Y»: the hit comes right after it, so it does not wait as long as other lines.
    let espera: number | undefined;
    this.entrarFin(ev);
    switch (ev.k) {
      case 'usa': {
        if (this.hubo) await dormir(ritmo().entre);
        this.hubo = true;
        this.ponerFoco(ev.j, ev.obj ?? [], ev.mov);
        const m = MOVS[ev.mov];
        if (m) {
          if (m.pot !== null) sonido.efecto(['mindundi', 'bronca', 'ventolera', 'juerga', 'fantasma'].includes(m.tipo) ? 'cursor' : 'cambio');
        }
        if (ritmo().espera > 0) espera = Math.round(ritmo().espera * 0.45);
        // The move's visual effect flies in the last part of the pause after the line, so that it lands as the hit begins (see `decirYLanzar`).
        const plan = linea ? this.planEfecto(ev) : null;
        if (plan && linea) {
          tareas.push(this.decirYLanzar(linea, espera, ev, plan));
          linea = null;
        } else tareas.push(this.embestida(ev.j, ev.obj ?? []));
        break;
      }
      case 'golpe':
        tareas.push(...this.golpeVisual(ev, true, corto));
        break;
      case 'falla':
        sonido.efecto('falla');
        this.flota(ev.j, t(ev.clave === 'combate.esquiva' ? 'batalla.tag.esquiva' : 'batalla.tag.falla'), TAG_GRIS, 'tag');
        break;
      case 'cura': {
        const u = this.userito(ev.j);
        const ganado = ev.ps - u.ps;
        u.ps = ev.ps;
        sonido.efecto('cura');
        if (ganado > 0) this.flota(ev.j, `+${ganado}`, PS_VERDE, 'num');
        tareas.push(this.barra(ev.j, ev.ps));
        break;
      }
      case 'estado':
        this.aplicarEstado(ev, true);
        break;
      case 'nivel':
        sonido.efecto(ev.cambio > 0 ? 'sube' : 'baja');
        break;
      case 'objeto': {
        // The object works: from now on everybody sees it on the panel (a one-use one greyed out), and its name flashes over the userito.
        const u = this.userito(ev.j);
        u.objeto = { id: ev.objeto, visto: true, ...(OBJETO_PERMANENTE[ev.objeto] ? {} : { gastado: true as const }) };
        sonido.efecto('estado');
        this.flota(ev.j, t(`objeto.${ev.objeto}.nombre`).toUpperCase(), TAG_ORO, 'tag');
        break;
      }
      case 'cae': {
        sonido.efecto('cae');
        this.userito(ev.j).ps = 0;
        tareas.push(this.cae(ev.j));
        break;
      }
      case 'sale': {
        if (this.enReemplazo) this.ponerFoco(ev.j, []);
        this.disp.jugadores[ev.j].activo = ev.idx;
        this.fx[ev.j].ps = this.userito(ev.j).ps;
        this.fx[ev.j].oculto = true;
        tareas.push(this.entra(ev.j, true));
        break;
      }
      case 'eliminado': {
        sonido.efecto('eliminado');
        this.disp.jugadores[ev.j].puesto = ev.puesto;
        tareas.push(this.anim.animar(500, (p) => (this.fx[ev.j].velo = p)));
        this.musicaSegunJugadores();
        break;
      }
      case 'fin':
        this.disp.ganador = ev.ganador;
        this.disp.jugadores[ev.ganador].puesto = 1;
        this.foco = null;
        break;
      case 'texto':
      case 'suceso':
        break;
    }
    if (linea) tareas.push(this.decir(linea, espera));
    await Promise.all(tareas);
  }

  /** What a hit shows: the HP drains, the sprite flashes, the number floats (with its tags and the Acorralado badge). Returns the animations. */
  private golpeVisual(ev: EvGolpe, sonar: boolean, corto: boolean): Promise<void>[] {
    const tareas: Promise<void>[] = [];
    this.userito(ev.j).ps = ev.ps;
    if (ev.fin) this.foco = { actor: -1, objetivos: [ev.j], t0: performance.now(), mov: null, destino: 'caras' };
    if (ev.dano > 0) {
      if (sonar) sonido.efecto(sonidoGolpe(ev));
      tareas.push(this.parpadea(ev.j, corto));
      this.flota(ev.j, `-${ev.dano}`, PS_ROJO, 'num', ev.acorralado);
      if (ev.critico) this.flota(ev.j, t('batalla.tag.critico'), TAG_ORO, 'tag');
      if (ev.ef > 1) this.flota(ev.j, t('batalla.tag.muy'), TAG_ORO, 'tag');
      else if (ev.ef < 1 && ev.ef > 0) this.flota(ev.j, t('batalla.tag.poco'), TAG_GRIS, 'tag');
    }
    // The log says why the hit was halved (the badge on the number is the short form).
    if (ev.acorralado) this.registrar(t('combate.acorralado', { quien: ESPECIE[this.userito(ev.j).especie].nombre }));
    tareas.push(this.barra(ev.j, ev.ps, corto));
    return tareas;
  }

  /** A status starts or ends (the state on screen only; the sound is the caller's when `sonar` is false). */
  private aplicarEstado(ev: Extract<Evento, { k: 'estado' }>, sonar: boolean) {
    const u = this.userito(ev.j);
    if (ev.estado === null) {
      if (ev.de === 'achispado') u.achispado = 0;
      else u.estado = null;
      return;
    }
    if (ev.estado === 'achispado') u.achispado = Math.max(1, u.achispado);
    else u.estado = ev.estado;
    if (sonar) sonido.efecto('estado');
  }

  /**
   * The results of a move on several rivals (an area move) play AT ONCE, not one rival after another: all hits flash and
   * drain together, the numbers and tags float together over each target (critical, effectiveness, misses, immunities),
   * the falls happen together, and a status or stat change on several targets is one tag each and one line for all.
   * The log (HISTORIAL) still gets one line per target. `evs`: the move's events after its «used», in order.
   */
  private async grupoArea(evs: Evento[]) {
    const golpes = new Map<number, EvGolpe[]>();
    const fallas: Extract<Evento, { k: 'falla' }>[] = [];
    const avisos: Extract<Evento, { k: 'texto' }>[] = [];
    const lineas: Extract<Evento, { k: 'texto' }>[] = [];
    const caidas: Extract<Evento, { k: 'cae' }>[] = [];
    const curas: Extract<Evento, { k: 'cura' }>[] = [];
    const efectos: EvEfecto[] = [];
    for (const ev of evs) {
      switch (ev.k) {
        case 'cura':
          curas.push(ev);
          break;
        case 'golpe': {
          const l = golpes.get(ev.j);
          if (l) l.push(ev);
          else golpes.set(ev.j, [ev]);
          break;
        }
        case 'falla':
          fallas.push(ev);
          break;
        case 'cae':
          caidas.push(ev);
          break;
        case 'estado':
        case 'nivel':
          efectos.push(ev);
          break;
        case 'texto':
          if (!ev.clave) break;
          if (REACCIONES.has(ev.clave)) this.registrar(t(ev.clave, ev.vars));
          else if (ev.clave === 'combate.no_afecta' || ev.clave === 'combate.esconde_protege') avisos.push(ev);
          else lineas.push(ev);
          break;
      }
    }

    // 1. Hits, misses and immunities, all together (a target hit several times: round by round).
    for (const f of fallas) {
      this.flota(f.j, t(f.clave === 'combate.esquiva' ? 'batalla.tag.esquiva' : 'batalla.tag.falla'), TAG_GRIS, 'tag');
      if (f.clave) this.registrar(t(f.clave, f.vars));
    }
    for (const a of avisos) {
      this.efectoTexto(a);
      this.registrar(t(a.clave!, a.vars));
    }
    if (fallas.length) sonido.efecto('falla');
    const listas = [...golpes.values()];
    const rondas = Math.max(0, ...listas.map((l) => l.length));
    for (let r = 0; r < rondas; r++) {
      const ronda = listas.map((l) => l[r]).filter((g): g is EvGolpe => !!g);
      const sonidos = ronda.filter((g) => g.dano > 0).map(sonidoGolpe);
      const suena = (['critico', 'golpeFuerte', 'golpe', 'golpeFlojo'] as const).find((x) => sonidos.includes(x));
      if (suena) sonido.efecto(suena);
      await Promise.all(ronda.flatMap((g) => this.golpeVisual(g, false, r < rondas - 1)));
    }
    if (!rondas && (fallas.length || avisos.length)) await dormir(ritmo().entre * 2);
    // Heals (a suceso's): every bar fills at once, with its +N.
    if (curas.length) {
      sonido.efecto('cura');
      await Promise.all(
        curas.map((c) => {
          const u = this.userito(c.j);
          const ganado = c.ps - u.ps;
          u.ps = c.ps;
          if (ganado > 0) this.flota(c.j, `+${ganado}`, PS_VERDE, 'num');
          return this.barra(c.j, c.ps);
        }),
      );
    }

    // 2. What the hits left to say about one target (a perk, a cap...).
    for (const l of lineas) await this.decir(t(l.clave!, l.vars));

    // 3. Everyone who fell, together.
    if (caidas.length) {
      sonido.efecto('cae');
      const caen = caidas.map((c) => {
        this.userito(c.j).ps = 0;
        return this.cae(c.j);
      });
      const textos = (async () => {
        for (const c of caidas) if (c.clave) await this.decir(t(c.clave, c.vars));
      })();
      await Promise.all([...caen, textos]);
    }

    // 4. Statuses and stat changes: a tag over each target and one line for all those that got the same.
    if (efectos.length) await this.efectosJuntos(efectos);
  }

  /** Statuses and stat changes on several targets of one move, at once. */
  private async efectosJuntos(efectos: EvEfecto[]) {
    let sonada = false;
    for (const e of efectos) {
      if (e.k === 'estado') {
        this.aplicarEstado(e, false);
        if (e.estado !== null) this.flota(e.j, t(`batalla.tag.estado.${e.estado}`), TAG_ORO, 'tag');
        if (!sonada && e.estado !== null) sonido.efecto('estado');
        if (e.estado !== null) sonada = true;
      } else {
        const n = Math.abs(e.cambio);
        this.flota(e.j, `${t(`ficha.stat.${e.stat}`)} ${e.cambio > 0 ? '+' : '-'}${n}`, e.cambio > 0 ? PS_VERDE : PS_ROJO, 'tag');
        if (!sonada) sonido.efecto(e.cambio > 0 ? 'sube' : 'baja');
        sonada = true;
      }
    }
    // One line for each kind of change; if several targets got the same, one line names them all.
    const porClave = new Map<string, EvEfecto[]>();
    for (const e of efectos) {
      if (!e.clave) continue;
      const l = porClave.get(e.clave);
      if (l) l.push(e);
      else porClave.set(e.clave, [e]);
    }
    for (const [clave, lista] of porClave) {
      const resumen = `combate.todos.${clave.slice('combate.'.length)}`;
      if (lista.length > 1 && hayTexto(resumen)) {
        const nombres = lista.map((e) => String(e.vars?.quien ?? ''));
        const quienes = `${nombres.slice(0, -1).join(', ')} ${t('combate.todos.y')} ${nombres[nombres.length - 1]}`;
        await this.decir(t(resumen, { quienes }));
      } else for (const e of lista) await this.decir(t(clave, e.vars));
    }
  }

  /** The attacker lunges towards its target(s): sideways (towards the other side of the field) and up or down to the target's row. */
  private embestida(j: number, objetivos: number[]): Promise<void> {
    const dir = j === this.yo ? 1 : -1;
    const fuera = objetivos.filter((o) => o !== j);
    // Vertical: towards the mean row of its targets (none: a little hop up).
    let dy = -5;
    if (fuera.length) {
      const media = fuera.reduce((a, o) => a + this.yFila(o), 0) / fuera.length;
      dy = Math.sign(media - this.yFila(j)) * 9;
    }
    const f = this.fx[j];
    return this.anim.animar(340, (p) => {
      const seno = Math.sin(p * Math.PI);
      f.salto = fuera.length ? dir * Math.round(seno * 7) : 0;
      f.saltoY = Math.round(seno * dy);
    });
  }

  /** How fast the move effects play: with the speed setting (slow 1, normal 1.15, fast 1.4), and much quicker in the fast test mode. */
  private escalaFx(): number {
    return cfg.rapido ? 4 : cfg.velocidad === 'rapida' ? 1.4 : cfg.velocidad === 'normal' ? 1.15 : 1;
  }

  /** The centre of j's sprite on screen (where an effect starts or lands). */
  private centroSprite(j: number): PuntoFx {
    const c = this.cajaDe(j);
    return { x: (c.x0 + c.x1) >> 1, y: (c.y0 + c.y1) >> 1 };
  }

  /**
   * What the effect of a move needs: the attacker's centre and its targets' (several: all at once; none: a move on oneself). Nothing when
   * the attacker is hidden, or the move found nobody to hit (a failed copy, say). A move that never reached «usa» (asleep, paralysed...) has no event at all.
   */
  private planEfecto(ev: Extract<Evento, { k: 'usa' }>): { desde: PuntoFx; a: PuntoFx[]; llega: number } | null {
    const m = MOVS[ev.mov];
    if (!m || !this.fx[ev.j] || this.fx[ev.j].oculto) return null;
    const a: PuntoFx[] = [];
    for (const o of ev.obj ?? []) if (o !== ev.j && this.fx[o] && !this.fx[o].oculto) a.push(this.centroSprite(o));
    if (!a.length && m.objetivo !== 'yo') return null;
    return { desde: this.centroSprite(ev.j), a, llega: llegadaFx(ev.mov, a.length > 0) };
  }

  /**
   * The line «X used Y», then the effect. The pause that follows the line is split in two: the first part reading, the last `llega` ms
   * (when the effect arrives) flying, so that the hit starts as the effect lands and the move takes no longer than before.
   * With a tap-to-continue pace the effect comes after the tap.
   */
  private async decirYLanzar(linea: string, espera: number | undefined, ev: Extract<Evento, { k: 'usa' }>, plan: { desde: PuntoFx; a: PuntoFx[]; llega: number }) {
    const k = this.escalaFx();
    const llega = Math.round(plan.llega / k);
    const esp = espera ?? ritmo().espera;
    await this.decir(linea, esp >= 0 ? Math.max(0, esp - llega) : esp);
    this.efectos.lanzar(ev.mov, MOVS[ev.mov].tipo, plan.desde, plan.a);
    void this.embestida(ev.j, ev.obj ?? []);
    await dormir(llega);
  }

  private parpadea(j: number, corto = false): Promise<void> {
    const ms = corto ? 240 : 480;
    return this.anim.animar(ms, (p) => (this.fx[j].parpadeo = p >= 1 ? 0 : ms * (1 - p)));
  }

  /** The HP bar drains (or fills) over the time the speed setting says. */
  private barra(j: number, ps: number, corto = false): Promise<void> {
    const f = this.fx[j];
    const desde = f.ps;
    return this.anim.animar(corto ? Math.round(ritmo().barra * 0.4) : ritmo().barra, (p) => (f.ps = desde + (ps - desde) * p), true);
  }

  private async cae(j: number) {
    const f = this.fx[j];
    await this.anim.animar(550, (p) => (f.caida = p));
    f.oculto = true;
    f.caida = 0;
  }

  /** A userito comes out of its bottle cap. */
  private async entra(j: number, conGrito = false) {
    const f = this.fx[j];
    f.oculto = false;
    f.alza = 0;
    f.chapa = 0;
    f.caida = 0;
    await this.anim.animar(650, (p) => {
      f.chapa = p >= 1 ? -1 : p;
      f.alza = Math.min(1, Math.max(0, (p - 0.35) / 0.45));
    });
    f.alza = 1;
    if (conGrito || j === this.yo) sonido.grito(this.userito(j).especie);
  }

  // ------------------------------------------------------------------ choosing

  private enviar(e: Eleccion | null) {
    sonido.efecto('aceptar');
    this.modo = 'espera';
    this.caja.fijar(t('batalla.espera'));
    this.resolverEleccion?.(e);
  }

  private atrasDe(): boolean {
    switch (this.modo) {
      case 'movs':
        this.modo = 'accion';
        break;
      case 'objetivo':
        this.modo = this.movElegido === -1 ? 'accion' : 'movs';
        break;
      case 'equipo':
        if (this.reemplazo) return false;
        this.modo = 'accion';
        this.sel = 1;
        break;
      case 'gradaObj':
        this.modo = 'grada';
        this.sel = 0;
        break;
      default:
        return false;
    }
    sonido.efecto('atras');
    return true;
  }

  private get puedeVolver(): boolean {
    return this.modo === 'movs' || this.modo === 'objetivo' || this.modo === 'gradaObj' || (this.modo === 'equipo' && !this.reemplazo);
  }

  /** The cards (tap a panel, a sprite or a status) are open to the player while he chooses or waits; not while picking a target (the tap picks) or while the text runs (the tap moves it on). */
  private get infoPosible(): boolean {
    return this.modo === 'accion' || this.modo === 'movs' || this.modo === 'equipo' || this.modo === 'grada' || this.modo === 'espera';
  }

  private get eligiendo(): boolean {
    return this.modo === 'accion' || this.modo === 'movs' || this.modo === 'objetivo' || this.modo === 'equipo' || this.modo === 'grada' || this.modo === 'gradaObj';
  }

  private async pausar() {
    sonido.efecto('aceptar');
    const r = await menuPausa(this);
    if (r === 'abandonar') this.alAbandonar?.();
  }

  private elegirMovimiento(i: number) {
    const u = activo(this.real, this.yo);
    const libres = movsDisponibles(this.real, this.yo);
    const desesperada = !libres.some(Boolean);
    if (!desesperada && !libres[i]) return;
    this.movElegido = desesperada ? 0 : i;
    const id = desesperada ? DESESPERADA : ESPECIE[u.especie].movs[i];
    if (necesitaObjetivo(id, this.real)) {
      const riv = rivalesEnPie(this.real, this.yo);
      if (riv.length === 1) {
        this.enviar({ tipo: 'atacar', mov: this.movElegido, objetivo: riv[0] });
        return;
      }
      this.objetivosPosibles = riv;
      this.sel = 0;
      this.modo = 'objetivo';
      sonido.efecto('aceptar');
    } else this.enviar({ tipo: 'atacar', mov: this.movElegido });
  }

  private elegirObjetivo(j: number) {
    if (!this.objetivosPosibles.includes(j)) return;
    if (this.modo === 'objetivo') this.enviar({ tipo: 'atacar', mov: this.movElegido, objetivo: j });
    else if (this.modo === 'gradaObj') this.enviar({ tipo: 'grada', accion: this.gradaAccion, objetivo: j });
  }

  private abrirObjetivosGrada(accion: 'cana' | 'abucheo') {
    this.gradaAccion = accion;
    this.objetivosPosibles = rivalesEnPie(this.real, this.yo);
    if (this.objetivosPosibles.length === 1) {
      this.enviar({ tipo: 'grada', accion, objetivo: this.objetivosPosibles[0] });
      return;
    }
    this.sel = 0;
    this.modo = 'gradaObj';
    sonido.efecto('aceptar');
  }

  private elegirEquipo(i: number) {
    const q = this.real.jugadores[this.yo];
    const u = q.equipo[i];
    if (!u || u.ps <= 0) return;
    if (this.reemplazo) {
      this.modo = 'espera';
      this.caja.fijar(t('batalla.espera'));
      sonido.efecto('aceptar');
      this.resolverReemplazo?.(i);
    } else {
      if (i === q.activo) return;
      this.enviar({ tipo: 'cambiar', a: i });
    }
  }

  private accionPrincipal(i: number) {
    const q = this.real.jugadores[this.yo];
    if (i === 0) {
      this.modo = 'movs';
      this.selMov = 0;
      sonido.efecto('aceptar');
    } else if (i === 1) {
      if (!puedeCambiar(this.real, this.yo)) return;
      this.modo = 'equipo';
      this.reemplazo = false;
      this.sel = vivos(q).find((k) => k !== q.activo) ?? 0;
      sonido.efecto('aceptar');
    } else if (i === 2) {
      if (!q.cana) return;
      this.enviar({ tipo: 'cana' });
    }
  }

  accion(a: Accion): boolean {
    if (a === 'atras') {
      if (this.atrasDe()) return true;
      void this.pausar();
      return true;
    }
    switch (this.modo) {
      case 'cola':
        if (a === 'aceptar') this.caja.toque();
        return true;
      case 'espera':
        return true;
      case 'accion':
        if (a === 'arriba' || a === 'abajo') {
          this.sel = mover(this.sel, 3, a);
          sonido.efecto('cursor');
        } else if (a === 'aceptar') this.accionPrincipal(this.sel);
        return true;
      case 'movs': {
        // The last row is VOLVER.
        const n = movsDisponibles(this.real, this.yo).some(Boolean) ? 4 : 1;
        if (a === 'arriba' || a === 'abajo') {
          this.selMov = mover(this.selMov, n + 1, a);
          sonido.efecto('cursor');
        } else if (a === 'aceptar') {
          if (this.selMov >= n) this.accion('atras');
          else this.elegirMovimiento(this.selMov);
        }
        return true;
      }
      case 'equipo': {
        // Unless it is the forced replacement, the last row is VOLVER.
        const n = this.real.jugadores[this.yo].equipo.length;
        const filas = n + (this.reemplazo ? 0 : 1);
        if (a === 'arriba' || a === 'abajo') {
          this.sel = mover(this.sel, filas, a);
          sonido.efecto('cursor');
        } else if (a === 'aceptar') {
          if (this.sel >= n) this.accion('atras');
          else this.elegirEquipo(this.sel);
        }
        return true;
      }
      case 'objetivo':
      case 'gradaObj': {
        const n = this.objetivosPosibles.length;
        if (n && (a === 'arriba' || a === 'abajo' || a === 'izq' || a === 'der')) {
          this.sel = mover(this.sel, n, a === 'arriba' || a === 'izq' ? 'arriba' : 'abajo');
          sonido.efecto('cursor');
        } else if (a === 'aceptar') this.elegirObjetivo(this.objetivosPosibles[this.sel]);
        return true;
      }
      case 'grada':
        if (a === 'arriba' || a === 'abajo') {
          this.sel = mover(this.sel, 3, a);
          sonido.efecto('cursor');
        } else if (a === 'aceptar') this.accionGrada(this.sel);
        return true;
    }
    return true;
  }

  private accionGrada(i: number) {
    if (i === 2) this.enviar(null);
    else if (enGrada(this.real, this.yo)) this.abrirObjetivosGrada(i === 0 ? 'cana' : 'abucheo');
    else this.enviar(null);
  }

  // ------------------------------------------------------------------ frame

  paso(dt: number, ahora: number): boolean {
    let mueve = this.anim.paso(dt);
    if (this.caja.paso(dt)) mueve = true;
    if (this.efectos.paso(dt, this.escalaFx())) mueve = true;
    if (this.firmaFoco(ahora)) mueve = true;
    for (const f of this.fx) {
      if (f.parpadeo > 0) {
        f.parpadeo = Math.max(0, f.parpadeo - dt);
      }
    }
    if (this.plazoFin > 0) {
      const seg = Math.ceil((this.plazoFin - Date.now()) / 1000);
      if (seg <= 5 && seg > 0 && seg !== this.ultimoTic && this.eligiendo) {
        this.ultimoTic = seg;
        sonido.efecto('tic');
      }
      if (seg <= 0 && this.eligiendo) {
        // Time is up: the host decides for us.
        this.modo = 'espera';
        this.caja.fijar(t('batalla.tiempo'));
      }
      // Redraw only when the clock shows something new (the second, or its blink in the last five).
      const marca = seg * 2 + (seg <= 5 ? Math.floor(performance.now() / 400) % 2 : 0);
      if (marca !== this.marcaReloj) {
        this.marcaReloj = marca;
        mueve = true;
      }
    }
    return mueve;
  }

  /**
   * The spotlight pulses, numbers float and fade, the order strip counts down, but all of it changes what is on screen only a few times a
   * second (the pulse every 140 ms, a number one pixel at a time, a fade in steps). The values the frame is drawn from are put in
   * `firma` the way `dibujar` computes them, and the screen asks for a redraw only when one of them changes.
   */
  private firmaFoco(ahora: number): boolean {
    const v = this.firma.v;
    const ahoraPerf = performance.now();
    // Labels that are over leave the list here (the drawing does not need to).
    let n = 0;
    for (const f of this.flotantes) if (ahoraPerf - f.t0 < f.dur) this.flotantes[n++] = f;
    this.flotantes.length = n;
    const foco = this.foco;
    const activo = foco !== null || n > 0 || this.ordenHasta > 0;
    v.fill(0);
    v[7 + 2 * MAX_FIRMA_FLOT] = this.cartelSuceso ? 1 : 0;
    if (activo) {
      if (foco) {
        v[0] = 1 + Math.round(Math.min(1, (ahoraPerf - foco.t0) / duracionFundido()) * PASOS_FUNDIDO);
        v[1] = Math.floor(ahora / 140) % 2;
      }
      v[2] = this.ordenHasta > 0 && ahoraPerf < this.ordenHasta ? 1 : 0;
      // The idle frames of the sprites change on their own while a spotlight (which redraws only on change) is up.
      for (let j = 0; j < 4; j++) v[3 + j] = reposo(ahora, j * 330);
      for (let i = 0; i < n; i++) {
        const f = this.flotantes[i];
        const p = (ahoraPerf - f.t0) / f.dur;
        const k = Math.min(i, MAX_FIRMA_FLOT - 1);
        v[7 + 2 * k] += 1 + alfaFlotante(p);
        v[8 + 2 * k] += f.tipo === 'num' ? subidaFlotante(p) : 0;
      }
    }
    return this.firma.cambio();
  }

  /** Heights of the field, the tray and the rows for this screen height (see docs/POKEUSERA.md). */
  private geom() {
    const H = pantalla().alto;
    if (H !== this.geomH || !this.geomVal) {
      this.geomH = H;
      this.geomVal = this.calcularGeom(H);
    }
    return this.geomVal;
  }

  private calcularGeom(H: number) {
    const k = Math.max(0, Math.min(1, (H - 384) / 136));
    const hud = 18;
    /** Pitch between the four rows: the sprites may overlap a little on short screens. */
    const P = Math.round(50 + k * 26);
    const y0 = hud + 4;
    const campo = alturaCampo(H);
    const lineas = H < 430 ? 2 : 3;
    const boxH = lineas === 2 ? 40 : 52;
    const yBox = campo + 4;
    const yMenu = yBox + boxH + 4;
    return { H, hud, P, y0, campo, lineas, boxH, yBox, yMenu, menuH: H - yMenu - 4 };
  }

  /** How many lines the text box holds on this screen. */
  private lineasCaja(): number {
    return pantalla().alto < 430 ? 2 : 3;
  }

  /** Top of player j's row (the row's sprite cell). */
  private yFila(j: number): number {
    const G = this.geom();
    if (j === this.yo) return G.y0 + 3 * G.P;
    return G.y0 + Math.max(0, this.rivales().indexOf(j)) * G.P;
  }

  /** The rectangle of player j's row (what the spotlight dims and frames). */
  private filaDe(j: number) {
    const G = this.geom();
    return { y: this.yFila(j) - 2, h: G.P, mia: j === this.yo };
  }

  /** The sprite image of j's active userito (front for rivals, back for me) with its idle frame. */
  private imagen(j: number, ahora: number): HTMLCanvasElement {
    const u = activo(this.disp, j);
    const fr = reposo(ahora, j * 330);
    return j === this.yo ? spriteEspalda2(u.especie, fr) : spriteFrente2(u.especie, fr);
  }

  /** Top-left corner of player j's sprite (every userito stands on the same line, 62 px under the row's top). */
  private posSprite(j: number) {
    const mia = j === this.yo;
    const u = activo(this.disp, j);
    const base = mia ? spriteEspalda2(u.especie, 0) : spriteFrente2(u.especie, 0);
    const top = this.yFila(j);
    return { x: mia ? 20 : 158, y: top + 62 - pieSprite(base), pies: top + 62 };
  }

  dibujar(ctx: CanvasRenderingContext2D, ahora: number) {
    if (!this.disp) return;
    const G = this.geom();
    dibujarFondoEscenario(ctx, this.disp.escenario, G.campo);
    // A tap anywhere on the field moves the text on (registered first: the buttons above it win).
    if (this.modo === 'cola' || this.modo === 'espera') entrada.zona(0, G.hud, ANCHO, G.H - G.hud, () => this.caja.toque());
    // Rows.
    const riv = this.rivales();
    for (let i = 0; i < riv.length; i++) this.filaSprite(ctx, riv[i], ahora);
    this.filaSprite(ctx, this.yo, ahora);
    // The move effects fly over the sprites and under the panels (a bolt or a gust never covers a name or a bar), the numbers, the tray, the text and the top bar.
    if (this.efectos.activo) this.efectos.dibujar(ctx);
    for (let i = 0; i < riv.length; i++) this.fila(ctx, riv[i]);
    this.fila(ctx, this.yo);
    this.dibujarFoco(ctx, ahora);
    this.dibujarEleccionObjetivo(ctx, ahora);
    this.dibujarOrdenGrande(ctx, G);
    this.dibujarFlotantes(ctx);
    this.dibujarSucesos(ctx, G);
    // Bottom area.
    dibujarBandeja(ctx, G.campo, G.H);
    this.zonaInferior(ctx, G, ahora);
    this.hud(ctx, G, ahora);
  }

  private hud(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>, ahora: number) {
    barraArriba(ctx);
    menuIcono(ctx, 7, 5);
    const turno = t('batalla.turno', { n: this.turnoHud });
    texto2(ctx, turno, 28, 6);
    // HISTORIAL: a small button right after the turn.
    const hs = t('batalla.historial');
    const hx = 28 + anchoTexto2(turno) + 8;
    const hw = anchoTexto2(hs) + 10;
    relleno(ctx, TINTA2, hx, 2, hw, 14);
    relleno(ctx, '#f8edd2', hx + 1, 3, hw - 2, 12);
    rect(ctx, '#d6c08a', hx + 2, 13, hw - 4, 1);
    texto2(ctx, hs, hx + 5, 6, TINTA2, null);
    entrada.zona(hx - 2, 0, hw + 4, G.hud, () => void this.abrirHistorial());
    // «?»: the game's guide (types, stats, statuses) over the battle.
    const qs = t('cartel.ayuda');
    const qx = hx + hw + 4;
    const qw = anchoTexto2(qs) + 9;
    relleno(ctx, TINTA2, qx, 2, qw, 14);
    relleno(ctx, '#fbe19a', qx + 1, 3, qw - 2, 12);
    rect(ctx, '#d6a53a', qx + 2, 13, qw - 4, 1);
    texto2(ctx, qs, qx + 4, 6, TINTA2, null);
    entrada.zona(qx - 2, 0, qw + 4, G.hud, () => void abrirGuia(this));
    if (this.puedeVolver) {
      const vx = qx + qw + 8;
      flecha(ctx, vx, 5, -1, TINTA2);
      texto2(ctx, t('batalla.volver'), vx + 9, 6);
      entrada.zona(vx - 3, 0, 56, 19, () => this.accion('atras'));
    }
    if (this.plazoFin > 0) {
      const seg = Math.max(0, Math.ceil((this.plazoFin - Date.now()) / 1000));
      const rojo = seg <= 5;
      if (!rojo || parpadea(ahora, 400)) chipTiempo(ctx, String(seg), rojo);
    }
    this.ordenPequeno(ctx, G);
    entrada.zona(0, 0, 26, G.hud + 3, () => void this.pausar());
  }

  /** The turn's order as little player tiles in the top bar: done ones pale, the one acting framed. */
  private ordenPequeno(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const o = this.orden;
    if (!o || this.plazoFin > 0) return;
    const lado = 14;
    const x0 = ANCHO - 6 - o.lista.length * (lado + 3);
    o.lista.forEach((a, i) => {
      const x = x0 + i * (lado + 3);
      const y = Math.floor((G.hud - 1 - lado) / 2);
      const hecho = i < o.actual || o.actual >= o.lista.length;
      ctx.save();
      if (hecho) ctx.globalAlpha = 0.35;
      ficha(ctx, this.disp.jugadores[a.j].entrenador, x, y, lado);
      ctx.restore();
      if (i === o.actual) {
        rect(ctx, '#ffffff', x - 2, y - 2, lado + 4, 1);
        rect(ctx, '#ffffff', x - 2, y + lado + 1, lado + 4, 1);
        rect(ctx, '#ffffff', x - 2, y - 2, 1, lado + 4);
        rect(ctx, '#ffffff', x + lado + 1, y - 2, 1, lado + 4);
      }
    });
  }

  // ------------------------------------------------------------------ HISTORIAL

  /** The log flattened into drawable lines (with their y in the content), wrapped for a box `ancho` px wide. */
  private lineasHistorial(ancho: number): { lineas: { cab: boolean; s: string; y: number; alt: boolean }[]; total: number } {
    const lineas: { cab: boolean; s: string; y: number; alt: boolean }[] = [];
    let y = 0;
    let alt = false;
    for (const g of this.historial) {
      if (!g.lineas.length) continue;
      if (g.turno > 0) {
        lineas.push({ cab: true, s: t('batalla.turno', { n: g.turno }), y, alt: false });
        y += 15;
      }
      for (const l of g.lineas) {
        for (const w of envolver(l, ancho)) {
          lineas.push({ cab: false, s: w, y, alt });
          y += 12;
        }
        y += 3;
        alt = !alt;
      }
    }
    return { lineas, total: y };
  }

  /** A box with the whole battle so far by turns. Drag or arrows to scroll; a tap outside closes. */
  private abrirHistorial(): Promise<void> {
    sonido.efecto('aceptar');
    return sobre<void>(this, (cerrar) => {
      let scroll = Number.POSITIVE_INFINITY; // starts at the bottom: the latest
      let cache: { version: number } & ReturnType<VistaCombate['lineasHistorial']> | null = null;
      const PASO = 12;
      let x = 0;
      let y = 0;
      let w = 0;
      let h = 0;
      const datos = () => {
        if (!cache || cache.version !== this.versionHistorial) cache = { version: this.versionHistorial, ...this.lineasHistorial(w - 28) };
        return cache;
      };
      const visible = () => h - 30 - 8;
      const maxScroll = () => Math.max(0, datos().total - visible());
      const cierra = () => {
        sonido.efecto('atras');
        cerrar();
      };
      return {
        dibujar: (ctx) => {
          const H = pantalla().alto;
          x = 6;
          y = 22;
          w = ANCHO - 12;
          h = H - 22 - 8;
          oscurecer(ctx, H);
          entrada.zona(0, 0, ANCHO, H, cierra);
          entrada.zona(x, y, w, h, () => undefined);
          panelCacheado(ctx, x, y, w, h);
          const titulo = t('batalla.historial');
          texto2(ctx, titulo, x + 14, y + 11, TINTA_SUAVE);
          rect(ctx, '#d6c08a', x + 10, y + 23, w - 20, 1);
          const { lineas: ls, total } = datos();
          scroll = Math.max(0, Math.min(maxScroll(), scroll));
          const y0 = y + 28;
          ctx.save();
          ctx.beginPath();
          ctx.rect(x + 6, y0, w - 12, visible());
          ctx.clip();
          for (const l of ls) {
            const yy = y0 + l.y - scroll;
            if (yy < y0 - PASO || yy > y0 + visible()) continue;
            if (l.cab) {
              rect(ctx, TINTA2, x + 10, yy - 1, w - 28, 12);
              texto2(ctx, l.s, x + 14, yy + 1, '#fdf0c0', null);
            } else texto2(ctx, l.s, x + 14, yy + 2, l.alt ? TINTA_SUAVE : TINTA2, null);
          }
          ctx.restore();
          // Scroll bar.
          if (total > visible()) {
            const bh = Math.max(10, Math.round((visible() * visible()) / total));
            const by = y0 + Math.round(((visible() - bh) * scroll) / Math.max(1, maxScroll()));
            rect(ctx, '#d6c08a', x + w - 11, y0, 3, visible());
            rect(ctx, TINTA2, x + w - 11, by, 3, bh);
          }
          if (!ls.length) texto2(ctx, '...', x + 14, y0 + 2, '#a898a8');
        },
        accion: (a) => {
          if (a === 'arriba') scroll -= PASO * 3;
          else if (a === 'abajo') scroll += PASO * 3;
          else if (a === 'izq') scroll -= visible();
          else if (a === 'der') scroll += visible();
          else cierra();
          scroll = Math.max(0, Math.min(maxScroll(), scroll));
        },
        arrastre: (_dx, dy) => {
          scroll = Math.max(0, Math.min(maxScroll(), scroll - dy));
        },
      };
    });
  }

  // ------------------------------------------------------------------ the userito's card and the help box

  /** The explanation shown at the bottom of the card for a topic (a status, a stat, the types). */
  private textoTema(tm: Tema): string {
    if (!tm) return t('ficha.toca');
    if (tm.k === 'estado') return t(`ayuda.estado.${tm.e}`);
    if (tm.k === 'objeto') return t(`objeto.${tm.id}.desc`);
    if (tm.k === 'tipos') return t('ayuda.tipos');
    return tm.s === 'prec' ? t('ficha.prec_ayuda') : t(`ayuda.stat.${tm.s}`);
  }

  /**
   * The card of player j's userito: sprite, name, trainer, types, HP, status (tap it for what it means), stat stages,
   * the five base stats (tap one) and, for a rival, how each of MY active userito's moves would do on it.
   */
  private abrirFicha(j: number, tema0: Tema = null): Promise<void> {
    sonido.efecto('aceptar');
    const q = this.disp.jugadores[j];
    const u = activo(this.disp, j);
    const sp = ESPECIE[u.especie];
    const mio = j === this.yo;
    const mi = activo(this.real, this.yo);
    const contra = !mio && !eliminado(this.real, this.yo) && mi.ps > 0;
    let tema: Tema = tema0 ?? (u.estado ? { k: 'estado', e: u.estado } : u.achispado > 0 ? { k: 'estado', e: 'achispado' } : null);
    return sobre<void>(this, (cerrar) => {
      let scroll = 0;
      let maxScroll = 0;
      let alto = 0;
      const cierra = () => {
        sonido.efecto('atras');
        cerrar();
      };
      const elige = (tm: Tema) => {
        tema = tm;
        sonido.efecto('cursor');
      };
      const mismo = (a: Tema, b: Tema) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
      return {
        dibujar: (ctx, ahora) => {
          const H = pantalla().alto;
          const x = 6;
          const y = 16;
          const w = ANCHO - 12;
          const h = H - y - 8;
          oscurecer(ctx, H);
          entrada.zona(0, 0, ANCHO, H, cierra);
          entrada.zona(x, y, w, h, () => undefined);
          panelCacheado(ctx, x, y, w, h);
          const x0 = x + 10;
          const wi = w - 20;
          // Fixed at the bottom: CERRAR and the explanation of the topic being looked at.
          const bh = 22;
          const yb = y + h - 8 - bh;
          const lineasT = envolver(this.textoTema(tema), wi - 10);
          const hT = Math.max(2, lineasT.length) * 12 + 8;
          const yT = yb - 4 - hT;
          relleno(ctx, TINTA2, x0, yT, wi, hT);
          relleno(ctx, '#fdf6e2', x0 + 1, yT + 1, wi - 2, hT - 2);
          lineasT.forEach((l, i) => texto2(ctx, l, x0 + 5, yT + 5 + i * 12, TINTA2, null));
          boton(ctx, x0, yb, wi, bh, t('ficha.cerrar'), true);
          entrada.zona(x0, yb, wi, bh, cierra);
          // The scrolling part.
          const top = y + 8;
          const bottom = yT - 4;
          const zonaC = (zx: number, zy: number, zw: number, zh: number, fn: () => void) => {
            const y1 = Math.max(top, zy);
            const y2 = Math.min(bottom, zy + zh);
            if (y2 > y1) entrada.zona(zx, y1, zw, y2 - y1, fn);
          };
          ctx.save();
          ctx.beginPath();
          ctx.rect(x + 3, top, w - 6, bottom - top);
          ctx.clip();
          let cy = top - scroll;
          // Sprite on its mat, and the identity at its right.
          const mat = plataformaCacheada(30, 7);
          ctx.drawImage(mat, x0 + 32 - Math.floor(mat.width / 2), cy + 2 + 49);
          ctx.drawImage(spriteFrente2(u.especie, reposo(ahora)), x0, cy + 2);
          const x1 = x0 + 70;
          const nw = wi - 70;
          if (anchoTexto2(sp.nombre) * 2 <= nw) textoGrande(ctx, sp.nombre, x1, cy + 3, TINTA2, 2);
          else texto2(ctx, recortar(sp.nombre, nw), x1, cy + 5);
          ficha(ctx, q.entrenador, x1, cy + 21, 14);
          texto2(ctx, recortar(q.nombre.toUpperCase(), nw - 18 - 30), x1 + 18, cy + 25, colorEntOsc(q.entrenador));
          const asiento = Math.max(0, ENTRENADORES.indexOf(q.entrenador));
          const nVivos = q.equipo.filter((e) => e.ps > 0).length;
          for (let i = 0; i < 3; i++) pip(ctx, x1 + nw - 27 + i * 9, cy + 23, i < nVivos, JUGADORES2[asiento].base);
          let bx = x1;
          for (const tp of sp.tipos) bx += insignaTipo(ctx, tp, bx, cy + 40) + 3;
          zonaC(x1, cy + 38, nw, 15, () => elige({ k: 'tipos' }));
          barraPS2(ctx, x1, cy + 55, nw, u.ps / u.psMax);
          zonaC(x1, cy + 53, nw, 13, () => elige({ k: 'stat', s: 'ps' }));
          const nums = mio ? `${u.ps}/${u.psMax}` : `${Math.ceil((u.ps / u.psMax) * 100)}%`;
          if (u.ps > 0) texto2(ctx, nums, x1 + nw - anchoTexto2(nums), cy + 66, TINTA_SUAVE, null);
          else texto2(ctx, t('ficha.cae'), x1, cy + 66, TINTA_SUAVE, null);
          cy += 78;
          // Status.
          texto2(ctx, t('ficha.estado'), x0, cy + 3, TINTA_SUAVE, null);
          let ex = x0 + 52;
          const estados: (Estado | 'achispado')[] = [];
          if (u.estado) estados.push(u.estado);
          if (u.achispado > 0) estados.push('achispado');
          if (!estados.length) texto2(ctx, t('ficha.sin_estado'), ex, cy + 3, TINTA2, null);
          for (const e of estados) {
            const ew = etiquetaEstado(ctx, e, ex, cy + 1);
            if (mismo(tema, { k: 'estado', e })) rect(ctx, TINTA2, ex, cy + 13, ew, 2);
            zonaC(ex - 2, cy - 2, ew + 4, 17, () => elige({ k: 'estado', e }));
            ex += ew + 4;
          }
          cy += 18;
          // The object it carries (yours always; a rival's once it has worked): tap it for what it does.
          const ob = this.objetoVisible(j, u);
          if (ob) {
            texto2(ctx, t('ficha.objeto'), x0, cy + 3, TINTA_SUAVE, null);
            const sel = mismo(tema, { k: 'objeto', id: ob.id });
            ctx.drawImage(iconoObjeto(ob.id, ob.gastado === true), x0 + 52, cy);
            const nom = t(`objeto.${ob.id}.nombre`);
            texto2(ctx, nom, x0 + 68, cy + 3, ob.gastado ? '#a898a8' : TINTA2, null);
            if (sel) rect(ctx, TINTA2, x0 + 68, cy + 13, anchoTexto2(nom), 2);
            const uso = t(ob.gastado ? 'objeto.gastado' : OBJETO_PERMANENTE[ob.id] ? 'objeto.perm' : 'objeto.unico');
            texto2(ctx, uso, x0 + wi - anchoTexto2(uso), cy + 3, TINTA_SUAVE, null);
            zonaC(x0 + 48, cy - 2, wi - 48, 17, () => elige({ k: 'objeto', id: ob.id }));
            cy += 18;
          }
          // Stat stages.
          const cambios = (['ata', 'def', 'esp', 'vel', 'prec'] as Stat[]).filter((s) => u.niveles[s] !== 0);
          if (cambios.length) {
            texto2(ctx, t('ficha.niveles'), x0, cy + 3, TINTA_SUAVE, null);
            let cx = x0 + 52;
            for (const s of cambios) {
              const n = u.niveles[s];
              const rot = `${t(`ficha.stat.${s}`)} ${n > 0 ? '+' : ''}${n}`;
              const rw = anchoTexto2(rot) + 8;
              relleno(ctx, TINTA2, cx, cy + 1, rw, 11);
              relleno(ctx, n > 0 ? '#3f9e45' : '#d4503c', cx + 1, cy + 2, rw - 2, 9);
              texto2(ctx, rot, cx + 4, cy + 3, '#fff8e8', null);
              zonaC(cx - 1, cy - 1, rw + 2, 15, () => elige({ k: 'stat', s }));
              cx += rw + 3;
            }
            cy += 18;
          }
          // The five base stats.
          rect(ctx, '#d6c08a', x0, cy + 2, wi, 1);
          texto2(ctx, t('ficha.stats'), x0, cy + 7, TINTA_SUAVE, null);
          cy += 19;
          for (const s of ['ps', 'ata', 'def', 'esp', 'vel'] as const) {
            const sel = mismo(tema, { k: 'stat', s });
            if (sel) flecha(ctx, x0 - 1, cy, 1, TINTA2);
            texto2(ctx, t(`ficha.stat.${s}`), x0 + 7, cy, sel ? TINTA2 : TINTA_SUAVE, null);
            barraValor(ctx, x0 + 36, cy, wi - 74, Math.min(sp.base[s], 150) / 150, COLOR_TIPO[sp.tipos[0]]);
            texto2(ctx, String(sp.base[s]), x0 + wi - 30, cy, TINTA2, null);
            zonaC(x0, cy - 3, wi, 13, () => elige({ k: 'stat', s }));
            cy += 13;
          }
          cy += 4;
          // For a rival: what each of my moves does to it.
          if (contra) {
            rect(ctx, '#d6c08a', x0, cy + 2, wi, 1);
            texto2(ctx, t('ficha.contra'), x0, cy + 7, TINTA_SUAVE, null);
            cy += 19;
            for (const id of ESPECIE[mi.especie].movs) {
              const m = MOVS[id];
              chipTipo(ctx, m.tipo, x0, cy - 2);
              const ef = m.pot === null ? null : eficacia(m.tipo, sp.tipos);
              let rw = 0;
              if (ef === null) {
                const s = t('ficha.sin_dano');
                rw = anchoTexto2(s);
                texto2(ctx, s, x0 + wi - rw, cy, '#a898a8', null);
              } else {
                const r = this.rotuloEficacia(ef, true);
                rw = anchoTexto2(r.s) + 8;
                relleno(ctx, TINTA2, x0 + wi - rw, cy - 2, rw, 11);
                relleno(ctx, r.bg, x0 + wi - rw + 1, cy - 1, rw - 2, 9);
                texto2(ctx, r.s, x0 + wi - rw + 4, cy, r.fg, null);
              }
              const clase = clasePrioridad(m.prioridad);
              if (clase) ctx.drawImage(iconoPrioridad(clase), x0 + wi - rw - LADO_ICONO_PRIO - 4, cy - 1);
              texto2(ctx, recortar(m.nombre, wi - 30 - rw - 4 - (clase ? LADO_ICONO_PRIO + 4 : 0)), x0 + 28, cy, TINTA2, null);
              cy += 14;
            }
          }
          ctx.restore();
          alto = cy + scroll - top + 2;
          maxScroll = Math.max(0, alto - (bottom - top));
          scroll = Math.max(0, Math.min(maxScroll, scroll));
          if (maxScroll > 0) {
            const vis = bottom - top;
            const bh2 = Math.max(10, Math.round((vis * vis) / alto));
            const by = top + Math.round(((vis - bh2) * scroll) / maxScroll);
            rect(ctx, '#d6c08a', x + w - 7, top, 3, vis);
            rect(ctx, TINTA2, x + w - 7, by, 3, bh2);
          }
        },
        accion: (a) => {
          if (a === 'arriba') scroll -= 24;
          else if (a === 'abajo') scroll += 24;
          else cierra();
          scroll = Math.max(0, Math.min(maxScroll, scroll));
        },
        arrastre: (_dx, dy) => {
          scroll = Math.max(0, Math.min(maxScroll, scroll - dy));
        },
      };
    });
  }

  // ------------------------------------------------------------------ the spotlight

  /** Where the beer mat of j's sprite sits (centre and radii), for the actor's glow. */
  private matDe(j: number) {
    const mia = j === this.yo;
    const { pies } = this.posSprite(j);
    const mat = mia ? plataformaCacheada(42, 10) : plataformaCacheada(30, 7);
    const cx = mia ? 52 : 190;
    return { cx, cy: pies - 3 - (mia ? 14 : 10) + Math.floor(mat.height / 2) - 3, rx: Math.floor(mat.width / 2) - 2, ry: Math.floor(mat.height / 2) - 4 };
  }

  /** The box (screen px) a userito's sprite really fills, with the lunge offset. */
  private cajaDe(j: number) {
    const u = activo(this.disp, j);
    const base = j === this.yo ? spriteEspalda2(u.especie, 0) : spriteFrente2(u.especie, 0);
    const c = cajaSprite(base);
    const { x, y } = this.posSprite(j);
    const dy = this.fx[j]?.saltoY ?? 0;
    return { x0: x + c.x0, y0: y + c.y0 + dy, x1: x + c.x1, y1: y + c.y1 + dy };
  }

  /** Pulsing corner brackets hugging a target's sprite: `color` with a dark edge so they read on any background. */
  private marcaObjetivo(ctx: CanvasRenderingContext2D, j: number, color: string, ahora: number, pulsa = true) {
    const fase = pulsa ? Math.floor(ahora / 140) % 2 : 0;
    const c = this.cajaDe(j);
    const x0 = c.x0 - 4 - fase;
    const x1 = c.x1 + 4 + fase;
    const y0 = c.y0 - 4 - fase;
    const y1 = c.y1 + 4 + fase;
    this.esquina(ctx, color, x0, y0, 1, 1);
    this.esquina(ctx, color, x1 - 1, y0, -1, 1);
    this.esquina(ctx, color, x0, y1 - 1, 1, -1);
    this.esquina(ctx, color, x1 - 1, y1 - 1, -1, -1);
  }

  /** One corner of the brackets: a baked piece (four rectangles' worth of fills in one blit); drawn directly when the position is not on whole pixels. */
  private esquina(ctx: CanvasRenderingContext2D, color: string, cx: number, cy: number, dx: 1 | -1, dy: 1 | -1) {
    if (pegable(ctx, cx, cy)) ctx.drawImage(esquinaCacheada(color, dx, dy), cx - ORIGEN_ESQ, cy - ORIGEN_ESQ);
    else trazarEsquina(ctx, color, cx, cy, dx, dy);
  }

  private dibujarFoco(ctx: CanvasRenderingContext2D, ahora: number) {
    const f = this.foco;
    if (!f) return;
    // In steps, like `firmaFoco` (the redraw is asked for when a step changes).
    const a = Math.round(Math.min(1, (performance.now() - f.t0) / duracionFundido()) * PASOS_FUNDIDO) / PASOS_FUNDIDO;
    const colorActor = f.actor >= 0 ? colorEnt(this.disp.jugadores[f.actor].entrenador) : null;
    // Dim the rows that have nothing to do with it.
    for (let j = 0; j < this.disp.jugadores.length; j++) {
      if (j === f.actor || f.objetivos.includes(j)) continue;
      const { y, h } = this.filaDe(j);
      veloCrema(ctx, 0, y, ANCHO, h, 0.42 * a);
    }
    // The actor: its mat glows in its trainer's colour.
    if (f.actor >= 0 && colorActor && !this.fx[f.actor].oculto) {
      const m = this.matDe(f.actor);
      ctx.drawImage(anilloCacheado(m.rx, m.ry, colorActor), m.cx - m.rx - 1, m.cy - m.ry);
    }
    // The targets: pulsing brackets in the actor's colour (end-of-turn effects: cream).
    for (const j of f.objetivos) {
      if (this.fx[j].oculto && this.fx[j].caida === 0) continue;
      this.marcaObjetivo(ctx, j, colorActor ?? '#fdf6e4', ahora);
    }
  }

  // ---- the action banner

  /** A thick arrow (→) of `ancho` px in `color` with a dark edge, 11 px tall. */
  private flechaCartel(ctx: CanvasRenderingContext2D, x: number, y: number, ancho: number, color: string) {
    const cabeza = 6;
    const cuerpo = Math.max(2, ancho - cabeza);
    rect(ctx, TINTA2, x - 1, y + 3, cuerpo + 2, 5);
    for (let i = 0; i < cabeza; i++) rect(ctx, TINTA2, x + cuerpo + i, y + i - 1, 1, 13 - 2 * i);
    rect(ctx, TINTA2, x + cuerpo + cabeza, y + cabeza - 1, 1, 1);
    rect(ctx, color, x, y + 4, cuerpo + 1, 3);
    for (let i = 0; i < cabeza; i++) rect(ctx, color, x + cuerpo + i, y + i, 1, 11 - 2 * i);
  }

  /** «Who ▶ who, with which move», one strip under the text box (see `zonaInferior`): face and name of the attacker, an arrow, the targets; the move on a badge of its type. */
  private cartel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
    const f = this.foco;
    if (!f || !f.mov || f.actor < 0) return;
    const m = MOVS[f.mov];
    if (!m) return;
    const jug = this.disp.jugadores[f.actor];
    const col = colorEnt(jug.entrenador);
    const quien = ESPECIE[this.userito(f.actor).especie].nombre;
    panelCacheado(ctx, x, y, w, ALTO_CARTEL);
    // Row 1: the attacker's tile and the userito's name ... arrow ... the targets.
    const y1 = y + 5;
    ficha(ctx, jug.entrenador, x + 7, y1, 18);
    const nombre = recortar(quien, 70);
    texto2(ctx, nombre, x + 29, y1 + 6);
    // Targets, right-aligned.
    const xFin = x + w - 8;
    let xT = xFin;
    if (f.destino === 'caras') {
      const caras = f.objetivos.filter((j) => j !== f.actor);
      xT = xFin - caras.length * 20 + 2;
      caras.forEach((j, i) => ficha(ctx, this.disp.jugadores[j].entrenador, xT + i * 20, y1, 18));
    } else {
      const s = t(f.destino === 'todos' ? 'cartel.todos' : 'cartel.el_mismo');
      const cw = anchoTexto2(s) + 10;
      xT = xFin - cw;
      relleno(ctx, TINTA2, xT, y1 + 2, cw, 14);
      relleno(ctx, f.destino === 'todos' ? '#e0a83a' : '#8fc77a', xT + 1, y1 + 3, cw - 2, 12);
      rect(ctx, 'rgba(255,255,255,0.4)', xT + 2, y1 + 3, cw - 4, 1);
      texto2(ctx, s, xT + 5, y1 + 6, TINTA2, null);
    }
    // The arrow fills the gap between the name and the targets.
    const xA = x + 29 + anchoTexto2(nombre) + 6;
    const largo = xT - 6 - xA;
    if (largo >= 8) this.flechaCartel(ctx, xA, y1 + 3, Math.min(largo, 60), col);
    // Row 2: the move on a badge of its type's colour.
    const y2 = y + ALTO_CARTEL - 4 - 11 - 2;
    const rotulo = recortar(m.nombre.toUpperCase(), w - 36);
    const bw = anchoTexto2(rotulo) + 14;
    insignaTipo(ctx, m.tipo, x + Math.floor((w - bw) / 2), y2, bw, rotulo);
  }

  // ---- the big «ORDEN DEL TURNO» strip

  private dibujarOrdenGrande(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const o = this.orden;
    if (!o || this.ordenHasta === 0) return;
    const ahora = performance.now();
    if (ahora > this.ordenHasta) return;
    const n = o.lista.length;
    const x = 4;
    const w = ANCHO - 8;
    const h = 70;
    const y = G.hud + 4;
    panelCacheado(ctx, x, y, w, h);
    const titulo = t('batalla.orden');
    texto2(ctx, titulo, Math.floor((ANCHO - anchoTexto2(titulo)) / 2), y + 9, TINTA_SUAVE);
    const cw = Math.floor((w - 8) / n);
    o.lista.forEach((a, i) => {
      const cx = x + 4 + i * cw;
      const cy = y + 20;
      const jug = this.disp.jugadores[a.j];
      // The userito, the player tile, the place in the order and the name.
      ctx.drawImage(miniatura(a.especie), cx + 1, cy);
      ficha(ctx, jug.entrenador, cx + cw - 20, cy, 18);
      relleno(ctx, TINTA2, cx, cy, 10, 12);
      texto2(ctx, String(i + 1), cx + 3, cy + 2, '#fdf0c0', null);
      texto2(ctx, recortar(ESPECIE[a.especie].nombre, cw - 3), cx + 1, cy + 36, TINTA2, null);
    });
  }

  // ---- the sucesos of the bar: the big banner when one starts, the chips while it lasts

  private dibujarSucesos(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    // The chips of the sucesos that last, along the bottom of the field; a tap explains one (when the cards are available).
    let x = 6;
    for (const sc of this.disp.sucesos) {
      const img = chapaSucesoImg(sc.id, sc.turnos);
      const y = G.campo - ALTO_CHAPA - 1;
      ctx.drawImage(img, x, y);
      if (this.infoPosible) {
        const id = sc.id;
        const turnos = sc.turnos;
        entrada.zona(x - 2, y - 4, img.width + 4, ALTO_CHAPA + 8, () => void this.abrirSuceso(id, turnos));
      }
      x += img.width + 4;
    }
    // The banner of the one being announced, in the middle of the field.
    if (this.cartelSuceso) {
      const y = G.hud + Math.max(4, Math.floor((G.campo - G.hud - ALTO_CARTEL_SUCESO) / 2));
      ctx.drawImage(cartelSucesoImg(this.cartelSuceso), Math.floor((ANCHO - ANCHO_CARTEL_SUCESO) / 2), y);
    }
  }

  /** The card of a suceso (tap its chip): its name, how long it has left and what it does. */
  private abrirSuceso(id: SucesoId, turnos: number): Promise<void> {
    sonido.efecto('aceptar');
    return sobre<void>(this, (cerrar) => {
      const cierra = () => {
        sonido.efecto('atras');
        cerrar();
      };
      return {
        dibujar: (ctx) => {
          const H = pantalla().alto;
          const w = ANCHO - 24;
          const x = 12;
          const nombre = t(`suceso.${id}.nombre`).toUpperCase();
          const desc = envolver(t(`suceso.${id}.desc`), w - 24);
          const resta = turnos > 1 ? t('suceso.resta', { n: turnos }) : t('suceso.resta1');
          const h = 16 + 16 + 16 + desc.length * 12 + 10 + 22 + 12;
          const y = Math.max(20, Math.round((H - h) / 2));
          oscurecer(ctx, H);
          entrada.zona(0, 0, ANCHO, H, cierra);
          entrada.zona(x, y, w, h, () => undefined);
          panelCacheado(ctx, x, y, w, h);
          texto2(ctx, t('suceso.titulo'), x + 12, y + 11, TINTA_SUAVE, null);
          const dos = anchoTexto2(nombre) * 2 <= w - 24;
          if (dos) textoGrande(ctx, nombre, x + 12, y + 24, TINTA2, 2);
          else texto2(ctx, recortar(nombre, w - 24), x + 12, y + 27);
          let yy = y + 46;
          texto2(ctx, resta, x + 12, yy, colorAyuda, null);
          yy += 16;
          rect(ctx, '#d6c08a', x + 10, yy - 4, w - 20, 1);
          desc.forEach((l, i) => texto2(ctx, l, x + 12, yy + 2 + i * 12, TINTA2, null));
          const bh = 22;
          const by = y + h - 10 - bh;
          boton(ctx, x + 10, by, w - 20, bh, t('suceso.cerrar'), true);
          entrada.zona(x + 10, by, w - 20, bh, cierra);
        },
        accion: () => cierra(),
      };
    });
  }

  // ---- floating numbers and tags

  private dibujarFlotantes(ctx: CanvasRenderingContext2D) {
    const ahora = performance.now();
    // Drop the finished ones in place (no new array every frame).
    let n = 0;
    for (const f of this.flotantes) if (ahora - f.t0 < f.dur) this.flotantes[n++] = f;
    this.flotantes.length = n;
    if (!n) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const f of this.flotantes) {
      const p = (ahora - f.t0) / f.dur;
      const sp = this.posSprite(f.j);
      ctx.globalAlpha = alfaFlotante(p) / 16;
      const w = f.img.width - 2;
      if (f.tipo === 'num') {
        const wn = w * 2;
        const sube = subidaFlotante(p);
        const x = Math.max(2, Math.min(ANCHO - wn - 2, sp.x + Math.floor((LADO - wn) / 2)));
        const y = sp.y + 22 - sube;
        // The label is baked with a 1 px margin (outline) at 1x and drawn at 2x.
        ctx.drawImage(f.img, (Math.round(x / 2) - 1) * 2, (Math.round(y / 2) - 3) * 2, f.img.width * 2, f.img.height * 2);
        if (f.acorr) {
          const chip = chipAcorralado();
          ctx.drawImage(chip, Math.round(x + (wn - chip.width) / 2), y + 17);
        }
      } else {
        const x = Math.max(2, Math.min(ANCHO - w - 2, sp.x + Math.floor((LADO - w) / 2)));
        const y = sp.pies - 18 - f.hueco * 12;
        ctx.drawImage(f.img, x - 1, y - 3);
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ rows

  /** The panel plate of a row (frame, band with the trainer's initial, trainer name), baked once per seat. */
  private placas: ({ nombre: string; c: HTMLCanvasElement } | undefined)[] = [];
  private placa(asiento: number, nombre: string, mia: boolean): HTMLCanvasElement {
    // Asked for by every row on every frame: remembered by seat, so no key string is built each time.
    const i = asiento * 2 + (mia ? 1 : 0);
    const p = this.placas[i];
    if (p && p.nombre === nombre) return p.c;
    const c = this.hornearPlaca(asiento, nombre, mia);
    this.placas[i] = { nombre, c };
    return c;
  }

  private hornearPlaca(asiento: number, nombre: string, mia: boolean): HTMLCanvasElement {
    const w = mia ? 134 : 128;
    const h = mia ? 52 : 40;
    const ini = (nombre[0] ?? '?').toUpperCase();
    return hornear(`placa|${mia ? 1 : 0}|${asiento}|${nombre}`, w, h + 2, (cx) => {
      panel(cx, 0, 0, w, h);
      bandaEntrenador(cx, 4, 4, h - 8, asiento, ini);
      texto2(cx, nombre.toUpperCase(), 18, 30, JUGADORES2[asiento].oscuro, SOMBRA_TEXTO);
    });
  }

  /** A row in two layers: its mat and sprite (`filaSprite`), then the effects of the moves fly, then its panel and tags (`fila`). */
  private filaSprite(ctx: CanvasRenderingContext2D, j: number, ahora: number) {
    const q = this.disp.jugadores[j];
    const mia = j === this.yo;
    const f = this.fx[j];
    const { x: sx, y: sy, pies } = this.posSprite(j);
    // The beer-mat platform under the sprite.
    const mat = mia ? plataformaCacheada(42, 10) : plataformaCacheada(30, 7);
    const cxm = mia ? 52 : 190;
    ctx.drawImage(mat, cxm - Math.floor(mat.width / 2), pies - 3 - (mia ? 14 : 10));
    if (!f.oculto && (!q.puesto || f.caida > 0)) this.sprite(ctx, j, sx, sy, pies, mia, ahora);
  }

  private fila(ctx: CanvasRenderingContext2D, j: number) {
    const G = this.geom();
    const q = this.disp.jugadores[j];
    const mia = j === this.yo;
    const f = this.fx[j];
    const u = activo(this.disp, j);
    const asiento = Math.max(0, ENTRENADORES.indexOf(q.entrenador));
    const top = this.yFila(j);
    const { x: sx, y: sy } = this.posSprite(j);
    // Panel.
    const w = mia ? 134 : 128;
    const px = mia ? 102 : 6;
    const py = top + (mia ? 8 : Math.max(4, Math.min(11, G.P - 41)));
    const h = mia ? 52 : 40;
    ctx.drawImage(this.placa(asiento, q.nombre, mia), px, py);
    const sp = ESPECIE[u.especie];
    texto2(ctx, sp.nombre, px + 18, py + 7);
    // The types, as chips at the right of the name (little squares of colour when the name is long).
    this.chipsTipos(ctx, sp.tipos, px + 18 + anchoTexto2(sp.nombre) + 5, px + w - 8, py + 5);
    barraPS2(ctx, px + 17, py + 18, w - 17 - 9, f.ps / u.psMax);
    // Tap the panel or the sprite for the userito's card (not while a target is being picked or a text is running).
    const info = this.infoPosible && !f.oculto && !q.puesto;
    if (info) {
      entrada.zona(sx + 4, sy + 6, LADO - 8, LADO - 8, () => void this.abrirFicha(j));
      entrada.zona(px, py, w, h, () => void this.abrirFicha(j));
    }
    // Pips: the jars still standing.
    let vivos = 0;
    for (const e of q.equipo) if (e.ps > 0) vivos++;
    // Status tags: next to the trainer's name.
    const ey = py + (mia ? 29 : 29);
    let ex = px + 18 + anchoNombre(q.nombre) + 6;
    const obj = this.objetoVisible(j, u);
    if (mia) {
      const nums = this.numerosPS(f, u.psMax);
      texto2(ctx, nums, px + w - 8 - anchoTexto2(nums), py + 30);
      pipsFila(ctx, px + 18, py + 40, vivos, JUGADORES2[asiento].base);
      ex = px + 18 + 3 * 9 + 6;
      if (u.estado) ex += this.etiqueta(ctx, j, u.estado, ex, py + 39, info) + 2;
      if (u.achispado > 0) this.etiqueta(ctx, j, 'achispado', ex, py + 39, info);
      // The object carried, at the right end of the last line.
      if (obj) ctx.drawImage(iconoObjeto(obj.id, obj.gastado === true), px + w - 8 - LADO_ICONO_OBJETO, py + 38);
    } else {
      // The tags go after the trainer's name; the jars (pips) sit at the right, and give way when two tags do not fit beside them.
      const e1: Estado | 'achispado' | null = u.estado;
      const e2: 'achispado' | null = u.achispado > 0 ? 'achispado' : null;
      const anchoTags = (e1 ? anchoEstado(e1) + 8 : 0) + (e2 ? anchoEstado(e2) + 8 : 0);
      // The object (once it has worked) takes the right end of the line, the jars go left of it.
      const xPips = px + w - 8 - 3 * 9 + 1 - (obj ? LADO_ICONO_OBJETO + 3 : 0);
      const conPips = ex + anchoTags <= xPips - 2;
      if (conPips) pipsFila(ctx, xPips, py + 29, vivos, JUGADORES2[asiento].base);
      if (obj) ctx.drawImage(iconoObjeto(obj.id, obj.gastado === true), px + w - 8 - LADO_ICONO_OBJETO + 1, py + 26);
      const lim = conPips ? xPips - 2 : px + w - 6;
      if (e1 && ex + anchoEstado(e1) + 6 <= lim) ex += this.etiqueta(ctx, j, e1, ex, ey - 1, info) + 2;
      if (e2 && ex + anchoEstado(e2) + 6 <= lim) ex += this.etiqueta(ctx, j, e2, ex, ey - 1, info) + 2;
    }
    // Eliminated: greyed with the place.
    const filaR = this.filaDe(j);
    if (f.velo > 0) {
      veloCrema(ctx, 0, filaR.y, ANCHO, filaR.h, 0.62 * f.velo);
      if (q.puesto > 0) {
        ctx.save();
        ctx.globalAlpha = f.velo;
        const s = `${q.puesto}.º`;
        const tw = anchoTexto2(s) * 3;
        textoGrande(ctx, s, mia ? 52 - Math.floor(tw / 2) : 190 - Math.floor(tw / 2), top + 20, '#fff6e0', 3, TINTA2);
        ctx.restore();
      }
    }
    // Target selection: the whole row is the tap zone (the brackets and the effectiveness tag come after all the rows).
    if ((this.modo === 'objetivo' || this.modo === 'gradaObj') && this.objetivosPosibles.includes(j)) {
      entrada.zona(0, filaR.y, ANCHO, filaR.h, () => {
        this.sel = this.objetivosPosibles.indexOf(j);
        this.elegirObjetivo(j);
      });
    }
  }

  /** «HP/max» of the player's own panel, rebuilt only when the number shown changes. */
  private numsPS = { ps: -1, max: -1, s: '' };
  private numerosPS(f: Fx, psMax: number): string {
    const ps = Math.ceil(f.ps);
    const n = this.numsPS;
    if (n.ps !== ps || n.max !== psMax) {
      n.ps = ps;
      n.max = psMax;
      n.s = `${ps}/${psMax}`;
    }
    return n.s;
  }

  /** A status tag that opens its explanation when tapped (when the info is available). Returns its width. */
  private etiqueta(ctx: CanvasRenderingContext2D, j: number, e: Estado | 'achispado', x: number, y: number, tocable: boolean): number {
    const w = etiquetaEstado(ctx, e, x, y);
    if (tocable) entrada.zona(x - 2, y - 3, w + 4, 17, () => void this.abrirFicha(j, { k: 'estado', e }));
    return w;
  }

  /** The type chips of a userito, right-aligned to `xMax`: short names, or bare colour squares when there is no room. */
  private chipsTipos(ctx: CanvasRenderingContext2D, tipos: readonly Tipo[], xMin: number, xMax: number, y: number) {
    const a = anchosChips(tipos);
    let solo = false;
    if (xMax - a.largo < xMin) solo = true;
    if (xMax - a.corto < xMin) return;
    const ancho = solo ? a.corto : a.largo;
    const x = xMax - ancho;
    if (!pegable(ctx, x, y)) {
      let xx = x;
      for (const tp of tipos) xx += chipTipo(ctx, tp, xx, y, solo) + 2;
      return;
    }
    const clave = `${tipos.join('|')}|${solo ? 1 : 0}`;
    let c = tirasChips.get(clave);
    if (!c) {
      c = document.createElement('canvas');
      c.width = ancho;
      c.height = ALTO_INSIGNIA;
      const cx = c.getContext('2d')!;
      let xx = 0;
      for (const tp of tipos) xx += chipTipo(cx, tp, xx, 0, solo) + 2;
      tirasChips.set(clave, c);
    }
    ctx.drawImage(c, x, y);
  }

  /** The brackets of the target choice and, for a damaging move, how it does on each rival (over its sprite's feet). */
  private dibujarEleccionObjetivo(ctx: CanvasRenderingContext2D, ahora: number) {
    if (this.modo !== 'objetivo' && this.modo !== 'gradaObj') return;
    const m = this.modo === 'objetivo' ? MOVS[this.idMovElegido()] : null;
    this.objetivosPosibles.forEach((j, i) => {
      const marcado = this.objetivosPosibles[this.sel] === j;
      const col = colorEnt(this.disp.jugadores[j].entrenador);
      this.marcaObjetivo(ctx, j, marcado && !parpadea(ahora, 260) ? '#fff8e8' : col, ahora, marcado);
      void i;
      if (!m) return;
      const ef = this.eficaciaContra(m.id, j);
      if (ef === null || ef === 1) return;
      const { s, bg, fg } = this.rotuloEficacia(ef);
      const w = anchoTexto2(s) + 8;
      const c = this.cajaDe(j);
      const xx = Math.min(ANCHO - w - 2, Math.max(2, Math.floor((c.x0 + c.x1 - w) / 2)));
      const yy = c.y1 - 15;
      relleno(ctx, TINTA2, xx, yy, w, 13);
      relleno(ctx, bg, xx + 1, yy + 1, w - 2, 11);
      rect(ctx, 'rgba(255,255,255,0.35)', xx + 2, yy + 1, w - 4, 1);
      texto2(ctx, s, xx + 4, yy + 3, fg, null);
    });
  }

  /** The id of the move chosen for the target step. */
  private idMovElegido(): string {
    const u = activo(this.real, this.yo);
    return movsDisponibles(this.real, this.yo).some(Boolean) ? ESPECIE[u.especie].movs[this.movElegido] : DESESPERADA;
  }

  /** How much the move does on player j's active userito: null for a move that does no damage. */
  private eficaciaContra(id: string, j: number): number | null {
    const m = MOVS[id];
    if (!m || m.pot === null) return null;
    return eficacia(m.tipo, ESPECIE[activo(this.real, j).especie].tipos);
  }

  /** The words and colours of an effectiveness (×2, ×1/2, ×0...). */
  private rotuloEficacia(ef: number, corto = false): { s: string; bg: string; fg: string } {
    const n = (x: number) => (x >= 1 ? String(x) : `1/${Math.round(1 / x)}`);
    if (ef === 0) return { s: t(corto ? 'cartel.ef.corto_nada' : 'cartel.ef.nada'), bg: '#9a8aa0', fg: '#fff8e8' };
    if (ef > 1) return { s: t(corto ? 'cartel.mult' : 'cartel.ef.mas', { n: n(ef) }), bg: '#3f9e45', fg: '#fff8e8' };
    if (ef < 1) return { s: t(corto ? 'cartel.mult' : 'cartel.ef.menos', { n: n(ef) }), bg: '#e8862a', fg: TINTA2 };
    return { s: t('cartel.mult', { n: '1' }), bg: '#d6c08a', fg: TINTA2 };
  }

  private sprite(ctx: CanvasRenderingContext2D, j: number, x: number, y: number, pies: number, mia: boolean, ahora: number) {
    const f = this.fx[j];
    const img = this.imagen(j, ahora);
    if (f.parpadeo > 0 && Math.floor(f.parpadeo / 80) % 2 === 0) return;
    const dx = x + f.salto;
    if (f.chapa >= 0 && f.alza < 1) {
      // Rising out of the cap, bottom first.
      const alto = Math.max(1, Math.round(LADO * f.alza));
      if (f.alza > 0) ctx.drawImage(img, 0, LADO - alto, LADO, alto, dx, y + LADO - alto, LADO, alto);
      const p = f.chapa;
      const cx = dx + 22;
      const cy = Math.round(pies - 20 - Math.max(0, p - 0.4) * 60);
      if (p < 0.8) {
        ctx.drawImage(chapaImg(), cx, cy);
        if (p < 0.4) {
          ctx.save();
          ctx.globalAlpha = 0.8 * (1 - p / 0.4);
          rect(ctx, '#ffffff', dx + 6, y + 14, 52, 46);
          ctx.restore();
        }
      }
      return;
    }
    if (f.alza < 1) {
      const alto = Math.max(1, Math.round(LADO * f.alza));
      if (f.alza > 0) ctx.drawImage(img, 0, LADO - alto, LADO, alto, dx, y + LADO - alto, LADO, alto);
      return;
    }
    if (f.caida > 0) {
      const d = Math.round(LADO * f.caida);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 14, y - 6, 92, pies + 4 - (y - 6));
      ctx.clip();
      ctx.drawImage(img, dx, y + d);
      ctx.restore();
      return;
    }
    void mia;
    ctx.drawImage(img, dx, y + f.saltoY);
  }

  // ------------------------------------------------------------------ bottom area

  private zonaInferior(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>, ahora: number) {
    const esMenu = this.modo !== 'cola' && this.modo !== 'espera';
    if (!esMenu) {
      // The text box, and under it the last lines of the battle log.
      this.caja.dibujar(ctx, 4, G.yBox, ANCHO - 8, G.boxH, ahora);
      this.registro(ctx, G);
      return;
    }
    switch (this.modo) {
      case 'accion':
        this.menuAccion(ctx, G);
        break;
      case 'movs':
        this.menuMovs(ctx, G);
        break;
      case 'equipo':
        this.menuEquipo(ctx, G);
        break;
      case 'objetivo':
      case 'gradaObj':
        this.menuVolver(ctx, G);
        break;
      case 'grada':
        this.menuGrada(ctx, G);
        break;
      default:
        break;
    }
  }

  /** What came before: the latest lines of the log (not the one being written) under the text box. */
  private registro(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    let yR = G.yMenu;
    let h = G.menuH;
    // The action banner takes the top of this area while a move is being played; the log gets what is left.
    if (this.foco?.mov) {
      this.cartel(ctx, 4, yR, ANCHO - 8);
      yR += ALTO_CARTEL + 3;
      h -= ALTO_CARTEL + 3;
    }
    if (h < 40) return;
    panelCacheado(ctx, 4, yR, ANCHO - 8, h);
    // Wrapped once per change of the log (it grows all battle long: re-wrapping it every frame got slower and slower).
    const clave = `${this.versionHistorial}|${this.caja.ocupada ? 1 : 0}`;
    if (this.registroCache?.clave !== clave) {
      const todas: string[] = [];
      this.historial.forEach((g, gi) => {
        g.lineas.forEach((l, li) => {
          const esUltima = gi === this.historial.length - 1 && li === g.lineas.length - 1;
          if (esUltima && this.caja.ocupada) return;
          for (const w of envolver(l, 206)) todas.push(w);
        });
      });
      this.registroCache = { clave, todas: todas.slice(-12) };
    }
    const todas = this.registroCache.todas;
    const n = Math.max(0, Math.floor((h - 14) / 12));
    const ult = todas.slice(-n);
    ult.forEach((l, i) => {
      const edad = ult.length - 1 - i;
      texto2(ctx, l, 14, yR + 9 + (n - ult.length + i) * 12, edad === 0 ? TINTA2 : edad === 1 ? TINTA_SUAVE : '#a898a8', null);
    });
  }

  /**
   * The tray's geometry for a menu of `n` rows (plus the big VOLVER row when `volver`): the panel sits at the bottom
   * and may grow up over the text box, which keeps at least two lines.
   */
  private bandeja(G: ReturnType<VistaCombate['geom']>, n: number, volver = false) {
    const filas = n + (volver ? 1 : 0);
    const libre = G.H - 4 - (G.yBox + 30 + 4);
    const rowH = Math.min(31, Math.floor((libre - 8) / filas));
    const hP = rowH * filas + 8;
    const yP = G.H - 4 - hP;
    return { rowH, yP, hP, boxH: yP - 4 - G.yBox };
  }

  /** A fixed (non-typewriter) text in the box slot. */
  private cajaFija(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>, boxH: number, s: string) {
    panelCacheado(ctx, 4, G.yBox, ANCHO - 8, boxH);
    const maxL = Math.max(1, Math.floor((boxH - 8 - 9) / 13) + 1);
    const ls = envolver(s, 206).slice(0, maxL);
    const bloque = (ls.length - 1) * 13 + 9;
    const y0 = G.yBox + 3 + Math.floor((boxH - 8 - bloque) / 2) + 1;
    ls.forEach((l, i) => texto2(ctx, l, 15, y0 + i * 13));
  }

  /** The menu panel of `n` rows with its text box above: returns the rows' geometry. */
  private panelMenu(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>, n: number, texto: string, volver = false) {
    const B = this.bandeja(G, n, volver);
    this.cajaFija(ctx, G, B.boxH, texto);
    panelCacheado(ctx, 4, B.yP, ANCHO - 8, B.hP);
    return { rowH: B.rowH, y: B.yP + 4 };
  }

  /** The big VOLVER row at the bottom of a menu (`y` is its top): back to the action menu without sending anything. */
  private filaVolver(ctx: CanvasRenderingContext2D, y: number, rowH: number, sel: boolean) {
    const alto = rowH - 6;
    if (sel) realce(ctx, 10, y, ANCHO - 20, alto);
    else {
      relleno(ctx, TINTA2, 10, y, ANCHO - 20, alto);
      relleno(ctx, '#e4d3a6', 11, y + 1, ANCHO - 22, alto - 2);
      rect(ctx, '#f6ead0', 13, y + 1, ANCHO - 26, 1);
    }
    const s = t('batalla.volver');
    const tw = anchoTexto2(s) + 9 + 5;
    const x = Math.floor((ANCHO - tw) / 2) + (sel ? 4 : 0);
    const ty = y + Math.floor((alto - 7) / 2) + 1;
    flecha(ctx, x, y + Math.floor((alto - 7) / 2), -1, TINTA2);
    texto2(ctx, s, x + 9, ty, TINTA2, sel ? '#f0c860' : SOMBRA_TEXTO);
    this.fil(8, y - 1, ANCHO - 16, alto + 3, () => this.accion('atras'));
  }

  private menuVolver(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const { rowH, y } = this.panelMenu(ctx, G, 1, `${t('batalla.objetivo')} ${t('batalla.objetivo2')}`);
    filaMenu(ctx, 10, y, ANCHO - 20, rowH, t('batalla.volver'), null, true);
    entrada.zona(8, y, ANCHO - 16, rowH, () => this.accion('atras'));
  }

  private fil(x: number, y: number, w: number, h: number, fn: () => void) {
    entrada.zona(x, y, w, h, fn);
  }

  private menuAccion(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const q = this.real.jugadores[this.yo];
    const u = activo(this.real, this.yo);
    const { rowH, y: y0 } = this.panelMenu(ctx, G, 3, `${t('batalla.que_hara', { quien: ESPECIE[u.especie].nombre })} ${t('ficha.toca_userito')}`);
    const ok = [true, puedeCambiar(this.real, this.yo), q.cana];
    const iconos = ['luchar', 'userito', 'cana'] as const;
    ['luchar', 'userito', 'cana'].forEach((k, i) => {
      const y = y0 + i * rowH;
      filaMenu(ctx, 10, y, ANCHO - 20, rowH, t(`batalla.${k}`), iconos[i], this.sel === i, ok[i]);
      this.fil(8, y, ANCHO - 16, rowH, () => {
        this.sel = i;
        this.accionPrincipal(i);
      });
    });
  }

  private menuMovs(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const u = activo(this.real, this.yo);
    const sp = ESPECIE[u.especie];
    const libres = movsDisponibles(this.real, this.yo);
    const desesperada = !libres.some(Boolean);
    const ids = desesperada ? [DESESPERADA] : sp.movs;
    if (this.selMov > ids.length) this.selMov = 0;
    const { rowH, y: y0 } = this.panelMenu(ctx, G, ids.length, t(`mov.${ids[Math.min(this.selMov, ids.length - 1)]}.desc`), true);
    const rivs = rivalesEnPie(this.real, this.yo);
    ids.forEach((id, i) => {
      const m = MOVS[id];
      const y = y0 + i * rowH;
      const pp = desesperada ? null : u.pp[i];
      const sinPP = pp !== null && pp <= 0;
      const alto = rowH - 6;
      const activa = this.selMov === i;
      if (activa) realce(ctx, 10, y, ANCHO - 20, alto);
      const ty = y + Math.floor((alto - 7) / 2) + 1;
      // The type chip, the name, how it does on each rival and the PP.
      ctx.save();
      if (sinPP) ctx.globalAlpha = 0.45;
      chipTipo(ctx, m.tipo, 24, y + Math.floor((alto - 11) / 2));
      ctx.restore();
      let xFin = ANCHO - 20;
      if (pp !== null) {
        const s = `${pp}/${m.pp}`;
        texto2(ctx, s, xFin - anchoTexto2(s), ty, sinPP ? '#d4382c' : TINTA_SUAVE, null);
        xFin -= anchoTexto2(s) + 6;
      }
      // The class of its priority (quick, protection, slow) as a pixel icon left of the PP.
      const clase = clasePrioridad(m.prioridad);
      if (clase) {
        xFin -= LADO_ICONO_PRIO + 3;
        ctx.save();
        if (sinPP) ctx.globalAlpha = 0.45;
        ctx.drawImage(iconoPrioridad(clase), xFin + 2, y + Math.floor((alto - LADO_ICONO_PRIO) / 2));
        ctx.restore();
      }
      if (m.pot !== null && !sinPP) {
        // One marker per rival in play, in its trainer's colour: up = hits double, down = half, X = nothing, empty = normal.
        xFin -= rivs.length * 11 - 2;
        rivs.forEach((j, k) => this.marcaEficacia(ctx, xFin + k * 11, y + Math.floor((alto - 9) / 2), j, this.eficaciaContra(id, j) ?? 1));
        xFin -= 4;
      }
      texto2(ctx, recortar(m.nombre, xFin - 52), 52, ty, sinPP ? '#a898a8' : TINTA2, activa ? '#f0c860' : sinPP ? null : SOMBRA_TEXTO);
      this.fil(8, y, ANCHO - 16, rowH, () => {
        if (this.selMov === i) this.elegirMovimiento(i);
        else {
          this.selMov = i;
          sonido.efecto('cursor');
        }
      });
    });
    this.filaVolver(ctx, y0 + ids.length * rowH, rowH, this.selMov >= ids.length);
  }

  /** A 9×9 marker of a rival (its trainer's colour) with how a move does on it: ▲ double or more, ▼ half or less, X nothing; plain = normal. */
  private marcaEficacia(ctx: CanvasRenderingContext2D, x: number, y: number, j: number, ef: number) {
    const ent = this.disp.jugadores[j].entrenador;
    relleno(ctx, TINTA2, x, y, 9, 9);
    relleno(ctx, colorEnt(ent), x + 1, y + 1, 7, 7);
    if (ef === 1) {
      rect(ctx, 'rgba(255,248,232,0.55)', x + 1, y + 1, 7, 7);
      return;
    }
    const blanco = '#fff8e8';
    if (ef > 1) flechaV(ctx, x + 1, y + 3, -1, blanco);
    else if (ef === 0) {
      for (let k = 0; k < 5; k++) {
        rect(ctx, blanco, x + 2 + k, y + 2 + k, 1, 1);
        rect(ctx, blanco, x + 6 - k, y + 2 + k, 1, 1);
      }
    } else flechaV(ctx, x + 1, y + 2, 1, blanco);
  }

  private menuEquipo(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const q = this.real.jugadores[this.yo];
    const { rowH, y: y0 } = this.panelMenu(ctx, G, q.equipo.length, t(this.reemplazo ? 'batalla.quien_sale' : 'batalla.equipo'), !this.reemplazo);
    q.equipo.forEach((u, i) => {
      const y = y0 + i * rowH;
      const alto = rowH - 6;
      const vivo = u.ps > 0;
      const activoAhora = i === q.activo && !this.reemplazo;
      const sp = ESPECIE[u.especie];
      const ocioso = !vivo || activoAhora;
      if (this.sel === i) realce(ctx, 10, y, ANCHO - 20, alto);
      ctx.save();
      if (ocioso) ctx.globalAlpha = 0.45;
      // The thumbnail, cropped to the row when the row is shorter than 32 px.
      const mh = Math.min(32, alto - 2);
      ctx.drawImage(miniatura(u.especie), 0, Math.floor((32 - mh) / 2) - 1 > 0 ? Math.floor((32 - mh) / 2) - 1 : 0, 32, mh, 22, y + Math.floor((alto - mh) / 2), 32, mh);
      ctx.restore();
      const col = ocioso ? '#a898a8' : TINTA2;
      // Your own object next to each name.
      if (u.objeto) ctx.drawImage(iconoObjeto(u.objeto.id, u.objeto.gastado === true), 60 + anchoTexto2(sp.nombre) + 4, alto >= 24 ? y + 2 : y + Math.floor((alto - LADO_ICONO_OBJETO) / 2));
      if (alto >= 24) {
        texto2(ctx, sp.nombre, 60, y + 3, col, null);
        barraPS2(ctx, 60, y + alto - 11, 100, u.ps / u.psMax);
        const nums = `${u.ps}/${u.psMax}`;
        texto2(ctx, nums, 168, y + alto - 10, ocioso ? '#a898a8' : TINTA_SUAVE, null);
        if (activoAhora) texto2(ctx, t('batalla.en_combate'), ANCHO - 20 - anchoTexto2(t('batalla.en_combate')), y + 3, TINTA_SUAVE, null);
        else if (u.estado) etiquetaEstado(ctx, u.estado, ANCHO - 20 - 28, y + 1);
      } else {
        texto2(ctx, sp.nombre, 60, y + Math.floor((alto - 7) / 2) + 1, col, null);
        barraPS2(ctx, 128, y + Math.floor((alto - 9) / 2), 56, u.ps / u.psMax);
        if (activoAhora) texto2(ctx, t('batalla.en_combate'), 190, y + Math.floor((alto - 7) / 2) + 1, TINTA_SUAVE, null);
      }
      this.fil(8, y, ANCHO - 16, rowH, () => {
        this.sel = i;
        this.elegirEquipo(i);
      });
    });
    if (!this.reemplazo) this.filaVolver(ctx, y0 + q.equipo.length * rowH, rowH, this.sel >= q.equipo.length);
  }

  private menuGrada(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const { rowH, y: y0 } = this.panelMenu(ctx, G, 3, t('batalla.grada'));
    const hay = enGrada(this.real, this.yo);
    ['grada_cana', 'grada_abucheo', 'grada_nada'].forEach((k, i) => {
      const y = y0 + i * rowH;
      filaMenu(ctx, 10, y, ANCHO - 20, rowH, t(`batalla.${k}`), null, this.sel === i, !(i < 2 && !hay));
      this.fil(8, y, ANCHO - 16, rowH, () => {
        this.sel = i;
        this.accionGrada(i);
      });
    });
  }
}
