// Controls of the Pang: touch buttons (a DOM overlay over the canvas, multi-touch) and the
// keyboard. Both write into the same `Mandos`, which the game reads on every step.
// The held buttons are plain booleans; `disparo`, `especial` and `pausa` are presses the
// game takes (sets back to false) once.
import { texto } from '../juego/textos';

export interface Mandos {
  izq: boolean;
  der: boolean;
  arriba: boolean;
  abajo: boolean;
  /** Fire button held (for the machine-gun, which repeats). */
  fuego: boolean;
  /** Presses, not yet taken by the game. */
  disparo: boolean;
  especial: boolean;
  /** ↑ pressed on the keyboard: climbs at a ladder, otherwise fires the special (Jesús, 12 October 2026). */
  subeOEspecial: boolean;
  pausa: boolean;
}

export const mandosNuevos = (): Mandos => ({ izq: false, der: false, arriba: false, abajo: false, fuego: false, disparo: false, especial: false, subeOEspecial: false, pausa: false });

export interface Entrada {
  mandos: Mandos;
  /** The special button lights up when the bar is full. */
  especialLista(si: boolean): void;
  /** Shows or hides the on-screen buttons (hidden while the pause menu is open). */
  mostrar(si: boolean): void;
  /** Lets go of everything (after a pause or when the page is hidden). */
  soltarTodo(): void;
  destruir(): void;
}

const CSS = `
.pg-capa{--b:clamp(64px,22vh,96px);--f:clamp(64px,24vh,100px);--e:clamp(46px,14vh,60px);--m:max(14px,env(safe-area-inset-left,0px));display:contents}
.pg-ctl{position:absolute;box-sizing:border-box;border:1.5px solid #c9a24a;background:rgba(10,14,30,.45);color:#fff;font:700 clamp(18px,6vh,28px)/1 'Alegreya Sans',sans-serif;display:flex;align-items:center;justify-content:center;touch-action:none;-webkit-tap-highlight-color:transparent;border-radius:14px;pointer-events:auto;text-align:center}
.pg-ctl.pg-on{background:rgba(201,162,74,.5)}
.pg-pad{left:0;bottom:0;display:flex;gap:6px;background:none;border:0;border-radius:0;padding:32px 32px max(14px,env(safe-area-inset-bottom,0px)) max(14px,env(safe-area-inset-left,0px))}
.pg-pad>div{width:calc(var(--b)*1.15);height:var(--b);box-sizing:border-box;border:1.5px solid #c9a24a;background:rgba(10,14,30,.28);color:rgba(255,255,255,.85);font-size:clamp(22px,8vh,36px);border-radius:14px;display:flex;align-items:center;justify-content:center;pointer-events:none}
.pg-pad>div.pg-on{background:rgba(201,162,74,.5)}
.pg-vert{position:absolute;left:var(--m);bottom:calc(max(14px,env(safe-area-inset-bottom,0px)) + 32px + var(--b) + 6px);width:calc(var(--b)*2.3 + 6px);display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:0;padding:0;pointer-events:none}
.pg-vert>.pg-ctl{position:static;width:calc(var(--b)*1.15);height:calc(var(--b)*.7);font-size:clamp(22px,8vh,36px)}
.pg-fuego{right:max(14px,env(safe-area-inset-right,0px));bottom:max(14px,env(safe-area-inset-bottom,0px));width:var(--f);height:var(--f);border-radius:50%;font-size:clamp(13px,4.2vh,18px);letter-spacing:.02em;text-transform:uppercase}
.pg-esp{right:calc(max(14px,env(safe-area-inset-right,0px)) + var(--f) + 12px);bottom:calc(max(14px,env(safe-area-inset-bottom,0px)) + var(--f) * .55);width:var(--e);height:var(--e);border-radius:50%;font-size:clamp(10px,3.2vh,14px);line-height:1.1;padding:2px;opacity:.4}
.pg-esp.pg-listo{opacity:1;background:rgba(201,162,74,.55);animation:pg-late .7s ease-in-out infinite alternate}
@keyframes pg-late{from{transform:scale(1)}to{transform:scale(1.1)}}
.pg-boton-pausa{top:max(10px,env(safe-area-inset-top,0px));right:max(10px,env(safe-area-inset-right,0px));width:44px;height:44px;border-radius:10px;font-size:16px}
.pg-teclas{position:absolute;top:max(8px,env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);max-width:70%;padding:5px 12px;border-radius:10px;background:rgba(10,14,30,.6);border:1.5px solid #c9a24a;color:#fff;font:700 clamp(11px,3.4vh,15px)/1.2 'Alegreya Sans',sans-serif;text-align:center;pointer-events:none;transition:opacity .8s}
.pg-teclas.pg-fuera{opacity:0}
.pg-oculto .pg-teclas{display:none}
.pg-oculto .pg-ctl,.pg-oculto .pg-pad,.pg-oculto .pg-vert{display:none}
`;

/** Makes a element a hold-to-press button; several fingers on several buttons work at once. */
function sostener(el: HTMLElement, cambio: (pulsado: boolean) => void) {
  const dedos = new Set<number>();
  const poner = () => {
    el.classList.toggle('pg-on', dedos.size > 0);
    cambio(dedos.size > 0);
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointers cannot be captured */
    }
    dedos.add(e.pointerId);
    poner();
  });
  const suelta = (e: PointerEvent) => {
    if (dedos.delete(e.pointerId)) poner();
  };
  el.addEventListener('pointerup', suelta);
  el.addEventListener('pointercancel', suelta);
  el.addEventListener('lostpointercapture', suelta);
  return () => {
    dedos.clear();
    poner();
  };
}

export function crearEntrada(raiz: HTMLElement, opc: { escaleras: boolean; pausa?: boolean }): Entrada {
  const mandos = mandosNuevos();
  const teclas = new Set<string>();
  const tactil = { izq: false, der: false, arriba: false, abajo: false, fuego: false };
  const sumar = () => {
    mandos.izq = tactil.izq || teclas.has('izq');
    mandos.der = tactil.der || teclas.has('der');
    mandos.arriba = tactil.arriba || teclas.has('arriba');
    mandos.abajo = tactil.abajo || teclas.has('abajo');
    mandos.fuego = tactil.fuego || teclas.has('fuego');
  };

  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);
  const capa = document.createElement('div');
  capa.className = 'pg-capa';
  raiz.appendChild(capa);
  const caja = (clase: string, html = '') => {
    const d = document.createElement('div');
    d.className = clase;
    d.innerHTML = html;
    capa.appendChild(d);
    return d;
  };
  const sueltas: Array<() => void> = [];

  // ◀ ▶: one pad (its padding is an invisible extra touch area: the whole bottom-left corner); the finger can slide from one side to the other.
  const pad = caja('pg-ctl pg-pad', '<div>◀</div><div>▶</div>');
  const lados = [...pad.children] as HTMLElement[];
  const dedos = new Map<number, number>();
  const leer = () => {
    const ds = [...dedos.values()];
    tactil.izq = ds.includes(-1);
    tactil.der = ds.includes(1);
    lados[0].classList.toggle('pg-on', tactil.izq);
    lados[1].classList.toggle('pg-on', tactil.der);
    sumar();
  };
  // Left or right of the middle between the two visible buttons (the pad's own centre is off: its padding is not even).
  const dirDe = (e: PointerEvent) => (e.clientX < (lados[0].getBoundingClientRect().right + lados[1].getBoundingClientRect().left) / 2 ? -1 : 1);
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      pad.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointers cannot be captured */
    }
    dedos.set(e.pointerId, dirDe(e));
    leer();
  });
  pad.addEventListener('pointermove', (e) => {
    if (!dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, dirDe(e));
    leer();
  });
  const sueltaPad = (e: PointerEvent) => {
    if (dedos.delete(e.pointerId)) leer();
  };
  pad.addEventListener('pointerup', sueltaPad);
  pad.addEventListener('pointercancel', sueltaPad);
  pad.addEventListener('lostpointercapture', sueltaPad);
  sueltas.push(() => {
    dedos.clear();
    leer();
  });

  // ▲ ▼ only where there are ladders.
  if (opc.escaleras) {
    const vert = caja('pg-vert');
    for (const [glifo, k] of [['▲', 'arriba'], ['▼', 'abajo']] as const) {
      const b = document.createElement('div');
      b.className = 'pg-ctl';
      b.textContent = glifo;
      vert.appendChild(b);
      sueltas.push(
        sostener(b, (p) => {
          tactil[k] = p;
          sumar();
        }),
      );
    }
  }

  const fuego = caja('pg-ctl pg-fuego');
  // With a mouse and keyboard (no touch screen) the buttons also say their key; E is THE key for the special in both Pangs.
  const teclado = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const conTecla = (nombre: string, tecla: string) => (teclado ? `${texto(nombre)} [${texto(tecla)}]` : texto(nombre));
  fuego.textContent = conTecla('boton.disparo', 'tecla.disparo');
  sueltas.push(
    sostener(fuego, (p) => {
      tactil.fuego = p;
      if (p) mandos.disparo = true;
      sumar();
    }),
  );

  const esp = caja('pg-ctl pg-esp');
  esp.textContent = conTecla('boton.especial', 'tecla.especial');
  sueltas.push(
    sostener(esp, (p) => {
      if (p) mandos.especial = true;
    }),
  );

  // Keyboard hint, only without touch: a short line at the top that goes away after a few seconds.
  let chuleta: HTMLElement | null = null;
  if (teclado) {
    chuleta = caja('pg-teclas', texto('pang.teclas'));
    const quitar = chuleta;
    setTimeout(() => quitar.classList.add('pg-fuera'), 9000);
  }

  // The pause button is for the full game; the chapter's short Pang has no pause.
  if (opc.pausa) {
    const pausa = caja('pg-ctl pg-boton-pausa', '❚❚');
    pausa.setAttribute('aria-label', texto('boton.pausa'));
    pausa.title = texto('boton.pausa');
    sueltas.push(
      sostener(pausa, (p) => {
        if (p) mandos.pausa = true;
      }),
    );
  }

  // Keyboard.
  const MAPA: Record<string, string> = {
    ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der', ArrowUp: 'arriba', KeyW: 'arriba', ArrowDown: 'abajo', KeyS: 'abajo',
    Space: 'fuego', KeyZ: 'fuego', KeyJ: 'fuego', KeyE: 'especial', KeyX: 'especial', ShiftLeft: 'especial', ShiftRight: 'especial', Escape: 'pausa', KeyP: 'pausa',
  };
  const abajo = (e: KeyboardEvent) => {
    const k = MAPA[e.code];
    if (!k) return;
    e.preventDefault();
    if (e.repeat) return;
    if (k === 'especial') mandos.especial = true;
    else if (k === 'pausa') mandos.pausa = true;
    else {
      teclas.add(k);
      if (k === 'fuego') mandos.disparo = true;
      if (k === 'arriba') mandos.subeOEspecial = true;
      sumar();
    }
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
    for (const f of sueltas) f();
    mandos.disparo = mandos.especial = mandos.subeOEspecial = mandos.pausa = false;
    sumar();
  };
  const alOcultar = () => {
    if (document.hidden) soltarTodo();
  };
  window.addEventListener('keydown', abajo);
  window.addEventListener('keyup', arriba);
  window.addEventListener('blur', soltarTodo);
  document.addEventListener('visibilitychange', alOcultar);
  const sinMenu = (e: Event) => e.preventDefault();
  raiz.addEventListener('contextmenu', sinMenu);
  raiz.addEventListener('gesturestart', sinMenu);

  return {
    mandos,
    especialLista: (si) => esp.classList.toggle('pg-listo', si),
    mostrar: (si) => raiz.classList.toggle('pg-oculto', !si),
    soltarTodo,
    destruir() {
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
      window.removeEventListener('blur', soltarTodo);
      document.removeEventListener('visibilitychange', alOcultar);
      raiz.removeEventListener('contextmenu', sinMenu);
      raiz.removeEventListener('gesturestart', sinMenu);
      estilo.remove();
      capa.remove();
    },
  };
}

