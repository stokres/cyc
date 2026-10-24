// «Vero se traga a Fran» (capítulo 2, tramo final): el plano del tráiler, la boca de Vero tan cerca que llena la
// pantalla (`dibujarVero`, src/ui/trailer.ts), pero a mitad de camino: la boca se abre del todo, Fran sube
// hasta ella y desaparece dentro; los otros tres saltan detrás y, al entrar, se deshacen en trozos de su
// color. Entre una fase y otra el guion habla (el cuadro de diálogo queda por encima: esta capa está por debajo
// de él), y al final la cámara se lanza dentro y todo se queda negro.
//
//   const boca = abrirBoca(root, { sonido, rapido });
//   await boca.abre();     la boca se abre
//   await boca.tragaFran(); Fran sube y desaparece
//   await boca.saltan();    Pablo, Chuchi y Guille saltan detrás y se deshacen
//   await boca.bucea();     la cámara se lanza dentro: negro
//   boca.cerrar();
//
// Rendimiento (docs/ESTILO.md, T5): las cuatro caras se hacen una vez como bitmaps (`crearFicha`); el fotograma
// dibuja la boca (unos pocos trazos de canvas, como el tráiler) y esos bitmaps. El bucle no pasa de 60 fps.
import { h } from './hud';
import { esVertical } from './orientacion';
import { crearFicha } from './fichas';
import { dibujarVero } from './trailer';
import { REPARTO, type PjId } from '../juego/reparto';
import type { SonidoMinijuego } from '../core/audio';

export interface OpcionesBoca {
  sonido?: SonidoMinijuego;
  /** Para las pruebas: sin esperas. */
  rapido?: boolean;
}

export interface Boca {
  abre(): Promise<void>;
  tragaFran(): Promise<void>;
  saltan(): Promise<void>;
  bucea(): Promise<void>;
  /** Se va con un fundido (quien llama ya ha puesto lo siguiente debajo) y se cierra. */
  fundir(): Promise<void>;
  cerrar(): void;
}

type Fase = 'abre' | 'quieta' | 'traga' | 'saltan' | 'bucea' | 'negro';

/** Dónde espera cada uno (fracciones de la pantalla) y cuánto tarda en saltar tras el anterior. */
const SITIOS: Record<PjId, { x: number; y: number }> = {
  fran: { x: 0.5, y: 0.64 },
  pablo: { x: 0.17, y: 0.54 },
  chuchi: { x: 0.83, y: 0.54 },
  guille: { x: 0.3, y: 0.64 },
};
const SALTAN: PjId[] = ['pablo', 'chuchi', 'guille'];
/** Segundos de cada fase. */
const DURACION = { abre: 1.5, traga: 1.3, salto: 0.85, entre: 0.5, bucea: 1.35 };
/** Instante de dibujarVero en el que la boca está abierta del todo, y en el que acaba su zambullida. */
const S_ABIERTA = 1.5;
const S_BUCEO = 1.6;

interface Trozo {
  a: number;
  v: number;
  r: number;
  giro: number;
  forma: number;
}

const trozos = (n: number, sem: number): Trozo[] => {
  let s = sem;
  const az = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => ({ a: az() * Math.PI * 2, v: 0.25 + az() * 0.6, r: 0.012 + az() * 0.02, giro: (az() - 0.5) * 12, forma: Math.floor(az() * 3) }));
};

export function abrirBoca(root: HTMLElement, o: OpcionesBoca = {}): Boca {
  const canvas = h('canvas', { class: 'plano', 'aria-hidden': 'true' });
  const capa = h('div', { class: 'capa-boca' }, canvas);
  root.append(capa);
  const ctx = canvas.getContext('2d')!;
  let W = 0;
  let Hh = 0;
  let dpr = 1;
  const caras = new Map<PjId, HTMLCanvasElement>();
  let R = 0;
  const medir = async () => {
    const caja = capa.getBoundingClientRect();
    const w = Math.max(2, caja.width);
    const hh = Math.max(2, caja.height);
    const d = Math.min(window.devicePixelRatio || 1, 2);
    if (w === W && hh === Hh && d === dpr && caras.size) return;
    W = w;
    Hh = hh;
    dpr = d;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(Hh * dpr);
    R = Math.max(14, Math.round(Hh * 0.085));
    const hechas = await Promise.all((Object.keys(SITIOS) as PjId[]).map(async (id) => [id, await crearFicha(id, { mood: id === 'fran' ? 'surprised' : 'neutral' }, R, Math.min(dpr, 1.5))] as const));
    for (const [id, c] of hechas) caras.set(id, c);
  };
  const lista = medir();
  const ro = new ResizeObserver(() => void medir());
  ro.observe(capa);

  let fase: Fase = 'abre';
  let t0 = 0;
  let sv = 0;
  let cerrado = false;
  let pendiente: (() => void) | null = null;
  let tiempo = 0;
  let ultimo = 0;
  const fragmentos = new Map<PjId, Trozo[]>(SALTAN.map((id, i) => [id, trozos(16, 11 + i * 7)]));
  const rapido = !!o.rapido;

  const termina = (f: Fase) => {
    fase = f;
    t0 = tiempo;
    const p = pendiente;
    pendiente = null;
    p?.();
  };
  const esperar = (): Promise<void> => (rapido ? Promise.resolve() : new Promise((r) => (pendiente = r)));

  // La boca (degradados y trazos de `dibujarVero`) solo cambia mientras se abre y se lanza: el resto del tiempo se
  // pinta una vez en un lienzo aparte y cada fotograma lo copia (solo se mueven las caras).
  let fondo: HTMLCanvasElement | null = null;
  let fondoSv = -1;
  const pintarBoca = () => {
    if (fase === 'abre' || fase === 'bucea') return dibujarVero(ctx, W, Hh, sv);
    if (!fondo || fondoSv !== sv || fondo.width !== canvas.width || fondo.height !== canvas.height) {
      fondo ??= document.createElement('canvas');
      fondo.width = canvas.width;
      fondo.height = canvas.height;
      const c = fondo.getContext('2d')!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      dibujarVero(c, W, Hh, sv);
      fondoSv = sv;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fondo, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const dibujar = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pintarBoca();
    const cx = W / 2;
    const bx = cx;
    const by = Hh * 0.52;
    const u = tiempo - t0;
    const cara = (id: PjId, x: number, y: number, k: number, a = 1, rot = 0) => {
      const c = caras.get(id);
      if (!c || k <= 0.01 || a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.drawImage(c, (-R * k), (-R * k), R * 2 * k, R * 2 * k);
      ctx.restore();
    };
    const bob = (n: number) => Math.sin(tiempo * 3 + n) * Hh * 0.008;
    // ---- Fran: espera delante de la boca, sube a ella y desaparece.
    if (fase === 'abre' || fase === 'quieta') cara('fran', SITIOS.fran.x * W, SITIOS.fran.y * Hh + bob(0), 1);
    else if (fase === 'traga') {
      const k = Math.min(1, u / DURACION.traga);
      const e = k * k * (3 - 2 * k);
      // Sube en arco hacia el centro de la boca, girando y encogiéndose.
      const x = SITIOS.fran.x * W + (bx - SITIOS.fran.x * W) * e;
      const y = SITIOS.fran.y * Hh + (by - SITIOS.fran.y * Hh) * e - Math.sin(e * Math.PI) * Hh * 0.34;
      cara('fran', x, y, 1 - 0.8 * e, 1 - Math.max(0, e - 0.8) * 5, e * 5);
    }
    // ---- Los otros esperan, saltan y se deshacen al entrar.
    SALTAN.forEach((id, i) => {
      const x0 = SITIOS[id].x * W;
      const y0 = SITIOS[id].y * Hh;
      if (fase === 'abre' || fase === 'quieta' || fase === 'traga') return cara(id, x0, y0 + bob(i + 1), 1);
      const ini = i * DURACION.entre;
      const k = (u - ini) / DURACION.salto;
      if (fase !== 'saltan') {
        // Después de saltar ya no están (se deshicieron).
        if (fase === 'bucea' || fase === 'negro') return;
        return cara(id, x0, y0, 1);
      }
      if (k < 0) return cara(id, x0, y0 + bob(i + 1), 1);
      if (k < 1) {
        const e = k * k * (3 - 2 * k);
        const x = x0 + (bx - x0) * e;
        const y = y0 + (by - y0) * e - Math.sin(e * Math.PI) * Hh * 0.22;
        return cara(id, x, y, 1 - 0.7 * e, 1 - Math.max(0, e - 0.85) * 6, e * (i % 2 ? -6 : 6));
      }
      // Se deshace en trozos de su color que salen disparados y se encogen.
      const d = k - 1;
      if (d > 0.9) return;
      ctx.save();
      ctx.fillStyle = REPARTO[id].color;
      for (const tr of fragmentos.get(id)!) {
        const dist = tr.v * Hh * 0.5 * (1 - (1 - d) * (1 - d));
        const r = Hh * tr.r * (1 - d / 0.9);
        const px = bx + Math.cos(tr.a) * dist;
        const py = by + Math.sin(tr.a) * dist - d * Hh * 0.06;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(tr.giro * d);
        if (tr.forma === 0) ctx.fillRect(-r, -r, r * 2, r * 2);
        else if (tr.forma === 1) {
          ctx.beginPath();
          ctx.moveTo(0, -r * 1.3);
          ctx.lineTo(r * 1.2, r);
          ctx.lineTo(-r * 1.2, r);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    });
  };

  let fotogramas = 0;
  const paso = (ahora: number) => {
    if (cerrado) return;
    requestAnimationFrame(paso);
    if (esVertical()) {
      ultimo = ahora;
      return;
    }
    // 60 fps como mucho, también en pantallas de 120 Hz.
    if (ultimo && ahora - ultimo < 1000 / 60 - 4) return;
    const dt = ultimo ? Math.min(0.1, (ahora - ultimo) / 1000) : 0;
    ultimo = ahora;
    tiempo += dt;
    const u = tiempo - t0;
    if (fase === 'abre') {
      sv = Math.min(S_ABIERTA, u * (S_ABIERTA / DURACION.abre));
      if (u >= DURACION.abre) termina('quieta');
    } else if (fase === 'traga') {
      sv = S_ABIERTA;
      if (u >= DURACION.traga) termina('quieta');
    } else if (fase === 'saltan') {
      sv = S_ABIERTA;
      if (u >= DURACION.entre * (SALTAN.length - 1) + DURACION.salto * 1.9) termina('quieta');
    } else if (fase === 'bucea') {
      sv = S_BUCEO + (u / DURACION.bucea) * (2.95 - S_BUCEO);
      if (u >= DURACION.bucea) termina('negro');
    } else sv = fase === 'negro' ? 3 : S_ABIERTA;
    fotogramas++;
    dibujar();
  };

  void lista.then(() => {
    if (cerrado) return;
    dibujar();
    requestAnimationFrame(paso);
  });
  (window as unknown as { __boca?: unknown }).__boca = () => ({ fase, sv, fotogramas, cerrar: () => cerrar() });

  const ir = async (f: Fase): Promise<void> => {
    await lista;
    if (rapido) {
      fase = f === 'abre' ? 'quieta' : f;
      sv = f === 'bucea' ? 3 : S_ABIERTA;
      if (f === 'bucea') fase = 'negro';
      return;
    }
    fase = f;
    t0 = tiempo;
    await esperar();
  };

  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    ro.disconnect();
    delete (window as unknown as { __boca?: unknown }).__boca;
    capa.remove();
    canvas.width = canvas.height = 0;
    for (const c of caras.values()) c.width = c.height = 0;
    caras.clear();
    if (fondo) fondo.width = fondo.height = 0;
    fondo = null;
  };

  return {
    abre: () => ir('abre'),
    tragaFran: () => ir('traga'),
    saltan: () => ir('saltan'),
    bucea: () => ir('bucea'),
    async fundir() {
      if (!rapido) {
        capa.style.transition = 'opacity 700ms ease-out';
        capa.style.opacity = '0';
        await new Promise((r) => setTimeout(r, 720));
      }
      cerrar();
    },
    cerrar,
  };
}
