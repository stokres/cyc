// PokéUsera · «TU EQUIPO AL AZAR» (mode AL AZAR, docs/POKEUSERA.md): where the draft and «La barra» would be, each player sees what the game dealt
// them: their three useritos, the object and who carries it, and the others' teams for reference (the useritos of the rivals are public, as in the
// draft; their objects are not). The only button is ¡A PELEAR!, which leads to «¿Quién sale primero?». The deal comes in from outside (`pedir`: the
// host's own seat in the Partida, or a network message for a guest) and the screen hands back «seen».
//
// Performance (docs/ESTILO.md, T5/T6): everything is baked once (the three cells with their sprites, the object card, the rivals' cells) and the
// screen is `estatica`. Without a time limit (solo play) nothing ever asks for a redraw while it rests; with one (online) only the clock's second does.
import type { EscenarioId, ObjetoId } from '../tipos';
import { ESPECIE } from '../datos';
import { anchoTexto2 } from '../arte2/fuente2';
import { ORO_UI, PAPEL_ALTO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { spriteFrente2 } from '../arte2/sprites2';
import { hornear, panel, relleno } from '../arte2/ui2';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { menuPausa } from './ajustes';
import { carta as cartaObjeto } from './barra';
import type { PlazaDraft } from './draft';
import { miniatura } from './fondos';
import { LADO_ICONO_OBJETO, iconoObjeto } from './iconosObjeto';
import { Firma, barraArriba, boton, centrado, chipTiempo, chipTipo, colorEnt, envolver, fondoPapel, menuIcono, parpadea, recortar, rect, t, texto2 } from './ui';

const X0 = 4;
const AN = ANCHO - 8;
const ANCHO_CELDA = 74;
const ALTO_CARTA = 62;
const ALTO_RIVAL = 46;
const ALTO_BOTON = 28;
/** The screen's clock stops a moment before the host's. */
const MARGEN_PLAZO = 300;

/** Where everything sits on a screen of height `H` (the free height grows the cells, the object card and the gaps a little; the rest is split above and below). */
function medidas(H: number, hayRivales: boolean) {
  const yBoton = H - 36;
  const hRiv = hayRivales ? 13 + ALTO_RIVAL + 6 : 0;
  // 14 (hint) + 4 + cells + 6 + card + 14 (who carries it) + 6 + rivals + 26 (note)
  const minimo = 14 + 4 + 100 + 6 + ALTO_CARTA + 14 + 6 + hRiv + 26;
  const disponible = yBoton - 4 - 22;
  let sobra = Math.max(0, disponible - minimo);
  const extraCelda = Math.min(28, Math.floor(sobra * 0.4));
  sobra -= extraCelda;
  const extraCarta = Math.min(12, Math.floor(sobra * 0.3));
  sobra -= extraCarta;
  const extraHueco = Math.min(10, Math.floor(sobra / 3));
  sobra -= 3 * extraHueco;
  const g = 6 + extraHueco;
  const hCelda = 100 + extraCelda;
  const hCarta = ALTO_CARTA + extraCarta;
  let y = 22 + Math.floor(sobra / 2);
  const yPista = y;
  y += 14 + 4;
  const yCeldas = y;
  y += hCelda + g;
  const yCarta = y;
  y += hCarta + 2;
  const yLleva = y;
  y += 14 + g;
  const yRivEtiqueta = y;
  const yRivales = y + 13;
  y = yRivales + (hayRivales ? ALTO_RIVAL : 0) + g;
  return { yBoton, yPista, yCeldas, hCelda, yCarta, hCarta, yLleva, yRivEtiqueta, yRivales, yNota: y };
}

/** One of the player's useritos, baked with its sprite (frame 0, no breathing: the screen rests): panel, sprite, name and types. */
function celda(especie: string, h: number): HTMLCanvasElement {
  return hornear(`azar|celda|${especie}|${h}`, ANCHO_CELDA, h + 2, (cx) => {
    const sp = ESPECIE[especie];
    panel(cx, 0, 0, ANCHO_CELDA, h);
    const sy = 4 + Math.floor((h - 100) / 3);
    cx.drawImage(spriteFrente2(especie, 0), Math.floor((ANCHO_CELDA - 64) / 2), sy);
    const nombre = recortar(sp.nombre, ANCHO_CELDA - 8);
    texto2(cx, nombre, Math.floor((ANCHO_CELDA - anchoTexto2(nombre)) / 2), sy + 67, TINTA2, null);
    const w = sp.tipos.reduce((a, tp) => a + anchoTexto2(t(`tipo.abrev.${tp}`)) + 7 + 3, -3);
    let x = Math.floor((ANCHO_CELDA - w) / 2);
    for (const tp of sp.tipos) x += chipTipo(cx, tp, x, sy + 78) + 3;
  });
}

/** A rival's team in a small cell: the trainer's colour and name, and the three useritos as small thumbnails. */
function celdaRival(color: string, nombre: string, especies: string[]): HTMLCanvasElement {
  return hornear(`azar|rival|${color}|${nombre}|${especies.join()}`, ANCHO_CELDA, ALTO_RIVAL + 2, (cx) => {
    panel(cx, 0, 0, ANCHO_CELDA, ALTO_RIVAL, color);
    const n = recortar(nombre, ANCHO_CELDA - 10);
    texto2(cx, n, Math.floor((ANCHO_CELDA - anchoTexto2(n)) / 2), 6, TINTA2, null);
    cx.imageSmoothingEnabled = true;
    especies.slice(0, 3).forEach((e, k) => cx.drawImage(miniatura(e), 0, 0, 32, 32, 2 + k * 24, 18, 24, 24));
    cx.imageSmoothingEnabled = false;
  });
}

export class VistaAzar implements Escena {
  readonly estatica = true;
  private equipos: string[][] = [];
  private objetos: (ObjetoId | null)[] = [];
  /** 0: no time limit (solo play), otherwise when the clock runs out. */
  private fin = 0;
  private hecho = false;
  private resolver: (() => void) | null = null;
  private ultimoTic = -1;
  private firma = new Firma(2);
  private iniciada = false;
  /** The bar of the battle that follows, when known: its tune is decoded while the player looks at the team. */
  escenario: EscenarioId | undefined;
  /** Set by the flow: the player chose ABANDONAR in the pause box. */
  alAbandonar: (() => void) | null = null;

  /** `plazas`: the trainer and name of each seat; `miSeat`: this screen's player. */
  constructor(
    private plazas: PlazaDraft[],
    private miSeat: number | null,
  ) {}

  /** Shows the dealt team of this seat (`equipos[miSeat]`, with `objetos`: what each of its useritos carries) and resolves when the player presses ¡A PELEAR! (or time runs out). `plazoMs` ≤ 0: no limit. */
  pedir(equipos: string[][], objetos: (ObjetoId | null)[], plazoMs: number): Promise<void> {
    this.equipos = equipos;
    this.objetos = objetos;
    this.hecho = false;
    this.ultimoTic = -1;
    this.firma = new Firma(2);
    this.fin = plazoMs > 0 ? Date.now() + Math.max(1000, plazoMs - MARGEN_PLAZO) : 0;
    if (!this.iniciada) {
      // The draft would have started its tune here (and decoded the battle's a few seconds in).
      this.iniciada = true;
      sonido.musica('draft');
      setTimeout(() => {
        sonido.elegirCombate(this.escenario);
        sonido.precargar('combate');
      }, 4000);
    }
    sonido.efecto('turno');
    pantalla().redibujar();
    return new Promise((res) => {
      this.resolver = res;
    });
  }

  private get mio(): string[] {
    return (this.miSeat !== null ? this.equipos[this.miSeat] : null) ?? [];
  }

  private confirmar() {
    if (this.hecho || !this.resolver) return;
    this.hecho = true;
    sonido.efecto('elegido');
    const res = this.resolver;
    this.resolver = null;
    pantalla().redibujar();
    res();
  }

  private async pausar() {
    sonido.efecto('aceptar');
    if ((await menuPausa(this)) === 'abandonar') this.alAbandonar?.();
  }

  accion(a: Accion): boolean {
    if (a === 'atras') void this.pausar();
    else if (a === 'aceptar') this.confirmar();
    return true;
  }

  paso(): boolean {
    if (!this.resolver || !this.fin) return false;
    if (Date.now() >= this.fin) {
      this.confirmar();
      return true;
    }
    const seg = Math.max(0, Math.ceil((this.fin - Date.now()) / 1000));
    if (seg <= 5 && seg > 0 && seg !== this.ultimoTic) {
      this.ultimoTic = seg;
      sonido.efecto('tic');
    }
    this.firma.v[0] = seg;
    this.firma.v[1] = seg <= 5 && parpadea(performance.now(), 400) ? 1 : 0;
    return this.firma.cambio();
  }

  dibujar(ctx: CanvasRenderingContext2D, ahora: number) {
    const H = pantalla().alto;
    fondoPapel(ctx, H);
    const col = this.miSeat !== null ? colorEnt(this.plazas[this.miSeat].entrenador) : ORO_UI;
    const esperando = this.hecho;
    const rivales = this.plazas.map((p, j) => ({ p, j })).filter(({ j }) => j !== this.miSeat && this.equipos[j]);
    const m = medidas(H, rivales.length > 0);

    // Top bar.
    barraArriba(ctx);
    menuIcono(ctx, 7, 5);
    entrada.zona(0, 0, 28, 20, () => void this.pausar());
    texto2(ctx, t('azar.titulo'), 28, 6);
    if (this.fin && !esperando) {
      const seg = Math.max(0, Math.ceil((this.fin - Date.now()) / 1000));
      const rojo = seg <= 5;
      if (!rojo || parpadea(ahora, 400)) chipTiempo(ctx, String(seg), rojo);
    }
    centrado(ctx, t('azar.pista'), m.yPista, TINTA_SUAVE, { sombra: null });

    // The three useritos, and the object on the one that carries it.
    const sep = Math.floor((AN - 3 * ANCHO_CELDA) / 2);
    const lleva = this.objetos.findIndex((o) => o !== null);
    this.mio.forEach((e, k) => {
      const x = X0 + k * (ANCHO_CELDA + sep);
      ctx.drawImage(celda(e, m.hCelda), x, m.yCeldas);
      if (k === lleva) {
        this.marco(ctx, x, m.yCeldas, ANCHO_CELDA, m.hCelda, col);
        relleno(ctx, TINTA2, x + ANCHO_CELDA - 18, m.yCeldas + 4, 14, 14);
        relleno(ctx, PAPEL_ALTO, x + ANCHO_CELDA - 17, m.yCeldas + 5, 12, 12);
        ctx.drawImage(iconoObjeto(this.objetos[k] as ObjetoId), 0, 0, LADO_ICONO_OBJETO, LADO_ICONO_OBJETO, x + ANCHO_CELDA - 17, m.yCeldas + 5, LADO_ICONO_OBJETO, LADO_ICONO_OBJETO);
      }
    });

    // The object, with its effect, and who carries it.
    if (lleva >= 0) {
      ctx.drawImage(cartaObjeto(this.objetos[lleva] as ObjetoId, m.hCarta), X0, m.yCarta);
      centrado(ctx, t('azar.lleva', { nombre: ESPECIE[this.mio[lleva]].nombre }), m.yLleva, TINTA_SUAVE, { sombra: null });
    } else centrado(ctx, t('azar.sinobjeto'), m.yCarta + 24, TINTA_SUAVE, { sombra: null });

    // The others' teams (their useritos are public, as in the draft).
    if (rivales.length) {
      centrado(ctx, t('azar.rivales'), m.yRivEtiqueta + 2, TINTA_SUAVE, { sombra: null });
      rivales.forEach(({ p, j }, k) => ctx.drawImage(celdaRival(colorEnt(p.entrenador), p.nombre, this.equipos[j]), X0 + k * (ANCHO_CELDA + sep), m.yRivales));
    }
    envolver(t('azar.secreto'), 220).slice(0, 2).forEach((l, i) => centrado(ctx, l, m.yNota + i * 12, TINTA_SUAVE, { sombra: null }));

    // The button (or the wait).
    if (esperando) {
      const s = t('azar.espera');
      const w = anchoTexto2(s) + 24;
      boton(ctx, Math.floor((ANCHO - w) / 2), m.yBoton, w, ALTO_BOTON, s, false);
    } else {
      const bw = 130;
      const bx = Math.floor((ANCHO - bw) / 2);
      boton(ctx, bx, m.yBoton, bw, ALTO_BOTON, t('azar.apelear'), true);
      entrada.zona(bx, m.yBoton, bw, ALTO_BOTON, () => this.confirmar());
    }
  }

  /** A 2 px frame just inside the box. */
  private marco(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
    rect(ctx, c, x, y, w, 2);
    rect(ctx, c, x, y + h - 2, w, 2);
    rect(ctx, c, x, y, 2, h);
    rect(ctx, c, x + w - 2, y, 2, h);
  }
}
