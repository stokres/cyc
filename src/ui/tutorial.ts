// How to play, the first time a story starts in a game (docs/JUGABILIDAD.md): the two
// gestures, tried out for real over the scene. A tap first (walk, use, pick up, talk), then
// holding the finger down until the ring fills (look). Then off it goes. «Saltar» skips it.
// The gestures are the game's own (src/core/input.ts), so what the player learns here is
// exactly what the scene does: the same timings, and the same ring.
import { Gestures } from '../core/input';
import { h, ICONO_MANO } from './hud';
import { texto } from '../juego/textos';

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The ring that fills while the finger is held down (the scene's .anillo, same look). */
function anillo() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'anillo');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.innerHTML = '<circle class="pista" cx="32" cy="32" r="26"/><circle class="lleno" cx="32" cy="32" r="26" pathLength="100" stroke-dasharray="0 100"/>';
  svg.style.display = 'none';
  return svg;
}

export function mostrarTutorial(parent: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const fila = (clase: string, gesto: string, que: string) => {
      const icono = h('span', { class: `icono ${clase}` });
      // Holding: a ring fills round the finger, over and over.
      icono.innerHTML = ICONO_MANO + (clase === 'mantener' ? '<svg class="aro" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" pathLength="100"/></svg>' : '');
      return h('div', { class: `paso ${clase}` }, icono, h('span', { class: 'que' }, h('b', {}, gesto), ' ', que), h('span', { class: 'hecho', 'aria-hidden': 'true' }, '✓'));
    };
    const tocar = fila('tocar', texto('tutorial.tocar'), texto('tutorial.tocar.que'));
    const mantener = fila('mantener', texto('tutorial.mantener'), texto('tutorial.mantener.que'));
    const prueba = h('p', { class: 'prueba', role: 'status', 'aria-live': 'polite' }, texto('tutorial.prueba1'));
    const saltar = h('button', { class: 'btn fantasma saltar' }, texto('tutorial.saltar'));
    const tarjeta = h('div', { class: 'tarjeta vidrio' }, h('h2', {}, texto('tutorial.titulo')), tocar, mantener, prueba);
    const ring = anillo();
    const el = h('div', { class: 'cubierta tutorial' }, tarjeta, saltar, ring);
    parent.append(el);

    let paso: 'tocar' | 'mantener' | 'fin' = 'tocar';
    const decir = (clave: string, aviso = false) => {
      prueba.textContent = texto(clave);
      prueba.classList.toggle('otra', aviso);
      if (aviso) {
        prueba.classList.remove('sacude');
        void prueba.offsetWidth;
        prueba.classList.add('sacude');
      }
    };
    const onda = (x: number, y: number) => {
      const o = h('div', { class: 'onda', style: `left:${x}px;top:${y}px` });
      el.append(o);
      setTimeout(() => o.remove(), 600);
    };
    const acabar = () => {
      paso = 'fin';
      el.classList.add('sale');
      setTimeout(() => {
        el.remove();
        resolve();
      }, 350);
    };
    saltar.addEventListener('click', (e) => {
      e.stopPropagation();
      acabar();
    });

    const gestos = new Gestures(el);
    gestos.handlers = {
      tap: (p) => {
        if (paso === 'fin') return;
        onda(p.x, p.y);
        if (paso === 'tocar') {
          paso = 'mantener';
          tocar.classList.add('ok');
          decir('tutorial.prueba2');
        } else decir('tutorial.corto', true);
      },
      longPress: async (p) => {
        if (paso === 'fin') return;
        onda(p.x, p.y);
        if (paso === 'tocar') return decir('tutorial.largo', true);
        paso = 'fin';
        mantener.classList.add('ok');
        decir('tutorial.bien');
        await espera(1600);
        acabar();
      },
      pressProgress: (p, t) => {
        if (!p || paso === 'fin') {
          ring.style.display = 'none';
          return;
        }
        ring.style.display = 'block';
        ring.style.left = `${p.x}px`;
        ring.style.top = `${p.y}px`;
        ring.querySelector('.lleno')!.setAttribute('stroke-dasharray', `${(t * 100).toFixed(1)} 100`);
      },
    };
  });
}
