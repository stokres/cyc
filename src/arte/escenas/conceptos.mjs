// El mundo de los conceptos (capítulo 2, tramo final; docs/CAPITULO2.md): ya no es un bar, es un vacío de
// colores. Aquí solo va el fondo horneado y el reparto de los sitios; todo lo que flota se pinta aparte, en
// vivo, con bitmaps ya hechos (src/capitulos/conceptos-vivo.ts), y los toques son las zonas de abajo, que el
// juego mueve con cada pieza. Mide 2 400 de ancho como las demás, pero toda ella cabe en pantalla: la cámara
// se queda quieta en el centro.
export const W = 2400;
export const CX = W / 2;

const NS = 'http://www.w3.org/2000/svg';

/** Los sitios y el tamaño de cada toque, en unidades de escena respecto al centro de la pantalla (dx) y desde arriba (y). */
export const SITIOS = {
  reloj: { dx: -480, y: 250, w: 290, h: 250 },
  no: { dx: 520, y: 255, w: 270, h: 220 },
  penultima: { dx: 910, y: 300, w: 260, h: 300 },
  manana: { dx: -1010, y: 620, w: 240, h: 460 },
  ultima: { dx: 100, y: 300, w: 300, h: 340 },
  chuchi: { dx: -700, y: 665, w: 300, h: 460 },
  pablo: { dx: -350, y: 665, w: 300, h: 480 },
  guille: { dx: 340, y: 650, w: 300, h: 520 },
  vero: { dx: 690, y: 665, w: 300, h: 480 },
  fran: { dx: 0, y: 700, w: 260, h: 330 },
};

const fondo = () => `<svg xmlns="${NS}" viewBox="0 0 ${W} 1080" width="${W}" height="1080">
<defs>
<linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#170a3a"/><stop offset="0.5" stop-color="#34116c"/><stop offset="1" stop-color="#0c3556"/></linearGradient>
<radialGradient id="m"><stop offset="0" stop-color="#ff3fa4" stop-opacity="0.55"/><stop offset="1" stop-color="#ff3fa4" stop-opacity="0"/></radialGradient>
<radialGradient id="o"><stop offset="0" stop-color="#ffa43a" stop-opacity="0.5"/><stop offset="1" stop-color="#ffa43a" stop-opacity="0"/></radialGradient>
<radialGradient id="c"><stop offset="0" stop-color="#2fe0d0" stop-opacity="0.45"/><stop offset="1" stop-color="#2fe0d0" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="1080" fill="url(#v)"/>
<circle cx="520" cy="360" r="620" fill="url(#m)"/>
<circle cx="1850" cy="300" r="560" fill="url(#o)"/>
<circle cx="1200" cy="900" r="700" fill="url(#c)"/>
</svg>`;

let guardada = null;

export function escena() {
  if (guardada) return guardada;
  const spots = {};
  for (const id of ['fran', 'pablo', 'chuchi', 'guille', 'vero']) spots[id] = { X: CX, y: 900, face: 1 };
  const zonas = {};
  for (const [id, s] of Object.entries(SITIOS)) {
    zonas[id] = { u: CX + s.dx, k: 1, w: s.w, top: s.y - s.h / 2, bottom: s.y + s.h / 2, X: CX + s.dx, y: 900 };
  }
  // El fondo entero va como una sola capa; la de delante solo existe para que haya una segunda pasada de dibujo en vivo.
  guardada = {
    id: 'conceptos',
    name: 'Mundo de los conceptos',
    W,
    H: 1080,
    HOR: 500,
    BASE: 1000,
    CX,
    M: 250,
    ambient: '#ffffff',
    walk: { y0: 900, y1: 900, x0: CX, x1: CX },
    start: { X: CX, y: 900 },
    layers: [
      { id: 'fondo', k: 1, x0: 0, x1: W, y0: 0, y1: 1080, body: fondo(), lit: false },
      { id: 'frente', k: 1, z: 'front', x0: 0, x1: 8, y0: 0, y1: 8, body: `<rect width="8" height="8" fill="#000" fill-opacity="0"/>`, lit: false },
    ],
    props: [],
    lights: [],
    spots,
    zonas,
  };
  return guardada;
}
