// The two backgrounds of the theatre's fights, in the same three layers that tile sideways as 'campo' (fondo.ts):
//  - 'teatro': the corridors and the flies behind the stage (planked walls, ropes with sandbags, painted flats
//    hanging, props, the ghost light) with a worn wooden floor marked with the tapes of the stagehands.
//  - 'escenario': the stage itself with the red velvet curtain, the footlights and the prompter's shell in front
//    of a dark stalls with its boxes and its chandelier, on lacquered boards with pools of spotlight.
// Everything is painted once (`una`); the fight only draws the three cached layers.
import { azar, ctx, elipse, lienzo, rect, una } from './pixel';
import { linea } from './iconos';
import { PANTALLA_H } from './interfaz';

export const W_LEJOS = 360;
export const W_MEDIO = 420;
export const W_SUELO = 480;
const ALTO_SUELO = PANTALLA_H - 60;

/** Runs `f(dx)` for an item at `px` and again a whole layer to the left, so an item on the edge tiles. */
const repetir = (ancho: number, px: number, w: number, f: (px: number) => void) => {
  f(px);
  if (px + w > ancho) f(px - ancho);
};

// ---------------------------------------------------------------- «teatro»: the corridors and the flies

export function lejosTeatro(): HTMLCanvasElement {
  return una('fondo.teatro.lejos', () => {
    const c = lienzo(W_LEJOS, 64);
    const x = ctx(c);
    const r = azar(31);
    // planked wall, lit warmer near the bottom
    const pared = ['#120a1e', '#170d26', '#1c112c', '#211632', '#271a38', '#2e1f3e', '#352644', '#3c2c48', '#43324c'];
    pared.forEach((col, i) => rect(x, col, 0, i * 7, W_LEJOS, 7));
    for (let px = 0; px < W_LEJOS; px += 6) {
      rect(x, 'rgba(0,0,0,0.3)', px, 0, 1, 64);
      if (px % 12 === 0) rect(x, 'rgba(255,190,140,0.05)', px + 1, 0, 1, 64);
    }
    for (let i = 0; i < 90; i++) rect(x, 'rgba(0,0,0,0.22)', Math.floor(r() * W_LEJOS), Math.floor(r() * 64), 1, 2 + Math.floor(r() * 3));
    // the flies: a black gallery with a beam and its cross bracing
    rect(x, '#06030c', 0, 0, W_LEJOS, 11);
    rect(x, '#3a2426', 0, 10, W_LEJOS, 3);
    rect(x, '#5a3a38', 0, 10, W_LEJOS, 1);
    rect(x, '#24141a', 0, 13, W_LEJOS, 1);
    for (let px = 0; px < W_LEJOS; px += 24) {
      linea(x, '#2c1a1e', px, 3, px + 12, 10);
      linea(x, '#2c1a1e', px + 12, 3, px, 10);
      rect(x, '#2c1a1e', px, 2, 1, 9);
    }
    rect(x, '#2c1a1e', 0, 2, W_LEJOS, 1);
    // ropes with sandbags hanging from the beam, at different lengths
    for (let i = 0; i < 16; i++) {
      const px = 8 + i * 22 + Math.floor(r() * 8);
      const largo = 10 + Math.floor(r() * 22);
      rect(x, '#8a7048', px, 13, 1, largo);
      rect(x, '#4a3a28', px + 1, 13, 1, largo);
      if (i % 2 === 0) {
        const by = 13 + largo;
        elipse(x, '#b8955a', px, by + 4, 4, 5);
        rect(x, '#d8b878', px - 2, by + 1, 2, 5);
        rect(x, '#7a5a30', px + 1, by + 3, 2, 5);
        rect(x, '#5a4020', px - 1, by - 1, 3, 2);
      } else {
        // a pulley and a coil
        elipse(x, '#5a4a58', px, 17, 2, 2);
        rect(x, '#2a1c2a', px, 17, 1, 1);
      }
    }
    // painted flats hanging on the wall: a night with a moon, a castle, a forest
    const bastidor = (px: number, w: number, h: number, pintar: (o: number) => void) => {
      repetir(W_LEJOS, px, w, (o) => {
        rect(x, '#1a0f12', o - 1, 16, w + 2, h + 2);
        rect(x, '#6a4830', o - 1, 16, w + 2, 1);
        rect(x, '#6a4830', o - 1, 16, 1, h + 2);
        rect(x, '#3a2418', o + w, 16, 1, h + 2);
        rect(x, '#3a2418', o - 1, 16 + h + 1, w + 2, 1);
        pintar(o);
      });
    };
    bastidor(14, 52, 36, (o) => {
      rect(x, '#1f2f66', o, 17, 52, 36);
      rect(x, '#2a3f84', o, 17, 52, 12);
      elipse(x, '#f6e8a0', o + 36, 28, 7, 7);
      elipse(x, '#1f2f66', o + 39, 26, 5, 5);
      for (let i = 0; i < 9; i++) rect(x, '#e8ecff', o + 3 + Math.floor(r() * 46), 19 + Math.floor(r() * 18), 1, 1);
      rect(x, '#142040', o, 44, 52, 9);
      elipse(x, '#142040', o + 14, 44, 16, 4);
    });
    bastidor(122, 70, 36, (o) => {
      rect(x, '#44245a', o, 17, 70, 36);
      rect(x, '#5a3a78', o, 17, 70, 10);
      // a cardboard castle with its towers
      rect(x, '#8a8aa8', o + 14, 34, 42, 19);
      for (let i = 0; i < 8; i++) rect(x, '#8a8aa8', o + 14 + i * 6, 31, 3, 3);
      rect(x, '#9a9ab8', o + 6, 28, 12, 25);
      rect(x, '#9a9ab8', o + 52, 28, 12, 25);
      for (let i = 0; i < 3; i++) {
        rect(x, '#9a9ab8', o + 6 + i * 5, 25, 3, 3);
        rect(x, '#9a9ab8', o + 52 + i * 5, 25, 3, 3);
      }
      rect(x, '#5a4a78', o + 30, 42, 10, 11);
      rect(x, '#2a1c3a', o + 31, 43, 8, 10);
      rect(x, '#f0c850', o + 9, 33, 2, 3);
      rect(x, '#f0c850', o + 55, 33, 2, 3);
      rect(x, '#e8283a', o + 34, 22, 1, 6);
      rect(x, '#e8283a', o + 35, 22, 4, 3);
    });
    bastidor(250, 60, 36, (o) => {
      rect(x, '#1c3a3e', o, 17, 60, 36);
      rect(x, '#2a5a58', o, 17, 60, 14);
      for (const tx of [6, 20, 34, 48]) {
        rect(x, '#3a2a22', o + tx, 38, 3, 15);
        elipse(x, '#1f5a3c', o + tx + 1, 34, 8, 9);
        elipse(x, '#2a7a50', o + tx - 1, 31, 4, 4);
      }
      rect(x, '#10261e', o, 50, 60, 3);
    });
    // practical lamps on a rail along the bottom, with their glow
    rect(x, '#2a1a1c', 0, 56, W_LEJOS, 2);
    rect(x, '#5a3a34', 0, 56, W_LEJOS, 1);
    for (let px = 22; px < W_LEJOS; px += 45) {
      rect(x, '#6a5a58', px, 53, 1, 3);
      elipse(x, '#ffe0a0', px, 52, 2.5, 2);
      x.fillStyle = 'rgba(255,200,120,0.07)';
      x.beginPath();
      x.arc(px, 54, 14, 0, 7);
      x.fill();
      x.fillStyle = 'rgba(255,200,120,0.1)';
      x.beginPath();
      x.arc(px, 54, 8, 0, 7);
      x.fill();
    }
    rect(x, '#0a0614', 0, 58, W_LEJOS, 6);
    return c;
  });
}

export function medioTeatro(): HTMLCanvasElement {
  return una('fondo.teatro.medio', () => {
    const c = lienzo(W_MEDIO, 40);
    const x = ctx(c);
    const r = azar(47);
    const suelo = 38;
    // props, back to front; each is drawn on the edge too so the layer tiles
    const caja = (px: number, w: number, h: number) =>
      repetir(W_MEDIO, px, w, (o) => {
        rect(x, '#8a6a44', o, suelo - h, w, h);
        rect(x, '#a8845a', o, suelo - h, w, 2);
        rect(x, '#5a4228', o + w - 3, suelo - h, 3, h);
        rect(x, '#5a4228', o, suelo - h + Math.floor(h / 2), w, 1);
        linea(x, '#6a4e30', o + 2, suelo - h + 2, o + w - 4, suelo - 2);
        linea(x, '#6a4e30', o + w - 4, suelo - h + 2, o + 2, suelo - 2);
        rect(x, '#e8e0c8', o + 3, suelo - h + 4, 6, 4);
      });
    caja(12, 22, 16);
    caja(30, 16, 12);
    caja(34, 14, 24);
    // a cardboard throne with gold paint
    repetir(W_MEDIO, 74, 22, (o) => {
      rect(x, '#7a1a2a', o + 3, suelo - 26, 16, 22);
      rect(x, '#a82a3a', o + 4, suelo - 26, 3, 22);
      rect(x, '#f0c040', o + 1, suelo - 28, 3, 28);
      rect(x, '#f0c040', o + 18, suelo - 28, 3, 28);
      rect(x, '#d89a20', o + 3, suelo - 28, 16, 2);
      rect(x, '#9a1a2a', o + 2, suelo - 12, 18, 8);
      rect(x, '#c83a4a', o + 3, suelo - 12, 16, 2);
      rect(x, '#f0c040', o, suelo - 4, 22, 3);
      for (const tx of [1, 18]) elipse(x, '#ffe27a', o + tx + 1, suelo - 30, 2, 2);
    });
    // a wardrobe trunk and a tailor's dummy in a ruff
    repetir(W_MEDIO, 116, 26, (o) => {
      rect(x, '#3a3a68', o, suelo - 18, 26, 18);
      rect(x, '#5a5a98', o, suelo - 18, 26, 3);
      rect(x, '#24244a', o + 22, suelo - 18, 4, 18);
      rect(x, '#d8b050', o + 11, suelo - 14, 4, 5);
      rect(x, '#d8b050', o, suelo - 9, 26, 1);
      rect(x, '#d8b050', o + 3, suelo - 18, 1, 18);
      rect(x, '#d8b050', o + 21, suelo - 18, 1, 18);
    });
    repetir(W_MEDIO, 150, 14, (o) => {
      rect(x, '#5a3a22', o + 6, suelo - 8, 2, 8);
      rect(x, '#5a3a22', o + 2, suelo - 1, 10, 1);
      elipse(x, '#c8b8a0', o + 7, suelo - 20, 5, 9);
      rect(x, '#8a2a3a', o + 3, suelo - 26, 8, 14);
      rect(x, '#b83a4a', o + 3, suelo - 26, 2, 14);
      elipse(x, '#f4f0e6', o + 7, suelo - 28, 7, 2.5);
      for (let i = 0; i < 7; i++) rect(x, '#d8d4c8', o + 1 + i * 2, suelo - 30 + (i % 2), 1, 2);
      elipse(x, '#c8b8a0', o + 7, suelo - 32, 3, 3);
    });
    // the ghost light: a single bulb on a stand, the theatre's night lamp
    repetir(W_MEDIO, 190, 8, (o) => {
      rect(x, '#2a2230', o + 3, suelo - 26, 2, 26);
      rect(x, '#2a2230', o, suelo - 1, 8, 1);
      rect(x, '#2a2230', o + 1, suelo - 2, 6, 1);
      for (let i = 3; i >= 1; i--) {
        x.fillStyle = `rgba(255,214,130,${0.05 * (4 - i)})`;
        x.beginPath();
        x.arc(o + 4, suelo - 30, 6 + i * 6, 0, 7);
        x.fill();
      }
      elipse(x, '#fff4c8', o + 4, suelo - 30, 3.2, 3.2);
      elipse(x, '#ffffff', o + 4, suelo - 30, 1.6, 1.6);
      rect(x, '#2a2230', o + 2, suelo - 27, 4, 1);
    });
    // a ladder and a coat rack with costumes
    repetir(W_MEDIO, 224, 14, (o) => {
      linea(x, '#7a5a38', o + 1, suelo, o + 5, suelo - 34);
      linea(x, '#7a5a38', o + 12, suelo, o + 8, suelo - 34);
      for (let i = 0; i < 6; i++) {
        const yy = suelo - 4 - i * 5.5;
        const k = (suelo - yy) / 34;
        rect(x, '#a8845a', Math.round(o + 1 + 4 * k), Math.round(yy), Math.round(11 - 7 * k), 1);
      }
    });
    repetir(W_MEDIO, 252, 30, (o) => {
      rect(x, '#3a2a2e', o + 14, suelo - 34, 2, 34);
      rect(x, '#3a2a2e', o + 4, suelo - 34, 22, 2);
      rect(x, '#3a2a2e', o + 8, suelo - 1, 14, 1);
      const trajes: Array<[number, string, string]> = [[4, '#2a6a58', '#4a8a78'], [10, '#8a2a3a', '#b84a5a'], [19, '#c89a30', '#e8c060'], [24, '#3a3a88', '#5a5ab0']];
      for (const [tx, a, b] of trajes) {
        rect(x, a, o + tx, suelo - 32, 5, 20 + (tx % 3) * 2);
        rect(x, b, o + tx, suelo - 32, 1, 20 + (tx % 3) * 2);
        rect(x, '#d8c8a0', o + tx + 2, suelo - 33, 1, 2);
      }
    });
    // a stack of rolled painted canvases and a bucket of paint
    repetir(W_MEDIO, 300, 24, (o) => {
      for (let i = 0; i < 4; i++) {
        rect(x, ['#c8b898', '#a8c8d8', '#d8a8a0', '#b8c8a0'][i], o + 2 + i * 5, suelo - 30, 4, 30);
        rect(x, '#8a7a5a', o + 2 + i * 5, suelo - 30, 4, 1);
        rect(x, 'rgba(0,0,0,0.25)', o + 5 + i * 5, suelo - 30, 1, 30);
      }
      elipse(x, '#e8e0c8', o + 13, suelo - 31, 12, 2);
    });
    repetir(W_MEDIO, 340, 12, (o) => {
      rect(x, '#8a8aa8', o, suelo - 10, 11, 10);
      rect(x, '#b8b8d0', o, suelo - 10, 11, 1);
      rect(x, '#e8283a', o + 1, suelo - 12, 9, 2);
      rect(x, '#6a6a88', o + 8, suelo - 10, 3, 10);
    });
    caja(366, 24, 14);
    caja(384, 18, 22);
    // low wooden stage edge in front and a night tint over the whole layer
    rect(x, '#3a2418', 0, 38, W_MEDIO, 2);
    for (let i = 0; i < 30; i++) rect(x, 'rgba(0,0,0,0.25)', Math.floor(r() * W_MEDIO), 36 + Math.floor(r() * 3), 3, 1);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(20,10,48,0.4)';
    x.fillRect(0, 0, W_MEDIO, 40);
    return c;
  });
}

export function sueloTeatro(): HTMLCanvasElement {
  return una('fondo.teatro.suelo', () => {
    const c = lienzo(W_SUELO, ALTO_SUELO);
    const x = ctx(c);
    const r = azar(53);
    // boards in bands, darker far away and warmer near
    for (let j = 0; j < ALTO_SUELO; j++) {
      const k = j / ALTO_SUELO;
      rect(x, `rgb(${Math.round(66 + 70 * k)},${Math.round(42 + 40 * k)},${Math.round(52 + 8 * k)})`, 0, j, W_SUELO, 1);
    }
    // board seams: horizontal rows spaced by perspective, and short vertical joints
    let y = 3;
    let paso = 3;
    let fila = 0;
    while (y < ALTO_SUELO) {
      rect(x, 'rgba(10,4,16,0.5)', 0, y, W_SUELO, 1);
      rect(x, 'rgba(255,200,150,0.08)', 0, y + 1, W_SUELO, 1);
      const sep = 30 + fila * 9;
      for (let px = (fila * 37) % sep; px < W_SUELO; px += sep) rect(x, 'rgba(10,4,16,0.45)', px, y + 1, 1, Math.max(2, paso - 1));
      y += paso;
      paso = Math.min(9, paso + 0.7);
      fila++;
    }
    // the stagehands' tapes: little crosses and an L in bright colours, a snaking cable
    const cinta = (px: number, py: number, col: string, k: number) => {
      rect(x, col, px - 2 * k, py, 5 * k, 1);
      rect(x, col, px, py - 2, 1, 3 + k);
    };
    for (let i = 0; i < 16; i++) {
      const py = 18 + Math.floor(r() * (ALTO_SUELO - 24));
      cinta(Math.floor(r() * W_SUELO), py, ['#e8c030', '#e8503a', '#4ab4f0', '#6ae08a'][i % 4], 1 + Math.floor(py / 40));
    }
    let cy = 40;
    for (let px = 0; px < W_SUELO; px++) {
      cy += Math.sin(px / 23) * 0.35;
      rect(x, '#1a1420', px, Math.round(cy), 1, 2);
      rect(x, '#4a3a58', px, Math.round(cy), 1, 1);
    }
    // sawdust and a few nails, and the glow of the ghost light on the far boards
    for (let i = 0; i < 60; i++) rect(x, 'rgba(255,230,190,0.16)', Math.floor(r() * W_SUELO), 4 + Math.floor(r() * (ALTO_SUELO - 6)), 1, 1);
    for (let j = 0; j < 7; j++) {
      x.fillStyle = `rgba(90,60,130,${0.2 - j * 0.026})`;
      x.fillRect(0, j, W_SUELO, 1);
    }
    return c;
  });
}

// ---------------------------------------------------------------- «escenario»: the stage and the stalls

export function lejosEscenario(): HTMLCanvasElement {
  return una('fondo.escenario.lejos', () => {
    const c = lienzo(W_LEJOS, 64);
    const x = ctx(c);
    const r = azar(71);
    // the hall in the dark: deep wine at the top, violet at the bottom
    const sala = ['#14040e', '#190612', '#1e0816', '#240a1a', '#2a0e20', '#301226', '#36162c', '#3c1c32', '#422238'];
    sala.forEach((col, i) => rect(x, col, 0, i * 7, W_LEJOS, 7));
    // the ceiling cornice, gold, and its painted panels
    rect(x, '#5a3a14', 0, 0, W_LEJOS, 3);
    rect(x, '#c89a30', 0, 3, W_LEJOS, 1);
    rect(x, '#7a5a20', 0, 4, W_LEJOS, 1);
    for (let px = 0; px < W_LEJOS; px += 12) {
      rect(x, '#8a6a28', px, 1, 6, 1);
      rect(x, '#2a0e20', px + 6, 5, 6, 3);
    }
    // two tiers of boxes (palcos) with gold fronts and dark little figures
    const palcos = (y0: number, alto: number, col: string) => {
      rect(x, '#0e0208', 0, y0, W_LEJOS, alto);
      for (let px = 0; px < W_LEJOS; px += 30) {
        rect(x, '#1a0612', px + 2, y0 + 2, 26, alto - 4);
        rect(x, '#2a0c1e', px + 2, y0 + 2, 26, 2);
        // curtain of the box
        rect(x, '#5a1226', px + 2, y0 + 2, 5, alto - 4);
        rect(x, '#5a1226', px + 23, y0 + 2, 5, alto - 4);
        rect(x, '#7a1a34', px + 3, y0 + 2, 1, alto - 4);
        // a few spectators in the dark
        if (r() > 0.45) {
          const hx = px + 9 + Math.floor(r() * 10);
          elipse(x, '#2a1428', hx, y0 + alto - 7, 3, 3);
          rect(x, '#241022', hx - 3, y0 + alto - 5, 7, 4);
        }
        if (r() > 0.8) rect(x, '#ffd890', px + 14, y0 + 3, 2, 2);
      }
      rect(x, col, 0, y0 + alto, W_LEJOS, 2);
      rect(x, '#ffe08a', 0, y0 + alto, W_LEJOS, 1);
      for (let px = 0; px < W_LEJOS; px += 5) rect(x, '#8a6a28', px, y0 + alto - 3, 1, 3);
    };
    palcos(7, 11, '#b88a2a');
    palcos(23, 12, '#a87a24');
    // the chandelier in the middle (and a copy on the seam), crystals in warm light
    const lampara = (cx: number) => {
      const y0 = 22;
      rect(x, '#8a6a28', cx, 4, 1, y0 - 4);
      rect(x, '#c89a30', cx - 9, y0, 19, 2);
      rect(x, '#c89a30', cx - 5, y0 + 2, 11, 2);
      for (let k = -8; k <= 8; k += 3) {
        rect(x, '#ffe8a8', cx + k, y0 - 2, 1, 2);
        rect(x, 'rgba(255,230,160,0.3)', cx + k - 1, y0 - 3, 3, 2);
      }
      for (let k = -8; k <= 8; k += 2) rect(x, k % 4 ? '#e8f4ff' : '#bcd8f8', cx + k, y0 + 4 + Math.abs(k % 3), 1, 3 + Math.abs(k % 4));
      x.fillStyle = 'rgba(255,214,130,0.07)';
      x.beginPath();
      x.arc(cx, y0 + 4, 22, 0, 7);
      x.fill();
      x.fillStyle = 'rgba(255,214,130,0.09)';
      x.beginPath();
      x.arc(cx, y0 + 4, 13, 0, 7);
      x.fill();
    };
    lampara(180);
    // the stalls: rows of seat-backs getting bigger toward the front, red in the dark
    for (let fila = 0; fila < 6; fila++) {
      const y0 = 38 + fila * 4 + Math.floor(fila * fila * 0.35);
      const alto = 3 + Math.floor(fila / 2);
      const ancho = 6 + fila * 1.4;
      const t = fila / 5;
      const col = `rgb(${Math.round(58 + 34 * t)},${Math.round(12 + 6 * t)},${Math.round(28 + 8 * t)})`;
      const luz = `rgb(${Math.round(92 + 40 * t)},${Math.round(24 + 10 * t)},${Math.round(44 + 10 * t)})`;
      for (let px = 1; px < W_LEJOS; px += Math.round(ancho + 1)) {
        if (r() > 0.93) continue; // an empty gap
        elipse(x, col, px + ancho / 2, y0 + alto / 2, ancho / 2, alto / 2 + 1);
        rect(x, luz, px + 1, y0, Math.max(1, Math.round(ancho) - 2), 1);
        // some heads showing over the seats
        if (r() > 0.78 && fila > 1) {
          const hc = '#150a16';
          elipse(x, hc, px + ancho / 2, y0 - 1, 2.2, 2.4);
          rect(x, hc, px + ancho / 2 - 2, y0, 5, 2);
        }
      }
      rect(x, 'rgba(8,2,12,0.55)', 0, y0 + alto + 1, W_LEJOS, 1);
    }
    // an exit sign that glows green, and the aisle in the middle (a darker lane)
    rect(x, '#0e2a16', 308, 36, 12, 5);
    rect(x, '#5af08a', 310, 37, 8, 3);
    rect(x, '#ffffff', 311, 38, 6, 1);
    x.fillStyle = 'rgba(0,0,0,0.3)';
    x.fillRect(176, 38, 8, 26);
    // a high beam of the follow-spot crossing the dark hall
    for (let j = 0; j < 40; j++) {
      const w = 3 + j * 0.5;
      x.fillStyle = `rgba(255,236,170,${0.045})`;
      x.fillRect(Math.round(250 - j * 0.9 - w / 2), 12 + j, Math.round(w), 1);
    }
    // the near edge goes into the stage's shadow
    for (let j = 0; j < 6; j++) {
      x.fillStyle = `rgba(30,6,24,${0.1 + j * 0.1})`;
      x.fillRect(0, 58 + j, W_LEJOS, 1);
    }
    return c;
  });
}

/** Where each layer of 'escenario' begins on the screen: its curtains hang from the very top. */
export const Y_MEDIO_ESCENARIO = 0;
const ALTO_MEDIO_ESCENARIO = 66;

/** A tied-back drape of the proscenium, 60 wide, hanging from the valance to `h`: an hourglass with a gold cord. */
function cortina(x: CanvasRenderingContext2D, cx: number, h: number) {
  const tie = Math.round(h * 0.52);
  for (let j = 8; j < h; j++) {
    // half-width: wide at the top, pinched at the cord, flaring below
    const d = (j - tie) / h;
    const half = 11 + Math.round(Math.abs(d) * 34 + (j > tie ? 6 : 0) * Math.abs(d) * 2);
    const x0 = cx - half;
    const w = half * 2;
    for (let i = 0; i < w; i++) {
      const ola = Math.sin(((i - w / 2) * Math.PI) / 3.4 + Math.sin(j * 0.12) * 0.6) * 0.5 + 0.5;
      const k = 0.35 + ola * 0.65;
      const borde = Math.min(i, w - 1 - i) < 2 ? 0.7 : 1;
      rect(x, `rgb(${Math.round((96 + 108 * k) * borde)},${Math.round((10 + 20 * k) * borde)},${Math.round((24 + 22 * k) * borde)})`, x0 + i, j, 1, 1);
    }
  }
  // the gold cord with its tassel
  rect(x, '#b88a20', cx - 12, tie, 24, 3);
  rect(x, '#f0c040', cx - 12, tie, 24, 1);
  rect(x, '#ffe27a', cx - 12, tie, 24, 1);
  elipse(x, '#f0c040', cx + 13, tie + 1, 3, 3);
  rect(x, '#d89a20', cx + 12, tie + 3, 2, 3);
  for (let i = 0; i < 6; i++) {
    rect(x, i % 2 ? '#f0c040' : '#d89a20', cx + 10 + i, tie + 5 + (i % 2), 1, 8 + (i % 3));
  }
}

export function medioEscenario(): HTMLCanvasElement {
  return una('fondo.escenario.medio', () => {
    const c = lienzo(W_MEDIO, ALTO_MEDIO_ESCENARIO);
    const x = ctx(c);
    // the drapes, one every half layer (the layer is 420 wide), hanging from the valance to the stage floor
    cortina(x, 70, 56);
    cortina(x, 280, 56);
    // the valance across the top: red velvet in scallops with a gold fringe
    for (let i = 0; i < W_MEDIO; i++) {
      const ola = Math.sin(i * 0.5) * 0.5 + 0.5;
      const k = 0.4 + ola * 0.6;
      const caida = 9 + Math.round(Math.abs(Math.sin(i * 0.0749)) * 8);
      rect(x, `rgb(${Math.round(112 + 100 * k)},${Math.round(12 + 18 * k)},${Math.round(28 + 22 * k)})`, i, 0, 1, caida);
      rect(x, 'rgba(0,0,0,0.3)', i, Math.max(0, caida - 3), 1, 3);
      rect(x, '#f0c040', i, caida, 1, 1);
      if (i % 3 === 0) rect(x, '#ffe27a', i, caida + 1, 1, 2);
      if (i % 3 === 1) rect(x, '#d89a20', i, caida + 1, 1, 1);
    }
    rect(x, '#b88a20', 0, 7, W_MEDIO, 1);
    rect(x, '#ffe27a', 0, 6, W_MEDIO, 1);
    // the pit rail: dark wood with a gold top and its balusters, along the front of the stage
    const rail = 52;
    rect(x, '#12040a', 0, rail, W_MEDIO, 14);
    rect(x, '#3a1018', 0, rail + 2, W_MEDIO, 7);
    rect(x, '#c89a30', 0, rail + 1, W_MEDIO, 2);
    rect(x, '#ffe08a', 0, rail + 1, W_MEDIO, 1);
    rect(x, '#5a1a24', 0, rail + 3, W_MEDIO, 1);
    for (let px = 2; px < W_MEDIO; px += 7) {
      rect(x, '#6a2430', px, rail + 4, 3, 5);
      rect(x, '#8a3040', px, rail + 4, 1, 5);
    }
    // footlights along the stage edge
    for (let px = 10; px < W_MEDIO; px += 20) {
      for (let i = 3; i >= 1; i--) {
        x.fillStyle = `rgba(255,208,120,${0.05 * (4 - i)})`;
        x.beginPath();
        x.arc(px, rail + 11, 3 + i * 3, 0, 7);
        x.fill();
      }
      rect(x, '#5a3a1a', px - 3, rail + 12, 7, 3);
      elipse(x, '#fff0b8', px, rail + 11, 2.5, 2);
      rect(x, '#ffffff', px, rail + 10, 1, 1);
    }
    // the prompter's shell: a half-dome hood at the front of the stage, with a little cap peeking out
    const concha = (px: number) => {
      const cy = rail + 1;
      // the dome, with its ribs, and the dark mouth of the hood where the prompter sits
      elipse(x, '#e8dcc0', px + 13, cy, 13, 12);
      rect(x, '#3a1018', px - 1, cy, 28, 3);
      elipse(x, '#cdbd98', px + 13, cy, 11, 10);
      for (let i = 1; i < 4; i++) {
        const a = Math.PI + (i * Math.PI) / 4;
        linea(x, '#e8dcc0', px + 13, cy, px + 13 + Math.round(Math.cos(a) * 11), cy + Math.round(Math.sin(a) * 10));
      }
      elipse(x, '#14060a', px + 13, cy - 1, 8, 6);
      rect(x, '#3a1018', px + 4, cy, 18, 3);
      elipse(x, '#c83a2a', px + 13, cy - 3, 4.5, 2.6);
      rect(x, '#7a1a14', px + 8, cy - 2, 10, 1);
      rect(x, '#ffd0a0', px + 11, cy - 1, 4, 2);
      rect(x, '#f4f0e6', px + 17, cy - 1, 4, 3);
      rect(x, '#e8dcc0', px - 2, cy - 1 + 0, 1, 1);
    };
    concha(150);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(30,6,28,0.22)';
    x.fillRect(0, 0, W_MEDIO, ALTO_MEDIO_ESCENARIO);
    return c;
  });
}

export function sueloEscenario(): HTMLCanvasElement {
  return una('fondo.escenario.suelo', () => {
    const c = lienzo(W_SUELO, ALTO_SUELO);
    const x = ctx(c);
    const r = azar(83);
    // lacquered boards: amber in the light, wine in the shade
    for (let j = 0; j < ALTO_SUELO; j++) {
      const k = j / ALTO_SUELO;
      rect(x, `rgb(${Math.round(70 + 70 * k)},${Math.round(32 + 36 * k)},${Math.round(34 + 12 * k)})`, 0, j, W_SUELO, 1);
    }
    // the boards: rows by perspective and joints
    let y = 2;
    let paso = 3;
    let fila = 0;
    while (y < ALTO_SUELO) {
      rect(x, 'rgba(30,8,10,0.5)', 0, y, W_SUELO, 1);
      rect(x, 'rgba(255,214,160,0.1)', 0, y + 1, W_SUELO, 1);
      const sep = 38 + fila * 10;
      for (let px = (fila * 53) % sep; px < W_SUELO; px += sep) rect(x, 'rgba(30,8,10,0.45)', px, y + 1, 1, Math.max(2, paso - 1));
      y += paso;
      paso = Math.min(9, paso + 0.7);
      fila++;
    }
    // pools of spotlight, soft ellipses with a bright rim
    const foco = (cx: number, cy: number, rx: number, ry: number) => {
      for (let i = 4; i >= 1; i--) {
        x.fillStyle = `rgba(255,226,150,${0.07})`;
        x.beginPath();
        x.ellipse(cx, cy, rx * (i / 4), ry * (i / 4), 0, 0, 7);
        x.fill();
      }
      x.strokeStyle = 'rgba(255,240,190,0.3)';
      x.lineWidth = 1;
      x.beginPath();
      x.ellipse(cx, cy, rx, ry, 0, 0, 7);
      x.stroke();
    };
    foco(80, 44, 46, 11);
    foco(240, 62, 54, 14);
    foco(400, 40, 44, 10);
    // marks: a chalk X for the lead and a gold star painted in the middle
    for (const [px, py] of [[240, 62], [80, 44], [400, 40]]) {
      linea(x, 'rgba(255,255,255,0.55)', px - 3, py - 2, px + 3, py + 2);
      linea(x, 'rgba(255,255,255,0.55)', px + 3, py - 2, px - 3, py + 2);
    }
    // scuffs and shine
    for (let i = 0; i < 50; i++) rect(x, 'rgba(255,230,190,0.2)', Math.floor(r() * W_SUELO), 3 + Math.floor(r() * (ALTO_SUELO - 5)), 2 + Math.floor(r() * 5), 1);
    for (let j = 0; j < 7; j++) {
      x.fillStyle = `rgba(40,8,30,${0.34 - j * 0.045})`;
      x.fillRect(0, j, W_SUELO, 1);
    }
    return c;
  });
}

