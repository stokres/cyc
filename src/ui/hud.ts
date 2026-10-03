// DOM overlay over the scene: character dock, tools, objective and clock,
// bag, dialogue box with an animated portrait, first-time help and labels.
import { icono } from '../arte/objetos.mjs';
import { REPARTO, retrato, COLOR_ACEITUNA, COLOR_SOMBRA, NOMBRE_ACEITUNA, type PjId } from '../juego/reparto';
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
  private anilloEl: SVGSVGElement;
  private fpsEl: HTMLDivElement;
  private avance: (() => void) | null = null;
  private escribiendo: { full: string; shown: number; el: HTMLElement } | null = null;
  private retratoEl: HTMLDivElement | null = null;
  private retratoDe: { quien: Exclude<Quien, null>; animo: string } | null = null;
  private retratoKey = '';
  private parpadeo = 2;
  private items: string[] = [];
  seleccionado: string | null = null;
  /** Who is speaking right now (for lip sync in the scene). */
  hablando: Quien = null;

  constructor(parent: HTMLElement, private ev: HudEventos) {
    this.root = h('div', { class: 'ui' });
    parent.append(this.root);

    this.dock = h('div', { class: 'reparto', role: 'group', 'aria-label': texto('selector.titulo') });
    this.root.append(this.dock);

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

    this.anilloEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.anilloEl.setAttribute('class', 'anillo');
    this.anilloEl.setAttribute('viewBox', '0 0 64 64');
    this.anilloEl.innerHTML = '<circle cx="32" cy="32" r="26" pathLength="100" stroke-dasharray="0 100"/>';
    this.anilloEl.style.display = 'none';
    this.root.append(this.anilloEl);

    this.fpsEl = h('div', { class: 'fps vidrio', hidden: true });
    this.root.append(this.fpsEl);
  }

  // ------------------------------------------------------------ character dock

  setReparto(lista: EntradaReparto[], activo: PjId) {
    this.dock.replaceChildren(
      ...lista.map((e) => {
        const F = REPARTO[e.id];
        const b = h(
          'button',
          {
            class: `pj${e.camino ? ' camino' : ''}`,
            'aria-pressed': String(e.id === activo),
            'aria-label': `${F.nombre}${e.aqui ? '' : ` (${e.lugar})`}`,
            style: `--color:${F.color}`,
            onclick: (ev) => (ev.stopPropagation(), this.ev.elegir(e.id)),
          },
          h('span', { class: 'cara' }),
          h('span', { class: 'nombre' }, F.nombre),
          e.camino ? h('span', { class: 'hecho', 'aria-hidden': 'true' }, '✓') : null,
        );
        b.querySelector('.cara')!.innerHTML = retrato(e.id, { mood: F.arte.INFO.defaultMood });
        return b;
      }),
    );
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

  /** Show a line; resolves when the player taps past it. */
  decir(quien: Quien, frase: string, animo = 'neutral', hora?: string): Promise<void> {
    this.cerrarBandeja();
    this.ayudaEl.hidden = true;
    this.ayudaT = 0;
    if (!this.dialogoEl) {
      this.dialogoEl = h('div', { class: 'dialogo vidrio', role: 'status', 'aria-live': 'polite' });
      this.root.append(this.dialogoEl);
    }
    const d = this.dialogoEl;
    const nombre = quien === null ? null : quien === 'aceituna' ? NOMBRE_ACEITUNA : quien === 'sombra' ? texto('nombre.sombra') : REPARTO[quien].nombre;
    const color = quien === null ? '' : quien === 'aceituna' ? COLOR_ACEITUNA : quien === 'sombra' ? COLOR_SOMBRA : REPARTO[quien].color;
    d.className = `dialogo vidrio${quien === null ? ' narrador' : ''}`;
    d.style.setProperty('--color', color);
    const linea = h('p', { class: 'linea' });
    this.retratoEl = quien === null ? null : h('div', { class: 'retrato' });
    this.retratoDe = quien === null ? null : { quien, animo };
    this.retratoKey = '';
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
    this.retratoEl.innerHTML = retrato(this.retratoDe.quien, { mood: this.retratoDe.animo, mouthKind: boca === 'reposo' ? undefined : boca, blink: this.parpadeo < 0 });
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

  anillo(x: number | null, y: number, t: number) {
    if (x === null) {
      this.anilloEl.style.display = 'none';
      return;
    }
    this.anilloEl.style.display = 'block';
    this.anilloEl.style.left = `${x}px`;
    this.anilloEl.style.top = `${y}px`;
    this.anilloEl.querySelector('circle')!.setAttribute('stroke-dasharray', `${(t * 100).toFixed(1)} 100`);
  }

  fps(t: string | null) {
    this.fpsEl.hidden = !t;
    if (t) this.fpsEl.textContent = t;
  }

  setVisible(v: boolean) {
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

  /** A title card over the faded scene (a story ends); resolves on tap. */
  rotulo(titulo: string, sub: string, quien?: PjId): Promise<void> {
    return new Promise((resolve) => {
      const cara = quien ? h('div', { class: 'cara', style: `--color:${REPARTO[quien].color}` }) : null;
      if (cara && quien) cara.innerHTML = retrato(quien, { mood: 'happy' });
      const el = this.cubrir('rotulo', h('div', { class: 'pila' }, cara, h('h2', {}, titulo), h('p', {}, sub), h('div', { class: 'toca' }, texto('rotulo.toca'))));
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
