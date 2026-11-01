// The Pang's online screens (docs/PANG-ONLINE.md): the list of open rooms (join one, create one or type a code) and the room (who is in, who plays whom, the host starts).
// The rooms themselves are the web's common service (src/sala/conexion.ts, docs/SALAS.md): the Pang only draws them, in the DOM and the style of its other menus (pang.css).
import { REPARTO, retrato } from '../../juego/reparto';
import { texto } from '../../juego/textos';
import { ConexionSala, limpiarCodigoSala, MAX_JUGADORES, MAX_SALAS, type JugadorSala, type ResultadoSala } from '../../sala/conexion';
import { PJS, type PjId } from '../tipos';
import { alTeclear, boton, h, mostrar } from '../ui/dom';

/** The Pang's game id in the rooms (`JUEGOS_ONLINE`, src/sala/reglas.mjs). */
export const JUEGO = 'pang';

export type ConexionPang = ConexionSala<PjId>;

/** The name of a player in the room: the account's, or «Jugador N» if he has none. */
export const nombreEn = (j: JugadorSala<PjId>): string => j.nombre || texto('online.jugador', { n: j.id + 1 });

/** The link that opens straight into a room. */
export const enlaceDeSala = (codigo: string) => `${location.origin}/pang?sala=${codigo}`;

// ---------------------------------------------------------------- the list of rooms

export interface EntradaSalas {
  /** From a link (`/pang?sala=K7MZ`): that room is tried first, and the list is shown only if it fails. */
  codigo?: string;
  /** From a link (`/pang?sala=nueva`): opens «crear sala» straight away. */
  nueva?: boolean;
}

export type SalidaSalas = 'sala' | 'volver';

/**
 * The list of open rooms of the Pang. Opens the connection if it is not open yet. Resolves 'sala' once the player is in a room (`con.id >= 0`),
 * or 'volver' when they go back (the caller closes the connection) or there is no connection at all.
 */
export function pantallaSalas(ui: HTMLElement, con: ConexionPang, entrada: EntradaSalas = {}): Promise<SalidaSalas> {
  const el = h('div', { class: 'pg-pantalla pg-online' });
  return mostrar<SalidaSalas>(ui, el, (fin) => {
    let ocupado = true;
    let creando = false;
    let cerrado = false;
    const aviso = h('p', { class: 'pg-aviso', role: 'alert', 'aria-live': 'polite' });
    const cuenta = h('p', { class: 'pg-sala-cuenta' });
    const lista = h('div', { class: 'pg-salas' });
    const offs: Array<() => void> = [];

    const campo = h('input', {
      type: 'text',
      class: 'pg-campo pg-campo-codigo',
      maxlength: '4',
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: 'false',
      enterkeyhint: 'go',
      'aria-label': texto('online.codigo'),
      placeholder: texto('online.codigo'),
    });
    const entrar = boton(texto('online.entrar'), () => enviarCodigo());
    const crear = boton(texto('online.crear'), () => abrirCrear(), 'primario');

    const mensajeDe = (motivo: string) => {
      const clave = `online.error.${motivo}`;
      const t = texto(clave);
      return t.startsWith('[') ? texto('online.error.red') : t;
    };
    /** Asks the server for something that ends in a room (create / join). */
    const entrarEn = async (accion: () => Promise<ResultadoSala>) => {
      if (ocupado || cerrado) return;
      ocupado = true;
      aviso.textContent = texto('online.conectando');
      pintar();
      const r = await accion();
      if (cerrado) return;
      ocupado = false;
      if (r.ok) return fin('sala');
      aviso.textContent = mensajeDe(r.motivo);
      pintar();
    };
    const unirse = (codigo: string) => void entrarEn(() => con.unirse(codigo, JUEGO));
    const crearSala = (max: number) => void entrarEn(() => con.crear(JUEGO, max));
    const enviarCodigo = () => {
      if (ocupado) return;
      const c = limpiarCodigoSala(campo.value);
      if (!c) {
        aviso.textContent = mensajeDe('codigo');
        return;
      }
      unirse(c);
    };
    const abrirCrear = () => {
      if (ocupado) return;
      creando = true;
      aviso.textContent = '';
      montar();
    };

    /** The rooms and the buttons, drawn again whenever something changes. */
    const pintar = () => {
      const llenas = con.abiertas >= (con.maxSalas || MAX_SALAS);
      cuenta.textContent = con.abierta ? texto('online.abiertas', { n: con.abiertas, max: con.maxSalas || MAX_SALAS }) : '';
      entrar.disabled = ocupado;
      crear.disabled = ocupado || llenas;
      campo.disabled = ocupado;
      if (llenas && !ocupado && !aviso.textContent) aviso.textContent = texto('online.error.muchas');
      const filas = con.salas.slice(0, MAX_SALAS).map((s) => {
        const libre = !s.enPartida && s.jugadores < s.max;
        const quien = s.anfitrion ? texto('online.sala.de', { nombre: s.anfitrion }) : texto('online.sala.sin', { codigo: s.codigo });
        const b = h(
          'button',
          { type: 'button', class: `pg-sala-fila${libre ? '' : ' llena'}`, 'aria-disabled': libre ? 'false' : 'true' },
          h('span', { class: 'pg-sala-quien' }, quien),
          h('span', { class: 'pg-sala-codigo' }, s.codigo),
          h('span', { class: 'pg-sala-cupo' }, s.enPartida ? texto('online.sala.jugando') : texto('online.sala.cupo', { n: s.jugadores, max: s.max })),
        );
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (libre) unirse(s.codigo);
          else aviso.textContent = mensajeDe(s.enPartida ? 'enpartida' : 'llena');
        });
        return b;
      });
      if (!filas.length) lista.replaceChildren(h('p', { class: 'pg-vacio' }, ocupado && !con.abierta ? texto('online.conectando') : texto('online.vacio')));
      else lista.replaceChildren(...filas);
    };

    const volver = () => fin('volver');
    campo.addEventListener('keydown', (e) => {
      // The keys typed here are the code's: the game behind must not hear them.
      e.stopPropagation();
      if (e.key === 'Enter') enviarCodigo();
      else if (e.key === 'Escape') volver();
    });
    campo.addEventListener('input', () => {
      campo.value = campo.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (aviso.textContent) aviso.textContent = '';
    });

    /** «Crear sala»: how many players. */
    const panelCrear = () => {
      const opciones = [1, 2, 3, 4].slice(0, MAX_JUGADORES).map((n) => boton(texto(n === 1 ? 'online.crear.uno' : 'online.crear.n', { n }), () => crearSala(n), n === 2 ? 'primario' : ''));
      return h(
        'div',
        { class: 'pg-panel pg-centro' },
        h('h2', { class: 'pg-h2' }, texto('online.crear.titulo')),
        h('div', { class: 'pg-fila' }, ...opciones),
        aviso,
        h('div', { class: 'pg-pie' }, boton(texto('menu.volver'), () => ((creando = false), (aviso.textContent = ''), montar()), 'fantasma')),
      );
    };
    const panelLista = () =>
      h(
        'div',
        { class: 'pg-panel pg-ancho pg-online-lista' },
        h('h2', { class: 'pg-h2' }, texto('online.titulo')),
        h(
          'div',
          { class: 'pg-lista-dos' },
          h('div', { class: 'pg-col' }, cuenta, lista),
          h('div', { class: 'pg-col' }, crear, h('div', { class: 'pg-codigo-fila' }, campo, entrar), aviso, boton(texto('menu.volver'), volver, 'fantasma')),
        ),
      );
    const montar = () => {
      el.replaceChildren(creando ? panelCrear() : panelLista());
      pintar();
      if (!creando && matchMedia('(pointer: fine)').matches && !ocupado) campo.focus();
    };
    montar();
    offs.push(con.on('salas', () => !cerrado && !creando && pintar()));
    offs.push(
      con.on('perdida', () => {
        if (cerrado) return;
        aviso.textContent = texto('online.error.red');
        setTimeout(() => !cerrado && fin('volver'), 1400);
      }),
    );
    offs.push(
      alTeclear((e) => {
        if (e.key !== 'Escape') return;
        if (creando) {
          creando = false;
          montar();
        } else volver();
      }),
    );

    void (async () => {
      if (!con.abierta) {
        const ok = await con.abrir();
        if (cerrado) return;
        if (!ok) {
          aviso.textContent = texto('online.error.red');
          ocupado = false;
          pintar();
          setTimeout(() => !cerrado && fin('volver'), 1600);
          return;
        }
      }
      ocupado = false;
      con.mirarLista(JUEGO);
      aviso.textContent = '';
      // From a link: that room first; if it cannot be joined, the list says why.
      if (entrada.codigo) {
        const c = limpiarCodigoSala(entrada.codigo);
        if (!c) {
          aviso.textContent = mensajeDe('noexiste');
          pintar();
          return;
        }
        return entrarEn(() => con.unirse(c, JUEGO));
      }
      if (entrada.nueva) {
        abrirCrear();
        return;
      }
      pintar();
    })();

    return () => {
      cerrado = true;
      for (const f of offs) f();
    };
  });
}

// ---------------------------------------------------------------- the room

export type SalidaSala = { r: 'empezar' } | { r: 'salir' } | { r: 'cerrada' } | { r: 'perdida' };

/**
 * The room: who is in, the four characters to pick from (each one belongs to a single player), COMPARTIR and, for the host, «¡A jugar!».
 * Resolves when the host starts (everybody gets `empezar`), when the player leaves, when the room is closed or when the connection is lost.
 */
export function pantallaSala(ui: HTMLElement, con: ConexionPang): Promise<SalidaSala> {
  const el = h('div', { class: 'pg-pantalla pg-online' });
  return mostrar<SalidaSala>(ui, el, (fin) => {
    /** The code is kept here: when the room closes the connection forgets it. */
    const codigo = con.codigo;
    let empezando = false;
    let seguro = 0;
    const offs: Array<() => void> = [];

    const aviso = h('p', { class: 'pg-aviso', role: 'status', 'aria-live': 'polite' });
    const pista = h('p', { class: 'pg-sala-pista' });
    const gente = h('div', { class: 'pg-gente' });
    const cuantos = h('span', { class: 'pg-sala-cuenta' });
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

    const miPj = () => con.jugadores.find((j) => j.id === con.id)?.pj ?? null;
    const elegir = (id: PjId) => {
      const dueno = con.jugadores.find((j) => j.pj === id);
      if (dueno && dueno.id !== con.id) return;
      con.elegir(miPj() === id ? null : id);
    };
    /** The host can start when everybody in the room has a character. */
    const todosListos = () => con.jugadores.length > 0 && con.jugadores.every((j) => j.pj !== null);

    const empezar = con.anfitrion
      ? boton(
          texto('elegir.jugar'),
          () => {
            if (empezando || !todosListos()) return;
            empezando = true;
            // (If the server does not answer, the button comes back.)
            setTimeout(() => ((empezando = false), pintar()), 3000);
            pintar();
            con.empezar();
          },
          'primario',
        )
      : null;

    /** SALIR: a guest goes at once; the host's second tap closes the room for everybody. */
    const salir = boton(
      texto('online.salir'),
      () => {
        if (con.anfitrion && !salir.classList.contains('peligro')) {
          salir.classList.add('peligro');
          salir.textContent = texto('menu.seguro');
          aviso.textContent = texto('online.salir.cierra');
          seguro = window.setTimeout(() => {
            salir.classList.remove('peligro');
            salir.textContent = texto('online.salir');
            aviso.textContent = '';
          }, 4000);
          return;
        }
        con.salir();
        fin({ r: 'salir' });
      },
      'fantasma',
    );

    /** COMPARTIR: the phone's share sheet with the link to this room; without one, the link is copied. */
    const compartir = async () => {
      const url = enlaceDeSala(codigo);
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ text: texto('online.compartir.texto', { codigo }), url });
          return;
        } catch (err) {
          if ((err as { name?: string } | null)?.name === 'AbortError') return;
        }
      }
      let copiado = true;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        copiado = false;
      }
      aviso.textContent = copiado ? texto('online.copiado') : texto('online.error.copiar', { codigo });
    };
    const btnCompartir = boton(texto('online.compartir'), () => void compartir());

    const pintar = () => {
      const mio = miPj();
      for (const [id, c] of cartas) {
        const dueno = con.jugadores.find((j) => j.pj === id);
        const mia = dueno?.id === con.id;
        const ajena = !!dueno && !mia;
        c.el.classList.toggle('elegida', mia);
        c.el.classList.toggle('ocupada', ajena);
        c.el.disabled = ajena;
        c.el.setAttribute('aria-pressed', String(mia));
        c.estado.textContent = dueno ? (mia ? texto('online.tu') : nombreEn(dueno)) : texto('online.libre');
      }
      // Who is in: account name and character, one chip each (the room's size, with the seats still free).
      const chips = [...con.jugadores]
        .sort((a, b) => a.id - b.id)
        .map((j) => {
          const f = j.pj ? REPARTO[j.pj] : null;
          const cara = h('span', { class: 'pg-mini' });
          if (j.pj) cara.innerHTML = retrato(j.pj);
          return h(
            'span',
            { class: `pg-chip${j.id === con.id ? ' yo' : ''}`, style: f ? `--color:${f.color}` : '' },
            cara,
            h('span', { class: 'pg-chip-t' }, h('b', {}, nombreEn(j) + (j.anfitrion ? ' ★' : '')), h('small', {}, f ? f.nombre : texto('online.eligiendo'))),
          );
        });
      for (let i = con.jugadores.length; i < (con.max || MAX_JUGADORES); i++) chips.push(h('span', { class: 'pg-chip libre' }, h('span', { class: 'pg-mini' }), h('span', { class: 'pg-chip-t' }, h('b', {}, texto('online.libre')))));
      gente.replaceChildren(...chips);
      cuantos.textContent = texto('online.cupo', { n: con.jugadores.length, max: con.max || MAX_JUGADORES });
      if (empezar) {
        empezar.disabled = empezando || !todosListos();
        pista.textContent = empezando ? '' : todosListos() ? texto('online.listo') : texto(mio ? 'online.faltan' : 'online.elige');
      } else pista.textContent = mio ? texto('online.esperando') : texto('online.elige');
    };

    offs.push(
      con.on('sala', pintar),
      con.on('empezar', () => fin({ r: 'empezar' })),
      con.on('cerrada', () => fin({ r: 'cerrada' })),
      con.on('perdida', () => fin({ r: 'perdida' })),
      // Keyboard: 1–4 pick a character, Esc leaves (Tab and Enter work on the cards and buttons).
      alTeclear((e) => {
        if (e.key === 'Escape') salir.click();
        else if (/^[1-4]$/.test(e.key)) elegir(PJS[Number(e.key) - 1]);
      }),
    );

    el.append(
      h(
        'div',
        { class: 'pg-panel pg-ancho pg-online-sala' },
        h('div', { class: 'pg-cabecera' }, h('h2', { class: 'pg-h2' }, texto('online.sala', { codigo })), cuantos, btnCompartir),
        gente,
        h('div', { class: 'pg-sala-cartas' }, ...[...cartas.values()].map((x) => x.el)),
        aviso,
        h('div', { class: 'pg-pie pg-pie-doble' }, salir, pista, empezar),
      ),
    );
    pintar();
    return () => {
      clearTimeout(seguro);
      for (const f of offs) f();
    };
  });
}
