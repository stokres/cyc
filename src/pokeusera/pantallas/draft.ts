// PokéUsera · the draft (snake order): who is choosing, every player's picks so far, the grid of
// the 24 useritos and the detail card. It draws only from what it is told (`alDraft`: the draft
// state, whose turn and for how long), so a guest can feed it from network messages too.
import type { EntrenadorId, EscenarioId, EstadoDraft, Tipo } from '../tipos';
import { ESPECIE, ESPECIES, MOVS, TIPOS, eficacia } from '../datos';
import { icono2 } from '../arte2/entrenadores2';
import { anchoTexto2 } from '../arte2/fuente2';
import { ORO_UI, ORO_UI_OSC, PAPEL_ALTO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { spriteFrente2 } from '../arte2/sprites2';
import { COLOR_TIPO } from '../arte/paleta';
import { panelCacheado, relleno } from '../arte2/ui2';
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
  boton,
  centrado,
  chipTiempo,
  colorEnt,
  dormir,
  envolver,
  fondoPapel,
  insignaTipo,
  menuIcono,
  oscurecer,
  recortar,
  parpadea,
  textoGrande,
  rect,
  reposo,
  t,
  texto2,
} from './ui';

export interface PlazaDraft {
  entrenador: EntrenadorId;
  nombre: string;
}

/** The grid: 6 columns × 4 rows for the 24 useritos (a 32×32 thumbnail per 40×44–54 cell, ≥ 65×71 CSS px on a 390 px phone). */
const COLS = 6;
const CELDA_W = ANCHO / COLS;
const MINI_X = Math.floor((CELDA_W - 32) / 2);
const STATS: { clave: 'ps' | 'ata' | 'def' | 'vel' | 'esp'; nombre: string }[] = [
  { clave: 'ps', nombre: 'PS' },
  { clave: 'ata', nombre: 'ATA' },
  { clave: 'def', nombre: 'DEF' },
  { clave: 'vel', nombre: 'VEL' },
  { clave: 'esp', nombre: 'ESP' },
];

export class VistaDraft implements Escena {
  private anim = new Animador();
  private elegidos: string[] = [];
  private orden: number[] = [];
  private turnoDe: number | null = null;
  private fin = 0;
  private sel = 0;
  /** Highlight position in px (grid cell corner); it hops when a bot picks. */
  private hx = -1;
  private hy = -1;
  private detalle: string | null = null;
  /** What the clock last showed (see `paso`). */
  private marcaReloj = -1;
  private foco = 0;
  private resolverPick: ((id: string) => void) | null = null;
  private apelear = false;
  private ultimoTic = -1;
  private vaga = 0;
  /** Set by the flow: the player chose ABANDONAR in the pause box. */
  alAbandonar: (() => void) | null = null;
  private precargado = false;
  private avisoTxt = '';
  private avisoHasta = 0;
  /** The bar of the battle that follows, when known: its tune is the one decoded during the draft. */
  escenario: EscenarioId | undefined;

  /** `miSeat`: the seat of this screen's player (null when only watching). */
  constructor(
    private plazas: PlazaDraft[],
    private miSeat: number | null,
  ) {
    this.sel = 0;
  }

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
      this.detalle = this.detalle === id ? null : this.detalle;
      if (k >= 0) {
        this.sel = k;
        const [dx, dy] = this.celda(k);
        const x0 = this.hx < 0 ? dx : this.hx;
        const y0 = this.hy < 0 ? dy : this.hy;
        await this.anim.animar(this.hx < 0 ? 0 : 200, (p) => {
          this.hx = x0 + (dx - x0) * p;
          this.hy = y0 + (dy - y0) * p;
        });
      }
      this.elegidos = draft.elegidos.slice(0, i + 1);
      sonido.efecto('elegido');
      sonido.grito(id);
      await dormir(650);
    }
    this.elegidos = draft.elegidos.slice();
    this.turnoDe = turnoDe;
    this.fin = Date.now() + plazoMs;
    this.ultimoTic = -1;
    if (turnoDe === null) {
      this.detalle = null;
      this.resolverPick = null;
      this.apelear = true;
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

  /** The local player's pick: resolves with the species id when they confirm it on the card. */
  pedirPick(): Promise<string> {
    return new Promise((res) => {
      this.resolverPick = (id) => {
        this.resolverPick = null;
        this.detalle = null;
        res(id);
      };
    });
  }

  // ------------------------------------------------------------------ geometry

  private layout(H: number) {
    const extra = Math.max(0, H - 384);
    const yJug = 22;
    const hCelda = 36 + Math.min(4, Math.floor(extra / 30));
    const yInfo = yJug + 2 * hCelda + 4;
    const cellH = Math.max(44, Math.min(54, 44 + Math.floor(extra / 14)));
    const yGrid = H - 3 - cellH * 4;
    return { yJug, hCelda, yInfo, hInfo: yGrid - yInfo - 3, yGrid, cellH };
  }

  private celda(k: number): [number, number] {
    const L = this.layout(pantalla().alto);
    return [(k % COLS) * CELDA_W, L.yGrid + Math.floor(k / COLS) * L.cellH];
  }

  private dueno(id: string): number {
    const i = this.elegidos.indexOf(id);
    return i < 0 ? -1 : this.orden[i];
  }

  private get miTurno(): boolean {
    return this.resolverPick !== null && this.turnoDe !== null && this.turnoDe === this.miSeat;
  }

  // ------------------------------------------------------------------ input

  private abrir(id: string) {
    if (this.dueno(id) >= 0) return;
    this.detalle = id;
    this.foco = this.miTurno ? 0 : 1;
    sonido.efecto('aceptar');
  }

  private confirmar() {
    if (!this.detalle || !this.miTurno) return;
    const id = this.detalle;
    this.resolverPick?.(id);
  }

  accion(a: Accion): boolean {
    if (this.detalle) {
      if (a === 'atras') {
        this.detalle = null;
        sonido.efecto('atras');
      } else if (a === 'izq' || a === 'der' || a === 'arriba' || a === 'abajo') {
        if (this.miTurno) this.foco = 1 - this.foco;
        sonido.efecto('cursor');
      } else if (a === 'aceptar') {
        if (this.foco === 0 && this.miTurno) this.confirmar();
        else {
          this.detalle = null;
          sonido.efecto('atras');
        }
      }
      return true;
    }
    if (a === 'atras') {
      void this.pausar();
      return true;
    }
    const n = ESPECIES.length;
    let k = this.sel;
    if (a === 'izq') k = (k + n - 1) % n;
    else if (a === 'der') k = (k + 1) % n;
    else if (a === 'arriba') k = (k + n - COLS) % n;
    else if (a === 'abajo') k = (k + COLS) % n;
    else if (a === 'aceptar') {
      this.abrir(ESPECIES[k].id);
      return true;
    } else return false;
    this.sel = k;
    [this.hx, this.hy] = this.celda(k);
    sonido.efecto('cursor');
    return true;
  }

  /** The guide over the card, on the statistics page (the countdown keeps running underneath). */
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
      // While a machine thinks, the highlight wanders over the free useritos.
      if (this.turnoDe !== this.miSeat && !this.detalle && !this.anim.activo) {
        this.vaga -= dt;
        if (this.vaga <= 0) {
          this.vaga = 230;
          const libres = ESPECIES.map((_, k) => k).filter((k) => this.dueno(ESPECIES[k].id) < 0);
          if (libres.length) {
            this.sel = libres[Math.floor(Math.random() * libres.length)];
            [this.hx, this.hy] = this.celda(this.sel);
            mueve = true;
          }
        }
      }
      // Redraw for the clock and the turn's blink only when they show something new, not every frame.
      const marca = seg * 2 + (Math.floor(performance.now() / 400) % 2);
      if (marca !== this.marcaReloj) {
        this.marcaReloj = marca;
        mueve = true;
      }
    }
    // The card's sprite breathes: a redraw twice a second is enough (the screen also redraws every quarter second).
    return mueve || Date.now() < this.avisoHasta;
  }

  // ------------------------------------------------------------------ drawing

  dibujar(ctx: CanvasRenderingContext2D, ahora: number) {
    const H = pantalla().alto;
    const L = this.layout(H);
    fondoPapel(ctx, H);
    if (this.hx < 0) [this.hx, this.hy] = this.celda(this.sel);
    this.jugadores(ctx, L.yJug, L.hCelda, ahora);
    this.info(ctx, L.yInfo, L.hInfo, ahora);
    this.rejilla(ctx, L, ahora);
    this.barraSuperior(ctx, ahora);
    if (this.detalle) this.tarjeta(ctx, H, ahora);
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
    texto2(ctx, mio ? t('draft.tuturno') : t('draft.elige', { nombre: q.nombre }), 44, 6, mio ? col : TINTA2);
    const seg = Math.max(0, Math.ceil((this.fin - Date.now()) / 1000));
    const rojo = seg <= 5;
    if (!rojo || parpadea(ahora, 400)) chipTiempo(ctx, String(seg), rojo);
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

  private info(ctx: CanvasRenderingContext2D, y: number, h: number, ahora: number) {
    const k = Math.max(0, Math.min(ESPECIES.length - 1, this.sel));
    const sp = ESPECIES[k];
    panelCacheado(ctx, 1, y, ANCHO - 2, h);
    const x0 = 9;
    const ancho = ANCHO - 2 * x0 - 4;
    const color = COLOR_TIPO[sp.tipos[0]];
    // Tall screens: the 64×64 sprite breathes on its mat at the left and the sheet goes to its right.
    const alto = h >= 128;
    let yy = y + 8;
    let xt = x0;
    if (alto) {
      const mat = plataformaCacheada(28, 6);
      ctx.drawImage(mat, x0 + Math.floor((68 - mat.width) / 2), yy + 62 - 12);
      ctx.drawImage(spriteFrente2(sp.id, reposo(ahora)), x0 + 2, yy);
      xt = x0 + 76;
    }
    texto2(ctx, sp.nombre, xt, yy + 2);
    let bx = xt + anchoTexto2(sp.nombre) + 8;
    if (alto) {
      yy += 15;
      bx = xt;
    }
    for (const tp of sp.tipos) bx += insignaTipo(ctx, tp, bx, yy) + 3;
    yy += alto ? 16 : 17;
    // Stats: five columns (label and value, bar underneath), or five short rows beside the sprite.
    if (alto) {
      STATS.forEach((st, i) => {
        const yr = yy + i * 11;
        texto2(ctx, st.nombre, xt, yr, TINTA_SUAVE);
        const v = sp.base[st.clave];
        barraValor(ctx, xt + 24, yr, 62, Math.min(v, 150) / 150, color);
        texto2(ctx, String(v), xt + 90, yr);
      });
      yy = Math.max(y + 8 + 66, yy + STATS.length * 11 + 3);
    } else {
      STATS.forEach((st, i) => {
        const x = 8 + i * 46;
        texto2(ctx, st.nombre, x, yy, TINTA_SUAVE);
        const v = String(sp.base[st.clave]);
        texto2(ctx, v, x + 41 - anchoTexto2(v), yy);
        barraValor(ctx, x, yy + 10, 41, Math.min(sp.base[st.clave], 150) / 150, color);
      });
      yy += 22;
    }
    const desc = envolver(t(`userito.${sp.id}.desc`), ancho);
    if (yy + desc.length * 12 <= y + h - 4) {
      for (const l of desc) {
        texto2(ctx, l, x0, yy, TINTA2);
        yy += 12;
      }
      yy += 3;
    }
    // Moves, two columns, when there is still room.
    if (yy + 2 * 13 <= y + h - 3) {
      sp.movs.forEach((mid, i) => {
        const m = MOVS[mid];
        const x = x0 + (i % 2) * 116;
        const my = yy + Math.floor(i / 2) * 14;
        rect(ctx, TINTA2, x, my, 7, 9);
        rect(ctx, COLOR_TIPO[m.tipo as Tipo], x + 1, my + 1, 5, 7);
        texto2(ctx, recortar(m.nombre, 98), x + 11, my + 1, TINTA2);
      });
    }
  }

  private rejilla(ctx: CanvasRenderingContext2D, L: { yGrid: number; cellH: number }, ahora: number) {
    ESPECIES.forEach((sp, k) => {
      const x = (k % COLS) * CELDA_W;
      const y = L.yGrid + Math.floor(k / COLS) * L.cellH;
      const d = this.dueno(sp.id);
      const sy = y + Math.floor((L.cellH - 32) / 2);
      // The cell's plate.
      relleno(ctx, 'rgba(59,42,63,0.22)', x + 2, y + 1, CELDA_W - 4, L.cellH - 2);
      if (d >= 0) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.drawImage(miniatura(sp.id), x + MINI_X, sy);
        ctx.restore();
        const col = colorEnt(this.plazas[d].entrenador);
        rect(ctx, col, x + 6, y + L.cellH - 5, CELDA_W - 12, 3);
        ctx.drawImage(icono2(this.plazas[d].entrenador), x + Math.floor((CELDA_W - 16) / 2), sy + 8);
      } else {
        ctx.drawImage(miniatura(sp.id), x + MINI_X, sy);
        entrada.zona(x, y, CELDA_W, L.cellH, () => {
          this.sel = k;
          [this.hx, this.hy] = this.celda(k);
          this.abrir(sp.id);
        });
      }
    });
    // The highlight.
    if (this.hx >= 0 && this.turnoDe !== null) {
      const col = this.turnoDe === this.miSeat ? colorEnt(this.plazas[this.turnoDe].entrenador) : ORO_UI;
      const x = Math.round(this.hx);
      const y = Math.round(this.hy);
      const c = parpadea(ahora, 350) ? col : TINTA2;
      const w = CELDA_W - 2;
      rect(ctx, c, x + 1, y, w, 2);
      rect(ctx, c, x + 1, y + L.cellH - 2, w, 2);
      rect(ctx, c, x + 1, y, 2, L.cellH);
      rect(ctx, c, x + w - 1, y, 2, L.cellH);
    }
  }

  // ------------------------------------------------------------------ detail card

  private tarjeta(ctx: CanvasRenderingContext2D, H: number, ahora: number) {
    const id = this.detalle!;
    const sp = ESPECIE[id];
    const k = ESPECIES.findIndex((s) => s.id === id);
    oscurecer(ctx, H);
    entrada.zona(0, 0, ANCHO, H, () => undefined);
    const X = 4;
    const W = ANCHO - 8;
    panelCacheado(ctx, X, 4, W, H - 8);
    texto2(ctx, sp.nombre, X + 12, 15);
    const num = `Nº${String(k + 1).padStart(2, '0')}`;
    const hayTurno = this.turnoDe !== null && !this.apelear;
    texto2(ctx, num, X + 12 + anchoTexto2(sp.nombre) + 8, 15, TINTA_SUAVE);
    let bx = X + 12;
    for (const tp of sp.tipos) bx += insignaTipo(ctx, tp, bx, 31) + 4;
    // The countdown stays on the card (the card hides the top bar): a big chip at the top right, red and
    // blinking in the last five seconds, and under it whose turn it is.
    if (hayTurno) {
      const seg = Math.max(0, Math.ceil((this.fin - Date.now()) / 1000));
      const rojo = seg <= 5;
      const s = String(seg);
      const cw = Math.max(34, anchoTexto2(s) * 2 + 16);
      const cx = X + W - 10 - cw;
      const fuerte = rojo && parpadea(ahora, 400);
      relleno(ctx, TINTA2, cx, 8, cw, 20);
      relleno(ctx, rojo ? (fuerte ? '#e03a2c' : '#9c1c1c') : '#5a4660', cx + 1, 9, cw - 2, 18);
      rect(ctx, 'rgba(255,255,255,0.25)', cx + 2, 9, cw - 4, 1);
      textoGrande(ctx, s, cx + Math.floor((cw - anchoTexto2(s) * 2) / 2), 12, rojo ? '#fff0e0' : '#fdf0c0', 2);
      const q = this.plazas[this.turnoDe!];
      const mio = this.turnoDe === this.miSeat;
      const txt = mio ? t('draft.tuturno') : t('draft.elige', { nombre: q.nombre });
      const tw = anchoTexto2(txt);
      const xr = X + W - 10;
      if (bx + 4 + tw + 20 < xr) {
        ctx.drawImage(icono2(q.entrenador), xr - tw - 20, 29, 16, 16);
        texto2(ctx, txt, xr - tw, 34, mio ? colorEnt(q.entrenador) : TINTA2);
      }
    }
    // Sprite on a beer mat (breathing), with the stats on the right (tap them for the guide).
    const ys = 48;
    const mat = plataformaCacheada(30, 7);
    ctx.drawImage(mat, X + 8 + Math.floor((72 - mat.width) / 2), ys + 62 - 13);
    ctx.drawImage(spriteFrente2(id, reposo(ahora)), X + 12, ys);
    const xs = X + 88;
    STATS.forEach((st, i) => {
      const y = ys + 6 + i * 13;
      texto2(ctx, st.nombre, xs, y, TINTA_SUAVE);
      const v = sp.base[st.clave];
      barraValor(ctx, xs + 24, y, 70, Math.min(v, 150) / 150, COLOR_TIPO[sp.tipos[0]]);
      texto2(ctx, String(v), xs + 100, y);
      entrada.zona(xs - 2, y - 3, 118, 13, () => this.abrirGuiaStats());
    });
    {
      // A small «?» at the end of the first row: «what do these mean?».
      const qx = X + W - 12 - 13;
      const qy = ys + 2;
      relleno(ctx, TINTA2, qx, qy, 13, 13);
      relleno(ctx, '#e8c25a', qx + 1, qy + 1, 11, 11);
      rect(ctx, '#fff3c8', qx + 2, qy + 1, 9, 1);
      texto2(ctx, '?', qx + 4, qy + 3, TINTA2, null);
      entrada.zona(qx - 4, qy - 4, 21, 21, () => this.abrirGuiaStats());
    }
    // Moves, each with its one-line description.
    let ym = ys + 78;
    for (const mid of sp.movs) {
      const m = MOVS[mid];
      rect(ctx, TINTA2, X + 12, ym, 7, 9);
      rect(ctx, COLOR_TIPO[m.tipo as Tipo], X + 13, ym + 1, 5, 7);
      texto2(ctx, m.nombre, X + 24, ym + 1, TINTA2);
      const pp = `PP ${m.pp}`;
      texto2(ctx, pp, X + W - 12 - anchoTexto2(pp), ym + 1, TINTA_SUAVE);
      // Quick, protection or slow: its pixel icon, left of the PP.
      const clase = clasePrioridad(m.prioridad);
      if (clase) ctx.drawImage(iconoPrioridad(clase), X + W - 12 - anchoTexto2(pp) - LADO_ICONO_PRIO - 4, ym);
      const dm = envolver(t(`mov.${mid}.desc`), W - 40).slice(0, 2);
      dm.forEach((l, i) => texto2(ctx, l, X + 24, ym + 13 + i * 12, TINTA_SUAVE, null));
      ym += 17 + dm.length * 12;
    }
    // Type matchups of this userito (from its types, via the engine's chart), then the description if there is still room.
    const yb = H - 4 - 38;
    const cw = W - 24;
    const pega = [...new Set(sp.tipos.flatMap((a) => defensoresCon(a, 2)))];
    const pegan = atacantesFuertes(sp.tipos);
    const inmune = TIPOS.filter((a) => eficacia(a, sp.tipos) === 0);
    const grupos: [string, readonly Tipo[], boolean][] = [
      [t('draft.pega'), pega, false],
      [t('draft.pegan'), pegan, true],
    ];
    if (inmune.length) grupos.push([t('draft.inmune'), inmune, false]);
    const x4 = (tp: Tipo) => (eficacia(tp, sp.tipos) >= 4 ? t('draft.x4') : '');
    const altoGrupos = (gs: typeof grupos) => gs.reduce((a, [, l, d]) => a + 12 + hileraTipos(null, l, 0, 0, cw, d ? x4 : undefined) + 3, 0);
    const desc = envolver(t(`userito.${id}.desc`), W - 28);
    const altoDesc = 8 + desc.length * 12;
    let gs = grupos;
    let conDesc = ym + 4 + altoDesc + 4 + altoGrupos(gs) <= yb - 2;
    if (!conDesc && ym + 4 + altoGrupos(gs) > yb - 2 && gs.length > 2) gs = gs.slice(0, 2);
    if (!conDesc && ym + 4 + altoGrupos(gs) > yb - 2) gs = [];
    let yd = ym + 4;
    if (conDesc || (gs.length === 0 && yd + altoDesc <= yb)) {
      rect(ctx, '#d6c08a', X + 12, yd - 4, W - 24, 1);
      for (const l of desc) {
        texto2(ctx, l, X + 12, yd + 4);
        yd += 12;
      }
      yd += 6;
      conDesc = true;
    }
    if (gs.length) {
      let yy = yd + (conDesc ? 4 : 0);
      rect(ctx, '#d6c08a', X + 12, yy - 4, W - 24, 1);
      yy += 2;
      for (const [lab, l, d] of gs) {
        texto2(ctx, lab, X + 12, yy, TINTA_SUAVE, null);
        yy += 12;
        yy += hileraTipos(ctx, l, X + 12, yy, cw, d ? x4 : undefined) + 3;
      }
    }
    // Buttons.
    const mio = this.miTurno;
    const bw = 100;
    boton(ctx, X + 10, yb, bw, 28, t('draft.elegir'), mio && this.foco === 0, mio);
    boton(ctx, X + W - 10 - bw, yb, bw, 28, t('draft.volver'), this.foco === 1 || !mio);
    if (mio) entrada.zona(X + 10, yb, bw, 28, () => this.confirmar());
    entrada.zona(X + W - 10 - bw, yb, bw, 28, () => {
      this.detalle = null;
      sonido.efecto('atras');
    });
  }
}

void ORO_UI_OSC;
