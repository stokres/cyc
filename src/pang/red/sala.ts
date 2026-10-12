// The online lobby (docs/PANG-ONLINE.md): password screen, then the room where everybody picks a
// character and the host starts. Plain DOM, same look as the menus (styles in ../pang.css).
import { storageGet, storageSet } from '../../core/util';
import { REPARTO, retrato } from '../../juego/reparto';
import { texto } from '../../juego/textos';
import { PJS, type PjId } from '../tipos';
import { boton, h, mostrar } from '../ui/dom';
import { Conexion } from './conexion';

/** What the lobby hands over when the host starts: the connection stays open for the game. */
export interface SalaLista {
  con: Conexion;
  /** My id in the room. */
  yo: number;
  anfitrion: boolean;
  /** Only the players who picked a character, in id order. */
  jugadores: { id: number; pj: PjId }[];
}

const CLAVE_GUARDADA = 'cyc.pang.clave';

/**
 * Password, then the room. Resolves with the room once the host starts the game, or null if the
 * player goes back (or leaves the room). The connection is closed in the null case.
 */
export function pantallaOnline(ui: HTMLElement): Promise<SalaLista | null> {
  const el = h('div', { class: 'pg-pantalla pg-online' });
  return mostrar<SalaLista | null>(ui, el, (fin) => {
    let con: Conexion | null = null;
    /** Stops what the current screen listens to (server messages, keys). */
    let soltar: Array<() => void> = [];
    let vivo = true;

    const dejarDeEscuchar = () => {
      for (const f of soltar) f();
      soltar = [];
    };
    const salir = () => {
      dejarDeEscuchar();
      con?.cerrar();
      con = null;
      fin(null);
    };

    // ------------------------------------------------------------ screen 1: password

    const verClave = (aviso = '') => {
      dejarDeEscuchar();
      con?.cerrar();
      con = null;
      const campo = h('input', {
        type: 'text',
        class: 'pg-campo',
        value: storageGet(CLAVE_GUARDADA) ?? '',
        maxlength: '64',
        autocomplete: 'off',
        autocapitalize: 'none',
        spellcheck: 'false',
        enterkeyhint: 'go',
        'aria-label': texto('online.clave'),
        placeholder: texto('online.clave'),
      });
      const avisoEl = h('p', { class: 'pg-aviso', role: 'alert' }, aviso);
      const entrar = boton(texto('online.entrar'), () => void intentar(), 'primario');
      const intentar = async () => {
        if (entrar.disabled) return;
        entrar.disabled = true;
        avisoEl.textContent = texto('online.conectando');
        const nueva = new Conexion();
        con = nueva;
        const clave = campo.value.trim();
        const r = await nueva.entrar(clave);
        if (!vivo || con !== nueva) return;
        if (!r.ok) {
          con = null;
          entrar.disabled = false;
          avisoEl.textContent = texto(`online.error.${r.motivo}`);
          return;
        }
        storageSet(CLAVE_GUARDADA, clave);
        verSala(nueva);
      };
      // The keys typed here are the password's: the game behind must not hear them.
      campo.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') void intentar();
        else if (e.key === 'Escape') salir();
      });
      el.replaceChildren(
        h(
          'div',
          { class: 'pg-panel pg-centro pg-online-clave' },
          h('h2', { class: 'pg-h2' }, texto('online.titulo')),
          campo,
          avisoEl,
          h('div', { class: 'pg-pie' }, boton(texto('menu.volver'), salir, 'fantasma'), entrar),
        ),
      );
      // On a phone the keyboard would cover half the screen: only focus where there is a real keyboard.
      if (window.matchMedia('(pointer: fine)').matches) campo.focus();
    };

    // ------------------------------------------------------------ screen 2: the room

    const verSala = (c: Conexion) => {
      dejarDeEscuchar();
      const cartas = new Map<PjId, { el: HTMLButtonElement; estado: HTMLElement }>();
      for (const id of PJS) {
        const f = REPARTO[id];
        const cara = h('div', { class: 'pg-cara' });
        cara.innerHTML = retrato(id, { mood: 'happy' });
        const estado = h('div', { class: 'pg-sala-estado' });
        const carta = h('button', { type: 'button', class: 'pg-carta pg-sala-carta', 'aria-pressed': 'false', style: `--color:${f.color}` }, cara, h('div', { class: 'pg-carta-nombre' }, f.nombre), estado);
        carta.addEventListener('click', (e) => {
          e.stopPropagation();
          elegir(id);
        });
        cartas.set(id, { el: carta, estado });
      }
      const cuantos = h('p', { class: 'pg-sala-cuenta', 'aria-live': 'polite' });
      const pista = h('p', { class: 'pg-sala-pista' });
      const empezar = c.anfitrion ? boton(texto('online.empezar'), () => c.enviar({ tipo: 'empezar' }), 'primario') : null;

      const miPj = () => c.jugadores.find((j) => j.id === c.id)?.pj ?? null;
      const elegir = (id: PjId) => {
        const dueno = c.jugadores.find((j) => j.pj === id);
        if (dueno && dueno.id !== c.id) return;
        c.enviar({ tipo: 'elegir', pj: miPj() === id ? null : id });
      };
      const pintar = () => {
        for (const [id, carta] of cartas) {
          const dueno = c.jugadores.find((j) => j.pj === id);
          const mia = dueno?.id === c.id;
          const ajena = !!dueno && !mia;
          carta.el.classList.toggle('elegida', mia);
          carta.el.classList.toggle('ocupada', ajena);
          carta.el.disabled = ajena;
          carta.el.setAttribute('aria-pressed', String(mia));
          carta.estado.textContent = mia ? texto('online.tuyo') : ajena ? texto('online.ocupado') : texto('online.libre');
        }
        cuantos.textContent = texto('online.jugadores', { n: c.jugadores.length });
        const todosListos = c.jugadores.length > 0 && c.jugadores.every((j) => j.pj !== null);
        if (empezar) {
          empezar.disabled = !todosListos;
          pista.textContent = todosListos ? '' : texto(miPj() ? 'online.faltan' : 'online.elige');
        } else pista.textContent = miPj() ? texto('online.esperando') : texto('online.elige');
      };

      const perder = (motivo: 'online.cerrada' | 'online.perdida') => {
        verClave(texto(motivo));
      };
      soltar.push(
        c.on('sala', pintar),
        c.on('empezar', () => {
          dejarDeEscuchar();
          con = null;
          fin({
            con: c,
            yo: c.id,
            anfitrion: c.anfitrion,
            jugadores: c.jugadores
              .filter((j): j is typeof j & { pj: PjId } => j.pj !== null)
              .map((j) => ({ id: j.id, pj: j.pj }))
              .sort((a, b) => a.id - b.id),
          });
        }),
        c.on('cerrada', () => perder('online.cerrada')),
        c.on('perdida', () => perder('online.perdida')),
      );
      // Keyboard: 1–4 pick a character, Esc leaves (Tab and Enter work on the cards and buttons).
      const alTeclear = (e: KeyboardEvent) => {
        if (e.key === 'Escape') salir();
        else if (/^[1-4]$/.test(e.key)) elegir(PJS[Number(e.key) - 1]);
      };
      document.addEventListener('keydown', alTeclear);
      soltar.push(() => document.removeEventListener('keydown', alTeclear));

      el.replaceChildren(
        h(
          'div',
          { class: 'pg-panel pg-ancho pg-online-sala' },
          h('h2', { class: 'pg-h2' }, texto('online.sala')),
          cuantos,
          h('div', { class: 'pg-sala-cartas' }, ...[...cartas.values()].map((x) => x.el)),
          h('div', { class: 'pg-pie pg-pie-doble' }, boton(texto('online.salir'), salir, 'fantasma'), pista, empezar),
        ),
      );
      pintar();
    };

    verClave();
    return () => {
      vivo = false;
      dejarDeEscuchar();
      // Closed unless the game takes the connection over (`con` is emptied when `empezar` arrives).
      con?.cerrar();
    };
  });
}
