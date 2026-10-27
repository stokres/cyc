// The painted ground of a room: the whole grid of solids, ledges, spikes and breakable blocks is baked ONCE into a single bitmap when the room opens
// (docs/ESTILO.md T5.7); the frame blits the part that is on screen. The look is the painted one of the backdrops (Silksong): the body of the ground is a
// dark, almost-silhouette mass that lightens toward its lit top with a little brush texture, the top edge is irregular and grown with what each zone
// has (hall rug, garden grass, paper, stage boards, beer foam), and the floating ledges are carved pieces with their shadow. No flat checkerboards.
import { texturar } from '../capitulos/conceptos-rig';
import { TILE, type Zona } from './datos';
import type { Rejilla } from './fisica';

/** Bitmap pixels per game unit for the tiles. */
export const ESC_TILE = 1.3;

function azar(semilla: number) {
  let s = semilla >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

type Estilo = 'moqueta' | 'hierba' | 'papel' | 'tablas' | 'espuma';

interface Mat {
  estilo: Estilo;
  /** The dark body at the bottom and the lit tone near the top surface. */
  fondo: string;
  luz: string;
  /** Rim of light on the lit edge, and the grown top (the rug, the grass, the paper...). */
  borde: string;
  top: string[];
  /** Strokes of texture, light and dark. */
  veta: [string, string];
  repisa: string;
  pinchos: string;
}

const MATERIAL: Record<Zona, Mat> = {
  recibidor: { estilo: 'moqueta', fondo: '#10051f', luz: '#4a2a6a', borde: '#ffe0a0', top: ['#b8404e', '#e0706a', '#f2a65a'], veta: ['#ffd9b0', '#07020f'], repisa: '#7a4a56', pinchos: '#e0336f' },
  jardin: { estilo: 'hierba', fondo: '#0c0420', luz: '#40286a', borde: '#c8ffd0', top: ['#2f8a5a', '#4cc27a', '#9aeaa0'], veta: ['#d8b8ff', '#06021a'], repisa: '#5a3e86', pinchos: '#ff4fa8' },
  bandeja: { estilo: 'papel', fondo: '#0d0b26', luz: '#3a3a72', borde: '#fff4e0', top: ['#d8d0f0', '#f2ecff', '#c6bde6'], veta: ['#e0d8ff', '#05041a'], repisa: '#5a5a98', pinchos: '#ff5a7a' },
  teatro: { estilo: 'tablas', fondo: '#14040f', luz: '#5a2038', borde: '#ffd890', top: ['#8a4a2a', '#b8703a', '#6a3420'], veta: ['#ffc8a0', '#0a0208'], repisa: '#7a3a3a', pinchos: '#ff6a4a' },
  grifo: { estilo: 'espuma', fondo: '#10051c', luz: '#4a2650', borde: '#fff6d8', top: ['#ffe9b0', '#fff6dc', '#ffd070'], veta: ['#ffd9a0', '#08020f'], repisa: '#7a4a5a', pinchos: '#ff5a4a' },
};

/** The bitmap is blitted by chunks of this many tiles, and only the chunks that hold ground (the rest of the room is empty air). */
export const TROZO = 4;

export interface NivelBmp {
  c: HTMLCanvasElement;
  esc: number;
  /** Chunks with something in them, as [column, row] of chunks. */
  trozos: [number, number][];
}

const solidoCh = (ch: string) => ch === '#' || ch === 'N' || ch === 'T' || ch === 'X' || ch === 'F';

/** Bakes the tiles of a room. */
export function hornearNivel(rej: Rejilla, zona: Zona, id: string): NivelBmp {
  const mat = MATERIAL[zona];
  const W = rej.cols * TILE;
  const H = rej.rows * TILE;
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * ESC_TILE);
  c.height = Math.ceil(H * ESC_TILE);
  const x = c.getContext('2d')!;
  x.scale(ESC_TILE, ESC_TILE);
  const r = azar(hash(id));
  const at = (col: number, fila: number) => {
    if (fila < 0) return '#';
    if (fila >= rej.rows) return '.';
    if (col < 0 || col >= rej.cols) return rej.g[Math.min(rej.rows - 1, Math.max(0, fila))][col < 0 ? 0 : rej.cols - 1] === '#' ? '#' : '.';
    return rej.g[fila][col];
  };
  // The ground proper: breakable blocks and the curtain are drawn apart.
  // (a false wall «F» is painted exactly like ground: that is the point)
  const piso = (ch: string) => ch === '#' || ch === 'X' || ch === 'F';
  const sol = (col: number, fila: number) => solidoCh(at(col, fila));
  const suelo = (col: number, fila: number) => piso(at(col, fila));

  // 1. the body: every ground tile, as a dark mass; its outline is kept as a clip for the texture.
  const masa = new Path2D();
  x.fillStyle = mat.fondo;
  for (let f = 0; f < rej.rows; f++) {
    let c0 = -1;
    for (let col = 0; col <= rej.cols; col++) {
      const s = col < rej.cols && piso(rej.g[f][col]);
      if (s && c0 < 0) c0 = col;
      if (!s && c0 >= 0) {
        x.fillRect(c0 * TILE - 0.5, f * TILE - 0.5, (col - c0) * TILE + 1, TILE + 1);
        masa.rect(c0 * TILE, f * TILE, (col - c0) * TILE, TILE);
        c0 = -1;
      }
    }
  }
  x.save();
  x.clip(masa);
  // 2. light from the top: under every surface the mass lightens toward the lit tone, then falls back to the dark.
  for (let f = 0; f < rej.rows; f++) {
    for (let col = 0; col < rej.cols; col++) {
      if (!suelo(col, f) || suelo(col, f - 1)) continue;
      const g = x.createLinearGradient(0, f * TILE, 0, f * TILE + TILE * 2.6);
      g.addColorStop(0, mat.luz);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(col * TILE - 0.5, f * TILE, TILE + 1, TILE * 2.6);
    }
  }
  // Brush texture: soft blotches, crack strokes and speckles, over the whole mass (a few per tile).
  for (let f = 0; f < rej.rows; f++) {
    for (let col = 0; col < rej.cols; col++) {
      if (!suelo(col, f)) continue;
      const ox = col * TILE;
      const oy = f * TILE;
      for (let i = 0; i < 2; i++) {
        const px = ox + r() * TILE;
        const py = oy + r() * TILE;
        const rad = 18 + r() * 26;
        const gg = x.createRadialGradient(px, py, 0, px, py, rad);
        const claro = r() < 0.4;
        gg.addColorStop(0, claro ? mat.veta[0] : mat.veta[1]);
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        x.globalAlpha = claro ? 0.05 : 0.22;
        x.fillStyle = gg;
        x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      }
      x.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const px = ox + r() * TILE;
        const py = oy + r() * TILE;
        x.strokeStyle = r() < 0.5 ? mat.veta[0] : mat.veta[1];
        x.globalAlpha = 0.1 + r() * 0.12;
        x.lineWidth = 1 + r() * 1.6;
        x.beginPath();
        x.moveTo(px, py);
        x.quadraticCurveTo(px + (r() - 0.5) * 26, py + (r() - 0.3) * 16, px + (r() - 0.5) * 34, py + 6 + r() * 20);
        x.stroke();
      }
      x.fillStyle = mat.veta[0];
      for (let i = 0; i < 3; i++) {
        x.globalAlpha = 0.08 + r() * 0.12;
        x.beginPath();
        x.arc(ox + r() * TILE, oy + r() * TILE, 0.7 + r() * 1.4, 0, 6.3);
        x.fill();
      }
    }
  }
  x.globalAlpha = 1;
  // Shadow under overhangs and in the pits, a rim of light on the left edges and a dark one on the right.
  for (let f = 0; f < rej.rows; f++) {
    for (let col = 0; col < rej.cols; col++) {
      if (!suelo(col, f)) continue;
      if (!sol(col, f + 1)) {
        const gg = x.createLinearGradient(0, (f + 1) * TILE - 22, 0, (f + 1) * TILE);
        gg.addColorStop(0, 'rgba(4,0,14,0)');
        gg.addColorStop(1, 'rgba(4,0,14,0.7)');
        x.fillStyle = gg;
        x.fillRect(col * TILE, (f + 1) * TILE - 22, TILE, 22);
      }
      if (!sol(col - 1, f)) {
        const gg = x.createLinearGradient(col * TILE, 0, col * TILE + 12, 0);
        gg.addColorStop(0, 'rgba(255,230,200,0.22)');
        gg.addColorStop(1, 'rgba(255,230,200,0)');
        x.fillStyle = gg;
        x.fillRect(col * TILE, f * TILE, 12, TILE);
      }
      if (!sol(col + 1, f)) {
        const gg = x.createLinearGradient((col + 1) * TILE - 14, 0, (col + 1) * TILE, 0);
        gg.addColorStop(0, 'rgba(4,0,14,0)');
        gg.addColorStop(1, 'rgba(4,0,14,0.55)');
        x.fillStyle = gg;
        x.fillRect((col + 1) * TILE - 14, f * TILE, 14, TILE);
      }
    }
  }
  x.restore();

  // Ragged undersides: where the ground has air below it (floating blocks, ceilings), it ends in hanging rock and roots instead of a flat cut.
  for (let f = 0; f < rej.rows - 1; f++) {
    let c0 = -1;
    for (let col = 0; col <= rej.cols; col++) {
      const ok = col < rej.cols && suelo(col, f) && !sol(col, f + 1) && at(col, f + 1) !== '=';
      if (ok && c0 < 0) c0 = col;
      if (!ok && c0 >= 0) {
        const xa = c0 * TILE;
        const xb = col * TILE;
        const y = (f + 1) * TILE;
        x.fillStyle = mat.fondo;
        x.beginPath();
        x.moveTo(xa, y - 1);
        for (let px = xa; px < xb; px += 8 + r() * 10) {
          const p2 = Math.min(xb, px + 8 + r() * 10);
          x.lineTo(px + (p2 - px) * 0.5, y + 4 + r() * (r() < 0.25 ? 34 : 12));
          x.lineTo(p2, y - 1);
        }
        x.lineTo(xb, y - 2);
        x.closePath();
        x.fill();
        c0 = -1;
      }
    }
  }

  // 3. the grown top edge of every run of ground that has air above it.
  for (let f = 0; f < rej.rows; f++) {
    let c0 = -1;
    for (let col = 0; col <= rej.cols; col++) {
      const ok = col < rej.cols && suelo(col, f) && !sol(col, f - 1) && at(col, f - 1) !== '=';
      if (ok && c0 < 0) c0 = col;
      if (!ok && c0 >= 0) {
        borde(x, mat, r, c0 * TILE, col * TILE, f * TILE, rej.cols * TILE);
        c0 = -1;
      }
    }
  }

  // 4. one-way ledges: carved pieces hanging in the air, with their shadow.
  for (let f = 0; f < rej.rows; f++) {
    let c0 = -1;
    for (let col = 0; col <= rej.cols; col++) {
      const ok = col < rej.cols && rej.g[f][col] === '=';
      if (ok && c0 < 0) c0 = col;
      if (!ok && c0 >= 0) {
        repisa(x, mat, r, c0 * TILE + 2, (col - c0) * TILE - 4, f * TILE);
        c0 = -1;
      }
    }
  }

  // 5. spikes, «NO» blocks and the stage curtains.
  for (let f = 0; f < rej.rows; f++) {
    for (let col = 0; col < rej.cols; col++) {
      const ch = rej.g[f][col];
      if (ch === '^') pinchos(x, mat, r, col * TILE, (f + 1) * TILE);
      else if (ch === 'N') bloqueNo(x, col * TILE, f * TILE);
      else if (ch === 'T') telon(x, r, col * TILE, f * TILE, !sol(col, f - 1) || at(col, f - 1) !== 'T');
    }
  }
  texturar(c, 0.6);
  // Which chunks have anything (a tile of the grid in them or in the tile around: grass, roots and shadows spill over a tile).
  const trozos: [number, number][] = [];
  for (let fy = 0; fy * TROZO < rej.rows; fy++) {
    for (let fx = 0; fx * TROZO < rej.cols; fx++) {
      let hay = false;
      for (let f = fy * TROZO - 1; f <= (fy + 1) * TROZO && !hay; f++) {
        for (let col = fx * TROZO - 1; col <= (fx + 1) * TROZO && !hay; col++) {
          if (f >= 0 && f < rej.rows && col >= 0 && col < rej.cols && rej.g[f][col] !== '.') hay = true;
        }
      }
      if (hay) trozos.push([fx, fy]);
    }
  }
  return { c, esc: ESC_TILE, trozos };
}

/** A slab outside the grid (sliding, elevator, or the kind that falls): a carved ledge with its zone's look, plus a mark of what it does. */
export interface PlatBmp {
  c: HTMLCanvasElement;
  esc: number;
  /** Where the slab's top-left corner sits inside the bitmap (game units). */
  ox: number;
  oy: number;
}

export function hornearPlataforma(zona: Zona, w: number, tipo: 'mueve' | 'sube' | 'cae'): PlatBmp {
  const mat = MATERIAL[zona];
  const ox = 12;
  const oy = 12;
  const c = document.createElement('canvas');
  c.width = Math.ceil((w + ox * 2) * ESC_TILE);
  c.height = Math.ceil(64 * ESC_TILE);
  const x = c.getContext('2d')!;
  x.scale(ESC_TILE, ESC_TILE);
  const r = azar(hash(`${zona}${w}${tipo}`));
  x.translate(0, oy);
  repisa(x, mat, r, ox, w, 0);
  if (tipo === 'cae') {
    // Cracks across the slab and crumbs on its edge: it will not hold.
    x.strokeStyle = 'rgba(6,0,18,0.75)';
    x.lineWidth = 1.6;
    x.lineCap = 'round';
    for (let px = ox + 22; px < ox + w - 14; px += 34 + r() * 20) {
      x.beginPath();
      x.moveTo(px, 2);
      x.lineTo(px + 5, 8);
      x.lineTo(px - 3, 13);
      x.lineTo(px + 4, 19);
      x.stroke();
    }
    x.fillStyle = 'rgba(255,214,150,0.55)';
    for (let i = 0; i < 5; i++) x.fillRect(ox + 6 + r() * (w - 12), 20 + r() * 8, 2.6, 2.6);
  } else {
    // A gold rim and chevrons along the face: this one travels.
    x.strokeStyle = '#ffd24a';
    x.lineWidth = 2;
    x.globalAlpha = 0.95;
    x.beginPath();
    x.moveTo(ox + 10, 17);
    x.lineTo(ox + w - 10, 17);
    x.stroke();
    x.fillStyle = '#ffe9a8';
    const horiz = tipo === 'mueve';
    for (let px = ox + 20; px < ox + w - 14; px += 22) {
      x.beginPath();
      if (horiz) {
        x.moveTo(px - 4, 7);
        x.lineTo(px + 4, 11);
        x.lineTo(px - 4, 15);
      } else {
        x.moveTo(px - 5, 14);
        x.lineTo(px, 6);
        x.lineTo(px + 5, 14);
      }
      x.closePath();
      x.fill();
    }
    x.globalAlpha = 1;
  }
  return { c, esc: ESC_TILE, ox, oy };
}

// ---------------------------------------------------------------- the top edge, by zone

function borde(x: CanvasRenderingContext2D, mat: Mat, r: () => number, x0: number, x1: number, y: number, ancho: number) {
  const paso = mat.estilo === 'hierba' ? 7 : mat.estilo === 'espuma' ? 11 : mat.estilo === 'papel' ? 16 : 20;
  // The line of the surface wanders a few units and the grown layer hangs from it with a ragged lower edge.
  const arriba: [number, number][] = [];
  const abajo: [number, number][] = [];
  for (let px = x0; px <= x1 + paso; px += paso) {
    const p = Math.min(px, x1);
    arriba.push([p, y + 2 - r() * (mat.estilo === 'espuma' ? 7 : 3)]);
    abajo.push([p, y + 9 + r() * (mat.estilo === 'hierba' ? 12 : 9)]);
  }
  const trazar = () => {
    x.beginPath();
    x.moveTo(arriba[0][0], arriba[0][1]);
    for (const [px, py] of arriba) x.lineTo(px, py);
    for (let i = abajo.length - 1; i >= 0; i--) x.lineTo(abajo[i][0], abajo[i][1]);
    x.closePath();
  };
  const g = x.createLinearGradient(0, y - 4, 0, y + 22);
  g.addColorStop(0, mat.top[2]);
  g.addColorStop(0.45, mat.top[1]);
  g.addColorStop(1, mat.top[0]);
  trazar();
  x.fillStyle = g;
  x.fill();
  // The dark underside of the grown layer, so it reads as a thing sitting on the rock.
  x.save();
  x.globalAlpha = 0.5;
  x.strokeStyle = '#06010f';
  x.lineWidth = 2.4;
  x.beginPath();
  x.moveTo(abajo[0][0], abajo[0][1] + 1);
  for (const [px, py] of abajo) x.lineTo(px, py + 1);
  x.stroke();
  x.restore();
  // The lit line on top.
  x.strokeStyle = mat.borde;
  x.globalAlpha = 0.85;
  x.lineWidth = 2;
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(arriba[0][0], arriba[0][1] - 0.5);
  for (const [px, py] of arriba) x.lineTo(px, py - 0.5);
  x.stroke();
  x.globalAlpha = 1;
  const largo = x1 - x0;
  switch (mat.estilo) {
    case 'hierba': {
      // Blades of grass in two greens, leaning a little, and now and then a small flower.
      const n = Math.round(largo / 5);
      for (let i = 0; i < n; i++) {
        const px = x0 + 3 + r() * (largo - 6);
        const h = 9 + r() * 20;
        const lean = (r() - 0.5) * 12;
        x.fillStyle = mat.top[(r() * 3) | 0];
        x.beginPath();
        x.moveTo(px - 2.6, y + 5);
        x.quadraticCurveTo(px + lean * 0.3, y - h * 0.5, px + lean, y - h);
        x.quadraticCurveTo(px + lean * 0.3 + 1, y - h * 0.4, px + 2.6, y + 5);
        x.closePath();
        x.fill();
      }
      for (let i = 0; i < largo / 70; i++) {
        const px = x0 + 14 + r() * (largo - 28);
        const h = 22 + r() * 14;
        x.strokeStyle = '#2a7a4a';
        x.lineWidth = 1.6;
        x.beginPath();
        x.moveTo(px, y + 4);
        x.lineTo(px + 2, y - h);
        x.stroke();
        x.fillStyle = r() < 0.5 ? '#ff9ad0' : '#ffd88a';
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * 6.28;
          x.beginPath();
          x.arc(px + 2 + Math.cos(a) * 3.4, y - h + Math.sin(a) * 3.4, 2.2, 0, 6.3);
          x.fill();
        }
        x.fillStyle = '#fff3c0';
        x.beginPath();
        x.arc(px + 2, y - h, 1.8, 0, 6.3);
        x.fill();
      }
      break;
    }
    case 'moqueta': {
      // The hall's worn rug: a fringe of tassels hanging from the edge and gold dust on top.
      x.strokeStyle = mat.borde;
      x.lineWidth = 1.6;
      x.globalAlpha = 0.75;
      for (let px = x0 + 4; px < x1 - 2; px += 6) {
        const l = 7 + r() * 9;
        x.beginPath();
        x.moveTo(px, y + 12);
        x.quadraticCurveTo(px + (r() - 0.5) * 4, y + 12 + l * 0.6, px + (r() - 0.5) * 6, y + 12 + l);
        x.stroke();
      }
      x.globalAlpha = 1;
      x.fillStyle = mat.top[2];
      for (let i = 0; i < largo / 30; i++) {
        const px = x0 + 6 + r() * (largo - 12);
        x.globalAlpha = 0.5 + r() * 0.4;
        x.beginPath();
        x.moveTo(px - 4, y + 2);
        x.lineTo(px, y - 4 - r() * 7);
        x.lineTo(px + 4, y + 2);
        x.closePath();
        x.fill();
      }
      x.globalAlpha = 1;
      break;
    }
    case 'papel': {
      // A stack of sheets: thin strips with small offsets, and the odd red stamp.
      for (let i = 0; i < 3; i++) {
        x.fillStyle = i % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(120,110,170,0.4)';
        x.fillRect(x0 + (i % 2) * 3, y + 5 + i * 4.5, largo - (i % 2) * 5, 1.8);
      }
      for (let i = 0; i < largo / 55; i++) {
        const px = x0 + 10 + r() * (largo - 20);
        x.fillStyle = 'rgba(210,60,90,0.8)';
        x.beginPath();
        x.arc(px, y + 8, 3, 0, 6.3);
        x.fill();
      }
      // Envelope flaps peeking over the edge.
      for (let i = 0; i < largo / 90; i++) {
        const px = x0 + 14 + r() * (largo - 40);
        x.fillStyle = mat.top[1];
        x.beginPath();
        x.moveTo(px, y + 2);
        x.lineTo(px + 11, y - 9 - r() * 4);
        x.lineTo(px + 22, y + 2);
        x.closePath();
        x.fill();
        x.strokeStyle = 'rgba(80,70,130,0.5)';
        x.lineWidth = 1;
        x.stroke();
      }
      break;
    }
    case 'tablas': {
      // Stage boards: plank joints every few tiles of width, a velvet lip below and a gold trim line.
      x.strokeStyle = 'rgba(20,4,10,0.6)';
      x.lineWidth = 1.4;
      for (let px = x0 + 22; px < x1 - 6; px += 38 + ((px * 7) % 11)) {
        x.beginPath();
        x.moveTo(px, y + 3);
        x.lineTo(px + (r() - 0.5) * 3, y + 12);
        x.stroke();
      }
      x.fillStyle = 'rgba(150,20,40,0.85)';
      x.fillRect(x0, y + 13, largo, 4);
      x.fillStyle = 'rgba(255,210,120,0.8)';
      x.fillRect(x0, y + 12, largo, 1.4);
      break;
    }
    case 'espuma': {
      // Beer foam: clumps of round bubbles on the edge, and a few drips running down the rock.
      const n = Math.round(largo / 10);
      for (let i = 0; i < n; i++) {
        const px = x0 + 4 + r() * (largo - 8);
        const rr = 4 + r() * 6;
        x.fillStyle = mat.top[(r() * 3) | 0];
        x.beginPath();
        x.arc(px, y + 2 - r() * 5, rr, 0, 6.3);
        x.fill();
        x.fillStyle = 'rgba(255,255,255,0.7)';
        x.beginPath();
        x.arc(px - rr * 0.3, y - rr * 0.3, rr * 0.28, 0, 6.3);
        x.fill();
      }
      x.strokeStyle = '#ffcf5a';
      x.lineWidth = 3;
      x.lineCap = 'round';
      for (let i = 0; i < largo / 80; i++) {
        const px = x0 + 12 + r() * (largo - 24);
        x.globalAlpha = 0.7;
        x.beginPath();
        x.moveTo(px, y + 12);
        x.lineTo(px, y + 20 + r() * 26);
        x.stroke();
      }
      x.globalAlpha = 1;
      break;
    }
  }
  void ancho;
}

// ---------------------------------------------------------------- floating ledges

function repisa(x: CanvasRenderingContext2D, mat: Mat, r: () => number, x0: number, w: number, y: number) {
  // Its shadow on the air below, soft.
  x.fillStyle = 'rgba(6,0,20,0.32)';
  x.beginPath();
  x.ellipse(x0 + w / 2, y + 30, w / 2 + 2, 8, 0, 0, 6.3);
  x.fill();
  // Roots / stalactites hanging from the underside.
  x.fillStyle = '#0a0418';
  for (let px = x0 + 10; px < x0 + w - 8; px += 18 + r() * 22) {
    const l = 12 + r() * 24;
    x.beginPath();
    x.moveTo(px - 5, y + 13);
    x.quadraticCurveTo(px - 1, y + 13 + l * 0.6, px + (r() - 0.5) * 6, y + 13 + l);
    x.quadraticCurveTo(px + 2, y + 13 + l * 0.5, px + 6, y + 13);
    x.closePath();
    x.fill();
  }
  // The slab: a carved piece, dark, lit on top, with faceted shading.
  const g = x.createLinearGradient(0, y, 0, y + 20);
  g.addColorStop(0, mat.repisa);
  g.addColorStop(0.5, mat.luz);
  g.addColorStop(1, mat.fondo);
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(x0 + 6, y);
  x.lineTo(x0 + w - 6, y);
  x.quadraticCurveTo(x0 + w + 2, y + 1, x0 + w - 2, y + 11);
  x.quadraticCurveTo(x0 + w - 12, y + 21, x0 + w * 0.6, y + 17);
  x.quadraticCurveTo(x0 + w * 0.4, y + 22, x0 + 12, y + 18);
  x.quadraticCurveTo(x0 - 4, y + 12, x0 + 6, y);
  x.closePath();
  x.fill();
  x.save();
  x.clip();
  x.fillStyle = 'rgba(4,0,14,0.35)';
  for (let px = x0 + 14; px < x0 + w - 10; px += 20 + r() * 20) {
    x.beginPath();
    x.moveTo(px, y);
    x.lineTo(px + 14, y + 22);
    x.lineTo(px - 10, y + 22);
    x.closePath();
    x.fill();
  }
  x.restore();
  // Lit top and the grown edge of the zone, thin.
  x.strokeStyle = mat.borde;
  x.globalAlpha = 0.9;
  x.lineWidth = 2.2;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(x0 + 8, y + 0.5);
  x.lineTo(x0 + w - 8, y + 0.5);
  x.stroke();
  x.globalAlpha = 1;
  x.fillStyle = mat.top[1];
  x.globalAlpha = 0.9;
  if (mat.estilo === 'hierba') {
    for (let px = x0 + 8; px < x0 + w - 8; px += 5 + r() * 4) {
      const h = 5 + r() * 9;
      x.beginPath();
      x.moveTo(px - 2, y + 3);
      x.lineTo(px + (r() - 0.5) * 6, y - h);
      x.lineTo(px + 2, y + 3);
      x.closePath();
      x.fill();
    }
  } else if (mat.estilo === 'espuma') {
    for (let px = x0 + 10; px < x0 + w - 8; px += 9 + r() * 7) {
      x.beginPath();
      x.arc(px, y + 1, 3 + r() * 3.4, 0, 6.3);
      x.fill();
    }
  } else if (mat.estilo === 'tablas') {
    x.fillStyle = 'rgba(150,20,40,0.9)';
    x.fillRect(x0 + 6, y + 6, w - 12, 3);
  } else if (mat.estilo === 'papel') {
    x.fillStyle = 'rgba(255,255,255,0.5)';
    x.fillRect(x0 + 8, y + 4, w - 16, 1.8);
  } else {
    for (let px = x0 + 10; px < x0 + w - 8; px += 14 + r() * 10) {
      x.beginPath();
      x.moveTo(px - 3, y + 2);
      x.lineTo(px, y - 4 - r() * 4);
      x.lineTo(px + 3, y + 2);
      x.closePath();
      x.fill();
    }
  }
  x.globalAlpha = 1;
}

// ---------------------------------------------------------------- spikes, NO blocks, curtains

function pinchos(x: CanvasRenderingContext2D, mat: Mat, r: () => number, ox: number, base: number) {
  for (let i = 0; i < 3; i++) {
    const px = ox + 4 + i * 14.5;
    const h = 26 + r() * 10;
    x.fillStyle = '#0a0318';
    x.beginPath();
    x.moveTo(px - 1.5, base);
    x.lineTo(px + 7, base - h - 1.5);
    x.lineTo(px + 17.5, base);
    x.closePath();
    x.fill();
    x.fillStyle = mat.pinchos;
    x.beginPath();
    x.moveTo(px, base);
    x.lineTo(px + 7, base - h);
    x.lineTo(px + 15, base);
    x.closePath();
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.42)';
    x.beginPath();
    x.moveTo(px, base);
    x.lineTo(px + 7, base - h);
    x.lineTo(px + 7.5, base);
    x.closePath();
    x.fill();
  }
}

function bloqueNo(x: CanvasRenderingContext2D, ox: number, oy: number) {
  // A block of «NO»: a red slab cut with facets, the two letters as strokes (like the concept «NO» of the world).
  const g = x.createLinearGradient(0, oy, 0, oy + TILE);
  g.addColorStop(0, '#ff6a52');
  g.addColorStop(1, '#a8202c');
  x.fillStyle = '#2a0610';
  x.fillRect(ox + 1, oy + 1, TILE - 2, TILE - 2);
  x.fillStyle = g;
  x.fillRect(ox + 3, oy + 3, TILE - 6, TILE - 6);
  x.fillStyle = 'rgba(255,255,255,0.18)';
  x.beginPath();
  x.moveTo(ox + 3, oy + 3);
  x.lineTo(ox + TILE - 3, oy + 3);
  x.lineTo(ox + 3, oy + TILE - 3);
  x.closePath();
  x.fill();
  x.strokeStyle = '#fff1e0';
  x.lineWidth = 5;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(ox + 11, oy + 33);
  x.lineTo(ox + 11, oy + 15);
  x.lineTo(ox + 22, oy + 33);
  x.lineTo(ox + 22, oy + 15);
  x.stroke();
  x.beginPath();
  x.ellipse(ox + 34, oy + 24, 5.5, 9, 0, 0, 6.3);
  x.stroke();
}

function telon(x: CanvasRenderingContext2D, r: () => number, ox: number, oy: number, cima: boolean) {
  // A stage curtain: vertical folds of red velvet with a gold fringe at the foot; only the Mutis goes through it.
  const g = x.createLinearGradient(ox, 0, ox + TILE, 0);
  g.addColorStop(0, '#5a0a1e');
  g.addColorStop(0.25, '#c2203e');
  g.addColorStop(0.5, '#7a1028');
  g.addColorStop(0.75, '#d8304a');
  g.addColorStop(1, '#5a0a1e');
  x.fillStyle = g;
  x.fillRect(ox, oy, TILE, TILE);
  x.fillStyle = 'rgba(255,200,170,0.16)';
  for (let k = 0; k < 4; k++) x.fillRect(ox + 6 + k * 11 + r() * 2, oy, 2.5, TILE);
  if (cima) {
    x.fillStyle = '#ffd070';
    x.fillRect(ox, oy, TILE, 5);
  }
  x.fillStyle = 'rgba(255,208,112,0.9)';
  x.fillRect(ox, oy + TILE - 5, TILE, 3);
}
