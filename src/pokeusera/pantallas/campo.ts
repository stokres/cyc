// PokéUsera · a real text field laid over the canvas (the canvas cannot type), styled like a Game Boy one. Used by the online password
// screen (red/sala.ts) and the account screens (pantallas/cuenta.ts).
import { PAPEL_ALTO, TINTA2 } from '../arte2/paleta2';
import { ANCHO, pantalla } from '../pantalla';
import { t } from './ui';

export interface OpcionesCampo {
  /** Text key of the accessible label. */
  etiqueta: string;
  /** Longest text, in characters. */
  max?: number;
  /** Shows (and the screen reads) capitals: the recovery code. */
  mayusculas?: boolean;
}

export class Campo {
  readonly el: HTMLInputElement;
  private ultimo = '';

  constructor(valor: string, etiqueta: string | OpcionesCampo) {
    const o: OpcionesCampo = typeof etiqueta === 'string' ? { etiqueta } : etiqueta;
    const el = document.createElement('input');
    el.type = 'text';
    el.value = valor;
    el.maxLength = o.max ?? 64;
    el.autocomplete = 'off';
    el.setAttribute('autocapitalize', o.mayusculas ? 'characters' : 'none');
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('spellcheck', 'false');
    el.setAttribute('enterkeyhint', 'go');
    el.setAttribute('aria-label', t(o.etiqueta));
    el.style.cssText = `position:fixed;z-index:20;box-sizing:border-box;margin:0;padding:0 6px;border:3px solid ${TINTA2};border-radius:4px;background:${PAPEL_ALTO};color:${TINTA2};font-family:ui-monospace,Menlo,Consolas,"Courier New",monospace;font-weight:700;letter-spacing:1px;outline:none;box-shadow:inset 0 0 0 2px #e0a83a;user-select:text;-webkit-user-select:text;touch-action:manipulation;caret-color:${TINTA2};${o.mayusculas ? 'text-transform:uppercase;' : ''}`;
    document.body.appendChild(el);
    this.el = el;
  }

  /** Puts the field over the logical rectangle (x, y, w, h) of the canvas. */
  colocar(x: number, y: number, w: number, h: number) {
    const r = pantalla().canvas.getBoundingClientRect();
    const s = r.width / ANCHO;
    const clave = [r.left, r.top, r.width, x, y, w, h].join(',');
    if (clave === this.ultimo) return;
    this.ultimo = clave;
    const st = this.el.style;
    st.left = `${r.left + x * s}px`;
    st.top = `${r.top + y * s}px`;
    st.width = `${w * s}px`;
    st.height = `${h * s}px`;
    // 16 px or more, so phones do not zoom in when the field gets the focus.
    st.fontSize = `${Math.max(16, Math.round(10 * s))}px`;
  }

  mostrar(v: boolean) {
    this.el.style.visibility = v ? 'visible' : 'hidden';
  }

  quitar() {
    this.el.remove();
  }
}
