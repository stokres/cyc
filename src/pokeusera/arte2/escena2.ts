// PokéUsera · Edición Jarra (arte v2): the battle backdrop and the ground platforms, baked once.
//
// Backdrop: the «Bar del Brío». Back wall with a pennant garland and two shelves of bottles, a tiled
// wainscot, the wooden counter with its beer taps and brass rail, a slot machine in the corner and a
// checkered tile floor in perspective. Everything is kept low-contrast (a warm veil is laid over it at
// the end) so the sprites and panels read first.

function lienzo(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d')!;
  cx.imageSmoothingEnabled = false;
  return [cv, cx];
}

function hash(x: number, y: number): number {
  let h = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function mezcla(a: string, b: string, t: number): string {
  const A = rgb(a),
    B = rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function r(cx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  cx.fillStyle = color;
  cx.fillRect(x, y, w, h);
}

/** A bottle standing on y (its base); `alto` is the total height. */
function botella(cx: CanvasRenderingContext2D, x: number, y: number, alto: number, color: string, etiqueta: string | null): void {
  const oscuro = mezcla(color, '#1c1018', 0.45);
  const claro = mezcla(color, '#ffffff', 0.45);
  const cuello = Math.round(alto * 0.4);
  r(cx, oscuro, x, y - alto + cuello, 5, alto - cuello); // body outline
  r(cx, color, x + 1, y - alto + cuello, 3, alto - cuello - 1);
  r(cx, oscuro, x + 1, y - alto, 3, cuello + 1); // neck
  r(cx, color, x + 2, y - alto + 1, 1, cuello);
  r(cx, '#d8b84a', x + 1, y - alto, 3, 1); // cap / foil
  r(cx, claro, x + 1, y - alto + cuello + 1, 1, Math.max(1, alto - cuello - 4)); // glint
  if (etiqueta) r(cx, etiqueta, x + 1, y - Math.round((alto - cuello) * 0.6), 3, 3);
}

function copa(cx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  r(cx, '#8fa6a8', x, y - 6, 5, 4);
  r(cx, color, x + 1, y - 5, 3, 2);
  r(cx, '#8fa6a8', x + 2, y - 2, 1, 2);
  r(cx, '#8fa6a8', x, y, 5, 1);
}

function grifo(cx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  r(cx, '#5c6670', x - 1, y, 7, 2); // base
  r(cx, '#cfd6da', x + 1, y - 9, 3, 9); // column
  r(cx, '#8e98a0', x + 3, y - 9, 1, 9);
  r(cx, '#cfd6da', x - 1, y - 11, 7, 3); // top
  r(cx, '#8e98a0', x - 1, y - 9, 7, 1);
  r(cx, color, x + 1, y - 17, 3, 6); // handle
  r(cx, mezcla(color, '#ffffff', 0.4), x + 1, y - 17, 1, 6);
  r(cx, '#cfd6da', x + 3, y - 8, 4, 2); // spout
  r(cx, '#cfd6da', x + 6, y - 8, 1, 4);
}

function tragaperras(cx: CanvasRenderingContext2D, x: number, y: number): void {
  // 26 wide, 64 tall, standing with its feet at y + 63.
  r(cx, '#2a1838', x, y + 4, 26, 60); // dark outline / body
  r(cx, '#6a3c86', x + 1, y + 5, 24, 58);
  r(cx, '#8a58a8', x + 1, y + 5, 2, 58);
  r(cx, '#4a2862', x + 22, y + 5, 3, 58);
  r(cx, '#2a1838', x + 2, y, 22, 6); // crown
  r(cx, '#f4c64a', x + 3, y + 1, 20, 4);
  for (let i = 0; i < 5; i++) r(cx, i % 2 ? '#fff6c8' : '#e87a3a', x + 4 + i * 4, y + 2, 2, 2);
  r(cx, '#2a1838', x + 3, y + 12, 20, 16); // window frame
  r(cx, '#f6efd8', x + 4, y + 13, 18, 14);
  for (let i = 0; i < 3; i++) {
    r(cx, '#cfc4a4', x + 4 + i * 6, y + 13, 1, 14);
    const sym = ['#d8402c', '#3aa05a', '#e8b83a'][i];
    r(cx, sym, x + 6 + i * 6, y + 17, 3, 4);
    r(cx, '#2a1838', x + 7 + i * 6, y + 16, 1, 1);
  }
  r(cx, '#2a1838', x + 3, y + 31, 20, 8);
  r(cx, '#e8b83a', x + 5, y + 33, 4, 4);
  r(cx, '#d8402c', x + 11, y + 33, 4, 4);
  r(cx, '#3aa05a', x + 17, y + 33, 4, 4);
  r(cx, '#2a1838', x + 5, y + 46, 16, 5); // coin tray
  r(cx, '#9a8aa8', x + 6, y + 47, 14, 3);
  r(cx, '#2a1838', x + 25, y + 14, 5, 3); // lever
  r(cx, '#8a8a98', x + 26, y + 15, 2, 14);
  r(cx, '#d8402c', x + 25, y + 11, 4, 4);
  r(cx, '#2a1838', x + 2, y + 60, 22, 4);
}

/** The «Bar del Brío» backdrop, ancho × alto, baked once. */
export function fondoBar(ancho = 240, alto = 360): HTMLCanvasElement {
  const [cv, cx] = lienzo(ancho, alto);
  const PARED = '#cdb98c';
  // ----- wall
  r(cx, PARED, 0, 0, ancho, 104);
  for (let x = 0; x < ancho; x += 8) r(cx, '#c5b081', x, 8, 1, 92);
  for (let y = 10; y < 100; y += 14) r(cx, '#d4c196', 0, y, ancho, 1);
  // ceiling beam
  r(cx, '#5e3e26', 0, 0, ancho, 7);
  r(cx, '#7a5434', 0, 0, ancho, 2);
  r(cx, '#46301e', 0, 7, ancho, 2);
  // pennant garland
  const colores = ['#d9503f', '#e8b43a', '#4a9a6a', '#4a78b8', '#c7608a'];
  for (let x = 0; x < ancho; x += 7) {
    const y = 9 + Math.round(5 * Math.sin((x / ancho) * Math.PI * 2 * 2 + 0.6) + 5);
    r(cx, '#8a7a5a', x, y - 1, 8, 1);
    const c = colores[Math.floor(x / 7) % colores.length];
    for (let j = 0; j < 7; j++) r(cx, c, x + Math.floor(j / 2), y + j, Math.max(1, 7 - j), 1);
    r(cx, mezcla(c, '#ffffff', 0.35), x, y, 1, 3);
  }
  // shelves with bottles
  const botellas = ['#4f8a52', '#b0762c', '#5c82ac', '#8aa890', '#a85a3c', '#6a9a4a', '#c8a43a', '#7a6a9c'];
  for (const [yBase, alto0] of [[40, 15], [66, 14]] as [number, number][]) {
    r(cx, '#6a4528', 0, yBase, ancho, 3);
    r(cx, '#8a5e38', 0, yBase, ancho, 1);
    r(cx, '#9c8658', 0, yBase + 3, ancho, 2);
    let x = 3;
    let i = 0;
    while (x < ancho - 8) {
      const h = hash(x, yBase);
      if (h % 7 === 0) {
        copa(cx, x, yBase, botellas[h % botellas.length]);
        x += 8;
      } else if (h % 11 === 0) {
        x += 6;
      } else {
        botella(cx, x, yBase, alto0 - (h % 4), botellas[(h >>> 3) % botellas.length], h % 3 === 0 ? '#f2e8c8' : null);
        x += 6 + (h % 3);
      }
      i++;
    }
  }
  // tiled wainscot with a teal border
  r(cx, '#e8dfc4', 0, 80, ancho, 24);
  for (let y = 80; y < 104; y += 8) r(cx, '#c9bd9a', 0, y, ancho, 1);
  for (let x = 0; x < ancho; x += 10) r(cx, '#c9bd9a', x, 80, 1, 24);
  for (let x = 0; x < ancho; x += 20) r(cx, '#f2eada', x + 1, 81, 8, 1);
  r(cx, '#3e7a76', 0, 78, ancho, 3);
  r(cx, '#5a9a92', 0, 78, ancho, 1);
  for (let x = 0; x < ancho; x += 10) {
    r(cx, '#3e7a76', x + 4, 86, 2, 2);
    r(cx, '#5a9a92', x + 4, 86, 1, 1);
  }
  // counter: top, front planks, brass rail
  r(cx, '#6e4426', 0, 100, ancho, 3);
  r(cx, '#b98450', 0, 101, ancho, 7);
  r(cx, '#d3a06a', 0, 101, ancho, 1);
  r(cx, '#8a5a34', 0, 108, ancho, 1);
  r(cx, '#7a4e2e', 0, 109, ancho, 28);
  for (let x = 0; x < ancho; x += 8) {
    r(cx, '#5e3a22', x, 109, 1, 28);
    r(cx, '#8e6038', x + 1, 109, 1, 28);
  }
  r(cx, '#5e3a22', 0, 120, ancho, 1);
  r(cx, '#46301e', 0, 137, ancho, 2);
  r(cx, '#9a7a28', 0, 132, ancho, 3);
  r(cx, '#e8c24c', 0, 132, ancho, 1);
  r(cx, '#fff0a0', 0, 132, ancho, 1);
  for (let x = 6; x < ancho; x += 40) r(cx, '#6a4a14', x, 135, 3, 2);
  // taps and a couple of glasses on the counter
  [['#d8402c', 20], ['#e8b83a', 36], ['#4a9a6a', 52], ['#4a78b8', 68]].forEach(([c, x]) => grifo(cx, x as number, 100, c as string));
  copa(cx, 92, 101, '#e8b83a');
  copa(cx, 102, 101, '#e8b83a');
  r(cx, '#e8e0c8', 120, 99, 14, 2); // a plate of tapas
  r(cx, '#c8602a', 123, 97, 4, 2);
  r(cx, '#d8b84a', 128, 97, 4, 2);
  // ----- floor: checker in perspective
  const img = cx.getImageData(0, 0, ancho, alto);
  const vy = 20;
  const K = 3550;
  const fw = 0.1325;
  const A = rgb('#dccfa8');
  const B = rgb('#cdc197');
  const G = rgb('#b7aa80');
  const FOG = rgb('#cdb98c');
  const tid = (x: number, y: number): [number, number] => {
    const t = y - vy;
    const n = Math.floor(K / t);
    const u = Math.floor((x + 0.5 - ancho / 2) / (fw * t));
    return [u, n];
  };
  for (let y = 139; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const [u, n] = tid(x, y);
      const [ul, nl] = tid(x - 1, y);
      const [uu, nu] = tid(x, y - 1);
      const borde = ul !== u || nl !== n || uu !== u || nu !== n;
      let c = (u + n) & 1 ? A : B;
      if (borde) c = G;
      else if (hash(x >> 1, y >> 1) % 23 === 0) c = c.map((v) => v - 5) as [number, number, number];
      // distance haze: far tiles melt into the wall tone
      const f = Math.max(0, 1 - (y - 139) / 90) * 0.35;
      const i = (y * ancho + x) * 4;
      img.data[i] = c[0] + (FOG[0] - c[0]) * f;
      img.data[i + 1] = c[1] + (FOG[1] - c[1]) * f;
      img.data[i + 2] = c[2] + (FOG[2] - c[2]) * f;
      img.data[i + 3] = 255;
    }
  }
  cx.putImageData(img, 0, 0);
  // shadow of the counter on the floor
  r(cx, 'rgba(70,48,30,0.20)', 0, 139, ancho, 4);
  r(cx, 'rgba(70,48,30,0.10)', 0, 143, ancho, 4);
  // slot machine in the right corner, on the floor
  tragaperras(cx, ancho - 28, 160);
  r(cx, "rgba(70,48,30,0.22)", ancho - 29, 223, 30, 3);
  // low-contrast veil so the sprites and panels read first
  r(cx, 'rgba(240,226,192,0.20)', 0, 0, ancho, alto);
  return cv;
}

export interface OpcionesPlataforma {
  /** Half widths of the ellipse. */
  rx: number;
  ry: number;
}

/** A beer-mat style round platform (top face, thick rim, soft shadow), baked once. */
export function plataforma(rx: number, ry: number): HTMLCanvasElement {
  const w = rx * 2 + 8;
  const h = ry * 2 + 10;
  const [cv, cx] = lienzo(w, h);
  const cxm = w / 2;
  const cym = ry + 3;
  const grosor = 3;
  const dentro = (x: number, y: number, a: number, b: number, dy = 0): boolean => ((x + 0.5 - cxm) / a) ** 2 + ((y + 0.5 - cym - dy) / b) ** 2 <= 1;
  const img = cx.createImageData(w, h);
  const put = (x: number, y: number, hex: string, a = 255): void => {
    const [R, G, B] = rgb(hex);
    const i = (y * w + x) * 4;
    img.data[i] = R;
    img.data[i + 1] = G;
    img.data[i + 2] = B;
    img.data[i + 3] = a;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // soft contact shadow, a dither-free two-step ring
      if (dentro(x, y, rx + 4, ry + 3.5, grosor + 1)) put(x, y, '#5a3e24', 46);
      if (dentro(x, y, rx + 2, ry + 2, grosor)) put(x, y, '#5a3e24', 70);
      // side (thickness)
      if (dentro(x, y, rx, ry, grosor)) put(x, y, y > cym + ry + grosor - 2 ? '#7a5434' : '#a8794a');
      // top face
      if (dentro(x, y, rx, ry)) {
        let c = '#f0e4c0';
        if (dentro(x, y, rx - 3, ry - 1.6)) c = '#e6d6a8';
        if (dentro(x, y, rx - 5, ry - 2.4)) c = '#f4ead0';
        if (dentro(x, y, rx * 0.55, ry * 0.5)) c = '#ecdcae';
        // top-left light edge / bottom-right shade, one pixel
        if (!dentro(x - 1, y - 1, rx, ry)) c = '#fffaf0';
        if (!dentro(x + 1, y + 1, rx, ry)) c = '#c9ab72';
        put(x, y, c);
      }
    }
  }
  // outline: a dark brown pixel ring around face and side
  const copia = new Uint8ClampedArray(img.data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (copia[i + 3] === 255) continue;
      const vecino = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => copia[((y + dy) * w + x + dx) * 4 + 3] === 255);
      if (vecino) put(x, y, '#5e3e24');
    }
  }
  cx.putImageData(img, 0, 0);
  return cv;
}
