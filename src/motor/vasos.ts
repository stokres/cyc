// The drink in a character's hand (chapter 2, the Bar del Brío: src/capitulos/bebidas.ts): a caña or a gin tonic
// drawn in src/arte/vasos.mjs and turned into bitmaps once each (rasterizarUnaVez, so the four share them), one per
// level of drink. The rig only moves a group (rig-runtime.mjs: it follows the front hand, always upright, and tips
// towards the mouth when drinking); nothing here is drawn again per frame, and swapping the level never leaves an empty
// frame (the new image goes on top and the old one leaves once it has painted, sinHueco).
import { cana, dedos, gin, NIVELES } from '../arte/vasos.mjs';
import { enMarcha, nuevaImagen, rasterizarUnaVez, sinHueco } from './sprites';

const NS = 'http://www.w3.org/2000/svg';

export type TipoVaso = 'cana' | 'gin';
export { NIVELES };

/** Skin of the hand holding the glass: the fingers wrapped round it are drawn in the same colours. */
export interface Piel {
  piel: string;
  sombra: string;
  linea: string;
}

/** The skin colours of a body's front hand (its SVG markup), to draw the fingers on the glass the same. */
export function pielDeMano(cuerpo: string): Piel {
  const doc = new DOMParser().parseFromString(`<svg xmlns="${NS}">${cuerpo}</svg>`, 'image/svg+xml');
  const mano = doc.querySelector('[id="mano_delante"]');
  const rellenos = [...(mano?.querySelectorAll('path[fill]:not([fill="none"])') ?? [])];
  const trazo = mano?.querySelector('path[fill="none"][stroke]');
  const piel = rellenos[0]?.getAttribute('fill') ?? '#e8b296';
  return {
    piel,
    sombra: rellenos[1]?.getAttribute('fill') ?? piel,
    linea: trazo?.getAttribute('stroke') ?? '#93533f',
  };
}

const dibujo = (tipo: TipoVaso, nivel: number) => (tipo === 'gin' ? gin(nivel) : cana(nivel));

/** Bake every level of both drinks in the background, so none is ever made while someone is looking. */
export function prepararVasos() {
  // One job in progress for all of them (the performance script waits for none before measuring).
  void enMarcha(async () => {
    for (const tipo of ['cana', 'gin'] as TipoVaso[]) for (let n = 0; n <= NIVELES; n++) await rasterizarUnaVez(dibujo(tipo, n));
  });
}

/** A drink in the hand: the group to put inside the body's own, and which level and kind it shows. */
export class VasoEnMano {
  readonly g: SVGGElement;
  private cuerpo: SVGGElement;
  private dedos: SVGGElement;
  private imgs = new Map<string, SVGImageElement>();
  private visible: SVGImageElement | null = null;
  private clave = '';
  tipo: TipoVaso | null = null;
  nivel = -1;

  constructor(private readonly piel: Piel) {
    this.g = document.createElementNS(NS, 'g') as SVGGElement;
    this.g.setAttribute('class', 'vaso');
    this.cuerpo = document.createElementNS(NS, 'g') as SVGGElement;
    this.dedos = document.createElementNS(NS, 'g') as SVGGElement;
    this.g.append(this.cuerpo, this.dedos);
  }

  /** Put the group inside the body (again, after a change of clothes: the body is drawn anew). */
  montar(raiz: Element) {
    raiz.append(this.g);
  }

  quitar() {
    this.g.remove();
  }

  /** Hidden while they put the glass down on the counter. */
  set oculto(v: boolean) {
    this.g.style.display = v ? 'none' : '';
  }

  /** What it shows now: the kind and the level (0 empty to NIVELES full). */
  poner(tipo: TipoVaso, nivel: number) {
    const n = Math.max(0, Math.min(NIVELES, Math.round(nivel)));
    if (tipo !== this.tipo) this.cambiarDedos(tipo);
    if (tipo === this.tipo && n === this.nivel) return;
    this.tipo = tipo;
    this.nivel = n;
    const clave = `${tipo}${n}`;
    this.clave = clave;
    const ya = this.imgs.get(clave);
    if (ya) return this.ver(ya);
    void rasterizarUnaVez(dibujo(tipo, n)).then((sp) => {
      if (!sp) return;
      const img = nuevaImagen(sp) as SVGImageElement;
      img.style.display = 'none';
      this.cuerpo.append(img);
      this.imgs.set(clave, img);
      if (this.clave === clave) this.ver(img);
    });
  }

  private cambiarDedos(tipo: TipoVaso) {
    const { piel, sombra, linea } = this.piel;
    const viejos = [...this.dedos.childNodes];
    void rasterizarUnaVez(dedos(tipo, piel, sombra, linea)).then((sp) => {
      if (!sp) return;
      const img = nuevaImagen(sp);
      this.dedos.append(img);
      void sinHueco(img, () => viejos.forEach((v) => v.remove()));
    });
  }

  private ver(img: SVGImageElement) {
    const antes = this.visible;
    if (antes === img) return;
    this.visible = img;
    img.style.display = '';
    void sinHueco(img, () => {
      if (this.visible === antes || !antes) return;
      antes.style.display = 'none';
    });
  }
}
