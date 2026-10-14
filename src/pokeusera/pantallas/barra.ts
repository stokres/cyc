// PokéUsera · «La barra»: between the draft and the battle each player is offered three objects, takes one and gives it to one of
// their three useritos (20 seconds, like the draft). The offers come in from outside (`pedir`: the host's own seat in the Partida,
// or a network message for a guest), and the screen hands back the choice. Nobody else sees what was taken: the rivals' objects stay
// hidden until they work (motor/objetos.ts, `ocultarObjetos`). On timeout the machine's taste fills in what is missing.
//
// Performance (docs/ESTILO.md, T5/T6): the three offer cards and the three useritos' cells are baked once; `estatica` is true and
// `paso` says «redraw» only when the clock's second or a blink changes.
import { OBJETOS, type EntrenadorId, type ObjetoId } from '../tipos';
import { ESPECIE } from '../datos';
import { anchoTexto2 } from '../arte2/fuente2';
import { ORO_UI, PAPEL_ALTO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { hornear, panel, relleno } from '../arte2/ui2';
import { entrada, type Accion } from '../entrada';
import { OBJETO_PERMANENTE } from '../datos';
import { objetoBot, valorObjeto, type EleccionObjeto } from '../motor/objetos';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { menuPausa } from './ajustes';
import { miniatura } from './fondos';
import { LADO_ICONO_OBJETO, iconoObjeto } from './iconosObjeto';
import { Firma, barraArriba, boton, centrado, chipTiempo, chipTipo, colorEnt, envolver, fondoPapel, menuIcono, parpadea, recortar, rect, t, texto2 } from './ui';

const X0 = 4;
const AN = ANCHO - 8;
const ALTO_CARTA = 62;
const ALTO_CELDA = 60;
const ANCHO_CELDA = 74;
const ALTO_BOTON = 28;
/** The screen's clock stops a moment before the host's, so the player's choice (not the machine's default) is the one that arrives. */
const MARGEN_PLAZO = 300;

/** Where everything sits on a screen of height `H`: the cards take what the cells and the button leave (up to 22 px taller than the minimum). */
function medidas(H: number) {
  const yBoton = H - 36;
  const yNota = yBoton - 30;
  const yCeldas = yNota - 8 - ALTO_CELDA;
  const yPista2 = yCeldas - 13;
  const disponible = yPista2 - 6 - 36;
  const hCarta = Math.max(ALTO_CARTA, Math.min(ALTO_CARTA + 22, Math.floor((disponible - 8) / 3)));
  const hueco = Math.max(3, Math.min(12, Math.floor((disponible - 3 * hCarta) / 2)));
  return { yBoton, yNota, yCeldas, yPista2, hCarta, hueco };
}

/** One offer, baked: a box with the object's icon at 2×, its name, «UN USO» / «PERMANENTE» and its effect (up to three lines), centred in a card `h` tall. */
function carta(id: ObjetoId, h: number): HTMLCanvasElement {
  return hornear(`barra|carta|${id}|${h}`, AN, h + 2, (cx) => {
    const dy = Math.floor((h - ALTO_CARTA) / 2);
    panel(cx, 0, 0, AN, h);
    relleno(cx, TINTA2, 8, 8 + dy, 28, 28);
    relleno(cx, PAPEL_ALTO, 9, 9 + dy, 26, 26);
    cx.drawImage(iconoObjeto(id), 0, 0, LADO_ICONO_OBJETO, LADO_ICONO_OBJETO, 10, 10 + dy, 24, 24);
    texto2(cx, t(`objeto.${id}.nombre`), 44, 9 + dy);
    const uso = t(OBJETO_PERMANENTE[id] ? 'objeto.perm' : 'objeto.unico');
    texto2(cx, uso, AN - 8 - anchoTexto2(uso), 9 + dy, TINTA_SUAVE, null);
    const lineas = envolver(t(`objeto.${id}.desc`), AN - 44 - 8).slice(0, 3);
    lineas.forEach((l, i) => texto2(cx, l, 44, 24 + dy + i * 12, TINTA2, null));
  });
}

/** One task per offer card for the background baking (`precalentar.ts`). */
export const tareasPrecalentarBarra = (): (() => void)[] => OBJETOS.map((id) => () => void carta(id, medidas(pantalla().alto).hCarta));

/** One of the player's useritos, baked: thumbnail, name and types. */
function celda(especie: string): HTMLCanvasElement {
  return hornear(`barra|celda|${especie}`, ANCHO_CELDA, ALTO_CELDA + 2, (cx) => {
    const sp = ESPECIE[especie];
    panel(cx, 0, 0, ANCHO_CELDA, ALTO_CELDA);
    cx.drawImage(miniatura(especie), Math.floor((ANCHO_CELDA - 32) / 2), 4);
    const nombre = recortar(sp.nombre, ANCHO_CELDA - 8);
    texto2(cx, nombre, Math.floor((ANCHO_CELDA - anchoTexto2(nombre)) / 2), 38, TINTA2, null);
    const w = sp.tipos.reduce((a, tp) => a + anchoTexto2(t(`tipo.abrev.${tp}`)) + 7 + 3, -3);
    let x = Math.floor((ANCHO_CELDA - w) / 2);
    for (const tp of sp.tipos) x += chipTipo(cx, tp, x, 48) + 3;
  });
}

export class VistaBarra implements Escena {
  readonly estatica = true;
  private ofertas: ObjetoId[] = [];
  private especies: string[] = [];
  private fin = 0;
  private selObj = 0;
  private selUser = -1;
  /** Keyboard: 0 = choosing the object, 1 = choosing who takes it. */
  private seccion: 0 | 1 = 0;
  private hecho: EleccionObjeto | null = null;
  private resolver: ((e: EleccionObjeto) => void) | null = null;
  private ultimoTic = -1;
  private firma = new Firma(3);
  /** Set by the flow: the player chose ABANDONAR in the pause box. */
  alAbandonar: (() => void) | null = null;

  /** `entrenador`: whose accent colour the highlight takes (null: gold). */
  constructor(private entrenador: EntrenadorId | null = null) {}

  /** Offers `ofertas` for a team of `especies`; resolves with the choice (the player's, or the machine's taste if time runs out). */
  pedir(ofertas: ObjetoId[], especies: string[], plazoMs: number): Promise<EleccionObjeto> {
    this.ofertas = ofertas;
    this.especies = especies;
    this.selObj = 0;
    this.selUser = -1;
    this.seccion = 0;
    this.hecho = null;
    this.ultimoTic = -1;
    this.firma = new Firma(3);
    this.fin = Date.now() + Math.max(1000, plazoMs - MARGEN_PLAZO);
    sonido.efecto('turno');
    pantalla().redibujar();
    return new Promise((res) => {
      this.resolver = res;
    });
  }

  // ------------------------------------------------------------------ choosing

  private confirmar() {
    if (this.hecho || !this.resolver || this.selObj < 0 || this.selUser < 0) return;
    this.terminar({ objeto: this.ofertas[this.selObj], idx: this.selUser });
  }

  private terminar(el: EleccionObjeto) {
    this.hecho = el;
    this.selObj = this.ofertas.indexOf(el.objeto);
    this.selUser = el.idx;
    sonido.efecto('elegido');
    const res = this.resolver;
    this.resolver = null;
    pantalla().redibujar();
    res?.(el);
  }

  /** Time is up: keep what the player already chose and let the machine's taste fill in the rest. */
  private completar() {
    let objeto: ObjetoId | null = this.selObj >= 0 ? this.ofertas[this.selObj] : null;
    let idx = this.selUser;
    if (objeto === null && idx < 0) {
      this.terminar(objetoBot(this.especies, this.ofertas, Math.random));
      return;
    }
    if (objeto === null) objeto = this.ofertas.reduce((a, b) => (valorObjeto(b, this.especies[idx]) > valorObjeto(a, this.especies[idx]) ? b : a));
    if (idx < 0) {
      const o = objeto;
      idx = this.especies.reduce((a, _e, k) => (valorObjeto(o, this.especies[k]) > valorObjeto(o, this.especies[a]) ? k : a), 0);
    }
    this.terminar({ objeto, idx });
  }

  private elegirObjeto(i: number) {
    if (this.hecho) return;
    this.selObj = i;
    this.seccion = 1;
    sonido.efecto('cursor');
  }

  private elegirUserito(k: number) {
    if (this.hecho) return;
    if (this.selUser === k) {
      this.confirmar();
      return;
    }
    this.selUser = k;
    this.seccion = 1;
    sonido.efecto('cursor');
  }

  private async pausar() {
    sonido.efecto('aceptar');
    if ((await menuPausa(this)) === 'abandonar') this.alAbandonar?.();
  }

  accion(a: Accion): boolean {
    if (this.hecho || !this.resolver) {
      if (a === 'atras') void this.pausar();
      return true;
    }
    if (a === 'atras') {
      if (this.seccion === 1) this.seccion = 0;
      else void this.pausar();
      return true;
    }
    if (this.seccion === 0) {
      if (a === 'arriba' || a === 'abajo') {
        this.selObj = (this.selObj + (a === 'abajo' ? 1 : this.ofertas.length - 1)) % this.ofertas.length;
        sonido.efecto('cursor');
      } else if (a === 'aceptar' || a === 'der') {
        this.seccion = 1;
        if (this.selUser < 0) this.selUser = 0;
        sonido.efecto('cursor');
      }
    } else if (a === 'izq' || a === 'der') {
      const n = this.especies.length;
      this.selUser = (Math.max(0, this.selUser) + (a === 'der' ? 1 : n - 1)) % n;
      sonido.efecto('cursor');
    } else if (a === 'arriba') {
      this.seccion = 0;
      sonido.efecto('cursor');
    } else if (a === 'aceptar') this.confirmar();
    pantalla().redibujar();
    return true;
  }

  // ------------------------------------------------------------------ clock

  paso(): boolean {
    const v = this.firma.v;
    if (this.resolver && Date.now() >= this.fin) this.completar();
    const seg = Math.max(0, Math.ceil((this.fin - Date.now()) / 1000));
    if (this.resolver && seg <= 5 && seg > 0 && seg !== this.ultimoTic) {
      this.ultimoTic = seg;
      sonido.efecto('tic');
    }
    const ahora = performance.now();
    v[0] = seg;
    v[1] = this.resolver && seg <= 5 && parpadea(ahora, 400) ? 1 : 0;
    v[2] = this.resolver && parpadea(ahora, 350) ? 1 : 0;
    return this.firma.cambio();
  }

  // ------------------------------------------------------------------ drawing

  dibujar(ctx: CanvasRenderingContext2D, ahora: number) {
    const H = pantalla().alto;
    fondoPapel(ctx, H);
    const col = this.entrenador ? colorEnt(this.entrenador) : ORO_UI;
    const esperando = this.hecho !== null;
    const { yBoton, yNota, yCeldas, yPista2, hCarta, hueco } = medidas(H);

    // Top bar.
    barraArriba(ctx);
    menuIcono(ctx, 7, 5);
    entrada.zona(0, 0, 28, 20, () => void this.pausar());
    texto2(ctx, t('barra.titulo'), 28, 6);
    const seg = Math.max(0, Math.ceil((this.fin - Date.now()) / 1000));
    const rojo = seg <= 5 && !esperando;
    if (!rojo || parpadea(ahora, 400)) chipTiempo(ctx, String(seg), rojo);

    // The three offers.
    centrado(ctx, t('barra.pista1'), 24, TINTA_SUAVE, { sombra: null });
    this.ofertas.forEach((id, i) => {
      const y = 36 + i * (hCarta + hueco);
      ctx.drawImage(carta(id, hCarta), X0, y);
      if (!esperando) entrada.zona(X0, y, AN, hCarta, () => this.elegirObjeto(i));
      if (i === this.selObj) this.marco(ctx, X0, y, AN, hCarta, esperando || this.seccion === 1 || parpadea(ahora, 350) ? col : TINTA2);
    });

    // Who takes it.
    centrado(ctx, t(esperando ? 'barra.lleva' : 'barra.pista2', { nombre: this.selUser >= 0 ? ESPECIE[this.especies[this.selUser]].nombre : '' }), yPista2, TINTA_SUAVE, { sombra: null });
    const sep = Math.floor((AN - 3 * ANCHO_CELDA) / 2);
    this.especies.forEach((e, k) => {
      const x = X0 + k * (ANCHO_CELDA + sep);
      ctx.drawImage(celda(e), x, yCeldas);
      if (!esperando) entrada.zona(x, yCeldas, ANCHO_CELDA, ALTO_CELDA, () => this.elegirUserito(k));
      if (k === this.selUser) {
        this.marco(ctx, x, yCeldas, ANCHO_CELDA, ALTO_CELDA, esperando || this.seccion === 0 || parpadea(ahora, 350) ? col : TINTA2);
        // The chosen object, small, on its carrier.
        if (this.selObj >= 0) {
          relleno(ctx, TINTA2, x + ANCHO_CELDA - 17, yCeldas + 3, 14, 14);
          relleno(ctx, PAPEL_ALTO, x + ANCHO_CELDA - 16, yCeldas + 4, 12, 12);
          ctx.drawImage(iconoObjeto(this.ofertas[this.selObj]), x + ANCHO_CELDA - 16, yCeldas + 4);
        }
      }
    });

    // The note, and the button (or the wait).
    envolver(t('barra.secreto'), 200).forEach((l, i) => centrado(ctx, l, yNota + i * 12, TINTA_SUAVE, { sombra: null }));
    const bw = 130;
    const bx = Math.floor((ANCHO - bw) / 2);
    if (esperando) {
      const s = t('barra.espera');
      const w = anchoTexto2(s) + 24;
      boton(ctx, Math.floor((ANCHO - w) / 2), yBoton, w, ALTO_BOTON, s, false);
    } else {
      const listo = this.selObj >= 0 && this.selUser >= 0;
      boton(ctx, bx, yBoton, bw, ALTO_BOTON, t('barra.elegir'), listo && this.seccion === 1, listo);
      if (listo) entrada.zona(bx, yBoton, bw, ALTO_BOTON, () => this.confirmar());
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
