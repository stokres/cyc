// The trailer of chapter 2: after the «Continuará…» of chapter 1, some loose shots of what
// comes next, cut to an action-trailer track. Black and a deep horn; far away, a battered
// caravan in the Nevada desert at dawn; four lumps snoring inside it; the montage (Fran in
// his Pang, Chuchi in his Space Invaders, between title cards); Vero smiling and opening her
// mouth, cut to black; the narrator; the chant; the logo and «Próximamente».
//
// The shots follow the music second by second (src/sonido/trailer.mp3, made by
// tools/musica/trailer.py): PLANOS and CANTO here are the times of the hits there, so
// change one, change both. The words are in src/textos/capitulo1.md (trailer.*), the
// «Saltar» button in interfaz.md. The script of the trailer is in docs/JUGABILIDAD.md.
//
// The arcade games are pixel art on purpose: they are games inside the game (the style
// guide's «no pixel art» is about the game itself). Fran and Chuchi there are tiny
// bitmaps made once from the maps below.
//
// Performance (docs/ESTILO.md, T5): the desert and the inside of the caravan are painted
// once (again if the screen changes size) and each frame only draws that image and a few
// small shapes; the games are drawn at 256×144 and scaled up; the cards, the narrator,
// the chant and the title are DOM over a black canvas that is not redrawn. The loop never
// passes 60 fps and the scene underneath is paused meanwhile (capitulo1.ts).
import { h } from './hud';
import { dialogo, texto } from '../juego/textos';
import type { Pista } from '../sonido/musica';
import { logoClaro } from './logo';

/** What the trailer needs from the sound: its track, started once it has loaded. */
export interface SonidoTrailer {
  musica(id: Pista): void;
  pararMusica(fundido?: number): void;
  lista?(id: Pista): Promise<void>;
}

type Plano = 'negro' | 'desierto' | 'caravana' | 'cartel' | 'pang' | 'invaders' | 'vero' | 'narrador' | 'canto' | 'titulo';

/** When each shot starts (seconds), the same as the music's (tools/musica/trailer.py). */
const PLANOS: Array<[number, Plano]> = [
  [0, 'negro'],
  [4, 'desierto'],
  [9.5, 'caravana'],
  [12.5, 'cartel'],
  [14.5, 'pang'],
  [16.5, 'cartel'],
  [18.5, 'invaders'],
  [20.5, 'cartel'],
  [22, 'vero'],
  [24.5, 'narrador'],
  [29.6, 'canto'],
  [32.6, 'titulo'],
];
/** The brass stabs of the chant, one syllable each («Ca-mio-neees y ca-ra-va-naaas»). */
const CANTO = [29.6, 29.85, 30.1, 30.85, 31.05, 31.3, 31.55, 31.8];
/** The title can be tapped away from here; it goes by itself at FIN. */
const TOCABLE = 33.6;
const FIN = 38.5;

const plano = (t: number): [Plano, number] => {
  let i = 0;
  while (i + 1 < PLANOS.length && t >= PLANOS[i + 1][0]) i++;
  return [PLANOS[i][1], t - PLANOS[i][0]];
};

const azar = (semilla: number) => () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
const suave = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** A canvas of W×H CSS px at the screen's density, with its context already scaled. */
function lienzo(W: number, H: number, dpr: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(W * dpr));
  c.height = Math.max(2, Math.round(H * dpr));
  const x = c.getContext('2d')!;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, x] as const;
}

// ---------------------------------------------------------------- the desert at dawn

/** Where the caravan and its chimney are, for the camera's push and the smoke. */
interface Desierto {
  img: HTMLCanvasElement;
  cx: number;
  cy: number;
  humoX: number;
  humoY: number;
}

/**
 * Nevada at dawn, painted once: a violet sky going orange at the horizon, the sun just up
 * on the right (L1), mesas in the haze (F4), the desert floor, scrub, a dirt track and,
 * far away and a bit crooked, the caravan with a flat tyre.
 */
function pintarDesierto(W: number, H: number, dpr: number): Desierto {
  const [img, x] = lienzo(W, H, dpr);
  const r = azar(11);
  const hz = H * 0.6;
  const cielo = x.createLinearGradient(0, 0, 0, hz);
  cielo.addColorStop(0, '#1d1c46');
  cielo.addColorStop(0.45, '#4b3566');
  cielo.addColorStop(0.8, '#b9606a');
  cielo.addColorStop(1, '#f2a25c');
  x.fillStyle = cielo;
  x.fillRect(0, 0, W, hz + 2);
  for (let i = 0; i < 26; i++) {
    x.globalAlpha = 0.15 + r() * 0.35;
    x.fillStyle = '#eef0ff';
    const s = 1.2 + r() * 1.4;
    x.fillRect(r() * W * 0.6, r() * hz * 0.35, s, s);
  }
  x.globalAlpha = 1;
  // The sun and its glow (the only glow: L5).
  const sx = W * 0.72;
  const sy = hz - H * 0.015;
  const sr = H * 0.05;
  const halo = x.createRadialGradient(sx, sy, sr, sx, sy, sr * 6);
  halo.addColorStop(0, 'rgba(255,196,120,0.45)');
  halo.addColorStop(1, 'rgba(255,196,120,0)');
  x.fillStyle = halo;
  x.fillRect(sx - sr * 6, sy - sr * 6, sr * 12, sr * 6 + 2);
  x.fillStyle = '#ffdc94';
  x.beginPath();
  x.arc(sx, sy, sr, Math.PI, 0);
  x.fill();
  // Mesas far away, then a nearer ridge: flat tops, steep sides.
  const sierra = (color: string, alto: number, semilla: number) => {
    const rr = azar(semilla);
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(0, hz + 1);
    let px = 0;
    while (px < W) {
      const ancho = W * (0.05 + rr() * 0.12);
      const a = alto * (0.25 + rr() * 0.75);
      const lado = ancho * 0.12;
      x.lineTo(px + lado, hz - a);
      x.lineTo(px + ancho - lado, hz - a);
      x.lineTo(px + ancho, hz - alto * rr() * 0.15);
      px += ancho + W * rr() * 0.04;
      x.lineTo(px, hz - alto * rr() * 0.1);
    }
    x.lineTo(W, hz + 1);
    x.fill();
  };
  sierra('#8a5a6e', H * 0.075, 3);
  sierra('#62405a', H * 0.035, 8);
  // The desert floor.
  const suelo = x.createLinearGradient(0, hz, 0, H);
  suelo.addColorStop(0, '#d08a58');
  suelo.addColorStop(0.35, '#a8623f');
  suelo.addColorStop(1, '#5e3329');
  x.fillStyle = suelo;
  x.fillRect(0, hz, W, H - hz);
  // The caravan's place, and the dirt track that leads to it from the bottom of the screen.
  const cw = W * 0.085;
  const ch = cw * 0.42;
  const cx = W * 0.4;
  const cy = hz + H * 0.065;
  x.fillStyle = '#b8744a';
  x.beginPath();
  x.moveTo(cx - cw * 0.1, cy);
  x.lineTo(cx + cw * 0.1, cy);
  x.lineTo(W * 0.62, H);
  x.lineTo(W * 0.36, H);
  x.fill();
  // Scrub, bigger the nearer it is.
  for (let i = 0; i < 70; i++) {
    const y = hz + (H - hz) * r() ** 1.6;
    const k = (y - hz) / (H - hz);
    const px = r() * W;
    x.fillStyle = r() < 0.5 ? '#5b4a35' : '#6a5a3e';
    x.beginPath();
    x.ellipse(px, y, 2 + k * 16, 1 + k * 7, 0, Math.PI, 0);
    x.fill();
  }
  // Three Joshua trees, in silhouette against the sun.
  const arbol = (ax: number, ay: number, s: number) => {
    x.strokeStyle = '#3b2a33';
    x.lineCap = 'round';
    x.lineWidth = s * 0.12;
    x.beginPath();
    x.moveTo(ax, ay);
    x.lineTo(ax, ay - s);
    x.moveTo(ax, ay - s * 0.6);
    x.quadraticCurveTo(ax - s * 0.4, ay - s * 0.65, ax - s * 0.38, ay - s * 1.05);
    x.moveTo(ax, ay - s * 0.75);
    x.quadraticCurveTo(ax + s * 0.35, ay - s * 0.8, ax + s * 0.32, ay - s * 1.2);
    x.stroke();
    x.fillStyle = '#3b2a33';
    for (const [dx, dy] of [[0, -1], [-0.38, -1.05], [0.32, -1.2]]) {
      x.beginPath();
      x.ellipse(ax + dx * s, ay + dy * s, s * 0.12, s * 0.16, 0, 0, Math.PI * 2);
      x.fill();
    }
  };
  arbol(W * 0.12, hz + H * 0.09, H * 0.16);
  arbol(W * 0.86, hz + H * 0.05, H * 0.1);
  arbol(W * 0.63, hz + H * 0.02, H * 0.05);
  // The caravan: cream with a brown stripe, rounded ends, a cracked window, a flat tyre;
  // the sun lights its right side. A little crooked, sunk on the flat side.
  x.save();
  x.fillStyle = 'rgba(60,28,30,0.35)';
  x.beginPath();
  x.ellipse(cx, cy + 1, cw * 0.62, ch * 0.13, 0, 0, Math.PI * 2);
  x.fill();
  x.translate(cx, cy);
  x.rotate(-0.045);
  const bx = -cw / 2;
  const by = -ch - ch * 0.18;
  const caja = (color: string, dx: number, dy: number, w: number, hh: number, rad: number) => {
    x.fillStyle = color;
    x.beginPath();
    x.roundRect(bx + dx, by + dy, w, hh, rad);
    x.fill();
  };
  // The tow bar and its brick.
  x.strokeStyle = '#4a3a36';
  x.lineWidth = Math.max(1.5, cw * 0.025);
  x.beginPath();
  x.moveTo(bx + cw * 0.05, by + ch * 0.85);
  x.lineTo(bx - cw * 0.16, by + ch * 1.08);
  x.stroke();
  caja('#8c4a36', -cw * 0.2, ch * 1.06, cw * 0.08, ch * 0.12, 1);
  caja('#e9dcc0', 0, 0, cw, ch, ch * 0.35);
  caja('#d4c4a4', 0, 0, cw, ch * 0.16, ch * 0.08);
  caja('#9a5a3c', 0, ch * 0.62, cw, ch * 0.12, 0);
  caja('#3a3346', cw * 0.14, ch * 0.2, cw * 0.26, ch * 0.3, ch * 0.08);
  caja('#d8c8a8', cw * 0.6, ch * 0.18, cw * 0.15, ch * 0.66, ch * 0.05);
  caja('#3a3346', cw * 0.63, ch * 0.24, cw * 0.09, ch * 0.16, ch * 0.04);
  x.strokeStyle = '#a9a0b4';
  x.lineWidth = 1;
  x.beginPath();
  x.moveTo(bx + cw * 0.18, by + ch * 0.24);
  x.lineTo(bx + cw * 0.27, by + ch * 0.36);
  x.lineTo(bx + cw * 0.24, by + ch * 0.46);
  x.stroke();
  // Sunlit side.
  const luz = x.createLinearGradient(bx + cw * 0.55, 0, bx + cw, 0);
  luz.addColorStop(0, 'rgba(255,200,140,0)');
  luz.addColorStop(1, 'rgba(255,200,140,0.35)');
  x.fillStyle = luz;
  x.beginPath();
  x.roundRect(bx, by, cw, ch, ch * 0.35);
  x.fill();
  // The chimney, and the wheel: the flat one.
  caja('#6a5a56', cw * 0.78, -ch * 0.16, cw * 0.05, ch * 0.18, 1);
  x.fillStyle = '#26202a';
  x.beginPath();
  x.ellipse(bx + cw * 0.42, by + ch * 1.02, ch * 0.2, ch * 0.13, 0, 0, Math.PI * 2);
  x.fill();
  x.restore();
  const humoX = cx + Math.cos(-0.045) * (bx + cw * 0.805) - Math.sin(-0.045) * (by - ch * 0.16);
  const humoY = cy + Math.sin(-0.045) * (bx + cw * 0.805) + Math.cos(-0.045) * (by - ch * 0.16);
  return { img, cx, cy: cy - ch * 0.5, humoX, humoY };
}

// ---------------------------------------------------------------- inside the caravan

/**
 * The inside of the caravan in the dark, painted once: wood panelling, a little window
 * with the dawn in it and its beam on the floor, the bench and the bunk, and what the
 * night left lying about (cans, an arcade token in the light, a pilot's cap on a hook).
 */
function pintarCaravana(W: number, H: number, dpr: number) {
  const [img, x] = lienzo(W, H, dpr);
  x.fillStyle = '#0d1126';
  x.fillRect(0, 0, W, H);
  x.fillStyle = '#141a34';
  x.fillRect(0, 0, W, H * 0.72);
  x.strokeStyle = 'rgba(255,255,255,0.035)';
  x.lineWidth = 2;
  for (let px = W * 0.03; px < W; px += W * 0.045) {
    x.beginPath();
    x.moveTo(px, 0);
    x.lineTo(px, H * 0.72);
    x.stroke();
  }
  // The window with the dawn, a curtain drawn over its right half.
  const vx = W * 0.14;
  const vy = H * 0.16;
  const vw = W * 0.15;
  const vh = H * 0.22;
  const alba = x.createLinearGradient(0, vy, 0, vy + vh);
  alba.addColorStop(0, '#b9606a');
  alba.addColorStop(1, '#f2a25c');
  x.fillStyle = '#2a2236';
  x.beginPath();
  x.roundRect(vx - 6, vy - 6, vw + 12, vh + 12, 16);
  x.fill();
  x.fillStyle = alba;
  x.beginPath();
  x.roundRect(vx, vy, vw, vh, 12);
  x.fill();
  x.fillStyle = '#3a2a3a';
  x.beginPath();
  x.moveTo(vx + vw * 0.62, vy - 8);
  x.quadraticCurveTo(vx + vw * 0.56, vy + vh * 0.5, vx + vw * 0.66, vy + vh + 8);
  x.lineTo(vx + vw + 8, vy + vh + 8);
  x.lineTo(vx + vw + 8, vy - 8);
  x.fill();
  // The bench along the bottom and the bunk up on the right.
  x.fillStyle = '#1b2142';
  x.fillRect(W * 0.28, H * 0.66, W * 0.64, H * 0.12);
  x.fillStyle = '#151a36';
  x.fillRect(W * 0.28, H * 0.78, W * 0.64, H * 0.22);
  x.fillStyle = '#1b2142';
  x.fillRect(W * 0.64, H * 0.3, W * 0.36, H * 0.07);
  x.fillStyle = '#10142c';
  x.fillRect(W * 0.64, H * 0.37, W * 0.36, H * 0.03);
  // The window's beam, across the bench to the floor.
  const haz = x.createLinearGradient(vx, vy + vh, W * 0.5, H);
  haz.addColorStop(0, 'rgba(242,162,92,0.2)');
  haz.addColorStop(1, 'rgba(242,162,92,0.03)');
  x.fillStyle = haz;
  x.beginPath();
  x.moveTo(vx, vy + vh);
  x.lineTo(vx + vw * 0.6, vy + vh);
  x.lineTo(W * 0.58, H);
  x.lineTo(W * 0.3, H);
  x.fill();
  // On the floor, in the light: two cans and the arcade token.
  const lata = (lx: number, ly: number, giro: number) => {
    x.save();
    x.translate(lx, ly);
    x.rotate(giro);
    x.fillStyle = '#a8873e';
    x.fillRect(-H * 0.025, -H * 0.014, H * 0.05, H * 0.028);
    x.fillStyle = '#7c6230';
    x.fillRect(-H * 0.025, -H * 0.014, H * 0.006, H * 0.028);
    x.restore();
  };
  lata(W * 0.36, H * 0.93, 0.3);
  lata(W * 0.52, H * 0.96, 1.4);
  x.fillStyle = '#e0b84a';
  x.beginPath();
  x.ellipse(W * 0.45, H * 0.9, H * 0.022, H * 0.012, 0, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = '#a07a24';
  x.lineWidth = 1.5;
  x.beginPath();
  x.ellipse(W * 0.45, H * 0.9, H * 0.013, H * 0.007, 0, 0, Math.PI * 2);
  x.stroke();
  // A pilot's cap on a hook (the Joso's), by the window.
  const gx = W * 0.4;
  const gy = H * 0.2;
  x.fillStyle = '#5a5a66';
  x.fillRect(gx - 2, gy - H * 0.04, 4, H * 0.045);
  x.fillStyle = '#232a4c';
  x.beginPath();
  x.ellipse(gx, gy + H * 0.05, H * 0.07, H * 0.05, 0, Math.PI, 0);
  x.fill();
  x.fillStyle = '#171c36';
  x.beginPath();
  x.ellipse(gx + H * 0.03, gy + H * 0.055, H * 0.06, H * 0.016, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#9a8248';
  x.fillRect(gx - H * 0.065, gy + H * 0.03, H * 0.13, H * 0.012);
  return img;
}

/** The four lumps under their blankets, breathing, each head peeking out; Chuchi's jolts up. */
function dibujarBultos(x: CanvasRenderingContext2D, W: number, H: number, s: number) {
  const bulto = (bx: number, by: number, rw: number, rh: number, color: string, fase: number) => {
    const resp = 1 + 0.05 * Math.sin(s * 2.4 + fase);
    x.fillStyle = color;
    x.beginPath();
    x.ellipse(bx, by, rw, rh * resp, 0, Math.PI, 0);
    x.fill();
  };
  const bola = (bx: number, by: number, r: number, color: string) => {
    x.fillStyle = color;
    x.beginPath();
    x.arc(bx, by, r, 0, Math.PI * 2);
    x.fill();
  };
  const r = H * 0.05;
  // Pablo on the floor, still in a pilot's cap.
  bola(W * 0.1, H * 0.93, r, '#1a1412');
  x.fillStyle = '#232a4c';
  x.beginPath();
  x.ellipse(W * 0.1, H * 0.905, r * 1.15, r * 0.75, -0.3, Math.PI, 0);
  x.fill();
  x.fillStyle = '#9a8248';
  x.save();
  x.translate(W * 0.1, H * 0.905);
  x.rotate(-0.3);
  x.fillRect(-r * 1.1, -r * 0.25, r * 2.2, r * 0.2);
  x.restore();
  bulto(W * 0.21, H * 0.98, W * 0.1, H * 0.12, '#262c48', 0.5);
  // Fran on the bench: the back of his head, the beard, a sock sticking out of the teal blanket.
  bola(W * 0.32, H * 0.62, r, '#1f1814');
  bola(W * 0.335, H * 0.65, r * 0.8, '#1a1210');
  bulto(W * 0.44, H * 0.67, W * 0.11, H * 0.13, '#245a5e', 1.8);
  x.fillStyle = '#b9b3a8';
  x.beginPath();
  x.ellipse(W * 0.555, H * 0.65, H * 0.03, H * 0.02, 0.2, 0, Math.PI * 2);
  x.fill();
  // Chuchi on the bench: bald, glasses still on; around a second and a half in, his head jolts up.
  const salto = s > 1.5 && s < 2.1 ? Math.sin(((s - 1.5) / 0.6) * Math.PI) * H * 0.07 : 0;
  const cx = W * 0.665;
  const cy = H * 0.62 - salto;
  bola(cx, cy, r, '#b98a70');
  bola(cx - r * 0.3, cy - r * 0.4, r * 0.25, '#d8b29a');
  bola(cx + r * 0.1, cy + r * 0.55, r * 0.6, '#7b4627');
  x.strokeStyle = '#8a5a3c';
  x.lineWidth = Math.max(2, r * 0.14);
  x.strokeRect(cx - r * 0.85, cy - r * 0.05, r * 0.7, r * 0.45);
  x.strokeRect(cx + r * 0.05, cy - r * 0.05, r * 0.7, r * 0.45);
  bulto(W * 0.77, H * 0.67, W * 0.1, H * 0.12, '#55202c', 3.1);
  // Guille up on the bunk, under a mustard blanket with red flowers.
  bola(W * 0.72, H * 0.255, r, '#1f1814');
  bulto(W * 0.84, H * 0.3, W * 0.11, H * 0.09, '#8a6a26', 4.4);
  x.fillStyle = '#7a2a26';
  for (const [dx, dy] of [
    [-0.05, -0.03],
    [0.02, -0.06],
    [0.07, -0.02],
  ]) {
    x.beginPath();
    x.arc(W * (0.84 + dx), H * (0.3 + dy), H * 0.012, 0, Math.PI * 2);
    x.fill();
  }
  // Zzz from Fran and Guille, rising and fading.
  const zeta = (zx: number, zy: number, tam: number, a: number) => {
    x.globalAlpha = a;
    x.strokeStyle = '#f3ead6';
    x.lineWidth = Math.max(1.5, tam * 0.16);
    x.beginPath();
    x.moveTo(zx, zy);
    x.lineTo(zx + tam, zy);
    x.lineTo(zx, zy + tam);
    x.lineTo(zx + tam, zy + tam);
    x.stroke();
    x.globalAlpha = 1;
  };
  for (const [ox, oy, f] of [
    [0.33, 0.5, 0],
    [0.71, 0.17, 0.5],
  ]) {
    for (let k = 0; k < 3; k++) {
      const u = (s * 0.5 + f + k / 3) % 1;
      zeta(W * ox - u * W * 0.02, H * oy - u * H * 0.12, H * (0.025 + u * 0.02), 0.7 * Math.sin(u * Math.PI));
    }
  }
}

// ---------------------------------------------------------------- the arcade games (256×144)

const AW = 256;
const AH = 144;

/** A tiny bitmap from a map of letters, one per pixel (a letter not in the palette is empty). */
function sprite(mapa: string[], paleta: Record<string, string>) {
  const c = document.createElement('canvas');
  c.width = Math.max(...mapa.map((f) => f.length));
  c.height = mapa.length;
  const x = c.getContext('2d')!;
  mapa.forEach((fila, y) =>
    [...fila].forEach((l, i) => {
      if (!paleta[l]) return;
      x.fillStyle = paleta[l];
      x.fillRect(i, y, 1, 1);
    }),
  );
  return c;
}

/** Fran in his Pang: big dark beard, teal T-shirt, the pantaloneta with a bit of shin and sock. */
const FRAN = sprite(
  [
    '....hhhhhh....',
    '...hhhhhhhh...',
    '...hssssssh...',
    '...hseSSesh...',
    '...bssSSssb...',
    '...bbbbbbbb...',
    '...bbBbbBbb...',
    '....bbbbbb....',
    '..tttbbbbttt..',
    '.tttttttttttt.',
    '.tTttttttttTt.',
    '.s.tttttttt.s.',
    '.s.tttttttt.s.',
    '...TTTTTTTT...',
    '..pppppppppp..',
    '..ppppPPpppp..',
    '..pppp..pppp..',
    '..pppp..pppp..',
    '..ssss..ssss..',
    '..wwww..wwww..',
    '.zzzzz..zzzzz.',
    '.zzzzz..zzzzz.',
  ],
  { h: '#2b221e', s: '#e8b296', S: '#c88a70', e: '#2a1a16', b: '#2a201c', B: '#4a3a32', t: '#2e8a8c', T: '#1f6567', p: '#3e5279', P: '#2c3b5a', w: '#e9e4da', z: '#2f3138' },
);

/** Chuchi in his Space Invaders: bald and shiny, square brown glasses, red beard, maroon sweatshirt. */
const CHUCHI = sprite(
  [
    '....ssssss....',
    '...sLLsssss...',
    '...ssssssss...',
    '...ffffffff...',
    '...fefssfef...',
    '...ssssssss...',
    '...rrssssrr...',
    '...rrrrrrrr...',
    '....rrrrrr....',
    '...mmmmmmmm...',
    '..mmmmmmmmmm..',
    '..mmmmmmmmmm..',
    '..smmmmmmmms..',
    '...MMMMMMMM...',
    '...nnnnnnnn...',
    '...nnnnnnnn...',
    '...nnn..nnn...',
    '...nnn..nnn...',
    '...nnn..nnn...',
    '...nnn..nnn...',
    '..WWWW..WWWW..',
    '..WWWW..WWWW..',
  ],
  { s: '#f1c6a9', L: '#fde2cf', f: '#46291a', e: '#3d2a1e', r: '#a2643c', m: '#7b2432', M: '#5b1824', n: '#2b2c32', W: '#ecebe6' },
);

/** Pang's stage 1, «Usera», painted once: dusk, the blocks, the dragon of the park, the bricks. */
function pintarPang() {
  const c = document.createElement('canvas');
  c.width = AW;
  c.height = AH;
  const x = c.getContext('2d')!;
  const bandas = ['#1b2450', '#262d62', '#3a3470', '#55407a', '#7a4a80'];
  bandas.forEach((col, i) => {
    x.fillStyle = col;
    x.fillRect(8, 8 + i * 20, AW - 16, 20);
  });
  const r = azar(5);
  x.fillStyle = '#171a36';
  for (let px = 8; px < AW - 8; ) {
    const w = 14 + Math.floor(r() * 18);
    const a = 24 + Math.floor(r() * 40);
    x.fillRect(px, 112 - a, w, a);
    for (let wy = 112 - a + 4; wy < 108; wy += 6)
      for (let wx = px + 3; wx < px + w - 3; wx += 5) {
        if (r() < 0.6) continue;
        x.fillStyle = '#f2c66a';
        x.fillRect(wx, wy, 2, 2);
        x.fillStyle = '#171a36';
      }
    px += w + 2;
  }
  // The dragon of Usera: red humps with gold spikes, its head up on the right.
  x.fillStyle = '#2a4a32';
  x.fillRect(120, 104, 110, 8);
  for (let k = 0; k < 4; k++) {
    const hx = 132 + k * 22;
    x.fillStyle = '#c8323a';
    x.beginPath();
    x.arc(hx, 106, 9, Math.PI, 0);
    x.lineTo(hx + 5, 106);
    x.arc(hx, 106, 4, 0, Math.PI, true);
    x.fill();
    x.fillStyle = '#e8b84a';
    x.fillRect(hx - 1, 95, 2, 3);
  }
  x.fillStyle = '#c8323a';
  x.fillRect(216, 88, 10, 18);
  x.fillRect(214, 84, 16, 9);
  x.fillStyle = '#e8b84a';
  x.fillRect(226, 86, 4, 2);
  x.fillRect(216, 81, 2, 3);
  x.fillStyle = '#ffffff';
  x.fillRect(222, 86, 2, 2);
  // The floor: bricks.
  x.fillStyle = '#8a4a3a';
  x.fillRect(8, 112, AW - 16, 8);
  x.fillStyle = '#5e2e26';
  for (let bx = 8; bx < AW - 8; bx += 12) x.fillRect(bx, 112, 1, 8);
  x.fillRect(8, 116, AW - 16, 1);
  // The frame of blocks around the play area, and the score strip.
  x.fillStyle = '#5a6a8a';
  x.fillRect(0, 0, AW, 8);
  x.fillRect(0, 0, 8, 120);
  x.fillRect(AW - 8, 0, 8, 120);
  x.fillStyle = '#3a4866';
  for (let k = 0; k < AW; k += 8) {
    x.fillRect(k + 7, 0, 1, 8);
    if (k < 120) {
      x.fillRect(0, k + 7, 8, 1);
      x.fillRect(AW - 8, k + 7, 8, 1);
    }
  }
  x.fillStyle = '#05060c';
  x.fillRect(0, 120, AW, 24);
  return c;
}

/** A beer bubble: golden, darker rim, a cap of foam on top. */
function burbuja(x: CanvasRenderingContext2D, bx: number, by: number, r: number) {
  x.fillStyle = '#b07a1f';
  x.beginPath();
  x.arc(bx, by, r + 1, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#e9b13c';
  x.beginPath();
  x.arc(bx, by, r, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#fbf3dc';
  x.beginPath();
  x.arc(bx, by, r, Math.PI * 1.08, Math.PI * 1.92);
  x.fill();
  x.fillRect(Math.round(bx - r * 0.45), Math.round(by - r * 0.15), Math.max(1, Math.round(r * 0.18)), Math.max(1, Math.round(r * 0.18)));
}

/** Where the big bubble is at `s` seconds into the shot. */
const grande = (s: number) => ({ x: 170 - s * 70, y: 92 - 64 * Math.abs(Math.sin(((s + 0.15) * Math.PI) / 1.25)), r: 17 });
const DISPARO = 0.4;
const VEL_ARPON = 200;
const arponX = (s: number) => 106 + Math.min(s, DISPARO) * 12 + 7;
/** When the harpoon first touches the big bubble (found once by stepping through the shot). */
const POP = (() => {
  for (let s = DISPARO; s < 2; s += 0.005) {
    const b = grande(s);
    const tope = 90 - (s - DISPARO) * VEL_ARPON;
    if (tope <= b.y + b.r && Math.abs(arponX(s) - b.x) < b.r) return s;
  }
  return 1;
})();

function dibujarPang(x: CanvasRenderingContext2D, fondo: HTMLCanvasElement, s: number) {
  x.drawImage(fondo, 0, 0);
  const fx = 106 + Math.min(s, DISPARO) * 12;
  x.drawImage(FRAN, Math.round(fx), 90);
  // The harpoon: a zigzag rope from Fran up to its arrow, until it pops the bubble.
  if (s >= DISPARO && s < POP) {
    const ax = arponX(s);
    const tope = Math.max(8, 90 - (s - DISPARO) * VEL_ARPON);
    x.fillStyle = '#c9c2b4';
    for (let y = 90; y > tope; y -= 2) x.fillRect(ax + ((y >> 1) % 2 ? -1 : 0), y, 1, 2);
    x.fillStyle = '#e8e4d8';
    x.fillRect(ax - 2, tope, 5, 2);
    x.fillRect(ax - 1, tope - 2, 3, 2);
    x.fillRect(ax, tope - 3, 1, 1);
  }
  if (s < POP) {
    const b = grande(s);
    burbuja(x, b.x, b.y, b.r);
  } else {
    const p = grande(POP);
    const d = s - POP;
    // The pop: a spray of foam, and two smaller bubbles going their ways.
    if (d < 0.25) {
      x.fillStyle = '#fbf3dc';
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        x.fillRect(Math.round(p.x + Math.cos(a) * (6 + d * 90)), Math.round(p.y + Math.sin(a) * (6 + d * 90)), 2, 2);
      }
    }
    for (const lado of [-1, 1]) {
      let y = p.y - 60 * d + 110 * d * d;
      if (y > 100) y = 200 - y;
      burbuja(x, p.x + lado * 46 * d, y, 9);
    }
  }
  // The score strip.
  x.fillStyle = '#f3ead6';
  x.font = 'bold 9px monospace';
  x.textBaseline = 'top';
  x.fillText(texto('trailer.pang.jugador'), 12, 125);
  x.fillStyle = '#ffd36a';
  x.fillText(String(s < POP ? 4200 : 4700).padStart(6, '0'), 12, 134);
  x.fillStyle = '#f3ead6';
  const fase = texto('trailer.pang.fase');
  x.fillText(fase, (AW - x.measureText(fase).width) / 2, 129);
  for (let k = 0; k < 3; k++) x.drawImage(FRAN, 0, 0, 14, 8, AW - 22 - k * 16, 128, 14, 8);
}

/** An invader of the inbox: an envelope, a chat bubble or a calendar, in two frames. */
function invasor(x: CanvasRenderingContext2D, fila: number, ix: number, iy: number, paso: number) {
  const f = paso % 2;
  if (fila === 2) {
    x.fillStyle = '#e8e4d8';
    x.fillRect(ix, iy + f, 12, 8);
    x.fillStyle = '#9a9488';
    for (let k = 0; k < 6; k++) {
      x.fillRect(ix + k, iy + f + (f ? k : k >> 1), 1, 1);
      x.fillRect(ix + 11 - k, iy + f + (f ? k : k >> 1), 1, 1);
    }
  } else if (fila === 1) {
    x.fillStyle = '#6b5fd3';
    x.fillRect(ix, iy, 12, 7);
    x.fillRect(ix + (f ? 2 : 7), iy + 7, 3, 2);
    x.fillStyle = '#ffffff';
    for (let k = 0; k < 3; k++) if (f || k !== 1) x.fillRect(ix + 3 + k * 3, iy + 3, 1, 1);
  } else {
    x.fillStyle = '#f3ead6';
    x.fillRect(ix, iy + 2, 12, 8);
    x.fillStyle = '#d8323a';
    x.fillRect(ix, iy + 2, 12, 3);
    x.fillStyle = '#5a5450';
    x.fillRect(ix + 3, iy + (f ? 0 : 1), 1, 3);
    x.fillRect(ix + 8, iy + (f ? 0 : 1), 1, 3);
    x.fillRect(ix + 3, iy + 6, 2, 2);
    x.fillRect(ix + 7, iy + 6, 2, 2);
  }
}

const COLS = 7;
/** Where the inbox's grid is at `s`: marching sideways in steps, a row down at each turn. */
const rejilla = (s: number) => {
  const paso = Math.floor(s / 0.22);
  const vuelta = Math.floor(paso / 8);
  const k = paso % 8;
  return { x: 54 + (vuelta % 2 ? 8 - k : k) * 4, y: 22 + vuelta * 5, paso };
};
/** Chuchi's three shots: when each fires, and which invader it gets (found once). */
const TIROS = [0.25, 0.85, 1.45].map((t0) => {
  const cx = 70 + 40 * Math.sin(t0 * 2) + 7;
  for (let s = t0; s < 2; s += 0.005) {
    const y = 100 - (s - t0) * 230;
    const g = rejilla(s);
    for (let fila = 2; fila >= 0; fila--) {
      const iy = g.y + fila * 14;
      if (y > iy + 10 || y < iy) continue;
      const col = Math.round((cx - 6 - g.x) / 18);
      if (col >= 0 && col < COLS && Math.abs(g.x + col * 18 + 6 - cx) <= 7) return { t0, cx, s, fila, col };
    }
  }
  return { t0, cx, s: 9, fila: -1, col: -1 };
});

function dibujarInvaders(x: CanvasRenderingContext2D, s: number) {
  x.fillStyle = '#05060c';
  x.fillRect(0, 0, AW, AH);
  const r = azar(9);
  x.fillStyle = '#3a3e5a';
  for (let k = 0; k < 30; k++) x.fillRect(Math.floor(r() * AW), Math.floor(12 + r() * 100), 1, 1);
  const g = rejilla(s);
  for (let fila = 0; fila < 3; fila++)
    for (let col = 0; col < COLS; col++) {
      const tiro = TIROS.find((t) => t.fila === fila && t.col === col);
      const ix = g.x + col * 18;
      const iy = g.y + fila * 14;
      if (tiro && s >= tiro.s) {
        // Hit: a burst for a moment, then gone.
        if (s - tiro.s < 0.2) {
          x.fillStyle = '#ffd36a';
          for (const [dx, dy] of [[0, 0], [-4, -3], [4, -3], [-4, 3], [4, 3], [0, -5], [0, 5], [-6, 0], [6, 0]]) x.fillRect(ix + 5 + dx, iy + 4 + dy, 2, 2);
        }
        continue;
      }
      invasor(x, fila, ix, iy, g.paso);
    }
  // The boss crossing the top: a grey saucer with a red tie swinging under it.
  const ux = -24 + s * 150;
  x.fillStyle = '#9aa0ae';
  x.fillRect(ux, 13, 20, 4);
  x.fillRect(ux + 5, 10, 10, 3);
  x.fillStyle = '#d8dde6';
  x.fillRect(ux + 7, 9, 6, 2);
  const balanceo = Math.round(Math.sin(s * 9) * 2);
  x.fillStyle = '#c8323a';
  x.fillRect(ux + 9, 17, 3, 2);
  x.fillRect(ux + 9 + (balanceo >> 1), 19, 3, 4);
  x.fillRect(ux + 8 + balanceo, 23, 5, 3);
  // The shields.
  x.fillStyle = '#3ad06a';
  for (const bx of [40, 112, 184]) {
    x.fillRect(bx, 86, 24, 8);
    x.fillRect(bx + 2, 84, 20, 2);
    x.fillStyle = '#05060c';
    x.fillRect(bx + 8, 90, 8, 4);
    x.fillStyle = '#3ad06a';
  }
  // Chuchi and his shots.
  const cx = 70 + 40 * Math.sin(s * 2);
  x.drawImage(CHUCHI, Math.round(cx), 102);
  x.fillStyle = '#ffd36a';
  for (const t of TIROS) {
    if (s < t.t0 || s >= t.s) continue;
    x.fillRect(Math.round(t.cx), Math.round(100 - (s - t.t0) * 230), 1, 4);
  }
  x.fillStyle = '#3ad06a';
  x.fillRect(0, 124, AW, 1);
  // Score at the top, the player at the bottom.
  x.font = 'bold 9px monospace';
  x.textBaseline = 'top';
  x.fillStyle = '#f3ead6';
  const puntos = texto('trailer.invaders.puntos');
  x.fillText(puntos, 8, 1);
  x.fillStyle = '#3ad06a';
  x.fillText(String(1280 + TIROS.filter((t) => s >= t.s).length * 30).padStart(5, '0'), 12 + x.measureText(puntos).width, 1);
  x.fillStyle = '#f3ead6';
  x.fillText(texto('trailer.invaders.jugador'), 8, 130);
  for (let k = 0; k < 2; k++) x.drawImage(CHUCHI, 0, 0, 14, 9, AW - 22 - k * 16, 130, 14, 9);
}

// ---------------------------------------------------------------- Vero

/**
 * Vero, from the nose down, so close that her face fills the screen: perfect skin, a
 * smile, and her mouth opening wider and wider; deep inside, the warm little lights of
 * a bar. Drawn every frame (a handful of paths).
 */
function dibujarVero(x: CanvasRenderingContext2D, W: number, H: number, s: number) {
  const cx = W / 2;
  const cy = H * 0.58;
  const piel = x.createRadialGradient(cx, H * 0.45, H * 0.1, cx, H * 0.5, Math.max(W, H) * 0.7);
  piel.addColorStop(0, '#f8dccb');
  piel.addColorStop(0.55, '#efc5ad');
  piel.addColorStop(1, '#d9a087');
  x.fillStyle = piel;
  x.fillRect(0, 0, W, H);
  const zoom = 1 + 0.06 * suave(s / 2.5);
  x.save();
  x.translate(cx, cy);
  x.scale(zoom, zoom);
  x.translate(-cx, -cy);
  // The underside of the nose, and the soft groove down to the lip.
  x.fillStyle = 'rgba(176,110,90,0.22)';
  x.beginPath();
  x.ellipse(cx, H * 0.05, H * 0.2, H * 0.06, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = 'rgba(150,90,72,0.5)';
  for (const lado of [-1, 1]) {
    x.beginPath();
    x.ellipse(cx + lado * H * 0.065, H * 0.07, H * 0.032, H * 0.016, lado * 0.25, 0, Math.PI * 2);
    x.fill();
  }
  x.fillStyle = 'rgba(200,140,118,0.08)';
  x.beginPath();
  x.ellipse(cx, H * 0.27, H * 0.04, H * 0.1, 0, 0, Math.PI * 2);
  x.fill();
  // The mouth: a closed smile, then opening.
  const o = suave((s - 0.5) / 1.7);
  const mw = H * 0.62 * (1 + 0.12 * o);
  const iz = cx - mw / 2;
  const de = cx + mw / 2;
  const esquina = cy - H * 0.03 - o * H * 0.01;
  const arriba = cy + H * 0.03 - o * H * 0.05;
  const abajo = arriba + o * H * 0.65;
  const grosor = H * 0.1;
  // The lower lip's shadow on the chin.
  x.fillStyle = 'rgba(176,110,90,0.22)';
  x.beginPath();
  x.ellipse(cx, (esquina + abajo) / 2 + grosor * 1.2, mw * 0.32, grosor * 0.5, 0, 0, Math.PI * 2);
  x.fill();
  if (o > 0.01) {
    x.save();
    x.beginPath();
    x.moveTo(iz, esquina);
    x.quadraticCurveTo(cx, arriba, de, esquina);
    x.quadraticCurveTo(cx, abajo, iz, esquina);
    x.clip();
    x.fillStyle = '#2a0c14';
    x.fillRect(iz, esquina - H * 0.1, mw, H);
    const my = (esquina + (arriba + abajo) / 2) / 2;
    const hondo = x.createRadialGradient(cx, my, 0, cx, my, mw * 0.4);
    hondo.addColorStop(0, '#0c0306');
    hondo.addColorStop(1, 'rgba(12,3,6,0)');
    x.fillStyle = hondo;
    x.fillRect(iz, esquina - H * 0.1, mw, H);
    // Deep inside: the little lights of a bar, and a red neon.
    if (o > 0.45) {
      const a = Math.min(1, (o - 0.45) * 2.5);
      x.fillStyle = `rgba(255,207,122,${0.85 * a})`;
      for (let k = 0; k < 5; k++) x.fillRect(cx - H * 0.06 + k * H * 0.03, my - H * 0.02, H * 0.008, H * 0.008);
      x.fillStyle = `rgba(255,90,90,${0.8 * a})`;
      x.fillRect(cx - H * 0.025, my + H * 0.01, H * 0.05, H * 0.012);
    }
    // The upper teeth.
    x.fillStyle = '#f4efe6';
    x.beginPath();
    x.moveTo(iz, esquina);
    x.quadraticCurveTo(cx, arriba, de, esquina);
    x.quadraticCurveTo(cx, arriba + H * 0.1, iz, esquina);
    x.fill();
    x.restore();
  }
  // Upper lip: the cupid's bow down to the mouth's line.
  x.fillStyle = '#b8323f';
  x.beginPath();
  x.moveTo(iz, esquina);
  x.bezierCurveTo(cx - mw * 0.3, esquina - H * 0.05, cx - mw * 0.14, cy - H * 0.1, cx - mw * 0.06, cy - H * 0.09);
  x.quadraticCurveTo(cx, cy - H * 0.07, cx + mw * 0.06, cy - H * 0.09);
  x.bezierCurveTo(cx + mw * 0.14, cy - H * 0.1, cx + mw * 0.3, esquina - H * 0.05, de, esquina);
  x.quadraticCurveTo(cx, arriba, iz, esquina);
  x.fill();
  // Lower lip: the same thickness all along, whatever the mouth does.
  x.fillStyle = '#c63e4e';
  x.beginPath();
  x.moveTo(iz, esquina);
  x.quadraticCurveTo(cx, abajo, de, esquina);
  x.quadraticCurveTo(cx, abajo + grosor * 2, iz, esquina);
  x.fill();
  if (o <= 0.01) {
    x.strokeStyle = '#7a1e2a';
    x.lineWidth = Math.max(1.5, H * 0.006);
    x.beginPath();
    x.moveTo(iz, esquina);
    x.quadraticCurveTo(cx, arriba, de, esquina);
    x.stroke();
  }
  // The smile's dimples.
  x.strokeStyle = 'rgba(176,110,90,0.4)';
  x.lineWidth = Math.max(2, H * 0.008);
  x.lineCap = 'round';
  for (const lado of [-1, 1]) {
    x.beginPath();
    x.arc(cx + lado * (mw / 2 - H * 0.01), esquina, H * 0.05, lado > 0 ? -0.5 : Math.PI - 0.5, lado > 0 ? 0.5 : Math.PI + 0.5);
    x.stroke();
  }
  x.restore();
}

// ---------------------------------------------------------------- the trailer

export interface OpcionesTrailer {
  /** For the tests: play from here (seconds) and loop back at `hasta`. */
  desde?: number;
  hasta?: number;
}

export function mostrarTrailer(parent: HTMLElement, sonido: SonidoTrailer | null, rapido = false, op: OpcionesTrailer = {}): Promise<void> {
  if (rapido) return Promise.resolve();
  const canvas = h('canvas', { class: 'plano', 'aria-hidden': 'true' });
  const ctx = canvas.getContext('2d')!;
  const pixel = document.createElement('canvas');
  pixel.width = AW;
  pixel.height = AH;
  const px = pixel.getContext('2d')!;
  const fondoPang = pintarPang();

  // The words, each shown between two times.
  const tx = (clase: string, ...kids: Array<Node | string>) => h('div', { class: `texto ${clase}`, hidden: true }, ...kids);
  const narrador = dialogo('trailer.narrador');
  const silabas = texto('trailer.canto')
    .split(' ')
    .map((p) => p.split('-'));
  const spans: HTMLElement[] = [];
  const canto = tx(
    'canto',
    ...silabas.flatMap((palabra, i) => {
      const w = h('span', { class: 'palabra' }, ...palabra.map((sil) => {
        const e = h('span', { class: 'silaba' }, sil);
        spans.push(e);
        return e;
      }));
      return i ? [' ', w] : [w];
    }),
  );
  const cuando = spans.map((_, i) => (spans.length === CANTO.length ? CANTO[i] : CANTO[0] + ((CANTO[CANTO.length - 1] - CANTO[0]) * i) / Math.max(1, spans.length - 1)));
  const logo = h('img', { alt: '' });
  void logoClaro().then((u) => (logo.src = u));
  const textos: Array<[number, number, HTMLElement]> = [
    [1.0, 3.8, tx('manana', texto('trailer.manana'))],
    [5.0, 9.4, tx('lugar', texto('trailer.lugar'))],
    [12.5, 14.5, tx('cartel', texto('trailer.cartel1'))],
    [16.5, 18.5, tx('cartel', texto('trailer.cartel2'))],
    [20.5, 22.0, tx('cartel', texto('trailer.cartel3'))],
    [25.0, 29.4, tx('narrador', ...narrador.map((l, i) => h('p', { style: `animation-delay:${i * 1.8}s` }, l.texto)))],
    [29.6, 32.6, canto],
    [32.6, 99, tx('cierre', logo, h('div', { class: 'capitulo' }, texto('trailer.capitulo')), h('div', { class: 'proximamente' }, texto('trailer.proximamente')))],
  ];
  const saltar = h('button', { class: 'btn fantasma saltar' }, texto('trailer.saltar'));
  const capa = h('div', { class: 'cubierta trailer' }, canvas, ...textos.map(([, , e]) => e), saltar);
  parent.append(capa);

  // The painted shots, again if the screen changes size.
  let W = 0;
  let H = 0;
  let dpr = 1;
  let desierto: Desierto | null = null;
  let caravana: HTMLCanvasElement | null = null;
  let pintado: Plano | null = null;
  const medir = () => {
    const caja = capa.getBoundingClientRect();
    W = Math.max(2, caja.width);
    H = Math.max(2, caja.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    desierto = pintarDesierto(W, H, dpr);
    caravana = pintarCaravana(W, H, dpr);
    pintado = null;
  };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(capa);

  const dibujar = (t: number) => {
    const [p, s] = plano(t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (p === 'desierto' && desierto) {
      // A slow push in on the caravan, and its smoke going up and away with the wind.
      const z = 1 + 0.07 * suave(s / 5.5);
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * desierto.cx * (1 - z), dpr * desierto.cy * (1 - z));
      ctx.drawImage(desierto.img, 0, 0, W, H);
      for (let k = 0; k < 9; k++) {
        const u = (t * 0.32 + k / 9) % 1;
        ctx.fillStyle = `rgba(196,186,206,${0.4 * (1 - u)})`;
        ctx.beginPath();
        ctx.arc(desierto.humoX - u * W * 0.05 + Math.sin(u * 7 + k) * 2, desierto.humoY - u * H * 0.16, 1.5 + u * H * 0.022, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p === 'caravana' && caravana) {
      ctx.drawImage(caravana, 0, 0, W, H);
      dibujarBultos(ctx, W, H, s);
    } else if (p === 'pang' || p === 'invaders') {
      if (p === 'pang') dibujarPang(px, fondoPang, s);
      else dibujarInvaders(px, s);
      // The game fills the height, centred, on a black bezel.
      if (pintado !== p) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
      }
      const k = Math.min(W / AW, H / AH);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pixel, Math.round((W - AW * k) / 2), Math.round((H - AH * k) / 2), Math.round(AW * k), Math.round(AH * k));
      ctx.imageSmoothingEnabled = true;
    } else if (p === 'vero') {
      dibujarVero(ctx, W, H, s);
    } else if (pintado !== p) {
      // Black under the words: drawn once.
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
    }
    pintado = p;
    return p;
  };
  const mostrar = (t: number) => {
    for (const [t0, t1, e] of textos) {
      const ver = t >= t0 && t < t1;
      if (e.hidden === ver) e.hidden = !ver;
    }
    spans.forEach((e, i) => {
      const ver = t >= cuando[i];
      if (e.classList.contains('on') !== ver) e.classList.toggle('on', ver);
    });
  };

  return new Promise((resolve) => {
    const desde = op.desde ?? 0;
    let t = desde;
    let acabado = false;
    let empezado = false;
    let ultimo = 0;
    let fotogramas = 0;
    let actual: Plano = 'negro';
    const fin = () => {
      if (acabado) return;
      acabado = true;
      ro.disconnect();
      sonido?.pararMusica(0.8);
      capa.classList.add('sale');
      setTimeout(() => {
        capa.remove();
        // Give the painted shots' memory back.
        canvas.width = canvas.height = 0;
        desierto = caravana = null;
        resolve();
      }, 600);
    };
    const paso = (ahora: number) => {
      if (acabado) return;
      requestAnimationFrame(paso);
      // 60 fps at most, also on 120 Hz screens.
      if (ultimo && ahora - ultimo < 1000 / 60 - 4) return;
      // Time only runs while frames do (a hidden page stops both them and the music).
      t += ultimo ? Math.min(0.1, (ahora - ultimo) / 1000) : 0;
      ultimo = ahora;
      if (op.hasta && t >= op.hasta) t = desde;
      if (t >= FIN) return fin();
      actual = dibujar(t);
      mostrar(t);
      fotogramas++;
    };
    const empezar = () => {
      if (empezado || acabado) return;
      empezado = true;
      sonido?.musica('trailer');
      requestAnimationFrame(paso);
    };
    // Black until the music has loaded (it was asked for in advance), so the cuts land on its hits.
    dibujar(t);
    void Promise.race([sonido?.lista?.('trailer') ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]).then(empezar);
    capa.addEventListener('click', (e) => {
      e.stopPropagation();
      if (t >= TOCABLE) fin();
    });
    saltar.addEventListener('click', (e) => {
      e.stopPropagation();
      fin();
    });
    // Test hook for scripts/playthrough.mjs and scripts/rendimiento.mjs.
    (window as unknown as { __trailer: unknown }).__trailer = () => ({ t, plano: actual, fotogramas, acabado });
  });
}
