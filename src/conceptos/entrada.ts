// Controls of «Una más» (docs/JUGABILIDAD.md): on the left, ← → (one pad: the thumb can slide from one to the other); on the right, jump, attack and
// nothing else: the skills are automatic (double jump on jumping again in the air, ...), so there is no skill button. The keyboard works at the
// same time and its keys are shown on the buttons on a computer: arrows or A/D, Space to jump, Z or J to attack, Esc or P to pause.
// Everything writes into one `Mandos`.
import { texto } from '../juego/textos';

export interface Mandos {
  izq: boolean;
  der: boolean;
  abajo: boolean;
  saltar: boolean;
  atacar: boolean;
  /** Presses the game has not taken yet (each is consumed by `tomar`). */
  saltarP: boolean;
  atacarP: boolean;
  pausaP: boolean;
  /** A tap on the screen itself (advances the talk). */
  tocarP: boolean;
}

export interface Entrada {
  mandos: Mandos;
  /** Shows or hides the touch buttons (hidden in talks and cut-scenes). */
  mostrar(si: boolean): void;
  soltarTodo(): void;
  /** Takes a pending press: true once. */
  tomar(k: 'saltarP' | 'atacarP' | 'pausaP' | 'tocarP'): boolean;
  destruir(): void;
}

const CSS = `
.um-capa{--b:clamp(66px,23vh,108px);--m:max(12px,env(safe-area-inset-left,0px));--mr:max(14px,env(safe-area-inset-right,0px));--mb:max(10px,env(safe-area-inset-bottom,0px));display:contents}
.um-ctl{position:absolute;box-sizing:border-box;border:2px solid #c9a24a;background:rgba(14,8,34,.5);color:#fff;font:700 clamp(12px,3.9vh,18px)/1.05 'Alegreya Sans',sans-serif;letter-spacing:.03em;text-transform:uppercase;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;pointer-events:auto;text-align:center;z-index:7;border-radius:50%}
.um-ctl small{display:none;font:600 clamp(10px,2.8vh,13px) 'Alegreya Sans',sans-serif;opacity:.8;text-transform:none;margin-top:2px;padding:0 6px;border:1px solid rgba(255,255,255,.5);border-radius:5px}
@media (pointer:fine){.um-ctl small{display:block}}
.um-ctl.um-on{background:rgba(201,162,74,.6)}
.um-pad{left:var(--m);bottom:var(--mb);display:flex;gap:8px;background:none;border:0;padding:0;border-radius:0;flex-direction:row}
.um-pad>div{width:var(--b);height:var(--b);box-sizing:border-box;border:2px solid #c9a24a;background:rgba(14,8,34,.5);border-radius:22px;display:flex;align-items:center;justify-content:center;pointer-events:none;font-size:clamp(24px,8vh,40px)}
.um-pad>div.um-on{background:rgba(201,162,74,.6)}
.um-saltar{right:var(--mr);bottom:var(--mb);width:calc(var(--b) * 1.22);height:calc(var(--b) * 1.22)}
.um-atacar{right:calc(var(--mr) + var(--b) * 1.22 + 12px);bottom:var(--mb);width:var(--b);height:var(--b)}
.um-oculto .um-ctl{display:none}
`;

export function crearEntrada(raiz: HTMLElement): Entrada {
  const mandos: Mandos = { izq: false, der: false, abajo: false, saltar: false, atacar: false, saltarP: false, atacarP: false, pausaP: false, tocarP: false };
  const teclas = new Set<string>();
  const tactil = { izq: false, der: false, saltar: false, atacar: false };
  const sumar = () => {
    mandos.izq = tactil.izq || teclas.has('izq');
    mandos.der = tactil.der || teclas.has('der');
    mandos.abajo = teclas.has('abajo');
    mandos.saltar = tactil.saltar || teclas.has('saltar');
    mandos.atacar = tactil.atacar || teclas.has('atacar');
  };

  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);
  const capa = document.createElement('div');
  capa.className = 'um-capa';
  raiz.appendChild(capa);
  const caja = (clase: string, html = '') => {
    const d = document.createElement('div');
    d.className = clase;
    d.innerHTML = html;
    capa.appendChild(d);
    return d;
  };

  // ---- the pad
  const pad = caja('um-ctl um-pad', '<div>◀</div><div>▶</div>');
  const lados = [...pad.children] as HTMLElement[];
  const dedos = new Map<number, number>();
  const leer = () => {
    const ds = [...dedos.values()];
    tactil.izq = ds.includes(-1);
    tactil.der = ds.includes(1);
    lados[0].classList.toggle('um-on', tactil.izq);
    lados[1].classList.toggle('um-on', tactil.der);
    sumar();
  };
  const ladoDe = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect();
    return e.clientX < r.left + r.width / 2 ? -1 : 1;
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      pad.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointers cannot be captured */
    }
    dedos.set(e.pointerId, ladoDe(e));
    leer();
  });
  pad.addEventListener('pointermove', (e) => {
    if (!dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, ladoDe(e));
    leer();
  });
  const sueltaPad = (e: PointerEvent) => {
    if (dedos.delete(e.pointerId)) leer();
  };
  pad.addEventListener('pointerup', sueltaPad);
  pad.addEventListener('pointercancel', sueltaPad);
  pad.addEventListener('lostpointercapture', sueltaPad);

  // ---- the buttons on the right
  const tecla = (k: string) => (k.length === 1 ? k : k);
  const boton = (clase: string, etiqueta: string, clave: string, k: 'saltar' | 'atacar', pulsa: 'saltarP' | 'atacarP') => {
    const b = caja(`um-ctl ${clase}`, `${etiqueta}<small>${tecla(clave)}</small>`);
    const dedosB = new Set<number>();
    const pon = () => {
      b.classList.toggle('um-on', dedosB.size > 0);
      tactil[k] = dedosB.size > 0;
      sumar();
    };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        b.setPointerCapture(e.pointerId);
      } catch {
        /* ditto */
      }
      dedosB.add(e.pointerId);
      mandos[pulsa] = true;
      pon();
    });
    const suelta = (e: PointerEvent) => {
      if (dedosB.delete(e.pointerId)) pon();
    };
    b.addEventListener('pointerup', suelta);
    b.addEventListener('pointercancel', suelta);
    b.addEventListener('lostpointercapture', suelta);
    return b;
  };
  boton('um-saltar', texto('mando.saltar'), texto('mando.tecla.saltar'), 'saltar', 'saltarP');
  boton('um-atacar', texto('mando.atacar'), texto('mando.tecla.atacar'), 'atacar', 'atacarP');

  // ---- the keyboard
  const MAPA: Record<string, string> = {
    ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der', ArrowDown: 'abajo', KeyS: 'abajo',
    Space: 'saltar', ArrowUp: 'saltar', KeyW: 'saltar', KeyZ: 'atacar', KeyJ: 'atacar',
  };
  const abajo = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      if (!e.repeat) mandos.pausaP = true;
      return;
    }
    const k = MAPA[e.code];
    if (!k) return;
    e.preventDefault();
    if (e.repeat) return;
    teclas.add(k);
    if (k === 'saltar') mandos.saltarP = true;
    if (k === 'atacar') mandos.atacarP = true;
    if (k === 'saltar' || k === 'atacar') mandos.tocarP = true;
    sumar();
  };
  const arriba = (e: KeyboardEvent) => {
    const k = MAPA[e.code];
    if (!k) return;
    e.preventDefault();
    teclas.delete(k);
    sumar();
  };
  const soltarTodo = () => {
    teclas.clear();
    dedos.clear();
    tactil.saltar = tactil.atacar = false;
    for (const b of capa.querySelectorAll('.um-on')) b.classList.remove('um-on');
    leer();
    mandos.saltarP = mandos.atacarP = mandos.pausaP = mandos.tocarP = false;
    sumar();
  };
  const alOcultar = () => {
    if (document.hidden) soltarTodo();
  };
  // A tap anywhere on the cover advances the dialogue.
  const alTocar = () => {
    mandos.tocarP = true;
  };
  window.addEventListener('keydown', abajo);
  window.addEventListener('keyup', arriba);
  window.addEventListener('blur', soltarTodo);
  document.addEventListener('visibilitychange', alOcultar);
  raiz.addEventListener('pointerdown', alTocar);
  const sinMenu = (e: Event) => e.preventDefault();
  raiz.addEventListener('contextmenu', sinMenu);
  raiz.addEventListener('gesturestart', sinMenu);

  return {
    mandos,
    mostrar: (si) => raiz.classList.toggle('um-oculto', !si),
    soltarTodo,
    tomar(k) {
      const v = mandos[k];
      mandos[k] = false;
      return v;
    },
    destruir() {
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
      window.removeEventListener('blur', soltarTodo);
      document.removeEventListener('visibilitychange', alOcultar);
      raiz.removeEventListener('pointerdown', alTocar);
      raiz.removeEventListener('contextmenu', sinMenu);
      raiz.removeEventListener('gesturestart', sinMenu);
      estilo.remove();
      capa.remove();
    },
  };
}
