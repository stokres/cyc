// PokéUsera · settings: music and effects volume (0–10, saved in localStorage 'pokeusera.v1'),
// the settings screen, and the pause box of the battle (volumes + abandon).
import type { EntrenadorId } from '../tipos';
import { ENTRENADORES } from '../tipos';
import { anchoTexto2 } from '../arte2/fuente2';
import { PAPEL_ALTO, SOMBRA_TEXTO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { panelCacheado, relleno } from '../arte2/ui2';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { dibujarFondoBar } from './fondos';
import { abrirGuia } from './guia';
import { sobre } from './modal';
import { VELOCIDADES, boton, centrado, cfg, flecha, mover, oscurecer, realce, rect, t, texto2, type Velocidad } from './ui';

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

/** The battle speed row: the label and «◀ NORMAL ▶» (LENTA / NORMAL / RÁPIDA). Height 44. */
export function filaVelocidad(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, sel: boolean) {
  if (sel) realce(ctx, x, y, w, 44);
  texto2(ctx, t('ajustes.velocidad'), x + 18, y + 6, TINTA2, sel ? '#f0c860' : SOMBRA_TEXTO);
  const i = VELOCIDADES.indexOf(cfg.velocidad);
  const valor = t(`velocidad.${cfg.velocidad}`);
  const yy = y + 21;
  const cx = x + Math.floor(w / 2);
  relleno(ctx, TINTA2, cx - 36, yy - 1, 72, 17);
  relleno(ctx, PAPEL_ALTO, cx - 35, yy, 70, 15);
  rect(ctx, '#d6c08a', cx - 33, yy + 13, 66, 1);
  texto2(ctx, valor, cx - Math.floor(anchoTexto2(valor) / 2), yy + 4, TINTA2, null);
  flecha(ctx, cx - 54, yy + 4, -1, i > 0 ? TINTA2 : '#a898a8');
  flecha(ctx, cx + 49, yy + 4, 1, i < VELOCIDADES.length - 1 ? TINTA2 : '#a898a8');
  entrada.zona(cx - 76, yy - 4, 36, 26, () => cambiarVelocidad(VELOCIDADES[Math.max(0, i - 1)]));
  entrada.zona(cx + 40, yy - 4, 36, 26, () => cambiarVelocidad(VELOCIDADES[Math.min(VELOCIDADES.length - 1, i + 1)]));
  // Tapping the value goes round.
  entrada.zona(cx - 37, yy - 4, 74, 26, () => cambiarVelocidad(VELOCIDADES[(i + 1) % VELOCIDADES.length]));
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

/** One volume row (height 30): label, ◀, ten segments, ▶. Registers its tap zones. */
export function filaVolumen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, canal: Canal, sel: boolean) {
  const v = nivel(canal);
  if (sel) realce(ctx, x, y, w, 30);
  texto2(ctx, t(`ajustes.${canal}`), x + 18, y + 11, TINTA2, sel ? '#f0c860' : SOMBRA_TEXTO);
  const bx = x + w - 6 - 5 - 4 - 110 - 5 - 4;
  flecha(ctx, bx, y + 11, -1, v > 0 ? TINTA2 : '#a898a8');
  for (let i = 0; i < 10; i++) {
    const sx = bx + 10 + i * 11;
    relleno(ctx, TINTA2, sx, y + 7, 10, 16);
    rect(ctx, i < v ? '#e0a83a' : '#8a7690', sx + 1, y + 8, 8, 14);
    if (i < v) {
      rect(ctx, '#fff0a0', sx + 1, y + 8, 8, 2);
      rect(ctx, '#a8741c', sx + 1, y + 20, 8, 2);
    }
    entrada.zona(sx, y, 11, 30, () => cambiar(canal, i + 1));
  }
  flecha(ctx, bx + 10 + 110 + 3, y + 11, 1, v < 10 ? TINTA2 : '#a898a8');
  entrada.zona(bx - 6, y, 16, 30, () => cambiar(canal, v - 1));
  entrada.zona(bx + 10 + 110, y, 18, 30, () => cambiar(canal, v + 1));
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
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.3);
        const tit = t('ajustes.titulo');
        const tw = anchoTexto2(tit) + 40;
        panelCacheado(ctx, Math.floor((ANCHO - tw) / 2), 22, tw, 26);
        centrado(ctx, tit, 32);
        const y0 = 70 + Math.round((H - 384) * 0.1);
        const x = 8;
        const w = ANCHO - 16;
        panelCacheado(ctx, x, y0, w, 138);
        filaVolumen(ctx, x + 6, y0 + 10, w - 12, 'musica', sel === 0);
        filaVolumen(ctx, x + 6, y0 + 44, w - 12, 'efectos', sel === 1);
        filaVelocidad(ctx, x + 6, y0 + 78, w - 12, sel === 2);
        entrada.zona(x, y0 + 8, 80, 34, () => (sel = 0));
        entrada.zona(x, y0 + 42, 80, 34, () => (sel = 1));
        entrada.zona(x, y0 + 76, w, 18, () => (sel = 2));
        const yb = Math.min(H - 44, y0 + 138 + 24);
        boton(ctx, Math.floor((ANCHO - 100) / 2), yb, 100, 28, t('ajustes.volver'), sel === 3);
        entrada.zona(Math.floor((ANCHO - 100) / 2), yb, 100, 28, salir);
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

/** The pause box of the battle: volumes, battle speed, GUÍA (opens over the battle), ABANDONAR (with a «sure?» step), SEGUIR. */
export function menuPausa(base: Escena | null): Promise<'seguir' | 'abandonar'> {
  return sobre<'seguir' | 'abandonar'>(base, (cerrar) => {
    let sel = 5;
    let seguro = false;
    let selSeguro = 1;
    const seguir = () => {
      sonido.efecto('atras');
      cerrar('seguir');
    };
    const guia = () => {
      sel = 3;
      sonido.efecto('aceptar');
      // Over this very box (it and the battle under it keep running); closing the guide brings the box back.
      void abrirGuia(pantalla().escena);
    };
    return {
      dibujar(ctx) {
        const x = 6;
        const w = ANCHO - 12;
        oscurecer(ctx, pantalla().alto);
        if (!seguro) {
          const h = 274;
          const y = Math.max(20, Math.round((pantalla().alto - h) / 2));
          panelCacheado(ctx, x, y, w, h);
          texto2(ctx, t('pausa.titulo'), x + 14, y + 12, TINTA_SUAVE);
          filaVolumen(ctx, x + 6, y + 28, w - 12, 'musica', sel === 0);
          filaVolumen(ctx, x + 6, y + 60, w - 12, 'efectos', sel === 1);
          filaVelocidad(ctx, x + 6, y + 92, w - 12, sel === 2);
          entrada.zona(x, y + 26, 80, 32, () => (sel = 0));
          entrada.zona(x, y + 58, 80, 32, () => (sel = 1));
          entrada.zona(x, y + 90, w, 18, () => (sel = 2));
          boton(ctx, x + 14, y + 148, w - 28, 30, t('menu.guia'), sel === 3);
          entrada.zona(x + 14, y + 148, w - 28, 30, guia);
          boton(ctx, x + 14, y + 190, w - 28, 30, t('pausa.abandonar'), sel === 4);
          entrada.zona(x + 14, y + 190, w - 28, 30, () => {
            sel = 4;
            seguro = true;
            selSeguro = 1;
          });
          boton(ctx, x + 14, y + 232, w - 28, 30, t('pausa.seguir'), sel === 5);
          entrada.zona(x + 14, y + 232, w - 28, 30, seguir);
        } else {
          const h = 96;
          const y = Math.round((pantalla().alto - h) / 2);
          panelCacheado(ctx, x, y, w, h);
          centrado(ctx, t('pausa.seguro'), y + 16);
          const bw = 80;
          boton(ctx, x + 18, y + 46, bw, 30, t('pausa.si'), selSeguro === 0);
          boton(ctx, x + w - 18 - bw, y + 46, bw, 30, t('pausa.no'), selSeguro === 1);
          entrada.zona(x + 18, y + 46, bw, 30, () => cerrar('abandonar'));
          entrada.zona(x + w - 18 - bw, y + 46, bw, 30, () => (seguro = false));
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
          sel = mover(sel, 6, a);
          sonido.efecto('cursor');
        } else if (a === 'izq' || a === 'der') {
          if (sel < 2) ajustarCanal(sel === 0 ? 'musica' : 'efectos', a);
          else if (sel === 2) ajustarVelocidad(a);
        } else if (a === 'aceptar') {
          if (sel === 3) guia();
          else if (sel === 4) {
            seguro = true;
            selSeguro = 1;
          } else if (sel === 5) seguir();
        }
        return true;
      },
    };
  });
}
