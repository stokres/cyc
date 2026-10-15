// PokéUsera · title screen: logo over a night street in Usera (fondoTitulo.ts: baked layers, a few drawImage a
// frame), four useritos partying at the door of the Bar del Brío (64×64, breathing two frames a second),
// «TOCA PARA EMPEZAR».
import { logo2 } from '../arte2/logo2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { panelCacheado } from '../arte2/ui2';
import { anchoTexto2 } from '../arte2/fuente2';
import { dibujarBandeja } from './fondos';
import { capasTitulo, dibujarCapasTitulo, dibujarFiesta, disenoTitulo, estadoNeon, nuevaFiesta } from './fondoTitulo';
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
    // The party at the door of the bar: four different species, drawn anew every time the title is entered.
    const fiesta = nuevaFiesta();
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
        dibujarCapasTitulo(ctx, c, ahora);
        dibujarLogo(ctx, L.logoY);
        dibujarFiesta(ctx, L, fiesta, ahora, true, (k) => k * 190);
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
