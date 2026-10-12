// How to play, the first time a story starts in a game (docs/JUGABILIDAD.md): the one
// gesture, tried out for real over the scene. The player taps (walk, use, pick up, talk), the
// row gets its tick, and off it goes. «Saltar» skips it.
// The tap is the game's own (src/core/input.ts), so what the player learns here is exactly
// what the scene does.
import { Gestures } from '../core/input';
import { h, ICONO_MANO } from './hud';
import { texto } from '../juego/textos';

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function mostrarTutorial(parent: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const icono = h('span', { class: 'icono tocar' });
    icono.innerHTML = ICONO_MANO;
    const tocar = h('div', { class: 'paso tocar' }, icono, h('span', { class: 'que' }, h('b', {}, texto('tutorial.tocar')), ' ', texto('tutorial.tocar.que')), h('span', { class: 'hecho', 'aria-hidden': 'true' }, '✓'));
    const prueba = h('p', { class: 'prueba', role: 'status', 'aria-live': 'polite' }, texto('tutorial.prueba1'));
    const saltar = h('button', { class: 'btn fantasma saltar' }, texto('tutorial.saltar'));
    const tarjeta = h('div', { class: 'tarjeta vidrio' }, h('h2', {}, texto('tutorial.titulo')), tocar, prueba);
    const el = h('div', { class: 'cubierta tutorial' }, tarjeta, saltar);
    parent.append(el);

    let hecho = false;
    const onda = (x: number, y: number) => {
      const o = h('div', { class: 'onda', style: `left:${x}px;top:${y}px` });
      el.append(o);
      setTimeout(() => o.remove(), 600);
    };
    const acabar = () => {
      hecho = true;
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
      tap: async (p) => {
        if (hecho) return;
        hecho = true;
        onda(p.x, p.y);
        tocar.classList.add('ok');
        prueba.textContent = texto('tutorial.bien');
        await espera(1600);
        acabar();
      },
    };
  });
}
