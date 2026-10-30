// PokéUsera · AVENTURA: the small pieces its screens share (bottle-cap badges, dark silhouettes, a yes/no box).
// Everything static is baked once (`hornear`); nothing here is drawn from vector shapes per frame.
import { TINTA2 } from '../arte2/paleta2';
import { hornear, mezclar, panelCacheado } from '../arte2/ui2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { miniatura } from '../pantallas/fondos';
import { sobre } from '../pantallas/modal';
import { boton, centrado, oscurecer, t } from '../pantallas/ui';

/** Side of a badge. */
export const LADO_CHAPA = 13;

/**
 * A bottle cap (the badge a beaten boss gives): fluted edge, the boss's colour and a light centre.
 * `color` null: the empty slot (a grey cap without shine). Baked per colour.
 */
export function chapa(ctx: CanvasRenderingContext2D, x: number, y: number, color: string | null): void {
  const c = hornear(`caza|chapa|${color ?? '-'}`, LADO_CHAPA, LADO_CHAPA, (cx) => {
    const centro = (LADO_CHAPA - 1) / 2;
    for (let j = 0; j < LADO_CHAPA; j++) {
      for (let i = 0; i < LADO_CHAPA; i++) {
        const dx = i - centro;
        const dy = j - centro;
        const d = Math.hypot(dx, dy);
        const R = 6.2 + (Math.cos(Math.atan2(dy, dx) * 10) > 0.1 ? 0.5 : -0.3);
        if (d > R) continue;
        let col: string;
        if (d > R - 1.1) col = color ? TINTA2 : '#8a7690';
        else if (!color) col = d > 3.4 ? '#c9b998' : '#ddd0b2';
        else if (d > 3.4) col = color;
        else col = mezclar(color, '#ffffff', 0.5);
        if (color && d <= 3.4 && dx + dy < -1.5) col = '#ffffff';
        cx.fillStyle = col;
        cx.fillRect(i, j, 1, 1);
      }
    }
  });
  ctx.drawImage(c, x, y);
}

/** The 32×32 thumbnail of a userito as a dark silhouette (one you have not caught yet), baked once per id. */
export function silueta(id: string): HTMLCanvasElement {
  return hornear(`caza|sil|${id}`, 32, 32, (cx) => {
    cx.drawImage(miniatura(id), 0, 0);
    cx.globalCompositeOperation = 'source-in';
    cx.fillStyle = '#5e4a64';
    cx.fillRect(0, 0, 32, 32);
  });
}

/** A yes/no box over `base`; NO is marked first. Resolves true for SÍ. */
export function confirmar(base: Escena | null, lineas: string[]): Promise<boolean> {
  return sobre<boolean>(base, (cerrar) => {
    let sel = 1;
    const fin = (v: boolean) => {
      sonido.efecto(v ? 'aceptar' : 'atras');
      cerrar(v);
    };
    return {
      estatica: true,
      dibujar(ctx) {
        const H = pantalla().alto;
        const w = ANCHO - 24;
        const h = 22 + lineas.length * 14 + 12 + 30 + 10;
        const y = Math.round((H - h) / 2);
        oscurecer(ctx, H);
        panelCacheado(ctx, 12, y, w, h);
        lineas.forEach((l, i) => centrado(ctx, l, y + 14 + i * 14));
        const bw = 80;
        const yb = y + h - 40;
        boton(ctx, 12 + 18, yb, bw, 30, t('pausa.si'), sel === 0);
        boton(ctx, 12 + w - 18 - bw, yb, bw, 30, t('pausa.no'), sel === 1);
        entrada.zona(12 + 18, yb, bw, 30, () => fin(true));
        entrada.zona(12 + w - 18 - bw, yb, bw, 30, () => fin(false));
      },
      accion(a) {
        if (a === 'izq' || a === 'der' || a === 'arriba' || a === 'abajo') {
          sel = 1 - sel;
          sonido.efecto('cursor');
        } else if (a === 'aceptar') fin(sel === 0);
        else if (a === 'atras') fin(false);
      },
    };
  });
}
