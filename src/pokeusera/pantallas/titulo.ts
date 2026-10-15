// PokéUsera · title screen: logo over a night street in Usera (fondoTitulo.ts: baked layers, a few drawImage a
// frame), four useritos partying at the door of the Bar del Brío (64×64, breathing two frames a second),
// «TOCA PARA EMPEZAR».
import { logo2 } from '../arte2/logo2';
import { spriteFrente2 } from '../arte2/sprites2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { panelCacheado } from '../arte2/ui2';
import { anchoTexto2 } from '../arte2/fuente2';
import { dibujarBandeja, pieSprite } from './fondos';
import { capasTitulo, disenoTitulo } from './fondoTitulo';
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
    // The party at the door of the bar.
    const ids = ['espumarro', 'draguserin', 'turito', 'ceceseta'];
    let listo = false;
    const seguir = () => {
      if (listo) return;
      listo = true;
      sonido.efecto('aceptar');
      res();
    };
    sonido.musica('titulo');
    // What moves here: the bulbs (a chase every 450 ms), the stars' twinkle, the neon (rare flickers and
    // 1 px tremors), each userito's hop (whole pixels) and breathing frame, and the blinking prompt. `paso`
    // computes them like `dibujar` does and asks for a redraw only when one changes.
    const firma = new Firma(4 + 2 * 4);
    const estadoNeon = (ahora: number): number => {
      const h = hash32(Math.floor(ahora / 90)) % 40;
      return h === 0 ? 2 : h <= 3 ? 1 : 0;
    };
    const e: Escena = {
      paso: (_dt, ahora) => {
        const v = firma.v;
        v[0] = Math.floor(ahora / 450) % 2;
        v[1] = Math.floor(ahora / 650) % 3;
        v[2] = estadoNeon(ahora);
        v[3] = parpadea(ahora, 600) ? 1 : 0;
        for (let k = 0; k < 4; k++) {
          v[4 + 2 * k] = Math.round(-Math.abs(Math.sin(ahora / 230 + k * 1.7)) * 5);
          v[5 + 2 * k] = reposo(ahora, k * 190);
        }
        return firma.cambio();
      },
      dibujar(ctx, ahora) {
        const H = p.alto;
        const L = disenoTitulo(H);
        const c = capasTitulo(H);
        ctx.drawImage(c.fondo, 0, 0);
        ctx.drawImage(c.estrellas[Math.floor(ahora / 650) % 3], 0, 0);
        ctx.drawImage(c.bombillas[Math.floor(ahora / 450) % 2], 0, c.yGuirnalda);
        const n = estadoNeon(ahora);
        if (n !== 2) ctx.drawImage(c.neon, c.xNeon + n, c.yNeon);
        dibujarLogo(ctx, L.logoY);
        for (let k = 0; k < 4; k++) {
          const salto = Math.abs(Math.sin(ahora / 230 + k * 1.7)) * 5;
          const sp = spriteFrente2(ids[k], reposo(ahora, k * 190));
          ctx.drawImage(sp, L.xs[k], Math.round(L.yPies + L.dy[k] - pieSprite(sp) - 2 - salto));
        }
        if (parpadea(ahora, 600)) {
          const s = t('titulo.toca');
          const w = anchoTexto2(s) + 36;
          const x = Math.floor((ANCHO - w) / 2);
          const y = L.yPrompt;
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

/** A cheap integer hash for the neon's flicker pattern. */
function hash32(n: number): number {
  let h = Math.imul(n + 7, 374761393);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
