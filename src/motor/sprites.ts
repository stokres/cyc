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

/** Conversions still running (scripts/rendimiento.mjs waits for none before measuring). */
let enCurso = 0;
(window as unknown as { __sprites?: () => number }).__sprites = () => enCurso;

/** Count a whole job (a character's pieces and heads) as one conversion in progress. */
export async function enMarcha<T>(trabajo: () => Promise<T>): Promise<T> {
  enCurso++;
  try {
    return await trabajo();
  } finally {
    enCurso--;
  }
}

/** Rasterise markup (in its own coordinates) to a bitmap placed at the same spot. */
export async function rasterizar(contenido: string, pad = 5): Promise<Sprite | null> {
  enCurso++;
  try {
    return await rasterizarYa(contenido, pad);
  } finally {
    enCurso--;
  }
}

async function rasterizarYa(contenido: string, pad: number): Promise<Sprite | null> {
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
    // PNG encoding off the main thread (toBlob), then a data: URL.
    const png = await new Promise<Blob | null>((r) => c.toBlob(r));
    if (!png) return null;
    const href = await new Promise<string>((ok, mal) => {
      const fr = new FileReader();
      fr.onload = () => ok(fr.result as string);
      fr.onerror = mal;
      fr.readAsDataURL(png);
    });
    return { href, x, y, w, h };
  } catch (e) {
    console.warn('[sprites]', e);
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

/** An <image> element for a sprite. */
export function nuevaImagen(s: Sprite) {
  const img = document.createElementNS(NS, 'image');
  for (const [k, v] of Object.entries({ href: s.href, x: s.x, y: s.y, width: s.w, height: s.h, preserveAspectRatio: 'none' })) img.setAttribute(k, String(v));
  return img;
}

/**
 * Run `luego` once a just-shown image has certainly painted: loaded, decoded
 * and two frames on screen. Until then whatever was under it stays, so swapping
 * art never leaves an empty frame (the flicker Guille's head had).
 */
export async function sinHueco(img: Element, luego: () => void) {
  const im = img as SVGImageElement & { decode?: () => Promise<void> };
  try {
    if (im.decode) await im.decode();
    else await new Promise((r) => img.addEventListener('load', r, { once: true }));
  } catch {
    // Not decodable: keep what was there.
    return;
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  luego();
}



/**
 * A character's whole body as a flat dark silhouette, as a bitmap `alto` pixels
 * tall (Pablo's shadow on the projection screen and in his minigame). `vb`: the
 * part of the body's space it covers (wider for poses with the arms flung out).
 */
export async function silueta(cuerpo: string, alto: number, color = '#0c0814', vb = { x: -110, y: -300, w: 220, h: 310 }): Promise<HTMLCanvasElement> {
  const limpio = cuerpo.replace(/<circle[^>]*class="pivot"[^>]*\/>/g, '');
  const k = alto / vb.h;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="${NS}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${Math.ceil(vb.w * k)}" height="${Math.ceil(alto)}">${limpio}</svg>`)}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = Math.ceil(vb.w * k);
  c.height = Math.ceil(alto);
  const x = c.getContext('2d')!;
  x.drawImage(img, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}
