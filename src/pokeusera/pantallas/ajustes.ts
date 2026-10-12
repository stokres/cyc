// PokéUsera · settings: music and effects volume (0–10, saved in localStorage 'pokeusera.v1'),
// the settings screen, and the pause box of the battle (volumes + abandon).
import type { EntrenadorId } from '../tipos';
import { ENTRENADORES } from '../tipos';
import { dibujarTexto } from '../arte/fuente';
import { marco } from '../arte/marcos';
import { CLARO, FONDO, NEGRO, OSCURO } from '../arte/paleta';
import { entrada, type Accion } from '../entrada';
import { pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { sobre } from './modal';
import { boton, centrado, flecha, mover, rect, t } from './ui';

const CLAVE = 'pokeusera.v1';

export interface Guardado {
  musica: number;
  efectos: number;
  entrenador?: EntrenadorId;
}

const POR_DEFECTO: Guardado = { musica: 7, efectos: 10 };

export function cargarAjustes(): Guardado {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) {
      const o = JSON.parse(raw) as Partial<Guardado>;
      const n = (v: unknown, def: number) => (typeof v === 'number' && v >= 0 && v <= 10 ? Math.round(v) : def);
      return {
        musica: n(o.musica, POR_DEFECTO.musica),
        efectos: n(o.efectos, POR_DEFECTO.efectos),
        entrenador: ENTRENADORES.includes(o.entrenador as EntrenadorId) ? (o.entrenador as EntrenadorId) : undefined,
      };
    }
  } catch {
    /* no storage */
  }
  return { ...POR_DEFECTO };
}

export function guardarAjustes(parcial: Partial<Guardado>) {
  const g = { ...cargarAjustes(), ...parcial };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g));
  } catch {
    /* no storage */
  }
}

/** Applies the saved volumes to the sound (call once at start). */
export function aplicarAjustes() {
  const g = cargarAjustes();
  sonido.setVolumen('musica', g.musica / 10);
  sonido.setVolumen('efectos', g.efectos / 10);
}

type Canal = 'musica' | 'efectos';
const nivel = (c: Canal) => Math.round(sonido.getVolumen(c) * 10);

function cambiar(c: Canal, nuevo: number) {
  const v = Math.max(0, Math.min(10, nuevo));
  if (v === nivel(c)) return;
  sonido.setVolumen(c, v / 10);
  guardarAjustes({ [c]: v });
  sonido.efecto(c === 'efectos' ? 'aceptar' : 'cursor');
}

/** One volume row: label, ◀, ten segments, ▶. Registers its tap zones. */
export function filaVolumen(ctx: CanvasRenderingContext2D, x: number, y: number, canal: Canal, sel: boolean) {
  const v = nivel(canal);
  dibujarTexto(ctx, t(`ajustes.${canal}`), x + 7, y + 5, NEGRO);
  if (sel) flecha(ctx, x, y + 4, 1);
  const bx = x + 72;
  flecha(ctx, bx - 8, y + 4, -1, v > 0 ? NEGRO : CLARO);
  for (let i = 0; i < 10; i++) {
    rect(ctx, i < v ? NEGRO : CLARO, bx + i * 6, y + 3, 5, 9);
    entrada.zona(bx + i * 6, y - 2, 6, 18, () => cambiar(canal, i + 1));
  }
  flecha(ctx, bx + 62, y + 4, 1, v < 10 ? NEGRO : CLARO);
  entrada.zona(bx - 14, y - 2, 14, 18, () => cambiar(canal, v - 1));
  entrada.zona(bx + 60, y - 2, 14, 18, () => cambiar(canal, v + 1));
}

export function ajustarCanal(canal: Canal, a: Accion) {
  if (a === 'izq') cambiar(canal, nivel(canal) - 1);
  else if (a === 'der') cambiar(canal, nivel(canal) + 1);
}

/** The settings screen; resolves when the player goes back. */
export function pantallaAjustes(): Promise<void> {
  return new Promise((res) => {
    const p = pantalla();
    let sel = 0;
    const salir = () => {
      sonido.efecto('atras');
      res();
    };
    const e: Escena = {
      dibujar(ctx) {
        rect(ctx, FONDO, 0, 0, 160, p.alto);
        centrado(ctx, t('ajustes.titulo'), 20, NEGRO, { escala: 2, sombra: CLARO });
        const y0 = 64;
        marco(ctx, 5, y0 - 12, 150, 78);
        filaVolumen(ctx, 8, y0, 'musica', sel === 0);
        filaVolumen(ctx, 8, y0 + 26, 'efectos', sel === 1);
        entrada.zona(8, y0 - 2, 70, 18, () => (sel = 0));
        entrada.zona(8, y0 + 24, 70, 18, () => (sel = 1));
        const yb = p.alto - 40;
        boton(ctx, 40, yb, 80, 22, t('ajustes.volver'), sel === 2);
        entrada.zona(40, yb, 80, 22, salir);
      },
      accion(a) {
        if (a === 'atras') salir();
        else if (a === 'arriba' || a === 'abajo') {
          sel = mover(sel, 3, a);
          sonido.efecto('cursor');
        } else if (a === 'izq' || a === 'der') {
          if (sel < 2) ajustarCanal(sel === 0 ? 'musica' : 'efectos', a);
        } else if (a === 'aceptar' && sel === 2) salir();
        return true;
      },
    };
    p.poner(e);
  });
}

/** The pause box of the battle: volumes, ABANDONAR (with a «sure?» step), VOLVER. */
export function menuPausa(base: Escena | null): Promise<'seguir' | 'abandonar'> {
  return sobre<'seguir' | 'abandonar'>(base, (cerrar) => {
    let sel = 3;
    let seguro = false;
    let selSeguro = 1;
    const seguir = () => {
      sonido.efecto('atras');
      cerrar('seguir');
    };
    return {
      dibujar(ctx) {
        const x = 4;
        const w = 152;
        if (!seguro) {
          const y = 72;
          marco(ctx, x, y, w, 120);
          dibujarTexto(ctx, t('pausa.titulo'), x + 12, y + 8, OSCURO);
          filaVolumen(ctx, x + 2, y + 24, 'musica', sel === 0);
          filaVolumen(ctx, x + 2, y + 46, 'efectos', sel === 1);
          entrada.zona(x + 2, y + 22, 70, 18, () => (sel = 0));
          entrada.zona(x + 2, y + 44, 70, 18, () => (sel = 1));
          boton(ctx, x + 8, y + 70, w - 16, 20, t('pausa.abandonar'), sel === 2);
          entrada.zona(x + 8, y + 70, w - 16, 20, () => {
            sel = 2;
            seguro = true;
            selSeguro = 1;
          });
          boton(ctx, x + 8, y + 94, w - 16, 20, t('pausa.seguir'), sel === 3);
          entrada.zona(x + 8, y + 94, w - 16, 20, seguir);
        } else {
          const y = 84;
          marco(ctx, x, y, w, 76);
          centrado(ctx, t('pausa.seguro'), y + 12, NEGRO);
          const bw = 56;
          boton(ctx, x + 10, y + 36, bw, 24, t('pausa.si'), selSeguro === 0);
          boton(ctx, x + w - 10 - bw, y + 36, bw, 24, t('pausa.no'), selSeguro === 1);
          entrada.zona(x + 10, y + 36, bw, 24, () => cerrar('abandonar'));
          entrada.zona(x + w - 10 - bw, y + 36, bw, 24, () => (seguro = false));
        }
      },
      accion(a) {
        if (seguro) {
          if (a === 'izq' || a === 'der' || a === 'arriba' || a === 'abajo') selSeguro = 1 - selSeguro;
          else if (a === 'atras') seguro = false;
          else if (a === 'aceptar') {
            if (selSeguro === 0) cerrar('abandonar');
            else seguro = false;
          }
          return true;
        }
        if (a === 'atras') seguir();
        else if (a === 'arriba' || a === 'abajo') {
          sel = mover(sel, 4, a);
          sonido.efecto('cursor');
        } else if (a === 'izq' || a === 'der') {
          if (sel < 2) ajustarCanal(sel === 0 ? 'musica' : 'efectos', a);
        } else if (a === 'aceptar') {
          if (sel === 2) {
            seguro = true;
            selSeguro = 1;
          } else if (sel === 3) seguir();
        }
        return true;
      },
    };
  });
}

