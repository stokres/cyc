// DOM overlay over the scene: character dock, tools, objective and clock,
// bag, dialogue box with an animated portrait, first-time help and labels.
import { icono } from '../arte/objetos.mjs';
import { REPARTO, NPCS, esNpc, retrato, retratoBitmap, retratoYa, COLOR_ACEITUNA, COLOR_SOMBRA, NOMBRE_ACEITUNA, type PjId } from '../juego/reparto';
import { texto, type Quien } from '../juego/textos';

type Attrs = Record<string, string | boolean | ((e: Event) => void)>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Array<Node | string | null>): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false) el.setAttribute(k, v);
  }
  for (const k of kids) if (k !== null) el.append(k);
  return el;
}

const ICONOS = {
  ojo: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  pista: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  bolsa: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  mirar: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  mano: '<svg viewBox="0 0 24 24"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-1.5v-2a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v1.5m0 0a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-1.6a6 6 0 0 1-4.6-2.2L4.3 16a1.6 1.6 0 0 1 2.4-2l1.3 1.4"/></svg>',
};

/** The hand of the first-time help, for the how-to-play card (src/ui/tutorial.ts). */
export const ICONO_MANO = ICONOS.mano;

function boton(nombre: keyof typeof ICONOS, label: string, onclick: () => void, clase = 'redondo vidrio') {
  const b = h('button', { class: clase, 'aria-label': label, title: label, onclick: (e) => (e.stopPropagation(), onclick()) });
  b.innerHTML = ICONOS[nombre];
  return b;
}

const VISEMA = (c: string) => ('aá'.includes(c) ? 'a' : 'oóuú'.includes(c) ? 'o' : 'eéií'.includes(c) ? 'e' : 'mbp'.includes(c) ? 'm' : c === ' ' || c === ',' || c === '.' ? 'reposo' : 'e');

export interface HudEventos {
  elegir(id: PjId): void;
  ojo(): void;
  pista(): void;
  menu(): void;
  seleccionar(item: string | null): void;
  mirarObjeto(item: string): void;
  /** With an item chosen, the player tapped another one in the bag. */
  combinar(a: string, b: string): void;
}

export interface EntradaReparto {
  id: PjId;
  aqui: boolean;
  lugar: string;
  /** Story finished, on the way to the bar. */
  camino?: boolean;
}

export class Hud {
  readonly root: HTMLDivElement;
  private dock: HTMLDivElement;
  /** Character dock: folded (only the active face) or open (the column). */
  private repartoAbierto = false;
  private repartoClave = '';
  /** The dock cannot be used right now (a cutscene, a minigame, a choice): it looks switched off. */
  private repartoBloqueado = false;
  private opcionesAbiertas = 0;
  private objEl: HTMLDivElement;
  private objTexto: HTMLSpanElement;
  private reloj: HTMLSpanElement;
  private usandoEl: HTMLButtonElement;
  private bandeja: HTMLDivElement;
  private bolsaBtn: HTMLButtonElement;
  private cuenta: HTMLSpanElement;
  private ayudaEl: HTMLDivElement;
  private ayudaT = 0;
  private dialogoEl: HTMLDivElement | null = null;
  private fpsEl: HTMLDivElement;
  private avance: (() => void) | null = null;
  private escribiendo: { full: string; shown: number; el: HTMLElement } | null = null;
  private retratoEl: HTMLDivElement | null = null;
  private retratoDe: { quien: Exclude<Quien, null>; animo: string } | null = null;
  private retratoKey = '';
  private retratoCv: HTMLCanvasElement | null = null;
  private retratoPrecalentado = false;
  private parpadeo = 2;
  private items: string[] = [];
  seleccionado: string | null = null;
  /** Who is speaking right now (for lip sync in the scene). */
  hablando: Quien = null;
  /** What each protagonist wears now: the dock and the dialogue portraits show it (Chuchi's glasses). */
  ropas: Partial<Record<PjId, string>> = {};

  constructor(parent: HTMLElement, private ev: HudEventos) {
    this.root = h('div', { class: 'ui' });
    parent.append(this.root);

    this.dock = h('div', { class: 'reparto', role: 'group', 'aria-label': texto('selector.titulo') });
    this.root.append(this.dock);
    // A tap anywhere outside the dock folds it; the tap itself carries on as usual (capture phase, never consumed).
    document.addEventListener('pointerdown', (e) => {
      if (this.repartoAbierto && !this.dock.contains(e.target as Node)) this.plegarReparto();
    }, true);

    this.root.append(h('div', { class: 'herramientas' }, boton('ojo', texto('boton.ojo'), ev.ojo), boton('pista', texto('boton.pista'), ev.pista), boton('menu', texto('boton.menu'), ev.menu)));

    this.reloj = h('span', { class: 'reloj' });
    this.objTexto = h('span', { class: 'texto' });
    this.objEl = h('div', { class: 'objetivo vidrio', hidden: true }, this.reloj, this.objTexto);
    this.root.append(this.objEl);

    this.usandoEl = h('button', { class: 'usando vidrio', hidden: true, onclick: (e) => (e.stopPropagation(), this.seleccionar(null)) });
    this.root.append(this.usandoEl);

    this.bandeja = h('div', { class: 'bandeja vidrio', 'data-abierta': 'false' });
    this.cuenta = h('span', { class: 'cuenta' }, '0');
    this.bolsaBtn = boton('bolsa', texto('boton.bolsa'), () => this.abrirBandeja());
    this.bolsaBtn.append(this.cuenta);
    this.root.append(this.bandeja, h('div', { class: 'bolsa' }, this.bolsaBtn));

    this.ayudaEl = h('div', { class: 'ayuda vidrio', hidden: true });
    this.root.append(this.ayudaEl);

    this.fpsEl = h('div', { class: 'fps vidrio', hidden: true });
    this.root.append(this.fpsEl);
  }

  // ------------------------------------------------------------ character dock

  setReparto(lista: EntradaReparto[], activo: PjId) {
    // Rebuilt only when something shows; an open dock folds when it is rebuilt.
    const clave = JSON.stringify([lista, activo, lista.map((e) => this.ropas[e.id] ?? '')]);
    if (clave === this.repartoClave) return;
    this.repartoClave = clave;
    this.repartoAbierto = false;
    // The active one goes first (it is the folded circle); the rest keep the order of `lista`.
    const orden = [...lista.filter((e) => e.id === activo), ...lista.filter((e) => e.id !== activo)];
    this.dock.replaceChildren(
      ...orden.map((e, n) => {
        const F = REPARTO[e.id];
        const esActivo = e.id === activo;
        const b = h(
          'button',
          {
            class: `pj${e.camino ? ' camino' : ''}`,
            'data-id': e.id,
            'aria-pressed': String(esActivo),
            'aria-label': `${F.nombre}${e.aqui ? '' : ` (${e.lugar})`}`,
            'data-etiqueta': `${F.nombre}${e.aqui ? '' : ` (${e.lugar})`}`,
            style: `--color:${F.color};--i:${n}`,
            onclick: (ev) => {
              ev.stopPropagation();
              if (this.repartoBloqueado) return this.aviso(texto('selector.ahora'));
              if (esActivo && !this.repartoAbierto) return this.abrirReparto();
              this.plegarReparto();
              this.ev.elegir(e.id);
            },
          },
          h('span', { class: 'cara' }),
          h('span', { class: 'nombre' }, F.nombre),
          esActivo ? h('span', { class: 'cambiar', 'aria-hidden': 'true' }, texto('selector.cambiar')) : null,
          e.camino ? h('span', { class: 'hecho', 'aria-hidden': 'true' }, '✓') : null,
        );
        b.querySelector('.cara')!.innerHTML = retrato(e.id, { mood: F.arte.INFO.defaultMood, ropa: this.ropas[e.id] });
        return b;
      }),
    );
    this.pintarReparto();
  }

  /**
   * Whether the player may switch character right now. Where it is not safe (a cutscene, a minigame,
   * a choice to make) the dock looks switched off and folds; the game decides (`Aventura.cambioLibre`).
   */
  set cambioLibre(libre: boolean) {
    if (this.repartoBloqueado === !libre) return;
    this.repartoBloqueado = !libre;
    if (!libre) this.plegarReparto();
    this.dock.dataset.bloqueado = String(!libre);
    this.dock.setAttribute('aria-disabled', String(!libre));
    this.pintarReparto();
  }

  private abrirReparto() {
    this.repartoAbierto = true;
    this.pintarReparto();
  }

  private plegarReparto() {
    if (!this.repartoAbierto) return;
    this.repartoAbierto = false;
    this.pintarReparto();
  }

  /** Folded or open: the dock attribute drives the CSS; keyboard and screen readers only reach what is visible. */
  private pintarReparto() {
    const abierto = this.repartoAbierto;
    this.dock.dataset.abierto = String(abierto);
    const botones = [...this.dock.querySelectorAll<HTMLButtonElement>('.pj')];
    botones.forEach((b, n) => {
      b.tabIndex = abierto || n === 0 ? 0 : -1;
      if (n > 0) b.setAttribute('aria-hidden', String(!abierto));
    });
    const primero = botones[0];
    if (!primero) return;
    primero.setAttribute('aria-expanded', String(abierto));
    const nombre = REPARTO[primero.dataset.id as PjId]?.nombre ?? '';
    primero.setAttribute('aria-label', abierto ? primero.dataset.etiqueta ?? nombre : `${texto('selector.titulo')} (${nombre})`);
  }

  // ------------------------------------------------------------ objective

  objetivo(t: string | null, hora: string) {
    this.objEl.hidden = !t;
    if (t) {
      this.objTexto.textContent = t;
      this.reloj.textContent = hora;
    }
  }

  // ------------------------------------------------------------ bag

  setBolsa(items: string[]) {
    const nuevo = items.find((i) => !this.items.includes(i));
    this.items = [...items];
    this.cuenta.textContent = String(items.length);
    this.cuenta.hidden = items.length === 0;
    if (nuevo) {
      this.bolsaBtn.classList.remove('salta');
      void this.bolsaBtn.offsetWidth;
      this.bolsaBtn.classList.add('salta');
    }
    if (this.seleccionado && !items.includes(this.seleccionado)) this.seleccionar(null);
    this.pintarBandeja();
  }

  private pintarBandeja() {
    if (!this.items.length) {
      this.bandeja.replaceChildren(h('p', { class: 'vacia' }, texto('bolsa.vacia')));
      return;
    }
    this.bandeja.replaceChildren(
      ...this.items.map((id) => {
        const card = h('div', { class: 'objeto' });
        const usar = h('button', {
          class: 'usar',
          'data-id': id,
          'aria-pressed': String(this.seleccionado === id),
          'aria-label': texto(`objeto.${id}`),
          onclick: (e) => {
            e.stopPropagation();
            const otro = this.seleccionado;
            // One item chosen and another tapped: put them together.
            if (otro && otro !== id) {
              this.seleccionar(null);
              this.cerrarBandeja();
              this.ev.combinar(otro, id);
            } else this.seleccionar(otro === id ? null : id);
          },
        });
        usar.innerHTML = icono(id);
        usar.append(h('span', { class: 'nombre' }, texto(`objeto.${id}`)));
        const mirar = boton('mirar', texto('boton.mirar'), () => {
          this.cerrarBandeja();
          this.ev.mirarObjeto(id);
        }, 'mirar');
        card.append(usar, mirar);
        return card;
      }),
    );
  }

  abrirBandeja(abrir?: boolean) {
    const open = abrir ?? this.bandeja.dataset.abierta !== 'true';
    this.bandeja.dataset.abierta = String(open);
    this.bolsaBtn.setAttribute('aria-expanded', String(open));
  }

  cerrarBandeja() {
    this.abrirBandeja(false);
  }

  seleccionar(id: string | null) {
    this.seleccionado = id;
    this.usandoEl.hidden = !id;
    if (id) {
      this.usandoEl.replaceChildren(h('span', { class: 'icono' }), h('span', {}, texto('bolsa.usando', { objeto: texto(`objeto.${id}`) })), h('small', {}, texto('bolsa.cancelar')));
      this.usandoEl.querySelector('.icono')!.innerHTML = icono(id);
      this.cerrarBandeja();
    }
    this.pintarBandeja();
    this.ev.seleccionar(id);
  }

  // ------------------------------------------------------------ dialogue

  get enDialogo() {
    return !!this.avance;
  }

  /** A list of lines to choose from is on screen. */
  get enOpciones() {
    return this.opcionesAbiertas > 0;
  }

  /**
   * The player left in the middle of a conversation: the line on screen is closed and its wait ends,
   * as if tapped through to the end. The script goes on by itself (`Aventura.saltando`).
   */
  saltarDialogo() {
    this.escribiendo = null;
    const a = this.avance;
    this.cerrarDialogo();
    a?.();
  }

  /** Show a line; resolves when the player taps past it. */
  decir(quien: Quien, frase: string, animo = 'neutral', hora?: string): Promise<void> {
    this.cerrarBandeja();
    this.plegarReparto();
    this.ayudaEl.hidden = true;
    this.ayudaT = 0;
    if (!this.dialogoEl) {
      this.dialogoEl = h('div', { class: 'dialogo vidrio', role: 'status', 'aria-live': 'polite' });
      this.root.append(this.dialogoEl);
    }
    const d = this.dialogoEl;
    const nombre = quien === null ? null : quien === 'aceituna' ? NOMBRE_ACEITUNA : quien === 'sombra' ? texto('nombre.sombra') : esNpc(quien) ? NPCS[quien].nombre : REPARTO[quien].nombre;
    const color = quien === null ? '' : quien === 'aceituna' ? COLOR_ACEITUNA : quien === 'sombra' ? COLOR_SOMBRA : esNpc(quien) ? NPCS[quien].color : REPARTO[quien].color;
    d.className = `dialogo vidrio${quien === null ? ' narrador' : ''}`;
    d.style.setProperty('--color', color);
    const linea = h('p', { class: 'linea' });
    this.retratoEl = quien === null ? null : h('div', { class: 'retrato' });
    this.retratoDe = quien === null ? null : { quien, animo };
    this.retratoKey = '';
    this.retratoCv = null;
    this.retratoPrecalentado = false;
    d.replaceChildren(...[this.retratoEl, h('div', { class: 'cuerpo' }, nombre ? h('div', { class: 'quien' }, nombre, hora ? h('small', {}, ` · ${hora}`) : null) : null, linea), h('span', { class: 'sigue', 'aria-hidden': 'true' }, '▸')].filter(Boolean) as Node[]);
    this.escribiendo = { full: frase, shown: 0, el: linea };
    this.hablando = quien;
    this.pintarRetrato('reposo');
    return new Promise((resolve) => {
      this.avance = () => {
        this.avance = null;
        this.hablando = null;
        resolve();
      };
    });
  }

  /** Tap during a dialogue: finish the line, or go to the next one. */
  tocarDialogo() {
    if (this.escribiendo && this.escribiendo.shown < this.escribiendo.full.length) {
      this.escribiendo.shown = this.escribiendo.full.length;
      this.escribiendo.el.textContent = this.escribiendo.full;
      return;
    }
    this.escribiendo = null;
    const a = this.avance;
    a?.();
  }

  cerrarDialogo() {
    this.dialogoEl?.remove();
    this.dialogoEl = null;
    this.retratoEl = null;
  }

  private pintarRetrato(boca: string) {
    if (!this.retratoEl || !this.retratoDe) return;
    const key = `${this.retratoDe.animo}|${boca}|${this.parpadeo < 0 ? 1 : 0}`;
    if (key === this.retratoKey) return;
    this.retratoKey = key;
    const q = this.retratoDe.quien;
    const ropa = q === 'aceituna' || q === 'sombra' || esNpc(q) ? undefined : this.ropas[q];
    const pose = { mood: this.retratoDe.animo, mouthKind: boca === 'reposo' ? undefined : boca, blink: this.parpadeo < 0, ropa };
    // The face is a bitmap drawn on a canvas (never SVG parsed again at each mouth change); if the pose is not made yet, the
    // previous face stays until it is, and only the latest wanted pose is drawn when it arrives.
    let cv = this.retratoCv;
    if (!cv || cv.parentElement !== this.retratoEl) {
      cv = document.createElement('canvas');
      cv.width = cv.height = 224;
      this.retratoEl.replaceChildren(cv);
      this.retratoCv = cv;
    }
    const lienzo = cv;
    const poner = (b: HTMLCanvasElement) => {
      if (this.retratoCv !== lienzo || this.retratoKey !== key || !b.width) return;
      const x = lienzo.getContext('2d')!;
      x.clearRect(0, 0, lienzo.width, lienzo.height);
      x.drawImage(b, 0, 0, lienzo.width, lienzo.height);
    };
    const ya = retratoYa(q, pose);
    if (ya) poner(ya);
    else
      retratoBitmap(q, pose).then(poner, () => {
        // Last resort: the SVG itself.
        if (this.retratoCv === lienzo && this.retratoKey === key) this.retratoEl!.innerHTML = retrato(q, pose);
      });
    // The other mouths of this face are made in the background, so the next ones are there when the line asks for them.
    if (!this.retratoPrecalentado) {
      this.retratoPrecalentado = true;
      for (const m of ['a', 'o', 'e', 'm']) void retratoBitmap(q, { ...pose, mouthKind: m }).catch(() => {});
    }
  }

  // ------------------------------------------------------------ help, labels, ring

  ayuda(t: string, segundos = 6) {
    this.ayudaEl.replaceChildren(h('span', { class: 'mano' }), h('span', {}, t));
    this.ayudaEl.querySelector('.mano')!.innerHTML = ICONOS.mano;
    this.ayudaEl.hidden = false;
    this.ayudaT = segundos;
  }

  etiqueta(t: string, x: number, y: number) {
    const el = h('div', { class: 'etiqueta', style: `left:${x}px;top:${y}px` }, t);
    this.root.append(el);
    setTimeout(() => el.remove(), 1400);
  }

  aviso(t: string, item?: string) {
    const el = h('div', { class: 'aviso vidrio' }, h('span', { class: 'icono' }), t);
    if (item) el.querySelector('.icono')!.innerHTML = icono(item);
    this.root.append(el);
    setTimeout(() => el.remove(), 2600);
  }

  fps(t: string | null) {
    this.fpsEl.hidden = !t;
    if (t) this.fpsEl.textContent = t;
  }

  setVisible(v: boolean) {
    if (!v) this.plegarReparto();
    this.root.dataset.oculto = String(!v);
  }

  /** Who to play: one big card per protagonist, with where their story starts. */
  eleccion(titulo: string, opciones: Array<{ id: PjId; situacion: string; camino: boolean }>): Promise<PjId> {
    return new Promise((resolve) => {
      const tarjetas = opciones.map((o) => {
        const F = REPARTO[o.id];
        const b = h(
          'button',
          {
            class: `eleccion-pj${o.camino ? ' camino' : ''}`,
            'data-id': o.id,
            style: `--color:${F.color}`,
            disabled: o.camino,
            onclick: (e) => {
              e.stopPropagation();
              el.remove();
              resolve(o.id);
            },
          },
          h('span', { class: 'cara' }),
          h('span', { class: 'nombre' }, F.nombre),
          h('span', { class: 'situacion' }, o.camino ? texto('selector.camino') : o.situacion),
        );
        b.querySelector('.cara')!.innerHTML = retrato(o.id, { mood: o.camino ? 'happy' : F.arte.INFO.defaultMood });
        return b;
      });
      const el = this.cubrir('eleccion', h('div', { class: 'pila' }, h('h2', {}, titulo), h('div', { class: 'quienes' }, ...tarjetas)));
    });
  }

  /** Lines to choose from in a conversation (Pablo trying to make Vero laugh); resolves with the index. */
  opciones(lista: string[]): Promise<number> {
    this.cerrarBandeja();
    this.plegarReparto();
    this.opcionesAbiertas++;
    return new Promise((resolve) => {
      // A tap meant for the line before must not pick an option the moment they appear.
      const desde = performance.now();
      const el = h(
        'div',
        { class: 'opciones-dialogo' },
        ...lista.map((t, i) =>
          h(
            'button',
            {
              class: 'opcion-dialogo vidrio',
              onclick: (e) => {
                e.stopPropagation();
                if (performance.now() - desde < 450) return;
                el.remove();
                this.opcionesAbiertas--;
                resolve(i);
              },
            },
            t,
          ),
        ),
      );
      // Just above the line being answered, if there is one on screen.
      const d = this.dialogoEl?.isConnected ? this.dialogoEl.getBoundingClientRect() : null;
      if (d && d.height) el.style.bottom = `${this.root.getBoundingClientRect().bottom - d.top + 10}px`;
      this.root.append(el);
    });
  }

  /** A title card over the faded scene (a story ends, or the chapter: `clase` 'continuara'); resolves on tap. */
  rotulo(titulo: string, sub: string, quien?: PjId, clase = ''): Promise<void> {
    return new Promise((resolve) => {
      const cara = quien ? h('div', { class: 'cara', style: `--color:${REPARTO[quien].color}` }) : null;
      if (cara && quien) cara.innerHTML = retrato(quien, { mood: 'happy' });
      const el = this.cubrir(`rotulo ${clase}`.trim(), h('div', { class: 'pila' }, cara, h('h2', {}, titulo), h('p', {}, sub), h('div', { class: 'toca' }, texto('rotulo.toca'))));
      // A tap meant for the last line of dialogue must not skip the card.
      const desde = performance.now();
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (performance.now() - desde < 600) return;
        el.remove();
        resolve();
      });
    });
  }

  /** Full-screen card (title, pause menu, end of the pilot). */
  cubrir(clase: string, ...kids: Node[]) {
    const el = h('div', { class: `cubierta ${clase}` }, ...kids);
    this.root.parentElement!.append(el);
    return el;
  }

  // ------------------------------------------------------------ frame

  update(dt: number) {
    const w = this.escribiendo;
    let boca = 'reposo';
    if (w && w.shown < w.full.length) {
      w.shown = Math.min(w.full.length, w.shown + dt * 42);
      const n = Math.floor(w.shown);
      w.el.textContent = w.full.slice(0, n);
      boca = VISEMA(w.full[n - 1]?.toLowerCase() ?? ' ');
    } else if (w) {
      this.hablando = null;
    }
    this.parpadeo -= dt;
    if (this.parpadeo < -0.13) this.parpadeo = 2 + Math.random() * 3;
    this.pintarRetrato(boca);
    if (this.ayudaT > 0) {
      this.ayudaT -= dt;
      if (this.ayudaT <= 0) this.ayudaEl.hidden = true;
    }
  }
}
