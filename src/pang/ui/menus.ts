// The Pang's menus: title, main menu, stage select, settings, records and the pause panel.
// Plain DOM over the game layer; styles in ../pang.css.
import type { Sound, Volumen } from '../../core/audio';
import { texto } from '../../juego/textos';
import { REPARTO, retrato } from '../../juego/reparto';
import { cuentaLocal } from '../../cuenta/base';
import { leerRecords, type Fila } from '../../cuenta/records';
import { datos, FASES_TOTAL, guardarVolumen, type Marca } from '../guardado';
import type { PjId } from '../tipos';
import { alTeclear, boton, h, miles, mostrar } from './dom';

// ---------------------------------------------------------------- title

/** Title text over the attract demo; resolves on the first tap. */
export function pantallaTitulo(ui: HTMLElement): Promise<void> {
  const el = h(
    'div',
    { class: 'pg-pantalla pg-titulo' },
    h('div', { class: 'pg-pila' }, h('div', { class: 'pg-nombre-juego' }, texto('titulo')), h('div', { class: 'pg-pang' }, texto('titulo.pang')), h('div', { class: 'pg-sub' }, texto('titulo.sub'))),
    h('div', { class: 'pg-empezar' }, texto('titulo.empezar')),
  );
  return mostrar<void>(ui, el, (fin) => {
    el.addEventListener('click', () => fin());
    return alTeclear((e) => {
      if (e.key === 'Enter' || e.key === ' ') fin();
    });
  });
}

// ---------------------------------------------------------------- main menu

export type AccionMenu = 'nueva' | 'seguir' | 'online' | 'fases' | 'records' | 'ajustes' | 'salir';

/** `conSalir`: the Pang opened from the minigames menu gets a last button to go back there («Volver a los minijuegos»); opened by itself (`/pang`), «web»,
 *  the last button says «Volver a la web» (the caller then goes to the cover). */
export function pantallaMenu(ui: HTMLElement, conSalir: boolean | 'web' = false): Promise<AccionMenu> {
  const el = h('div', { class: 'pg-pantalla pg-menu' });
  return mostrar<AccionMenu>(ui, el, (fin) => {
    const botones: Array<[AccionMenu, string]> = [];
    if (datos.faseMax > 1) botones.push(['seguir', texto('menu.seguir', { n: datos.faseMax })]);
    botones.push(['nueva', texto('menu.nueva')], ['online', texto('menu.online')], ['fases', texto('menu.fases')]);
    // Récords and Ajustes share a row, so the seven buttons still fit on a low phone.
    const aparte: Array<[AccionMenu, string]> = [['records', texto('menu.records')], ['ajustes', texto('menu.ajustes')]];
    const pintar = ([a, t]: [AccionMenu, string]) => boton(t, () => fin(a), a === botones[0][0] ? 'primario' : a === 'salir' ? 'fantasma' : '');
    el.append(
      h('div', { class: 'pg-marca' }, h('div', { class: 'pg-nombre-juego' }, texto('titulo')), h('div', { class: 'pg-pang' }, texto('titulo.pang'))),
      h(
        'div',
        { class: 'pg-panel pg-menu-botones' },
        ...botones.map(pintar),
        h('div', { class: 'pg-menu-par' }, ...aparte.map(pintar)),
        conSalir ? pintar(['salir', texto(conSalir === 'web' ? 'menu.web' : 'menu.minijuegos')]) : null,
      ),
    );
    // Escape goes back to the minigames, but never out to the web (a key pressed by mistake must not close the game).
    if (conSalir === true) return alTeclear((e) => {
      if (e.key === 'Escape') fin('salir');
    });
  });
}

// ---------------------------------------------------------------- stage select

function candado() {
  const s = h('span', { class: 'pg-candado', 'aria-hidden': 'true' });
  s.innerHTML = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  return s;
}

/** The twelve stages; the ones past the highest reached are locked. Resolves the chosen stage, or null for «Volver». */
export function pantallaFases(ui: HTMLElement): Promise<number | null> {
  const el = h('div', { class: 'pg-pantalla pg-hoja' });
  return mostrar<number | null>(ui, el, (fin) => {
    const aviso = h('p', { class: 'pg-aviso', 'aria-live': 'polite' });
    const rejilla = h('div', { class: 'pg-fases' });
    for (let n = 1; n <= FASES_TOTAL; n++) {
      const abierta = n <= datos.faseMax;
      const b = h(
        'button',
        { type: 'button', class: `pg-fase${abierta ? '' : ' cerrada'}`, 'aria-disabled': abierta ? 'false' : 'true' },
        abierta ? h('span', { class: 'pg-fase-n' }, String(n)) : h('span', { class: 'pg-fase-n' }, candado()),
        abierta ? h('span', { class: 'pg-fase-nombre' }, texto(`fase.${n}.nombre`)) : null,
        abierta ? h('span', { class: 'pg-fase-lugar' }, texto(`fase.${n}.lugar`)) : null,
      );
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (abierta) fin(n);
        else aviso.textContent = texto('fases.bloqueada');
      });
      rejilla.append(b);
    }
    el.append(h('div', { class: 'pg-panel pg-ancho' }, h('h2', { class: 'pg-h2' }, texto('fases.titulo')), rejilla, aviso, h('div', { class: 'pg-pie' }, boton(texto('menu.volver'), () => fin(null)))));
    return alTeclear((e) => {
      if (e.key === 'Escape') fin(null);
    });
  });
}

// ---------------------------------------------------------------- volume sliders

/** Music or effects volume: heard while it moves, saved when let go. */
export function controlVolumen(sonido: Sound, que: Volumen, clave: string): HTMLElement {
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const valor = h('output', { class: 'pg-valor' }, pct(datos[que]));
  const barra = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(datos[que] * 100)), class: 'pg-barra', 'aria-label': texto(clave) });
  barra.addEventListener('input', () => {
    const v = Number(barra.value) / 100;
    valor.textContent = pct(v);
    sonido.setVolumen(que, v);
  });
  barra.addEventListener('change', () => {
    guardarVolumen(que, Number(barra.value) / 100);
    if (que === 'efectos') sonido.pickup();
  });
  for (const ev of ['click', 'pointerdown', 'pointerup']) barra.addEventListener(ev, (e) => e.stopPropagation());
  return h('div', { class: 'pg-volumen' }, h('span', { class: 'pg-volumen-t' }, texto(clave)), barra, valor);
}

// ---------------------------------------------------------------- settings

export function pantallaAjustes(ui: HTMLElement, sonido: Sound): Promise<void> {
  const el = h('div', { class: 'pg-pantalla pg-hoja' });
  return mostrar<void>(ui, el, (fin) => {
    el.append(
      h(
        'div',
        { class: 'pg-panel pg-ancho' },
        h('h2', { class: 'pg-h2' }, texto('menu.ajustes')),
        h('div', { class: 'pg-ajustes' }, h('div', { class: 'pg-ajustes-vol' }, controlVolumen(sonido, 'musica', 'menu.musica'), controlVolumen(sonido, 'efectos', 'menu.efectos')), h('p', { class: 'pg-ayuda' }, texto('menu.ayuda'))),
        h('div', { class: 'pg-pie' }, boton(texto('menu.volver'), () => fin())),
      ),
    );
    return alTeclear((e) => {
      if (e.key === 'Escape') fin();
    });
  });
}

// ---------------------------------------------------------------- records

const fechaCorta = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: '2-digit' });
};

/** The little round face of a friend (nothing if the id is not one of the four). */
function caraPj(pj: string): HTMLElement {
  const cara = h('span', { class: 'pg-mini' });
  if (pj in REPARTO) cara.innerHTML = retrato(pj as PjId);
  return cara;
}

/** This phone's table: the legendary CYC always first, then the saved runs. `nuevo` is highlighted. */
function tablaLocal(nuevo: Marca | null): HTMLElement {
  const tabla = h('div', { class: 'pg-records', role: 'table' });
  tabla.append(
    h('div', { class: 'pg-record cyc', role: 'row' }, h('span', { class: 'pg-pos', 'aria-hidden': 'true' }, '★'), h('span', { class: 'pg-pts' }, miles(999999)), h('span', { class: 'pg-quien-r' }, texto('records.cyc')), h('span', { class: 'pg-fase-r' }), h('span', { class: 'pg-fecha' })),
  );
  if (!datos.records.length) tabla.append(h('p', { class: 'pg-vacio' }, texto('records.vacio')));
  datos.records.forEach((r, i) => {
    const f = REPARTO[r.pj];
    tabla.append(
      h(
        'div',
        { class: `pg-record${r === nuevo ? ' nuevo' : ''}`, role: 'row' },
        h('span', { class: 'pg-pos' }, String(i + 1)),
        h('span', { class: 'pg-pts' }, miles(r.puntos)),
        h('span', { class: 'pg-quien-r', style: `color:${f.color}` }, caraPj(r.pj), f.nombre),
        h('span', { class: 'pg-fase-r' }, texto('records.fase', { n: r.fase })),
        h('span', { class: 'pg-fecha' }, r === nuevo ? texto('records.nuevo') : fechaCorta(r.fecha)),
      ),
    );
  });
  return tabla;
}

/** The table of everybody (the ten best, with the name of the account): yours in gold, and `nuevo` (the run just played) with its label. In the table of groups each row also says how many played («con 3»). */
function tablaTodos(filas: Fila[], nuevo: Marca | null, grupo = false): HTMLElement {
  const tabla = h('div', { class: `pg-records todos${grupo ? ' grupo' : ''}`, role: 'table' });
  if (!filas.length) tabla.append(h('p', { class: 'pg-vacio' }, texto('records.vaciotodos')));
  filas.forEach((r, i) => {
    const es = !!nuevo && r.mia === true && r.puntos === nuevo.puntos && r.fecha === nuevo.fecha;
    const pj = r.extra?.pj ?? '';
    const f = pj in REPARTO ? REPARTO[pj as PjId] : null;
    tabla.append(
      h(
        'div',
        { class: `pg-record${r.mia ? ' mia' : ''}${es ? ' nuevo' : ''}`, role: 'row' },
        h('span', { class: 'pg-pos' }, String(i + 1)),
        h('span', { class: 'pg-pts' }, miles(r.puntos)),
        h('span', { class: 'pg-quien-r pg-cuenta' }, r.nombre),
        h(
          'span',
          { class: 'pg-fase-r pg-con-cara', title: f?.nombre ?? '' },
          f ? caraPj(pj) : '',
          r.extra ? texto('records.fase', { n: r.extra.fase }) : '',
          grupo && r.extra?.n ? h('small', { class: 'pg-con' }, texto('records.con', { n: r.extra.n })) : null,
        ),
        h('span', { class: 'pg-fecha' }, es ? texto('records.nuevo') : fechaCorta(r.fecha)),
      ),
    );
  });
  return tabla;
}

/**
 * The records: three tables behind three tabs, «De todos» first (the ten best solo runs of every account, from the server, or the last seen without network),
 * «En grupo» (the same for the online games of two to four, with «con N» on each row) and «En este móvil» (this phone's five, solo only). `nuevo` is the run
 * just played, highlighted. Without an account the tables of everybody say how to get a name; a run that made the phone's top five and has no account to go
 * to everybody's opens on the phone's tab, where it is.
 */
export function pantallaRecords(ui: HTMLElement, nuevo: Marca | null = null): Promise<void> {
  const el = h('div', { class: 'pg-pantalla pg-hoja' });
  return mostrar<void>(ui, el, (fin) => {
    type Vista = 'todos' | 'grupo' | 'local';
    const ORDEN: Vista[] = ['todos', 'grupo', 'local'];
    const hayCuenta = cuentaLocal() !== null;
    let cerrada = false;
    let vista: Vista = nuevo && !hayCuenta ? 'local' : 'todos';
    const cuerpo = h('div', { class: 'pg-records-cuerpo' });
    const nota = h('p', { class: 'pg-nota' });
    const botones: Record<Vista, HTMLButtonElement> = {
      todos: h('button', { type: 'button', class: 'pg-pestana', role: 'tab' }, texto('records.todos')),
      grupo: h('button', { type: 'button', class: 'pg-pestana', role: 'tab' }, texto('records.grupo')),
      local: h('button', { type: 'button', class: 'pg-pestana', role: 'tab' }, texto('records.local')),
    };
    /** What the last answer of the server was, per table: undefined while it comes (or before it is asked), null if there is nothing to show. */
    const lecturas: Partial<Record<'todos' | 'grupo', { filas: Fila[]; enVivo: boolean } | null>> = {};
    const pedidas = new Set<string>();
    const pedir = (v: 'todos' | 'grupo') => {
      if (pedidas.has(v)) return;
      pedidas.add(v);
      void leerRecords(v === 'todos' ? 'pang' : 'pangGrupo').then((r) => {
        if (cerrada) return;
        lecturas[v] = r;
        if (vista === v) pintar();
      });
    };

    const pintar = () => {
      for (const k of ORDEN) {
        botones[k].classList.toggle('activa', k === vista);
        botones[k].setAttribute('aria-selected', String(k === vista));
      }
      cuerpo.scrollTop = 0;
      if (vista === 'local') {
        cuerpo.replaceChildren(tablaLocal(nuevo));
        nota.textContent = '';
        return;
      }
      pedir(vista);
      const lectura = lecturas[vista];
      if (lectura === undefined) cuerpo.replaceChildren(h('p', { class: 'pg-vacio' }, texto('records.cargando')));
      else if (lectura === null) cuerpo.replaceChildren(h('p', { class: 'pg-vacio' }, texto('records.sinred')));
      else cuerpo.replaceChildren(tablaTodos(lectura.filas, vista === 'todos' ? nuevo : null, vista === 'grupo'));
      nota.textContent = [hayCuenta ? '' : texto('records.sincuenta'), lectura && !lectura.enVivo ? texto('records.viejo') : ''].filter(Boolean).join(' ');
    };
    const elegir = (v: Vista) => {
      vista = v;
      pintar();
    };
    for (const k of ORDEN) botones[k].addEventListener('click', () => elegir(k));
    pintar();

    el.append(
      h(
        'div',
        { class: 'pg-panel pg-ancho pg-hoja-records', role: 'dialog', 'aria-label': texto('records.titulo') },
        h('div', { class: 'pg-cabecera' }, h('div', { class: 'pg-pestanas', role: 'tablist' }, botones.todos, botones.grupo, botones.local), boton(texto('menu.volver'), () => fin(), 'fantasma')),
        cuerpo,
        nota,
      ),
    );
    const parar = alTeclear((e) => {
      if (e.key === 'Escape') fin();
      else if (e.key === 'Enter' && e.target === document.body) fin();
      else if (e.key === 'ArrowLeft') elegir(ORDEN[(ORDEN.indexOf(vista) + ORDEN.length - 1) % ORDEN.length]);
      else if (e.key === 'ArrowRight') elegir(ORDEN[(ORDEN.indexOf(vista) + 1) % ORDEN.length]);
    });
    return () => {
      cerrada = true;
      parar();
    };
  });
}

// ---------------------------------------------------------------- pause

/**
 * The pause panel over the running game. «Salir» needs a second tap. Online the game goes on behind
 * it, so `senal` can close the panel from outside (the stage ended): it resolves 'seguir'.
 */
export function pantallaPausa(ui: HTMLElement, sonido: Sound, senal?: AbortSignal, online = false): Promise<'seguir' | 'salir'> {
  const el = h('div', { class: 'pg-pantalla pg-pausa' });
  return mostrar<'seguir' | 'salir'>(ui, el, (fin) => {
    let seguro = 0;
    const etiqueta = texto(online ? 'online.salir.partida' : 'menu.salir');
    const salir = boton(
      etiqueta,
      () => {
        if (salir.classList.contains('peligro')) return fin('salir');
        salir.classList.add('peligro');
        salir.textContent = texto('menu.seguro');
        seguro = window.setTimeout(() => {
          salir.classList.remove('peligro');
          salir.textContent = etiqueta;
        }, 4000);
      },
      'fantasma',
    );
    el.append(
      h(
        'div',
        { class: 'pg-panel pg-centro' },
        h('h2', { class: 'pg-h2' }, texto('menu.pausa')),
        h('div', { class: 'pg-dos' }, h('div', { class: 'pg-col' }, boton(texto('menu.reanudar'), () => fin('seguir'), 'primario'), salir), h('div', { class: 'pg-col' }, controlVolumen(sonido, 'musica', 'menu.musica'), controlVolumen(sonido, 'efectos', 'menu.efectos'))),
      ),
    );
    const quitar = alTeclear((e) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') fin('seguir');
    });
    const alAbortar = () => fin('seguir');
    senal?.addEventListener('abort', alAbortar, { once: true });
    return () => {
      clearTimeout(seguro);
      quitar();
      senal?.removeEventListener('abort', alAbortar);
    };
  });
}
