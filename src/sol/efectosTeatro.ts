// The animations of the Teatro's enemies (the spotlight's glare, the seat's bite, the stagehand's sandbag...), of the
// three prompters of the Teatro when they are enemies, and of the summon «El apagón». Same contract as
// efectosPoderes.ts: each one is a script the fight awaits and calls `impacto` on the beat of the picture.
import { texto } from '../juego/textos';
import { chispa } from './arte';
import { anillo, cometa, globo, hoja, limitar, llama, pagina, Particulas, easeIn, easeOut } from './efectos';
import type { Donde, Escena } from './efectosPoderes';
import { linea } from './iconos';
import { ctx, lienzo, rect, una } from './pixel';
import { EFECTO_GOLPE, EFECTO_PODER, EFECTO_VIENTO, EFECTO_TELON, EFECTO_HIELO } from './sonido';

const pt = (d: Donde) => d();

/** A popcorn kernel, 4 × 4. */
const palomita = () =>
  una('fx.palomita', () => {
    const c = lienzo(4, 4);
    const x = ctx(c);
    rect(x, '#fff6d8', 0, 1, 4, 2);
    rect(x, '#fff6d8', 1, 0, 2, 4);
    rect(x, '#f0c860', 2, 2, 1, 1);
    rect(x, '#ffffff', 1, 1, 1, 1);
    return c;
  });

/** The sandbag of the flies, 14 × 18, with its rope tied. */
const saco = () =>
  una('fx.saco', () => {
    const c = lienzo(14, 18);
    const x = ctx(c);
    rect(x, '#b8955a', 1, 4, 12, 13);
    rect(x, '#b8955a', 3, 2, 8, 3);
    rect(x, '#d8b878', 1, 5, 3, 11);
    rect(x, '#7a5a30', 10, 5, 3, 12);
    rect(x, '#7a5a30', 2, 16, 10, 1);
    rect(x, '#5a4020', 4, 4, 6, 2);
    rect(x, '#8a7048', 6, 0, 2, 3);
    for (const [px, py] of [[4, 9], [8, 11], [6, 14]]) rect(x, '#8a6a3a', px, py, 2, 1);
    return c;
  });

/** A lit bulb of the stage lights, 7 × 9. */
const bombilla = (viva: boolean) =>
  una(`fx.bombilla.${viva}`, () => {
    const c = lienzo(7, 9);
    const x = ctx(c);
    rect(x, '#5a4a3a', 2, 6, 3, 3);
    rect(x, '#8a7a5a', 2, 7, 3, 1);
    rect(x, viva ? '#fff4b8' : '#4a4a58', 1, 1, 5, 6);
    rect(x, viva ? '#fff4b8' : '#4a4a58', 2, 0, 3, 8);
    if (viva) rect(x, '#ffffff', 2, 2, 2, 3);
    else rect(x, '#6a6a7a', 2, 2, 1, 3);
    return c;
  });

/** A jagged bolt from one point to another, in pixels (a different shape for every `semilla`). */
function rayo(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, semilla: number) {
  let px = x0;
  let py = y0;
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    const nx = x0 + (x1 - x0) * k + (i < n ? Math.sin(semilla * 12.9 + i * 7.1) * 9 : 0);
    const ny = y0 + (y1 - y0) * k;
    linea(g, '#8ad8ff', Math.round(px) + 1, Math.round(py), Math.round(nx) + 1, Math.round(ny));
    linea(g, '#ffffff', Math.round(px), Math.round(py), Math.round(nx), Math.round(ny));
    px = nx;
    py = ny;
  }
}

/** A beam of light as a quad from a narrow end to a wide end. */
function haz(g: CanvasRenderingContext2D, q: { x: number; y: number }, p: { x: number; y: number }, ancho: number, col: string) {
  const dx = p.x - q.x;
  const dy = p.y - q.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d;
  const ny = dx / d;
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(q.x + nx * 1.5, q.y + ny * 1.5);
  g.lineTo(p.x + nx * ancho, p.y + ny * ancho);
  g.lineTo(p.x - nx * ancho, p.y - ny * ancho);
  g.lineTo(q.x - nx * 1.5, q.y - ny * 1.5);
  g.closePath();
  g.fill();
}

/** Shoots a particle from `q` to `p` (a bit of spread, a bit of arc). */
function lanzar(e: Escena, q: { x: number; y: number }, p: { x: number; y: number }, dur: number, extra: Parameters<Escena['parts']['nueva']>[0], dispersion = 6) {
  e.parts.nueva({
    x: q.x,
    y: q.y,
    vx: (p.x - q.x) / dur + (Math.random() - 0.5) * dispersion * 4,
    vy: (p.y - q.y) / dur + (Math.random() - 0.5) * dispersion * 4 - 40 * dur,
    ay: 80,
    dura: dur,
    parpadea: false,
    ...extra,
  });
}

// ---------------------------------------------------------------- one friend

/** The enemy's own animation against one friend; false if the id is not one of these (the plain one is used). */
export async function fxEnemigoUno(id: string, e: Escena, quien: Donde, objetivo: Donde, impacto: () => void): Promise<boolean> {
  switch (id) {
    case 'deslumbron': {
      e.sonido.efecto(EFECTO_PODER, 0.6);
      await e.animar(0.95, {
        capa: 'sobre',
        eventos: [{ t: 0.4, f: () => { impacto(); e.destello('#fff6c0', 0.55, 0.22); const p = pt(objetivo); e.parts.estallido(p.x, p.y, ['#ffffff', '#ffe86a', '#ffb050'], 14, 80, 0.5); } }],
        draw: (g, t) => {
          const q = quien();
          const p = pt(objetivo);
          if (t > 0.1 && t < 0.62) {
            const k = limitar((t - 0.1) / 0.12, 0, 1);
            const f = Math.floor(t * 30) % 2 ? 1 : 0.8;
            const fin = { x: q.x + (p.x - q.x) * k, y: q.y + (p.y - q.y) * k };
            haz(g, q, fin, 11 * f, 'rgba(255,240,150,0.45)');
            haz(g, q, fin, 6 * f, 'rgba(255,255,255,0.6)');
          }
          if (t > 0.3 && t < 0.62) {
            g.fillStyle = 'rgba(255,255,255,0.6)';
            g.beginPath();
            g.arc(p.x, p.y, 7 + Math.sin(t * 60) * 2, 0, 7);
            g.fill();
          }
        },
      });
      return true;
    }
    case 'mordisco': {
      e.sonido.efecto(EFECTO_GOLPE, 0.5);
      const mordida = (t: number) => (t < 0.1 ? 0 : t < 0.3 ? (t - 0.1) / 0.2 : t < 0.36 ? 1 - (t - 0.3) / 0.06 : t < 0.48 ? (t - 0.36) / 0.12 : t < 0.55 ? 1 - (t - 0.48) / 0.07 : 0);
      await e.animar(0.8, {
        capa: 'sobre',
        eventos: [{ t: 0.36, f: () => { impacto(); const p = pt(objetivo); e.parts.estallido(p.x, p.y, ['#ffffff', '#ffd0d0', '#ff7a8a'], 10, 60, 0.4); } }],
        draw: (g, t) => {
          if (t > 0.62) return;
          const p = pt(objetivo);
          const abre = mordida(t);
          const cx = Math.round(p.x);
          const cy = Math.round(p.y);
          // upper and lower jaws with their teeth
          for (const sig of [-1, 1]) {
            const y0 = cy + sig * (1 + Math.round(abre * 9));
            rect(g, '#7a1020', cx - 12, sig < 0 ? y0 - 3 : y0, 24, 3);
            rect(g, '#c8283a', cx - 12, sig < 0 ? y0 - 3 : y0, 24, 1);
            for (let i = 0; i < 6; i++) {
              const tx = cx - 11 + i * 4;
              rect(g, '#ffffff', tx, sig < 0 ? y0 : y0 - 4, 3, 1);
              rect(g, '#ffffff', tx, sig < 0 ? y0 + 1 : y0 - 3, 2, 1);
              rect(g, '#e8e0f0', tx + (sig < 0 ? 1 : 0), sig < 0 ? y0 + 2 : y0 - 2, 1, 1);
            }
          }
        },
      });
      return true;
    }
    case 'saco': {
      e.sonido.efecto(EFECTO_GOLPE, 0.4);
      const bolsa = saco();
      await e.animar(1.0, {
        capa: 'sobre',
        eventos: [{ t: 0.5, f: () => { impacto(); e.sacudir(1.5, 0.15); const p = pt(objetivo); e.parts.estallido(p.x, p.y + 4, ['#d8b878', '#b8955a', '#ffffff'], 16, 70, 0.6); } }],
        draw: (g, t) => {
          if (t < 0.12 || t > 0.9) return;
          const p = pt(objetivo);
          const k = limitar((t - 0.12) / 0.38, 0, 1);
          const y = Math.round(-22 + (p.y - 6 + 22) * easeIn(k));
          const aplastada = t > 0.5;
          if (!aplastada) {
            rect(g, '#8a7048', Math.round(p.x) - 1, 0, 1, y);
            g.drawImage(bolsa, Math.round(p.x - 7), y);
          } else if (Math.floor(t * 20) % 2 === 0 || t < 0.75) {
            g.drawImage(bolsa, 0, 0, 14, 18, Math.round(p.x - 9), Math.round(p.y - 2), 18, 10);
          }
        },
      });
      return true;
    }
    case 'brasa': {
      e.sonido.efecto(EFECTO_PODER, 0.6);
      const bola = cometa();
      await e.animar(0.9, {
        capa: 'sobre',
        eventos: [{ t: 0.55, f: () => { impacto(); const p = pt(objetivo); e.parts.estallido(p.x, p.y, ['#ffffff', '#ffd84a', '#f08a2a', '#e8322c'], 18, 90, 0.6); } }],
        tick: (t) => {
          if (t > 0.15 && t < 0.55) {
            const q = quien();
            const p = pt(objetivo);
            const k = (t - 0.15) / 0.4;
            e.parts.nueva({ x: q.x + (p.x - q.x) * k, y: q.y + (p.y - q.y) * k - Math.sin(k * Math.PI) * 14, vy: -10, dura: 0.3, col: Math.random() > 0.5 ? '#f08a2a' : '#ffd84a', w: 2, h: 2 });
          }
        },
        draw: (g, t) => {
          if (t < 0.15 || t > 0.55) return;
          const q = quien();
          const p = pt(objetivo);
          const k = (t - 0.15) / 0.4;
          g.drawImage(bola, Math.round(q.x + (p.x - q.x) * k - 7), Math.round(q.y + (p.y - q.y) * k - Math.sin(k * Math.PI) * 14 - 7));
        },
      });
      return true;
    }
    case 'chorro': {
      e.sonido.efecto(EFECTO_HIELO, 0.5);
      await e.animar(0.9, {
        capa: 'sobre',
        eventos: [{ t: 0.5, f: () => { impacto(); const p = pt(objetivo); e.parts.estallido(p.x, p.y, ['#ffffff', '#bff0ff', '#4ab4f0'], 16, 80, 0.5); } }],
        tick: (t) => {
          if (t > 0.1 && t < 0.5) {
            const q = quien();
            const p = pt(objetivo);
            for (let i = 0; i < 3; i++) lanzar(e, q, p, 0.4, { col: i % 2 ? '#bff0ff' : '#4ab4f0', w: 2, h: 2 }, 2);
          }
        },
      });
      return true;
    }
    case 'racha': {
      e.sonido.efecto(EFECTO_VIENTO, 0.6);
      await e.animar(0.95, {
        capa: 'sobre',
        eventos: [{ t: 0.5, f: () => { impacto(); const p = pt(objetivo); e.parts.estallido(p.x, p.y, ['#e0c8ff', '#ffffff', '#a47ae8'], 14, 80, 0.5); } }],
        tick: (t) => {
          if (t > 0.1 && t < 0.5) {
            const q = quien();
            const p = pt(objetivo);
            lanzar(e, q, p, 0.4, { col: '#e0c8ff', w: 4, h: 1 }, 4);
            if (Math.random() > 0.5) lanzar(e, q, p, 0.45, { img: hoja('#a8d868') }, 5);
          }
        },
      });
      return true;
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------- every friend

/** The enemy's own animation against the whole party; false if the id is not one of these. */
export async function fxEnemigoTodos(id: string, e: Escena, quien: Donde, objetivos: Donde[], impacto: (i: number) => void): Promise<boolean> {
  const golpes = (t0: number, paso: number, cols: string[], n = 8) =>
    objetivos.map((_, i) => ({
      t: t0 + i * paso,
      f: () => {
        impacto(i);
        const p = pt(objetivos[i]);
        e.parts.estallido(p.x, p.y, cols, n, 60, 0.4);
      },
    }));
  switch (id) {
    case 'barrido': {
      e.sonido.efecto(EFECTO_PODER, 0.7);
      const n = objetivos.length;
      await e.animar(1.35, {
        capa: 'sobre',
        eventos: golpes(0.3, n > 1 ? 0.7 / (n - 1) : 0, ['#ffffff', '#ffe86a'], 8),
        draw: (g, t) => {
          if (t < 0.12 || t > 1.15) return;
          const q = quien();
          const a = pt(objetivos[0]);
          const b = pt(objetivos[n - 1]);
          const k = limitar((t - 0.2) / 0.8, 0, 1);
          const tip = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
          const f = Math.floor(t * 30) % 2 ? 1 : 0.85;
          haz(g, q, tip, 12 * f, 'rgba(255,240,150,0.42)');
          haz(g, q, tip, 6 * f, 'rgba(255,255,255,0.55)');
          g.fillStyle = 'rgba(255,255,255,0.55)';
          g.beginPath();
          g.arc(tip.x, tip.y, 8, 0, 7);
          g.fill();
        },
      });
      return true;
    }
    case 'palomitas': {
      e.sonido.efecto(EFECTO_GOLPE, 0.4);
      await e.animar(1.1, {
        capa: 'sobre',
        eventos: golpes(0.55, 0.05, ['#fff6d8', '#f0c860', '#ffffff'], 8),
        tick: (t) => {
          if (t > 0.1 && t < 0.5) {
            const q = quien();
            for (const o of objetivos) lanzar(e, q, pt(o), 0.45, { img: palomita() }, 6);
          }
        },
      });
      return true;
    }
    case 'aullido': {
      e.sonido.efecto(EFECTO_VIENTO, 0.7);
      await e.animar(1.15, {
        capa: 'sobre',
        eventos: golpes(0.55, 0.05, ['#c8f0ff', '#ffffff'], 6),
        tick: (t) => {
          if (t < 0.5 && Math.floor(t * 24) !== Math.floor((t - 0.016) * 24)) {
            const q = quien();
            for (const o of objetivos) {
              const p = pt(o);
              lanzar(e, { x: q.x, y: q.y - 6 }, p, 0.5, { col: Math.random() > 0.5 ? '#c8f0ff' : '#ffffff', w: 2, h: 2 }, 8);
            }
          }
        },
        draw: (g, t) => {
          const q = quien();
          if (t < 0.7) {
            const r = t * 120;
            anillo(g, q.x, q.y - 6, r * 0.6, r * 0.45, '#c8f0ff', 1);
            if (r > 14) anillo(g, q.x, q.y - 6, (r - 12) * 0.6, (r - 12) * 0.45, '#ffffff', 1);
          }
        },
      });
      return true;
    }
    case 'paginas': {
      e.sonido.efecto(EFECTO_VIENTO, 0.5);
      await e.animar(1.05, {
        capa: 'sobre',
        eventos: golpes(0.5, 0.05, ['#ffffff', '#e0c8ff'], 6),
        tick: (t) => {
          if (t > 0.05 && t < 0.45) {
            const q = quien();
            for (const o of objetivos) lanzar(e, q, pt(o), 0.45, { img: pagina() }, 8);
          }
        },
      });
      return true;
    }
    case 'llamarada': {
      e.sonido.efecto(EFECTO_PODER, 0.7);
      await e.animar(1.2, {
        capa: 'sobre',
        eventos: golpes(0.6, 0.05, ['#ffd84a', '#f08a2a', '#e8322c'], 10),
        draw: (g, t) => {
          if (t < 0.1 || t > 0.9) return;
          const q = quien();
          const k = limitar((t - 0.1) / 0.5, 0, 1);
          for (const o of objetivos) {
            const p = pt(o);
            for (let i = 0; i < 5; i++) {
              const kk = limitar(k - i * 0.05, 0, 1);
              if (kk <= 0 || (kk >= 1 && t > 0.75)) continue;
              g.drawImage(llama(Math.floor(t * 12) + i), Math.round(q.x + (p.x - q.x) * kk - 6), Math.round(q.y + (p.y - q.y) * kk - 12 + Math.sin(i + t * 20) * 2));
            }
          }
        },
      });
      return true;
    }
    case 'aguacero': {
      e.sonido.efecto(EFECTO_HIELO, 0.6);
      await e.animar(1.25, {
        capa: 'sobre',
        eventos: golpes(0.7, 0.05, ['#ffffff', '#bff0ff', '#4ab4f0'], 8),
        tick: (t) => {
          if (t > 0.2 && t < 0.9) {
            for (const o of objetivos) {
              const p = pt(o);
              e.parts.nueva({ x: p.x - 12 + Math.random() * 24, y: -4, vy: 180 + Math.random() * 60, dura: Math.max(0.2, (p.y + 4) / 200), col: Math.random() > 0.4 ? '#4ab4f0' : '#bff0ff', w: 1, h: 3, parpadea: false });
            }
          }
        },
        draw: (g, t) => {
          // a dark rain cloud over the party
          const k = easeOut(limitar(t / 0.3, 0, 1)) * (1 - easeIn(limitar((t - 0.95) / 0.3, 0, 1)));
          if (k <= 0) return;
          g.fillStyle = `rgba(40,56,96,${0.7 * k})`;
          for (let i = 0; i < 6; i++) {
            const p = pt(objetivos[i % objetivos.length]);
            g.beginPath();
            g.ellipse(p.x + (i % 2 ? 6 : -6), 6, 18, 6 * k, 0, 0, 7);
            g.fill();
          }
        },
      });
      return true;
    }
    case 'corriente': {
      e.sonido.efecto(EFECTO_VIENTO, 0.8);
      await e.animar(1.2, {
        capa: 'sobre',
        eventos: golpes(0.6, 0.05, ['#e0c8ff', '#ffffff'], 7),
        tick: (t) => {
          if (t < 0.9 && Math.floor(t * 40) !== Math.floor((t - 0.016) * 40)) {
            // streaks and leaves racing from the right to the left across the whole field
            for (let i = 0; i < 2; i++) {
              e.parts.nueva({ x: 250, y: 20 + Math.random() * 100, vx: -300 - Math.random() * 100, vy: (Math.random() - 0.5) * 20, dura: 0.9, col: '#e0c8ff', w: 6, h: 1, parpadea: false });
            }
            if (Math.random() > 0.5) e.parts.nueva({ x: 250, y: 30 + Math.random() * 90, vx: -260, vy: (Math.random() - 0.5) * 60, dura: 1, img: hoja('#a8d868'), parpadea: false });
          }
        },
      });
      return true;
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------- «El apagón»

/**
 * The summon of two prompters (fire and wind): the stage lights flicker and the whole theatre goes dark; the bulbs
 * pop one after another in the black, and a short circuit throws bolts at every enemy before the lights come back.
 */
export async function fxApagon(e: Escena, enemigos: Donde[], impacto: (i: number) => void) {
  const DUR = 4.4;
  const lluvia = new Particulas();
  const BOMBILLAS = 11;
  e.ocultarUI(true);
  e.sonido.efecto(EFECTO_PODER, 1);
  e.sonido.efecto(EFECTO_TELON, 0.8);
  await e.animar(DUR, {
    capa: 'tope',
    eventos: [
      { t: 2.55, f: () => { enemigos.forEach((_, i) => impacto(i)); e.sacudir(5, 0.6); e.destello('#ffffff', 0.9, 0.3); e.sonido.efecto(EFECTO_GOLPE); } },
      { t: 3.3, f: () => e.sonido.efecto(EFECTO_VIENTO, 0.7) },
    ],
    tick: (t, dt) => {
      lluvia.update(dt);
      // each bulb bursts in its turn between 1.0 and 2.3 s
      for (let i = 0; i < BOMBILLAS; i++) {
        const tb = 1 + (i * 1.25) / BOMBILLAS;
        if (t >= tb && t - dt < tb) {
          const x = 14 + i * 21;
          lluvia.estallido(x, 14, ['#ffffff', '#ffe86a', '#8ad8ff'], 8, 70, 0.45);
          e.sonido.efecto(EFECTO_GOLPE, 0.35);
        }
      }
      // sparks falling in the dark
      if (t > 1 && t < 3.2 && Math.random() > 0.6) lluvia.nueva({ x: Math.random() * 240, y: 10, vx: (Math.random() - 0.5) * 20, vy: 10, ay: 150, dura: 0.7, col: '#ffe86a', w: 1, h: 1, parpadea: true });
    },
    draw: (g, t) => {
      // the lights flicker (0–0.9), then it is dark, then it comes back (3.1–4.4)
      let oscuro = 0;
      if (t < 0.9) oscuro = Math.floor(t * 14) % 2 ? 0.25 + t * 0.4 : 0.08;
      else if (t < 3.1) oscuro = 0.92;
      else oscuro = 0.92 * (1 - limitar((t - 3.1) / 1.2, 0, 1)) * (Math.floor(t * 18) % 3 === 0 ? 0.6 : 1);
      g.fillStyle = `rgba(2,2,16,${oscuro})`;
      g.fillRect(0, 0, 240, 160);
      // the row of bulbs along the top
      const apagadas = oscuro > 0.5;
      for (let i = 0; i < BOMBILLAS; i++) {
        const tb = 1 + (i * 1.25) / BOMBILLAS;
        const viva = t < tb;
        if (t > 3.6 && !viva) continue;
        if (t > 0.9 && t < 3.1 && !viva && Math.floor(t * 20 + i) % 6) continue;
        g.drawImage(bombilla(viva || !apagadas), 11 + i * 21, 4);
        if (viva && !apagadas) {
          g.fillStyle = 'rgba(255,230,150,0.12)';
          g.beginPath();
          g.arc(14 + i * 21, 9, 9, 0, 7);
          g.fill();
        }
      }
      // short circuit: bolts from the top to every enemy
      if (t > 2.4 && t < 3.0) {
        enemigos.forEach((d, i) => {
          const p = d();
          const f = Math.floor(t * 30) + i;
          if (f % 3 === 2) return;
          rayo(g, 14 + ((i * 53) % 210), 10, Math.round(p.x), Math.round(p.y), f * 0.37 + i);
          g.drawImage(chispa('#ffffff'), Math.round(p.x - 2), Math.round(p.y - 8));
        });
      }
      lluvia.dibujar(g);
      if (t > 0.35 && t < 1.2) globo(g, texto('efecto.apagon'), 120, 56);
    },
  });
  e.ocultarUI(false);
}
