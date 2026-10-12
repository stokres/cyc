// Tiny DOM helpers shared by the Pang's screens (plain DOM, no framework).

type Attrs = Record<string, string | boolean | ((e: Event) => void)>;

/** Builds an element: attributes (functions are event listeners), then children. */
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

/** 12345 → «12 345» (non-breaking space), the way scores read in the machine. */
export const miles = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/**
 * Puts `el` in the UI layer and resolves with whatever `preparar` passes to its `resolver`.
 * `preparar` wires the screen up and may return a cleanup (timers, key listeners). When the
 * screen ends the layer is emptied, so the next screen (or the game behind) shows.
 */
export function mostrar<T>(ui: HTMLElement, el: HTMLElement, preparar: (resolver: (v: T) => void) => void | (() => void)): Promise<T> {
  ui.replaceChildren(el);
  return new Promise<T>((resolve) => {
    let hecho = false;
    let limpiar: void | (() => void);
    const resolver = (v: T) => {
      if (hecho) return;
      hecho = true;
      limpiar?.();
      if (el.parentNode === ui) ui.replaceChildren();
      resolve(v);
    };
    limpiar = preparar(resolver);
  });
}

/** A button of the Pang's UI. */
export function boton(etiqueta: string, alPulsar: () => void, clase = ''): HTMLButtonElement {
  const b = h('button', { type: 'button', class: `pg-btn ${clase}`.trim() }, etiqueta);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    alPulsar();
  });
  return b;
}

/** Escape / Enter-style keys while a screen is open. Returns the function that stops listening. */
export function alTeclear(f: (e: KeyboardEvent) => void): () => void {
  document.addEventListener('keydown', f);
  return () => document.removeEventListener('keydown', f);
}
