// The Pang's screens: character select, continue and end of the game. Title, menu,
// stage select, settings, records and pause live in ui/menus.ts (re-exported here), so main.ts
// has one place to import from. Plain DOM; styles in pang.css.
import { texto } from '../juego/textos';
import { REPARTO, retrato } from '../juego/reparto';
import { PJS, type PjId } from './tipos';
import { alTeclear, boton, h, miles, mostrar } from './ui/dom';

export * from './ui/menus';

// ---------------------------------------------------------------- character select

/**
 * Four cards side by side. Tap one to choose it, «¡A jugar!» (or a second tap on the same
 * card) to confirm. Resolves the character, or null if the player goes back.
 */
export function elegirPersonaje(ui: HTMLElement, previo: PjId | null = null): Promise<PjId | null> {
  const el = h('div', { class: 'pg-pantalla pg-elegir' });
  return mostrar<PjId | null>(ui, el, (fin) => {
    let elegido: PjId | null = previo;
    const jugar = boton(texto('elegir.jugar'), () => elegido && fin(elegido), 'primario');
    const cartas = new Map<PjId, HTMLElement>();
    const marcar = () => {
      for (const [id, c] of cartas) {
        c.classList.toggle('elegida', id === elegido);
        c.setAttribute('aria-pressed', String(id === elegido));
      }
      jugar.disabled = !elegido;
    };
    for (const id of PJS) {
      const f = REPARTO[id];
      const cara = h('div', { class: 'pg-cara' });
      cara.innerHTML = retrato(id, { mood: 'happy' });
      const dato = (et: string, v: string) => h('p', { class: 'pg-dato' }, h('span', { class: 'et' }, `${et} `), h('b', {}, v));
      const carta = h(
        'button',
        { type: 'button', class: 'pg-carta', 'aria-pressed': 'false', style: `--color:${f.color}` },
        h('div', { class: 'pg-carta-cab' }, cara, h('div', {}, h('div', { class: 'pg-carta-nombre' }, f.nombre), dato(texto('elegir.paso'), texto(`pj.${id}.paso`)))),
        dato(texto('elegir.cualidad'), texto(`pj.${id}.cualidad`)),
        h('p', { class: 'pg-texto' }, texto(`pj.${id}.cualidad.texto`)),
        dato(texto('elegir.poder'), texto(`pj.${id}.poder`)),
        h('p', { class: 'pg-texto' }, texto(`pj.${id}.poder.texto`)),
      );
      carta.addEventListener('click', (e) => {
        e.stopPropagation();
        if (elegido === id) fin(id);
        else {
          elegido = id;
          marcar();
        }
      });
      cartas.set(id, carta);
    }
    el.append(h('h2', { class: 'pg-h2' }, texto('elegir.titulo')), h('div', { class: 'pg-cartas' }, ...cartas.values()), h('div', { class: 'pg-pie pg-pie-doble' }, boton(texto('menu.volver'), () => fin(null), 'fantasma'), jugar));
    marcar();
    return alTeclear((e) => {
      if (e.key === 'Escape') fin(null);
    });
  });
}

// ---------------------------------------------------------------- continue, end

export type Decision = 'si' | 'cambiar' | 'no';

/**
 * Out of lives: continue the stage (three lives, no points), change character, or leave.
 * Online (`cambiar` false) there is no changing character.
 */
export function pantallaContinuar(ui: HTMLElement, fase: number, puntos: number, cambiar = true): Promise<Decision> {
  const el = h('div', { class: 'pg-pantalla pg-continuar' });
  return mostrar<Decision>(ui, el, (fin) => {
    el.append(
      h(
        'div',
        { class: 'pg-panel pg-centro' },
        h('h2', { class: 'pg-h2 grande' }, texto('continuar.titulo')),
        h('p', { class: 'pg-texto-c' }, texto('continuar.texto', { n: fase })),
        h('p', { class: 'pg-puntos' }, texto('final.puntos', { n: miles(puntos) })),
        h('div', { class: 'pg-fila' }, boton(texto('continuar.si'), () => fin('si'), 'primario'), cambiar ? boton(texto('elegir.cambiar'), () => fin('cambiar')) : null, boton(texto('continuar.no'), () => fin('no'), 'fantasma')),
      ),
    );
  });
}

/** After the last stage and the closing conversation: FIN, thanks and the score. A tap goes on. */
export function pantallaFinal(ui: HTMLElement, puntos: number): Promise<void> {
  const el = h(
    'div',
    { class: 'pg-pantalla pg-final' },
    h('div', { class: 'pg-pila' }, h('div', { class: 'pg-pang' }, texto('final.titulo')), h('div', { class: 'pg-sub' }, texto('final.gracias')), h('div', { class: 'pg-puntos grande' }, texto('final.puntos', { n: miles(puntos) }))),
    h('div', { class: 'pg-empezar', 'aria-hidden': 'true' }, '▸'),
  );
  return mostrar<void>(ui, el, (fin) => {
    // (A tap that was meant for the last line of the conversation must not skip this at once.)
    const desde = performance.now();
    el.addEventListener('click', () => {
      if (performance.now() - desde > 600) fin();
    });
    return alTeclear((e) => {
      if ((e.key === 'Enter' || e.key === ' ') && performance.now() - desde > 600) fin();
    });
  });
}
