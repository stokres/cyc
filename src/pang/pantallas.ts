// The Pang's screens: dialogue, character select, continue and end of the game. Title, menu,
// stage select, settings, records and pause live in ui/menus.ts (re-exported here), so main.ts
// has one place to import from. Plain DOM; styles in pang.css.
import { texto, type Linea } from '../juego/textos';
import { COLOR_ACEITUNA, COLOR_SOMBRA, NOMBRE_ACEITUNA, REPARTO, retrato } from '../juego/reparto';
import { PJS, type PjId } from './tipos';
import { alTeclear, boton, h, miles, mostrar } from './ui/dom';

export * from './ui/menus';

// ---------------------------------------------------------------- dialogue

/** Mouth shape for a letter, as the main game's dialogue box does (src/ui/hud.ts). */
const VISEMA = (c: string) => ('aá'.includes(c) ? 'a' : 'oóuú'.includes(c) ? 'o' : 'eéií'.includes(c) ? 'e' : 'mbp'.includes(c) ? 'm' : c === ' ' || c === ',' || c === '.' ? 'reposo' : 'e');
/** Characters per second of the typewriter. */
const VELOCIDAD = 45;

export interface Cabecera {
  nombre: string;
  lugar: string;
}

/**
 * A conversation: the box at the bottom with the speaker's portrait, name and text. A tap
 * finishes the line, then goes to the next; «Saltar» skips the lot. Resolves at the end.
 */
export function mostrarDialogo(ui: HTMLElement, lineas: Linea[], cabecera?: Cabecera): Promise<void> {
  const caja = h('div', { class: 'pg-caja', role: 'status', 'aria-live': 'polite' });
  const saltar = boton(texto('dialogo.saltar'), () => {}, 'fantasma pg-saltar');
  const el = h('div', { class: 'pg-pantalla pg-dialogo' }, cabecera ? h('div', { class: 'pg-cabecera' }, h('b', {}, cabecera.nombre), h('span', {}, cabecera.lugar)) : null, saltar, caja);
  return mostrar<void>(ui, el, (fin) => {
    let i = -1;
    let reloj = 0;
    let escritas = 0;
    let linea: Linea | null = null;
    let ya: Text = document.createTextNode('');
    let falta: HTMLElement = h('span');
    let cara: HTMLElement | null = null;
    let clave = '';
    const pintarCara = (boca: string) => {
      if (!cara || !linea?.quien) return;
      const k = `${linea.animo}|${boca}`;
      if (k === clave) return;
      clave = k;
      const q = linea.quien;
      const animo = linea.animo ?? (q in REPARTO ? REPARTO[q as PjId].arte.INFO.defaultMood : undefined);
      cara.innerHTML = retrato(q, { mood: animo, mouthKind: boca === 'reposo' ? undefined : boca });
    };
    const escribir = (n: number) => {
      escritas = n;
      const t = linea!.texto;
      ya.data = t.slice(0, n);
      falta.textContent = t.slice(n);
      el.classList.toggle('escribiendo', n < t.length);
      pintarCara(n < t.length ? VISEMA(t[n - 1]?.toLowerCase() ?? ' ') : 'reposo');
    };
    const siguiente = () => {
      clearInterval(reloj);
      i++;
      if (i >= lineas.length) return fin();
      linea = lineas[i];
      const q = linea.quien;
      const nombre = q === null ? null : q === 'aceituna' ? NOMBRE_ACEITUNA : q === 'sombra' ? texto('nombre.sombra') : REPARTO[q].nombre;
      const color = q === null ? '' : q === 'aceituna' ? COLOR_ACEITUNA : q === 'sombra' ? COLOR_SOMBRA : REPARTO[q].color;
      caja.className = `pg-caja${q === null ? ' narrador' : ''}`;
      caja.style.setProperty('--color', color || 'var(--gold-soft)');
      cara = q === null ? null : h('div', { class: 'pg-retrato' });
      clave = '';
      ya = document.createTextNode('');
      falta = h('span', { class: 'pg-falta' });
      caja.replaceChildren(
        ...([cara, h('div', { class: 'pg-cuerpo' }, nombre ? h('div', { class: 'pg-quien' }, nombre) : null, h('p', { class: 'pg-linea' }, ya, falta)), h('span', { class: 'pg-sigue', 'aria-hidden': 'true' }, '▸')].filter(Boolean) as Node[]),
      );
      escribir(0);
      const inicio = performance.now();
      reloj = window.setInterval(() => {
        const n = Math.min(linea!.texto.length, Math.floor(((performance.now() - inicio) / 1000) * VELOCIDAD));
        if (n !== escritas) escribir(n);
        if (n >= linea!.texto.length) clearInterval(reloj);
      }, 33);
    };
    const avanzar = () => {
      if (linea && escritas < linea.texto.length) {
        clearInterval(reloj);
        escribir(linea.texto.length);
      } else siguiente();
    };
    el.addEventListener('click', avanzar);
    saltar.addEventListener('click', (e) => {
      e.stopPropagation();
      fin();
    });
    const quitar = alTeclear((e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        avanzar();
      }
    });
    siguiente();
    return () => {
      clearInterval(reloj);
      quitar();
    };
  });
}

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
        dato(texto('elegir.arma'), texto(`pj.${id}.arma`)),
        h('p', { class: 'pg-texto' }, texto(`pj.${id}.arma.texto`)),
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

/** Out of lives: continue the stage (three lives, no points), change character, or leave. */
export function pantallaContinuar(ui: HTMLElement, fase: number, puntos: number): Promise<Decision> {
  const el = h('div', { class: 'pg-pantalla pg-continuar' });
  return mostrar<Decision>(ui, el, (fin) => {
    el.append(
      h(
        'div',
        { class: 'pg-panel pg-centro' },
        h('h2', { class: 'pg-h2 grande' }, texto('continuar.titulo')),
        h('p', { class: 'pg-texto-c' }, texto('continuar.texto', { n: fase })),
        h('p', { class: 'pg-puntos' }, texto('final.puntos', { n: miles(puntos) })),
        h('div', { class: 'pg-fila' }, boton(texto('continuar.si'), () => fin('si'), 'primario'), boton(texto('elegir.cambiar'), () => fin('cambiar')), boton(texto('continuar.no'), () => fin('no'), 'fantasma')),
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
