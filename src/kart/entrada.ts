// Controls of Impropios Kart: two big steering buttons (◀ ▶, one pad: the finger can slide from one to the other)
// and a big item button, as a DOM overlay over the screen (multi-touch), plus the keyboard (arrows or A/D and
// space). Both write into the same `Mandos`. The car accelerates by itself; holding a steering button through a
// bend is what makes the kart drift.
import { texto } from '../juego/textos';

export interface Mandos {
  izq: boolean;
  der: boolean;
  /** Item button held, and a press the game has not taken yet. */
  item: boolean;
  itemPulsado: boolean;
}

export interface Entrada {
  mandos: Mandos;
  mostrar(si: boolean): void;
  soltarTodo(): void;
  destruir(): void;
}

const CSS = `
.kt-capa{--b:clamp(70px,24vh,118px);--m:max(12px,env(safe-area-inset-left,0px));display:contents}
.kt-ctl{position:absolute;box-sizing:border-box;border:2px solid #c9a24a;background:rgba(10,14,30,.42);color:#fff;font:700 clamp(26px,9vh,44px)/1 'Alegreya Sans',sans-serif;display:flex;align-items:center;justify-content:center;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;pointer-events:auto;text-align:center;z-index:7}
.kt-ctl.kt-on{background:rgba(201,162,74,.55)}
.kt-pad{left:var(--m);bottom:max(12px,env(safe-area-inset-bottom,0px));display:flex;gap:8px;background:none;border:0;padding:0}
.kt-pad>div{width:var(--b);height:var(--b);box-sizing:border-box;border:2px solid #c9a24a;background:rgba(10,14,30,.42);border-radius:20px;display:flex;align-items:center;justify-content:center;pointer-events:none}
.kt-pad>div.kt-on{background:rgba(201,162,74,.55)}
.kt-item{right:max(14px,env(safe-area-inset-right,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));width:calc(var(--b) * 1.3);height:calc(var(--b) * 1.3);border-radius:50%;font-size:clamp(13px,4.4vh,20px);letter-spacing:.03em;text-transform:uppercase}
.kt-item.kt-listo{background:rgba(201,162,74,.5);animation:kt-late .6s ease-in-out infinite alternate}
@keyframes kt-late{from{transform:scale(1)}to{transform:scale(1.07)}}
.kt-oculto .kt-ctl{display:none}
`;

export function crearEntrada(raiz: HTMLElement): Entrada {
  const mandos: Mandos = { izq: false, der: false, item: false, itemPulsado: false };
  const teclas = new Set<string>();
  const tactil = { izq: false, der: false, item: false };
  const sumar = () => {
    mandos.izq = tactil.izq || teclas.has('izq');
    mandos.der = tactil.der || teclas.has('der');
    mandos.item = tactil.item || teclas.has('item');
  };

  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);
  const capa = document.createElement('div');
  capa.className = 'kt-capa';
  raiz.appendChild(capa);
  const caja = (clase: string, html = '') => {
    const d = document.createElement('div');
    d.className = clase;
    d.innerHTML = html;
    capa.appendChild(d);
    return d;
  };

  const pad = caja('kt-ctl kt-pad', '<div>◀</div><div>▶</div>');
  const lados = [...pad.children] as HTMLElement[];
  const dedos = new Map<number, number>();
  const leer = () => {
    const ds = [...dedos.values()];
    tactil.izq = ds.includes(-1);
    tactil.der = ds.includes(1);
    lados[0].classList.toggle('kt-on', tactil.izq);
    lados[1].classList.toggle('kt-on', tactil.der);
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

  const item = caja('kt-ctl kt-item');
  item.textContent = texto('kart.item');
  const dedosItem = new Set<number>();
  const poneItem = () => {
    item.classList.toggle('kt-on', dedosItem.size > 0);
    tactil.item = dedosItem.size > 0;
    sumar();
  };
  item.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      item.setPointerCapture(e.pointerId);
    } catch {
      /* ditto */
    }
    dedosItem.add(e.pointerId);
    mandos.itemPulsado = true;
    poneItem();
  });
  const sueltaItem = (e: PointerEvent) => {
    if (dedosItem.delete(e.pointerId)) poneItem();
  };
  item.addEventListener('pointerup', sueltaItem);
  item.addEventListener('pointercancel', sueltaItem);
  item.addEventListener('lostpointercapture', sueltaItem);

  const MAPA: Record<string, string> = { ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der', Space: 'item', ArrowUp: 'item', KeyZ: 'item', KeyX: 'item', ShiftLeft: 'item', ShiftRight: 'item' };
  const abajo = (e: KeyboardEvent) => {
    const k = MAPA[e.code];
    if (!k) return;
    e.preventDefault();
    if (e.repeat) return;
    teclas.add(k);
    if (k === 'item') mandos.itemPulsado = true;
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
    dedosItem.clear();
    leer();
    poneItem();
    mandos.itemPulsado = false;
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
    mostrar: (si) => raiz.classList.toggle('kt-oculto', !si),
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
