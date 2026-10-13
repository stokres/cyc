// PokéUsera · settings: music and effects volume (0–10, saved in localStorage 'pokeusera.v1'),
// the settings screen, and the pause box of the battle (volumes + abandon).
import type { EntrenadorId } from '../tipos';
import { ENTRENADORES } from '../tipos';
import { anchoTexto, dibujarMini, dibujarTexto } from '../arte/fuente';
import { marco } from '../arte/marcos';
import { CLARO, FONDO, NEGRO, OSCURO, PAPEL } from '../arte/paleta';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { sobre } from './modal';
import { VELOCIDADES, boton, centrado, cfg, flecha, mover, rect, t, type Velocidad } from './ui';

const CLAVE = 'pokeusera.v1';

export interface Guardado {
  musica: number;
  efectos: number;
  /** Battle pacing (VELOCIDAD DEL COMBATE). */
  velocidad: Velocidad;
  entrenador?: EntrenadorId;
}

const POR_DEFECTO: Guardado = { musica: 7, efectos: 10, velocidad: 'normal' };

export function cargarAjustes(): Guardado {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) {
      const o = JSON.parse(raw) as Partial<Guardado>;
      const n = (v: unknown, def: number) => (typeof v === 'number' && v >= 0 && v <= 10 ? Math.round(v) : def);
      return {
        musica: n(o.musica, POR_DEFECTO.musica),
        efectos: n(o.efectos, POR_DEFECTO.efectos),
        velocidad: VELOCIDADES.includes(o.velocidad as Velocidad) ? (o.velocidad as Velocidad) : POR_DEFECTO.velocidad,
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

/** Applies the saved volumes and battle speed (call once at start). */
export function aplicarAjustes() {
  const g = cargarAjustes();
  sonido.setVolumen('musica', g.musica / 10);
  sonido.setVolumen('efectos', g.efectos / 10);
  cfg.velocidad = g.velocidad;
}

function cambiarVelocidad(v: Velocidad) {
  if (v === cfg.velocidad) return;
  cfg.velocidad = v;
  guardarAjustes({ velocidad: v });
  sonido.efecto('cursor');
}

/** The battle speed row: the label (tiny font) and «◀ NORMAL ▶» (LENTA / NORMAL / RÁPIDA). Height 24. */
export function filaVelocidad(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, sel: boolean) {
  dibujarMini(ctx, t('ajustes.velocidad'), x + 7, y + 1, NEGRO);
  if (sel) flecha(ctx, x, y - 1, 1);
  const i = VELOCIDADES.indexOf(cfg.velocidad);
  const valor = t(`velocidad.${cfg.velocidad}`);
  const yy = y + 11;
  const cx = x + Math.floor(w / 2);
  rect(ctx, NEGRO, cx - 33, yy - 1, 66, 12);
  rect(ctx, PAPEL, cx - 32, yy, 64, 10);
  dibujarTexto(ctx, valor, cx - Math.floor(anchoTexto(valor) / 2), yy + 1, NEGRO);
  flecha(ctx, cx - 47, yy + 2, -1, i > 0 ? NEGRO : CLARO);
  flecha(ctx, cx + 43, yy + 2, 1, i < VELOCIDADES.length - 1 ? NEGRO : CLARO);
  entrada.zona(cx - 56, yy - 4, 22, 18, () => cambiarVelocidad(VELOCIDADES[Math.max(0, i - 1)]));
  entrada.zona(cx + 34, yy - 4, 22, 18, () => cambiarVelocidad(VELOCIDADES[Math.min(VELOCIDADES.length - 1, i + 1)]));
  // Tapping the value goes round.
  entrada.zona(cx - 33, yy - 4, 66, 18, () => cambiarVelocidad(VELOCIDADES[(i + 1) % VELOCIDADES.length]));
}

export function ajustarVelocidad(a: Accion) {
  const i = VELOCIDADES.indexOf(cfg.velocidad);
  if (a === 'izq') cambiarVelocidad(VELOCIDADES[Math.max(0, i - 1)]);
  else if (a === 'der') cambiarVelocidad(VELOCIDADES[Math.min(VELOCIDADES.length - 1, i + 1)]);
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
        rect(ctx, FONDO, 0, 0, ANCHO, p.alto);
        centrado(ctx, t('ajustes.titulo'), 20, NEGRO, { escala: 2, sombra: CLARO });
        const y0 = 64;
        marco(ctx, 5, y0 - 12, ANCHO - 10, 104);
        filaVolumen(ctx, 8, y0, 'musica', sel === 0);
        filaVolumen(ctx, 8, y0 + 24, 'efectos', sel === 1);
        filaVelocidad(ctx, 10, y0 + 52, ANCHO - 20, sel === 2);
        entrada.zona(8, y0 - 2, 70, 18, () => (sel = 0));
        entrada.zona(8, y0 + 22, 70, 18, () => (sel = 1));
        const yb = p.alto - 40;
        boton(ctx, Math.floor((ANCHO - 80) / 2), yb, 80, 22, t('ajustes.volver'), sel === 3);
        entrada.zona(Math.floor((ANCHO - 80) / 2), yb, 80, 22, salir);
      },
      accion(a) {
        if (a === 'atras') salir();
        else if (a === 'arriba' || a === 'abajo') {
          sel = mover(sel, 4, a);
          sonido.efecto('cursor');
        } else if (a === 'izq' || a === 'der') {
          if (sel < 2) ajustarCanal(sel === 0 ? 'musica' : 'efectos', a);
          else if (sel === 2) ajustarVelocidad(a);
        } else if (a === 'aceptar' && sel === 3) salir();
        return true;
      },
    };
    p.poner(e);
  });
}

/** The pause box of the battle: volumes, battle speed, ABANDONAR (with a «sure?» step), VOLVER. */
export function menuPausa(base: Escena | null): Promise<'seguir' | 'abandonar'> {
  return sobre<'seguir' | 'abandonar'>(base, (cerrar) => {
    let sel = 4;
    let seguro = false;
    let selSeguro = 1;
    const seguir = () => {
      sonido.efecto('atras');
      cerrar('seguir');
    };
    return {
      dibujar(ctx) {
        const x = 4;
        const w = ANCHO - 8;
        if (!seguro) {
          const h = 148;
          const y = Math.max(20, Math.round((pantalla().alto - h) / 2));
          marco(ctx, x, y, w, h);
          dibujarTexto(ctx, t('pausa.titulo'), x + 12, y + 8, OSCURO);
          filaVolumen(ctx, x + 2, y + 24, 'musica', sel === 0);
          filaVolumen(ctx, x + 2, y + 44, 'efectos', sel === 1);
          filaVelocidad(ctx, x + 4, y + 68, w - 8, sel === 2);
          entrada.zona(x + 2, y + 22, 70, 18, () => (sel = 0));
          entrada.zona(x + 2, y + 42, 70, 18, () => (sel = 1));
          boton(ctx, x + 8, y + 98, w - 16, 20, t('pausa.abandonar'), sel === 3);
          entrada.zona(x + 8, y + 98, w - 16, 20, () => {
            sel = 3;
            seguro = true;
            selSeguro = 1;
          });
          boton(ctx, x + 8, y + 122, w - 16, 20, t('pausa.seguir'), sel === 4);
          entrada.zona(x + 8, y + 122, w - 16, 20, seguir);
        } else {
          const y = Math.round((pantalla().alto - 76) / 2);
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
          sel = mover(sel, 5, a);
          sonido.efecto('cursor');
        } else if (a === 'izq' || a === 'der') {
          if (sel < 2) ajustarCanal(sel === 0 ? 'musica' : 'efectos', a);
          else if (sel === 2) ajustarVelocidad(a);
        } else if (a === 'aceptar') {
          if (sel === 3) {
            seguro = true;
            selSeguro = 1;
          } else if (sel === 4) seguir();
        }
        return true;
      },
    };
  });
}
