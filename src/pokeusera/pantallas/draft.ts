// PokéUsera · the draft (snake order): who is choosing, every player's picks so far, the sheet of the userito being looked at and the
// grid of the 32 useritos. The sheet lives in the screen itself (between the players' panels and the grid; no window): tapping a cell
// of the grid shows that userito's sheet, tapping another one swaps it, and tapping the selected one again takes it: on your turn, a
// gold ELEGIR label sits on the selected cell itself (the double tap), not on the sheet, which is information only. The top bar with the
// clock and whose turn it is never goes away. It draws only from what it is told (`alDraft`: the draft state, whose turn and for how
// long), so a guest can feed it from network messages too.
//
// Performance (docs/ESTILO.md, T5/T6): the sheet (panel, name, types, bars, moves, text) is baked once per userito, layout and view
// (`ficha`); the grid is one canvas that is redrawn only when a pick changes it; per frame there are a few blits, the breathing sprite,
// the baked ELEGIR label and the frames of the cursors. A tall screen gets the full sheet (sprite beside the stats); a short one the compact sheet.
import type { EntrenadorId, EscenarioId, EstadoDraft, Tipo } from '../tipos';
import { ESPECIE, ESPECIES, MOVS, TIPOS, eficacia } from '../datos';
import { icono2 } from '../arte2/entrenadores2';
import { anchoTexto2 } from '../arte2/fuente2';
import { ORO_UI, ORO_UI_OSC, PAPEL_ALTO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { spriteFrente2 } from '../arte2/sprites2';
import { COLOR_TIPO } from '../arte/paleta';
import { hornear, panel, panelCacheado, relleno } from '../arte2/ui2';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { menuPausa } from './ajustes';
import { abrirGuia, atacantesFuertes, defensoresCon, hileraTipos } from './guia';
import { miniatura, plataformaCacheada } from './fondos';
import { clasePrioridad, iconoPrioridad, LADO_ICONO_PRIO } from './iconosMov';
import {
  Animador,
  barraArriba,
  barraValor,
  centrado,
  chipTiempo,
  colorEnt,
  dormir,
  envolver,
  fondoPapel,
  insignaTipo,
  menuIcono,
  recortar,
  parpadea,
  rect,
  reposo,
  t,
  texto2,
} from './ui';

export interface PlazaDraft {
  entrenador: EntrenadorId;
  nombre: string;
}

/** The grid: 7 columns × 5 rows for the 32 useritos (a 32×32 thumbnail per 34×36–43 cell, ≥ 55×58 CSS px on a 390 px phone; the last row has room to spare).
 *  The row is centred (X_REJ: 1 px of margin on a 240 px screen). */
const COLS = 7;
const FILAS = Math.ceil(ESPECIES.length / COLS);
const CELDA_W = Math.floor(ANCHO / COLS);
const X_REJ = Math.floor((ANCHO - CELDA_W * COLS) / 2);
const MINI_X = Math.floor((CELDA_W - 32) / 2);
const STATS: { clave: 'ps' | 'ata' | 'def' | 'vel' | 'esp'; nombre: string }[] = [
  { clave: 'ps', nombre: 'PS' },
  { clave: 'ata', nombre: 'ATA' },
  { clave: 'def', nombre: 'DEF' },
  { clave: 'vel', nombre: 'VEL' },
  { clave: 'esp', nombre: 'ESP' },
];

/** The sheet's panel: width, and the height from which the full sheet (sprite beside the stats) fits; below it the compact one is used. */
const W_FICHA = ANCHO - 2;
const ALTO_FICHA_COMPLETA = 176;

/** The sheet's blocks, in the sheet's own coordinates (the panel's top-left is 0,0). Compact: header, the five stats in a row, moves, ability, text. Full: sprite on the left, the stats on the right. No button: ELEGIR is on the grid's selected cell (`etiquetaElegir`). */
const G = {
  x0: 8,
  compacta: { statsY: 34, movsY: 54, movsFila: 12, habY: 78, textoY: 93 },
  completa: { spriteX: 10, spriteY: 6, colX: 90, nombreY: 9, tiposY: 22, statsY: 38, statsFila: 11, movsY: 97, movsFila: 15, habY: 127, textoY: 148 },
};
const COL_MOV = 116;

type Vista = number; // -1 the userito's text, 0..3 a move's description, 4 the type matchups, 5 the ability

/** The opened sheet of the layout: which blocks it has and where. */
interface Diseno {
  yInfo: number;
  hInfo: number;
  completa: boolean;
}

/** Where cell `i` of the moves block sits, in sheet coordinates, and how tall a row is. */
function celdaMov(completa: boolean, i: number): { x: number; y: number; h: number } {
  const g = completa ? G.completa : G.compacta;
  return { x: G.x0 + (i % 2) * COL_MOV, y: g.movsY + Math.floor(i / 2) * g.movsFila, h: g.movsFila };
}

/** How many 12 px lines of text fit under the moves. */
const lineasTexto = (completa: boolean, h: number): number => Math.max(1, Math.floor((h - 4 - (completa ? G.completa.textoY : G.compacta.textoY)) / 12));

/** The sheet of a userito, baked without the sprite and the owner mark: panel, name, types, bars, moves and the text strip for `vista`. */
function fichaBase(id: string, completa: boolean, h: number, vista: Vista): HTMLCanvasElement {
  return hornear(`draft|ficha|${id}|${completa ? 1 : 0}|${h}|${vista}`, W_FICHA, h + 2, (cx) => {
    const sp = ESPECIE[id];
    const num = `Nº${String(ESPECIES.findIndex((s) => s.id === id) + 1).padStart(2, '0')}`;
    const color = COLOR_TIPO[sp.tipos[0]];
    const x0 = G.x0;
    panel(cx, 0, 0, W_FICHA, h);
    if (completa) {
      const g = G.completa;
      // Beer mat under the sprite (the sprite itself breathes, so it is drawn each frame).
      const mat = plataformaCacheada(30, 7);
      cx.drawImage(mat, g.spriteX - 2 + Math.floor((68 - mat.width) / 2), g.spriteY + 62 - 12);
      texto2(cx, sp.nombre, g.colX, g.nombreY);
      texto2(cx, num, g.colX + anchoTexto2(sp.nombre) + 8, g.nombreY, TINTA_SUAVE);
      let bx = g.colX;
      for (const tp of sp.tipos) bx += insignaTipo(cx, tp, bx, g.tiposY) + 3;
      STATS.forEach((st, i) => {
        const y = g.statsY + i * g.statsFila;
        texto2(cx, st.nombre, g.colX, y, TINTA_SUAVE);
        const v = sp.base[st.clave];
        barraValor(cx, g.colX + 24, y, 70, Math.min(v, 150) / 150, color);
        texto2(cx, String(v), g.colX + 100, y);
      });
      // A small «?» at the end of the first stat row: «what do these mean?».
      const qx = W_FICHA - 11 - 13;
      relleno(cx, TINTA2, qx, g.statsY - 1, 13, 13);
      relleno(cx, '#e8c25a', qx + 1, g.statsY, 11, 11);
      rect(cx, '#fff3c8', qx + 2, g.statsY, 9, 1);
      texto2(cx, '?', qx + 4, g.statsY + 2, TINTA2, null);
    } else {
      const g = G.compacta;
      texto2(cx, sp.nombre, x0, 6);
      texto2(cx, num, x0 + anchoTexto2(sp.nombre) + 8, 6, TINTA_SUAVE);
      let bx = x0;
      for (const tp of sp.tipos) bx += insignaTipo(cx, tp, bx, 17) + 3;
      STATS.forEach((st, i) => {
        const x = x0 + i * 44;
        texto2(cx, st.nombre, x, g.statsY, TINTA_SUAVE);
        const v = String(sp.base[st.clave]);
        texto2(cx, v, x + 39 - anchoTexto2(v), g.statsY);
        barraValor(cx, x, g.statsY + 9, 39, Math.min(sp.base[st.clave], 150) / 150, color);
      });
    }
    // The four moves: type swatch, name and the priority icon; the tapped one is highlighted.
    sp.movs.forEach((mid, i) => {
      const m = MOVS[mid];
      const c = celdaMov(completa, i);
      if (i === vista) {
        relleno(cx, ORO_UI_OSC, c.x - 3, c.y - Math.floor((c.h - 9) / 2) - 1, COL_MOV - 3, c.h);
        relleno(cx, '#fbe19a', c.x - 2, c.y - Math.floor((c.h - 9) / 2), COL_MOV - 5, c.h - 2);
      }
      rect(cx, TINTA2, c.x, c.y, 7, 9);
      rect(cx, COLOR_TIPO[m.tipo as Tipo], c.x + 1, c.y + 1, 5, 7);
      const clase = clasePrioridad(m.prioridad);
      texto2(cx, recortar(m.nombre, COL_MOV - 20 - (clase ? LADO_ICONO_PRIO + 3 : 0)), c.x + 11, c.y + 1, TINTA2, null);
      if (clase) cx.drawImage(iconoPrioridad(clase), c.x + COL_MOV - 12 - LADO_ICONO_PRIO, c.y);
    });
    // The ability (the same for everybody to see): a gold swatch, its label and its name; tapped, its description goes in the strip.
    {
      const g = completa ? G.completa : G.compacta;
      const hy = g.habY;
      if (vista === 5) {
        relleno(cx, ORO_UI_OSC, x0 - 3, hy - Math.floor((g.movsFila - 9) / 2) - 1, W_FICHA - 2 * x0 + 6, g.movsFila);
        relleno(cx, '#fbe19a', x0 - 2, hy - Math.floor((g.movsFila - 9) / 2), W_FICHA - 2 * x0 + 4, g.movsFila - 2);
      }
      rect(cx, TINTA2, x0, hy, 7, 9);
      rect(cx, '#e8c25a', x0 + 1, hy + 1, 5, 7);
      const etiqueta = t('hab.titulo');
      texto2(cx, etiqueta, x0 + 11, hy + 1, TINTA_SUAVE, null);
      const nx = x0 + 11 + anchoTexto2(etiqueta) + 6;
      texto2(cx, recortar(t(`hab.${sp.habilidad}.nombre`), W_FICHA - x0 - nx), nx, hy + 1, TINTA2, null);
    }
    // The text strip: the userito's description, a move's, the type matchups or the ability's.
    const ty = completa ? G.completa.textoY : G.compacta.textoY;
    rect(cx, '#d6c08a', x0, ty - 4, W_FICHA - 2 * x0, 1);
    const n = lineasTexto(completa, h);
    if (vista === 4) {
      const mitad = Math.floor((W_FICHA - 2 * x0) / 2) - 3;
      const pega = [...new Set(sp.tipos.flatMap((a) => defensoresCon(a, 2)))];
      const pegan = atacantesFuertes(sp.tipos);
      const inmune = TIPOS.filter((a) => eficacia(a, sp.tipos) === 0);
      const resiste = TIPOS.filter((a) => eficacia(a, sp.tipos) > 0 && eficacia(a, sp.tipos) < 1);
      const x4 = (tp: Tipo) => (eficacia(tp, sp.tipos) >= 4 ? t('draft.x4') : '');
      texto2(cx, t('draft.pega'), x0, ty - 1, TINTA_SUAVE, null);
      texto2(cx, t('draft.pegan'), x0 + mitad + 6, ty - 1, TINTA_SUAVE, null);
      const a = hileraTipos(cx, pega, x0, ty + 11, mitad);
      const b = hileraTipos(cx, pegan, x0 + mitad + 6, ty + 11, mitad, x4);
      // Second row: what it resists (half damage) and what cannot touch it, as long as there is room.
      if ((resiste.length || inmune.length) && ty + 11 + Math.max(a, b) + 3 + 11 + Math.max(hileraTipos(null, resiste, 0, 0, mitad), hileraTipos(null, inmune, 0, 0, mitad)) <= h - 3) {
        const yi = ty + 11 + Math.max(a, b) + 3;
        texto2(cx, t('draft.resiste'), x0, yi, TINTA_SUAVE, null);
        hileraTipos(cx, resiste, x0, yi + 11, mitad);
        texto2(cx, t('draft.inmune'), x0 + mitad + 6, yi, TINTA_SUAVE, null);
        hileraTipos(cx, inmune, x0 + mitad + 6, yi + 11, mitad);
      }
    } else {
      const ancho = W_FICHA - 2 * x0 - 2;
      let lineas: string[];
      if (vista === 5) lineas = envolver(t('draft.habinfo', { nombre: t(`hab.${sp.habilidad}.nombre`), desc: t(`hab.${sp.habilidad}.desc`) }), ancho);
      else if (vista >= 0 && vista < 4) {
        const m = MOVS[sp.movs[vista]];
        // Name and PP first; on a short sheet a long description goes without them rather than cut.
        lineas = envolver(t('draft.movinfo', { nombre: m.nombre, pp: m.pp, desc: t(`mov.${m.id}.desc`) }), ancho);
        if (lineas.length > n) lineas = envolver(t(`mov.${m.id}.desc`), ancho);
      } else lineas = envolver(t(`userito.${id}.desc`), ancho);
      lineas.slice(0, n).forEach((l, i) => texto2(cx, l, x0, ty + i * 12));
    }
  });
}

/** The ELEGIR label that sits on the selected cell on your turn (the second tap of the double tap), baked once: gold plate, dark outline, `LAB_ALTO` px tall. */
const LAB_ALTO = 11;
function etiquetaElegir(): HTMLCanvasElement {
  const s = t('draft.elegir');
  const w = anchoTexto2(s) + 6;
  return hornear(`draft|etiqueta|${s}|${w}`, w, LAB_ALTO, (cx) => {
    relleno(cx, TINTA2, 0, 0, w, LAB_ALTO);
    relleno(cx, ORO_UI_OSC, 1, 1, w - 2, LAB_ALTO - 2);
    relleno(cx, '#f0c860', 1, 1, w - 2, LAB_ALTO - 3);
    rect(cx, '#fff3c8', 2, 1, w - 4, 1);
    texto2(cx, s, Math.floor((w - anchoTexto2(s)) / 2), 2, TINTA2, null);
  });
}

/** Where everything sits on a screen of height `H` (the players' panels, the sheet, the grid). */
function disenoDraft(H: number): Diseno & { yJug: number; hCelda: number; yGrid: number; cellH: number } {
  const extra = Math.max(0, H - 384);
  const yJug = 20;
  const hCelda = 36 + Math.min(4, Math.floor(extra / 30));
  const yInfo = yJug + 2 * hCelda + 2;
  // The cells grow with the screen from 36 to 43 px (five rows, about what the four rows of 44-54 took); what is left goes to the sheet.
  const cellH = Math.max(36, Math.min(43, 36 + Math.floor(extra / 19)));
  const yGrid = H - 3 - cellH * FILAS;
  const hInfo = yGrid - yInfo - 2;
  return { yJug, hCelda, yInfo, hInfo, yGrid, cellH, completa: hInfo >= ALTO_FICHA_COMPLETA };
}

/** One task per userito for the background baking (`precalentar.ts`): its sheet as the player first sees it, for the current screen height. */
export const tareasPrecalentarDraft = (): (() => void)[] =>
  ESPECIES.map((sp) => () => {
    const L = disenoDraft(pantalla().alto);
    fichaBase(sp.id, L.completa, L.hInfo, -1);
  });

export class VistaDraft implements Escena {
  private anim = new Animador();
  private elegidos: string[] = [];
  private orden: number[] = [];
  private turnoDe: number | null = null;
  private fin = 0;
  /** The userito whose sheet is shown (index in ESPECIES), and what the sheet's text strip shows (see `Vista`). */
  private sel = 0;
  private movSel = -1;
  private tiposVista = false;
  private habVista = false;
  /** The machine's cursor (px of the grid cell's corner): it wanders while a machine thinks and hops to what it picks. */
  private hx = -1;
  private hy = -1;
  private cursorOculto = true;
  /** What the clock last showed (see `paso`). */
  private marcaReloj = -1;
  private resolverPick: ((id: string) => void) | null = null;
  private apelear = false;
  private ultimoTic = -1;
  private vaga = 0;
  /** Set by the flow: the player chose ABANDONAR in the pause box. */
  alAbandonar: (() => void) | null = null;
  private precargado = false;
  /** The top bar's two lines (see `barraSuperior`), remade only when what they say changes. */
  private barraClave = '';
  private barraL1 = '';
  private barraL2 = '';
  private avisoTxt = '';
  private avisoHasta = 0;
  /** The bar of the battle that follows, when known: its tune is the one decoded during the draft. */
  escenario: EscenarioId | undefined;
  /** The grid, baked: redrawn only when a pick (or the cell height) changes it. */
  private rej: HTMLCanvasElement | null = null;
  private rejAlto = 0;
  private rejSucia = true;

  /** `miSeat`: the seat of this screen's player (null when only watching). */
  constructor(
    private plazas: PlazaDraft[],
    private miSeat: number | null,
  ) {}

  // ------------------------------------------------------------------ feeding (host or network)

  /** The draft state changed. Plays the new picks one by one, then shows whose turn it is. */
  async alDraft(draft: EstadoDraft, turnoDe: number | null, plazoMs: number): Promise<void> {
    this.orden = draft.orden;
    if (!this.precargado) {
      // The battle's tune is decoded during the draft (a few seconds in, so as not to compete with the draft's own tune).
      this.precargado = true;
      setTimeout(() => {
        sonido.elegirCombate(this.escenario);
        sonido.precargar('combate');
      }, 4000);
    }
    for (let i = this.elegidos.length; i < draft.elegidos.length; i++) {
      const id = draft.elegidos[i];
      const k = ESPECIES.findIndex((s) => s.id === id);
      this.turnoDe = null;
      if (k >= 0) {
        // The machine's cursor hops to the pick; the sheet stays where the player was looking.
        const [dx, dy] = this.celda(k);
        const x0 = this.hx < 0 ? dx : this.hx;
        const y0 = this.hy < 0 ? dy : this.hy;
        this.cursorOculto = false;
        await this.anim.animar(this.hx < 0 ? 0 : 200, (p) => {
          this.hx = x0 + (dx - x0) * p;
          this.hy = y0 + (dy - y0) * p;
        });
      }
      this.elegidos = draft.elegidos.slice(0, i + 1);
      this.rejSucia = true;
      sonido.efecto('elegido');
      sonido.grito(id);
      await dormir(650);
    }
    this.elegidos = draft.elegidos.slice();
    this.turnoDe = turnoDe;
    this.fin = Date.now() + plazoMs;
    this.ultimoTic = -1;
    // The sheet never rests on a userito that is already taken: it moves on to the next free one.
    if (this.dueno(ESPECIES[this.sel].id) >= 0) this.mirar(this.siguienteLibre(this.sel), false);
    if (turnoDe === null) {
      this.resolverPick = null;
      this.apelear = true;
      this.cursorOculto = true;
      sonido.efecto('turno');
      await dormir(1500);
    }
  }

  /** A line from outside the draft (online: someone left), shown in a box for a few seconds. */
  aviso(s: string) {
    this.avisoTxt = s;
    this.avisoHasta = Date.now() + 3500;
    pantalla().redibujar();
  }

  /** The local player's pick: resolves with the species id when they confirm it with ELEGIR. */
  pedirPick(): Promise<string> {
    return new Promise((res) => {
      this.resolverPick = (id) => {
        this.resolverPick = null;
        res(id);
      };
    });
  }

  // ------------------------------------------------------------------ geometry

  private layout(H: number) {
    return disenoDraft(H);
  }

  private celda(k: number): [number, number] {
    const L = this.layout(pantalla().alto);
    return [X_REJ + (k % COLS) * CELDA_W, L.yGrid + Math.floor(k / COLS) * L.cellH];
  }

  private dueno(id: string): number {
    const i = this.elegidos.indexOf(id);
    return i < 0 ? -1 : this.orden[i];
  }

  private siguienteLibre(desde: number): number {
    const n = ESPECIES.length;
    for (let d = 1; d <= n; d++) {
      const k = (desde + d) % n;
      if (this.dueno(ESPECIES[k].id) < 0) return k;
    }
    return desde;
  }

  private get miTurno(): boolean {
    return this.resolverPick !== null && this.turnoDe !== null && this.turnoDe === this.miSeat;
  }

  /** The vista of the text strip. */
  private get vista(): Vista {
    return this.movSel >= 0 ? this.movSel : this.tiposVista ? 4 : this.habVista ? 5 : -1;
  }

  // ------------------------------------------------------------------ input

  /** Shows the sheet of cell `k` (the text strip goes back to the description). */
  private mirar(k: number, sonar = true) {
    if (k === this.sel) return;
    this.sel = k;
    this.movSel = -1;
    this.tiposVista = false;
    this.habVista = false;
    if (sonar) sonido.efecto('cursor');
    pantalla().redibujar();
  }

  private tocarMov(i: number) {
    this.tiposVista = false;
    this.habVista = false;
    this.movSel = this.movSel === i ? -1 : i;
    sonido.efecto('cursor');
  }

  private tocarTipos() {
    this.movSel = -1;
    this.habVista = false;
    this.tiposVista = !this.tiposVista;
    sonido.efecto('cursor');
  }

  private tocarHab() {
    this.movSel = -1;
    this.tiposVista = false;
    this.habVista = !this.habVista;
    sonido.efecto('cursor');
  }

  private confirmar() {
    if (!this.miTurno) return;
    const id = ESPECIES[this.sel].id;
    if (this.dueno(id) >= 0) return;
    this.resolverPick?.(id);
  }

  accion(a: Accion): boolean {
    if (a === 'atras') {
      void this.pausar();
      return true;
    }
    const n = ESPECIES.length;
    let k = this.sel;
    if (a === 'izq') k = (k + n - 1) % n;
    else if (a === 'der') k = (k + 1) % n;
    else if (a === 'arriba') k = k >= COLS ? k - COLS : k + Math.floor((n - 1 - k) / COLS) * COLS;
    else if (a === 'abajo') k = k + COLS < n ? k + COLS : k % COLS;
    else if (a === 'aceptar') {
      this.confirmar();
      return true;
    } else return false;
    this.mirar(k);
    return true;
  }

  /** The guide on the statistics page (the countdown keeps running underneath). */
  private abrirGuiaStats() {
    sonido.efecto('aceptar');
    void abrirGuia(this, 'stats');
  }

  private async pausar() {
    sonido.efecto('aceptar');
    if ((await menuPausa(this)) === 'abandonar') this.alAbandonar?.();
  }

  paso(dt: number): boolean {
    let mueve = this.anim.paso(dt);
    if (this.turnoDe !== null && !this.apelear) {
      // The countdown ticks in the last seconds of the local player's turn.
      const seg = Math.ceil((this.fin - Date.now()) / 1000);
      if (this.miTurno && seg <= 5 && seg > 0 && seg !== this.ultimoTic) {
        this.ultimoTic = seg;
        sonido.efecto('tic');
      }
      // While a machine thinks, its cursor wanders over the free useritos (the player's sheet stays put).
      if (this.turnoDe !== this.miSeat && !this.anim.activo) {
        this.vaga -= dt;
        if (this.vaga <= 0) {
          this.vaga = 230;
          const libres = ESPECIES.map((_, k) => k).filter((k) => this.dueno(ESPECIES[k].id) < 0);
          if (libres.length) {
            [this.hx, this.hy] = this.celda(libres[Math.floor(Math.random() * libres.length)]);
            this.cursorOculto = false;
            mueve = true;
          }
        }
      } else if (this.turnoDe === this.miSeat) this.cursorOculto = true;
      // Redraw for the clock and the turn's blink only when they show something new, not every frame.
      const marca = seg * 2 + (Math.floor(performance.now() / 400) % 2);
      if (marca !== this.marcaReloj) {
        this.marcaReloj = marca;
        mueve = true;
      }
    }
    // The sheet's sprite breathes: the screen redraws every quarter second, enough for its two resting frames.
    return mueve || Date.now() < this.avisoHasta;
  }

  // ------------------------------------------------------------------ drawing

  dibujar(ctx: CanvasRenderingContext2D, ahora: number) {
    const H = pantalla().alto;
    const L = this.layout(H);
    fondoPapel(ctx, H);
    if (this.hx < 0) [this.hx, this.hy] = this.celda(this.sel);
    this.jugadores(ctx, L.yJug, L.hCelda, ahora);
    this.ficha(ctx, L, ahora);
    this.rejilla(ctx, L, ahora);
    this.barraSuperior(ctx, ahora);
    if (this.apelear) {
      const s = t('draft.apelear');
      const w = anchoTexto2(s) + 40;
      panelCacheado(ctx, Math.floor((ANCHO - w) / 2), Math.round(H / 2) - 18, w, 36);
      centrado(ctx, s, Math.round(H / 2) - 4);
    }
    if (Date.now() < this.avisoHasta) {
      const ls = envolver(this.avisoTxt, 190);
      const h = 22 + ls.length * 13;
      const y = Math.round(H / 2 - h / 2);
      panelCacheado(ctx, 14, y, ANCHO - 28, h);
      ls.forEach((l, i) => centrado(ctx, l, y + 12 + i * 13));
    }
  }

  private barraSuperior(ctx: CanvasRenderingContext2D, ahora: number) {
    barraArriba(ctx);
    menuIcono(ctx, 7, 5);
    entrada.zona(0, 0, 28, 20, () => void this.pausar());
    if (this.turnoDe === null) {
      if (!this.apelear) texto2(ctx, t('draft.titulo'), 28, 6);
      return;
    }
    const q = this.plazas[this.turnoDe];
    const col = colorEnt(q.entrenador);
    ctx.drawImage(icono2(q.entrenador), 24, 1, 16, 16);
    const mio = this.turnoDe === this.miSeat;
    const seg = Math.max(0, Math.ceil((this.fin - Date.now()) / 1000));
    const rojo = seg <= 5;
    if (!rojo || parpadea(ahora, 400)) chipTiempo(ctx, String(seg), rojo);
    // Who picks after this one: «Luego» and their face, just before the clock (the snake order, 1-2-3-4, 4-3-2-1, is not obvious).
    const k = this.elegidos.length;
    const sig = this.orden[k + 1];
    let xIzq = ANCHO - 6 - (anchoTexto2(String(seg)) + 14) - 4;
    if (sig !== undefined && this.plazas[sig]) {
      xIzq -= 16;
      ctx.drawImage(icono2(this.plazas[sig].entrenador), xIzq, 1, 16, 16);
      const luego = t('draft.luego');
      xIzq -= 3 + anchoTexto2(luego);
      texto2(ctx, luego, xIzq, 6, TINTA_SUAVE);
    }
    // Left: whose turn it is and, when it is somebody else's and you still have a pick coming, how many picks until yours (second line).
    let falta = 0;
    if (!mio && this.miSeat !== null) {
      const d = this.orden.slice(k + 1).indexOf(this.miSeat);
      if (d >= 0) falta = d + 1;
    }
    const cabe = xIzq - 5 - 44;
    const marca = `${this.turnoDe}|${k}|${falta}|${cabe}`;
    if (this.barraClave !== marca) {
      this.barraClave = marca;
      this.barraL1 = recortar(mio ? t('draft.tuturno') : t('draft.elige', { nombre: q.nombre }), cabe);
      this.barraL2 = falta ? recortar(falta === 1 ? t('draft.tesigue') : t('draft.tetoca', { n: falta }), cabe) : '';
    }
    if (this.barraL2) {
      texto2(ctx, this.barraL1, 44, 1, TINTA2);
      texto2(ctx, this.barraL2, 44, 9, TINTA_SUAVE, null);
    } else texto2(ctx, this.barraL1, 44, 6, mio ? col : TINTA2);
  }

  private jugadores(ctx: CanvasRenderingContext2D, y0: number, h: number, ahora: number) {
    const n = this.plazas.length;
    for (let j = 0; j < n; j++) {
      const x = 1 + (j % 2) * 119;
      const y = y0 + Math.floor(j / 2) * (h + 1);
      const q = this.plazas[j];
      const col = colorEnt(q.entrenador);
      const turno = this.turnoDe === j;
      relleno(ctx, TINTA2, x, y, 119, h - 1);
      relleno(ctx, turno ? PAPEL_ALTO : '#9c8c8c', x + 1, y + 1, 117, h - 3);
      rect(ctx, col, x + 2, y + h - 4, 115, 2);
      if (turno && parpadea(ahora, 400)) rect(ctx, col, x + 2, y + 1, 115, 2);
      ctx.drawImage(icono2(q.entrenador), x + 2, y + Math.floor((h - 16) / 2) - 1);
      const propios = this.elegidos.filter((_, i) => this.orden[i] === j);
      for (let s = 0; s < 3; s++) {
        const sx = x + 20 + s * 32;
        if (propios[s]) ctx.drawImage(miniatura(propios[s]), sx, y + Math.floor((h - 34) / 2) + 1);
        else {
          const prox = turno && s === propios.length;
          rect(ctx, prox && parpadea(ahora, 300) ? col : turno ? '#d6c08a' : '#8a7a7a', sx + 11, y + Math.floor(h / 2) - 1, 10, 3);
        }
      }
    }
  }

  // ------------------------------------------------------------------ the sheet

  /** The sheet of the userito being looked at: the baked body, the breathing sprite (full sheet), the owner mark if taken and ELEGIR. */
  private ficha(ctx: CanvasRenderingContext2D, L: Diseno, ahora: number) {
    const sp = ESPECIES[Math.max(0, Math.min(ESPECIES.length - 1, this.sel))];
    const { yInfo: y, hInfo: h, completa } = L;
    const x = 1;
    const vista = this.vista;
    ctx.drawImage(fichaBase(sp.id, completa, h, vista), x, y);
    const d = this.dueno(sp.id);
    // Hit zones: the type badges and the moves (the text strip changes), the statistics (the guide).
    for (let i = 0; i < 4; i++) {
      const c = celdaMov(completa, i);
      entrada.zona(x + c.x - 3, y + c.y - Math.floor((c.h - 9) / 2) - 1, COL_MOV - 3, c.h + 1, () => this.tocarMov(i));
    }
    {
      const g = completa ? G.completa : G.compacta;
      entrada.zona(x + G.x0 - 3, y + g.habY - Math.floor((g.movsFila - 9) / 2) - 1, W_FICHA - 2 * G.x0 + 6, g.movsFila + 1, () => this.tocarHab());
    }
    if (lineasTexto(completa, h) >= 3) {
      const tx = completa ? G.completa.colX : G.x0;
      const ty = completa ? G.completa.tiposY : 17;
      entrada.zona(x + tx - 3, y + ty - 3, 120, 17, () => this.tocarTipos());
    }
    if (completa) {
      const c = G.completa;
      entrada.zona(x + c.colX - 2, y + c.statsY - 3, W_FICHA - c.colX - 6, STATS.length * c.statsFila + 2, () => this.abrirGuiaStats());
      ctx.drawImage(spriteFrente2(sp.id, reposo(ahora)), x + c.spriteX, y + c.spriteY);
      if (d >= 0) ctx.drawImage(icono2(this.plazas[d].entrenador), x + W_FICHA - 11 - 16, y + 6);
    } else {
      const c = G.compacta;
      entrada.zona(x + 4, y + c.statsY - 3, W_FICHA - 8, 21, () => this.abrirGuiaStats());
      if (d >= 0) ctx.drawImage(icono2(this.plazas[d].entrenador), x + W_FICHA - 8 - 16, y + 6);
    }
  }

  /** Whether the selected userito can be taken right now: your turn and it is free. */
  private get puedeElegir(): boolean {
    return this.miTurno && this.dueno(ESPECIES[this.sel].id) < 0;
  }

  // ------------------------------------------------------------------ the grid

  /** The 32 cells on one canvas: plate, thumbnail and, for the taken ones, the owner's mark. Redone only when it changes. */
  private rejillaLienzo(cellH: number): HTMLCanvasElement {
    if (!this.rej) {
      this.rej = document.createElement('canvas');
      this.rej.width = ANCHO;
    }
    if (this.rejAlto !== cellH) {
      this.rejAlto = cellH;
      this.rej.height = cellH * FILAS;
      this.rejSucia = true;
    }
    if (this.rejSucia) {
      this.rejSucia = false;
      const cx = this.rej.getContext('2d')!;
      cx.imageSmoothingEnabled = false;
      cx.clearRect(0, 0, ANCHO, cellH * FILAS);
      ESPECIES.forEach((sp, k) => {
        const x = X_REJ + (k % COLS) * CELDA_W;
        const y = Math.floor(k / COLS) * cellH;
        const d = this.dueno(sp.id);
        const sy = y + Math.floor((cellH - 32) / 2);
        // The cell's plate.
        relleno(cx, 'rgba(59,42,63,0.22)', x, y + 1, CELDA_W - 1, cellH - 2);
        if (d >= 0) {
          cx.save();
          cx.globalAlpha = 0.3;
          cx.drawImage(miniatura(sp.id), x + MINI_X, sy);
          cx.restore();
          rect(cx, colorEnt(this.plazas[d].entrenador), x + 4, y + cellH - 5, CELDA_W - 9, 3);
          cx.drawImage(icono2(this.plazas[d].entrenador), x + Math.floor((CELDA_W - 16) / 2), sy + 8);
        } else cx.drawImage(miniatura(sp.id), x + MINI_X, sy);
      });
    }
    return this.rej;
  }

  private rejilla(ctx: CanvasRenderingContext2D, L: { yGrid: number; cellH: number }, ahora: number) {
    ctx.drawImage(this.rejillaLienzo(L.cellH), 0, L.yGrid);
    ESPECIES.forEach((_sp, k) => {
      const x = X_REJ + (k % COLS) * CELDA_W;
      const y = L.yGrid + Math.floor(k / COLS) * L.cellH;
      // The selected cell is also ELEGIR on your turn (double tap): a second tap on it takes the userito; any other cell just shows its sheet.
      entrada.zona(x, y, CELDA_W, L.cellH, () => (k === this.sel && this.puedeElegir ? this.confirmar() : this.mirar(k)));
    });
    // The machine's cursor (gold) while it thinks or picks, and the cell whose sheet is open (the player's colour, blinking, on their turn).
    if (!this.cursorOculto && this.hx >= 0) this.marco(ctx, Math.round(this.hx), Math.round(this.hy), L.cellH, ORO_UI);
    const [sx, sy] = this.celda(this.sel);
    this.marco(ctx, sx, sy, L.cellH, this.miTurno ? (parpadea(ahora, 400) ? colorEnt(this.plazas[this.miSeat!].entrenador) : TINTA2) : TINTA2);
    // ELEGIR over the bottom of the selected cell, centred on it but never out of the screen (it is a pixel or three wider than a cell, so on the
    // first and last columns it is pushed in; it may overhang the neighbours' plates, whose tap zones are the cells themselves, so none is lost).
    if (this.puedeElegir) {
      const lab = etiquetaElegir();
      const lx = Math.max(0, Math.min(ANCHO - lab.width, sx + Math.floor((CELDA_W - lab.width) / 2)));
      ctx.drawImage(lab, lx, sy + L.cellH - LAB_ALTO - 2);
    }
  }

  private marco(ctx: CanvasRenderingContext2D, x: number, y: number, cellH: number, c: string) {
    const w = CELDA_W - 2;
    rect(ctx, c, x + 1, y, w, 2);
    rect(ctx, c, x + 1, y + cellH - 2, w, 2);
    rect(ctx, c, x + 1, y, 2, cellH);
    rect(ctx, c, x + w - 1, y, 2, cellH);
  }
}
