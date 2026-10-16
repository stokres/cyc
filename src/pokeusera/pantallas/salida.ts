// PokéUsera · «¿Quién sale primero?»: after «La barra» and before the battle each player chooses, in secret and all at once, which of
// their three useritos starts on the field (15 seconds, like the draft). Tap one to mark it, tap it again or press SALIR to confirm; if
// the time runs out the marked one goes, or the first one if nothing is marked. The team comes in from outside (`pedir`: the host's own
// seat in the Partida, or a network message for a guest) and the screen hands back the index.
//
// Performance (docs/ESTILO.md, T5/T6): each card (panel, mat, name, types, move types, object) is baked once; per frame there are three
// cards, three breathing sprites and the frame of the marked one. `paso` asks for a redraw only when the clock's second, a blink or the
// sprites' resting frame changes.
import type { EntrenadorId, ObjetoId } from '../tipos';
import { ESPECIE, MOVS } from '../datos';
import { COLOR_TIPO } from '../arte/paleta';
import { anchoTexto2 } from '../arte2/fuente2';
import { ORO_UI, PAPEL_ALTO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { spriteFrente2 } from '../arte2/sprites2';
import { hornear, panel, relleno } from '../arte2/ui2';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { menuPausa } from './ajustes';
import { plataformaCacheada } from './fondos';
import { LADO_ICONO_OBJETO, iconoObjeto } from './iconosObjeto';
import { Firma, barraArriba, boton, centrado, chipTiempo, colorEnt, colorEntClaro, envolver, fondoPapel, insignaTipo, menuIcono, parpadea, rect, recortar, reposo, t, texto2 } from './ui';

const X0 = 4;
const AN = ANCHO - 8;
const ALTO_CARTA_MIN = 78;
const ALTO_CARTA_MAX = 112;
const ALTO_BOTON = 28;
/** The screen's clock stops a moment before the host's, so the player's choice (not the default) is the one that arrives. */
const MARGEN_PLAZO = 300;
/** Where the sprite sits inside a card (the same corner as in the draft's sheet). */
const SPRITE_X = 10;

/** Where everything sits on a screen of height `H`: the cards take what the note and the button leave (between 78 and 112 px each). */
function medidas(H: number) {
  const yBoton = H - 36;
  const yNota = yBoton - 15;
  const y0 = 38;
  const disponible = yNota - 4 - y0;
  const hCarta = Math.max(ALTO_CARTA_MIN, Math.min(ALTO_CARTA_MAX, Math.floor((disponible - 2 * 4) / 3)));
  const hueco = Math.max(3, Math.min(14, Math.floor((disponible - 3 * hCarta) / 2)));
  const sobra = disponible - 3 * hCarta - 2 * hueco;
  return { yBoton, yNota, y0: y0 + Math.max(0, Math.floor(sobra / 2)), hCarta, hueco };
}

/** One of the player's useritos, baked without the sprite: panel, beer mat, name, types, the types of its four moves and its object. */
function carta(especie: string, objeto: ObjetoId | null, h: number): HTMLCanvasElement {
  return hornear(`salida|carta|${especie}|${objeto ?? '-'}|${h}`, AN, h + 2, (cx) => {
    const sp = ESPECIE[especie];
    panel(cx, 0, 0, AN, h);
    const sy = Math.floor((h - 64) / 2);
    const mat = plataformaCacheada(28, 6);
    cx.drawImage(mat, SPRITE_X - 2 + Math.floor((68 - mat.width) / 2), sy + 62 - 12);
    const x = SPRITE_X + 74;
    texto2(cx, recortar(sp.nombre, AN - x - 8), x, 11);
    let bx = x;
    for (const tp of sp.tipos) bx += insignaTipo(cx, tp, bx, 25) + 3;
    // The types of its four moves: what it can hit.
    texto2(cx, t('salida.movs'), x, 43, TINTA_SUAVE, null);
    let mx = x + anchoTexto2(t('salida.movs')) + 6;
    for (const id of sp.movs) {
      rect(cx, TINTA2, mx, 41, 9, 11);
      rect(cx, COLOR_TIPO[MOVS[id].tipo], mx + 1, 42, 7, 9);
      mx += 12;
    }
    // Its object from «La barra», or nothing.
    const yo = h - 24;
    if (objeto) {
      relleno(cx, TINTA2, x, yo, 16, 16);
      relleno(cx, PAPEL_ALTO, x + 1, yo + 1, 14, 14);
      cx.drawImage(iconoObjeto(objeto), 0, 0, LADO_ICONO_OBJETO, LADO_ICONO_OBJETO, x + 2, yo + 2, LADO_ICONO_OBJETO, LADO_ICONO_OBJETO);
      texto2(cx, recortar(t(`objeto.${objeto}.nombre`), AN - x - 26), x + 21, yo + 5, TINTA2, null);
    } else texto2(cx, t('salida.sinobjeto'), x, yo + 5, TINTA_SUAVE, null);
  });
}

export class VistaSalida implements Escena {
  readonly estatica = true;
  private especies: string[] = [];
  private objetos: (ObjetoId | null)[] = [];
  private fin = 0;
  private sel = -1;
  private hecho: number | null = null;
  private resolver: ((idx: number) => void) | null = null;
  private ultimoTic = -1;
  private firma = new Firma(4);
  /** Set by the flow: the player chose ABANDONAR in the pause box. */
  alAbandonar: (() => void) | null = null;

  /** `entrenador`: whose accent colour the highlight takes (null: gold). */
  constructor(private entrenador: EntrenadorId | null = null) {}

  /** Offers the team `especies` (with the `objetos` they carry); resolves with the index of the one that starts (the player's choice, the marked one or the first when time runs out). */
  pedir(especies: string[], objetos: (ObjetoId | null)[], plazoMs: number): Promise<number> {
    this.especies = especies.slice(0, 3);
    this.objetos = objetos;
    this.sel = -1;
    this.hecho = null;
    this.ultimoTic = -1;
    this.firma = new Firma(4);
    this.fin = Date.now() + Math.max(1000, plazoMs - MARGEN_PLAZO);
    sonido.efecto('turno');
    pantalla().redibujar();
    return new Promise((res) => {
      this.resolver = res;
    });
  }

  // ------------------------------------------------------------------ choosing

  private terminar(idx: number) {
    this.hecho = idx;
    this.sel = idx;
    sonido.efecto('elegido');
    const res = this.resolver;
    this.resolver = null;
    pantalla().redibujar();
    res?.(idx);
  }

  private confirmar() {
    if (this.hecho !== null || !this.resolver || this.sel < 0) return;
    this.terminar(this.sel);
  }

  private marcar(k: number) {
    if (this.hecho !== null || !this.resolver) return;
    if (this.sel === k) {
      this.confirmar();
      return;
    }
    this.sel = k;
    sonido.grito(this.especies[k]);
    pantalla().redibujar();
  }

  private async pausar() {
    sonido.efecto('aceptar');
    if ((await menuPausa(this)) === 'abandonar') this.alAbandonar?.();
  }

  accion(a: Accion): boolean {
    if (this.hecho !== null || !this.resolver) {
      if (a === 'atras') void this.pausar();
      return true;
    }
    const n = this.especies.length;
    if (a === 'atras') void this.pausar();
    else if (a === 'arriba' || a === 'izq') this.marcar(this.sel < 0 ? 0 : (this.sel + n - 1) % n);
    else if (a === 'abajo' || a === 'der') this.marcar(this.sel < 0 ? 0 : (this.sel + 1) % n);
    else if (a === 'aceptar') {
      if (this.sel < 0) this.marcar(0);
      else this.confirmar();
    }
    return true;
  }

  // ------------------------------------------------------------------ clock

  paso(): boolean {
    const v = this.firma.v;
    if (this.resolver && Date.now() >= this.fin) this.terminar(this.sel >= 0 ? this.sel : 0);
    const seg = Math.max(0, Math.ceil((this.fin - Date.now()) / 1000));
    if (this.resolver && seg <= 5 && seg > 0 && seg !== this.ultimoTic) {
      this.ultimoTic = seg;
      sonido.efecto('tic');
    }
    const ahora = performance.now();
    v[0] = seg;
    v[1] = this.resolver && seg <= 5 && parpadea(ahora, 400) ? 1 : 0;
    v[2] = this.resolver && parpadea(ahora, 350) ? 1 : 0;
    v[3] = reposo(ahora);
    return this.firma.cambio();
  }

  // ------------------------------------------------------------------ drawing

  dibujar(ctx: CanvasRenderingContext2D, ahora: number) {
    const H = pantalla().alto;
    fondoPapel(ctx, H);
    const col = this.entrenador ? colorEnt(this.entrenador) : ORO_UI;
    const claro = this.entrenador ? colorEntClaro(this.entrenador) : '#fff3c8';
    const esperando = this.hecho !== null;
    const { yBoton, yNota, y0, hCarta, hueco } = medidas(H);

    // Top bar.
    barraArriba(ctx);
    menuIcono(ctx, 7, 5);
    entrada.zona(0, 0, 28, 20, () => void this.pausar());
    texto2(ctx, t('salida.titulo'), 28, 6);
    const seg = Math.max(0, Math.ceil((this.fin - Date.now()) / 1000));
    const rojo = seg <= 5 && !esperando;
    if (!rojo || parpadea(ahora, 400)) chipTiempo(ctx, String(seg), rojo);
    centrado(ctx, t(esperando ? 'salida.sale' : 'salida.pista', { nombre: this.sel >= 0 ? ESPECIE[this.especies[this.sel]].nombre : '' }), 24, TINTA_SUAVE, { sombra: null });

    // The three useritos.
    const frame = reposo(ahora);
    this.especies.forEach((e, k) => {
      const y = y0 + k * (hCarta + hueco);
      ctx.drawImage(carta(e, this.objetos[k] ?? null, hCarta), X0, y);
      ctx.drawImage(spriteFrente2(e, frame), X0 + SPRITE_X, y + Math.floor((hCarta - 64) / 2));
      if (!esperando) entrada.zona(X0, y, AN, hCarta, () => this.marcar(k));
      if (k === this.sel) this.marco(ctx, X0, y, AN, hCarta, esperando || parpadea(ahora, 350) ? col : claro);
    });

    // The note, and the button (or the wait).
    envolver(t('salida.secreto'), 220).slice(0, 1).forEach((l, i) => centrado(ctx, l, yNota + i * 12, TINTA_SUAVE, { sombra: null }));
    if (esperando) {
      const s = t('salida.espera');
      const w = anchoTexto2(s) + 24;
      boton(ctx, Math.floor((ANCHO - w) / 2), yBoton, w, ALTO_BOTON, s, false);
    } else {
      const bw = 130;
      const bx = Math.floor((ANCHO - bw) / 2);
      const listo = this.sel >= 0;
      boton(ctx, bx, yBoton, bw, ALTO_BOTON, t('salida.salir'), listo, listo, 'principal');
      if (listo) entrada.zona(bx, yBoton, bw, ALTO_BOTON, () => this.confirmar());
    }
  }

  /** A 3 px frame just inside the box (over the panel's own outline, so the marked card stands out). */
  private marco(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
    rect(ctx, c, x, y, w, 3);
    rect(ctx, c, x, y + h - 3, w, 3);
    rect(ctx, c, x, y, 3, h);
    rect(ctx, c, x + w - 3, y, 3, h);
  }
}
