// The trailer of chapter 2: after the «Continuará…» of chapter 1, some loose shots of what
// comes next, cut to an action-trailer track that is at full blast from the first frame.
// Three cards, each followed by a shot: «Una resaca...», shots slammed on a bar; «Con
// consecuencias», the caravan flat out across the desert; «Inesperadas», and the montage,
// one cut per hit and faster and faster: Fran in his Pang, a beer sliding down the bar,
// Chuchi in his Space Invaders, a slot machine paying the jackpot; Vero opening her mouth
// until it swallows the camera; black; the chant; the logo and «Próximamente».
//
// The shots follow the music beat by beat (src/sonido/trailer.mp3, made by
// tools/musica/trailer.py): PLANOS and CANTO here are the times of the hits there, so
// change one, change both. The time is the music's own clock while it plays (Sound.posicion),
// so a slow phone drops frames but never falls behind the beat. The words are in
// src/textos/capitulo1.md (trailer.*). The script of the trailer is in docs/JUGABILIDAD.md.
//
// The arcade games are pixel art on purpose: they are games inside the game (the style
// guide's «no pixel art» is about the game itself). Fran and Chuchi there are tiny bitmaps
// made once from the maps below; each game is simulated once, at the start, and a frame
// only looks up where everything is.
//
// Performance (docs/ESTILO.md, T5): the bar, the desert's layers, the pickup with its
// caravan and the slot machine are painted once (again if the screen changes size) and each
// frame only draws those images and a few small shapes; the games are drawn at 256×144 and
// scaled up; the cards, the chant and the title are DOM over a black canvas that is not
// redrawn. The loop never passes 60 fps and the scene underneath is paused meanwhile
// (capitulo1.ts).
import { h } from './hud';
import { texto } from '../juego/textos';
import type { Pista } from '../sonido/musica';
import { logoClaro } from './logo';

/** What the trailer needs from the sound: its track, started at once, and where it is. */
export interface SonidoTrailer {
  musica(id: Pista, entra?: number): void;
  pararMusica(fundido?: number): void;
  lista?(id: Pista): Promise<void>;
  posicion?(id: Pista): number | null;
}

type Plano = 'cartel' | 'barra' | 'carretera' | 'pang' | 'cerveza' | 'invaders' | 'tragaperras' | 'vero' | 'negro' | 'canto' | 'titulo';

/**
 * When each shot starts (seconds), the same as the music's (tools/musica/trailer.py), and
 * how far into its own action it picks up: the montage comes back to each game where it left it.
 */
const PLANOS: Array<[number, Plano, number]> = [
  [0, 'cartel', 0],
  [2, 'barra', 0],
  [4, 'cartel', 0],
  [6, 'carretera', 0],
  [8, 'cartel', 0],
  [10, 'pang', 0],
  [12, 'cerveza', 0],
  [13, 'invaders', 0],
  [15, 'tragaperras', 0],
  [17, 'pang', 2],
  [18, 'cerveza', 1],
  [19, 'invaders', 2],
  [20, 'tragaperras', 2],
  [21, 'pang', 3],
  [21.5, 'cerveza', 2],
  [22, 'invaders', 3],
  [22.5, 'tragaperras', 3],
  [23, 'vero', 0],
  [26, 'negro', 0],
  [27, 'canto', 0],
  [30, 'titulo', 0],
];
/** The brass stabs of the chant, one syllable each («Ca-mio-neees y ca-ra-va-naaas»). */
const CANTO = [27, 27.25, 27.5, 28.25, 28.45, 28.7, 28.95, 29.2];
/** The title can be tapped away from here; it goes by itself at FIN. */
const TOCABLE = 31;
const FIN = 36;

const plano = (t: number): [Plano, number] => {
  let i = 0;
  while (i + 1 < PLANOS.length && t >= PLANOS[i + 1][0]) i++;
  return [PLANOS[i][1], t - PLANOS[i][0] + PLANOS[i][2]];
};

const azar = (semilla: number) => () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
const suave = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const mezclar = (a: number, b: number, u: number) => a + (b - a) * u;

/** A canvas of W×H CSS px at density `dpr`, with its context already scaled. */
function lienzo(W: number, H: number, dpr: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(W * dpr));
  c.height = Math.max(2, Math.round(H * dpr));
  const x = c.getContext('2d')!;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, x] as const;
}

const elipse = (x: CanvasRenderingContext2D, ex: number, ey: number, rx: number, ry: number, color: string, giro = 0) => {
  x.fillStyle = color;
  x.beginPath();
  x.ellipse(ex, ey, Math.max(0.1, rx), Math.max(0.1, ry), giro, 0, Math.PI * 2);
  x.fill();
};

// ---------------------------------------------------------------- the bar

/** The bar's counter, painted once: wider than the screen, so the camera can follow a glass. */
interface Bar {
  img: HTMLCanvasElement;
  /** Its width in CSS px (the height is the screen's). */
  ancho: number;
  /** Where things stand on the counter. */
  encimera: number;
}

/**
 * A bar at night, painted once: a warm dark wall, shelves of bottles in the haze behind, a
 * string of little bulbs, and the counter in front, seen from above: polished wood that gets
 * nearer and warmer towards the bottom, with the bulbs' light on its varnish.
 */
function pintarBar(W: number, H: number, dpr: number): Bar {
  const ancho = W * 1.5;
  const [img, x] = lienzo(ancho, H, dpr);
  const r = azar(21);
  const fondo = H * 0.56;
  const pared = x.createLinearGradient(0, 0, 0, fondo);
  pared.addColorStop(0, '#140b10');
  pared.addColorStop(1, '#3a1d18');
  x.fillStyle = pared;
  x.fillRect(0, 0, ancho, fondo);
  // Three shelves of bottles.
  for (const by of [H * 0.17, H * 0.32, H * 0.47]) {
    for (let bx = r() * 20; bx < ancho; ) {
      const bw = H * (0.03 + r() * 0.02);
      const bh = H * (0.075 + r() * 0.04);
      x.fillStyle = ['#8a4a1c', '#2e5a2a', '#9aa7a0', '#6a1820', '#b07a2a', '#3a2a4a'][Math.floor(r() * 6)];
      x.beginPath();
      x.roundRect(bx, by - bh, bw, bh, bw * 0.3);
      x.fill();
      x.fillRect(bx + bw * 0.32, by - bh - H * 0.025, bw * 0.36, H * 0.03);
      x.fillStyle = 'rgba(255,220,170,0.25)';
      x.fillRect(bx + bw * 0.18, by - bh * 0.85, bw * 0.14, bh * 0.6);
      bx += bw + H * (0.01 + r() * 0.03);
    }
    x.fillStyle = '#5a3422';
    x.fillRect(0, by, ancho, H * 0.016);
    x.fillStyle = '#8a5a36';
    x.fillRect(0, by, ancho, H * 0.004);
  }
  // A warm haze over the back of the bar, so what is on the counter stands out (F4).
  x.fillStyle = 'rgba(40,18,16,0.45)';
  x.fillRect(0, 0, ancho, fondo);
  // A string of bulbs sagging across the top, each with its own small glow (L5).
  for (let k = 0; k < 3; k++) {
    const x0 = (ancho / 3) * k;
    const x1 = x0 + ancho / 3;
    x.strokeStyle = '#2a1a16';
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(x0, H * 0.04);
    x.quadraticCurveTo((x0 + x1) / 2, H * 0.13, x1, H * 0.04);
    x.stroke();
    for (let j = 1; j < 8; j++) {
      const u = j / 8;
      const bx = mezclar(x0, x1, u);
      const by = H * 0.04 + 4 * u * (1 - u) * H * 0.045 + H * 0.012;
      const halo = x.createRadialGradient(bx, by, 0, bx, by, H * 0.06);
      halo.addColorStop(0, 'rgba(255,190,110,0.35)');
      halo.addColorStop(1, 'rgba(255,190,110,0)');
      x.fillStyle = halo;
      x.fillRect(bx - H * 0.06, by - H * 0.06, H * 0.12, H * 0.12);
      elipse(x, bx, by, H * 0.008, H * 0.011, '#ffd9a0');
    }
  }
  // The counter's far edge, then its top coming towards us.
  x.fillStyle = '#b07a48';
  x.fillRect(0, fondo - H * 0.008, ancho, H * 0.008);
  const tapa = x.createLinearGradient(0, fondo, 0, H);
  tapa.addColorStop(0, '#3a1c10');
  tapa.addColorStop(1, '#8e502c');
  x.fillStyle = tapa;
  x.fillRect(0, fondo, ancho, H - fondo);
  // The grain of the wood, running along the counter.
  x.fillStyle = 'rgba(40,16,8,0.18)';
  for (let k = 0; k < 9; k++) {
    const y = fondo + (H - fondo) * ((k + r() * 0.5) / 9) ** 1.4;
    x.fillRect(0, y, ancho, Math.max(1, H * 0.003 * (1 + k * 0.3)));
  }
  // The bulbs and the bottles shining on the varnish.
  for (let bx = r() * 40; bx < ancho; bx += H * (0.1 + r() * 0.14)) {
    const brillo = x.createLinearGradient(0, fondo, 0, fondo + H * 0.22);
    brillo.addColorStop(0, 'rgba(255,200,130,0.16)');
    brillo.addColorStop(1, 'rgba(255,200,130,0)');
    x.fillStyle = brillo;
    x.fillRect(bx, fondo, H * (0.01 + r() * 0.02), H * 0.22);
  }
  return { img, ancho, encimera: H * 0.83 };
}

/** A pint of beer `ph` px tall with its head of foam, painted once (its bottom centre is at the middle of the bottom). */
function pintarCana(ph: number, dpr: number) {
  const pw = ph * 0.52;
  const [c, x] = lienzo(pw * 1.3, ph * 1.12, dpr);
  const ox = pw * 0.15;
  const oy = ph * 0.12;
  const vaso = () => {
    x.beginPath();
    x.moveTo(ox, oy);
    x.lineTo(ox + pw, oy);
    x.lineTo(ox + pw * 0.88, oy + ph);
    x.lineTo(ox + pw * 0.12, oy + ph);
    x.closePath();
  };
  x.save();
  vaso();
  x.clip();
  const cerveza = x.createLinearGradient(0, oy, 0, oy + ph);
  cerveza.addColorStop(0, '#f2b632');
  cerveza.addColorStop(1, '#b8701a');
  x.fillStyle = cerveza;
  x.fillRect(0, oy, pw * 1.3, ph);
  x.fillStyle = 'rgba(255,240,200,0.35)';
  x.fillRect(ox + pw * 0.12, oy, pw * 0.1, ph);
  x.restore();
  // The head of foam, spilling a little over the rim.
  x.fillStyle = '#fbf3dc';
  x.fillRect(ox, oy, pw, ph * 0.14);
  for (let k = 0; k < 5; k++) elipse(x, ox + pw * (0.1 + k * 0.2), oy, pw * 0.14, ph * 0.08, '#fbf3dc');
  x.strokeStyle = 'rgba(235,245,250,0.55)';
  x.lineWidth = Math.max(1, ph * 0.012);
  vaso();
  x.stroke();
  x.fillStyle = 'rgba(235,245,250,0.4)';
  x.fillRect(ox + pw * 0.12, oy + ph - ph * 0.05, pw * 0.76, ph * 0.05);
  return { img: c, w: pw * 1.3, h: ph * 1.12 };
}
type Cana = ReturnType<typeof pintarCana>;

/** The four shots slammed down on the counter, one a beat, and the liquor inside each. */
const CHUPITOS = ['#d08a2a', '#6fae3a', '#c8323a', '#e0a83a'];

/**
 * Shots and beers on the bar: two pints with their bubbles going up, and a shot glass
 * slammed down on each beat (a quick fall, a squash, a splash), the camera jolting each time.
 */
function dibujarBarra(x: CanvasRenderingContext2D, W: number, H: number, bar: Bar, cana: Cana, s: number) {
  const golpe = s % 0.5;
  const sacudida = s < 2 ? Math.max(0, 1 - golpe / 0.14) * H * 0.012 : 0;
  const z = 1.04 + 0.04 * suave(s / 2);
  x.save();
  x.translate(W / 2, H / 2 + sacudida * Math.sin(s * 90));
  x.scale(z, z);
  x.translate(-W / 2, -H / 2);
  x.drawImage(bar.img, -(bar.ancho - W) * 0.35, 0, bar.ancho, H);
  const base = bar.encimera;
  // The pints on either side, their bubbles rising.
  for (const [px, fase] of [[W * 0.15, 0], [W * 0.85, 0.5]]) {
    x.drawImage(cana.img, px - cana.w / 2, base - cana.h + cana.h * 0.02, cana.w, cana.h);
    x.fillStyle = 'rgba(255,245,215,0.7)';
    for (let k = 0; k < 6; k++) {
      const u = (s * 0.8 + fase + k / 6) % 1;
      x.fillRect(px - cana.w * 0.22 + ((k * 37) % 10) * cana.w * 0.045, base - cana.h * 0.06 - u * cana.h * 0.68, 2, 2);
    }
  }
  // The shots.
  const sh = H * 0.21;
  const tw = sh * 0.72;
  const bw = sh * 0.56;
  CHUPITOS.forEach((licor, k) => {
    // It lands on the beat: it starts falling just before (the first one is already landing at the cut).
    const d = s - k * 0.5 + 0.07;
    if (d < 0) return;
    const gx = W * (0.335 + k * 0.11);
    const cae = d < 0.07 ? (1 - d / 0.07) ** 2 * H * 0.45 : 0;
    const aplasta = d >= 0.07 && d < 0.2 ? 1 - 0.14 * Math.sin(((d - 0.07) / 0.13) * Math.PI) : 1;
    const alto = sh * aplasta;
    const ancho = 1 + (1 - aplasta) * 0.6;
    const y0 = base - cae;
    x.save();
    x.translate(gx, y0);
    x.scale(ancho, 1);
    // The glass: a thick base, the liquor, the rim.
    x.fillStyle = 'rgba(215,232,238,0.32)';
    x.beginPath();
    x.moveTo(-tw / 2, -alto);
    x.lineTo(tw / 2, -alto);
    x.lineTo(bw / 2, 0);
    x.lineTo(-bw / 2, 0);
    x.closePath();
    x.fill();
    const nivel = 0.62 + (d < 0.3 ? 0.05 * Math.sin(d * 40) * (1 - d / 0.3) : 0);
    x.fillStyle = licor;
    x.beginPath();
    x.moveTo(-mezclar(bw, tw, nivel) / 2 + 2, -alto * nivel);
    x.lineTo(mezclar(bw, tw, nivel) / 2 - 2, -alto * nivel);
    x.lineTo(bw / 2 - 2, -alto * 0.2);
    x.lineTo(-bw / 2 + 2, -alto * 0.2);
    x.closePath();
    x.fill();
    x.fillStyle = 'rgba(235,245,250,0.5)';
    x.fillRect(-bw / 2, -alto * 0.2, bw, alto * 0.2);
    x.fillRect(-tw / 2, -alto, tw, Math.max(1.5, alto * 0.025));
    x.fillStyle = 'rgba(255,255,255,0.35)';
    x.fillRect(-tw * 0.32, -alto * 0.9, tw * 0.08, alto * 0.6);
    x.restore();
    // The splash: drops of liquor thrown up and out, falling back.
    if (d >= 0.07 && d < 0.45) {
      const u = d - 0.07;
      x.fillStyle = licor;
      for (let j = 0; j < 7; j++) {
        const a = -Math.PI / 2 + (j - 3) * 0.38;
        const v = H * (0.5 + (j % 3) * 0.18);
        const dx = Math.cos(a) * v * u;
        const dy = Math.sin(a) * v * u + H * 3.2 * u * u;
        elipse(x, gx + dx, base - sh * 0.62 + dy, H * 0.007, H * 0.009, licor);
      }
    }
  });
  x.restore();
}

/**
 * A beer sliding down the bar at full speed: the camera at the counter's height swings after
 * it, the glass leans back and leaves a wet trail and its own ghosts behind. It crosses once
 * per stretch of the montage, each time the other way.
 */
const CRUCES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 2.5],
];
function dibujarCerveza(x: CanvasRenderingContext2D, W: number, H: number, bar: Bar, cana: Cana, s: number) {
  const i = Math.max(0, CRUCES.findIndex(([a, b]) => s >= a && s < b));
  const [a, b] = CRUCES[i];
  const u = Math.min(1, (s - a) / (b - a));
  const dir = i % 2 ? -1 : 1;
  const z = 1.1;
  const gx = dir > 0 ? mezclar(-W * 0.25, W * 1.25, u) : mezclar(W * 1.25, -W * 0.25, u);
  // The camera swings after the glass, but slower: the bar runs past the other way.
  const panorama = (bar.ancho * z - W) * (dir > 0 ? u : 1 - u);
  x.drawImage(bar.img, -panorama, -H * 0.06, bar.ancho * z, H * z);
  const base = H * 0.93;
  const vel = (W * 1.5) / (b - a);
  // The wet trail on the varnish.
  const desde = dir > 0 ? Math.max(0, gx - W * 0.9) : gx;
  const hasta = dir > 0 ? gx : Math.min(W, gx + W * 0.9);
  const rastro = x.createLinearGradient(dir > 0 ? hasta : desde, 0, dir > 0 ? desde : hasta, 0);
  rastro.addColorStop(0, 'rgba(255,220,160,0.35)');
  rastro.addColorStop(1, 'rgba(255,220,160,0)');
  x.fillStyle = rastro;
  x.fillRect(desde, base - H * 0.008, Math.max(0, hasta - desde), H * 0.012);
  // Speed lines behind it.
  x.fillStyle = 'rgba(255,240,210,0.5)';
  for (let k = 0; k < 6; k++) {
    const largo = W * (0.12 + ((k * 13) % 7) * 0.03) * Math.min(1, vel / (W * 1.5));
    const ly = base - cana.h * (0.15 + k * 0.13);
    x.fillRect(dir > 0 ? gx - cana.w * 0.6 - largo : gx + cana.w * 0.6, ly, largo, Math.max(1, H * 0.004));
  }
  // The glass, leaning back against the speed, and two ghosts trailing it.
  for (let g = 2; g >= 0; g--) {
    x.save();
    x.globalAlpha = g ? 0.18 / g : 1;
    x.translate(gx - dir * g * cana.w * 0.35, base);
    x.rotate(-dir * 0.07);
    x.drawImage(cana.img, -cana.w / 2, -cana.h, cana.w, cana.h);
    x.restore();
  }
  // Foam flicked off the top.
  for (let k = 0; k < 5; k++) {
    const atras = ((s * 7 + k / 5) % 1) * cana.w * 1.1;
    elipse(x, gx - dir * (cana.w * 0.35 + atras), base - cana.h * 0.9 + atras * 0.25, H * 0.008, H * 0.006, 'rgba(251,243,220,0.8)');
  }
}

// ---------------------------------------------------------------- the caravan flat out

/** The desert road's layers, painted once; the near ones are tiles that scroll past. */
interface Carretera {
  cielo: HTMLCanvasElement;
  mesas: HTMLCanvasElement;
  medio: HTMLCanvasElement;
  delante: HTMLCanvasElement;
  vehiculo: HTMLCanvasElement;
  /** The vehicle's size, and where its wheels are (from its top left, CSS px). */
  vw: number;
  vh: number;
  ruedas: Array<[number, number, number]>;
  /** The pickup's exhaust pipe. */
  escape: [number, number];
  /** The road: its top and bottom edges. */
  r0: number;
  r1: number;
}

/**
 * The American desert in the late afternoon, side on: the sky and the plain (still), the
 * mesas far away (slow), Joshua trees and telegraph poles (fast), the scrub in front (a
 * blur); and the battered pickup, a «camión» of sorts, towing the caravan, painted once.
 */
function pintarCarretera(W: number, H: number, dpr: number): Carretera {
  const hz = H * 0.56;
  const r0 = H * 0.75;
  const r1 = H * 0.88;
  const [cielo, x] = lienzo(W, H, dpr);
  const g = x.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, '#2d4f8e');
  g.addColorStop(0.6, '#c9806a');
  g.addColorStop(1, '#f4b26a');
  x.fillStyle = g;
  x.fillRect(0, 0, W, hz + 1);
  const sx = W * 0.2;
  const sy = hz - H * 0.12;
  const halo = x.createRadialGradient(sx, sy, H * 0.04, sx, sy, H * 0.3);
  halo.addColorStop(0, 'rgba(255,214,140,0.5)');
  halo.addColorStop(1, 'rgba(255,214,140,0)');
  x.fillStyle = halo;
  x.fillRect(sx - H * 0.3, sy - H * 0.3, H * 0.6, H * 0.6);
  elipse(x, sx, sy, H * 0.05, H * 0.05, '#ffe2a6');
  const suelo = x.createLinearGradient(0, hz, 0, H);
  suelo.addColorStop(0, '#d89a62');
  suelo.addColorStop(1, '#9a5a36');
  x.fillStyle = suelo;
  x.fillRect(0, hz, W, H - hz);
  // The road: asphalt with a pale shoulder on each side.
  x.fillStyle = '#c99a6a';
  x.fillRect(0, r0 - H * 0.012, W, r1 - r0 + H * 0.024);
  x.fillStyle = '#3e3438';
  x.fillRect(0, r0, W, r1 - r0);
  x.fillStyle = '#4c4044';
  x.fillRect(0, r0, W, H * 0.01);

  // Mesas, far away: a tile as wide as the screen that repeats seamlessly.
  const [mesas, m] = lienzo(W, hz, dpr);
  const sierra = (color: string, alto: number, semilla: number) => {
    const rr = azar(semilla);
    m.fillStyle = color;
    m.beginPath();
    m.moveTo(0, hz);
    let px = 0;
    while (px < W - W * 0.05) {
      const ancho = W * (0.06 + rr() * 0.12);
      const a = alto * (0.3 + rr() * 0.7);
      const lado = ancho * 0.14;
      m.lineTo(px + lado, hz - a);
      m.lineTo(px + ancho - lado, hz - a);
      m.lineTo(px + ancho, hz);
      px += ancho + W * rr() * 0.05;
      m.lineTo(px, hz);
    }
    m.lineTo(W, hz);
    m.fill();
  };
  sierra('#b0705e', H * 0.13, 4);
  sierra('#8a4e46', H * 0.07, 9);

  // In between: Joshua trees and telegraph poles, a tile one and a half screens wide.
  const mw = W * 1.5;
  const [medio, d] = lienzo(mw, H * 0.4, dpr);
  const base = H * 0.36;
  const arbol = (ax: number, s: number) => {
    d.strokeStyle = '#5a3a2e';
    d.lineCap = 'round';
    d.lineWidth = s * 0.12;
    d.beginPath();
    d.moveTo(ax, base);
    d.lineTo(ax, base - s);
    d.moveTo(ax, base - s * 0.55);
    d.quadraticCurveTo(ax - s * 0.4, base - s * 0.6, ax - s * 0.38, base - s * 1.0);
    d.moveTo(ax, base - s * 0.7);
    d.quadraticCurveTo(ax + s * 0.35, base - s * 0.75, ax + s * 0.32, base - s * 1.15);
    d.stroke();
    for (const [dx, dy] of [[0, -1], [-0.38, -1.0], [0.32, -1.15]]) elipse(d, ax + dx * s, base + dy * s, s * 0.12, s * 0.16, '#5a3a2e');
  };
  const rr = azar(17);
  for (let px = mw * 0.05; px < mw - mw * 0.05; px += mw * (0.1 + rr() * 0.12)) {
    if (rr() < 0.35) {
      // A telegraph pole.
      d.fillStyle = '#4a3026';
      d.fillRect(px, base - H * 0.3, H * 0.012, H * 0.3);
      d.fillRect(px - H * 0.03, base - H * 0.28, H * 0.072, H * 0.01);
    } else arbol(px, H * (0.12 + rr() * 0.1));
  }
  for (let k = 0; k < 40; k++) elipse(d, rr() * mw, base - rr() * H * 0.02, H * (0.01 + rr() * 0.02), H * 0.008, '#8a6a3e');

  // In front of the road: scrub streaked by the speed.
  const [delante, f] = lienzo(W, H - r1, dpr);
  const rf = azar(23);
  for (let k = 0; k < 26; k++) {
    const y = H * 0.02 + rf() * (H - r1 - H * 0.02);
    f.fillStyle = rf() < 0.5 ? '#7a5434' : '#6a4a2e';
    f.beginPath();
    f.ellipse(rf() * W, y, H * (0.06 + rf() * 0.1), H * (0.008 + rf() * 0.008), 0, 0, Math.PI * 2);
    f.fill();
  }

  // The pickup and its caravan, facing right. The wheels are drawn every frame (they turn).
  const vh = H * 0.27;
  const cw = vh * 2.0;
  const vw = cw + vh * 0.25 + vh * 1.8;
  const [vehiculo, v] = lienzo(vw, vh, dpr);
  const caja = (color: string, bx: number, by: number, w: number, hh: number, rad: number) => {
    v.fillStyle = color;
    v.beginPath();
    v.roundRect(bx, by, w, hh, rad);
    v.fill();
  };
  // The caravan: cream, a brown stripe, rounded ends, a window and its door.
  const ch = vh * 0.78;
  caja('#e9dcc0', 0, 0, cw, ch, ch * 0.32);
  caja('#d4c4a4', 0, 0, cw, ch * 0.14, ch * 0.08);
  caja('#9a5a3c', 0, ch * 0.58, cw, ch * 0.12, 0);
  caja('#c9b896', 0, ch * 0.86, cw, ch * 0.14, ch * 0.05);
  caja('#3a4a66', cw * 0.12, ch * 0.2, cw * 0.3, ch * 0.28, ch * 0.08);
  caja('#d8c8a8', cw * 0.62, ch * 0.16, cw * 0.15, ch * 0.66, ch * 0.05);
  caja('#3a4a66', cw * 0.645, ch * 0.22, cw * 0.1, ch * 0.16, ch * 0.04);
  caja('#e0a24a', cw * 0.02, ch * 0.62, cw * 0.025, ch * 0.06, 1);
  // A crack in the window, and the sun along its top.
  v.strokeStyle = '#a9b4c8';
  v.lineWidth = 1;
  v.beginPath();
  v.moveTo(cw * 0.16, ch * 0.24);
  v.lineTo(cw * 0.25, ch * 0.34);
  v.lineTo(cw * 0.22, ch * 0.44);
  v.stroke();
  const luz = v.createLinearGradient(0, 0, 0, ch * 0.5);
  luz.addColorStop(0, 'rgba(255,214,150,0.35)');
  luz.addColorStop(1, 'rgba(255,214,150,0)');
  v.fillStyle = luz;
  v.beginPath();
  v.roundRect(0, 0, cw, ch, ch * 0.32);
  v.fill();
  // The tow bar.
  v.fillStyle = '#4a3a36';
  v.fillRect(cw - 2, ch * 0.8, vh * 0.3, vh * 0.05);
  // The pickup: rusty red, a cream roof, the bed behind the cab, a chrome bumper.
  const px = cw + vh * 0.25;
  const pw = vh * 1.8;
  caja('#a8402c', px, vh * 0.5, pw, vh * 0.3, vh * 0.06);
  caja('#a8402c', px + pw * 0.42, vh * 0.12, pw * 0.36, vh * 0.42, vh * 0.08);
  caja('#efe2c4', px + pw * 0.42, vh * 0.1, pw * 0.36, vh * 0.07, vh * 0.04);
  caja('#7e2e20', px, vh * 0.5, pw * 0.4, vh * 0.05, 0);
  caja('#2e3c5a', px + pw * 0.5, vh * 0.2, pw * 0.24, vh * 0.22, vh * 0.04);
  // Two heads in the cab, against the windscreen.
  elipse(v, px + pw * 0.56, vh * 0.33, vh * 0.055, vh * 0.065, '#1c1612');
  elipse(v, px + pw * 0.68, vh * 0.32, vh * 0.055, vh * 0.065, '#1c1612');
  caja('#a8402c', px + pw * 0.78, vh * 0.38, pw * 0.22, vh * 0.42, vh * 0.1);
  caja('#7e2e20', px + pw * 0.08, vh * 0.58, pw * 0.85, vh * 0.025, 0);
  caja('#c8ccd2', px + pw * 0.95, vh * 0.66, pw * 0.07, vh * 0.12, vh * 0.03);
  caja('#ffe6a0', px + pw * 0.95, vh * 0.44, pw * 0.05, vh * 0.08, vh * 0.03);
  caja('#4a3a36', px - vh * 0.02, vh * 0.7, vh * 0.04, vh * 0.08, 1);
  // The sun along the top of everything.
  v.fillStyle = 'rgba(255,214,150,0.3)';
  v.fillRect(px + pw * 0.42, vh * 0.12, pw * 0.36, vh * 0.03);
  v.fillRect(px, vh * 0.5, pw, vh * 0.025);
  const ruedas: Array<[number, number, number]> = [
    [cw * 0.42, vh * 0.86, vh * 0.14],
    [px + pw * 0.22, vh * 0.84, vh * 0.16],
    [px + pw * 0.8, vh * 0.84, vh * 0.16],
  ];
  return { cielo, mesas, medio, delante, vehiculo, vw, vh, ruedas, escape: [px - vh * 0.02, vh * 0.74], r0, r1 };
}

/** A tile that repeats sideways, scrolled `dx` px to the left. */
function rodar(x: CanvasRenderingContext2D, img: HTMLCanvasElement, w: number, hh: number, y: number, dx: number, W: number) {
  const o = -(((dx % w) + w) % w);
  for (let px = o; px < W; px += w) x.drawImage(img, px, y, w, hh);
}

/**
 * The caravan flat out across the desert: the layers scroll past at their speeds, the road's
 * dashes whip by, the pickup and its caravan bounce on their own springs with the wheels
 * spinning, and a cloud of dust boils up behind them. They slowly gain on the camera.
 */
function dibujarCarretera(x: CanvasRenderingContext2D, W: number, H: number, c: Carretera, s: number) {
  const hz = H * 0.56;
  x.drawImage(c.cielo, 0, 0, W, H);
  rodar(x, c.mesas, W, hz, 0, s * W * 0.04, W);
  rodar(x, c.medio, W * 1.5, H * 0.4, hz - H * 0.36 + H * 0.06, s * W * 0.9, W);
  // The dashes down the middle of the road.
  x.fillStyle = '#e8d8a0';
  const my = (c.r0 + c.r1) / 2;
  const paso = W * 0.22;
  const o = -((s * W * 2.4) % paso);
  for (let px = o; px < W; px += paso) x.fillRect(px, my - H * 0.005, W * 0.1, H * 0.01);
  // The vehicle: gaining slowly, bouncing; dust behind and under it.
  const vx = mezclar(W * 0.4, W * 0.56, suave(s / 2)) - c.vw / 2 + Math.sin(s * 3) * W * 0.005;
  const vy = c.r0 + (c.r1 - c.r0) * 0.55 - c.vh;
  const traseraX = vx + c.ruedas[0][0];
  const sueloY = vy + c.vh * 0.98;
  for (let k = 0; k < 16; k++) {
    const u = (s * 2.6 + k / 16) % 1;
    const r = H * (0.03 + u * 0.09);
    elipse(x, traseraX - c.vw * 0.15 - u * W * 0.35, sueloY - u * H * 0.12 - r * 0.3, r, r * 0.75, `rgba(222,186,140,${0.42 * (1 - u)})`);
  }
  const bote = (f: number) => Math.sin(s * 31 + f) * H * 0.004 + Math.max(0, Math.sin(s * 9 + f)) * H * 0.004;
  x.save();
  x.translate(vx, vy + bote(0));
  x.drawImage(c.vehiculo, 0, 0, c.vw, c.vh);
  // The wheels: a tyre, a hub and a spoke turning fast.
  for (const [rx, ry, rr] of c.ruedas) {
    elipse(x, rx, ry, rr, rr, '#221c20');
    elipse(x, rx, ry, rr * 0.5, rr * 0.5, '#9a9ca4');
    x.strokeStyle = '#5a5c64';
    x.lineWidth = Math.max(1.5, rr * 0.16);
    const a = s * 38;
    x.beginPath();
    x.moveTo(rx + Math.cos(a) * rr * 0.45, ry + Math.sin(a) * rr * 0.45);
    x.lineTo(rx - Math.cos(a) * rr * 0.45, ry - Math.sin(a) * rr * 0.45);
    x.moveTo(rx + Math.cos(a + 1.57) * rr * 0.45, ry + Math.sin(a + 1.57) * rr * 0.45);
    x.lineTo(rx - Math.cos(a + 1.57) * rr * 0.45, ry - Math.sin(a + 1.57) * rr * 0.45);
    x.stroke();
  }
  x.restore();
  // Exhaust puffs from the pickup's pipe.
  for (let k = 0; k < 5; k++) {
    const u = (s * 3.4 + k / 5) % 1;
    elipse(x, vx + c.escape[0] - u * W * 0.08, vy + c.escape[1] - u * H * 0.03, H * (0.008 + u * 0.02), H * (0.006 + u * 0.016), `rgba(120,110,120,${0.5 * (1 - u)})`);
  }
  // The scrub in front, a blur.
  rodar(x, c.delante, W, H - c.r1, c.r1, s * W * 3.2, W);
}

// ---------------------------------------------------------------- the slot machine

/** The symbols on each reel, top to bottom; the jackpot is three sevens. */
const SIMBOLOS = ['siete', 'cereza', 'campana', 'limon', 'diamante', 'estrella'] as const;
type Simbolo = (typeof SIMBOLOS)[number];
const SIETE = SIMBOLOS.indexOf('siete');
/** When each reel stops (seconds into the shot): on the beat, the third one on the jackpot. */
const PARADAS = [0.5, 1.0, 1.5];
const PREMIO = PARADAS[2];
/** Symbols a second while a reel spins. */
const GIRO = 16;

interface Tragaperras {
  maquina: HTMLCanvasElement;
  cartelOn: HTMLCanvasElement;
  tira: HTMLCanvasElement;
  cristal: HTMLCanvasElement;
  /** The reels' window: where it is and how big, and each symbol's height on the reel. */
  vx: number;
  vy: number;
  vw: number;
  vh: number;
  celda: number;
  /** The marquee's bulbs, and where the coins come out. */
  bombillas: Array<[number, number]>;
  bocaX: number;
  bocaY: number;
}

function simbolo(x: CanvasRenderingContext2D, que: Simbolo, cx: number, cy: number, t: number) {
  if (que === 'siete') {
    // A fat red seven with a gold edge (drawn, not a font: it must look the same everywhere).
    const sete = (k: number, color: string) => {
      x.fillStyle = color;
      x.beginPath();
      x.moveTo(cx - t * 0.32 * k, cy - t * 0.38 * k);
      x.lineTo(cx + t * 0.34 * k, cy - t * 0.38 * k);
      x.lineTo(cx + t * 0.34 * k, cy - t * 0.22 * k);
      x.lineTo(cx - t * 0.02 * k, cy + t * 0.4 * k);
      x.lineTo(cx - t * 0.24 * k, cy + t * 0.4 * k);
      x.lineTo(cx + t * 0.1 * k, cy - t * 0.2 * k);
      x.lineTo(cx - t * 0.32 * k, cy - t * 0.2 * k);
      x.closePath();
      x.fill();
    };
    sete(1.12, '#e8b84a');
    sete(1, '#d8282e');
  } else if (que === 'cereza') {
    x.strokeStyle = '#3a8a3a';
    x.lineWidth = t * 0.05;
    x.beginPath();
    x.moveTo(cx - t * 0.16, cy + t * 0.08);
    x.quadraticCurveTo(cx - t * 0.05, cy - t * 0.3, cx + t * 0.12, cy - t * 0.34);
    x.moveTo(cx + t * 0.16, cy + t * 0.12);
    x.quadraticCurveTo(cx + t * 0.12, cy - t * 0.2, cx + t * 0.12, cy - t * 0.34);
    x.stroke();
    elipse(x, cx - t * 0.16, cy + t * 0.16, t * 0.15, t * 0.15, '#c8202e');
    elipse(x, cx + t * 0.16, cy + t * 0.2, t * 0.15, t * 0.15, '#a8182a');
    elipse(x, cx - t * 0.2, cy + t * 0.1, t * 0.035, t * 0.035, 'rgba(255,255,255,0.6)');
  } else if (que === 'campana') {
    x.fillStyle = '#e8b030';
    x.beginPath();
    x.moveTo(cx - t * 0.32, cy + t * 0.22);
    x.quadraticCurveTo(cx - t * 0.22, cy + t * 0.12, cx - t * 0.22, cy - t * 0.08);
    x.quadraticCurveTo(cx - t * 0.2, cy - t * 0.34, cx, cy - t * 0.34);
    x.quadraticCurveTo(cx + t * 0.2, cy - t * 0.34, cx + t * 0.22, cy - t * 0.08);
    x.quadraticCurveTo(cx + t * 0.22, cy + t * 0.12, cx + t * 0.32, cy + t * 0.22);
    x.closePath();
    x.fill();
    elipse(x, cx, cy + t * 0.28, t * 0.07, t * 0.07, '#b07a1a');
    x.fillStyle = '#b07a1a';
    x.fillRect(cx - t * 0.32, cy + t * 0.2, t * 0.64, t * 0.04);
  } else if (que === 'limon') {
    elipse(x, cx, cy, t * 0.32, t * 0.22, '#f2d23a', -0.3);
    elipse(x, cx + t * 0.27, cy - t * 0.14, t * 0.05, t * 0.04, '#d8b42a', -0.3);
    elipse(x, cx - t * 0.27, cy + t * 0.14, t * 0.05, t * 0.04, '#d8b42a', -0.3);
  } else if (que === 'diamante') {
    x.fillStyle = '#4ab4e0';
    x.beginPath();
    x.moveTo(cx - t * 0.32, cy - t * 0.1);
    x.lineTo(cx - t * 0.18, cy - t * 0.28);
    x.lineTo(cx + t * 0.18, cy - t * 0.28);
    x.lineTo(cx + t * 0.32, cy - t * 0.1);
    x.lineTo(cx, cy + t * 0.34);
    x.closePath();
    x.fill();
    x.fillStyle = '#8ad8f4';
    x.beginPath();
    x.moveTo(cx - t * 0.18, cy - t * 0.28);
    x.lineTo(cx + t * 0.18, cy - t * 0.28);
    x.lineTo(cx + t * 0.06, cy - t * 0.1);
    x.lineTo(cx - t * 0.06, cy - t * 0.1);
    x.closePath();
    x.fill();
  } else {
    x.fillStyle = '#f0a020';
    x.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 ? t * 0.15 : t * 0.36;
      x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    x.closePath();
    x.fill();
  }
}

/**
 * A slot machine seen from the front, so close it fills the screen, painted once: the red
 * cabinet, the chrome around the reels, the marquee with its sign and its bulbs, the coin tray;
 * the reels' strip (the six symbols, once more at the end so it wraps); the glass over the
 * reels, darker at the top and bottom, with the pay line.
 */
function pintarTragaperras(W: number, H: number, dpr: number): Tragaperras {
  const [maquina, x] = lienzo(W, H, dpr);
  const fondo = x.createRadialGradient(W / 2, H * 0.5, H * 0.2, W / 2, H * 0.5, W * 0.7);
  fondo.addColorStop(0, '#2a0e1e');
  fondo.addColorStop(1, '#0c050c');
  x.fillStyle = fondo;
  x.fillRect(0, 0, W, H);
  const mx = W * 0.12;
  const mw = W * 0.76;
  const cuerpo = x.createLinearGradient(mx, 0, mx + mw, 0);
  cuerpo.addColorStop(0, '#7a1018');
  cuerpo.addColorStop(0.5, '#c0222c');
  cuerpo.addColorStop(1, '#7a1018');
  x.fillStyle = cuerpo;
  x.beginPath();
  x.roundRect(mx, -H * 0.05, mw, H * 1.1, H * 0.06);
  x.fill();
  // The marquee: a dark panel with the sign; its bulbs are drawn every frame.
  const cy0 = H * 0.04;
  const ch = H * 0.2;
  x.fillStyle = '#1a0a10';
  x.beginPath();
  x.roundRect(mx + mw * 0.06, cy0, mw * 0.88, ch, ch * 0.2);
  x.fill();
  const letrero = texto('trailer.tragaperras.premio');
  const cartel = (c: CanvasRenderingContext2D, color: string) => {
    c.fillStyle = color;
    c.font = `400 ${Math.round(ch * 0.5)}px Graduate, Rockwell, Georgia, serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(letrero, W / 2, cy0 + ch * 0.54, mw * 0.7);
  };
  cartel(x, '#7a5a2a');
  const [cartelOn, co] = lienzo(W, H * 0.3, dpr);
  co.shadowColor = 'rgba(255,200,90,0.9)';
  co.shadowBlur = ch * 0.25;
  cartel(co, '#ffe08a');
  const bombillas: Array<[number, number]> = [];
  const bx0 = mx + mw * 0.06;
  const bw = mw * 0.88;
  for (let k = 0; k <= 15; k++) {
    bombillas.push([bx0 + (bw * k) / 15, cy0]);
    bombillas.push([bx0 + bw - (bw * k) / 15, cy0 + ch]);
  }
  // The chrome frame around the reels.
  const vx = W * 0.19;
  const vy = H * 0.31;
  const vw = W * 0.62;
  const vh = H * 0.43;
  const cromo = x.createLinearGradient(0, vy - H * 0.04, 0, vy + vh + H * 0.04);
  cromo.addColorStop(0, '#f2f4f8');
  cromo.addColorStop(0.5, '#8a8e98');
  cromo.addColorStop(1, '#d8dce4');
  x.fillStyle = cromo;
  x.beginPath();
  x.roundRect(vx - H * 0.035, vy - H * 0.035, vw + H * 0.07, vh + H * 0.07, H * 0.04);
  x.fill();
  x.fillStyle = '#121014';
  x.fillRect(vx, vy, vw, vh);
  // The coin tray at the bottom, and the dark mouth the coins come out of.
  const bocaX = W / 2;
  const bocaY = H * 0.86;
  x.fillStyle = cromo;
  x.beginPath();
  x.roundRect(W * 0.3, H * 0.82, W * 0.4, H * 0.2, H * 0.03);
  x.fill();
  x.fillStyle = '#100608';
  x.beginPath();
  x.roundRect(W * 0.36, H * 0.84, W * 0.28, H * 0.06, H * 0.02);
  x.fill();
  // The lever's knob on the right edge.
  elipse(x, mx + mw + W * 0.035, H * 0.36, H * 0.045, H * 0.045, '#d8282e');
  x.fillStyle = '#9a9ea8';
  x.fillRect(mx + mw, H * 0.4, W * 0.04, H * 0.03);

  // The reels' strip: each symbol on an ivory cell; the first comes again at the end.
  const rw = (vw - H * 0.04) / 3;
  const celda = vh * 0.62;
  const [tira, t] = lienzo(rw, celda * (SIMBOLOS.length + 1), dpr);
  const marfil = t.createLinearGradient(0, 0, rw, 0);
  marfil.addColorStop(0, '#cfc6b0');
  marfil.addColorStop(0.5, '#fbf6ea');
  marfil.addColorStop(1, '#cfc6b0');
  t.fillStyle = marfil;
  t.fillRect(0, 0, rw, celda * (SIMBOLOS.length + 1));
  for (let k = 0; k <= SIMBOLOS.length; k++) simbolo(t, SIMBOLOS[k % SIMBOLOS.length], rw / 2, celda * (k + 0.5), celda * 0.9);

  // The glass: shade at the top and bottom of the drum, the gaps between reels, the pay line.
  const [cristal, g] = lienzo(vw, vh, dpr);
  const sombra = g.createLinearGradient(0, 0, 0, vh);
  sombra.addColorStop(0, 'rgba(0,0,0,0.75)');
  sombra.addColorStop(0.25, 'rgba(0,0,0,0)');
  sombra.addColorStop(0.75, 'rgba(0,0,0,0)');
  sombra.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.fillStyle = sombra;
  g.fillRect(0, 0, vw, vh);
  g.fillStyle = '#2a0a10';
  for (let k = 1; k < 3; k++) g.fillRect(k * (rw + H * 0.02) - H * 0.02, 0, H * 0.02, vh);
  g.fillStyle = 'rgba(216,40,46,0.8)';
  g.fillRect(0, vh / 2 - 1, vw, 2);
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.beginPath();
  g.moveTo(vw * 0.05, 0);
  g.lineTo(vw * 0.22, 0);
  g.lineTo(vw * 0.1, vh);
  g.lineTo(0, vh);
  g.lineTo(0, vh * 0.3);
  g.fill();
  return { maquina, cartelOn, tira, cristal, vx, vy, vw, vh, celda, bombillas, bocaX, bocaY };
}

/** Where reel `i` stands at `s` (in symbols down the strip): spinning, then landing on a seven with a bounce. */
function rodillo(i: number, s: number) {
  const fin = PARADAS[i];
  const destino = SIETE + SIMBOLOS.length * 40;
  if (s < fin) return destino + GIRO * (fin - s);
  const d = s - fin;
  return destino + Math.sin(d * 30) * Math.exp(-d * 14) * 0.12;
}

/** The coins of the jackpot: when each jumps out of the tray, and how. */
const MONEDAS = (() => {
  const r = azar(77);
  return Array.from({ length: 70 }, (_, k) => ({ t: PREMIO + k * 0.028, vx: (r() - 0.5) * 1.4, vy: -(0.7 + r() * 0.7), giro: r() * 6, vel: 8 + r() * 10 }));
})();

/**
 * The slot machine paying out: the reels spinning in a blur and stopping one per beat; on the
 * third seven the bulbs go wild, the sign lights up, the sevens flash and a fountain of coins
 * pours out of the tray, the camera shaking.
 */
function dibujarTragaperras(x: CanvasRenderingContext2D, W: number, H: number, m: Tragaperras, s: number) {
  const premio = s >= PREMIO;
  const golpe = PARADAS.reduce((a, p) => (s >= p ? Math.max(0, 1 - (s - p) / 0.15) : a), 0);
  const tiembla = premio ? Math.max(0.25, 1 - (s - PREMIO) / 0.6) : 0;
  const z = 1 + 0.02 * golpe + 0.03 * suave(s / 3.5);
  x.save();
  x.translate(W / 2 + (tiembla ? Math.sin(s * 70) * H * 0.006 * tiembla : 0), H / 2 + (tiembla ? Math.cos(s * 83) * H * 0.006 * tiembla : 0));
  x.scale(z, z);
  x.translate(-W / 2, -H / 2);
  x.drawImage(m.maquina, 0, 0, W, H);
  // The reels.
  const rw = (m.vw - H * 0.04) / 3;
  const n = SIMBOLOS.length;
  x.save();
  x.beginPath();
  x.rect(m.vx, m.vy, m.vw, m.vh);
  x.clip();
  for (let i = 0; i < 3; i++) {
    const p = rodillo(i, s);
    const gira = s < PARADAS[i];
    const rx = m.vx + i * (rw + H * 0.02);
    // The symbol at the pay line is p; the strip is drawn so it sits at the window's middle.
    const pinta = (desfase: number, alfa: number) => {
      const q = (((p + desfase) % n) + n) % n;
      const y0 = m.vy + m.vh / 2 - (q + 0.5) * m.celda;
      x.globalAlpha = alfa;
      for (const k of [-1, 0, 1]) x.drawImage(m.tira, rx, y0 + k * n * m.celda, rw, m.celda * (n + 1));
      x.globalAlpha = 1;
    };
    if (gira) {
      pinta(0, 1);
      pinta(0.3, 0.45);
      pinta(0.6, 0.25);
    } else pinta(0, 1);
  }
  x.restore();
  x.drawImage(m.cristal, m.vx, m.vy, m.vw, m.vh);
  // The jackpot: a gold frame pulsing round the three sevens.
  if (premio) {
    const pulso = 0.5 + 0.5 * Math.sin((s - PREMIO) * 24);
    x.strokeStyle = `rgba(255,214,110,${0.5 + 0.5 * pulso})`;
    x.lineWidth = H * 0.012;
    x.strokeRect(m.vx + H * 0.01, m.vy + m.vh / 2 - m.celda / 2, m.vw - H * 0.02, m.celda);
    x.globalAlpha = 0.55 + 0.45 * pulso;
    x.drawImage(m.cartelOn, 0, 0, W, H * 0.3);
    x.globalAlpha = 1;
  }
  // The marquee's bulbs: chasing round while it spins, all flashing on the jackpot.
  m.bombillas.forEach(([bx, by], k) => {
    const on = premio ? (Math.floor((s - PREMIO) * 12) + k) % 2 === 0 : (k + Math.floor(s * 14)) % 4 === 0;
    elipse(x, bx, by, H * 0.012, H * 0.012, on ? '#fff0b0' : '#6a4a2a');
    if (on && premio && k % 3 === 0) elipse(x, bx, by, H * 0.024, H * 0.024, 'rgba(255,220,120,0.25)');
  });
  // The coins: jumping out of the tray, spinning, falling back.
  if (premio) {
    for (const c of MONEDAS) {
      const d = s - c.t;
      if (d < 0 || d > 1.2) continue;
      const cx = m.bocaX + c.vx * H * d;
      const cy = m.bocaY + c.vy * H * d + 1.6 * H * d * d;
      if (cy > H * 1.05) continue;
      const ancho = Math.abs(Math.cos(c.giro + d * c.vel));
      elipse(x, cx, cy, H * 0.036 * Math.max(0.15, ancho), H * 0.036, '#b07a1a');
      elipse(x, cx, cy, H * 0.028 * Math.max(0.1, ancho), H * 0.028, '#f2c84a');
    }
  }
  x.restore();
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


/**
 * Pang, simulated once: Fran walks under the biggest bubble and fires; a bubble hit splits
 * in two smaller ones (17 → 9 → 5 px) and the smallest burst. A frame looks up the step.
 */
interface PasoPang {
  fx: number;
  anda: boolean;
  bolas: Array<[number, number, number]>;
  arpon: [number, number] | null;
  puntos: number;
}
const PASO = 1 / 120;
const DURA_JUEGO = 3.6;
const PANG = (() => {
  const SUELO = 112;
  const G = 230;
  const BOTE: Record<number, number> = { 17: 215, 9: 180, 5: 150 };
  let bolas = [{ x: 172, y: 40, vx: -62, vy: 0, r: 17 }];
  let fx = 106;
  let arpon: { x: number; top: number } | null = null;
  let espera = 0.6;
  let puntos = 4200;
  const pasos: PasoPang[] = [];
  const estallidos: Array<{ x: number; y: number; t: number }> = [];
  for (let k = 0; k * PASO < DURA_JUEGO; k++) {
    const s = k * PASO;
    // Fran: under the biggest, lowest bubble, then fire.
    let anda = false;
    const blanco = [...bolas].sort((a, b) => b.r - a.r || b.y - a.y)[0];
    if (blanco) {
      const dx = blanco.x - (fx + 7);
      if (Math.abs(dx) > 3) {
        fx += Math.sign(dx) * Math.min(Math.abs(dx), 75 * PASO);
        anda = true;
      }
      fx = Math.max(10, Math.min(232, fx));
      if (!arpon && s >= espera && Math.abs(dx) < blanco.r * 0.7) arpon = { x: Math.round(fx + 7), top: 90 };
    }
    if (arpon) {
      arpon.top -= 240 * PASO;
      const a = arpon;
      const golpe = bolas.find((b) => Math.abs(b.x - a.x) < b.r && b.y + b.r > a.top);
      if (golpe) {
        bolas = bolas.filter((b) => b !== golpe);
        estallidos.push({ x: golpe.x, y: golpe.y, t: s });
        puntos += golpe.r === 17 ? 100 : golpe.r === 9 ? 200 : 300;
        const nueva = golpe.r === 17 ? 9 : golpe.r === 9 ? 5 : 0;
        if (nueva) for (const lado of [-1, 1]) bolas.push({ x: golpe.x + lado * 4, y: golpe.y, vx: lado * (golpe.r === 17 ? 58 : 70), vy: -120, r: nueva });
        arpon = null;
        espera = s + 0.3;
      } else if (a.top <= 8) {
        arpon = null;
        espera = s + 0.2;
      }
    }
    for (const b of bolas) {
      b.vy += G * PASO;
      b.x += b.vx * PASO;
      b.y += b.vy * PASO;
      if (b.y + b.r > SUELO) {
        b.y = SUELO - b.r;
        b.vy = -BOTE[b.r];
      }
      if (b.x - b.r < 8 || b.x + b.r > 248) {
        b.vx = -b.vx;
        b.x = Math.max(8 + b.r, Math.min(248 - b.r, b.x));
      }
    }
    pasos.push({ fx, anda, bolas: bolas.map((b) => [b.x, b.y, b.r]), arpon: arpon ? [arpon.x, arpon.top] : null, puntos });
  }
  return { pasos, estallidos };
})();

const paso = <T,>(lista: T[], s: number) => lista[Math.max(0, Math.min(lista.length - 1, Math.floor(s / PASO)))];

function dibujarPang(x: CanvasRenderingContext2D, fondo: HTMLCanvasElement, s: number) {
  const p = paso(PANG.pasos, s);
  x.drawImage(fondo, 0, 0);
  x.drawImage(FRAN, Math.round(p.fx), 90 - (p.anda && Math.floor(s * 10) % 2 ? 1 : 0));
  // The harpoon: a zigzag rope from the floor up to its arrow.
  if (p.arpon) {
    const [ax, tope] = p.arpon;
    x.fillStyle = '#c9c2b4';
    for (let y = 110; y > tope; y -= 2) x.fillRect(ax + ((y >> 1) % 2 ? -1 : 0), y, 1, 2);
    x.fillStyle = '#e8e4d8';
    x.fillRect(ax - 2, tope, 5, 2);
    x.fillRect(ax - 1, tope - 2, 3, 2);
    x.fillRect(ax, tope - 3, 1, 1);
  }
  for (const [bx, by, r] of p.bolas) burbuja(x, bx, by, r);
  // Each pop: a ring of foam spraying out.
  x.fillStyle = '#fbf3dc';
  for (const e of PANG.estallidos) {
    const d = s - e.t;
    if (d < 0 || d > 0.25) continue;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      x.fillRect(Math.round(e.x + Math.cos(a) * (5 + d * 90)), Math.round(e.y + Math.sin(a) * (5 + d * 90)), 2, 2);
    }
  }
  // The score strip.
  x.fillStyle = '#f3ead6';
  x.font = 'bold 9px monospace';
  x.textBaseline = 'top';
  x.fillText(texto('trailer.pang.jugador'), 12, 125);
  x.fillStyle = '#ffd36a';
  x.fillText(String(p.puntos).padStart(6, '0'), 12, 134);
  x.fillStyle = '#f3ead6';
  const fase = texto('trailer.pang.fase');
  x.fillText(fase, (AW - x.measureText(fase).width) / 2, 129);
  for (let k = 0; k < 3; k++) x.drawImage(FRAN, 0, 0, 14, 8, AW - 22 - k * 16, 128, 14, 8);
}

/**
 * Space Invaders, simulated once: the inbox marches sideways and down; Chuchi picks off the
 * lowest invader nearest to him, one shot at a time; the boss's saucer (a tie swinging under
 * it) crosses once, comes back the other way, and he brings it down. A frame looks up the step.
 */
interface PasoInvaders {
  cx: number;
  disparo: [number, number] | null;
  vivos: boolean[];
  platillo: number | null;
  puntos: number;
}
const COLS = 7;
/** Where the inbox's grid is at `s`: marching sideways in steps, a row down at each turn. */
const rejilla = (s: number) => {
  const paso = Math.floor(s / 0.22);
  const vuelta = Math.floor(paso / 8);
  const k = paso % 8;
  return { x: 54 + (vuelta % 2 ? 8 - k : k) * 4, y: 22 + vuelta * 5, paso };
};
/** The saucer's x at `s`: left to right, off screen, then back right to left. */
const platilloX = (s: number) => (s < 2 ? -24 + s * 150 : s < 2.15 ? 999 : 256 - (s - 2.15) * 130);
/** Where Chuchi waits for the saucer (its centre passes there about 2.65 s in, during the second visit). */
const EMBOSCADA = 200;
const INVADERS = (() => {
  const vivos = Array<boolean>(COLS * 3).fill(true);
  let cx = 70;
  let disparo: { x: number; y: number } | null = null;
  let espera = 0.25;
  let puntos = 1280;
  let platillo = true;
  const pasos: PasoInvaders[] = [];
  const golpes: Array<{ x: number; y: number; t: number; jefe: boolean }> = [];
  for (let k = 0; k * PASO < DURA_JUEGO; k++) {
    const s = k * PASO;
    const g = rejilla(s);
    // The saucer on its way back: he waits for it where it will pass and fires so the shot
    // meets it; otherwise he goes for the lowest invader nearest to him.
    const ux = platilloX(s);
    let blanco: number | null = null;
    let listo = false;
    if (platillo && s > 1.6) {
      blanco = EMBOSCADA;
      listo = s > 2.15 && Math.abs(platilloX(s + 87 / 230) + 10 - (cx + 7)) < 3;
    } else {
      let mejor = Infinity;
      for (let i = 0; i < vivos.length; i++) {
        if (!vivos[i]) continue;
        const fila = Math.floor(i / COLS);
        const ix = g.x + (i % COLS) * 18 + 6;
        const coste = Math.abs(ix - (cx + 7)) - fila * 40;
        if (coste < mejor) {
          mejor = coste;
          blanco = ix;
        }
      }
    }
    if (blanco !== null) {
      const dx = blanco - (cx + 7);
      cx += Math.sign(dx) * Math.min(Math.abs(dx), 95 * PASO);
      cx = Math.max(4, Math.min(238, cx));
      if (!(platillo && s > 1.6)) listo = Math.abs(dx) < 3;
      if (!disparo && s >= espera && listo) disparo = { x: Math.round(cx + 7), y: 100 };
    }
    if (disparo) {
      disparo.y -= 230 * PASO;
      const d = disparo;
      let hit = false;
      if (platillo && d.x >= ux && d.x <= ux + 20 && d.y <= 17 && d.y >= 9) {
        platillo = false;
        puntos += 500;
        golpes.push({ x: ux + 10, y: 13, t: s, jefe: true });
        hit = true;
      }
      for (let i = 0; i < vivos.length && !hit; i++) {
        if (!vivos[i]) continue;
        const ix = g.x + (i % COLS) * 18;
        const iy = g.y + Math.floor(i / COLS) * 14;
        if (d.x >= ix && d.x <= ix + 12 && d.y >= iy && d.y <= iy + 10) {
          vivos[i] = false;
          puntos += 30;
          golpes.push({ x: ix + 6, y: iy + 5, t: s, jefe: false });
          hit = true;
        }
      }
      if (hit || d.y < 0) {
        disparo = null;
        espera = s + 0.18;
      }
    }
    pasos.push({ cx, disparo: disparo ? [disparo.x, disparo.y] : null, vivos: [...vivos], platillo: platillo && ux < 300 ? ux : null, puntos });
  }
  return { pasos, golpes };
})();
/** The bombs the inbox drops on him (they never land: he dodges). */
const BOMBAS = [0.5, 1.2, 1.9, 2.5, 3.1].map((t0, k) => ({ t0, col: (k * 3 + 1) % COLS }));

function dibujarInvaders(x: CanvasRenderingContext2D, s: number) {
  const p = paso(INVADERS.pasos, s);
  x.fillStyle = '#05060c';
  x.fillRect(0, 0, AW, AH);
  const r = azar(9);
  x.fillStyle = '#3a3e5a';
  for (let k = 0; k < 30; k++) x.fillRect(Math.floor(r() * AW), Math.floor(12 + r() * 100), 1, 1);
  const g = rejilla(s);
  for (let i = 0; i < p.vivos.length; i++) if (p.vivos[i]) invasor(x, Math.floor(i / COLS), g.x + (i % COLS) * 18, g.y + Math.floor(i / COLS) * 14, g.paso);
  // The bombs: little zigzags falling.
  x.fillStyle = '#e86a6a';
  for (const b of BOMBAS) {
    const d = s - b.t0;
    if (d < 0) continue;
    const by = g.y + 40 + d * 70;
    if (by > 122) continue;
    const bx = g.x + b.col * 18 + 6;
    x.fillRect(bx + (Math.floor(by / 3) % 2), by, 1, 2);
    x.fillRect(bx + 1 - (Math.floor(by / 3) % 2), by + 2, 1, 2);
  }
  // Hits: a burst for a moment (the saucer's bigger, with its points).
  for (const e of INVADERS.golpes) {
    const d = s - e.t;
    if (d < 0 || d > (e.jefe ? 0.6 : 0.2)) continue;
    x.fillStyle = e.jefe ? '#ff8a4a' : '#ffd36a';
    const k = e.jefe ? 2 : 1;
    for (const [dx, dy] of [[0, 0], [-4, -3], [4, -3], [-4, 3], [4, 3], [0, -5], [0, 5], [-6, 0], [6, 0]]) x.fillRect(e.x - 1 + dx * k * (1 + d * 3), e.y - 1 + dy * k * (1 + d * 3), 2, 2);
    if (e.jefe) {
      x.fillStyle = '#ffd36a';
      x.font = 'bold 9px monospace';
      x.textBaseline = 'top';
      x.fillText('500', e.x - 8, e.y + 6 - d * 10);
    }
  }
  // The boss: a grey saucer with a red tie swinging under it.
  if (p.platillo !== null) {
    const ux = p.platillo;
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
  }
  // The shields.
  x.fillStyle = '#3ad06a';
  for (const bx of [40, 112, 184]) {
    x.fillRect(bx, 86, 24, 8);
    x.fillRect(bx + 2, 84, 20, 2);
    x.fillStyle = '#05060c';
    x.fillRect(bx + 8, 90, 8, 4);
    x.fillStyle = '#3ad06a';
  }
  // Chuchi and his shot.
  x.drawImage(CHUCHI, Math.round(p.cx), 102);
  if (p.disparo) {
    x.fillStyle = '#ffd36a';
    x.fillRect(p.disparo[0], Math.round(p.disparo[1]), 1, 4);
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
  x.fillText(String(p.puntos).padStart(5, '0'), 12 + x.measureText(puntos).width, 1);
  x.fillStyle = '#f3ead6';
  x.fillText(texto('trailer.invaders.jugador'), 8, 130);
  for (let k = 0; k < 2; k++) x.drawImage(CHUCHI, 0, 0, 14, 9, AW - 22 - k * 16, 130, 14, 9);
}

// ---------------------------------------------------------------- Vero

/** The bar's lights inside her mouth: where (in fiftieths of the screen's height), how big, and whether red. */
const BOKEH: Array<[number, number, number, boolean]> = [
  [-3.4, -1.3, 0.7, false],
  [-1.2, -2.1, 0.5, false],
  [0.7, -1.0, 0.85, false],
  [2.5, -2.0, 0.5, true],
  [3.7, -0.5, 0.6, false],
  [-2.3, 0.4, 0.45, true],
  [1.8, 0.7, 0.5, false],
];

/**
 * Vero, so close that her mouth fills the screen: warm brown skin, full lips, a smile; her
 * mouth opens wider and wider, there are the little lights of a bar deep inside, and the
 * camera dives in until everything is black. Drawn every frame (a handful of paths).
 */
function dibujarVero(x: CanvasRenderingContext2D, W: number, H: number, s: number) {
  const cx = W / 2;
  const cy = H * 0.55;
  const piel = x.createRadialGradient(cx, H * 0.42, H * 0.1, cx, H * 0.5, Math.max(W, H) * 0.75);
  piel.addColorStop(0, '#b67a52');
  piel.addColorStop(0.55, '#9c623e');
  piel.addColorStop(1, '#6e4028');
  x.fillStyle = piel;
  x.fillRect(0, 0, W, H);
  const o = suave((s - 0.35) / 1.15);
  const mw = H * 1.45 * (1 + 0.08 * o);
  const iz = cx - mw / 2;
  const de = cx + mw / 2;
  const esquina = cy - H * 0.02 - o * H * 0.02;
  const arriba = cy + H * 0.035 - o * H * 0.08;
  const abajo = arriba + o * H * 0.5;
  const grosor = H * 0.17;
  const my = (esquina + (arriba + abajo) / 2) / 2;
  // The dive: from 1.6 s the camera rushes into the mouth.
  const buceo = suave((s - 1.6) / 1.2);
  const zoom = (1 + 0.05 * suave(s / 1.6)) * (1 + 14 * buceo * buceo);
  x.save();
  x.translate(cx, my);
  x.scale(zoom, zoom);
  x.translate(-cx, -my);
  // The underside of the nose, cut by the top of the screen.
  elipse(x, cx, -H * 0.04, H * 0.3, H * 0.07, 'rgba(70,36,20,0.25)');
  for (const lado of [-1, 1]) elipse(x, cx + lado * H * 0.1, -H * 0.012, H * 0.05, H * 0.022, 'rgba(48,22,12,0.55)', lado * 0.25);
  elipse(x, cx, H * 0.15, H * 0.06, H * 0.11, 'rgba(255,220,190,0.06)');
  // The lower lip's shadow on the chin.
  elipse(x, cx, (esquina + abajo) / 2 + grosor * 1.25, mw * 0.3, grosor * 0.4, 'rgba(60,30,16,0.08)');
  if (o > 0.01) {
    x.save();
    x.beginPath();
    x.moveTo(iz, esquina);
    x.quadraticCurveTo(cx, arriba, de, esquina);
    x.quadraticCurveTo(cx, abajo, iz, esquina);
    x.clip();
    x.fillStyle = '#240810';
    x.fillRect(iz, esquina - H * 0.2, mw, H * 1.2);
    const hondo = x.createRadialGradient(cx, my, 0, cx, my, mw * 0.42);
    hondo.addColorStop(0, '#080204');
    hondo.addColorStop(1, 'rgba(8,2,4,0)');
    x.fillStyle = hondo;
    x.fillRect(iz, esquina - H * 0.2, mw, H * 1.2);
    // Deep inside: the lights of a bar, out of focus, warm and a little red.
    if (o > 0.35) {
      const a = Math.min(1, (o - 0.35) * 2.5);
      const k = H * 0.02;
      for (const [dx, dy, r, rojo] of BOKEH) {
        const lx = cx + dx * k;
        const ly = my + dy * k;
        const luz = x.createRadialGradient(lx, ly, 0, lx, ly, r * k);
        luz.addColorStop(0, rojo ? `rgba(255,110,110,${0.8 * a})` : `rgba(255,214,140,${0.9 * a})`);
        luz.addColorStop(1, rojo ? 'rgba(255,110,110,0)' : 'rgba(255,214,140,0)');
        x.fillStyle = luz;
        x.fillRect(lx - r * k, ly - r * k, 2 * r * k, 2 * r * k);
      }
    }
    // The upper teeth.
    x.fillStyle = '#f6f1e8';
    x.beginPath();
    x.moveTo(iz, esquina);
    x.quadraticCurveTo(cx, arriba, de, esquina);
    x.quadraticCurveTo(cx, arriba + H * 0.14, iz, esquina);
    x.fill();
    x.restore();
  }
  // Upper lip: a full cupid's bow down to the mouth's line.
  x.fillStyle = '#6e1e2c';
  x.beginPath();
  x.moveTo(iz, esquina);
  x.bezierCurveTo(cx - mw * 0.3, esquina - H * 0.1, cx - mw * 0.15, cy - H * 0.2, cx - mw * 0.06, cy - H * 0.18);
  x.quadraticCurveTo(cx, cy - H * 0.13, cx + mw * 0.06, cy - H * 0.18);
  x.bezierCurveTo(cx + mw * 0.15, cy - H * 0.2, cx + mw * 0.3, esquina - H * 0.1, de, esquina);
  x.quadraticCurveTo(cx, arriba, iz, esquina);
  x.fill();
  // Lower lip: the same thickness all along, whatever the mouth does, with a soft sheen.
  x.fillStyle = '#86283a';
  x.beginPath();
  x.moveTo(iz, esquina);
  x.quadraticCurveTo(cx, abajo, de, esquina);
  x.quadraticCurveTo(cx, abajo + grosor * 2, iz, esquina);
  x.fill();
  elipse(x, cx - mw * 0.06, (esquina + abajo) / 2 + grosor * 0.55, mw * 0.14, grosor * 0.16, 'rgba(255,200,205,0.16)');
  elipse(x, cx - mw * 0.1, cy - H * 0.13, mw * 0.06, H * 0.014, 'rgba(255,200,205,0.12)');
  if (o <= 0.01) {
    x.strokeStyle = '#3e0c16';
    x.lineWidth = Math.max(1.5, H * 0.007);
    x.beginPath();
    x.moveTo(iz, esquina);
    x.quadraticCurveTo(cx, arriba, de, esquina);
    x.stroke();
  }
  // The smile's dimples.
  x.strokeStyle = 'rgba(60,30,16,0.4)';
  x.lineWidth = Math.max(2, H * 0.009);
  x.lineCap = 'round';
  for (const lado of [-1, 1]) {
    x.beginPath();
    x.arc(cx + lado * (mw / 2 - H * 0.01), esquina, H * 0.06, lado > 0 ? -0.5 : Math.PI - 0.5, lado > 0 ? 0.5 : Math.PI + 0.5);
    x.stroke();
  }
  x.restore();
  // The last instant of the dive: all black.
  const negro = suave((s - 2.55) / 0.35);
  if (negro > 0) {
    x.fillStyle = `rgba(0,0,0,${negro})`;
    x.fillRect(0, 0, W, H);
  }
}

// ---------------------------------------------------------------- the trailer

export interface OpcionesTrailer {
  /** For the tests: play from here (seconds) and loop back at `hasta`, on the frames' clock. */
  desde?: number;
  hasta?: number;
}

/** The painted shots (the painted layers are held at 1.5× at most: soft shapes, scaled up). */
interface Pintados {
  bar: Bar;
  cana: Cana;
  canaGrande: Cana;
  carretera: Carretera;
  tragaperras: Tragaperras;
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
    [0, 2, tx('cartel', texto('trailer.cartel1'))],
    [4, 6, tx('cartel', texto('trailer.cartel2'))],
    [8, 10, tx('cartel', texto('trailer.cartel3'))],
    [27, 30, canto],
    [30, 99, tx('cierre', logo, h('div', { class: 'capitulo' }, texto('trailer.capitulo')), h('div', { class: 'proximamente' }, texto('trailer.proximamente')))],
  ];
  const capa = h('div', { class: 'cubierta trailer' }, canvas, ...textos.map(([, , e]) => e));
  parent.append(capa);

  // The painted shots, again if the screen changes size.
  let W = 0;
  let H = 0;
  let dpr = 1;
  let pintados: Pintados | null = null;
  let pintado: Plano | null = null;
  const medir = () => {
    const caja = capa.getBoundingClientRect();
    const w = Math.max(2, caja.width);
    const hh = Math.max(2, caja.height);
    const d = Math.min(window.devicePixelRatio || 1, 2);
    if (pintados && w === W && hh === H && d === dpr) return;
    W = w;
    H = hh;
    dpr = d;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const dp = Math.min(dpr, 1.5);
    pintados = { bar: pintarBar(W, H, dp), cana: pintarCana(H * 0.4, dp), canaGrande: pintarCana(H * 0.56, dp), carretera: pintarCarretera(W, H, dp), tragaperras: pintarTragaperras(W, H, dp) };
    pintado = null;
  };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(capa);
  // The slot machine's sign is in the titles' font: painted again once it has loaded.
  void document.fonts?.load('400 32px Graduate').then(() => {
    if (pintados) pintados.tragaperras = pintarTragaperras(W, H, Math.min(dpr, 1.5));
  });

  const dibujar = (t: number) => {
    const [p, s] = plano(t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pt = pintados!;
    if (p === 'barra') dibujarBarra(ctx, W, H, pt.bar, pt.cana, s);
    else if (p === 'cerveza') dibujarCerveza(ctx, W, H, pt.bar, pt.canaGrande, s);
    else if (p === 'carretera') dibujarCarretera(ctx, W, H, pt.carretera, s);
    else if (p === 'tragaperras') dibujarTragaperras(ctx, W, H, pt.tragaperras, s);
    else if (p === 'vero') dibujarVero(ctx, W, H, s);
    else if (p === 'pang' || p === 'invaders') {
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
    let reloj = false;
    let actual: Plano = 'cartel';
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
        pintados = null;
        resolve();
      }, 600);
    };
    const paso = (ahora: number) => {
      if (acabado) return;
      requestAnimationFrame(paso);
      // 60 fps at most, also on 120 Hz screens.
      if (ultimo && ahora - ultimo < 1000 / 60 - 4) return;
      // The music's clock while it plays, so the cuts stay on its hits however slow the frames;
      // otherwise (no sound, the tests' loops) the frames' own, which stops with them.
      const oido = op.hasta ? null : (sonido?.posicion?.('trailer') ?? null);
      if (oido !== null && (reloj || Math.abs(oido - (t - desde)) < 0.75)) {
        reloj = true;
        t = desde + oido;
      } else t += ultimo ? Math.min(0.1, (ahora - ultimo) / 1000) : 0;
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
      sonido?.musica('trailer', 0);
      requestAnimationFrame(paso);
    };
    // Black until the music has loaded (it was asked for in advance), so it starts on its first hit.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    void Promise.race([sonido?.lista?.('trailer') ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]).then(empezar);
    capa.addEventListener('click', (e) => {
      e.stopPropagation();
      if (t >= TOCABLE) fin();
    });
    // Test hook for scripts/playthrough.mjs and scripts/rendimiento.mjs.
    (window as unknown as { __trailer: unknown }).__trailer = () => ({ t, plano: actual, fotogramas, acabado, cerrar: fin });
  });
}
