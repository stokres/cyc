// The animations of the boss: the attacks that rewrite the scene (a crossed-out friend, a change of script that
// swaps the set, an eye in the sky, the ending told in advance, the fade to black, the eraser), his change of
// shape, and the big typed line of the script («Y entonces los cuatro perdieron»). Same contract as
// efectosPoderes.ts: scripts the fight awaits, `impacto` called on the beat.
import { chispa } from './arte';
import { anillo, globo, limitar, easeIn, easeOut, pagina, Particulas } from './efectos';
import type { Donde, Escena } from './efectosPoderes';
import { texto } from '../juego/textos';
import { escribir, partir, anchoTexto } from './fuente';
import { linea } from './iconos';
import { paginaGrande } from './jefeArte';
import { ctx, lienzo, rect, una } from './pixel';
import { EFECTO_GOLPE, EFECTO_PODER, EFECTO_TELON, EFECTO_TRANSFORMA, EFECTO_VIENTO } from './sonido';

const pt = (d: Donde) => d();

/** A thick pen stroke of ink between two points. */
function trazo(g: CanvasRenderingContext2D, col: string, x0: number, y0: number, x1: number, y1: number, ancho = 3) {
  for (let i = 0; i < ancho; i++) linea(g, col, Math.round(x0) + i - 1, Math.round(y0), Math.round(x1) + i - 1, Math.round(y1));
}

// ---------------------------------------------------------------- big script text

/** The text broken for the biggest scale (up to 3) that keeps it in four lines on the 240 px screen. */
function disponer(s: string): { lineas: string[]; k: number } {
  for (const k of [3, 2, 1]) {
    const lineas = partir(s, Math.floor(224 / k));
    if (lineas.length <= 4 || k === 1) return { lineas, k };
  }
  return { lineas: [s], k: 1 };
}

/** The first `n` letters of a text, drawn big and centred at (cx, cy) with a hard shadow. Cached by picture. */
export function textoGrande(g: CanvasRenderingContext2D, s: string, n: number, cx: number, cy: number, col = '#ffffff', sombra = '#3a0a1a', kForzada = 0) {
  const d = disponer(s);
  const k = kForzada || d.k;
  const lineas = kForzada ? partir(s, Math.floor(224 / kForzada)) : d.lineas;
  const alto = lineas.length * 11;
  const ancho = Math.max(...lineas.map(anchoTexto)) + 2;
  const pic = una(`jefe.grande.${col}.${sombra}.${n}.${k}.${s}`, () => {
    const c = lienzo(ancho, alto + 2);
    const x = ctx(c);
    let restante = n;
    lineas.forEach((l, j) => {
      const letras = [...l];
      const cuantas = Math.min(letras.length, Math.max(0, restante));
      restante -= letras.length + 1;
      escribir(x, letras.slice(0, cuantas).join(''), Math.floor((ancho - anchoTexto(l)) / 2), j * 11, col, sombra);
    });
    return c;
  });
  g.drawImage(pic, 0, 0, ancho, alto + 2, Math.round(cx - (ancho * k) / 2), Math.round(cy - (alto * k) / 2), ancho * k, (alto + 2) * k);
}

/** Where the last revealed letter of the same text ends (for a quill that writes it): the point on the screen. */
export function puntaTexto(s: string, n: number, cx: number, cy: number, kForzada = 0): { x: number; y: number } {
  const d = disponer(s);
  const k = kForzada || d.k;
  const lineas = kForzada ? partir(s, Math.floor(224 / kForzada)) : d.lineas;
  const alto = lineas.length * 11;
  const ancho = Math.max(...lineas.map(anchoTexto)) + 2;
  let restante = Math.min(n, [...s].length);
  for (let j = 0; j < lineas.length; j++) {
    const letras = [...lineas[j]];
    if (restante <= letras.length || j === lineas.length - 1) {
      const w = anchoTexto(letras.slice(0, Math.max(0, Math.min(letras.length, restante))).join(''));
      const total = anchoTexto(lineas[j]);
      return { x: cx - (ancho * k) / 2 + (Math.floor((ancho - total) / 2) + w) * k, y: cy - (alto * k) / 2 + (j * 11 + 8) * k };
    }
    restante -= letras.length + 1;
  }
  return { x: cx, y: cy };
}

/** How many letters the big text has (to know when it is all there). */
export const letrasDe = (s: string) => [...s].length;

// ---------------------------------------------------------------- the eye in the sky

const ojoCielo = () =>
  una('jefe.ojo', () => {
    const c = lienzo(76, 34);
    const x = ctx(c);
    const rx = 36;
    const ry = 15;
    for (let i = -rx; i <= rx; i++) {
      const h = Math.round(Math.sqrt(Math.max(0, 1 - (i / rx) ** 2)) * ry);
      rect(x, '#f4f0e6', 38 + i, 17 - h, 1, h * 2);
      rect(x, '#d8c8c0', 38 + i, 17 - h, 1, 2);
      rect(x, '#d8c8c0', 38 + i, 17 + h - 2, 1, 2);
    }
    // red veins
    for (const [vx, vy, l] of [[8, 14, 8], [10, 22, 7], [64, 12, 7], [62, 21, 8], [20, 8, 5], [54, 27, 5]]) {
      for (let j = 0; j < l; j++) rect(x, '#e8627a', vx + j * (vx < 38 ? 1 : -1), vy + (j % 2), 1, 1);
    }
    // iris and slit pupil
    for (let j = -12; j <= 12; j++) {
      const w = Math.round(Math.sqrt(144 - j * j) * 0.95);
      rect(x, '#d8a828', 38 - w, 17 + j, w * 2, 1);
      if (Math.abs(j) < 10) rect(x, '#ffe27a', 38 - Math.round(w * 0.7), 17 + j, Math.round(w * 1.4), 1);
    }
    rect(x, '#0a0616', 36, 7, 5, 20);
    rect(x, '#0a0616', 35, 11, 7, 12);
    rect(x, '#ffffff', 33, 10, 2, 2);
    // dark lid lines
    for (let i = -rx; i <= rx; i++) {
      const h = Math.round(Math.sqrt(Math.max(0, 1 - (i / rx) ** 2)) * ry);
      rect(x, '#2a1a44', 38 + i, 16 - h, 1, 1);
      rect(x, '#2a1a44', 38 + i, 18 + h - 1, 1, 1);
    }
    return c;
  });

// ---------------------------------------------------------------- the attacks

/** The boss's own animation against one friend; false if the id is not one of these. */
export async function fxJefeUno(id: string, e: Escena, quien: Donde, objetivo: Donde, impacto: () => void): Promise<boolean> {
  switch (id) {
    case 'tachon': {
      e.sonido.efecto(EFECTO_PODER, 0.8);
      await e.animar(1.15, {
        capa: 'sobre',
        eventos: [{ t: 0.32, f: () => { impacto(); e.sacudir(2, 0.2); const p = pt(objetivo); e.parts.estallido(p.x, p.y, ['#e8322c', '#7a0e1c', '#ffffff'], 18, 90, 0.6); } }],
        draw: (g, t) => {
          const p = pt(objetivo);
          const q = quien();
          // the quill flies in and scribbles a big red cross over the friend, then the ink stays a moment
          const k1 = limitar((t - 0.1) / 0.14, 0, 1);
          const k2 = limitar((t - 0.26) / 0.14, 0, 1);
          if (t > 0.05 && t < 0.3 && k1 < 1) {
            rect(g, '#f4f0e6', Math.round(q.x + (p.x - q.x) * k1 - 2), Math.round(q.y + (p.y - q.y) * k1 - 6), 2, 8);
          }
          if (t > 0.9 && Math.floor(t * 20) % 2) return;
          if (t < 1.05) {
            trazo(g, '#e8322c', p.x - 14, p.y - 16, p.x - 14 + 28 * k1, p.y - 16 + 32 * k1, 3);
            if (k1 > 0.5) trazo(g, '#a01626', p.x - 13, p.y - 15, p.x - 13 + 26 * k1, p.y - 15 + 30 * k1, 1);
            if (k2 > 0) trazo(g, '#e8322c', p.x + 14, p.y - 16, p.x + 14 - 28 * k2, p.y - 16 + 32 * k2, 3);
          }
        },
      });
      return true;
    }
    case 'omnisciente': {
      e.sonido.efecto(EFECTO_TELON, 0.8);
      const ojo = ojoCielo();
      await e.animar(1.7, {
        capa: 'tope',
        eventos: [{ t: 0.95, f: () => { impacto(); e.sacudir(3, 0.25); e.destello('#fff0d0', 0.5, 0.2); const p = pt(objetivo); e.parts.estallido(p.x, p.y, ['#ffffff', '#ffe27a', '#e8322c'], 18, 90, 0.6); } }],
        draw: (g, t) => {
          const entra = easeOut(limitar(t / 0.25, 0, 1)) * (1 - easeIn(limitar((t - 1.4) / 0.3, 0, 1)));
          g.fillStyle = `rgba(20,4,40,${0.45 * entra})`;
          g.fillRect(0, 0, 240, 160);
          const abre = limitar((t - 0.15) / 0.4, 0, 1) * (1 - limitar((t - 1.35) / 0.25, 0, 1));
          const h = Math.max(1, Math.round(34 * abre));
          if (abre > 0.02) g.drawImage(ojo, 0, 0, 76, 34, 82, 6 + Math.round((34 - h) / 2), 76, h);
          if (t > 0.6 && t < 1.25) {
            const p = pt(objetivo);
            const k = limitar((t - 0.6) / 0.35, 0, 1);
            const f = Math.floor(t * 30) % 2 ? 1 : 0.7;
            g.fillStyle = 'rgba(255,60,90,0.4)';
            g.beginPath();
            g.moveTo(116, 24);
            g.lineTo(124, 24);
            g.lineTo(p.x + (6 * f) + 0, p.y);
            g.lineTo(p.x - 6 * f, p.y);
            g.closePath();
            g.globalAlpha = k;
            g.fill();
            g.fillStyle = 'rgba(255,255,255,0.6)';
            g.beginPath();
            g.moveTo(118, 24);
            g.lineTo(122, 24);
            g.lineTo(p.x + 2, p.y);
            g.lineTo(p.x - 2, p.y);
            g.closePath();
            g.fill();
            g.globalAlpha = 1;
          }
        },
      });
      return true;
    }
    case 'elipsis': {
      e.sonido.efecto(EFECTO_PODER, 0.6);
      await e.animar(1.2, {
        capa: 'sobre',
        eventos: [{ t: 0.8, f: () => { impacto(); const p = pt(objetivo); e.parts.estallido(p.x, p.y, ['#a47ae8', '#ffffff', '#ffe27a'], 10, 60, 0.5); } }],
        draw: (g, t) => {
          const q = quien();
          const p = pt(objetivo);
          // three black dots with a yellow rim pop over his head, one after the other, and fly to the friend
          for (let i = 0; i < 3; i++) {
            const t0 = 0.1 + i * 0.12;
            if (t < t0) continue;
            const k = limitar((t - 0.5 - i * 0.07) / 0.3, 0, 1);
            if (k >= 1) continue;
            const x = q.x - 8 + i * 8 + (p.x - (q.x - 8 + i * 8)) * k;
            const y = q.y - 30 + (p.y - (q.y - 30)) * k - Math.sin(k * Math.PI) * 10;
            const r = 3 + (t - t0 < 0.08 ? 1 : 0);
            g.fillStyle = '#ffe27a';
            g.fillRect(Math.round(x) - r, Math.round(y) - r, r * 2, r * 2);
            g.fillStyle = '#120c22';
            g.fillRect(Math.round(x) - r + 1, Math.round(y) - r + 1, r * 2 - 2, r * 2 - 2);
          }
        },
      });
      return true;
    }
    case 'spoiler': {
      e.sonido.efecto(EFECTO_VIENTO, 0.6);
      await e.animar(1.3, {
        capa: 'sobre',
        eventos: [{ t: 0.85, f: () => { impacto(); e.sacudir(2, 0.2); const p = pt(objetivo); e.parts.estallido(p.x, p.y, ['#ffffff', '#ff5a5a', '#ffd0d0'], 16, 90, 0.5); } }],
        draw: (g, t) => {
          const q = quien();
          const p = pt(objetivo);
          if (t > 0.1 && t < 0.75) globo(g, texto('efecto.spoiler'), Math.round(q.x), Math.round(q.y - 42));
          if (t > 0.65 && t < 1.0) {
            const k = limitar((t - 0.65) / 0.12, 0, 1);
            const f = t < 0.9 ? '#ffffff' : '#ff8a8a';
            trazo(g, f, q.x, q.y - 10, q.x + (p.x - q.x) * k, q.y - 10 + (p.y - q.y) * k, 3);
          }
        },
      });
      return true;
    }
    case 'borron': {
      e.sonido.efecto(EFECTO_GOLPE, 0.6);
      await e.animar(1.15, {
        capa: 'sobre',
        eventos: [{ t: 0.45, f: () => { impacto(); const p = pt(objetivo); e.parts.estallido(p.x, p.y, ['#ff8aa8', '#ffc0d0', '#ffffff'], 16, 70, 0.6); } }],
        draw: (g, t) => {
          if (t < 0.12 || t > 1.0) return;
          const p = pt(objetivo);
          // a giant eraser rubs back and forth over the friend, leaving a pale smear
          const k = limitar((t - 0.12) / 0.6, 0, 1);
          const dx = Math.sin(k * Math.PI * 3.5) * 18;
          const x = Math.round(p.x + dx - 12);
          const y = Math.round(p.y - 8 - Math.sin(k * Math.PI) * 4);
          if (t > 0.3) {
            g.fillStyle = 'rgba(255,240,250,0.35)';
            g.fillRect(Math.round(p.x - 20), Math.round(p.y - 16), 40, 32);
          }
          rect(g, '#ff8aa8', x, y, 24, 14);
          rect(g, '#ffc0d0', x, y, 24, 2);
          rect(g, '#c85a7a', x + 22, y, 2, 14);
          rect(g, '#4a7ae8', x, y + 5, 24, 4);
          rect(g, '#8ab4ff', x, y + 5, 24, 1);
          rect(g, '#2a2a58', x, y + 14, 24, 1);
        },
        tick: (t) => {
          if (t > 0.2 && t < 0.75 && Math.random() > 0.5) {
            const p = pt(objetivo);
            e.parts.nueva({ x: p.x + (Math.random() - 0.5) * 30, y: p.y, vx: (Math.random() - 0.5) * 30, vy: -20, ay: 120, dura: 0.5, col: Math.random() > 0.5 ? '#ff8aa8' : '#ffc0d0', w: 2, h: 1 });
          }
        },
      });
      return true;
    }
    default:
      return false;
  }
}

/** A page turning over the whole screen: `borde` goes from 240 (nothing covered) to 0 (all covered), the page coming from the right. */
function paginaPasa(g: CanvasRenderingContext2D, borde: number) {
  if (borde >= 240) return;
  const b = Math.max(0, Math.round(borde));
  g.fillStyle = '#f0ead8';
  g.fillRect(b, 0, 240 - b, 160);
  // the curl: a darker strip that grows toward the edge, and a highlight
  rect(g, '#d8d0bc', b, 0, 8, 160);
  rect(g, '#b8b0a0', b, 0, 2, 160);
  rect(g, '#fffaf0', b + 10, 0, 2, 160);
  // faint lines of text
  g.fillStyle = 'rgba(90,90,140,0.35)';
  for (let j = 0; j < 14; j++) g.fillRect(Math.max(b + 16, 20), 12 + j * 10, Math.max(0, 200 - ((j * 37) % 70)), 2);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(Math.max(0, b - 3), 0, 3, 160);
  g.fillStyle = 'rgba(0,0,0,0.1)';
  g.fillRect(Math.max(0, b - 7), 0, 4, 160);
}

/** The attacks of the boss against everybody; false if the id is not one of these. */
export async function fxJefeTodos(id: string, e: Escena, _quien: Donde, objetivos: Donde[], impacto: (i: number) => void, fondoAjeno: Array<'campo' | 'teatro' | 'escenario'> = ['campo']): Promise<boolean> {
  const golpes = (t0: number, paso: number, cols: string[]) =>
    objetivos.map((_, i) => ({
      t: t0 + i * paso,
      f: () => {
        impacto(i);
        const p = pt(objetivos[i]);
        e.parts.estallido(p.x, p.y, cols, 10, 70, 0.45);
      },
    }));
  switch (id) {
    case 'cambio': {
      // «Cambio de guion»: a page turns, the set is another, everybody is hit, and a page turns back
      e.sonido.efecto(EFECTO_TELON, 0.9);
      const otro = fondoAjeno[0];
      await e.animar(2.1, {
        capa: 'tope',
        eventos: [
          { t: 0.38, f: () => e.fondo?.(otro) },
          ...golpes(0.9, 0.05, ['#ffffff', '#ffe27a', '#f4f0e6']),
          { t: 0.9, f: () => { e.sacudir(3, 0.3); e.destello('#fffaf0', 0.5, 0.2); } },
          { t: 1.68, f: () => e.fondo?.(null) },
        ],
        draw: (g, t) => {
          let borde = 240;
          if (t < 0.38) borde = 240 - 240 * easeIn(limitar(t / 0.38, 0, 1));
          else if (t < 0.75) borde = -240 * easeOut(limitar((t - 0.38) / 0.37, 0, 1));
          else if (t > 1.3 && t < 1.68) borde = 240 - 240 * easeIn(limitar((t - 1.3) / 0.38, 0, 1));
          else if (t >= 1.68) borde = -240 * easeOut(limitar((t - 1.68) / 0.37, 0, 1));
          // in the first half the page covers from the right (edge going left); in the reveal it leaves to the left
          if (t < 0.38 || (t > 1.3 && t < 1.68)) paginaPasa(g, borde);
          else if ((t >= 0.38 && t < 0.75) || t >= 1.68) {
            const k = limitar(t < 0.75 ? (t - 0.38) / 0.37 : (t - 1.68) / 0.37, 0, 1);
            // the page sweeps off to the left: it covers from x=0 to a shrinking width
            const w = Math.round(240 * (1 - easeOut(k)));
            if (w > 0) {
              g.fillStyle = '#f0ead8';
              g.fillRect(0, 0, w, 160);
              rect(g, '#d8d0bc', Math.max(0, w - 8), 0, 8, 160);
              rect(g, '#b8b0a0', Math.max(0, w - 2), 0, 2, 160);
              g.fillStyle = 'rgba(0,0,0,0.25)';
              g.fillRect(w, 0, 3, 160);
            }
          }
        },
      });
      e.fondo?.(null);
      return true;
    }
    case 'final': {
      // «Final alternativo»: a rain of pages, the screen turns negative for an instant, everybody is hit
      e.sonido.efecto(EFECTO_VIENTO, 0.8);
      const lluvia = new Particulas();
      await e.animar(1.8, {
        capa: 'tope',
        eventos: [
          ...golpes(0.95, 0.05, ['#ffffff', '#e0c8ff', '#f4f0e6']),
          { t: 0.95, f: () => { e.sacudir(4, 0.4); e.sonido.efecto(EFECTO_GOLPE); } },
        ],
        tick: (t, dt) => {
          lluvia.update(dt);
          if (t < 1.1) for (let i = 0; i < 3; i++) lluvia.nueva({ x: Math.random() * 240, y: -10, vx: (Math.random() - 0.5) * 40, vy: 110 + Math.random() * 90, dura: 1.6, img: paginaGrande(Math.floor(Math.random() * 3)), parpadea: false });
        },
        draw: (g, t) => {
          g.fillStyle = `rgba(30,8,50,${0.5 * easeOut(limitar(t / 0.3, 0, 1)) * (1 - limitar((t - 1.4) / 0.4, 0, 1))})`;
          g.fillRect(0, 0, 240, 160);
          lluvia.dibujar(g);
          if (t > 0.5 && t < 0.62) {
            g.globalCompositeOperation = 'difference';
            g.fillStyle = '#ffffff';
            g.fillRect(0, 0, 240, 160);
            g.globalCompositeOperation = 'source-over';
          }
        },
      });
      return true;
    }
    case 'fundido': {
      // «Fundido a negro»: the screen closes like an iris down to a point, and everybody is hit in the dark
      e.sonido.efecto(EFECTO_TELON, 0.8);
      await e.animar(1.9, {
        capa: 'tope',
        eventos: [...golpes(0.95, 0.06, ['#ffffff', '#a47ae8']), { t: 0.95, f: () => e.sacudir(3, 0.3) }],
        draw: (g, t) => {
          const R = 190;
          const r = t < 0.7 ? R * (1 - easeIn(limitar(t / 0.7, 0, 1))) : t < 1.15 ? 0 : R * easeOut(limitar((t - 1.15) / 0.7, 0, 1));
          g.fillStyle = '#000';
          g.beginPath();
          g.rect(0, 0, 240, 160);
          if (r > 1) g.arc(120, 70, r, 0, Math.PI * 2, true);
          g.fill('evenodd');
          // the friends stay lit by a ring of light while it is dark
          if (r < 40 && t > 0.7 && t < 1.2) {
            for (const o of objetivos) {
              const p = pt(o);
              g.drawImage(chispa('#ffffff'), Math.round(p.x - 2), Math.round(p.y - 14));
            }
          }
        },
      });
      return true;
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------- the change of shape

/**
 * The boss is cornered and changes: his pages whirl in, a column of light, a flash at the moment the picture is
 * swapped (`cambiar`), and a shock wave with the pages thrown out again.
 */
export async function fxTransformar(e: Escena, quien: Donde, cambiar: () => void) {
  const DUR = 3.2;
  const lluvia = new Particulas();
  e.ocultarUI(true);
  e.sonido.efecto(EFECTO_TRANSFORMA, 1);
  await e.animar(DUR, {
    capa: 'tope',
    eventos: [
      { t: 1.7, f: () => { cambiar(); e.destello('#ffffff', 1, 0.5); e.sacudir(5, 0.7); const q = quien(); lluvia.estallido(q.x, q.y - 20, ['#ffffff', '#ffe27a', '#e0c8ff', '#ff5a6a'], 40, 150, 1); } },
    ],
    tick: (t, dt) => {
      lluvia.update(dt);
      if (t > 0.3 && t < 1.7 && Math.floor(t * 30) !== Math.floor((t - dt) * 30)) e.sacudir(0.6 + t, 0.08);
    },
    draw: (g, t) => {
      const q = quien();
      const cy = q.y - 4;
      const entra = easeOut(limitar(t / 0.5, 0, 1)) * (1 - limitar((t - 2.6) / 0.6, 0, 1));
      g.fillStyle = `rgba(14,2,30,${0.6 * entra})`;
      g.fillRect(0, 0, 240, 160);
      // the column of light from the sky, widening until the flash
      if (t < 1.8) {
        const w = 4 + Math.round(18 * limitar((t - 0.3) / 1.4, 0, 1));
        g.fillStyle = `rgba(255,236,200,${0.25 + 0.2 * Math.sin(t * 30)})`;
        g.fillRect(Math.round(q.x - w / 2), 0, w, 160);
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.fillRect(Math.round(q.x - w / 4), 0, Math.max(1, Math.round(w / 2)), 160);
      }
      // pages whirling into him (before the flash) and rings out (after it)
      if (t < 1.7) {
        const k = limitar((t - 0.2) / 1.5, 0, 1);
        for (let i = 0; i < 14; i++) {
          const a = i * 0.45 + t * (6 + k * 8);
          const r = (70 - 62 * k) * (0.6 + 0.4 * ((i * 7) % 5) / 4);
          const x = q.x + Math.cos(a) * r;
          const y = cy - 12 + Math.sin(a) * r * 0.45;
          g.drawImage(i % 3 === 0 ? paginaGrande(1) : pagina(), Math.round(x - 3), Math.round(y - 3));
        }
      } else {
        const u = t - 1.7;
        const r = u * 190;
        if (u < 1) {
          anillo(g, q.x, cy - 12, r, r * 0.55, '#ffffff', 2);
          if (r > 12) anillo(g, q.x, cy - 12, r - 10, (r - 10) * 0.55, '#ff5a6a', 2);
          if (r > 26) anillo(g, q.x, cy - 12, r - 22, (r - 22) * 0.55, '#ffe27a', 1);
        }
      }
      lluvia.dibujar(g);
    },
  });
  e.ocultarUI(false);
}
