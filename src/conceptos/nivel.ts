// The painted tiles of a room: the whole grid of solids, ledges and spikes is baked ONCE into a single bitmap when the room opens (docs/ESTILO.md
// T5.7); the frame blits the part that is on screen. Faceted carved blocks with a rim of light on the lit side, no black outlines.
import { texturar } from '../capitulos/conceptos-rig';
import { TILE, type Zona } from './datos';
import type { Rejilla } from './fisica';

/** Bitmap pixels per game unit for the tiles. */
export const ESC_TILE = 1.4;

function azar(semilla: number) {
  let s = semilla >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

interface Mat {
  cuerpo: [string, string];
  faceta: [string, string];
  borde: string;
  brillo: string;
  hierba: string[];
  repisa: string;
  pinchos: string;
}

const MATERIAL: Record<Zona, Mat> = {
  recibidor: {
    cuerpo: ['#4a2272', '#22093c'],
    faceta: ['#1b0838', '#ffd9b0'],
    borde: '#ffb35a',
    brillo: '#fff0c4',
    hierba: ['#ffcf6a', '#ff9a5a', '#ffb8d0'],
    repisa: '#8a4a5a',
    pinchos: '#e0336f',
  },
  jardin: {
    cuerpo: ['#4a2e78', '#170a38'],
    faceta: ['#0e0526', '#d8b8ff'],
    borde: '#8ae0a8',
    brillo: '#f0ffe0',
    hierba: ['#4cc27a', '#9aeaa0', '#3aa088'],
    repisa: '#6a4aa0',
    pinchos: '#ff4fa8',
  },
};

export interface NivelBmp {
  c: HTMLCanvasElement;
  esc: number;
}

const solidoCh = (ch: string) => ch === '#' || ch === 'N' || ch === 'T' || ch === 'X';

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
  const sol = (col: number, fila: number) => solidoCh(at(col, fila));

  // 1. the bodies of the blocks, by horizontal runs, with a vertical gradient over the whole room.
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mat.cuerpo[0]);
  g.addColorStop(1, mat.cuerpo[1]);
  x.fillStyle = g;
  const sombra = new Path2D();
  for (let f = 0; f < rej.rows; f++) {
    let c0 = -1;
    for (let col = 0; col <= rej.cols; col++) {
      const s = col < rej.cols && solidoCh(rej.g[f][col]);
      if (s && c0 < 0) c0 = col;
      if (!s && c0 >= 0) {
        x.fillRect(c0 * TILE - 0.5, f * TILE - 0.5, (col - c0) * TILE + 1, TILE + 1);
        sombra.rect(c0 * TILE, f * TILE, (col - c0) * TILE, TILE);
        c0 = -1;
      }
    }
  }

  // 2. carved facets over the solids: triangles of shade and of light.
  x.save();
  x.clip(sombra);
  for (let f = 0; f < rej.rows; f++) {
    for (let col = 0; col < rej.cols; col++) {
      if (!solidoCh(rej.g[f][col])) continue;
      const n = 1 + ((r() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const ox = col * TILE + (r() - 0.3) * TILE;
        const oy = f * TILE + (r() - 0.3) * TILE;
        const luz = r() < 0.35;
        x.fillStyle = luz ? mat.faceta[1] : mat.faceta[0];
        x.globalAlpha = luz ? 0.05 + r() * 0.07 : 0.1 + r() * 0.16;
        x.beginPath();
        x.moveTo(ox, oy);
        x.lineTo(ox + (r() * 0.8 + 0.3) * TILE * 1.4, oy + (r() - 0.5) * TILE);
        x.lineTo(ox + (r() - 0.2) * TILE, oy + (r() * 0.8 + 0.3) * TILE * 1.4);
        x.closePath();
        x.fill();
      }
    }
  }
  x.globalAlpha = 1;
  // Shade under every ceiling-like edge: a block whose lower neighbour is empty darkens along its underside, and a deep inner shadow below ledges.
  for (let f = 0; f < rej.rows; f++) {
    for (let col = 0; col < rej.cols; col++) {
      if (!solidoCh(rej.g[f][col])) continue;
      if (!sol(col, f + 1)) {
        const gg = x.createLinearGradient(0, (f + 1) * TILE - 16, 0, (f + 1) * TILE);
        gg.addColorStop(0, 'rgba(10,0,30,0)');
        gg.addColorStop(1, 'rgba(10,0,30,0.45)');
        x.fillStyle = gg;
        x.fillRect(col * TILE, (f + 1) * TILE - 16, TILE, 16);
      }
      if (!sol(col - 1, f)) {
        x.fillStyle = 'rgba(255,240,210,0.16)';
        x.fillRect(col * TILE, f * TILE, 4, TILE);
      }
      if (!sol(col + 1, f)) {
        x.fillStyle = 'rgba(10,0,30,0.3)';
        x.fillRect((col + 1) * TILE - 5, f * TILE, 5, TILE);
      }
    }
  }
  // The floor pattern under the grass: tiles of the hall (checks) or soil strata.
  for (let f = 0; f < rej.rows; f++) {
    for (let col = 0; col < rej.cols; col++) {
      if (rej.g[f][col] !== '#' || sol(col, f - 1)) continue;
      if (zona === 'recibidor') {
        // The hall's tiled floor: alternate lighter squares down the first two rows.
        for (let k = 0; k < 2; k++) {
          if (!sol(col, f + k)) continue;
          if ((col + f + k) % 2) {
            x.fillStyle = 'rgba(255,200,140,0.10)';
            x.fillRect(col * TILE, (f + k) * TILE, TILE, TILE);
          }
        }
      } else {
        x.fillStyle = 'rgba(160,255,230,0.07)';
        x.fillRect(col * TILE, f * TILE + 18, TILE, 3);
        x.fillRect(col * TILE + 10, f * TILE + 36, TILE - 20, 3);
      }
    }
  }
  x.restore();

  // 3. the lit top edge of every block that has air above it: a jagged rim and a bright line (the "grass" of the garden).
  for (let f = 0; f < rej.rows; f++) {
    let c0 = -1;
    for (let col = 0; col <= rej.cols; col++) {
      const ok = col < rej.cols && solidoCh(rej.g[f][col]) && !sol(col, f - 1) && at(col, f - 1) !== '=';
      if (ok && c0 < 0) c0 = col;
      if (!ok && c0 >= 0) {
        const x0 = c0 * TILE;
        const x1 = col * TILE;
        const y = f * TILE;
        // The body of the rim.
        x.fillStyle = mat.borde;
        x.beginPath();
        x.moveTo(x0, y + 14);
        for (let px = x0; px <= x1; px += zona === 'jardin' ? 12 : 24) {
          const alto = zona === 'jardin' ? 4 + r() * 12 : 3 + r() * 4;
          x.lineTo(px + (zona === 'jardin' ? 3 : 8), y - alto + 4);
          x.lineTo(px + (zona === 'jardin' ? 9 : 16), y + 8 + r() * 4);
        }
        x.lineTo(x1, y + 14);
        x.closePath();
        x.fill();
        // The shadowed half of the rim, then the bright line.
        const gg = x.createLinearGradient(0, y, 0, y + 16);
        gg.addColorStop(0, 'rgba(255,255,255,0.35)');
        gg.addColorStop(1, 'rgba(20,0,40,0.4)');
        x.fillStyle = gg;
        x.fillRect(x0, y, x1 - x0, 15);
        x.fillStyle = mat.brillo;
        x.globalAlpha = 0.85;
        x.fillRect(x0 + 2, y + 1, x1 - x0 - 4, 2.5);
        x.globalAlpha = 1;
        // Small tufts / flowers on the garden, ornaments on the hall.
        const n = Math.round(((x1 - x0) / TILE) * (zona === 'jardin' ? 1.5 : 0.7));
        for (let i = 0; i < n; i++) {
          const px = x0 + 8 + r() * (x1 - x0 - 16);
          x.fillStyle = mat.hierba[(r() * mat.hierba.length) | 0];
          x.beginPath();
          if (zona === 'jardin') {
            const h = 10 + r() * 16;
            x.moveTo(px - 4, y + 2);
            x.lineTo(px + (r() - 0.5) * 8, y - h);
            x.lineTo(px + 4, y + 2);
          } else {
            x.moveTo(px - 5, y + 2);
            x.lineTo(px, y - 8 - r() * 6);
            x.lineTo(px + 5, y + 2);
          }
          x.closePath();
          x.fill();
        }
        c0 = -1;
      }
    }
  }

  // 4. one-way ledges: a slab with its brackets (the hall's shelves, the garden's lily pads).
  for (let f = 0; f < rej.rows; f++) {
    let c0 = -1;
    for (let col = 0; col <= rej.cols; col++) {
      const ok = col < rej.cols && rej.g[f][col] === '=';
      if (ok && c0 < 0) c0 = col;
      if (!ok && c0 >= 0) {
        const x0 = c0 * TILE + 2;
        const w = (col - c0) * TILE - 4;
        const y = f * TILE;
        x.fillStyle = 'rgba(10,0,30,0.35)';
        x.beginPath();
        x.ellipse(x0 + w / 2, y + 26, w / 2, 7, 0, 0, 6.3);
        x.fill();
        const gg = x.createLinearGradient(0, y, 0, y + 18);
        gg.addColorStop(0, mat.borde);
        gg.addColorStop(0.45, mat.repisa);
        gg.addColorStop(1, '#1a0a30');
        x.fillStyle = gg;
        x.beginPath();
        if (zona === 'jardin') {
          x.moveTo(x0, y + 4);
          x.quadraticCurveTo(x0 + w / 2, y - 4, x0 + w, y + 4);
          x.quadraticCurveTo(x0 + w / 2, y + 28, x0, y + 4);
        } else {
          x.roundRect(x0, y, w, 16, 7);
        }
        x.fill();
        x.fillStyle = mat.brillo;
        x.globalAlpha = 0.75;
        x.fillRect(x0 + 8, y + 1.5, w - 16, 2.4);
        x.globalAlpha = 1;
        // brackets (hall) or roots (garden)
        x.fillStyle = mat.repisa;
        for (let px = x0 + 14; px < x0 + w - 8; px += TILE * 1.5) {
          x.beginPath();
          x.moveTo(px - 6, y + 14);
          x.lineTo(px + 6, y + 14);
          x.lineTo(px, y + 14 + (zona === 'jardin' ? 14 + r() * 12 : 20));
          x.closePath();
          x.fill();
        }
        c0 = -1;
      }
    }
  }

  // 5. spikes: three thorns per tile with a lit left edge.
  for (let f = 0; f < rej.rows; f++) {
    for (let col = 0; col < rej.cols; col++) {
      const ch = rej.g[f][col];
      if (ch === '^') {
        const base = (f + 1) * TILE;
        for (let i = 0; i < 3; i++) {
          const px = col * TILE + 4 + i * 14.5;
          const h = 26 + r() * 10;
          x.fillStyle = '#12052a';
          x.beginPath();
          x.moveTo(px - 1, base);
          x.lineTo(px + 7, base - h - 1);
          x.lineTo(px + 17, base);
          x.closePath();
          x.fill();
          x.fillStyle = mat.pinchos;
          x.beginPath();
          x.moveTo(px, base);
          x.lineTo(px + 7, base - h);
          x.lineTo(px + 15, base);
          x.closePath();
          x.fill();
          x.fillStyle = 'rgba(255,255,255,0.45)';
          x.beginPath();
          x.moveTo(px, base);
          x.lineTo(px + 7, base - h);
          x.lineTo(px + 7.5, base);
          x.closePath();
          x.fill();
        }
      }
      if (ch === 'N') {
        // A block of «NO».
        x.fillStyle = '#e8453c';
        x.fillRect(col * TILE + 4, f * TILE + 4, TILE - 8, TILE - 8);
        // (the two letters are strokes, like the concept «NO» of the world, src/arte/conceptos.mjs)
        x.strokeStyle = '#fff1e0';
        x.lineWidth = 5;
        x.lineCap = 'round';
        x.lineJoin = 'round';
        const ox = col * TILE;
        const oy = f * TILE;
        x.beginPath();
        x.moveTo(ox + 9, oy + 34);
        x.lineTo(ox + 9, oy + 14);
        x.lineTo(ox + 22, oy + 34);
        x.lineTo(ox + 22, oy + 14);
        x.stroke();
        x.beginPath();
        x.ellipse(ox + 35, oy + 24, 6, 10, 0, 0, 6.3);
        x.stroke();
      }
    }
  }
  texturar(c, 0.75);
  return { c, esc: ESC_TILE };
}
