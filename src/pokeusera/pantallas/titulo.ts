// PokéUsera · title screen: logo, a slow parade of userito front sprites (64×64, breathing two frames a
// second) over the Bar del Brío, «TOCA PARA EMPEZAR».
import { logo2 } from '../arte2/logo2';
import { spriteFrente2 } from '../arte2/sprites2';
import { ESPECIES } from '../datos';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { panelCacheado } from '../arte2/ui2';
import { anchoTexto2 } from '../arte2/fuente2';
import { dibujarBandeja, dibujarFondoBar, pieSprite, plataformaCacheada } from './fondos';
import { Firma, centrado, parpadea, reposo, t, texto2 } from './ui';

/** Draws the logo centred at the top. Returns the y where it ends. */
export function dibujarLogo(ctx: CanvasRenderingContext2D, y: number): number {
  const lg = logo2();
  ctx.drawImage(lg, Math.floor((ANCHO - lg.width) / 2), y);
  return y + lg.height;
}

export function pantallaTitulo(): Promise<void> {
  return new Promise((res) => {
    const p = pantalla();
    // The parade starts at a random place so it is not always the same face first.
    const ids = ESPECIES.map((s) => s.id);
    const desfase = Math.floor(Math.random() * ids.length);
    let listo = false;
    const seguir = () => {
      if (listo) return;
      listo = true;
      sonido.efecto('aceptar');
      res();
    };
    sonido.musica('titulo');
    // What moves here: the parade's scroll (whole pixels), each userito's hop (whole pixels) and breathing frame,
    // and the blinking prompt. `paso` computes them like `dibujar` does and asks for a redraw only when one changes.
    const SEP = 80;
    const firma = new Firma(3 + 2 * 5);
    const e: Escena = {
      paso: (_dt, ahora) => {
        const desp = ahora * 0.016;
        const base = Math.floor(desp / SEP);
        const v = firma.v;
        v[0] = base;
        v[1] = Math.round(8 - (desp % SEP));
        v[2] = parpadea(ahora, 600) ? 1 : 0;
        for (let k = -1; k < 4; k++) {
          const idx = (base + k + desfase) % ids.length;
          v[3 + 2 * (k + 1)] = Math.round(-Math.abs(Math.sin(ahora / 230 + idx)) * 5);
          v[4 + 2 * (k + 1)] = reposo(ahora, idx * 190);
        }
        return firma.cambio();
      },
      dibujar(ctx, ahora) {
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.12);
        dibujarLogo(ctx, 18 + Math.round((H - 384) * 0.08));
        // Parade: the useritos walk from right to left on beer mats, hopping a little.
        const yPies = Math.round(H * 0.6);
        const desp = ahora * 0.016;
        const sep = 80;
        const base = Math.floor(desp / sep);
        const fase = desp % sep;
        const mat = plataformaCacheada(26, 5);
        for (let k = -1; k < 4; k++) {
          const idx = (base + k + desfase) % ids.length;
          const xx = Math.round(k * sep - fase + 8);
          const salto = Math.abs(Math.sin(ahora / 230 + idx)) * 5;
          const sp = spriteFrente2(ids[idx], reposo(ahora, idx * 190));
          ctx.drawImage(mat, xx + 32 - Math.floor(mat.width / 2), yPies - 13);
          ctx.drawImage(sp, xx, Math.round(yPies - pieSprite(sp) - 2 - salto));
        }
        if (parpadea(ahora, 600)) {
          const s = t('titulo.toca');
          const w = anchoTexto2(s) + 36;
          const x = Math.floor((ANCHO - w) / 2);
          const y = Math.round(H * 0.74);
          panelCacheado(ctx, x, y, w, 28);
          centrado(ctx, s, y + 11);
        }
        const cred = t('titulo.credito');
        dibujarBandeja(ctx, H - 22, H);
        texto2(ctx, cred, Math.floor((ANCHO - anchoTexto2(cred)) / 2), H - 15, '#f0e2b8', null);
        entrada.zona(0, 0, ANCHO, H, seguir);
      },
      accion(a) {
        if (a === 'aceptar') seguir();
        return false;
      },
    };
    p.poner(e);
  });
}
