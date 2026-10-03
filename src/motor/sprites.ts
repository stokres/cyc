// Vector art turned into bitmaps once, so the browser does not draw it again
// every frame. The characters are cut-out puppets: each bone (forearm, thigh,
// head...) is its own piece. Drawn as SVG, every piece carries clip paths and
// translucent shading that the phone's GPU had to redo on every frame while they
// breathe, blink and talk; as bitmaps, moving them is just moving a picture.
// The SVG stays the source; this only changes how it reaches the screen.

const NS = 'http://www.w3.org/2000/svg';

export interface Sprite {
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bitmap pixels per art unit. Set from the screen size (see setEscalaSprites). */
let escala = 2.5;

/**
 * @param pxPorUnidad device pixels per unit of character art at the largest
 *   size a character is drawn on this screen.
 */
export function setEscalaSprites(pxPorUnidad: number) {
  escala = Math.max(1.5, Math.min(4, pxPorUnidad * 1.25));
}

let medidor: SVGGElement | null = null;

/** Bounding box of some SVG markup in its own coordinates. */
function medir(contenido: string) {
  if (!medidor) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:10px;height:10px;visibility:hidden;pointer-events:none');
    medidor = document.createElementNS(NS, 'g') as SVGGElement;
    svg.append(medidor);
    document.body.append(svg);
  }
  medidor.innerHTML = contenido;
  for (const p of medidor.querySelectorAll('.pivot')) p.remove();
  const b = medidor.getBBox();
  medidor.innerHTML = '';
  return b;
}

/** Rasterise markup (in its own coordinates) to a bitmap placed at the same spot. */
export async function rasterizar(contenido: string, pad = 5): Promise<Sprite | null> {
  const b = medir(contenido);
  if (!b.width || !b.height) return null;
  const x = Math.floor(b.x - pad);
  const y = Math.floor(b.y - pad);
  const w = Math.ceil(b.width + pad * 2);
  const h = Math.ceil(b.height + pad * 2);
  const W = Math.ceil(w * escala);
  const H = Math.ceil(h * escala);
  // The rig's pivot markers are hidden by the page's CSS, which does not reach an image.
  const svg = `<svg xmlns="${NS}" viewBox="${x} ${y} ${w} ${h}" width="${W}" height="${H}"><style>.pivot{display:none}</style>${contenido}</svg>`;
  // data: URLs rather than blob: ones, which some hosts' security policies block.
  try {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    c.getContext('2d')!.drawImage(img, 0, 0, W, H);
    return { href: c.toDataURL('image/png'), x, y, w, h };
  } catch {
    // Whatever goes wrong, the vector art simply stays.
    return null;
  }
}

const unaVez = new Map<string, Promise<Sprite | null>>();

/** Same as rasterizar, kept for good: for art that comes back again and again (props). */
export function rasterizarUnaVez(contenido: string) {
  let p = unaVez.get(contenido);
  if (!p) unaVez.set(contenido, (p = rasterizar(contenido)));
  return p;
}

export function imagen(s: Sprite) {
  return `<image href="${s.href}" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" preserveAspectRatio="none"/>`;
}

