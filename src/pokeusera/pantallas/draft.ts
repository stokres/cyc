// PokéUsera · the draft (snake order): who is choosing, every player's picks so far, the grid of
// the 20 useritos and the detail card. It draws only from what it is told (`alDraft`: the draft
// state, whose turn and for how long), so a guest can feed it from network messages too.
import type { EntrenadorId, EstadoDraft, Tipo } from '../tipos';
import { ESPECIE, ESPECIES, MOVS } from '../datos';
import { anchoMini, dibujarMini, dibujarTexto, envolver } from '../arte/fuente';
import { insignaTipo, marco } from '../arte/marcos';
import { CLARO, COLOR_TIPO, FONDO, NEGRO, OSCURO, PAPEL, PS_ROJO } from '../arte/paleta';
import { icono, spriteFrente } from '../arte/sprites';
import { entrada, type Accion } from '../entrada';
import { pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { menuPausa } from './ajustes';
import { Animador, boton, centrado, colorEnt, dibujaEscalado, dormir, menuIcono, parpadea, rect, t, velo } from './ui';

export interface PlazaDraft {
  entrenador: EntrenadorId;
  nombre: string;
}

const COLS = 5;
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
  private foco = 0;
  private resolverPick: ((id: string) => void) | null = null;
  private apelear = false;
  private ultimoTic = -1;
  private vaga = 0;
  /** Set by the flow: the player chose ABANDONAR in the pause box. */
  alAbandonar: (() => void) | null = null;

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
    const extra = Math.max(0, H - 256);
    const yJug = 18;
    const hCelda = 20 + Math.min(8, Math.floor(extra / 10));
    const yInfo = yJug + 2 * hCelda + 3;
    // The grid takes what it needs; whatever is left goes to the info strip.
    const resto = H - yInfo - 28 - 4;
    const cellH = Math.max(34, Math.min(46, Math.floor(resto / 4)));
    const yGrid = H - 2 - cellH * 4;
    return { yJug, hCelda, yInfo, hInfo: yGrid - yInfo - 2, yGrid, cellH };
  }

  private celda(k: number): [number, number] {
    const L = this.layout(pantalla().alto);
    return [(k % COLS) * 32, L.yGrid + Math.floor(k / COLS) * L.cellH];
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
          }
        }
      }
      mueve = true;
    }
    return mueve;
  }

  // ------------------------------------------------------------------ drawing

  dibujar(ctx: CanvasRenderingContext2D, ahora: number) {
    const H = pantalla().alto;
    const L = this.layout(H);
    rect(ctx, FONDO, 0, 0, 160, H);
    if (this.hx < 0) [this.hx, this.hy] = this.celda(this.sel);
    this.barraSuperior(ctx, ahora);
    this.jugadores(ctx, L.yJug, L.hCelda, ahora);
    this.info(ctx, L.yInfo, L.hInfo);
    this.rejilla(ctx, L, ahora);
    if (this.detalle) this.tarjeta(ctx, H);
    if (this.apelear) {
      marco(ctx, 20, Math.round(H / 2) - 20, 120, 40);
      centrado(ctx, t('draft.apelear'), Math.round(H / 2) - 4, NEGRO);
    }
  }

  private barraSuperior(ctx: CanvasRenderingContext2D, ahora: number) {
    rect(ctx, PAPEL, 0, 0, 160, 16);
    rect(ctx, NEGRO, 0, 16, 160, 1);
    menuIcono(ctx, 4, 4);
    entrada.zona(0, 0, 20, 18, () => void this.pausar());
    if (this.turnoDe === null) {
      if (!this.apelear) dibujarTexto(ctx, t('draft.titulo'), 20, 4, NEGRO);
      return;
    }
    const q = this.plazas[this.turnoDe];
    const col = colorEnt(q.entrenador);
    ctx.drawImage(icono(q.entrenador), 18, 4);
    const mio = this.turnoDe === this.miSeat;
    dibujarTexto(ctx, mio ? t('draft.tuturno') : t('draft.elige', { nombre: q.nombre }), 29, 4, mio ? col : NEGRO);
    const seg = Math.max(0, Math.ceil((this.fin - Date.now()) / 1000));
    const rojo = seg <= 5;
    const s = String(seg);
    if (!rojo || parpadea(ahora, 400)) dibujarTexto(ctx, s, 157 - s.length * 8, 4, rojo ? PS_ROJO : NEGRO);
  }

  private jugadores(ctx: CanvasRenderingContext2D, y0: number, h: number, ahora: number) {
    const n = this.plazas.length;
    for (let j = 0; j < n; j++) {
      const x = (j % 2) * 80;
      const y = y0 + Math.floor(j / 2) * h;
      const q = this.plazas[j];
      const col = colorEnt(q.entrenador);
      const turno = this.turnoDe === j;
      rect(ctx, turno ? PAPEL : FONDO, x + 1, y + 1, 78, h - 2);
      rect(ctx, col, x + 1, y + h - 3, 78, 2);
      if (turno && parpadea(ahora, 400)) {
        rect(ctx, col, x + 1, y + 1, 78, 1);
      }
      ctx.drawImage(icono(q.entrenador), x + 3, y + 5);
      const propios = this.elegidos.filter((_, i) => this.orden[i] === j);
      for (let s = 0; s < 3; s++) {
        const sx = x + 15 + s * 21;
        if (propios[s]) dibujaEscalado(ctx, spriteFrente(propios[s]), sx, y + 1, 16, 16);
        else {
          const prox = turno && s === propios.length;
          rect(ctx, prox && parpadea(ahora, 300) ? col : CLARO, sx + 4, y + 8, 8, 2);
        }
      }
    }
  }

  private info(ctx: CanvasRenderingContext2D, y: number, h: number) {
    const k = Math.max(0, Math.min(ESPECIES.length - 1, this.sel));
    const sp = ESPECIES[k];
    const desc = envolver(t(`userito.${sp.id}.desc`), 152);
    // What fits: name and types; then the five stats; then the description.
    const conStats = h >= 44;
    const conDesc = h >= 44 + desc.length * 10 + 2;
    const alto = 12 + (conStats ? 17 : 0) + (conDesc ? desc.length * 10 + 2 : 0);
    let yy = y + Math.max(1, Math.floor((h - alto) / 2));
    dibujarTexto(ctx, sp.nombre, 4, yy + 1, NEGRO);
    let bx = 4 + 8 * (sp.nombre.length + 1);
    for (const tp of sp.tipos) bx += insignaTipo(ctx, tp, bx, yy) + 2;
    yy += 14;
    if (conStats) {
      STATS.forEach((st, i) => {
        const x = 3 + i * 31;
        dibujarMini(ctx, st.nombre, x, yy, OSCURO);
        const v = sp.base[st.clave];
        dibujarMini(ctx, String(v), x + 13, yy, NEGRO);
        rect(ctx, NEGRO, x, yy + 7, 29, 4);
        rect(ctx, CLARO, x + 1, yy + 8, 27, 2);
        rect(ctx, COLOR_TIPO[sp.tipos[0]], x + 1, yy + 8, Math.max(1, Math.round((27 * Math.min(v, 150)) / 150)), 2);
      });
      yy += 15;
    }
    if (conDesc) {
      for (const l of desc) {
        dibujarTexto(ctx, l, 4, yy, OSCURO);
        yy += 10;
      }
    }
  }

  private rejilla(ctx: CanvasRenderingContext2D, L: { yGrid: number; cellH: number }, ahora: number) {
    ESPECIES.forEach((sp, k) => {
      const x = (k % COLS) * 32;
      const y = L.yGrid + Math.floor(k / COLS) * L.cellH;
      const d = this.dueno(sp.id);
      const sy = y + Math.floor((L.cellH - 32) / 2);
      if (d >= 0) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.drawImage(spriteFrente(sp.id), x, sy);
        ctx.restore();
        const col = colorEnt(this.plazas[d].entrenador);
        rect(ctx, col, x + 2, y + L.cellH - 4, 28, 3);
        ctx.drawImage(icono(this.plazas[d].entrenador), x + 12, sy + 12);
      } else {
        ctx.drawImage(spriteFrente(sp.id), x, sy);
        entrada.zona(x, y, 32, L.cellH, () => {
          this.sel = k;
          [this.hx, this.hy] = this.celda(k);
          this.abrir(sp.id);
        });
      }
    });
    // The highlight.
    if (this.hx >= 0 && this.turnoDe !== null) {
      const col = this.turnoDe === this.miSeat ? colorEnt(this.plazas[this.turnoDe].entrenador) : NEGRO;
      const x = Math.round(this.hx);
      const y = Math.round(this.hy);
      const c = parpadea(ahora, 350) ? col : OSCURO;
      rect(ctx, c, x, y, 32, 1);
      rect(ctx, c, x, y + L.cellH - 1, 32, 1);
      rect(ctx, c, x, y, 1, L.cellH);
      rect(ctx, c, x + 31, y, 1, L.cellH);
    }
  }

  // ------------------------------------------------------------------ detail card

  private tarjeta(ctx: CanvasRenderingContext2D, H: number) {
    const id = this.detalle!;
    const sp = ESPECIE[id];
    const k = ESPECIES.findIndex((s) => s.id === id);
    const extra = Math.max(0, Math.min(1, (H - 256) / 90));
    const g = Math.round(extra * 8);
    velo(ctx, 0, 0, 160, H, NEGRO, 0.5);
    entrada.zona(0, 0, 160, H, () => undefined);
    marco(ctx, 2, 2, 156, H - 4);
    dibujarTexto(ctx, sp.nombre, 9, 9, NEGRO);
    const num = `#${String(k + 1).padStart(2, '0')}`;
    dibujarMini(ctx, num, 152 - anchoMini(num), 11, OSCURO);
    let bx = 9;
    for (const tp of sp.tipos) bx += insignaTipo(ctx, tp, bx, 21) + 3;
    // Sprite at double size, with stats on the right.
    const ys = 35 + g;
    rect(ctx, FONDO, 8, ys - 2, 68, 68);
    dibujaEscalado(ctx, spriteFrente(id), 10, ys, 64, 64);
    STATS.forEach((st, i) => {
      const x = 82;
      const y = ys + 2 + i * (12 + Math.floor(g / 4));
      dibujarMini(ctx, st.nombre, x, y, OSCURO);
      const v = sp.base[st.clave];
      rect(ctx, NEGRO, x + 14, y, 40, 6);
      rect(ctx, CLARO, x + 15, y + 1, 38, 4);
      rect(ctx, COLOR_TIPO[sp.tipos[0]], x + 15, y + 1, Math.max(1, Math.round((38 * Math.min(v, 150)) / 150)), 4);
      dibujarMini(ctx, String(v), x + 58, y, NEGRO);
    });
    // Moves (with their one-line description when the screen is tall enough).
    const conDescMov = H >= 300;
    let ym = ys + 72 + g;
    for (const mid of sp.movs) {
      const m = MOVS[mid];
      const dm = conDescMov ? envolver(t(`mov.${mid}.desc`), 36 * 8).slice(0, 2) : [];
      const alto = conDescMov ? 12 + dm.length * 6 + 2 : 12;
      rect(ctx, COLOR_TIPO[m.tipo as Tipo], 9, ym, 5, 9);
      rect(ctx, NEGRO, 9, ym + 9, 5, 1);
      const largo = Array.from(m.nombre).length > 14;
      if (largo) dibujarMini(ctx, m.nombre, 18, ym + 2, NEGRO);
      else dibujarTexto(ctx, m.nombre, 18, ym + 1, NEGRO);
      const pp = `PP ${m.pp}`;
      dibujarMini(ctx, pp, 150 - anchoMini(pp), ym + 2, OSCURO);
      dm.forEach((l, i) => dibujarMini(ctx, l, 18, ym + 11 + i * 6, OSCURO));
      ym += alto;
    }
    // Description.
    const desc = envolver(t(`userito.${id}.desc`), 140);
    let yd = ym + 4 + Math.floor(g / 2);
    for (const l of desc) {
      dibujarTexto(ctx, l, 9, yd, NEGRO);
      yd += 10;
    }
    // Buttons.
    const yb = H - 32;
    const mio = this.miTurno;
    boton(ctx, 10, yb, 66, 22, t('draft.elegir'), mio && this.foco === 0, mio);
    boton(ctx, 84, yb, 66, 22, t('draft.volver'), this.foco === 1 || !mio);
    if (mio) entrada.zona(10, yb, 66, 22, () => this.confirmar());
    entrada.zona(84, yb, 66, 22, () => {
      this.detalle = null;
      sonido.efecto('atras');
    });
  }
}
