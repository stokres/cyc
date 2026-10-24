// El plano manga de la noche loca (capítulo 2): la pantalla se llena de una a tres viñetas inclinadas a color (color plano
// con sombra de anime, líneas de concentración, onomatopeyas) que entran de golpe con un corte mientras el diálogo
// sigue en su cuadro. El dibujo es de src/arte/anime/manga.mjs; aquí solo se HORNEA UNA VEZ a bitmap (svgABitmap,
// docs/ESTILO.md T5.7) y se pone encima de la escena: un lienzo quieto, sin dibujar nada por fotograma ni filtros.
//
// Desde los textos (lo que sigue a `@manga`, entre dos líneas de diálogo; ver la cabecera de camara.ts):
//   @manga pablo:ojos:suplica vero:boca chuchi:cara:sorpresa !gogogo
//   @manga fin
// Se queda hasta otra marca @manga, `@manga fin`, o cualquier marca de cámara que cambie el encuadre. Con la
// palabra `solo` desaparece al acabar la siguiente línea de diálogo.
import type { Aventura } from './aventura';
import { claveMarca, leerMarca, plano } from '../arte/anime/manga.mjs';
import { svgABitmap } from '../motor/sprites';
import { H } from '../motor/motor';
import { hayTexto, texto } from './textos';

/** Cuántos planos horneados se guardan a la vez (cada uno es una pantalla entera de píxeles). */
const GUARDADOS = 3;

export class PlanoManga {
  private readonly el: HTMLDivElement;
  private readonly lienzo: HTMLCanvasElement;
  private readonly hornos = new Map<string, Promise<HTMLCanvasElement>>();
  private actual = '';
  private solo = false;
  /** El cuadro de la interfaz estaba oculto antes de que saliera el manga (para dejarlo como estaba). */
  private hudOculto = false;

  constructor(private readonly g: Aventura, antes: Node | null) {
    this.el = document.createElement('div');
    this.el.className = 'manga';
    this.el.hidden = true;
    this.lienzo = document.createElement('canvas');
    this.el.append(this.lienzo);
    g.root.insertBefore(this.el, antes);
  }

  get activo() {
    return !this.el.hidden;
  }

  /** El plano en pantalla (para las pruebas). */
  get clave() {
    return this.actual;
  }

  /** Las palabras de las onomatopeyas en castellano, de src/textos. */
  private palabras() {
    const t: Record<string, string> = {};
    for (const k of ['zas']) if (hayTexto(`manga.ono.${k}`)) t[k] = texto(`manga.ono.${k}`);
    return t;
  }

  /** Hornea el plano de una marca (o lo trae ya horneado): una sola vez por plano y tamaño de pantalla. */
  private hornear(palabras: string[]): Promise<HTMLCanvasElement> | null {
    const m = leerMarca(palabras);
    if (!m || !m.paneles.length) return null;
    const m0 = this.g.motor;
    const clave = `${claveMarca(m)}@${Math.round(m0.cssW)}x${Math.round(m0.cssH)}`;
    let p = this.hornos.get(clave);
    if (!p) {
      const W = (m0.cssW / m0.cssH) * H;
      const px = (m0.cssH * Math.min(window.devicePixelRatio || 1, 2)) / H;
      p = svgABitmap(plano(m, W, H, this.palabras()), W * px, H * px);
      this.hornos.set(clave, p);
      // Los más viejos se sueltan (cada bitmap ocupa unos megas).
      while (this.hornos.size > GUARDADOS) {
        const [viejo] = this.hornos.keys();
        const v = this.hornos.get(viejo)!;
        this.hornos.delete(viejo);
        void v.then((c) => (c.width = c.height = 0));
      }
    }
    return p;
  }

  /** Hornea sin enseñar (para tenerlo listo cuando llegue su línea). */
  preparar(palabras: string[]) {
    void this.hornear(palabras);
  }

  /** `@manga ...`: enseña el plano de golpe, o lo quita con `fin`. */
  async mostrar(palabras: string[]) {
    const m = leerMarca(palabras);
    if (!m) return this.ocultar();
    const p = this.hornear(palabras);
    if (!p) return;
    const bitmap = await p;
    // Otra marca pudo llegar mientras se horneaba.
    this.lienzo.width = bitmap.width;
    this.lienzo.height = bitmap.height;
    this.lienzo.getContext('2d')!.drawImage(bitmap, 0, 0);
    this.solo = !!m.opciones.solo;
    this.actual = claveMarca(m);
    if (!this.activo) {
      this.hudOculto = this.g.hud.root.dataset.oculto === 'true';
      this.g.hud.setVisible(false);
    }
    // Entra de golpe: se reinicia la animación del corte (un empujón y un fogonazo).
    this.el.hidden = false;
    this.el.classList.remove('corte');
    if (!this.g.rapido) {
      void this.el.offsetWidth;
      this.el.classList.add('corte');
    }
  }

  /** Vuelve al plano de siempre (un corte seco). */
  ocultar() {
    if (!this.activo) return;
    this.el.hidden = true;
    this.el.classList.remove('corte');
    this.actual = '';
    this.solo = false;
    if (!this.hudOculto) this.g.hud.setVisible(true);
  }

  /** Acaba una línea de diálogo: los planos `solo` se van. */
  lineaDicha() {
    if (this.solo) this.ocultar();
  }
}
